import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { gpuMetricOptions, intervalSchema, bigMetricSchema } from '../../client/families/sys/data'
import { sysGpuRender } from '../../client/families/sys/renders'

/** GPU VRAM as a big number with utilization/temperature line (title + number
 *  card). */
export default defineWidget({
  id: 'sys-gpu',
  name: () => t('widget.sys-gpu.name'),
  desc: () => t('widget.sys-gpu.desc'),
  builtin: false,
  group: 'device',
  configSchema: [ ...intervalSchema(), bigMetricSchema(gpuMetricOptions()) ],
  render: sysGpuRender,
})