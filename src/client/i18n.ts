/**
 * dsh-widgets i18n — SHELL dictionary + locale-service wiring.
 *
 * Architecture (ARCH-001): this file owns ONLY the shell/UI strings (rails,
 * settings pages, market chrome, generic labels). Per-widget strings live in
 * each widget unit's `manifest.json` (merged by the registry generator into
 * `generated.registry.ts` → `WIDGET_LOCALES`) and are handed in at apply()
 * time via `installLocale(api, WIDGET_LOCALES)` / `setExtraLocales(...)`.
 * A widget unit NEVER edits this file — it ships its own locale.
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

/** Per-widget merged dictionaries (from the registry generator). */
export interface WidgetLocales {
  zh?: Record<string, string>
  en?: Record<string, string>
}

/* ------------------------------------------------------------------ */
/*  Shell dictionaries (zh/en share the same key set)                  */
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

  // Market group labels (keyed by the widget's group id; a group without a
  // label falls back to the first widget's name)
  'group.system': '系统',
  'group.device': '设备状态',
  'group.opencode-go': 'OpenCode Go',
  'group.coding-plan': 'Coding Plan 用量',
  'group.pricing': '峰谷定价',
  'group.other': '其它',

  // Badges (generic)
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

  // Align/valign labels (generic control labels)
  'align.left': '左',
  'align.center': '居中',
  'align.right': '右',
  'align.top': '上',
  'align.bottom': '下',
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

  'group.system': 'System',
  'group.device': 'Device',
  'group.opencode-go': 'OpenCode Go',
  'group.coding-plan': 'Coding Plan Usage',
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
}

/* ------------------------------------------------------------------ */
/*  Runtime state                                                      */
/* ------------------------------------------------------------------ */

let bound: ((key: string, params?: Record<string, unknown>) => string) | null = null
let localeSubscribed = false
const localeListeners = new Set<() => void>()

/** Per-widget dictionaries merged over the shell dicts (set at apply()). */
let extraLocales: WidgetLocales = {}

/** Feed the per-widget locale maps into the translation path (called once at
 *  apply() with `WIDGET_LOCALES` from the generated registry). The widget
 *  dictionaries are merged over the shell dictionaries at READ time, so both
 *  the official-service registration and the built-in fallback see them. */
export function setExtraLocales(extra: WidgetLocales): void {
  extraLocales = extra ?? {}
}

/** The effective dictionary for a locale: shell + per-widget extras. */
function dictFor(locale: 'zh' | 'en'): Record<string, string> {
  const base = locale === 'zh' ? ZH : EN
  const extra = locale === 'zh' ? (extraLocales.zh ?? {}) : (extraLocales.en ?? {})
  const merged: Record<string, string> = { ...base }
  for (const [k, v] of Object.entries(extra)) merged[k] = v
  return merged
}

/** Feed the official locale service (called from apply). Registers the merged
 *  zh/en dictionaries for this namespace, then binds the translate function so
 *  `t()` resolves through the runtime's ACTIVE locale on every call. Returns a
 *  disposer that unregisters everything. */
export function installLocale(api: LocaleApi | undefined, widgetLocales?: WidgetLocales): () => void {
  if (widgetLocales) setExtraLocales(widgetLocales)
  const prev = bound
  bound = null
  const disposers: Array<() => void> = []
  let unsub: (() => void) | undefined
  if (api) {
    if (api.register) {
      try { disposers.push(api.register(NS, 'zh', dictFor('zh'))) } catch { /* duplicate ns/locale from an earlier registration */ }
      try { disposers.push(api.register(NS, 'en', dictFor('en'))) } catch { /* duplicate ns/locale from an earlier registration */ }
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
  const d = dictFor(detectLocale())
  const s = d[key] ?? EN[key] ?? key
  return interpolate(s, params)
}

/** Translate with multiple params shorthand. */
export function tf(key: string, params: Record<string, unknown>): string {
  return t(key, params)
}