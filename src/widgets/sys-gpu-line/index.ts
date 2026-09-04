import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { intervalSchema, SPARK_POINTS_OPTS, sysGpuLineRender } from '../../client/lib/sys-view'

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
  configSchema: [
    ...intervalSchema(),
    // Sparkline sample window: keep the line readable — only the most recent
    // N points are drawn (host buffer holds up to 120).
    { key: 'points', label: () => t('sysinfo.points'), type: 'mode', default: '20', options: SPARK_POINTS_OPTS },
  ],
  render: sysGpuLineRender,
})