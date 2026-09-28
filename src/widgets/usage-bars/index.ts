import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { usageBarsRender } from '../../client/families/usage/renders'

/** OpenCode Go dosage as one bar chart across the three windows. */
export default defineWidget({
  id: 'usage-bars',
  name: () => t('widget.usage-bars.name'),
  desc: () => t('widget.usage-bars.desc'),
  builtin: false,
  group: 'opencode-go',
  render: usageBarsRender,
})