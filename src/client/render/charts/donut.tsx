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
  /** Allow a ratio ABOVE 1 (a quota that can overrun). The first lap closes the ring
   *  and the overrun is painted as a second pass from the same origin, so its round
   *  tail cap sweeps over the head — the owner's ask for 额度预测 (2026-09-29):
   *  「大于 100 则环形图尾部圆角盖过头部套圈」. Without this flag the ratio is
   *  clamped, which is what every other dial wants (a 130% cache-hit rate is not a
   *  thing, so a second lap there would be noise). */
  overshoot?: boolean
}

export function Donut({ radius, ratio, tone = 'primary', stroke = 3, inset = 2, center, title, capGap = 2, overshoot = false }: DonutProps): React.ReactElement {
  const want = Number.isFinite(ratio) ? Math.max(0, ratio) : 0
  const p = overshoot ? want : Math.min(1, want)
  const box = Math.round(radius * 2)
  const r = radius - inset
  const c = 2 * Math.PI * r
  const ink = cappedArcInk(p, c, stroke, capGap)
  // One lap is the ring; anything past it is the overrun, drawn as its own dash from
  // the same 12 o'clock origin so its round tail cap lands `overrun` of the way round.
  //
  // The overrun reads as a band lying ON TOP because its TAIL CAP — the round end — is
  // what casts a shadow, and it is the CAP'S OWN SHAPE that the shadow has to trace (the
  // owner's reference, 2026-09-29: 「圆环圆角前方的阴影」 / 「看不出来这个圆角的样子」,
  // i.e. the watchOS activity ring's overshoot). Three measured rejects:
  //   - the same tone with no shadow at all: invisible (a 135% ring looked exactly like
  //     a closed 100% one);
  //   - `drop-shadow` on the whole band: a haze down BOTH of its sides;
  //   - a short blurred ARC placed past the cap: a dark smudge ALONG the track that
  //     hides the cap's roundness instead of revealing it (「只看到一坨深红」).
  //
  // So the shadow is a blurred DISC sitting at the cap, pushed a little further along
  // the direction of travel and painted UNDER the band: everything the band covers is
  // hidden, and what is left is a soft crescent hugging the cap's rounded front edge.
  const base = CHART_TONES[tone] ?? CHART_TONES.primary
  const lap = Math.min(ink, c)
  const overrun = Math.max(0, ink - c)
  const arc = (dash: number, key: string): React.ReactElement => React.createElement('circle', {
    key,
    cx: radius,
    cy: radius,
    r,
    fill: 'none',
    stroke: base,
    strokeWidth: stroke,
    strokeDasharray: `${dash} ${c}`,
    transform: `rotate(-90 ${radius} ${radius})`,
    strokeLinecap: 'round',
  })
  // Where the cap sits, and which way the band is travelling there: the arc's point at
  // angle θ (clockwise from 12 o'clock) is `(radius + r·sinθ, radius − r·cosθ)` and its
  // clockwise tangent is `(cosθ, sinθ)`.
  const capAngle = (overrun / c) * Math.PI * 2
  const capX = radius + r * Math.sin(capAngle)
  const capY = radius - r * Math.cos(capAngle)
  const push = stroke * 0.55
  const capShadow: React.ReactElement | null = overrun <= 0
    ? null
    : React.createElement('circle', {
        key: 'cap-shadow',
        cx: capX + Math.cos(capAngle) * push,
        cy: capY + Math.sin(capAngle) * push,
        // Wider than the band's own thickness and generously blurred: the crescent has to
        // hug the cap's silhouette, not sit on it as a dark dot (the owner's report on
        // the first shape: 「只看到一坨深红」).
        r: stroke * 0.95,
        fill: 'rgba(0, 0, 0, 0.34)',
        style: { filter: `blur(${(stroke * 0.45).toFixed(2)}px)` },
      })
  return React.createElement('div', { title, style: { position: 'relative', width: `${box}px`, height: `${box}px`, flex: 'none' } },
    React.createElement('svg', { width: box, height: box, viewBox: `0 0 ${box} ${box}`, 'aria-hidden': true },
      React.createElement('circle', { cx: radius, cy: radius, r, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: stroke }),
      arc(lap, 'arc'),
      // UNDER the band on purpose: the disc's covered part disappears and only the
      // crescent in front of the cap is left to read.
      capShadow,
      overrun > 0 ? arc(overrun, 'overrun') : null,
    ),
    center === undefined || center === null
      ? null
      : React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, center),
  )
}
