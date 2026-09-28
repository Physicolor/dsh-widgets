/**
 * The `breakdown` chart — a label / value / optional-cost row table.
 *
 * The card the user asked for (2026-09-28, the 「Token 用量」 element): a hairline
 * divider under the head, then one row per bucket with the label flush left, the
 * figure hard right, and — when the route has a published rate — the money in a
 * third column. It is a GRID, not a flex row per line: the value and cost columns
 * must line up across rows even though the labels and figures differ in width, and
 * only a shared column track can promise that at every card side.
 *
 * The cost cell stays EMPTY when the widget did not supply one: a route with no
 * price rule must not print a confident `$0.00` (the same rule usage-center's
 * pricing module is written around).
 */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function BreakdownChart({ chart, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind !== 'breakdown' || !chart.breakdown || chart.breakdown.length === 0) return null
  const rows = chart.breakdown
  // The money column exists only when at least one row carries a cost — otherwise
  // the grid stays two-column and the labels keep the whole width.
  const priced = rows.some((r) => r.cost !== undefined && r.cost !== '')
  const font = Math.round(10 * scale)
  // A long label FADES at its right edge instead of ending in an ellipsis (the
  // owner's call, 2026-09-28). The labels here are real content — a todo title, a
  // tool name — and "…" is a punctuation mark sitting inside the reading line; a
  // fade says "there is more" without spending a glyph on it. The band scales with
  // the card so a magnified tile fades proportionally more.
  const fade = `linear-gradient(to right, #000 calc(100% - ${Math.max(6, Math.round(14 * scale))}px), transparent 100%)`
  const cells: React.ReactNode[] = []
  for (const [i, row] of rows.entries()) {
    const tone = row.tone ? CHART_TONES[row.tone] : undefined
    cells.push(React.createElement('span', {
      key: `l${i}`,
      style: {
        fontSize: `${font}px`,
        lineHeight: 1.2,
        fontWeight: 500,
        color: 'var(--dsw-alias-label-secondary)',
        minWidth: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        maskImage: fade,
        WebkitMaskImage: fade,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      },
    }, row.label))
    cells.push(React.createElement('span', {
      key: `v${i}`,
      // `pulse` wears the SAME escalation class the big figures use, so the blink
      // keyframes (and their reduced-motion opt-out) keep exactly one definition.
      className: row.pulse === true ? 'dsx-stats-card-value dsx-value-pulse' : undefined,
      style: {
        fontSize: `${font}px`,
        lineHeight: 1.2,
        fontWeight: 600,
        color: tone ?? 'var(--dsw-alias-label-primary)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        justifySelf: 'end',
      },
    }, row.value))
    if (priced) {
      cells.push(React.createElement('span', {
        key: `c${i}`,
        style: {
          fontSize: `${font}px`,
          lineHeight: 1.2,
          fontWeight: 500,
          color: tone ?? 'var(--dsw-alias-label-tertiary)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          justifySelf: 'end',
          // A reserved track: an empty cost must not collapse the column and pull
          // the figures left on the rows that DO have a price.
          minWidth: `${Math.round(30 * scale)}px`,
          textAlign: 'right',
        },
      }, row.cost ?? ''))
    }
  }
  return React.createElement('div', {
    style: {
      display: 'grid',
      width: '100%',
      gridTemplateColumns: `1fr auto${priced ? ' auto' : ''}`,
      columnGap: Math.round(8 * scale),
      rowGap: Math.round(4 * scale),
      // The divider belongs to the block, not to the card: a card whose head is
      // two lines tall (headAfter) keeps the same rhythm under it.
      borderTop: '1px solid var(--dsw-alias-border-l1)',
      paddingTop: Math.round(6 * scale),
    },
  }, ...cells)
}
