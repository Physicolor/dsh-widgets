import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { intervalSchema, sysRingsRender } from '../../client/lib/sys-view'

/** CPU + GPU utilization as two side-by-side donuts (ring placeholder card). */
export default defineWidget({
  id: 'sys-rings',
  name: () => t('widget.sys-rings.name'),
  desc: () => t('widget.sys-rings.desc'),
  builtin: false,
  group: 'device',
  configSchema: intervalSchema(),
  render: sysRingsRender,
})