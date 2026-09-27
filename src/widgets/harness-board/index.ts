import { defineWidget } from '../../client/lib/contract/helpers'
import type { ConfigField, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { fmtDuration, fmtTokens, fmtTps } from '../../client/lib/format'

/**
 * Harness board — the session-level numbers the composer's stats line is made
 * of, on ONE 2×4 card.
 *
 * WHY A BOARD AND NOT JUST THE SEVEN 2×2 CARDS: the stats line was split into
 * seven cards (轮次·步数 / LLM 时长 / 工具调用 / 首 token / 速率 / 缓存命中 /
 * Tokens), i.e. seven grid cells for nine numbers. A 2×4 board holds four of
 * them in two cells (six at the measured density limit), which is the whole
 * point of the board: scan a row instead of scrolling a column. It is NOT a
 * replacement for the individual cards — a 2×2 card prints its figure at 20px
 * where a board figure is 13px, so the board is for scanning, the card is for
 * the number you want to see from across the room. Both ship; the user picks.
 *
 * Every metric is a PURE read of the session stats the collector already
 * folds, so the card has no live source of its own: no skeleton state, no
 * polling, and the figures move on the same tick as the rest of the rail.
 *
 * ONE value here is a deliberately cheap approximation: `turns` counts the
 * session's turns the same way the 轮次·步数 card does (the collector's own
 * fold), not a re-derivation.
 */

/** How many figures ONE row can carry. Six in a row drops every label under
 *  ~4 CJK characters (measured: 46px at the 160px card side), five keeps 56px —
 *  the same density the shipped cc-usage card already uses. */
const ROW_MAX = 5

/** The picker's cap: two rows of five. A 2×4's content box is ~136px tall at
 *  the default card side, which carries the title row plus exactly two 30px
 *  figure rows (see `figureRows`), and 5+5 is also the widest arrangement that
 *  keeps every label whole. */
const MAX_METRICS = 2 * ROW_MAX

/** Default selection: the four figures the dashboard opens with. */
const DEFAULT_METRICS = ['turns', 'llm', 'tool', 'tps']

/** One selectable number: its key (what the config stores), its label key and
 *  the pure read of the stats that produces the figure. */
interface Metric {
  key: string
  label: string
  value: (s: WidgetStats) => string
  /** The figure for a NARROW row (five per row). Only the metrics whose unit is
   *  a separate suffix need it: "space allows the unit, else fall back" is the
   *  rule, and the row length IS the space proxy the widget has (it does not
   *  know the card's pixel width). Absent = the value has no separable unit. */
  valueBare?: (s: WidgetStats) => string
}

/** Count the todo entries in one status. */
function todoCount(stats: WidgetStats, status: 'pending' | 'in_progress' | 'completed'): number {
  const todos = Array.isArray(stats.todos) ? stats.todos : []
  return todos.filter((todo) => todo.status === status).length
}

/**
 * The metric catalog. Formatters are the SAME ones the single-purpose cards
 * use (fmtDuration / fmtTokens / fmtTps), so a number never means two things
 * depending on which card you read it from. Each value falls back to `—` when
 * its source has nothing yet — a board figure must never print a 0 that was
 * never measured (the token cards hide themselves instead; a board cannot
 * hide one cell, so it says "no data" the honest way).
 */
const METRICS: Metric[] = [
  { key: 'turns', label: 'metric.turns', value: (s) => String(s.turns) },
  { key: 'steps', label: 'metric.steps', value: (s) => String(s.steps) },
  { key: 'llm', label: 'metric.llm', value: (s) => (s.llmMs > 0 ? fmtDuration(s.llmMs) : '—') },
  { key: 'tool', label: 'metric.tool', value: (s) => (s.toolMs > 0 ? fmtDuration(s.toolMs) : '—') },
  { key: 'ttft', label: 'metric.ttft', value: (s) => (s.ttftSteps > 0 ? fmtDuration(s.ttftMs / s.ttftSteps) : '—') },
  {
    key: 'tps',
    label: 'metric.tps',
    // "152 tok/s" needs ~55px at the 13px figure font: it fits a four-per-row
    // row (71px) and does not fit a five-per-row one (56px), where the bare
    // number keeps every figure whole instead of ellipsizing the unit away.
    value: (s) => (s.decodeMs > 0 ? `${fmtTps(s.decodeTokens / (s.decodeMs / 1000))} tok/s` : '—'),
    valueBare: (s) => (s.decodeMs > 0 ? fmtTps(s.decodeTokens / (s.decodeMs / 1000)) : '—'),
  },
  { key: 'cache', label: 'metric.cache', value: (s) => (s.usage && s.usage.inputTokens > 0 ? `${Math.round((s.usage.cacheReadTokens / s.usage.inputTokens) * 100)}%` : '—') },
  { key: 'in', label: 'metric.in', value: (s) => (s.usage && s.usage.inputTokens > 0 ? fmtTokens(s.usage.inputTokens) : '—') },
  { key: 'out', label: 'metric.out', value: (s) => (s.usage && s.usage.outputTokens > 0 ? fmtTokens(s.usage.outputTokens) : '—') },
  { key: 'context', label: 'metric.context', value: (s) => (typeof s.contextPercent === 'number' ? `${Math.round(s.contextPercent * 100)}%` : '—') },
  { key: 'todoDoing', label: 'metric.todoDoing', value: (s) => String(todoCount(s, 'in_progress')) },
  { key: 'todoPending', label: 'metric.todoPending', value: (s) => String(todoCount(s, 'pending')) },
]

/** The picked metrics, in the STORED order; unknown keys are dropped and an
 *  empty/absent selection falls back to the default four (a card that has
 *  never been configured still shows something). */
function pickedMetrics(stats: WidgetStats): Metric[] {
  const raw = Array.isArray(stats.metrics) ? (stats.metrics as unknown[]) : null
  const keys = (raw ?? DEFAULT_METRICS).filter((k): k is string => typeof k === 'string')
  const list = keys.map((key) => METRICS.find((m) => m.key === key)).filter((m): m is Metric => m !== undefined)
  return list.length > 0 ? list.slice(0, MAX_METRICS) : METRICS.filter((m) => DEFAULT_METRICS.includes(m.key))
}

/** Break the picked metrics into rows: one row up to five, then two BALANCED
 *  rows (6 → 3+3, 7 → 4+3, 8 → 4+4, 10 → 5+5). A wide card stacks two rows of
 *  five where a single row of ten would ellipsize every label. */
function splitRows<T>(items: T[]): T[][] {
  if (items.length <= ROW_MAX) return [items]
  const half = Math.ceil(items.length / 2)
  return [items.slice(0, half), items.slice(half)]
}

/** Above this many figures in one row, a unit-bearing figure stops fitting, so
 *  the bare figure is used (see Metric.valueBare). */
const ROW_ROOMY = 4

function harnessBoardRender(stats: WidgetStats): WidgetRenderOut {
  const metrics = pickedMetrics(stats)
  const rows = splitRows(metrics).map((row) => {
    const roomy = row.length <= ROW_ROOMY
    return row.map((metric) => ({ label: t(metric.label), value: (roomy ? metric.value : metric.valueBare ?? metric.value)(stats) }))
  })
  return {
    title: t('widget.harness-board.name'),
    // The figures own the card's floor; nothing competes with them for the
    // header, which is the shape the audit's 'primary' rule rewards.
    bodyAnchor: 'bottom',
    chart: rows.length > 1 ? { kind: 'figures', figureRows: rows } : { kind: 'figures', figures: rows[0] ?? [] },
  }
}

export default defineWidget({
  id: 'harness-board',
  name: () => t('widget.harness-board.name'),
  desc: () => t('widget.harness-board.desc'),
  builtin: true,
  group: 'system',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x4'],
  configSchema: [
    {
      key: 'metrics',
      label: () => t('config.metricsLabel'),
      type: 'metrics',
      default: DEFAULT_METRICS,
      max: MAX_METRICS,
      options: METRICS.map((metric): [string, () => string] => [metric.key, () => t(metric.label)]),
    } satisfies ConfigField,
  ],
  render: harnessBoardRender,
})
