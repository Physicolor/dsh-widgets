import type { WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../lib/contract/types'
import { t } from '../../i18n'
import { buildGitHubGrid, fmtAgo, sumGrid } from '../../lib/format'
import { repoShort, selectedRepo, repoCycle, emptyHint } from './data'

export function figure(label: string, value: string): { label: string; value: string } {
  return { label, value }
}

/** The contribution calendar. 2×2 covers ~3 months (13 week-columns), 2×4 the
 *  last year (53) — the shape of GitHub's own graph, and the reason the figures
 *  are per-window the same way the token heatmap's are. */
export function githubContribRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const calendar = stats.github?.contributions ?? null
  if (calendar === null || calendar.days.length === 0) {
    return { title: t('github.contrib.title'), value: '—', legend: emptyHint(stats, 'contributions') }
  }
  const wide = meta?.size === '2x4'
  const grid = buildGitHubGrid(calendar.days, wide ? 53 : 13)
  const label = t('github.contrib.total', { n: sumGrid(grid) })
  return {
    title: t('github.contrib.title'),
    ...(wide ? { headRight: label } : { legend: label }),
    chart: { kind: 'heatmap', heatmap: grid, heatmapPalette: 'github', heatmapUnit: t('github.contrib.unit') },
  }
}

/** Stars (+ forks): the slowest-moving figure of the family, which is why it
 *  is a 2×2 and not a headline. */
export function githubStarsRender(stats: WidgetStats): WidgetRenderOut {
  const repo = selectedRepo(stats)
  if (repo === null) return { title: t('github.stars'), value: '—', legend: emptyHint(stats, 'repos') }
  return {
    title: t('github.stars'),
    legend: repoShort(repo.fullName),
    value: String(repo.stars),
    sub: `${repo.forks} ${t('github.forks')}`,
    cycle: repoCycle(stats),
  }
}

/** Open issues, with the unanswered count — the one figure in the family that
 *  implies an action. `unanswered === null` (anonymous, no token) prints the
 *  honest "needs a token" line instead of a zero nobody measured. */
export function githubIssuesRender(stats: WidgetStats): WidgetRenderOut {
  const repo = selectedRepo(stats)
  if (repo === null) return { title: t('github.issues'), value: '—', legend: emptyHint(stats, 'repos') }
  return {
    title: t('github.issues'),
    legend: repoShort(repo.fullName),
    value: `${repo.openIssues}${repo.issueCountCapped ? '+' : ''}`,
    sub: repo.unanswered === null ? t('github.unansweredUnknown') : `${repo.unanswered} ${t('github.unanswered')}`,
    cycle: repoCycle(stats),
  }
}

/** When it last moved, and the newest release tag. */
export function githubPushRender(stats: WidgetStats): WidgetRenderOut {
  const repo = selectedRepo(stats)
  if (repo === null) return { title: t('github.push'), value: '—', legend: emptyHint(stats, 'repos') }
  return {
    title: t('github.push'),
    legend: repoShort(repo.fullName),
    value: fmtAgo(repo.pushedAt),
    sub: repo.release === null ? t('github.noRelease') : t('github.release', { tag: repo.release.tag }),
    cycle: repoCycle(stats),
  }
}

/** The 2×4 board: the four readings of ONE repo side by side. */
export function githubBoardRender(stats: WidgetStats): WidgetRenderOut {
  const repo = selectedRepo(stats)
  if (repo === null) return { title: t('github.board.title'), value: '—', legend: emptyHint(stats, 'repos') }
  const release = repo.release === null ? t('github.noRelease') : t('github.release', { tag: repo.release.tag })
  return {
    title: t('github.board.title'),
    legend: `${repo.fullName} · ${release}`,
    chart: {
      kind: 'figures',
      figures: [
        figure(t('github.stars'), String(repo.stars)),
        figure(t('github.issues'), `${repo.openIssues}${repo.issueCountCapped ? '+' : ''}`),
        figure(t('github.unanswered'), repo.unanswered === null ? '—' : String(repo.unanswered)),
        figure(t('github.push'), fmtAgo(repo.pushedAt)),
      ],
    },
    bodyAnchor: 'bottom',
    cycle: repoCycle(stats),
  }
}
