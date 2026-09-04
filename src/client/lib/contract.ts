/**
 * dsh-widgets — Widget contract (shared, stable core).
 *
 * This module defines the ONE contract every widget unit must satisfy:
 * a `Widget` descriptor (default-exported by `src/widgets/<id>/index.ts`)
 * plus the pure resolver helpers the shell and the registry consumers use.
 *
 * The descriptor is deliberately TYPE-ONLY for everything a widget renders;
 * the machine-readable part (id / group / builtin / sizes / defaultInstalled
 * / per-widget locale) lives in each unit's `manifest.json`, which the
 * build-time discovery generator (`scripts/gen-registry.mjs`) reads to emit
 * `src/client/generated.registry.ts`. Neither side is a widget's full
 * definition alone — together they are the unit's contract.
 *
 * Everything in this file is part of the STABLE shared layer:
 *   - Core / Runtime (contract, resolvers)
 *   - Shared Types   (WidgetStats, WidgetRenderOut, WidgetChart, …)
 * It must not import widgets (units import it, never the other way).
 */

import { t } from '../i18n'

/** One usage item from the OpenCode Go usage endpoint. */
export interface UsageItem {
  status: string
  percent: number
  resetsAt: string
}

/** The OpenCode Go usage payload (subset the widget reads). */
export interface UsageData {
  usage: {
    rolling: UsageItem
    weekly: UsageItem
    monthly: UsageItem
  }
}

/** One pooled key's usage snapshot (tail masked, never the full secret). */
export interface UsageKeyEntry {
  ref: string
  label: string
  tail?: string
  data: UsageData | null
}

/** All pooled keys' usage plus a host-computed 共同用量 (proportional mean). */
export interface UsageMulti {
  total: UsageData | null
  keys: UsageKeyEntry[]
}

/** One hardware snapshot from the Host `/api/sysinfo` route (machine-local
 *  values only — never session data). `cpu.util` is the utilization averaged
 *  over the window between two host samples (null on the very first sample,
 *  before a delta exists). */
export interface SysInfo {
  ts: number
  cpu: { util: number | null }
  mem: { used: number; total: number; percent: number }
  gpu: {
    name: string
    temp: number
    util: number
    memUsed: number
    memTotal: number
    memPercent: number
  } | null
}

/** Session stats a widget render can read. */
export interface WidgetStats {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null
  usageData: UsageData | null
  /** Multi-key pool usage (OpenCode Go): every key + host-computed total. */
  usageMulti?: UsageMulti | null
  /** Current pooled view selection: 'total' or a `poolModes` entry ('Key 1'…). */
  poolView?: string
  /** Selectable pooled views in cycle order; first entry must be 'total'. */
  poolModes?: string[]
  /** Optional live context pressure 0..1 (from useProjection('contextPressure')). */
  contextPercent?: number | null
  contextWindow?: number | null
  contextTokens?: number | null
  /** Optional composition of the next request (system/tools/messages), from useProjection('contextBreakdown'). */
  contextBreakdown?: { systemTokens: number; toolsTokens: number; messageTokens: number } | null
  /** Last ~13 weeks of daily token usage (self-accounted). */
  heatmapGrid?: Array<Array<{ value: number; date: string }>>
  /** Raw self-accounted daily token log (dateKey -> value), so wide (2×4
   *  half-year) and bar (last-7-day) variants can derive their own grids from
   *  the same source the 2×2 calendar uses. */
  heatmapRaw?: Record<string, number>
  /** Id of the currently armed (awaiting second tap) action, if any. */
  armedAction?: string | null
  /** Current task list (todos projection): status is pending | in_progress | completed. */
  todos?: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed' }> | null
  /** Per-instance config merged by the shell (typed any: widgets with a
   *  configSchema read their keys from the same record the collector feeds). */
  [key: string]: unknown
}

/** One bar for a mini bar chart. */
export interface BarDatum {
  label: string
  value: number
  /** 0..1 used for the fill ratio; falls back to value/max when absent. */
  ratio?: number
  tone?: 'primary' | 'success' | 'warn' | 'danger' | 'muted'
}

/** A chart block a card body can render (declarative, theme tokens only). */
export interface WidgetChart {
  kind: 'bars' | 'ring' | 'rings' | 'line' | 'segments' | 'heatmap' | 'barsV'
  bars?: BarDatum[]
  /** Three-per-window donut row (e.g. OpenCode rolling/weekly/monthly). */
  rings?: Array<{ label: string; value: number; ratio?: number; tone?: 'primary' | 'success' | 'warn' | 'danger' | 'muted' }>
  /** For ring: one datum + its centered label. */
  value?: number
  valueLabel?: string
  max?: number
  /** Segmented bar (system/tools/messages). Each segment has a token share. */
  segments?: Array<{ label: string; tokens: number; tone: 'primary' | 'success' | 'muted' | 'warn' }>
  totalTokens?: number
  /** Heatmap grid rows (per day amounts). */
  heatmap?: Array<Array<{ value: number; date: string }>>
}

/** An interactive action on a card (e.g. one-click Compact). */
export interface WidgetAction {
  id: string
  label: string
  kind?: 'primary' | 'danger' | 'ghost'
  /** Two-step confirm: first click arms, second click fires. */
  confirmHint?: string
}

/** A freeform rich block (photo / quote / inspiration). */
export interface WidgetRich {
  type: 'quote' | 'image'
  text?: string
  src?: string
  /** Quote text alignment (per-card config). */
  align?: 'left' | 'center' | 'right'
  /** Vertical placement of the quote block. */
  valign?: 'top' | 'center' | 'bottom'
  /** Allow line wrapping. */
  wrap?: boolean
}

/** A corner action button (two-tap confirm: circle → armed capsule). */
export interface WidgetCorner {
  id: string
  label: string
  armedLabel: string
  armed: boolean
  /** Which corner: top-right (default) or bottom-right. */
  pos?: 'top' | 'bottom'
}

/** Supported card sizes. All cards share one grid-unit height; 2×4 is twice as
 *  wide as 2×2 (2 grid-unit rows tall, 1 wide → the render only differs in
 *  placement/length, never in height). */
export type WidgetSize = '2x2' | '2x4'

/** Extra render context. `sim` lets a preview force a widget into a specific
 *  state (e.g. peak-pricing preview toggling EXPENSIVE/CHEAP) so its states can
 *  be reviewed without waiting for the real condition. */
export interface WidgetRenderMeta {
  size?: WidgetSize
  sim?: Record<string, unknown>
}

/** Instance key = `${widgetId}@${size}` (e.g. `context-water@2x4`). Even the same
 *  widget at two sizes is two independent, co-installable instances. */
export function instanceKey(widgetId: string, size: WidgetSize): string {
  return `${widgetId}@${size}`
}

/** Parse an instance key back into its widget id and size. Unknown sizes fall
 *  back to '2x2' so legacy persisted ids (which are bare widget ids) still work. */
export function parseInstanceKey(key: string): { widgetId: string; size: WidgetSize } {
  const at = key.lastIndexOf('@')
  if (at <= 0) return { widgetId: key, size: '2x2' }
  const size = key.slice(at + 1)
  return size === '2x4' ? { widgetId: key.slice(0, at), size: '2x4' } : { widgetId: key.slice(0, at), size: '2x2' }
}

/** The card shape a widget render produces. */
export interface WidgetRenderOut {
  title: string
  title2?: string
  /** Optional text shown at the right end of the title row (e.g. ~613K / 1M). */
  headRight?: string
  /** Optional prominent figure rendered on its own row UNDER the title (e.g. the
   *  context percent, with small figures beside it). Pushes content top-aligned. */
  headAfter?: { big?: string; small?: string }
  /** Optional small caption directly under the title that does NOT affect the
   *  vertical alignment (unlike headAfter) — for subtitles like "今日 12.2K". */
  legend?: string
  /** Optional two-line meter under the title (e.g. peak-pricing windows). The
   *  active line lights up (brand blue, slightly enlarged); idle lines keep the
   *  faint legend look. */
  meter?: Array<{ label: string; active?: boolean }>
  value?: string
  /** Value color override (e.g. 'danger' renders the value in the error red,
   *  used by the peak-pricing EXPENSIVE state). */
  valueTone?: 'danger'
  sub?: string
  chart?: WidgetChart
  actions?: WidgetAction[]
  rich?: WidgetRich
  /** Top-right corner capsule/round button (e.g. one-click Compact). */
  corner?: WidgetCorner
  /** Whole-card tap cycles this card through its pooled key views (usage widgets):
   *  total → Key 1 → Key 2 → … → total. Pressing plays a springy press-down. */
  cycle?: { modes: string[]; current: string; hint: string }
  /** Whole-card red inner-glow alert (e.g. peak pricing is live): a red glow
   *  bleeds in from the card edges while the centre stays clean, with a small
   *  breathing animation. Applied as the `dsx-peak-alert` class. */
  alert?: boolean
}

/** A per-card configuration field rendered in the 组件配置 tab. Text fields
 *  are thunks so 组件配置 re-localizes on language switches. */
export interface ConfigField {
  key: string
  label: string | (() => string)
  type: 'text' | 'textarea' | 'toggle' | 'align' | 'valign' | 'mode'
  default?: string | boolean | 'left' | 'center' | 'right'
  /** For type 'mode': the selectable options as [value, label] pairs. */
  options?: Array<[string, string | (() => string)]>
}

/**
 * Widget-owned preview data (「Example」) — what the market / config preview
 * surfaces feed this widget so every state renders without the real condition.
 *
 * Roles (deliberate, see ARCH-001 §14):
 *  - dev reference: a future agent reads `example` to understand the widget's
 *    input shape without running the app;
 *  - preview mock: the shell merges `stats` over the shared preview stats and
 *    seeds `sim` as the initial simulated state.
 *
 * Convention: if `sim` holds exactly ONE boolean value, clicking the preview
 * toggles it (used by stateful widgets like peak-pricing).
 */
export interface WidgetExample {
  /** Extra stats merged over the shared preview stats. `Partial<WidgetStats>`
   *  is not enough for widgets whose preview depends on config (heatmap window
   *  alignment): a function receives the current per-instance config at preview
   *  time and returns the extra stats. */
  stats?: Partial<WidgetStats> | ((config: Record<string, unknown>) => Partial<WidgetStats>)
  /** Initial simulated state served to `render(meta.sim)`. */
  sim?: Record<string, unknown>
  /** Optional hint shown under the preview card. */
  note?: string
}

/** The card shape a widget render produces. */
export interface Widget {
  id: string
  name: string | (() => string)
  desc: string | (() => string)
  builtin: boolean
  group?: string
  badgeLabel?: string | (() => string)
  /** Sizes this widget supports. Defaults to ['2x2'] when omitted. */
  sizes?: WidgetSize[]
  render: (stats: WidgetStats, meta?: WidgetRenderMeta) => WidgetRenderOut | null
  /** When set (label text), the preview surfaces let you click the card to flip
   *  the widget's simulated state (e.g. peak-pricing 高峰/低峰). */
  simToggle?: string | (() => string)
  /** Optional per-card customization fields (shown in 组件配置 when chosen). */
  configSchema?: ConfigField[]
  /** Widget-owned preview data (see WidgetExample). */
  example?: WidgetExample
  /** Reserved: template units are NEVER registered (kept out of the discovery
   *  root structurally; this flag is belt-and-braces for tooling). */
  template?: boolean
}

/** Identity helper with a doc anchor: every widget unit default-exports
 *  `defineWidget({ ... })` so the contract stays self-describing. */
export function defineWidget<W extends Widget>(w: W): W {
  return w
}

/** Resolve a possibly-thunked display label at read time. */
export function resolveLabel(s: string | (() => string) | undefined): string {
  return typeof s === 'function' ? s() : s ?? ''
}

export function widgetName(w: Widget): string {
  return resolveLabel(w.name)
}

export function widgetDesc(w: Widget): string {
  return resolveLabel(w.desc)
}

export function widgetBadgeLabel(w: Widget): string | undefined {
  return typeof w.badgeLabel === 'function' ? w.badgeLabel() : w.badgeLabel
}

export function widgetSimToggle(w: Widget): string | undefined {
  return typeof w.simToggle === 'function' ? w.simToggle() : w.simToggle
}

/** Resolve a config field's label (thunk-aware). */
export function fieldLabel(f: ConfigField): string {
  return resolveLabel(f.label)
}

/** Resolve a mode option's [value, label] pair label. */
export function optionLabel(o: [string, string | (() => string)]): string {
  return resolveLabel(o[1])
}

/** Badge text for a widget. */
export function badgeOf(w: Widget): string {
  return widgetBadgeLabel(w) ?? (w.builtin ? t('badge.system') : t('badge.external'))
}

/** The group key for a widget (its own id when it is not grouped). */
export function groupOf(w: Widget): string {
  return w.group ?? w.id
}

/** The sizes a widget supports, defaulting to 2×2 only. */
export function sizesOf(w: Widget): WidgetSize[] {
  return Array.isArray(w.sizes) && w.sizes.length > 0 ? w.sizes.slice() : ['2x2']
}