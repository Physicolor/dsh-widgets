import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccWhoamiRender } from '../../client/lib/cc-view'

/** Command Code account identity (whoami). */
export default defineWidget({
  id: 'cc-whoami',
  name: () => t('widget.cc-whoami.name'),
  desc: () => t('widget.cc-whoami.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccWhoamiRender,
})