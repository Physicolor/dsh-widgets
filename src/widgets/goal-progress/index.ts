import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtAgo, fmtShortDate } from '../../client/lib/format'
import type { BarDatum, GoalInfo, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 目标进度 — the durable goal's lifecycle phase, and (only when it exists) its
 * round progress.
 *
 * WHY IT EXISTS: a session WITH a goal keeps running by itself — the goal
 * projection carries the phase it is in, the round budget that drives it, and,
 * when it stalls, the reason it stopped. None of that is visible anywhere in the
 * UI today, so the only way to answer "is my autonomous run still going, and is
 * it about to run out of rounds" is to read the transcript. It reads
 * `stats.goal` (already normalized by the collector), so it needs no host route,
 * no skeleton and no `source` in the manifest — the read is synchronous like the
 * 任务 / 工具调用 cards'.
 *
 * IT ALWAYS RENDERS (the owner's order, revision round). The card used to return
 * null whenever the session had no goal, so a rail slot the user had deliberately
 * installed appeared and disappeared with the session — the layout shifted under
 * the user's eyes, and a card that pops in and out reads as an accident. Missing
 * data is now a QUIET EMPTY STATE (title, the word 无目标, one grey line), the same
 * posture 任务 takes for an empty list. See BRIEF V3 §0.5: a card the user put on
 * the rail keeps its slot; only a card the user has not decided about yet may
 * hide itself (this one is `defaultInstalled: false`).
 *
 * THE FIGURE IS A PHASE WORD, NOT A RATIO (the owner's order, revision round). It
 * used to be `roundsStarted / maxGoalRounds`, and that pair printed `0 / 256` for
 * every goal that had been created but had not admitted a single round yet: DSH's
 * `dsh-goal` config defaults `defaultMaxGoalRounds` to 256, so `0 / 256` is the
 * FRAMEWORK'S DEFAULT BUDGET, not progress — a reading that needs a paragraph to
 * explain and still says nothing. `12 / 40` had the same defect in miniature (12
 * of what, out of what). The figure is now the lifecycle phase
 * (进行中 / 已暂停 / 受阻 / 已完成 / 无目标): one word, no unit, no denominator,
 * nothing to look up.
 *
 * THE ROUND PAIR IS A ROW, AND ONLY WHILE IT IS A READING. `12 / 40` becomes
 * progress only once at least one round has been admitted; before that there is no
 * progress to show and a lone cap is noise, so the row prints the STATE of the
 * counter (尚未开始) instead of `0 / 256`. Its label names both halves —
 * 轮次/上限 / Rounds/max — because a bare pair only means "used / allowed" when the
 * row says so (the discipline 任务 applies to its counts line). A goal with no
 * published cap prints `12 / —`: twelve rounds, nothing to compare them against.
 *
 * THE THREE ROWS ARE 目标 / 轮次·上限 / 最近变更 — what the goal is, how far it has
 * got, when it last moved. The last one prints a DISTANCE while `fmtAgo` still
 * gives one and a bare DATE past 30 days: that formatter hands over to
 * `fmtShortDate` there, and appending the usual suffix turned a month-old goal into
 * `8.14 前`, a date wearing a duration's clothes. The objective is clipped against
 * a budget DERIVED from the other two rows' localized labels, because all three
 * rows share one grid track — see `objectiveBudget`.
 *
 * HEAD LADDER (BRIEF §2): the blue 13px title, the 20px phase word as
 * `headAfter.big`, and the grey caption as `legend` — which is present only when
 * the word cannot say the thing that matters: the blocked REASON (a blocked run's
 * one actionable fact, carried nowhere else on the card). `value` is deliberately
 * NOT set on a goal-bearing card (the renderer would push it into the body and
 * print a second figure), and `bodyAnchor: 'bottom'` keeps the three rows on the
 * card floor so the leftover height falls between the head and the rows, as on
 * every other card.
 *
 * THE EMPTY STATE IS THE ONE BRANCH THAT INVERTS THAT LADDER, on purpose (the
 * owner's note, revision round 2): with no goal there are no rows and therefore
 * nothing keeping the floor down, so the two lines that remain — 无目标 and 当前会话
 * 没有目标 — become the body (`value` + `sub`, bottom-anchored) and land in the
 * card's LEFT BOTTOM CORNER instead of dangling under the title. The goal-bearing
 * layout is untouched. See the branch itself for the measurement that prompted it.
 *
 * HEIGHT BUDGET (measured against the shipped geometry — `card-geometry.ts` +
 * `CardBody.tsx` at unit 150, i.e. scale 1):
 *   pad 12 × 2 (24) + head (title 16 + HEAD_GAP 4 + figure 25 = 45; + CAPTION_GAP
 *   2 + legend 12 = 59 when the caption is there) + rows (divider 1 + paddingTop 6
 *   + 3 × 12 + 2 × 4 = 51) = 120 / 150 with no caption, 134 / 150 with one — the
 *   same envelope the 任务 / 缓存 cards keep. Three rows is a HARD cap: a fourth is
 *   +16px and overflows the tile.
 *   The EMPTY state has no rows at all: pad 24 + head (title 16) + foot (value 25 +
 *   foot gap 6 + sub 12 = 43) = 83 / 150, and the 67px that are left are the flex
 *   gap ABOVE the foot — the slack sits between the title and the bottom-left
 *   lines, never below them (that is what `bodyAnchor: 'bottom'` buys).
 *
 * TONE DIRECTION (the widget's own call, per §2): ONLY `blocked` is coloured
 * (`valueTone: 'danger'` — the phase word itself turns red), because it is the one
 * state that is asking the user to act. `complete` is NOT green: green / amber /
 * red are the ESCALATION ladder (BRIEF V3 §0.6), and a finished run is not a
 * warning level — and the renderer's `valueTone` has no success rung anyway
 * (`valueColor` falls through anything that is not `warn`/`muted` to the ERROR
 * red, so the old 阶段 row's green is deleted rather than moved). `active` /
 * `paused` / no goal stay in the default ink: neither is a verdict.
 *
 * WHAT IT IS NOT: not a goal LIST (a session has one goal), not a round COUNTER
 * (`turns` / `steps` are 轮次·步数 and 会话概览), and not a progress bar — the goal
 * may need exactly the rounds it was given, so there is no completion percentage
 * to draw and no ring to draw it in.
 */

/** The em dash a row with no honest reading prints — the same placeholder 任务 /
 *  工具调用 use, never a fabricated 0 or an empty cell. */
const DASH = '—'

/**
 * The measured type model of one breakdown row at unit 150 (probe of the built
 * tile; the same model the previous revision calibrated).
 *
 * The value column of `breakdown` is `auto` and the label track is `1fr`, and the
 * GRID SHARES BOTH across the three rows — so the widest label decides how much
 * room the widest value gets, no matter which row it belongs to. That is why the
 * objective's clip budget has to be DERIVED from the other rows' localized labels
 * (`objectiveBudget`) instead of hardcoded: 轮次/上限 is 45.6px in zh and
 * Rounds/max is 56px in en, and a constant tuned for one language overflows the
 * other.
 */
const ROWS_WIDTH_PX = 124 // 150 − 2 border − 2 × cardInnerPad(150) = 12
const ROW_GAP_PX = 8 // the row grid's column gap
const COL_PX = 5.6 // one ASCII column at the 10px row type
const WIDE_PX = 10 // one CJK / fullwidth glyph (exactly one em)
const ELLIPSIS_COLS = 2 // what the clip's `…` costs

/** Floor for the derived objective budget: an over-wide label pair must still
 *  leave a few glyphs of the goal's own words, never a bare "…". */
const OBJECTIVE_MIN_COLS = 6

/**
 * The caption's whole line budget in display columns — the blocked reason's clip
 * is derived from it (see the render).
 *
 * The caption IS ellipsized by the renderer, so a small overshoot there does not
 * break the card the way an oversized row value does. What it does instead is cut
 * the line a SECOND time, at a point the widget cannot see: sized against the zh
 * prefix, the en caption measured `truncated: true` on the built tile ("Reason: "
 * is 8 columns where "原因：" is 6), i.e. the reason lost characters the widget's own
 * budget said it had. 20 columns ≈ 112px worst case against the measured 124px
 * line, leaving the renderer's ellipsis nothing to do in either language.
 */
const LEGEND_COLS = 20

/** Floor for the derived reason budget: a prefix alone (or an absurdly long one)
 *  must still leave a few glyphs of the sentence, never a bare "受阻：…". */
const REASON_MIN_COLS = 6

/**
 * Where `fmtAgo` stops reporting a DISTANCE and starts reporting a date (it hands
 * over to `fmtShortDate`, "8.14", past 30 days — the two sides are 86400 × 30 in
 * the shared formatter, so this constant mirrors it).
 *
 * The mirror matters because the 最近变更 row appends a suffix ("前" / "ago"): a goal
 * that has been alive for a month would otherwise print `8.14 前`, a date wearing a
 * duration's clothes. Past this boundary the row prints the date bare — its label
 * already says what the reading is.
 */
const DATED_AFTER_MS = 30 * 24 * 60 * 60 * 1000

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/**
 * The 最近变更 reading. `now` is passed IN (and handed to `fmtAgo`) so the render
 * reads the clock exactly once, in one place.
 */
function changedText(updatedAt: number, now: number): string {
  const iso = new Date(updatedAt).toISOString()
  return now - updatedAt >= DATED_AFTER_MS ? fmtShortDate(iso.slice(0, 10)) : t('card.goal-progress.ago', { ago: fmtAgo(iso, now) })
}

/**
 * phase → the key of its word. Four contract values plus the fifth word the empty
 * state uses (无目标), which is NOT a `GoalInfo['phase']` — there is no goal to
 * carry one — but belongs to the same vocabulary on purpose: the big slot always
 * prints one of five states, so the card never shows a number where a word goes.
 */
const PHASE_KEY: Record<GoalInfo['phase'], string> = {
  active: 'card.goal-progress.phase.active',
  paused: 'card.goal-progress.phase.paused',
  blocked: 'card.goal-progress.phase.blocked',
  complete: 'card.goal-progress.phase.complete',
}
const NO_GOAL_KEY = 'card.goal-progress.phase.none'

/** One detail row of the breakdown block. */
interface Row {
  label: string
  value: string
  tone?: BarDatum['tone']
}

/**
 * Display columns one character occupies at the card's 10px row type: CJK /
 * fullwidth / emoji glyphs are one em, everything else roughly half an em — the
 * Latin side is deliberately rounded UP, because the failure it guards against
 * (the value bursting the card) is visible and permanent, while clipping one
 * glyph early is not.
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
 *  the prefix is 6 columns in zh and 8 in en, so a hardcoded reason budget is
 *  wrong in one of the two languages by construction. */
function textCols(text: string): number {
  let used = 0
  for (const ch of text) used += cols(ch)
  return used
}

/** The same string in PIXELS, through the measured column model above. Used to
 *  derive the objective's budget from the labels it shares its grid with. */
function textPx(text: string): number {
  let px = 0
  for (const ch of text) px += cols(ch) === 2 ? WIDE_PX : COL_PX
  return px
}

/**
 * How many display columns the 目标 row's value may occupy, measured off the
 * labels the same grid shares (see ROWS_WIDTH_PX): the value column gets whatever
 * the widest label leaves of the 124px row, and the clip's `…` is reserved before
 * the budget is handed out.
 *
 * The result is deliberately derived at RENDER time from the localized labels, not
 * fixed: `轮次/上限` and `Rounds/max` differ by 10px, and the objective is the only
 * value on the card that can burst the row (the breakdown value cell carries no
 * overflow guard of its own — the renderer only fades the LABEL track).
 */
function objectiveBudget(labels: string[]): number {
  let labelPx = 0
  for (const label of labels) labelPx = Math.max(labelPx, textPx(label))
  const valuePx = ROWS_WIDTH_PX - ROW_GAP_PX - labelPx
  return Math.max(OBJECTIVE_MIN_COLS, Math.floor(valuePx / COL_PX) - ELLIPSIS_COLS)
}

/**
 * Clip a string to a display-column budget, appending `…` only when something was
 * actually dropped (a string that fits keeps its own last glyph — no trailing
 * ellipsis on a complete sentence).
 *
 * This is the card's OWN clip, not the renderer's: the breakdown value column has no
 * overflow guard, so the widget has to hand it a string that fits. A string that
 * fits exactly is returned untouched, and whitespace-only input collapses to ''
 * (the caller prints `—`).
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

/**
 * The five states the PREVIEWS step through (`example.simSteps`) — the shapes a
 * live rail cannot be asked for on demand.
 *
 * They are complete `GoalInfo` mocks rather than snippets, because every reading
 * on the card is derived from the same record (phase → the word and the tone,
 * rounds → the row, updatedAt → the age). `none` and `fresh` are the two halves of
 * the owner's report and the reason this revision exists: the empty state must be
 * visible (not a hidden card) and `0 / 256` must be GONE (`fresh` is a real
 * `create_goal` result — `maxGoalRounds` left at DSH's default 256 — and it draws
 * 尚未开始 instead).
 *
 * `complete` carries `roundsStarted: 0` ON PURPOSE: that is the other shape the
 * owner reported (a finished goal printing `0 / 256`), and the one place where
 * "not started" would be a lie — so the row prints `—` there, and the gallery
 * proves it.
 *
 * `meta.sim` only ever comes from the preview surfaces (the rail passes `{ size }`
 * alone), and a sim state WINS over `stats.goal` in the render: with live data
 * merged over the example, a session that happens to have a goal would otherwise
 * make four of these five states unreviewable.
 */
const PREVIEW_GOALS: Record<string, GoalInfo | null> = {
  none: null,
  active: {
    objective: '把 dsh-widgets 第三批的 7 张部件卡做完，并逐张看图验收截图',
    phase: 'active',
    roundsStarted: 12,
    maxGoalRounds: 40,
    createdAt: Date.now() - 2 * HOUR,
    updatedAt: Date.now() - 42_000,
  },
  fresh: {
    objective: '盯住发布流程：等 CI 绿了就打 tag 并确认 npm 上的版本',
    phase: 'active',
    roundsStarted: 0,
    maxGoalRounds: 256,
    createdAt: Date.now() - 5_000,
    updatedAt: Date.now() - 5_000,
  },
  blocked: {
    objective: '把 dsh-widgets 第三批的 7 张部件卡做完，并逐张看图验收截图',
    phase: 'blocked',
    roundsStarted: 12,
    maxGoalRounds: 40,
    createdAt: Date.now() - 2 * HOUR,
    updatedAt: Date.now() - 3 * MINUTE - 42_000,
    blockedReason: { code: 'awaiting-approval', message: '等待你确认是否继续（同一阻塞已持续 3 轮）' },
  },
  complete: {
    objective: '把 goal-progress 卡改成「没有目标也常显」，并修正轮次那一对读数',
    phase: 'complete',
    roundsStarted: 0,
    maxGoalRounds: 256,
    createdAt: Date.now() - 26 * HOUR,
    updatedAt: Date.now() - 6 * MINUTE,
  },
}

function goalRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const sim = meta?.sim?.state
  const g = typeof sim === 'string' && sim in PREVIEW_GOALS ? PREVIEW_GOALS[sim] : (stats.goal ?? null)

  // NO GOAL IS STILL A READING (see the header note): the tile keeps its slot and
  // says so quietly — the fifth phase word plus one grey line, no rows, no divider,
  // no colour. This is the branch the card used to answer with `null`.
  //
  // THE TWO LINES SIT ON THE CARD'S FLOOR, IN ITS LEFT CORNER (the owner's note,
  // revision round 2). They used to ride the HEAD ladder (`headAfter.big` +
  // `legend`), which stacks them directly under the title — measured 13px from the
  // top and 76px of dead tile below the second line, so the empty card read as a
  // half-filled card rather than a deliberately quiet one. The empty state has no
  // rows to hold the floor down, so the two lines ARE its body: `value` (the 20px
  // figure slot, same rung the phase word would never get on this branch) plus
  // `sub` (the 10px grey line under it), with `bodyAnchor: 'bottom'` keeping that
  // foot on the card floor — the posture the 额度管理 figure row takes. The head is
  // then the blue title alone, and the leftover height falls BETWEEN title and
  // foot, which is exactly where a card's slack belongs.
  //
  // It is deliberately NOT `headAfter` + `bodyAnchor: 'bottom'`: that combination
  // anchors the BODY, which on this branch is empty, leaving the ladder rungs
  // stacked at the top (the defect being fixed). `headAfter` / `legend` are
  // therefore absent here, and `value` is free to be the body figure — the mutex
  // the contract describes (`value` is pushed into the body whenever `headAfter`
  // is present) is what makes this branch possible at all.
  if (g === null || g === undefined) {
    return {
      title: t('card.goal-progress.title'),
      value: t(NO_GOAL_KEY),
      sub: t('card.goal-progress.noGoal'),
      bodyAnchor: 'bottom',
    }
  }

  const phaseWord = t(PHASE_KEY[g.phase])
  // Round figures are DEFENDED rather than trusted: the projection is normalized
  // defensively (a missing `maxGoalRounds` arrives as 0), and a non-finite number
  // that slipped through must never print as "NaN / 40".
  const max = Number.isFinite(g.maxGoalRounds) ? Math.max(0, Math.floor(g.maxGoalRounds)) : 0
  const done = Number.isFinite(g.roundsStarted) ? Math.max(0, Math.floor(g.roundsStarted)) : 0

  // The three row labels are resolved FIRST: the objective's clip budget is derived
  // from their widths (they share one grid track — see objectiveBudget).
  const objectiveLabel = t('card.goal-progress.objective')
  const roundsLabel = t('card.goal-progress.roundsLabel')
  const changedLabel = t('card.goal-progress.changed')
  const objective = typeof g.objective === 'string' ? g.objective.trim() : ''
  const objectiveCols = objectiveBudget([objectiveLabel, roundsLabel, changedLabel])

  // `max <= 0` is a REAL state (a goal that publishes no cap), and "12 / 0" would
  // read as a budget already exhausted — so the cap half prints `—` instead.
  // `done === 0` is the state this revision exists for: there is no progress yet,
  // and `0 / 256` was the framework's default budget masquerading as one. The row
  // says what the counter IS (尚未开始) — except on a finished goal, where that
  // sentence would contradict the word above it, so it prints `—` muted.
  const roundsValue =
    done === 0
      ? g.phase === 'complete'
        ? DASH
        : t('card.goal-progress.roundsNotStarted')
      : t('card.goal-progress.rounds', { done, max: max > 0 ? String(max) : DASH })

  // `updatedAt <= 0` means the projection never carried a timestamp: the row keeps
  // its place and prints `—` muted rather than inventing a distance. The clock is
  // read ONCE, here, and handed to the formatter (see `changedText`) — `fmtDuration`
  // would be wrong for a goal, which outlives a tool call by design: it prints
  // 2880m0s for a two-day-old run.
  const updated = Number.isFinite(g.updatedAt) && g.updatedAt > 0 ? g.updatedAt : null

  const rows: Row[] = [
    // The objective is the card's SUBJECT, and an empty one is a missing reading,
    // not an empty string: `—` muted (never a blank cell, which reads as a bug).
    { label: objectiveLabel, value: objective === '' ? DASH : clip(objective, objectiveCols), ...(objective === '' ? { tone: 'muted' as const } : {}) },
    { label: roundsLabel, value: roundsValue, ...(roundsValue === DASH ? { tone: 'muted' as const } : {}) },
    { label: changedLabel, value: updated === null ? DASH : changedText(updated, Date.now()), ...(updated === null ? { tone: 'muted' as const } : {}) },
  ]

  // THE CAPTION, when there is one: the blocked reason (see the header note), and
  // ONLY that — every other reading already owns a row, and this repo never prints
  // one reading twice. The budget is what is LEFT of the caption line after the
  // LOCALIZED prefix, measured from the template itself (asking it to translate with
  // an empty reason yields "原因：" / "Reason: "), never assumed.
  const reason = g.phase === 'blocked' && typeof g.blockedReason?.message === 'string' ? g.blockedReason.message.trim() : ''
  const legend = reason === ''
    ? null
    : t('card.goal-progress.blockedLegend', {
      reason: clip(reason, Math.max(REASON_MIN_COLS, LEGEND_COLS - textCols(t('card.goal-progress.blockedLegend', { reason: '' })))),
    })

  return {
    title: t('card.goal-progress.title'),
    headAfter: { big: phaseWord },
    ...(legend === null ? {} : { legend }),
    // `blocked` is the one phase that is an escalation (see TONE DIRECTION): the
    // word itself wears the error red. It follows `headAfter.big` — the renderer
    // colours whichever slot carries the figure.
    ...(g.phase === 'blocked' ? { valueTone: 'danger' as const } : {}),
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
  // The previews step the five states with a click (the shared `simSteps`
  // mechanism 套餐 / 任务 use). It is an affordance and not a user setting: the rail
  // never passes a sim.
  simToggle: () => t('widget.goal-progress.simToggle'),
  // Widget-owned preview data. `stats.goal` is the blocked sample (the richest
  // single state: red word, caption carrying the reason, an objective long enough to
  // exercise the clip) for any surface that renders without a sim; `sim` opens on
  // the EMPTY state, because "the card is still there when there is no goal" is the
  // first thing this revision has to show. `sim` MUST be `simSteps[0]` (the stepper
  // locates the current state by deep equality, so anything else makes the first
  // click a no-op).
  example: {
    stats: { goal: PREVIEW_GOALS.blocked },
    sim: { state: 'none' },
    simSteps: [
      { state: 'none' },
      { state: 'active' },
      { state: 'fresh' },
      { state: 'blocked' },
      { state: 'complete' },
    ],
  },
})
