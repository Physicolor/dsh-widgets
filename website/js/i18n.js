/**
 * dsh-widgets showcase — bilingual i18n (Chinese default, English opt-in).
 *
 * One dictionary per language; every user-facing string of the site (nav,
 * hero, sections, gallery, playground, form, spec output, modal, footer,
 * widget preview texts) lives here. The HTML carries `data-i18n="key"`
 * placeholders with the Chinese text as the no-JS fallback; dynamic modules
 * call `t(key)` at render time. No framework — a tiny engine is enough.
 *
 * Widget strings mirror the REAL unit manifests `src/widgets/<id>/manifest.json`
 * (zh/en locale entries) so previews say exactly what the product says.
 */
window.DASH_I18N = (function () {
  'use strict';

  var zh = {
    /* nav */
    navHome: '首页', navWidgets: '组件', navDesign: '设计',
    navCreate: '创建', navContribute: '贡献',

    /* WEBSITE-002: slimmed copy */
    p1b: 'Useful', p3b: 'Compact', p5b: 'Clear',
    gSub: '全部 19 个正式组件。',
    gbGoodP: '一个主数字领衔，其余信息映衬——有限空间的正确打开方式。',
    gbBadP: '一次性塞满所有信息——读者看不出什么重要，于是什么都不重要。',
    makeTitle: '如何制作一个组件',
    makeLead: '人决定要做什么，Agent 负责怎么实现，系统负责验证它是否合格。',
    makeStep1: '提出想法', makeStep2: '填写需求', makeStep3: 'Agent 实现', makeStep4: '验证', makeStep5: '提交',
    makeCta: '创建一个组件',
    detailLabel: '深入阅读：',
    detailWorkflow: '生产流程 docs/workflow',
    detailTemplate: '组件模板 src/widgets-template',
    detailValidator: '单元校验 validate-widget-unit.mjs',
    formTitle: '填写需求',
    formSub: '描述你想要的组件，生成一份可以直接交给 AI Agent 的组件规格。',
    ctLead: '每个组件都必须跨过六道硬门槛；REWORK 是正常迭代，BLOCKED 才是停。',
    ctWorkflow: '生产流程完整文档',
    ctWorkflowD: '需求、规格、评审、验收、生产记录。',
    ghIssue2: 'GitHub Issues',
    ctIssuesD: '提交组件需求或想法，每条进入标准流程。',
    rm3: '更多语言（加 ja/ko 属纯字典扩展）',
    rm4: '可选跨设备同步（本地优先是有意为之的默认）',
    brandLabel: 'dsh-widgets — 返回顶部',
    langToggleAria: '切换语言：中文 / English',
    themeToggleAria: '切换深色 / 浅色主题',
    themeToLight: '切换到浅色主题', themeToDark: '切换到深色主题',
    menuToggleAria: '展开 / 收起导航菜单',
    githubAria: 'GitHub 仓库',

    /* hero */
    kicker: 'dsh-widgets · v1.4.0 · MIT · DeepSeek Harness 0.1.x',
    heroLine1: 'DeepSeek Harness',
    heroLine2: 'Widgets',
    heroLead1: '将对话区域中的留白空间，转化为高信息密度、可随时隐藏的辅助界面。',
    heroLead2: 'A collection of compact, beautiful and useful widgets for DeepSeek Harness — live session stats, context, usage and pricing at a glance.',
    ctaWidgets: '浏览全部组件',
    ctaPlay: '创建你的组件',
    statWidgets: '组件', statCats: '分类', statBuiltin: '内置', statMarket: '市场组件',
    heroRightTitle: '组件就是长这样',
    heroRightSub: '真实组件的卡片语言 · 真实数据视觉 · 2×2 / 2×4',
    heroRightHint: '在 DeepSeek Harness 中，它们显示在对话的右侧',

    /* install */
    installTitle: '一条命令安装',
    installSub: '从插件市场添加即可——无需改任何配置文件。',
    termTitle: 'dsh-widgets@1.4.0 · DeepSeek Harness 插件',
    termComment: '# 然后硬刷新浏览器（Ctrl+Shift+R），并点击会话顶部的「组件」胶囊展开组件栏。',
    copy: '复制', copied: '已复制',
    installNote: '以 npm 包 dsh-widgets 分发 · DeepSeek Harness 0.1.0-rc.6+ · 本地开发使用 link 安装。',

    /* why */
    whyTitle: '为什么需要 dsh-widgets',
    whySub: '对话区域本就存在留白。dsh-widgets 把它变成一层有用、安静、随时可隐藏的信息层。',
    why1Title: '有用 Useful', why1Body: '组件不是装饰。每一张卡片都在极小的空间里呈现真正有价值的信息——Token、延迟、上下文构成、配额，一眼可读。',
    why2Title: '紧凑 Compact', why2Body: '对话界面的闲置留白变成高信息密度的表面：1 / 2 / 4 列，紧密排布的卡片，2×4 长条瓦片。',
    why3Title: '可选 Optional', why3Body: '组件是一层辅助信息，绝不阻碍对话——会话顶部的「组件」胶囊可以随时隐藏整条组件栏。',

    /* gallery */
    gTitle: '组件画廊',
    gSub: '全部 19 个正式组件——每一个都是 src/widgets/<id>/ 下独立、契约驱动的单元。',
    gAll: '全部', gSystem: '系统', gCodingPlan: '用量热度', gOpenCodeGo: 'OpenCode Go', gPricing: '峰谷定价', gOther: '其它',
    gEmpty: '该分类下暂无组件。',
    badgeBuiltin: '内置', badgeMarket: '市场', badgePre: '预装',
    badgeSizePrefix: '尺寸',

    /* philosophy */
    pTitle: '什么才是好组件',
    pSub: '在有限空间里，让最重要的信息先被看到。',
    p1: '信息密度', p1d: '高信号，无图表垃圾',
    p2: '层级', p2d: '一个主数字领衔',
    p3: '紧凑', p3d: '适配 2×2 / 2×4 单元格',
    p4: '可见性', p4d: '可读、实时、诚实',
    p5: '一致性', p5d: '共享同一套 token',
    gbGood: '好组件', gbGoodP: '一个百分比领衔卡片；分段条与图例紧随其后。每个元素都挣到了自己的像素。',
    gbBad: '坏组件', gbBadP: '一次塞进所有信息、9px 字号。读者无法判断什么重要——于是什么都不重要。',

    /* create */
    cTitle: '一个组件是如何诞生的',
    cSub: '创建组件不是「再写一个 React 组件」。它是产品决策、规格、独立单元、验证关卡——按这个顺序。',
    pStage1: '需求', pStage1d: '需求表 + 完整性检查（Human-owned）',
    pStage2: '规格', pStage2d: '技术分析 + Architecture Decision → Widget Specification',
    pStage3: '单元', pStage3d: 'Worker Agent 产出 src/widgets/<id>/',
    pStage4: '验证', pStage4d: 'MVW 硬门槛：Contract / Discovery / Registry / Runtime / Marketplace / Isolation',
    pStage5: '市场', pStage5d: '构建期注册生成，进入 Marketplace 可安装',
    loopNote: 'REWORK 是正常开发循环，不是失败：系统完整性是硬门槛，产品质量可以无限轮迭代。',
    haHumanTitle: '人类 —— 定义做什么',
    haAgentTitle: 'Agent —— 决定怎么做',
    haCore1: '人定义做什么。',
    haCore2: 'Agent 决定怎么做。',
    haCore3: '系统负责验证「做得对不对」。',
    haItemsA1: '这个组件应该做什么？', haItemsA2: '期望尺寸（2×2 / 2×4）', haItemsA3: '标题与核心内容',
    haItemsA4: '要展示哪些信息', haItemsA5: '信息优先级', haItemsA6: '分类 —— 产品意图',
    haItemsB1: '怎么实现', haItemsB2: '数据源与 Provider', haItemsB3: '架构选型（单元/共享/宿主/外部）',
    haItemsB4: '凭据与缓存策略', haItemsB5: '对照契约自检', haItemsB6: '技术细节，不打扰用户',
    sTitle: '一个组件是独立的软件单元',
    sTerm1: 'Manifest', sTerm1d: 'manifest.json —— id、顺序、分组、builtin、尺寸、多语言。机器可读契约。',
    sTerm2: '实现', sTerm2d: 'index.ts —— defineWidget 描述符：渲染、名称/描述 thunk、配置表单、示例。',
    sTerm3: '契约', sTerm3d: 'id 三元一致：目录 ≡ manifest.id ≡ 描述符 id。由生成器强制校验。',
    sTerm4: '发现', sTerm4d: 'scripts/gen-registry.mjs 构建期扫描单元目录——没有手工维护的注册表。',
    sTerm5: '隔离', sTerm5d: 'Worker 只碰自己的单元目录；并行 Agent 添加组件零文件冲突。',

    /* request */
    rTitle: '创建或提交一个组件',
    rSub: '填写后生成一份机器可读的 Widget Specification，交给 AI 编码 Agent 或提交到 Issue。',
    req: '必填', opt: '可选',
    fName: '组件名称', fNamePh: '例如：今天的运动步数',
    fPurpose: '组件用途', fPurposePh: '这个组件是干什么的？例如：展示今天的心率',
    fSize: '期望尺寸', fSize2: '2×2', fSize4: '2×4', fSizeBoth: '两者 2×2 与 2×4',
    fCategory: '市场分类',
    catSystem: 'system · 系统', catCodingPlan: 'coding-plan · 用量热度', catOpenCodeGo: 'opencode-go · OpenCode Go',
    catPricing: 'pricing · 峰谷定价', catOther: 'other · 其它', catNew: '新分类（在下方注明）',
    fTitle: '标题', fTitlePh: '用户期望看到的卡片标题，例如：今日运动',
    fContent: '核心内容', fContentPh: '核心信息内容，例如：当前步数 + 最低/平均/最高',
    fDisplay: '展示信息', fDisplayPh: '要展示的数据，例如：今日步数 / tok 每秒 / CPU 百分比',
    fExisting: '现有 / 新建分类', fExisting1: '现有分类', fExisting2: '新建分类',
    fPriority: '优先级', fPriHigh: '高', fPriMed: '中', fPriLow: '低',
    fVisual: '视觉参考', fVisualPh: '截图 / 布局 / 信息层级 / 重点元素 / 风格（如有）',
    fInteraction: '交互', fInteractionPh: '点击切换 / 双击确认……（无则留空）',
    genSpec: '生成 Widget Specification',
    resetForm: '清空',
    rHint: '先填好必填项，然后生成规格——它可以交给任何 AI 编码 Agent。',
    outTitle: 'Widget Specification',
    outPlaceholder: '填写表单并点击「生成 Widget Specification」。\n生成的规格可以直接粘贴给 AI 编码 Agent，或作为 GitHub Issue 提交。',
    copySpec: '复制 Specification',
    ghIssue: '在 GitHub 提交组件需求',
    rNote: 'GitHub Issue 接收组件需求；每条需求进入标准流程。自动处理在 Roadmap 上，还不是当前能力。',
    specMissing: '缺少必填字段 —— {n} 项：\n  · {list}\n\n用途、尺寸、标题、核心内容、展示信息、市场分类属于\n产品定义内容，需要你先确认。',
    specGen: '可直接交给 AI 编码 Agent 的组件规格',

    /* workflow */
    wTitle: '一条流程，而不是各自为政',
    wSubPre: '任何组件——无论输入是自然语言、截图、GitHub 灵感还是外部代码——都必须经过生产流程：',
    wSubStrong: '人定义做什么，Agent 决定怎么做，系统验证做得对不对。',
    mvwTitle: '最小可行组件', mvwBadge: 'MVW',
    mvwBody: '已经合法进入组件生态、可以继续迭代的最小完整组件。它是迭代的安全起点——产品可以不够完美，契约不能破坏。',
    stPass: 'PASS', stPassD: '系统完整性 + 产品质量达标',
    stRework: 'REWORK', stReworkD: '硬门槛全绿，产品表现需要打磨——这是正常开发，可循环任意轮。',
    stBlocked: 'BLOCKED', stBlockedD: '唯一真正的失败——契约非法 / 注册失败 / 构建失败 / 市场无法识别 / 碰了别的组件。STOP / 升级。',
    l1Title: '第 1 层 · 系统完整性', l1Span: '硬门槛', l1Body: '契约 · 发现 · 注册 · 构建 · 运行时 · 市场 · 隔离。',
    l2Title: '第 2 层 · 产品质量', l2Span: '可迭代', l2Body: 'UI · 视觉 · 排版 · 层级 · 文案 · 数据语义 · 交互 · 参考图相似度。',
    agentTitle: '为多个 Agent 同时工作而生',
    agentBody: '每个组件都拥有独立目录、独立契约、低冲突注册——多个 Worker 可以同时生产组件，互不等待。',
    ctTitle: '贡献一个组件',
    ctBody: '遵循标准流程——第一版不完美也欢迎，只要它从不违反：',
    ctIter: '迭代就是重点：REWORK → 人工评审 → 再改 → ……直到产品达标。契约坏了，才是停。',
    ctStep1: '定义', ctStep1d: '需求表 + 完整性检查',
    ctStep2: '构建', ctStep2d: '规格 → Worker → 组件单元',
    ctStep3: '验证', ctStep3d: 'validate-widget-unit.mjs MVW 硬门槛',
    ctStep4: '评审', ctStep4d: '独立评审 Agent + 人工评审',
    ctStep5: '提交', ctStep5d: '构建期重生成注册表 → 进入市场',
    roadmapTitle: 'Roadmap', roadmapBadge: '未来 · 尚非当前能力',
    rm1: '规模化 Agent 生产组件（单元 + 发现架构就是载体）',
    rm2: '第三方市场注册机制，让社区组件像插件一样加入',
    rm3: '热度图范围/周期控制；自定义峰谷定价时段',
    rm4: '多平台用量组件（Z.ai、DeepSeek 余额等），复用同源代理 + 凭据模式',
    rm5: '更多语言（当前 zh/en 字典层，加 ja/ko 是纯字典扩展）',
    rm6: '可选跨设备同步（本地优先的独立性是有意为之的默认）',

    /* footer */
    fNote: '构建于组件单元架构之上——每个组件都是一个独立、契约驱动、可发现的单元。',

    /* previews (mirrors real manifest locales) */
    'widget.counts.name': '轮次·步数', 'widget.counts.desc': '本轮会话的轮次与步骤计数',
    'card.counts.value': '{turns}轮 {steps}步',
    'widget.llm.name': 'LLM 时长', 'widget.llm.desc': '模型推理累计耗时',
    'widget.tool.name': '工具调用', 'widget.tool.desc': '工具调用累计耗时',
    'widget.ttft.name': '首 token 平均', 'widget.ttft.desc': '平均首 token 延迟',
    'widget.tps.name': '速率', 'widget.tps.desc': '解码吞吐速度',
    'widget.cache.name': '缓存命中', 'widget.cache.desc': '输入缓存的命中比例',
    'widget.tokens.name': 'Tokens', 'widget.tokens.desc': '输入与输出 token 计数',
    'card.context.title': '一键压缩', 'card.context.waiting': '等待上下文数据', 'card.context.compact': '压缩', 'card.context.confirm': '确认',
    'widget.context.name': '一键压缩', 'widget.context.desc': '上下文占用百分比，右上按钮两次点击执行压缩',
    'card.contextWater.title': '上下文已用', 'card.contextWater.system': '系统提示词', 'card.contextWater.tools': '工具', 'card.contextWater.messages': '对话消息',
    'widget.context-water.name': '上下文水位', 'widget.context-water.desc': '上下文系统/工具/消息占比分段条',
    'widget.task.name': '任务', 'widget.task.desc': '当前任务的进行中/已完成/待办计数',
    'card.task.done': '{n} 已完成', 'card.task.none': '暂无任务', 'card.task.sub': '{doing} 进行中 · {pending} 待办',
    'widget.quote.name': '今日寄语', 'widget.quote.desc': '显示你自定义的一句话（未填写文本时不显示内容）',
    'card.quote.title': '今日寄语',
    'quote.previewPlaceholder': '写下一句话，组件就会显示它——比如这一句。',
    'widget.heatmap.name': '用量热度图', 'widget.heatmap.desc': '每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点',
    'card.heatmap.title': 'Token 用量',
    'widget.heatmap-bars.name': '用量柱状图', 'widget.heatmap-bars.desc': '最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致',
    'widget.usage-bars.name': '用量对比', 'widget.usage-bars.desc': 'OpenCode 滚动/周/月三窗口用量柱状图',
    'widget.usage-rings.name': '用量环图', 'widget.usage-rings.desc': 'OpenCode 滚动/周/月三窗口用量环形图',
    'widget.usage-rolling.name': '滚动用量', 'widget.usage-rolling.desc': 'OpenCode Go 滚动窗口用量配额',
    'widget.usage-weekly.name': '每周用量', 'widget.usage-weekly.desc': 'OpenCode Go 每周用量配额',
    'widget.usage-monthly.name': '每月用量', 'widget.usage-monthly.desc': 'OpenCode Go 每月用量配额',
    'usage.title': 'OpenCode 用量', 'usage.totalKey': '总 Key', 'usage.rolling': '滚动', 'usage.week': '周', 'usage.month': '月',
    'usage.resets': '重置 {date}',
    'card.peak.title': '峰谷定价', 'card.peak.window1': '上午 09:00–12:00', 'card.peak.window2': '下午 14:00–18:00',
    'widget.peak-pricing.name': '峰谷定价', 'widget.peak-pricing.desc': 'DeepSeek V4 峰谷定价：当前是否处于高峰时段（北京时间，工作日 09:00–12:00 与 14:00–18:00 为高峰）',
    'badge.system': '内置', 'badge.external': '市场',
    specGen: 'dsh-widgets/widget-spec/v1 · 遵循 docs/workflow/03-specification.md（ARCH-002）',
    copyFailed: '复制失败——请手动选择复制',
    toastDone: '操作完成'
  };

  var en = {
    navHome: 'Home', navWidgets: 'Widgets', navDesign: 'Design',
    navCreate: 'Create', navContribute: 'Contribute',

    /* WEBSITE-002: slimmed copy */
    p1b: 'Useful', p3b: 'Compact', p5b: 'Clear',
    gSub: 'All 19 current widgets.',
    gbGoodP: 'One primary number leads; everything else supports it — the right way to use a small space.',
    gbBadP: 'Everything crammed in at once — the reader cannot tell what matters, so nothing matters.',
    makeTitle: 'How to make a widget',
    makeLead: 'Humans decide what to build, Agents decide how, the system verifies it is right.',
    makeStep1: 'Idea', makeStep2: 'Requirement', makeStep3: 'Agent implements', makeStep4: 'Validate', makeStep5: 'Submit',
    makeCta: 'Create a widget',
    detailLabel: 'Read more:',
    detailWorkflow: 'docs/workflow (production process)',
    detailTemplate: 'src/widgets-template',
    detailValidator: 'scripts/validate-widget-unit.mjs',
    formTitle: 'Fill in the requirement',
    formSub: 'Describe the widget you want and get a spec you can hand straight to an AI agent.',
    ctLead: 'Every widget must pass six hard gates; REWORK is normal iteration, BLOCKED is the only stop.',
    ctWorkflow: 'Production workflow docs',
    ctWorkflowD: 'Requirement, spec, review, acceptance, production records.',
    ghIssue2: 'GitHub Issues',
    ctIssuesD: 'Submit a widget request or idea; each one enters the standard workflow.',
    rm3: 'More locales (adding ja/ko is a pure dictionary extension)',
    rm4: 'Optional cross-device sync (local-first independence is the deliberate default)',
    brandLabel: 'dsh-widgets — back to top',
    langToggleAria: 'Switch language: 中文 / English',
    themeToggleAria: 'Toggle dark / light theme',
    themeToLight: 'Switch to light theme', themeToDark: 'Switch to dark theme',
    menuToggleAria: 'Toggle navigation menu',
    githubAria: 'GitHub repository',

    kicker: 'dsh-widgets · v1.4.0 · MIT · DeepSeek Harness 0.1.x',
    heroLine1: 'DeepSeek Harness',
    heroLine2: 'Widgets',
    heroLead1: 'Turn the idle whitespace of the conversation area into a high-information-density, hideable companion surface.',
    heroLead2: 'A collection of compact, beautiful and useful widgets for DeepSeek Harness — live session stats, context, usage and pricing at a glance.',
    ctaWidgets: 'Explore the widgets',
    ctaPlay: 'Create your widget',
    statWidgets: 'Widgets', statCats: 'Categories', statBuiltin: 'Built-in', statMarket: 'Market units',
    heroRightTitle: 'This is what it looks like',
    heroRightSub: 'Real card language · real data visuals · 2×2 / 2×4',
    heroRightHint: 'Inside DeepSeek Harness they live on the right side of the conversation',

    installTitle: 'Install in one command',
    installSub: 'Add it from the plugin market, no config files to touch.',
    termTitle: 'dsh-widgets@1.4.0 · DeepSeek Harness plugin',
    termComment: '# then hard-refresh the browser (Ctrl+Shift+R) and click the “Components” capsule in the session header.',
    copy: 'Copy', copied: 'Copied',
    installNote: 'Distributed as the npm package dsh-widgets · works on DeepSeek Harness 0.1.0-rc.6+ · local development uses a link install.',

    whyTitle: 'Why dsh-widgets',
    whySub: 'The conversation area already has idle space. dsh-widgets turns it into a useful, quiet, hideable information layer.',
    why1Title: 'Useful', why1Body: 'Widgets are not decoration. Every card carries genuinely valuable information — tokens, latency, context composition, quota — readable at a glance.',
    why2Title: 'Compact', why2Body: 'The idle whitespace of the conversation becomes a high-information-density surface: 1 / 2 / 4 columns of tightly packed cards, plus 2×4 wide tiles.',
    why3Title: 'Optional', why3Body: 'An auxiliary layer that never blocks a conversation — the “Components” capsule in the session header hides the whole rail at any time.',

    gTitle: 'Widget Gallery',
    gSub: 'All 19 current widgets — each one an independent, contract-driven unit under src/widgets/<id>/.',
    gAll: 'All', gSystem: 'System', gCodingPlan: 'Coding Plan', gOpenCodeGo: 'OpenCode Go', gPricing: 'Pricing', gOther: 'Other',
    gEmpty: 'No widgets in this category.',
    badgeBuiltin: 'Built-in', badgeMarket: 'Market', badgePre: 'Pre-installed',

    pTitle: 'What makes a good widget',
    pSub: 'In a limited space, the most valuable information must be seen first.',
    p1: 'Information Density', p1d: 'High signal, no chartjunk',
    p2: 'Hierarchy', p2d: 'One primary number leads',
    p3: 'Compactness', p3d: 'Fits 2×2 and 2×4 cells',
    p4: 'Visibility', p4d: 'Readable, live, honest',
    p5: 'Consistency', p5d: 'Shared token language',
    gbGood: 'Good widget', gbGoodP: 'One percentage leads the card; the segmented bar and legend follow. Every element earns its pixel.',
    gbBad: 'Bad widget', gbBadP: 'Everything, at once, in 9px text. The reader cannot tell what matters — so nothing matters.',

    cTitle: 'How a Widget is born',
    cSub: 'Creating a widget is not “just another React component”. It is a product decision, a specification, an independent unit, and a verification gate — in that order.',
    pStage1: 'Requirement', pStage1d: 'Requirement form + completeness check (Human-owned)',
    pStage2: 'Spec', pStage2d: 'Technical analysis + Architecture Decision → Widget Specification',
    pStage3: 'Unit', pStage3d: 'Worker Agent produces src/widgets/<id>/',
    pStage4: 'Validate', pStage4d: 'MVW hard gates: Contract / Discovery / Registry / Runtime / Marketplace / Isolation',
    pStage5: 'Market', pStage5d: 'Build-time registry regeneration → installable in Marketplace',
    loopNote: 'REWORK is a normal development loop, not a failure: system integrity is a hard gate, product quality may iterate any number of rounds.',
    haHumanTitle: 'Human — defines what',
    haAgentTitle: 'Agent — decides how',
    haCore1: 'Human defines what.',
    haCore2: 'Agent decides how.',
    haCore3: 'The system verifies it is right.',
    haItemsA1: 'What should this widget do?', haItemsA2: 'Desired size (2×2 / 2×4)', haItemsA3: 'Title and core content',
    haItemsA4: 'What information to display', haItemsA5: 'Information priority', haItemsA6: 'Category — product intent',
    haItemsB1: 'How to implement it', haItemsB2: 'Data source and provider', haItemsB3: 'Architecture (unit / shared / host / external)',
    haItemsB4: 'Credential and caching strategy', haItemsB5: 'Self-check against the contract', haItemsB6: 'Technical details, never bothering the human',
    sTitle: 'A widget is an independent software unit',
    sTerm1: 'Manifest', sTerm1d: 'manifest.json — id, order, group, builtin, sizes, locale. The machine-readable contract.',
    sTerm2: 'Implementation', sTerm2d: 'index.ts — a defineWidget descriptor: render, name/desc thunks, config schema, example.',
    sTerm3: 'Contract', sTerm3d: 'Three-way id consistency: folder ≡ manifest.id ≡ descriptor id. Enforced by the generator.',
    sTerm4: 'Discovery', sTerm4d: 'scripts/gen-registry.mjs scans unit directories at build time — no hand-maintained registry.',
    sTerm5: 'Isolation', sTerm5d: 'A worker touches only its own unit dir; parallel agents add widgets with zero file conflicts.',

    rTitle: 'Create or request a widget',
    rSub: 'Fill it in to generate a machine-readable spec, then hand it to an AI coding agent or open an issue.',
    req: 'required', opt: 'optional',
    fName: 'Widget Name', fNamePh: 'e.g. Heart rate',
    fPurpose: 'Widget Purpose', fPurposePh: 'What does this widget do? e.g. Show today’s heart rate',
    fSize: 'Desired Size', fSize2: '2×2', fSize4: '2×4', fSizeBoth: 'Both 2×2 & 2×4',
    fCategory: 'Marketplace Category',
    catSystem: 'system · System', catCodingPlan: 'coding-plan · Coding Plan usage', catOpenCodeGo: 'opencode-go · OpenCode Go',
    catPricing: 'pricing · Peak Pricing', catOther: 'other · Others', catNew: 'New category (describe below)',
    fTitle: 'Title', fTitlePh: 'Card title the user expects, e.g. Today’s heart rate',
    fContent: 'Core Content', fContentPh: 'The core information, e.g. current bpm + min/avg/max',
    fDisplay: 'Displayed Information', fDisplayPh: 'Data to show, e.g. today steps / tok per second / CPU percent',
    fExisting: 'Existing / New', fExisting1: 'Existing category', fExisting2: 'New category',
    fPriority: 'Priority', fPriHigh: 'High', fPriMed: 'Medium', fPriLow: 'Low',
    fVisual: 'Visual Reference', fVisualPh: 'Screenshot / layout / hierarchy / focus elements / style (if any)',
    fInteraction: 'Interaction', fInteractionPh: 'Click to cycle / double-tap to confirm … (leave empty if none)',
    genSpec: 'Generate Widget Specification',
    resetForm: 'Clear',
    rHint: 'Fill in the required fields first, then generate a spec you can hand to any AI coding agent.',
    outTitle: 'Widget Specification',
    outPlaceholder: 'Fill in the form and click “Generate Widget Specification”.\nThe generated spec can be pasted straight into an AI coding agent\nor opened as a GitHub issue.',
    copySpec: 'Copy specification',
    ghIssue: 'Suggest a Widget on GitHub',
    rNote: 'GitHub issues receive widget requests; each one enters the standard workflow. Automatic processing is on the roadmap, not yet a feature.',
    specMissing: 'Missing required fields — {n}:\n  · {list}\n\nPurpose, Size, Title, Core Content, Displayed Information and\nMarketplace Category are product decisions — please confirm them first.',
    specGenKeyUnused0: '',

    wTitle: 'A workflow, not a free-for-all',
    wSubPre: 'Every widget — whatever its origin (natural language, screenshot, GitHub idea, external code) — must pass the production workflow: ',
    wSubStrong: 'Human defines what, Agent decides how, the system verifies it is right.',
    mvwTitle: 'Minimum Viable Widget', mvwBadge: 'MVW',
    mvwBody: 'A widget that is legally in the ecosystem and safe to iterate on. It is the safe starting point of iteration — the product can be imperfect, the contract cannot break.',
    stPass: 'PASS', stPassD: 'System integrity + product quality at bar',
    stRework: 'REWORK', stReworkD: 'Hard gates green, product needs polish — normal development, loop any number of rounds.',
    stBlocked: 'BLOCKED', stBlockedD: 'The only true failure — invalid contract, registry, build, marketplace, or touching other widgets. STOP / escalate.',
    l1Title: 'Layer 1 · System Integrity', l1Span: 'hard gates', l1Body: 'Contract · Discovery · Registry · Build · Runtime · Marketplace · Isolation.',
    l2Title: 'Layer 2 · Product Quality', l2Span: 'iterable', l2Body: 'UI · visual · typography · hierarchy · copy · data semantics · interaction · reference similarity.',
    agentTitle: 'Built for many agents at once',
    agentBody: 'Every widget owns its directory, its contract and a low-conflict registration — multiple workers can build widgets simultaneously without waiting on each other.',
    ctTitle: 'Contribute a widget',
    ctBody: 'Follow the standard workflow — even a rough first version is welcome as long as it never violates:',
    ctIter: 'Iteration is the point: REWORK → human review → rework → … until the product is right. A broken contract, however, is a stop.',
    ctStep1: 'Define', ctStep1d: 'Requirement form + completeness check',
    ctStep2: 'Build', ctStep2d: 'Spec → worker → widget unit',
    ctStep3: 'Validate', ctStep3d: 'validate-widget-unit.mjs MVW gates',
    ctStep4: 'Review', ctStep4d: 'Independent review agent + human review',
    ctStep5: 'Submit', ctStep5d: 'Registry rebuilt at build time → marketplace',
    roadmapTitle: 'Roadmap', roadmapBadge: 'future — not yet current',
    rm1: 'Agent-produced widgets at scale (the unit + discovery architecture is the carrier)',
    rm2: 'Third-party marketplace registration so community widgets join like plugins',
    rm3: 'Heatmap range/period controls; custom peak-pricing schedules',
    rm4: 'Multi-platform usage widgets (Z.ai, DeepSeek balance …) on the same proxy + credentials pattern',
    rm5: 'More locales (the dictionary layer is zh/en today — adding ja/ko is a pure dictionary extension)',
    rm6: 'Optional cross-device sync (local-first independence is the deliberate default)',

    fNote: 'Built on the widget-unit architecture — every widget an independent, contract-driven, discoverable unit.',

    /* spec badge (no internal paths) */
    specGen: 'A spec you can hand straight to an AI coding agent',

    'widget.counts.name': 'Turns · Steps', 'widget.counts.desc': 'Turns and steps of the current session',
    'card.counts.value': '{turns} turns · {steps} steps',
    'widget.llm.name': 'LLM Time', 'widget.llm.desc': 'Cumulative model inference time',
    'widget.tool.name': 'Tool Calls', 'widget.tool.desc': 'Cumulative tool call time',
    'widget.ttft.name': 'Avg TTFT', 'widget.ttft.desc': 'Average first-token latency',
    'widget.tps.name': 'Rate', 'widget.tps.desc': 'Decode throughput speed',
    'widget.cache.name': 'Cache Hit', 'widget.cache.desc': 'Input cache hit ratio',
    'widget.tokens.name': 'Tokens', 'widget.tokens.desc': 'Input & output token counts',
    'card.context.title': 'Compact', 'card.context.waiting': 'Waiting for context data', 'card.context.compact': 'Compact', 'card.context.confirm': 'Confirm',
    'widget.context.name': 'Compact', 'widget.context.desc': 'Context usage percent; top-right button compacts after two taps',
    'card.contextWater.title': 'Context Used', 'card.contextWater.system': 'System prompt', 'card.contextWater.tools': 'Tools', 'card.contextWater.messages': 'Messages',
    'widget.context-water.name': 'Context Level', 'widget.context-water.desc': 'System/tools/messages share as a segmented bar',
    'widget.task.name': 'Tasks', 'widget.task.desc': 'Counts of in-progress / completed / pending tasks',
    'card.task.done': '{n} done', 'card.task.none': 'No tasks', 'card.task.sub': '{doing} in progress · {pending} pending',
    'widget.quote.name': 'Daily Quote', 'widget.quote.desc': 'Shows a custom sentence you typed (hidden while empty)',
    'card.quote.title': 'Daily Quote',
    'quote.previewPlaceholder': 'Type a sentence and the widget shows it — like this one.',
    'widget.heatmap.name': 'Token Heatmap', 'widget.heatmap.desc': 'Daily token usage heatmap (self-accounted). 2×2 shows a ~3-month calendar, 2×4 the ~half-year history',
    'card.heatmap.title': 'Token Usage',
    'widget.heatmap-bars.name': 'Token Bars', 'widget.heatmap-bars.desc': 'Vertical bars of the last 7 days of token usage; same height as the calendar view',
    'widget.usage-bars.name': 'Usage Bars', 'widget.usage-bars.desc': 'OpenCode rolling/weekly/monthly usage bars',
    'widget.usage-rings.name': 'Usage Rings', 'widget.usage-rings.desc': 'OpenCode rolling/weekly/monthly usage rings',
    'widget.usage-rolling.name': 'Rolling Usage', 'widget.usage-rolling.desc': 'OpenCode Go rolling-window usage quota',
    'widget.usage-weekly.name': 'Weekly Usage', 'widget.usage-weekly.desc': 'OpenCode Go weekly usage quota',
    'widget.usage-monthly.name': 'Monthly Usage', 'widget.usage-monthly.desc': 'OpenCode Go monthly usage quota',
    'usage.title': 'OpenCode Usage', 'usage.totalKey': 'All Keys', 'usage.rolling': 'Rolling', 'usage.week': 'Week', 'usage.month': 'Month',
    'usage.resets': 'Resets {date}',
    'card.peak.title': 'Peak Pricing', 'card.peak.window1': 'Morning 09:00–12:00', 'card.peak.window2': 'Afternoon 14:00–18:00',
    'widget.peak-pricing.name': 'Peak Pricing', 'widget.peak-pricing.desc': 'DeepSeek V4 peak pricing: whether now is a peak window (Beijing time, weekdays 09:00–12:00 & 14:00–18:00 are peak)',
    'badge.system': 'Built-in', 'badge.external': 'Market',
    specGen: 'dsh-widgets/widget-spec/v1 · per docs/workflow/03-specification.md (ARCH-002)',
    copyFailed: 'Copy failed — select and copy manually',
    toastDone: 'Done'
  };

  var dict = { zh: zh, en: en };
  var KEY = 'dsh-widgets-site-lang';

  function current() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (_) { /* ignore */ }
    return v === 'en' || v === 'zh' ? v : 'zh';
  }

  function t(key, vars) {
    var lang = current();
    var s = (dict[lang] && dict[lang][key]) || zh[key] || key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (_, k) {
        return vars[k] !== undefined ? String(vars[k]) : '{' + k + '}';
      });
    }
    return s;
  }

  function setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') lang = 'zh';
    try { localStorage.setItem(KEY, lang); } catch (_) { /* ignore */ }
    applyText();
    document.dispatchEvent(new CustomEvent('dsh:lang', { detail: { lang: lang } }));
  }

  function applyText() {
    var lang = current();
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.setAttribute('aria-label', t('langToggleAria'));
      toggle.textContent = lang === 'zh' ? 'EN' : '中';
    }
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    }
    var phs = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < phs.length; j++) {
      phs[j].setAttribute('placeholder', t(phs[j].getAttribute('data-i18n-ph')));
    }
    var arias = document.querySelectorAll('[data-i18n-aria]');
    for (var a = 0; a < arias.length; a++) {
      var key2 = arias[a].getAttribute('data-i18n-aria');
      if (key2) arias[a].setAttribute('aria-label', t(key2));
    }
    var toggles = document.querySelectorAll('[data-i18n-title]');
    for (var b = 0; b < toggles.length; b++) {
      var el2 = toggles[b];
      var tk = el2.getAttribute('data-i18n-title');
      if (tk) el2.setAttribute('title', t(tk));
    }
  }

  return {
    lang: current,
    t: t,
    setLang: setLang,
    applyText: applyText,
    dict: dict
  };
})();