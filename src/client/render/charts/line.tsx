/** The `line` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import type { ChartProps } from './types'

export function LineChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'line' && chart.line) {
    // Windows-task-manager style utilization sparkline: a filled area under a
    // polyline. A proportional 100×100 viewBox stretches via preserveAspectRatio
    // none, so the stroke uses vector-effect non-scaling-stroke to stay
    // crisp. Null samples break the line into independent segments.
    // ELASTIC height: this container is flex:1 inside a stretch body (see
    // CardBody's `stretchChart`), so the sparkline eats whatever vertical
    // space the card has left after the fixed rows — at any side size /
    // magnification the card NEVER bursts its box. With a fixed height the
    // sys-gpu-line card totalled ≈178px (value + sub + 68px chart) and burst
    // the 150px box on hover. The bottom time-labels stay fixed (flex:none).
    const labelH = Math.round(10 * scale)
    const max = Math.max(1, chart.line.max ?? 100)
    const vals = chart.line.values
    const W = Math.max(1, vals.length - 1)
    const X = (i: number): number => (W === 0 ? 0 : (i / W) * 100)
    // The stroke must never ride the plot's edge. A 0% sample (an idle GPU is the
    // every-day case) put the polyline EXACTLY on the box's bottom, and the
    // box's overflow:hidden cut its lower half — measured 2026-09-20 on the live
    // 利用率 card: polyline bottom 754.0 == svg bottom 754.0 with a 2px stroke,
    // i.e. the "截断" the user reported. The line therefore lives inside
    // [PAD, 100 − PAD] while the AREA still closes on the true floor (y = 100),
    // so the fill reaches the box and the stroke stays whole.
    const PAD = 3
    const Y = (v: number): number => PAD + (100 - 2 * PAD) * (1 - (Math.max(0, Math.min(max, v)) / max))
    const segs: Array<Array<[number, number]>> = []
    let cur: Array<[number, number]> = []
    vals.forEach((v, i) => {
      if (v === null || v === undefined || !Number.isFinite(v)) {
        if (cur.length > 1) { segs.push(cur); cur = [] }
        return
      }
      cur.push([X(i), Y(v)])
    })
    if (cur.length > 1) segs.push(cur)
    const tone = 'var(--dsw-alias-state-business-primary)'
    const fill = 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)'
    const areaPaths = segs.map((seg, si) => {
      const d = seg.map(([x, y], pi) => `${pi === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
        + ` L${seg[seg.length - 1][0].toFixed(2)} 100 L${seg[0][0].toFixed(2)} 100 Z`
      return React.createElement('path', { key: `a${si}`, d, fill, stroke: 'none' })
    })
    const polylines = segs.map((seg, si) =>
      React.createElement('polyline', { key: `p${si}`, points: seg.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '), fill: 'none', stroke: tone, strokeWidth: Math.max(1, Math.round(1.6 * scale)), strokeLinejoin: 'round', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }),
    )
    const labels = chart.line.labels ?? ['', '']
    // gap: 3 keeps the same sparkline→time-label spacing as the barsV bars
    // (bar→date label gap 3). The svg canvas fills the flexible middle row.
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, minHeight: 0, flex: 1 } },
      React.createElement('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden' } },
        React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': true },
          ...areaPaths, ...polylines,
        ),
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', minHeight: labelH, flex: 'none', fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1 } },
        React.createElement('span', { style: { whiteSpace: 'nowrap' } }, labels[0]),
        React.createElement('span', { style: { whiteSpace: 'nowrap' } }, labels[1]),
      ),
    )
  }
  return null
}