/** The `quotas` chart — body moved verbatim out of ChartBlock (Phase 3.4).
 *
 *  Geometry (owner's reference: Command Code's own USAGE LIMITS rows, and the owner's
 *  rule that a cell has to be a SQUARE — the official row's cells are ~28x26 at a
 *  740px bar width, and 24 of them across this card's 132px bar came out 3.6 x 12):
 *
 *   - The cell count follows from the width at the square pitch (see quota-fit.ts),
 *     so the cells are square rectangles instead of slivers.
 *   - The cells the reading has passed are filled, the rest keep a pale wash of the
 *     SAME tone (a track in another colour reads as a second widget).
 *   - The cell the reading lands INSIDE is filled by its exact share — a hard-stop
 *     gradient at the reading's own position, so that cell shows 70% solid / 30%
 *     pale instead of being rounded away.
 *   - The rows sit on the card's floor and the height left over by the square cells
 *     becomes the gap under the balance figure, so the head never crowds the first
 *     label.
 */

import * as React from 'react'
import { CHART_TONES } from './theme'
import { quotaGeometry } from './quota-fit'
import type { QuotaGeometry } from './quota-fit'
import type { ChartProps } from './types'

/** Drawn before the first measurement (a surface without ResizeObserver). */
const FALLBACK: QuotaGeometry = { cells: 12, gap: 2, barH: 9 }

/**
 * The bar geometry for the space this chart actually has.
 *
 * Measures its own box once per size (and re-measures when the box changes), then
 * hands the numbers to `quotaGeometry`. The label's line height is read from the row's
 * own DOM so the head's scale, the localized label and the browser's font metrics are
 * all included. No loop is possible: this hook only READS, and the box it measures
 * takes its height from the card's leftover space, never from the value it reports.
 *
 * @param rowRef - the first row, whose label line is the overhead sample.
 * @param rows - how many quota rows are drawn.
 * @param scale - the card scale factor.
 * @returns the box ref to attach, and the geometry (null until measured).
 */
function useFittedGeometry(rowRef: React.RefObject<HTMLDivElement | null>, rows: number, scale: number): { boxRef: React.RefObject<HTMLDivElement | null>; geom: QuotaGeometry | null } {
  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const [geom, setGeom] = React.useState<QuotaGeometry | null>(null)
  React.useLayoutEffect(() => {
    const el = boxRef.current
    if (el === null || typeof ResizeObserver === 'undefined') return
    const measure = (): void => {
      const labelH = rowRef.current?.firstElementChild?.getBoundingClientRect().height ?? Math.round(10 * scale)
      const next = quotaGeometry(el.clientWidth, el.clientHeight, rows, labelH, scale)
      setGeom((prev) => (prev !== null && prev.cells === next.cells && prev.gap === next.gap && prev.barH === next.barH ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (rowRef.current !== null) ro.observe(rowRef.current)
    return () => ro.disconnect()
  }, [rowRef, rows, scale])
  return { boxRef, geom }
}

export function QuotasChart({ chart, scale }: ChartProps): React.ReactElement | null {
  const quotas = chart.kind === 'quotas' ? chart.quotas : undefined
  const count = quotas?.length ?? 0
  const rowRef = React.useRef<HTMLDivElement | null>(null)
  const { boxRef, geom } = useFittedGeometry(rowRef, count, scale)
  if (quotas === undefined || count === 0) return null
  const { cells, gap, barH } = geom ?? FALLBACK
  // `density` (see WidgetChart) scales the label line and the gaps for a card with
  // vertical room to spend; the cell count and the square size come from the box.
  const density = Math.min(1.6, Math.max(0.8, chart.density ?? 1))
  const labelPx = Math.round(9 * scale * density)
  const innerGap = Math.max(1, Math.round(2 * scale * density))
  const rowGap = Math.max(1, Math.round(3 * scale * density))
  const cellGap = Math.max(1, Math.round(gap * density))
  const rows = quotas.map((q, i) => {
    const pct = Math.max(0, Math.min(100, q.pct))
    const tone = CHART_TONES[q.tone ?? 'primary'] ?? CHART_TONES.primary
    // Cell `c` covers [c, c + 1) of the row; the reading's own position says how much
    // of the cell it lands in. `cross === cells` means a full bar, which has no
    // boundary cell.
    const at = (pct / 100) * cells
    const cross = Math.floor(at)
    const crossPct = (at - cross) * 100
    // The boundary cell carries BOTH inks in one gradient: its filled share at the
    // full 92% edge, its remainder at the 14% wash the empty cells use. Both alphas
    // are baked into the gradient COLOURS (`color-mix(..., transparent)`) instead of
    // being applied as the element's `opacity`, because one opacity cannot express
    // two inks — with `opacity: 0.92` and a `transparent` stop the remainder came out
    // as bare CARD BACKGROUND (the owner's report, 2026-09-29: 「左边一小部分是深
    // 绿色，另外一边也要填充浅绿色，不能是白色」, on both this card and 磁盘).
    //
    // NO corner radius: the owner's call is the official site's sharp rectangle — a 2px
    // round on a 10px cell reads as a blob rather than a block.
    const ink = (alpha: number): string => `color-mix(in srgb, ${tone} ${alpha}%, transparent)`
    const cellStyle = (c: number): React.CSSProperties =>
      c < cross
        ? { flex: 1, minWidth: 0, height: '100%', background: tone, opacity: 0.92 }
        : c === cross && crossPct > 0
          ? { flex: 1, minWidth: 0, height: '100%', backgroundColor: 'transparent', backgroundImage: `linear-gradient(90deg, ${ink(92)} ${crossPct.toFixed(2)}%, ${ink(14)} ${crossPct.toFixed(2)}%)`, backgroundRepeat: 'no-repeat' }
          : { flex: 1, minWidth: 0, height: '100%', background: tone, opacity: 0.14 }
    const cellEls = Array.from({ length: cells }, (_, c) => React.createElement('div', { key: c, style: cellStyle(c) }))
    return React.createElement('div', { key: i, ref: i === 0 ? rowRef : undefined, style: { display: 'flex', flexDirection: 'column', gap: innerGap, minHeight: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, minWidth: 0 } },
        React.createElement('span', { style: { fontSize: `${labelPx}px`, lineHeight: 1.15, fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, q.label),
        React.createElement('span', { style: { fontSize: `${labelPx}px`, lineHeight: 1.15, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none' } }, `${Math.round(pct)}%`),
      ),
      React.createElement('div', { style: { display: 'flex', gap: cellGap, width: '100%', height: `${barH}px`, flex: 'none' } }, ...cellEls),
    )
  })
  return React.createElement('div', { ref: boxRef, style: { display: 'flex', flexDirection: 'column', gap: rowGap, width: '100%', flex: 1, minHeight: 0, justifyContent: 'flex-end' } }, ...rows)
}
