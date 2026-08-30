import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { fmtTokens } from '../../client/lib/format'

/** Tokens — input & output token counts (stays hidden until an input is seen). */
export default defineWidget({
  id: 'tokens',
  name: () => t('widget.tokens.name'),
  desc: () => t('widget.tokens.desc'),
  builtin: true,
  group: 'system',
  render: (s) => (s.usage && s.usage.inputTokens > 0 ? { title: t('widget.tokens.name'), value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}` } : null),
})