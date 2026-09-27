/**
 * Harness Widgets — React components (plain createElement, no JSX).
 *
 * All surfaces receive a `WidgetsController` (prefs + setPrefs) and the live
 * usage data. Components are pure presentation over those props; the apply
 * closure owns state and slot registration.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { WIDGETS } from './generated.registry'
import {
  badgeOf, groupOf, instanceKey, parseInstanceKey, sizesOf,
  widgetName, widgetDesc, widgetSimToggle, fieldLabel, optionLabel,
  type UsageData, type WidgetRenderOut, type WidgetAction, type WidgetRich, type ConfigField, type WidgetStats, type WidgetSize, type WidgetRenderMeta,
} from './lib/contract'
import { PREVIEW_STATS } from './render/preview/preview-stats'
import { nextSim } from './render/preview/sim'
import { CardBody } from './render/CardBody'
import { CORNER_GEARS } from './render/card-geometry'
import { DEFAULT_CORNER_PERCENT, type Prefs } from './runtime/prefs'
import { t } from './i18n'

/** The controller handed to every component. */
export interface WidgetsController {
  prefs: Prefs
  setPrefs: (patch: Partial<Prefs>) => void
  /** 组件配置 tells the PANEL when its detail drawer opens/closes, so the panel
   *  can widen by the drawer's own width instead of splitting the existing one
   *  (the user's rule: opening the preview adds width). */
  onDetailToggle?: (open: boolean) => void
  /** The drawer's final width, when the host knows it (the add panel computes it
   *  from its own target width). With it the preview is laid out at its FINAL
   *  size from the first frame and the drawer's growing box reveals it — no
   *  small-to-large zoom while the panel animates. The settings page does not
   *  know it and falls back to the measured width. */
  detailWidth?: number
  /** The rail's CURRENT tile side. The rail auto-sizes its columns, so this is
   *  not always `prefs.cardSide` — and the preview must be laid out at exactly
   *  this unit for its padding/gaps to be byte-identical to the real card (only
   *  scaled). */
  railSide?: number
}

// ---- Icons (official ui-primitives paths) ----

const GripIcon = (): React.ReactElement => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M5 3.5h1.5v1.5H5zM9.5 3.5H11v1.5H9.5zM5 7.25h1.5v1.5H5zM9.5 7.25H11v1.5H9.5zM5 11h1.5v1.5H5zM9.5 11H11v1.5H9.5z', fill: 'currentColor' }))

const TRASH_PATH = 'M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z'

const TrashIcon = (): React.ReactElement => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: TRASH_PATH, fill: 'currentColor' }))

const CHEV_LEFT = 'M8.5 2.15137L8.07617 2.57617L5.34863 5.30273C5.09294 5.55843 4.86618 5.78438 4.70215 5.98828C4.53117 6.20088 4.38244 6.44405 4.33398 6.75C4.30778 6.91565 4.30778 7.08435 4.33398 7.25C4.38244 7.55595 4.53117 7.79912 4.70215 8.01172C4.86618 8.21561 5.09294 8.44157 5.34863 8.69727L8.07617 11.4238L8.5 11.8486L9.34863 11L8.92383 10.5762L6.19727 7.84863C5.92268 7.57405 5.75151 7.40124 5.6377 7.25977C5.53096 7.12709 5.52187 7.07728 5.51953 7.0625C5.51297 7.02105 5.51297 6.97895 5.51953 6.9375C5.52187 6.92272 5.53096 6.87291 5.6377 6.74023C5.75152 6.59876 5.92268 6.42595 6.19727 6.15137L8.92383 3.42383L9.34863 3L8.5 2.15137Z'

const CHEV_RIGHT = 'M5.5 2.15137L5.92383 2.57617L8.65137 5.30273C8.90706 5.55843 9.13382 5.78438 9.29785 5.98828C9.46883 6.20088 9.61756 6.44405 9.66602 6.75C9.69222 6.91565 9.69222 7.08435 9.66602 7.25C9.61756 7.55595 9.46883 7.79912 9.29785 8.01172C9.13382 8.21561 8.90706 8.44157 8.65137 8.69727L5.92383 11.4238L5.5 11.8486L4.65137 11L5.07617 10.5762L7.80273 7.84863C8.07732 7.57405 8.24849 7.40124 8.3623 7.25977C8.46904 7.12709 8.47813 7.07728 8.48047 7.0625C8.48703 7.02105 8.48703 6.97895 8.48047 6.9375C8.47813 6.92272 8.46904 6.87291 8.3623 6.74023C8.24848 6.59876 8.07732 6.42595 7.80273 6.15137L5.07617 3.42383L4.65137 3L5.5 2.15137Z'

const ChevronLeftIcon = (): React.ReactElement => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: CHEV_LEFT, fill: 'currentColor' }))
const ChevronRightIcon = (): React.ReactElement => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: CHEV_RIGHT, fill: 'currentColor' }))
/** Close glyph for the 组件配置 preview drawer (same shape as the panel's own). */
const closeIconSmall = React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z', fill: 'currentColor' }),
)
/** Market view toggle + the search field's leading magnifier (official shapes). */
const listViewIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M2.5 4.25h11M2.5 8h11M2.5 11.75h11', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
)
const gridViewIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('rect', { x: 2.5, y: 2.5, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
  React.createElement('rect', { x: 8.9, y: 2.5, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
  React.createElement('rect', { x: 2.5, y: 8.9, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
  React.createElement('rect', { x: 8.9, y: 8.9, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
)
const searchIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('circle', { cx: 7, cy: 7, r: 4.6, stroke: 'currentColor', strokeWidth: 1.5 }),
  React.createElement('path', { d: 'M10.6 10.6L14 14', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
)

/** 组件市场's hero (FLIP) transition toggle.
 *
 *  OFF by design: the market ⇄ preview move is a SHARED-AXIS push (the gallery
 *  slides left, the preview slides in from the right). A card that additionally
 *  flies on its own reads as a second, conflicting motion — the user's call
 *  (2026-09-27): 「其他都是右边弹出、瀑布流向左平移，却有一个组件在做 FLIP，
 *  视觉上非常割裂」. The implementation is kept intact (ZoomGhost + `.dsx-zoomghost`
 *  + `openGroup`'s seed) so it can be switched back on here, or reused elsewhere,
 *  the day a surface wants a card-expand instead of a push. */
const MARKET_HERO = false

/** The simulated render output for a widget instance — shared by the market's
 *  stage and its gallery tiles, so a tile shows exactly what the stage shows.
 *  Widget-owned example stats ride over the shared preview stats, and the
 *  instance's own config rides along like the rail's render does. */
function exampleOut(w: (typeof WIDGETS)[number], size: WidgetSize, prefs: Prefs, sim?: Record<string, unknown> | null): WidgetRenderOut | null {
  const key = instanceKey(w.id, size)
  const ex = w.example
  const exStats = ex?.stats ? (typeof ex.stats === 'function' ? ex.stats(prefs.cardConfigs?.[key] ?? {}) : ex.stats) : {}
  const stats = { ...PREVIEW_STATS, ...exStats, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0]
  const effSim = sim ?? ex?.sim ?? null
  // Preview isolation: a crashing widget render must not take the surface down.
  try {
    return w.render(stats, { size, ...(effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}) })
  } catch (error) {
    console.error(`[dsh-widgets] preview render crashed for ${w.id}:`, error)
    return null
  }
}

/** 组件配置's two column widths + the gutter between them. LIST_W is the
 *  installed list's fixed column; DETAIL_W is the drawer's MINIMUM width — the
 *  panel is sized to fit both, and any extra width goes to the drawer (preview +
 *  metric columns), so a wide panel never leaves a dead band on the right.
 *  COL_GAP is copied from the OFFICIAL settings window (measured 2026-09-26: nav
 *  164px, content 612px, a 12px gutter between them, rows padded 12/16) — the
 *  same relative language, our own absolute sizes. */
export const LIST_W = 190
export const DETAIL_W = 440
export const COL_GAP = 12

/** The instance 组件配置 had open. Module scope on purpose: closing the add
 *  panel and reopening it must come back the way the user left it — the panel is
 *  unmounted with the session, and component state would be lost with it. */
let lastSelectedInstance = ''

// ---- Order list (config tab) ----

function OrderList({ items, onMove, onRemove, onSelect, selected }: {
  items: string[]
  onMove: (next: string[]) => void
  onRemove?: (id: string) => void
  onSelect?: (id: string) => void
  selected?: string
}): React.ReactElement {
  const dragIdx = React.useRef<number | null>(null)
  // Where a drop would land: the row's index and which side of it.
  const [drop, setDrop] = React.useState<{ idx: number; after: boolean } | null>(null)
  /** Insert the dragged row before/after the target row. */
  const dropOn = (target: number, after: boolean): void => {
    const from = dragIdx.current
    dragIdx.current = null
    setDrop(null)
    if (from === null || from === target) return
    const next = items.slice()
    const held = next.splice(from, 1)[0]
    const at = next.indexOf(items[target]!)
    if (at < 0) return
    next.splice(after ? at + 1 : at, 0, held!)
    if (next.join(',') !== items.join(',')) onMove(next)
  }
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
    items.map((id, i) => {
      const { widgetId, size } = parseInstanceKey(id)
      const w = WIDGETS.find((x) => x.id === widgetId)
      if (!w) return null
      const isSel = selected === id
      const isDropTarget = drop !== null && drop.idx === i
      return React.createElement('div', {
        key: id,
        // NO drag handle (the official session rows have none either): the row
        // itself is the handle, and the insertion indicator below is the
        // product's own blue arrow-line. The previous grip lived on the LEFT
        // while the metrics picker's lived on the right — two lists in one
        // panel teaching two different gestures.
        className: 'dsx-order-row' + (isSel ? ' selected' : '')
          + (dragIdx.current === i ? ' is-dragging' : '')
          + (isDropTarget && !drop!.after ? ' dsx-drop-before' : '')
          + (isDropTarget && drop!.after ? ' dsx-drop-after' : ''),
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          dragIdx.current = i
          e.dataTransfer.effectAllowed = 'move'
          try { e.dataTransfer.setData('text/plain', id) } catch { /* older engines */ }
          if (typeof e.dataTransfer.setDragImage === 'function') e.dataTransfer.setDragImage(e.currentTarget, 24, 15)
        },
        onDragEnd: () => { dragIdx.current = null; setDrop(null) },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          const after = e.clientY > rect.top + rect.height / 2
          setDrop((prev) => (prev !== null && prev.idx === i && prev.after === after ? prev : { idx: i, after }))
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          // Re-derive the side from THIS event: dragover and drop arrive back to
          // back and React batches the dragover's setState, so the state can
          // still hold the previous side (see the metrics picker).
          const rect = e.currentTarget.getBoundingClientRect()
          dropOn(i, e.clientY > rect.top + rect.height / 2)
        },
        onDragLeave: () => setDrop((prev) => (prev !== null && prev.idx === i ? null : prev)),
        onClick: onSelect ? () => onSelect(id) : undefined,
      },
        // The name owns the row and ellipsizes in the narrow left column, so it
        // carries a title — a truncated 「会…」 must still be identifiable on
        // hover. The source badge (系统/外部) is dropped in THIS list: at 190px
        // it was the thing that squeezed the name to two characters, and the
        // market row already shows it.
        React.createElement('span', { title: widgetName(w), style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, widgetName(w)),
        React.createElement('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', flex: 'none' } }, size === '2x4' ? '2×4' : '2×2'),
        onRemove ? React.createElement('button', { type: 'button', className: 'dsx-trash', 'aria-label': t('order.removeAria'), title: t('order.removeTitle'), onClick: () => { if (onSelect && selected === id) onSelect('') ; onRemove(id) } }, React.createElement(TrashIcon)) : null,
      )
    }),
  )
}

// ---- Config tab ----

function ConfigFieldControl({ field, value, onChange }: { field: ConfigField; value: unknown; onChange: (v: unknown) => void }): React.ReactElement {
  if (field.type === 'text' || field.type === 'textarea') {
    const Tag = field.type === 'textarea' ? 'textarea' : 'input'
    const isTextarea = field.type === 'textarea'
    return React.createElement(Tag, {
      type: isTextarea ? undefined : 'text',
      rows: isTextarea ? 3 : undefined,
      className: 'dsx-search', style: { marginBottom: 0, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13 },
      placeholder: fieldLabel(field),
      value: typeof value === 'string' ? value : (field.default as string ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    })
  }
  if (field.type === 'toggle') {
    const on = typeof value === 'boolean' ? value : (field.default === true)
    return React.createElement('label', { className: 'dsx-switch-row', title: fieldLabel(field) },
      React.createElement('input', { type: 'checkbox', className: 'dsx-switch-input', checked: on, onChange: (e) => onChange(e.target.checked) }),
      React.createElement('span', { className: 'dsx-switch-track', 'aria-hidden': true }, React.createElement('span', { className: 'dsx-switch-thumb' })),
    )
  }
  if (field.type === 'align' || field.type === 'valign') {
    const opts = field.type === 'align' ? ['left', 'center', 'right'] : ['top', 'center', 'bottom']
    const labels = field.type === 'align' ? [t('align.left'), t('align.center'), t('align.right')] : [t('align.top'), t('align.center'), t('align.bottom')]
    const cur = (typeof value === 'string' && opts.indexOf(value) !== -1) ? value : (field.default as string ?? opts[0])
    return React.createElement('div', { style: { display: 'flex', gap: 4 } },
      opts.map((o, i) => {
        const active = cur === o
        return React.createElement('button', { key: o, type: 'button', className: 'dsx-btn' + (active ? ' dsx-btn-primary' : ''), onClick: () => onChange(o), style: { minWidth: 40 } }, labels[i])
      }),
    )
  }
  if (field.type === 'mode') {
    // Dropdown selector (not segmented buttons): a real, native <select> styled
    // like the DSH "selector" picker, so the option list opens as a menu.
    const opts = field.options ?? [['a', 'A'], ['b', 'B']]
    const cur = (typeof value === 'string' && opts.some(([v]) => v === value)) ? value : (field.default as string ?? opts[0][0])
    return React.createElement('select', {
      className: 'dsx-select',
      value: cur,
      title: fieldLabel(field),
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
    },
      opts.map(([o, label]) => React.createElement('option', { key: o, value: o }, optionLabel([o, label]))),
    )
  }
  if (field.type === 'metrics') {
    // Multi-select + ORDER. Rendered by its own component so the hooks below
    // (drag state) live on a stable component type instead of after this
    // function's other type branches.
    return React.createElement(MetricsFieldControl, { field, value, onChange })
  }
  return React.createElement(React.Fragment)
}

/**
 * `ConfigField` type 'metrics' — pick which numbers a card shows, and drag them
 * into order.
 *
 * The row is the iOS settings shape read left to right: the NAME owns the left
 * edge, the SWITCH is the row's control on the right, and the reorder GRIP sits
 * at the far right (the same affordance iOS puts at the edge of an editable
 * list). Dragging is HTML5 DnD, with the drop position decided by which half of
 * the target row the pointer is in (iOS insertion semantics), a live insertion
 * bar, and the dragged row lifting out of the list while it moves.
 *
 * The stored value is an ordered ARRAY of option keys, so the card renders
 * exactly the numbers the user ticked, left to right. Anything not in the
 * option list is dropped on read — a metric renamed or removed in a later build
 * can never wedge the card with a key nobody renders.
 */
function MetricsFieldControl({ field, value, onChange }: { field: ConfigField; value: unknown; onChange: (v: unknown) => void }): React.ReactElement {
  const opts = field.options ?? []
  const max = typeof field.max === 'number' && field.max > 0 ? field.max : 6
  // An UNCONFIGURED card falls back to the field's own default, exactly like
  // the toggle/mode fields do — otherwise the form would read "0 picked" while
  // the card it configures is happily rendering the default four.
  const stored = Array.isArray(value) ? value : (Array.isArray(field.default) ? field.default : [])
  const picked = (stored as unknown[])
    .filter((v): v is string => typeof v === 'string' && opts.some(([o]) => o === v))
  // Where a drop would land: `{ key, after }` names the row and the side.
  const [drop, setDrop] = React.useState<{ key: string; after: boolean } | null>(null)
  const dragging = React.useRef<string | null>(null)
  // A press that starts ON the switch must not become a row drag: the switch is
  // the row's control, and every other gesture in the row reorders it. The
  // official session rows have no such child; a row with a toggle has to say so.
  const onSwitch = React.useRef(false)
  /**
   * The ON group sits on TOP, in CARD order, and the OFF group below it.
   *
   * The list used to render the catalog order with the picked rows scattered
   * through it, so what the form showed was never the order the card printed —
   * the user had to remember which of twelve switches came first. Grouping
   * makes the list itself the answer: read the top group downwards and that IS
   * the card, left to right.
   *
   * A row that is switched OFF lands at the TOP of the OFF group (`offOrder`),
   * so the movement is one step in one direction — the user's own rule: "关闭
   * 后它向下移动到所有已关闭指标的第一个".
   */
  const [offOrder, setOffOrder] = React.useState<string[]>(() => opts.map(([k]) => k).filter((k) => !picked.includes(k)))
  const displayKeys = [
    ...picked,
    ...offOrder.filter((k) => !picked.includes(k)),
    ...opts.map(([k]) => k).filter((k) => !picked.includes(k) && !offOrder.includes(k)),
  ]
  // Responsive: the list splits into two columns (ON | OFF) only when the drawer
  // is wide enough for two readable rows side by side; below that it falls back
  // to the single stacked column. Measured in a LAYOUT effect (before paint) so
  // the first painted frame is already the final layout — an effect-based measure
  // painted one single-column frame and then snapped to two columns, which the
  // user saw as "自定义选项出现动画效果" (reported 2026-09-26).
  const metricsRef = React.useRef<HTMLDivElement | null>(null)
  const [pickW, setPickW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = metricsRef.current
    if (el === null) return
    const measure = (): void => setPickW((prev) => (Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // FLIP: a row that changes group must MOVE, not jump — and with two columns it
  // can move SIDEWAYS as well as up, so both axes are animated (the product's
  // motion token, so the form moves like the rest of the UI).
  //
  // Two cases must NOT animate, because the rows did not really move:
  //   * the first layout (nothing to animate FROM), and
  //   * a change of COLUMN MODE (single ⇄ two columns) — that is the list settling
  //     into place, and animating it is the "自定义区域自己动了一下" the user
  //     reported. `prevTwoCol` tracks the mode.
  //
  // The FLIP baseline is the row's LAYOUT box, never the box the eye currently
  // sees. `getBoundingClientRect()` includes the transform a still-running FLIP
  // wrote, so reading it as "where the row was" fed the tween's own mid-flight
  // position back in as the next start — and the settings store is a
  // `useSyncExternalStore` feed, so ANY commit landing mid-tween (a second
  // switch flip, a poll, a rail update) moved every OFF row by the part of the
  // previous move it had not finished yet. Measured 2026-09-28: with rapid
  // flips the rows lurched ~80px backwards in a single frame and never settled
  // — the "未开启功能一直在漂移" report. Layout position ignores the tween, so
  // the delta is the true one and the leftover commits measure zero.
  const layoutPos = (el: HTMLDivElement, r: DOMRect): { x: number; y: number } => {
    const t = getComputedStyle(el).transform
    if (t === '' || t === 'none') return { x: r.left, y: r.top }
    let tx = 0
    let ty = 0
    if (typeof DOMMatrixReadOnly !== 'undefined') {
      const m = new DOMMatrixReadOnly(t)
      tx = m.m41
      ty = m.m42
    } else {
      const hit = /matrix\(([^)]+)\)/.exec(t)
      const n = hit === null ? [] : hit[1].split(',').map(Number)
      if (n.length === 6) { tx = n[4]; ty = n[5] }
    }
    return { x: r.left - tx, y: r.top - ty }
  }
  const rowEls = React.useRef(new Map<string, HTMLDivElement>())
  const prevLayout = React.useRef(new Map<string, { x: number; y: number }>())
  const prevTwoCol = React.useRef<boolean | null>(null)
  React.useLayoutEffect(() => {
    const modeChanged = prevTwoCol.current !== null && prevTwoCol.current !== twoCol
    prevTwoCol.current = twoCol
    rowEls.current.forEach((el, key) => {
      const r = el.getBoundingClientRect()
      const at = layoutPos(el, r)
      const prev = prevLayout.current.get(key)
      prevLayout.current.set(key, at)
      if (prev === undefined || modeChanged) return
      const dx = prev.x - at.x
      const dy = prev.y - at.y
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      // NEVER animate while a drag is in flight: the drag's own hit-testing (and
      // the browser's) reads the row's live rect, and a row gliding under the
      // pointer makes the insertion side flap (and cancelled the drop outright
      // in the probe, measured 2026-09-25).
      if (dragging.current !== null || drop !== null) return
      // Start from where the row IS ON SCREEN: its old layout box plus whatever
      // part of a running tween it still carries (`r - at`). A move that lands
      // mid-tween retargets from the current position instead of snapping back.
      el.style.transition = 'none'
      el.style.transform = `translate(${dx + (r.left - at.x)}px, ${dy + (r.top - at.y)}px)`
      void el.offsetHeight // flush the start position before animating away
      el.style.transition = 'transform var(--ds-transition-duration) var(--ds-ease-in-out)'
      el.style.transform = ''
    })
  })
  const toggle = (key: string): void => {
    if (picked.includes(key)) {
      onChange(picked.filter((k) => k !== key))
      setOffOrder((prev) => [key, ...prev.filter((k) => k !== key)])
    } else if (picked.length < max) {
      onChange(picked.concat(key))
      setOffOrder((prev) => prev.filter((k) => k !== key))
    }
  }
  /** Move the dragged key to just before/after the target key, or to the END of
   *  the ON group when the target row is not picked (a drop on an unpicked row
   *  is a reasonable gesture for "put it last" — refusing it silently would read
   *  as a broken drag). */
  const dropOn = (targetKey: string, after: boolean, payload?: string): void => {
    const from = dragging.current ?? (typeof payload === 'string' && payload !== '' ? payload : null)
    if (from === null) return
    const rest = picked.filter((k) => k !== from)
    const at = rest.indexOf(targetKey)
    const next = rest.slice()
    if (at < 0) next.push(from)
    else next.splice(after ? at + 1 : at, 0, from)
    dragging.current = null
    setDrop(null)
    if (next.join(',') !== picked.join(',')) onChange(next)
  }
  // TWO COLUMNS when the drawer is wide enough: ON on the left, OFF on the right.
  // One flat, keyed list placed by GRID CELL rather than two parent divs — a row
  // that changes group would be REMOUNTED if it moved between parents, and a
  // remounted row cannot be FLIP-animated (it would flash in its new spot). Grid
  // placement keeps the element identity, so the diagonal move animates.
  const onKeys = picked
  const offKeys = displayKeys.filter((k) => !picked.includes(k))
  const twoCol = pickW >= 340 && onKeys.length > 0 && offKeys.length > 0
  const rowsBottom = Math.max(onKeys.length, offKeys.length) + 1
  const cellFor = (key: string): React.CSSProperties => {
    const on = picked.includes(key)
    if (!twoCol) return { gridColumn: 1, gridRow: on ? onKeys.indexOf(key) + 1 : onKeys.length + offKeys.indexOf(key) + 1 }
    return { gridColumn: on ? 1 : 2, gridRow: (on ? onKeys.indexOf(key) : offKeys.indexOf(key)) + 1 }
  }
  return React.createElement('div', { className: 'dsx-metrics', ref: metricsRef, style: { display: 'grid', gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr', columnGap: 10, rowGap: 0, alignContent: 'start' } },
    displayKeys.map((key) => {
      const label = opts.find(([o]) => o === key)?.[1] ?? key
      const on = picked.includes(key)
      const isDropTarget = drop !== null && drop.key === key && on
      return React.createElement('div', {
        key,
        // Stable hook for the drag/reorder probes (and for anyone inspecting
        // which key a row is): the visible label is localized, the key is not.
        'data-metric': key,
        ref: (el: HTMLDivElement | null) => { if (el !== null) rowEls.current.set(key, el) },
        style: cellFor(key),
        className: 'dsx-metric'
          + (on ? ' is-on' : '')
          + (dragging.current === key ? ' is-dragging' : '')
          + (isDropTarget && !drop!.after ? ' dsx-drop-before' : '')
          + (isDropTarget && drop!.after ? ' dsx-drop-after' : ''),
        // The WHOLE row drags (the official session-row gesture — no grip): the
        // row is the handle, and the 2px blue arrow-line below is the official
        // insertion indicator, copied from the DSH sidebar's row CSS.
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          if (onSwitch.current) { e.preventDefault(); return }
          dragging.current = key
          // The key also rides the drag payload: a ref survives re-renders but
          // not a re-mount, and the drop handler is the only place that can tell
          // the two apart.
          try { e.dataTransfer.setData('text/plain', key) } catch { /* older engines */ }
          e.dataTransfer.effectAllowed = 'move'
          if (typeof e.dataTransfer.setDragImage === 'function') e.dataTransfer.setDragImage(e.currentTarget, 24, 15)
        },
        onDragEnd: () => { dragging.current = null; onSwitch.current = false; setDrop(null) },
        onDragOver: (e: React.DragEvent) => {
          // Accept the drop on ANY row (so a drop on an unpicked row can mean
          // "last"), but only a PICKED row shows the insertion indicator.
          e.preventDefault()
          if (!on) { setDrop((prev) => (prev === null ? prev : null)); return }
          const rect = e.currentTarget.getBoundingClientRect()
          const after = e.clientY > rect.top + rect.height / 2
          // Compare before writing state: dragover fires continuously and a
          // fresh object per event would re-render the whole form each frame.
          setDrop((prev) => (prev !== null && prev.key === key && prev.after === after ? prev : { key, after }))
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          let payload = ''
          try { payload = e.dataTransfer.getData('text/plain') } catch { payload = '' }
          // The insertion side is re-derived from THIS event, never read from
          // the `drop` state: the browser fires dragover and drop back to back,
          // React batches the dragover's setState, and the drop handler can
          // therefore still close over the PREVIOUS side — which silently made a
          // drop below a row behave like a drop above it (measured: dragging the
          // first metric one slot down was a no-op).
          const rect = e.currentTarget.getBoundingClientRect()
          dropOn(key, e.clientY > rect.top + rect.height / 2, payload)
        },
        onDragLeave: on ? () => setDrop((prev) => (prev !== null && prev.key === key ? null : prev)) : undefined,
      },
        // No order NUMBER on the row (the card itself shows the order): the row
        // is name + switch, the two things a settings row has.
        React.createElement('span', { className: 'dsx-metric-name', title: optionLabel([key, label]) }, optionLabel([key, label])),
        React.createElement('label', {
          className: 'dsx-switch-row',
          title: optionLabel([key, label]),
          onMouseDown: () => { onSwitch.current = true },
          onMouseUp: () => { onSwitch.current = false },
        },
          React.createElement('input', { type: 'checkbox', className: 'dsx-switch-input', checked: on, onChange: () => toggle(key) }),
          React.createElement('span', { className: 'dsx-switch-track', 'aria-hidden': true }, React.createElement('span', { className: 'dsx-switch-thumb' })),
        ),
      )
    }),
    React.createElement('div', { className: 'dsx-metric-hint', style: { gridColumn: '1 / -1', gridRow: rowsBottom } }, t('config.metricHint', { n: picked.length, max })),
  )
}

function ConfigTab({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  // Restored from module scope, so closing/reopening the panel keeps the drawer.
  const [selected, setSelected] = React.useState<string>(lastSelectedInstance)
  React.useEffect(() => { lastSelectedInstance = selected }, [selected])
  // Local preview size (2×2 ↔ 2×4) — lets you eyeball a widget at a different
  // size in the preview without changing the added instance.
  const [previewSize, setPreviewSize] = React.useState<WidgetSize>('2x2')
  // Simulated state for widgets with states (e.g. peak-pricing): clicking the
  // preview card flips it, so both states can be reviewed live. The BASE state
  // comes from the widget's OWN example.sim (deterministic — never the live
  // clock); flipping toggles its single boolean field.
  const [previewSim, setPreviewSim] = React.useState<Record<string, unknown> | null>(null)
  React.useEffect(() => { setPreviewSim(null) }, [selected])
  const toggleSim = (): void => {
    if (!selWidget || !widgetSimToggle(selWidget)) return
    setPreviewSim(nextSim(selWidget, previewSim))
  }
  // There is no separate "uninstalled" zone any more: everything ships bundled
  // and the market only ADDS instances. Removing a row deletes it entirely
  // (installed + order + its per-instance config).
  const installed = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1)
  const remove = (id: string): void => {
    const cfg = { ...prefs.cardConfigs }
    delete cfg[id]
    setPrefs({
      installed: prefs.installed.filter((x) => x !== id),
      order: prefs.order.filter((x) => x !== id),
      cardConfigs: cfg,
    })
  }
  // Preview + config for the selected widget (an instance key: widget@size).
  const selKey = selected ? parseInstanceKey(selected) : null
  const selWidget = selKey ? WIDGETS.find((x) => x.id === selKey.widgetId) : undefined
  // Preview renders at the locally selected size when the widget supports it,
  // else falls back to the installed instance's size.
  const selSize = (selWidget && sizesOf(selWidget).includes(previewSize)) ? previewSize : (selKey?.size ?? '2x2')
  const selConfig = selWidget ? (prefs.cardConfigs[selected] ?? {}) : null
  // Effective simulated state: the user's flipped state, else the widget's own
  // example.sim baseline (deterministic — never the live clock). Defined after
  // selWidget so the render reads it safely on every pass.
  const effSim = previewSim ?? selWidget?.example?.sim ?? null
  const previewOut = (): WidgetRenderOut | null => {
    if (!selWidget || !selConfig) return null
    // Widget-owned example stats (a plain object, or a function of the current
    // per-instance config — the heatmap rebuilds its preview grid honoring the
    // window-alignment mode, the quote seeds a sample text). Merged over the
    // shared preview stats; preview logic lives in the widget unit, not here.
    const ex = selWidget.example
    const exStats = ex?.stats ? (typeof ex.stats === 'function' ? ex.stats(selConfig) : ex.stats) : {}
    const stats = { ...PREVIEW_STATS, ...exStats, ...selConfig } as Parameters<typeof selWidget.render>[0]
    const sim = effSim && Object.keys(effSim).length > 0 ? effSim : undefined
    // Preview isolation: a crashing widget render must not take the settings
    // surface down with it (mirrors the rail's per-card try/catch).
    try {
      return selWidget.render(stats, { size: selSize, ...(sim ? { sim } : {}) })
    } catch (error) {
      console.error(`[dsh-widgets] preview render crashed for ${selWidget.id}:`, error)
      return null
    }
  }
  const setConfig = (field: ConfigField, value: unknown): void => {
    const next = { ...(prefs.cardConfigs[selected] ?? {}) }
    const def = field.default
    const isDefault = value === def || value === '' || value === undefined || value === null
    if (isDefault) delete next[field.key]
    else next[field.key] = value
    setPrefs({ cardConfigs: { ...prefs.cardConfigs, [selected]: next } })
  }
  // Switch one installed instance's size (2×2 ↔ 2×4): rewrite the instance key in
  // both `order` (position) and `installed` (active set), carry the widget's
  // per-instance config across to the new size, and DEDUPE so the same widget at
  // the same size never appears twice (a resize to a size that already exists
  // merges instead of duplicating).
  const out = previewOut()
  const hasSel = Boolean(selWidget && selConfig)
  // The panel grows by the drawer's width while a widget is selected; tell it.
  const onDetailToggle = controller.onDetailToggle
  React.useEffect(() => {
    onDetailToggle?.(hasSel)
    return () => { onDetailToggle?.(false) }
  }, [hasSel, onDetailToggle])
  // The detail column is a DRAWER revealed by its own growing box: the inner
  // content is laid out at the TARGET width from the first frame (so the card's
  // size never changes — the user's 「大小从未变化，而是从右边的遮罩平滑移动到左边」
  // rule) and the drawer's `overflow: hidden` wipes it in as the box widens. The
  // measured width is only the fallback for hosts that do not know the target
  // (the official settings page).
  const detailRef = React.useRef<HTMLDivElement | null>(null)
  const [detailW, setDetailW] = React.useState(0)
  React.useEffect(() => {
    const el = detailRef.current
    if (el === null || typeof ResizeObserver === 'undefined') return
    const measure = (): void => setDetailW((prev) => (Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasSel])
  const targetW = controller.detailWidth ?? 0
  const drawerW = targetW > 0 ? targetW : detailW
  // No translateX animation on open/close: the reveal IS the box growing. A
  // translate on top of it doubled the motion and made the card look like it
  // zoomed into place.
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 } },
    // LEFT column: the installed list — the panel's whole width while nothing is
    // selected, LIST_W once the drawer is out. `width` (not `flex-basis`) so it
    // interpolates: `auto` → `190px` is not animatable, which is why the left
    // column used to snap (reported 2026-09-26).
    React.createElement('div', { className: 'dsx-config-list', style: {
      flex: '0 0 auto',
      width: hasSel ? `${LIST_W}px` : '100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
      transition: 'width var(--ds-transition-duration-slow) var(--ds-ease-in-out)',
      // The list column animates with the drawer, so opening the preview glides
      // on BOTH sides instead of snapping the left column to 190px.
      // The official gutter (measured from the settings window's nav→content
      // spacing, 12px): the list's rows stop short of the drawer so the selected
      // fill is never guillotined by the drawer's edge.
      paddingRight: COL_GAP,
    } },
      // The caption lives INSIDE this column now (one ellipsized line, full text
      // on hover): as a full-width row it pushed the drawer down by its own
      // height, and the drawer must start at the top of the content area — level
      // with the tab selector — so the preview gets that space.
      React.createElement('div', {
        title: t('config.addedCount', { added: installed.length, max: prefs.maxWidgets }),
        style: { flex: 'none', fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      }, hasSel ? `${installed.length}/${prefs.maxWidgets}` : t('config.addedCount', { added: installed.length, max: prefs.maxWidgets })),
      React.createElement(OrderList, {
        items: installed,
        onMove: (next) => setPrefs({ order: next }),
        onRemove: remove,
        // Tapping the SELECTED row again closes the drawer — the same gesture the
        // product uses for a selected list item, and the reason the user could
        // not get rid of the preview ("再次点击会话概览没有办法关掉").
        onSelect: (id) => setSelected((prev) => (prev === id ? '' : id)),
        selected,
      }),
    ),
    // RIGHT column: the drawer. `flex: 1 1 0` fills whatever the list leaves, and
    // its `overflow: hidden` is the MASK that reveals the content as the box
    // widens. The inner content is absolutely positioned at the TARGET width, so
    // it does not reflow while the box animates.
    React.createElement('div', { ref: detailRef, className: 'dsx-config-drawer', style: {
      flex: '1 1 0px',
      minWidth: 0,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    } },
      hasSel ? React.createElement('div', { className: 'dsx-config-drawer-inner', style: {
        position: 'absolute',
        top: 0,
        left: 0,
        // Pinned to the target width MINUS 2px: the drawer's `overflow: hidden` is
        // the mask, and a row's 1px edge line sitting exactly on that boundary is
        // the first thing a fractional pixel eats (the user's 「留一点 px 给渲染的
        // 边缘线」). Both the fit and the card's centring use this same width.
        width: `${Math.max(0, drawerW - 2)}px`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        // NO entrance animation of its own: the reveal is the drawer's box
        // widening over this content (the mask). An extra translate/fade here
        // doubled the motion.
      } },
      // Preview title anchored top-LEFT; the card-size dropdown and the CLOSE
      // button sit beside it on the right.
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 'none' } },
        React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('config.preview', { name: widgetName(selWidget) })),
        sizesOf(selWidget).length > 1
          ? React.createElement('select', {
              className: 'dsx-select', style: { fontSize: 11, width: 'auto' },
              value: selSize, title: t('config.cardSize'),
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPreviewSize(e.target.value as WidgetSize),
            },
              sizesOf(selWidget).map((s) => React.createElement('option', { key: s, value: s }, s === '2x4' ? '2×4' : '2×2')),
            )
          : null,
        // An explicit way out of the preview (the user asked for a close button;
        // tapping the selected row again works too — see OrderList.onSelect).
        React.createElement('button', {
          type: 'button',
          className: 'dsx-drawer-close',
          'aria-label': t('config.closePreview'),
          title: t('config.closePreview'),
          onClick: () => setSelected(''),
        }, closeIconSmall),
      ),
      // A FIXED-HEIGHT preview block: the card's height never changes when the
      // selection does, because `fit` is derived from the WIDEST layout (2×4) for
      // both sizes — so a 2×2 and a 2×4 preview are exactly the same height and
      // switching widgets/sizes moves nothing (the user's rule: 预览的组件高度保持
      // 不变，上下留一点合适的间距，然后往下顺延自定义的按钮和区域). The 自定义 form
      // follows immediately below the block; whatever height is left over stays
      // empty at the bottom instead of pushing the preview around.
      React.createElement('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '26px 8px' } },
        (() => {
          // Drawn at the RAIL'S OWN unit (`prefs.cardSide`), then scaled — so every
          // element, padding and gap inside the card is the identical layout the
          // rail seats, only bigger. The user's rule: 预览组件与实际组件必须完全复用，
          // 唯一区别只是预览大小与预览效果（数值填充）. A different unit would re-round
          // every `Math.round(x * scale)` and the spacing would drift.
          const u = controller.railSide && controller.railSide > 0 ? controller.railSide : prefs.cardSide
          const isWide = selSize === '2x4'
          const refW = 2 * u + 12
          const cardW = isWide ? refW : u
          const avail = drawerW > 0 ? drawerW - 18 : refW
          // ONE fit for every size: from the 2×4 reference, so the scaled card is
          // the same height whatever is selected (a 2×2 is then a square of that
          // height, centred in the column). The scaled box is reserved EXPLICITLY
          // — a transform does not change layout size, and reserving the unscaled
          // height clipped the enlarged card (reported 2026-09-26).
          const fit = Math.max(0.55, Math.min(1.5, avail / refW))
          const pv = out ? React.createElement(CardBody, { out, unit: u, width: isWide ? cardW : undefined, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, pinBox: true }) : null
          const simTip = widgetSimToggle(selWidget)
            ? React.createElement('div', { key: 'simtip', style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 8, textAlign: 'center' } }, t('config.simTip', { label: widgetSimToggle(selWidget) }))
            : null
          return out
            ? React.createElement('div', {
                // Column wrapper: the reserved card box, then the optional sim tip
                // UNDER it. NO transition anywhere here: switching to another
                // widget must snap, not zoom (「切换预览的组件还有动画效果，我觉得不需要」);
                // opening/closing the drawer still animates — that is the columns'
                // flex-basis motion.
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' },
                title: widgetSimToggle(selWidget) ? t('config.simTitle') : undefined,
                onClick: widgetSimToggle(selWidget) ? () => toggleSim() : undefined,
              },
              React.createElement('div', { style: { position: 'relative', width: Math.round(cardW * fit), height: Math.round(u * fit), flex: 'none' } },
                React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: cardW, transform: `scale(${fit.toFixed(4)})`, transformOrigin: 'top left', cursor: widgetSimToggle(selWidget) ? 'pointer' : undefined, userSelect: 'none' } }, pv),
              ),
              simTip,
              )
            : null
        })(),
      ),
      // 自定义 sits on the drawer's floor (natural height, shrinking + scrolling
      // only when it is taller than the space the stage leaves).
      React.createElement('div', { style: { flex: '0 1 auto', minHeight: 0, overflowY: 'auto' } },
      // Per-card schema fields keep their 自定义 heading below the preview.
      selWidget.configSchema && selWidget.configSchema.length > 0 ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 16 } },
        React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, t('config.custom')),
        selWidget.configSchema.map((f) => {
          // A 'metrics' control is a self-describing LIST: its rows, its switch
          // and its hint already say everything a label would, and the label
          // line only pushed the list down (reported 2026-09-25). Scalar fields
          // keep the label-left / control-right settings-row shape.
          const isList = f.type === 'metrics'
          return React.createElement('div', { key: f.key, style: {
            display: 'flex',
            flexDirection: isList ? 'column' : 'row',
            alignItems: isList ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isList ? 0 : 8,
            padding: isList ? '4px 0 0' : '10px 0',
            borderBottom: isList ? undefined : '1px solid var(--dsw-alias-border-l1)',
          } },
            isList ? null : React.createElement('span', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, fieldLabel(f)),
            React.createElement('div', { style: { flex: isList ? '1 1 auto' : 'none', minWidth: 0 } }, React.createElement(ConfigFieldControl, { field: f, value: selConfig[f.key], onChange: (v) => setConfig(f, v) })),
          )
        }),
      ) : null,
      ),
      ) : null,
    ),
  )
}

/** iOS-style zoom: the clicked tile grows and travels into the preview's slot.
 *  A FLIP over a fixed-position ghost that renders the SAME card; the stage's
 *  card is the authority for the final box, so the ghost lands exactly on it and
 *  then unmounts. */
function ZoomGhost({ zoom, target, onDone }: {
  zoom: { x: number; y: number; w: number; h: number; out: WidgetRenderOut; unit: number; cardW: number; size: WidgetSize; squircle?: boolean; cornerPercent?: number; phase: 'in' | 'out' }
  target: React.RefObject<HTMLDivElement | null>
  onDone: () => void
}): React.ReactElement | null {
  const [box, setBox] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const done = React.useRef(onDone)
  done.current = onDone
  const reverse = zoom.phase === 'out'
  React.useLayoutEffect(() => {
    const el = target.current
    if (el === null) { done.current(); return }
    // The stage layer SLIDES in (shared axis), so a raw rect is mid-flight:
    // subtract the layer's own translation to get the SETTLED box the ghost must
    // land on. The card's own size is re-read until it stops moving (its slot
    // width is measured) — otherwise the ghost lands short and the card pops.
    const settled = (r: DOMRect): { x: number; y: number; w: number; h: number } => {
      let layer: HTMLElement | null = el
      while (layer !== null && !(layer.className || '').toString().includes('dsx-mkt-layer')) layer = layer.parentElement
      let dx = 0
      let dy = 0
      if (layer !== null) {
        const t = getComputedStyle(layer).transform
        if (t !== '' && t !== 'none' && typeof DOMMatrixReadOnly !== 'undefined') {
          const m = new DOMMatrixReadOnly(t)
          dx = m.m41
          dy = m.m42
        }
      }
      return { x: r.left - dx, y: r.top - dy, w: r.width, h: r.height }
    }
    let box = settled(el.getBoundingClientRect())
    setBox(box)
    let tries = 0
    let raf = 0
    const tick = (): void => {
      const cur = target.current ? settled(target.current.getBoundingClientRect()) : box
      if (Math.abs(cur.w - box.w) > 1 && tries++ < 4) {
        box = cur
        setBox(cur)
        raf = requestAnimationFrame(tick)
        return
      }
      setPlaying(true)
    }
    raf = requestAnimationFrame(tick)
    const timer = setTimeout(() => done.current(), 560)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [])
  if (box === null) return null
  const sFrom = reverse ? Math.min(box.w / zoom.cardW, box.h / zoom.unit) : Math.min(zoom.w / zoom.cardW, zoom.h / zoom.unit)
  const sTo = reverse ? Math.min(zoom.w / zoom.cardW, zoom.h / zoom.unit) : Math.min(box.w / zoom.cardW, box.h / zoom.unit)
  // The ghost is positioned at the TARGET box and transformed back onto the
  // source, so the FLIP reads as one continuous move in either direction.
  const at = (rect: { x: number; y: number; w: number; h: number }, s: number): string =>
    `translate(${rect.x + rect.w / 2 - box.x - zoom.cardW / 2}px, ${rect.y + rect.h / 2 - box.y - zoom.unit / 2}px) scale(${s.toFixed(4)})`
  const from = at(reverse ? { x: box.x, y: box.y, w: box.w, h: box.h } : zoom, sFrom)
  const to = at(reverse ? zoom : { x: box.x, y: box.y, w: box.w, h: box.h }, sTo)
  return createPortal(React.createElement('div', {
    className: 'dsx-zoomghost',
    // PORTALED to <body> on purpose: the panel lives inside the rail's drawer
    // wrapper, which carries a transform — a `position: fixed` ghost inside it is
    // positioned against THAT wrapper, so it flew ~1000px off-screen and the user
    // saw an empty tile then a sudden preview (reported 2026-09-27).
    style: { left: box.x, top: box.y, width: zoom.cardW, height: zoom.unit, transform: playing ? to : from },
  }, React.createElement(CardBody, { out: zoom.out, unit: zoom.unit, width: zoom.size === '2x4' ? zoom.cardW : undefined, squircle: zoom.squircle, cornerPercent: zoom.cornerPercent, pinBox: true })), document.body)
}

// ---- Market tab ----

function MarketTab({ controller, usageData }: { controller: WidgetsController; usageData: UsageData | null }): React.ReactElement {
  const { prefs, setPrefs } = controller
  // NOTE: every `useState` this component's effects depend on must be declared
  // BEFORE those effects — a dependency array is read at hook-call time, so
  // naming a later `useState` throws "Cannot access X before initialization"
  // (which is exactly how the market tab blanked itself once).
  const [q, setQ] = React.useState('')
  // The view is a PERSISTED pref (not component state): switching must survive a
  // reload, a session change — and ship as a user preference to plugin users.
  const view = prefs.marketView === 'grid' ? 'grid' : 'list'
  const setView = (v: 'list' | 'grid'): void => setPrefs({ marketView: v })
  const [previewGroup, setPreviewGroup] = React.useState<string | null>(null)
  const [previewIdx, setPreviewIdx] = React.useState(0)
  const galleryRef = React.useRef<HTMLDivElement | null>(null)
  const [colW, setColW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = galleryRef.current
    if (el === null) return
    const measure = (): void => {
      const w = el.clientWidth
      setColW((prev) => (Math.abs(prev - w) < 2 ? prev : w))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])
  // iOS-style zoom: the clicked card grows and travels into the preview slot
  // instead of the stage simply appearing. `zoom` carries the source rect; the
  // target is measured from the stage's card once it has rendered.
  const [zoom, setZoom] = React.useState<{ x: number; y: number; w: number; h: number; out: WidgetRenderOut; unit: number; cardW: number; size: WidgetSize; squircle?: boolean; cornerPercent?: number; phase: 'in' | 'out' } | null>(null)
  // The tile/card the preview was opened from, kept PAST the IN animation so the
  // back gesture can fly home (the IN ghost clears `zoom` when it lands).
  const [lastSource, setLastSource] = React.useState<{ x: number; y: number; w: number; h: number; out: WidgetRenderOut; unit: number; cardW: number; size: WidgetSize; squircle?: boolean; cornerPercent?: number } | null>(null)
  // Which way the shared-axis push is going while it runs (null = settled).
  const [anim, setAnim] = React.useState<'in' | 'out' | null>(null)
  const railSide = controller.railSide ?? 0
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const stageCardRef = React.useRef<HTMLDivElement | null>(null)
  // Measured in a LAYOUT effect so the stage's card is already at its final size
  // on the first painted frame (the zoom ghost flies into that box).
  const [stageW, setStageW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = stageRef.current
    if (el === null) return
    const measure = (): void => setStageW((prev) => (Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [previewGroup])
  // Simulated state for widgets with states (e.g. peak-pricing): clicking the
  // preview card flips it, so both states can be reviewed live.
  const [previewSim, setPreviewSim] = React.useState<Record<string, unknown> | null>(null)
  React.useEffect(() => { setPreviewSim(null) }, [previewGroup, previewIdx])
  // The market lists EVERY widget (system + external), deduped by group so a
  // group card (e.g. "context" → 一键压缩 + 上下文水位) is one entry in the rail.
  const seen = new Set<string>()
  const marketCards = WIDGETS.filter((w) => { const g = groupOf(w); if (seen.has(g)) return false; seen.add(g); return true })
  const list = marketCards.filter((w) => `${widgetName(w)} ${widgetDesc(w)} ${w.id}`.toLowerCase().indexOf(q.toLowerCase()) !== -1)
  // Group labels come from the dictionaries (`group.<group-id>`); a group
  // without a label falls back to the first widget's name. Widget units can
  // ship their own group label lazily via their manifest locale.
  const groupLabel = (w: (typeof WIDGETS)[number]): string => {
    const key = `group.${groupOf(w)}`
    const label = t(key)
    return label === key ? widgetName(w) : label
  }
  /** Open a group's preview, seeding the zoom from the clicked card/tile. */
  const openGroup = (w: (typeof WIDGETS)[number], from: 'list' | 'grid'): void => {
    const sizes = sizesOf(w)
    const size: WidgetSize = sizes.includes('2x2') ? '2x2' : sizes[0]
    const unit = railSide > 0 ? railSide : prefs.cardSide
    const cardW = size === '2x4' ? 2 * unit + 12 : unit
    // The source rect: the tile's preview for the gallery, the card itself for
    // the list (there is no preview there).
    const el = from === 'grid'
      ? (document.querySelector(`.dsx-gcard[data-gid="${w.id}"] .dsx-gshot`) as HTMLElement | null)
      : (document.querySelector(`.dsx-mcard[data-gid="${w.id}"]`) as HTMLElement | null)
    const out = exampleOut(w, size, prefs)
    const r = el ? el.getBoundingClientRect() : null
    const src = r && out ? { x: r.left, y: r.top, w: r.width, h: r.height, out, unit, cardW, size, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent } : null
    setLastSource(src)
    if (MARKET_HERO) setZoom(src ? { ...src, phase: 'in' } : null)
    setAnim('in')
    // Without the hero nothing else clears the push: do it when the 380ms
    // keyframes are done, which also unmounts the (now hidden) market layer.
    if (!MARKET_HERO) window.setTimeout(() => setAnim(null), 400)
    setPreviewGroup(groupOf(w))
    setPreviewIdx(0)
  }
  /** Leave the preview. With the hero OFF this is a pure shared-axis pop: the
   *  preview slides out, the market slides back in, and the stage is dropped when
   *  that motion ends (400ms ≈ the 380ms keyframes + a frame of slack). With the
   *  hero ON the card flies home first (see MARKET_HERO). */
  const closeGroup = (): void => {
    if (!MARKET_HERO) {
      setAnim('out')
      window.setTimeout(() => { setPreviewGroup(null); setAnim(null) }, 400)
      return
    }
    if (lastSource !== null) { setAnim('out'); setZoom({ ...lastSource, phase: 'out' }) }
    else setPreviewGroup(null)
  }
  const zoomDone = (): void => {
    if (zoom !== null && zoom.phase === 'out') setPreviewGroup(null)
    setZoom(null)
    setAnim(null)
  }
  /** 组件市场 uses Material's SHARED AXIS (X) between the list/gallery and the
   *  preview: outgoing and incoming ride the same horizontal motion — the outgoing
   *  slides out of the panel's clip while the incoming slides in from the right —
   *  and BOTH directions play the SAME keyframes (closing = `animation-direction:
   *  reverse`), so open and close are identical by construction. Both layers stay
   *  MOUNTED for the whole transition; the previous code swapped them instantly,
   *  which is why the surrounding tiles vanished (and popped back) while only the
   *  shared card animated. Reference: MaterialSharedAxis / the Material motion
   *  system's shared-axis pattern + the container-transform (FLIP) ghost below. */
  const renderLayers = (stageBody: React.ReactNode | null, dir: 'in' | 'out' | null): React.ReactElement => {
    // The grid is mounted whenever there is no stage (settled market) OR a
    // transition is in flight — in BOTH directions: during the push it is the
    // outgoing layer, during the pop the incoming one.
    const gridMounted = stageBody === null || dir !== null
    return React.createElement('div', { className: 'dsx-mkt' },
      gridMounted
        ? React.createElement('div', { className: 'dsx-mkt-layer' + (dir === 'in' ? ' dsx-mkt-push-out' : dir === 'out' ? ' dsx-mkt-push-out is-rev' : '') }, marketBody)
        : null,
      stageBody !== null
        ? React.createElement('div', { className: 'dsx-mkt-layer is-front' + (dir === 'in' ? ' dsx-mkt-push-in' : dir === 'out' ? ' dsx-mkt-push-in is-rev' : '') }, stageBody)
        : null,
      zoom ? React.createElement(ZoomGhost, { key: zoom.phase, zoom, target: stageCardRef, onDone: zoomDone }) : null,
    )
  }

  const marketBody = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' } },
    // The search field + the view toggle. The field copies the official sidebar
    // search box (measured 2026-09-27: height 30, radius 10, 1px border, a
    // leading magnifier, 13px input, transparent fill) — the user's pick.
    React.createElement('div', { className: 'dsx-marketbar' },
      React.createElement('div', { className: 'dsx-searchwrap' },
        React.createElement('span', { className: 'dsx-searchicon' }, searchIcon),
        React.createElement('input', { type: 'search', placeholder: t('market.search'), className: 'dsx-search', value: q, onChange: (e) => setQ(e.target.value) }),
      ),
      React.createElement('div', { className: 'dsx-viewtoggle' },
        React.createElement('button', {
          type: 'button', className: 'dsx-viewbtn', 'data-active': view === 'list',
          'aria-label': t('market.viewList'), title: t('market.viewList'),
          onClick: () => setView('list'),
        }, listViewIcon),
        React.createElement('button', {
          type: 'button', className: 'dsx-viewbtn', 'data-active': view === 'grid',
          'aria-label': t('market.viewGrid'), title: t('market.viewGrid'),
          onClick: () => setView('grid'),
        }, gridViewIcon),
      ),
    ),
    // The market list owns its own scroll now that the panel body does not
    // (`overflow: hidden` on `.dsx-stats-addpanel-body`).
    view === 'grid'
      ? React.createElement('div', { className: 'dsx-gallery', tabIndex: -1, ref: galleryRef },
        list.map((w) => {
          const sizes = sizesOf(w)
          // One representative preview per group: the first supported size (2×2
          // preferred), the same simulated output the stage renders.
          const size: WidgetSize = sizes.includes('2x2') ? '2x2' : sizes[0]
          const out = exampleOut(w, size, prefs)
          // Drawn at the RAIL's own unit and scaled to sit COMFORTABLY in the
          // column: the cap is ~1.15× so the widget keeps its natural proportions
          // and typography (the reference gallery shows widgets at their real size
          // with breathing room, not zoomed to fill the cell).
          const gUnit = railSide > 0 ? railSide : prefs.cardSide
          const gW = size === '2x4' ? 2 * gUnit + 12 : gUnit
          const col = colW > 0 ? (colW - 16 - 10) / 2 : gW
          const fit = Math.max(0.5, Math.min(1.15, (col - 12) / gW))
          // The gallery tile is ONLY the live preview + its caption: no outer
          // rounded rectangle and no 「已添加」 badge (the user's rule — the
          // reference widget gallery shows nothing but the widget and its name).
          return React.createElement('div', {
            key: w.id, role: 'button', tabIndex: 0, className: 'dsx-gcard', 'data-gid': w.id,
            title: widgetDesc(w),
            onClick: () => openGroup(w, 'grid'),
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGroup(w, 'grid') } },
          },
            React.createElement('span', {
              className: 'dsx-gshot',
              // The box RESERVES the scaled size (a transform does not change
              // layout size — reserving the unscaled box is what clipped the card
              // before).
              style: { width: Math.round(gW * fit), height: Math.round(gUnit * fit) },
            },
              React.createElement('span', {
                style: { position: 'absolute', top: 0, left: 0, width: gW, transform: `scale(${fit.toFixed(4)})`, transformOrigin: 'top left', display: 'block' },
              }, out ? React.createElement(CardBody, { out, unit: gUnit, width: size === '2x4' ? gW : undefined, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, pinBox: true }) : null),
            ),
            React.createElement('span', { className: 'dsx-gcap' }, groupLabel(w)),
          )
        }),
      )
      : React.createElement('div', { className: 'dsx-mlist', style: { overflowY: 'auto', minHeight: 0 } },
        list.map((w) => {
          const gw = WIDGETS.filter((x) => groupOf(x) === groupOf(w))
          // Instance count = every widget at every supported size (a 2×2 and a
          // 2×4 of the same widget are two independent market entries).
          const instanceCount = gw.reduce((a, x) => a + sizesOf(x).length, 0)
          // NO trailing control and NO installed marker: a market card is a
          // GROUP, and "已添加" on a group is ambiguous — one instance added or
          // all of them? (the user's argument). The card's own click opens the
          // group's preview, where each instance is added individually, so there
          // is nothing to put here. The ring is neutral for the same reason.
          const ring = React.createElement('span', { className: 'dsx-ring' })
          return React.createElement('div', {
            key: w.id, role: 'button', tabIndex: 0, className: 'dsx-mcard', 'data-gid': w.id,
            onClick: () => openGroup(w, 'list'),
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGroup(w, 'list') } },
          },
            ring,
            React.createElement('span', { className: 'dsx-mbody' },
              React.createElement('span', { className: 'dsx-mhead' },
                React.createElement('span', { className: 'dsx-mname' }, groupLabel(w)),
                React.createElement('span', { className: 'dsx-badge' }, String(instanceCount)),
              ),
              React.createElement('span', { className: 'dsx-mdesc' }, widgetDesc(w)),
            ),
          )
        }),
      ),
  )
  if (previewGroup !== null) {
    // Every supported size is its own selectable instance (2×2 first, then
    // 2×4), so multi-size widgets like the heatmap appear as independent
    // components instead of a size switcher.
    const gw = WIDGETS.filter((w) => groupOf(w) === previewGroup)
    const instances = gw.flatMap((w) => sizesOf(w).map((s) => ({ w, s })))
    const cur = instances[previewIdx] ?? instances[0]
    const w = cur?.w
    const curSize = cur?.s ?? '2x2'
    const curKey = w ? instanceKey(w.id, curSize) : ''
    const installed = w ? prefs.installed.indexOf(curKey) !== -1 : false
    // Widget-owned example stats: preview mode uses the unit's example (quote
    // seeds a sample text, heatmap builds a config-aware rolling grid, …)
    // merged over the shared preview stats — no central special-casing here.
    const ex = w?.example
    const exStats = ex?.stats ? (typeof ex.stats === 'function' ? ex.stats(prefs.cardConfigs?.[curKey] ?? {}) : ex.stats) : {}
    // The instance's own config rides along exactly like the rail's render does,
    // so a config-driven card (peak-pricing's windows / holiday switches)
    // previews what it will actually show instead of the defaults.
    const previewStats = { ...PREVIEW_STATS, ...exStats, ...(prefs.cardConfigs?.[curKey] ?? {}) } as WidgetStats
    const effSim = previewSim ?? ex?.sim ?? null
    // Market-preview isolation: a crashing render shows an empty stage rather
    // than taking the market panel down (mirrors rail + config preview guards).
    let out: ReturnType<NonNullable<typeof w>['render']> | null = null
    if (w) {
      try {
        out = w.render(previewStats, { size: curSize, ...(effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}) })
      } catch (error) {
        console.error(`[dsh-widgets] market preview render crashed for ${w.id}:`, error)
        out = null
      }
    }
    const toggleSim = (): void => {
      if (!widgetSimToggle(w)) return
      setPreviewSim(nextSim(w, previewSim))
    }
    // Everything ships bundled: the market only ADDS the selected instance
    // (widget@size) to the rail. Already-added instances show as disabled.
    const add = (): void => {
      if (!w || installed || prefs.installed.length >= prefs.maxWidgets) return
      setPrefs({
        installed: prefs.installed.concat(curKey),
        order: prefs.order.indexOf(curKey) === -1 ? prefs.order.concat(curKey) : prefs.order,
      })
    }
    const prev = () => setPreviewIdx((previewIdx - 1 + instances.length) % instances.length)
    const next = () => setPreviewIdx((previewIdx + 1) % instances.length)
    // In a 1-column layout a 2×4 tile has nowhere to sit: the rail hides those
    // instances, and the market must say so — title struck through, a yellow
    // capsule next to it, and the add button disabled.
    const oneCol = prefs.columns === 1
    const sizeBlocked = oneCol && curSize === '2x4'
    const stageBody = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, position: 'relative' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('button', { type: 'button', className: 'dsx-btn', onClick: closeGroup }, t('market.back')),
        React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: sizeBlocked ? 'line-through' : undefined, opacity: sizeBlocked ? 0.75 : undefined } }, w ? `${widgetName(w)}${curSize === '2x4' ? ' 2×4' : ' 2×2'}` : ''),
          sizeBlocked ? React.createElement('span', { className: 'dsx-size-warn' }, t('market.sizeBlocked')) : null,
        ),
        React.createElement('button', { type: 'button', disabled: installed || sizeBlocked || prefs.installed.length >= prefs.maxWidgets, className: installed || sizeBlocked ? 'dsx-btn' : 'dsx-btn dsx-btn-primary', onClick: add, title: sizeBlocked ? t('market.sizeBlockedTitle') : undefined }, installed ? t('market.added') : t('market.add')),
      ),
      !installed && prefs.installed.length >= prefs.maxWidgets
        ? React.createElement('div', { className: 'dsx-limit-tip' }, t('market.limit', { max: prefs.maxWidgets }))
        : null,
      React.createElement('div', { ref: stageRef, style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 4px' } },
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': t('market.prevAria'), onClick: prev }, React.createElement(ChevronLeftIcon)),
        React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' } },
          out
            ? (() => {
                // Same geometry the drawer preview uses: drawn at the rail's unit,
                // then scaled to fill the slot. The zoom ghost animates INTO this
                // box, so both must agree on the layout size.
                const u = railSide > 0 ? railSide : prefs.cardSide
                const cw = curSize === '2x4' ? 2 * u + 12 : u
                const slotW = stageW > 0 ? stageW - 80 : cw
                const fit = Math.max(0.4, Math.min(1.6, (slotW - 8) / cw))
                return React.createElement('div', { ref: stageCardRef, style: { position: 'relative', width: Math.round(cw * fit), height: Math.round(u * fit), opacity: zoom === null ? 1 : 0, cursor: widgetSimToggle(w) ? 'pointer' : undefined, userSelect: 'none' }, title: widgetSimToggle(w) ? t('config.simTitle') : undefined, onClick: widgetSimToggle(w) ? toggleSim : undefined },
                  React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: cw, transform: `scale(${fit.toFixed(4)})`, transformOrigin: 'top left' } },
                    React.createElement(CardBody, { out, unit: u, width: curSize === '2x4' ? cw : undefined, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, pinBox: true }),
                  ),
                  w && widgetSimToggle(w) ? React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, bottom: -18, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', textAlign: 'center' } }, t('config.simTip', { label: widgetSimToggle(w) })) : null,
                )
              })()
            : null,
        ),
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': t('market.nextAria'), onClick: next }, React.createElement(ChevronRightIcon)),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } },
        instances.map((inst, i) => React.createElement('button', { key: inst.w.id + '@' + inst.s, type: 'button', className: i === previewIdx ? 'dsx-dot dsx-dot-active' : 'dsx-dot', 'aria-label': `${widgetName(inst.w)} ${inst.s === '2x4' ? '2×4' : '2×2'}`, onClick: () => setPreviewIdx(i) })),
      ),
    )
    return renderLayers(stageBody, anim)
  }
  // Settled market: one layer, no transition running.
  return renderLayers(null, null)
}

// ---- Widgets page (settings section) ----

export function WidgetsPage({ controller, hideHeader }: { controller: WidgetsController; hideHeader?: boolean }): React.ReactElement {
  const [tab, setTab] = React.useState('config')
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 } },
    hideHeader ? null : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
      React.createElement('div', { style: { fontSize: 18, fontWeight: 600, lineHeight: '26px', color: 'var(--dsw-alias-label-primary)' } }, t('page.title')),
      React.createElement('div', { style: { fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-tertiary)' } }, t('page.desc')),
    ),
    React.createElement('div', { className: 'dsx-tabbar', style: { flex: 'none' } },
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'config', onClick: () => setTab('config') }, t('tab.config')),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'market', onClick: () => setTab('market') }, t('tab.market')),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'settings', onClick: () => setTab('settings') }, t('tab.settings')),
    ),
    // The active tab owns the remaining height and its own scroll (`minHeight: 0`
    // is what lets it shrink below its content instead of growing the panel).
    React.createElement('div', { style: { flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' } },
      tab === 'config' ? React.createElement(ConfigTab, { controller })
        : tab === 'market' ? React.createElement(MarketTab, { controller, usageData: null })
        : React.createElement(SettingsPanel, { controller }),
    ),
  )
}

// ---- General settings rows (padding + card side) ----

function Slider({ value, onChange, unit, min, max, step }: { value: number; onChange: (v: number) => void; unit: string; min: number; max: number; step?: number }): React.ReactElement {
  // Native range + accent-color, matching the official uitw-slider pattern so we
  // reuse the product's slider look instead of inventing a custom one.
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 'none' } },
    React.createElement('input', { type: 'range', min, max, step: step ?? 1, value, style: { width: 160, accentColor: 'var(--dsw-alias-state-business-primary)' }, onChange: (e) => onChange(Number(e.target.value)) }),
    React.createElement('span', { style: { width: 48, fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, `${value}${unit}`),
  )
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }): React.ReactElement {
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
    React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 32 } },
      React.createElement('div', { style: { fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-primary)' } }, title),
      React.createElement('div', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' } }, desc),
    ),
    React.createElement('div', { style: { flex: 'none', minWidth: 0 } }, children),
  )
}

export function SettingsPanel({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const colValue = [1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  // A stored value outside the gear table (hand-edited prefs) must still show a
  // selected option, so fall back to the default gear.
  const gearValue = CORNER_GEARS.indexOf(prefs.cornerPercent) !== -1 ? prefs.cornerPercent : DEFAULT_CORNER_PERCENT
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', flex: '1 1 auto' } },
    React.createElement(Row, {
      title: t('settings.columns.title'), desc: t('settings.columns.desc'),
      children: React.createElement('select', {
        className: 'dsx-select', value: colValue,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPrefs({ columns: Number(e.target.value) }),
      },
        [1, 2, 3, 4].map((c) => React.createElement('option', { key: c, value: c }, t('settings.columns.option', { n: c }))),
      ),
    }),
    React.createElement(Row, {
      title: t('settings.realtime.title'), desc: t('settings.realtime.desc'),
      children: React.createElement('label', { className: 'dsx-switch-row' },
        React.createElement('input', { type: 'checkbox', className: 'dsx-switch-input', checked: prefs.realTime, onChange: (e) => setPrefs({ realTime: e.target.checked }) }),
        React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
      ),
    }),
    React.createElement(Row, { title: t('settings.magnify.title'), desc: t('settings.magnify.desc'), children: React.createElement(Slider, { min: 1, max: 1.4, step: 0.05, value: prefs.magnify, unit: 'x', onChange: (v) => setPrefs({ magnify: v }) }) }),
    React.createElement(Row, { title: t('settings.padding.title'), desc: t('settings.padding.desc'), children: React.createElement(Slider, { min: 4, max: 40, value: prefs.panelPadding, unit: 'px', onChange: (v) => setPrefs({ panelPadding: v }) }) }),
    React.createElement(Row, { title: t('settings.cardSide.title'), desc: t('settings.cardSide.desc'), children: React.createElement(Slider, { min: 100, max: 220, value: prefs.cardSide, unit: 'px', onChange: (v) => setPrefs({ cardSide: v }) }) }),
    React.createElement(Row, {
      title: t('settings.squircle.title'), desc: t('settings.squircle.desc'),
      children: React.createElement('label', { className: 'dsx-switch-row' },
        React.createElement('input', { type: 'checkbox', className: 'dsx-switch-input', checked: prefs.squircle, onChange: (e) => setPrefs({ squircle: e.target.checked }) }),
        React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
      ),
    }),
    React.createElement(Row, {
      title: t('settings.corner.title'), desc: t('settings.corner.desc'),
      children: React.createElement('select', {
        className: 'dsx-select', value: gearValue,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPrefs({ cornerPercent: Number(e.target.value) }),
      },
        CORNER_GEARS.map((g) => React.createElement('option', { key: g, value: g }, t('settings.corner.option', { p: g }))),
      ),
    }),
    React.createElement(Row, { title: t('settings.panelWidth.title'), desc: t('settings.panelWidth.desc'), children: React.createElement(Slider, { min: 260, max: 760, value: prefs.panelWidth, unit: 'px', onChange: (v) => setPrefs({ panelWidth: v }) }) }),
    React.createElement(Row, { title: t('settings.maxWidgets.title'), desc: t('settings.maxWidgets.desc'), children: React.createElement(Slider, { min: 1, max: 20, value: prefs.maxWidgets, unit: t('settings.maxWidgets.unit'), onChange: (v) => setPrefs({ maxWidgets: v }) }) }),
    React.createElement(Row, {
      title: t('settings.hideStatsLine.title'), desc: t('settings.hideStatsLine.desc'),
      children: React.createElement('label', { className: 'dsx-switch-row' },
        React.createElement('input', { type: 'checkbox', className: 'dsx-switch-input', checked: prefs.hideStatsLine, onChange: (e) => setPrefs({ hideStatsLine: e.target.checked }) }),
        React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
      ),
    }),
  )
}
