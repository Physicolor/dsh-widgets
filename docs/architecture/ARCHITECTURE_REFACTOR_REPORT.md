# ARCHITECTURE_REFACTOR_REPORT — dsh-widgets

执行日期：2026-09-28　｜　范围：`docs/architecture/REFACTOR_PLAN.md` 的 Phase −1 → Phase 5
性质：**行为保持型架构重构**（Architecture Refactor, Not Feature Rewrite）
提交区间：`17a4819`（基线冻结）→ `9de4b87`（Phase 5），共 **18 个提交**，每步一个。

---

## 1. Before architecture

```text
src/                                   14,137 行 / 101 文件
├── index.ts (host)        1,077      7 条路由 + 全部抓取/聚合，零本地 import
├── client/
│   ├── index.ts           3,795      God Object：9/9 职责（layout/geometry/采集/runtime/
│   │                                 偏好/渲染/动画/注册/状态），apply() 独占 1,950 行
│   ├── components.tsx     2,297      卡片渲染 + 图表 if 链 + 配置页 + 市场页 + 设置页
│   ├── widgets.module.css 1,468      全仓唯一样式表
│   ├── i18n.ts              321
│   ├── generated.registry.ts 686     生成物
│   └── lib/ (9 文件)      2,907      框架工具与「家族视图」混放
└── widgets/ (40 单元)     1,547      单元目录很薄（这是对的）
```

**三个文件占 53.5%**（`client/index.ts` + `components.tsx` + `widgets.module.css` = 7,560 行）。
两处「伪模块化」：① 5 张按 widget id 手写的中央清单；② 图表能力是闭集 + 508 行 if 链。

## 2. After architecture

```text
src/                                   14,660 行 / 98 文件
├── index.ts (host)        1,076      ← 未动（见 §12）
├── widgets/ (40 单元)                 ← 单元结构不变（Phase 1 只在 manifest 加了两字段）
└── client/
    ├── index.ts           1,315      组合根：状态机 + 槽位装配 + 右栏槽位体
    ├── contracts → lib/contract.ts 729（类型 + 解析器，仍未拆，见 §12）
    ├── runtime/           bridge(48) controller(30) prefs(147) host-sync(83)
    ├── data/              collector(500) session-stats(128)
    ├── families/          cc{data 443, renders 316} sys{171,140} github{130,90} usage{57,69}
    ├── render/            CardBody(337) card-geometry(41) icons(42)
    │   ├── charts/        registry(47) types(24) theme(14) + 10 个 renderer（22–159 行）
    │   └── preview/       preview-stats(128) sim(19) example-out(31)
    ├── rail/              geometry(405) wave/{RailWave(1044), wave-geometry(277)}
    ├── surfaces/          Settings(114) layout(17) settings-nav-glyph(54)
    │   ├── config/        ConfigTab(685)
    │   └── market/        MarketTab(431)
    └── styles/            card(251) rail(348) panel(251) market(367) primitives(275)
```

目录名现在直接说出职责：`runtime / data / families / render / rail / surfaces / styles`。

## 3. 文件职责变化（中央清单与 God Module）

| 原状 | 结果 |
|---|---|
| `WIDGET_SOURCE`（24 id）+ `SKELETON_SHAPE`（18 id）+ `SYS_WIDGET_IDS` | **删除**，改为 24 个 manifest 声明 `source`/`skeleton` → 生成器产出 `WIDGET_RUNTIME` |
| `ChartBlock` 508 行 if 链 + 45 行常量 | `charts/` 一个 kind 一个 renderer + `registry.ts`（新 chart = 加文件 + 注册一行） |
| `components.tsx` 2,297 行 | **文件消失**，内容归入 `render/`（卡片/图表/图标/预览）与 `surfaces/`（配置/市场/设置） |
| `cc-view.ts` 760 / `sys-view.ts` 306 / `github-view.ts` 217 / `usage-view.ts` 121 | 四个家族各拆 `data.ts` + `renders.ts`；`lib/` 只剩框架工具（5 文件） |
| `widgets.module.css` 1,468 行 | `styles/` 五层，**拼接字节全等**（§9） |
| `client/index.ts` 3,795 行 | 1,315 行（−65%）；`apply()` 仍是右栏槽位体所在（§12） |

## 4. 最大文件变化

| 文件 | Before | After | 说明 |
|---|---|---|---|
| `client/index.ts` | 3,795 | **1,315** | −65% |
| `components.tsx` | 2,297 | **0（删除）** | 拆成 7 个模块 |
| `widgets.module.css` | 1,468 | **0（删除）** | 拆成 5 个层文件（最大 367） |
| `cc-view.ts` | 760 | **0（删除）** | 拆成 data 443 + renders 316 |
| **全仓最大文件** | 3,795 | **1,315** | 无任何文件 >1,315（生成物与 host 除外） |

## 5. Dependency direction

```text
widgets/<id> ──► client/families/<f>/renders ──► render/CardBody ──► render/charts/registry
     │                    │                              │
     │                    └──► families/<f>/data ────────┘
     └──► lib/contract · i18n · lib/format
client/index.ts ──► runtime/{prefs,bridge,host-sync,controller} · data/collector · rail/* · surfaces/* · styles/*
```

- **无循环依赖**（新模块都从叶子往根引用；`runtime/bridge.ts` 与 `runtime/controller.ts` 是为打断 `index → collector → index` 与 `surface → components` 而设的叶子契约）。
- widget 之间仍**零互相 import**；rendering 层仍**零 widget-id 特判**。
- 新出现的合法方向：`render/CardBody → charts/registry`（图表是渲染层的封闭词汇）、`surfaces → render/CardBody`（预览渲染真卡片）。

## 6. Widget registration flow

```text
新建 src/widgets/<id>/ + manifest.json + index.ts
   ↓  pnpm gen:registry（生成器扫描、三向 id 校验、sizes 双份一致）
generated.registry.ts：WIDGETS / ALL_INSTANCES / WIDGET_LOCALES / WIDGET_RUNTIME
   ↓  pnpm check:registry（逐字符守卫，漂移即构建失败）
运行时：prefs.order ∩ installed → 每实例 widgetId@size → render(stats,{size}) → CardBody
```

**Phase 1 之后**：带异步数据源的 widget 只需在自己的 manifest 里写 `source` + `skeleton`
（生成器校验枚举与未知键），**不再需要修改任何中央文件**——反形式主义自检 A 的例外从 5 处降到 1 处
（只剩「真正新增一个数据源」需要动 host 路由，那是能力扩展而非 widget 工作）。

## 7. Chart registration flow

```text
新增 render/charts/<kind>.tsx（导出 ({chart,side,width,pad,scale}) => ReactElement|null）
   ↓  在 registry.ts 的 RENDERERS 表加一行
framework：renderChart({chart,...}) 按 chart.kind 派发
```

每个 renderer **自带载荷守卫**（`chart.kind === 'x' && chart.x`），因为 `WidgetChart` 的载荷字段全是可选、不随 `kind` 收窄。
派发与原 if 链语义等价（kind 互斥）。弹性布局白名单从 `CardBody` 内联判断改为 `CHART_FILLS_BODY`。

## 8. Data source architecture

未改动（Phase 2 只搬了「谁来采集/怎么折叠」，没动 host 协议）：

- host 7 条路由（`opencode-usage` / `-multi` / `commandcode-usage` / `widgets-usage-daily` / `github` / `widgets-state` / `sysinfo`）。
- client 唯一数据出口仍是 `BridgeSnapshot`（17 字段）→ `emit()` → 消费方只有 rail 与 settings。
- 采集器（`data/collector.tsx`，500 行）通过显式 `CollectorDeps` 注入 `useBridge/setState/getState/getPrefs`
  与组合根打交道；`state`/`prefs` 是**活绑定**，所以用 getter 在使用点读取（`useCallback(..., [])` 里的读法必须如此）。

## 9. CSS architecture

```text
client/styles/
  card.module.css        251   卡片外壳 / head-body 槽位 / 骨架
  rail.module.css        348   rail 盒 / 锚定 / 加号面板 / 波形 / 放大层
  panel.module.css       251   组件配置
  market.module.css      367   组件市场
  primitives.module.css  275   按钮/开关/下拉/metrics/告警
```

- **顺序即层叠**：每个 `.module.css` 在模块执行时各自注入 `<style data-plugin-css>`，所以 import 顺序就是层叠顺序；五段是**原文件顺序上的连续切片**，不做按层重排。
- **证明**：G5 比较「所有样式表按 bundle 顺序拼接」的哈希 → `23141 B / 099df111…`，与拆分前**逐字节相同**。
- widget 专属样式仍为空：40 个单元没有一个提供 `index.module.css`（真需要时构建已支持，tagId 按 src 相对路径隔离）。

## 10. 保持不变的行为

- **widget 数据**：G4 对 40 单元 × 每 size × 每 sim × zh/en = **110 条 `WidgetRenderOut`** 逐字段比对，全程一致（含 manifest 文案链）。
- **CSS 产物**：G5 拼接字节全等（拆分前后同一张样式表）。
- **搬运保真度**（G6 逐行核对，注释与 import 归一化后增删行必须互相抵消）：

| 步骤 | 结果 |
|---|---|
| 2.1 / 2.2 / 2.4 / 2.6a / 3.5+3.6 | 90/90、133/133、388/388、159/159、203/203 —— **纯搬移** |
| 3.7-3.9（components.tsx 解散） | 872 / 869，仅 3 行不抵消（旧文件多行 import 的续行） |
| Phase 4（四家族拆分） | 1505 / 1505，仅 2 行不抵消（一处 re-export 路径） |
| 2.5（采集器）/ 2.7（波形几何）/ 3.4（图表 registry） | 非纯搬移，逐行列出接口差异（6 / 2+接口 / 3 处重新派生）并人工复核 |

- **未验证项**：live `dsh web` 全程不可达，因此**像素级/交互级探针未跑**（`docs/verify-skeleton-shapes.cjs`、`docs/probe-*`、`scripts/diag-morph-frames.cjs` 等）。轨道动画（RailWave）与图表渲染的像素行为是靠**字节级纯搬移**推证的，不是实测的。服务恢复后应优先补跑这三个：`diag-morph-frames.cjs`（HEADFUL=1）、`diag-rail-hover-release.cjs`、`docs/verify-skeleton-shapes.cjs`。

## 11. Build / test results

无单测框架（重构前如此，本次未引入）。离线闸门：

| 闸门 | 结果 |
|---|---|
| G1 `gen-registry --check` | OK，40 单元 |
| G2 `validate-widget-unit` × 40 | 40/40 PASS |
| build（`gen-registry` + tsdown） | 通过，产物 `lib/index.js` 36 KB / `lib/client.js` 单文件 |
| G3 `verify-tsc-baseline` | 既有 34 条**全部容忍**，本次**0 新增** |
| G4 `snapshot-render` | 110 条渲染输出全等 |
| G5 `extract-css` | 拼接字节全等（23141 B / `099df111…`） |
| G6 `audit-move-only` | 见 §10 表 |

三个数据闸门在 Phase −1 都做过**故意破坏验证**（改一个 widget 值 → G4 红；加一个类型错误 → G3 34→35；加一条 CSS → G5 23141→23165），确认它们真的能变红。

## 12. 尚未处理的问题（明确登记）

| # | 项 | 现状 | 原因 |
|---|---|---|---|
| 1 | **Phase 2.6b：测量机制** | 仍在 `client/index.ts`（ResizeObserver / 宽度追踪 / `railBudget` 发布 / 唯一完整 dispose） | 跨段共享状态最多（`railBudget` 3 读 1 写、`drawerEl`/`frameEl` 跨段），需要先立 `RailGeometryHost` 接口；排期不足 |
| 2 | **Phase 2.9：deck 视图** | 右栏槽位体（deck 网格 / 加号面板 / 抽屉）仍在 `client/index.ts` | **我的计划遗漏**：Phase 0 审计把它标为 E7，但阶段表只安排了 measure 与几何 |
| 3 | **host `src/index.ts` 1,076 行** | 7 条路由 + 全部抓取/聚合，单文件零本地 import | **同样是计划遗漏**：目标结构里有 `host/`，但没有对应阶段 |
| 4 | `lib/contract.ts` 729 行 | 纯类型（23-479、509-678）与带逻辑的解析器（483-494、682-730）混装 | 计划 §5 提到应拆 `contracts/types` + `contracts/helpers`，未排期 |
| 5 | `typescript` 既有 34 条错误 | 缺 `@types/node`、`react-dom` 类型、`ctx.slots` 类型、若干 possibly-undefined | 独立任务；G3 只保证不恶化 |
| 6 | 发布包缺 `.d.ts` | `package.json` 声明 `lib/types/**` 但两入口 `dts:false` | 独立缺陷，未在本次范围 |
| 7 | 死代码残留 | `GripIcon`（移入 `render/icons.tsx` 时按纯搬移保留）、死 CSS（`dsx-macts`/`dsx-mid`/`dsx-restore`）、空钩子 7 个 | 已登记，未清理（避免污染结构提交） |
| 8 | 两个 `:root` token 块 | 留在 `card`/`rail` 层文件原位，**没有**独立成 `tokens.css` | 见 §13 的取舍 |

## 13. 计划与实际的差异（执行中记录）

1. **Phase 2.4 的假设被实测推翻**：计划说「必须把 6 个闭包函数注入 RailWave」——实测这 6 个（`railElement`/`hitLayout`/`onCard`/`moveRailFocus`/`leaveRail`/`nearSurface`）**都定义在 RailWave 内部**，跟着组件一起搬即可，无需注入。真正需要外部提供的是常量。
2. **Phase 3.2（预览数据）提前到 Phase −1**：G4 需要一个不含 React 的渲染闭包，而 `PREVIEW_STATS` 原在 `components.tsx` 里，所以那次搬移被提前。
3. **Phase 2.2 顺带完成 Phase 3.1**：`Prefs` 类型必须离开 `components.tsx` 才能建 `runtime/prefs.ts`——顺带消掉了全仓唯一一条反向依赖。
4. **deck 视图与 host 拆分未排期**（§12 #2/#3）：这是计划本身的缺口。
5. **CSS token 层的取舍**：把两个 `:root` 块提成 `tokens.css` 会造成**规则重排**，G5 随即变红（23135 vs 23141 B）。层叠上无害（自定义属性按名解析、无规则与 `:root` 竞争），但「无法做成字节级证明的无害」不作为证据接受，因此 token 块留在原位。**这是本次唯一一处明确用「可证明性」换「分层纯度」的决定。**

## 14. Top 10 largest source files（`git ls-files src`，node 实测）

| # | 文件 | 行数 | 职责 | 为何仍是这个尺寸 | 是否建议继续拆 |
|---|---|---|---|---|---|
| 1 | `client/index.ts` | 1,315 | 组合根：bridge 状态机、槽位装配、右栏槽位体（deck/add 面板/抽屉） | 剩余部分是「装配 + 右栏视图」，正是 §12 #1/#2 两项 | **是**（2.6b + 2.9） |
| 2 | `index.ts`（host） | 1,076 | 7 条路由 + 抓取/聚合/缓存 | 计划缺口（§12 #3） | **是**（按路由拆 `host/routes/*` + `host/http/*`） |
| 3 | `rail/wave/RailWave.tsx` | 1,044 | 悬浮放大波：自身交互几何（6 个内部函数）+ 25 props + 4 个 rAF 循环 | 单一职责的大型交互组件；1.2.4 起逐帧弹簧模型已定型 | 可选（可再拆 `wave-math`/`magnify-layer`，收益中等） |
| 4 | `generated.registry.ts` | 730 | 生成物 | 40 单元 × 文案字典，**非手写** | 否 |
| 5 | `lib/contract.ts` | 729 | 类型 + 解析器混装 | 计划 §5 已指出 | **是**（types / helpers） |
| 6 | `surfaces/config/ConfigTab.tsx` | 685 | 组件配置：排序列表 + 字段控件 + 预览抽屉 | 三个子职责同文件（`OrderList`/`ConfigFieldControl`+`MetricsFieldControl`/`ConfigTab`） | 可选（拆 3 个 surface 子模块） |
| 7 | `data/collector.tsx` | 500 | 5 条路由的采集 + 会话投影 + 热力图回退 | 单一职责（把所有外部输入折成 bridge），但可按源再分 5 个 fetcher | 可选（计划原写「按源拆 5 个」，本次只做了整体搬出） |
| 8 | `families/cc/data.ts` | 443 | Command Code 载荷/多池聚合/套餐额度表/窗口计算 | 家族数据层；套餐表与聚合是不同变化原因 | 可选（plan 表可独立） |
| 9 | `surfaces/market/MarketTab.tsx` | 431 | 市场：列表/画廊/舞台/幽灵 | 单一 surface | 可选 |
| 10 | `rail/geometry.ts` | 405 | rail 空间读取 + 尺寸解算（+ 波形共用的三常量） | 单一职责（几何） | 否 |

（`client/lib/format.ts` 168、`i18n.ts` 320、`runtime/prefs.ts` 147 均在健康区间。）

## 15. 结论

- 目标四文件：`client/index.ts` **−65%**、`components.tsx` **已解散**、`cc-view.ts` **已拆**、`widgets.module.css` **已分层且字节可证**。
- 反形式主义自检：**A**（新增 widget 只加目录）✅ 除「新数据源」外全自动；**B**（新增 chart 加文件 + 注册）✅；**C**（改数据源只动 data 层）✅；**D**（改 RailWave 只进 `rail/wave/`）⚠️ 组件本身 ✅，但其调用方几何仍在 `index.ts`（2.6b/2.9 待做）；**E**（改一个 widget 不影响别人）✅ 保持。
- 全部改动都是**可验证的搬运**：18 个提交里 10 个被 G6 判定为纯搬移，其余 3 个（采集器/波形几何/图表 registry）逐行列出了接口差异。
- 未完成的是「计划遗漏的两块 + host + contract」——它们都有明确入口与建议，不是模糊地带。
