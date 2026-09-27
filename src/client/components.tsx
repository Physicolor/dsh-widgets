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
  widgetName, widgetDesc, widgetSimToggle, fieldLabel, optionLabel, TRAJECTORY_WINDOW,
  type UsageData, type WidgetRenderOut, type WidgetChart, type WidgetAction, type WidgetRich, type ConfigField, type WidgetStats, type WidgetSize, type WidgetRenderMeta, type WidgetExample,
} from './lib/contract'
import { fmtShortDate, buildRollingGrid } from './lib/format'
import { t } from './i18n'

/** The base card side all scales derive from. */
const BASE_SIDE = 150

/** The standard gap between a card's title row and the row under it (the
 *  `headAfter` figure row), in px at side 150 — the 4px step of the app's
 *  4/8/12/16 spacing rhythm. It is DELIBERATELY bigger than the 2px a grey
 *  caption needs: a 20px figure directly under the title reads as cramped, and
 *  the user asked for the same "standard spacing" the 上下文水位 card uses. */
const HEAD_GAP_PX = 4

/** Corner-radius gears, as a PERCENT of the card's short side (Settings →
 *  圆角档位). Percent, not px: the reference (an iOS-style widget) keeps the
 *  corner-to-side RELATION fixed, so a 150px card and a magnified 190px card
 *  must not get the same corner. 12% ≈ the old fixed 16px at side 150 and the
 *  reference card's own ratio; 16% is the default because the same ratio reads
 *  sharper on a small card than on the ~480px card the reference is drawn at. */
export const CORNER_GEARS: number[] = [12, 16, 20, 24]
/** Default corner gear (%). */
export const DEFAULT_CORNER_PERCENT = 16
/** Corner radius in px for a card of short side `unit`. */
export function cardRadius(unit: number, percent: number = DEFAULT_CORNER_PERCENT): number {
  const p = Number.isFinite(percent) ? Math.max(8, Math.min(28, percent)) : DEFAULT_CORNER_PERCENT
  return Math.round(unit * (p / 100))
}
/** Content inset. It does NOT follow the corner: the card's reference ratio is
 *  the CORNER's (16% of the short side), while the content sits close to the
 *  edge — a padded-out inset pushed the title visibly away from the card's left
 *  and top edges, which is the relationship the reference card does not have.
 *  Flat 12 · scale, i.e. 12px at the plugin's 150px default, as it always was. */
function cardInnerPad(unit: number): number {
  return Math.round(12 * (unit / BASE_SIDE))
}

/**
 * Advance a preview's simulated state by ONE click.
 *
 * A widget with `example.simSteps` cycles through them (the 套餐 card walks the
 * plan tiers so every badge can be seen); everything else keeps the original
 * single-boolean flip (peak-pricing's peak/cheap, quota-manage's over-budget).
 * Shared by the config preview and the market preview so both surfaces step the
 * same way.
 */
function nextSim(w: { example?: WidgetExample } | undefined, current: Record<string, unknown> | null): Record<string, unknown> | null {
  if (w === undefined) return current
  const base = current ?? w.example?.sim ?? {}
  const steps = w.example?.simSteps
  if (Array.isArray(steps) && steps.length > 0) {
    const at = steps.findIndex((s) => JSON.stringify(s) === JSON.stringify(base))
    return steps[(at + 1) % steps.length]
  }
  const boolKey = Object.keys(base).find((k) => typeof base[k] === 'boolean')
  return boolKey !== undefined ? { ...base, [boolKey]: !base[boolKey] } : { ...base }
}

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
  // Command Code account snapshot mock (mirrors the host-aggregated
  // `/api/commandcode-usage` payload so the family previews render fully).
  commandCode: {
    whoami: { success: true, user: { id: 'usr_demo', name: 'Physicolor', email: 'demo@example.com', userName: 'Physicolor' }, org: null },
    usage: { totalCount: 4821, totalCost: 0.467622536, averageCost: 0.0079258, successRate: 100, completedCount: 4821, failedCount: 0, totalTokensIn: 4896670, totalTokensOut: 28435, totalTokens: 4925105, totalCredits: 0.467622536, totalMonthlyCredits: 0.467622536, periodBasis: 'billing-period' },
    credits: { credits: { belowThreshold: false, creditThreshold: 0, monthlyCredits: 69.163327664, purchasedCredits: 0, freeCredits: 0 }, windowLimits: { limited: true, exceeded: null, fiveHour: { used: 0.836672336, cap: 14, exceeded: false, resetAt: 1789039577701 }, weekly: { used: 0.836672336, cap: 35, exceeded: false, resetAt: 1789626377701 } } },
    subscription: { success: true, data: { id: 'sub_demo', status: 'active', planId: 'individual-goat', priceId: 'price_demo', quantity: 1, cancelAtPeriodEnd: false, currentPeriodStart: '2026-09-10T04:42:28.000Z', currentPeriodEnd: '2026-10-10T04:42:28.000Z', endedAt: null, canceledAt: null } },
  },
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
  // 对话轨迹 preview: a plausible 30-beat rhythm (inputs are instantaneous,
  // model steps 0.6–4 s, tool calls 0.2–9 s) so the lanes render in the market
  // and config previews without a live session.
  trajectory: Array.from({ length: 30 }, (_, i) => {
    const kind = (['input', 'model', 'tool', 'model', 'tool', 'model', 'input', 'model', 'tool', 'tool'] as const)[(i * 7) % 10]!
    const ms = kind === 'input' ? 0 : Math.round(kind === 'model' ? 600 + ((i * 977) % 3400) : 200 + ((i * 613) % 8800))
    return { kind, ms }
  }),
  // Machine snapshot mock for the System widget previews (values mirror a real
  // mid-load laptop so the preview looks live, not synthetic).
  sysinfo: {
    ts: 0,
    cpu: { util: 43 },
    mem: { used: 17.4 * 1024 ** 3, total: 34.2 * 1024 ** 3, percent: 51 },
    gpu: { name: 'NVIDIA GeForce RTX 5070 Ti Laptop GPU', temp: 58, util: 8, memUsed: 4815 * 1024 ** 2, memTotal: 12227 * 1024 ** 2, memPercent: 39 },
    // 30 samples @10s (~5 min) of plausible utilization drift for the
    // sparkline preview: GPU idles low with a burst, CPU wanders mid-load.
    history: (() => {
      const now = Date.now()
      const ts: number[] = []
      const cpu: Array<number | null> = []
      const gpu: Array<number | null> = []
      for (let i = 0; i < 30; i++) {
        ts.push(now - (29 - i) * 10000)
        cpu.push(Math.max(5, Math.min(85, Math.round(43 + Math.sin(i / 3) * 18 + (i % 5) * 2))))
        gpu.push(Math.max(0, Math.min(70, Math.round(i >= 20 ? 38 + Math.cos(i) * 12 : 6 + Math.sin(i / 2) * 4))))
      }
      return { ts, cpu, gpu }
    })(),
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
  /** Number of card columns in the rail (1 / 2 / 3 / 4). Default 2. */
  columns: number
  /** Hide the official composer stats line under the input box (personal
   *  preference — the rail widgets can show the same data). Default OFF so
   *  other users keep their stats bar. */
  hideStatsLine: boolean
  /** 连续曲率圆角: draw the card corners as superellipses (`corner-shape:
   *  squircle`) instead of circular arcs. Default ON — the squircle reads as
   *  softer at the same radius, and the setting lets a user compare. */
  squircle: boolean
  /** Corner-radius gear in PERCENT of the card's short side (see CORNER_GEARS). */
  cornerPercent: number
  /** 组件市场's view: 'list' (rows) or 'grid' (the widget gallery). PERSISTED with
   *  the rest of the prefs — switching views must survive a reload and ship as a
   *  user preference to everyone who installs the plugin from npm. */
  marketView: 'list' | 'grid'
}

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

// ---- Card body ----

const CHART_TONES: Record<string, string> = {
  primary: 'var(--dsw-alias-state-business-primary)',
  success: 'var(--dsw-alias-state-success-primary)',
  warn: 'var(--dsw-alias-state-warn-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
  muted: 'var(--dsw-alias-label-tertiary)',
}

/** 对话轨迹 lane colors — EXACTLY the official 轨迹 timeline's three lanes
 *  (TrajectoryTimeline.module.css `[data-timeline-span=…]`): 输入 = business
 *  primary, 模型 = the assistant span's decoding color (brand blue 60% mixed
 *  with the error red), 工具 = the warn label. Keeping the expressions (not
 *  resolved hex) means the card follows light/dark and future token changes. */
const LANE_TONES: Record<string, string> = {
  input: 'var(--dsw-alias-state-business-primary)',
  model: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, var(--dsw-alias-state-error-secondary))',
  tool: 'var(--dsw-alias-state-warn-label)',
}

/** Lane draw order, top→bottom — the SAME order as the subtitle's counts
 *  (输入 / 模型 / 工具), which is also the official 轨迹 rail's order. */
const LANE_ORDER: Array<'input' | 'model' | 'tool'> = ['input', 'model', 'tool']

/** The trajectory window is a FIXED slot count, ONE SLOT PER BEAT: a bar keeps
 *  its column as the window rolls (newest entering at the right), instead of the
 *  whole row re-scaling every time a beat arrives. Until the window fills, the
 *  beats SHARE the lane instead (n beats → 100/n % each), so a lone segment owns
 *  its lane. */
const LANE_SLOTS = TRAJECTORY_WINDOW

/** Lane corner radius — the official span's `border-radius: 1px`. The official
 *  VERTICAL numbers (8px bars on a 14px pitch) are deliberately NOT used: the
 *  three lanes are stacked contiguously and stretch to the card's remaining
 *  height (user's call, 2026-09-25 — see the lanes branch). */
const LANE_RADIUS = 1

/** The official span gap: `--trajectory-span-gap: min(widthPercent * .08%, 1px)`,
 *  applied as `left: left% + gap` and `width: max(2px, width% - 2 * gap)` — so
 *  two neighbouring beats stand `2 * gap` apart, never less than the 2px floor
 *  the official span sets with `min-width: 2px`. */
const LANE_GAP_RATIO = 0.08
const LANE_GAP_MAX_PX = 1
const LANE_MIN_PX = 2

function ChartBlock({ chart, side, width, pad }: { chart: WidgetChart; side: number; width?: number; pad?: number }): React.ReactElement | null {
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
        // nowrap: a two-digit day ("9.11") is wider than its ~15px column, and
        // wrapping it into "9.1" / "1" made the label two lines tall — which
        // pushed the bars up and overflowed the 150px card (measured over CDP).
        // The label only exists on the first/last columns, so the spill is
        // symmetric and stays inside the card's padding.
        React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, minHeight: labelH, whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-end' } }, label),
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: `${barAreaH}px`, marginTop: `${Math.round(4 * scale)}px` } }, bars)
  }
  if (chart.kind === 'lanes' && chart.lanes) {
    // 对话轨迹 — the official 轨迹 timeline (`@deepseek-ai/dsh-client-ui-trajectory`,
    // TrajectoryTimeline.module.css + deriveTrajectoryTimeline) rendered inside a
    // card. ONE ROW PER LANE, in the official order 输入 / 模型 / 工具, and all
    // THREE lanes are always drawn — an empty lane is an empty track, exactly as
    // in the official strip, where a lane with no record inside the domain still
    // occupies its own band. left→right = oldest→newest.
    //
    // HORIZONTAL geometry is the official's, value for value:
    //   .span { left:  calc(left%  + gap);
    //           width: max(2px, calc(width% - gap - gap));
    //           min-width: 2px; border-radius: 1px }
    //   --trajectory-span-gap: min(widthPercent * .08%, 1px)
    //   opacity: 1 for 模型/工具; the base span's .78 for 输入
    //   colours: see LANE_TONES (the official `[data-timeline-span=…]` rules).
    // Duration never changes a bar's height, only its WIDTH.
    //
    // VERTICAL geometry is the CARD's, by the user's request (2026-09-25): the
    // official 8px bars on a 14px pitch left two thirds of this 160px tile empty,
    // so the three lanes are stacked CONTIGUOUSLY (no gap between them) and the
    // block owns every pixel between the grey caption and the card's floor — the
    // card body is elastic for `lanes` (see `stretchChart` in CardBody).
    //
    // WIDTH is per-instance (`chart.laneSizing`), mirroring the official
    // toolbar's 时长 toggle:
    //  - 'time' (按时长): the recorded-duration projection — each beat's slice is
    //    its share of the window's total duration, idle compressed away, so a
    //    26.7s tool call is visibly longer than a 17ms one (the official
    //    "duration"/actual projection, `deriveTimedTimeline`);
    //  - 'equal' (等宽): the official DEFAULT projection — one equal slot per
    //    beat, back to back (the official "sequence" mode), the slot count
    //    frozen at TRAJECTORY_WINDOW so the row stops re-scaling as the window
    //    rolls (n beats share the lane while it fills).
    // In both modes a beat narrower than the 2px floor is drawn at 2px
    // (`min-width: 2px` in the official CSS), which is what keeps a quick tool
    // call visible instead of vanishing — and the official gap is subtracted
    // from the LEFT edge as well, so two neighbours can never touch.
    const lanes = chart.lanes
    if (lanes.length === 0) return null
    const timeMode = chart.laneSizing !== 'equal' && lanes.some((l) => (l.ms ?? 0) > 0)
    // Slice per beat on the shared axis: [left%, width%].
    const slices: Array<[number, number]> = []
    if (timeMode) {
      const total = lanes.reduce((sum, l) => sum + Math.max(0, l.ms ?? 0), 0) || 1
      let acc = 0
      for (const l of lanes) {
        const w = (Math.max(0, l.ms ?? 0) / total) * 100
        slices.push([acc, w])
        acc += w
      }
    } else {
      const slots = Math.max(1, Math.min(LANE_SLOTS, lanes.length))
      const slotPct = 100 / slots
      for (let i = 0; i < lanes.length; i++) slices.push([i * slotPct, slotPct])
    }
    // --trajectory-span-gap: min(widthPercent * .08%, 1px) — the 1px ceiling is
    // what the official strip always hits (its track is ~1300px wide); inside a
    // ~130px card the proportional branch wins, so the standoff scales with the
    // slot instead of eating a whole pixel of a 4px slot.
    const contentW = Math.max(48, (width ?? side) - 2 * (pad ?? Math.round(12 * scale)))
    const gapPct = (l: number): number => Math.min(l * LANE_GAP_RATIO, (LANE_GAP_MAX_PX / contentW) * 100)
    const rows = LANE_ORDER.map((kind, lane) => {
      const segs = lanes
        .map((l, i) => ({ l, i }))
        .filter((e) => e.l.kind === kind)
        .map((e) => {
          const [left, width] = slices[e.i]!
          const gap = gapPct(width)
          return React.createElement('div', {
            key: e.i,
            className: 'dsx-lane-seg',
            // The lane this bar belongs to — a probe asserts a row never carries
            // a foreign lane (scripts/diag-lanes-invariant.cjs).
            'data-lane': kind,
            title: e.l.label,
            style: {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `calc(${left.toFixed(4)}% + ${gap.toFixed(4)}%)`,
              width: `max(${LANE_MIN_PX}px, calc(${width.toFixed(4)}% - ${(2 * gap).toFixed(4)}%))`,
              minWidth: LANE_MIN_PX,
              borderRadius: LANE_RADIUS,
              background: LANE_TONES[kind] ?? LANE_TONES.input,
              // The official base span is .78; 模型 and 工具 override it to 1.
              opacity: kind === 'input' ? 0.78 : 1,
            },
          })
        })
      return React.createElement('div', {
        key: kind,
        className: 'dsx-lane-row',
        'data-lane': kind,
        'data-lane-index': lane,
        // Equal thirds of the elastic block, contiguous: `flex: 1` on every lane
        // (an empty lane keeps its third, like the official track).
        style: { position: 'relative', flex: 1, minWidth: 0, minHeight: 0 },
      }, ...segs)
    })
    return React.createElement('div', {
      className: 'dsx-lanes',
      // `flex: 1` = own every pixel the card body has left; the top margin is the
      // card's own spacing token (the same 6px the body gap uses), so the block
      // starts at a normal distance under the grey caption instead of butting
      // against it — and still reaches the card's padding floor.
      style: { width: '100%', flex: 1, minHeight: 0, marginTop: Math.round(6 * scale), display: 'flex', flexDirection: 'column' },
    }, ...rows)
  }
  if (chart.kind === 'quotas' && chart.quotas && chart.quotas.length > 0) {
    // The official site's limit rows (user's reference, 2026-09-20): each window
    // is a line with its NAME on the left and its PERCENT hard right, over a
    // SEGMENTED bar — 24 cells, the used share filled at the window's urgency
    // tone, the rest a pale wash of the same tone (not a grey track: the site's
    // empty cells read as "quota left", not as a different widget). Discrete
    // cells make the reading coarse on purpose: 1% of a 5-hour window is one
    // cell, which a smooth 126px bar could not show at all.
    const CELLS = 24
    const cellH = Math.max(5, Math.round(9 * scale))
    const rows = chart.quotas.map((q, i) => {
      const pct = Math.max(0, Math.min(100, q.pct))
      const filled = Math.max(0, Math.min(CELLS, Math.round((pct / 100) * CELLS)))
      const tone = CHART_TONES[q.tone ?? 'primary'] ?? CHART_TONES.primary
      const cells = Array.from({ length: CELLS }, (_, c) => React.createElement('div', {
        key: c,
        style: {
          flex: 1,
          minWidth: 0,
          height: `${cellH}px`,
          borderRadius: 2,
          background: tone,
          opacity: c < filled ? 0.92 : 0.14,
        },
      }))
      // Height budget (2×2 = 150px): padding 24 + title 16 + headAfter 4+25 = 69,
      // leaving 81 for the three rows — so each row is a 9px label line, a 2px
      // gap and a 9px bar ≈ 21px, and the rows are 5px apart (3·21 + 2·5 = 73).
      // A 10/3/7 version measured 100px and clipped the last bar against the
      // card floor. At side 200 (the market stage) every term scales with it.
      return React.createElement('div', { key: i, style: { display: 'flex', flexDirection: 'column', gap: Math.round(2 * scale) } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, minWidth: 0 } },
          React.createElement('span', { style: { fontSize: `${Math.round(9 * scale)}px`, lineHeight: 1.15, fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, q.label),
          React.createElement('span', { style: { fontSize: `${Math.round(9 * scale)}px`, lineHeight: 1.15, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none' } }, `${Math.round(pct)}%`),
        ),
        React.createElement('div', { style: { display: 'flex', gap: 2, width: '100%' } }, ...cells),
      )
    })
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: Math.round(5 * scale), width: '100%' } }, ...rows)
  }

  if (chart.kind === 'segments' && chart.segments && chart.totalTokens) {
    // Strictly mirrors the official ContextMeter (JObwrW) colors + layout:
    // system = bluish-neutral, tools = violet literal, messages = blue.
    //
    // 2×2 HEIGHT BUDGET: this is the only chart whose body is 3 stacked legend
    // rows, so its content is what sizes the card. The 150px slot spends 26 on
    // padding+border, 16 on the title and 29 on the headAfter row (2 margin +
    // the 20px figure's line box), leaving 79px for the bar + 3 rows; the
    // initial 85px therefore swelled the card to 156 and let it overlap the
    // next row of the rail. Two deterministic cuts bring it to 76:
    //   - the legend rows carry an EXPLICIT 1.2 line-height, so the row box no
    //     longer depends on the user's UI font stack (the inherited `normal`
    //     resolved to a 16px line box = 20px per row, and any font with looser
    //     metrics would have made the overflow worse);
    //   - the bar's bottom gap drops 10 -> 6 (its top gap stays 8, which is the
    //     visual separation from the figure above it).
    // Measured over CDP in Edge (Segoe UI / YaHei stack): chart 76.17 vs 79
    // available, i.e. ≈2.8px of slack instead of 6px of overflow (the live UI
    // reported 5px over the 150px slot; the fixture reproduces 6px).
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
      return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '2px 0', fontSize: `${Math.round(12 * scale)}px`, lineHeight: 1.2 } },
        React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--dsw-alias-label-secondary)' } },
          React.createElement('span', { 'aria-hidden': true, style: { width: 8, height: 8, borderRadius: 2, background: tint, flex: 'none' } }),
          s.label,
        ),
        React.createElement('span', { style: { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none', color: 'var(--dsw-alias-label-primary)' } }, fmt(s.tokens)),
      )
    })
    const bh = Math.max(4, Math.round(5 * scale))
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
      // Rectangle (non-capsule) segmented bar — segments tile edge-to-edge.
      React.createElement('div', { style: { display: 'flex', gap: 1, margin: '8px 0 6px', height: bh, borderRadius: 0, background: 'var(--dsw-alias-interactive-bg-hover)', overflow: 'hidden' } }, bar),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 2 } }, rows),
    )
  }
  if (chart.kind === 'rings' && chart.rings && chart.rings.length) {
    // Several donuts side by side (e.g. OpenCode rolling/weekly/monthly usage,
    // or the CPU/GPU system rings). The centre stays clean — no in-ring text —
    // so each ring can be drawn thick and full. Below the ring: the percent;
    // when the ring carries a label the percent and label share ONE row
    // ("43% CPU") — the 2×4 board has room for names horizontally, and
    // label-less rings (usage-rings) keep just the percent.
    const pad = Math.round(8 * scale)
    const mg = Math.round(12 * scale) // inter-ring gap = the card inner padding itself
    const avail = (width ?? side) - 2 * pad
    const r = Math.max(10, Math.min(24 * scale, (avail - (chart.rings.length - 1) * mg) / (chart.rings.length * 2)))
    const sw = Math.max(3.5, Math.round(5 * scale))
    const items = chart.rings.map((rg, i) => {
      const p = Math.max(0, Math.min(1, rg.ratio ?? rg.value / (chart.max ?? 100)))
      const c = 2 * Math.PI * (r - sw / 2)
      const tone = CHART_TONES[rg.tone ?? 'primary'] ?? CHART_TONES.primary
      const hasLabel = typeof rg.label === 'string' && rg.label.length > 0
      // Optional per-datum precision: a family that needs a finer figure asks
      // for it here (Command Code windows -> 1 decimal, e.g. 7.8%); every
      // other ring chart keeps the default whole number.
      const dec = typeof rg.decimals === 'number' && Number.isFinite(rg.decimals) ? Math.max(0, Math.min(2, Math.trunc(rg.decimals))) : 0
      const valueText = `${rg.value.toFixed(dec)}%`
      const labelRow = hasLabel
        ? React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap', maxWidth: '100%' } },
            React.createElement('span', { style: { fontSize: `${Math.round(11 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 } }, valueText),
            React.createElement('span', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis' } }, rg.label),
          )
        // nowrap: the percent sits in a ~34px cell on a 3-ring card, and "25.4%"
        // is ~32px wide — without nowrap the "%" breaks onto a second line, which
        // both doubles the caption's height (the ring row is bottom-aligned, so it
        // pushed the whole chart up) and read as a malformed figure. Measured on
        // the Command Code 窗口 card at 150px: value box 11px/1 → 2 lines.
        : React.createElement('div', { style: { fontSize: `${Math.round(11 * scale)}px`, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, whiteSpace: 'nowrap' } }, valueText)
      // Ring → caption spacing: 4px (same rhythm as bar → label in the bars
      // charts). The 2px gap used to glue the percent text to the ring; the
      // thicker visual breathing matters most on the 2×4 board's small rings.
      return React.createElement('div', { key: i, title: `${rg.name ?? rg.label} ${valueText}`, style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(4 * scale) } },
        React.createElement('svg', { width: Math.round(r * 2), height: Math.round(r * 2), viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`, 'aria-hidden': true },
          React.createElement('circle', { cx: r, cy: r, r: r - sw / 2, fill: 'none', stroke: 'var(--dsw-alias-interactive-bg-hover)', strokeWidth: sw }),
          React.createElement('circle', { cx: r, cy: r, r: r - sw / 2, fill: 'none', stroke: tone, strokeWidth: sw, strokeDasharray: `${c * p} ${c}`, transform: `rotate(-90 ${r} ${r})`, strokeLinecap: 'round' }),
        ),
        labelRow,
      )
    })
    return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: mg } }, items)
  }
  if (chart.kind === 'line' && chart.line) {
    // Windows-task-manager style utilization sparkline: a filled area under a
    // polyline. A proportional 100×100 viewBox stretches via preserveAspectRatio
    // none, so the stroke uses vector-effect non-scaling-stroke to stay
    // crisp. Null samples break the line into independent segments.
    // ELASTIC height: this container is flex:1 inside a stretch body (see
    // CardBody's `stretchChart`), so the sparkline eats whatever vertical
    // space the card has left after the fixed rows — at any side size /
    // magnification the card NEVER bursts its box. With a fixed height the
    // sys-gpu-line card totalled ≈178px (value + sub + 68px chart) and burst
    // the 150px box on hover. The bottom time-labels stay fixed (flex:none).
    const labelH = Math.round(10 * scale)
    const max = Math.max(1, chart.line.max ?? 100)
    const vals = chart.line.values
    const W = Math.max(1, vals.length - 1)
    const X = (i: number): number => (W === 0 ? 0 : (i / W) * 100)
    // The stroke must never ride the plot's edge. A 0% sample (an idle GPU is the
    // every-day case) put the polyline EXACTLY on the box's bottom, and the
    // box's overflow:hidden cut its lower half — measured 2026-09-20 on the live
    // 利用率 card: polyline bottom 754.0 == svg bottom 754.0 with a 2px stroke,
    // i.e. the "截断" the user reported. The line therefore lives inside
    // [PAD, 100 − PAD] while the AREA still closes on the true floor (y = 100),
    // so the fill reaches the box and the stroke stays whole.
    const PAD = 3
    const Y = (v: number): number => PAD + (100 - 2 * PAD) * (1 - (Math.max(0, Math.min(max, v)) / max))
    const segs: Array<Array<[number, number]>> = []
    let cur: Array<[number, number]> = []
    vals.forEach((v, i) => {
      if (v === null || v === undefined || !Number.isFinite(v)) {
        if (cur.length > 1) { segs.push(cur); cur = [] }
        return
      }
      cur.push([X(i), Y(v)])
    })
    if (cur.length > 1) segs.push(cur)
    const tone = 'var(--dsw-alias-state-business-primary)'
    const fill = 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)'
    const areaPaths = segs.map((seg, si) => {
      const d = seg.map(([x, y], pi) => `${pi === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
        + ` L${seg[seg.length - 1][0].toFixed(2)} 100 L${seg[0][0].toFixed(2)} 100 Z`
      return React.createElement('path', { key: `a${si}`, d, fill, stroke: 'none' })
    })
    const polylines = segs.map((seg, si) =>
      React.createElement('polyline', { key: `p${si}`, points: seg.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '), fill: 'none', stroke: tone, strokeWidth: Math.max(1, Math.round(1.6 * scale)), strokeLinejoin: 'round', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }),
    )
    const labels = chart.line.labels ?? ['', '']
    // gap: 3 keeps the same sparkline→time-label spacing as the barsV bars
    // (bar→date label gap 3). The svg canvas fills the flexible middle row.
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, minHeight: 0, flex: 1 } },
      React.createElement('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden' } },
        React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': true },
          ...areaPaths, ...polylines,
        ),
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', minHeight: labelH, flex: 'none', fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1 } },
        React.createElement('span', { style: { whiteSpace: 'nowrap' } }, labels[0]),
        React.createElement('span', { style: { whiteSpace: 'nowrap' } }, labels[1]),
      ),
    )
  }
  if (chart.kind === 'figures' && ((chart.figures && chart.figures.length) || (chart.figureRows && chart.figureRows.length))) {
    // A row of label-over-value figure pairs (e.g. the quota card's 今日用量
    // 24.7M / 今日推荐 200M). No axes, no bars — the two numbers ARE the block,
    // in the space a chart would have taken.
    //
    // `figureRows` stacks SEVERAL such rows (a 2×4 is wide enough to carry two
    // rows of five where one row of ten would leave every label ellipsized).
    // Each row keeps the single-row geometry, so a stacked card reads as the
    // same block repeated rather than a new chart.
    //
    // SPACING — `| 1 | 1 | 1 |`, i.e. EVERY space equal (the user's own notation,
    // 2026-09-25). Earlier shapes each failed one half of that:
    //   * `space-between` — equal gaps between blocks but the OUTER insets were
    //     the card's padding, so the edges read tighter than the middle;
    //   * `flex: 1` + fixed gap — equal COLUMNS, but a wide value ("107m31s")
    //     filled its column while a narrow one ("9") floated, so the perceived
    //     gaps differed row by row.
    // SPACING — `| 1 | 1 | 1 |`: EVERY visible space equal (the user's notation,
    // 2026-09-25). Three shapes were tried, each failing one step further out:
    //   * `space-between` — equal gaps between blocks, but the outer insets were
    //     the card's padding, which reads tighter than the middle;
    //   * `flex: 1` + fixed gap — equal COLUMNS, so a wide value filled its
    //     column while a narrow one floated and the perceived gaps differed;
    //   * `space-evenly` alone — equalised the spaces past the padding, but the
    //     padding was still added to the outer two: on the live rail the card
    //     edge→「轮次」measured 40px against 27px between「轮次」and「LLM」.
    // So the row spans the card's FULL width — negative margins swallow the
    // padding — and `space-evenly` divides the leftover into n+1 equal spaces,
    // the outer two included: the edge gap IS the inter-block gap.
    const padAmt = pad ?? Math.round(12 * scale)
    const rowWidth = `calc(100% + ${2 * padAmt}px)`
    const drawRow = (figures: NonNullable<typeof chart.figures>, key: number): React.ReactElement => {
      const items = figures.map((f, i) => {
        const valColor = f.tone ? (CHART_TONES[f.tone] ?? CHART_TONES.primary) : 'var(--dsw-alias-label-primary)'
        return React.createElement('div', { key: i, style: { flex: '0 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(2 * scale) } },
          React.createElement('div', { style: { fontSize: `${Math.round(9 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } }, f.label),
          // The value ellipsizes rather than spilling into its neighbours when a
          // row is genuinely too tight (a 2×2 with two long figures).
          React.createElement('div', { style: { fontSize: `${Math.round(13 * scale)}px`, fontWeight: 600, color: valColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' } }, f.value),
        )
      })
      return React.createElement('div', { key, style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-evenly', width: '100%' } }, items)
    }
    // ONE wrapper always, so the widened box is applied exactly once (a per-row
    // negative margin inside a widened wrapper would double the padding back).
    const rows = chart.figureRows && chart.figureRows.length ? chart.figureRows : [chart.figures ?? []]
    return React.createElement('div', { style: {
      display: 'flex',
      flexDirection: 'column',
      gap: rows.length > 1 ? Math.round(6 * scale) : 0,
      width: rowWidth,
      marginLeft: -padAmt,
      marginRight: -padAmt,
    } },
      rows.map((row, i) => drawRow(row, i)),
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
    // Bottom corners carry the window's earliest (left) and latest (right)
    // dates in short month.day form (e.g. 3.2 / 8.28).
    // A wide grid (≥20 weeks, i.e. the 2×4 half-year view) auto-fits the card
    // width and is horizontally centred; the 2×2 grid keeps fixed cells.
    const weeks = chart.heatmap[0]?.length ?? 13
    const isWide = weeks >= 20
    // The card's OWN content inset (passed in), never a second constant: a
    // bigger corner gear widens the card's padding, and a heatmap still sized
    // against the old 12px would push its widest grid past the card edge.
    const inset = pad ?? Math.round(12 * scale)
    const availW = (width ?? side) - 2 * inset
    const gap = 2
    const wideCell = isWide ? Math.max(3, Math.floor((availW - (weeks - 1) * gap) / weeks)) : Math.round((6 + 2) * scale)
    const cell = wideCell
    const max = Math.max(1, ...chart.heatmap.flat().map((c) => c.value))
    // Two ramps, one `color-mix` mechanism (see WidgetChart.heatmapPalette):
    //   brand  — continuous business-blue alpha from the value's share of max;
    //   github — GitHub's five DISCRETE contribution steps, in GitHub's order
    //            (empty -> strongest), derived from the SUCCESS token so the
    //            green follows the light/dark theme instead of being a literal.
    const palette = chart.heatmapPalette ?? 'brand'
    const EMPTY_CELL = 'var(--dsw-alias-interactive-bg-hover)'
    const GITHUB_STEPS = [0, 30, 52, 74, 100]
    const unit = chart.heatmapUnit ?? 'tok'
    const cellBg = (c: { value: number; level?: number }): string => {
      if (palette === 'github') {
        const level = Math.max(0, Math.min(4, Math.round(c.level ?? (c.value > 0 ? 1 : 0))))
        return level === 0
          ? EMPTY_CELL
          : `color-mix(in srgb, var(--dsw-alias-state-success-primary) ${GITHUB_STEPS[level]}%, transparent)`
      }
      const t = max > 0 ? c.value / max : 0
      if (t <= 0) return EMPTY_CELL
      return `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${Math.round((0.25 + 0.7 * t) * 100)}%, transparent)`
    }
    const rows = chart.heatmap.map((week, wi) => {
      const cells = week.map((c) => React.createElement('div', {
        key: c.date,
        title: `${c.date}: ${c.value} ${unit}`,
        style: { width: cell, height: cell, borderRadius: 2, background: cellBg(c), opacity: c.value > 0 ? 1 : 0.5 },
      }))
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
      return React.createElement('span', { style: { display: 'flex', alignItems: align, fontSize: `${Math.round(8.5 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }, fmtShortDate(text))
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
    background: 'transparent', color: 'var(--dsw-alias-state-business-primary)',
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

/**
 * Loading skeleton: the card frame plus rounded placeholder blocks in the SAME
 * vertical rhythm — and the SAME SILHOUETTE — as the real body, so the card's
 * size, shape AND identity are already correct while the data source is still
 * in flight and nothing re-flows when the real content lands.
 *
 * The TITLE stays real text: it comes from the widget descriptor (its name),
 * not from the data source, so it is already known — and a rail of tiles that
 * still say which widget they are reads as loading, while a rail of nameless
 * grey pills reads as broken. Only the DATA is placeholder.
 *
 * The BODY follows `out.skeletonShape` (declared by the shell per widget, see
 * SKELETON_SHAPE): a ring card draws N square rounded blocks, a bar chart ONE
 * wide rounded block, a heatmap ONE wide block, a figure row N short blocks and
 * a quota card N stacked bars. A generic stack of thin pills was wrong for all
 * of them — the placeholder has to be recognisable as the card it stands in
 * for, not merely as "some card".
 */
function SkeletonBody({ out, unit, width, squircle, cornerPercent = DEFAULT_CORNER_PERCENT }: { out: WidgetRenderOut; unit: number; width?: number; squircle?: boolean; cornerPercent?: number }): React.ReactElement {
  const scale = unit / BASE_SIDE
  const boxW = width ?? unit
  const rows = Math.max(1, Math.min(4, Math.round(out.skeletonRows ?? 2)))
  const count = Math.max(1, Math.min(6, Math.round(out.skeletonCount ?? 3)))
  // The placeholder card carries the SAME outline and inset as the real one it
  // stands in for: a radius/padding jump at the loading → loaded swap would
  // read as the card resizing itself.
  const radius = cardRadius(unit, cornerPercent)
  const pad = cardInnerPad(unit)
  /** One shimmering rounded block; every silhouette is built from these. */
  const block = (key: string, style: React.CSSProperties): React.ReactElement =>
    React.createElement('div', { key, className: 'dsx-sk', style })
  /** A block that spans the card's content width. */
  const fill = (key: string, h: number, r: number): React.ReactElement =>
    block(key, { width: '100%', flex: 1, minHeight: `${h}px`, borderRadius: `${r}px` })
  /** A row of `n` equal blocks (rings are square, figures are short bars). */
  const row = (key: string, n: number, square: boolean, hm: number, r: string, gap: number): React.ReactElement =>
    React.createElement('div', { key, style: { display: 'flex', alignItems: square ? 'center' : 'flex-end', justifyContent: 'space-between', gap, width: '100%' } },
      ...Array.from({ length: n }, (_, i) => block(`${key}${i}`, square
        ? { flex: 1, minWidth: 0, aspectRatio: '1 / 1', borderRadius: r }
        : { flex: 1, minWidth: 0, height: `${hm}px`, borderRadius: r })))
  const shape = out.skeletonShape ?? 'text'
  let body: React.ReactNode[]
  if (shape === 'rings') {
    // N donuts → N square rounded blocks. Square, because a ring is as tall as
    // it is wide; the row keeps the real chart's spacing so the block count is
    // readable at a glance.
    body = [row('rg', count, true, 0, '30%', Math.round(10 * scale))]
  } else if (shape === 'bars') {
    // A bar chart: ONE wide rounded block standing for the plot area (the user's
    // rule — 一个柱状图就是一个大圆角矩形).
    body = [fill('bar', Math.round(40 * scale), Math.max(6, Math.round(8 * scale)))]
  } else if (shape === 'line') {
    // A sparkline: one wide block, a little taller than the bar block (a line
    // card is elastic and owns the whole remaining height).
    body = [fill('ln', Math.round(48 * scale), Math.max(6, Math.round(8 * scale)))]
  } else if (shape === 'heatmap') {
    // The calendar grid: one wide, nearly square block.
    body = [fill('hm', Math.round(44 * scale), Math.max(6, Math.round(8 * scale)))]
  } else if (shape === 'figures') {
    body = [row('fg', count, false, Math.round(18 * scale), `${Math.max(4, Math.round(6 * scale))}px`, Math.round(8 * scale))]
  } else if (shape === 'quotas') {
    // The segmented quota rows: N stacked bars, same step as the real rows.
    body = [React.createElement('div', { key: 'qt', style: { display: 'flex', flexDirection: 'column', gap: Math.round(8 * scale), width: '100%' } },
      ...Array.from({ length: count }, (_, i) => block(`q${i}`, { width: '100%', height: `${Math.max(6, Math.round(9 * scale))}px`, borderRadius: `${Math.max(4, Math.round(5 * scale))}px` })))]
  } else {
    // Text-only card: the figure pill + its body rows, exactly as before.
    body = [
      block('v', { width: '44%', height: `${Math.round(20 * scale)}px`, borderRadius: `${Math.max(3, Math.round(10 * scale))}px` }),
      ...Array.from({ length: rows }, (_, i) => block(`r${i}`, { width: `${Math.round(92 - i * 26)}%`, height: `${Math.round(10 * scale)}px`, borderRadius: `${Math.max(3, Math.round(5 * scale))}px` })),
    ]
  }
  return React.createElement('div', {
    className: 'dsx-stats-card dsx-sk-card' + (squircle ? ' dsx-squircle' : ''),
    style: { position: 'relative', display: 'flex', flexDirection: 'column', width: `${boxW}px`, minHeight: `${unit}px`, borderRadius: `${radius}px`, padding: `${pad}px` },
  },
    React.createElement('div', { className: 'dsx-stats-card-title', style: { fontSize: `${Math.round(13 * scale)}px`, minWidth: 0 } }, out.title),
    // The body owns the card's remaining height (so a chart block reads as a
    // chart area), and its content sits on the card's floor: the same posture
    // the real cards use.
    React.createElement('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: Math.round(8 * scale), marginTop: Math.round(6 * scale) } }, ...body),
  )
}

export function CardBody({ out, unit, width, squircle, cornerPercent, pinBox, onAction, onCycle }: { out: WidgetRenderOut; unit: number; width?: number; squircle?: boolean; cornerPercent?: number; pinBox?: boolean; onAction?: (id: string) => void; onCycle?: (out: WidgetRenderOut) => void }): React.ReactElement {
  const scale = unit / BASE_SIDE
  const boxW = width ?? unit
  const titlePx = Math.round(13 * scale)
  const valuePx = Math.round(20 * scale)
  const radius = cardRadius(unit, cornerPercent)
  const innerPad = cardInnerPad(unit)
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
  // Loading skeleton (see SkeletonBody): declared AFTER the hooks so the hook
  // order stays unconditional across the loading → loaded transition.
  if (out.skeleton) return React.createElement(SkeletonBody, { out, unit, width: boxW, squircle, cornerPercent })
  // Head row = two INDEPENDENT slots: the title box (which ellipsizes rather
  // than pushing the figures out) and — when `headRight` is DEFINED, even as ''
  // — a right slot holding the optional big value plus the small caption, hard
  // against the RIGHT edge of the row.
  //
  // The slots are TOP-aligned and INDEPENDENT, never baseline-aligned: baseline
  // alignment puts the whole row on one shared baseline, so a 20px value
  // stretches the line box and PUSHES THE 13px TITLE DOWN by ~5px. Top-aligning
  // restores the title, but the line box would still grow to the value's 25px and
  // leave a gap under the title. The right slot therefore cancels its own extra
  // height with a negative bottom margin: the row stays as tall as the TITLE
  // alone, so a caption (e.g. the billing-period line) sits directly under it,
  // while the value still occupies its width and can never collide with it.
  const hasHeadRight = out.headRight !== undefined
  const headValueTone = out.valueTone === 'danger' || out.valuePulse === true
  const titleLine = Math.round(titlePx * 1.2)
  const captionLine = Math.round(10 * scale * 1.2)
  const valueLine = Math.round(valuePx * 1.25)
  const rightLine = hasHeadRight ? Math.max(out.value != null ? valueLine : 0, out.headRight ? captionLine : 0) : 0
  const rightSpill = Math.max(0, rightLine - titleLine)
  const headFlex = React.createElement('div', { key: 't', className: 'dsx-stats-card-title', style: { fontSize: `${titlePx}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, minHeight: `${titleLine}px` } },
    React.createElement('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, out.title),
    hasHeadRight ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6, flex: 'none', marginBottom: rightSpill > 0 ? `${-rightSpill}px` : undefined } },
      out.value != null ? React.createElement('span', {
        className: headValueTone ? 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : '') : undefined,
        style: { fontSize: `${valuePx}px`, fontWeight: 600, color: headValueTone ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
      }, out.value) : null,
      out.headRight ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, out.headRight) : null,
    ) : null,
  )
  const headEls: Array<React.ReactElement> = [
    headFlex,
  ]
  if (out.headAfter) {
    // Prominent figure + the grey subtitle on their own row under the title.
    // nowrap on the ROW (not just the small text): the big figure is a single
    // token ("64%", "12.2K") that must never break, and the whole row is
    // bottom-anchored on several cards, so a wrap would shift the chart up.
    //
    // The subtitle has THREE shapes, all riding the SAME row to the RIGHT of the
    // figure: one grey line on the figure's baseline (`small`, e.g. 上下文水位's
    // "~638K / 1M"), that same line dropped to the row's FLOOR
    // (`small`+`smallAlign: 'bottom'`, e.g. 额度管理's `账期 10-10`), or a stacked
    // grey block (`smallLines`) that is CENTRED on the figure's line box.
    const haLines = Array.isArray(out.headAfter.smallLines) && out.headAfter.smallLines.length > 0 ? out.headAfter.smallLines : []
    headEls.push(React.createElement('div', { key: 'ha', className: 'dsx-stats-card-headafter', style: {
      display: 'flex',
      // ONE grey line rides the figure's baseline by default, or sits on the row's
      // floor when it asks to (`smallAlign: 'bottom'` — the line's bottom edge
      // then lines up with the figure's). A STACKED block is CENTRED on the
      // figure's line box instead: baseline-aligning the block put its second
      // line below the figure's floor and left only ~12px to the figures row
      // underneath (measured 2026-09-20 on the live 额度管理 card).
      alignItems: haLines.length > 0 ? 'center' : out.headAfter.smallAlign === 'bottom' ? 'flex-end' : 'baseline',
      gap: HEAD_GAP_PX,
      marginTop: `${Math.round(HEAD_GAP_PX * scale)}px`,
      minWidth: 0,
      whiteSpace: 'nowrap',
    } },
      out.headAfter.big != null ? React.createElement('span', {
        // The figure keeps the escalation's identity (`dsx-stats-card-value` +
        // the pulse class) wherever a card puts it: the red/breathe rules key off
        // that class, and valueTone's red is applied inline exactly as the title
        // row's copy does.
        className: headValueTone ? 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : '') : undefined,
        style: { fontSize: `${valuePx}px`, fontWeight: 600, color: headValueTone ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.25, whiteSpace: 'nowrap' },
      }, out.headAfter.big) : null,
      haLines.length > 0
        ? React.createElement('span', { className: 'dsx-stats-card-headafter-lines', style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
          haLines.map((line, i) => React.createElement('span', { key: i, style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, line)))
        : out.headAfter.small != null ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, out.headAfter.small) : null,
    ))
  }
  if (out.legend) {
    // Small caption right under the title; unlike headAfter it does not change
    // the vertical alignment, so a bottom-anchored card (e.g. heatmap) keeps it.
    // One line, ellipsized: a long localized caption must never wrap and push
    // the card's content down.
    headEls.push(React.createElement('div', { key: 'lg', className: 'dsx-stats-card-legend', style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', marginTop: `${Math.round(2 * scale)}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, out.legend))
  }
  if (out.meter && out.meter.length) {
    // Two-line live meter under the title (e.g. peak-pricing windows): the
    // active row lights up brand-blue and scales up slightly, the idle row
    // keeps the faint legend look. Both use the same font as the token-bar
    // legend so the format stays consistent across cards.
    headEls.push(React.createElement('div', { key: 'mt', className: 'dsx-stats-card-meter', style: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: `${Math.round(4 * scale)}px`, minWidth: 0 } },
      out.meter.map((m, i) => React.createElement('div', { key: i, style: {
        fontSize: `${m.active ? Math.round(12 * scale) : Math.round(10 * scale)}px`,
        fontWeight: m.active ? 600 : 500,
        color: m.active ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-label-tertiary)',
        lineHeight: 1.2,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.25s ease, font-size 0.25s ease, font-weight 0.25s ease',
      } }, m.label)),
    ))
  }
  const head = headEls
  const body: React.ReactElement[] = []
  // The line sparkline (sys-gpu-line) is ELASTIC: the card body owns the full
  // remaining height and the chart flexes into it, so the card never bursts
  // its box at any side size or magnification. Other charts keep their fixed
  // footprint and bottom-anchored posture. Declared BEFORE the chart push
  // below (TDZ: the push evaluates it immediately).
  //
  // 对话轨迹 (lanes) is elastic too, by the user's request (2026-09-25): the
  // three lanes are stacked CONTIGUOUSLY (no gap between them) and the whole
  // block takes every pixel between the grey caption and the card's floor —
  // the official 8px/14px vertical strip left a two-thirds-empty card at this
  // tile size. Only the block's WIDTH geometry is the official one.
  const stretchChart = out.chart?.kind === 'line' || out.chart?.kind === 'lanes'
  // value is shown inline in the header when headRight is present (official meter
  // header: `上下文已用 64% ~638K / 1M`); otherwise it goes to the body.
  if (out.value != null && out.headRight === undefined) body.push(React.createElement('div', { key: 'v', className: 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : ''), style: { fontSize: `${valuePx}px`, color: out.valueTone === 'danger' ? 'var(--dsw-alias-state-error-primary)' : undefined } }, out.value))
  if (out.sub) body.push(React.createElement('div', { key: 's', className: 'dsx-stats-card-sub', style: { fontSize: `${Math.round(10 * scale)}px` } }, out.sub))
  if (out.chart) {
    const c = ChartBlock({ chart: out.chart, side: unit, width: boxW, pad: innerPad })
    if (c) body.push(React.createElement('div', {
      key: 'c',
      // The stretch wrapper owns the card's remaining height so an elastic
      // chart (line sparkline) can fill it; fixed-footprint charts ignore it.
      style: stretchChart ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined,
    }, c))
  }
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
  // (stretchChart is declared above with the body assembly — it is read here
  // AND by the chart push, which precedes this line.)
  //
  // A headAfter row normally means "the body starts right under the head"
  // (elastic charts and rich blocks need that). `bodyAnchor: 'bottom'` opts a
  // card back into the EVERY-OTHER-CARD posture: the short figure row stays on
  // the card's floor with the head above it (measured on the live 额度管理 card:
  // top-aligned, its two figures sat 12px under the 账期 line, leaving 55px of
  // empty tile below them).
  const headAnchorsTop = out.headAfter !== undefined && out.bodyAnchor !== 'bottom'
  const topAligned = vj || headAnchorsTop || stretchChart
  const footStyle: React.CSSProperties = topAligned
    ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: vj ?? 'flex-start' }
    : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  return React.createElement('div', {
    className: 'dsx-stats-card' + (squircle ? ' dsx-squircle' : '') + (cyclable ? (pressed ? ' dsx-cyclable dsx-cycle-pressed' : ' dsx-cyclable') : ''),
    // minHeight is the resting contract for every card; the ELASTIC line card
    // (sys-gpu-line) additionally pins a FIXED height so its flex body (chart
    // eats the leftover space) compresses inside the box instead of letting
    // content drive the card taller than the slot (the old card swelled to
    // ≈178px and burst the 150px box on hover magnification).
    //
    // `pinBox` is what a PREVIEW passes: the card is pinned to the unit square
    // (and its own overflow:hidden clips the rest), so the market/组件配置 stage
    // shows the tile the rail actually seats instead of whatever height the
    // content asks for — measured 2026-09-20: the credits card rendered 200×250
    // in the market and read as a non-square rounded rectangle.
    style: { position: 'relative', width: `${boxW}px`, minHeight: `${unit}px`, height: pinBox || stretchChart ? `${unit}px` : undefined, borderRadius: `${radius}px`, padding: `${innerPad}px` },
    title: out.cardHint ?? out.cycle?.hint,
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
  const rowEls = React.useRef(new Map<string, HTMLDivElement>())
  const prevRects = React.useRef(new Map<string, { x: number; y: number }>())
  const prevTwoCol = React.useRef<boolean | null>(null)
  React.useLayoutEffect(() => {
    const next = new Map<string, { x: number; y: number }>()
    const modeChanged = prevTwoCol.current !== null && prevTwoCol.current !== twoCol
    prevTwoCol.current = twoCol
    rowEls.current.forEach((el, key) => {
      const r = el.getBoundingClientRect()
      next.set(key, { x: r.left, y: r.top })
      const prev = prevRects.current.get(key)
      if (prev === undefined || modeChanged) return
      const dx = prev.x - r.left
      const dy = prev.y - r.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      // NEVER animate while a drag is in flight: the drag's own hit-testing (and
      // the browser's) reads the row's live rect, and a row gliding under the
      // pointer makes the insertion side flap (and cancelled the drop outright
      // in the probe, measured 2026-09-25).
      if (dragging.current !== null || drop !== null) return
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`
      void el.offsetHeight // flush the start position before animating away
      el.style.transition = 'transform var(--ds-transition-duration) var(--ds-ease-in-out)'
      el.style.transform = ''
    })
    prevRects.current = next
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
