/**
 * Harness Widgets — React components (plain createElement, no JSX).
 *
 * All surfaces receive a `WidgetsController` (prefs + setPrefs) and the live
 * usage data. Components are pure presentation over those props; the apply
 * closure owns state and slot registration.
 */

import * as React from 'react'
import { WIDGETS } from './generated.registry'
import {
  badgeOf, groupOf, instanceKey, parseInstanceKey, sizesOf,
  widgetName, widgetDesc, widgetSimToggle, fieldLabel, optionLabel,
  type UsageData, type WidgetRenderOut, type WidgetChart, type WidgetAction, type WidgetRich, type ConfigField, type WidgetStats, type WidgetSize, type WidgetRenderMeta,
} from './lib/contract'
import { fmtShortDate, buildRollingGrid } from './lib/format'
import { t } from './i18n'

/** The base card side all scales derive from. */
const BASE_SIDE = 150

/** Realistic non-zero preview stats so every card renders (none return null). */
/** Raw preview usage log: derived once so BOTH the 2×2 grid and the 2×4 / bar
 *  variants share exactly the same source the real collector uses. */
const PREVIEW_RAW: Record<string, number> = (() => {
  const now = new Date()
  const raw: Record<string, number> = {}
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12 * 7)
  for (let i = 0; i < 13 * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const off = i - 12 * 7
    raw[k] = off % 5 === 0 ? (Math.pow(Math.abs(off) % 13, 2) + 4000) : (off % 3 === 0 ? (off % 11) * 800 : 0)
  }
  return raw
})()
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
    { content: 'Split plan tasks', status: 'in_progress' },
    { content: 'Feed context data', status: 'completed' },
    { content: 'Write config form', status: 'completed' },
    { content: 'Polish hover animation', status: 'pending' },
    { content: 'Publish npm', status: 'pending' },
  ],
  // Grid built by the SAME path as the real 2×2 calendar (7 week-rows × 13
  // day-columns) — the old preview built it transposed (13×7), which rendered
  // the heatmap with width and height swapped.
  heatmapGrid: buildRollingGrid(PREVIEW_RAW, 13),
  heatmapRaw: PREVIEW_RAW,
  armedAction: null,
  // Machine snapshot mock for the System widget previews (values mirror a real
  // mid-load laptop so the preview looks live, not synthetic).
  sysinfo: {
    ts: 0,
    cpu: { util: 43 },
    mem: { used: 17.4 * 1024 ** 3, total: 34.2 * 1024 ** 3, percent: 51 },
    gpu: { name: 'NVIDIA GeForce RTX 5070 Ti Laptop GPU', temp: 58, util: 8, memUsed: 4815 * 1024 ** 2, memTotal: 12227 * 1024 ** 2, memPercent: 39 },
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
  /** Number of card columns in the rail (1 / 2 / 4). Default 2. */
  columns: number
  /** Hide the official composer stats line under the input box (personal
   *  preference — the rail widgets can show the same data). Default OFF so
   *  other users keep their stats bar. */
  hideStatsLine: boolean
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

function ChartBlock({ chart, side, width }: { chart: WidgetChart; side: number; width?: number }): React.ReactElement | null {
  const scale = side / BASE_SIDE
  const h = Math.round(56 * scale)
  if (chart.kind === 'bars' && chart.bars) {
    // Three-window OpenCode usage bars. Each column flexes to an equal share of
    // the card width (same elastic columns as the daily token bars, barsV) with
    // the same 4px gutter; each bar fills ~60% of its column so the width
    // (≈24px on a 2×2 card) stays proportionate to its 56px height — wide
    // enough to feel solid, narrow enough to read as a bar, not a block. The
    // corners are fully rounded (5px) — without a baseline track underneath,
    // square bottoms read as overly sharp. No value labels on the bars by
    // design (small-chart convention: labels are chartjunk); the exact percent
    // surfaces on hover via the title tooltip.
    const items = chart.bars.map((b, i) => {
      const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / (chart.max ?? 100)))
      const tone = CHART_TONES[b.tone ?? 'primary'] ?? CHART_TONES.primary
      const pct = Math.round(b.value ?? ratio * 100)
      return React.createElement('div', { key: i, title: `${b.label} ${pct}%`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } },
        React.createElement('div', { style: { width: '100%', height: `${h}px`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' } },
          React.createElement('div', { style: { width: '60%', height: `${Math.max(2, Math.round(h * ratio))}px`, borderRadius: 5, background: tone, opacity: ratio >= 0.95 ? 0.9 : 0.85 } }),
        ),
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap' } }, b.label),
      )
    })
    // Faint 25/50/75% reference lines behind the bars (overlap the bar area
    // only, never the labels), so each bar's height can be eyeballed against a
    // quarter scale without any value labels on the bars themselves.
    const gridLines = [0.25, 0.5, 0.75].map((p) =>
      React.createElement('div', { key: p, 'aria-hidden': true, style: { position: 'absolute', left: 0, right: 0, top: `${h * (1 - p)}px`, borderTop: '1px dashed var(--dsw-alias-label-tertiary)', opacity: 0.3, pointerEvents: 'none' } }),
    )
    return React.createElement('div', { style: { position: 'relative' } },
      ...gridLines,
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, position: 'relative' } }, items),
    )
  }
  if (chart.kind === 'barsV' && chart.bars) {
    // Vertical last-N-days bars (default 7). The bar AREA height EXACTLY matches
    // the 2×2 heatmap calendar's content height (7 rows → 7*cell + 6*2px gaps),
    // so the bars occupy the same vertical footprint as the day-rows they
    // replace. Bars grow up from the floor; only the FIRST (left) and LAST
    // (right) date labels are drawn, on the bottom corners. Bar width: 93% of
    // the column ≈ 1.5× the previous 62% (user preference).
    const cell = Math.round((6 + 2) * scale) // same cell size as the heatmap
    const barAreaH = 7 * cell + 6 * 2         // = heatmap content height
    const labelH = Math.round(10 * scale)
    const barMax = Math.max(1, ...chart.bars.map((b) => b.value))
    const last = chart.bars.length - 1
    const bars = chart.bars.map((b, i) => {
      const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / barMax))
      const tone = CHART_TONES[b.tone ?? 'primary'] ?? CHART_TONES.primary
      const active = (b.value ?? 0) > 0
      // Only the first and last columns carry a date label (bottom corners);
      // middle columns keep an empty spacer so they stay evenly sized.
      const label = (i === 0 || i === last) ? b.label : ''
      return React.createElement('div', { key: i, title: `${b.label}: ${b.value} tok`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' } },
        React.createElement('div', { style: { width: '93%', maxWidth: Math.max(6, Math.round(21 * scale)), height: active ? `${Math.max(2, Math.round((barAreaH - labelH) * ratio))}px` : `${Math.max(2, Math.round(3 * scale))}px`, borderRadius: 4, background: tone, opacity: active ? 0.85 : 0.18 } }),
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, minHeight: labelH, display: 'flex', alignItems: 'flex-end' } }, label),
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: `${barAreaH}px`, marginTop: `${Math.round(4 * scale)}px` } }, bars)
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
  if (chart.kind === 'rings' && chart.rings && chart.rings.length) {
    // Several donuts side by side (e.g. OpenCode rolling/weekly/monthly usage,
    // or the CPU/GPU system rings). The centre stays clean — no in-ring text —
    // so each ring can be drawn thick and full; the percent sits under its
    // ring, its label beneath that (9px tertiary, ellipsized), and the exact
    // value surfaces on hover via the title tooltip. Ring-to-ring spacing
    // equals the card inner padding itself (12px on a 2×2).
    const pad = Math.round(8 * scale)
    const mg = Math.round(12 * scale) // inter-ring gap = the card inner padding itself
    const avail = (width ?? side) - 2 * pad
    const r = Math.max(10, Math.min(24 * scale, (avail - (chart.rings.length - 1) * mg) / (chart.rings.length * 2)))
    const sw = Math.max(3.5, Math.round(5 * scale))
    const items = chart.rings.map((rg, i) => {
      const p = Math.max(0, Math.min(1, rg.ratio ?? rg.value / (chart.max ?? 100)))
      const c = 2 * Math.PI * (r - sw / 2)
      const tone = CHART_TONES[rg.tone ?? 'primary'] ?? CHART_TONES.primary
      return React.createElement('div', { key: i, title: `${rg.label} ${Math.round(rg.value)}%`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(2 * scale) } },
        React.createElement('svg', { width: Math.round(r * 2), height: Math.round(r * 2), viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`, 'aria-hidden': true },
          React.createElement('circle', { cx: r, cy: r, r: r - sw / 2, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: sw }),
          React.createElement('circle', { cx: r, cy: r, r: r - sw / 2, fill: 'none', stroke: tone, strokeWidth: sw, strokeDasharray: `${c * p} ${c}`, transform: `rotate(-90 ${r} ${r})`, strokeLinecap: 'round' }),
        ),
        React.createElement('div', { style: { fontSize: `${Math.round(11 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 } }, `${Math.round(rg.value)}%`),
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.2, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, rg.label),
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: mg } }, items)
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
    // Bottom corners carry the window's earliest (left) and latest (right)
    // dates in short month.day form (e.g. 3.2 / 8.28).
    // A wide grid (≥20 weeks, i.e. the 2×4 half-year view) auto-fits the card
    // width and is horizontally centred; the 2×2 grid keeps fixed cells.
    const weeks = chart.heatmap[0]?.length ?? 13
    const isWide = weeks >= 20
    const pad = Math.round(12 * scale)
    const availW = (width ?? side) - 2 * pad
    const gap = 2
    const wideCell = isWide ? Math.max(3, Math.floor((availW - (weeks - 1) * gap) / weeks)) : Math.round((6 + 2) * scale)
    const cell = wideCell
    const max = Math.max(1, ...chart.heatmap.flat().map((c) => c.value))
    const rows = chart.heatmap.map((week, wi) => {
      const cells = week.map((c) => {
        const t = max > 0 ? c.value / max : 0
        const alpha = t > 0 ? 0.25 + 0.7 * t : 0.12
        return React.createElement('div', { key: c.date, title: `${c.date}: ${c.value} tok`, style: { width: cell, height: cell, borderRadius: 2, background: t > 0 ? `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${Math.round(alpha * 100)}%, transparent)` : 'var(--dsw-alias-interactive-bg-hover)', opacity: t > 0 ? 1 : 0.5 } })
      })
      return React.createElement('div', { key: wi, style: { display: 'flex', gap: 2 } }, cells)
    })
    const first = chart.heatmap[0]?.[0]?.date
    // The grid's last cell can be this-week Saturday (rolling) or a future
    // quarter column (quarter mode), so the "latest" corner shows TODAY (the
    // true right edge of the data), never a future date.
    const nowD = new Date()
    const todayIso = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`
    const corner = (text: string | undefined, align: 'flex-start' | 'flex-end'): React.ReactElement | null => {
      if (!text) return null
      return React.createElement('span', { style: { display: 'flex', alignItems: align, fontSize: `${Math.round(8.5 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, fmtShortDate(text))
    }
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: `${Math.round(4 * scale)}px`, alignItems: 'center', width: '100%' } },
      ...rows,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: `${Math.round(3 * scale)}px`, width: '100%' } },
        corner(first, 'flex-start'),
        corner(todayIso, 'flex-end'),
      ),
    )
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
    if (kind === 'primary') { st.background = 'var(--dsw-alias-state-business-primary)'; st.color = '#fff'; st.borderColor = 'transparent' }
    else if (kind === 'danger') { st.background = 'var(--dsw-alias-state-error-primary)'; st.color = '#fff'; st.borderColor = 'transparent' }
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

export function CardBody({ out, unit, width, onAction, onCycle }: { out: WidgetRenderOut; unit: number; width?: number; onAction?: (id: string) => void; onCycle?: (out: WidgetRenderOut) => void }): React.ReactElement {
  const scale = unit / BASE_SIDE
  const boxW = width ?? unit
  const titlePx = Math.round(13 * scale)
  const valuePx = Math.round(20 * scale)
  const radius = Math.round(16 * scale)
  const innerPad = Math.round(12 * scale)
  // Whole-card cycle (pooled usage widgets): a press plays a short press-down
  // (scale dip) and, on click, cycles the view; the release springs back.
  const cyclable = out.cycle !== undefined
  const [pressed, setPressed] = React.useState(false)
  const pressTimer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => { if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current) }, [])
  const pressDown = (): void => {
    if (!cyclable) return
    setPressed(true)
    if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(() => setPressed(false), 190)
  }
  const headFlex = React.createElement('div', { key: 't', className: 'dsx-stats-card-title', style: { fontSize: `${titlePx}px`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 } },
    React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6 } },
      React.createElement('span', null, out.title),
      out.headRight && out.value != null ? React.createElement('span', { style: { fontSize: `${valuePx}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums' } }, out.value) : null,
      out.headRight ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, out.headRight) : null,
    ),
  )
  const headEls: Array<React.ReactElement> = [
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
  if (out.meter && out.meter.length) {
    // Two-line live meter under the title (e.g. peak-pricing windows): the
    // active row lights up brand-blue and scales up slightly, the idle row
    // keeps the faint legend look. Both use the same font as the token-bar
    // legend so the format stays consistent across cards.
    headEls.push(React.createElement('div', { key: 'mt', className: 'dsx-stats-card-meter', style: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: `${Math.round(4 * scale)}px` } },
      out.meter.map((m, i) => React.createElement('div', { key: i, style: {
        fontSize: `${m.active ? Math.round(12 * scale) : Math.round(10 * scale)}px`,
        fontWeight: m.active ? 600 : 500,
        color: m.active ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-label-tertiary)',
        lineHeight: 1.2,
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.25s ease, font-size 0.25s ease, font-weight 0.25s ease',
      } }, m.label)),
    ))
  }
  const head = headEls
  const body: React.ReactElement[] = []
  // value is shown inline in the header when headRight is present (official meter
  // header: `上下文已用 64% ~638K / 1M`); otherwise it goes to the body.
  if (out.value != null && !out.headRight) body.push(React.createElement('div', { key: 'v', className: 'dsx-stats-card-value', style: { fontSize: `${valuePx}px`, color: out.valueTone === 'danger' ? 'var(--dsw-alias-state-error-primary)' : undefined } }, out.value))
  if (out.sub) body.push(React.createElement('div', { key: 's', className: 'dsx-stats-card-sub', style: { fontSize: `${Math.round(10 * scale)}px` } }, out.sub))
  if (out.chart) { const c = ChartBlock({ chart: out.chart, side: unit, width: boxW }); if (c) body.push(React.createElement('div', { key: 'c' }, c)) }
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
  // Top-aligned only when a big figure demands its own row under the title
  // (headAfter, official meter) or a rich block pins vertically. A headRight
  // figure (today/window tokens) lives in the title row and must NOT force
  // top-alignment — the chart below stays bottom-aligned (2×4 cards).
  const topAligned = vj || out.headAfter
  const footStyle: React.CSSProperties = topAligned
    ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: vj ?? 'flex-start' }
    : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  return React.createElement('div', {
    className: 'dsx-stats-card' + (out.alert ? ' dsx-peak-alert' : '') + (cyclable ? (pressed ? ' dsx-cyclable dsx-cycle-pressed' : ' dsx-cyclable') : ''),
    style: { position: 'relative', width: `${boxW}px`, minHeight: `${unit}px`, borderRadius: `${radius}px`, padding: `${innerPad}px` },
    title: out.cycle?.hint,
    onClick: cyclable ? () => { pressDown(); if (onCycle) onCycle(out) } : undefined,
    onPointerDown: cyclable ? pressDown : undefined,
  },
    corner,
    head,
    React.createElement('div', { key: 'foot', style: footStyle }, body),
    out.actions ? ActionsBlock({ actions: out.actions, onAction, scale }) : null,
  )
}

// ---- Order list (config tab) ----

function OrderList({ items, onMove, onRemove, onSelect, selected }: {
  items: string[]
  onMove: (next: string[]) => void
  onRemove?: (id: string) => void
  onSelect?: (id: string) => void
  selected?: string
}): React.ReactElement {
  const dragIdx = React.useRef<number | null>(null)
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
    items.map((id, i) => {
      const { widgetId, size } = parseInstanceKey(id)
      const w = WIDGETS.find((x) => x.id === widgetId)
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
        React.createElement('span', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, widgetName(w)),
        React.createElement('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', flex: 'none' } }, size === '2x4' ? '2×4' : '2×2'),
        React.createElement('span', { className: 'dsx-badge' }, badgeOf(w)),
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
  return React.createElement(React.Fragment)
}

function ConfigTab({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const [selected, setSelected] = React.useState<string>('')
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
    const base = previewSim ?? selWidget.example?.sim ?? {}
    const boolKey = Object.keys(base).find((k) => typeof base[k] === 'boolean')
    if (!boolKey) { setPreviewSim({ ...base }); return }
    setPreviewSim({ ...base, [boolKey]: !base[boolKey] })
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
    return selWidget.render(stats, { size: selSize, ...(sim ? { sim } : {}) })
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
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
    React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginBottom: 4 } }, t('config.addedCount', { added: installed.length, max: prefs.maxWidgets })),
    React.createElement(OrderList, { items: installed, onMove: (next) => setPrefs({ order: next }), onRemove: remove, onSelect: setSelected, selected }),
    selWidget && selConfig ? React.createElement('div', { style: { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--dsw-alias-border-l2)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
      // Preview title anchored top-LEFT; the card-size dropdown sits beside it
      // on the right (same dsx-select style as the 窗口对齐方式 field).
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('div', { style: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, t('config.preview', { name: widgetName(selWidget) })),
        sizesOf(selWidget).length > 1
          ? React.createElement('select', {
              className: 'dsx-select', style: { fontSize: 11, width: 'auto' },
              value: selSize, title: t('config.cardSize'),
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPreviewSize(e.target.value as WidgetSize),
            },
              sizesOf(selWidget).map((s) => React.createElement('option', { key: s, value: s }, s === '2x4' ? '2×4' : '2×2')),
            )
          : null,
      ),
      // The preview fills the space BELOW the title and centres, so extra room
      // becomes generous vertical padding (2×4 previews scale 0.85 so their
      // right-edge buttons stay visible without pushing the layout).
      React.createElement('div', { style: { flex: 1, minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px 8px' } },
        (() => {
          const u = 150
          const isWide = selSize === '2x4'
          const pv = out ? React.createElement(CardBody, { out, unit: u, width: isWide ? 2 * u + 12 : undefined }) : null
          const simTip = widgetSimToggle(selWidget)
            ? React.createElement('div', { key: 'simtip', style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 8, textAlign: 'center' } }, t('config.simTip', { label: widgetSimToggle(selWidget) }))
            : null
          return out
            ? React.createElement('div', {
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', transform: isWide ? 'scale(0.85)' : undefined, transformOrigin: 'center center', cursor: widgetSimToggle(selWidget) ? 'pointer' : undefined, userSelect: 'none' },
                title: widgetSimToggle(selWidget) ? t('config.simTitle') : undefined,
                onClick: widgetSimToggle(selWidget) ? () => toggleSim() : undefined,
              }, pv, simTip)
            : null
        })(),
      ),
      // Per-card schema fields keep their 自定义 heading below the preview.
      selWidget.configSchema && selWidget.configSchema.length > 0 ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10 } },
        React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, t('config.custom')),
        selWidget.configSchema.map((f) => React.createElement('div', { key: f.key, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
          React.createElement('span', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, fieldLabel(f)),
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
    const previewStats = { ...PREVIEW_STATS, ...exStats } as WidgetStats
    const effSim = previewSim ?? ex?.sim ?? null
    const out = w ? w.render(previewStats, { size: curSize, ...(effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}) }) : null
    const toggleSim = (): void => {
      if (!widgetSimToggle(w)) return
      const base = previewSim ?? ex?.sim ?? {}
      const boolKey = Object.keys(base).find((k) => typeof base[k] === 'boolean')
      if (!boolKey) { setPreviewSim({ ...base }); return }
      setPreviewSim({ ...base, [boolKey]: !base[boolKey] })
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
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, position: 'relative' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('button', { type: 'button', className: 'dsx-btn', onClick: () => setPreviewGroup(null) }, t('market.back')),
        React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: sizeBlocked ? 'line-through' : undefined, opacity: sizeBlocked ? 0.75 : undefined } }, w ? `${widgetName(w)}${curSize === '2x4' ? ' 2×4' : ' 2×2'}` : ''),
          sizeBlocked ? React.createElement('span', { className: 'dsx-size-warn' }, t('market.sizeBlocked')) : null,
        ),
        React.createElement('button', { type: 'button', disabled: installed || sizeBlocked || prefs.installed.length >= prefs.maxWidgets, className: installed || sizeBlocked ? 'dsx-btn' : 'dsx-btn dsx-btn-primary', onClick: add, title: sizeBlocked ? t('market.sizeBlockedTitle') : undefined }, installed ? t('market.added') : t('market.add')),
      ),
      !installed && prefs.installed.length >= prefs.maxWidgets
        ? React.createElement('div', { className: 'dsx-limit-tip' }, t('market.limit', { max: prefs.maxWidgets }))
        : null,
      React.createElement('div', { style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 4px' } },
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': t('market.prevAria'), onClick: prev }, React.createElement(ChevronLeftIcon)),
        React.createElement('div', { style: { width: 360, flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' } },
          out
            ? React.createElement('div', {
                style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transform: curSize === '2x4' ? 'scale(0.85)' : undefined, transformOrigin: 'center center', cursor: widgetSimToggle(w) ? 'pointer' : undefined, userSelect: 'none' },
                title: widgetSimToggle(w) ? t('config.simTitle') : undefined,
                onClick: widgetSimToggle(w) ? toggleSim : undefined,
              },
                React.createElement(CardBody, { out, unit: 200, width: curSize === '2x4' ? 412 : undefined }),
                w && widgetSimToggle(w) ? React.createElement('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap' } }, t('config.simTip', { label: widgetSimToggle(w) })) : null,
              )
            : null,
        ),
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': t('market.nextAria'), onClick: next }, React.createElement(ChevronRightIcon)),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } },
        instances.map((inst, i) => React.createElement('button', { key: inst.w.id + '@' + inst.s, type: 'button', className: i === previewIdx ? 'dsx-dot dsx-dot-active' : 'dsx-dot', 'aria-label': `${widgetName(inst.w)} ${inst.s === '2x4' ? '2×4' : '2×2'}`, onClick: () => setPreviewIdx(i) })),
      ),
    )
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement('input', { type: 'search', placeholder: t('market.search'), className: 'dsx-search', value: q, onChange: (e) => setQ(e.target.value) }),
    React.createElement('div', { className: 'dsx-mlist' },
      list.map((w) => {
        const gw = WIDGETS.filter((x) => groupOf(x) === groupOf(w))
        // Instance count = every widget at every supported size (a 2×2 and a
        // 2×4 of the same widget are two independent market entries).
        const instanceCount = gw.reduce((a, x) => a + sizesOf(x).length, 0)
        // A group card is "added" when ANY of its instances is in the rail.
        const anyInstalled = gw.some((x) => sizesOf(x).some((s) => prefs.installed.indexOf(instanceKey(x.id, s)) !== -1))
        // Card layout: type name (bold) + widget count (capsule badge) on the
        // first line, one description line, actions — no extra id line.
        return React.createElement('button', { key: w.id, type: 'button', className: 'dsx-mcard', 'aria-pressed': anyInstalled, onClick: () => { setPreviewGroup(groupOf(w)); setPreviewIdx(0) } },
          React.createElement('span', { className: 'dsx-mhead' },
            React.createElement('span', { className: 'dsx-mname' }, groupLabel(w)),
            React.createElement('span', { className: 'dsx-badge' }, String(instanceCount)),
          ),
          React.createElement('span', { className: 'dsx-mdesc' }, widgetDesc(w)),
          React.createElement('span', { className: 'dsx-macts' },
            React.createElement('span', { className: 'dsx-btn' }, t('market.details')),
            React.createElement('span', { className: anyInstalled ? 'dsx-btn dsx-btn-primary' : 'dsx-btn' }, anyInstalled ? t('market.added') : t('market.add')),
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
      React.createElement('div', { style: { fontSize: 18, fontWeight: 600, lineHeight: '26px', color: 'var(--dsw-alias-label-primary)' } }, t('page.title')),
      React.createElement('div', { style: { fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-tertiary)' } }, t('page.desc')),
    ),
    React.createElement('div', { className: 'dsx-tabbar' },
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'config', onClick: () => setTab('config') }, t('tab.config')),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'market', onClick: () => setTab('market') }, t('tab.market')),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'settings', onClick: () => setTab('settings') }, t('tab.settings')),
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
  const colValue = [1, 2, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
    React.createElement(Row, {
      title: t('settings.columns.title'), desc: t('settings.columns.desc'),
      children: React.createElement('select', {
        className: 'dsx-select', value: colValue,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPrefs({ columns: Number(e.target.value) }),
      },
        [1, 2, 4].map((c) => React.createElement('option', { key: c, value: c }, t('settings.columns.option', { n: c }))),
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
