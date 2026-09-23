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
  'ui.renderError': '渲染异常，请刷新查看日志',

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
  'settings.columns.title': '最多列数',
  'settings.columns.desc': '组件区允许的最大列数；空间不足时自动逐级回退，空间充裕也不会超过此列数',
  'settings.columns.option': '最多 {n} 列',
  'settings.realtime.title': '无极变化（连续跟随）',
  'settings.realtime.desc': '放大峰值逐帧跟随鼠标；关闭则在吸附点之间补间',
  'settings.magnify.title': '放大倍数',
  'settings.magnify.desc': '被悬浮组件的峰值放大倍数',
  'settings.padding.title': '组件间距',
  'settings.padding.desc': '卡片之间的固定间距，同时作为组件区四周留白',
  'settings.cardSide.title': '卡片基准边长',
  'settings.cardSide.desc': '卡片的最小边长；空间富余时按 10px 档位放大，上限为「5 行可见」，字体与圆角随实际边长缩放',
  'settings.panelWidth.title': '添加面板宽度',
  'settings.panelWidth.desc': '“添加组件”面板宽度，也可拖其左边缘调整',
  'settings.maxWidgets.title': '最多组件数',
  'settings.maxWidgets.desc': '组件区最多显示的组件数量',
  'settings.maxWidgets.unit': '个',
  'settings.hideStatsLine.title': '隐藏输入框下方文字条',
  'settings.hideStatsLine.desc': '隐藏输入框下方状态统计条的文字（保留原空间）',
  'settings.squircle.title': '连续曲率圆角',
  'settings.squircle.desc': '组件卡片用超椭圆（squircle）圆角，曲率从直边连续过渡，而非直接接一段圆弧',
  'settings.corner.title': '圆角档位',
  'settings.corner.desc': '圆角半径占卡片短边的比例（内容内间距同步变化）；12% 约等于旧的固定 16px',
  'settings.corner.option': '{p}%',

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
  'ui.renderError': 'Render error — see console',

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

  'settings.columns.title': 'Max Columns',
  'settings.columns.desc': 'Largest column count the rail may use; steps down automatically when space runs short, and never exceeds it when space is plentiful',
  'settings.columns.option': 'Up to {n}',
  'settings.realtime.title': 'Continuous Magnify',
  'settings.realtime.desc': 'The magnify peak follows the pointer every frame; off tweens between snapped points',
  'settings.magnify.title': 'Magnification',
  'settings.magnify.desc': 'Peak scale of the hovered card',
  'settings.padding.title': 'Card Gap',
  'settings.padding.desc': 'Fixed gap between cards, also used as the rail’s own inset',
  'settings.cardSide.title': 'Base Card Size',
  'settings.cardSide.desc': 'Minimum card side; cards grow in 10px tiers up to the size where five rows still fit, and scale their type and radii with the real size',
  'settings.panelWidth.title': 'Add Panel Width',
  'settings.panelWidth.desc': 'Width of the “Add Widget” panel; drag its left edge to adjust',
  'settings.maxWidgets.title': 'Max Widgets',
  'settings.maxWidgets.desc': 'Most widgets the rail may show',
  'settings.maxWidgets.unit': '',
  'settings.hideStatsLine.title': 'Hide Stats Line',
  'settings.hideStatsLine.desc': 'Hide the text of the status stats bar under the input box (its space is kept)',
  'settings.squircle.title': 'Continuous corner curvature',
  'settings.squircle.desc': 'Draw card corners as superellipses (squircle): the curvature ramps in from the straight edges instead of meeting a circular arc',
  'settings.corner.title': 'Corner radius',
  'settings.corner.desc': 'Corner radius as a share of the card’s short side (the content inset follows it); 12% ≈ the old fixed 16px',
  'settings.corner.option': '{p}%',

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