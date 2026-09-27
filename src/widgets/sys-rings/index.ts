import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { intervalSchema } from '../../client/families/sys/data'
import { sysRingsRender } from '../../client/families/sys/renders'

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