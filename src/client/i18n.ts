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
  'ui.addPanel.title': '组件设置',
  'ui.addPanel.closeAria': '关闭',
  'ui.addPanel.resizeAria': '调整宽度',
  'ui.rail.resizeAria': '调整大小',
  // The bottom tile is the panel's ENTRY POINT, not an "add": the panel carries
  // the full config / market / settings triple (owner decision 2026-10-01).
  'ui.rail.addAria': '打开组件设置',
  'ui.rail.addLabel': '设置',
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
  'config.metricsLabel': '显示指标（勾选 + 排序）',
  'config.metricDrag': '拖动排序',
  'config.metricHint': '已选 {n}/{max} · 拖动整行排序：顺序 = 卡片上从左到右，每行最多 5 个、超过自动折成两行',
  'config.closePreview': '关闭预览',
  'market.viewList': '列表视图',
  'market.viewGrid': '组件视图',

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

  // Settings panel rows
  'settings.columns.title': '最多列数',
  'settings.columns.desc': '组件区横向最多几列；与「可显示的最多行数」相乘决定可放置的组件数量',
  'settings.columns.unit': '列',
  'settings.realtime.title': '无极变化（连续跟随）',
  'settings.realtime.desc': '放大峰值逐帧跟随鼠标；关闭则在吸附点之间补间',
  'settings.magnify.title': '悬浮放大倍数',
  'settings.magnify.desc': '被悬浮组件的峰值放大倍数',
  'settings.padding.title': '组件间距',
  'settings.padding.desc': '卡片之间的固定间距，同时作为组件区四周留白',
  'settings.cardSide.title': '卡片基准边长',
  'settings.cardSide.desc': '卡片的最小边长；空间富余时按 10px 档位放大，上限为「5 行可见」，字体与圆角随实际边长缩放',
  'settings.panelWidth.title': '组件设置面板宽度',
  'settings.panelWidth.desc': '“组件设置”面板宽度，也可拖其左边缘调整',
  'settings.maxWidgets.title': '最多组件数',
  'settings.maxWidgets.desc': '可放置的组件数量上限；它同时受「最多列数 × 最多行数」限制',
  'settings.maxWidgets.unit': '个',
  'settings.maxWidgets.capped': '上限被 {cols} 列 × {rows} 行 = {max} 个覆盖，实际按 {max} 个生效（调大列数/行数即可放开）',
  'settings.maxRows.title': '可显示的最多行数',
  'settings.maxRows.desc': '组件区纵向最多显示多少行；与「最多列数」共同决定可放置的组件数量（列 × 行）',
  'settings.maxRows.unit': '行',
  'settings.hideStatsLine.title': '隐藏输入框下方文字条',
  'settings.hideStatsLine.desc': '隐藏输入框下方状态统计条的文字（保留原空间）',
  'settings.squircle.title': '连续曲率圆角',
  'settings.squircle.desc': '组件卡片用超椭圆（squircle）圆角，曲率从直边连续过渡，而非直接接一段圆弧',
  'settings.corner.title': '圆角档位',
  'settings.corner.desc': '圆角半径占卡片短边的比例（内容内间距同步变化）；12% 约等于旧的固定 16px',
  'settings.corner.option': '{p}%',

  // Advanced settings — the open/close animation of the whole rail group.
  'settings.group.grid.title': '网格与尺寸',
  'settings.group.grid.desc': '组件区一次能摆下多少、每个格子多大；列 × 行就是可放置组件的上限',
  'settings.group.card.title': '卡片外观',
  'settings.group.card.desc': '圆角形状与档位，对组件区、市场与配置预览同时生效',
  'settings.group.hover.title': '悬浮放大',
  'settings.group.hover.desc': '指针停在卡片上时的波峰效果',
  'settings.group.anim.title': '打开与收起动画',
  'settings.group.anim.desc': '组件区从右上角出现时的位移与缩放；默认值就是当前发布的效果',
  'settings.group.panel.title': '组件设置面板',
  'settings.group.panel.desc': '右侧这块浮动面板自身的尺寸',
  'settings.group.chat.title': '对话区',
  'settings.group.chat.desc': '与组件区搭配的对话界面选项',
  'settings.openShape.title': '展开方式',
  'settings.openShape.desc': '逐个落入：组件栏本身不动，每张卡片走「整体缩放」时整块走的那条路径（同一个屏幕外锚点、同一个起始缩放与位移、同样两条曲线），只是各自错开时机，整个折叠的总时长与「整体缩放」完全一致——左下角那张先落位、右上角收尾（收起按相反顺序退场）；整体缩放：整块从右侧滑入并从右上角放大出现',
  'settings.openShape.stagger': '逐个落入（手风琴）',
  'settings.openShape.zoom': '整体缩放',
  'settings.animScale.title': '打开起始缩放',
  'settings.animScale.desc': '展开起始的缩放：整体缩放下作用于整块，逐个落入下作用于每张卡片；100% 表示只平移、不放大',
  'settings.animCurve.title': '缩放曲线',
  'settings.animCurve.desc': '缩放（从起始缩放长回 100%）随时间的变化：横轴是时间、纵轴是进度，拖动两个圆点即可自定义（逐个落入下由级联延迟错开）',
  'settings.animShiftCurve.title': '位移曲线',
  'settings.animShiftCurve.desc': '位移随时间的变化：整体缩放下是整栏从右侧滑入，逐个落入下是每张卡片沿同一条位移滑入（与缩放曲线分开，两条互不影响）。回弹幅度大于 0% 时，这条曲线的「起手纵坐标」由回弹反解——承载过冲的就是这一维，其余三个数原样保留（你把它拖得比反解值更陡时以你为准）；把回弹幅度设回 0% 就完全按你画的曲线走',
  'settings.animBounce.title': '回弹幅度',
  'settings.animBounce.desc': '位移收尾时的过冲：卡片（整体缩放下是整栏）会越过终点再弹回来，数值是「越过行程的百分比」，0% 为不带回弹的匀速落位；回弹只作用于位移，缩放始终不超过 100%（否则整栏会长出所在列），收起时这段回弹会变成离场前的反向蓄力（同一条时间线倒放）',
  'settings.animCurve.custom': '自定义',
  'settings.animCurve.linear': '线性',
  'settings.animCurve.standard': '标准',
  'settings.animCurve.easeOut': '缓出',
  'settings.animCurve.sqrt': '根号',
  'settings.animCurve.smooth': '平滑',
  'settings.wholeCards.title': '只显示完整组件',
  'settings.wholeCards.desc': '组件区底部被截断的卡片直接隐藏，只画完整可见的卡片（保留卡片阴影）',

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
  'ui.addPanel.title': 'Widget Settings',
  'ui.addPanel.closeAria': 'Close',
  'ui.addPanel.resizeAria': 'Resize width',
  'ui.rail.resizeAria': 'Resize',
  'ui.rail.addAria': 'Open widget settings',
  'ui.rail.addLabel': 'Settings',
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
  'config.metricsLabel': 'Metrics (pick & order)',
  'config.metricDrag': 'Drag to reorder',
  'config.metricHint': '{n}/{max} picked · drag a row to reorder: the order is left to right on the card, five per row, wrapping to two rows',
  'config.closePreview': 'Close preview',
  'market.viewList': 'List view',
  'market.viewGrid': 'Gallery view',

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


  'settings.columns.title': 'Max Columns',
  'settings.columns.desc': 'Largest column count the rail may use; multiplied by “max rows” it caps how many widgets can be placed',
  'settings.columns.unit': 'cols',
  'settings.realtime.title': 'Continuous Magnify',
  'settings.realtime.desc': 'The magnify peak follows the pointer every frame; off tweens between snapped points',
  'settings.magnify.title': 'Hover Magnify',
  'settings.magnify.desc': 'Peak scale of the hovered card',
  'settings.padding.title': 'Card Gap',
  'settings.padding.desc': 'Fixed gap between cards, also used as the rail’s own inset',
  'settings.cardSide.title': 'Base Card Size',
  'settings.cardSide.desc': 'Minimum card side; cards grow in 10px tiers up to the size where five rows still fit, and scale their type and radii with the real size',
  'settings.panelWidth.title': 'Settings panel width',
  'settings.panelWidth.desc': 'Width of the “Widget Settings” panel; drag its left edge to adjust',
  'settings.maxWidgets.title': 'Max Widgets',
  'settings.maxWidgets.desc': 'Upper bound on how many widgets can be placed; it is also limited by “max columns × max rows”',
  'settings.maxWidgets.unit': '',
  'settings.maxWidgets.capped': 'Capped by {cols} columns × {rows} rows = {max}, so {max} is what applies (raise the columns or rows to unlock)',
  'settings.maxRows.title': 'Max rows',
  'settings.maxRows.desc': 'Rows the rail budgets; together with “max columns” it defines how many widgets can be placed (columns × rows)',
  'settings.maxRows.unit': 'rows',
  'settings.hideStatsLine.title': 'Hide Stats Line',
  'settings.hideStatsLine.desc': 'Hide the text of the status stats bar under the input box (its space is kept)',
  'settings.squircle.title': 'Continuous corner curvature',
  'settings.squircle.desc': 'Draw card corners as superellipses (squircle): the curvature ramps in from the straight edges instead of meeting a circular arc',
  'settings.corner.title': 'Corner radius',
  'settings.corner.desc': 'Corner radius as a share of the card’s short side (the content inset follows it); 12% ≈ the old fixed 16px',
  'settings.corner.option': '{p}%',

  'settings.group.grid.title': 'Grid & Size',
  'settings.group.grid.desc': 'How many tiles the rail seats and how big each cell is — columns × rows caps how many widgets can be placed',
  'settings.group.card.title': 'Card Look',
  'settings.group.card.desc': 'Corner shape and gear; applies to the rail, the market and the config previews alike',
  'settings.group.hover.title': 'Hover Magnify',
  'settings.group.hover.desc': 'The Dock-style wave under the pointer',
  'settings.group.anim.title': 'Open / Close Animation',
  'settings.group.anim.desc': 'How the rail grows out of its top-right corner; the defaults are what ships',
  'settings.group.panel.title': 'Settings Panel',
  'settings.group.panel.desc': 'The floating panel this page lives in',
  'settings.group.chat.title': 'Conversation',
  'settings.group.chat.desc': 'Conversation-surface options that work with the rail',
  'settings.openShape.title': 'Open Shape',
  'settings.openShape.desc': 'Stagger: the rail itself does not move — every card travels along the very path the whole group takes in Whole-group zoom (same off-screen anchor, same start scale and travel, same two curves), each on its own beat, and the WHOLE fold lasts exactly as long as the group’s own transition: the bottom-left cell lands first and the top-right one last (the collapse retracts in the reverse order). Whole-group zoom: the rail slides in from the right and scales out of its top-right corner.',
  'settings.openShape.stagger': 'Stagger (accordion)',
  'settings.openShape.zoom': 'Whole-group zoom',
  'settings.animScale.title': 'Open Start Scale',
  'settings.animScale.desc': 'Scale the open starts from: the whole group in “Whole-group zoom”, each card in “Stagger”; 100% = slide only',
  'settings.animCurve.title': 'Zoom Curve',
  'settings.animCurve.desc': 'How the SCALE advances over time (growing back to 100% from the start scale); drag the two dots to draw your own (x = time, y = progress). In “Stagger” the cascade delays stagger it per card',
  'settings.animShiftCurve.title': 'Position Curve',
  'settings.animShiftCurve.desc': 'How POSITION advances over time: the rail sliding in from the right (Whole-group zoom), or each card sliding along that same move (Stagger); tuned apart from the zoom curve. With Spring settle above 0% this curve\'s TAKE-OFF ordinate is re-solved from the bounce — that is the dimension carrying the overshoot, and the other three numbers are kept as drawn (a steeper hand-drawn take-off wins); set Spring settle back to 0% to run your curve exactly',
  'settings.animBounce.title': 'Spring settle',
  'settings.animBounce.desc': 'How far the POSITION overshoots its target before settling: the cards (the whole rail in Whole-group zoom) go past their seat and spring back. The value is a percentage of the travel; 0% is a plain eased landing. It applies to position only — the scale never passes 100% (the rail would grow past its column). Closing plays the same timeline backwards, so the settle leads the leave as a short wind-up',
  'settings.animCurve.custom': 'Custom',
  'settings.animCurve.linear': 'Linear',
  'settings.animCurve.standard': 'Standard',
  'settings.animCurve.easeOut': 'Ease out',
  'settings.animCurve.sqrt': 'Square root',
  'settings.animCurve.smooth': 'Smooth',
  'settings.wholeCards.title': 'Whole cards only',
  'settings.wholeCards.desc': 'Hide the card the rail’s viewport would cut in half, so only fully visible cards are drawn (shadows stay intact)',

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
  // The merged map is cached (see dictFor): the extras just changed, so the next
  // reader must rebuild instead of serving the previous shell-only map.
  dictCache = null
}

/** The merged dictionaries, built ONCE per locale and reused.
 *
 *  WHY THIS IS NOT A MICRO-OPTIMISATION. `t()` sits on every label of every card,
 *  and the widget rail re-renders continuously while a turn streams (measured
 *  2026-09-29 with `Profiler.takePreciseCoverage`: 26 LanesChart renders/s, 3977
 *  `t()` calls/s). Rebuilding the merged map per call — the spread plus the
 *  Object.entries loop — showed up as the SINGLE hottest function in a CPU profile
 *  of the idle page (21.7% of samples, ~160 ms/s of one core) and it multiplied the
 *  rail's per-render cost, which is what the dropped frames scale with. The map is
 *  shared, not copied: callers only read keys out of it (`t` and the locale
 *  registration), and `setExtraLocales` drops the cache instead of mutating it. */
let dictCache: { zh: Record<string, string>; en: Record<string, string> } | null = null

/** The effective dictionary for a locale: shell + per-widget extras. */
function dictFor(locale: 'zh' | 'en'): Record<string, string> {
  if (dictCache === null) {
    const merge = (base: Record<string, string>, extra: Record<string, string>): Record<string, string> => {
      const merged: Record<string, string> = { ...base }
      for (const [k, v] of Object.entries(extra)) merged[k] = v
      return merged
    }
    dictCache = {
      zh: merge(ZH, extraLocales.zh ?? {}),
      en: merge(EN, extraLocales.en ?? {}),
    }
  }
  return dictCache[locale]
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