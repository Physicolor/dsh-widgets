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
import { ALL_IDS, DEFAULT_INSTALLED, WIDGETS, type UsageData } from './widgets'
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
 *  as columns (~13 wide). `position` chooses where the current week (today's
 *  Sunday) sits within the column range: 'center' puts today's week mid-grid
 *  (pivot to a calendar-aligned 3-month look), 'right' pins today to the last
 *  column (classic rolling "last 13 weeks" window), 'left' anchors it to the
 *  left edge. Columns ahead of today render empty (value 0), shown faint. */
function buildHeatmapGrid(m: Record<string, number>, position: 'left' | 'center' | 'right' = 'center'): Array<Array<{ value: number; date: string }>> {
  const weeks = 13
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()) // this week's Sunday
  // anchorCol = the column that today's week occupies. Base = Sunday `anchorCol`
  // weeks back; cell (r,c) = base + c*7 + r.
  const anchorCol = position === 'right' ? weeks - 1 : position === 'left' ? 1 : Math.floor(weeks / 2)
  const base = new Date(startOfWeek)
  base.setDate(base.getDate() - anchorCol * 7)
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

/** Backfill the known past usage days (8/14 0.42, 8/15 2.82, 8/16 0.83 USD)
 *  with their relative amount values — the heatmap normalizes by max, so these
 *  keep their true proportions (8/15 deepest, then 8/16, then 8/14). Real-time
 *  token usage continues to accumulate on top from today onward. */
const SEED_DAY = 'harness-widgets.heatmap.seeded'
function seedHeatmapIfNeeded(): Record<string, number> {
  const m = loadHeatmap()
  try {
    if (localStorage.getItem(SEED_DAY)) return m
    const seeds: Record<string, number> = { '2026-08-14': 0.42, '2026-08-15': 2.82, '2026-08-16': 0.83 }
    const next = { ...m }
    for (const [k, v] of Object.entries(seeds)) { if (!(k in next)) next[k] = v }
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


const DEFAULTS: Prefs = {
  panelPadding: 24,
  cardSide: 150,
  installed: DEFAULT_INSTALLED.slice(),
  order: ALL_IDS.slice(),
  apiKey: '',
  railOpen: false,
  realTime: false,
  magnify: 1.2,
  panelWidth: 500,
  cardConfigs: {},
  maxWidgets: 10,
}

/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

function loadState(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_IDS.slice() }
    const p = JSON.parse(raw) as Partial<Prefs>
    const s = { ...DEFAULTS, ...p }
    if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding
    if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide
    if (!Array.isArray(s.installed)) s.installed = DEFAULT_INSTALLED.slice()
    // Respect the user's installed set exactly — do NOT force-append built-ins
    // back on every load (that kept overflowing the max-widgets cap after the
    // user uninstalled system widgets). Only the first-run path seeds defaults.
    s.installed = s.installed.filter((id) => ALL_IDS.indexOf(id) !== -1)
    if (!Array.isArray(s.order)) s.order = ALL_IDS.slice()
    s.order = s.order.filter((id) => ALL_IDS.indexOf(id) !== -1)
    for (const id of ALL_IDS) if (s.order.indexOf(id) === -1) s.order.push(id)
    if (typeof s.apiKey !== 'string') s.apiKey = ''
    if (typeof s.railOpen !== 'boolean') s.railOpen = DEFAULTS.railOpen
    if (typeof s.realTime !== 'boolean') s.realTime = DEFAULTS.realTime
    if (!Number.isFinite(s.magnify) || s.magnify < 1 || s.magnify > 2) s.magnify = DEFAULTS.magnify
    if (!Number.isFinite(s.panelWidth) || s.panelWidth < 260 || s.panelWidth > 760) s.panelWidth = DEFAULTS.panelWidth
    if (typeof s.cardConfigs !== 'object' || s.cardConfigs === null || Array.isArray(s.cardConfigs)) s.cardConfigs = {}
    if (!Number.isFinite(s.maxWidgets) || s.maxWidgets < 1 || s.maxWidgets > 20) s.maxWidgets = DEFAULTS.maxWidgets
    return s
  } catch {
    return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_IDS.slice() }
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
      const lastTotalRef = React.useRef<number>(0)
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
        if (usage && inputTokens + outputTokens > lastTotalRef.current) {
          const delta = (inputTokens + outputTokens) - lastTotalRef.current
          lastTotalRef.current = inputTokens + outputTokens
          const key = dateKey(new Date())
          heatmapRef.current = accumulateHeatmap(heatmapRef.current, key, delta)
          setHeatmap(heatmapRef.current)
        } else if (lastTotalRef.current === 0 && usage && inputTokens + outputTokens > 0) {
          lastTotalRef.current = inputTokens + outputTokens
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
          heatmapGrid: buildHeatmapGrid(heatmapRef.current, (prefs.cardConfigs?.heatmap?.monthAlign as 'left' | 'center' | 'right') || 'center'),
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, timeline, runningCalls, now, prefs.cardConfigs?.heatmap?.monthAlign])
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
      //  - realtime: focusY continuously driven by the pointer Y (rAF-throttled),
      //    reflowing every animation frame for a fully跟手 wave (slightly heavier).
      const [focusIdx, setFocusIdx] = React.useState<number | null>(null)
      const [focusY, setFocusY] = React.useState<number | null>(null)
      // Last pointer Y in rail-content coordinates (clientY - railTop - 2 +
      // scrollTop), kept so a rail scroll (which moves cards but not the mouse)
      // re-targets the peak correctly.
      const lastClientYRef = React.useRef<number | null>(null)
      const contentYRef = React.useRef<number | null>(null)
      const yRaf = React.useRef(0)
      const moveRailFocusY = (clientY: number, el: HTMLDivElement): void => {
        lastClientYRef.current = clientY
        const contentY = clientY - el.getBoundingClientRect().top - 2 + el.scrollTop
        if (yRaf.current) { contentYRef.current = contentY; return }
        contentYRef.current = contentY
        yRaf.current = requestAnimationFrame(() => { yRaf.current = 0; setFocusY(contentYRef.current) })
      }
      // Re-target the peak when the rail scrolls without the pointer moving.
      const railScrollSync = (el: HTMLDivElement): void => {
        if (lastClientYRef.current === null || !prefs.realTime) return
        moveRailFocusY(lastClientYRef.current, el)
      }
      React.useEffect(() => {
        return () => { if (yRaf.current) cancelAnimationFrame(yRaf.current) }
      }, [])
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) { setAddOpen(false); setFocusIdx(null); setFocusY(null) }
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
      const railW = side + pad * 2 + overshoot
      document.documentElement.style.setProperty('--dsx-rail-w', `${railW}px`)
      document.documentElement.style.setProperty('--dsx-rail-pad', `${pad}px`)
      document.documentElement.style.setProperty('--dsx-rail-overshoot', `${overshoot}px`)
      const base = snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }
      const widgets = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
      const items = widgets
        .map((id) => { const w = WIDGETS.find((x) => x.id === id); return w ? { w, out: w.render({ ...base, usageData: snap.usageData, armedAction, ...(prefs.cardConfigs?.[id] ?? {}) } as Parameters<typeof w.render>[0]) } : null })
        .filter((it): it is { w: (typeof WIDGETS)[number]; out: NonNullable<ReturnType<(typeof WIDGETS)[number]['render']>> } => it !== null && it.out != null)
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
      // Discrete falling bell, scaled relative to the peak so the curve keeps
      // its shape at any configured magnification. d0 = peak (hovered, hard
      // max), d1/d2 fall off fast, d>=3 not magnified.
      const stepScale = (d: number): number => {
        const extra = peakScale - 1
        const dd = Math.round(d)
        if (dd <= 0) return peakScale
        if (dd === 1) return 1 + extra * 0.55     // one away: clearly smaller
        if (dd === 2) return 1 + extra * 0.25     // two away: just a touch
        return 1                                  // three+ away: not magnified
      }
      const active = prefs.realTime
      const layoutCards: Array<{ s: number; top: number; w: number }> = []
      {
        const n = items.length
        const hasFocus = active ? focusY !== null : focusIdx !== null
        // Determine the anchored (peak) card index.
        let anchor = -1
        if (hasFocus) {
          if (active) {
            // nearest card to the pointer's rest-center = the peak, always.
            const mY = focusY as number
            let best = 0, bestD = Number.POSITIVE_INFINITY
            for (let i = 0; i < n; i++) {
              const dd = Math.abs(mY - restCenter(i))
              if (dd < bestD) { bestD = dd; best = i }
            }
            anchor = best
          } else {
            anchor = Math.max(0, Math.min(focusIdx as number, n - 1))
          }
        }
        const scaleArr = new Array(n).fill(1)
        if (anchor >= 0) {
          for (let i = 0; i < n; i++) scaleArr[i] = stepScale(Math.abs(i - anchor))
        }
        if (n > 0) {
          // Layout make-room: each card's height = side*scale participates in the
          // column, so neighbours are pushed apart by exactly `pad` plus the
          // scaled height — spacing stays constant, no overlap.
          const hgt = scaleArr.map((s) => side * s)
          let acc = 2
          for (let i = 0; i < n; i++) { layoutCards.push({ s: scaleArr[i], top: acc, w: hgt[i] }); acc += hgt[i] + pad }
        }
      }
      // deck total height (base slots + room for the peak card's growth).
      const stackHeight = items.length > 0 ? 2 + items.length * (side + pad) + (peakScale - 1) * side : 0
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
            const transition = active ? 'top 0.04s linear, width 0.04s linear, height 0.04s linear' : 'top 0.2s var(--ds-ease-in-out), width 0.2s var(--ds-ease-in-out), height 0.2s var(--ds-ease-in-out)'
            return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: { position: 'absolute', top: `${c.top.toFixed(2)}px`, right: 0, width: `${c.w.toFixed(2)}px`, height: `${c.w.toFixed(2)}px`, transition, zIndex: Math.round((c.s - 1) * 100) }, onMouseEnter: () => setFocusIdx(idx) },
              React.createElement(CardBody, { out: it.out, side: c.w, onAction: handleAction }),
              React.createElement('span', { className: 'dsx-stats-resize', 'aria-label': '调整大小', onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = side; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
            )
          }),
        ),
        // Bottom add button: same rounded-rect geometry as a card, + icon + "添加".
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': '添加组件', onClick: () => setAddOpen((v) => !v), style: { marginTop: `${pad}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } },
          React.createElement('span', { className: 'dsx-stats-add-icon' },
            React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
          ),
          React.createElement('span', { className: 'dsx-stats-add-label' }, '添加'),
        ),
      ]
      const rail = React.createElement('div', {
        className: 'dsx-stats-rail', style: { position: 'fixed', top: 'var(--dsx-rail-top,0px)', right: 'var(--dsh-sidebar-width, 0px)', bottom: 0, width: `${railW}px`, overflowY: 'auto', overflowX: 'visible', boxSizing: 'border-box', padding: `2px ${pad}px ${pad}px ${pad + overshoot}px`, background: 'transparent', pointerEvents: 'auto' },
        onMouseLeave: () => { setFocusIdx(null); setFocusY(null) },
        onMouseMove: prefs.realTime ? (e: React.MouseEvent<HTMLDivElement>) => moveRailFocusY(e.clientY, e.currentTarget) : undefined,
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
