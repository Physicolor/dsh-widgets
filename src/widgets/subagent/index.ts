import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtAgo, fmtDuration } from '../../client/lib/format'
import type { BarDatum, SubagentEntry, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 子代理 — WHO this session dispatched, told in one tile.
 *
 * WHAT IT ANSWERS (the owner's re-scoping, 2026-09-29): 「派出去的是些什么」 —
 * how many children exist, how many of them are continuable, and who the newest
 * labelled one is. Identity, not activity. Multi-agent work is the main time and
 * cost source of a long run and it is invisible on the rail; the official
 * `subagentCatalog` projection still has no other consumer.
 *
 * WHY IT IS NOT `jobs` (see BATCH-3-AUDIT §4): the two cards really did overlap —
 * `jobs.kind` even has a `subagent` value — so the split is by QUESTION, not by
 * subject. `jobs` reads the job mirror, which carries a real `status`
 * (running/stopping/completed/killed/failed); it owns 「有没有活正在占着机器」.
 * This card reads `subagentCatalog`, which carries identity and creation time and
 * NOTHING ELSE — it cannot tell a child that finished an hour ago from one that is
 * streaming right now. So it owns 「派出去几个、几个可持续、分别是谁」 and the
 * liveness word must never reach the card: no locale string in `manifest.json`
 * carries it, and the render output is asserted free of it (the worker's
 * `subagent` case sweep). A card that printed "2 running" would be inventing a
 * fact it cannot read.
 *
 * THE FIGURE IS THE COUNT, AND THE CARD CARRIES NO COLOUR. More children is not
 * worse than fewer, and "active for 40 minutes" is not a hazard — it is ordinary
 * delegated work. Green/amber/red mean a danger or warning LEVEL (§0 Q6 of
 * WORKER-BRIEF-V3), and nothing on this card has one: the projection cannot even
 * say whether a child is still alive, so painting the tile would assert a
 * severity this data does not support. The first build escalated the figure to
 * `warn` past 30 minutes of logged active time; that threshold (and the constant
 * `LONGEST_ACTIVE_WARN_MS` that held it) was WITHDRAWN in this revision — see the
 * README §5. There is no `valueTone` call left in this file, and every row is
 * either the default label colour or `muted` for a genuinely missing reading.
 *
 * HEAD LADDER (BRIEF §2): blue 13px title (`card.subagent.title`), the 20px
 * figure (`headAfter.big` — never `value`, which the renderer would push into the
 * body a second time), the grey caption under it. THE CAPTION NAMES ITSELF: it
 * prints 「最久活跃 47m56s」, not a bare duration — the first build printed
 * 「活跃时长 47m56s」 and the owner's verdict was that nobody but the author knows
 * whose duration that is. When the projection published no `activeMs` at all the
 * caption changes subject to the AGE OF THE OLDEST CHILD (「最早 … 前创建」), which
 * is the one other whole-card statement `createdAt` can always support; with
 * neither reading the line is omitted rather than faked. Both are statements about
 * ALL children (the longest / the oldest), which is why they live in the head and
 * not in a row.
 *
 * THE TWO ROWS (breakdown, ≤3 per BRIEF §2) — both are IDENTITY readings:
 *   1. 持续型 → how many are `mode: 'continuable'`, written as `n / total` because
 *               "2 continuable" alone cannot be read without the denominator.
 *   2. 最近   → the label of the NEWEST child that has one, carried in the LABEL
 *               column (`最近 <label>`), with that child's AGE as the reading; `—`
 *               (muted) when no child is labelled.
 * A missing reading prints `—` + `tone: 'muted'` and NEVER vanishes: a row that
 * disappears silently changes the card's line count between renders. There is
 * deliberately NO third row — see the README §4 for the two candidates that were
 * rejected (the one-shot count is the complement of row 1; a second label row
 * prints the same child twice whenever only one child carries a label).
 *
 * WHY ROW 2'S IDENTITY IS IN THE LEFT COLUMN — measured, not taste. The breakdown
 * grid is `1fr auto` (label track, value track). Putting the child's label in the
 * VALUE track let a long label size that track to 245px inside a 124px content box:
 * the label track collapsed to `0px`, so both row labels vanished and row 1's
 * figure was pushed off the card (`.tmp-subagent-dom.cjs` dump of the first
 * build: `gridTemplateColumns: "0px 245.203px"`). The renderer's own answer to
 * long text is the LABEL track's right-edge fade (nowrap + mask — see
 * breakdown.tsx), so the identity belongs there: any length then fades instead of
 * stealing the grid, and the fixed vocabulary (持续型 / 最近) stays readable. The
 * tool card's 「正在执行 <name>」 row reads the same way, for the same reason.
 *
 * `label` IS CAPPED BUT NOT ELLIPSIZED. The renderer's mask fade is what truncates
 * visually; this widget only bounds the string it hands over so a pathological
 * label cannot ship a paragraph into the DOM. It deliberately does NOT append `…`,
 * which would put a second truncation mark inside an already-faded line.
 *
 * THE AGE IN ROW 2 IS NOT "how long it was active". It is how long ago that child
 * APPEARED — the identity of the newest delegation, placed in time. The card's
 * only activity-duration reading is the grey caption, and it says so.
 *
 * `activeMs` COMES FROM THE SHARED CONTRACT NOW. `SubagentEntry.activeMs` is
 * declared in `contract/types.ts` and filled by `normalizeSubagents()` from the
 * client session list (the parent cannot read a child's `subagentTiming` through
 * its own projection). The local `SubagentEntry & { activeMs?: number }` widening
 * the first build needed is gone; the render still defends against a malformed
 * value (`finiteOrNull`) because a card must never put `NaN` on the tile.
 *
 * CLOCK: `render` reads `Date.now()` — the one impurity BRIEF §3 allows — because
 * the created-at fallback and row 2's age are DISTANCES (「最早 48m 前创建」), and a
 * distance only exists relative to now. It is read once per render and never
 * stored.
 *
 * NO `source` IN THE MANIFEST: `subagents` is a synchronous session projection
 * (`stats.subagents`), not an async route — there is nothing to wait for and no
 * loading silhouette to declare.
 *
 * 2×2 ONLY: two rows plus the head spend ~126 of the 150px budget (pad 30 + head 61
 * + rows 35 — measured, the same posture cache / tool / context ship), so the wide
 * variant would buy nothing.
 */

/** The em dash a row without a reading shows — the repo's placeholder (task / tool /
 *  quota-manage), never a fabricated 0. A 0 would say "no active time was logged",
 *  which is only true when the projection actually published a 0. */
const DASH = '—'

/** Upper bound on the label characters this widget hands to the renderer. The
 *  visible truncation is the breakdown's right-edge fade on the LABEL track; this
 *  cap only keeps a runaway label out of the DOM. 48 chars is well past the ~7 CJK
 *  glyphs a 2×2 label track can show, so nothing readable is ever cut by it. */
const MAX_LABEL_CHARS = 48

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
  const all = Array.isArray(stats.subagents) ? stats.subagents : null
  // `null` = the projection is ABSENT (this deployment composes no session
  // controller): the card's precondition does not exist, so it hides — the one
  // legitimate `null` (WORKER-BRIEF-V3 §0 Q5 case (a)).
  if (all === null) return null
  // `[]` = the projection ANSWERED, with no children. That is a reading (0), not an
  // absence, so the card stays on the rail with a quiet line: an installed card that
  // appears and disappears changes the deck's shape under the owner's hands
  // (his rule, 2026-09-29 — "我平时没放这个组件为什么莫名其妙弹出来打乱我的布局了").
  // This is the integration edit; the builder had it returning null for both.
  if (all.length === 0) {
    return {
      title: t('card.subagent.title'),
      headAfter: { big: '0' },
      legend: t('card.subagent.none'),
      bodyAnchor: 'bottom',
    }
  }
  const now = Date.now()
  const noActive = meta?.sim?.noActive === true

  // The longest ACTIVE TIME (0 is a real reading — a child that logged no turns yet
  // — so the test is `>= 0`, not `> 0`). This is the card's ONLY activity-duration
  // reading and it lives in the caption, where it is labelled 最久活跃.
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
  let latest: SubagentEntry | null = null
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
  // Row 2's reading is that child's AGE — how long ago the newest delegation
  // APPEARED, which is not an activity duration (see the file header), and the one
  // short, true figure about it that is not already in the caption (a statement
  // about the OLDEST child). A missing timestamp leaves the identity row standing
  // with `—` rather than guessing a duration.
  const latestAgo = latest !== null && Number.isFinite(latestAt)
    ? fmtAgo(new Date(latestAt).toISOString(), now)
    : null

  const rows: DetailRow[] = [
    // The denominator is the point of this row: "2 持续型" cannot be read without it.
    { label: t('card.subagent.continuable'), value: `${continuable} / ${all.length}` },
    latest === null
      ? { label: t('card.subagent.recent'), value: DASH, tone: 'muted' }
      : {
          // Identity in the LABEL track (faded there, see the file header for the
          // measured reason); the fixed 最近 vocabulary rides in front of it, exactly
          // like 工具调用's 「最慢 <name>」 rows.
          label: `${t('card.subagent.recent')} ${clipLabel(latest.label ?? '')}`,
          ...(latestAgo === null ? { value: DASH, tone: 'muted' as const } : { value: t('card.subagent.ago', { ago: latestAgo }) }),
        },
  ]

  return {
    title: t('card.subagent.title'),
    // The figure is how MANY children exist — the only liveness-free number this
    // projection can promise (see the file header). `value` stays unset: with a
    // `headAfter` head it would render the same idea a second time in the body.
    // Deliberately uncoloured: a count of delegations is not a severity level.
    headAfter: { big: String(all.length) },
    ...(caption === null ? {} : { legend: caption }),
    // Bottom-anchored like every other card of this family: the rows sit on the
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
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
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
  // treatment at once: a labelled child with a long active time (the caption's
  // 最久活跃 branch), a mixed one-shot / continuable roster (「2 / 4」 rather than an
  // unreadable 0 or a degenerate 4 / 4), and a long label — the label is what the
  // right-edge fade is judged on, so it is written as the sentence a real agent
  // would produce. NOTE the absence of any colour: the longest child here sits at
  // 36m12s, past the withdrawn 30-minute threshold, so this preview is exactly the
  // case that used to paint the figure amber — if a screenshot ever shows amber
  // again, the escalation came back.
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
      ] satisfies SubagentEntry[],
    },
    // 有活跃时长 first (`sim` must be one of `simSteps`, or the first click is a
    // silent no-op — see WidgetExample).
    sim: { noActive: false },
    simSteps: [{ noActive: false }, { noActive: true }],
  },
})
