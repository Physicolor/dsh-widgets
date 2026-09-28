# ARCHITECTURE_REFACTOR_REPORT — dsh-widgets

执行日期：2026-09-28　｜　范围：`docs/architecture/REFACTOR_PLAN.md` 的 Phase −1 → Phase 5
性质：**行为保持型架构重构**（Architecture Refactor, Not Feature Rewrite）
提交区间：`17a4819`（基线冻结）→ `9de4b87`（Phase 5），共 **18 个提交**，每步一个。

> **续作（同一份计划，第二轮）见 §16。** §1–§15 是第一轮的收官记录，其中的「未完成」项已在
> §16 处理；本文件不再改写历史小节，只在 §12 的行内标注已解决项。

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
| 1 | **Phase 2.6b：测量机制** | 仍在 `client/index.ts`（ResizeObserver / 宽度追踪 / `railBudget` 发布 / 唯一完整 dispose） | 跨段共享状态最多（`railBudget` 3 读 1 写、`drawerEl`/`frameEl` 跨段），需要先立 `RailGeometryHost` 接口；排期不足 —— **§16 已解决：`rail/measure.ts`** |
| 2 | **Phase 2.9：deck 视图** | 右栏槽位体（deck 网格 / 加号面板 / 抽屉）仍在 `client/index.ts` | **我的计划遗漏**：Phase 0 审计把它标为 E7，但阶段表只安排了 measure 与几何 —— **§16 已解决：`rail/rail-view.tsx`** |
| 3 | **host `src/index.ts` 1,076 行** | 7 条路由 + 全部抓取/聚合，单文件零本地 import | **同样是计划遗漏**：目标结构里有 `host/`，但没有对应阶段 —— **§16 已解决：`host/` 9 个模块** |
| 4 | `lib/contract.ts` 729 行 | 纯类型（23-479、509-678）与带逻辑的解析器（483-494、682-730）混装 | 计划 §5 提到应拆 `contracts/types` + `contracts/helpers`，未排期 —— **§16 已解决：`lib/contract/{types,helpers}.ts`** |
| 5 | `typescript` 既有 34 条错误 | 缺 `@types/node`、`react-dom` 类型、`ctx.slots` 类型、若干 possibly-undefined | 独立任务；G3 只保证不恶化（**§16 后为 35 条：同一 `node:os` 缺声明错误随模块拆分多计一次，G3 会显式报告并容忍**） |
| 6 | 发布包缺 `.d.ts` | `package.json` 声明 `lib/types/**` 但两入口 `dts:false` | 独立缺陷，未在本次范围（**§16 已复核：仍开放，且原因比原记录更严重 —— 见 §16.6**） |
| 7 | 死代码残留 | `GripIcon`（移入 `render/icons.tsx` 时按纯搬移保留）、死 CSS（`dsx-macts`/`dsx-mid`/`dsx-restore`）、空钩子 7 个 | 已登记，未清理（避免污染结构提交）—— **§16.6 复核：仍未清理，理由已更新** |
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
- 反形式主义自检：**A**（新增 widget 只加目录）✅ 除「新数据源」外全自动；**B**（新增 chart 加文件 + 注册）✅；**C**（改数据源只动 data 层）✅；**D**（改 RailWave 只进 `rail/wave/`）⚠️ 组件本身 ✅，但其调用方几何仍在 `index.ts`（2.6b/2.9 待做）—— **§16.7 已转为 ✅**；**E**（改一个 widget 不影响别人）✅ 保持。
- 全部改动都是**可验证的搬运**：18 个提交里 10 个被 G6 判定为纯搬移，其余 3 个（采集器/波形几何/图表 registry）逐行列出了接口差异。
- 未完成的是「计划遗漏的两块 + host + contract」——它们都有明确入口与建议，不是模糊地带（**§16 已做完**）。

---

# 16. 续作（第二轮）：把 §12 的四项做完

第一轮停在 `9de4b87`（Phase 5）。§12 登记的四项未完成里，1–4 是「计划遗漏 / 排期不足」的结构缺口，
本轮全部做完；5–8 是独立缺陷，本轮**复核并更新了结论**（§16.6），未贸然改动发布面。

## 16.1 本轮提交

| 提交 | 内容 | 规模 |
|---|---|---|
| `723ba94` | docs：把 2.9 与 Phase H 补进计划（含「明确不拆」清单一并恢复） | 1 文件 |
| `31dcbf4` | **Phase 2.9** 右栏槽位体 → `rail/rail-view.tsx` | `client/index.ts` 1,315 → 775 |
| `92047b3` | 探针不再硬编码 playwright 修订号（`scripts/lib/chrome.cjs`） | 36 个受版本控制的探针 |
| `74656da` | **Phase 2.6b** 测量层 → `rail/measure.ts` | 775 → **308** |
| `f832310` | **Phase H** host 拆 9 个模块 + 新闸门 G7 | `src/index.ts` 1,077 → **31** |
| `a0231ab` | **contract 拆分** `lib/contract/{types,helpers}.ts` + 重接 68 条 import | 730 → 665 + 80 |

## 16.2 最终结构

```text
src/                                   15,025 行 / 111 文件（第一轮结束时 14,660 / 98）
├── index.ts (host)            31      ← compose：inject + 遍历 HOST_ROUTES
├── host/
│   ├── context.ts             39      上下文契约（webServer / credentials / get / effect）
│   ├── http.ts                64      memoTtl · readJsonBody · 路由缓存策略
│   ├── exec.ts                12      唯一的子进程缝（nvidia-smi 与 gh CLI 共用）
│   ├── opencode.ts           103      /api/opencode-usage · -multi
│   ├── commandcode.ts        196      /api/commandcode-usage（4 端点 × 池内每 key + memo）
│   ├── usage-daily.ts        128      /api/widgets-usage-daily（usage-center 适配）
│   ├── github.ts             449      /api/github（凭据三级阶梯 + 5 个分级 memo）
│   ├── state-file.ts          63      /api/widgets-state（tmp+rename 原子写）
│   ├── sysinfo.ts            101      /api/sysinfo（CPU 差值 / 内存 / nvidia-smi + 环形缓冲）
│   └── routes.ts              23      注册表（新增渠道 = 加模块 + 一行）
├── widgets/ (40 单元)                 单元结构不变
└── client/
    ├── index.ts              308      ← compose：bridge / 槽位装配 / header capsule / settings
    ├── lib/contract/
    │   ├── types.ts          665      ← 零 import：全部类型 + 一个数据常量
    │   └── helpers.ts         80      ← defineWidget / 标签解析器 / 实例键 / sizesOf（唯一需要 i18n 的一半）
    ├── runtime/ data/ families/ render/ surfaces/ styles/   结构同第一轮
    └── rail/
        ├── geometry.ts       405
        ├── measure.ts        537      ← 锚点探针 / 宽度跟踪 / ResizeObserver / yield beat + dispose
        ├── rail-view.tsx     612      ← deck 网格 / 放大波 / 加号面板 / 滑动抽屉
        └── wave/{RailWave 1,045, wave-geometry 277}
```

**手写文件的天花板**：`RailWave.tsx` 1,045（单一交互组件）→ `ConfigTab.tsx` 686 → `contract/types.ts` 665
（纯类型，尺寸本来就该大）→ `rail-view.tsx` 612 → `measure.ts` 537。生成物 `generated.registry.ts` 730 不计。

`client/index.ts` **308 行**，低于计划出口条件（≤ 400）32 行；`apply()` 里只剩 bridge 三件套、
boot 同步、`runCommand`、装配、body class 开关。

## 16.3 三处搬运的保真度证据（逐行，而不是「看起来一样」）

| 步骤 | 证据 | 结果 |
|---|---|---|
| 2.9 rail-view | 把 HEAD 的搬移区（508 行）与 `rail/rail-view.tsx` 的 body 逐行 diff | **只有 3 行不同**，且正是文档化的三处实时绑定改写：`prefs.cardConfigs`×2 → `getPrefs()`（事件处理器内，读到渲染期快照就会丢上一次点击）、`prefs.cardSide` → `getPrefs()`、`{ drawerEl = el }` → `{ setDrawerEl(el) }` |
| 2.6b measure | 把 HEAD 的 173–659 区按文档化的改写重放，再与 `rail/measure.ts` 的 485 行 body 比对 | **485/485 逐行相等** |
| Phase H host | 用同一套桩（credentials/fetch/usageCenter + 临时 DSH_HOME）分别驱动**拆分前**（`HEAD:lib/index.js`）与**拆分后**的 bundle | 14 条路由案例的结构指纹**逐字节相同** |
| contract | G4 110 条渲染输出 + G2 40 单元校验 | 全等 / 全过 |

关于 getter 的必要性：2.9 的第一版改写被 `(?<!\.)` 前瞻挡掉了一处外层展开（`...prefs.cardConfigs`），
自检脚本把它抓了出来 —— 这是本轮唯一一处「差点静默降级为渲染期快照」的缺陷。

## 16.4 live 验收（第一轮不可达的 `dsh web` 已恢复）

| 探针 | 结果 |
|---|---|
| `scripts/diag-rail-hover-release.cjs` | **11/11 PASS**（2.9 之后与 2.6b 之后各跑一次） |
| `docs/verify-skeleton-shapes.cjs` | **PASS**，19/19 卡片、0 溢出、page errors `[]`、状态已还原 |
| `scripts/diag-morph-frames.cjs`（HEADFUL=1） | `maxFrameStep 0.0255`（第一轮基线 0.0227，同量级；逐帧表无跳变） |
| `scripts/diag-rail-scroll-perf.cjs` | 无崩溃、detent 端点正常（291 帧 p95 37ms） |

服务新鲜度也做了证据：`__DSH_BOOT__` 里 `dsh-widgets` 的 rev 随每次重建变化，且经授权取回的组合
bundle 含 `createRailView` / `setDrawerEl` / `getRailBudget` —— 探针驱动的是搬移后的代码，不是缓存。

## 16.5 闸门与工具的变化

**新增 G7 `scripts/snapshot-host-routes.mjs`**：host 半区此前只有 `docs/verify-sysinfo.mjs` 覆盖一条路由，
其余全靠 live 服务。G7 用 mock webServer + 桩 credentials/fetch + 临时 `DSH_HOME` 驱动**构建产物**，
把 14 条案例降成结构指纹（保留键名、状态码、类型；数字归零、字符串归一），基线落在
`docs/architecture/baseline/host-routes.json`。

- 它**拒绝在覆盖不全时运行**：注册了却没有案例的路由会让它直接红（新增渠道必须同时加案例）。
- 故意破坏验证：把 state 路由的 405 改成 404 → `FAIL — 1 case(s) differ`，并指出是哪一条；改回后全绿。
- `sysinfo` 只比对顶层键（深契约归 `verify-sysinfo`），避免把宿主机器状态写进基线。

**G3 的容忍规则被修正**：`TS2307/TS2580/TS7016` 是**按 import 模块计数**的错误（`node:os` 被两个模块
import 就是两条，根因只有一个：缺 `@types/node`）。拆分文件会合法地抬高这些计数，因此**已存在于基线中的
签名**允许增长并打印报告。但旧规则放过了真正的新错误 —— contract 拆分时 `Cannot find module './contract'`
（同一 TS2307 码、基线里 0 条）曾被判为「容忍」。现在 `was === 0` 一律致命。

**G4 的输出目录现在先清空**：`tsc` 不会删除产物，被重构删掉的模块会留下幽灵 `.js`，让坏 import 也能通过 ——
这正是拆分 contract 时发生的事（`.tmp-snapshot/.../lib/contract.js` 满足了 harness 的旧 import，
而源文件早已不存在，G4 因此照常全绿）。这是本轮发现的**最危险的一处闸门失效**。

**探针的可复跑性**：97 个探针文件硬编码了 `ms-playwright/chromium-1243/...`，本机升到 1246 后全体无法启动
（`scripts/diag-*.cjs` 是 gitignore 的本地文件，受版本控制的那部分有 36 个）。新增 `scripts/lib/chrome.cjs`
解析**最新已安装**的修订目录（+ `CHROME_PATH` 覆盖 + 显式报错列出搜索路径），97 个文件全部迁走，
`node --check` 与 require 路径解析各验一遍。

> 探针使用提醒：`tsdown` 重建后的数秒内启动探针会撞上客户端 HMR 重打包，可能看到一个完全没有插件界面的
> 页面（本轮遇到过一次，重跑即绿）。重建后稍等再跑。

## 16.6 §12 剩余项的复核结论

> 本表是第二轮的复核结论。其中 **5–8 项的最终状态见 §17.3（第三轮已全部完成）**；1–4 项在 §16.1–§16.3 已落地。

| # | 结论 |
|---|---|
| 1 | ✅ 已解决：`rail/measure.ts`（`railBudget`/`drawerEl` 仍归组合根，经访问器进出；观察器/计时器/`frameEl` 全部内移） |
| 2 | ✅ 已解决：`rail/rail-view.tsx`（`createRailView(deps)`，在 inject 回调内构造以保持组件身份语义） |
| 3 | ✅ 已解决：`host/` 9 个模块 + `HOST_ROUTES` 注册表；每个路由模块自带 `register(ctx): () => void`，`ctx.effect` 仍由根调用 |
| 4 | ✅ 已解决：`lib/contract/{types,helpers}.ts`；**故意不做 barrel**，否则 i18n 耦合原样保留 |
| 5 | ⏳ 34 → **35 条**，多出的正是同一 `Cannot find module 'node:os'`（`state-file.ts` 与 `sysinfo.ts` 各一条）。真正的修法是装 `@types/node` + `@types/react-dom` + slots 类型，一次消掉约 20 条；本机 `pnpm install` 目前不通过，故列为独立任务 |
| 6 | ⏳ **`.d.ts` 复核（本轮实测，比原记录更具体）**：① tsdown 内置 `dts: true` **不是**可行路径 —— 实测它在 `lib/` 下写出了 `lib/index.ts`（0.57 kB），而不是 `lib/index.d.ts`，配置已回退；② `npx tsc -p tsconfig.json`（`emitDeclarationOnly` + `outDir lib/types`）**可以**产出 105 个 `.d.ts`，`lib/types/index.d.ts` 内容正确自洽；③ 但 `lib/types/` 顶层只有 `index.d.ts`，客户端半区的声明在 `lib/types/client/`，其中 6 个文件保留了 `import './styles/*.module.css'`，而 `src/css-modules.d.ts` 这个 ambient 声明**不会被 tsc 再产出** —— 直接发布的话，消费方解析客户端入口会因 CSS 模块 import 报错。**修法**：host 入口一行（build 里追加 `tsc -p tsconfig.json`）；client 入口需要额外把 ambient shim 一起发布，或从声明里剔除 CSS import。这属于**发布面变更**（要动 `files`/版本/发版流程），故本轮只给结论不动手 |
| 7 | ⏳ 死代码仍未清：`GripIcon`、死 CSS（`dsx-macts`/`dsx-mid`/`dsx-restore`）、空钩子。**本轮新发现一条**：host 的 `COMMANDCODE_ROUTE = 'commandcode'`（`host/usage-daily.ts`）零引用 —— 客户端自己写 `?provider=commandcode`，这个常量只是文档。删死 CSS 会让 G5 的「拼接字节全等」证据链失效（那条基线是**分层阶段**的证据），所以 CSS 清理应与 G5 基线更新一起做，而不是塞进结构提交 |
| 8 | ⏳ 不变（token 块留在原位，理由见 §13.5） |

## 16.7 反形式主义自检（最终）

| 自检 | 结果 |
|---|---|
| **A** 新增 widget 不需改中央文件 | ✅ 仍成立（生成器 + manifest） |
| **B** 新增 chart 加文件 + 注册一行 | ✅ |
| **C** 改数据源只动 data 层 | ✅ |
| **D** 改 RailWave 只进 `rail/wave/` | ✅ **本轮补齐**：RailWave 的调用方（deck 网格、放大层装配、加号面板、抽屉）在 `rail/rail-view.tsx`，其几何/测量在 `rail/measure.ts`，`client/index.ts` 里不再有 rail 视图代码 |
| **E** 改一个 widget 不影响别人 | ✅ |

## 16.8 仍然可选、但不建议现在做的

| 项 | 行数 | 判断 |
|---|---|---|
| `rail/wave/RailWave.tsx` | 1,045 | 单一交互组件（6 个内部函数 + 25 props + 4 个 rAF 循环）；可再拆 `magnify-layer`，收益中等 |
| `surfaces/config/ConfigTab.tsx` | 686 | 三个子职责（排序列表 / 字段控件 / 预览抽屉）同文件，可拆 3 个 surface 子模块 |
| `data/collector.tsx` | 502 | 可按源拆 5 个 fetcher（每源一个 `pull()`），需先定义显式接口 |
| `host/github.ts` | 449 | 凭据阶梯 / GraphQL / HTML 抓取 / 仓库脉冲四段，可再分；当前是单一渠道，尚可 |
| 装 `@types/node` 等 | — | 消掉约 20 条既有 tsc 错误；需要一次可用的 `pnpm install` |

## 16.9 结论（第二轮）

- §12 的 1–4 项（两份计划缺口 + host 单文件 + 契约混装）**全部落地**；`client/index.ts` 从 3,795 → **308**（−92%），
  host 从 1,077 → **31**，全仓最大手写文件回到 `RailWave.tsx` 1,045。
- 每一处都是**可证搬运**：2.9 逐行 3 处差异、2.6b 485/485 重放相等、host 新旧 bundle 14 案例指纹全等、
  contract 靠 G4/G2 兜住；并且这轮**真的跑了 live 探针**（11/11、19/19、逐帧 0.0255），不再只靠字节推断。
- 闸门从 6 个变成 7 个（+G7 host 路由契约），并且顺手修好了 G4 的幽灵产物漏洞与 G3 的容忍漏洞 ——
  这两个漏洞都属于「闸门看起来绿、其实什么都没测」这一类，比缺闸门更危险。
- 仍未完成的都是**独立缺陷或可选拆分**，且每条都写清了修法与代价（§16.6 / §16.8）—— 其中 §12 #5–#8 四项已在
  **§17** 全部做掉。

---

# 17. 第三轮：把 §12 剩下的四项独立缺陷也做掉

第二轮把「结构缺口」清完了；§16.6 列的四项（tsc 错误、`.d.ts`、死代码、token 层）当时**只复核没动手**，
因为其中两项属于发布面。这一轮全部完成，并且每一项都带新的验证手段。

## 17.1 本轮提交

| 提交 | 内容 | 关键证据 |
|---|---|---|
| `db59bb5` | **§12 #5** 类型错误 35 → **0** | 装 `@types/node` + `@types/react-dom`（13 条）；新增 `src/client/slots-service.d.ts` 声明运行时 `slots` 服务（8 条）；修 22 条真实代码错误。G3 从「不恶化」升级为**必须 0 错**，`pnpm check` 全绿 |
| `7b7e531` | **§12 #7** 死代码 | badge 整条链（`badgeOf` 无调用者、`widgetBadgeLabel` 只被它调、14 个单元的 `badgeLabel` 只喂给它、词典键 4 条）+ `GripIcon` + `COMMANDCODE_ROUTE` + 3 条死 CSS。**副作用：`contract/helpers.ts` 不再 import i18n，整个契约彻底零依赖** |
| `a8e3094` | **§12 #8** token 层 | 两块 `:root` 提到 `styles/tokens.module.css`；逐 sheet 证明是「两条规则的纯置换」（未动的 sheet 字节相同、动的两个去掉各自 token 后字节相同、顺序保留） |
| `78bce88` | **§12 #6** 发布 `.d.ts` | `scripts/build-types.mjs` 产出 106 个声明（tsdown 的 `dts:true` 实测只会吐 `lib/index.ts`，走不通）+ `lib/types/client/css-modules.d.ts` 与引用头；`npm pack --dry-run` 确认进包 |

## 17.2 本轮新增的两个闸门与一处闸门升级

| 闸门 | 作用 | 故意破坏验证 |
|---|---|---|
| **G8** `scripts/verify-published-types.mjs` | 建一个临时消费方（`node_modules/dsh-widgets` 是指向本仓库的 junction）导入两个入口，`skipLibCheck: false` 编译：走的是**真实 `exports` 映射**，声明里任何未解析的 import 都是错误 | ✅ 第一次运行就抓到 `/// <reference>` 指向了不存在的同级文件 |
| G3 | 基线**清空**（0 容忍）：任何类型错误都红 | 0 错即硬门 |
| G5 | 基线按 token 置换重录，并用 `--write` 之外的独立脚本证明「新旧 CSS 的差 = 恰好那两条规则」 | — |

## 17.3 §16.6 四项的最终状态

| # | §16.6 当时的结论 | 现在 |
|---|---|---|
| 5 | ⏳ 35 条，真修法是装类型包；`pnpm install` 不通过 | ✅ **0 条**。顺带查明 `pnpm install` 失败的原因：`.modules.yaml` 里记的虚拟仓库还是旧目录名 `harness-widgets`，一次重装即修好（现在 `pnpm install` 8 秒可用） |
| 6 | ⏳ 只能给结论不动手（发布面） | ✅ 已发布面落地：声明产物 + css-modules shim + 新闸门 G8；`files` 里的承诺不再落空 |
| 7 | ⏳ 死代码未清（含新发现的 `COMMANDCODE_ROUTE`） | ✅ 全部清除；「7 个空钩子」一条**已不可复现**（grep 空函数体与空 useEffect 均无命中），从清单里划掉 |
| 8 | ⏳ token 块留在原位（§13.5 的取舍） | ✅ 提成 `tokens.module.css`，并用「逐 sheet 等价」替代「拼接字节全等」作为证据 |

## 17.4 第三轮后的最终数字

```text
src/                        15,033 行 / 113 文件
  client/index.ts              308      （起点 3,795，−92%）
  host/ (10 文件)              31 + 1,072
  rail/{rail-view,measure}     612 / 538
  lib/contract/{types,helpers} 664 / 80   ← 两者都零 import
  styles/ (6 文件, 含 tokens)  ~1,900
最大手写文件                    rail/wave/RailWave.tsx 1,045（可选拆分，非缺陷）
闸门                            8 个离线（G1–G8）+ 1 个 CI 内（verify-sysinfo）+ 一组 live 探针
类型错误                        0
```

新增文档：**`docs/architecture/CODE_MAP.md`** —— 「我要改 X，去哪儿」的完整地图（含由
`git ls-files` 生成的目录树、单元解剖、四层公共代码的边界、右栏显示链路与按钮归属、放大波算法拆解、
设置面、数据流、样式与国际化、闸门清单、以及「改的时候别破坏的 9 条不变量」）。


