import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'

/** Average first-token latency (per completed TTFT step). */
export default defineWidget({
  id: 'ttft',
  name: () => t('widget.ttft.name'),
  desc: () => t('widget.ttft.desc'),
  builtin: true,
  group: 'system',
  render: (s) => (s.ttftSteps > 0 ? { title: t('widget.ttft.name'), value: fmtDuration(s.ttftMs / s.ttftSteps) } : null),
})