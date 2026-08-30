import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { usageRingsRender } from '../../client/lib/usage-view'

/** OpenCode Go dosage as three small donuts (one per window). */
export default defineWidget({
  id: 'usage-rings',
  name: () => t('widget.usage-rings.name'),
  desc: () => t('widget.usage-rings.desc'),
  builtin: false,
  group: 'opencode-go',
  badgeLabel: () => t('badge.opencode'),
  render: usageRingsRender,
})