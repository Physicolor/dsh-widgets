import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { githubConfigSchema, githubPreviewStats } from '../../client/families/github/data'
import { githubIssuesRender } from '../../client/families/github/renders'

/** Open issues (PRs excluded) plus how many nobody has answered — the only
 *  GitHub figure that implies an action. */
export default defineWidget({
  id: 'github-issues',
  name: () => t('widget.github-issues.name'),
  desc: () => t('widget.github-issues.desc'),
  builtin: false,
  group: 'github',
  sizes: ['2x2'],
  configSchema: githubConfigSchema(),
  render: githubIssuesRender,
  example: { stats: githubPreviewStats },
})
