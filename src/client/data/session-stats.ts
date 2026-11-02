/**
 * dsh-widgets — session-stats projection.
 *
 * Folds the live conversation (settled nodes, running tool calls, the open
 * turn/step timeline) into the window-scoped numbers the stats-line widgets
 * print, and projects the same nodes into the 轨迹 three-lane beats.
 *
 * Pure functions over host-provided shapes: no React, no DOM, no module state.
 * The dock collector calls them on every pass; everything here is deterministic
 * for a given input, which is what makes the numbers testable in isolation.
 */

import { COMPACTION_HISTORY, TRAJECTORY_WINDOW, type CompactionSummary, type GoalInfo, type JobInfo, type ModelRoute, type ModelSelectionInfo, type PermissionInfo, type SubagentEntry, type ToolCallSummary, type TrajectoryBeat } from '../lib/contract/types'

/** Session stats shape collected by the dock collector. */
export interface Stats {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null
  /** Per-request cache hit rates, oldest first, 0..1 (see deriveCacheSeries). */
  cacheSeries?: number[]
  /** One `HH:MM` mark per rate (same length); '' where the sample had no time. */
  cacheSeriesMarks?: string[]
  contextPercent?: number | null
  contextWindow?: number | null
  contextTokens?: number | null
  contextBreakdown?: { systemTokens: number; toolsTokens: number; messageTokens: number } | null
  todos?: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed' }> | null
  heatmapGrid?: Array<Array<{ value: number; date: string }>>
  heatmapRaw?: Record<string, number>
  trajectory?: TrajectoryBeat[]
  tools?: ToolCallSummary
  compactions?: CompactionSummary | null
  modelSelection?: ModelSelectionInfo | null
  agentPreset?: string | null
  goal?: GoalInfo | null
  permissions?: PermissionInfo | null
  subagents?: SubagentEntry[] | null
  jobs?: JobInfo[] | null
  /** The open turn's own elapsed ms (earliest step start → now), or null. */
  liveTurnMs?: number | null
  /** The open model step's own elapsed ms, or null when no step is in flight. */
  liveStepMs?: number | null
}

/**
 * Normalize the `modelSelection` projection into the contract's own shape.
 *
 * The projection's wire value is read defensively: a bundle whose session
 * controller is older, newer, or absent hands us anything at all, and a card
 * must never be the thing that throws inside the selector (the slot renderer
 * answers a throwing selector by abdicating the whole entry — every card's data
 * goes with it). Unknown members are DROPPED rather than passed through, so a
 * widget can trust the shape it is handed.
 *
 * @param value - the raw projection value (any).
 * @returns the normalized value, or null when there is nothing to report.
 */
export function normalizeModelSelection(value: unknown): ModelSelectionInfo | null {
  if (value === null || typeof value !== 'object') return null
  const route = (raw: unknown): ModelRoute | null => {
    if (raw === null || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>
    if (typeof r.provider !== 'string' || typeof r.model !== 'string') return null
    return {
      provider: r.provider,
      model: r.model,
      ...(typeof r.reasoningEffort === 'string' ? { reasoningEffort: r.reasoningEffort } : {}),
    }
  }
  const v = value as Record<string, unknown>
  const next = route(v.next)
  const lastUsed = route(v.lastUsed)
  if (next === null && lastUsed === null) return null
  return { next, lastUsed }
}

/** Normalize the `goal` projection; null when this session has no goal. */
export function normalizeGoal(value: unknown): GoalInfo | null {
  if (value === null || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const snap = v.goal
  if (snap === null || typeof snap !== 'object') return null
  const g = snap as Record<string, unknown>
  if (typeof g.objective !== 'string') return null
  const phase = g.phase
  if (phase !== 'active' && phase !== 'paused' && phase !== 'blocked' && phase !== 'complete') return null
  const reason = g.blockedReason
  const blockedReason = reason !== null && typeof reason === 'object' && typeof (reason as Record<string, unknown>).message === 'string'
    ? {
        code: String((reason as Record<string, unknown>).code ?? ''),
        message: String((reason as Record<string, unknown>).message),
      }
    : undefined
  return {
    objective: g.objective,
    phase,
    roundsStarted: typeof v.roundsStarted === 'number' ? v.roundsStarted : 0,
    maxGoalRounds: typeof g.maxGoalRounds === 'number' ? g.maxGoalRounds : 0,
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : 0,
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : 0,
    ...(blockedReason !== undefined ? { blockedReason } : {}),
  }
}

/** Normalize the `permissions` projection; null when no permission service is composed. */
export function normalizePermissions(value: unknown): PermissionInfo | null {
  if (value === null || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.currentValue !== 'string') return null
  const options = Array.isArray(v.options)
    ? v.options.flatMap((raw): PermissionInfo['options'] => {
        if (raw === null || typeof raw !== 'object') return []
        const o = raw as Record<string, unknown>
        if (typeof o.value !== 'string' || typeof o.name !== 'string') return []
        return [{ value: o.value, name: o.name, ...(typeof o.description === 'string' ? { description: o.description } : {}) }]
      })
    : []
  return { currentValue: v.currentValue, options }
}

/** Normalize the `subagentCatalog` projection: identity rows only, unknown
 *  members dropped. Returns null when the projection is absent (which is NOT the
 *  same statement as "no children" — that is `[]`).
 *
 *  `activeMs` is attached from the client session list when it is reachable: the
 *  parent cannot read a child's `subagentTiming` through its own projection (that
 *  key folds THIS session's log), so the duration comes from
 *  `byId[childId].projectionValues.subagentTiming` — the same detour the official
 *  subagent list takes. Absent list ⇒ the field stays absent, never 0.
 *
 *  @param value - the raw `subagentCatalog` projection value (any).
 *  @param summaryOf - lookup for one child's session-list row, or null.
 *  @param now - the wall clock the open-turn duration is measured against.
 */
export function normalizeSubagents(
  value: unknown,
  summaryOf?: ((id: string) => unknown) | null,
  now?: number,
): SubagentEntry[] | null {
  if (!Array.isArray(value)) return null
  const clock = typeof now === 'number' ? now : Date.now()
  return value.flatMap((raw): SubagentEntry[] => {
    if (raw === null || typeof raw !== 'object') return []
    const e = raw as Record<string, unknown>
    if (typeof e.id !== 'string' || typeof e.createdAt !== 'number') return []
    const mode = e.mode === 'continuable' ? 'continuable' : 'one-shot'
    const activeMs = subagentActiveMs(summaryOf?.(e.id), clock)
    return [{
      id: e.id,
      createdAt: e.createdAt,
      mode,
      ...(typeof e.label === 'string' && e.label !== '' ? { label: e.label } : {}),
      ...(activeMs === undefined ? {} : { activeMs }),
    }]
  })
}

/** The active-turn duration one child's session-list row reports, or undefined
 *  when the row (or its timing) has not landed. Never 0-by-assumption. */
function subagentActiveMs(summary: unknown, now: number): number | undefined {
  if (summary === null || typeof summary !== 'object') return undefined
  const values = (summary as Record<string, unknown>).projectionValues
  if (values === null || typeof values !== 'object') return undefined
  const timing = (values as Record<string, unknown>).subagentTiming
  if (timing === null || typeof timing !== 'object') return undefined
  const t = timing as Record<string, unknown>
  const settled = typeof t.settledMs === 'number' ? t.settledMs : 0
  const active = t.active
  if (active === null || typeof active !== 'object') return settled
  const a = active as Record<string, unknown>
  if (typeof a.since !== 'number') return settled
  const through = typeof a.through === 'number' ? a.through : now
  return settled + Math.max(0, through - a.since)
}

/** Normalize this session's `jobsBySession` entry: identity + liveness, unknown
 *  members dropped. Returns null when the list is unavailable (NOT the same
 *  statement as "no jobs" — that is `[]`). */
export function normalizeJobs(value: unknown): JobInfo[] | null {
  if (!Array.isArray(value)) return null
  const statuses = ['running', 'stopping', 'completed', 'killed', 'failed']
  return value.flatMap((raw): JobInfo[] => {
    if (raw === null || typeof raw !== 'object') return []
    const j = raw as Record<string, unknown>
    if (typeof j.id !== 'string' || typeof j.startedAt !== 'number') return []
    const status = statuses.includes(String(j.status)) ? (j.status as JobInfo['status']) : 'running'
    return [{
      id: j.id,
      kind: typeof j.kind === 'string' ? j.kind : '',
      label: typeof j.label === 'string' ? j.label : '',
      status,
      startedAt: j.startedAt,
      ...(typeof j.finishedAt === 'number' ? { finishedAt: j.finishedAt } : {}),
      ...(typeof j.detail === 'string' && j.detail !== '' ? { detail: j.detail } : {}),
    }]
  })
}

/** Coerce a possibly-undefined timestamp to a finite number (null when unusable). */
function timelineTime(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Project the live conversation into the official 轨迹 layout's three lanes:
 * 输入 (user/steering message) · 模型 (assistant step) · 工具 (tool call).
 *
 * Beats are ordered by their START time and trimmed to the newest
 * `TRAJECTORY_WINDOW`. In-flight work is included as it happens —running tool
 * calls plus open, not-yet-assembled assistant steps —which is what makes the
 * card move while the model is working instead of only after a turn settles.
 *
 * @param settled - Conversation nodes (`useChat().legacy.nodes`).
 * @param runningCalls - Live tool calls (`useChat().legacy.runningCalls`).
 * @param timeline - Turn/step timeline (open steps have no node yet).
 * @param now - performance.now() at this collection pass.
 */
export function deriveTrajectory(
  settled: ReadonlyArray<any>,
  runningCalls: ReadonlyArray<any>,
  timeline: any,
  now: number,
): TrajectoryBeat[] {
  const beats: Array<{ at: number; beat: TrajectoryBeat }> = []
  const push = (at: number | null, kind: TrajectoryBeat['kind'], ms: number): void => {
    beats.push({ at: at ?? 0, beat: { kind, ms: Math.max(0, ms) } })
  }
  for (const node of settled ?? []) {
    if (node?.kind === 'user' || node?.kind === 'steering') {
      // The input lane is instantaneous: the message's own arrival is the event.
      push(timelineTime(node.time), 'input', 0)
      continue
    }
    if (node?.kind === 'assistant') {
      const start = timelineTime(node.timing?.stepStartTime)
      const end = timelineTime(node.timing?.completedTime)
      push(start ?? timelineTime(node.time), 'model', start !== null && end !== null ? end - start : 0)
      continue
    }
    if (node?.kind === 'tool-result') {
      const start = timelineTime(node.callTime)
      const end = timelineTime(node.time)
      push(start ?? end, 'tool', start !== null && end !== null ? end - start : 0)
    }
  }
  for (const call of runningCalls ?? []) {
    const start = timelineTime(call?.time)
    if (start === null) continue
    push(start, 'tool', now - start)
  }
  if (timeline && typeof timeline.turns?.values === 'function') {
    for (const turn of timeline.turns.values()) {
      if (turn?.status !== 'open') continue
      for (const step of turn.steps ?? []) {
        if (step?.status !== 'open') continue
        const start = timelineTime(step.start?.time)
        if (start === null) continue
        // An assembled assistant node already carries this step (see the llmMs
        // accounting above) —counting both would double the beat.
        const assembled = (settled ?? []).some((n: any) =>
          n?.kind === 'assistant' && n.turn === step.turn && n.step === step.step && n.timing !== undefined)
        if (assembled) continue
        push(start, 'model', now - start)
      }
    }
  }
  beats.sort((a, b) => a.at - b.at)
  return beats.slice(-TRAJECTORY_WINDOW).map((entry) => entry.beat)
}

/**
 * Fold the conversation's tool calls into the 工具调用 card's summary.
 *
 * Why this exists: the card used to print ONE number (cumulative tool time), so a
 * slow turn could not be told apart from a hung tool. The name, the error flag and
 * the two timestamps are all already on the nodes the client loads — a
 * `tool-result` carries `call.name`, `isError` and `callTime`, and a running call
 * carries `name` and `time` — so this costs one pass over the same array
 * `deriveStats` already walks.
 *
 * @param settled - Conversation nodes (`useChat().legacy.nodes`).
 * @param runningCalls - Live tool calls (`useChat().legacy.runningCalls`).
 * @param now - `Date.now()` at this collection pass (the running call's elapsed).
 */
export function deriveTools(
  settled: ReadonlyArray<any>,
  runningCalls: ReadonlyArray<any>,
  now: number,
): ToolCallSummary {
  let calls = 0
  let failures = 0
  let slowest: { name: string; ms: number } | null = null
  const names = new Set<string>()
  for (const node of settled ?? []) {
    if (node?.kind !== 'tool-result') continue
    calls += 1
    const name = typeof node.call?.name === 'string' && node.call.name.length > 0 ? node.call.name : null
    if (name !== null) names.add(name)
    if (node.isError === true) failures += 1
    const ms = typeof node.callTime === 'number' && Number.isFinite(node.time)
      ? Math.max(0, node.time - node.callTime)
      : null
    // A truncated head (call === null) still counts as a call but cannot be timed.
    if (ms !== null && (slowest === null || ms > slowest.ms)) slowest = { name: name ?? '—', ms }
  }
  let running: ToolCallSummary['running'] = null
  let longest = -1
  for (const call of runningCalls ?? []) {
    if (typeof call?.time !== 'number' || !Number.isFinite(call.time)) continue
    const ms = Math.max(0, now - call.time)
    if (ms > longest) {
      longest = ms
      running = { name: typeof call.name === 'string' && call.name.length > 0 ? call.name : '—', ms, count: 0 }
    }
  }
  if (running !== null) running = { ...running, count: (runningCalls ?? []).length }
  return { calls, tools: names.size, failures, slowest, running }
}

/**
 * Fold the conversation's compaction markers into the 上下文压缩 card's summary.
 *
 * Why this exists: context is trimmed silently. A long session shows the meter
 * drop and the transcript lose rows, with nothing saying how much history was
 * folded away or when — so "why did the model forget that?" has no answer on
 * screen. The markers are already nodes in the stream the collector walks
 * (`kind: 'compaction'`), so this costs one more filter over the same array.
 *
 * A `null` `shadowedTokenCount`/`shadowedItemCount` means the summary event was
 * outside the loaded window: the compaction is still COUNTED (it happened) while
 * its figures stay null, so the card can print `—` instead of a fabricated 0.
 *
 * @param settled - Conversation nodes (`useChat().legacy.nodes`).
 */
export function deriveCompaction(settled: ReadonlyArray<any>): CompactionSummary {
  let count = 0
  let reclaimed = 0
  let items = 0
  const events: CompactionSummary['recent'] = []
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  for (const node of settled ?? []) {
    if (node?.kind !== 'compaction') continue
    count += 1
    const tokens = num(node.shadowedTokenCount)
    const dropped = num(node.shadowedItemCount)
    reclaimed += tokens ?? 0
    items += dropped ?? 0
    events.push({ at: num(node.time) ?? 0, reclaimed: tokens, items: dropped })
  }
  events.sort((a, b) => b.at - a.at)
  return { count, reclaimed, items, recent: events.slice(0, COMPACTION_HISTORY) }
}

/** How many TURNS the 缓存趋势 sparkline keeps (one point per conversation turn). */
export const CACHE_SERIES_LIMIT = 30

/** One turn's cache reading, folded for the trend card. */
export interface CacheSeriesFold {
  /** Hit rates oldest → newest, each 0..1. */
  rates: number[]
  /** One `HH:MM` mark per rate; '' where that turn carried no usable time. */
  marks: string[]
}

const twoDigits = (n: number): string => (n < 10 ? `0${n}` : String(n))

/** Browser-local `HH:MM` (the same clock the other sparkline cards label with). */
function clockLabel(ms: number): string {
  const d = new Date(ms)
  return `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}`
}

/**
 * Fold the conversation's settled assistant steps into the 缓存趋势 line — ONE
 * POINT PER TURN (轮次), not per request.
 *
 * WHY per turn (owner, 2026-10-26): a single turn can be 40 model steps, so a
 * per-request line spends its whole 20-point window inside one turn and reads as
 * a flat line while the turn that actually missed (Thesis session, turn 7: two
 * requests, 232,831 tokens, 50.7% hit) is somewhere off the left edge. The owner
 * reads the card as 「这一轮偏低」, which is the turn's own 本轮用量 figure — so the
 * point must be that number: ΣcacheRead / Σ(uncached+cacheRead+cacheWrite) over
 * ALL of the turn's steps.
 *
 * WHY not the usage ledger: the cumulative `tokenUsage` projection answers "how
 * much of this session was cached" but hides the shape. Each settled assistant
 * node carries its own `usage` (the same per-step samples the heatmap accounting
 * credits), so this costs one pass over the array the collector already walks.
 *
 * A cache WRITE is billed at the miss rate by the provider, so it belongs to the
 * uncached side of the share; the buckets are still summed, not re-labelled.
 *
 * @param settled - Conversation nodes (`useChat().legacy.nodes`).
 * @param limit - Turns to keep, newest last (default {@link CACHE_SERIES_LIMIT}).
 */
export function deriveCacheSeries(
  settled: ReadonlyArray<any>,
  limit: number = CACHE_SERIES_LIMIT,
): CacheSeriesFold {
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const order: number[] = []
  const turns = new Map<number, { hit: number; prompt: number; at: number | null }>()
  for (const node of settled ?? []) {
    if (node?.kind !== 'assistant' || node?.usage == null) continue
    const u = node.usage as Record<string, unknown>
    // WHICH KEY CARRIES THE MISS — the one trap in this fold. A conversation
    // NODE's usage is the provider record (`inputTokens` = prompt minus cached;
    // the harness's buckets are disjoint, see dsh-llm-deepseek's translate), while
    // the `tokenUsage` PROJECTION renames the same number to
    // `uncachedInputTokens`. Reading only the projection spelling on nodes yields
    // uncached = 0 for every request → rate = cacheRead / cacheRead = 100% → one
    // flat line at the top on every card (the owner's report, 2026-10-26:
    // 「每个对话的折线图都是一条横线和 100%」). Accept both spellings.
    const miss = Number.isFinite(u.uncachedInputTokens) ? num(u.uncachedInputTokens) : num(u.inputTokens)
    const prompt = miss + num(u.cacheReadTokens) + num(u.cacheWriteTokens)
    if (prompt <= 0) continue
    const key = typeof node.turn === 'number' && Number.isFinite(node.turn) ? node.turn : -1
    let acc = turns.get(key)
    if (acc === undefined) {
      acc = { hit: 0, prompt: 0, at: null }
      turns.set(key, acc)
      order.push(key)
    }
    acc.hit += num(u.cacheReadTokens)
    acc.prompt += prompt
    if (acc.at === null) {
      const start = node.timing?.stepStartTime
      const at = typeof start === 'number' && Number.isFinite(start)
        ? start
        : (typeof node.time === 'number' && Number.isFinite(node.time) ? node.time : null)
      acc.at = at
    }
  }
  const points = order.map((key) => {
    const acc = turns.get(key)!
    return { rate: acc.prompt > 0 ? Math.min(1, Math.max(0, acc.hit / acc.prompt)) : 0, at: acc.at }
  })
  const kept = points.slice(-Math.max(1, limit))
  return {
    rates: kept.map(p => p.rate),
    marks: kept.map(p => (p.at === null ? '' : clockLabel(p.at))),
  }
}

/** Fold assistant/tool-result nodes into the same window-scoped stats as the shipped StatsLine fallback. */
export function deriveStats(nodes: ReadonlyArray<any>): Omit<Stats, 'usage'> {
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
