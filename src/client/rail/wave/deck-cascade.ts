/**
 * dsh-widgets — the rail deck's per-card open/close cascade ('stagger' shape).
 *
 * WHAT THIS OWNS: every card of the resting deck (and the 设置 tile that shares
 * its grid) travelling along THE VERY SAME PATH the 'zoom' shape moves the whole
 * group along — each card simply gets its own timing. The rail's own box does not
 * move in this shape (see the drawer in rail-view.tsx); only the cards do.
 *
 * ── THE PATH IS THE ZOOM SHAPE'S, PER CARD ──
 *
 * 'zoom' puts two transforms on two nested `inset: 0` boxes, both anchored at the
 * WRAPPER's top-right corner `O` — the viewport's own top-right, measured live as
 * `transform-origin: 1578px 0px` at a 1578px window:
 *
 *     outer wrapper   translateX(travel)     on the position curve
 *     inner layer     scale(s0)              on the zoom curve
 *
 * so a point `p` of a card maps to `O + s·(p − O) + (travel, 0)`. `stagger`
 * reproduces exactly that affine map PER CARD, with `s` and `travel` driven by the
 * same two curves — the only difference is that each card's progress is its own,
 * offset by its rank in the fold. The anchor therefore stays the viewport's
 * top-right corner, which is OFF THE SCREEN: the cards fly in from beyond the
 * rail's right edge (the rail is pinned to that edge), not out of a corner of the
 * grid.
 *
 * The identity is exact, and worth stating because the implementation does not
 * literally translate a wrapper: with the card's own top-right corner `Oc` as the
 * CSS `transform-origin` (which is what `.dsx-stats-card-slot` already carries),
 *
 *     translate((1−s)·(O − Oc) + (travel, 0)) scale(s)
 *
 * denotes the map
 *
 *     Oc + s·(p − Oc) + (1−s)(O − Oc) + (travel, 0)  =  O + s·(p − O) + (travel, 0)
 *
 * i.e. the group's own. No translation is smuggled in: at any (s, travel) the
 * card's four edges land exactly where the zoom shape would have put them, which
 * is what the live probe checks pixel by pixel.
 *
 * THE RAIL'S CLIP IS FINE, and is the effect: the rail clips its own subtree, so
 * a card pushed past its right edge is simply not painted. The cards enter the
 * rail's strip from off-screen, one after another — hidden until their turn brings
 * them across the edge, which is exactly what "each component arrives on its own
 * beat from outside the screen" looks like.
 *
 * ── WHY A JS CLOCK, NOT A CSS TRANSITION ──
 *
 * The cascade must survive a rapid reversal (a close interrupting an open, and
 * back) by CONTINUING FROM THE CURRENT PROGRESS. A CSS transition cannot do it:
 * the per-card `transition-delay` is re-applied the moment the target flips, so
 * the cards that are already part-way in — the ones with the SMALLEST forward
 * delay, i.e. exactly the ones a mirror order schedules LAST — freeze in place for
 * their new delay (measured shape of the bug: the bottom-left card holds a fully
 * open position for ~570ms before it starts back). One shared clock, advanced
 * forwards or backwards, makes both directions ONE timeline: the reverse cascade
 * is the same timeline read backwards, so the mirror order falls out of the rank
 * table for free, and an interruption is only a change of the clock's sign — no
 * jump, no freeze, no restart. `prefers-reduced-motion` never reaches this module:
 * rail-view jumps the drawer instead of playing it. A plan is never swapped under
 * a running clock, either (see `sync`).
 *
 * Per-frame writes are inline `transform` only (no layout property, no React
 * render): the card list is read once per command and the clock touches nothing
 * else.
 */

/**
 * The timeline the fold is allowed — the GROUP's own duration (fallback).
 *
 * Both 'zoom' transforms are declared as `transform var(--ds-transition-duration-slow)
 * …`, so a fold that took longer than that variable would visibly outlast the shape
 * it is a version of (measured: 220ms per card + 13 × 30ms of cascade = 610ms
 * against the shell's 300ms, i.e. TWICE the gesture it is supposed to be a version
 * of; the timeline is now derived from that variable — see {@link cascadeTiming}).
 * This constant is only what {@link groupDurationMs} falls back to when the shell
 * publishes nothing readable.
 */
export const CASCADE_FALLBACK_TOTAL_MS = 300

/**
 * How much of that timeline ONE card's own travel takes; the rest is spread over
 * the ranks as the cascade.
 *
 * The two are a trade: a longer travel reads slower and smoother but leaves less
 * room to stagger, and vice versa. 60/40 keeps the visible part of a card's
 * entrance (it is off-screen for the first ~70% of the group's own path — the rail
 * clips it) in the same order as the group's, while 14 cells still get 9ms of
 * separation each, which is a clear beat at 60Hz.
 */
export const CASCADE_TRAVEL_SHARE = 0.6

/**
 * How long a memoised {@link groupDurationMs} answer may be served.
 *
 * The value is a THEME constant (the shell's own slow transition), but reading it costs a
 * `getComputedStyle` on the document root — a forced style recalc whenever the document is
 * dirty, which it is by design while the rail animates. It used to be read from the RENDER
 * BODY of rail-view (`cascadeTimingRef` is computed per render), measured 2026-10-03 at 41
 * reads per 8 fold toggles — one of the ten most frequent forced reads of the fold. The TTL
 * is what keeps a theme change from being missed for longer than one gesture's worth of
 * frames while making repeated renders free.
 */
const GROUP_MS_MAX_AGE = 250

/** Memo for {@link groupDurationMs} (see {@link GROUP_MS_MAX_AGE}). */
let groupMsCache = -1
let groupMsAt = -1

/**
 * The shell's own slow transition, in ms.
 *
 * `getComputedStyle` on a custom property returns its raw token, so both spellings
 * a stylesheet may use are accepted; anything unreadable falls back to the value
 * the group's transitions were written against.
 */
export function groupDurationMs(fallback: number = CASCADE_FALLBACK_TOTAL_MS): number {
  if (typeof document === 'undefined') return fallback
  const now = typeof performance === 'undefined' ? Date.now() : performance.now()
  if (groupMsAt >= 0 && now - groupMsAt < GROUP_MS_MAX_AGE) return groupMsCache
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ds-transition-duration-slow').trim()
  const n = raw.endsWith('ms') ? Number.parseFloat(raw)
    : raw.endsWith('s') ? Number.parseFloat(raw) * 1000
      : Number.NaN
  groupMsCache = Number.isFinite(n) && n > 0 ? n : fallback
  groupMsAt = now
  return groupMsCache
}

/**
 * Split the group's timeline into one card's travel and the per-rank step.
 *
 * The whole point is that `(participants − 1) · step + duration` IS the group's
 * duration: the fold is the same gesture, not a longer one, whatever the deck
 * holds. The step is therefore FRACTIONAL (the stamp rounds it to 0.01ms — see
 * {@link cascadeDelay}), because rounding it to whole milliseconds would either
 * overshoot the group or leave the fold short of it by up to one rank's worth.
 * It is never below 1ms, so every rank keeps a distinct beat even on a 20-cell
 * deck.
 */export function cascadeTiming(totalMs: number, participants: number): { duration: number; step: number } {
  const total = Number.isFinite(totalMs) && totalMs > 0 ? totalMs : CASCADE_FALLBACK_TOTAL_MS
  const ranks = Math.max(0, participants - 1)
  // A deck of ONE has no cascade to spread over, so that card simply does the
  // group's whole gesture — it is the group.
  const duration = Math.max(1, Math.round(total * (ranks === 0 ? 1 : CASCADE_TRAVEL_SHARE)))
  const step = ranks === 0 ? 0 : Math.max(1, (total - duration) / ranks)
  return { duration, step }
}

/** The deck's cascade participants: every card cell, plus the 设置 tile. */
const CASCADE_SELECTOR = '.dsx-stats-card-slot, .dsx-stats-add'

/** One participant's box inside the deck, in the deck's own coordinates. */
export interface CascadeBox {
  /** Distance from the deck's TOP edge (`placeCards`'s `top`). */
  top: number
  /** Distance from the deck's RIGHT edge (`placeCards`'s `right`). */
  right: number
}

/**
 * The corner BOTH shapes start from, plus the 'zoom' shape's two start values —
 * read from the live drawer (its computed `transform-origin`) and from the same
 * numbers rail-view hands the group transform, so the two shapes cannot drift.
 */
export interface CascadeAnchor {
  /** `translateX` the whole-group zoom starts from: `railW + 24`. */
  travel: number
  /** Scale the whole-group zoom starts from: `prefs.animScale`. */
  scale: number
  /** The drawer wrapper's `transform-origin` x — the viewport's right edge. */
  originX: number
  /** …and its y, which is the viewport's top edge (0). */
  originY: number
}

/** Timing the deck is animated with — the same two curves the group rides. */
export interface CascadeTiming {
  /**
   * One card's own travel (ms). Derived so that
   * `(participants − 1) · step + duration` IS the group's duration — see
   * {@link cascadeTiming}.
   */
  duration: number
  /** The POSITION curve (`prefs.animShiftCurve`) evaluated on [0,1]. */
  easeShift: (x: number) => number
  /** The ZOOM curve (`prefs.animCurve`) evaluated on [0,1]. */
  easeZoom: (x: number) => number
}

/** One element's part in the fold. */
export interface CascadeCard {
  el: HTMLElement
  /** `O − Oc` (px): the card's top-right corner to the shared anchor. */
  vx: number
  vy: number
  /** Cascade delay (ms): the card's rank in the fold × the step in `cascadeTiming`. */
  delay: number
  /**
   * The 设置 tile carries its own centred `transform-origin`, a hover `transform`
   * and a `transform` transition: while the fold drives it all three are pinned
   * and then restored, or the tile would scale about the wrong point and trail the
   * fold through its own hover transition.
   */
  ownStyle: boolean
}

/** The cards of one fold, ready to play. */
export interface CascadeSpec extends CascadeTiming {
  cards: readonly CascadeCard[]
  anchor: CascadeAnchor
}

/** Which end of the timeline a command is aiming at. */
export type CascadeEnd = 'open' | 'closed'
/** Where the clock actually is. `to-*` means a fold is in flight. */
export type CascadeState = 'open' | 'closed' | 'to-open' | 'to-closed'

export interface DeckCascade {
  /** One timeline length (ms): the last rank's delay plus one card's travel. */
  readonly total: number
  state: () => CascadeState
  /** Replace the card list, the anchor and the timing — safe to call every render. */
  sync: (spec: CascadeSpec) => void
  /** Animate toward `end` from wherever the clock is now. */
  play: (end: CascadeEnd) => void
  /** Put the clock at `end` WITHOUT animating. */
  jump: (end: CascadeEnd) => void
  /** Stop and hand the cards back at their final layout position. */
  release: () => void
}

/**
 * The fold's order: the deck's BOTTOM-LEFT cell first, its TOP-RIGHT cell last.
 *
 * The key is `top · 100000 + right`: a bigger `top` is lower on screen and a bigger
 * `right` is further LEFT (the deck is right-anchored), so ranking the key
 * descending walks the deck from its bottom-left corner to its top-right one.
 * `reverse` is the same order mirrored — the collapse reads it back out, and it is
 * also what an interruption falls into, because the collapse is the same timeline
 * played backwards.
 *
 * `boxes` carries one entry per participant in DOM order (the cards, then the
 * settings tile), which is the order of the returned ranks.
 */
export function cascadeRanks(boxes: ReadonlyArray<{ top: number; right: number }>): { order: number[]; reverse: number[] } {
  const keys = boxes.map((b, i) => ({ i, key: b.top * 100000 + b.right }))
  keys.sort((a, b) => b.key - a.key)
  const order = new Array<number>(boxes.length).fill(0)
  keys.forEach((k, rank) => { order[k.i] = rank })
  const max = Math.max(0, boxes.length - 1)
  return { order, reverse: order.map((r) => max - r) }
}

/**
 * The cascade delay a rank runs at, as the CSS time the deck stamps per slot.
 *
 * Rounded to 0.01ms so the stamp stays readable while the ladder stays exact: the
 * last rank's stamp plus one travel is the group's duration to within a hundredth
 * of a millisecond.
 */
export function cascadeDelay(rank: number, step: number): string {
  return `${Math.round(Math.max(0, rank) * Math.max(0, step) * 100) / 100}ms`
}

/** Read a slot's stamped cascade delay off the element (see {@link cascadeDelay}). */
function delayOf(el: HTMLElement): number {
  const n = Number.parseFloat(el.style.getPropertyValue('--dsx-slot-delay'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Turn the deck's LAYOUT into the fold's start state: one entry per participant,
 * each carrying the vector from its own top-right corner to the shared anchor.
 *
 * The deck's live box is read here (never the cards'): the deck is drawn where the
 * layout puts it, whereas a card in the middle of a fold is exactly the thing whose
 * box is not its layout box. A plan is only ever adopted with the deck at rest (see
 * `sync`), so this read is a rest-state read by construction.
 *
 * `boxes` carries one entry per participant in DOM order (the cards, then the
 * settings tile) — the same order `querySelectorAll` walks, so an element and its
 * box line up by index.
 */
export function planCascade(
  deck: HTMLElement,
  boxes: ReadonlyArray<CascadeBox>,
  anchor: CascadeAnchor,
  timing: CascadeTiming,
): CascadeSpec {
  const deckRect = deck.getBoundingClientRect()
  const nodes = Array.from(deck.querySelectorAll<HTMLElement>(CASCADE_SELECTOR))
  const cards: CascadeCard[] = nodes.map((el, i) => {
    const box = boxes[i] ?? { top: 0, right: 0 }
    // The card's own top-right corner in viewport coordinates: the boxes are
    // deck-relative, with `right` measured from the deck's right edge.
    return {
      el,
      vx: anchor.originX - (deckRect.left + (deckRect.width - box.right)),
      vy: anchor.originY - (deckRect.top + box.top),
      delay: delayOf(el),
      ownStyle: el.classList.contains('dsx-stats-add'),
    }
  })
  return { cards, anchor, ...timing }
}

/**
 * Build the deck's cascade driver.
 *
 * `onSettle` fires exactly once per fold that reaches an end — including the no-op
 * case where the clock is already there — which is what lets the drawer unmount on
 * the real end of the leave instead of on a timer that the next phase change can
 * cancel.
 */
export function createDeckCascade(onSettle: (end: CascadeEnd) => void): DeckCascade {
  let spec: CascadeSpec = {
    cards: [],
    duration: Math.round(CASCADE_FALLBACK_TOTAL_MS * CASCADE_TRAVEL_SHARE),
    easeShift: (x) => x,
    easeZoom: (x) => x,
    anchor: { travel: 0, scale: 1, originX: 0, originY: 0 },
  }
  let total = 0
  let t = 0
  let dir: 0 | 1 | -1 = 0
  let raf = 0
  let last = 0
  /**
   * Does the deck currently CARRY a fold state (at least one card parked on its
   * start offset)? The retracted end of a fold deliberately leaves those offsets in
   * place until the deck is retired, so "the clock is at an end" is NOT the same
   * question as "the cards are at rest" — see {@link DeckCascade.sync}.
   */
  let painted = false

  const length = (): number => {
    let maxDelay = 0
    for (const c of spec.cards) if (c.delay > maxDelay) maxDelay = c.delay
    return maxDelay + Math.max(0, spec.duration)
  }

  const stop = (): void => {
    if (raf !== 0) cancelAnimationFrame(raf)
    raf = 0
    last = 0
  }

  /** Put every card back at its final layout position (no transform, no override). */
  const clear = (): void => {
    painted = false
    for (const c of spec.cards) {
      if (c.el.style.transform !== '') c.el.style.transform = ''
      if (c.ownStyle) {
        if (c.el.style.transformOrigin !== '') c.el.style.transformOrigin = ''
        if (c.el.style.transition !== '') c.el.style.transition = ''
      }
    }
  }

  /**
   * The zoom shape's own map, on this card's progress: `s` rides the zoom curve and
   * `travel` the position curve, and the translation is the one that carries the
   * card's top-right corner to the shared anchor at that scale.
   */
  const write = (c: CascadeCard, p: number): void => {
    if (p >= 1) {
      if (c.el.style.transform !== '') c.el.style.transform = ''
      if (c.ownStyle) {
        if (c.el.style.transformOrigin !== '') c.el.style.transformOrigin = ''
        if (c.el.style.transition !== '') c.el.style.transition = ''
      }
      return
    }
    if (c.ownStyle) {
      if (c.el.style.transformOrigin !== 'top right') c.el.style.transformOrigin = 'top right'
      if (c.el.style.transition !== 'none') c.el.style.transition = 'none'
    }
    const s = spec.anchor.scale + (1 - spec.anchor.scale) * spec.easeZoom(p)
    const k = 1 - s
    const x = k * c.vx + spec.anchor.travel * (1 - spec.easeShift(p))
    const y = k * c.vy
    c.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`
  }

  const paint = (): void => {
    let parked = false
    for (const c of spec.cards) {
      const raw = spec.duration > 0 ? (t - c.delay) / spec.duration : (t >= c.delay ? 1 : 0)
      const p = raw <= 0 ? 0 : raw >= 1 ? 1 : raw
      write(c, p)
      if (p < 1) parked = true
    }
    painted = parked
  }

  const settle = (end: CascadeEnd): void => {
    dir = 0
    stop()
    // The OPEN end IS the layout rest state (progress 1 = no transform), so the
    // paint above has already cleared every card. The CLOSED end is the fold's start
    // offsets, and they must STAY painted: the drawer is retired on this very
    // report, and clearing here would snap every card from its offset to its final
    // cell if the browser painted between this callback and React's commit. Callers
    // that keep the deck on screen release it instead (see rail-view's settle
    // handler), which is the one path that needs the transforms gone.
    if (end === 'open') clear()
    onSettle(end)
  }

  const step = (now: number): void => {
    raf = 0
    // A long frame (a data fold, a layout pass) must not teleport the fold: the
    // clock advances by measured time, bounded so a stalled tab lands near the end
    // instead of past it. The bound is generous on purpose — it only has to catch a
    // genuinely stalled frame, and every millisecond it clips is a millisecond the
    // fold runs long.
    const dt = last === 0 ? 0 : Math.min(96, Math.max(0, now - last))
    last = now
    t = Math.max(0, Math.min(total, t + dir * dt))
    paint()
    if (dir > 0 && t >= total) { settle('open'); return }
    if (dir < 0 && t <= 0) { settle('closed'); return }
    raf = requestAnimationFrame(step)
  }

  const run = (sign: 1 | -1): void => {
    dir = sign
    last = 0
    if (raf === 0) raf = requestAnimationFrame(step)
  }

  return {
    get total() { return total },
    state: () => (dir > 0 ? 'to-open' : dir < 0 ? 'to-closed' : t >= total ? 'open' : 'closed'),
    sync: (next: CascadeSpec) => {
      // A plan may only replace the current one when the deck is genuinely AT REST
      // — no fold in flight, and no retracted stack still parked on screen.
      //
      // Both halves are load-bearing. Adopting a new grid under a running clock
      // teleports every card whose delay or anchor changed (measured live: a 168px
      // → 71px step in one frame, because the drawer's first committed frame
      // resolves the grid before the rail has been measured and the corrected one
      // arrives ~2 frames later, i.e. mid-fold). And the CLOSED end of a fold
      // deliberately leaves its offsets painted until the deck is retired, so a
      // re-plan arriving in that window would move the whole retracted stack.
      //
      // A layout change is therefore absorbed by the NEXT fold: it starts from the
      // stack that is on screen and lands on whatever the layout is by then (a
      // settled card carries no transform, so the end state is always the live
      // grid). The cards' own re-seat transition still glides them meanwhile.
      if (dir !== 0 || painted) return
      spec = next
      total = length()
      if (t > total) t = total
    },
    play: (end: CascadeEnd) => {
      const forward = end === 'open'
      if (forward ? dir > 0 : dir < 0) return
      if (forward ? t >= total : t <= 0) { settle(end); return }
      // Paint the CURRENT position before the clock starts: a fold beginning at
      // `t = 0` must have its cards on their start offsets in the same commit that
      // started it, or the first painted frame shows the settled deck and the next
      // one snaps it back (the command runs from a layout effect, i.e. still before
      // the browser paints).
      paint()
      run(forward ? 1 : -1)
    },
    jump: (end: CascadeEnd) => {
      stop()
      dir = 0
      t = end === 'open' ? total : 0
      clear()
    },
    release: () => {
      stop()
      dir = 0
      t = 0
      clear()
    },
  }
}
