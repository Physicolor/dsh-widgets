/** The `rings` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { CHART_TONES } from './theme'
import type { ChartProps } from './types'

export function RingsChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'rings' && chart.rings && chart.rings.length) {
    // Several donuts side by side (e.g. OpenCode rolling/weekly/monthly usage,
    // or the CPU/GPU system rings). The centre stays clean — no in-ring text —
    // so each ring can be drawn thick and full. Below the ring: the percent;
    // when the ring carries a label the percent and label share ONE row
    // ("43% CPU") — the 2×4 board has room for names horizontally, and
    // label-less rings (usage-rings) keep just the percent.
    const pad = Math.round(8 * scale)
    const mg = Math.round(12 * scale) // inter-ring gap = the card inner padding itself
    const avail = (width ?? side) - 2 * pad
    const r = Math.max(10, Math.min(24 * scale, (avail - (chart.rings.length - 1) * mg) / (chart.rings.length * 2)))
    const sw = Math.max(3.5, Math.round(5 * scale))
    const items = chart.rings.map((rg, i) => {
      const p = Math.max(0, Math.min(1, rg.ratio ?? rg.value / (chart.max ?? 100)))
      const c = 2 * Math.PI * (r - sw / 2)
      const tone = CHART_TONES[rg.tone ?? 'primary'] ?? CHART_TONES.primary
      const hasLabel = typeof rg.label === 'string' && rg.label.length > 0
      // Optional per-datum precision: a family that needs a finer figure asks
      // for it here (Command Code windows -> 1 decimal, e.g. 7.8%); every
      // other ring chart keeps the default whole number.
      const dec = typeof rg.decimals === 'number' && Number.isFinite(rg.decimals) ? Math.max(0, Math.min(2, Math.trunc(rg.decimals))) : 0
      const valueText = `${rg.value.toFixed(dec)}%`
      const labelRow = hasLabel
        ? React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap', maxWidth: '100%' } },
            React.createElement('span', { style: { fontSize: `${Math.round(11 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 } }, valueText),
            React.createElement('span', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis' } }, rg.label),
          )
        // nowrap: the percent sits in a ~34px cell on a 3-ring card, and "25.4%"
        // is ~32px wide — without nowrap the "%" breaks onto a second line, which
        // both doubles the caption's height (the ring row is bottom-aligned, so it
        // pushed the whole chart up) and read as a malformed figure. Measured on
        // the Command Code 窗口 card at 150px: value box 11px/1 → 2 lines.
        : React.createElement('div', { style: { fontSize: `${Math.round(11 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, whiteSpace: 'nowrap' } }, valueText)
      // Ring → caption spacing: 4px (same rhythm as bar → label in the bars
      // charts). The 2px gap used to glue the percent text to the ring; the
      // thicker visual breathing matters most on the 2×4 board's small rings.
      return React.createElement('div', { key: i, title: `${rg.name ?? rg.label} ${valueText}`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(4 * scale) } },
        React.createElement('svg', { width: Math.round(r * 2), height: Math.round(r * 2), viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`, 'aria-hidden': true },
          React.createElement('circle', { cx: r, cy: r, r: r - sw / 2, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: sw }),
          React.createElement('circle', { cx: r, cy: r, r: r - sw / 2, fill: 'none', stroke: tone, strokeWidth: sw, strokeDasharray: `${c * p} ${c}`, transform: `rotate(-90 ${r} ${r})`, strokeLinecap: 'round' }),
        ),
        labelRow,
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: mg } }, items)
  }
  return null
}