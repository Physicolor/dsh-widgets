import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { fmtTokens, lastNDays, lastNDaysWeekly } from '../../client/lib/format'

/**
 * 用量柱状图 — the daily token-usage bars, ONE card for both windows.
 *
 * It absorbed `heatmap-bars-wide` on 2026-09-28 (the owner's call: one card with a
 * WINDOW selector instead of two cards that differ only in their range). The unit
 * keeps this id and its order, so an installed `heatmap-bars@2x2` upgrades in
 * place; the wide unit is gone, and the market finally has one entry named
 * 用量柱状图 rather than two near-identical ones.
 *
 * TWO AXES, deliberately independent:
 *   - the OWNER's window: 7 days (one bar per day) or 30 days (two days per bar) —
 *     a config field, because it is a question about the data;
 *   - the TILE's shape: a 2×2 shows the figures as the family's grey line under the
 *     title, a 2×4 moves them into the title row (`wide ? headRight : legend`, the
 *     repository's own rule for wide tiles, applied verbatim by `heatmap` and the
 *     GitHub family) and labels them MAX/TOTAL. The type ladder is untouched — only
 *     the arrangement follows the tile.
 *
 * WHY 30 DAYS IS TWO DAYS PER BAR — this is arithmetic, not a style knob. `barsV`
 * lays columns out as `gap: 4px` (fixed) + a bar of 93% of the column, so at a 2×4
 * tile (318px of content) the bar width is decided entirely by the bar count:
 *
 *   bars   column = (318 − (n−1)·4) / n   bar = 93% of it
 *    30          6.7px                        6.3px   ← needles
 *    15         17.5px                       16.2px   ← the 2×2's own weight
 *     7         41.4px                       22.0px (renderer cap: 21 · scale)
 *
 * The 2×2 draws 7 bars of ~14.6px in its 134px box, so 15 bars (16.2px, the same
 * 94% ink rhythm) is the finest bucket that still reads like the 7-day card. One
 * day per bar over 30 days cannot: thirty columns are 6.3px by construction.
 *
 * A two-day bar is labelled by the day it ENDS on, which keeps every corner label
 * a single short date (a `8.30–8.31` range overflows the card's padding) and keeps
 * the family's rolling convention — the right edge is TODAY. The bucketing itself
 * is stated in the card's hover text, because the corners can no longer say it.
 *
 * DATA: `stats.heatmapRaw` (`Record<'YYYY-MM-DD', number>`, machine-wide daily
 * tokens; today's figure is filled in by the collector). `stats.heatmapGrid` is NOT
 * read — it is the pre-folded 7×13 calendar the 2×2 calendar card draws, and bars
 * need the per-day series, not a weekday grid.
 */

/** Days in each offered window. */
const RANGES = { week: 7, month: 30 } as const

/** Days folded into one bar, per window — see the bar-width table above. */
function daysPerBar(days: number): number {
  return days === RANGES.month ? 2 : 1
}

/** Fold a daily series into `per`-day bars. A bar takes the END day's label, and
 *  ratios are normalized to the heaviest BAR (not the heaviest day), so the month's
 *  busiest stretch always reaches full height. Zero bars keep a `muted` tone: an
 *  empty stretch is a reading, not a missing one. */
function foldBars(days: BarDatum[], per: number): BarDatum[] {
  const bars: BarDatum[] = []
  for (let i = 0; i < days.length; i += per) {
    const bucket = days.slice(i, i + per)
    const value = bucket.reduce((sum, day) => sum + day.value, 0)
    bars.push({ label: bucket[bucket.length - 1]!.label, value, ratio: 0, tone: value > 0 ? 'primary' : 'muted' })
  }
  const max = Math.max(1, ...bars.map((bar) => bar.value))
  for (const bar of bars) bar.ratio = bar.value > 0 ? bar.value / max : 0
  return bars
}

/** Render the card. Returns null when there is nothing to say (no log at all, or
 *  every day of the window is 0) — a chart of flat zeroes is an empty tile, and the
 *  family rule is 没有数据就不出现. */
function heatmapBarsRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const raw = stats.heatmapRaw
  if (!raw) return null
  // The window comes from the instance config; a preview may PIN it (`sim.range`),
  // which is also how the 30-day path reaches the render gate — G4 varies sim
  // states, never config, so without the sim step the whole month branch would ship
  // unsnapshotted.
  const spec = (meta?.sim?.range as string | undefined) ?? (stats.range as string | undefined)
  const days = spec === '30' ? RANGES.month : RANGES.week
  // The 7-day window keeps the shipped alignment option: rolling (ending today) or
  // the current calendar week. A 30-day window is always rolling — "which calendar
  // week" is not a question a month-long series asks.
  const series = days === RANGES.week && stats.monthMode === 'weekly'
    ? lastNDaysWeekly(raw, RANGES.week)
    : lastNDays(raw, days)
  const bars = foldBars(series, daysPerBar(days))
  let total = 0
  let peak = 0
  for (const bar of bars) {
    total += bar.value
    if (bar.value > peak) peak = bar.value
  }
  if (peak <= 0) return null
  const wide = meta?.size === '2x4'
  return {
    // Its OWN key, not the heatmap unit's `card.heatmap.title`: the two faces read
    // the same words today, but a key shaped `card.<unit>.*` belongs to that unit
    // (the unit validator enforces it), and sharing one key across units means either
    // card can silently rewrite the other's face. Same text, two owners.
    title: t('card.heatmap-bars.title'),
    // One pair for both windows (the smaller window figure left, the total right);
    // only the LABELS follow the tile's width. The pair is [MAX, TOTAL] rather than
    // the usage family's [today, total]: the first figure is a window quantity (the
    // heaviest bar), so a bare pair would be read as "today" by anyone who knows the
    // family — hence the labels, which the wide tile has room for and the 2×2 does
    // not (the owner's call).
    ...(wide
      ? { headRight: `${t('card.heatmap-bars.max')} ${fmtTokens(peak)}  ${t('card.heatmap-bars.total')} ${fmtTokens(total)}` }
      : { legend: `${fmtTokens(peak)}  ${fmtTokens(total)}` }),
    // Only a multi-day bar needs saying out loud; the corners carry one date each.
    ...(daysPerBar(days) > 1 ? { cardHint: t('card.heatmap-bars.hint') } : {}),
    chart: { kind: 'barsV', bars },
  }
}

/** How many days the preview log covers — a little more than the longest window, so
 *  the preview also exercises "the log has history older than the window". */
const PREVIEW_DAYS = 40

/** Preview usage log: a plausible working month — light weekends, a weekday
 *  baseline that swings, a heavy session every ten days — generated relative to
 *  TODAY the way the shared preview data is, so the preview shows the real card
 *  shape on any date with today on the right edge. A thunk, not a frozen literal: a
 *  long-lived session would otherwise leave the preview stranded in the past.
 *
 *  Every day is NON-ZERO on purpose: empty days are a real state of the live data,
 *  but in a preview they read as "the window does not cover 30 days" (a 3px muted
 *  stub is invisible), which is a defect report about the wrong thing. */
function previewStats(): Partial<WidgetStats> {
  const now = new Date()
  const raw: Record<string, number> = {}
  for (let i = PREVIEW_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const base = weekend ? 1_400_000 : 6_200_000
    const swing = (i % 5) * 900_000
    const spike = i % 10 === 3 ? 19_000_000 : 0
    raw[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = base + swing + spike
  }
  return { heatmapRaw: raw }
}

export default defineWidget({
  id: 'heatmap-bars',
  name: () => t('widget.heatmap-bars.name'),
  desc: () => t('widget.heatmap-bars.desc'),
  builtin: true,
  group: 'coding-plan',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2', '2x4'],
  render: heatmapBarsRender,
  configSchema: [
    {
      key: 'range',
      label: () => t('config.bars.range'),
      type: 'mode',
      default: '7',
      options: [['7', () => t('config.bars.range.7')], ['30', () => t('config.bars.range.30')]],
      hint: () => t('config.bars.range.hint'),
    },
    {
      key: 'monthMode',
      label: () => t('config.monthMode'),
      type: 'mode',
      default: 'rolling',
      options: [['rolling', () => t('config.monthMode.rolling7')], ['weekly', () => t('config.monthMode.weekly')]],
      // The alignment only means something for the 7-day window (see the render).
      hint: () => t('config.bars.monthMode.hint'),
    },
  ],
  example: {
    stats: previewStats,
    // A click walks the two windows, so both bucketing rules can be reviewed in the
    // market without touching the instance config (and both reach the render gate).
    sim: { range: '7' },
    simSteps: [{ range: '7' }, { range: '30' }],
  },
  simToggle: () => t('widget.heatmap-bars.simToggle'),
})
