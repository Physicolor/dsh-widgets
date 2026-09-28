# guard — 权限档位

## 1. 这张卡回答什么问题

**这个会话现在被允许做什么？** —— 一行字：`完全权限`（能写哪里、要不要先问）。

长跑自主 agent 最该被一眼看到的安全事实，而它在 rail 上完全不可见。既有 44 张卡回答的都是「用了多少」，没有一张回答「它被允许做什么」。

## 2. 卡面草图（2×2，150×150，内容区 126×126）

```
┌──────────────────────────────┐
│ 权限档位                     │  ← card.guard.title（蓝标题 13px）
│ 完全权限                     │  ← headAfter.big = 当前档位的 name（20px，danger 档位染红）
│ 4 个可选档位                 │  ← legend = options.length（灰字 10px）
│ ──────────────────────────── │  ← breakdown 自带的分隔线
│ 当前              完全权限   │  ← 行 1（danger 档位时该行值染红）
│ 可选                   4 个  │  ← 行 2
│ 说明      文件与命令均不询问…│  ← 行 3（当前档位 description 截断；缺 → —）
└──────────────────────────────┘
```

`render` 输出：`title` / `headAfter.big` / `legend` / `bodyAnchor:'bottom'` / `chart.kind:'breakdown'`（3 行）/ danger 档位时 `valueTone:'danger'`。

## 3. 数据来源

只读 `WidgetStats.permissions`（`PermissionInfo`，官方 `permissions` 会话投影，同步读，**不写 `source`、无骨架**）：

| 字段 | 口径 |
| --- | --- |
| `currentValue` | 当前生效的 preset 表键（如 `danger-full-access`）或派生值 `custom` |
| `options[].value/name/description` | 可切换的档位表。`name` 是显示名，`description` 是官方那一整句说明 |
| `options.length` | 可选档位个数（灰字与「可选」行用） |

**投影已经把 preset / 沙箱模式 / 审批策略三个旋钮折成一个值**，本卡直接印这个折叠结果：它**不**从 preset 键反推沙箱模式或审批策略 —— 折叠值才是权威，第二套推导就是第二个答案，可能与运行时真正执行的那个不一致。

三种「没有」不是同一句话：

| 输入 | 行为 |
| --- | --- |
| `permissions` 为 `null` / `undefined`（未组合权限服务） | `render` 返回 **`null`**（整卡不出现） |
| `permissions.currentValue === ''`（表给出了一个无键的折叠） | 同上返回 `null`：没有可印的事实 |
| `options` 为空数组 | **照常渲染**：大数字印 `currentValue` 原样，灰字 `0 个可选档位`，说明行印 `—` muted |
| `currentValue` 不在 `options` 里 | 大数字与「当前」行印 `currentValue` **原样**（**不是** `—`，原样值仍是真话）；说明行 `—` muted |
| 当前档位没有 `description` | 只在说明行印 `—` muted，其余照常 |

## 4. 元素为什么这么摆

- **大数字 = 当前档位的显示名**，不是机器键：用户在官方权限选择器里看到的就是这个名字，机器键（`danger-full-access`）读起来像配置文件。它在标题正下方一行（`headAfter.big`），**不用 `value`**——`value` 是「正文数字」，在有 `headAfter` 的卡上会被推进正文并重复渲染。
- **灰字 = 可选档位个数**：它是这张卡唯一能被读成「还能换成什么」的量，且不占行高。**注意这个数会变**：`custom` 只在它就是当前值时才被追加进 `options`（官方契约原话），所以表长度是「4」还是「3」取决于当前状态，而不是配置变更。为避免中英两套文案在 10px 下宽度不一，个数走 `card.guard.count`（zh `{n} 个` / en `{n}`）。
- **三行明细**（`breakdown`，标签左、数值右，共用一条分隔线）：
  1. **当前** — 与大字同一个名字。它是本卡第二个（也是唯一可用的第二个）染红位置，见 §5；
  2. **可选** — 可选档位个数；
  3. **说明** — 当前档位的 `description` 截断，**这是卡上唯一的自由长文本**。
- **贴底**：`bodyAnchor:'bottom'`。头部只有三行（标题/大字/灰字），明细必须坐在卡片的底边上；不贴底会在行下方留一段 12–16px 的空档（这是本仓库其它卡片的统一姿态）。
- **不用 `headRing`**：环是「占比」的语言，本卡的大字是一个**名字**，不是任何东西的分数。
- **不用 `valuePulse`**：常驻闪烁会变成噪音（规格明确要求不闪）。危险档位的升级只靠红色：大字 + 「当前」行。

### 说明行的截断策略

breakdown 是**一张** `1fr auto` 网格：数值列由**最宽的那个值**决定，标签列吃剩下的宽度，而标签格才是被裁掉/淡出的那个（值格是 `nowrap` 且没有 overflow 处理——不截断就会反过来挤掉标签）。所以：

1. 预算 = 126（150 − 2×12 pad）− 最宽标签宽 − 8（网格 columnGap）− 6（给字面回退留的余量）；
2. 宽度用**估算**（CJK/全角 1 em，拉丁/数字 0.55 em，10px 字号）：卡片存的是文本、离线渲染器没有字体度量，估算宁可略保守；
3. 先按预算切出前半段，若段内存在**句读边界**（`。！？；，、,.!?;: `）且保留长度 ≥ 预算的一半，就切在边界上（保留前半句），否则硬切；
4. 末尾补 `…`，**省略号算进预算**（1 em）。

实测（在 `.tmp-gallery/index.html` 里量真实 DOM，两种语言各三个状态）：zh 说明行值 **90px**（= 8 个汉字 + `…`）、标签列 26px，整行 124/126；en 说明行值 **70px**（≈ 11 个拉丁字符 + `…`）、标签列 46px，整行 124/126。六个格子的 `scrollWidth === clientWidth`，**没有一个标签被淡出或裁掉**，值也没有溢出。规格书草图里的「文件与命令均不询问…」（9 个汉字 + 省略号 = 100px）比这一行的真实预算宽约 8px —— 卡上少留一个字，换标签完整。

## 5. 语气方向（tone 语义由本部件自己定）

**方向：权限越大越需要被看见**（唯一一张按危险度染色的卡）。

- 匹配规则 = 有名字的常量 `DANGER_MARKERS = ['danger','full','yolo','bypass']`，**大小写不敏感**，只匹配 `currentValue`（机器键），**永不匹配显示名**（显示名是本地化的，一个翻译过的词不该决定颜色）。
  - `danger` / `full`：官方出厂的 `danger-full-access`（沙箱 full access + 审批 never）；
  - `yolo` / `bypass`：其它 harness 对同一捆绑的惯用名，也是自定义部署最可能组合出来的名字。
- 命中 → `valueTone:'danger'`（大字染红）+「当前」行 `tone:'danger'`。
  - 规格书还要求「灰字也用 danger 语气」，但**渲染契约没有这个通道**：`legend` 恒为 `label-tertiary`，`valueTone` 是单成员联合、只作用于数字。所以第二个红色位置落在「当前」行（它是本卡唯一还能染色的格）。灰色 caption 的 danger 语气需要主 Agent 先在共享层加一个 `legendTone` 字段——本卡不依赖它，也不自己造原语。
- `read` / `plan` / `safe` 家族**故意没有常量、不染色**：安全档位本该什么颜色都不拿。渲染契约的 `valueTone` 是**单成员联合**（只有 `'danger'` 这个升级红），没有绿色可给；默认标签色正好就是「没什么要升级的」的样子。写一张没有分支会读的「安全标记表」是死代码，所以不写。
- **这是启发式，不是权威。** 两个已知盲区，都不打算在卡里补：
  1. 派生值 `custom` 只给一个键，**折进去的三个旋钮被官方刻意隐藏**——一个「自定义的危险组合」在本卡里不会变红；
  2. 部署可以把危险档位改名成任何东西，`DANGER_MARKERS` 就看不见它。
- 本卡**不**提供权限切换（不占用点击、不加 `corner` 按钮）：改权限是官方权限选择器的事，一个卡片上的双段确认按钮不是安全的写路径。

## 6. 配置项

**无。** 本卡不提供 `configSchema`（第一版不加配置，不为加而加）。

## 7. 空态 / 降级行为

- `permissions` 为 `null`/`undefined`，或 `currentValue` 为空串 → `render` 返回 `null`（整卡不出现；本卡没有必须常驻的按钮，所以没有例外）。
- 缺 `description` → 说明行印 `—` + `tone:'muted'`。
- `currentValue` 不在 `options` 里 → 印原样值（见 §3 表），不印 `—`。
- 本卡自带一个**只作用于预览**的状态机：`example.simSteps` 依次给 `currentValue` 三个值（危险档位 → 只读档位 → 表里没有的键），因为这三条分支在实时会话里没法按需复现。`sim` 只覆盖 `currentValue`，**不覆盖 `options`**：所以「派生 `custom` 且表里带着追加的 `custom` 项」这个真实形态无法用 sim 展示（它要求 `options` 也一起变），它走的是第三步那条回退路径（`custom` 若在表里，名字就从表里取——就是本卡唯一的 `find`）。rail 永远不传 `sim`。

## 8. 与既有卡的差异（去重）

- 44 张既有卡 + 本批其它 6 张（会话配置 / 目标进度 / 子代理 / 后台作业 / 磁盘自检 / 窗口预测）**没有任何一张**读 `permissions`：`grep -r "permissions" src/widgets` 在本卡之前只有 0 个消费点。
- 本批「不做」清单里已经否决了「沙箱模式独立卡」：`sandboxMode` 没有 wire，且它已被 `permissions` 折进去——本卡印的正是折叠结果，所以与那张被否决的卡不重复，而是它的合法替代。
- 与 `context` / `tokens` 这类「用量」卡不同：本卡的数字**不是**任何东西的累计，改权限不消耗任何资源，所以没有环、没有占比、没有 `cycle`。

## 9. 预览

```sh
node scripts/validate-widget-unit.mjs src/widgets/guard
node scripts/preview/gallery.mjs --only guard          # → docs/preview/cards/guard@2x2*.png
node scripts/preview/gallery.mjs --only guard --dark   # 深色主题
```

截图（每步一张，`-s1..s2` 为 simSteps 的第 2、3 步）：

- `docs/preview/cards/guard@2x2.png`（危险档位：红大字 + 红「当前」行）
- `docs/preview/cards/guard@2x2-s1.png`（只读档位：不染色）
- `docs/preview/cards/guard@2x2-s2.png`（表里没有的键：原样值 + `—` muted）
- `docs/preview/cards/guard@2x2-dark.png` 等三张深色版

交互页：`.tmp-gallery/index.html`（浏览器打开可直接点卡片切换三个状态）。
