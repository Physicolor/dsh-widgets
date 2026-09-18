<p align="right"><a href="README.md">English</a> · <b>简体中文</b></p>

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
| 列数 | 1 / 2 / 4（设置中下拉选择，默认 2 列） |
| 2×4 长方形组件 | 宽度为两个 2×2 加一个间距，高度与 2×2 相同；同一组件可同时以两种尺寸安装 |
| 无空隙排列 | 组件按最优适配（best-fit）打包，2×4 留下的空格由后续 2×2 回填，拖动排序永不留下空洞 |
| 悬浮放大 | 多列网格同样生效；放大时行/列都按平面距离让位，间距恒定 |

### 连续波峰悬浮放大

macOS Dock 式悬浮放大，两种模式（在 **设置 → 组件 → 无极变化（连续跟随）** 中切换）：

- **无极变化（连续跟随）**：真正无极——每张卡片的缩放由它自身到指针的连续欧氏距离决定，指针任意移动，波峰都在卡片之间平滑滑动。它每一帧都落位到稳态的右对齐几何（`transition: none`），因此卡片右缘在移动过程中也始终与组件栏齐平，不会出现宽度/右缘失步。
- **离散（默认）**：复用同一套连续几何，只把指针吸附到量化格点（行/列中心 + 相邻中点：Y 方向 2·行数−1 个点、X 方向 2·列数−1 个点），由 0.2s 补间让波峰在格点之间滑动。

两种模式下，放大后的 deck 都由固定悬浮层绘制在组件栏滚动裁剪盒**之外**，因此向左放大不会被裁剪，而静息时的组件栏宽度（以及对话列距离）始终不变。缩放保持正方形卡片与恒定间距；放大倍数可在设置中调节（`1.0–1.4`）。

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
| 今日寄语 | 随机鼓励语录；文字/对齐/换行可自定义 |
| OpenCode Go 用量 | 用量对比（三窗口柱状图）/ 用量环图（三窗口环形图）/ 滚动用量 / 每周用量 / 每月用量 |
| Command Code 账户用量 | 账户 / 用量 / 额度 / 窗口 / 套餐，以及 5h 窗口 / 周窗口 / 月窗口三张单窗口数字卡 |
| 额度管理 | 2×2 月窗口版式：月末用量预测 + 今日用量 / 今日推荐 |
| 峰谷定价 | 仅 2×2：当前是否处于 DeepSeek 高峰计费时段 |

### 额度管理（Coding Plan 分组，2×2）

标题在左，**右上角是月末用量预测百分比**，第二行是账期日期（`账期 10-10`），底部两个数字：**今日用量**（实测 token）与**今日推荐**（把剩余额度均摊到剩余天数得到的每日上限）。

- **预测口径**：`已用% + 近期速率 × 剩余天数`，近期速率取**最近 3 个日当量**（前 2 个完整天 + 今天按已过比例折算；今天不足 6 小时不计入）。因此预测与今日推荐**数学同调**：预测 > 100% ⇔ 近期速率 > 今日推荐速率——卡片绝不会一边说「今天没超推荐」一边说「整月超 100%」。
- **超过 100%**：数字本身变红并做 1.6s 呼吸闪烁，而不是卡片四周泛起红色光晕。
- **额度 → token 换算**：余额（credits）按本账期已实现的「本地 token ÷ 消耗 credits」汇率折算成 token，两个数字同口径；不混入 provider 自己的 token 计数（它对同一账期的计量约高 1.7 倍）。
- **绝不造数**：缺百分比/额度、账期已结束或不足 6 小时 → 显示「数据不足」；仅当汇率侧不可用时，今日推荐才降级为 `—`。

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
- **空间契约**：组件栏从不索取固定宽度。它的预算是「官方对话列宽 − 官方正文 measure − 74px 盒内缩」，两个数都读产品自己发布的变量并带几何回退；空间不足时按阶梯降级（少一列 → 单列收窄 → 整个让位），因此正文始终保住产品自己的 measure。实测见 [CHANGELOG.md](CHANGELOG.md)。

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

### 最新版本 — v1.6.0

**组件栏的宽度取自产品自己的正文 measure。** 预算 = 对话列宽 − 正文 measure − 74px 盒内缩（box inset），并带一条降级阶梯（偏好布局 → 少一列 → 单列缩窄 → 让位），取代过去固定索要 372px 的做法。正文在每个视口都保住产品自己的 measure——1578/1400/1280 下为 748px，1120 下为 664px，此时组件栏分别取 372/198/154/0——空间不足时页头胶囊显示「无空间」，而不是展开一个空栏。

**右侧面板现在会真正吞掉组件栏。** 组件栏的宿主移入对话子树，即位于面板图层之下（用 `elementFromPoint` 实测确认），并在面板存在期间钉在视口右缘，于是面板边缘会一路扫过组件栏，回程时再逐段把它露出来。官方布局包「轨道与占用方共用同一条曲线」的不变量得到遵守——正文内缩改用官方的 0.3s 时长/缓动 token，而不是 `0.2s ease`。

**原生跟随。** CSS 锚点定位（在对话宿主上设 `anchor-name`）让组件栏搭上外壳自己的 style→layout 通道：逐帧实测 `|列右缘 − 组件栏右缘| = 0.00px`。此前在观察**零个**元素的 `ResizeObserver`（它在 shell 挂载 frame 之前就被构造）改为惰性重新绑定并可自愈；组件栏还会从 AppFrame 的 `transitionrun` 预测轨道的最终宽度，因此不再比面板慢约 100ms。

**悬浮组件栏不再付出代价。** 放大波峰抽成独立组件，并通过 `transform` 而非 width/height 缩放：帧耗时 p50 12.5ms → 4.2ms、p95 41.8ms → 8.3ms、>26ms 的帧 15 → 1、2.6s 悬浮期间的 JS 耗时 598ms → 193ms。

**修复。** 新建会话曾让组件栏画在 hero 之上（桥接改走 `useSyncExternalStore` + 即时隐藏类）；轮次导航曾被产品那条不可见的 40px 列宽拖拽带抢走 hover 与点击（修的是命中测试顺序，不是几何）；`heatmap-bars` 的首/末日期标签在约 14px 的列里折行并把柱子挤出 150px 卡片（`white-space: nowrap`）；`context-water` 2×2 撑破 150px 槽位 6px；bundle 重载后「组件」胶囊换了位置（`order: 10` 与 `dsh-better-sidebar` 撞号）。

**官网。** 展示站现在是一座设计系统站点——设计原则绑到真实组件、DSH Widget Design Grammar 带一条跑插件自身放大曲线的交互式组件栏、Widget Anatomy 按实测 DOM 矩形标注、13 条视觉审计规则对全部 33 个组件打分——并带有由 `website/gen-site.mjs` 从各 manifest 生成的真实 SEO（canonical、Open Graph、JSON-LD `ItemList`、sitemap）。

> 已知代价（记录在 changelog 中）：组件栏开启且视口 ≤1600px 时，正文滚动容器会掉到产品 `900px` 容器查询之下，于是 DSH 会隐藏它自己的轮次导航。

## 路线图

组件系统现在是为规模而建的：每个部件都是 `src/widgets/` 下独立、契约驱动的单元，并在构建期被发现——新增一个部件就是新增一个单元目录，无需改动任何共享文件（指南：`src/widgets-template/README.md`）。

- **热度图 token 口径的后续工作**：卡片的总量已经与 dsh-usage-center 一致（host 路由复用它的 `getActivity()`）。要在**未安装** usage-center 时也做到精确，就得在本 host 里折叠同一批会话日志——今天刻意不重复实现，以保持口径只在一处维护；
- **Command Code 月窗口，待上游字段**：月份目前靠守恒推出（`used = monthly credits consumed`、`total = used + remaining`），因为 `billing/credits` 不返回月窗口对象。若上游之后在 `windowLimits` 里补上 `monthly`（含 used / cap / resetAt），`monthlyWindow()` 应直接读它，推导只作为回退；
- **Command Code 多 Key / 组织支持**：今天只读主凭据 `COMMANDCODE_API_KEY`；组织维度或多账号可以复用 host 里 opencode-usage-multi 的池化模式（`COMMANDCODE_POOL_2..N`）；
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
