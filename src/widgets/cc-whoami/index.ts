import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { ccWhoamiRender } from '../../client/families/cc/renders'

/** Command Code account identity (whoami). */
export default defineWidget({
  id: 'cc-whoami',
  name: () => t('widget.cc-whoami.name'),
  desc: () => t('widget.cc-whoami.desc'),
  builtin: false,
  group: 'commandcode',
  render: ccWhoamiRender,
})