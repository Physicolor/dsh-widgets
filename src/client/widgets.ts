/**
 * Harness Widgets — widget registry and formatting helpers.
 *
 * A widget is a small declarative descriptor: it knows its id, display name,
 * description, whether it is a built-in (system) component, and a pure
 * `render` that folds session stats into a small card shape. The rail and the
 * settings surfaces both consume this registry; nothing here touches React.
 */

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
  kind: 'bars' | 'ring' | 'line' | 'segments' | 'heatmap' | 'barsV'
  bars?: BarDatum[]
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
  value?: string
  sub?: string
  chart?: WidgetChart
  actions?: WidgetAction[]
  rich?: WidgetRich
  /** Top-right corner capsule/round button (e.g. one-click Compact). */
  corner?: WidgetCorner
}

/** A per-card configuration field rendered in the 组件配置 tab. */
export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'toggle' | 'align' | 'valign' | 'mode'
  default?: string | boolean | 'left' | 'center' | 'right'
  /** For type 'mode': the selectable options as [value, label] pairs. */
  options?: Array<[string, string]>
}

/** The card shape a widget render produces. */
export interface Widget {
  id: string
  name: string
  desc: string
  builtin: boolean
  group?: string
  badgeLabel?: string
  /** Sizes this widget supports. Defaults to ['2x2'] when omitted. */
  sizes?: WidgetSize[]
  render: (stats: WidgetStats, meta?: { size?: WidgetSize }) => WidgetRenderOut | null
  /** Optional per-card customization fields (shown in 组件配置 when chosen). */
  configSchema?: ConfigField[]
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
 *  ratio is normalized to the max day. */
export function lastNDays(raw: Record<string, number>, n: number): BarDatum[] {
  const keys = Object.keys(raw).sort()
  const byDate: Record<string, number> = {}
  for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k]
  const now = new Date()
  const days: BarDatum[] = []
  const max = Math.max(1, ...Object.values(byDate).filter((v) => v > 0))
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const k = dayKey(d)
    const v = byDate[k] ?? 0
    days.push({ label: `${d.getMonth() + 1}.${d.getDate()}`, value: v, ratio: v > 0 ? v / max : 0, tone: v > 0 ? 'primary' : 'muted' })
  }
  return days
}

/** `8.14` style short date used by bar labels and heatmap edges. */
export function fmtShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso || ''
  return `${Number(m[2])}.${Number(m[3])}`
}

function usageRender(key: 'rolling' | 'weekly' | 'monthly', label: string): (stats: WidgetStats) => WidgetRenderOut | null {
  return (stats) => {
    const u = stats.usageData?.usage?.[key]
    if (!u) return { title: label, value: '—' }
    return { title: label, value: `${u.percent}%`, sub: `重置 ${String(u.resetsAt || '').slice(0, 10)}` }
  }
}

/** OpenCode Go dosage as one bar chart across the three windows. */
function usageBarsRender(stats: WidgetStats): WidgetRenderOut | null {
  const u = stats.usageData?.usage
  if (!u) return { title: 'OpenCode 用量', value: '—' }
  const tone = (p: number): BarDatum['tone'] => (p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success')
  const bars: BarDatum[] = [
    { label: '滚动', value: u.rolling.percent, ratio: u.rolling.percent / 100, tone: tone(u.rolling.percent) },
    { label: '周', value: u.weekly.percent, ratio: u.weekly.percent / 100, tone: tone(u.weekly.percent) },
    { label: '月', value: u.monthly.percent, ratio: u.monthly.percent / 100, tone: tone(u.monthly.percent) },
  ]
  return { title: 'OpenCode 用量', chart: { kind: 'bars', bars } }
}

/** Context water level card — official JObwrW template: title「上下文已用」with
 *  a right-hand figures (~X / window), the percentage under it, and a
 *  system/tools/messages segmented bar + per-segment rows. Purely informational. */
function contextWaterRender(stats: WidgetStats, meta?: { size?: WidgetSize }): WidgetRenderOut | null {
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
    { label: '系统提示词', tokens: sys, tone: 'muted' as const },
    { label: '工具', tokens: tools, tone: 'success' as const },
    { label: '对话消息', tokens: msg, tone: 'primary' as const },
  ]
  if (meta?.size === '2x4') {
    // 2×4 variant: the percent + concrete figures move up into the top-right
    // header row (value + headRight), and the segmented bar stretches across the
    // full extended width below. Everything else matches the 2×2 version.
    return {
      title: '上下文已用',
      value: `${Math.round(pct * 100)}%`,
      headRight: used && capacity ? `${used} / ${capacity}` : undefined,
      chart: total > 0 ? { kind: 'segments', segments, totalTokens: total } : undefined,
    }
  }
  return {
    title: '上下文已用',
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
    title: '一键压缩',
    value: pct == null ? undefined : `${pct}%`,
    sub: pct == null ? '等待上下文数据' : undefined,
    corner: { id: 'contextCompact', label: '压缩', armedLabel: '确认', armed, pos: 'bottom' },
  }
}

/** Task card: counts of pending / in_progress / completed from the todos projection. */
function taskRender(stats: WidgetStats): WidgetRenderOut | null {
  const todos = stats.todos
  if (!todos) return null
  const pending = todos.filter((t) => t.status === 'pending').length
  const doing = todos.filter((t) => t.status === 'in_progress').length
  const done = todos.filter((t) => t.status === 'completed').length
  const total = todos.length
  return {
    title: '任务',
    value: `${done} 已完成`,
    sub: total > 0 ? `${doing} 进行中 · ${pending} 待办` : undefined,
  }
}

/** Token usage heatmap card — a GitHub-style daily grid coloured by volume.
 *  The 2×2 size shows the rolling ~3-month calendar (window alignment
 *  user-configurable) with a legend under the title (two plain figures:
 *  today / window total). The 2×4 size shows a ~7-month (30-week) rolling grid
 *  — all recent usage points at a glance — with the two figures moved into the
 *  title row's right side (headRight) and the grid horizontally centred. */
function heatmapRender(stats: WidgetStats, meta?: { size?: WidgetSize }): WidgetRenderOut | null {
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
    title: 'Token 用量',
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
  const bars = lastNDays(rawLog, 7)
  if (!bars.length) return null
  const today = bars[bars.length - 1]?.value ?? 0
  const weekTotal = bars.reduce((a, b) => a + b.value, 0)
  const legend = today > 0 || weekTotal > 0 ? `${fmtTokens(today)}  ${fmtTokens(weekTotal)}` : undefined
  return {
    title: 'Token 用量',
    legend,
    chart: { kind: 'barsV', bars },
  }
}

/** A small rotating inspirational quote, with per-card customization:
 *  custom text, show-title toggle, alignment, wrap. */
let quoteIdx = 0
const DEFAULT_QUOTES = ['每天进步一点点', '保持好奇，保持热爱', '耐心是成功的好朋友', '只管努力，剩下的交给时间', '今天也是元气满满的一天']
function quoteRender(stats: WidgetStats): WidgetRenderOut {
  quoteIdx = (quoteIdx + 1) % DEFAULT_QUOTES.length
  const c = stats as unknown as Record<string, unknown>
  const text = c.text as string | undefined
  const showTitle = c.showTitle as boolean | undefined
  const align = c.align as 'left' | 'center' | 'right' | undefined
  const valign = c.valign as 'top' | 'center' | 'bottom' | undefined
  const wrap = c.wrap as boolean | undefined
  return {
    title: showTitle === false ? '' : '今日寄语',
    rich: { type: 'quote', text: (text && text.trim()) || DEFAULT_QUOTES[quoteIdx], align, valign, wrap },
  }
}

/** The complete widget registry. */
export const WIDGETS: Widget[] = [
  { id: 'counts', name: '轮次·步数', desc: '本轮会话的轮次与步骤计数', builtin: true, render: (s) => ({ title: '轮次·步数', value: `${s.turns}轮 ${s.steps}步` }) },
  { id: 'llm', name: 'LLM 时长', desc: '模型推理累计耗时', builtin: true, render: (s) => (s.llmMs > 0 ? { title: 'LLM 时长', value: fmtDuration(s.llmMs) } : null) },
  { id: 'tool', name: '工具调用', desc: '工具调用累计耗时', builtin: true, render: (s) => (s.toolMs > 0 ? { title: '工具调用', value: fmtDuration(s.toolMs) } : null) },
  { id: 'ttft', name: '首 token 平均', desc: '平均首 token 延迟', builtin: true, render: (s) => (s.ttftSteps > 0 ? { title: '首 token 平均', value: fmtDuration(s.ttftMs / s.ttftSteps) } : null) },
  { id: 'tps', name: '速率', desc: '解码吞吐速度', builtin: true, render: (s) => (s.decodeMs > 0 ? { title: '速率', value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1000))} tok/s` } : null) },
  { id: 'cache', name: '缓存命中', desc: '输入缓存的命中比例', builtin: true, render: (s) => (s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? { title: '缓存命中', value: `${Math.round((s.usage.cacheReadTokens / s.usage.inputTokens) * 100)}%` } : null) },
  { id: 'tokens', name: 'Tokens', desc: '输入与输出 token 计数', builtin: true, render: (s) => (s.usage && s.usage.inputTokens > 0 ? { title: 'Tokens', value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}` } : null) },
  { id: 'context', group: 'context', name: '一键压缩', desc: '上下文占用百分比，右上按钮两次点击执行压缩', builtin: true, render: contextRender },
  { id: 'context-water', group: 'context', name: '上下文水位', desc: '上下文系统/工具/消息占比分段条', builtin: true, sizes: ['2x2', '2x4'], render: contextWaterRender },
  { id: 'task', group: 'task', name: '任务', desc: '当前任务的进行中/已完成/待办计数', builtin: true, render: taskRender },
  { id: 'heatmap', group: 'data', name: '用量热度图', desc: '每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点；可在预览选择 2×2 窗口对齐方式', builtin: true, sizes: ['2x2', '2x4'], render: heatmapRender, configSchema: [
    { key: 'monthMode', label: '窗口对齐方式', type: 'mode', default: 'rolling', options: [['rolling', '滚动(今天最右)'], ['quarter', '季度对齐']] },
  ] },
  { id: 'heatmap-bars', group: 'data', name: '用量柱状图', desc: '最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致', builtin: true, render: heatmapBarsRender, configSchema: [
    { key: 'monthMode', label: '窗口对齐方式', type: 'mode', default: 'rolling', options: [['rolling', '滚动(今天最右)'], ['quarter', '季度对齐']] },
  ] },
  { id: 'quote', group: 'fun', name: '今日寄语', desc: '随机一句鼓励语录', builtin: true, render: quoteRender, configSchema: [
    { key: 'text', label: '寄语内容', type: 'text' },
    { key: 'showTitle', label: '显示标题', type: 'toggle', default: true },
    { key: 'align', label: '水平对齐', type: 'align', default: 'left' },
    { key: 'valign', label: '垂直位置', type: 'valign', default: 'top' },
    { key: 'wrap', label: '允许换行', type: 'toggle', default: true },
  ] },
  { id: 'usage-bars', group: 'opencode-go', name: '用量对比', desc: 'OpenCode 滚动/周/月三窗口用量柱状图', builtin: false, badgeLabel: 'OpenCode Go 用量配额', render: usageBarsRender },
  { id: 'usage-rolling', group: 'opencode-go', name: '滚动用量', desc: 'OpenCode Go 滚动窗口用量配额', builtin: false, badgeLabel: 'OpenCode Go 用量配额', render: usageRender('rolling', '滚动用量') },
  { id: 'usage-weekly', group: 'opencode-go', name: '每周用量', desc: 'OpenCode Go 每周用量配额', builtin: false, badgeLabel: 'OpenCode Go 用量配额', render: usageRender('weekly', '每周用量') },
  { id: 'usage-monthly', group: 'opencode-go', name: '每月用量', desc: 'OpenCode Go 每月用量配额', builtin: false, badgeLabel: 'OpenCode Go 用量配额', render: usageRender('monthly', '每月用量') },
]

/** All widget ids. */
export const ALL_IDS = WIDGETS.map((w) => w.id)

/** Every valid instance key (each widget at each of its supported sizes). */
export const ALL_INSTANCES: string[] = WIDGETS.flatMap((w) => sizesOf(w).map((s) => instanceKey(w.id, s)))

/** The default installed set: every built-in widget at its 2×2 size. */
export const DEFAULT_INSTALLED: string[] = WIDGETS.filter((w) => w.builtin).map((w) => instanceKey(w.id, '2x2'))

/** Badge text for a widget. */
export function badgeOf(w: Widget): string {
  return w.badgeLabel ?? (w.builtin ? '系统' : '外部')
}

/** The group key for a widget (its own id when it is not grouped). */
export function groupOf(w: Widget): string {
  return w.group ?? w.id
}

/** The sizes a widget supports, defaulting to 2×2 only. */
export function sizesOf(w: Widget): WidgetSize[] {
  return Array.isArray(w.sizes) && w.sizes.length > 0 ? w.sizes.slice() : ['2x2']
}
