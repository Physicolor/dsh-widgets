/**
 * Harness Widgets — browser half entry.
 *
 * Registers the right-hand widget rail, the header capsule toggle, and the
 * two settings surfaces (General rows + the component-settings section). One shared bridge
 * holds the persisted prefs, the folded session stats, and the OpenCode usage
 * payload fetched from the Host's same-origin `/api/opencode-usage` route.
 */

import * as React from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import './widgets.module.css'
import { ALL_INSTANCES, DEFAULT_INSTALLED, WIDGETS, WIDGET_LOCALES } from './generated.registry'
import { instanceKey, parseInstanceKey, sizesOf, widgetName, type CommandCodeData, type SysInfo, type UsageData, type UsageMulti, type WidgetRenderOut, type WidgetSize } from './lib/contract'
import { accumulateHeatmap, buildHeatmapGrid, dateKey, DEFAULT_TZ, loadHeatmapAnchor, loadHeatmapStore, loadSeen, mergeToday, saveHeatmapAnchor, saveSeen } from './lib/heatmap-accounting'
import { SYS_WIDGET_IDS, ingestSysInfo, resolveInterval } from './lib/sys-view'
import { CardBody, WidgetsPage, type Prefs } from './components'
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
 * leaves over — never the measure itself. Both numbers are published at runtime
 * by `ui-conversation` on the conversation root (verified 2026-09-17:
 * `--dsh-conversation-column-width: 1298px`, `--dsh-chat-content-width: 748px`
 * at a 1578px viewport), so the budget costs no geometry read:
 *
 *   budget = columnWidth − contentWidth
 *
 * The transcript is re-centred inside the remaining box, so pushing by more
 * than that budget shrinks the reading measure itself (measured before this
 * rule: 748px → 554px at 1280 viewport, 394px at 1120 — below the official
 * `clamp(680px, …, 920px)` floor).
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
 * viewport's right edge — the same value whenever no panel is open — so the
 * panel, which paints ABOVE the rail's conversation-scoped slot, covers it.
 */
function applyRailRight(swallowed: boolean): void {
  document.documentElement.style.setProperty('--dsx-rail-right', swallowed ? '0px' : railAnchorRight())
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
   * it right by (rail −panel) lands its left edge exactly on the panel's left
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
 * Resolution order: the preferred deck — what still fits the transcript's
 * leftover margin — if nothing does, the panel takes the space and the rail is
 * COVERED by it (the rail's slot is inside the conversation, which paints below
 * the right column), or hidden when there is no panel to do the covering.
 */
function resolveRailSpace(prefs: Prefs, budget: number): RailSpace {
  const layout = resolveRailLayout(prefs, budget)
  const pad = prefs.panelPadding
  const columns = layout.constrained ? ([1, 2, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2) : layout.columns
  const side = layout.constrained ? prefs.cardSide : layout.side
  const drawW = columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2
  // A panel counts as present while it is on screen OR on its way in. Reading the
  // target alone would drop to 0 the moment a CLOSE begins, snapping the rail out
  // from under the panel at full opacity (a pop); the measured column keeps the
  // rail pinned until the panel is really gone — and by then the anchor resolves
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

/** The rail geometry that fits a budget: preferred — fewer columns — narrower — collapse. */function resolveRailLayout(prefs: Prefs, budget: number): { side: number; columns: number; railW: number; constrained: boolean } {
  const pad = prefs.panelPadding
  const wantColumns = [1, 2, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  const wantSide = prefs.cardSide
  const widthOf = (columns: number, side: number): number => (columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2)
  const wantW = widthOf(wantColumns, wantSide)
  // Before the first measurement (-1) the budget is unknown: assume the rail
  // fits, so a plugin start never flashes a collapsed deck.
  if (!(budget >= 0)) return { side: wantSide, columns: wantColumns, railW: wantW, constrained: false }
  const room = Math.max(0, budget - RAIL_BUDGET_SAFETY)
  if (room >= wantW) return { side: wantSide, columns: wantColumns, railW: wantW, constrained: false }
  // Fewer columns at the preferred card size (grid decks collapse first).
  for (const columns of [2, 1]) {
    if (columns >= wantColumns) continue
    const railW = widthOf(columns, wantSide)
    if (railW <= room) return { side: wantSide, columns, railW, constrained: false }
  }
  // One column, shrunk to what is left.
  const side = Math.floor(room - 2 * pad)
  if (side >= RAIL_MIN_SIDE) return { side, columns: 1, railW: widthOf(1, side), constrained: false }
  // Nothing fits without eating the reading measure: collapse (prefs untouched).
  return { side: wantSide, columns: 1, railW: 0, constrained: true }
}

/**
 * Whether the rail can follow the shell's column track NATIVELY through CSS
 * anchor positioning (`right: anchor(--dsx-center right)`) instead of being
 * repositioned from JS every frame. Both the rail and its magnify overlay are
 * `position: fixed` and the anchor is the AppFrame's center column
 * (`[class$='_centerCol']`, declared in widgets.module.css), so the browser
 * resolves the rail's right edge inside the very layout pass that animates
 * `grid-template-columns`: the rail and the conversation column move as ONE
 * surface — no tween, no frame lag, and none of the per-frame
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
 * containing block of the fixed rail — and an anchor outside the containing
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
}

/** Required services: the slot registry (React is a platform module). */
export const inject = ['slots']

/** One card placement of the wave deck (right-anchored, rail-content coords). */
interface WavePlace { s: number; top: number; right: number; w: number; h: number }

/**
 * The magnifying rail surface. The magnification wave is the ONLY part of the
 * rail that changes on a hover frame, so it lives in its own component: a
 * pointer move re-renders THIS component alone, and the static deck arrives as
 * an already-built `deck` element whose identity the parent keeps stable — React
 * bails out of that whole subtree instead of reconciling every card body, every
 * bridge-derived widget output and the always-mounted add panel 60 times a
 * second (measured 2026-09-13: 12.5ms p50 / 41.8ms p95 hover frames with the wave
 * inside the parent, vs 4.2ms idle).
 *
 * The enlarged copies are sized through `transform: scale()` with a top-right
 * origin rather than width/height: `placeCards` gives the focused box as
 * {top, right, w, h} with the box anchored to its right edge, which is exactly
 * what scaling the resting-size card around its top-right corner produces. Only
 * the compositor is involved per frame — no per-frame layout or repaint of seven
 * dense card subtrees.
 */
interface RailWaveProps {
  /** Prebuilt resting deck (identity-stable between pointer frames). */
  deck: React.ReactNode
  items: ReadonlyArray<{ key: string; size: WidgetSize; baseW: number; out: WidgetRenderOut; w: { id: string } }>
  side: number
  pad: number
  railW: number
  stackHeight: number
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
  cardElsRef: { current: Array<HTMLDivElement | null> }
  /** The rail is mounted on a live session (state is dropped when it is not). */
  live: boolean
  /** Rightward shift (px) so a narrower panel still covers the rail completely. */
  shiftX: number
}

function RailWave(props: RailWaveProps): React.ReactElement {
  const { deck, items, side, pad, railW, stackHeight, addRadius, active, placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor, cardElsRef, live, shiftX } = props
  const n = items.length
  // ---- Pointer focus. Realtime: the peak follows the pointer's 2D position
  //      every frame; discrete: it is snapped onto a quantized grid (row/column
  //      centres + midpoints) so the peak glides between cards and gaps.
  const [focusY, setFocusY] = React.useState<number | null>(null)
  const [focusX, setFocusX] = React.useState<number | null>(null)
  // Animation phase for the overlay's CSS size tween: entering/leaving uses a
  // short grow/shrink; FOLLOWING the pointer disables the transition so every
  // frame lands on the steady-state right-anchored geometry (a live tween would
  // linger in intermediate geometry: misaligned right edges, uneven gaps).
  const [animPhase, setAnimPhase] = React.useState<'idle' | 'grow' | 'follow' | 'shrink'>('idle')
  const animPhaseRef = React.useRef<'idle' | 'grow' | 'follow' | 'shrink'>('idle')
  const phaseTimer = React.useRef<number | undefined>(undefined)
  const schedulePhase = (next: 'grow' | 'follow' | 'shrink' | 'idle', afterMs: number): void => {
    if (phaseTimer.current !== undefined) window.clearTimeout(phaseTimer.current)
    if (afterMs <= 0) { animPhaseRef.current = next; setAnimPhase(next); return }
    animPhaseRef.current = next
    setAnimPhase(next)
    phaseTimer.current = window.setTimeout(() => {
      phaseTimer.current = undefined
      // Follow is only meaningful while still engaged; a leave that raced this
      // timer morphs into the shrink phase instead.
      const final = next === 'follow' ? (armedRef.current ? 'follow' : 'shrink') : next
      animPhaseRef.current = final
      setAnimPhase(final)
    }, afterMs)
  }
  React.useEffect(() => () => { if (phaseTimer.current !== undefined) window.clearTimeout(phaseTimer.current) }, [])
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
  /** True when the pointer lies inside any static card slot rect. */
  const hitTestCards = (clientX: number, clientY: number): boolean => {
    for (const el of cardElsRef.current) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true
    }
    return false
  }
  const moveRailFocus = (clientX: number, clientY: number, el: HTMLDivElement): void => {
    lastClientXYRef.current = { x: clientX, y: clientY }
    const rect = el.getBoundingClientRect()
    contentXRef.current = clientX - rect.left
    contentYRef.current = clientY - rect.top - 2 + el.scrollTop
    if (hitTestCards(clientX, clientY)) armedRef.current = true
    if (!armedRef.current) return
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      if (active && animPhaseRef.current !== 'follow' && animPhaseRef.current !== 'grow') {
        schedulePhase('grow', 0)
        schedulePhase('follow', 170)
      } else if (!active && animPhaseRef.current === 'idle') {
        schedulePhase('grow', 0)
        schedulePhase('follow', 170)
      }
      setFocusX(contentXRef.current)
      setFocusY(contentYRef.current)
    })
  }
  // Re-target the peak when the rail scrolls without the pointer moving.
  const railScrollSync = (el: HTMLDivElement): void => {
    if (lastClientXYRef.current === null) return
    moveRailFocus(lastClientXYRef.current.x, lastClientXYRef.current.y, el)
  }
  React.useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])
  React.useEffect(() => {
    if (live) return
    setFocusY(null); setFocusX(null)
    armedRef.current = false
    animPhaseRef.current = 'idle'
    setAnimPhase('idle')
    if (phaseTimer.current !== undefined) { window.clearTimeout(phaseTimer.current); phaseTimer.current = undefined }
  }, [live])
  // ---- Wave geometry (pure, recomputed per frame). ----
  const engaged = focusX !== null && focusY !== null && armedRef.current
  // Focus is in rail-content coordinates: rawX is the rail-box X minus the left
  // padding (card cell centres are content-relative); rawY already is.
  const rawX = (focusX ?? 0) - pad
  const rawY = focusY ?? 0
  let scaleArr = new Array(n).fill(1)
  if (engaged && n > 0) {
    scaleArr = active ? scaleFor(rawX, rawY) : scaleFor(nearest(rawX, xPts), nearest(rawY, yPts))
  }
  const focusLayout = placeCards(engaged ? scaleArr : new Array(n).fill(1))
  const focusedAdd = addSlotFor(focusLayout)
  const addCenter = { x: railW - 2 * pad - focusedAdd.right - side / 2, y: focusedAdd.top + side / 2 }
  const addScale = engaged && n > 0 ? stepScale(Math.hypot(addCenter.x - rawX, addCenter.y - rawY) / (side + pad)) : 1
  const magnifying = engaged && n > 0 && (scaleArr.some((s) => s > 1.001) || addScale > 1.001)
  // Render-body write (not an effect): the overlay's top offset reads this the
  // moment React commits, so a rail scroll never trails by a frame.
  document.documentElement.style.setProperty('--dsx-rail-scroll', `${railScrollTop}px`)
  // The size tween applies to the enter/exit phases and to the discrete style's
  // grid gliding; the realtime FOLLOW phase has no transition so every frame
  // lands directly on the steady-state geometry.
  const tweenSize = !active || animPhase === 'grow' || animPhase === 'shrink'
  const overlayTransition = tweenSize ? 'transform 0.15s var(--ds-ease-in-out)' : 'none'
  const rail = React.createElement('div', {
    className: 'dsx-stats-rail', style: { position: 'fixed', top: 'var(--dsx-rail-top,0px)', right: RAIL_RIGHT_VAR, bottom: 0, width: `${railW}px`, overflowY: 'auto', overflowX: 'visible', boxSizing: 'border-box', padding: `4px ${pad}px ${pad}px ${pad}px`, background: 'transparent', pointerEvents: 'auto', transform: `translateX(${shiftX}px)`, // Anchor mode must NOT ease `right`: the anchored value is re-resolved every
      // layout pass, and a `transition: right` would spend the whole animation
      // interpolating toward a target that keeps moving (measured: the rail
      // trailed the column by up to 600px for ~0.5s). `transform` IS eased: it
      // carries the swallow shift (panel narrower than the rail) on the shell's
      // own curve. The fallback path eases `right` too.
      ...(ANCHOR_FOLLOW
        ? { transition: 'transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)' }
        : { transition: 'right var(--ds-transition-duration-slow) var(--ds-ease-in-out), transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)' }) },
    onMouseLeave: () => {
      armedRef.current = false
      setFocusY(null); setFocusX(null)
      if (animPhaseRef.current !== 'idle' && animPhaseRef.current !== 'shrink') schedulePhase('shrink', 0)
      schedulePhase('idle', 200)
    },
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => moveRailFocus(e.clientX, e.clientY, e.currentTarget as HTMLDivElement),
    onScroll: (e: React.UIEvent<HTMLDivElement>) => { setRailScrollTop(e.currentTarget.scrollTop); railScrollSync(e.currentTarget) },
  },
    // The deck dims through a class (not a re-render): its element identity is
    // stable, so engaging the wave never reconciles the card DOM.
    React.createElement('div', { className: magnifying ? 'dsx-wave-deck dsx-wave-on' : 'dsx-wave-deck' }, deck),
  )
  // Magnify overlay: a FIXED layer rendered OUTSIDE the rail's scroll-clip box (a
  // sibling of the rail, so no ancestor overflow clips it) that paints the live
  // reflow while a card is magnified — its leftward growth shows over the
  // conversation edge instead of being cut at the rail's left boundary, and the
  // rail width (hence the conversation column) never changes. pointer-events:none
  // keeps interaction on the rail; --dsx-rail-scroll pins it to the scrolled
  // deck. Its right offset MUST be the same variable the rail uses
  // (--dsx-rightbar-w): DSH 0.1.5's right sidebar never publishes
  // --dsh-sidebar-width, so the old fallback left the overlay parked at the
  // viewport edge — 720px to the right of the rail, painting over the panel
  // (measured 2026-09-13).
  const magnifyLayer = React.createElement('div', { key: '__magnify', style: { position: 'fixed', top: 'calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px))', right: RAIL_RIGHT_VAR, width: `${railW}px`, boxSizing: 'border-box', padding: `4px ${pad}px ${pad}px ${pad}px`, pointerEvents: 'none', zIndex: 25, overflow: 'visible', background: 'transparent', transform: `translateX(${shiftX}px)`, opacity: magnifying ? 1 : 0, transition: 'opacity 0.15s ease' } },
    React.createElement('div', { key: '__mdeck', style: { position: 'relative', height: `${stackHeight}px` } },
      focusLayout.map((c, idx) => {
        const it = items[idx]
        const baseW = it.baseW
        // Resting-size box, scaled about its top-right corner: identical geometry
        // to {top, right, w: baseW*s, h: side*s}, without re-laying-out the card.
        const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${baseW}px`, height: `${side}px`, transformOrigin: 'top right', transform: `scale(${c.s.toFixed(4)})`, transition: overlayTransition, willChange: magnifying ? 'transform' : undefined, zIndex: Math.round((c.s - 1) * 50) }
        return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle },
          // Lazy body: cards render ONLY while actually magnifying. The slot div
          // stays mounted (its transform tween continues seamlessly on
          // enter/exit), but the heavy card DOM is absent at rest. The body is
          // rendered at the RESTING unit and scaled by the transform, so it is
          // built once per engage instead of once per frame.
          magnifying ? React.createElement(CardBody, { out: it.out, unit: side, width: baseW, onAction: undefined }) : null,
        )
      }),
      // Mirror the add button at its WAVE position (focusedAdd), scaled by its own
      // wave factor — it displaces with the magnified deck like a card.
      React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), tabIndex: -1, style: { position: 'absolute', top: `${focusedAdd.top.toFixed(2)}px`, right: `${focusedAdd.right.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px`, transformOrigin: 'top right', transform: `scale(${addScale.toFixed(4)})`, transition: overlayTransition, willChange: magnifying ? 'transform' : undefined, zIndex: 30 } },
        React.createElement('span', { className: 'dsx-stats-add-icon' },
          React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
        ),
        React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
      ),
    )
  )
  return React.createElement(React.Fragment, null, rail, magnifyLayer)
}

/** Normalize an arbitrary persisted/remote prefs object into a valid Prefs.
 *  Shared by localStorage loads and the authoritative host-store sync, so both
 *  channels survive schema drift identically. */
function normalizePrefs(p: Partial<Prefs>): Prefs {
  const s = { ...DEFAULTS, ...p }
  if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding
  if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide
  // Normalize one persisted entry to a valid instance key. Legacy bare widget
  // ids (pre-2×2) migrate to their 2×4 instance; unknown entries are dropped.
  const normalizeInstance = (key: string): string => {
    // v1.5.0 leak migration: sys-board shipped with its descriptor missing the
    // sizes list, so the runtime defaulted it to 2×2 while the manifest said
    // 2×4 — users installed a bogus sys-board@2x2. Remap it to the real size.
    if (key === 'sys-board@2x2') key = 'sys-board@2x4'
    const { widgetId, size } = parseInstanceKey(key)
    const w = WIDGETS.find((x) => x.id === widgetId)
    if (!w) return ''
    return sizesOf(w).includes(size) ? instanceKey(widgetId, size) : ''
  }
  // Respect the user's installed set exactly — do NOT force-append built-ins
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
  if ([1, 2, 4].indexOf(s.columns as number) === -1) s.columns = DEFAULTS.columns
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
  } catch { /* page is going away; nothing more can be done — the boot sync on the next launch converges */ }
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
  // loads — and it must never touch live-accumulated days.
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
        // Host is newer (another origin/browser saved it) — adopt + mirror locally.
        prefs = normalizePrefs(hostState)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
          localStorage.setItem(SAVED_AT_KEY, String(hostAt))
        } catch { /* ignore */ }
        emit()
      } else if (hostAt < localAt && localAt > 0) {
        // Local is newer (host file absent/stale — e.g. first run after upgrade).
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
   * old session's dock unmounts — the fresh entry then kept a stale
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
   * only changed when some unrelated event happened to re-measure — which is why
   * the rail sat still for seconds while the right sidebar's grid track animated,
   * then jumped into place. Re-binding on every measure is idempotent (observing
   * an element twice is a no-op) and self-heals whenever the shell or the
   * conversation root is re-created.
   */
  const observedEls = new Set<Element>()
  /**
   * Cached handle for the official right-bar column — the single element the
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
   * composer layout, never with the horizontal grid track — yet the composer and
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
  /** The AppFrame whose track transition drives the yield beat. */
  let frameEl: Element | null = null
  /** The drawer wrapper, so the yield can be applied on the shell's own beat. */
  let drawerEl: HTMLDivElement | null = null
  /** Debounces the budget refresh until a track movement has settled. */
  let railBudgetTimer = 0
  /**
   * The right-bar track just changed width — the movement is in flight. Predict
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
   * `grid-template-columns`). This is the earliest possible beat — the observer's
   * first delivery trails it by ~100ms — so the rail's yield lands on the same
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
   * Recompute how much room the rail may claim and, when it moved, re-render the
   * drawer with the resolved geometry. Quantised to 8px so a drag or a resize
   * does not re-render the deck per pixel.
   */
  function updateRailBudget(next = readRailBudget()): void {
    if (next === railBudget) return
    if (railBudget >= 0 && Math.abs(next - railBudget) < 8) return
    railBudget = next
    document.documentElement.style.setProperty('--dsx-rail-avail', `${next}px`)
    // Apply the yield to the DOM directly, not only through React: during the
    // track animation React's commit can land ~100ms late (the main thread is
    // busy re-laying out the columns), which is exactly the "panel first, rail
    // afterwards" beat we are removing. The next render writes the same values.
    const space = resolveRailSpace(prefs, next)
    document.documentElement.style.setProperty('--dsx-rail-w', `${space.claimW}px`)
    applyRailRight(space.swallowed)
    if (drawerEl !== null) {
      drawerEl.style.opacity = space.hidden ? '0' : '1'
      if (space.yielded) drawerEl.setAttribute('data-yielded', '')
      else drawerEl.removeAttribute('data-yielded')
    }
    emit()
  }
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
    // column — the composer dock stats bar (`.FJxK*_root` inside
    // `conversation.composer.dock`) plus its own bottom padding — so a fixed
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
    window.addEventListener('resize', onViewportResize)
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
  // followed whichever fiber re-registered last — a reload of this bundle
  // (tsdown/HMR, market toggle) pushed 组件 past the toggle to the row's right
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
      const unavailable = snap.hasSession && resolveRailLayout(snap.prefs, railBudget).constrained
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
      // provides — the selectors are optional-chained so a slice that no longer
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
      // on mount AND whenever a turn settles (`running` flips true → false).
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
        // an accurate hint → the key itself is auto-read host-side (env →
        // .credentials.yaml → .env), never user-entered in this UI.
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
        // Pull on mount (both false → first render); afterwards only a
        // completed turn (true → false) refetches, an in-flight turn does not.
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
      // ONE shared poll loop — the effective cadence is the SHORTEST refresh
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
        // (it can only ever agree by accident — it credits steps only while a
        // page is open, and older builds seeded fabricated days into it).
        // The two-layer local accounting below is the STANDALONE fallback:
        //  (a) per-step (v2): if settled assistant nodes carry `usage`, credit
        //      each step ONCE to the day its `stepStartTime` began — exact
        //      per-conversation attribution, immune to cross-midnight sessions,
        //      session switches, remounts, compaction.
        //  (b) anchor fallback (v1): if nodes lack `usage` (host did not
        //      project it into the folded surface), fall back to diffing the
        //      cumulative `tokenUsage` projection against an anchor that is
        //      rebuilt ONLY on a cumulative RESET (new session) — never on a
        //      bare "new day" — so continuing a session across midnight still
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
          // (b) anchor fallback — only when per-step nodes carried no usage AND
          // no authoritative map exists to supersede it.
          // Anchor discipline (the cross-day over-credit fix):
          //   * while per-step crediting is active, keep the anchor parked at the
          //     observed cumulative — a later fallback takeover then diffs only
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
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, timeline, runningCalls, now, snap.usageDaily, prefs.cardConfigs?.heatmap?.monthMode, prefs.cardConfigs?.heatmap?.timeZone])
      return null
    },
  ))

  // ---- Right rail panel. ----
  // Hosted inside the CONVERSATION, not in `shell.overlay`. Two reasons:
  //  1. paint order: everything in `shell.overlay` (z-20) paints ABOVE the right
  //     column's panel (z-10) — a rail there can never be covered by a panel;
  //  2. semantics: the rail is a conversation-scoped utility strip (it tracks the
  //     conversation column's edge), so the conversation's floating-overlay seat
  //     — "floating entries rendered inside the resident composer card" — is its
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
      // Static-deck card slots, handed to the wave for its card hit test. Declared
      // above the drawer early-return so the hook/ref order never changes.
      const cardElsRef = React.useRef<(HTMLDivElement | null)[]>([])
      // The add panel belongs to a live session: drop it when the session does.
      // (The wave's own focus state is dropped by RailWave on the same signal.)
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) setAddOpen(false)
      }, [snap.open, snap.hasSession])
      // ── Drawer open/close animation, matching dsh-better-sidebar's right
      //    panel: a translateX slide with --ds-transition-duration-slow +
      //    --ds-ease-in-out, applied to a position:fixed inset:0 wrapper so the
      //    rail + magnify overlay + add panel move as ONE surface. Opening
      //    glides in from the RIGHT (translateX(+travel) → 0, moving leftwards
      //    into the resting slot), closing is the reverse (0 →
      //    translateX(+travel), sliding out to the right). CSS transitions
      //    interrupt natively: a rapid re-toggle animates from the current
      //    intermediate geometry straight to the new target — no snap, no
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
              // Restored (prefs + session resolved in the same commit) — appear
              // in place; user open — glide in from the right.
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
      // leaves over (see readRailBudget): the rail may shrink (fewer columns, a
      // narrower card) and finally collapse, but it never pushes the reading
      // measure below what the user chose.
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
      // Rail width is the STATIC grid width — NO magnification overshoot. The
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
          // usage payload) must never take down the whole rail — a render
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
          if (!out) return null
          // 2×4 is exactly two 2×2 widths plus one inter-card gap.
          const baseW = size === '2x4' ? 2 * side + pad : side
          return { key, size, w, out, baseW }
        })
        .filter((it): it is RailItem => it !== null)
        // In a 1-column layout a 2×4 tile (two cells wide) cannot fit the single
        // rail column, so its instances are hidden — TEMPORARILY blocklisted,
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
      // and its CSS carries `transition: right` — deliberately on the MAIN
      // THREAD, the same animation path as the conversation column's
      // margin-right. A compositor transform (v1.2.3) never dropped frames,
      // but when the column's per-frame reflow overran a frame the rail kept
      // gliding while the column stalled — the two visibly split. Same-path
      // animation cannot split: both surfaces advance in the same style→layout
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
      //     {d0: peak, d1, d2, …, none} — a steep bell, NOT a flat gaussian, so
      //     neighbours barely grow while the hovered card is clearly the peak.
      //   - the hovered card is HARD-MAX by construction (d=0 returns the peak).
      //   - cards are sized through LAYOUT (width/height change, neighbours make
      //     room via cumulative top), not transform — so the right edge stays
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
      // (2×2 and 2×4 share the same height). A 2×4 spans two cells in width, a
      // 2×2 spans one. Cards pack left-to-right through the row's cell budget;
      // when the current row cannot fit a card (e.g. a 2×4 with only one cell
      // left), it moves to the next row, so a later 2×2 always back-fills the gap.
      const spanOf = (i: number): number => (items[i].size === '2x4' ? 2 : 1)
      const baseWOf = (i: number): number => items[i].baseW
      const rowIndexOf: number[] = []
      const colIndexOf: number[] = []
      const n = items.length
      // --- assign cards to rows (P2 packing, no gaps) ---
      if (n > 0) {
        if (multi) {
          // Greedy best-fit packing: each item lands in the EARLIEST row that has
          // room for its span, opening a new row only when none fits. A 2×4 (span
          // 2) that would leave a single-cell gap is therefore back-filled by a
          // later 2×2, so no row ever shows a hole regardless of drag order.
          const rowUsed: number[] = [0]
          for (let i = 0; i < n; i++) {
            const sp = spanOf(i)
            let placed = -1
            for (let r = 0; r < rowUsed.length; r++) {
              if (rowUsed[r] + sp <= columns) { placed = r; break }
            }
            if (placed === -1) { placed = rowUsed.length; rowUsed.push(0) }
            rowIndexOf[i] = placed
            colIndexOf[i] = rowUsed[placed]
            rowUsed[placed] += sp
          }
        } else {
          for (let i = 0; i < n; i++) { rowIndexOf[i] = i; colIndexOf[i] = 0 }
        }
      }
      const rows = (multi ? (n > 0 ? rowIndexOf[n - 1] + 1 : 0) : n)
      // --- magnification scale field ---
      // Shared stepless core: every card's scale is its own continuous Euclidean
      // distance to a focus point (rail-content coords). Both modes reuse this so
      // the posture (right-edge anchored) is identical and the right edge stays
      // flush with the rail regardless of mode.
      //  - Stepless (`active`):   focus = the pointer's live coordinates.
      //  - Discrete (`!active`):  focus = the pointer coordinates SNAPPED onto a
      //    discrete grid — the row/column centres plus the midpoints between each
      //    adjacent pair (rows → 2·rows−1 Y points, cols → 2·cols−1 X points).
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
      //   Each card is one grid-unit tall (2×2 and 2×4 share the same height =
      //   side × scale); only the width differs (2×4 is two units plus the gap).
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
            // Single column, right-anchored (2×4 collapses to 2×2 width here since
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
      // while magnifying — growth is painted by the fixed overlay), so the add
      // button and scroll height stay fixed at the resting grid.
      const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      // Add button placement, shared by the static deck and the focus overlay.
// Rows are right-anchored, so the leftover cell(s) of a short last row sit at
// the row's LEFT edge. The button parks in that gap ONLY when the STATIC gap
// is actually wide enough (leftGap >= side) — the fit decision must not
// flip under magnification (a focused row's wider cards would shrink the gap
// below `side` and jump the button to the deck bottom-right mid-hover).
// Placement itself rides the passed `layout` (static or scaled), so while
// hovering the button stays in its gap slot, gliding with the row.
// The leftmost placed card, not the last item, anchors the gap — the old code
// anchored off the last item, which for a left-packed 4-col row put the button
// on top of the row's own cards.
const addSlotFor = (layout: Array<{ s: number; top: number; right: number; w: number; h: number }>): { top: number; right: number } => {
  if (n === 0) return { top: 2 + pad, right: 0 }
  if (multi) {
    const lastRow = rowIndexOf[n - 1]
    const lastRowUsed = colIndexOf[n - 1] + spanOf(n - 1)
    if (lastRowUsed < columns) {
      // fit-check against the STATIC widths so hovering never flips the slot
      let sLeftmost = staticLayout[n - 1]
      for (let i = n - 2; i >= 0; i--) {
        if (rowIndexOf[i] !== lastRow) continue
        if (staticLayout[i].right > sLeftmost.right) sLeftmost = staticLayout[i]
      }
      const contentW = railW - 2 * pad
      if (contentW - sLeftmost.right - sLeftmost.w - pad >= side) {
        let leftmost = layout[n - 1]
        for (let i = n - 2; i >= 0; i--) {
          if (rowIndexOf[i] !== lastRow) continue
          if (layout[i].right > leftmost.right) leftmost = layout[i]
        }
        return { top: leftmost.top, right: leftmost.right + leftmost.w + pad }
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
      // Static deck: resting grid + every interactive affordance. Built HERE so
      // its element identity stays stable while the pointer moves — RailWave
      // re-renders per hover frame, and React bails out of this whole subtree
      // because the element object it receives never changes. The engage fade is
      // the `.dsx-wave-deck` class the wave puts on its wrapper (no re-render).
      const deck = React.createElement('div', { key: '__deck', style: { position: 'relative', height: `${stackHeight}px` } },
        staticLayout.map((c, idx) => {
          const it = items[idx]
          const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px` }
          return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle, ref: (el: HTMLDivElement | null): void => { cardElsRef.current[idx] = el } },
            React.createElement(CardBody, { out: it.out, unit: side, width: c.w, onAction: handleAction, onCycle: cyclePool(it.key) }),
            React.createElement('span', { className: 'dsx-stats-resize', 'aria-label': t('ui.rail.resizeAria'), onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = side; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
          )
        }),
        // Bottom add button, parked inside the deck so it shares the grid layout:
        // it fills the empty last-row cell on odd counts, or sits right-aligned
        // below the rows on even counts / single column.
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: () => setAddOpen((v) => !v), style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } },
          React.createElement('span', { className: 'dsx-stats-add-icon' },
            React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
          ),
          React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
        ),
      )
      const rail = React.createElement(RailWave, {
        key: '__wave', deck, items, side, pad, railW, stackHeight, addRadius, active,
        placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor,
        cardElsRef, live: snap.open && snap.hasSession, shiftX: space.shiftX, 
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
      const addPanel = React.createElement('div', { className: 'dsx-stats-addpanel' + (addOpen ? ' open' : ''), style: { top: 'var(--dsx-rail-top,0px)', width: `${pw}px` } },
        React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': t('ui.addPanel.resizeAria'), onPointerDown: startResize }),
        React.createElement('div', { className: 'dsx-stats-addpanel-header' },
          React.createElement('div', { className: 'dsx-stats-addpanel-title' }, t('ui.addPanel.title')),
          React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': t('ui.addPanel.closeAria'), onClick: () => setAddOpen(false) }, closeIcon),
        ),
        React.createElement('div', { className: 'dsx-stats-addpanel-body' },
          React.createElement(WidgetsPage, { controller: { prefs, setPrefs }, hideHeader: true }),
        ),
      )
      // Always render the panel too so closing slides it out (`.open` toggles
      // visibility/transform); when closed it is hidden (visibility + opacity)
      // and never intercepts pointer events over the rail.
      //
      // Drawer wrapper: the ONE surface that slides. position:fixed inset:0
      // keeps every fixed child (rail / magnify overlay / add panel) positioned
      // exactly as before — a transformed fixed ancestor becomes their
      // containing block, but this wrapper spans the viewport so the
      // coordinates are identical — while the wrapper's own translateX carries
      // the whole group. Opening glides in from the RIGHT (translateX(+travel)
      // → 0, leftwards into its resting slot); closing is the reverse (0 →
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
      // opaque and simply sits under it — that is the swallow.
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

  // ---- Rail width + stats-line toggle. ----
  ctx.effect(() => {
    const apply = (): void => {
      document.body.classList.toggle('dsx-stats-active', state.open && state.hasSession)
      // Session hand-off kill switch. The rail is a set of `position: fixed`
      // layers, so an entry that misses the session-loss emit keeps painting (and
      // capturing pointer events) over the fresh-conversation page — the React
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

