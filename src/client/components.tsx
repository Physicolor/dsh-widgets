/**
 * Harness Widgets — React components (plain createElement, no JSX).
 *
 * All surfaces receive a `WidgetsController` (prefs + setPrefs) and the live
 * usage data. Components are pure presentation over those props; the apply
 * closure owns state and slot registration.
 */

import * as React from 'react'
import {
  WIDGETS, badgeOf, groupOf,
  type UsageData, type WidgetRenderOut,
} from './widgets'

/** The base card side all scales derive from. */
const BASE_SIDE = 150

/** Placeholder usage for the market preview (before the real host fetch lands). */
const FAKE_USAGE: UsageData = {
  usage: {
    rolling: { status: 'ok', percent: 0, resetsAt: '2026-08-15T07:25:56Z' },
    weekly: { status: 'ok', percent: 7, resetsAt: '2026-08-17T00:00:00Z' },
    monthly: { status: 'ok', percent: 3, resetsAt: '2026-09-14T11:35:13Z' },
  },
}

/** Persisted preferences shared by every surface. */
export interface Prefs {
  panelPadding: number
  cardSide: number
  installed: string[]
  order: string[]
  apiKey: string
  railOpen: boolean
}

/** The controller handed to every component. */
export interface WidgetsController {
  prefs: Prefs
  setPrefs: (patch: Partial<Prefs>) => void
}

// ---- Icons (official ui-primitives paths) ----

const GripIcon = (): React.ReactElement => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M5 3.5h1.5v1.5H5zM9.5 3.5H11v1.5H9.5zM5 7.25h1.5v1.5H5zM9.5 7.25H11v1.5H9.5zM5 11h1.5v1.5H5zM9.5 11H11v1.5H9.5z', fill: 'currentColor' }))

const TRASH_PATH = 'M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z'

const TrashIcon = (): React.ReactElement => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: TRASH_PATH, fill: 'currentColor' }))

const CHEV_LEFT = 'M8.5 2.15137L8.07617 2.57617L5.34863 5.30273C5.09294 5.55843 4.86618 5.78438 4.70215 5.98828C4.53117 6.20088 4.38244 6.44405 4.33398 6.75C4.30778 6.91565 4.30778 7.08435 4.33398 7.25C4.38244 7.55595 4.53117 7.79912 4.70215 8.01172C4.86618 8.21561 5.09294 8.44157 5.34863 8.69727L8.07617 11.4238L8.5 11.8486L9.34863 11L8.92383 10.5762L6.19727 7.84863C5.92268 7.57405 5.75151 7.40124 5.6377 7.25977C5.53096 7.12709 5.52187 7.07728 5.51953 7.0625C5.51297 7.02105 5.51297 6.97895 5.51953 6.9375C5.52187 6.92272 5.53096 6.87291 5.6377 6.74023C5.75152 6.59876 5.92268 6.42595 6.19727 6.15137L8.92383 3.42383L9.34863 3L8.5 2.15137Z'

const CHEV_RIGHT = 'M5.5 2.15137L5.92383 2.57617L8.65137 5.30273C8.90706 5.55843 9.13382 5.78438 9.29785 5.98828C9.46883 6.20088 9.61756 6.44405 9.66602 6.75C9.69222 6.91565 9.69222 7.08435 9.66602 7.25C9.61756 7.55595 9.46883 7.79912 9.29785 8.01172C9.13382 8.21561 8.90706 8.44157 8.65137 8.69727L5.92383 11.4238L5.5 11.8486L4.65137 11L5.07617 10.5762L7.80273 7.84863C8.07732 7.57405 8.24849 7.40124 8.3623 7.25977C8.46904 7.12709 8.47813 7.07728 8.48047 7.0625C8.48703 7.02105 8.48703 6.97895 8.48047 6.9375C8.47813 6.92272 8.46904 6.87291 8.3623 6.74023C8.24848 6.59876 8.07732 6.42595 7.80273 6.15137L5.07617 3.42383L4.65137 3L5.5 2.15137Z'

const ChevronLeftIcon = (): React.ReactElement => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: CHEV_LEFT, fill: 'currentColor' }))
const ChevronRightIcon = (): React.ReactElement => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: CHEV_RIGHT, fill: 'currentColor' }))

// ---- Card body ----

export function CardBody({ out, side }: { out: WidgetRenderOut; side: number }): React.ReactElement {
  const scale = side / BASE_SIDE
  const titlePx = Math.round(13 * scale)
  const valuePx = Math.round(20 * scale)
  const radius = Math.round(16 * scale)
  const innerPad = Math.round(12 * scale)
  const head = [React.createElement('div', { key: 't', className: 'dsx-stats-card-title', style: { fontSize: `${titlePx}px` } }, out.title)]
  const foot: React.ReactElement[] = []
  if (out.value != null) foot.push(React.createElement('div', { key: 'v', className: 'dsx-stats-card-value', style: { fontSize: `${valuePx}px` } }, out.value))
  if (out.sub) foot.push(React.createElement('div', { key: 's', className: 'dsx-stats-card-sub', style: { fontSize: `${Math.round(10 * scale)}px` } }, out.sub))
  return React.createElement('div', { className: 'dsx-stats-card', style: { width: `${side}px`, minHeight: `${side}px`, borderRadius: `${radius}px`, padding: `${innerPad}px` } },
    head,
    React.createElement('div', { key: 'foot', style: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 } }, foot),
  )
}

// ---- Order list (config tab) ----

function OrderList({ items, onMove, onRestore, onRemove }: {
  items: string[]
  onMove: (next: string[]) => void
  onRestore?: (id: string) => void
  onRemove?: (id: string) => void
}): React.ReactElement {
  const dragIdx = React.useRef<number | null>(null)
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
    items.map((id, i) => {
      const w = WIDGETS.find((x) => x.id === id)
      if (!w) return null
      return React.createElement('div', {
        key: id, className: 'dsx-order-row', draggable: true,
        onDragStart: (e: React.DragEvent) => { dragIdx.current = i; e.dataTransfer.effectAllowed = 'move' },
        onDragEnd: () => { dragIdx.current = null },
        onDragOver: (e: React.DragEvent) => { e.preventDefault() },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          const from = dragIdx.current
          if (from === null || from === i) return
          const next = items.slice()
          const m = next.splice(from, 1)[0]
          next.splice(i, 0, m)
          dragIdx.current = null
          onMove(next)
        },
      },
        React.createElement('span', { className: 'dsx-drag-handle' }, React.createElement(GripIcon)),
        React.createElement('span', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w.name),
        React.createElement('span', { className: 'dsx-badge' }, badgeOf(w)),
        onRemove ? React.createElement('button', { type: 'button', className: 'dsx-trash', 'aria-label': '卸载', onClick: () => onRemove(id) }, React.createElement(TrashIcon)) : null,
        onRestore ? React.createElement('button', { type: 'button', className: 'dsx-restore', onClick: () => onRestore(id) }, '恢复') : null,
      )
    }),
  )
}

// ---- Config tab ----

function ConfigTab({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const installed = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1)
  const removed = prefs.order.filter((id) => prefs.installed.indexOf(id) === -1)
  const restore = (id: string) => setPrefs({ installed: prefs.installed.concat(id), order: prefs.order.filter((x) => x !== id).concat(id) })
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 4 } }, '已安装（拖动行首手柄调整顺序）'),
    React.createElement(OrderList, { items: installed, onMove: (next) => setPrefs({ order: next.concat(removed) }), onRemove: (id) => setPrefs({ installed: prefs.installed.filter((x) => x !== id) }) }),
    removed.length > 0 ? React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', margin: '10px 0 4px' } }, '已卸载（点击恢复，或拖回上方）') : null,
    removed.length > 0 ? React.createElement(OrderList, { items: removed, onMove: () => {}, onRestore: restore }) : null,
  )
}

// ---- Market tab ----

function MarketTab({ controller, usageData }: { controller: WidgetsController; usageData: UsageData | null }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const [q, setQ] = React.useState('')
  const [previewGroup, setPreviewGroup] = React.useState<string | null>(null)
  const [previewIdx, setPreviewIdx] = React.useState(0)
  const downloadable = WIDGETS.filter((w) => !w.builtin)
  const seen = new Set<string>()
  const marketCards = downloadable.filter((w) => { const g = groupOf(w); if (seen.has(g)) return false; seen.add(g); return true })
  const list = marketCards.filter((w) => `${w.name} ${w.desc} ${w.id}`.toLowerCase().indexOf(q.toLowerCase()) !== -1)

  if (previewGroup !== null) {
    const gw = WIDGETS.filter((w) => groupOf(w) === previewGroup)
    const w = gw[previewIdx] ?? gw[0]
    const ids = gw.map((x) => x.id)
    const installed = ids.every((id) => prefs.installed.indexOf(id) !== -1)
    const fakeStats = { turns: 7, steps: 51, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null, usageData: FAKE_USAGE }
    const out = w ? w.render(fakeStats) : null
    const prev = () => setPreviewIdx((previewIdx - 1 + gw.length) % gw.length)
    const next = () => setPreviewIdx((previewIdx + 1) % gw.length)
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('button', { type: 'button', className: 'dsx-btn', onClick: () => setPreviewGroup(null) }, '← 返回'),
        React.createElement('span', { style: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, w ? w.name : ''),
        React.createElement('button', { type: 'button', className: installed ? 'dsx-btn' : 'dsx-btn dsx-btn-primary', onClick: () => setPrefs({ installed: installed ? prefs.installed.filter((x) => ids.indexOf(x) === -1) : prefs.installed.concat(ids) }) }, installed ? '已安装' : '下载'),
      ),
      React.createElement('div', { style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' } },
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': '上一个', onClick: prev }, React.createElement(ChevronLeftIcon)),
        React.createElement('div', { style: { flex: 1, display: 'flex', justifyContent: 'center' } },
          out ? React.createElement(CardBody, { out, side: 200 }) : null,
        ),
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': '下一个', onClick: next }, React.createElement(ChevronRightIcon)),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } },
        gw.map((x, i) => React.createElement('button', { key: x.id, type: 'button', className: i === previewIdx ? 'dsx-dot dsx-dot-active' : 'dsx-dot', 'aria-label': x.name, onClick: () => setPreviewIdx(i) })),
      ),
    )
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement('input', { type: 'search', placeholder: '搜索组件', className: 'dsx-search', value: q, onChange: (e) => setQ(e.target.value) }),
    React.createElement('div', { className: 'dsx-mlist' },
      list.map((w) => {
        const gw = WIDGETS.filter((x) => groupOf(x) === groupOf(w))
        const ids = gw.map((x) => x.id)
        const installed = ids.every((id) => prefs.installed.indexOf(id) !== -1)
        return React.createElement('button', { key: w.id, type: 'button', className: 'dsx-mcard', 'aria-pressed': installed, onClick: () => { setPreviewGroup(groupOf(w)); setPreviewIdx(0) } },
          React.createElement('span', { className: 'dsx-mhead' },
            React.createElement('span', { className: 'dsx-mname' }, w.name),
            React.createElement('span', { className: 'dsx-badge' }, badgeOf(w)),
          ),
          React.createElement('span', { className: 'dsx-mdesc' }, w.desc),
          React.createElement('code', { className: 'dsx-mid' }, w.id),
          React.createElement('span', { className: 'dsx-macts' },
            React.createElement('span', { className: 'dsx-btn' }, '查看详情'),
            React.createElement('span', { className: installed ? 'dsx-btn dsx-btn-primary' : 'dsx-btn' }, installed ? '已安装' : '下载'),
          ),
        )
      }),
    ),
  )
}

// ---- Widgets page (settings section) ----

export function WidgetsPage({ controller }: { controller: WidgetsController }): React.ReactElement {
  const [tab, setTab] = React.useState('config')
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%' } },
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
      React.createElement('div', { style: { fontSize: 18, fontWeight: 600, lineHeight: '26px', color: 'var(--dsw-alias-label-primary)' } }, '组件'),
      React.createElement('div', { style: { fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-tertiary)' } }, '管理右侧栏中的小组件。'),
    ),
    React.createElement('div', { className: 'dsx-tabbar' },
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'config', onClick: () => setTab('config') }, '组件配置'),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'market', onClick: () => setTab('market') }, '组件市场'),
    ),
    tab === 'config' ? React.createElement(ConfigTab, { controller }) : React.createElement(MarketTab, { controller, usageData: null }),
  )
}

// ---- General settings rows (padding + card side) ----

function Slider({ value, onChange, unit, min, max }: { value: number; onChange: (v: number) => void; unit: string; min: number; max: number }): React.ReactElement {
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 'none' } },
    React.createElement('input', { type: 'range', min, max, step: 1, value, className: 'dsx-slider', style: { width: 140, accentColor: 'var(--dsw-alias-brand-primary)' }, onChange: (e) => onChange(Number(e.target.value)) }),
    React.createElement('span', { style: { width: 44, fontSize: 13, color: 'var(--dsw-alias-label-secondary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, `${value}${unit}`),
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
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement(Row, { title: '组件栏内边距', desc: '栏内四周与卡片间距（两者一致）', children: React.createElement(Slider, { min: 4, max: 40, value: prefs.panelPadding, unit: 'px', onChange: (v) => setPrefs({ panelPadding: v }) }) }),
    React.createElement(Row, { title: '卡片边长', desc: '所有卡片统一的正方形边长，字体与圆角随比例缩放', children: React.createElement(Slider, { min: 100, max: 220, value: prefs.cardSide, unit: 'px', onChange: (v) => setPrefs({ cardSide: v }) }) }),
  )
}
