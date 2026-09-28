/** The `ring` chart — one donut with the value in its middle. */

import * as React from 'react'
import { Donut } from './donut'
import type { ChartProps } from './types'

export function RingChart({ chart, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'ring') {
    const text = chart.valueLabel ?? `${chart.value ?? 0}%`
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
      React.createElement(Donut, {
        // Shipped geometry, unchanged: radius 22·scale, inset 2, stroke 3, and the
        // centre label at 13·scale in the primary label colour.
        radius: 22 * scale,
        ratio: (chart.value ?? 0) / (chart.max ?? 100),
        center: React.createElement('span', { style: { fontSize: `${Math.round(13 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums' } }, text),
      }),
    )
  }
  return null
}
