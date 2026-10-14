/**
 * 倒计时 / Countdown — ONE timer reading, TWO subjects, and a picker of its own.
 *
 * ── The three views ─────────────────────────────────────────────────────────
 * `pick` (the default subject) is a pomodoro, and it has TWO views:
 *   - the PICKER: a 2×2 grid of duration capsules (1 / 3 / 5 / 10 minutes — the
 *     owner's reference, 2026-10-14). A press dispatches `timer:pick:<minutes>`,
 *     which writes the length AND starts the run in one op; the settings field
 *     自定义分钟数 replaces the longest slot when it is set;
 *   - the RUN view: the stopwatch's dial (`layout: 'dial-head'`) — the remaining
 *     time over the same two round controls — with a back chevron in the TITLE ROW
 *     (`headAction`), which is the owner's ask.
 * Which of the two is drawn is DERIVED, not stored: `startedAt === null &&
 * tmBase === 0` is "nothing has been started", and every op that stops a run
 * (`timer:reset`) leaves exactly that state. A fifth persisted field would have to
 * be kept in sync with those two, and could disagree with them.
 *
 * `next` is read-only: it counts down to the instant the DSH scheduled-task
 * subsystem will next fire, and has no controls at all — nothing about a cron rule
 * is the user's to press here. It is selected in the component config.
 *
 * ── Why `next` reuses the very same `timer` payload ─────────────────────────
 * A countdown to an ABSOLUTE instant is expressed in the reading's own two
 * numbers instead of a third `targetAt` field: `startedAt = <this render's
 * anchor>` and `durationMs = target − anchor`. The renderer computes
 * `durationMs − (now − startedAt)`, which for ANY later `now` is exactly
 * `target − now` — so the figure stays honest however stale this render output
 * is (the rail's idle tick is 30 s, the renderer's own tick is 1 s).
 *
 * The anchor therefore MUST be the same instant the two numbers were derived
 * from: `pinnedInstant(sim.at)` under a preview, `Date.now()` live. Mixing an
 * older anchor with a freshly computed duration would drift by however long
 * the render output sat in the rail.
 *
 * ── The target line's zone ──────────────────────────────────────────────────
 * `目标 HH:MM` is the browser's OWN local zone (`readClock(target, 'local')`).
 * The card deliberately ships no timezone field: the instant it counts to is
 * this user's own pomodoro end, not a zone's wall clock, and a rule's own
 * `timeZone` describes the SCHEDULED task (next mode formats no time at all).
 *
 * ── Why the title stays ─────────────────────────────────────────────────────
 * CARD-TITLE-STANDARD **T2 度量型**: a bare `18:00` names nothing — the title is
 * the only place that says WHICH clock this is (a pomodoro, not a task's elapsed
 * time). On the run view the title row is also the back affordance's home, which is
 * what the owner asked for; on the picker it is the card's only label.
 *
 * ── The two degradation rules (`schedule`) ──────────────────────────────────
 * `stats.schedule` is `null` when no card on this rail waits on the schedule
 * source (the manifest declares `reads: ['schedule']`, so the collector subscribes
 * whenever THIS card is installed), and `{ status: 'unavailable' }` when the
 * deployment carries no schedule surface at all. NEITHER means "you have no tasks"
 * — the card says 定时任务不可用 for both, and only a READY snapshot with no future
 * active entry earns 暂无日程. The preview may PIN that verdict with
 * `sim.scheduleStatus`, which is what keeps BOTH branches reachable offline.
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type {
  ScheduleEntryInfo,
  ScheduleSnapshot,
  TimerControl,
  WidgetRenderMeta,
  WidgetRenderOut,
  WidgetStats,
} from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { pinnedInstant, readClock } from '../../client/lib/clock-face'
import { fmtClock, fmtDuration } from '../../client/lib/format'
import { MAX_PICK_MINUTES, readTimerState, timerElapsedMs } from '../../client/lib/timer-state'

/** The capsule grid's fixed durations, in display order (the owner's reference). */
const FIXED_CAPSULES = [1, 3, 5, 10]

/** `HH:MM` of an instant in the browser's own zone (the target line's format). */
function hhmm(at: number): string {
  const r = readClock(at, 'local')
  return `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`
}

/** The weekday names of a `weekly` rule, in the widget's own short form (一…日,
 *  ISO order: 1 = Monday). A value outside 1–7 prints as its own number rather
 *  than a missing label. */
function weekdayLabel(days: number[] | undefined): string {
  return (days ?? []).map((d) => (d >= 1 && d <= 7 ? t(`card.countdown.dow.${d}`) : String(d))).join('/')
}

/** The rule fields a label is composed from. Deliberately NOT the whole
 *  `ScheduleEntryInfo`: a preview's synthetic entry has a title and an instant
 *  but no stored `id`, and nothing on this card ever shows one. */
type ScheduleRule = Pick<ScheduleEntryInfo, 'kind' | 'everySeconds' | 'time' | 'weekdays' | 'expression'>

/** The short rule description shown beside the task's title. */
function ruleLabel(e: ScheduleRule): string {
  switch (e.kind) {
    case 'every':
      return t('card.countdown.rule.every', { d: fmtDuration((e.everySeconds ?? 0) * 1000) })
    case 'daily':
      return t('card.countdown.rule.daily', { time: (e.time ?? '').slice(0, 5) })
    case 'weekly':
      return t('card.countdown.rule.weekly', { d: weekdayLabel(e.weekdays) })
    case 'cron':
      return t('card.countdown.rule.cron', { expr: e.expression ?? '' })
    default:
      // 'at' / 'after' — a one-shot has no rule to describe.
      return t('card.countdown.rule.once')
  }
}

/** The `kind` a preview may inject, narrowed to the contract's own vocabulary. */
function simKind(v: unknown): ScheduleEntryInfo['kind'] {
  return v === 'at' || v === 'after' || v === 'every' || v === 'daily' || v === 'weekly' || v === 'cron' ? v : 'at'
}

function renderCountdown(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const cfg = stats as Record<string, unknown>
  const sim = meta?.sim

  // The preview's mode wins over the instance config; anything unknown is `pick`.
  const mode = sim?.mode === 'next' ? 'next' : sim?.mode === 'pick' ? 'pick' : cfg.cdMode === 'next' ? 'next' : 'pick'

  // ONE anchor for the whole render: the pinned preview instant, else now.
  const pinned = pinnedInstant(sim?.at)
  const at = pinned ?? Date.now()
  const title = t('card.countdown.title')

  if (mode === 'next') {
    const snap = (stats as { schedule?: ScheduleSnapshot | null }).schedule ?? null
    // The preview may PIN the snapshot's verdict (`sim.scheduleStatus`), so both
    // degradation branches stay reachable offline; otherwise the real snapshot
    // decides, and a MISSING one reads as unavailable (never as "no tasks").
    const simStatus = sim?.scheduleStatus
    const status: ScheduleSnapshot['status'] =
      simStatus === 'ready' || simStatus === 'unavailable' ? simStatus : snap?.status === 'ready' ? 'ready' : 'unavailable'
    const entries =
      status === 'ready' ? (snap?.entries ?? []).filter((e) => e.status === 'active' && e.at > at).sort((a, b) => a.at - b.at) : []

    // The preview's own target OVERRIDES the snapshot's next entry, so a sim
    // step can name a task and an instant without a real schedule behind it.
    const simAt = typeof sim?.nextAt === 'number' && Number.isFinite(sim.nextAt) ? sim.nextAt : null
    const override = simAt !== null
    const rule: ScheduleRule | null = override ? { kind: simKind(sim?.nextKind) } : entries[0] ?? null
    const targetAt = override ? simAt : entries[0]?.at ?? null
    const targetTitle = override ? (typeof sim?.nextTitle === 'string' ? sim.nextTitle : '') : entries[0]?.title ?? ''

    if (rule !== null && targetAt !== null) {
      return {
        title,
        rich: {
          type: 'timer',
          timer: {
            mode: 'countdown',
            ...(pinned === null ? {} : { at: pinned }),
            baseMs: 0,
            // The anchor IS this render's instant — see the module comment.
            startedAt: at,
            durationMs: Math.max(0, targetAt - at),
            // The renderer ellipsizes a long title; the rule rides the same
            // line (trimmed: an unknown rule payload must not dangle a space).
            note: `${targetTitle} · ${ruleLabel(rule)}`.trim(),
          },
        },
      }
    }

    // No upcoming entry: unavailable (no schedule surface / nothing read) and
    // "read it, there is none" are different statements and must not look alike.
    return {
      title,
      rich: {
        type: 'timer',
        timer: {
          mode: 'countdown',
          ...(pinned === null ? {} : { at: pinned }),
          baseMs: 0,
          startedAt: null,
          durationMs: 0,
          tone: 'muted',
          note: status === 'unavailable' ? t('card.countdown.unavailable') : t('card.countdown.noSchedule'),
        },
      },
    }
  }

  // ── pick: the capsule picker, then the dial run view ───────────────────────
  const state = readTimerState(cfg)
  const simBase = typeof sim?.baseMs === 'number' && Number.isFinite(sim.baseMs) ? sim.baseMs : null
  const baseMs = simBase ?? state.baseMs
  const startedAt =
    sim && 'startedAt' in sim
      ? typeof sim.startedAt === 'number' && Number.isFinite(sim.startedAt)
        ? sim.startedAt
        : null
      : state.startedAt
  // The chosen length: written by the picker's own op (`timer:pick:<minutes>`), so it
  // lives in the instance record exactly like the running segment does.
  const minutes = typeof sim?.cdMin === 'number' ? sim.cdMin : Number(cfg.cdMin) || 0
  const durationMs = minutes > 0 ? minutes * 60_000 : 0
  const elapsed = timerElapsedMs({ baseMs, startedAt }, at)
  const remaining = Math.max(0, durationMs - elapsed)
  const running = startedAt !== null
  const done = durationMs > 0 && (remaining <= 0 || sim?.done === true)
  // NOT STARTED = the picker. Derived from the very fields the ops write (see the
  // module header): `timer:reset` clears both, so the card returns to the picker.
  const started = running || baseMs > 0 || sim?.started === true

  if (!started) {
    const rawCustom = typeof sim?.cdCustom === 'string' ? sim.cdCustom : typeof cfg.cdCustom === 'string' ? cfg.cdCustom : ''
    const trimmed = rawCustom.trim()
    const custom = /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : 0
    // The custom length REPLACES the longest fixed slot: the grid is 2×2 (the
    // owner's reference), and a fifth capsule would need a taller grid than a 150px
    // card has room for.
    const slots = custom >= 1 && custom <= MAX_PICK_MINUTES && FIXED_CAPSULES.indexOf(custom) === -1
      ? [1, 3, 5, custom]
      : FIXED_CAPSULES
    return {
      title,
      rich: {
        type: 'timer',
        timer: {
          mode: 'countdown',
          layout: 'picker',
          ...(pinned === null ? {} : { at: pinned }),
          baseMs: 0,
          startedAt: null,
          durationMs: 0,
          capsules: slots.map((m) => ({ id: `timer:pick:${m}`, minutes: m, label: String(m), sub: t('card.countdown.unitMin') })),
        },
      },
    }
  }

  // The RUN view: the stopwatch's dial under the title row, whose chevron is the way
  // back to the picker (`timer:reset` — the same op the ring disc fires).
  const controls: TimerControl[] = [
    { id: 'timer:reset', glyph: 'reset', tone: 'primary', big: true, label: t('card.countdown.reset') },
    ...(done
      ? []
      : [running
        ? { id: 'timer:pause', glyph: 'pause' as const, tone: 'primary' as const, big: true, label: t('card.countdown.pause') }
        : { id: 'timer:start', glyph: 'play' as const, tone: 'primary' as const, big: true, label: t('card.countdown.resume') }]),
  ]
  return {
    title,
    headAction: { id: 'timer:reset', label: t('card.countdown.back') },
    rich: {
      type: 'timer',
      timer: {
        mode: 'countdown',
        layout: 'dial-head',
        ...(pinned === null ? {} : { at: pinned }),
        baseMs,
        startedAt,
        durationMs,
        doneLabel: t('card.countdown.done'),
        ...(done ? { done: true, tone: 'warn' as const } : {}),
        controls,
      },
    },
  }
}

export default defineWidget({
  id: 'countdown',
  name: () => t('widget.countdown.name'),
  desc: () => t('widget.countdown.desc'),
  builtin: true,
  group: 'time',
  sizes: ['2x2'],
  simToggle: () => t('widget.countdown.simToggle'),
  render: renderCountdown,
  configSchema: [
    {
      key: 'cdMode',
      label: () => t('card.countdown.mode'),
      type: 'mode',
      default: 'pick',
      options: [
        ['pick', () => t('card.countdown.mode.pick')],
        ['next', () => t('card.countdown.mode.next')],
      ],
    },
    {
      key: 'cdCustom',
      label: () => t('card.countdown.custom'),
      type: 'text',
      default: '',
      hint: () => t('card.countdown.customHint'),
    },
  ],
  example: {
    // The ready-but-empty snapshot is what makes the no-task step read 暂无日程; the
    // unavailable deployment state rides `sim.scheduleStatus` instead (it is a
    // degradation, not a product state, so it is not a shipped preview step).
    // `sim` MUST be the first step (the preview stepper locates the current state by
    // deep equality, so a sim absent from simSteps makes the first click a no-op).
    stats: { cdMode: 'pick', cdCustom: '', cdMin: '25', tmBase: 0, tmStart: null, schedule: { status: 'ready', entries: [] } },
    sim: { at: 1791943770000, mode: 'pick' },
    simSteps: [
      // 1. the picker (nothing started) — the card's default view;
      { at: 1791943770000, mode: 'pick' },
      // 2. the picker with a custom length: it takes the longest slot (5/10 → 8);
      { at: 1791943770000, mode: 'pick', cdCustom: '8' },
      // 3. a run, paused mid-way: the dial + 继续;
      { at: 1791943770000, mode: 'pick', cdMin: 25, baseMs: 420000, startedAt: null, started: true },
      // 4. a run, counting: the dial + 暂停;
      { at: 1791943770000, mode: 'pick', cdMin: 25, baseMs: 0, startedAt: 1791943620000, started: true },
      // 5. run out — pinned, so the state has an offline sample;
      { at: 1791943770000, mode: 'pick', cdMin: 25, baseMs: 1500000, startedAt: null, started: true, done: true },
      // 6. the next scheduled task, and 7. nothing upcoming;
      { at: 1791943770000, mode: 'next', nextAt: 1791950400000, nextTitle: '每日构建检查', nextKind: 'daily' },
      { at: 1791943770000, mode: 'next' },
    ],
    note: '时长胶囊 / 自定义 8 分钟 / 暂停中 / 计时中 / 时间到 / 下一个定时任务 / 无日程',
  },
})
