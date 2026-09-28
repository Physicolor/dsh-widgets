# 第三批交付报告 —— 组件生态补全（2026-09-29）

> 本文是车主要的那份清单：**做了哪些组件、新建了哪些类、是否守住既有规范、每个组件的用途与摆放理由**。
> 全部代码在 `D:\dsh-home\plugins\dsh-widgets`，提交链见 §7。调研证据见 `COMPONENT-GAPS-V2.md` / `PROJECTIONS-AUDIT.md` / `HOST-DEVICE-AUDIT.md` / `EXTERNAL-SOURCES-AUDIT.md`。

---

## 1. 交付总量

| | 开工前 | 现在 |
| --- | --- | --- |
| 部件单元（`src/widgets/*/manifest.json`） | 43 | **55**（+12） |
| 市场分组 | 8 | 8（分组归并见 §6.3，未做） |
| 离线渲染输出（G4 快照） | 194 | **242**（+48） |
| 画廊单元格 / PNG | 无（画廊是这批新建的） | **101** |
| host 路由（G7 案例） | 14 | **17** |

**结论一句话**：既有 43 张卡回答「用了多少」；这一批 12 张补的是**「现在在发生什么」**（会话形态：模型档位 / 目标 / 子代理 / 权限 / 后台作业 / 窗口预测）与**「这台机器还撑得住吗」**（磁盘自检 / 网络 / 供电 / 内存大户 / 本地服务与代理 / 会话成本 / GitHub 待办）。

---

## 2. 12 个新组件（用途 · 数据 · 摆放理由）

### 2.1 会话运行态（6）

| 组件 | 一句话用途 | 数据面 | 卡面结构 |
| --- | --- | --- | --- |
| **`model-config` 会话配置** | 这个 agent 现在跑在哪条模型路线上 | 投影 `modelSelection` + `agentPreset` | 大数字=推理档 / 灰字=模型名 / 行=提供方·预设·(下次换模型) |
| **`goal-progress` 目标进度** | 持久目标跑到第几轮、什么阶段、被什么卡住 | 投影 `goal` | 大数字=`12 / 40` / 灰字=阶段·多久前（blocked 时换成阻塞原因）/ 行=目标·阶段 |
| **`subagent` 子代理** | 派了几个子代理、谁活跃最久、最近是谁 | 投影 `subagentCatalog` + session list 的 `subagentTiming` | 大数字=总数 / 灰字=最久活跃时长 / 行=持续型·最近 |
| **`guard` 权限档位** | 这个会话被允许做什么（preset/沙箱/审批的折叠值） | 投影 `permissions` | 大数字=档位名（危险族染红）/ 灰字=可选档位数 / 行=当前·说明 |
| **`jobs` 后台作业** | 有几个在跑、最久多久、最近是什么、有没有失败 | `useSessions` 的 `jobsBySession` 镜像 | 大数字=running+stopping 数 / 灰字=最久时长+总数 / 行=最久·最近·失败 |
| **`window-forecast` 窗口预测** | 5h/周额度窗口会不会在重置前打满 | `commandCode.credits.windowLimits` | 大数字=较危险窗口的重置时占用 / 灰字=哪个窗口+判定 / 行=5h·周·剩余重置 |

**摆放理由（共同骨架）**：仓库唯一允许的头部阶梯是「蓝色 13px 标题 → 20px 大数字 → 10px 灰字」，明细用 `breakdown` 贴底（`bodyAnchor:'bottom'`）。150px 的实测预算：`pad 12 + 头 59 + 三行 51 + pad 12 = 134/150`，第四行会爆格 —— 所以**没有一张卡超过三行明细**。
每张卡的具体取舍在其 `README.md` 的 §4：例如 `subagent` 的身份标签必须进**左标签轨**（进数值轨会把标签列压成 0px、三行标签全部消失 —— 实测）、`goal-progress` 的大数字必须是**一对数**（只印 `12` 不叫进度）、`guard` 打印投影给的 `name` 而在 `name === key` 时套用官方 `PRESET_LABEL_KEYS` 的同一个词。

### 2.2 设备与自检（5）

| 组件 | 一句话用途 | 数据面 | 卡面结构 |
| --- | --- | --- | --- |
| **`sys-disk` 磁盘与自检（2×4）** | 各盘剩余、会话日志体积与增速、web 进程自身 | `sysinfo.machine` | 大数字=最紧张那张盘的可用量（带盘符）/ 两行灰字=各盘剩余%·会话日志 / 两条 bars + 标签 |
| **`sys-net` 网络吞吐** | 装依赖/拉模型时「为什么慢」 | `host.net` | 大数字=下行合计 / 灰字=上行合计+网卡数 / 行=每张网卡的下行（≤3） |
| **`sys-power` 供电** | 插电还是用电池、还能撑多久 | `host.power` | 大数字=电量% / 灰字=来源·电源方案 / 行=供电·剩余·方案 |
| **`sys-procs` 内存大户** | 多 agent 并行时谁把内存吃满了 | `host.procs` | 大数字=第 1 名工作集 / 灰字=第 1 名进程名 / 行=第 2/3/4 名 |
| **`sys-services` 本地服务与代理** | 本地端口存活 + 代理出口是否真能出网 | `host.services` + `host.proxy` | 大数字=在听的服务数/总数 / 灰字=代理出口状态 / 行=前三个服务 |

**摆放理由**：这一族全部 `source: "sys"`，所以骨架由壳负责（`skeleton.shape` 必须长得像卡本身：磁盘 `figures`、网络 `text`、进程 `bars`、服务 `quotas`）。三处刻意的反直觉设计：**`sys-procs` 的明细不重复第一名**（第 1 名已是大数字+灰字）；**`sys-net` 的明细是"每张网卡"而不是"下行/上行"**（后者会与大数字和灰字各重复一次 —— 集成时改掉的）；**`sys-power` 在插电时「剩余」印 `—`**（插电本就没有剩余时间，这是正确空态而非缺失）。

### 2.3 钱与外部（1）

| 组件 | 一句话用途 | 数据面 | 卡面结构 |
| --- | --- | --- | --- |
| **`session-cost` 会话成本** | 把本会话四桶 token 按价格表折成钱，**并说出这个金额用的是哪张表** | `usage` + `modelSelection` + `/api/widgets-pricing` | 大数字=金额（拿不到规则时=token 总量）/ 灰字=`官方价/中转价/免费路由 · 模型` / 行=未命中·缓存命中·输出（各带金额） |

**摆放理由**：`≈` 前缀 + `cardHint` 说明「按当前费率折整段，usage 没有逐请求时间戳」；**拿不到价格规则时金额列整列消失**（不是 `—`、不是 `$0.00`）—— 这是本卡的三条不可让步纪律之一（另两条：金额永远带出处；绝不混合口径）。

---

## 3. 新建的类 / 接口 / 模块（`git grep` 可核对）

### 3.1 契约层（`src/client/lib/contract/types.ts`，共享稳定层）

| 名字 | 作用 |
| --- | --- |
| `MachineInfo` | `/api/sysinfo` 的自检切片：磁盘、DSH home 体积、host 进程自身 |
| `HostOverview` · `HostServiceProbe` · `HostProxyHealth` · `HostPower` · `HostProcess` · `HostNetAdapter` | `/api/host/overview` 的六段契约 |
| `PriceRule` · `PriceTable` | usage-center 价格表的只读投影（含 `sourceType` 出处与 `peakRates`） |
| `GitHubNotifications` | `/notifications` 切片（含 `capped`：整页 = 「≥30」而不是 30） |
| `ModelRoute` · `ModelSelectionInfo` · `GoalInfo` · `PermissionInfo` · `SubagentEntry` · `JobInfo` | 五个新投影 + 后台作业镜像的**归一化后**形状 |
| `valueTone` 扩为 `'danger' \| 'warn' \| 'muted'` | 三档语气：已经坏了 / 正朝那走 / 没有读数 |

### 3.2 客户端

| 名字 | 位置 | 作用 |
| --- | --- | --- |
| `normalizeModelSelection` / `normalizeGoal` / `normalizePermissions` / `normalizeSubagents` / `normalizeJobs` | `src/client/data/session-stats.ts` | **纯函数**归一化器：未知成员一律丢弃，绝不透传（一个抛错的 selector 会让整个 slot 退位、所有卡的数据一起消失） |
| `CardGallery` · `GalleryOptions` | `src/client/render/preview/gallery.tsx` | 离线画廊的 React 组件（真 `CardBody` + 真 token） |
| `valueColor` | `src/client/render/CardBody.tsx` | `valueTone` → 颜色的唯一映射 |

### 3.3 host 侧

| 名字 | 位置 | 作用 |
| --- | --- | --- |
| `createMachineSampler` | `src/host/machine.ts` | 磁盘（26 个盘符 `fs.statfs` 实测 1.9ms）+ 会话日志遍历（26ms，60s TTL）+ 本进程 RSS/CPU/uptime |
| `createOverviewSampler` · `createPsSession`→`readSnapshot` | `src/host/overview.ts` | 分节 TTL + stale-while-revalidate；TCP 探活（0.2–1.3ms/端口）；合并 PowerShell 快照（写成 `.ps1` 用 `-File` 跑 **450ms**，多行 `-Command` 是 **5.9s**）；代理出口用**绝对 URI GET** |
| `registerHostOverview` / `registerWidgetsPricing` | 同上 / `src/host/pricing.ts` | 两条新路由；pricing **没有内置兜底表** |
| `HostNotifications` + `fetchNotifications` + `notificationsHtmlUrl` | `src/host/github.ts` | `/api/github?notif=1`：ETag 感知（304 不扣配额）、匿名 401 → 切片缺席而不谎报 0 |

### 3.4 工具栏与脚本

| 名字 | 作用 |
| --- | --- |
| `scripts/preview/gallery.mjs` + `tsdown.gallery.config.ts` | 一条命令：gen-registry → 打包渲染闭包 → 生成 `.tmp-gallery/index.html` → 每格截图 |
| `scripts/preview/dump-theme-tokens.cjs` | 从活页面 dump 369 个主题 token（**别名 token 在 `body` 上，不在 `:root`**） |
| `docs/probe-batch3-live.cjs` | 活体验收：用 `addInitScript` 只在自己浏览器上下文 seed 布局，**绝不写 host 状态文件** |

---

## 4. 规范符合性（逐条对照，全部可复跑）

| 规范 | 状态 | 证据 |
| --- | --- | --- |
| 三处 id 一致（目录 = manifest.id = index.ts 字面量） | ✅ 55/55 | `validate-widget-unit` 0 failure |
| `manifest.sizes` === 描述符 `sizes` | ✅ | `gen-registry --check` OK（生成器会红） |
| locale zh/en 覆盖全部本地 `t()` 键 | ✅ | 每单元 `✅ locale.zh/en covers N key(s)`；市场名/描述双全 |
| 卡片标题用独立键 `card.<id>.title` | ✅ | 12/12（BRIEF §2 硬规则） |
| 大数字走 `headAfter.big`（不用 `value`） | ✅ | 12/12，注释里写明原因（`value` 会被推进正文重复一次） |
| 明细 ≤3 行 + 缺读数 `—` muted 不消失 | ✅ | 12/12；`jobs`/`sys-power` 的 0 与 `—` 语义分开 |
| `source`/`skeleton` 只在真有异步源时声明 | ✅ | 5 张设备卡 + 窗口预测 + 会话成本 + GitHub 待办；会话投影卡不声明 |
| 骨架形状 = 卡的内容外形 | ✅ | 集成时把 `sys-net` 的 `line` 改成 `text`（卡面是文本头+三行，不是曲线） |
| 纯函数 render（无副作用/不读 DOM/不发请求） | ✅ | 只有 `Date.now()`（已在注释写明）；派生计算全在部件自己目录 |
| `example.stats` 让无会话时也完整 | ✅ | 12/12；多态卡用 `sim`/`simSteps`/`simToggle`，且 `sim === simSteps[0]` |
| 视觉验收（真浏览器 + 逐张看图） | ✅ | 101 张画廊 PNG + 每单元浅/深双主题；worker 报告里都有「看图发现问题→改」的一轮 |
| host 生命周期可逆（`ctx.effect` disposer） | ✅ | 两条新路由都返回 disposer；PowerShell 快照用 `execFile` + 超时，不留常驻子进程 |
| 不给共享层加「只为一张卡」的东西 | ✅ | 三个共享层缺口（`valueTone` 档位、`legend` 无 tone、`breakdown` 的 value 列无溢出守护）**由主 Agent 统一裁决**，两个已补、一个记为已知限制 |

**闸门**：G1 注册表 ✅｜G2 单元校验 55/0 ✅｜G3 tsc 基线 0 错 ✅｜G4 渲染快照 242 条 ✅｜G5 CSS 字节不变 ✅｜G7 17 条 host 路由案例 ✅｜`verify-preview-merge` 15/15 ✅｜官网 `verify.mjs` **80/80** ✅

---

## 5. 活体验收（真轨道）

`node docs/probe-batch3-live.cjs`（非侵入式：只在自己的浏览器上下文 seed 布局，不写 host 状态文件）—— 12 张新卡里 **6 张当场出真数据**：

| 卡 | 活体读数（2026-09-29 实测） |
| --- | --- |
| `model-config` | `high` / `deepseek/deepseek-v4.1-flash` / 提供方 `commandcode` / 预设 `standard` |
| `subagent` | `16`（大数字 amber，因为最久活跃 49m11s > 30m）/ 持续型 `16 / 16` / 最近 `Build session-cost widget` |
| `guard` | `完全权限`（红）/ `3 个可选档位` / 当前 `完全权限` / 说明 `—` |
| `jobs` | `0` / `已结束 0 个` / 三行 `— — 0` |
| `window-forecast` | `86%` / `周 · 不会打满 · 2d18h` / `5h 60%` `周 86%` `剩余重置 4h16m` |
| `session-cost` | `123M` / `无价格表 · 仅 token`（token-only 形态，见下） |

**另外 6 张**（`goal-progress` 与会话无关的 5 张）在**本次会话里正确地没有出现**，原因分别是：`goal-progress` = 本会话没有目标（设计即返回 `null`）；`sys-disk` / `sys-net` / `sys-power` / `sys-procs` / `github-notify` / `session-cost` 的金额列 = **它们等的 host 路由要等 `dsh web` 重启才加载**（新 host 路由只在启动时注册，客户端半是刷新页面即生效）。

这六条不靠"应该没问题"交付，而是**单独跑过 host 模块本体**：

```
/api/widgets-pricing → 200 available=true v2 12 条规则 currency=USD
  providers: deepseek, opencode-go, commandcode, ollama, opencode
  deepseek-official-v4.1-flash: {hit 0.003, miss 0.15, out 0.6} peak ×2（官方价）
/api/host/overview → 200 keys=ts,net,power,procs,services,proxy
  services: dsh:3ms ollama:2ms lmstudio:down proxy:2ms
  proxy: {tcpMs:2, egressMs:797, ok:true}     ← 出口真判据（CONNECT 探针对死域名也回 200）
  power: 100%（插电，Win32 哨兵 71582788 已被折成 minutesLeft:null）
  procs: 8 条
  net: 首对样本 2.5s 后即出（比 TTL 快 8 倍）
```
**因此**：重启 `dsh web` 之后这 5 张设备卡与会话成本的金额列即生效；刷新页面后 6 张会话卡立即生效。这是本插件所有 host 路由一贯的加载语义（既有 `sys-*`、`cc-*`、`github-*` 同样如此），不是本批引入的缺陷。

---

## 6. 未做 / 已否决（附证据，避免下一个人重复调研）

### 6.1 已枚举但本批未施工（3）
`calendar` 今日日程（ICS 订阅）、`weather` 天气（Open-Meteo）、`rss` 资讯 —— 四个源的可行性已实测通过（见 `EXTERNAL-SOURCES-AUDIT.md`：ICS 4/4 端点通、Open-Meteo 974B/1379ms、RSS 5/5 feed 通过、零依赖 CONNECT 隧道 28 行实测可用），**做它们的前置是一个通用「外部 URL 拉取 + 缓存 + SSRF 白名单」host 通道**（报告 §2.3 给了硬约束：拒 `file:`/私网、限重定向与体积、**绝不把 GITHUB_TOKEN 附到 ICS/RSS 请求上**）。这是明确留给下一批的第一件事。

### 6.2 明确不做（证据在案）
`schedule` 定时提醒（默认组合里**没有** `dsh-schedule` 行且 `ui-schedule` 被 disable）｜`llmRetry` / `sandboxMode` 独立卡（host-only 投影，客户端读不到；沙箱已折进 `permissions`）｜`plan` 卡（只有 `{active, pending}` 两个布尔）｜轮次大纲（与 `counts`/`trajectory` 重叠）｜「需要你介入」警灯（车主 2026-09-28 已决策：属于通知插件）｜进程显存（WDDM 下 `nvidia-smi --query-compute-apps` 恒为 `[N/A]`）。

### 6.3 结构性修复（未做，一件）
`device` 组仍只有 1 张（`sys-gpu-line`），本批 5 张设备卡进了 `device`，但 `sys-cpu/gpu/rings/board` 仍在 `system`；厂商三组（`commandcode` / `opencode-go` / `coding-plan`）未归并。这是**纯 manifest 字段的机械改动**，风险为零但不该混在功能批次里 —— 建议单独一个提交做。

### 6.4 三个共享层缺口（两个已补，一个记为限制）
1. ✅ **已补** `valueTone: 'warn' | 'muted'`（此前只有 `danger`；`warn` 让 0.9–1.0 的窗口大数字变琥珀、`muted` 让"只有一个 `—`"的大数字不再像打码黑条）。
2. ⚠️ **未补（记录）** `legend`（灰字）颜色被渲染器硬编码为 `label-tertiary`，契约里没有 tone 通道 —— 想让灰字也变红只能把红色落到明细行（`guard` 就是这么做的）。真要补是一个 `legendTone` 字段。
3. ⚠️ **未补（记录）** `breakdown` 的 **value 列没有溢出守护**（只有 label 列有右缘淡出）。两个 worker 都实测踩到：把长文本（48 字身份、长 model id）放进 value 列会把 label 列压到 0px，三行标签全部消失。建议给 value 单元加 `maxWidth`/省略号收缩；在那之前，长文本必须放 label 列。

### 6.5 共享格式化器的一处已知不一致
`fmtDuration` 只有 m/s 档（`2h14m` 会印成 `134m0s`）。本批两个部件各自在本地绕开（`window-forecast` 自持 `fmtSpan`、`sys-power` 照规格用 `fmtDuration`），**因此同屏可能看到两种时长写法**。统一它要动共享层并重刷 G4 基线，影响既有已发布卡的输出，建议单独排期。

---

## 7. 提交链

```
cf40933 docs(research): 第三批 worker 简报 + 规格 + 两份数据审计
184b2d1 feat(host): /api/host/overview — 吞吐/供电/进程/服务/代理
a75d585 feat(host): usage-center 价格表通道；valueTone 增加 warn 档
38c42ce docs(research): wave-2 规格（价格与通知对着已上线的通道写实）
98e82ba test(host-routes): G7 覆盖 overview 与 notif=1
79063f2 feat(widgets): wave 1 —— 7 张卡                       ← 43 → 50
98a2a38 docs(preview): 50 卡画廊 + wave-1 活体验收
fc6eb61 fix(host): 吞吐首对样本 2.5s 落地；通知报告整页
0c41433 test(host-routes): G7 覆盖价格通道
cd50a73 feat(widgets): wave 2 —— 设备族 + 会话成本 + 待我处理   ← 50 → 55
```

**未推送**（本地 `main` 领先 `origin/main`；发布流程见记忆里那条铁律：只推 `v*` tag，绝不本地 `npm publish`）。
