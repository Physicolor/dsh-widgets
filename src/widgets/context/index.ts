import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** One-click compaction: shows context usage percent (bottom-left) and a
 *  top-right brand-blue round → armed「确认」capsule (two taps to compact). */
function contextRender(stats: Parameters<ReturnType<typeof defineWidget>['render']>[0]): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const p = stats.contextPercent
  const pct = p == null ? null : Math.round(p * 100)
  const armed = stats.armedAction === 'contextCompact'
  return {
    title: t('card.context.title'),
    value: pct == null ? undefined : `${pct}%`,
    sub: pct == null ? t('card.context.waiting') : undefined,
    corner: { id: 'contextCompact', label: t('card.context.compact'), armedLabel: t('card.context.confirm'), armed, pos: 'bottom' },
  }
}

export default defineWidget({
  id: 'context',
  name: () => t('widget.context.name'),
  desc: () => t('widget.context.desc'),
  builtin: true,
  group: 'system',
  render: contextRender,
})