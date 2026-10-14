/**
 * dsh-widgets — the ZONE CLOCK reading (shared layer).
 *
 * WHY THIS IS SHARED. Two cards ask the same question — "what does the wall clock
 * say, in the zone this card is configured for?" — and both ask it about an
 * INSTANT that may be a pinned preview value instead of `Date.now()`:
 *   - 时钟 draws that instant as a dial (widgets/clock);
 *   - 日历 derives the month grid and the "today" cell from it (widgets/calendar).
 * The rich renderers draw both (`render/rich/clock-face.tsx` /
 * `render/rich/month-grid.tsx`), and the CLOCK one re-reads the instant on its own
 * 1s tick — so the reading function has to be importable from the shared layer,
 * never duplicated per widget (two copies would eventually disagree about DST).
 *
 * The zone rule is deliberately the same one `peak-schedule.clockAt` uses for
 * `Asia/Shanghai` (+8, China has no DST): a fixed offset table for the zones this
 * plugin offers, and `Intl` for everything else — so a zone WITH DST (New York,
 * London) is still correct, and a zone string the runtime does not know degrades
 * to the browser's own clock instead of throwing inside a card render.
 *
 * Purity: every function here is a pure function of its arguments. `Date.now()`
 * is read in exactly one place — `readClock`'s fallback for a non-finite instant —
 * which is the same licence the other time-aware cards take (see `jobs`).
 */

import { t } from '../i18n'

/** The wall-clock fields of one instant, in one zone (all values, no strings). */
export interface ClockReading {
  year: number
  /** 1–12. */
  month: number
  /** 1–31. */
  day: number
  /** 0 = Sunday, `Date#getDay`'s own convention. */
  dow: number
  /** 0–23. */
  hour: number
  /** 0–59. */
  minute: number
  /** 0–59. */
  second: number
  /** `YYYY-MM-DD` in the same zone (the key the holiday table is indexed by). */
  dateKey: string
}

/**
 * Zones computed as a FIXED offset (minutes east of UTC).
 *
 * `Asia/Shanghai` is here for the same reason `peak-schedule` hard-codes it:
 * China has observed no DST since 1991, so a fixed +8 is exact, not an
 * approximation — and it keeps the one zone this product's own cards default to
 * independent of the runtime's ICU data. Every other zone (including the
 * DST-observing ones offered in the config: London, New York) goes through
 * `Intl`, which is exact by definition.
 */
const FIXED_ZONE_OFFSET_MINS: Record<string, number> = {
  'Asia/Shanghai': 480,
  'Asia/Chongqing': 480,
  'Asia/Harbin': 480,
  'Asia/Hong_Kong': 480,
  'Asia/Macau': 480,
  'Asia/Taipei': 480,
  'Asia/Singapore': 480,
  'Asia/Tokyo': 540,
  'Asia/Seoul': 540,
  UTC: 0,
  'Etc/UTC': 0,
  GMT: 0,
}

/** `local` (or empty/unknown-as-empty) means "the browser's own clock". */
export function resolveClockZone(tz: string | null | undefined): string {
  return typeof tz === 'string' && tz.trim() !== '' ? tz.trim() : 'local'
}

/** `YYYY-MM-DD` from three numbers (no Date, so no zone can creep in). */
function dateKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function readingOf(year: number, month: number, day: number, hour: number, minute: number, second: number): ClockReading {
  // The weekday comes from the DATE, never from the source Date's own getDay():
  // that one is in the browser's zone and would name the wrong day for a zone
  // whose calendar date differs from the local one (e.g. 23:00 UTC in Tokyo).
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return { year, month, day, dow, hour, minute, second, dateKey: dateKeyOf(year, month, day) }
}

/**
 * The wall clock of `at` in `tz`.
 *
 * @param at - an epoch-ms instant or a `Date`; a non-finite value falls back to
 *   `Date.now()` (a card must never render NaN hands because a preview pinned a
 *   malformed value).
 * @param tz - an IANA zone, or `local`/absent for the browser's own clock.
 */
export function readClock(at: number | Date | null | undefined, tz?: string | null): ClockReading {
  const ms = at instanceof Date ? at.getTime() : at
  const d = new Date(typeof ms === 'number' && Number.isFinite(ms) ? ms : Date.now())
  const zone = resolveClockZone(tz)
  if (zone === 'local') {
    return readingOf(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())
  }
  const fixed = FIXED_ZONE_OFFSET_MINS[zone]
  if (fixed !== undefined) {
    const s = new Date(d.getTime() + fixed * 60_000)
    return readingOf(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), s.getUTCHours(), s.getUTCMinutes(), s.getUTCSeconds())
  }
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(d)
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 'NaN')
    const year = get('year')
    const month = get('month')
    const day = get('day')
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) throw new Error('unparsable zone')
    return readingOf(year, month, day, get('hour'), get('minute'), get('second'))
  } catch {
    // An unknown zone string (a hand-edited config, an ICU-less runtime) degrades
    // to the browser's own clock: showing the wrong-but-real local time beats
    // showing a frozen or blank card.
    return readingOf(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())
  }
}

/** Days in a Gregorian month (month is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** The seven weekday numbers in display order (`weekStart` 0 = Sunday, 1 = Monday). */
export function weekdayColumns(weekStart: number): number[] {
  const start = weekStart === 0 ? 0 : 1
  return Array.from({ length: 7 }, (_, i) => (start + i) % 7)
}

/** What a cell's number means to the renderer (the renderer owns the colours). */
export type CalendarCellKind =
  /** An ordinary day of the shown month. */
  | 'normal'
  /** A day the card's tint rule marks: a weekend day, or a statutory holiday. */
  | 'accent'
  /** The cell the configured clock says is today, in the shown month. */
  | 'today'
  /** A neighbouring month's day, shown only when the card asks for it. */
  | 'other'

/** One day cell of a month grid. */
export interface CalendarCell {
  day: number
  kind: CalendarCellKind
}

/** How a month grid marks its non-today days. */
export type CalendarTint = 'weekend' | 'holiday' | 'none'

/** What {@link buildMonthWeeks} needs to lay a month out. */
export interface MonthGridSpec {
  year: number
  /** 1–12. */
  month: number
  /** 0 = Sunday, 1 = Monday. */
  weekStart: number
  /** The cell to badge as today (in the same zone the month was derived in). */
  today?: { year: number; month: number; day: number } | null
  /** Show the neighbouring months' days in the leading/trailing blanks. */
  showOther?: boolean
  tint?: CalendarTint
  /** Statutory-holiday lookup (`holidayFor`); only read when tint = 'holiday'. */
  holiday?: (dateKey: string) => boolean
}

/**
 * The month's week rows, top to bottom.
 *
 * A blank cell is `null` (the widget asked for no neighbouring days). `tint`
 * 'holiday' takes the caller's own lookup so this module never imports the
 * holiday table itself — the table is one shared rule, but a calendar that does
 * not tint holidays must not pull 2027's notice into its module graph.
 */
export function buildMonthWeeks(spec: MonthGridSpec): Array<Array<CalendarCell | null>> {
  const { year, month, weekStart, today, showOther = false, tint = 'weekend', holiday } = spec
  const cols = weekdayColumns(weekStart)
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const total = daysInMonth(year, month)
  // How many blanks the month starts with: where day 1 sits in the column order.
  const lead = Math.max(0, cols.indexOf(firstDow))
  const rows = Math.ceil((lead + total) / 7)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const prevDays = daysInMonth(prevYear, prevMonth)
  const isToday = (d: number): boolean =>
    today != null && today.year === year && today.month === month && today.day === d
  const isTinted = (d: number, dow: number): boolean => {
    if (tint === 'none') return false
    if (tint === 'weekend') return dow === 0 || dow === 6
    return holiday ? holiday(dateKeyOf(year, month, d)) : false
  }
  const weeks: Array<Array<CalendarCell | null>> = []
  let day = 1
  for (let r = 0; r < rows; r++) {
    const row: Array<CalendarCell | null> = []
    for (let c = 0; c < 7; c++) {
      const index = r * 7 + c
      if (index < lead) {
        // A leading blank: the tail of the previous month, or nothing at all.
        const d = prevDays - lead + 1 + index
        row.push(showOther ? { day: d, kind: 'other' } : null)
        continue
      }
      if (day > total) {
        // A trailing blank: the head of the next month, or nothing at all.
        row.push(showOther ? { day: day - total, kind: 'other' } : null)
        day += 1
        continue
      }
      const dow = cols[c]
      row.push({
        day,
        kind: isToday(day) ? 'today' : isTinted(day, dow) ? 'accent' : 'normal',
      })
      day += 1
    }
    weeks.push(row)
  }
  return weeks
}

/** `YYYY-MM-DD` of a reading (the key the holiday table is indexed by). */
export function readingDateKey(r: ClockReading): string {
  return dateKeyOf(r.year, r.month, r.day)
}

/**
 * One zone the time cards offer.
 *
 * `labelKey` is a SHARED dictionary key (`tz.*` in `src/widgets/_shared/locales.json`),
 * because 时钟 and 日历 offer the same list and a zone renamed in one dictionary
 * must not keep the old name on the other card. `offset` is the note the config
 * dropdown shows beside the name — a fixed string, deliberately: two of these
 * zones observe DST, so a computed "+8:00 right now" would be a moving target in
 * a settings row.
 */
export interface ClockZoneOption {
  value: string
  labelKey: string
  offset: string
}

/** The zones the two time cards offer, in dropdown order. */
export const CLOCK_ZONES: ClockZoneOption[] = [
  { value: 'local', labelKey: 'tz.local', offset: '' },
  { value: 'Asia/Shanghai', labelKey: 'tz.beijing', offset: 'UTC+8' },
  { value: 'Asia/Tokyo', labelKey: 'tz.tokyo', offset: 'UTC+9' },
  { value: 'Europe/London', labelKey: 'tz.london', offset: 'UTC+0/+1' },
  { value: 'America/New_York', labelKey: 'tz.newyork', offset: 'UTC-5/-4' },
  { value: 'UTC', labelKey: 'tz.utc', offset: 'UTC' },
]

/** The zone's short name (the dial's pill, the digital date line's prefix). An
 *  unknown zone prints the raw IANA id rather than nothing: the card must be able
 *  to say WHICH clock it is showing, even one this build has no word for. */
export function clockZoneLabel(tz: string | null | undefined): string {
  const zone = resolveClockZone(tz)
  const hit = CLOCK_ZONES.find((z) => z.value === zone)
  return hit === undefined ? zone : t(hit.labelKey)
}

/** The dropdown options for a time card's 时区 field: `[value, label thunk]`. */
export function clockZoneOptions(): Array<[string, () => string]> {
  return CLOCK_ZONES.map((z) => [z.value, () => (z.offset === '' ? t(z.labelKey) : `${t(z.labelKey)} (${z.offset})`)] as [string, () => string])
}

/**
 * The instant a preview PINNED, or `null` for the live clock.
 *
 * `sim.at` is a preview-only field (the rail never passes `sim`), so a card that
 * finds one renders a fixed face — which is what makes the offline surfaces
 * reviewable and the render snapshot (G4) reproducible. Both an epoch-ms number
 * and an ISO/Zoned string are accepted: a number is what the widget's own example
 * declares, a string is what a human writing a sim step reaches for.
 */
export function pinnedInstant(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const ms = Date.parse(v)
    if (Number.isFinite(ms)) return ms
  }
  return null
}

