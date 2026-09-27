# REFACTOR_PLAN — dsh-widgets 架构级重构（行为保持型）

状态：**待批准**。本文件是 Phase 0 的产出（架构审计见 `CURRENT_ARCHITECTURE.md`）。
在用户明确批准之前，**不改动任何 `src/` 文件**。

性质：**Architecture Refactor, Not Feature Rewrite**。
禁止顺手改 UI / spacing / 颜色 / 动画 / 数据格式 / 排序 / 默认值 / 响应式 / skeleton / 错误语义。
唯一例外：修复 §17 中已明确登记的缺陷（且必须单独提交）。

---

## 0. 判断标准（先写清楚"什么叫成功"）

不用"拆了多少文件"判断成功。用下面五问判断，每阶段结束必须用实测回答：

| # | 问题 | 当前答案 |
|---|---|---|
| A | 新增一个 Widget，是否只需 `新目录 + manifest + 实现`？ | 例外 5 处（`CURRENT_ARCHITECTURE.md` §16） |
| B | 新增一种 Chart，是否只需 `新增 renderer + 注册`？ | **否**（508 行 if 链 + `stretchChart` 白名单） |
| C | 修改 CC 数据源，是否只影响 `data/cc/*`？ | **否**（最少 4 个文件） |
| D | 修改 RailWave，是否只需进入 `rail/wave/*`？ | **否**（3,795 行文件内 `704-1597`，依赖同文件 6 个闭包函数） |
| E | 修改一个 Widget，是否不会波及其他 Widget？ | 是（已达标，无 widget↔widget 依赖） |

目标：A/B/C/D 全部变"是"（第 5 类"新数据源"除外，见 §10 非目标）。

---

## 1. 两条铁律（贯穿全部阶段）

1. **不新建垃圾桶文件**：禁止 `utils.ts` / `common.ts` / `helpers.ts` / `misc.ts`。
   每个新文件的准入条件是：它有**单一可解释的主职责** + **稳定的对外接口** + **独立的变化原因**。
2. **不做机械切文件**：任何拆分必须能回答"这个新边界解决了什么变化原因"。
   答不出来就**不拆**（本计划已明确列出"不拆"的清单，见 §7）。

---

## 2. 目标结构（按真实职责推导，不是照搬示例目录）

```text
src/
├── index.ts                        # host：只做 compose（注册 modules）
├── host/
│   ├── http/{memo.ts,route-error.ts,body.ts}      # memoTtl / RouteError / readBody
│   ├── routes/{opencode.ts,commandcode.ts,github.ts,usage-daily.ts,sysinfo.ts,state.ts}
│   └── state-file.ts                              # $DSH_HOME 状态文件读写（原子写）
├── widgets/<id>/{manifest.json,index.ts,…}        # 40 个单元（不动结构）
├── widgets-template/
└── client/
    ├── index.ts                    # apply()：只做 compose + mount（目标 < 300 行）
    ├── contracts/
    │   ├── types.ts                # 纯类型（contract.ts 23-479 + 509-678）
    │   ├── widget.ts               # defineWidget + resolvers（无 i18n 依赖）
    │   └── render.ts               # WidgetRenderOut / WidgetChart / ChartRenderer
    ├── runtime/
    │   ├── bridge.ts               # state + listeners + emit + subscribe + useBridge
    │   ├── prefs.ts                # DEFAULTS / normalizePrefs / load / save / flush
    │   ├── host-sync.ts            # /api/widgets-state 同步 + storage / visibility / pagehide
    │   └── slots.ts                # 4 个槽位注册（薄）
    ├── data/
    │   ├── collector.tsx           # composer.dock 采集器组件
    │   ├── opencode.ts  commandcode.ts  usage-daily.ts  github.ts  sysinfo.ts
    │   ├── sources.ts              # 数据源清单（由 registry 元数据派生）
    │   └── session-stats.ts        # deriveStats / deriveTrajectory / timelineTime（纯函数）
    ├── layout/
    │   ├── geometry.ts             # resolveRailSpace / resolveRailLayout / card side 上下界（纯）
    │   ├── measure.ts              # RO / 宽度追踪 / railBudget 发布（含唯一完整 dispose）
    │   └── host-vars.ts            # CSS 变量写入的唯一写者
    ├── rail/
    │   ├── wave/{RailWave.tsx,wave-math.ts}       # 动画组件 + 纯几何
    │   ├── deck.tsx                # 静态网格 + add 面板 + 抽屉
    │   └── card-host.tsx           # RailItem 折叠 + cardBodyFor
    ├── render/
    │   ├── CardBody.tsx  SkeletonBody.tsx
    │   ├── blocks/{ActionsBlock.tsx,RichBlock.tsx}
    │   ├── charts/{registry.ts, theme.ts, bars.tsx, barsV.tsx, lanes.tsx, quotas.tsx,
    │   │            segments.tsx, rings.tsx, ring.tsx, line.tsx, figures.tsx, heatmap.tsx}
    │   └── preview/{preview-stats.ts, sim.ts}
    ├── families/                   # 家族共享渲染层（原 client/lib/*-view.ts）
    │   ├── cc/{payload.ts, pool.ts, plan.ts, format.ts, renders.ts}
    │   ├── sys/{data.ts, config.ts, renders.ts}
    │   ├── github/{preview.ts, select.ts, renders.ts}
    │   └── usage/{view.ts, renders.ts}
    ├── surfaces/
    │   ├── WidgetsPage.tsx  SettingsPanel.tsx
    │   ├── config/{ConfigTab.tsx, ConfigFieldControl.tsx, MetricsFieldControl.tsx, OrderList.tsx}
    │   └── market/{MarketTab.tsx, ZoomGhost.tsx}
    ├── i18n/{index.ts, shell-zh.json, shell-en.json}
    └── styles/{tokens.css, primitives.css, rail.css, card.css, panel.css, market.css}
```

### 明确**不**创建的目录（反垃圾桶）

| 不建 | 理由 |
|---|---|
| `utils/` `common/` `helpers/` `shared/` `misc/` | 垃圾桶 |
| `core/` | 无内容可放；职责已由 `contracts` / `runtime` 表达 |
| `hooks/` | 全仓只有 `useBridge` 一个 hook，跟着 `runtime/bridge.ts` 走 |
| 每个 widget 一个 `client/` 子目录 | widget 不拥有框架能力（见 §10 非目标） |
| `families/*/index.ts` barrel | 会制造隐式耦合，直接 import 具体文件 |

---

## 3. Phase −1：冻结基线 + 建立最小安全网（**新增阶段，必须最先做**）

不做这一步，后面每一步都**无法验证**——当前既没有可回滚的基线，也没有能发现行为改变的闸门。

### 3.1 冻结基线

| 步骤 | 内容 |
|---|---|
| 1 | 把当前 23 个已修改 + 11 个未跟踪全部提交（github 五件套、`harness-board`、`peak-pricing/holidays.ts`、`github-view.ts` 等），或按用户意愿先发 v1.7.0 再提交 |
| 2 | 记录基线产物：`lib/client.js` 与 `lib/index.js` 的 sha256 + 字节数、`lib/` 文件清单、`tsc --noEmit` 的 34 条错误全文 |
| 3 | 打基线 tag（例如 `refactor-baseline`），使"任何时刻可回到 before" |

### 3.2 四项最小安全网（这是本计划最关键的工程投资）

| # | 闸门 | 类型 | 覆盖什么 |
|---|---|---|---|
| G1 | `node scripts/gen-registry.mjs --check` | 离线、已有 | 注册表 + manifest 契约不漂移 |
| G2 | `node scripts/validate-widget-unit.mjs src/widgets/<id>`（逐个 40 个） | 离线、已有但未接入 | 单元契约与文案完整 |
| G3 | **`node scripts/verify-tsc-baseline.mjs`（新写）** | 离线 | 跑 `tsc --noEmit`，把错误**集合**（文件+行+码）与基线比对；**规则 = 不得出现基线之外的新错误**（既有的 34 条允许存在，修复它不在本次范围） |
| G4 | **`node scripts/snapshot-render.mjs`（新写）** | 离线 | **本次重构的核心回归网**：不加载 React、不碰 DOM，直接对 40 个单元 × 每个 size × 每个 `example`/`sim` 状态调用 `render(PREVIEW_STATS, {size, sim})`，把返回的 `WidgetRenderOut` **结构化序列化为 JSON 快照**并逐字段 diff。契约是纯数据（见 `CURRENT_ARCHITECTURE.md` §6），所以这条路离线可跑，用 `node --experimental-strip-types`（`docs/verify-i18n.mjs` 已在用） |
| G5 | **`node scripts/extract-css.mjs`（新写）** | 离线 | 从 `lib/client.js` 中抽出 lightningcss 编译后的 CSS 文本并 sha256；**CSS 分层阶段必须字节级一致**（CSS 编译结果只取决于声明内容，与源文件切分无关，因此这是可证伪的硬不变量） |

> G4 是唯一能证明"widget 渲染输出未变"的手段；G5 是唯一能证明"CSS 拆分视觉零变化"的手段。
> 两者都必须**先证明它们能抓到故意制造的破坏**（把某个 `value` 改一位、把某个 CSS 声明改 1px，
> 确认闸门变红），否则不算安全网——这是本阶段的验收标准。

### 3.3 在线闸门（尽力而为，非硬门）

| 闸门 | 前置 | 用途 |
|---|---|---|
| `node docs/verify-sysinfo.mjs` | 无（已在 CI） | host sysinfo 链路 |
| `node --experimental-strip-types docs/verify-i18n.mjs` | 无 | i18n 键完整 |
| `node docs/verify-skeleton-shapes.cjs`（先修 §17 的过期 `BUILTINS`） | 需 live :3080 + 重建 | Phase 1 骨架元数据下沉的端到端证据 |
| 现有 `scripts/verify-release-smoke.cjs` / `docs/probe-github.mjs` | 需 live :3080 | 端到端冒烟 |

**Phase −1 出口条件**：G1–G5 全绿 + 两条故意破坏都被抓到 + 基线 tag 存在。

---

## 4. Phase 1：运行时元数据下沉到 manifest

**目标**：消灭中央清单 #1 / #2 / #3（`CURRENT_ARCHITECTURE.md` §4）。

| 步骤 | 内容 | 文件 |
|---|---|---|
| 1 | `manifest.json` 新增 `source`（`usage\|cc\|sys\|github`，可选）与 `skeleton`（`{shape, count?}`，可选） | 24 个单元的 manifest |
| 2 | `gen-registry.mjs` 增加字段校验（值域 + 类型），并对未知顶层 key **报错而不是静默忽略** | `scripts/gen-registry.mjs:96-132` |
| 3 | 生成器多输出 `WIDGET_RUNTIME: Record<string, {source?, skeleton?}>` | `gen-registry.mjs:183-216` |
| 4 | 删除 `WIDGET_SOURCE`（610-617）与 `SKELETON_SHAPE`（634-668），改读 `WIDGET_RUNTIME` | `client/index.ts` |
| 5 | `SYS_WIDGET_IDS`（`sys-view.ts:19`）改为由 `source === 'sys'` 派生 | `sys-view.ts` + `index.ts:19` 调用点 |
| 6 | 顺手删除零引用的 `STATS_WIDGET_IDS` 生成（或补上使用点——**默认删，因为它零引用**） | `gen-registry.mjs` |

**风险**：生成器对 `index.ts` 只有正则能力（`100-117`）；manifest 无 JSON Schema；`sizes` 仍是双份
（本次**不动**，因为改它会动运行时 `sizesOf()` 语义）。

**出口**：G1/G2/G3/G4 全绿；`docs/verify-skeleton-shapes.cjs` 全绿；19 个有源卡片的骨架轮廓截图与基线一致。

---

## 5. Phase 2：拆 `client/index.ts`（3,795 行 → 组合根）

按"机械搬运优先、接口工程靠后"排序。**每一步都是独立提交**，各自跑完闸门再进下一步。

| 步 | 迁出内容 | 新落点 | 是否机械 | 风险 |
|---|---|---|---|---|
| 2.1 | `deriveStats` / `deriveTrajectory` / `timelineTime` / `Stats`（1727-1843） | `data/session-stats.ts` | **是**（纯函数，无 DOM） | 低 |
| 2.2 | `DEFAULTS` / `normalizePrefs` / `normalizeInstance` / `loadState` / `loadSavedAt` / `putState` / `saveState` / `flushPendingState`（459-479、1602-1724） | `runtime/prefs.ts` + `runtime/host-sync.ts` | **是**（消掉 3 个模块级 `let`） | 低 |
| 2.3 | nav 图标 shim（3740+） | `rail/nav-glyph.ts` | **是**（接口 `{mark, dispose}`） | 低 |
| 2.4 | `RailWave` + `RailWaveProps`（704-1597） | `rail/wave/RailWave.tsx` | **否**：必须把 6 个闭包函数（`railElement` / `hitLayout` / `onCard` / `moveRailFocus` / `leaveRail` / `nearSurface`）与 7 个常量以 props 或 `WaveDeps` 注入；25 个 props 保持不变 | **中**（本阶段最高价值 + 最高风险） |
| 2.5 | 采集器（2502-2962） | `data/collector.tsx` | **否**：需注入 `setState` / `subscribe` / `runCommand`；按源拆 5 个文件（`opencode.ts` / `commandcode.ts` / `usage-daily.ts` / `github.ts` / `sysinfo.ts`），各自只导出 `pull(snapshot): Promise<Partial<BridgeSnapshot>>` | 中 |
| 2.6 | 布局 / 测量（94-416、1979-2465） | `layout/{geometry,measure,host-vars}.ts` | **否**：必须先定义显式 `RailGeometryHost`（`railBudget` 被 1876/2484/3164 读、2110 写；`drawerEl` 由 3702 写、E4 读）；几何函数保持纯 | **高**（`3158` 注释记录过双写事故） |
| 2.7 | 面板几何纯函数（3372-3496） | `rail/wave/wave-math.ts` 或 `rail/panel-geometry.ts` | **否**：闭包捕获 12 个外部值，需改为显式参数对象 | 中 |
| 2.8 | 4 个槽位注册（2476 / 2503 / 2973 / 3709） | `runtime/slots.ts` | 是（薄） | 低 |
| **2.9** | **右栏槽位体：deck 网格 / 加号面板 / 抽屉（`conversation.input.overlay`，约 515 行）** | **`rail/rail-view.tsx`（`createRailView(deps)` 工厂）** | **否**：与 2.5 采集器同型——需要 `{ prefs/state 的 getter、setPrefs、测量函数、wave geometry、CardBody、RailWave }` 注入 | **中高** |

> **2.9 是本计划的缺口**：Phase 0 审计把它标为 E7（2964-3706），但阶段表原先只排了 measure（2.6）与几何（2.7），漏了「谁把 deck 画出来」。已补入。
> 参考实现：Phase 2.5 的 `data/collector.tsx` 是同一模式的已验证样本——**可变绑定走 getter、稳定函数直接传、组件在 inject 回调内创建**（组件身份必须每次注册都新建，因为它的 mount/unmount 就是「有会话存在」的信号）。

**明确不拆**（只切文件无收益、或会制造跨模块可写全局）：
- header 胶囊槽位（2476-2500）
- body class 三个 effect（3763-3793）
- `syncWithHost`（1887-1914）——它直写 `prefs:1903` 并 `emit`，抽出去只会制造跨模块可写全局

### 2.10 Phase H：host `src/index.ts`（1,076 行）—— 计划外的第二块

目标结构里有 `host/` 却没有对应阶段，同样是本计划的缺口。7 条路由与全部抓取/聚合在一个文件里：

| 步 | 迁出内容 | 落点 |
|---|---|---|
| H1 | `memoTtl` / `RouteError` / `readBody` | `host/http/` |
| H2 | Command Code 通道（四端点 × ≤4 key 聚合 + memo） | `host/routes/commandcode.ts` |
| H3 | GitHub 通道（凭据三级阶梯 + GraphQL/HTML 抓取 + 5 个分级 memo） | `host/routes/github.ts` |
| H4 | OpenCode 两条路由 + `usageCenter` 适配 | `host/routes/opencode.ts` / `usage-daily.ts` |
| H5 | `sysinfo`（闭包缓存 + 环形缓冲） | `host/routes/sysinfo.ts` |
| H6 | 状态文件读写（tmp+rename 原子写） | `host/state-file.ts` |
| H7 | 路由注册表 | `src/index.ts` 只剩 compose |

出口：host 侧每条路由一个模块；**G4/G5 与 host 无关，host 的回归只能靠 `docs/verify-sysinfo.mjs`（离线可跑）与 §3.3 的在线探针**——所以这一步必须等 live `dsh web` 可用时再做，比 2.9 更需要实测。

**出口**：`client/index.ts` ≤ 400 行且只剩 compose + mount；`apply()` 内不再有 `prefs` / `state` 之外
的共享闭包状态；G1–G5 全绿；RailWave 的逐帧证据（`scripts/diag-morph-frames.cjs` HEADFUL=1）maxFrameStep
与基线同量级。

---

## 6. Phase 3：拆 `components.tsx`（2,297 行）+ Chart registry

| 步 | 迁出内容 | 新落点 | 是否机械 |
|---|---|---|---|
| 3.1 | `Prefs` 接口（155-188）+ `WidgetsController`（191-209） | `runtime/prefs.ts` / `runtime/controller.ts` | 是（**消掉唯一一条反向依赖**：`client/index.ts:20`） |
| 3.2 | 预览常量与模拟（62-152、256-273） | `render/preview/*` | 是 |
| 3.3 | 图表配色与 lane 常量（293-335） | `render/charts/theme.ts` | 是 |
| 3.4 | **ChartBlock → registry**（337-844） | `render/charts/*.tsx` + `registry.ts` | **是（逐分支搬）+ 一处非机械** |
| 3.5 | `ActionsBlock` / `RichBlock`（846-872） | `render/blocks/*` | 是 |
| 3.6 | `SkeletonBody`（874-955）、`CardBody`（957-1164） | `render/*` | 是 |
| 3.7 | `OrderList` / `ConfigFieldControl` / `MetricsFieldControl` / `ConfigTab`（1166-1797） | `surfaces/config/*` | 是（`MetricsFieldControl` 的 ref/FLIP 对渲染时机敏感，**禁止顺手"清理"**） |
| 3.8 | `ZoomGhost` / `MarketTab`（1799-2198） | `surfaces/market/*` | 是 |
| 3.9 | `WidgetsPage` / `Slider` / `Row` / `SettingsPanel`（2200-2297） | `surfaces/*` | 是 |

### 3.4 的非机械部分（Chart registry 的正确形态）

```ts
// render/charts/registry.ts —— 12 行，不是 508 行 if 链
export type ChartProps = { chart: WidgetChart; side: number; width?: number; pad?: number }
const RENDERERS: Partial<Record<WidgetChart['kind'], (p: ChartProps) => React.ReactElement | null>> = {
  bars: BarsChart, barsV: BarsVChart, lanes: LanesChart, /* … 10 项 */ 
}
export const renderChart = (p: ChartProps) => RENDERERS[p.chart.kind]?.(p) ?? null
```

三条硬约束：
1. **`WidgetChart` 的 payload 字段全是可选且不按 kind 收窄**（`contract.ts:363-433`），所以
   registry **无法**从 kind 推出 payload——每个 renderer 必须自带原来的守卫（`&& chart.bars` 等），
   并保留 `return null` 语义。
2. 每个分支必须**逐字搬运**，不动任何数值；React 元素树同构 ⇒ 输出一致。
3. `stretchChart`（`1091`）不能留在 `CardBody` 里：改为 registry 元数据（如 `FILL = new Set(['line','lanes'])`），
   否则新增弹性图仍要改 `CardBody`。

**出口**：`components.tsx` 消失（职责全部落到 `render/` + `surfaces/`）；新增 chart = 加一个文件 + registry 一行；
G1–G5 全绿 + `docs/verify-*` 图表相关探针全绿。

---

## 7. Phase 4：拆家族 monolith（`client/lib/*-view.ts`）

**只在存在明确职责边界时拆**。每个家族统一为 `data` / `render` 两半（`cc` 另拆 `plan`，因为套餐额度表
有独立变化原因：Command Code 改套餐时只动它）。

| 原文件 | 行 | 拆为 | 依据 |
|---|---|---|---|
| `cc-view.ts` | 760 | `families/cc/{payload.ts(36-52), pool.ts(54-307), plan.ts(390-524,655-703), format.ts(309-388), renders.ts(526-760)}` | 5 个独立变化原因：宿主载荷 / 多池聚合 / 套餐定价表 / 文案单位 / 卡片形状 |
| `sys-view.ts` | 310 | `families/sys/{data.ts(27-95,97-173), renders.ts(198-310)}` | **并把模块级可变 `clientHist:34` 搬进 data 层**（当前是"view 里藏着状态"，静态单例跨实例泄漏） |
| `github-view.ts` | 216 | `families/github/{preview.ts(161-215), select.ts(33-59), renders.ts(61-159)}` | 预览数据生成器（LCG 造 371 天）是纯数据，不该住在展示模块 |
| `usage-view.ts` | 121 | `families/usage/{view.ts(17-54), renders.ts(56-118)}` | 同构 |

**不做**：不为每个 widget 单独建文件。`cc-window-5h/weekly/monthly` 三个单元共享 `ccWindowValueRender(key)`
工厂——这个工厂是**正确的复用**（相同语义、相同变化原因），保留。

**出口**：任一家族内「改数据」与「改展示」互不触碰；G1–G5 全绿。

---

## 8. Phase 5：CSS 分层

前提：**G5 字节级不变量必须在每一步都绿**（编译后 CSS 文本 sha256 不变）。
机制提醒：每个被 import 的 `.module.css` 会各自注入一个 `<style data-plugin-css>`（`tsdown.config.ts:100-120`），
**标签顺序 = import 顺序 ⇒ 跨文件搬动会改变层叠顺序**。

| 层 | 落点 | 内容 |
|---|---|---|
| design tokens | `styles/tokens.css` | 仅自有变量：`--dsx-nav-glyph`(112)、`--dsx-rail-right`(267)、wave 延迟(523-534)、`--dsx-market-motion` 默认值。**19 个官方 `--dsw-*` 不做镜像** |
| framework primitives | `styles/primitives.css` | btn / navbtn / dot / switch / search / select / tab / ring / badge / trash / drawer-close / metric / drop 指示条（1203-1400） |
| component styles | `styles/{rail,card,panel,market}.css` | rail+slot+wave+magnify(261-560)、card+sk(18-260、1449-1468)、addpanel+config(601-844、1315-1449)、market(844-1203) |
| widget-specific | 各单元 `index.module.css`（已支持，0 使用） | **本轮为空**——真正的 widget 专属样式今天全是 TS 内联 style，且几何值由 `scale = side/150` 算出，**不可**下沉为静态 CSS（会改像素） |

三条硬约束：① 只搬选择器、不改任何声明值与顺序，且保持原有相对先后（如 313-320 的 reduced-motion 覆盖 311）；
② 保持全局（非 module）语义——`index.ts` 用字面量 class 操作 DOM；③ 5 个上游外部钩子
（`[data-conversation-scroll]`、`[data-phase='active']`、`[class$='_centerCol']`、`body[data-dsh-sidebar-dragging]`、`[data-yielded]`）位置不变。
④ 既有全局层**不要**改成 CSS Modules（JS 用字符串写类名，失败不会类型报错）；**新代码**用 `index.module.css`。

**出口**：CSS 文本 sha256 一致 + 视觉截图（`docs/verify-skeleton-shapes.cjs` 与 rail 截图）一致。

---

## 9. 每阶段通用验收闸门

```bash
# 离线硬门（每步必跑）
node scripts/gen-registry.mjs --check
node scripts/validate-widget-unit.mjs src/widgets/<每个改动单元的 id>
node scripts/verify-tsc-baseline.mjs      # 基线之外不得有新错误
node scripts/snapshot-render.mjs --check  # 40 单元 × 每 size × 每 sim 状态
node scripts/extract-css.mjs --check      # Phase 5 尤其必跑
pnpm run build

# 在线闸门（涉及 rail / 图表 / 骨架时必跑）
node docs/verify-sysinfo.mjs
node --experimental-strip-types docs/verify-i18n.mjs
node docs/verify-skeleton-shapes.cjs
node docs/probe-github.mjs                # 代表性端到端
```

外加**人工 diff review**：每个阶段必须只有"搬移 + 接口参数化"，diff 中不允许出现数值/文案变化。

---

## 10. 明确不做（非目标）

| 不做 | 理由 |
|---|---|
| 新增任何 widget / chart / 数据源 | 本次是架构重构，不是功能开发 |
| 改 `WidgetSize` / 增加 4×4 | 需求变更，不属于重构 |
| 把 host 的类型与 client 的类型统一 | 当前的"手工双份"是**有意**的（node 半区不 import web 半区），统一会引入跨越半区的依赖 |
| 让 widget 自带任意 React / 自带 chart renderer | 会让框架失去"卡片形状可控"的性质；正确方向是**框架 registry + 契约扩展点**，widget 只声明数据 |
| 为 widget 建 per-widget 的 client 目录 | 同上 |
| 修 `tsc` 的 34 条既有错误 | 独立任务（且需要装 `@types/node` / `react-dom` 类型）；混进来会让本重构的 diff 无法评审。**但 G3 会保证它不恶化** |
| 修 §17 的死代码 / 乱码 / 死 CSS | 单独提交，不混入结构提交。乱码用 `edit` 工具逐处修，**禁止** PowerShell 文本往返 |
| 动 `website/` | 它手工镜像了 widget 常量；行为保持型重构不改常量 ⇒ 官网无需改（`website/verify.mjs` 校验的是官网自己那份 `grammar.js`，测试名里的 "matches src/client/index.ts" 只是散文引用，不是源码解析） |
| 改 `docs/verify-discovery.cjs` 的过期列表 | 属于安全网修补，放进 Phase −1 |

---

## 11. 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| 无单测 + 探针不可复现 ⇒ 重构无安全网 | **高** | Phase −1 G3/G4/G5；G4 必须先用"故意破坏"验证它能变红 |
| `railBudget` / `drawerEl` / `frameEl` 跨段共享 + 双写历史事故 | **高** | 2.6 先立显式 `RailGeometryHost` 接口，再搬；`host-vars.ts` 做唯一写者 |
| RailWave 25 props + 6 闭包函数耦合 | 中 | 2.4 单独一步、单独提交，逐帧证据（`scripts/diag-morph-frames.cjs`）与基线比对 |
| CSS 跨文件搬动改变层叠顺序 | 中 | G5 字节级不变量 + 保持原相对先后 |
| 生成器正则能力有限 | 中 | Phase 1 只下沉**静态枚举**（`source` / `skeleton`），不动 `sizes` 双份机制 |
| `lib/` 被 git 跟踪 ⇒ 每次重建产生不可评审的大 diff | 中 | 评审只看 `src/`；`lib/` 的提交统一放在每个阶段的最后一次提交 |
| `tsdown` 的 `clean:true` 在 node 配置里 | 低 | 不动 `export default` 数组顺序；写进 `CURRENT_ARCHITECTURE.md` §13 备查 |
| 发布包缺 `.d.ts` | 低 | 独立任务，不属本次 |

---

## 12. 提交策略

每个子步骤一个提交，提交信息格式 `refactor(<area>): <move|extract|interface> — 无行为变化`，
且每个提交必须：G1–G5 全绿 + `lib/` 同步重建。**禁止**把多个阶段压进一个提交。
预期提交数：Phase −1 ≈ 3、Phase 1 ≈ 2、Phase 2 ≈ 8、Phase 3 ≈ 4、Phase 4 ≈ 4、Phase 5 ≈ 3（共 ~24 个）。

---

## 13. 完成后的 `ARCHITECTURE_REFACTOR_REPORT.md` 骨架（Phase 6 产出）

按用户要求，完成后输出该报告，含：Before/After 架构、文件职责变化、最大文件变化、
依赖方向、Widget 注册流程、Chart 注册流程、数据源架构、CSS 架构、保持不变的行为、build/test 结果、
尚未处理的问题，外加 **Top 10 最大源文件表**（每个含 行数 / 职责 / 为何仍是这个尺寸 / 是否建议继续拆）。

---

## 14. 待用户决策的四个问题

1. **基线怎么冻**：先发 v1.7.0 再提交当前 23+11 个改动，还是先提交（不发版）再重构？
2. **Phase −1 的安全网是否接受**：G4（render 快照）+ G5（CSS 字节级）是本计划的两块基石，
   但需要新写两个脚本（各约 80–150 行）。若不做，Phase 2/3/5 将没有可证伪的验收依据。
3. **`tsc` 的 34 条既有错误**：本次只保证"不新增"（G3），还是顺带修掉（会扩大 diff、需要加类型依赖）？
4. **执行方式**：本次重构周期较长（~24 个提交），是要我逐阶段推进并在每阶段结束**停下来给你看证据**，
   还是一次性推进到底（仅在接受不到反馈时按计划走完）？
