import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccWindowValueRender } from '../../client/lib/cc-view'

/** Command Code weekly window usage percent. */
export default defineWidget({
  id: 'cc-window-weekly',
  name: () => t('widget.cc-window-weekly.name'),
  desc: () => t('widget.cc-window-weekly.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccWindowValueRender('weekly'),
})