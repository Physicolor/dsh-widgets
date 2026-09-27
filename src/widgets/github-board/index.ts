import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { githubConfigSchema, githubPreviewStats } from '../../client/families/github/data'
import { githubBoardRender } from '../../client/families/github/renders'

/** The 2×4 board: the family's four readings of ONE repo side by side. */
export default defineWidget({
  id: 'github-board',
  name: () => t('widget.github-board.name'),
  desc: () => t('widget.github-board.desc'),
  builtin: false,
  group: 'github',
  sizes: ['2x4'],
  configSchema: githubConfigSchema(),
  render: githubBoardRender,
  example: { stats: githubPreviewStats },
})
