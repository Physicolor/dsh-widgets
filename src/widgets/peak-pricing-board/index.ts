import { defineWidget } from '../../client/lib/contract/helpers'
import type { ConfigField, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { HOLIDAY_TABLE_SOURCE } from '../../client/lib/peak-holidays'
import { fmtMins, type Clock } from '../../client/lib/peak-schedule'
import { DEFAULT_BILLING_WINDOWS, clockInZone, fmtRemaining, resolveScheduleConfig, trackDay } from './schedule'

/**
 * 峰谷时段表 — the 2×2 峰谷定价 card, widened.
 *
 * The 2×2 answers ONE question — 现在是峰还是谷 — and answers it well (a big
 * CHEAP/EXPENSIVE figure with a pulsing red escalation). What it cannot say is the
 * thing you actually plan around: how the REST of today bills, where the current
 * stretch ENDS, and how long is left of it. That is a timetable, and a timetable
 * needs width — so this card is the same rule at 2×4:
 *
 *   row 1  ▸ 峰谷时段表                     (blue title)
 *   row 2  ▸ CHEAP                          (20px figure — the live state, the
 *                                            same word the 2×2 card prints; while
 *                                            peak it is the error RED and BREATHES)
 *   row 3  ▸ 下一段 09:00 · 还有 8h 30m     (grey caption — the countdown)
 *   foot   ▸ ──────────────────────────
 *            09:00–12:00          高峰 (red)  a configured window
 *            14:00–18:00          高峰 (red)  the other one
 *            18:00–09:00          低谷 (blue) everything else, lit while live
 *
 * ONE VOCABULARY, TWO ROLES (aligned with the 2×2 card, 2026-09-28): the price STATE
 * is CHEAP / EXPENSIVE — the 20px figure, printed by both cards with the same two
 * literal words — while 高峰 / 低谷 are the PERIOD names, used by this card's
 * timetable rows and by the 2×2 card's own captions (`全天低谷`, `恢复高峰`). The
 * figure therefore matches the narrow card character-for-character; see the figure's
 * own comment for why the state words stay literal.
 *
 * THE ALARM IS THE 2×2 CARD'S (owner's request, 2026-09-28): EXPENSIVE and the 高峰
 * rows are the error red, and the figure breathes. Both come from fields the contract
 * already has (`valueTone` / `valuePulse` on the figure, `tone` on a row) — nothing
 * was added to the shared layer. A row's 高峰 word cannot breathe yet because the
 * `breakdown` renderer paints its values with inline styles and no class hook; that
 * needs one optional field in the shared layer (`pulse` on a breakdown row), and the
 * unit README records the exact patch. Until then the row red is static and the
 * breathe lives on the figure, which is where the 2×2 card puts it too.
 *
 * THE RULE IS IMPORTED, NOT RE-DECLARED. Peak windows, the zone clock, the
 * weekend/holiday switches and the 2026 holiday table all come from the 2×2 unit
 * (`../peak-pricing`): `parsePeakWindows` / `clockAt` / `peakConfigOf` /
 * `peakStatusNow` and its `holidays` module are read-only imports, so the two
 * cards can never disagree about what counts as peak. A consequence worth
 * stating: the timetable is capped at the TWO windows that parser allows — which
 * is exactly the row budget the card's own foot has.
 *
 * THE CLOCK IS READ, NOT MUTATED. `Date` is the card's only live input (no host
 * route, no async source, no skeleton — see the manifest), so the same stats
 * record renders identically for the rail, the config preview and the market. The
 * tricky part is the PREVIEW: a mock must show a fixed moment on any machine in
 * any timezone, so `meta.sim.when` pins a zone-local wall clock and `example.simSteps`
 * walks the four states on click (see the unit README).
 */

/** The sim field that pins the zone-local wall clock for a deterministic preview. */
const SIM_WHEN = 'when'

/** `2026-09-24T10:30` → the `Clock` of that minute, or null for a malformed value
 *  (the card then falls back to the REAL clock rather than rendering a nonsense
 *  day).
 *
 *  The string is a WALL CLOCK IN THE CARD'S ZONE, not an instant: the sim's whole
 *  job is to make the preview deterministic, so `2026-09-24T10:30` must mean
 *  ten-thirty on the card whether the reviewer's machine sits in Beijing or in
 *  Berlin. The clock is therefore BUILT from the parsed fields — `clockAt` is
 *  deliberately NOT run a second time here (it would treat the wall clock as an
 *  instant and land the card on the wrong day) — while `dow` comes from the
 *  calendar date, which the calendar answers on its own. */
function simClock(when: string): Clock | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(when)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  return {
    year,
    dow: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    mins: hour * 60 + minute,
    dateKey: `${m[1]}-${m[2]}-${m[3]}`,
  }
}

/**
 * The 2×2 card's holiday/weekend reason keys → THIS unit's own keys.
 *
 * The verdict (`peakStatusNow`) hands back a key that belongs to the narrow card's
 * dictionary, e.g. `card.peak.holiday.spring`. Two cards may not share a key: the
 * registry merges every unit's locale map, so a key declared by both is one key
 * that either card can silently change for the other. The narrow card keeps its
 * keys; this card ships its own — same names, its own namespace — and maps the
 * verdict through the table below. Built by concatenation so the shared keys are
 * never written as literals in this file (a literal `card.peak.*` string in a unit
 * whose id is `peak-pricing-board` would also misreport as this card's own key).
 */
const REASON_LOCAL: Record<string, string> = (() => {
  const shared = `card.${'peak'}`
  const map: Record<string, string> = { [`${shared}.weekend`]: 'card.peak-pricing-board.weekend' }
  for (const name of ['newyear', 'spring', 'qingming', 'labour', 'dragon', 'midautumn', 'national', 'custom']) {
    map[`${shared}.holiday.${name}`] = `card.peak-pricing-board.holiday.${name}`
  }
  return map
})()

/**
 * Weekday names, indexed by `Date#getDay` (0 = Sunday), resolved AT RENDER TIME.
 *
 * Two deliberate choices: the keys are written out one per line rather than as
 * `t('…dow.' + n)` (the unit validator only sees literal `t('…')` calls, so a
 * concatenated key would ship without locale coverage ever being checked), and the
 * array is built inside this function rather than at module scope (a module-scope
 * `t()` would freeze the FIRST resolved language and stop following
 * Settings → Language, which is the whole reason the contract makes name/desc
 * thunks).
 */
function dowNames(): string[] {
  return [
    t('card.peak-pricing-board.dow.0'),
    t('card.peak-pricing-board.dow.1'),
    t('card.peak-pricing-board.dow.2'),
    t('card.peak-pricing-board.dow.3'),
    t('card.peak-pricing-board.dow.4'),
    t('card.peak-pricing-board.dow.5'),
    t('card.peak-pricing-board.dow.6'),
  ]
}

function peakBoardRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  // The instance's merged config record IS the stats record (the shell folds
  // cardConfigs into it), which is the same record `peakConfigOf` reads — so
  // `peakWindows` / `weekendOff` / `holidayOff` / `timeZone` / `extraHolidays`
  // keep their single meaning, and `billingWindows` is this card's own override.
  const cfg = resolveScheduleConfig(stats as unknown as Record<string, unknown>)
  const sim = meta?.sim
  const when = sim && typeof sim[SIM_WHEN] === 'string' ? (sim[SIM_WHEN] as string) : null
  const pinned = when === null ? null : simClock(when)
  // The clock: the pinned preview minute, or the REAL machine clock read in the
  // configured zone (Beijing at a fixed +8, or the browser's own zone). The live
  // reading is handed through as the instant as well, so the shared verdict is
  // asked about the very same moment the timetable is built from.
  const now = new Date()
  const track = trackDay(pinned ?? clockInZone(now, cfg.tz), cfg, pinned === null ? now : undefined)

  // The figure is the live STATE, in the SAME TWO WORDS the 2×2 card prints (its
  // `value: peak ? 'EXPENSIVE' : 'CHEAP'`), so a rail holding both cards reads as one
  // product. The split between the two vocabularies is the 2×2 card's own, not a new
  // one:
  //   - CHEAP / EXPENSIVE = the PRICE STATE (the 20px figure on both cards);
  //   - 高峰 / 低谷        = the PERIOD (this card's timetable rows, and the 2×2
  //                         card's own strings: `全天低谷`, `恢复高峰`).
  // The 2×2 card already pairs an English CHEAP figure with Chinese captions, so the
  // mix is the shipped look rather than a compromise — and the figure is never
  // absent, because the clock always exists (this card has no null branch at all).
  //
  // They are LITERALS because the 2×2 card prints literals: the agreement has to be
  // character-for-character, and localizing only one of the two cards is exactly the
  // drift this alignment exists to prevent. If that card's figure is ever localized,
  // both change together.
  const big = track.status.peak ? 'EXPENSIVE' : 'CHEAP'
  // The right slot of the status row names the day's SHAPE: the whole-day reason on
  // a holiday/weekend (周末 / 中秋节 …), otherwise where the live stretch ends.
  const small = track.wholeDayOff && track.reasonKey !== undefined
    ? t(REASON_LOCAL[track.reasonKey] ?? track.reasonKey)
    : `${t('card.peak-pricing-board.until')} ${fmtMins(track.nextAt)}`

  // The countdown — the number the narrow card cannot give. Suppressed when the
  // holiday table cannot vouch for what follows (see `nextConfident`), where the
  // card explains itself on hover instead of promising a price it cannot know.
  let legend: string | undefined
  if (track.nextConfident) {
    if (track.wholeDayOff) {
      const off = track.offUntil
      // The caption names the DAY as well as the clock, because the whole-day-off
      // wait is usually a day and a half long (a Saturday morning waits for Monday):
      // 次日 when it really is the next calendar day, the weekday name otherwise.
      // Both the label and the countdown point at the same moment — the start of
      // that day's first peak window.
      const day = off === undefined
        ? ''
        : off.days === 1
          ? `${t('card.peak-pricing-board.nextDayShort')} `
          : `${dowNames()[off.dow] ?? ''} `
      legend = off === undefined
        ? undefined
        : `${t('card.peak-pricing-board.nextOff')} ${day}${off.label} · ${t('card.peak-pricing-board.left', { d: fmtRemaining(off.mins) })}`
    } else if (track.nextTomorrow) {
      // Nothing else flips today: the next change is tomorrow's first window.
      legend = `${t('card.peak-pricing-board.nextDay')} ${fmtMins(track.nextAt)} · ${t('card.peak-pricing-board.left', { d: fmtRemaining(track.nextInMins) })}`
    } else {
      legend = `${t('card.peak-pricing-board.next')} ${fmtMins(track.nextAt)} · ${t('card.peak-pricing-board.left', { d: fmtRemaining(track.nextInMins) })}`
    }
  }

  // One row per configured window, then the off-peak remainder.
  //
  // TONE SEMANTICS, stated because the contract leaves them to the widget — and they
  // changed on the owner's request (2026-09-28), so the rule is now: a peak window's
  // own 高峰 word is RED whenever that window exists, because it names the expensive
  // rate; the off-peak remainder wears the brand blue only while it is the row
  // billing right now. On a whole-day-off day the windows are SUSPENDED, so they go
  // grey (`muted`) instead — red there would advertise a price that is not being
  // charged today, and the remainder row (blue, carrying 低谷 · 周末/中秋节) is what
  // bills.
  //
  // The trade-off this replaces: the live row used to be blue unconditionally, which
  // made a peak row blue in the one state that deserves alarm. Which peak window is
  // live is still readable — `small` prints 本段至 12:00 and `legend` counts down to
  // the next flip — while the red pulse on the figure carries the alarm.
  const breakdown = track.rows.map((row) => ({
    label: row.range,
    value: row.dayOffKey !== undefined
      ? `${t('card.peak-pricing-board.off')} · ${t(REASON_LOCAL[row.dayOffKey] ?? row.dayOffKey)}`
      : row.peak ? t('card.peak-pricing-board.peak') : t('card.peak-pricing-board.off'),
    tone: track.wholeDayOff && row.peak
      ? ('muted' as const)
      : row.peak
        ? ('danger' as const)
        : row.now ? ('primary' as const) : undefined,
  }))

  return {
    title: t('card.peak-pricing-board.title'),
    headAfter: { big, small },
    legend,
    // THE ESCALATION, identical to the 2×2 card's (owner's request, 2026-09-28):
    // while a peak window is live the 20px figure is the error red and BREATHES.
    // `CardBody`'s `figureEl` reads exactly these two fields and tags `headAfter.big`
    // with `dsx-stats-card-value dsx-value-pulse` — the classes the narrow card's
    // EXPENSIVE value wears (see primitives.module.css: the 1.6s opacity breathe,
    // disabled under prefers-reduced-motion). No second mechanism was added, and the
    // card FRAME stays clean — no edge glow, no shadow — which is the 2×2 card's own
    // rule and the reason two cards on one rule look like one product.
    valueTone: track.status.peak ? 'danger' : undefined,
    valuePulse: track.status.peak,
    // The rows are the card's floor; the head keeps its ladder above them.
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown },
    cardHint: track.nextConfident
      ? undefined
      : t('card.peak-pricing-board.staleHint', { year: track.dateKey.slice(0, 4), source: HOLIDAY_TABLE_SOURCE }),
  }
}

export default defineWidget({
  id: 'peak-pricing-board',
  name: () => t('widget.peak-pricing-board.name'),
  desc: () => t('widget.peak-pricing-board.desc'),
  builtin: false,
  group: 'pricing',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x4'],
  simToggle: () => t('card.peak-pricing-board.simToggle'),
  render: peakBoardRender,
  configSchema: [
    // `peakWindows` / `weekendOff` / `holidayOff` / `timeZone` / `extraHolidays`
    // are the 2×2 card's own keys AND defaults, deliberately identical — the two
    // cards are two views of ONE pricing rule, and the switches have to mean the
    // same thing on both. `billingWindows` is this card's own OPTIONAL override so
    // the wide timetable can differ without touching the narrow card's verdict.
    // (Labels are this unit's own keys for the same reason the reason-keys are:
    // a key may not be declared by two units.)
    { key: 'billingWindows', label: () => t('config.peak-pricing-board.windows'), type: 'text', default: '' },
    { key: 'peakWindows', label: () => t('config.peak-pricing-board.peakWindows'), type: 'text', default: DEFAULT_BILLING_WINDOWS },
    { key: 'weekendOff', label: () => t('config.peak-pricing-board.weekendOff'), type: 'toggle', default: true },
    { key: 'holidayOff', label: () => t('config.peak-pricing-board.holidayOff'), type: 'toggle', default: true },
    { key: 'timeZone', label: () => t('config.peak-pricing-board.timeZone'), type: 'mode', default: 'Asia/Shanghai', options: [['Asia/Shanghai', () => t('config.peak-pricing-board.tz.beijing')], ['local', () => t('config.peak-pricing-board.tz.local')]] },
    { key: 'extraHolidays', label: () => t('config.peak-pricing-board.extraHolidays'), type: 'text', default: '' },
  ] as ConfigField[],
  // Market / 组件配置 preview: the example config is the interesting one — a
  // timetable override plus one extra off-peak day.
  //
  // `sim.when` pins a WALL CLOCK (see simClock), and because it is a STRING rather
  // than a boolean, the shell's single-boolean flip cannot move it — the preview
  // then does nothing on click. `simSteps` is therefore not decoration but the
  // mechanism: `nextSim` cycles the listed states, and the 2×2 card walks its four
  // preview states the same way. The four steps here are the four shapes this card
  // has — peak → the 12:00–14:00 gap (no peak row is live; the remainder row carries
  // the highlight) → a Chinese public holiday → an ordinary weekend.
  //
  // Dated on purpose, exactly as the 2×2 card's states are: 2026-09-26 sits inside
  // the shipped 中秋 range and 2026-10-10 is the first ordinary Saturday after 国庆,
  // so every step renders the same card on any machine, in any timezone, in any real
  // month. Step 0 MUST be byte-identical to `sim` (nextSim finds the current state by
  // deep-equality, and a mismatch would make the first click a no-op).
  example: {
    stats: { billingWindows: DEFAULT_BILLING_WINDOWS, extraHolidays: '2027-01-01' },
    sim: { when: '2026-09-24T10:30' },
    simSteps: [
      { when: '2026-09-24T10:30' },
      { when: '2026-09-24T13:00' },
      { when: '2026-09-26T10:30' },
      { when: '2026-10-10T10:30' },
    ],
  },
})
