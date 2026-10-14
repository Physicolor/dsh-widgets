#!/usr/bin/env node
/**
 * dsh-widgets — the DeepSeek balance channel's DERIVED half (gate G12).
 *
 * WHY THIS GATE EXISTS. `scripts/snapshot-host-routes.mjs` (G8) pins the route's
 * STATUS and SHAPE with one stubbed upstream answer — which is everything that can
 * be asserted about a passthrough. The one figure on this channel that is NOT a
 * passthrough is `spentToday`: the official API publishes a balance and no usage
 * at all, so the host derives the day's spend by sampling the balance and summing
 * the drops (`src/host/deepseek.ts`). A wrong fold there is invisible in every
 * other gate and looks entirely plausible on the card, so it gets its own gate.
 *
 * HOW IT DRIVES THE REAL CODE. It imports the BUILT host bundle (`lib/index.js`,
 * so run `pnpm build` first — the same precondition G5/G8 have) with a mock
 * webServer, stubbed `fetch` and a throwaway `DSH_HOME`. Each "poll" imports the
 * bundle with a fresh query string, because that is what drops the route's 60 s
 * memo: the LEDGER lives on disk and therefore survives the reloads exactly as it
 * survives a `dsh` restart, which is the behaviour under test.
 *
 * Usage: node scripts/verify-deepseek-balance.mjs
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = pathToFileURL(join(ROOT, 'lib', 'index.js')).href
if (!existsSync(join(ROOT, 'lib', 'index.js'))) {
  console.error('[deepseek-balance] no lib/index.js — build first (`pnpm build`)')
  process.exit(1)
}

/** A throwaway data dir: the ledger must never touch the real profile. */
const HOME = mkdtempSync(join(tmpdir(), 'dsh-deepseek-balance-'))
process.env.DSH_HOME = HOME
const LEDGER = join(HOME, 'profiles', 'web', 'dsh-widgets-balance.json')

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const balanceBody = (currency, total, granted = '0.00', toppedUp = total) => JSON.stringify({
  is_available: true,
  balance_infos: [{ currency, total_balance: total, granted_balance: granted, topped_up_balance: toppedUp }],
})

/** The next upstream answer; `null` means "this test must not call upstream". */
let next = null
/** Requests the bundle actually made, so a memo regression is visible. */
const calls = []
globalThis.fetch = async (url) => {
  calls.push(String(url))
  if (next === null) throw new Error(`unexpected upstream call to ${url}`)
  return { ok: next.status === 200, status: next.status, text: async () => next.body, headers: { get: () => null } }
}

let version = 0
/**
 * Load a FRESH module instance (fresh memo — that is what reloading is for) and
 * hand back its route handler. Driving the handler more than once on the SAME
 * instance is how the memo itself is exercised (see the last scenario).
 */
async function open(key = 'sk-test') {
  version += 1
  const handlers = new Map()
  const ctx = {
    credentials: { resolve: async () => (key === null ? undefined : { value: key, source: 'gate' }) },
    webServer: { register(route) { handlers.set(route.path, route.handler); return () => {} } },
    get: () => undefined,
    effect: (fn) => { fn() },
  }
  const pkg = await import(`${BUNDLE}?v=${version}`)
  pkg.apply(ctx)
  return handlers.get('/api/deepseek-balance')
}

/** One request against an already-loaded route handler. */
async function invoke(handler) {
  const captured = { status: 0, body: '' }
  await handler({ method: 'GET', url: '/api/deepseek-balance' }, {
    writeHead: (s) => { captured.status = s },
    end: (b) => { captured.body = String(b ?? '') },
  })
  let json = null
  try { json = JSON.parse(captured.body) } catch { json = captured.body }
  return { status: captured.status, json }
}

/** One poll: a FRESH module instance (fresh memo) reading the SAME ledger file. */
async function poll(key = 'sk-test') {
  return invoke(await open(key))
}

let failures = 0
let checks = 0
function check(label, ok, detail) {
  checks += 1
  if (ok) { console.log(`  ok   ${label}`) } else { console.log(`  FAIL ${label}${detail === undefined ? '' : ` — ${detail}`}`); failures += 1 }
}

/** One sample: stub the upstream answer, poll, hand back the parsed body. */
async function sample(answer) {
  next = answer
  return poll()
}

/** Reset both the ledger and the upstream recorder between scenarios. */
function reset() {
  rmSync(LEDGER, { force: true })
  calls.length = 0
  next = null
}

try {
  console.log('[deepseek-balance] the derived day\'s spend (the ledger fold)')

  // ── 1. The fold itself, across the four shapes a day can take.
  reset()
  const first = await sample({ status: 200, body: balanceBody('CNY', '110.00', '10.00', '100.00') })
  check('first sample ever: the balance is passed through and the day starts at 0',
    first.status === 200 && first.json.total === 110 && first.json.spentToday === 0,
    JSON.stringify(first.json))
  check('the official fields travel with it (granted / topped up / currency / is_available)',
    first.json.granted === 10 && first.json.toppedUp === 100 && first.json.currency === 'CNY' && first.json.hasBalance === true,
    JSON.stringify(first.json))

  const drop = await sample({ status: 200, body: balanceBody('CNY', '108.50', '10.00', '98.50') })
  check('a ¥1.50 drop is counted', drop.json.spentToday === 1.5, String(drop.json.spentToday))

  const same = await sample({ status: 200, body: balanceBody('CNY', '108.50', '10.00', '98.50') })
  check('an unchanged balance adds nothing (no double counting)', same.json.spentToday === 1.5, String(same.json.spentToday))

  const topUp = await sample({ status: 200, body: balanceBody('CNY', '208.50', '10.00', '198.50') })
  check('a ¥100 top-up is NOT negative spend', topUp.json.spentToday === 1.5, String(topUp.json.spentToday))

  const after = await sample({ status: 200, body: balanceBody('CNY', '200.00', '10.00', '190.00') })
  check('a later drop accumulates on top of the pre-top-up spend', after.json.spentToday === 10, String(after.json.spentToday))

  const other = await sample({ status: 200, body: balanceBody('USD', '5.00') })
  check('a currency change re-baselines the day (the subtraction would be meaningless)',
    other.json.spentToday === 0 && other.json.currency === 'USD', JSON.stringify(other.json))

  // ── 2. A NEW DAY re-baselines: seed a stale ledger, then take one sample.
  reset()
  mkdirSync(dirname(LEDGER), { recursive: true })
  writeFileSync(LEDGER, JSON.stringify({ day: '2020-01-01', last: 50, spent: 12, currency: 'CNY', updatedAt: 1 }), 'utf8')
  const newDay = await sample({ status: 200, body: balanceBody('CNY', '40.00') })
  check("yesterday's spend is not today's (an old ledger starts a fresh baseline)",
    newDay.json.spentToday === 0 && newDay.json.total === 40, JSON.stringify(newDay.json))
  check('the ledger is written back with today\'s day key',
    JSON.parse(readFileSync(LEDGER, 'utf8')).day === newDay.json.day, readFileSync(LEDGER, 'utf8'))

  // ── 3. Every way a balance can be missing keeps its own sentence.
  reset()
  const upstream500 = await sample({ status: 500, body: '{"error":"boom"}' })
  check('an upstream 5xx becomes 502 http:500', upstream500.status === 502 && upstream500.json.error === 'http:500', JSON.stringify(upstream500))

  const revoked = await sample({ status: 401, body: '{"error":{"message":"Authentication Fails"}}' })
  check('a rejected key becomes 401 unauthorized (and is NOT memoised as a payload)',
    revoked.status === 401 && revoked.json.error === 'unauthorized', JSON.stringify(revoked))

  const empty = await sample({ status: 200, body: '{"is_available":true,"balance_infos":[]}' })
  check('a 200 with no usable balance_infos is 502 no-balance, never a zero',
    empty.status === 502 && empty.json.error === 'no-balance', JSON.stringify(empty))

  const garbage = await sample({ status: 200, body: 'not json' })
  check('an unparseable body becomes 502 unparseable', garbage.status === 502 && garbage.json.error === 'unparseable', JSON.stringify(garbage))

  next = null
  const noKey = await poll(null)
  check('no credential becomes 503 unconfigured (named, so the card can say what to do)',
    noKey.status === 503 && /DEEPSEEK_API_KEY/.test(String(noKey.json.error)), JSON.stringify(noKey))

  // ── 4. The pass-through touches upstream ONCE per sample (the memo is real).
  // The bundle carries OTHER channels whose registration pre-warms its own
  // upstream (Command Code), so only calls to THIS endpoint are counted.
  reset()
  next = { status: 200, body: balanceBody('CNY', '110.00') }
  const handler = await open()
  const a = await invoke(handler)
  const b = await invoke(handler)
  const upstreamCalls = calls.filter((url) => url === BALANCE_URL).length
  check('a second request inside the memo window re-serves the body without an upstream call',
    a.json.total === b.json.total && upstreamCalls === 1, `balance upstream calls: ${upstreamCalls}`)
  check('sampledAt is stamped upstream-side (the card\'s age is the sample\'s, not the response\'s)',
    typeof a.json.sampledAt === 'number' && a.json.sampledAt === b.json.sampledAt, `${a.json.sampledAt} / ${b.json.sampledAt}`)
  check('the ledger is not re-folded by the memoised answer (one sample, one fold)',
    a.json.spentToday === b.json.spentToday, `${a.json.spentToday} / ${b.json.spentToday}`)
} finally {
  rmSync(HOME, { recursive: true, force: true })
}

console.log(`\n[deepseek-balance] ${failures === 0 ? `PASS — ${checks} assertion(s)` : `FAIL — ${failures}/${checks} assertion(s)`}`)
process.exit(failures === 0 ? 0 : 1)
