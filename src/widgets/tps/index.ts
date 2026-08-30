import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { fmtTps } from '../../client/lib/format'

/** Rate — decode throughput in tok/s (stays hidden until a decode ran). */
export default defineWidget({
  id: 'tps',
  name: () => t('widget.tps.name'),
  desc: () => t('widget.tps.desc'),
  builtin: true,
  group: 'system',
  render: (s) => (s.decodeMs > 0 ? { title: t('widget.tps.name'), value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1000))} tok/s` } : null),
})