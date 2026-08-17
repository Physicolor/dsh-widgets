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
  type UsageData, type WidgetRenderOut, type WidgetChart, type WidgetAction, type WidgetRich, type ConfigField, type WidgetStats,
} from './widgets'

/** The base card side all scales derive from. */
const BASE_SIDE = 150

/** Placeholder usage for the market preview (before the real host fetch lands). */
/** Realistic non-zero preview stats so every card renders (none return null). */
const PREVIEW_STATS: WidgetStats = {
  turns: 11, steps: 137,
  llmMs: 1_150_000, toolMs: 247_000,
  ttftMs: 3800, ttftSteps: 1000,
  decodeMs: 5000, decodeTokens: 600,
  usage: { inputTokens: 18_600_000, cacheReadTokens: 18_400_000, outputTokens: 75_600 },
  usageData: { usage: { rolling: { status: 'ok', percent: 42, resetsAt: '2026-08-15T07:25:56Z' }, weekly: { status: 'ok', percent: 25, resetsAt: '2026-08-17T00:00:00Z' }, monthly: { status: 'ok', percent: 8, resetsAt: '2026-09-14T11:35:13Z' } } },
  contextPercent: 0.42,
  contextWindow: 1_000_000,
  contextTokens: 446_000,
  contextBreakdown: { systemTokens: 6000, toolsTokens: 11700, messageTokens: 428_300 },
  todos: [
    { content: '计划任务拆分', status: 'in_progress' },
    { content: '接入上下文数据', status: 'completed' },
    { content: '编写配置表单', status: 'completed' },
    { content: '打磨悬浮动画', status: 'pending' },
    { content: '发布 npm', status: 'pending' },
  ],
  heatmapGrid: (() => {
    const now = new Date()
    const grid: Array<Array<{ value: number; date: string }>> = []
    const day = (offset: number): string => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    for (let w = 0; w < 13; w++) { const row: Array<{ value: number; date: string }> = []; for (let c = 0; c < 7; c++) { const off = (w - 12) * 7 + (c - 6); const v = (off % 5 === 0) ? (Math.pow(off % 13, 2) + 4000) : (off % 3 === 0 ? (off % 11) * 800 : 0); row.push({ value: Math.max(0, v), date: day(off) })}; grid.push(row); }
    return grid
  })(),
  armedAction: null,
}

/** Persisted preferences shared by every surface. */
export interface Prefs {
  panelPadding: number
  cardSide: number
  installed: string[]
  order: string[]
  apiKey: string
  railOpen: boolean
  /** Real-time (mouse-Y continuous) magnification; off = discrete focus + CSS transition. */
  realTime: boolean
  /** Peak magnification factor of the hovered card (e.g. 1.2 = 120%). */
  magnify: number
  /** Width of the right-side add panel (px). */
  panelWidth: number
  /** Per-widget card configuration (widgetId -> config map). */
  cardConfigs: Record<string, Record<string, unknown>>
  /** Maximum number of installed widgets shown in the rail. */
  maxWidgets: number
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

const CHART_TONES: Record<string, string> = {
  primary: 'var(--dsw-alias-state-business-primary)',
  success: 'var(--dsw-alias-state-success-primary)',
  warn: 'var(--dsw-alias-state-warn-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
  muted: 'var(--dsw-alias-label-tertiary)',
}

function ChartBlock({ chart, side }: { chart: WidgetChart; side: number }): React.ReactElement | null {
  const scale = side / BASE_SIDE
  const h = Math.round(56 * scale)
  if (chart.kind === 'bars' && chart.bars) {
    const items = chart.bars.map((b, i) => {
      const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / (chart.max ?? 100)))
      const tone = CHART_TONES[b.tone ?? 'primary'] ?? CHART_TONES.primary
      return React.createElement('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 'none' } },
        React.createElement('div', { style: { height: `${h}px`, display: 'flex', alignItems: 'flex-end' } },
          React.createElement('div', { style: { width: Math.max(8, Math.round(12 * scale)), height: `${Math.max(2, Math.round(h * ratio))}px`, borderRadius: 3, background: tone, opacity: ratio >= 0.95 ? 0.9 : 0.85 } }),
        ),
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)' } }, b.label),
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 6 } }, items)
  }
  if (chart.kind === 'segments' && chart.segments && chart.totalTokens) {
    // Strictly mirrors the official ContextMeter (JObwrW) colors + layout:
    // system = bluish-neutral, tools = violet literal, messages = blue.
    const officialColors = ['var(--dsw-static-neutral-bluish-400)', 'rgb(167, 139, 250)', 'var(--dsw-static-blue-450)']
    const total = chart.totalTokens
    const fmt = (n: number): string => {
      const k = n / 1000
      if (k >= 1000) return `~${(Math.round((k / 1000) * 10) / 10)}M`
      if (k >= 100) return `~${Math.round(k)}K`
      if (k >= 10) return `~${(Math.round(k * 10) / 10)}K`
      if (k >= 1) return `~${(Math.round(k * 10) / 10)}K`
      return `~${n}`
    }
    const bar = chart.segments.map((s, i) => {
      const w = total > 0 ? Math.max(2.2, (s.tokens / total) * 100) : 0
      const tint = officialColors[i % officialColors.length] ?? officialColors[0]
      return React.createElement('div', { key: i, style: { width: `${w}%`, height: '100%', borderRadius: 0, background: tint, flex: 'none', minWidth: 2 } })
    })
    const rows = chart.segments.map((s, i) => {
      const tint = officialColors[i % officialColors.length] ?? officialColors[0]
      return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 0', fontSize: `${Math.round(12 * scale)}px` } },
        React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--dsw-alias-label-secondary)' } },
          React.createElement('span', { 'aria-hidden': true, style: { width: 8, height: 8, borderRadius: 2, background: tint, flex: 'none' } }),
          s.label,
        ),
        React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums', color: 'var(--dsw-alias-label-primary)' } }, fmt(s.tokens)),
      )
    })
    const bh = Math.max(4, Math.round(5 * scale))
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
      // Rectangle (non-capsule) segmented bar — segments tile edge-to-edge.
      React.createElement('div', { style: { display: 'flex', gap: 1, margin: '8px 0 10px', height: bh, borderRadius: 0, background: 'var(--dsw-alias-interactive-bg-hover)', overflow: 'hidden' } }, bar),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 2 } }, rows),
    )
  }
  if (chart.kind === 'ring') {
    const p = Math.max(0, Math.min(1, (chart.value ?? 0) / (chart.max ?? 100)))
    const r = 22 * scale
    const c = 2 * Math.PI * r
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
      React.createElement('div', { style: { position: 'relative', width: `${Math.round(r * 2)}px`, height: `${Math.round(r * 2)}px` } },
        React.createElement('svg', { width: Math.round(r * 2), height: Math.round(r * 2), viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`, 'aria-hidden': true },
          React.createElement('circle', { cx: r, cy: r, r: r - 2, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: 3 }),
          React.createElement('circle', { cx: r, cy: r, r: r - 2, fill: 'none', stroke: CHART_TONES.primary, strokeWidth: 3, strokeDasharray: `${c * p} ${c}`, transform: `rotate(-90 ${r} ${r})`, strokeLinecap: 'round' }),
        ),
        React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${Math.round(13 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, chart.valueLabel ?? `${chart.value ?? 0}%`),
      ),
    )
  }
  if (chart.kind === 'heatmap' && chart.heatmap && chart.heatmap.length) {
    // GitHub-style grid: each row is a week, each cell a day, tinted by amount.
    const max = Math.max(1, ...chart.heatmap.flat().map((c) => c.value))
    const base = 6
    const cell = Math.round((base + 2) * scale)
    const rows = chart.heatmap.map((week, wi) => {
      const cells = week.map((c) => {
        const t = max > 0 ? c.value / max : 0
        const alpha = t > 0 ? 0.25 + 0.7 * t : 0.12
        return React.createElement('div', { key: c.date, title: `${c.date}: ${c.value} tok`, style: { width: cell, height: cell, borderRadius: 2, background: t > 0 ? `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${Math.round(alpha * 100)}%, transparent)` : 'var(--dsw-alias-interactive-bg-hover)', opacity: t > 0 ? 1 : 0.5 } })
      })
      return React.createElement('div', { key: wi, style: { display: 'flex', gap: 2 } }, cells)
    })
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: `${Math.round(4 * scale)}px` } }, rows)
  }
  return null
}

function ActionsBlock({ actions, onAction, scale }: { actions: WidgetAction[]; onAction?: (id: string) => void; scale: number }): React.ReactElement {
  const btnStyle: React.CSSProperties = {
    flex: 'none', height: Math.round(26 * scale), padding: `0 ${Math.round(10 * scale)}px`,
    borderRadius: Math.round(13 * scale), border: '1px solid var(--dsw-alias-border-l2)',
    background: 'transparent', color: 'var(--dsw-alias-brand-primary)',
    fontSize: `${Math.round(11 * scale)}px`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  }
  const btnEls = actions.map((a) => {
    const kind = a.kind
    const st = { ...btnStyle }
    if (kind === 'danger' || kind === 'primary') { st.background = 'var(--dsw-alias-brand-primary)'; st.color = '#fff'; st.borderColor = 'transparent' }
    return React.createElement('button', { key: a.id, type: 'button', title: a.confirmHint, onClick: (e) => { e.stopPropagation(); if (onAction) onAction(a.id) }, 'data-action': a.id, style: st }, a.label)
  })
  return React.createElement('div', { style: { display: 'flex', gap: Math.round(6 * scale), marginTop: Math.round(6 * scale), flexWrap: 'wrap' } }, btnEls)
}

function RichBlock({ rich, scale }: { rich: WidgetRich; scale: number }): React.ReactElement {
  if (rich.type === 'quote' && rich.text) {
    const ta = rich.align ?? 'left'
    return React.createElement('div', { style: { fontSize: `${Math.round(12 * scale)}px`, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)', fontStyle: 'italic', marginTop: `${Math.round(6 * scale)}px`, textAlign: ta, whiteSpace: rich.wrap === false ? 'nowrap' : 'pre-wrap', overflow: rich.wrap === false ? 'hidden' : undefined, textOverflow: rich.wrap === false ? 'ellipsis' : undefined } }, rich.text)
  }
  if (rich.type === 'image' && rich.src) {
    return React.createElement('img', { src: rich.src, alt: '', style: { width: '100%', borderRadius: Math.round(6 * scale), marginTop: `${Math.round(6 * scale)}px`, objectFit: 'cover' } })
  }
  return React.createElement(React.Fragment)
}

export function CardBody({ out, side, onAction }: { out: WidgetRenderOut; side: number; onAction?: (id: string) => void }): React.ReactElement {
  const scale = side / BASE_SIDE
  const titlePx = Math.round(13 * scale)
  const valuePx = Math.round(20 * scale)
  const radius = Math.round(16 * scale)
  const innerPad = Math.round(12 * scale)
  const headFlex = React.createElement('div', { key: 't', className: 'dsx-stats-card-title', style: { fontSize: `${titlePx}px`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 } },
    React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6 } },
      React.createElement('span', null, out.title),
      out.headRight && out.value != null ? React.createElement('span', { style: { fontSize: `${valuePx}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums' } }, out.value) : null,
      out.headRight ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, out.headRight) : null,
    ),
  )
  const headEls = [
    headFlex,
  ]
  if (out.headAfter) {
    // Prominent figure + small figures on their own row under the title.
    headEls.push(React.createElement('div', { key: 'ha', className: 'dsx-stats-card-headafter', style: { display: 'flex', alignItems: 'baseline', gap: 6, marginTop: `${Math.round(2 * scale)}px` } },
      out.headAfter.big != null ? React.createElement('span', { style: { fontSize: `${valuePx}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums' } }, out.headAfter.big) : null,
      out.headAfter.small != null ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, out.headAfter.small) : null,
    ))
  }
  if (out.legend) {
    // Small caption right under the title; unlike headAfter it does not change
    // the vertical alignment, so a bottom-anchored card (e.g. heatmap) keeps it.
    headEls.push(React.createElement('div', { key: 'lg', className: 'dsx-stats-card-legend', style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', marginTop: `${Math.round(2 * scale)}px` } }, out.legend))
  }
  const head = headEls
  const body: React.ReactElement[] = []
  // value is shown inline in the header when headRight is present (official meter
  // header: `上下文已用 64% ~638K / 1M`); otherwise it goes to the body.
  if (out.value != null && !out.headRight) body.push(React.createElement('div', { key: 'v', className: 'dsx-stats-card-value', style: { fontSize: `${valuePx}px` } }, out.value))
  if (out.sub) body.push(React.createElement('div', { key: 's', className: 'dsx-stats-card-sub', style: { fontSize: `${Math.round(10 * scale)}px` } }, out.sub))
  if (out.chart) { const c = ChartBlock({ chart: out.chart, side }); if (c) body.push(React.createElement('div', { key: 'c' }, c)) }
  if (out.rich) body.push(React.createElement('div', { key: 'r' }, RichBlock({ rich: out.rich, scale })))
  // Bottom-left value sits in the normal foot; the corner button is absolutely
  // positioned top-right: a brand-blue filled round button with the official
  // refresh/rotate icon; when armed it widens into a「确认」capsule.
  const compressIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
    React.createElement('path', { d: 'M7.92136 0.349152C10.3744 0.349234 12.5564 1.5052 13.9557 3.29894L15.1281 2.12759C15.3303 1.92546 15.6767 2.06943 15.6767 2.35538V5.53923C15.6766 5.71626 15.5329 5.85976 15.3559 5.86002H12.171C11.8854 5.8597 11.7426 5.51465 11.9443 5.31249L12.9641 4.29056C11.8237 2.74305 9.98908 1.74106 7.92136 1.74097C4.46436 1.74097 1.66233 4.543 1.66233 8C1.66233 11.457 4.46436 14.259 7.92136 14.259C11.3782 14.2589 14.1804 11.4569 14.1804 8H15.5722C15.5722 12.2251 12.1465 15.6507 7.92136 15.6508C3.69614 15.6508 0.270508 12.2252 0.270508 8C0.270508 3.77478 3.69614 0.349152 7.92136 0.349152Z', fill: 'currentColor' }),
  )
  const cornerPos = out.corner?.pos === 'bottom'
    ? { bottom: `${Math.round(8 * scale)}px`, right: `${Math.round(8 * scale)}px` }
    : { top: `${Math.round(8 * scale)}px`, right: `${Math.round(8 * scale)}px` }
  const corner = out.corner
    ? React.createElement('button', {
        key: 'corner', type: 'button', className: 'dsx-stats-card-corner' + (out.corner.armed ? ' armed' : ''),
        style: cornerPos,
        title: out.corner.armed ? out.corner.armedLabel : out.corner.label,
        onClick: (e) => { e.stopPropagation(); if (onAction) onAction(out.corner!.id) },
      }, out.corner.armed ? out.corner.armedLabel : compressIcon)
    : null
  // When the card carries a rich block with a vertical placement (valign), the
  // body owns the full remaining height so the block can sit top/center/bottom;
  // otherwise default to pushing content to the bottom of the card.
  const vj = out.rich?.valign === 'bottom' ? 'flex-end' : out.rich?.valign === 'center' ? 'center' : undefined
  // Cards with a headRight figure (e.g. context %) sit top-aligned (data right
  // under the title) instead of being pushed to the bottom of the card.
  const topAligned = vj || out.headRight || out.headAfter
  const footStyle: React.CSSProperties = topAligned
    ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: vj ?? 'flex-start' }
    : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  return React.createElement('div', { className: 'dsx-stats-card', style: { position: 'relative', width: `${side}px`, minHeight: `${side}px`, borderRadius: `${radius}px`, padding: `${innerPad}px` } },
    corner,
    head,
    React.createElement('div', { key: 'foot', style: footStyle }, body),
    out.actions ? ActionsBlock({ actions: out.actions, onAction, scale }) : null,
  )
}

// ---- Order list (config tab) ----

function OrderList({ items, onMove, onRestore, onRemove, onSelect, selected }: {
  items: string[]
  onMove: (next: string[]) => void
  onRestore?: (id: string) => void
  onRemove?: (id: string) => void
  onSelect?: (id: string) => void
  selected?: string
}): React.ReactElement {
  const dragIdx = React.useRef<number | null>(null)
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
    items.map((id, i) => {
      const w = WIDGETS.find((x) => x.id === id)
      if (!w) return null
      const isSel = selected === id
      return React.createElement('div', {
        key: id, className: 'dsx-order-row' + (isSel ? ' selected' : ''), draggable: true,
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
        onClick: onSelect ? () => onSelect(id) : undefined,
      },
        React.createElement('span', { className: 'dsx-drag-handle' }, React.createElement(GripIcon)),
        React.createElement('span', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w.name),
        React.createElement('span', { className: 'dsx-badge' }, badgeOf(w)),
        onRemove ? React.createElement('button', { type: 'button', className: 'dsx-trash', 'aria-label': '卸载', onClick: () => { if (onSelect && selected === id) onSelect('') ; onRemove(id) } }, React.createElement(TrashIcon)) : null,
        onRestore ? React.createElement('button', { type: 'button', className: 'dsx-restore', onClick: () => onRestore(id) }, '恢复') : null,
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
      placeholder: field.label,
      value: typeof value === 'string' ? value : (field.default as string ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    })
  }
  if (field.type === 'toggle') {
    const on = typeof value === 'boolean' ? value : (field.default === true)
    return React.createElement('label', { className: 'dsx-switch-row', title: field.label },
      React.createElement('input', { type: 'checkbox', className: 'dsx-switch-input', checked: on, onChange: (e) => onChange(e.target.checked) }),
      React.createElement('span', { className: 'dsx-switch-track', 'aria-hidden': true }, React.createElement('span', { className: 'dsx-switch-thumb' })),
    )
  }
  if (field.type === 'align' || field.type === 'valign') {
    const opts = field.type === 'align' ? ['left', 'center', 'right'] : ['top', 'center', 'bottom']
    const labels = field.type === 'align' ? ['左', '居中', '右'] : ['上', '居中', '下']
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
      title: field.label,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
    },
      opts.map(([o, label]) => React.createElement('option', { key: o, value: o }, label)),
    )
  }
  return React.createElement(React.Fragment)
}

function ConfigTab({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const [selected, setSelected] = React.useState<string>('')
  const installed = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1)
  const removed = prefs.order.filter((id) => prefs.installed.indexOf(id) === -1)
  const atLimit = installed.length >= prefs.maxWidgets
  const restore = (id: string): void => {
    if (atLimit) return
    setPrefs({ installed: prefs.installed.concat(id), order: prefs.order.filter((x) => x !== id).concat(id) })
  }
  // Preview + config for the selected widget.
  const selWidget = selected ? WIDGETS.find((x) => x.id === selected) : undefined
  const selConfig = selWidget ? (prefs.cardConfigs[selected] ?? {}) : null
  const previewOut = (): WidgetRenderOut | null => {
    if (!selWidget || !selConfig) return null
    // For the heatmap, rebuild the preview grid honoring the window-alignment
    // mode (rolling: today on the right / quarter: aligned to calendar quarter)
    // so the config edit is visible in the preview.
    let stats = { ...PREVIEW_STATS, ...selConfig } as unknown as Parameters<typeof selWidget.render>[0]
    if (selWidget.id === 'heatmap') {
      const mode = (selConfig.monthMode as 'rolling' | 'quarter') === 'quarter' ? 'quarter' : 'rolling'
      const now = new Date()
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      const base = new Date(mode === 'quarter'
        ? (() => { const q = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); return new Date(q.getFullYear(), q.getMonth(), q.getDate() - q.getDay()) })()
        : (() => { const b = new Date(startOfWeek); b.setDate(b.getDate() - 12 * 7); return b })())
      const grid: Array<Array<{ value: number; date: string }>> = []
      const day = (r: number, c: number): Date => { const d = new Date(base); d.setDate(base.getDate() + c * 7 + r); return d }
      // Mirror the real seed so preview ≈ actual: the three used days carry their
      // known absolute values (total 3203M), the rest stay small markers.
      const realSeed: Record<string, number> = {
        '2026-08-14': 244_188_000,
        '2026-08-15': 1_639_548_000,
        '2026-08-16': 1_319_264_000,
      }
      for (let r = 0; r < 7; r++) {
        const row: Array<{ value: number; date: string }> = []
        for (let c = 0; c < 13; c++) {
          const d = day(r, c)
          const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const off = Math.round((d.getTime() - startOfWeek.getTime()) / 86400000)
          const v = (dk in realSeed) ? realSeed[dk] : ((off < 0) ? (Math.abs(off) % 5 === 0 ? 600 : 0) : (off % 4 === 0 ? 1400 : (off % 3 === 0 ? 700 : 0)))
          row.push({ value: v, date: dk })
        }
        grid.push(row)
      }
      stats = { ...stats, heatmapGrid: grid } as unknown as Parameters<typeof selWidget.render>[0]
    }
    return selWidget.render(stats)
  }
  const setConfig = (field: ConfigField, value: unknown): void => {
    const next = { ...(prefs.cardConfigs[selected] ?? {}) }
    const def = field.default
    const isDefault = value === def || value === '' || value === undefined || value === null
    if (isDefault) delete next[field.key]
    else next[field.key] = value
    setPrefs({ cardConfigs: { ...prefs.cardConfigs, [selected]: next } })
  }
  const out = previewOut()
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
    React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 4 } }, `已安装 ${installed.length}/${prefs.maxWidgets}（点击组件可预览与配置）`),
    React.createElement(OrderList, { items: installed, onMove: (next) => setPrefs({ order: next.concat(removed) }), onRemove: (id) => setPrefs({ installed: prefs.installed.filter((x) => x !== id) }), onSelect: setSelected, selected }),
    removed.length > 0 ? React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', margin: '10px 0 4px' } }, '已卸载（点击恢复，或拖回上方）') : null,
    removed.length > 0 ? React.createElement(OrderList, { items: removed, onMove: () => {}, onRestore: restore, onSelect: setSelected, selected }) : null,
    selWidget && selConfig ? React.createElement('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--dsw-alias-border-l2)', display: 'flex', flexDirection: 'column', gap: 10 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, `${selWidget.name} · 预览`),
      out ? React.createElement('div', { style: { display: 'flex', justifyContent: 'center', padding: 8 } }, React.createElement(CardBody, { out, side: 150 })) : null,
      selWidget.configSchema && selWidget.configSchema.length > 0 ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, '自定义'),
        selWidget.configSchema.map((f) => React.createElement('div', { key: f.key, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
          React.createElement('span', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, f.label),
          React.createElement('div', { style: { flex: 'none', minWidth: 0 } }, React.createElement(ConfigFieldControl, { field: f, value: selConfig[f.key], onChange: (v) => setConfig(f, v) })),
        )),
      ) : null,
    ) : null,
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
    const out = w ? w.render(PREVIEW_STATS) : null
    const prev = () => setPreviewIdx((previewIdx - 1 + gw.length) % gw.length)
    const next = () => setPreviewIdx((previewIdx + 1) % gw.length)
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('button', { type: 'button', className: 'dsx-btn', onClick: () => setPreviewGroup(null) }, '← 返回'),
        React.createElement('span', { style: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, w ? w.name : ''),
        React.createElement('button', { type: 'button', disabled: !installed && prefs.installed.length >= prefs.maxWidgets, className: installed ? 'dsx-btn' : 'dsx-btn dsx-btn-primary', onClick: () => setPrefs({ installed: installed ? prefs.installed.filter((x) => ids.indexOf(x) === -1) : prefs.installed.concat(ids) }) }, installed ? '已安装' : '下载'),
      ),
      !installed && prefs.installed.length >= prefs.maxWidgets
        ? React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-warn-primary, var(--dsw-alias-label-tertiary))', marginTop: -4 } }, `已达上限 ${prefs.maxWidgets} 个，先卸载再添加`)
        : null,
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

export function WidgetsPage({ controller, hideHeader }: { controller: WidgetsController; hideHeader?: boolean }): React.ReactElement {
  const [tab, setTab] = React.useState('config')
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%' } },
    hideHeader ? null : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
      React.createElement('div', { style: { fontSize: 18, fontWeight: 600, lineHeight: '26px', color: 'var(--dsw-alias-label-primary)' } }, '组件'),
      React.createElement('div', { style: { fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-tertiary)' } }, '管理右侧栏中的小组件。'),
    ),
    React.createElement('div', { className: 'dsx-tabbar' },
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'config', onClick: () => setTab('config') }, '组件配置'),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'market', onClick: () => setTab('market') }, '组件市场'),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'settings', onClick: () => setTab('settings') }, '组件设置'),
    ),
    tab === 'config' ? React.createElement(ConfigTab, { controller })
      : tab === 'market' ? React.createElement(MarketTab, { controller, usageData: null })
      : React.createElement(SettingsPanel, { controller }),
  )
}

// ---- General settings rows (padding + card side) ----

function Slider({ value, onChange, unit, min, max, step }: { value: number; onChange: (v: number) => void; unit: string; min: number; max: number; step?: number }): React.ReactElement {
  // Native range + accent-color, matching the official uitw-slider pattern so we
  // reuse the product's slider look instead of inventing a custom one.
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 'none' } },
    React.createElement('input', { type: 'range', min, max, step: step ?? 1, value, style: { width: 160, accentColor: 'var(--dsw-alias-brand-primary)' }, onChange: (e) => onChange(Number(e.target.value)) }),
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
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement(Row, { title: '放大倍数', desc: '被悬浮组件的峰值放大比例（1.0 = 不放大，1.4 = 1.4 倍）', children: React.createElement(Slider, { min: 1, max: 1.4, step: 0.05, value: prefs.magnify, unit: 'x', onChange: (v) => setPrefs({ magnify: v }) }) }),
    React.createElement(Row, { title: '组件栏内边距', desc: '栏内四周与卡片间距（两者一致）', children: React.createElement(Slider, { min: 4, max: 40, value: prefs.panelPadding, unit: 'px', onChange: (v) => setPrefs({ panelPadding: v }) }) }),
    React.createElement(Row, { title: '卡片边长', desc: '所有卡片统一的正方形边长，字体与圆角随比例缩放', children: React.createElement(Slider, { min: 100, max: 220, value: prefs.cardSide, unit: 'px', onChange: (v) => setPrefs({ cardSide: v }) }) }),
    React.createElement(Row, { title: '添加面板宽度', desc: '右侧“添加组件”面板的宽度，也可拖其左边缘调整', children: React.createElement(Slider, { min: 260, max: 760, value: prefs.panelWidth, unit: 'px', onChange: (v) => setPrefs({ panelWidth: v }) }) }),
    React.createElement(Row, { title: '最多组件数', desc: '侧边栏最多显示的组件数量，超限后无法再添加', children: React.createElement(Slider, { min: 1, max: 20, value: prefs.maxWidgets, unit: '个', onChange: (v) => setPrefs({ maxWidgets: v }) }) }),
  )
}
