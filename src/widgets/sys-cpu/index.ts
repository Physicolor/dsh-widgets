import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { cpuMetricOptions, intervalSchema, bigMetricSchema } from '../../client/families/sys/data'
import { sysCpuRender } from '../../client/families/sys/renders'

/** CPU utilization as a big number with a memory line (title + number card). */
export default defineWidget({
  id: 'sys-cpu',
  name: () => t('widget.sys-cpu.name'),
  desc: () => t('widget.sys-cpu.desc'),
  builtin: false,
  group: 'device',
  configSchema: [ ...intervalSchema(), bigMetricSchema(cpuMetricOptions()) ],
  render: sysCpuRender,
})