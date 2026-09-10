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
 *     derived by conservation from `usage/summary` + `billing/credits`:
 *     used = totalMonthlyCredits (this billing period),
 *     cap  = totalMonthlyCredits + credits.monthlyCredits (used + remaining,
 *     which equals the plan allowance, e.g. 0.47 + 69.16 = 69.63 of a $70 plan).
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
import type { BarDatum, CommandCodeData, WidgetRenderOut, WidgetStats } from './contract'

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

/** `$0.0001` cost formatting (decimals by magnitude, never a bare zero). */
function fmtCost(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  return `$${fmtCredit(n)}`
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

/** Short date (`MM-DD`) from an ISO string. */
function fmtIsoDay(iso: string | undefined): string {
  if (typeof iso !== 'string' || iso.length < 10) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[2]}-${m[3]}` : ''
}

/** One resolved window: used / cap / reset time / percent. */
interface WindowInfo {
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

/** The monthly window. The API exposes no monthly window object, so it is
 *  derived by conservation: used = this period's monthly credits consumed,
 *  cap = used + remaining monthly credits (used + remaining === the plan
 *  allowance). The reset time is the subscription's period end, when the
 *  allowance is refilled. Returns null when either half is unavailable, so the
 *  monthly card degrades instead of inventing a number. */
function monthlyWindow(c: CommandCodeData | null): WindowInfo | null {
  const used = c?.usage?.totalMonthlyCredits
  const remaining = c?.credits?.credits?.monthlyCredits
  if (typeof used !== 'number' || typeof remaining !== 'number' || !Number.isFinite(used) || !Number.isFinite(remaining)) return null
  const cap = used + remaining
  if (!(cap > 0)) return null
  const pct = Math.min(100, Math.max(0, (used / cap) * 100))
  const resetIso = c?.subscription?.data?.currentPeriodEnd
  return { key: 'monthly', label: t('cc.winMonthly'), used, cap, pct, resetIso }
}

/** cc-whoami - account identity from `/alpha/whoami`. */
export function ccWhoamiRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const user = c?.whoami?.user
  if (!user) return { title: title(), value: '-', legend: hint(stats) }
  const name = user.name || user.userName || '-'
  const email = user.email ? String(user.email) : ''
  const org = c?.whoami?.org && typeof c.whoami.org === 'object' && 'name' in c.whoami.org ? String((c.whoami.org as { name?: unknown }).name ?? '') : ''
  const sub = [email, org].filter(Boolean).join(' / ')
  return { title: title(), value: name, legend: t('cc.account'), sub: sub || undefined }
}

/** cc-usage - request counts / success / tokens / spend from `/alpha/usage/summary`. */
export function ccUsageRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const u = c?.usage
  if (!u) return { title: title(), value: '-', legend: hint(stats) }
  const tokens = typeof u.totalTokens === 'number' ? u.totalTokens : undefined
  const req = typeof u.totalCount === 'number' ? u.totalCount : undefined
  const success = typeof u.successRate === 'number' ? u.successRate : undefined
  const cost = fmtCost(u.totalCost)
  const headAfter = tokens !== undefined ? { big: fmtTokens(tokens), small: t('cc.tokens') } : undefined
  const parts = [
    req !== undefined ? `${req} ${t('cc.requests')}` : '',
    success !== undefined ? `${success.toFixed(0)}% ${t('cc.successRate')}` : '',
    cost !== '-' ? `${t('cc.spend')} ${cost}` : '',
  ].filter(Boolean)
  return {
    title: title(),
    legend: t('cc.roleUsage'),
    headAfter,
    sub: parts.length > 0 ? parts.join(' / ') : undefined,
  }
}

/** cc-credits - credit balance + 5h / weekly quota bars from `/alpha/billing/credits`. */
export function ccCreditsRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const credits = c?.credits?.credits
  const windows = c?.credits?.windowLimits
  if (!credits && !windows) return { title: title(), value: '-', legend: hint(stats) }
  const monthly = credits?.monthlyCredits
  const headAfter = monthly !== undefined ? { big: fmtCredit(monthly), small: t('cc.credits') } : undefined
  const extras = [
    credits?.freeCredits !== undefined && credits.freeCredits > 0 ? `${t('cc.free')} ${fmtCredit(credits.freeCredits)}` : '',
    credits?.purchasedCredits !== undefined && credits.purchasedCredits > 0 ? `${t('cc.purchased')} ${fmtCredit(credits.purchasedCredits)}` : '',
  ].filter(Boolean)
  const legend = [t('cc.roleCredits'), ...extras].join(' / ')
  const fh = fiveHourWindow(c)
  const wk = weeklyWindow(c)
  if (!fh && !wk) return { title: title(), legend, headAfter }
  const bars: BarDatum[] = []
  if (fh) bars.push({ label: t('cc.win5h'), value: Math.round(fh.pct), ratio: fh.pct / 100, tone: windowTone(fh.pct, fh.exceeded) })
  if (wk) bars.push({ label: t('cc.winWeekly'), value: Math.round(wk.pct), ratio: wk.pct / 100, tone: windowTone(wk.pct, wk.exceeded) })
  const resets = [
    fh ? `${t('cc.win5h')} ${fmtReset(fh.resetAt)}` : '',
    wk ? `${t('cc.winWeekly')} ${fmtReset(wk.resetAt)}` : '',
  ].filter(Boolean)
  return {
    title: title(),
    legend,
    headAfter,
    chart: { kind: 'bars', bars },
    sub: resets.length > 0 ? resets.join(' / ') : undefined,
  }
}

/** cc-windows - 5h / weekly / monthly quota as three donuts (OpenCode-style
 *  rolling / weekly / monthly rings). */
export function ccWindowsRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  if (!c?.credits && !c?.usage) return { title: title(), value: '-', legend: hint(stats) }
  const wins = [fiveHourWindow(c), weeklyWindow(c), monthlyWindow(c)].filter((w): w is WindowInfo => w !== null)
  if (wins.length === 0) return { title: title(), value: '-', legend: hint(stats) }
  const rings = wins.map((w) => ({
    label: w.label,
    value: Math.round(w.pct),
    ratio: w.pct / 100,
    tone: w.exceeded === true || w.pct >= 95 ? ('danger' as const) : w.pct >= 75 ? ('warn' as const) : ('success' as const),
  }))
  return { title: title(), legend: t('cc.roleWindow'), chart: { kind: 'rings', rings } }
}

/** cc-subscription - plan + billing period end from `/alpha/billing/subscriptions`. */
export function ccSubscriptionRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const sub = c?.subscription?.data
  const plan = sub?.planId
  if (!sub && !plan) return { title: title(), value: '-', legend: hint(stats) }
  const status = sub?.status ?? ''
  const endLabel = fmtIsoDay(sub?.currentPeriodEnd)
  const headAfter = plan ? { big: String(plan), small: status || undefined } : undefined
  const parts = [
    endLabel ? `${t('cc.periodEnd')} ${endLabel}` : '',
    sub?.cancelAtPeriodEnd === true ? t('cc.cancelAtEnd') : '',
  ].filter(Boolean)
  return { title: title(), legend: t('cc.rolePlan'), headAfter, sub: parts.length > 0 ? parts.join(' / ') : undefined }
}

/** Single-window percent card (cc-window-5h / cc-window-weekly /
 *  cc-window-monthly) - the OpenCode single-window shape: one big percent, the
 *  role word under the title, and the reset date beneath. */
export function ccWindowValueRender(key: 'fiveHour' | 'weekly' | 'monthly'): (stats: WidgetStats) => WidgetRenderOut | null {
  return (stats) => {
    const c = cc(stats)
    if (!c) return { title: title(), value: '-', legend: hint(stats) }
    const w = key === 'fiveHour' ? fiveHourWindow(c) : key === 'weekly' ? weeklyWindow(c) : monthlyWindow(c)
    const roleKey = key === 'fiveHour' ? 'cc.win5h' : key === 'weekly' ? 'cc.winWeekly' : 'cc.winMonthly'
    if (!w) return { title: title(), value: '-', legend: t(roleKey) }
    const reset = w.resetIso ? `${t('cc.periodEnd')} ${fmtIsoDay(w.resetIso)}` : fmtReset(w.resetAt) ? `${t('cc.resets')} ${fmtReset(w.resetAt)}` : ''
    return {
      title: title(),
      legend: t(roleKey),
      value: `${w.pct.toFixed(1)}%`,
      sub: reset || undefined,
    }
  }
}