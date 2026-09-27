/** The `quotas` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function QuotasChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'quotas' && chart.quotas && chart.quotas.length > 0) {
    // The official site's limit rows (user's reference, 2026-09-20): each window
    // is a line with its NAME on the left and its PERCENT hard right, over a
    // SEGMENTED bar — 24 cells, the used share filled at the window's urgency
    // tone, the rest a pale wash of the same tone (not a grey track: the site's
    // empty cells read as "quota left", not as a different widget). Discrete
    // cells make the reading coarse on purpose: 1% of a 5-hour window is one
    // cell, which a smooth 126px bar could not show at all.
    const CELLS = 24
    const cellH = Math.max(5, Math.round(9 * scale))
    const rows = chart.quotas.map((q, i) => {
      const pct = Math.max(0, Math.min(100, q.pct))
      const filled = Math.max(0, Math.min(CELLS, Math.round((pct / 100) * CELLS)))
      const tone = CHART_TONES[q.tone ?? 'primary'] ?? CHART_TONES.primary
      const cells = Array.from({ length: CELLS }, (_, c) => React.createElement('div', {
        key: c,
        style: {
          flex: 1,
          minWidth: 0,
          height: `${cellH}px`,
          borderRadius: 2,
          background: tone,
          opacity: c < filled ? 0.92 : 0.14,
        },
      }))
      // Height budget (2×2 = 150px): padding 24 + title 16 + headAfter 4+25 = 69,
      // leaving 81 for the three rows — so each row is a 9px label line, a 2px
      // gap and a 9px bar ≈ 21px, and the rows are 5px apart (3·21 + 2·5 = 73).
      // A 10/3/7 version measured 100px and clipped the last bar against the
      // card floor. At side 200 (the market stage) every term scales with it.
      return React.createElement('div', { key: i, style: { display: 'flex', flexDirection: 'column', gap: Math.round(2 * scale) } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, minWidth: 0 } },
          React.createElement('span', { style: { fontSize: `${Math.round(9 * scale)}px`, lineHeight: 1.15, fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, q.label),
          React.createElement('span', { style: { fontSize: `${Math.round(9 * scale)}px`, lineHeight: 1.15, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none' } }, `${Math.round(pct)}%`),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 2, width: '100%' } }, ...cells),
      )
    })
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: Math.round(5 * scale), width: '100%' } }, ...rows)
  }
  return null
}