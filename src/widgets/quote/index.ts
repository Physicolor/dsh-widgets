import { defineWidget, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** A quote card only renders content when the user typed a custom text — no
 *  default filler (which used to rotate on every render and re-render). */
function quoteRender(stats: WidgetStats): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const text = stats.text as string | undefined
  const showTitle = stats.showTitle as boolean | undefined
  const align = stats.align as 'left' | 'center' | 'right' | undefined
  const valign = stats.valign as 'top' | 'center' | 'bottom' | undefined
  const wrap = stats.wrap as boolean | undefined
  const trimmed = text && text.trim()
  if (!trimmed) return null
  return {
    title: showTitle === false ? '' : t('card.quote.title'),
    rich: { type: 'quote', text: trimmed, align, valign, wrap },
  }
}

export default defineWidget({
  id: 'quote',
  name: () => t('widget.quote.name'),
  desc: () => t('widget.quote.desc'),
  builtin: true,
  group: 'other',
  render: quoteRender,
  configSchema: [
    { key: 'text', label: () => t('config.quoteText'), type: 'text' },
    { key: 'showTitle', label: () => t('config.showTitle'), type: 'toggle', default: true },
    { key: 'align', label: () => t('config.align'), type: 'align', default: 'left' },
    { key: 'valign', label: () => t('config.valign'), type: 'valign', default: 'top' },
    { key: 'wrap', label: () => t('config.wrap'), type: 'toggle', default: true },
  ],
  // Preview mock: the real card renders nothing until the user types a text —
  // the preview seeds a sample so the card shape is reviewable (preview only,
  // never persisted).
  example: {
    stats: () => ({ text: t('quote.previewPlaceholder') }),
  },
})