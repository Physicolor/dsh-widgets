/**
 * session-cost — the pricing math, as PURE functions (no React, no DOM, no i18n).
 *
 * The card answers one question — "what has THIS session cost?" — and the hard
 * part of that question is not the multiplication: it is deciding WHICH published
 * rule may be applied to these tokens at all. So the math lives here, split from
 * the drawing: every function below is a pure function of (price table, session
 * usage, instant), which is what lets a probe prove a rule selection or a peak
 * verdict without a browser, and what keeps the card file down to "what do we
 * print".
 *
 * THE THREE DISCIPLINES THIS MODULE EXISTS TO KEEP (the owner's rules, and the
 * reason several functions return `null` instead of a number):
 *  1. an amount ALWAYS travels with its provenance (`sourceType` — official /
 *     reseller / free route / estimate). A bare amount reads as a bill, and this
 *     card is not a bill;
 *  2. NO rule → NO money. `selectPriceRule` returns `null` and the card prints
 *     tokens with an EMPTY money column — never a fabricated `$0.00`, never a
 *     guessed rate, never a `—` (a dash reads as "a reading that was zero");
 *  3. a whole-session fold at ONE rate band is an ESTIMATE as soon as the rule
 *     carries a peak/off-peak split, because the session record has no
 *     per-request timestamps to split the buckets by hour. `priceSession` reports
 *     `estimated`, and the card marks the figure `≈` and explains itself on hover.
 *
 * WHAT THIS CARD DELIBERATELY DOES NOT READ: `stats.commandCode.credits` (that is
 * plan-allowance occupancy — a different question, and mixing the two is the
 * "mixed scope" bug this repo has already paid for once), and `stats.usageData`
 * (the OpenCode pool's own scope).
 */

import type { ModelRoute, PriceRule, PriceTable } from '../../client/lib/contract/types'

/** The four buckets a rule prices, in the table's own names. Kept as a NAMED type
 *  so the two rate sets (`rates` / `peakRates`) and any future rule cannot drift
 *  apart in shape. */
export interface RateSet {
  inputCacheHit: number
  inputCacheMiss: number
  output: number
  cacheWrite: number
}

/** The session's tokens, in the three buckets the contract can actually deliver.
 *
 *  `uncached` is DERIVED, never read: `inputTokens` already contains the cache
 *  reads (see the collector), so the input billed at the MISS rate is the
 *  remainder after them. The FOURTH bucket the rules name — `cacheWrite` — has no
 *  home in the `usage` contract, so this card does not price it at all: a made-up
 *  0 would silently under-report every write, and the README says so out loud. */
export interface UsageBuckets {
  uncached: number
  cacheRead: number
  output: number
}

/** A token count from an untrusted payload: finite, non-negative, integral. */
function tokens(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/**
 * Split `usage` into the three billable buckets.
 *
 * HAND-WORKED EXAMPLE (the mock this unit's preview uses):
 *   usage = { inputTokens: 18_600_000, cacheReadTokens: 18_400_000, outputTokens: 75_600 }
 *   uncached  = 18_600_000 − 18_400_000 = 200_000
 *   cacheRead = 18_400_000
 *   output    = 75_600
 *
 * `uncached` is CLAMPED at 0 (`max(0, …)`, as the owner asked): a payload whose
 * cache reads exceed its input would otherwise bill a negative amount. `cacheRead`
 * itself is reported as given rather than clamped to the input, because the row's
 * job is to print what the session recorded — only the miss-billed REMAINDER is a
 * derived number, and that one may not go negative.
 */
export function splitUsage(usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null | undefined): UsageBuckets {
  const input = tokens(usage?.inputTokens)
  const cacheRead = tokens(usage?.cacheReadTokens)
  return { uncached: Math.max(0, input - cacheRead), cacheRead, output: tokens(usage?.outputTokens) }
}

/** Total billable tokens across the three buckets. */
export function totalTokens(b: UsageBuckets): number {
  return b.uncached + b.cacheRead + b.output
}

/**
 * The last path segment of a model id, lowercased — the ONE normal form the
 * matcher compares on.
 *
 * WHY: the real table names the same model both ways. The DeepSeek rules say
 * `deepseek-v4.1-flash` while the Command Code fallback rule says
 * `deepseek/deepseek-v4.1-flash`, and a session route reports whichever the
 * controller stores (`deepseek/deepseek-v4.1-flash`, measured on this machine).
 * Comparing the raw strings would silently miss the official rule — the exact
 * class of bug ("no rule matched, so no money") that looks like a missing table.
 *
 * HAND-WORKED EXAMPLE:
 *   'deepseek/deepseek-v4.1-flash' → 'deepseek-v4.1-flash'
 *   'DEEPSEEK-V4.1-FLASH'          → 'deepseek-v4.1-flash'   (same rule matches)
 */
export function normalizeModelName(model: string | null | undefined): string {
  if (typeof model !== 'string') return ''
  const trimmed = model.trim()
  if (trimmed === '') return ''
  const cut = trimmed.lastIndexOf('/')
  return (cut >= 0 ? trimmed.slice(cut + 1) : trimmed).toLowerCase()
}

/**
 * Does a table name pattern select `actual`?
 *
 * SUPPORTED, and the whole supported set (README repeats it):
 *   - exact equality, case-insensitive, after `normalizeModelName`;
 *   - `*` alone → any value;
 *   - a TRAILING `*` → prefix match (`deepseek-*`, `deepseek/*`).
 * NOT supported, on purpose: an interior/wildcard-suffix pattern such as
 * `*-flash` or `deepseek-*-pro`. Such a pattern is unverifiable by eye and would
 * make "which rule did I just apply" unanswerable — a pattern this matcher does
 * not understand simply does not match, and the rule is skipped.
 */
export function nameMatches(pattern: string | null | undefined, actual: string): boolean {
  const p = normalizeModelName(pattern)
  if (p === '') return false
  if (p === '*') return true
  if (p.endsWith('*')) return actual.startsWith(p.slice(0, -1))
  return p === actual
}

/** Provider matching: the same pattern language as `nameMatches`. Providers carry
 *  no namespace prefix in practice, so no prefix stripping is applied here — a
 *  provider named `a/b` would be compared verbatim, and the table has none. */
export function providerMatches(pattern: string | null | undefined, provider: string | null | undefined): boolean {
  const p = typeof pattern === 'string' ? pattern.trim().toLowerCase() : ''
  const a = typeof provider === 'string' ? provider.trim().toLowerCase() : ''
  if (p === '') return false
  if (p === '*') return a !== ''
  if (p.endsWith('*')) return a.startsWith(p.slice(0, -1))
  return p === a
}

/** Is `deepseek/deepseek-v4.1-flash` selected by the rule's own model name? */
export function modelMatches(pattern: string | null | undefined, model: string | null | undefined): boolean {
  const actual = normalizeModelName(model)
  if (actual === '') return false
  return nameMatches(pattern, actual)
}

/** An ISO instant, or `null` when the string is absent or unparseable. */
function instant(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

/**
 * Is the rule inside its own effective window at `now`?
 *
 * `[effectiveFrom, effectiveTo)`: a rule retires AT `effectiveTo` (the table's
 * retired V4 Flash rules end exactly when the V4.1 ones begin, so the two must
 * never both apply at the cutover instant).
 *
 * HAND-WORKED EXAMPLE (2026-09-28, the day this card was written):
 *   rule A: from null       → to 2026-09-10T00:00:00Z  → NOT in force (retired)
 *   rule B: from 2026-09-10 → to null                  → in force
 *   rule C: from "whenever" (unparseable)              → skipped: the card cannot
 *                                                         prove it applies, and an
 *                                                         amount it cannot justify is
 *                                                         not an amount it may print.
 */
export function ruleIsInForce(rule: PriceRule, now: Date): boolean {
  const ms = now.getTime()
  if (rule.effectiveFrom !== null) {
    const from = instant(rule.effectiveFrom)
    if (from === null || ms < from) return false
  }
  if (rule.effectiveTo !== null) {
    const to = instant(rule.effectiveTo)
    if (to === null || ms >= to) return false
  }
  return true
}

/**
 * Pick the ONE rule that may price this session — or `null`, which the card renders
 * as "tokens only" (see discipline 2 at the top of this file).
 *
 * Order of the sieve, and why:
 *  1. provider AND model must both select the route (`providerMatches` /
 *     `modelMatches`). A rule that names only a provider cannot be applied: the
 *     rates belong to a model, not to a vendor;
 *  2. the rule must be inside its effective window (`ruleIsInForce`);
 *  3. of the survivors, the LATEST `effectiveFrom` wins — that is what supersession
 *     means in this table, which keeps retired rules on purpose ("so requests made
 *     while it was in force are not repriced at today's lower rates"). An
 *     unbounded `effectiveFrom` counts as the oldest possible baseline
 *     (`-Infinity`), and an exact tie goes to the LATER row in the file — the
 *     table's own append order, which is how a human writes a correction.
 *
 * HAND-WORKED EXAMPLE (the real pricing.json, 2026-09-28 02:00Z, route
 * provider `deepseek`, model `deepseek/deepseek-v4.1-flash`):
 *   - `deepseek-official-v4-flash-20260731`      model deepseek-v4-flash    → no
 *   - `deepseek-official-v4.1-flash-20260910`    model deepseek-v4.1-flash  → YES
 *   - `deepseek-official-v4-pro-20260813`        model deepseek-v4-pro      → no
 *   - `opencode-go-…` / `commandcode-…` / `ollama-local` (`*`, provider ollama)
 *     → provider mismatch, except `ollama` whose own provider must match too
 *   ⇒ the V4.1 official rule, i.e. legend `官方价 · deepseek-v4.1-flash`.
 */
export function selectPriceRule(
  table: PriceTable | null | undefined,
  route: ModelRoute | null | undefined,
  now: Date,
): PriceRule | null {
  if (table === null || table === undefined) return null
  // `available: false` is the host saying "there is no table" (missing/unreadable
  // file) — deliberately NOT a built-in fallback. Nothing here may invent one.
  if (table.available !== true) return null
  if (route === null || route === undefined || route.model.trim() === '') return null
  let best: PriceRule | null = null
  let bestFrom = -Infinity
  for (const rule of table.rules) {
    if (!providerMatches(rule.provider, route.provider)) continue
    if (!modelMatches(rule.model, route.model)) continue
    if (!ruleIsInForce(rule, now)) continue
    const from = instant(rule.effectiveFrom) ?? -Infinity
    if (from >= bestFrom) {
      best = rule
      bestFrom = from
    }
  }
  return best
}

/** A wall clock in the rule's OWN zone: weekday (0 = Sunday, as everywhere in this
 *  repo) and minutes from midnight. */
export interface ZoneClock {
  dow: number
  mins: number
  /** The zone actually used — the rule's, or `UTC` when it named none. */
  timezone: string
  /** True when the rule's zone id was rejected by the platform and UTC was used
   *  instead. The card never prints this, but a probe can see it. */
  fellBack: boolean
}

const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/**
 * Read `now` in `timezone` (default UTC — the table's own default, and the zone
 * every shipped rule declares).
 *
 * WHY NOT the machine's local clock: the rules are written in the provider's
 * published zone. Evaluating `01:00–04:00 UTC` against a Beijing laptop's local
 * hour would put the peak window eight hours off — the same "peak judged wrong"
 * failure the 峰谷定价 family already has a scar from. Measured on this machine the
 * strings are `UTC`, so the common path is exact; an unknown/garbage zone id falls
 * back to UTC rather than to the local clock (the rule's text is meaningless in
 * local time either way, and UTC is what an unnamed zone means).
 *
 * HAND-WORKED EXAMPLE: now = 2026-09-28T02:00:00Z, timezone 'UTC'
 *   → { dow: 1 (Monday), mins: 120, timezone: 'UTC', fellBack: false }
 */
export function clockIn(timezone: string | null | undefined, now: Date): ZoneClock {
  const tz = typeof timezone === 'string' && timezone.trim() !== '' ? timezone.trim() : 'UTC'
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now)
    let dow = -1
    let hour = -1
    let minute = -1
    for (const part of parts) {
      if (part.type === 'weekday') dow = DOW[part.value] ?? -1
      else if (part.type === 'hour') hour = Number(part.value)
      else if (part.type === 'minute') minute = Number(part.value)
    }
    if (dow >= 0 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { dow, mins: hour * 60 + minute, timezone: tz, fellBack: false }
    }
  } catch {
    // Unknown zone id (RangeError) — fall through to UTC.
  }
  return { dow: now.getUTCDay(), mins: now.getUTCHours() * 60 + now.getUTCMinutes(), timezone: 'UTC', fellBack: tz.toUpperCase() !== 'UTC' }
}

/** `HH:MM` → minutes from midnight, or null when the string is not a clock time. */
function parseHm(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value)
  if (m === null) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Every weekday, for a peak window that names none. */
const ALL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6]

/**
 * Is `now` inside one of the rule's own peak windows?
 *
 * A window is `{ days, start, end }` in the rule's `timezone`; an empty `days`
 * list is read as EVERY day (the field is unspecified, and a window with no day
 * constraint is a daily window). `start > end` is honoured as a window that
 * crosses midnight (`22:00–02:00`), because that is the only reading of such a
 * pair that is not empty. A window whose clock strings do not parse is skipped —
 * never treated as "all day".
 *
 * HAND-WORKED EXAMPLES (all four shipped rules carry the same two windows
 * `days[1..5] 01:00–04:00` and `days[1..5] 06:00–10:00`, zone UTC):
 *   2026-09-28T02:00Z  Monday   02:00 → in 01:00–04:00                → true
 *   2026-09-28T05:00Z  Monday   05:00 → in neither window            → false
 *   2026-09-28T08:30Z  Monday   08:30 → in 06:00–10:00                → true
 *   2026-09-27T02:00Z  Sunday   02:00 → day 0 is not in [1,2,3,4,5]   → false
 */
export function isPeakAt(rule: PriceRule, now: Date): boolean {
  if (rule.peakRates === null || rule.peakWindows.length === 0) return false
  const clock = clockIn(rule.timezone, now)
  for (const window of rule.peakWindows) {
    const days = window.days.length > 0 ? window.days : ALL_DAYS
    if (!days.includes(clock.dow)) continue
    const start = parseHm(window.start)
    const end = parseHm(window.end)
    if (start === null || end === null) continue
    const inside = start <= end
      ? clock.mins >= start && clock.mins < end
      : clock.mins >= start || clock.mins < end
    if (inside) return true
  }
  return false
}

/** Which of the rule's two rate sets is in effect, and the verdict that chose it. */
export interface RateChoice {
  rates: RateSet
  peak: boolean
}

/**
 * The rate set in effect at `now`: `peakRates` inside a peak window, `rates`
 * otherwise — and `rates` for EVERY hour when the rule publishes no peak split
 * (`peakRates === null`), rather than a guessed multiplier.
 *
 * HAND-WORKED EXAMPLE (real V4.1 Flash official rule):
 *   02:00Z Monday → peak → { inputCacheHit: 0.006, inputCacheMiss: 0.30, output: 1.20 }
 *   05:00Z Monday → off  → { inputCacheHit: 0.003, inputCacheMiss: 0.15, output: 0.60 }
 */
export function ratesFor(rule: PriceRule, now: Date): RateChoice {
  if (rule.peakRates !== null && isPeakAt(rule, now)) return { rates: rule.peakRates, peak: true }
  return { rates: rule.rates, peak: false }
}

/** The priced session: the amount, the buckets it came from, and how honest it is. */
export interface SessionPrice {
  currency: string
  amount: number
  buckets: UsageBuckets
  /** Per-bucket money, so a row can carry its own share of the amount. */
  rowCost: { uncached: number; cacheRead: number; output: number }
  rates: RateSet
  /** True when the peak band was the one applied. */
  peak: boolean
  /** True when the fold used ONE band for the whole session while the rule has a
   *  peak/off-peak split — i.e. the number is an estimate (see the file header).
   *  False when a single band genuinely governs every hour of the session.
   *
   *  Deliberately true from EITHER side of the boundary: whether the fold landed on
   *  the peak band or the off-peak one, a session that has been running for hours
   *  cannot be priced at one rate without guessing, so the estimate mark does not
   *  depend on when the card happened to be rendered. */
  estimated: boolean
}

/**
 * Fold the session's buckets into money under one rule.
 *
 * FORMULA (the owner's, per million tokens):
 *   cost = inputCacheMiss × uncached / 1e6
 *        + inputCacheHit  × cacheRead / 1e6
 *        + output         × output / 1e6
 * `cacheWrite` is absent BY CONSTRUCTION: the `usage` contract has no such bucket,
 * so pricing it would mean inventing a 0 (or worse, a share) for costs the card
 * cannot see. The README states this as a known omission.
 *
 * HAND-WORKED EXAMPLE (the preview mock, and the same numbers the card's rows
 * print) — usage = { 18.6M input, 18.4M cacheRead, 75.6K output }, i.e.
 * uncached 200K / cacheRead 18.4M / output 75.6K:
 *
 *   OFF-PEAK (rates 0.003 / 0.15 / 0.60):
 *     200_000     × 0.15  / 1e6 = 0.0300
 *     18_400_000  × 0.003 / 1e6 = 0.0552
 *     75_600      × 0.60  / 1e6 = 0.04536
 *     amount = 0.13056            → the card prints `≈$0.131`
 *
 *   PEAK (peakRates 0.006 / 0.30 / 1.20):
 *     200_000     × 0.30  / 1e6 = 0.0600
 *     18_400_000  × 0.006 / 1e6 = 0.1104
 *     75_600      × 1.20  / 1e6 = 0.09072
 *     amount = 0.26112            → the card prints `≈$0.261`
 *
 *   (The peak set is exactly 2× the off-peak one, which is why applying the wrong
 *   band is a DOUBLED bill rather than a rounding difference — and why the card
 *   says `≈` instead of pretending to know the session's hour-by-hour split.)
 *
 * `fallbackCurrency` is used only when the rule itself names no currency (the
 * table's own `currency` is the natural stand-in); with neither, USD — the unit a
 * bare number would be read in anyway, printed WITH its symbol so it is never
 * ambiguous.
 */
export function priceSession(
  rule: PriceRule,
  usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null | undefined,
  now: Date,
  fallbackCurrency: string | null = null,
): SessionPrice {
  const buckets = splitUsage(usage)
  const choice = ratesFor(rule, now)
  const perMillion = (rate: number, count: number): number => (rate * count) / 1_000_000
  const rowCost = {
    uncached: perMillion(choice.rates.inputCacheMiss, buckets.uncached),
    cacheRead: perMillion(choice.rates.inputCacheHit, buckets.cacheRead),
    output: perMillion(choice.rates.output, buckets.output),
  }
  return {
    currency: (rule.currency ?? fallbackCurrency ?? 'USD').toUpperCase(),
    amount: rowCost.uncached + rowCost.cacheRead + rowCost.output,
    buckets,
    rowCost,
    rates: choice.rates,
    peak: choice.peak,
    estimated: rule.peakRates !== null && rule.peakWindows.length > 0,
  }
}

/** Currency symbol for the ones this machine is likely to see; anything else is
 *  printed as its ISO code (`CHF 0.42`), never silently as `$`. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  RMB: '¥',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
}

/**
 * `$0.131` / `$0` / `<$0.001` / `CHF 1.2` — three significant digits by default,
 * the spend convention this repo already uses for money
 * (`families/cc/renders.ts`), so a cent-scale figure does not print six trailing
 * decimals on a 150px tile.
 *
 * The two edges matter more than the middle:
 *   - a REAL zero prints `$0`. A free route (`sourceType: 'local'`, every rate
 *     genuinely 0) has a true cost of zero, and refusing to print it would be its
 *     own kind of lie — this card distinguishes "zero" from "unknown", and the
 *     unknown case never reaches this function at all (the caller prints no money);
 *   - anything under a tenth of a cent prints `<$0.001` rather than rounding a
 *     real spend down to `$0`.
 *
 * `significant` exists for ONE caller: the per-row shares, which are printed in a
 * three-column grid whose money track may never be narrower than 30px. Measured on
 * the real card (124px grid, `18.4M` + the widest zh label): a 3-significant-digit
 * share (`$0.0552`, 37.6px) leaves 0.6px of slack, while a 2-digit one (`$0.055`,
 * 31.7px) leaves 6.5px. The rows therefore pass 2 and the TOTAL keeps 3 — a
 * deliberate display-precision split, stated in the widget README so nobody reads
 * the rows as an exact decomposition of the figure.
 *
 * HAND-WORKED EXAMPLES: 0 → `$0`; 0.0004 → `<$0.001`; 0.13056 → `$0.131`;
 * 0.03 → `$0.03`; 0.0552 at 2 digits → `$0.055`; 0.13056 in CNY → `¥0.131`;
 * 150.4 → `$150`.
 */
export function fmtMoney(amount: number, currency: string | null, significant = 3): string {
  const code = (currency ?? 'USD').toUpperCase()
  const head = CURRENCY_SYMBOLS[code] ?? `${code} `
  if (!Number.isFinite(amount)) return `${head}0`
  if (amount === 0) return `${head}0`
  const abs = Math.abs(amount)
  if (abs < 0.001) return `<${head}0.001`
  if (abs >= 100) return `${head}${Math.round(amount)}`
  // toPrecision() then back through Number drops the padding zeros it adds
  // (1.00 → `$1`, 0.400 → `$0.4`).
  return `${head}${Number(amount.toPrecision(significant))}`
}

/**
 * The model name as the legend prints it: the last path segment, so
 * `deepseek/deepseek-v4.1-flash` does not spend its first 9 characters repeating
 * the provider the legend's first word already names. Whatever is still too long
 * for the 150px caption is ellipsized by the renderer — the spec asks for a
 * truncated model name on purpose.
 */
export function shortModelName(model: string | null | undefined): string {
  if (typeof model !== 'string') return ''
  const trimmed = model.trim()
  if (trimmed === '') return ''
  const cut = trimmed.lastIndexOf('/')
  return cut >= 0 ? trimmed.slice(cut + 1) : trimmed
}

/** The provenance vocabulary this card prints (see `sourceType` on PriceRule). */
export type SourceKind = 'official' | 'reseller' | 'local' | 'fallback' | 'unknown'

/** `sourceType` → the label the legend prints. `unknown` is its own answer: a rule
 *  with no provenance is NOT "official" by default, it is unattributed, and the
 *  card says exactly that. */
export function sourceKindOf(sourceType: string | null | undefined): SourceKind {
  switch (sourceType) {
    case 'official': return 'official'
    case 'reseller': return 'reseller'
    case 'local': return 'local'
    case 'fallback': return 'fallback'
    default: return 'unknown'
  }
}
