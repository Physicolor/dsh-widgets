/**
 * 组件面板（自创的浮层）—— 已封存，2026-10-20。
 *
 * ── 状态：不挂载、不导入、不随包提供入口 ──
 *
 * 这是右栏「设置」瓦片曾经打开的自制浮层（组件配置 / 组件市场 / 高级设置三 tab）。
 * 从 2026-10-20 起，两个瓦片（静止层与放大层）都直接打开**官方设置窗口的「组件」页**
 * ——见 `rail/rail-view.tsx` 的 `openSettingsSection`。本文件因此没有任何 import：
 *
 *   - 没有调用方，打包时整块被 tree-shake 掉，不会进 `lib/client.js`；
 *   - 代码与样式（`styles/panel.module.css` 的 `.dsx-stats-addpanel*`）原样保留，
 *     将来若要恢复，把 `<AddPanel>` 挂回 `rail-view.tsx` 的 drawer 子节点即可。
 *
 * 为什么不直接删：它的三 tab 页面（`WidgetsPage`）已经由官方设置页复用，浮层本身
 * 只多出「portal + 拖宽 + 关闭头」这一层壳；保留下来的成本只是仓库里的一份源码，
 * 而重新实现一遍的代价是重做层级与非遮挡结论（面板必须 portal 到 body，否则被
 * composer 的 z-7 / 右栏宽度手柄 z-8 盖住——见 `docs/architecture/CODE_MAP.md`）。
 *
 * 恢复时要一并恢复的三件事：
 *   1. 瓦片动作：`onTileClick` 与 `RailWave` 的 `onAddClick` 都改回 `toggleAdd`；
 *   2. `side === 1` 列的隐藏规则不变，面板宽度读 `prefs.panelWidth`
 *      （2026-10-22：设置页已移除该行——它只被这里读取——字段仍保留）；
 *   3. `localStorage` 开关或构建期开关二选一（旧实现是 `dsx-addpanel-local`）。
 */
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cardRadius } from '../render/card-geometry'
import { WidgetsPage } from './Settings'
import { COL_GAP, DETAIL_W, LIST_W } from './layout'
import { t } from '../i18n'
import type { Prefs } from '../runtime/prefs'
import type { WidgetStats } from '../lib/contract/types'

export interface AddPanelProps {
  /** Visible state (the local, non-persisted toggle this panel is opened with). */
  open: boolean
  prefs: Prefs
  setPrefs: (patch: Partial<Prefs>) => void
  /** The rail's live stats fold, so the previews show real data where a session provides it. */
  liveStats: (key: string) => WidgetStats
  /** The rail's current tile side (see `WidgetsController.railSide`). */
  railSide: number
  /** Called by the panel to close itself (its own close button). */
  onClose: () => void
}

const closeIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true },
  React.createElement('path', { d: 'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z', fill: 'currentColor' }),
)

/**
 * The floating panel. Portaled to `<body>`: inside `conversation.input.overlay` the
 * composer seat (z-7) and the right column's width handle (z-8) paint above it.
 */
export function AddPanel({ open, prefs, setPrefs, liveStats, railSide, onClose }: AddPanelProps): React.ReactElement {
  const [detailOpen, setDetailOpen] = React.useState(false)
  const pw = prefs.panelWidth
  const startResize = (e: React.PointerEvent): void => {
    e.preventDefault(); e.stopPropagation()
    const x0 = e.clientX, w0 = pw
    const move = (ev: PointerEvent): void => setPrefs({ panelWidth: Math.max(260, Math.min(760, Math.round(w0 + (x0 - ev.clientX)))) })
    const up = (): void => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  return createPortal(React.createElement('div', {
    className: 'dsx-stats-addpanel' + (open ? ' open' : '') + (prefs.squircle ? ' dsx-squircle' : ''),
    style: {
      top: 'var(--dsx-rail-top,0px)',
      // Enough for list + drawer, and never more than that on the drawer's behalf:
      // an already-wide panel keeps its width instead of sprouting a dead band.
      // 26 = the panel's own 2px of borders + the body's 24px of padding.
      width: `${detailOpen ? Math.max(pw, LIST_W + COL_GAP + DETAIL_W + 26) : pw}px`,
      borderRadius: `${cardRadius(100, prefs.cornerPercent)}px`,
    },
  },
    React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': t('ui.addPanel.resizeAria'), onPointerDown: startResize }),
    React.createElement('div', { className: 'dsx-stats-addpanel-header' },
      React.createElement('div', { className: 'dsx-stats-addpanel-title' }, t('ui.addPanel.title')),
      React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': t('ui.addPanel.closeAria'), onClick: onClose }, closeIcon),
    ),
    React.createElement('div', { className: 'dsx-stats-addpanel-body' },
      React.createElement(WidgetsPage, { controller: {
        prefs,
        setPrefs,
        onDetailToggle: setDetailOpen,
        // The drawer's FINAL width, laid out at its target size from the first frame.
        detailWidth: Math.max(DETAIL_W, pw - 26 - LIST_W - COL_GAP),
        railSide,
        liveStats,
      }, hideHeader: true }),
    ),
  ), document.body)
}
