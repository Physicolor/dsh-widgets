import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { intervalSchema, sysBoardRender } from '../../client/lib/sys-view'

/** 2×4 monitoring dashboard: every hardware metric as a ring. */
export default defineWidget({
  id: 'sys-board',
  name: () => t('widget.sys-board.name'),
  desc: () => t('widget.sys-board.desc'),
  builtin: false,
  group: 'device',
  configSchema: intervalSchema(),
  render: sysBoardRender,
})