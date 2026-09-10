import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccSubscriptionRender } from '../../client/lib/cc-view'

/** Command Code plan + billing period end (subscriptions). */
export default defineWidget({
  id: 'cc-subscription',
  name: () => t('widget.cc-subscription.name'),
  desc: () => t('widget.cc-subscription.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccSubscriptionRender,
})