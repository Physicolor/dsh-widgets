/**
 * The donut geometry shared by the `ring` chart and the head ring.
 *
 * Extracted so the head ring (`WidgetRenderOut.headRing`) and the body ring
 * (`chart.kind === 'ring'`) cannot drift apart: both draw the same track, the same
 * round-capped progress arc from 12 o'clock, and the same centred middle slot.
 * Every number is caller-supplied, so the body ring keeps its exact shipped
 * geometry (radius 22·scale, inset 2, stroke 3, a 13·scale text label).
 *
 * NOT shared with `rings.tsx` (the multi-ring row): those deliberately have NO
 * middle content, a thicker stroke, a width-derived radius and their percent
 * printed UNDER each ring — sharing this component would change them, not unify
 * them.
 */

import * as React from 'react'
import { cappedArcInk } from '../../lib/arc'
import { CHART_TONES } from './theme'

/** What a donut needs to draw itself. */
export interface DonutProps {
  /** Outer radius in px (the box is `round(radius * 2)` square). */
  radius: number
  /** Fraction filled, 0..1 (clamped; NaN draws an empty ring). */
  ratio: number
  /** Arc colour token name; defaults to brand blue. */
  tone?: string
  /** Arc thickness (px). */
  stroke?: number
  /** Distance from the box edge to the ring's centerline (px). */
  inset?: number
  /** Middle content (a text label, an icon, or nothing). */
  center?: React.ReactNode
  /** Hover text for the whole ring (the precise figure, never drawn). */
  title?: string
  /** Minimum daylight (px) between the two round caps below 100%; scaled by caller.
   *  See `cappedArcInk`: without it the caps merge and a 99% ring reads as closed. */
  capGap?: number
}

export function Donut({ radius, ratio, tone = 'primary', stroke = 3, inset = 2, center, title, capGap = 2 }: DonutProps): React.ReactElement {
  const p = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
  const box = Math.round(radius * 2)
  const r = radius - inset
  const c = 2 * Math.PI * r
  const ink = cappedArcInk(p, c, stroke, capGap)
  return React.createElement('div', { title, style: { position: 'relative', width: `${box}px`, height: `${box}px`, flex: 'none' } },
    React.createElement('svg', { width: box, height: box, viewBox: `0 0 ${box} ${box}`, 'aria-hidden': true },
      React.createElement('circle', { cx: radius, cy: radius, r, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: stroke }),
      React.createElement('circle', {
        cx: radius,
        cy: radius,
        r,
        fill: 'none',
        stroke: CHART_TONES[tone] ?? CHART_TONES.primary,
        strokeWidth: stroke,
        strokeDasharray: `${ink} ${c}`,
        transform: `rotate(-90 ${radius} ${radius})`,
        strokeLinecap: 'round',
      }),
    ),
    center === undefined || center === null
      ? null
      : React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, center),
  )
}
