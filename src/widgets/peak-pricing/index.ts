import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { HOLIDAY_TABLE_SOURCE, holidayFor, holidayTableCovers, parseExtraHolidays, yearOf, type HolidayRange } from './holidays'

/** Default peak windows, Beijing time (UTC+8). DeepSeek V4 Flash / V4 Flash
 *  Vision Exp / V4 Pro price peaks: Mon–Fri 01:00–04:00 and 06:00–10:00 UTC,
 *  which is 09:00–12:00 and 14:00–18:00 Beijing. Every other moment is
 *  off-peak — including all of Saturday/Sunday (the 调休 workday weekends
 *  included) and every Chinese public holiday for the WHOLE day. Editable per
 *  card (`peakWindows`); the card's meter can hold two rows, hence the cap. */
export const DEFAULT_PEAK_WINDOWS = '09:00-12:00, 14:00-18:00'

/** Cap on parsed windows — the meter's designed shape is two rows. */
const MAX_WINDOWS = 2

/** A peak window as minutes-from-midnight. */
export interface PeakWindow { start: number; end: number }

/** The built-in windows, used whenever the config field is empty/unparseable. */
const FALLBACK_WINDOWS: PeakWindow[] = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 14 * 60, end: 18 * 60 },
]

/** `09:00-12:00, 14:00-18:00` → minute ranges (at most MAX_WINDOWS).
 *  Tolerant on purpose: the config field is edited keystroke by keystroke, so an
 *  unrecognised or half-typed entry is skipped, and an entirely unusable value
 *  falls back to the built-in windows instead of leaving the card windowless. */
export function parsePeakWindows(spec: unknown): PeakWindow[] {
  if (typeof spec === 'string' && spec.trim() !== '') {
    const out: PeakWindow[] = []
    for (const part of spec.split(/[,;]/)) {
      const m = /^\s*(\d{1,2}):(\d{2})\s*[-–~—]\s*(\d{1,2}):(\d{2})\s*$/.exec(part)
      if (!m) continue
      const start = Number(m[1]) * 60 + Number(m[2])
      const end = Number(m[3]) * 60 + Number(m[4])
      // A window must be non-empty and inside one day (00:00–24:00).
      if (start >= end || start < 0 || end > 24 * 60) continue
      out.push({ start, end })
      if (out.length >= MAX_WINDOWS) break
    }
    if (out.length > 0) return out
  }
  return FALLBACK_WINDOWS.map((w) => ({ ...w }))
}

/** The wall clock the pricing rule is evaluated in. */
export interface Clock {
  year: number
  /** 0 = Sunday, matching Date#getDay. */
  dow: number
  /** Minutes since local midnight. */
  mins: number
  /** `YYYY-MM-DD` in that same clock. */
  dateKey: string
}

/** The clock for `now` in the configured zone. `Asia/Shanghai` is computed as a
 *  fixed UTC+8 offset (China has no DST), so the verdict never depends on the
 *  machine's own time zone — which is what the previous local-clock reading got
 *  wrong the moment the browser was not set to Beijing. `local` keeps the old
 *  behaviour for anyone who wants their own clock. */
export function clockAt(now: Date, tz: string): Clock {
  const local = tz === 'local'
  const d = local ? now : new Date(now.getTime() + 8 * 3600_000)
  const year = local ? d.getFullYear() : d.getUTCFullYear()
  const month = (local ? d.getMonth() : d.getUTCMonth()) + 1
  const day = local ? d.getDate() : d.getUTCDate()
  const dow = local ? d.getDay() : d.getUTCDay()
  const mins = (local ? d.getHours() : d.getUTCHours()) * 60 + (local ? d.getMinutes() : d.getUTCMinutes())
  return { year, dow, mins, dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
}

/** The pricing-relevant per-card configuration (read off the merged stats). */
export interface PeakPricingConfig {
  windows: PeakWindow[]
  weekendOff: boolean
  holidayOff: boolean
  tz: string
  extra: HolidayRange[]
}

/** Read the card's config fields off the merged stats record. Missing fields mean
 *  "default", so a widget rendered without config (probes, previews) behaves
 *  exactly like a freshly added card. */
export function peakConfigOf(stats?: Partial<WidgetStats> | null): PeakPricingConfig {
  const s = (stats ?? {}) as Record<string, unknown>
  return {
    windows: parsePeakWindows(s.peakWindows),
    weekendOff: s.weekendOff !== false,
    holidayOff: s.holidayOff !== false,
    tz: typeof s.timeZone === 'string' && s.timeZone !== '' ? s.timeZone : 'Asia/Shanghai',
    extra: parseExtraHolidays(s.extraHolidays),
  }
}

export interface PeakStatus {
  peak: boolean
  /** Which configured window is live (index into `cfg.windows`). */
  activeIndex?: number
  /** Set when the WHOLE day is off-peak by rule (a holiday or a weekend) — the
   *  i18n key that names the reason. The meter shows this instead of the two
   *  window rows, because no window applies to such a day at all. */
  reasonKey?: string
  /** The day the verdict was computed for, in the configured clock. */
  dateKey: string
  /** True when the configured clock's year has no holiday-table entry, so only
   *  weekends are honoured. The card surfaces this in its hover hint. */
  holidayTableStale: boolean
}

/** Is right now inside a peak window? Returns the active window index and the
 *  whole-day off-peak reason too, so the card can say WHY it is cheap.
 *  Exported so probes and the preview surfaces can date-shift the check. */
export function peakStatusNow(now = new Date(), cfg: PeakPricingConfig = peakConfigOf(null)): PeakStatus {
  const c = clockAt(now, cfg.tz)
  const year = yearOf(c.dateKey) ?? c.year
  const holiday = cfg.holidayOff ? holidayFor(c.dateKey, cfg.extra) : undefined
  // Only flag a stale table when the user has not supplied that year's dates
  // themselves — an `extraHolidays` list is exactly the workaround.
  const stale = cfg.holidayOff && cfg.extra.length === 0 && !holidayTableCovers(year)
  if (holiday) return { peak: false, reasonKey: holiday.key, dateKey: c.dateKey, holidayTableStale: stale }
  if (cfg.weekendOff && (c.dow === 0 || c.dow === 6)) return { peak: false, reasonKey: 'card.peak.weekend', dateKey: c.dateKey, holidayTableStale: stale }
  for (let i = 0; i < cfg.windows.length; i++) {
    const w = cfg.windows[i]
    if (c.mins >= w.start && c.mins < w.end) return { peak: true, activeIndex: i, dateKey: c.dateKey, holidayTableStale: stale }
  }
  return { peak: false, dateKey: c.dateKey, holidayTableStale: stale }
}

/** Minutes-from-midnight → `HH:MM`. */
function fmtMins(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

/** One meter row's label: 上午/下午 + the range, so a customised window still
 *  reads like the built-in pair. */
function windowLabel(w: PeakWindow): string {
  const range = `${fmtMins(w.start)}–${fmtMins(w.end)}`
  return t(w.start < 12 * 60 ? 'card.peak.am' : 'card.peak.pm', { range })
}

/** Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
 *  Value mirrors the cache/tokens card (big bottom-left label): EXPENSIVE while
 *  a peak window is active, CHEAP otherwise. The two windows live under the
 *  title; the active one lights up brand-blue. On a day that is off-peak in full
 *  (weekend / Chinese public holiday — see holidays.ts) the meter shows that
 *  reason instead: no window applies to such a day. The EXPENSIVE escalation is
 *  on the TEXT itself — the value turns red and blinks (valuePulse); the card
 *  frame stays clean (the old red inner glow was removed on request). A preview
 *  can pass meta.sim = { peak, reasonKey?, window? } to force any state. */
function peakPricingRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const cfg = peakConfigOf(stats)
  const sim = meta?.sim
  const simPeak = sim && typeof sim.peak === 'boolean' ? sim.peak : null
  const live = peakStatusNow(new Date(), cfg)
  const peak = simPeak !== null ? simPeak : live.peak
  // Simulating? The reason comes from the sim record, never from today's clock,
  // so a preview is deterministic (see the unit's `example`).
  const reasonKey = simPeak === null
    ? (live.peak ? undefined : live.reasonKey)
    : (simPeak ? undefined : (typeof sim?.reasonKey === 'string' ? sim.reasonKey : undefined))
  const activeIndex = simPeak === null
    ? live.activeIndex
    : (simPeak
        ? (typeof sim?.window === 'number' && sim.window >= 0 && sim.window < cfg.windows.length ? sim.window : 0)
        : undefined)
  const meter = reasonKey
    ? [{ label: t('card.peak.offDay', { reason: t(reasonKey) }), active: false }]
    : cfg.windows.map((w, i) => ({ label: windowLabel(w), active: i === activeIndex }))
  return {
    title: t('card.peak.title'),
    meter,
    value: peak ? 'EXPENSIVE' : 'CHEAP',
    valueTone: peak ? 'danger' : undefined,
    valuePulse: peak,
    cardHint: live.holidayTableStale
      ? t('card.peak.staleHint', { year: live.dateKey.slice(0, 4), source: HOLIDAY_TABLE_SOURCE })
      : undefined,
  }
}

export default defineWidget({
  id: 'peak-pricing',
  name: () => t('widget.peak-pricing.name'),
  desc: () => t('widget.peak-pricing.desc'),
  builtin: false,
  group: 'pricing',
  badgeLabel: () => t('widget.peak-pricing.name'),
  simToggle: () => t('sim.peak'),
  render: peakPricingRender,
  configSchema: [
    { key: 'peakWindows', label: () => t('config.peak.windows'), type: 'text', default: DEFAULT_PEAK_WINDOWS },
    { key: 'weekendOff', label: () => t('config.peak.weekend'), type: 'toggle', default: true },
    { key: 'holidayOff', label: () => t('config.peak.holiday'), type: 'toggle', default: true },
    { key: 'timeZone', label: () => t('config.peak.timeZone'), type: 'mode', default: 'Asia/Shanghai', options: [['Asia/Shanghai', () => t('config.peak.tz.beijing')], ['local', () => t('config.peak.tz.local')]] },
    { key: 'extraHolidays', label: () => t('config.peak.extra'), type: 'text', default: '' },
  ],
  // Preview mock: a click walks the four states — off-peak → peak → a Chinese
  // public holiday (whole day cheap) → a weekend — so every look can be reviewed
  // without waiting for the calendar (or the clock) to get there.
  example: {
    sim: { peak: false },
    simSteps: [
      { peak: false },
      { peak: true },
      { peak: false, reasonKey: 'card.peak.holiday.midautumn' },
      { peak: false, reasonKey: 'card.peak.weekend' },
    ],
  },
})
