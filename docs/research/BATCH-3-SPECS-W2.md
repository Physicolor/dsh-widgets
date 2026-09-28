# BATCH-3 SPECS — 第三批部件规格书（Wave 2 草稿）

> 与 `BATCH-3-SPECS.md`（Wave 1）同构。Worker 读本文件里**属于它的那一节** + `docs/research/WORKER-BRIEF-V2.md`。
> Wave 2 的**数据面已经就位**：`/api/host/overview`（见 `src/host/overview.ts`）、`/api/widgets-pricing`（`src/host/pricing.ts`）、`/api/github?notif=1`（`src/host/github.ts`）全部已实现、已实测、已进入 G7 门禁；契约切片是 `stats.host` / `stats.hostError` / `stats.pricing` / `stats.github.notifications`。
> 另外：`WidgetRenderOut.valueTone` 现在接受 `'danger' | 'warn'` 两档（`danger` = 已经坏了，`warn` = 还没坏但正朝那走），这是本批新增的共享能力。
> 共同硬约束与 Wave 1 完全一致（见 BRIEF §2 / §3）。

**Wave 2 的共同点**：Wave 1 回答「agent 现在是什么形态」，Wave 2 回答「**这台机器还撑得住吗**」——网络、供电、内存大户、本地服务与代理出口。

---

## 8. `sys-net` — 网络吞吐

```jsonc
{
  "widgetId": "sys-net", "order": 89, "group": "device", "sizes": ["2x2"],
  "source": "sys", "skeleton": { "shape": "line" },
  "name": { "zh": "网络吞吐", "en": "Network Throughput" },
  "desc": {
    "zh": "本机网卡的实时收发速率（按计数差分），以及当前累计收发量",
    "en": "Live per-adapter receive / transmit rate (a counter delta) for this machine"
  },
  "purpose": "装依赖、拉模型、传大文件时解释「为什么慢」。既有 sys 族只看 CPU/内存/GPU，网络是唯一完全不可见的资源。"
}
```

**数据**：`stats.host?.net` = `{ adapters: [{name, rxBps, txBps}], rxBps, txBps } | null`
- 单位**字节/秒**。格式化用你自己目录里的 `fmtRate`（`1.2 MB/s`），并在注释说明为什么不用 `fmtTokens`（那是 token 量级，不是速率）。
- `net === null` 表示**还没拿到两个计数样本**（吞吐必须靠差分，第一次调用只能存下基线）→ `render` 返回 `null`（壳会显示骨架，因为 `source: 'sys'`）。

**卡面（2×2）**
```
网络吞吐                       ← card.sys-net.title
1.2 MB/s                       ← headAfter.big：下行速率（所有网卡合计）
↑ 84 KB/s  ·  Wi-Fi 6E         ← legend：上行 + 当前最活跃网卡（可截断）
──────────────────────────────
下行                        1.2 MB/s
上行                          84 KB/s
最忙                     MediaTek Wi-Fi 6E…
```
- 大数字 = `net.rxBps`（下行）。理由：绝大多数等待是下载（依赖、模型、网页抓取）；上行通常小一个量级。
- 明细三行：下行 / 上行 / 最忙网卡名（`adapters[0].name`，**必须截断**）。
- 适配器名字很长（`MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card`）——截断策略写进 README。
- 零流量是**合法读数**（`0 B/s`），不是缺失：`render` 照常渲染，不要返回 null。

**tone 方向**：吞吐量**不染色**（快不等于好）。这是一个纯读数卡。

**验收**：`net === null` → null；两个方向都有值；网卡名截断；`0 B/s` 正常渲染；其余同 Wave 1。

---

## 9. `sys-power` — 供电与电池

```jsonc
{
  "widgetId": "sys-power", "order": 90, "group": "device", "sizes": ["2x2"],
  "source": "sys", "skeleton": { "shape": "text" },
  "name": { "zh": "供电", "en": "Power" },
  "desc": {
    "zh": "是否在用电池、剩余电量与预计续航，以及当前 Windows 电源方案",
    "en": "Whether this machine runs on battery, its charge and remaining runtime, and the active Windows power scheme"
  },
  "purpose": "笔记本长跑：拔电会降频甚至休眠，这是长任务被中断的最常见原因之一，而今天完全看不见。"
}
```

**数据**：`stats.host?.power` = `{ onAc, percent, minutesLeft, scheme } | null`
- `minutesLeft` 在插电时**必为 null**（host 已把 Win32 的 `71582788` 哨兵折成 null）——**不要**自己再判断哨兵，host 已经做了；你只要处理 null。
- `power === null` → `render` 返回 `null`（host 拿不到任何供电信息）。

**卡面（2×2）**
```
供电                           ← card.sys-power.title
100%                           ← headAfter.big：电量百分比
插电  ·  平衡                   ← legend：供电来源 + 电源方案
──────────────────────────────
供电                        交流电
剩余                        2h 14m        ← 插电时印 "—"（muted）+ 说明
电源方案                    平衡
```
- 大数字 = `percent`（电量）。没有电池（`percent === null`）时大数字写 `—`，legend 改为「台式机（无电池）」——**依据**：`onAc === true && percent === null` 且无电池数据。
- 「剩余」那一行：`minutesLeft` 有值 → `fmtDuration(minutesLeft * 60000)`；否则 `—` muted（插电时本来就没有剩余时间，这是正确的空态，不是错误）。
- 电源方案 `scheme` 可能是中文（host 已把 `powercfg` 的本地化前缀剥掉，只剩 `平衡`/`Balanced`）——**直接印**，不要自己映射。

**tone 方向**：**低于 20% 且不在充电 → warn，低于 10% → danger**（阈值常量 + 注释）。插电时不染色。这条方向与「越高越坏」相反，写进 README。

**验收**：`power === null` → null；插电时「剩余」是 `—` muted；低电量染 warn/danger；无电池时大数字 `—` + legend 说明；其余同 Wave 1。

---

## 10. `sys-procs` — 占用 Top 进程

```jsonc
{
  "widgetId": "sys-procs", "order": 91, "group": "device", "sizes": ["2x2"],
  "source": "sys", "skeleton": { "shape": "bars" },
  "name": { "zh": "内存大户", "en": "Top Processes" },
  "desc": {
    "zh": "按工作集内存排序的前几名进程；多 agent / 多模型并行时回答「谁把内存吃满了」",
    "en": "The top processes by working-set memory — who is eating the RAM when several agents or models run at once"
  },
  "purpose": "多 agent / 多模型并行时最常问的问题。实测本机常驻前三：Memory Compression / node（DSH web 自身）/ msedge。"
}
```

**数据**：`stats.host?.procs` = `HostProcess[] | null`（`{pid, name, rss}`，`rss` 字节）
- **只有内存，没有显存**：实测 WDDM 下 `nvidia-smi --query-compute-apps` 的每进程显存恒为 `[N/A]`，拿不到。**卡面不许出现"显存"字样**，README 要写明这个限制。
- `procs === null` → `null`；`[]` → `null`（没数据等于没信息）。

**卡面（2×2）**
```
内存大户                       ← card.sys-procs.title
1.6G                           ← headAfter.big：第一名的工作集
Memory Compression             ← legend：第一名的进程名（截断）
──────────────────────────────
node                      650 MB
msedge                    489 MB
MsMpEng                   452 MB
```
- **大数字 = 第一名的内存**；legend = 第一名的名字。
- **明细三行 = 第 2、3、4 名**（第一名已经是大数字+legend，**不要在明细里重复第一名**——这是本仓库「一件事不说两遍」的纪律）。
  - 若只有 1 个进程：明细印 `—` muted ×3 或直接不渲染明细（二选一，README 说明）。推荐：明细区不渲染（`chart` 省略），只留头部。
- 进程名可能很长（`MediaTek…`），截断策略写进 README。
- **不要把 DSH web 自己（node）特殊化**：它上榜就该上榜，README 里提一句它会出现即可。

**tone 方向**：**不染色**——谁是内存大户是事实，不是好坏。**不要**用 headRing（环是"占比"的语言，这里没有分母）。

**验收**：`procs` null 或空 → null；明细**不重复第一名**；只有 1 个进程时的降级形态已确认；其余同 Wave 1。

---

## 11. `sys-services` — 本地服务与代理出口

```jsonc
{
  "widgetId": "sys-services", "order": 92, "group": "device", "sizes": ["2x2"],
  "source": "sys", "skeleton": { "shape": "quotas" },
  "name": { "zh": "本地服务", "en": "Local Services" },
  "desc": {
    "zh": "本机关键端口的存活与延迟，以及代理出口是否真的能出网（不是"端口在听"就算通）",
    "en": "Liveness and latency of the machine's key local endpoints, plus whether the proxy egress actually works — a listening port is not proof"
  },
  "purpose": "MCP / Ollama / LM Studio 慢或崩会让每个请求变慢；代理挂了的表现是"一切都很慢"。今天这两件事都完全不可见。"
}
```

**数据**
- `stats.host?.services` = `HostServiceProbe[]`（`{key,label,host,port,up,ms}`）——**TCP 探活，永远有值**（可能是空数组）。
- `stats.host?.proxy` = `HostProxyHealth | null`（`{host,port,tcpMs,egressMs,ok,error}`）。
  - **`tcpMs` 单独不能当结论**：本机 xray 对**不存在的域名**也回 `200 Connection established`（实测）。真正的判据是 `ok`（绝对 URI GET 的结果）。README 与注释都要写明。
  - `ok === null` = 出口探针**还在飞**（stale-while-revalidate）——此时印「检测中」，**不要**印成故障。

**卡面（2×2）**
```
本地服务                       ← card.sys-services.title
3 / 4                          ← headAfter.big：在听的服务数 / 总数
出口 1.3s  ·  代理 0.3ms        ← legend：代理出口延迟 + TCP 握手
──────────────────────────────
DSH web                  通 · 2ms
Ollama                   通 · 2ms
LM Studio                    未运行     ← down 用 danger 或 muted（你定，写进 README）
```
- 大数字 = `up` 的数量 `/` 总数。
- legend = 代理出口状态：`ok === true` → `出口 <egressMs>`；`ok === false` → `出口不通（<error>）`；`ok === null` → `检测中`。
- 明细三行 = 前三个服务（`DSH web` / `Ollama` / `LM Studio`）。第四个（proxy）已经被 legend 覆盖，**不要重复**。
- `services` 为空数组 → `render` 返回 `null`。

**tone 方向**：**服务不可用是坏事**：`up === false` → 该行 `tone: 'danger'`；代理 `ok === false` → legend 用 danger 措辞。大数字在「全部在听」时不染色；有掉线时 `valueTone: 'danger'`（阈值/规则写成常量 + 注释）。

**验收**：`proxy.ok === null` 时印「检测中」而不是故障；服务 down 行染 danger；明细不重复 legend 的信息；`services` 为空 → null；其余同 Wave 1。

---

## 12. `session-cost` — 会话成本（口径最敏感的一张）

```jsonc
{
  "widgetId": "session-cost", "order": 93, "group": "coding-plan", "sizes": ["2x2"],
  "source": "cc", "skeleton": { "shape": "text" },
  "name": { "zh": "会话成本", "en": "Session Cost" },
  "desc": {
    "zh": "把本会话的四桶 token 按价格表折成钱，并标出这个金额的来源（官方价 / 中转价 / 免费路由）",
    "en": "Folds this session's four token buckets into money using the price table, and says which table it used (official / reseller / free route)"
  },
  "purpose": "官方价里缓存命中 0.02 元/M 与未命中 1 元/M 差 50×；今天没有任何地方把会话折成钱。"
}
```

**数据**（**两者都已在共享层就位**）
- `stats.usage` = `{ inputTokens, cacheReadTokens, outputTokens }`（本会话四桶；`inputTokens` 已含 cacheRead）。
- `stats.modelSelection?.next ?? lastUsed` = `{ provider, model, reasoningEffort? }` → 用来选规则。
- `stats.pricing` = `PriceTable`（来自 `/api/widgets-pricing`，读 usage-center 的 `storages/usage-center/pricing.json`）：
  `{ available, version, currency, rules[], path, modifiedAt }`；规则含 `provider/model/effectiveFrom/effectiveTo/timezone/peakWindows/rates{inputCacheHit,inputCacheMiss,output,cacheWrite}/peakRates?/currency/sourceType/verifiedAt`。
- `stats.commandCode.credits` —— **不读**。本卡是**会话金额**，不是额度占用；混进额度就是混合口径。

**选规则（你实现，纯函数 + 注释里给手算例子）**
1. 候选 = `rules` 中 `provider` 与 `model` 都能对上 `modelSelection` 的（`model` 允许规则里写 `*` 或 `deepseek/*` 这类通配前缀——**按你实测的表内容决定支持哪种**，并在 README 写清）；
2. 再看生效窗口：`effectiveFrom <= now < effectiveTo`（两端都可为 null = 无界）；
3. 多条命中时取 `effectiveFrom` 最新的一条；
4. **一条都不命中 → 只印 token，金额留空**（不印 `$0.00`，不猜）。

**高峰判定**：规则有 `peakRates` 且当前时刻落在 `peakWindows` 内（按规则自己的 `timezone`，默认 UTC）→ 用 `peakRates`，否则用 `rates`。**窗口外的秒数必须用 `rates`**——不要整段会话按当前时刻的费率算（那会把低峰时段也按高峰计价）。若这需要逐小时切分而你判断代价过高，**就在 README 里写明"按当前费率计整段"并把它标成 `estimated`**；这是允许的降级，但必须说出来。

**金额公式**（每 M token 单价 × 桶大小 / 1e6）：
```
cost = inputCacheMiss × (uncachedInput)  // = inputTokens − cacheReadTokens（不得为负）
     + inputCacheHit  × cacheReadTokens
     + output         × outputTokens
```
`cacheWrite` 在 `usage` 里拿不到（契约只有三桶）→ **不要**编一个 0，README 说明这张卡不含 cacheWrite。

**卡面（2×2）**
```
会话成本                       ← card.session-cost.title
$0.42                          ← headAfter.big：本会话金额（拿不到规则时 → token 总量）
官方价 · deepseek-v4-flash      ← legend：来源（sourceType 本地化）+ 模型名（截断）
──────────────────────────────
未缓存输入          200K  $0.04
缓存读取           18.4M  $0.00
输出               75.6K  $0.05
```
- **大数字 = 金额**，货币符号取规则的 `currency`。`sourceType` 必须在 legend 里说出来（`official`→「官方价」/`reseller`→「中转价」/`local`→「免费路由」/`fallback`→「估算价」），这是本卡的纪律：**金额永远带着它的出处**。
- 拿不到规则 → 大数字改成 token 总量，legend 变「无价格表 · 仅 token」，明细的金额列**留空**（不是 `—`，也不是 `$0.00`——空列表示"这里本就没有这个数"）。
- `pricing` 为 `null`（未读取）/ `available:false` → 同样走 token-only 形态，**卡仍然渲染**（token 本身有意义）。
- `usage` 为 null 或总量为 0 → `render` 返回 `null`。
- 无 `modelSelection` → 无法选规则 → token-only 形态。

**tone 方向**：金额**不染色**（花得多不等于坏）。本卡是读数卡。

**配置项**：无（第一版）。

**验收**：规则命中 → 金额 + 出处；不命中 → token-only 且金额列留空（**截图必须能看到这一形态**，用 `example.simSteps` 给两态）；高峰窗口命中 → 用 `peakRates`（写一个纯函数用例证明）；`usage` 全 0 → null；`uncachedInput` 负数被钳成 0；手算例子在注释里；其余同 Wave 1。

---

## 13. `github-notify` — 待我处理

```jsonc
{
  "widgetId": "github-notify", "order": 94, "group": "github", "sizes": ["2x2"],
  "source": "github", "skeleton": { "shape": "text" },
  "name": { "zh": "待我处理", "en": "To Review" },
  "desc": {
    "zh": "GitHub 上等我的未读线程：review request / @提及 / 指派，以及最新的一条",
    "en": "Unread GitHub threads waiting on me: review requests, mentions and assignments, plus the newest one"
  },
  "purpose": "「待我处理」是 GitHub 家族唯一还缺的待办语义——既有 5 张卡全是仓库状态，没有一张说「有人在等你」。"
}
```

**数据（已在共享层就位）**：`stats.github?.notifications` =
`{ count, byReason: { review_requested, mention, assign, ci_activity, other }, newest: { title, repo, reason, updatedAt, url } | null }`
- 采集器只在**装了本卡**时才发 `notif=1`（`/api/github?...&notif=1`），host 侧 5 分钟 memo + ETag（304 不扣配额）。
- **匿名时该切片为 null**（GitHub 实测回 401，不是 0）→ `render` 返回 `null`。**不要**印「0 条待办」：那会把"我没法看"说成"没人等你"。README 写明「需要 token 或 `gh` 登录」。

**卡面（2×2）**
```
待我处理                       ← card.github-notify.title
3                              ← headAfter.big：未读总数
dsh-widgets · review …          ← legend：最新一条（repo · reason，截断）
──────────────────────────────
Review 请求                  2
提及                          1
指派                          0
```
- `byReason` 的键集**恒定**（含 0 值行）——行数不能随数据变化。
- `ci_activity` / `other` 不进明细（明细 3 行上限）；若它们 > 0 而前三项都为 0，大数字照印总数、明细三行全 0 —— 或者你决定用 `other` 顶替 `ci_activity`，把理由写进 README。
- `newest.url` 只用于 hover 提示（卡片本身不可点击）。

**tone 方向**：待办数**不染色**（有人等你不是错误）。

**验收**：`notifications` 为 null（未请求 / 匿名）→ `null`；三次 `count` 与 `byReason` 之和不一致时的处理写清；键集恒定；其余同 Wave 1。


---

## 14–16. 外部世界（Wave 3）

`calendar` / `weather` / `rss` 的规格待 `docs/research/EXTERNAL-SOURCES-AUDIT.md` 实测结论落定后补写（哪些直连、哪些必须走代理、解析方案与失效边界）。**共同前置**：一个通用的「外部 URL 拉取 + 缓存 + 失败分级」host 通道。
