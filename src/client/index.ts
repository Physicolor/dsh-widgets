/**
 * Harness Widgets —browser half entry.
 *
 * Registers the right-hand widget rail, the header capsule toggle, and the
 * two settings surfaces (General rows + the component-settings section). One shared bridge
 * holds the persisted prefs, the folded session stats, and the OpenCode usage
 * payload fetched from the Host's same-origin `/api/opencode-usage` route.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import './widgets.module.css'
import { ALL_INSTANCES, DEFAULT_INSTALLED, WIDGETS, WIDGET_LOCALES } from './generated.registry'
import { instanceKey, parseInstanceKey, sizesOf, widgetName, TRAJECTORY_WINDOW, type CommandCodeData, type SkeletonShape, type SysInfo, type TrajectoryBeat, type UsageData, type UsageMulti, type WidgetRenderOut, type WidgetSize } from './lib/contract'
import { accumulateHeatmap, buildHeatmapGrid, dateKey, DEFAULT_TZ, loadHeatmapAnchor, loadHeatmapStore, loadSeen, mergeToday, saveHeatmapAnchor, saveSeen } from './lib/heatmap-accounting'
import { springSettleMs, springValue, WAVE_SPRING } from './lib/morph-spring'
import { SYS_WIDGET_IDS, ingestSysInfo, resolveInterval } from './lib/sys-view'
import { CardBody, DEFAULT_CORNER_PERCENT, WidgetsPage, type Prefs } from './components'
import { t, installLocale, onLocaleChange } from './i18n'

const STORAGE_KEY = 'harness-widgets.state'
/** Local mirror of the last saved-at timestamp, compared against the host file
 *  on boot so the same DSH service converges from any browser origin
 *  (localhost vs 127.0.0.1 are different localStorage realms). */
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
/** Same-origin host route holding the authoritative state file. */
const STORE_API = '/api/widgets-state'
const BASE_SIDE = 150

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
const RAIL_BOX_INSET = 74
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
function readColumnWidth(): number {
  const columnEl = document.querySelector('[class$="_centerCol"]')
  const measured = columnEl === null ? 0 : columnEl.getBoundingClientRect().width
  if (measured > 0) return measured
  const host = document.querySelector('[data-phase]') ?? columnEl
  const cs = host === null ? null : getComputedStyle(host)
  return cs === null ? 0 : Number.parseFloat(cs.getPropertyValue('--dsh-conversation-column-width'))
}

/** Read the official transcript measure / column width off the conversation root. */
function readRailBudget(): number {
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
function applyRailRight(swallowed: boolean): void {
  const next = swallowed ? '0px' : railAnchorRight()
  const style = document.documentElement.style
  if (style.getPropertyValue('--dsx-rail-right') === next) return
  style.setProperty('--dsx-rail-right', next)
}

/** Panel width reached when fully open, held across one open/close gesture. */
let engagedPanelW = 0

/** Everything the rail's fixed layers need to know for the current space. */
interface RailSpace {
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
 * Everything a React entry reads from the plugin bridge. One immutable object
 * per emit (see `emit`), because `useSyncExternalStore` compares references.
 */
interface BridgeSnapshot {
  open: boolean
  hasSession: boolean
  stats: Stats | null
  usageData: UsageData | null
  usageMulti: UsageMulti | null
  commandCode: CommandCodeData | null
  commandCodeError: string | null
  usageDaily: Record<string, number> | null
  sysinfo: SysInfo | null
  prefs: Prefs
  railBudget: number
}

/**
 * Decide how the rail coexists with the right panel and the transcript measure.
 *
 * Resolution order: the preferred deck —what still fits the transcript's
 * leftover margin —if nothing does, the panel takes the space and the rail is
 * COVERED by it (the rail's slot is inside the conversation, which paints below
 * the right column), or hidden when there is no panel to do the covering.
 */
function resolveRailSpace(prefs: Prefs, budget: number): RailSpace {
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
function predictRailBudget(): number | null {  const column = readTargetColumnWidth()
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
function readMinCardSide(pad: number): number {
  return Math.max(RAIL_MIN_SIDE, rowFitSide(RAIL_MIN_ROWS, pad))
}

/**
 * The largest card side the rail may grow a card to on its own (see
 * RAIL_MAX_ROWS). An explicit base size larger than this is still honoured: the
 * ceiling only limits the AUTOMATIC growth, never the user's own preference.
 */
function readMaxCardSide(pad: number, base: number): number {
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
function resolveRailLayout(prefs: Prefs, budget: number, minSide: number, maxSide: number): { side: number; columns: number; railW: number; constrained: boolean } {
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
const ANCHOR_FOLLOW = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
  && CSS.supports('right: anchor(--dsx-center right)')

/** Right inset the JS fallback path publishes (and the anchor fallback reads). */
const RIGHTBAR_FALLBACK = 'var(--dsx-rightbar-w, var(--dsh-sidebar-width, 0px))'

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

/** Map from interactive action id to the slash command it triggers. */
const ACTION_COMMANDS: Record<string, string> = {
  contextCompact: '/compact',
}



const DEFAULTS: Prefs = {
  panelPadding: 24,
  cardSide: 150,
  installed: DEFAULT_INSTALLED.slice(),
  order: ALL_INSTANCES.slice(),
  apiKey: '',
  railOpen: false,
  realTime: false,
  magnify: 1.2,
  panelWidth: 500,
  cardConfigs: {},
  maxWidgets: 10,
  columns: 2,
  hideStatsLine: false,
  // 连续曲率圆角 is ON by default (see the Prefs doc): the rail cards and the
  // previews share the same corner gear, so the setting is read from one place.
  squircle: true,
  cornerPercent: DEFAULT_CORNER_PERCENT,
}

/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

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
interface WavePlace { s: number; top: number; right: number; w: number; h: number }

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
const SURFACE_TOLERANCE = 6
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
/**
 * Where row 0's cards sit inside the rail's scroll content (`placeCards` seats the
 * first row at 2px). Detents are therefore `RAIL_ROW_SEAT + row · pitch`: this is the
 * ONE formula the wheel, the row guard and the verification probes share, so a row can
 * never rest 2px away from where another code path expects it.
 */
const RAIL_ROW_SEAT = 2

/**
 * Highest row that can top out the rail's viewport, derived from the LIVE scroll
 * box rather than from a prop: the detents are `2 + r 路 pitch`, so the last usable
 * one is the largest that still fits the scroll range. Always ≤0 (a deck shorter
 * than the viewport keeps row 0 as its only detent).
 */
function lastScrollRow(rail: { scrollHeight: number; clientHeight: number }, pitch: number): number {
  const max = Math.max(0, rail.scrollHeight - rail.clientHeight)
  return Math.max(0, Math.floor(Math.max(0, max - 2) / Math.max(1, pitch)))
}
/** Honour the OS "reduce motion" preference for the scroll animation too. */
const REDUCE_MOTION = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Which live source each data-backed widget family reads, and how many body
 * rows its loading skeleton draws.
 *
 * The SHELL owns this mapping (not the widget): a widget cannot distinguish
 * "my source is still in flight" from "my source answered with nothing", and
 * those two states deserve different cards —placeholder pills vs 鏁版嵁涓嶈冻.
 * Widgets that only read session-local projections (counts, tokens, task,
 * heatmap, trajectory, peak-pricing) are absent: their data is derived
 * synchronously and is never "loading".
 */
const WIDGET_SOURCE: Record<string, 'usage' | 'cc' | 'sys'> = {
  'usage-rings': 'usage', 'usage-bars': 'usage', 'usage-rolling': 'usage', 'usage-weekly': 'usage', 'usage-monthly': 'usage',
  'cc-whoami': 'cc', 'cc-usage': 'cc', 'cc-credits': 'cc', 'cc-subscription': 'cc',
  'cc-windows': 'cc', 'cc-window-5h': 'cc', 'cc-window-weekly': 'cc', 'cc-window-monthly': 'cc',
  'quota-manage': 'cc',
  'sys-cpu': 'sys', 'sys-gpu': 'sys', 'sys-gpu-line': 'sys', 'sys-rings': 'sys', 'sys-board': 'sys',
}
/**
 * The SILHOUETTE each loading skeleton draws, per widget id (see
 * `WidgetRenderOut.skeletonShape`): a rail of identical grey pills says
 * "something is loading here" but not WHICH card, and the loading → loaded swap
 * then re-shapes the tile. Every family with a live source therefore declares
 * the body it normally draws — three rings, one bar block, a figures row, three
 * stacked quota bars, a sparkline — and the skeleton paints that silhouette.
 *
 * Shell-owned like WIDGET_SOURCE, and for the same reason: the shape has to be
 * known while the widget's own render has no data to derive it from. `count` is
 * the number of repeated units (rings / figures / quota rows); omitted = the
 * SkeletonBody default of 3. `rows` is the body-line count of a `text` card and
 * is NOT declared per family: every one of them draws a single grey line under
 * the figure (a reset date, a period, a memory line), so one row is the honest
 * placeholder and two would promise content that never arrives.
 */
const SKELETON_SHAPE: Record<string, { shape: SkeletonShape; count?: number; rows?: number }> = {
  // OpenCode Go usage: one payload, three bodies — three donuts, a three-column
  // bar chart, or a single-window percent card.
  'usage-rings': { shape: 'rings', count: 3 },
  'usage-bars': { shape: 'bars' },
  'usage-rolling': { shape: 'text' },
  'usage-weekly': { shape: 'text' },
  'usage-monthly': { shape: 'text' },
  // Command Code: usage puts a three-figure row on the floor, credits stacks
  // three quota bars, windows is three rings; the rest are big-figure cards
  // (one value + one grey line).
  'cc-usage': { shape: 'figures', count: 3 },
  'cc-credits': { shape: 'quotas', count: 3 },
  'cc-windows': { shape: 'rings', count: 3 },
  'cc-whoami': { shape: 'text' },
  'cc-subscription': { shape: 'text' },
  'cc-window-5h': { shape: 'text' },
  'cc-window-weekly': { shape: 'text' },
  'cc-window-monthly': { shape: 'text' },
  'quota-manage': { shape: 'figures', count: 2 },
  // System monitor: rings (two on sys-rings, four on the 2×4 board), one
  // sparkline, and two big-figure cards.
  'sys-rings': { shape: 'rings', count: 2 },
  'sys-board': { shape: 'rings', count: 4 },
  'sys-gpu-line': { shape: 'line' },
  'sys-cpu': { shape: 'text' },
  'sys-gpu': { shape: 'text' },
}

/**
 * Is this family's live source still in flight? (see WIDGET_SOURCE)
 *
 * `commandCodeError` is deliberately part of the test: once the host route has
 * ANSWERED with an error the card must show its real "not configured" state,
 * not a skeleton that never resolves.
 */
function isSourcePending(source: 'usage' | 'cc' | 'sys', snap: BridgeSnapshot): boolean {
  if (source === 'usage') return snap.usageData === null && (snap.usageMulti === null || snap.usageMulti.keys.length === 0)
  if (source === 'cc') return snap.commandCode === null && snap.commandCodeError === null
  return snap.sysinfo === null
}

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

function RailWave(props: RailWaveProps): React.ReactElement {
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
  // or a column step): the detents are `row 路 (side + gap)`, so after the pitch
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
   * The deck's rows are seated at `rowTop(r) = 2 + r 路 pitch` (see placeCards), and
   * the rail's scroll range is `scrollContentH –clientH`. For every row to be
   * able to TOP OUT the viewport, the range must reach `rowTop(rows –1) + 2`,
   * i.e. the content needs `rows 路 pitch` of height —one extra row-pitch worth of
   * padding under the last row. Without it the browser CLAMPS the last detents
   * and the deck simply stops moving (see the tail element's note).
   *
   * So: contentH = max(rows 路 pitch, deckBottom) + clientH, and `clientH` is
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
   *    therefore always `row 路 (side + gap)`, which is also why the first frame
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
        // `top`/`right` are part of the tween: a magnified neighbour PUSHES the
        // cards around it, and transitioning only the transform left those pushes
        // snapping into place while the scales glided (the other half of the
        // "not continuous" report).
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
        const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${baseW}px`, height: `${side}px`, transformOrigin: 'top right', transform: `scale(${c.s.toFixed(4)})`, transition: 'none', willChange: 'transform', zIndex: Math.round((c.s - 1) * 50), pointerEvents: morph ? 'auto' as const : 'none' as const }
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
      // visibility:hidden), so it carries the real click handler.
      React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), tabIndex: morph ? 0 : -1, onClick: onAddClick, style: { position: 'absolute', top: `${focusedAdd.top.toFixed(2)}px`, right: `${focusedAdd.right.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px`, transformOrigin: 'top right', transform: `scale(${addScale.toFixed(4)})`, transition: 'none', willChange: 'transform', zIndex: 30, pointerEvents: morph ? 'auto' as const : 'none' as const } },
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

/** Normalize an arbitrary persisted/remote prefs object into a valid Prefs.
 *  Shared by localStorage loads and the authoritative host-store sync, so both
 *  channels survive schema drift identically. */
function normalizePrefs(p: Partial<Prefs>): Prefs {
  const s = { ...DEFAULTS, ...p }
  if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding
  if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide
  // Normalize one persisted entry to a valid instance key. Legacy bare widget
  // ids (pre-2脳2) migrate to their 2脳4 instance; unknown entries are dropped.
  const normalizeInstance = (key: string): string => {
    // v1.5.0 leak migration: sys-board shipped with its descriptor missing the
    // sizes list, so the runtime defaulted it to 2脳2 while the manifest said
    // 2脳4 —users installed a bogus sys-board@2x2. Remap it to the real size.
    if (key === 'sys-board@2x2') key = 'sys-board@2x4'
    const { widgetId, size } = parseInstanceKey(key)
    const w = WIDGETS.find((x) => x.id === widgetId)
    if (!w) return ''
    return sizesOf(w).includes(size) ? instanceKey(widgetId, size) : ''
  }
  // Respect the user's installed set exactly —do NOT force-append built-ins
  // back on every load (that kept overflowing the max-widgets cap after the
  // user uninstalled system widgets). Only the first-run path seeds defaults.
  if (!Array.isArray(s.installed)) s.installed = []
  s.installed = s.installed.map(normalizeInstance).filter((id): id is string => id !== '')
  if (!Array.isArray(s.order)) s.order = []
  s.order = s.order.map(normalizeInstance).filter((id): id is string => id !== '')
  for (const key of ALL_INSTANCES) if (s.order.indexOf(key) === -1) s.order.push(key)
  if (typeof s.apiKey !== 'string') s.apiKey = ''
  if (typeof s.railOpen !== 'boolean') s.railOpen = DEFAULTS.railOpen
  if (typeof s.realTime !== 'boolean') s.realTime = DEFAULTS.realTime
  if (!Number.isFinite(s.magnify) || s.magnify < 1 || s.magnify > 2) s.magnify = DEFAULTS.magnify
  if (!Number.isFinite(s.panelWidth) || s.panelWidth < 260 || s.panelWidth > 760) s.panelWidth = DEFAULTS.panelWidth
  if (typeof s.cardConfigs !== 'object' || s.cardConfigs === null || Array.isArray(s.cardConfigs)) s.cardConfigs = {}
  if (!Number.isFinite(s.maxWidgets) || s.maxWidgets < 1 || s.maxWidgets > 20) s.maxWidgets = DEFAULTS.maxWidgets
  if ([1, 2, 3, 4].indexOf(s.columns as number) === -1) s.columns = DEFAULTS.columns
  if (typeof s.hideStatsLine !== 'boolean') s.hideStatsLine = DEFAULTS.hideStatsLine
  return s
}

function loadState(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
    return normalizePrefs(JSON.parse(raw) as Partial<Prefs>)
  } catch {
    return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
  }
}

function loadSavedAt(): number {
  try {
    const n = +(localStorage.getItem(SAVED_AT_KEY) ?? '')
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

/** Debounced PUT to the host store; localStorage is always the fast path, the
 *  host file the authoritative one (survives origin switches and clearing). */
let hostSyncTimer: number | undefined
let pendingState: Prefs | null = null
let pendingAt = 0
async function putState(s: Prefs, at: number): Promise<void> {
  try {
    await fetch(STORE_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: at, state: s }),
      // A keepalive request is allowed to outlive the page, so a state write
      // that is still in flight when the window/tab closes is not dropped.
      keepalive: true,
    })
  } catch { /* host unreachable: localStorage still holds the state; a later boot sync re-pushes */ }
}
function saveState(s: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    pendingAt = Date.now()
    localStorage.setItem(SAVED_AT_KEY, String(pendingAt))
  } catch { /* storage unavailable */ }
  pendingState = s
  if (hostSyncTimer !== undefined) window.clearTimeout(hostSyncTimer)
  hostSyncTimer = window.setTimeout(() => {
    hostSyncTimer = undefined
    const toSend = pendingState
    const at = pendingAt
    pendingState = null
    if (toSend !== null) void putState(toSend, at)
  }, 400)
}
/**
 * Flush any state that has not yet reached the host store when the page is
 * being torn down (window/tab close, navigation, desktop-app quit). The
 * 400 ms debounce means the last edit before a quick close is usually still
 * pending here; a normal fetch would be cancelled with the page, but
 * `sendBeacon` is delivered by the browser even as the page is destroyed —
 * which is what keeps the write inside desktop shells that spawn a fresh
 * random loopback origin on every launch (their localStorage is a new realm
 * each boot, so the host file is the only channel that survives).
 */
function flushPendingState(): void {
  const toSend = pendingState
  if (toSend === null) return
  const at = pendingAt
  pendingState = null
  try {
    const body = JSON.stringify({ savedAt: at, state: toSend })
    // sendBeacon is a POST; the host handler accepts PUT or POST, so the
    // same route copes with it. A Blob pins the JSON content type.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(STORE_API, new Blob([body], { type: 'application/json' }))
    } else {
      void fetch(STORE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  } catch { /* page is going away; nothing more can be done —the boot sync on the next launch converges */ }
}

/** Session stats shape collected by the dock collector. */
interface Stats {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null
  contextPercent?: number | null
  contextWindow?: number | null
  contextTokens?: number | null
  contextBreakdown?: { systemTokens: number; toolsTokens: number; messageTokens: number } | null
  todos?: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed' }> | null
  heatmapGrid?: Array<Array<{ value: number; date: string }>>
  heatmapRaw?: Record<string, number>
  trajectory?: TrajectoryBeat[]
}

/** Coerce a possibly-undefined timestamp to a finite number (null when unusable). */
function timelineTime(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Project the live conversation into the official 杞ㄨ抗 layout's three lanes:
 * 杈撳叆 (user/steering message) 路 妯″瀷 (assistant step) 路 宸ュ叿 (tool call).
 *
 * Beats are ordered by their START time and trimmed to the newest
 * `TRAJECTORY_WINDOW`. In-flight work is included as it happens —running tool
 * calls plus open, not-yet-assembled assistant steps —which is what makes the
 * card move while the model is working instead of only after a turn settles.
 *
 * @param settled - Conversation nodes (`useChat().legacy.nodes`).
 * @param runningCalls - Live tool calls (`useChat().legacy.runningCalls`).
 * @param timeline - Turn/step timeline (open steps have no node yet).
 * @param now - performance.now() at this collection pass.
 */
function deriveTrajectory(
  settled: ReadonlyArray<any>,
  runningCalls: ReadonlyArray<any>,
  timeline: any,
  now: number,
): TrajectoryBeat[] {
  const beats: Array<{ at: number; beat: TrajectoryBeat }> = []
  const push = (at: number | null, kind: TrajectoryBeat['kind'], ms: number): void => {
    beats.push({ at: at ?? 0, beat: { kind, ms: Math.max(0, ms) } })
  }
  for (const node of settled ?? []) {
    if (node?.kind === 'user' || node?.kind === 'steering') {
      // The input lane is instantaneous: the message's own arrival is the event.
      push(timelineTime(node.time), 'input', 0)
      continue
    }
    if (node?.kind === 'assistant') {
      const start = timelineTime(node.timing?.stepStartTime)
      const end = timelineTime(node.timing?.completedTime)
      push(start ?? timelineTime(node.time), 'model', start !== null && end !== null ? end - start : 0)
      continue
    }
    if (node?.kind === 'tool-result') {
      const start = timelineTime(node.callTime)
      const end = timelineTime(node.time)
      push(start ?? end, 'tool', start !== null && end !== null ? end - start : 0)
    }
  }
  for (const call of runningCalls ?? []) {
    const start = timelineTime(call?.time)
    if (start === null) continue
    push(start, 'tool', now - start)
  }
  if (timeline && typeof timeline.turns?.values === 'function') {
    for (const turn of timeline.turns.values()) {
      if (turn?.status !== 'open') continue
      for (const step of turn.steps ?? []) {
        if (step?.status !== 'open') continue
        const start = timelineTime(step.start?.time)
        if (start === null) continue
        // An assembled assistant node already carries this step (see the llmMs
        // accounting above) —counting both would double the beat.
        const assembled = (settled ?? []).some((n: any) =>
          n?.kind === 'assistant' && n.turn === step.turn && n.step === step.step && n.timing !== undefined)
        if (assembled) continue
        push(start, 'model', now - start)
      }
    }
  }
  beats.sort((a, b) => a.at - b.at)
  return beats.slice(-TRAJECTORY_WINDOW).map((entry) => entry.beat)
}

/** Fold assistant/tool-result nodes into the same window-scoped stats as the shipped StatsLine fallback. */
function deriveStats(nodes: ReadonlyArray<any>): Omit<Stats, 'usage'> {
  const turns = new Set<number>()
  let steps = 0
  let llmMs = 0
  let toolMs = 0
  for (const node of nodes ?? []) {
    if (node.kind === 'tool-result') {
      if (node.callTime !== null && node.callTime !== undefined) toolMs += Math.max(0, node.time - node.callTime)
      continue
    }
    if (node.kind !== 'assistant') continue
    turns.add(node.turn)
    steps += 1
    if (node.timing !== undefined && node.timing !== null && node.timing.stepStartTime !== null) {
      llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime)
    }
  }
  return { turns: turns.size, steps, llmMs, toolMs, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 }
}

/**
 * Client plugin body: restore persisted prefs, register the rail and settings
 * surfaces, and wire the live session stats + OpenCode usage into one bridge.
 * @param ctx - client root context (carries the injected `slots` service).
 */
export function apply(ctx: ClientContext): void {
  // i18n: prefer the official locale service (reads the active locale at call
  // time); fall back to the built-in dictionaries when it is absent. Locale
  // switches re-render every always-mounted surface via the bridge.
  ctx.effect(() => {
    const disposeLocale = installLocale(ctx.get('locale') as { bind?: (ns: string) => (key: string, params?: Record<string, unknown>) => string; subscribe?: (fn: () => void) => () => void } | undefined, WIDGET_LOCALES)
    const disposeListener = onLocaleChange(() => { emit() })
    return () => { disposeLocale(); disposeListener() }
  })
  // One-time boot cleanup of the fallback heatmap log: older builds wrote
  // fabricated "recovered history" constants into it (see loadHeatmapStore).
  // Independent of any active session/dock, so it runs the moment the bundle
  // loads —and it must never touch live-accumulated days.
  try { loadHeatmapStore() } catch { /* best-effort */ }
  let prefs = loadState()
  let state = { open: prefs.railOpen, hasSession: false, stats: null as Stats | null, usageData: null as UsageData | null, usageMulti: null as UsageMulti | null, commandCode: null as CommandCodeData | null, commandCodeError: null as string | null, usageDaily: null as Record<string, number> | null, sysinfo: null as SysInfo | null }

  const listeners = new Set<() => void>()
  /**
   * The bridge snapshot React renders from. Cached per emit because
   * `useSyncExternalStore` compares references: a fresh object per call would
   * re-render forever.
   */
  let bridgeSnapshot: BridgeSnapshot | null = null
  /**
   * The snapshot must be rebuilt inside `emit`, i.e. AFTER the state/`prefs`/
   * `railBudget` updates, so every subscriber (and every late subscriber) reads
   * the same values. `bridgeSnapshot` starts null instead of pre-built because
   * `railBudget` is declared further down: reading it here would throw (TDZ).
   */
  function emit(): void {
    bridgeSnapshot = { ...state, prefs: { ...prefs }, railBudget }
    for (const fn of listeners) fn()
  }
  function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
  function getBridgeSnapshot(): BridgeSnapshot {
    if (bridgeSnapshot === null) bridgeSnapshot = { ...state, prefs: { ...prefs }, railBudget }
    return bridgeSnapshot
  }
  function setState(patch: Partial<typeof state>): void { state = { ...state, ...patch }; emit() }
  function setPrefs(patch: Partial<Prefs>): void { prefs = { ...prefs, ...patch }; saveState(prefs); emit() }

  // ---- Boot sync with the authoritative host store. ----
  // localStorage is a fast per-origin cache; the host file (`/api/widgets-state`,
  // under the profile data dir) is ground truth. Whichever side holds the newer
  // savedAt wins, so ANY browser origin (localhost vs 127.0.0.1, a second
  // machine's browser, private mode) converges to the last saved configuration
  // the moment it loads instead of resetting to defaults.
  const syncWithHost = async (): Promise<void> => {
    try {
      const res = await fetch(STORE_API)
      if (!res.ok) return
      const data = (await res.json()) as { savedAt?: number; state?: Partial<Prefs> }
      const hostAt = Number.isFinite(Number(data.savedAt)) ? Number(data.savedAt ?? 0) : 0
      const hostState = data.state !== null && typeof data.state === 'object' ? data.state : null
      const localAt = loadSavedAt()
      if (hostState && hostAt > localAt) {
        // Host is newer (another origin/browser saved it) —adopt + mirror locally.
        prefs = normalizePrefs(hostState)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
          localStorage.setItem(SAVED_AT_KEY, String(hostAt))
        } catch { /* ignore */ }
        emit()
      } else if (hostAt < localAt && localAt > 0) {
        // Local is newer (host file absent/stale —e.g. first run after upgrade).
        try { await putState(prefs, localAt) } catch { /* best-effort */ }
      }
    } catch { /* host unavailable; stay on localStorage only */ }
  }
  /**
   * Bridge subscription for React entries.
   *
   * `useSyncExternalStore` (not `useState` + a subscribing effect) is what makes
   * a session hand-off reliable: a plain effect misses every emit that lands
   * between the entry's render and its effect flush, and the shell can mount a
   * NEW conversation's composer overlay slot in exactly that window while the
   * old session's dock unmounts —the fresh entry then kept a stale
   * `hasSession: true` snapshot, so the rail stayed painted (and kept capturing
   * pointer events) over the fresh-conversation page until a reload (measured
   * 2026-09-17, 5/5 runs). `useSyncExternalStore` re-reads the snapshot after
   * subscribing and re-renders when it changed, so that emit cannot be lost.
   */
  function useBridge(): BridgeSnapshot {
    return React.useSyncExternalStore(subscribe, getBridgeSnapshot, getBridgeSnapshot)
  }
  // Cross-tab + visibility re-sync, so "every change takes effect immediately"
  // also holds when the same DSH service is open in several tabs/windows:
  //  - `storage` events fire in OTHER tabs of the SAME origin when one saves —
  //    re-read + emit instead of waiting for a reload;
  //  - `visibilitychange` re-pulls the host store, so switching back to a tab
  //    whose origin differs (localhost vs 127.0.0.1) still converges to the
  //    last saved configuration.
  const onStorage = (e: StorageEvent): void => {
    if (e.key !== STORAGE_KEY && e.key !== SAVED_AT_KEY) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return
      prefs = normalizePrefs(JSON.parse(raw) as Partial<Prefs>)
      emit()
    } catch { /* malformed concurrent write; the next save wins */ }
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') void syncWithHost()
  }
  // Flush a pending host-store write the moment the page starts unloading,
  // so desktop shells that close the window shortly after an edit do not
  // lose it (the debounced PUT would be cancelled with the page).
  const onPageHide = (): void => flushPendingState()
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
  ctx.effect(() => () => {
    listeners.clear()
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
  })
  void syncWithHost()

  // Command execution for interactive action cards (e.g. one-click Compact).
  // Resolve the host @Remote command seam if present; cards degrade silently
  // when it is absent.
  const remote = ctx.get('remote') as { commands?: { execute?: (agent: unknown, line: string) => Promise<unknown> } } | undefined
  const runCommand = (line: string): void => {
    void (async () => {
      try {
        const exe = remote?.commands?.execute
        if (!exe) return
        await exe(undefined as unknown, line)
      } catch { /* best-effort: ignore failures on action cards */ }
    })()
  }

  // ---- Rail-top / composer-bottom measurement. ----
  let raf = 0
  /** Last measured official right-bar width (px); -1 = never measured. */
  let lastRightbarW = -1
  /** Timer that ends the track-sync window. */
  let syncTimer = 0
  let ro: ResizeObserver | null = null
  /**
   * Elements already handed to the ResizeObserver. The targets MUST be looked up
   * lazily: this plugin applies BEFORE the Web UI shell mounts its frame, so a
   * one-shot querySelector pass at apply time finds nothing and the observer ends
   * up watching zero nodes (verified 2026-09-13: 19 live ResizeObservers on the
   * page, none of them on [class$='_rightbarCol']). The rail's right offset then
   * only changed when some unrelated event happened to re-measure —which is why
   * the rail sat still for seconds while the right sidebar's grid track animated,
   * then jumped into place. Re-binding on every measure is idempotent (observing
   * an element twice is a no-op) and self-heals whenever the shell or the
   * conversation root is re-created.
   */
  const observedEls = new Set<Element>()
  /**
   * Cached handle for the official right-bar column —the single element the
   * hot path needs. The rail syncs at animation cadence while the shell eases
   * its right-bar grid track, so the per-frame path must not re-run four
   * `querySelector` probes nor force a layout with `getBoundingClientRect`:
   * the ResizeObserver entry that scheduled the frame already carries the new
   * content-box width. Measured 2026-09-17 (1578x846, long conversation): the
   * previous per-frame selector+rect pass cost 36ms per one-toggle animation
   * on top of the shell's own track re-layout.
   */
  let rightbarEl: Element | null = null
  /** Width (px) reported by the newest RO entry for {@link rightbarEl}; null = none. */
  let entryRightbarW: number | null = null
  /**
   * Minimum spacing between the VERTICAL anchor probes (`--dsx-rail-top`,
   * `--dsx-input-bottom`). Those two anchors only move with header / route /
   * composer layout, never with the horizontal grid track —yet the composer and
   * scroll body re-resize on every frame of a sidebar toggle (their content
   * reflows), so an unthrottled probe forces an extra full re-layout per frame
   * for values that are already correct (measured 2026-09-17: 111ms over 5
   * callbacks in one toggle). A trailing timer guarantees the final value lands.
   */
  const VERTICAL_PROBE_INTERVAL_MS = 250
  let lastVerticalProbeAt = 0
  let verticalTimer = 0
  /** One-shot publish of the settled right-bar width (anchor path only). */
  let settleTimer = 0
  /** Space the product's transcript measure leaves for the rail (px). */
  let railBudget = -1
  /**
   * Fingerprint of the geometry the drawer last rendered (see `spaceKey`): the
   * geometry gate in `updateRailBudget` compares against it, so a budget step
   * that leaves the deck's shape unchanged costs no React render.
   */
  let lastSpaceKey = ''
  /** The AppFrame whose track transition drives the yield beat. */
  let frameEl: Element | null = null
  /** The drawer wrapper, so the yield can be applied on the shell's own beat. */
  let drawerEl: HTMLDivElement | null = null
  /** Debounces the budget refresh until a track movement has settled. */
  let railBudgetTimer = 0
  /**
   * The right-bar track just changed width —the movement is in flight. Predict
   * the TARGET budget on every such tick: the first tick can be delivered before
   * the shell has written the target tracks for this gesture, so latching on it
   * would miss the whole movement (measured: the inline read the old `0px` on the
   * first tick and `710px` afterwards). `updateRailBudget` no-ops when the value
   * is unchanged, so repeated predictions are free.
   *
   * Triggered from the observer itself, not from the "horizontal only" fast path:
   * during a push the transcript scroller resizes in the same batch, so that path
   * is usually NOT taken and a prediction hung off it would never run.
   */
  function noteRightbarMoved(): void {
    const predicted = predictRailBudget()
    if (predicted !== null) updateRailBudget(predicted)
    scheduleBudgetRefresh()
  }
  /**
   * The shell's track transition is STARTING (AppFrame `transitionrun` for
   * `grid-template-columns`). This is the earliest possible beat —the observer's
   * first delivery trails it by ~100ms —so the rail's yield lands on the same
   * frame as the panel's first pixel of movement.
   */
  function onTrackTransitionRun(event: Event): void {
    if ((event as TransitionEvent).propertyName !== 'grid-template-columns') return
    const predicted = predictRailBudget()
    if (predicted !== null) updateRailBudget(predicted)
    scheduleBudgetRefresh()
  }
  /** Keep the transition listener bound to whatever frame the shell renders. */
  function bindFrameTransition(): void {
    const frame = document.querySelector('[class$="_frame"]')
    if (frame === frameEl) return
    frameEl?.removeEventListener('transitionrun', onTrackTransitionRun)
    frameEl = frame
    frameEl?.addEventListener('transitionrun', onTrackTransitionRun)
  }
  /**
   * Custom-property write that skips identical values.
   *
   * The live-width path calls this for many frames in a row with the SAME value
   * (the claim is the resolved layout's width, which only moves at a threshold);
   * an unconditional `setProperty` invalidates every dependent declaration, and
   * during a drag that means re-resolving the transcript's padding every frame
   * for no change. Measured 2026-09-18 (1578脳1000, long conversation): guarding
   * the writes cut the rail's drag cost at p99 from 62ms to ~30ms.
   */
  function setVar(name: string, value: string): void {
    const style = document.documentElement.style
    if (style.getPropertyValue(name) === value) return
    style.setProperty(name, value)
  }
  /**
   * Recompute how much room the rail may claim and, when the RESOLVED GEOMETRY
   * moved, re-render the drawer with it.
   *
   * Quantised to 8px and geometry-gated. The deck is a FLUID grid now (see
   * resolveRailLayout), so a budget step also moves the card side and the deck
   * would otherwise re-render once per pixel of pointer travel; the gate bounds
   * that to one commit per 8px of budget (≤px of card side at two columns,
   * ≤px at four), and the slots' own 0.2s top/right/width/height transition
   * turns those steps into one continuous glide.
   *
   * Cost, measured 2026-09-19 over one 216px handle drag at 1578脳1000 with the
   * same drag run rail-open and rail-closed (rAF deltas): p50 17ms in both, and
   * the rail adds single-digit janky frames over 33ms plus a couple of long
   * tasks on top of the shell's own per-frame reflow. Host load moves these
   * numbers by tens of percent between rounds, so treat them as an order of
   * magnitude, not an assertion.
   */
  function updateRailBudget(next = readRailBudget()): void {
    if (next === railBudget) return
    if (railBudget >= 0 && Math.abs(next - railBudget) < 8) return
    railBudget = next
    setVar('--dsx-rail-avail', `${next}px`)
    // Apply the yield to the DOM directly, not only through React: during the
    // track animation React's commit can land ~100ms late (the main thread is
    // busy re-laying out the columns), which is exactly the "panel first, rail
    // afterwards" beat we are removing. The next render writes the same values.
    const space = resolveRailSpace(prefs, next)
    setVar('--dsx-rail-w', `${space.claimW}px`)
    applyRailRight(space.swallowed)
    if (drawerEl !== null) {
      const opacity = space.hidden ? '0' : '1'
      if (drawerEl.style.opacity !== opacity) drawerEl.style.opacity = opacity
      if (space.yielded) drawerEl.setAttribute('data-yielded', '')
      else drawerEl.removeAttribute('data-yielded')
    }
    const key = spaceKey(space)
    if (key === lastSpaceKey) return
    lastSpaceKey = key
    emit()
  }
  /** Everything a render turns into pixels (see the geometry gate above). */
  function spaceKey(space: RailSpace): string {
    return [space.columns, space.side, space.drawW, space.claimW,
      space.hidden ? 1 : 0, space.yielded ? 1 : 0, space.swallowed ? 1 : 0,
      Math.round(space.shiftX)].join(':')
  }
  /**
   * Official transcript measure the budget is derived from, watched per frame
   * while the user drags a width handle.
   *
   * The product writes `--dsh-chat-user-width` on the conversation root every
   * frame of a handle drag, which changes only the PROSE column's width —none of
   * the boxes this plugin observes (scroll body, header, composer seat) resize,
   * so a drag used to reach the rail only through the 240ms settle debounce and
   * land as one jump after the pointer stopped (reported 2026-09-18: "拖宽时组件
   * 区域变化很卡顿). The handle carries `data-dragging` for exactly the drag's
   * lifetime, so the watcher costs nothing when idle.
   */
  let lastSeenMeasure = -1
  let widthWatchRaf = 0
  let widthWatching = false
  /**
   * Column track width latched when a handle drag STARTS.
   *
   * A conversation-width drag moves the transcript MEASURE, not the column, so
   * the column width cannot change mid-drag —re-deriving it every frame would
   * only buy a forced style resolution plus a layout read on the frames that
   * must stay light. Reset when the drag ends, so a resize/sidebar change is
   * picked up again by the normal path.
   */
  let dragColumnW = 0
  function readMeasure(): number {
    const host = document.querySelector('[data-phase]')
    if (host === null) return -1
    // The handle writes `--dsh-chat-user-width` INLINE on this element on every
    // frame of a drag. Reading the inline style costs no style resolution, while
    // a getComputedStyle read here would force one early on every frame, on top
    // of the drag's own layout work (measured 2026-09-18: the computed-style read
    // was ~1/3 of the rail's per-frame drag cost).
    const inline = Number.parseFloat(host.style.getPropertyValue('--dsh-chat-user-width'))
    const value = Number.isFinite(inline) && inline > 0
      ? inline
      : Number.parseFloat(getComputedStyle(host).getPropertyValue('--dsh-chat-content-width'))
    return Number.isFinite(value) && value > 0 ? Math.round(value) : -1
  }
  function refreshBudgetForWidth(): void {
    const measure = readMeasure()
    if (measure < 0 || measure === lastSeenMeasure) return
    lastSeenMeasure = measure
    // Derive the budget straight from the measure just read. `readRailBudget()`
    // would re-read the same number through getComputedStyle and re-measure the
    // column with a getBoundingClientRect, i.e. a style resolution and a forced
    // layout per frame for values already in hand.
    const column = dragColumnW > 0 ? dragColumnW : readColumnWidth()
    if (!(column > 0)) return
    updateRailBudget(Math.max(0, Math.round(column - measure - RAIL_BOX_INSET)))
  }
  function watchWidth(): void {
    if (widthWatchRaf !== 0) return
    dragColumnW = readColumnWidth()
    // The transcript must follow the handle with NO tween while it is held (the
    // rail's own claim is written per frame too): a 0.3s padding-right
    // transition would spend the whole drag chasing a target that keeps moving,
    // which is the "the widget area still lags behind the conversation" report.
    document.documentElement.classList.add('dsx-live-width')
    const tick = (): void => {
      refreshBudgetForWidth()
      // Re-evaluate the drag state EVERY frame. The shell's `data-dragging` is
      // written and cleared by React around the gesture, so at pointerup the
      // attribute can still be present for a frame —and this loop only ever
      // checked it from pointer handlers, which meant a pointerup that raced the
      // attribute left `widthWatching` true FOREVER: an endless rAF loop plus a
      // permanently disabled transcript transition (measured 2026-09-19: the
      // class was still on documentElement after the drag settled).
      syncWidthWatching()
      if (widthWatching) widthWatchRaf = requestAnimationFrame(tick)
      else {
        widthWatchRaf = 0
        dragColumnW = 0
        document.documentElement.classList.remove('dsx-live-width')
        // Final exact read once the drag released: the last frame's value can be
        // one beat behind the pointer-up commit.
        refreshBudgetForWidth()
        scheduleBudgetRefresh()
      }
    }
    widthWatchRaf = requestAnimationFrame(tick)
  }
  // Pointer capture keeps the events on the handle, so the shell renders the
  // drag's state on the handle itself. `pointerdown` is handled in the CAPTURE
  // phase, i.e. BEFORE React's own handler has run, so at that moment
  // `[data-width-handle][data-dragging]` does not exist yet —latching on the
  // attribute alone silently missed the whole gesture (measured 2026-09-19:
  // dragging the right handle moved `--dsh-chat-user-width` 748−40 with the
  // rail frozen at a 476px budget, then one 584px jump 270ms later when the
  // settle debounce finally fired). Arm from the event TARGET instead.
  //
  // The HELD-BUTTON bit is what bounds the watch: `dragging` requires the button
  // to still be down, so a missed or racing attribute can never leave the loop
  // running.
  let widthHandleArmed = false
  let pointerHeld = false
  function syncWidthWatching(): void {
    const attr = document.querySelector('[data-width-handle][data-dragging]') !== null
    const dragging = pointerHeld && (widthHandleArmed || attr)
    if (dragging === widthWatching) return
    widthWatching = dragging
    if (dragging) watchWidth()
  }
  const onAnyPointerDown = (e: PointerEvent): void => {
    const target = e.target as Element | null
    pointerHeld = true
    widthHandleArmed = target !== null && typeof target.closest === 'function' && target.closest('[data-width-handle]') !== null
    syncWidthWatching()
  }
  const onAnyPointerUp = (): void => { pointerHeld = false; widthHandleArmed = false; syncWidthWatching() }
  const onWindowBlur = (): void => { pointerHeld = false; widthHandleArmed = false; syncWidthWatching() }
  /** Refresh the budget once the right-bar track has stopped moving. */
  function scheduleBudgetRefresh(): void {
    if (railBudgetTimer !== 0) window.clearTimeout(railBudgetTimer)
    railBudgetTimer = window.setTimeout(() => {
      railBudgetTimer = 0
      updateRailBudget()
      // One verification pass: a single read can land while the shell is still
      // publishing the settled column, which would freeze the rail at whatever
      // the mid-flight value implied (never collapses the window, just a
      // second look once everything has settled).
      railBudgetTimer = window.setTimeout(() => {
        railBudgetTimer = 0
        updateRailBudget()
      }, 520)
    }, 240)
  }
  /**
   * Freeze the rail's OWN `transition: right` (fallback path only) for the
   * duration of a track movement; the class expires 160ms after the last tick.
   */
  function armSyncFreeze(): void {
    document.documentElement.classList.add('dsx-syncing')
    if (syncTimer !== 0) window.clearTimeout(syncTimer)
    syncTimer = window.setTimeout(() => {
      syncTimer = 0
      document.documentElement.classList.remove('dsx-syncing')
    }, 160)
  }
  function observeMeasured(): void {
    if (!ro) return
    bindFrameTransition()
    for (const sel of ['[data-conversation-scroll]', '[data-slot="conversation.session.header"]', '[data-composer-seat]', '[class$="_rightbarCol"]']) {
      const el = document.querySelector(sel)
      if (el && !observedEls.has(el)) {
        observedEls.add(el)
        ro.observe(el)
      }
    }
    const rightbar = document.querySelector('[class$="_rightbarCol"]')
    if (rightbar !== null && rightbar !== rightbarEl) {
      rightbarEl = rightbar
      entryRightbarW = null
    }
  }
  function measureRailTop(widthHint?: number, horizontalOnly = false): void {
    // Re-bind only when the shell swapped the measured nodes out (self-heal);
    // the steady-state sync never pays for a query.
    if (rightbarEl === null || !rightbarEl.isConnected) observeMeasured()
    // Official right bar (DSH 0.1.5): the frame owns a third grid column
    // ([class$='_rightbarCol'], occupied by dsh-client-ui-sidebar-right). The
    // rail must stop at that column's LEFT edge instead of the viewport edge,
    // or it paints straight over the panel (measured 2026-09-13: with the
    // panel open the rail sat on top of it). Older installs published
    // --dsh-sidebar-width from dsh-better-sidebar instead; the rail's right
    // offset falls back to that variable when this one is absent, so both
    // layouts work.
    const rightbarW = widthHint ?? entryRightbarW ?? (rightbarEl !== null ? Math.round(rightbarEl.getBoundingClientRect().width) : 0)
    if (horizontalOnly) {
      // The observer reported the right-bar column only: the vertical anchors
      // cannot have moved, so skip the header/composer probes entirely (each
      // one forces a re-layout while the shell eases its grid track).
      scheduleBudgetRefresh()
      if (ANCHOR_FOLLOW) {
        // The rail rides the shell's own layout pass (CSS anchor positioning),
        // so nothing has to be published per frame. Publish the settled width
        // once so any non-anchor consumer still reads a current value.
        lastRightbarW = rightbarW
        if (settleTimer !== 0) window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(() => {
          settleTimer = 0
          document.documentElement.style.setProperty('--dsx-rightbar-w', `${lastRightbarW}px`)
        }, 200)
        return
      }
      // Fallback path: the rail consumes --dsx-rightbar-w, and its own
      // transition must stay frozen for the whole movement, otherwise every
      // per-frame write restarts a fresh 0.3s tween and the rail trails the
      // panel by seconds (reported 2026-09-13). Re-arm on EVERY horizontal
      // tick, not only when the rounded width changes: a stalled frame must
      // not expire the freeze while the track is still moving.
      armSyncFreeze()
      document.documentElement.style.setProperty('--dsx-rightbar-w', `${rightbarW}px`)
      lastRightbarW = rightbarW
      return
    }
    if (rightbarW !== lastRightbarW) {
      lastRightbarW = rightbarW
      if (!ANCHOR_FOLLOW) {
        // See armSyncFreeze: freeze the rail's own tween for the duration of
        // the track movement so `right` lands on the measured value every
        // frame instead of chasing it.
        armSyncFreeze()
        document.documentElement.style.setProperty('--dsx-rightbar-w', `${rightbarW}px`)
      }
      // While the track moves, only the width matters; skip the heavier header
      // and composer probes so the transition keeps the main thread.
      return
    }
    lastRightbarW = rightbarW
    document.documentElement.style.setProperty('--dsx-rightbar-w', `${rightbarW}px`)
    // Throttled vertical probes (see VERTICAL_PROBE_INTERVAL_MS): the rail top
    // and the composer gap cannot move with a horizontal track change, so a
    // burst of composer/scroll resizes must not buy a forced re-layout each.
    const now = performance.now()
    if (now - lastVerticalProbeAt < VERTICAL_PROBE_INTERVAL_MS) {
      if (verticalTimer === 0) {
        verticalTimer = window.setTimeout(() => {
          verticalTimer = 0
          measureRailTop(entryRightbarW ?? undefined)
        }, VERTICAL_PROBE_INTERVAL_MS)
      }
      return
    }
    lastVerticalProbeAt = now
    // Resize / settle path: refresh the rail's space budget through the same
    // debounce (a direct read here can land mid-animation and freeze the value).
    scheduleBudgetRefresh()
    const el = document.querySelector('[data-conversation-scroll]')
    const top = el ? el.getBoundingClientRect().top : 0
    // 12px breathing gap below the session header; the rail AND the magnify
    // overlay share this variable so both stay aligned.
    document.documentElement.style.setProperty('--dsx-rail-top', `${top + 12}px`)
    // Composer bottom gap: one "breathing" band under everything in the input
    // column —the composer dock stats bar (`.FJxK*_root` inside
    // `conversation.composer.dock`) plus its own bottom padding —so a fixed
    // overlay can sit flush below it. Prefer the dock (the lowest visible row);
    // then the composer seat; then the scroll body as a last resort.
    const dock = document.querySelector('[data-slot="conversation.composer.dock"]')
    const comp = (dock && dock.getBoundingClientRect().height > 0 && dock.getBoundingClientRect().bottom > 0)
      ? dock
      : (document.querySelector('[data-composer-seat]') || document.querySelector('[data-conversation-composer-overlay]') || el)
    const gap = comp ? Math.max(0, window.innerHeight - comp.getBoundingClientRect().bottom) : 0
    document.documentElement.style.setProperty('--dsx-input-bottom', `${gap}px`)
  }
  /** Pending observer hint: the reported right-bar width and whether the
   *  trigger was the right-bar column alone (horizontal-only, no vertical work). */
  let pendingHint: { width?: number; horizontalOnly: boolean } = { horizontalOnly: false }
  const scheduleMeasure = (widthHint?: number, horizontalOnly = false): void => {
    // Guarded: this function is also a store subscriber, so only a real number
    // may be adopted as the observer-reported width.
    if (typeof widthHint === 'number' && Number.isFinite(widthHint)) entryRightbarW = widthHint
    pendingHint = { width: entryRightbarW ?? undefined, horizontalOnly: horizontalOnly || pendingHint.horizontalOnly }
    if (raf !== 0) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const hint = pendingHint
      pendingHint = { horizontalOnly: false }
      measureRailTop(hint.width, hint.horizontalOnly)
    })
  }
  /** `resize` listener: passes its event, which must never reach the width hint. */
  const onViewportResize = (): void => { scheduleMeasure() }
  ctx.effect(() => {
    updateRailBudget()
    measureRailTop()
    lastSeenMeasure = readMeasure()
    window.addEventListener('resize', onViewportResize)
    // Width-handle drag watcher (see watchWidth): pointer events alone are not
    // enough —the handle captures the pointer, so a pointerup can land on the
    // handle itself; the product's own `data-dragging` attribute is the truth.
    document.addEventListener('pointerdown', onAnyPointerDown, true)
    document.addEventListener('pointerup', onAnyPointerUp, true)
    document.addEventListener('pointercancel', onAnyPointerUp, true)
    window.addEventListener('blur', onWindowBlur)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        // Only the right bar's width is needed per frame; the RO entry's
        // content box already has it, so no rect read is required here. When
        // the right-bar column is the ONLY thing that resized (the shell's grid
        // track easing), the vertical anchors are untouched and the frame must
        // not pay for their probes.
        let width: number | undefined
        let vertical = false
        for (const entry of entries) {
          if (entry.target === rightbarEl || String((entry.target as Element).className ?? '').endsWith('_rightbarCol')) {
            width = Math.round(entry.contentRect.width)
          } else {
            vertical = true
          }
        }
        if (width !== undefined && width !== lastRightbarW) noteRightbarMoved()
        scheduleMeasure(width, width !== undefined && !vertical)
      })
      // Bind to whatever the shell currently has; the lazy re-bind inside
      // measureRailTop picks up the live nodes once the shell mounts them.
      observeMeasured()
    }
    const sub = subscribe(scheduleMeasure)
    return () => {
      window.removeEventListener('resize', onViewportResize)
      document.removeEventListener('pointerdown', onAnyPointerDown, true)
      document.removeEventListener('pointerup', onAnyPointerUp, true)
      document.removeEventListener('pointercancel', onAnyPointerUp, true)
      window.removeEventListener('blur', onWindowBlur)
      pointerHeld = false
      widthHandleArmed = false
      widthWatching = false
      if (widthWatchRaf !== 0) { cancelAnimationFrame(widthWatchRaf); widthWatchRaf = 0 }
      lastSeenMeasure = -1
      lastSpaceKey = ''
      if (ro) ro.disconnect()
      sub()
      if (syncTimer !== 0) window.clearTimeout(syncTimer)
      if (verticalTimer !== 0) window.clearTimeout(verticalTimer)
      if (settleTimer !== 0) window.clearTimeout(settleTimer)
      if (railBudgetTimer !== 0) window.clearTimeout(railBudgetTimer)
      frameEl?.removeEventListener('transitionrun', onTrackTransitionRun)
      frameEl = null
      document.documentElement.style.removeProperty('--dsx-rail-avail')
      document.documentElement.classList.remove('dsx-syncing')
      document.documentElement.classList.remove('dsx-live-width')
      document.documentElement.style.removeProperty('--dsx-rail-top')
      document.documentElement.style.removeProperty('--dsx-input-bottom')
      document.documentElement.style.removeProperty('--dsx-rightbar-w')
    }
  })

  // ---- Header capsule toggle. ----
  // Placement in this list slot is decided by `order` alone: the slot core sorts
  // a list slot by (priority, order) and falls back to registration sequence
  // only on a tie. dsh-better-sidebar registers its bottom-panel toggle at
  // order 10, so sharing 10 tied the two entries and the capsule's place
  // followed whichever fiber re-registered last —a reload of this bundle
  // (tsdown/HMR, market toggle) pushed 缁勪欢 past the toggle to the row's right
  // end. 5 keeps it right of the official export control (order 0) and
  // open-in-app (order -10), and left of that toggle, independent of load order.
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
    { name: 'conversation.session.header.utilities', id: 'widgets-panel-toggle', order: 5 },
    () => {
      const snap = useBridge()
      // The rail yields when the product's transcript measure leaves no margin
      // (see resolveRailLayout). Reflect that on the control instead of leaving
      // a dead toggle: a button that can never show anything is disabled, not
      // pressed-but-empty.
      const unavailable = snap.hasSession && resolveRailLayout(snap.prefs, railBudget, readMinCardSide(snap.prefs.panelPadding), readMaxCardSide(snap.prefs.panelPadding, snap.prefs.cardSide)).constrained
      const toggle = (): void => {
        if (unavailable) return
        const next = !snap.open
        setState({ open: next })
        setPrefs({ railOpen: next })
      }
      return React.createElement('button', {
        type: 'button',
        className: 'dsx-stats-capsule',
        'aria-pressed': unavailable ? false : snap.open,
        'aria-disabled': unavailable || undefined,
        'data-space': unavailable ? 'tight' : undefined,
        onClick: toggle,
      }, React.createElement('span', null, t('ui.capsule')))
    },
  ))

  // ---- Data collector (session stats + OpenCode usage). ----
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'widgets-panel-collector', order: 9999 },
    ({ useSession, useProjection, useChat }: any) => {
      // DSH 0.1.5 split the session snapshot: chat data (nodes, timeline and
      // running tool calls) moved to the new `useChat` hook while `useSession`
      // now carries lifecycle state only. Read whichever half the running build
      // provides —the selectors are optional-chained so a slice that no longer
      // exists resolves to undefined instead of throwing inside the selector,
      // which the slot renderer would answer by abdicating this entry (taking
      // the whole collector, and therefore every card's data, with it).
      const settled = (useChat
        ? useChat((c: any) => c.legacy?.nodes)
        : useSession((s: any) => s.chat?.legacy?.nodes)) ?? []
      const timeline = (useChat
        ? useChat((c: any) => c.timeline)
        : useSession((s: any) => s.chat?.timeline)) ?? undefined
      const runningCalls = (useChat
        ? useChat((c: any) => c.legacy?.runningCalls)
        : useSession((s: any) => s.runningCalls)) ?? []
      const running = useSession ? useSession((s: any) => s.running) : false
      const projected = useProjection ? useProjection('sessionStats') : undefined
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const contextPres = useProjection ? useProjection('contextPressure') : undefined
      const contextBrk = useProjection ? useProjection('contextBreakdown') : undefined
      const todosProj = useProjection ? useProjection('todos') : undefined
      // Bridge subscription: the sysinfo poll cadence depends on per-instance
      // refresh-interval config, so this collector re-renders on prefs changes
      // (emit) exactly like the capsule/rail bridges do.
      const snap = useBridge()
      // Heatmap FALLBACK accounting: kept for installs without dsh-usage-center.
      // Per-step crediting (v2) credits each assistant step once by its own start
      // time, with a cumulative-anchor fallback (v1) when nodes lack `usage`.
      // Persisted across mounts; skipped entirely whenever the authoritative
      // host map (`snap.usageDaily`) is present.
      const heatmapRef = React.useRef<Record<string, number>>(loadHeatmapStore())
      const anchorRef = React.useRef<number>(loadHeatmapAnchor())
      const [heatmap, setHeatmap] = React.useState<Record<string, number>>(heatmapRef.current)
      // Presence signal: this dock slot renders only while an active session is
      // mounted (the shell drops it on the Hero/no-session state), so mount/
      // unmount is exactly "an active session exists". The rail and the body
      // padding shift key off this so they never linger on a fresh-session page.
      React.useEffect(() => {
        setState({ hasSession: true })
        return () => { setState({ hasSession: false }) }
      }, [])
      // OpenCode usage is account-wide but changes with every finished turn
      // (each conversation draws from the same pool), so the collector pulls it
      // on mount AND whenever a turn settles (`running` flips true −false).
      // The `conversation.composer.dock` component is reused across sessions, so
      // a mount-only fetch leaves the quota stale until a reload/new session.
      const prevRunningRef = React.useRef(running)
      React.useEffect(() => {
        const refresh = (): void => {
          fetch('/api/opencode-usage')
          .then((r) => r.json())
          .then((data: UsageData) => setState({ usageData: data }))
          .catch(() => { /* keep last known usage */ })
        // Multi-key pool usage (primary key + pooled backup keys).
        fetch('/api/opencode-usage-multi')
          .then((r) => r.json())
          .then((data: UsageMulti) => setState({ usageMulti: data }))
          .catch(() => { /* pool endpoint optional: cards fall back to single-key */ })
        // Command Code account usage (whoami / summary / credits / plan).
        // Error-aware: a 404 host route (dsh web not restarted) vs a 503 missing-key
        // vs a network failure each produce a stable code the widgets render as
        // an accurate hint −the key itself is auto-read host-side (env −
        // .credentials.yaml −.env), never user-entered in this UI.
        fetch('/api/commandcode-usage')
          .then(async (r) => {
            const data = (await r.json().catch(() => null)) as CommandCodeData | { error?: string } | null
            if (!r.ok) {
              const error = (data as { error?: string } | null)?.error
              if (r.status === 404) setState({ commandCode: null, commandCodeError: 'unloaded' })
              else if (r.status === 503) setState({ commandCode: null, commandCodeError: 'unconfigured' })
              else setState({ commandCode: null, commandCodeError: error ? `http:${r.status}:${error}` : `http:${r.status}` })
              return
            }
            setState({ commandCode: data as CommandCodeData, commandCodeError: null })
          })
          .catch(() => setState({ commandCode: null, commandCodeError: 'unavailable' }))
        // Authoritative per-day token totals for the heatmap cards. The host
        // route re-serves dsh-usage-center's log-folded days when that plugin is
        // installed; `available: false` (missing service, empty index, dsh web
        // not restarted) simply leaves the cards on their own live accounting.
        // `refresh=1` (this path runs when a turn SETTLES) makes the host fold
        // the logs immediately instead of waiting for usage-center's next ~30 s
        // pass, so the day's figure moves with the turn that just finished.
        fetch('/api/widgets-usage-daily?refresh=1')
          .then(async (r) => (r.ok ? await r.json().catch(() => null) : null))
          .then((data: { available?: boolean; daily?: Record<string, number> } | null) => {
            const daily = data?.available === true && data.daily !== null && data.daily !== undefined ? data.daily : null
            setState({ usageDaily: daily })
          })
          .catch(() => { /* keep the last authoritative map (or the fallback) */ })
        }
        // Pull on mount (both false −first render); afterwards only a
        // completed turn (true −false) refetches, an in-flight turn does not.
        if (running === prevRunningRef.current) refresh()
        else if (!running) refresh()
        prevRunningRef.current = running
      }, [running])
      // The authoritative day map needs a slow poll of its own: usage-center
      // rescans every ~30 s, so a long idle page would otherwise show a frozen
      // "today" cell. One tiny same-origin JSON per minute; a missing service or
      // an unrestarted host simply keeps answering `available: false`.
      React.useEffect(() => {
        const pull = (): void => {
          fetch('/api/widgets-usage-daily')
            .then(async (r) => (r.ok ? await r.json().catch(() => null) : null))
            .then((data: { available?: boolean; daily?: Record<string, number> } | null) => {
              const daily = data?.available === true && data.daily !== null && data.daily !== undefined ? data.daily : null
              setState({ usageDaily: daily })
            })
            .catch(() => { /* keep the last authoritative map (or the fallback) */ })
        }
        const id = window.setInterval(pull, 60_000)
        // Immediate pull too: the mount-time fetch above can land before
        // usage-center has finished its first scan, and this converges the card
        // within seconds instead of waiting for the next turn.
        pull()
        return () => window.clearInterval(id)
      }, [])
      // Hardware snapshot (System widgets): the installed sys-* instances drive
      // ONE shared poll loop —the effective cadence is the SHORTEST refresh
      // interval among them (5/10/30/60 s presets + custom numeric, clamped
      // 5..60, default 10). The host route caches ~1s, so every widget sharing
      // the same tick still triggers a single nvidia-smi spawn.
      React.useEffect(() => {
        const sysKeys = (snap.prefs.installed ?? []).filter((key) => SYS_WIDGET_IDS.some((id) => key === id || key.startsWith(id + '@')))
        const secs = sysKeys.length === 0 ? 0 : Math.min(...sysKeys.map((key) => resolveInterval(snap.prefs.cardConfigs?.[key])))
        if (!(secs > 0)) return
        const refresh = (): void => {
          fetch('/api/sysinfo')
          .then((r) => r.json())
          .then((data: SysInfo) => { setState({ sysinfo: data }); ingestSysInfo(data) })
          .catch(() => { /* keep last known snapshot */ })
        }
        refresh()
        const id = window.setInterval(refresh, secs * 1000)
        return () => window.clearInterval(id)
      }, [snap.prefs.installed, snap.prefs.cardConfigs])
      // One-second tick while a turn is running, so the in-flight LLM and tool
      // durations advance between settle boundaries instead of freezing.
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        if (!running) return
        setNow(Date.now())
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
      }, [running])
      // Time-sensitive cards (e.g. peak-pricing windows) must re-read
      // the clock even with no turn running: a 30s tick rebuilds stats so the
      // window check stays fresh across a peak/off-peak boundary.
      React.useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 30000)
        return () => window.clearInterval(id)
      }, [])
      React.useEffect(() => {
        const p = projected
        const folded = p && p.steps !== undefined ? p : deriveStats(settled)
        let inputTokens = 0
        let cacheRead = 0
        let outputTokens = 0
        if (usage) {
          inputTokens = (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0)
          cacheRead = usage.cacheReadTokens || 0
          outputTokens = usage.outputTokens || 0
        }
        // Heatmap day data. AUTHORITATIVE first: when the host route served
        // dsh-usage-center's log-folded per-day totals, the cards render exactly
        // those numbers and this browser's own accounting is skipped entirely
        // (it can only ever agree by accident —it credits steps only while a
        // page is open, and older builds seeded fabricated days into it).
        // The two-layer local accounting below is the STANDALONE fallback:
        //  (a) per-step (v2): if settled assistant nodes carry `usage`, credit
        //      each step ONCE to the day its `stepStartTime` began —exact
        //      per-conversation attribution, immune to cross-midnight sessions,
        //      session switches, remounts, compaction.
        //  (b) anchor fallback (v1): if nodes lack `usage` (host did not
        //      project it into the folded surface), fall back to diffing the
        //      cumulative `tokenUsage` projection against an anchor that is
        //      rebuilt ONLY on a cumulative RESET (new session) —never on a
        //      bare "new day" —so continuing a session across midnight still
        //      credits only the newly observed growth to today.
        const authoritative = snap.usageDaily
        const heatTz = (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ
        // Heatmap timezone: per-card config (default Beijing UTC+8), 'local' =
        // browser clock. Every day attribution below uses it.
        //
        // The per-step accounting runs in BOTH modes. Without usage-center it IS
        // the day map; WITH it, it keeps TODAY live: the indexer folds the session
        // logs on a ~30 s cadence, so between two scans the authoritative map
        // still shows the PREVIOUS turn and the card would look frozen while
        // every settled step is already measurable right here.
        {
          const seenState = loadSeen()
          let dirty = false
          let nodeUsageOk = false
          const isStartF = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
          for (const node of settled ?? []) {
            if (node?.kind !== 'assistant') continue
            if (node?.usage == null) continue
            nodeUsageOk = true
            const start = node.timing?.stepStartTime
            const nodeUsage = node.usage
            if (start == null) continue
            const total = (isStartF(nodeUsage.uncachedInputTokens) ? nodeUsage.uncachedInputTokens : 0)
              + (isStartF(nodeUsage.cacheReadTokens) ? nodeUsage.cacheReadTokens : 0)
              + (isStartF(nodeUsage.cacheWriteTokens) ? nodeUsage.cacheWriteTokens : 0)
              + (isStartF(nodeUsage.outputTokens) ? nodeUsage.outputTokens : 0)
            if (total <= 0) continue
            const key = `${node.turn ?? '?'}:${node.step ?? '?'}:${start}`
            if (seenState.keys.has(key)) continue
            seenState.keys.add(key)
            if (start > seenState.strongest) seenState.strongest = start
            const day = dateKey(new Date(start), heatTz)
            heatmapRef.current = accumulateHeatmap(heatmapRef.current, day, total)
            dirty = true
          }
          if (dirty) {
            saveSeen(seenState.keys, seenState.strongest)
            // The React state copy exists for the STANDALONE path only; with
            // usage-center the merge below reads the ref directly.
            if (authoritative === null || authoritative === undefined) setHeatmap(heatmapRef.current)
          }
          // (b) anchor fallback —only when per-step nodes carried no usage AND
          // no authoritative map exists to supersede it.
          // Anchor discipline (the cross-day over-credit fix):
          //   * while per-step crediting is active, keep the anchor parked at the
          //     observed cumulative —a later fallback takeover then diffs only
          //     what per-step did NOT already credit (never the whole history);
          //   * the fallback credits growth ONLY when the active session shows a
          //     step that actually began today (todayActivity). Without it, an
          //     anchor that lags the cumulative (page reopened on yesterday's
          //     session, projection lag right after a new-session switch) would
          //     diff the entire prior-day total into today's cell.
          const current = usage ? inputTokens + outputTokens : 0
          if (nodeUsageOk && usage && current > anchorRef.current) {
            anchorRef.current = current
            saveHeatmapAnchor(current)
          }
          if ((authoritative === null || authoritative === undefined) && !nodeUsageOk && usage) {
            const todayKey = dateKey(new Date(), heatTz)
            const todayActivity = (settled ?? []).some((n: any) =>
              n?.kind === 'assistant' && n?.timing?.stepStartTime != null && dateKey(new Date(n.timing.stepStartTime), heatTz) === todayKey)
            if (current < anchorRef.current) {
              // cumulative reset (new session / log rebuild): re-anchor, no credit
              anchorRef.current = current
              saveHeatmapAnchor(current)
            } else if (todayActivity) {
              const delta = current - anchorRef.current
              anchorRef.current = current
              saveHeatmapAnchor(current)
              heatmapRef.current = accumulateHeatmap(heatmapRef.current, todayKey, delta)
              setHeatmap(heatmapRef.current)
            } else if (current > anchorRef.current) {
              // history only (no step began today yet): park the anchor at the
              // cumulative without crediting, so it can never be diffed later.
              anchorRef.current = current
              saveHeatmapAnchor(current)
            }
          }
        }
        /** The day map the cards render: authoritative, with TODAY topped up by
         *  the live per-step counter (see `mergeToday`) so a finished turn shows
         *  up at once instead of waiting for usage-center's next scan. */
        const heatmapDays = mergeToday(authoritative, heatmapRef.current, dateKey(new Date(), heatTz))
        // Live in-flight elapsed, added to the settled whole-log figures.
        let llmMs = folded.llmMs
        let toolMs = folded.toolMs
        if (timeline) {
          for (const turn of timeline.turns.values()) {
            if (turn.status !== 'open') continue
            for (const step of turn.steps) {
              if (step.status !== 'open' || step.start === undefined) continue
              const assembled = settled.some((n: any) => n.kind === 'assistant' && n.turn === step.turn && n.step === step.step && n.timing !== undefined)
              if (!assembled) llmMs += Math.max(0, now - step.start.time)
            }
          }
        }
        for (const call of runningCalls) {
          toolMs += Math.max(0, now - call.time)
        }
        // contextPressure projection is { contextWindow?, pressureTokens?, projectedTokens? }.
        // Ratio = projectedTokens / contextWindow.
        let contextPercent: number | null = null
        let contextWindow: number | null = null
        let contextTokens: number | null = null
        if (contextPres && typeof contextPres === 'object') {
          if (typeof contextPres.contextWindow === 'number' && contextPres.contextWindow > 0) contextWindow = contextPres.contextWindow
          if (typeof contextPres.projectedTokens === 'number') {
            contextTokens = contextPres.projectedTokens
            if (contextWindow) contextPercent = Math.min(1, Math.max(0, contextPres.projectedTokens / contextWindow))
          }
        }
        let contextBreakdown: Stats['contextBreakdown'] = null
        if (contextBrk && typeof contextBrk === 'object') {
          contextBreakdown = {
            systemTokens: (contextBrk as unknown as Record<string, unknown>).systemTokens as number | undefined ?? 0,
            toolsTokens: (contextBrk as unknown as Record<string, unknown>).toolsTokens as number | undefined ?? 0,
            messageTokens: (contextBrk as unknown as Record<string, unknown>).messageTokens as number | undefined ?? 0,
          }
        }
        const stats: Stats = {
          turns: folded.turns, steps: folded.steps,
          llmMs, toolMs,
          ttftMs: folded.ttftMs, ttftSteps: folded.ttftSteps,
          decodeMs: folded.decodeMs, decodeTokens: folded.decodeTokens,
          usage: { inputTokens, cacheReadTokens: cacheRead, outputTokens },
          contextPercent, contextWindow, contextTokens, contextBreakdown,
          todos: Array.isArray(todosProj) && todosProj.length >= 0 ? todosProj as Stats['todos'] : null,
          heatmapGrid: buildHeatmapGrid(heatmapDays, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', heatTz),
          heatmapRaw: { ...heatmapDays },
          trajectory: deriveTrajectory(settled, runningCalls, timeline, now),
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, timeline, runningCalls, now, snap.usageDaily, prefs.cardConfigs?.heatmap?.monthMode, prefs.cardConfigs?.heatmap?.timeZone])
      return null
    },
  ))

  // ---- Right rail panel. ----
  // Hosted inside the CONVERSATION, not in `shell.overlay`. Two reasons:
  //  1. paint order: everything in `shell.overlay` (z-20) paints ABOVE the right
  //     column's panel (z-10) —a rail there can never be covered by a panel;
  //  2. semantics: the rail is a conversation-scoped utility strip (it tracks the
  //     conversation column's edge), so the conversation's floating-overlay seat
  //     —"floating entries rendered inside the resident composer card" —is its
  //     natural home. Measured 2026-09-17: a fixed layer in any conversation slot
  //     paints below the panel, in `shell.overlay` above it.
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register(
    { name: 'conversation.input.overlay', id: 'widgets-panel', order: 1000 },
    () => {
      const snap = useBridge()
      // Hooks MUST be declared unconditionally, before the early return, or the
      // hook count changes when `open`/`hasSession` flip (React error #310).
      const [addOpen, setAddOpen] = React.useState(false)
      // Action-cards: an armed action id waits for a second click before firing,
      // so destructive/expensive actions (e.g. Compact) need two taps to run.
      const [armedAction, setArmedAction] = React.useState<string | null>(null)
      const handleAction = (id: string): void => {
        const command = ACTION_COMMANDS[id]
        if (!command) return
        if (armedAction !== id) { setArmedAction(id); return }
        setArmedAction(null)
        runCommand(command)
      }
      // Whole-card cycle (pooled usage widgets + sys big-figure cards): advance the
      // instance's selection along its cycle and persist it via cardConfigs so
      // the choice survives reloads and other browser origins. The persisted
      // field defaults to 'poolView' (usage pool); sys cards pass `store:
      // 'bigMetric'` so their cycle never collides with the pool view. The
      // multikey `prefer` call only fires for usage cycles (storeless).
      const cyclePool = (key: string) => (out: WidgetRenderOut): void => {
        const modes = out.cycle?.modes ?? []
        if (modes.length === 0) return
        const current = out.cycle?.current ?? modes[0]
        const idx = modes.indexOf(current)
        const next = modes[(idx < 0 ? -1 : idx) + 1] ?? modes[0]
        const store = out.cycle?.store ?? 'poolView'
        setPrefs({ cardConfigs: { ...prefs.cardConfigs, [key]: { ...(prefs.cardConfigs[key] ?? {}), [store]: next } } })
        if (out.cycle?.store) return
        const entry = snap.usageMulti?.keys.find((k) => k.label === next)
        void fetch('/api/multikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'prefer', ref: next === 'total' ? '' : (entry?.ref ?? '') }),
        }).catch(() => { /* pool endpoint optional: display only */ })
      }
      // The add panel belongs to a live session: drop it when the session does.
      // (The wave's own focus state is dropped by RailWave on the same signal.)
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) setAddOpen(false)
      }, [snap.open, snap.hasSession])
      /**
       * The rail's measured viewport height (clientHeight), tracked with a
       * ResizeObserver. It is the one input the scroll geometry cannot derive: the
       * rail is `position: fixed; top: var(--dsx-rail-top); bottom: 0`, so its
       * height follows the window, the session header and the composer, and the
       * scroll tail that makes the LAST row reachable must reserve exactly one of
       * these. Declared above the drawer's early return so the hook order never
       * changes, and initialised to 0: the first painted frame then simply shows a
       * shorter (still correct-looking) scroll range, and the observer's first
       * callback —same tick as the layout —replaces it before the user can
       * scroll.
       */
      const [railPaneH, setRailPaneH] = React.useState(0)
      // The rail element itself, shared by the wave (hit tests, scroll geometry)
      // and the pane-height observer below. A REAL ref, not a plain `{ current }`
      // object: a plain object is re-created on every render of this component, so
      // the element's ref callback (attached under an earlier render) writes into a
      // DIFFERENT object than the one the effects close over —leaving the effects
      // reading `null` forever (measured: `railElRef.current === null` at wheel
      // time while the rail was plainly in the DOM, `paneH` stuck at 0, and the
      // scroll range back to 750px).
      const railElRef = React.useRef<HTMLDivElement | null>(null)
      React.useLayoutEffect(() => {
        // Read `.current` INSIDE the callbacks, never capture the element: the
        // layout effect below the early return can run before the rail is
        // rendered, and a captured `null` (or a previous element) would then be
        // observed forever. Measured: capturing it left `railPaneH` at 0, the
        // scroll range shrank back to 750 and the last rows became unreachable
        // again —the exact bug this observer exists to prevent.
        const measure = (): void => {
          const rail = railElRef.current
          if (rail === null) return
          setRailPaneH((prev) => (prev === rail.clientHeight ? prev : rail.clientHeight))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(measure)
        // Window resize changes the rail's height even when nothing else does.
        window.addEventListener('resize', measure)
        const retry = window.setTimeout(() => {
          const rail = railElRef.current
          if (rail !== null) ro.observe(rail)
          measure()
        }, 0)
        return () => { window.clearTimeout(retry); window.removeEventListener('resize', measure); ro.disconnect() }
      }, [snap.open, snap.hasSession])
      // 鈹€鈹€ Drawer open/close animation, matching dsh-better-sidebar's right
      //    panel: a translateX slide with --ds-transition-duration-slow +
      //    --ds-ease-in-out, applied to a position:fixed inset:0 wrapper so the
      //    rail + magnify overlay + add panel move as ONE surface. Opening
      //    glides in from the RIGHT (translateX(+travel) −0, moving leftwards
      //    into the resting slot), closing is the reverse (0 −
      //    translateX(+travel), sliding out to the right). CSS transitions
      //    interrupt natively: a rapid re-toggle animates from the current
      //    intermediate geometry straight to the new target —no snap, no
      //    desync. The wrapper is pointer-events:none so it never blocks the
      //    page.
      const shouldOpen = snap.open && snap.hasSession
      const [drawerPhase, setDrawerPhase] = React.useState<'closed' | 'enter' | 'open' | 'leave'>(shouldOpen ? 'open' : 'closed')
      const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Boot restore must NOT play the enter glide. Prefs are read synchronously
      // while the session arrives asynchronously, so at mount the drawer is
      // `closed` even though the rail is already wanted: the restore that
      // follows then looks exactly like a user open and slides the drawer on
      // every refresh. `bootRestorePending` marks precisely that state (wanted,
      // session still unknown); a genuine later open never sets it.
      const bootRestorePending = React.useRef(snap.open && !snap.hasSession)
      // Leave timeout: the CSS slide is 0.3s (--ds-transition-duration-slow);
      // unmount 350ms later so the element is gone only after the slide ends.
      const DRAWER_LEAVE_MS = 350
      React.useEffect(() => {
        setDrawerPhase((p) => {
          if (shouldOpen) {
            if (p === 'closed') {
              // Restored (prefs + session resolved in the same commit) —appear
              // in place; user open —glide in from the right.
              if (bootRestorePending.current) {
                bootRestorePending.current = false
                return 'open'
              }
              return 'enter'
            }
            return p === 'leave' ? 'open' : p
          }
          return p === 'closed' ? 'closed' : 'leave'
        })
      }, [shouldOpen])
      // Enter: the first painted frame MUST sit at translateX(-100%) before the
      // transition target flips to 0, or the browser has no start value to
      // animate from (the rail would just pop in). Two rAFs guarantee that
      // -100% frame has been laid out and painted before raising to 0.
      React.useEffect(() => {
        if (drawerPhase !== 'enter') return
        let raf2 = 0
        const raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setDrawerPhase((p) => (p === 'enter' ? 'open' : p)))
        })
        return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2) }
      }, [drawerPhase])
      // Leave: unmount once the slide finishes (instant for reduced-motion).
      React.useEffect(() => {
        if (drawerPhase !== 'leave') return
        if (reduceMotion) { setDrawerPhase('closed'); return }
        const t = window.setTimeout(() => setDrawerPhase((p) => (p === 'leave' ? 'closed' : p)), DRAWER_LEAVE_MS)
        return () => window.clearTimeout(t)
      }, [drawerPhase, reduceMotion])
      if (drawerPhase === 'closed') return null
      // Geometry resolves against the space the product's transcript measure
      // leaves over (see readRailBudget): the rail may shrink (a narrower card
      // inside the SAME column count, then fewer columns) and finally collapse,
      // but it never pushes the reading measure below what the user chose.
      // Read the LIVE budget, not the React snapshot: a render can be committed
      // after the yield was applied directly to the DOM, and a stale snapshot
      // would then write the pre-yield geometry back (measured: a yielded drawer
      // re-claiming 372px, insetting a transcript whose rail was invisible).
      // One decision function, shared with the direct-DOM beat write, so React
      // and the animation path can never disagree about the geometry.
      const space = resolveRailSpace(prefs, railBudget)
      const yielded = space.yielded
      const side = space.side
      const pad = space.pad
      const columns = space.columns
      const multi = columns > 1
      // Rail width is the STATIC grid width —NO magnification overshoot. The
      // rail no longer reserves left room for the bell-curve overshoot (which
      // used to widen both the rail and --dsx-rail-w, pushing the conversation
      // column right). A magnified card's left growth is instead painted by a
      // fixed overlay layer OUTSIDE the rail's scroll-clip box (see magnifyLayer)
      // so the conversation column keeps the resting rail's width at all times.
      const railW = space.drawW
      const hidden = space.hidden
      document.documentElement.style.setProperty('--dsx-rail-w', `${space.claimW}px`)
      document.documentElement.style.setProperty('--dsx-rail-pad', `${pad}px`)
      document.documentElement.style.setProperty('--dsx-rail-overshoot', `0px`)
      applyRailRight(space.swallowed)
      // --dsx-rail-scroll is owned by RailWave (it tracks the rail's scrollTop).
      // Heatmap day data is owned by the dock collector: the authoritative host
      // map when dsh-usage-center is installed, else its own persisted live log.
      // The rail consumes the collector's values and never overrides them; only
      // when stats lacks heatmap fields entirely (first paint before the
      // collector effect runs) does it fall back to the persisted table so the
      // cards are never blank.
      const statsHeat = (snap.stats as { heatmapRaw?: Record<string, number>; heatmapGrid?: unknown } | null) ?? null
      const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0
        ? statsHeat.heatmapRaw
        : (snap.usageDaily ?? loadHeatmapStore())
      const base = {
        ...(snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }),
        // Only inject the fallback when live stats lacks heatmap fields.
        ...(statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } }),
        ...(statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ) }),
      }
      interface RailItem { key: string; size: WidgetSize; w: (typeof WIDGETS)[number]; out: NonNullable<ReturnType<(typeof WIDGETS)[number]['render']>>; baseW: number }
      // Pooled usage views: ['total', 'Key 1', 'Key 2', 'Key N'] when the pool has
      // more than one key; otherwise usage cards fall back to single-key data.
      const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1
        ? ['total', ...snap.usageMulti!.keys.map((entry, i) => entry.label || `Key ${i + 1}`)]
        : undefined
      const items: RailItem[] = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
        .map((key) => {
          const { widgetId, size } = parseInstanceKey(key)
          const w = WIDGETS.find((x) => x.id === widgetId)
          if (!w || sizesOf(w).indexOf(size) === -1) return null
          // Per-card render isolation: ONE crashing widget (e.g. a malformed
          // usage payload) must never take down the whole rail —a render
          // exception used to kill the entire shell.overlay slot entry, hiding
          // every widget until the next hard refresh. The bad card degrades to
          // a placeholder instead; the error stays visible in the console.
          let out: ReturnType<typeof w.render>
          try {
            out = w.render({ ...base, usageData: snap.usageData, usageMulti: snap.usageMulti, commandCode: snap.commandCode, commandCodeError: snap.commandCodeError, sysinfo: snap.sysinfo, poolModes, armedAction, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0], { size })
          } catch (error) {
            console.error(`[dsh-widgets] widget ${widgetId}@${size} render crashed:`, error)
            out = { title: widgetName(w), value: '—', legend: t('ui.renderError') }
          }
          // Loading skeleton: the widget's live source has not answered yet, so
          // the card keeps its slot (and therefore the deck's shape) with
          // placeholder pills instead of flashing an empty/0-valued body. The
          // skeleton is a SHELL decision —see WIDGET_SOURCE.
          const source = WIDGET_SOURCE[widgetId]
          if (source !== undefined && isSourcePending(source, snap)) {
            const silhouette = SKELETON_SHAPE[widgetId]
            out = {
              title: out?.title ?? widgetName(w),
              skeleton: true,
              skeletonRows: silhouette?.rows ?? 1,
              ...(silhouette === undefined ? {} : { skeletonShape: silhouette.shape, skeletonCount: silhouette.count }),
            }
          }
          if (!out) return null
          // 2脳4 is exactly two 2脳2 widths plus one inter-card gap.
          const baseW = size === '2x4' ? 2 * side + pad : side
          return { key, size, w, out, baseW }
        })
        .filter((it): it is RailItem => it !== null)
        // In a 1-column layout a 2脳4 tile (two cells wide) cannot fit the single
        // rail column, so its instances are hidden —TEMPORARILY blocklisted,
        // not removed: switching back to 2/4 columns restores them from
        // installed/order as-is. The market marks those entries in the same state
        // (struck-through title + yellow capsule + disabled add).
        .filter((it) => !(columns === 1 && it.size === '2x4'))
      // The rail is a fixed viewport panel anchored to the right edge. The
      // dsh-better-sidebar bundle occupies the same edge with its own
      // fixed right panel (z-index 40) and pushes the app shell via
      // `#root { margin-right: var(--dsh-sidebar-width) }` (neutralized by
      // dsh-ui-harmonizer to the conversation column's margin-right). The rail
      // anchors its right edge to that SAME variable inline (0 while absent)
      // and its CSS carries `transition: right` —deliberately on the MAIN
      // THREAD, the same animation path as the conversation column's
      // margin-right. A compositor transform (v1.2.3) never dropped frames,
      // but when the column's per-frame reflow overran a frame the rail kept
      // gliding while the column stalled —the two visibly split. Same-path
      // animation cannot split: both surfaces advance in the same style−抣ayout
      // pass every frame. The rail subtree is cheap (lazy overlay deck, no
      // persistent will-change), so the per-frame cost is negligible.
      // Padding is `0 pad pad pad`: no top inset so the first card aligns with
      // the session header's bottom edge; right/left keep the resize handle
      // room, bottom keeps the last card off the viewport floor.
      const scale = side / BASE_SIDE
      const addRadius = Math.round(16 * scale)
      const closeIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true },
        React.createElement('path', { d: 'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z', fill: 'currentColor' }),
        React.createElement('path', { d: 'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z', fill: 'currentColor' }),
      )
      // Dock-style magnification, following the authoritative macOS Dock
      // algorithm (see LikhithSP/MacOS-Web-Simulator Dock.jsx):
      //   - scale is a DISCRETE STEP of the distance from the hovered card
      //     {d0: peak, d1, d2, — none} —a steep bell, NOT a flat gaussian, so
      //     neighbours barely grow while the hovered card is clearly the peak.
      //   - the hovered card is HARD-MAX by construction (d=0 returns the peak).
      //   - cards are sized through LAYOUT (width/height change, neighbours make
      //     room via cumulative top), not transform —so the right edge stays
      //     pinned to the rail right and the gap between cards is constant.
      const restCenter = (i: number): number => i * (side + pad) + side / 2
      const peakScale = prefs.magnify
      // Continuous falling bell, scaled relative to the peak so the curve keeps
      // its shape at any configured magnification. d is measured in "grid steps"
      // (X divided by column pitch, Y by row pitch), so the decay is naturally
      // row/column-aware. It is CONTINUOUS (not rounded): a horizontal move of the
      // peak within a row nudges the rows above/below by a fractional step, so
      // they visibly respond instead of snapping to the same rounded bucket.
      const stepScale = (d: number): number => {
        const extra = peakScale - 1
        if (d <= 0) return peakScale
        const t = Math.max(0, 1 - d / 3)      // 0..1 over a ~3-step influence radius
        if (t <= 0) return 1                  // three+ steps away: not magnified
        return 1 + extra * Math.pow(t, 1.6)   // steep, peak-emphasising falloff
      }
      const active = prefs.realTime
      // Row-band packing (P2, no gaps): every card is one grid-unit tall
      // (2脳2 and 2脳4 share the same height). A 2脳4 spans two cells in width, a
      // 2脳2 spans one. Cards pack left-to-right through the row's cell budget;
      // when the current row cannot fit a card (e.g. a 2脳4 with only one cell
      // left), it moves to the next row, so a later 2脳2 always back-fills the gap.
      const spanOf = (i: number): number => (items[i].size === '2x4' ? 2 : 1)
      const baseWOf = (i: number): number => items[i].baseW
      const rowIndexOf: number[] = []
      const colIndexOf: number[] = []
      const n = items.length
      // --- assign cards to rows (P2 packing, no gaps) ---
      if (n > 0) {
        if (multi) {
          // Row LISTS, not just a used-cell counter: the 3-column rounding rule
          // below has to re-seat a card that is already placed.
          const rowItems: number[][] = [[]]
          const rowUsed = (r: number): number => rowItems[r].reduce((sum, k) => sum + spanOf(k), 0)
          const place = (i: number, allowRound: boolean): void => {
            const sp = spanOf(i)
            // Greedy best-fit: the EARLIEST row that still has room for the span.
            // A later 2脳2 always back-fills a hole a 2脳4 left behind.
            for (let r = 0; r < rowItems.length; r++) {
              if (rowUsed(r) + sp <= columns) { rowItems[r].push(i); return }
            }
            // 3-column rounding ("绫讳技鍥涜垗浜斿叆", user decision 2026-09-18): with
            // three cells, a 2脳4 that cannot start in the cells left in the last
            // row moves ONE SLOT EARLIER —it takes the first narrow card's place
            // and the narrow card(s) it displaces are re-booked behind it (they
            // back-fill the next row). Without this the wide card opens a new row
            // and the row above keeps a hole, which reads as "the 2脳4 got cut off".
            const last = rowItems.length - 1
            if (allowRound && columns === 3 && sp === 2 && rowUsed(last) === columns - 1) {
              const row = rowItems[last]
              const narrows = row.filter((k) => spanOf(k) === 1)
              if (narrows.length > 0 && row.length === narrows.length) {
                rowItems[last] = [i, narrows[0]]
                for (const k of narrows.slice(1)) {
                  rowItems.push([])
                  place(k, false)
                }
                return
              }
            }
            rowItems.push([i])
          }
          for (let i = 0; i < n; i++) place(i, true)
          // A spill can leave a trailing empty row behind.
          while (rowItems.length > 0 && rowItems[rowItems.length - 1].length === 0) rowItems.pop()
          for (let r = 0; r < rowItems.length; r++) {
            let used = 0
            for (const i of rowItems[r]) {
              rowIndexOf[i] = r
              colIndexOf[i] = used
              used += spanOf(i)
            }
          }
        } else {
          for (let i = 0; i < n; i++) { rowIndexOf[i] = i; colIndexOf[i] = 0 }
        }
      }
      // Real row count, not "the last item's row": the rounding rule above can
      // leave the last ITEM in an earlier row than the last ROW.
      const rows = multi ? rowIndexOf.reduce((m, r) => Math.max(m, r + 1), 0) : n
      // --- magnification scale field ---
      // Shared stepless core: every card's scale is its own continuous Euclidean
      // distance to a focus point (rail-content coords). Both modes reuse this so
      // the posture (right-edge anchored) is identical and the right edge stays
      // flush with the rail regardless of mode.
      //  - Stepless (`active`):   focus = the pointer's live coordinates.
      //  - Discrete (`!active`):  focus = the pointer coordinates SNAPPED onto a
      //    discrete grid —the row/column centres plus the midpoints between each
      //    adjacent pair (rows −2路rows– Y points, cols −2路cols– X points).
      //    The 0.2s tween then glides the peak between those grid points.
      const cellW = side + pad
      const rowH = side + pad
      const scaleFor = (fx: number, fy: number): number[] => {
        const out = new Array(n).fill(1)
        if (multi) {
          for (let i = 0; i < n; i++) {
            const cxi = (colIndexOf[i] + spanOf(i) / 2) * cellW
            const cyi = rowIndexOf[i] * rowH + side / 2
            out[i] = stepScale(Math.hypot(cxi - fx, cyi - fy) / (side + pad))
          }
        } else {
          for (let i = 0; i < n; i++) out[i] = stepScale(Math.abs(fy - restCenter(i)) / (side + pad))
        }
        return out
      }
      // Discrete quantization grid: row centres + adjacent midpoints (Y), and
      // column centres + adjacent midpoints (X).
      const yPts: number[] = []
      for (let r = 0; r < rows; r++) {
        yPts.push(r * rowH + side / 2)
        if (r < rows - 1) yPts.push((r + 0.5) * rowH + side / 2)
      }
      const xPts: number[] = []
      for (let cIdx = 0; cIdx < columns; cIdx++) {
        xPts.push(cIdx * cellW + cellW / 2)
        if (cIdx < columns - 1) xPts.push((cIdx + 0.5) * cellW + cellW / 2)
      }
      const nearest = (v: number, pts: number[]): number => {
        let best = pts[0] ?? 0
        for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k] - v) < Math.abs(best - v)) best = pts[k]
        return best
      }
      // Engagement / focus geometry lives in RailWave (see the component): this
      // component only owns the resting deck and the persisted prefs.
      // --- build actual reflow (right-edge anchored) for a given scale array.
      //   Each card is one grid-unit tall (2脳2 and 2脳4 share the same height =
      //   side 脳 scale); only the width differs (2脳4 is two units plus the gap).
      //   Within each row cards place right-to-left (rightmost at right:0, each
      //   next pushed left by prev width + pad); row top accumulates by the
      //   tallest scaled height in the row (+pad), so a magnified row pushes the
      //   rows below it down. Spacing stays exactly pad. ---
      const placeCards = (sc: number[]): Array<{ s: number; top: number; right: number; w: number; h: number }> => {
        const place: Array<{ s: number; top: number; right: number; w: number; h: number }> = new Array(n)
        if (n > 0) {
          if (multi) {
            const rowTopAcc: number[] = new Array(rows).fill(0)
            const rowHAcc: number[] = new Array(rows).fill(0)
            for (let i = 0; i < n; i++) { const r = rowIndexOf[i]; const h = side * sc[i]; if (h > rowHAcc[r]) rowHAcc[r] = h }
            {
              let acc = 2
              for (let r = 0; r < rows; r++) { rowTopAcc[r] = acc; acc += rowHAcc[r] + pad }
            }
            for (let r = rows - 1; r >= 0; r--) {
              const inRow: number[] = []
              for (let i = 0; i < n; i++) if (rowIndexOf[i] === r) inRow.push(i)
              inRow.sort((a, b) => colIndexOf[b] - colIndexOf[a])
              let colRight = 0
              for (const i of inRow) {
                const w = baseWOf(i) * sc[i]
                place[i] = { s: sc[i], top: rowTopAcc[r], right: colRight, w, h: side * sc[i] }
                colRight += w + pad
              }
            }
          } else {
            // Single column, right-anchored (2脳4 collapses to 2脳2 width here since
            // a single column has no room for a two-cell-wide card).
            let acc = 2
            for (let i = 0; i < n; i++) { const h = side * sc[i]; place[i] = { s: sc[i], top: acc, right: 0, w: h, h }; acc += h + pad }
          }
        }
        return place
      }
      // Static deck (rail scroll content): resting grid, scale 1 everywhere. The
      // rail keeps this deck intact for scrolling, occupancy and interaction.
      // The live magnification reflow is RailWave's fixed overlay, which escapes
      // the rail's scroll-clip box and rides the same placeCards().
      const staticLayout = placeCards(new Array(n).fill(1))
      // Deck height is the STATIC reflow bottom (the rail content never grows
      // while magnifying —growth is painted by the fixed overlay), so the add
      // button and scroll height stay fixed at the resting grid.
      const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      // Add button placement, shared by the static deck and the focus overlay.
// Rows are right-anchored, so the leftover cell(s) of a short last row sit at
// the row's LEFT edge. The button parks in that gap ONLY when the STATIC gap
// is actually wide enough (leftGap >= side) —the fit decision must not
// flip under magnification (a focused row's wider cards would shrink the gap
// below `side` and jump the button to the deck bottom-right mid-hover).
// Placement itself rides the passed `layout` (static or scaled), so while
// hovering the button stays in its gap slot, gliding with the row.
// The leftmost placed card, not the last item, anchors the gap —the old code
// anchored off the last item, which for a left-packed 4-col row put the button
// on top of the row's own cards.
const addSlotFor = (layout: Array<{ s: number; top: number; right: number; w: number; h: number }>): { top: number; right: number } => {
  if (n === 0) return { top: 2 + pad, right: 0 }
  if (multi) {
    // The LAST ROW and its own fill level, not the last item's: the 3-column
    // rounding rule can seat the last item in an earlier row than the last row.
    const lastRow = rowIndexOf.reduce((m, r) => Math.max(m, r), 0)
    let lastRowUsed = 0
    for (let i = 0; i < n; i++) {
      if (rowIndexOf[i] !== lastRow) continue
      lastRowUsed = Math.max(lastRowUsed, colIndexOf[i] + spanOf(i))
    }
    if (lastRowUsed < columns) {
      // fit-check against the STATIC widths so hovering never flips the slot
      let sIdx = -1
      let lIdx = -1
      for (let i = 0; i < n; i++) {
        if (rowIndexOf[i] !== lastRow) continue
        if (sIdx === -1 || staticLayout[i].right > staticLayout[sIdx].right) sIdx = i
        if (lIdx === -1 || layout[i].right > layout[lIdx].right) lIdx = i
      }
      const contentW = railW - 2 * pad
      if (sIdx !== -1 && lIdx !== -1) {
        const sLeftmost = staticLayout[sIdx]
        if (contentW - sLeftmost.right - sLeftmost.w - pad >= side) {
          const leftmost = layout[lIdx]
          return { top: leftmost.top, right: leftmost.right + leftmost.w + pad }
        }
      }
    }
    const bottom = layout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
    return { top: bottom + pad, right: 0 }
  }
  const bottom = layout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
  return { top: bottom + pad, right: 0 }
}
// Deck height covers the live reflow bottom AND the add button (when it
      // hangs below the deck), so neither ever clips or pushes unexpectedly.
      const nItems = items.length
      const staticAdd = addSlotFor(staticLayout)
      const addTop = staticAdd.top
      const addRight = staticAdd.right
      const addBottom = addTop + side
      const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad
      /**
       * ── SCROLL GEOMETRY: how tall the SCROLL CONTENT must be ──
       *
       * Row `r` is seated at `RAIL_ROW_SEAT + r · pitch` (placeCards) and the rail's
       * range is `contentH − clientH`, so the LAST row can top out exactly when
       *
       *     contentH = max(rows · pitch, stackHeight) + paneH
       *
       * with `paneH` the rail's MEASURED clientHeight. The deck's own box stays its
       * natural height (`stackHeight`); the difference is reserved by the TAIL element
       * inside the rail (see RailWave), because the deck's box is ALSO the overlay's box
       * and the two decks must stay pixel-identical while the wave is live.
       *
       * Without the reservation the browser CLAMPS the last detents and the deck stops
       * moving (measured 1578×1000, 8 rows × pitch 184: range 750 < the 5th detent, so
       * rows 5–8 could never top out — the reported "a row stays half hidden and further
       * scrolling does nothing at all"). With MORE than one detent-range of extra content
       * the wheel keeps scrolling past the last row into empty space — the reported
       * "keep scrolling and it is just blank" — so the tail is exactly the difference
       * between the two, never a fixed guess.
       */
      const paneH = railPaneH
      const scrollPitch = Math.max(1, side + pad)
      const deckH = stackHeight
      /**
       * How far the deck may scroll: the last row whose cards still reach into the
       * viewport. Beyond that the wheel would only pull empty space up — the reported
       * "keep scrolling and it is just blank".
       *
       * `contentBottom` is the deepest CARD bottom (the add tile hangs below the grid
       * or fills its last-row cell, so it is not the thing the user is scrolling to
       * see). The range that just fits it is `contentBottom − clientH`; the last row
       * allowed is therefore `floor((range − RAIL_ROW_SEAT) / pitch)`, floored at row 0
       * so a deck shorter than the viewport still has one detent.
       */
      const contentBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      /**
       * HIGHEST ROW THAT MAY TOP OUT — the scroll stop the user asked for.
       *
       * A row may top out only while its own cards still REACH INTO the viewport; past
       * that the wheel would pull up nothing but the empty tail. The last such row is
       * the one holding the deepest bottom that is still on screen:
       *
       *     cards' visible bottom at row r = r · pitch + clientH  (r · pitch = their top)
       *     last row                       = ceil((contentBottom + clientH − seat) / pitch) − 1
       *
       * Measured 1578×1000 with 8 rows × 184 (contentBottom 1450, clientH 936): the last
       * row is 7, so the deck stops with row 7 at the top and its cards showing — the
       * extra detents into blank space are gone. (A tighter `contentBottom − clientH`
       * cap is WRONG: it lands on row 2 here and would hide rows 3–7 entirely.)
       */
      const lastRow = Math.max(0, Math.min(
        rows - 1,
        Math.ceil((contentBottom + paneH - RAIL_ROW_SEAT) / scrollPitch) - 1,
      ))
      // ONE builder for a card's interactive body, shared by the resting deck and
      // the magnify overlay. While the wave is live the overlay is the surface the
      // user sees AND touches (see the magnify layer's note), so its copies carry
      // the real handlers —action, pooled-view cycle and the bottom-left resize
      // grip —instead of being a dead picture.
      const cardBodyFor = (it: RailItem, width: number): React.ReactNode[] => [
        React.createElement(CardBody, { key: 'b', out: it.out, unit: side, width, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, onAction: handleAction, onCycle: cyclePool(it.key) }),
        React.createElement('span', { key: 'r', className: 'dsx-stats-resize', 'aria-label': t('ui.rail.resizeAria'), onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = prefs.cardSide; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
      ]
      // The overlay's bodies are built ONCE per render of this (parent) component —
      // and this component does NOT re-render on pointer moves (the hover state
      // lives in RailWave), so a follow frame re-uses these element objects and
      // React bails out of every card subtree.
      const overlayCardBodies = items.map((it) => cardBodyFor(it, it.baseW))
      const toggleAdd = (): void => setAddOpen((v) => !v)
      // Static deck: resting grid + every interactive affordance. Built HERE so
      // its element identity stays stable while the pointer moves —RailWave
      // re-renders per hover frame, and React bails out of this whole subtree
      // because the element object it receives never changes. The engage fade is
      // the `.dsx-wave-deck` class the wave puts on its wrapper (no re-render).
      const deck = React.createElement('div', { key: '__deck', style: { position: 'relative', height: `${deckH}px` } },
        staticLayout.map((c, idx) => {
          const it = items[idx]
          const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px` }
          return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle },
            ...cardBodyFor(it, c.w),
          )
        }),
        // Bottom add button, parked inside the deck so it shares the grid layout:
        // it fills the empty last-row cell on odd counts, or sits right-aligned
        // below the rows on even counts / single column.
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: toggleAdd, style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } },
          React.createElement('span', { className: 'dsx-stats-add-icon' },
            React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
          ),
          React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
        ),
      )
      const rail = React.createElement(RailWave, {
        key: '__wave', deck, cardBodies: overlayCardBodies, railElRef, onAddClick: toggleAdd, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active,
        placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor,
        restLayout: staticLayout, restAdd: staticAdd,
        live: snap.open && snap.hasSession, shiftX: space.shiftX, columns,
      })
      // Temporary right-side add panel: reuses the component-config + component-market settings pages
      // (WidgetsPage) wholesale, floats over content, never affects layout.
      // Width is configurable (prefs.panelWidth) and draggable via the left edge.
      const pw = prefs.panelWidth
      const startResize = (e: React.PointerEvent): void => {
        e.preventDefault(); e.stopPropagation()
        const x0 = e.clientX, w0 = pw
        const move = (ev: PointerEvent) => setPrefs({ panelWidth: Math.max(260, Math.min(760, Math.round(w0 + (x0 - ev.clientX)))) })
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
      }
      // The add panel is PORTALED to <body> —deliberately OUT of the drawer.
      //
      // Why (measured 2026-09-18, 1578脳1022 and 1280脳760): the drawer lives in
      // `conversation.input.overlay`, whose stacking ancestor chain is the
      // composer seat (z-index 7). Within that context the panel's own z-index 30
      // is meaningless: the official composer's input row / send button and the
      // right sidebar's `wSkVaW_widthHandle` (full-height, z-index 8) painted
      // ABOVE the popup card —a 16px hit-test grid over the panel box reported
      // only 92.7% / 89% coverage, with the panel's bottom-left corner and a
      // full-height vertical strip belonging to other layers. Portaled to body
      // the panel competes at the root stacking context (z-index 30 > composer 7,
      // width handle 8, right sidebar 10, shell overlay 20), so it is once again
      // the top surface. It also stops fading when the rail yields.
      //
      // The panel keeps every anchor it needs: --dsx-rail-top / --dsx-input-bottom
      // / --dsx-rightbar-w / --dsx-rail-pad are written on documentElement, so a
      // body-level child still resolves them.
      const addPanel = createPortal(React.createElement('div', { className: 'dsx-stats-addpanel' + (addOpen ? ' open' : ''), style: { top: 'var(--dsx-rail-top,0px)', width: `${pw}px` } },
        React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': t('ui.addPanel.resizeAria'), onPointerDown: startResize }),
        React.createElement('div', { className: 'dsx-stats-addpanel-header' },
          React.createElement('div', { className: 'dsx-stats-addpanel-title' }, t('ui.addPanel.title')),
          React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': t('ui.addPanel.closeAria'), onClick: () => setAddOpen(false) }, closeIcon),
        ),
        React.createElement('div', { className: 'dsx-stats-addpanel-body' },
          React.createElement(WidgetsPage, { controller: { prefs, setPrefs }, hideHeader: true }),
        ),
      ), document.body)
      // Always render the panel too so closing slides it out (`.open` toggles
      // visibility/transform); when closed it is hidden (visibility + opacity)
      // and never intercepts pointer events over the rail.
      //
      // Drawer wrapper: the ONE surface that slides. position:fixed inset:0
      // keeps every fixed child (rail / magnify overlay / add panel) positioned
      // exactly as before —a transformed fixed ancestor becomes their
      // containing block, but this wrapper spans the viewport so the
      // coordinates are identical —while the wrapper's own translateX carries
      // the whole group. Opening glides in from the RIGHT (translateX(+travel)
      // −0, leftwards into its resting slot); closing is the reverse (0 −
      // translateX(+travel), sliding out to the right). pointer-events:none:
      // interaction stays on the children that opt in.
      // Travel distance is the rail's own width (+24px margin), NOT a
      // percentage: translateX(%) on this wrapper would resolve against the
      // VIEWPORT width (inset:0), sliding a whole screen-width instead of one
      // rail width (far too fast over the same 0.3s).
      const drawerTravel = Math.round(railW + 24)
      const drawerTransform = drawerPhase === 'enter' || drawerPhase === 'leave' ? `translateX(${drawerTravel}px)` : 'none'
      const drawerTransition = reduceMotion ? 'none' : 'transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)'
      // The whole drawer (rail + magnify + add panel) fades as ONE surface when
      // the rail yields, on the same duration/easing as the panel's push, so the
      // two motions cannot split (the official layout README requires co-motion
      // with the track transition).
      // Opacity is used ONLY for the no-space-to-hide case (a narrow window with
      // no panel to cover the rail). When a panel is present the rail stays fully
      // opaque and simply sits under it —that is the swallow.
      const drawerOpacity = hidden ? 0 : 1
      // The class is also the instant, emit-proof kill switch for the whole
      // group: `body.dsx-stats-no-session` (see the rail-width effect below)
      // hides it in the same style pass the transcript's yield is released.
      return React.createElement('div', { key: '__drawer', ref: (el: HTMLDivElement | null) => { drawerEl = el }, className: 'dsx-stats-drawer', 'data-yielded': yielded ? '' : undefined, 'data-no-room': hidden ? '' : undefined, style: { position: 'fixed', inset: 0, pointerEvents: 'none', transform: drawerTransform, opacity: drawerOpacity, transition: `${drawerTransition}, opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out)` } },
        rail, addPanel,
      )
    },
  ))

  // ---- Settings section ("component settings" page). ----
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'widgets', order: 30, label: () => t('ui.section.label') },
    () => {
      const snap = useBridge()
      return React.createElement(WidgetsPage, { controller: { prefs: snap.prefs, setPrefs } })
    },
  ))

  // ---- Official settings-nav glyph for our section. ----
  // The shell's settings nav picks its glyph from the section ID and only knows
  // its three built-in IDs ("models" / "agent-presets" / "plugins"); every other
  // section —ours included —falls back to the generic settings gear. The section
  // contract carries no icon field (only id / order / label), so the client half
  // marks OUR row with `data-dsx-nav` and widgets.module.css swaps the gear for
  // the app icon's four-tile glyph. The row is matched by our own registered
  // label, and the mark is removed with the owning effect.
  ctx.effect(() => {
    const ATTR = 'data-dsx-nav'
    const mark = (): void => {
      const label = t('ui.section.label')
      for (const list of document.querySelectorAll('[class$="_navList"]')) {
        for (const row of list.querySelectorAll(':scope > button')) {
          if ((row.textContent ?? '').trim() === label) row.setAttribute(ATTR, 'widgets')
          else row.removeAttribute(ATTR)
        }
      }
    }
    // Only the settings panel ever inserts a `_navList`, and the row must be
    // marked the moment that panel opens (before the user could pick our cell),
    // so watch for that one node instead of re-scanning on every transcript
    // mutation.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.matches('[class$="_navList"]') || node.querySelector('[class$="_navList"]') !== null) {
            mark()
            return
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    // The label is localized, so a language switch re-renders the row's text and
    // the match has to run again.
    const offLocale = onLocaleChange(mark)
    mark()
    return () => {
      observer.disconnect()
      offLocale()
      for (const row of document.querySelectorAll(`[${ATTR}]`)) row.removeAttribute(ATTR)
    }
  })

  // ---- Rail width + stats-line toggle. ----
  ctx.effect(() => {
    const apply = (): void => {
      document.body.classList.toggle('dsx-stats-active', state.open && state.hasSession)
      // Session hand-off kill switch. The rail is a set of `position: fixed`
      // layers, so an entry that misses the session-loss emit keeps painting (and
      // capturing pointer events) over the fresh-conversation page —the React
      // half of the fix is `useSyncExternalStore`, this is the belt-and-braces
      // half that cannot be missed: the module-level subscriber above always runs,
      // and the class hides the whole drawer in the same style pass that releases
      // the transcript's yield. It is instant on purpose (the leave glide belongs
      // to a user-initiated close, not to "this conversation is gone").
      document.body.classList.toggle('dsx-stats-no-session', !state.hasSession)
      scheduleMeasure()
    }
    const sub = subscribe(apply)
    apply()
    return () => {
      sub()
      document.body.classList.remove('dsx-stats-active')
      document.body.classList.remove('dsx-stats-no-session')
    }
  })

  // ---- Official composer stats-line hide switch (personal preference). ----
  ctx.effect(() => {
    const apply = (): void => { document.body.classList.toggle('dsx-hide-statsline', prefs.hideStatsLine) }
    const sub = subscribe(apply)
    apply()
    return () => { sub(); document.body.classList.remove('dsx-hide-statsline') }
  })
}

