/**
 * Harness Widgets — widget registry and formatting helpers.
 *
 * A widget is a small declarative descriptor: it knows its id, display name,
 * description, whether it is a built-in (system) component, and a pure
 * `render` that folds session stats into a small card shape. The rail and the
 * settings surfaces both consume this registry; nothing here touches React.
 *
 * All user-facing text goes through `t()` so a Settings → Language switch
 * re-renders every surface in the active locale without a reload. Name/desc/
 * labels are thunks re-evaluated at read time (see widgetName/widgetDesc).
 */

import { t } from './i18n'

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

/** All pooled keys' usage plus a host-computed共同用量 (proportional mean). */
export interface UsageMulti {
  total: UsageData | null
  keys: UsageKeyEntry[]
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

/** Compact duration: 45.2s under a minute, 2m42s from there. */
export function fmtDuration(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${Math.round(s * 10) / 10}s`
  const whole = Math.round(s)
  return `${Math.floor(whole / 60)}m${whole % 60}s`
}

/** Compact token count: 517 / 12.2K / 517K / 1.2M. */
export function fmtTokens(n: number): string {
  const scaled = (v: number): string => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10))
  if (n < 1000) return String(n)
  if (n < 1000000) return `${scaled(n / 1000)}K`
  return `${scaled(n / 1000000)}M`
}

/** Throughput: whole tokens from ten up, one decimal below. */
export function fmtTps(tps: number): string {
  return tps >= 10 ? String(Math.round(tps)) : String(Math.round(tps * 10) / 10)
}

/** `YYYY-MM-DD` for a local date. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Build a GitHub-style rolling heatmap grid directly from the raw daily log.
 * `weeks` columns (each a calendar week, Sunday-first) end at this week so the
 * latest data is always on the right edge. `weeks=26` → ~half a year (the 2×4
 * variant); `weeks=13` → the ~3-month 2×2 calendar.
 */
export function buildRollingGrid(raw: Record<string, number>, weeks: number): Array<Array<{ value: number; date: string }>> {
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const base = new Date(startOfWeek)
  base.setDate(base.getDate() - (weeks - 1) * 7)
  const grid: Array<Array<{ value: number; date: string }>> = []
  for (let r = 0; r < 7; r++) {
    const row: Array<{ value: number; date: string }> = []
    for (let c = 0; c < weeks; c++) {
      const d = new Date(base)
      d.setDate(base.getDate() + c * 7 + r)
      const k = dayKey(d)
      row.push({ value: raw[k] ?? 0, date: k })
    }
    grid.push(row)
  }
  return grid
}

/** Last `n` days (oldest→newest) as bar data, ending today. Labels are
 *  short month.day (e.g. 8.28 — no year/weekday). Values stay raw tokens;
 *  ratio is normalized to the MAX WITHIN THIS WINDOW (not the whole history),
 *  so the tallest bar of the last-7-days always reaches full height and the
 *  chart stays full — a huge historical outlier must not flatten the window. */
export function lastNDays(raw: Record<string, number>, n: number): BarDatum[] {
  const keys = Object.keys(raw).sort()
  const byDate: Record<string, number> = {}
  for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k]
  const now = new Date()
  const days: BarDatum[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const k = dayKey(d)
    const v = byDate[k] ?? 0
    days.push({ label: `${d.getMonth() + 1}.${d.getDate()}`, value: v, ratio: 0, tone: v > 0 ? 'primary' : 'muted' })
  }
  const max = Math.max(1, ...days.map((d) => d.value))
  for (const d of days) d.ratio = d.value > 0 ? d.value / max : 0
  return days
}

/** Week-aligned variant: `n` bars starting from this week's SUNDAY (today may
 *  land anywhere inside the window; future/past spill days render as zeros).
 *  Same window-normalized max as `lastNDays` — the tallest bar in the 7-bar
 *  window always reaches full height. */
export function lastNDaysWeekly(raw: Record<string, number>, n: number): BarDatum[] {
  const keys = Object.keys(raw).sort()
  const byDate: Record<string, number> = {}
  for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k]
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const days: BarDatum[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const k = dayKey(d)
    const v = byDate[k] ?? 0
    days.push({ label: `${d.getMonth() + 1}.${d.getDate()}`, value: v, ratio: 0, tone: v > 0 ? 'primary' : 'muted' })
  }
  const max = Math.max(1, ...days.map((d) => d.value))
  for (const d of days) d.ratio = d.value > 0 ? d.value / max : 0
  return days
}

/** `8.14` style short date used by bar labels and heatmap edges. */
export function fmtShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso || ''
  return `${Number(m[2])}.${Number(m[3])}`
}

/** Resolve which key's usage a usage widget should currently show. */
function usageView(stats: WidgetStats): { data: UsageData | null; mode: string } {
  const multi = stats.usageMulti
  const modes = stats.poolModes !== undefined && stats.poolModes.length > 0 ? stats.poolModes : ['total']
  const view = stats.poolView
  if (view === undefined || !modes.includes(view) || view === 'total') {
    return { data: multi?.total ?? stats.usageData ?? null, mode: 'total' }
  }
  // modes[0] is always 'total'; index 1..N map 1:1 to pooled keys.
  const idx = modes.indexOf(view) - 1
  const entry = multi?.keys[idx]
  return { data: entry?.data ?? null, mode: view }
}

/** Cycle descriptor for a pooled usage widget, when more than one view exists. */
function cycleFor(stats: WidgetStats): WidgetRenderOut['cycle'] {
  const modes = stats.poolModes
  if (modes === undefined || modes.length < 2) return undefined
  const current = stats.poolView !== undefined && modes.includes(stats.poolView) ? stats.poolView : 'total'
  const hint = t('usage.cycleHint', { chain: modes.map((m) => (m === 'total' ? t('usage.totalKey') : m)).join(' → ') + ' → ' + t('usage.totalKey') })
  return { modes, current, hint }
}

/** 「总 Key」/「Key N」label for the current view. */
function modeLabel(mode: string): string {
  return mode === 'total' ? t('usage.totalKey') : mode
}

function usageRender(key: 'rolling' | 'weekly' | 'monthly', nameKey: string): (stats: WidgetStats) => WidgetRenderOut | null {
  return (stats) => {
    const { data, mode } = usageView(stats)
    const u = data?.usage?.[key]
    const cycle = cycleFor(stats)
    if (!u) return { title: t(nameKey), value: '—', legend: modeLabel(mode), cycle }
    return {
      title: t(nameKey),
      value: `${u.percent}%`,
      legend: modeLabel(mode),
      sub: t('usage.resets', { date: String(u.resetsAt || '').slice(0, 10) }),
      cycle,
    }
  }
}

/** OpenCode Go dosage as one bar chart across the three windows. */
function usageBarsRender(stats: WidgetStats): WidgetRenderOut | null {
  const { data, mode } = usageView(stats)
  const u = data?.usage
  const cycle = cycleFor(stats)
  if (!u) return { title: t('usage.title'), value: '—', legend: modeLabel(mode), cycle }
  const tone = (p: number): BarDatum['tone'] => (p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success')
  const bars: BarDatum[] = [
    { label: t('usage.rolling'), value: u.rolling.percent, ratio: u.rolling.percent / 100, tone: tone(u.rolling.percent) },
    { label: t('usage.week'), value: u.weekly.percent, ratio: u.weekly.percent / 100, tone: tone(u.weekly.percent) },
    { label: t('usage.month'), value: u.monthly.percent, ratio: u.monthly.percent / 100, tone: tone(u.monthly.percent) },
  ]
  return { title: t('usage.title'), legend: modeLabel(mode), chart: { kind: 'bars', bars }, cycle }
}

/** OpenCode Go dosage as three small donuts (one per window) — same data as the
 *  bars chart, circle form. Each ring shows its percent in the centre and the
 *  window label under it, coloured by the same urgency scale. */
function usageRingsRender(stats: WidgetStats): WidgetRenderOut | null {
  const { data, mode } = usageView(stats)
  const u = data?.usage
  const cycle = cycleFor(stats)
  if (!u) return { title: t('usage.title'), value: '—', legend: modeLabel(mode), cycle }
  const tone = (p: number): 'success' | 'warn' | 'danger' => (p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success')
  const mk = (label: string, p: number) => ({ label, value: p, ratio: p / 100, tone: tone(p) })
  return {
    title: t('usage.title'),
    legend: modeLabel(mode),
    chart: { kind: 'rings', rings: [mk(t('usage.rolling'), u.rolling.percent), mk(t('usage.week'), u.weekly.percent), mk(t('usage.month'), u.monthly.percent)] },
    cycle,
  }
}

/** Peak-pricing windows, Beijing time (UTC+8). DeepSeek V4 Flash / V4 Flash
 *  Vision Exp / V4 Pro price peaks: Mon–Fri 01:00–04:00 and 06:00–10:00 UTC,
 *  which is 09:00–12:00 and 14:00–18:00 Beijing. Every other time — including
 *  weekends — is off-peak. Hard-coded for now; a custom-schedule setting is
 *  planned (README Roadmap). */
const PEAK_WINDOWS_BJ: Array<{ key: string; start: number; end: number }> = [
  { key: 'card.peak.window1', start: 9 * 60, end: 12 * 60 },
  { key: 'card.peak.window2', start: 14 * 60, end: 18 * 60 },
]

/** Is right now inside a peak window (Beijing local clock)? Returns the active
 *  window key too, so the meter can light the matching row. Exported so the
 *  preview surfaces can flip the simulated state relative to the real one. */
export function peakStatusNow(now = new Date()): { peak: boolean; activeKey?: string } {
  const dow = now.getDay() // 0 = Sunday
  if (dow === 0 || dow === 6) return { peak: false }
  const mins = now.getHours() * 60 + now.getMinutes()
  for (const w of PEAK_WINDOWS_BJ) {
    if (mins >= w.start && mins < w.end) return { peak: true, activeKey: w.key }
  }
  return { peak: false }
}

/** Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
 *  Value mirrors the cache/tokens card (big bottom-left label): EXPENSIVE while
 *  a peak window is active (whole card glows red), CHEAP otherwise. The two
 *  windows live under the title; the active one lights up brand-blue. A preview
 *  can pass meta.sim = { peak: boolean, window?: 0|1 } to force either state. */
function peakPricingRender(_stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const sim = meta?.sim
  const simPeak = sim && typeof sim.peak === 'boolean' ? sim.peak : null
  const live = peakStatusNow()
  const peak = simPeak !== null ? simPeak : live.peak
  const activeKey = simPeak !== null
    ? PEAK_WINDOWS_BJ[(sim && typeof sim.window === 'number' ? sim.window : 0)]?.key
    : live.activeKey
  return {
    title: t('card.peak.title'),
    meter: PEAK_WINDOWS_BJ.map((w) => ({ label: t(w.key), active: w.key === activeKey })),
    value: peak ? 'EXPENSIVE' : 'CHEAP',
    valueTone: peak ? 'danger' : undefined,
    alert: peak,
  }
}

/** Context water level card — official JObwrW template: title「上下文已用」with
 *  a right-hand figures (~X / window), the percentage under it, and a
 *  system/tools/messages segmented bar + per-segment rows. Purely informational. */
function contextWaterRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const pct = stats.contextPercent
  const brk = stats.contextBreakdown
  const win = stats.contextWindow
  if (pct == null || !brk) return null
  const sys = brk.systemTokens || 0
  const tools = brk.toolsTokens || 0
  const msg = brk.messageTokens || 0
  const total = sys + tools + msg
  const fmt = (n: number): string => {
    if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`
    if (n >= 1000) return `${Math.round(n / 100) / 10}K`
    return String(n)
  }
  const used = win ? fmt(total) : null
  const capacity = win ? fmt(win) : null
  const segments = [
    { label: t('card.contextWater.system'), tokens: sys, tone: 'muted' as const },
    { label: t('card.contextWater.tools'), tokens: tools, tone: 'success' as const },
    { label: t('card.contextWater.messages'), tokens: msg, tone: 'primary' as const },
  ]
  if (meta?.size === '2x4') {
    // 2×4 variant: the percent + concrete figures move up into the top-right
    // header row (value + headRight), and the segmented bar stretches across the
    // full extended width below. Everything else matches the 2×2 version.
    return {
      title: t('card.contextWater.title'),
      value: `${Math.round(pct * 100)}%`,
      headRight: used && capacity ? `${used} / ${capacity}` : undefined,
      chart: total > 0 ? { kind: 'segments', segments, totalTokens: total } : undefined,
    }
  }
  return {
    title: t('card.contextWater.title'),
    // Percent + concrete figures sit on their own row below the title
    // (user preference over the inline header).
    headAfter: {
      big: `${Math.round(pct * 100)}%`,
      small: used && capacity ? `${used} / ${capacity}` : undefined,
    },
    chart: total > 0 ? { kind: 'segments', segments, totalTokens: total } : undefined,
  }
}

/** One-click compaction card: shows context usage percent (bottom-left) and a
 *  top-right brand-blue round → armed「确认」capsule (two taps to compact). */
function contextRender(stats: WidgetStats): WidgetRenderOut | null {
  const p = stats.contextPercent
  const pct = p == null ? null : Math.round(p * 100)
  const armed = stats.armedAction === 'contextCompact'
  return {
    title: t('card.context.title'),
    value: pct == null ? undefined : `${pct}%`,
    sub: pct == null ? t('card.context.waiting') : undefined,
    corner: { id: 'contextCompact', label: t('card.context.compact'), armedLabel: t('card.context.confirm'), armed, pos: 'bottom' },
  }
}

/** Task card: counts of pending / in_progress / completed. Stays visible even
 *  without a todos projection — shows 暂无任务 so the card never vanishes. */
function taskRender(stats: WidgetStats): WidgetRenderOut {
  const todos = stats.todos
  const pending = todos ? todos.filter((t) => t.status === 'pending').length : 0
  const doing = todos ? todos.filter((t) => t.status === 'in_progress').length : 0
  const done = todos ? todos.filter((t) => t.status === 'completed').length : 0
  const total = todos ? todos.length : 0
  return {
    title: t('widget.task.name'),
    value: total > 0 ? t('card.task.done', { n: done }) : t('card.task.none'),
    sub: t('card.task.sub', { doing, pending }),
  }
}

/** Token usage heatmap card — a GitHub-style daily grid coloured by volume.
 *  The 2×2 size shows the rolling ~3-month calendar (window alignment
 *  user-configurable) with a legend under the title (two plain figures:
 *  today / window total). The 2×4 size shows a ~7-month (30-week) rolling grid
 *  — all recent usage points at a glance — with the two figures moved into the
 *  title row's right side (headRight) and the grid horizontally centred. */
function heatmapRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const rawLog = stats.heatmapRaw
  const wide = meta?.size === '2x4'
  // 2×4 always derives a fresh 30-week rolling grid from the raw log; the 2×2
  // keeps the pre-built (config-aligned) grid the collector already made.
  const grid = rawLog && wide ? buildRollingGrid(rawLog, 30) : (stats.heatmapGrid ?? (rawLog ? buildRollingGrid(rawLog, 13) : undefined))
  if (!grid || !grid.length) return null
  const now = new Date()
  const todayKey = dayKey(now)
  let todayVal = 0
  let total = 0
  for (const row of grid) { for (const c of row) { total += c.value; if (c.date === todayKey) todayVal = c.value } }
  // Two figures, no words: "今日用量 窗口总用量". Earliest/latest dates are
  // drawn on the chart's bottom-left/right corners by the renderer.
  const figures = todayVal > 0 || total > 0 ? `${fmtTokens(todayVal)}  ${fmtTokens(total)}` : undefined
  return {
    title: t('card.heatmap.title'),
    // 2×4: figures sit at the right end of the title row; the grid centres.
    ...(wide ? { headRight: figures } : { legend: figures }),
    chart: { kind: 'heatmap', heatmap: grid },
  }
}

/** Token usage last-7-days bar chart — vertical bars, oldest→newest left→
 *  right. X-axis labels are short month.day (only the first/last shown, on the
 *  bottom corners); the legend is two plain figures (today / 7-day total, no
 *  "今日/近7天" words). A horizontal x-axis baseline runs under the bars. The
 *  bar area height matches the 2×2 calendar grid's content height. */
function heatmapBarsRender(stats: WidgetStats): WidgetRenderOut | null {
  const rawLog = stats.heatmapRaw
  if (!rawLog) return null
  const c = stats as unknown as Record<string, unknown>
  // Window alignment: rolling = last 7 days ending today; weekly = the 7 bars
  // of the current calendar week (Sunday-aligned), per the config option.
  const mode = c.monthMode as string | undefined
  const bars = mode === 'weekly' ? lastNDaysWeekly(rawLog, 7) : lastNDays(rawLog, 7)
  if (!bars.length) return null
  const today = rawLog[dayKey(new Date())] ?? 0
  const weekTotal = bars.reduce((a, b) => a + b.value, 0)
  const legend = today > 0 || weekTotal > 0 ? `${fmtTokens(today)}  ${fmtTokens(weekTotal)}` : undefined
  return {
    title: t('card.heatmap.title'),
    legend,
    chart: { kind: 'barsV', bars },
  }
}

/** A quote card only renders content when the user typed a custom text — no
 *  default filler (which used to rotate on every render and re-render). */
function quoteRender(stats: WidgetStats): WidgetRenderOut | null {
  const c = stats as unknown as Record<string, unknown>
  const text = c.text as string | undefined
  const showTitle = c.showTitle as boolean | undefined
  const align = c.align as 'left' | 'center' | 'right' | undefined
  const valign = c.valign as 'top' | 'center' | 'bottom' | undefined
  const wrap = c.wrap as boolean | undefined
  const trimmed = text && text.trim()
  if (!trimmed) return null
  return {
    title: showTitle === false ? '' : t('card.quote.title'),
    rich: { type: 'quote', text: trimmed, align, valign, wrap },
  }
}

/** The complete widget registry. Grouping drives the component-market tabs:
 *  - 'system'      : every built-in widget (the old composer stats-line family
 *                    plus the other stock cards). There is no separate
 *                    install/uninstall — everything ships bundled, so the
 *                    market only ADDS instances to the rail.
 *  - 'opencode-go' : OpenCode Go usage quota cards.
 *  - 'coding-plan' : Token-usage heatmap + last-7-days bars. */
export const WIDGETS: Widget[] = [
  { id: 'counts', group: 'system', name: () => t('widget.counts.name'), desc: () => t('widget.counts.desc'), builtin: true, render: (s) => ({ title: t('widget.counts.name'), value: t('card.counts.value', { turns: s.turns, steps: s.steps }) }) },
  { id: 'llm', group: 'system', name: () => t('widget.llm.name'), desc: () => t('widget.llm.desc'), builtin: true, render: (s) => (s.llmMs > 0 ? { title: t('widget.llm.name'), value: fmtDuration(s.llmMs) } : null) },
  { id: 'tool', group: 'system', name: () => t('widget.tool.name'), desc: () => t('widget.tool.desc'), builtin: true, render: (s) => (s.toolMs > 0 ? { title: t('widget.tool.name'), value: fmtDuration(s.toolMs) } : null) },
  { id: 'ttft', group: 'system', name: () => t('widget.ttft.name'), desc: () => t('widget.ttft.desc'), builtin: true, render: (s) => (s.ttftSteps > 0 ? { title: t('widget.ttft.name'), value: fmtDuration(s.ttftMs / s.ttftSteps) } : null) },
  { id: 'tps', group: 'system', name: () => t('widget.tps.name'), desc: () => t('widget.tps.desc'), builtin: true, render: (s) => (s.decodeMs > 0 ? { title: t('widget.tps.name'), value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1000))} tok/s` } : null) },
  { id: 'cache', group: 'system', name: () => t('widget.cache.name'), desc: () => t('widget.cache.desc'), builtin: true, render: (s) => (s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? { title: t('widget.cache.name'), value: `${Math.round((s.usage.cacheReadTokens / s.usage.inputTokens) * 100)}%` } : null) },
  { id: 'tokens', group: 'system', name: () => t('widget.tokens.name'), desc: () => t('widget.tokens.desc'), builtin: true, render: (s) => (s.usage && s.usage.inputTokens > 0 ? { title: t('widget.tokens.name'), value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}` } : null) },
  { id: 'context', group: 'system', name: () => t('widget.context.name'), desc: () => t('widget.context.desc'), builtin: true, render: contextRender },
  { id: 'context-water', group: 'system', name: () => t('widget.context-water.name'), desc: () => t('widget.context-water.desc'), builtin: true, sizes: ['2x2', '2x4'], render: contextWaterRender },
  { id: 'task', group: 'system', name: () => t('widget.task.name'), desc: () => t('widget.task.desc'), builtin: true, render: taskRender },
  { id: 'quote', group: 'other', name: () => t('widget.quote.name'), desc: () => t('widget.quote.desc'), builtin: true, render: quoteRender, configSchema: [
    { key: 'text', label: () => t('config.quoteText'), type: 'text' },
    { key: 'showTitle', label: () => t('config.showTitle'), type: 'toggle', default: true },
    { key: 'align', label: () => t('config.align'), type: 'align', default: 'left' },
    { key: 'valign', label: () => t('config.valign'), type: 'valign', default: 'top' },
    { key: 'wrap', label: () => t('config.wrap'), type: 'toggle', default: true },
  ] },
  { id: 'heatmap', group: 'coding-plan', name: () => t('widget.heatmap.name'), desc: () => t('widget.heatmap.desc'), builtin: true, sizes: ['2x2', '2x4'], render: heatmapRender, configSchema: [
    { key: 'monthMode', label: () => t('config.monthMode'), type: 'mode', default: 'rolling', options: [['rolling', () => t('config.monthMode.rolling')], ['quarter', () => t('config.monthMode.quarter')]] },
    { key: 'timeZone', label: () => t('config.timeZone'), type: 'mode', default: 'Asia/Shanghai', options: [['Asia/Shanghai', () => t('config.timeZone.beijing')], ['local', () => t('config.timeZone.local')], ['UTC', 'UTC']] },
  ] },
  { id: 'heatmap-bars', group: 'coding-plan', name: () => t('widget.heatmap-bars.name'), desc: () => t('widget.heatmap-bars.desc'), builtin: true, render: heatmapBarsRender, configSchema: [
    { key: 'monthMode', label: () => t('config.monthMode'), type: 'mode', default: 'rolling', options: [['rolling', () => t('config.monthMode.rolling7')], ['weekly', () => t('config.monthMode.weekly')]] },
  ] },
  { id: 'usage-bars', group: 'opencode-go', name: () => t('widget.usage-bars.name'), desc: () => t('widget.usage-bars.desc'), builtin: false, badgeLabel: () => t('badge.opencode'), render: usageBarsRender },
  { id: 'usage-rings', group: 'opencode-go', name: () => t('widget.usage-rings.name'), desc: () => t('widget.usage-rings.desc'), builtin: false, badgeLabel: () => t('badge.opencode'), render: usageRingsRender },
  { id: 'usage-rolling', group: 'opencode-go', name: () => t('widget.usage-rolling.name'), desc: () => t('widget.usage-rolling.desc'), builtin: false, badgeLabel: () => t('badge.opencode'), render: usageRender('rolling', 'widget.usage-rolling.name') },
  { id: 'usage-weekly', group: 'opencode-go', name: () => t('widget.usage-weekly.name'), desc: () => t('widget.usage-weekly.desc'), builtin: false, badgeLabel: () => t('badge.opencode'), render: usageRender('weekly', 'widget.usage-weekly.name') },
  { id: 'usage-monthly', group: 'opencode-go', name: () => t('widget.usage-monthly.name'), desc: () => t('widget.usage-monthly.desc'), builtin: false, badgeLabel: () => t('badge.opencode'), render: usageRender('monthly', 'widget.usage-monthly.name') },
  { id: 'peak-pricing', group: 'pricing', name: () => t('widget.peak-pricing.name'), desc: () => t('widget.peak-pricing.desc'), builtin: false, badgeLabel: () => t('widget.peak-pricing.name'), simToggle: () => t('sim.peak'), render: peakPricingRender },
]

/** All widget ids. */
export const ALL_IDS = WIDGETS.map((w) => w.id)

/** Every valid instance key (each widget at each of its supported sizes). */
export const ALL_INSTANCES: string[] = WIDGETS.flatMap((w) => sizesOf(w).map((s) => instanceKey(w.id, s)))

/** The stats-line family: widgets that mirror the official composer stats bar
 *  (turns / LLM · tool time / TTFT / rate / cache / tokens). Fresh installs
 *  pre-load ONLY these; everything else is added from the market on demand. */
export const STATS_WIDGET_IDS = ['counts', 'llm', 'tool', 'ttft', 'tps', 'cache', 'tokens']

/** The default installed set: the stats-line family at 2×2. */
export const DEFAULT_INSTALLED: string[] = STATS_WIDGET_IDS.map((id) => instanceKey(id, '2x2'))

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
