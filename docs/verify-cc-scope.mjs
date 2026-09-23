/**
 * 额度管理 scope arbitration — is the card measuring its OWN plan?
 *
 * WHY THIS EXISTS. The card's percent, 今日用量 and 今日推荐 all ride one daily
 * token log. That log used to be machine-wide, so the Command Code plan was
 * charged for every OTHER provider the harness talked to in the same window
 * (measured 2026-09-20: 今日用量 758M where the `commandcode` route itself served
 * 474M — the rest a parallel OpenCode Go pool). This script decides the question
 * independently of the widget:
 *
 *   1. fold the RAW session logs itself (no plugin code) into per-day tokens PER
 *      PROVIDER ROUTE — decode every `sessions/**‍/*.jsonl.zstd`, per
 *      (session, turn, step) the LAST usage sample wins, the day is the local
 *      calendar day of the usage event, the route comes from the request header
 *      / context / assistant message source (the same fields usage-center folds);
 *   2. ask the host for the machine-wide day map and the `?provider=commandcode`
 *      one, plus the real Command Code account payload;
 *   3. assert what the card must be true of: its 今日用量 equals the route's OWN
 *      tokens, and the machine-wide figure is larger by exactly the other
 *      providers' traffic.
 *
 * Usage: node docs/verify-cc-scope.mjs   (writes docs/verify-cc-scope-result.json)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zstdDecompressSync } from 'node:zlib'
import { createRequire } from 'node:module'
import { planQuota, fmtQuota, localDayKey } from '../src/client/lib/quota-math.ts'

const require = createRequire(import.meta.url)
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const SESSIONS = process.env.DSH_SESSIONS ?? 'D:/dsh-home/sessions'
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const CC_ROUTE = 'commandcode'
const OUT = fileURLToPath(new URL('./verify-cc-scope-result.json', import.meta.url))
/** Published monthly allowance (USD credits) per plan — the independent side. */
const ALLOWANCE = { 'individual-goat': 70 }
const COOKIE = (() => { const c = mintCookie('127.0.0.1:3080'); return `${c.name}=${c.value}` })()

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : `  — ${detail}`}`)
}

// ── 1. independent fold of the raw session logs ──
/** Decode a multi-frame zstd session log (one frame per append). */
function decodeLog(path) {
  const buf = readFileSync(path)
  const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
  const starts = []
  let at = buf.indexOf(magic, 0)
  while (at >= 0) {
    starts.push(at)
    at = buf.indexOf(magic, at + 4)
  }
  if (starts.length === 0) return ''
  const parts = []
  for (let k = 0; k < starts.length; k++) {
    let end = k + 1 < starts.length ? starts[k + 1] : buf.length
    for (;;) {
      try {
        parts.push(zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8'))
        break
      } catch {
        if (k + 1 < starts.length) {
          k += 1
          end = k + 1 < starts.length ? starts[k + 1] : buf.length
        } else break
      }
    }
  }
  return parts.join('')
}
function findLogs(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findLogs(full))
    else if (entry.name.endsWith('.zstd')) found.push(full)
  }
  return found
}
const localDay = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const asObj = (v) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v : null)
const num = (o, k) => (o !== null && typeof o[k] === 'number' && Number.isFinite(o[k]) ? o[k] : null)
function readTokens(source) {
  const r = asObj(source)
  if (r === null) return null
  const input = num(r, 'inputTokens')
  const output = num(r, 'outputTokens')
  if (input === null || output === null) return null
  return input + output + (num(r, 'cacheReadTokens') ?? 0) + (num(r, 'cacheWriteTokens') ?? 0)
}

/** provider -> day -> tokens (and the machine-wide total alongside). */
const perProviderDay = new Map()
const perDay = new Map()
let steps = 0

function foldLog(path) {
  const samples = new Map()
  let route = null
  const text = decodeLog(path)
  for (const line of text.split('\n')) {
    if (line === '' || line.charCodeAt(0) !== 123) continue
    let ev
    try { ev = JSON.parse(line) } catch { continue }
    const data = asObj(ev.data)
    if (data === null) continue
    if (ev.type === 'request/header') {
      const header = asObj(data.header)
      const config = header === null ? null : asObj(header.config)
      if (config !== null && typeof config.provider === 'string') route = config.provider
      continue
    }
    if (ev.type === 'request/context') {
      if (typeof data.provider === 'string') route = data.provider
      continue
    }
    if (ev.type !== 'assistant/chunk' && ev.type !== 'assistant/message') continue
    const turn = num(data, 'turn')
    const step = num(data, 'step')
    if (turn === null || step === null) continue
    let tokens = null
    let at = null
    if (ev.type === 'assistant/chunk') {
      const chunk = asObj(data.chunk)
      if (chunk === null || chunk.type !== 'usage') continue
      tokens = readTokens(chunk.usage)
      at = typeof ev.time === 'number' ? ev.time : null
    } else {
      tokens = readTokens(data.usage)
      at = typeof ev.time === 'number' ? ev.time : null
      const message = asObj(data.message)
      const source = message === null ? null : asObj(message.source)
      if (source !== null && typeof source.provider === 'string') route = source.provider
    }
    if (tokens === null) continue
    const key = `${turn}\u0000${step}`
    const prev = samples.get(key)
    samples.set(key, { tokens, at: at ?? prev?.at ?? null, route: (prev !== null && prev !== undefined && prev.route !== null && prev.route !== undefined) ? prev.route : route })
  }
  for (const sample of samples.values()) {
    if (sample.tokens <= 0 || sample.at === null) continue
    steps += 1
    const day = localDay(sample.at)
    perDay.set(day, (perDay.get(day) ?? 0) + sample.tokens)
    const provider = sample.route ?? 'unknown'
    const bucket = perProviderDay.get(provider) ?? new Map()
    bucket.set(day, (bucket.get(day) ?? 0) + sample.tokens)
    perProviderDay.set(provider, bucket)
  }
}

const logs = findLogs(SESSIONS)
process.stderr.write(`folding ${logs.length} session logs under ${SESSIONS} (independent of every plugin)\n`)
let done = 0
for (const log of logs) {
  try { foldLog(log) } catch (err) { process.stderr.write(`FAILED ${log}: ${err.message}\n`) }
  done += 1
  if (done % 50 === 0) process.stderr.write(`  ${done}/${logs.length}\n`)
}
const ccDays = perProviderDay.get(CC_ROUTE) ?? new Map()
const now = new Date()
const today = localDayKey(now)
const ccToday = ccDays.get(today) ?? 0
const allToday = perDay.get(today) ?? 0
console.log(`\nindependent fold: ${logs.length} logs, ${steps} steps, ${perProviderDay.size} routes`)
console.log(`  today ${today}: machine-wide ${(allToday / 1e6).toFixed(1)}M | ${CC_ROUTE} ${(ccToday / 1e6).toFixed(1)}M | other ${((allToday - ccToday) / 1e6).toFixed(1)}M`)
for (const [provider, days] of [...perProviderDay.entries()].sort((a, b) => (b[1].get(today) ?? 0) - (a[1].get(today) ?? 0))) {
  console.log(`    ${provider.padEnd(22)} today ${((days.get(today) ?? 0) / 1e6).toFixed(1)}M`)
}
check('the independent fold sees traffic on the Command Code route today', ccToday > 0, `${(ccToday / 1e6).toFixed(1)}M`)

// ── 2. the host's two maps + the real account payload ──
const get = async (path) => fetch(`${ORIGIN}${path}`, { headers: { Cookie: COOKIE } }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
let cc = null
let allPayload = null
let scopedPayload = null
for (let attempt = 0; attempt < 4; attempt++) {
  const [c, a, s] = await Promise.all([
    get('/api/commandcode-usage'),
    get('/api/widgets-usage-daily'),
    get(`/api/widgets-usage-daily?provider=${CC_ROUTE}`),
  ])
  cc = c
  allPayload = a
  scopedPayload = s
  if (c !== null && c.usage != null && c.credits != null && c.subscription != null) break
  console.log(`(attempt ${attempt + 1}: the host payload came back incomplete — retrying)`)
  await new Promise((r) => setTimeout(r, 2000))
}
const hostAll = allPayload?.daily ?? {}
const hostScoped = scopedPayload?.daily ?? {}
check('host answered the machine-wide map', allPayload?.available === true && Object.keys(hostAll).length > 0, `days=${Object.keys(hostAll).length}`)
check(`host answered the scoped map with provider=${CC_ROUTE} (requires the restarted host)`,
  scopedPayload?.available === true && scopedPayload?.provider === CC_ROUTE,
  JSON.stringify(scopedPayload && { available: scopedPayload.available, provider: scopedPayload.provider, reason: scopedPayload.reason }).slice(0, 160))

// ── 3. the card's own math, on BOTH calibers ──
const remaining = cc?.credits?.credits?.monthlyCredits
const consumed = cc?.usage?.totalCost
const planId = cc?.subscription?.data?.planId
const allowance = ALLOWANCE[planId]
const periodStart = cc?.subscription?.data?.currentPeriodStart
const periodEnd = cc?.subscription?.data?.currentPeriodEnd
const usedPct = typeof allowance === 'number' && typeof remaining === 'number' ? ((allowance - remaining) / allowance) * 100 : undefined
const base = { usedPct, allowanceCredits: allowance, periodStart, periodEnd, remainingCredits: remaining, consumedCredits: consumed }
const planAll = planQuota({ ...base, daily: hostAll }, now)
const planScoped = planQuota({ ...base, daily: hostScoped }, now)
check('the card renders both calibers (payload complete)', planAll !== null && planScoped !== null)

const hostScopedToday = hostScoped[today] ?? 0
const hostAllToday = hostAll[today] ?? 0
console.log(`\ninputs: plan=${planId} allowance=${allowance} remaining=${remaining} consumed=${consumed} usedPct=${usedPct?.toFixed(2)}`)
console.log(`        period ${String(periodStart).slice(0, 10)} → ${String(periodEnd).slice(0, 10)}`)
console.log(`card 今日用量: machine-wide caliber ${fmtQuota(planAll.todayTokens)}  |  scoped caliber ${fmtQuota(planScoped.todayTokens)}`)
console.log(`card 今日推荐: machine-wide ${planAll.todayRecommend === null ? '—' : fmtQuota(planAll.todayRecommend)}  |  scoped ${planScoped.todayRecommend === null ? '—' : fmtQuota(planScoped.todayRecommend)}`)
console.log(`card figure:   machine-wide ${planAll.projectedPct.toFixed(1)}%  |  scoped ${planScoped.projectedPct.toFixed(1)}%`)

const near = (a, b, rel = 0.02) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * rel)
check("the scoped caliber's 今日用量 equals the route's own tokens",
  near(planScoped.todayTokens, hostScopedToday), `${fmtQuota(planScoped.todayTokens)} vs ${fmtQuota(hostScopedToday)}`)
check("the machine-wide caliber over-counts the plan by the OTHER providers' traffic",
  hostAllToday >= hostScopedToday && near(planAll.todayTokens - planScoped.todayTokens, hostAllToday - hostScopedToday),
  `${fmtQuota(planAll.todayTokens)} − ${fmtQuota(planScoped.todayTokens)} vs excluded ${fmtQuota(hostAllToday - hostScopedToday)}`)
check('the host scoped map agrees with the independent log fold (same day, <2%)',
  near(hostScopedToday, ccToday), `host ${fmtQuota(hostScopedToday)} vs independent ${fmtQuota(ccToday)}`)
check('the machine-wide host map agrees with the independent fold (<2%)',
  near(hostAllToday, allToday), `host ${fmtQuota(hostAllToday)} vs independent ${fmtQuota(allToday)}`)
check('the excluded traffic is real (a second plan ran today) or the maps are simply equal',
  hostAllToday === hostScopedToday || hostAllToday > hostScopedToday,
  `excluded ${fmtQuota(hostAllToday - hostScopedToday)}`)

writeFileSync(OUT, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  sessionsRoot: SESSIONS,
  logsScanned: logs.length,
  steps,
  today,
  independent: { machineWide: allToday, commandCode: ccToday, other: allToday - ccToday, byProviderToday: Object.fromEntries([...perProviderDay.entries()].map(([p, d]) => [p, d.get(today) ?? 0])) },
  host: { machineWide: hostAllToday, commandCode: hostScopedToday, scopedProviderEchoed: scopedPayload?.provider ?? null },
  card: {
    machineWideCaliber: { todayTokens: planAll.todayTokens, todayRecommend: planAll.todayRecommend, projectedPct: planAll.projectedPct },
    commandCodeCaliber: { todayTokens: planScoped.todayTokens, todayRecommend: planScoped.todayRecommend, projectedPct: planScoped.projectedPct },
  },
  checks: failures === 0 ? 'all passed' : `${failures} failed`,
}, null, 2)}\n`, 'utf8')

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`)
console.log(`written: ${OUT}`)
process.exitCode = failures === 0 ? 0 : 1
