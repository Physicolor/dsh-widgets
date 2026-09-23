/**
 * dsh-widgets - Command Code account usage shared render layer.
 *
 * The eight commandcode widgets (cc-whoami / cc-usage / cc-credits /
 * cc-windows / cc-subscription / cc-window-5h / cc-window-weekly /
 * cc-window-monthly) read the host-aggregated `/api/commandcode-usage`
 * payload (`stats.commandCode`) and render their card shapes here - NOT
 * copied into each unit - so the family stays consistent.
 *
 * Card title convention: the product name is long, so EVERY card titles
 * itself `Command Code` and puts its role word (account / usage / credits /
 * window / plan) on the small grey legend line directly under the title.
 *
 * Window sources (the four official endpoints):
 *   - 5h / weekly: `billing/credits` -> windowLimits.{fiveHour,weekly} with an
 *     explicit `used` and `cap`;
 *   - monthly: the API serves NO monthly window object, so the month figure is
 *     derived from the one monthly quantity the API DOES report — the remaining
 *     balance: used = plan allowance - credits.monthlyCredits, against the
 *     plan's published allowance. The old `used + remaining` denominator was
 *     not the allowance at all (measured 17.26 + 59.01 = 76.27 on a $70 plan),
 *     which is how the card read 22.6% where the official site read ~16%.
 *
 * The payload is fully nullable: the host fetches each endpoint independently,
 * so one failing endpoint degrades that slice to a placeholder instead of
 * blanking the whole rail.
 *
 * All strings come from each unit's manifest dictionary (family-shared keys
 * live in `src/widgets/_shared/locales.json`).
 */

import { t } from '../i18n'
import { fmtTokens } from './format'
import type { BarDatum, CommandCodeAccount, CommandCodeCredits, CommandCodeData, CommandCodeKeyEntry, CommandCodeSubscription, CommandCodeWindow, WidgetChart, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from './contract'

/** Read the commandcode payload defensively: absent / malformed -> null. */
function cc(stats: WidgetStats): CommandCodeData | null {
  const c = stats.commandCode
  return c !== null && typeof c === 'object' ? c : null
}

/** Resolve a per-family hint when the payload is missing. The KEY is never
 *  user-entered: the host auto-reads it (env -> $DSH_HOME/.credentials.yaml ->
 *  .env), so the hint below explains the actual failure instead of asking the
 *  user to configure anything. */
function hint(stats: WidgetStats): string {
  const err = stats.commandCodeError
  if (err === 'unloaded') return t('cc.unloaded')
  if (err === 'unconfigured') return t('cc.unconfigured')
  if (err) return t('cc.unavailable')
  return t('cc.unconfigured')
}

// ---- Pooled accounts (two or more Command Code keys) ----
//
// The host route answers with the FIRST member's slices plus every member in
// `keys`. Everything below turns that into the "which account am I looking at"
// layer the card family shares:
//   - one pool    -> no switcher at all; the top-level slices ARE the answer
//                    (byte-for-byte the pre-pool behaviour);
//   - two or more -> views [AllUser, ...account labels], where AllUser is the
//                    field-by-field SUM of the pool (computed HERE, because the
//                    plan -> allowance table this needs lives in this module).

/** The generic (whole-pool) view label. Deliberately the SAME literal in both
 *  languages: the user asked for `AllUser` as the generic expression. */
export const CC_ALL = 'AllUser'

/** What a Command Code card should currently show. */
export interface CcViewState {
  /** The payload to render for the CURRENT view (the member's own slices, or the
   *  AllUser aggregate). */
  data: CommandCodeData | null
  /** The current view's label ('AllUser' or an account name). */
  mode: string
  /** Every switchable view, in tap order (AllUser first). EMPTY when the host
   *  reported a single pool — the card then renders that account and a tap does
   *  nothing. */
  modes: string[]
  /** The pool members' labels, for the AllUser account card's bottom line. */
  names: string[]
  /** True when there is more than one pool to switch between. */
  multi: boolean
}

/** Sum a numeric field over the pool members that report it; undefined when none. */
function sumOf(accounts: Array<CommandCodeAccount | null>, pick: (a: CommandCodeAccount) => number | undefined): number | undefined {
  let total = 0
  let seen = false
  for (const a of accounts) {
    if (a === null) continue
    const v = pick(a)
    if (typeof v === 'number' && Number.isFinite(v)) { total += v; seen = true }
  }
  return seen ? total : undefined
}

/** One window summed across the pool: used and cap add, `exceeded` is sticky,
 *  and the reset is the EARLIEST member reset — the next moment the pool as a
 *  whole regains capacity. Members that do not report the window are skipped, so
 *  a key that never started a 5h window does not drag its cap in as "available". */
function sumWindow(accounts: Array<CommandCodeAccount | null>, pick: (a: CommandCodeAccount) => CommandCodeWindow | null | undefined): CommandCodeWindow | null {
  const members: CommandCodeWindow[] = []
  for (const a of accounts) {
    if (a === null) continue
    const w = pick(a)
    if (w !== null && w !== undefined && typeof w.used === 'number' && typeof w.cap === 'number') members.push(w)
  }
  if (members.length === 0) return null
  const resets = members.map((m) => m.resetAt).filter((ms): ms is number => typeof ms === 'number' && ms > 0)
  return {
    used: members.reduce((s, m) => s + (m.used ?? 0), 0),
    cap: members.reduce((s, m) => s + (m.cap ?? 0), 0),
    exceeded: members.some((m) => m.exceeded === true),
    resetAt: resets.length > 0 ? Math.min(...resets) : 0,
  }
}

/** Is this a non-empty string? (type guard for the aggregate's label lists) */
function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v !== ''
}

/** Distinct strings, in first-seen order. */
function unique(values: string[]): string[] {
  return values.filter((v, i) => values.indexOf(v) === i)
}

/** The pool member whose reset comes FIRST — the pool's next renewal. */
function earliestEnd(accounts: CommandCodeAccount[]): CommandCodeAccount | null {
  let best: CommandCodeAccount | null = null
  let bestMs = Number.POSITIVE_INFINITY
  for (const a of accounts) {
    const ms = Date.parse(String(a.subscription?.data?.currentPeriodEnd))
    if (!Number.isFinite(ms) || ms >= bestMs) continue
    best = a
    bestMs = ms
  }
  return best
}

/**
 * The AllUser total: the pool summed field by field.
 *
 * Additive quantities are SUMMED, so a window's pool percent is
 * `sum(used) / sum(cap)` — the honest "all pools" reading. A mean of percents
 * would be wrong here: one exhausted pool beside one untouched pool is 50% used
 * of the allowance, not 50% of each.
 *
 * `whoami` stays null — the aggregate has no single identity, so the account
 * card prints the generic `AllUser` label with the member names on its bottom
 * line. `keys` is carried through deliberately: the monthly window needs each
 * member's OWN plan to size the pool's allowance (see `monthlyWindow`).
 */
function aggregate(keys: CommandCodeKeyEntry[]): CommandCodeData {
  const accounts = keys.map((k) => k.data)
  const present = accounts.filter((a): a is CommandCodeAccount => a !== null)
  const base: CommandCodeData = { whoami: null, usage: null, credits: null, subscription: null, keys }
  if (present.length === 0) return base

  const count = sumOf(accounts, (a) => a.usage?.totalCount)
  const failed = sumOf(accounts, (a) => a.usage?.failedCount)
  const cost = sumOf(accounts, (a) => a.usage?.totalCost)
  const usage: CommandCodeData['usage'] = present.some((a) => a.usage != null)
    ? {
        totalCount: count,
        totalCost: cost,
        averageCost: count !== undefined && count > 0 && cost !== undefined ? cost / count : undefined,
        // Weighted from the summed counts: a member with zero requests reports
        // successRate 0 upstream, which must not drag the pool's rate down.
        successRate: count !== undefined && count > 0 && failed !== undefined ? ((count - failed) / count) * 100 : undefined,
        completedCount: sumOf(accounts, (a) => a.usage?.completedCount),
        failedCount: failed,
        totalTokensIn: sumOf(accounts, (a) => a.usage?.totalTokensIn),
        totalTokensOut: sumOf(accounts, (a) => a.usage?.totalTokensOut),
        totalTokens: sumOf(accounts, (a) => a.usage?.totalTokens),
        totalCredits: sumOf(accounts, (a) => a.usage?.totalCredits),
        totalFreeCredits: sumOf(accounts, (a) => a.usage?.totalFreeCredits),
        totalMonthlyCredits: sumOf(accounts, (a) => a.usage?.totalMonthlyCredits),
        totalPurchasedCredits: sumOf(accounts, (a) => a.usage?.totalPurchasedCredits),
        periodBasis: present.map((a) => a.usage?.periodBasis).find(nonEmpty),
      }
    : null

  const credits: CommandCodeCredits | null = present.some((a) => a.credits != null)
    ? {
        credits: {
          belowThreshold: present.some((a) => a.credits?.credits?.belowThreshold === true) || undefined,
          creditThreshold: sumOf(accounts, (a) => a.credits?.credits?.creditThreshold),
          monthlyCredits: sumOf(accounts, (a) => a.credits?.credits?.monthlyCredits),
          purchasedCredits: sumOf(accounts, (a) => a.credits?.credits?.purchasedCredits),
          freeCredits: sumOf(accounts, (a) => a.credits?.credits?.freeCredits),
        },
        windowLimits: {
          limited: present.some((a) => a.credits?.windowLimits?.limited === true) || undefined,
          exceeded: null,
          fiveHour: sumWindow(accounts, (a) => a.credits?.windowLimits?.fiveHour),
          weekly: sumWindow(accounts, (a) => a.credits?.windowLimits?.weekly),
        },
      }
    : null

  // Plans/statuses dedupe (two GOAT accounts are one plan, not "goat + goat").
  const plans = unique(present.map((a) => a.subscription?.data?.planId).filter(nonEmpty))
  const statuses = unique(present.map((a) => a.subscription?.data?.status).filter(nonEmpty))
  // The calendar is ONE member's pair, never the earliest start beside the
  // earliest end: those two halves can come from DIFFERENT members (live pool:
  // Physicolor 09-10 → 10-10, Sparxie 09-20 → 10-20), and then every consumer
  // measures a period no member ever had — the 额度管理 card read its elapsed
  // share from 09-20 while printing `账期 10-10`.
  const now = Date.now()
  const dated = present.filter((a) => nonEmpty(a.subscription?.data?.currentPeriodEnd))
  // Prefer a member still INSIDE its period: a member whose end already passed
  // is mid-rollover (the provider republishes the new period on its own
  // schedule, and the browser holds the payload until its next poll), so it
  // anchors only when every member is in that state.
  const current = dated.filter((a) => {
    const ms = Date.parse(String(a.subscription?.data?.currentPeriodEnd))
    return Number.isFinite(ms) && ms > now
  })
  const anchor = earliestEnd(current.length > 0 ? current : dated)
  const anchorStart = anchor?.subscription?.data?.currentPeriodStart
  const anchorEnd = anchor?.subscription?.data?.currentPeriodEnd
  const subscription: CommandCodeSubscription | null = present.some((a) => a.subscription != null)
    ? {
        success: true,
        data: {
          planId: plans.length > 0 ? plans.join(' + ') : undefined,
          status: statuses.length > 0 ? statuses.join(' / ') : undefined,
          currentPeriodStart: nonEmpty(anchorStart) ? anchorStart : undefined,
          currentPeriodEnd: nonEmpty(anchorEnd) ? anchorEnd : undefined,
          cancelAtPeriodEnd: present.every((a) => a.subscription?.data?.cancelAtPeriodEnd === true) || undefined,
        },
      }
    : null

  return { whoami: null, usage, credits, subscription, keys }
}

/**
 * Resolve the current pool view and the payload it renders.
 *
 * `stats.ccView` is the instance's persisted selection (written by the card's own
 * tap-to-cycle). An unknown / stale value falls back to AllUser — the pool's
 * total is always a safe thing to show, and a renamed account must never leave a
 * card showing another account's numbers under a label it no longer matches.
 */
export function ccView(stats: WidgetStats): CcViewState {
  const payload = cc(stats)
  const keys = payload?.keys !== undefined && Array.isArray(payload.keys) ? payload.keys : []
  const names = keys.map((entry, i) => (entry.label !== '' ? entry.label : `Key ${i + 1}`))
  if (keys.length < 2) return { data: payload, mode: CC_ALL, modes: [], names, multi: false }
  const modes = [CC_ALL]
  for (let i = 0; i < names.length; i++) {
    // A repeated label (two pools on one account) would make the cycle land on
    // the wrong member: disambiguate with the key's masked tail.
    modes.push(modes.indexOf(names[i]) === -1 ? names[i] : `${names[i]} (${keys[i].tail ?? i + 1})`)
  }
  const view = typeof stats.ccView === 'string' ? stats.ccView : ''
  const idx = modes.indexOf(view)
  if (idx <= 0) return { data: aggregate(keys), mode: CC_ALL, modes, names, multi: true }
  return { data: keys[idx - 1].data ?? null, mode: modes[idx], modes, names, multi: true }
}

/** Tap-to-cycle descriptor for a multi-pool card. The selection persists in the
 *  instance's `ccView` config — deliberately NOT the OpenCode pool's `poolView`,
 *  so the two families never share a view, and naming a `store` also keeps the
 *  tap from firing the multikey `prefer` call (that pool is not this one). */
export function cycleFor(view: CcViewState): WidgetRenderOut['cycle'] {
  if (!view.multi) return undefined
  const chain = [...view.modes, view.modes[0]].join(' → ')
  return { modes: view.modes, current: view.mode, hint: t('cc.cycleHint', { chain }), store: 'ccView' }
}

/**
 * Does this payload need a second look — a slice that did not answer, or a
 * period that has already rolled?
 *
 * The host route tolerates a failed upstream call by writing `null` for that
 * slice (deliberate: one dead endpoint must not blank the whole family), and the
 * browser only re-asks on mount and when a turn settles. A transient 5xx
 * therefore stayed on screen for the rest of a session: the pool's month lost a
 * member (or took the conservation fallback) and the 额度管理 card showed a
 * run-rate built from it — measured live 2026-09-20 as 20.2% / `账期 10-20` /
 * `今日推荐 59.9M` against a true 16.6% / `账期 10-10` / 645M. The collector asks
 * ONCE more shortly after seeing this, which is what makes such a state a blip
 * instead of the session's answer.
 *
 * @param c - the payload the route answered with (or null).
 * @returns true when re-asking shortly is worth one more round trip.
 */
export function ccPayloadDegraded(c: CommandCodeData | null | undefined): boolean {
  if (c === null || c === undefined) return false
  const keys = Array.isArray(c.keys) ? c.keys : null
  const accounts: Array<CommandCodeAccount | null> = keys !== null && keys.length > 0 ? keys.map((k) => k.data) : [c]
  const now = Date.now()
  for (const a of accounts) {
    if (a === null || a === undefined) return true
    if (a.whoami == null || a.usage == null || a.credits == null || a.subscription == null) return true
    // A period end in the past means the provider has rolled the month and this
    // payload is the old one: the quota card would print a stale `账期` and lose
    // its budget entirely until the next settle.
    const ms = typeof a.subscription.data?.currentPeriodEnd === 'string' ? Date.parse(a.subscription.data.currentPeriodEnd) : Number.NaN
    if (Number.isFinite(ms) && ms <= now) return true
  }
  return false
}

/** The card's grey subtitle: the role word, plus the pool view once the card has
 *  more than one pool to switch between (`账户 · AllUser`, `账户 · Physicolor`).
 *  With a single pool the role word stands alone, exactly as before. */
function ccLegend(role: string, view: CcViewState): string {
  return view.multi ? `${role} · ${view.mode}` : role
}

/** The shared card title for the whole family (product name; the role word
 *  goes on the legend line so the title never grows). */
function title(): string {
  return t('cc.title')
}

/** Compact credit amount: 69.99986 -> "70.00", 0.00014 -> "0.0001". Chooses
 *  decimals by magnitude so tiny spend stays visible and big balances don't
 *  drown in digits. */
function fmtCredit(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 1) return n.toFixed(2)
  if (abs >= 0.01) return n.toFixed(4)
  return String(n)
}

/** `$10.1` / `$0.468` — the SPEND figure at THREE significant digits, never the
 *  four decimals a credit balance uses (`$0.4676` is noise on a 2×2 tile, and the
 *  figure shares its row with two other facts). Above $100 the cents stop
 *  mattering, so it drops to whole dollars; below a tenth of a cent it says
 *  `<$0.001` rather than rounding a real spend to `$0`. */
function fmtCost(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  if (n === 0) return '$0'
  const abs = Math.abs(n)
  if (abs < 0.001) return '<$0.001'
  if (abs >= 100) return `$${Math.round(n)}`
  // toPrecision(3) then back through Number drops toPrecision's padding zeros
  // (1.00 -> "$1", 0.400 -> "$0.4").
  return `$${Number(n.toPrecision(3))}`
}

/** Window percent 0..100 (clamped), or null when the window is unusable. */
function winPct(win: { used?: number; cap?: number } | null | undefined): number | null {
  const used = win?.used
  const cap = win?.cap
  if (typeof used !== 'number' || typeof cap !== 'number' || !Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return null
  return Math.min(100, Math.max(0, (used / cap) * 100))
}

/** Window-capacity tone: near/over the cap -> danger, heavy -> warn. */
function windowTone(pct: number | null, exceeded?: boolean): BarDatum['tone'] {
  if (pct === null) return 'muted'
  if (exceeded === true || pct >= 95) return 'danger'
  if (pct >= 75) return 'warn'
  return 'success'
}

/** Short reset date (`MM-DD`) from an epoch-ms timestamp. */
function fmtReset(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Short date (`MM-DD`) from an ISO string — the LOCAL calendar day it names. */
function fmtIsoDay(iso: string | undefined): string {
  if (typeof iso !== 'string' || iso.length < 10) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return ''
  // A date-only string already names a calendar day; a timestamp names an
  // INSTANT, and everything that reads it (the countdown, the quota card's
  // elapsed share) measures it on the local clock — so it must print the local
  // day. Reading the fields straight out of the string printed the UTC day,
  // which is a day off for any reset landing in the local evening.
  if (iso.length <= 10) return `${m[2]}-${m[3]}`
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return `${m[2]}-${m[3]}`
  const d = new Date(ms)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** One resolved window: used / cap / reset time / percent. */
export interface WindowInfo {
  key: 'fiveHour' | 'weekly' | 'monthly'
  label: string
  used: number
  cap: number
  pct: number
  resetAt?: number
  resetIso?: string
  exceeded?: boolean
}

/** The 5h window (explicit used/cap from billing/credits). */
function fiveHourWindow(c: CommandCodeData | null): WindowInfo | null {
  const w = c?.credits?.windowLimits?.fiveHour
  const pct = winPct(w)
  if (pct === null || typeof w?.used !== 'number' || typeof w.cap !== 'number') return null
  return { key: 'fiveHour', label: t('cc.win5h'), used: w.used, cap: w.cap, pct, resetAt: w.resetAt, exceeded: w.exceeded }
}

/** The weekly window (explicit used/cap from billing/credits). */
function weeklyWindow(c: CommandCodeData | null): WindowInfo | null {
  const w = c?.credits?.windowLimits?.weekly
  const pct = winPct(w)
  if (pct === null || typeof w?.used !== 'number' || typeof w.cap !== 'number') return null
  return { key: 'weekly', label: t('cc.winWeekly'), used: w.used, cap: w.cap, pct, resetAt: w.resetAt, exceeded: w.exceeded }
}

/**
 * Monthly allowance (USD of credits) per plan, from Command Code's published
 * plan table. Only plans whose figures are published appear here; an unknown
 * plan falls back to the API's own used figure instead of inventing a cap.
 *
 * GOAT: $10 buys $70 of credits, and the API's own window caps confirm the
 * split this constant encodes — 5h = $14 (20% of the month) and weekly = $35
 * (50%), both reported by `/alpha/billing/credits`.
 */
const PLAN_MONTHLY_ALLOWANCE: Record<string, number> = {
  'individual-goat': 70,
}

/**
 * The monthly window of ONE account.
 *
 * The API exposes neither a monthly window object nor an allowance field, so
 * the figure comes from the one monthly quantity it DOES report: the remaining
 * monthly credits. `used = allowance - remaining`, reset at the subscription's
 * period end.
 *
 * The previous `used / (used + remaining)` form is deliberately gone. That
 * denominator is the sum of two unrelated snapshots rather than the plan
 * allowance (measured 17.26 + 59.01 = 76.27 against a $70 plan), so the card
 * read 22.6% while the account page read ~16%. `usage.totalMonthlyCredits` is
 * the billing period's total spend, not the monthly allowance consumed.
 *
 * Returns null when the balance or the plan is unknown, so the card degrades
 * instead of inventing a number — where "the plan is unknown" includes the
 * subscription slice never answering (see the guard below).
 */
function monthlyWindowOf(c: CommandCodeData | null): WindowInfo | null {
  const remaining = c?.credits?.credits?.monthlyCredits
  if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return null
  // The subscription slice must be THERE, even when its plan id is one the table
  // does not carry. A missing `/billing/subscriptions` answer is a failed fetch,
  // not an exotic plan, and the two are NOT interchangeable: the conservation
  // fallback below is a different caliber from the plan table
  // (`used/(used+remaining)` against `(allowance−remaining)/allowance`), so one
  // dropped slice silently rescaled the pool — measured live 2026-09-20, the
  // 额度管理 card read 20.2% (and `账期 10-20`) where the plan table says 16.6%
  // on `账期 10-10`, with a day budget derived from the wrong month.
  const sub = c?.subscription
  if (sub === null || sub === undefined || sub.data === null || sub.data === undefined) return null
  const resetIso = sub.data.currentPeriodEnd
  const plan = sub.data.planId
  const allowance = typeof plan === 'string' ? PLAN_MONTHLY_ALLOWANCE[plan] : undefined
  if (allowance !== undefined && allowance > 0) {
    // Clamped at the allowance: a topped-up balance would otherwise drive
    // "used" negative, which is a display bug rather than a reading.
    const used = Math.min(allowance, Math.max(0, allowance - remaining))
    return { key: 'monthly', label: t('cc.winMonthly'), used, cap: allowance, pct: (used / allowance) * 100, resetIso }
  }
  const used = c?.usage?.totalMonthlyCredits
  if (typeof used !== 'number' || !Number.isFinite(used)) return null
  const cap = used + remaining
  if (!(cap > 0)) return null
  const pct = Math.min(100, Math.max(0, (used / cap) * 100))
  return { key: 'monthly', label: t('cc.winMonthly'), used, cap, pct, resetIso }
}

/**
 * The monthly window of whatever payload this is — one account, or the AllUser
 * aggregate.
 *
 * The pool's month is the SUM of its members' own months (used and allowance
 * both add), and each member is measured against ITS OWN plan: the plan table is
 * keyed by plan id, so a two-GOAT pool is 2 × $70, and reading the summed
 * balance against a single plan's allowance reported 0% for a pool that was 14%
 * used. A member whose plan id the table does not carry keeps its own
 * balance-conservation fallback; a member whose slices did NOT answer is a
 * different story — the whole pool's month is then unknown (null), because a
 * partial sum reads LOWER than the truth. The reset is the earliest member
 * period end (the next renewal).
 *
 * Exported so widgets that reason ABOUT the month (not just print it) — e.g.
 * the 额度管理 quota card, which extrapolates the month-end percent — read the
 * same official-matching figure instead of re-deriving their own.
 */
export function monthlyWindow(c: CommandCodeData | null): WindowInfo | null {
  const keys = c?.keys
  if (keys === undefined || keys.length === 0) return monthlyWindowOf(c)
  const members: WindowInfo[] = []
  for (const k of keys) {
    const w = monthlyWindowOf(k.data)
    // The pool's month is a SUM of the members' months, so ONE member we cannot
    // place makes the sum unknown — reporting the rest silently UNDERSTATES what
    // the pool has burned, and a quota card that reads low is the one failure a
    // user has no way to notice (`-` for a poll or two, until the client re-asks
    // the incomplete payload, is the honest answer instead).
    if (w === null) return null
    members.push(w)
  }
  const used = members.reduce((s, w) => s + w.used, 0)
  const cap = members.reduce((s, w) => s + w.cap, 0)
  if (!(cap > 0)) return null
  // The reset is a reset still AHEAD whenever one exists: a member whose period
  // already ended sits in a rollover window (the provider republishes the new
  // period on its own schedule), and printing its past date as the pool's next
  // renewal is how the card ended up counting down to a moment that had already
  // happened. The members' own months are still summed — only the calendar
  // prefers a live one, exactly like the pool aggregate's anchor.
  const now = Date.now()
  const isos = members.map((w) => w.resetIso).filter(nonEmpty).sort()
  const ahead = isos.filter((iso) => { const ms = Date.parse(iso); return Number.isFinite(ms) && ms > now })
  return { key: 'monthly', label: t('cc.winMonthly'), used, cap, pct: (used / cap) * 100, resetIso: (ahead.length > 0 ? ahead : isos)[0] }
}

/** cc-whoami - account identity from `/alpha/whoami`. */
export function ccWhoamiRender(stats: WidgetStats): WidgetRenderOut | null {
  const view = ccView(stats)
  const cycle = cycleFor(view)
  const c = view.data
  const user = c?.whoami?.user
  if (!user) {
    // The AllUser view has no single identity: the generic label IS the answer,
    // with the pooled accounts on the bottom line. (A single-pool card keeps the
    // hint — there `modes` is empty and nothing was aggregated.)
    if (view.multi && view.mode === CC_ALL) {
      return { title: title(), value: CC_ALL, legend: ccLegend(t('cc.account'), view), sub: view.names.join(' / ') || undefined, cycle }
    }
    return { title: title(), value: '-', legend: view.mode, cardHint: hint(stats), cycle }
  }
  const name = user.name || user.userName || '-'
  const email = user.email ? String(user.email) : ''
  const org = c?.whoami?.org && typeof c.whoami.org === 'object' && 'name' in c.whoami.org ? String((c.whoami.org as { name?: unknown }).name ?? '') : ''
  const sub = [email, org].filter(Boolean).join(' / ')
  return { title: title(), value: name, legend: ccLegend(t('cc.account'), view), sub: sub || undefined, cycle }
}

/** cc-usage - request counts / success / tokens / spend from `/alpha/usage/summary`.
 *
 *  Layout (user's fix, 2026-09-20): the token total is the big figure under the
 *  title with its unit to the right, the role word is gone (the figure already
 *  says "usage"), and the three facts live in a FIGURES row on the card's floor —
 *  the old single grey line (`4821 请求 / 100% 成功率 / 消费 $26.5`) was ~150px
 *  wide in a ~126px slot, so the spend was always ellipsized away. */
export function ccUsageRender(stats: WidgetStats): WidgetRenderOut | null {
  const view = ccView(stats)
  const cycle = cycleFor(view)
  const u = view.data?.usage
  if (!u) return { title: title(), value: '-', legend: view.mode, cardHint: hint(stats), cycle }
  const tokens = typeof u.totalTokens === 'number' ? u.totalTokens : undefined
  const req = typeof u.totalCount === 'number' ? u.totalCount : undefined
  const success = typeof u.successRate === 'number' ? u.successRate : undefined
  const cost = fmtCost(u.totalCost)
  const headAfter = tokens !== undefined ? { big: fmtTokens(tokens), small: t('cc.tokens') } : undefined
  const figures: NonNullable<WidgetChart['figures']> = []
  if (req !== undefined) figures.push({ label: t('cc.requests'), value: String(req) })
  if (success !== undefined) figures.push({ label: t('cc.successRate'), value: `${success.toFixed(0)}%` })
  if (cost !== '-') figures.push({ label: t('cc.spend'), value: cost })
  return {
    title: title(),
    // No role word: the figure already carries its unit (`4.9M tokens`), so the
    // grey line is reserved for the pool view once there is a pool to switch.
    legend: view.multi ? view.mode : undefined,
    headAfter,
    // The head is title + figure; the facts keep the card's floor.
    bodyAnchor: 'bottom',
    chart: figures.length > 0 ? { kind: 'figures', figures } : undefined,
    cycle,
  }
}

/** cc-credits - the credit balance + the three quota windows from
 *  `/alpha/billing/credits`.
 *
 *  Layout (user's design, 2026-09-20 — the official site's limit rows): the
 *  balance is the big figure under the title with `credits` to its right, and the
 *  body is THREE rows, each a window name with its percent hard right over a
 *  segmented bar (`5 小时 1%` / bar, then the week, then the month). The role word
 *  and the reset lines are gone: the bars ARE the card, and the old
 *  `kind: 'bars'` twin columns (plus their dashed grid and 25px of labels) made
 *  the tile 200×250 in the market stage instead of a square. */
export function ccCreditsRender(stats: WidgetStats): WidgetRenderOut | null {
  const view = ccView(stats)
  const cycle = cycleFor(view)
  const c = view.data
  const credits = c?.credits?.credits
  const windows = c?.credits?.windowLimits
  if (!credits && !windows) return { title: title(), value: '-', legend: view.mode, cardHint: hint(stats), cycle }
  const monthly = credits?.monthlyCredits
  const headAfter = monthly !== undefined ? { big: fmtCredit(monthly), small: t('cc.credits') } : undefined
  const extras = [
    credits?.freeCredits !== undefined && credits.freeCredits > 0 ? `${t('cc.free')} ${fmtCredit(credits.freeCredits)}` : '',
    credits?.purchasedCredits !== undefined && credits.purchasedCredits > 0 ? `${t('cc.purchased')} ${fmtCredit(credits.purchasedCredits)}` : '',
  ].filter(Boolean)
  // No 额度 role word: `69.16 credits` says what the card is, and the user asked
  // for exactly two things on top — `credits` and the number. The line is used
  // only for the pool view, plus the free/purchased extras when they exist.
  const legend = extras.length > 0 ? ccLegend(extras.join(' / '), view) : view.multi ? view.mode : undefined
  const fh = fiveHourWindow(c)
  const wk = weeklyWindow(c)
  const mo = monthlyWindow(c)
  const quotas: NonNullable<WidgetRenderOut['chart']>['quotas'] = []
  if (fh) quotas.push({ label: t('cc.limit5h'), pct: fh.pct, tone: windowTone(fh.pct, fh.exceeded) })
  if (wk) quotas.push({ label: t('cc.limitWeek'), pct: wk.pct, tone: windowTone(wk.pct, wk.exceeded) })
  if (mo) quotas.push({ label: t('cc.limitMonth'), pct: mo.pct, tone: windowTone(mo.pct, mo.exceeded) })
  // The reset dates are still worth knowing, but they do not fit a 2×2 tile
  // beside three bars; they ride the hover tooltip on the row's own label.
  if (quotas.length === 0) return { title: title(), legend, headAfter, cycle }
  return {
    title: title(),
    legend,
    headAfter,
    // The head is title + balance; the three rows keep the card's floor.
    bodyAnchor: 'bottom',
    chart: { kind: 'quotas', quotas },
    cycle,
  }
}

/** cc-windows - 5h / weekly / monthly quota as three donuts (OpenCode-style
 *  rolling / weekly / monthly rings). */
export function ccWindowsRender(stats: WidgetStats): WidgetRenderOut | null {
  const view = ccView(stats)
  const cycle = cycleFor(view)
  const c = view.data
  if (!c?.credits && !c?.usage) return { title: title(), value: '-', legend: view.mode, cardHint: hint(stats), cycle }
  const wins = [fiveHourWindow(c), weeklyWindow(c), monthlyWindow(c)].filter((w): w is WindowInfo => w !== null)
  if (wins.length === 0) return { title: title(), value: '-', legend: view.mode, cardHint: hint(stats), cycle }
  const rings = wins.map((w) => ({
    // No grey caption beside the figure: the three rings ARE the window trio
    // (5h / weekly / monthly, in that order), so the number stands alone and
    // the window name rides the hover tooltip only - the same convention the
    // OpenCode usage rings use. One decimal keeps small usage readable
    // (0.7%, not a rounded 1%).
    label: '',
    name: w.label,
    value: Number(w.pct.toFixed(1)),
    decimals: 1,
    ratio: w.pct / 100,
    tone: w.exceeded === true || w.pct >= 95 ? ('danger' as const) : w.pct >= 75 ? ('warn' as const) : ('success' as const),
  }))
  return { title: title(), legend: ccLegend(t('cc.roleWindow'), view), chart: { kind: 'rings', rings }, cycle }
}

/**
 * The official Command Code subscription tiers, as the badge the 套餐 card
 * prints: planId prefix -> label. Mirrors the provider's own table (synced from
 * the CLI's plan map: `individual-go`, `individual-goat`, `individual-pro`,
 * `individual-pro-v1`, `individual-provider`, `individual-max`,
 * `individual-ultra`, `teams-pro`) — matched longest-prefix-first after
 * normalizing, exactly like the provider resolves it, so `individual-pro-v1`
 * wins over `individual-pro`.
 */
const PLAN_TIERS: Array<[string, string]> = [
  ['individual-pro-v1', 'PRO'],
  ['individual-provider', 'PROVIDER'],
  ['individual-goat', 'GOAT'],
  ['individual-ultra', 'ULTRA'],
  ['individual-max', 'MAX'],
  ['individual-pro', 'PRO'],
  ['individual-go', 'GO'],
  ['teams-pro', 'TEAMS PRO'],
]

/**
 * The tier badge for a subscription `planId`: `individual-goat` -> `GOAT`.
 *
 * An id outside the table is neither invented into a tier nor printed raw (the
 * raw id is what ran off the tile's edge as `individual-goa…`): the vendor
 * prefix is stripped and the rest is uppercased (`acme-team-plan` ->
 * `ACME TEAM PLAN`), so the badge stays one short word while the plan stays
 * identifiable.
 */
export function planTier(planId: string | undefined): string | null {
  if (typeof planId !== 'string' || planId === '') return null
  const normalized = planId.toLowerCase().replace(/_/g, '-')
  const hit = PLAN_TIERS.find(([prefix]) => normalized.startsWith(prefix))
  if (hit !== undefined) return hit[1]
  const bare = normalized.replace(/^(individual|teams)-/, '').replace(/-/g, ' ')
  return bare.toUpperCase()
}

/** The preview's tier ladder — the 套餐 card's `example.simSteps`: every badge
 *  the card can print, as the `sim` objects a preview click walks through. */
export const PLAN_TIER_STEPS: Array<Record<string, unknown>> = [
  'individual-goat',
  'individual-pro',
  'individual-max',
  'individual-ultra',
  'individual-provider',
  'individual-go',
  'teams-pro',
].map((plan) => ({ plan }))

/** cc-subscription - the plan TIER + billing period end from
 *  `/alpha/billing/subscriptions`.
 *
 *  Layout (user's design, 2026-09-20): the blue title, the grey `账期 10-10`
 *  line under it, and the tier as the big figure on the card's floor; the raw
 *  `individual-goat` id used to be that figure and ran off the tile. The tier is
 *  the one thing the preview can walk (`sim.plan`), so the market / 组件配置 click
 *  shows every badge without owning the subscription. */
export function ccSubscriptionRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const view = ccView(stats)
  const cycle = cycleFor(view)
  const simPlan = typeof meta?.sim?.plan === 'string' ? meta.sim.plan : null
  const sub = view.data?.subscription?.data
  const plan = simPlan ?? sub?.planId
  if (!sub && !plan) return { title: title(), value: '-', legend: view.mode, cardHint: hint(stats), cycle }
  const status = sub?.status ?? ''
  const endLabel = fmtIsoDay(sub?.currentPeriodEnd)
  // The grey line is the PERIOD (the role word is gone — the big badge already
  // says what the card is), with the pool view appended once there is a pool to
  // switch between.
  const period = endLabel !== '' ? t('cc.period', { m: String(Number(endLabel.slice(0, 2))), d: String(Number(endLabel.slice(3, 5))) }) : ''
  const notes = [
    status !== '' && status !== 'active' ? status : '',
    sub?.cancelAtPeriodEnd === true ? t('cc.cancelAtEnd') : '',
  ].filter(Boolean)
  return {
    title: title(),
    legend: period !== '' ? ccLegend(period, view) : undefined,
    value: planTier(plan ?? undefined) ?? '-',
    sub: notes.length > 0 ? notes.join(' / ') : undefined,
    cycle,
  }
}

/** Single-window percent card (cc-window-5h / cc-window-weekly /
 *  cc-window-monthly) - the OpenCode single-window shape: one big percent, the
 *  role word under the title, and the reset date beneath. */
export function ccWindowValueRender(key: 'fiveHour' | 'weekly' | 'monthly'): (stats: WidgetStats) => WidgetRenderOut | null {
  return (stats) => {
    const view = ccView(stats)
    const cycle = cycleFor(view)
    const c = view.data
    const roleKey = key === 'fiveHour' ? 'cc.win5h' : key === 'weekly' ? 'cc.winWeekly' : 'cc.winMonthly'
    if (!c) return { title: title(), value: '-', legend: ccLegend(t(roleKey), view), cardHint: hint(stats), cycle }
    const w = key === 'fiveHour' ? fiveHourWindow(c) : key === 'weekly' ? weeklyWindow(c) : monthlyWindow(c)
    if (!w) return { title: title(), value: '-', legend: ccLegend(t(roleKey), view), cycle }
    const reset = w.resetIso ? `${t('cc.periodEnd')} ${fmtIsoDay(w.resetIso)}` : fmtReset(w.resetAt) ? `${t('cc.resets')} ${fmtReset(w.resetAt)}` : ''
    return {
      title: title(),
      legend: ccLegend(t(roleKey), view),
      value: `${w.pct.toFixed(1)}%`,
      sub: reset || undefined,
      cycle,
    }
  }
}