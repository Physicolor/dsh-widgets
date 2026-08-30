import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** Turns · Steps — session turn & step counts. Mirrors the official composer
 *  stats bar's first cell. */
export default defineWidget({
  id: 'counts',
  name: () => t('widget.counts.name'),
  desc: () => t('widget.counts.desc'),
  builtin: true,
  group: 'system',
  render: (s) => ({ title: t('widget.counts.name'), value: t('card.counts.value', { turns: s.turns, steps: s.steps }) }),
})