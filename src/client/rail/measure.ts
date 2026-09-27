/**
 * dsh-widgets — the rail’s measurement layer.
 *
 * Everything that reads the shell’s layout and turns it into the rail’s geometry:
 * the `--dsx-rail-top` / `--dsx-input-bottom` anchor probes, the right-bar width
 * tracking (read per frame while the user drags a width handle), the ResizeObserver
 * fan-out, and the budget / YIELD beat — which is applied straight to the DOM so it
 * cannot land a frame late behind React’s commit.
 *
 * Moved out of `client/index.ts` (Phase 2.6b) with its body unchanged. The
 * mechanism state (observers, timers, the last-published fingerprints) lives here;
 * the two values the composition root itself owns stay there and arrive through
 * accessors:
 *   - `railBudget` is part of the bridge snapshot, so `emit()` reads it;
 *   - `drawerEl` is written by the rail view’s ref.
 * `prefs` is a LIVE binding, hence `getPrefs()` at the point of use.
 */

import { ANCHOR_FOLLOW, RAIL_BOX_INSET, RailSpace, applyRailRight, predictRailBudget, readColumnWidth, readRailBudget, resolveRailLayout, resolveRailSpace } from './geometry'
import { type Prefs } from '../runtime/prefs'

/** What the measurement layer needs from the composition root. */
export interface RailMeasureDeps {
  /** The LIVE prefs binding — read it at the point of use, never capture it. */
  getPrefs: () => Prefs
  /** The LIVE rail budget (px); -1 until measured. */
  getRailBudget: () => number
  /** Publish a new rail budget (the composition root owns the binding). */
  setRailBudget: (next: number) => void
  /** The drawer wrapper, if the rail is mounted. */
  getDrawerEl: () => HTMLDivElement | null
  /** Rebuild + publish the bridge snapshot. */
  emit: () => void
  /** Subscribe to the bridge (the width watcher runs on every emit). */
  subscribe: (fn: () => void) => () => void
}

/** The measurement layer’s handle on the composition root. */
export interface RailMeasure {
  /** Start the observers/listeners; returns the disposer `ctx.effect` wants. */
  install: () => () => void
  /** Recompute the geometry now, with an optional observer width hint. */
  scheduleMeasure: (widthHint?: number, horizontalOnly?: boolean) => void
}

/** Build the measurement layer bound to one composition root. */
export function createRailMeasure(deps: RailMeasureDeps): RailMeasure {
  const { getPrefs, getRailBudget, setRailBudget, getDrawerEl, emit, subscribe } = deps

  // ---- Rail-top / composer-bottom measurement. ----
  let raf = 0
  /** Last measured official right-bar width (px); -1 = never measured. */
  let lastRightbarW = -1
  /** Timer that ends the track-sync window. */
  let syncTimer = 0
  let ro: ResizeObserver | null = null
  /**
   * Elements already handed to the ResizeObserver. The targets MUST be looked up
   * lazily: this plugin applies BEFORE the Web UI shell mounts its frame, so a
   * one-shot querySelector pass at apply time finds nothing and the observer ends
   * up watching zero nodes (verified 2026-09-13: 19 live ResizeObservers on the
   * page, none of them on [class$='_rightbarCol']). The rail's right offset then
   * only changed when some unrelated event happened to re-measure —which is why
   * the rail sat still for seconds while the right sidebar's grid track animated,
   * then jumped into place. Re-binding on every measure is idempotent (observing
   * an element twice is a no-op) and self-heals whenever the shell or the
   * conversation root is re-created.
   */
  const observedEls = new Set<Element>()
  /**
   * Cached handle for the official right-bar column —the single element the
   * hot path needs. The rail syncs at animation cadence while the shell eases
   * its right-bar grid track, so the per-frame path must not re-run four
   * `querySelector` probes nor force a layout with `getBoundingClientRect`:
   * the ResizeObserver entry that scheduled the frame already carries the new
   * content-box width. Measured 2026-09-17 (1578x846, long conversation): the
   * previous per-frame selector+rect pass cost 36ms per one-toggle animation
   * on top of the shell's own track re-layout.
   */
  let rightbarEl: Element | null = null
  /** Width (px) reported by the newest RO entry for {@link rightbarEl}; null = none. */
  let entryRightbarW: number | null = null
  /**
   * Minimum spacing between the VERTICAL anchor probes (`--dsx-rail-top`,
   * `--dsx-input-bottom`). Those two anchors only move with header / route /
   * composer layout, never with the horizontal grid track —yet the composer and
   * scroll body re-resize on every frame of a sidebar toggle (their content
   * reflows), so an unthrottled probe forces an extra full re-layout per frame
   * for values that are already correct (measured 2026-09-17: 111ms over 5
   * callbacks in one toggle). A trailing timer guarantees the final value lands.
   */
  const VERTICAL_PROBE_INTERVAL_MS = 250
  let lastVerticalProbeAt = 0
  let verticalTimer = 0
  /** One-shot publish of the settled right-bar width (anchor path only). */
  let settleTimer = 0
  /**
   * Fingerprint of the geometry the drawer last rendered (see `spaceKey`): the
   * geometry gate in `updateRailBudget` compares against it, so a budget step
   * that leaves the deck's shape unchanged costs no React render.
   */
  let lastSpaceKey = ''
  /** The AppFrame whose track transition drives the yield beat. */
  let frameEl: Element | null = null
  /** Debounces the budget refresh until a track movement has settled. */
  let railBudgetTimer = 0
  /**
   * The right-bar track just changed width —the movement is in flight. Predict
   * the TARGET budget on every such tick: the first tick can be delivered before
   * the shell has written the target tracks for this gesture, so latching on it
   * would miss the whole movement (measured: the inline read the old `0px` on the
   * first tick and `710px` afterwards). `updateRailBudget` no-ops when the value
   * is unchanged, so repeated predictions are free.
   *
   * Triggered from the observer itself, not from the "horizontal only" fast path:
   * during a push the transcript scroller resizes in the same batch, so that path
   * is usually NOT taken and a prediction hung off it would never run.
   */
  function noteRightbarMoved(): void {
    const predicted = predictRailBudget()
    if (predicted !== null) updateRailBudget(predicted)
    scheduleBudgetRefresh()
  }
  /**
   * The shell's track transition is STARTING (AppFrame `transitionrun` for
   * `grid-template-columns`). This is the earliest possible beat —the observer's
   * first delivery trails it by ~100ms —so the rail's yield lands on the same
   * frame as the panel's first pixel of movement.
   */
  function onTrackTransitionRun(event: Event): void {
    if ((event as TransitionEvent).propertyName !== 'grid-template-columns') return
    const predicted = predictRailBudget()
    if (predicted !== null) updateRailBudget(predicted)
    scheduleBudgetRefresh()
  }
  /** Keep the transition listener bound to whatever frame the shell renders. */
  function bindFrameTransition(): void {
    const frame = document.querySelector('[class$="_frame"]')
    if (frame === frameEl) return
    frameEl?.removeEventListener('transitionrun', onTrackTransitionRun)
    frameEl = frame
    frameEl?.addEventListener('transitionrun', onTrackTransitionRun)
  }
  /**
   * Custom-property write that skips identical values.
   *
   * The live-width path calls this for many frames in a row with the SAME value
   * (the claim is the resolved layout's width, which only moves at a threshold);
   * an unconditional `setProperty` invalidates every dependent declaration, and
   * during a drag that means re-resolving the transcript's padding every frame
   * for no change. Measured 2026-09-18 (1578×1000, long conversation): guarding
   * the writes cut the rail's drag cost at p99 from 62ms to ~30ms.
   */
  function setVar(name: string, value: string): void {
    const style = document.documentElement.style
    if (style.getPropertyValue(name) === value) return
    style.setProperty(name, value)
  }
  /**
   * Recompute how much room the rail may claim and, when the RESOLVED GEOMETRY
   * moved, re-render the drawer with it.
   *
   * Quantised to 8px and geometry-gated. The deck is a FLUID grid now (see
   * resolveRailLayout), so a budget step also moves the card side and the deck
   * would otherwise re-render once per pixel of pointer travel; the gate bounds
   * that to one commit per 8px of budget (≤px of card side at two columns,
   * ≤px at four), and the slots' own 0.2s top/right/width/height transition
   * turns those steps into one continuous glide.
   *
   * Cost, measured 2026-09-19 over one 216px handle drag at 1578×1000 with the
   * same drag run rail-open and rail-closed (rAF deltas): p50 17ms in both, and
   * the rail adds single-digit janky frames over 33ms plus a couple of long
   * tasks on top of the shell's own per-frame reflow. Host load moves these
   * numbers by tens of percent between rounds, so treat them as an order of
   * magnitude, not an assertion.
   */
  function updateRailBudget(next = readRailBudget()): void {
    const current = getRailBudget()
    if (current >= 0 && Math.abs(next - current) < 8) return
    setRailBudget(next)
    setVar('--dsx-rail-avail', `${next}px`)
    // Apply the yield to the DOM directly, not only through React: during the
    // track animation React's commit can land ~100ms late (the main thread is
    // busy re-laying out the columns), which is exactly the "panel first, rail
    // afterwards" beat we are removing. The next render writes the same values.
    const space = resolveRailSpace(getPrefs(), next)
    setVar('--dsx-rail-w', `${space.claimW}px`)
    applyRailRight(space.swallowed)
    const drawer = getDrawerEl()
    if (drawer !== null) {
      const opacity = space.hidden ? '0' : '1'
      if (drawer.style.opacity !== opacity) drawer.style.opacity = opacity
      if (space.yielded) drawer.setAttribute('data-yielded', '')
      else drawer.removeAttribute('data-yielded')
    }
    const key = spaceKey(space)
    if (key === lastSpaceKey) return
    lastSpaceKey = key
    emit()
  }
  /** Everything a render turns into pixels (see the geometry gate above). */
  function spaceKey(space: RailSpace): string {
    return [space.columns, space.side, space.drawW, space.claimW,
      space.hidden ? 1 : 0, space.yielded ? 1 : 0, space.swallowed ? 1 : 0,
      Math.round(space.shiftX)].join(':')
  }
  /**
   * Official transcript measure the budget is derived from, watched per frame
   * while the user drags a width handle.
   *
   * The product writes `--dsh-chat-user-width` on the conversation root every
   * frame of a handle drag, which changes only the PROSE column's width —none of
   * the boxes this plugin observes (scroll body, header, composer seat) resize,
   * so a drag used to reach the rail only through the 240ms settle debounce and
   * land as one jump after the pointer stopped (reported 2026-09-18: "拖宽时组件
   * 区域变化很卡顿). The handle carries `data-dragging` for exactly the drag's
   * lifetime, so the watcher costs nothing when idle.
   */
  let lastSeenMeasure = -1
  let widthWatchRaf = 0
  let widthWatching = false
  /**
   * Column track width latched when a handle drag STARTS.
   *
   * A conversation-width drag moves the transcript MEASURE, not the column, so
   * the column width cannot change mid-drag —re-deriving it every frame would
   * only buy a forced style resolution plus a layout read on the frames that
   * must stay light. Reset when the drag ends, so a resize/sidebar change is
   * picked up again by the normal path.
   */
  let dragColumnW = 0
  function readMeasure(): number {
    const host = document.querySelector('[data-phase]')
    if (host === null) return -1
    // The handle writes `--dsh-chat-user-width` INLINE on this element on every
    // frame of a drag. Reading the inline style costs no style resolution, while
    // a getComputedStyle read here would force one early on every frame, on top
    // of the drag's own layout work (measured 2026-09-18: the computed-style read
    // was ~1/3 of the rail's per-frame drag cost).
    const inline = Number.parseFloat(host.style.getPropertyValue('--dsh-chat-user-width'))
    const value = Number.isFinite(inline) && inline > 0
      ? inline
      : Number.parseFloat(getComputedStyle(host).getPropertyValue('--dsh-chat-content-width'))
    return Number.isFinite(value) && value > 0 ? Math.round(value) : -1
  }
  function refreshBudgetForWidth(): void {
    const measure = readMeasure()
    if (measure < 0 || measure === lastSeenMeasure) return
    lastSeenMeasure = measure
    // Derive the budget straight from the measure just read. `readRailBudget()`
    // would re-read the same number through getComputedStyle and re-measure the
    // column with a getBoundingClientRect, i.e. a style resolution and a forced
    // layout per frame for values already in hand.
    const column = dragColumnW > 0 ? dragColumnW : readColumnWidth()
    if (!(column > 0)) return
    updateRailBudget(Math.max(0, Math.round(column - measure - RAIL_BOX_INSET)))
  }
  function watchWidth(): void {
    if (widthWatchRaf !== 0) return
    dragColumnW = readColumnWidth()
    // The transcript must follow the handle with NO tween while it is held (the
    // rail's own claim is written per frame too): a 0.3s padding-right
    // transition would spend the whole drag chasing a target that keeps moving,
    // which is the "the widget area still lags behind the conversation" report.
    document.documentElement.classList.add('dsx-live-width')
    const tick = (): void => {
      refreshBudgetForWidth()
      // Re-evaluate the drag state EVERY frame. The shell's `data-dragging` is
      // written and cleared by React around the gesture, so at pointerup the
      // attribute can still be present for a frame —and this loop only ever
      // checked it from pointer handlers, which meant a pointerup that raced the
      // attribute left `widthWatching` true FOREVER: an endless rAF loop plus a
      // permanently disabled transcript transition (measured 2026-09-19: the
      // class was still on documentElement after the drag settled).
      syncWidthWatching()
      if (widthWatching) widthWatchRaf = requestAnimationFrame(tick)
      else {
        widthWatchRaf = 0
        dragColumnW = 0
        document.documentElement.classList.remove('dsx-live-width')
        // Final exact read once the drag released: the last frame's value can be
        // one beat behind the pointer-up commit.
        refreshBudgetForWidth()
        scheduleBudgetRefresh()
      }
    }
    widthWatchRaf = requestAnimationFrame(tick)
  }
  // Pointer capture keeps the events on the handle, so the shell renders the
  // drag's state on the handle itself. `pointerdown` is handled in the CAPTURE
  // phase, i.e. BEFORE React's own handler has run, so at that moment
  // `[data-width-handle][data-dragging]` does not exist yet —latching on the
  // attribute alone silently missed the whole gesture (measured 2026-09-19:
  // dragging the right handle moved `--dsh-chat-user-width` 748−40 with the
  // rail frozen at a 476px budget, then one 584px jump 270ms later when the
  // settle debounce finally fired). Arm from the event TARGET instead.
  //
  // The HELD-BUTTON bit is what bounds the watch: `dragging` requires the button
  // to still be down, so a missed or racing attribute can never leave the loop
  // running.
  let widthHandleArmed = false
  let pointerHeld = false
  function syncWidthWatching(): void {
    const attr = document.querySelector('[data-width-handle][data-dragging]') !== null
    const dragging = pointerHeld && (widthHandleArmed || attr)
    if (dragging === widthWatching) return
    widthWatching = dragging
    if (dragging) watchWidth()
  }
  const onAnyPointerDown = (e: PointerEvent): void => {
    const target = e.target as Element | null
    pointerHeld = true
    widthHandleArmed = target !== null && typeof target.closest === 'function' && target.closest('[data-width-handle]') !== null
    syncWidthWatching()
  }
  const onAnyPointerUp = (): void => { pointerHeld = false; widthHandleArmed = false; syncWidthWatching() }
  const onWindowBlur = (): void => { pointerHeld = false; widthHandleArmed = false; syncWidthWatching() }
  /** Refresh the budget once the right-bar track has stopped moving. */
  function scheduleBudgetRefresh(): void {
    if (railBudgetTimer !== 0) window.clearTimeout(railBudgetTimer)
    railBudgetTimer = window.setTimeout(() => {
      railBudgetTimer = 0
      updateRailBudget()
      // One verification pass: a single read can land while the shell is still
      // publishing the settled column, which would freeze the rail at whatever
      // the mid-flight value implied (never collapses the window, just a
      // second look once everything has settled).
      railBudgetTimer = window.setTimeout(() => {
        railBudgetTimer = 0
        updateRailBudget()
      }, 520)
    }, 240)
  }
  /**
   * Freeze the rail's OWN `transition: right` (fallback path only) for the
   * duration of a track movement; the class expires 160ms after the last tick.
   */
  function armSyncFreeze(): void {
    document.documentElement.classList.add('dsx-syncing')
    if (syncTimer !== 0) window.clearTimeout(syncTimer)
    syncTimer = window.setTimeout(() => {
      syncTimer = 0
      document.documentElement.classList.remove('dsx-syncing')
    }, 160)
  }
  function observeMeasured(): void {
    if (!ro) return
    bindFrameTransition()
    for (const sel of ['[data-conversation-scroll]', '[data-slot="conversation.session.header"]', '[data-composer-seat]', '[class$="_rightbarCol"]']) {
      const el = document.querySelector(sel)
      if (el && !observedEls.has(el)) {
        observedEls.add(el)
        ro.observe(el)
      }
    }
    const rightbar = document.querySelector('[class$="_rightbarCol"]')
    if (rightbar !== null && rightbar !== rightbarEl) {
      rightbarEl = rightbar
      entryRightbarW = null
    }
  }
  function measureRailTop(widthHint?: number, horizontalOnly = false): void {
    // Re-bind only when the shell swapped the measured nodes out (self-heal);
    // the steady-state sync never pays for a query.
    if (rightbarEl === null || !rightbarEl.isConnected) observeMeasured()
    // Official right bar (DSH 0.1.5): the frame owns a third grid column
    // ([class$='_rightbarCol'], occupied by dsh-client-ui-sidebar-right). The
    // rail must stop at that column's LEFT edge instead of the viewport edge,
    // or it paints straight over the panel (measured 2026-09-13: with the
    // panel open the rail sat on top of it). Older installs published
    // --dsh-sidebar-width from dsh-better-sidebar instead; the rail's right
    // offset falls back to that variable when this one is absent, so both
    // layouts work.
    const rightbarW = widthHint ?? entryRightbarW ?? (rightbarEl !== null ? Math.round(rightbarEl.getBoundingClientRect().width) : 0)
    if (horizontalOnly) {
      // The observer reported the right-bar column only: the vertical anchors
      // cannot have moved, so skip the header/composer probes entirely (each
      // one forces a re-layout while the shell eases its grid track).
      scheduleBudgetRefresh()
      if (ANCHOR_FOLLOW) {
        // The rail rides the shell's own layout pass (CSS anchor positioning),
        // so nothing has to be published per frame. Publish the settled width
        // once so any non-anchor consumer still reads a current value.
        lastRightbarW = rightbarW
        if (settleTimer !== 0) window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(() => {
          settleTimer = 0
          document.documentElement.style.setProperty('--dsx-rightbar-w', `${lastRightbarW}px`)
        }, 200)
        return
      }
      // Fallback path: the rail consumes --dsx-rightbar-w, and its own
      // transition must stay frozen for the whole movement, otherwise every
      // per-frame write restarts a fresh 0.3s tween and the rail trails the
      // panel by seconds (reported 2026-09-13). Re-arm on EVERY horizontal
      // tick, not only when the rounded width changes: a stalled frame must
      // not expire the freeze while the track is still moving.
      armSyncFreeze()
      document.documentElement.style.setProperty('--dsx-rightbar-w', `${rightbarW}px`)
      lastRightbarW = rightbarW
      return
    }
    if (rightbarW !== lastRightbarW) {
      lastRightbarW = rightbarW
      if (!ANCHOR_FOLLOW) {
        // See armSyncFreeze: freeze the rail's own tween for the duration of
        // the track movement so `right` lands on the measured value every
        // frame instead of chasing it.
        armSyncFreeze()
        document.documentElement.style.setProperty('--dsx-rightbar-w', `${rightbarW}px`)
      }
      // While the track moves, only the width matters; skip the heavier header
      // and composer probes so the transition keeps the main thread.
      return
    }
    lastRightbarW = rightbarW
    document.documentElement.style.setProperty('--dsx-rightbar-w', `${rightbarW}px`)
    // Throttled vertical probes (see VERTICAL_PROBE_INTERVAL_MS): the rail top
    // and the composer gap cannot move with a horizontal track change, so a
    // burst of composer/scroll resizes must not buy a forced re-layout each.
    const now = performance.now()
    if (now - lastVerticalProbeAt < VERTICAL_PROBE_INTERVAL_MS) {
      if (verticalTimer === 0) {
        verticalTimer = window.setTimeout(() => {
          verticalTimer = 0
          measureRailTop(entryRightbarW ?? undefined)
        }, VERTICAL_PROBE_INTERVAL_MS)
      }
      return
    }
    lastVerticalProbeAt = now
    // Resize / settle path: refresh the rail's space budget through the same
    // debounce (a direct read here can land mid-animation and freeze the value).
    scheduleBudgetRefresh()
    const el = document.querySelector('[data-conversation-scroll]')
    const top = el ? el.getBoundingClientRect().top : 0
    // 12px breathing gap below the session header; the rail AND the magnify
    // overlay share this variable so both stay aligned.
    document.documentElement.style.setProperty('--dsx-rail-top', `${top + 12}px`)
    // Composer bottom gap: one "breathing" band under everything in the input
    // column —the composer dock stats bar (`.FJxK*_root` inside
    // `conversation.composer.dock`) plus its own bottom padding —so a fixed
    // overlay can sit flush below it. Prefer the dock (the lowest visible row);
    // then the composer seat; then the scroll body as a last resort.
    const dock = document.querySelector('[data-slot="conversation.composer.dock"]')
    const comp = (dock && dock.getBoundingClientRect().height > 0 && dock.getBoundingClientRect().bottom > 0)
      ? dock
      : (document.querySelector('[data-composer-seat]') || document.querySelector('[data-conversation-composer-overlay]') || el)
    const gap = comp ? Math.max(0, window.innerHeight - comp.getBoundingClientRect().bottom) : 0
    document.documentElement.style.setProperty('--dsx-input-bottom', `${gap}px`)
  }
  /** Pending observer hint: the reported right-bar width and whether the
   *  trigger was the right-bar column alone (horizontal-only, no vertical work). */
  let pendingHint: { width?: number; horizontalOnly: boolean } = { horizontalOnly: false }
  const scheduleMeasure = (widthHint?: number, horizontalOnly = false): void => {
    // Guarded: this function is also a store subscriber, so only a real number
    // may be adopted as the observer-reported width.
    if (typeof widthHint === 'number' && Number.isFinite(widthHint)) entryRightbarW = widthHint
    pendingHint = { width: entryRightbarW ?? undefined, horizontalOnly: horizontalOnly || pendingHint.horizontalOnly }
    if (raf !== 0) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const hint = pendingHint
      pendingHint = { horizontalOnly: false }
      measureRailTop(hint.width, hint.horizontalOnly)
    })
  }
  /** `resize` listener: passes its event, which must never reach the width hint. */
  const onViewportResize = (): void => { scheduleMeasure() }
  /** Install the observers/listeners; returns the disposer `ctx.effect` wants. */
  function install(): () => void {
    updateRailBudget()
    measureRailTop()
    lastSeenMeasure = readMeasure()
    window.addEventListener('resize', onViewportResize)
    // Width-handle drag watcher (see watchWidth): pointer events alone are not
    // enough —the handle captures the pointer, so a pointerup can land on the
    // handle itself; the product's own `data-dragging` attribute is the truth.
    document.addEventListener('pointerdown', onAnyPointerDown, true)
    document.addEventListener('pointerup', onAnyPointerUp, true)
    document.addEventListener('pointercancel', onAnyPointerUp, true)
    window.addEventListener('blur', onWindowBlur)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        // Only the right bar's width is needed per frame; the RO entry's
        // content box already has it, so no rect read is required here. When
        // the right-bar column is the ONLY thing that resized (the shell's grid
        // track easing), the vertical anchors are untouched and the frame must
        // not pay for their probes.
        let width: number | undefined
        let vertical = false
        for (const entry of entries) {
          if (entry.target === rightbarEl || String((entry.target as Element).className ?? '').endsWith('_rightbarCol')) {
            width = Math.round(entry.contentRect.width)
          } else {
            vertical = true
          }
        }
        if (width !== undefined && width !== lastRightbarW) noteRightbarMoved()
        scheduleMeasure(width, width !== undefined && !vertical)
      })
      // Bind to whatever the shell currently has; the lazy re-bind inside
      // measureRailTop picks up the live nodes once the shell mounts them.
      observeMeasured()
    }
    const sub = subscribe(scheduleMeasure)
    return () => {
      window.removeEventListener('resize', onViewportResize)
      document.removeEventListener('pointerdown', onAnyPointerDown, true)
      document.removeEventListener('pointerup', onAnyPointerUp, true)
      document.removeEventListener('pointercancel', onAnyPointerUp, true)
      window.removeEventListener('blur', onWindowBlur)
      pointerHeld = false
      widthHandleArmed = false
      widthWatching = false
      if (widthWatchRaf !== 0) { cancelAnimationFrame(widthWatchRaf); widthWatchRaf = 0 }
      lastSeenMeasure = -1
      lastSpaceKey = ''
      if (ro) ro.disconnect()
      sub()
      if (syncTimer !== 0) window.clearTimeout(syncTimer)
      if (verticalTimer !== 0) window.clearTimeout(verticalTimer)
      if (settleTimer !== 0) window.clearTimeout(settleTimer)
      if (railBudgetTimer !== 0) window.clearTimeout(railBudgetTimer)
      frameEl?.removeEventListener('transitionrun', onTrackTransitionRun)
      frameEl = null
      document.documentElement.style.removeProperty('--dsx-rail-avail')
      document.documentElement.classList.remove('dsx-syncing')
      document.documentElement.classList.remove('dsx-live-width')
      document.documentElement.style.removeProperty('--dsx-rail-top')
      document.documentElement.style.removeProperty('--dsx-input-bottom')
      document.documentElement.style.removeProperty('--dsx-rightbar-w')
    }
  }

  return { install, scheduleMeasure }
}