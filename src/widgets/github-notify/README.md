# github-notify — GitHub待我处理 / GitHub Review

> 修订轮（2026-09-30）：车主看卡后指出「单看这个组件怎么知道和 GitHub 相关，
> 万一以后接入其它平台也有待处理组件怎么区分」。本轮**加平台身份**（右上角品牌图标 + 名字带平台），
> 行为一条不改。README 新增 **§0 审计**（BRIEF V3 的强制交付物）与 **§10 未来接入第二个平台**。

---

## §0 审计（BRIEF V3 §0 六问，逐条回答）

**1. 这个信息是不是已经在别处更方便地展示了？**
没有。GitHub 的未读队列**只存在于** GitHub 网页/客户端里，DSH 的任何产品面（输入框、权限选择器、页头、设置页）
都不显示它——它不是「已经常显在某个官方位置、卡片只是抄一遍」的那类信息（`model-config` 就是因此被删的）。
卡片把「有没有人等**我**」这一条从另一个应用搬进 rail，是**唯一**入口，所以值得存在。
本轮没有改变这个判断，只是补上了「这张卡属于哪个平台」。

**2. 有没有功能高度重合的既有组件？**
有同族的 5 张 GitHub 卡，逐条比过（口径 = 窗口 / 范围 / 单位 / 时态）：

| 既有组件 | 窗口 | 范围（谁的） | 单位 | 时态 |
| --- | --- | --- | --- | --- |
| `github-contrib` 提交热度图 | 近 3 个月 / 近一年 | **你的**贡献 | 次 | 过去 |
| `github-stars` Stars | 当前 | **某仓库**人气 | 颗 | 当前快照 |
| `github-issues` 问题 | 当前 | **某仓库**未关闭 Issue | 条 | 当前快照 |
| `github-push` 提交 | 当前 | **某仓库**最后一次 push | 时间点 | 过去 |
| `github-board` 仓库脉搏 | 当前 | 上面四项并排 | 混合 | 当前快照 |
| **本卡** | **当前未读** | **账号**（`GET /notifications` 属于凭据本人） | **条** | **待办（指向未来动作）** |

差异是三个维度同时成立，不是措辞差异：**范围**（账号 vs 某仓库）、**时态**（要你动手 vs 已经发生/当前状态）、
**数据面**（`stats.github.notifications` vs `contributions` / `repos`）。本卡是家族里唯一读 `notifications` 的部件，
其余 5 张连请求参数都不含 `notif=1`（采集器只在装了本卡时才加）。**结论：保留，不合并。**

**3. 如果不合并，用户不读文档怎么分清两张？**
三处自己回答「我是哪个」，本轮把第 2 处补成了**明确的平台标识**：

1. **名字**：卡面标题 `GitHub待我处理`、市场名 `GitHub 待我处理` / `GitHub · To Review`；
2. **右上角图标**（本轮新增）：GitHub 官方 Octicons mark，与用户在两处 GitHub 界面看到的是同一个图形——
   没有环、不染色，它是**身份**而不是读数；
3. **大数字的单位**：条（整数），灰字第一句是 `repo · reason`（如 `dsh-widgets · Review 请求`），
   说的是一条具体的线程，不是仓库统计。

名字里带平台**不是修辞**：将来接入第二个平台时（见 §10），`GitLab待我处理` / `Jira待我处理`
在同一列 rail 里必须一眼可分；图标是这套前缀的图形版本。**与 `github-issues` 的分辨**：
那张卡的名字是「问题」、范围是某仓库、大数字是未关闭数——名字里带平台之后，
「GitHub待我处理」（要你动手）与「问题」（仓库有多少）不会再被读成同一件事。

**4. 这个大数字是什么单位、什么范围、什么时间点？**
单位是**条**（未读线程数），范围是**当前凭据那个账号**的未读收件箱，时间点是**此刻**（host 侧 5 分钟 memo + ETag）。
`capped` 时印 `30+`：host 只取一页（`per_page=30`），满页的含义就是「至少这么多」，精确数会是一句它支撑不了的话。
不需要解释就能看懂（`3` = 三条在等我），这是本轮之前就满足的一条，未改。

**5. 它应该一直在，还是可以消失？**
**可以消失，并且必须消失**（BRIEF V2 允许的例外：由任务书指定的新增可选卡）。
`notifications === null`（没请求 / 匿名 401 / 调用失败）→ `render` 返回 `null`。
把「我看不见」印成「0 条待办」是这张卡唯一不可退让的纪律，本轮**没有**为了常显而改它。
判断依据：这不是「装了但暂时没数」的卡（那种应该显示安静空态），而是**需要一个凭据才能存在**的卡——
没凭据时它本就不该占一格。

**6. 颜色有没有被赋予一个用户能说出的含义？**
没有染色。大数字不设 `valueTone`、三行明细不设 `tone`（`0` 与 `2` 一样是黑字）、
图标不设 `headIcon.tone`（默认取 label 主色）。**唯一**的 `muted` 用在「这个桶根本没被上报」的 `—` 上，
含义是「没量到」而不是「等级」。判定依据：「有人等你不是错误」，红/琥珀留给真的坏掉的东西。
本轮新增的图标**刻意不染色**——一个不知为何变黄的品牌 mark 就是 `headIcon` 文档里点名的
「why is this yellow?」缺陷。

---

## 1. 这张卡回答什么问题

**GitHub 上现在有人在等我吗？如果有，最先该看哪一条。**
它是 GitHub 家族里唯一一张「待办」卡：另外 5 张（提交热度图 / Stars / 问题 / 提交 / 仓库脉搏）讲的都是**仓库状态**，
没有一张能说「有人在等你」。

---

## 2. 卡面草图（2×2，150×150 内容区）

```
┌──────────────────────────────────────┐
│ GitHub待我处理            ▟▛        │ ← 标题（蓝色 13px）+ 右上角 GitHub mark（34px，不染色）
│                           ▜▘         │
│ 3                        ← headAfter.big：未读总数（20px，不染色）
│ dsh-widgets · Review 请求 ← legend：最新一条（repo · reason，超出尾部省略号）
│ ──────────────────────────────────── ← breakdown 的 hairline 分隔线
│ Review 请求                        2 │ ← 明细三行，键集恒定
│ 提及                               1 │
│ 指派                               0 │ ← 0 也印（它是「量到 0」，不是「没量到」）
└──────────────────────────────────────┘
```

图标与标题在**同一行**：图标占右上槽，标题梯（标题 → 大数字 → 灰字）在左列，这是渲染器
`headIcon` / `headRing` 共用的姿态（`CardBody` 的 `accessoryHead`）。

hover（原生 `title`，不占像素）：`最新一条的完整标题` / `owner-repo · 多久以前` / `newest.url`，
当 CI / 其它有未读时再补一行「另有 N 条 CI / 其它未列入上面三行」。

---

## 3. 数据来源

只读一个字段：**`stats.github.notifications`**（契约 `GitHubNotifications`，见
`src/client/lib/contract/types.ts`）。

| 卡面元素 | 取哪个数 | 口径 |
| --- | --- | --- |
| 大数字 | `count` | GitHub 自己回的未读线程总数（`GET /notifications?all=false&per_page=30` 的长度） |
| legend | `newest.{repo,reason}` | 列表里最新的一条；`repo` 取最后一段（`Physicolor/dsh-widgets` → `dsh-widgets`，与家族其余 5 张同一规则、同一个 `repoShort`） |
| 明细三行 | `byReason.review_requested` / `.mention` / `.assign` | host 已把 reason 归一成这五个桶；三行只取前三桶 |
| hover | `newest.{title,repo,updatedAt,url}`、`byReason.{ci_activity,other}` | `updatedAt` 走共享的 `fmtAgo`（读时钟，允许）；`url` 由 host 从 API URL 换成 `github.com` 的 HTML 链接，换不出来时是 `null` |
| 右上角图标 | 常量 `{ name: 'github' }`（**不来自数据**） | 身份标记：它说的是「这张卡属于哪个平台」，不随 payload 变。这是唯一一个不由数据驱动的卡面元素 |

链路上游：采集器**只在装了本卡时**才给 `/api/github` 加 `notif=1`（`src/client/data/collector.tsx`），
host 侧 5 分钟 memo + ETag（`304` 不扣配额，实测 `src/host/github.ts`）。

### 三种「没有数」必须分清

| 情况 | 契约里的形态 | 这张卡的表现 |
| --- | --- | --- |
| 没人登录（token / `gh` 都没有）**或**这条切片没被请求 **或**调用失败 | `notifications` 为 `null` / `undefined` | `render` 返回 **`null`**：卡片根本不出现。**绝不印 0** |
| 量到了，但队列是空的（认证 200 + 空数组） | `count: 0`，`newest: null` | 正常渲染：大数字 `0`，legend 「暂无待处理」，三行全 0 |
| 某个桶没被上报（旧的/残缺的 `byReason`） | `byReason[bucket] === undefined` | 该行印 `—` + `tone: 'muted'`（「没量到」），**不补 0** |

**为什么匿名不能当成空**：GitHub 的 `/notifications` 匿名返回 **401，不是空列表**（2026-09-29 实测）。
host 因此把它报成「切片缺席」而不是「0 条」。如果这里印「0 条待办」，就是把「我看不见」说成「没人等你」——
这是这张卡唯一不可退让的纪律。**本卡需要 token 或 `gh` 登录**（host 会依次尝试凭据 / `gh` CLI）；
两者都没有时，卡片在栏里不出现（`source: 'github'` 的骨架只在 host 从未答过时出现，
一旦答过就不会一直转圈——见 `src/client/rail/rail-view.tsx` 的 `isSourcePending`）。

### `count` 与 `byReason` 之和不一致时

- 大数字**永远**是 `count`（GitHub 自己的总数），三行**永远**是 `byReason` 各自的值；
- 卡片**不做算术平均、不缩放到 count、不加“剩余”行**——两个数各自是真的，编第三个数字才是撒谎；
- 差集只在 hover 说明，且只在 `byReason` 同时给了 `ci_activity` 与 `other` 时才算（否则那是假设，不是计数）。

分页下界：host 用 `per_page=30` 取一页，`count === 30` 的实际含义是「≥30」。
契约已带标记位 `GitHubNotifications.capped`，满页时印 **`30+`**（集成期新增；
本轮保留，见 §7 的空态表）。

---

## 4. 元素为什么这么摆

- **右上角图标**（本轮新增）：头部右侧那个槽位原本给 `headRing`（环 = 读数的语言：占比、水位）。
  本卡没有分母，环会凭空造出一个「多少之多少」，所以用同一个槽位的**裸图标** `headIcon`：
  它是**身份**——「这张卡说的是 GitHub 那个账号的收件箱」。图标由渲染器按 34px 基准绘制、放在标题行右侧，
  部件不给尺寸、不染色（见 §0 第 6 问）。
- **大数字在标题正下方**（`headAfter.big`，不是 `value`）：这是卡片头部的三段阶梯（蓝色标题 → 20px 大数字 →
  灰色 caption）的既有写法。用 `headAfter` 的头，body 会从头部下方开始；`value` 会被推进正文，
  在有 `headAfter` 的卡上等于把总数印两遍。
- **legend 放最新一条**：总数只回答「有多少」，不回答「先看哪个」。150px 只够一行灰字，
  而「最新的一条是哪条」是这一行能承载的最大信息量。`repo · reason` 的顺序与 SPEC 一致，
  超宽时 CSS 尾部省略号截断（`repoShort` 已经把 `owner/` 去掉；reason 排在后面，先被截到的是它，
  完整的 repo 与标题都在 hover 里）。
- **恰好三行明细**：`review_requested` / `mention` / `assign` 是真正「要你动手」的三类；
  `ci_activity`（CI 变红）与 `other` 不是「有人在等你」，所以不进明细——但**行数不随数据变**：
  0 的行照印，卡片高度与栅格永远稳定（见 §3 的「没量到」一栏，那是唯一会改变一行的形态）。
- **贴底**（`bodyAnchor: 'bottom'`）：这是本仓库头部 + 明细卡的统一姿态（缓存命中 / 工具调用）。
  不贴底的话，`headAfter` 的头会让明细紧贴 caption，剩下 16px 空在最后一行下面。
- **整卡不可点击**：不设 `cycle`、不设 `corner`、不设 `actions`——卡片是「看一眼」的表面，
  `newest.url` 只在 hover 出现，避免误点跳出。图标不是按钮，也不可点。

**150px 预算实测**：`pad 12` + 头（16 + 4 + 25 + 2 + 12 = 59）+ 明细（1px 线 + 6 + 3×12 + 2×4 = 51）+ `pad 12` = **134 / 150**，
余 16px 落在 caption 与分隔线之间。DOM 探针实测卡片高度 **150.00px**、`scrollHeight === clientHeight`、
`data-dsx-overflow` 未置位、控制台零警告（六个状态全部如此）。**加了图标之后这四条一条没变**——
图标与标题梯同高，不占额外垂直空间；实测图标盒 `y=59…93`（34px），卡高仍为 150.00px。

### 标题里的平台名为什么没有空格（`GitHub待我处理`）

头行给标题列的实际宽度约 **92px**（150 − 2×12 pad − 34px 图标 − 8px 槽间距；图标用 `transform: scale(2.125)`
放大到 34px，其布局盒仍是 16px，所以标题列拿到的比算术值多一点，但**实测定言**）。
在真实渲染器里 2× 实测三候选人：

| 候选 | 实宽 | 结果（`read_image` 看 PNG） |
| --- | --- | --- |
| `GitHub 待我处理` | 94.25px | **被截成 `GitHub 待我处…`** |
| `GitHub · 待我处理` | 107.17px | 截得更狠 |
| `GitHub待我处理` | 91px | **完整显示** |
| `GitHub Review`（英文） | 91.58px | **完整显示**（英文名另给市场名 `GitHub · To Review`） |

被自己截断的平台名（`GitHub 待我处…`）比不带平台还糟——它就失去了「告诉你是哪个平台」的全部作用。
中英交界处本身就是视觉断点，不需要空格；**市场名不受宽度约束**，保留更好读的 `GitHub 待我处理` /
`GitHub · To Review`（那里有完整一行）。若将来主 Agent 缩短 `headIcon` 槽或标题列变宽，可以把空格加回来。

---

## 5. 语气方向（`tone` 由谁定）

**待办数不染色**（SPEC §13）。语义由**本部件**决定，写在这里与 `index.ts` 的头注释里：

- 大数字：不设 `valueTone`（也没有 `headRing`——环是「占比」的语言，这里没有分母）；
- 右上角图标：不设 `headIcon.tone`（默认 label 主色）。花哨地给品牌 mark 上色没有含义可讲；
- 三行明细：不设 `tone`（0 与 2 一样是黑字），**唯一**的例外是「这个桶根本没被上报」→ `'muted'`；
- 判定依据：「有人等你不是错误」。红/琥珀色留给真的坏掉的东西（`danger` = 已经坏了，`warn` = 正在朝那走），
  队列长度两样都不是。

---

## 6. 配置项

**无。**（与 SPEC 一致，本轮未变。）

这同时是家族里**唯一**没有 `user` / `repos` 两个字段的 GitHub 卡：`GET /notifications` 是**账号级**接口
（回答永远属于当前凭据那个账号），家族共用的 `user` / `repos` 在这张卡上改了也不会有任何效果，
放上来就是两个骗人的开关。需要换账号请改 token / `gh` 登录。

---

## 7. 空态 / 降级行为（逐条）

| 输入 | 表现 |
| --- | --- |
| `stats.github` 不存在，或 `notifications` 为 `null`/`undefined` | `render` 返回 `null`（卡片不出现）——含「没请求」「匿名 401」「请求失败」三种 |
| `count: 0` + `newest: null` | 正常渲染：`0` + 「暂无待处理」+ 三行 0 |
| `capped: true`（满页） | 大数字印 `30+`（不是裸 30）：满页的意思是「至少这么多」 |
| `newest` 为 `null` 但 `count > 0` | legend 印「最新一条未提供」（保证头部第三阶不消失，高度不跳） |
| `count` 不是有限数 | 大数字印 `—`（三行照印） |
| `newest.repo` 为空串 | legend 只剩 reason，不留悬空的分隔点 |
| `newest.url` 为 `null` | hover 不出现链接行，**不**拼一个打不开的地址 |
| `newest.updatedAt` 解析不出来 | `fmtAgo` 返回 `—`，该段从 hover 行里剔除 |
| `byReason[bucket]` 缺失 | 该行 `—` + `muted`（行数不变） |
| `reason` 是未知值（GitHub 以后新加的） | 照印 GitHub 自己的 token（原始事实），不折进「其它」 |
| CI / 其它有未读而不在前三桶 | 大数字照印总数，三行照印，hover 补一行「另有 N 条 CI / 其它」 |

预览状态（`example.simSteps`，点击预览卡循环）：`waiting`（3 条，含一条 review 请求）
→ `clear`（量到的空队列）→ `capped`（满页 ⇒ `30+`）→ `ciOnly`（只 2 条 CI，三行全 0）
→ `thin`（`byReason` 只报了一个桶 ⇒ 另外两行印 `—`；这是**防御分支**，已发布的 host 永远会报满五个桶）
→ `absent`（未登录 → `render() → null`）。
`sim` 只由预览传入，rail 永远不传，所以这些合成数据**不可能**出现在已安装的卡上。

---

## 8. 与既有卡的差异（为什么不是重复）

见 §0 第 2 问的对照表（窗口 / 范围 / 单位 / 时态四列）。一句话：
其余 5 张讲**仓库状态**，本卡讲**账号待办**；其余 5 张读 `contributions` / `repos`，本卡读 `notifications`。

---

## 9. 预览 / 自测

```sh
node scripts/validate-widget-unit.mjs src/widgets/github-notify   # 0 failure（1 个 warning，见下）
npx tsc --noEmit                                                   # 0 error
node scripts/preview/gallery.mjs --only github-notify              # 6 张 PNG（浅色）
node scripts/preview/gallery.mjs --only github-notify --dark       # 6 张 PNG（深色）
```

截图落在 `docs/preview/cards/`：

```
github-notify@2x2.png       github-notify@2x2-dark.png        # 3 条未读（主形态）
github-notify@2x2-s1.png    github-notify@2x2-s1-dark.png     # 量到的空队列
github-notify@2x2-s2.png    github-notify@2x2-s2-dark.png     # 满页 ⇒ 30+
github-notify@2x2-s3.png    github-notify@2x2-s3-dark.png     # 只有 CI/其它
github-notify@2x2-s4.png    github-notify@2x2-s4-dark.png     # byReason 缺桶 ⇒ 两行印 —
github-notify@2x2-s5.png    github-notify@2x2-s5-dark.png     # 未登录 → render() → null
```

唯一的 warning 是 `sim.notify`（`sim.*` 不在 `widget.` / `card.` 前缀下，校验器把它归为「非本地键」）——
它与已发布的 `peak-pricing`（同样自带 `sim.peak`）拿到的是同一条 warning，属既有约定的既有噪声。

---

## 10. 将来接入第二个平台时怎么办（本轮车主问题的正面回答）

**现在的机制：**
`headIcon.name` 取自共享层的**封闭词表** `HeadIconName`
（`src/client/lib/contract/types.ts`：`permission-read-only` / `permission-workspace-write` /
`permission-full-access` / `github`），词表到图形的映射是 `src/client/render/icons.tsx` 里的
`HEAD_RING_ICONS`。**它是封闭的、有意的**：渲染输出是纯数据（离线闸门 G4 会把每个部件的输出快照成 JSON），
所以图标不能是 React 节点，只能是一个名字。

**因此，接入第二个平台（例如 GitLab）时部件工程师要做的和不该做的：**

| 步骤 | 谁做 | 做什么 |
| --- | --- | --- |
| 1 | **主 Agent**（共享层） | 在 `render/icons.tsx` 加 `gitlabMarkIcon`（官方 path，**不要自己画**），并在 `HeadIconName` 联合里加 `'gitlab'`；同时更新 `HEAD_RING_ICONS` 映射 |
| 2 | 部件工程师 | 新部件 `<platform>-notify` 里写 `headIcon: { name: 'gitlab' }`，名字用 `GitLab待我处理` 形式（**平台前缀就是为此预留的命名约定**） |
| 3 | 部件工程师 | README §0 第 2 问里把「与 GitHub 那张的分辨」写清楚（同族不同平台的两张卡必须能一眼分开） |

**部件不许自己加图标**（共享层是多人单写者资源，一个部件私加会立刻产生分叉）。
需要新图标时在结案报告里写「需要主 Agent 在共享层加 `X`（官方来源：…）」，**并且交一个不依赖它的版本**——
本卡的现状就是「图标 + 文字」双保险，所以即使图标暂时没有，名字里的平台前缀仍然成立。

**命名约定（写进家族约定）**：`<平台><动作>`，中文不加空格（见 §4 的宽度实测），英文用 `<平台> <动作>`
且市场名可用 `·`。两端都带平台 ⇒ 图标是图形版、名字是文字版，无障碍与纯文本面（市场列表、README）都能读出平台。

**还有一个前提没做**：本卡的 `cardHint`、`reason` 词表都是 GitHub 专属的（`review_requested` 等是 GitHub 的
`reason` 枚举）。第二个平台的 reason 词表**必须自带**，不许复用本卡的表——那是把 GitHub 的词汇按到别人身上。
