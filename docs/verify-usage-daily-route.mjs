/**
 * Verify the shipped host bundle's `/api/widgets-usage-daily` route.
 *
 * The route is the whole fix for the token-total mismatch: it re-serves
 * dsh-usage-center's log-folded per-day totals to the browser cards. This script
 * loads the BUILT `lib/index.js` (the file dsh web actually loads), drives
 * `apply()` with a stub Cordis context, and asserts the route's three states:
 *
 *   1. usage-center present  → the day map is passed through unchanged;
 *   2. usage-center absent   → `available: false` (client keeps its fallback);
 *   3. usage-center present but its payload malformed → `available: false`,
 *      never a half-parsed map.
 *
 * Run: node docs/verify-usage-daily-route.mjs
 */
import { apply } from '../lib/index.js'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : `  — ${detail}`}`)
}

/** Build a stub context that captures every registered route. */
function harness(service) {
  const routes = new Map()
  apply({
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => routes.delete(route.path)
      },
    },
    credentials: { resolve: async () => undefined },
    get: (name) => (name === 'usageCenter' ? service : undefined),
    effect: (setup) => { setup() },
  })
  return routes
}

/** Invoke one captured route and parse its JSON answer. */
async function callRoute(routes, path, url) {
  const route = routes.get(path)
  if (route === undefined) throw new Error(`route ${path} not registered`)
  let status = 0
  let body = ''
  await route.handler({ method: 'GET', url: url ?? path }, {
    writeHead(code) { status = code; return this },
    end(text) { body = text ?? ''; return this },
  })
  return { status, json: JSON.parse(body) }
}

// 1. usage-center present, real payload shape (ActivityPayload.activity[]).
const activity = [
  { date: '2026-09-11', totalTokens: 569_960_185 },
  { date: '2026-09-12', totalTokens: 237_430_069 },
  { date: '2026-09-12', totalTokens: 0 }, // a zero day must still be carried
]
const routesWithService = harness({ getActivity: () => ({ days: 366, activity }) })
const present = await callRoute(routesWithService, '/api/widgets-usage-daily')
check('route registered at /api/widgets-usage-daily', routesWithService.has('/api/widgets-usage-daily'))
check('HTTP 200 for the authoritative answer', present.status === 200, `got ${present.status}`)
check('available: true when usage-center answers', present.json.available === true, JSON.stringify(present.json).slice(0, 120))
check('day map passes the service totals through unchanged',
  present.json.daily?.['2026-09-11'] === 569_960_185 && present.json.daily?.['2026-09-12'] === 0,
  JSON.stringify(present.json.daily))
check('day count is reported for diagnostics', present.json.days === 3, String(present.json.days))
check('no provider asked -> the fold stays machine-wide (no `only` filter)',
  present.json.provider === undefined, JSON.stringify(present.json.provider))

// 1b. `?provider=<route>` scopes the fold to ONE provider. 「额度管理」needs this:
// its credits describe the Command Code plan alone, so a machine-wide day map
// charged it for every other provider's tokens (measured 2026-09-20: 758M shown
// against 474M the route itself served).
const calls = []
const scopedRoutes = harness({
  getActivity: (provider, model, mode) => {
    calls.push([provider, model, mode])
    return { days: 366, activity: [{ date: '2026-09-20', totalTokens: 473_748_376 }] }
  },
})
const scoped = await callRoute(scopedRoutes, '/api/widgets-usage-daily', '/api/widgets-usage-daily?provider=commandcode&refresh=1')
check('?provider=X asks usage-center for that route in `only` mode (all/merge keep the whole window)',
  JSON.stringify(calls) === JSON.stringify([['commandcode', undefined, 'only']]), JSON.stringify(calls))
check('the scoped answer carries only that route\'s days',
  scoped.json.daily?.['2026-09-20'] === 473_748_376 && scoped.json.provider === 'commandcode',
  JSON.stringify(scoped.json).slice(0, 160))
check('an empty provider value behaves as machine-wide',
  await (async () => {
    const seen = []
    const routes = harness({ getActivity: (provider) => { seen.push(provider); return { activity } } })
    await callRoute(routes, '/api/widgets-usage-daily', '/api/widgets-usage-daily?provider=%20')
    return seen.length === 1 && seen[0] === undefined
  })(), 'whitespace-only provider is not a route name')

// 2. usage-center absent → the client must fall back to its own accounting.
const absent = await callRoute(harness(undefined), '/api/widgets-usage-daily')
check('available: false without usage-center', absent.json.available === false, JSON.stringify(absent.json))
check('failure reason is stable code', absent.json.reason === 'usage-center-unavailable', String(absent.json.reason))

// 3. Malformed payloads degrade instead of producing a partial map.
const noActivity = await callRoute(harness({ getActivity: () => ({ days: 0, activity: [] }) }), '/api/widgets-usage-daily')
check('empty activity → available: false', noActivity.json.available === false, JSON.stringify(noActivity.json))
const throwing = await callRoute(harness({ getActivity: () => { throw new Error('index not ready') } }), '/api/widgets-usage-daily')
check('throwing service → available: false, no crash', throwing.json.available === false && throwing.json.reason === 'index not ready', JSON.stringify(throwing.json))
const mixed = await callRoute(harness({ getActivity: () => ({ activity: [{ date: '2026-09-12' }, { totalTokens: 5 }, { date: '2026-09-10', totalTokens: 12 }] }) }), '/api/widgets-usage-daily')
check('rows missing date/tokens are dropped', JSON.stringify(mixed.json.daily) === '{"2026-09-10":12}', JSON.stringify(mixed.json.daily))

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`)
process.exitCode = failures === 0 ? 0 : 1
