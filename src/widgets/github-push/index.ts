import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { githubConfigSchema, githubPreviewStats, githubPushRender } from '../../client/lib/github-view'

/** Last push distance + newest release tag: "is this repo alive, and what did
 *  it last ship". */
export default defineWidget({
  id: 'github-push',
  name: () => t('widget.github-push.name'),
  desc: () => t('widget.github-push.desc'),
  builtin: false,
  group: 'github',
  sizes: ['2x2'],
  configSchema: githubConfigSchema(),
  render: githubPushRender,
  example: { stats: githubPreviewStats },
})
