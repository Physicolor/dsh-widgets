import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { githubConfigSchema, githubPreviewStats } from '../../client/families/github/data'
import { githubStarsRender } from '../../client/families/github/renders'

/** Repo stars (+ forks) — the slowest figure in the family, so it stays a 2×2
 *  tile rather than a headline. */
export default defineWidget({
  id: 'github-stars',
  name: () => t('widget.github-stars.name'),
  desc: () => t('widget.github-stars.desc'),
  builtin: false,
  group: 'github',
  sizes: ['2x2'],
  configSchema: githubConfigSchema(),
  render: githubStarsRender,
  example: { stats: githubPreviewStats },
})
