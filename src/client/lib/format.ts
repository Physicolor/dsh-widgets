/**
 * dsh-widgets — pure formatting + grid helpers (shared, stable core).
 *
 * Nothing here touches React or i18n; any widget unit may import these.
 */

import type { BarDatum } from './contract'

/** Compact duration: 45.2s under a minute, 2m42s from there. */
export function fmtDuration(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${Math.round(s * 10) / 10}s`
  const whole = Math.round(s)
  return `${Math.floor(whole / 60)}m${whole % 60}s`
}

/** Compact token count: 517 / 12.2K / 517K / 1.2M. */
export function fmtTokens(n: number): string {
  const scaled = (v: number): string => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10))
  if (n < 1000) return String(n)
  if (n < 1000000) return `${scaled(n / 1000)}K`
  return `${scaled(n / 1000000)}M`
}

/** Throughput: whole tokens from ten up, one decimal below. */
export function fmtTps(tps: number): string {
  return tps >= 10 ? String(Math.round(tps)) : String(Math.round(tps * 10) / 10)
}

/** `YYYY-MM-DD` for a local date. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Build a GitHub-style rolling heatmap grid directly from the raw daily log.
 * `weeks` columns (each a calendar week, Sunday-first) end at this week so the
 * latest data is always on the right edge. `weeks=26` → ~half a year (the 2×4
 * variant); `weeks=13` → the ~3-month 2×2 calendar.
 */
export function buildRollingGrid(raw: Record<string, number>, weeks: number): Array<Array<{ value: number; date: string }>> {
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const base = new Date(startOfWeek)
  base.setDate(base.getDate() - (weeks - 1) * 7)
  const grid: Array<Array<{ value: number; date: string }>> = []
  for (let r = 0; r < 7; r++) {
    const row: Array<{ value: number; date: string }> = []
    for (let c = 0; c < weeks; c++) {
      const d = new Date(base)
      d.setDate(base.getDate() + c * 7 + r)
      const k = dayKey(d)
      row.push({ value: raw[k] ?? 0, date: k })
    }
    grid.push(row)
  }
  return grid
}

/** Last `n` days (oldest→newest) as bar data, ending today. Labels are
 *  short month.day (e.g. 8.28 — no year/weekday). Values stay raw tokens;
 *  ratio is normalized to the MAX WITHIN THIS WINDOW (not the whole history),
 *  so the tallest bar of the last-7-days always reaches full height and the
 *  chart stays full — a huge historical outlier must not flatten the window. */
export function lastNDays(raw: Record<string, number>, n: number): BarDatum[] {
  const keys = Object.keys(raw).sort()
  const byDate: Record<string, number> = {}
  for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k]
  const now = new Date()
  const days: BarDatum[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const k = dayKey(d)
    const v = byDate[k] ?? 0
    days.push({ label: `${d.getMonth() + 1}.${d.getDate()}`, value: v, ratio: 0, tone: v > 0 ? 'primary' : 'muted' })
  }
  const max = Math.max(1, ...days.map((d) => d.value))
  for (const d of days) d.ratio = d.value > 0 ? d.value / max : 0
  return days
}

/** Week-aligned variant: `n` bars starting from this week's SUNDAY (today may
 *  land anywhere inside the window; future/past spill days render as zeros).
 *  Same window-normalized max as `lastNDays` — the tallest bar in the 7-bar
 *  window always reaches full height. */
export function lastNDaysWeekly(raw: Record<string, number>, n: number): BarDatum[] {
  const keys = Object.keys(raw).sort()
  const byDate: Record<string, number> = {}
  for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k]
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const days: BarDatum[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const k = dayKey(d)
    const v = byDate[k] ?? 0
    days.push({ label: `${d.getMonth() + 1}.${d.getDate()}`, value: v, ratio: 0, tone: v > 0 ? 'primary' : 'muted' })
  }
  const max = Math.max(1, ...days.map((d) => d.value))
  for (const d of days) d.ratio = d.value > 0 ? d.value / max : 0
  return days
}

/** `8.14` style short date used by bar labels and heatmap edges. */
export function fmtShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso || ''
  return `${Number(m[2])}.${Number(m[3])}`
}