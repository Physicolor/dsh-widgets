# guard — 权限档位

## §0 审计（动手之前逐条回答，WORKER-BRIEF-V3 §0）

**1. 这个信息是不是已经在别处更方便地展示了？**

是——**输入框的权限选择器就是它的更方便版本**：可点、可改、带三个 shield 图标、带整句说明，点开还能看到全部可选档位。这一条不回避。它仍然值得存在，是因为选择器有两个**时刻**覆盖不到：

- **它只在 composer 进可视区时才在屏幕上。** 本卡存在的场景恰恰是"人不看 composer"的场景：多会话长跑、盯着 rail 看这一批会话各自花掉多少、还剩多少。此时"它被允许做什么"是判断要不要打断它的前提，而要看到选择器得先滚动回输入框。
- **选择器是输入，本卡是回执。** 选择器回答"能改成什么"，本卡回答"现在是什么"——和 rail 上其它"当前状态"卡（上下文水位、工具调用）同类。车主的裁决也是"可以保留"。

所以本卡的职责在本轮被**收窄**：车主要求"其它文字全部清空"，判据就是第 1 问——**凡是在选择器里更方便读到的（description 整句、档位个数、全部选项），一律不进卡面**。这一轮删掉的 legend（「N 个可选档位」）和三行 breakdown（当前 / 可选 / 说明）正是按这条判据删的，而不是因为它不好看。

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

**3. 用户不读文档怎么分清两张？** 名字是「权限档位」（不是「用量」类词）；卡面上唯一的正文文本就是档位名本身（`完全权限` / `Workspace Write`），没有百分比也没有计数可以误读；右上角是官方权限选择器那枚盾牌（产品里同一个图标只出现在权限行）。所以本卡靠"一个权限词 + 一枚官方盾牌"自我说明，不需要一个灰字去解释。

**4. 这个大数字是什么单位、什么范围、什么时间点？** 单位 = **权限档位的显示名**（枚举词，不是数值；所以没有量纲、没有小数、不可加）；范围 = 本会话 preset / 沙箱模式 / 审批策略三个旋钮**折叠成的当前值**（`PermissionInfo.currentValue`）；时间点 = **现在**（会话内同步投影，读时钟才需要说明，这里连时钟都不读）。不需要任何解释就看得懂——`完全权限` 就是官方选择器里的那个词。

**5. 它应该一直在，还是可以消失？** **可以消失**：`permissions` 为 `null`/`undefined`（部署没有组合权限服务）或 `currentValue === ''` → `render` 返回 `null`。这是任务书 V3 §1.2 明确指定的（"这张卡是新增可选项，未装即不显示"），本卡也没有必须常驻的按钮，所以不该用安静空态占位。

**6. 颜色有没有被赋予一个用户能说出的含义？** 有，且只有一条：**红色的盾牌 = 完全权限族**（能对整机动手、且不询问）。用户能一句话说出它为什么红。绿/黄不用（契约里也没有"安全色"）；安全档位的盾牌保持中性前景色 = "没什么要升级的"。这是本批唯一按危险度染色的卡，阈值来源见 §5。

---

## 1. 这张卡回答什么问题

**这个会话现在被允许做什么？** —— 一枚官方盾牌 + 一个词：`完全权限`。

## 2. 卡面草图（2×2，150×150，内容区 124×124，内边距 13）

```
┌──────────────────────────────┐
│ 权限档位              ◯盾牌  │  ← 标题（蓝 13px，左上） + headIcon（34px，右上）
│                              │
│                              │  ← 空：车主要求"其它文字全部清空"
│                              │
│ 完全权限                     │  ← sub = 当前档位显示名（10px，左下，贴底）
└──────────────────────────────┘
```

`render` 输出：`title` / `headIcon:{name}`（危险族另有 `tone:'danger'`）/ `sub` / `bodyAnchor:'bottom'`。**没有** `legend`、`headAfter`、`value`、`chart`、`breakdown`、`valueTone`、`valuePulse`、`configSchema`。

四个状态（`example.simSteps`，也是画廊里的四张截图）：

| 状态 | `currentValue` | 盾牌 | 名字颜色 |
| --- | --- | --- | --- |
| 1 | `danger-full-access` | 感叹号盾（官方 path）**红色** | 中性 |
| 2 | `read-only` | 对勾盾 | 中性 |
| 3 | `workspace-write` | 清单+笔盾（本卡最宽的标签） | 中性 |
| 4 | `sandbox-off`（表里没有的键） | **没有盾牌**（官方规则，见 §3） | 中性 |

## 3. 数据来源

只读 `WidgetStats.permissions`（`PermissionInfo`，官方 `permissions` 会话投影，**同步读** → 不写 `manifest.source`，也就没有骨架）：

| 字段 | 口径 |
| --- | --- |
| `currentValue` | 当前生效的 preset 表键（如 `danger-full-access`）或派生值 `custom` |
| `options[].name` | 官方选择器里那一行的显示名。**本部署的投影里它就是 preset 键**，所以本卡用 `presetLabel()` 换成产品自己的词（见下） |
| `options[].value` | 用来把显示名换成官方档位词、并选盾牌 |

**投影已经把 preset / 沙箱模式 / 审批策略三个旋钮折成一个值**，本卡直接印这个折叠结果：它**不**从 preset 键反推沙箱模式或审批策略 —— 折叠值才是权威，第二套推导就是第二个答案，可能与运行时真正执行的那个不一致。

**盾牌映射（`PRESET_ICONS`）只有三条，没有兜底**，因为官方选择器本身就是这么做的（`@deepseek-ai/dsh-client-ui-conversation` 的 `permissionGlyphs`，其自带注释：*"Glyph for a permission option value; host-configured names outside the design set get none"*）：`read-only` → 对勾盾、`workspace-write` → 清单盾、`danger-full-access` → 感叹号盾。出厂表是 `workspace-write` + `danger-full-access`，派生的 `custom` 不在表里 → **不画盾牌**。给一个改名过的档位硬套一枚盾牌，等于用图标宣称一个错误的族——**错误身份比没有身份更糟**（这也是"官方图标，不自己画"的同一原则）。

**显示名（`PRESET_LABEL_KEYS` + `titleCasePreset`，沿用上一版）**：产品自带的三个键印官方词（`完全权限` / `Full access` …）；表里给的 `name` 不是键也不是官方英文默认名时，按官方同一条规则做 kebab → Title Case（`my-custom-preset` → `My Custom Preset`），非 kebab 的人写名字原样保留。

三种「没有」不是同一句话：

| 输入 | 行为 |
| --- | --- |
| `permissions` 为 `null` / `undefined`（未组合权限服务） | `render` 返回 **`null`**（整卡不出现） |
| `currentValue === ''` | 同上返回 `null`：没有可印的事实 |
| `options` 为空数组 | **照常渲染**：名字走键的回退路径，盾牌按上表（`custom` 与未知键无盾牌） |
| `currentValue` 不在 `options` 里 | 名字印键的 Title Case（`sandbox-off` → `Sandbox Off`），**不是** `—`：原样值仍是真话；盾牌按映射表（多数情况没有） |

## 4. 元素为什么这么摆（含实测数字）

- **标题（蓝 13px，左上）**：与 45 张卡同一个头部构件，车主要求保留在最上。
- **盾牌（34px，右上）**：`headIcon`。渲染器规定尺寸（34px 基准），部件不给尺寸。盾牌顶边与标题顶边**同一水平线**（实测两者 `top` 均为 13），所以"右上角"读起来是标题行的一部分，而不是悬在半空。这枚图形与 composer 权限选择器里那一枚是**同一份 path**（`render/icons.tsx` 按官方 path 复制，本卡不画图标）。
- **档位名（10px，左下，贴底）**：`bodyAnchor:'bottom'` + `sub`，实测左边距 13、底边距 13，正好落在卡片的左下角。
- **为什么名字用 `sub` 而不是任务书写的 `value`（本轮最重要的一次实测）**：`CardBody` 的 `value` 只在**没有头部配件**时才进正文（`out.value != null && out.headRight === undefined && !accessoryHead`，`accessoryHead = headRing || headIcon`）。这个判断是 `headRing` 时代的写法，`headIcon` 那次提交（`8be5852`）只是把 `ringHead` 机械改名成 `accessoryHead`，于是**带上盾牌的那一刻，20px 的 `value` 直接不画了**。本轮第一版按任务书原样写 `value`，截出来的图就是"标题 + 盾牌，没有名字"（`.tmp-guard-variantB.png` 之前的那一版）。改用 `sub` 后：①两种状态（有盾牌 / 无盾牌）渲染路径一致，不会因为一个档位改名就跳成 20px 大字；②它是唯一装得下全部官方标签的形状——实测（DOM Range，卡片真实字体）20px 下 `Workspace Write` **163px**、`My Custom Preset` **175px**，而内容宽只有 **124px**，两者都会被截成 `…`；10px 下最宽的 `My Custom Preset` 只有 87px。**任务书那个 20px 版在英文 rail 上会把 `Workspace Write` 截断**，所以这不是"退而求其次"，是唯一没有截断的写法。
- **为什么删掉 legend 与三行 breakdown**：车主原话"其它文字全部清空"。删掉的三个读数各自都有更方便的出处（档位个数与全部选项在选择器里；description 在选择器里）。上一版还为此写了一套 10px 文本截断估算器（`textWidthPx`/`clipSentence`/`clipBudgetPx`）——那套代码随行一起删除，本卡现在没有任何自造排版计算。
- **不用 `headRing`**：环是"占比"的语言，本卡没有分数可画；在环里画盾牌等于凭空发明一个比例，契约注释明确否掉了这种用法。
- **不用 `valuePulse`**：常驻闪烁会变成噪音（规格要求不闪）。

## 5. 语气方向（tone 语义由本部件自己定）

**方向：权限越大越需要被看见。**

- 匹配规则 = 有名字的常量 `DANGER_MARKERS = ['danger','full','yolo','bypass']`，**大小写不敏感**，只匹配 `currentValue`（机器键），**永不匹配显示名**（显示名是本地化的，一个翻译过的词不该决定颜色）。
  - `danger` / `full`：官方出厂的 `danger-full-access`（沙箱 full access + 审批 never）；
  - `yolo` / `bypass`：其它 harness 对同一捆绑的惯用名，也是自定义部署最可能组合出来的名字。
- 命中 → `headIcon.tone = 'danger'`：**它自己那枚盾牌变红**（实测 full access = `rgb(236,19,19)`，只读 = `rgb(65,118,230)`）。
  - 上一版把红色放在 20px 大字与「当前」明细行上；那一格在本轮被删空后，盾牌是本卡**唯一还能染色**的元素（`sub` 在契约里没有 tone 通道，`valueTone` 作用在已不渲染的 `value` 上是死字段——所以本卡不再输出 `valueTone`）。
  - 给盾牌染色不是"没来由的装饰"：这枚盾牌就是"完全权限"这个族在官方 UI 里的身份，身份+等级同色，含义可以用一句话说出（第 6 问）。
- `read` / `plan` / `safe` 家族**故意没有常量、不染色**：安全档位本该什么颜色都不拿，默认前景色正好就是"没什么要升级的"的样子。写一张没有分支会读的「安全标记表」是死代码，所以不写。
- **这是启发式，不是权威。** 三个已知盲区，都不打算在卡里补：
  1. 派生值 `custom` 只给一个键，**折进去的三个旋钮被官方刻意隐藏**——一个"自定义的危险组合"在本卡里不会变红；
  2. 部署可以把危险档位改名成任何东西（例如 `open-bar`），`DANGER_MARKERS` 就看不见它；
  3. 同一类改名还会让**盾牌消失**（`custom` 与所有非设计集键都没有官方 glyph）——所以"没盾牌"同时意味着两件事：名字不是产品自带的三个之一。这是官方选择器的行为，本卡选择与它一致，而不是自己补一枚。
- 本卡**不**提供权限切换（不占用点击、不加 `corner` 按钮）：改权限是官方权限选择器的事，一个卡片上的按钮不是安全的写路径。

## 6. 配置项

**无。** 不提供 `configSchema`（不为加而加）。

## 7. 空态 / 降级行为

- `permissions` 为 `null`/`undefined`，或 `currentValue === ''` → `render` 返回 `null`（整卡不出现；本卡没有必须常驻的按钮，所以没有例外，见 §0 第 5 问）。
- `currentValue` 不在 `options` 里 → 名字印 Title Case 的键，不印 `—`（见 §3 表）。
- `currentValue` 不在 `PRESET_ICONS` 里 → 不画盾牌（其余照常）。
- 本卡自带一个**只作用于预览**的状态机：`example.simSteps` 依次给 `currentValue` 四个值（完全权限 → 只读 → 工作区内修改 → 表里没有的键），因为这几条分支在实时会话里没法按需复现。`sim` 只覆盖 `currentValue`，不覆盖 `options`。rail 永远不传 `sim`。
- **遗留（需要主 Agent 在共享层决定）**：若希望名字回到任务书写的 20px `value`，`CardBody` 那行需要从 `!accessoryHead` 收紧成"只在 `headRing` 时抑制"（即 `out.headRing === undefined`）——`headIcon` 分支并不渲染 `value`，所以抑制它对 `headIcon` 没有意义。这属于共享层（本沙箱禁改 `src/client/**`），本卡交付的是**不依赖它**的版本：名字现在就在左下角、两种状态都渲染、两种语言都不截断。

## 8. 与既有卡的差异（去重）

- `grep -r "permissions" src/widgets`：本卡是**唯一**消费点；45 张既有卡没有任何一张读权限。
- 与 `context` / `tokens` / `session-cost` / `cache` 这类"用量"卡不同：本卡的数字**不是**任何东西的累计，改权限不消耗任何资源，所以没有环、没有占比、没有 `cycle`、没有图表。
- 与 `sys-*` 家族不同：那些卡的范围是**机器**，本卡的范围是**本会话的许可**。
- 本批「不做」清单里否决了「沙箱模式独立卡」：`sandboxMode` 没有 wire，且它已被 `permissions` 折进去——本卡印的正是折叠结果。
- 与官方 composer 权限选择器的差异见 §0 第 1 问（输入 vs 回执；可视区 vs rail）。

## 9. 预览

```sh
node scripts/validate-widget-unit.mjs src/widgets/guard
node scripts/preview/gallery.mjs --only guard          # → docs/preview/cards/guard@2x2*.png
node scripts/preview/gallery.mjs --only guard --dark   # 深色主题
```

截图（每个 sim 状态一张，`-s1..-s3` 为第 2–4 步）：

- `docs/preview/cards/guard@2x2.png` —— 完全权限：**红色**感叹号盾
- `docs/preview/cards/guard@2x2-s1.png` —— 仅可查看：对勾盾，不染色
- `docs/preview/cards/guard@2x2-s2.png` —— 工作区内修改：清单盾（本卡最宽标签，实测 60px / 124px）
- `docs/preview/cards/guard@2x2-s3.png` —— 表里没有的键：**没有盾牌**，名字 `Sandbox Off`
- `docs/preview/cards/guard@2x2*-dark.png` —— 同四张的深色版

交互页：`.tmp-gallery/index.html`（浏览器打开可直接点卡片切换四个状态）。
几何/宽度的实测脚本：`.tmp-guard-probe.mjs`（headless Chromium 读真实 DOM；输出见 `.tmp-guard-probe.json`）。
