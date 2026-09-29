# guard — 权限档位

## §0 审计（动手之前逐条回答，WORKER-BRIEF-V3 §0）

**1. 这个信息是不是已经在别处更方便地展示了？**

是——**输入框的权限选择器就是它的更方便版本**：可点、可改、带三个 shield 图标、带整句说明，点开还能看到全部可选档位。这一条不回避。它仍然值得存在，是因为选择器有两个**时刻**覆盖不到：

- **它只在 composer 进可视区时才在屏幕上。** 本卡存在的场景恰恰是"人不看 composer"的场景：多会话长跑、盯着 rail 看这一批会话各自花掉多少、还剩多少。此时"它被允许做什么"是判断要不要打断它的前提，而要看到选择器得先滚动回输入框。
- **选择器是输入，本卡是回执。** 选择器回答"能改成什么"，本卡回答"现在是什么"——和 rail 上其它"当前状态"卡（上下文水位、工具调用）同类。车主的裁决是"可以保留"。

所以本卡的职责在修订轮里被**收窄**：车主要求"其它文字全部清空"，判据就是第 1 问——**凡是在选择器里更方便读到的（description 整句、档位个数、全部选项），一律不进卡面**。上一轮删掉 legend 与三行 breakdown，本轮的卡面只有"标题 + 盾牌 + 档位名"三件东西，仍然按这条判据执行。

**2. 有没有功能高度重合的既有组件？** 逐个对比过（`src/widgets/` 全部 45 张卡的 `manifest.json` + `index.ts`）：

| 组件 | 单位 | 范围 | 时态 | 口径 | 与本卡的差异 |
| --- | --- | --- | --- | --- | --- |
| `context` 上下文水位 | % | 一个上下文窗口 | 当前 | 占用量 | 本卡不是百分比、不可加、不随用量变化 |
| `tokens` / `session-cost` / `usage-mix` | token / 钱 | 会话累计 | 累计 | 消耗 | 本卡不消耗任何资源，改档位不产生成本 |
| `cache` | % | 缓存命中 | 最近窗口 | 命中率 | 同上 |
| `tool` | 次数 / 毫秒 | 会话累计 | 累计 | 调用量 | 本卡是"许可"，不是"做了多少" |
| `sys-disk` / `sys-power` / `sys-procs` / `sys-services` | 字节 / % / 进程 | **机器** | 当前 | 机器资源 | 本卡的范围是**本会话的许可**，不是机器 |
| `sandboxMode` 独立卡（本批被否决） | — | — | — | — | `sandboxMode` 没有 wire，且已被 `permissions` 折进去；本卡印的就是折叠结果，是它的合法替代 |
| 官方 composer 权限选择器 | 枚举 | 本会话 | 当前 | 权限折叠值 | 不是 rail 卡片（见第 1 问） |

`grep -r "permissions" src/widgets` 在本卡之前与之后都只有本卡一个消费点：**rail 上 0 重合**。

**3. 用户不读文档怎么分清两张？** 名字是「权限档位」（不是「用量」类词）；卡面上唯一的正文文本就是档位名本身（`完全权限` / `Full access`），没有百分比也没有计数可以误读；右上角是官方权限选择器那枚盾牌（产品里同一个图标只出现在权限行）。所以本卡靠"一个权限词 + 一枚官方盾牌"自我说明，不需要一个灰字去解释。

**4. 这个大数字是什么单位、什么范围、什么时间点？** 单位 = **权限档位的显示名**（枚举词，不是数值；所以没有量纲、没有小数、不可加）；范围 = 本会话 preset / 沙箱模式 / 审批策略三个旋钮**折叠成的当前值**（`PermissionInfo.currentValue`）；时间点 = **现在**（会话内同步投影，读时钟才需要说明，这里连时钟都不读）。不需要任何解释就看得懂——`完全权限` 就是官方选择器里的那个词。

**5. 它应该一直在，还是可以消失？** **可以消失**：`permissions` 为 `null`/`undefined`（部署没有组合权限服务）或 `currentValue === ''` → `render` 返回 `null`。这是任务书 V3 §1.2 明确指定的（"这张卡是新增可选项，未装即不显示"），本卡也没有必须常驻的按钮，所以不该用安静空态占位。

**6. 颜色有没有被赋予一个用户能说出的含义？** 有，而且是**车主本人逐档指定的**（2026-09-29 原话：「完全权限是红色呼吸警示效果，工作区修改蓝色，仅查看绿色」）。三档都是**等级**，不是装饰：

| 档位 | 颜色 | 一句话含义 |
| --- | --- | --- |
| 完全权限 `danger-full-access` | 红 + **呼吸** | 能对整机动手且不询问 —— 唯一需要被"看见"的档 |
| 工作区内修改 `workspace-write` | 品牌蓝 | 正常干活档：动得了工作区，越界要问 |
| 仅可查看 `read-only` | 绿 | 安全档：什么都改不了 |

**表里没有的键 / 派生值 `custom` / 宿主改名的档位一律不染色**（保持默认前景色），因为"未知的族"没有任何可以被说出的等级。详见 §5。

---

## 1. 这张卡回答什么问题

**这个会话现在被允许做什么？** —— 一枚官方盾牌 + 一个大字档位名：`完全权限`。

## 2. 卡面草图（2×2，150×150，内容区宽 124，内边距 13）

```
┌──────────────────────────────┐
│ 权限档位              ◯盾牌  │  ← 标题（蓝 13px，左上）+ headIcon（30px，右上，与标题顶边对齐）
│                              │
│                              │  ← 空：车主要求"其它文字全部清空"
│                              │
│ 完全权限                     │  ← value = 当前档位名（20px / 600，左下，贴底）
└──────────────────────────────┘
```

`render` 输出：`title` / `bodyAnchor:'bottom'` / `value`（20px 档位名；**放不下时**退回 `sub`）/ `valueTone` / `valuePulse`（仅完全权限）/ `headIcon:{name, tone}`。**没有** `legend`、`headAfter`、`chart`、`breakdown`、`configSchema`。

四个状态（`example.simSteps`，也是画廊里的四张截图）：

| 状态 | `currentValue` | 盾牌（实测 `color`） | 名字（实测 `fontSize`/`color`） | 呼吸 |
| --- | --- | --- | --- | --- |
| 1 | `danger-full-access` | 感叹号盾 `rgb(236,19,19)` | 20px/600 `rgb(236,19,19)` | **是**（`dsx-value-breathe`） |
| 2 | `read-only` | 对勾盾 `rgb(34,197,94)` | 20px/600 `rgb(34,197,94)` | 否 |
| 3 | `workspace-write` | 清单+笔盾 `rgb(65,118,230)` | 20px/600 `rgb(65,118,230)`｜**英文**：10px `sub` `rgb(173,178,184)`（见 §4） | 否 |
| 4 | `sandbox-off`（表里没有的键） | **没有盾牌**（官方规则，见 §3） | 10px `sub` `rgb(173,178,184)`（未实测宽度 ⇒ 不上大字） | 否 |

深色主题实测：红 `rgb(242,90,90)`、蓝 `rgb(103,158,254)`、绿 `rgb(34,197,94)`（大数字与盾牌同色）。

## 3. 数据来源

只读 `WidgetStats.permissions`（`PermissionInfo`，官方 `permissions` 会话投影，**同步读** → 不写 `manifest.source`，也就没有骨架）：

| 字段 | 口径 |
| --- | --- |
| `currentValue` | 当前生效的 preset 表键（如 `danger-full-access`）或派生值 `custom` |
| `options[].name` | 官方选择器里那一行的显示名。**本部署的投影里它就是 preset 键**，所以本卡用 `presetLabel()` 换成产品自己的词（见下） |
| `options[].value` | 用来把显示名换成官方档位词、并选盾牌与颜色 |

**投影已经把 preset / 沙箱模式 / 审批策略三个旋钮折成一个值**，本卡直接印这个折叠结果：它**不**从 preset 键反推沙箱模式或审批策略 —— 折叠值才是权威，第二套推导就是第二个答案，可能与运行时真正执行的那个不一致。

**盾牌映射（`PRESET_ICONS`）只有三条，没有兜底**，因为官方选择器本身就是这么做的（`@deepseek-ai/dsh-client-ui-conversation` 的 `permissionGlyphs`，其自带注释：*"Glyph for a permission option value; host-configured names outside the design set get none"*）：`read-only` → 对勾盾、`workspace-write` → 清单盾、`danger-full-access` → 感叹号盾。出厂表是 `workspace-write` + `danger-full-access`，派生的 `custom` 不在表里 → **不画盾牌**。给一个改名过的档位硬套一枚盾牌，等于用图标宣称一个错误的族——**错误身份比没有身份更糟**（这也是"官方图标，不自己画"的同一原则）。

**显示名（`PRESET_LABEL_KEYS` + `titleCasePreset`，沿用上一版）**：产品自带的三个键印官方词（`完全权限` / `Full access` …，字符串逐个对照官方包 `dsh-client-ui-permission-presets/lib/client.js` 抄的）；表里给的 `name` 不是键也不是官方英文默认名时，按官方同一条规则做 kebab → Title Case（`my-custom-preset` → `My Custom Preset`），非 kebab 的人写名字原样保留。

**本轮的一处 mock 修正（对预览很关键）**：`example.stats.permissions.options[].name` 上一版写的是**中文字面量**（`完全权限`…），于是 `presetLabel` 的条件 `name === value || name === 官方英文默认名` 两条都不成立，名字直接走 `titleCasePreset('完全权限')` 原样返回 —— **英文语言下的预览因此永远只显示中文**，英文那条回退分支根本测不到（本轮实测发现，见 §4）。现在 mock 的 `name` 就是**键**（= 本部署投影的真实形状），`presetLabel` 命中 `name === value` → 走 `t()` → 预览随语言变：中文 `完全权限`、英文 `Full access`。

三种「没有」不是同一句话：

| 输入 | 行为 |
| --- | --- |
| `permissions` 为 `null` / `undefined`（未组合权限服务） | `render` 返回 **`null`**（整卡不出现） |
| `currentValue === ''` | 同上返回 `null`：没有可印的事实 |
| `options` 为空数组 | **照常渲染**：名字走键的回退路径，盾牌按上表（`custom` 与未知键无盾牌） |
| `currentValue` 不在 `options` 里 | 名字印键的 Title Case（`sandbox-off` → `Sandbox Off`），**不是** `—`：原样值仍是真话；盾牌按映射表（多数情况没有） |

## 4. 元素为什么这么摆（含本轮实测数字）

本轮四张截图（浅色/深色各四张）与两份 DOM 探针记录（`.tmp-guard-probe.json`）都是证据；下面每个数字都是本轮**实测**，不是估的。

- **标题（蓝 13px，左上）**：与 45 张卡同一个头部构件，车主要求保留在最上。
- **盾牌（右上，**30px**，与标题顶边对齐）**：`headIcon`。共享层本轮把它从 24px 居中改成 30px + 顶对齐，本卡直接受益——实测盾牌 `top = 59`，与标题 `top = 59` 同一条线，右侧与文字列右缘对齐（`x 131..161`）。这枚图形与 composer 权限选择器里那一枚是**同一份 path**（`render/icons.tsx` 按官方 path 复制，本卡不画图标）。
- **档位名（20px / **600**，左下，贴底）**：`bodyAnchor:'bottom'` + `value`。实测：`left = 37`（卡片 `x = 24` + 13px 内边距）、`top = 158`、`height = 25`，卡片底边 `196` ⇒ 距底 13px，正好落在左下角；`font-weight: 600`、`font-size: 20px` 由 `.dsx-stats-card-value` 提供（与其它卡的大数字**同一根梯子**）。
  - **上一版为什么用 `sub` 而不是 `value`**：`CardBody` 当时写的是 `out.value != null && out.headRight === undefined && !accessoryHead`，而 `accessoryHead = headRing || headIcon` —— 带上盾牌的那一刻 20px 的 `value` 直接不画。共享层本轮已把它收紧成 `headRing === undefined`（`headIcon` 分支本来就不渲染 `value`，抑制它没有意义）。实测：本版 `value` 在带盾牌时正常渲染，四张截图里名字都在。
- **为什么英文 `Workspace Write` 仍然退回 10px `sub`（本卡唯一的条件排版，有依据）**：
  - 实测内容列宽 **124px**（`value`/`sub` 的 `clientWidth`）；`.dsx-stats-card-value` 是 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`，所以放不下就是 `…`，而「绝不允许 `…` 截断」是硬要求。
  - 实测（20px / 600，真实字体栈）：`完全权限` 80、`工作区内修改` **120**、`仅可查看` 80、`Full access` 91.7、`Read Only` 91.7、**`Workspace Write` 149.8**、`My Custom Preset` 158.5、`Workspace Write X` 169.3。
  - `render` 是纯函数、不能量字串，所以判据写成**有名字的表 + 一次比较**：`LABEL_PX_AT_FIGURE`（每个值都标了实测来源与日期）+ `LABEL_COLUMN_PX = 124`，`measured ≤ 124` 才上 20px；**表里没有的标签一律不上大字**（我们没量过 = 不能赌它放得下）。
  - 于是：中文三档全在 20px（最宽的 `工作区内修改` 120/124，实测 `Range` 宽度 120、无溢出）；英文 `Full access` / `Read Only` 在 20px；**`Workspace Write` 149.8 > 124 → 退回 `sub`（10px，实测文本宽 68.9，不截断）**；宿主自定义名（本轮 mock 的 `sandbox-off` → `Sandbox Off`）同样退回 `sub`。
  - **代价与补偿**：英文工作区档的名字因此是 10px 灰字，但它那枚盾牌仍是**品牌蓝**（盾牌与名字同色是本卡的原则，回退时颜色留在盾牌上），所以"蓝色 = 工作区档"在英文下依然成立。
  - 该判定是**尺寸无关**的：卡片放大时列宽与字号按同一 `scale` 缩放（`valuePx = round(20 * scale)`、列宽 `124 * scale`），比值不变。
- **为什么删掉 legend 与三行 breakdown**：车主原话"其它文字全部清空"。删掉的三个读数各自都有更方便的出处（档位个数与全部选项在选择器里；description 在选择器里）。上一版还为此写了一套 10px 文本截断估算器（`textWidthPx`/`clipSentence`/`clipBudgetPx`）——那套代码随行一起删除，本卡现在的排版计算只有 §4 那一张实测表。
- **不用 `headRing`**：环是"占比"的语言，本卡没有分数可画；在环里画盾牌等于凭空发明一个比例，契约注释明确否掉了这种用法。
- **不用 `headAfter.big`**：带 `headIcon` 的头不渲染 `headAfter`（`CardBody` 的 `!accessoryHead`），而且它的位置在标题下方一行、不是左下角——与本轮要求的"名字在左下角"不符。

## 5. 语气方向（tone 语义由本部件自己定）

**方向：权限越大越需要被看见** —— 颜色由车主逐档指定（§0 第 6 问的表）。

- 判据是**精确匹配** `currentValue` 的常量表 `PRESET_TONES`（`read-only` → `success`，`workspace-write` → `business`，`danger-full-access` → `danger` + `pulse`）。
  - 上一版用的是子串启发式（含 `danger`/`full`/`yolo`/`bypass` 即红）。本轮**删掉**它，因为车主的规则是「其它 / 表里没有的键 / custom → 不染色」：一个叫 `full-auto-review` 的键不该自己宣称一个没人给过它的等级。代价写在下面第 1 条盲区里。
  - `valueTone` 用**值**的词汇（`business`），`headIcon.tone` 用**图表**的词汇（`primary`）；两者指向同一个 token（`--dsw-alias-state-business-primary`），所以表里两列都写出来了，不做类型强转。
- **呼吸只给完全权限**（`valuePulse: true`）——车主原话"红色呼吸警示效果"。它现在只负责呼吸、不再负责颜色：共享层本轮把 `.dsx-value-pulse` 里硬编码的 `color: error-red` 删了，颜色完全由 `valueTone` 决定（否则红色会悄悄盖掉蓝/绿）。实测（探针注入共享层原样的 `primitives.module.css`）：完全权限那张的 `animation-name = dsx-value-breathe`、`animation-duration = 1.6s`，两次采样 `opacity` 0.94 → 0.58（真的在呼吸），`prefers-reduced-motion: reduce` 下 `animation-name = none`；另两档 `animation-name = none` 且带的是纯 `dsx-stats-card-value` 类。
- **盾牌与名字同色**：颜色骑在两者上，回退到 `sub` 时（英文 `Workspace Write`）颜色也不会丢。
- **不染色的一族**：表里没有的键、派生值 `custom`（它折进去的三个旋钮被官方刻意隐藏）、宿主改名的档位 —— 保持默认前景色（盾牌也按官方规则大概率不存在）。
- **这是启发式，不是权威**（三条已知盲区，都不打算在卡里补）：
  1. 部署把危险档位改名成别的键（例如 `open-bar`）→ 本卡按车主的规则**不染色**（上一版会按子串猜红，本轮为了"表里没有的键不染色"放弃了这层猜测）；同时它也会**没有盾牌**——所以"没盾牌"同时意味着两件事：名字不是产品自带的三个之一，且颜色不表态。这是官方选择器的行为，本卡选择与它一致，而不是自己补一枚。
  2. 派生值 `custom` 只给一个键，折进去的三个旋钮被官方隐藏——一个"自定义的危险组合"在本卡里不会变红。
  3. 英文 `Workspace Write` 的名字掉到 10px（§4），所以"英文下三档名字一样大"这个直觉在本卡上**不成立**；要修需要共享层给 `sub` 一个 tone/字号通道（见 §7 遗留）。
- 本卡**不**提供权限切换（不占用点击、不加 `corner` 按钮）：改权限是官方权限选择器的事，一个卡片上的按钮不是安全的写路径。

## 6. 配置项

**无。** 不提供 `configSchema`（不为加而加）。

## 7. 空态 / 降级行为

- `permissions` 为 `null`/`undefined`，或 `currentValue === ''` → `render` 返回 `null`（整卡不出现；本卡没有必须常驻的按钮，所以没有例外，见 §0 第 5 问）。
- `currentValue` 不在 `options` 里 → 名字印 Title Case 的键，不印 `—`（见 §3 表）。
- `currentValue` 不在 `PRESET_ICONS` 里 → 不画盾牌（其余照常）。
- 名字在 `LABEL_PX_AT_FIGURE` 里且 ≤ 124px → 20px `value`；否则 → 10px `sub`（§4）。两侧都实测无溢出、无 `…`（`Range` 文本宽 ≤ `clientWidth`）。
- 本卡自带一个**只作用于预览**的状态机：`example.simSteps` 依次给 `currentValue` 四个值（完全权限 → 只读 → 工作区内修改 → 表里没有的键），因为这几条分支在实时会话里没法按需复现。`sim` 只覆盖 `currentValue`，不覆盖 `options`。rail 永远不传 `sim`。
- **遗留（需要主 Agent 在共享层决定）——本轮唯一一条**：
  1. **英文 `Workspace Write` 想要既大又染色，只能靠共享层**：给 `sub` 加一个 tone 通道（如 `subTone`），或者给 `value` 加一个"放不下就自动缩一档"的字号档（例如 `valueSize: 'auto'`）。本卡交付的是**不依赖它**的版本（`sub` 回退，实测不截断）。
  2. 顺带报一个**共享层的构建状态**（不是本卡的改动）：`lib/client.js`（已提交的构建产物）里 `.dsx-stats-card-value.dsx-value-pulse` **仍然带着旧的硬编码 `color: var(--dsw-alias-state-error-primary)`** —— `src/client/styles/primitives.module.css` 已经改好，但那份产物在上一次提交里没有重建。本卡不受影响（唯一呼吸的状态本来就是红的），但**值/盾牌的蓝绿两色只有在 rail 里必须由 `src` 重新构建的 CSS 才生效**；离线画廊页也没有内联 `primitives.module.css`，所以画廊页里看不到呼吸（截图也拍不出动画），本卡的呼吸证据用 DOM 探针给出（§5）。

## 8. 与既有卡的差异（去重）

- `grep -r "permissions" src/widgets`：本卡是**唯一**消费点；45 张既有卡没有任何一张读权限。
- 与 `context` / `tokens` / `session-cost` / `cache` 这类"用量"卡不同：本卡的数字**不是**任何东西的累计，改权限不消耗任何资源，所以没有环、没有占比、没有 `cycle`、没有图表。
- 与 `sys-*` 家族不同：那些卡的范围是**机器**，本卡的范围是**本会话的许可**。
- 本批「不做」清单里否决了「沙箱模式独立卡」：`sandboxMode` 没有 wire，且它已被 `permissions` 折进去——本卡印的正是折叠结果。
- 与官方 composer 权限选择器的差异见 §0 第 1 问（输入 vs 回执；可视区 vs rail）。

## 9. 预览与实测

```sh
node scripts/validate-widget-unit.mjs src/widgets/guard      # 0 failure
npx tsc --noEmit                                             # 0 error
node scripts/preview/gallery.mjs --only guard                # 浅色
node scripts/preview/gallery.mjs --only guard --dark         # 深色
node .tmp-guard-probe.mjs                                    # DOM 探针（两种语言 × 两种主题），写 .tmp-guard-probe.json
```

截图（每个 sim 状态一张，`-s1..-s3` 为第 2–4 步）：

- `docs/preview/cards/guard@2x2.png` —— 完全权限：**红色**感叹号盾 + **20px 红色呼吸**的 `完全权限`
- `docs/preview/cards/guard@2x2-s1.png` —— 仅可查看：**绿色**对勾盾 + 20px 绿色名字
- `docs/preview/cards/guard@2x2-s2.png` —— 工作区内修改：**蓝色**清单盾 + 20px 蓝色名字（120/124px，不截断）
- `docs/preview/cards/guard@2x2-s3.png` —— 表里没有的键：**没有盾牌**、不染色，名字 `Sandbox Off`（10px `sub`）
- `docs/preview/cards/guard@2x2*-dark.png` —— 同四张的深色版
- `.tmp-guard-shots/{zh,en,zh-dark,en-dark}-s0..3.png` —— 探针额外拍的**两种语言**版本（画廊本身只有中文页：`<html lang="zh">`）。`en-s2.png` 就是英文 `Workspace Write` 退回 `sub`、盾牌保持蓝色的那张。

**探针实测（`.tmp-guard-probe.json`，本轮）**：

| 语言/主题 | 状态 | 名字实测 | 盾牌实测 | 卡片 |
| --- | --- | --- | --- | --- |
| zh | 完全权限 | `20px/600 rgb(236,19,19)` 文本宽 80，`anim=dsx-value-breathe`，opacity 0.94→0.64 | `rgb(236,19,19)` 30×30 @top 59 | 150 高，无溢出 |
| zh | 仅可查看 | `20px/600 rgb(34,197,94)` 文本宽 80 | `rgb(34,197,94)` | 同上 |
| zh | 工作区内修改 | `20px/600 rgb(65,118,230)` 文本宽 **120 ≤ 124** | `rgb(65,118,230)` | 同上 |
| zh | `sandbox-off` | `sub 10px rgb(173,178,184)` 文本宽 59.6 | 无 | 同上 |
| en | Full access | `20px/600 rgb(236,19,19)` 文本宽 91.7，呼吸中 | `rgb(236,19,19)` | 同上 |
| en | Read Only | `20px/600 rgb(34,197,94)` 文本宽 91.7 | `rgb(34,197,94)` | 同上 |
| en | **Workspace Write** | `sub 10px rgb(173,178,184)` 文本宽 68.9（**不截断**，149.8 放不下 124） | `rgb(65,118,230)` 蓝（颜色留在盾牌上） | 同上 |
| en-dark | 同上 | 红 `rgb(242,90,90)`、蓝 `rgb(103,158,254)`、绿 `rgb(34,197,94)` | 同色 | 同上 |

四张卡片在两种主题、两种语言下的 `data-dsx-overflow` 都是 `null`、`clientHeight = 150`（`scrollHeight = 148`），即**没有任何一张溢出**；所有文本的 `Range` 宽度都 ≤ `clientWidth`，即**没有任何 `…`**。
