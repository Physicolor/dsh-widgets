import { t } from '../../i18n'
import type { BarDatum, UsageData, UsageMulti, WidgetRenderOut, WidgetStats } from '../../lib/contract'
import { usageView, cycleFor, modeLabel, winPct } from './data'

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
export type { UsageData, UsageMulti } from '../../lib/contract'
