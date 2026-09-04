/**
 * dsh-widgets — OpenCode Go usage shared render layer (widget-family shared).
 *
 * The five usage widgets (usage-bars / usage-rings / usage-rolling / usage-
 * weekly / usage-monthly) share the pool-view resolution and the card shapes.
 * They live here — NOT copied into each unit — so the family stays consistent
 * and a new usage-style widget imports the same machinery.
 *
 * All strings come from the per-widget dictionaries (merged by the registry
 * generator from each unit's manifest; family-shared keys live in
 * `src/widgets/_shared/locales.json`), so these factories never hard-code text.
 */

import { t } from '../i18n'
import type { BarDatum, UsageData, UsageMulti, WidgetRenderOut, WidgetStats } from './contract'

/** Which key's usage a usage widget should currently show. */
function usageView(stats: WidgetStats): { data: UsageData | null; mode: string } {
  const multi = stats.usageMulti
  const modes = stats.poolModes !== undefined && stats.poolModes.length > 0 ? stats.poolModes : ['total']
  const view = stats.poolView
  if (view === undefined || !modes.includes(view) || view === 'total') {
    return { data: multi?.total ?? stats.usageData ?? null, mode: 'total' }
  }
  // modes[0] is always 'total'; index 1..N map 1:1 to pooled keys.
  const idx = modes.indexOf(view) - 1
  const entry = multi?.keys[idx]
  return { data: entry?.data ?? null, mode: view }
}

/** Cycle descriptor for a pooled usage widget, when more than one view exists. */
function cycleFor(stats: WidgetStats): WidgetRenderOut['cycle'] {
  const modes = stats.poolModes
  if (modes === undefined || modes.length < 2) return undefined
  const current = stats.poolView !== undefined && modes.includes(stats.poolView) ? stats.poolView : 'total'
  const hint = t('usage.cycleHint', { chain: modes.map((m) => (m === 'total' ? t('usage.totalKey') : m)).join(' → ') + ' → ' + t('usage.totalKey') })
  return { modes, current, hint }
}

/** 「总 Key」/「Key N」label for the current view. */
function modeLabel(mode: string): string {
  return mode === 'total' ? t('usage.totalKey') : mode
}

/** Read one usage window's percent DEFENSIVELY: any malformed window (missing,
 *  null, non-object, non-numeric percent — e.g. an upstream partial/error
 *  response) yields null, so the multi-window charts degrade to a placeholder
 *  instead of throwing and taking the whole rail down with them. */
function winPct(u: UsageData['usage'] | undefined, key: 'rolling' | 'weekly' | 'monthly'): number | null {
  const it = u?.[key]
  return it !== null && typeof it === 'object' && typeof (it as { percent?: unknown }).percent === 'number'
    ? (it as { percent: number }).percent
    : null
}

/** Single-window percent card (usage-rolling / usage-weekly / usage-monthly). */
export function usageRender(key: 'rolling' | 'weekly' | 'monthly', nameKey: string): (stats: WidgetStats) => WidgetRenderOut | null {
  return (stats) => {
    const { data, mode } = usageView(stats)
    const u = data?.usage?.[key]
    const cycle = cycleFor(stats)
    if (u === null || u === undefined || typeof u !== 'object' || typeof (u as { percent?: unknown }).percent !== 'number') {
      return { title: t(nameKey), value: '—', legend: modeLabel(mode), cycle }
    }
    const item = u as { percent: number; resetsAt?: string }
    return {
      title: t(nameKey),
      value: `${Number(item.percent).toFixed(1)}%`,
      legend: modeLabel(mode),
      sub: t('usage.resets', { date: String(item.resetsAt || '').slice(0, 10) }),
      cycle,
    }
  }
}

/** OpenCode Go dosage as one bar chart across the three windows (usage-bars). */
export function usageBarsRender(stats: WidgetStats): WidgetRenderOut | null {
  const { data, mode } = usageView(stats)
  const u = data?.usage
  const cycle = cycleFor(stats)
  const r = winPct(u, 'rolling')
  const w = winPct(u, 'weekly')
  const m = winPct(u, 'monthly')
  if (r === null || w === null || m === null) {
    return { title: t('usage.title'), value: '—', legend: modeLabel(mode), cycle }
  }
  const tone = (p: number): BarDatum['tone'] => (p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success')
  const bars: BarDatum[] = [
    { label: t('usage.rolling'), value: r, ratio: r / 100, tone: tone(r) },
    { label: t('usage.week'), value: w, ratio: w / 100, tone: tone(w) },
    { label: t('usage.month'), value: m, ratio: m / 100, tone: tone(m) },
  ]
  return { title: t('usage.title'), legend: modeLabel(mode), chart: { kind: 'bars', bars }, cycle }
}

/** OpenCode Go dosage as three small donuts — same data as the bars chart,
 *  circle form. Each ring shows its percent in the centre... (usage-rings).
 *  Labels stay OFF (user preference: no rolling/week/month text under the
 *  rings — the window names surface on hover via the title tooltip). */
export function usageRingsRender(stats: WidgetStats): WidgetRenderOut | null {
  const { data, mode } = usageView(stats)
  const u = data?.usage
  const cycle = cycleFor(stats)
  const r = winPct(u, 'rolling')
  const w = winPct(u, 'weekly')
  const m = winPct(u, 'monthly')
  if (r === null || w === null || m === null) {
    return { title: t('usage.title'), value: '—', legend: modeLabel(mode), cycle }
  }
  const tone = (p: number): 'success' | 'warn' | 'danger' => (p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success')
  const mk = (p: number) => ({ label: '', value: p, ratio: p / 100, tone: tone(p) })
  return {
    title: t('usage.title'),
    legend: modeLabel(mode),
    chart: { kind: 'rings', rings: [mk(r), mk(w), mk(m)] },
    cycle,
  }
}

/** Types the host multi-key payload shape re-exported for convenience. */
export type { UsageData, UsageMulti } from './contract'