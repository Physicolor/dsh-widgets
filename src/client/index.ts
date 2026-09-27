/**
 * Harness Widgets —browser half entry.
 *
 * Registers the right-hand widget rail, the header capsule toggle, and the
 * two settings surfaces (General rows + the component-settings section). One shared bridge
 * holds the persisted prefs, the folded session stats, and the OpenCode usage
 * payload fetched from the Host's same-origin `/api/opencode-usage` route.
 */

import * as React from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import './styles/card.module.css'
import './styles/rail.module.css'
import './styles/panel.module.css'
import './styles/market.module.css'
import './styles/primitives.module.css'
import { WIDGET_LOCALES } from './generated.registry'
import { type CommandCodeData, type GitHubData, type SysInfo, type UsageData, type UsageMulti } from './lib/contract'
import { loadHeatmapStore } from './lib/heatmap-accounting'
import { createCollector } from './data/collector'
import type { BridgeSnapshot } from './runtime/bridge'
import { type Stats } from './data/session-stats'
import { SAVED_AT_KEY, STORAGE_KEY, loadSavedAt, loadState, normalizePrefs, type Prefs } from './runtime/prefs'
import { STORE_API, flushPendingState, putState, saveState } from './runtime/host-sync'
import { WidgetsPage } from './surfaces/Settings'
import { t, installLocale, onLocaleChange } from './i18n'
import { installSettingsNavGlyph } from './surfaces/settings-nav-glyph'
import { ANCHOR_FOLLOW, RAIL_BOX_INSET, RailSpace, applyRailRight, predictRailBudget, readColumnWidth, readMaxCardSide, readMinCardSide, readRailBudget, resolveRailLayout, resolveRailSpace } from './rail/geometry'
import { createRailView } from './rail/rail-view'

/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

/**
 * Client plugin body: restore persisted prefs, register the rail and settings
 * surfaces, and wire the live session stats + OpenCode usage into one bridge.
 * @param ctx - client root context (carries the injected `slots` service).
 */
export function apply(ctx: ClientContext): void {
  // i18n: prefer the official locale service (reads the active locale at call
  // time); fall back to the built-in dictionaries when it is absent. Locale
  // switches re-render every always-mounted surface via the bridge.
  ctx.effect(() => {
    const disposeLocale = installLocale(ctx.get('locale') as { bind?: (ns: string) => (key: string, params?: Record<string, unknown>) => string; subscribe?: (fn: () => void) => () => void } | undefined, WIDGET_LOCALES)
    const disposeListener = onLocaleChange(() => { emit() })
    return () => { disposeLocale(); disposeListener() }
  })
  // One-time boot cleanup of the fallback heatmap log: older builds wrote
  // fabricated "recovered history" constants into it (see loadHeatmapStore).
  // Independent of any active session/dock, so it runs the moment the bundle
  // loads —and it must never touch live-accumulated days.
  try { loadHeatmapStore() } catch { /* best-effort */ }
  let prefs = loadState()
  let state = { open: prefs.railOpen, hasSession: false, stats: null as Stats | null, usageData: null as UsageData | null, usageMulti: null as UsageMulti | null, commandCode: null as CommandCodeData | null, commandCodeError: null as string | null, usageDaily: null as Record<string, number> | null, commandCodeDaily: null as Record<string, number> | null, sysinfo: null as SysInfo | null, github: null as GitHubData | null, githubError: null as string | null }

  const listeners = new Set<() => void>()
  /**
   * The bridge snapshot React renders from. Cached per emit because
   * `useSyncExternalStore` compares references: a fresh object per call would
   * re-render forever.
   */
  let bridgeSnapshot: BridgeSnapshot | null = null
  /**
   * The snapshot must be rebuilt inside `emit`, i.e. AFTER the state/`prefs`/
   * `railBudget` updates, so every subscriber (and every late subscriber) reads
   * the same values. `bridgeSnapshot` starts null instead of pre-built because
   * `railBudget` is declared further down: reading it here would throw (TDZ).
   */
  function emit(): void {
    bridgeSnapshot = { ...state, prefs: { ...prefs }, railBudget }
    for (const fn of listeners) fn()
  }
  function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
  function getBridgeSnapshot(): BridgeSnapshot {
    if (bridgeSnapshot === null) bridgeSnapshot = { ...state, prefs: { ...prefs }, railBudget }
    return bridgeSnapshot
  }
  function setState(patch: Partial<typeof state>): void { state = { ...state, ...patch }; emit() }
  function setPrefs(patch: Partial<Prefs>): void { prefs = { ...prefs, ...patch }; saveState(prefs); emit() }

  // ---- Boot sync with the authoritative host store. ----
  // localStorage is a fast per-origin cache; the host file (`/api/widgets-state`,
  // under the profile data dir) is ground truth. Whichever side holds the newer
  // savedAt wins, so ANY browser origin (localhost vs 127.0.0.1, a second
  // machine's browser, private mode) converges to the last saved configuration
  // the moment it loads instead of resetting to defaults.
  const syncWithHost = async (): Promise<void> => {
    try {
      const res = await fetch(STORE_API)
      if (!res.ok) return
      const data = (await res.json()) as { savedAt?: number; state?: Partial<Prefs> }
      const hostAt = Number.isFinite(Number(data.savedAt)) ? Number(data.savedAt ?? 0) : 0
      const hostState = data.state !== null && typeof data.state === 'object' ? data.state : null
      const localAt = loadSavedAt()
      if (hostState && hostAt > localAt) {
        // Host is newer (another origin/browser saved it) —adopt + mirror locally.
        prefs = normalizePrefs(hostState)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
          localStorage.setItem(SAVED_AT_KEY, String(hostAt))
        } catch { /* ignore */ }
        emit()
      } else if (hostAt < localAt && localAt > 0) {
        // Local is newer (host file absent/stale —e.g. first run after upgrade).
        try { await putState(prefs, localAt) } catch { /* best-effort */ }
      }
    } catch { /* host unavailable; stay on localStorage only */ }
  }
  /**
   * Bridge subscription for React entries.
   *
   * `useSyncExternalStore` (not `useState` + a subscribing effect) is what makes
   * a session hand-off reliable: a plain effect misses every emit that lands
   * between the entry's render and its effect flush, and the shell can mount a
   * NEW conversation's composer overlay slot in exactly that window while the
   * old session's dock unmounts —the fresh entry then kept a stale
   * `hasSession: true` snapshot, so the rail stayed painted (and kept capturing
   * pointer events) over the fresh-conversation page until a reload (measured
   * 2026-09-17, 5/5 runs). `useSyncExternalStore` re-reads the snapshot after
   * subscribing and re-renders when it changed, so that emit cannot be lost.
   */
  function useBridge(): BridgeSnapshot {
    return React.useSyncExternalStore(subscribe, getBridgeSnapshot, getBridgeSnapshot)
  }
  // Cross-tab + visibility re-sync, so "every change takes effect immediately"
  // also holds when the same DSH service is open in several tabs/windows:
  //  - `storage` events fire in OTHER tabs of the SAME origin when one saves —
  //    re-read + emit instead of waiting for a reload;
  //  - `visibilitychange` re-pulls the host store, so switching back to a tab
  //    whose origin differs (localhost vs 127.0.0.1) still converges to the
  //    last saved configuration.
  const onStorage = (e: StorageEvent): void => {
    if (e.key !== STORAGE_KEY && e.key !== SAVED_AT_KEY) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return
      prefs = normalizePrefs(JSON.parse(raw) as Partial<Prefs>)
      emit()
    } catch { /* malformed concurrent write; the next save wins */ }
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') void syncWithHost()
  }
  // Flush a pending host-store write the moment the page starts unloading,
  // so desktop shells that close the window shortly after an edit do not
  // lose it (the debounced PUT would be cancelled with the page).
  const onPageHide = (): void => flushPendingState()
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  ctx.effect(() => () => {
    listeners.clear()
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
  })
  void syncWithHost()

  // Command execution for interactive action cards (e.g. one-click Compact).
  // Resolve the host @Remote command seam if present; cards degrade silently
  // when it is absent.
  const remote = ctx.get('remote') as { commands?: { execute?: (agent: unknown, line: string) => Promise<unknown> } } | undefined
  const runCommand = (line: string): void => {
    void (async () => {
      try {
        const exe = remote?.commands?.execute
        if (!exe) return
        await exe(undefined as unknown, line)
      } catch { /* best-effort: ignore failures on action cards */ }
    })()
  }

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
  /** Space the product's transcript measure leaves for the rail (px). */
  let railBudget = -1
  /**
   * Fingerprint of the geometry the drawer last rendered (see `spaceKey`): the
   * geometry gate in `updateRailBudget` compares against it, so a budget step
   * that leaves the deck's shape unchanged costs no React render.
   */
  let lastSpaceKey = ''
  /** The AppFrame whose track transition drives the yield beat. */
  let frameEl: Element | null = null
  /** The drawer wrapper, so the yield can be applied on the shell's own beat. */
  let drawerEl: HTMLDivElement | null = null
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
    if (next === railBudget) return
    if (railBudget >= 0 && Math.abs(next - railBudget) < 8) return
    railBudget = next
    setVar('--dsx-rail-avail', `${next}px`)
    // Apply the yield to the DOM directly, not only through React: during the
    // track animation React's commit can land ~100ms late (the main thread is
    // busy re-laying out the columns), which is exactly the "panel first, rail
    // afterwards" beat we are removing. The next render writes the same values.
    const space = resolveRailSpace(prefs, next)
    setVar('--dsx-rail-w', `${space.claimW}px`)
    applyRailRight(space.swallowed)
    if (drawerEl !== null) {
      const opacity = space.hidden ? '0' : '1'
      if (drawerEl.style.opacity !== opacity) drawerEl.style.opacity = opacity
      if (space.yielded) drawerEl.setAttribute('data-yielded', '')
      else drawerEl.removeAttribute('data-yielded')
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
  ctx.effect(() => {
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
  })

  // ---- Header capsule toggle. ----
  // Placement in this list slot is decided by `order` alone: the slot core sorts
  // a list slot by (priority, order) and falls back to registration sequence
  // only on a tie. dsh-better-sidebar registers its bottom-panel toggle at
  // order 10, so sharing 10 tied the two entries and the capsule's place
  // followed whichever fiber re-registered last —a reload of this bundle
  // (tsdown/HMR, market toggle) pushed 组件 past the toggle to the row's right
  // end. 5 keeps it right of the official export control (order 0) and
  // open-in-app (order -10), and left of that toggle, independent of load order.
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
    { name: 'conversation.session.header.utilities', id: 'widgets-panel-toggle', order: 5 },
    () => {
      const snap = useBridge()
      // The rail yields when the product's transcript measure leaves no margin
      // (see resolveRailLayout). Reflect that on the control instead of leaving
      // a dead toggle: a button that can never show anything is disabled, not
      // pressed-but-empty.
      const unavailable = snap.hasSession && resolveRailLayout(snap.prefs, railBudget, readMinCardSide(snap.prefs.panelPadding), readMaxCardSide(snap.prefs.panelPadding, snap.prefs.cardSide)).constrained
      const toggle = (): void => {
        if (unavailable) return
        const next = !snap.open
        setState({ open: next })
        setPrefs({ railOpen: next })
      }
      return React.createElement('button', {
        type: 'button',
        className: 'dsx-stats-capsule',
        'aria-pressed': unavailable ? false : snap.open,
        'aria-disabled': unavailable || undefined,
        'data-space': unavailable ? 'tight' : undefined,
        onClick: toggle,
      }, React.createElement('span', null, t('ui.capsule')))
    },
  ))

  // ---- Data collector (session stats + OpenCode usage). ----
  // The component is built INSIDE the inject callback, exactly like the inline
  // arrow it replaces: a re-registration must produce a fresh component identity,
  // because the collector's mount/unmount effects are what signal "a session
  // exists" to the rail.
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'widgets-panel-collector', order: 9999 },
    createCollector({ useBridge, setState, getState: () => state, getPrefs: () => prefs }),
  ))

  // ---- Right rail panel. ----
  // Hosted inside the CONVERSATION, not in `shell.overlay`. Two reasons:
  //  1. paint order: everything in `shell.overlay` (z-20) paints ABOVE the right
  //     column's panel (z-10) —a rail there can never be covered by a panel;
  //  2. semantics: the rail is a conversation-scoped utility strip (it tracks the
  //     conversation column's edge), so the conversation's floating-overlay seat
  //     —"floating entries rendered inside the resident composer card" —is its
  //     natural home. Measured 2026-09-17: a fixed layer in any conversation slot
  //     paints below the panel, in `shell.overlay` above it.
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register(
    { name: 'conversation.input.overlay', id: 'widgets-panel', order: 1000 },
    // The rail view — resting deck, magnify wave, add panel and the sliding
    // drawer — lives in its own module; see rail/rail-view.tsx. Built INSIDE the
    // inject callback so every re-registration gets a fresh component identity
    // (its mount/unmount is the session signal, exactly like the collector).
    createRailView({
      useBridge,
      getPrefs: () => prefs,
      setPrefs,
      getRailBudget: () => railBudget,
      runCommand,
      setDrawerEl: (el: HTMLDivElement | null) => { drawerEl = el },
    }),
  ))

  // ---- Settings section ("component settings" page). ----
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'widgets', order: 30, label: () => t('ui.section.label') },
    () => {
      const snap = useBridge()
      return React.createElement(WidgetsPage, { controller: { prefs: snap.prefs, setPrefs } })
    },
  ))

  // ---- Official settings-nav glyph for our section. ----
  ctx.effect(() => installSettingsNavGlyph())

  // ---- Rail width + stats-line toggle. ----
  ctx.effect(() => {
    const apply = (): void => {
      document.body.classList.toggle('dsx-stats-active', state.open && state.hasSession)
      // Session hand-off kill switch. The rail is a set of `position: fixed`
      // layers, so an entry that misses the session-loss emit keeps painting (and
      // capturing pointer events) over the fresh-conversation page —the React
      // half of the fix is `useSyncExternalStore`, this is the belt-and-braces
      // half that cannot be missed: the module-level subscriber above always runs,
      // and the class hides the whole drawer in the same style pass that releases
      // the transcript's yield. It is instant on purpose (the leave glide belongs
      // to a user-initiated close, not to "this conversation is gone").
      document.body.classList.toggle('dsx-stats-no-session', !state.hasSession)
      scheduleMeasure()
    }
    const sub = subscribe(apply)
    apply()
    return () => {
      sub()
      document.body.classList.remove('dsx-stats-active')
      document.body.classList.remove('dsx-stats-no-session')
    }
  })

  // ---- Official composer stats-line hide switch (personal preference). ----
  ctx.effect(() => {
    const apply = (): void => { document.body.classList.toggle('dsx-hide-statsline', prefs.hideStatsLine) }
    const sub = subscribe(apply)
    apply()
    return () => { sub(); document.body.classList.remove('dsx-hide-statsline') }
  })
}

