/**
 * Data-freshness probe 鈥?does TODAY keep up with the live session?
 *
 * The day map has two sources: dsh-usage-center's log fold (authoritative, but
 * produced on a ~30 s cadence) and this browser's live per-step counter. The
 * card must move as soon as a turn settles, without ever rewriting history.
 * This probe exercises the real merge (`mergeToday`) plus the day accounting it
 * relies on, and additionally compares the host's figure with an INDEPENDENT
 * fold of the session logs, so a stale feed is visible as a number.
 *
 * Usage: node docs/verify-usage-freshness.mjs
 * Leaves: docs/verify-usage-freshness-result.json
 */
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { mergeToday, dateKey, DEFAULT_TZ } from '../src/client/lib/heatmap-accounting.ts'

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : `  鈥?${detail}`}`)
}

// 鈹€鈹€ 1. the merge contract 鈹€鈹€
const today = dateKey(new Date(), DEFAULT_TZ)
const auth = { '2026-09-12': 301_402_518, '2026-09-13': 201_199_454, [today]: 61_663_462 }
const local = { [today]: 63_000_000, '2026-09-13': 999 }
const merged = mergeToday(auth, local, today)
check('today takes the LARGER of index fold and live counter', merged[today] === 63_000_000, `${merged[today]}`)
check('history days come from the index, never the local counter', merged['2026-09-13'] === 201_199_454 && merged['2026-09-12'] === 301_402_518)
check('a lagging local counter does not lower today', mergeToday(auth, { [today]: 1_000 }, today)[today] === 61_663_462)
check('no authoritative map -> the local map is the map', mergeToday(null, local, today) === local)
check('missing authoritative day -> local wins', mergeToday({}, { [today]: 5 }, today)[today] === 5)
check('the merge is monotonic as steps land', (() => {
  let m = auth
  for (const v of [61_700_000, 62_500_000, 63_000_000]) m = mergeToday(m, { [today]: v }, today)
  return m[today] === 63_000_000
})())
check('the original maps are never mutated', auth[today] === 61_663_462 && local[today] === 63_000_000)

// 鈹€鈹€ 2. the live feed vs an independent log fold 鈹€鈹€
const payload = await fetch(`${ORIGIN}/api/widgets-usage-daily?refresh=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
check('host route answers (refresh=1 accepted)', payload !== null && payload.available === true, JSON.stringify(payload)?.slice(0, 120))
const hostToday = payload?.daily?.[today] ?? null
let logToday = null
try {
  const out = execFileSync('node', ['a11-final-totals.mjs'], { cwd: 'D:/dsh-home/audit-token', encoding: 'utf8', timeout: 600000 })
  logToday = Number(/^TODAY TOTAL = ([\d.]+)M$/m.exec(out)?.[1]) * 1e6
} catch (err) {
  console.log(`(independent log fold unavailable: ${err.message.split('\n')[0]})`)
}
console.log(`\ntoday (${today}): host=${hostToday === null ? 'n/a' : (hostToday / 1e6).toFixed(2) + 'M'}  log fold=${logToday === null ? 'n/a' : (logToday / 1e6).toFixed(2) + 'M'}`)
if (hostToday !== null && logToday !== null) {
  const lag = logToday - hostToday
  check('host figure is not BEHIND the log fold by more than one turn (>25M)',
    Math.abs(lag) <= 25_000_000, `螖=${(lag / 1e6).toFixed(2)}M`)
  console.log(`  (a positive 螖 is the indexer's scan lag; the live counter covers exactly this window)`)
}

writeFileSync(`${HERE}verify-usage-freshness-result.json`, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  today,
  hostToday,
  logFoldToday: logToday,
  lagTokens: hostToday !== null && logToday !== null ? logToday - hostToday : null,
  checks: failures === 0 ? 'all passed' : `${failures} failed`,
}, null, 2)}\n`, 'utf8')

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`)
process.exitCode = failures === 0 ? 0 : 1

