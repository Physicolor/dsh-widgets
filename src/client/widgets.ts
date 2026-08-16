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
  kind: 'bars' | 'ring' | 'line' | 'segments' | 'heatmap'
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

/** The card shape a widget render produces. */
export interface WidgetRenderOut {
  title: string
  title2?: string
  /** Optional text shown at the right end of the title row (e.g. ~613K / 1M). */
  headRight?: string
  /** Optional prominent figure rendered on its own row UNDER the title (e.g. the
   *  context percent, with small figures beside it). Pushes content top-aligned. */
  headAfter?: { big?: string; small?: string }
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
  type: 'text' | 'textarea' | 'toggle' | 'align' | 'valign'
  default?: string | boolean | 'left' | 'center' | 'right'
}

/** The card shape a widget render produces. */
export interface Widget {
  id: string
  name: string
  desc: string
  builtin: boolean
  group?: string
  badgeLabel?: string
  render: (stats: WidgetStats) => WidgetRenderOut | null
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
function contextWaterRender(stats: WidgetStats): WidgetRenderOut | null {
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

/** Token usage heatmap card — a GitHub-style daily grid coloured by volume. */
function heatmapRender(stats: WidgetStats): WidgetRenderOut | null {
  const grid = stats.heatmapGrid
  if (!grid || !grid.length) return null
  // Locate today's cell by date (it is not always the bottom-right corner once
  // the current month can be left/center/right aligned in the window).
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  let todayVal = 0
  for (const row of grid) for (const c of row) if (c.date === todayKey) { todayVal = c.value; break }
  return {
    title: 'Token 用量',
    headRight: todayVal > 0 ? `${Math.round(todayVal / 100) / 10}K · 今日` : undefined,
    chart: { kind: 'heatmap', heatmap: grid },
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
  { id: 'context-water', group: 'context', name: '上下文水位', desc: '上下文系统/工具/消息占比分段条', builtin: true, render: contextWaterRender },
  { id: 'task', group: 'task', name: '任务', desc: '当前任务的进行中/已完成/待办计数', builtin: true, render: taskRender },
  { id: 'heatmap', group: 'data', name: '用量热度图', desc: '最近 3 个月每日 Token 用量热度图（自记账）；可在预览中调整当前月落在左/中/右', builtin: true, render: heatmapRender, configSchema: [
    { key: 'monthAlign', label: '当前月在窗口位置', type: 'align', default: 'center' },
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

/** The default installed set (built-in widgets). */
export const DEFAULT_INSTALLED = WIDGETS.filter((w) => w.builtin).map((w) => w.id)

/** Badge text for a widget. */
export function badgeOf(w: Widget): string {
  return w.badgeLabel ?? (w.builtin ? '系统' : '外部')
}

/** The group key for a widget (its own id when it is not grouped). */
export function groupOf(w: Widget): string {
  return w.group ?? w.id
}
