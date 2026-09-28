# goal-progress — 目标进度

## 1. 这张卡回答什么问题

**这个会话的自主目标跑到第几轮了、现在处于什么阶段（有没有被卡住、卡在哪）。**
当会话挂了 goal 时会自动一轮轮跑下去，而轮次上限、当前阶段、被什么卡住这三件事在 rail 上完全不可见——只能翻对话猜。这张卡把它们放在一个格子里。

## 2. 卡面草图

```
┌──────────────────────────────┐  150 × 150（内容区 124 × 124，pad 12）
│ 目标进度                     │  blue 13px   card.goal-progress.title
│ 12 / 40                      │  20px        headAfter.big（已用轮次 / 上限）
│ 受阻：等待你确认是否…         │  grey 10px   legend（阶段 · 最近变更 / 或阻塞原因）
│ ──────────────────────────── │  hairline（breakdown 自带）
│ 目标        把 dsh-widgets…  │  10px 左标签 / 右值
│ 阶段                    受阻 │  值按 phase 染色：blocked=红 complete=绿
│ 封顶                   40 轮 │  maxGoalRounds<=0 时值印 — 且 muted
└──────────────────────────────┘
```

## 3. 数据来源

只读 `WidgetStats.goal`（`GoalInfo`，采集器已归一化，同步投影，**无异步源**，所以 manifest 不写 `source`/`skeleton`）：

| 字段 | 用途 | 口径 |
| --- | --- | --- |
| `objective` | 明细第 1 行「目标」的值 | 截断后展示；空串 → `—` muted |
| `phase` | 大数字的灰字、明细第 2 行、行语气 | `active` / `paused` / `blocked` / `complete` 四值 |
| `roundsStarted` | 大数字左半 | 已开始的轮次（契约：已准入的用户轮） |
| `maxGoalRounds` | 大数字右半、明细第 3 行 | `<= 0` 视为「无上限」，大数字只印 `roundsStarted`，第 3 行印 `—` muted |
| `updatedAt` | legend 的「多久前」 | epoch ms；`<= 0`（投影没带）时 legend 只印阶段词，不编造距离 |
| `blockedReason.message` | `blocked` 时 legend 换成的短截断 | 缺失时 legend 退回「阶段 · 多久前」（防御性：契约说 blocked 时它一定有） |
| `createdAt` | **不读** | 本卡只关心「最近一次动」；创建时间对进度没有解释力 |

`null` / `[]` / `—` 各是什么：

- `stats.goal === null`（本会话没有目标）→ **整卡返回 `null`**，rail 少一格。这是**常态**，不是错误，所以不用空态卡占位（见 §7）。
- `—` 只用于「有这一行、但这个读数拿不到」：目标为空串、`maxGoalRounds <= 0` 的封顶行。两处都配 `tone: 'muted'`（占位不等于坏消息，绝不染红）。
- 本卡没有 `[]` 这种形态（一个会话只有一个 goal，没有列表）。

**与 SPECS §2 的一处偏离（已按规格逐条核对，只有这一处）**：SPECS 写「相对时间用 `fmtDuration`」，实现用的是共享的 **`fmtAgo`**。理由是 `fmtDuration` 只服务「分钟以内的时长」，一个两天前动过的 goal 会被它印成 `2880m0s 前`——而 goal 天生比一次工具调用活得久，正是它不适用的场景。`fmtAgo` 是仓库自己的「多久以前」（12s / 5m / 3h / 6d），SPECS 同句也允许「自己写一个小 `ago()`，但必须本地化」，`前` / `ago` 由 `card.goal-progress.legend` 承担。签名已核对：`fmtAgo(iso | null, now?)`。

## 4. 元素为什么这么摆

- **大数字在标题正下方（`headAfter.big`，不是 `value`）**：BRIEF §2 的头部阶梯（蓝标题 → 20px 大数字 → 灰字），也是 `任务` / `工具调用` / `缓存命中` 的同一套节奏。`value` 留空，否则同一对数字会被渲染器再推进正文印第二遍。
- **大数字是「两个数一起」而不是一个数**：`12 / 40`。只印 12 不叫进度（没有分母就没有「还能跑多久」），把分母塞进灰字又会让灰字说两件事。所以进度这一对数占掉大数字位；`maxGoalRounds <= 0` 时它才退化成单个数（此时「/ 0」是假话）。
- **灰字是「阶段 · 多久前」**：这一行回答「它还活着吗」。`blocked` 时**让位给阻塞原因**（SPECS §2 的唯一一次让位）：被卡住时「为什么卡住」比「多久前更新」重要，而这句话在卡上别处没有位置。这条取舍写在 `index.ts` 的文件头注释里。
- **三行明细贴底（`bodyAnchor: 'bottom'`）**：与既有一切带 `headAfter` 的卡同一姿态——富余高度落在灰字与分隔线之间，而不是压在行下面。
- **三行分别是 目标 / 阶段 / 封顶**：目标在最上（它是这张卡的主语），阶段第二（大数字灰字给的是「阶段 + 时间」，这里给的是阶段本身，配合行色读），封顶第三（`40 轮` 与 `/ 40` 确实是同一个数，见第 6 段）。
- **没有 headRing**：环是「占比」的语言（`缓存命中` 用它）。`12 / 40` 不是完成率——目标可能正好需要这 40 轮，提前结束不是成绩，染绿更像在暗示「快跑完了」。所以大数字不带环，`任务` 的计数也是同样理由。
- **不占 `cycle`、没有 `corner`、没有 `configSchema`**：一个会话只有一个 goal，没有可切换的池视图；首版不加配置（SPECS §2）。

**高度预算（按已发布几何 `card-geometry.ts` + `CardBody.tsx`，unit 150 即 scale 1）**：
`pad 12 × 2 (24) + 头部 (标题 16 + HEAD_GAP 4 + 大数字 25 + CAPTION_GAP 2 + 灰字 12 = 59) + 明细 (分隔线 1 + paddingTop 6 + 3 × 12 + 2 × 4 = 51) = 134 / 150`，余 16px。
**三行是硬上限**：第四行 +16px 正好爆格（工具调用卡是同一结论）。浏览器实测：卡片 `clientHeight 148`、`scrollHeight 148`、无 `data-dsx-overflow` 标记、控制台无 "card content does not fit its tile" 警告。

## 5. 语气方向

`tone` 的语义**由本部件决定**，写死在 `PHASE_TONE` 里（渲染器从不猜）：

| phase | 阶段行 tone | 依据 |
| --- | --- | --- |
| `active` | 不染（默认 ink） | 正在跑不是结论，更不是坏消息；染绿会让「进行中」看起来像「已完成」 |
| `paused` | 不染 | 用户自己停的，不是异常 |
| `blocked` | `danger` | 跑不动了且在等外部条件，是唯一需要用户动手的状态 |
| `complete` | `success` | 完成是唯一的正面结论 |

**进度本身（大数字、目标行、封顶行）一律不染色**：轮次高只说明预算大、用得多，不等于坏（与「上下文水位」那类「越高越满」的方向无关——这里根本没有阈值）。`—` 占位统一 `muted`。

**已知限制**：`legend` 由共享渲染器的 `captionEl` 绘制，颜色硬编码为 `--dsw-alias-label-tertiary`，契约里没有给 legend 染色的字段，所以 `blocked` 的红色只出现在阶段行、不上灰字。没有为此新增渲染原语（BRIEF §3）。

## 6. 配置项

**无**（SPECS §2：首版不加配置，不为加而加）。所以本卡没有 `configSchema`，也没有实例级文案键。

## 7. 空态 / 降级行为

| 情况 | 行为 |
| --- | --- |
| `stats.goal` 为 `null` / `undefined`（没有目标，含没有实时会话的市场预览之外的真实 rail） | `render` **返回 `null`**，整卡不出现。没有按钮要保命，所以不需要空态卡 |
| `objective` 是空串或全空白 | 第 1 行值印 `—` + `tone: 'muted'`（不印空单元格，那会读成排版 bug） |
| `maxGoalRounds <= 0` | 大数字只印 `roundsStarted`；第 3 行值 `—` muted，标签仍是「封顶」 |
| `roundsStarted` / `maxGoalRounds` 非有限数（脏数据） | 一律归 0，绝不印 `NaN` |
| `updatedAt <= 0` | legend 只印阶段词，**不编造**「多久前」 |
| `phase === 'blocked'` 但没有 `blockedReason` | legend 退回「阶段 · 多久前」（不印空原因） |
| `phase` 是契约外的值 | 理论不可达（`normalizeGoal` 会把非法 phase 整条丢掉，卡此时返回 `null`）；`PHASE_KEY[phase]` 取不到时 `t()` 回退成键名本身，仍可读 |

**`render(null)` 分支怎么测的**（SPECS §2 验收第 5 条要求）：预览永远带着 `example.stats.goal`，走不到这一支，所以用离线脚本跑真实实现验证过——用 `scripts/tsconfig.preview.json` 编译预览闭包到临时目录后 `require` 本单元，直接调 `render({ goal: null })` / `render({})` / `render({ goal: undefined })`，三次都是 `null`；同一次运行还断言了四个 phase 的行语气（blocked→danger / complete→success / active、paused→不染）、`maxGoalRounds<=0`、空目标、`updatedAt=0`、en 字典与截断边界（11 项全 PASS，临时脚本已删，命令与输出摘要见结案报告第 4 段）。

## 8. 与既有卡的差异（为什么它不重复）

- `goal` 投影此前**没有任何消费者**：建本目录之前 `src/widgets/**` 下 grep `goal` / `Goal` 零命中，所以不存在「已有一张卡」的问题。
- 与 `轮次·步数` / `会话概览` 的 `turns` / `steps` **不是一回事**：那两个数是一段会话的对话量，会随聊天一起涨；`roundsStarted` 是 **goal 自己的轮次预算消耗**，`maxGoalRounds` 是那张预算表，两个数只在有 goal 时有意义。
- 与 `任务` 不重复：`todos` 是待办清单（条目、状态），goal 是驱动自行续跑的持久目标（阶段、轮次上限、阻塞原因）——一个会话可以没有 goal 却有 todos，反过来也成立。
- 与 `上下文压缩` 的「次数/回收」不重复：那是上下文折叠的账，与目标生命周期无关。

## 9. 预览

```sh
node scripts/validate-widget-unit.mjs src/widgets/goal-progress   # 0 failure / 0 warning
npx tsc --noEmit                                                  # 0 error
node scripts/preview/gallery.mjs --only goal-progress             # 明色
node scripts/preview/gallery.mjs --only goal-progress --dark      # 深色
```

产物（真浏览器页面 `.tmp-gallery/index.html` + 真 `CardBody`）：

- `docs/preview/cards/goal-progress@2x2.png`
- `docs/preview/cards/goal-progress@2x2-dark.png`

`example.stats.goal` 给的是 **`blocked`** 样例（SPECS §2 要求的最复杂形态）：阶段行红、灰字换成阻塞原因、目标足够长以检验截断。卡的 `render` 没有读 `meta.sim`，也没有 `simSteps`，所以画廊里就是这一张（其余三个 phase 的读数由 §7 的离线脚本断言，不靠肉眼）。
