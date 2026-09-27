import { t } from '../../i18n'
import { fmtTokens } from '../../lib/format'
import type { BarDatum, WidgetChart, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../lib/contract/types'
import { cc, hint, CC_ALL, CcViewState, ccView, cycleFor, WindowInfo, fiveHourWindow, weeklyWindow, monthlyWindow } from './data'

function ccLegend(role: string, view: CcViewState): string {
  return view.multi ? `${role} · ${view.mode}` : role
}

/** The shared card title for the whole family (product name; the role word
 *  goes on the legend line so the title never grows). */
export function title(): string {
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
export function winPct(win: { used?: number; cap?: number } | null | undefined): number | null {
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
