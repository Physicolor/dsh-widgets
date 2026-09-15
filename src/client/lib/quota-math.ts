/**
 * dsh-widgets — 「额度管理」 projection math (pure, dependency-free).
 *
 * The card answers two questions from the plan's OWN billing period:
 *
 *  1. where will this month land? The percent already consumed, plus the RECENT
 *     pace carried over the days left. The pace is a short rolling window
 *     (default 3 days, today prorated by how much of it has elapsed) rather than
 *     the whole period's average — otherwise a burst early in the period keeps
 *     predicting an overrun for days after spending has already slowed down,
 *     which contradicts the very same card saying "today is under budget";
 *  2. what may I spend TODAY? The remaining balance converted into tokens at the
 *     period's own realised local-token-per-credit rate and split over the days
 *     left, so following it lands the period at exactly 100%.
 *
 * Both figures are the SAME story read two ways: the projection is the pace's
 * month-end landing point, the budget is the pace that lands on 100%. When the
 * day's usage is below the budget, the recent pace drops and the projection
 * follows it down.
 *
 * Caliber (#2): the daily log and the budget are BOTH local-accounting tokens.
 * The balance is quoted in credits, and the provider's own token count is a
 * different meter (measured 2026-09-14: 2.66B provider tokens vs 1.56B locally
 * logged over the same period), so the conversion uses the rate implied by the
 * LOCAL log — the same log that supplies 今日用量.
 *
 * Nothing here is invented: a missing percentage/allowance, an unusable period,
 * or too little elapsed time returns `null` (数据不足); a missing credit→token
 * side degrades 今日推荐 alone to `null`. This module imports NOTHING, so a Node
 * type-stripping probe can load it against live endpoints.
 */

const DAY_MS = 86_400_000

/** Minimum elapsed period before projecting at all: below this the pace is
 *  noise (minutes of usage × a 30-day multiplier), so the card degrades. */
export const MIN_ELAPSED_DAYS = 0.25
/** Day-equivalents of recent usage that define the pace carried into the
 *  projection: the previous RECENT_DAYS-1 whole days plus today, prorated. */
export const RECENT_DAYS = 3
/** Today only enters the pace once this much of it has elapsed — otherwise a
 *  few minutes of usage would be extrapolated to a full day. */
export const MIN_DAY_FRACTION = 0.25

/** `YYYY-MM-DD` for a LOCAL date (mirrors `format.dayKey`). */
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The raw inputs, structurally typed so the caller owns the payload shape. */
export interface QuotaInputs {
  /** Percent of the monthly allowance already consumed (0..100). */
  usedPct: unknown
  /** The monthly allowance itself, in credits (the window's cap). */
  allowanceCredits: unknown
  /** Billing-period start, ISO string. */
  periodStart: unknown
  /** Billing-period end (reset), ISO string. */
  periodEnd: unknown
  /** Remaining plan balance (Command Code credits, USD). */
  remainingCredits: unknown
  /** Credits consumed so far in the current billing period. */
  consumedCredits: unknown
  /** Daily token log: `YYYY-MM-DD` -> tokens. */
  daily: unknown
}

/** The derived plan projection. */
export interface QuotaPlan {
  /** Percent consumed so far this period. */
  usedPct: number
  /** Projected percent at the period end at the RECENT pace (may exceed 100). */
  projectedPct: number
  /** The recent pace, in tokens per day, the projection was carried at. */
  recentDailyTokens: number
  /** Period end (the reset the card prints) as an ISO string. */
  periodEndIso: string
  /** Days left until the reset (>= 1). */
  daysLeft: number
  /** Tokens logged today (partial day). */
  todayTokens: number
  /** Recommended token budget for today, or null when the credit→token side is
   *  not derivable (balance / priced period / daily log missing). */
  todayRecommend: number | null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Parse an ISO timestamp; unusable input yields the fallback. */
function isoDate(v: unknown, fallback: Date): Date {
  if (typeof v !== 'string' || v.length === 0) return fallback
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? new Date(ms) : fallback
}

/** Sum a range of day keys, [from, to] inclusive. */
function sumRange(daily: Record<string, number>, from: Date, to: Date): number {
  let total = 0
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (d.getTime() <= last.getTime()) {
    const v = daily[localDayKey(d)]
    if (typeof v === 'number' && Number.isFinite(v)) total += v
    d.setDate(d.getDate() + 1)
  }
  return total
}

/**
 * Project the plan's month-end usage percent and today's token budget.
 * @param input - period / allowance / balance / daily-log inputs.
 * @param now - the clock (injected so the caller — and a probe — can freeze it).
 * @returns the projection, or `null` when the real inputs are not there.
 */
export function planQuota(input: QuotaInputs, now: Date): QuotaPlan | null {
  const usedPct = num(input.usedPct)
  const allowance = num(input.allowanceCredits)
  if (usedPct === null || usedPct < 0) return null
  if (allowance === null || allowance <= 0) return null
  const start = isoDate(input.periodStart, new Date(now.getFullYear(), now.getMonth(), 1))
  const end = isoDate(input.periodEnd, new Date(now.getFullYear(), now.getMonth() + 1, 1))
  // A period that already ended means the payload is stale — the balance no
  // longer describes anything spendable, so degrade instead of guessing.
  if (end.getTime() <= now.getTime()) return null
  const elapsedDays = (now.getTime() - start.getTime()) / DAY_MS
  const totalDays = (end.getTime() - start.getTime()) / DAY_MS
  if (elapsedDays < MIN_ELAPSED_DAYS || totalDays <= elapsedDays) return null
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))

  const daily = input.daily !== null && typeof input.daily === 'object' ? input.daily as Record<string, number> : null
  const todayTokens = daily === null ? 0 : (num(daily[localDayKey(now)]) ?? 0)
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayFraction = Math.max(MIN_DAY_FRACTION, Math.min(1, (now.getTime() - midnight.getTime()) / DAY_MS))

  // ── the credit→token side (drives both the pace and today's budget) ──
  const remaining = num(input.remainingCredits)
  const consumed = num(input.consumedCredits)
  let todayRecommend: number | null = null
  let tokensPerCredit: number | null = null
  if (daily !== null && remaining !== null && remaining >= 0 && consumed !== null && consumed > 0) {
    const spentInPeriod = sumRange(daily, start, now)
    if (spentInPeriod > 0) {
      tokensPerCredit = spentInPeriod / consumed
      todayRecommend = (remaining * tokensPerCredit) / daysLeft
    }
  }

  // ── the recent pace: a short window inside THIS period, today prorated ──
  // RECENT_DAYS day-EQUIVALENTS: the previous RECENT_DAYS-1 whole days plus
  // today (prorated), so the window never double-counts a day and the pace
  // answers "at the current rate, where does the month land?" — the same rate
  // today's budget is compared against.
  const windowStart = new Date(midnight)
  windowStart.setDate(windowStart.getDate() - (RECENT_DAYS - 1))
  const paceFrom = windowStart.getTime() < start.getTime() ? start : windowStart
  const paceFromMidnight = new Date(paceFrom.getFullYear(), paceFrom.getMonth(), paceFrom.getDate())
  const paceDays = Math.max(1, Math.round((midnight.getTime() - paceFromMidnight.getTime()) / DAY_MS) + 1)
  const completeDays = daily === null ? 0 : sumRange(daily, paceFromMidnight, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const recentDailyTokens = daily === null ? 0 : (completeDays + todayTokens / dayFraction) / paceDays

  // Projection = consumed so far + the recent pace × days left, expressed as a
  // percent of the allowance. Without the credit side there is no rate to carry,
  // so the card reports the consumed percent unchanged (a flat month).
  const usedCredits = (usedPct / 100) * allowance
  const paceCredits = tokensPerCredit !== null && tokensPerCredit > 0 ? recentDailyTokens / tokensPerCredit : 0
  const projectedPct = usedPct + ((paceCredits * (totalDays - elapsedDays)) / allowance) * 100

  return {
    usedPct,
    projectedPct,
    recentDailyTokens,
    periodEndIso: end.toISOString(),
    daysLeft,
    todayTokens,
    todayRecommend,
  }
}

/**
 * Compact token amount for the quota figures: `8.9B` / `201M` / `12.3M` / `517K`.
 * TRUNCATES at the displayed precision, so a recommended budget is always a
 * true ceiling (rounding 200.9M up to 201M would hand out tokens it does not have).
 * @param n - token count.
 * @returns the compact label.
 */
export function fmtQuota(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 1e9) return `${(Math.floor(n / 1e8) / 10).toFixed(1)}B`
  if (n >= 1e8) return `${Math.floor(n / 1e6)}M`
  if (n >= 1e6) return `${Math.floor(n / 1e5) / 10}M`
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K`
  return String(Math.floor(n))
}
