# dsh-widgets 扩展地图（2026-09-28 调研 · 含车仔面大王 2026-09-28 决策）

> 目标：在「展示 agent 工作时需要的信息」这条既有设计逻辑下，找出还值得做的部件，并给出理由、必要性与落地代价。
> 方法：读本仓库契约与 39 个单元 + 读 DSH 0.1.5 已发布包（`node_modules/@deepseek-ai/dsh-*`）与 `dsh-usage-center` 的真实数据面/价格面，只保留有证据的项。

---

## 0. 结论（已并入用户决策）

- **钱**：要做，但必须分成 **订阅套餐** 与 **按量付费** 两种口径；价格表的唯一权威是 **dsh-usage-center 的 `pricing.json`**，widgets 只消费、不另建表。
- **缓存节省**：按用户给的版式做（标题 + 总量 → 分隔线 → 命中率 / 未缓存输入 / 缓存读取 / 输出 四行，行尾带单价金额）。需要一个新的渲染原语（§3.2）。
- **介入警灯**：**不做**（理由见 §4.0，已记录，不再重复评估）。
- **工具面板**：改成对**整个 system 族的密度改造**（现在是「标题 + 灰字 + 黑色大数字」的重复），工具明细只是其中一例（§4.4）。
- **多平台余额聚合**：前提是价格信息齐全且持续更新；已确认 usage-center 有价格表与「订阅/按量」模型，需要它**开一个访问口**（§3.3）。
- **子代理 + 后台任务**：要做（§4.2 / §4.3）。
- **分组**：不新增划分；只修一处事实性不一致，并把两个厂商组合并（§7）。

---

## 1. 判定标准（沿用本仓库既有语法，新增/改造卡必须逐条满足）

| # | 标准 | 仓库内既有证据 |
| --- | --- | --- |
| 1 | 一眼可读：2×2 内 ≤3 个数字或 1 条曲线，不需要展开 | `cache` / `tool` / `counts` |
| 2 | 无值时不出现：`render` 返回 `null` 而不是画 0 | `src/widgets/cache/index.ts:11` |
| 3 | 与当前会话或本机强相关，数据零配置可得 | GitHub 三级凭据阶梯 |
| 4 | 有口径、宁可 `—` 不猜；估算必须标注 `estimated` | `quota-manage` 的 provider 作用域日图；usage-center `LocalUsageSummary.estimated` |
| 5 | 骨架 = 内容外形（`manifest.source` + `skeleton`） | `src/widgets-template/README.md:48-59` |
| 6 | 不重复 dsh-usage-center 的深度分析（它是面板，不是瞟一眼） | usage-center 九页；本仓库只做卡片 |
| 7 | **同一次点击只做一件事**：卡面点击留给池视图循环，厂商选择进配置 | `types.ts` 的 `cycle.store`（`poolView` / `ccView` / `bigMetric`） |

---

## 2. 现状盘点：39 个单元、9 个分组、6 类数据面

| 分组 | 单元数 | 数据面 | 已有覆盖 |
| --- | --- | --- | --- |
| `system` | 12 | 会话投影（同步，无 `source`） | 轮次/步数、LLM、工具总时长、TTFT、TPS、缓存**单一比率**、tokens、上下文、水位、任务、轨迹、看板 |
| `coding-plan` | 3 | 自记账/usage-center 日图 + cc 作用域 | 热度图、7 日柱、额度管理 |
| `opencode-go` | 5 | `/api/opencode-usage(-multi)` | 三窗口柱/环 + 单窗口卡 |
| `commandcode` | 8 | `/api/commandcode-usage` | 账户/用量/额度/窗口/套餐 + 三张单窗口 |
| `github` | 5 | `/api/github` | 提交日历、stars、issue、push、仓库脉搏 |
| `device` | 1 | `/api/sysinfo` | **只有 `sys-gpu-line` 一组，其余 4 张硬件卡在 `system`（不一致）** |
| `sys`→`system` | 4 | `/api/sysinfo` | CPU/GPU/内存/显存/温度 |
| `pricing` | 1 | 本地时钟 + `holidays.ts` | 峰谷定价 |
| `other` | 1 | 本地 | 寄语 |

**结构性事实（决定新数据源的代价）**：`scripts/gen-registry.mjs:37` 的 `SOURCES = ['usage','cc','sys','github']` 是**白名单**；`BridgeSnapshot`（`src/client/runtime/bridge.ts`）是手工字段表；`collector.tsx` 每个 family 一段手写 effect。**新增一个数据源今天要改 3 个共享文件**——「新增一个部件 = 新增一个目录」目前只对会话投影类成立。

---

## 3. 缺口 A：钱（P0）

### 3.1 A1 会话成本卡 —— 必须区分「订阅套餐 / 按量付费」

**数据已存在，且「计费模式」字段上游已经有了**：usage-center 的 `QuotaSnapshot`（`src/types/provider.ts:68-91`）带 `billingType`（"Billing model as the provider describes it"）、`windows[]`（`QuotaWindow { used, cap, ratio, unit, resetAt, exceeded }`）、`remaining` + `currency`、`periodEnd`；本地口径另有 `LocalUsageSummary { requests, totalTokens, estimatedCost, currency, estimated: true }`。

| 模式 | 卡面主数字 | 次级数字 | 数据 |
| --- | --- | --- | --- |
| **订阅套餐**（credit / 窗口制，如 Command Code） | 本会话折算的**额度占用**（如「本会话 ≈ 3.2% 月额度」） | 剩余余额 / 窗口 reset 倒计时 | `QuotaSnapshot.windows` + 本账期已实现的 token↔credits 汇率（`quota-manage` 已有这套算法） |
| **按量付费**（如 DeepSeek API 余额） | 本会话**金额**（¥ / $） | 缓存省下的金额 | `tokenUsage` 四桶 × 价格规则（含峰谷） |
| **套餐 + 超额按量** | 先额度、再金额，两个都印，标签区分 | — | 两者都有时 |

**硬约束**：订阅模式下**绝不能把 token × 官方单价当成账单**——那是 `estimated`，必须带标注；`billingType` 拿不到时用卡配置手选，**不许猜**。这条正是 usage-center `types/provider.ts` 开头那句「representability of absence」的同一纪律。

### 3.2 A2 缓存节省卡（按用户给的版式）

用户给出的版式经 2026-09-28 两轮实机验收后定为**第三版**（第一版字号不协调；第二版环内写数字被判定难看、且标题与三行之间留了大段空白）：

```
缓存命中                     ╭──────╮        ← 蓝色标题
99%                          │ ▤▤▤ │        ← 20px 命中率大字（环内不再写数字）
18.7M tok                    ╰──────╯        ← 灰色总量；环 52px，中间是 database 圆柱图标
──────────────────────────────────────
未缓存输入             200K
缓存读取              18.4M
输出                  75.6K
```

参照用户给的「今日步数」卡（标题 / 大数字+单位 / 灰色目标 / 右上大环 / 下方图表）：**大数字占用原来那块空白**，环放大到 52px（body 环是 44px），环心放图标而非文字，精确值（98.9%）挂环的悬停提示。

**环图语气方向与系统监控环相反**：命中率**越高越好 → 绿**（≥80% success / ≥50% warn / <50% danger），与 sys-cpu / sys-gpu 那类「越高越忙越红」的环不是同一条规则。方向由 widget 判定（`headRing.tone`），渲染器绝不自己推断。

**契约影响**：新增 `headRing?: { ratio, tone?, icon?: HeadRingIcon, label? }`（`WidgetRenderOut`，占据头行右槽；有它时 title/value/legend 在左列按 13/20/10px 阶梯堆叠，`value` 不再落进正文）与 `kind: 'breakdown'`（`WidgetChart`，标签/数值/可选金额三列行表 + 顶部细分割线）；环形几何抽到 `render/charts/donut.tsx`，图标是仓库自绘的 `databaseIcon`（描边圆柱，形状对齐 Lucide `database`，不引图标依赖）。

**数据与必要性**：
- 四行全部来自 `tokenUsage` 投影 / `node.usage`（`uncachedInputTokens` / `cacheReadTokens` / `cacheWriteTokens` / `outputTokens`）；
- 现有 `cache` 卡只印一个命中率，**不可行动**；官方定价（2026-09-28 抓取）flash 缓存命中 0.02 元/M vs 未命中 1 元/M（空闲时段，高峰 ×2）——**命中与未命中差 50×**，proj 30×；
- 节省额 = `cacheRead × (miss价 − hit价)`，可直接印成末行或 legend；
- **套餐路由**没有单价时，该行只印 token、金额列留空（不要退回混合口径，`quota-manage` 已确立这条纪律）。

### 3.3 A3 多平台额度聚合 —— 与 usage-center 的分工（用户指出的前提）

**已核实的现状**（`D:\dsh-home\storages\usage-center\pricing.json`，2026-09-28 实读）：

```
version=2 currency=USD rules=12
deepseek    / deepseek-v4-flash,v4.1-flash,v4-pro     official
opencode-go / deepseek-v4-flash,v4.1-flash,v4-pro     reseller
commandcode / deepseek-v4-flash                       reseller
commandcode / deepseek/deepseek-v4.1-flash            fallback
ollama      / *                                        local
opencode    / deepseek-v4-flash-free, mimo-v2.5-free   local
```

- schema v2 已支持：**provider 作用域、生效窗口 `effectiveFrom/To`、峰谷 `peakWindows`+`peakRates`、四桶价（含 `cacheWrite`）、`sourceType: official | reseller | local | user | fallback`、`verifiedAt`、`notes`**——「中转站」这个类目**已经在模型里**（`reseller`）；
- 设计纪律明确写着 **「No rates ship in this package」**：价格是用户/厂商提供的数据，放存储目录而不是源码，避免「发版才能改价」和「插件替你声称一个你没核过的价」；
- **缺口是访问口**：usage-center 的服务暴露 14 个 `@Remote`（getStatus / getFilters / getOverview / getActivity / getTrend / getSpeed / getModels / getProviders / getSessions / getSessionDetail / getCost / getInsights / getAccount / getRealtime），**没有任何一个返回价格表本身或给一组 token 定价**。

**建议的分工（跨仓库一件事，不是两张表）**：

| 谁 | 做什么 |
| --- | --- |
| dsh-usage-center | ① 新增一个只读访问口：`@Remote('getPricing')` 返回合并后的规则表 + 被拒行原因（`mergePricing` 已有）；或更省事：`@Remote('priceTokens')` 直接给「四桶 token + provider + 时刻」返回金额，**峰谷判定逻辑留在 usage-center**（`utils/peak.ts` + 规则窗口），widgets 不复制；② 价格规则**新鲜度巡检**：`verifiedAt` 超期（如 >30 天）在 Account 页标黄，而不是静默继续用 |
| dsh-widgets | 只消费：`ctx.get('usageCenter')` 可选接缝（`host/usage-daily.ts` 已是这个模式，含 `available:false` 降级）。独立安装时，A1 降级为「只印 token、不印钱」 |
| 定期更新 | **不做静默自动抓取**。DeepSeek/OpenCode 官方页可解析，但抓取即「替用户声称价格」；建议：官方页 → 生成候选规则 → **人工确认后写入**（`sourceType: official` + `verifiedAt`）；中转站按 key 手动维护（`reseller`） |

这样 A3 从「写 N 个厂商客户端」变成「一张卡 + 一个 provider 选择 + 一个访问口」。

### 3.4 A4 窗口耗尽预测

数据齐（`QuotaWindow.resetAt` + 本地日图）。`quota-manage` 只做月窗口预测；5h / 周窗口同样需要「按当前速率，重置前会不会打满」——限流是长任务最硬的中断源。

---

## 4. 缺口 B：看不见的工作

### 4.0 B1「需要你介入」警灯 —— **不做**（用户决策，2026-09-28）

用户理由，记录以免反复评估：组件只有在**已经打开的会话**里才可见，此时询问/批准本来就在视野内；同一窗口的其他对话左侧栏**已有黄色标识**；Web UI 完全没开时组件不可见，这属于**通知插件**的职责（本机已装 `dsh-notification`）。因此这张卡的增量价值不足以占用一个格子。

### 4.1 B2/B3 后台作业 + 子代理 —— 要做

| 卡 | 数据来源（已确认） | 必要性 | 代价 |
| --- | --- | --- | --- |
| **后台作业** | runtime 的 `jobsBySession` 镜像（官方头部弹层 `dsh-client-ui-jobs` 读同一份：kind / label / status / 起止时间） | 长命令是「看起来卡住」的头号原因；卡片给出「N 个运行中 · 最久 12m」 | 低；**待确认**：第三方 slot 组件拿到该镜像的服务入口 |
| **子代理** | `subagentCatalog` / `subagentTiming` / `subagent` 三个投影；官方目录页展示「运行中 + token 用量 + 活跃轮次时长」 | 多代理是主要成本来源，且今天在 rail 上完全不可见 | 低（纯 `useProjection`） |

建议合成一张 2×4「agent 运行看板」：运行中子代理数 / 作业数 / 最久耗时 / 各自 token，2×2 版只印前两项。

### 4.2 B4 模型 / 推理档

`modelSelection` 投影（`lastUsed` / `next`：provider / model / reasoningEffort）。极低成本，多模型 preset 下有用。可与「会话成本」合并（同一张卡的上半部分解释钱为什么是这个价）。

### 4.3 B5 压缩与裁剪 / B6 重试与失败 / B7 目标与轮次

`compaction`、`toolResultPruner`、`llmRetry`、`sandboxMode`、`goal` 投影均已确认存在。压缩解释上下文骤降；重试/失败是诚实的可靠性信号；goal 是自主长跑唯一的进度真相。**都便宜，按需做。**

### 4.4 B8 system 族密度改造（用户指出的方向）

现状问题：`counts` `llm` `tool` `ttft` `tps` `cache` 六张是同一个模板（标题 + 灰字 + 黑色大数字），信息量最少、彼此最像。改造清单：

| 卡 | 现状 | 改造后 | 数据 |
| --- | --- | --- | --- |
| `cache` ✅已落地 | 单一命中率 | 命中率环（越高越绿）+ 大字命中率 + 灰字总量 + 未缓存输入/缓存读取/输出 三行 | `node.usage` 四桶 |
| `tool` ✅已落地 | 累计工具时长 | 默认三行 **失败 / 平均每次 / 工具耗时占比**（标签由短到长），大字仍是累计耗时；**不用环**（时长不是占比，环会挤掉数字）。五行可选（另加「最慢 <工具>」「正在跑 <工具> ×N」），在组件配置里勾选 + 拖动排序，**硬上限 3 行**（150px 下第 4 行会溢出 152>150） | `tool-result.call.name` × `isError` × `time−callTime`，`runningCalls.name/time`（`deriveTools`）；平均/占比由 `toolMs/calls`、`toolMs/(toolMs+llmMs)` 得出 |
| `context` ✅已落地（合并） | 上下文百分比 + 角落压缩钮 | **与独立的新建「上下文压缩」卡合并为一张**（用户 2026-09-28 决策：一件事不该说两遍）：标题「上下文压缩」，压缩钮移到**右上角**，其余放信息——压缩次数 / 累计回收 / 折叠项数三行，最近一次在灰字。**没有压缩过时会话仍渲染**（卡片自带动作，按钮不能随数据消失），两个无读数的量显示灰色 `—` | `contextPercent` + `compaction` 节点（`deriveCompaction`；无折叠时 fold 为 null，避免"零"覆盖预览示例） |
| `tokens` ✅已落地 | 输入 / 输出两个数字并排 | 改名为「会话 Token」（原「Tokens / Token 用量」会与「用量热度图 / 用量柱状图」那对**跨会话逐日**口径混淆）；总量为大字，下方 2 段构成条（**输入** 灰 / **输出** 品牌蓝）+ 各自精确值，整块 `bodyAnchor:'bottom'` 贴底。原计划的三段占比已由缓存卡承担，此处不重复；金额仍未接（需价格表） | `tokenUsage`（输入 = 含缓存读的总输入） |
| `llm` | 单一时长 | 时长 + 占「LLM+工具」的比例 + 平均每步 | 已有 `llmMs/toolMs/steps` |
| `counts` | 轮次 / 步数 | 加「当前轮第 N 步」「待办数」 | `sessionStats` + `todos` |
| `ttft` / `tps` | 单一均值 | 均值 + P95（或近 10 步迷你 sparkline） | 本会话节点时序（`session-stats.ts` 现有 fold 扩展） |
| `task` | 三个计数 | 进行中项的**文本**（一行） | `todos` 投影 |
| `harness-board` (2×4) | 12 个数字 | 把「成本 / 子代理 / 作业 / 缓存节省」纳入指标集 | 上述各源 |

**先决条件**：`breakdown` 原语（§3.2）。没有它，这些卡只能继续印孤零零的大数字。

---

## 5. 缺口 C：设备与自身（P1）

实测本机（2026-09-28）：**C: 剩 65.1 GB，D: 剩 63.5 GB；`dsh-home\sessions` 321 个文件 / 331.3 MB**。

| 卡 | 数据 | 必要性 |
| --- | --- | --- |
| **磁盘 + DSH 自检（2×4）** | `fs.statfs` 各盘 + 会话日志体积/增速 + web 进程 RSS/CPU + 活跃会话数 | 长跑 harness 最真实的运维风险是盘满与日志膨胀；今天没有任何地方能看见 |
| **网络吞吐** | 按网卡收发速率 | 装依赖/拉模型/大文件时解释「为什么慢」 |
| **供电/电池** | WMI `Win32_Battery` | 笔记本长跑：拔电降频甚至休眠 |
| **占用 Top 进程** | 进程名 + 内存/显存（`nvidia-smi --query-compute-apps`） | 多 agent / 多模型并行时回答「谁吃满了显存」 |
| **本地服务健康** | TCP + HTTP 探活：dsh web 端口、Ollama / LM Studio、已配置的 MCP server | MCP 慢/崩会让每个请求变慢，目前完全不可见 |
| **代理出口健康** | 本机 `127.0.0.1:10808`（socks5h/http）连通性与延迟 | 这台机器上大量插件与 git/gh 依赖它；代理挂了的表现是「一切都很慢」 |
| **硬件扩展（路线图已有）** | AMD/Intel GPU、CPU 温度（可选 LibreHardwareMonitor 桥）、风扇 | 现 sysinfo 只认 NVIDIA |

---

## 6. 缺口 D：外部世界（第三方接入）

**分层原则**：按「授权成本」而非「应用知名度」排序。

| 层 | 授权方式 | 代表 | 代价 | 说明 |
| --- | --- | --- | --- | --- |
| **Tier A** | 零授权（本地文件 / 公开 URL） | **ICS 日历订阅**（Google/Outlook/飞书/钉钉均可给出私有 ICS 链接）、天气（和风 / Open-Meteo 免 key）、RSS、公开状态页 | 1 个 host 路由 + 1–3 张卡 | **性价比最高**：一张「今日日程」覆盖多数日历需求，不碰 OAuth、不存 token |
| **Tier B** | API Key / Webhook | Todoist、Notion、Linear、Jira、**DeepSeek 余额**、OpenRouter、企业微信群机器人、Slack webhook | 复用 `credentials.resolve` + 同源路由 | 与今天 GitHub / CommandCode 完全同构 |
| **Tier C** | OAuth / 企业应用 | **飞书自建应用**（日历 v4 / 任务 / 审批）、**钉钉企业内部应用**（待办 / 日程 / 审批）、Google Calendar、Microsoft Graph | 一次性做通用 `oauth` host 模块：回调 + grant 存储 + 刷新 | `dsh-credentials` 支持插件自持凭据记录（`readRecord`/`modifyRecord`，含 `GrantRecord`），授权态可持久化，路是通的 |
| **Tier D** | **明确不做** | 小米健康（健康云开放平台**仅对小米生态链企业及合作伙伴开放**）、Apple 健康（无云端 API）、Google Fit REST（**2026 年底停止支持**）、个人微信（无官方 API） | — | 替代：① 本地导出文件导入卡（Apple `export.xml`、Zepp/小米导出）；② **iOS 快捷指令 → 入站 webhook**（DSH 自带 `ctx.webhookRuntime`，参考实现 `dsh-webhook-github`）；③ 企业微信机器人替代个人微信推送 |

**两件不需要第三方的**：
- **原生提醒/日程卡**：`schedule` 投影（官方头部目录只读）→「下次触发 12m · 2 条待触发 · 1 条已逾期」，是日历方向的**原生种子**，零外部依赖；
- **GitHub 待我处理**：同一 host 模块加 `GET /notifications`（review request / mention）。

---

## 7. 分组：不新增划分，只做三件事

**实测到的事实**：`device` 组只有 1 张卡（`sys-gpu-line`），另外 4 张硬件卡在 `system`；`other` 与 `pricing` 各 1 张。

1. **修一致性（一行改动）**：5 张硬件卡同组（建议 `device`），会话/统计留在 `system`。
2. **合并厂商组**：`opencode-go` + `commandcode` + `coding-plan` → **`coding-plan`**（16 张），市场从 9 组降到 6 组。理由：分组回答「这是干什么用的」，不回答「哪家厂商」；这三组本来就全是套餐/额度/计费。`pricing`（峰谷定价）也归 `coding-plan`——它属于「钱」；`other` 留给生活类（寄语、天气、RSS）。
3. **厂商差异进配置，不进卡面**（对齐 DSH「选模型提供方」的思路），但分两步走，避免影响现状：

| 步骤 | 做什么 | 风险 |
| --- | --- | --- |
| **第一步（先做）** | 只改 `manifest.group`，卡面/行为/实例完全不动 | 零 |
| **第二步（统一卡）** | 把两族的**同形卡**（三窗口环图 / 三窗口柱图 / 单窗口数字）合成一个单元，配置里加 `provider` 选择，数据取 usage-center 归一化后的 `getAccount()` / `getProviders()`；**默认值 = 今天的行为**；`cc-whoami` / `cc-credits` / `cc-subscription` 这类只有 Command Code 有的形状**不合并**，标记为 provider-locked | 中：需要归一化层与实例兼容策略 |

**必须守住的约束**：**卡面点击继续只做池视图循环**（`AllUser → 账户…`，字段 `ccView` / `poolView`）。厂商选择是**组件配置项**，因为现有生命周期里「一次点击 = 一个循环」，把两个循环塞进同一次点击会破坏现在的手感（判定标准 #7）。已安装实例保留旧 id 继续可用，不强制迁移。

**长期**：等 §8 的适配器契约落地后，「provider 归一化源」可以成为一种 source，DeepSeek / 中转站 / Z.ai 才能加进来而**不新增单元**——这才是「统一组件 + 自定义切换」真正成立的前提。

---

## 8. 生态的结构性问题（建议先修）

1. **`SOURCES` 白名单**（`scripts/gen-registry.mjs:37`）把数据源写死在生成器里；
2. **`BridgeSnapshot` 手工字段**（`runtime/bridge.ts`）；
3. **`collector.tsx` 一源一段手写 effect**，刷新策略散落；
4. **没有运行时注册**：第三方 bundle 无法贡献部件，只能把单元合进本仓库（路线图 `widgets-market` 就是为此）。

**建议契约（v1.11）**：`src/client/families/<id>/adapter.ts` 声明
`{ id, route, refresh: 'mount'|'settle'|'poll'|'visible', ttlMs, skeleton, merge(state, payload) }`；
生成器像发现单元一样发现适配器并汇总成 `SOURCE_REGISTRY`；`manifest.source` 变成自由字符串但必须命中该注册表；`collector` 退化为「按注册表轮询」的通用循环。
**验收标准**：新增一个数据源（例如 `cal`）只改「一个 family 目录 + 一个 host 模块」，`pnpm check` / `check:registry` 全绿。

---

## 9. 建议落地顺序

| 版本 | 内容 | 为什么这个顺序 |
| --- | --- | --- |
| **v1.9** | `breakdown` 原语 → `cache`/`tokens`/`tool` 三张卡按 §4.4 改造；会话成本卡（双计费模式，套餐先只印额度、按量印金额）；模型/推理档；分组第一步（只改 group） | 全客户端、零新数据源；先有原语才能改密度 |
| **v1.10** | 子代理卡、后台作业卡（先确认 `jobsBySession` 入口）；压缩/重试/目标按需；A4 窗口耗尽预测 | 各加一个读投影的卡，或一个 host 模块 |
| **v1.11** | 数据源适配器契约 + 第三方 unit 注册；与 usage-center 定下价格访问口（`getPricing` / `priceTokens`） + 价格巡检 | 不修这个，接一个应用就要改 3 个共享文件 |
| **v1.12** | 统一套餐卡第二步（provider 进配置）；磁盘+自检、网络、本地服务、代理健康 | 依赖 v1.11 的归一化源 |
| **v2.0** | 入站 webhook 通道（快捷指令 / 机器人 → DSH）+ Tier A/B 集成 + 通用 OAuth 模块 | 先通「外部事件进来」，生态上限由入站通道决定 |

---

## 10. 待确认项（写代码前必须实测，别当事实用）

1. `jobsBySession` 在第三方 slot 组件里的**服务入口**（官方弹层能读 ≠ 我们能读）；
2. `subagentCatalog` 的 token/时长字段在 wire view 里的确切形状；
3. `QuotaSnapshot.billingType` 在 OpenCode Go / Command Code / DeepSeek 三个适配器上的**实际取值与覆盖率**（决定套餐/按量能否自动判定）；
4. usage-center 是否愿意开 `getPricing` / `priceTokens` 访问口（跨仓库协商项）；
5. 飞书**个人版**能否建自建应用（企业管理员权限是硬门槛）；
6. `ctx.webhookRuntime` 在默认 web 组合里是否对第三方开放注册规则；
7. 价格规则的新鲜度策略（`verifiedAt` 超期阈值、官方页解析的候选生成是否值得做）。

---

## 11. 证据索引

**dsh-widgets**
- 契约与渲染能力：`src/client/lib/contract/types.ts`（`WidgetStats` / `WidgetChart` / `SkeletonShape` / `cycle.store`）
- 数据源白名单与发现：`scripts/gen-registry.mjs:37,42`
- 桥与收集器：`src/client/runtime/bridge.ts`、`src/client/data/collector.tsx`、`src/client/data/session-stats.ts`
- 最薄的卡（改造证据）：`src/widgets/cache/index.ts`、`src/widgets/tool/index.ts`
- host 能力与 usage-center 接缝先例：`src/host/{routes,context,http,exec,sysinfo}.ts`、`src/host/usage-daily.ts:20-28`（可选服务 + `available:false` 降级）

**dsh-usage-center**（仓库 `D:\dsh-home\plugins\dsh-usage-center`）
- 价格表 schema 与合并：`src/providers/pricing.ts`（`parsePricing` / `mergePricing` / `SOURCE_TYPES`）；设计纪律「No rates ship in this package」
- 价格表实例：`$DSH_HOME/storages/usage-center/pricing.json`（2026-09-28 实读：v2 / USD / 12 条 / deepseek·opencode-go·commandcode·ollama·opencode）
- 计费模式与额度模型：`src/types/provider.ts`（`QuotaSnapshot.billingType` / `QuotaWindow` / `LocalUsageSummary.estimated`）
- 服务访问口（无价格口）：`src/host/usage-service.ts:546-754` 的 14 个 `@Remote`

**DSH 侧可读投影**（`node_modules/@deepseek-ai/`）：`dsh-token-meter`（`tokenUsage` / `contextPressure` / `contextBreakdown`）、`dsh-api-session-controller`（`modelSelection`）、`dsh-schedule`（`schedule`）、`dsh-subagent`（`subagentCatalog` / `subagentTiming` / `subagent`）、`dsh-goal`（`goal`）、`dsh-plan-mode`（`plan`）、`dsh-permission-presets`（`permissions`）、`dsh-llm-retry`（`llmRetry`）、`dsh-sandbox-policy`（`sandboxMode`）、`dsh-client-ui-jobs`（`jobsBySession` 镜像）
**凭据写入能力**：`dsh-credentials/lib/types/index.d.ts`（`resolve` / `set` / `unset` / `readRecord` / `modifyRecord`，`GrantRecord`）

**外部事实来源**：[DeepSeek 定价](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)（2026-09-28 抓取：flash 缓存命中 0.02 / 未命中 1 / 输出 4 元每 M，空闲时段；高峰 ×2）、[DeepSeek 余额](https://api-docs.deepseek.com/zh-cn/api/get-user-balance/)、[飞书日历 v4](https://open.feishu.cn/document/server-docs/calendar-v4/overview?lang=zh-CN)、[钉钉 API 总览](https://open.dingtalk.com/document/orgapp/api-overview)、[小米健康云](https://dev.mi.com/docs/micloud/health/)（仅生态链企业/伙伴）、[Google Fit 迁移指南](https://developer.android.com/health-and-fitness/health-connect/migration/fit)（2026 年底停止）、[企业微信群机器人](https://developer.work.weixin.qq.com/document/path/91770)
