/**
 * Harness Widgets — browser half entry.
 *
 * Registers the right-hand widget rail, the header capsule toggle, and the
 * two settings surfaces (General rows + the "组件" section). One shared bridge
 * holds the persisted prefs, the folded session stats, and the OpenCode usage
 * payload fetched from the Host's same-origin `/api/opencode-usage` route.
 */

import * as React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import './widgets.module.css'
import { ALL_IDS, ALL_INSTANCES, DEFAULT_INSTALLED, WIDGETS, instanceKey, parseInstanceKey, sizesOf, type UsageData, type WidgetSize } from './widgets'
import { CardBody, WidgetsPage, type Prefs } from './components'

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

// ── Daily token-usage heatmap (self-accounted to localStorage). ──
const HEATMAP_KEY = 'harness-widgets.heatmap'

function loadHeatmap(): Record<string, number> {
  try { const raw = localStorage.getItem(HEATMAP_KEY); return raw ? JSON.parse(raw) as Record<string, number> : {} } catch { return {} }
}
function saveHeatmap(m: Record<string, number>): void {
  try { localStorage.setItem(HEATMAP_KEY, JSON.stringify(m)) } catch { /* storage unavailable */ }
}
/** Default heatmap accounting timezone: Beijing (UTC+8). Configurable per
 *  heatmap card (cardConfigs.heatmap.timeZone); 'local' = browser clock. */
const DEFAULT_TZ = 'Asia/Shanghai'
function dateKey(d: Date, tz?: string): string {
  const tzName = tz || DEFAULT_TZ
  if (tzName !== 'local') {
    try {
      // en-CA formats as YYYY-MM-DD in the requested timezone — the calendar
      // day boundary follows the timezone, not the browser clock.
      return new Intl.DateTimeFormat('en-CA', { timeZone: tzName }).format(d)
    } catch { /* unknown tz → fall through to local calendar day */ }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Build a horizontal (GitHub-style) heatmap grid: 7 rows (Sun..Sat) × weeks
 *  as columns (~13 wide). Two window-alignment modes:
 *   - 'rolling' : classic rolling window — the last 13 weeks ending today,
 *     so today is always pinned to the right edge (future is unknowable).
 *   - 'quarter' : align to the current calendar quarter (1–3, 4–6, 7–9,
 *     10–12月) that contains today; today then lands wherever it naturally
 *     falls within the quarter (e.g. mid-quarter dates sit toward the middle).
 *  Future columns render empty (value 0), shown faint. */
function buildHeatmapGrid(m: Record<string, number>, mode: 'rolling' | 'quarter' = 'rolling', tz?: string): Array<Array<{ value: number; date: string }>> {
  const weeks = 13
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()) // this week's Sunday
  let base: Date
  if (mode === 'quarter') {
    // Current calendar quarter start (month 0-based → floored to 0/3/6/9, day 1).
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    // Anchor on the Sunday on/before the quarter start, then span `weeks` columns.
    base = new Date(qStart.getFullYear(), qStart.getMonth(), qStart.getDate() - qStart.getDay())
  } else {
    // Rolling: today's week pinned to the last column.
    base = new Date(startOfWeek)
    base.setDate(base.getDate() - (weeks - 1) * 7)
  }
  const grid: Array<Array<{ value: number; date: string }>> = []
  for (let r = 0; r < 7; r++) {
    const row: Array<{ value: number; date: string }> = []
    for (let c = 0; c < weeks; c++) {
      const d = new Date(base)
      d.setDate(base.getDate() + c * 7 + r)
      const k = dateKey(d, tz)
      row.push({ value: m[k] ?? 0, date: k })
    }
    grid.push(row)
  }
  return grid
}

/** Add newly observed tokens to today; returns the running grid for the card. */
function accumulateHeatmap(m: Record<string, number>, dayKey: string, delta: number): Record<string, number> {
  if (delta <= 0) return m
  const next = { ...m, [dayKey]: (m[dayKey] ?? 0) + delta }
  saveHeatmap(next)
  return next
}

// Heatmap self-accounting: primary = per-step crediting (v2) when settled
// nodes carry per-node `usage` (exact day attribution by step start time);
// fallback = cumulative-delta with a session anchor (v1) when nodes lack
// `usage` (host may not project it into the folded surface). v1's known
// cross-midnight over-credit is avoided by anchoring on observed total growth
// and RESET, never a bare "new day → 0" (the anchor is only rebuilt on a
// cumulative fallback, i.e. a genuinely new session/log).
const HEATMAP_SEEN = 'harness-widgets.heatmap.seen'
const HEATMAP_SEEN_STRONGEST = 'harness-widgets.heatmap.strongest'
const HEATMAP_ANCHOR = 'harness-widgets.heatmap.anchor'
const HEATMAP_LOG_KEY = 'harness-widgets.heatmap.log-v2'
function loadSeen(): { keys: Set<string>; strongest: number } {
  try {
    const keys = new Set<string>()
    const raw = localStorage.getItem(HEATMAP_SEEN)
    if (raw) for (const k of JSON.parse(raw) as string[]) if (typeof k === 'string') keys.add(k)
    const sRaw = localStorage.getItem(HEATMAP_SEEN_STRONGEST)
    const strongest = Number.isFinite(+(sRaw ?? '')) ? +(sRaw ?? '') : 0
    return { keys, strongest }
  } catch { return { keys: new Set<string>(), strongest: 0 } }
}
function saveSeen(keys: Set<string>, strongest: number): void {
  try {
    localStorage.setItem(HEATMAP_SEEN, JSON.stringify([...keys]))
    localStorage.setItem(HEATMAP_SEEN_STRONGEST, String(strongest))
  } catch { /* storage unavailable */ }
}
function loadHeatmapAnchor(): number {
  try {
    const n = +(localStorage.getItem(HEATMAP_ANCHOR) ?? '')
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch { return 0 }
}
function saveHeatmapAnchor(n: number): void {
  try { localStorage.setItem(HEATMAP_ANCHOR, String(n)) } catch { /* storage unavailable */ }
}
/** V2 migration: NEVER drop existing heatmap history. The previous migration
 *  rebuilt the table with only the demo seed (8/14–16), discarding the real
 *  credits the user accumulated on the other days (e.g. 8/17–21) — a data-
 *  losing bug. Migration now:
 *  - cold install (no log key AND empty table): seed the three demo days;
 *  - upgrade: PRESERVE every existing date value, then BACKFILL any of the
 *    lost 8/14–21 days from host-session-cache derived constants (the real
 *    daily totals rebuilt from DSH's session_projcache.json), so devices that
 *    already had history cleared by the buggy migration get it restored.
 *  - cross-day over-credit fix comes from the accounting CHANGE itself, not
 *    from wiping the table.
 */
/** Daily totals rebuilt from the authoritative per-event session logs
 *  (D:/dsh-home/sessions/.../session.jsonl.zstd, decoded via ZSTD frame scan +
 *  the official tokenUsageOf delta algorithm, attributed by each usage
 *  EVENT's `time` in LOCAL time — not by session createdAt, because a session
 *  can span midnight. Sum is conserved: equals the all-session official total.
 *  IMPORTANT: non-live past days (8/14–8/21) are backfilled here — their
 *  sessions have ended, so the live collector will never re-credit them.
 *  8/22 must NOT be seeded: the live per-step accounting accumulates it in
 *  real time, and a fixed seed on top double-counts (8/22 was once 145M–181M). */
const HEATMAP_RECOVERED: Record<string, number> = {
  '2026-08-14': 74_315_859,
  '2026-08-15': 367_790_777,
  '2026-08-16': 1_195_700_475,
  '2026-08-17': 161_488_382,
  '2026-08-18': 292_337_504,
  '2026-08-19': 352_355_694,
  '2026-08-20': 214_853_935,
  '2026-08-21': 44_552_871,
  /* 8/22 intentionally absent — live-accumulated */
}
function migrateHeatmapV2(): Record<string, number> {
  const m = loadHeatmap()
  try {
    // Ensure the recovered history is present REGARDLESS of the v2-log flag:
    // earlier builds may have run the buggy migration (flag set) but been left
    // with an empty/incomplete table, so the flag alone must not block the
    // backfill. Preserve any user value; only fill zeros.
    const next = { ...m }
    let patched = false
    for (const [k, v] of Object.entries(HEATMAP_RECOVERED)) {
      if ((next[k] ?? 0) === 0) { next[k] = v; patched = true }
    }
    // Repair double-counted live days: 8/21 & 8/22 are accumulated by the
    // real-time per-step accounting; a leftover fixed seed or an inflated
    // value (e.g. 145M/181M from the V2.0 double-write) must be removed so the
    // live path rebuilds them from the authoritative session events. Clear the
    // seen-set too, so those steps get re-credited once. Runs ONCE (guarded by
    // a marker) so it never wipes the live values on subsequent renders.
    const repairedKey = 'harness-widgets.heatmap.live-fixed'
    let repaired = false
    if (!localStorage.getItem(repairedKey)) {
      // Only the CURRENT live day may be cleared for re-accumulation — past
      // days are closed history and must never be wiped (the old hard-coded
      // 8/21+8/22 list would delete a finished day's value on a fresh browser).
      const liveDays = [dateKey(new Date())]
      for (const k of liveDays) {
        if ((next[k] ?? 0) > 0) { delete next[k]; repaired = true }
      }
      if (repaired) {
        saveHeatmap(next)
        saveSeen(new Set<string>(), 0)
      }
      localStorage.setItem(repairedKey, '1')
    }
    // One-shot: clear TODAY's cell so any polluted value from the pre-fix
    // accounting (cross-day over-credit that diffed a whole session history
    // into today) is dropped; the live collector rebuilds it from here on.
    const tzResetKey = 'harness-widgets.heatmap.today-reset-v1'
    if (!localStorage.getItem(tzResetKey)) {
      const tk = dateKey(new Date())
      if ((next[tk] ?? 0) > 0) { delete next[tk]; patched = true }
      localStorage.setItem(tzResetKey, '1')
    }
    // Re-backfill after the one-shot repair: clearing 8/21 dropped its value,
    // so restore the authoritative history for non-live days again.
    let refill = false
    for (const [k, v] of Object.entries(HEATMAP_RECOVERED)) {
      if ((next[k] ?? 0) === 0) { next[k] = v; refill = true }
    }
    if (refill) saveHeatmap(next)
    if (patched) saveHeatmap(next)
    if (!localStorage.getItem(HEATMAP_LOG_KEY)) {
      localStorage.setItem(HEATMAP_LOG_KEY, '1')
      saveSeen(new Set<string>(), 0)
    }
    return next
  } catch { return m }
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
  // ids (pre-2×4) migrate to their 2×2 instance; unknown entries are dropped.
  const normalizeInstance = (key: string): string => {
    const { widgetId, size } = parseInstanceKey(key)
    const w = WIDGETS.find((x) => x.id === widgetId)
    if (!w) return ''
    return sizesOf(w).includes(size) ? instanceKey(widgetId, size) : ''
  }
  // Respect the user's installed set exactly — do NOT force-append built-ins
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
 * `sendBeacon` is delivered by the browser even as the page is destroyed —
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
  } catch { /* page is going away; nothing more can be done — the boot sync on the next launch converges */ }
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
  // Run the heatmap table repair/recovery once at plugin boot (independent of
  // any active session/dock), so polluted or incomplete histories are fixed
  // the moment the bundle loads.
  try { migrateHeatmapV2() } catch { /* best-effort */ }
  let prefs = loadState()
  let state = { open: prefs.railOpen, hasSession: false, stats: null as Stats | null, usageData: null as UsageData | null }

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
        // Host is newer (another origin/browser saved it) → adopt + mirror locally.
        prefs = normalizePrefs(hostState)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
          localStorage.setItem(SAVED_AT_KEY, String(hostAt))
        } catch { /* ignore */ }
        emit()
      } else if (hostAt < localAt && localAt > 0) {
        // Local is newer (host file absent/stale — e.g. first run after upgrade).
        try { await putState(prefs, localAt) } catch { /* best-effort */ }
      }
    } catch { /* host unavailable; stay on localStorage only */ }
  }
  function useBridge(): { open: boolean; hasSession: boolean; stats: Stats | null; usageData: UsageData | null; prefs: Prefs } {
    const [snap, setSnap] = React.useState({ ...state, prefs: { ...prefs } })
    React.useEffect(() => subscribe(() => setSnap({ ...state, prefs: { ...prefs } })), [])
    return snap
  }
  // Cross-tab + visibility re-sync, so "every change takes effect immediately"
  // also holds when the same DSH service is open in several tabs/windows:
  //  - `storage` events fire in OTHER tabs of the SAME origin when one saves →
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
    // column — the composer dock stats bar (`.FJxK*_root` inside
    // `conversation.composer.dock`) plus its own bottom padding — so a fixed
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
      return React.createElement('button', { type: 'button', className: 'dsx-stats-capsule', 'aria-pressed': snap.open, onClick: toggle }, React.createElement('span', null, '组件'))
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
      // OpenCode usage is account-wide and slow-moving: refresh once per mount.
      React.useEffect(() => {
        fetch('/api/opencode-usage')
          .then((r) => r.json())
          .then((data: UsageData) => setState({ usageData: data }))
          .catch(() => { /* keep last known usage */ })
      }, [])
      // One-second tick while a turn is running, so the in-flight LLM and tool
      // durations advance between settle boundaries instead of freezing.
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        if (!running) return
        setNow(Date.now())
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
      }, [running])
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
        //      each step ONCE to the day its `stepStartTime` began — exact
        //      per-conversation attribution, immune to cross-midnight sessions,
        //      session switches, remounts, compaction.
        //  (b) anchor fallback (v1): if nodes lack `usage` (host did not
        //      project it into the folded surface), fall back to diffing the
        //      cumulative `tokenUsage` projection against an anchor that is
        //      rebuilt ONLY on a cumulative RESET (new session) — never on a
        //      bare "new day" — so continuing a session across midnight still
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
        // (b) anchor fallback — only when per-step nodes carried no usage.
        // Anchor discipline (the cross-day over-credit fix):
        //   * while per-step crediting is active, keep the anchor parked at the
        //     observed cumulative — a later fallback takeover then diffs only
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
      // the steady-state right-anchored geometry — that keeps the right edge on
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
          // the follow mode — discrete keeps its tween for grid gliding.
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
      if (!snap.open || !snap.hasSession) return null
      const side = prefs.cardSide
      const pad = prefs.panelPadding
      const columns = [1, 2, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
      const multi = columns > 1
      // Rail width is the STATIC grid width — NO magnification overshoot. The
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
      const items: RailItem[] = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
        .map((key) => {
          const { widgetId, size } = parseInstanceKey(key)
          const w = WIDGETS.find((x) => x.id === widgetId)
          if (!w || sizesOf(w).indexOf(size) === -1) return null
          const out = w.render({ ...base, usageData: snap.usageData, armedAction, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0], { size })
          if (!out) return null
          // 2×4 is exactly two 2×2 widths plus one inter-card gap.
          const baseW = size === '2x4' ? 2 * side + pad : side
          return { key, size, w, out, baseW }
        })
        .filter((it): it is RailItem => it !== null)
      // The rail is a fixed viewport panel anchored to the right edge. The
      // dsh-better-sidebar bundle occupies the same edge with its own
      // fixed right panel (z-index 50) and pushes the app shell via
      // `#root { margin-right: var(--dsh-sidebar-width) }`. Anchor our right
      // edge to that same variable (0 while it is absent/closed) so the two
      // panels sit side by side instead of the sidebar covering the rail.
      // `transition: right` mirrors the shell's margin-right transition, so the
      // rail glides in sync when the sidebar expands/collapses (the shell
      // animates the shared variable's effect via a CSS transition; the rail
      // must carry the same one or it snaps while the column glides).
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
      //     {d0: peak, d1, d2, ≥d3 none} — a steep bell, NOT a flat gaussian, so
      //     neighbours barely grow while the hovered card is clearly the peak.
      //   - the hovered card is HARD-MAX by construction (d=0 returns the peak).
      //   - cards are sized through LAYOUT (width/height change, neighbours make
      //     room via cumulative top), not transform — so the right edge stays
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
      // (2×2 and 2×4 share the same height). A 2×4 spans two cells in width, a
      // 2×2 spans one. Cards pack left-to-right through the row's cell budget;
      // when the current row cannot fit a card (e.g. a 2×4 with only one cell
      // left), it moves to the next row, so a later 2×2 always back-fills the gap.
      const spanOf = (i: number): number => (items[i].size === '2x4' ? 2 : 1)
      const baseWOf = (i: number): number => items[i].baseW
      const rowIndexOf: number[] = []
      const colIndexOf: number[] = []
      const n = items.length
      // --- assign cards to rows (P2 packing, no gaps) ---
      if (n > 0) {
        if (multi) {
          // Greedy best-fit packing: each item lands in the EARLIEST row that has
          // room for its span, opening a new row only when none fits. A 2×4 (span
          // 2) that would leave a single-cell gap is therefore back-filled by a
          // later 2×2, so no row ever shows a hole regardless of drag order.
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
      //    discrete grid — the row/column centres plus the midpoints between each
      //    adjacent pair (rows → 2·rows-1 Y points, cols → 2·cols-1 X points).
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
      //   Each card is one grid-unit tall (2×2 and 2×4 share the same height =
      //   side × scale); only the width differs (2×4 is two units plus the gap).
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
            // Single column, right-anchored (2×4 collapses to 2×2 width here since
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
      // while magnifying — growth is painted by the fixed overlay), so the add
      // button and scroll height stay fixed at the resting grid.
      const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      // Add button placement, shared by the static deck and the focus overlay.
// Rows are right-anchored, so the leftover cell(s) of a short last row sit at
// the row's LEFT edge. The button parks in that gap ONLY when the STATIC gap
// is actually wide enough (leftGap >= side) — the fit decision must not
// flip under magnification (a focused row's wider cards would shrink the gap
// below `side` and jump the button to the deck bottom-right mid-hover).
// Placement itself rides the passed `layout` (static or scaled), so while
// hovering the button stays in its gap slot, gliding with the row.
// The leftmost placed card, not the last item, anchors the gap — the old code
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
      // The add button participates in the magnification wave like a card — and its
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
              React.createElement(CardBody, { out: it.out, unit: side, width: c.w, onAction: handleAction }),
              React.createElement('span', { className: 'dsx-stats-resize', 'aria-label': '调整大小', onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = side; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
            )
          }),
          // Bottom add button, parked inside the deck so it shares the grid
          // layout: fills the empty last-row cell on odd counts, or sits
          // right-aligned below the rows on even counts / single column.
          React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': '添加组件', onClick: () => setAddOpen((v) => !v), style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px`, opacity: magnifying ? 0 : 1, transition: 'opacity 0.15s ease' } },
            React.createElement('span', { className: 'dsx-stats-add-icon' },
              React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
            ),
            React.createElement('span', { className: 'dsx-stats-add-label' }, '添加'),
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
      // card is magnifying it paints the live reflow here — its leftward growth
      // is visible over the conversation edge instead of being cut off at the
      // rail's left boundary, and the rail width (hence the conversation column)
      // never changes. It is pointer-events:none (interaction stays on the rail)
      // and tracks the rail's scroll via --dsx-rail-scroll so it stays pinned to
      // the scrolled deck. zIndex 25 keeps it above the rail's own cards.
      // ALWAYS mounted: entering/exiting updates only scale, and the CSS
      // width/height transition below animates the growth/shrink smoothly
      // (mounting at the target size would pop). Opacity hides it while rest.
      // Positions (top/right) are INSTANT always — right-anchored geometry
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
          // Positions (top/right) are INSTANT always — right-anchored geometry
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
              React.createElement(CardBody, { out: it.out, unit: side * c.s, width: c.w, onAction: undefined }),
            )
          }),
          // Mirror the add button at its WAVE position (focusedAdd), scaled by
          // its own wave factor — it displaces with the magnified deck like a
          // card, and its size follows the same bell curve.
          React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': '添加组件', tabIndex: -1, style: { position: 'absolute', top: `${focusedAdd.top.toFixed(2)}px`, right: `${focusedAdd.right.toFixed(2)}px`, width: `${(side * addScale).toFixed(2)}px`, height: `${(side * addScale).toFixed(2)}px`, borderRadius: `${Math.round(addRadius * addScale)}px`, transition: overlayTransition, zIndex: 30 } },
              React.createElement('span', { className: 'dsx-stats-add-icon' },
                React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
              ),
              React.createElement('span', { className: 'dsx-stats-add-label' }, '添加'),
            ),
          ),
        )
      // Temporary right-side add panel: reuses the settings 组件市场 + 拖动排序
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
        React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': '调整宽度', onPointerDown: startResize }),
        React.createElement('div', { className: 'dsx-stats-addpanel-header' },
          React.createElement('div', { className: 'dsx-stats-addpanel-title' }, '添加组件'),
          React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': '关闭', onClick: () => setAddOpen(false) }, closeIcon),
        ),
        React.createElement('div', { className: 'dsx-stats-addpanel-body' },
          React.createElement(WidgetsPage, { controller: { prefs, setPrefs }, hideHeader: true }),
        ),
      )
      // Always render the panel too so closing slides it out (`.open` toggles
      // visibility/transform); when closed it is hidden (visibility + opacity)
      // and never intercepts pointer events over the rail.
      return React.createElement(React.Fragment, null, rail, magnifyLayer, addPanel)
    },
  ))

  // ---- Settings section ("组件" page). ----
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'widgets', order: 30, label: '组件' },
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
