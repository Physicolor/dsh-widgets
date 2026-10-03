#!/usr/bin/env node
/**
 * Spring-settle curve test (deterministic, no browser).
 *
 * `prefs.animBounce` is folded into the POSITION curve by `overshootCurve`
 * (src/client/runtime/prefs.ts): a cubic-bezier's ORDINATE `y1` is raised until the
 * curve's peak clears 1 by exactly the requested fraction, so the fold's overshoot is a
 * fraction of the travel rather than a control point the user has to guess at.
 *
 * That solve is the whole of the feature's math, and its properties are what the two
 * open shapes share (one curve object feeds the group's CSS transition AND the per-card
 * cascade), so they are pinned here rather than only through a window:
 *
 *   - the PEAK is exactly `1 + bounce`, for every preset and every off-preset curve a
 *     frame-sampled probe cannot reach, and for bounces up to the documented ceiling;
 *   - `x1`/`x2`/`y2` are UNTOUCHED (the timing reparameterisation and the landing);
 *   - `bounce = 0` is the identity, and a curve whose own peak already clears the target
 *     is returned EXACTLY as drawn (a hand-drawn take-off wins);
 *   - the solved `y1` still takes the curve from 0 to 1 (adding an overshoot must not
 *     move either end);
 *   - the peak lands in the same part of the gesture a ζ = 0.70 spring peaks in, which is
 *     the design claim behind carrying the overshoot on the take-off ordinate.
 *
 * Run: node --experimental-strip-types scripts/verify-anim-curve-unit.mjs
 *      (Node 22.6+; the module is type-erasable, no build step needed)
 */
import { curveToEasing, curveToProgress, overshootCurve } from '../src/client/lib/anim-curve.ts'
import { MAX_ANIM_BOUNCE } from '../src/client/lib/anim-curve.ts'

const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label + (detail === undefined ? '' : ' — ' + detail))
}

/** `max_t y(t)` of the cubic-bezier with these ordinates — the probe's own evaluation. */
const peak = (c) => {
  const [, y1, , y2] = [c.x1, c.y1, c.x2, c.y2]
  let best = 1
  for (let i = 1; i < 8192; i++) {
    const t = i / 8192
    const u = 1 - t
    const v = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
    if (v > best) best = v
  }
  return best
}
/** The abscissa the peak sits at, from `x(t)` of the same control points. */
const peakX = (c) => {
  const { x1, y1, x2, y2 } = c
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  let best = 1
  let bestT = 1
  for (let i = 1; i < 8192; i++) {
    const t = i / 8192
    const u = 1 - t
    const v = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
    if (v > best) { best = v; bestT = t }
  }
  return ((ax * bestT + bx) * bestT + cx) * bestT
}

const PRESETS = {
  线性: { x1: 0, y1: 0, x2: 1, y2: 1 },
  标准: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  缓出: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
  根号: { x1: 0.31, y1: 0.66, x2: 0.51, y2: 1 },
  平滑: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  // Off-preset shapes: the editor hands over anything the pointer can draw.
  手绘A: { x1: 0.12, y1: 0.3, x2: 0.9, y2: 0.4 },
  手绘B: { x1: 0.6, y1: 0.95, x2: 0.2, y2: 0.05 },
}
const BOUNCES = [0.01, 0.04, 0.08, 0.12, 0.16, MAX_ANIM_BOUNCE]

let worstPeakErr = 0
let worstPeakAt = ''
let preserved = 0
for (const [name, base] of Object.entries(PRESETS)) {
  for (const b of BOUNCES) {
    const solved = overshootCurve(base, b)
    const err = Math.abs(peak(solved) - (1 + b))
    if (err > worstPeakErr) { worstPeakErr = err; worstPeakAt = `${name} @ ${b}` }
    // x1/x2/y2 are the timing reparameterisation and the landing: untouched.
    if (solved.x1 === base.x1 && solved.x2 === base.x2 && solved.y2 === base.y2) preserved++
    // Both ends still land exactly on 0 and 1.
    const f = curveToProgress(solved)
    if (Math.abs(f(0)) > 1e-9 || Math.abs(f(1) - 1) > 1e-9) {
      check(false, `${name} @ ${b}: the curve still starts at 0 and ends at 1`, `${f(0)} … ${f(1)}`)
    }
  }
}
check(worstPeakErr < 2e-4, 'the solved curve peaks at exactly 1 + bounce, for every preset and off-preset shape',
  `worst |peak − (1+b)| = ${worstPeakErr.toExponential(2)} (${worstPeakAt}, ${Object.keys(PRESETS).length} curves × ${BOUNCES.length} bounces)`)
check(preserved === Object.keys(PRESETS).length * BOUNCES.length,
  'x1 / x2 / y2 are preserved bit for bit (time reparameterisation and landing untouched)',
  `${preserved} of ${Object.keys(PRESETS).length * BOUNCES.length}`)

{
  const base = PRESETS.根号
  const zero = overshootCurve(base, 0)
  check(zero === base, 'bounce = 0 is the identity (the drawn curve, bit for bit)',
    `${curveToEasing(zero)} vs ${curveToEasing(base)}`)
  // A hand-drawn take-off that already clears the target is returned unchanged…
  const steep = { ...base, y1: 1.5 }
  check(overshootCurve(steep, 0.04) === steep,
    'a curve whose own peak already clears the target is returned exactly as drawn',
    `peak ${peak(steep).toFixed(4)} ≥ ${(1.04).toFixed(4)} → ${curveToEasing(overshootCurve(steep, 0.04))}`)
  // …and one just below it is solved from the bounce (the documented takeover).
  const shallow = { ...base, y1: 1.2 }
  check(overshootCurve(shallow, 0.04) !== shallow && Math.abs(peak(overshootCurve(shallow, 0.04)) - 1.04) < 2e-4,
    'a take-off below the solved value is taken over by the bounce (documented in prefs.ts)',
    `drawn y1 ${shallow.y1} → solved ${overshootCurve(shallow, 0.04).y1}`)
  // Monotone in the bounce: more bounce is more overshoot, never less.
  const peaks = BOUNCES.map((b) => peak(overshootCurve(base, b)))
  check(peaks.every((p, i) => i === 0 || p > peaks[i - 1]), 'the peak grows with the bounce',
    peaks.map((p) => p.toFixed(4)).join(' < '))
  // …and it arrives EARLIER as the bounce grows, the way a less damped spring crosses its
  // target sooner — true across the whole band the settings row offers.
  const xs = BOUNCES.map((b) => peakX(overshootCurve(base, b)))
  check(xs.every((v, i) => i === 0 || v < xs[i - 1]), 'a bigger bounce peaks earlier (less damping crosses sooner)',
    xs.map((v) => v.toFixed(3)).join(' > '))
  // Where the overshoot sits: the claim is that the take-off ordinate puts it at the part
  // of the gesture a ζ = 0.70 spring peaks in (~55–60%), not at the very end.
  const at = peakX(overshootCurve(base, 0.04))
  check(at > 0.5 && at < 0.7, 'the peak lands mid-gesture (x ∈ (0.5, 0.7)), not as a flick at the end',
    `peak x = ${at.toFixed(3)} at bounce 0.04 (scaling both ordinates instead would put it at 0.79)`)
}

console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'}`)
if (fails.length > 0) process.exitCode = 1
