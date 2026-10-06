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

import { ANCHOR_FOLLOW, RAIL_BOX_INSET, RailSpace, applyRailRight, clearRailTop, invalidateRailMetrics, noteRailTop, predictRailBudget, readColumnWidth, readRailBudget, resolveRailLayout, resolveRailSpace } from './geometry'
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
  /**
   *True once this measure layer has written `--dsx-rail-top` at least once.
   *
   *Every early return below (the horizontal-only tick, the moving-width tick,
   * the 250ms vertical throttle) deliberately skips the header/composer probes,
   * and each of them therefore skips the ANCHOR write too. That shortcut is only
   * sound while an anchor is already published: the rail and the magnify layer
   * are `position: fixed; top: var(--dsx-rail-top, 0px)`, so a pass that returns
   * before the first write leaves two fully-surfaced layers pinned to the page
   * top. The first pass after `install()` used to always take one of those
   * branches (`rightbarW` is not yet bound while `lastRightbarW` is still -1),
   * so the anchor only appeared on a later, deferred tick — and a frame rebuild
   * that remounted the rail inside that window painted the whole component area
   * over the page top (owner report 2026-10-04: 「组件区域在未激活状态下切换工作
   * 区对话后会自动显示在页面顶部」). Until the first write lands, the shortcuts
   * are disabled and every pass runs the full vertical probe.
   */
  let anchorPublished = false
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
  /** Class-name suffix of the shell's AppFrame (its prefix is build-hashed). */
  const FRAME_CLASS_SUFFIX = '_frame'
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
   *
   * BOUND ON `document`, NOT ON THE FRAME ELEMENT, and that is the fix for the
   * owner's "the swallow adaptation keeps breaking after a reload". `transitionrun`
   * bubbles, so one document-level listener observes every frame the shell will
   * ever render. The previous version attached to the first `[class$="_frame"]`
   * and only re-bound when the RIGHT-BAR COLUMN was missing or detached — so a
   * shell that swapped the AppFrame out (plugin reload, layout remount,
   * navigation) while the right-bar column stayed connected left the listener on
   * a node no longer in the document. The beat then went silent and the rail fell
   * back to the 240ms/520ms `scheduleBudgetRefresh` polls: the adaptation still
   * "worked", it just arrived two or three frames late, which is precisely the
   * panel-first/rail-after split this beat exists to remove. A live listener
   * cannot go stale, so there is no self-heal to get wrong.
   */
  function onTrackTransitionRun(event: Event): void {
    if ((event as TransitionEvent).propertyName !== 'grid-template-columns') return
    if (!isFrameElement(event.target)) return
    const predicted = predictRailBudget()
    if (predicted !== null) updateRailBudget(predicted)
    scheduleBudgetRefresh()
  }
  /**
   * Does this class list name an AppFrame? Mirrors the `[class$="_frame"]`
   * selector without a query — the shell hashes the prefix, so the suffix is the
   * only stable part, and the element may carry several classes at once.
   */
  function isFrameElement(el: EventTarget | null): boolean {
    if (el === null || !(el instanceof Element)) return false
    const cls = el.classList
    for (let i = 0; i < cls.length; i++) if (cls[i].endsWith(FRAME_CLASS_SUFFIX)) return true
    return false
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
      // Same value-skip as above, but load-bearing for a second reason: this
      // attribute is the yield's selector hook (`body:has(...[data-yielded])
      // .dsx-stats-addpanel.open` pushes the add panel out, card.module.css
      // drops pointer events) AND it sits on a subtree watched by
      // dsh-ui-harmonizer's MutationObserver, whose `refreshMaterial` measured
      // 12–27ms per call (21.5ms/call over 13 calls in the 2026-10-03 fold
      // trace). Removing an absent attribute or re-setting one that is already
      // there is no state change, so it must not cost a style recalc plus a
      // reconciler pass.
      const wants = space.yielded
      if (wants !== drawer.hasAttribute('data-yielded')) {
        if (wants) drawer.setAttribute('data-yielded', '')
        else drawer.removeAttribute('data-yielded')
      }
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
    // Typed as HTMLElement: the inline custom property is read off `.style` below.
    const host = document.querySelector<HTMLElement>('[data-phase]')
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
      // Seed the width hint at BIND time, while the layout tree is clean, so the
      // unhinted path below never needs a bare `getBoundingClientRect()`. That
      // read is safe here and only here: re-binding happens when the shell swaps
      // the measured nodes out, not per frame, whereas the unhinted callers
      // (viewport resize, the 250ms vertical probe) would otherwise each pay a
      // forced layout DURING the sidebar tween — measured 2026-10-03 (V8 CPU
      // profile, 3 real toggles): 49.0ms self-time. The ResizeObserver keeps this
      // fresh: it hands `scheduleMeasure` the new width as a hint whenever the
      // column actually resizes, so the seed is only ever the starting value.
      entryRightbarW = Math.round(rightbar.getBoundingClientRect().width)
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
    // A `0` above is ambiguous: it is the real width of a closed right column,
    // but it is ALSO what an unbound measure layer reports before the shell has
    // mounted `[class$='_rightbarCol']`. Only the first may be published —
    // writing a fake `0px` would override the `--dsh-sidebar-width` fallback the
    // rail's offset chain keeps for older installs.
    const widthMeasured = rightbarEl !== null || entryRightbarW !== null || typeof widthHint === 'number'
    if (horizontalOnly && anchorPublished) {
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
          setVar('--dsx-rightbar-w', `${lastRightbarW}px`)
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
      if (widthMeasured) setVar('--dsx-rightbar-w', `${rightbarW}px`)
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
        if (widthMeasured) setVar('--dsx-rightbar-w', `${rightbarW}px`)
      }
      // While the track moves, only the width matters; skip the heavier header
      // and composer probes so the transition keeps the main thread. Exception:
      // before the anchor exists there is nothing to keep the rail attached to,
      // so this one pass must run them (see `anchorPublished`).
      if (anchorPublished) return
    }
    lastRightbarW = rightbarW
    // ── The one write that has to be GUARDED, because it is on the hot path ──
    // This line used to `setProperty` unconditionally, and it sits in the path every
    // non-horizontal measure takes — i.e. once per widget data emit, and therefore several
    // times a second during any animation that emits at all. Writing a document-level custom
    // property invalidates every declaration that depends on it, so each of those passes
    // bought a full-document style recalc: measured 2026-10-03 at the owner's stage
    // (1707×1067 @ DSF 1.5, `diag-anim-perf.cjs`), the fold spent 530–594ms in
    // RecalcStyleDuration and 582–624ms in LayoutDuration per four seconds of toggling, with
    // UpdateLayoutTree events up to 96ms, and rendered at 32–46fps on a 60Hz display.
    // `setVar` skips identical values, so the write now costs nothing unless the panel really
    // moved. It is DEFERRED to the end of this function (see READS FIRST, WRITES LAST):
    // written here it would dirty the tree that the capsule/dock reads below then force.
    // Throttled vertical probes (see VERTICAL_PROBE_INTERVAL_MS): the rail top
    // and the composer gap cannot move with a horizontal track change, so a
    // burst of composer/scroll resizes must not buy a forced re-layout each.
    const now = performance.now()
    if (anchorPublished && now - lastVerticalProbeAt < VERTICAL_PROBE_INTERVAL_MS) {
      if (widthMeasured) setVar('--dsx-rightbar-w', `${rightbarW}px`)
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
    /**
     * The rail starts as high as the 组件 capsule's own line ALLOWS (owner
     * request 2026-10-01).
     *
     * The old anchor was "12px below the scroll body", which parked the first card
     * ~68px from the window's top while the capsule — the rail's OWN toggle, and
     * the control the user reads the rail's position against — sits at 11px. The
     * capsule is measured live rather than assumed (the title row follows the
     * window and the app's own chrome), and the answer is clamped by the one hard
     * wall between the two:
     *
     *   the SESSION HEADER is opaque white at `z-index: 21` (measured: chain
     *   `_titleCluster < _titleRow < _header [bg rgb(255,255,255), z 21]`), while
     *   the rail lives in the composer seat at 7 — so anything the rail draws
     *   above the header's bottom edge is PAINTED OVER, not merely hit-tested
     *   away. At the capsule's 11px that hid the first 33px of the first row.
     *
     * The clamp is `scrollTop − RAIL_TOP_EDGE`: `[data-conversation-scroll]`'s top
     * IS the header's bottom (both are the same column's stack), and
     * RAIL_TOP_EDGE is the rail's own top padding + the deck's first-row seat, so
     * the first card lands exactly on that edge — the highest position that still
     * shows a whole card. Measured at 1578×950: capsule 11, header bottom 50 →
     * rail top 44 (was 62), first card 50.
     */
    const RAIL_TOP_EDGE = 6
    const capsule = document.querySelector('.dsx-stats-capsule')
    const capsuleTop = capsule === null ? null : capsule.getBoundingClientRect().top
    const wanted = capsuleTop === null || !(capsuleTop > 0) ? top + 12 : Math.round(capsuleTop)
    const railTop = Math.max(Math.round(top) - RAIL_TOP_EDGE, wanted)
    // Composer bottom gap: one "breathing" band under everything in the input
    // column —the composer dock stats bar (`.FJxK*_root` inside
    // `composer.dock`) plus its own bottom padding —so a fixed
    // overlay can sit flush below it. Prefer the dock (the lowest visible row);
    // then the composer seat; then the scroll body as a last resort.
    const dock = document.querySelector('[data-slot="conversation.composer.dock"]')
    // ONE rect read, not three: each `getBoundingClientRect` on a dirty tree is a forced
    // layout, and this line used to ask for the same box three times.
    const dockBox = dock === null ? null : dock.getBoundingClientRect()
    const comp = (dockBox !== null && dockBox.height > 0 && dockBox.bottom > 0)
      ? dock
      : (document.querySelector('[data-composer-seat]') || document.querySelector('[data-conversation-composer-overlay]') || el)
    // The dock IS the composer seat in the common case, so reuse the box already
    // read above instead of asking for the same element twice.
    const compBox = comp === null ? null : (comp === dock ? dockBox : comp.getBoundingClientRect())
    const gap = compBox === null ? 0 : Math.max(0, window.innerHeight - compBox.bottom)
    // ── READS FIRST, WRITES LAST ──
    // Both anchors above are READ from the live layout (capsule / dock / composer
    // seat) and WRITTEN as document-level custom properties, which invalidates
    // every declaration that depends on them. Interleaving the two —write
    // `--dsx-rail-top`, then read the dock and the composer seat— turned each of
    // those later reads into a FORCED re-layout of the whole document: measured
    // 2026-10-03 on `diag-fold-trace.cjs`, this function was the plugin's largest
    // remaining forced-layout source (9 stacks of 10, against the shell's own 26).
    // Reading everything before writing anything costs at most the single layout
    // the incoming dirty tree already owed, and changes no value.
    // Same guard as `--dsx-rightbar-w` above: these two anchors move on a resize, not on
    // every throttled probe, and an unconditional write costs the whole document a style
    // recalc each time it runs.
    if (widthMeasured) setVar('--dsx-rightbar-w', `${rightbarW}px`)
    setVar('--dsx-rail-top', `${railTop}px`)
    setVar('--dsx-input-bottom', `${gap}px`)
    // The rail is attached now: from here on the width-only shortcuts above are
    // sound, because `--dsx-rail-top` already holds a live value (see anchorPublished).
    anchorPublished = true
    // Publish the same number to geometry so `rowFitSide` can derive the rail's
    // height (`window.innerHeight - railTop`, its fixed `top`/`bottom: 0` box)
    // instead of paying `.dsx-stats-rail.clientHeight`, a forced layout that used
    // to run inside the yield beat's `transitionrun` frame (see noteRailTop).
    noteRailTop(railTop)
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
  const onViewportResize = (): void => { invalidateRailMetrics(); scheduleMeasure() }
  /** Install the observers/listeners; returns the disposer `ctx.effect` wants. */
  function install(): () => void {
    // Every observed shell change starts by dropping the memoised shell metrics, so the
    // measure pass that follows reads the document rather than the previous frame's answer.
    invalidateRailMetrics()
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
    // One document-level listener for the yield beat (see onTrackTransitionRun):
    // `transitionrun` bubbles, so it survives every AppFrame the shell swaps in.
    document.addEventListener('transitionrun', onTrackTransitionRun, true)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        // The SHELL re-laid-out: drop the memoised metrics so this pass reads it (the
        // per-frame expiry would catch it one frame later; the observer knows NOW).
        invalidateRailMetrics()
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
      document.removeEventListener('transitionrun', onTrackTransitionRun, true)
      document.documentElement.classList.remove('dsx-syncing')
      document.documentElement.classList.remove('dsx-live-width')
      // Reset the per-install gates so the NEXT install takes the full vertical
      // probe on its first pass and publishes `--dsx-rail-top` before any of the
      // width-only shortcuts can return (see `anchorPublished`).
      anchorPublished = false
      lastRightbarW = -1
      lastVerticalProbeAt = 0
      // `--dsx-rail-top` is deliberately LEFT IN PLACE. Removing it here used to
      // be the hygiene step, but the rail and the magnify layer both resolve
      // `top: var(--dsx-rail-top, 0px)` — so any teardown that is not matched by
      // an immediate remount dropped every mounted rail surface onto the page top
      // (owner report 2026-10-04). A stale-but-real anchor is a pixel or two off at
      // worst; a missing one is a full-page-top jump. The next install overwrites
      // it on the first pass.
      document.documentElement.style.removeProperty('--dsx-input-bottom')
      document.documentElement.style.removeProperty('--dsx-rightbar-w')
      clearRailTop()
    }
  }

  return { install, scheduleMeasure }
}