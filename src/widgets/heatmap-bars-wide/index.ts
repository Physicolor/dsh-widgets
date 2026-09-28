import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { dayKey, fmtTokens, lastNDays } from '../../client/lib/format'

/**
 * 用量柱状图（2×4）— the WIDE variant of `heatmap-bars`: the last 30 days of
 * machine-wide daily token usage, drawn as the family's vertical bars.
 *
 * BAR WIDTH IS ARITHMETIC, NOT A STYLE KNOB. `barsV` lays its columns out as
 * `gap: 4px` (a FIXED, unscaled constant) + a bar of 93% of the column, so at a
 * 2×4 tile (side 160 → 344px card, 318px content) the bar width is decided
 * ENTIRELY by how many bars are passed:
 *
 *   bars   column = (318 − (n−1)·4) / n   bar = 93% of it   ink fill
 *    30          6.7px                        6.3px           93%   ← needles
 *    15         17.5px                       16.2px           94%   ← the 2×2's own bar
 *    10         28.2px                       22.0px (cap)     78%   ← airy
 *
 * The 2×2 card draws 7 bars of ~14.6px in its 134px content box, i.e. 16px is
 * "the 7-day feel" (and 22px is the renderer's hard ceiling, `21 · scale`). So
 * ONE BAR PER DAY CANNOT LOOK LIKE THE 7-DAY CARD — thirty daily columns are
 * 6.3px wide by construction. Two days per bar (15 bars, 16.2px, the same 94%
 * rhythm as the 2×2) is the finest bucket that reaches that width, which is why
 * it is the default here. One constant (`DAYS_PER_BAR`) switches back to 30 daily
 * needles or up to 10 fat bars.
 *
 * A bar is TWO days, so a bar's label is the day it ENDS on: that keeps every
 * label a single short date (a `8.30–8.31` range at the two bottom corners
 * overflows the card's padding) and it keeps the family's rolling convention —
 * the right edge is TODAY. The bucketing is stated on the card's own hover
 * (`cardHint`), because the corners can no longer say it.
 *
 * A DAILY BAR CHART THAT DOES NOT LOOK STARVED NEEDS A SHARED-LAYER CHANGE: let
 * `barsV` derive its gap (or take it from the chart) instead of hard-coding 4px
 * — at a 1px gap 30 daily bars are 8.7px, still thinner than the 2×2's. That is
 * the captain's call, not a widget's.
 *
 * WHY `barsV` AND NOT `heatmap`: the calendar renderer's horizontal unit is a
 * WEEK (7 rows = weekdays), so thirty days inside it is either 7 rows × 5 columns
 * (fixed 8–9px cells → a ~53px-wide block floating in a 318px card, and the plot
 * still wants ~91px of height) or ≥20 columns, i.e. five-plus calendar weeks of
 * day-cells. Neither reads as "the last 30 days, left to right"; the weekday
 * calendar keeps that job at 2×2/2×4.
 *
 * DATA: `stats.heatmapRaw` (`Record<'YYYY-MM-DD', number>`, machine-wide daily
 * tokens, today's figure filled in by the collector). `stats.heatmapGrid` is NOT
 * read — it is the pre-folded 7×13 calendar the 2×2 calendar card draws, and a
 * bar chart needs the per-day series, not a weekday grid.
 */

/** The window the card reports: the last 30 days ending today (rolling, so the
 *  newest day is always the rightmost bar — the same alignment `lastNDays` gives
 *  the 7-day card). */
const WINDOW_DAYS = 30

/** Days folded into one bar — see the bar-width table above: 2 is the finest
 *  bucket whose bars match the 2×2 card's weight (16.2px vs its ~14.6px). */
const DAYS_PER_BAR = 2

/** The window's daily values, folded into `DAYS_PER_BAR`-day bars. A bar is
 *  labelled by the day it ENDS on (see the module comment). Ratios are normalized
 *  to the max BAR (the way `lastNDays` normalizes per day), so the heaviest
 *  stretch of the window always reaches full height. */
function foldBars(raw: Record<string, number>): BarDatum[] {
  const days = lastNDays(raw, WINDOW_DAYS)
  const bars: BarDatum[] = []
  for (let i = 0; i < days.length; i += DAYS_PER_BAR) {
    const bucket = days.slice(i, i + DAYS_PER_BAR)
    const value = bucket.reduce((sum, day) => sum + day.value, 0)
    bars.push({
      label: bucket[bucket.length - 1].label,
      value,
      ratio: 0,
      tone: value > 0 ? 'primary' : 'muted',
    })
  }
  const max = Math.max(1, ...bars.map((bar) => bar.value))
  for (const bar of bars) bar.ratio = bar.value > 0 ? bar.value / max : 0
  return bars
}

/** Render the card: the title with this window's two figures at the title row's
 *  right end, then the bars. Returns null when there is nothing to say (no log at
 *  all, or every day of the window is 0) — a chart of flat zeroes is not a card,
 *  it is an empty tile (the family rule: 没有数据就不出现). */
function heatmapBarsWideRender(stats: WidgetStats): WidgetRenderOut | null {
  const raw = stats.heatmapRaw
  if (!raw) return null
  const bars = foldBars(raw)
  let total = 0
  let peak = 0
  for (const bar of bars) {
    total += bar.value
    if (bar.value > peak) peak = bar.value
  }
  if (peak <= 0) return null
  return {
    title: t('card.heatmap-bars-wide.title'),
    // The wide-card head (see the README for the full argument): the 2×2's grey
    // figures line, RELOCATED into the title row — the repository's own rule for
    // wide tiles, applied verbatim by two shipped families
    // (`src/widgets/heatmap/index.ts` and `src/client/families/github/renders.ts`:
    // `wide ? headRight : legend`). The type ladder is untouched (13px blue title /
    // 10px grey figures); only the arrangement follows the tile's shape, and the
    // head stays ONE line (~17px) so the card keeps its air.
    //
    // The pair is LABELLED (MAX … TOTAL …) instead of bare. The usage family's
    // bare pair means "today, then the window total" — a convention this card
    // cannot inherit, because its first number is a window quantity (the heaviest
    // bar), not today. Two bare numbers would therefore be read as "today /
    // total" by anyone who knows the family, and a word wedged between them
    // ("238M 峰值 35.9M") attaches to neither at a glance. MAX/TOTAL are Latin on
    // purpose: they sit next to `M`-suffixed figures, the same way unit symbols do.
    //
    // Order matches the family: the smaller window figure LEFT, the total RIGHT.
    // No `value`: the token-usage family has no 20px headline figure — the chart
    // is the content, the figures ride the head.
    //
    // Height at the 2×4 tile: 13 + 17(head) + 79(barsV's fixed plot) + 13 = 122 ≤ 160.
    headRight: `${t('card.heatmap-bars-wide.max')} ${fmtTokens(peak)}  ${t('card.heatmap-bars-wide.total')} ${fmtTokens(total)}`,
    // The corners can only carry one date each, so the card says out loud that a
    // bar is DAYS_PER_BAR days (hover text; the bars' own hover text wins inside
    // the plot, so this reads on the head).
    cardHint: t('card.heatmap-bars-wide.hint'),
    chart: { kind: 'barsV', bars },
  }
}

/** How many days the preview log covers — a little more than the window, so the
 *  preview also exercises "the log has history older than the window". */
const PREVIEW_DAYS = 40

/** Preview usage log: a plausible working month — light weekends, a weekday
 *  baseline that swings, a heavy session every ten days — generated relative to
 *  TODAY, the same way the shared PREVIEW_RAW is, so the market/config preview
 *  shows the real card shape on any date with today on the right edge. A thunk
 *  (not a frozen literal) because a long-lived session would otherwise leave the
 *  preview stranded in the past.
 *
 *  EVERY DAY IS NON-ZERO, deliberately: a preview with empty days reads as "the
 *  card only covers ~25 of its 30 days" (the muted stub a real zero day draws is
 *  nearly invisible), and the preview's job is to show the card's full shape.
 *  A day with no usage is a live-data state, not a preview state. */
function previewStats(): Partial<WidgetStats> {
  const now = new Date()
  const raw: Record<string, number> = {}
  for (let i = PREVIEW_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const base = weekend ? 1_400_000 : 6_200_000
    const swing = (i % 5) * 900_000
    const spike = i % 10 === 3 ? 19_000_000 : 0
    raw[dayKey(d)] = base + swing + spike
  }
  return { heatmapRaw: raw }
}

export default defineWidget({
  id: 'heatmap-bars-wide',
  name: () => t('widget.heatmap-bars-wide.name'),
  desc: () => t('widget.heatmap-bars-wide.desc'),
  builtin: true,
  group: 'coding-plan',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x4'],
  render: heatmapBarsWideRender,
  example: { stats: previewStats },
})
