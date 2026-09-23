<p align="right"><a href="README.md">English</a> · <b>简体中文</b></p>

<p align="center">
  <img src="docs/icon/icon.svg" alt="dsh-widgets" width="104" height="104">
</p>

<h1 align="center">DeepSeek-Harness Widgets</h1>

<p align="center">
  <strong>为 DeepSeek Harness 打造的美观、可扩展的右侧组件系统。</strong><br>
  多列网格布局 · 2×4 长方形组件 · 连续波峰悬浮放大 · 组件市场与实例管理
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/dsh-widgets?style=flat&label=latest%20release&color=4D6BFE" alt="Latest release">
  <img src="https://img.shields.io/npm/dt/dsh-widgets?style=flat&label=total%20downloads&color=4D6BFE" alt="Total downloads">
  <a href="https://github.com/Physicolor/dsh-widgets/stargazers"><img src="https://img.shields.io/github/stars/Physicolor/dsh-widgets?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License">
  <img src="https://img.shields.io/badge/DSH%200.1.x-4493F8?style=flat-square" alt="Supported: DeepSeek Harness 0.1.x">
</p>

<p align="center">
  <img src="docs/screenshots/cover.png" alt="DeepSeek-Harness Widgets 预览" width="100%">
</p>

DeepSeek-Harness Widgets 是一个基于 Cordis 组合模型的 DeepSeek Harness **持久 bundle 插件**。它在会话页右侧提供一套可定制的多列组件栏——实时会话洞察、用量监控与快捷操作——并配有一套可扩展的声明式注册表。

## 官网 / Showcase

项目官网位于 [`website/`](website/)，线上地址 **https://physicolor.github.io/dsh-widgets/**，是一座**设计系统站点**：讲 dsh-widgets 是什么、为什么存在、全部 33 个真实组件，以及 **DSH Widget Design Grammar**（直接取自 `src/client/index.ts` 的真实单位/间距/放大公式，并带一条交互式组件栏跑插件自己的放大曲线与右对齐回流）、**Widget Anatomy**（一张真实卡片放大 ×2，每一处内边距、间距与内缩都从 DOM 实测标注）、**DSH Visual Audit**（13 条明示规则对全部 33 个组件按真实 `getBoundingClientRect` 测量打分——规则驱动，不是模型打分）、部件单元化架构、生产 Workflow，以及「需求表 → Widget Specification」生成器。站点为纯 HTML/CSS/JS，无构建步骤，所有路径都是相对路径（适配项目 Pages 的 base path）。`node website/verify.mjs` 自校验（静态 + SEO + Edge 无头浏览器检查，共 80 项）；组件表、静态画廊 markup 与 JSON-LD `ItemList` 由 `node website/gen-site.mjs` 从各 manifest 生成（`--check` 在漂移时报错）；`node website/gen-og.mjs` 重新生成社交分享图。部署方式见 `website/README.md`。

---

## 当前功能

### 多列网格布局

| 项目 | 说明 |
| --- | --- |
| 最多列数 | 1 / 2 / 3 / 4（设置中下拉选择，默认 2 列）。这是**上限**：空间不足时自动逐级回退，空间充裕也不会超过它 |
| 卡片基准边长 | 卡片的**最小**边长（默认 150px）。组件区是流式网格：同一列数下卡片等分可用宽度，按 10px 档位放大，**上限是「5 行仍可完整显示、且最下行的底部间距等于到右边的间距」所推出的尺寸**（1578×1000 窗口下 150 → 160），超出部分归还正文 |
| 2×4 长方形组件 | 宽度为两个 2×2 加一个间距，高度与 2×2 相同；同一组件可同时以两种尺寸安装 |
| 无空隙排列 | 组件按最优适配（best-fit）打包，2×4 留下的空格由后续 2×2 回填，拖动排序永不留下空洞。3 列时若 2×4 会被「截断」，它整体前移一格、被顶掉的 2×2 后移一格（类似四舍五入），长方块不会被孤立 |
| 拖宽实时响应 | 拖动对话宽度时每帧重算可用宽度，卡片在该列数下的档位边界处立即换档（拖动期间正文内边距不做补间，与对话区同步）；列数在阈值处增减。全部为 2×4 时降级跳过 3 列（2 ⇄ 4）；显式选择 3 列则始终保留 |
| 过渡手感 | 尺寸换档与列数变化都用**轻微回弹**（约 4% 过冲的弹簧曲线）平滑放大/缩小与滑到新格子，另加一段按排布顺序错开的微型沉降波（约 1.6% 幅度、逐卡 30ms）——不是整块组件区一起「弹」。组件栏自身的宽度与对话区留白也用**同一条弹簧**，所以换档时容器、卡片、正文三者同步移动，不会出现「容器已经跳过去、卡片还在追」 |
| 悬浮放大 | 多列网格同样生效；放大时行/列都按平面距离让位，间距恒定 |
| 滚轮 = 整行挡位滚动 | 滚轮以**整行**为挡位（位移恒为 `行高 = 卡片边长 + 间距` 的整数倍），因此顶部那行永远完整、不会被截断；一档把下一行拉到顶行的位置，底部允许溢出（默认视口正好显示 5 整行 + 第 6 行的顶部小截）。滚动一律走浏览器自身的平滑滚动，**鼠标在卡片上、间隙里还是组件栏空白处都一样顺滑**，不会出现逐格硬跳 |

### 连续波峰悬浮放大

macOS Dock 式悬浮放大，两种模式（在 **设置 → 组件 → 无极变化（连续跟随）** 中切换）：

- **无极变化（连续跟随）**：真正无极——每张卡片的缩放由它自身到指针的连续欧氏距离决定，指针任意移动，波峰都在卡片之间平滑滑动。它每一帧都落位到稳态的右对齐几何（`transition: none`），因此卡片右缘在移动过程中也始终与组件栏齐平，不会出现宽度/右缘失步。
- **离散（默认）**：复用同一套连续几何，只把指针吸附到量化格点（行/列中心 + 相邻中点：Y 方向 2·行数−1 个点、X 方向 2·列数−1 个点），波峰在格点之间滑动同样由那条弹簧驱动。

波动的进度是**一条每帧写入的弹簧**：`displayed = 1 + (target − 1) · p`。`target` 是指针的实时几何，`p` 在静息（`0`）与激活（`1`）之间按 Apple 参数化曲线取值（`response 200ms`、`bounce 0.1`——约 250ms 收敛、约 0.15% 过冲 ≈0.4px）。两者都连续，因此进入、跟随、离开在两个方向上都是**一条不中断的位移**；指针继续移动只会改变 `target`，永远不会让曲线重来（此前两种写法——朴素的 CSS transition、以及冻结目标——都正是败在这里，现已全部删除）。离开用同一公式反着跑，`prefers-reduced-motion` 下一帧到位。

两种模式下，放大后的 deck 都由固定悬浮层绘制在组件栏滚动裁剪盒**之外**，因此向左放大不会被裁剪，而静息时的组件栏宽度（以及对话列距离）始终不变。缩放保持正方形卡片与恒定间距；放大倍数可在设置中调节（`1.0–1.4`）。

进出悬浮是**一次连续位移**，不是两层叠图的交叉淡入：悬浮层在静息时与真实卡片逐像素重合，因此切换发生在几何完全一致的瞬间（不可见），随后约 250ms 内把每张卡片的 top/right/width/height 与缩放一起、按同一条弹簧写入波动位置；离开时反向走回静息位置后才交换回来。被悬浮的那张卡在放大层里也保留品牌蓝描边。

进入剩下的成本是**合成层**成本、不是重绘成本，修法是一个常驻提示：放大层的 15 个槽位（以及「＋」按钮）**始终**带 `will-change: transform`，合成层在指针到达之前就已存在——把提示挂在 hover 上实测：自然进入的首帧是 63ms 的层提升 + 栅格化帧；改成常驻后同一进入是 16ms、零掉帧。过去在组件栏空闲时把放大层翻出来 64ms 的「栅格预热」已**删除**：它几乎从不与真实悬浮重合，而常驻提示一到位，那次卡顿就再没复现。

组件栏与放大层由**同一个父级统一接管指针**（两者是必须的兄弟节点：放大层要逃出组件栏的滚动裁剪盒），而且这个指针面是**几何连续**的：波动激活时放大层自身可命中、并把命中盒按「卡片向左越出的最大量」向左扩宽（左内边距同步补偿，卡片不动），所以卡片之间、卡片与间隙之间、以及放大卡片越出组件栏左缘的那一条都不会掉出指针面——否则间隙的命中会落到后面的对话上，导致「悬浮到间隙就取消悬浮」和「在边缘来回移动时反复放大缩小」。指针真正离开时才结束波动（离开判定还带 6px 容差防抖）。**在放大卡片上滚动滚轮依然滚动组件栏**（放大层在滚动容器之外，滚轮被接管为整行挡位滚动并阻止穿透到后面的对话）。

### 加载骨架

外部数据（OpenCode 用量 / Command Code / 系统监控）尚未返回时，卡片不再显示空值或 0，而是画出**它正在等待的那块内容的外形**（标题保留真实组件名，占位块为圆角填充物，带 1.5s 微光扫过，`prefers-reduced-motion` 下静止）。外形按组件定制，因此加载中的 rail 依然能看出是哪些卡：三个环形图画三个圆角方块，柱状图／折线图画一个大圆角矩形，热度图画一个宽块，数字行画它那几列短块，额度卡画三条堆叠的条；纯文字卡保留数值胶囊 + 正文行。数据返回后原地替换，卡片尺寸与位置都不跳动。

### 连续曲率圆角

卡片圆角是**超椭圆**（`corner-shape: squircle`），不是圆弧：曲率从直边连续过渡进来，这正是 iOS / Figma 式圆角矩形看起来「软」而不是「切」的原因。它是原生 CSS，所以卡片描边与 `box-shadow` 都沿同一条轮廓（用 `clip-path` 做超椭圆会把两者都切掉）；不支持 `corner-shape` 的引擎退化为普通圆角，其他行为不变。

两个控件都在 **设置 → 组件 → 组件设置**：开关（默认**开**，留着是为了能对比两种形状）与**圆角档位**——半径占卡片**短边**的比例（`12 / 16 / 20 / 24 %`，默认 16%）。用百分比而非像素，因为参照物保持的是圆角与边长的比例：150px 的卡片与放大到 190px 的副本不该拿到同样的圆角（`12%` 正好还原旧的固定 16px，边长 150 时）。该档位同时驱动组件栏的静息卡与放大卡、组件市场 / 组件配置的预览、以及加载骨架。

### 内置部件

| 部件 | 说明 |
| --- | --- |
| 轮次·步数 | 会话轮次与步骤计数 |
| LLM 时长 / 工具调用 | 推理与调用的累计耗时 |
| 首 token 平均 | 平均 TTFT |
| 速率 | 解码吞吐（tok/s） |
| 缓存命中 | 输入缓存命中比例 |
| Tokens | 输入 / 输出 token 计数 |
| 上下文水位 | 系统 / 工具 / 消息三段占比条 + 明细；支持 2×2 与 2×4 |
| 系统监控 | 本机硬件族：CPU/GPU 利用率数字、内存、显存、GPU 温度——2×2 卡片 + 2×4 环形看板，另有 GPU 利用率折线 |
| 一键压缩 | 上下文占用百分比 + 角落圆钮（双击执行压缩） |
| 任务 | 进行中 / 已完成 / 待办计数 |
| 用量热度图 | GitHub 式日历热力图，自记账每日用量；2×2 = 近 3 个月日历，2×4 = 近半年全部用量点 |
| 用量柱状图 | 最近 7 天的垂直柱状图；柱区高度与日历网格一致 |
| 对话轨迹 | 官方「轨迹」三色泳道的卡片版：输入 / 模型 / 工具 每触发一次画一根色条，随模型调用工具在最近 30 拍窗口里向右滚动。**泳道宽度**可在组件配置里切换：`按时长`（默认，每拍宽度与其耗时成正比，无耗时的输入退化为最小刻度）或 `等宽`（固定槽位窗口，槽位在 30 拍时冻结、不再随窗口滚动重算） |
| 今日寄语 | 随机鼓励语录；文字/对齐/换行可自定义 |
| OpenCode Go 用量 | 用量对比（三窗口柱状图）/ 用量环图（三窗口环形图）/ 滚动用量 / 每周用量 / 每月用量 |
| Command Code 账户用量 | 账户 / 用量（`4.9M tokens` 大字 + 底部 请求 · 成功率 · 消费 三栏）/ 额度（`69.16 credits` 大字 + 官网那套 5 小时 · 周 · 月 三条分段横条）/ 窗口 / 套餐（等级徽标 + 账期行），以及 5h 窗口 / 周窗口 / 月窗口三张单窗口数字卡 |
| 额度管理 | 2×2 月窗口版式：月末用量预测 + 今日用量 / 今日推荐 |
| 峰谷定价 | 仅 2×2：当前是否处于 DeepSeek 高峰计费时段 |

### 组件预览即卡面

组件市场与「组件配置」的预览把卡片钉在一个 unit 正方形里（`pinBox`），所见即轨道上落座的卡面：内容过高的卡片由卡片自身的 `overflow: hidden` 裁掉，而不是把预览台撑成一个非正方形的圆角矩形（额度卡改造前实测 200×250）。**没有多余的角色词**：数字自带单位（`4.9M tokens`、`69.16 credits`）或自带名字（等级徽标）的卡片，灰字行留给多池时的当前视图。

### 套餐卡（等级徽标 + 账期）

大数字是官方套餐表的**等级徽标**（`individual-goat` → GOAT、`individual-pro-v1` → PRO …，与 provider 一样按最长前缀解析），不再打印原始 plan id（旧的 `individual-goa…` 直接顶出卡片边缘）；图例行是**账期**，徽标落座卡片底部左下角。组件市场的预览点击会走完整条等级阶梯（GOAT → PRO → MAX → ULTRA → PROVIDER → GO → TEAMS PRO），没有那个套餐也能先看效果。

### Command Code 账户池（点卡片切换账户）

Command Code provider 的「账户轮换」卡片可以把多个订阅挂在一个安装下（`COMMANDCODE_API_KEY`、`COMMANDCODE_API_KEY_2` … `_4`）。host 侧的同源路由 `/api/commandcode-usage` **把每一把已配置的 Key 都读一遍**（各自四个官方端点），连同每个 Key 自己 `/alpha/whoami` 读到的账户名一起下发：

- **点任意一张 Command Code 卡片即可循环**：`AllUser → Physicolor → Sparxie → AllUser`。选择按卡片实例持久化在 `cardConfigs.ccView`，刷新不丢；它与 OpenCode 池的 `poolView` 是两个字段，两族互不干扰；
- **`AllUser` 是整池合计**，逐字段相加：窗口百分比 = `Σused / Σcap`（不能取百分比均值——一个用尽的池 + 一个没动的池，那是「用掉一半额度」，不是「每个池各用一半」）；月窗口按各成员自身的月窗口相加，**每个成员用自己套餐的额度**计量，所以两个 GOAT 池就是 2 × $70；账户卡在合计视图里显示通用标签 `AllUser`，底下一行列出各账户名。`AllUser` 是刻意的中英同形表达；
- **图例行带出当前视图**（`账户 · AllUser`、`窗口 · Physicolor`），与卡片角色词并列；悬停提示给出完整循环链；
- **只配置一把 Key → 完全没有切换器**：卡片与改动前逐像素一致（图例行只剩角色词，账户名回到正文）。两个池解析出同一个账户名时，用 Key 的尾 4 位区分。

### 额度管理（Coding Plan 分组，2×2）

蓝色标题在顶，**大数字（月末用量预测百分比）在标题下方一行**，灰色子标题（`账期 10-10`）在大数字**右侧**、**底边与大数字对齐**，底部两个数字：**今日用量**（实测 token）与**今日推荐**（把剩余额度均摊到剩余天数得到的每日上限）。这套「大数字在标题下、灰字在右侧」的版式与「上下文已用」卡一致；标题与大数字之间是标准 4px 间距（150px 卡）。**头部不再显示池视图名**：点击卡片照旧在 `AllUser → 账户…` 之间切换（数字跟着变），只是不再有那一行标签。

- **口径（只算这个套餐自己）**：今日用量与今日推荐都按 Command Code 的 provider 路由（`commandcode`）折出来的每日日志计算（`/api/widgets-usage-daily?provider=commandcode`），与 credits、账期同源。同一台机器上并行跑着的其它 provider（例如 OpenCode Go）当天的 token **不计入**——否则会把别人的用量算进这份套餐的额度（实测 2026-09-20：全机器 783M 里 474M 属该路由）。带口径的地图拿不到时两个数字显示 `—`，不会退回混合口径。
- **预测口径**：`已用% + 近期速率 × 剩余天数`，近期速率取**最近 3 个日当量**（前 2 个完整天 + 今天按已过比例折算）。因此预测与今日推荐**数学同调**：预测 > 100% ⇔ 近期速率 > 今日推荐速率——卡片绝不会一边说「今天没超推荐」一边说「整月超 100%」。
- **超过 100%**：数字本身变红并做 1.6s 呼吸闪烁，而不是卡片四周泛起红色光晕。
- **额度 → token 换算**：余额（credits）按本账期已实现的「本地 token ÷ 消耗 credits」汇率折算成 token，两个数字同口径；不混入 provider 自己的 token 计数（它对同一账期的计量约高 1.7 倍）。**新加的池成员本账期一分未花时没有自己的汇率**，此时预算借用整池已实现的汇率（剩余额度 ÷ 剩余天数仍然成立），而速率侧保持它自己的 0——本地日志是整台机器的，不会算到没出过力的账号头上。
- **永远不打印「数据不足」，缺什么就填什么**：还没拿到载荷 → 大数字 `-%`，能读到账期就照常显示账期，两个数字走 `—`；账期太年轻推不出预测（今天刚开的池成员）→ 显示它真实的已用百分比（0.0%）、真实预算与 0 用量；从未用过的成员 → 除了预算全是 0。只有「账期已结束」这类过期载荷才什么都不显示，因为它不再描述任何可花的东西。

### 组件市场

- 浏览全部组件（系统 + 外部）、搜索、尺寸切换预览、按 `组件@尺寸` 安装；
- 已安装列表支持拖动排序、配置编辑，以及 `2×2 ↔ 2×4` 一键切换（自动去重——同一组件同一尺寸只保留一个实例）；
- 组件配置 tab 支持卡片级自定义（今日寄语、热度图窗口对齐等）。

### OpenCode Go 用量

滚动 / 每周 / 每月三个用量窗口 + 百分比 + 重置时间。Host 半注册同源路由代理 `opencode.ai`；浏览器不发任何跨域请求，密钥走 DSH credentials。两种呈现：**用量对比**（三窗口柱状图）与**用量环图**（三窗口环形图——环中心百分比、悬停显示精确值、按同一紧急度配色）。

### 峰谷定价（市场组件）

仅 2×2 的峰谷定价卡片，显示当前是否处于 DeepSeek 高峰计费时段。高峰时段（北京时间 UTC+8）为周一至周五 **09:00–12:00** 与 **14:00–18:00**——其余时间（含周末）一律为低峰。低峰显示 **CHEAP**；处于高峰窗口时显示 **EXPENSIVE**，数字本身变红并做 1.6s 呼吸闪烁（文字级告警，卡片边框保持干净），同时标题下方对应的时段行亮起品牌蓝并微微放大。时段目前硬编码；自定义时段设置已列入路线图。

---

## 工作原理

- **部件单元 + 构建期发现（ARCH-001）**：每个部件都是 [`src/widgets/<id>/`](src/widgets/) 下的独立单元——`manifest.json`（机器可读契约：id / group / sizes / defaultInstalled / 该部件的 locale）+ `index.ts`（`defineWidget` 描述符：render + 名称/描述 thunk + configSchema + example）。注册表是**生成**的，从不手工维护：[`scripts/gen-registry.mjs`](scripts/gen-registry.mjs) 扫描各单元目录并产出 `src/client/generated.registry.ts`（`WIDGETS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / 合并后的 `WIDGET_LOCALES`）。新增一个部件 = 新增一个单元目录；`pnpm build` 会重新生成，注册表过期时 `pnpm check:registry` 会直接报错。部件模板放在 [`src/widgets-template/`](src/widgets-template/)——在扫描根之外，因此永远不会被发现或注册；
- **共享层（稳定内核）**：[`src/client/lib/`](src/client/lib/)——`contract.ts`（Widget 契约与解析器）、`format.ts`（纯格式化器 / 热度图网格构造）、`usage-view.ts`（OpenCode 用量族的渲染）、`heatmap-accounting.ts`（token 热度图自记账 provider）。部件单元引用这些模块；部件专属逻辑留在单元内；
- **按部件 i18n**：部件文案放在各单元的 `manifest.json`（同族共用文案放 `src/widgets/_shared/locales.json` 一次）；外壳字典（`src/client/i18n.ts`）只管外壳 UI。生成的注册表把一切合并，外壳在 apply() 时向官方 locale 服务注册；
- **数据收集器**：挂载在 `conversation.composer.dock` slot，该 slot 仅在存在活跃会话时渲染——天然的「会话存活」信号；
- **Host 半**：`webServer` + `credentials` 服务；注册 `/api/opencode-usage` / `/api/opencode-usage-multi` 同源代理路由，以及 `/api/widgets-state` 存储（组件栏配置持久化到 `profiles/web/dsh-widgets-state.json`——权威副本，浏览器换 origin、无痕模式、清除站点数据都丢不了）；
- **可逆清理**：所有注册都由 fiber 的 effect 生命周期管理；卸载即完全恢复；
- **Slot 接入**：`conversation.input.overlay`（组件栏抽屉、放大浮层与设置抽屉——刻意放进对话子树，它会画在官方右栏面板**之下**，面板因此能吞掉组件栏）、`conversation.session.header.utilities`（「组件」胶囊，注册在 `order: 5`，避免与 `dsh-better-sidebar` 的底部面板开关撞号而换位）、`conversation.composer.dock`（数据收集器）、`settings.section`（设置页）；
- **空间契约**：组件栏从不索取固定宽度。它的预算是「官方对话列宽 − 官方正文 measure − 74px 盒内缩」，两个数都读产品自己发布的变量并带几何回退；在预算内它是一个流式网格（`repeat(auto-fill, minmax(基准边长, 1fr))` 的语义：列数按基准边长自动填充、上限为用户设置；卡片边长 = 该列数下的等分宽度，按 10px 档位量化，夹在自动下限与「5 行可见」上限之间），因此正文始终保住产品自己的 measure。空间连单列都放不下时才让位。实测见 [CHANGELOG.md](CHANGELOG.md)。

## 安装

```sh
# 通过 npm（插件市场）
dsh plugin --profile web add dsh-widgets

# 本地开发（link 方式）
dsh plugin --profile web add link:D:/dsh-home/plugins/dsh-widgets
```

安装后**硬刷新浏览器**（Ctrl+Shift+R），在会话页头部点击「组件」胶囊即可展开组件栏。OpenCode Go 部件需先在 Models 设置中配置 `OPENCODE_GO_API_KEY`。

## 开发

```sh
pnpm install
pnpm run build      # gen-registry（发现）+ tsdown 构建 lib/
pnpm run check      # 注册表最新性守卫 + tsc --noEmit
pnpm check:registry # 仅注册表发现守卫
node scripts/validate-widget-unit.mjs [dir]   # 部件单元契约校验器（Worker 自检 / 评审）
```

> 注意：`tsc --noEmit` 仍会在**未改动**的代码上报既有的 strict 模式错误——peer slot 类型（`@deepseek-ai/dsh-client-ui-slots`）只认识 `root` 这一个 slot 名，而运行时接受任意 slot id（插件实际可用；v1.3.0 重构把这类错误从 24 个降到 18 个，全部在改动文件之外），host 半则缺 `@types/node`。项目真正的门禁是 `pnpm build` + `pnpm check:registry`（两者均绿），外加运行中 bundle 的发现探针（`docs/verify-discovery.cjs`）。

- `peerDependencies`：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-client-ui-slots`（由 DSH web profile 提供）；
- `cordis.patch.yml` 插入一行 `widgets`；host 半与浏览器半分别由 loader 与 client-modules 加载。

## 兼容性

- DeepSeek Harness `0.1.0-rc.6` 及兼容的后续 `0.1.x`；
- 通过 `conversation.input.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section` 接入；
- 与 `dsh-better-sidebar` 的右栏显式协调：组件栏读取官方右栏列（旧版 better-sidebar 的 `--dsh-sidebar-width` 保留为回退），页头胶囊注册在 `order: 5`，因此 bundle 重载不会让两个开关互换位置；卸载后无残留。

## 发布

每个版本的逐条记录——连同每条改动背后的实测数据——都在 **[`CHANGELOG.md`](CHANGELOG.md)**（[中文](CHANGELOG.zh-CN.md)）；每个版本同时以 [GitHub Release](https://github.com/Physicolor/dsh-widgets/releases) 发布，锚定到实际发布它的那个 commit。原始证据（CDP 探针、截图、JSON 回执、逐事件的修复记录）在 [`docs/`](docs/) 下。本 README 只保留当前版本的速览。

### 最新版本 — v1.7.0

**一个 Command Code 池里的每一把 Key 都在卡上，点一下即切换。** provider 的「账户轮换」卡片能把多个订阅挂在一个安装下（`COMMANDCODE_API_KEY`、`_2 … _4`）；host 路由现在读取**每一个**已配置成员、各自请求四个端点，并以 `keys` 下发、用该 Key 自己的账户名做标签。任何 Command Code 卡片（连同「额度管理」）点一下就在 `AllUser → <账户> …` 之间循环——`AllUser` 是整池合计、逐字段相加（窗口百分比 = `Σused / Σcap`；月窗口按各成员**自己的**套餐分别取月再相加），只配置一把 Key 时完全没有切换器。对真实账号复验：`docs/probe-cc-pool.mjs`（88 条断言）。

**放大波现在是一条弹簧。** 进入/离开的进度是每帧写入的显式因子（`displayed = 1 + (target − 1) · p`，Apple 参数化：约 250ms 收敛、0.15% 过冲），移动中的指针再也不能让它重定向——「进入不连贯」与「交接瞬跳」这两个结构性缺陷都已消失，放大层的合成层也改为常驻提升（`docs/verify-rail-morph.cjs`）。

**加载骨架画的是卡片自己的外形**——三个环、一整块绘图区、一列数字、三条堆叠额度条，或只有一行的文字卡（`docs/verify-skeleton-shapes.cjs`，19/19 实机通过）；设置里的「组件」一格改用组件自己的图标而非通用齿轮（`docs/verify-nav-glyph.cjs`）；卡片圆角为**超椭圆**（`corner-shape: squircle`，默认开，半径按短边比例）并一路生效到组件栏（`docs/verify-corner-shape.cjs`）。

**本版还包含：** 「套餐」卡的档位徽章与档位阶梯预览、「用量 / 额度」重做（贴底数字行、官方式分段额度条）、「额度管理」的口径修复（只算 Command Code 路由）与按套餐的月窗口、以及折线图的空采样修复（`nvidia-smi` 漏采不再画成断线）。

> 已知代价（记录在 changelog 中）：组件栏开启且视口 ≤1600px 时，正文滚动容器会掉到产品 `900px` 容器查询之下，于是 DSH 会隐藏它自己的轮次导航。

## 路线图

组件系统现在是为规模而建的：每个部件都是 `src/widgets/` 下独立、契约驱动的单元，并在构建期被发现——新增一个部件就是新增一个单元目录，无需改动任何共享文件（指南：`src/widgets-template/README.md`）。

- **热度图 token 口径的后续工作**：卡片的总量已经与 dsh-usage-center 一致（host 路由复用它的 `getActivity()`）。要在**未安装** usage-center 时也做到精确，就得在本 host 里折叠同一批会话日志——今天刻意不重复实现，以保持口径只在一处维护；
- **Command Code 月窗口，待上游字段**：月份由本地推出 `used = 套餐额度 − 剩余月额度`（额度取自公开套餐表），因为 `billing/credits` 不返回月窗口对象。若上游之后在 `windowLimits` 里补上 `monthly`（含 used / cap / resetAt），`monthlyWindow()` 应直接读它，推导只作为回退；
- **Command Code 池靠命名约定发现**：host 读 `COMMANDCODE_API_KEY` 以及 provider「账户轮换」卡片写下的 `_2 … _4` 备用 Key。若某把 Key 存在无关的 ref 名下，需要把该 ref 加进 `COMMANDCODE_POOL_ENVS`（credentials 服务只暴露 `resolve(ref)`，没有「列出所有 ref」的口子，无法自动枚举）；
- **Agent 生产部件**：机器可读契约（`manifest.json` + `defineWidget` 描述符 + 模板 + 共享 API）正是一个 worker agent 端到端造出一个部件所需要的一切；v1.3.0 的并行创建测试证明两个 agent 可以同时添加部件、零文件冲突；
- **更多硬件指标**：通过可选的 LibreHardwareMonitor 桥拿 CPU 温度（外部依赖、需显式开启——刻意不打包）、NVIDIA 之外的 AMD/Intel GPU 支持、按网卡的流量；
- **热度图范围/周期控制**：让 2×4 热度图与柱状图能选当前半年 / 7 天默认值之外的自定义范围（周/月等）；
- **多平台用量部件**：Z.ai、DeepSeek 余额等，复用 host 同源代理 + credentials 模式；
- **峰谷定价自定义时段**：为峰谷定价部件开放窗口自定义（目前硬编码北京时间工作日 09:00–12:00 / 14:00–18:00）——自定义起止时间、工作日集合与时区；
- **实用工具部件**：一键压缩（需要 DSH 官方 compaction 能力）等；
- **外部集成**：飞书 / 微信推送与交互，密钥严格走 DSH credentials；
- **部件市场**：开放第三方部件注册机制，让社区部件像插件一样入驻——单元 + 发现架构（v1.3.0）就是载体；未来的 `widgets-market` bundle 可以同样地把单元放进 `src/widgets/`；
- **更多语言**：字典层每个 key 都已有 zh/en——加 `ja`/`ko` 等纯属字典扩展；
- **跨设备同步**（可选）：今天每台 DSH 服务各存一份 `dsh-widgets-state.json`——云/账号同步层可以让多台机器共享一份配置，但「本地优先、设备独立」是刻意保留的默认行为。

## License

[MIT](LICENSE)
