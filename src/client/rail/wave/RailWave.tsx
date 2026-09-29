/**
 * dsh-widgets — the rail magnification wave.
 *
 * Moved out of `client/index.ts` (Phase 2.4) unchanged. The component owns its
 * own interaction geometry (railElement / hitLayout / onCard / moveRailFocus /
 * leaveRail / nearSurface are all defined below), so the only things it takes
 * from its callers are the 25 props in `RailWaveProps`.
 *
 * Motion model: ONE spring drives every slot — `displayed = 1 + (target - 1) * p`
 * where `target` is the pointer-live scale array and `p` the spring progress. Both
 * are continuous, so entering, following and leaving are one uninterrupted curve.
 */

import * as React from 'react'
import { WAVE_SPRING, springSettleMs, springValue } from '../../lib/morph-spring'
import type { WidgetRenderOut, WidgetSize } from '../../lib/contract/types'
import { ANCHOR_FOLLOW, RAIL_ROW_SEAT, type WavePlace } from '../geometry'
import { t } from '../../i18n'

/* ── Enter-stall post-mortem (2026-09-20) ──
 *
 * The reported "the grow stutters on the way in, the shrink is smooth on the way
 * back" was attributed with the Long Animation Frame API
 * (scripts/diag-hover-loaf.cjs) to a paint-only frame — 51ms with ~0ms script and
 * ~1ms style/layout — and the isolation probe (scripts/diag-hover-isolate.cjs)
 * then pinned it on promoting the overlay's 15 slots into compositing layers on
 * the hover frame itself: the very same enter with the slots ALREADY promoted
 * stayed under 16ms with zero dropped frames (P4 = 63ms vs P5 = 16ms, real GPU;
 * headless/SwiftShader exaggerates every one of these numbers).
 *
 * The fix is therefore the PERMANENT `will-change: transform` on those slots
 * (see `slotStyle`) — not a raster prewarm and not the overlay's own
 * `will-change: opacity`: keeping the overlay painted at a low opacity instead
 * (0.001, which quantizes to 0 in 8-bit alpha, then 0.01) measured no better on
 * the GPU, and the prewarm flip almost never coincided with a real hover.
 *
 * Residual, accepted: the FIRST hover after the rail opens still pays ~65ms
 * (round 1 of scripts/diag-hover-enter.cjs, reproducible) because nothing has
 * ever been painted into those layers yet; both low-opacity veils and the old
 * prewarm flip failed to move it (veil made the first enter's p95 WORSE, 43ms vs
 * 14ms), so it is left as the one-off cost of opening the rail. Later hovers then
 * land in a 13–26ms p95 band (rounds 2–4), with an occasional ~50ms frame while a
 * card that was never magnified before is rasterized for the first time. ── */

/**
 * Right inset shared by the rail and its magnify overlay (must stay identical).
 *
 * The anchor form carries a FALLBACK on purpose: while the drawer wrapper plays
 * its enter/leave slide it has a `transform`, which makes that wrapper the
 * containing block of the fixed rail —and an anchor outside the containing
 * block chain is not acceptable, so `anchor()` silently falls back (measured:
 * without a fallback the property turns into `auto` and the rail paints at the
 * wrapper's LEFT edge for the whole 0.3s slide, i.e. "components flash over the
 * left sidebar on every refresh"). With the fallback the rail glides in from
 * the right edge like the rest of the drawer, then snaps onto the anchor once
 * the transform is gone.
 */
/** Every rail-owned fixed layer reads this one variable (default set in the CSS). */
const RAIL_RIGHT_VAR = 'var(--dsx-rail-right)'

/* ── The wave's morph is a SPRING, computed per frame (see RailWave) ──
 *
 * It used to be a CSS transition on the overlay slots, in two phases: a 200ms
 * `settle` tween, then an untweened `follow`. That structure could not survive a
 * MOVING target, and the two failures below are why it is gone:
 *
 *  1. Writing a new focus on every pointer frame RETARGETS a CSS transition, so it
 *     restarts from the current value each time and never gets past the slow start
 *     of the ease curve. Measured frame by frame (scripts/diag-morph-frames.cjs,
 *     real GPU): walking the pointer onto a card gave 0.02–1.1 scale/s while a
 *     single jump gave 3.5 — the enter animated at whatever speed the mouse was
 *     moved at.
 *  2. Freezing the target instead (so the tween could finish) fixed the curve but
 *     left the geometry stale while the pointer kept moving, so the moment the
 *     freeze ended the card SNAPPED to the live position — the reported "wrong
 *     position as soon as I move over the widgets".
 *
 * So the progress is now an explicit factor written every frame:
 *
 *     displayed[i] = 1 + (target[i] − 1) · p
 *
 * `target` is the live pointer geometry (always current, never a reason to restart
 * anything) and `p` is `WAVE_SPRING`'s value between rest (`0`) and engaged (`1`).
 * Both are continuous, so their product is, and enter/follow/leave become one
 * uninterrupted motion on one curve in both directions.
 */
/**
 * The card SIZE/COLUMN spring, as a CSS transition value.
 *
 * Size moves in CARD_SIZE_STEP tiers and the column count in discrete steps, so
 * each hop is animated as one small rebound. The SAME curve is applied to the
 * rail's own width and to the transcript's inset while a width handle is held:
 * a tier/column change must move the container, the cards and the conversation
 * inset on ONE curve, or the cards glide inside a box that has already jumped
 * (the official layout README lists that co-motion as an island-level invariant,
 * and its absence is what read as "the component area changes abruptly, with no
 * smooth animation").
 */
const SLOT_SPRING = '0.26s cubic-bezier(0.34, 1.36, 0.52, 1)'

/**
 * Row-detent wheel scrolling (see RailWave's wheel effect): how many pixels of
 * accumulated wheel delta step one ROW, how long a pause ends a gesture, and the
 * tolerance used when asking whether the pointer is still on the surface.
 */
/**
 * Row-detent wheel scrolling (see RailWave's wheel effect): how many pixels of a
 * PIXEL-mode wheel delta step one ROW, how long a pause ends a gesture, and the
 * tolerance used when asking whether the pointer is still on the surface. LINE and
 * PAGE mode events are discrete and are each worth exactly one step (see the
 * normalisation in the handler).
 */
const WHEEL_STEP_PX = 90
const WHEEL_GESTURE_GAP_MS = 280

/**
 * How long the pointer may sit off a tile before the wave is released. One frame of
 * grace: enough to cross the gap between two magnified tiles (they float ~12px apart)
 * without the wave blinking, short enough that a genuine leave reads as instant.
 */
const POINTER_LEAVE_MS = 60

/**
 * Duration of one wheel detent (a full row), and the rail content's top inset —
 * the one number the deck, the magnify overlay, the scroll tail and the detents
 * must all agree on (see the rowTops / tailH notes in RailWave).
 */
const RAIL_SCROLL_MS = 240
const RAIL_TOP_INSET = 4

/** Honour the OS "reduce motion" preference for the scroll animation too. */
const REDUCE_MOTION = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The magnifying rail surface. The magnification wave is the ONLY part of the
 * rail that changes on a hover frame, so it lives in its own component: a
 * pointer move re-renders THIS component alone, and the static deck arrives as
 * an already-built `deck` element whose identity the parent keeps stable —React
 * bails out of that whole subtree instead of reconciling every card body, every
 * bridge-derived widget output and the always-mounted add panel 60 times a
 * second (measured 2026-09-13: 12.5ms p50 / 41.8ms p95 hover frames with the wave
 * inside the parent, vs 4.2ms idle).
 *
 * The enlarged copies are sized through `transform: scale()` with a top-right
 * origin rather than width/height: `placeCards` gives the focused box as
 * {top, right, w, h} with the box anchored to its right edge, which is exactly
 * what scaling the resting-size card around its top-right corner produces. Only
 * the compositor is involved per frame —no per-frame layout or repaint of seven
 * dense card subtrees.
 */
interface RailWaveProps {
  /** Prebuilt resting deck (identity-stable between pointer frames). */
  deck: React.ReactNode
  /**
   * Card bodies for the OVERLAY, built by the parent at the resting unit with the
   * real interaction handlers (action / cycle / resize). Same length and order as
   * `items`; identity is stable across hover frames (the parent does not re-render
   * on pointer moves), which is what keeps a follow frame down to slot styles.
   */
  cardBodies: ReadonlyArray<React.ReactNode>
  /** The rail element, used as the coordinate reference for overlay pointer events. */
  railElRef: { current: HTMLDivElement | null }
  /** Toggle the add panel (the overlay mirrors the deck's add button). */
  onAddClick: () => void
  items: ReadonlyArray<{ key: string; size: WidgetSize; baseW: number; out: WidgetRenderOut; w: { id: string } }>
  side: number
  pad: number
  railW: number
  stackHeight: number
  /**
   * Number of card rows the deck seats (see `rows` in the parent). The scroll
   * geometry needs it —the detents ARE the rows.
   */
  rows: number
  /**
   * Scroll geometry, owned by the PARENT because it decides the deck's rendered
   * height (the parent builds the deck element) and the overlay must mirror it
   * exactly so the two decks stay pixel-identical at rest:
   *
   *   deckH = max(rows · pitch, stackHeight) + paneH
   *
   * where `paneH` is the rail's measured clientHeight — the reservation that
   * makes the LAST row reachable (see the parent's note).
   */
  deckH: number
  /**
   * The rail's measured viewport height (clientHeight). RailWave needs it to size the
   * scroll TAIL: the tail turns `deckH` into the rail's scrollable content, and the
   * content must exceed the deck by exactly one detent-range — enough for the last row
   * to top out, and not a pixel more (see the tail element's note).
   */
  paneH: number
  /**
   * Highest row that may top out (see the parent's scroll-geometry note): the last row
   * whose CARDS still reach into the viewport. The wheel stops there instead of
   * scrolling the deck past its own content into blank space.
   */
  lastRow: number
  addRadius: number
  /** true = the peak follows the pointer every frame; false = quantized wave. */
  active: boolean
  placeCards: (sc: number[]) => WavePlace[]
  scaleFor: (x: number, y: number) => number[]
  nearest: (v: number, pts: number[]) => number
  stepScale: (d: number) => number
  xPts: number[]
  yPts: number[]
  addSlotFor: (layout: WavePlace[]) => { top: number; right: number }
  /**
   * Resting deck layout (content coordinates), the same array the static deck
   * renders from. The wave hit-tests the pointer against THIS when no overlay is
   * painted, and against its own live `placeCards` layout once one is —testing
   * the resting geometry while the magnified deck is the painted and interactive
   * surface is what let the wave stay armed after the pointer had left a
   * magnified card sideways (see `onCard` in RailWave).
   */
  restLayout: ReadonlyArray<WavePlace>
  /** Resting add-button slot (content coordinates). */
  restAdd: { top: number; right: number }
  /** The rail is mounted on a live session (state is dropped when it is not). */
  live: boolean
  /** Rightward shift (px) so a narrower panel still covers the rail completely. */
  shiftX: number
  /**
   * Resolved column count of the static deck. The wave only uses it to restart
   * the "pop" spring when the deck changes shape (2 ⇄3 ⇄4 columns) while the
   * user drags the conversation width.
   */
  columns: number
}

export function RailWave(props: RailWaveProps): React.ReactElement {
  const { deck, cardBodies, railElRef, onAddClick, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active, placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor, restLayout, restAdd, live, shiftX, columns } = props
  const n = items.length
  /**
   * The rail's scroll content = the deck + the TAIL (see the tail element's note).
   *
   * The tail is sized to `contentBottom + paneH − deckH`: it ends exactly one viewport
   * below the deepest CARD, which makes the scrollable range `contentBottom − clientH`.
   * At the bottom detent the viewport floor therefore sits just under the last row — no
   * blank area beyond it — while every row that a wheel notch can reach still tops out.
   * `contentBottom` is the deepest card bottom; the add tile sits inside the grid or in
   * the last row's free cell, so it never extends the range.
   */
  const scrollPitch = Math.max(1, side + pad)
  const contentBottom = restLayout.reduce((m, c) => Math.max(m, c.top + c.h), RAIL_ROW_SEAT)
  const scrollContentH = contentBottom + paneH
  const tailH = Math.max(0, scrollContentH - deckH)
  /**
   * Highest row that may top out, from the parent: the last row whose CARDS still
   * reach into the viewport. Beyond it the wheel has nothing left to reveal — the
   * reported "keep scrolling and it is just blank" — so both the handler and the row
   * guard stop there. Kept in a ref because the wheel effect reads it at event time.
   */
  const lastRowRef = React.useRef(lastRow)
  lastRowRef.current = lastRow
  // ---- Pointer focus. Realtime: the peak follows the pointer's 2D position
  //      every frame; discrete: it is snapped onto a quantized grid (row/column
  //      centres + midpoints) so the peak glides between cards and gaps.
  const [focusY, setFocusY] = React.useState<number | null>(null)
  const [focusX, setFocusX] = React.useState<number | null>(null)
  /**
   * The morph progress, `0` at rest and `1` fully engaged — the `p` of
   * `displayed = 1 + (target − 1) · p` (see the note above `SLOT_SPRING`).
   *
   * Written every frame while it is moving, by a spring whose TARGET is just
   * "engaged or not". The pointer only ever changes `target`, never the curve, so
   * moving the mouse mid-enter neither restarts nor interrupts anything.
   */
  const [morphP, setMorphP] = React.useState(0)
  const morphRef = React.useRef({ p: 0, from: 0, to: 0, t0: 0, raf: 0 })
  // Rail content scroll offset (px), synced to the fixed magnify overlay so it
  // tracks the scrolled deck instead of sitting at the rail's viewport top.
  const [railScrollTop, setRailScrollTop] = React.useState(0)
  // Realtime magnification arming: the wave engages only once the pointer has
  // actually hit a CARD (bare rail gaps must not trigger it), then stays engaged
  // while the pointer crosses the gaps between cards, and disarms only when it
  // leaves the rail.
  const armedRef = React.useRef(false)
  // Last pointer position in rail-content coordinates, kept so a rail scroll
  // (which moves cards but not the mouse) re-targets the peak correctly.
  const lastClientXYRef = React.useRef<{ x: number; y: number } | null>(null)
  const contentYRef = React.useRef<number | null>(null)
  const contentXRef = React.useRef<number | null>(null)
  const rafRef = React.useRef(0)
  /**
   * The rail element, resolved from the ref with a DOM fallback.
   *
   * The fallback is cheap and makes every wheel/hit-test path immune to a ref
   * that has not been written yet (first paint after the drawer mounts): the
   * surface element is the rail's parent and contains exactly one rail.
   */
  const railElement = (): HTMLDivElement | null => {
    const el = railElRef.current
    if (el !== null && el.isConnected) return el
    const surface = surfaceRef.current
    const found = surface === null ? null : surface.querySelector<HTMLDivElement>('.dsx-stats-rail')
    if (found !== null) railElRef.current = found
    return found
  }
  /**
   * Is the pointer on a card (or the add tile) right now? —the wave's
   * arm/disarm oracle, and the ONLY question that decides whether a pointer
   * position counts as "on the widgets".
   *
   * It must test the geometry the user actually SEES and TOUCHES: once the morph
   * is live that is the overlay deck (magnified, pushed around), while the resting
   * deck is `visibility: hidden`. Testing the resting rects reported a card up to
   * 60px away from the painted one —which, combined with the layer's inflated
   * padding box in `nearSurface`, is exactly why the leftmost card stayed
   * magnified after the pointer had gone back over the transcript.
   *
   * The conversion is arithmetic (content coordinates −client): `placeCards`
   * yields `{top, right}` in rail-content space, so the only live quantities are
   * the rail's own box and its scrollTop. Cards of a row are right-anchored, hence
   * `contentW –right –w —contentW –right`. Defined after the wave geometry
   * because it reads the LIVE layout (see `onCard` below).
   */
  const hitLayout = (layout: ReadonlyArray<{ top: number; right: number; w: number; h: number }>, add: { top: number; right: number } | null, clientX: number, clientY: number): boolean => {
    const rail = railElement()
    if (rail === null) return false
    const box = rail.getBoundingClientRect()
    const contentW = rail.clientWidth - 2 * pad
    const cx = clientX - box.left - pad
    const cy = clientY - box.top - RAIL_TOP_INSET + rail.scrollTop
    for (const c of layout) {
      if (cx >= contentW - c.right - c.w && cx <= contentW - c.right && cy >= c.top && cy <= c.top + c.h) return true
    }
    if (add !== null && cx >= contentW - add.right - side && cx <= contentW - add.right && cy >= add.top && cy <= add.top + side) return true
    return false
  }
  /**
   * How far outside its own box a tile still counts as hovered.
   *
   * Cards are separated by `pad` (24px at the default tier), so this covers the
   * inter-card gap WITHOUT swallowing the rail's blank areas: the reported failure was
   * "hovering in the gap / above the first row / right of the last card keeps the wave
   * alive", which is what a whole-rail hit zone produces. With this tolerance a card
   * owns its box plus 7px — and after magnification neighbours float ~12px apart, so
   * crossing a gap never blinks the wave off.
   */
  const TILE_TOLERANCE = 7
  /**
   * Tighter variant of `hitLayout`: tests `TILE_TOLERANCE` around the PAINTED tiles
   * instead of the bare boxes. This is the oracle for "is the pointer still on the
   * widgets" once the wave is armed.
   */
  const onCard = (clientX: number, clientY: number): boolean => {
    const rail = railElement()
    if (rail === null) return false
    // The overlay is the painted surface exactly while `morph`: at rest it is
    // fully transparent and the static deck is what the user sees and touches.
    const overlaid = morph
    const layout = overlaid ? focusLayout : restLayout
    const add = overlaid ? focusedAdd : restAdd
    const box = rail.getBoundingClientRect()
    const contentW = rail.clientWidth - 2 * pad
    const cx = clientX - box.left - pad
    const cy = clientY - box.top - RAIL_TOP_INSET + rail.scrollTop
    const t = TILE_TOLERANCE
    for (const c of layout) {
      const left = contentW - c.right - c.w
      const right = contentW - c.right
      if (cx >= left - t && cx <= right + t && cy >= c.top - t && cy <= c.top + c.h + t) return true
    }
    if (add !== null) {
      const left = contentW - add.right - side
      const right = contentW - add.right
      if (cx >= left - t && cx <= right + t && cy >= add.top - t && cy <= add.top + side + t) return true
    }
    return false
  }
  const moveRailFocus = (clientX: number, clientY: number, el: HTMLDivElement): void => {
    lastClientXYRef.current = { x: clientX, y: clientY }
    const rect = el.getBoundingClientRect()
    contentXRef.current = clientX - rect.left
    contentYRef.current = clientY - rect.top - 2 + el.scrollTop
    if (onCard(clientX, clientY)) armedRef.current = true
    if (!armedRef.current) return
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      // The pointer only writes the TARGET geometry. The engage/disengage curve is
      // `morphP`, which this frame cannot disturb — moving the mouse mid-enter
      // neither restarts nor interrupts it (see the note above `SLOT_SPRING`).
      setFocusX(contentXRef.current)
      setFocusY(contentYRef.current)
    })
  }
  // Re-target the peak when the rail scrolls without the pointer moving.
  const railScrollSync = (el: HTMLDivElement): void => {
    if (lastClientXYRef.current === null) return
    moveRailFocus(lastClientXYRef.current.x, lastClientXYRef.current.y, el)
  }
  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (morphRef.current.raf) cancelAnimationFrame(morphRef.current.raf)
  }, [])
  React.useEffect(() => {
    if (live) return
    setFocusY(null); setFocusX(null)
    armedRef.current = false
    const st = morphRef.current
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0 }
    st.p = 0; st.from = 0; st.to = 0
    setMorphP(0)
  }, [live])
  // ---- Wave geometry (pure, recomputed per frame). ----
  const engaged = focusX !== null && focusY !== null && armedRef.current
  // Focus is in rail-content coordinates: rawX is the rail-box X minus the left
  // padding (card cell centres are content-relative); rawY already is.
  const rawX = (focusX ?? 0) - pad
  const rawY = focusY ?? 0
  /**
   * The LIVE target: the scale every card would have if the wave were fully
   * engaged right now. Updated on every render while engaged, and deliberately
   * LEFT ALONE once the pointer is gone — the leave must animate away from the
   * geometry that was on screen, not from the rest layout (a frozen-at-1 target
   * would make `displayed = 1 + (1 − 1)·p` collapse to rest on the first frame).
   */
  const targetRef = React.useRef<number[]>(new Array(n).fill(1))
  if (engaged && n > 0) {
    targetRef.current = active ? scaleFor(rawX, rawY) : scaleFor(nearest(rawX, xPts), nearest(rawY, yPts))
  }
  const target = targetRef.current.length === n ? targetRef.current : new Array(n).fill(1)
  // `p` = the spring's progress; 1 is the wave, 0 is the resting deck.
  const p = n > 0 ? morphP : 0
  const scaleArr = p === 1 ? target : target.map((v) => 1 + (v - 1) * p)
  const focusLayout = placeCards(scaleArr)
  const focusedAdd = addSlotFor(focusLayout)
  /**
   * Paint order for the overlay, by RANK inside the magnified set — not by a
   * continuous function of the scale.
   *
   * `zIndex = round((scale - 1) * 50)` changed on every slot on every frame, and a
   * z-index change is a PAINT-ORDER change: it invalidates the property trees and
   * re-layerizes the deck (trace, 2026-09-29: `z-index` rewritten 2038x/s on a 240 Hz
   * display, with PrePaint + Layerize ≈ 2.2 ms of every frame). Pinning it out of the
   * stylesheet entirely (`--fix-zindex` in scripts/diag-sweep-jank.cjs) cut the slow
   * frames from 111 to 80 in the same 20 s window, which is what this replaces.
   *
   * The ranking keeps the same visible order where it can be seen at all: a magnified
   * card paints above a resting one (1+ vs 0), and among magnified cards the bigger
   * one wins. The values only move when the magnified SET or its ORDER changes — a
   * pointer crossing a card boundary — instead of every frame. Ties keep index order,
   * which is the DOM order the old equal-z case fell back to anyway.
   */
  const zRanks = new Map<number, number>()
  {
    const magnified: Array<{ i: number; s: number }> = []
    for (let i = 0; i < focusLayout.length; i++) {
      if (focusLayout[i].s > 1.001) magnified.push({ i, s: focusLayout[i].s })
    }
    magnified.sort((a, b) => a.s - b.s)
    for (let k = 0; k < magnified.length; k++) zRanks.set(magnified[k].i, k + 1)
  }
  const addCenter = { x: railW - 2 * pad - focusedAdd.right - side / 2, y: focusedAdd.top + side / 2 }
  const addTarget = engaged && n > 0 ? stepScale(Math.hypot(addCenter.x - rawX, addCenter.y - rawY) / (side + pad)) : 1
  const addScale = 1 + (addTarget - 1) * p
  /**
   * Drive `morphP` with WAVE_SPRING towards "engaged".
   *
   * ONE spring, ONE curve, either direction: engaging runs it 0 → 1, releasing
   * runs the same formula back 1 → 0 from wherever it currently is (`from` is the
   * live value, so an interrupted enter reverses without a jump). The pointer is
   * not an input here at all — it only moves `target` — which is what keeps the
   * motion continuous while the mouse keeps moving.
   *
   * A rAF loop rather than a transition or a timer: the value is written every
   * frame, so a dropped frame costs a frame of progress and nothing else, and
   * there is no "tween finished?" boundary to land on the wrong side of.
   */
  React.useEffect(() => {
    const st = morphRef.current
    const to = engaged ? 1 : 0
    if (REDUCE_MOTION) {
      if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0 }
      st.p = to; st.from = to; st.to = to
      setMorphP(to)
      return
    }
    if (Math.abs(to - st.p) < 0.0005) return
    st.from = st.p
    st.to = to
    st.t0 = performance.now()
    if (st.raf) return
    const settleMs = springSettleMs(WAVE_SPRING)
    const tick = (): void => {
      const elapsed = performance.now() - st.t0
      const done = elapsed >= settleMs
      st.p = done ? st.to : st.from + (st.to - st.from) * springValue(elapsed, WAVE_SPRING)
      setMorphP(st.p)
      st.raf = done ? 0 : requestAnimationFrame(tick)
    }
    st.raf = requestAnimationFrame(tick)
  }, [engaged])
  // Keep the rail's scroll ROW-ALIGNED across a layout change (a card-size tier
  // or a column step): the detents are `row · (side + gap)`, so after the pitch
  // moves the current offset must be pulled onto the new grid —otherwise the
  // top row would be left half-cut, which is exactly what the detents exist to
  // prevent.
  React.useEffect(() => {
    const rail = railElement()
    if (rail === null) return
    const pitch = Math.max(1, side + pad)
    const max = Math.max(0, rail.scrollHeight - rail.clientHeight)
    const top = Math.min(max, Math.round(rail.scrollTop / pitch) * pitch)
    if (Math.abs(top - rail.scrollTop) <= 0.5) return
    if (typeof rail.scrollTo === 'function') rail.scrollTo({ top, behavior: 'auto' })
    else rail.scrollTop = top
  }, [side, pad, columns])
  // ---- Overlay lifetime: ONE continuous move, never a cross-fade ------------
  // The magnified deck is a live SKELETON OF THE SAME CARDS: at rest its
  // geometry is bit-identical to the static deck (scale 1, same top/right, same
  // unit size), so the overlay can be swapped in and out at that instant with
  // nothing visible. That is what makes the hover read as one continuous move
  // (rest −wave −rest) instead of two decks fading against each other. There is
  // no longer a settle/follow/return phase machine: the overlay is live while the
  // wave is (engaged, or still springing home), and every frame of that is the
  // same code path — the geometry is written from `scaleArr` above.
  const morph = engaged || morphP > 0.0005
  // (A "raster prewarm" used to live here: flip the overlay visible for 64ms,
  // 140ms after the rail went idle, to keep its tree rasterized. It has been
  // REMOVED — it is not what makes the enter cheap. It almost never coincided
  // with a real hover, and measured on every enter the stall came back
  // (scripts/diag-hover-enter.cjs, 2026-09-20). What actually fixes the enter is
  // the permanent `will-change: transform` on the overlay slots; see the
  // post-mortem above `WavePlace` and the note on `slotStyle`.)
  /**
   * The overlay card BODIES arrive as a prop, built by the parent at the resting
   * unit and ALWAYS mounted while the rail is open.
   *
   * Two measured facts shaped this (1578脳1000, 15 cards, 2026-09-19):
   *  - mounting the 15 card subtrees (charts, SVGs, legends) inside the fixed
   *    overlay on the first hover frame cost ~93ms, while the leave —which only
   *    tweens the already-mounted bodies —stayed under 27ms. That stall was the
   *    "drops frames on the way in, smooth on the way back" asymmetry, and with a
   *    lazy mount it came back on EVERY hover.
   *  - re-creating the elements per frame was the other half: a realtime follow
   *    produced ~580 DOM mutations per 400ms for no visual change, because the
   *    card content depends only on `items` and `side`, never on the wave.
   * So: mount eagerly and build them in the parent (which does NOT re-render on
   * pointer moves, while this component does) —an idle RailWave re-renders
   * nothing, a follow frame touches only the slot divs, and the enter is a pure
   * opacity flip plus the geometry tween.
   */
  /** Last value written to --dsx-rail-scroll (see the guarded write below). */
  const railScrollVarRef = React.useRef(-1)
  // Render-body write (not an effect): the overlay's top offset reads this the
  // moment React commits, so a rail scroll never trails by a frame. GUARDED on
  // change: an unconditional setProperty on documentElement invalidates every
  // dependent declaration, and during a hover follow this component re-renders
  // every frame —a document-wide style recalc per frame for a variable that
  // only moves when the rail actually scrolls.
  if (railScrollVarRef.current !== railScrollTop) {
    railScrollVarRef.current = railScrollTop
    document.documentElement.style.setProperty('--dsx-rail-scroll', `${railScrollTop}px`)
  }
  // ---- Deck rearrangement wave on a column-count change ---------------------
  // The column count is the one DISCRETE step of a live width drag. The slots
  // already glide to their new geometry (their spring transition), so this only
  // adds a small staggered settle: a 1.6%-amplitude bob travelling through the
  // deck (per-slot delay via the CSS :nth-child stagger). The old whole-deck
  // `scale(0.93 −1.035)` jelly moved the entire rail as one block, which is
  // exactly what was rejected.
  const deckWrapRef = React.useRef<HTMLDivElement | null>(null)
  const lastColumnsRef = React.useRef(columns)
  React.useEffect(() => {
    if (lastColumnsRef.current === columns) return
    lastColumnsRef.current = columns
    const el = deckWrapRef.current
    if (el === null) return
    // Restart the wave: drop the class, force a style flush, re-add it.
    el.classList.remove('dsx-wave-run')
    void el.offsetWidth
    el.classList.add('dsx-wave-run')
    const timer = window.setTimeout(() => el.classList.remove('dsx-wave-run'), 900)
    return () => window.clearTimeout(timer)
  }, [columns])
  /**
   * The overlay slots carry NO transition: every frame of the morph is written
   * from `scaleArr` (spring progress × live target). `none` is also load-bearing
   * — the overlay's slots share the `.dsx-stats-card-slot` class, whose CSS
   * transition belongs to the STATIC deck's re-seating, so leaving it in place
   * would re-introduce exactly the retargeting this design removes.
   */
  /**
   * 鈹€鈹€ SCROLL GEOMETRY: the one place that decides how far the rail can travel 鈹€鈹€
   *
   * The deck's rows are seated at `rowTop(r) = 2 + r · pitch` (see placeCards), and
   * the rail's scroll range is `scrollContentH –clientH`. For every row to be
   * able to TOP OUT the viewport, the range must reach `rowTop(rows –1) + 2`,
   * i.e. the content needs `rows · pitch` of height —one extra row-pitch worth of
   * padding under the last row. Without it the browser CLAMPS the last detents
   * and the deck simply stops moving (see the tail element's note).
   *
   * So: contentH = max(rows · pitch, deckBottom) + clientH, and `clientH` is
   * measured live (the rail is viewport-tall, so it changes with the window).
   */
  const rail = React.createElement('div', {
    ref: railElRef,
    className: 'dsx-stats-rail', style: { position: 'fixed', top: 'var(--dsx-rail-top,0px)', right: RAIL_RIGHT_VAR, bottom: 0, width: `${railW}px`, overflowY: 'auto', overflowX: 'visible', boxSizing: 'border-box', padding: `4px ${pad}px ${pad}px ${pad}px`, background: 'transparent', pointerEvents: 'auto', transform: `translateX(${shiftX}px)`, // Anchor mode must NOT ease `right`: the anchored value is re-resolved every
      // layout pass, and a `transition: right` would spend the whole animation
      // interpolating toward a target that keeps moving (measured: the rail
      // trailed the column by up to 600px for ~0.5s). `transform` IS eased: it
      // carries the swallow shift (panel narrower than the rail) on the shell's
      // own curve. The fallback path eases `right` too.
      ...(ANCHOR_FOLLOW
        ? { transition: `transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), width ${SLOT_SPRING}` }
        : { transition: `right var(--ds-transition-duration-slow) var(--ds-ease-in-out), transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), width ${SLOT_SPRING}` }) },
    // NO onMouseLeave here: the pointer surface is owned by the wrapper below
    // (the rail and the overlay are siblings, so the rail's own leave fires the
    // moment the pointer moves onto a magnified card —the bug the wrapper
    // exists to remove).
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => moveRailFocus(e.clientX, e.clientY, e.currentTarget as HTMLDivElement),
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      // Write the overlay's scroll offset IMMEDIATELY (before React commits): the
      // magnified cards ride this variable, and a render-delayed write would make
      // them lag the deck by a frame during a scroll.
      const top = e.currentTarget.scrollTop
      if (railScrollVarRef.current !== top) {
        railScrollVarRef.current = top
        document.documentElement.style.setProperty('--dsx-rail-scroll', `${top}px`)
      }
      setRailScrollTop(top)
      railScrollSync(e.currentTarget)
    },
  },
    // The deck hides through a class (not a re-render): its element identity is
    // stable, so engaging the wave never reconciles the card DOM. The hide/show
    // itself has no transition —see the CSS note: the swap is invisible only
    // because both decks agree on the geometry at that instant.
    // The static deck hides only while the morph is REAL: at rest the deck is the
    // painted surface and keeps its interactive affordances (they live on the
    // real cards), while the transparent overlay only stays composited.
    React.createElement('div', { ref: deckWrapRef, className: morph ? 'dsx-wave-deck dsx-wave-on' : 'dsx-wave-deck' }, deck),
    // ── SCROLL TAIL: the room the LAST row needs in order to top out ──
    //
    // The rail's scroll range is `contentH − clientH`. `deckH` is the deck's own box
    // (its rows plus the tail padding), so the content is short of what the last row's
    // detent needs: without this spacer the browser CLAMPS the last detents and the
    // deck stops moving (measured 1578×1000: range 750 with 8 rows × pitch 184, so
    // rows 5–8 could never top out — the reported "a row stays half hidden and further
    // scrolling does nothing at all").
    //
    // ONE pitch of extra content is enough: with `contentH = deckH + tailH` the range is
    // `rows · pitch`, i.e. exactly `RAIL_ROW_SEAT + (rows − 1) · pitch` is reachable and
    // NOTHING beyond it — the wheel has nothing left to scroll into, so the deck stops
    // where the last row tops out (the user's "no need to keep scrolling into an empty
    // area"). A spacer rather than a taller deck: the deck's box is the OVERLAY's box
    // too, and both decks must stay pixel-identical while the wave is live.
    React.createElement('div', { key: '__tail', 'aria-hidden': true, style: { height: `${tailH}px`, pointerEvents: 'none' } }),
  )
  // Magnify overlay: a FIXED layer rendered OUTSIDE the rail's scroll-clip box (a
  // sibling of the rail, so no ancestor overflow clips it) that paints the live
  // reflow while a card is magnified —its leftward growth shows over the
  // conversation edge instead of being cut at the rail's left boundary, and the
  // rail width (hence the conversation column) never changes.
  // --dsx-rail-scroll pins it to the scrolled deck. Its right offset MUST be the
  // same variable the rail uses (--dsx-rightbar-w): DSH 0.1.5's right sidebar
  // never publishes --dsh-sidebar-width, so the old fallback left the overlay
  // parked at the viewport edge —720px to the right of the rail, painting over
  // the panel (measured 2026-09-13).
  //
  // INTERACTION (2026-09-19): while the morph is live the overlay is what the
  // user SEES, so it must also be what the user touches. The layer itself stays
  // pointer-events:none (so the rail underneath keeps receiving the pointer in
  // the gaps and can drive/disengage the wave), but the magnified CARDS and the
  // add button re-enable pointer events for themselves. Without this the
  // interactive surface stayed the hidden resting deck: the blue hover outline
  // landed on a card at its RESTING position while the painted card was
  // somewhere else ("the UI does not match"), and the add button —a child of
  // that hidden deck —could not be clicked at all once the wave was engaged
  // (exactly the reported "only works if I hover it directly, without coming
  // from a card above").
  /**
   * The rail and the magnify overlay form ONE pointer surface, owned by a common
   * wrapper (below) —never by either child alone.
   *
   * The two are SIBLINGS of necessity (the overlay must escape the rail's
   * scroll-clip box), so while the overlay was interactive, moving the pointer
   * from the rail onto a magnified card fired the RAIL's mouseleave —the event
   * target left the rail's subtree even though the pointer never left the widgets
   * (measured 2026-09-19). That single flaw produced two reported bugs:
   *   - moving between two cards (or through the gap between them) disengaged the
   *     wave on the way and re-engaged it on arrival, so the deck flickered
   *     big −small −big;
   *   - leaving the LEFTMOST magnified card outwards fired no leave at all (the
   *     rail had already left), so the card stayed magnified for good.
   * Both disappear once the wrapper —the union of the two boxes —owns
   * mousemove/mouseleave. Its children are both `position: fixed`, so the wrapper
   * adds no layout box of its own.
   */
  const magnifyLayerRef = React.useRef<HTMLDivElement | null>(null)
  /**
   * Is (x, y) still on the widget surface? — the wave's disarm oracle.
   *
   * "On the surface" means ON A TILE (`onCard`, with its 7px halo), not "inside the
   * rail". The rail's box is 372 × 936 and mostly empty: its padding, the 24px gaps
   * between cards and every blank run below the last row are all inside it, so a
   * box test kept the wave alive while the pointer sat over nothing — which is exactly
   * the report that survived the first fix ("the gap between the tiles, above the first
   * row, right of the last card — it stays magnified").
   *
   * The one thing the rail DOES own is the ADD tile's slot, and that is part of
   * `onCard` already. Both are positions where leaving must NOT be inferred from a
   * `mouseleave`: the wrapper's tree still contains the pointer while it crosses a gap,
   * so the geometric test is the only thing that distinguishes "between two cards" from
   * "in the empty band below them".
   */
  const nearSurface = (x: number, y: number): boolean => onCard(x, y)
  const leaveRail = (x?: number, y?: number): void => {
    if (typeof x === 'number' && typeof y === 'number' && nearSurface(x, y)) return
    // Disengaging is only a state change: dropping `engaged` reverses the same
    // spring from wherever it currently is, and the overlay stays live (morph)
    // until it lands back on the rest layout and the static deck takes over.
    armedRef.current = false
    setFocusY(null); setFocusX(null)
  }
  /**
   * ── POINTER WATCHER: the wave can never outlive the hover ──
   *
   * The geometric tests above run on events that arrive INSIDE the surface subtree,
   * so they can only react to events they are given: a pointer that leaves without the
   * subtree ever seeing a final move (a covered surface, a synthesised enter, a
   * stationary pointer whose tile moved away under it) left the wave engaged for good.
   * This listener sits on the WINDOW — it therefore sees the pointer whatever is under
   * it — and ends the wave as soon as the position is no longer over a tile of the
   * rail. That is the user's own prescription ("listen to the pointer and restore once
   * it is really over nothing").
   *
   * It only ARMS the release, so the cost is one bounds test per move event, and it
   * stops entirely while the wave is idle. A short debounce absorbs the single frame
   * between two magnified tiles, so crossing a gap never blinks the wave.
   */
  React.useEffect(() => {
    let timer = 0
    const check = (): void => {
      if (!armedRef.current) return
      const p = lastClientXYRef.current
      if (p === null) return
      if (nearSurface(p.x, p.y)) return
      leaveRail(p.x, p.y)
    }
    const onMove = (e: MouseEvent): void => {
      const { clientX: x, clientY: y } = e
      lastClientXYRef.current = { x, y }
      if (!armedRef.current) return
      // Debounce: the pointer pushes the release into the future by resetting the
      // timer, and the release always happens once it stops.
      window.clearTimeout(timer)
      timer = window.setTimeout(check, POINTER_LEAVE_MS)
    }
    window.addEventListener('mousemove', onMove, { capture: true, passive: true })
    return () => { window.clearTimeout(timer); window.removeEventListener('mousemove', onMove, { capture: true }) }
    // MOUNTED ONCE on purpose. With NO dependency array this effect re-registered the
    // listener on every follow re-render, and its cleanup cleared the pending timer —
    // so while the wave was live (a re-render per frame) the debounced release could
    // never fire. That was the bug behind "it stays magnified": the safety net existed
    // but was cancelled 60 times a second. The callbacks read refs, so a once-mounted
    // closure still sees current state.
  }, [])
  const surfaceRef = React.useRef<HTMLDivElement | null>(null)
  /**
   * Wheel −ROW-DETENT scrolling.
   *
   * Two requirements met by one path (2026-09-19):
   *  - the rail scrolls in ROW steps, never in pixels: the visible top row is
   *    never cut, one notch pulls the next row up to where the first row was, and
   *    the deck may overflow at the bottom (by design). Scroll positions are
   *    therefore always `row · (side + gap)`, which is also why the first frame
   *    (offset 0) shows whole rows with the next one peeking;
   *  - it is ALWAYS animated. The previous `scrollTop += deltaY` per wheel event
   *    was an instant jump per notch —the "sometimes it scrolls harshly instead
   *    of smoothly" report —and it only worked when the pointer was not over a
   *    magnified card (the overlay lives outside the scroller). Intercepting the
   *    wheel for both surfaces and running ONE tween of our own makes the motion
   *    identical wherever the pointer is, and guarantees the landing.
   *
   * React's onWheel is registered PASSIVE at the root (preventDefault is ignored),
   * hence the native listener; the deltaMode conversion keeps line/page deltas
   * from other platforms sane.
   *
   * The deps are `[side, pad]` ONLY. `railElRef` is a plain `{ current }` object
   * re-created on every render of the parent, so listing it made this effect tear
   * down and re-run on every parent render —and its cleanup (`stopTween`)
   * CANCELLED the row tween mid-flight. Measured: the deck came to rest at 120 /
   * 304 / 424 —instead of a detent, i.e. rows a third of the way up, which is the
   * reported "a row is always half hidden and further scrolling does nothing".
   * The ref's identity is irrelevant (only `.current` matters) and the rail's box
   * is resolved per event.
   */
  React.useEffect(() => {
    const el = surfaceRef.current
    if (el === null) return
    let accum = 0
    let baseRow = 0
    let lastAt = 0
    /** True from the moment a row step starts until its tween has finished. */
    let stepping = false
    let tween = 0
    let from = 0
    let to = 0
    let t0 = 0
    const pitch = Math.max(1, side + pad)
    const stopTween = (): void => {
      if (tween !== 0) { cancelAnimationFrame(tween); tween = 0 }
      stepping = false
    }
    /**
     * ROW-ALIGNMENT GUARD — the deck may never REST off the detent grid.
     *
     * The wheel's own native scroll still lands (measured: Chromium applies the full
     * 120px delta on the compositor before the handler's `preventDefault` can matter,
     * because the event has to travel to the main thread first). Our tween then takes
     * over and ends on the detent, but if anything cancels it — a second wheel event,
     * a layout change, a busy frame — the deck can come to rest a third of a row up:
     * exactly the reported "the row is either half hidden or will not move at all".
     * So the rail watches its own scroll offset: while a tween is running it ignores
     * the value, and once the motion has stopped for a moment it snaps any off-grid
     * position onto the nearest row. Nothing else in the product writes this offset,
     * and a drag of the rail's own scrollbar ends the same way — on a row.
     */
    let guardTimer = 0
    const onScrollGuard = (): void => {
      const rail = railElement()
      if (rail === null) return
      if (tween !== 0 || stepping) return
      window.clearTimeout(guardTimer)
      guardTimer = window.setTimeout(() => {
        const r = railElement()
        if (r === null || tween !== 0 || stepping) return
        // Snap onto the detent grid `RAIL_ROW_SEAT + row · pitch`, clamped to the rows
        // the coordinator allows — the guard must never push the deck past the content
        // (that would recreate the "scrolls into blank space" report in reverse).
        const row = Math.max(0, Math.min(lastRowRef.current, Math.round((r.scrollTop - RAIL_ROW_SEAT) / pitch)))
        const top = RAIL_ROW_SEAT + row * pitch
        if (Math.abs(r.scrollTop - top) > 1) r.scrollTop = top
      }, RAIL_SCROLL_MS + 60)
    }
    // Same for the tween's own END: land exactly on the target, then clear the lock.
    /**
     * The tween the browser CANNOT get wrong.
     *
     * `scrollTo({ behavior: 'smooth' })` is asynchronous and INTERRUPTIBLE, and
     * the next wheel event always arrives while the previous animation is still
     * in flight (measured: a 120px notch takes ~450ms, a wheel event lands every
     * 5—6ms). Two things followed from that, both reported:
     *   - the previous implementation recomputed the target row from
     *     `rail.scrollTop`, i.e. from a MID-ANIMATION position, so consecutive
     *     notches recomputed the same row and the deck stuck while the wheel kept
     *     turning (measured 8 notches in a row all settling on 184);
     *   - an interrupted native smooth scroll stops anywhere, so the deck could
     *     come to rest half a row up —"the row is either half hidden or will not
     *     move at all".
     * This tween is driven by our own frame loop and ALWAYS ends exactly on the
     * detent, and it retargets smoothly (it eases from wherever the deck is NOW
     * to the newest detent) instead of restarting from the top.
     */
    const ease = (p: number): number => 0.5 - Math.cos(Math.PI * p) / 2
    const step = (now: number): void => {
      const rail = railElement()
      if (rail === null) { tween = 0; stepping = false; return }
      const p = Math.min(1, (now - t0) / RAIL_SCROLL_MS)
      const v = from + (to - from) * ease(p)
      rail.scrollTop = p >= 1 ? to : v
      if (p >= 1) { tween = 0; stepping = false } else tween = requestAnimationFrame(step)
    }
    const scrollToDetent = (top: number): void => {
      const rail = railElement()
      if (rail === null) return
      if (REDUCE_MOTION) { stopTween(); rail.scrollTop = top; return }
      from = rail.scrollTop
      to = top
      if (Math.abs(to - from) < 0.5) { stepping = false; return }
      t0 = performance.now()
      stepping = true
      if (tween === 0) tween = requestAnimationFrame(step)
    }
    const onWheel = (e: WheelEvent): void => {
      const rail = railElement()
      if (rail === null) return
      const now = performance.now()
      /**
       * Normalise the three delta units before stepping (see the matrix probe
       * scripts/verify-rail-wheel-matrix.cjs):
       *  - PIXEL (0): raw pixels. One Windows notch reports ~100—20px, one line
       *    of a trackpad a few —hence the threshold.
       *  - LINE (1) / PAGE (2): these units are DISCRETE. Exactly one event is one
       *    physical notch, whatever its magnitude, so it is worth exactly one
       *    detent. Scaling by a guessed pixels-per-line instead made a standard
       *    3-line event 30—8px, i.e. BELOW the pixel threshold: a line-mode wheel
       *    (Firefox, some drivers) scrolled nothing at all, and a page-mode event
       *    (raw `clientHeight` = 936px) jumped NINE rows in one click.
       */
      const delta = e.deltaMode === 0 ? e.deltaY : (e.deltaY > 0 ? WHEEL_STEP_PX : -WHEEL_STEP_PX)
      if (delta === 0) return
      /**
       * THE STOP: once the last row of cards is fully in view there is nothing left to
       * reveal, so the wheel does nothing at all (the event is still swallowed, so the
       * gesture can never leak into the transcript behind the rail). `lastRowRef` is the
       * coordinator's cap — the highest row whose cards still reach into the viewport.
       */
      const topRow = lastRowRef.current
      if (now - lastAt > WHEEL_GESTURE_GAP_MS) {
        // A NEW gesture re-anchors on the row the deck is closest to. The anchor
        // is a row INDEX, not an offset, and it is never re-read while the
        // gesture is alive: recomputing the target from `rail.scrollTop` mid-flight
        // was what made consecutive notches recompute the same row and stick.
        accum = 0
        baseRow = Math.max(0, Math.min(topRow, Math.round((rail.scrollTop - RAIL_ROW_SEAT) / pitch)))
      }
      lastAt = now
      accum += delta
      // STEPS come from the raw accumulated input of THIS gesture, never from the
      // clamped scroll position: at the ends of the range the clamp eats part of a
      // step, and a position-derived step count then re-reads a shorter distance
      // and drifts off the grid (measured: a 94px step where 184 or 0 was due).
      const steps = accum > 0 ? Math.floor(accum / WHEEL_STEP_PX) : Math.ceil(accum / WHEEL_STEP_PX)
      /**
       * ONE STEP AT A TIME —the rule that keeps the deck on the grid under load.
       *
       * A wheel fires every 5—6ms while a row transition takes 240ms, so the next
       * event almost always arrives mid-tween. Two things then go wrong at once:
       * the gesture re-anchors on a HALF-SCROLLED offset (its own 280ms gap is
       * shorter than a slow frame), and the retarget discards the row the deck was
       * heading for. Measured on a busy page: 12 notches resting at 120, 304, 424,
       * 552 ——i.e. rows a third of the way up, which is exactly the reported
       * "a row is always half hidden and further scrolling does nothing".
       * While a step is in flight the input is therefore IGNORED (and its
       * accumulation dropped with it), so every step starts from a landed detent.
       */
      if (stepping) {
        accum = 0
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (steps !== 0) {
        accum -= steps * WHEEL_STEP_PX
        const row = Math.max(0, Math.min(topRow, baseRow + steps))
        if (row !== baseRow) {
          baseRow = row
          scrollToDetent(RAIL_ROW_SEAT + row * pitch)
        }
      }
      e.preventDefault()
      e.stopPropagation()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    /**
     * The guard listens to the rail's OWN scroll events: any offset that settles off
     * the row grid (a stray native scroll, an interrupted tween, a rail scrollbar
     * drag) is snapped back onto the nearest row. See `onScrollGuard`.
     */
    const guardTarget = ((): HTMLElement | null => {
      const rail = railElement()
      return rail
    })()
    if (guardTarget !== null) guardTarget.addEventListener('scroll', onScrollGuard, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (guardTarget !== null) guardTarget.removeEventListener('scroll', onScrollGuard)
      window.clearTimeout(guardTimer)
      stopTween()
    }
  }, [side, pad])
  /**
   * The live region's left OVERHANG (px): how far the magnified deck reaches past
   * the rail's own content box.
   *
   * The rail and the overlay are two boxes, but the pointer surface must be ONE
   * CONTINUOUS REGION —a tree-based union is not enough, because a magnified
   * card grows leftwards past the rail's box and the GAP between two such cards
   * then resolves to whatever is underneath (the conversation), which ends the
   * wave / restarts it as the pointer crosses back (reported 2026-09-19: "hovering
   * exactly in the gap cancels the wave", "at the edge it flips big/small").
   * The layer therefore widens its own hit box to cover the overhang while the
   * morph is live, with the left padding compensated so the CARDS do not move.
   */
  const overhang = morph && engaged
    ? Math.max(0, Math.ceil(focusLayout.reduce((m, c, i) => Math.max(m, c.right + items[i].baseW * c.s), 0) - (railW - 2 * pad)))
    : 0
  const magnifyLayer = React.createElement('div', { key: '__magnify', ref: magnifyLayerRef, className: 'dsx-magnify-layer', style: { position: 'fixed', top: 'calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px))', right: RAIL_RIGHT_VAR, width: `${railW + overhang}px`, boxSizing: 'border-box', padding: `4px ${pad}px ${pad}px ${pad + overhang}px`, zIndex: 25, overflow: 'visible', background: 'transparent', transform: `translateX(${shiftX}px)`, opacity: morph ? 1 : 0,
    // While the wave is live the LAYER ITSELF is hit-capable, not just the cards:
    // that is what covers the gaps between cards (and the strip the overhang
    // opens up) so the pointer never falls through the surface mid-move.
    pointerEvents: morph ? 'auto' : 'none',
    // Keep the layer COMPOSITED across the idle−攍ive flip, so revealing it is a
    // compositor property change instead of a fresh layer promotion.
    //
    // This hint is NOT the enter fix (it was tried as one and measured no better
    // than nothing): the enter stall comes from promoting the 15 SLOTS, see the
    // `will-change: transform` note on `slotStyle` and the post-mortem above
    // `WavePlace`.
    willChange: 'opacity' } },
    React.createElement('div', { key: '__mdeck', style: { position: 'relative', height: `${scrollContentH}px` } },
      (() => {
        const peak = focusLayout.reduce((m, p) => Math.max(m, p.s), 1)
        return focusLayout.map((c, idx) => {
        const it = items[idx]
        const baseW = it.baseW
        // Resting-size box, scaled about its top-right corner: identical geometry
        // to {top, right, w: baseW*s, h: side*s}, without re-laying-out the card.
        //
        // 2026-09-29 — THE PUSH IS NOW A TRANSFORM DELTA, NOT `top`/`right`.
        // Measured with a devtools timeline during a fast 2-D scrub over the rail
        // (scripts/diag-trace.cjs + scripts/diag-railsweepwrites.cjs): writing the
        // moved geometry through `top`/`right` rewrote ~1700 LAYOUT properties per
        // second (top 1048/s, right 689/s across the moving slots), and each frame
        // paid for it — PrePaint + Layout + Paint + Layerize ≈ 7 ms/frame, main
        // thread 80% busy, ~92 fps on a 240 Hz display, 98 dropped frames in 15 s.
        // A layout property on a composited slot cannot ride the compositor; the
        // same displacement expressed in `transform` can, so the slot's box is now
        // pinned at its REST seat and the whole per-frame animation — the push the
        // magnified neighbour causes AND the scale — is one transform write.
        //
        // The visual result is unchanged bit for bit: `right` is measured from the
        // rail's right edge, so the slot's top-right corner sits at
        // `contentW - right`, which makes the delta `rest.right - c.right` in X and
        // `c.top - rest.top` in Y; `transform-origin: top right` then scales about
        // exactly the corner the old code placed at `{top: c.top, right: c.right}`.
        // Both halves of the motion come from the same `scaleArr`, so the push still
        // glides with the scale instead of snapping (the failure the old comment
        // warned about was a CSS transition on the transform alone — there is no
        // transition here, every frame is written).
        const rest = restLayout[idx] ?? { top: c.top, right: c.right, w: baseW, h: side }
        const dx = rest.right - c.right
        const dy = c.top - rest.top
        const focused = engaged && peak > 1.001 && c.s >= peak - 0.0005
        // `will-change: transform` is PERMANENT here, not gated on `morph`.
        //
        // Promoting these slots IS the enter's cost. Measured on the real GPU
        // (scripts/diag-hover-isolate.cjs, 2026-09-20): a natural enter hit a 63ms
        // frame, while the same enter with the slots already promoted stayed under
        // 16ms with zero dropped frames (P4 vs P5). Gated on `morph`, Chrome has
        // to build 15 compositing layers AND rasterize them inside the hover
        // frame — the reported "grows with a stutter, shrinks smoothly".
        //
        // The old objection to a persistent hint (30 permanent layers across two
        // decks, GPU memory) does not apply: only the OVERLAY's slots carry it,
        // and the static deck stays unpromoted. Rail scrolling was re-measured
        // with the hint resident (scripts/diag-rail-scroll-perf.cjs) and shows no
        // regression (p95 28ms / 55 slow frames vs p95 30ms / 62 without it).
        const slotStyle = { position: 'absolute' as const, top: `${rest.top.toFixed(2)}px`, right: `${rest.right.toFixed(2)}px`, width: `${baseW}px`, height: `${side}px`, transformOrigin: 'top right', transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${c.s.toFixed(4)})`, transition: 'none', willChange: 'transform', zIndex: zRanks.get(idx) ?? 0, pointerEvents: morph ? 'auto' as const : 'none' as const }
        return React.createElement('div', {
          key: it.w.id,
          className: 'dsx-stats-card-slot' + (focused ? ' dsx-slot-focused' : ''),
          style: slotStyle,
        },
          // Always mounted (see `cardBodies`): the slot div carries the wave
          // geometry, the body is rendered at the RESTING unit and scaled by the
          // transform, so nothing is rebuilt per frame.
          cardBodies[idx],
        )
        })
      })(),
      // Mirror the add button at its WAVE position (focusedAdd), scaled by its own
      // wave factor —it displaces with the magnified deck like a card. It is the
      // ONLY add button reachable while the wave is live (the deck's copy is
      // visibility:hidden), so it carries the real click handler. Same
      // transform-delta treatment as the slots above: `restAdd` is the seat, the
      // per-frame displacement rides the transform.
      React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), tabIndex: morph ? 0 : -1, onClick: onAddClick, style: { position: 'absolute', top: `${restAdd.top.toFixed(2)}px`, right: `${restAdd.right.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px`, transformOrigin: 'top right', transform: `translate3d(${(restAdd.right - focusedAdd.right).toFixed(2)}px, ${(focusedAdd.top - restAdd.top).toFixed(2)}px, 0) scale(${addScale.toFixed(4)})`, transition: 'none', willChange: 'transform', zIndex: 30, pointerEvents: morph ? 'auto' as const : 'none' as const } },
        React.createElement('span', { className: 'dsx-stats-add-icon' },
          React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
        ),
        React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
      ),
    )
  )
  /**
   * ONE surface for the rail + overlay: the wrapper owns the pointer, so the wave
   * cannot be disengaged by moving between the two boxes (see `leaveRail`). No
   * layout box of its own —both children are `position: fixed`.
   *
   * Hover-outline consistency rides on the same structure: the magnified card
   * under the pointer is `.dsx-slot-focused`, and the wrapper's coordinates are
   * the RAIL's (the overlay is a sibling), so `moveRailFocus` resolves the peak in
   * rail-content space exactly like the resting deck does.
   */
  return React.createElement('div', {
    key: '__surface',
    ref: surfaceRef,
    'data-dsx-surface': '',
    style: { display: 'contents' },
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      const el = railElRef.current
      if (el !== null) moveRailFocus(e.clientX, e.clientY, el)
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => { leaveRail(e.clientX, e.clientY) },
  }, rail, magnifyLayer)
}