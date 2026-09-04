/**
 * Harness Widgets 鈥?browser half entry.
 *
 * Registers the right-hand widget rail, the header capsule toggle, and the
 * two settings surfaces (General rows + the "缁勪欢" section). One shared bridge
 * holds the persisted prefs, the folded session stats, and the OpenCode usage
 * payload fetched from the Host's same-origin `/api/opencode-usage` route.
 */

import * as React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import './widgets.module.css'
import { ALL_INSTANCES, DEFAULT_INSTALLED, WIDGETS, WIDGET_LOCALES } from './generated.registry'
import { instanceKey, parseInstanceKey, sizesOf, widgetName, type SysInfo, type UsageData, type UsageMulti, type WidgetRenderOut, type WidgetSize } from './lib/contract'
import { accumulateHeatmap, buildHeatmapGrid, dateKey, DEFAULT_TZ, loadHeatmapAnchor, loadSeen, migrateHeatmapV2, saveHeatmapAnchor, saveSeen } from './lib/heatmap-accounting'
import { SYS_WIDGET_IDS, resolveInterval } from './lib/sys-view'
import { CardBody, WidgetsPage, type Prefs } from './components'
import { t, installLocale, onLocaleChange } from './i18n'

const STORAGE_KEY = 'harness-widgets.state'
/** Local mirror of the last saved-at timestamp, compared against the host file
 *  on boot so the same DSH service converges from any browser origin
 *  (localhost vs 127.0.0.1 are different localStorage realms). */
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
/** Same-origin host route holding the authoritative state file. */
const STORE_API = '/api/widgets-state'
const BASE_SIDE = 150

/** Map from interactive action id to the slash command it triggers. */
const ACTION_COMMANDS: Record<string, string> = {
  contextCompact: '/compact',
}



const DEFAULTS: Prefs = {
  panelPadding: 24,
  cardSide: 150,
  installed: DEFAULT_INSTALLED.slice(),
  order: ALL_INSTANCES.slice(),
  apiKey: '',
  railOpen: false,
  realTime: false,
  magnify: 1.2,
  panelWidth: 500,
  cardConfigs: {},
  maxWidgets: 10,
  columns: 2,
  hideStatsLine: false,
}

/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

/** Normalize an arbitrary persisted/remote prefs object into a valid Prefs.
 *  Shared by localStorage loads and the authoritative host-store sync, so both
 *  channels survive schema drift identically. */
function normalizePrefs(p: Partial<Prefs>): Prefs {
  const s = { ...DEFAULTS, ...p }
  if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding
  if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide
  // Normalize one persisted entry to a valid instance key. Legacy bare widget
  // ids (pre-2脳4) migrate to their 2脳2 instance; unknown entries are dropped.
  const normalizeInstance = (key: string): string => {
    // v1.5.0 leak migration: sys-board shipped with its descriptor missing the
    // sizes list, so the runtime defaulted it to 2×2 while the manifest said
    // 2×4 — users installed a bogus sys-board@2x2. Remap it to the real size.
    if (key === 'sys-board@2x2') key = 'sys-board@2x4'
    const { widgetId, size } = parseInstanceKey(key)
    const w = WIDGETS.find((x) => x.id === widgetId)
    if (!w) return ''
    return sizesOf(w).includes(size) ? instanceKey(widgetId, size) : ''
  }
  // Respect the user's installed set exactly 鈥?do NOT force-append built-ins
  // back on every load (that kept overflowing the max-widgets cap after the
  // user uninstalled system widgets). Only the first-run path seeds defaults.
  if (!Array.isArray(s.installed)) s.installed = []
  s.installed = s.installed.map(normalizeInstance).filter((id): id is string => id !== '')
  if (!Array.isArray(s.order)) s.order = []
  s.order = s.order.map(normalizeInstance).filter((id): id is string => id !== '')
  for (const key of ALL_INSTANCES) if (s.order.indexOf(key) === -1) s.order.push(key)
  if (typeof s.apiKey !== 'string') s.apiKey = ''
  if (typeof s.railOpen !== 'boolean') s.railOpen = DEFAULTS.railOpen
  if (typeof s.realTime !== 'boolean') s.realTime = DEFAULTS.realTime
  if (!Number.isFinite(s.magnify) || s.magnify < 1 || s.magnify > 2) s.magnify = DEFAULTS.magnify
  if (!Number.isFinite(s.panelWidth) || s.panelWidth < 260 || s.panelWidth > 760) s.panelWidth = DEFAULTS.panelWidth
  if (typeof s.cardConfigs !== 'object' || s.cardConfigs === null || Array.isArray(s.cardConfigs)) s.cardConfigs = {}
  if (!Number.isFinite(s.maxWidgets) || s.maxWidgets < 1 || s.maxWidgets > 20) s.maxWidgets = DEFAULTS.maxWidgets
  if ([1, 2, 4].indexOf(s.columns as number) === -1) s.columns = DEFAULTS.columns
  if (typeof s.hideStatsLine !== 'boolean') s.hideStatsLine = DEFAULTS.hideStatsLine
  return s
}

function loadState(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
    return normalizePrefs(JSON.parse(raw) as Partial<Prefs>)
  } catch {
    return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
  }
}

function loadSavedAt(): number {
  try {
    const n = +(localStorage.getItem(SAVED_AT_KEY) ?? '')
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

/** Debounced PUT to the host store; localStorage is always the fast path, the
 *  host file the authoritative one (survives origin switches and clearing). */
let hostSyncTimer: number | undefined
let pendingState: Prefs | null = null
let pendingAt = 0
async function putState(s: Prefs, at: number): Promise<void> {
  try {
    await fetch(STORE_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: at, state: s }),
      // A keepalive request is allowed to outlive the page, so a state write
      // that is still in flight when the window/tab closes is not dropped.
      keepalive: true,
    })
  } catch { /* host unreachable: localStorage still holds the state; a later boot sync re-pushes */ }
}
function saveState(s: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    pendingAt = Date.now()
    localStorage.setItem(SAVED_AT_KEY, String(pendingAt))
  } catch { /* storage unavailable */ }
  pendingState = s
  if (hostSyncTimer !== undefined) window.clearTimeout(hostSyncTimer)
  hostSyncTimer = window.setTimeout(() => {
    hostSyncTimer = undefined
    const toSend = pendingState
    const at = pendingAt
    pendingState = null
    if (toSend !== null) void putState(toSend, at)
  }, 400)
}
/**
 * Flush any state that has not yet reached the host store when the page is
 * being torn down (window/tab close, navigation, desktop-app quit). The
 * 400 ms debounce means the last edit before a quick close is usually still
 * pending here; a normal fetch would be cancelled with the page, but
 * `sendBeacon` is delivered by the browser even as the page is destroyed 鈥?
 * which is what keeps the write inside desktop shells that spawn a fresh
 * random loopback origin on every launch (their localStorage is a new realm
 * each boot, so the host file is the only channel that survives).
 */
function flushPendingState(): void {
  const toSend = pendingState
  if (toSend === null) return
  const at = pendingAt
  pendingState = null
  try {
    const body = JSON.stringify({ savedAt: at, state: toSend })
    // sendBeacon is a POST; the host handler accepts PUT or POST, so the
    // same route copes with it. A Blob pins the JSON content type.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(STORE_API, new Blob([body], { type: 'application/json' }))
    } else {
      void fetch(STORE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  } catch { /* page is going away; nothing more can be done 鈥?the boot sync on the next launch converges */ }
}

/** Session stats shape collected by the dock collector. */
interface Stats {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null
  contextPercent?: number | null
  contextWindow?: number | null
  contextTokens?: number | null
  contextBreakdown?: { systemTokens: number; toolsTokens: number; messageTokens: number } | null
  todos?: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed' }> | null
  heatmapGrid?: Array<Array<{ value: number; date: string }>>
  heatmapRaw?: Record<string, number>
}

/** Fold assistant/tool-result nodes into the same window-scoped stats as the shipped StatsLine fallback. */
function deriveStats(nodes: ReadonlyArray<any>): Omit<Stats, 'usage'> {
  const turns = new Set<number>()
  let steps = 0
  let llmMs = 0
  let toolMs = 0
  for (const node of nodes ?? []) {
    if (node.kind === 'tool-result') {
      if (node.callTime !== null && node.callTime !== undefined) toolMs += Math.max(0, node.time - node.callTime)
      continue
    }
    if (node.kind !== 'assistant') continue
    turns.add(node.turn)
    steps += 1
    if (node.timing !== undefined && node.timing !== null && node.timing.stepStartTime !== null) {
      llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime)
    }
  }
  return { turns: turns.size, steps, llmMs, toolMs, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 }
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
  // Run the heatmap table repair/recovery once at plugin boot (independent of
  // any active session/dock), so polluted or incomplete histories are fixed
  // the moment the bundle loads.
  try { migrateHeatmapV2() } catch { /* best-effort */ }
  let prefs = loadState()
  let state = { open: prefs.railOpen, hasSession: false, stats: null as Stats | null, usageData: null as UsageData | null, usageMulti: null as UsageMulti | null, sysinfo: null as SysInfo | null }

  const listeners = new Set<() => void>()
  function emit(): void { for (const fn of listeners) fn() }
  function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
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
        // Host is newer (another origin/browser saved it) 鈫?adopt + mirror locally.
        prefs = normalizePrefs(hostState)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
          localStorage.setItem(SAVED_AT_KEY, String(hostAt))
        } catch { /* ignore */ }
        emit()
      } else if (hostAt < localAt && localAt > 0) {
        // Local is newer (host file absent/stale 鈥?e.g. first run after upgrade).
        try { await putState(prefs, localAt) } catch { /* best-effort */ }
      }
    } catch { /* host unavailable; stay on localStorage only */ }
  }
  function useBridge(): { open: boolean; hasSession: boolean; stats: Stats | null; usageData: UsageData | null; usageMulti: UsageMulti | null; sysinfo: SysInfo | null; prefs: Prefs } {
    const [snap, setSnap] = React.useState({ ...state, prefs: { ...prefs } })
    React.useEffect(() => subscribe(() => setSnap({ ...state, prefs: { ...prefs } })), [])
    return snap
  }
  // Cross-tab + visibility re-sync, so "every change takes effect immediately"
  // also holds when the same DSH service is open in several tabs/windows:
  //  - `storage` events fire in OTHER tabs of the SAME origin when one saves 鈫?
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
  function measureRailTop(): void {
    const el = document.querySelector('[data-conversation-scroll]')
    const top = el ? el.getBoundingClientRect().top : 0
    // 12px breathing gap below the session header; the rail AND the magnify
    // overlay share this variable so both stay aligned.
    document.documentElement.style.setProperty('--dsx-rail-top', `${top + 12}px`)
    // Composer bottom gap: one "breathing" band under everything in the input
    // column 鈥?the composer dock stats bar (`.FJxK*_root` inside
    // `conversation.composer.dock`) plus its own bottom padding 鈥?so a fixed
    // overlay can sit flush below it. Prefer the dock (the lowest visible row);
    // then the composer seat; then the scroll body as a last resort.
    const dock = document.querySelector('[data-slot="conversation.composer.dock"]')
    const comp = (dock && dock.getBoundingClientRect().height > 0 && dock.getBoundingClientRect().bottom > 0)
      ? dock
      : (document.querySelector('[data-composer-seat]') || document.querySelector('[data-conversation-composer-overlay]') || el)
    const gap = comp ? Math.max(0, window.innerHeight - comp.getBoundingClientRect().bottom) : 0
    document.documentElement.style.setProperty('--dsx-input-bottom', `${gap}px`)
  }
  const scheduleMeasure = (): void => {
    if (raf !== 0) return
    raf = requestAnimationFrame(() => { raf = 0; measureRailTop() })
  }
  let ro: ResizeObserver | null = null
  ctx.effect(() => {
    measureRailTop()
    window.addEventListener('resize', scheduleMeasure)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleMeasure)
      const t = document.querySelector('[data-conversation-scroll]')
      if (t) ro.observe(t)
      const h = document.querySelector('[data-slot="conversation.session.header"]')
      if (h) ro.observe(h)
      const c = document.querySelector('[data-composer-seat]')
      if (c) ro.observe(c)
    }
    const sub = subscribe(scheduleMeasure)
    return () => {
      window.removeEventListener('resize', scheduleMeasure)
      if (ro) ro.disconnect()
      sub()
      document.documentElement.style.removeProperty('--dsx-rail-top')
      document.documentElement.style.removeProperty('--dsx-input-bottom')
    }
  })

  // ---- Header capsule toggle. ----
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
    { name: 'conversation.session.header.utilities', id: 'widgets-panel-toggle', order: 10 },
    () => {
      const snap = useBridge()
      const toggle = (): void => { const next = !snap.open; setState({ open: next }); setPrefs({ railOpen: next }) }
      return React.createElement('button', { type: 'button', className: 'dsx-stats-capsule', 'aria-pressed': snap.open, onClick: toggle }, React.createElement('span', null, t('ui.capsule')))
    },
  ))

  // ---- Data collector (session stats + OpenCode usage). ----
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'widgets-panel-collector', order: 9999 },
    ({ useSession, useProjection }: any) => {
      const settled = useSession ? useSession((s: any) => s.chat.legacy.nodes) : []
      const timeline = useSession ? useSession((s: any) => s.chat.timeline) : undefined
      const runningCalls = useSession ? useSession((s: any) => s.runningCalls) : []
      const running = useSession ? useSession((s: any) => s.running) : false
      const projected = useProjection ? useProjection('sessionStats') : undefined
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const contextPres = useProjection ? useProjection('contextPressure') : undefined
      const contextBrk = useProjection ? useProjection('contextBreakdown') : undefined
      const todosProj = useProjection ? useProjection('todos') : undefined
      // Bridge subscription: the sysinfo poll cadence depends on per-instance
      // refresh-interval config, so this collector re-renders on prefs changes
      // (emit) exactly like the capsule/rail bridges do.
      const snap = useBridge()
      // Heatmap self-accounting: per-step crediting (v2) crediting each assistant
      // step once by its own start time, with a cumulative-anchor fallback (v1)
      // when nodes lack `usage`. Persisted across mounts.
      const heatmapRef = React.useRef<Record<string, number>>(migrateHeatmapV2())
      const anchorRef = React.useRef<number>(loadHeatmapAnchor())
      const [heatmap, setHeatmap] = React.useState<Record<string, number>>(heatmapRef.current)
      // Presence signal: this dock slot renders only while an active session is
      // mounted (the shell drops it on the Hero/no-session state), so mount/
      // unmount is exactly "an active session exists". The rail and the body
      // padding shift key off this so they never linger on a fresh-session page.
      React.useEffect(() => {
        setState({ hasSession: true })
        return () => { setState({ hasSession: false }) }
      }, [])
      // OpenCode usage is account-wide but changes with every finished turn
      // (each conversation draws from the same pool), so the collector pulls it
      // on mount AND whenever a turn settles (`running` flips true → false).
      // The `conversation.composer.dock` component is reused across sessions, so
      // a mount-only fetch leaves the quota stale until a reload/new session.
      const prevRunningRef = React.useRef(running)
      React.useEffect(() => {
        const refresh = (): void => {
          fetch('/api/opencode-usage')
          .then((r) => r.json())
          .then((data: UsageData) => setState({ usageData: data }))
          .catch(() => { /* keep last known usage */ })
        // Multi-key pool usage (鎬?Key 瑙嗗浘 + 姣忔妸 Key 鐙珛瑙嗗浘).
        fetch('/api/opencode-usage-multi')
          .then((r) => r.json())
          .then((data: UsageMulti) => setState({ usageMulti: data }))
          .catch(() => { /* pool endpoint optional: cards fall back to single-key */ })
        }
        // Pull on mount (both false — first render); afterwards only a
        // completed turn (true → false) refetches, an in-flight turn does not.
        if (running === prevRunningRef.current) refresh()
        else if (!running) refresh()
        prevRunningRef.current = running
      }, [running])
      // Hardware snapshot (System widgets): the installed sys-* instances drive
      // ONE shared poll loop — the effective cadence is the SHORTEST refresh
      // interval among them (5/10/30/60 s presets + custom numeric, clamped
      // 5..60, default 10). The host route caches ~1s, so every widget sharing
      // the same tick still triggers a single nvidia-smi spawn.
      React.useEffect(() => {
        const sysKeys = (snap.prefs.installed ?? []).filter((key) => SYS_WIDGET_IDS.some((id) => key === id || key.startsWith(id + '@')))
        const secs = sysKeys.length === 0 ? 0 : Math.min(...sysKeys.map((key) => resolveInterval(snap.prefs.cardConfigs?.[key])))
        if (!(secs > 0)) return
        const refresh = (): void => {
          fetch('/api/sysinfo')
          .then((r) => r.json())
          .then((data: SysInfo) => setState({ sysinfo: data }))
          .catch(() => { /* keep last known snapshot */ })
        }
        refresh()
        const id = window.setInterval(refresh, secs * 1000)
        return () => window.clearInterval(id)
      }, [snap.prefs.installed, snap.prefs.cardConfigs])
      // One-second tick while a turn is running, so the in-flight LLM and tool
      // durations advance between settle boundaries instead of freezing.
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        if (!running) return
        setNow(Date.now())
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
      }, [running])
      // Time-sensitive cards (e.g. 宄拌胺瀹氫环 peak-pricing windows) must re-read
      // the clock even with no turn running: a 30s tick rebuilds stats so the
      // window check stays fresh across a peak/off-peak boundary.
      React.useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 30000)
        return () => window.clearInterval(id)
      }, [])
      React.useEffect(() => {
        const p = projected
        const folded = p && p.steps !== undefined ? p : deriveStats(settled)
        let inputTokens = 0
        let cacheRead = 0
        let outputTokens = 0
        if (usage) {
          inputTokens = (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0)
          cacheRead = usage.cacheReadTokens || 0
          outputTokens = usage.outputTokens || 0
        }
        // Heatmap accounting, two-layer:
        //  (a) per-step (v2): if settled assistant nodes carry `usage`, credit
        //      each step ONCE to the day its `stepStartTime` began 鈥?exact
        //      per-conversation attribution, immune to cross-midnight sessions,
        //      session switches, remounts, compaction.
        //  (b) anchor fallback (v1): if nodes lack `usage` (host did not
        //      project it into the folded surface), fall back to diffing the
        //      cumulative `tokenUsage` projection against an anchor that is
        //      rebuilt ONLY on a cumulative RESET (new session) 鈥?never on a
        //      bare "new day" 鈥?so continuing a session across midnight still
        //      credits only the newly observed growth to today.
        const seenState = loadSeen()
        // Heatmap timezone: per-card config (default Beijing UTC+8), 'local' =
        // browser clock. Every day attribution below uses it.
        const heatTz = (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ
        let dirty = false
        let nodeUsageOk = false
        const isStartF = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
        for (const node of settled ?? []) {
          if (node?.kind !== 'assistant') continue
          if (node?.usage == null) continue
          nodeUsageOk = true
          const start = node.timing?.stepStartTime
          const nodeUsage = node.usage
          if (start == null) continue
          const total = (isStartF(nodeUsage.uncachedInputTokens) ? nodeUsage.uncachedInputTokens : 0)
            + (isStartF(nodeUsage.cacheReadTokens) ? nodeUsage.cacheReadTokens : 0)
            + (isStartF(nodeUsage.cacheWriteTokens) ? nodeUsage.cacheWriteTokens : 0)
            + (isStartF(nodeUsage.outputTokens) ? nodeUsage.outputTokens : 0)
          if (total <= 0) continue
          const key = `${node.turn ?? '?'}:${node.step ?? '?'}:${start}`
          if (seenState.keys.has(key)) continue
          seenState.keys.add(key)
          if (start > seenState.strongest) seenState.strongest = start
          const day = dateKey(new Date(start), heatTz)
          heatmapRef.current = accumulateHeatmap(heatmapRef.current, day, total)
          dirty = true
        }
        if (dirty) {
          saveSeen(seenState.keys, seenState.strongest)
          setHeatmap(heatmapRef.current)
        }
        // (b) anchor fallback 鈥?only when per-step nodes carried no usage.
        // Anchor discipline (the cross-day over-credit fix):
        //   * while per-step crediting is active, keep the anchor parked at the
        //     observed cumulative 鈥?a later fallback takeover then diffs only
        //     what per-step did NOT already credit (never the whole history);
        //   * the fallback credits growth ONLY when the active session shows a
        //     step that actually began today (todayActivity). Without it, an
        //     anchor that lags the cumulative (page reopened on yesterday's
        //     session, projection lag right after a new-session switch) would
        //     diff the entire prior-day total into today's cell.
        const current = usage ? inputTokens + outputTokens : 0
        if (nodeUsageOk && usage && current > anchorRef.current) {
          anchorRef.current = current
          saveHeatmapAnchor(current)
        }
        if (!nodeUsageOk && usage) {
          const todayKey = dateKey(new Date(), heatTz)
          const todayActivity = (settled ?? []).some((n: any) =>
            n?.kind === 'assistant' && n?.timing?.stepStartTime != null && dateKey(new Date(n.timing.stepStartTime), heatTz) === todayKey)
          if (current < anchorRef.current) {
            // cumulative reset (new session / log rebuild): re-anchor, no credit
            anchorRef.current = current
            saveHeatmapAnchor(current)
          } else if (todayActivity) {
            const delta = current - anchorRef.current
            anchorRef.current = current
            saveHeatmapAnchor(current)
            heatmapRef.current = accumulateHeatmap(heatmapRef.current, todayKey, delta)
            setHeatmap(heatmapRef.current)
          } else if (current > anchorRef.current) {
            // history only (no step began today yet): park the anchor at the
            // cumulative without crediting, so it can never be diffed later.
            anchorRef.current = current
            saveHeatmapAnchor(current)
          }
        }
        // Live in-flight elapsed, added to the settled whole-log figures.
        let llmMs = folded.llmMs
        let toolMs = folded.toolMs
        if (timeline) {
          for (const turn of timeline.turns.values()) {
            if (turn.status !== 'open') continue
            for (const step of turn.steps) {
              if (step.status !== 'open' || step.start === undefined) continue
              const assembled = settled.some((n: any) => n.kind === 'assistant' && n.turn === step.turn && n.step === step.step && n.timing !== undefined)
              if (!assembled) llmMs += Math.max(0, now - step.start.time)
            }
          }
        }
        for (const call of runningCalls) {
          toolMs += Math.max(0, now - call.time)
        }
        // contextPressure projection is { contextWindow?, pressureTokens?, projectedTokens? }.
        // Ratio = projectedTokens / contextWindow.
        let contextPercent: number | null = null
        let contextWindow: number | null = null
        let contextTokens: number | null = null
        if (contextPres && typeof contextPres === 'object') {
          if (typeof contextPres.contextWindow === 'number' && contextPres.contextWindow > 0) contextWindow = contextPres.contextWindow
          if (typeof contextPres.projectedTokens === 'number') {
            contextTokens = contextPres.projectedTokens
            if (contextWindow) contextPercent = Math.min(1, Math.max(0, contextPres.projectedTokens / contextWindow))
          }
        }
        let contextBreakdown: Stats['contextBreakdown'] = null
        if (contextBrk && typeof contextBrk === 'object') {
          contextBreakdown = {
            systemTokens: (contextBrk as unknown as Record<string, unknown>).systemTokens as number | undefined ?? 0,
            toolsTokens: (contextBrk as unknown as Record<string, unknown>).toolsTokens as number | undefined ?? 0,
            messageTokens: (contextBrk as unknown as Record<string, unknown>).messageTokens as number | undefined ?? 0,
          }
        }
        const stats: Stats = {
          turns: folded.turns, steps: folded.steps,
          llmMs, toolMs,
          ttftMs: folded.ttftMs, ttftSteps: folded.ttftSteps,
          decodeMs: folded.decodeMs, decodeTokens: folded.decodeTokens,
          usage: { inputTokens, cacheReadTokens: cacheRead, outputTokens },
          contextPercent, contextWindow, contextTokens, contextBreakdown,
          todos: Array.isArray(todosProj) && todosProj.length >= 0 ? todosProj as Stats['todos'] : null,
          heatmapGrid: buildHeatmapGrid(heatmapRef.current, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', heatTz),
          heatmapRaw: { ...heatmapRef.current },
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, timeline, runningCalls, now, prefs.cardConfigs?.heatmap?.monthMode, prefs.cardConfigs?.heatmap?.timeZone])
      return null
    },
  ))

  // ---- Right rail panel. ----
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'widgets-panel', order: 1000 },
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
      // One magnification engine, two wave styles (chosen by prefs.realTime):
      //  - discrete: the live pointer is snapped onto a quantized grid (row /
      //    column centres + midpoints), so the peak glides between grid points
      //    as the pointer crosses cards AND the gaps between them.
      //  - realtime: the peak follows the pointer's 2D position every frame.
      // Both are driven by the same focusX/focusY (armed by an actual card
      // hit, kept while crossing gaps, disarmed on leaving the rail); the
      // size tween lives entirely in the overlay's CSS width/height
      // transition, so entering/exiting magnifies smoothly.
      const [focusY, setFocusY] = React.useState<number | null>(null)
      const [focusX, setFocusX] = React.useState<number | null>(null)
      // Animation phase for the overlay's CSS size tween. Entering/leaving the
      // wave uses a short tween (smooth grow/shrink, no pop); while FOLLOWING
      // the pointer the transition is disabled so every frame lands directly on
      // the steady-state right-anchored geometry 鈥?that keeps the right edge on
      // the rail's right line and the inter-card gaps exactly `pad` even under
      // fast pointer movement (a live width tween would linger in non-steady
      // intermediate geometry: misaligned right edges and uneven gaps).
      const [animPhase, setAnimPhase] = React.useState<'idle' | 'grow' | 'follow' | 'shrink'>('idle')
      const animPhaseRef = React.useRef<'idle' | 'grow' | 'follow' | 'shrink'>('idle')
      const phaseTimer = React.useRef<number | undefined>(undefined)
      const schedulePhase = (next: 'grow' | 'follow' | 'shrink' | 'idle', afterMs: number): void => {
        if (phaseTimer.current !== undefined) window.clearTimeout(phaseTimer.current)
        if (afterMs <= 0) { animPhaseRef.current = next; setAnimPhase(next); return }
        animPhaseRef.current = next
        setAnimPhase(next)
        phaseTimer.current = window.setTimeout(() => {
          phaseTimer.current = undefined
          // Follow is only meaningful while still engaged; a leave that raced
          // this timer morphs into the shrink phase instead.
          const final = next === 'follow' ? (armedRef.current ? 'follow' : 'shrink') : next
          animPhaseRef.current = final
          setAnimPhase(final)
        }, afterMs)
      }
      React.useEffect(() => () => { if (phaseTimer.current !== undefined) window.clearTimeout(phaseTimer.current) }, [])
      // Rail content scroll offset (px), synced to the fixed magnify overlay so
      // it tracks the scrolled deck instead of sitting at the rail's viewport top.
      const [railScrollTop, setRailScrollTop] = React.useState(0)
      // Realtime magnification arming: the wave engages only once the pointer
      // has actually hit a CARD (bare rail gaps must not trigger it), then
      // stays engaged while the pointer crosses the gaps between cards, and
      // disarms only when it leaves the rail. cardElsRef owns the static
      // deck's card slots for hit-testing; armedRef is the state machine.
      const cardElsRef = React.useRef<(HTMLDivElement | null)[]>([])
      const armedRef = React.useRef(false)
      // Last pointer position in rail-content coordinates, kept so a rail scroll
      // (which moves cards but not the mouse) re-targets the peak correctly.
      const lastClientXYRef = React.useRef<{ x: number; y: number } | null>(null)
      const contentYRef = React.useRef<number | null>(null)
      const contentXRef = React.useRef<number | null>(null)
      const rafRef = React.useRef(0)
      const railRectRef = React.useRef<DOMRect | null>(null)
      /** True when the pointer lies inside any static card slot rect. */
      const hitTestCards = (clientX: number, clientY: number): boolean => {
        for (const el of cardElsRef.current) {
          if (!el) continue
          const r = el.getBoundingClientRect()
          if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true
        }
        return false
      }
      const moveRailFocus = (clientX: number, clientY: number, el: HTMLDivElement): void => {
        lastClientXYRef.current = { x: clientX, y: clientY }
        const rect = el.getBoundingClientRect()
        railRectRef.current = rect
        const contentX = clientX - rect.left
        const contentY = clientY - rect.top - 2 + el.scrollTop
        contentXRef.current = contentX
        contentYRef.current = contentY
        // Engage only on a real card hit; crossing gaps afterwards keeps the
        // arm, leaving the rail disarms it (see onMouseLeave).
        if (hitTestCards(clientX, clientY)) armedRef.current = true
        if (!armedRef.current) return
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0
          const x = contentXRef.current
          const y = contentYRef.current
          // First engaged frame (or re-engage after a leave) uses the "grow"
          // tween so the wave scales up smoothly; once the tween settles we
          // switch to "follow" (no transition) so fast pointer movement lands
          // instantly on steady-state geometry. Only the realtime style needs
          // the follow mode 鈥?discrete keeps its tween for grid gliding.
          if (prefs.realTime && animPhaseRef.current !== 'follow' && animPhaseRef.current !== 'grow') {
            schedulePhase('grow', 0)
            schedulePhase('follow', 170)
          } else if (!prefs.realTime && animPhaseRef.current === 'idle') {
            schedulePhase('grow', 0)
            schedulePhase('follow', 170)
          }
          setFocusX(x)
          setFocusY(y)
        })
      }
      // Re-target the peak when the rail scrolls without the pointer moving.
      // Both modes re-sync (the scroll moves the deck under a stationary
      // pointer, so the wave must follow the new card positions).
      const railScrollSync = (el: HTMLDivElement): void => {
        if (lastClientXYRef.current === null) return
        moveRailFocus(lastClientXYRef.current.x, lastClientXYRef.current.y, el)
      }
      React.useEffect(() => {
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
      }, [])
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) {
          setAddOpen(false); setFocusY(null); setFocusX(null)
          armedRef.current = false
          cardElsRef.current = []
          animPhaseRef.current = 'idle'
          setAnimPhase('idle')
          if (phaseTimer.current !== undefined) { window.clearTimeout(phaseTimer.current); phaseTimer.current = undefined }
        }
      }, [snap.open, snap.hasSession])
      // ── Drawer open/close animation, matching dsh-better-sidebar's right
      //    panel: a translateX slide with --ds-transition-duration-slow +
      //    --ds-ease-in-out, applied to a position:fixed inset:0 wrapper so the
      //    rail + magnify overlay + add panel move as ONE surface. Opening
      //    glides in from the RIGHT (translateX(+travel) → 0, moving leftwards
      //    into the resting slot), closing is the reverse (0 →
      //    translateX(+travel), sliding out to the right). CSS transitions
      //    interrupt natively: a rapid re-toggle animates from the current
      //    intermediate geometry straight to the new target — no snap, no
      //    desync. The wrapper is pointer-events:none so it never blocks the
      //    page.
      const shouldOpen = snap.open && snap.hasSession
      const [drawerPhase, setDrawerPhase] = React.useState<'closed' | 'enter' | 'open' | 'leave'>(shouldOpen ? 'open' : 'closed')
      const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Leave timeout: the CSS slide is 0.3s (--ds-transition-duration-slow);
      // unmount 350ms later so the element is gone only after the slide ends.
      const DRAWER_LEAVE_MS = 350
      React.useEffect(() => {
        setDrawerPhase((p) => {
          if (shouldOpen) return p === 'closed' ? 'enter' : p === 'leave' ? 'open' : p
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
      const side = prefs.cardSide
      const pad = prefs.panelPadding
      const columns = [1, 2, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
      const multi = columns > 1
      // Rail width is the STATIC grid width 鈥?NO magnification overshoot. The
      // rail no longer reserves left room for the bell-curve overshoot (which
      // used to widen both the rail and --dsx-rail-w, pushing the conversation
      // column right). A magnified card's left growth is instead painted by a
      // fixed overlay layer OUTSIDE the rail's scroll-clip box (see magnifyLayer)
      // so the conversation column keeps the resting rail's width at all times.
      const railW = multi ? columns * side + (columns + 1) * pad : side + pad * 2
      document.documentElement.style.setProperty('--dsx-rail-w', `${railW}px`)
      document.documentElement.style.setProperty('--dsx-rail-pad', `${pad}px`)
      document.documentElement.style.setProperty('--dsx-rail-overshoot', `0px`)
      document.documentElement.style.setProperty('--dsx-rail-scroll', `${railScrollTop}px`)
      // Heatmap data is owned by the dock collector (live accumulated + persisted to
      // localStorage). The rail MUST consume the collector's live values and
      // never override them; only when stats lacks heatmap fields entirely
      // (first paint before the collector effect runs) fall back to the
      // persisted table so the cards are never blank.
      const statsHeat = (snap.stats as { heatmapRaw?: Record<string, number>; heatmapGrid?: unknown } | null) ?? null
      const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0 ? statsHeat.heatmapRaw : migrateHeatmapV2()
      const base = {
        ...(snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }),
        // Only inject the fallback when live stats lacks heatmap fields.
        ...(statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } }),
        ...(statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ) }),
      }
      interface RailItem { key: string; size: WidgetSize; w: (typeof WIDGETS)[number]; out: NonNullable<ReturnType<(typeof WIDGETS)[number]['render']>>; baseW: number }
      // Pooled usage views: ['total', 'Key 1', 'Key 2', 鈥 when the pool has
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
          // usage payload) must never take down the whole rail — a render
          // exception used to kill the entire shell.overlay slot entry, hiding
          // every widget until the next hard refresh. The bad card degrades to
          // a placeholder instead; the error stays visible in the console.
          let out: ReturnType<typeof w.render>
          try {
            out = w.render({ ...base, usageData: snap.usageData, usageMulti: snap.usageMulti, sysinfo: snap.sysinfo, poolModes, armedAction, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0], { size })
          } catch (error) {
            console.error(`[dsh-widgets] widget ${widgetId}@${size} render crashed:`, error)
            out = { title: widgetName(w), value: '—', legend: t('ui.renderError') }
          }
          if (!out) return null
          // 2脳4 is exactly two 2脳2 widths plus one inter-card gap.
          const baseW = size === '2x4' ? 2 * side + pad : side
          return { key, size, w, out, baseW }
        })
        .filter((it): it is RailItem => it !== null)
        // In a 1-column layout a 2脳4 tile (two cells wide) cannot fit the single
        // rail column, so its instances are hidden 鈥?TEMPORARILY blocklisted,
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
      // and its CSS carries `transition: right` 鈥?deliberately on the MAIN
      // THREAD, the same animation path as the conversation column's
      // margin-right. A compositor transform (v1.2.3) never dropped frames,
      // but when the column's per-frame reflow overran a frame the rail kept
      // gliding while the column stalled 鈥?the two visibly split. Same-path
      // animation cannot split: both surfaces advance in the same style鈫抣ayout
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
      // Dock-style magnification, following the authoritative macOS Dock
      // algorithm (see LikhithSP/MacOS-Web-Simulator Dock.jsx):
      //   - scale is a DISCRETE STEP of the distance from the hovered card
      //     {d0: peak, d1, d2, 鈮3 none} 鈥?a steep bell, NOT a flat gaussian, so
      //     neighbours barely grow while the hovered card is clearly the peak.
      //   - the hovered card is HARD-MAX by construction (d=0 returns the peak).
      //   - cards are sized through LAYOUT (width/height change, neighbours make
      //     room via cumulative top), not transform 鈥?so the right edge stays
      //     pinned to the rail right and the gap between cards is constant.
      const restCenter = (i: number): number => i * (side + pad) + side / 2
      const peakScale = prefs.magnify
      // Continuous falling bell, scaled relative to the peak so the curve keeps
      // its shape at any configured magnification. d is measured in "grid steps"
      // (X divided by column pitch, Y by row pitch), so the decay is naturally
      // row/column-aware. It is CONTINUOUS (not rounded): a horizontal move of the
      // peak within a row nudges the rows above/below by a fractional step, so
      // they visibly respond instead of snapping to the same rounded bucket.
      const stepScale = (d: number): number => {
        const extra = peakScale - 1
        if (d <= 0) return peakScale
        const t = Math.max(0, 1 - d / 3)      // 0..1 over a ~3-step influence radius
        if (t <= 0) return 1                  // three+ steps away: not magnified
        return 1 + extra * Math.pow(t, 1.6)   // steep, peak-emphasising falloff
      }
      const active = prefs.realTime
      // Row-band packing (P2, no gaps): every card is one grid-unit tall
      // (2脳2 and 2脳4 share the same height). A 2脳4 spans two cells in width, a
      // 2脳2 spans one. Cards pack left-to-right through the row's cell budget;
      // when the current row cannot fit a card (e.g. a 2脳4 with only one cell
      // left), it moves to the next row, so a later 2脳2 always back-fills the gap.
      const spanOf = (i: number): number => (items[i].size === '2x4' ? 2 : 1)
      const baseWOf = (i: number): number => items[i].baseW
      const rowIndexOf: number[] = []
      const colIndexOf: number[] = []
      const n = items.length
      // --- assign cards to rows (P2 packing, no gaps) ---
      if (n > 0) {
        if (multi) {
          // Greedy best-fit packing: each item lands in the EARLIEST row that has
          // room for its span, opening a new row only when none fits. A 2脳4 (span
          // 2) that would leave a single-cell gap is therefore back-filled by a
          // later 2脳2, so no row ever shows a hole regardless of drag order.
          const rowUsed: number[] = [0]
          for (let i = 0; i < n; i++) {
            const sp = spanOf(i)
            let placed = -1
            for (let r = 0; r < rowUsed.length; r++) {
              if (rowUsed[r] + sp <= columns) { placed = r; break }
            }
            if (placed === -1) { placed = rowUsed.length; rowUsed.push(0) }
            rowIndexOf[i] = placed
            colIndexOf[i] = rowUsed[placed]
            rowUsed[placed] += sp
          }
        } else {
          for (let i = 0; i < n; i++) { rowIndexOf[i] = i; colIndexOf[i] = 0 }
        }
      }
      const rows = (multi ? (n > 0 ? rowIndexOf[n - 1] + 1 : 0) : n)
      // --- magnification scale field ---
      // Shared stepless core: every card's scale is its own continuous Euclidean
      // distance to a focus point (rail-content coords). Both modes reuse this so
      // the posture (right-edge anchored) is identical and the right edge stays
      // flush with the rail regardless of mode.
      //  - Stepless (`active`):   focus = the pointer's live coordinates.
      //  - Discrete (`!active`):  focus = the pointer coordinates SNAPPED onto a
      //    discrete grid 鈥?the row/column centres plus the midpoints between each
      //    adjacent pair (rows 鈫?2路rows-1 Y points, cols 鈫?2路cols-1 X points).
      //    The 0.2s tween then glides the peak between those grid points.
      const cellW = side + pad
      const rowH = side + pad
      const scaleFor = (fx: number, fy: number): number[] => {
        const out = new Array(n).fill(1)
        if (multi) {
          for (let i = 0; i < n; i++) {
            const cxi = (colIndexOf[i] + spanOf(i) / 2) * cellW
            const cyi = rowIndexOf[i] * rowH + side / 2
            out[i] = stepScale(Math.hypot(cxi - fx, cyi - fy) / (side + pad))
          }
        } else {
          for (let i = 0; i < n; i++) out[i] = stepScale(Math.abs(fy - restCenter(i)) / (side + pad))
        }
        return out
      }
      // Discrete quantization grid: row centres + adjacent midpoints (Y), and
      // column centres + adjacent midpoints (X).
      const yPts: number[] = []
      for (let r = 0; r < rows; r++) {
        yPts.push(r * rowH + side / 2)
        if (r < rows - 1) yPts.push((r + 0.5) * rowH + side / 2)
      }
      const xPts: number[] = []
      for (let cIdx = 0; cIdx < columns; cIdx++) {
        xPts.push(cIdx * cellW + cellW / 2)
        if (cIdx < columns - 1) xPts.push((cIdx + 0.5) * cellW + cellW / 2)
      }
      const nearest = (v: number, pts: number[]): number => {
        let best = pts[0] ?? 0
        for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k] - v) < Math.abs(best - v)) best = pts[k]
        return best
      }
      // Engagement: focus coordinates exist AND the pointer has hit a card once
      // since entering the rail (armed). Crossing the gaps keeps the arm;
      // leaving the rail disarms. Both modes share this state machine.
      const engaged = focusX !== null && focusY !== null && armedRef.current
      let scaleArr = new Array(n).fill(1)
      // Focus in rail-content coordinates. rawX is the rail-box X minus the
      // left padding (card cell centres are content-relative); rawY already is.
      let rawX = 0
      let rawY = 0
      if (engaged) {
        rawX = (focusX ?? 0) - pad
        rawY = focusY ?? 0
        scaleArr = active ? scaleFor(rawX, rawY) : scaleFor(nearest(rawX, xPts), nearest(rawY, yPts))
      }
      // --- build actual reflow (right-edge anchored) for a given scale array.
      //   Each card is one grid-unit tall (2脳2 and 2脳4 share the same height =
      //   side 脳 scale); only the width differs (2脳4 is two units plus the gap).
      //   Within each row cards place right-to-left (rightmost at right:0, each
      //   next pushed left by prev width + pad); row top accumulates by the
      //   tallest scaled height in the row (+pad), so a magnified row pushes the
      //   rows below it down. Spacing stays exactly pad. ---
      const placeCards = (sc: number[]): Array<{ s: number; top: number; right: number; w: number; h: number }> => {
        const place: Array<{ s: number; top: number; right: number; w: number; h: number }> = new Array(n)
        if (n > 0) {
          if (multi) {
            const rowTopAcc: number[] = new Array(rows).fill(0)
            const rowHAcc: number[] = new Array(rows).fill(0)
            for (let i = 0; i < n; i++) { const r = rowIndexOf[i]; const h = side * sc[i]; if (h > rowHAcc[r]) rowHAcc[r] = h }
            {
              let acc = 2
              for (let r = 0; r < rows; r++) { rowTopAcc[r] = acc; acc += rowHAcc[r] + pad }
            }
            for (let r = rows - 1; r >= 0; r--) {
              const inRow: number[] = []
              for (let i = 0; i < n; i++) if (rowIndexOf[i] === r) inRow.push(i)
              inRow.sort((a, b) => colIndexOf[b] - colIndexOf[a])
              let colRight = 0
              for (const i of inRow) {
                const w = baseWOf(i) * sc[i]
                place[i] = { s: sc[i], top: rowTopAcc[r], right: colRight, w, h: side * sc[i] }
                colRight += w + pad
              }
            }
          } else {
            // Single column, right-anchored (2脳4 collapses to 2脳2 width here since
            // a single column has no room for a two-cell-wide card).
            let acc = 2
            for (let i = 0; i < n; i++) { const h = side * sc[i]; place[i] = { s: sc[i], top: acc, right: 0, w: h, h }; acc += h + pad }
          }
        }
        return place
      }
      // Static deck (rail scroll content): resting grid, scale 1 everywhere. The
      // rail keeps this deck intact for scrolling, occupancy and interaction.
      const staticLayout = placeCards(new Array(n).fill(1))
      // Focus deck (fixed overlay, escapes the rail's scroll-clip box): the live
      // magnification reflow. It is ALWAYS rendered (resting grid when not
      // engaged) so the overlay's CSS width/height transition can animate the
      // growth/shrink smoothly on enter and exit instead of popping in at the
      // target size; its opacity hides it while resting.
      const focusLayout = placeCards(engaged ? scaleArr : new Array(n).fill(1))
      // Deck height is the STATIC reflow bottom (the rail content never grows
      // while magnifying 鈥?growth is painted by the fixed overlay), so the add
      // button and scroll height stay fixed at the resting grid.
      const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      // Add button placement, shared by the static deck and the focus overlay.
// Rows are right-anchored, so the leftover cell(s) of a short last row sit at
// the row's LEFT edge. The button parks in that gap ONLY when the STATIC gap
// is actually wide enough (leftGap >= side) 鈥?the fit decision must not
// flip under magnification (a focused row's wider cards would shrink the gap
// below `side` and jump the button to the deck bottom-right mid-hover).
// Placement itself rides the passed `layout` (static or scaled), so while
// hovering the button stays in its gap slot, gliding with the row.
// The leftmost placed card, not the last item, anchors the gap 鈥?the old code
// anchored off the last item, which for a left-packed 4-col row put the button
// on top of the row's own cards.
const addSlotFor = (layout: Array<{ s: number; top: number; right: number; w: number; h: number }>): { top: number; right: number } => {
  if (n === 0) return { top: 2 + pad, right: 0 }
  if (multi) {
    const lastRow = rowIndexOf[n - 1]
    const lastRowUsed = colIndexOf[n - 1] + spanOf(n - 1)
    if (lastRowUsed < columns) {
      // fit-check against the STATIC widths so hovering never flips the slot
      let sLeftmost = staticLayout[n - 1]
      for (let i = n - 2; i >= 0; i--) {
        if (rowIndexOf[i] !== lastRow) continue
        if (staticLayout[i].right > sLeftmost.right) sLeftmost = staticLayout[i]
      }
      const contentW = railW - 2 * pad
      if (contentW - sLeftmost.right - sLeftmost.w - pad >= side) {
        let leftmost = layout[n - 1]
        for (let i = n - 2; i >= 0; i--) {
          if (rowIndexOf[i] !== lastRow) continue
          if (layout[i].right > leftmost.right) leftmost = layout[i]
        }
        return { top: leftmost.top, right: leftmost.right + leftmost.w + pad }
      }
    }
    const bottom = layout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
    return { top: bottom + pad, right: 0 }
  }
  const bottom = layout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
  return { top: bottom + pad, right: 0 }
}
// Deck height covers the live reflow bottom AND the add button (when it
      // hangs below the deck), so neither ever clips or pushes unexpectedly.
      const nItems = items.length
      const staticAdd = addSlotFor(staticLayout)
      const addTop = staticAdd.top
      const addRight = staticAdd.right
      const addBottom = addTop + side
      const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad
      // The add button participates in the magnification wave like a card 鈥?and its
      // PLACEMENT rides the wave layout too: top/right are recomputed from the
      // focused (scaled) rows, so when cards above it grow taller the button
      // moves down with the magnified deck bottom / last-row gap, exactly like
      // a card would. Resting (unengaged) it equals the static placement.
      const focusedAdd = addSlotFor(focusLayout)
      const addCenter = { x: railW - 2 * pad - focusedAdd.right - side / 2, y: focusedAdd.top + side / 2 }
      const addScale = engaged && n > 0
        ? stepScale(Math.hypot(addCenter.x - rawX, addCenter.y - rawY) / (side + pad))
        : 1
      // True only when the focus deck or the add button differs from rest.
      const magnifying = engaged && n > 0 && (scaleArr.some((s) => s > 1.001) || addScale > 1.001)
      const railChildren: React.ReactNode[] = [
        // Relative-positioned layer that owns the cards' absolute layout. This
        // is the STATIC deck: resting grid, fixed scroll height, and it carries
        // all the interactive affordances (hover, resize). While a card is
        // magnified it fades out and the fixed overlay below paints the bigger
        // cards, so the two never double-draw shadows/borders.
        React.createElement('div', { key: '__deck', style: { position: 'relative', height: `${stackHeight}px` } },
          staticLayout.map((c, idx) => {
            const it = items[idx]
            // Static cards never change size themselves (the overlay paints the
            // scaled copies); only their opacity fades while magnifying.
            const transition = 'opacity 0.15s ease'
            const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px`, transition, opacity: magnifying ? 0 : 1 }
            return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle, ref: (el: HTMLDivElement | null) => { cardElsRef.current[idx] = el } },
              React.createElement(CardBody, { out: it.out, unit: side, width: c.w, onAction: handleAction, onCycle: cyclePool(it.key) }),
              React.createElement('span', { className: 'dsx-stats-resize', 'aria-label': t('ui.rail.resizeAria'), onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = side; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
            )
          }),
          // Bottom add button, parked inside the deck so it shares the grid
          // layout: fills the empty last-row cell on odd counts, or sits
          // right-aligned below the rows on even counts / single column.
          React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: () => setAddOpen((v) => !v), style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px`, opacity: magnifying ? 0 : 1, transition: 'opacity 0.15s ease' } },
            React.createElement('span', { className: 'dsx-stats-add-icon' },
              React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
            ),
            React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
          ),
        ),
      ]
      const rail = React.createElement('div', {
        className: 'dsx-stats-rail', style: { position: 'fixed', top: 'var(--dsx-rail-top,0px)', right: 'var(--dsh-sidebar-width, 0px)', bottom: 0, width: `${railW}px`, overflowY: 'auto', overflowX: 'visible', boxSizing: 'border-box', padding: `4px ${pad}px ${pad}px ${pad}px`, background: 'transparent', pointerEvents: 'auto' },
        onMouseLeave: () => {
          armedRef.current = false
          setFocusY(null); setFocusX(null)
          // Smooth shrink back to resting size (the overlay stays mounted and
          // its width/height tween runs against the resting layout).
          if (animPhaseRef.current !== 'idle' && animPhaseRef.current !== 'shrink') schedulePhase('shrink', 0)
          schedulePhase('idle', 200)
        },
        onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => moveRailFocus(e.clientX, e.clientY, e.currentTarget),
        onScroll: (e) => { setRailScrollTop(e.currentTarget.scrollTop); railScrollSync(e.currentTarget) },
      }, railChildren)
      // Magnify overlay: a FIXED layer rendered OUTSIDE the rail's scroll-clip
      // box (a sibling of the rail, so no ancestor overflow clips it). When a
      // card is magnifying it paints the live reflow here 鈥?its leftward growth
      // is visible over the conversation edge instead of being cut off at the
      // rail's left boundary, and the rail width (hence the conversation column)
      // never changes. It is pointer-events:none (interaction stays on the rail)
      // and tracks the rail's scroll via --dsx-rail-scroll so it stays pinned to
      // the scrolled deck. zIndex 25 keeps it above the rail's own cards.
      // ALWAYS mounted: entering/exiting updates only scale, and the CSS
      // width/height transition below animates the growth/shrink smoothly
      // (mounting at the target size would pop). Opacity hides it while rest.
      // Positions (top/right) are INSTANT always 鈥?right-anchored geometry
      // keeps the right edge on the rail's right line. The size tween applies
      // to the enter/exit phases (grow/shrink) and to the discrete style's
      // grid gliding; the realtime FOLLOW phase has no transition so every
      // frame lands directly on the steady-state geometry (right edge aligned
      // AND inter-card gaps exactly `pad`, even under fast pointer movement).
      const tweenSize = !active || animPhase === 'grow' || animPhase === 'shrink'
      const overlayTransition = tweenSize
        ? 'top 0s, right 0s, width 0.15s var(--ds-ease-in-out), height 0.15s var(--ds-ease-in-out)'
        : 'none'
      const magnifyLayer = React.createElement('div', { key: '__magnify', style: { position: 'fixed', top: 'calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px))', right: 'var(--dsh-sidebar-width, 0px)', width: `${railW}px`, boxSizing: 'border-box', padding: `4px ${pad}px ${pad}px ${pad}px`, pointerEvents: 'none', zIndex: 25, overflow: 'visible', background: 'transparent', opacity: magnifying ? 1 : 0, transition: 'opacity 0.15s ease' } },
        React.createElement('div', { key: '__mdeck', style: { position: 'relative', height: `${stackHeight}px` } },
          // Positions (top/right) are INSTANT always 鈥?right-anchored geometry
          // keeps the right edge on the rail's right line. The size tween
          // applies to the enter/exit phases (grow/shrink) and to the discrete
          // style's grid gliding; the realtime FOLLOW phase has no transition
          // so every frame lands directly on the steady-state geometry (right
          // edge aligned AND inter-card gaps exactly `pad`, even under fast
          // pointer movement).
          focusLayout.map((c, idx) => {
            const it = items[idx]
            const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px`, transition: overlayTransition, zIndex: Math.round((c.s - 1) * 100) }
            return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle },
              // Lazy body: cards render ONLY while actually magnifying. The slot
              // div stays mounted (its geometry tween continues seamlessly on
              // enter/exit), but the heavy card DOM (heatmaps, charts) is
              // absent at rest 鈥?halving the rail's resident DOM and its
              // layout cost while the right sidebar animates. At rest the
              // overlay is invisible (opacity 0) anyway, and on engage the
              // body mounts at rest geometry BEFORE the size tween starts, so
              // the fade-in shows no pop.
              magnifying ? React.createElement(CardBody, { out: it.out, unit: side * c.s, width: c.w, onAction: undefined }) : null,
            )
          }),
          // Mirror the add button at its WAVE position (focusedAdd), scaled by
          // its own wave factor 鈥?it displaces with the magnified deck like a
          // card, and its size follows the same bell curve.
          React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), tabIndex: -1, style: { position: 'absolute', top: `${focusedAdd.top.toFixed(2)}px`, right: `${focusedAdd.right.toFixed(2)}px`, width: `${(side * addScale).toFixed(2)}px`, height: `${(side * addScale).toFixed(2)}px`, borderRadius: `${Math.round(addRadius * addScale)}px`, transition: overlayTransition, zIndex: 30 } },
              React.createElement('span', { className: 'dsx-stats-add-icon' },
                React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
              ),
              React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
            ),
          ),
        )
      // Temporary right-side add panel: reuses the settings 缁勪欢甯傚満 + 鎷栧姩鎺掑簭
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
      const addPanel = React.createElement('div', { className: 'dsx-stats-addpanel' + (addOpen ? ' open' : ''), style: { top: 'var(--dsx-rail-top,0px)', width: `${pw}px` } },
        React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': t('ui.addPanel.resizeAria'), onPointerDown: startResize }),
        React.createElement('div', { className: 'dsx-stats-addpanel-header' },
          React.createElement('div', { className: 'dsx-stats-addpanel-title' }, t('ui.addPanel.title')),
          React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': t('ui.addPanel.closeAria'), onClick: () => setAddOpen(false) }, closeIcon),
        ),
        React.createElement('div', { className: 'dsx-stats-addpanel-body' },
          React.createElement(WidgetsPage, { controller: { prefs, setPrefs }, hideHeader: true }),
        ),
      )
      // Always render the panel too so closing slides it out (`.open` toggles
      // visibility/transform); when closed it is hidden (visibility + opacity)
      // and never intercepts pointer events over the rail.
      //
      // Drawer wrapper: the ONE surface that slides. position:fixed inset:0
      // keeps every fixed child (rail / magnify overlay / add panel) positioned
      // exactly as before — a transformed fixed ancestor becomes their
      // containing block, but this wrapper spans the viewport so the
      // coordinates are identical — while the wrapper's own translateX carries
      // the whole group. Opening glides in from the RIGHT (translateX(+travel)
      // → 0, leftwards into its resting slot); closing is the reverse (0 →
      // translateX(+travel), sliding out to the right). pointer-events:none:
      // interaction stays on the children that opt in.
      // Travel distance is the rail's own width (+24px margin), NOT a
      // percentage: translateX(%) on this wrapper would resolve against the
      // VIEWPORT width (inset:0), sliding a whole screen-width instead of one
      // rail width (far too fast over the same 0.3s).
      const drawerTravel = Math.round(railW + 24)
      const drawerTransform = drawerPhase === 'enter' || drawerPhase === 'leave' ? `translateX(${drawerTravel}px)` : 'none'
      const drawerTransition = reduceMotion ? 'none' : 'transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)'
      return React.createElement('div', { key: '__drawer', style: { position: 'fixed', inset: 0, pointerEvents: 'none', transform: drawerTransform, transition: drawerTransition } },
        rail, magnifyLayer, addPanel,
      )
    },
  ))

  // ---- Settings section ("缁勪欢" page). ----
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'widgets', order: 30, label: () => t('ui.section.label') },
    () => {
      const snap = useBridge()
      return React.createElement(WidgetsPage, { controller: { prefs: snap.prefs, setPrefs } })
    },
  ))

  // ---- Rail width + stats-line toggle. ----
  ctx.effect(() => {
    const apply = (): void => { document.body.classList.toggle('dsx-stats-active', state.open && state.hasSession); scheduleMeasure() }
    const sub = subscribe(apply)
    apply()
    return () => { sub(); document.body.classList.remove('dsx-stats-active') }
  })

  // ---- Official composer stats-line hide switch (personal preference). ----
  ctx.effect(() => {
    const apply = (): void => { document.body.classList.toggle('dsx-hide-statsline', prefs.hideStatsLine) }
    const sub = subscribe(apply)
    apply()
    return () => { sub(); document.body.classList.remove('dsx-hide-statsline') }
  })
}
