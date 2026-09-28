# BATCH-3 SPECS — 第三批部件规格书（Wave 1）

> 主 Agent 产出、Worker 的**唯一输入**。Worker 只按规格实现，不得自行扩大范围。
> 每个 Worker 读：本文件里**属于它的那一节** + `docs/research/WORKER-BRIEF-V2.md` + `src/widgets-template/README.md`。
> 目标形态是 **Minimum Viable Widget（MVW）**：合法进入生态、可继续迭代的第一版。产品表现不足 = REWORK（正常）；系统不合法 = BLOCKED（唯一失败）。

本批 7 个部件的共同点：**全部是「agent 工作时看不见的东西」**——它现在跑在什么模型/档位下、有没有目标在驱动它、有没有子代理和后台作业在跑、它被允许做什么、盘满没满、套餐窗口会不会在重置前打满。既有 44 张卡回答了「用了多少」，这 7 张回答「现在在发生什么」与「接下来会不会出事」。

**共同硬约束**
- 尺寸默认 `2x2`；只有 `sys-disk` 是 `2x4`。
- 大数字一律用 `headAfter.big`，不用 `value`。
- 明细行 ≤3 行；缺读数印 `—` + `tone: 'muted'`。
- 整卡无意义时 `render` 返回 `null`；**自带按钮的卡除外**。
- 所有文案走 `t()`，zh/en 齐全；标题用 `card.<id>.title`。
- `order` 已指定，**不要改**（避免与既有排序冲突）。
- 必须提供 `example.stats`，让卡在没有实时会话时也完整。
- 必须写 `README.md`（九节，见 BRIEF §7）。
- 交付前必须跑 `gallery.mjs` 并**用 `read_image` 看过截图**。

---

## 1. `model-config` — 会话配置（模型 / 推理档 / 预设）

```jsonc
{
  "widgetId": "model-config",
  "order": 82,
  "group": "system",
  "sizes": ["2x2"],
  "name": { "zh": "会话配置", "en": "Session Config" },
  "desc": {
    "zh": "本会话正在用的模型 / 推理档 / Agent 预设；下一轮请求换了路线时会显示出来",
    "en": "The model route, reasoning effort and agent preset this session runs; flags a route change queued for the next request"
  },
  "purpose": "回答「这个 agent 现在到底跑在什么配置下」。多 preset / 多 provider 的环境里，模型与推理档是解释成本、速度与质量的第一个变量，而它在 rail 上完全不可见。"
}
```

**数据**（全部已有，直接用）
- `stats.modelSelection?.next` —— **下一轮请求将使用的路线**（权威：下一个请求真的会用它）。
- `stats.modelSelection?.lastUsed` —— 最近一次请求实际使用的路线。
- `stats.agentPreset` —— 本会话的 agent preset id（字符串，如 `standard`）。

**卡面（2×2，150px）**
```
会话配置                       ← card.model-config.title（蓝标题 13px）
high                           ← headAfter.big：推理档（20px 大数字）
deepseek-v4.1-flash            ← headAfter.small / legend：模型名（灰字）
──────────────────────────────
提供方                commandcode
预设                    standard
下次请求                deepseek-v4-flash   ← 仅当 next ≠ lastUsed 时才有意义
```
- **大数字选什么**：`reasoningEffort`（`off`/`low`/`medium`/`high`/`xhigh`/`max`）。理由：模型名是长字符串、当大字会截断；推理档是短词、且它才是"这一轮有多贵/多慢"的旋钮。模型名放灰字 caption。
- **推理档缺失**（`reasoningEffort === undefined`）：大数字写 `—`，不要写 `default`——「这条路线不发布档位」与「档位就是默认值」是两句话，后者我们也不知道。
- **明细三行**（`breakdown`）：
  1. 提供方 `next.provider`（缺 → `—` muted）
  2. 预设 `agentPreset`（缺 → `—` muted）
  3. **仅当 `next` 与 `lastUsed` 的 `model` 不同**时加第三行「下次请求 → `<next.model>`」，`tone: 'primary'`；相同时**不加这一行**（两行也合法，行数不必凑满）。
- **`modelSelection === null`（投影缺失）**：整卡返回 `null`。

**tone 方向**：`reasoningEffort` 越高不代表坏（不是"越高越红"），所以大数字**不染 danger**。只在"下次请求换路线"那一行用 `primary`（信息性高亮）。

**配置项**：无（第一版不加配置；不要为了加而加）。

**验收**
1. 2×2 渲染完整，标题= `t('card.model-config.title')`；
2. `next` 与 `lastUsed` 模型相同时明细只有 2 行，不同时 3 行且第三行为 `primary`；
3. `reasoningEffort` 缺失时大数字为 `—`（不是 `default`）；
4. `modelSelection` 为 null 时 `render` 返回 `null`；
5. `example.stats` 提供一份"有 preset、有 effort、next≠lastUsed"的样例，使市场预览能展示三行形态；
6. `README.md` + `validate-widget-unit` 0 failure + `tsc --noEmit` 0 error + 截图已看过。

---

## 2. `goal-progress` — 目标进度

```jsonc
{
  "widgetId": "goal-progress",
  "order": 83,
  "group": "system",
  "sizes": ["2x2"],
  "name": { "zh": "目标进度", "en": "Goal Progress" },
  "desc": {
    "zh": "当前目标的轮次进度与阶段（自主长跑时唯一可信的进度真相）",
    "en": "The active goal's round progress and lifecycle phase — the only progress truth an autonomous run has"
  },
  "purpose": "有 goal 的会话会自动继续跑下去。轮次上限、当前阶段、被什么卡住——今天在 rail 上完全看不见，用户只能靠翻对话猜。"
}
```

**数据**：`stats.goal` = `GoalInfo`
```
{ objective, phase: 'active'|'paused'|'blocked'|'complete',
  roundsStarted, maxGoalRounds, createdAt, updatedAt, blockedReason?: {code,message} }
```

**卡面（2×2）**
```
目标进度                       ← card.goal-progress.title
12 / 40                        ← headAfter.big：已用轮次 / 上限
active  ·  3m 前                ← legend：阶段 + 最近一次变更（相对时间）
──────────────────────────────
目标                         把 dsh-widgets 重构…
阶段                        Active
封顶                        40 轮
```
- **大数字 = `roundsStarted / maxGoalRounds`**（如 `12 / 40`）。这两个数一起才叫进度；只印一个都不成立。`maxGoalRounds <= 0` 时只印 `roundsStarted`（不要印 `/ 0`）。
- **灰字 = 阶段 + 最近变更**。阶段词走 `t()`，用 `phase` 的四个取值各一个键（`card.goal-progress.phase.active` 等）。相对时间用 `updatedAt`，并**用 `fmtDuration`**（读 `src/client/lib/format.ts` 确认签名）——或自己写一个小 `ago()`，但必须本地化。
- **明细三行**：
  1. 「目标」→ `objective` 截断（**必须截断到能放进一行**；这是全卡唯一的长文本，截断策略写进 README）
  2. 「阶段」→ 阶段中文/英文词
  3. 「封顶」→ `maxGoalRounds` 轮（`maxGoalRounds<=0` → `—` muted）
- **`phase === 'blocked'`**：阶段那一行用 `tone: 'danger'`，并且**灰字换成为 `blockedReason.message` 的短截断**（这是唯一一次把 legend 让给别的信息——被卡住时"为什么卡住"比"多久前更新"重要）。这条写进 README 与注释。
- **`phase === 'complete'`**：阶段行 `tone: 'success'`。
- **`goal === null`**（本会话没有目标）：整卡返回 `null`。**这是常态**，不是错误——不要用空态卡占位。

**tone 方向**：进度本身不染色（高轮次不代表坏）。只有 `blocked` → danger、`complete` → success。

**配置项**：无。

**验收**
1. `goal === null` → `render` 返回 `null`；
2. 大数字形如 `12 / 40`；`maxGoalRounds<=0` 时只印 `roundsStarted`；
3. `blocked` 时阶段行 danger 且 legend 显示 blockedReason 摘要；
4. `objective` 过长时被截断且不换行、不溢出（截图确认）；
5. `example.stats.goal` 给一份 `blocked` 样例（这样市场预览能看到最复杂的形态）——但**同时**要确认 `example` 存在时卡正常渲染、`render(null)` 分支也被测过（写进 README）；
6. 其余同 §1 的 6 条。

---

## 3. `subagent` — 子代理

```jsonc
{
  "widgetId": "subagent",
  "order": 84,
  "group": "system",
  "sizes": ["2x2"],
  "name": { "zh": "子代理", "en": "Subagents" },
  "desc": {
    "zh": "本会话派生的子代理数量、各自活跃时长与身份标签",
    "en": "How many subagents this session spawned, how long each has been active, and their labels"
  },
  "purpose": "多代理是主要的时间与成本来源，而它在 rail 上完全不可见。官方投影 subagentCatalog 至今没有任何官方消费者。"
}
```

**数据**：`stats.subagents` = `SubagentEntry[]`
```
[{ id, createdAt, mode: 'one-shot'|'continuable', label?, activeMs? }]
```

**卡面（2×2）**
```
子代理                          ← card.subagent.title
3                               ← headAfter.big：子代理总数
active 8m 12s                   ← legend：最久的活跃时长（有 activeMs 的那些里最大）
──────────────────────────────
最久                       8m 12s
类型                  2 continuable
身份                    dsh-widgets 重构     ← 最近一个带 label 的
```
- **大数字 = 子代理总数**（`subagents.length`）。**不要**写"运行中"——`subagentCatalog` 不携带状态，claim「N 个运行中」是编造。（这一条写进注释和 README。）
- **灰字 = 最久活跃时长**：取有 `activeMs` 的最大值，用 `fmtDuration`。全都没有 `activeMs` 时，灰字改为「最早 12m 前创建」（用 `createdAt`），这样卡面永远是诚实的实时信息。
- **明细三行**：
  1. 「最久」→ 最大 `activeMs`（无 → `—` muted）
  2. 「持续型」→ `mode === 'continuable'` 的个数（`t('card.subagent.continuable')` 一行，值形如 `2 / 3`）
  3. 「最近」→ 最后一个有 `label` 的条目的 label（没有 label → `—` muted；**注意 `label` 也可能很长，必须截断**）
- **`subagents === null`**（投影缺失）→ `render` 返回 `null`。**`subagents` 为 `[]`（投影在、但没派过子代理）→ 也返回 `null`**：一张「0 个子代理」的卡没有信息量，会白占一个格子（既有纪律：一眼可读的信息才配占格子）。
- **`createdAt` / `activeMs` 单位为 epoch ms**。

**tone 方向**：不染色（子代理多不等于坏）。「最久」这一行超过 30 分钟时用 `tone: 'warn'`——依据：超过半小时的子代理通常意味着一个卡住或过大的委派；阈值写进注释并由你论证。

**配置项**：无。

**验收**
1. `subagents` 为 null 或 `[]` → `render` 返回 `null`；
2. 大数字是**总数**，卡面任何位置都没有"运行中"字样；
3. 无 `activeMs` 时灰字退化为「最早 … 创建」；
4. label 过长截断、不溢出；
5. 其余同 §1 的 6 条。

---

## 4. `guard` — 权限档位

```jsonc
{
  "widgetId": "guard",
  "order": 85,
  "group": "system",
  "sizes": ["2x2"],
  "name": { "zh": "权限档位", "en": "Permissions" },
  "desc": {
    "zh": "本会话生效的权限档位与它允许做什么（投影已把 preset / 沙箱 / 审批三个旋钮折成一个值）",
    "en": "The effective permission preset and what it allows — the projection already folds preset, sandbox mode and approval policy into this one value"
  },
  "purpose": "长跑自主 agent 最该被一眼看到的安全事实：它现在能写哪里、要不要批准。官方把三个旋钮折成了一个投影值，卡直接印这个折叠结果，不自己重新推导。"
}
```

**数据**：`stats.permissions` = `PermissionInfo`
```
{ currentValue: string, options: [{ value, name, description? }] }
```
- `currentValue` 是 preset 表键（如 `danger-full-access`）或 `custom`。
- `options` 是**可切换**的档位表（含 `custom`，仅当它就是当前值）。

**卡面（2×2）**
```
权限档位                       ← card.guard.title
完全访问                       ← headAfter.big：当前档位的 NAME（不是 value）
4 个可选档位                    ← legend
──────────────────────────────
当前                        完全访问
可选                        4 个
说明            文件与命令均不询问…   ← 当前档位的 description 截断；缺 → —
```
- **大数字 = 当前档位的显示名**。`options` 里找不到 `currentValue` 时（投影里的 `custom` 或表变了），**退回印 `currentValue` 原样**，不要印 `—`——原样值仍是真话。
- **灰字 = `options.length` + 本地化的「个可选档位」**。注意 `custom` 只在它当前生效时才在表里，所以这个数会变；README 要说明。
- **明细三行**：当前（name）/ 可选（个数）/ 说明（当前档位的 `description`，缺失 → `—` muted）。
- **`permissions === null`**（未组合权限服务）→ `render` 返回 `null`。
- **`description` 可能很长**（一整句），必须截断；截断策略写进 README（优先保留前半句 + `…`）。

**tone 方向**：这是本批**唯一**要按危险度染色的卡。依据「权限越大越需要被看见」：
- `currentValue` 含 `danger` / `full` / `yolo` / `bypass`（大小写不敏感）→ `valueTone: 'danger'` + 灰字用 danger 语气（**但不要 `valuePulse`**：常驻闪烁会变成噪音）；
- 含 `read` / `plan` / `safe` → 不染色（或 `success`，由你决定并论证）；
- 其他 → 不染色。
阈值与匹配规则必须写成有名字的常量 + 注释（**不要**硬编码一个正则散在代码里）。这是启发式，README 要明说它是启发式而不是权威。

**配置项**：无。

**验收**
1. `permissions === null` → `render` 返回 `null`；
2. 大数字是 name 而非 value；value 不在 options 里时退回原样 value；
3. danger 族的 value 染 danger，普通档位不染；
4. 长 description 截断、不溢出；
5. 其余同 §1 的 6 条。

---

## 5. `jobs` — 后台作业

```jsonc
{
  "widgetId": "jobs",
  "order": 86,
  "group": "system",
  "sizes": ["2x2"],
  "name": { "zh": "后台作业", "en": "Background Jobs" },
  "desc": {
    "zh": "本会话的后台作业：几个在跑、最久跑了多久、最近一个是什么",
    "en": "This session's background jobs: how many are running, the longest one, and what the newest is"
  },
  "purpose": "长命令是「看起来卡住」的头号原因。数据来自客户端 sessions 服务的 jobsBySession 列表镜像（官方 jobs 弹层读的同一份），不发 RPC。"
}
```

**数据**：`stats.jobs` = `JobInfo[]`
```
[{ id, kind, label, status: 'running'|'stopping'|'completed'|'killed'|'failed',
   startedAt, finishedAt?, detail? }]
```
- `startedAt` / `finishedAt` = epoch ms（`finishedAt` 缺失 = 仍在跑）。
- 这是**唯一**有真实 liveness 的本批数据源。

**卡面（2×2）**
```
后台作业                       ← card.jobs.title
2                              ← headAfter.big：运行中数量
最久 12m 04s  ·  共 5 个        ← legend
──────────────────────────────
最久                    Bash  12m 04s
最近                    npm test
失败                            0
```
- **大数字 = `status === 'running' || status === 'stopping'` 的条数**。（`stopping` 仍占用资源，算"在跑"。）
- **灰字 = 最久运行时长 + 总数**。时长 = `now - startedAt`；`now` 用 `Date.now()`（**允许读时钟，注释里写明**）。
- **明细三行**：
  1. 「最久」→ 最久那条的 `label`（截断）+ 时长
  2. 「最近」→ 按 `startedAt` 最新的一条的 `label`（截断）
  3. 「失败」→ `status === 'failed'` 的条数；>0 时 `tone: 'danger'`，否则 `muted`
- **全跑完（无 running）但有历史**：大数字写 `0`，灰字改为「最近 N 个已完成」——**卡仍然渲染**，因为"后台作业全清了"本身是有用的确认。这一点与 `subagent` 的取舍不同，README 要说清为什么。
- **`jobs === null`**（列表不可用）→ `render` 返回 `null`。
- 卡面**不可点击**（不占用 `cycle`，那是用量族的池视图）。

**tone 方向**：运行中数量**不按大小染色**（并行 3 个不等于坏）。只有「失败」行 >0 时 danger。

**配置项**：无。

**验收**
1. `jobs === null` → `render` 返回 `null`；`[]` → 渲染 `0` + 已完成灰字（**不是 null**）；
2. 大数字只数 running/stopping；
3. 失败数 >0 时该行 danger；
4. label 截断、不溢出；
5. 其余同 §1 的 6 条。

---

## 6. `sys-disk` — 磁盘与自检（2×4）

```jsonc
{
  "widgetId": "sys-disk",
  "order": 87,
  "group": "device",
  "sizes": ["2x4"],
  "source": "sys",
  "skeleton": { "shape": "figures", "count": 4 },
  "name": { "zh": "磁盘与自检", "en": "Disk & Self-check" },
  "desc": {
    "zh": "各盘剩余空间、DSH 会话日志的体积与增速、web 进程自身的占用——长跑 harness 最真实的运维风险",
    "en": "Free space per drive, the DSH session-log footprint and its growth, and the web process's own usage — the operational risks a long-running harness actually hits"
  },
  "purpose": "长跑最真实的失败是盘满与日志膨胀，而今天没有任何地方能看见。本机实测：C 剩 67GB / D 剩 63GB，sessions 339 文件 / 341MB。"
}
```

**数据**：`stats.sysinfo?.machine`（`MachineInfo`）
```
{ ts, disks: [{ mount: 'C:', total, free }],
  home: { sessionsFiles, sessionsBytes, recentFiles } | null,
  proc: { pid, rss, cpuPercent: number|null, uptimeSec } }
```
- 单位：`total` / `free` / `sessionsBytes` / `rss` 都是**字节**。格式化用 `fmtTokens` 的 K/M 逻辑或自己写 `fmtBytes`（**注意 `fmtTokens` 是给 token 用的，确认它输出的是 `18.7M` 这种通用量级再复用**；不确定就在自己目录里写一个 `fmtBytes` 并在注释里说明为什么不能用 `fmtTokens`）。
- 只有 2 个盘（C:/D:）时也要好看：**2×4 的宽度要利用起来**，不要只画两根柱子。

**卡面（2×4 = 306×150 内容区）**
```
磁盘与自检                                    ← card.sys-disk.title
63.0G 可用                    ← headAfter.big：最紧张那张盘的剩余
C: 剩 22%  ·  D: 剩 10%        ← legend
──────────────────────────────────────────────────────────
C:   ████████████░░░░  67.0G / 300G
D:   ██████████████████░  63.0G / 652G
会话日志  339 文件 · 341M · 近 1 小时 12 个       ← 第三行（合并信息，右侧数值）
web 进程  546M RSS · 2.1% CPU · 3h54m
```
- **大数字 = 剩余空间最少的那个盘的可用量**（"最紧张"才值得当大字）。你也可以选"占用率最高的盘"——**二选一并把理由写进 README**。
- **`chart.kind` 用什么**：
  - 两个盘的剩余占比 —— 用 **`bars`**（`BarDatum[]`，`label` = 盘符，`value` = 剩余 GB，`ratio` = free/total，`tone`：free/total < 10% → `danger`、< 20% → `warn`、否则 `primary`）。
  - **不要用 `rings`**：2×4 上两个环会各占一半宽度、把"哪个盘更紧张"的对比丢掉。（写进 README。）
  - 会话日志与 web 进程两行 —— 用 **`figures` 的第二行**？不：`bars` 与 `figures` 不能在同一个 chart 上。**方案**：`bars` 承载两个盘；会话日志 / web 进程写进 `sub`（或 `legend`）——但 `sub` 只有一行。
  - **推荐版式（照这个做）**：`headAfter.big` + `legend` + `chart: { kind: 'bars', bars: [两个盘] }` + `sub` 一行放「会话日志 339 文件 · 341M · 近 1 小时 +12」。2×4 的 `sub` 一行足够宽。
- **`machine` 缺失 / `disks` 为空**（`sysinfo` 还没到）：返回 `{ title, skeleton: true, skeletonShape: 'figures', skeletonCount: 4 }`？**不要**——加载骨架是**壳**的职责（见 contract 里 `skeleton` 的注释：widget 分不清"还在飞"与"答了但为空"）。你只要：`sysinfo` 为 null 或 `machine` 缺失时返回 `null`；`disks` 存在但为空 → 返回 `null`。
- **`home === null`**（会话目录读不到）：`sub` 里省掉会话日志那段，只印 web 进程（**不要**印 `—` 的文件数，那会读成"0 个文件"）。
- **磁盘告警**：最紧张那张盘 `free/total < 0.10` 时给 `valueTone: 'danger'`；`< 0.20` → 不染（或你自己定，写进 README + 注释）。

**tone 方向**：**剩余越少越危险**（与 sys-cpu 那类"越高越忙越红"同向但对象相反）。阈值写成有名字的常量，并在注释里写依据（为什么 10% 是红线：Windows 在系统盘低于 ~10% 时会明显降速并开始拒绝更新）。

**`manifest.source`**：`"sys"`（**必须写**，它等异步源），`skeleton` 用 `{ "shape": "figures", "count": 4 }`（骨架 = 卡的外形：4 个块）。**注意**：`sizes` 与 `index.ts` 里的 `sizes` 必须一致（生成器会校验），都是 `["2x4"]`。

**验收**
1. `sysinfo` / `machine` 缺失 → `null`；
2. 两个盘都出现，`bars` 的 `ratio` 与 `value` 一致（`ratio` 用剩余/总量，注释说明是"剩余"不是"占用"）；
3. 盘 <10% 时 danger 色 + `valueTone: 'danger'`（用一个 `example.stats` 的极低剩余样例证明）；
4. `home === null` 时不出现伪造的文件数；
5. 2×4 版式不浪费宽度（截图确认）；
6. `manifest.sizes` === `index.ts` 的 `sizes` === `["2x4"]`；
7. 其余同 §1 的 6 条。

---

## 7. `window-forecast` — 窗口耗尽预测

```jsonc
{
  "widgetId": "window-forecast",
  "order": 88,
  "group": "coding-plan",
  "sizes": ["2x2"],
  "source": "cc",
  "skeleton": { "shape": "quotas" },
  "name": { "zh": "窗口预测", "en": "Window Forecast" },
  "desc": {
    "zh": "按当前速率，5 小时 / 周额度窗口会不会在重置前打满（额度管理只管月窗口）",
    "en": "At the current pace, will the 5h / weekly quota window hit its cap before it resets? (Quota Manager only covers the monthly window)"
  },
  "purpose": "限流是长任务最硬的中断源。既有 quota-manage 只预测月窗口，5h/周窗口的"还有 40 分钟重置，但按当前速率 20 分钟后就打满"完全看不见。"
}
```

**数据**：`stats.commandCode?.credits?.windowLimits`
```
{ limited?, exceeded?, fiveHour?: { used?, cap?, exceeded?, resetAt?(epoch ms) }, weekly?: {...} }
```
（也读 `stats.commandCodeError` 做降级文案。**不要**在这里读 `usageData`——那是 OpenCode 口径，混进来就变成混合口径的假精确。）
- `resetAt` 是 **epoch ms**；`used` / `cap` 是额度单位（credits），不是 token。

**算法（你来实现，必须写在你自己目录里的纯函数 + 单测式注释）**
```
window: used, cap, resetAt
now
remaining = cap - used
elapsed   = ??? —— 窗口的自然起点 = resetAt - windowLength
                 （5h = 5*3600e3；weekly = 7*24*3600e3）
rate      = used / max(1, now - (resetAt - windowLength))      // 每 ms 消耗
projected = used + rate * (resetAt - now)                      // 重置时的预计用量
ratio     = projected / cap
```
- **`elapsed <= 0`（窗口刚开始，或时钟/时区给出负值）→ 不预测**，该窗口印 `—` muted。**绝不**用"从会话开始算"之类的替代口径。
- `cap <= 0` 或 `used`/`cap` 缺失 → 该窗口印 `—` muted。

**卡面（2×2）**
```
窗口预测                       ← card.window-forecast.title
118%                           ← headAfter.big：最危险窗口的预计占用（重置时）
5h · 预计 40m 后打满            ← legend：哪个窗口 + 距离打满的时间
──────────────────────────────
5h                        118% 预计
周                          46% 预计
剩余重置时间              2h 11m
```
- **大数字 = 两个窗口里 `projected/cap` 最大的那个的百分比**（取整）。**`ratio > 1` 时用 `valueTone: 'danger'`**（会打满）；`> 0.9` → `warn`；否则不染。
- **灰字 = 该窗口名 + 状态**：`ratio > 1` 时写「预计 X 后打满」（X = 按 rate 达到 cap 所需时间 = `(cap-used)/rate`）；否则写「重置前不会打满」+ 重置倒计时。
- **明细三行**：
  1. 「5h」→ `118% 预计`（`tone` 按上面规则；不可预测 → `—` muted）
  2. 「周」→ `46% 预计`（同上）
  3. 「剩余重置」→ 两个窗口里**更近**的那个 resetAt 的倒计时（用 `fmtDuration`）
- **两个窗口都不可预测** → `render` 返回 `null`。
- **`commandCode === null` 且 `commandCodeError !== null`** → 返回 `null`（不要印"未配置"——那是 cc-whoami/额度管理那些卡的职责，这里重复没有增量）。README 说明这条去重理由。

**tone 方向**：占比类，但方向与命中率相反——**越大越坏**（越可能被限流）→ `danger`/`warn`。阈值 0.9 / 1.0 的依据写进注释（为什么要留 10% 余量：预测是线性外推，突发一轮就能吃掉余量）。

**配置项**：无（第一版）。

**验收**
1. 两个窗口都不可预测 → `null`；
2. `elapsed <= 0` 的窗口印 `—` muted，且不影响另一个窗口的预测；
3. `ratio > 1` 时大数字 danger + 灰字给"预计 X 后打满"；
4. 倒计时与"打满时间"都用 `fmtDuration`，单位一致；
5. **算法必须是纯函数**，并在 `index.ts` 注释里给出一个手算例子（用具体数字算一遍，让下一个人能核对）；
6. `example.stats` 必须提供一个**会打满**的样例（这是这张卡存在的理由，市场预览要能看见它）；
7. 其余同 §1 的 6 条。

---

## 附：本批不做（已调研并否决，不要顺手做）

| 想法 | 否决理由（证据） |
| --- | --- |
| `schedule` 定时提醒卡 | `dsh-schedule` 在默认 web 组合里**没有任何 cordis 行**，且 `ui-schedule` 被 `disabled: true`；投影必为 undefined |
| 重试 / `llmRetry` 卡 | `llmRetry` 只有 host-only 投影（无 wire），客户端读不到 |
| 沙箱模式独立卡 | `sandboxMode` 无 wire；它已被 `permissions` 折进去，单独做会与 `guard` 重复 |
| 计划模式卡 | `plan` 只有 `{active, pending}` 两个布尔，撑不起一张 150px 卡 |
| 轮次大纲卡 | 与既有 `counts`（轮次/步数）与 `trajectory`（对话轨迹）高度重叠 |
| 会话标题卡 | 官方页头已经常显 |
