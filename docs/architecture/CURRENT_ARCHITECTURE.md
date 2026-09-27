# CURRENT_ARCHITECTURE — dsh-widgets（Phase 0 架构审计）

审计日期：2026-09-24　｜　范围：`dsh-widgets` 全仓（host 半区 + client 半区 + 构建/注册/校验管线）
性质：**只读审计**。本文件不修改任何源码，不改行为。
方法：4 个独立只读审计并行拆解（client/index.ts、components.tsx + CSS、数据层 + host、注册链 + 管线），
主 agent 交叉复核全部关键结论并实测基线（tsc 错误数、lib 产物、依赖 grep、编码检查）。

行号 = 审计当时的工作区实数。注意：`Get-Content | Measure-Object -Line` 会漏算空行，本文件所有行数
用 `.Count` 实测；编码检查必须显式按 UTF-8 读，PowerShell 默认编码会伪造约 248 行幻影乱码。

---

## 1. 规模总览（src，实测）

| 区域 | 行数 | 占比 | 说明 |
|---|---|---|---|
| `client/index.ts` | 3,795 | 26.8% | 单文件；God Object（见 §15） |
| `client/components.tsx` | 2,297 | 16.2% | 卡片渲染 + 组件配置页 + 市场页 + 设置页 |
| `client/widgets.module.css` | 1,468 | 10.4% | 全仓唯一样式表 |
| `src/index.ts`（host） | 1,077 | 7.6% | 7 条路由 + 全部抓取/聚合逻辑，零本地 import |
| `client/lib/*`（9 个文件） | 2,907 | 20.6% | 家族视图 + 契约 + 格式化 + 记账 |
| `widgets/*`（40 个单元） | 1,547 | 10.9% | 40 × (`manifest.json` + `index.ts`)，几乎全薄 |
| `client/generated.registry.ts` | 686 | 4.9% | 生成物 |
| `client/i18n.ts` | 321 | 2.3% | shell 词典（144 键）+ locale 服务适配 |
| `widgets-template/` | 34 | 0.2% | 模板（不在扫描根内） |
| **合计** | **14,137** | 100% | |

**最刺眼的一个数**：`client/index.ts` + `components.tsx` + `widgets.module.css` = **7,560 行 = 53.5%**，
全部压在三个文件里。目录模块化是真的，实现集中也是真的。

---

## 2. Runtime architecture（谁负责什么）

打包产物只有两个（`tsdown.config.ts`）：

```text
src/index.ts        --(node, ESM)-->   lib/index.js   35.5 KB   host 半区：cordis 插件，注册 HTTP 路由
src/client/index.ts --(cjs closure)--> lib/client.js 431.8 KB   client 半区：window.__ModuleLoader__.load({id,factory})
                                                               + client.js.map 827 KB
```

client 半区的平台模块（react / react-dom / cordis / ui-slots / web-react）为 external，其余全内联成单文件，
**没有 chunk 分割**。

```text
                    ┌──────────────────── host（同源 HTTP，7 条路由）────────────────────┐
                    │ /api/opencode-usage  /api/opencode-usage-multi                    │
                    │ /api/commandcode-usage   /api/widgets-usage-daily                 │
                    │ /api/github   /api/widgets-state   /api/sysinfo                   │
                    └───────────────────────────────┬───────────────────────────────────┘
                                                    │ fetch（轮询 + turn settle）
   ┌────────────────────────────────────────────────▼──────────────────────────────────┐
   │ client/index.ts · apply(ctx)                                                      │
   │  ├─ bridge 状态机（state / prefs / listeners / emit / subscribe）                  │
   │  ├─ 采集器  → composer.dock 槽位                                                  │
   │  ├─ RailWave + deck + 放大 overlay → conversation.input.overlay 槽位              │
   │  ├─ header 胶囊 → conversation.session.header.utilities 槽位                       │
   │  ├─ 组件配置页 / 市场页 / 设置行 → settings.section 槽位                          │
   │  └─ nav 图标 shim + body class 开关                                               │
   └───────────────┬───────────────────────────────────────────────────────────────────┘
                   │ generated.registry(WIDGETS) + lib/contract(WidgetRenderOut)
                   ▼
        widgets/<id>/index.ts  --render(stats, {size,sim})-->  WidgetRenderOut（纯数据）
                   │
                   ▼
        components.tsx · CardBody/ChartBlock（唯一把数据变成像素的地方）
```

依赖的外部服务：`slots`（4 个槽位注入）、`locale`（可选绑定）、`remote`（可选，跑命令）、
`credentials`（host 侧，读 API key）。

---

## 3. Widget lifecycle（10 步，含证据）

| # | 阶段 | 位置 | 说明 |
|---|---|---|---|
| 1 | 定义 | `lib/contract.ts:682` `defineWidget()` | 40 个单元全部使用；默认导出描述符 |
| 2 | 发现 | `scripts/gen-registry.mjs:79-83` | 扫 `src/widgets/*/`，跳过 `_` 前缀；要求 `manifest.json` + `index.ts` |
| 3 | 校验 | `gen-registry.mjs:92-130` | 三向 id 一致（目录 = manifest.id = index.ts 首个 id 字面量）、sizes 双份一致、locale 类型、order 整数 |
| 4 | 注册 | `gen-registry.mjs:162-216` | 生成 `generated.registry.ts`：40 个 import + `WIDGETS` / `ALL_IDS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / `WIDGET_LOCALES` |
| 5 | 守卫 | `gen-registry.mjs:219-231`（`pnpm check:registry`） | 重新生成后逐字符 diff |
| 6 | 实例化 | `client/index.ts:3205-3242` | **无对象实例**；实例 = `prefs.order ∩ installed` 的数据折叠，key = `widgetId@size`（`contract.ts:483`） |
| 7 | 渲染 | `client/index.ts:3199-3248` → `components.tsx:957` `CardBody` | 传 `(stats, {size, sim})`；返回 `null` 即该卡隐藏 |
| 8 | 骨架 | `client/index.ts:677-685` + `3227-3236` | **shell 决定**：`isSourcePending(source)` + `SKELETON_SHAPE[id]`；widget 自己分不清"源在飞"与"源答了但空" |
| 9 | 配置 | `components.tsx:1249-1301`（控件分发）+ `1773-1791`（遍历 configSchema） | 泛化：`field.type` 决定控件；值存 `prefs.cardConfigs[instanceKey]`（`components.tsx:1585-1592`） |
| 10 | 预览 / 卸载 | `components.tsx:62-72 / 1565-1584 / 2107-2129`；卸载 `1546-1554` | 预览 = `PREVIEW_STATS` 覆盖 + `example.stats(config)` + `sim`；删除 = 三处同时删；插件整体靠 `ctx.effect` 全量可逆 |

---

## 4. Registration chain（manifest → generator → registry → runtime）

```text
widgets/<id>/manifest.json ─┐
widgets/<id>/index.ts ──────┤→ gen-registry.mjs ─→ client/generated.registry.ts ─→ WIDGETS ─→ runtime
widgets/_shared/*.json ─────┘        (校验 + 生成)        (check:registry 逐字符守卫)
```

**已自动化**：id 三向一致、sizes 双份一致、order 排序、locale 合并、实例键集合、默认安装集。
新增 widget **不需要**手改 `generated.registry.ts`。

**仍未自动化（5 处按 id 硬编码的中央清单）**——这是"伪模块化"的残留：

| # | 中央清单 | 位置 | 规模 | 何时必须手改 |
|---|---|---|---|---|
| 1 | `WIDGET_SOURCE` | `client/index.ts:610-617` | 24 个 id | 新 widget 有异步数据源时 |
| 2 | `SKELETON_SHAPE` | `client/index.ts:634-668` | 18 个 id | 同上（决定骨架轮廓） |
| 3 | `SYS_WIDGET_IDS` | `client/lib/sys-view.ts:19` | 5 个 id | 新增 sys 家族卡时 |
| 4 | `group.<x>` 显示名 | `client/i18n.ts:97-102 / 185-190` | 按 group | 新分类时（可被单元 `manifest.locale` 绕过） |
| 5 | 新宿主路由 | `src/index.ts:696+` | 按路由 | 真正新增数据源时（能力扩展，非纯 widget） |

---

## 5. manifest → registry：字段真相

实际在用（40/40）：`id` `order` `group` `builtin` `sizes` `defaultInstalled` `locale`。

| 信息 | 来源 A | 来源 B | 一致性守卫 |
|---|---|---|---|
| id | 目录名 | `manifest.id` + `index.ts` 字面量 | **有**（三向） |
| sizes | `manifest.sizes`（驱动 ALL_INSTANCES / 市场） | descriptor `sizes`（驱动运行时 `sizesOf()`） | **有**（`gen-registry.mjs:113-122` 强制相等） |
| group | `manifest.group` | descriptor `group` | **无** |
| builtin | `manifest.builtin` | descriptor `builtin` | **无** |
| 文案 | `manifest.locale` | `index.ts` 里的 `t('...')` 键 | 仅正则弱校验 |
| 数据源标签 / 骨架形状 | — | **不在 manifest**（手写常量，见 §4） | 不存在 |

未知字段被两个脚本**静默忽略**（无 JSON Schema、无白名单）——Phase 1 加字段必须同时加校验，否则没有守卫。

`badgeLabel`：descriptor 字段被 13 个单元使用（`contract.ts:664`），但 `manifest.badgeLabel` 无单元使用。

---

## 6. 渲染契约（能力与扩展点）

`WidgetRenderOut`（`contract.ts:512-607`）= 纯数据描述，**不含 JSX**：`title` `title2` `headRight`
`headAfter{big,small,smallLines,smallAlign}` `bodyAnchor` `legend` `cardHint` `meter` `value` `valueTone`
`valuePulse` `sub` `chart` `actions` `rich` `corner` `cycle` `skeleton` `skeletonShape` `skeletonCount`
`skeletonRows`。

| 能力 | 类型 | 开放性 | 谁分发 |
|---|---|---|---|
| `chart.kind` | 10 值联合（`contract.ts:364`） | **闭集** | `components.tsx:337-844` if 链 |
| `rich.type` | `'quote'\|'image'`（`contract.ts:447`） | **闭集** | `components.tsx:863-872` |
| `actions[]` / `corner` | 结构开放 | 开放 | `components.tsx:846-861` / `1120`；运行时注入 `onAction`（`index.ts:3566`） |
| `cycle` | 结构开放 | 开放 | 池化切换；store 字段由 widget 指定（`ccView` / `poolView` / `bigMetric`） |
| `configSchema` | widget 自定义字段列表 | **开放** | 泛化遍历，新增配置项**不需要**改中央文件 |
| `example` | widget 自带预览数据 | **开放** | 已替代旧的中心预览逻辑（如 heatmap 的 `previewStats`） |

**结论**：契约已经有两个真正的扩展点（`configSchema`、`example`），但**图形能力是闭集 + if 链**——
这是 §9 要修的核心。

---

## 7. 数据源架构

host 7 条路由（全部 `ctx.webServer.register`，`kind:'exact'`）：

| 路由 | 行号 | 数据来源 | 缓存 / 超时 |
|---|---|---|---|
| `/api/opencode-usage` | 712-735 | `opencode.ai` + `credentials.resolve` | 无缓存、无显式超时 |
| `/api/opencode-usage-multi` | 740-795 | 同上 ×9 个 pool env | 无缓存、无超时、串行循环（745） |
| `/api/commandcode-usage` | 822-844 | `api.commandcode.ai` ×4 端点 ×≤4 key | `memoTtl(20s)`；每端点 8s 超时 |
| `/api/widgets-usage-daily` | 872-893 | cordis `usageCenter` 服务 | memo 20s；refresh 节流 5s |
| `/api/github` | 917-946 | GitHub GraphQL/REST + HTML 抓取 + `gh auth token` | 5 级 memo（5/15/30min）；9s 超时 |
| `/api/widgets-state` | 951-986 | `$DSH_HOME/…/dsh-widgets-state.json` | 无缓存；PUT tmp+rename 原子写 |
| `/api/sysinfo` | 995-1076 | `os.*` + `execFile('nvidia-smi')` | 闭包 1s 缓存 + 120 点环形缓冲 |

客户端唯一数据出口 `BridgeSnapshot`（`client/index.ts:222-243`，17 字段）→ `emit()`（1876）→ 消费方只有
rail 渲染（3228）与 settings 槽位（3713）。**采集与渲染之间只有 bridge 一个接缝，边界是干净的。**

| 字段 | 拉取点 | 轮询 | 谁用 |
|---|---|---|---|
| `usageData` / `usageMulti` | 2652-2670 | turn settle + mount | usage-*（`usage-view.ts`） |
| `commandCode` / `commandCodeError` | 2564-2617 | 60s（仅 rail 开 + tab 可见） | cc-* 8 + quota-manage（`cc-view.ts`） |
| `usageDaily` / `commandCodeDaily` | 2618-2650 | 60s | heatmap / heatmap-bars / quota-manage |
| `sysinfo` | 2770-2781 | 已装 sys-* 的最短 interval（5–60s） | sys-* 5（`sys-view.ts`） |
| `github` / `githubError` | 2736-2764 | 600s | github-* 5（`github-view.ts`） |
| `stats` / `hasSession` / `railBudget` | 2502-2960 / 1979-2465 | 纯前端投影，无 HTTP | 16 个无源 widget |

错误语义：`commandCodeError ∈ {unconfigured, unloaded, unavailable}`（`contract.ts:277`）；
`githubError = 'unloaded' \| 'http:<status>' \| 'unavailable'`（2752）；`usageDaily` 用 `{available:false,reason}`。
"未配置"不弹表单——key 由 host 自动读环境 / 凭据（`cc-view.ts:42-45`）。

**"改 CC 数据源只改一个模块" = 否**，最少 4 处：host 抓取聚合（`src/index.ts:240-313`）、host 路由与 memo
（`822-844`）、client 采集 + `WIDGET_SOURCE`（`client/index.ts:2564-2617`、`610-617`）、派生/展示（`cc-view.ts`）。

---

## 8. Layout system

| 关注点 | 位置 | 说明 |
|---|---|---|
| rail 空间解析 | `client/index.ts:253-283` `resolveRailSpace` | 纯函数 |
| 列宽 / 预算读取 | `94-166`（`readColumnWidth` / `readRailBudget` / `readTarget*`），`286` `predictRailBudget` | 读 DOM（`[class$='_centerCol']` 等上游钩子） |
| 卡宽上下界 | `307-346`（`readMinCardSide` / `readMaxCardSide` / `rowFitSide`） | |
| 布局求解 | `384-416` `resolveRailLayout` | 纯函数：side / columns / railW |
| 测量与发布 | `1979-2465`：ResizeObserver、宽度追踪、`updateRailBudget:2110`、`measureRailTop:2294` | **唯一带完整 dispose 的 effect（2438-2464）** |
| CSS 变量写入 | `setVar:2087` + 6 个 `--dsx-rail-*` + `--dsx-rightbar-w`（2114/2120/2320/2331-2382/3178-3180） | 跨段副作用 |
| 面板几何 | `3372-3496`（`scaleFor` / `nearest` / `placeCards` / `addSlotFor`） | 闭包捕获 12 个外部值 |

风险：`railBudget` 被 1876 / 2484 / 3164 三处读、`2110` 写；`3158` 的注释已记录过
"React 快照 vs 直接 DOM 双写"的历史事故。`drawerEl:2037` 由 E7 的 ref（3702）写、被 E4 读。

---

## 9. Chart system

`components.tsx:337-844`（**508 行单函数 if 链**），10 个分支：

| kind | 分支行 | 行数 | 独立 renderer 可行性 |
|---|---|---|---|
| `bars` | 340-371 | 32 | 高 |
| `barsV` | 372-402 | 31 | 高（与 `bars` 同吃 `chart.bars`，仅轴方向不同） |
| `lanes` | 403-510 | **108（最长）** | 高，但依赖 `LANE_*` 常量（306-335） |
| `quotas` | 511-550 | 40 | 高 |
| `segments` | 552-602 | 51 | 高（内含私有 `fmt()` 573-580，应提为共享） |
| `rings` | 603-648 | 46 | 高 |
| `line` | 649-708 | 60 | 高 |
| `figures` | 709-765 | 57 | 高 |
| `ring` | 766-779 | 14 | 高（与 `rings` 同族） |
| `heatmap` | 780-842 | 63 | 高（一条分支塞了 3 种尺寸策略 + 2 套色阶） |
| fallback | 843 | 1 | `return null` |

其他问题：配色分散成 4 套（`CHART_TONES` 293-299、`officialColors` 571、heatmap 双 ramp 802-816、
line 硬编码 684-685）；`(6+2)*scale` 在 379 与 794 各硬编码一次；`stretchChart` 白名单（`1091`）
把 `'line'|'lanes'` 的弹性行为写在 CardBody 里，新增弹性图要改这里。

**反形式主义回答：当前新增一种 chart 必须改这 508 行 if 链 + `1091` 白名单。**

---

## 10. CSS system

`client/widgets.module.css` 1,468 行 / 87 个 `dsx-*` class，由 `client/index.ts:13` 副作用导入，经
lightningcss 编译（`tsdown.config.ts:92-97`，`cssModules.pattern='[local]'` → **类名不哈希**），
注入 `<style data-plugin-css="dsh-widgets/<src 相对路径>">`（`100-120`）。

| 家族 | 行区间 | 规模 |
|---|---|---|
| 卡片与排版基元 `dsx-stats-card*` / `capsule` / `sk*` | 18-260、1449-1468 | ~130 |
| rail / 锚定 / 抽屉 / slot / wave / magnify | 261-560 | ~180 |
| add panel / order 行 / tab / trash / badge | 601-844 | ~200 |
| market 全家（`marketbar`/`gcard`/`mkt`/`zoomghost`/`mlist`/…） | 844-1203 | ~250（最大单块） |
| btn / navbtn / dot / switch | 1203-1315 | ~110 |
| metrics（`metric`/`drop-before\|after`） | 1315-1400 | ~85 |
| size-warn / limit-tip | 1401-1449 | ~45 |

**没有自己的令牌层**：直接内联 19 个官方 `--dsw-*`；自有变量仅 `--dsx-nav-glyph`(112)、
`--dsx-rail-right`(267)、`--dsx-wave-delay`(523-534)、只读的 `--dsx-market-motion`(997/1000)。

JS 以**字符串**写类名（`classList` 于 `index.ts:1101-1104 / 2197 / 2271 / 3766-3792`；字符串拼接于
`components.tsx:946/1003/1094/1117/1142/1205-1208/1460-1464/2001-2004`）。

**40 个 widget 单元对 `dsx-` 的引用数为 0**——图表外观全部是 TS 内联 style（几何值由 `scale = side/150`
算出，**不可**下沉为静态 CSS，否则改像素）。所以当前不存在"widget 专属样式层"，也不存在命名冲突
（命名域封闭在 `dsx-`，但全局类名 + 无哈希 + 1099 行的共用表，未来加组件会越来越难避免冲突）。

`index.module.css` 机制**已就绪但 0 使用**（`tsdown.config.ts:100-107` 已按 src 相对路径隔离 tagId）。

---

## 11. Animation system

| 子系统 | 位置 | 机制 |
|---|---|---|
| rail 悬浮放大波 | `client/index.ts:704-1597`（`RailWaveProps` 704-783 + `RailWave` 785-1597） | `displayed = 1 + (target − 1) · p`：`targetRef:974` 指针实时目标、`morphP:823` / `morphRef:824` 弹簧进度、`WAVE_SPRING{200,0.1}`（`lib/morph-spring.ts`）；4 个 rAF 循环（934/1020/1394/1405）；`--dsx-rail-scroll` 写入（1084/1150）；`dsx-wave-run` + setTimeout（1101-1104）；放大 overlay（1221+） |
| deck 重排波 | `1086-1126` | 列数变化触发，`dsx-wave-run` |
| 市场 FLIP / 共享轴 | `components.tsx:1799-2198` | `ZoomGhost` portal 到 body；`dsx-mkt-push-out\|in` + `is-rev/is-front`（2001/2004） |
| 配置抽屉宽度 | `components.tsx:1524-1797` | 遮罩宽度动画 |
| reduced motion | `REDUCE_MOTION:596` | p 直接跳变 |

RailWave **props 25 个**，内部 state/ref 14 个，依赖同文件 6 个闭包函数 + 7 个常量；
**可以独立成模块，但不是机械切文件**——必须先把这 6 个函数 + 7 个常量以 props/参数注入。

---

## 12. State / preferences

| 载体 | key | 位置 |
|---|---|---|
| localStorage | `harness-widgets.state` / `.state.savedAt` | `index.ts:23/27`，`1644-1655`，`1680-1682` |
| localStorage（heatmap 回退） | `harness-widgets.heatmap` / `.baked-purge-v1` / `.seen` / `.strongest` / `.anchor` | `heatmap-accounting.ts:21/100/168-170` |
| localStorage（语言） | `dsh-language` | `i18n.ts:291` |
| host store | `…/profiles/web/dsh-widgets-state.json` | `src/index.ts:171-175` |

`Prefs` 15 字段定义在 **`components.tsx:155-188`**（渲染文件），默认值在 `client/index.ts:459-479`，
归一化在 `1602-1640`。同步链路：`saveState` → localStorage + 400ms 防抖 PUT（1678-1693）；
`pagehide → sendBeacon`（1704-1724）；`syncWithHost` 以 `savedAt` 大者胜（1893-1914）；跨 tab `storage`
事件（1938-1946）；`visibilitychange` 重拉（1947-1949）。

**模块级可变状态**（`apply()` 之外）：`engagedPanelW:190`、`hostSyncTimer/pendingState/pendingAt:1663-1665`。
**`apply()` 闭包内可变状态**：`prefs:1859`、`state:1860`、`listeners:1862`、`bridgeSnapshot:1868`、
`emit:1875`、`railBudget:2027`、`lastSpaceKey:2033`、`drawerEl:2037`、`frameEl:2035` + ~15 个 timer/rAF id。
其中 `state` / `prefs` / `listeners` / `bridgeSnapshot` / `emit` 被 **6 个区段**共享——这是拆分的第一风险。

---

## 13. Build & test pipeline（现状：安全网为零）

`package.json` 只有 5 个脚本：`gen:registry` / `check:registry` / `build` / `check` / `prepare`。

| 项 | 现状 |
|---|---|
| 单元测试 | **无**——无 `tests/`、无 `*.spec.ts`、无 vitest/jest、无 `test` 脚本 |
| Lint | **无** lint 配置 |
| `pnpm check` | `gen-registry --check && tsc --noEmit`；**实测 34 条既有错误**（缺 `@types/node` 5 条 + host 里 `process`/`Buffer` 6 条、缺 `react-dom` 类型 1 条、`ctx.slots` 缺类型 8 条、`components.tsx` 的 `selWidget` 可能 undefined 7 条等）→ **当前无法作为硬门** |
| CI | `.github/workflows/publish.yml`（仅 `v*` tag，含 `docs/verify-sysinfo.mjs`）、`pages.yml`；**普通 push / PR 零自动化** |
| `validate-widget-unit.mjs` | 未接入任何 npm 脚本或 CI |
| 探针 | `docs/verify-*` 26、`docs/probe-*` 18、`scripts/verify-*` 5、`scripts/diag-*` 66——**依赖 live :3080 + 硬编码本机 playwright 路径**，不是 devDependency，不能当硬门 |
| 探针质量 | `docs/verify-discovery.cjs:15` 的 `BUILTINS` 列表已过期（19 个 id，缺 cc-*/sys-*/github-*/trajectory/harness-board），漏检严重 |
| 发布包类型 | `package.json:7/10/13-15/25` 声明 `lib/types/**/*.d.ts`，但两个 tsdown 入口都是 `dts:false`，`lib/` 实际只有 3 个文件 → **发布包没有类型声明** |
| 构建顺序脆弱点 | `tsdown.config.ts:56` 的 `nodeConfig.clean:true` 会清空 `lib/`；目前安全**只因为** `export default [nodeConfig, clientConfig]` 把 node 放在前面。调换顺序会删掉 `client.js` |

**结论：守卫只能校验注册表文本与契约形状，对 render 输出零断言。拆分重构前必须先建立最小安全网。**

---

## 14. 依赖方向图（谁依赖谁）

```text
i18n.ts  ←──────────────────────────────────────────┐
  ↑                                                 │
lib/contract.ts · format.ts · heatmap-accounting.ts · quota-math.ts
  ↑                    ↑
lib/cc-view.ts · sys-view.ts · github-view.ts · usage-view.ts · morph-spring.ts
  ↑                                    ↑
widgets/*/index.ts（40 个）      components.tsx ──→ generated.registry.ts ←──┐
  ↑                                    ↑                                    │
generated.registry.ts ─────────────────┘                                    │
  ↑                                                                          │
client/index.ts ──(type Prefs)──────────────────────────────────────────────┘
```

| 关系 | 结论 | 证据 |
|---|---|---|
| widget → widget | **无** | grep `from '../<id>'` 零命中 |
| widget → 家族视图 / contract / format / i18n | 有（唯一允许方向） | 全量 grep |
| rendering（components.tsx）→ 具体 widget | **无**（零 `w.id === '…'`） | 命中全是 `chart.kind` / `rich.type` / lane 分类 |
| layout 层 → 具体 widget | **无** | — |
| **反向边：`client/index.ts:20` 从 `components.tsx` import `type Prefs`** | **有，唯一一条** | 类型住在渲染文件里，运行时反向依赖渲染模块 |
| client → host | **无** | host 无 export 被 client 引用 |
| 循环依赖 | **无** | 依赖图单向 |

类型层面的**有意手工双份**：host 的 `HostContribDay`（`src/index.ts:320`）与 client 的
`GitHubContribDay`（`contract.ts:169`），注释明说"node 半区从不 import web 半区类型"。

---

## 15. God Module 清单

| 文件 | 行数 | 职责数 | 标记 | 判定 |
|---|---|---|---|---|
| `client/index.ts` | 3,795 | **9/9**：layout、geometry、data collection、runtime、preferences、rendering、animation、registration、state | **>1200 · 多职责 · God Object** | `apply()` 独占 1845-3794（**1,950 行**）；`RailWave` 704-1597（894 行） |
| `components.tsx` | 2,297 | ≥5：卡片渲染 / 骨架 / 组件配置页 / 市场页 / 设置页 | **>1200 · 多职责** | `ChartBlock` 337-844 = 508 行；`Prefs` 类型寄生于此 |
| `widgets.module.css` | 1,468 | 1（全部视觉） | **>1200** | 单一职责但无分层；全局类名无哈希 |
| `src/index.ts`（host） | 1,077 | ≥5：5 个外部数据通道 + 状态文件 + 路由注册 | **>800 · 多职责** | 7 条路由内联全部解析/IO；零本地 import |
| `client/lib/cc-view.ts` | 760 | 2：聚合/额度计算 + 8 个 render | **>500** | 家族内 God Module |
| `client/lib/contract.ts` | 730 | 2：纯类型（23-479、509-678）+ 带逻辑工具（483-494、682-730） | **>500** | 为 `badgeOf` 一行（718）让整个契约模块依赖 `i18n`（`:21`） |
| `client/generated.registry.ts` | 686 | 1（生成物） | 忽略 | 非手写 |
| `client/lib/sys-view.ts` | 310 | 2：客户端历史回退（含**模块级可变** `clientHist:34`）+ 5 个 render | 中 | 静态单例跨实例泄漏风险 |
| `client/lib/quota-math.ts` | 309 | 1（额度数学） | 中 | 只服务 quota-manage |
| `widgets/quota-manage/index.ts` | 248 | 2：额度方案计算 + 渲染 | 中 | 单元内 God Module |
| `client/widgets.module.css` 之外的 `client/lib/github-view.ts` | 216 | 2：预览数据生成器（LCG 造 371 天）+ 5 个 render | 中 | 数据与展示混装 |

---

## 16. 「改一个 Widget 却必须改中央文件」完整清单

| 场景 | 必须改的中央文件 | 是否可自动化 |
|---|---|---|
| 新增一个有异步源的 widget | `client/index.ts`（`WIDGET_SOURCE` + `SKELETON_SHAPE`） | **可**（下沉 manifest + 生成器） |
| 新增一个 sys 家族 widget | `client/lib/sys-view.ts`（`SYS_WIDGET_IDS`） | **可**（由 `source:'sys'` 派生） |
| 新增一个分类（group） | `client/i18n.ts`（`group.<x>` 中英） | 可绕过（单元自带 `manifest.locale`） |
| 新增一种 chart | `components.tsx`（508 行 if 链 + `stretchChart` 1091） | **可**（renderer registry） |
| 新增一个数据源 | `src/index.ts`（新路由）+ `client/index.ts`（新 state 字段 / 采集 / 轮询 / 桥）+ `contract.ts`（新字段类型）+ 新家族视图模块 | **不可**（这是能力扩展，属于框架工作，不是 widget 工作） |
| 新增 widget 配置项 | **不需要**改任何中央文件 | 已达标 |

---

## 17. 已确认缺陷登记（只登记，本轮不修）

| 类别 | 内容 | 位置 |
|---|---|---|
| 编码损伤 | **41 行注释**存在 GBK 往返残留：`脳`←`×`、`路`←`·`、`缁勪欢`←`组件`、`鏁版嵁涓嶈冻`←`数据不足`、`绫讳技鍥涜垗浜斿叆`←`类似四舍五入`、`妗ｄ綅`←`档位` 等 | `client/index.ts` 69/72/324/325/339/364/380/396/412/587/605/1025/1060/1115/1117/1120/1124/1298/1607/1610/1611/1754/2084/2103/2473/3093/3238/3243/3298-3301/3317/3321/3322/3326/3368/3405/3406/3434/3617 |
| 死代码 | `lastScrollRow:591`（0 引用）、`GripIcon:213`（components.tsx，全仓仅定义处）、`badgeOf:718`（contract.ts，被 import 于 components.tsx:13 但零调用）、`STATS_WIDGET_IDS`（generated.registry.ts:190，零引用）、`SURFACE_TOLERANCE:563`（疑似，未 100% 确认）、`MarketTab` 的 `usageData` 形参（`components.tsx:2218` 恒传 `null`） | — |
| 死 CSS | `dsx-macts:1196`、`dsx-mid:1189`、`dsx-restore:743` | `widgets.module.css` |
| 空钩子 | TSX 用了但 CSS 无规则：`dsx-lanes/lane-row/lane-seg`（473/494/503）、`dsx-config-list/drawer/-inner`（1633/1672/1679）、`dsx-stats-card-headafter-lines`（1047） | — |
| 重复常量 | `(6+2)*scale` 硬编码两次 | `components.tsx:379` 与 `794` |
| 缩进破损 | `addSlotFor:3462` 顶格但仍是 E7 闭包成员 | `client/index.ts` |
| 发布缺陷 | 声明了 `lib/types/**` 但 `dts:false`，发布包无类型声明 | `package.json` / `tsdown.config.ts` |
| 过期探针 | `docs/verify-discovery.cjs:15` 的 `BUILTINS` 只有 19 个 id | `docs/verify-discovery.cjs` |
| 本地 scratch | 仓库根 109 个未入库 `.tmp-*`（含 2,033 行 `.tmp-backup-index.ts`）——不影响构建，但会误导本地行数统计 | 仓库根 |

---

## 18. 不确定项（不得当作事实使用）

1. `SURFACE_TOLERANCE:563` 是否为死代码——静态读未发现引用，未逐帧验证。
2. `client/index.ts` 的 2100-2650、2964-3795 两段仅按结构标记 + 抽样阅读归纳，未逐行通读。
3. `--dsx-market-motion`（`widgets.module.css:997/1000`）在 `src/` 内无写入者，是否由外部/测试注入未追查。
4. `tsdown` 多 config 是否严格串行——只能从 `lib/` 现有 3 个产物反推"node 先于 client"成立。
5. `docs/verify-i18n.mjs` 对 Node 版本的具体要求未逐行确认。
