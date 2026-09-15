/**
 * Post-restart live probe: does the widget card's token total now equal the
 * usage center's?
 *
 * dsh web loads host plugin code at boot, so `/api/widgets-usage-daily` only
 * answers after a restart (D:\dsh-home\restart-dsh.cmd — the owner runs this
 * manually). Run this afterwards; it needs no browser and no dsh session.
 *
 * It checks three things against the same raw-log truth:
 *   1. the new host route answers `available: true` with a day map;
 *   2. its daily totals match the independent fold of the session logs
 *      (docs/verify-token-total-independent.json) day by day;
 *   3. its grand total matches usage-center's own index aggregation — i.e. the
 *      heatmap card and the usage center would show the same number.
 *
 * Run: node docs/probe-usage-daily-live.mjs
 */
import { readFileSync } from 'node:fs'

const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const M = (n) => (n / 1e6).toFixed(1)
const dayKey = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : `  — ${detail}`}`)
}

// ── 1. the route ──
let payload = null
try {
  const res = await fetch(`${ORIGIN}/api/widgets-usage-daily`)
  payload = res.ok ? await res.json() : null
  check(`GET ${ORIGIN}/api/widgets-usage-daily → 200`, res.ok, `status ${res.status}`)
} catch (err) {
  check('route reachable', false, err.message)
}
if (payload === null) {
  console.log('\nhost route unavailable — restart dsh web, then run this again.')
  process.exit(1)
}
check('available: true (dsh-usage-center answered)', payload.available === true, JSON.stringify(payload).slice(0, 160))
const daily = payload.daily ?? {}
const routeTotal = Object.values(daily).reduce((a, b) => a + b, 0)
console.log(`route days=${Object.keys(daily).length} total=${routeTotal} (${M(routeTotal)}M)`)

// ── 2. against the independent raw-log fold ──
const independent = JSON.parse(readFileSync(`${HERE}verify-token-total-independent.json`, 'utf8'))
const indepDay = independent.perDay
const days = [...new Set([...Object.keys(daily), ...Object.keys(indepDay)])].sort()
let worst = 0
let worstDay = null
for (const day of days) {
  const diff = Math.abs((daily[day] ?? 0) - (indepDay[day] ?? 0))
  if (diff > worst) {
    worst = diff
    worstDay = day
  }
}
check('every day matches the raw-log fold within 0.5M', worst <= 500_000, `worst ${M(worst)}M on ${worstDay ?? '-'}`)
check('grand total matches the raw-log fold within 0.5M',
  Math.abs(routeTotal - independent.totalTokens) <= 500_000,
  `route ${M(routeTotal)}M vs logs ${M(independent.totalTokens)}M`)

// ── 3. against usage-center's persisted index (the number its UI shows) ──
let indexTotal = null
try {
  const index = JSON.parse(readFileSync('D:/dsh-home/storages/usage-center/index.json', 'utf8'))
  let total = 0
  for (const r of index.records ?? []) {
    if (typeof r.timestamp !== 'number') continue
    total += (r.inputTokens || 0) + (r.outputTokens || 0) + (r.cacheReadTokens || 0) + (r.cacheWriteTokens || 0)
  }
  indexTotal = total
} catch (err) {
  console.log(`(usage-center index unreadable: ${err.message})`)
}
if (indexTotal !== null) {
  check('route total == usage-center index total (same displayed number)',
    Math.abs(routeTotal - indexTotal) <= 1_000_000,
    `route ${M(routeTotal)}M vs index ${M(indexTotal)}M`)
}

// ── context: what the OLD widget figure was, so the fix is visible ──
const stale = 7_715_756_948
console.log(`\nold widget figure (fabricated seeds + partial live accounting): ${M(stale)}M`)
console.log(`now shown (authoritative):                                        ${M(routeTotal)}M`)

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`)
process.exitCode = failures === 0 ? 0 : 1
