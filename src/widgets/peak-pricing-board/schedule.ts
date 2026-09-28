/**
 * peak-pricing-board — today's billing schedule, as DATA.
 *
 * The 2×2 峰谷定价 card answers one question ("is it peak RIGHT NOW?"); this module
 * answers the wide card's question ("how does the REST OF TODAY bill?") as a pure
 * function of (clock, config) — no React, no DOM, no i18n. Every label the card
 * prints is built in index.ts; here we only produce minutes and i18n KEYS, so the
 * schedule can be read (and probed) without a locale.
 *
 * THE RULE IS NOT OURS, AND NO LONGER NEXT DOOR. The peak/off-peak verdict, the
 * timezone clock, the window parser, the config reader and the holiday lookup are
 * read from the SHARED layer — `src/client/lib/peak-schedule.ts` +
 * `src/client/lib/peak-holidays.ts` — because the 2×2 峰谷定价 card must answer
 * exactly the same question the same way: if the two ever disagreed, the rail
 * would be lying on one of them. They used to be imported FROM the 2×2 unit (a
 * real unit-to-unit coupling: deleting that directory broke this card, and the
 * +8 offset was mirrored here because `clockAt` kept it inline); both moved into
 * the shared layer on 2026-09-28, and `ZONE_OFFSET_MINS` is now read from there
 * instead of being copied.
 */

import {
  DEFAULT_PEAK_WINDOWS,
  ZONE_OFFSET_MINS,
  clockAt,
  fmtMins,
  parsePeakWindows,
  peakConfigOf,
  peakStatusNow,
  type Clock,
  type PeakPricingConfig,
  type PeakStatus,
  type PeakWindow,
} from '../../client/lib/peak-schedule'
import { holidayTableCovers, yearOf } from '../../client/lib/peak-holidays'

/** A day's worth of PeakPricingConfig (what the schedule is computed from). */
export type ScheduleConfig = PeakPricingConfig

/** Minutes in one day — the schedule's own horizon. */
const DAY = 24 * 60

/** The shipped timetable, as the shared config string. Used by the unit's
 *  example/probe so neither has to re-type it. */
export const DEFAULT_BILLING_WINDOWS = DEFAULT_PEAK_WINDOWS

/** Minutes → `42m` / `1h 05m` — the countdown in the head. */
export function fmtRemaining(mins: number): string {
  const m = Math.max(0, Math.round(mins))
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

/**
 * ONE block of the day's clock: a stretch that bills the same way.
 *
 *  - `peak: true`  — inside one of the configured windows (`windowIndex`);
 *  - `peak: false` — an off-peak stretch.
 */
export interface DayBlock {
  start: number
  /** Exclusive; `DAY` for the last block of the day. */
  end: number
  peak: boolean
  /** Which configured window this block belongs to (peak blocks only). */
  windowIndex?: number
}

/** ONE row the CARD draws: a configured peak window, or the day's off-peak
 *  remainder — plus whether THIS is the row in effect right now. */
export interface ScheduleRow {
  /** `09:00–12:00` — always real clock text, so the table reads as a timetable. */
  range: string
  peak: boolean
  /** The row now in effect. At most one row is ever `now` (see `boardRows`). */
  now: boolean
  /** Whole-day-off days only, on the remainder row: the i18n key naming WHY.
   *  On such a day the peak windows are still LISTED (the timetable is what the
   *  card is) but they are not in effect — the reason rides this one row. */
  dayOffKey?: string
}

/** Everything the wide card needs about today. */
export interface DayTrack {
  /** `YYYY-MM-DD` in the configured zone. */
  dateKey: string
  /** The zone-local clock the verdicts below were computed in. */
  clock: Clock
  /** The verdict from the SHARED implementation (never re-derived here). */
  status: PeakStatus
  /** True when the whole day bills off-peak by rule (holiday / weekend). */
  wholeDayOff: boolean
  /** The i18n key naming WHY, when `wholeDayOff` — e.g. `card.peak.holiday.spring`
   *  or `card.peak.weekend`. Undefined on an ordinary day. */
  reasonKey?: string
  /** Today's rows in clock order: one per peak window, then the off-peak
   *  remainder (three rows for the shipped two-window timetable). */
  rows: ScheduleRow[]
  /** The blocks the timetable is made of, in clock order. */
  blocks: DayBlock[]
  /** The block in effect right now. */
  current: DayBlock
  /** Start (minutes) of the next block — when the rate flips. `DAY` when nothing
   *  follows inside today (i.e. the next change is the day rollover). */
  nextAt: number
  /** `nextAt - now`, in minutes. */
  nextInMins: number
  /** True when the next flip is the day rollover rather than another block today. */
  nextTomorrow: boolean
  /** Whole-day-off only: when the expensive rate can next come back — the START OF
   *  THE FIRST PEAK WINDOW on the next day whose windows apply (`09:00`), the
   *  CALENDAR-DAY distance to that day, its weekday, and the honest wait from now.
   *  The wait is measured against the wall clock rather than assembled from the
   *  weekday, so the two can never disagree. */
  offUntil?: { label: string; mins: number; days: number; dow: number }
  /** False when the holiday table does not cover a year this caption depends on,
   *  so neither card may promise what tomorrow costs. Kept as a FIELD rather than
   *  a silent fallback: the card prints no "next" caption and says why on hover. */
  nextConfident: boolean
}

/**
 * Read an instance's merged config record into a schedule config.
 *
 * Reuses the 2×2 card's reader verbatim (`peakConfigOf`), so every key —
 * `peakWindows`, `weekendOff`, `holidayOff`, `timeZone`, `extraHolidays` — means
 * exactly what it means over there. `billingWindows` is this card's own OPTIONAL
 * override: when set (non-empty) it replaces `peakWindows`, so the wide card can
 * carry its own timetable without editing the narrow card.
 */
export function resolveScheduleConfig(config: Record<string, unknown> | null | undefined): ScheduleConfig {
  const src = config ?? {}
  const override = typeof src.billingWindows === 'string' && src.billingWindows.trim() !== ''
    ? parsePeakWindows(src.billingWindows)
    : null
  const base = peakConfigOf(src as never)
  return override === null ? base : { ...base, windows: override }
}

/** Fold the configured windows into the day's blocks. Overlaps cannot bill twice:
 *  a later window only contributes the part starting after the previous block
 *  ended (a hand-typed `09:00-12:00, 10:00-11:00` is tolerated, not trusted). */
function blocksOf(windows: PeakWindow[]): DayBlock[] {
  const peaks: DayBlock[] = []
  for (const { w, i } of windows.map((w, i) => ({ w, i })).sort((a, b) => a.w.start - b.w.start || a.w.end - b.w.end)) {
    const start = peaks.length === 0 ? w.start : Math.max(w.start, peaks[peaks.length - 1].end)
    if (start >= w.end) continue
    peaks.push({ start, end: w.end, peak: true, windowIndex: i })
  }
  const all: DayBlock[] = []
  let cursor = 0
  for (const b of peaks) {
    if (b.start > cursor) all.push({ start: cursor, end: b.start, peak: false })
    all.push(b)
    cursor = b.end
  }
  if (cursor < DAY) all.push({ start: cursor, end: DAY, peak: false })
  // No window at all (a cleared/typo'd override parses to the built-in pair, so
  // this is the "windows: []" edge): the whole day is one off-peak block.
  if (all.length === 0) all.push({ start: 0, end: DAY, peak: false })
  return all
}

/** The block containing `mins`; the last one at exactly `DAY`. */
function blockAt(blocks: DayBlock[], mins: number): DayBlock {
  for (const b of blocks) if (mins >= b.start && mins < b.end) return b
  return blocks[blocks.length - 1]
}

/**
 * The table's rows: one per configured peak window, then ONE off-peak row for
 * everything outside them.
 *
 * Why not one row per block: the config is capped at two windows, and an ordinary
 * day's off-peak stretches (00:00–09:00, 12:00–14:00, 18:00–24:00) would need
 * three rows of their own to be exact — the whole foot of the card. Folding them
 * into a single 其余 row keeps the shape fixed at three rows, and the countdown
 * caption in the head is what keeps it precise: the row states the RULE, the
 * caption states WHEN it changes.
 *
 * At most one row is ever `now` — a minute falls in at most one block, so a peak
 * row and the off-peak row can never both light up. In the 12:00–14:00 gap NO peak
 * row is live and the off-peak row is, which is the whole reason the row exists.
 *
 * The row SHAPE never changes: a whole-day-off day keeps the same three rows (the
 * timetable IS the card) and the reason is printed on the remainder row, so the
 * preview and the rail show the same silhouette whatever the calendar says.
 */
function boardRows(windows: PeakWindow[], blocks: DayBlock[], mins: number, dayOffKey?: string): ScheduleRow[] {
  const nowIndex = dayOffKey !== undefined ? -1 : blockAt(blocks, mins).windowIndex ?? -1
  const rows: ScheduleRow[] = windows.map((w, i) => ({
    range: `${fmtMins(w.start)}–${fmtMins(w.end)}`,
    peak: true,
    now: i === nowIndex,
  }))
  const first = windows.length === 0 ? DAY : Math.min(...windows.map((w) => w.start))
  const last = windows.length === 0 ? 0 : Math.max(...windows.map((w) => w.end))
  rows.push({
    // `18:00–09:00` reads as a wraparound at a glance; it is exactly right (the
    // rest of today), and the countdown caption disambiguates which side of it we
    // are on.
    range: windows.length === 0 ? `${fmtMins(0)}–${fmtMins(DAY)}` : `${fmtMins(last)}–${fmtMins(first)}`,
    peak: false,
    now: dayOffKey !== undefined || nowIndex === -1,
    dayOffKey,
  })
  return rows
}

/** The zone-local clock for `now` — the contrived-`Date` rule lives in the 2×2
 *  card's `clockAt`, so this is only here to name the intent. */
export function clockInZone(now: Date, tz: string): Clock {
  return clockAt(now, tz)
}

/**
 * The instant whose fields ARE `clock`'s fields.
 *
 * The shared verdict (`peakStatusNow`) takes a `Date` and immediately runs it back
 * through `clockAt`, so the ONLY correct input is an instant already carrying the
 * zone's own offset — i.e. exactly what `clockAt` would have produced for this
 * wall clock. Feeding it the raw wall-clock fields instead double-converts (+8
 * twice) and silently lands on the NEXT day, which is how a 10:30 Thursday peak
 * became 02:30 Friday (inside 中秋) during this unit's own tests.
 *
 * The zone is expressed the one way the shared module defines it: `'local'` is the
 * machine's own clock (`clockAt` adds nothing), `Asia/Shanghai` is a fixed +8 with
 * no DST. Rebuilding that offset here — rather than re-deriving the clock — is what
 * keeps this function a single, testable conversion in ONE direction.
 */
function instantOf(clock: Clock, tz: string): Date {
  const [y, m, d] = clock.dateKey.split('-').map(Number)
  if (tz === 'local') return new Date(y, m - 1, d, Math.floor(clock.mins / 60), clock.mins % 60)
  const utcMins = clock.mins - ZONE_OFFSET_MINS
  const shift = Math.floor(utcMins / DAY)
  return new Date(Date.UTC(y, m - 1, d + shift, Math.floor(utcMins / 60) - shift * 24, ((utcMins % 60) + 60) % 60))
}

/**
 * The whole day, as data.
 *
 * `config` is required (not defaulted): every caller already holds one — the
 * shell's merged instance config, or this unit's own `example.stats` — and a
 * silent default here would hide a card that lost its config.
 *
 * `now` is the live-path seam: the card passes the real clock reading, and the
 * function asks the SHARED verdict about that exact instant rather than
 * reconstructing it (a reconstruction is only needed when the clock was pinned by
 * a preview, and `instantOf` does it there). Tests and probes therefore drive the
 * whole card through one honest parameter instead of stubbing the global `Date`.
 */
export function trackDay(clock: Clock, config: ScheduleConfig, now?: Date): DayTrack {
  const at = now ?? instantOf(clock, config.tz)
  // The verdict comes from the shared implementation, asked about THE SAME wall
  // clock the rest of this function reasons about.
  const status = peakStatusNow(at, config)
  const year = yearOf(clock.dateKey) ?? clock.year
  // `peakStatusNow` reports a whole-day reason only when it is off-peak AND a rule
  // (holiday/weekend) applies — so a quiet moment BETWEEN two peak windows stays
  // an ordinary day here, exactly as it is on the 2×2 card.
  const wholeDayOff = !status.peak && status.reasonKey !== undefined
  const blocks = blocksOf(config.windows)
  const current = blockAt(blocks, clock.mins)
  const nextBlock = blocks[blocks.indexOf(current) + 1]
  const nextAt = nextBlock === undefined ? DAY : nextBlock.start
  const stale = config.holidayOff && config.extra.length === 0 && !holidayTableCovers(year)
  // A whole-day-off caption promises what TOMORROW costs, so it needs tomorrow's
  // year covered too (the 2×2 card's stale flag only ever speaks about today).
  const nextConfident = !stale && !(wholeDayOff && config.holidayOff && !holidayTableCovers(tomorrowYear(clock)))
  // The next moment peak can apply, for a whole-day-off day — and the wait until
  // it, measured from the wall clock rather than assembled from the weekday, so
  // the two can never disagree (the first cut derived the wait from a day COUNT
  // and printed 13h 30m for a Saturday at 10:30, where the truth is 37h 30m: the
  // weekend is one and a HALF days long at that point).
  //
  // `days` is the CALENDAR-DAY distance to that day (Sunday → Monday is 1,
  // Saturday → Monday is 2), not the number of hops: the caption uses it to decide
  // between 次日 and a weekday name, and a hop counter gets that wrong for Sunday
  // (the increment crosses the `% 7` boundary, so "1 hop" looked like "tomorrow"
  // while the wait was still 22h 30m from the previous midnight).
  //
  // The caption names the START OF THE FIRST PEAK WINDOW on that day (`09:00`),
  // not the midnight that merely ends the off-peak rule: the card is a timetable,
  // so "when does the expensive rate come back" is the useful answer, and the
  // caption's countdown is to exactly that moment.
  let offUntil: DayTrack['offUntil']
  if (wholeDayOff) {
    const firstStart = config.windows.length === 0
      ? 0
      : Math.min(...config.windows.map((w) => w.start))
    let days = 1
    let nextDow = (clock.dow + 1) % 7
    if (config.weekendOff) {
      while (nextDow === 0 || nextDow === 6) {
        days++
        nextDow = (nextDow + 1) % 7
      }
    }
    offUntil = {
      days,
      dow: nextDow,
      label: fmtMins(firstStart),
      mins: days * DAY + firstStart - clock.mins,
    }
  }
  return {
    dateKey: clock.dateKey,
    clock,
    status,
    wholeDayOff,
    reasonKey: wholeDayOff ? status.reasonKey : undefined,
    rows: boardRows(config.windows, blocks, clock.mins, wholeDayOff ? status.reasonKey : undefined),
    blocks,
    current,
    nextAt,
    nextInMins: nextAt - clock.mins,
    nextTomorrow: nextAt >= DAY,
    offUntil,
    nextConfident,
  }
}

/** The year of the day AFTER `clock`'s day, in that same zone — what a "tomorrow
 *  is off too" promise depends on. Derived from the date key (the calendar the
 *  holiday table itself speaks) rather than from a `Date`, so it is zone-proof. */
function tomorrowYear(clock: Clock): number {
  const [y, m, d] = clock.dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).getUTCFullYear()
}
