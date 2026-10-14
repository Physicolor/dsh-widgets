# 2026-10-08 report — 组件区「悬浮后立刻停止悬浮」：命中判定与波峰坐标各差一整行

车主报告（原文）：「dsh-widgets的组件区域偶发 鼠标悬浮在组件上方后组件进入悬浮状态又立刻
停止悬浮 的情况，排查相关问题并修复」

验收口径：**指针停在某张卡上时，放大波峰必须落在同一张卡上，并且指针不动时不得自行释放；
横向/纵向掠过不得断开。**

基线 = `7d7de72`（v1.8.4 之后）。修复落在 `src/client/rail/wave/RailWave.tsx`
（2 行逻辑改动 + 注释），`lib/client.js` 920884 B → 924380 B（tsdown 保留注释，`sha` 必变）。

---

## 0. 先说结论

**根因不在本插件，而在「组件栏的顶部内边距不属于本插件」这个事实被写死成了常量。**

`dsh-pinned-summary` 把它的摘要卡停靠在组件栏这一列时，是**用 padding 给 deck 挪位置**的：

```css
html[data-dsh-pinned-summary="rail"] .dsx-stats-rail {
  padding-top: calc(var(--dps-rail-pad, 4px) + var(--dsh-pinned-summary-push, 0px)) !important;
}
```

（它自己的注释写明：rail 的 padding 是内联样式，只有 `!important` 能压过去；它把 rail 原
padding-top 读成 `--dps-rail-pad` 再相加，所以这条规则只是**追加**。）

现场实测：`padding-top: 135px` = 自身 4px + push **131px**。

而 RailWave 里指针→deck 坐标的换算**两处都减了写死的常量**：

| 位置 | 原式 | 实际应为 | 误差 |
|---|---|---|---|
| 命中判定 `onCard` | `clientY - box.top - 4 + scrollTop` | `… - 135 + scrollTop` | **131px** |
| 波峰坐标 `moveRailFocus` | `clientY - rect.top - 2 + scrollTop` | `… - 135 + scrollTop - RAIL_ROW_SEAT` | **133px** |

行距 pitch = 140px，131/133px ≈ **整整一行**。于是：

- 指针悬停在 #0 卡上 → 命中判定解析到**下一行**的格子 → 波峰也画在下一行 →
  **放大的是下面那张卡**（实测：悬停 #0 → 聚焦 #3，#1 → #4，#2 → #5，逐张复现）；
- 指针落在卡片边缘/行间空隙附近时，被整体下移的判定点会滑出所有格子 → 波峰先进入
  悬浮态、60ms 去抖一到就释放 → 车主看到的「偶发：进入悬浮态又立刻停止悬浮」；
- 最后一行的卡（解析点越过 deck 末尾）**根本没有悬浮反馈**；
- 顺带：`wholeCards` 的整卡判定带（`bandOf`）同样偏 131px，以及父级 rail-view 的滚轮
  上限 `lastRow` 也用同一个 4px（见 §3，未在本次修复内）。

### 改动（2 行）

```ts
// 模块级：内边距是量出来的，不是假设的
const readTopInset = (rail: HTMLDivElement): number => {
  const v = Number.parseFloat(getComputedStyle(rail).paddingTop)
  return Number.isFinite(v) ? v : RAIL_TOP_INSET   // 4px 情形仍是 4px，无 push 时零差异
}
```

1. `onCard`：`cy = clientY - box.top - readTopInset(rail) + rail.scrollTop`
2. `moveRailFocus`：`contentYRef = clientY - rect.top - readTopInset(el) + el.scrollTop - RAIL_ROW_SEAT`

第 2 行除了换成实测内边距，还把写死的 `- 2` 换成 `- RAIL_ROW_SEAT`：命中判定工作在
**座位坐标**（`placeCards` 把行放在 `RAIL_ROW_SEAT + row·pitch`），而 `scaleFor` 的行心在
`row·pitch + side/2`，两者差一个 `RAIL_ROW_SEAT`。旧的 `- 2` 在「内边距=4px」时刚好落在
行心 4px 以内（140px 行距下看不出来），一旦有 push 就把波峰推到下一行。

成本：`getComputedStyle(rail).paddingTop` 读的是**布局值**（与同一函数里已有的
`getBoundingClientRect()` / `clientWidth` 同坐标系），且 `onCard` 在这之前已经用
`getBoundingClientRect()` 强制过一次布局，所以这次读取不再新增强制布局，只是同一次
style/layout 刷新的附加消费。挂载前/脱离文档时返回 NaN → 回退 4px。

---

## 1. 复现与验收（脚本：`scripts/verify-rail-hover-alignment.cjs`）

新增长期断言（不是一次性探针）：把指针停在**每一张完整可见卡**的中心，等 1.2s，逐帧记录
`.dsx-magnify-layer` 的 opacity / 峰值 scale / `.dsx-slot-focused` 的下标，并断言：

- A 对齐：`focused` 下标 == 被悬停卡在 deck 行优先序里的下标；
- B 保持：指针不动期间不得出现 opacity 回落（无鼠标事件却释放 = 车主报的现象）；
- C 内边距：deck 的内容原点必须等于 rail 的 `padding-top`（量出来的那个）；
- D 掠行：从一张卡中心横向走到邻卡中心（24 步），全程 opacity 不得掉到 0.5 以下，
  且只允许聚焦这两张卡。

**修复前**（`2026-10-08-hover-align-before.log`）：45 项里 **25 项 FAIL** ——
13 张卡全部「聚焦到了别的卡」（#0→#3、#1→#4 …，末行 #12 甚至只吃到峰值的 1.027）。

**修复后**（`2026-10-08-hover-align-final.log`）：**ALL PASS（45/45）**，包括

```
rail padding-top=135px push=131px deck content inset=135px
PASS  card #0 … #12 engages / is the one the wave focuses / stays engaged
PASS  a row traversal never lets the wave off — 0/25 frames at opacity<0.5
PASS  a row traversal focuses only the two cards it crosses — stray=[]
PASS  the traversal lands on the card it ends on — focused=#1 expected #1
```

（`peak=1.049`：车主把 `magnify` 设成 **1.05**，峰值因子是用户偏好，不是缺陷；早期版本
的探针拿 1.05/1.1 当阈值才误报，已改成结构性判定。）

---

## 2. 回归：既有 hover 释放断言

`scripts/verify-rail-interaction.cjs`（12px 粒度走遍所有退出路径）在修复后：

```
PASS  left of the leftmost card / right of the rightmost / down the empty first column
PASS  down into the band below the deck / up above the first row / fast diagonal out
PASS  stationary: the wave is engaged first
```

修复前基线（同一台 GUI、同一份 state）与修复后**失败集合完全相同**：4 项滚轮相关断言
（见 §3），说明本次改动没有引入新的退出失效。

同时修正了该脚本里一处**过期前提**：「down the empty first column」原先沿
`railLeft + 8` 下行，而 3 列满行时最左卡的左边缘在 `railLeft + pad(10)` —— 该点距卡边仅
2px，落在 `TILE_TOLERANCE = 7` 的光晕内，**保持放大才是正确行为**，脚本却当成缺陷。
现在改为 `leftmostCardLeft - 9`（光晕之外），左侧空隙不足 8px 时直接 SKIP 并说明原因。

---

## 3. 本次**未**修复、但已定位的同类缺陷（同一根因，需成对修）

| 现象 | 根因 | 证据 |
|---|---|---|
| 挂载 pinned 摘要卡时，**滚轮完全不能滚动组件栏**，deck 末尾 147px 不可达 | `rail-view.tsx` 的 `lastRow` 由同一个写死的 4px 推出：`contentBottom ≤ (RAIL_ROW_SEAT + r·pitch − 4) + paneH`，push 后真实的可见带起点是 `scrollTop − 135` | 实测 `padding-top: 135px`、`maxScroll: 147`、滚轮 `0 → 0`；`verify-rail-interaction` 的 4 项滚轮断言 |
| `wholeCards` 整卡判定带（`bandOf` / `syncWholeCards` / `overlayBand`）偏 131px | 同一常量 | 修正 band 后实测：deck 最后一张卡（client 881–1011，超出 rail 盒 11px）会被判「被裁」而**整卡隐藏**，而滚轮又滚不动 → 车主找不回这张卡 |

因此本次**故意**让 band 继续用写死的 4px：命中判定与 `syncWholeCards` 的绘制判定读同一
个常量，二者依旧一致（band 偏宽松 = 少隐藏），只是 hit 判定改成实测内边距后与**实际绘制
位置**对齐了 —— 这正是车主报的那个问题。要修 §3，必须同时修 `lastRow`（否则会隐藏一张
用户再也滚不回来的卡），属于独立改动，建议下一轮单独做。

---

## 4. 产物与文件

- 源码：`src/client/rail/wave/RailWave.tsx`（`readTopInset` + `onCard` + `moveRailFocus`）
- 探针：`scripts/verify-rail-hover-alignment.cjs`（新，长期断言）
- 探针修正：`scripts/verify-rail-interaction.cjs`（空列前提 + `leftmostCardLeft`）
- 证据：本目录 `2026-10-08-hover-align-{before,final}.log`、
  `2026-10-08-rail-interaction-{pre,final}.log`、
  `2026-10-08-addtile-{pre,post}.log`（副作用对照：pinned 摘要、`dsx-slot-cut`、
  `maxScroll` 在修复前后逐项相同）
- `pnpm check`（registry + tsc）通过；`tsdown` + `build-types.mjs` 已重建 `lib/`
- 现场状态：`dsh-widgets-state.json` 仅 `savedAt` 被客户端刷新，`railOpen=true`、`magnify=1.05`
  等车主配置未变；右侧边栏宽度 0（关）、左侧边栏 6 行可见（原样）
