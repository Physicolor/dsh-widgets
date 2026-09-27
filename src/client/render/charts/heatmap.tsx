/** The `heatmap` chart — body moved verbatim out of ChartBlock (Phase 3.4). */

import * as React from 'react'
import { fmtShortDate } from '../../lib/format'
import type { ChartProps } from './types'

export function HeatmapChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'heatmap' && chart.heatmap && chart.heatmap.length) {
    // GitHub-style grid: each row is a week, each cell a day, tinted by amount.
    // Bottom corners carry the window's earliest (left) and latest (right)
    // dates in short month.day form (e.g. 3.2 / 8.28).
    // A wide grid (≥20 weeks, i.e. the 2×4 half-year view) auto-fits the card
    // width and is horizontally centred; the 2×2 grid keeps fixed cells.
    const weeks = chart.heatmap[0]?.length ?? 13
    const isWide = weeks >= 20
    // The card's OWN content inset (passed in), never a second constant: a
    // bigger corner gear widens the card's padding, and a heatmap still sized
    // against the old 12px would push its widest grid past the card edge.
    const inset = pad ?? Math.round(12 * scale)
    const availW = (width ?? side) - 2 * inset
    const gap = 2
    const wideCell = isWide ? Math.max(3, Math.floor((availW - (weeks - 1) * gap) / weeks)) : Math.round((6 + 2) * scale)
    const cell = wideCell
    const max = Math.max(1, ...chart.heatmap.flat().map((c) => c.value))
    // Two ramps, one `color-mix` mechanism (see WidgetChart.heatmapPalette):
    //   brand  — continuous business-blue alpha from the value's share of max;
    //   github — GitHub's five DISCRETE contribution steps, in GitHub's order
    //            (empty -> strongest), derived from the SUCCESS token so the
    //            green follows the light/dark theme instead of being a literal.
    const palette = chart.heatmapPalette ?? 'brand'
    const EMPTY_CELL = 'var(--dsw-alias-interactive-bg-hover)'
    const GITHUB_STEPS = [0, 30, 52, 74, 100]
    const unit = chart.heatmapUnit ?? 'tok'
    const cellBg = (c: { value: number; level?: number }): string => {
      if (palette === 'github') {
        const level = Math.max(0, Math.min(4, Math.round(c.level ?? (c.value > 0 ? 1 : 0))))
        return level === 0
          ? EMPTY_CELL
          : `color-mix(in srgb, var(--dsw-alias-state-success-primary) ${GITHUB_STEPS[level]}%, transparent)`
      }
      const t = max > 0 ? c.value / max : 0
      if (t <= 0) return EMPTY_CELL
      return `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${Math.round((0.25 + 0.7 * t) * 100)}%, transparent)`
    }
    const rows = chart.heatmap.map((week, wi) => {
      const cells = week.map((c) => React.createElement('div', {
        key: c.date,
        title: `${c.date}: ${c.value} ${unit}`,
        style: { width: cell, height: cell, borderRadius: 2, background: cellBg(c), opacity: c.value > 0 ? 1 : 0.5 },
      }))
      return React.createElement('div', { key: wi, style: { display: 'flex', gap: 2 } }, cells)
    })
    const first = chart.heatmap[0]?.[0]?.date
    // The grid's last cell can be this-week Saturday (rolling) or a future
    // quarter column (quarter mode), so the "latest" corner shows TODAY (the
    // true right edge of the data), never a future date.
    const nowD = new Date()
    const todayIso = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`
    const corner = (text: string | undefined, align: 'flex-start' | 'flex-end'): React.ReactElement | null => {
      if (!text) return null
      return React.createElement('span', { style: { display: 'flex', alignItems: align, fontSize: `${Math.round(8.5 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }, fmtShortDate(text))
    }
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: `${Math.round(4 * scale)}px`, alignItems: 'center', width: '100%' } },
      ...rows,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: `${Math.round(3 * scale)}px`, width: '100%' } },
        corner(first, 'flex-start'),
        corner(todayIso, 'flex-end'),
      ),
    )
  }
  return null
}