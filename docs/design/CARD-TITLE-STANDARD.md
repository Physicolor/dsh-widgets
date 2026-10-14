# 卡片标题标准（CARD-TITLE-STANDARD）

> 2026-10-14 制定 · 适用：dsh-widgets 全部单元（含第三方单元）· 契约实现：`src/client/render/CardBody.tsx` 的 `titleRowEmpty` / `headEmpty`

## 1 标准一句话

**左上角标题（`WidgetRenderOut.title`）是版式配重，不是装饰**：它的职责是"给主体命名"。
当且仅当**主体能自己说清自己、并且自己填满整张卡**时，这张卡才可以不要标题。
其余情况一律保留——去掉标题会让卡片要么变得含混，要么变得空旷。

两条必须**同时**成立才允许去标题（缺一不可）：

| 条件 | 判据 | 反例 |
| --- | --- | --- |
| **C1 自述**（body self-identifies） | 主体的**结构**已经说明它是什么：表盘、月历格（自带月标题与周表头）、图片、`chart: figures` 的逐项标签、泳道图的自带图例 | `value: "0s"`（首 token 延迟 0 秒——"0s"本身不说是哪个指标） |
| **C2 满卡**（body fills the tile） | 主体是**自绘/自适应**内容，能吃掉腾出来的高度（表盘 120px、月历 120px、弹性折线/泳道） | 单行大数字、一排 figure：去掉标题后顶部留出 16px 以上的空白带，卡片显得空 |

> 为什么 C2 是硬条件：标题行是 2×2 卡片的**顶配重**。一张只有一行数字的卡抽掉标题后，
> 视觉重心只剩底部一行（body 默认 `marginTop: auto` 贴底），中间全空——这不是"更简洁"，是"没做完"。

## 2 机制（`title: ''` 的确切语义）

```ts
// 无标题：头部行完全不渲染（不是"渲染一个空标题"）
return { title: '', rich: { type: 'clock', clock: { … } } }
```

`CardBody` 的规则（`src/client/render/CardBody.tsx`）：

1. `titleRowEmpty = title === '' && !headRight && !headRing/headIcon` → **不推入标题行**；
   卡片的其余头部（`legend` / `headAfter` / `meter`）照常保留，只有空的那一行消失。
2. `headEmpty = 头部一个元素都没有` → **整个 head 容器不渲染**（连 0 高度的 flex 节点也不留）。
3. `headEmpty` 会把 body 切到 **top-aligned**（`topAligned` 加入 `headEmpty`），
   即腾出的高度归主体，而不是把主体挤到底部、在顶部留一条死带。

**布局约束（无标题卡必须自己算）**：`2 × cardInnerPad(unit) + box ≤ unit`。
以 150 侧为例：`12 + 120 + 12 = 144 ≤ 150`；因为 pad 与 box 同比例缩放，这条恒等式在任意
侧长/放大档位下都成立。新增无标题卡时用这条式子选尺寸，别靠试。

## 3 类型学：按组件类型选择适合的情况

| 类型 | 判据 | 标题 | 本仓库实例 |
| --- | --- | --- | --- |
| **T1 自绘自述型** | C1 + C2 都成立 | **可省** | `clock`、`calendar`、`quote`（用户开关控制） |
| **T2 度量型** | 主体是一个数/一条曲线/一段环，含义只存在于标题 | **必须保留** | `llm` `tool` `ttft` `tps` `cache` `tokens` `context` `context-water` `sys-*` `cc-window-*` `window-forecast` `session-cost` `github-stars/issues/push` `goal-progress` `heatmap` `heatmap-bars` `quota-manage` `usage-mix` … |
| **T3 身份型** | 标题是"这是谁的"（品牌/账户/仓库） | **保留**（身份即主题） | `cc-*` 家族、`deepseek-balance`、`usage-rings` `usage-bars`（窗口名在体内，但"哪个 provider"只在标题） |
| **T4 复合型** | 一张卡讲两件以上事 | **保留**（标题是复合体的唯一总名） | `sys-disk`（磁盘 + 自检）、`peak-pricing-board`（时段 + 价格） |
| **T5 欠填型** | 主体自述（C1 ✓）但**只有一行/一排**（C2 ✗） | **保留** | `counts`（"11轮 137步"一行）、`harness-board`/`github-board`（一排 figures）、`trajectory-stats`、`guard`、`task`、`jobs`、`sys-power` … |
| **T6 弹性但头部不空** | 主体能满卡（C2 ✓），但头部还有 `legend`/`headAfter`/`meter`，标题行去掉后仍留一行说明 | **暂保留**（要做得先决定那些行去哪） | `trajectory`（lanes + 三泳道图例）、`sys-gpu-line`（折线 + 温度/显存图例 + 8% + 环） |

## 4 全量审计（58 个已实装单元）

### 4.1 已应用（T1）

| 单元 | 标题 | 主体 | 变化 |
| --- | --- | --- | --- |
| `clock` | ~~时钟~~ → 无 | 120px 表盘（12 数字 + 三针 + 时区药丸） | 表盘从 96 → 120px；数字面无标题后时间 32/46px |
| `calendar` | ~~日历~~ → 无 | 120px 月历（月标题 + 周表头 + 网格） | 月份文案（如 `2026年10月`）成为卡片左上角的第一元素，与参考图一致；6 周月行高 11 → 15px |
| `quote` | 用户开关 | 引文文本块 | 机制副作用（正向）：「显示标题」关掉后不再留 16px 空带 |

### 4.2 保留——T2 度量型（38）

`llm` `tool` `ttft` `tps` `cache` `tokens` `context` `context-water` `task` `sys-cpu` `sys-gpu`
`sys-gpu-line` `sys-net` `sys-power` `sys-procs` `sys-services` `sys-rings` `sys-board` `sys-disk`
`cc-usage` `cc-credits` `cc-windows` `cc-whoami` `cc-subscription` `cc-window-5h` `cc-window-weekly`
`cc-window-monthly` `usage-rolling` `usage-weekly` `usage-monthly` `usage-mix` `window-forecast`
`session-cost` `deepseek-balance` `github-stars` `github-issues` `github-push` `github-notify`

**理由（一句话）**：主体是数字/曲线/环，"43%""0s""118%" 本身不说明它是 CPU 还是延迟还是预测——
标题是这些卡片唯一的口径声明。

### 4.3 保留——T3 身份型（6）

`usage-bars` `usage-rings`（环/条上写着"滚动/周/月"，但"哪个 provider"只在标题）、`cc-*` 的账户视角、
`deepseek-balance`、`github-board`（仓库名在图例里，标题是"仓库脉搏"这个主题）。

### 4.4 保留——T5 欠填型（7）

`counts`（`11轮 137步` 一行）、`harness-board`（2×4 一排 figures）、`trajectory-stats`（`29% / 模型`）、
`guard`（一个词 + 盾牌）、`jobs`、`subagent`、`goal-progress`、`sys-power`。

**这批最容易被误判成"可以省"**：主体确实自述（C1 ✓），但去掉标题后卡片顶部会空出一整条——
`harness-board` 2×4 更明显（一排 figure 停在顶部、下面全是空白）。**结论：保留。**

### 4.5 保留——T6 弹性但头部不空（2）

`trajectory`、`sys-gpu-line`：主体是弹性图（能满卡），但头部还有 `legend`/`headAfter`/`headRing`。
要去标题必须先决定这些行去哪（并进图内？还是保留成"无标题但有说明行"）。
**当前实现已经支持**（`title: ''` + `legend` 只去掉空标题行、保留说明行），是否做是产品决定。

### 4.6 保留——T4 复合型（其余）

`peak-pricing` `peak-pricing-board` `heatmap` `heatmap-bars` `github-contrib` `quota-manage` 等：
要么讲两件事，要么数字口径只在标题（`heatmap` 的"Token"单位），要么主体是固定尺寸的网格（去掉标题只会在顶部留白）。

## 5 验收（改标题时必做）

1. `node scripts/gen-registry.mjs --check`（`card.<id>.title` 若不再引用，应从 manifest 删掉，避免死键）。
2. `node scripts/validate-widget-unit.mjs src/widgets/<id>`（locale 覆盖仍然完整）。
3. `node scripts/snapshot-render.mjs --write && --check`（**只应出现该卡的 title 字段变化**；若别的卡也变了，
   说明动到了共享行为）。
4. `node scripts/preview/gallery.mjs`（看 `docs/preview/cards/<id>@2x2*.png` 与 `_sheet.png`；确认无空带、无裁切）。
5. `node scripts/gates.mjs`（11/11）。
6. 真机：`node scripts/verify-clock-calendar-live.cjs`（无标题卡的探针必须**按主体识别卡片**，
   不能再用 `.dsx-stats-card-title` 找卡——标题元素此时根本不存在，这本身就是要断言的点）。

## 6 给单元作者的规则（摘要）

- 新卡默认**要有标题**；只有同时满足 C1 + C2 才写 `title: ''`。
- 写 `title: ''` 时，主体尺寸按 `2 × pad + box ≤ unit` 选，并把这条式子写在模块注释里。
- 不要为了"好看"去掉标题再手动加一行灰色小字当标题——那是同一个东西的更差版本（10px 且不可本地化到标题位）。
- 第三方单元同样适用；`title` 是 `WidgetRenderOut` 的必填字段，`''` 就是合法的"无标题"表达。
