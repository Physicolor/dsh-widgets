/** The `figures` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function FiguresChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'figures' && ((chart.figures && chart.figures.length) || (chart.figureRows && chart.figureRows.length))) {
    // A row of label-over-value figure pairs (e.g. the quota card's 今日用量
    // 24.7M / 今日推荐 200M). No axes, no bars — the two numbers ARE the block,
    // in the space a chart would have taken.
    //
    // `figureRows` stacks SEVERAL such rows (a 2×4 is wide enough to carry two
    // rows of five where one row of ten would leave every label ellipsized).
    // Each row keeps the single-row geometry, so a stacked card reads as the
    // same block repeated rather than a new chart.
    //
    // SPACING — `| 1 | 1 | 1 |`, i.e. EVERY space equal (the user's own notation,
    // 2026-09-25). Earlier shapes each failed one half of that:
    //   * `space-between` — equal gaps between blocks but the OUTER insets were
    //     the card's padding, so the edges read tighter than the middle;
    //   * `flex: 1` + fixed gap — equal COLUMNS, but a wide value ("107m31s")
    //     filled its column while a narrow one ("9") floated, so the perceived
    //     gaps differed row by row.
    // SPACING — `| 1 | 1 | 1 |`: EVERY visible space equal (the user's notation,
    // 2026-09-25). Three shapes were tried, each failing one step further out:
    //   * `space-between` — equal gaps between blocks, but the outer insets were
    //     the card's padding, which reads tighter than the middle;
    //   * `flex: 1` + fixed gap — equal COLUMNS, so a wide value filled its
    //     column while a narrow one floated and the perceived gaps differed;
    //   * `space-evenly` alone — equalised the spaces past the padding, but the
    //     padding was still added to the outer two: on the live rail the card
    //     edge→「轮次」measured 40px against 27px between「轮次」and「LLM」.
    // So the row spans the card's FULL width — negative margins swallow the
    // padding — and `space-evenly` divides the leftover into n+1 equal spaces,
    // the outer two included: the edge gap IS the inter-block gap.
    const padAmt = pad ?? Math.round(12 * scale)
    const rowWidth = `calc(100% + ${2 * padAmt}px)`
    const drawRow = (figures: NonNullable<typeof chart.figures>, key: number): React.ReactElement => {
      const items = figures.map((f, i) => {
        const valColor = f.tone ? (CHART_TONES[f.tone] ?? CHART_TONES.primary) : 'var(--dsw-alias-label-primary)'
        return React.createElement('div', { key: i, style: { flex: '0 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(2 * scale) } },
          React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } }, f.label),
          // The value ellipsizes rather than spilling into its neighbours when a
          // row is genuinely too tight (a 2×2 with two long figures).
          React.createElement('div', { style: { fontSize: `${Math.round(13 * scale)}px`, fontWeight: 600, color: valColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' } }, f.value),
        )
      })
      return React.createElement('div', { key, style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-evenly', width: '100%' } }, items)
    }
    // ONE wrapper always, so the widened box is applied exactly once (a per-row
    // negative margin inside a widened wrapper would double the padding back).
    const rows = chart.figureRows && chart.figureRows.length ? chart.figureRows : [chart.figures ?? []]
    return React.createElement('div', { style: {
      display: 'flex',
      flexDirection: 'column',
      gap: rows.length > 1 ? Math.round(6 * scale) : 0,
      width: rowWidth,
      marginLeft: -padAmt,
      marginRight: -padAmt,
    } },
      rows.map((row, i) => drawRow(row, i)),
    )
  }
  return null
}