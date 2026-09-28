/**
 * dsh-widgets — the GitHub channel.
 *
 * `/api/github`: the contribution calendar and the repo pulse, with the three-rung
 * credential ladder (credentials seam -> local `gh` CLI -> anonymous) and five
 * separately-cached slices. Split out of `src/index.ts` (Phase H3) unchanged; the
 * slice caches stay at module scope, so their lifetime is what it always was.
 */
import { execFileP } from './exec'
import { memoTtl } from './http'
import { type CredentialsCtx, type HostContext, type ReqLike } from './context'

/* ── GitHub channel (see the `/api/github` route in `apply`) ─────────────── */

/** One day of a contribution calendar (host-side shape; the client contract
 *  mirrors it — the node half is its own project and never imports the web
 *  half's types). */
interface HostContribDay { date: string; count: number; level: number }
/** The contribution calendar the host serves. */
interface HostContributions {
  login: string
  total: number
  source: 'graphql' | 'html'
  days: HostContribDay[]
  streak: number
  longest: number
}
/** One repository's pulse. */
interface HostRepo {
  fullName: string
  stars: number
  forks: number
  openIssues: number
  issueCountCapped: boolean
  unanswered: number | null
  pushedAt: string | null
  release: { tag: string; name: string; publishedAt: string | null } | null
  newestIssue: { number: number; title: string; comments: number; updatedAt: string } | null
}

const GITHUB_API = 'https://api.github.com'
/** Credential refs tried in order. Same seam as every other key in this file. */
const GITHUB_TOKEN_REFS = ['GITHUB_TOKEN', 'GH_TOKEN']
/** Per-request upstream timeout: the contribution page has been measured at
 *  1.0–8.6 s on this machine, so a 9 s budget keeps a slow scrape from being
 *  reported as a failure while still bounding one card's first paint. */
const GITHUB_TIMEOUT_MS = 9000
/** The calendar is expensive (225 KB scraped, or one GraphQL call) and moves
 *  at most once a day — 30 min is both cheap and honest. */
const GITHUB_CONTRIB_TTL_MS = 30 * 60_000
/** Repo pulse: stars/issues/push move on a human timescale, and this TTL is
 *  what keeps an anonymous install inside GitHub's 60/h IP budget
 *  (4 repos × 3 calls ÷ 15 min ≈ 48/h worst case, 12/h for the usual one). */
const GITHUB_REPOS_TTL_MS = 15 * 60_000
/** How long a resolved credential is reused before re-resolving (the `gh`
 *  fallback spawns a process, so it must never run per request). */
const GITHUB_AUTH_TTL_MS = 5 * 60_000
/** Repos one request may ask for (the widget family's own cap too). */
const GITHUB_MAX_REPOS = 4
/** GitHub's API etiquette requires a UA; the HTML path pretends to be a
 *  browser because that endpoint is not an API. */
const GITHUB_UA = 'dsh-widgets (+https://github.com/Physicolor/dsh-widgets)'
const GITHUB_BROWSER_UA = 'Mozilla/5.0 (compatible; dsh-widgets/1.8)'

/** Narrow an unknown JSON value to an object (no arrays). */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}
/** A finite number, else `fallback`. */
function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
/** A non-empty string, else null. */
function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** GET/POST upstream with a hard timeout; returns `{ status, text }` so the
 *  caller can tell a rate limit (403/429) from a missing resource (404). */
async function githubFetch(url: string, init: RequestInit = {}): Promise<{ status: number; text: string; ok: boolean; etag: string | null }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GITHUB_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const text = await res.text()
    return { status: res.status, text, ok: res.ok, etag: res.headers.get('etag') }
  } finally { clearTimeout(timer) }
}

/** GitHub REST headers for a token (or none). */
function githubHeaders(token: string | null): Record<string, string> {
  return {
    'User-Agent': GITHUB_UA,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
  }
}

/** Resolved credential: the token (null when anonymous) and which rung of the
 *  ladder supplied it — the payload reports the rung so a card can say why a
 *  number is missing rather than quietly showing less. */
type GitHubCred = { token: string | null; auth: 'credentials' | 'gh' | 'anonymous' }

/**
 * Resolve the GitHub credential through the three-rung ladder.
 *
 * Rung 2 exists so the widget works with NO configuration at all for anyone who
 * has ever run `gh auth login` — the CLI already holds an OAuth token, and
 * reading it is the same kind of host-side capability as the `nvidia-smi` call
 * this host already makes. It is deliberately OPTIONAL: no `gh`, no login, a
 * sandbox that forbids exec — every failure falls through to anonymous.
 */
async function resolveGitHubCred(ctx: CredentialsCtx): Promise<GitHubCred> {
  for (const ref of GITHUB_TOKEN_REFS) {
    const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
    const value = resolved?.value
    if (value !== undefined && value !== '') return { token: value, auth: 'credentials' }
  }
  try {
    const out = await execFileP('gh', ['auth', 'token'], { timeout: 3000, windowsHide: true }) as { stdout: string }
    const token = String(out.stdout).trim()
    if (token !== '') return { token, auth: 'gh' }
  } catch { /* no gh CLI, not logged in, or exec blocked -> anonymous */ }
  return { token: null, auth: 'anonymous' }
}

/** GitHub's contribution level enum -> the 0..4 bucket the grid draws. */
const GITHUB_LEVELS: Record<string, number> = {
  NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4,
}

/** Chronological day list -> the two run lengths the card shows.
 *
 *  `streak` counts back from TODAY (or from yesterday when today has no
 *  contribution yet) — the day is not over, so an empty today must not read as
 *  "streak broken" the way a naive reverse scan would report it. */
function summariseContribDays(days: Array<{ date: string; count: number }>): { streak: number; longest: number } {
  let longest = 0
  let run = 0
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0
    if (run > longest) longest = run
  }
  const todayKey = new Date().toISOString().slice(0, 10)
  let i = days.length - 1
  if (i >= 0 && days[i]!.date === todayKey && days[i]!.count === 0) i--
  let streak = 0
  for (; i >= 0 && days[i]!.count > 0; i--) streak++
  return { streak, longest }
}

/**
 * The contribution calendar through the OFFICIAL API (GraphQL — the only
 * endpoint that serves it; REST has no contributions resource at all).
 *
 * One call returns every day with its exact count and GitHub's own level.
 */
async function fetchContributionsGraphQL(login: string, token: string): Promise<HostContributions | null> {
  const query = 'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}'
  const res = await githubFetch(`${GITHUB_API}/graphql`, {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login } }),
  })
  if (!res.ok) return null
  let parsed: unknown
  try { parsed = JSON.parse(res.text) } catch { return null }
  const calendar = asRecord(asRecord(asRecord(asRecord(parsed)?.data)?.user)?.contributionsCollection)?.contributionCalendar
  const cal = asRecord(calendar)
  if (cal === null) return null
  const weeks = Array.isArray(cal.weeks) ? cal.weeks : []
  const days: Array<{ date: string; count: number; level: number }> = []
  for (const week of weeks) {
    const list = asRecord(week)?.contributionDays
    if (!Array.isArray(list)) continue
    for (const raw of list) {
      const day = asRecord(raw)
      const date = str(day?.date)
      if (date === null) continue
      days.push({
        date,
        count: Math.max(0, Math.round(num(day?.contributionCount))),
        level: GITHUB_LEVELS[String(day?.contributionLevel ?? '')] ?? 0,
      })
    }
  }
  if (days.length === 0) return null
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const total = days.reduce((sum, d) => sum + d.count, 0)
  return { login, total, source: 'graphql', days, ...summariseContribDays(days) }
}

/**
 * The same calendar SCRAPED from the public contributions page — the token-free
 * path. GitHub renders each day as
 *   `<td data-date="YYYY-MM-DD" id="contribution-day-component-1-4" data-level="2">`
 * and the exact number lives in a sibling
 *   `<tool-tip for="contribution-day-component-1-4">3 contributions on …</tool-tip>`
 * so the count is read by id, with GitHub's level as the floor when a tooltip
 * is missing (a re-localized tooltip still yields the right bucket, only less
 * precision). This is a SCRAPE: it is the fallback, it is reported as `html`,
 * and a structural change makes the slice fail loudly rather than report zeros.
 */
async function fetchContributionsHtml(login: string): Promise<HostContributions | null> {
  const res = await githubFetch(`https://github.com/users/${encodeURIComponent(login)}/contributions`, {
    headers: { 'User-Agent': GITHUB_BROWSER_UA, 'Accept': 'text/html' },
  })
  if (!res.ok) return null
  const html = res.text
  const counts = new Map<string, number>()
  const tipRe = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g
  for (let m = tipRe.exec(html); m !== null; m = tipRe.exec(html)) {
    const digits = /^(\d+)\s/.exec(m[2]!.trim())
    counts.set(m[1]!, digits === null ? 0 : Number(digits[1]))
  }
  const cellRe = /<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g
  const days: Array<{ date: string; count: number; level: number }> = []
  for (let m = cellRe.exec(html); m !== null; m = cellRe.exec(html)) {
    const tag = m[0]!
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? ''
    const level = Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? '0')
    const exact = counts.get(id)
    days.push({ date: m[1]!, count: exact ?? (Number.isFinite(level) ? level : 0), level: Number.isFinite(level) ? level : 0 })
  }
  if (days.length === 0) return null
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const total = days.reduce((sum, d) => sum + d.count, 0)
  return { login, total, source: 'html', days, ...summariseContribDays(days) }
}

/** The calendar for one login: official API when a token exists, scrape
 *  otherwise. Never throws — the caller records the failure per slice. */
async function fetchContributions(login: string, cred: GitHubCred): Promise<{ value: HostContributions | null; error: string | null }> {
  try {
    if (cred.token !== null) {
      const viaApi = await fetchContributionsGraphQL(login, cred.token)
      if (viaApi !== null) return { value: viaApi, error: null }
    }
    const viaHtml = await fetchContributionsHtml(login)
    if (viaHtml !== null) return { value: viaHtml, error: null }
    return { value: null, error: 'unavailable' }
  } catch (error) {
    return { value: null, error: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unavailable' }
  }
}

/**
 * One repository's pulse: 4 upstream reads with a token, 3 without.
 *
 *  - `GET /repos/{o}/{r}` — stars, forks, last push;
 *  - `GET /repos/{o}/{r}/issues?state=open&per_page=100` — open issues with
 *    PRs FILTERED OUT (the repo payload's `open_issues_count` counts both, so
 *    using it would over-report on any repo that takes PRs) plus the newest one;
 *  - `GET /repos/{o}/{r}/releases/latest` — 404 simply means "no release yet";
 *  - (token only) `GET /search/issues?q=repo:…+is:issue+is:open+comments:0` —
 *    how many open issues nobody has answered. Skipped anonymously (search has
 *    its own, much smaller budget) and reported as `unanswered: null`, never as
 *    a zero the card would have to apologise for.
 */
async function fetchGitHubRepo(fullName: string, cred: GitHubCred): Promise<HostRepo | null> {
  const headers = githubHeaders(cred.token)
  const meta = await githubFetch(`${GITHUB_API}/repos/${fullName}`, { headers })
  if (!meta.ok) return null
  let metaJson: unknown
  try { metaJson = JSON.parse(meta.text) } catch { return null }
  const repo = asRecord(metaJson)
  if (repo === null) return null

  let openIssues = 0
  let capped = false
  let newestIssue: HostRepo['newestIssue'] = null
  try {
    const list = await githubFetch(`${GITHUB_API}/repos/${fullName}/issues?state=open&per_page=100`, { headers })
    if (list.ok) {
      const parsed = JSON.parse(list.text) as unknown
      const issues = (Array.isArray(parsed) ? parsed : []).map(asRecord).filter((i): i is Record<string, unknown> => i !== null && i.pull_request === undefined)
      openIssues = issues.length
      capped = issues.length >= 100
      const first = issues[0]
      if (first !== undefined) {
        newestIssue = {
          number: Math.round(num(first.number)),
          title: str(first.title) ?? '',
          comments: Math.round(num(first.comments)),
          updatedAt: str(first.updated_at) ?? '',
        }
      }
    }
  } catch { /* the count stays 0 and the card prints — for it */ }

  let release: HostRepo['release'] = null
  try {
    const rel = await githubFetch(`${GITHUB_API}/repos/${fullName}/releases/latest`, { headers })
    if (rel.ok) {
      const parsed = asRecord(JSON.parse(rel.text) as unknown)
      const tag = str(parsed?.tag_name)
      if (tag !== null) release = { tag, name: str(parsed?.name) ?? tag, publishedAt: str(parsed?.published_at) }
    }
  } catch { /* no release / no network -> null */ }

  let unanswered: number | null = null
  if (cred.token !== null) {
    try {
      const search = await githubFetch(`${GITHUB_API}/search/issues?q=${encodeURIComponent(`repo:${fullName} is:issue is:open comments:0`)}&per_page=1`, { headers })
      if (search.ok) {
        const parsed = asRecord(JSON.parse(search.text) as unknown)
        if (parsed !== null) unanswered = Math.round(num(parsed.total_count))
      }
    } catch { /* stays null: "not measured" is honest, 0 would not be */ }
  }

  return {
    fullName: str(repo.full_name) ?? fullName,
    stars: Math.round(num(repo.stargazers_count)),
    forks: Math.round(num(repo.forks_count)),
    openIssues,
    issueCountCapped: capped,
    unanswered,
    pushedAt: str(repo.pushed_at),
    release,
    newestIssue,
  }
}

/** The payload of the `notif=1` slice: the review queue behind 「待我处理」. */
interface HostNotifications {
  /** Unread threads GitHub reports for this account. */
  count: number
  /** Unread threads per reason, for the card's rows. `other` folds every reason
   *  the card has no row for, so the rows always add up to `count`. */
  byReason: Record<string, number>
  /** The newest unread thread. */
  newest: { title: string; repo: string; reason: string; updatedAt: string; url: string | null } | null
}

/** The notifications slice cache + its ETag, both at module scope for the same
 *  reason the other memos are: a reload must not re-spend the caller's budget. */
const githubNotifMemo = memoTtl<{ value: HostNotifications | null; error: string | null }>(5 * 60_000)
let githubNotifEtag: string | null = null
/** The last successful notifications payload, so a `304 Not Modified` keeps the
 *  card populated instead of blanking it — a 304 means "unchanged", not "empty". */
let githubNotifLast: HostNotifications | null = null

/** The reasons the 「待我处理」 card gives their own row. */
const NOTIF_REASONS = ['review_requested', 'mention', 'assign', 'ci_activity'] as const
/** Threads asked for in one page. A FULL page makes `count` a floor, which the
 *  payload reports as `capped` (see HostNotifications). */
const NOTIF_PAGE = 30

/**
 * `GET /notifications` — the review queue. AUTHENTICATED ONLY.
 *
 * Measured 2026-09-29: anonymous answers **401**, not an empty list, so the slice
 * is reported as absent (`error: 'anonymous'`) rather than as zero threads — the
 * card then does not render at all, which is the honest outcome on a machine with
 * no token and no `gh` login.
 *
 * The ETag is load-bearing: a `304 Not Modified` does NOT consume the account's
 * 5000/h budget (measured: the rate-limit counter stayed at 4993 across a 304),
 * and GitHub's own `x-poll-interval` is 60 s, so a 5-minute cache costs almost
 * nothing while still being fresh enough to act on.
 */
async function fetchNotifications(token: string): Promise<{ value: HostNotifications | null; error: string | null }> {
  try {
    const headers: Record<string, string> = { ...githubHeaders(token), 'If-None-Match': githubNotifEtag ?? '' }
    const res = await githubFetch(`${GITHUB_API}/notifications?all=false&per_page=${NOTIF_PAGE}`, { headers })
    // 304 = unchanged, and it does not consume the hourly budget. The last payload
    // is re-served rather than reported as an error: "unchanged" is not "empty".
    if (res.status === 304) return { value: githubNotifLast, error: githubNotifLast === null ? 'not-modified' : null }
    if (res.status === 401 || res.status === 403) return { value: null, error: `http:${res.status}` }
    if (!res.ok) return { value: null, error: `http:${res.status}` }
    if (res.etag !== null) githubNotifEtag = res.etag
    const parsed = JSON.parse(res.text) as unknown
    const list = (Array.isArray(parsed) ? parsed : []).map(asRecord).filter((n): n is Record<string, unknown> => n !== null)
    const byReason: Record<string, number> = {}
    for (const key of NOTIF_REASONS) byReason[key] = 0
    byReason.other = 0
    for (const thread of list) {
      const reason = str(thread.reason) ?? 'other'
      byReason[NOTIF_REASONS.includes(reason as never) ? reason : 'other'] += 1
    }
    const first = list[0]
    const subject = asRecord(first?.subject)
    githubNotifLast = {
      count: list.length,
      // A full page means the account has AT LEAST this many unread threads; the
      // card prints `30+` rather than a number it cannot stand behind.
      capped: list.length >= NOTIF_PAGE,
      byReason,
      newest: first === undefined ? null : {
        title: str(subject?.title) ?? '',
        repo: str(asRecord(first.repository)?.full_name) ?? '',
        reason: str(first.reason) ?? '',
        updatedAt: str(first.updated_at) ?? '',
        // `subject.url` is an API URL when present (there is no html_url), so it
        // is converted here rather than handed to the client as a link it cannot
        // open. A null subject URL stays null — never a link to nowhere.
        url: notificationsHtmlUrl(str(subject?.url)),
      },
    }
    return { value: githubNotifLast, error: null }
  } catch (error) {
    return { value: null, error: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unavailable' }
  }
}

/** `https://api.github.com/repos/o/r/issues/12` -> `https://github.com/o/r/issues/12`. */
function notificationsHtmlUrl(apiUrl: string | null): string | null {
  if (apiUrl === null) return null
  return apiUrl.startsWith(`${GITHUB_API}/`) ? `https://github.com/${apiUrl.slice(GITHUB_API.length + 1)}` : null
}

/** The slice caches. Declared at module scope on purpose: the route is registered
 *  inside `ctx.effect`, but the memo must outlive a re-registration (a plugin
 *  reload would otherwise re-spend the anonymous budget). */
const githubAuthMemo = memoTtl<GitHubCred>(GITHUB_AUTH_TTL_MS)
const githubViewerMemo = memoTtl<string | null>(30 * 60_000)
const githubRecentMemo = memoTtl<string[]>(GITHUB_REPOS_TTL_MS)
const githubContribMemo = memoTtl<{ value: HostContributions | null; error: string | null }>(GITHUB_CONTRIB_TTL_MS)
const githubReposMemo = memoTtl<HostRepo | null>(GITHUB_REPOS_TTL_MS)

/** The authenticated login (`GET /user`) — what an EMPTY `user` config means.
 *  This is what makes the family work on somebody else's machine with no
 *  configuration: whoever the token belongs to is the calendar's subject. */
async function fetchViewerLogin(cred: GitHubCred): Promise<string | null> {
  if (cred.token === null) return null
  try {
    const res = await githubFetch(`${GITHUB_API}/user`, { headers: githubHeaders(cred.token) })
    if (!res.ok) return null
    return str(asRecord(JSON.parse(res.text) as unknown)?.login)
  } catch { return null }
}

/** The most recently pushed repos the token can see — what an EMPTY `repos`
 *  config means (same zero-config promise as the login above). */
async function fetchRecentRepos(cred: GitHubCred): Promise<string[]> {
  if (cred.token === null) return []
  try {
    const res = await githubFetch(`${GITHUB_API}/user/repos?sort=pushed&direction=desc&affiliation=owner&per_page=${GITHUB_MAX_REPOS}`, { headers: githubHeaders(cred.token) })
    if (!res.ok) return []
    const list = JSON.parse(res.text) as unknown
    return (Array.isArray(list) ? list : [])
      .map((raw) => str(asRecord(raw)?.full_name))
      .filter((name): name is string => name !== null)
  } catch { return [] }
}

/** Assemble the `/api/github` body: the calendar and the repos are resolved
 *  through their own caches and in PARALLEL, so a 9-second scrape delays the
 *  calendar only — the repo numbers land on the first paint either way.
 *
 *  An empty `login` / empty `repos` are NOT errors: they mean "whatever this
 *  machine is signed in as", resolved through the token's own viewer. Without
 *  a token there is nothing to resolve, and each empty slice is reported as
 *  such (`no-user` / `no-repo`) instead of being silently dropped. */
async function buildGitHubBody(ctx: CredentialsCtx, login: string, repos: string[], wantNotifications: boolean): Promise<string> {
  const cred = await githubAuthMemo('cred', () => resolveGitHubCred(ctx))
    .catch((): GitHubCred => ({ token: null, auth: 'anonymous' }))
  const viewer = cred.token === null ? null : await githubViewerMemo('viewer', () => fetchViewerLogin(cred)).catch(() => null)
  const effectiveLogin = login !== '' ? login : (viewer ?? '')
  const effectiveRepos = repos.length > 0
    ? repos
    : (cred.token === null ? [] : await githubRecentMemo('recent', () => fetchRecentRepos(cred)).catch(() => []))
  const errors: Record<string, string> = {}
  const [contrib, repoList, notif] = await Promise.all([
    effectiveLogin === ''
      ? Promise.resolve({ value: null, error: 'no-user' } as { value: HostContributions | null; error: string | null })
      : githubContribMemo(`c:${effectiveLogin}`, () => fetchContributions(effectiveLogin, cred)).catch((): { value: HostContributions | null; error: string | null } => ({ value: null, error: 'unavailable' })),
    Promise.all(effectiveRepos.map((full) => githubReposMemo(`r:${full}:${cred.auth}`, () => fetchGitHubRepo(full, cred)).catch(() => null))),
    // The review queue rides the SAME request as the rest of the family: one
    // slot-driven pull on the client covers every github-* card, so a second
    // route would only add a second poll loop (and the G7 gate — every route
    // must have a probe case).
    !wantNotifications
      ? Promise.resolve({ value: null, error: null } as { value: HostNotifications | null; error: string | null })
      : cred.token === null
        // Anonymous answers 401 on this endpoint (measured), so it is reported as
        // absent-by-credential rather than as "0 notifications".
        ? Promise.resolve({ value: null, error: 'anonymous' } as { value: HostNotifications | null; error: string | null })
        : githubNotifMemo(`n:${cred.auth}`, () => fetchNotifications(cred.token as string)).catch((): { value: HostNotifications | null; error: string | null } => ({ value: null, error: 'unavailable' })),
  ])
  if (contrib.error !== null) errors.contributions = contrib.error
  if (notif.error !== null) errors.notifications = notif.error
  if (effectiveRepos.length === 0) errors.repos = 'no-repo'
  const kept: HostRepo[] = []
  repoList.forEach((repo, i) => {
    if (repo === null) errors[effectiveRepos[i]!] = 'unavailable'
    else kept.push(repo)
  })
  return JSON.stringify({ auth: cred.auth, login: effectiveLogin, contributions: contrib.value, repos: kept, notifications: notif.value, errors })
}

/** Register the GitHub route; returns the disposer `ctx.effect` wants. */
export function registerGitHub(ctx: HostContext): () => void {
  // GitHub channel: one same-origin route for the whole GitHub widget family.
  //
  //   GET /api/github?user=<login>&repos=<owner/name,owner/name>
  //
  // The browser NEVER talks to api.github.com itself. Not because it could not
  // (the REST API answers `Access-Control-Allow-Origin: *`) but because of the
  // two things only a host can hold: a TOKEN, and a cache that makes the
  // anonymous budget survivable. Anonymous GitHub is 60 requests/hour PER
  // EGRESS IP — shared with every other tool on this machine and everyone
  // behind the same NAT — so a browser polling four repos directly would spend
  // the whole hour's budget in minutes and start answering 403.
  //
  // Credential ladder (works the same on anybody's machine; nothing here is
  // specific to this install):
  //   1. `ctx.credentials.resolve('GITHUB_TOKEN' | 'GH_TOKEN')` — the normal
  //      path (process env -> $DSH_HOME/.credentials.yaml -> .env);
  //   2. the local `gh` CLI's own login (`gh auth token`) — zero-config for
  //      anyone who has ever run `gh auth login`;
  //   3. anonymous (60/h, exact numbers still, minus the extra search call).
  //
  // Two slices, cached SEPARATELY: the contribution calendar can take 1–9 s
  // when it has to be scraped, so it must never delay the repo numbers.
  const off = ctx.webServer.register({
    kind: 'exact',
    path: '/api/github',
    handler: async (req, res) => {
      const url = (req as ReqLike | undefined)?.url ?? ''
      let login = ''
      let wanted: string[] = []
      let wantNotifications = false
      try {
        const params = new URL(url, 'http://localhost').searchParams
        login = (params.get('user') ?? '').trim().slice(0, 64)
        wantNotifications = params.get('notif') === '1'
        wanted = (params.get('repos') ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s))
          .slice(0, GITHUB_MAX_REPOS)
        // Dedupe AFTER the cap-free filter so the same repo spelled five times
        // costs one upstream pass, not five (the client dedupes too; this is
        // the defensive copy for any other caller).
        wanted = Array.from(new Set(wanted)).slice(0, GITHUB_MAX_REPOS)
      } catch { /* malformed url -> empty request, answered below */ }
      try {
        const body = await buildGitHubBody(ctx, login, wanted, wantNotifications)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  })
  return off
}
