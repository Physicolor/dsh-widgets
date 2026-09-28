/**
 * DeepSeek peak/off-peak pricing — the RULE, in the shared layer.
 *
 * SHARED LAYER since 2026-09-28, for the same reason as `peak-holidays`: TWO cards
 * (峰谷定价 2×2 and 峰谷时段表 2×4) must never disagree about what counts as peak
 * right now — if they did, the rail would be lying on one of them. The rule used to
 * live inside the 2×2 unit and be imported FROM there by the 2×4 one, which made
 * deleting that directory break the other card; a rule two cards share belongs to
 * neither. Both now read this module, and the 2×4 unit's `schedule.ts` keeps only
 * its render mapping.
 *
 * Everything here is pure: no React, no DOM, no i18n. The cards own their strings.
 */
import { type HolidayRange, holidayFor, holidayTableCovers, parseExtraHolidays, yearOf } from './peak-holidays'

/** Default peak windows, Beijing time (UTC+8). DeepSeek V4 Flash / V4 Flash
 *  Vision Exp / V4 Pro price peaks: Mon–Fri 01:00–04:00 and 06:00–10:00 UTC,
 *  which is 09:00–12:00 and 14:00–18:00 Beijing. Every other moment is
 *  off-peak — including all of Saturday/Sunday (the 调休 workday weekends
 *  included) and every Chinese public holiday for the WHOLE day. Editable per
 *  card (`peakWindows`); the meter can hold two rows, hence the cap. */
export const DEFAULT_PEAK_WINDOWS = '09:00-12:00, 14:00-18:00'

/** The one offset the non-`local` zones use, in minutes.
 *
 *  China has no DST, so this is a constant rather than a table — but it is a
 *  constant TWO things depend on: `clockAt` (instant → wall clock) and the 2×4
 *  card's `instantOf` (wall clock → instant, for a preview that pinned the clock).
 *  It used to be written inline here and MIRRORED there (`BEIJING_OFFSET_MINS`),
 *  which is exactly the kind of pair that drifts into a "peak judged wrong" bug —
 *  the 2×4 unit already hit the cost of it (a double conversion landed a Thursday
 *  10:30 inside 中秋). Exported once, read twice. */
export const ZONE_OFFSET_MINS = 8 * 60

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

/** Minutes-from-midnight → `HH:MM`. */
export function fmtMins(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
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
  const d = local ? now : new Date(now.getTime() + ZONE_OFFSET_MINS * 60_000)
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

/** Read a card's config fields off the merged stats record. Missing fields mean
 *  "default", so a widget rendered without config (probes, previews) behaves
 *  exactly like a freshly added card. Both pricing cards read their settings
 *  through THIS function, so every key means the same thing on each of them. */
export function peakConfigOf(stats?: Partial<Record<string, unknown>> | null): PeakPricingConfig {
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
   *  weekends are honoured. The cards surface this in their hover hint. */
  holidayTableStale: boolean
}

/** Is right now inside a peak window? Returns the active window index and the
 *  whole-day off-peak reason too, so a card can say WHY it is cheap.
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
