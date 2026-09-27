/**
 * dsh-widgets — the magnification wave's placement geometry.
 *
 * Pure maths over the deck's inputs: given the installed items and the resolved
 * grid (side / pad / columns / railW), it answers three questions — how far each
 * card scales for a focus point, where every card ends up at a given scale array,
 * and where the add button parks.
 *
 * Moved out of `client/index.ts` (Phase 2.7) with its body unchanged: `RailWave`
 * RECEIVES these functions as props (the wave component owns the interaction, the
 * caller owns the layout), so the maths is the natural seam between them.
 */

import type { WidgetSize } from '../../lib/contract'

/** One card in a laid-out deck: scale and the resulting box, right-edge anchored. */
export interface RailPlace { s: number; top: number; right: number; w: number; h: number }

/** What the geometry needs from the deck it describes. */
export interface WaveGeometryInput {
  items: ReadonlyArray<{ size: WidgetSize; baseW: number }>
  side: number
  pad: number
  columns: number
  railW: number
  multi: boolean
  /** Peak magnification factor (prefs.magnify). */
  magnify: number
  /** Real-time (pointer-continuous) magnification (prefs.realTime). */
  realTime: boolean
}

/** Everything the deck and the wave read out of the geometry. */
export interface WaveGeometry {
  rows: number
  active: boolean
  deckBottom: number
  staticLayout: RailPlace[]
  stepScale: (d: number) => number
  scaleFor: (fx: number, fy: number) => number[]
  placeCards: (sc: number[]) => RailPlace[]
  nearest: (v: number, pts: number[]) => number
  xPts: number[]
  yPts: number[]
  addSlotFor: (layout: RailPlace[]) => { top: number; right: number }
}

export function createWaveGeometry(input: WaveGeometryInput): WaveGeometry {
  const { items, side, pad, columns, railW, multi, magnify, realTime } = input
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
      const peakScale = magnify
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
      const active = realTime
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
          // Row LISTS, not just a used-cell counter: the 3-column rounding rule
          // below has to re-seat a card that is already placed.
          const rowItems: number[][] = [[]]
          const rowUsed = (r: number): number => rowItems[r].reduce((sum, k) => sum + spanOf(k), 0)
          const place = (i: number, allowRound: boolean): void => {
            const sp = spanOf(i)
            // Greedy best-fit: the EARLIEST row that still has room for the span.
            // A later 2×2 always back-fills a hole a 2×4 left behind.
            for (let r = 0; r < rowItems.length; r++) {
              if (rowUsed(r) + sp <= columns) { rowItems[r].push(i); return }
            }
            // 3-column rounding ("类似四舍五入", user decision 2026-09-18): with
            // three cells, a 2×4 that cannot start in the cells left in the last
            // row moves ONE SLOT EARLIER —it takes the first narrow card's place
            // and the narrow card(s) it displaces are re-booked behind it (they
            // back-fill the next row). Without this the wide card opens a new row
            // and the row above keeps a hole, which reads as "the 2×4 got cut off".
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
      //    adjacent pair (rows −2·rows– Y points, cols −2·cols– X points).
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

  return { rows, active, deckBottom, staticLayout, stepScale, scaleFor, placeCards, nearest, xPts, yPts, addSlotFor }
}