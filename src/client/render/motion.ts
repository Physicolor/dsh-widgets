/**
 * dsh-widgets — the shared MOTION primitives (2026-11-12).
 *
 * Every chart in this plugin used to REPAINT its data: a donut jumped from 40% to
 * 92%, a lane bar appeared at its final width, a sparkline swapped its whole
 * polyline. The card is a live reading, so a repaint reads as "the number was
 * replaced", while a 400–500ms move reads as "the number changed" — the same
 * difference the rail's own slide/fold motion makes for the deck.
 *
 * Two mechanisms, chosen per chart by what the BROWSER can interpolate natively:
 *
 *  - CSS transitions (`card.module.css`, `dsx-arc` / `dsx-bar` / `dsx-lane-seg` /
 *    …) for the properties that are a single length or colour: a donut's
 *    `stroke-dasharray`, a bar's `height`, a lane's `left`/`width`. These cost no
 *    React work at all — the compositor owns the frames.
 *  - `useTweenNumbers` for the LINE chart, whose shape is an array of points:
 *    there is no CSS property that morphs a polyline, so the values themselves
 *    are eased and the element re-rendered per frame (≤20 points, one card).
 *
 * BOTH are mount-SILENT. The magnify layer re-creates every card on hover, so a
 * mount-triggered animation would replay the whole deck under the pointer; every
 * helper here compares against what the PREVIOUS render drew and moves only on a
 * real data change (the same rule `CardBody`'s figure-drop follows).
 *
 * `prefers-reduced-motion` is honoured in both layers: the CSS layer in a media
 * query, this layer before it schedules a frame.
 */
import * as React from 'react'

/** True when the user asked the OS to drop non-essential motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** The curve shared by the JS tween and the CSS transitions (a soft landing — no
 *  overshoot: these are readings, not presses). */
export const MOTION_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

/** Long enough to read as movement, short enough that a per-turn update still
 *  feels live. */
export const MOTION_MS = 460

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

/**
 * Pad `values` to `length` from the FRONT with its own first sample.
 *
 * Charts grow to the RIGHT (a new turn, a new beat), so the samples that just
 * appeared start where the old shape started and slide into place — which is what
 * makes a growing window read as a scroll instead of a swap. A shrinking array
 * keeps its NEWEST tail for the same reason.
 */
function alignTail(values: readonly number[], length: number): number[] {
  const out = values.slice()
  if (out.length >= length) return out.slice(out.length - length)
  const first = out.length > 0 ? out[0]! : 0
  while (out.length < length) out.unshift(first)
  return out
}

/**
 * Ease an array of numbers toward `targets` over `durationMs`.
 *
 * Returns the array to DRAW this frame: the target itself outside an animation, the
 * interpolated values while one runs. A HOLE — the `null` a sparkline uses to break
 * its line into independent segments — is passed straight through as `NaN` (which
 * every renderer already reads as "no sample"): it is a gap, not a value, and easing
 * it would turn the gap into a spike.
 */
export function useTweenNumbers(targets: readonly (number | null)[], durationMs: number = MOTION_MS): number[] {
  /** The samples as numbers, holes as `NaN` — the form the tween and the renderers share. */
  const samples = (values: readonly (number | null)[]): number[] => values.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN))
  const targetKey = targets.join('\u0001')
  const [shown, setShown] = React.useState<number[]>(() => samples(targets))
  /** What the previous frame actually painted — the start of the next move. */
  const shownRef = React.useRef<number[]>(samples(targets))
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const to = samples(targets)
    const from = alignTail(shownRef.current, to.length)
    const moved = to.length !== from.length || to.some((value, i) => !Object.is(value, from[i]))
    // A frame loop is a browser thing: without a window (a server-side render of the
    // closure in a test harness) the target is simply painted.
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      shownRef.current = to
      setShown(to)
      return
    }
    if (!moved || prefersReducedMotion()) {
      shownRef.current = to
      setShown(to)
      return
    }
    const startedAt = window.performance.now()
    const step = (now: number): void => {
      const t = Math.min(1, (now - startedAt) / durationMs)
      const eased = easeOutCubic(t)
      const next = to.map((value, i) => {
        const start = from[i] ?? value
        return Number.isFinite(value) && Number.isFinite(start) ? start + (value - start) * eased : value
      })
      shownRef.current = next
      setShown(next)
      if (t < 1) rafRef.current = window.requestAnimationFrame(step)
      else {
        rafRef.current = null
        shownRef.current = to
      }
    }
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    rafRef.current = window.requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // `targetKey` is the array's CONTENT: a new array with the same numbers must not
    // restart the tween, and the same array mutated in place must (the widgets build
    // a fresh array per render, so identity alone would restart it every commit).
  }, [targetKey, durationMs])

  return shown.length === targets.length ? shown : samples(targets)
}

/**
 * The first index of the tail that APPEARED since the previous render, or `-1`.
 *
 * The lanes strip is the reason: as the window rolls, the beats already drawn
 * should slide, and the one that just arrived should grow in. Index identity is
 * enough there — a beat's slot IS its index in `chart.lanes` (see `LANE_SLOTS`) —
 * and it costs one state update per arrival instead of a keyed set.
 *
 * The FIRST render returns `-1`: nothing "entered" a card that is only now on
 * screen, which is what keeps a hover re-mount from animating the whole strip.
 */
export function useEnteringTail(count: number, holdMs: number = MOTION_MS + 80): number {
  const [from, setFrom] = React.useState(-1)
  const previous = React.useRef<number | null>(null)
  React.useEffect(() => {
    const before = previous.current
    previous.current = count
    if (before === null || count <= before) return
    setFrom(before)
    const id = window.setTimeout(() => setFrom(-1), holdMs)
    return () => window.clearTimeout(id)
  }, [count, holdMs])
  return from
}
