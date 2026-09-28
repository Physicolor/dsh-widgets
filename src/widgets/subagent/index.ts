import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtAgo, fmtDuration } from '../../client/lib/format'
import type { BarDatum, SubagentEntry, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 子代理 — the direct children this session spawned, told in one tile.
 *
 * WHAT IT ANSWERS: how many subagents this session has, the longest ACTIVE TIME any
 * of them logged, how many of them are continuable, and the newest one that carries
 * a label. Multi-agent work is the main time/cost source of a long run and it is
 * completely invisible on the rail; the official `subagentCatalog` projection still
 * has no consumer.
 *
 * THE FIGURE IS THE COUNT, AND THE CARD NEVER SAYS 「运行中」. `subagentCatalog`
 * carries identity and creation time, NOT liveness and NOT spend (see the
 * `SubagentEntry` contract note). A card that printed "2 running" would be inventing
 * a fact it cannot read — the projection cannot tell a child that finished an hour
 * ago from one that is streaming right now. So the head carries the total, and every
 * duration on the card is qualified as ACTIVE TIME or as AGE, never as "running for".
 *
 * HEAD LADDER (BRIEF §2): blue 13px title (`card.subagent.title`), the 20px figure
 * (`headAfter.big` — never `value`, which the renderer would push into the body a
 * second time), the grey caption under it. The caption is the longest active time
 * when the projection published any `activeMs`; when it published none, the caption
 * degrades to the AGE OF THE OLDEST CHILD (「最早 … 前创建」) instead of disappearing —
 * a session where every child reports no active time still has one true statement
 * left, and an empty caption line would just be 12px of dead air. Both captions are
 * about the whole card (the oldest / the longest of ALL children), which is why they
 * belong in the head and not in a fourth row.
 *
 * THE THREE ROWS (breakdown, ≤3 per BRIEF §2):
 *   1. 最久   → the largest `activeMs`; `—` (muted) when none was published.
 *   2. 持续型 → how many are `mode: 'continuable'`, written as `n / total` because
 *               "2 continuable" alone cannot be read without the denominator.
 *   3. 最近   → the label of the NEWEST child that has one, carried in the LABEL
 *               column (`最近 <label>`), with that child's AGE as the reading; `—`
 *               (muted) when no child is labelled.
 * A missing reading prints `—` + `tone: 'muted'` and NEVER vanishes: a row that
 * disappears silently changes the card's line count between renders.
 *
 * WHY ROW 3'S IDENTITY IS IN THE LEFT COLUMN — measured, not taste. The breakdown
 * grid is `1fr auto` (label track, value track). Putting the child's label in the
 * VALUE track let a long label size that track to 245px inside a 124px content box:
 * the label track collapsed to `0px`, so all three row labels vanished and rows 1
 * and 2's figures were pushed off the card (`.tmp-subagent-dom.cjs` dump of the
 * first build: `gridTemplateColumns: "0px 245.203px"`). The renderer's own answer to
 * long text is the LABEL track's right-edge fade (nowrap + mask — see
 * breakdown.tsx), so the identity belongs there: any length then fades instead of
 * stealing the grid, and the fixed vocabulary (最久 / 持续型 / 最近) stays readable.
 * The tool card's 「正在执行 <name>」 row reads the same way, for the same reason.
 *
 * `label` IS CAPPED BUT NOT ELLIPSIZED. The renderer's mask fade is what truncates
 * visually; this widget only bounds the string it hands over so a pathological
 * label cannot ship a paragraph into the DOM. It deliberately does NOT append `…`,
 * which would put a second truncation mark inside an already-faded line.
 *
 * TONE DIRECTION — the widget's own call (BRIEF §2), and the only tone here:
 * `LONGEST_ACTIVE_WARN_MS` (30 min) turns the 最久 row amber. Rationale: the count
 * itself is NEVER coloured (more children is not worse), and active time under half
 * an hour is ordinary delegated work. Past 30 minutes of logged active time a child
 * has usually stopped being a delegation and become a stuck or oversized one — the
 * threshold is a nudge to go look, not an error. It is amber (`warn`), not red: a
 * long child is not a failure, and a card that cries red at ordinary long work gets
 * ignored.
 *
 * CLOCK: `render` reads `Date.now()` — the one impurity BRIEF §3 allows — because the
 * created-at fallback is a DISTANCE (「最早 48m 前创建」) and a distance only exists
 * relative to now. It is read once per render and never stored.
 *
 * NO `source` IN THE MANIFEST: `subagents` is a synchronous session projection
 * (`stats.subagents`), not an async route — there is nothing to wait for and no
 * loading silhouette to declare.
 *
 * 2×2 ONLY: three rows plus the head spend 134 of the 150px budget (pad 24 + head 59
 * + rows 51 — measured, and the same posture cache / tool / context ship), so the wide
 * variant would buy nothing.
 */

/** The em dash a row without a reading shows — the repo's placeholder (task / tool /
 *  quota-manage), never a fabricated 0. A 0 would say "no active time was logged",
 *  which is only true when the projection actually published a 0. */
const DASH = '—'

/**
 * The 最久 row turns amber above this. 30 minutes of LOGGED ACTIVE time (the child's
 * own turn time, not wall-clock age) is the point where a delegation has usually
 * outgrown its brief; see TONE DIRECTION above for why amber and not red.
 */
const LONGEST_ACTIVE_WARN_MS = 30 * 60_000

/** Upper bound on the label characters this widget hands to the renderer. The
 *  visible truncation is the breakdown's right-edge fade on the LABEL track; this
 *  cap only keeps a runaway label out of the DOM. 48 chars is well past the ~7 CJK
 *  glyphs a 2×2 label track can show, so nothing readable is ever cut by it. */
const MAX_LABEL_CHARS = 48

/**
 * A catalog entry as this card reads it.
 *
 * `SubagentEntry` (the shared contract) declares identity, mode and label; the
 * ACTIVE TIME is an optional extra the projection MAY carry — the parent session
 * fetches it via the client session list rather than from the child, so it can be
 * absent for every child. Reading it through this local widening keeps the card
 * honest in both worlds: with the field it prints durations, without it it degrades
 * to creation ages, and it compiles either way (adding `activeMs` to the shared type
 * later stays assignable to this intersection).
 */
type SubagentRow = SubagentEntry & { activeMs?: number }

/** One detail row of the breakdown block. */
interface DetailRow {
  label: string
  value: string
  tone?: BarDatum['tone']
}

/** A finite, usable number, or null. The projection is normalized upstream, but a
 *  render must never turn a malformed row into `NaN` on the tile. */
function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Flatten whitespace and bound the length; an empty result is the dash (see the
 *  file header for why no `…` is appended here). */
function clipLabel(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat === '') return DASH
  return flat.length > MAX_LABEL_CHARS ? flat.slice(0, MAX_LABEL_CHARS) : flat
}

/**
 * @param stats - the session record (`stats.subagents` is the whole input).
 * @param meta  - render context; `meta.sim.noActive` is the preview's override (see
 *                `example` below), which forces the no-active-time posture so the
 *                degraded caption can be reviewed without a live session.
 */
function subagentRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const all = Array.isArray(stats.subagents) ? (stats.subagents as SubagentRow[]) : null
  // `null` = the projection is absent (this deployment composes no session
  // controller) and `[]` = it answered "no children spawned". Both leave the card
  // with nothing to say, and a 「0 个子代理」 tile would spend one of the rail's slots
  // on a fact nobody needs to look up — the same discipline 目标进度 applies to `goal`.
  // This is the common case, not an error: it is not rendered as an empty state.
  if (all === null || all.length === 0) return null
  const now = Date.now()
  const noActive = meta?.sim?.noActive === true

  // The longest ACTIVE TIME (0 is a real reading — a child that logged no turns yet
  // — so the test is `>= 0`, not `> 0`).
  let longest: number | null = null
  if (!noActive) {
    for (const entry of all) {
      const ms = finiteOrNull(entry.activeMs)
      if (ms !== null && ms >= 0 && (longest === null || ms > longest)) longest = ms
    }
  }
  // The AGE fallback needs the OLDEST child, and `createdAt` is the only timestamp
  // the catalog guarantees.
  let earliest: number | null = null
  for (const entry of all) {
    const at = finiteOrNull(entry.createdAt)
    if (at !== null && (earliest === null || at < earliest)) earliest = at
  }

  // The caption is about the whole card, so it prefers the strongest statement
  // available: the longest active time, else how long ago the first child appeared.
  // With neither (no usable timestamp at all) the line is omitted rather than faked.
  const caption = longest !== null
    ? t('card.subagent.legendActive', { dur: fmtDuration(longest) })
    : earliest !== null
      ? t('card.subagent.legendEarliest', { ago: fmtAgo(new Date(earliest).toISOString(), now) })
      : null

  let continuable = 0
  // The NEWEST labelled child wins: the catalog is ordered oldest-first, but "最近"
  // is a time claim, so it is read from `createdAt` (ties keep the later catalog row,
  // hence `>=`). An unlabelled child cannot answer this row, so it is skipped — a
  // child without a label is not a "recent identity".
  let latest: SubagentRow | null = null
  let latestAt = Number.NEGATIVE_INFINITY
  for (const entry of all) {
    if (entry.mode === 'continuable') continuable += 1
    if (typeof entry.label !== 'string' || entry.label.trim() === '') continue
    const at = finiteOrNull(entry.createdAt) ?? Number.NEGATIVE_INFINITY
    if (latest === null || at >= latestAt) {
      latest = entry
      latestAt = at
    }
  }
  // The row's reading is that child's AGE — the one short, true figure about it that
  // is not already in the head caption (which reports the OLDEST child) nor in row 1
  // (the longest ACTIVE time). A missing timestamp leaves the identity row standing
  // with `—` rather than guessing a duration.
  const latestAgo = latest !== null && Number.isFinite(latestAt)
    ? fmtAgo(new Date(latestAt).toISOString(), now)
    : null

  // TWO rows (integration edit, 2026-09-29). The spec's first row was 最久 → the
  // longest active time, which is EXACTLY the grey caption above it: one reading,
  // printed twice. The caption keeps it (the head is where a whole-card summary
  // belongs); the rows keep their own subjects — how many children are resumable,
  // and who the newest one is.
  const rows: DetailRow[] = [
    // The denominator is the point of this row: "2 持续型" cannot be read without it.
    { label: t('card.subagent.continuable'), value: `${continuable} / ${all.length}` },
    latest === null
      ? { label: t('card.subagent.recent'), value: DASH, tone: 'muted' }
      : {
          // Identity in the LABEL track (faded there, see the file header for the
          // measured reason); the fixed 最近 vocabulary rides in front of it, exactly
          // like 工具调用's 「最慢 <name>」 / 「正在执行 <name>」 rows.
          label: `${t('card.subagent.recent')} ${clipLabel(latest.label ?? '')}`,
          ...(latestAgo === null ? { value: DASH, tone: 'muted' as const } : { value: t('card.subagent.ago', { ago: latestAgo }) }),
        },
  ]

  return {
    title: t('card.subagent.title'),
    // The figure is how MANY children exist — the only liveness-free number this
    // projection can promise (see the file header). `value` stays unset: with a
    // `headAfter` head it would render the same idea a second time in the body.
    headAfter: { big: String(all.length) },
    // The 30-minute escalation moved here from the (now removed) duplicate row: a
    // `legend` has no tone channel in the render contract, so the one place left to
    // paint it is the figure — and the figure IS the card's subject (how many
    // children), which is what "one of them has been busy for over half an hour"
    // asks the reader to look at. `warn`, not `danger`: a long active child is a
    // "go look", not an error (see LONGEST_ACTIVE_WARN_MS).
    ...(longest !== null && longest > LONGEST_ACTIVE_WARN_MS ? { valueTone: 'warn' as const } : {}),
    ...(caption === null ? {} : { legend: caption }),
    // Bottom-anchored like every other card of this family: the three rows sit on the
    // tile's floor so the leftover height lands between the caption and the divider
    // instead of under the rows.
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown: rows },
  }
}

export default defineWidget({
  id: 'subagent',
  name: () => t('widget.subagent.name'),
  desc: () => t('widget.subagent.desc'),
  builtin: true,
  group: 'system',
  render: subagentRender,
  // A click on the preview steps 有活跃时长 → 无活跃时长 (the shared `simSteps`
  // mechanism 任务 / 套餐 use). The degraded caption is otherwise UNREVIEWABLE: the
  // example below publishes `activeMs` so the market can show the fullest form, and
  // a session whose children report no active time would then be impossible to
  // eyeball. `meta.sim.noActive` forces that posture — it is read only from
  // `meta.sim`, so the rail is untouched.
  simToggle: () => t('widget.subagent.simToggle'),
  // Widget-owned preview data: with no live session there is no `subagentCatalog`, so
  // the market / 组件配置 previews fill the card from here (a live record wins the
  // moment the session has children — see buildPreviewStats).
  //
  // Deliberately the MOST COMPLEX form the card has, so one screenshot covers every
  // treatment at once: a longest active time past the 30-minute warn threshold, a
  // mixed one-shot / continuable roster (「2 / 4」 rather than an unreadable 0 or a
  // degenerate 4 / 4), and a long label — the label is what the right-edge fade is
  // judged on, so it is written as the sentence a real agent would produce.
  example: {
    stats: {
      subagents: [
        { id: 'sub-1', createdAt: Date.now() - 48 * 60_000, mode: 'one-shot', activeMs: 8 * 60_000 + 12_000 },
        { id: 'sub-2', createdAt: Date.now() - 31 * 60_000, mode: 'continuable', label: 'cache 卡版式复核', activeMs: 21 * 60_000 },
        { id: 'sub-3', createdAt: Date.now() - 12 * 60_000, mode: 'continuable', activeMs: 36 * 60_000 + 12_000 },
        {
          id: 'sub-4',
          createdAt: Date.now() - 4 * 60_000,
          mode: 'one-shot',
          label: 'dsh-widgets 第三批 · subagent 卡面与预览链路复核',
        },
      ] satisfies SubagentRow[],
    },
    // 有活跃时长 first (`sim` must be one of `simSteps`, or the first click is a
    // silent no-op — see WidgetExample).
    sim: { noActive: false },
    simSteps: [{ noActive: false }, { noActive: true }],
  },
})
