# 展开/收起的「回程路径」与「回弹」：权威实现调研（2026-10-02）

> **触发**：owner 提问——回弹动画里，返回路径应当像他画的那样**不与**原来的平移路径重合，
> 还是必须与平移路径重合？并要求给出「比较权威、优秀的实现方式」。
>
> **用途**：本结论是 `prefs.openShape`（`zoom` / `stagger`）与 `prefs.animBounce` 的设计依据，
> 见 `src/client/runtime/prefs.ts`（`overshootCurve`）、`src/client/rail/wave/deck-cascade.ts`、
> `src/client/rail/rail-view.tsx:119`。

## 0. 结论

同一个面板（或同一组卡片）的**展开 → 收起，回程必须与去程共用同一条路径**：回程是去程
时间线的**倒放**（同一组属性插值、同一几何轨迹、同一个锚点），spring 的**回弹也发生在同一条
路径上**——它是**进度值冲过 1（沿路径切向越过终点）再退回**，不是另画一条偏移曲线绕回来。

「回程走另一条路径」只在**元素身份被替换**时才是对的：新元素从另一侧进场、旧元素从另一侧
退场的 swap（Material 的 *fade through*、Motion 的 `AnimatePresence`），或两个**没有共享空间
对应关系**的容器之间的 morph。

因此：owner 图里「返回路径与平移路径不重合、绕一条偏移曲线回来」在本项目（同一批卡片、
同一批位置）的语义下**不采用**。

## 1. 回程必须与去程同路径（同一元素）

| 来源 | URL | 原文关键句 | 支持 |
|---|---|---|---|
| Apple HIG — Motion | https://developer.apple.com/design/human-interface-guidelines/motion | "Strive for realistic feedback motion that follows people's gestures and expectations. … if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side." | **同路径**：从哪来就回哪去，收起方向必须与展开方向一致 |
| Apple `UIViewAnimating.isReversed` | https://developer.apple.com/documentation/uikit/uiviewanimating/isreversed | "When the value of this property is true, animations run in the reverse direction—that is, view properties animate back to their original values." | 反向定义在**属性值空间**里，即同一插值倒放 |
| W3C CSS Transitions L1 §3.1 *Faster reversing of interrupted transitions* | https://www.w3.org/TR/css-transitions-1/#reversing | 反向时 cancel 运行中的 transition 并新建一条，"reversing-adjusted start value is the end value of the running transition"；时长按 reversing shortening factor 缩短（"in amounts of the value, not time"）；"Note that these rules lead to the entire timing function of the new transition being used, rather than jumping into the middle of a timing function, which can create a jarring effect." | **同一条 timing function 倒放**，起点取当前值，且明确反对「跳到曲线中间」 |
| Material Components Android — Motion（Container transform） | https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md | "MaterialContainerTransform internally configures the transition's properties based on whether or not it's entering or returning." 阈值成对：`[0.0 - 0.25] enter` / `[0.6 - 0.9] return`，`[0.1 - 0.4] enter w. arc` / `[0.6 - 0.9] return w. arc` | **同一条 transition、同一几何变换**，enter/return 只在时间阈值上分叉（=倒放） |
| Material `MaterialArcMotion.java` | https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/transition/MaterialArcMotion.java | `if (startY > endY) return new PointF(endX, startY); else return new PointF(startX, endY);` —— 起终点互换得到**同一个控制点** | 即使走弧线，回程也精确重走去程那条弧 |
| Motion（motion.dev）`arc()` | https://motion.dev/docs/arc | direction 默认 "Automatic — arc() picks a stable screen-space side and keeps the bulge on that side even when the direction of travel flips between calls." | 方向翻转时弧的凸向不变 ⇒ 回程重走同一条弧 |

## 2. 回弹：过冲是「进度越界 + 沿路径切向外推」

| 来源 | URL | 原文关键句 | 结论 |
|---|---|---|---|
| Motion `arc()`（Springs 段） | https://motion.dev/docs/arc | "With a spring, the progress value overshoots t = 1 and oscillates back, so the element samples past the endpoint and settles with a bouncy arc." | 元素是**沿同一条路径采样过了终点**再退回 |
| Material `MaterialContainerTransform.java` | https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/transition/MaterialContainerTransform.java | `// Allow overshoot by extrapolating position using trajectory at closest part of motion path`，随后 `motionPathX += (motionPathX - trajectoryMotionPathX) * trajectoryMultiplier;` | 过冲用路径**切向**做线性外推，不脱离路径 |
| Apple `CASpringAnimation` | https://developer.apple.com/documentation/quartzcore/caspringanimation | "Because the spring animation can overshoot its toValue, the animated layer may exceed its frame." | 过冲 = **值轴**越界（属性值冲过 toValue） |
| MDN `cubic-bezier()` | https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/cubic-bezier | "In this example, the red ball bounces out of the box when transitioned from its original position. This is because one of the P2 values, 2.3, goes beyond the [0, 1] range." | CSS 里同样只有「同一属性值冲出去再弹回」，没有「另一条路径」的概念 |
| W3C CSS Easing Functions L2 | https://www.w3.org/TR/css-easing-2/ | "The output progress value is a real number in the range [-∞, ∞]." | 过冲就是进度可越界 |

## 3. 中断 / 反向的权威规则

| 来源 | URL | 原文关键句 | 规则 |
|---|---|---|---|
| Apple WWDC23 10158《Animate with springs》 | https://developer.apple.com/videos/play/wwdc2023/10158/ | "When that happens, a spring animation uses the velocity it had when it was retargeted as the initial velocity towards its new destination and this same velocity preservation makes these kind of interruptions feel smooth and natural." | 重定向时**速度连续**，不重启 |
| SwiftUI `Animation.spring(duration:bounce:blendDuration:)` | https://developer.apple.com/documentation/swiftui/animation/spring(duration:bounce:blendduration:) | "A persistent spring animation. When mixed with other spring() or interactiveSpring() animations on the same property, each animation will be replaced by their successor, preserving velocity from one animation to the next." | 后继动画继承速度 |
| SwiftUI《Unifying your app's animations》 | https://developer.apple.com/documentation/swiftui/unifying-your-app-s-animations | "Retargeting a SwiftUI animation uses the velocity from the previous animations to carry the animation forward with continuous velocity, creating a fluid animation experience." | 同上 |
| W3C CSS Transitions L1 §3.1 | 同 §1 | 反向 = cancel + 新建，起点取当前值，时长按**已走过的值域比例**缩短，"rather than jumping into the middle of a timing function" | 反向是**同一条曲线倒放**，只是重新计时 |
| Motion `spring.ts`（源码） | https://github.com/motiondivision/motion/blob/main/packages/motion-dom/src/animation/generators/spring.ts | `retarget`："Aim the spring at a new target from its current position and velocity…"；另注："Time-defined springs ignore inherited velocity." | 物理 spring 继承速度；**时间型**（duration/bounce）spring **不继承** |
| Motion Layout animations | https://motion.dev/docs/react-layout-animations | "Motion animates the actual elements using transforms: it's interruptible…"；对比 View Transitions API："Not interruptible: Interrupting an animation mid-way will snap the animation to the end…" | 「可中断并从当前位置续走」是质量基线 |

## 4. 何时才该用不同路径（边界）

| 来源 | URL | 原文关键句 | 场景 |
|---|---|---|---|
| Material Components Android — Motion（Fade through vs Shared axis） | https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md | Fade through："used for transitions between UI elements that do not have a strong relationship to each other"／"not spatially related"；Shared axis："a shared transformation on the x, y, or z axis"（Forward = Left / Backward = Right） | 元素之间**没有空间关系**→ 不同路径；**同一轴上的前后关系**→ 同轴反向 |
| Motion `<AnimatePresence>` | https://motion.dev/docs/react-animate-presence | 官方 slideshow：`initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: -300 }}`；`mode="wait"` 段建议 exit 用 easeIn、enter 用 easeOut | 新元素从另一侧进、旧元素从另一侧出（swap）——**这才是「回程不重合」的正确用法** |

## 5. 落到本项目

**现状（`openShape` 两种形状）**：`stagger` 下每张卡片走的是 `zoom` 整组走的同一条 affine 映射
（同一屏幕外锚点、同一 `animScale`、同一 `travel`、同样两条曲线），只是各自错开时机；收起是
**同一条时间线取反**（`deck-cascade.ts` 的单一共享时钟改符号），因此每张卡片沿**自己那条**路径
原路返回，错峰顺序自然镜像。回弹（`prefs.animBounce`）折进**位移曲线**（`overshootCurve` 抬高
`y1` 直到曲线峰值超出 1 恰好 `bounce`），所以过冲量就是 `bounce × travel` 的**同路径切向**过冲；
缩放曲线保持 `y ∈ [0,1]`，整栏不会长过所在列。

对照第 1、2 节：**符合权威做法**（等价于 Material container transform 的 enter/return 与 Apple
「从上滑下来的视图不会从侧面关掉」）。owner 图中「绕偏移曲线回来」不采用。

**两个有意接受的取舍**：

1. **反向瞬间速度方向翻转**（时间线倒放）。这是 CSS Transitions §3.1 与 UIKit `isReversed` 的定义；
   Apple 的「速度继承」是 *spring retarget* 的语义，而我们的运动是**定时** cubic-bezier——同属时间型
   的 motion.dev spring 也明确不继承速度（见 §3 源码注）。真要速度连续，需要把 fold 换成
   stiffness/damping/mass 的物理 spring，代价是折叠总时长不再等于外壳的
   `--ds-transition-duration-slow`（`deck-cascade.ts` 的整条设计前提），故不采用。
2. **在过冲段（p ≈ 0.585 之后）中断时，回程会先沿路径再往前一点点再折回**。这同一条曲线的自然
   结果，也正是 CSS reversing rule 的做法（起点取当前值 + 用整条 timing function）。

## 6. 未能验证的部分（明确标注）

- **m3.material.io 规范正文抓不到**（Angular 前端渲染，Wayback 快照同样为空）：本文**没有** Material
  规范原文「exiting/entering 应是同一条 transition 的倒放」这句；Material 侧证据全部来自官方
  **Android 实现文档 + 官方源码**（同一团队维护，且是规范的可执行落地）。
- **Apple 没有**任何字面 "the reverse of a transition should retrace the same path"；最接近的是 HIG
  Motion 那段「从上滑下来的视图不该从侧面关掉」（页面为前端渲染，引文取自官方数据端点
  `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json`）。
- 本次 `web_search` 因额度不足（HTTP 400 insufficient credits）完全不可用，全部结论来自直接
  `web_fetch` 上述官方来源与官方源码，没有搜索引擎的二次确认。
