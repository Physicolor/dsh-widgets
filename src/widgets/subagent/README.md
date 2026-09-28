# subagent — 子代理

> 第三批部件（Wave 1），`order: 84`，`group: system`，尺寸仅 `2x2`，无 `source` / `skeleton`。

## 1. 这张卡回答什么问题

**本会话到底派了几个子代理、它们中间谁的活跃时长最长、有几个是持续型、最近一个带标签的是谁。**
多代理是长跑里时间与成本的主要来源，而它在 rail 上完全不可见——官方的 `subagentCatalog` 投影至今没有任何消费者。

## 2. 卡面草图（2×2 = 150×150 内容区）

```
┌──────────────────────────────┐
│ 子代理                        │  ← card.subagent.title（蓝 13px）
│ 4                             │  ← headAfter.big：子代理总数（20px）
│ 活跃时长 36m12s                │  ← legend：最久的活跃时长（灰 10px）
│ ────────────────────────────  │  ← breakdown 的发丝分隔线
│ 最久                 36m12s   │  ← 最大 activeMs（>30m 转 warn 琥珀）
│ 持续型                 2 / 4   │  ← mode === 'continuable' 的个数 / 总数
│ 最近 dsh-widg…          4m 前  │  ← 最新一个带 label 的身份（左列，右缘淡出）+ 它的创建年龄
└──────────────────────────────┘
   行数：head（59px）+ 3 行明细（51px）+ 内边距 24px = 134 / 150，余 16px
```

降级形态（`activeMs` 一个都没有时）：

```
│ 4                             │
│ 最早 48m 前创建                │  ← legend 退化为「最早 … 前创建」
│ ────────────────────────────  │
│ 最久                     —     │  ← tone: 'muted'
│ 持续型                 2 / 4   │
│ 最近 dsh-widgets …      4m 前  │
```

## 3. 数据来源

只读 `WidgetStats` 的一个字段：

| 字段 | 口径 |
| --- | --- |
| `stats.subagents` | `SubagentEntry[] \| null`，即官方 `subagentCatalog` 投影（已被 `normalizeSubagents` 归一化）。**目录顺序 = 最旧在前。** |
| `.length` | 子代理总数 → 大数字 |
| `.mode` | `'one-shot' \| 'continuable'`。「持续型」= 计数后写 `n / 总数` |
| `.activeMs?` | 子代理自己日志里的**活跃轮次时长**（epoch ms 差值），父会话是通过客户端 session list 绕道拿到的 → **可能整批缺失** |
| `.createdAt` | epoch ms，投影保证有。用于「最早 … 前创建」与「最近」的判定 |
| `.label?` | 身份标签，可能很长、可能没有 |

**契约现状（必须知道）**：本仓库 `src/client/lib/contract/types.ts` 的 `SubagentEntry` 目前**只声明** `id / createdAt / mode / label`，
`src/client/data/session-stats.ts` 的 `normalizeSubagents()` 也只透传这四个字段——也就是说 **`activeMs` 今天到不了 render**。
本部件因此用本地类型 `SubagentEntry & { activeMs?: number }` 读取它：字段在就印时长，不在就退化到创建时间；
等共享层把 `activeMs` 补进 `SubagentEntry` 与 `normalizeSubagents`（见结案报告第六段），这张卡不需要改一行代码就会自动变完整。

`null` / `[]` / `—` 的语义：

| 值 | 含义 | 卡面 |
| --- | --- | --- |
| `subagents === null` | 投影缺失（该组合没有 session controller） | **整卡返回 `null`** |
| `subagents === []` | 投影在，但本会话没派过子代理 | **整卡返回 `null`**（「0 个子代理」白占格子） |
| 某行没有读数 | 例如没有任何 `activeMs` | 印 `—` + `tone: 'muted'`，**行不消失** |
| `activeMs === 0` | 子代理还没跑过任何一轮（真实读数） | 印 `0s`，不是 `—` |

## 4. 元素为什么这么摆

- **大数字在标题正下方**（`headAfter.big`）：它是总数，是唯一一个不依赖任何可选字段、投影必然能兑现的数字。
  不用 `value`——有 `headAfter` 的卡上 `value` 会被推进正文，同一个概念印两遍。
- **灰字在数字下面**（`legend`）：`activeMs` 是父会话绕道取得的量，可能整批缺失，所以它当不了大数字；
  它当灰字时仍然是最有信息量的那句（「活跃时长 36m12s」）；一个都没有时退化成「最早 48m 前创建」——
  这句话由 `createdAt` 兜底，**永远为真**，也让卡面不至于空一行灰字。
- **三行明细贴底**（`bodyAnchor: 'bottom'`）：与 缓存命中 / 工具调用 / 上下文压缩 同一姿势——
  头部在顶、三行落在地板上，多出来的 16px 留在灰字与分隔线之间，而不是吊在三行下面。
- **第 1 行「最久」**：取所有 `activeMs` 的最大值。这是"哪个委派花掉的时间最多"的直接答案。
- **第 2 行「持续型」**：写成 `n / 总数` 而不是光一个 `n`——没有分母的计数读不出比例（`2` 与 `2 / 4` 是两句话）。
- **第 3 行「最近」的身份放在左列**：这是被**实测逼出来**的一处偏移（详见代码头部注释与结案报告第四段）。
  `breakdown` 的网格是 `1fr auto`（左标签轨 / 右数值轨），把长 label 放进**数值轨**时，数值轨会按内容撑到
  245px（内容区只有 124px），左标签轨被压成 `0px` —— 三行的标签全部消失、前两行的数值被顶出卡片。
  渲染器对长文本的既定处理是**左标签轨的右缘淡出**（`breakdown.tsx`：nowrap + mask），所以身份放左列：
  再长也只是淡出，永远不会偷走网格，`最久 / 持续型 / 最近` 这组固定词也始终可读。
  工具调用卡的「正在执行 <名字>」「最慢 <名字>」是同一写法、同一理由。
- **第 3 行的数值是那个子代理的年龄**（「4m 前」）：这一行讲的是"最新出现的那一个"，
  年龄是它唯一还没被别处说过的短读数（灰字讲的是**最旧**的、第 1 行讲的是**活跃时长**）。
- **长 label 不追加 `…`**：可见的截断是渲染器的右缘淡出；部件只把字符串截到 48 字（防病态输入进 DOM），
  在已经淡出的行里再塞一个省略号就是第二个截断记号。

## 5. 语气方向（tone 由本部件自己定）

| 元素 | tone | 依据 |
| --- | --- | --- |
| 大数字 / 卡片 | **不染色** | 子代理多不等于坏，这是一个计数 |
| 第 1 行「最久」 | `activeMs > 30 分钟` → `warn` | 见下 |
| 第 1 行缺读数 | `muted` | 没有读数就印 `—`，不伪造 0 |
| 第 2 行「持续型」 | 不染色 | 持续型不是坏东西，它是一个种类 |
| 第 3 行 | 缺读数 `muted`，其余默认 | 身份没有好坏 |

**为什么「最久」的阈值是 30 分钟（`LONGEST_ACTIVE_WARN_MS`）而不是别的**：`activeMs` 是子代理**自己日志里的活跃轮次时长**，
不含等待。半小时的已记账活跃时间意味着这个委派通常已经不是一个"顺手派出去的小活"，而是一个卡住的或过大的任务——
它是一个"去看看"的提示，不是错误。所以用 `warn`（琥珀）**不用** `danger`（红）：长子代理本身不是失败，
一张对正常长活喊红的卡会很快被忽略。

## 6. 配置项

**无。** 第一版不加配置项：这张卡的三个读数都是"当前事实"，没有需要用户选择的视角，
也没有可切换的口径（不为了加而加）。`simToggle` 只是预览的点击切换（见第 9 节），不是用户配置。

## 7. 空态 / 降级行为

| 情形 | 行为 |
| --- | --- |
| `subagents === null`（投影缺失） | `render` 返回 `null`，不占格子 |
| `subagents.length === 0`（没派过） | `render` 返回 `null`——「0 个子代理」没有信息量（每个会话的默认状态都是 0） |
| 一个 `activeMs` 都没有 | 灰字退化为「最早 … 前创建」；第 1 行印 `—` + `muted`；其余两行照常 |
| 没有任何带 `label` 的条目 | 第 3 行整行变成「最近」+ `—`（`muted`），行不消失 |
| `createdAt` 不是有效数字（防御） | 「最早 …」那句整个不渲染（宁可不印也不编），第 3 行印 `—` |
| 卡片自带动作 | **无按钮**，所以没有"必须永远渲染"的义务 |

`render` 是纯函数，唯一读时钟的地方是 `Date.now()`（用于「最早 48m 前创建」与「4m 前」这两个**距离**，
距离只有相对"现在"才存在）；时钟在每次 render 里读一次，不缓存、不写回 `stats`。

## 8. 与既有卡的差异

- 与 **任务（task）**：任务卡答"我接下来干什么"（todo 条目），这张卡答"我派出去多少个子代理、它们干了多久"——
  两个不同的对象（`todos` vs `subagentCatalog`），没有任何字段重叠。
- 与 **工具调用（tool）**：工具卡统计的是**本会话自己**的工具调用折叠（`stats.tools`），子代理调用的工具在子代理自己的日志里，
  不计入父会话；两张卡的"最慢/最久"是两个不同层级的量。
- 与 **轨迹（trajectory）/ 轮次（counts）**：都是父会话自己的节拍，与子代理无关。
- 与 **后台作业（jobs，第三批 §5）**：jobs 有真实 liveness（`status`），子代理**没有**——
  所以那张卡可以印"运行中"，这张卡不能，这也是两张卡最主要的差别。

## 9. 预览

```sh
node scripts/preview/gallery.mjs --only subagent          # 生成页面 + 浅色截图
node scripts/preview/gallery.mjs --only subagent --dark   # 深色主题
```

- 交互页面：`.tmp-gallery/index.html`（真实 `CardBody` / 真实主题 token）。
- 截图（`docs/preview/cards/`）：
  - `subagent@2x2.png` —— 有 `activeMs` 的完整形态（点击预览的 state 1/2）
  - `subagent@2x2-s1.png` —— 无 `activeMs` 的降级形态（state 2/2）
  - `subagent@2x2-dark.png` / `subagent@2x2-s1-dark.png` —— 深色主题
  - `subagent@2x2-en.png` / `subagent@2x2-s1-en.png` —— en 词典（另见 `.tmp-subagent-en.cjs`）
- 几何证据：`node .tmp-subagent-dom.cjs subagent` 打印卡片的网格轨宽与溢出标记
  （健康值：`gridTemplateColumns: "76.5625px 39.4375px"`，卡片 150×150，无 `data-dsx-overflow`）。

自检：

```sh
node scripts/validate-widget-unit.mjs src/widgets/subagent   # 0 failure / 0 warning
npx tsc --noEmit                                             # 0 error
```
