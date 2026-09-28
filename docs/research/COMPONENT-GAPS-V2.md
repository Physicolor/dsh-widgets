# dsh-widgets 组件生态缺口调研 v2（2026-09-29）

> 目标：在「展示 agent 工作时需要的信息」这条既有设计逻辑下，把**还缺什么部件**穷举出来，每一条都给数据面证据、必要性与落地代价，然后分批施工。
> 方法：① 读本仓库契约与 **43 个单元**（`src/widgets/*/manifest.json` + `src/client/lib/contract/types.ts`）；② 读 DSH 0.1.5-rc.2 的已发布包（`node_modules/@deepseek-ai/dsh-*`，约 240 个）里**每一个** `SessionProjectionMap` 合并点、以及默认 web profile 的真实组合（`dsh-base/cordis.patch.yml` + `dsh-web-app/cordis.patch.yml` + `D:\dsh-home\profiles\web\package.json`）；③ 在本机实测 host 侧可取的本机数据（见 `HOST-DEVICE-AUDIT.md`）；④ 见 `PROJECTIONS-AUDIT.md` / `EXTERNAL-SOURCES-AUDIT.md`。
> 只保留**有证据**的项。没有证据的一律写进 §7「未能证实」。

---

## 0. 结论表（全部候选）

`✅ 已完成` = 本批（第三批）已开工；`⏳ 计划` = 后续波次；`❌ 否决` = 见 §6。

| # | 部件 id | 名字 | 分组 | 数据面 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | `model-config` | 会话配置 | system | 投影 `modelSelection` + `agentPreset` | ✅ Wave 1 |
| 2 | `goal-progress` | 目标进度 | system | 投影 `goal` | ✅ Wave 1 |
| 3 | `subagent` | 子代理 | system | 投影 `subagentCatalog` + session list 的 `subagentTiming` | ✅ Wave 1 |
| 4 | `guard` | 权限档位 | system | 投影 `permissions` | ✅ Wave 1 |
| 5 | `jobs` | 后台作业 | system | slot hook `useSessions` 的 `jobsBySession` 镜像 | ✅ Wave 1 |
| 6 | `sys-disk` | 磁盘与自检（2×4） | device | `sysinfo.machine`（`fs.statfs` + 会话目录遍历） | ✅ Wave 1 |
| 7 | `window-forecast` | 窗口耗尽预测 | coding-plan | `commandCode.credits.windowLimits` | ✅ Wave 1 |
| 8 | `sys-net` | 网络吞吐 | device | `Win32_PerfRawData_Tcpip_NetworkInterface` 差分 | ⏳ Wave 2 |
| 9 | `sys-power` | 供电与电池 | device | `Win32_Battery` + `powercfg` | ⏳ Wave 2 |
| 10 | `sys-procs` | 占用 Top 进程 | device | `Get-Process` 工作集 Top-N | ⏳ Wave 2 |
| 11 | `sys-services` | 本地服务与代理 | device | TCP 探活 + 绝对 URI 代理出口探针 | ⏳ Wave 2 |
| 12 | `session-cost` | 会话成本 | coding-plan | `$DSH_HOME/storages/usage-center/pricing.json` + 本会话四桶 token | ⏳ Wave 2 |
| 13 | `github-notify` | 待我处理 | github | 既有 `/api/github` 加 `GET /notifications` | ⏳ Wave 2 |
| 14 | `calendar` | 今日日程 | other | ICS 订阅 URL（config）→ host 拉取解析 | ⏳ Wave 3 |
| 15 | `weather` | 天气 | other | Open-Meteo（免 key） | ⏳ Wave 3 |
| 16 | `rss` | 资讯 | other | RSS/Atom URL（config） | ⏳ Wave 3 |
| — | `sys-thermal` | CPU 热区 | device | `Win32_PerfFormattedData_Counters_ThermalZoneInformation` | ⏳ 可选（语义风险，见 §5.3） |

另有 **3 项结构性修复**（不新增部件，但属于"生态缺失"）：§5.1 分组一致性、§5.2 厂商组合并、§5.4 数据源适配器契约。

---

## 1. 现状盘点：43 个单元 / 8 个分组 / 6 类数据面

| 分组 | 单元数 | 数据面 | 已有覆盖 |
| --- | --- | --- | --- |
| `system` | 17 | 会话投影（同步，无 `source`） | 轮次/步数、LLM、工具、TTFT、TPS、缓存、Token、上下文、水位、任务、轨迹×2、会话概览、**+本批 5 张** |
| `commandcode` | 8 | `/api/commandcode-usage` | 账户/用量/额度/窗口/套餐 + 三张单窗口 |
| `github` | 5 | `/api/github` | 提交日历、stars、issue、push、仓库脉搏 |
| `opencode-go` | 5 | `/api/opencode-usage(-multi)` | 三窗口柱/环 + 单窗口卡 |
| `coding-plan` | 4 | 自记账日图 + cc 作用域 | 热度图、柱状图、额度管理、套餐总览（**+本批 1 张**） |
| `pricing` | 2 | 本地时钟 + `holidays.ts` | 峰谷定价 + 峰谷时段表 |
| `device` | **1** | `/api/sysinfo` | 只有 `sys-gpu-line` 一组（**不一致，见 §5.1**） |
| `other` | 1 | 本地 | 寄语 |

**结构性事实**：一句话概括今天的覆盖——**「用了多少」被覆盖得很好，「现在在发生什么」与「接下来会不会出事」几乎空白**。43 张卡里 30+ 张是「累计量 / 额度占比」，回答的是"消耗了多少"；而 agent 的运行形态（跑在什么模型档位、有没有目标在驱动、派了几个子代理、有几个后台作业、被允许做什么）、本机运维风险（盘满、日志膨胀、作业堆积）、以及套餐窗口会不会在重置前打满，**全都看不见**。本批 7 张 + 后续 9 张就是补这三段。

---

## 2. 判定标准（沿用本仓库既有语法，新增卡必须逐条满足）

| # | 标准 | 仓库内既有证据 |
| --- | --- | --- |
| 1 | 一眼可读：2×2 内 ≤3 个数字或 1 条曲线，不需要展开 | `cache` / `tool` / `counts` |
| 2 | 无值时不出现：`render` 返回 `null` 而不是画 0 | `src/widgets/cache/index.ts` |
| 3 | 与当前会话或本机强相关，数据零配置可得 | GitHub 三级凭据阶梯 |
| 4 | 有口径、宁可 `—` 不猜；估算必须标注 | `quota-manage`、usage-center `LocalUsageSummary.estimated` |
| 5 | 骨架 = 内容外形（`manifest.source` + `skeleton`） | `src/widgets-template/README.md:48-59` |
| 6 | 不重复 dsh-usage-center 的深度分析（它是面板，不是瞟一眼） | usage-center 九页 |
| 7 | 同一次点击只做一件事 | `types.ts` 的 `cycle.store` |
| 8 | 不重复既有 43 张卡的信息 | 本仓库 `AGENT-BRIEF.md` §2「重复度」 |

---

## 3. 缺口清单（按数据面分四段）

### 3.1 A 段：会话运行态（投影 / slot hook）——**本批 Wave 1 全部落地**

今天的 `system` 族 17 张卡里，没有一张回答"这个 agent 现在是什么形态"。而 DSH 已经把答案投影出来了，只是没人消费：

| 部件 | 数据面证据 | 必要性 | 代价 |
| --- | --- | --- | --- |
| `model-config` | `dsh-api-session-controller/lib/types/types.d.ts:20-24` 的 `modelSelection`（`ModelSelectionProjection{lastUsed,next}`，`ModelSelection{provider,model,reasoningEffort?}`）；`dsh-agent-presets` 的 `agentPreset: string|null` | 多 provider / 多 preset 下，模型与推理档是解释成本、速度与质量的第一变量；`next` 与 `lastUsed` 不一致时还能提前告诉用户"下一轮会换模型" | 极低（纯投影，采集器已接线） |
| `goal-progress` | `dsh-goal/lib/types/types.d.ts:113` 的 `goal`（`GoalProjection{goal:GoalSnapshot,roundsStarted,createdAt,updatedAt}`，`GoalSnapshot{objective,phase,maxGoalRounds,blockedReason?}`） | 有 goal 的会话会自主继续跑；轮次上限、阶段、被什么卡住是**唯一**的进度真相 | 极低 |
| `subagent` | `dsh-subagent/lib/types/projection-types.d.ts:57-59` 的 `subagentCatalog: SubagentCatalogEntry[]`；**注意**它只有 `{id,createdAt,mode,label?}`，时长要绕道 `useSessions(s=>s.byId[id].projectionValues.subagentTiming)`（官方 `dsh-client-ui-subagent/lib/client.js:106-113` 就是这么绕的） | 多代理是主要的时间与成本来源；官方对 `subagentCatalog` **零消费**（grep 证实），无竞争 | 低（采集器加一次 session list 读取） |
| `guard` | `dsh-permission-presets/lib/types/types.d.ts:32` 的 `permissions`（`PermissionSelect{options,currentValue}`，注释写明它由 `permission/preset` + `sandbox/mode` + `approval/policy` **三个旋钮折成**） | 长跑自主 agent 最该一眼看到的安全事实：它现在能做什么。投影已经折好，卡直接印，不自己推导 | 极低 |
| `jobs` | **不是投影**：客户端 sessions 服务的列表镜像，`useSessions(s=>s.jobsBySession[sessionId])`（官方 `dsh-client-ui-jobs/lib/client.js` 同款），`SessionJob{kind,label,status,startedAt,finishedAt?,detail?}`；`useSessions` 由 `dsh-client-ui-session` 的 `provideRoot({hooks:{sessions}})` 提供给**所有** slot | 长命令是「看起来卡住」的头号原因；且这是本批唯一有**真实 liveness** 的数据源 | 低（采集器加 `useSessions`） |

### 3.2 B 段：设备与自检（host 侧）——Wave 2

本机实测（见 `HOST-DEVICE-AUDIT.md`，全部为 Node `execFile` 实测中位值）：

| 部件 | 数据面证据 | 必要性 | 代价 |
| --- | --- | --- | --- |
| `sys-disk` ✅ | `fs.statfs` 探 26 个盘符 **1.9ms**；`readdir({recursive:true})` 遍历 sessions 目录 **26ms**（339 文件 / 341MiB） | 长跑 harness 最真实的失败是盘满与日志膨胀（storages 体积 71% 是 usage-center 的 27.7MB index），今天完全不可见 | 低（已实现：`src/host/machine.ts` + `sysinfo.machine`） |
| `sys-net` | `Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface` **353ms**（`netstat -e` 只 29ms 但**数值虚高 6 倍**，实测排除；`Get-NetAdapterStatistics` 799ms、`typeperf` 1216ms） | 装依赖 / 拉模型 / 大文件时解释"为什么慢" | 中（PS spawn 地板 270ms，必须 60s TTL + 差分状态） |
| `sys-power` | `Win32_Battery` **369ms**（本机确实是笔记本）；`EstimatedRunTime=71582788`(0x4444444) 是「交流/未知」哨兵**必须置 null**，否则 UI 显示剩 71582788 分钟；电源方案用 `powercfg`(22ms)，`Win32_PowerPlan` **需管理员** | 笔记本长跑：拔电降频甚至休眠 | 低 |
| `sys-procs` | Top 进程 **337ms**（`tasklist` 500ms 更慢）；nvidia-smi compute-apps **48ms**，但 **WDDM 下每进程显存恒为 `[N/A]`**（全量 nvidia-smi 与 pmon 同样）→ 只能印内存 | 多 agent / 多模型并行时回答"谁吃满了内存" | 低 |
| `sys-services` | TCP 探活 **0.2–1.3ms/端口**（`node:net`，跨平台）；实测 3080 DSH web / 11434 Ollama / 10808 xray **通**，**1234 LM Studio 未运行**；代理出口真实判据 = 绝对 URI `GET http://www.gstatic.com/generate_204`，**中位 1311ms**（代理 CONNECT 探针**无用**：xray 对死端口也回 200） | MCP / Ollama / 本地服务慢或崩会让每个请求变慢，今天完全不可见；代理挂了的表现是"一切都很慢" | 中（代理探针 1.3s，必须异步 + stale-while-revalidate） |

**架构结论（已实测）**：全部跑一遍冷 **1569ms** / 热 1314ms，远超现有 sysinfo 的 ~1s 缓存模型 → 必须**分节 TTL + stale-while-revalidate**，并把 battery / procs / net / thermal 四个 PS 调用**合并成一次 spawn**（省 3×270ms 地板）。这是 Wave 2 的前置共享层工作。

### 3.3 C 段：钱 ——Wave 2

| 部件 | 数据面证据 | 必要性 | 代价 |
| --- | --- | --- | --- |
| `session-cost` | `$DSH_HOME/storages/usage-center/pricing.json`（v2 / USD / 12 条规则，含 provider 作用域、峰谷 `peakWindows`、`sourceType: official\|reseller\|local`）**是一个存储目录里的文件**，host 可以直接读，**不需要 usage-center 开访问口**；本会话四桶 token 已在 `usage` | 官方价：flash 缓存命中 0.02 元/M vs 未命中 1 元/M（空闲），**差 50×**；今天没有任何地方把本会话折成钱。纪律：**订阅模式下绝不把 token×单价当账单**——那是 `estimated`，必须标注；价格表拿不到就只印 token、金额列留空 | 中（host 读文件 + 峰谷判定；口径纪律是主要成本） |
| `window-forecast` ✅ | `commandCode.credits.windowLimits.fiveHour/weekly` 的 `{used,cap,resetAt}`（`resetAt` epoch ms） | `quota-manage` 只预测**月**窗口；5h/周窗口"还有 40 分钟重置、但按当前速率 20 分钟就打满"完全看不见——限流是长任务最硬的中断源 | 低（纯计算，零新数据源） |

### 3.4 D 段：外部世界 ——Wave 3（详见 `EXTERNAL-SOURCES-AUDIT.md`）

分层原则：按**授权成本**而非知名度排序。

| 部件 | 授权 | 必要性 | 代价 |
| --- | --- | --- | --- |
| `calendar` 今日日程 | **零授权**：Google/Outlook/飞书/钉钉都能给出私有 ICS 链接（用户填 URL 进配置） | 一张卡覆盖多数日历需求，不碰 OAuth、不存 token；见 §3.1 的 `schedule` 为什么不能用（默认未加载） | 中（host 拉取 + VEVENT/RRULE 展开；时区与全天事件是坑） |
| `weather` 天气 | **零授权**：Open-Meteo 免 key（+ 免 key 的 geocoding） | 长跑时的环境上下文；实现代价最低的外部源 | 低 |
| `rss` 资讯 | **零授权**：任意 RSS/Atom URL（用户填配置） | `other` 组目前只有 1 张卡（寄语） | 低 |
| `github-notify` 待我处理 | 复用既有 GitHub 三级凭据阶梯（credentials → `gh` CLI → 匿名） | 同一 host 模块加 `GET /notifications`（review_requested / mention / assign）；"待我处理"是 GitHub 家族唯一还缺的**待办语义** | 低 |

---

## 4. 施工波次

| 波次 | 内容 | 前置 |
| --- | --- | --- |
| **Wave 1**（进行中） | 7 张卡：`model-config` / `goal-progress` / `subagent` / `guard` / `jobs` / `sys-disk` / `window-forecast` | 共享层已提交：五个投影 + `jobsBySession` + `sysinfo.machine` |
| **Wave 2** | `/api/host/overview`（分节 TTL + SWR + 单次合并 PS spawn）→ `sys-net` / `sys-power` / `sys-procs` / `sys-services`；`session-cost`（pricing.json）；`github-notify` | 共享层：host overview 模块 + bridge 切片 + 价格读取 |
| **Wave 3** | `calendar` / `weather` / `rss` | 共享层：一个通用的「外部 URL 拉取 + 缓存」host 通道（复用 `http.ts`） |

**每个部件的施工方式**：一个独立 git worktree 沙箱 + 一个子代理；子代理必须跑 `validate-widget-unit` + `tsc` + **离线画廊截图并用图像输入真的看图**，迭代后才交付。主 Agent 统一做注册表重建、构建、门禁与官网数据。

---

## 5. 结构性修复（不新增部件）

### 5.1 分组一致性（一行改动 ×5）
实测：`device` 组只有 1 张（`sys-gpu-line`），另外 4 张硬件卡在 `system`。**5 张硬件卡应同组**（建议 `device`），会话/统计留在 `system`。

### 5.2 厂商组合并（计划）
`opencode-go`(5) + `commandcode`(8) + `coding-plan`(4) → **`coding-plan`**，市场规模从 8 组降到 6。理由：分组回答"这是干什么用的"，不回答"哪家厂商"；这三组本来就全是套餐/额度/计费。`pricing`(2) 也归 `coding-plan`（它属于"钱"），`other` 留给生活类。
**分两步**：先只改 `manifest.group`（零风险），再考虑统一卡（provider 进配置）。

### 5.3 明确不做的一项（记录理由，避免反复评估）
- **`sys-thermal`（CPU 热区）**：实测 `Win32_PerfFormattedData_Counters_ThermalZoneInformation` 非管理员可用且随负载变化（345ms，压满 CPU 后 63.7→66.1°C），但它是 **ACPI 热区**不是核心温度，语义不同；加它必须标成 `zones` 并允许空数组。**默认不做**，除非有人明确要"机箱热区"。

### 5.4 数据源适配器契约（长期）
今天的结构性问题仍在：`scripts/gen-registry.mjs:37` 的 `SOURCES` 是**白名单**；`BridgeSnapshot` 是手工字段表；`collector.tsx` 每个 family 一段手写 effect。**新增一个数据源今天要改 3 个共享文件**。建议契约（v1.11）：`src/client/families/<id>/adapter.ts` 声明 `{ id, route, refresh, ttlMs, skeleton, merge(state,payload) }`，生成器像发现单元一样发现适配器。**验收标准**：新增一个数据源只改"一个 family 目录 + 一个 host 模块"。

---

## 6. 已调研并否决的项（附证据）

| 想法 | 否决理由 |
| --- | --- |
| `schedule` 定时提醒卡 | `dsh-schedule` 在默认 web 组合里**没有任何 cordis 行**（`dsh-base`/`dsh-web-app` 依赖与 patch 均无），且 `dsh-web-app/cordis.patch.yml:303-308` 把 `ui-schedule` 标了 `disabled: true`；投影必为 `undefined`。它是最有价值的一张（倒计时），但**当前装不上** |
| 重试 / `llmRetry` 卡 | `llmRetry` 只有 **host-only** 投影（无 `wire`），客户端读不到 |
| 沙箱模式独立卡 | `sandboxMode` 无 `wire`；它已被 `permissions` 折进去，单独做与 `guard` 重复 |
| `compaction` / `toolResultPruner` 卡 | 它们**不是投影**，是 `dsh-tool-cordis` 的 cordis 服务目录条目；压缩信息已由既有的「上下文压缩」卡（从节点 fold）覆盖 |
| 计划模式卡 | `plan` 只有 `{active, pending}` 两个布尔，撑不起 150px |
| 轮次大纲卡 | `turnOutline` 可用且无官方消费，但与既有 `counts`（轮次/步数）和 `trajectory`（对话轨迹）高度重叠 |
| 会话标题 / `sessionListMetadata` 卡 | 官方页头已经常显；`blank`/`lastPromptAt` 没有行动价值 |
| 「需要你介入」警灯 | 用户 2026-09-28 已决策不做：组件只在**已打开**的会话里可见，此时询问本来就在视野内；Web UI 没开时不可见，那属于通知插件的职责 |
| 会话内输入队列（`inbox`） | 投影存在，但"待处理的 steering 消息"在输入框上方已经可见，rail 上重复 |
| 图片限额（`imageLimits`） | 配置常量，不是运行态 |

---

## 7. 未能证实 / 待确认

1. 第三方 **root slot**（非 session 作用域）能否拿到 `useSessions`：`provideRoot` 已证实是 root 提供的，但 slot 的 standard kit 展开在 root 层未被直接验证（session 作用域已确证）。本批 5 张投影卡都在 `conversation.composer.dock`（session 作用域之外）读数据，但**读的是采集器写进 bridge 的值**，采集器本身在 session 作用域内 —— 所以不受影响。
2. `sessions.byId[id].projectionValues.subagentTiming` 在**采集器所在作用域**的实际可读性（官方在 session 作用域读；采集器也在 session 作用域，理论一致，但需实机确认）。已按"读不到就省略该字段"实现。
3. `jobsBySession` 的 key 是否就是 `useSession(s=>s.id)`：若实际字段名不同，`jobs` 卡会返回 `null`（诚实降级），需实机探针确认后再收紧。
4. 价格表新鲜度策略（`verifiedAt` 超期阈值）。
5. `Get-NetAdapterStatistics` 之外是否有更便宜且准确的吞吐源（已实测排除主要候选）。

---

## 8. 证据索引

**本仓库**：`src/client/lib/contract/types.ts`（契约全量）· `scripts/gen-registry.mjs:37`（SOURCES 白名单）· `src/client/data/collector.tsx`（数据接线）· `src/client/data/session-stats.ts`（归一化器）· `src/host/machine.ts`（自检采样器）· `docs/research/WORKER-BRIEF-V2.md` / `BATCH-3-SPECS.md`
**DSH 侧**：`dsh-session-projection/lib/types/index.d.ts`（`wire` ⇒ client-visible）· `dsh-api-session-controller/lib/types/types.d.ts`（`modelSelection` / `SessionJob`）· `dsh-goal` · `dsh-permission-presets` · `dsh-subagent` · `dsh-client-ui-jobs` · `dsh-client-ui-session`（`provideRoot`）
**本机实测**：`docs/research/HOST-DEVICE-AUDIT.md` · `docs/research/PROJECTIONS-AUDIT.md` · `docs/research/EXTERNAL-SOURCES-AUDIT.md`
