/**
 * 日历 (calendar) — the current month, at a glance.
 *
 * WHAT IT IS FOR. The rail already carries cards that reason about DAYS (峰谷定价's
 * holiday table, 用量日历's token heatmap, 额度预测's billing period). This one is
 * the plain reference they all assume the user has: which day of the week is it,
 * how many days are left, and which of them are 休息日. It is deliberately the
 * SHAPE the owner's reference widget has — month caption, weekday header, weeks —
 * drawn in the product's own type ladder and colours.
 *
 * WHICH DAY IS TODAY is the configured ZONE's answer, not the browser's: an
 * instant at 23:30 UTC is already tomorrow in Beijing, and this product's other
 * day-aware cards (heatmap, peak pricing) all reason in a configured zone. So the
 * two are read through the SAME shared function (`lib/clock-face.readClock`), and a
 * card whose zone is Beijing can never badge a different cell than the pricing
 * card calls "today".
 *
 * THE GRID IS THE WIDGET'S (`buildMonthWeeks`), not the renderer's: the offline
 * render snapshot (G4) then verifies the actual month layout — 5-row months,
 * 6-row months, the leading blanks, the today cell — and the renderer stays a
 * layout-only component that cannot drift from it.
 *
 * THE TINT. 'weekend' (the default) needs no table and is true in every country.
 * 'holiday' uses the SHARED 中国法定节假日 table the pricing cards already read
 * (`lib/peak-holidays`), which is why a 国庆 week shows as one blue run — and why
 * the card must say so when the table has no entry for the year being shown
 * (`card.calendar.holidayStale`): a card that silently tinted nothing would look
 * like a month with no holidays, which is a different claim.
 *
 * THE SCHEDULED TASKS (the 2×2's dots and the 2×4's agenda column). DSH's reminder
 * subsystem is read through the client Remote face (see `data/schedule.ts`), and
 * what lands here is: `marks` — the days of the SHOWN month that carry an active
 * task, dotted in the corner of their cell — and, on the wide card, an agenda
 * column of the upcoming ones. The two answer different questions on purpose
 * ("which days this month" vs "what is coming"), so the agenda is NOT restricted to
 * the month on screen.
 *
 * The subsystem is OPTIONAL in a DSH install, so this card owns one degradation
 * rule: when the face is absent (`status: 'unavailable'`) the calendar draws
 * NOTHING schedule-shaped — no dots, no column, no sentence — and the wide card
 * centres its plain month calendar. "No upcoming tasks" (a ready face with an empty
 * list) is the other, honest state, and it says so in the agenda column. A card that
 * showed an empty agenda in the first case would be claiming the user has no
 * reminders, which is not what an absent subsystem means.
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { ScheduleSnapshot, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { buildMonthWeeks, clockZoneOptions, pinnedInstant, readClock, weekdayColumns, type CalendarTint } from '../../client/lib/clock-face'
import { fmtUntil } from '../../client/lib/format'
import { nextActiveEntry } from '../../client/data/schedule'
import { holidayFor, holidayTableCovers } from '../../client/lib/peak-holidays'

/** The weekday headers, indexed the way `Date#getDay` is (0 = Sunday).
 *
 *  Seven LITERAL `t()` calls on purpose: the unit validator finds the keys a unit
 *  asks for by scanning for literal calls, so a computed key would ship
 *  unverified — and a missing key renders as its raw id.
 *
 *  Built PER RENDER, never as a module-level constant. `t()` resolves through the
 *  dictionary the shell installs at boot (`setExtraLocales(WIDGET_LOCALES)`), and a
 *  module-level table is evaluated while the modules are still being imported —
 *  BEFORE that install. Measured 2026-10-14 on the gallery page, whose
 *  `setExtraLocales` runs on first render: the caption and the whole weekday header
 *  printed `card.calendar.weekday.1card.calendar.weekday.2…` instead of 一二三.
 *  Every other unit in this repo calls `t()` inside `render` for the same reason. */
function weekdayNames(): string[] {
  return [
    t('card.calendar.weekday.0'),
    t('card.calendar.weekday.1'),
    t('card.calendar.weekday.2'),
    t('card.calendar.weekday.3'),
    t('card.calendar.weekday.4'),
    t('card.calendar.weekday.5'),
    t('card.calendar.weekday.6'),
  ]
}

/** The twelve month names, January first (the caption's `{month}` slot). Per
 *  render, for the same reason as `weekdayNames`. */
function monthNames(): string[] {
  return [
    t('card.calendar.month.1'),
    t('card.calendar.month.2'),
    t('card.calendar.month.3'),
    t('card.calendar.month.4'),
    t('card.calendar.month.5'),
    t('card.calendar.month.6'),
    t('card.calendar.month.7'),
    t('card.calendar.month.8'),
    t('card.calendar.month.9'),
    t('card.calendar.month.10'),
    t('card.calendar.month.11'),
    t('card.calendar.month.12'),
  ]
}

/** What one calendar instance is configured to be (all fields optional on the wire). */
interface CalendarConfig {
  tz: string
  /** 0 = Sunday, 1 = Monday. */
  weekStart: number
  tint: CalendarTint
  showOther: boolean
}

/** Read the instance config off the merged stats record (missing = default). */
function calendarConfigOf(stats: WidgetStats): CalendarConfig {
  const s = stats as Record<string, unknown>
  return {
    tz: typeof s.tz === 'string' && s.tz.trim() !== '' ? s.tz : 'local',
    // The stored value is the dropdown's own string ('0' / '1'), never a number:
    // every `mode` field in this plugin stores the option's value VERBATIM.
    weekStart: s.weekStart === '0' ? 0 : 1,
    tint: s.tint === 'holiday' ? 'holiday' : s.tint === 'none' ? 'none' : 'weekend',
    showOther: s.showOther === true,
  }
}

function calendarRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const cfg = calendarConfigOf(stats)
  // PREVIEW-ONLY overrides: a step may pin the instant (which month is drawn, and
  // which day is badged) as well as the tint / week start, so the layouts that only
  // occur in some months — a 4-row February, a 6-row August — are reviewable
  // without waiting for the calendar to get there.
  const sim = meta?.sim
  const tz = typeof sim?.tz === 'string' && sim.tz !== '' ? sim.tz : cfg.tz
  const weekStart = sim?.weekStart === '0' ? 0 : sim?.weekStart === '1' ? 1 : cfg.weekStart
  const tint: CalendarTint = sim?.tint === 'holiday' ? 'holiday' : sim?.tint === 'none' ? 'none' : sim?.tint === 'weekend' ? 'weekend' : cfg.tint
  const showOther = typeof sim?.showOther === 'boolean' ? sim.showOther : cfg.showOther
  // The ONE clock read (see the module header): the pinned preview instant, else
  // the real one, resolved in the configured zone.
  const pinned = pinnedInstant(sim?.at)
  const now = pinned ?? Date.now()
  const r = readClock(now, tz)
  const cols = weekdayColumns(weekStart)
  // The holiday table covers whole YEARS (see lib/peak-holidays): a month in a year
  // it does not hold is not tinted, and the card says why instead of showing an
  // ordinary-looking month.
  const holidaysStale = tint === 'holiday' && !holidayTableCovers(r.year)
  const weeks = buildMonthWeeks({
    year: r.year,
    month: r.month,
    weekStart,
    today: { year: r.year, month: r.month, day: r.day },
    showOther,
    tint,
    ...(tint === 'holiday' ? { holiday: (dateKey: string): boolean => holidayFor(dateKey) !== undefined } : {}),
  })
  // ---- The DSH scheduled tasks (see data/schedule.ts) ----
  // `ready` is the switch that separates "no upcoming tasks" from "this deployment
  // has no schedule subsystem at all" — the second one must DEGRADE (no dots, no
  // agenda column, the wide card centres its calendar), never claim an empty
  // agenda. `sim.scheduleStatus` lets a preview reach both branches.
  const snap = (stats as { schedule?: ScheduleSnapshot | null }).schedule ?? null
  const scheduleReady = sim?.scheduleStatus === 'unavailable'
    ? false
    : sim?.scheduleStatus === 'ready' ? true : snap?.status === 'ready'
  const entries = scheduleReady && snap !== null ? snap.entries.filter((e) => e.status === 'active') : []
  // The DOTS: days of the SHOWN month that carry a task, read in the CARD's zone —
  // the same clock the today badge comes from, so a task at 23:30 UTC cannot be
  // dotted on one cell while the badge calls another day "today".
  const marks: number[] = []
  if (entries.length > 0) {
    const seen = new Set<number>()
    for (const entry of entries) {
      const when = readClock(entry.at, tz)
      if (when.year !== r.year || when.month !== r.month || seen.has(when.day)) continue
      seen.add(when.day)
      marks.push(when.day)
    }
    marks.sort((a, b) => a - b)
  }
  const next = nextActiveEntry(entries, now)
  // The 2×4 AGENDA column: every upcoming task (not only this month's — the column
  // answers "what is coming", the dots answer "which days of THIS month"), soonest
  // first, capped well above what fits so the renderer's own capacity decides.
  const agenda = scheduleReady
    ? entries.filter((e) => e.at > now).sort((a, b) => a.at - b.at).slice(0, 12).map((entry) => ({
      when: agendaWhen(entry.at, r, tz),
      title: entry.title,
    }))
    : undefined
  const month = monthNames()[r.month - 1]
  const weekday = weekdayNames()
  // Hover text: the provenance the tile has no room for — the stale holiday table
  // and/or the next scheduled task with its remaining time.
  const hints = [
    ...(holidaysStale ? [t('card.calendar.holidayStale', { y: r.year })] : []),
    ...(next === null ? [] : [t('card.calendar.nextHint', { title: next.title, left: fmtUntil(next.at, now) })]),
  ]
  const agendaFields = meta?.size === '2x4' && scheduleReady
    ? {
      agenda,
      agendaLabel: t('card.calendar.agenda'),
      agendaEmpty: t('card.calendar.agendaEmpty'),
    }
    : {}
  return {
    // NO TITLE (see docs/design/CARD-TITLE-STANDARD.md, T1): the month caption inside
    // the grid is the card's identity, and a second "日历" strip above it was pure
    // height. An empty title is what tells `CardBody` to drop the head row entirely.
    title: '',
    rich: {
      type: 'calendar',
      calendar: {
        label: t('card.calendar.monthLabel', { y: r.year, month: month ?? String(r.month) }),
        weekdays: cols.map((dow) => weekday[dow] ?? ''),
        weeks,
        ...(marks.length === 0 ? {} : { marks }),
        ...(hints.length === 0 ? {} : { hint: hints.join(' · ') }),
        ...agendaFields,
      },
    },
  }
}

/** One agenda row's left column: `今天 09:00` for a task later TODAY (in the card's
 *  zone), `10/15 09:00` otherwise.
 *
 *  Composed HERE, like every other string on the card: the renderer holds no
 *  dictionary and no clock. The zone is the calendar's own — an agenda row that
 *  disagreed with the dotted day next to it would be the same bug as a badge and a
 *  task landing on different days. */
function agendaWhen(at: number, today: ReturnType<typeof readClock>, tz: string): string {
  const when = readClock(at, tz)
  const time = `${String(when.hour).padStart(2, '0')}:${String(when.minute).padStart(2, '0')}`
  if (when.year === today.year && when.month === today.month && when.day === today.day) {
    return t('card.calendar.whenToday', { time })
  }
  return t('card.calendar.whenDate', { m: when.month, d: when.day, time })
}

export default defineWidget({
  id: 'calendar',
  name: () => t('widget.calendar.name'),
  desc: () => t('widget.calendar.desc'),
  builtin: true,
  group: 'calendar',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2', '2x4'],
  render: calendarRender,
  configSchema: [
    { key: 'tz', label: () => t('card.calendar.timeZone'), type: 'mode', default: 'local', options: clockZoneOptions() },
    { key: 'weekStart', label: () => t('card.calendar.weekStart'), type: 'mode', default: '1', options: [['1', () => t('card.calendar.weekStartMonday')], ['0', () => t('card.calendar.weekStartSunday')]] },
    { key: 'tint', label: () => t('card.calendar.tint'), type: 'mode', default: 'weekend', options: [['weekend', () => t('card.calendar.tintWeekend')], ['holiday', () => t('card.calendar.tintHoliday')], ['none', () => t('card.calendar.tintNone')]] },
    { key: 'showOther', label: () => t('card.calendar.showOther'), type: 'toggle', default: false },
  ],
  // Widget-owned preview data (see WidgetExample): the four steps cover the month
  // layouts and the tint branches a live card reaches only by waiting —
  //  1. October 2026, the owner's reference month: 5 rows, 14 badged, and the
  //     国庆 week (10/1–10/7) as one blue run under the HOLIDAY tint;
  //  2. February 2026: the SHORTEST layout (28 days starting on a Sunday = exactly
  //     4 rows), where a row count assumed to be 5 would leave a blank line;
  //  3. August 2026: the LONGEST layout (6 rows), the case that overflows a tile;
  //  4. January 2027 under the holiday tint: a year the shared table does not
  //     cover, i.e. the stale-hint branch (the tint falls back to nothing and the
  //     card says so on hover).
  // `sim` MUST be the first step: the preview stepper locates the current state by
  // deep equality, so a sim absent from simSteps makes the first click a no-op.
  example: {
    // The scheduled tasks the previews read: three active (today 18:00, the next day
    // 12:00, three days out) and one INACTIVE inside the same month, which is what
    // proves the filter — an inactive task must be neither dotted nor listed.
    // Instants are pinned, so every step below is reproducible.
    stats: {
      schedule: {
        status: 'ready',
        entries: [
          { id: 'preview-1', title: '每日构建检查', at: 1791972000000, status: 'active', kind: 'daily', time: '18:00:00', timeZone: 'Asia/Shanghai' },
          { id: 'preview-2', title: '周报汇总', at: 1792036800000, status: 'active', kind: 'weekly', time: '12:00:00', weekdays: [4], timeZone: 'Asia/Shanghai' },
          { id: 'preview-3', title: '额度巡检', at: 1792209600000, status: 'active', kind: 'every', everySeconds: 3600 },
          { id: 'preview-4', title: '月度账单（已停用）', at: 1792468800000, status: 'inactive', kind: 'at' },
        ],
      },
    },
    sim: { at: 1791950400000, tz: 'Asia/Shanghai', tint: 'holiday' },
    simSteps: [
      // 1. October 2026, the owner's reference month: 5 rows, 14 badged, the 国庆 week
      //    (10/1–10/7) as one blue run under the HOLIDAY tint, and the schedule side:
      //    dots on 14/15/17 and an agenda whose first row is later TODAY.
      { at: 1791950400000, tz: 'Asia/Shanghai', tint: 'holiday' },
      // 2. February 2026: the SHORTEST layout (28 days starting on a Sunday = exactly
      //    4 rows), where a row count assumed to be 5 would leave a blank line. No
      //    marks (the tasks are months away) while the agenda still lists them — the
      //    two readings are deliberately not the same question.
      { at: 1771128000000, tz: 'Asia/Shanghai', tint: 'weekend' },
      // 3. August 2026: the LONGEST layout (6 rows), the case that overflows a tile.
      { at: 1788148800000, tz: 'Asia/Shanghai', tint: 'weekend' },
      // 4. January 2027 under the holiday tint: a year the shared table does not
      //    cover, i.e. the stale-hint branch.
      { at: 1799985600000, tz: 'Asia/Shanghai', tint: 'holiday' },
      // 5. The DEGRADATION: a deployment with no schedule subsystem. No dots, no
      //    agenda column (the wide card centres its calendar) — the branch that must
      //    never be confused with "you have no reminders".
      { at: 1791950400000, tz: 'Asia/Shanghai', tint: 'holiday', scheduleStatus: 'unavailable' },
    ],
  },
})
