/**
 * 任务计时 (task-timer) — "how long has THIS turn been running, and what is it
 * waiting on right now".
 *
 * WHY THIS CARD EXISTS, next to 工具调用 (the tool fold) and 会话统计 (the session
 * counters): both of those answer retrospective questions — how many calls, how
 * much time the session has spent. Neither answers the LIVE one, which is the
 * question the rail is actually watched with: is this turn wedged, or is that
 * `pwsh` call just slow? The readings here are the only ones on the rail that move
 * while a turn runs, so they share one card and are read as a pair: a climbing turn
 * clock over 模型 means the model is thinking, the same clock over a named tool means
 * the wait is that tool.
 *
 * WHERE THE NUMBERS COME FROM (no new data source — all three are already projected):
 *   - TURN — `stats.liveTurnMs`, the collector's reading of the open turn, counted
 *     from the START of the earliest step inside it (`start.time`), so it measures
 *     the whole turn and not just the step that happens to be current. It is null
 *     when no turn is open, which is a DIFFERENT statement from "0 ms elapsed" —
 *     an idle card prints `—` and says 空闲 rather than a fake `0:00`.
 *   - STEP — `stats.liveStepMs`, the open MODEL step's own elapsed time; null when
 *     the turn is between steps (the model has answered and nothing is in flight).
 *     It is what tells "the model is thinking" apart from "a tool is working" —
 *     without it both states print the same climbing turn clock.
 *   - TOOL — `stats.tools.running`, the tool fold's longest in-flight call
 *     (`{ name, ms, count }`), i.e. the call that has been holding a slot longest.
 *     `null` when nothing is running. `count` is how many calls run in parallel,
 *     which is why a second figure rides the same line: at two or more, the longest
 *     one's elapsed time understates the wait (`2 个并行`).
 *
 * WHY THERE IS NO RENDERER TICK. A widget render cannot own an interval and the
 * rail only re-renders a card when its data changes (30s at idle). That is
 * deliberately not worked around here, the way the dial's hands had to be: while a
 * turn is open the collector rebuilds this projection on its own 1s beat and the
 * turn clock advances second by second on real re-renders, and when no turn is open
 * there is nothing to advance — the card shows 空闲, and a ticking `—` would be a
 * lie. So the widget stays a pure data description with no `rich` block.
 *
 * WHAT EACH SIZE SAYS. 2×2 has room for one figure plus one line: the figure is the
 * turn clock, and the line names what the turn is waiting on, in three states —
 * a running tool, else an open model step, else 空闲. 2×4 is twice as wide and can
 * carry that pair plus the session's own totals, which is why the turn clock moves
 * up into `headAfter` (leaving the body free for the figures).
 *
 * WHY THE TITLE STAYS (docs/design/CARD-TITLE-STANDARD.md, T2 度量型): the body is
 * a bare `M:SS` figure, and a bare figure names nothing — `3:12` is the turn, the
 * tool, or the session depending on who wrote it. The title is this card's only
 * statement of what its numbers are measured over, and T2 keeps it. For the same
 * reason the 2×2 body keeps that figure in `value` rather than beside a ring: this
 * is a one-figure card, and C2 (the body fills the tile) is false, so the empty
 * title strip would leave a hole at the top of the card.
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { ToolCallSummary, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { fmtClock } from '../../client/lib/format'
import { t } from '../../client/i18n'

/** The missing-value mark: a reading that does not exist, as opposed to a zero.
 *  Used where a figure cannot be sourced at all (no tool fold on this build). */
const DASH = '—'

/** Decorative separator between the tool line and its parallel count. Not a
 *  dictionary key on purpose: it carries no words, so there is nothing to
 *  translate (same call the sibling units make for their ` · ` joins). */
const JOIN = ' · '

/**
 * The two live readings plus the two session counters this card prints — declared
 * locally so the unit keeps reading correctly against both snapshots of the shared
 * contract: `liveTurnMs` and `liveStepMs` now exist on `WidgetStats`
 * (`src/client/lib/contract/types.ts`), and the intersection below is what lets the
 * same file compile on a worktree that predates them. `ToolCallSummary` already
 * exists there and is imported rather than restated.
 *
 * `liveStepMs` is the OPEN MODEL STEP's elapsed time (null when the turn is between
 * steps), and it is what the 2×2 line falls back to when no tool is running — see
 * `taskTimerRender`. It deliberately does NOT become a 2×4 figure: the four figures
 * there are whole-session totals, and a live per-step clock beside them would read
 * as a fifth total.
 */
interface TaskTimerStats {
  liveTurnMs?: number | null
  liveStepMs?: number | null
  turns: number
  steps: number
  tools?: ToolCallSummary | null
}

/** A finite epoch/elapsed-ms number or nothing. */
function asMs(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** A positive call count, or 0 when there is nothing to count. */
function asCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0
}

/** The live value of one field, in the spec's own precedence: a preview (`sim`)
 *  that SPEAKS wins — including when it says null, which is how the preview walks
 *  the card to its 空闲 state — and an absent `sim` field falls through to the
 *  projection. `??` cannot express this: it would swallow the preview's explicit
 *  null and re-render the live reading on the one step that exists to show 空闲. */
function simOr<T>(simValue: T | undefined, fallback: T): T {
  return simValue === undefined ? fallback : simValue
}

function taskTimerRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  // The shared record may not carry the new fields yet (see TaskTimerStats); read
  // through a narrow view rather than casting each access.
  const s = stats as WidgetStats & TaskTimerStats
  const sim = meta?.sim
  // PREVIEW-ONLY overrides (the rail never passes `sim`): each sim step pins the
  // live readings so the card's three states — tool running / model step running /
  // 空闲 — are all reviewable without waiting for a real turn to reach them.
  // Each override is normalized to the FALLBACK's own type FIRST and only then
  // chosen between: the generic would otherwise be inferred as the union with the
  // raw `unknown` off `sim`, and the `undefined` test below would stop narrowing.
  const simTurnMs: number | null | undefined = sim?.liveTurnMs === undefined ? undefined : asMs(sim.liveTurnMs)
  const turnMs = simOr<number | null>(simTurnMs, asMs(s.liveTurnMs))
  const simToolMs: number | null | undefined = sim?.toolMs === undefined ? undefined : asMs(sim.toolMs)
  const toolMs = simOr<number | null>(simToolMs, asMs(s.tools?.running?.ms))
  const simToolName: string | undefined = typeof sim?.toolName === 'string' && sim.toolName !== '' ? sim.toolName : undefined
  const toolName = simOr<string | undefined>(simToolName, s.tools?.running?.name)
  const simToolCount: number | undefined = sim?.toolCount === undefined ? undefined : asCount(sim.toolCount)
  const toolCount = simOr<number>(simToolCount, asCount(s.tools?.running?.count))
  const simStepMs: number | null | undefined = sim?.liveStepMs === undefined ? undefined : asMs(sim.liveStepMs)
  // The figure: a real elapsed time, or the dash when no turn is open. The dash is
  // what tells the two "nothing" cases apart — a running turn at 0ms still reads
  // `0:00`, which is a measurement, while `—` means there is no open turn at all.
  const main = turnMs === null ? DASH : fmtClock(turnMs)
  const hasTool = toolName !== undefined && toolMs !== null

  if (meta?.size !== '2x4') {
    // 2×2 — the figure is the turn clock; the line under it names what the turn is
    // currently WAITING ON, in three states:
    //   1. a tool call is in flight → that call and its elapsed time (the wait is a
    //      tool, so the tool is the answer);
    //   2. no tool, but a model step is open → the model and the step's own elapsed
    //      (`liveStepMs`). This is what keeps that field from being dead: it is the
    //      only reading that separates "the model is thinking" from "a tool is
    //      working", which the turn clock on its own cannot say;
    //   3. neither → 空闲, i.e. the turn is between steps.
    const stepMs = simOr<number | null>(simStepMs, asMs(s.liveStepMs))
    // The tool line carries the NAME and the elapsed time ONLY. The parallel count
    // used to ride the same string, and at 150px it did not fit: the 2×2 body column
    // is ~126px, and `当前工具 pwsh 1:24 · 2 个并行` rendered as
    // `当前工具 pwsh 1:24 · 2 …` — the tail was the part cut off, so the count was
    // spent from the line's own budget and cost the reading nothing but gained
    // nothing either. It moves to the hover (`cardHint` below), which can be as long
    // as it likes. A long TOOL NAME can still ellipsize; that is data, not a defect.
    const toolLine = hasTool
      ? `${t('card.task-timer.labelTool')} ${toolName} ${fmtClock(toolMs)}`
      : stepMs !== null
        ? `${t('card.task-timer.labelModel')} ${fmtClock(stepMs)}`
        : `${t('card.task-timer.labelTool')} ${t('card.task-timer.idle')}`
    // The hover says WHICH state the card is in — an `M:SS` figure cannot say that
    // by itself — and, when calls are running in parallel, how many (`tools.running`
    // is only the LONGEST of them, so its elapsed time understates the wait unless
    // the count is stated). It is worth a hover exactly while something is really
    // running, so it covers BOTH live states (tool and model step) and stays off at
    // 空闲, which the line above already spells out.
    const hint = hasTool && toolCount > 1
      ? `${t('card.task-timer.running')}${JOIN}${t('card.task-timer.toolCount', { n: toolCount })}`
      : hasTool || stepMs !== null
        ? t('card.task-timer.running')
        : undefined
    return {
      title: t('card.task-timer.title'),
      value: main,
      // `muted` only when the big slot holds nothing but the dash (see valueTone).
      ...(turnMs === null ? { valueTone: 'muted' as const } : {}),
      sub: toolLine,
      ...(hint === undefined ? {} : { cardHint: hint }),
    }
  }

  // 2×4 — the turn clock moves into the head, freeing the body for the four
  // figures that only fit at this width: the running tool, how many DISTINCT tools
  // the session has used, its turn count and its step count. Deliberately still
  // four cells — `liveStepMs` does not get one here: the three other figures are
  // whole-session totals, and a live per-step clock beside them would read as a
  // fourth total. It speaks on the 2×2 head instead.
  return {
    title: t('card.task-timer.title'),
    headAfter: { big: main, small: t('card.task-timer.labelTurn') },
    // BOTTOM-ANCHORED (owner's call, 2026-10-14). A `headAfter` card is top-aligned
    // by default — the body starts right under the head — which is right for a
    // MULTI-ROW body (任务's four todo lines) and wrong for a single figures row: it
    // left ~80px of empty tile under the four numbers and read as a card that was not
    // finished. `bodyAnchor: 'bottom'` is the 会话概览（harness-board）posture, the
    // released 2×4 that also ends in one row of figures: the row sits on the card's
    // floor with the head above it. The rule is now written down (docs/design/
    // CARD-BODY-POSTURE.md) and machine-checked (scripts/probe-geometry.cjs,
    // "2×4 body sits on the floor"), so this cannot pass review again.
    bodyAnchor: 'bottom',
    chart: {
      kind: 'figures',
      figureRows: [[
        {
          label: t('card.task-timer.labelTool'),
          value: hasTool ? `${toolName} ${fmtClock(toolMs)}` : t('card.task-timer.idle'),
        },
        // 工具 is the DISTINCT tool-name count (`tools.tools`, e.g. 6), not the
        // settled call count (`tools.calls`, e.g. 31): under a 「工具」 label the
        // latter reads as "31 tools", which is a different and wrong claim. Call
        // totals belong to the 工具调用 card, which is about exactly that.
        { label: t('card.task-timer.labelTools'), value: s.tools ? String(s.tools.tools) : DASH },
        { label: t('card.task-timer.labelCalls'), value: String(s.turns) },
        { label: t('card.task-timer.labelSteps'), value: String(s.steps) },
      ]],
    },
    // Same hover the 2×2 head carries, same rule: only while something is really
    // running (a tool call or an open model step).
    ...(simOr<number | null>(simStepMs, asMs(s.liveStepMs)) !== null || hasTool
      ? { cardHint: t('card.task-timer.running') }
      : {}),
  }
}

export default defineWidget({
  id: 'task-timer',
  // Thunks, not strings: both follow Settings → Language on the next render.
  name: () => t('widget.task-timer.name'),
  desc: () => t('widget.task-timer.desc'),
  builtin: true,
  group: 'time',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2', '2x4'],
  render: taskTimerRender,
  // Nothing per-instance to configure: the card reads live projections and has no
  // knobs. It is not a card that needs a size switch either — both sizes are simply
  // installed side by side.
  configSchema: [],
  // A click on either preview steps 计时中（工具）/ 计时中（模型）/ 空闲 (the shared
  // `simSteps` mechanism), so the state a live rail cannot be walked into on demand
  // — no open turn — is reviewable without waiting for a turn to end, and the 2×2
  // line's three branches each get their own step.
  simToggle: () => t('card.task-timer.simToggle'),
  // Widget-owned preview data: with no live session every reading is null and the
  // card would only ever show its empty state. The mock is self-consistent — one
  // turn 4m12s in, a `pwsh` call 1m24s in running TWICE in parallel (so the tool
  // line exercises the parallel-count branch), and a session with 7 turns / 23
  // steps behind it. `sim` is the tool-running step and MUST be the first entry of
  // `simSteps` (the preview stepper locates the current state by deep equality, so
  // a `sim` absent from `simSteps` makes the first click a silent no-op).
  example: {
    stats: {
      liveTurnMs: 252_000,
      liveStepMs: 84_000,
      turns: 7,
      steps: 23,
      tools: {
        calls: 31,
        tools: 6,
        failures: 1,
        slowest: { name: 'pwsh', ms: 41_000 },
        running: { name: 'pwsh', ms: 84_000, count: 2 },
      },
    },
    sim: { liveTurnMs: 252_000, liveStepMs: 84_000, toolName: 'pwsh', toolMs: 84_000, toolCount: 2 },
    simSteps: [
      // 1 — the tool branch: `pwsh` 1:24, twice in parallel.
      { liveTurnMs: 252_000, liveStepMs: 84_000, toolName: 'pwsh', toolMs: 84_000, toolCount: 2 },
      // 2 — the MODEL branch: nothing running but a model step open, so the 2×2 line
      // reads 模型 0:12. The tool fields must be EXPLICIT nulls, not absent: `sim`
      // overrides by key, so an omitted key falls through to the projection — which
      // in every preview surface still carries this example's own `tools.running`,
      // and the step would render the tool branch all over again.
      { liveTurnMs: 12_000, liveStepMs: 12_000, toolName: null, toolMs: null, toolCount: null },
      // 3 — 空闲: no open turn at all, which is the one state that prints `—`.
      { liveTurnMs: null, liveStepMs: null },
    ],
    note: '计时中（工具）/ 计时中（模型）/ 空闲（无 open turn）',
  },
})
