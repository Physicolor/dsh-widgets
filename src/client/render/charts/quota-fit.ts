/**
 * dsh-widgets — the `quotas` chart's cell geometry.
 *
 * Pure numbers, kept out of the renderer so they can be reasoned about (and pinned by
 * the render snapshot) on their own. Three things drove this shape:
 *
 *  1. FIT — the card is a fixed tile. The credit card's head (title + balance) is
 *     fixed too, so a bar that only asked for its own height overflowed and the
 *     tile-fits guard drew its red outline (measured 2026-09-29: 172.8px in a 160px
 *     slot).
 *  2. SQUARE CELLS — the owner's ask, twice: the cells are the official row's own
 *     rectangles, and a rectangle has to be squarish to read as one. 24 cells across
 *     a 132px bar gave 3.6 x 12px slivers; the count is therefore DERIVED from the
 *     height that actually fits (`cells ≈ width / (cell + gap)`), so the cells come
 *     out square instead of the count being fixed.
 *  3. BREATHING ROOM — the rows must not start on the balance figure's baseline. The
 *     square size IS the vertical fit (see `quotaGeometry`), so whatever height is
 *     left over after the rows is spent as a gap above the first row, and
 *     `quotaBarHeight` never lets the rows grow into the head.
 */

/** A cell never goes below this: past it the card is simply too short. */
export const QUOTA_MIN_BAR = 6
/** Cells in one row, bounded so a wide 2x4 tile does not turn into graph paper. */
export const QUOTA_MIN_CELLS = 6
export const QUOTA_MAX_CELLS = 32
/** Gap between two cells, as a fraction of a cell (the official 28px cell / 3px gap). */
export const QUOTA_GAP_RATIO = 0.18
/** Gap between a row's label line and its bar, and between two rows (scale 1 px). */
export const QUOTA_INNER_GAP = 2
export const QUOTA_ROW_GAP = 3
/** Least space between the head and the first row (scale 1 px). */
export const QUOTA_BREATHING = 6

/** One row's geometry: how many cells, how wide apart, how tall the bar is. */
export interface QuotaGeometry {
  cells: number
  gap: number
  barH: number
}

/**
 * The bar height and cell count for a `barW` x `boxH` box holding `rows` rows.
 *
 * `boxH` is what the chart actually gets (the card's leftover height, measured in the
 * DOM). The tallest SQUARE cell that fits vertically is the target, then the cell
 * count follows from the width — so a wide tile gets more cells rather than wider
 * ones, and a short card gets fewer rather than flatter ones.
 *
 * @param barW - the bar's own width in px.
 * @param boxH - the height available to the whole chart in px.
 * @param rows - how many quota rows are drawn.
 * @param labelH - one row's label line height in px (measured in the DOM).
 * @param scale - the card scale factor (`side / BASE_SIDE`).
 */
export function quotaGeometry(barW: number, boxH: number, rows: number, labelH: number, scale: number): QuotaGeometry {
  const gap = Math.max(1, Math.round(1.6 * scale))
  const inner = Math.max(1, Math.round(QUOTA_INNER_GAP * scale))
  const rowGap = Math.max(1, Math.round(QUOTA_ROW_GAP * scale))
  const breath = Math.max(0, Math.round(QUOTA_BREATHING * scale))
  if (!Number.isFinite(boxH) || rows <= 0 || !Number.isFinite(barW) || barW <= 0) return { cells: QUOTA_MIN_CELLS, gap, barH: QUOTA_MIN_BAR }
  // The tallest square cell the box can hold: one row is label + inner gap + cell,
  // the rows are `rowGap` apart, and the chart keeps `breath` clear under the head.
  const usable = boxH - breath - (rows - 1) * rowGap - rows * (labelH + inner)
  const square = Math.max(QUOTA_MIN_BAR, Math.floor(usable / rows))
  // With the square size known, the count is whatever fills the WIDTH at that pitch.
  const cells = Math.min(QUOTA_MAX_CELLS, Math.max(QUOTA_MIN_CELLS, Math.round((barW + gap) / (square + gap))))
  const cellW = (barW - (cells - 1) * gap) / cells
  // Square in both directions: never taller than wide (that is the sliver the owner
  // reported) and never taller than the box (that is the overflow the guard reports).
  const barH = Math.max(QUOTA_MIN_BAR, Math.min(square, Math.round(cellW)))
  return { cells, gap, barH }
}
