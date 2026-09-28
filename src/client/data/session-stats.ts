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

import { COMPACTION_HISTORY, TRAJECTORY_WINDOW, type CompactionSummary, type ToolCallSummary, type TrajectoryBeat } from '../lib/contract/types'

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
