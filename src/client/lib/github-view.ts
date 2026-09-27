/**
 * dsh-widgets — GitHub family shared view helpers (contract-stable core).
 *
 * Five units (`github-contrib` / `github-stars` / `github-issues` /
 * `github-push` / `github-board`) read ONE host payload (`/api/github`, see
 * `src/index.ts`) and share everything about how it becomes a card: the two
 * config fields, which repo a pulse card is about, the tap-cycle across
 * several repos, and the degraded card for every way the payload can be thin.
 * A unit therefore holds only its own descriptor + dictionary.
 *
 * The family is deliberately split rather than merged into one 2×2 tile:
 * these are four independent readings (how much you contributed, how many
 * stars, whether anyone is waiting on you, when it last moved), and the card
 * grammar gives ONE dominant figure per 150px tile. `github-board` is the 2×4
 * that puts them side by side for the wide-slot case.
 */

import { type ConfigField, type GitHubContribDay, type GitHubRepo, type WidgetRenderMeta, type WidgetRenderOut, type WidgetStats } from './contract'
import { t } from '../i18n'
import { buildGitHubGrid, dayKey, fmtAgo, sumGrid } from './format'

/** The fields every GitHub card shares. Both are OPTIONAL on purpose: empty
 *  means "whatever this machine is signed in as" (the host resolves the login
 *  from the credential / `gh` CLI), so a fresh install shows the user's own
 *  numbers with nothing typed. */
export function githubConfigSchema(): ConfigField[] {
  return [
    { key: 'user', label: () => t('config.github.user'), type: 'text', default: '' },
    { key: 'repos', label: () => t('config.github.repos'), type: 'text', default: '' },
  ]
}

/** `Physicolor/dsh-widgets` -> `dsh-widgets` (the card has 150px, the owner
 *  usually does not disambiguate anything). */
export function repoShort(fullName: string): string {
  const slash = fullName.lastIndexOf('/')
  return slash === -1 ? fullName : fullName.slice(slash + 1)
}

/** The repo a pulse card reads: the family's shared selection (`ghRepo`,
 *  written by any card's tap-cycle and persisted per instance) or the first
 *  repo the host answered with. */
export function selectedRepo(stats: WidgetStats): GitHubRepo | null {
  const repos = stats.github?.repos ?? []
  if (repos.length === 0) return null
  const wanted = typeof stats.ghRepo === 'string' ? stats.ghRepo : ''
  return repos.find((repo) => repo.fullName === wanted) ?? repos[0] ?? null
}

/** Tap-to-cycle across the answered repos. Every repo card carries the SAME
 *  modes + store, so tapping any one of them moves the whole family — the
 *  usage/cc pool family's behaviour, for the same reason (several cards, one
 *  subject). Absent with a single repo: nothing to switch to, so no gesture. */
export function repoCycle(stats: WidgetStats): WidgetRenderOut['cycle'] {
  const repos = stats.github?.repos ?? []
  if (repos.length < 2) return undefined
  const current = selectedRepo(stats)?.fullName ?? repos[0]!.fullName
  return { modes: repos.map((repo) => repo.fullName), current, hint: t('github.cycle', { chain: repos.map((r) => repoShort(r.fullName)).join(' → ') }), store: 'ghRepo' }
}

/** Why a GitHub card has nothing to show. Reads the SHELL-facing error first
 *  (the route itself never answered) and falls back to what the payload said
 *  about its own slices, so "restart dsh web" is never confused with "you are
 *  not signed in". */
function emptyHint(stats: WidgetStats, slice: 'contributions' | 'repos'): string {
  if (stats.githubError !== null && stats.githubError !== undefined) {
    return stats.githubError === 'unloaded' ? t('github.staleHost') : t('github.unavailable')
  }
  const note = stats.github?.errors?.[slice]
  if (note === 'no-user' || note === 'no-repo') return slice === 'contributions' ? t('github.noUser') : t('github.noRepo')
  return slice === 'contributions' ? t('github.noUser') : t('github.noRepo')
}

/** One figure + its name, for the board's figures row. */
function figure(label: string, value: string): { label: string; value: string } {
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

/** Deterministic contribution history for the previews: a year of days with
 *  weekends quieter and a few runs, generated from a fixed LCG so every
 *  preview render (market, 组件配置, tests) shows the same picture. */
function previewContribDays(): GitHubContribDay[] {
  const days: GitHubContribDay[] = []
  const now = new Date()
  let seed = 7
  for (let back = 370; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    seed = (seed * 1103515245 + 12345) % 2147483648
    const r = seed / 2147483648
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const count = r < (weekend ? 0.62 : 0.32) ? 0 : Math.round(1 + r * (weekend ? 7 : 24))
    days.push({
      date: dayKey(d),
      count,
      level: count === 0 ? 0 : count < 3 ? 1 : count < 8 ? 2 : count < 16 ? 3 : 4,
    })
  }
  return days
}

/** Widget-owned preview payload: what the market / 组件配置 surfaces feed the
 *  family so every card renders its real shape with no network call and no
 *  credentials (the units' `example.stats`). */
export function githubPreviewStats(): Partial<WidgetStats> {
  const days = previewContribDays()
  const repo: GitHubRepo = {
    fullName: 'Physicolor/dsh-widgets',
    stars: 5,
    forks: 0,
    openIssues: 1,
    issueCountCapped: false,
    unanswered: 0,
    pushedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    release: { tag: 'v1.7.0', name: 'v1.7.0', publishedAt: new Date(Date.now() - 6 * 3600_000).toISOString() },
    newestIssue: { number: 1, title: '', comments: 3, updatedAt: new Date(Date.now() - 30 * 86400_000).toISOString() },
  }
  return {
    github: {
      auth: 'gh',
      login: 'Physicolor',
      contributions: {
        login: 'Physicolor',
        total: days.reduce((sum, d) => sum + d.count, 0),
        source: 'graphql',
        days,
        streak: 4,
        longest: 11,
      },
      repos: [repo],
      errors: {},
    },
    githubError: null,
  }
}
