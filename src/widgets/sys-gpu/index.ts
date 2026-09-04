import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { intervalSchema, sysGpuRender } from '../../client/lib/sys-view'

/** GPU VRAM as a big number with utilization/temperature line (title + number
 *  card). */
export default defineWidget({
  id: 'sys-gpu',
  name: () => t('widget.sys-gpu.name'),
  desc: () => t('widget.sys-gpu.desc'),
  builtin: false,
  group: 'system',
  configSchema: intervalSchema(),
  render: sysGpuRender,
})