# 变更日志

[`dsh-widgets`](https://github.com/Physicolor/dsh-widgets) 的全部重要变更，最新在前。功能发布记为 minor 版本号递增，纯修复发布记为 patch 递增；只 bump 过版本号、从未真正发布的版本不单独列出——它的改动并入真正发布它的那一版。

各类细节分别放在哪里：

| 层级 | 回答什么 | 位置 |
| --- | --- | --- |
| README | 插件是什么、如何安装、当前版本一览 | [`README.md`](README.md) · [`README.zh-CN.md`](README.zh-CN.md) |
| 本文件 | 每一次发布，逐条列出，并附每项改动背后的实测数据 | [`CHANGELOG.md`](CHANGELOG.md) · [`CHANGELOG.zh-CN.md`](CHANGELOG.zh-CN.md) |
| GitHub Releases | 同一条目作为 release notes，锚定到发布它的那次提交（tag） | 仓库 → Releases |
| `docs/` | 原始证据：CDP 探针脚本、截图、JSON 凭证、逐次事故的修复记录 | [`docs/`](docs/) |

## v1.6.0 — 组件栏服从对话正文排版宽度，并被右栏面板真正吞噬

> 本次发布包含上一版 README 中标记为「未发布」的全部内容——2026-09-13 与 2026-09-17 针对真实 GUI 实测的组件栏布局重写与测量/命中测试修复——外加两个已推到 GitHub 却从未发布的提交（`context-water` 的 2×2 槽位修复与官网设计审计重构）。这是第一个组件栏不再硬占 372 px，而是依据产品自身的对话正文排版宽度推导自身宽度的版本。

### 新增 — 组件栏依据产品自身的正文排版宽度自算尺寸

- **由预算推导的几何**。组件栏只能占用阅读排版宽度之外的剩余留白：`budget = 官方对话列宽 − 官方正文排版宽度 − 74px 盒内边距`。两个数都取自产品自己发布的变量（`--dsh-conversation-column-width`、`--dsh-chat-content-width`），存在时优先实时读取 `getBoundingClientRect`——产品是在列轨道过渡结束**之后**才写这两个变量，因此单次防抖读取可能锁存到动画中途的值（这正是曾经把预算算成 0、组件栏一直隐藏到用户改变窗口尺寸为止的原因）。
- **让步阶梯取代固定占位**。偏好布局 → 少一列 → 单列缩窄（侧边 ≥ 100px）→ 完全让位（`--dsx-rail-w: 0`，不渲染任何内容，用户偏好原封不动，窗口变宽后自动回来）。
- **组件栏不再挤压阅读列**。内缩规则去掉了 `!important`；由于占位是从排版宽度推算出来的，它永远不可能超过剩余留白，因此唯一可能的失败模式是收起——绝不会把正文压到产品 `clamp(680px, …, 920px)` 的下限之下。
- **页头胶囊报告同一状态**。没有空间时渲染 `data-space="tight"`（变暗、`aria-disabled`、`cursor: not-allowed`），而不是「能点开却空无一物」。
- **实测**（视口 → 组件栏 / 正文）：1578 → 372 / 748 px，1400 → 198 / 748 px，1280 → 154 / 748 px，1120 → 让位 / 664 px。这些正文宽度全部等于产品为对应列宽给出的排版宽度；改动之前组件栏硬占 372 px，把正文压到 554 px（1280）与 394 px（1120）。

### 变更 — 右栏面板现在吞掉组件栏，而不是让组件栏在旁边淡出

- **真正的问题在层级，不在不透明度**。用 `elementFromPoint` 在每个候选宿主里注入固定测试块做探测：在 `shell.overlay` 内测试块画在官方面板**之上**（z-20 对面板的 z-10），在对话子树内则画在**之下**。组件栏的宿主从 `shell.overlay` 迁到 `conversation.input.overlay`——官方为「驻留输入卡内部渲染的浮动条目」提供的 list 槽位——于是面板从右向左扫过组件栏、逐段把它遮住，正如抽屉被盖住一样。
- **钉住而非动画**。只要面板存在（正在打开、已打开或正在关闭），组件栏就通过一个变量 `--dsx-rail-right` 钉在视口右缘；没有面板时该值与对话列锚点解析结果相同，所以这次切换不可见。关闭时面板退走，组件栏逐段重新露出。同一变量也驱动放大浮层与设置抽屉，因此组件栏拥有的任何界面都不会滞留在面板之上。
- **面板是否存在按 `max(inline 目标值, 实测宽度)` 读取**。关闭动画的第一帧，frame 的 inline grid 目标值已经是 `0px`；若信它，组件栏会在仍被面板盖住时弹回原位。
- **轨道与占用方共用一条曲线**。正文内缩改用官方 `--ds-transition-duration-slow` / `--ds-ease-in-out` token，取代原先的 `0.2s ease`，与轨道自身动画一致——layout 包把「轨道与占用方共用一条曲线」列为不变量，而 0.2s/ease 与 0.3s 的轨道肉眼可见地不同步。输入框上方的 composer 覆盖层座位（其 `right` 相对滚动体的 padding box 定位，因此跟随组件栏宽度）同规则。
- **不可见界面不再吃掉指针事件**。`[data-yielded]`（因面板占据空间而淡出）与 `.dsx-stats-drawer[data-no-room]`（淡出且没有任何东西盖着它）现在都设置 `pointer-events: none`，因此变得透明的组件栏再也不会吞掉本该给正文、或给产品列宽拖拽带的悬停与点击。

### 变更 — 用 CSS anchor positioning 让组件栏原生跟随

- **组件栏搭上产品自己的布局流程**。`[data-phase='active']`（对话宿主——实测其盒与中列完全一致；带 hash 的 `_centerCol` 类保留为回退，仅在该接缝缺失时才被选中，因此永远只有一个元素持有该 anchor name）带上 `anchor-name: --dsx-center`，组件栏的 `right` 为 `anchor(--dsx-center right, var(--dsx-rightbar-w, var(--dsh-sidebar-width, 0px)))`。锚点解析发生在动画 shell `grid-template-columns` 轨道的同一次样式→布局过程中。逐帧实测：一整次开合过程中 `|中列右缘 − 组件栏右缘| = 0.00px`。
- **JS 跟随路径不再逐帧写 `:root` 变量**（逐帧写根变量会让整个文档的样式失效）；现在它只是不支持 anchor positioning 的浏览器的回退路径，并且只在动画结束后 200ms 写一次终值。
- **ResizeObserver 改为每次测量时惰性重绑**（`observeMeasured()`），幂等，且在 shell 重建节点后能自愈。旧 observer 是在 `apply()` 期间构造的——那时 Web UI 还没挂载自己的 frame——所以每个 `querySelector` 都返回 `null`，它实际观察了**零个**元素（浏览器内核实：页面上有 19 个存活的 `ResizeObserver`，没有一个观察 `[class$='_rightbarCol']`）。这就是组件栏过去在侧边栏 300ms 轨道动画期间纹丝不动、随后瞬间跳到位的原因。
- **与面板同起同落**。AppFrame 针对 `grid-template-columns` 的 `transitionrun` 加上 frame 的 inline grid 目标值，让组件栏能在动画第一帧就预测出最终列宽（observer 的首次投递要晚约 100ms），因此组件栏的让位与面板的推进走在同一拍上，而不是组件栏迟到。
- **boot 时不再播放进入动画**：当偏好为「展开」但会话尚不可知时，首帧滑动没有合法的锚点包含块（祖先带 transform），于是 `anchor()` 解析不出任何值，组件栏会先画在左缘约 2.6s 再跳到位。恢复的布局现在直接原地出现；用户主动展开仍有滑入动画。

### 修复 — 悬停组件栏会在每个指针帧重渲染整条组件栏

- **修复前实测**（有头 Edge，1600×900）：帧间隔 p50 12.5ms、p95 41.8ms、max 129ms，15 帧 > 26ms，2.6s 悬停期间 JS 耗时 598ms——而空闲基线是 4.2ms。**修复后**：p50 4.2ms、p95 8.3ms，1 帧 > 26ms，JS 193ms，即回到空闲基线。
- **根因**：放大波把焦点状态与静息 deck、组件列表、常驻的添加面板放在同一个组件里，于是每个指针帧都会重渲染每个组件的 `render()` 输出以及添加面板里的设置页。
- **修法**：放大波拆成独立的 `RailWave` 组件；deck 与添加面板由父组件构建，指针移动期间其元素身份保持稳定，React 得以整块跳过这些子树（每帧只有 overlay 的 7–15 个 slot div 需要 reconcile）。
- **修法**：放大副本改用围绕 `top-right` 原点的 `transform: scale()` 定尺寸，而不是 `width`/`height`——几何完全相同，逐 slot 核实过（可视宽度 == `baseW × scale`，右缘偏差 0），每帧成本转移到合成器。
- **修法**：静息 deck 改为通过 `.dsx-wave-deck.dsx-wave-on` 类淡出（卡片与添加按钮），而不是逐 slot 写 inline 不透明度，因此进入放大波不再重渲染 deck。

### 修复 — 针对真实 GUI 报告的三处症状（2026-09-17）

完整测量、原始凭证与探针脚本：[`docs/verify-report3/FIX-2026-09-17.md`](docs/verify-report3/FIX-2026-09-17.md)。

- **新建会话后组件栏仍画在 hero 上（5/5 复现）**。桥接层用 `useState` + 订阅 effect，而新会话的 `conversation.input.overlay` 条目挂载的时间窗，恰好是上一个会话的 `conversation.composer.dock` 卸载的时间窗——如果 `hasSession: false` 的 emit 落在「新条目已渲染」与「effect 已 flush」之间，新实例就永远看不到它，继续保持 `hasSession: true`（组件栏被画出来、`opacity: 1`、参与命中测试，而模块级订阅者早已移除了 `body.dsx-stats-active`——两个消费者互相矛盾）。桥接层现改为 `React.useSyncExternalStore`（订阅时重读快照，漏掉一次 emit 也不会让某个实例卡死），快照按每次 emit 重建（引用稳定），并且 `body.dsx-stats-no-session` 给整个抽屉设置 `visibility: hidden`，因此会话交接时立即隐藏（用户主动关闭仍有滑出动画）。实测：修复前 5/5 次运行都把组件栏留在页面上（观察至 6s，仍在拦截指针事件）；修复后 5/5 次在约 300ms 内变为不可交互、1.5s 内卸载。
- **轮次导航器在组件栏下消失**。产品用容器查询在正文滚动容器上隐藏自己的导航器（`@container (width <= 900px)`）——而那个盒子正是组件栏让位时被收窄的盒子。这是空间契约真实且已接受的代价：组件栏展开且视口 ≤1600px 时滚动容器掉到 900px 以下，DSH 就隐藏自己的导航器。要两者兼得（既保留 2 列组件栏、又让导航器始终可见）必须只收窄消息内容而不收窄滚动盒——那是一项结构性改动，本版本刻意没做。
- **悬停导航器会显示列宽调整光标并触发拖拽**。产品把不可见的 40px 列宽拖拽带画在 `z-index: 8`，导航器的 sticky 槽位是 `7`，因此两者重叠处拖拽带赢下命中测试——这在组件栏关闭时同样能复现，因为产品自己的 `CONTENT_EDGE_BUDGET`（每侧 176px）把那条 gutter 留给了拖拽带、而不是导航器。修复纠正的是顺序而非几何：`[data-conversation-scroll] :has(> nav[aria-label]) { z-index: 9 }`——按它包含的 `nav` 选择而不是带 hash 的类名，这样产品重新构建也无法悄悄丢掉这条规则。在重叠几何下验证（1600px 视口、1200px 正文）：悬停解析到导航器（`isNav: true`），点击不再触发宽度拖拽（`width-drag started=false`），组件栏自身尺寸不变（1440 → 198，1600 → 372，1760+ → 372）。

### 修复 — 小号文字不再继承正文排版，日期标签不再折行

- **排版**。组件栏现在住在对话子树里，于是继承了正文的 14px/24px；只声明 `font-size` 的卡片规则（10–11px 的灰色 legend、日期标签）因此拿到 24px 行盒，把卡片文字高度撑开。`.dsx-stats-rail` 现在钉死应用级排版（`16px` / `line-height: normal`，两者都在 app root 上实测得到）；自带 line-height 的卡片规则仍然胜出。
- **`heatmap-bars` 日期标签**。「9.11」在 9px 字号下宽 17px，而 7 列布局每列只有约 14px，因此首/末日期折成两行、把柱子顶上去并溢出 150px 卡片（第二行被卡片的 `overflow: hidden` 裁掉）。带标签的列、折线图的角落标签、热度图的角落日期现在都显式带上 `white-space: nowrap`；带标签的列就是最外侧两列，因此约 3px 的溢出左右对称，仍留在卡片内边距里。对真实 DOM 验证：17×10px 单行（此前为 14×15/14×18px 两行），七个子标签 `scrollWidth == rect width == 17`，卡片高度回到 150px。

### 修复 — `context-water` 2×2 不再撑破 150px 槽位

- 分段图是唯一「图体为三行堆叠 legend」的图表，因此由它决定卡片尺寸。在（现已显式钉死的）`normal` 行高下，legend 行盒解析为 16px——每行 20px——于是柱条加行需要 85px，而槽位只剩 79px，卡片涨到约 155–156px 并压住下一行。
- legend 行现在显式带 `1.2` 行高（与字体栈无关），分段柱的底部间距从 10px 降到 6px（顶部间距保持 8px）。在 Edge 上经 CDP 实测：卡片 150px（此前 156px），图表 76.17px 对可用 79px。

### 修复 — bundle 重载后「组件」胶囊保持原位

- 页头工具列表中的位置只由 `order` 决定（注册顺序只在完全并列时才起作用），而 `dsh-better-sidebar` 把它的底部面板开关注册在 `order: 10`。同为 10 使两个条目并列，于是胶囊的位置取决于哪个 fiber 最后重新注册——一次 tsdown/HMR 重载或市场开关都会把它挤到那个开关之后、行的最右端。胶囊现在注册在 `order: 5`：在官方导出控件（0）与 in-app 打开（−10）右侧、在那个开关左侧，与加载顺序无关。

### 官网 — 从组件画廊到设计系统站点

展示站（`website/`，线上地址 <https://physicolor.github.io/dsh-widgets/>）不再是一个卡片画廊。完整说明：[`website/README.md`](website/README.md)。

- **设计哲学**，六条原则，每条都绑定一个真实组件与源码中的一个真实几何值。
- **DSH Widget Design Grammar**——真实常量（`cardSide 150`、`panelPadding 24`、`magnify 1.2`、`scale = unit/150`、`innerPad round(12*scale)`、`radius 16`、字号 `13/20/10`、底部间距 6、圆角 `8*scale`、`stepScale peak/r3/t^1.6`），外加一条交互式组件栏，运行插件自己的放大曲线与右锚定重排；滑杆就是产品自己的设置项。
- **Widget Anatomy**——一个按适配单位渲染的真实卡片，用实测 DOM 矩形标注内边距、圆角、字号阶梯、标题→内容的步进与操作区内缩（窄舞台上标注集合会精简）。
- **DSH Visual Audit**——13 条规则分两个显式层次：对渲染出的卡片用 `getBoundingClientRect` 做几何测量，以及声明的设计启发式，按 `round(100 * sum(w)/n)` 对全部 33 个组件打分，每个都在它发布时的尺寸下测量。例外清单报告真实发现（`context-water` +4px，`sys-gpu-line` +29px 与 `cc-credits` +33px 超出放大后的单位，`cc-window-monthly` 文案与实现不一致，`sys-board` 仅 2×4 的尺寸契约）。不声称任何美观度指标。
- **组件详情**——每个组件一个对话框，含两种尺寸变体、实测几何、规则结果与源码条目。
- **可发现性**——canonical、Open Graph、Twitter card 与一张生成的 OG 图；JSON-LD（`WebSite` + `SoftwareApplication` + 全部 33 个组件的 `ItemList`）；`robots.txt` + `sitemap.xml`；一个点出项目、DeepSeek Harness 与设计系统定位的标题/描述。画廊标记、`js/data.js` 与 `ItemList` 现在由 `website/gen-site.mjs` 从各 manifest 生成（`--check` 已接入 `verify`），因此组件名称/id/分类/尺寸/描述都出现在 HTML 源码里，供爬虫与无 JS 读者读取。临时的 `website/sync-data.mjs`（硬编码路径）已删除。
- **审计过程中发现的页面修复**——grid 轨道不再能被内容撑宽（一个 2×4 预览曾撑爆第 4 个画廊列，使每第 4 张卡片都比同行更宽），hero 字标不再比组件阵列更重，组件单位按自然尺寸预览。
- **验证**：80/80 项检查通过（静态、SEO 表面、可抓取性、grammar 数学、anatomy 测量、审计、对话框、i18n、响应式、控制台/网络），外加大节截图。

### 已知代价与前提（车主已接受）

- 组件栏在 ≤1600px 展开时，让位会把正文滚动容器推到产品的 `900px` 容器查询之下，因此 DSH 隐藏自己的轮次导航器（见上）。
- 组件栏的跟随策略优先使用官方 `data-phase` 接缝，回退到带 hash 的 `_centerCol` 类；未来若 shell 把两者都改名，就需要一个新的接缝。
- `body.dsx-hide-statsline` 仍然隐藏整个 composer-dock 席位，而不是官方 `stats` 条目；官方右栏被拖拽时，组件栏尚未抑制自身的过渡。

## v1.5.0

> 自 v1.4.1 以来的全部工作一次性发布：Command Code 账户用量组件族与 host 聚合路由、DeepSeek Harness 0.1.5 兼容与官方右栏适配、全新「额度管理」组件、每日用量数据新鲜度修复，以及告警呈现统一改为文字红闪。（本文件 v1.5.0 下的五个小节同属本版本：热度图权威口径、Command Code 三个批次的细节、GPU 利用率卡片高度修复。）

**新增 — 额度管理（2×2，Coding Plan 分组）：**

- 📊 **月窗口版式**：标题左侧、右上角是**月末用量预测百分比**，第二行是账期日期（`账期 10-10`），底部为「今日用量 / 今日推荐」两个数字（今日实测 token 与「剩余额度均摊到每天」的推荐上限）。
- 📈 **预测口径**：`已用% + 近期速率 × 剩余天数`，近期速率取**最近 3 个日当量**（前 2 个完整天 + 今天按已过比例折算，今天不足 6 小时不计入）。预测与今日推荐因此**数学同调**：预测 > 100% ⇔ 近期速率 > 今日推荐速率，不会出现「今天没超推荐、整月却显示超 100%」。
- 🔴 **超 100% 的表现**：数值本身变红并做 1.6s 呼吸闪烁（不再使用卡片四周的红色内晕）。
- 🧮 **额度换算**：余额（credits）按本账期已实现的「本地 token ÷ 消耗 credits」汇率折算为 token，与今日用量同口径；不使用 provider 侧 token 计数（同一账期两者相差约 1.7 倍）。
- 🚫 **不造数**：缺百分比/额度、账期已结束或不足 6 小时 → 显示「数据不足」；仅汇率侧缺失时今日推荐单独显示 `—`。
- 🧩 新增 `figures` 图表类型（一行「标签 + 数值」对，首块贴左、末块贴右，与标题行共用内边距）。

**修复 — 每日用量数据新鲜度：**

- ⚡ **今日数字随每一轮对话更新**：每日用量取自用量中心折叠会话日志得到的索引，而它按自身 ~30s 节奏重扫——此前一轮对话结束后卡片仍显示上一轮的数（实测同一时刻索引比独立日志折叠滞后约 0.4M）。现在客户端保留「逐 step 本地计数」，并对**今天**取 `max(索引, 本地)`（历史日永远用索引值：本地只见过本浏览器打开过的会话，绝不改写历史），每一步落定即刷新。
- 🔄 host 路由 `/api/widgets-usage-daily?refresh=1` 在每轮对话结束时让用量中心**立即重扫**（5s 节流 + try/catch，未安装用量中心时全程可选）。客户端改动刷新页面即生效；该参数属 host 代码，需重启 dsh web 后生效。

**修复 — Command Code 月窗口百分比口径：**

- 🧾 月窗口此前用 `已用 / (已用 + 剩余)` 作分母——那是一对互不相干的快照之和（$70 套餐实测 17.26 + 59.01 = 76.27），卡片读 22.6% 而官网读 ~16%。现改为 `(额度 − 剩余) / 额度`，额度按套餐表（GOAT = $70）取值；未知套餐回退到 API 自报的已用值。

**改动 — 告警统一为文字红闪：**

- 🔔 删除整套「卡片四周红色内晕」机制（`alert` 字段 + `.dsx-peak-alert` + keyframes）。峰谷定价的 **EXPENSIVE** 与额度管理的**超 100%** 改为数值本身使用 error 红并做 1.6s 不透明度呼吸（`prefers-reduced-motion` 下静止），卡片边框不再变化。

**排版 — 卡片标题行重构：**

- 📐 标题行改为**两个互相独立的 slot**（左标题、右数值）并顶对齐。此前标题与 20px 数值共享一条基线，行被撑高后 13px 标题被下推约 5px、比普通卡片低一截；现在右侧数值再用负 margin 抵消自身多出的行高，账期行因此紧贴标题。实测额度卡标题顶部与无右上角数值的普通卡一致（11px），`context-water@2×4` 行高回到 16px。

**官网 / 展示页：**

- 🌐 组件画廊补齐到 **33 个组件**（此前停留在 24，缺整族 8 个 Command Code 组件），新增 Command Code 与设备状态两个筛选，中文/英文文案同步；组件表改由 `website/sync-data.mjs` 从 manifest 生成，避免再次漂移。站点无头验证 44/44 通过。

**兼容性 — 适配 DeepSeek Harness 0.1.5 的会话快照拆分：**

- 🧩 **数据源迁移（不迁移就会静默失去全部卡片数据）**：0.1.5 把会话快照拆成两半——`useSession` 只留生命周期状态（`running` 等），聊天数据（`nodes` / `timeline` / `runningCalls`）改由新的 `useChat` 提供。composer dock 收集器此前用 `useSession(s => s.chat.legacy.nodes)` 取值；在 0.1.5 下该 selector 会在渲染期抛错，被 slot 错误边界捕获后整个 entry 退位，结果是**卡片全部拿不到数据、rail 因 `hasSession` 永不置位而消失**。现在收集器优先 `useChat`、回退 `useSession`，两条路径的 selector 都用可选链，任何一版缺失的切片都解析为 `undefined` 而不是抛错。
- 🔌 **类型与打包来源对齐官方**：`@deepseek-ai/dsh-client-runtime` 已在 0.1.5 退役，客户端上下文的类型来源改为 `@deepseek-ai/cordis` 的 `Context`；`package.json` 的 peer/devDependencies 与 `tsdown.config.ts` 的平台模块表同步移除该包。
- 🔍 **审计结论（未改代码）**：4 个 slot（`shell.overlay` / `conversation.composer.dock` / `conversation.session.header.utilities` / `settings.section`）、`register({name,id,order,label})` 选项、`__ModuleLoader__` 客户端 bundle 协议、5 个投影字段（`sessionStats` / `tokenUsage` / `contextPressure` / `contextBreakdown` / `todos`）、宿主 6 条自定路由与 `locale` 用法在 0.1.5 全部兼容；官方同槽统计行的 entry id 仍是 `stats`。
- ✅ **实测**：0.1.5-rc.2 隔离实例中 client bundle 与其余 62 个 entry 一同加载，无异常。
- 🧭 **官方右栏适配（2026-09-13 追加）**：0.1.5 的框架把右栏变成第三列 grid track（`[class$='_rightbarCol']`，由官方 `dsh-client-ui-sidebar-right` 占据），而 rail 原先锚定 `--dsh-sidebar-width`——该变量由 better-sidebar ≤0.14 提供，0.19 起它改走官方 `ctx.sidebarRight` 后不再发布，于是 rail 回退到 `right: 0` 直接压在官方右栏上。现在 rail 与「+ 添加」面板都锚定新的 `--dsx-rightbar-w`（测量 `_rightbarCol` 宽度写入，ResizeObserver 跟随官方右栏的开合/全屏/拖拽），旧变量保留为回退值，两种装配都能正常让位。
- 📌 已知待办：`body.dsx-hide-statsline` 目前隐藏整个 composer dock 槽的可见性，后续可收窄到官方 `stats` entry；官方右栏拖拽期间 rail 的过渡尚未跟随（官方用自身类名标记拖拽态）。

### 热度图 token 总量改由用量中心口径供给

> 修复：Token 用量热度图卡片的「窗口总量」与用量中心的总 Token 长期不一致。实测 2026-09-12，卡片显示 **7.72G**，真实值 **6.28G**（+23%）。

**Fix — 热度图日数据来源改为权威口径（复用 dsh-usage-center，不重复实现）：**

- 🔍 根因（三层，全部在 dsh-widgets 一侧）：① 旧版 `seedHeatmapIfNeeded` / 后来的 `HEATMAP_RECOVERED` 把**凭空写的常量**当历史播进 `localStorage`（2026-08-14/15/16 存的是 244.19M / 1639.55M / 1319.26M，日志真值 75.24M / 373.37M / 1204.72M）；② 迁移函数只「补零、不覆盖」，错误值永久留存；③ 逐步骤实时记账只在浏览器开着、且打开过该会话时才补记，闲日直接漏记（8/18 少 190.5M）。
- 🧮 仲裁证据：独立复算脚本 `docs/verify-token-total-independent.mjs` 直接解压 175 个 `session.jsonl.zstd`（多帧 zstd 逐帧解码，按 (turn,step) 取最后一次 usage 上报、四桶求和、本地时区归日）：**6,275,649,773**；用量中心 index 口径 **6,276,176,394**（差 0.01%）；旧热度图 **7,715,756,948**（+23%）。日粒度对比见 `docs/compare-token-accounts.mjs`。
- 🔗 修法（**不重写计算**）：host 新增 `/api/widgets-usage-daily`，在 dsh-usage-center 已安装时通过 Cordis 服务 `ctx.get('usageCenter')` 调用其 `getActivity()`（该方法已按会话日志折叠每日总量），把 `activity[].totalTokens` 原样转给浏览器；未安装/索引为空/服务抛错一律返回 `available:false`。`usageCenter` **不作为硬依赖**（`inject` 不变），dsh-widgets 仍可独立安装。
- 🖥 client：`state.usageDaily` 为**首选**日数据源（挂载 + 每回合结束 + 60s 轮询刷新），权威数据存在时**完全跳过**本地记账；缺失时回退到原有逐步骤记账。热度图与热度柱状图两张卡片共用该口径，卡片数值与用量中心逐日一致。
- 🧹 清理：删除烘焙历史常量与 `migrateHeatmapV2()`（含「只补零」的迁移陷阱），改为一次性 `loadHeatmapStore()`：清除旧版伪造的那 8 天（2026-08-14…08-21），**不动**任何真实累积日。回退路径宁可空、不留假数据。
- ✅ 验证：`docs/verify-usage-daily-route.mjs` 直接驱动**编译产物** `lib/index.js`，10 项断言全 PASS（服务在→原样透传、服务缺失→`available:false`、空 payload/抛错/半残行→降级不炸）。
- ⚠️ 需要重启 dsh web 才会加载新 host 路由（重启前该路由 404，卡片自动回落到旧记账，不报错）。

### Command Code 月窗口 + 三窗口数字组件 + 标题规范化

> 承接上一批：新增月用量、拆出 5h/周/月三个单窗口数字组件，并把卡片标题统一为短标题 + 灰色小字角色词。

**Feat — Command Code 窗口家族扩展：**

- 🌙 **月用量（新增）**：`billing/credits` 只提供 5h 与 weekly 两个硬 cap，**没有 monthly 窗口对象**，故月窗口按守恒推导：`已用 = usage.totalMonthlyCredits`（本期月度 credits 消耗）、`总额度 = 已用 + credits.monthlyCredits`（已用 + 剩余 = 套餐额度，实测 0.47 + 69.16 ≈ 69.63 ≈ $70 套餐），百分比 = 已用 / 总额度，重置时间取订阅账期结束 `currentPeriodEnd`。任一半缺失即降级占位，绝不编造数字。
- 🍩 **cc-windows 双环 → 三环**：5h / 周 / 月 三窗口环图（对齐 OpenCode rolling / weekly / monthly 三环形态）。
- 🔤 **环上数字独立性**：三环的百分比**不再带灰色「5h 窗口 / 周窗口 / 月窗口」小字标注**——环本身就是窗口三件套（顺序固定 5h → 周 → 月），数字单独站着；窗口名移到悬停 tooltip（与 OpenCode usage-rings 同一约定）。环上数字统一**保留一位小数**（如 1.8%、10.0%），不再四舍五入成整数。`WidgetChart.rings` 相应新增两个可选字段：`decimals`（精度，默认 0 整数，其它环图不受影响）与 `name`（仅 tooltip 用的名称）。
- 🔢 **新增 3 个单窗口数字组件**（对齐 OpenCode 单窗口卡片形态：一个大百分比 + 重置日期）：
  - `cc-window-5h`：5h 窗口用量百分比 + 重置日期；
  - `cc-window-weekly`：周窗口用量百分比 + 重置日期；
  - `cc-window-monthly`：月窗口（账期）用量百分比 + 账期结束日期。

**Polish — 卡片标题规范化（家族全体 8 个组件）：**

- 📏 产品名太长，标题一律固定为 `Command Code`，角色词改为标题下方**灰色小字 legend**：cc-whoami「账户」、cc-usage「用量」、cc-credits「额度」、cc-windows「窗口」、cc-subscription「套餐」、三个数字卡片「5h 窗口 / 周窗口 / 月窗口」。
- 🏷 市场/配置列表里的组件名同步缩短为角色词（账户 / 用量 / 额度 / 窗口 / 套餐 / 5h 窗口 / 周窗口 / 月窗口），分组名仍是 Command Code，不再重复长前缀。
- ✅ 验证：新增自包含探针 `docs/probe-cc-render.cjs`（编译真实渲染层 + 拉取真实账户数据跑 8 张卡）——**21 项断言全 PASS**：标题全为 `Command Code`、角色词落在 legend、cc-windows 三环且**环上无灰色标注**（label 为空、窗口名仅在 `name`/tooltip）、环值为一位小数、三张数字卡百分比均一位小数且有重置行、月口径 = 已用/(已用+剩余)。静态验证脚本 `docs/verify-commandcode.cjs` 扩到 8 个组件 + 共享标题键（20 项 PASS，含 live 200）。

### Command Code 组件家族 + 自动读取修复

> 承接上一条 Command Code 批次：修复组件显示「未配置 COMMANDCODE_API_KEY」的误导文案——key 完全由 host 自动读取，用户无需（也不应）手动填写任何东西。

**Fix — Command Code key 自动读取链路 + 组件状态文案：**

- 🔍 根因：组件显示「未配置」是因为 `/api/commandcode-usage` 的 host 路由尚未加载（dsh web 未重启 → 404），client 拉取失败后统一落到「未配置」文案——**与 key 无关**；`.credentials.yaml` 中的 `COMMANDCODE_API_KEY` 一直存在。
- 🧬 key 解析链路核实（credentials-local）：`resolve` 按 进程环境变量 → `$DSH_HOME/.credentials.yaml`(version+refs 布局) → `$DSH_HOME/.env` 三级自动读取，**永不进浏览器、无需在组件/设置里填写**。实测：env/.env 无此键，yaml 命中（tail WWna），四个 official endpoint 全部 200。
- 🩹 修复（两层）：
  1. **错误状态透传**：client 拉取 `/api/commandcode-usage` 时区分 404（host 未重启 → `unloaded`）/ 503（真没配 key → `unconfigured`）/ 网络失败（`unavailable`），存入 `stats.commandCodeError`；
  2. **文案准确化**：各组件的「未配置」改为按错误状态提示——「dsh web 未重启，等待 host 路由加载（重启后自动刷新）」/「未配置 COMMANDCODE_API_KEY — host 自动读取环境变量 / .credentials.yaml / .env，重启后自动生效」。
- ✅ 验证：`docs/verify-commandcode.cjs` 静态 13 项 PASS；live 404 属预期（重启后转 PASS 并自动留证）。

### Command Code 账户用量组件家族

> 本次为 Command Code 组件批次，独立于上方 GPU 高度修复（一并保留在 working tree）。新增 5 个 2×2 小组件，复用 OpenCode 用量组件的宿主代理模式。

**Feat — Command Code 账户用量组件家族（cc-whoami / cc-usage / cc-credits / cc-windows / cc-subscription）：**

- 🔌 **host 新路由 `/api/commandcode-usage`**：聚合四个 **official Command Code account endpoints**（`/alpha/whoami`、`/alpha/usage/summary`、`/alpha/billing/credits`、`/alpha/billing/subscriptions`），凭据经 `credentials.resolve('COMMANDCODE_API_KEY')`（与 OpenCode 同 seam，绝不落浏览器）；四个端点独立 fetch + 8s 超时 + 独立容错——任一失败仅该片断置 null，其余照常渲染。
- 🧩 **新增 5 个 2×2 组件**（group `commandcode`，共享渲染层 `src/client/lib/cc-view.ts`，防御式解析 null → `—`）：
  - `cc-whoami`：当前账户身份（用户名 / 邮箱 / 组织）；
  - `cc-usage`：请求数、成功率、Token 总量、消费（`$`）摘要；
  - `cc-credits`：Credits 余额（月度/免费/购买）+ 5h / 周两窗口用量条（颜色随水位 danger/warn/success）；
  - `cc-windows`：5h / 周两窗口用量环图（OpenCode usage-rings 同款三环风格，两环变体）；
  - `cc-subscription`：套餐（planId）、状态、账期结束时间、是否到期取消。
- 🎨 i18n：`_shared/locales.json` 增加 `badge.commandcode` / `group.commandcode` / `cc.*` 共 12 键 × 2 语言；市场分组显示「Command Code」。
- 🖼 预览数据：`PREVIEW_STATS` 增加 `commandCode` 模拟载荷，市场/配置预览非空白。
- ✅ 四个接口已在真实账户实测（whoami=Physicolor，plan=individual-goat，5h cap=14 / 周 cap=35，返回结构与文档一致）；构建通过（registry 29 组件，tsdown node 11.3kB / client 204.7kB）。

### GPU 利用率卡片高度修复

> 本地修复，尚未 bump 版本 / 发布。回滚基线：`git HEAD 2fdacf8`（v1.4.1），磁盘快照见 `docs/backup/2026-08-31-gpu-line-height/`。

**Fix — sys-gpu-line 2×2 悬浮时卡片高度异常（≈176px）：**

- 🐛 根因：GPU 利用率卡片的**内容固有高度 ≈178px**（左下大数字 + sub + 固定 68px sparkline + 标题行），超出 2×2 卡片的 150px 盒子——卡片自身只有 `minHeight`，高度由内容决定，静止时即撑破 slot 28px；悬浮放大（magnify 1.25）时更糟（overlay 卡片 212px vs slot 186px），视觉上就是「悬浮后卡片莫名变高到 176 左右」。
- 🩹 修复（两层）：
  1. **弹性 sparkline**：line 图表改为 `flex:1` + `height:100%` 弹性容器，卡片在 `stretchChart`（仅 line 图表卡）时固定 `height: unit`，sparkline 吃满剩余空间——内容永不超出盒子，任意 cardSide / 悬浮放大倍数都自适配。
  2. `stretchChart` 声明位置修正（TDZ）：`body.push` 立即求值，声明必须 precede 于使用（首次构建因声明后置报 `Cannot access 'stretchChart' before initialization`，已修正并复验）。
- ✅ 实测（真实 3080 页面 + playwright，`docs/probe-gpu-height.cjs`，本机 cardSide=150 / magnify=1.25 / realtime）：
  - 静止：GPU 卡 slot 150 = card 150（修复前 card 178）；其它 10+ 张卡均 150。
  - 悬浮：overlay slot 186 = card 186（修复前 card 212）；扫掠衰减 185→177 平滑，移出熄灭。
  - 设置页配置预览（CardBody 同路径）：150×150（修复前 234）。
  - `CONSOLE_ERRORS: []`，`verify-*` 回归不受影响（未改 chart 其它分支与注册契约）。
- 📝 已知边角：`上下文已用`（context-water）静止 cardH=156（超出 6px，内容少、不破坏视觉，非本次报告项）；line 分支注释同步更新。

## v1.4.1

> 本次发布包含整棵工作树：**系统监控组件族**（下）、**侧栏抽屉动画**、**用量一位小数修复**（此前未发布的 v1.4.2 / v1.5.0 工作记录）。

**系统监控组件族（本机设备信息）：**

- 🖥️ **新增 5 个设备信息组件**（市场「设备状态」分组——与 DeepSeek Harness 自身的「系统」分组区分）与 host 路由 `/api/sysinfo`（CPU 利用率 = 两次轮询间 `os.cpus()` 增量采样、内存 = `os.totalmem/freemem`、GPU = 单次 `nvidia-smi` 查询，~1 秒缓存 + 120 点采样历史）：`sys-cpu`（CPU 利用率大数字 + 内存占用行）、`sys-gpu`（显存大数字 + 利用率/温度，不显示型号，大数值保持左下角）、`sys-rings`（CPU/GPU 利用率双环形图）、`sys-board`（2×4 综合看板：CPU/内存/GPU 利用率/显存四环 + 标题行右端 GPU 短型号与温度，无 0/0 GB 冗余行，环下数值与名称同行如「43% CPU」）、`sys-gpu-line`（GPU 利用率折线：Windows 任务管理器风格面积折线，底角首尾时间标签；**采样窗口 10–30 点可选、默认 20**（组件配置下拉），只画最近 N 点避免折线无限压缩；client 侧自积累历史回退——旧 host 也能画线，host 重启后自动切回长历史）。共享逻辑收在 `src/client/lib/sys-view.ts`。
- ⏱️ **每组件可设刷新间隔**（组件配置）：5 / 10 / 30 / 60 秒预设 + 自定义秒数，默认 10 秒；collector 按已装 sys-* 实例的**最短间隔**轮询（钳制 5–60 秒），host 侧 ~1 秒缓存保证同一时刻多个组件只 spawn 一次 `nvidia-smi`。
- 🚫 **CPU 温度刻意不做**（先调研后舍弃）：Windows 无免特权稳定 CPU 温度源（WMI 热区在多数主板不可用——本机已实测读不到；LibreHardwareMonitor 属外部运行时依赖）。GPU 温度经 `nvidia-smi` 开箱即用；无 NVIDIA GPU 时组件优雅降级（「未检测到 NVIDIA GPU」）。
- 🔄 **sys-gpu / sys-cpu 大数字切换**：整卡点击循环（GPU：显存 → 温度 → 利用率；CPU：利用率 → 内存），组件配置下拉「大数值显示」同步；`cycle.store` 字段使系统组件的循环与用量池视图互不干扰。
- 🎨 排版：用量环图环下仅百分比（不再显示 滚动/周/月 文字）；环形图环与下方文字 4px 间距（柱状图节奏）；折线图与底角时间标签 3px 间距。
- 🛡️ **P1 崩溃修复**：usage 窗口裸访问（`u.rolling.percent`）遇畸形负载即抛错、整条 rail 消失——现已双层防护（窗口级 `winPct()` 降级 + 每卡渲染 try/catch 隔离），任何单卡异常不再隐藏其他组件。
- ✅ 新增自包含验证：`docs/verify-sysinfo.mjs`（host 路由形状/缓存/增量/历史，12 项）、`docs/verify-usage-guard.mjs`（崩溃防线回归，5 项）、`docs/probe-sysinfo-live.cjs`（运行中服务探测）。

## v1.4.0（项目官网 — 首个公开发布版）

- **以 v1.4.0 发布** — `dsh-widgets@1.4.0` 已上线 GitHub 与 npm；项目官网经 GitHub Pages 公开于 `https://physicolor.github.io/dsh-widgets/`。插件代码零改动，本次 bump 只为发布官网。
- **项目官网 / 组件展示页** 新增于 [`website/`](website/) — 单页静态站（HTML + CSS + 原生 JS，无框架）：hero 为 3 行组件栏动画，一行 copy 即用的安装终端，**全部 19 个真实组件**的画廊（按 5 个真实分组筛选），设计哲学的正反例对比，「如何创建组件」五步指南 + 从需求表单生成组件规格，以及简洁的贡献说明区（带文档/issue 链接）。
- **自包含验证** [`website/verify.mjs`](website/verify.mjs)：JS/CSS/HTML 语法检查 + Edge 无头 CDP 渲染 — 桌面（1440/1920）、平板、手机视口共 44/44 项全绿，覆盖默认浅色主题、默认中文、zh↔EN 全站切换、深色主题持久化、真实组件 token 校验、i18n 键完整性、液态玻璃光泽、控制台/网络监控。
- **组件预览就是组件真实渲染** — `previews.js` 1:1 移植了插件自己的 `PREVIEW_STATS`、`format.ts` 辅助函数、逐单位 `render()`，以及 `CardBody` / `ChartBlock` 的缩放公式；配色是取自真实 UI 的 DSH token（浅色 `deepseek-500` / 深色 `deepseek-400`）。不臆造设计系统，也不碰插件代码。
- **Hero = 约 1150px 的首屏**：左侧叙事列（标题 / 中英双语描述 / CTA / 统计），右侧为真实组件阵列（沿用插件网格规则：`cardSide 150`、`panelPadding 24`、2 列组件栏宽 372px、2×4 宽卡 = 324px）；安装终端作为 hero 的页脚。
- **液态玻璃导航** — 真实折射 + 光泽：`backdrop-filter` blur+saturate + 斜向高光（`::before`）+ 缓慢漂移的光带（`::after`，`nav-sheen` 11s）。只有装饰层在动，文字与图标保持稳定。
- **Playground 与 Demo 已移除** — 官网现为五个区块（Hero、Widgets、Design、Create、Contribute）；所有组件展示统一走 `DASH_PREVIEWS.render()` 适配器，「模拟」标签不再存在。
- **完整中英双语** — 首次访问默认中文 + 浅色；导航切换经单一字典（`i18n.js`）整站换语言。深色保持按需开启并持久化。
- **Hero 统计数字**改用 HarmonyOS Sans（非等宽）；保留 `tabular-nums` 以便对齐。
- **页脚精简**为单行（仅品牌 + 链接）。
- **Bug 修复**：usage-bars 图表标签（x 轴）不再溢出图表容器 — 图表外层改为按内容定尺寸，与真实 `ChartBlock` 一致。
- 插件代码零改动 — 无构建/注册表影响。


## v1.3.3（插件 — OpenCode 用量实时刷新）

- 🔄 **OpenCode 用量不再「仅挂载拉一次」**：用量组件族（用量对比 / 环形 / 滚动 / 每周 / 每月）此前只在 collector 挂载时 fetch 一次，而 `conversation.composer.dock` 在会话间被组件复用——刷新或新建会话才会重新挂载，导致继续对话/切换会话后用量停留在旧值。现在 collector 在**每次对话完成（`running` true → false）时重新拉取** `/api/opencode-usage` 与 `/api/opencode-usage-multi`（多 Key 池），回合结束后配额扣减即时上卡，无需刷新；进行中的回合不会重复请求。

## v1.3.0
**架构 — 组件单元化 + 构建期发现（ARCH-001：组件单元化、契约、低冲突注册表、多 agent 隔离）：**

- **每个组件都是一个独立单元**，位于 `src/widgets/<id>/`（`manifest.json` + `index.ts`）。旧的单体文件 `src/client/widgets.ts`（全部 19 个组件 + 全部渲染 + 手工维护的 `WIDGETS` 数组）已删除；组件文案从共享的 `i18n.ts` 字典移入各单元自己的 manifest。
- **注册表改为生成、不再手改**：`scripts/gen-registry.mjs` 在构建期扫描各单元目录，生成 `src/client/generated.registry.ts`（`WIDGETS` / `ALL_IDS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / 合并后的 `WIDGET_LOCALES`），并做三方 id 一致性校验（目录名 === manifest.id === index.ts 里的 id 字面量）。`pnpm build` 会先重新生成；注册表过期时 `pnpm check:registry`（以及 `pnpm check`）会显著失败。
- **并行 agent 安全**：创建组件 A 永远不需要改组件 B 的文件或任何中心注册表 — 一个 worker 只动自己的单元目录，注册在构建时自动完成。已用两个并发 worker agent 创建 TEST-A/TEST-B 单元做端到端验证（并行创建测试，验证后即删除两个单元）。
- **共享层拆分**（`src/client/lib/`）：`contract.ts`（组件契约 + 解析器）、`format.ts`（纯格式化器 / 网格构造）、`usage-view.ts`（OpenCode 用量族渲染）、`heatmap-accounting.ts`（热度图自记账，原样搬出 shell 入口）。
- **逐组件 i18n**：组件文案存放在各单元的 `manifest.json` 中（用量族文案统一放在 `src/widgets/_shared/locales.json`）；shell 字典只保留 shell 自身 UI 文案。合并与注册在 apply() 时通过 `WIDGET_LOCALES` 完成。
- **预览模拟数据（Example）归组件自己所有**：过去硬编码在 `components.tsx` 里的市场/配置预览特殊逻辑（热度图窗口对齐网格、寄语占位符、峰谷定价模拟基准）现在写在各单元的 `example` 字段里，由 shell 通用套用。带自定义预览数据的新组件不再需要动共享代码。
- **模板**：`src/widgets-template/` 存放骨架与契约指南；它在物理上位于发现根目录之外，因此模板永远不会被注册。
- **逐组件 CSS 现在安全**：`tsdown` 的 CSS-module tag id 改用相对 src 的路径，而不再是裸文件名（两个都发布 `index.module.css` 的单元不再碰撞）。
- **市场分组名改为字典驱动**（`group.<group-id>`，回退到组件名），不再是硬编码映射表。


## v1.2.3
**性能 — 右面板开合动画掉帧修复（与 dsh-better-sidebar / dsh-ui-harmonizer 协同）：**

- 🧊 rail 与放大 overlay 的侧移从 `right` 属性动画改为**合成器 transform 平移**（`translateX(calc(var(--dsh-sidebar-width) * -1))`，`right:0`）：better-sidebar 面板开合时 rail 整树在合成层平移，卡片/热力图零逐帧 reflow；之前 `transition: right` 每帧重排整个 rail 子树，与对话列的 margin 动画叠加后随对话 DOM 规模掉帧，且两过渡相互不同步。
- 🗑️ 移除卡片 slot 常驻 `will-change: top,width,height`：此前两套 deck（静态+放大层）× N 张卡片全部常驻独立合成层，膨胀 GPU 内存与每帧合成成本；短 tween 由浏览器自动提升层，无需常驻。
- ✂️ 放大 overlay 卡片体改为**仅在真正放大时渲染**（slot div 常驻保持几何 tween 无缝）：静息时 rail 常驻 DOM 减半（热力图等重组件不再双份渲染）。
- 🔗 与 dsh-better-sidebar / dsh-ui-harmonizer 保持同变量同 duration/easing（`--dsh-sidebar-width` + `--ds-transition-duration-slow` + `--ds-ease-in-out`）；拖动（`body[data-dsh-sidebar-dragging]`）仍即时跟随；`prefers-reduced-motion` 关闭过渡。

**掉帧数值对比（playwright + 本机 Edge 实测，better-sidebar 右面板开合动画窗口）：**

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 重会话动画掉帧率（帧间隔 >26ms 占比） | 20–31% | ≈ 0–1.4%（rail 开/关/禁用动画三者无差异，即噪声） |
| 主线程长任务 | 每动画多达数个、单次 60–210ms | 0 |
| 组件栏开启 vs 关闭之差 | 明显（打开即卡） | 无差异（开启 = 零额外成本） |
| 滑动路径 | `right`/`margin` 逐帧 layout（全树 reflow） | transform 合成平移（合成器） |
| 常驻合成层 | 每卡片 × 双层 deck 全部常驻 | 0（tween 自动提升、结束即释放） |

→ 组件栏开启引入的掉帧从「每动画丢约 1/3 帧 + 数百 ms 长任务」**降到 0**：组件常开下开关右面板与关闭组件时同样丝滑（典型会话全程 60fps）。重会话（数千 DOM 节点）下对话列宽度过渡仍约 ~10% 掉帧——与组件无关（关闭组件同样存在、属 UI 协调层），已列入 Roadmap。

- ✔️ 自包含验证 `scripts/verify-sidebar-anim.cjs`（playwright-core + 本机 Edge，连 3080）：rail `transition-property=transform`；面板开合后 rail 右缘 = 视口宽 − 面板宽；消融测试——禁用 rail / 对话列动画后掉帧 1.4% / 0.6%，证明 rail 侧贡献已归零。

**新增 — 多 Key 用量联动（配合 dsh-multikey-pool）：**

- 🔑 新 host 端点 `/api/opencode-usage-multi`：解析全部池内 Key（`OPENCODE_GO_API_KEY` 主 + `OPENCODE_GO_POOL_2..9` 备用）逐把拉取用量，并计算「共同用量」total（滚动/周/月各窗口按可用 Key 数量比例取平均，状态与重置跟随用量最高的一把）。
- 🔄 用量环图 / 用量对比 / 滚动用量 / 每周用量 / 每月用量组件支持**单击整卡循环切换视图**：总 Key → Key 1 → Key 2 → … → 总 Key；当前视图以 legend 形式写在大标题正下方（「总 Key」「Key 1」「Key 2」……），切换选择经 `cardConfigs.<实例>.poolView` 持久化，跨刷新与跨浏览器保留。
- 🍩 按压弹性动画：可点击组件按下瞬间 scale(0.93) 快进慢出，松开以弹簧曲线回弹（`cubic-bezier(0.34,1.56,0.64,1)`），符合官方按钮手感；`prefers-reduced-motion` 不受影响。
- 🎯 点击与真实使用联动：切到 Key N 时同步通知多 Key 池把该 Key 设为主力（`/api/multikey` prefer），切回总 Key 自动解除手动优先——「看到的」就是「正在用的」。
- 🧩 单 Key 环境自动退化为原行为：池内只有主 Key 时组件照常显示主 Key 数据，不出现切换交互。

**新增 — 全面中英文适配（跟随 设置 → Language 即时切换，无需刷新）：**

- 🌐 接入官方 `locale` 服务（`ctx.get('locale')`）：全部 UI 文案改为字典驱动——设置页（组件配置/组件市场/组件设置）、右侧组件栏（卡片标题/数值/legend/角落按钮/添加钮/aria）、组件市场卡片、configSchema 表单、峰谷定价窗口、任务/上下文/寄语卡片、OpenCode 用量（总 Key/循环/重置）等均有英文译文；`locale` 服务缺席时自动回退内置 zh/en 字典（探测口径与官方一致：localStorage `dsh-language` → `<html lang>` → `navigator.language`）。
- 🔑 修复：`installLocale` 现在把 zh/en 字典**注册**进官方 `locale` 服务（`register(ns, locale, dict)`）再 `bind`——此前只 bind 未注册，界面会把字典 key 原文（如 `ui.capsule`、`card.contextWater.system`）直接显示出来；注册后按 active locale 正确取词，不再出现裸 key。
- ♻️ 常驻 UI（右侧栏、页头胶囊）订阅 `locale/change` 立即重渲染；设置页导航名「组件」改为 **label thunk**（`SlotLabel` 契约），语言切换后导航自动更新，无需重新注册。
- 📖 每个组件的名称/描述/徽标/预览切换标签支持中英双语；`WIDGETS` 的 name/desc/badgeLabel/simToggle/configSchema 改为 thunk，渲染时按当前语言取值。
- 🧩 零硬依赖：未装载 `locale` 服务的组合自动走内置字典，行为与之前一致。
- ✔️ 自包含验证 `docs/verify-i18n.mjs`（Node `--experimental-strip-types` 直接跑）：双语切换、无裸 key、卸载回退全绿。

## v1.2.2
**新增 — 峰谷定价组件：**

- ⏱️ 市场新增「峰谷定价」组件（仅 2×2）：实时显示当前是否处于 DeepSeek V4 高峰计费时段。时段硬编码为北京时间工作日的 **09:00–12:00** 与 **14:00–18:00**（对应官方 UTC 01:00–04:00 / 06:00–10:00），其余时间含周末均为低峰；自定义时段设置已列入 Roadmap。
- 💰 左下角大标签与缓存命中 / Tokens 组件同款字体字号与位置：高峰时段显示红色 **EXPENSIVE**，低峰显示 **CHEAP**。
- 🟥 高峰时整卡泛起呼吸式**红色内晕**（方案 B：四边向内晕染，中央内容保持清晰，非整块实填），节奏 2.2s、幅度克制，只传递"抓紧时间"的紧张感，不做任何点击引导；`prefers-reduced-motion` 用户得到静态稳定红晕。
- 🔵 标题下方两行时段字体与 Tokens 用量下方标签同款：当前所在时段行亮起品牌蓝并微微放大（10px→12px、500→600），另一行保持弱化。
- ⏲️ 新增 30s 常驻心跳：即使没有回合在跑，stats 也会定期重建，峰谷状态在窗口边界准时翻转（此前秒级刷新只在回合运行时存在）。

**新增 — OpenCode 用量环图组件：**

- 🍩 市场新增「用量环图」（usage-rings，OpenCode Go 分组）：滚动 / 周 / 月三个窗口各一个环形图并排展示，信息与「用量对比」柱状图等价、形式为圆环。
- ⭕ 环中心保持干净（不放文字），因此环条可以画得又粗又满（stroke 5px、环径最大化）；每个环的百分比以较大字号显示在环正下方，窗口名与精确值由悬停 title 提示（紧急度配色与柱状图一致：≥95 红、≥75 黄、其余绿）。环与环间距与卡片内边距一致（2×2 即 12px），与内边距同一节奏，环径随之收紧以保持三环并排；数字与环的间距略大于常规贴合（4px），便于后续 2×1 等宽卡排版沿用。
- 🧭 原「用量对比」柱状图保留不动，两种展示并存、皆可独立安装。

**变更 — OpenCode 用量对比柱状图改为符合数据可视化惯例的比例：**

- 📊 「用量对比」（usage-bars）三根柱子不再使用固定的 ~12px 宽度加 `space-around` 均分空隙。每根柱子的列改为弹性等分卡片宽度（与「用量柱状图」每日 Token 柱同一套弹性列布局），柱间间距统一为相同的 4px，每根柱子以所在列约 60% 的宽度渲染——2×2 卡片下约 24px，与 56px 柱高比例协调（100% 满宽的版本视觉上像贴在一起的色块）。
- 🟣 柱子四角全部改成 5px 圆角——没有底部轨道的情况下直角底显得过于尖锐。
- 📏 柱子上不贴数值（迷你图惯例——三根小柱上贴数字属于 chartjunk）；精确百分比在悬停时通过原生 title tooltip 呈现，同时柱后叠加极淡的 25/50/75% 虚线参考线，不悬停也能按四分之一刻度目测每根柱子的高度。

**改进 — 预览状态切换 + 下拉箭头深色修复：**

- 🖱️ 有状态的组件（现为「峰谷定价」）在「组件配置」与「组件市场」的预览里可直接**点击卡片切换状态**（高峰/低峰），不必等到真实时段即可预览 EXPENSIVE 红色内晕与 CHEAP 两种形态；预览区同步显示「点击卡片切换：高峰/低峰」提示（该能力通过 `simToggle` 描述符声明，后续有状态组件只需加一行）。
- 🔽 修复 `.dsx-select` 下拉箭头在深色模式下不显示/不随主题的问题：箭头 SVG 作为 background-image 时 `fill='currentColor'` 不会渲染（SVG 背景图在独立图像上下文解析，currentColor 无效），改为两套显式填充——浅色模式深灰、深色模式（`body[data-ds-dark-theme]`）近白。

**修复 — 深色模式下实心操作按钮文字重新可见：**

- 🌗 实心主按钮（`dsx-btn-primary`——「已添加 / 添加 / 查看详情」）、「组件」状态胶囊的按下态、以及组件卡片内的操作按钮（primary/danger 两类）此前都用 `var(--dsw-alias-brand-primary)` 作背景并硬编码白色文字；深色模式下品牌主色渲染为近白色，文字与背景同色、完全看不见。现统一改为：primary 用 `var(--dsw-alias-state-business-primary)`、danger 用 `var(--dsw-alias-state-error-primary)` 作背景——与官方 UI 实心操作按钮同一组 token，深浅两套主题下白字均清晰可读。

**修复 — Better Sidebar 右侧边栏开启时添加面板高度不再塌缩一半：**

- 📐 添加面板的 `bottom` 此前错误地跟随 `--dsh-sidebar-width`——那是 better-sidebar 用来把 `#root` 右推的**面板宽度**变量；右侧边栏一开（如 320px），bottom 被抬升整整一个面板宽度而 top 固定，可见高度直接减半，且与先开哪边无关。现改为锚定输入框底部留白（`--dsx-input-bottom`，本就是 rail 测量注释里声明的意图）——右侧偏移仍跟随侧栏，竖直偏移永不跟随。无头实测：侧栏关闭 / 320px / 480px 三种状态下面板高度完全一致（旧规则在 320px 时 886→566px）。

**修复 — 1 列布局下 2×4 组件正确屏蔽：**

- 🧱 1 列模式下 2×4 宽卡片（占两格）无处安放。现在 rail 会隐藏已安装的 2×4 实例（暂时屏蔽、非删除——切回 2/4 列原样恢复），并市场同步提示：2×4 条目标题加删除线、右侧显示黄色「1列不可用」胶囊、添加按钮禁用。
- 🧪 无头端到端实测：2 列下添加 heatmap@2×4（324px 宽槽）→ 切 1 列 → 标题划线 + 黄色胶囊 + 添加禁用 + rail 无宽槽（仅 150px）；结束后已还原用户状态。

## v1.2.1
**修复 — 页面关闭时把最后一次修改同步冲入 host 存储，组件状态在任何桌面壳、任何浏览器/设备下都不再丢失：**

- **根因**。组件配置双通道写入：`localStorage`（快速路径）+ 经 **400ms 防抖** PUT 到 `/api/widgets-state` 的 host 文件（权威、跨 origin）。防抖写入**没有关闭前 flush**：若窗口/标签在 400ms 窗口内（或 PUT 仍在途时）关闭，请求随页面一起被销毁。而采用「每次启动随机回环端口」的桌面壳（如 DSH Desktop 各版本）每次启动的 `localStorage` 都是全新 realm——这一记漏掉的 PUT 就意味着修改永久丢失，表现为「桌面端改完不保存」；固定的本地 web 端口（origin 稳定）则把同样的缺陷隐形掩盖。
- 💾 **关闭前 flush**。新增 `pagehide` 监听，页面开始销毁瞬间调用 `flushPendingState()`：把尚未到达 host 存储的状态用 `navigator.sendBeacon` 送出（页面销毁时浏览器仍会投递），并以 keepalive fetch 兜底；host 路由本就同时接受 PUT 与 POST，同一端点即可承载。改完立刻关闭，修改不再丢失——任何桌面壳、浏览器 origin、无痕模式、清除站点数据的会话都适用。
- 🛡️ 防抖 PUT 同步加 `keepalive: true`：已在途的写入同样能活过页面销毁。
- 🧪 无头浏览器对真实 host 存储做端到端实测：胶囊点击（真实 `setPrefs` → `saveState`）后**立即** `pagehide`（约 80ms，远在 400ms 防抖之内）→ 真实 beacon 发出；host 文件 `savedAt` 前进并等于 `localStorage`；防抖 fetch 不再重复触发；测试最后已还原用户的真实状态。

## v1.2.0
**修复**
- 🗓️ 热度图不再把昨天会话的整段累计误记进今天：fallback 锚点现在跟随按步记账的累计，且仅当活跃会话今天确实产生了 step 时才做差值记账（此前重开昨天的会话、或新建会话瞬间投影滞后，会把整段历史——如 106M——diff 进今天的格子）。
- 🌐 热度图按「记账时区」划分天（热度图卡片配置中新增，默认北京 UTC+8，即本地 08:00 才跨天）。选项：北京 (UTC+8) / 跟随系统 / UTC。此前按浏览器时钟，系统时区不是 UTC+8 时日界线会偏移 8 小时。
- 🧹 一次性清理：清除已被污染的今天格子，交由实时记账干净重建。
- 📊 用量柱状图改为「窗口内归一化」：柱高按**当前显示的 7 天窗口内**的最大值缩放（滚动与周对齐都生效），本周最大的一天总是达到满高、其余按比例——即使历史存在巨大 outliers（如 1.2G 的某天），近 7 天窗口也不会被压扁，图表保持饱满。

## v1.1.6
**修复 — 悬浮以卡片为锚点、添加按钮随波（含位置）、进出平滑**

- **触发以卡片为准（两种模式统一）**：只有指针真正悬浮在卡片上才触发；在卡片间空隙过渡时不熄灭，且**波峰继续跟随指针滑动**（离散模式量化到格点，跨空隙移动依然变化；实时模式每帧跟随）；只有离开组件区域才停止。
- **添加按钮随波且位置一起动**：它的摆放位置从放大后的行布局重算——上方卡片变高时它随放大后的 deck 底部/最后行空隙一起下移，并在该位置按同一钟形曲线放大（此前只有尺寸缩放、位置钉在静息网格）。
- **最右侧恒对齐、间距恒一致**：悬浮层卡片的位置（top/right）全程即时；无极（realtime）跟随期**尺寸过渡整段禁用**——每帧直接落稳态 right 贴齐几何，快速移动也不会停留在非稳态中间姿态（这正是历史上右缘漂移与组件间距不一的根因）。进入/退出阶段（以及离散模式的格点滑动，其目标以格点频率变化）保留 0.15s 宽高补间实现平滑放大/缩小。
- **进出平滑无闪烁**：悬浮层常驻（透明隐藏），进入/退出放大由 CSS 尺寸过渡完成而非"挂载即目标大小"；退出同样平滑缩回静息尺寸。
- 🧪 无头浏览器实测（playwright，两种模式）：可见性按"卡片-空隙-离开"规则翻转；悬浮层最右缘与静息最右缘严格一致（diff 0）；空隙移动波峰持续变化；添加按钮随波下移（702→753px）并放大到 166px；控制台零错误。
- 🧰 **市场/配置重构——只添加、无安装/卸载分区**：所有组件本就随包内置，市场不再有"下载/卸载"：进入分组后选择具体组件，用**左右箭头**切换尺寸（不再用下拉——如 Coding Plan 的热度图/柱状图即以此切换 2×2 ↔ 2×4），点「添加」直接把 `组件@尺寸` 加进组件栏（已添加的实例显示禁用的「已添加」）。组件配置页删除了「已卸载（点击恢复或拖回上方）」区域：移除某行即彻底删除该实例（installed+order+其配置一并清除）。市场分组为**系统**（全部内置组件）、**OpenCode Go**（滚动/每周/每月用量）、**Coding Plan 用量**（热度图+柱状图）、**其它**（今日寄语，暂放、以后再分类）。
- 🧩 **市场卡片**：第一行类型名（粗体）+ 组件数量（胶囊徽章），第二行组件描述，第三行动作——不再显示 id 行。
- 🧮 **每种尺寸都是独立的市场条目**：多尺寸组件（热度图 2×2/2×4、上下文水位 2×2/2×4 等）直接作为独立组件选择——第一个 2×2、第二个 2×4——不再有右上角尺寸切换；计数徽章统计的是实例数而非组件数。
- 🎨 **预览与真实渲染同源**：预览热度图走与实时收集器相同的 `buildRollingGrid` 路径（7 行×13 列——旧预览把网格转置了，宽高画反），2×2 预览恢复正方形；今日寄语预览注入示例文本（仅预览、不落盘），不再空白。**所有预览均填充具体数值，绝不空白。**
- 📐 **2×4 预览缩放适配**：宽卡片以 `scale(0.85)` 在固定宽度舞台内居中预览，右侧按钮完整可见，左右切换按钮位置不再被顶走。
- 🗂️ **配置预览善用剩余空间**：选中组件的预览占满标题下方的剩余高度（标题固定在**左上角**，多余空间自动成为上下留白）；预览尺寸改为**标题右侧的下拉选择器**，样式与「窗口对齐方式」字段完全一致。
- 🙈 **文字条开关只隐藏文字**：开启后官方统计条的位置与布局原样保留，仅把文字变为透明——与你手动"只隐藏文字"的效果一致；关闭则正常显示。
- 📊 **用量柱状图按周对齐**：窗口对齐方式改为 滚动(最近7天) / **每周对齐**（本周日起的 7 天），不再是误放的季度对齐。
- ✅ **任务组件不消失**：无任务数据时显示 **暂无任务 · 0 进行中 · 0 待办**，卡片始终保留。
- ✂️ 去掉配置预览里「自定义」区块上方的分隔线。
- 🔧 **修复「组件」胶囊按钮样式丢失**：CSS 文件头部带 UTF-8 BOM，构建时 BOM 残留混进了首条规则的选择器（`.dsx-stats-capsule{…}` 前多出乱码前缀），导致胶囊基础样式（圆角/内边距/背景/高度）整条失效。已把文件重写为无 BOM 的 UTF-8，实测胶囊恢复 `border-radius:14px / height:28px / 背景 / 内边距 / 1px 边框`。
- 📐 **修复 4 列下添加按钮与卡片重叠**：行带打包把最后一行的空隙留在行**首**（右贴排列所致），但添加按钮此前以**最后一项**为锚——4 列左排满的行会把按钮塞进该行自身的卡片区域。现改为以行内**最左卡**为锚，且仅当剩余空隙宽于按钮时才停靠空隙，否则放到底部。空隙判定使用**静态宽度**——悬浮放大（会加宽该行卡片）不会再把按钮甩到放大区底部右侧，它始终停在空隙位并随行滑动。
- 🏠 **全新安装只预装文字条同款组件**（轮次·步数 / LLM 时长 / 工具调用 / 首 token 平均 / 速率 / 缓存命中 / Tokens，即官方输入框下方统计条那一组）；其余一律由市场按需添加。**已有用户的布置按设计原样保留、绝不重置。**
- 🙈 **新增个人偏好开关**（组件设置）：「隐藏输入框下方文字条」可隐藏输入框下方的官方统计条（组件栏可看同类信息）。默认关闭，留给其他用户保留文字条的选择权。
- 💬 **今日寄语未填写文本时不渲染任何内容**（去掉原先每次渲染轮换的默认文案），并暂归入「其它」分组。
- ⚠️ "已达上限"提示改为**悬浮居中 pill**，不占布局高度。
- 🧪 **升级保鲜回归**（`docs/state-fidelity.cjs`）：旧版手工布置（自定义 installed/order/cardSide/寄语文本、无新字段）加载后全部原样保留——不重置、不塞回默认，`hideStatsLine` 默认补 false；寄语无文本时零卡渲染。测试脚本会先快照 host 真实状态、结束恢复，**绝不触碰用户的已保存布置**。

## v1.1.5
**修复 — 组件状态重启后不再复位（根因：此前只存在浏览器 localStorage）**

- 组件配置（已安装 / 排序 / 各卡片自定义 / 尺寸 / 面板与放大设置）此前**只**存在每个浏览器的 `localStorage`——按 origin 隔离的浏览器级缓存。一旦浏览器 origin 变化（`localhost:3080` 与 `127.0.0.1:3080` 就是两个不同 origin）、处于无痕模式或站点数据被清、或某次写入被静默吞掉（旧 `saveState` 吞异常），配置就悄悄回到默认；而且它**永远不会跟随到另一台设备**——那台设备的浏览器里根本没有这份状态。
- ⚙️ Host 半新增 `/api/widgets-state` 路由：组件栏状态**原子写入**（临时文件 + rename）profile 数据目录下的 `profiles/web/dsh-widgets-state.json`——每台 DSH 服务一份权威副本，凡是访问到这台服务的任意浏览器/地址都共享它。
- 🔄 启动时客户端与 host 存储同步：localStorage 与 host 文件谁带的 `savedAt` 更新就听谁的，任意 origin/浏览器都会收敛到最后一次保存的配置而不是复位；每次修改双写（localStorage 即时、host 走 400ms 防抖的 PUT）。
- 🖥️ **跨标签页 + 可见性重同步**：同源多标签页里任一页保存会通过 `storage` 事件让其他页即时重读配置；切回某个标签页时重新拉取 host 存储——多开（含 localhost 与 127.0.0.1 并存）也能实时收敛，而非只在下一次启动时统一。
- 💾 既有 `harness-widgets.*` localStorage 键原样保留；Token 用量热度图账本仍按浏览器本地（它是高频记账数据），而 UI 配置从此设备级稳定。设备间按设计保持独立：每台运行自己 DSH 服务的机器各存各的状态文件（不做云同步）。
- 🧪 路由/请求体处理复用 OpenCode 代理已验证的同款写法，不引入未经验证的新契约。

## v1.1.4
**元信息 — 包改名 `dsh-widgets`**
- 📦 npm 包名 `harness-widgets` → `dsh-widgets`（符合生态 dsh- 前缀与 npm 搜索习惯），旧包已废弃并指向新包。
- 🔀 GitHub 仓库 `Physicolor/harness-widgets` → `Physicolor/dsh-widgets`（旧地址自动跳转，star/fork/issue 保留）。
- ♻️ 安装命令更新为 `dsh plugin --profile web add dsh-widgets`。
- 💾 无数据影响：localStorage 键（`harness-widgets.*`）不变，热度图与组件状态无缝迁移。

## v1.1.3
**元信息**
- 🏷️ 补充 npm `keywords`（deepseek-harness / dsh / cordis / plugin / web-ui / widgets / dashboard / heatmap），便于 npm 搜索；无代码改动。
- 🪧 GitHub topics 扩充（deepseek-harness, cordis, cordis-plugin, browser-extension, web-ui, widgets, dashboard, heatmap）。

## v1.1.2
**修复**
- 🔢 Token 用量热度图**按每个 assistant 步骤的开始时间精确入账**（v2），对不含逐节点 `usage` 的宿主自动回退「累计锚点」。某一天的格子 = 当天（本地时区）开始的所有步骤 token 总和——跨过零点的会话被正确拆到各自日期；步骤以 `turn:step:start` 去重，重挂载/会话切换/压缩重写幂等。
- 🧹 **启动即修复**：一次性清除被污染的活跃日数值（8/22 曾因固定种子与实时记账叠加显示 145M–181M）并重置去重集，让实时路径精确重建当天；标记保证只执行一次，此后实时值永不被清。
- 📚 **非活跃过去日（8/14–8/21：74.32M/367.79M/1195.70M/161.49M/292.34M/352.36M/214.85M/44.55M）** 从权威会话日志（官方差量算法、本地时间归属）回填——这些会话已结束，绝不会双计。**8/22 由实时记账累计**（约 114.87M 并随今日对话增长）。另有一次性恢复脚本 `docs/heatmap-recovery.js`。

## v1.1.1
**修复**
- 🔢 Token 用量热度图记账改为**按对话步骤精确入账**：每个 assistant 步骤只记一次，按其**开始时间**（`timing.stepStartTime`）归属日期——某一天的格子 = 当天开始的所有步骤 token 总和，告别「每日重置基线求累计差」导致的跨天误记（会话跨零点继续时会把昨天累计如 47M→117M 记进今天）。步骤以 `turn:step:start` 去重（重挂载、会话切换、压缩重写、跨天零点均正确）。对折叠表面不含逐节点 `usage` 的宿主，自动回退「累计锚点」方案——只在累计真正回落（新会话）时重建锚点，绝不在单纯换天时清零。
- ⚠️ 迁移曾把热度图表重建为仅保留演示种子（8/14–16），丢弃了其他日期的真实历史。迁移现改为**只保留 + 自动补回**：既有每日数值原样保留；**非活跃过去日（8/14–8/21，其会话已结束）**从权威会话日志按官方差量算法、按 usage 事件的**本地时间**归属回填（含 8/21 = 44.55M）。**活跃日（8/22）不播种**——由实时逐步骤记账累计，避免双计（旧版曾播种 8/22 导致 145M–181M）。一次性修复清除被污染的 8/21/8/22、重置去重集后重新回填 8/21，使 8/22 由实时累计精确重建。另有一次性恢复脚本 `docs/heatmap-recovery.js`。

## v1.1.0
**新增**
- 用量热度图支持 **2×4**：约 7 个月（30 周全滚动）网格，一次看到近半年的 Token 用量点，直接从原始日账本实时派生；网格水平居中，今日/窗口两个数字移到标题行右侧。
- 新增 **近 7 日柱状图** 组件（`heatmap-bars`，2×2）：最近 7 天垂直柱状；柱区高度与 2×2 日历图内容高度严格一致（柱子占据与日行相同的垂直空间）。

**调整**
- 柱状图横轴标签由星期改为短月日（如 `8.28`）；柱宽约 1.5 倍、圆角加大；图例为两个纯数字（今日用量 / 近 7 天用量，不带「今日/近7天」字样）；底部只标最左与最右两个日期（无 x 轴横线）。组件更名为**「用量柱状图」**（原「近7日柱状」）。
- 热度图图例去掉「今日」前缀（两个数字：今日用量 / 窗口总用量）；图表左下角与右下角分别标注窗口最早日期与今日日期。
- 2×4 热度图网格加宽（30 周）并水平居中，数字移至标题行右侧。
- 2×4 的 **Token 热度图**与**上下文水位**图表改为底部对齐（标题行右侧数字不再强制顶部对齐）。
- 组件栏顶部内边距 2px → 4px，首张卡片与 enhancer 圆角矩形顶部阴影保持间距；悬浮放大层同步。组件栏不再包含任何顶部栏规则——顶部栏的不透明矩形（遮挡组件栏顶端）由 harness-ui-enhancer 负责。

## v1.0.0
**新增**
- 设置 → 组件：新增「无极变化（连续跟随）」开关，开启后波峰每个动画帧跟随指针实时连续变化。
- 真正无极放大：每张卡片的缩放由它到指针的连续欧氏距离决定（取代离散最近卡片锚点），指针任意移动波峰均在卡片间平滑滑动。
- 离散模式复用同一套无极几何：把指针坐标量化到离散格点（行/列中心 + 相邻中点：行数→2·行数−1 个 Y 点、列数→2·列数−1 个 X 点），由 0.2s 补间在格点间平滑移动波峰；两种模式共享同一 right 贴齐姿态。

**修复**
- 悬浮放大不再撑宽 rail、不再把对话区往右推远（`--dsx-rail-w` 移除 overshoot）；放大组件向左溢出改由悬浮层绘制在 rail 滚动裁剪盒之外，不吸附、不被截断，resting rail 宽度与对话区距离保持不变。
- 悬浮层完整复刻 rail 盒模型（同 padding/box-sizing + 内层 deck），放大卡片与 resting rail 右侧垂线恒对齐，零额外命中测试成本。
- 放大时 rail 静态含添加按钮整体淡出，悬浮层在 resting 位置镜像添加按钮，悬浮中依然可见且右对齐。
- 无极模式每帧落稳态 right 对齐几何（`transition: none`）——原先的补间会让卡片在指针移动中停留在非稳态中间姿态，导致右缘越界、静止后才归位。离散模式保留 0.2s 收尾补间。

## v0.3.0
**新增**
- 多列网格布局：1 / 2 / 4 列可选（默认 2 列），支持悬浮放大。
- 2×4 长方形组件：上下文水位 2×4 版（右上角百分比 + 延展分段条）；同一组件可同时安装 2×2 与 2×4。
- 组件市场含系统组件 + 按实例（`组件@尺寸`）独立安装；已安装与预览均支持 2×2 ↔ 2×4 切换（自动去重）。
- 连续波峰动画：悬浮放大由离散阶梯改为连续指数衰减，随指针 X/Y 平面运动平滑响应。
- 无空隙排列（best-fit 打包），任意拖动顺序均不产生空洞。

**修复**
- 2×4 卡片高度错误地用宽度填充导致异常占空。
- 切换尺寸时不再重复添加，删除不再牵连同名同尺寸实例。
- 悬浮动画在水平切换峰值时上下行不响应。

## v0.2.2
- 修复今日用量跨天不重置（token 累计基准绑定日期，跨天自动清零）。

## v0.2.1
- 修复热度图数值暴涨（记账基线持久化，重挂载只计入真正新增量）。
- 修复种子升级不生效（强制覆盖，版本升至 .3）。

## v0.2.0
- macOS Dock 式悬浮放大（离散阶梯 + 布局换位）。
- 卡片级配置：今日寄语文字/对齐/换行、热度图窗口对齐方式。
- 新增部件：任务、一键压缩、上下文水位、用量热度图（自记账）、今日寄语。
- 品牌蓝标题、一键压缩按钮移至右下角。

## v0.1.1
- 部件栏背景透明、隐藏滚动条（跨浏览器）、取消上内边距。

## v0.1.0
- 右侧部件栏 + 7 个内置统计部件 + 3 个 OpenCode Go 用量部件；
- 设置 → 组件页（预览/安装/排序）；
- 进行中回合 LLM/工具时长每秒增量刷新。
