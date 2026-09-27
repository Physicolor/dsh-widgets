/** The `bars` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function BarsChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  // Bar height: a proportion of the card scale, computed here because `bars` is its
  // only consumer (it used to sit next to `scale` in ChartBlock's preamble).
  const h = Math.round(56 * scale)
  if (chart.kind === 'bars' && chart.bars) {
    // Three-window OpenCode usage bars. Each column flexes to an equal share of
    // the card width (same elastic columns as the daily token bars, barsV) with
    // the same 4px gutter; each bar fills ~60% of its column so the width
    // (≈24px on a 2×2 card) stays proportionate to its 56px height — wide
    // enough to feel solid, narrow enough to read as a bar, not a block. The
    // corners are fully rounded (5px) — without a baseline track underneath,
    // square bottoms read as overly sharp. No value labels on the bars by
    // design (small-chart convention: labels are chartjunk); the exact percent
    // surfaces on hover via the title tooltip.
    const items = chart.bars.map((b, i) => {
      const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / (chart.max ?? 100)))
      const tone = CHART_TONES[b.tone ?? 'primary'] ?? CHART_TONES.primary
      const pct = Math.round(b.value ?? ratio * 100)
      return React.createElement('div', { key: i, title: `${b.label} ${pct}%`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } },
        React.createElement('div', { style: { width: '100%', height: `${h}px`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' } },
          React.createElement('div', { style: { width: '60%', height: `${Math.max(2, Math.round(h * ratio))}px`, borderRadius: 5, background: tone, opacity: ratio >= 0.95 ? 0.9 : 0.85 } }),
        ),
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap' } }, b.label),
      )
    })
    // Faint 25/50/75% reference lines behind the bars (overlap the bar area
    // only, never the labels), so each bar's height can be eyeballed against a
    // quarter scale without any value labels on the bars themselves.
    const gridLines = [0.25, 0.5, 0.75].map((p) =>
      React.createElement('div', { key: p, 'aria-hidden': true, style: { position: 'absolute', left: 0, right: 0, top: `${h * (1 - p)}px`, borderTop: '1px dashed var(--dsw-alias-label-tertiary)', opacity: 0.3, pointerEvents: 'none' } }),
    )
    return React.createElement('div', { style: { position: 'relative' } },
      ...gridLines,
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, position: 'relative' } }, items),
    )
  }
  return null
}