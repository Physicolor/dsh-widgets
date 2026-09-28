import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtAgo, fmtTokens } from '../../client/lib/format'

/**
 * 上下文压缩 — the meter, the one-click compact button, and what folding actually
 * reclaimed, in ONE card.
 *
 * The two halves were shipped separately for a day (一键压缩 showed the percent and
 * the corner button; a 上下文压缩 card reported the folds) and the owner merged them
 * on 2026-09-28: they are one story told twice, and a rail slot is worth more than
 * the split. The button therefore moved to the TOP-RIGHT corner (it used to sit
 * bottom-right to stay clear of a head that had nothing beside it) and the rest of
 * the card carries the information: the meter as the figure, the fold history as
 * three rows.
 *
 * The card ALWAYS renders when a session exists — it owns an action, and a button
 * that disappears with its data is worse than rows showing `—`. A session that has
 * never compacted prints 压缩次数 0 with `—` (muted) for the two figures that have
 * no reading yet; the SAME three rows are what a reviewable preview fills from the
 * widget's own example.
 */
function contextRender(
  stats: Parameters<ReturnType<typeof defineWidget>['render']>[0],
): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const p = stats.contextPercent
  const pct = p == null ? null : Math.round(p * 100)
  const armed = stats.armedAction === 'contextCompact'
  const c = stats.compactions ?? null
  // `count > 0` is the whole test: the collector hands over null when this session
  // has folded nothing, so "no reading yet" and "nothing to read" are the same
  // state here (unlike a count that is genuinely 0 after a fold).
  const folded = c !== null && c.count > 0
  const dash = { value: '—', tone: 'muted' as const }
  const rows = [
    { label: t('card.context.folds'), value: c === null ? '0' : String(c.count) },
    { label: t('card.context.reclaimed'), ...(folded ? { value: fmtTokens(c.reclaimed) } : dash) },
    { label: t('card.context.items'), ...(folded ? { value: String(c.items) } : dash) },
  ]
  return {
    title: t('card.context.title'),
    // The head reads as a ladder: blue title, then the meter as the figure, then the
    // grey caption under it (the owner's order, 2026-09-28). `headAfter` is what
    // stacks the figure under the title; `value` is deliberately NOT set (it would
    // be pushed into the body a second time), and `bodyAnchor: 'bottom'` keeps the
    // three rows on the card's floor so the leftover height lands between the
    // caption and the rows instead of under them.
    headAfter: pct == null ? { small: t('card.context.waiting') } : { big: `${pct}%` },
    ...(folded ? { legend: t('card.context.recent', { ago: fmtAgo(new Date(c.recent[0]!.at).toISOString()) }) } : {}),
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown: rows },
    corner: { id: 'contextCompact', label: t('card.context.compact'), armedLabel: t('card.context.confirm'), armed, pos: 'top' },
  }
}

export default defineWidget({
  id: 'context',
  name: () => t('widget.context.name'),
  desc: () => t('widget.context.desc'),
  builtin: true,
  group: 'system',
  render: contextRender,
  // Preview data for the fold rows: a session that has never compacted shows `—`,
  // which is correct but says nothing about the layout, so the previews fill the
  // three rows from here (the live record wins the moment a fold exists).
  example: {
    stats: {
      compactions: {
        count: 2,
        reclaimed: 340_000,
        items: 47,
        recent: [
          { at: Date.now() - 240_000, reclaimed: 180_000, items: 24 },
          { at: Date.now() - 1_500_000, reclaimed: 160_000, items: 23 },
        ],
      },
    },
  },
})
