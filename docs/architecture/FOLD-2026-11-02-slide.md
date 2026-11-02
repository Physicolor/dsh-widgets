# The open/close fold's third path: `'slide'`, and what the anchor really is

2026-11-02. Owner report: 「逐个落入」(the `'stagger'` shape) reads as if its anchor
sits at **some absolute point on the whole desktop window** rather than just outside
the component area's own top-right corner, and the per-card drop should become a
plain left-right translation, which should be cheaper.

This file records what the code actually does, why the report is right, and what
`'slide'` changed. It is the evidence behind `CHANGELOG.zh-CN.md` v1.9.0.

## 1. The anchor is the rail's top-right, not the viewport's

`rail-view.tsx` writes the drawer's origin as

```
transform-origin: right var(--dsx-rail-top, 0px)
```

so the computed origin is `(window.innerWidth, railTop)` — measured live as
`(1578, 44)` on the owner's 1578px window. The `transform-origin: top right` that
`deck-cascade.ts`'s header and both READMEs described (the viewport's corner,
`y = 0`) has not been the written value since 2026-10-08. That stale paragraph is
one half of the confusion and is now corrected in all three places.

## 2. Why it still LOOKS window-anchored

`planCascade` builds, per card,

```
vx = originX − cardRight
vy = originY − cardTop          (cardTop is viewport-absolute)
```

and `foldTransformAt` (the `'drop'` path) maps

```
y = (1 − s) · vy = −(1 − s) · (cardTop − originY)
```

with `s` running from `animScale` (default **0.88**) to 1. So a card's starting
height is **12% of its distance from the rail's top**:

| card's distance below the rail's top | vertical start offset |
| --- | --- |
| 100px | −12px |
| 400px | −43px |
| 700px | −84px |
| 900px | −103px |

That is exactly the map the group's own zoom applies — a faithful per-card copy of
it — but for a deck it means the bottom card falls from 8× the height the top card
does. The quantity that drives the motion is a viewport-absolute distance, which is
precisely what "anchored to an absolute value on the window" describes. Nothing is
mis-measured; the shape is the problem.

## 3. What `'slide'` changes

`CascadePath` = `'drop' | 'slide'`. On `'slide'`:

- `x = travel · (1 − easeShift(p))`, `y ≡ 0`, no `scale()` in the transform;
- `planCascade` skips `deck.getBoundingClientRect()` and leaves `vx`/`vy` at 0 — the
  forced layout read existed only to produce them;
- no per-card `transform-origin` write, and the 设置 tile keeps its own origin
  (a pure translation is origin-agnostic) while still lending its transition;
- keyframes: **32** samples of one monotone channel, worst chord error **0.187px**
  over a 454px travel (the `'drop'` path keeps 48 samples / **0.133px**).

Everything else is shared and unchanged: one timeline, `cascadeRanks` order, the
visible-band filter, reversal via `currentTime` read-back, the settle report the
drawer unmounts on.

## 4. What is claimed and what is not

Claimed (structural, verifiable in the diff):

- one forced layout (`getBoundingClientRect`) removed per fold plan;
- one `transform-origin` style write per participating card removed;
- no scale animation on the cards, hence no raster-scale changes while the fold runs;
- keyframe list 32/48 of its former length.

Not claimed: a measured frame-rate delta. The A/B that would produce one is a live
run of `scripts/probe-fold-stress.cjs` with `openShape` flipped between `'slide'`
and `'stagger'` on the same session; it has not been run for this change.

## 5. Gate coverage

`scripts/verify-deck-cascade-unit.mjs` block J pins: start offset exactly one
travel for every card, `y = 0` at every sampled instant, no `scale()` anywhere, the
open end at `x = 0`, monotone `x`, the `'drop'` path still moving in `y`, and the
32-sample curve error. `scripts/verify-fold-math.mjs` (gate G13) runs it in CI.
