/**
 * dsh-widgets —Command Code account usage shared render layer.
 *
 * The five commandcode widgets (cc-whoami / cc-usage / cc-credits /
 * cc-windows / cc-subscription) read the host-aggregated
 * `/api/commandcode-usage` payload (`stats.commandCode`) and render their card
 * shapes here —NOT copied into each unit —so the family stays consistent.
 *
 * The payload is fully nullable: the host fetches each of the four official
 * endpoints independently, so one failing endpoint degrades that slice to a
 * ``—` placeholder instead of blanking the whole rail.
 *
 * All strings come from each unit's manifest dictionary (family-shared keys
 * live in `src/widgets/_shared/locales.json`).
 */

import { t } from '../i18n'
import { fmtTokens } from './format'
import type { BarDatum, CommandCodeData, WidgetRenderOut, WidgetStats } from './contract'

/** Read the commandcode payload defensively: absent / malformed →null. */
function cc(stats: WidgetStats): CommandCodeData | null {
  const c = stats.commandCode
  return c !== null && typeof c === 'object' ? c : null
}

/** Resolve a per-family hint when the payload is missing. The KEY is never
 *  user-entered: the host auto-reads it (env →$DSH_HOME/.credentials.yaml → *  .env), so the hint below explains the actual failure instead of asking the
 *  user to configure anything. */
function hint(stats: WidgetStats): string {
  const err = stats.commandCodeError
  if (err === 'unloaded') return t('cc.unloaded')
  if (err === 'unconfigured') return t('cc.unconfigured')
  if (err) return t('cc.unavailable')
  return t('cc.unconfigured')
}

/** Compact credit amount: 69.99986 →"70.00", 0.00014 →"0.0001". Chooses
 *  decimals by magnitude so tiny spend stays visible and big balances don't
 *  drown in digits. */
function fmtCredit(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 1) return n.toFixed(2)
  if (abs >= 0.01) return n.toFixed(4)
  return String(n)
}

/** `$0.0001` cost formatting (4 significant decimals, no trailing zeros
 *  beyond what the magnitude needs). */
function fmtCost(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return `$${fmtCredit(n)}`
}

/** Window percent 0..100 with a vary-by-magnitude decimal count. */
function winPct(win: { used?: number; cap?: number } | null | undefined): number | null {
  const used = win?.used
  const cap = win?.cap
  if (typeof used !== 'number' || typeof cap !== 'number' || !Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return null
  return Math.min(100, Math.max(0, (used / cap) * 100))
}

/** Window-capacity bar tone: near-exceeded / over →danger, heavy →warn. */
function windowTone(pct: number | null, exceeded?: boolean): BarDatum['tone'] {
  if (pct === null) return 'muted'
  if (exceeded === true || pct >= 95) return 'danger'
  if (pct >= 75) return 'warn'
  return 'success'
}

/** Short reset date (`MM-DD`) from an epoch-ms resetAt. */
function fmtReset(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** cc-whoami —account identity from `/alpha/whoami`. */
export function ccWhoamiRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const user = c?.whoami?.user
  if (!user) return { title: t('widget.cc-whoami.name'), value: '—', legend: hint(stats) }
  const name = user.name || user.userName || '—'
  const email = user.email ? String(user.email) : ''
  const org = c?.whoami?.org && typeof c.whoami.org === 'object' && 'name' in c.whoami.org ? String((c.whoami.org as { name?: unknown }).name ?? '') : ''
  const sub = [email, org].filter(Boolean).join(' · ')
  return { title: t('widget.cc-whoami.name'), value: name, legend: t('cc.account'), sub: sub || undefined }
}

/** cc-usage —request counts / success / tokens / spend from `/alpha/usage/summary`. */
export function ccUsageRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const u = c?.usage
  if (!u) return { title: t('widget.cc-usage.name'), value: '—', legend: hint(stats) }
  const tokens = typeof u.totalTokens === 'number' ? u.totalTokens : undefined
  const req = typeof u.totalCount === 'number' ? u.totalCount : undefined
  const success = typeof u.successRate === 'number' ? u.successRate : undefined
  const cost = fmtCost(u.totalCost)
  const headAfter = tokens !== undefined
    ? { big: fmtTokens(tokens), small: t('cc.tokens') }
    : undefined
  const legend = req !== undefined
    ? `${req} ${t('cc.requests')}${success !== undefined ? ` · ${success.toFixed(0)}% ${t('cc.successRate')}` : ''}`
    : undefined
  return {
    title: t('widget.cc-usage.name'),
    headAfter,
    legend,
    sub: cost !== '—' ? `${t('cc.spend')} ${cost}` : undefined,
  }
}

/** cc-credits —credit balance + 5h / weekly quota bars from `/alpha/billing/credits`. */
export function ccCreditsRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const credits = c?.credits?.credits
  const windows = c?.credits?.windowLimits
  if (!credits && !windows) return { title: t('widget.cc-credits.name'), value: '—', legend: hint(stats) }
  const monthly = credits?.monthlyCredits
  const headAfter = monthly !== undefined
    ? { big: fmtCredit(monthly), small: t('cc.credits') }
    : undefined
  const legend = [
    credits?.freeCredits !== undefined && credits.freeCredits > 0 ? `${t('cc.free')} ${fmtCredit(credits.freeCredits)}` : '',
    credits?.purchasedCredits !== undefined && credits.purchasedCredits > 0 ? `${t('cc.purchased')} ${fmtCredit(credits.purchasedCredits)}` : '',
  ].filter(Boolean).join(' · ') || undefined
  const fh = windows?.fiveHour
  const wk = windows?.weekly
  const fhPct = winPct(fh)
  const wkPct = winPct(wk)
  if (fhPct === null && wkPct === null) {
    return { title: t('widget.cc-credits.name'), headAfter, legend, sub: undefined }
  }
  const bars: BarDatum[] = []
  if (fhPct !== null) bars.push({ label: t('cc.fiveHour'), value: Math.round(fhPct), ratio: fhPct / 100, tone: windowTone(fhPct, fh?.exceeded) })
  if (wkPct !== null) bars.push({ label: t('cc.weekly'), value: Math.round(wkPct), ratio: wkPct / 100, tone: windowTone(wkPct, wk?.exceeded) })
  return {
    title: t('widget.cc-credits.name'),
    headAfter,
    legend,
    chart: { kind: 'bars', bars },
    sub: [fh && fhPct !== null ? `${t('cc.fiveHour')} ${fmtReset(fh.resetAt)}` : '', wk && wkPct !== null ? `${t('cc.weekly')} ${fmtReset(wk.resetAt)}` : ''].filter(Boolean).join(' · ') || undefined,
  }
}

/** cc-windows —5h / weekly quota as two donuts (OpenCode-style rings). */
export function ccWindowsRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const windows = c?.credits?.windowLimits
  if (!windows) return { title: t('widget.cc-windows.name'), value: '—', legend: hint(stats) }
  const fhPct = winPct(windows.fiveHour)
  const wkPct = winPct(windows.weekly)
  if (fhPct === null && wkPct === null) return { title: t('widget.cc-windows.name'), value: '—', legend: hint(stats) }
  const mk = (label: string, pct: number, exceeded?: boolean) => ({
    label,
    value: Math.round(pct),
    ratio: pct / 100,
    tone: exceeded === true || pct >= 95 ? 'danger' as const : pct >= 75 ? 'warn' as const : 'success' as const,
  })
  const rings = []
  if (fhPct !== null) rings.push(mk(t('cc.fiveHour'), fhPct, windows.fiveHour?.exceeded))
  if (wkPct !== null) rings.push(mk(t('cc.weekly'), wkPct, windows.weekly?.exceeded))
  return { title: t('widget.cc-windows.name'), chart: { kind: 'rings', rings } }
}

/** cc-subscription —plan + billing period end from `/alpha/billing/subscriptions`. */
export function ccSubscriptionRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = cc(stats)
  const sub = c?.subscription?.data
  const plan = sub?.planId
  if (!sub && !plan) return { title: t('widget.cc-subscription.name'), value: '—', legend: hint(stats) }
  const status = sub?.status ?? ''
  const end = sub?.currentPeriodEnd
  const endLabel = end ? String(end).slice(0, 10) : ''
  const headAfter = plan ? { big: String(plan), small: status || undefined } : undefined
  const subText = endLabel ? `${t('cc.periodEnd')} ${endLabel}` : undefined
  const cancel = sub?.cancelAtPeriodEnd === true ? (' · ' + t('cc.cancelAtEnd')) : ''
  return {
    title: t('widget.cc-subscription.name'),
    headAfter,
    sub: subText ? subText + cancel : undefined,
  }
}
