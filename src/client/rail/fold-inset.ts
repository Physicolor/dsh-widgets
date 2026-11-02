/**
 * dsh-widgets — the transcript's inset while the component area folds.
 *
 * WHAT THIS OWNS: the ONE layout property an open/close moves — the reading
 * column's `padding-right` on `[data-conversation-scroll]`. Two declarations land
 * on it: this plugin's claim (`body.dsx-stats-active … padding-right:
 * var(--dsx-rail-w)`, rail.module.css) and, while `dsh-pinned-summary` has its
 * card docked in the same strip, that plugin's own inset. The shell's shared curve
 * (`[data-conversation-scroll] { transition: padding-right … }`, card.module.css)
 * turns either change into a 0.3s TWEEN, i.e. the whole conversation re-wraps ~18
 * times per fold.
 *
 * WHY THAT TWEEN IS THE WRONG SHAPE OF COST: a re-wrap is a full layout of the
 * transcript, and the fold makes every co-tenant that measures the page read that
 * layout again inside its own callback (`dsh-pinned-summary` reads the rail's box
 * from its layout loop, this plugin's own shell reads — measured 2026-10-27: 22
 * forced reads per close, 110ms in `getBoundingClientRect` alone). One
 * invalidation per frame therefore costs N forced layouts per frame, and the main
 * thread never gets to commit the card animation. Measured on the owner's stage
 * (1707×1067 @DSF1.5, 2807-node transcript, 26 cards): p95 frame interval in the
 * fold window **56ms close / 36ms open** with the tween, **20ms / 20ms** without.
 *
 * BUT DROPPING THE TWEEN ALONE WAS NOT THE FIX (owner report 2026-10-28): the
 * conversation's move itself is what people watch, and landing the inset in one
 * step deleted it — the text teleported while the rail slid in. So the motion is
 * rebuilt on the COMPOSITOR: the inset still lands in ONE step (one layout for the
 * whole gesture), and the transcript PANE is translated from the position the old
 * value had to the one the new value has, with the same duration and curve the
 * shell would have tweened. A `transform` animation is handed to the compositor
 * after one style recalc, so every frame of the move is free; the visual path is
 * the one the tween drew (the pane is centred in the content box, so a padding
 * change of +X moved it by −X/2; the pan starts at +X/2 relative to the new
 * layout, i.e. exactly where the old value had it).
 *
 * WHY THE PANE AND NOT THE SCROLL BODY: this plugin portals its drawer into the
 * composer's overlay anchor, which lives INSIDE `[data-conversation-scroll]`. A
 * transform on an ancestor of a `position: fixed` element makes that ancestor the
 * fixed element's containing block, so panning the scroller would drag the rail
 * out of its viewport anchoring. The transcript pane and the composer card — the
 * reading column's two occupants — therefore carry the move themselves: the pane as
 * `translateX`, the composer as a relative `left` (see `COMPOSER_CARD`; a relative
 * offset is paint-time and does not re-anchor the drawer that lives in that very
 * card), and every fixed layer stays where it is.
 *
 * The suppressor (`html.dsx-fold-inset` → `transition: none !important`) is armed
 * BEFORE the class that changes the value, so the very first recalc after the flip
 * has no transition to start. While it is on, a watcher reads the computed inset
 * once per frame and pans every CHANGE — the fold's own value, or a co-tenant's
 * write landing mid-fold (the pinned card publishes ~46ms into the gesture) — so
 * the transform offset always matches the layout that just landed, whichever
 * declaration won. It is released when the deck reports its end, so a right-panel
 * open/close and a width drag keep the shell's curve.
 *
 * SCOPE: stagger shape only (the shape that reports its own end). The `zoom`
 * shape moves the rail's box and never reports a fold, and reduced-motion jumps
 * the drawer — both keep the shell's curve, exactly as before, because this module
 * is only armed when a fold will really run.
 */

/** Kills the transcript's inset transition for the fold's duration. */
const INSTANT_CLASS = 'dsx-fold-inset'
/** The reading column's own scroll body — the element the inset lands on. */
const SCROLL_BODY = '[data-conversation-scroll]'
/**
 * The transcript itself: the pane the scroll body centres inside its content box.
 * The `data-slot` prefix keeps this off any look-alike inside the composer / rail
 * portals; the class suffix is the shell's own `viewArea` (the same suffix match
 * every layout probe in this repo uses).
 */
const PANE = '[data-slot="conversation.session"] [class$="_viewArea"]'
/**
 * The composer's own card — the input box, ALSO centred in that content box, so it
 * has to ride the same move (owner: 「输入框也是对话区域的一部分」, 2026-10-28).
 *
 * It cannot be transformed: this very card is the ancestor of the rail's
 * `position: fixed` drawer (`[data-composer-overlay]` inside it), and a transform
 * here would re-anchor the whole rail. It is `position: relative`, so a relative
 * `left` offset moves it WITHOUT any of that: a relative offset is applied during
 * paint (no re-flow of the transcript) and does not create a containing block for
 * fixed descendants. The same half-delta therefore rides here as `left`, while the
 * transcript rides as `translateX`.
 */
const COMPOSER_CARD = '[data-composer-seat] [data-composer-card]'

/** Fallbacks when the shell's curve cannot be read (should not happen). */
const FALLBACK_DURATION = 300
const FALLBACK_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

/**
 * Backstop for a fold that never reports its end (a deck that could not be
 * measured, an interrupted cascade, a rail torn down mid-fold). Releasing late is
 * harmless — the pan finishes on its own — never releasing is not.
 */
const FOLD_MAX_MS = 2000

interface Timing {
  duration: number
  easing: string
}

let armed = false
let timer = 0
let watchRaf = 0
let observer: ResizeObserver | null = null
let lastPad = Number.NaN
let timing: Timing | null = null
let pans: Animation[] = []

function html(): HTMLElement {
  return document.documentElement
}

function scrollBody(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SCROLL_BODY)
}

/** `0.3s` / `300ms` / a comma list — the first entry, in ms. */
function firstDuration(raw: string): number {
  const first = (raw || '').split(',')[0].trim()
  const n = parseFloat(first)
  if (!Number.isFinite(n) || n <= 0) return 0
  return /ms$/i.test(first) ? n : n * 1000
}

/**
 * The first easing function of a computed `transition-timing-function`. A plain
 * `split(',')` is wrong here: `cubic-bezier(0.4, 0, 0.2, 1)` carries commas of
 * its own, and handing `cubic-bezier(0.4` to `animate()` throws (measured
 * 2026-10-28: the exception killed the first pan and the watcher with it).
 */
function firstEasing(raw: string): string {
  const text = (raw || '').trim()
  let depth = 0
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '(') depth += 1
    else if (ch === ')') {
      depth -= 1
      if (depth === 0) return text.slice(0, i + 1).trim()
    } else if (ch === ',' && depth === 0) return text.slice(0, i).trim()
  }
  return text
}

/**
 * The curve the shell WOULD tween this declaration with. Must be read before the
 * suppressor is armed: while it is on, `transition` computes to `none` (0s).
 */
function readTiming(el: HTMLElement): Timing {
  const cs = getComputedStyle(el)
  const duration = firstDuration(cs.transitionDuration)
  const easing = firstEasing(cs.transitionTimingFunction) || FALLBACK_EASING
  return { duration: duration > 0 ? duration : FALLBACK_DURATION, easing }
}

/** One additive transition, tracked for release. `null` when the browser refuses. */
function additive(el: HTMLElement, frames: Keyframe[], curve: Timing): Animation | null {
  try {
    const anim = el.animate(frames, { duration: curve.duration, easing: curve.easing, composite: 'add', fill: 'none' })
    pans.push(anim)
    anim.addEventListener('finish', () => { pans = pans.filter((a) => a !== anim) }, { once: true })
    return anim
  } catch {
    // An easing this browser will not take must never stop the watcher: the inset
    // has already landed, so the fold is correct without the pan.
    return null
  }
}

/**
 * Move the reading column — transcript AND composer — from where `delta`'s OLD
 * inset had it to where the layout now has it.
 *
 * `composite: 'add'` keeps concurrent pans independent: two writes in the same fold
 * (or a reversal mid-flight) each add their own decaying offset instead of replacing
 * one another, and `fill: 'none'` leaves nothing behind. The composer is a relative
 * `left` offset rather than a transform (see `COMPOSER_CARD`); the transcript is a
 * compositor `translateX`.
 */
function panBy(delta: number, curve: Timing): void {
  if (!(Math.abs(delta) > 0.5)) return
  const from = delta / 2
  const pane = document.querySelector<HTMLElement>(PANE)
  if (pane !== null) {
    additive(pane, [{ transform: `translateX(${from}px)` }, { transform: 'translateX(0px)' }], curve)
  }
  const card = document.querySelector<HTMLElement>(COMPOSER_CARD)
  // Only an already-resolved length can be composed additively; the shipped shell
  // sets `left: 0px` on this card, and an `auto` base simply means no composer pan.
  if (card !== null && getComputedStyle(card).left !== 'auto') {
    additive(card, [{ left: `${from}px` }, { left: '0px' }], curve)
  }
}

/**
 * Read the inset and pan any change since the last one we applied.
 *
 * Callers: the synchronous call right after the class flip (the fold's own change),
 * a `ResizeObserver` on the pane (a co-tenant's write — the pinned card publishes
 * mid-fold — lands after layout but BEFORE paint, so the pan is armed in the same
 * frame), and a rAF backstop. All three share `lastPad`, so a change is panned
 * exactly once no matter how many of them see it.
 */
export function syncFoldInset(): void {
  if (!armed) return
  const body = scrollBody()
  if (body === null) return
  const pad = parseFloat(getComputedStyle(body).paddingRight)
  if (!Number.isFinite(pad) || pad === lastPad) return
  if (Number.isFinite(lastPad)) panBy(pad - lastPad, timing ?? { duration: FALLBACK_DURATION, easing: FALLBACK_EASING })
  lastPad = pad
}

/**
 * The pane's own box is the content box of the scroll body, so a change of the
 * inset is a change of its WIDTH. Observing it is what makes the pan land in the
 * SAME frame the layout does; reading the computed inset one rAF later left a frame
 * painted with the new layout and no offset — a one-frame flash back and forth at
 * the start of every fold (measured 2026-10-28).
 */
function startObserver(): void {
  if (observer !== null || typeof ResizeObserver !== 'function') return
  const pane = document.querySelector<HTMLElement>(PANE)
  if (pane === null) return
  observer = new ResizeObserver(() => { syncFoldInset() })
  observer.observe(pane)
}

/** Backstop for a change that does not resize the pane (it always should). */
function startWatch(): void {
  if (watchRaf !== 0) return
  const tick = (): void => {
    watchRaf = 0
    if (!armed) return
    syncFoldInset()
    watchRaf = window.requestAnimationFrame(tick)
  }
  watchRaf = window.requestAnimationFrame(tick)
}

/**
 * Arm the fold's inset treatment. Call BEFORE the class/state that changes the
 * inset, so the first recalc already carries the suppressor — a transition that
 * has already started cannot be pinned back (it outranks inline declarations).
 */
export function armFoldInset(): void {
  const body = scrollBody()
  // A reversal mid-flight: keep the panes already running (they keep their own
  // offsets) and take the CURRENT computed value as the new baseline, so the
  // reversal continues from where the eye already is instead of restarting.
  if (!html().classList.contains(INSTANT_CLASS) && body !== null) timing = readTiming(body)
  armed = true
  html().classList.add(INSTANT_CLASS)
  lastPad = body === null ? Number.NaN : parseFloat(getComputedStyle(body).paddingRight)
  if (timer !== 0) window.clearTimeout(timer)
  timer = window.setTimeout(() => { timer = 0; if (armed) settleFoldInset() }, FOLD_MAX_MS)
  startObserver()
  startWatch()
}

/**
 * The fold reported its end (or was jumped): the inset is already at its final
 * value (the suppressor made it land at the flip), so the shell's curve can come
 * back. A later writer's change then tweens as it always did — the pinned card
 * glides its own writes, and a right-panel open/close is untouched.
 */
export function settleFoldInset(): void {
  if (!armed) return
  armed = false
  if (timer !== 0) { window.clearTimeout(timer); timer = 0 }
  if (watchRaf !== 0) { window.cancelAnimationFrame(watchRaf); watchRaf = 0 }
  if (observer !== null) { observer.disconnect(); observer = null }
  lastPad = Number.NaN
  html().classList.remove(INSTANT_CLASS)
}

/** Release everything this module wrote, at once. Safe at any time. */
export function releaseFoldInset(): void {
  armed = false
  if (timer !== 0) { window.clearTimeout(timer); timer = 0 }
  if (watchRaf !== 0) { window.cancelAnimationFrame(watchRaf); watchRaf = 0 }
  if (observer !== null) { observer.disconnect(); observer = null }
  for (const anim of pans) {
    try { anim.cancel() } catch { /* already gone */ }
  }
  pans = []
  lastPad = Number.NaN
  timing = null
  html().classList.remove(INSTANT_CLASS)
}
