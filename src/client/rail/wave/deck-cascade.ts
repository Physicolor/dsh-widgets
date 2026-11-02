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
 * wrapper's `transform-origin` `O` — `right var(--dsx-rail-top, 0px)`, i.e. the
 * viewport's right edge at the RAIL's own top (~44px live), just outside the
 * strip the cards occupy:
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
 * ── WHY THERE IS A THIRD PATH WITH NO VERTICAL AT ALL ('slide') ──
 *
 * Copying the group's map per card is what makes the fold read as a DROP: the
 * vertical start offset is `(1 − s0) · vy`, and `vy` is the card's distance from
 * the rail's top, so with the shipped `animScale = 0.88` a card 700px down the
 * deck starts 84px ABOVE its cell while one at the top barely moves. That is a
 * faithful copy of the group map and still the wrong motion for a deck — owner
 * report 2026-11-02: the anchor reads as 「整个桌面端窗口的某一绝对值」 rather than
 * something belonging to the component area, which is exactly what a per-card
 * offset proportional to its absolute distance from `O` looks like.
 *
 * 'slide' therefore keeps everything the stagger owns (one shared timeline, the
 * rank ladder, the reversal, the band filter) and drops the second channel: the
 * card travels on X only, no scale, no origin. What that buys, beyond the motion
 * itself:
 *
 *   - no forced layout read: the plan no longer needs `deck.getBoundingClientRect()`
 *     (the offsets it produced are exactly the ones 'slide' does not use);
 *   - no per-card `transform-origin` write, and none of the 设置 tile's origin
 *     lending — a pure translation is origin-agnostic;
 *   - no raster-scale changes. A scale animation makes the compositor re-raster
 *     the card's text as the factor grows; a translate-only animation never does,
 *     which is the cheap path on a deck of text cards.
 *
 * THE RAIL'S CLIP IS FINE, and is the effect: the rail clips its own subtree, so
 * a card pushed past its right edge is simply not painted. The cards enter the
 * rail's strip from off-screen, one after another — hidden until their turn brings
 * them across the edge, which is exactly what "each component arrives on its own
 * beat from outside the screen" looks like.
 *
 * ── THE TIMELINE IS OURS; THE INTERPOLATION IS THE COMPOSITOR'S ──
 *
 * The cascade must survive a rapid reversal (a close interrupting an open, and
 * back) by CONTINUING FROM THE CURRENT PROGRESS. A CSS transition cannot do it:
 * the per-card `transition-delay` is re-applied the moment the target flips, so
 * the cards that are already part-way in — the ones with the SMALLEST forward
 * delay, i.e. exactly the ones a mirror order schedules LAST — freeze in place for
 * their new delay (measured shape of the bug: the bottom-left card holds a fully
 * open position for ~570ms before it starts back). One shared timeline, advanced
 * forwards or backwards, makes both directions ONE timeline: the reverse cascade
 * is the same timeline read backwards, so the mirror order falls out of the rank
 * table for free, and an interruption is only a change of the timeline's sign —
 * no jump, no freeze, no restart. `prefers-reduced-motion` never reaches this
 * module: rail-view jumps the drawer instead of playing it. A plan is never
 * swapped under a running fold, either (see `sync`).
 *
 * So the TIMELINE lives here (one `t` in ms), and every card is animated with a
 * Web Animation whose keyframes are SAMPLES of this module's own map between
 * `t` and the target. Two things follow:
 *
 *   - the per-frame work is zero. The previous implementation wrote an inline
 *     `transform` on every card from a `requestAnimationFrame` clock; that is
 *     cheap per frame (~0.5ms for a deck), but it STOPS with the main thread. On
 *     the owner's stage a long transcript keeps the main thread at 25-45fps for
 *     the whole gesture, and a fold driven there inherits that rate. A
 *     transform-only WAAPI animation is composited, so the cards keep moving at
 *     the display's rate while the main thread is busy — which is exactly what
 *     makes it read like the single CSS-transition card the owner compared it to
 *     (`dsh-pinned-summary`).
 *   - an interruption is still exact. `play()` reads the running animation's
 *     `currentTime` back into `t`, cancels, and starts a new animation FROM that
 *     state toward the target. Continuous by construction, and the end states are
 *     the same two the old clock had: open = no transform at all, closed = every
 *     card parked on its start offset until the deck is retired.
 *
 * WHY SAMPLED KEYFRAMES AND NOT ONE SEGMENT WITH A `cubic-bezier`: one transform
 * carries TWO curves (the translation rides the position curve, the scale the
 * zoom curve) and a keyframe segment can carry only one easing. Sampling the
 * composed map uniformly in each card's PROGRESS reproduces both to well under a
 * pixel (`verify-deck-cascade-unit.mjs` measures it against the continuous
 * formula), and linear interpolation between samples is what the compositor does
 * with them.
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
 * The memoised answer, plus the watch that keeps it honest.
 *
 * The value is a THEME constant (the shell's own slow transition, declared once in
 * `ui-theme/base.css`), but reading it costs a `getComputedStyle` on the document root — a
 * forced style recalc whenever the document is dirty, which it is by design while the rail
 * animates. A 250ms TTL used to bound how long a theme change could be missed, and that TTL
 * is what made the read RECUR: the shell's own slow transition is 300ms, so the render that
 * opened the frame after the TTL expired paid a fresh whole-document style recalc — for a
 * constant. Measured 2026-10-03 (V8 CPU profile, 3 real drawer toggles): `getPropertyValue`
 * under this function accounted for 96.8ms of self time, the second largest own-plugin item
 * of the gesture.
 *
 * So the answer is memoised for the session and invalidated on the only event that can
 * change it — an attribute flip on `<html>`, which is where every theme switch lands
 * (`class`, `data-theme`, or an inline custom property). A theme change is therefore picked
 * up on the next render, which is strictly sooner than the old TTL promised, and the
 * animation path never touches `getComputedStyle` again.
 *
 * ── AND WHY A `style` FLIP ONLY COUNTS WHEN IT MENTIONS THE TOKEN ──
 *
 * Watching `style` naively made the memo self-defeating: the rail publishes its own anchors
 * as inline custom properties on the SAME element (`--dsx-rail-top`, `--dsx-rail-w`,
 * `--dsx-rail-pad`, `--dsx-input-bottom`, `--dsx-rightbar-w`, `--dsx-rail-scroll` — see
 * `rail/geometry.ts` and `rail/measure.ts`), so every anchor write during a gesture looked
 * like a theme switch and dropped the memo. Measured 2026-10-03 (forced-layout stacks in the
 * sidebar trace, 3 real drawer toggles): `refreshGroupDurationMs` was re-entered 7 times,
 * and the `getPropertyValue` it performs showed up as 41.2ms of native self time in the
 * paired V8 CPU profile — the plugin's second largest own cost of the gesture, spent
 * re-reading a constant because we had invalidated ourselves.
 *
 * A style flip therefore only invalidates when the attribute's old or new text actually
 * mentions {@link GROUP_MS_TOKEN}: our own `--dsx-*` writes never do, while a theme that
 * overrides (or stops overriding) the token inline always does. `attributeOldValue` is what
 * makes the removal case visible — the token disappears from the new text but is still in
 * the old one.
 */
let groupMsCache = -1
/** Whether the invalidation watch has been installed (see {@link groupMsCache}). */
let groupMsWatch = false
/**
 * The watch itself. Kept in a module binding rather than dropped on the floor: it
 * lives for the page (a theme can flip at any time), but a handle is what lets a
 * future unload path release it, and it documents that this is a singleton rather
 * than a per-call observer.
 */
let groupMsObserver: MutationObserver | null = null
/** The custom property the memo is about — the shell's own slow-transition token. */
const GROUP_MS_TOKEN = '--ds-transition-duration-slow'

/**
 * Re-read the theme token and replace the memo.
 *
 * Exported so a caller that knows the document just went quiet can force the refresh
 * without waiting for an attribute flip.
 */
export function refreshGroupDurationMs(fallback: number = CASCADE_FALLBACK_TOTAL_MS): number {
  if (typeof document === 'undefined') return fallback
  // `getComputedStyle` on a custom property returns its raw token, so both spellings
  // a stylesheet may use are accepted; anything unreadable falls back to the value
  // the group's transitions were written against.
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ds-transition-duration-slow').trim()
  const n = raw.endsWith('ms') ? Number.parseFloat(raw)
    : raw.endsWith('s') ? Number.parseFloat(raw) * 1000
      : Number.NaN
  groupMsCache = Number.isFinite(n) && n > 0 ? n : fallback
  return groupMsCache
}

/** The shell's own slow transition, in ms. */
export function groupDurationMs(fallback: number = CASCADE_FALLBACK_TOTAL_MS): number {
  if (typeof document === 'undefined') return fallback
  if (!groupMsWatch) {
    // Installed lazily on the first read: the observer has to exist before a theme can
    // flip, and the only production caller is the rail's render. `attributeFilter` keeps
    // the watch off unrelated `<html>` churn (the shell toggles a dozen classes there),
    // and the `style` case is further narrowed to flips that mention the token itself —
    // see the module note on `GROUP_MS_TOKEN`: our own anchor writes land on the same
    // element and must not invalidate a constant.
    groupMsWatch = true
    if (typeof MutationObserver !== 'undefined') {
      groupMsObserver = new MutationObserver((records) => {
        for (const record of records) {
          if (record.attributeName !== 'style') { groupMsCache = -1; return }
          const next = document.documentElement.getAttribute('style') ?? ''
          if (next.includes(GROUP_MS_TOKEN) || (record.oldValue ?? '').includes(GROUP_MS_TOKEN)) {
            groupMsCache = -1
            return
          }
        }
      })
      groupMsObserver.observe(document.documentElement, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['class', 'style', 'data-theme'],
      })
    }
  }
  if (groupMsCache > 0) return groupMsCache
  return refreshGroupDurationMs(fallback)
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
  /**
   * The box's own height — read ONLY by the visible-band filter (see
   * {@link CascadeBand}). Optional: a caller that hands the rank rule
   * ({@link cascadeRanks}) a bare top/right pair does not need it, and with it
   * omitted the band test degrades to "the box's TOP edge is inside the band",
   * which is the conservative half of the rule.
   */
  h?: number
}

/**
 * The band of the rail the fold is allowed to animate, in the deck's own
 * coordinates — the scrollport, exactly as `RailWave`'s whole-card rule reads it
 * (`[scrollTop − inset, … + clientHeight]`, and `cutBy` against each resting box).
 *
 * ── WHY THE FOLD IS BOUNDED BY IT (owner, 2026-10-18) ──
 *
 * The fold used to move EVERY card of the deck, including the rows the rail's
 * viewport does not show. Measured on the owner's GUI (`scripts/.tmp-fold-band2.cjs`,
 * 1400×720, an open drawer whose co-tenant push lands during the fold): the deck's
 * rows below the band are `dsx-slot-cut` and unpainted, yet the fold still wrote a
 * transform on them every frame — 16 movers where 9 rows are on screen. Worse, the
 * co-tenant's push (`dsh-pinned-summary`'s tweened `padding-top`) arrives one beat
 * AFTER the fold starts, so rows that were still inside the band on the fold's first
 * frame were animated into view and only THEN cut and hidden: the reported
 * 「动画结束后临时隐藏下方未显示的组件」, plus 7 wasted `transform` writes per frame.
 *
 * A card whose seat the band cuts cannot be seen at that seat, so animating it can
 * only ever produce that flash; leaving it out is both the honest motion and less
 * work per frame. The band is therefore read once per fold plan (the deck is at rest
 * by definition then — see {@link DeckCascade.sync}) and the cards it cuts are NOT
 * participants: no transform, no delay, and no audit stamp ({@link planCascade}).
 */
export interface CascadeBand {
  /** First deck coordinate the rail's scrollport shows (`scrollTop − inset`). */
  lo: number
  /** …and the last one (`lo + clientHeight`). */
  hi: number
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

/**
 * Which path one card travels in the fold — the shape's map, not its timing.
 *
 *  - `'drop'` — the group map PER CARD (see the module header): translation on the
 *    position curve, scale on the zoom curve, both about the shared anchor. This is
 *    what `openShape: 'stagger'` plays, and what it has always played.
 *  - `'slide'` — horizontal only: `translateX(travel · (1 − easeShift(p)))`, no
 *    scale, no origin, no vertical component. `openShape: 'slide'`.
 */
export type CascadePath = 'drop' | 'slide'

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

/**
 * What {@link planCascade} is handed: the GROUP's own transition, in ms, and the two
 * curves. The per-rank step and one card's travel are split out of that total INSIDE
 * the planner (`cascadeTiming`), because the split depends on how many cards are
 * actually in the fold — which is the band's decision, not the caller's (see
 * {@link CascadeBand}).
 */
export interface CascadePlanTiming {
  /** The group's whole transition (`groupDurationMs`), ms. */
  totalMs: number
  /** The POSITION curve (`prefs.animShiftCurve`) evaluated on [0,1]. */
  easeShift: (x: number) => number
  /** The ZOOM curve (`prefs.animCurve`) evaluated on [0,1]. */
  easeZoom: (x: number) => number
  /**
   * Which per-card path to plan. Omitted means `'drop'`, which keeps every existing
   * caller and test on the shape it was written against.
   */
  path?: CascadePath
}

/** One element's part in the fold. */
export interface CascadeCard {
  el: HTMLElement
  /** `O − Oc` (px): the card's top-right corner to the shared anchor. Unused by 'slide'. */
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
  /** The path these cards travel (see {@link CascadePath}); never omitted on a plan. */
  path: CascadePath
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
  /**
   * Drop the cards a predicate names from a RUNNING fold — the ones the whole-card
   * rule has just hidden (`dsx-slot-cut`). Their transform is cleared and they are
   * forgotten; every other card keeps its delay, its offsets and the same timeline,
   * so nothing moves when this happens. A pure removal is safe mid-fold where a
   * re-plan is not (see {@link DeckCascade.sync}): the remaining cards' geometry is
   * untouched.
   */
  prune: (drop: (el: HTMLElement) => boolean) => void
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
function clearStamp(el: HTMLElement): void {
  el.style.removeProperty('--dsx-slot-delay')
  el.style.removeProperty('--dsx-slot-delay-out')
}

/**
 * ── THE RANK TABLE, AND WHERE IT LIVES ──
 *
 * The order rule is {@link cascadeRanks} — one home, shared with the CSS stamps a
 * probe audits. Since 2026-10-18 the DELAYS are assigned HERE rather than read back
 * off the DOM: the participant set is the band's decision (see {@link CascadeBand}),
 * so only the planner knows how many cards the ladder is spread over, and the split
 * ("one card's travel + one step per remaining rank") must be made from that count —
 * {@link cascadeTiming}. The old shape — rail-view stamping a full-deck ladder on
 * every render, the planner reading it back per element — would have had to guess the
 * same band at render time, where the rail's scroll offset is not (and must not be)
 * an input. This function therefore PUBLISHES the ladder it uses: every participant
 * gets `--dsx-slot-delay` / `--dsx-slot-delay-out`, every card the band leaves out
 * gets both removed, so a probe reading the stamps is reading exactly the fold, and
 * presence of a stamp IS participation.
 */
export function planCascade(
  deck: HTMLElement,
  boxes: ReadonlyArray<CascadeBox>,
  anchor: CascadeAnchor,
  timing: CascadePlanTiming,
  band?: CascadeBand,
): CascadeSpec {
  const path: CascadePath = timing.path ?? 'drop'
  // 'slide' does not use the offsets below, so it must not pay for them: this read
  // is a forced layout, and the whole point of the path is that it needs no
  // geometry beyond the boxes it was already handed.
  const deckRect = path === 'drop' ? deck.getBoundingClientRect() : null
  const nodes = Array.from(deck.querySelectorAll<HTMLElement>(CASCADE_SELECTOR))
  // Pair node ↔ box by index first (the box list is in the same DOM order), then keep
  // the pairs the band does not cut — `h` omitted degrades to the top edge's test.
  const kept: Array<{ el: HTMLElement; box: CascadeBox }> = []
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i]
    const box = boxes[i] ?? { top: 0, right: 0 }
    if (band !== undefined && (box.top < band.lo - 0.5 || box.top + (box.h ?? 0) > band.hi + 0.5)) {
      clearStamp(el)
      continue
    }
    kept.push({ el, box })
  }
  const { order } = cascadeRanks(kept.map((k) => k.box))
  const { duration, step } = cascadeTiming(timing.totalMs, kept.length)
  const lastRank = Math.max(0, kept.length - 1)
  const cards: CascadeCard[] = kept.map(({ el, box }, i) => {
    // The parse is the round-trip through the stamp's own format, so the number the
    // clock runs on and the number a probe reads cannot differ in the last digit.
    const delay = Number.parseFloat(cascadeDelay(order[i], step))
    el.style.setProperty('--dsx-slot-delay', cascadeDelay(order[i], step))
    el.style.setProperty('--dsx-slot-delay-out', cascadeDelay(lastRank - order[i], step))
    // The card's own top-right corner in viewport coordinates: the boxes are
    // deck-relative, with `right` measured from the deck's right edge. 'slide'
    // leaves both at zero — it has no use for them, and computing them is what
    // forced the layout read above.
    return {
      el,
      vx: deckRect === null ? 0 : anchor.originX - (deckRect.left + (deckRect.width - box.right)),
      vy: deckRect === null ? 0 : anchor.originY - (deckRect.top + box.top),
      delay,
      ownStyle: el.classList.contains('dsx-stats-add'),
    }
  })
  return { cards, anchor, path, duration, easeShift: timing.easeShift, easeZoom: timing.easeZoom }
}

/**
 * What a keyframe needs from a plan: the path, the two curves, one card's travel,
 * both offsets.
 */
export interface CascadeCtx {
  duration: number
  anchor: CascadeAnchor
  easeShift: (x: number) => number
  easeZoom: (x: number) => number
  /** Omitted means `'drop'` (see {@link CascadePath}). */
  path?: CascadePath
}

/** The smallest thing the map needs from a card (see {@link foldTransformAt}). */
export interface FoldCard {
  readonly vx: number
  readonly vy: number
  readonly delay: number
}

/**
 * One card's transform at timeline time `t` — the fold's ENTIRE math, in one place.
 *
 * `p` is the card's own progress: its rank delay is part of `t`, its travel is
 * `duration`. On the `'drop'` path the map is the 'zoom' shape's own (see the module
 * header): the scale rides the zoom curve, the translation is the offset needed to
 * carry the card's top-right corner to the shared anchor at that scale, plus
 * whatever part of the travel the position curve has not given back yet.
 *
 * On `'slide'` there is one channel and no anchor: the card is exactly
 * `travel · (1 − easeShift(p))` to the right of its cell, so it enters and leaves
 * across the rail's right edge and never moves vertically. `vx`/`vy` are ignored —
 * which is why the planner does not compute them for this path.
 *
 * Exported because two consumers must agree bit for bit: the keyframe builder here
 * and the closed end's parked inline transform. Also because it makes the unit
 * test able to compare sampled keyframes against the continuous curve.
 */
export function foldTransformAt(card: FoldCard, ctx: CascadeCtx, t: number): string {
  const raw = ctx.duration > 0 ? (t - card.delay) / ctx.duration : (t >= card.delay ? 1 : 0)
  const p = raw <= 0 ? 0 : raw >= 1 ? 1 : raw
  if (ctx.path === 'slide') {
    const sx = ctx.anchor.travel * (1 - ctx.easeShift(p))
    return `translate(${sx.toFixed(2)}px, 0.00px)`
  }
  const s = ctx.anchor.scale + (1 - ctx.anchor.scale) * ctx.easeZoom(p)
  const k = 1 - s
  const x = k * card.vx + ctx.anchor.travel * (1 - ctx.easeShift(p))
  const y = k * card.vy
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`
}

/**
 * The keyframes for one card's part in the segment `from → to` (either direction).
 *
 * The samples are uniform in the card's own PROGRESS `p`, not in time. That is what
 * keeps the chord between two samples on the curve: both easing curves are steep at
 * their take-off, so a uniform TIME grid spends its samples exactly where `p` moves
 * fastest and leaves the visible take-off under-sampled (measured on the live map
 * check: 5ms time sampling read ~30px off at p≈0.25, because a 0.002 error in scale
 * inverts to a 0.02 error in p there). Uniform `p` puts the samples where the map's
 * curvature is, and the offsets are then the TIMES of those progress points.
 *
 * Only the active window gets samples; the holds before and after are the segment's
 * own endpoints. Duplicate offsets (a card already at rest for the whole segment)
 * collapse.
 */
export function foldKeyframes(card: FoldCard, ctx: CascadeCtx, from: number, to: number, perTravel = 48): Keyframe[] {
  const span = Math.abs(to - from)
  if (!(span > 0)) {
    const only = foldTransformAt(card, ctx, to)
    return [{ offset: 0, transform: only, easing: 'linear' }, { offset: 1, transform: only, easing: 'linear' }]
  }
  const progressAt = (time: number): number => {
    const raw = ctx.duration > 0 ? (time - card.delay) / ctx.duration : (time >= card.delay ? 1 : 0)
    return raw <= 0 ? 0 : raw >= 1 ? 1 : raw
  }
  const pFrom = progressAt(from)
  const pTo = progressAt(to)
  const hasTravel = Math.abs(pTo - pFrom) > 1e-6
  // 'slide' moves on ONE monotone channel, so its chord error is a third of the
  // two-channel map's for the same grid: 32 samples hold it under a quarter pixel
  // over a 454px travel (0.18px measured by `verify-deck-cascade-unit.mjs`, which
  // asserts the same bound for both paths) where 48 were needed for 0.13px before.
  // It stays at 32 rather than lower because the error scales with the travel, i.e.
  // with the rail's width on a wide window.
  const budget = ctx.path === 'slide' ? 32 : perTravel
  const steps = hasTravel ? Math.max(8, Math.min(64, Math.ceil(Math.abs(pTo - pFrom) * budget))) : 1
  const times: number[] = [from, to]
  if (hasTravel) {
    for (let i = 0; i <= steps; i++) times.push(card.delay + ctx.duration * (pFrom + (pTo - pFrom) * (i / steps)))
  }
  // Playback offset: 0 at `from`, 1 at `to`, whichever way the segment runs.
  const offsetOf = (time: number): number => (time - from) / (to - from)
  const seen = new Set<string>()
  const out: Keyframe[] = []
  for (const time of times) {
    const offset = Math.min(1, Math.max(0, offsetOf(time)))
    const key = offset.toFixed(6)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ offset, transform: foldTransformAt(card, ctx, time), easing: 'linear' })
  }
  out.sort((a, b) => (a.offset as number) - (b.offset as number))
  // The last sample IS the end state; pin it to 1 so a rounding step cannot leave
  // a sliver of the previous keyframe on screen after the segment finishes.
  out[out.length - 1].offset = 1
  return out
}

/** The minimum a driver needs from an animation — the DOM's `Animation` satisfies it. */
export interface CascadeAnimation {
  currentTime: number | null
  onfinish: ((this: Animation, ev: AnimationPlaybackEvent) => unknown) | null
  cancel: () => void
}

/** How the driver starts an animation. Injected so the engine is testable without a browser. */
export interface CascadeAnimator {
  animate: (el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => CascadeAnimation
}

/** The browser's own implementation — the only one production ever uses. */
export const browserAnimator: CascadeAnimator = {
  animate: (el, keyframes, options) => el.animate(keyframes, options) as unknown as CascadeAnimation,
}

/**
 * Build the deck's cascade driver.
 *
 * `onSettle` fires exactly once per fold that reaches an end — including the no-op
 * case where the timeline is already there — which is what lets the drawer unmount
 * on the real end of the leave instead of on a timer that the next phase change can
 * cancel.
 *
 * `animator` is injectable for `scripts/verify-deck-cascade-unit.mjs`; production
 * passes nothing and gets {@link browserAnimator}.
 */
export function createDeckCascade(onSettle: (end: CascadeEnd) => void, animator: CascadeAnimator = browserAnimator): DeckCascade {
  let spec: CascadeSpec = {
    cards: [],
    duration: Math.round(CASCADE_FALLBACK_TOTAL_MS * CASCADE_TRAVEL_SHARE),
    easeShift: (x) => x,
    easeZoom: (x) => x,
    anchor: { travel: 0, scale: 1, originX: 0, originY: 0 },
    path: 'drop',
  }
  let total = 0
  /** Where the timeline stands, in ms. Advanced by the animations, read back on an interruption. */
  let t = 0
  let dir: 0 | 1 | -1 = 0
  /** The segment being played: `t` moves from {@link segFrom} to {@link segTo} over {@link segMs}. */
  let segFrom = 0
  let segTo = 0
  let segMs = 0
  let segWallStart = 0
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let anims = new Map<HTMLElement, CascadeAnimation>()
  /**
   * Does the deck currently CARRY a fold state (at least one card parked on its
   * start offset)? The retracted end of a fold deliberately leaves those offsets in
   * place until the deck is retired, so "the timeline is at an end" is NOT the same
   * question as "the cards are at rest" — see {@link DeckCascade.sync}.
   */
  let painted = false

  const length = (): number => {
    let maxDelay = 0
    for (const c of spec.cards) if (c.delay > maxDelay) maxDelay = c.delay
    return maxDelay + Math.max(0, spec.duration)
  }

  const clearTimer = (): void => {
    if (timer !== null) { clearTimeout(timer); timer = null }
  }

  const stopAnims = (): void => {
    const running = [...anims.values()]
    anims = new Map()
    for (const a of running) {
      try { a.cancel() } catch { /* already gone with its element */ }
    }
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

  /** Park every card on its start offset, as a plain inline transform (the closed end). */
  const park = (): void => {
    painted = spec.cards.length > 0
    for (const c of spec.cards) {
      if (c.ownStyle) {
        if (spec.path === 'drop' && c.el.style.transformOrigin !== 'top right') c.el.style.transformOrigin = 'top right'
        if (c.el.style.transition !== 'none') c.el.style.transition = 'none'
      }
      c.el.style.transform = foldTransformAt(c, spec, 0)
    }
  }

  /**
   * The 设置 tile lends its transition (and, on the 'drop' path, its origin) to the
   * fold while the fold drives it. 'slide' is origin-agnostic, so it leaves the
   * tile's own centred origin alone.
   */
  const pin = (c: CascadeCard): void => {
    if (!c.ownStyle) return
    if (spec.path === 'drop' && c.el.style.transformOrigin !== 'top right') c.el.style.transformOrigin = 'top right'
    if (c.el.style.transition !== 'none') c.el.style.transition = 'none'
  }

  /**
   * The timeline's real position, read back off the running animations.
   *
   * A reversal must start from the state ON SCREEN, not from the state at the last
   * completed command: `currentTime` is the compositor-synced answer, and the map
   * from it back to `t` is the segment's own linear one.
   */
  const readT = (): number => {
    if (dir === 0) return t
    if (anims.size === 0) {
      // A segment with no participants (the whole band was cut): the timeline still
      // elapses. Wall time is the only clock that exists for it.
      if (segMs <= 0) return segTo
      const elapsed = typeof performance !== 'undefined' ? performance.now() - segWallStart : segMs
      return segFrom + (segTo - segFrom) * Math.min(1, Math.max(0, elapsed / segMs))
    }
    const first = anims.values().next()
    const a = first.done ? null : first.value
    const ct = a === null ? segMs : (typeof a.currentTime === 'number' ? a.currentTime : segMs)
    const p = segMs > 0 ? Math.min(1, Math.max(0, ct / segMs)) : 1
    return segFrom + (segTo - segFrom) * p
  }

  const settleAt = (end: CascadeEnd, target: number): void => {
    generation++
    clearTimer()
    // Write the end state BEFORE the animations are cancelled: on the closed end
    // the parked offsets are what must stay painted while the drawer is retired,
    // and cancelling first would flash the resting grid for one frame.
    if (end === 'open') clear()
    else park()
    stopAnims()
    t = target
    dir = 0
    onSettle(end)
  }

  return {
    get total() { return total },
    state: () => (dir > 0 ? 'to-open' : dir < 0 ? 'to-closed' : t >= total ? 'open' : 'closed'),
    sync: (next: CascadeSpec) => {
      // A plan may only replace the current one when the deck is genuinely AT REST
      // — no fold in flight, and no retracted stack still parked on screen.
      //
      // Both halves are load-bearing. Adopting a new grid under a running fold
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
      // A spec handed in without a path (they were written before this field
      // existed) keeps the original two-channel map.
      spec = next.path === undefined ? { ...next, path: 'drop' } : next
      total = length()
      if (t > total) t = total
    },
    play: (end: CascadeEnd) => {
      const forward = end === 'open'
      if (forward ? dir > 0 : dir < 0) return
      const target = forward ? total : 0
      // The interruption point: where the CURRENT animation has actually got to.
      t = readT()
      if (Math.abs(target - t) <= 0.01) { settleAt(end, target); return }
      stopAnims()
      generation++
      const g = generation
      dir = forward ? 1 : -1
      segFrom = t
      segTo = target
      segMs = Math.abs(target - t)
      segWallStart = typeof performance !== 'undefined' ? performance.now() : 0
      // A fold with nothing to animate (every participant was cut by the band) still
      // has a length: the drawer is retired on this report.
      if (spec.cards.length === 0) {
        timer = setTimeout(() => { if (g === generation) settleAt(end, target) }, Math.max(8, segMs) + 4)
        return
      }
      // Browsers without WAAPI, and an element that was replaced under the fold:
      // `animate()` is missing or throws. The drawer must still settle — jump.
      let started = 0
      for (const c of spec.cards) {
        try {
          pin(c)
          // The segment's first keyframe is the card's CURRENT state and the last is
          // the target's, so an interrupted fold continues from what is on screen.
          const frames = foldKeyframes(c, spec, t, target)
          const a = animator.animate(c.el, frames, { duration: Math.max(1, segMs), easing: 'linear', fill: 'both' })
          a.onfinish = () => { if (g === generation) settleAt(end, target) }
          anims.set(c.el, a)
          started++
        } catch {
          /* this card cannot animate; the others still do */
        }
      }
      if (started === 0) { settleAt(end, target); return }
      // Safety net for an animation that is cancelled without ever finishing (its
      // element was replaced under it): the drawer must still retire.
      timer = setTimeout(() => { if (g === generation) settleAt(end, target) }, segMs + 160)
    },
    jump: (end: CascadeEnd) => {
      generation++
      clearTimer()
      stopAnims()
      dir = 0
      t = end === 'open' ? total : 0
      clear()
    },
    prune: (drop) => {
      if (spec.cards.length === 0) return
      const kept = spec.cards.filter((c) => !drop(c.el))
      if (kept.length === spec.cards.length) return
      for (const c of spec.cards) {
        if (kept.indexOf(c) !== -1) continue
        // Hand the dropped card back to its own layout: it is `dsx-slot-cut` and
        // unpainted, so clearing its offset cannot be seen, while leaving it would
        // keep a transform on a hidden node (and a stale `painted` verdict if the
        // whole fold is dropped).
        const a = anims.get(c.el)
        if (a !== undefined) {
          anims.delete(c.el)
          try { a.cancel() } catch { /* already gone */ }
        }
        if (c.el.style.transform !== '') c.el.style.transform = ''
        if (c.ownStyle) {
          if (c.el.style.transformOrigin !== '') c.el.style.transformOrigin = ''
          if (c.el.style.transition !== '') c.el.style.transition = ''
        }
        clearStamp(c.el)
      }
      spec = { ...spec, cards: kept }
      // The timeline is max delay + one travel, and only ever shrinks by a drop: the
      // fold's end is unchanged for the cards that are left, and a fully-dropped fold
      // still settles on its own timer (see `play`).
      if (t > total) t = total
    },
    release: () => {
      generation++
      clearTimer()
      stopAnims()
      dir = 0
      t = 0
      clear()
    },
  }
}
