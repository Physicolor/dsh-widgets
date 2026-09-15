/**
 * Probe: compare the two token-total accounting paths on the SAME authoritative
 * data (dsh-usage-center's per-request index).
 *
 *   A) dsh-usage-center total = Σ(input + output + cacheRead + cacheWrite)
 *   B) dsh-widgets heatmap total = its localStorage daily log, whose
 *      non-live past days are a HARD-CODED seed (HEATMAP_RECOVERED in
 *      src/client/lib/heatmap-accounting.ts) plus live per-step crediting.
 *
 * This script recomputes A per day and diffs it against B's frozen seed, and
 * also reports a reconciled A-based daily table for 8/14..8/21.
 *
 * Usage: node docs/probe-token-total.mjs [index.json path]
 */
import { readFileSync } from 'node:fs'

const INDEX = process.argv[2] ?? 'D:/dsh-home/storages/usage-center/index.json'

/** Frozen seed baked into harness-widgets (heatmap-accounting.ts HEATMAP_RECOVERED). */
const WIDGET_SEED = {
  '2026-08-14': 74_315_859,
  '2026-08-15': 367_790_777,
  '2026-08-16': 1_195_700_475,
  '2026-08-17': 161_488_382,
  '2026-08-18': 292_337_504,
  '2026-08-19': 352_355_694,
  '2026-08-20': 214_853_935,
  '2026-08-21': 44_552_871,
}

const dayKey = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const raw = JSON.parse(readFileSync(INDEX, 'utf8'))
const perDay = new Map()
const perDayLive = new Map() // buckets excluding cacheRead (the "live" figure)
let total = 0
let requests = 0
const reasons = new Map()

const recordList = Array.isArray(raw.records)
  ? raw.records
  : (raw.sessions ?? []).flatMap((s) => (Array.isArray(s.records) ? s.records : []))

for (const r of recordList) {
  {
    const t = r.timestamp
    if (typeof t !== 'number') continue
    const sum = (r.inputTokens || 0) + (r.outputTokens || 0) + (r.cacheReadTokens || 0) + (r.cacheWriteTokens || 0)
    const k = dayKey(t)
    perDay.set(k, (perDay.get(k) ?? 0) + sum)
    perDayLive.set(k, (perDayLive.get(k) ?? 0) + (r.inputTokens || 0) + (r.outputTokens || 0) + (r.cacheWriteTokens || 0))
    total += sum
    requests += 1
    const id = r.pricingId ?? '(none)'
    reasons.set(id, (reasons.get(id) ?? 0) + sum)
  }
}

console.log('index:', INDEX)
console.log('requests:', requests, ' all-time totalTokens:', total)

const days = [...new Set([...perDay.keys(), ...Object.keys(WIDGET_SEED)])].sort()
console.log('\nday         usage-center      widgets-seed        diff(center-seed)   ratio(center/seed)')
let seedSum = 0
let centerSum = 0
for (const d of days) {
  const c = perDay.get(d) ?? 0
  const w = WIDGET_SEED[d] ?? null
  if (w !== null) {
    seedSum += w
    centerSum += c
    const diff = c - w
    const ratio = w > 0 ? (c / w).toFixed(3) : 'n/a'
    console.log(`${d}  ${String(c).padStart(14)}  ${String(w).padStart(14)}  ${String(diff).padStart(16)}   ${ratio}`)
  } else {
    console.log(`${d}  ${String(c).padStart(14)}  ${'—'.padStart(14)}`)
  }
}
console.log(`\nseed-window sum: usage-center=${centerSum}  widgets-seed=${seedSum}  diff=${centerSum - seedSum}  ratio=${(centerSum / seedSum).toFixed(3)}`)

// Which days fall inside the widest widget heatmap window (30 weeks)?
const now = new Date()
const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
const base = new Date(startOfWeek)
base.setDate(base.getDate() - 29 * 7)
let windowSum = 0
for (const [k, v] of perDay) {
  if (k >= dayKey(base.getTime())) windowSum += v
}
console.log(`\n30-week rolling window (from ${dayKey(base.getTime())}): usage-center sum = ${windowSum}`)

// 13-week (2x2) window
const base13 = new Date(startOfWeek)
base13.setDate(base13.getDate() - 12 * 7)
let window13 = 0
for (const [k, v] of perDay) if (k >= dayKey(base13.getTime())) window13 += v
console.log(`13-week rolling window (from ${dayKey(base13.getTime())}): usage-center sum = ${window13}`)

console.log('\ntop pricing ids by tokens:')
for (const [id, v] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${id}: ${v}`)
