import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { ccUsageRender } from '../../client/families/cc/renders'

/** Command Code usage summary (requests / success / tokens / spend). */
export default defineWidget({
  id: 'cc-usage',
  name: () => t('widget.cc-usage.name'),
  desc: () => t('widget.cc-usage.desc'),
  builtin: false,
  group: 'commandcode',
  render: ccUsageRender,
})