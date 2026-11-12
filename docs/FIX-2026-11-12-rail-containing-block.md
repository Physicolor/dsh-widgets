# FIX-2026-11-12 — DSH 0.2.2 之后组件区与置顶摘要一起跑到输入框里

车主报告（截图 2026-11-12，升级 DSH 到 `0.2.2-rc.1` 之后）：`顶部栏` 与 `右侧区域` 显示都出问题，
`组件区域` 和 `置顶摘要` 出现在错误位置；怀疑是 `dsh-ui-harmonizer` / `dsh-widgets`，或**关闭 ds-bot 插件**
留下的副作用。

证据图：[before](diag-rail-0.2.2-before.png)（修复前，组件卡压在输入框上）
· [after 1600x1000](diag-rail-0.2.2-after-1600.png) · [after 1707x1067](diag-rail-0.2.2-after.png)

## 根因（实测）

**`position: fixed` 的包含块被产品挪走了，不是插件算错坐标。**

rail 注册在 `conversation.input.overlay`，也就是**输入卡片内部**。DSH 0.2.2 给会话的
`.an3WzG_composerSeat` 加了 `will-change: transform`（实测 `getComputedStyle(seat).willChange
=== 'transform'`，而同一元素的 `transform / filter / backdrop-filter / contain` 全是
`none / none / none / none`、`contentVisibility: visible`、`containerType: normal` —— 射线里**只有这一个**
触发条件）。`will-change` 点名 transform 就会让该元素成为 `position: fixed` 后代的**包含块**，
于是抽屉（`.dsx-stats-drawer`，`inset: 0`）不再对齐视口，而是对齐输入卡片那条 853×132 的带子：

```
视口 1600x1000，rail 实测：
  before  [673, 912, 460, 93]    ← 被输入卡片的 seat 夹住（853 宽、132 高）
  after   [1140, 44, 460, 956]   ← 右栏贴视口右沿、顶到会话头下沿、底到视口底
抽屉自身：before [280,868,853,132] → after [0,0,1600,1000]
```

置顶摘要是**连带伤害**，不是第二个 bug：它的 `right` 由 rail 的矩形反推
（`card.js`：`card.style.right = vw - rail.rect.right + GAP`），rail 偏了 477px，卡片就跟着偏
（实测 `transform-origin: calc(100% - 477px) 62px`）。rail 复位后卡片自动落在组件列第一段。

## 为什么不是 harmonizer / widgets 的规则，也不是 ds-bot

- 触发点在**产品的节点**上（`.an3WzG_composerSeat`），不在任何插件自己的元素上。
- `dsh-ui-harmonizer/src` 与 `dsh-widgets/src` 里**没有任何** `will-change` 声明落在会话头/输入区
  （两处 grep 为空）；`installed app.asar` 里 `.an3WzG_composerSeat` 的静态规则也不含 `will-change`，
  说明它是运行时注入的样式表（CSSOM 里枚举不到，`document.styleSheets` 与
  `adoptedStyleSheets` 全扫亦为空）。
- `ds-bot@0.3.5` 的包内**没有任何 CSS 文件**（`*.js`/`*.css` 里搜 `will-change: transform` 为空），
  升级记录只是把它从 profile 的 `bundles` 里移除；它不参与这层 CSS。
- 决定性对照：在**同一个页面**里只把抽屉 `appendChild` 到 `<body>`（不动任何插件、不改 profile），
  rail 立刻回到 `[1140,44,460,956]` —— 变量只有一个：包含块。

## 修法

`src/client/rail/rail-view.tsx`：抽屉改为 **portal 到 `<body>` 上的宿主**
（`div.dsx-stats-drawer-layer`，`display: contents`，每个文档惰性建一次）。
portal 而不是 `appendChild`：React 18 把事件委托挂在 root 容器上，被挪走的 React 节点会**丢掉全部
handler**（rail 的悬浮/折叠全靠合成事件）。

注册位置**不变**（仍是 `conversation.input.overlay`）——语义、绘制顺序、以及"面板盖住 rail"的
相对层级都保持原状：抽屉不带 z-index，因此 置顶摘要卡片（8）、会话头（21）、右侧面板（40）
照旧压在它上面（实测 `elementFromPoint(1400, 20)` 命中 `_titleCluster`，会话头仍遮住 rail 顶边）。

## 验证

`scripts/verify-rail-anchor.cjs`（新增，长期断言）：

```
ok  exactly one drawer host on <body> — hosts=1
ok  the drawer is mounted in that host, not in the composer card — parent=dsx-stats-drawer-layer
ok  rail right edge sits on the viewport edge — right=1600 vw=1600
ok  rail bottom edge sits on the viewport floor — bottom=1000 vh=1000
ok  rail keeps its column width (not squeezed into the composer strip) — w=460
ok  rail is in the right half of the window — x=1140
ok  the toggle still reaches React through the portal (closes) — aria-pressed=false
PASSED 10/10 checks — rail anchor
```

另外：`tsc --noEmit` 干净；`npm test` **13/13 gates** 全绿（G4 render 快照、G5 CSS 逐字节、
G7 published-types 都过）；1707x1067 下 rail `[1137,44,570,1023]`，四列布局正常。

## 限制

- 其他**同样把 fixed 浮层放在 `conversation.input.overlay` 里**的第三方插件仍会遇到这个包含块
  （本次只修了 dsh-widgets 自己）。要么各自 portal，要么由 harmonizer 统一把该 seat 的 `will-change`
  中和掉（`will-change: auto !important`）——后者会牺牲产品给输入区动画留的合成提示，故本次没做。
- "打开右侧面板时面板盖住 rail" 这条只核对了层级值（抽屉 auto / 面板 40）与 `--dsx-rail-w` 的
  swallowed 路径，没有做面板打开态的逐帧对照。
- 顶部栏本身没有独立缺陷：会话头仍是 50px 单行（标题 / 模式 / 对话页签 / 工具），与修复前的结构一致。
  页签自身的"蓝条太短 + 文字偏高"是另一件事，属 `dsh-ui-harmonizer` 的页签样式（已修，见下节）。

## 追加：为什么别人"从插件搜索装到的还是 1.8.5"（2026-11-12 复查）

不是 npm，也不是这个仓库：`npm view dsh-widgets dist-tags` → `latest: 1.9.0`（今天 17:59 发 GitHub
Release，18:02 发 npm）。**是第三方索引 `awesome-dsh-plugin.com` 的每日快照还没重建**：

| 证据 | 值 |
| --- | --- |
| `plugins.json` 快照日期 | `updated: 2026-11-11` |
| 该快照里 `dsh-widgets.version` | `1.8.5`（`dsh-ui-harmonizer` 同样停在 `0.9.2`） |
| `updates.json` 里该仓库的 release | `v1.8.5`（`checkedAt: 2026-11-12`，但抓取时间 07:06Z 早于 17:59 的 v1.9.0） |
| npm `latest` | `1.9.0` |
| GitHub tag / Release | `v1.9.0`（`published_at 2026-11-12T09:59:34Z`） |

市场客户端还有一层本地缓存：`profiles/desktop/.dsh-market/discovery-compatibility-v1.json`
（TTL 24h）里 `dsh-widgets` 记的版本是 `1.8.5`、`checkedAt` 约 **10-23**，即三天前的旧值；
`dsh-ui-harmonizer` 记的是 `0.9.2`。

**但刷不刷新索引都救不了这次的错位**：v1.9.0 是 17:59 发的，`rail` 的 portal 修复 20:19 才落、
页签修复 20:47 才落。要真正发到用户手里，必须出一个 **1.9.1**（组件栏/置顶摘要）以及
**dsh-ui-harmonizer 0.9.6**（顶部页签），并各自在 GitHub 建 Release —— 索引按 Release 取版本。

## 追加：顶部页签的蓝条与文字错位（dsh-ui-harmonizer）

同一个截图里「对话」的那条蓝条只有 6px、文字比「创造模式」高 6px。蓝条是产品自己在按钮上的
`::after`：`left: 10px; right: 10px; bottom: -1px; height: 2px` —— 它靠**按钮两侧各 10px 的内边距**
撑出与文字等宽。harmonizer 早先给页签写的 `padding: 5px 0` 把两侧 20px 削掉了，蓝条于是
`26 − 20 = 6px`；而 `_tabLabel` 也含 `_tab`，同一条规则又给标签加了 5px 内边距，文字因此上移 6px。

修法（`dsh-ui-harmonizer/src/client/harness/session-header.module.css`，两条规则分工）：
标签 `padding: 0`；按钮 `padding: 0 10px 3px; margin: 0 -10px; height: auto; align-self: center;
position: relative; top: 2px`。实测 1707x1067（DevTools 4x 特写复核）：

```
蓝条        6px → 26px（= 标签宽）
文字字形框  11–28（模式徽章 17–33）→ 16.5–33.5（徽章 17–33，中心 25 对 25）
会话头高度  50px → 50px
```

