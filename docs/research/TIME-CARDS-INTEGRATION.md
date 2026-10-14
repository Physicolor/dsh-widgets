# 时间类组件与 DSH 的联动调研（时钟 / 日历 2×2 交付 + 四条路线评估）

> 2026-10-14 · 依据：dsh-widgets v1.8.4 工作树 + 本机实时 GUI（127.0.0.1:19387，desktop profile）
> + **部署版 DSH 0.2.0-rc.2 的官方源码**（明文副本，见附录 C）
> 每条结论带证据锚点；未验证的标 **ASSUMED**，查不到的标 **UNKNOWN**。

⚠️ **证据口径（重要）**：本机部署的是 **0.2.0-rc.2**；工作区里的
`deepseek-harness-master`（0.1.0-rc.5）**已过时**，按它回答会错（它没有 `schedule_update`、
没有 `timeContext`/`subagentCatalog`/`modelSelection` 等投影，`todos` 语义也不同）。
本文全部以部署版明文副本为准：`C:\Users\12404\AppData\Local\npm-cache\_npx\7eff65a5cfe9d1d1\node_modules\@deepseek-ai\`
（与 `resources\app.asar` 内的 0.2.0-rc.2 逐字节核对过 `dsh-schedule` / `dsh-session-projection`）。

---

## 0 本次交付（事实基线）

| 类别 | 产物 | 证据 |
| --- | --- | --- |
| 新单元 时钟 | `src/widgets/clock/{index.ts,manifest.json}`（2×2） | 指针表盘 / 数字两种面，可选时区与秒针 |
| 新单元 日历 | `src/widgets/calendar/{index.ts,manifest.json}`（2×2） | 月历网格 + 今日徽标 + 周末/法定节假日染色 |
| 共享时区库 | `src/client/lib/clock-face.ts` | 时区读数（固定偏移 + Intl 兜底）、月历网格、区域下拉表 |
| 渲染词表 | `src/client/lib/contract/types.ts:893,923,942` | `ClockRich` / `CalendarRich` / `WidgetRich.type += 'clock'|'calendar'` |
| 渲染器 | `src/client/render/rich/clock-face.tsx`、`month-grid.tsx` | 表盘 SVG + 月历布局；**渲染器自带 1 秒 tick** |
| 卡片宿主 | `src/client/render/CardBody.tsx:96`（RichBlock）、`:643`（挂载） | RichBlock 由"普通函数调用"改为真组件（hooks 必须落在自己的 fiber） |
| 门禁 | `node scripts/gates.mjs` → **11/11 PASS** | G1 registry / G2 units / G3 types / G4 render（基线含新增 18 条输出）/ G5 css / G7 types / G8 host-routes / G9–G12 |
| 离线视觉 | `docs/preview/cards/clock@2x2*.png`、`calendar@2x2*.png`、`_sheet(.dark).png` | 其余卡片的截图漂移已回退，只留本次两张卡 + 总览图 |
| 实时验收 | `scripts/verify-clock-calendar-live.cjs` → **PASS** | 真 rail 上两张卡 150×150、无 `data-dsx-overflow`、表盘 12 数字齐全、月历文本完整 |

**本次最重要的架构结论（后面四条路线都依赖它）**：widget 的 `render()` 是**纯数据**，
rail 只在数据变化时重渲卡片，空闲时 30 秒才走一次（`src/client/data/collector.tsx:127-140`）。
"会走的时间"不能挂在 widget 上，只能挂在**渲染器**上（`render/rich/clock-face.tsx` 自持 1s tick）。
秒表 / 倒计时 / 日程倒计时全部复用这一条。

---

## 1 结论速览

| # | 方向 | 数据现状（部署版实测） | 需要的改动 | 成本 | 建议 |
| --- | --- | --- | --- | --- | --- |
| A | 任务计时 / 秒表 | ⚠️ 现走通的只有 `sessionStats`（llmMs/toolMs）与 `trajectory`；**`jobs`/`jobsBySession` 通道是死的**（§2.1） | 秒表本身只写组件；接后台作业要先修数据通道 | 0.5 天（只读版）/ +0.5 天（接作业） | **做**，先用 `sessionStats` + `trajectory` |
| B | 倒计时 / 闹钟 | 卡片存不了时间戳 | 1 条状态通道（§3.3） | 1–2 天 | **做**，走插件自有 state |
| C | 日程 → 日历 | **DSH 自带定时任务子系统，客户端可读/可改/可删（不可建）**（§4.1） | 一个数据源 + 日历标记 | 1–2 天 | **做**（比"待办绑日程"正确得多） |
| C′ | 待办 → 日程 | `todos` 只有 `{content,status}`，无 id/日期，且**每轮 `turn/start` 清空** | 不可行（除插件自建议程） | — | **不做** |
| D | 手机平台绑定（小米 / Apple / 华为） | 官方**无**任何通知/日历集成（关键词全树扫描 3 处全为误报） | ICS 订阅 / 推送网关 | 1–2 天 + 各平台人工验证 | **做 ICS + 推送**，厂商 SDK 不做 |
| E | 2×4 日历 + 日程查看 | 布局可行，**日程源可达** | `sizes` + rich 传 `width` + 一个 source | 1.5–2.5 天 | **值得做**（C 落地后马上做） |

一句话：**A 立刻可做（但要绕开已死的 jobs 通道）；C 从"玩具"变"有用"——DSH 自带日程且客户端读得到；
B 一条小改动；D 只做标准协议；C′（待办绑日程）实测不成立。**

---

## 2 部署版可读到的「时间与任务」数据面（26 个投影 + 若干客户端服务）

### 2.1 时间/任务相关投影（实测清单）

| 数据 | 形状 | 证据（LIVE = 部署版明文副本） | 可用性 |
| --- | --- | --- | --- |
| `sessionStats` | `{turns,steps,llmMs,toolMs,ttftMs,ttftSteps,decodeMs,decodeTokens}` | `LIVE/dsh-session-stats/lib/index.js:68` | ✅ 本插件在用 |
| `trajectory`（本插件自算） | 轨迹 beat + 运行中工具调用 ms | 插件 `collector.tsx:254-266` | ✅ |
| `timeContext` | `{lastMessageTime,lastInjectionTime,lastTurnInjectionTime}`（epoch ms） | `LIVE/dsh-time-context/lib/index.js:181-185` | ✅ 未接（可做"距上次消息 N 分钟"） |
| `sessionListMetadata.lastPromptAt` | `number \| null` | `LIVE/dsh-api-session-controller/lib/index.js:1837` | ✅ |
| `goal` | `{goal:{id,revision,objective,phase,blockedReason?,maxGoalRounds}, roundsStarted, createdAt, updatedAt}` | `LIVE/dsh-goal/lib/index.js:440` | ✅ |
| `subagentCatalog` | `{id, createdAt, mode, label?}[]`（**无 activeMs**） | `LIVE/dsh-subagent/lib/types/catalog.js:75` | 卡片现读的 `activeMs` 来自 `byId[...].projectionValues.subagentTiming`（另一条路） |
| `subagentTiming` | `{settledMs, active?{since,through}}` | `LIVE/dsh-subagent/lib/index.js:2477` | ✅ |
| `todos` | `{content,status}[] \| null`；**`turn/start` 时置 null（每轮清空）** | `LIVE/dsh-tool-todo/lib/index.js:63-94` | ⚠️ 只作当轮进度看板 |
| `jobsBySession` | **不存在**（全树 0 命中） | 全包 grep：无匹配 | ❌ 见下 |
| 日程/提醒/定时 | **没有任何投影**（26 个 key 里没有） | `LIVE/dsh-session-projection/lib/types/index.js`（开放接口 + declaration merging） | 走 RPC，见 §4 |

### 2.2 ⚠️ 实测发现的两个"死通道"（现存缺陷，与本次调研直接相关）

1. **`jobsBySession` 在部署版不存在** → 本插件 `collector.tsx:86` 读到的永远是 `undefined`，
   `stats.jobs` 恒为 `null` → **「后台作业」卡片在当前部署里读不到任何数据**。
   后台作业的真实客户端 API 是 `ctx.jobs`：`ctx.jobs.state`（observable，`rows[sessionId]`）、
   `watchRows(sessionId)`、`observe(...)`、`kill(sessionId, jobId)`
   （`LIVE/dsh-client-ui-jobs/lib/client.js:311-313,616-619`；宿主 `@Remote('kill')`
   `LIVE/dsh-api-job-controller/lib/typert.host.js:209`）。
   → **修它很便宜**（改读 `ctx.jobs`），也是"秒表绑定后台作业"的前置条件。
2. **`subagents[].activeMs` 的旁路依赖**：`subagentCatalog` 里没有 `activeMs`，
   卡片靠 `useSessions().byId[child].projectionValues.subagentTiming` 拿（`collector.tsx:314-320`）。
   这条路本次未逐项验证（**ASSUMED 可用**），做秒表前应先确认。

---

## 3 方向 A/B：秒表 · 倒计时 × 工作任务

### 3.1 三种绑定形态

1. **本回合计时（今天就能做）**：`sessionStats.llmMs + toolMs` 是全会话累计；
   配合 `trajectory` 的 open beat（`collector.tsx:254-266` 已用 `now` 补算运行中步骤）
   → 「本回合已跑 4:12」「当前工具调用 0:37」。渲染器 tick 走秒。
2. **作业计时**：需要先修 §2.2 的通道（改 `ctx.jobs.watchRows(sessionId)`），
   然后用 `startedAt/status` 求 `now − startedAt`。**0.5 天**。
3. **倒计时**：目标时刻来源 (a) 用户设定（插件状态，§3.3）、(b) **某个定时任务的下一目标**
   （`schedule.catalog()` 的 `scheduledAt`，§4.1）、(c) 额度窗口 `resetAt`（已有先例）。

### 3.2 为什么"会走"这件事现在才算解决

渲染器 tick 是**通用能力**：任何 rich 块都能自己按秒重渲，rail 的空闲 30s tick 完全不参与。
实现要点：值不变则不 `setState`（分钟精度卡就只每分钟重渲一次）。

### 3.3 交互（开始/暂停/复位）——三条通道与真实代价

| 通道 | 现状 | 能做什么 | 缺口 |
| --- | --- | --- | --- |
| 整卡点按 `cycle` | `rail-view.tsx:158-173` 写 `cardConfigs[key][store]` | **只能存 mode 字符串** | 存不了时间戳 |
| 动作按钮 `actions`/`corner` | `CardBody.tsx:33-46,662-668` → `ACTION_COMMANDS` **固定表**（当前仅 `contextCompact:'/compact'`，`rail-view.tsx:44`） | 只能触发已注册命令 | 新动作要改共享表 |
| **`ctx.remote.session.prompt`**（部署版已证实） | 官方客户端即用此发消息：`@Remote('prompt') prompt(request: SessionPromptRequest, signal)`，`SessionPromptRequest{requestId, sessionId, mode:'queue'|'steer', content, clientTimeZone?}` | **卡片可以把一句话送进会话**（让模型去调 `schedule_create`/`todo_write`） | 插件现状只在 `client/index.ts:195-204` 解析 `remote`，未用 session face |

三条状态扩展（按代价）：
- **B1（推荐，1 天）**：`cycle` 支持"带值步骤"（`modes` 项携带 patch，点按写入 `cardConfigs`）。
  计时器 = `{timerState:'running', timerStartedAt:…}`，渲染器 tick 显示差值。
- **B2（1–2 天）**：动作走插件自有 host 路由（复用 `host/state-file.ts:22-62` 原子写），
  需给 `CardBody` 的动作 id 加"非命令动作"分发（现在找不到命令就静默返回，`rail-view.tsx:142-143`）。
- **B3（0.5 天）**：状态直接放进 `/api/widgets-state` 的 prefs（`state-file.ts:14-19`）。

---

## 4 方向 C：日程（本次调研最大的发现，含一条硬限制）

### 4.1 实测：日程子系统完整存在，客户端**可读/可改/可删，但不能建**

| 事实 | 证据（部署版 0.2.0-rc.2） |
| --- | --- |
| 客户端 RPC：`schedule.list({sessionId})` / `catalog()` / `history(request)` / `delete({sessionId,id})` / `update(request)` | 客户端 `APP:dsh-client-ui-schedule/lib/client.js:5619,6715,6761,5620,6726,6757`；宿主 `@Remote(...)` 声明 `LIVE/dsh-schedule/lib/typert.host.js:503,510,517,524,531` |
| 变更事件 `schedule/changed`；连接重置 `connection/reset` | `LIVE/dsh-schedule/lib/typert.host.js:720`；客户端 `client.js:5624,6731` |
| **`create` 没有 `@Remote`** → 客户端/卡片**建不了**提醒；只有 agent 工具能建 | `LIVE/dsh-schedule/lib/typert.host.js:493-534`（`create` 的签名在 `:496`，无注解）；官方 UI 的「新建任务」也只是开学话（`client.js:6799-6801`） |
| 可用 agent 工具 4 个：`schedule_create/list/delete/update` | `LIVE/dsh-schedule/lib/index.js:2120,2157,2176,2207`（注册点 `:2110`） |
| 规则种类：`after / at / every / daily / weekly / cron`；记录含 `id,kind,title,prompt,scheduledAt`(RFC3339 UTC)；更新为 CAS（`expected: ScheduleRecord`） | `LIVE/dsh-schedule/lib/typert.host.js:539-575,623,627,667,703` |
| 存储真相 = 归属会话日志里的版本化 `schedule/change` 事件 | `LIVE/dsh-schedule/lib/index.js:534-586` |
| 官方已实现全套**管理** UI（自动化任务页、侧栏任务页签、会话页头时钟按钮、会话行标记、`schedule_create` 卡片） | `APP:dsh-client-ui-schedule/README.zh.md`（§概述/§理解实现） |
| **本机已启用**该能力 | `D:\dsh-home\profiles\desktop\package.json` 的 `dsh.profile.bundles` 含 `@deepseek-ai/dsh-experimental-schedule-bundle` |

**结论**：日历卡要的"哪天有日程、下一件是什么、还有多久"——数据在客户端手边：
`ctx.get('remote').schedule.catalog()` + 订阅 `schedule/changed`。**零 host 工作。**
卡片若想让用户"加一件事"，唯一可行路径是 **`ctx.remote.session.prompt(...)` 让模型去调
`schedule_create`**（或插件自注册 agent 工具，见 §6.3）。

> **"第三方能不能拿到"已定论（VERIFIED）**：cordis 的 context 代理把 `ctx.<name>` 与
> `ctx.get(name)` 解析成**同一个服务实例**——属性读取走 `ReflectService.handler.get`，命中已声明服务后
> 沿 fiber 的 service store 取实现，取不到时回落到 `ctx.reflect.get(prop, false)`，而后者正是 `ctx.get()`
> 的底层（`LIVE/cordis/lib/index.js:669-695`，尤其 `:678-680`）。所以插件用 `ctx.get('remote')` 拿到的
> 就是官方包用 `ctx.remote` 读写的那个对象，face（`commands` / `schedule` …）挂在它上面；
> 本插件**今天**就作为第三方在读 `remote.commands.execute`（`src/client/index.ts:195-204`）。
>
> **唯一剩下的变量是"这个部署有没有装 schedule bundle"**：装了才有 `remote.schedule`
> （本机 desktop profile 已装，见 §4.1 表末行）。因此卡片必须写降级分支——`remote.schedule` 不存在时
> 退回纯月历，而不是画一个空日程栏。

### 4.2 因此：待办不要硬绑日程

`todos` 只有 `{content,status}`，**无 id、无日期**，且 `turn/start` 会整表置 `null`
（`LIVE/dsh-tool-todo/lib/index.js:86`）——意味着它连"跨轮看板"都不是，更排不进日历。

| 路线 | 判定 |
| --- | --- |
| C′1 文本解析日期 / C′2 插件自有 todo→日期映射 | **不做**：不可靠 + 需要写入通道 + todo 每轮清空 |
| **C3 日程 → 日历**（推荐） | 日历格标出有 `ScheduleRecord` 的日子；副标题给"下一件 + 剩余" |
| C4 插件自建议程（注册 agent 工具写入，§6.3） | 可选进阶：用户说"记到 10/20"，模型调插件工具落库 |

**产品判断**：官方已有完整的日程**管理**面，卡片**不应重做管理器**，只做"一眼看板"。

---

## 5 方向 D：手机平台绑定（小米 / Apple / 华为）

实测：部署版**没有任何**通知/日历/推送集成——关键词（`CalDAV|EventKit|ical|icalendar|webpush|APNs|Notification.requestPermission`）
全树扫描仅 3 处命中且全为误报（base64 图片、PDF 字体）；Electron 主进程只有自动更新与任务控制。
DSH 内建唯一"按时间提醒"就是 §4 的会话级 schedule（`deliveryMode:'session-local'`，仅原会话存活时投递）。

| 方案 | 小米 | Apple | 华为 | 代价 | 判定 |
| --- | --- | --- | --- | --- | --- |
| **ICS 订阅（只读）** | 日历支持订阅 URL | 支持 `webcal`/URL | 支持订阅 | host 路由输出 `.ics`（`ctx.webServer.register`，`host/context.ts:28-35`）：**0.5–1 天** | **推荐**（数据源 = `schedule.catalog()`，含精确 UTC 时刻与时区） |
| **推送提醒** | Bark/ntfy/企业微信机器人/Server酱 | 同 | 同 | 一个 host 路由 POST：**0.5 天** | **推荐**（无网络拓扑依赖） |
| CalDAV 双向 | 需自建常驻服务 | 同 | 同 | 2–3 天 + 运维 | 可选，不建议先做 |
| 厂商 SDK / EventKit / Mi Cloud OAuth | 需原生 App | 需 macOS 端 | 需原生 App | 不可行 | **不做** |

两条硬约束：① 手机要能访问这台 PC（局域网 IP 只在同一 Wi-Fi 有效，跨网需穿透；推送无此问题）；
② 日历订阅路由必须**单独设计不可猜 token**，绝不能暴露 GUI 的签名 cookie 机制。

---

## 6 方向 E：2×4 日历 + 日程查看

### 6.1 契约上要动什么

1. `manifest.sizes = ["2x2","2x4"]` + descriptor `sizes`（两处一致，G2/G10 会查）。
2. `RichBlock` 目前只拿到 `{rich, scale}`（`CardBody.tsx:643`），**没有宽度**；双栏版面需要它
   （图表走 `renderChart({chart, side, width, pad, scale})`，rich 补 `width` 是**一行改动**）。
3. `CalendarRich` 增 `agenda`（行数据由 widget 组好，字符串留在单元里）。
4. 宽度感知布局：`width >= 1.5 * unit` 切双栏（左栏固定 `96·scale`，右栏 `flex:1`，
   行高按剩余高度均分；沿用 `month-grid.tsx` 的"显式 px 行高 + floor 余量"，避免触发 tile-fits 守卫）。
5. 数据源：新增一个 family 适配器（`src/client/data/sources.ts:94-117` 的契约）调用
   `remote.schedule.catalog()`，折成"日期 → 条目数/标题"，并订阅 `schedule/changed`。

### 6.2 降级纪律（必须）

schedule bundle 是**可选**的（官方 README 明说发行版 Web 组合不含 `ui-schedule` 行）。
`remote.schedule` 缺失时卡片必须退化成纯月历（本插件既有纪律：数据不到就隐藏，不编造）。

### 6.3 另一条可行路线：插件自注册 agent 工具

部署版允许插件注册：HTTP 路由、**agent 工具**（`ctx.tools.register(defineTool({...}))`，
`LIVE/dsh-tool-todo/lib/index.js:95-124`）、**斜杠命令**（`ctx.commands.register`，
`LIVE/dsh-commands/lib/typert.host.js:145,249,277`）、定时器（`ctx.setInterval`，随 fiber 销毁）。
→ 插件可以自建一份"议程存储"并提供 `agenda_add` 工具：用户说"把这个记到 10 月 20 日"，
模型调插件工具落库，卡片渲染。**代价 1–2 天**，且不依赖上游改投影。

### 6.4 判定

布局 **0.5 天** + 数据 **0.5–1 天**（§4.1 RPC 或 §6.3 自建）→ **值得做**，
做完就是整个插件里信息密度最高的一张卡。

---

## 7 不建议做的（止损）

1. **依赖 `jobsBySession`**（部署版不存在，见 §2.2）——要接后台作业请改 `ctx.jobs`。
2. **指望卡片直接创建提醒**：`schedule.create` 不是 Remote（§4.1）；用 `session.prompt` 或自注册工具。
3. **待办绑日程**（`todos` 每轮清空且无日期）。
4. **厂商生态直连**（米家/HMS/EventKit/OAuth）：插件没有原生壳。
5. **重做官方日程管理器**（新建/改时/删除/历史）：官方已成体系，卡片只管"看"。
6. **1 秒轮询 host 路由做秒表**：客户端 tick 已足够。
7. **按 `deepseek-harness-master`（0.1.0-rc.5）写代码或做判断**：与部署版差异已实测（§2）。

---

## 8 优先级建议（含验收口径）

| 优先级 | 事项 | 依赖 | 验收口径 |
| --- | --- | --- | --- |
| P0 | **任务计时卡（只读秒表）** 2×2：本回合 + 当前工具调用 | 无（`sessionStats` + `trajectory` + 已有 tick） | 真 rail 读数与 stats 变化一致；空闲不跳秒；G2/G4 通过 |
| P0.5 | **修「后台作业」数据通道**（`jobsBySession` → `ctx.jobs`） | 无 | 卡片在真实会话里显示运行中作业；无作业时不报错 |
| P1 | **日程感知日历**（2×2 加日程点 + 下一件倒计时） | §4.1 探针确认 `remote.schedule` | bundle 未启用时退化正常；有日程的日子可见标记 |
| P2 | **2×4 日历 + 临近日程列表** | P1 同源 + `RichBlock` 传 `width` | 6 周月（2026-08）在 2×4 不溢出；日程行 ≤ 剩余高度 |
| P3 | **倒计时/计时器交互** | §3.3 B1 | 刷新/跨浏览器状态不丢 |
| P4 | **ICS 订阅 + 推送提醒** | P1 同源 + 不可猜 token | 手机真机订阅成功；token 泄露不暴露 GUI |
| P5 | **（可选）插件自注册 agenda 工具** | `ctx.tools.register` | 用户一句话经模型落库后卡片可见 |

---

## 附录 A 证据台账（本仓库 / 本次交付）

| 结论 | 锚点 |
| --- | --- |
| 卡片渲染是纯数据；空闲 30s / 运行中 1s 重建 stats | `src/client/data/collector.tsx:127-140` |
| rich 词表（本次扩展点） | `src/client/lib/contract/types.ts:893,923,942` |
| rich 挂载点（本次改为组件，hooks 才能落对 fiber） | `src/client/render/CardBody.tsx:96,643` |
| 月历显式 px 行高（防 tile-fits 守卫） | `src/client/render/rich/month-grid.tsx`（`rowH` 段） |
| 表盘 tick 与几何 | `src/client/render/rich/clock-face.tsx`（`ClockFace` 的 `useEffect`） |
| 时区规则 | `src/client/lib/clock-face.ts`（`FIXED_ZONE_OFFSET_MINS`/`readClock`） |
| 整卡点按只存 mode 字符串 | `src/client/rail/rail-view.tsx:158-173` |
| 动作按钮 → 固定命令表 | `src/client/rail/rail-view.tsx:44-46,141-151` |
| 客户端解析 remote 服务 | `src/client/index.ts:195-204` |
| 死通道：jobs 读自 `jobsBySession` | `src/client/data/collector.tsx:86,321-329` |
| 插件可注册 host HTTP 路由 | `src/host/context.ts:28-35`；实例 `src/host/state-file.ts:22-62` |
| 原子写状态文件 | `src/host/state-file.ts:14-19,42-51` |
| 数据源适配器契约 | `src/client/data/sources.ts:94-117` |
| 假日表（日历染色已复用） | `src/client/lib/peak-holidays.ts:53-61,93-97` |
| todos 无日期无 id | `src/client/lib/contract/types.ts:533` |

## 附录 B 部署版能力审计（0.2.0-rc.2，独立子代理 + 本人复核）

| 问题 | 结论 | 证据 | 置信度 |
| --- | --- | --- | --- |
| 投影全集 | **26 个 key**，无任何日程/提醒/cron 投影；时间相关只有 `timeContext` 与 `sessionListMetadata.lastPromptAt` | `LIVE/dsh-session-projection/lib/types/index.js` + 各包定义 | VERIFIED |
| `jobsBySession` | **不存在**（全树 0 命中）；真实 API 是 `ctx.jobs.state/watchRows/observe/kill` | 本人 grep：无匹配；`LIVE/dsh-client-ui-jobs/lib/client.js:311-313,616-619` | VERIFIED（本人复核） |
| 日程 RPC | `list/catalog/history/delete/update` 可用；**`create` 无 `@Remote`** | `LIVE/dsh-schedule/lib/typert.host.js:493-534` | VERIFIED（本人复核） |
| 日程事件 | `schedule/changed`（`typert.host.js:720`）+ `connection/reset` | 同上 | VERIFIED |
| 会话发消息 | `@Remote('prompt')`，`SessionPromptRequest{requestId,sessionId,mode:'queue'|'steer',content,clientTimeZone?}` | `LIVE/dsh-api-session-controller/lib/typert.host.js:1520,2236-2241` | VERIFIED（本人复核） |
| 第三方能否读到 `remote.schedule` | **能**：`ctx.<name>` 与 `ctx.get(name)` 在 cordis 里解析为同一服务实例（face 挂在共享 `remote` 上）；条件是该部署装了 schedule bundle（本机已装） | `LIVE/cordis/lib/index.js:669-695`（`:678-680` 回落即 `ctx.get`）+ `src/client/index.ts:195-204`（第三方已在读 `remote.commands`） | VERIFIED（本人复核） |
| todos 写入 | 唯一生产者是 agent 工具 `todo_write`；`turn/start` 清空 | `LIVE/dsh-tool-todo/lib/index.js:80-94,173` | VERIFIED |
| 插件 host 能力 | HTTP 路由 / node:fs / agent 工具 / 斜杠命令 / 定时器 **全部可行** | `LIVE/dsh-host-webserver/lib/types/index.d.ts:30-34`；`LIVE/dsh-tool-todo/lib/index.js:95-124`；`LIVE/dsh-commands/lib/typert.host.js:145,249,277`；`LIVE/cordis-plugin-timer/lib/index.js:12-21` | VERIFIED |
| 移动端/通知/日历集成 | **无**（关键词全树扫描 3 处全为误报） | 子代理全树扫描 + Electron 主进程检查 | VERIFIED |

## 附录 C 调查方法与证据源

- **首选明文源**：`C:\Users\12404\AppData\Local\npm-cache\_npx\7eff65a5cfe9d1d1\node_modules\@deepseek-ai\`
  （与部署 asar 内的 0.2.0-rc.2 逐字节核对过 `dsh-schedule`、`dsh-session-projection`；
  `dsh-client-ui-schedule/lib/client.js` 两侧大小不同，涉及它的行号已在 asar 副本上复核）。
- **asar 直读**（没找到明文源时的兜底）：`resources/app.asar` 是 121 MB 单文件归档，
  ripgrep/资源管理器都打不开；按格式直读即可（`u32@4 = headerSize`，JSON 头从 offset 8 起，
  内容区从 `8 + headerSize` 起）。本次用于**定位** `dsh-schedule` / `dsh-client-ui-schedule`
  两个包并提取 `README.zh.md`、`typert.remote-client.js`，方法与结论一致。
- ⚠️ `D:\dsh-home\profiles\web\node_modules\@deepseek-ai\*` 的 240 个 junction **全部失效**
  （指向已改名的 npx 缓存 hash）——不可作为证据源。
- 子代理留档：`D:\Users\12404\Documents\DeepSeek-Harness\.tmp-dsh-client-data-inventory.md`（96 行事实清单）。

## 附录 D 下一步最小验证清单

1. **冒烟探针（10 行）**：插件里临时 `ctx.get('remote')?.schedule?.catalog?.()` 打日志。
   "第三方可达"已在源码层证实（附录 B 末二行），这一枪只用来确认**本机这个部署**确实装并挂上了
   schedule face，以及拿到真实 `ScheduleRecord[]` 的字段（解锁 P1/P2/P4）。
2. **`RichBlock` 传 `width`**：1 行 + 现有 G4/画廊回归（解锁 P2）。
3. **修 jobs 通道**：`collector.tsx` 改读 `ctx.jobs`（解锁 P0.5 与"秒表接作业"）。
4. **问上游两件事**：① `schedule.*` RPC 与 `ctx.jobs` 是否算公开稳定面；
   ② 未来是否给 `todos` 加 `id`/`dueAt`（决定 C′ 是否永远不做）。
