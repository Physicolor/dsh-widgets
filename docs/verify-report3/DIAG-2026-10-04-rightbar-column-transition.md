# 诊断：右侧边栏开合时「对话记录与输入框区域平移动画掉帧」

- 日期：2026-10-04
- 车主原话（m02886）：「帮我看一下右侧边栏展开时对话记录与输入框区域的平移动画掉帧问题。该问题的唯一变量就是展开和收起右侧边栏，先检查相关问题，并调研修复方案，判断该问题是否属于 DeepSeek Harness Desktop 本身，相关修复代码是否应该由 dsh-ui-harmonizer 插件承载」
- 结论：**动画本身属于 `dsh-ui-harmonizer`；底层掉帧属于 DSH Desktop 自身**。两者分开陈述，见第 4 节。
- 约束：不改官方 shell 一个字节。

---

## 1. 结论速览

| 判断 | 结论 | 依据 |
|---|---|---|
| 官方 `.BynINW_frame[data-animating]` 的列宽过渡规则 | **存在，但在本机是死规则**（0 次 transitionrun/end，列宽 snap） | `.probe-official-rule/` H 档、`.probe-official-prearm/` H 档 |
| 让列宽真正动起来的规则 | **`dsh-ui-harmonizer` 的永久规则** `html [class$='_frame']`（169 字符样式表） | 禁用它 ⇒ computed 退回 `transition-property: all; 0s` |
| 官方规则为何失效 | `data-animating` 与新的 inline grid track 落在**同一个 commit**，before-change style 仍是 `all 0s` | 空闲帧预置属性后官方规则立刻正常动画（P 档） |
| 掉帧的主因 | 官方 shell 每帧**强制同步布局**（LoAF 里 `force ≈ duration`） | `.probe-frame-tween/`、`.probe-track-cost/` |
| 插件这份 tween 的代价 | 官方 ResizeObserver 回调 **27–37 次/次开栏 → 9–10 次**；p95 11.5 → 8.4ms；>33ms 帧 8 → 3 | `.probe-official-rule/` A/H/K |
| 实测最优的候选修复 | 杀 tween 让布局一次落定 + 合成器 cover（纯 transform）：p95 7.9ms、>33ms 3 帧、RO 9 | `.probe-track-xform/` X 档 |
| 修复代码应落在哪 | **`dsh-ui-harmonizer`**（它引入该动画、有 `enhc-window-resizing` 例外、注释里已记录官方缺陷） | `frame-column-transition.module.css` + `frame-track.ts` |
| 能不能彻底消除卡顿 | **不能**，官方 shell 自己的 snap 就有 ~200–250ms 阻塞（全杀动画后仍在） | H/K 档 block 238–244ms |

---

## 2. 机制：两条互为竞品的规则，官方那条是死的

同一个文档里同时存在两条声明、作用对象相同的 `transition`，选择器特异性不同：

- **官方**（`@deepseek-ai/dsh-client-ui-layout/AppFrame.module.css`，`<style>` 元素 `len=4018`）：
  `.BynINW_frame[data-animating] { transition: grid-template-columns var(--ds-transition-duration-slow) var(--ds-ease-in-out) }`
  同级还有 `.BynINW_frame[data-dragging] { transition: none }`、`[data-rightbar-fullscreen]`、`[data-rightbar-instant]`、以及 `@media (prefers-reduced-motion: reduce) { .BynINW_frame[data-animating] { transition: none } }`。
- **插件**（[`frame-column-transition.module.css`](../../../dsh-ui-harmonizer/src/client/harness/frame-column-transition.module.css)，43 行，`<style>` 元素 `len=169`）：
  `:global(html [class$='_frame']) { transition: grid-template-columns var(--ds-transition-duration-slow) var(--ds-ease-in-out) }`
  `:global(html.enhc-window-resizing [class$='_frame']) { transition: none }`

按特异性，官方那条应当赢。但实测相反：

| 档 | 配置 | idle computed | 列宽步数 | `grid-template-columns` 过渡事件 | `data-animating` 帧 | RO 回调 | p95 | >33ms | block | force |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 现装 | `grid-template-columns 0.3s` | **5** | **2**（run@122 → end@374） | 6/199 | **27** | 11.5 | 8 | 351 | 263 |
| H | 只留官方规则（禁用插件样式表） | `all 0s` | **2**（snap） | **0** | **52/224** | **10** | 8.4 | 3 | 244 | 193 |
| K | 注入 `transition: none !important` | `none 0s` | 2 | 0 | 49/229 | 10 | 7.9 | 3 | 238 | 197 |

H 档里官方**确实**在开栏期间给 frame 设了 `data-animating`（52/224 帧为 true），但 `grid-template-columns` 的 `transitionrun`/`transitionend` **一次都没有**，中心列只有两个宽度（1427 → 659，单帧 snap）。

**原因已证实**：`AppFrame` 在 `useLayoutEffect` 里设 `data-animating` 的**同一次 commit** 写出新的 inline grid track，因此 CSS transition 的 before-change style 读到的是 `transition-property: all; transition-duration: 0s`，过渡永不启动。

**证明方式**（`.probe-official-prearm.cjs`）：把插件样式表禁用后，先在**空闲帧**里手动 `frame.setAttribute('data-animating','')`（双 rAF 确认属性存活），再点击开栏：

| 档 | idle computed | 列宽步数 | grid 事件 |
|---|---|---|---|
| H 只留官方 | `all 0s` | 2 | 0 |
| P 官方 + 空闲帧预置属性 | `grid-template-columns 0.3s` | **6** | **2**（run@109 → end@623） |
| A 现装 | `grid-template-columns 0.3s` | 6 | 2 |

P 与 A 完全一致 ⇒ 官方规则本身没写错，只是**永远赶不上自己的 before-change style**。已排除 `prefers-reduced-motion` 假说（本机 `matchMedia` 为 false，且插件规则不受该媒体查询影响）。

插件源码里的注释记录的就是这同一件事：DSH 0.2.0 把过渡挪到 `[data-animating]` 之后，「中心列 `1640px → 776px` 单帧跳变、frame 不发 transitionrun/start/end、`data-animating` 保持 600ms 后被组件自己的兜底 timer 清掉」。本机复现了这个描述。

---

## 3. 掉帧：主线程被强制同步布局占满

开栏不是「动画没跑」，而是**跑了但每帧画不出来**。

- `transitionrun grid-template-columns@160 → transitionend@421`，`duration 300ms`，`ease cubic-bezier(0.4, 0, 0.2, 1)`。
- 在 `.tmp-track-interp.cjs` 的 rep2/rep3 里，从 run 事件（@110/109ms）到第一个可见变化（@186.1/183.7ms）之间有 **约 75ms 画面完全不动**；整个 300ms 窗口内总共只画出 **6 个不同宽度**。
- LoAF：单次开栏阻塞累计 block 351ms（A）/ 244ms（H），且**几乎所有大帧 `force ≈ duration`**（如 `shell:(anon) 150ms / force 137`、`combo:onTrackTransitionRun 13ms / force 9`）⇒ 成本主要来自**强制同步布局**，官方 shell 与插件各约一半。
- `scriptDuration` 在三档里几乎相同（A 514ms / S 516ms / N 527ms）⇒ **主线程脚本总量与被动画驱动的布局步数无关**，tween 的代价体现在长帧数量上。
- `contain: layout paint` 无效；把 tween 压到 150ms/60ms 反而更差（stall 更高）。

**逐回调归属**（`.tmp-join.cjs` 把 6 次开合的 owner 栈与本地 bundle 精确匹配，排除 fetch）：

| 归属 | 耗时 | 主要来源 |
|---|---|---|
| official | **310ms** | ResizeObserver：`73005` n=14 183.2ms（max 50.9）、`80410` n=18 124.8ms（max 65.3） |
| dsh-ui-harmonizer | 164ms | rAF：center-card 的 `measure()` 里 `col.getBoundingClientRect()` n=2 **max 82.6ms**；`schedule@3176` n=12（设置页 MutationObserver，与右栏无关） |
| dsh-widgets | 56ms | `transitionrun` 监听 37ms/16（max 31.9）+ RO 10ms + rAF 5ms |
| other | 55ms | `dsh-genui` 命中不可信 |

官方侧量级最大。**dsh-widgets 不是这条动画的起因**：它只跟随（`--dsx-rail-right` 在 track 第一帧读取），而它的 `transitionrun` 监听之所以被触发 16 次，正是因为插件 tween 在发 `grid-template-columns` 的过渡事件；杀掉 tween 后这 37ms 也一起消失。

---

## 4. 归属判定（车主第三问）

**两层要分开陈述：**

1. **「对话区平移动画」这件事属于 `dsh-ui-harmonizer`。**
   官方原版行为是 **snap**（H/K 档：2 步、p95 7.9–8.4ms）。现在看到的 300ms 平滑位移，完全是插件那条永久规则提供的；插件的源码注释解释了官方缺陷、`frame-track.ts` 还专门用 `enhc-window-resizing` 类保护拖窗场景。**平滑度调优只能落在这个插件里**，改官方 shell 无意义（官方那条规则在本机是死的，改了也不会生效）。

2. **「底层掉帧」属于 DSH Desktop 自身。**
   把动画全部杀掉之后（K 档）仍有 **238ms 阻塞、~200ms 首帧、3 个 >33ms 长帧**，`force ≈ duration`。这是官方 shell 自己的强制同步布局，属于插件空间之外；插件唯一能做的是**不要用主线程布局动画**去驱动它。

3. **`dsh-widgets` 不需要为这条动画负责。**

---

## 5. 候选修复（已测量，供 harmonizer 决策）

### 方案 X（推荐）：布局一次落定 + 合成器 cover

思路：`grid-template-columns` 的插值是主线程布局动画，无法合成器加速；官方 shell 又会在每一帧里重新测量列宽。所以**不做宽度动画**——让 frame 在一个 commit 内 snap 到终态（官方测量循环只跑一次），再用纯 `transform` 的 `element.animate()` 复现眼睛看到的位移。

关键量：**cover 位移 = 304px，不是列宽差 768px。**
`[data-conversation-scroll]` 的载体是 `div.Dc7zOa_scrollBody`（1425×1017）；列左边缘恒为 280（不动），列只是变窄、内容居中，所以文本/输入框的视觉位移是：

| 状态 | colL | colW | carW | 输入框 left | 输入框 width |
|---|---|---|---|---|---|
| closed | 280 | 1427 | 1425 | **600** | 776 |
| open | 280 | 659 | 657 | **296** | 617 |

```
el.animate(
  [{ transform: 'translateX(304px)' }, { transform: 'translateX(0px)' }],
  { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'none' })
```

实测画像（median / 3 轮 / 单次开栏，headful 1707×1067 @1.5，右栏初始与恢复均 CLOSED，page errors none）：

| 档 | 配置 | frames | p95 | >33ms | RO 回调 | block | force |
|---|---|---|---|---|---|---|---|
| A | 现装 tween | 183 | 12.5 | 8 | **37** | 272 | 191 |
| S | 官方 snap | 215 | 10.3 | 5 | **9** | 238 | 189 |
| **X** | **snap + cover** | 281 | **7.9** | **3** | **9** | **227** | 177 |
| Y | 官方 snap + cover | 277 | 8.4 | 3 | 9 | 247 | 188 |

X 在帧数、p95、>33ms 三项上全部最好，block/force 也不劣于 S。冻结帧对照（`.probe-cover-look/`）显示 X 的输入框 left 连续移动 `600 → 559 → 364 → 304`，而 A 是「列宽在缩 + 输入框在左移 + 输入框宽度自己在变」三件事同时发生。

**已知代价（需车主目视确认）**：
- cover 期间文本**不重排而是整块滑动**，宽度在 t=0 就跳到 617（closed 是 776），文字折行在起始帧一次性变化；
- cover 进行中列边缘会短暂露出空白条；
- 右栏自身内容（工作区文件/上下文面板）在 snap 下瞬间到位，不参与 cover。

### 不推荐

- 缩短 tween：150ms 实测 stall 反而最高，60ms 档 p95 79ms 更差。
- `contain: layout paint`：无效果。
- 减少卡片数量：13 张 → 3 张让单次 commit 更贵（55.82 → 90.05 ms/call）。

---

## 6. 未做声称

- 未改官方 shell 一个字节。
- 未在 `dsh-ui-harmonizer` 里落地任何修改——本轮只做检查、测量与归属判定。
- 未声称「彻底消除卡顿」：K 档仍有 238ms 阻塞，属于官方 shell。
- 未在真实 Electron 窗口内测量：`DeepSeek Harness.exe`（pid 52348，监听 19387）未开 remote-debugging-port，CDP 无法附着。探针是用 Playwright Chromium 连到**同一个 `127.0.0.1:19387`**，加载的是**同一批 client bundle 与同一份 CSS**，差异只在引擎构建号。
- 未声称 cover 方案的观感一定优于现装：需要车主看 `.probe-cover-look/X-*.png` 与 `A-*.png` 的对比后再决定。

---

## 7. 证据文件

探针（一次性，`.tmp-*`，位于 `D:\dsh-home\plugins\dsh-widgets\scripts\`）：
`.tmp-official-rule.cjs`（A/H/K 三档定量）、`.tmp-official-prearm.cjs`（空闲帧预置属性，机制证明）、`.tmp-cover-look.cjs`（冻结帧可视判定）、`.tmp-track-xform.cjs`（A/S/X/Y 画像 + RO creator 栈）、`.tmp-track-interp.cjs`（插值采样）、`.tmp-ro-per-frame.cjs`（每帧 RO 次数）、`.tmp-sidebar-attrib.cjs`（五配置剔除）、`.tmp-frame-tween.cjs`、`.tmp-track-cost.cjs`、`.tmp-transition-origin.cjs`（CSSOM 扫描）、`.tmp-style-dump.cjs`（两份样式原文）、`.tmp-reduced-motion.cjs`、`.tmp-join.cjs`、`.tmp-resolve.cjs`、`.tmp-locate.cjs`、`.tmp-anim-path.cjs`、`.tmp-cover-final.cjs`（失败，已弃用）。

产物：`.probe-official-rule/`、`.probe-official-prearm/`、`.probe-cover-look/`（含 `A-060/150/240.png`、`X-*.png`、`W-*.png`）、`.probe-track-xform/`、`.probe-track-interp/`、`.probe-ro-per-frame/`、`.probe-sidebar-attrib/`、`.probe-frame-tween/`、`.probe-track-cost/`、`.probe-anim-path/`、`.probe-style-dump/`、`.probe-toggle-owners2/`、`.probe-locate/`、`.probe-cover-visual/`。
