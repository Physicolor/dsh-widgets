/**
 * Apple-parameterised springs for the wave's morph progress.
 *
 * Copied from `dsh-usage-center/src/client/charts/trend-plan.ts` (2026-09-22),
 * which uses the same closed form for the Token Trend camera. The two plugins are
 * separate packages, so this is a deliberate copy rather than an import — keep the
 * formulae in step if either changes.
 *
 * The parameterisation is the one Apple's HIG / SwiftUI expose: a perceptual
 * `responseMs` (how long the motion would take with no damping at all, `2π/ω`) and
 * a `bounce` (how much of the critical damping is removed). The overshoot of a
 * spring with damping ratio `ζ = 1 − bounce` is `exp(−πζ/√(1−ζ²))`, so
 * `bounce: 0.1` → 0.15%, `0.12` → 0.3%, `0.28` → 3.8%.
 */

export interface SpringSpec {
  /** Perceptual duration: the time the motion would take undamped. */
  readonly responseMs: number
  /** `0` = critically damped (no overshoot), `0.5` = playful. */
  readonly bounce: number
}

/**
 * The spring the wave engages/disengages on.
 *
 * `responseMs: 200` matches the duration of the CSS tween this replaced (so the
 * hover still feels as quick as it did), and the 0.1 bounce is the smallest
 * overshoot that keeps the stop from reading as a dead halt — 0.15%, i.e. ~0.4px
 * on a 240px card, well below what anyone can see. Anything larger was rejected
 * for a UI that magnifies on every pointer move: a visible rebound on every hover
 * reads as jitter, not as weight.
 */
export const WAVE_SPRING: SpringSpec = { responseMs: 200, bounce: 0.1 }

/**
 * The value of a unit-step spring after `elapsedMs`.
 *
 * The closed form for a mass on a spring released with zero velocity, with the
 * mass fixed at 1: `ω = 2π/response`, `ζ = 1 − bounce`, and
 *
 * ```
 * x(t) = 1 − e^(−ζωt) [ cos(ω_d t) + (ζω/ω_d) sin(ω_d t) ],  ω_d = ω√(1−ζ²)
 * ```
 *
 * which is `0` at `t = 0`, rises with zero initial velocity, passes the target by
 * the bounce's overshoot, and settles back onto `1`. Critically damped and
 * overdamped springs (`ζ ≥ 1`) use the single-exponential form instead — there is
 * no oscillation to write down.
 * @param elapsedMs - time since this motion's own start, in milliseconds.
 * @param spec - the spring.
 * @returns the position, `0` before the start and near `1` once settled.
 */
export function springValue(elapsedMs: number, spec: SpringSpec): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  const seconds = elapsedMs / 1000
  const response = Math.max(1, spec.responseMs) / 1000
  const omega = (2 * Math.PI) / response
  const zeta = Math.min(1, Math.max(0, 1 - spec.bounce))
  if (zeta >= 1) return 1 - Math.exp(-omega * seconds) * (1 + omega * seconds)
  const damped = omega * Math.sqrt(1 - zeta * zeta)
  const decay = Math.exp(-zeta * omega * seconds)
  return 1 - decay * (Math.cos(damped * seconds) + ((zeta * omega) / damped) * Math.sin(damped * seconds))
}

/**
 * How long a spring takes to come within `tolerance` of its target.
 *
 * Bounded rather than sampled: every oscillation of an underdamped spring is
 * inside the envelope `e^(−ζωt)/√(1−ζ²)`, so solving that envelope for the
 * tolerance gives a time the spring cannot still be moving after — and unlike a
 * scan for the first frame where the value is close to 1, it cannot stop early on
 * the overshoot, where the value is close to 1 while the motion is at its fastest.
 * @param spec - the spring.
 * @param tolerance - how close counts as settled (fraction of the travel).
 * @returns the settling time in milliseconds.
 */
export function springSettleMs(spec: SpringSpec, tolerance = 0.002): number {
  const response = Math.max(1, spec.responseMs) / 1000
  const omega = (2 * Math.PI) / response
  const zeta = Math.min(1, Math.max(0, 1 - spec.bounce))
  if (zeta <= 0) return Math.round(response * 1000 * 4)
  if (zeta >= 1) {
    // `e^−u (1 + u) = tolerance`, solved by bisection: the left side decreases
    // monotonically in `u`, so the search always converges.
    let low = 0
    let high = 32
    for (let step = 0; step < 60; step += 1) {
      const mid = (low + high) / 2
      if (Math.exp(-mid) * (1 + mid) > tolerance) low = mid
      else high = mid
    }
    return Math.round((high / omega) * 1000)
  }
  const amplitude = 1 / Math.sqrt(1 - zeta * zeta)
  const seconds = Math.log(amplitude / tolerance) / (zeta * omega)
  return Math.round(seconds * 1000)
}
