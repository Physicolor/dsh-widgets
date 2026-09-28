/**
 * 窗口预测 (window-forecast) — will the 5h / weekly Command Code window run OUT
 * before it resets?
 *
 * The rest of the coding-plan family answers 「用了多少」 (额度管理 projects the
 * MONTH, 窗口 draws the three used-percents). None of them answers the question a
 * long task actually dies on: 「还有 40 分钟就重置了，可按现在的速度 20 分钟后就打满」.
 *
 *   「窗口预测」                    blue title (13px)
 *   「118%」                        headAfter.big — the WORSE of the two windows'
 *                                   projected occupancy at its reset (20px)
 *   「5h · 预计 1h14m 后打满」        legend — WHICH window that figure is, and
 *                                   its verdict (grey 10px)
 *   ──────────────────────────────  hairline, then the three rows on the floor
 *   「5h              118% 预计」
 *   「周               63% 预计」
 *   「剩余重置           2h0m」      the NEARER of the two resets
 *
 * WHAT IS PROJECTED (`projectWindow`, pure + exported so it can be reviewed):
 *   The provider reports `used` / `cap` and the wall-clock `resetAt` per window,
 *   so the window's natural start is `resetAt − length` (5h / 7d — the provider's
 *   OWN definition, never "since this session started", which is a different and
 *   unverifiable clock) and the pace is `used ÷ elapsed` over that span:
 *
 *     fiveHour: used 6, cap 10, resets in 1h  → start 4h ago, rate 1.5/h
 *               projected = 6 + 1.5×1 = 7.5 → 75% ⇒ 重置前不会打满
 *               time to cap = (10 − 6) ÷ 1.5 = 2h40m > 1h left
 *     weekly:   used 30, cap 40, resets in 2d → start 5d ago, rate 6/day
 *               projected = 30 + 6×2 = 42 → 105% ⇒ 会打满
 *               time to cap = (40 − 30) ÷ 6 = 1d16h < 2d left
 *   ⇒ head figure 105% (the worse of the two), legend 「周 · 预计 1d16h 后打满」,
 *     rows 75% / 105%. Every number on the card comes out of that one function.
 *
 * DEGRADATION — 「宁可 — 不猜」, the family's rule. A window whose reading cannot
 * support a projection prints `—` muted and never borrows another window's pace:
 *   - `used` / `cap` / `resetAt` missing or non-finite, or `cap <= 0`;
 *   - `resetAt` in the past — a stale payload; the window has already rolled and
 *     extrapolating to a past instant is meaningless;
 *   - `elapsed <= 0` (the reset is further out than the window is long: a clock or
 *     timezone artefact) — the spec's own line — and `elapsed < MIN_ELAPSED_MS`,
 *     its near-degenerate case: extrapolating the first seconds of a fresh window
 *     multiplies one call's cost into a four-digit percent.
 *   Both windows unprojectable ⇒ `render` returns null (the card has nothing to
 *   say). An absent payload with a recorded host error also returns null: 「未配置
 *   Command Code」 is cc-whoami's and 额度管理's sentence, and a third copy of it
 *   would add no fact (SPECS §7's dedup rule).
 *
 * TONE DIRECTION — this is OCCUPANCY, so HIGH IS BAD (danger / warn) — the
 * OPPOSITE of the cache hit rate. Thresholds: `> 1.0` danger (the cap really is
 * reached before the reset) and `> 0.9` warn. The 10% band is deliberate: the
 * projection is a straight-line extrapolation, and one burst of long turns eats
 * 10% of a window, so a window at 91% "in theory safe" deserves amber before it
 * turns red. The FIGURE carries the same two rungs (`valueTone` gained `warn` with
 * this batch), so the head never reads calmer than the rows below it — and the
 * renderer still never guesses a tone from a ratio: the widget decides.
 *
 * SCOPE — `stats.commandCode.credits.windowLimits` only, the FOURTH official
 * slice of ONE Command Code account (the payload's first pool member). `used` /
 * `cap` are Command Code CREDITS, never tokens. `usageData` (OpenCode's own
 * rolling / weekly / monthly percentages) is deliberately NOT mixed in: the two
 * are different accounts in different units, and blending them would print a
 * precise-looking number that is exactly wrong at the moment the card matters.
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, CommandCodeWindow, WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'

/** The window lengths the provider's reset implies (`resetAt − length` = the
 *  window's natural start): five hours and one week. Both are the provider's own
 *  definitions, confirmed by the caps it reports (the 5h cap is 20% of the
 *  monthly allowance, the weekly cap 50%). */
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const FIVE_HOUR_MS = 5 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

/** The `—` a window with no usable reading prints. Never a fabricated 0: 「没有读数」
 *  and 「读数是 0」 are two different statements. */
const DASH = '—'

/** Shortest elapsed span a projection may be built on. The spec's own
 *  `elapsed <= 0` line is the degenerate case of 「窗口刚开始」; a minute is the
 *  shortest span in which a rate is not simply one call's cost × 60 (measured
 *  reasoning, not a tuned number: at 5 seconds one credit projects to 720/hour,
 *  i.e. 1 400% of a 5h window for a single request). Below it the window prints
 *  `—` muted, exactly like an unreadable one. */
const MIN_ELAPSED_MS = 60_000

/** Occupancy thresholds (see the tone note in the header): the cap is reached
 *  before the reset above 1.0, and 0.9 keeps the straight-line margin. */
const DANGER_RATIO = 1
const WARN_RATIO = 0.9

/** The preview's second clock (a preview-only constant, see `example`): read the
 *  same payload 45 minutes later and the 5h window has settled from 118% to 94%
 *  — the amber band just under the cap, the one state whose tone is neither red
 *  nor absent. */
const PREVIEW_WARN_AHEAD_MS = 45 * 60_000

export type WindowKey = 'fiveHour' | 'weekly'

/** What one window's reading supports. `null` = not projectable (print `—`). */
export interface WindowForecast {
  /** projected ÷ cap at the reset; `> 1` ⇒ the cap is reached first. */
  ratio: number
  /** ms from `now` until the cap is reached (0 = already at / over it). */
  fillMs: number
  /** ms from `now` to the window's reset (always > 0 when a forecast exists —
   *  a reset in the past is one of the unprojectable cases). */
  resetMs: number
}

/**
 * Project ONE window to its reset, or `null` when the reading cannot carry a
 * projection (every case is listed in the header). Pure: the caller passes the
 * clock, so the arithmetic is reviewable without a session.
 *
 * @param win - the window slice (`used` / `cap` / `resetAt`, epoch ms).
 * @param lengthMs - the window's own length (5h / 7d).
 * @param now - epoch ms of the reading.
 */
export function projectWindow(win: CommandCodeWindow | null | undefined, lengthMs: number, now: number): WindowForecast | null {
  const used = win?.used
  const cap = win?.cap
  const resetAt = win?.resetAt
  if (typeof used !== 'number' || !Number.isFinite(used) || used < 0) return null
  if (typeof cap !== 'number' || !Number.isFinite(cap) || cap <= 0) return null
  if (typeof resetAt !== 'number' || !Number.isFinite(resetAt)) return null
  const left = resetAt - now
  // A reset at or behind the reading is a STALE payload: the window has rolled,
  // and extrapolating towards a past instant would print a shrinking percentage
  // for a window that is in fact brand new.
  if (left <= 0) return null
  const elapsed = now - (resetAt - lengthMs)
  if (elapsed < MIN_ELAPSED_MS) return null
  // `max(1, …)` is the spec's guard against the zero-length span; elapsed is a
  // real millisecond count by now, so it is only belt-and-braces.
  const rate = used / Math.max(1, elapsed)
  const projected = used + rate * left
  return {
    ratio: projected / cap,
    // Already at or over the cap → 0 (it is full NOW); the negative arithmetic
    // value is never printed.
    fillMs: rate > 0 ? Math.max(0, (cap - used) / rate) : Number.POSITIVE_INFINITY,
    resetMs: left,
  }
}

/**
 * The card's duration ladder for its two countdowns (time-to-full, time-to-reset).
 *
 * Under an hour it IS the shared `fmtDuration` (`45.2s` / `12m30s`). Above it, the
 * shared formatter only has minutes and seconds — a 2h11m wait prints `131m0s`
 * and a weekly window `10080m0s`, eight characters that overrun the ~126px grey
 * legend line and ellipsize it, which reads as a truncated error rather than a
 * countdown. So the two upper rungs (`2h11m`, `6d23h`) are added HERE, in this
 * unit, instead of changing a formatter every other card reads. Both of this
 * card's durations go through this one function, so their units always agree.
 */
export function fmtSpan(ms: number): string {
  if (!Number.isFinite(ms)) return DASH
  const v = Math.max(0, ms)
  // The rung is chosen on the value ROUNDED TO THE SECOND, because that is the
  // precision the rungs print at: a reset 3 days and 0.4 seconds away floored to
  // `2d23h`, and one 1 hour and 0.4 seconds away printed `60m0s` (fmtDuration
  // rounds it up to a full minute). Rounding first makes the ladder monotone — no
  // duration can print as the rung below it.
  const rounded = Math.round(v / 1000) * 1000
  // Under an hour the shared formatter keeps its own precision (`45.2s`), which
  // rounding to whole seconds would throw away.
  if (rounded < HOUR_MS) return fmtDuration(v)
  if (rounded < DAY_MS) return `${Math.floor(rounded / HOUR_MS)}h${Math.floor((rounded % HOUR_MS) / 60_000)}m`
  return `${Math.floor(rounded / DAY_MS)}d${Math.floor((rounded % DAY_MS) / HOUR_MS)}h`
}

/** Occupancy tone: high is bad, and only a real overrun is red (see the header). */
function ratioTone(ratio: number): 'danger' | 'warn' | undefined {
  if (ratio > DANGER_RATIO) return 'danger'
  if (ratio > WARN_RATIO) return 'warn'
  return undefined
}

/** The window's name as the card prints it (the legend prefix and the row label). */
function windowName(key: WindowKey): string {
  return key === 'fiveHour' ? t('card.window-forecast.win5h') : t('card.window-forecast.winWeekly')
}

function windowForecastRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const limits = stats.commandCode?.credits?.windowLimits ?? null
  // The ONE clock read. The preview may shift it (`sim.aheadMs`) so the LATER
  // states can be reviewed without waiting for a real window to move; the rail
  // never passes it, so a live card always reads the wall clock.
  const ahead = typeof meta?.sim?.aheadMs === 'number' && Number.isFinite(meta.sim.aheadMs) ? meta.sim.aheadMs : 0
  const at = Date.now() + ahead
  const fiveHour = projectWindow(limits?.fiveHour, FIVE_HOUR_MS, at)
  const weekly = projectWindow(limits?.weekly, WEEK_MS, at)
  const candidates: Array<{ key: WindowKey; f: WindowForecast }> = []
  if (fiveHour !== null) candidates.push({ key: 'fiveHour', f: fiveHour })
  if (weekly !== null) candidates.push({ key: 'weekly', f: weekly })
  // Neither window can be projected (or there is no payload at all): the card has
  // nothing to say, and an empty tile is the honest answer. `reduce` on an empty
  // list would throw, so this gate is also the guard.
  if (candidates.length === 0) return null
  // The head leads with the WORSE of the two; a tie goes to the 5h window, which
  // is the tighter budget of the two, so the same percent bites sooner there.
  const head = candidates.reduce((a, b) => (b.f.ratio > a.f.ratio ? b : a))
  const willFill = head.f.ratio > DANGER_RATIO
  // The grey line: WHICH window the figure belongs to + its verdict. The calm
  // wording carries the reset countdown (the spec's ask) in the short form the
  // ~126px caption actually has room for — the full 「重置前不会打满」 plus a
  // countdown measured ~140px and ellipsized.
  const verdict = willFill
    ? t('card.window-forecast.fillIn', { d: fmtSpan(head.f.fillMs) })
    : t('card.window-forecast.noFill', { d: fmtSpan(head.f.resetMs) })
  const legend = `${windowName(head.key)} · ${verdict}`

  // Every picked row always renders: a window without a reading prints `—` muted
  // rather than disappearing, which would silently change the card's line count.
  const row = (key: WindowKey, f: WindowForecast | null): { label: string; value: string; tone?: BarDatum['tone'] } => {
    const label = windowName(key)
    if (f === null) return { label, value: DASH, tone: 'muted' }
    const tone = ratioTone(f.ratio)
    return {
      label,
      // 「118% 预计」 — the suffix says the figure is an extrapolation, not a
      // reading. The unit is percent of the cap, and `used`/`cap` are credits, so
      // no token/credit number is printed anywhere on this card.
      value: `${Math.round(f.ratio * 100)}% ${t('card.window-forecast.projected')}`,
      ...(tone !== undefined ? { tone } : {}),
    }
  }

  // The reset row needs no projection at all: the NEARER of the two future resets,
  // whichever window owns it. A reset already in the past is dropped (stale
  // payload) so the row prints `—` instead of a negative countdown.
  const resets = [limits?.fiveHour?.resetAt, limits?.weekly?.resetAt]
    .filter((ms): ms is number => typeof ms === 'number' && Number.isFinite(ms) && ms > at)
    .map((ms) => ms - at)
  const resetRow: { label: string; value: string; tone?: BarDatum['tone'] } = resets.length > 0
    ? { label: t('card.window-forecast.resetLeft'), value: fmtSpan(Math.min(...resets)) }
    : { label: t('card.window-forecast.resetLeft'), value: DASH, tone: 'muted' }

  return {
    title: t('card.window-forecast.title'),
    headAfter: { big: `${Math.round(head.f.ratio * 100)}%` },
    legend,
    // The three rows sit on the tile's floor — the posture every other card has.
    bodyAnchor: 'bottom',
    // Text-level escalation on the FIGURE, on the same two rungs as the rows: amber
    // in the 0.9–1.0 band, red once the cap is genuinely reached before the reset.
    // No pulse (a projection is not a live overrun). The `warn` rung arrived with
    // this batch's contract change — before it, only `danger` existed and a 94%
    // window had to keep a neutral figure, which read calmer than it was.
    ...(willFill ? { valueTone: 'danger' as const } : ratioTone(head.f.ratio) === 'warn' ? { valueTone: 'warn' as const } : {}),
    chart: {
      kind: 'breakdown',
      breakdown: [row('fiveHour', fiveHour), row('weekly', weekly), resetRow],
    },
  }
}

/**
 * The market / 组件配置 preview's OWN numbers — a second, independent instance of
 * the same arithmetic, so the card is reviewable with no Command Code account.
 *
 * The 5h window is the dangerous one on purpose (the whole reason this card
 * exists): it has burned 9.9 of its 14 credits in the 2h59m30s since its window
 * opened, so it reads 118% projected, i.e. full 1h14m before it resets, while the
 * weekly window is calm at 63%.
 *
 * The +30s cushion on both resets is deliberate: the projection is read a moment
 * after this module is evaluated, and an exact 2h00m00s boundary would print
 * `1h59m` (the countdown floors) on a fast machine and `2h0m` on a slow one — one
 * shared number for every preview run is worth more than thirty seconds of
 * punctuality.
 */
function previewStats(): Partial<WidgetStats> {
  const now = Date.now()
  return {
    commandCode: {
      whoami: null,
      usage: null,
      credits: {
        credits: null,
        windowLimits: {
          limited: false,
          exceeded: null,
          fiveHour: { used: 9.9, cap: 14, exceeded: false, resetAt: now + 2 * HOUR_MS + 30_000 },
          weekly: { used: 12.6, cap: 35, exceeded: false, resetAt: now + 3 * DAY_MS + 30_000 },
        },
      },
      subscription: null,
    },
  }
}

export default defineWidget({
  id: 'window-forecast',
  name: () => t('widget.window-forecast.name'),
  desc: () => t('widget.window-forecast.desc'),
  builtin: true,
  group: 'coding-plan',
  sizes: ['2x2'],
  // Preview-only affordance (NOT a config field): the next states read the very
  // same payload 45 minutes / an hour later, so all three tone bands — red over
  // the cap (118%), amber just under it (94%) and calm (89%) — can be eyeballed
  // in the market without waiting for a real window to move. `sim` MUST be the
  // first `simSteps` entry, or the first click is a silent no-op.
  simToggle: () => t('widget.window-forecast.simToggle'),
  render: windowForecastRender,
  example: {
    stats: previewStats(),
    sim: {},
    simSteps: [{}, { aheadMs: PREVIEW_WARN_AHEAD_MS }, { aheadMs: HOUR_MS }],
  },
})
