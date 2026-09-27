import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { ccWindowValueRender } from '../../client/families/cc/renders'

/** Command Code monthly (billing-period) usage percent. The API serves no
 *  monthly window object, so this figure is derived by conservation:
 *  used = totalMonthlyCredits, cap = used + credits.monthlyCredits. */
export default defineWidget({
  id: 'cc-window-monthly',
  name: () => t('widget.cc-window-monthly.name'),
  desc: () => t('widget.cc-window-monthly.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccWindowValueRender('monthly'),
})