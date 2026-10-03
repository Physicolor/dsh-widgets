/**
 * dsh-widgets — the open/close animation's easing, and the spring settle folded into it.
 *
 * MOVED OUT OF `runtime/prefs.ts` (2026-10-02) unchanged, for exactly one reason: this
 * math has no dependency on the preference SCHEMA (nor on the widget registry that schema
 * imports), and `scripts/verify-anim-curve-unit.mjs` has to exercise it in plain Node —
 * `prefs.ts` pulls `../generated.registry` in through a bundler-style extensionless
 * import, which Node's own ESM resolver refuses to load. `prefs.ts` re-exports every name
 * below, so the import path every surface already uses keeps working.
 *
 * WHAT LIVES HERE: the `AnimCurve` shape, its default, the spring-settle ceiling and
 * default, and the four pure functions that turn those four numbers into motion —
 * `normalizeCurve` (persisted JSON → a valid curve), `curveToEasing` (→ the CSS string the
 * GROUP's transition rides), `curveToProgress` (→ the `y(x)` the per-card CASCADE
 * evaluates in JS), and `overshootCurve` (→ the same curve with the settle folded in).
 * The one property all of them share: both open shapes ride ONE curve object, so the group
 * and the cards cannot drift apart.
 */

/**
 * The open/close animation's easing, as the two control points of a CSS
 * `cubic-bezier()` — i.e. exactly what the settings page's curve editor draws.
 * Both endpoints are fixed at (0,0) and (1,1), so four numbers fully describe a
 * curve, a preset is just a value of this type, and "custom" needs no second
 * representation to keep in sync.
 */
export interface AnimCurve {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * The default open/close curve — "根号"-shaped: it leaves (0,0) with a steep
 * slope and settles slowly into (1,1), which is what makes a zoom-out read as
 * "grows into place" instead of "slides into place". Numerically it is the
 * least-squares fit of a cubic-bezier to y = √x (max deviation ≈ 0.09 around
 * x ≈ 0.1; a cubic cannot match √x's infinite initial slope exactly).
 */
export const DEFAULT_ANIM_CURVE: AnimCurve = { x1: 0.31, y1: 0.66, x2: 0.51, y2: 1 }

/**
 * The shipped spring settle: 4% of the travel.
 *
 * Picked from the physics, not by eye. A one-shot overshoot with no visible second
 * bounce is `dampingRatio` 0.6–0.8 (Android's `DAMPING_RATIO_LOW_BOUNCY` is 0.75,
 * motion.dev's default `bounce` is 0.25 ≈ ζ 0.75); the first overshoot is
 * `exp(−πζ/√(1−ζ²))`, i.e. 4.6% of the travel at ζ = 0.70 against 2.8% at 0.75. At
 * the default 454px travel that is ~18px past the seat — inside the 13–22px band
 * "visible but not exaggerated" lands in, and the same fraction Apple's
 * `CASpringAnimation` / SwiftUI `bounce` describe.
 */
export const DEFAULT_ANIM_BOUNCE = 0.04

/**
 * Ceiling for `Prefs.animBounce` — the range the settings row offers.
 *
 * 20% of the default 454px travel is **91px** past the seat, which is well past "a spring
 * settle" and into "the rail swings out over the conversation": the whole-group shape
 * carries the rail that far LEFT of its column before returning. It is the ceiling the
 * owner asked to try, and the solver is exact across the whole band (`verify-anim-curve-
 * unit.mjs` checks every shape at 1/4/8/12/16/20%): the peak sits at x 0.698 at 1%, 0.585
 * at the 4% default, and 0.450 at 20% — a bigger overshoot arrives earlier, exactly as a
 * spring with less damping does.
 */
export const MAX_ANIM_BOUNCE = 0.2

/**
 * Coerce anything the persisted JSON (or a hand-edited host file) may hold into a
 * usable curve.
 *
 * `x1`/`x2` are clamped to [0,1] because CSS requires it — a value outside makes
 * `cubic-bezier()` invalid and the WHOLE transition declaration is dropped, i.e.
 * the rail would open with no animation at all. `y1`/`y2` are clamped too, but
 * for a design reason: a control point above 1 makes the scale overshoot past its
 * resting size, and the rail would visibly grow past the column it lives in.
 *
 * (The `y1` = 1 ceiling is the DRAWN curve's, not the applied one: the settle below
 * raises `y1` past 1 at render time, which is exactly how the overshoot stays a
 * number the user picks instead of a control point they have to guess at.)
 */
export function normalizeCurve(c: unknown): AnimCurve {
  const o = (typeof c === 'object' && c !== null ? c : {}) as Partial<AnimCurve>
  const unit = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback
  return {
    x1: unit(o.x1, DEFAULT_ANIM_CURVE.x1),
    y1: unit(o.y1, DEFAULT_ANIM_CURVE.y1),
    x2: unit(o.x2, DEFAULT_ANIM_CURVE.x2),
    y2: unit(o.y2, DEFAULT_ANIM_CURVE.y2),
  }
}

/** The CSS easing for a curve — the ONE place the four numbers become a string. */
export function curveToEasing(c: AnimCurve): string {
  return `cubic-bezier(${c.x1}, ${c.y1}, ${c.x2}, ${c.y2})`
}

/**
 * The SAME curve as a plain `y(x)` — for the one animation that cannot ride CSS.
 *
 * The deck's per-card cascade is driven by a shared JS clock (see
 * rail/wave/deck-cascade.ts: a CSS transition cannot resume from the current
 * progress when the direction flips), so its easing has to be evaluated in JS.
 * Deriving it from the same four numbers keeps the two surfaces on one curve —
 * a preset or a hand-drawn edit changes the CSS ease and this evaluator together.
 *
 * Solved the standard way: the cubic is split into `x(t)` / `y(t)`, `x(t)` is
 * inverted for the requested `x` by Newton's method with a bisection fallback
 * (a cubic-bezier with a near-vertical start has a vanishing derivative there,
 * where Newton alone wanders), then `y(t)` is read off.
 */
export function curveToProgress(c: AnimCurve): (x: number) => number {
  const { x1, y1, x2, y2 } = c
  // A degenerate/linear curve needs no solver, and the branch keeps `x(t) = t`.
  if (x1 === y1 && x2 === y2) return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x)
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx
  return (x: number): number => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) return sampleY(t)
      const slope = slopeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= error / slope
      if (t < 0 || t > 1) break
    }
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 24; i++) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) break
      if (error > 0) hi = t
      else lo = t
      t = (lo + hi) / 2
    }
    return sampleY(t)
  }
}

/**
 * The POSITION curve with the spring settle folded in: the same four numbers, with
 * `y1` raised until the curve's own PEAK clears 1 by exactly `bounce`.
 *
 * ── WHY THE ORDINATE, AND WHY THAT MAKES THE OVERSHOOT EXACT ──
 *
 * A cubic-bezier may take its two ORDINATE control points outside [0,1] — the spec
 * says a control point outside the range "can cause the value to go farther than
 * the final state and then return", which is the bounce. The abscissae may not.
 * The curve's maximum is therefore a MAX OF LINEAR FUNCTIONS of `y1`
 * (`y(t) = 3u²t·y1 + (3ut²·y2 + t³)`, `u = 1 − t`, and `3u²t ≥ 0`), i.e. continuous
 * and non-decreasing in `y1`, so it solves by bisection. Two things fall out of
 * that: the overshoot becomes a NUMBER THE USER PICKS (4% of the travel) instead of
 * a control point they have to guess at, and `x1`/`x2`/`y2` are left untouched, so
 * the timing reparameterisation and the landing are the ones that were drawn.
 *
 * ── WHAT THE SOLVE OWNS, AND THE HONEST LIMIT OF IT ──
 *
 * A cubic-bezier has four degrees of freedom, and "the peak is exactly 1 + bounce"
 * plus "it ends exactly at 1" is two constraints, so the ordinate that carries the
 * overshoot cannot also be free. It is `y1`, the TAKE-OFF ordinate — and for
 * `y2 = 1` (which every shipped preset has) the solve is a function of `y2` and the
 * bounce alone, i.e. a drawn `y1` below the solved value is REPLACED by it. `y1` at
 * or above the solved value is returned exactly as drawn (`if (bezierPeak(base.y1,
 * base.y2) >= target) return base`), so hand-drawing a steeper take-off still wins,
 * and `animBounce = 0` gives back the drawn curve bit for bit.
 *
 * The other orderings were measured and rejected. Deriving `y2` instead puts the peak
 * at x ≈ 0.9 of the duration — a flick in the last milliseconds, not a settle — and
 * scaling BOTH ordinates by one factor (the one variant that would leave the drawn
 * `y1` live, since the ratio is preserved) moves the peak from x 0.585 to x 0.791, so
 * it stops matching where a ζ = 0.70 spring crosses its target. Take-off is the
 * physically right place for an overshoot, so take-off is what it costs; the settings
 * page therefore states which ordinate the bounce owns (see `settings.animShiftCurve.desc`).
 *
 * `bounce` IS the overshoot in pixels: the fold's remaining offset is
 * `travel·(1 − e(p))`, so a peak of `1 + b` parks a card `b·travel` px past its
 * seat — the same for every card (they share one travel) and for the whole group
 * in the 'zoom' shape. In the shipped configuration the peak lands at ~58% of the
 * curve, where a ζ = 0.70 spring puts its first overshoot.
 *
 * One curve, not a second animation, is also what keeps the two open shapes ONE
 * map: `curveToEasing` hands the solved curve to the group's CSS transition and
 * `curveToProgress` hands the same one to the per-card cascade, bit for bit.
 *
 * Memoised — the solve is ~100 cubic evaluations, and the value only changes when
 * the curve or the bounce does.
 */
export function overshootCurve(base: AnimCurve, bounce: number): AnimCurve {
  const b = Number.isFinite(bounce) ? Math.min(MAX_ANIM_BOUNCE, Math.max(0, bounce)) : 0
  if (b <= 0) return base
  const target = 1 + b
  // A curve already peaking past the target (only reachable by a hand-edited
  // `y1 > 1`) is left exactly as the user drew it.
  if (bezierPeak(base.y1, base.y2) >= target) return base
  const key = `${base.x1},${base.y1},${base.x2},${base.y2},${b}`
  const hit = OVERSHOOT_CACHE.get(key)
  if (hit !== undefined) return hit
  // `hi` starts at the standard easeOutBack control point (≈10% overshoot) and
  // doubles only if a pathological base curve (a very low `y2`) needs more height
  // for the same peak; the cap keeps a hand-edited curve from producing a spring
  // that is all overshoot.
  let lo = base.y1
  let hi = 1.70158
  for (let i = 0; i < 4 && hi < 8 && bezierPeak(hi, base.y2) < target; i++) hi = Math.min(8, hi * 2)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (bezierPeak(mid, base.y2) < target) lo = mid
    else hi = mid
  }
  const solved: AnimCurve = { ...base, y1: Math.round(((lo + hi) / 2) * 1e4) / 1e4 }
  OVERSHOOT_CACHE.set(key, solved)
  return solved
}

/** Memo for {@link overshootCurve}, keyed by the curve and the requested peak. */
const OVERSHOOT_CACHE = new Map<string, AnimCurve>()

/**
 * `max_t y(t)` of the cubic-bezier with these two ordinates — the curve's peak.
 *
 * Independent of `x1`/`x2`: `x(t)` is a monotone reparameterisation, so the largest
 * `y` the curve ever shows is the largest `y(t)` over `t`. A coarse scan brackets
 * the single interior maximum, then a ternary search refines it (unimodal there for
 * every `y1 ≥ 0`, `y2 ∈ [0,1]` this module can be handed).
 */
function bezierPeak(y1: number, y2: number): number {
  const at = (t: number): number => {
    const u = 1 - t
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
  }
  const STEPS = 64
  let best = at(1)
  let bestT = 1
  for (let i = 1; i < STEPS; i++) {
    const t = i / STEPS
    const y = at(t)
    if (y > best) {
      best = y
      bestT = t
    }
  }
  let lo = Math.max(0, bestT - 1 / STEPS)
  let hi = Math.min(1, bestT + 1 / STEPS)
  for (let i = 0; i < 40; i++) {
    const a = lo + (hi - lo) / 3
    const b = hi - (hi - lo) / 3
    if (at(a) < at(b)) lo = a
    else hi = b
  }
  return Math.max(best, at((lo + hi) / 2))
}
