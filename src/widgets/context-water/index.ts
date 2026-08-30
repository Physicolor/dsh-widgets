import { defineWidget, type WidgetRenderMeta } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** Context water level card — official JObwrW template: title「上下文已用」with
 *  a right-hand figures (~X / window), the percentage under it, and a
 *  system/tools/messages segmented bar + per-segment rows. Purely informational. */
function contextWaterRender(stats: Parameters<ReturnType<typeof defineWidget>['render']>[0], meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const pct = stats.contextPercent
  const brk = stats.contextBreakdown
  const win = stats.contextWindow
  if (pct == null || !brk) return null
  const sys = brk.systemTokens || 0
  const tools = brk.toolsTokens || 0
  const msg = brk.messageTokens || 0
  const total = sys + tools + msg
  const fmt = (n: number): string => {
    if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`
    if (n >= 1000) return `${Math.round(n / 100) / 10}K`
    return String(n)
  }
  const used = win ? fmt(total) : null
  const capacity = win ? fmt(win) : null
  const segments = [
    { label: t('card.contextWater.system'), tokens: sys, tone: 'muted' as const },
    { label: t('card.contextWater.tools'), tokens: tools, tone: 'success' as const },
    { label: t('card.contextWater.messages'), tokens: msg, tone: 'primary' as const },
  ]
  if (meta?.size === '2x4') {
    // 2×4 variant: the percent + concrete figures move up into the top-right
    // header row (value + headRight), and the segmented bar stretches across the
    // full extended width below. Everything else matches the 2×2 version.
    return {
      title: t('card.contextWater.title'),
      value: `${Math.round(pct * 100)}%`,
      headRight: used && capacity ? `${used} / ${capacity}` : undefined,
      chart: total > 0 ? { kind: 'segments', segments, totalTokens: total } : undefined,
    }
  }
  return {
    title: t('card.contextWater.title'),
    // Percent + concrete figures sit on their own row below the title
    // (user preference over the inline header).
    headAfter: {
      big: `${Math.round(pct * 100)}%`,
      small: used && capacity ? `${used} / ${capacity}` : undefined,
    },
    chart: total > 0 ? { kind: 'segments', segments, totalTokens: total } : undefined,
  }
}

export default defineWidget({
  id: 'context-water',
  name: () => t('widget.context-water.name'),
  desc: () => t('widget.context-water.desc'),
  builtin: true,
  group: 'system',
  sizes: ['2x2', '2x4'],
  render: contextWaterRender,
})