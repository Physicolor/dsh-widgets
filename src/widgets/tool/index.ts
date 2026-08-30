import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'

/** Tool calls — cumulative tool call time (stays hidden until > 0). */
export default defineWidget({
  id: 'tool',
  name: () => t('widget.tool.name'),
  desc: () => t('widget.tool.desc'),
  builtin: true,
  group: 'system',
  render: (s) => (s.toolMs > 0 ? { title: t('widget.tool.name'), value: fmtDuration(s.toolMs) } : null),
})