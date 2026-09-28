import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtAgo } from '../../client/lib/format'
import type { BarDatum, GoalInfo, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 目标进度 — the durable goal's round progress and its lifecycle phase.
 *
 * WHY IT EXISTS: a session WITH a goal keeps running by itself — the goal projection
 * carries the round budget that drives it, the phase it is in, and, when it stalls,
 * the reason it stopped. None of that is visible anywhere in the UI today, so the
 * only way to answer "is my autonomous run still going, and is it about to run out
 * of rounds" is to read the transcript. This card answers exactly those two
 * questions and nothing else. It reads `stats.goal` (already normalized by the
 * collector), so it needs no host route, no skeleton and no `source` in the
 * manifest — the read is synchronous like the 任务 / 工具调用 cards'.
 *
 * HEAD LADDER (BRIEF §2): the blue 13px title, the 20px figure as `headAfter.big`,
 * the grey caption as `legend`. The figure is `roundsStarted / maxGoalRounds` — a
 * PAIR, because neither number alone is progress ("12 rounds" out of what?): one
 * number would have to be smuggled into the caption to stay honest. `value` is
 * deliberately NOT set (it would be pushed into the body and print the pair twice),
 * and `bodyAnchor: 'bottom'` keeps the three rows on the card floor so the leftover
 * height falls between the caption and the rows, as on every other card.
 *
 * THE FIGURE IS NOT A SHARE, SO THERE IS NO RING: a ring means "this much of the
 * whole", and 12/40 is not a completion percentage — the goal may need the rounds
 * it was given, and finishing early is not a win the card should imply. (The same
 * reason 任务 prints a digit instead of a ring.)
 *
 * HEIGHT BUDGET (measured against the shipped geometry — `card-geometry.ts` +
 * `CardBody.tsx` at unit 150, i.e. scale 1):
 *   pad 12 × 2 (24) + head (title 16 + HEAD_GAP 4 + figure 25 + CAPTION_GAP 2 +
 *   legend 12 = 59) + rows (divider 1 + paddingTop 6 + 3 × 12 + 2 × 4 = 51)
 *   = 134 / 150 — the same 16px of slack the 任务 / 缓存 cards keep, and the reason
 * three rows is a HARD cap: a fourth row is +16px and overflows the tile.
 *
 * TONE DIRECTION (the widget's own call, per §2): progress itself is NEVER coloured
 * — a high round count is not bad news, it is a big budget being used — so the
 * figure and the 目标 / 封顶 rows keep the default ink. Only the two states that
 * CHANGE what the user should do are: `blocked` → `danger` on the 阶段 row (the run
 * has stopped and is waiting on something) and `complete` → `success` (it is done).
 * `active` / `paused` stay uncoloured: neither is a verdict.
 *
 * THE CAPTION CHANGES WHAT IT SAYS WHEN BLOCKED, and only then (the owner's rule in
 * SPECS §2): normally the grey line is "phase · last change" (the reading that
 * answers "is this thing alive"), but a blocked goal's most important fact is the
 * REASON, which is carried nowhere else on the card. So the caption prints a short
 * clip of `blockedReason.message` instead — a blocked run that says "3m ago" would
 * be hiding the one thing the user has to act on.
 *
 * WHAT IT IS NOT: it is not a goal LIST (a session has one goal) and not a round
 * COUNTER (turns/steps live in 轮次·步数 / 会话概览). No goal in the session is the
 * NORMAL state, not an error — the card returns null and the rail shows one tile
 * fewer, rather than spending a slot on a card that says "no goal".
 */

/** The em dash a row with no honest reading prints — the same placeholder 任务 /
 *  工具调用 use, never a fabricated 0 or an empty cell. */
const DASH = '—'

/**
 * How many DISPLAY COLUMNS a clipped string may occupy (see `clip`).
 *
 * WHY A COLUMN BUDGET AND NOT A CHARACTER COUNT: the breakdown's value column is
 * `auto` and the renderer does not clip it (only the LABEL column fades at its right
 * edge), so a value wider than its share of the row pushes the `1fr` label track and
 * the card's own `overflow: hidden` then cuts the row mid-glyph.
 *
 * THE NUMBERS BELOW ARE MEASURED, not estimated (a browser probe of the built tile,
 * 2026-09-28): the card's content box is 124px wide at unit 150 (150 − 2 border −
 * 2 × `cardInnerPad(150)` = 12), the row grid has an 8px gap, the three row labels
 * are 2 CJK glyphs each (20px measured), and at the 10px row type one ASCII column
 * measures ≈ 5.6px while a CJK glyph is exactly 10px — so a `…` costs ~2 columns,
 * not one. The value column may therefore claim 124 − 8 − 20 = 96px, and the worst
 * case at 14 columns (all ASCII: 14 × 5.6 ≈ 79px + a ~10px ellipsis ≈ 89px) leaves
 * ~7px of slack, where a 15th column would leave ~2px. That is why 14 is a CEILING
 * and not a target to grow: the failure it guards against (the value bursting the
 * card and being chopped by the card's own overflow) is permanent and visible, one
 * clipped word is not.
 */
const OBJECTIVE_COLS = 14

/**
 * The caption's whole line budget in display columns — the blocked reason's clip is
 * derived from it (see the render).
 *
 * The caption IS ellipsized by the renderer, so a small overshoot there does not
 * break the card the way an oversized row value does. What it does instead is cut
 * the line a SECOND time, at a point the widget cannot see: sized against the zh
 * prefix, the en caption measured `truncated: true` on the built tile ("Blocked: "
 * is 9 columns where "受阻：" is 6), i.e. the reason lost characters the widget's own
 * budget said it had. 20 columns ≈ 112px worst case against the measured 124px line,
 * leaving the renderer's ellipsis nothing to do in either language.
 */
const LEGEND_COLS = 20

/** Floor for the derived reason budget: a prefix alone (or an absurdly long one)
 *  must still leave a few glyphs of the sentence, never a bare "受阻：…". */
const REASON_MIN_COLS = 6

/** phase → the key of its word. Four keys, one per contract value (SPECS §2). */
const PHASE_KEY: Record<GoalInfo['phase'], string> = {
  active: 'card.goal-progress.phase.active',
  paused: 'card.goal-progress.phase.paused',
  blocked: 'card.goal-progress.phase.blocked',
  complete: 'card.goal-progress.phase.complete',
}

/** phase → the tone of the 阶段 row (see TONE DIRECTION). `undefined` keeps the
 *  default ink, which is what a state that is not a verdict must wear. */
const PHASE_TONE: Record<GoalInfo['phase'], BarDatum['tone'] | undefined> = {
  active: undefined,
  paused: undefined,
  blocked: 'danger',
  complete: 'success',
}

/** One detail row of the breakdown block. */
interface Row {
  label: string
  value: string
  tone?: BarDatum['tone']
}

/**
 * Display columns one character occupies at the card's 10px row type: CJK /
 * fullwidth / emoji glyphs are one em (10px measured at unit 150), everything else
 * roughly half an em (≈ 5.6px, measured on the rendered digits and words) — the
 * Latin side is deliberately rounded UP, because the failure it guards against (the
 * value bursting the card) is visible and permanent, while clipping one glyph early
 * is not.
 */
function cols(ch: string): number {
  const c = ch.codePointAt(0) ?? 0
  const wide =
    (c >= 0x1100 && c <= 0x115f) || // Hangul Jamo
    (c >= 0x2e80 && c <= 0x303e) || // CJK radicals / punctuation
    (c >= 0x3041 && c <= 0x33ff) || // kana, CJK compat, enclosed CJK
    (c >= 0x3400 && c <= 0x4dbf) || // CJK ext A
    (c >= 0x4e00 && c <= 0x9fff) || // CJK unified
    (c >= 0xa000 && c <= 0xa4cf) || // Yi
    (c >= 0xac00 && c <= 0xd7a3) || // Hangul syllables
    (c >= 0xf900 && c <= 0xfaff) || // CJK compat ideographs
    (c >= 0xfe30 && c <= 0xfe6f) || // CJK compat forms
    (c >= 0xff00 && c <= 0xff60) || // fullwidth forms
    (c >= 0xffe0 && c <= 0xffe6) ||
    (c >= 0x1f300 && c <= 0x1faff) // emoji
  return wide ? 2 : 1
}

/** Display columns a whole string occupies — the sum over its characters. The
 *  blocked caption measures its own LOCALIZED prefix with this (see the render):
 *  the prefix is 6 columns in zh and 9 in en, so a hardcoded reason budget is
 *  wrong in one of the two languages by construction. */
function textCols(text: string): number {
  let used = 0
  for (const ch of text) used += cols(ch)
  return used
}

/**
 * Clip a string to a display-column budget, appending `…` only when something was
 * actually dropped (a string that fits keeps its own last glyph — no trailing
 * ellipsis on a complete sentence).
 *
 * This is the card's OWN clip, not the renderer's: the breakdown value column has no
 * overflow guard (see OBJECTIVE_COLS), so the widget has to hand it a string that
 * fits. A string that fits exactly is returned untouched, and whitespace-only input
 * collapses to '' (the caller prints `—`).
 *
 * A cut landing right after a space is TRIMMED before the ellipsis: the boundary is
 * a column count, so "waiting for your approval" cut at 12 columns would otherwise
 * read `waiting for …` — an ellipsis floating away from the word it belongs to,
 * which looks like a layout bug rather than a truncation.
 */
function clip(text: string, maxCols: number): string {
  const s = text.trim()
  let used = 0
  let out = ''
  for (const ch of s) {
    const w = cols(ch)
    if (used + w > maxCols) return `${out.replace(/\s+$/, '')}…`
    out += ch
    used += w
  }
  return out
}

function goalRender(stats: WidgetStats): WidgetRenderOut | null {
  const g = stats.goal
  // NO GOAL IS THE NORMAL CASE, not an error state: most sessions are one-shot
  // chat, and a tile that says so would spend one of the rail's slots on nothing
  // (contrast 任务, whose empty state IS a reading — an empty list exists and its
  // emptiness is information). The shell therefore seats one tile fewer, which is
  // the honest outcome.
  if (!g) return null

  const phase = g.phase
  const phaseWord = t(PHASE_KEY[phase])
  // Round figures are DEFENDED rather than trusted: the projection is normalized
  // defensively (a missing `maxGoalRounds` arrives as 0), and a non-finite number
  // that slipped through must never print as "NaN / 40".
  const max = Number.isFinite(g.maxGoalRounds) ? Math.max(0, Math.floor(g.maxGoalRounds)) : 0
  const done = Number.isFinite(g.roundsStarted) ? Math.max(0, Math.floor(g.roundsStarted)) : 0

  // `maxGoalRounds <= 0` is a REAL state (an unbounded goal publishes no cap), and
  // "/ 0" would read as a full budget of zero — so the figure collapses to the one
  // number that is true. (The spec's 封顶 row was removed at integration: it printed
  // this same cap a second time. See the rows below.)
  const objective = typeof g.objective === 'string' ? clip(g.objective, OBJECTIVE_COLS) : ''

  // THE CAPTION: the blocked reason when there is one (see the header note), else
  // phase + how long ago the goal last moved. `fmtAgo` is the shared "how long ago"
  // formatter — NOT `fmtDuration`, whose sub-hour shape ("2880m0s") would print a
  // two-day-old goal as 2880 minutes; a goal outlives a tool call by design, which
  // is exactly the case a duration formatter is wrong for.
  const reason = phase === 'blocked' && typeof g.blockedReason?.message === 'string' ? g.blockedReason.message.trim() : ''
  // The reason's budget is what is LEFT of the caption line after the LOCALIZED
  // prefix — measured from the template itself (asking it to translate with an empty
  // reason yields "受阻：" / "Blocked: "), never assumed. Sizing it by hand is how
  // the en caption ended up over budget and got cut twice (see LEGEND_COLS).
  const reasonCols = Math.max(REASON_MIN_COLS, LEGEND_COLS - textCols(t('card.goal-progress.blockedLegend', { phase: phaseWord, reason: '' })))
  const updated = Number.isFinite(g.updatedAt) && g.updatedAt > 0 ? g.updatedAt : null
  const legend =
    reason !== ''
      ? t('card.goal-progress.blockedLegend', { phase: phaseWord, reason: clip(reason, reasonCols) })
      : updated === null
        ? // No usable timestamp (0 = the projection never carried one): the phase
          // alone is still a true reading, so the ladder keeps its rung instead of
          // inventing a distance. Reading the clock is allowed here — `fmtAgo`
          // calls Date.now() — and is the only clock read in this render.
          phaseWord
        : t('card.goal-progress.legend', { phase: phaseWord, ago: fmtAgo(new Date(updated).toISOString()) })

  const tone = PHASE_TONE[phase]
  // TWO rows, not three (integration edit, 2026-09-29). The spec's third row was
  // 封顶 → `40 轮`, which is the DENOMINATOR ALREADY PRINTED in the figure
  // (`12 / 40`): a reading never appears twice on one card in this repo (the
  // owner's rule — it is why 计数 moved into `headAfter.small` on the 任务 card).
  // Dropping it costs nothing: the cap is still on the tile, and the rows keep
  // their own subjects (what the goal is / where it stands).
  const rows: Row[] = [
    // The objective is the ONLY long text on the card and the only one that can
    // burst it, hence the clip. An empty objective is a missing reading, not an
    // empty string: `—` muted (never a blank cell, which would read as a layout bug).
    { label: t('card.goal-progress.objective'), value: objective === '' ? DASH : objective, ...(objective === '' ? { tone: 'muted' as const } : {}) },
    { label: t('card.goal-progress.phase'), value: phaseWord, ...(tone === undefined ? {} : { tone }) },
  ]
  return {
    title: t('card.goal-progress.title'),
    headAfter: { big: max > 0 ? t('card.goal-progress.rounds', { done, max }) : String(done) },
    legend,
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown: rows },
  }
}

export default defineWidget({
  id: 'goal-progress',
  name: () => t('widget.goal-progress.name'),
  desc: () => t('widget.goal-progress.desc'),
  builtin: true,
  group: 'system',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: goalRender,
  // Widget-owned preview data: with no live session there is no goal projection, so
  // the market / 组件配置 previews fill the card from here — and the sample is the
  // BLOCKED state on purpose (SPECS §2's ask), because it is the most complex form:
  // the 阶段 row wears danger, the caption gives up its "· ago" rung for the reason,
  // and the objective is long enough to exercise the clip. A live session's goal
  // overrides it the moment one exists (the merge order in `buildPreviewStats`).
  //
  // The `goal === null` branch cannot be reached from a preview (the example always
  // supplies one) — it is asserted separately by the delivery check described in
  // README §7.
  example: {
    stats: {
      goal: {
        objective: '把 dsh-widgets 第三批的 7 张部件卡做完，并逐张看图验收截图',
        phase: 'blocked',
        roundsStarted: 12,
        maxGoalRounds: 40,
        createdAt: Date.now() - 2 * 3600_000,
        updatedAt: Date.now() - 3 * 60_000 - 42_000,
        blockedReason: { code: 'awaiting-approval', message: '等待你确认是否继续（同一阻塞已持续 3 轮）' },
      },
    },
  },
})
