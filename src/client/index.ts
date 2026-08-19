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
function dateKey(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
/** Build a horizontal (GitHub-style) heatmap grid: 7 rows (Sun..Sat) × weeks
 *  as columns (~13 wide). Two window-alignment modes:
 *   - 'rolling' : classic rolling window — the last 13 weeks ending today,
 *     so today is always pinned to the right edge (future is unknowable).
 *   - 'quarter' : align to the current calendar quarter (1–3, 4–6, 7–9,
 *     10–12月) that contains today; today then lands wherever it naturally
 *     falls within the quarter (e.g. mid-quarter dates sit toward the middle).
 *  Future columns render empty (value 0), shown faint. */
function buildHeatmapGrid(m: Record<string, number>, mode: 'rolling' | 'quarter' = 'rolling'): Array<Array<{ value: number; date: string }>> {
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
      const k = dateKey(d)
      row.push({ value: m[k] ?? 0, date: k })
    }
    grid.push(row)
  }
  return grid
}

/** Backfill the three real usage days with their actual cumulative values:
 *    8/14 =   244,188,000  (7.6% of total)
 *    8/15 = 1,639,548,000  (51.2%)
 *    8/16 = 1,319,264,000  (41.2%)
 *  Total = 3,203,000,000 (3203M). Values stored in raw tokens so the legend
 *  reads "今日 1319M  3203M". Colors normalize by max (8/15 deepest, then
 *  8/16, then 8/14). Real-time usage keeps accumulating on today. */
const SEED_DAY = 'harness-widgets.heatmap.seeded.4' // bump to force re-seed on upgrade
function seedHeatmapIfNeeded(): Record<string, number> {
  const m = loadHeatmap()
  try {
    if (localStorage.getItem(SEED_DAY)) return m
    const seeds: Record<string, number> = {
      '2026-08-14': 244_188_000,
      '2026-08-15': 1_639_548_000,
      '2026-08-16': 1_319_264_000,
    }
    const next = { ...m }
    // Force-overwrite these exact dates: on an upgrade re-seed any OLD keys from
    // a previous seed version must be replaced to correct the values.
    for (const [k, v] of Object.entries(seeds)) next[k] = v
    saveHeatmap(next)
    localStorage.setItem(SEED_DAY, '1')
    return next
  } catch { return m }
}

/** Add newly observed tokens to today; returns the running grid for the card. */
function accumulateHeatmap(m: Record<string, number>, dayKey: string, delta: number): Record<string, number> {
  if (delta <= 0) return m
  const next = { ...m, [dayKey]: (m[dayKey] ?? 0) + delta }
  saveHeatmap(next)
  return next
}

// The cumulative session-token baseline already accounted for in the heatmap,
// paired with a date key so it resets automatically on a new day. Without the
// date, a huge yesterday-baseline (e.g. 3000M) persists and today's fresh
// session (200M) never exceeds it → delta is always 0 → today's cell barely
// grows. With the date, baseline resets to 0 each morning so every new session
// starts accumulating correctly from scratch.
const HEATMAP_BASELINE = 'harness-widgets.heatmap.baseline'
const HEATMAP_BASELINE_DATE = 'harness-widgets.heatmap.baseline-date'
function loadHeatmapBaseline(): { total: number; date: string } {
  try {
    const date = localStorage.getItem(HEATMAP_BASELINE_DATE) ?? ''
    const today = dateKey(new Date())
    if (date !== today) return { total: 0, date: today } // new day → reset
    const n = +(localStorage.getItem(HEATMAP_BASELINE) ?? '')
    return { total: Number.isFinite(n) && n > 0 ? n : 0, date: today }
  } catch { return { total: 0, date: dateKey(new Date()) } }
}
function saveHeatmapBaseline(n: number): void {
  try {
    localStorage.setItem(HEATMAP_BASELINE, String(n))
    localStorage.setItem(HEATMAP_BASELINE_DATE, dateKey(new Date()))
  } catch { /* storage unavailable */ }
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
}

/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

function loadState(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
    const p = JSON.parse(raw) as Partial<Prefs>
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
    return s
  } catch {
    return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
  }
}

function saveState(s: Prefs): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
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
  let prefs = loadState()
  let state = { open: prefs.railOpen, hasSession: false, stats: null as Stats | null, usageData: null as UsageData | null }

  const listeners = new Set<() => void>()
  function emit(): void { for (const fn of listeners) fn() }
  function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
  function setState(patch: Partial<typeof state>): void { state = { ...state, ...patch }; emit() }
  function setPrefs(patch: Partial<Prefs>): void { prefs = { ...prefs, ...patch }; saveState(prefs); emit() }
  function useBridge(): { open: boolean; hasSession: boolean; stats: Stats | null; usageData: UsageData | null; prefs: Prefs } {
    const [snap, setSnap] = React.useState({ ...state, prefs: { ...prefs } })
    React.useEffect(() => subscribe(() => setSnap({ ...state, prefs: { ...prefs } })), [])
    return snap
  }
  ctx.effect(() => () => { listeners.clear() })

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
    document.documentElement.style.setProperty('--dsx-rail-top', `${top}px`)
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
      // Heatmap self-accounting: track the last-observed token total so each
      // change's delta lands on "today", persisted to localStorage.
      const heatmapRef = React.useRef<Record<string, number>>(seedHeatmapIfNeeded())
      // Restore the already-accounted baseline so a remount re-adds only the NEW
      // tokens, not the whole cumulative total (which previously inflated today's
      // cell every time the dock remounted). The baseline resets to 0 on a new
      // day so each day's accumulation starts fresh.
      const baselineInit = loadHeatmapBaseline()
      const lastTotalRef = React.useRef<number>(baselineInit.total)
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
        // Accumulate the new token volume into today's heatmap cell (once per
        // observed increase), so the "token usage heatmap" grows over time.
        // Reset baseline on day boundary so today starts fresh from 0.
        const todayKey = dateKey(new Date())
        const baselineDate = localStorage.getItem(HEATMAP_BASELINE_DATE) ?? ''
        if (baselineDate !== todayKey) {
          lastTotalRef.current = 0
          saveHeatmapBaseline(0)
        }
        if (usage && inputTokens + outputTokens > lastTotalRef.current) {
          const delta = (inputTokens + outputTokens) - lastTotalRef.current
          lastTotalRef.current = inputTokens + outputTokens
          saveHeatmapBaseline(lastTotalRef.current)
          const key = dateKey(new Date())
          heatmapRef.current = accumulateHeatmap(heatmapRef.current, key, delta)
          setHeatmap(heatmapRef.current)
        } else if (lastTotalRef.current === 0 && usage && inputTokens + outputTokens > 0) {
          lastTotalRef.current = inputTokens + outputTokens
          saveHeatmapBaseline(lastTotalRef.current)
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
          heatmapGrid: buildHeatmapGrid(heatmapRef.current, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling'),
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, timeline, runningCalls, now, prefs.cardConfigs?.heatmap?.monthMode])
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
      // Two magnification triggers, chosen by prefs.realTime:
      //  - discrete: focusIdx set on card mouseenter, ONE reflow per entry, the
      //    CSS top/width/height transition animates it (cheap, no per-frame work).
      //  - realtime: focus driven by the pointer's 2D position (rAF-throttled),
      //    reflowing every animation frame for a fully跟随手 wave. Both X and Y
      //    are tracked so the peak follows the cursor in the plane, not just a row.
      const [focusIdx, setFocusIdx] = React.useState<number | null>(null)
      const [focusY, setFocusY] = React.useState<number | null>(null)
      const [focusX, setFocusX] = React.useState<number | null>(null)
      // Last pointer position in rail-content coordinates, kept so a rail scroll
      // (which moves cards but not the mouse) re-targets the peak correctly.
      const lastClientXYRef = React.useRef<{ x: number; y: number } | null>(null)
      const contentYRef = React.useRef<number | null>(null)
      const contentXRef = React.useRef<number | null>(null)
      const rafRef = React.useRef(0)
      const railRectRef = React.useRef<DOMRect | null>(null)
      const moveRailFocus = (clientX: number, clientY: number, el: HTMLDivElement): void => {
        lastClientXYRef.current = { x: clientX, y: clientY }
        const rect = el.getBoundingClientRect()
        railRectRef.current = rect
        const contentX = clientX - rect.left
        const contentY = clientY - rect.top - 2 + el.scrollTop
        contentXRef.current = contentX
        contentYRef.current = contentY
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0
          setFocusX(contentXRef.current)
          setFocusY(contentYRef.current)
        })
      }
      // Re-target the peak when the rail scrolls without the pointer moving.
      const railScrollSync = (el: HTMLDivElement): void => {
        if (lastClientXYRef.current === null || !prefs.realTime) return
        moveRailFocus(lastClientXYRef.current.x, lastClientXYRef.current.y, el)
      }
      React.useEffect(() => {
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
      }, [])
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) { setAddOpen(false); setFocusIdx(null); setFocusY(null); setFocusX(null) }
      }, [snap.open, snap.hasSession])
      if (!snap.open || !snap.hasSession) return null
      const side = prefs.cardSide
      const pad = prefs.panelPadding
      // Left room for the bell-curve magnification overshoot so the magnified
      // card's left growth is NOT clipped by the rail's scroll edge. The rail's
      // right padding stays `pad`; the left gets `pad + overshoot`. The reserved
      // gutter (--dsx-rail-w) grows by `overshoot` so the conversation does not
      // get covered — the rail simply claims a touch more of its own gutter on
      // the left. Peak magnification is `magnify` → card grows left by
      // (magnify-1)·side; use whatever exceeds the existing left padding, plus a
      // small buffer.
      const overshoot = Math.max(0, Math.ceil(side * (prefs.magnify - 1) - pad)) + 4
      const columns = [1, 2, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
      const multi = columns > 1
      // Multi-column rail width is sized for the PEAK card (so a magnified row,
      // which extends left from the right-anchored edge, never clips at the rail's
      // left boundary). Single column keeps its original width.
      const peakCard = Math.ceil(side * prefs.magnify)
      const railW = (multi ? columns * peakCard + (columns + 1) * pad + overshoot : side + pad * 2 + overshoot)
      document.documentElement.style.setProperty('--dsx-rail-w', `${railW}px`)
      document.documentElement.style.setProperty('--dsx-rail-pad', `${pad}px`)
      document.documentElement.style.setProperty('--dsx-rail-overshoot', `${overshoot}px`)
      const base = snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }
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
      const layoutCards: Array<{ s: number; top: number; right: number; w: number; h: number }> = []
      const rowIndexOf: number[] = []
      const colIndexOf: number[] = []
      {
        const n = items.length
        // --- assign cards to rows (P2 packing, no gaps) ---
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
        const rows = (multi ? (n > 0 ? rowIndexOf[n - 1] + 1 : 0) : n)
        // --- magnification distance field + scale ---
        const hasFocus = active ? (multi ? (focusY !== null && focusX !== null) : focusY !== null) : focusIdx !== null
        let anchor = -1
        if (hasFocus) {
          if (active) {
            if (multi) {
              // 2D nearest card to the pointer: the anchor is the card whose rest
              // cell CENTRE (X and Y, both tracked) is closest to the cursor, so
              // the peak follows in the plane and rows above/below respond too.
              const cellW = side + pad
              const rowH = side + pad
              const cx2 = (i: number): number => (colIndexOf[i] + spanOf(i) / 2) * cellW
              const cy2 = (i: number): number => rowIndexOf[i] * rowH + side / 2
              const fx = focusX as number
              const fy = focusY as number
              let best = 0, bestD = Number.POSITIVE_INFINITY
              for (let i = 0; i < n; i++) {
                const dd = Math.hypot(cx2(i) - fx, cy2(i) - fy)
                if (dd < bestD) { bestD = dd; best = i }
              }
              anchor = best
            } else {
              const mY = focusY as number
              let best = 0, bestD = Number.POSITIVE_INFINITY
              for (let i = 0; i < n; i++) {
                const dd0 = Math.abs(mY - restCenter(i))
                if (dd0 < bestD) { bestD = dd0; best = i }
              }
              anchor = best
            }
          } else {
            anchor = Math.max(0, Math.min(focusIdx as number, n - 1))
          }
        }
        const scaleArr = new Array(n).fill(1)
        if (anchor >= 0) {
          if (multi) {
            // 2D distance between rest cell CENTERS. X uses each card's cell
            // centre (its left cell for a 2×4), Y uses its row centre.
            const cellW = side + pad
            const rowH = side + pad
            const cx = (i: number): number => (colIndexOf[i] + spanOf(i) / 2) * cellW
            const cy = (i: number): number => rowIndexOf[i] * rowH + side / 2
            const axc = cx(anchor)
            const ayc = cy(anchor)
            for (let i = 0; i < n; i++) {
              const steps = Math.hypot(cx(i) - axc, cy(i) - ayc) / (side + pad)
              scaleArr[i] = stepScale(steps)
            }
          } else {
            for (let i = 0; i < n; i++) scaleArr[i] = stepScale(Math.abs(i - anchor))
          }
        }
        // --- build actual reflow (right-edge anchored) ---
        if (n > 0) {
          if (multi) {
            // Each row: right-anchored, right-to-left. Cards at their scaled
            // width; a 2×4 is wider and pushes neighbours further left. Row top
            // accumulates by the tallest scaled height in the row (+ pad), so a
            // magnified row pushes rows below it down. Spacing stays exactly pad.
            const place: Array<{ s: number; top: number; right: number; w: number; h: number }> = new Array(n)
            const rowTopAcc: number[] = new Array(rows).fill(0)
            const rowHAcc: number[] = new Array(rows).fill(0)
            // Every card is one grid-unit tall (2×2 and 2×4 share the same height =
            // side × scale); only the width differs (2×4 is two units plus the gap).
            for (let i = 0; i < n; i++) { const r = rowIndexOf[i]; const h = side * scaleArr[i]; if (h > rowHAcc[r]) rowHAcc[r] = h }
            {
              let acc = 2
              for (let r = 0; r < rows; r++) { rowTopAcc[r] = acc; acc += rowHAcc[r] + pad }
            }
            // Within each row, place right-to-left: rightmost (highest cell) card
            // at right:0, each next card pushed left by (prev width + pad).
            for (let r = rows - 1; r >= 0; r--) {
              // build list of indices in this row, sort by cell DESC (right first)
              const inRow: number[] = []
              for (let i = 0; i < n; i++) if (rowIndexOf[i] === r) inRow.push(i)
              inRow.sort((a, b) => colIndexOf[b] - colIndexOf[a])
              let colRight = 0
              for (const i of inRow) {
                const w = baseWOf(i) * scaleArr[i]
                place[i] = { s: scaleArr[i], top: rowTopAcc[r], right: colRight, w, h: side * scaleArr[i] }
                colRight += w + pad
              }
            }
            for (let i = 0; i < n; i++) layoutCards.push(place[i])
          } else {
            // Single column, right-anchored (2×4 collapses to 2×2 width here since
            // a single column has no room for a two-cell-wide card).
            const hgt = scaleArr.map((s, i) => side * s)
            let acc = 2
            for (let i = 0; i < n; i++) { layoutCards.push({ s: scaleArr[i], top: acc, right: 0, w: hgt[i], h: hgt[i] }); acc += hgt[i] + pad }
          }
        }
      }
      // Deck height is the LIVE bottom of the reflow (not a fixed peak): it grows
      // while cards magnify and shrinks back when they settle, so the add button
      // below the deck returns to its rest position instead of staying pushed far
      // down.
      const deckBottom = layoutCards.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      // Add button placement:
      //  - multi + odd count: the last row is one short, so park the add button in
      //    that empty cell. Right-anchored rows leave the gap on the LEFT of the
      //    sole card, so the button sits just left of it on the same row.
      //  - otherwise: sit the add button at the deck's bottom, right-aligned.
      const nItems = items.length
      let addTop: number
      let addRight: number
      if (multi && nItems > 0 && layoutCards.length > 0) {
        // Row-band packing may leave a gap in the LAST row (e.g. an odd 2×2
        // count, or a 2×4 creating a leftover cell). If a 2×2 add button fits in
        // that leftover cell, park it there (right-anchored: its right edge sits
        // just left of the row's already-placed cards); otherwise sit it below
        // the deck, right-aligned.
        const lastRow = rowIndexOf[nItems - 1]
        const lastRowUsedCells = colIndexOf[nItems - 1] + spanOf(nItems - 1)
        if (lastRowUsedCells < columns) {
          const lastCard = layoutCards[nItems - 1]
          addTop = lastCard.top
          addRight = lastCard.right + lastCard.w + pad
        } else {
          addTop = (nItems > 0 ? deckBottom : 2) + pad
          addRight = 0
        }
      } else {
        addTop = (nItems > 0 ? deckBottom : 2) + pad
        addRight = 0
      }
      // Deck height covers the live reflow bottom AND the add button (when it
      // hangs below the deck), so neither ever clips or pushes unexpectedly.
      const addBottom = addTop + side
      const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad
      const railChildren: React.ReactNode[] = [
        // Relative-positioned layer that owns the cards' absolute layout.
        React.createElement('div', { key: '__deck', style: { position: 'relative', height: `${stackHeight}px` } },
          layoutCards.map((c, idx) => {
            const it = items[idx]
            // Layout sizing (authoritative macOS Dock approach): width/height and
            // top participate in layout, so neighbours make room automatically and
            // spacing stays constant; right edge stays pinned via right:0. No
            // transform — this is why the right edge never jitters. Realtime uses
            // a near-instant transition, discrete a smooth one.
            const transition = active ? 'top 0.04s linear, right 0.04s linear, width 0.04s linear, height 0.04s linear' : 'top 0.2s var(--ds-ease-in-out), right 0.2s var(--ds-ease-in-out), width 0.2s var(--ds-ease-in-out), height 0.2s var(--ds-ease-in-out)'
            const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px`, transition, zIndex: Math.round((c.s - 1) * 100) }
            return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle, onMouseEnter: () => setFocusIdx(idx) },
              React.createElement(CardBody, { out: it.out, unit: side * c.s, width: c.w, onAction: handleAction }),
              React.createElement('span', { className: 'dsx-stats-resize', 'aria-label': '调整大小', onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = side; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
            )
          }),
          // Bottom add button, parked inside the deck so it shares the grid
          // layout: fills the empty last-row cell on odd counts, or sits
          // right-aligned below the rows on even counts / single column.
          React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': '添加组件', onClick: () => setAddOpen((v) => !v), style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } },
            React.createElement('span', { className: 'dsx-stats-add-icon' },
              React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
            ),
            React.createElement('span', { className: 'dsx-stats-add-label' }, '添加'),
          ),
        ),
      ]
      const rail = React.createElement('div', {
        className: 'dsx-stats-rail', style: { position: 'fixed', top: 'var(--dsx-rail-top,0px)', right: 'var(--dsh-sidebar-width, 0px)', bottom: 0, width: `${railW}px`, overflowY: 'auto', overflowX: 'visible', boxSizing: 'border-box', padding: `2px ${pad}px ${pad}px ${pad + overshoot}px`, background: 'transparent', pointerEvents: 'auto' },
        onMouseLeave: () => { setFocusIdx(null); setFocusY(null); setFocusX(null) },
        onMouseMove: prefs.realTime ? (e: React.MouseEvent<HTMLDivElement>) => moveRailFocus(e.clientX, e.clientY, e.currentTarget) : undefined,
        onScroll: prefs.realTime ? (e: React.UIEvent<HTMLDivElement>) => railScrollSync(e.currentTarget) : undefined,
      }, railChildren)
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
      return React.createElement(React.Fragment, null, rail, addPanel)
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
}
