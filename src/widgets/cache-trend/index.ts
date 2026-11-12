import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 缓存趋势 — the per-TURN cache hit rate as a sparkline (2×2, group `system`).
 *
 * WHY it exists next to the 缓存命中 card (which shows the same subject as a
 * donut): the donut answers "how much of this session was cached", and that
 * question is AVERAGED — one turn that missed everything disappears into a 96%
 * ring. Measured 2026-10-26 on the Thesis session: turn 7 spent 232,831 tokens at
 * a 50.7% hit rate (one 113,824-token request that hit nothing at all), a single
 * turn worth 23% of the whole session's bill. That is the shape this card shows.
 *
 * ONE POINT PER TURN, NOT PER REQUEST (owner, 2026-10-26). A turn can be 40 model
 * steps, so a per-request line burns its whole 20-point window inside one turn and
 * reads flat while the low turn sits off the left edge — the exact complaint that
 * killed the first revision (「这个对话明显有一轮轮次偏低，但是折线图没有任何变化」).
 * The point is the turn's own 本轮用量 figure: ΣcacheRead / Σprompt over ALL of that
 * turn's steps, so the line agrees with the number the transcript's popover shows.
 *
 * WHAT the two figures under the title are:
 *   - `headAfter.big` — the MOST RECENT turn's hit rate (the line's right end);
 *   - `headAfter.small` — the whole conversation's hit rate, the same
 *     `cacheRead / inputTokens` ratio the 缓存命中 card prints, so the two cards
 *     can never disagree about what "overall" means.
 *
 * THE AXIS IS THE WHOLE SCALE, NOT THE WINDOW'S OWN RANGE: `max: 100` with the
 * renderer's implicit floor of 0 is deliberate (「如果有 50% 的就应该出现在中间」) —
 * auto-scaling to the visible samples would draw 96%..99% as a mountain range and
 * hide how bad a 50% turn really is.
 *
 * THE WINDOW IS CONFIGURABLE (「最多 20 个」): the per-instance `points` config
 * picks how many of the NEWEST turns the line draws (5/10/15/20, default 20). Only
 * the drawing window moves — the two figures under the title always describe the
 * newest turn and the whole conversation.
 *
 * COMPLETE FROM THE FIRST ANSWER, NOT AFTER 加载更多 (owner, 2026-10-26): the series
 * comes from the host route `/api/widgets-cache-turns?session=<id>`, which folds
 * the session's FULL event log on the host. The client's transcript is paginated,
 * so the loaded-window fold (`cacheSeries`) is only the fallback for a host
 * without the route.
 *
 * THE X AXIS IS THE TURN NUMBER: the left label is the window's first turn and the
 * right label is the session's last one (「左边是 1，右边是最后一个数字」).
 *
 * ONE SAMPLE IS NOT A LINE, SO THE FIGURE WAITS ON THE FLOOR (owner, 2026-11-12):
 * with a single turn there is nothing to compare and nothing to draw, so the
 * percentage is docked to the card's bottom-left (`headAfter.dock`), the `整体`
 * caption keeps its slot but stays uninked, and the 「等待更多轮次」 sentence is
 * gone. The second turn lifts the figure up to the head's ladder and raises the
 * sparkline under it — motion, not a different card (see `render/motion.ts` and
 * `card.module.css`'s data-motion block).
 *
 * This render owns the wording, the window and the axis only — it never recomputes
 * a rate from raw buckets, which is what keeps the last point equal to the big
 * figure.
 */

/** The window options (values as config strings, labels shown as-is). */
const POINTS_OPTS: Array<[string, string]> = ['5', '10', '15', '20'].map(n => [n, n])

/** Effective sparkline window: 5..20 newest turns, default 20. */
function resolvePoints(config: Record<string, unknown>): number {
  const n = Number(config?.points)
  if (!Number.isFinite(n) || !(n > 0)) return 20
  return Math.max(5, Math.min(20, Math.round(n)))
}

/** Round a 0..1 rate to the whole percent the card prints. */
function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function cacheTrendRender(s: WidgetStats): WidgetRenderOut | null {
  const u = s.usage
  // No request observed yet: a fresh session must not advertise a 0% hit rate.
  if (!u || u.inputTokens <= 0) return null
  const overall = u.cacheReadTokens / u.inputTokens
  const overallText = `${t('card.cache-trend.overall')} ${pct(overall)}`
  // SOURCE ORDER: the host's whole-session fold first (complete from the first
  // answer, no 加载更多 needed), the loaded-window fold only as the fallback.
  const hostTurns = s.cacheTurns?.available === true && Array.isArray(s.cacheTurns.turns) ? s.cacheTurns.turns : []
  const all: number[] = hostTurns.length > 0 ? hostTurns.map(turn => turn.rate) : (s.cacheSeries ?? [])
  const marks: string[] = hostTurns.length > 0 ? hostTurns.map(turn => String(turn.turn)) : (s.cacheSeriesMarks ?? [])
  if (all.length < 2) {
    // One turn is not a line — and a card that says so in words is a card with a
    // sentence where its data should be (the owner, 2026-11-12: 「取消 等待更多轮次
    // 的文字，百分比数字放在左下角，右侧整体不显示」).
    //
    // So the ONE known figure is DOCKED to the card's floor instead (`dock`): the
    // percentage sits bottom-left on an otherwise empty tile, the overall caption
    // keeps its slot but stays uninked (with a single turn it repeats the same
    // number), and the first real line lifts the figure up to the head's ladder —
    // the FLIP is `CardBody`'s, the rise is `dsx-chart-enter`'s.
    return {
      title: t('widget.cache-trend.name'),
      headAfter: { big: all.length === 1 ? pct(all[0]) : '—', small: overallText, dock: 'bottom' },
    }
  }
  const points = resolvePoints(s)
  const window = all.slice(-points)
  const windowMarks = marks.slice(-points)
  return {
    title: t('widget.cache-trend.name'),
    // `dock` STAYS DECLARED once the line exists — it is the capability, not the
    // current placement: only a card that still asks for the dock keeps its figure
    // row mounted across the change, which is what lets `CardBody` FLIP it up
    // instead of re-mounting a second element in the head.
    headAfter: { big: pct(all[all.length - 1]), small: overallText, dock: 'bottom' },
    chart: {
      kind: 'line',
      line: {
        values: window.map(rate => rate * 100),
        // FIXED full scale (see the axis note above) — never the window's range.
        max: 100,
        // The X axis is the TURN NUMBER, not a clock: the point at the left edge
        // is the first turn of the window and the right edge is the last one
        // (「左边是 1，右边是最后一个数字」).
        labels: [windowMarks[0] ?? '', windowMarks[windowMarks.length - 1] ?? ''],
      },
    },
    // The sparkline is elastic: it takes whatever height the head leaves it.
    bodyAnchor: 'top',
  }
}

export default defineWidget({
  id: 'cache-trend',
  name: () => t('widget.cache-trend.name'),
  desc: () => t('widget.cache-trend.desc'),
  builtin: true,
  group: 'system',
  // MUST mirror the manifest (the runtime reads THIS descriptor; gen-registry
  // fails the build when the two disagree).
  sizes: ['2x2'],
  configSchema: [
    {
      key: 'points',
      label: () => t('card.cache-trend.points'),
      type: 'mode',
      default: '20',
      options: POINTS_OPTS,
    },
  ],
  render: cacheTrendRender,
  // Preview / render-snapshot data: the shape the host route returns — nine turns
  // with turn 7 at 50.7% (mid-height on the fixed axis), the real Thesis session's
  // reading. The X axis therefore reads 1 … 9.
  example: {
    stats: () => ({
      usage: { inputTokens: 118_000, cacheReadTokens: 112_900, outputTokens: 940 },
      cacheTurns: {
        available: true,
        source: 'session-store',
        turns: [
          { turn: 1, rate: 0.961, cacheRead: 812_000, prompt: 845_000, steps: 39 },
          { turn: 2, rate: 0.993, cacheRead: 119_000, prompt: 119_840, steps: 14 },
          { turn: 3, rate: 0.99, cacheRead: 98_000, prompt: 98_990, steps: 11 },
          { turn: 4, rate: 0.985, cacheRead: 143_000, prompt: 145_178, steps: 17 },
          { turn: 5, rate: 0.982, cacheRead: 74_000, prompt: 75_356, steps: 8 },
          { turn: 6, rate: 0.99, cacheRead: 131_000, prompt: 132_323, steps: 15 },
          { turn: 7, rate: 0.507, cacheRead: 117_888, prompt: 232_831, steps: 2 },
          { turn: 8, rate: 0.963, cacheRead: 248_000, prompt: 257_528, steps: 27 },
          { turn: 9, rate: 0.989, cacheRead: 356_000, prompt: 359_960, steps: 40 },
        ],
      },
    }),
  },
})
