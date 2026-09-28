/**
 * DeepSeek peak/off-peak pricing — China's public-holiday calendar.
 *
 * SHARED LAYER since 2026-09-28. This table (and its lookups) used to live inside
 * the 峰谷定价 unit, and the 峰谷时段表 unit imported it from there — a unit-to-unit
 * dependency that made "delete one widget directory" unsafe and existed only so
 * the two cards could not disagree about what a holiday is. A rule TWO cards must
 * agree on belongs to neither of them: it lives here, and both read it.
 *
 * WHY this exists: the off-peak discount is NOT a plain weekday clock. The
 * official pricing page (footnote 2, https://api-docs.deepseek.com/quick_start/pricing)
 * reads:
 *
 *   "Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and
 *    06:00 - 10:00 UTC, Monday through Friday, excluding Chinese public holidays.
 *    All other hours are off-peak, including weekends and Chinese public holidays
 *    in full."
 *
 * So a Chinese public holiday that falls on a weekday is billed at the off-peak
 * rate for the WHOLE day — the 09:00–12:00 / 14:00–18:00 Beijing windows do not
 * apply to it. Read the other way, the weekends that 调休 (the annual
 * holiday reshuffle) turns into working days stay off-peak too, because the rule
 * keys off the CALENDAR day, not off whether one has to work: DeepSeek restated
 * exactly that on 2026-09-19 ("调休上班的周末、中国法定节假日全天均按空闲时段计费").
 * A weekday clock alone therefore mis-prices 19 days of 2026 — 中秋 9/25, 国庆
 * 10/1–10/7 and the rest of the list below.
 *
 * MAINTENANCE (once a year): the ranges are transcribed from 国务院办公厅's
 * annual notice — 2026 comes from 国办发明电〔2025〕7号
 * (https://www.gov.cn/zhengce/content/202511/content_7047090.htm). The next
 * year's arrangement is published around November of the year before; when it
 * lands, add its ranges, extend HOLIDAY_YEARS and update HOLIDAY_TABLE_SOURCE.
 * A year with no entry is never guessed at: the cards keep weekday behaviour and
 * say so in their hover hint, and the 额外低谷日 config field carries the dates in
 * the meantime.
 */

/** One contiguous run of off-peak-due-to-holiday days (inclusive, Beijing). */
export interface HolidayRange {
  /** First day, `YYYY-MM-DD`. */
  start: string
  /** Last day, `YYYY-MM-DD`. */
  end: string
  /** i18n key naming the holiday (see the pricing units' manifest locales). */
  key: string
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
/** Bound on the user's 额外低谷日 list: a typo'd paste must not walk forever. */
const MAX_EXTRA_RANGES = 40

/** 2026 statutory holiday periods — 国办发明电〔2025〕7号 (inclusive ranges). */
export const CN_HOLIDAYS_2026: HolidayRange[] = [
  { start: '2026-01-01', end: '2026-01-03', key: 'card.peak.holiday.newyear' },   // 元旦
  { start: '2026-02-15', end: '2026-02-23', key: 'card.peak.holiday.spring' },    // 春节
  { start: '2026-04-04', end: '2026-04-06', key: 'card.peak.holiday.qingming' },  // 清明节
  { start: '2026-05-01', end: '2026-05-05', key: 'card.peak.holiday.labour' },    // 劳动节
  { start: '2026-06-19', end: '2026-06-21', key: 'card.peak.holiday.dragon' },    // 端午节
  { start: '2026-09-25', end: '2026-09-27', key: 'card.peak.holiday.midautumn' }, // 中秋节
  { start: '2026-10-01', end: '2026-10-07', key: 'card.peak.holiday.national' },  // 国庆节
]

/** Every known holiday range, newest year last. */
export const CN_HOLIDAYS: HolidayRange[] = [...CN_HOLIDAYS_2026]

/** Years the table actually covers — a year missing here is reported, not guessed. */
export const HOLIDAY_YEARS: number[] = [2026]

/** Where the ranges above come from, quoted in the cards' stale-table hint. */
export const HOLIDAY_TABLE_SOURCE = '国办发明电〔2025〕7号'

/** The i18n key given to holidays that come from the user's own config list. */
export const CUSTOM_HOLIDAY_KEY = 'card.peak.holiday.custom'

/** `YYYY-MM-DD` → the four-digit year, or null when the key is malformed. */
export function yearOf(dateKey: string): number | null {
  const m = DATE_RE.exec(dateKey)
  return m ? Number(m[1]) : null
}

/** Inclusive `start <= dateKey <= end` on ISO keys (lexicographic === chronological). */
export function inRange(dateKey: string, r: HolidayRange): boolean {
  return dateKey >= r.start && dateKey <= r.end
}

/** Is `year` covered by the built-in table? */
export function holidayTableCovers(year: number): boolean {
  return HOLIDAY_YEARS.indexOf(year) !== -1
}

/** The holiday `dateKey` falls in — the user's own ranges first, then the table.
 *  Returns undefined on an ordinary day. */
export function holidayFor(dateKey: string, extra: HolidayRange[] = []): HolidayRange | undefined {
  for (const r of extra) if (inRange(dateKey, r)) return r
  for (const r of CN_HOLIDAYS) if (inRange(dateKey, r)) return r
  return undefined
}

/** Sanity-check a `YYYY-MM-DD` literal (month/day in range, real UTC day). */
function validDay(dateKey: string): boolean {
  const m = DATE_RE.exec(dateKey)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

/**
 * Parse the 额外低谷日 config field into ranges.
 *
 * Accepted per entry (comma / semicolon / whitespace separated):
 *   `2027-01-01`                  one day
 *   `2027-02-05..2027-02-11`      an inclusive span (`~` and `…` also work)
 * Anything else is skipped rather than throwing — the field is edited keystroke
 * by keystroke, so a half-typed `2027-01-0` must never take the card down.
 */
export function parseExtraHolidays(spec: unknown): HolidayRange[] {
  if (typeof spec !== 'string' || spec.trim() === '') return []
  const out: HolidayRange[] = []
  for (const raw of spec.split(/[,;\s]+/)) {
    if (raw === '') continue
    const [a, b] = raw.split(/\.\.|~|–|—/)
    const start = (a ?? '').trim()
    const end = (b ?? start).trim()
    if (!validDay(start) || !validDay(end) || end < start) continue
    out.push({ start, end, key: CUSTOM_HOLIDAY_KEY })
    if (out.length >= MAX_EXTRA_RANGES) break
  }
  return out
}
