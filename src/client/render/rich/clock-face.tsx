/**
 * dsh-widgets — the `clock` rich block (the 时钟 card's dial).
 *
 * WHAT IT DRAWS. Two faces, one contract (see `ClockRich`): an ANALOG dial — the
 * owner's reference: 12 numerals, hairline minute ticks over heavier hour ticks,
 * hour / minute / second hands from a common centre, and an optional zone caption
 * in a pill under the centre — or the same reading as DIGITAL text. Both occupy
 * the SAME footprint, so switching the face cannot resize the card.
 *
 * WHY IT TICKS ITSELF. A widget render is a pure data description and the rail
 * re-renders a card only when its data changes — measured: the collector's idle
 * tick is 30s (see data/collector.tsx). A dial wired to that tick would stand
 * still for half a minute at a time, which is exactly what a clock must not do.
 * So the LIVE reading is owned HERE: a 1s interval while seconds are drawn (and a
 * minute-bucketed one when they are not — the state is replaced only when the
 * printed value changes, so a minute-precision card re-renders once a minute, not
 * 60 times). The widget still ships a PINNED instant for the offline surfaces,
 * because a screenshot of a live dial could never be compared to a baseline.
 *
 * The interval belongs to THIS component, rendered by `CardBody` as a real element
 * (`createElement`) — never called as a plain function. Called inline its effect
 * would land on `CardBody`'s fibre, and the skeleton → loaded swap (which returns
 * before the rich block on the skeleton pass) would then render a different number
 * of hooks per pass, which React rejects with #310 (the same trap the chart
 * registry documents).
 */

import * as React from 'react'
import { readClock } from '../../lib/clock-face'
import type { ClockRich } from '../../lib/contract/types'

/** The dial's own coordinate system: every number below is in these units. */
const VB = 100
/** The tile's rich-block height at scale 1 (px).
 *
 *  The card that draws this dial has NO TITLE (see docs/design/CARD-TITLE-STANDARD.md,
 *  T1), so the head row is gone and the block owns the whole tile:
 *  `12(pad) + 120 + 12(pad) = 144 ≤ 150`, and the identity holds at every scale
 *  because pad and the box scale together. With the old 16px title strip in place
 *  the face could only be 96px — the reference card's dial fills its tile, and 120
 *  is the largest face that still clears the tile-fits guard. */
const BOX = 120

const INK = {
  rim: 'var(--dsw-alias-border-l3)',
  minuteTick: 'var(--dsw-alias-border-l4)',
  hourTick: 'var(--dsw-alias-label-tertiary)',
  numeral: 'var(--dsw-alias-label-primary)',
  hand: 'var(--dsw-alias-label-primary)',
  second: 'var(--dsw-alias-state-business-primary)',
  pill: 'var(--dsw-alias-bg-layer-1)',
  pillText: 'var(--dsw-alias-label-secondary)',
}

/** `n` → the dial's x for a radius and an angle in degrees clockwise from 12. */
function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [VB / 2 + r * Math.sin(rad), VB / 2 - r * Math.cos(rad)]
}

/** One hand: a round-capped line from `50 + tail` to `50 - len`, rotated in place.
 *  `tail` is what makes a second hand read as a watch hand rather than a spoke. */
function hand(key: string, len: number, deg: number, stroke: number, color: string, tail: number): React.ReactElement {
  return React.createElement('line', {
    key,
    x1: VB / 2,
    y1: VB / 2 + tail,
    x2: VB / 2,
    y2: VB / 2 - len,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round',
    transform: `rotate(${deg.toFixed(3)} ${VB / 2} ${VB / 2})`,
  })
}

/** The tick ring: 60 marks, every fifth one heavier and darker. */
function ticks(): React.ReactElement[] {
  const out: React.ReactElement[] = []
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0
    const r1 = hour ? 40.5 : 44.5
    const r2 = 47
    const [x1, y1] = polar(r1, i * 6)
    const [x2, y2] = polar(r2, i * 6)
    out.push(React.createElement('line', {
      key: `t${i}`,
      x1, y1, x2, y2,
      stroke: hour ? INK.hourTick : INK.minuteTick,
      strokeWidth: hour ? 1.6 : 0.7,
      strokeLinecap: 'butt',
    }))
  }
  return out
}

/** The 12 numerals, set in the product's own text colour at weight 500. */
function numerals(): React.ReactElement[] {
  return Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    const [x, y] = polar(34, n * 30)
    return React.createElement('text', {
      key: `n${n}`,
      x, y,
      fill: INK.numeral,
      fontSize: 11.5,
      fontWeight: 500,
      textAnchor: 'middle',
      dominantBaseline: 'central',
      style: { fontVariantNumeric: 'tabular-nums' },
    }, String(n))
  })
}

/** The zone caption: a pill under the centre, wide enough for the text it holds.
 *  Width is ESTIMATED (the renderer cannot measure in a pure render): a CJK glyph
 *  is ~1em, a Latin one ~0.58em, which is the same approximation every SVG label
 *  in this plugin uses. */
function zonePill(label: string): React.ReactElement {
  const em = 6.8
  let width = 0
  for (const ch of label) width += (ch.codePointAt(0) ?? 0) > 0x2e80 ? em : em * 0.58
  const w = width + 7
  return React.createElement('g', { key: 'pill' },
    React.createElement('rect', {
      x: VB / 2 - w / 2,
      y: 61.5,
      width: w,
      height: 10.5,
      rx: 5.25,
      fill: INK.pill,
      stroke: 'var(--dsw-alias-border-l1)',
      strokeWidth: 0.6,
    }),
    React.createElement('text', {
      x: VB / 2,
      y: 66.8,
      fill: INK.pillText,
      fontSize: em,
      fontWeight: 500,
      textAnchor: 'middle',
      dominantBaseline: 'central',
      style: { fontVariantNumeric: 'tabular-nums' },
    }, label),
  )
}

/** The analog dial for one reading. */
function analog(r: ReturnType<typeof readClock>, label: string | undefined, showSeconds: boolean, box: number): React.ReactElement {
  // The classic watch angles: the hour hand creeps with the minutes, the minute
  // hand with the seconds — a dial whose hour hand jumps on the hour reads as a
  // diagram, not as a clock.
  const hourDeg = (r.hour % 12) * 30 + r.minute * 0.5 + r.second / 120
  const minuteDeg = r.minute * 6 + r.second / 10
  const secondDeg = r.second * 6
  return React.createElement('svg', {
    width: box,
    height: box,
    viewBox: `0 0 ${VB} ${VB}`,
    'aria-hidden': true,
    style: { display: 'block' },
  },
    React.createElement('circle', { cx: VB / 2, cy: VB / 2, r: 48, fill: 'none', stroke: INK.rim, strokeWidth: 1 }),
    ...ticks(),
    ...numerals(),
    label ? zonePill(label) : null,
    hand('hh', 20.5, hourDeg, 2.9, INK.hand, 0),
    hand('mh', 28.5, minuteDeg, 2.1, INK.hand, 0),
    showSeconds ? hand('sh', 32.5, secondDeg, 1.1, INK.second, 5.5) : null,
    React.createElement('circle', { cx: VB / 2, cy: VB / 2, r: 2.1, fill: INK.hand }),
    showSeconds ? React.createElement('circle', { cx: VB / 2, cy: VB / 2, r: 1.05, fill: INK.second }) : null,
  )
}

/** The digital reading for one clock reading.
 *
 *  The TIME is the only thing on its own line, and its size is chosen by its own
 *  length rather than by taste: the card's text column is 126px at the 150px tile,
 *  and a fixed 33px `09:36:42` measured 128px wide — i.e. it pushed the day-period
 *  mark onto its own column, where it wrapped to one character per line and was
 *  clipped (measured on the gallery page, 2026-10-14). The am/pm word therefore
 *  belongs to the `dateLine` the WIDGET composes, and the figure is sized to fit:
 *  32px with seconds (≈110px), 46px without (≈105px) — the extra room over the
 *  first cut comes from the card having no title row (see BOX above). */
function digital(r: ReturnType<typeof readClock>, clock: ClockRich, scale: number, box: number): React.ReactElement {
  const h24 = clock.h24 !== false
  const showSeconds = clock.seconds !== false
  const hh = h24 ? r.hour : (r.hour % 12 === 0 ? 12 : r.hour % 12)
  const time = `${String(hh).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}${showSeconds ? `:${String(r.second).padStart(2, '0')}` : ''}`
  return React.createElement('div', {
    style: { height: `${box}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${Math.round(3 * scale)}px`, width: '100%', overflow: 'hidden' },
  },
    React.createElement('span', {
      style: {
        fontSize: `${Math.round((showSeconds ? 32 : 46) * scale)}px`,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
      },
    }, time),
    clock.dateLine ? React.createElement('div', {
      style: {
        fontSize: `${Math.round(10 * scale)}px`,
        color: 'var(--dsw-alias-label-tertiary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
      },
    }, clock.dateLine) : null,
  )
}

/**
 * The clock rich block.
 *
 * @param clock - the widget's payload (see `ClockRich`); `at` absent = live.
 * @param scale - `unit / BASE_SIDE`, the card's own scale factor.
 */
export function ClockFace({ clock, scale }: { clock: ClockRich; scale: number }): React.ReactElement {
  const live = clock.at === undefined
  const showSeconds = clock.seconds !== false
  const [now, setNow] = React.useState<number>(() => clock.at ?? Date.now())
  React.useEffect(() => {
    if (!live) return
    // With seconds drawn the reading changes every second; without them the card
    // only needs to move when the PRINTED minute does — so the state update is
    // dropped unless the minute bucket changed, which is what keeps a
    // minute-precision clock from re-rendering 60 times a minute.
    const commit = (): void => setNow((prev) => {
      const next = Date.now()
      return showSeconds || Math.floor(next / 60_000) !== Math.floor(prev / 60_000) ? next : prev
    })
    commit()
    const id = window.setInterval(commit, 1000)
    return () => window.clearInterval(id)
  }, [live, showSeconds])
  const at = live ? now : (clock.at as number)
  const r = readClock(at, clock.tz)
  const box = Math.round(BOX * scale)
  if (clock.face === 'digital') return digital(r, clock, scale, box)
  return React.createElement('div', {
    // A hairline-free wrapper: the dial's own rim IS the frame, so a second box
    // around it would read as two circles.
    style: { height: `${box}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: clock.label,
  }, analog(r, clock.label, showSeconds, box))
}
