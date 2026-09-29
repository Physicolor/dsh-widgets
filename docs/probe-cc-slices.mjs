/**
 * Command Code SLICE pipeline probe (docs/probe-cc-slices.mjs)
 *
 * The defect this guards (reported 2026-09-30): `/alpha/whoami`, `/alpha/usage/summary`
 * and `/alpha/billing/subscriptions` can take **14–21 s** to answer on the live account
 * (measured 6/6 calls while the report was being written; the same four endpoints
 * answered in 3.6–4.2 s twenty minutes later) while `/alpha/billing/credits` stays
 * under 1 s. The host used ONE 8 s budget for all four, so during a slow window those
 * three were null on every poll and the card family degraded exactly as reported:
 *
 *   - 用量环形图 (cc-windows) drew 5h + 周 only — no 月 ring;
 *   - 额度 (cc-credits) listed 5 小时 / 周 — no 月 row;
 *   - 额度预测 (quota-manage) fell to `-%` with 今日推荐 `—` (the month needs the
 *     subscription's plan + period);
 *   - the pool switcher showed `Key 1` / `Key 2` instead of the account names.
 *
 * This probe drives the REAL host bundle (`lib/index.js`) through a fetch stub whose
 * LATENCY it controls, and asserts the contract that keeps those numbers on screen:
 *
 *   1. a route call never waits for a slow slice it does not have yet (the fast
 *      slice is answered, the slow ones land later);
 *   2. once they land, the payload carries all four slices and the account labels;
 *   3. a refresh that FAILS keeps the last good value (a blip never blanks a slice);
 *   4. slow slices are re-read on their own TTLs, not on every poll;
 *   5. the route memo still collapses a burst.
 *
 * Usage: node docs/probe-cc-slices.mjs      (rebuild first: npx tsdown)
 *        node docs/probe-cc-slices.mjs --live   # also print the REAL upstream's
 *                                               # per-endpoint status + latency
 * Runtime: ~25 s — the route memo (ROUTE_CACHE_MS, 20 s) is what the waits ride out.
 *          --live adds one call per endpoint (~20 s, the slow ones dominate).
 */
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..')
/** The REAL home, captured before the run points `DSH_HOME` at a throwaway dir for
 *  the state route — otherwise `--live` would look for credentials in the temp dir. */
const REAL_HOME = process.env.DSH_HOME || path.join(homedir(), '.dsh')
/** Latency the stub answers each endpoint with (ms). The real account measures
 *  ~1 s for credits and 14–21 s for the other three; keeping the ratio lets the
 *  probe finish in seconds while exercising the same code path. */
const FAST_MS = 50
const SLOW_MS = 3000
/** The route memo's TTL, i.e. how long the probe must wait for a recompute. */
const MEMO_MS = 20_000

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const NOW = Date.now()
const ISO = (offsetMs) => new Date(NOW + offsetMs).toISOString()
const SLICES = {
  whoami: { body: { success: true, user: { id: 'u-stub', name: 'Stub Account', userName: 'stub' } }, ms: SLOW_MS },
  usage: { body: { totalCount: 5, failedCount: 0, totalCost: 12.5, totalTokens: 1000, totalMonthlyCredits: 12.5 }, ms: SLOW_MS },
  credits: { body: { credits: { monthlyCredits: 40, freeCredits: 0, purchasedCredits: 0, creditThreshold: 0, belowThreshold: false }, windowLimits: { limited: true, exceeded: null, fiveHour: { used: 1, cap: 14, exceeded: false, resetAt: NOW + 3_600_000 }, weekly: { used: 2, cap: 35, exceeded: false, resetAt: NOW + 86_400_000 } } }, ms: FAST_MS },
  subscription: { body: { success: true, data: { id: 'sub-stub', status: 'active', planId: 'individual-goat', currentPeriodStart: ISO(-9 * 86_400_000), currentPeriodEnd: ISO(21 * 86_400_000) } }, ms: SLOW_MS },
}
const NAME_OF = [
  ['whoami', '/whoami'],
  ['usage', '/usage/summary'],
  ['credits', '/billing/credits'],
  ['subscription', '/billing/subscriptions'],
]
/** Which slice each upstream call belongs to, and how often it was called. */
const calls = { whoami: 0, usage: 0, credits: 0, subscription: 0 }
let creditsFail = false

function stubFetch(url) {
  const u = String(url)
  const hit = NAME_OF.find(([, suffix]) => u.includes(suffix))
  if (hit === undefined) return { ok: false, status: 404, text: async () => '{"error":"unmocked"}', json: async () => ({ error: 'unmocked' }) }
  const [name] = hit
  calls[name] += 1
  let status = 200
  let body = SLICES[name].body
  if (name === 'credits' && creditsFail) { status = 500; body = { error: 'stub upstream failure' } }
  const ms = SLICES[name].ms
  // The fetch itself resolves late (like the real 14–21 s answers), so a slice that
  // is not given a budget is genuinely left behind.
  return sleep(ms).then(() => ({ ok: status === 200, status, text: async () => JSON.stringify(body), json: async () => body }))
}
/** The real fetch, kept aside before the stub takes over — the `--live` section needs it. */
const realFetch = globalThis.fetch
globalThis.fetch = stubFetch

/** Load the REAL host bundle with a fake ctx and call the route once. */
async function routeCall() {
  const mod = await import(new URL('../lib/index.js', import.meta.url).href)
  const routes = new Map()
  const ctx = {
    webServer: { register: (route) => { routes.set(route.path, route); return () => { routes.delete(route.path) } } },
    credentials: { resolve: async (ref) => (ref === 'COMMANDCODE_API_KEY' || ref === 'COMMANDCODE_API_KEY_2' ? { value: `test-key-${ref}`, source: 'fixture' } : undefined) },
    get: () => undefined,
    // The routes are registered INSIDE the effect callbacks, so this has to run them.
    effect: (setup) => { setup() },
  }
  // One registration for the whole probe: the slice store and the memo live inside it.
  mod.apply(ctx)
  const route = routes.get('/api/commandcode-usage')
  if (route === undefined) throw new Error('route /api/commandcode-usage was not registered')
  return async () => {
    const res = { status: 0, body: '', writeHead(s) { this.status = s; return this }, end(b) { this.body = b === undefined ? '' : String(b); return this } }
    const started = Date.now()
    await route.handler({ method: 'GET', url: '/api/commandcode-usage' }, res)
    return { status: res.status, elapsed: Date.now() - started, payload: res.body ? JSON.parse(res.body) : null }
  }
}

const member = (payload, i = 0) => (Array.isArray(payload?.keys) ? payload.keys[i]?.data ?? null : payload ?? null)
const has = (data, name) => data !== null && data !== undefined && data[name] !== null && data[name] !== undefined
const names = (data) => (data === null ? [] : Object.keys(data).filter((k) => data[k] !== null && data[k] !== undefined))

;(async () => {
  process.env.DSH_HOME = mkdtempSync(path.join(tmpdir(), 'dsh-widgets-slices-'))
  const call = await routeCall()

  // ---- 1) cold: the fast slice answers, the slow ones do NOT block ----------
  const first = await call()
  const d1 = member(first.payload)
  console.log(`call 1: ${first.status} in ${first.elapsed}ms, slices answered = [${names(d1).join(', ')}], label = ${JSON.stringify(first.payload?.keys?.[0]?.label)}`)
  check('the route answers 200', first.status === 200, `status ${first.status}`)
  check('a slow slice never delays the payload (call 1 stays under 2 s)', first.elapsed < 2000, `${first.elapsed}ms`)
  check('the fast slice is in the first answer', has(d1, 'credits'), names(d1).join(', '))
  check('the slow slices are left in flight for the next poll (by design)', !has(d1, 'whoami') && !has(d1, 'subscription'),
    `whoami=${d1?.whoami === null ? 'null' : 'present'} subscription=${d1?.subscription === null ? 'null' : 'present'}`)

  // The credits answer is now cached; flip it to FAILING so the next recompute has
  // to survive a dead upstream — that is the "never blank a slice we know" rule.
  creditsFail = true
  console.log(`\n(credits upstream flipped to 500 at t=${Date.now() - NOW}ms; waiting out the ${MEMO_MS}ms route memo)\n`)
  await sleep(MEMO_MS + 1200)

  // ---- 2) the slow slices have landed; a FAILED refresh keeps the last good --
  const second = await call()
  const d2 = member(second.payload)
  console.log(`call 2: ${second.status}, slices answered = [${names(d2).join(', ')}], label = ${JSON.stringify(second.payload?.keys?.[0]?.label)}`)
  check('once the slow slices answer, the payload carries all four', ['whoami', 'usage', 'credits', 'subscription'].every((n) => has(d2, n)), names(d2).join(', '))
  check('the account label comes from whoami again (never `Key N`)', second.payload?.keys?.[0]?.label === 'Stub Account', String(second.payload?.keys?.[0]?.label))
  check('the monthly window can be built (subscription plan + period present)',
    d2?.subscription?.data?.planId === 'individual-goat' && typeof d2?.subscription?.data?.currentPeriodEnd === 'string',
    `${d2?.subscription?.data?.planId} → ${d2?.subscription?.data?.currentPeriodEnd}`)
  check('a failing refresh KEEPS the last good credits answer',
    d2?.credits?.credits?.monthlyCredits === 40 && d2?.credits?.windowLimits?.fiveHour?.cap === 14,
    `credits=${JSON.stringify(d2?.credits?.credits ?? null)}`)
  check('the live windows still come from the fast slice (5h/weekly caps present)',
    d2?.credits?.windowLimits?.weekly?.cap === 35, JSON.stringify(d2?.credits?.windowLimits?.weekly ?? null))

  // ---- 3) the slow slices are re-read on their own TTLs, not per poll -------
  // Two pool keys, so each slice is fetched once PER MEMBER: the point is that a
  // second route call (and any number of tabs) does not fetch them again.
  const POOL = 2
  console.log(`upstream calls so far: ${JSON.stringify(calls)} (${POOL} pool keys)`)
  check('the slow slices were fetched ONCE per member across the whole run (hourly / 10-min TTLs)',
    calls.whoami === POOL && calls.usage === POOL && calls.subscription === POOL,
    `whoami=${calls.whoami} usage=${calls.usage} subscription=${calls.subscription} (expected ${POOL} each)`)
  check('credits was re-fetched after its 20 s TTL (it is the live slice)', calls.credits > POOL, `credits=${calls.credits} (initial ${POOL})`)

  // ---- 4) the route memo still collapses a burst ----------------------------
  const creditsAfterSecond = calls.credits
  const third = await call()
  check('a second call inside the memo TTL is the same body (one upstream pass per poll)',
    third.payload !== null && JSON.stringify(third.payload) === JSON.stringify(second.payload), `${third.elapsed}ms`)
  check('that call added no upstream traffic',
    calls.whoami === POOL && calls.credits === creditsAfterSecond, JSON.stringify(calls))

  const failed = results.filter((r) => !r.ok).length

  // ---- 5) --live: what the REAL upstream answers, and how fast ----------------
  // This is the measurement the budgets above are written against: if the slow three
  // ever answer late enough to sit outside COMMANDCODE_SLOW_TIMEOUT_MS, the fix's
  // margin is gone and this section is where that shows. Report-only: the upstream
  // is allowed a bad day (a 500 was observed once) without failing the contract run.
  if (process.argv.includes('--live')) {
    const key = liveKey()
    if (key === null) {
      console.log('\n(live section skipped: no COMMANDCODE_API_KEY in env or the credentials file)')
    } else {
      console.log('\n--- live upstream (one call per endpoint, real network) ---')
      for (const [name, suffix] of NAME_OF) {
        const url = `https://api.commandcode.ai/alpha${suffix}`
        const started = Date.now()
        try {
          const res = await realFetch(url, { headers: { Authorization: `Bearer ${key}` } })
          const body = await res.text()
          console.log(`  ${name.padEnd(12)} ${res.status}  ${String(Date.now() - started).padStart(6)}ms  ${(body.length / 1024).toFixed(1)}KB`)
        } catch (err) {
          console.log(`  ${name.padEnd(12)} FETCH FAILED after ${Date.now() - started}ms: ${err.message}`)
        }
      }
    }
  }

  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions)`)
  process.exit(failed === 0 ? 0 : 1)
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })

/** The primary pool key, resolved exactly like the credentials seam lanes it (env
 *  first, then `$DSH_HOME/.credentials.yaml`). Never printed. */
function liveKey() {
  const ref = 'COMMANDCODE_API_KEY'
  if (process.env[ref]) return process.env[ref]
  try {
    const text = readFileSync(path.join(REAL_HOME, '.credentials.yaml'), 'utf8')
    const m = new RegExp(`^\\s*${ref}:\\s*(\\S+)\\s*$`, 'm').exec(text)
    if (m && m[1]) return m[1]
  } catch { /* absent */ }
  return null
}
