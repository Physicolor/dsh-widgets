import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { usageRender } from '../../client/lib/usage-view'

/** OpenCode Go weekly usage quota (single-window percent card). */
export default defineWidget({
  id: 'usage-weekly',
  name: () => t('widget.usage-weekly.name'),
  desc: () => t('widget.usage-weekly.desc'),
  builtin: false,
  group: 'opencode-go',
  badgeLabel: () => t('badge.opencode'),
  render: usageRender('weekly', 'widget.usage-weekly.name'),
})