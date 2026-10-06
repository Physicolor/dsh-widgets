/**
 * dsh-widgets — rail geometry: the space the rail may claim, how cards are sized
 * inside it, and the anchors both the deck and the magnification wave read.
 *
 * Pure reads of the shell's own measurements (`--dsh-chat-*` custom properties, the
 * frame's inline grid template) plus the sizing maths — no React, no listeners, and
 * no state beyond `engagedPanelW`, which only `resolveRailSpace` touches.
 */

import { parseInstanceKey } from '../lib/contract/helpers'
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

/**
 * ── THE SHELL-METRIC MEMO: one live-document read per frame, not per caller ──
 *
 * Every reader below asks the LIVE document a question — a `getBoundingClientRect`,
 * a `getComputedStyle`, a custom property — and each of those can FORCE a style
 * recalc and a layout of the whole page, which is exactly what they do during an
 * animation, when the document is dirty by design. `resolveRailSpace` asks several
 * of them, and it is called from two hot paths that repeat the SAME question many
 * times over: a render of the rail (rail-view.tsx) and the store's subscriber (every
 * widget data emit, via the composition root's layout gate and `updateRailBudget`).
 *
 * Measured 2026-10-03 at the owner's stage (1707×1067 @ DSF 1.5, `diag-fold-gbcr.cjs`
 * counting every `getBoundingClientRect` / `getComputedStyle` the page makes while the
 * rail is toggled 8×): 167 rect reads and 97 computed-style reads, of which ~113 and
 * ~77 were OURS — `measuredRightbarWidth` 41×, `measureRailTop` 36×, `groupDurationMs`
 * (the transition duration, per fold) 41×, `planCascade` 16×, `rowFitSide` 12× — while
 * the frame time during that fold was 33ms p50 / 67ms p95 (32–46 fps on a 60Hz display).
 *
 * The answers cannot change unless the SHELL re-lays-out, and the shell says so: the
 * ResizeObserver, the viewport resize listener and the pointer-down paths in
 * `measure.ts` already exist to detect it, and they call `invalidateRailMetrics()`.
 * On top of that the cache is dropped at the end of the frame that filled it, so an
 * unobserved change can never be more than one frame stale — the same freshness the
 * per-render reads had, at a fraction of the cost.
 */
const metricCache = new Map<string, unknown>()
let metricClearRaf = 0
let metricsEpoch = 0

/**
 * Throw away every memoised shell read. Called by the observer paths in `measure.ts`
 * (a resize, a track transition, a drag) and by the frame boundary below.
 */
export function invalidateRailMetrics(): void {
  metricCache.clear()
  metricsEpoch += 1
}

/** The epoch the memo is currently serving — a cheap cache key for derived values. */
export function railMetricsEpoch(): number {
  return metricsEpoch
}

/**
 * The rail's own `top` offset, published by `measure.ts` whenever it writes
 * `--dsx-rail-top`. `-1` means "never published", i.e. fall back to reading the DOM.
 *
 * The rail is `position: fixed; top: var(--dsx-rail-top); bottom: 0`
 * (see RailWave's inline box), so its height is exactly
 * `window.innerHeight - railTop` — a subtraction on two numbers we already hold,
 * with NO layout read. `rowFitSide` used to pay `.dsx-stats-rail.clientHeight`
 * (a forced layout) for the same number on every yield beat, which is what made
 * the sidebar's `transitionrun` handler the single largest script on the open and
 * close frames (measured 2026-10-03, E1/E2 `#document.ontransitionrun`: 52–61ms open,
 * 39–83ms close — still the single largest script on those frames, so every forced
 * read inside it is what this fix targets).
 */
let notedRailTop = -1

/** Publish the rail's `top` offset (see `notedRailTop`). Path is derived, never measured. */
export function noteRailTop(top: number): void {
  notedRailTop = Number.isFinite(top) ? top : -1
}

/** Forget the published `top`, so `rowFitSide` goes back to reading the DOM. */
export function clearRailTop(): void {
  notedRailTop = -1
}

/**
 * The published rail `top`, or `-1` when it was never published.
 *
 * Callers that need the rail's HEIGHT derive it with `window.innerHeight` (see
 * `notedRailTop`): the rail's box is `top: var(--dsx-rail-top); bottom: 0`, so
 * the subtraction is exact and costs no layout read. The rail's own pane-height
 * observer used `.dsx-stats-rail.clientHeight` instead, and that read landed
 * inside the shell's React commit — a whole-document forced layout per commit
 * while the sidebar animated (measured 2026-10-03, E2 profile: 130.9ms of
 * self-time, the largest own-plugin item of the frame).
 */
export function getNotedRailTop(): number {
  return notedRailTop
}

/**
 * Memoised live-document read. `key` must be unique per question (and per element
 * identity when a reader may be handed a different host): a cache hit skips the DOM
 * call entirely.
 */
function shellRead<T>(key: string, read: () => T): T {
  if (metricCache.has(key)) return metricCache.get(key) as T
  const value = read()
  metricCache.set(key, value)
  if (metricClearRaf === 0 && typeof requestAnimationFrame === 'function') {
    metricClearRaf = requestAnimationFrame(() => {
      metricClearRaf = 0
      metricCache.clear()
      metricsEpoch += 1
    })
  }
  return value
}

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
 * (user decision 2026-09-19, replacing the flat 1.35× multiplier, which read as
 * "way too big"): the largest allowed card is the one where FIVE rows still fit
 * the rail with the last row's bottom gap equal to the right gap. At a 1000px
 * window that is (936 –6 –5·24)/5 = 162px for a 150px base —an 8% growth
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
 * How many size TIERS the deck may grow a card past the user's own base size
 * (2 = 20px).
 *
 * The 5-row ceiling alone (RAIL_MAX_ROWS) is an ABSOLUTE size: it is derived from
 * the rail's height, so its distance from the user's base depends entirely on that
 * base — 8% at the default 150px (`162`), but 60% at 100px. Combined with the
 * auto-fill (fewer columns ⇒ each remaining cell is ~50% wider) that produced the
 * reported jump: dragging 卡片基准边长 from 109 to 110 dropped the deck from 3
 * columns of 109 to 2 columns of **160** — a 1px setting change doubling the card
 * (measured 2026-10-01 with .tmp-diag3.cjs, pad 10). Bounding the automatic
 * growth to the base keeps the ceiling's own intent ("the largest allowed card",
 * not "whatever the height allows") and caps one step of the setting at 20px.
 *
 * The 5-row ceiling still wins whenever it is the tighter of the two, so the
 * documented default behaviour (150 → 160 at a 1000px window) is unchanged.
 */
const RAIL_GROWTH_TIERS = 2

/**
 * Conversation column width (px), 0 while the shell has not mounted it.
 *
 * Geometry first: the shell publishes --dsh-conversation-column-width a beat
 * AFTER a track transition settles, so a variable-only read can still see the
 * mid-flight column (measured 2026-09-17: closing the right panel left the
 * budget stuck at 0 because the read happened during that window).
 */
export function readColumnWidth(): number {
  return shellRead('columnWidth', () => {
    const columnEl = document.querySelector('[class$="_centerCol"]')
    const measured = columnEl === null ? 0 : columnEl.getBoundingClientRect().width
    if (measured > 0) return measured
    const host = document.querySelector('[data-phase]') ?? columnEl
    const cs = host === null ? null : getComputedStyle(host)
    return cs === null ? 0 : Number.parseFloat(cs.getPropertyValue('--dsh-conversation-column-width'))
  })
}

/**
 * The shell's chat measure — the width the transcript is allowed to occupy.
 *
 * TWO NAMES, both live in the wild: DSH 0.1.x publishes `--dsh-chat-content-width`
 * and DSH 0.2.x renamed it `--dsh-chat-user-width` (measured 2026-10-01 on
 * 0.2.0: the conversation root's inline style reads
 * `--dsh-conversation-column-width: 1298px; --dsh-chat-user-width: 748px`, and
 * `--dsh-chat-content-width` is GONE). Reading only the old name silently fell
 * back to the estimate below, which is 831px at a 1578px window instead of the
 * real 748px — i.e. the budget was ~83px short and the rail sat one column
 * narrow no matter how much blank the transcript left (the reported "there is
 * room for another column but it never appears").
 */
function readChatMeasure(host: Element | null): number {
  if (host === null) return Number.NaN
  // Fast path, same precedent as `readMeasure` in measure.ts: the value lives INLINE on the
  // shell's root, so reading it straight off `.style` costs no style resolution. This matters
  // on the yield beat, where `predictRailBudget` runs INSIDE the frame's `transitionrun`
  // handler: the computed-style read below resolved the whole document's styles there
  // (measured 2026-10-03: `#document.ontransitionrun` 52–61ms open / 39–83ms close).
  const inline = Number.parseFloat((host as HTMLElement).style.getPropertyValue('--dsh-chat-user-width'))
  if (Number.isFinite(inline) && inline > 0) return inline
  // One host per frame in practice (`[data-phase]`), and the value lives on the shell's
  // own root, so a single key is honest here.
  return shellRead('chatMeasure', () => {
    const cs = getComputedStyle(host)
    for (const name of ['--dsh-chat-user-width', '--dsh-chat-content-width']) {
      const v = Number.parseFloat(cs.getPropertyValue(name))
      if (Number.isFinite(v) && v > 0) return v
    }
    return Number.NaN
  })
}

/** Read the official transcript measure / column width off the conversation root. */
export function readRailBudget(): number {
  const host = document.querySelector('[data-phase]') ?? document.querySelector('[class$="_centerCol"]')
  const columnEl = document.querySelector('[class$="_centerCol"]')
  if (host === null && columnEl === null) return 0
  const columnW = readColumnWidth()
  if (!(columnW > 0)) return 0
  const content = readChatMeasure(host)
  // Fallback mirrors the official clamp when neither measure variable is present.
  const measure = Number.isFinite(content) && content > 0
    ? content
    : Math.min(920, Math.max(680, columnW * 0.64))
  return Math.max(0, Math.round(columnW - measure - RAIL_BOX_INSET))
}

/**
 * The inline `grid-template-columns` split into its TOP-LEVEL tracks.
 *
 * Whitespace inside a function (`minmax(0px, 1fr)`) is not a track separator, so
 * this scans paren depth instead of calling `split(/\s+/)`. Split naively, DSH
 * 0.2.0's track list `280px minmax(0px, 1fr) minmax(0px, 864px)` yields five
 * tokens — two of them fragments like `864px)` — and every `px` read below then
 * fails.
 */
function splitTracks(inline: string): string[] {
  const tracks: string[] = []
  let depth = 0
  let current = ''
  for (const ch of inline) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth -= 1
    if (depth === 0 && (ch === ' ' || ch === '\t' || ch === '\n')) {
      if (current !== '') { tracks.push(current); current = '' }
      continue
    }
    current += ch
  }
  if (current !== '') tracks.push(current)
  return tracks
}

/**
 * Pixel width the shell is animating ONE track toward, or null when the track
 * carries no pixel bound at all.
 *
 * DSH 0.2.0 rewrote the frame's inline tracks from plain pixels to minmax()
 * pairs (the right column is now `minmax(0px, <target>px)`, it used to be
 * `<target>px`), so the old last-token `/^([\d.]+)px$/` read returned null on
 * every measurement. That single null is the 0.2 regression this file's callers
 * were built around:
 *
 *   - `readTargetColumnWidth` could not predict the column the track is heading
 *     for, so `predictRailBudget` returned null and the yield fell back to the
 *     240ms + 520ms settle debounce — the rail hopped into the freed
 *     conversation column and snapped back under the panel ~500ms later instead
 *     of being pinned for the whole gesture;
 *   - `readTargetRightbarWidth` could not see the panel's target either, so "is
 *     a panel there" was only answered once the track had already advanced.
 *
 * `minmax(a, b)` resolves to `b` when that is a pixel value (the width the track
 * reaches when open) and to `a` otherwise: `minmax(0px, 1fr)` is the collapsed
 * middle track and must read 0, never "no answer".
 */
function trackTargetPx(track: string): number | null {
  const plain = /^([\d.]+)px$/.exec(track)
  if (plain !== null) return Number(plain[1])
  const minmax = /^minmax\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/.exec(track)
  if (minmax === null) return null
  const max = /^([\d.]+)px$/.exec(minmax[2])
  if (max !== null) return Number(max[1])
  const min = /^([\d.]+)px$/.exec(minmax[1])
  return min === null ? null : Number(min[1])
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
  const tracks = splitTracks(frame?.style.gridTemplateColumns ?? '')
  if (tracks.length < 3) return null
  const left = trackTargetPx(tracks[0])
  const right = trackTargetPx(tracks[tracks.length - 1])
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
  return shellRead('rightbarTargetW', () => {
    const frame = document.querySelector('[class$="_frame"]') as HTMLElement | null
    const tracks = splitTracks(frame?.style.gridTemplateColumns ?? '')
    if (tracks.length >= 3) {
      const target = trackTargetPx(tracks[tracks.length - 1])
      if (target !== null) return target
    }
    const column = document.querySelector('[class$="_rightbarCol"]')
    return column === null ? 0 : Math.round(column.getBoundingClientRect().width)
  })
}

/** Current right-column width (0 when no panel is on screen at all). */
function measuredRightbarWidth(): number {
  return shellRead('rightbarW', () => {
    const column = document.querySelector('[class$="_rightbarCol"]')
    return column === null ? 0 : Math.round(column.getBoundingClientRect().width)
  })
}

/** The rail's normal right inset: it follows the conversation column's right edge. */
function railAnchorRight(): string {
  return ANCHOR_FOLLOW ? `anchor(--dsx-center right, ${RIGHTBAR_FALLBACK})` : RIGHTBAR_FALLBACK
}

/**
 * Root custom-property write that skips identical values.
 *
 * Writing a custom property on `document.documentElement` invalidates every
 * declaration that depends on it, so an unconditional write buys a full-document
 * style recalc even when the value did not move. The rail's geometry is written
 * from two paths that both run on the toggle's hottest beats — the render body
 * (rail-view.tsx) and the direct-DOM yield beat (`updateRailBudget` in
 * measure.ts) — and each of them re-derives the SAME value on most passes, so an
 * unguarded write there is a per-pass document-wide invalidation for no change.
 *
 * Measured 2026-10-03 at the owner's stage (1707×1067 @ DSF 1.5, two open/close
 * cycles, `.tmp-fold-filmstrip.cjs` instrumenting `setProperty`): the rail's own
 * writes landed 20 times, of which 18 carried the value already in the style
 * declaration (`--dsx-rail-pad` 6/6 identical, `--dsx-rail-overshoot` 6/6,
 * `--dsx-rail-w` 6 of 8). Every one of those 18 was a whole-document style
 * invalidation priced into the fold's frame budget.
 *
 * Identical-value writes are what this skips; it never reorders or batches, so a
 * caller can keep writing from wherever the value is known (including a render
 * body, where React has not committed yet — see the rail's own note).
 */
export function setRailVar(name: string, value: string): void {
  const style = document.documentElement.style
  if (style.getPropertyValue(name) === value) return
  style.setProperty(name, value)
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

/**
 * The last deck geometry resolved while the rail was NOT covered, keyed by the
 * user's own deck settings (`列数:基准边长:内边距`). `resolveRailSpace` replays it
 * for the whole covered window so the cards keep their cells under the panel and
 * only the drawer's translate carries them out and back — see that function's
 * note for the measured 140↔120px shrink the raw preferences caused.
 */
let heldDeck: { key: string; side: number; columns: number } | null = null

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
  /**
   * ── A YIELDED DECK KEEPS THE GEOMETRY IT HAD ──
   *
   * While the panel covers the rail the deck is `constrained`, and the pre-yield
   * code re-derived `side`/`columns` from the raw PREFERENCES — which are the
   * deck's BASE, not the geometry it was drawing. A deck that had auto-grown to
   * three columns of 140px (the fluid share) snapped to three columns of the
   * user's 120px base for the whole covered window, so every card shrank on the
   * way under the panel and grew back on the way out. Measured 2026-10-03 on the
   * owner's stage (1707×1067 @ DSF 1.5, `diag-sidebar-deck-zoom.cjs`, one
   * open/close cycle): the slot width went 140 → 119.302 → 119.99 → 120 → … →
   * 140px across 17 distinct values, with NO `dsx-wave-run` beat involved — this
   * is the reported "组件出现异常的缩小和放大".
   *
   * Holding the last UNCONSTRAINED geometry for the yielded window removes the
   * size change from BOTH directions: the deck keeps its cells and only the
   * drawer's translate carries it out and back. The memo is keyed by the user's
   * own deck settings, so changing 列数 / 基准边长 while the panel is open — when
   * the deck is invisible anyway — still takes effect immediately rather than
   * being masked by a stale hold.
   */
  const prefKey = `${prefs.columns}:${prefs.cardSide}:${pad}`
  const held = heldDeck !== null && heldDeck.key === prefKey ? heldDeck : null
  const columns = layout.constrained
    ? (held !== null ? held.columns : ([1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2))
    : layout.columns
  const side = layout.constrained ? (held !== null ? held.side : prefs.cardSide) : layout.side
  if (!layout.constrained) heldDeck = { key: prefKey, side: layout.side, columns: layout.columns }
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
  const content = readChatMeasure(host)
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
 *   rows·side + (rows –1)·pad + 2 (deck base) + 4 (rail top padding) + pad = railHeight
 *   side = (railHeight –6 –rows·pad) / rows
 */
function rowFitSide(rows: number, pad: number): number {
  // Fast path: the rail's box is `top: var(--dsx-rail-top); bottom: 0` (fixed, border-box),
  // so its height is a SUBTRACTION once measure.ts has published the top. This is what the
  // fallback branch below already assumed; publishing the number just lets us skip the
  // `.dsx-stats-rail.clientHeight` forced layout on the yield beat (measured 2026-10-03:
  // that read was inside the `ontransitionrun` frame — 52–61ms open / 39–83ms close).
  const innerH = notedRailTop >= 0
    ? Math.max(0, window.innerHeight - notedRailTop)
    // `clientHeight` / the fallback's computed style are LAYOUT reads: memoised per frame
    // because `readMinCardSide` and `readMaxCardSide` each ask for them on every render and
    // every store emit (see the memo's note at the top of the file).
    : shellRead('railInnerH', () => {
      const rail = document.querySelector('.dsx-stats-rail')
      if (rail !== null) return rail.clientHeight
      return Math.max(0, window.innerHeight - (Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--dsx-rail-top'),
      ) || 0))
    })
  if (!(innerH > 0)) return RAIL_MIN_SIDE
  return Math.floor((innerH - 6 - rows * pad) / rows)
}

/**
 * True when every installed tile is a 2×4 (two cells wide).
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
 *   side = clamp(autoFloor, tier((room –(n+1)·gap) / n), fiveRowCeiling)
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
 * 2026-09-19 at 1578×1000: `side` stayed 150px while the budget moved
 * 372−89px), which is the reported "the widgets do not resize while I drag the
 * conversation width".
 */
export function resolveRailLayout(prefs: Prefs, budget: number, minSide: number, maxSide: number): { side: number; columns: number; railW: number; constrained: boolean } {
  const pad = prefs.panelPadding
  const base = prefs.cardSide
  const maxCols = [1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  const widthOf = (columns: number, side: number): number => (columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2)
  /** Floor onto the GLOBAL size-tier grid (100 −110 −120 …). */
  const tier = (v: number): number => Math.floor(v / CARD_SIZE_STEP) * CARD_SIZE_STEP
  // Before the first measurement (-1) the budget is unknown: assume the rail
  // fits, so a plugin start never flashes a collapsed deck.
  if (!(budget >= 0)) return { side: base, columns: maxCols, railW: widthOf(maxCols, base), constrained: false }
  const room = Math.max(0, budget - RAIL_BUDGET_SAFETY)
  // 1. auto-fill: the most columns whose cells still hold the base size.
  let columns = 1
  while (columns < maxCols && widthOf(columns + 1, base) <= room) columns++
  // A 3-column deck of 2×4 tiles seats only ONE per row (2 cells used, 1
  // wasted), which reads as a hole. That is a DEGRADATION case only: it applies
  // when the user asked for more (4) and the auto-fill landed on 3.
  if (columns === 3 && maxCols > 3 && allWideItems(prefs)) columns = 2
  // 2. the 1fr share: the leftover width split between those columns.
  const fluid = columns > 1 ? Math.floor((room - (columns + 1) * pad) / columns) : Math.floor(room - pad * 2)
  if (fluid < base) {
    // The share is below the requested base — the narrow case the floor exists
    // for. Snap the ACHIEVABLE share onto the global grid (not `base − 1 tier`,
    // which produced off-grid sizes: 121 → 111) and collapse only when even that
    // is under the automatic floor.
    const tiered = tier(fluid)
    if (tiered < minSide) return { side: base, columns: 1, railW: 0, constrained: true }
    return { side: tiered, columns, railW: widthOf(columns, tiered), constrained: false }
  }
  // 3. The size the deck would draw: the share, snapped DOWN onto the global
  //    tier grid (so every automatic size is a real tier, and growing the base
  //    can never shrink the card through a re-anchored ladder — measured before
  //    this: base 116 → 166px, base 117 → 157px), bounded by
  //      - the 5-row ceiling (`maxSide`), and
  //      - two tiers of growth past the user's own base (RAIL_GROWTH_TIERS).
  const ceiling = Math.max(base, Math.min(tier(maxSide), tier(base + RAIL_GROWTH_TIERS * CARD_SIZE_STEP)))
  const side = Math.max(base, Math.min(tier(fluid), ceiling))
  return { side, columns, railW: widthOf(columns, side), constrained: false }
}

/** Right inset the JS fallback path publishes (and the anchor fallback reads). */
const RIGHTBAR_FALLBACK = 'var(--dsx-rightbar-w, var(--dsh-sidebar-width, 0px))'
