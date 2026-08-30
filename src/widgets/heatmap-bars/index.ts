import { defineWidget, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { dayKey, fmtTokens, lastNDays, lastNDaysWeekly } from '../../client/lib/format'

/** Token usage last-7-days bar chart — vertical bars, oldest→newest left→
 *  right. X-axis labels are short month.day (only the first/last shown, on the
 *  bottom corners); the legend is two plain figures (today / 7-day total, no
 *  "今日/近7天" words). A horizontal x-axis baseline runs under the bars. The
 *  bar area height matches the 2×2 calendar grid's content height. */
function heatmapBarsRender(stats: WidgetStats): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const rawLog = stats.heatmapRaw
  if (!rawLog) return null
  // Window alignment: rolling = last 7 days ending today; weekly = the 7 bars
  // of the current calendar week (Sunday-aligned), per the config option.
  const mode = stats.monthMode as string | undefined
  const bars = mode === 'weekly' ? lastNDaysWeekly(rawLog, 7) : lastNDays(rawLog, 7)
  if (!bars.length) return null
  const today = rawLog[dayKey(new Date())] ?? 0
  const weekTotal = bars.reduce((a, b) => a + b.value, 0)
  const legend = today > 0 || weekTotal > 0 ? `${fmtTokens(today)}  ${fmtTokens(weekTotal)}` : undefined
  return {
    title: t('card.heatmap.title'),
    legend,
    chart: { kind: 'barsV', bars },
  }
}

export default defineWidget({
  id: 'heatmap-bars',
  name: () => t('widget.heatmap-bars.name'),
  desc: () => t('widget.heatmap-bars.desc'),
  builtin: true,
  group: 'coding-plan',
  render: heatmapBarsRender,
  configSchema: [
    { key: 'monthMode', label: () => t('config.monthMode'), type: 'mode', default: 'rolling', options: [['rolling', () => t('config.monthMode.rolling7')], ['weekly', () => t('config.monthMode.weekly')]] },
  ],
})