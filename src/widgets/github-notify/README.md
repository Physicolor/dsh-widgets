# github-notify — 待我处理 / To Review

## 1. 这张卡回答什么问题

**GitHub 上现在有人在等我吗？如果有，最先该看哪一条。**
它是 GitHub 家族里唯一一张「待办」卡：另外 5 张（提交热度图 / Stars / 问题 / 提交 / 仓库脉搏）讲的都是**仓库状态**，
没有一张能说「有人在等你」。

---

## 2. 卡面草图（2×2，150×150 内容区）

```
┌──────────────────────────────────────┐
│ 待我处理                 ← card.github-notify.title（蓝色 13px）
│                                      │
│ 3                        ← headAfter.big：未读总数（20px，不染色）
│ dsh-widgets · Review 请求 ← legend：最新一条（repo · reason，超出尾部省略号）
│ ──────────────────────────────────── ← breakdown 的 hairline 分隔线
│ Review 请求                        2 │ ← 明细三行，键集恒定
│ 提及                               1 │
│ 指派                               0 │ ← 0 也印（它是「量到 0」，不是「没量到」）
└──────────────────────────────────────┘
```

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

已知的**下界**：host 用 `per_page=30` 取一页，`count` 就是这一页的长度 ⇒ `count === 30` 实际含义是「≥30」。
契约里没有类似 `GitHubRepo.issueCountCapped` 的标记位，所以本卡**照印 30**，
不自己硬编码 30 去猜（那会把 host 的分页大小复制到部件里，host 一改就变成说谎）。
若主 Agent 认可，共享层加一个 `capped` 位即可把这一格变成 `30+`（见结案报告 §6）。

---

## 4. 元素为什么这么摆

- **大数字在标题正下方**（`headAfter.big`，不是 `value`）：这是卡片头部的三段阶梯（蓝色标题 → 20px 大数字 →
  灰色 caption）的既有写法。用 `headAfter` 的头，body 会从头部下方开始；`value` 会被推进正文，
  在有 `headAfter` 的卡上等于把总数印两遍。
- **legend 放最新一条**：总数只回答「有多少」，不回答「先看哪个」。150px 只够一行灰字，
  而「最新的一条是哪条」是这一行能承载的最大信息量。`repo · reason` 的顺序与 SPEC 一致，
  超宽时 CSS 尾部省略号截断（`repoShort` 已经把 `owner/` 去掉；reason 排在后面，先被截到的是它，
  完整的 repo 与标题都在 hover 里）。
- **恰恰三行明细**：`review_requested` / `mention` / `assign` 是真正「要你动手」的三类；
  `ci_activity`（CI 变红）与 `other` 不是「有人在等你」，所以不进明细——但**行数不随数据变**：
  0 的行照印，卡片高度与栅格永远稳定（见 §3 的「没量到」一栏，那是唯一会改变一行的形态）。
- **贴底**（`bodyAnchor: 'bottom'`）：这是本仓库头部 + 明细卡的统一姿态（缓存命中 / 工具调用）。
  不贴底的话，`headAfter` 的头会让明细紧贴 caption，剩下 16px 空在最后一行下面。
- **整卡不可点击**：不设 `cycle`、不设 `corner`、不设 `actions`——卡片是「看一眼」的表面，
  `newest.url` 只在 hover 出现，避免误点跳出。

**150px 预算实测**：`pad 12` + 头（16 + 4 + 25 + 2 + 12 = 59）+ 明细（1px 线 + 6 + 3×12 + 2×4 = 51）+ `pad 12` = **134 / 150**，
余 16px 落在 caption 与分隔线之间。DOM 探针实测卡片高度 **150.00px**、`scrollHeight === clientHeight`、
`data-dsx-overflow` 未置位、控制台零警告（四个状态全部如此）。

---

## 5. 语气方向（`tone` 由谁定）

**待办数不染色**（SPEC §13）。语义由**本部件**决定，写在这里与 `index.ts` 的头注释里：

- 大数字：不设 `valueTone`（也没有 `headRing`——环是「占比」的语言，这里没有分母）；
- 三行明细：不设 `tone`（0 与 2 一样是黑字），**唯一**的例外是「这个桶根本没被上报」→ `'muted'`；
- 判定依据：「有人等你不是错误」。红/琥珀色留给真的坏掉的东西（`danger` = 已经坏了，`warn` = 正在朝那走），
  队列长度两样都不是。

---

## 6. 配置项

**无。**（第一版，与 SPEC 一致。）

这同时是家族里**唯一**没有 `user` / `repos` 两个字段的 GitHub 卡：`GET /notifications` 是**账号级**接口
（回答永远属于当前凭据那个账号），家族共用的 `user` / `repos` 在这张卡上改了也不会有任何效果，
放上来就是两个骗人的开关。需要换账号请改 token / `gh` 登录。

---

## 7. 空态 / 降级行为（逐条）

| 输入 | 表现 |
| --- | --- |
| `stats.github` 不存在，或 `notifications` 为 `null`/`undefined` | `render` 返回 `null`（卡片不出现）——含「没请求」「匿名 401」「请求失败」三种 |
| `count: 0` + `newest: null` | 正常渲染：`0` + 「暂无待处理」+ 三行 0 |
| `newest` 为 `null` 但 `count > 0` | legend 印「最新一条未提供」（保证头部第三阶不消失，高度不跳） |
| `count` 不是有限数 | 大数字印 `—`（三行照印） |
| `newest.repo` 为空串 | legend 只剩 reason，不留悬空的分隔点 |
| `newest.url` 为 `null` | hover 不出现链接行，**不**拼一个打不开的地址 |
| `newest.updatedAt` 解析不出来 | `fmtAgo` 返回 `—`，该段从 hover 行里剔除 |
| `byReason[bucket]` 缺失 | 该行 `—` + `muted`（行数不变） |
| `reason` 是未知值（GitHub 以后新加的） | 照印 GitHub 自己的 token（原始事实），不折进「其它」 |
| CI / 其它有未读而不在前三桶 | 大数字照印总数，三行照印，hover 补一行「另有 N 条 CI / 其它」 |

预览状态（`example.simSteps`，点击预览卡循环）：`waiting`（3 条，含一条 review 请求）
→ `clear`（量到的空队列）→ `ciOnly`（只 2 条 CI，三行全 0）→ `thin`（`byReason` 只报了一个桶 ⇒ 另外两行印 `—`；
这是**防御分支**，已发布的 host 永远会报满五个桶）→ `absent`（未登录 → `render() → null`）。
`sim` 只由预览传入，rail 永远不传，所以这些合成数据**不可能**出现在已安装的卡上。

---

## 8. 与既有卡的差异（为什么不是重复）

| 既有卡 | 它说的 | 与本卡的区别 |
| --- | --- | --- |
| `github-issues` 问题 | 某仓库未关闭 Issue（+ 无人回复数） | 仓库口径、且**不是**给你的：没人回复 ≠ 有人在等你；本卡是账号口径的未读线程 |
| `github-push` 提交 | 某仓库最后一次 push | 过去发生了什么，不是待办 |
| `github-stars` / `github-contrib` | 仓库人气 / 你的贡献量 | 完全无关 |
| `github-board` 仓库脉搏 | 上面四项并排的 2×4 | 两张卡同一族但不同问题：board 是「仓库怎么样」，本卡是「有没有人等**我**」 |

本卡是家族里唯一读 `stats.github.notifications` 的部件（其它 5 张连请求参数都不含 `notif=1`，
只有在装了本卡时采集器才加上它），信息面与它们零重叠。

---

## 9. 预览 / 自测

```sh
node scripts/validate-widget-unit.mjs src/widgets/github-notify   # 0 failure（1 个 warning，见下）
npx tsc --noEmit                                                   # 0 error
node scripts/preview/gallery.mjs --only github-notify              # 4 张 PNG（浅色）
node scripts/preview/gallery.mjs --only github-notify --dark       # 4 张 PNG（深色）
```

截图落在 `docs/preview/cards/`：

```
github-notify@2x2.png       github-notify@2x2-dark.png        # 3 条未读（主形态）
github-notify@2x2-s1.png    github-notify@2x2-s1-dark.png     # 量到的空队列
github-notify@2x2-s2.png    github-notify@2x2-s2-dark.png     # 只有 CI/其它
github-notify@2x2-s3.png    github-notify@2x2-s3-dark.png     # byReason 缺桶 ⇒ 两行印 —
github-notify@2x2-s4.png    github-notify@2x2-s4-dark.png     # 未登录 → render() → null
```

唯一的 warning 是 `sim.notify`（`sim.*` 不在 `widget.` / `card.` 前缀下，校验器把它归为「非本地键」）——
它与已发布的 `peak-pricing`（同样自带 `sim.peak`）拿到的是同一条 warning，属既有约定的既有噪声。
