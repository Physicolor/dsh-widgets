/**
 * Compare three accountings of the same token usage, day by day.
 *
 *   A) independent  — docs/verify-token-total-independent.mjs (raw session logs)
 *   B) usage-center — `storages/usage-center/index.json` per-request records
 *   C) dsh-widgets  — the heatmap card's localStorage daily log (read out of the
 *      browser store by docs/probe-localstorage.mjs; pass it as the widget JSON)
 *
 * Usage:
 *   node docs/compare-token-accounts.mjs <widgetDaily.json|inline-json>
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const WIDGET = JSON.parse(
  process.argv[2].trim().startsWith('{') ? process.argv[2] : readFileSync(process.argv[2], 'utf8'),
)
const INDEPENDENT = JSON.parse(
  readFileSync(HERE + 'verify-token-total-independent.json', 'utf8'),
)

const index = JSON.parse(readFileSync('D:/dsh-home/storages/usage-center/index.json', 'utf8'))
const dayKey = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const center = new Map()
let centerTotal = 0
for (const r of index.records ?? []) {
  if (typeof r.timestamp !== 'number') continue
  const t = (r.inputTokens || 0) + (r.outputTokens || 0) + (r.cacheReadTokens || 0) + (r.cacheWriteTokens || 0)
  const k = dayKey(r.timestamp)
  center.set(k, (center.get(k) ?? 0) + t)
  centerTotal += t
}

const indep = INDEPENDENT.perDay
const indepTotal = INDEPENDENT.totalTokens
const widgetTotal = Object.values(WIDGET).reduce((a, b) => a + b, 0)

const M = (n) => (n / 1e6).toFixed(1)
const days = [...new Set([...Object.keys(indep), ...center.keys(), ...Object.keys(WIDGET)])].sort()

console.log('day         independent   usage-center     widgets   indep-center  indep-widget')
for (const d of days) {
  const a = indep[d] ?? 0
  const b = center.get(d) ?? 0
  const c = WIDGET[d] ?? 0
  console.log(
    `${d} ${M(a).padStart(12)} ${M(b).padStart(14)} ${M(c).padStart(11)} ${M(a - b).padStart(13)} ${M(a - c).padStart(13)}`,
  )
}
console.log('')
console.log(`independent  total: ${indepTotal}  (${M(indepTotal)}M)`)
console.log(`usage-center total: ${centerTotal}  (${M(centerTotal)}M)  diff vs independent: ${M(centerTotal - indepTotal)}M`)
console.log(`widgets      total: ${widgetTotal}  (${M(widgetTotal)}M)  diff vs independent: ${M(widgetTotal - indepTotal)}M`)
const seedDays = ['2026-08-14', '2026-08-15', '2026-08-16']
const seedExcess = seedDays.reduce((a, d) => a + (WIDGET[d] ?? 0) - (indep[d] ?? 0), 0)
console.log(`widgets excess on 2026-08-14..16 alone: ${M(seedExcess)}M  (preview-mock values, not measured data)`)
const otherExcess = days
  .filter((d) => !seedDays.includes(d))
  .reduce((a, d) => a + (WIDGET[d] ?? 0) - (indep[d] ?? 0), 0)
console.log(`widgets net difference on every other day: ${M(otherExcess)}M`)
