import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 任务 — the todo LIST card. It ABSORBED the old 任务 count card on 2026-09-28 (the
 * owner's call: the count card said "3 pending" without ever naming one of them, and
 * two cards named 任务 in one market is not a product).
 *
 * The merge keeps this unit's id (`task`), order (22) and install semantics, so an
 * already-installed `task@2x2` upgrades IN PLACE: no instance is lost, and the
 * now-redundant `todo-board` unit was deleted rather than shipped beside it.
 *
 * WHY IT EXISTS: the head keeps the figures (the in-progress count as the big number,
 * the pending count beside it) and the body spends itself on the ENTRIES — which one
 * is in flight and what comes next. It reads the SAME `stats.todos` projection (a
 * synchronous read of a field that already exists — no host route, no skeleton, no
 * `source` in the manifest).
 *
 * HEAD LADDER (AGENT-BRIEF §2): the blue 13px title, the 20px figure = the
 * IN-PROGRESS count (`headAfter.big` — never `value`, which the renderer would push
 * into the body a second time), and the counts line as `headAfter.small` — the ONE
 * grey line the renderer draws to the RIGHT of the figure on its shared baseline.
 * That placement is the owner's call (2026-09-28): a figure and a legend on its own
 * line printed the same reading twice (the number, then "N 进行中 · M 待办") and cost
 * 14px of height; riding the figure's baseline is what frees the fourth row.
 * `headRing` is deliberately absent — a ring is the design language for a SHARE, and
 * "2 of 5 todos are in flight" is a count, not a share.
 *
 * HEIGHT BUDGET (against the shipped geometry, `card-geometry.ts` + `CardBody.tsx`,
 * and also against AGENT-BRIEF §2's conservative pad-15 model):
 *   pad 12 × 2 (24) + head (title 16 + HEAD_GAP 4 + figure 25 = 45)
 *   + rows (divider 1 + paddingTop 6 + 4 × 12 + 3 × 4 = 67) = 136 / 150.
 * FOUR rows is the last that fits: a FIFTH needs 83px of body where the tile has 81
 * (pad 12) — and 158 of 150 under the pad-15 model.
 *
 * EMPTY STATE (the owner's order): no todos at all renders the old card's posture —
 * `value`, which the renderer anchors to the card's FLOOR, carrying 「暂无任务」, with
 * the grey counts line NOT drawn, because a 「0 进行中 · 0 待办」 caption under a
 * 「暂无任务」 figure says the same nothing twice. The renderer plays that figure's
 * value-change transition, so the number slides down into the empty posture instead
 * of snapping (see CardBody's figure-drop). A partially filled list draws exactly
 * the entries it has (1..4) rather than padding with `—` slots: once the empty state
 * is a no-rows card, dash padding would only make a one-item list look broken.
 *
 * PREVIEW STEPPING (the owner's ask, 2026-09-28): the market / 组件配置 previews step
 * 有任务 → 无任务 on a click (`example.simSteps`, the shared mechanism 套餐 uses for
 * its plan tiers), so the empty-state swap — and the renderer's figure-drop
 * transition that plays on it — can be judged without a live session. `sim.empty`
 * WINS over the stats on purpose: `buildPreviewStats` lets a real session's todos
 * override the example, so a session with work in it would otherwise make the empty
 * state unreviewable. It is keyed on `meta.sim`, so the rail is untouched.
 *
 * ROW ORDER — 进行中 first, then 待办, then 已完成: the rows answer "what am I on and
 * what is next", which is why the leftover rows (up to four) are where a finished
 * entry appears. The sort is STABLE within a status, so the model's own list order
 * survives, and it runs on a COPY — render is a pure function and must never mutate
 * `stats`.
 *
 * TONE DIRECTION (the widget's own call, per §2): 进行中 = brand blue (work in
 * flight — the same blue as the title), 已完成 = green (finished). 待办 keeps the
 * DEFAULT label colour and is deliberately NOT 'muted': muted stays reserved for a
 * genuinely missing reading, so a real pending row can never look like a blank one.
 *
 * WHY THE 2×4 LOOKS THE SAME: a 2×4 is WIDER, not taller. `rail-view.tsx` builds
 * every item as `baseW = size === '2x4' ? 2 * side + pad : side` and seats it with
 * `height: side` (RailWave's slot style), and `CardBody`'s pinned box is
 * `height: unit` for both sizes — so both sizes share this 136px budget and these
 * four rows. What the extra width buys is the label track: ~12 CJK glyphs at 2×2 vs
 * ~25 at 2×4, i.e. the wide card reads whole todo titles where the square one cuts
 * them. A genuine two-column entry grid would need a new shared chart primitive;
 * that is not done here.
 */

/** How many detail rows the card draws at most — four fit, five do not (see the
 *  height budget above). */
const ROWS = 4

/** The em dash an entry with no title of its own shows — the same placeholder
 *  任务/工具调用 use, never a fabricated entry. */
const DASH = '—'

type TodoStatus = 'pending' | 'in_progress' | 'completed'

/** Priority order of the row pool: 进行中 → 待办 → 已完成. */
const RANK: Record<TodoStatus, number> = { in_progress: 0, pending: 1, completed: 2 }

/** The subset of a todos entry this card reads. */
interface TodoEntry {
  content: string
  status: TodoStatus
}

/** Status → the key of its word (the dictionaries live in manifest.json). */
const STATUS_LABEL: Record<TodoStatus, string> = {
  in_progress: 'card.task.doing',
  pending: 'card.task.pending',
  completed: 'card.task.done',
}

/** Status → tone (see TONE DIRECTION above); undefined = the default label colour. */
const STATUS_TONE: Record<TodoStatus, BarDatum['tone'] | undefined> = {
  in_progress: 'primary',
  pending: undefined,
  completed: 'success',
}

/** One detail row of the breakdown block. */
interface Row {
  label: string
  value: string
  tone?: BarDatum['tone']
}

/** The projection's status, with anything unrecognised treated as 待办 rather than
 *  dropped: an entry that IS in the list must never become an invisible fourth
 *  status the card silently swallows. */
function statusOf(entry: TodoEntry): TodoStatus {
  return entry.status === 'in_progress' || entry.status === 'completed' ? entry.status : 'pending'
}

/** The entry's own title, or the dash when it has none. `breakdown` renders the
 *  label nowrap and fades its right edge, so a long title is not wrapped into the
 *  next row. */
function titleOf(entry: TodoEntry): string {
  return typeof entry.content === 'string' && entry.content.trim() !== '' ? entry.content.trim() : DASH
}

function taskRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const all: TodoEntry[] = Array.isArray(stats.todos) ? stats.todos : []
  // Nothing to list: the old card's posture, on the card's floor, with the grey
  // counts line omitted (see EMPTY STATE above). Never `null` — 「暂无任务」 is a true
  // reading of an empty list, and this card owns no action button that would have to
  // stay reachable.
  //
  // `sim.empty` (the preview's click-stepped state, see PREVIEW STEPPING) is tested
  // FIRST and beats the stats on purpose: with live todos merged over the example,
  // the empty state would otherwise be impossible to review in the market.
  if (meta?.sim?.empty === true || all.length === 0) {
    return { title: t('widget.task.name'), value: t('card.task.none') }
  }
  let doing = 0
  let pending = 0
  for (const entry of all) {
    const status = statusOf(entry)
    if (status === 'in_progress') doing += 1
    else if (status === 'pending') pending += 1
  }
  // Priority order on a COPY (stable, so the model's own order survives inside a
  // status group), then the first four entries.
  const ordered = all.slice().sort((a, b) => RANK[statusOf(a)] - RANK[statusOf(b)])
  const breakdown: Row[] = ordered.slice(0, ROWS).map((entry): Row => {
    const status = statusOf(entry)
    const tone = STATUS_TONE[status]
    return { label: titleOf(entry), value: t(STATUS_LABEL[status]), ...(tone === undefined ? {} : { tone }) }
  })
  return {
    title: t('widget.task.name'),
    // The figure is the IN-PROGRESS count (the one number that changes while work
    // runs); the grey line on its baseline names that figure and carries the other
    // count, so no row of height is spent saying it a second time.
    headAfter: { big: String(doing), small: t('card.task.small', { pending }) },
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown },
  }
}

export default defineWidget({
  id: 'task',
  name: () => t('widget.task.name'),
  desc: () => t('widget.task.desc'),
  builtin: true,
  group: 'system',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2', '2x4'],
  render: taskRender,
  // A click on either preview steps 有任务 → 无任务 (the shared `simSteps` mechanism,
  // exactly as 套餐 walks its plan tiers), so the empty-state swap and its figure-drop
  // transition can be judged by eye without a live session.
  simToggle: () => t('widget.task.simToggle'),
  // Widget-owned preview data: with no live session there is no todos projection, so
  // the market / 组件配置 previews fill the rows from here (the live record wins the
  // moment a session has todos — unless the sim says 无任务, see PREVIEW STEPPING).
  // One of each status plus a second pending: with ROWS = 4 every entry is on the
  // card, so the 已完成 tone, the counts head and the priority order are all
  // reviewable. The entries are plain numbered filler (the owner's ask — the preview
  // is not a real session); 任务 3 is deliberately LONG, because it is what the
  // right-edge treatment is judged on.
  example: {
    stats: {
      todos: [
        { content: '任务 1', status: 'in_progress' },
        { content: '任务 2', status: 'pending' },
        { content: '任务 3 · 这一行故意写得很长，用来检查右端是截断还是淡出', status: 'pending' },
        { content: '任务 4', status: 'completed' },
      ],
    },
    // 有任务 first, then 无任务: `sim` must be one of the steps (the stepper finds the
    // current one by deep equality) and it is what the preview opens on.
    sim: { empty: false },
    simSteps: [{ empty: false }, { empty: true }],
  },
})
