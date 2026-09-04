import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { intervalSchema, sysCpuRender } from '../../client/lib/sys-view'

/** CPU utilization as a big number with a memory line (title + number card). */
export default defineWidget({
  id: 'sys-cpu',
  name: () => t('widget.sys-cpu.name'),
  desc: () => t('widget.sys-cpu.desc'),
  builtin: false,
  group: 'device',
  configSchema: intervalSchema(),
  render: sysCpuRender,
})