import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'

/** LLM time — cumulative model inference time (stays hidden until > 0). */
export default defineWidget({
  id: 'llm',
  name: () => t('widget.llm.name'),
  desc: () => t('widget.llm.desc'),
  builtin: true,
  group: 'system',
  render: (s) => (s.llmMs > 0 ? { title: t('widget.llm.name'), value: fmtDuration(s.llmMs) } : null),
})