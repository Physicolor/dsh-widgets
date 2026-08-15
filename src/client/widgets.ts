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
}

/** The card shape a widget render produces. */
export interface WidgetRenderOut {
  title: string
  title2?: string
  value?: string
  sub?: string
}

/** One widget descriptor. */
export interface Widget {
  id: string
  name: string
  desc: string
  builtin: boolean
  group?: string
  badgeLabel?: string
  render: (stats: WidgetStats) => WidgetRenderOut | null
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

/** The complete widget registry. */
export const WIDGETS: Widget[] = [
  { id: 'counts', name: '轮次·步数', desc: '本轮会话的轮次与步骤计数', builtin: true, render: (s) => ({ title: '轮次·步数', value: `${s.turns}轮 ${s.steps}步` }) },
  { id: 'llm', name: 'LLM 时长', desc: '模型推理累计耗时', builtin: true, render: (s) => (s.llmMs > 0 ? { title: 'LLM 时长', value: fmtDuration(s.llmMs) } : null) },
  { id: 'tool', name: '工具调用', desc: '工具调用累计耗时', builtin: true, render: (s) => (s.toolMs > 0 ? { title: '工具调用', value: fmtDuration(s.toolMs) } : null) },
  { id: 'ttft', name: '首 token 平均', desc: '平均首 token 延迟', builtin: true, render: (s) => (s.ttftSteps > 0 ? { title: '首 token 平均', value: fmtDuration(s.ttftMs / s.ttftSteps) } : null) },
  { id: 'tps', name: '速率', desc: '解码吞吐速度', builtin: true, render: (s) => (s.decodeMs > 0 ? { title: '速率', value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1000))} tok/s` } : null) },
  { id: 'cache', name: '缓存命中', desc: '输入缓存的命中比例', builtin: true, render: (s) => (s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? { title: '缓存命中', value: `${Math.round((s.usage.cacheReadTokens / s.usage.inputTokens) * 100)}%` } : null) },
  { id: 'tokens', name: 'Tokens', desc: '输入与输出 token 计数', builtin: true, render: (s) => (s.usage && s.usage.inputTokens > 0 ? { title: 'Tokens', value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}` } : null) },
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
