import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import type { TrajectoryBeat, WidgetChart, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 轨迹占比 — the STATISTICS view of 对话轨迹 (2026-09-28, redesign v2).
 *
 * 对话轨迹 draws the last 30 beats as three coloured lanes, which answers "what
 * happened, in what order" but never "how much of this window did each lane
 * actually own". This card answers that: a three-segment share bar whose rows
 * carry each lane's TIME and SHARE, with the selected lane's share as the figure.
 *
 * ── COLOUR RULE (owner's call, 2026-09-28: 「就按官方的输入蓝色/模型紫色/工具橙色」) ──
 * The three lanes take the same semantic tokens the official 轨迹 timeline uses
 * (`render/charts/lanes.tsx` → `LANE_TONES`), mapped onto the chart tone
 * vocabulary:
 *   输入 → `primary` = `--dsw-alias-state-business-primary`   (blue — the official input lane, verbatim)
 *   模型 → `accent`  = `CHART_TONES.accent`, the official color-mix the lane has always painted
 *   工具 → `warn`    = `--dsw-alias-state-warn-primary`       (orange — the official tool lane IS the warn colour)
 * The 模型 lane used to fall back to `muted`: the official strip paints it
 * `color-mix(in srgb, business-primary 60%, error-secondary)` — a blue↔red blend
 * that reads purple — and that expression is not a theme token, so the five-tone
 * vocabulary could not express it. The captain has since added the `accent` tone
 * (mapping to that exact mix, and switching `lanes.tsx` over to the same
 * constant), so this card now uses the real lane colour and the two cards cannot
 * drift apart. The raw-color alternative was rejected on purpose: the palette is
 * semantic aliases only, which is what keeps every card following light/dark and
 * future token changes.
 *
 * ── LAYOUT (why `segments`, not `breakdown`) ──
 * The rows here are the `segments` chart's OWN legend rows (the 上下文水位 /
 * Token 用量 geometry). That is exactly the shape the owner asked for:
 *  - a row is `[label] ←→ [value]`: label flush left, value hard right, so the
 *    second number of every row forms ONE column down the card, separated by
 *    that row's own `gap` (the owner's complaint: `12 · 24.2s  29%` mashed three
 *    numbers into one cell with two different joiner styles);
 *  - the label span truncates NOTHING (the second complaint: 输入 / 模型 / 工具
 *    are two glyphs each — there is room), and there is no opacity animation on
 *    the labels: brightness at the row level is the theme's own text colour;
 *  - `bodyAnchor: 'bottom'` rests the whole block on the tile's floor.
 * The right cell is the SHARE (`segmentsValue: 'percent'`) and the left label
 * carries the TIME — the split matters because the segments renderer's default
 * right column is the TOKEN formatter, and this card's numbers are milliseconds:
 * feeding ms through it printed `~24.2K` for 24.2 seconds, which reads as a token
 * count. One number per column, no joiner at all.
 * `breakdown` was rejected: its `value` + `cost` cells are the grid's own
 * right-aligned numeric tracks, which is the same idea with a second colour
 * semantics bolted on, and its `cost` column is reserved for money.
 *
 * ── THE FIGURE + THE CYCLE (owner's request) ──
 * `headAfter.big` shows ONE lane's share and tapping the card flips it
 * 模型 ↔ 工具 (`cycle`, persisted to this instance's `bigLane` field, exactly like
 * the sys cards' `bigMetric`). 输入 is not in the cycle: it is instantaneous, so
 * it HAS no share to show. The same flip is reachable in the market / 组件配置
 * previews because `simToggle` is declared — see `example.simSteps`.
 */

/** Lane draw order — THE SAME order as 对话轨迹's lanes and its legend counts. */
const LANE_ORDER = ['input', 'model', 'tool'] as const
type Lane = (typeof LANE_ORDER)[number]

/** The two lanes a figure can be about (输入 has no duration — see the header). */
const BIG_LANES = ['model', 'tool'] as const
type BigLane = (typeof BIG_LANES)[number]

/**
 * Segment / row tone per lane (see the COLOUR RULE block above): each lane takes
 * the official 轨迹 lane's own colour — `primary` for 输入, `accent` for 模型 (the
 * official blue↔red mix — the captain added this tone for exactly this lane) and
 * `warn` for 工具.
 */
const LANE_TONE: Record<Lane, 'primary' | 'warn' | 'accent'> = {
  input: 'primary',
  model: 'accent',
  tool: 'warn',
}

/**
 * Lane name, resolved through a LITERAL t() call per lane.
 *
 * The key is written out at each lane instead of interpolated
 * (`t('card.trajectory-stats.' + kind)`) on purpose: the unit validator's locale
 * gate (scripts/validate-widget-unit.mjs) scans for literal t() keys and would
 * otherwise see these three as "non-local" references and skip checking that
 * BOTH dictionaries cover them.
 */
function laneName(kind: Lane): string {
  return kind === 'input'
    ? t('card.trajectory-stats.input')
    : kind === 'model'
      ? t('card.trajectory-stats.model')
      : t('card.trajectory-stats.tool')
}

/** The lane the figure is about, read off this instance's own config. An
 *  unknown/missing value falls back to 模型 — the first mode of the cycle, so the
 *  card opens the same way every time and one tap always reaches 工具. */
function bigLaneOf(stats: WidgetStats): BigLane {
  return stats.bigLane === 'tool' ? 'tool' : 'model'
}

/**
 * Compact duration for a row's right cell: under a second prints whole ms
 * (`840ms`), otherwise one decimal of seconds (`18.0s`), minutes past 60
 * (`2m42s`). Kept SHORT on purpose: this string shares the row with the share
 * number, so a long form would squeeze the label.
 */
function fmtRowMs(ms: number): string {
  if (!(ms > 0)) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const whole = Math.round(ms / 1000)
  return `${Math.floor(whole / 60)}m${whole % 60}s`
}

/** One lane's fold inside the rolling window. */
interface LaneStat {
  kind: Lane
  count: number
  ms: number
}

/** Fold the window's beats into the three lanes (count + Σ ms). */
function foldLanes(beats: readonly TrajectoryBeat[]): Record<Lane, LaneStat> {
  const out: Record<Lane, LaneStat> = {
    input: { kind: 'input', count: 0, ms: 0 },
    model: { kind: 'model', count: 0, ms: 0 },
    tool: { kind: 'tool', count: 0, ms: 0 },
  }
  for (const b of beats) {
    const lane = out[b.kind]
    if (lane === undefined) continue // an unknown lane can never wedge the card
    lane.count += 1
    if (b.ms > 0) lane.ms += b.ms
  }
  return out
}

/** One row of the share bar: the lane's name + time on the left, the tone that
 *  carries its identity (see LANE_TONE), and the duration the bar is sized by —
 *  the chart's right column is the SHARE, see `segmentsValue` at the render. */
type ShareSegment = NonNullable<WidgetChart['segments']>[number]

function trajectoryStatsRender(stats: WidgetStats): WidgetRenderOut | null {
  const beats = stats.trajectory ?? []
  // No beats = no window = nothing true to say (the family's own rule).
  if (beats.length === 0) return null
  const lanes = foldLanes(beats)

  // Duration denominator: 模型 + 工具 only. `input` beats are instantaneous by
  // construction (`TrajectoryBeat.ms === 0`), so they cannot carry a share; they
  // still own a row, and that row prints the time they actually took (0ms).
  const totalMs = lanes.model.ms + lanes.tool.ms
  // The lane the USER picked (persisted) and the lane the card can actually SHOW.
  // They differ only in the degenerate all-input window, where no lane holds a
  // share: the figure then reports the beat count, but the cycle keeps pointing
  // at the user's real preference instead of silently resetting it.
  const pickedLane = bigLaneOf(stats)
  const shownLane: BigLane = totalMs > 0 ? pickedLane : 'model'
  const sharePct = (lane: LaneStat): number => (totalMs > 0 ? Math.round((lane.ms / totalMs) * 100) : 0)

  const segments: ShareSegment[] = []
  for (const k of LANE_ORDER) {
    const lane = lanes[k]
    // The label carries the lane name AND its time — the only number that belongs
    // on the left, because the right cell is the share (`segmentsValue`). The two
    // are one string on purpose: the row is a single `label ←→ value` pair, and
    // the value column is what must line up down the card.
    segments.push({ label: `${laneName(k)} ${fmtRowMs(lane.ms)}`, tokens: Math.max(lane.ms, 0), tone: LANE_TONE[k] })
  }

  // `totalTokens` is the segments chart's width denominator AND the share's own
  // denominator when `segmentsValue: 'percent'` — its ratio decides the bar, its
  // total decides the right column. It is therefore the real window duration and
  // NEVER a substitute: a window with no duration at all (pure input beats) has
  // no share to print, so every row's right cell reads `—` (the renderer's own
  // fallback for a zero total) while the labels still carry each lane's time.
  const total = totalMs
  const big = totalMs > 0 ? `${sharePct(lanes[shownLane])}%` : String(beats.length)

  return {
    title: t('widget.trajectory-stats.name'),
    // The figure is the SELECTED lane's share, and the legend under it names
    // exactly that lane — the figure can never be read against the wrong row.
    headAfter: { big },
    legend: `${laneName(shownLane)} · ${t('card.trajectory-stats.legend')}`,
    bodyAnchor: 'bottom',
    chart: {
      kind: 'segments',
      segmentsPalette: 'tones',
      // The right cell is the SHARE, not the token formatter's `~24.2K` (which
      // would label 24.2 SECONDS as a token count — see the header).
      segmentsValue: 'percent',
      totalTokens: total,
      segments,
    },
    // Tap to flip the figure 模型 ↔ 工具. `store` is this card's OWN field
    // (`bigLane`), so the flip never collides with the usage pool view or the sys
    // cards' `bigMetric`.
    cycle: {
      modes: [...BIG_LANES],
      current: pickedLane,
      hint: t('card.trajectory-stats.cycleHint'),
      store: 'bigLane',
    },
  }
}

export default defineWidget({
  id: 'trajectory-stats',
  name: () => t('widget.trajectory-stats.name'),
  desc: () => t('widget.trajectory-stats.desc'),
  builtin: true,
  group: 'system',
  sizes: ['2x2'],
  render: trajectoryStatsRender,
  // Preview click: `simToggle` is what wires the click on both the market and
  // the 组件配置 previews, and `simSteps` makes it walk 模型 → 工具 → 模型 instead
  // of flipping a single boolean.
  simToggle: () => t('widget.trajectory-stats.simToggle'),
  // Widget-owned preview data: with no live session there are no beats, and the
  // card must still be reviewable in the market / 组件配置 previews (the live
  // window wins over this the moment a session has beats). The 30 beats are the
  // SHARED preview fixture's own rhythm, copied verbatim from
  // `render/preview/preview-stats.ts` (input instantaneous, model steps 0.6–4s,
  // tool calls 0.2–9s) so 对话轨迹 and this card show the same window side by
  // side — 6 inputs / 12 model steps / 12 tool calls, tool dominating at ~71%.
  example: {
    sim: { bigLane: 'model' },
    simSteps: [{ bigLane: 'model' }, { bigLane: 'tool' }],
    stats: {
      trajectory: Array.from({ length: 30 }, (_, i): TrajectoryBeat => {
        const kind = (['input', 'model', 'tool', 'model', 'tool', 'model', 'input', 'model', 'tool', 'tool'] as const)[(i * 7) % 10]!
        const ms = kind === 'input' ? 0 : Math.round(kind === 'model' ? 600 + ((i * 977) % 3400) : 200 + ((i * 613) % 8800))
        return { kind, ms }
      }),
    },
  },
})
