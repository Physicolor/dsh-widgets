import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccWindowsRender } from '../../client/lib/cc-view'

/** Command Code 5h / weekly quota windows as two donuts. */
export default defineWidget({
  id: 'cc-windows',
  name: () => t('widget.cc-windows.name'),
  desc: () => t('widget.cc-windows.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccWindowsRender,
})