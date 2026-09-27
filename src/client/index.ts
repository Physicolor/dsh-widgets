/**
 * Harness Widgets —browser half entry.
 *
 * Registers the right-hand widget rail, the header capsule toggle, and the
 * two settings surfaces (General rows + the component-settings section). One shared bridge
 * holds the persisted prefs, the folded session stats, and the OpenCode usage
 * payload fetched from the Host's same-origin `/api/opencode-usage` route.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import './widgets.module.css'
import { WIDGETS, WIDGET_LOCALES, WIDGET_RUNTIME } from './generated.registry'
import { parseInstanceKey, sizesOf, widgetName, type CommandCodeData, type GitHubData, type SysInfo, type UsageData, type UsageMulti, type WidgetRenderOut, type WidgetSize } from './lib/contract'
import { buildHeatmapGrid, DEFAULT_TZ, loadHeatmapStore } from './lib/heatmap-accounting'
import { createCollector } from './data/collector'
import type { BridgeSnapshot } from './runtime/bridge'
import { type Stats } from './data/session-stats'
import { SAVED_AT_KEY, STORAGE_KEY, loadSavedAt, loadState, normalizePrefs, type Prefs } from './runtime/prefs'
import { STORE_API, flushPendingState, putState, saveState } from './runtime/host-sync'
import { CardBody, cardRadius, COL_GAP, DETAIL_W, LIST_W, WidgetsPage } from './components'
import { t, installLocale, onLocaleChange } from './i18n'
import { installSettingsNavGlyph } from './surfaces/settings-nav-glyph'
import { ANCHOR_FOLLOW, BASE_SIDE, RAIL_BOX_INSET, RAIL_ROW_SEAT, RailSpace, applyRailRight, predictRailBudget, readColumnWidth, readMaxCardSide, readMinCardSide, readRailBudget, resolveRailLayout, resolveRailSpace } from './rail/geometry'
import { RailWave } from './rail/wave/RailWave'
import { createWaveGeometry } from './rail/wave/wave-geometry'

/** Map from interactive action id to the slash command it triggers. */
const ACTION_COMMANDS: Record<string, string> = {
  contextCompact: '/compact',
}


/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

/**
 * Which live source each data-backed widget family reads, and what its loading
 * skeleton looks like, are declared by the UNIT’s own manifest.json and reach
 * the shell as `WIDGET_RUNTIME` (see the generated registry).
 *
 * The SHELL still owns the loading DECISION — a widget cannot distinguish "my
 * source is still in flight" from "my source answered with nothing", and those
 * two states deserve different cards (placeholder pills vs an honest empty
 * state) — but it no longer owns the DATA: adding a widget with a live source
 * means declaring `source` + `skeleton` in that unit’s manifest, and
 * `pnpm check:registry` fails the build if the declaration drifts.
 */

/**
 * Is this family's live source still in flight? (see WIDGET_RUNTIME)
 *
 * `commandCodeError` is deliberately part of the test: once the host route has
 * ANSWERED with an error the card must show its real "not configured" state,
 * not a skeleton that never resolves.
 */
function isSourcePending(source: 'usage' | 'cc' | 'sys' | 'github', snap: BridgeSnapshot): boolean {
  if (source === 'usage') return snap.usageData === null && (snap.usageMulti === null || snap.usageMulti.keys.length === 0)
  if (source === 'cc') return snap.commandCode === null && snap.commandCodeError === null
  // GitHub: the route answers `errors` for the slices it could not fill, so a
  // 200 with an empty calendar is an ANSWER (the card prints why) — only a
  // request that has never returned anything is "loading".
  if (source === 'github') return snap.github === null && snap.githubError === null
  return snap.sysinfo === null
}

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
    () => {
      const snap = useBridge()
      // Hooks MUST be declared unconditionally, before the early return, or the
      // hook count changes when `open`/`hasSession` flip (React error #310).
      const [addOpen, setAddOpen] = React.useState(false)
      // Action-cards: an armed action id waits for a second click before firing,
      // so destructive/expensive actions (e.g. Compact) need two taps to run.
      const [armedAction, setArmedAction] = React.useState<string | null>(null)
      const handleAction = (id: string): void => {
        const command = ACTION_COMMANDS[id]
        if (!command) return
        if (armedAction !== id) { setArmedAction(id); return }
        setArmedAction(null)
        runCommand(command)
      }
      // Whole-card cycle (pooled usage widgets + sys big-figure cards): advance the
      // instance's selection along its cycle and persist it via cardConfigs so
      // the choice survives reloads and other browser origins. The persisted
      // field defaults to 'poolView' (usage pool); sys cards pass `store:
      // 'bigMetric'` so their cycle never collides with the pool view. The
      // multikey `prefer` call only fires for usage cycles (storeless).
      const cyclePool = (key: string) => (out: WidgetRenderOut): void => {
        const modes = out.cycle?.modes ?? []
        if (modes.length === 0) return
        const current = out.cycle?.current ?? modes[0]
        const idx = modes.indexOf(current)
        const next = modes[(idx < 0 ? -1 : idx) + 1] ?? modes[0]
        const store = out.cycle?.store ?? 'poolView'
        setPrefs({ cardConfigs: { ...prefs.cardConfigs, [key]: { ...(prefs.cardConfigs[key] ?? {}), [store]: next } } })
        if (out.cycle?.store) return
        const entry = snap.usageMulti?.keys.find((k) => k.label === next)
        void fetch('/api/multikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'prefer', ref: next === 'total' ? '' : (entry?.ref ?? '') }),
        }).catch(() => { /* pool endpoint optional: display only */ })
      }
      // The add panel belongs to a live session: drop it when the session does.
      // (The wave's own focus state is dropped by RailWave on the same signal.)
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) setAddOpen(false)
      }, [snap.open, snap.hasSession])
      // 组件配置's detail drawer adds width to the panel — but only up to a
      // MINIMUM, never blindly `pw + 440`: a panel the user has already dragged
      // wide has room for the drawer, and inflating it anyway left a dead band on
      // the right (measured 2026-09-25: a 914px row = 190 list + 440 drawer + 284
      // empty). The drawer is flexible, so any extra width goes to the preview and
      // to the metric columns instead of to nothing. NOT reset when the panel
      // closes: closing and reopening the card must come back the way it was.
      const [detailOpen, setDetailOpen] = React.useState(false)
      // Click anywhere OUTSIDE the panel and it closes — the gesture every
      // popover in this product answers to. The rail's own surfaces are excluded
      // (its cards, the magnify layer, the 组件 capsule and the 添加 button
      // itself, which toggles the panel on its own click), because those are not
      // "empty space": clicking a card is a deliberate act on the rail.
      React.useEffect(() => {
        if (!addOpen) return
        const onDown = (e: PointerEvent): void => {
          const target = e.target instanceof Element ? e.target : null
          if (target === null) return
          if (target.closest('.dsx-stats-addpanel') !== null) return
          if (target.closest('.dsx-stats-rail') !== null) return
          if (target.closest('.dsx-magnify-layer') !== null) return
          if (target.closest('.dsx-stats-add') !== null) return
          if (target.closest('.dsx-stats-capsule') !== null) return
          setAddOpen(false)
        }
        // Capture phase: a click on a shell control that stops propagation still
        // closes the panel, and the panel's own descendants are filtered above.
        document.addEventListener('pointerdown', onDown, true)
        return () => document.removeEventListener('pointerdown', onDown, true)
      }, [addOpen])
      /**
       * The rail's measured viewport height (clientHeight), tracked with a
       * ResizeObserver. It is the one input the scroll geometry cannot derive: the
       * rail is `position: fixed; top: var(--dsx-rail-top); bottom: 0`, so its
       * height follows the window, the session header and the composer, and the
       * scroll tail that makes the LAST row reachable must reserve exactly one of
       * these. Declared above the drawer's early return so the hook order never
       * changes, and initialised to 0: the first painted frame then simply shows a
       * shorter (still correct-looking) scroll range, and the observer's first
       * callback —same tick as the layout —replaces it before the user can
       * scroll.
       */
      const [railPaneH, setRailPaneH] = React.useState(0)
      // The rail element itself, shared by the wave (hit tests, scroll geometry)
      // and the pane-height observer below. A REAL ref, not a plain `{ current }`
      // object: a plain object is re-created on every render of this component, so
      // the element's ref callback (attached under an earlier render) writes into a
      // DIFFERENT object than the one the effects close over —leaving the effects
      // reading `null` forever (measured: `railElRef.current === null` at wheel
      // time while the rail was plainly in the DOM, `paneH` stuck at 0, and the
      // scroll range back to 750px).
      const railElRef = React.useRef<HTMLDivElement | null>(null)
      React.useLayoutEffect(() => {
        // Read `.current` INSIDE the callbacks, never capture the element: the
        // layout effect below the early return can run before the rail is
        // rendered, and a captured `null` (or a previous element) would then be
        // observed forever. Measured: capturing it left `railPaneH` at 0, the
        // scroll range shrank back to 750 and the last rows became unreachable
        // again —the exact bug this observer exists to prevent.
        const measure = (): void => {
          const rail = railElRef.current
          if (rail === null) return
          setRailPaneH((prev) => (prev === rail.clientHeight ? prev : rail.clientHeight))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(measure)
        // Window resize changes the rail's height even when nothing else does.
        window.addEventListener('resize', measure)
        const retry = window.setTimeout(() => {
          const rail = railElRef.current
          if (rail !== null) ro.observe(rail)
          measure()
        }, 0)
        return () => { window.clearTimeout(retry); window.removeEventListener('resize', measure); ro.disconnect() }
      }, [snap.open, snap.hasSession])
      // 鈹€鈹€ Drawer open/close animation, matching dsh-better-sidebar's right
      //    panel: a translateX slide with --ds-transition-duration-slow +
      //    --ds-ease-in-out, applied to a position:fixed inset:0 wrapper so the
      //    rail + magnify overlay + add panel move as ONE surface. Opening
      //    glides in from the RIGHT (translateX(+travel) −0, moving leftwards
      //    into the resting slot), closing is the reverse (0 −
      //    translateX(+travel), sliding out to the right). CSS transitions
      //    interrupt natively: a rapid re-toggle animates from the current
      //    intermediate geometry straight to the new target —no snap, no
      //    desync. The wrapper is pointer-events:none so it never blocks the
      //    page.
      const shouldOpen = snap.open && snap.hasSession
      const [drawerPhase, setDrawerPhase] = React.useState<'closed' | 'enter' | 'open' | 'leave'>(shouldOpen ? 'open' : 'closed')
      const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Boot restore must NOT play the enter glide. Prefs are read synchronously
      // while the session arrives asynchronously, so at mount the drawer is
      // `closed` even though the rail is already wanted: the restore that
      // follows then looks exactly like a user open and slides the drawer on
      // every refresh. `bootRestorePending` marks precisely that state (wanted,
      // session still unknown); a genuine later open never sets it.
      const bootRestorePending = React.useRef(snap.open && !snap.hasSession)
      // Leave timeout: the CSS slide is 0.3s (--ds-transition-duration-slow);
      // unmount 350ms later so the element is gone only after the slide ends.
      const DRAWER_LEAVE_MS = 350
      React.useEffect(() => {
        setDrawerPhase((p) => {
          if (shouldOpen) {
            if (p === 'closed') {
              // Restored (prefs + session resolved in the same commit) —appear
              // in place; user open —glide in from the right.
              if (bootRestorePending.current) {
                bootRestorePending.current = false
                return 'open'
              }
              return 'enter'
            }
            return p === 'leave' ? 'open' : p
          }
          return p === 'closed' ? 'closed' : 'leave'
        })
      }, [shouldOpen])
      // Enter: the first painted frame MUST sit at translateX(-100%) before the
      // transition target flips to 0, or the browser has no start value to
      // animate from (the rail would just pop in). Two rAFs guarantee that
      // -100% frame has been laid out and painted before raising to 0.
      React.useEffect(() => {
        if (drawerPhase !== 'enter') return
        let raf2 = 0
        const raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setDrawerPhase((p) => (p === 'enter' ? 'open' : p)))
        })
        return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2) }
      }, [drawerPhase])
      // Leave: unmount once the slide finishes (instant for reduced-motion).
      React.useEffect(() => {
        if (drawerPhase !== 'leave') return
        if (reduceMotion) { setDrawerPhase('closed'); return }
        const t = window.setTimeout(() => setDrawerPhase((p) => (p === 'leave' ? 'closed' : p)), DRAWER_LEAVE_MS)
        return () => window.clearTimeout(t)
      }, [drawerPhase, reduceMotion])
      if (drawerPhase === 'closed') return null
      // Geometry resolves against the space the product's transcript measure
      // leaves over (see readRailBudget): the rail may shrink (a narrower card
      // inside the SAME column count, then fewer columns) and finally collapse,
      // but it never pushes the reading measure below what the user chose.
      // Read the LIVE budget, not the React snapshot: a render can be committed
      // after the yield was applied directly to the DOM, and a stale snapshot
      // would then write the pre-yield geometry back (measured: a yielded drawer
      // re-claiming 372px, insetting a transcript whose rail was invisible).
      // One decision function, shared with the direct-DOM beat write, so React
      // and the animation path can never disagree about the geometry.
      const space = resolveRailSpace(prefs, railBudget)
      const yielded = space.yielded
      const side = space.side
      const pad = space.pad
      const columns = space.columns
      const multi = columns > 1
      // Rail width is the STATIC grid width —NO magnification overshoot. The
      // rail no longer reserves left room for the bell-curve overshoot (which
      // used to widen both the rail and --dsx-rail-w, pushing the conversation
      // column right). A magnified card's left growth is instead painted by a
      // fixed overlay layer OUTSIDE the rail's scroll-clip box (see magnifyLayer)
      // so the conversation column keeps the resting rail's width at all times.
      const railW = space.drawW
      const hidden = space.hidden
      document.documentElement.style.setProperty('--dsx-rail-w', `${space.claimW}px`)
      document.documentElement.style.setProperty('--dsx-rail-pad', `${pad}px`)
      document.documentElement.style.setProperty('--dsx-rail-overshoot', `0px`)
      applyRailRight(space.swallowed)
      // --dsx-rail-scroll is owned by RailWave (it tracks the rail's scrollTop).
      // Heatmap day data is owned by the dock collector: the authoritative host
      // map when dsh-usage-center is installed, else its own persisted live log.
      // The rail consumes the collector's values and never overrides them; only
      // when stats lacks heatmap fields entirely (first paint before the
      // collector effect runs) does it fall back to the persisted table so the
      // cards are never blank.
      const statsHeat = (snap.stats as { heatmapRaw?: Record<string, number>; heatmapGrid?: unknown } | null) ?? null
      const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0
        ? statsHeat.heatmapRaw
        : (snap.usageDaily ?? loadHeatmapStore())
      const base = {
        ...(snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }),
        // Only inject the fallback when live stats lacks heatmap fields.
        ...(statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } }),
        ...(statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ) }),
      }
      interface RailItem { key: string; size: WidgetSize; w: (typeof WIDGETS)[number]; out: NonNullable<ReturnType<(typeof WIDGETS)[number]['render']>>; baseW: number }
      // Pooled usage views: ['total', 'Key 1', 'Key 2', 'Key N'] when the pool has
      // more than one key; otherwise usage cards fall back to single-key data.
      const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1
        ? ['total', ...snap.usageMulti!.keys.map((entry, i) => entry.label || `Key ${i + 1}`)]
        : undefined
      const items: RailItem[] = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
        .map((key) => {
          const { widgetId, size } = parseInstanceKey(key)
          const w = WIDGETS.find((x) => x.id === widgetId)
          if (!w || sizesOf(w).indexOf(size) === -1) return null
          // Per-card render isolation: ONE crashing widget (e.g. a malformed
          // usage payload) must never take down the whole rail —a render
          // exception used to kill the entire shell.overlay slot entry, hiding
          // every widget until the next hard refresh. The bad card degrades to
          // a placeholder instead; the error stays visible in the console.
          let out: ReturnType<typeof w.render>
          try {
            out = w.render({ ...base, usageData: snap.usageData, usageMulti: snap.usageMulti, commandCode: snap.commandCode, commandCodeError: snap.commandCodeError, commandCodeDaily: snap.commandCodeDaily, sysinfo: snap.sysinfo, github: snap.github, githubError: snap.githubError, poolModes, armedAction, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0], { size })
          } catch (error) {
            console.error(`[dsh-widgets] widget ${widgetId}@${size} render crashed:`, error)
            out = { title: widgetName(w), value: '—', legend: t('ui.renderError') }
          }
          // Loading skeleton: the widget's live source has not answered yet, so
          // the card keeps its slot (and therefore the deck's shape) with
          // placeholder pills instead of flashing an empty/0-valued body. The
          // skeleton is a SHELL decision —see WIDGET_RUNTIME.
          const source = WIDGET_RUNTIME[widgetId]?.source
          if (source !== undefined && isSourcePending(source, snap)) {
            const silhouette = WIDGET_RUNTIME[widgetId]?.skeleton
            out = {
              title: out?.title ?? widgetName(w),
              skeleton: true,
              skeletonRows: silhouette?.rows ?? 1,
              ...(silhouette === undefined ? {} : { skeletonShape: silhouette.shape, skeletonCount: silhouette.count }),
            }
          }
          if (!out) return null
          // 2×4 is exactly two 2×2 widths plus one inter-card gap.
          const baseW = size === '2x4' ? 2 * side + pad : side
          return { key, size, w, out, baseW }
        })
        .filter((it): it is RailItem => it !== null)
        // In a 1-column layout a 2×4 tile (two cells wide) cannot fit the single
        // rail column, so its instances are hidden —TEMPORARILY blocklisted,
        // not removed: switching back to 2/4 columns restores them from
        // installed/order as-is. The market marks those entries in the same state
        // (struck-through title + yellow capsule + disabled add).
        .filter((it) => !(columns === 1 && it.size === '2x4'))
      // The rail is a fixed viewport panel anchored to the right edge. The
      // dsh-better-sidebar bundle occupies the same edge with its own
      // fixed right panel (z-index 40) and pushes the app shell via
      // `#root { margin-right: var(--dsh-sidebar-width) }` (neutralized by
      // dsh-ui-harmonizer to the conversation column's margin-right). The rail
      // anchors its right edge to that SAME variable inline (0 while absent)
      // and its CSS carries `transition: right` —deliberately on the MAIN
      // THREAD, the same animation path as the conversation column's
      // margin-right. A compositor transform (v1.2.3) never dropped frames,
      // but when the column's per-frame reflow overran a frame the rail kept
      // gliding while the column stalled —the two visibly split. Same-path
      // animation cannot split: both surfaces advance in the same style−抣ayout
      // pass every frame. The rail subtree is cheap (lazy overlay deck, no
      // persistent will-change), so the per-frame cost is negligible.
      // Padding is `0 pad pad pad`: no top inset so the first card aligns with
      // the session header's bottom edge; right/left keep the resize handle
      // room, bottom keeps the last card off the viewport floor.
      const scale = side / BASE_SIDE
      const addRadius = Math.round(16 * scale)
      const closeIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true },
        React.createElement('path', { d: 'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z', fill: 'currentColor' }),
        React.createElement('path', { d: 'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z', fill: 'currentColor' }),
      )
      // Wave placement geometry (scale field / reflow / add-button slot) lives in its
      // own module: see rail/wave/wave-geometry.ts.
      const {
        rows, active, deckBottom, staticLayout, stepScale, scaleFor, placeCards, nearest, xPts, yPts, addSlotFor,
      } = createWaveGeometry({ items, side, pad, columns, railW, multi, magnify: prefs.magnify, realTime: prefs.realTime })
// Deck height covers the live reflow bottom AND the add button (when it
      // hangs below the deck), so neither ever clips or pushes unexpectedly.
      const nItems = items.length
      const staticAdd = addSlotFor(staticLayout)
      const addTop = staticAdd.top
      const addRight = staticAdd.right
      const addBottom = addTop + side
      const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad
      /**
       * ── SCROLL GEOMETRY: how tall the SCROLL CONTENT must be ──
       *
       * Row `r` is seated at `RAIL_ROW_SEAT + r · pitch` (placeCards) and the rail's
       * range is `contentH − clientH`, so the LAST row can top out exactly when
       *
       *     contentH = max(rows · pitch, stackHeight) + paneH
       *
       * with `paneH` the rail's MEASURED clientHeight. The deck's own box stays its
       * natural height (`stackHeight`); the difference is reserved by the TAIL element
       * inside the rail (see RailWave), because the deck's box is ALSO the overlay's box
       * and the two decks must stay pixel-identical while the wave is live.
       *
       * Without the reservation the browser CLAMPS the last detents and the deck stops
       * moving (measured 1578×1000, 8 rows × pitch 184: range 750 < the 5th detent, so
       * rows 5–8 could never top out — the reported "a row stays half hidden and further
       * scrolling does nothing at all"). With MORE than one detent-range of extra content
       * the wheel keeps scrolling past the last row into empty space — the reported
       * "keep scrolling and it is just blank" — so the tail is exactly the difference
       * between the two, never a fixed guess.
       */
      const paneH = railPaneH
      const scrollPitch = Math.max(1, side + pad)
      const deckH = stackHeight
      /**
       * How far the deck may scroll: the last row whose cards still reach into the
       * viewport. Beyond that the wheel would only pull empty space up — the reported
       * "keep scrolling and it is just blank".
       *
       * `contentBottom` is the deepest CARD bottom (the add tile hangs below the grid
       * or fills its last-row cell, so it is not the thing the user is scrolling to
       * see). The range that just fits it is `contentBottom − clientH`; the last row
       * allowed is therefore `floor((range − RAIL_ROW_SEAT) / pitch)`, floored at row 0
       * so a deck shorter than the viewport still has one detent.
       */
      const contentBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      /**
       * HIGHEST ROW THAT MAY TOP OUT — the scroll stop the user asked for.
       *
       * A row may top out only while its own cards still REACH INTO the viewport; past
       * that the wheel would pull up nothing but the empty tail. The last such row is
       * the one holding the deepest bottom that is still on screen:
       *
       *     cards' visible bottom at row r = r · pitch + clientH  (r · pitch = their top)
       *     last row                       = ceil((contentBottom + clientH − seat) / pitch) − 1
       *
       * Measured 1578×1000 with 8 rows × 184 (contentBottom 1450, clientH 936): the last
       * row is 7, so the deck stops with row 7 at the top and its cards showing — the
       * extra detents into blank space are gone. (A tighter `contentBottom − clientH`
       * cap is WRONG: it lands on row 2 here and would hide rows 3–7 entirely.)
       */
      const lastRow = Math.max(0, Math.min(
        rows - 1,
        Math.ceil((contentBottom + paneH - RAIL_ROW_SEAT) / scrollPitch) - 1,
      ))
      // ONE builder for a card's interactive body, shared by the resting deck and
      // the magnify overlay. While the wave is live the overlay is the surface the
      // user sees AND touches (see the magnify layer's note), so its copies carry
      // the real handlers —action, pooled-view cycle and the bottom-left resize
      // grip —instead of being a dead picture.
      const cardBodyFor = (it: RailItem, width: number): React.ReactNode[] => [
        React.createElement(CardBody, { key: 'b', out: it.out, unit: side, width, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, onAction: handleAction, onCycle: cyclePool(it.key) }),
        React.createElement('span', { key: 'r', className: 'dsx-stats-resize', 'aria-label': t('ui.rail.resizeAria'), onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = prefs.cardSide; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
      ]
      // The overlay's bodies are built ONCE per render of this (parent) component —
      // and this component does NOT re-render on pointer moves (the hover state
      // lives in RailWave), so a follow frame re-uses these element objects and
      // React bails out of every card subtree.
      const overlayCardBodies = items.map((it) => cardBodyFor(it, it.baseW))
      const toggleAdd = (): void => setAddOpen((v) => !v)
      // Static deck: resting grid + every interactive affordance. Built HERE so
      // its element identity stays stable while the pointer moves —RailWave
      // re-renders per hover frame, and React bails out of this whole subtree
      // because the element object it receives never changes. The engage fade is
      // the `.dsx-wave-deck` class the wave puts on its wrapper (no re-render).
      const deck = React.createElement('div', { key: '__deck', style: { position: 'relative', height: `${deckH}px` } },
        staticLayout.map((c, idx) => {
          const it = items[idx]
          const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px` }
          return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle },
            ...cardBodyFor(it, c.w),
          )
        }),
        // Bottom add button, parked inside the deck so it shares the grid layout:
        // it fills the empty last-row cell on odd counts, or sits right-aligned
        // below the rows on even counts / single column.
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: toggleAdd, style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } },
          React.createElement('span', { className: 'dsx-stats-add-icon' },
            React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
          ),
          React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
        ),
      )
      const rail = React.createElement(RailWave, {
        key: '__wave', deck, cardBodies: overlayCardBodies, railElRef, onAddClick: toggleAdd, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active,
        placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor,
        restLayout: staticLayout, restAdd: staticAdd,
        live: snap.open && snap.hasSession, shiftX: space.shiftX, columns,
      })
      // Temporary right-side add panel: reuses the component-config + component-market settings pages
      // (WidgetsPage) wholesale, floats over content, never affects layout.
      // Width is configurable (prefs.panelWidth) and draggable via the left edge.
      const pw = prefs.panelWidth
      const startResize = (e: React.PointerEvent): void => {
        e.preventDefault(); e.stopPropagation()
        const x0 = e.clientX, w0 = pw
        const move = (ev: PointerEvent) => setPrefs({ panelWidth: Math.max(260, Math.min(760, Math.round(w0 + (x0 - ev.clientX)))) })
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
      }
      // The add panel is PORTALED to <body> —deliberately OUT of the drawer.
      //
      // Why (measured 2026-09-18, 1578×1022 and 1280×760): the drawer lives in
      // `conversation.input.overlay`, whose stacking ancestor chain is the
      // composer seat (z-index 7). Within that context the panel's own z-index 30
      // is meaningless: the official composer's input row / send button and the
      // right sidebar's `wSkVaW_widthHandle` (full-height, z-index 8) painted
      // ABOVE the popup card —a 16px hit-test grid over the panel box reported
      // only 92.7% / 89% coverage, with the panel's bottom-left corner and a
      // full-height vertical strip belonging to other layers. Portaled to body
      // the panel competes at the root stacking context (z-index 30 > composer 7,
      // width handle 8, right sidebar 10, shell overlay 20), so it is once again
      // the top surface. It also stops fading when the rail yields.
      //
      // The panel keeps every anchor it needs: --dsx-rail-top / --dsx-input-bottom
      // / --dsx-rightbar-w / --dsx-rail-pad are written on documentElement, so a
      // body-level child still resolves them.
      const addPanel = createPortal(React.createElement('div', {
        className: 'dsx-stats-addpanel' + (addOpen ? ' open' : '') + (prefs.squircle ? ' dsx-squircle' : ''),
        style: {
          top: 'var(--dsx-rail-top,0px)',
          // Enough for list + drawer, and never more than that on the drawer's
          // behalf: an already-wide panel keeps its width (the drawer grows into
          // it) instead of sprouting a dead band on the right. 26 = the panel's own
          // 2px of borders + the body's 24px of padding, so DETAIL_W is the
          // drawer's REAL width (the inner then keeps its 2px mask slack).
          width: `${detailOpen ? Math.max(pw, LIST_W + COL_GAP + DETAIL_W + 26) : pw}px`,
          // Continuous curvature, bound to the 设置 gear: same `corner-shape`
          // switch the cards use, and the same corner percentage, measured
          // against a 100px reference so a panel-sized surface gets a
          // panel-sized radius instead of 16% of its own 700px side.
          borderRadius: `${cardRadius(100, prefs.cornerPercent)}px`,
        },
      },
        React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': t('ui.addPanel.resizeAria'), onPointerDown: startResize }),
        React.createElement('div', { className: 'dsx-stats-addpanel-header' },
          React.createElement('div', { className: 'dsx-stats-addpanel-title' }, t('ui.addPanel.title')),
          React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': t('ui.addPanel.closeAria'), onClick: () => setAddOpen(false) }, closeIcon),
        ),
        React.createElement('div', { className: 'dsx-stats-addpanel-body' },
          // The drawer's FINAL width: with it the preview is laid out at its final
          // size from the first frame, and the drawer reveals it by widening — no
          // small-to-large zoom while the panel animates.
          React.createElement(WidgetsPage, { controller: {
            prefs,
            setPrefs,
            onDetailToggle: setDetailOpen,
            // 26 = the body's 12+12 padding PLUS the panel's own 1px border on each
            // side (box-sizing: border-box). Deriving it from the width alone left
            // the inner 2px wider than the mask, and that is exactly where a row's
            // 1px edge line got cut (reported 2026-09-26).
            detailWidth: Math.max(DETAIL_W, pw - 26 - LIST_W - COL_GAP),
            railSide: side,
          }, hideHeader: true }),
        ),
      ), document.body)
      // Always render the panel too so closing slides it out (`.open` toggles
      // visibility/transform); when closed it is hidden (visibility + opacity)
      // and never intercepts pointer events over the rail.
      //
      // Drawer wrapper: the ONE surface that slides. position:fixed inset:0
      // keeps every fixed child (rail / magnify overlay / add panel) positioned
      // exactly as before —a transformed fixed ancestor becomes their
      // containing block, but this wrapper spans the viewport so the
      // coordinates are identical —while the wrapper's own translateX carries
      // the whole group. Opening glides in from the RIGHT (translateX(+travel)
      // −0, leftwards into its resting slot); closing is the reverse (0 −
      // translateX(+travel), sliding out to the right). pointer-events:none:
      // interaction stays on the children that opt in.
      // Travel distance is the rail's own width (+24px margin), NOT a
      // percentage: translateX(%) on this wrapper would resolve against the
      // VIEWPORT width (inset:0), sliding a whole screen-width instead of one
      // rail width (far too fast over the same 0.3s).
      const drawerTravel = Math.round(railW + 24)
      const drawerTransform = drawerPhase === 'enter' || drawerPhase === 'leave' ? `translateX(${drawerTravel}px)` : 'none'
      const drawerTransition = reduceMotion ? 'none' : 'transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)'
      // The whole drawer (rail + magnify + add panel) fades as ONE surface when
      // the rail yields, on the same duration/easing as the panel's push, so the
      // two motions cannot split (the official layout README requires co-motion
      // with the track transition).
      // Opacity is used ONLY for the no-space-to-hide case (a narrow window with
      // no panel to cover the rail). When a panel is present the rail stays fully
      // opaque and simply sits under it —that is the swallow.
      const drawerOpacity = hidden ? 0 : 1
      // The class is also the instant, emit-proof kill switch for the whole
      // group: `body.dsx-stats-no-session` (see the rail-width effect below)
      // hides it in the same style pass the transcript's yield is released.
      return React.createElement('div', { key: '__drawer', ref: (el: HTMLDivElement | null) => { drawerEl = el }, className: 'dsx-stats-drawer', 'data-yielded': yielded ? '' : undefined, 'data-no-room': hidden ? '' : undefined, style: { position: 'fixed', inset: 0, pointerEvents: 'none', transform: drawerTransform, opacity: drawerOpacity, transition: `${drawerTransition}, opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out)` } },
        rail, addPanel,
      )
    },
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

