import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { intervalSchema, sysGpuLineRender } from '../../client/lib/sys-view'

/** GPU utilization sparkline (Windows-task-manager style) with the current
 *  utilization as the big figure. */
export default defineWidget({
  id: 'sys-gpu-line',
  name: () => t('widget.sys-gpu-line.name'),
  desc: () => t('widget.sys-gpu-line.desc'),
  builtin: false,
  group: 'device',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor, not
  // the manifest — gen-registry now fails the build when the two disagree.
  sizes: ['2x2'],
  configSchema: intervalSchema(),
  render: sysGpuLineRender,
})