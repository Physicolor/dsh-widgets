import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { usageRender } from '../../client/lib/usage-view'

/** OpenCode Go rolling-window usage quota (single-window percent card). */
export default defineWidget({
  id: 'usage-rolling',
  name: () => t('widget.usage-rolling.name'),
  desc: () => t('widget.usage-rolling.desc'),
  builtin: false,
  group: 'opencode-go',
  badgeLabel: () => t('badge.opencode'),
  render: usageRender('rolling', 'widget.usage-rolling.name'),
})