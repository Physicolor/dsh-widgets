#!/usr/bin/env node
/**
 * Deck-cascade engine test (deterministic, no browser).
 *
 * The open/close fold of the 'stagger' shape is driven by ONE shared clock
 * (src/client/rail/wave/deck-cascade.ts) precisely so that a rapid reversal
 * continues from the current progress instead of freezing or snapping. That
 * property cannot be measured reliably through a real window — a frame-sampled
 * probe sees ~16ms of jitter per reading and cannot tell a 3px step from a jump —
 * so the engine is exercised here on a MANUAL clock: `requestAnimationFrame` is
 * replaced with a queue the test advances by exact milliseconds.
 *
 * What it pins down:
 *   - the rank table: bottom-left first, top-right last, one distinct rank per
 *     participant (the old cap squashed every rank past 9 onto one delay);
 *   - the MAP: a card's start state is the zoom shape's own affine map about the
 *     shared anchor — same scale, same travel, same two curves — which is what
 *     makes the two shapes one motion at two timings;
 *   - a forward fold runs the ranks in order, and the timeline is exactly
 *     `last rank · step + duration`;
 *   - the collapse from a settled open is the MIRROR (the last rank leaves first);
 *   - an interruption at an arbitrary point keeps every card's motion CONTINUOUS
 *     (bounded per-frame step, no jump to 0 or to the start) and still settles;
 *   - a plan offered mid-fold, or while the retracted stack is still parked, is
 *     REFUSED; `release` (what a shape switch does) leaves no transform and no
 *     frame pending; `jump` never animates; a no-op settle still reports.
 *
 * Run: node --experimental-strip-types scripts/verify-deck-cascade-unit.mjs
 *      (Node 22.6+; the module is type-erasable, no build step needed)
 */
import {
  CASCADE_FALLBACK_TOTAL_MS, CASCADE_TRAVEL_SHARE,
  cascadeDelay, cascadeRanks, cascadeTiming, createDeckCascade, foldKeyframes, foldTransformAt, planCascade,
} from '../src/client/rail/wave/deck-cascade.ts'
import { curveToProgress } from '../src/client/lib/anim-curve.ts'

const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label + (detail === undefined ? '' : ' — ' + detail))
}

// ── the manual clock ────────────────────────────────────────────────────────
// The engine no longer runs on rAF: each card's motion is a Web Animation, so the
// test clock advances the running animations' currentTime and fires `onfinish`
// exactly the way the browser does. (`live` is declared with the fake animator
// below; every call to `tick` happens after that initialisation.)
let now = 0
const tick = (dt = 16) => {
  now += dt
  for (const a of [...live]) {
    if (a.playState !== 'running') continue
    a.currentTime += dt
    if (a.currentTime >= a.opts.duration) {
      a.currentTime = a.opts.duration
      a.playState = 'finished'
      live.delete(a)
      if (typeof a.onfinish === 'function') a.onfinish()
    }
  }
}

const el = (delay = -1, props = new Map()) => ({
  style: {
    transform: '', transition: '', transformOrigin: '',
    getPropertyValue: (name) => (name === '--dsx-slot-delay' && delay >= 0 ? `${delay}ms` : (props.get(name) ?? '')),
    setProperty: (name, value) => { props.set(name, value) },
    removeProperty: (name) => { props.delete(name) },
  },
  classList: { contains: () => false },
})
const mag = (t) => {
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(t || '')
  return m === null ? 0 : Math.hypot(Number(m[1]), Number(m[2]))
}
/** Linear easings: the fold's maths stays readable, the timing is what is under test. */
const linear = (x) => x
const ANCHOR = { travel: 454, scale: 0.5, originX: 1578, originY: 0 }
/** The group's own timeline, exactly what `--ds-transition-duration-slow` holds. */
const TOTAL = CASCADE_FALLBACK_TOTAL_MS
const spec = (cards) => ({
  cards, anchor: ANCHOR,
  duration: cascadeTiming(TOTAL, cards.length).duration,
  easeShift: linear, easeZoom: linear,
})
const cards = (n) => {
  const { step } = cascadeTiming(TOTAL, n)
  return Array.from({ length: n }, (_, i) => ({
    el: el(i * step), vx: 100 + i * 4, vy: -(100 + i * 4), delay: Math.round(i * step * 100) / 100, ownStyle: false,
  }))
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

// ── A. the timeline is the GROUP's, whatever the deck holds ─────────────────
{
  const rows = []
  let worst = 0
  for (const n of [1, 2, 3, 5, 14, 20]) {
    const { duration, step } = cascadeTiming(TOTAL, n)
    const clock = (n - 1) * step + duration
    worst = Math.max(worst, Math.abs(clock - TOTAL))
    rows.push(`n=${n}: ${duration}+${(n - 1)}×${step.toFixed(2)}=${clock.toFixed(2)}`)
    check(duration > 0 && (n === 1 || step >= 1),
      `n=${n}: one card's travel and the step are both real`,
      `duration ${duration}ms · step ${step.toFixed(2)}ms`)
  }
  check(worst <= 0.05, 'the fold’s whole timeline IS the group’s, at every deck size',
    `worst drift ${worst.toFixed(3)}ms of ${TOTAL}ms`)
  check(CASCADE_TRAVEL_SHARE > 0 && CASCADE_TRAVEL_SHARE < 1,
    'the split leaves room for both the travel and the cascade', String(CASCADE_TRAVEL_SHARE))
  // And the stamped ladder reproduces it: the last rank's delay plus one travel.
  for (const n of [2, 14, 20]) {
    const { duration, step } = cascadeTiming(TOTAL, n)
    const stamps = Array.from({ length: n }, (_, i) => Number.parseFloat(cascadeDelay(i, step)))
    const clock = stamps[n - 1] + duration
    check(near(clock, TOTAL, 0.02) && new Set(stamps).size === n,
      `n=${n}: the STAMPED delays add up to the group’s timeline, all distinct`,
      `${stamps[0]}…${stamps[n - 1]}ms + ${duration}ms = ${clock.toFixed(2)}ms`)
  }
  void rows
}

// ── A. the rank table ───────────────────────────────────────────────────────
{
  // A 3-column / 5-row deck plus the settings tile parked under the last row —
  // the live shape at 1578×1000 (measured: 13 cards + tile).
  const boxes = []
  const side = 130, pad = 10
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) boxes.push({ top: 2 + r * (side + pad), right: c * (side + pad) })
  boxes.push({ top: 2 + 5 * (side + pad), right: 0 })
  const { order, reverse } = cascadeRanks(boxes)
  const topRight = 0                                        // row 0, rightmost (right = 0)
  const lastRowLeft = 4 * 3 + 2                             // row 4, leftmost (right = 2·pitch)
  const tile = boxes.length - 1                             // the deepest element of the deck
  // The rank-0 box is the one the rule names: the biggest `top`, then the biggest
  // `right` (further left). Derived here from the data, not from the rule under test.
  const firstIdx = boxes.reduce((a, b, i) => (b.top > boxes[a].top || (b.top === boxes[a].top && b.right > boxes[a].right) ? i : a), 0)
  check(order[firstIdx] === 0, 'the bottom-left-most box is rank 0', `#${firstIdx} (tile ${tile})`)
  check(order[topRight] === boxes.length - 1, 'the top-right cell is the last rank', String(order[topRight]))
  check(order[tile] === 0 && order[lastRowLeft] === 1,
    'the settings tile folds with the deck, ranked by the same rule (it is the deepest element)',
    `tile ${order[tile]} · last-row-left ${order[lastRowLeft]}`)
  check(order[lastRowLeft] < order[topRight], 'the fold still runs bottom-left → top-right',
    `${order[lastRowLeft]} → ${order[topRight]}`)
  check(new Set(order).size === boxes.length, 'every participant has its own rank (nothing capped)',
    `${new Set(order).size}/${boxes.length} distinct`)
  check(reverse[firstIdx] === boxes.length - 1 && reverse[topRight] === 0, 'the collapse rank is the mirror',
    `out: first ${reverse[firstIdx]} · tr ${reverse[topRight]}`)
  const ladder = cascadeTiming(TOTAL, boxes.length)
  const delays = order.map((r) => Number.parseFloat(cascadeDelay(r, ladder.step)))
  check(new Set(delays).size === boxes.length, 'no two participants share a delay',
    `${new Set(delays).size} distinct of ${boxes.length}`)
  check(delays[firstIdx] === 0 && delays[topRight] === Number.parseFloat(cascadeDelay(boxes.length - 1, ladder.step)),
    'the delays span 0 → (n−1)·step', `0 → ${delays[topRight]}ms`)
}

// ── B. the MAP is the zoom shape's ──────────────────────────────────────────
{
  // The fold is only "the same motion as the group, one card at a time" if each
  // card's start state is the group's own affine map. `planCascade` is fed a fake
  // deck so the identity can be checked against the group's formula directly.
  const deckRect = { left: 1148, top: 48, width: 410, height: 842 }
  const boxes = [{ top: 2, right: 0 }, { top: 2, right: 280 }, { top: 142, right: 0 }, { top: 512, right: 280 }]
  const nodes = boxes.map((_, i) => el(i * cascadeTiming(TOTAL, boxes.length).step))
  const deck = { getBoundingClientRect: () => deckRect, querySelectorAll: () => nodes }
  const planned = planCascade(deck, boxes, ANCHOR, { totalMs: TOTAL, easeShift: linear, easeZoom: linear })
  let worst = 0
  for (let i = 0; i < boxes.length; i++) {
    const c = planned.cards[i]
    const cx = deckRect.left + (deckRect.width - boxes[i].right)
    const cy = deckRect.top + boxes[i].top
    // Walk three progress points: for each, the card's own map (origin = its
    // top-right corner, translate = (1−s)·v + travel·(1−es)) must land the corner
    // exactly where the group's map (origin = the shared anchor) lands it.
    for (const p of [0, 0.37, 1]) {
      const s = ANCHOR.scale + (1 - ANCHOR.scale) * linear(p)
      const x = (1 - s) * c.vx + ANCHOR.travel * (1 - linear(p))
      const y = (1 - s) * c.vy
      const got = [cx + x, cy + y]
      const want = [
        ANCHOR.originX + s * (cx - ANCHOR.originX) + ANCHOR.travel * (1 - linear(p)),
        ANCHOR.originY + s * (cy - ANCHOR.originY),
      ]
      worst = Math.max(worst, Math.abs(got[0] - want[0]), Math.abs(got[1] - want[1]))
    }
    check(c.vy === ANCHOR.originY - cy && c.vx === ANCHOR.originX - cx,
      `card ${i}: its offset is measured to the shared anchor`, `v (${c.vx}, ${c.vy})`)
  }
  check(worst < 1e-9, 'every card lands on the group’s map, edge for edge', `worst ${worst.toExponential(1)}px`)
  // …and at progress 0 the cards are OFF the screen's right edge (the anchor is
  // outside), which is the whole read of the effect.
  const starts = boxes.map((b, i) => {
    const cx = deckRect.left + (deckRect.width - b.right)
    const c = planned.cards[i]
    return cx + (1 - ANCHOR.scale) * c.vx + ANCHOR.travel
  })
  check(starts.every((x) => x > 1578), 'at progress 0 every card sits beyond the right edge',
    starts.map((x) => Math.round(x)).join(' '))
}

// ── B2. the visible band decides WHO is in the fold (owner, 2026-10-18) ─────
{
  // A 5-row deck (rows at top 2/152/302/452/602, side 150 — `placeCards`'s pitch for
  // side 140 + 10 pad) under a band that only shows the first three rows: the two
  // bottom rows are cut and must not be participants at all.
  const deckRect = { left: 1148, top: 48, width: 410, height: 842 }
  const side = 140, pitch = 150
  const boxes = []
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) boxes.push({ top: 2 + r * pitch, right: c * 150, h: side })
  boxes.push({ top: 2 + 5 * pitch, right: 0, h: side })          // the 设置 tile, below the last row
  const nodes = boxes.map(() => el())
  const deck = { getBoundingClientRect: () => deckRect, querySelectorAll: () => nodes }
  const timing = { totalMs: TOTAL, easeShift: linear, easeZoom: linear }
  const all = planCascade(deck, boxes, ANCHOR, timing)
  check(all.cards.length === boxes.length, 'with no band every box is a participant',
    `${all.cards.length}/${boxes.length}`)
  const band = { lo: -4, hi: -4 + 3 * pitch }                     // rows 0..2 are whole
  const cut = planCascade(deck, boxes, ANCHOR, timing, band)
  const inBand = boxes.filter((b) => !(b.top < band.lo - 0.5 || b.top + b.h > band.hi + 0.5)).length
  check(cut.cards.length === inBand && inBand === 6, 'the band decides the participants (cut rows are not folded)',
    `${cut.cards.length} of ${boxes.length} · in band ${inBand}`)
  check(cut.cards.every((c) => !nodes.slice(6, 11).includes(c.el)),
    '…and the 设置 tile, parked below the last row, drops out with them')
  const kept = cut.cards.map((c) => c.delay)
  const sorted = kept.slice().sort((a, b) => a - b)
  const step = sorted[1] - sorted[0]
  check(sorted[0] === 0 && sorted.every((v, i) => Math.abs(v - i * step) < 0.03),
    'the ladder is re-split over the cards that ARE in the fold (rank 0 still first)',
    `${sorted.join(', ')}ms`)
  const { duration } = cascadeTiming(TOTAL, cut.cards.length)
  check(Math.abs(sorted[sorted.length - 1] + duration - TOTAL) < 0.03,
    'and the shorter fold still lasts exactly the group’s own transition',
    `${sorted[sorted.length - 1]}ms + ${duration}ms = ${TOTAL}ms`)
  check(nodes.slice(6, 11).every((n) => n.style.getPropertyValue('--dsx-slot-delay') === ''),
    'a cut card carries no audit stamp (presence of the stamp IS participation)',
    nodes.slice(6, 11).map((n) => JSON.stringify(n.style.getPropertyValue('--dsx-slot-delay'))).join(' '))
  check(nodes.slice(0, 6).every((n) => n.style.getPropertyValue('--dsx-slot-delay') !== ''),
    'every participant is stamped with the delay the fold runs on',
    nodes.slice(0, 6).map((n) => n.style.getPropertyValue('--dsx-slot-delay')).join(' '))
  // The mirror stamp is the reverse rank, as before the band existed.
  const maxDelay = sorted[sorted.length - 1]
  check(nodes.slice(0, 6).every((n) => Math.abs(Number.parseFloat(n.style.getPropertyValue('--dsx-slot-delay'))
    + Number.parseFloat(n.style.getPropertyValue('--dsx-slot-delay-out')) - maxDelay) < 0.03),
    'the collapse stamp is the mirror of the fold stamp, over the participants only',
    nodes.slice(0, 6).map((n) => `${n.style.getPropertyValue('--dsx-slot-delay')}/${n.style.getPropertyValue('--dsx-slot-delay-out')}`).join(' '))
}

// ── the fake animator: a deterministic WAAPI with the compositor's own maths ──
/**
 * `createDeckCascade` now hands every card to `Element.animate()`. The engine is
 * therefore exercised against this stub: it records the keyframes, advances
 * `currentTime` with the test's clock, and answers "what transform is on screen
 * right now" by interpolating the keyframes exactly the way the compositor does
 * (linear between offsets, matching `translate(...) scale(...)` components).
 *
 * `animator()` is passed to `createDeckCascade` — production passes nothing and
 * gets `browserAnimator`.
 */
const live = new Set()
const lerpTransform = (a, b, u) => {
  const parse = (t) => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/.exec(t || '')
    return m === null ? null : { x: +m[1], y: +m[2], s: +m[3] }
  }
  const p = parse(a)
  const q = parse(b)
  if (p === null || q === null) return u < 0.5 ? a : b
  const x = p.x + (q.x - p.x) * u
  const y = p.y + (q.y - p.y) * u
  const s = p.s + (q.s - p.s) * u
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`
}
const animator = {
  animate(el, keyframes, opts) {
    const a = {
      el, keyframes, opts,
      currentTime: 0,
      playState: 'running',
      onfinish: null,
      cancel() { a.playState = 'idle'; live.delete(a) },
      transformNow() {
        const d = opts.duration
        const p = d > 0 ? Math.min(1, Math.max(0, a.currentTime / d)) : 1
        for (let i = 1; i < keyframes.length; i++) {
          if (p <= keyframes[i].offset) {
            const k0 = keyframes[i - 1]
            const k1 = keyframes[i]
            const span = k1.offset - k0.offset
            const u = span <= 0 ? 0 : (p - k0.offset) / span
            return lerpTransform(k0.transform, k1.transform, u)
          }
        }
        return keyframes[keyframes.length - 1].transform
      },
    }
    live.add(a)
    return a
  },
}
/** What is on screen for this card: the running animation, else the parked inline style. */
const visual = (c) => {
  for (const a of live) if (a.el === c.el) return a.transformNow()
  return c.el.style.transform || ''
}

// ── C. the forward fold ─────────────────────────────────────────────────────
{
  const cs = cards(5)
  const settled = []
  const cascade = createDeckCascade((end) => settled.push(end), animator)
  cascade.sync(spec(cs))
  const total = cascade.total
  check(total === TOTAL, 'the timeline is (n−1)·step + one travel — the group’s own duration',
    `${total}ms for 5 cards`)

  cascade.play('open')
  check(mag(visual(cs[0])) > 80, 'the first painted frame already sits on the start offset (no flash of the rest grid)',
    `${mag(visual(cs[0])).toFixed(1)}px`)
  check(cs.every((c) => mag(visual(c)) > 80), 'every card starts on its own offset')
  check(live.size === cs.length, 'one composited animation per participant', `${live.size} animations`)

  let elapsed = 0
  for (let i = 0; i < 200 && settled.length === 0; i++) { tick(); elapsed += 16 }
  check(settled.join() === 'open', 'the fold reports exactly one settle, at the open end', settled.join())
  check(Math.abs(elapsed - total) <= 32, 'it takes the computed timeline to settle', `${elapsed}ms vs ${total}ms`)
  check(cs.every((c) => c.el.style.transform === ''), 'a settled fold leaves NO transform behind',
    cs.map((c) => c.el.style.transform).join('|'))
  check(live.size === 0, 'and no animation is left running', String(live.size))

  // Rank order: after one travel the first rank is home, while the last rank
  // (delay 120ms) is still on its way — the fold is a sequence, not one block.
  const cs2 = cards(5)
  const c2 = createDeckCascade(() => {}, animator)
  c2.sync(spec(cs2))
  c2.play('open')
  for (let i = 0; i < 16; i++) tick()          // ~256ms
  check(mag(visual(cs2[0])) < 0.5, 'after one travel the first rank is home',
    `${mag(visual(cs2[0])).toFixed(2)}px`)
  check(mag(visual(cs2[4])) > 5, 'later ranks are still moving', `${mag(visual(cs2[4])).toFixed(1)}px`)
  check(mag(visual(cs2[0])) < mag(visual(cs2[4])) + 0.01, 'later ranks lag behind earlier ones',
    `rank0 ${mag(visual(cs2[0])).toFixed(0)} < rank4 ${mag(visual(cs2[4])).toFixed(0)}`)
  c2.release()
}

// ── D. the collapse is the mirror ───────────────────────────────────────────
{
  const cs = cards(5)
  const settled = []
  const cascade = createDeckCascade((end) => settled.push(end), animator)
  cascade.sync(spec(cs))
  cascade.play('open')
  for (let i = 0; i < 200 && settled.length === 0; i++) tick()
  settled.length = 0
  cascade.play('closed')
  tick()                                       // the first frame of the reverse segment
  tick()                                       // …and the second
  check(mag(visual(cs[4])) > 5, 'the collapse starts with the LAST rank',
    `rank4 ${mag(visual(cs[4])).toFixed(1)}px`)
  check(mag(visual(cs[0])) < 0.5, '…while the first rank has not moved yet',
    `${mag(visual(cs[0])).toFixed(2)}px`)
  for (let i = 0; i < 200 && settled.length === 0; i++) tick()
  check(settled.join() === 'closed', 'the collapse reports one settle, at the closed end', settled.join())
  check(cs.every((c) => c.el.style.transform !== ''), 'the retracted fold is LEFT at its start offsets (the deck is retired on this report)',
    cs.map((c) => Math.round(mag(c.el.style.transform))).join(' '))
  cascade.release()
  check(cs.every((c) => c.el.style.transform === ''), 'a deck that STAYS on screen is released instead, and that clears it')
}

// ── E. an interruption stays continuous ─────────────────────────────────────
{
  const cs = cards(6)
  const settled = []
  const cascade = createDeckCascade((end) => settled.push(end), animator)
  cascade.sync(spec(cs))
  cascade.play('open')
  for (let i = 0; i < 8; i++) tick()           // ~128ms in, mid-fold
  // The start state is the GROUP's map, so a card's total travel is dominated by
  // `travel` (454px here), not by its own offset from the anchor.
  const startMag = (c) => Math.hypot((1 - ANCHOR.scale) * c.vx + ANCHOR.travel, (1 - ANCHOR.scale) * c.vy)
  const before = cs.map((c, i) => mag(visual(c)) - startMag(c))
  check(before.some((d) => d < -5), 'the fold is genuinely mid-flight when it is reversed',
    before.map((d) => d.toFixed(0)).join(' '))

  cascade.play('closed')                       // THE interruption (a close during an open)
  // The reversal re-bases `t` off the running animation's `currentTime`, so the first
  // frame must not jump, and no later frame may step further than one travel's worth.
  let worst = 0
  let last = cs.map((c) => mag(visual(c)))
  for (let i = 0; i < 300 && settled.length === 0; i++) {
    tick()
    const nowMags = cs.map((c) => mag(visual(c)))
    nowMags.forEach((m, k) => { worst = Math.max(worst, Math.abs(m - last[k])) })
    last = nowMags
  }
  const stepCap = Math.max(...cs.map(startMag)) * (16 / cascadeTiming(TOTAL, cs.length).duration) + 6
  check(worst <= stepCap, 'no card JUMPS across the reversal (bounded per-frame step)',
    `worst ${worst.toFixed(1)}px ≤ ${stepCap.toFixed(1)}px`)
  check(settled.join() === 'closed', 'the reversed fold still reaches the closed end', settled.join())
  cascade.release()

  // …and the other direction: a re-open during the collapse finishes OPEN.
  settled.length = 0
  cascade.play('open')
  for (let i = 0; i < 10; i++) tick()
  cascade.play('closed')
  for (let i = 0; i < 6; i++) tick()
  cascade.play('open')
  for (let i = 0; i < 300 && settled.length === 0; i++) tick()
  check(settled.join() === 'open', 'open → close → open ends OPEN, with the last command winning', settled.join())
}

// ── F. a re-plan must never move a fold that is on screen ───────────────────
{
  const cs = cards(4)
  const cascade = createDeckCascade(() => {}, animator)
  cascade.sync(spec(cs))
  cascade.play('open')
  for (let i = 0; i < 6; i++) tick()
  const before = cs.map((c) => visual(c))
  // The drawer's FIRST committed frame resolves the grid before the rail has been
  // measured, so a corrected plan arrives ~2 frames into the open — with different
  // delays and a different anchor. Adopting it would move every card to a new place
  // under a running fold (measured live: 168px → 71px in one frame).
  const replan = cs.map((c, i) => ({ ...c, vx: 40 - i * 10, vy: 40 + i * 10, delay: Math.round((cs.length - 1 - i) * cascadeTiming(TOTAL, cs.length).step * 100) / 100 }))
  cascade.sync(spec(replan))
  check(cs.every((c, i) => visual(c) === before[i]),
    'a plan that arrives mid-fold is REFUSED (the cards keep their motion)',
    cs.map((c, i) => (visual(c) === before[i] ? '·' : 'X')).join(''))
  for (let i = 0; i < 200; i++) tick()
  check(cs.every((c) => c.el.style.transform === ''), 'and the fold still settles clean')

  // The other half of the rule: the CLOSED end deliberately leaves its offsets
  // parked, so "the timeline is at an end" is not "the cards are at rest" — a plan
  // arriving there must be refused too, or the whole retracted stack would move.
  const held = createDeckCascade(() => {}, animator)
  const parked = cards(3)
  held.sync(spec(parked))
  held.play('open')
  for (let i = 0; i < 200; i++) tick()
  held.play('closed')
  for (let i = 0; i < 200; i++) tick()
  const retracted = parked.map((c) => c.el.style.transform)
  check(retracted.every((v) => v !== ''), 'a closed fold leaves its stack parked on screen',
    retracted.map((v) => Math.round(mag(v))).join(' '))
  held.sync(spec(parked.map((c, i) => ({ ...c, vx: 5 + i, vy: 5 - i, delay: i * 100 }))))
  check(parked.every((c, i) => c.el.style.transform === retracted[i]),
    'a plan offered while the stack is parked is REFUSED (the stack does not move)',
    parked.map((c, i) => (c.el.style.transform === retracted[i] ? '·' : 'X')).join(''))
  held.release()
  // …while a plan that arrives with the fold AT REST is adopted.
  cascade.release()
  cascade.sync(spec(replan))
  check(cascade.total === TOTAL, 'a plan offered at rest IS adopted', `${cascade.total}ms`)
}

// ── G. release and jump (what a shape switch and reduced motion do) ─────────
{
  const cs = cards(4)
  const cascade = createDeckCascade(() => {}, animator)
  cascade.sync(spec(cs))
  cascade.play('open')
  for (let i = 0; i < 6; i++) tick()
  check(cs.some((c) => visual(c) !== ''), 'a fold in flight really is animating')
  cascade.release()
  check(cs.every((c) => c.el.style.transform === ''), 'release() hands every card back at rest')
  check(live.size === 0, 'release() stops every animation (no orphan frame)')
  check(cascade.state() === 'closed', 'release() parks the timeline at the closed end', cascade.state())

  for (let i = 0; i < 3; i++) tick()
  check(cs.every((c) => c.el.style.transform === ''), 'a released fold never repaints')

  cascade.jump('open')
  check(cascade.state() === 'open' && cs.every((c) => c.el.style.transform === ''), 'jump() settles without animating')
  check(live.size === 0, 'jump() leaves no animation running')
  // A no-op command must still report: the drawer unmounts on that report.
  const reported = []
  const c2 = createDeckCascade((end) => reported.push(end), animator)
  c2.sync(spec(cards(2)))
  c2.play('closed')
  check(reported.join() === 'closed', 'a fold already at the requested end still reports the settle', reported.join())
}

// ── H. the tile's own origin/transition are lent and given back ─────────────
{
  const tile = { style: { transform: '', transition: '', transformOrigin: '' }, classList: { contains: () => true } }
  const cascade = createDeckCascade(() => {}, animator)
  cascade.sync({ cards: [{ el: tile, vx: 100, vy: -100, delay: 0, ownStyle: true }], anchor: ANCHOR, duration: cascadeTiming(TOTAL, 1).duration, easeShift: linear, easeZoom: linear })
  cascade.play('open')
  tick()
  check(tile.style.transformOrigin === 'top right' && tile.style.transition === 'none',
    'the 设置 tile is pinned to the shared origin while the fold drives it',
    `${tile.style.transformOrigin} / ${tile.style.transition}`)
  for (let i = 0; i < 100; i++) tick()
  check(tile.style.transform === '' && tile.style.transformOrigin === '' && tile.style.transition === '',
    'and handed its own origin, transition and transform back afterwards',
    `${tile.style.transform} / ${tile.style.transformOrigin} / ${tile.style.transition}`)
}

// ── I. the sampled keyframes ARE the continuous map ────────────────────────
{
  // What the compositor interpolates linearly between two keyframes must be within
  // a quarter pixel of `foldTransformAt` at every instant — otherwise the motion a
  // live probe samples would drift off the group's map the zoom shape defines.
  const parse = (t) => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/.exec(t || '')
    return m === null ? null : { x: +m[1], y: +m[2], s: +m[3] }
  }
  const ctx = { duration: cascadeTiming(TOTAL, 6).duration, anchor: ANCHOR, easeShift: curveToProgress({ x1: 0.31, y1: 0.66, x2: 0.51, y2: 1 }), easeZoom: curveToProgress({ x1: 0.31, y1: 0.66, x2: 0.51, y2: 1 }) }
  const cs = cards(6)
  let worst = 0
  let worstAt = 0
  for (const c of cs) {
    const kfs = foldKeyframes(c, ctx, 0, TOTAL)
    check(kfs.length >= 3 && kfs[0].offset === 0 && kfs[kfs.length - 1].offset === 1,
      `card delay ${c.delay}ms: the keyframes span the whole segment`,
      `${kfs.length} keyframes`)
    check(kfs.every((k, i) => i === 0 || k.offset > kfs[i - 1].offset), '…with strictly increasing offsets')
    check(kfs.every((k) => k.easing === 'linear'), '…and one linear segment each (the curves are in the values)')
    for (let t = 0; t <= TOTAL; t += 3.7) {
      let got = kfs[kfs.length - 1].transform
      for (let i = 1; i < kfs.length; i++) {
        if (t <= kfs[i].offset * TOTAL) {
          const k0 = kfs[i - 1]
          const k1 = kfs[i]
          const span = k1.offset - k0.offset
          const u = span <= 0 ? 0 : (t / TOTAL - k0.offset) / span
          got = lerpTransform(k0.transform, k1.transform, u)
          break
        }
      }
      const want = foldTransformAt(c, ctx, t)
      const a = parse(got)
      const b = parse(want)
      const err = Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(a.s - b.s) * 300
      if (err > worst) { worst = err; worstAt = t }
    }
  }
  check(worst < 0.25, 'sampled keyframes stay within a quarter pixel of the continuous map',
    `worst ${worst.toFixed(3)}px (equiv.) at t=${worstAt.toFixed(0)}ms`)
  const end = foldTransformAt(cs[0], ctx, TOTAL)
  check(/translate\(0\.00px, 0\.00px\) scale\(1\.0000\)/.test(end), 'the open end is exactly identity', end)
}

console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'}`)
process.exit(fails.length === 0 ? 0 : 1)
