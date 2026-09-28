# BATCH-3 SPECS — 第三批部件规格书（Wave 2 草稿）

> 与 `BATCH-3-SPECS.md`（Wave 1）同构。Worker 读本文件里**属于它的那一节** + `docs/research/WORKER-BRIEF-V2.md`。
> Wave 2 的**数据面已经就位**：`/api/host/overview`（见 `src/host/overview.ts`）已实现并实测，契约切片是 `stats.host`（`HostOverview`）+ `stats.hostError`。
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

## 12. `session-cost` — 会话成本（口径最敏感的一张，单独详述）

```jsonc
{
  "widgetId": "session-cost", "order": 93, "group": "coding-plan", "sizes": ["2x2"],
  "source": "cc", "skeleton": { "shape": "figures", "count": 2 }
}
```

**前置（主 Agent 负责）**：host 新增 `/api/widgets-pricing` 读取 `$DSH_HOME/storages/usage-center/pricing.json`（v2 schema），返回**规则表原样 + 读取状态**；widget 只消费。
**本卡的纪律（不可让步）**：
- 价格规则**拿不到**时：只印 token，**金额列留空**，绝不退回混合口径、绝不印 `$0.00`。
- 订阅套餐路由（`sourceType: reseller` 且命中套餐）下把 token×单价当账单**是错的**：必须标 `estimated`，或干脆不印金额。**具体口径由 Wave 2 派发时的 spec 决定**，本文件只固定上面的硬约束。

---

## 13. `github-notify` — 待我处理

```jsonc
{
  "widgetId": "github-notify", "order": 94, "group": "github", "sizes": ["2x2"],
  "source": "github", "skeleton": { "shape": "text" }
}
```
**前置（主 Agent 负责）**：`src/host/github.ts` 的 payload 增加 `notifications` 切片（`GET /notifications`，复用既有三级凭据阶梯）。
**卡面**：大数字 = 未读待处理数；明细三行 = review request / mention / assign 各多少；最新一条的标题进 legend（截断）。匿名模式下该端点**不可用**（60/h 且 notifications 需要认证）→ 该切片为 null → 卡返回 `null`，并在 README 里写明「需要 token 或 gh 登录」。

---

## 14–16. 外部世界（Wave 3）

`calendar` / `weather` / `rss` 的规格待 `docs/research/EXTERNAL-SOURCES-AUDIT.md` 实测结论落定后补写（哪些直连、哪些必须走代理、解析方案与失效边界）。**共同前置**：一个通用的「外部 URL 拉取 + 缓存 + 失败分级」host 通道。
