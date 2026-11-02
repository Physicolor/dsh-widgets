# FOLD 2026-10-27 — 折叠时对话区只让位一次（不再逐帧重排）

> **后续（2026-10-28）**：本篇的「一次落地」留下了一个副作用——眼睛跟随的**平移本身**被删掉了。
> 修复保留一次落地，并把这段运动重建为窗格的合成器 `translateX` 平移，见
> [FOLD-2026-10-28-pan.md](FOLD-2026-10-28-pan.md)。本篇的价值在前半段：那份 tween 的成本测量，
> 以及「为什么不能靠 inline 写值去压一条已经启动的 transition」。

车主报告：「展开和收起组件区域很卡顿，对话区域的平移动画也很卡顿」。这一轮定位到的是
**同一个原因**：折叠期间唯一被逐帧插值的 *布局属性* 是对话区的 `padding-right`
（右栏让位 = 阅读栏的 inset）。它在 0.3s 的 shell 共享曲线上被 tween，于是整段对话
**每一帧重排一次**；而折叠同时让所有「边动边量」的同住插件（`dsh-pinned-summary`
的 layout 循环、`dsh-ui-harmonizer` 的 MutationObserver、本插件自己的 shell 读）
每帧再强制布局一次。主线程被这些布局占满，合成器里的卡片动画也就跟着顿。

## 1. 量出来的病因

同一台机器、同一会话（1707×1067 @DSF1.5，2807 节点、26 张卡），live GUI，
`DSH_PORT=49327`，A/B 只注入一条 CSS `[data-conversation-scroll]{transition:none}`：

| 折叠窗口 | 有 tween（现行） | 无 tween（注入对照） |
|---|---|---|
| close p95 帧间隔 | **56.1ms** | **19.9ms** |
| open p95 帧间隔 | **36.1ms** | **19.8ms** |
| close 超 50ms 帧 | 5 | 2 |
| open 超 50ms 帧 | 3 | 1 |
| close 窗口内 style recalc | 377ms | 174ms |
| open 窗口内 style recalc | 272ms | 142ms |
| close 窗口内 TaskDuration | 739ms | 457ms |

强制布局的归属（`.tmp-rect-attrib.cjs`，patch `getBoundingClientRect` /
`getComputedStyle` / `getPropertyValue`，统计一次关闭的调用点）：

| 累计 ms | 次数 | 调用点 |
|---|---|---|
| 110.2 | 22 | `dsh-pinned-summary` 的 `railHost()` ← 它自己的 `layout()` |
| 29.7 | 22 | 本插件的 `measuredRightbarWidth`（`shellRead`） |
| 26.6 | 20 | `dsh-pinned-summary` 的 `publishRightSpace()` |
| 19.8 | 1 | `railHost()` ← `refresh()` |
| 17.7 | 1 | `dsh-ui-harmonizer` 的 `detectGlass()` ← `refreshMaterial` |

即：一次折叠里，**22 次** `getBoundingClientRect` 落在同一帧的对话区布局上，每次 5ms 量级。

几何采样（`.tmp-inset-sampler.cjs`，每帧读计算值）确认了两件事，它们决定了修法：

1. 右栏自己的盒子在整段折叠里**不动**（`left` 1137、`width` 570 恒定，只有卡片在飞）。
   所以关闭时「把让位立刻还给对话区」会让文字跑到还在飞出的卡片底下。
2. 让位的最终值来自两个声明：本插件的 `body.dsx-stats-active … var(--dsx-rail-w)`
   与 `dsh-pinned-summary` 的 `--dps-right-space`。谁赢不重要——落地的是同一个
   `padding-right`，而 tween 是本插件的 `[data-conversation-scroll]{transition:
   padding-right …}`（`card.module.css`）造成的。

## 2. 修法

`src/client/rail/fold-inset.ts` + `rail.module.css` 两条规则：

- `html.dsx-fold-inset` → `transition: none !important`。在**改值的那次 class 翻转之前**
  武装（`index.ts` 的 store 订阅里，`dsx-stats-active` 的 toggle 之前），因此第一次
  重算的 after-change style 里已经没有可启动的 transition。
- `body.dsx-fold-inset-hold` → `padding-right: var(--dsx-fold-inset) !important`，
  关闭时把「右栏此刻仍占着的宽度」钉住，直到折叠自己报告结束
  （`rail-view.tsx` 的 `markDeck(null)` → `settleFoldInset()`）；释放顺序是
  「先摘 hold（此时 suppressor 还在，新值在那一次重算里落地）→ 下一帧再摘
  `dsx-fold-inset`」。
- 打开方向不钉：右栏盒子本就在终位，第一帧就把让位取走，文字才不会压到进来的卡片下面。
- 只在会**真的跑**折叠时武装（`openShape === 'stagger'`、非 reduced-motion、有会话）；
  `zoom` 形状会移动右栏盒子且从不报告折叠结束，保持原样。右栏面板开合、宽度拖拽的曲线
  也原样保留——两条规则静止时都不存在。

不是写 inline `padding-right` 的原因（实测）：**运行中的 CSS transition 在层叠里高于
inline 声明**——inline 写 `padding-right: 888px !important` 读回来仍是动画中的 300px。
所以要让它别启动，而不是事后去盖。

## 3. 修后实测（同一会话、同一探针）

`.tmp-verify2.cjs`（live）：

| | close | open |
|---|---|---|
| 折叠窗口 p95 帧间隔 | **19.6ms**（原 56.1） | **19.7ms**（原 36.1） |
| 超 50ms 帧 | **0**（原 5） | **0**（原 3） |
| style recalc | **114ms**（原 377） | **111ms**（原 272） |
| 让位采样 | `570px` 恒定到 t≈400ms（折叠结束）才变 `300px` | 一步到 `570px` |
| 折叠期间的 padding transition | **0 个** | **0 个** |
| 折叠结束后的 `dsx-fold-inset` | 已摘除 | 已摘除 |

机制面：整个折叠窗口里对话区的 inset 只有 **2 个不同的取值**（起、终），没有任何
逐帧中间值——即「一次重排」而不是「18 次」。

## 4. 复验

```
pnpm check && pnpm build && pnpm test      # 13/13 闸门（G5 基线按本次 CSS 变更刷新）
node scripts/verify-deck-cascade-live.cjs --session <名>   # 折叠几何/秩表/反转仍成立
DSH_PORT=<port> node scripts/probe-fold-inset.cjs [--session <名>]   # 让位机制（live 收据）
```

## 5. 记录而不是断言的两件事

- `dsh-pinned-summary` 在关闭折叠开始 ~46ms 后才把 `--dps-right-space` 从 570 翻到 300。
  修法不依赖这个 beat：hold 用的是**折叠开始时读到的计算值**，并在折叠结束才释放。
- 打开方向首帧就让位，会与 `dsh-pinned-summary` 的卡片入位错开一帧；这条路径没有
  逐帧成本，实测 p95 与关闭方向一致。
