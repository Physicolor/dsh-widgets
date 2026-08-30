/**
 * dsh-widgets — GENERATED widget registry. DO NOT EDIT BY HAND.
 *
 * Produced by scripts/gen-registry.mjs from the unit dirs under src/widgets/
 * (the machine-readable part comes from each unit's manifest.json; the
 * descriptors come from each unit's index.ts). Regenerate with:
 *   pnpm gen:registry        (write)
 *   pnpm check:registry      (verify up-to-date — the build/CI guard)
 *
 * Adding a widget = creating one unit dir; the registry follows automatically.
 */

import w_counts from '../widgets/counts'
import w_llm from '../widgets/llm'
import w_tool from '../widgets/tool'
import w_ttft from '../widgets/ttft'
import w_tps from '../widgets/tps'
import w_cache from '../widgets/cache'
import w_tokens from '../widgets/tokens'
import w_context from '../widgets/context'
import w_context_water from '../widgets/context-water'
import w_task from '../widgets/task'
import w_quote from '../widgets/quote'
import w_heatmap from '../widgets/heatmap'
import w_heatmap_bars from '../widgets/heatmap-bars'
import w_usage_bars from '../widgets/usage-bars'
import w_usage_rings from '../widgets/usage-rings'
import w_usage_rolling from '../widgets/usage-rolling'
import w_usage_weekly from '../widgets/usage-weekly'
import w_usage_monthly from '../widgets/usage-monthly'
import w_peak_pricing from '../widgets/peak-pricing'

/** Every discovered widget, in manifest display order (then by id). */
export const WIDGETS: import('./lib/contract').Widget[] = [
  w_counts,
  w_llm,
  w_tool,
  w_ttft,
  w_tps,
  w_cache,
  w_tokens,
  w_context,
  w_context_water,
  w_task,
  w_quote,
  w_heatmap,
  w_heatmap_bars,
  w_usage_bars,
  w_usage_rings,
  w_usage_rolling,
  w_usage_weekly,
  w_usage_monthly,
  w_peak_pricing,
]

/** All widget ids, in registry order. */
export const ALL_IDS: string[] = [
  'counts',
  'llm',
  'tool',
  'ttft',
  'tps',
  'cache',
  'tokens',
  'context',
  'context-water',
  'task',
  'quote',
  'heatmap',
  'heatmap-bars',
  'usage-bars',
  'usage-rings',
  'usage-rolling',
  'usage-weekly',
  'usage-monthly',
  'peak-pricing',
]

/** Every valid instance key (each widget at each of its supported sizes). */
export const ALL_INSTANCES: string[] = [
  `counts@2x2`,
  `llm@2x2`,
  `tool@2x2`,
  `ttft@2x2`,
  `tps@2x2`,
  `cache@2x2`,
  `tokens@2x2`,
  `context@2x2`,
  `context-water@2x2`,
  `context-water@2x4`,
  `task@2x2`,
  `quote@2x2`,
  `heatmap@2x2`,
  `heatmap@2x4`,
  `heatmap-bars@2x2`,
  `usage-bars@2x2`,
  `usage-rings@2x2`,
  `usage-rolling@2x2`,
  `usage-weekly@2x2`,
  `usage-monthly@2x2`,
  `peak-pricing@2x2`,
]

/** The stats-line family (fresh installs pre-load ONLY these). */
export const STATS_WIDGET_IDS: string[] = [
  'counts',
  'llm',
  'tool',
  'ttft',
  'tps',
  'cache',
  'tokens',
]

/** The default installed set: the stats-line family at 2×2. */
export const DEFAULT_INSTALLED: string[] = [
  `counts@2x2`,
  `llm@2x2`,
  `tool@2x2`,
  `ttft@2x2`,
  `tps@2x2`,
  `cache@2x2`,
  `tokens@2x2`,
]

/** Merged per-widget dictionaries (family-shared + every unit's locale).
 *  Registered with the locale service at apply() time. */
export const WIDGET_LOCALES: { zh: Record<string, string>; en: Record<string, string> } = {
  zh: {
    "badge.opencode": "OpenCode Go 用量配额",
    "usage.title": "OpenCode 用量",
    "usage.totalKey": "总 Key",
    "usage.cycleHint": "单击循环：{chain}",
    "usage.resets": "重置 {date}",
    "usage.rolling": "滚动",
    "usage.week": "周",
    "usage.month": "月",
    "widget.counts.name": "轮次·步数",
    "widget.counts.desc": "本轮会话的轮次与步骤计数",
    "card.counts.value": "{turns}轮 {steps}步",
    "widget.llm.name": "LLM 时长",
    "widget.llm.desc": "模型推理累计耗时",
    "widget.tool.name": "工具调用",
    "widget.tool.desc": "工具调用累计耗时",
    "widget.ttft.name": "首 token 平均",
    "widget.ttft.desc": "平均首 token 延迟",
    "widget.tps.name": "速率",
    "widget.tps.desc": "解码吞吐速度",
    "widget.cache.name": "缓存命中",
    "widget.cache.desc": "输入缓存的命中比例",
    "widget.tokens.name": "Tokens",
    "widget.tokens.desc": "输入与输出 token 计数",
    "widget.context.name": "一键压缩",
    "widget.context.desc": "上下文占用百分比，右上按钮两次点击执行压缩",
    "card.context.title": "一键压缩",
    "card.context.waiting": "等待上下文数据",
    "card.context.compact": "压缩",
    "card.context.confirm": "确认",
    "widget.context-water.name": "上下文水位",
    "widget.context-water.desc": "上下文系统/工具/消息占比分段条",
    "card.contextWater.title": "上下文已用",
    "card.contextWater.system": "系统提示词",
    "card.contextWater.tools": "工具",
    "card.contextWater.messages": "对话消息",
    "widget.task.name": "任务",
    "widget.task.desc": "当前任务的进行中/已完成/待办计数",
    "card.task.done": "{n} 已完成",
    "card.task.none": "暂无任务",
    "card.task.sub": "{doing} 进行中 · {pending} 待办",
    "widget.quote.name": "今日寄语",
    "widget.quote.desc": "显示你自定义的一句话（未填写文本时不显示内容）",
    "card.quote.title": "今日寄语",
    "config.quoteText": "寄语内容",
    "config.showTitle": "显示标题",
    "config.align": "水平对齐",
    "config.valign": "垂直位置",
    "config.wrap": "允许换行",
    "quote.previewPlaceholder": "（填写寄语内容后显示）",
    "widget.heatmap.name": "用量热度图",
    "widget.heatmap.desc": "每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点；大小可在市场左右切换",
    "card.heatmap.title": "Token 用量",
    "config.monthMode": "窗口对齐方式",
    "config.monthMode.rolling": "滚动(今天最右)",
    "config.monthMode.quarter": "季度对齐",
    "config.timeZone": "记账时区",
    "config.timeZone.beijing": "北京 (UTC+8)",
    "config.timeZone.local": "跟随系统",
    "widget.heatmap-bars.name": "用量柱状图",
    "widget.heatmap-bars.desc": "最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致",
    "config.monthMode.rolling7": "滚动(最近7天)",
    "config.monthMode.weekly": "每周对齐",
    "widget.usage-bars.name": "用量对比",
    "widget.usage-bars.desc": "OpenCode 滚动/周/月三窗口用量柱状图",
    "widget.usage-rings.name": "用量环图",
    "widget.usage-rings.desc": "OpenCode 滚动/周/月三窗口用量环形图",
    "widget.usage-rolling.name": "滚动用量",
    "widget.usage-rolling.desc": "OpenCode Go 滚动窗口用量配额",
    "widget.usage-weekly.name": "每周用量",
    "widget.usage-weekly.desc": "OpenCode Go 每周用量配额",
    "widget.usage-monthly.name": "每月用量",
    "widget.usage-monthly.desc": "OpenCode Go 每月用量配额",
    "widget.peak-pricing.name": "峰谷定价",
    "widget.peak-pricing.desc": "DeepSeek V4 峰谷定价：当前是否处于高峰时段（北京时间，工作日 09:00–12:00 与 14:00–18:00 为高峰）",
    "card.peak.title": "峰谷定价",
    "card.peak.window1": "上午 09:00–12:00",
    "card.peak.window2": "下午 14:00–18:00",
    "sim.peak": "高峰/低峰",
  },
  en: {
    "badge.opencode": "OpenCode Go Usage Quota",
    "usage.title": "OpenCode Usage",
    "usage.totalKey": "All Keys",
    "usage.cycleHint": "Click to cycle: {chain}",
    "usage.resets": "Resets {date}",
    "usage.rolling": "Rolling",
    "usage.week": "Week",
    "usage.month": "Month",
    "widget.counts.name": "Turns · Steps",
    "widget.counts.desc": "Turns and steps of the current session",
    "card.counts.value": "{turns} turns · {steps} steps",
    "widget.llm.name": "LLM Time",
    "widget.llm.desc": "Cumulative model inference time",
    "widget.tool.name": "Tool Calls",
    "widget.tool.desc": "Cumulative tool call time",
    "widget.ttft.name": "Avg TTFT",
    "widget.ttft.desc": "Average first-token latency",
    "widget.tps.name": "Rate",
    "widget.tps.desc": "Decode throughput speed",
    "widget.cache.name": "Cache Hit",
    "widget.cache.desc": "Input cache hit ratio",
    "widget.tokens.name": "Tokens",
    "widget.tokens.desc": "Input & output token counts",
    "widget.context.name": "Compact",
    "widget.context.desc": "Context usage percent; top-right button compacts after two taps",
    "card.context.title": "Compact",
    "card.context.waiting": "Waiting for context data",
    "card.context.compact": "Compact",
    "card.context.confirm": "Confirm",
    "widget.context-water.name": "Context Level",
    "widget.context-water.desc": "System/tools/messages share as a segmented bar",
    "card.contextWater.title": "Context Used",
    "card.contextWater.system": "System prompt",
    "card.contextWater.tools": "Tools",
    "card.contextWater.messages": "Messages",
    "widget.task.name": "Tasks",
    "widget.task.desc": "Counts of in-progress / completed / pending tasks",
    "card.task.done": "{n} done",
    "card.task.none": "No tasks",
    "card.task.sub": "{doing} in progress · {pending} pending",
    "widget.quote.name": "Daily Quote",
    "widget.quote.desc": "Shows a custom sentence you typed (hidden while empty)",
    "card.quote.title": "Daily Quote",
    "config.quoteText": "Quote Text",
    "config.showTitle": "Show Title",
    "config.align": "Horizontal Align",
    "config.valign": "Vertical Position",
    "config.wrap": "Allow Wrap",
    "quote.previewPlaceholder": "(shown after you type a quote)",
    "widget.heatmap.name": "Token Heatmap",
    "widget.heatmap.desc": "Daily token usage heatmap (self-accounted). 2×2 shows a ~3-month calendar, 2×4 the ~half-year history; switch size in the market",
    "card.heatmap.title": "Token Usage",
    "config.monthMode": "Window Alignment",
    "config.monthMode.rolling": "Rolling (today right)",
    "config.monthMode.quarter": "Quarter-aligned",
    "config.timeZone": "Accounting Timezone",
    "config.timeZone.beijing": "Beijing (UTC+8)",
    "config.timeZone.local": "Follow system",
    "widget.heatmap-bars.name": "Token Bars",
    "widget.heatmap-bars.desc": "Vertical bars of the last 7 days of token usage; same height as the calendar view",
    "config.monthMode.rolling7": "Rolling (last 7 days)",
    "config.monthMode.weekly": "Weekly aligned",
    "widget.usage-bars.name": "Usage Bars",
    "widget.usage-bars.desc": "OpenCode rolling/weekly/monthly usage bars",
    "widget.usage-rings.name": "Usage Rings",
    "widget.usage-rings.desc": "OpenCode rolling/weekly/monthly usage rings",
    "widget.usage-rolling.name": "Rolling Usage",
    "widget.usage-rolling.desc": "OpenCode Go rolling-window usage quota",
    "widget.usage-weekly.name": "Weekly Usage",
    "widget.usage-weekly.desc": "OpenCode Go weekly usage quota",
    "widget.usage-monthly.name": "Monthly Usage",
    "widget.usage-monthly.desc": "OpenCode Go monthly usage quota",
    "widget.peak-pricing.name": "Peak Pricing",
    "widget.peak-pricing.desc": "DeepSeek V4 peak pricing: whether now is a peak window (Beijing time, weekdays 09:00–12:00 & 14:00–18:00 are peak)",
    "card.peak.title": "Peak Pricing",
    "card.peak.window1": "Morning 09:00–12:00",
    "card.peak.window2": "Afternoon 14:00–18:00",
    "sim.peak": "Peak/Off-Peak",
  },
}
