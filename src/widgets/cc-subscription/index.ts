import { defineWidget, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccSubscriptionRender, PLAN_TIER_STEPS } from '../../client/lib/cc-view'

const DAY_MS = 86_400_000

/** Preview payload: a live-shaped GOAT subscription ending 26 days out, so the
 *  card shows a real period line and a real badge instead of the shared mock. */
function previewStats(): Partial<WidgetStats> {
  const now = new Date()
  return {
    commandCode: {
      whoami: null,
      usage: null,
      credits: null,
      subscription: {
        success: true,
        data: {
          planId: 'individual-goat',
          status: 'active',
          currentPeriodStart: new Date(now.getTime() - 4 * DAY_MS).toISOString(),
          currentPeriodEnd: new Date(now.getTime() + 26 * DAY_MS).toISOString(),
        },
      },
    },
  }
}

/** Command Code plan tier + billing period end (subscriptions). A preview click
 *  walks the plan ladder (GOAT → Pro → Max → Ultra → Provider → Go → Teams Pro),
 *  because that badge is the whole card and no install owns every plan. */
export default defineWidget({
  id: 'cc-subscription',
  name: () => t('widget.cc-subscription.name'),
  desc: () => t('widget.cc-subscription.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccSubscriptionRender,
  simToggle: () => t('widget.cc-subscription.simToggle'),
  example: { stats: previewStats, sim: { plan: 'individual-goat' }, simSteps: PLAN_TIER_STEPS },
})
