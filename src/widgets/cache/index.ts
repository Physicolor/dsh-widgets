import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** Cache hit — input cache-hit ratio (hidden until a cache read is observed). */
export default defineWidget({
  id: 'cache',
  name: () => t('widget.cache.name'),
  desc: () => t('widget.cache.desc'),
  builtin: true,
  group: 'system',
  render: (s) => (s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? { title: t('widget.cache.name'), value: `${Math.round((s.usage.cacheReadTokens / s.usage.inputTokens) * 100)}%` } : null),
})