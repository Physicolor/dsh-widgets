# model-config — 会话配置

## 1. 这张卡回答什么问题

**这个 agent 现在跑在哪条模型路线上** —— 哪个模型、哪一档推理力度、哪个 agent preset，以及**下一轮请求会不会换模型**。

多 preset / 多 provider 的环境里，这三件事决定了成本、速度与质量，而它们在 rail 上完全不可见（只能去输入框或对话记录里找）。

## 2. 卡面草图（2×2，150px 内容区）

```
┌──────────────────────────────┐
│ 会话配置                      │ ← 蓝标题 13px（card.model-config.title）
│ medium                       │ ← headAfter.big：推理档 20px
│ deepseek-v4-flash            │ ← legend：模型名（灰字，整行不截断）
│ ──────────────────────────── │ ← breakdown 自带的暗线
│ 提供方            commandcode│ ← breakdown 第 1 行
│ 预设               standard  │ ← breakdown 第 2 行
│ 下次               换模型     │ ← breakdown 第 3 行（primary，仅换路线时出现）
└──────────────────────────────┘
```

第三行是**可变的**：`next.model === lastUsed.model` 时只有两行（**不凑满三行**）。

## 3. 数据来源

只读 `WidgetStats` 里两个**同步投影**字段，不发请求、不等异步源（`manifest` 因此**不写** `source` / `skeleton`）：

| 字段 | 口径 |
| --- | --- |
| `modelSelection.next` | 下一轮请求将使用的路线（权威：下一个请求真的会用它） |
| `modelSelection.lastUsed` | 最近一次请求实际使用的路线 |
| `agentPreset` | 本会话的 agent preset id（字符串，如 `standard`） |

- **头部描述的是 `next`**（`next ?? lastUsed`，覆盖「还没发过请求」的会话）：`next` 是输入框模型选择器当前的取值，也就是**本会话的配置**；`lastUsed` 只是历史。所以大数字 = 它的 `reasoningEffort`，灰字 = 它的 `model`。
- **`modelSelection === null`** → `render` 返回 `null`：这个部署没有组合会话控制器，是「投影不存在」，不是「还没有数据」。
- **`next` 与 `lastUsed` 都不存在** → 也返回 `null`。这条**已经在采集器里判过**（`normalizeModelSelection` 在两个 route 都取不到时自己返回 `null`），卡里的同名判断只是防御性写法。
- **`reasoningEffort === undefined`** → 大数字印 `—`。契约明确写了「这条路线不发布档位」与「档位就是默认值」是两句话，后者我们并不知道，所以**绝不**印 `default`。
- **单行缺读数** → `—` + `tone: 'muted'`，行不消失（`provider` / `agentPreset` 为空串时按缺失处理）。
- 卡面**不读时钟**：这张卡没有时间维度的信息，`render` 是两次投影的纯折叠。

### 3.1 与规格卡面的一处**实测冲突**（重要）

规格的卡面要求第三行的 **value 是 `next.model`**（`deepseek-v4-flash` 那个长字符串，见 BATCH-3-SPECS §1 第 59 行）。按那个版式实现后，实测截图显示**所有行标签都被榨干**：

`breakdown` 的行是**一个网格**（`grid-template-columns: 1fr auto`），value 列的宽度 = **整块里最宽的那个 value**，标签列只能拿剩下的；而渲染器还会把每个标签的**最后 14px 做渐隐**（`mask-image`，见 `charts/breakdown.tsx`）。2×2 的内容宽度是 **126px**，实测（10px 字号，value 是 600 字重）：

| 字符串 | 实测宽度 |
| --- | --- |
| `commandcode` | 74.5px |
| `standard` | 44.6px |
| `deepseek-v4-flash` | **91.8px** |
| 提供方 / 预设 / 下次请求 | 30 / 24 / 40px |

- 规格版式（最长 value = 91.8px）→ 标签列只剩 **24.2px**：`提供方` 渲染成「提供」+ 一个灰影，英文更糟（`Provi` / `Prese` / `Next r`，词被切在中间）。8 倍放大截图确认过。
- 把 model 挪到标签列同样不行：标签要**可读**至少得占 88 + 14 = 102px，而 value 列只要还有 `commandcode`(74.5) 或 `standard`(44.6) 就凑不出来。

所以本卡的落地版式是：**模型名上移到整行宽度的 `legend`（能完整印刷），第三行承载「变更」这件事本身**，`primary` 高亮落在这一格上 —— 用户必须注意到的正是这一格。**共享层若要恢复规格字面版式，只需让 `breakdown` 的 value 单元可以省略号收缩（或给它一个 `maxWidth`/`ellipsize` 开关）**；在那之前，任何把长 id 放进 value 的卡都会付出同样的代价。

## 4. 元素为什么这么摆

- **大数字 = 推理档，不是模型名**：模型 id 是长字符串，当 20px 大字必然截断（`deepseek-v4.1-fla…`）；推理档是短词（`off`/`low`/`medium`/`high`/`xhigh`/`max`），且它才是「这一轮有多贵 / 多慢」的旋钮。模型 id 放在它正下方的灰字位（`legend` 占满整行 126px，按整行打印，不截断）。
- **灰字用 `legend` 而不是 `headAfter.small`**：`headAfter.small` 是与大数字**同一行并排**的灰字，150px 卡里 18 字符的模型 id 会把大字挤掉；`legend` 在 `headAfter` **下一行**（`CardBody` 的 `headEls` 顺序是 `headFlex → headAfter → legend`），符合 BRIEF §2 的「标题 → 大数字 → 灰字」阶梯。规格原文写的是 `headAfter.small / legend`，这里按 BRIEF 取 `legend`。
- **三行明细贴底（`bodyAnchor: 'bottom'`）**：`headAfter` 头默认会把 body 顶到头部下方（`top`），余高全落在明细下面；贴底后余高落在灰字与明细之间，与 `cache` / `tool` / `tokens` / `context` 四张卡姿态一致。
- **明细行数可变（2 或 3）**：第三行是「变更通知」，没有变更就没有这一行。缺读数的**单行**仍然印 `—`，两者的区别见 §7。
- **标签用词被宽度倒逼过**：中文 `提供方 / 预设 / 下次`（30 / 24 / 20px），英文 `Via / Preset / Next`（18 / 28 / 22px）。英文没用 `Provider`(42px) 与 `Next request`(60px)：在 41.5px 的标签列里它们的尾巴会被渐隐吃掉（`Provider` 差 0.5px，`Next request` 差 19px）。这是对规格文案的**取词压缩**，不是漏译。
- **标题用独立键 `card.model-config.title`**：BRIEF §3 要求卡面标题不许复用市场名 `widget.model-config.name`（后者是市场卡片名），虽然当前两者同义。

## 5. 语气方向

`tone` 的语义**由本部件自己定义**（渲染器不猜）：

- **大数字永不染色**：推理档越高**不代表坏** —— 它是在用钱和时间换质量，不是故障。所以没有 `valueTone`。
- **第三行「下次 / 换模型」用 `primary`**：这是**信息性高亮**（路线要变了），不是告警。这是全卡唯一的颜色。
- **`—` 行用 `muted`**：缺读数用最弱的语气，避免被读成 0 或被读成错误。

## 6. 配置项

**无**。第一版不提供任何 `configSchema`（规格明确要求「不要为了加而加」）。

## 7. 空态 / 降级行为

| 情况 | 行为 |
| --- | --- |
| `modelSelection === null`（未组合会话控制器） | `render` → `null`，整卡不出现 |
| `next` / `lastUsed` 都不存在 | `render` → `null`（采集器已先判一次，这里是防御） |
| 有生效路线，但没有 `reasoningEffort` | 大数字 `—`（**不**印 `default`） |
| `provider` / `agentPreset` 缺失或空串 | 对应行 `—` + `muted`，**行保留** |
| `next.model === lastUsed.model` | 只有两行（第三行不出现） |
| 只有 `lastUsed`（或只有 `next`） | 头部用存在的那条；第三行不出现（无从比较） |

### 7.1 预览状态（`example.sim` / `simSteps` / `simToggle`）

三种形态的**结构**不同（2 行 / 3 行 / 大数字 `—`），而没有实时会话时市场预览只会看到 `example.stats` 里的那一种。所以本卡声明了 3 步预览状态（与 `task` / `cc-subscription` / `peak-pricing-board` 同一机制）：

```
SIM_STEPS = [ {state:'switched'}, {state:'steady'}, {state:'noEffort'} ]
```

- `sim` **就是** `SIM_STEPS[0]`（否则第一次点击是静默空操作）；
- 点击卡片按顺序循环这三种形态（`simToggle` 文案：`换路线 / 稳定 / 无档位`）；
- 点击**只影响预览**：`meta.sim` 由预览界面传入，rail 上的卡永远读实时投影，不会因为 sim 而显示假数据。

## 8. 与既有卡的差异

先 grep 了全部 43 个既有部件的 `index.ts`：**没有任何卡读 `modelSelection` / `agentPreset` / `reasoningEffort`**（`grep -rn "modelSelection|agentPreset|reasoningEffort" src/widgets` → 0 命中），所以这张卡与既有卡不重叠。

与最接近的几张的边界：

- `llm`（LLM 耗时）、`tps`、`ttft`：回答「模型跑得**多快**」，是**结果**；本卡回答「跑的是**哪条路线**」，是**配置**。同一个会话换模型，这三张卡的读数可以毫无变化。
- `counts` / `harness-board`（会话概览）：轮次与步骤计数，不含模型身份。
- `cc-whoami` / `cc-subscription`（账户 / 套餐）：Command Code 的**账号与套餐**；本卡只印一行 `provider` 路由名，不重复账户信息。

## 9. 预览

```sh
node scripts/preview/gallery.mjs --only model-config          # 浅色，3 张（每个预览状态一张）
node scripts/preview/gallery.mjs --only model-config --dark   # 深色，3 张
```

- 页面：`.tmp-gallery/index.html`（真浏览器页面，真实 `CardBody` + 真实主题 token）
- 截图：`docs/preview/cards/model-config@2x2.png`（换路线 / 3 行）、`-s1.png`（稳定 / 2 行）、`-s2.png`（无档位 / 大数字 `—`），深色为同名 `-dark` 后缀 3 张。

预览数据来自 `index.ts` 的 `example.stats`：一份「已切到 `deepseek-v4-flash`（`medium`）、上一次请求仍跑 `deepseek-v4.1-flash`（`high`）」的过渡态，配合上面三步状态即可在无会话时看全三种形态。
