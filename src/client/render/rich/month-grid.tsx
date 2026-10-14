/**
 * dsh-widgets — the `calendar` rich block (the 日历 card's month grid).
 *
 * WHAT IT DRAWS. The owner's reference card, in the product's own type ladder: the
 * month caption, the seven weekday headers, then the weeks — weekend/holiday days
 * in the brand blue, today as a filled blue badge, the neighbouring months' days
 * dimmed and only when the card asked for them. The GRID is the widget's (see
 * `CalendarRich`); this file only lays it out, so the calendar's "which day is it"
 * logic is one pure function away from a test and the offline render snapshot can
 * verify the grid rather than a drawing of it.
 *
 * THE 2×4 VARIANT (the same block, twice as wide). A month grid is square by nature
 * — stretching seven columns across a 2×4 would give each day a ~36px cell for an
 * 11px digit, which reads as a table, not a calendar. So the wide card keeps the
 * SQUARE grid on the left at the block's own height and spends the extra width on
 * the AGENDA column (the DSH scheduled tasks the widget folded into `agenda`). The
 * switch is WIDTH-driven, not size-driven: the renderer is handed the card's real
 * pixel width by `CardBody`, so a magnified 2×2 (a wider box) cannot be mistaken for
 * a 2×4 and the block needs no second code path to keep in step with the rail.
 *
 * WHY EVERY ROW IS AN EXPLICIT PX HEIGHT. The 2×2 tile is a FIXED box and a card
 * that overflows it is a defect the rail makes visible with a red outline
 * (`CardBody`'s tile-fits guard). A `1fr` grid would size its rows from whatever
 * height the flex column happened to hand it, so a month with SIX weeks would
 * either squeeze the text or push the card past the tile. Computing the row height
 * here — from the same box height the card's own budget is derived from — makes
 * the layout exact at every scale and every week count:
 *
 *   12(pad) + [120] + 12(pad) = 144 ≤ 150  at scale 1,
 *   and the identical identity at any other scale, because the pad and this box
 *   scale together. The card carries NO TITLE (docs/design/CARD-TITLE-STANDARD.md,
 *   T1) — its month caption lives inside this block — which is exactly what buys
 *   the extra 24px: a 6-week month used to get 11px rows, and now gets 15px.
 */

import * as React from 'react'
import type { CalendarCell, CalendarRich } from '../../lib/contract/types'

/** The rich block's height at scale 1 — the clock's own box, so the two cards
 *  sit in the rail with identical proportions (see the module docs). */
const BOX = 120
/** How wide the block must be before it splits into grid + agenda. A 2×2 body is
 *  `unit - 2·pad` wide (126px at the 150px tile) and its grid box is 120px, so
 *  1.6× the box (192px) is comfortably past any 2×2 — including a magnified one —
 *  while a 2×4 body is ~2× the unit (306px) and always over it. */
const TWO_COL_RATIO = 1.6

/** The colour of one cell, by the KIND the widget assigned it. */
function cellColor(kind: CalendarCell['kind']): string {
  switch (kind) {
    case 'accent': return 'var(--dsw-alias-state-business-primary)'
    case 'other': return 'var(--dsw-alias-label-dimmed)'
    default: return 'var(--dsw-alias-label-primary)'
  }
}

/** The day dot that marks a scheduled day.
 *
 *  A corner dot, not an underline or a second badge: the cell's height is the row
 *  height, so anything that ADDS height (a bar under the digit) would push a
 *  6-week month past the box and trip the tile-fits guard. Inside a plain cell it
 *  sits in the corner at ~2.5px; inside the TODAY badge — already a filled blue
 *  square — it is drawn in the badge's own ink so the two read as one mark. */
function markDot(marked: boolean, size: number, on: 'cell' | 'badge'): React.ReactElement | null {
  if (!marked) return null
  return React.createElement('span', {
    style: {
      position: 'absolute',
      top: on === 'badge' ? `${Math.max(1, Math.round(size * 0.4))}px` : `${Math.round(size * 0.2)}px`,
      right: on === 'badge' ? `${Math.max(1, Math.round(size * 0.4))}px` : `${Math.round(size * 0.2)}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: on === 'badge' ? '#fff' : 'var(--dsw-alias-state-business-primary)',
    },
  })
}

/**
 * The month grid.
 *
 * @param calendar - the widget's payload (see `CalendarRich`).
 * @param scale - `unit / BASE_SIDE`, the card's own scale factor.
 * @param width - the card's body width in px (a 2×4 is ~2× a 2×2); absent = the
 *   block's own square box, i.e. the single-column layout.
 */
export function MonthGrid({ calendar, scale, width }: { calendar: CalendarRich; scale: number; width?: number }): React.ReactElement {
  const box = Math.round(BOX * scale)
  const twoCol = typeof width === 'number' && width >= box * TWO_COL_RATIO
  const grid = gridColumn(calendar, scale, box)
  // A 2×4 that has NOTHING to put in the agenda column does not get an empty one:
  // the schedule subsystem can be absent from a deployment (see `ScheduleSnapshot`),
  // and the widget then ships no agenda fields at all. The wide card DEGRADES to the
  // plain month calendar it is on a 2×2 — centred, because a 120px grid hugging the
  // left edge of a 306px body would read as a broken split rather than as a card
  // with one thing in it.
  const hasAgenda = calendar.agenda !== undefined || calendar.agendaEmpty !== undefined
  if (!twoCol) return grid
  if (!hasAgenda) {
    return React.createElement('div', {
      style: { height: `${box}px`, display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden' },
    }, React.createElement('div', { style: { width: `${box}px`, flex: 'none' } }, grid))
  }
  const gap = Math.round(10 * scale)
  return React.createElement('div', {
    style: { height: `${box}px`, display: 'flex', flexDirection: 'row', width: '100%', overflow: 'hidden' },
  },
    // The grid keeps the SAME square box it has on a 2×2 — that equality is the
    // point of the split (see the module docs), so the two sizes draw one calendar.
    React.createElement('div', { style: { width: `${box}px`, flex: 'none' } }, grid),
    React.createElement('div', {
      style: { flex: 1, minWidth: 0, marginLeft: `${gap}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    }, agendaColumn(calendar, scale, box)),
  )
}

/** The square month grid (both layouts' left half). */
function gridColumn(calendar: CalendarRich, scale: number, box: number): React.ReactElement {
  const weeks = calendar.weeks
  const rows = Math.max(1, weeks.length)
  const captionH = Math.round(14 * scale)
  const headH = Math.round(12 * scale)
  // Floor, not round: the leftover pixels stay as slack under the last row rather
  // than pushing it past the box (which is what the guard would flag).
  const rowH = Math.max(8, Math.floor((box - captionH - headH) / rows))
  const dayFont = Math.max(7, Math.min(Math.round(11 * scale), rowH - 2))
  const headFont = Math.max(6, Math.min(Math.round(9 * scale), headH - 2))
  const badge = Math.max(9, Math.min(Math.round(16 * scale), rowH))
  const dot = Math.max(2, Math.round(2.5 * scale))
  const marks = calendar.marks === undefined ? null : new Set(calendar.marks)
  return React.createElement('div', {
    style: { height: `${box}px`, display: 'flex', flexDirection: 'column', width: '100%' },
    title: calendar.hint,
  },
    React.createElement('div', {
      style: {
        height: `${captionH}px`,
        fontSize: `${Math.round(11.5 * scale)}px`,
        fontWeight: 600,
        lineHeight: `${captionH}px`,
        color: 'var(--dsw-alias-label-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    }, calendar.label),
    React.createElement('div', {
      style: {
        height: `${headH}px`,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        fontSize: `${headFont}px`,
        fontWeight: 500,
        color: 'var(--dsw-alias-label-tertiary)',
      },
    }, calendar.weekdays.map((w, i) => React.createElement('div', {
      key: `w${i}`,
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    }, w))),
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: `repeat(${rows}, ${rowH}px)`,
        width: '100%',
      },
    }, weeks.flatMap((week, r) => week.map((cell, c) => {
      const key = `${r}-${c}`
      if (cell === null) return React.createElement('div', { key })
      const marked = marks !== null && marks.has(cell.day) && cell.kind !== 'other'
      if (cell.kind === 'today') {
        // Today is a filled badge, not a coloured digit: the reference card marks
        // the day with a solid rounded square and inverts its text, which is the
        // one cell on the tile that must be findable at a glance.
        return React.createElement('div', { key, style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 } },
          React.createElement('span', {
            style: {
              position: 'relative',
              width: `${badge}px`,
              height: `${badge}px`,
              borderRadius: `${Math.max(3, Math.round(badge * 0.3))}px`,
              background: 'var(--dsw-alias-state-business-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${dayFont}px`,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            },
          }, String(cell.day), markDot(marked, dot, 'badge')),
        )
      }
      return React.createElement('div', {
        key,
        style: {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${dayFont}px`,
          fontWeight: cell.kind === 'other' ? 400 : 500,
          color: cellColor(cell.kind),
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          minWidth: 0,
          overflow: 'hidden',
        },
      }, String(cell.day), markDot(marked, dot, 'cell'))
    }))),
  )
}

/** The 2×4's right-hand column: the upcoming DSH scheduled tasks. */
function agendaColumn(calendar: CalendarRich, scale: number, box: number): React.ReactElement {
  const headH = Math.round(13 * scale)
  const rowH = Math.round(17 * scale)
  const rows = calendar.agenda ?? []
  const capacity = Math.max(0, Math.floor((box - headH) / rowH))
  const shown = rows.slice(0, capacity)
  const children: React.ReactNode[] = [
    React.createElement('div', {
      key: 'h',
      style: {
        height: `${headH}px`,
        lineHeight: `${headH}px`,
        fontSize: `${Math.round(9.5 * scale)}px`,
        fontWeight: 600,
        color: 'var(--dsw-alias-label-tertiary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    }, calendar.agendaLabel ?? ''),
  ]
  if (shown.length === 0) {
    children.push(React.createElement('div', {
      key: 'e',
      style: {
        fontSize: `${Math.round(10 * scale)}px`,
        lineHeight: `${rowH}px`,
        color: 'var(--dsw-alias-label-tertiary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    }, calendar.agendaEmpty ?? ''))
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } }, children)
  }
  for (const [i, row] of shown.entries()) {
    children.push(React.createElement('div', {
      key: `r${i}`,
      style: { height: `${rowH}px`, display: 'flex', alignItems: 'center', gap: `${Math.round(6 * scale)}px`, minWidth: 0 },
    },
      React.createElement('span', {
        style: {
          // 64px at scale 1: `10/15 12:00` is 11 tabular characters — measured
          // 2026-10-14 on the gallery page, 48px cut it to `10/15 12:0`, which is a
          // date the user cannot read. `ellipsis` stays as the guard for a locale
          // that spells the column longer than this one does.
          flex: 'none',
          width: `${Math.round(64 * scale)}px`,
          fontSize: `${Math.round(9.5 * scale)}px`,
          color: 'var(--dsw-alias-label-tertiary)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      }, row.when),
      React.createElement('span', {
        style: {
          flex: 1,
          minWidth: 0,
          fontSize: `${Math.round(11 * scale)}px`,
          color: 'var(--dsw-alias-label-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        title: row.title,
      }, row.title),
    ))
  }
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } }, children)
}
