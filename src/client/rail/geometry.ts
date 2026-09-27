/**
 * dsh-widgets — rail geometry: the space the rail may claim, how cards are sized
 * inside it, and the anchors both the deck and the magnification wave read.
 *
 * Pure reads of the shell's own measurements (`--dsh-chat-*` custom properties, the
 * frame's inline grid template) plus the sizing maths — no React, no listeners, and
 * no state beyond `engagedPanelW`, which only `resolveRailSpace` touches.
 */

import { parseInstanceKey } from '../lib/contract'
import type { Prefs } from '../runtime/prefs'

/**
 * Whether the rail can follow the shell's column track NATIVELY through CSS
 * anchor positioning (`right: anchor(--dsx-center right)`) instead of being
 * repositioned from JS every frame. Both the rail and its magnify overlay are
 * `position: fixed` and the anchor is the AppFrame's center column
 * (`[class$='_centerCol']`, declared in widgets.module.css), so the browser
 * resolves the rail's right edge inside the very layout pass that animates
 * `grid-template-columns`: the rail and the conversation column move as ONE
 * surface —no tween, no frame lag, and none of the per-frame
 * `--dsx-rightbar-w` writes (a :root style invalidation, i.e. a full-document
 * style recalc every animation frame) the fallback path needs.
 */
export const ANCHOR_FOLLOW = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
  && CSS.supports('right: anchor(--dsx-center right)')

export interface WavePlace { s: number; top: number; right: number; w: number; h: number }

/**
 * Where row 0's cards sit inside the rail's scroll content (`placeCards` seats the
 * first row at 2px). Detents are therefore `RAIL_ROW_SEAT + row · pitch`: this is the
 * ONE formula the wheel, the row guard and the verification probes share, so a row can
 * never rest 2px away from where another code path expects it.
 */
export const RAIL_ROW_SEAT = 2

// ---- Rail space ------------------------------------------------------------------
// How much room the rail may claim, and how the cards are sized inside it. Pure
// reads of the shell's own measurements (`--dsh-chat-*` custom properties, the frame's
// inline grid template) plus the sizing maths — no React, no listeners, and no state
// beyond `engagedPanelW`, which only `resolveRailSpace` touches.
export const BASE_SIDE = 150

/**
 * The rail is a contextual utility strip INSIDE the conversation track, so the
 * only space it may claim is the margin the product's own transcript measure
 * leaves over —never the measure itself. Both numbers are published at runtime
 * by `ui-conversation` on the conversation root (verified 2026-09-17:
 * `--dsh-conversation-column-width: 1298px`, `--dsh-chat-content-width: 748px`
 * at a 1578px viewport), so the budget costs no geometry read:
 *
 *   budget = columnWidth –contentWidth
 *
 * The transcript is re-centred inside the remaining box, so pushing by more
 * than that budget shrinks the reading measure itself (measured before this
 * rule: 748px −554px at 1280 viewport, 394px at 1120 —below the official
 * `clamp(680px, — 920px)` floor).
 */
const RAIL_BUDGET_SAFETY = 24
/**
 * The transcript sits inside the scroll box with ~36px of side padding, and the
 * scroller itself is ~2px narrower than the track (measured 2026-09-17: at a
 * 1280 viewport the box was 800px and the prose 728px, i.e. 72px of inset; at
 * 1578 the prose stayed capped at its 748px measure). Without this term the
 * rail still shaved 20-50px off the measure.
 */
export const RAIL_BOX_INSET = 74
/** Smallest card side the settings slider allows; below it the rail collapses. */
const RAIL_MIN_SIDE = 100
/**
 * Card ROWS that must stay on screen at the AUTOMATIC FLOOR. The user's rule
 * (2026-09-18): the smallest size the rail may shrink a card to on its own is the
 * one where six rows still fit the window, with the last row's bottom gap equal
 * to the right gap. In the fluid layout this is the floor for the narrow
 * single-column case only (see readMinCardSide / resolveRailLayout).
 */
const RAIL_MIN_ROWS = 6
/**
 * Card ROWS that must stay on screen at the AUTOMATIC CEILING —and therefore
 * the hard upper bound on how far a card may grow past the user's base size
 * (user decision 2026-09-19, replacing the flat 1.35脳 multiplier, which read as
 * "way too big"): the largest allowed card is the one where FIVE rows still fit
 * the rail with the last row's bottom gap equal to the right gap. At a 1000px
 * window that is (936 –6 –5路24)/5 = 162px for a 150px base —an 8% growth
 * range instead of 35%, and it makes the deck's own height the thing that
 * decides, so a short window simply stops growing earlier.
 */
const RAIL_MAX_ROWS = 5
/**
 * Card-size TIER (px). Card size is NOT continuous: the fluid share is snapped
 * onto tiers of this width above the base size (150 −160 −170 —, each tier
 * change animated with a short spring —the iOS/iPadOS window-resize feel the
 * user asked for, with many more tiers. It also cuts the deck re-renders during
 * a live drag to one per tier crossed instead of one per 8px of budget.
 */
const CARD_SIZE_STEP = 10

/**
 * Conversation column width (px), 0 while the shell has not mounted it.
 *
 * Geometry first: the shell publishes --dsh-conversation-column-width a beat
 * AFTER a track transition settles, so a variable-only read can still see the
 * mid-flight column (measured 2026-09-17: closing the right panel left the
 * budget stuck at 0 because the read happened during that window).
 */
export function readColumnWidth(): number {
  const columnEl = document.querySelector('[class$="_centerCol"]')
  const measured = columnEl === null ? 0 : columnEl.getBoundingClientRect().width
  if (measured > 0) return measured
  const host = document.querySelector('[data-phase]') ?? columnEl
  const cs = host === null ? null : getComputedStyle(host)
  return cs === null ? 0 : Number.parseFloat(cs.getPropertyValue('--dsh-conversation-column-width'))
}

/** Read the official transcript measure / column width off the conversation root. */
export function readRailBudget(): number {
  const host = document.querySelector('[data-phase]') ?? document.querySelector('[class$="_centerCol"]')
  const columnEl = document.querySelector('[class$="_centerCol"]')
  if (host === null && columnEl === null) return 0
  const cs = host === null ? null : getComputedStyle(host)
  const content = cs === null ? Number.NaN : Number.parseFloat(cs.getPropertyValue('--dsh-chat-content-width'))
  const columnW = readColumnWidth()
  if (!(columnW > 0)) return 0
  // Fallback mirrors the official clamp when the measure variable is absent.
  const measure = Number.isFinite(content) && content > 0
    ? content
    : Math.min(920, Math.max(680, columnW * 0.64))
  return Math.max(0, Math.round(columnW - measure - RAIL_BOX_INSET))
}

/**
 * The column width the shell is ANIMATING TOWARD.
 *
 * The AppFrame animates `grid-template-columns`, so its INLINE value is the
 * transition's target while the computed value interpolates (measured
 * 2026-09-17: 45ms into an open the inline read `280px minmax(0px, 1fr) 710px`
 * while the computed column was still 1293px). Reading the target is what lets
 * the rail yield ON THE SAME BEAT as the panel instead of after it: the two
 * motions then share one 0.3s curve instead of running one after the other.
 */
function readTargetColumnWidth(): number | null {
  const frame = document.querySelector('[class$="_frame"]') as HTMLElement | null
  const inline = frame?.style.gridTemplateColumns ?? ''
  // First and last track only: the middle one is `minmax(0px, 1fr)`, whose space
  // makes a naive whitespace split produce four tokens instead of three.
  const parts = inline.split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null
  const px = (token: string): number | null => {
    const match = /^([\d.]+)px$/.exec(token)
    return match === null ? null : Number(match[1])
  }
  const left = px(parts[0])
  const right = px(parts[parts.length - 1])
  if (left === null || right === null) return null
  const width = window.innerWidth - left - right
  return width > 0 ? width : null
}

/**
 * Width of the right panel the shell is animating toward, read from the same
 * inline target: `0` means no panel is present (or it is on its way out), which
 * is what tells the rail whether it is being covered by a panel or merely has no
 * room. Falls back to the measured column so a drag (inline == current) works.
 */
function readTargetRightbarWidth(): number {
  const frame = document.querySelector('[class$="_frame"]') as HTMLElement | null
  const inline = frame?.style.gridTemplateColumns ?? ''
  const parts = inline.split(/\s+/).filter(Boolean)
  if (parts.length >= 3) {
    const match = /^([\d.]+)px$/.exec(parts[parts.length - 1])
    if (match !== null) return Number(match[1])
  }
  const column = document.querySelector('[class$="_rightbarCol"]')
  return column === null ? 0 : Math.round(column.getBoundingClientRect().width)
}

/** Current right-column width (0 when no panel is on screen at all). */
function measuredRightbarWidth(): number {
  const column = document.querySelector('[class$="_rightbarCol"]')
  return column === null ? 0 : Math.round(column.getBoundingClientRect().width)
}

/** The rail's normal right inset: it follows the conversation column's right edge. */
function railAnchorRight(): string {
  return ANCHOR_FOLLOW ? `anchor(--dsx-center right, ${RIGHTBAR_FALLBACK})` : RIGHTBAR_FALLBACK
}

/**
 * Right inset every rail-owned fixed layer reads. Normal mode follows the column
 * (anchor positioning); while a panel is present the rail is pinned to the
 * viewport's right edge —the same value whenever no panel is open —so the
 * panel, which paints ABOVE the rail's conversation-scoped slot, covers it.
 */
export function applyRailRight(swallowed: boolean): void {
  const next = swallowed ? '0px' : railAnchorRight()
  const style = document.documentElement.style
  if (style.getPropertyValue('--dsx-rail-right') === next) return
  style.setProperty('--dsx-rail-right', next)
}

/** Panel width reached when fully open, held across one open/close gesture. */
let engagedPanelW = 0

/** Everything the rail's fixed layers need to know for the current space. */
export interface RailSpace {
  /** The transcript must yield its margin (claim 0). */
  yielded: boolean
  /** A panel is present and will cover the rail (paint order: panel above rail). */
  swallowed: boolean
  /** No room and nothing to cover it: hide. */
  hidden: boolean
  /** Right inset for the rail / magnify / add panel. */
  right: string
  /** Width the rail draws. */
  drawW: number
  /**
   * Extra rightward shift (px) so a panel NARROWER than the rail can still cover
   * it completely: the rail's right edge is pinned to the viewport, so shifting
   * it right by (rail –抪anel) lands its left edge exactly on the panel's left
   * edge. Zero whenever the panel is at least as wide as the rail.
   */
  shiftX: number
  /** Space the transcript yields to the rail. */
  claimW: number
  side: number
  columns: number
  pad: number
}

/**
 * Decide how the rail coexists with the right panel and the transcript measure.
 *
 * Resolution order: the preferred deck —what still fits the transcript's
 * leftover margin —if nothing does, the panel takes the space and the rail is
 * COVERED by it (the rail's slot is inside the conversation, which paints below
 * the right column), or hidden when there is no panel to do the covering.
 */
export function resolveRailSpace(prefs: Prefs, budget: number): RailSpace {
  const pad = prefs.panelPadding
  const layout = resolveRailLayout(prefs, budget, readMinCardSide(pad), readMaxCardSide(pad, prefs.cardSide))
  const columns = layout.constrained ? ([1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2) : layout.columns
  const side = layout.constrained ? prefs.cardSide : layout.side
  const drawW = columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2
  // A panel counts as present while it is on screen OR on its way in. Reading the
  // target alone would drop to 0 the moment a CLOSE begins, snapping the rail out
  // from under the panel at full opacity (a pop); the measured column keeps the
  // rail pinned until the panel is really gone —and by then the anchor resolves
  // to the same 0px, so handing back is invisible.
  const panelW = Math.max(readTargetRightbarWidth(), measuredRightbarWidth())
  const swallowed = panelW > 0
  // Panel width for the COVER calculation: the width it reaches when fully open,
  // held for the whole gesture. Using the live value would make a closing panel
  // (shrinking to 0) push the rail further and further right.
  if (swallowed) engagedPanelW = Math.max(engagedPanelW, panelW)
  else engagedPanelW = 0
  return {
    yielded: layout.constrained,
    swallowed,
    hidden: layout.constrained && !swallowed,
    right: swallowed ? '0px' : railAnchorRight(),
    drawW,
    shiftX: swallowed ? Math.max(0, drawW - engagedPanelW) : 0,
    claimW: layout.constrained ? 0 : drawW,
    side,
    columns,
    pad,
  }
}

/** Budget implied by the track the frame is animating toward (null = unknown). */
export function predictRailBudget(): number | null {  const column = readTargetColumnWidth()
  if (column === null) return null
  const host = document.querySelector('[data-phase]')
  const cs = host === null ? null : getComputedStyle(host)
  const content = cs === null ? Number.NaN : Number.parseFloat(cs.getPropertyValue('--dsh-chat-content-width'))
  const measure = Number.isFinite(content) && content > 0
    ? content
    : Math.min(920, Math.max(680, column * 0.64))
  return Math.max(0, Math.round(column - measure - RAIL_BOX_INSET))
}

/**
 * Smallest card side the rail will shrink to on its own.
 *
 * In the fluid layout (see resolveRailLayout) this floor only applies to the
 * NARROW case —a single column whose `1fr` share falls below the base size —
 * and it is what separates "shrink and stay" from "yield entirely". It is
 * derived from the rail's own box via `rowFitSide`, not guessed; see
 * RAIL_MIN_ROWS for the derivation. The card-size slider goes down to
 * RAIL_MIN_SIDE (100), so a smaller explicit preference always wins.
 */
export function readMinCardSide(pad: number): number {
  return Math.max(RAIL_MIN_SIDE, rowFitSide(RAIL_MIN_ROWS, pad))
}

/**
 * The largest card side the rail may grow a card to on its own (see
 * RAIL_MAX_ROWS). An explicit base size larger than this is still honoured: the
 * ceiling only limits the AUTOMATIC growth, never the user's own preference.
 */
export function readMaxCardSide(pad: number, base: number): number {
  return Math.max(base, rowFitSide(RAIL_MAX_ROWS, pad))
}

/**
 * Card side at which `rows` card rows exactly fill the rail with the last row's
 * bottom gap equal to the right gap (both are `pad`):
 *
 *   rows路side + (rows –1)路pad + 2 (deck base) + 4 (rail top padding) + pad = railHeight
 *   side = (railHeight –6 –rows路pad) / rows
 */
function rowFitSide(rows: number, pad: number): number {
  const rail = document.querySelector('.dsx-stats-rail')
  const innerH = rail !== null
    ? rail.clientHeight
    : Math.max(0, window.innerHeight - (Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--dsx-rail-top'),
    ) || 0))
  if (!(innerH > 0)) return RAIL_MIN_SIDE
  return Math.floor((innerH - 6 - rows * pad) / rows)
}

/**
 * True when every installed tile is a 2脳4 (two cells wide).
 *
 * A 3-column deck fits only ONE of them per row (2 cells used, 1 wasted), so for
 * such a deck the automatic fill skips the 3-column stage and steps 2 ⇄4
 * (user decision 2026-09-18). An explicit 3-column preference is still honoured:
 * this only removes 3 from the DEGRADATION path below a 4-column preference.
 */
function allWideItems(prefs: Prefs): boolean {
  const keys = prefs.order.filter((key) => prefs.installed.indexOf(key) !== -1)
  if (keys.length === 0) return false
  return keys.every((key) => parseInstanceKey(key).size === '2x4')
}

/**
 * The rail geometry that fits a budget —a fluid grid: the industry-standard
 * `grid-template-columns: repeat(auto-fill, minmax(base, 1fr))`, capped by the
 * user's column count and by the five-row ceiling (see readMaxCardSide).
 *
 *   columns = min(pref.columns, the most columns whose cells still hold `base`)
 *   side    = the leftover width shared by those columns, SNAPPED to
 *             CARD_SIZE_STEP tiers at or above `base`, then clamped to the
 *             ceiling (itself snapped onto the same tier grid)
 *
 * The two settings + the gap therefore compose into ONE rule:
 *
 *   side = clamp(autoFloor, tier((room –(n+1)路gap) / n), fiveRowCeiling)
 *
 * with `pref.columns` an UPPER BOUND (a wider window never opens more columns
 * than the user asked for —their decision 2026-09-19: "设置成 2 列，即便对话区
 * 域有多余的空间，也只排放 2 列) and `pref.cardSide` the BASE side, i.e. the
 * minimum track the deck is willing to call a card. Because `room` is read live
 * from the transcript measure, dragging the conversation width moves `side` on
 * the very same frame —as a tier hop, which is what the spring on the card
 * slots animates.
 *
 * Only when even a single column cannot hold the base size does the card shrink,
 * and only below the automatic floor does the rail collapse (prefs untouched, so
 * widening the window brings it straight back).
 *
 * Why the older rule went: "keep the column count, shrink the card to fit" pinned
 * every card at exactly the base size across wide budget ranges (measured
 * 2026-09-19 at 1578脳1000: `side` stayed 150px while the budget moved
 * 372−89px), which is the reported "the widgets do not resize while I drag the
 * conversation width".
 */
export function resolveRailLayout(prefs: Prefs, budget: number, minSide: number, maxSide: number): { side: number; columns: number; railW: number; constrained: boolean } {
  const pad = prefs.panelPadding
  const base = prefs.cardSide
  const maxCols = [1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  const widthOf = (columns: number, side: number): number => (columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2)
  // Before the first measurement (-1) the budget is unknown: assume the rail
  // fits, so a plugin start never flashes a collapsed deck.
  if (!(budget >= 0)) return { side: base, columns: maxCols, railW: widthOf(maxCols, base), constrained: false }
  const room = Math.max(0, budget - RAIL_BUDGET_SAFETY)
  // 1. auto-fill: the most columns whose cells still hold the base size.
  let columns = 1
  while (columns < maxCols && widthOf(columns + 1, base) <= room) columns++
  // A 3-column deck of 2脳4 tiles seats only ONE per row (2 cells used, 1
  // wasted), which reads as a hole. That is a DEGRADATION case only: it applies
  // when the user asked for more (4) and the auto-fill landed on 3.
  if (columns === 3 && maxCols > 3 && allWideItems(prefs)) columns = 2
  // 2. the 1fr share: the leftover width split between those columns.
  const fluid = columns > 1 ? Math.floor((room - (columns + 1) * pad) / columns) : Math.floor(room - pad * 2)
  if (fluid < base) {
    // Narrower than the base size: shrink the single card down to the automatic
    // floor —on the same TIER grid (150 −140 −—, and collapse below the floor.
    const tiered = base + Math.floor((fluid - base) / CARD_SIZE_STEP) * CARD_SIZE_STEP
    if (tiered < minSide) return { side: base, columns: 1, railW: 0, constrained: true }
    return { side: tiered, columns: 1, railW: widthOf(1, tiered), constrained: false }
  }
  // 3. tiers: the share above the base snaps to CARD_SIZE_STEP steps (150 −160
  // −170 — and the five-row ceiling gets the last word —the CEILING itself is
  // snapped onto the same tier grid, so a card never lands on an off-tier size
  // like 162 (the user's "妗ｄ綅" reading: every size is a tier).
  const ceiling = base + Math.floor((maxSide - base) / CARD_SIZE_STEP) * CARD_SIZE_STEP
  const side = Math.min(base + Math.floor((fluid - base) / CARD_SIZE_STEP) * CARD_SIZE_STEP, ceiling)
  return { side, columns, railW: widthOf(columns, side), constrained: false }
}

/** Right inset the JS fallback path publishes (and the anchor fallback reads). */
const RIGHTBAR_FALLBACK = 'var(--dsx-rightbar-w, var(--dsh-sidebar-width, 0px))'
