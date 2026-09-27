/** The `barsV` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function BarsVChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'barsV' && chart.bars) {
    // Vertical last-N-days bars (default 7). The bar AREA height EXACTLY matches
    // the 2×2 heatmap calendar's content height (7 rows → 7*cell + 6*2px gaps),
    // so the bars occupy the same vertical footprint as the day-rows they
    // replace. Bars grow up from the floor; only the FIRST (left) and LAST
    // (right) date labels are drawn, on the bottom corners. Bar width: 93% of
    // the column ≈ 1.5× the previous 62% (user preference).
    const cell = Math.round((6 + 2) * scale) // same cell size as the heatmap
    const barAreaH = 7 * cell + 6 * 2         // = heatmap content height
    const labelH = Math.round(10 * scale)
    const barMax = Math.max(1, ...chart.bars.map((b) => b.value))
    const last = chart.bars.length - 1
    const bars = chart.bars.map((b, i) => {
      const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / barMax))
      const tone = CHART_TONES[b.tone ?? 'primary'] ?? CHART_TONES.primary
      const active = (b.value ?? 0) > 0
      // Only the first and last columns carry a date label (bottom corners);
      // middle columns keep an empty spacer so they stay evenly sized.
      const label = (i === 0 || i === last) ? b.label : ''
      return React.createElement('div', { key: i, title: `${b.label}: ${b.value} tok`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' } },
        React.createElement('div', { style: { width: '93%', maxWidth: Math.max(6, Math.round(21 * scale)), height: active ? `${Math.max(2, Math.round((barAreaH - labelH) * ratio))}px` : `${Math.max(2, Math.round(3 * scale))}px`, borderRadius: 4, background: tone, opacity: active ? 0.85 : 0.18 } }),
        // nowrap: a two-digit day ("9.11") is wider than its ~15px column, and
        // wrapping it into "9.1" / "1" made the label two lines tall — which
        // pushed the bars up and overflowed the 150px card (measured over CDP).
        // The label only exists on the first/last columns, so the spill is
        // symmetric and stays inside the card's padding.
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, minHeight: labelH, whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-end' } }, label),
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: `${barAreaH}px`, marginTop: `${Math.round(4 * scale)}px` } }, bars)
  }
  return null
}