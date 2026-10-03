/**
 * dsh-widgets —组件配置: the installed list, the per-widget form, and the preview.
 *
 * Moved verbatim out of components.tsx (Phase 3.7). Owns the order list, the field
 * controls (text / toggle / align / mode / metrics-with-reordering) and the drawer that
 * renders a live card preview of the edited instance.
 */

import * as React from 'react'
import { WIDGETS } from '../../generated.registry'
import { parseInstanceKey, sizesOf, widgetName, widgetSimToggle, fieldLabel, optionLabel } from '../../lib/contract/helpers'
import type { ConfigField, WidgetRenderOut, WidgetSize } from '../../lib/contract/types'
import { nextSim } from '../../render/preview/sim'
import { CardBody } from '../../render/CardBody'
import { buildPreviewStats } from '../../render/preview/example-out'
import { TrashIcon, closeIconSmall } from '../../render/icons'
import { Select } from '../../render/select'
import { COL_GAP, LIST_W } from '../layout'
import type { WidgetsController } from '../../runtime/controller'
import { effectiveMaxWidgets } from '../../runtime/prefs'
import { t } from '../../i18n'

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
      React.createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': fieldLabel(field), className: 'dsx-switch-input', checked: on, onChange: (e) => onChange(e.target.checked) }),
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
    // The product's own dropdown (primitives.Menu), never a native <select>: a
    // native control opens the BROWSER's popup, which no amount of trigger
    // styling can make look like the product's.
    const opts = field.options ?? [['a', 'A'], ['b', 'B']]
    const cur = (typeof value === 'string' && opts.some(([v]) => v === value)) ? value : (field.default as string ?? opts[0][0])
    return React.createElement(Select, {
      value: cur,
      options: opts.map(([o, label]) => ({ value: o, label: optionLabel([o, label]) })),
      onChange: (next) => onChange(next),
      title: fieldLabel(field),
    })
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
        ref: (el: HTMLDivElement | null): void => { if (el !== null) rowEls.current.set(key, el) },
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
          React.createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': optionLabel([key, label]), className: 'dsx-switch-input', checked: on, onChange: () => toggle(key) }),
          React.createElement('span', { className: 'dsx-switch-track', 'aria-hidden': true }, React.createElement('span', { className: 'dsx-switch-thumb' })),
        ),
      )
    }),
    React.createElement('div', { className: 'dsx-metric-hint', style: { gridColumn: '1 / -1', gridRow: rowsBottom } }, field.hint !== undefined ? (typeof field.hint === 'function' ? field.hint() : field.hint) : t('config.metricHint', { n: picked.length, max })),
  )
}

export function ConfigTab({ controller }: { controller: WidgetsController }): React.ReactElement {
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
  // columns × rows — the deck's real seat count (see effectiveMaxWidgets).
  const maxPlaceable = effectiveMaxWidgets(prefs)
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
    // The instance's stats: the shared filler + this widget's own example, with
    // the LIVE record merged over the top where it exists (the user's rule —
    // 有真数据喂真数据，缺的用假数据填) and the instance's config last, exactly
    // like the rail's fold. See buildPreviewStats.
    const stats = buildPreviewStats(selWidget, prefs, selected, controller.liveStats?.(selected) ?? null)
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
  // The drawer body below is ONE long expression. Narrow the selection ONCE here
  // instead of re-checking (or asserting) `selWidget` / `selConfig` at each of its
  // dozen use sites: `sel` is non-null exactly while the drawer renders.
  const sel = selWidget !== undefined && selConfig !== null ? { widget: selWidget, config: selConfig } : null
  const hasSel = sel !== null
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
        title: t('config.addedCount', { added: installed.length, max: maxPlaceable }),
        style: { flex: 'none', fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      }, hasSel ? `${installed.length}/${maxPlaceable}` : t('config.addedCount', { added: installed.length, max: maxPlaceable })),
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
      sel ? React.createElement('div', { className: 'dsx-config-drawer-inner', style: {
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
        React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('config.preview', { name: widgetName(sel.widget) })),
        sizesOf(sel.widget).length > 1
          ? React.createElement(Select, {
              value: selSize,
              options: sizesOf(sel.widget).map((s) => ({ value: s, label: s === '2x4' ? '2×4' : '2×2' })),
              onChange: (next) => setPreviewSize(next as WidgetSize),
              title: t('config.cardSize'),
              compact: true,
            })
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
          const simTip = widgetSimToggle(sel.widget)
            ? React.createElement('div', { key: 'simtip', style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 8, textAlign: 'center' } }, t('config.simTip', { label: widgetSimToggle(sel.widget) }))
            : null
          return out
            ? React.createElement('div', {
                // Column wrapper: the reserved card box, then the optional sim tip
                // UNDER it. NO transition anywhere here: switching to another
                // widget must snap, not zoom (「切换预览的组件还有动画效果，我觉得不需要」);
                // opening/closing the drawer still animates — that is the columns'
                // flex-basis motion.
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' },
                title: widgetSimToggle(sel.widget) ? t('config.simTitle') : undefined,
                onClick: widgetSimToggle(sel.widget) ? () => toggleSim() : undefined,
              },
              React.createElement('div', { style: { position: 'relative', width: Math.round(cardW * fit), height: Math.round(u * fit), flex: 'none' } },
                React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: cardW, transform: `scale(${fit.toFixed(4)})`, transformOrigin: 'top left', cursor: widgetSimToggle(sel.widget) ? 'pointer' : undefined, userSelect: 'none' } }, pv),
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
      sel.widget.configSchema && sel.widget.configSchema.length > 0 ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 16 } },
        React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, t('config.custom')),
        sel.widget.configSchema.map((f) => {
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
            React.createElement('div', { style: { flex: isList ? '1 1 auto' : 'none', minWidth: 0 } }, React.createElement(ConfigFieldControl, { field: f, value: sel.config[f.key], onChange: (v) => setConfig(f, v) })),
          )
        }),
      ) : null,
      ),
      ) : null,
    ),
  )
}
