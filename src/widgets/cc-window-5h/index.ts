import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccWindowValueRender } from '../../client/lib/cc-view'

/** Command Code 5-hour window usage percent. */
export default defineWidget({
  id: 'cc-window-5h',
  name: () => t('widget.cc-window-5h.name'),
  desc: () => t('widget.cc-window-5h.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccWindowValueRender('fiveHour'),
})