/** The `ring` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function RingChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'ring') {
    const p = Math.max(0, Math.min(1, (chart.value ?? 0) / (chart.max ?? 100)))
    const r = 22 * scale
    const c = 2 * Math.PI * r
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
      React.createElement('div', { style: { position: 'relative', width: `${Math.round(r * 2)}px`, height: `${Math.round(r * 2)}px` } },
        React.createElement('svg', { width: Math.round(r * 2), height: Math.round(r * 2), viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`, 'aria-hidden': true },
          React.createElement('circle', { cx: r, cy: r, r: r - 2, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: 3 }),
          React.createElement('circle', { cx: r, cy: r, r: r - 2, fill: 'none', stroke: CHART_TONES.primary, strokeWidth: 3, strokeDasharray: `${c * p} ${c}`, transform: `rotate(-90 ${r} ${r})`, strokeLinecap: 'round' }),
        ),
        React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${Math.round(13 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, chart.valueLabel ?? `${chart.value ?? 0}%`),
      ),
    )
  }
  return null
}