/**
 * dsh-widgets i18n.
 *
 * Preferred channel is the official `locale` service (`ctx.get('locale')`,
 * provided by @deepseek-ai/dsh-client-locale): its `bind(ns)` returns a
 * translate function that reads the ACTIVE locale at call time, so switching
 * Settings → Language takes effect on every re-render. Fallback (locale
 * service absent from the composition) stays self-contained: the built-in
 * zh/en dictionaries decided by the same detection chain the product uses
 * (localStorage 'dsh-language' → <html lang> → navigator.language).
 *
 * `onLocaleChange` lets the widget rail subscribe to locale switches so the
 * always-mounted surfaces re-render immediately (official shell re-renders
 * only settings content).
 */

/** The narrow slice of LocaleRuntime we consume (untyped: no hard dep). */
export interface LocaleApi {
  /** Register one locale's dictionary for the widget namespace. */
  register?: (ns: string, locale: string, dict: Record<string, string>) => () => void
  bind?: (ns: string) => (key: string, params?: Record<string, unknown>) => string
  subscribe?: (fn: () => void) => () => void
}

export type T = (key: string, params?: Record<string, unknown>) => string

const NS = 'dsh-widgets'

/* ------------------------------------------------------------------ */
/*  Dictionaries (default fallback; zh/en share the same key set)      */
/* ------------------------------------------------------------------ */

const ZH: Record<string, string> = {
  // Settings section label + header capsule
  'ui.section.label': '组件',
  'ui.capsule': '组件',
  'ui.addPanel.title': '添加组件',
  'ui.addPanel.closeAria': '关闭',
  'ui.addPanel.resizeAria': '调整宽度',
  'ui.rail.resizeAria': '调整大小',
  'ui.rail.addAria': '添加组件',
  'ui.rail.addLabel': '添加',

  // Widgets page (settings section)
  'page.title': '组件',
  'page.desc': '管理右侧栏中的小组件。',
  'tab.config': '组件配置',
  'tab.market': '组件市场',
  'tab.settings': '组件设置',

  // Config tab
  'config.addedCount': '已添加 {added}/{max}（点击组件可预览与配置）',
  'config.preview': '{name} · 预览',
  'config.cardSize': '卡片大小',
  'config.simTip': '点击卡片切换：{label}',
  'config.simTitle': '点击切换预览状态',
  'config.custom': '自定义',

  // Order list
  'order.removeAria': '移除',
  'order.removeTitle': '从组件栏移除',

  // Market tab
  'market.search': '搜索组件',
  'market.back': '← 返回',
  'market.sizeBlocked': '1列不可用',
  'market.added': '已添加',
  'market.add': '添加',
  'market.details': '查看详情',
  'market.limit': '已达上限 {max} 个，先在组件配置中移除再添加',
  'market.prevAria': '上一个',
  'market.nextAria': '下一个',
  'market.sizeBlockedTitle': '1 列布局下不显示 2×4 组件',
  'market.previewText': '预览寄语：写一句你的话',

  // Market group labels
  'group.system': '系统',
  'group.codingPlan': 'Coding Plan 用量',
  'group.pricing': '峰谷定价',
  'group.other': '其它',

  // Badges
  'badge.system': '系统',
  'badge.external': '外部',

  // Settings panel rows
  'settings.columns.title': '列数',
  'settings.columns.desc': '侧边栏卡片排布列数：1 列 = 纵向 Dock；2 列 / 4 列 = 网格布局，并解锁长方形部件能力',
  'settings.columns.option': '{n} 列',
  'settings.realtime.title': '无极变化（连续跟随）',
  'settings.realtime.desc': '开启后放大峰值跟随鼠标实时连续变化（每个动画帧重排），用于对比观察动画节奏；关闭则离散跳变后由过渡动画补间',
  'settings.magnify.title': '放大倍数',
  'settings.magnify.desc': '被悬浮组件的峰值放大比例（1.0 = 不放大，1.4 = 1.4 倍）',
  'settings.padding.title': '组件栏内边距',
  'settings.padding.desc': '栏内四周与卡片间距（两者一致）',
  'settings.cardSide.title': '卡片边长',
  'settings.cardSide.desc': '所有卡片统一的正方形边长，字体与圆角随比例缩放',
  'settings.panelWidth.title': '添加面板宽度',
  'settings.panelWidth.desc': '右侧“添加组件”面板的宽度，也可拖其左边缘调整',
  'settings.maxWidgets.title': '最多组件数',
  'settings.maxWidgets.desc': '侧边栏最多显示的组件数量，超限后无法再添加',
  'settings.maxWidgets.unit': '个',
  'settings.hideStatsLine.title': '隐藏输入框下方文字条',
  'settings.hideStatsLine.desc': '隐藏输入框下方状态统计条的文字（保留原空间、不影响布局）；关闭时正常显示',

  // Align/valign labels
  'align.left': '左',
  'align.center': '居中',
  'align.right': '右',
  'align.top': '上',
  'align.bottom': '下',

  // Widget registry names + descriptions
  'widget.counts.name': '轮次·步数',
  'widget.counts.desc': '本轮会话的轮次与步骤计数',
  'widget.llm.name': 'LLM 时长',
  'widget.llm.desc': '模型推理累计耗时',
  'widget.tool.name': '工具调用',
  'widget.tool.desc': '工具调用累计耗时',
  'widget.ttft.name': '首 token 平均',
  'widget.ttft.desc': '平均首 token 延迟',
  'widget.tps.name': '速率',
  'widget.tps.desc': '解码吞吐速度',
  'widget.cache.name': '缓存命中',
  'widget.cache.desc': '输入缓存的命中比例',
  'widget.tokens.name': 'Tokens',
  'widget.tokens.desc': '输入与输出 token 计数',
  'widget.context.name': '一键压缩',
  'widget.context.desc': '上下文占用百分比，右上按钮两次点击执行压缩',
  'widget.context-water.name': '上下文水位',
  'widget.context-water.desc': '上下文系统/工具/消息占比分段条',
  'widget.task.name': '任务',
  'widget.task.desc': '当前任务的进行中/已完成/待办计数',
  'widget.quote.name': '今日寄语',
  'widget.quote.desc': '显示你自定义的一句话（未填写文本时不显示内容）',
  'widget.heatmap.name': '用量热度图',
  'widget.heatmap.desc': '每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点；大小可在市场左右切换',
  'widget.heatmap-bars.name': '用量柱状图',
  'widget.heatmap-bars.desc': '最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致',
  'widget.usage-bars.name': '用量对比',
  'widget.usage-bars.desc': 'OpenCode 滚动/周/月三窗口用量柱状图',
  'widget.usage-rings.name': '用量环图',
  'widget.usage-rings.desc': 'OpenCode 滚动/周/月三窗口用量环形图',
  'widget.usage-rolling.name': '滚动用量',
  'widget.usage-rolling.desc': 'OpenCode Go 滚动窗口用量配额',
  'widget.usage-weekly.name': '每周用量',
  'widget.usage-weekly.desc': 'OpenCode Go 每周用量配额',
  'widget.usage-monthly.name': '每月用量',
  'widget.usage-monthly.desc': 'OpenCode Go 每月用量配额',
  'widget.peak-pricing.name': '峰谷定价',
  'widget.peak-pricing.desc': 'DeepSeek V4 峰谷定价：当前是否处于高峰时段（北京时间，工作日 09:00–12:00 与 14:00–18:00 为高峰）',

  'badge.opencode': 'OpenCode Go 用量配额',
  'sim.peak': '高峰/低峰',

  // Card render texts
  'card.counts.value': '{turns}轮 {steps}步',
  'card.context.title': '一键压缩',
  'card.context.waiting': '等待上下文数据',
  'card.context.compact': '压缩',
  'card.context.confirm': '确认',
  'card.contextWater.title': '上下文已用',
  'card.contextWater.system': '系统提示词',
  'card.contextWater.tools': '工具',
  'card.contextWater.messages': '对话消息',
  'card.task.done': '{n} 已完成',
  'card.task.none': '暂无任务',
  'card.task.sub': '{doing} 进行中 · {pending} 待办',
  'card.quote.title': '今日寄语',
  'card.peak.title': '峰谷定价',
  'card.peak.window1': '上午 09:00–12:00',
  'card.peak.window2': '下午 14:00–18:00',
  'card.heatmap.title': 'Token 用量',

  // Usage (OpenCode) cards
  'usage.title': 'OpenCode 用量',
  'usage.totalKey': '总 Key',
  'usage.cycleHint': '单击循环：{chain}',
  'usage.resets': '重置 {date}',
  'usage.rolling': '滚动',
  'usage.week': '周',
  'usage.month': '月',

  // Per-card config schema
  'config.quoteText': '寄语内容',
  'config.showTitle': '显示标题',
  'config.align': '水平对齐',
  'config.valign': '垂直位置',
  'config.wrap': '允许换行',
  'config.monthMode': '窗口对齐方式',
  'config.monthMode.rolling': '滚动(今天最右)',
  'config.monthMode.quarter': '季度对齐',
  'config.monthMode.rolling7': '滚动(最近7天)',
  'config.monthMode.weekly': '每周对齐',
  'config.timeZone': '记账时区',
  'config.timeZone.beijing': '北京 (UTC+8)',
  'config.timeZone.local': '跟随系统',

  'preview.quotePlaceholder': '（填写寄语内容后显示）',
}

const EN: Record<string, string> = {
  'ui.section.label': 'Widgets',
  'ui.capsule': 'Widgets',
  'ui.addPanel.title': 'Add Widget',
  'ui.addPanel.closeAria': 'Close',
  'ui.addPanel.resizeAria': 'Resize width',
  'ui.rail.resizeAria': 'Resize',
  'ui.rail.addAria': 'Add widget',
  'ui.rail.addLabel': 'Add',

  'page.title': 'Widgets',
  'page.desc': 'Manage the mini-widgets in the right rail.',
  'tab.config': 'Config',
  'tab.market': 'Market',
  'tab.settings': 'Settings',

  'config.addedCount': 'Added {added}/{max} (click a component to preview & configure)',
  'config.preview': '{name} · Preview',
  'config.cardSize': 'Card Size',
  'config.simTip': 'Click the card to switch: {label}',
  'config.simTitle': 'Click to toggle preview state',
  'config.custom': 'Custom',

  'order.removeAria': 'Remove',
  'order.removeTitle': 'Remove from rail',

  'market.search': 'Search widgets',
  'market.back': '← Back',
  'market.sizeBlocked': 'Not in 1 column',
  'market.added': 'Added',
  'market.add': 'Add',
  'market.details': 'Details',
  'market.limit': 'Limit reached ({max} widgets). Remove one in Config first',
  'market.prevAria': 'Previous',
  'market.nextAria': 'Next',
  'market.sizeBlockedTitle': '2×4 is not shown in a 1-column layout',
  'market.previewText': 'Preview quote: write your own words',

  'group.system': 'System',
  'group.codingPlan': 'Coding Plan Usage',
  'group.pricing': 'Peak Pricing',
  'group.other': 'Others',

  'badge.system': 'System',
  'badge.external': 'External',

  'settings.columns.title': 'Columns',
  'settings.columns.desc': 'Rail column count: 1 = vertical dock; 2 / 4 = grid layouts (enables rectangular widgets)',
  'settings.columns.option': '{n} cols',
  'settings.realtime.title': 'Continuous Magnify',
  'settings.realtime.desc': 'When on, the magnify peak follows the pointer continuously every frame (for comparing animation rhythm); when off, it snaps between grid points and a transition tween glides it',
  'settings.magnify.title': 'Magnification',
  'settings.magnify.desc': 'Peak scale of the hovered card (1.0 = no zoom, 1.4 = 1.4×)',
  'settings.padding.title': 'Rail Padding',
  'settings.padding.desc': 'Padding inside the rail around the cards (applies to all sides)',
  'settings.cardSide.title': 'Card Size',
  'settings.cardSide.desc': 'Uniform square side for every card; fonts and radii scale with it',
  'settings.panelWidth.title': 'Add Panel Width',
  'settings.panelWidth.desc': 'Width of the right “Add Widget” panel; drag its left edge to adjust',
  'settings.maxWidgets.title': 'Max Widgets',
  'settings.maxWidgets.desc': 'Maximum widgets shown in the rail; nothing more can be added beyond it',
  'settings.maxWidgets.unit': '',
  'settings.hideStatsLine.title': 'Hide Stats Line',
  'settings.hideStatsLine.desc': 'Hide the text of the status stats bar under the input box (space kept, layout untouched); off shows it normally',

  'align.left': 'Left',
  'align.center': 'Center',
  'align.right': 'Right',
  'align.top': 'Top',
  'align.bottom': 'Bottom',

  'widget.counts.name': 'Turns · Steps',
  'widget.counts.desc': 'Turns and steps of the current session',
  'widget.llm.name': 'LLM Time',
  'widget.llm.desc': 'Cumulative model inference time',
  'widget.tool.name': 'Tool Calls',
  'widget.tool.desc': 'Cumulative tool call time',
  'widget.ttft.name': 'Avg TTFT',
  'widget.ttft.desc': 'Average first-token latency',
  'widget.tps.name': 'Rate',
  'widget.tps.desc': 'Decode throughput speed',
  'widget.cache.name': 'Cache Hit',
  'widget.cache.desc': 'Input cache hit ratio',
  'widget.tokens.name': 'Tokens',
  'widget.tokens.desc': 'Input & output token counts',
  'widget.context.name': 'Compact',
  'widget.context.desc': 'Context usage percent; top-right button compacts after two taps',
  'widget.context-water.name': 'Context Level',
  'widget.context-water.desc': 'System/tools/messages share as a segmented bar',
  'widget.task.name': 'Tasks',
  'widget.task.desc': 'Counts of in-progress / completed / pending tasks',
  'widget.quote.name': 'Daily Quote',
  'widget.quote.desc': 'Shows a custom sentence you typed (hidden while empty)',
  'widget.heatmap.name': 'Token Heatmap',
  'widget.heatmap.desc': 'Daily token usage heatmap (self-accounted). 2×2 shows a ~3-month calendar, 2×4 the ~half-year history; switch size in the market',
  'widget.heatmap-bars.name': 'Token Bars',
  'widget.heatmap-bars.desc': 'Vertical bars of the last 7 days of token usage; same height as the calendar view',
  'widget.usage-bars.name': 'Usage Bars',
  'widget.usage-bars.desc': 'OpenCode rolling/weekly/monthly usage bars',
  'widget.usage-rings.name': 'Usage Rings',
  'widget.usage-rings.desc': 'OpenCode rolling/weekly/monthly usage rings',
  'widget.usage-rolling.name': 'Rolling Usage',
  'widget.usage-rolling.desc': 'OpenCode Go rolling-window usage quota',
  'widget.usage-weekly.name': 'Weekly Usage',
  'widget.usage-weekly.desc': 'OpenCode Go weekly usage quota',
  'widget.usage-monthly.name': 'Monthly Usage',
  'widget.usage-monthly.desc': 'OpenCode Go monthly usage quota',
  'widget.peak-pricing.name': 'Peak Pricing',
  'widget.peak-pricing.desc': 'DeepSeek V4 peak pricing: whether now is a peak window (Beijing time, weekdays 09:00–12:00 & 14:00–18:00 are peak)',

  'badge.opencode': 'OpenCode Go Usage Quota',
  'sim.peak': 'Peak/Off-Peak',

  'card.counts.value': '{turns} turns · {steps} steps',
  'card.context.title': 'Compact',
  'card.context.waiting': 'Waiting for context data',
  'card.context.compact': 'Compact',
  'card.context.confirm': 'Confirm',
  'card.contextWater.title': 'Context Used',
  'card.contextWater.system': 'System prompt',
  'card.contextWater.tools': 'Tools',
  'card.contextWater.messages': 'Messages',
  'card.task.done': '{n} done',
  'card.task.none': 'No tasks',
  'card.task.sub': '{doing} in progress · {pending} pending',
  'card.quote.title': 'Daily Quote',
  'card.peak.title': 'Peak Pricing',
  'card.peak.window1': 'Morning 09:00–12:00',
  'card.peak.window2': 'Afternoon 14:00–18:00',
  'card.heatmap.title': 'Token Usage',

  'usage.title': 'OpenCode Usage',
  'usage.totalKey': 'All Keys',
  'usage.cycleHint': 'Click to cycle: {chain}',
  'usage.resets': 'Resets {date}',
  'usage.rolling': 'Rolling',
  'usage.week': 'Week',
  'usage.month': 'Month',

  'config.quoteText': 'Quote Text',
  'config.showTitle': 'Show Title',
  'config.align': 'Horizontal Align',
  'config.valign': 'Vertical Position',
  'config.wrap': 'Allow Wrap',
  'config.monthMode': 'Window Alignment',
  'config.monthMode.rolling': 'Rolling (today right)',
  'config.monthMode.quarter': 'Quarter-aligned',
  'config.monthMode.rolling7': 'Rolling (last 7 days)',
  'config.monthMode.weekly': 'Weekly aligned',
  'config.timeZone': 'Accounting Timezone',
  'config.timeZone.beijing': 'Beijing (UTC+8)',
  'config.timeZone.local': 'Follow system',

  'preview.quotePlaceholder': '(shown after you type a quote)',
}

/* ------------------------------------------------------------------ */
/*  Runtime state                                                      */
/* ------------------------------------------------------------------ */

let bound: ((key: string, params?: Record<string, unknown>) => string) | null = null
let localeSubscribed = false
const localeListeners = new Set<() => void>()

/** Feed the official locale service (called from apply). Registers both zh and
 *  en dictionaries for this namespace, then binds the translate function so
 *  `t()` resolves through the runtime's ACTIVE locale on every call. Returns a
 *  disposer that unregisters everything. */
export function installLocale(api: LocaleApi | undefined): () => void {
  const prev = bound
  bound = null
  const disposers: Array<() => void> = []
  let unsub: (() => void) | undefined
  if (api) {
    if (api.register) {
      try { disposers.push(api.register(NS, 'zh', ZH)) } catch { /* duplicate ns/locale from an earlier registration */ }
      try { disposers.push(api.register(NS, 'en', EN)) } catch { /* duplicate ns/locale from an earlier registration */ }
    }
    if (api.bind) bound = api.bind(NS)
    if (api.subscribe && !localeSubscribed) {
      localeSubscribed = true
      unsub = api.subscribe(() => { for (const fn of [...localeListeners]) fn() })
    }
  }
  return () => {
    bound = prev
    for (const d of disposers) d()
    if (unsub) { unsub(); localeSubscribed = false }
  }
}

/** Subscribe to locale switches (per-fiber cleanup via the returned disposer). */
export function onLocaleChange(fn: () => void): () => void {
  localeListeners.add(fn)
  return () => { localeListeners.delete(fn) }
}

/** Fallback locale detection (official service absent). */
function detectLocale(): 'zh' | 'en' {
  try {
    const stored = localStorage.getItem('dsh-language')
    if (stored !== null && stored !== '') return stored.startsWith('zh') ? 'zh' : 'en'
  } catch { /* private mode */ }
  try {
    const lang = document.documentElement.lang
    if (lang) return lang.startsWith('zh') ? 'zh' : 'en'
  } catch { /* SSR */ }
  try {
    return navigator.language?.startsWith('zh') ? 'zh' : 'en'
  } catch {
    return 'zh'
  }
}

function interpolate(s: string, params?: Record<string, unknown>): string {
  if (!params) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] !== undefined ? String(params[k]) : m))
}

/** Translate a dictionary key; prefers the official locale translation. */
export function t(key: string, params?: Record<string, unknown>): string {
  if (bound) return bound(key, params)
  const d = detectLocale() === 'zh' ? ZH : EN
  const s = d[key] ?? EN[key] ?? key
  return interpolate(s, params)
}

/** Translate with multiple params shorthand. */
export function tf(key: string, params: Record<string, unknown>): string {
  return t(key, params)
}