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
import { CardBody, SettingsPanel, WidgetsPage, type Prefs } from './components'

const STORAGE_KEY = 'harness-widgets.state'
const BASE_SIDE = 150

const DEFAULTS: Prefs = {
  panelPadding: 24,
  cardSide: 150,
  installed: DEFAULT_INSTALLED.slice(),
  order: ALL_IDS.slice(),
  apiKey: '',
  railOpen: false,
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
    s.installed = s.installed.filter((id) => ALL_IDS.indexOf(id) !== -1)
    for (const id of DEFAULT_INSTALLED) if (s.installed.indexOf(id) === -1) s.installed.push(id)
    if (!Array.isArray(s.order)) s.order = ALL_IDS.slice()
    s.order = s.order.filter((id) => ALL_IDS.indexOf(id) !== -1)
    for (const id of ALL_IDS) if (s.order.indexOf(id) === -1) s.order.push(id)
    if (typeof s.apiKey !== 'string') s.apiKey = ''
    if (typeof s.railOpen !== 'boolean') s.railOpen = DEFAULTS.railOpen
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

  // ---- Rail-top measurement (rail starts under the session header). ----
  let raf = 0
  function measureRailTop(): void {
    const el = document.querySelector('[data-conversation-scroll]')
    const top = el ? el.getBoundingClientRect().top : 0
    document.documentElement.style.setProperty('--dsx-rail-top', `${top}px`)
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
    }
    const sub = subscribe(scheduleMeasure)
    return () => {
      window.removeEventListener('resize', scheduleMeasure)
      if (ro) ro.disconnect()
      sub()
      document.documentElement.style.removeProperty('--dsx-rail-top')
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
        const stats: Stats = {
          turns: folded.turns, steps: folded.steps,
          llmMs, toolMs,
          ttftMs: folded.ttftMs, ttftSteps: folded.ttftSteps,
          decodeMs: folded.decodeMs, decodeTokens: folded.decodeTokens,
          usage: { inputTokens, cacheReadTokens: cacheRead, outputTokens },
        }
        setState({ stats })
      }, [settled, projected, usage, timeline, runningCalls, now])
      return null
    },
  ))

  // ---- Right rail panel. ----
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'widgets-panel', order: 1000 },
    () => {
      const snap = useBridge()
      if (!snap.open || !snap.hasSession) return null
      const side = prefs.cardSide
      const pad = prefs.panelPadding
      const railW = side + pad * 2
      document.documentElement.style.setProperty('--dsx-rail-w', `${railW}px`)
      const base = snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }
      const widgets = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
      const items = widgets
        .map((id) => { const w = WIDGETS.find((x) => x.id === id); return w ? { w, out: w.render({ ...base, usageData: snap.usageData }) } : null })
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
      return React.createElement('div', { className: 'dsx-stats-rail', style: { position: 'fixed', top: 'var(--dsx-rail-top,0px)', right: 'var(--dsh-sidebar-width, 0px)', bottom: 0, width: `${railW}px`, overflowY: 'auto', boxSizing: 'border-box', padding: `${pad}px`, background: 'transparent', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: `${pad}px` } },
        items.map((it) => React.createElement('div', { key: it.w.id, style: { position: 'relative', flex: 'none' } },
          React.createElement(CardBody, { out: it.out, side }),
          React.createElement('span', { className: 'dsx-stats-resize', 'aria-label': '调整大小', onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = side; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
        )),
      )
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

  // ---- General settings rows (padding + card side). ----
  ctx.slots.inject('settings.general.item', () => ctx.slots.register(
    { name: 'settings.general.item', id: 'widgets-rail-settings', order: 40 },
    () => {
      const snap = useBridge()
      return React.createElement(SettingsPanel, { controller: { prefs: snap.prefs, setPrefs } })
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
