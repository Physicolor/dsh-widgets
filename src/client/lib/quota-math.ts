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
 * Caliber (#3): that rate may only be read off a log that COVERS the period
 * (`logCoversSince`). A log beginning mid-period understates the numerator, and
 * an understated rate does not merely soften the pace — it inflates the pace
 * measured in credits, which turned a calm month into a 247% red alarm on a
 * freshly loaded page (measured 2026-09-20, against a true 75%).
 *
 * Nothing here is invented: a missing percentage, allowance or a period that has
 * already ended returns `null` (the card then fills the layout with `-`, never
 * an error message); a missing credit→token side degrades 今日推荐 alone to
 * `null`; and a period too young to carry a pace comes back with
 * `projectable: false` — the consumed percent, today's tokens and today's budget
 * are all still real, so the card prints those instead of nothing. This module
 * imports NOTHING, so a Node type-stripping probe can load it against live
 * endpoints.
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
  /** Local tokens per credit to fall back on when THIS account's own rate is not
   *  derivable because it has consumed nothing yet (a freshly added pool member):
   *  the budget side still has a real answer — remaining credits ÷ days left —
   *  while the pace side must stay the account's own (0). */
  fallbackTokensPerCredit?: unknown
}

/** The derived plan projection. */
export interface QuotaPlan {
  /** Percent consumed so far this period. */
  usedPct: number
  /** Projected percent at the period end at the RECENT pace (may exceed 100).
   *  Equal to `usedPct` when `projectable` is false. */
  projectedPct: number
  /** Is a month-end projection derivable at all? False while the period is too
   *  young for a pace to mean anything (a fresh billing period, or a pool member
   *  added today): the card then prints the consumed percent as-is instead of a
   *  number extrapolated from minutes of usage. */
  projectable: boolean
  /** The recent pace, in tokens per day, the projection was carried at. */
  recentDailyTokens: number
  /** Period end (the reset the card prints) as an ISO string. */
  periodEndIso: string
  /** Days left until the reset (>= 1). */
  daysLeft: number
  /** Tokens logged today (partial day). Zero for a pool member that has consumed
   *  nothing this period — the local log belongs to the machine, not to it. */
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
 * Tokens logged over `[periodStart, now]`.
 *
 * Exported on its own so a POOL can sum each member's OWN window (see the quota
 * card's `poolTokensPerCredit`): one shared window charged a key that reset this
 * morning against another key's three-week-old start. Day-granular, like the log
 * itself — the window's first and last day count whole.
 *
 * @param daily - the `YYYY-MM-DD` → tokens log (anything else yields 0).
 * @param periodStart - the window start (ISO string; unusable → `now`).
 * @param now - the clock.
 * @returns logged tokens inside the window (0 when the log has nothing there).
 */
export function loggedTokensIn(daily: unknown, periodStart: unknown, now: Date): number {
  const map = daily !== null && typeof daily === 'object' ? daily as Record<string, number> : null
  if (map === null) return 0
  return sumRange(map, isoDate(periodStart, now), now)
}

/**
 * The realised local-token-per-credit rate of one billing period:
 * `Σ logged tokens over [start, now] ÷ credits consumed in it`.
 *
 * Null when either side is unusable — in particular when the account has
 * consumed NOTHING in the period. That null is meaningful, not an error: a pool
 * member added today has no rate of its own, and the caller may hand the POOL's
 * rate in as `fallbackTokensPerCredit` so the budget side still answers.
 *
 * @param daily - the `YYYY-MM-DD` → tokens log.
 * @param periodStart - the period start (ISO string).
 * @param consumedCredits - credits consumed in that period.
 * @param now - the clock.
 */
export function tokensPerCreditOf(daily: unknown, periodStart: unknown, consumedCredits: unknown, now: Date): number | null {
  const consumed = num(consumedCredits)
  if (consumed === null || !(consumed > 0)) return null
  if (daily === null || typeof daily !== 'object') return null
  const spent = loggedTokensIn(daily, periodStart, now)
  return spent > 0 ? spent / consumed : null
}

/**
 * Does the log reach back to `since` — i.e. does it hold a row on or before that
 * day? (Day-granular, like the log itself.)
 *
 * The credit→token rate divides the log's tokens by the period's WHOLE spend,
 * so it only means something when the log saw the whole period. A log that
 * begins mid-period (a browser that was closed until today, a fresh install, the
 * client's own accounting before dsh-usage-center's map lands) understates the
 * numerator — which does not merely soften the rate, it inflates the pace
 * measured in credits and turned a calm month into a 247% red alarm (measured
 * 2026-09-20 on a freshly loaded page whose fallback log held only today,
 * against a true 75%).
 *
 * @param daily - the `YYYY-MM-DD` → tokens log.
 * @param since - the window start (ISO string; unusable → the window IS today,
 *   which any non-empty log covers).
 * @param now - the clock.
 * @returns true when a log row exists at or before `since`'s local day.
 */
export function logCoversSince(daily: unknown, since: unknown, now: Date): boolean {
  const map = daily !== null && typeof daily === 'object' ? daily as Record<string, number> : null
  if (map === null) return false
  const keys = Object.keys(map).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()
  if (keys.length === 0) return false
  const from = localDayKey(isoDate(since, now))
  return keys[0] <= from
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
  if (totalDays <= elapsedDays) return null
  // Too young to project: the card still has everything it needs to print the
  // consumed percent, today's tokens and today's budget, so this is a FLAG, not
  // a null — "no projection yet" must never read as "no data".
  const projectable = elapsedDays >= MIN_ELAPSED_DAYS
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))

  const daily = input.daily !== null && typeof input.daily === 'object' ? input.daily as Record<string, number> : null
  // The account's OWN rate: null for a period it has not spent in at all, and
  // null when the log cannot price that period (see `logCoversSince`) — an
  // unpriced rate is not a small rate, it is a rate that turns a calm month into
  // an alarm.
  const consumed = num(input.consumedCredits)
  const spent = consumed !== null && consumed > 0
  const covered = spent && daily !== null && logCoversSince(daily, input.periodStart, now)
  const ownRate = covered ? tokensPerCreditOf(input.daily, input.periodStart, consumed, now) : null
  // Today's tokens belong to the MACHINE's log, so they are only this account's
  // when this account actually spent something this period (an unused pool member
  // prints 0 — the local log did not come from it). They do NOT need the period
  // to be priced: the row is today's, whatever the rate side can say.
  const loggedInPeriod = spent && daily !== null ? loggedTokensIn(input.daily, input.periodStart, now) : 0
  const todayTokens = loggedInPeriod > 0 && daily !== null ? (num(daily[localDayKey(now)]) ?? 0) : 0
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayFraction = Math.max(MIN_DAY_FRACTION, Math.min(1, (now.getTime() - midnight.getTime()) / DAY_MS))

  // ── the credit→token side (drives today's budget) ──
  // The BUDGET may ride the pool's rate when this account has no rate of its own
  // (a member added today still has a real remaining balance and a real period),
  // but the PACE never does: projecting the machine's usage onto an account that
  // has served nothing would invent a number.
  const budgetRate = ownRate ?? num(input.fallbackTokensPerCredit)
  const remaining = num(input.remainingCredits)
  // The budget divides by the EXACT remaining span, not the rounded-up day count
  // the card reports: that is what makes "projected > 100%" and "the pace exceeds
  // the budget" the SAME statement. With ceil(), a 20.29-day span became 21 days,
  // so a pace inside that 3.5% band exceeded the budget while the projection still
  // read 98% (measured live 2026-09-20: pace 258.9M vs budget 253.4M, projected
  // 98.5%). `daysLeft` stays the ≥1 figure the callers print.
  const spanDays = totalDays - elapsedDays
  let todayRecommend: number | null = null
  if (daily !== null && budgetRate !== null && budgetRate > 0 && remaining !== null && remaining >= 0) {
    todayRecommend = (remaining * budgetRate) / spanDays
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
  const completeDays = daily === null || ownRate === null ? 0 : sumRange(daily, paceFromMidnight, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const recentDailyTokens = !projectable || daily === null || ownRate === null ? 0 : (completeDays + todayTokens / dayFraction) / paceDays

  // Projection = consumed so far + the recent pace × days left, expressed as a
  // percent of the allowance. Without the credit side there is no rate to carry,
  // so the card reports the consumed percent unchanged (a flat month).
  const paceCredits = ownRate !== null && ownRate > 0 ? recentDailyTokens / ownRate : 0
  const projectedPct = usedPct + ((paceCredits * (totalDays - elapsedDays)) / allowance) * 100

  return {
    usedPct,
    projectedPct,
    projectable,
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
