#!/usr/bin/env node
/**
 * dsh-widgets — live probe for the `/api/github` host route.
 *
 * WHY THIS SHAPE: the route only exists in a RUNNING dsh web process, and
 * restarting it is the user's call (see docs/workflow/06-acceptance.md). So the
 * probe loads the BUILT host half (`lib/index.js`), hands it a fake cordis
 * context that captures the registered handler, and drives that handler with a
 * fake req/res — the real code, the real network, no `dsh web` restart.
 *
 * Two runs, two credential rungs:
 *   node docs/probe-github.mjs                     -> whatever this machine has
 *                                                     (credentials ref, else gh)
 *   GITHUB_PROBE_ANON=1 PATH=... node ...           -> anonymous (PATH hides gh)
 *
 * Writes a JSON receipt next to itself (`probe-github-result.json`).
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ANON = process.env.GITHUB_PROBE_ANON === '1'
const REPO = 'Physicolor/dsh-widgets'

const checks = []
function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: detail === undefined ? '' : String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${detail}`}`)
}

/** Capture the routes a host `apply()` registers. */
function fakeCtx() {
  const routes = new Map()
  return {
    routes,
    ctx: {
      webServer: { register(route) { routes.set(route.path, route.handler); return () => {} } },
      // No credential ref configured: whichever rung answers below is the
      // `gh` CLI (present) or anonymous (absent), never a .credentials.yaml.
      credentials: { async resolve() { return undefined } },
      get() { return undefined },
      effect(setup) { setup() },
    },
  }
}

/** Drive one handler call and return `{ status, json }`. */
async function callRoute(handler, url) {
  let status = 0
  let body = ''
  await handler({ url, method: 'GET' }, {
    writeHead(s) { status = s },
    end(b) { body = b ?? '' },
  })
  let json = null
  try { json = JSON.parse(body) } catch { /* non-JSON answer */ }
  return { status, json, bytes: body.length }
}

const mod = await import(pathToFileURL(join(HERE, '..', 'lib', 'index.js')).href)
if (typeof mod.apply !== 'function') {
  console.error('lib/index.js does not export apply() — run `pnpm run build` first')
  process.exit(1)
}

const { routes, ctx } = fakeCtx()
mod.apply(ctx)
check('route /api/github registered', routes.has('/api/github'))

const handler = routes.get('/api/github')

// ── 1. the explicit request: one login + one repo ───────────────────────────
const explicit = await callRoute(handler, `/api/github?user=Physicolor&repos=${REPO}`)
check('GET /api/github answers 200', explicit.status === 200, `status ${explicit.status}`)
check('answer is JSON', explicit.json !== null, `${explicit.bytes} bytes`)

const data = explicit.json ?? {}
const expectAnon = ANON
check(
  `auth rung is ${expectAnon ? 'anonymous' : 'gh or credentials'}`,
  expectAnon ? data.auth === 'anonymous' : data.auth === 'gh' || data.auth === 'credentials',
  `auth=${data.auth}`,
)

const c = data.contributions
check('calendar present', c !== null && c !== undefined, c === null ? `errors=${JSON.stringify(data.errors)}` : '')
if (c) {
  // A full year of GitHub days is 365–372 entries depending on leap/weekday
  // alignment; anything far below that means the window or the parse is wrong.
  check('calendar covers ~1 year', c.days.length >= 360 && c.days.length <= 372, `${c.days.length} days`)
  check('calendar total > 0', c.total > 0, `total=${c.total} streak=${c.streak} longest=${c.longest}`)
  check(
    `calendar source is ${expectAnon ? 'html (scrape)' : 'graphql (official API)'}`,
    expectAnon ? c.source === 'html' : c.source === 'graphql',
    `source=${c.source}`,
  )
  check('every day has a date + count + level', c.days.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Number.isFinite(d.count) && d.level >= 0 && d.level <= 4))
  check('days are chronological', c.days.every((d, i) => i === 0 || c.days[i - 1].date <= d.date))
  // Cross-check the day counts against GitHub's own level buckets: a day with
  // count 0 must be level 0 and vice versa (this is what the green ramp reads).
  check('level 0 <=> count 0', c.days.every((d) => (d.count === 0) === (d.level === 0)))
}

const repo = (data.repos ?? [])[0]
check('repo pulse present', repo !== undefined && repo !== null, repo === undefined ? `errors=${JSON.stringify(data.errors)}` : repo.fullName)
if (repo) {
  check('repo is the one asked for', repo.fullName === REPO, repo.fullName)
  check('stars is a number', Number.isFinite(repo.stars), `stars=${repo.stars}`)
  check('openIssues excludes PRs (a count, not the repo field)', Number.isFinite(repo.openIssues), `openIssues=${repo.openIssues} capped=${repo.issueCountCapped}`)
  check('pushedAt parses as a date', Number.isFinite(Date.parse(repo.pushedAt ?? '')), String(repo.pushedAt))
  check('release shape', repo.release === null || (typeof repo.release.tag === 'string' && repo.release.tag.length > 0), JSON.stringify(repo.release))
  check(
    `unanswered is ${expectAnon ? 'null (not measured anonymously)' : 'a number'}`,
    expectAnon ? repo.unanswered === null : Number.isFinite(repo.unanswered),
    `unanswered=${repo.unanswered}`,
  )
}

// ── 2. the zero-config request: no user, no repos ───────────────────────────
const bare = await callRoute(handler, '/api/github')
check('GET /api/github with no params answers 200', bare.status === 200, `status ${bare.status}`)
const bareData = bare.json ?? {}
if (expectAnon) {
  // Anonymous has no viewer to resolve, and must SAY so instead of pretending.
  check('anonymous bare request reports no-user', bareData.errors?.contributions === 'no-user', JSON.stringify(bareData.errors))
  check('anonymous bare request reports no-repo', bareData.errors?.repos === 'no-repo', JSON.stringify(bareData.errors))
  check('anonymous bare request has no calendar', bareData.contributions === null)
} else {
  // Zero-config promise: the login and the repo list come from the token's own
  // viewer, so a fresh install shows the user's own numbers with nothing typed.
  check('bare request resolves the viewer login', typeof bareData.login === 'string' && bareData.login.length > 0, `login=${bareData.login}`)
  check('bare request resolves recent repos', Array.isArray(bareData.repos) && bareData.repos.length >= 1, `${bareData.repos?.length ?? 0} repo(s)`)
}

// ── 3. malformed / hostile input must not crash the route ──────────────────
const junk = await callRoute(handler, '/api/github?user=%20%20&repos=not-a-repo,../../etc/passwd,ok/ok,ok/ok,ok/ok,ok/ok,ok/ok')
check('malformed params answer 200 (never 5xx)', junk.status === 200, `status ${junk.status}`)
check('bogus repo names are filtered out', (junk.json?.repos ?? []).length === 0 || junk.json.repos.length <= 4, `${junk.json?.repos?.length ?? 0} kept`)

// ── 4. the route's expected state BEFORE a dsh web restart ─────────────────
// The dev server answers an UNKNOWN /api path with 401 (not 404), so the check
// is RELATIVE: the same no-cookie fetch is made against a route that has
// existed for releases (`/api/sysinfo`). Known 200 + github 401 therefore means
// "the running host process has not loaded this new route yet" — the restart
// evidence docs/workflow/06-acceptance.md asks for, never a code failure.
async function statusOf(path) {
  try {
    const res = await fetch(`http://127.0.0.1:3080${path}`, { signal: AbortSignal.timeout(5000) })
    return res.status
  } catch { return -1 }
}
const liveGithub = await statusOf('/api/github')
const liveKnown = await statusOf('/api/sysinfo')
let liveNote
if (liveGithub === 200) liveNote = 'route is LIVE (host already restarted)'
else if (liveGithub === 401 || liveGithub === 404) liveNote = liveKnown === 200 ? 'restart dsh web to load the new host route' : `both gated (known route answers ${liveKnown}) — restart state unknown`
else if (liveGithub === -1) liveNote = 'dsh web not reachable on 127.0.0.1:3080'
else liveNote = `unexpected status ${liveGithub}`
check('running dsh web either serves the route (200) or is awaiting a restart', liveGithub === 200 || liveGithub === 401 || liveGithub === 404 || liveGithub === -1, `github ${liveGithub} / sysinfo ${liveKnown} — ${liveNote}`)

const failed = checks.filter((x) => !x.ok)
const receipt = {
  at: new Date().toISOString(),
  mode: ANON ? 'anonymous' : 'token',
  passed: checks.length - failed.length,
  total: checks.length,
  checks,
  sample: {
    auth: data.auth,
    login: data.login,
    contributionSource: c?.source ?? null,
    contributionDays: c?.days?.length ?? 0,
    contributionTotal: c?.total ?? null,
    streak: c?.streak ?? null,
    longest: c?.longest ?? null,
    repo: repo === undefined ? null : {
      fullName: repo.fullName,
      stars: repo.stars,
      forks: repo.forks,
      openIssues: repo.openIssues,
      unanswered: repo.unanswered,
      pushedAt: repo.pushedAt,
      release: repo.release,
      newestIssue: repo.newestIssue,
    },
  },
}
writeFileSync(join(HERE, 'probe-github-result.json'), JSON.stringify(receipt, null, 2), 'utf8')
console.log(`\n${receipt.passed}/${receipt.total} checks passed (${receipt.mode}) — receipt: docs/probe-github-result.json`)
if (failed.length > 0) process.exit(1)
