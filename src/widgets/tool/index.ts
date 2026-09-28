import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'
import type { ConfigField, ToolCallSummary, WidgetStats } from '../../client/lib/contract/types'

/**
 * 工具调用 — the tool-call detail card (2026-09-28, second card of the system-family
 * density pass).
 *
 * It used to print ONE number (cumulative tool time), which cannot answer the only
 * question that matters when a turn drags: is the MODEL slow, or is a TOOL stuck?
 * The fold (`deriveTools`) carries names, the failure flag and the in-flight call,
 * so the card prints three detail rows under the figure.
 *
 * NO RING HERE (the owner's call): a ring is the design language for a SHARE, which
 * is why the cache card wears one — this card's headline is a DURATION, and the
 * circle ate the width the figure needed ("35m…"). The head uses the ordinary
 * stacked posture (`headAfter.big` over `legend`) instead.
 *
 * THE THREE ROWS ARE PICKED, NOT FIXED. The default is 失败 / 平均每次 /
 * 工具耗时占比 — chosen by the owner because the labels grow left to right (2 → 4 →
 * 6 glyphs), which reads as a deliberate ladder instead of a ragged list. Anything
 * else (最慢 / 正在跑, with the tool's own name) is one switch away in 组件配置, and
 * the picker's own order IS the card's top-to-bottom order (`metrics` field).
 * Three is a HARD cap: at the 150px side a fourth row overflows the tile (measured
 * 152px > 150px), so the control refuses a fourth switch.
 */

/** The detail rows a user may pick, in OFFER order, with their label keys. */
const METRICS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'failures', label: 'card.tool.failed' },
  { key: 'mean', label: 'card.tool.mean' },
  { key: 'share', label: 'card.tool.share' },
  { key: 'slowest', label: 'card.tool.slowest' },
  { key: 'running', label: 'card.tool.running' },
]

/** Default rows: 失败 → 平均每次 → 工具耗时占比 (short label to long). */
const DEFAULT_METRICS: readonly string[] = ['failures', 'mean', 'share']

/** Row cap: three fit the tile; a fourth overflows it. */
const MAX_METRICS = 3

/** The em dash a picked row shows while it has nothing to report — the same
 *  placeholder 任务/额度管理 use, never a fabricated 0. */
const DASH = '—'

/**
 * Build the row for one picked metric.
 *
 * EVERY picked metric renders a row — a metric with nothing to say prints `—` in
 * the muted tone instead of disappearing (the owner's rule, 2026-09-28: 「没有正在
 * 执行的工具就显示 -」). A vanishing row silently changed the card's line count and
 * left a user who picked three rows looking at two.
 */
function buildRow(key: string, tools: ToolCallSummary, s: WidgetStats): { label: string; value: string; tone?: 'danger' | 'muted' } {
  if (key === 'failures') {
    // A zero-failure row is information too ("nothing broke") — red only when it
    // is not zero, and a plain 0 (this metric HAS a reading; it is never absent).
    return {
      label: t('card.tool.failed'),
      value: String(tools.failures),
      ...(tools.failures > 0 ? { tone: 'danger' as const } : {}),
    }
  }
  if (key === 'mean') {
    if (tools.calls <= 0) return { label: t('card.tool.mean'), value: DASH, tone: 'muted' }
    return { label: t('card.tool.mean'), value: fmtDuration(s.toolMs / tools.calls) }
  }
  if (key === 'share') {
    const total = s.toolMs + s.llmMs
    if (!(total > 0)) return { label: t('card.tool.share'), value: DASH, tone: 'muted' }
    return { label: t('card.tool.share'), value: `${Math.round((s.toolMs / total) * 100)}%` }
  }
  if (key === 'slowest') {
    if (tools.slowest === null) return { label: t('card.tool.slowest'), value: DASH, tone: 'muted' }
    return { label: `${t('card.tool.slowest')} ${tools.slowest.name}`, value: fmtDuration(tools.slowest.ms) }
  }
  if (key === 'running') {
    if (tools.running === null) return { label: t('card.tool.running'), value: DASH, tone: 'muted' }
    // The concurrent count is part of the fact: while two calls are in flight,
    // naming only the longest one would understate what is running.
    const suffix = tools.running.count > 1 ? ` ×${tools.running.count}` : ''
    return { label: `${t('card.tool.running')} ${tools.running.name}${suffix}`, value: fmtDuration(tools.running.ms) }
  }
  return { label: key, value: DASH, tone: 'muted' }
}

export default defineWidget({
  id: 'tool',
  name: () => t('widget.tool.name'),
  desc: () => t('widget.tool.desc'),
  builtin: true,
  group: 'system',
  configSchema: [
    {
      key: 'metrics',
      label: () => t('config.metricsLabel'),
      type: 'metrics',
      default: [...DEFAULT_METRICS],
      max: MAX_METRICS,
      options: METRICS.map((m): [string, () => string] => [m.key, () => t(m.label)]),
      // The stock 'metrics' hint describes a figures row folding into two lines of
      // five; these picks become three STACKED rows, so the field says its own.
      hint: () => t('card.tool.hint', { max: MAX_METRICS }),
    } satisfies ConfigField,
  ],
  render: (s) => {
    const tools = s.tools
    if (!tools || (tools.calls === 0 && tools.running === null)) return null
    // Storage order IS the card's top-to-bottom order. An unknown key is dropped
    // (a metric renamed in a later build can never wedge the card), and an empty
    // pick falls back to the default three — the picker's own rule, mirrored here.
    const stored = Array.isArray(s.metrics) ? (s.metrics as unknown[]).filter((k): k is string => typeof k === 'string') : []
    const picked = stored.filter((k) => METRICS.some((m) => m.key === k))
    const keys = (picked.length > 0 ? picked : DEFAULT_METRICS).slice(0, MAX_METRICS)
    const rows = keys.map((k) => buildRow(k, tools, s))
    return {
      title: t('widget.tool.name'),
      // The duration is the headline: 20px under the blue title, the call counts as
      // the grey caption beneath it. `value` is deliberately NOT set — it would be
      // pushed into the body a second time (see CardBody).
      headAfter: { big: fmtDuration(s.toolMs) },
      legend: t('card.tool.calls', { n: tools.calls, m: tools.tools }),
      // Bottom-anchored like every other card: the detail rows sit on the tile's
      // floor instead of marooning the leftover height underneath them.
      bodyAnchor: 'bottom',
      ...(rows.length > 0 ? { chart: { kind: 'breakdown' as const, breakdown: rows } } : {}),
    }
  },
  // Widget-owned preview data: with no live session there is no tool fold, and the
  // card must still be reviewable in the market / 组件配置 previews (the live
  // record wins over this the moment a session has calls — see buildPreviewStats).
  // `llmMs` rides along so 工具耗时占比 previews a plausible share instead of
  // dividing by the shared filler's 19-minute model time.
  example: {
    stats: {
      toolMs: 74_500,
      llmMs: 210_000,
      tools: {
        calls: 23, tools: 5, failures: 1,
        slowest: { name: 'Bash', ms: 21_400 },
        running: { name: 'grep', ms: 3_100, count: 2 },
      },
    },
    // 「正在执行」 is a TRANSIENT state, and it does NOT vanish between calls: the
    // row stays and prints `—` (see buildRow). `slowest` behaves the same way when
    // every call head has been truncated out of the loaded window.
  },
})
