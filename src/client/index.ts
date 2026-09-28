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
import './styles/tokens.module.css'
import './styles/card.module.css'
import './styles/rail.module.css'
import './styles/panel.module.css'
import './styles/market.module.css'
import './styles/primitives.module.css'
import { WIDGET_LOCALES } from './generated.registry'
import type { CommandCodeData, GitHubData, SysInfo, UsageData, UsageMulti } from './lib/contract/types'
import { loadHeatmapStore } from './lib/heatmap-accounting'
import { createCollector } from './data/collector'
import { type BridgeSnapshot } from './runtime/bridge'
import { buildLiveStats } from './runtime/live-stats'
import { type Stats } from './data/session-stats'
import { SAVED_AT_KEY, STORAGE_KEY, loadSavedAt, loadState, normalizePrefs, type Prefs } from './runtime/prefs'
import { STORE_API, flushPendingState, putState, saveState } from './runtime/host-sync'
import { WidgetsPage } from './surfaces/Settings'
import { t, installLocale, onLocaleChange } from './i18n'
import { installSettingsNavGlyph } from './surfaces/settings-nav-glyph'
import { readMaxCardSide, readMinCardSide, resolveRailLayout } from './rail/geometry'
import { createRailMeasure } from './rail/measure'
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
  // The anchor probes, the right-bar width tracking, the ResizeObserver fan-out
  // and the yield beat live in rail/measure.ts. The two values the composition
  // root itself owns stay here: `railBudget` is part of the bridge snapshot (emit
  // reads it) and `drawerEl` is written by the rail view’s ref, so the layer reads
  // and writes them through the accessors below.
  /** Space the product’s transcript measure leaves for the rail (px). */
  let railBudget = -1
  /** The drawer wrapper, so the yield can be applied on the shell’s own beat. */
  let drawerEl: HTMLDivElement | null = null
  const measure = createRailMeasure({
    getPrefs: () => prefs,
    getRailBudget: () => railBudget,
    setRailBudget: (next: number) => { railBudget = next },
    getDrawerEl: () => drawerEl,
    emit,
    subscribe,
  })
  ctx.effect(() => measure.install())

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
      // `liveStats` is the same fold the rail renders from (runtime/live-stats),
      // so the 组件配置 preview shows the instance's real numbers whenever a
      // session is running, and the filler data otherwise.
      return React.createElement(WidgetsPage, { controller: { prefs: snap.prefs, setPrefs, liveStats: (key: string) => buildLiveStats(snap, prefs, key) } })
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
      measure.scheduleMeasure()
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

