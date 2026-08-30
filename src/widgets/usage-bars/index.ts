import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { usageBarsRender } from '../../client/lib/usage-view'

/** OpenCode Go dosage as one bar chart across the three windows. */
export default defineWidget({
  id: 'usage-bars',
  name: () => t('widget.usage-bars.name'),
  desc: () => t('widget.usage-bars.desc'),
  builtin: false,
  group: 'opencode-go',
  badgeLabel: () => t('badge.opencode'),
  render: usageBarsRender,
})