import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { githubConfigSchema, githubPreviewStats } from '../../client/families/github/data'
import { githubContribRender } from '../../client/families/github/renders'

/** GitHub contribution calendar — GitHub's own five-step green grid, drawn by
 *  the same heatmap renderer as the token calendar (only the palette and the
 *  meaning of a cell differ). 2×2 covers ~3 months, 2×4 the last year, which
 *  is the window GitHub's own profile header reports. */
export default defineWidget({
  id: 'github-contrib',
  name: () => t('widget.github-contrib.name'),
  desc: () => t('widget.github-contrib.desc'),
  builtin: false,
  group: 'github',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2', '2x4'],
  configSchema: githubConfigSchema(),
  render: githubContribRender,
  example: { stats: githubPreviewStats },
})
