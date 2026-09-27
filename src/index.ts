/**
 * Harness Widgets — host (node) half.
 *
 * Registers two same-origin HTTP routes:
 *  - `/api/opencode-usage`: proxies the OpenCode Go usage endpoint (the browser
 *    never issues a cross-origin request — the OpenCode API requires a Bearer
 *    header and does not allow browser CORS; the key resolves through the
 *    credentials seam, the same key the Models settings page configures).
 *  - `/api/widgets-state`: GET/PUT the persisted widget-rail state. The state
 *    lives in a JSON file under the profile data dir, so it survives browser
 *    local-storage quirks (private mode, site-data clearing, and the *origin
 *    gap*: `localhost:3080` vs `127.0.0.1:3080` are different browser origins
 *    with separate localStorage — the shared host file is what makes the
 *    configuration follow any browser/address that hits the same DSH service).
 */

import { join, dirname } from 'node:path'
import { homedir, cpus, totalmem, freemem } from 'node:os'
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const KEY_ENV = 'OPENCODE_GO_API_KEY'
/** Official Command Code account endpoints (recorded in the market entry as
 *  the verified live-account set; all four are account-scope reads). */
const COMMANDCODE_BASE = 'https://api.commandcode.ai/alpha'
const COMMANDCODE_ENDPOINTS = {
  whoami: `${COMMANDCODE_BASE}/whoami`,
  usage: `${COMMANDCODE_BASE}/usage/summary`,
  credits: `${COMMANDCODE_BASE}/billing/credits`,
  subscription: `${COMMANDCODE_BASE}/billing/subscriptions`,
} as const
const COMMANDCODE_KEY_ENV = 'COMMANDCODE_API_KEY'
/** Every Command Code pool key the host aggregates, in display order: the primary
 *  key above, then spares following the credentials-provider naming convention
 *  (…_API_KEY_2 … _4). A ref that resolves to nothing is simply not in the pool. */
const COMMANDCODE_POOL_ENVS = [
  COMMANDCODE_KEY_ENV,
  `${COMMANDCODE_KEY_ENV}_2`,
  `${COMMANDCODE_KEY_ENV}_3`,
  `${COMMANDCODE_KEY_ENV}_4`,
]
/** Per-endpoint fetch timeout (ms) so one slow upstream never stalls the rail. */
const COMMANDCODE_TIMEOUT_MS = 8000
/** One retry for a slice that failed fast (see `fetchSlice`): the pause before
 *  it, and the shorter budget it gets so the worst case stays near the single
 *  timeout above. */
const COMMANDCODE_RETRY_DELAY_MS = 250
const COMMANDCODE_RETRY_TIMEOUT_MS = 4000
/** Spare pool keys (dsh-multikey-pool convention) appended after the primary. */
const POOL_KEY_ENVS = ['OPENCODE_GO_API_KEY', 'OPENCODE_GO_POOL_2', 'OPENCODE_GO_POOL_3', 'OPENCODE_GO_POOL_4', 'OPENCODE_GO_POOL_5', 'OPENCODE_GO_POOL_6', 'OPENCODE_GO_POOL_7', 'OPENCODE_GO_POOL_8', 'OPENCODE_GO_POOL_9']
/** Max accepted PUT body (a prefs JSON is a few KB; this is a hard safety cap). */
const MAX_STATE_BYTES = 2 * 1024 * 1024
/** How long a JSON route body may be re-served without recomputing it.
 *
 *  The rail is allowed to poll (a Command Code window moves while the reader
 *  watches), and a reader may keep several tabs open, so without a cache every
 *  tab buys its own round of upstream calls and its own log fold. 20 s is short
 *  enough that no client sees a stale number it could have acted on, and long
 *  enough to collapse a burst — including the degraded-payload retry — into one
 *  upstream pass. Errors are never cached. */
const ROUTE_CACHE_MS = 20_000

/** A route answer that must NOT be cached and that carries its own status. */
class RouteError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`route responded ${status}`)
  }
}

/**
 * Per-key TTL + single-flight memo for a route body.
 *
 * `force` (the `?refresh=1` path) skips the TTL but still JOINS an in-flight
 * computation, so two tabs asking at the same instant still produce one fold.
 * A rejected computation is never stored.
 *
 * @param ttlMs - how long a stored value stays fresh.
 * @returns a reader that computes on miss and shares one promise on a burst.
 */
function memoTtl<T>(ttlMs: number): (key: string, compute: () => Promise<T> | T, force?: boolean) => Promise<T> {
  const values = new Map<string, { at: number; value: T }>()
  const inflight = new Map<string, Promise<T>>()
  return (key, compute, force = false) => {
    const hit = values.get(key)
    if (!force && hit !== undefined && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value)
    const pending = inflight.get(key)
    if (pending !== undefined) return pending
    const next = Promise.resolve().then(compute).then(
      (value) => { values.set(key, { at: Date.now(), value }); inflight.delete(key); return value },
      (error) => { inflight.delete(key); throw error },
    )
    inflight.set(key, next)
    return next
  }
}

/**
 * The slice of the `usageCenter` service (dsh-usage-center) this plugin reads.
 *
 * The heatmap cards need authoritative per-day token totals, and that plugin
 * already computes them by folding the session logs — so this plugin CONSUMES
 * its result instead of re-deriving it. The lookup is optional by design:
 * dsh-widgets is a standalone, published plugin, so `usageCenter` must never be
 * a hard dependency (see the client's fallback to its own live accounting).
 */
interface UsageCenterLike {
  getActivity?: (provider?: string, model?: string, mode?: string) => {
    activity?: ReadonlyArray<{ date?: unknown; totalTokens?: unknown }>
  } | null
  /** Present on the real service: forces an index rescan now instead of waiting
   *  for its periodic pass. Read through the OPTIONAL seam — dsh-widgets must
   *  keep working where dsh-usage-center is not installed. */
  refresh?: () => Promise<unknown>
}

/** Minimum gap between two on-demand rescans (ms). The card asks for a refresh
 *  when a turn settles; a handful of cards/browsers settling together must not
 *  queue a scan each. */
const REFRESH_THROTTLE_MS = 5000

/**
 * Daily token totals from the optional usage-center service.
 *
 * `provider` narrows the fold to ONE route. This is not cosmetic: the map feeds
 * 「额度管理」's credit→token rate and 今日用量, and the machine-wide map mixes every
 * provider the harness talked to that day into a plan that only bills one of them
 * (measured 2026-09-20: 758M for the day against 474M actually served by Command
 * Code). The mode must be `only` — usage-center's `all`/`merge` modes keep the
 * whole window on purpose and would hand a named route the machine-wide map back.
 *
 * @param ctx - host context.
 * @param provider - provider route to scope to, or undefined for every route.
 * @returns `{ available: false, reason }` when the service is absent, else the
 *   date → tokens map plus the day count the service reported.
 */
function readAuthoritativeDaily(ctx: { get?: (name: string) => unknown }, provider?: string): Record<string, unknown> {
  const service = ctx.get?.('usageCenter') as UsageCenterLike | undefined
  if (service === undefined || service === null || typeof service.getActivity !== 'function') {
    return { available: false, reason: 'usage-center-unavailable' }
  }
  const scoped = typeof provider === 'string' && provider.length > 0
  try {
    const payload = scoped ? service.getActivity(provider, undefined, 'only') : service.getActivity()
    const rows = Array.isArray(payload?.activity) ? payload.activity : []
    const daily: Record<string, number> = {}
    for (const row of rows) {
      const date = typeof row?.date === 'string' ? row.date : null
      const total = typeof row?.totalTokens === 'number' && Number.isFinite(row.totalTokens) ? row.totalTokens : null
      if (date !== null && total !== null) daily[date] = total
    }
    if (Object.keys(daily).length === 0) return { available: false, reason: 'usage-center-empty' }
    return { available: true, source: 'usage-center', ...(scoped ? { provider } : {}), days: rows.length, daily }
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/** Provider route whose traffic 「额度管理」measures: the Command Code pool. Its
 *  account payload (credits, billing period) describes exactly this route, so the
 *  token side must be folded from the same route or the two sides disagree. */
const COMMANDCODE_ROUTE = 'commandcode'

/** Required services: the web server (route registration) and the credentials seam (API key). */
export const inject = ['webServer', 'credentials']

/** Widget-rail state file under the profile data dir (same dir as the patch file). */
function stateFilePath(): string {
  const home = process.env.DSH_HOME
  const base = home !== undefined && home.length > 0 ? home : join(homedir(), '.dsh')
  return join(base, 'profiles', 'web', 'dsh-widgets-state.json')
}

/** Accumulate a Node IncomingMessage body into a JSON value (size-capped). */
async function readJsonBody(req: unknown): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<unknown>) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buf.length
    if (size > MAX_STATE_BYTES) throw new Error('state payload too large')
    chunks.push(buf)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

/**
 * Host plugin body: register the usage proxy route and the widget-state store,
 * both owned by this fiber.
 * @param ctx - cordis context carrying the injected `webServer` and `credentials` services.
 */
interface ServerResponseLike {
  writeHead(status: number, headers?: Record<string, string>): unknown
  end(body?: string): unknown
}

interface ReqLike {
  method?: string
  url?: string
}

/** The credentials seam this route needs (a slice of the injected context). */
interface CredentialsCtx {
  credentials: { resolve(ref: string): Promise<{ value: string; source: string } | undefined> }
}

/**
 * Build the `/api/commandcode-usage` body: the four official account endpoints
 * for EVERY configured pool key, aggregated into one same-origin payload.
 *
 *   { ...fourSlices,                        // = the first pool member
 *     keys: [{ ref, label, tail, data }] }  // every member, in pool order
 *
 * The browser never talks to api.commandcode.ai directly. The top-level slices
 * keep their pre-pool shape (the first member), so a single-pool install — and
 * any consumer written before pools existed — reads exactly what it read
 * before. `keys` is what makes the card family switchable; each member's label
 * is the account name from ITS OWN `/alpha/whoami`, so the card subtitle reads
 * the real account (`Physicolor` / `Sparxie`) rather than `Key 2`. The AllUser
 * total is deliberately NOT computed here: the plan -> monthly-allowance table
 * lives in the client (`cc-view`), which is the only side that can size a
 * two-plan allowance correctly.
 *
 * Each endpoint is fetched and timed out independently: one failing endpoint
 * yields null for that slice, one failing KEY yields `data: null` for that
 * member, and the rest still render. A missing pool is a `RouteError` (503) so
 * the memo above never caches it as an answer.
 *
 * @param ctx - host context carrying the credentials seam.
 * @returns the JSON body.
 */
async function buildCommandCodeBody(ctx: CredentialsCtx): Promise<string> {
  // Resolve every configured pool key, in order. A missing spare is normal.
  const pool: Array<{ ref: string; key: string }> = []
  for (const ref of COMMANDCODE_POOL_ENVS) {
    const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
    const key = resolved?.value
    if (key !== undefined && key !== '') pool.push({ ref, key })
  }
  if (pool.length === 0) {
    throw new RouteError(503, JSON.stringify({ error: `${COMMANDCODE_KEY_ENV} is not configured` }))
  }
  // One upstream call, tagged so the caller knows whether a failure is worth
  // another round trip. A 4xx (a revoked key, a plan-less account) is an
  // ANSWER and retrying it only burns the shared rate limit; a timeout, a
  // connection reset, a 5xx or a truncated body is the transient kind.
  const fetchSliceOnce = async (key: string, name: keyof typeof COMMANDCODE_ENDPOINTS, timeoutMs: number): Promise<{ value: unknown; retryable: boolean }> => {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const upstream = await fetch(COMMANDCODE_ENDPOINTS[name], { headers: { Authorization: `Bearer ${key}` }, signal: ctrl.signal })
        const text = await upstream.text()
        if (!upstream.ok) return { value: null, retryable: upstream.status >= 500 || upstream.status === 429 }
        try { return { value: JSON.parse(text), retryable: false } } catch { return { value: null, retryable: true } }
      } finally { clearTimeout(timer) }
    } catch { return { value: null, retryable: true } }
  }
  // A dropped slice used to be final for the whole poll: the browser only
  // re-asks on mount and when a turn settles, so a transient failure left the
  // card family reading a partial pool for the rest of the session (measured
  // 2026-09-20: the 额度管理 card answered 20.2% / `账期 10-20` / `今日推荐
  // 59.9M` where the full payload says 16.6% / `账期 10-10` / 645M). One
  // retry turns that into a blip — but only when the first attempt failed
  // FAST, because a retry after a full timeout would push the whole payload
  // past the rail's patience.
  const fetchSlice = async (key: string, name: keyof typeof COMMANDCODE_ENDPOINTS): Promise<unknown> => {
    const started = Date.now()
    const first = await fetchSliceOnce(key, name, COMMANDCODE_TIMEOUT_MS)
    if (first.value !== null || !first.retryable) return first.value
    if (Date.now() - started > COMMANDCODE_TIMEOUT_MS / 2) return null
    await new Promise((resolve) => setTimeout(resolve, COMMANDCODE_RETRY_DELAY_MS))
    return (await fetchSliceOnce(key, name, COMMANDCODE_RETRY_TIMEOUT_MS)).value
  }
  const readAccount = async (key: string): Promise<Record<string, unknown>> => {
    const [whoami, usage, credits, subscription] = await Promise.all([
      fetchSlice(key, 'whoami'),
      fetchSlice(key, 'usage'),
      fetchSlice(key, 'credits'),
      fetchSlice(key, 'subscription'),
    ])
    return { whoami, usage, credits, subscription }
  }
  const members = await Promise.all(pool.map(async ({ ref, key }) => ({
    ref,
    tail: key.slice(-4),
    data: await readAccount(key),
  })))
  // Switcher labels: the account's own name, else `Key N` when that member's
  // whoami did not answer. A name that repeats (two pools on one account)
  // gets its masked tail appended, so the cycle can never show two
  // indistinguishable entries.
  const used = new Set<string>()
  const keys = members.map(({ ref, tail, data }, i) => {
    const user = (data.whoami as { user?: { name?: unknown; userName?: unknown } } | null)?.user
    const name = typeof user?.name === 'string' && user.name !== '' ? user.name
      : typeof user?.userName === 'string' && user.userName !== '' ? user.userName : ''
    const base = name !== '' ? name : `Key ${i + 1}`
    const label = used.has(base) ? `${base} (${tail})` : base
    used.add(base)
    return { ref, label, tail, data }
  })
  const primary = keys[0]?.data ?? { whoami: null, usage: null, credits: null, subscription: null }
  return JSON.stringify({ ...primary, keys })
}

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
async function githubFetch(url: string, init: RequestInit = {}): Promise<{ status: number; text: string; ok: boolean }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GITHUB_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const text = await res.text()
    return { status: res.status, text, ok: res.ok }
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

/** The two slice caches. Declared at module scope on purpose: the route is
 *  registered inside `ctx.effect`, but the memo must outlive a re-registration
 *  (a plugin reload would otherwise re-spend the anonymous budget). */
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
async function buildGitHubBody(ctx: CredentialsCtx, login: string, repos: string[]): Promise<string> {
  const cred = await githubAuthMemo('cred', () => resolveGitHubCred(ctx))
    .catch((): GitHubCred => ({ token: null, auth: 'anonymous' }))
  const viewer = cred.token === null ? null : await githubViewerMemo('viewer', () => fetchViewerLogin(cred)).catch(() => null)
  const effectiveLogin = login !== '' ? login : (viewer ?? '')
  const effectiveRepos = repos.length > 0
    ? repos
    : (cred.token === null ? [] : await githubRecentMemo('recent', () => fetchRecentRepos(cred)).catch(() => []))
  const errors: Record<string, string> = {}
  const [contrib, repoList] = await Promise.all([
    effectiveLogin === ''
      ? Promise.resolve({ value: null, error: 'no-user' } as { value: HostContributions | null; error: string | null })
      : githubContribMemo(`c:${effectiveLogin}`, () => fetchContributions(effectiveLogin, cred)).catch((): { value: HostContributions | null; error: string | null } => ({ value: null, error: 'unavailable' })),
    Promise.all(effectiveRepos.map((full) => githubReposMemo(`r:${full}:${cred.auth}`, () => fetchGitHubRepo(full, cred)).catch(() => null))),
  ])
  if (contrib.error !== null) errors.contributions = contrib.error
  if (effectiveRepos.length === 0) errors.repos = 'no-repo'
  const kept: HostRepo[] = []
  repoList.forEach((repo, i) => {
    if (repo === null) errors[effectiveRepos[i]!] = 'unavailable'
    else kept.push(repo)
  })
  return JSON.stringify({ auth: cred.auth, login: effectiveLogin, contributions: contrib.value, repos: kept, errors })
}

export function apply(ctx: {
  webServer: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: unknown, res: ServerResponseLike) => void | Promise<void>
    }): () => void
  }
  credentials: {
    resolve(ref: string): Promise<{ value: string; source: string } | undefined>
  }
  /** Optional Cordis service lookup — `usageCenter` is read when present. */
  get?: (name: string) => unknown
  effect: (setup: () => () => void) => void
}): void {
  // OpenCode usage proxy (unchanged).
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/opencode-usage',
    handler: async (_req, res) => {
      const resolved = await ctx.credentials.resolve(KEY_ENV)
      const key = resolved?.value
      if (key === undefined || key === '') {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `${KEY_ENV} is not configured` }))
        return
      }
      try {
        const upstream = await fetch(USAGE_URL, {
          headers: { Authorization: `Bearer ${key}` },
        })
        const text = await upstream.text()
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
        res.end(text)
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  }))

  // Multi-key usage proxy: resolves every pooled OpenCode Go key (primary +
  // dsh-multikey-pool spares) and returns each key's usage plus a host-computed
  // 共同用量 total (per-window proportional mean of the available percents).
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/opencode-usage-multi',
    handler: async (_req, res) => {
      const keys: Array<Record<string, unknown>> = []
      for (const ref of POOL_KEY_ENVS) {
        const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
        const key = resolved?.value
        if (key === undefined || key === '') continue
        const entry: Record<string, unknown> = { ref, label: `Key ${keys.length + 1}`, tail: key.slice(-4), data: null }
        try {
          const upstream = await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${key}` } })
          const data = await upstream.json().catch(() => null)
          entry.data = data
        } catch { /* keep data: null */ }
        keys.push(entry)
      }
      // Proportional total: mean percent per window among keys that reported;
      // status/reset follow the most-advanced (highest-percent) member.
      const read = (win: 'rolling' | 'weekly' | 'monthly'): Array<{ percent: number; status?: string; resetsAt?: string }> => {
        const out: Array<{ percent: number; status?: string; resetsAt?: string }> = []
        for (const k of keys) {
          const d = k.data as { usage?: Record<string, { percent?: number; status?: string; resetsAt?: string }> } | null
          const item = d?.usage?.[win]
          if (typeof item?.percent !== 'number') continue
          out.push({ percent: item.percent, status: item.status, resetsAt: item.resetsAt })
        }
        return out
      }
      const total = (() => {
        const build = (win: 'rolling' | 'weekly' | 'monthly'): { status: string; percent: number; resetsAt: string } | undefined => {
          const items = read(win)
          if (items.length === 0) return undefined
          const max = items.reduce((a, b) => (b.percent > a.percent ? b : a))
          return {
            percent: Math.round(items.reduce((a, b) => a + b.percent, 0) / items.length),
            status: max.status ?? 'ok',
            resetsAt: max.resetsAt ?? '',
          }
        }
        const rolling = build('rolling')
        const weekly = build('weekly')
        const monthly = build('monthly')
        if (rolling === undefined && weekly === undefined && monthly === undefined) return null
        return {
          usage: {
            rolling: rolling ?? { status: 'ok', percent: 0, resetsAt: '' },
            weekly: weekly ?? { status: 'ok', percent: 0, resetsAt: '' },
            monthly: monthly ?? { status: 'ok', percent: 0, resetsAt: '' },
          },
        }
      })()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ keys, total }))
    },
  }))

  // Command Code account usage proxy: aggregates the four official endpoints
  // (whoami / usage summary / billing credits / billing subscriptions) for EVERY
  // configured pool key (COMMANDCODE_API_KEY, …_2 … _4) into ONE same-origin
  // payload:
  //
  //   { ...fourSlices,                        // = the first pool member
  //     keys: [{ ref, label, tail, data }] }  // every member, in pool order
  //
  // The browser never talks to api.commandcode.ai directly. The top-level slices
  // keep their pre-pool shape (the first member), so a single-pool install — and
  // any consumer written before pools existed — reads exactly what it read
  // before. `keys` is what makes the card family switchable; each member's label
  // is the account name from ITS OWN `/alpha/whoami`, so the card subtitle reads
  // the real account (`Physicolor` / `Sparxie`) rather than `Key 2`. The AllUser
  // total is deliberately NOT computed here: the plan -> monthly-allowance table
  // lives in the client (`cc-view`), which is the only side that can size a
  // two-plan allowance correctly.
  //
  // Each endpoint is fetched and timed out independently: one failing endpoint
  // yields null for that slice, one failing KEY yields `data: null` for that
  // member, and the rest still render.
  // The pool payload is the only route here that costs real upstream traffic
  // (four reads per pooled key) and the rail polls it while it is open, so it
  // gets the memo: N tabs — and the client's degraded-payload retry — collapse
  // into one upstream pass per ROUTE_CACHE_MS.
  const commandCodeBody = memoTtl<string>(ROUTE_CACHE_MS)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/commandcode-usage',
    handler: async (_req, res) => {
      try {
        const body = await commandCodeBody('pool', () => buildCommandCodeBody(ctx))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
      } catch (error) {
        // A missing key is a statement about THIS install, not a payload: the
        // `RouteError` stays out of the memo, so configuring the key recovers on
        // the very next request instead of after a TTL.
        if (error instanceof RouteError) {
          res.writeHead(error.status, { 'Content-Type': 'application/json' })
          res.end(error.body)
          return
        }
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  }))

  // Authoritative daily token totals for the heatmap cards.
  //
  // The heatmap used to be a browser-local accumulator: it credited steps only
  // while a page was open and carried a baked-in history table, so its "window
  // total" drifted far from the real usage (measured 2026-09-12: 7.72G shown vs
  // 6.28G real, +23%). dsh-usage-center already folds the session logs into
  // exact per-day totals, so this route re-serves THAT result — one number, one
  // source of truth. When usage-center is not installed the client falls back to
  // its own live accounting, so the widget still works standalone.
  //
  // `?refresh=1` additionally asks usage-center to fold the logs RIGHT NOW: its
  // periodic pass runs every ~30 s, so a turn that just settled would otherwise
  // keep showing the previous figure. Throttled, and optional throughout — the
  // route still answers the last known map when the service is absent or slow.
  // `?provider=<route>` narrows the map to ONE provider (the 额度管理 card asks for
  // `commandcode`, so its 今日用量 and credit→token rate describe its own plan
  // instead of every provider the machine used that day); absent = machine-wide,
  // which is what the heatmap cards want.
  let lastRefreshAt = 0
  // The day maps are computed from usage-center's index and the PROVIDER-SCOPED
  // variant is genuinely expensive: its filter is a memo key nothing else asks
  // for, so a cold call re-folds the session logs (measured 2026-09-23: 10.6 s
  // and 21.2 s against 34 ms warm). The memo means a burst — several tabs, the
  // retry after a degradation, the two scopes a settling turn asks for — folds
  // ONCE, and `refresh=1` still gets its fresh number.
  const dailyBody = memoTtl<string>(ROUTE_CACHE_MS)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-usage-daily',
    handler: async (req, res) => {
      const url = (req as ReqLike | undefined)?.url ?? ''
      let provider: string | undefined
      try {
        provider = new URL(url, 'http://localhost').searchParams.get('provider')?.trim() || undefined
      } catch { provider = undefined }
      const force = url.includes('refresh=1')
      if (force && Date.now() - lastRefreshAt >= REFRESH_THROTTLE_MS) {
        lastRefreshAt = Date.now()
        const service = ctx.get?.('usageCenter') as UsageCenterLike | undefined
        try {
          await service?.refresh?.()
        } catch { /* a stale number beats no number */ }
      }
      const body = await dailyBody(provider ?? '*', () => JSON.stringify(readAuthoritativeDaily(ctx, provider)), force)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(body)
    },
  }))

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
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/github',
    handler: async (req, res) => {
      const url = (req as ReqLike | undefined)?.url ?? ''
      let login = ''
      let wanted: string[] = []
      try {
        const params = new URL(url, 'http://localhost').searchParams
        login = (params.get('user') ?? '').trim().slice(0, 64)
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
        const body = await buildGitHubBody(ctx, login, wanted)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  }))

  // Widget-rail state persistence. GET returns `{ savedAt, state }` (no file →
  // `{ savedAt: 0, state: {} }`); PUT stores it atomically (tmp + rename) so a
  // crash mid-write never leaves a truncated JSON the next boot would reject.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-state',
    handler: async (req, res) => {
      const method = (req as ReqLike | undefined)?.method ?? 'GET'
      const file = stateFilePath()
      if (method === 'GET') {
        let body = JSON.stringify({ savedAt: 0, state: {} })
        try {
          const info = await fs.stat(file)
          if (info !== undefined) body = await fs.readFile(file, 'utf8')
        } catch { /* absent or unreadable → default payload above */ }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const data = await readJsonBody(req)
          const text = JSON.stringify(data)
          await fs.mkdir(dirname(file), { recursive: true })
          const tmp = `${file}.tmp`
          await fs.writeFile(tmp, text, 'utf8')
          await fs.rename(tmp, file)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
        return
      }
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'method not allowed' }))
    },
  }))

  // Machine-local hardware snapshot (System widgets): CPU utilization (delta
  // against the PREVIOUS request — the poll window is the averaging window),
  // memory totals, and the NVIDIA GPU via `nvidia-smi` (temp / util / VRAM).
  // The host caches ~1s so several widgets polling at the same instant share
  // one `nvidia-smi` spawn instead of fanning out. CPU temperature stays
  // deliberately ABSENT: Windows exposes no reliable, privilege-free CPU
  // temperature source (see dsh-widgets changelog — researched, abandoned).
  ctx.effect(() => {
    let lastCpu: { idle: number; total: number } | null = null
    let cache: { ts: number; payload: unknown } | null = null
    /** Utilization sample history for the sparklines (newest last). */
    const history: Array<{ t: number; cpu: number | null; gpu: number | null }> = []
    const HISTORY_CAP = 120
    return ctx.webServer.register({
      kind: 'exact',
      path: '/api/sysinfo',
      handler: async (_req, res) => {
        const now = Date.now()
        if (cache !== null && now - cache.ts < 1000) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(cache.payload))
          return
        }
        // CPU utilization: accumulate idle/user/sys over ALL logical cores and
        // diff against the previous request's totals (the poll cadence IS the
        // averaging window). First sample has no baseline → null.
        let idle = 0
        let total = 0
        for (const c of cpus()) {
          idle += c.times.idle
          total += c.times.idle + c.times.user + c.times.nice + c.times.sys + c.times.irq
        }
        let util: number | null = null
        if (lastCpu !== null) {
          const dTotal = total - lastCpu.total
          const dIdle = idle - lastCpu.idle
          if (dTotal > 0) util = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 1000) / 10))
        }
        lastCpu = { idle, total }
        const totalBytes = totalmem()
        const freeBytes = freemem()
        // NVIDIA GPU: single query call; absent/failing driver → gpu: null (the
        // browser cards then degrade to CPU/memory only, never crash).
        let gpu: { name: string; temp: number; util: number; memUsed: number; memTotal: number; memPercent: number } | null = null
        try {
          const out = (await execFileP('nvidia-smi', [
            '--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total',
            '--format=csv,noheader,nounits',
          ], { timeout: 3000, windowsHide: true })) as { stdout: string }
          const stdout = out.stdout
          const line = String(stdout).split(/\r?\n/).map((l: string) => l.trim()).find((l: string) => l.length > 0)
          if (line !== undefined) {
            const parts = line.split(',').map((s: string) => s.trim())
            const memUsed = Number(parts[3])
            const memTotal = Number(parts[4])
            gpu = {
              name: parts[0] ?? '',
              temp: Number(parts[1]),
              util: Number(parts[2]),
              memUsed,
              memTotal,
              memPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0,
            }
          }
        } catch { gpu = null }
        const memUsed = totalBytes - freeBytes
        history.push({ t: now, cpu: util, gpu: gpu?.util ?? null })
        if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP)
        const payload = {
          ts: now,
          cpu: { util },
          mem: {
            used: memUsed,
            total: totalBytes,
            percent: totalBytes > 0 ? Math.round((memUsed / totalBytes) * 1000) / 10 : 0,
          },
          gpu,
          history: {
            ts: history.map((h) => h.t),
            cpu: history.map((h) => h.cpu),
            gpu: history.map((h) => h.gpu),
          },
        }
        cache = { ts: now, payload }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      },
    })
  })
}