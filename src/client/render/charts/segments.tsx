/** The `segments` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import type { ChartProps } from './types'

export function SegmentsChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'segments' && chart.segments && chart.totalTokens) {
    // Strictly mirrors the official ContextMeter (JObwrW) colors + layout:
    // system = bluish-neutral, tools = violet literal, messages = blue.
    //
    // 2×2 HEIGHT BUDGET: this is the only chart whose body is 3 stacked legend
    // rows, so its content is what sizes the card. The 150px slot spends 26 on
    // padding+border, 16 on the title and 29 on the headAfter row (2 margin +
    // the 20px figure's line box), leaving 79px for the bar + 3 rows; the
    // initial 85px therefore swelled the card to 156 and let it overlap the
    // next row of the rail. Two deterministic cuts bring it to 76:
    //   - the legend rows carry an EXPLICIT 1.2 line-height, so the row box no
    //     longer depends on the user's UI font stack (the inherited `normal`
    //     resolved to a 16px line box = 20px per row, and any font with looser
    //     metrics would have made the overflow worse);
    //   - the bar's bottom gap drops 10 -> 6 (its top gap stays 8, which is the
    //     visual separation from the figure above it).
    // Measured over CDP in Edge (Segoe UI / YaHei stack): chart 76.17 vs 79
    // available, i.e. ≈2.8px of slack instead of 6px of overflow (the live UI
    // reported 5px over the 150px slot; the fixture reproduces 6px).
    const officialColors = ['var(--dsw-static-neutral-bluish-400)', 'rgb(167, 139, 250)', 'var(--dsw-static-blue-450)']
    const total = chart.totalTokens
    const fmt = (n: number): string => {
      const k = n / 1000
      if (k >= 1000) return `~${(Math.round((k / 1000) * 10) / 10)}M`
      if (k >= 100) return `~${Math.round(k)}K`
      if (k >= 10) return `~${(Math.round(k * 10) / 10)}K`
      if (k >= 1) return `~${(Math.round(k * 10) / 10)}K`
      return `~${n}`
    }
    const bar = chart.segments.map((s, i) => {
      const w = total > 0 ? Math.max(2.2, (s.tokens / total) * 100) : 0
      const tint = officialColors[i % officialColors.length] ?? officialColors[0]
      return React.createElement('div', { key: i, style: { width: `${w}%`, height: '100%', borderRadius: 0, background: tint, flex: 'none', minWidth: 2 } })
    })
    const rows = chart.segments.map((s, i) => {
      const tint = officialColors[i % officialColors.length] ?? officialColors[0]
      return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 0', fontSize: `${Math.round(12 * scale)}px`, lineHeight: 1.2 } },
        React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--dsw-alias-label-secondary)' } },
          React.createElement('span', { 'aria-hidden': true, style: { width: 8, height: 8, borderRadius: 2, background: tint, flex: 'none' } }),
          s.label,
        ),
        React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none', color: 'var(--dsw-alias-label-primary)' } }, fmt(s.tokens)),
      )
    })
    const bh = Math.max(4, Math.round(5 * scale))
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
      // Rectangle (non-capsule) segmented bar — segments tile edge-to-edge.
      React.createElement('div', { style: { display: 'flex', gap: 1, margin: '8px 0 6px', height: bh, borderRadius: 0, background: 'var(--dsw-alias-interactive-bg-hover)', overflow: 'hidden' } }, bar),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 2 } }, rows),
    )
  }
  return null
}