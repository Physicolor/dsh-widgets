/**
 * 额度管理 (quota-manage) live probe — the projection model.
 *
 * Feeds the REAL host payloads through the widget's own math and re-derives
 * every output INDEPENDENTLY (own day arithmetic, own allowance table, own
 * rate), then asserts the one property the card must never break:
 *
 *     projected ≤ 100%  ⇔  recent pace ≤ today's recommended budget
 *
 * i.e. "today is under budget" and "the month lands under 100%" are the SAME
 * statement — the card cannot contradict itself.
 *
 * No browser, no auth: `node docs/probe-quota-manage.mjs` writes
 * docs/probe-quota-manage-result.json and prints the human-checkable inputs.
 */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { planQuota, fmtQuota, localDayKey, logCoversSince, tokensPerCreditOf } from '../src/client/lib/quota-math.ts'

const require = createRequire(import.meta.url)
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
// The GUI gates /api behind a signed browser-session cookie, so an unauthenticated
// fetch answers 401 (and the host route's own retry then hammers it): mint one.
const COOKIE = (() => { const c = mintCookie('127.0.0.1:3080'); return `${c.name}=${c.value}` })()
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const DAY_MS = 86_400_000
/** The recent-pace window, in day-equivalents (2 whole days + today prorated). */
const RECENT = 3

/** Published monthly allowance (USD credits) per plan — written out again here
 *  on purpose: this is the independent side of the comparison. */
const ALLOWANCE = { 'individual-goat': 70 }

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : `  — ${detail}`}`)
}

// ── 1. the real inputs ──
// The host route fetches the four upstream endpoints independently, so a fetch
// can come back with a slice missing while the API is busy (it is rate-limited
// and this probe shares it with the agent's own traffic). Retry before judging.
let cc = null
let dailyPayload = null
let ccDailyPayload = null
for (let attempt = 0; attempt < 4; attempt++) {
  const [c, d, s] = await Promise.all([
    fetch(`${ORIGIN}/api/commandcode-usage`, { headers: { Cookie: COOKIE } }).then((r) => r.json()),
    fetch(`${ORIGIN}/api/widgets-usage-daily`, { headers: { Cookie: COOKIE } }).then((r) => r.json()),
    fetch(`${ORIGIN}/api/widgets-usage-daily?provider=commandcode`, { headers: { Cookie: COOKIE } }).then((r) => r.json()),
  ])
  cc = c
  dailyPayload = d
  ccDailyPayload = s
  const complete = c !== null && c.usage != null && c.credits != null && c.subscription != null
  if (complete) break
  console.log(`(attempt ${attempt + 1}: the host payload came back incomplete — retrying)`)
  await new Promise((r) => setTimeout(r, 2000))
}
// TWO maps: the machine-wide one (heatmap cards) and the Command Code-scoped one
// the 额度管理 card must read. The scoped map is what every assertion below uses.
const allDaily = dailyPayload.daily ?? {}
const daily = ccDailyPayload.daily ?? {}
check(`GET ${ORIGIN}/api/commandcode-usage`, cc !== null && typeof cc === 'object')
check('day map available (dsh-usage-center answered)', dailyPayload.available === true)
check('the card\'s day map is folded to the Command Code route alone',
  ccDailyPayload.available === true && ccDailyPayload.provider === 'commandcode',
  `available=${ccDailyPayload.available} provider=${ccDailyPayload.provider} reason=${ccDailyPayload.reason ?? '-'}`)

const remainingCredits = cc?.credits?.credits?.monthlyCredits
const consumedCredits = cc?.usage?.totalCost
const planId = cc?.subscription?.data?.planId
const periodStart = cc?.subscription?.data?.currentPeriodStart
const periodEnd = cc?.subscription?.data?.currentPeriodEnd
const now = new Date()
const allowance = ALLOWANCE[planId]
console.log(`\ninputs: plan=${planId} allowance=${allowance} remaining=${remainingCredits} consumed=${consumedCredits}`)
console.log(`        period ${periodStart} → ${periodEnd}`)
console.log(`        now    ${now.toISOString()} (local ${localDayKey(now)})  log days=${Object.keys(daily).length}`)

// ── 1b. SCOPE: the card's log holds the plan's OWN route's traffic ──
// The card's credits and billing period describe the Command Code plan, so its
// token side must be folded to `commandcode` alone: the machine-wide map mixes in
// every other provider the harness talked to that day (measured 2026-09-20: 758M
// shown where the plan itself served 474M, the rest a parallel OpenCode pool).
const todayKey = localDayKey(now)
const allToday = allDaily[todayKey] ?? 0
const ccToday = daily[todayKey] ?? 0
console.log(`        scope  machine-wide today ${(allToday / 1e6).toFixed(1)}M | commandcode today ${(ccToday / 1e6).toFixed(1)}M → excluded ${((allToday - ccToday) / 1e6).toFixed(1)}M of other providers`)
check('the scoped map never exceeds the machine-wide map (scoping only removes traffic)',
  Object.entries(daily).every(([k, v]) => v <= (allDaily[k] ?? 0)),
  `${Object.keys(daily).length} scoped days vs ${Object.keys(allDaily).length} machine-wide`)
check("today's row is the Command Code route's own tokens, not the machine's",
  ccToday <= allToday, `${(ccToday / 1e6).toFixed(1)}M of ${(allToday / 1e6).toFixed(1)}M`)

// ── 2. independent recompute ──
const usedPct = ((allowance - remainingCredits) / allowance) * 100
const elapsedDays = (now.getTime() - Date.parse(periodStart)) / DAY_MS
const totalDays = (Date.parse(periodEnd) - Date.parse(periodStart)) / DAY_MS
const daysLeft = Math.ceil((Date.parse(periodEnd) - now.getTime()) / DAY_MS)
const keysIn = (a, b) => {
  const out = []
  const span = Math.floor((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / DAY_MS)
  for (let i = 0; i <= span; i++) {
    const d = new Date(a.getFullYear(), a.getMonth(), a.getDate() + i)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return out
}
const periodKeys = keysIn(new Date(periodStart), now)
const periodTokens = periodKeys.reduce((a, k) => a + (typeof daily[k] === 'number' ? daily[k] : 0), 0)
const tokensPerCredit = tokensPerCreditOf(daily, periodStart, consumedCredits, now) ?? periodTokens / consumedCredits
// The budget divides by the EXACT remaining span (total − elapsed), not the
// rounded-up day count: that is what keeps "pace > budget" and "projected > 100%"
// the same statement (see planQuota's note).
const spanDays = totalDays - elapsedDays
const recommend = (remainingCredits * tokensPerCredit) / spanDays

// Recent pace: the previous RECENT-1 whole days (clipped to the period) plus
// today prorated by how much of it has elapsed.
const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const dayFraction = Math.max(0.25, Math.min(1, (now.getTime() - midnight.getTime()) / DAY_MS))
const windowStart = new Date(midnight)
windowStart.setDate(windowStart.getDate() - (RECENT - 1))
const paceKeys = keysIn(windowStart < new Date(periodStart) ? new Date(periodStart) : windowStart, midnight)
const wholeDays = paceKeys.slice(0, -1)
const paceTokens = wholeDays.reduce((a, k) => a + (typeof daily[k] === 'number' ? daily[k] : 0), 0)
  + (typeof daily[localDayKey(now)] === 'number' ? daily[localDayKey(now)] : 0) / dayFraction
const pace = paceTokens / paceKeys.length
const projectedPct = usedPct + ((pace / tokensPerCredit) * (totalDays - elapsedDays) / allowance) * 100
console.log(`\nperiod ${periodKeys[0]} … ${periodKeys.at(-1)}: ${(periodTokens / 1e6).toFixed(1)}M tokens over ${elapsedDays.toFixed(2)} of ${totalDays} days`)
console.log(`rate ${(tokensPerCredit / 1e6).toFixed(2)}M local tokens/credit`)
console.log(`recent pace ${(pace / 1e6).toFixed(1)}M/day over ${paceKeys.length} day-equivalents (${wholeDays.join(', ')} + today@${(dayFraction * 100).toFixed(0)}%)`)
console.log(`used ${usedPct.toFixed(2)}%  ⇒  projected ${projectedPct.toFixed(1)}%   |   today budget ${(recommend / 1e6).toFixed(1)}M/day`)

// ── 3. the widget's own math ──
const plan = planQuota({ usedPct, allowanceCredits: allowance, periodStart, periodEnd, remainingCredits, consumedCredits, daily }, now)
check('planQuota returned a projection', plan !== null)
if (plan === null) process.exit(1)
check('used percent agrees', Math.abs(plan.usedPct - usedPct) < 1e-9, `${plan.usedPct.toFixed(2)}%`)
check('projected month-end percent agrees', Math.abs(plan.projectedPct - projectedPct) < 1e-6, `${plan.projectedPct.toFixed(1)}% vs ${projectedPct.toFixed(1)}%`)
check('recent pace agrees', Math.abs(plan.recentDailyTokens - pace) < 1e-6, `${(plan.recentDailyTokens / 1e6).toFixed(1)}M/day`)
check('days left agrees', plan.daysLeft === Math.max(1, daysLeft), `${plan.daysLeft}`)
check('reset timestamp is the period end', Math.abs(Date.parse(plan.periodEndIso) - Date.parse(periodEnd)) < 1000, plan.periodEndIso)
check("today's tokens come from today's log row", plan.todayTokens === (daily[localDayKey(now)] ?? 0), `${(plan.todayTokens / 1e6).toFixed(1)}M`)
check('recommended daily budget agrees', Math.abs(plan.todayRecommend - recommend) < 1e-6, `${fmtQuota(plan.todayRecommend)}`)

// ── 4. THE contract: the two figures tell one story ──
const over = plan.projectedPct > 100
const paceOverBudget = plan.recentDailyTokens > plan.todayRecommend
check('projected > 100% ⇔ the recent pace exceeds today\'s budget (same statement)',
  over === paceOverBudget, `projected ${plan.projectedPct.toFixed(1)}%, pace ${(plan.recentDailyTokens / 1e6).toFixed(1)}M vs budget ${(plan.todayRecommend / 1e6).toFixed(1)}M`)
check('today under budget at the same time as a sub-100% projection (or the reverse) is impossible',
  !(plan.todayTokens <= plan.todayRecommend && over && plan.recentDailyTokens <= plan.todayRecommend))
check('projection is monotone in the pace', (() => {
  const slower = planQuota({ usedPct, allowanceCredits: allowance, periodStart, periodEnd, remainingCredits, consumedCredits, daily: Object.fromEntries(Object.entries(daily).map(([k, v]) => [k, k === localDayKey(now) ? v / 10 : v])) }, now)
  return slower.projectedPct < plan.projectedPct
})(), 'halving today\'s usage lowers the projection')
check('fmtQuota truncates', fmtQuota(200_900_000) === '200M' && fmtQuota(8_917_000_000) === '8.9B' && fmtQuota(24_700_000) === '24.7M',
  `${fmtQuota(200_900_000)} / ${fmtQuota(8_917_000_000)} / ${fmtQuota(24_700_000)}`)

// ── 5. degradation: the two sides fail independently ──
const base = { usedPct, allowanceCredits: allowance, periodStart, periodEnd, remainingCredits, consumedCredits, daily }
check('no percentage -> null (the card fills with -%)', planQuota({ ...base, usedPct: undefined }, now) === null)
check('no allowance -> null (nothing to project against)', planQuota({ ...base, allowanceCredits: undefined }, now) === null)
check('no daily log -> projection survives, budget degrades to null', (() => {
  const p = planQuota({ ...base, daily: {} }, now)
  return p !== null && p.todayRecommend === null && p.todayTokens === 0 && p.projectedPct === usedPct
})())
check('stale period (already ended) -> null', planQuota({ ...base, periodEnd: new Date(now.getTime() - DAY_MS).toISOString() }, now) === null)
// A period too young for a pace is NOT "no data": the card still prints the
// consumed percent, today's tokens and today's budget (2026-09-20: the second
// pool member's period started that morning — the card used to print 数据不足).
check('too little elapsed (< 6h) -> projectable false, the figures still real', (() => {
  const p = planQuota({ ...base, periodStart: new Date(now.getTime() - 3 * 3_600_000).toISOString() }, now)
  return p !== null && p.projectable === false && p.projectedPct === p.usedPct && p.periodEndIso !== '' && p.daysLeft >= 1
})(), 'projectable=false ⇒ the card shows the consumed percent')
check('an account that has consumed nothing prints 0 tokens, never the machine log', (() => {
  const p = planQuota({ ...base, consumedCredits: 0, fallbackTokensPerCredit: tokensPerCredit }, now)
  return p !== null && p.todayTokens === 0 && p.recentDailyTokens === 0 && p.projectedPct === p.usedPct
})(), 'the local log belongs to the machine, not to an unused member')
check('an unused member still gets a budget from the pool rate', (() => {
  const p = planQuota({ ...base, consumedCredits: 0, fallbackTokensPerCredit: tokensPerCredit }, now)
  return p !== null && p.todayRecommend !== null && Math.abs(p.todayRecommend - recommend) < 1e-6
})(), 'remaining credits ÷ days left at the pool rate')
// A log that begins MID-PERIOD cannot price the period: its tokens are only part
// of what the period's credits bought, so the rate comes out low — and a low rate
// inflates the pace measured in credits, which is how a freshly loaded page (its
// fallback log holding only today, before usage-center's map lands) turned a calm
// 75% month into a 247% red alarm with a 1.5M recommendation (2026-09-20).
check('the log covers the period (the normal case)', logCoversSince(daily, periodStart, now), `first log day ${Object.keys(daily).sort()[0]} vs period start ${String(periodStart).slice(0, 10)}`)
check('a log that begins mid-period does NOT price the period', (() => {
  const todayOnly = { [localDayKey(now)]: daily[localDayKey(now)] ?? 0 }
  const p = planQuota({ ...base, daily: todayOnly }, now)
  return logCoversSince(todayOnly, periodStart, now) === false && p !== null && p.recentDailyTokens === 0 &&
    (p.projectedPct === p.usedPct || !p.projectable) && p.todayRecommend === null
})(), 'the card then prints the consumed percent and `—`, never an extrapolated alarm')

// ── 6. the POOL: every member's own month, and why one may be un-projectable ──
const pool = Array.isArray(cc.keys) ? cc.keys : []
check('the host payload carries every configured pool member', pool.length >= 2, pool.map((k) => `${k.ref}:${k.label}`).join(', '))
const memberRows = []
for (const k of pool) {
  const d = k.data ?? {}
  const user = d.whoami?.user
  const memberPlan = d.subscription?.data?.planId
  const memberAllowance = ALLOWANCE[memberPlan]
  const memberRemaining = d.credits?.credits?.monthlyCredits
  const memberConsumed = d.usage?.totalCost
  const start = d.subscription?.data?.currentPeriodStart
  const end = d.subscription?.data?.currentPeriodEnd
  const elapsedH = (now.getTime() - Date.parse(start)) / 3_600_000
  const memberPct = typeof memberAllowance === 'number' && typeof memberRemaining === 'number' ? ((memberAllowance - memberRemaining) / memberAllowance) * 100 : undefined
  const p = planQuota({ usedPct: memberPct, allowanceCredits: memberAllowance, periodStart: start, periodEnd: end, remainingCredits: memberRemaining, consumedCredits: memberConsumed, daily, fallbackTokensPerCredit: memberConsumed === 0 ? tokensPerCredit : undefined }, now)
  memberRows.push({ ref: k.ref, label: k.label, name: user?.name ?? null, plan: memberPlan, remaining: memberRemaining, consumed: memberConsumed, requests: d.usage?.totalCount, start, end, elapsedH, usedPct: memberPct ?? null, projectable: p?.projectable ?? null, todayRecommend: p?.todayRecommend ?? null, todayTokens: p?.todayTokens ?? null })
  console.log(`member ${k.label}: whoami=${user?.name} requests=${d.usage?.totalCount} consumed=${memberConsumed} remaining=${memberRemaining} period ${String(start).slice(0, 10)} → ${String(end).slice(0, 10)} (elapsed ${elapsedH.toFixed(2)}h) ⇒ ${p === null ? 'no plan' : `${p.projectable ? 'projected' : 'consumed'} ${(p.projectable ? p.projectedPct : p.usedPct).toFixed(2)}% | today ${p.todayTokens} | budget ${p.todayRecommend === null ? '-' : fmtQuota(p.todayRecommend)}`}`)
}
check('every pool member answers all four endpoints (a member with no data would have null slices)',
  pool.every((k) => k.data !== null && k.data.whoami !== null && k.data.usage !== null && k.data.credits !== null && k.data.subscription !== null),
  pool.map((k) => `${k.label}:${k.data === null ? 'null' : 'ok'}`).join(' '))
check('an unused member reports zero requests (so its zeros are real, not missing)',
  memberRows.some((m) => m.requests === 0 && m.consumed === 0) || memberRows.every((m) => m.requests > 0),
  memberRows.map((m) => `${m.label}:${m.requests}`).join(' '))
check('a member whose period started today is NOT projectable, but still has a period',
  memberRows.filter((m) => m.elapsedH < 6).every((m) => m.projectable === false && m.end !== undefined),
  memberRows.filter((m) => m.elapsedH < 6).map((m) => `${m.label} elapsed ${m.elapsedH.toFixed(2)}h projectable=${m.projectable}`).join(' ') || 'no member is that young')

console.log(`\ncard: 额度管理 | ${Math.round(plan.projectedPct)}% + 账期 ${Number(plan.periodEndIso.slice(5, 7))}-${Number(plan.periodEndIso.slice(8, 10))} (bottom-aligned) | 今日用量 ${fmtQuota(plan.todayTokens)} / 今日推荐 ${fmtQuota(plan.todayRecommend)}`)

writeFileSync(`${HERE}probe-quota-manage-result.json`, `${JSON.stringify({
  probedAt: new Date().toISOString(),
  origin: ORIGIN,
  inputs: { planId, allowance, remainingCredits, consumedCredits, periodStart, periodEnd, now: now.toISOString() },
  window: { periodKeys: [periodKeys[0], periodKeys.at(-1)], periodTokens, elapsedDays, totalDays, daysLeft, tokensPerCredit, paceKeys, dayFraction },
  derived: { usedPct, paceTokensPerDay: pace, projectedPct, projectable: plan.projectable, todayTokens: plan.todayTokens, todayRecommend: recommend },
  pool: memberRows,
  display: {
    big: `${Math.round(plan.projectedPct)}%`,
    grey: [`账期 ${Number(plan.periodEndIso.slice(5, 7))}-${Number(plan.periodEndIso.slice(8, 10))}`],
    used: fmtQuota(plan.todayTokens),
    recommend: fmtQuota(plan.todayRecommend),
    over,
  },
  checks: failures === 0 ? 'all passed' : `${failures} failed`,
}, null, 2)}\n`, 'utf8')

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`)
process.exitCode = failures === 0 ? 0 : 1
