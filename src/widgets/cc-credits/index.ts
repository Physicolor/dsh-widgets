import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccCreditsRender } from '../../client/families/cc/renders'

/** Command Code credit balance + 5h / weekly quota bars. */
export default defineWidget({
  id: 'cc-credits',
  name: () => t('widget.cc-credits.name'),
  desc: () => t('widget.cc-credits.desc'),
  builtin: false,
  group: 'commandcode',
  badgeLabel: () => t('badge.commandcode'),
  render: ccCreditsRender,
})