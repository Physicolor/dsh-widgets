import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { usageRender } from '../../client/lib/usage-view'

/** OpenCode Go monthly usage quota (single-window percent card). */
export default defineWidget({
  id: 'usage-monthly',
  name: () => t('widget.usage-monthly.name'),
  desc: () => t('widget.usage-monthly.desc'),
  builtin: false,
  group: 'opencode-go',
  badgeLabel: () => t('badge.opencode'),
  render: usageRender('monthly', 'widget.usage-monthly.name'),
})