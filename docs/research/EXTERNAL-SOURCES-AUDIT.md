# EXTERNAL-SOURCES-AUDIT — 「零授权 / 低授权成本」外部数据源接入可行性实测

> 只读调研。**本文件是本次任务唯一写入的文件**，`dsh-widgets` 仓库其余部分（`src/`、`scripts/`、`docs/` 其它文件）未被修改；所有测试脚本写在 `%TEMP%\dsx-audit\`。
>
> 实测环境：Windows 11 / Node **v22.22.2**（`D:\tools\node\node.exe`，bundled undici **6.24.1**，full-ICU）/ 系统时间 **2026-09-29 00:26 +08:00** / 出口代理 **HTTP `http://127.0.0.1:10808`、socks5h `socks5h://127.0.0.1:10808` 均在监听**（本 shell 里 `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` **全部为空**）。
> 所有耗时、字节数、条目数均为本次实测输出，逐条抄录，未做任何估算或补写。没测通的项直接写「没测通」+ 错误信息。
> 本机 `gh` CLI 已登录（账号 `Physicolor`，token 前缀 `gho_`，scopes `gist, read:org, repo, workflow`）。

---

## §0 结论表

| 源 | 授权成本 | 实测可用? | 150px 卡面价值 | 代价（host 行数 / 客户端 / cadence / TTL） |
|---|---|---|---|---|
| **ICS 日历订阅** | **零**（订阅 URL 本身即凭据，多数是「公开/私有地址」一个字符串） | ✅ 4/4 端点拉通（iCloud CN、Google US、Fedora、OfficeHolidays）；解析 246–317 VEVENT 用 18.8–74.9 ms，今日窗口展开 0.4–1.6 ms | **最高**。今日日程 = 一天里唯一「有时间点、值得看」的信息 | host **200–260 行**（ICS 解析 ~70 + RRULE 子集 ~60 + 路由 ~50）· client 1 effect + family 2 文件 + 1 unit ×2 文件 · 15 min · TTL 15 min |
| **Open-Meteo 天气** | **零 key**（`apikey` 仅商业用途；免费非商业无需 key） | ✅ forecast + geocoding 均免 key 拉通；974 B / 1.4 s；中文城市名 geocode 230 ms | 高。当前温度 + 今日高低温 + 降水概率，一张卡说清 | host **90–120 行**（含 28 条 WMO 表 + geocode 缓存）· client 同上 · 10 min · TTL 10 min |
| **RSS / Atom** | **零** | ✅ 5/5 feed 拉通（HN、GitHub Blog、V2EX、少数派、InfoQ CN）；每 feed 10–50 条，解析 0.3–1.5 ms | 中。3 条标题 + 相对时间；信息密度靠「截断」换 | host **110–140 行** · client 同上 · 10–15 min · TTL 10 min |
| **GitHub 待我处理** | 低（复用现有三级阶梯） | ⚠️ **仅 token 档可用**：匿名实测 **401 Requires authentication**；token 档 500 ms / 16 条 / 85 KB，ETag 304 **不耗配额** | 中高。「有没有人在等我」是唯一可行动的 GitHub 数字（现有 `github-issues` 的 unanswered 是它的弱化版） | 在 `github.ts` 加 **80–110 行**（复用 `resolveGitHubCred`）· client 0 新 effect（并进现有 GitHub 循环）· 5 min + ETag · TTL 5 min |

**出口矩阵（§1.0）一句话**：本机 **9/11 目标可直连**，只有 `calendar.google.com` 与 `www.v2ex.com` 直连超时（`UND_ERR_CONNECT_TIMEOUT`，10.4/10.5 s）；两者走 HTTP 代理均 1.8/2.5 s 成功。**Node 直连 `fetch` 不读 `HTTP_PROXY`**；起效只有两条路——启动期 `NODE_USE_ENV_PROXY=1`（实测可用，但插件改不了别人的启动参数），或**自建 28 行 CONNECT 隧道 Agent**（零依赖，实测可用，推荐）。`socks5h` 在零依赖下**做不到**。

**估算标注**：这四个源的每一个数字都是**上游实测值**，没有一个是本插件推出来的，因此卡面**不需要**「估算」标注（唯一例外是 RSS 的「x 分钟前」——由 `pubDate` 推导，属真实时间差，不是估算）。

---

## §1 逐项详述

### §1.0 出口实测：哪些目标直连、哪些必须走代理

测试脚本 `%TEMP%\dsx-audit\net-probe.mjs`，同一进程顺序请求，超时 15 s，无重试。

**直连（不设任何代理变量）**

```
mode=DIRECT HTTPS_PROXY= HTTP_PROXY= NO_PROXY=
OK   open-meteo-forecast  status=200 bytes=341  ms=2216
OK   open-meteo-geocode   status=200 bytes=904  ms=1198
OK   github-api-root      status=200 bytes=424  ms=210
OK   ics-holidays-cn      status=200 bytes=69134 ms=512
FAIL ics-google-holiday   ms=10465 TypeError: fetch failed | cause=UND_ERR_CONNECT_TIMEOUT
OK   rss-hn               status=200 bytes=15836 ms=1528
OK   rss-gh-blog          status=200 bytes=264254 ms=182
FAIL atom-v2ex            ms=10481 TypeError: fetch failed | cause=UND_ERR_CONNECT_TIMEOUT
OK   wttr-in              status=200 bytes=39416 ms=838
```

补充直连实测（后续小节）：`apps.fedoraproject.org` 2226 ms ✅、`www.officeholidays.com` 842 ms ✅（**http:// 也通**，见下）、`sspai.com` 110 ms ✅、`infoq.cn` 221 ms ✅、`example.com` 945 ms ✅、`www.debian.org` **10.6 s 超时 ❌**、`calendar.ubuntu.com` **TLS 握手前被断 ❌**（连走代理也 `Client network socket disconnected before secure TLS connection was established`，是它自己的问题）。

**走代理（`HTTPS_PROXY=http://127.0.0.1:10808` + `node --use-env-proxy`）**

```
mode=PROXY(env) HTTPS_PROXY=http://127.0.0.1:10808
OK   open-meteo-forecast  status=200 bytes=340  ms=2898
OK   open-meteo-geocode   status=200 bytes=904  ms=2016
OK   github-api-root      status=200 bytes=424  ms=2413
OK   ics-holidays-cn      status=200 bytes=69134 ms=1783
OK   ics-google-holiday   status=200 bytes=120685 ms=1810   ← 直连失败，代理成功
OK   rss-hn               status=200 bytes=15836 ms=2908
OK   rss-gh-blog          status=200 bytes=264254 ms=2061
OK   atom-v2ex            status=200 bytes=89365 ms=2092    ← 直连失败，代理成功
OK   wttr-in              status=200 bytes=39416 ms=3112
(node:45900) [UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental, expect them to change at any time.
```

**结论**：代理不是「必需」，而是「可直连目标会更慢（+0.3~2 s）」的**代价**。所以 host 侧的正确策略是 **有代理就用代理、没有就直连**，而不是「总是先直连、失败再退代理」——后者在 `calendar.google.com` 上要白等 10.4 s。

#### Node 里走代理的三条路（不装依赖优先）

**A. 启动期 `NODE_USE_ENV_PROXY=1`（或 `--use-env-proxy`）——实测可用，但插件控制不了**

```
$env:HTTPS_PROXY='http://127.0.0.1:10808'; $env:NODE_USE_ENV_PROXY='1'; node -e "fetch('https://www.v2ex.com/index.xml')..."
env-only NODE_USE_ENV_PROXY=1 -> 200 58158        # 58158 字符 ≈ 89 KB，直连是 10.5 s 超时
(node:12664) [UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental
```

局限：**只在启动前读一次**，是**进程级**全局 dispatcher（会一并改掉其它插件/其它路由的出口），且本机 Node 22 会打 experimental 警告。插件没有权力要求用户改 `dsh web` 的启动方式，所以**不能作为实现**，只能写成 README 里的可选项。

**B. 自建 CONNECT 隧道 Agent——28 行、零依赖、实测可用（推荐）**

```
$ node %TEMP%\dsx-audit\proxy-agent.mjs
TUNNEL OK   google-ics (direct FAILS)  status=200 bytes=120685 ms=3183
TUNNEL OK   v2ex atom (direct FAILS)   status=200 bytes=89365  ms=2355
TUNNEL OK   open-meteo (direct OK)     status=200 bytes=341    ms=1932
```

写法（可直接抄进 `src/host/proxy.ts`）：

```ts
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'

/** HTTPS through an HTTP proxy: CONNECT + TLS over the tunneled socket. */
export class ProxyHttpsAgent extends https.Agent {
  constructor(private proxy: { host: string; port: number }, opts?: https.AgentOptions) { super(opts) }
  override createConnection(options: any, cb: any): any {
    const target = `${options.host}:${options.port ?? 443}`
    const req = http.request({
      host: this.proxy.host, port: this.proxy.port, method: 'CONNECT', path: target,
      headers: { host: target, 'proxy-connection': 'keep-alive' },
    })
    req.once('connect', (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); cb(new Error(`proxy CONNECT ${res.statusCode}`)); return }
      cb(null, tls.connect({ socket, servername: options.host }))
    })
    req.once('error', cb)
    req.end()
  }
}
/** Proxy address from the environment, `null` when the host should go direct. */
export function proxyFromEnv(): { host: string; port: number } | null {
  const raw = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? ''
  if (raw === '') return null
  try { const u = new URL(raw); return { host: u.hostname, port: Number(u.port || 8080) } } catch { return null }
}
```

代价：**一旦走隧道就不能再用全局 `fetch`**（node 的 `Agent` 不是 undici `Dispatcher`）。两条出路——
1. 新模块用 `https.request(url, { agent })` 自己发请求（+15 行）；
2. 不用隧道、只用 `fetch` 直连（对 §1.0 里 9/11 的目标够用，且 iCloud / Open-Meteo / hnrss / GitHub 全在其中）。

**C. 装依赖**：`undici`（拿 `EnvHttpProxyAgent`，可 `setGlobalDispatcher`，与 `fetch` 兼容）或 `socks-proxy-agent`（**只有它能把 `socks5h://127.0.0.1:10808` 用起来**，Node 标准库没有 SOCKS 客户端）。本仓库 `package.json` 目前无运行时依赖，**建议不装**；若用户确实只有 SOCKS 出口，替代方案是让代理端另开一个 HTTP 端口，或接受 A 方案（`NODE_USE_ENV_PROXY=1` 仍需 `ALL_PROXY=http://…`，undici 的 EnvHttpProxyAgent **不认 socks**）。

> 顺带实测：`import('undici')` → `ERR_MODULE_NOT_FOUND`。Node 22.22.2 的 undici 6.24.1 是**内建不可 require** 的，拿不到 `EnvHttpProxyAgent`。

**HTTP（非 TLS）目标**：上面的隧道 Agent 只管 `https:`。`http://` 目标走代理要用「绝对 URI 请求」：

```
plain-http via proxy absolute-URI: status 301 bytes 167 ms 912   # http://www.officeholidays.com/ics/china
```

（注意它会 301 → https，所以真正实现里仍需跟随重定向；而该 URL **直连**实测 200/34089 B/998 ms，说明 §1.1 里更该直接用 https 地址。）

---

### §1.1 ICS 日历订阅（Tier A）

#### ① Node 里解析 ICS 的最小可行做法

不需要 XML 解析器，ICS 是「一行一个属性」的文本格式。四件事必做，缺一个就会在真实 feed 上出错：

| 步骤 | 为什么必须做 | 实测证据 |
|---|---|---|
| **折行还原（unfolding）** | RFC 5545 规定超过 75 octet 的行以 `CRLF + 空格/Tab` 续行 | Google US 节假日 120 685 B 里有 **174 行**续行；Fedora 35 901 B 里有 **222 行**。不还原会把一个 SUMMARY 切成两半 |
| **属性参数剥离** | 值在第一个 `:` 之后，名字与参数用 `;` 分隔 | iCloud CN 的 `SUMMARY;LANGUAGE=zh_CN:元旦（休）`；不剥参数会把 `LANGUAGE=zh_CN` 当标题 |
| **TEXT 反转义** | `\n` `\,` `\;` `\\` | Google feed 的 `DESCRIPTION:Observance\nTo hide observances\, go to …`（折行甚至把单词切开：`Setting\n s > Holidays`） |
| **日期两形态** | `VALUE=DATE`（全天，`YYYYMMDD`）vs `DATE-TIME`（`YYYYMMDDTHHMMSS[Z]`） | iCloud CN 246 个事件**全是** `VALUE=DATE`（511 处）；Fedora 49 个**全是** `TZID` 形式 |

```ts
/** RFC 5545 折行还原：CRLF/LF 后跟一个空格或 Tab 视为续行。 */
export function unfold(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r\n|\n|\r/)
}
/** `NAME;PARAM=..;VALUE=DATE:value` -> { name, params, value }（值在第一个 ':' 之后）。 */
export function splitProp(line: string) {
  const i = line.indexOf(':'); if (i < 0) return null
  const [name, ...segs] = line.slice(0, i).split(';')
  const params: Record<string, string> = {}
  for (const s of segs) { const eq = s.indexOf('='); if (eq > 0) params[s.slice(0, eq).toUpperCase()] = s.slice(eq + 1) }
  return { name: name!.toUpperCase(), params, value: line.slice(i + 1) }
}
export function unescapeText(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}
```

**实测解析结果**（脚本 `%TEMP%\dsx-audit\ics-test.mjs`，`node ics-test.mjs <file>`）：

```
$ node ics-test.mjs cn_zh.ics
file=cn_zh.ics bytes=69134 events=246 parseMs=44.5 expandMs=0.4
today(tz=Asia/Shanghai) = 2026-09-29  window=[2026-09-28T16:00:00.000Z , 2026-09-29T16:00:00.000Z)
events covering today: 0
next 7 days: 2
  - 2026-10-01 "国庆节"
  - 2026-10-01 "国庆节（休）"
rrule events: 8; sample: [ '元旦 start=2024-01-01T00:00:00.000Z FREQ=YEARLY;COUNT=6',
                            '妇女节 start=2024-03-08T00:00:00.000Z FREQ=YEARLY;COUNT=6',
                            '劳动节 start=2024-05-01T00:00:00.000Z FREQ=YEARLY;COUNT=6' ]
tzid events: 0; allday: 246
```

#### 时区 `TZID`：真实 feed 会喂给你非法/歧义值，必须 try/catch + 兜底

Fedora feed 的 TZID 是 **`EST` / `IST` / `GMT` / `PST` / `CST`**（都不是合法 IANA 名，虽然 ICU 容忍了），文件里同时有 **5 个 `VTIMEZONE` 块**。实测 ICU 的映射**不一致**：

```
$ node -e "…offset(Jan), offset(Jul)…"
EST             Jan -5    Jul -5      ← 固定 -5，没有夏令时（夏季实际是 -4，**差 1 小时**）
IST             Jan 5.5   Jul 5.5
GMT             Jan 0     Jul 0
PST             Jan -8    Jul -7      ← 有夏令时（America/Los_Angeles 语义）
CST             Jan -6    Jul -5      ← 有夏令时（America/Chicago 语义）
Asia/Shanghai   Jan 8     Jul 8
UTC             Jan 0     Jul 0
VTIMEZONE blocks 5 ; TZIDs EST | IST | GMT | PST | CST
```

`new Intl.DateTimeFormat('en-US',{timeZone:'EST'})` 这五个**都不抛异常**（本机 full-ICU），所以「try/catch 就安全」是**错的**——它会静默给你一个夏季差 1 小时的答案。正确顺序：**① 优先用文件自带的 `VTIMEZONE`（含 `STANDARD`/`DAYLIGHT` + `RRULE`，要一个 ~30 行的解析器）；② 否则查一张 TZID→IANA 小表（`EST→America/New_York`、`CST→America/Chicago`、`PST→America/Los_Angeles`…）；③ 都没有才交给 `Intl`，并把它当 UTC 偏移而不是缩写。** 若不做 ①，退而求其次也要**在卡面标注时区来源**（至少别装作知道）。

`VALUE=DATE`（全天）还有一个**边界陷阱**：把 `20260929` 解析成「UTC 午夜」再和本地日窗口比 epoch，在东八区没问题，在负偏移时区会**串到前一天**。正确做法：**全天事件按 `YYYY-MM-DD` 字符串在展示时区里比较**，不要转 epoch。

#### ② RRULE 展开：放哪一层 → **host 层，且只展开「今天 / 未来 N 天」这个窗口**

实测成本（整文件 parse + 窗口展开，含 246–317 个事件的大文件）：

```
fedora.ics        35901B  events=49   todayHits=19  totalMs=9.2   (2026-09-29)
cn_zh.ics         69134B  events=246  todayHits=0   totalMs=35.4
google-usa.ics   120685B  events=317  todayHits=0   totalMs=74.9
officeholidays-cn 34089B  events=39   todayHits=0   totalMs=9.0
```

**host 展开的三个理由**：① 单次 9–75 ms，比一次网络往返便宜一个数量级，放 TTL 后面等于免费；② 展开结果非常小（见下），客户端拿到的就是一个**已经排好序、已去重、已限流**的窗口；③ 客户端不该同时持有 300 个事件 + 一个 RRULE 引擎——那是把 `collector.tsx` 变成日历库。

窗口 JSON 大小实测（`ics-payload.mjs`）：

```
fedora.ics             window=1d rows= 19 fullJson=2227B  cardJson(first3)=356B
fedora.ics             window=7d rows=133 fullJson=15561B cardJson(first3)=356B
cn_zh.ics              window=7d rows=  2 fullJson=218B   cardJson(first3)=218B
officeholidays-cn.ics  window=7d rows=  5 fullJson=643B   cardJson(first3)=383B
```

**最小 RRULE 子集**（实测覆盖 4/4 真 feed 的日常形态）：`FREQ=DAILY|WEEKLY|MONTHLY|YEARLY` + `INTERVAL` + `COUNT` + `UNTIL`（约 60 行，按 `FREQ` 步进 + 窗口剪枝）。

**这个子集覆盖不到的**（真 feed 里就存在）：Fedora 带 `BYDAY=-1SU;BYMONTH=10`（`FREQ=YEARLY` 的「十月最后一个周日」）、`BYMONTH=1`、`BYDAY=1SU;BYMONTH=11`；还有 `EXDATE`、`RECURRENCE-ID`、`RDATE`。**建议**：解析到不支持的键时**不要猜**——把那一条事件标成 `unsupported: true` 并在卡面降级（或整个 slice 记 `error:'rrule-unsupported'`），**不要**退化成「只在 DTSTART 当天出现一次」这种静默错误。

**真 feed 还教了两条卫生规则**（必须写进实现，否则今日窗口会炸）：

1. **时长钳制**。Fedora 有一条 `DTSTART:20251217T153000Z` + `DTEND:20301217T163000Z`（DTEND 写到十年后），周重复的每一次都会被算成「覆盖今天」→ 今日命中从 19 条涨到 **33 条**（8 条同一个会议重复）。钳制 `dur ∈ (0, 24h]`（全天 = 1 天，无 DTEND = 1 小时）后回到 19 条。
2. **按 `(UID, startEpoch)` 去重**（同一会议可能在 feed 里有多条 VEVENT，且 `RECURRENCE-ID` 未处理时会重复）。

```
# 钳制 + 去重前/后（fedora.ics，同一窗口）
todayHits=33  →（钳制 dur ≤ 24h + uid@start 去重）→  todayHits=19
```

#### ③ 实测的公开 ICS 端点

| 端点 | 直连 | 走代理 | 字节 | VEVENT | TZID | RRULE | 折行 | 内容 |
|---|---|---|---|---|---|---|---|---|
| `https://calendars.icloud.com/holidays/cn_zh.ics` | ✅ 512 ms | ✅ 1783 ms | 69 134 | 246 | 0 | 8 | 0 | 中国大陆节假日/节气，`X-WR-CALNAME:中国大陆节假日`，2023-12-30 → 2029-12-21 |
| `https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics` | ❌ 10 465 ms 超时 | ✅ 1810 ms | 120 685 | 317 | 0 | 0 | 174 | 美国节假日，全 `VALUE=DATE` |
| `https://apps.fedoraproject.org/calendar/ical/` | ✅ 2226 ms | — | 35 901 | 49 | 48 | 52 | 222 | **唯一带 `TZID` + 定时事件**的真实 feed（会议日历） |
| `https://www.officeholidays.com/ics/china` | ✅ 842 ms | ✅ 1841 ms | 34 089 | 39 | 0 | 0 | — | 中国节假日 |
| `https://www.officeholidays.com/ics-all/china` | ✅ 450 ms | ✅ 1808 ms | 37 391 | 43 | 0 | 0 | — | 同上（含纪念日） |

原始样本（iCloud CN，前 1 400 字符）：

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:icalendar-ruby
CALSCALE:GREGORIAN
X-WR-CALNAME:中国大陆节假日
X-APPLE-LANGUAGE:zh
X-APPLE-REGION:CN
BEGIN:VEVENT
DTSTAMP;VALUE=DATE:19760401
UID:c234057c-fd90-380e-889c-3e3254dd5b01
DTSTART;VALUE=DATE:20231230
DTEND;VALUE=DATE:20240102
CLASS:PUBLIC
SUMMARY;LANGUAGE=zh_CN:元旦（休）
TRANSP:TRANSPARENT
CATEGORIES:節慶
X-APPLE-SPECIAL-DAY:WORK-HOLIDAY
END:VEVENT
BEGIN:VEVENT
DTSTAMP;VALUE=DATE:19760401
UID:e4928aff-334b-3d33-9ff8-cbe74b0ea009
DTSTART;VALUE=DATE:20240101
CLASS:PUBLIC
SUMMARY;LANGUAGE=zh_CN:元旦
TRANSP:TRANSPARENT
RRULE:FREQ=YEARLY;COUNT=6
END:VEVENT
```

真实「今天有事件」的样本（Fedora feed，钳制后）：

```
fedora.ics: 35901B events=49 todayHits=19 totalMs=9.2 (2026-09-29)
   23:30-00:30  Fedora CoreOS Group Weekly Meeting
   01:00-02:00  Fedora Server WG
   01:30-02:00  EPEL Office Hours
   02:00-03:00  EPEL Steering Committee
   02:00-04:00  FESCo Meeting
   02:30-03:00  🎨 Design Team Session Live
```

**内容校验必做**：非 ICS 的响应会是 `200 + text/html`（实测 `https://example.com/` → 200/713 B/`<!doctype html>`），所以**必须校验响应体含 `BEGIN:VCALENDAR`**，否则整片记 `error:'not-ics'`。

#### 卡面：能不能做成 150px？——能，而且是最贴卡语法的一张

```
┌──────────────────────────────┐
│ 今日日程                 3 项 │  title + headRight(今日条数)
│ 14:00                        │  headAfter.big  = 下一场的开始时间
│ 设计评审 · 45 分钟            │  headAfter.small = 它的标题 · 时长
│ ──────────────────────────── │  breakdown 自带的分隔线
│ 16:00 1:1                    │  breakdown row 1（后续场次）
│ 18:30 站会                   │  breakdown row 2
│ 全天 国庆节                   │  breakdown row 3（全天事件）
└──────────────────────────────┘
```

- 头部「大数字」= **下一场的开始时间**（比「今天有几件事」更可行动）；`headRight` = 「N 项」。
- 明细 ≤ 3 行：`chart.kind='breakdown'`，`label` = `HH:MM 标题`，`value` = 时长（全天事件的 value 留空）。breakdown 的长 label 在右缘**渐隐**而不是打省略号（`charts/breakdown.tsx` 注释明说），所以中文标题可以给到 10–12 字。
- 空白天（今日 0 项、无全天事件）→ `value:'—'` + `legend:'今天没有日程'`，**不画 chart**。
- 全天事件与定时事件混排时，把全天放最后一行（它们没有时间点）。

`configSchema`：

| key | type | default | 说明 |
|---|---|---|---|
| `url` | text | `''` | ICS 订阅地址（http/https）。空 = 卡不出现 |
| `tz` | text | `''` | IANA 时区；空 = host 用 `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| `days` | mode | `'1'` | `[['1','仅今天'],['3','未来 3 天'],['7','未来 7 天']]` |
| `allDay` | toggle | `true` | 全天事件是否占明细行 |

**降级**：`url` 为空 → `render` 返回 `null`（卡不出现，与 `quote`/`heatmap` 一致）；`url` 有但拉取失败/非 ICS → 该卡 `null` + `cardHint`（沿用 GitHub 家族的 `githubError` 思路，用 `calendarError` 承载 `'unloaded' | 'unavailable' | 'not-ics' | 'rrule-unsupported'`），**保留上一次好数据**（stale-while-error，与 `collector.tsx` 中 Command Code / GitHub 的既有纪律一致）。

**复用原语**：`headAfter`(big/small) · `headRight` · `breakdown` · `legend` · `cardHint`。`lanes` 不适合（它是轨迹条，不是日程表）。

**代价**：host `src/host/calendar.ts` ≈ **200–260 行**（ICS 解析 ~70 / RRULE 子集 ~60 / 窗口 + 钳制 + 去重 ~30 / 路由 + 参数校验 ~50）；客户端 = `collector.tsx` 加 1 个 effect（~35 行，模式抄 GitHub 家族）+ `families/calendar/{data,renders}.ts`（~140 行）+ `widgets/calendar-today/{index.ts,manifest.json}`（~45 行，含 zh/en locale）；cadence **15 min** + 回前台；TTL **15 min**。

---

### §1.2 Open-Meteo 天气（Tier A，免 key）

#### ① 需要的参数

```
https://api.open-meteo.com/v1/forecast
  ?latitude=39.9042&longitude=116.4074
  &current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset
  &timezone=Asia%2FShanghai&forecast_days=1
```

- `timezone` **必须显式传**（否则 `current.time` 是 UTC 的，`daily` 的「今天」也会按 UTC 切）；
- `forecast_days=1` 让 `daily.*` 数组只回今天一个元素，省一次切片；
- 不需要 `&current=`/`&daily=` 之外的任何 key；文档里 `apikey` 的说明是「Only required to commercial use」。

#### ② 取哪些字段

实测原始响应（974 B / 直接 1379 ms，北京）：

```json
{"latitude":39.89455,"longitude":116.35983,"generationtime_ms":0.207,
 "utc_offset_seconds":28800,"timezone":"Asia/Shanghai","timezone_abbreviation":"GMT+8","elevation":47.0,
 "current_units":{"time":"iso8601","interval":"seconds","temperature_2m":"°C","apparent_temperature":"°C",
                  "relative_humidity_2m":"%","weather_code":"wmo code","wind_speed_10m":"km/h","precipitation":"mm"},
 "current":{"time":"2026-09-29T00:45","interval":900,"temperature_2m":18.8,"apparent_temperature":19.8,
            "relative_humidity_2m":80,"weather_code":3,"wind_speed_10m":4.7,"precipitation":0.00},
 "daily_units":{"time":"iso8601","weather_code":"wmo code","temperature_2m_max":"°C","temperature_2m_min":"°C",
                "precipitation_probability_max":"%","sunrise":"iso8601","sunset":"iso8601"},
 "daily":{"time":["2026-09-29"],"weather_code":[51],"temperature_2m_max":[26.2],"temperature_2m_min":[17.2],
          "precipitation_probability_max":[47],"sunrise":["2026-09-29T06:08"],"sunset":["2026-09-29T18:00"]}}
```

卡面读：`current.temperature_2m`（当前温度，字符串化后拼 `°`）、`current.weather_code`→中文描述、`daily.temperature_2m_max[0]` / `_min[0]`（今日高低温）、`daily.precipitation_probability_max[0]`（降水概率）、`current.apparent_temperature`（体感，`small` 用）、可选 `sunrise/sunset[0]`。**温度不带单位返回**，units 在 `*_units` 里（永远是 °C / km/h，改 °F 要用 `&temperature_unit=fahrenheit`）。

#### ③ WMO 天气代码映射表的来源

**来源：Open-Meteo 官方文档页 `https://open-meteo.com/en/docs`，锚点小节「WMO Weather interpretation codes (WW)」**（实测拉取该页：`status=200 bytes=532166 ms=1135`，同页还有「Weather code descriptions as JSON: The API only returns numeric weather codes. To display descriptions, map the codes on the client.」）。这是**权威且与 API 同源**的表；WMO 自己的 code table 4677 更大，但 Open-Meteo 的模型**只产出下面这 28 个码**，多出来的码按「未知」处理即可。

完整映射（0–99，实测页面逐行抄录，未增删）：

| code | 英文（官方） | 建议中文 | | code | 英文（官方） | 建议中文 |
|---|---|---|---|---|---|---|
| 0 | Clear sky | 晴 | | 61 | Slight rain | 小雨 |
| 1 | Mainly clear | 晴间多云 | | 63 | Moderate rain | 中雨 |
| 2 | Partly cloudy | 多云 | | 65 | Heavy rain | 大雨 |
| 3 | Overcast | 阴 | | 66 | Light freezing rain | 冻雨（轻） |
| 45 | Fog | 雾 | | 67 | Heavy freezing rain | 冻雨（强） |
| 48 | Depositing rime fog | 雾凇 | | 71 | Slight snowfall | 小雪 |
| 51 | Light drizzle | 毛毛雨（轻） | | 73 | Moderate snowfall | 中雪 |
| 53 | Moderate drizzle | 毛毛雨 | | 75 | Heavy snowfall | 大雪 |
| 55 | Dense drizzle | 毛毛雨（密） | | 77 | Snow grains | 米雪 |
| 56 | Light freezing drizzle | 冻毛毛雨（轻） | | 80 | Slight rain showers | 阵雨（轻） |
| 57 | Dense freezing drizzle | 冻毛毛雨（密） | | 81 | Moderate rain showers | 阵雨 |
| | | | | 82 | Violent rain showers | 强阵雨 |
| | | | | 85 | Slight snow showers | 阵雪（轻） |
| | | | | 86 | Heavy snow showers | 强阵雪 |
| | | | | 95 | Thunderstorm | 雷阵雨 |
| | | | | 96 | Thunderstorm with slight hail * | 雷阵雨伴小冰雹 |
| | | | | 97 | Heavy thunderstorm | 强雷阵雨 |
| | | | | 99 | Thunderstorm with heavy hail * | 雷阵雨伴大冰雹 |

> 官方脚注（原文抄录）：`(*) Codes 96 and 99 are only reported by models with an explicit hail forecast, such as DWD ICON or UKMO. All other models derive thunderstorms from instability parameters and report codes 95 and 97.`
> 96/99 表里带 `*`，卡面文案可省略该标记（不影响语义）。**中文列是建议译文，不是官方文案**——本仓库 `manifest.json` 的 `locale` 本来就要写 zh/en 两份，照抄官方英文即可保证 en 侧权威。

#### ④ 实测请求（北京 39.9042,116.4074）

```
mode=DIRECT status=200 bytes=974 ms=1379
current: {"time":"2026-09-29T00:45","interval":900,"temperature_2m":18.8,"apparent_temperature":19.8,
          "relative_humidity_2m":80,"weather_code":3,"wind_speed_10m":4.7,"precipitation":0}
daily:   {"time":["2026-09-29"],"weather_code":[51],"temperature_2m_max":[26.2],"temperature_2m_min":[17.2],
          "precipitation_probability_max":[47],"sunrise":["2026-09-29T06:08"],"sunset":["2026-09-29T18:00"]}
utc_offset_seconds: 28800 tz: Asia/Shanghai GMT+8 elevation: 47
# 走代理同请求：2898 ms（340 B，gzip 后的长度差异；正文一致）
```

**参数错误的实测降级形状**（卡面必须能吃掉这些）：

```
400  lat=999            bytes=81  ms=864  {"error":true,"reason":"Latitude must be in range of -90 to 90°. Given: 999.0."}
400  lon missing        bytes=100 ms=207  {"reason":"Parameter 'latitude' and 'longitude' must have the same number of elements","error":true}
400  bad param name     bytes=223 ms=208  {"reason":"Invalid value: Cannot initialize SurfacePressureAndHeightVariable<…> from invalid String value temperatur_2m","error":true}
400  bad timezone       bytes=42  ms=200  {"reason":"Invalid timezone","error":true}
200  no params at all   bytes=0   ms=200  （空体！）
```

最后一条很重要：**`/v1/forecast` 不带任何参数会返回 `200` + 空体**——客户端「空 body / 无 `current`」必须当作**无数据**，不能当成功。

#### ⑤ 城市名 → 经纬度：Open-Meteo geocoding **免 key 可用（实测）**

```
geocode "Beijing" status=200 bytes=903 ms=1176 results=3 -> 北京 / 北京市 / CN (39.9075,116.39723) tz=Asia/Shanghai pop=18960744 feature=PPLC
geocode "北京"     status=200 bytes=903 ms=230  results=3 -> 北京 / 北京市 / CN (39.9075,116.39723) tz=Asia/Shanghai pop=18960744 feature=PPLC
geocode "Shenzhen" status=200 bytes=920 ms=235  results=3 -> 深圳 / 广东 / CN (22.54554,114.0683) tz=Asia/Shanghai pop=17494398 feature=PPLA2
geocode "Urumqi"   status=200 bytes=939 ms=226  results=3 -> 乌鲁木齐 / 新疆 / CN (43.80096,87.60046) tz=Asia/Urumqi pop=3029372 feature=PPLA
geocode "Nowhere-xyzzy" status=200 bytes=32 ms=236 results=0 -> none
```

- **中文名直接可用**（不经翻译），并且同时返回 `timezone`（可以直接喂给 forecast 的 `timezone=`，不用自己猜）；
- 不认识的词返回 `{"generationtime_ms":…}` + **无 `results` 键**（200，不是 404）；
- `count=1000` → `400 {"error":true,"reason":"Parameter count must be between 1 and 100."}`；
- `name=` 空 → 200 + 无 results（1.7 s，比正常慢）。

**结论：`place`（城市名）可以作为唯一配置项**，host 侧 geocode 一次，把 `{lat,lon,tz,name}` 缓存 **24 h**（地名→坐标几乎不变），天气本身缓存 10 min。

#### 卡面

```
┌──────────────────────────────┐
│ 天气 · 北京                阴 │  title + headRight(WMO 中文描述)
│ 19°                          │  headAfter.big = 当前温度
│ 体感 20° · 湿度 80%           │  headAfter.small（灰字一行）
│ ┌────────┬────────┬────────┐ │
│ │今日最高 │今日最低 │降水概率 │ │  chart.figures 三格（与 github-board 同形）
│ │  26°   │  17°   │  47%   │ │
│ └────────┴────────┴────────┘ │
└──────────────────────────────┘
```

`bodyAnchor:'bottom'`（figure 行贴卡底，`github-board` / 额度管理 就是这个姿态）。

**为什么不给 `headRing`**：`headRing` 的语义是「占比 0..1」，温度没有分母；硬塞一个「今日进度」环是编造。

`configSchema`：

| key | type | default | 说明 |
|---|---|---|---|
| `place` | text | `''` | 城市名（中/英皆可）。与 `lat/lon` 二选一；都空 → 卡不出现 |
| `lat` | text | `''` | 显式纬度（覆盖 place） |
| `lon` | text | `''` | 显式经度 |
| `units` | mode | `'c'` | `[['c','摄氏度'],['f','华氏度']]` |
| `refresh` | mode | `'10'` | `[['10','10 分钟'],['30','30 分钟'],['60','1 小时']]`（驱动共享轮询取最短值，抄 `sysinfo` 的 `resolveInterval` 模式） |

**降级**：`place` 与坐标都空 → `null`；geocode 无结果 → `null` + `cardHint:'找不到这个地点'`；API 400 → `null` + `cardHint` 带上游 `reason`（**照抄上游原文，不翻译、不润色**，它本来就是给开发者看的）；网络失败 → 保留上一次好数据。**不显示 `--°` 假数字**。

**复用原语**：`headAfter`(big/small) · `headRight` · `figures` · `bodyAnchor` · `cardHint`。想要小时趋势再加 `line`（`&hourly=temperature_2m&forecast_days=1`，24 个点，卡面高度够但会把三格 figures 挤掉——建议放 2×4 变体）。

**代价**：`src/host/weather.ts` ≈ **90–120 行**（WMO 表 ~30 行 + geocode 缓存 ~25 + 路由参数校验 ~30）；客户端同 ICS 家族结构；cadence **10 min**、TTL **10 min**（geocode TTL 24 h）。

---

### §1.3 RSS / Atom

#### ① Node 里最小做法：切片 + 正则，边界写清楚

不需要 XML 解析器。策略：按 `<item>` / `<entry>` 切片 → 每片里取 4 个标签 → 去 CDATA → 解实体 → 去内层标签。

```ts
export function parseFeed(xml: string) {
  const kind = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml) ? 'atom' : 'rss'
  const outer = kind === 'atom' ? 'entry' : 'item'
  const re = new RegExp(`<${outer}\\b[^>]*>([\\s\\S]*?)</${outer}>`, 'gi')
  for (let m = re.exec(xml); m !== null; m = re.exec(xml)) {
    // rss: <link>URL</link>（或 <link href>）; atom: <link rel="alternate" href="URL"/>
    // 日期: rss <pubDate>/<dc:date>; atom <updated>/<published>
    // 摘要: <description> / <summary>
  }
}
```

**失效边界（必须知道）**：
1. **`<link href>` 的 `rel` 必须挑 `alternate`**：Atom 里 `<link rel="replies" …>`、`rel="self"` 可能排在前面；我这次抽到的 V2EX 恰好 `alternate` 在第一位才「碰对」了。
2. **CDATA 里出现 `]]>` 或嵌套 `<item>` 会截断**（正则无法处理嵌套/转义后的闭合）；
3. **命名空间前缀**（`<dc:date>`、`<content:encoded>`）靠字面匹配，换个前缀（`<ns0:date>`）就丢；
4. **HTML 实体只有常见子集**被解（`&amp;` 必须最后解，否则 `&amp;lt;` 会二次解码）；
5. **`<title>` 里带内联标签**（`<b>`、`<img>`）会被 `stripTags` 吃掉内容——实测 5 个 feed 里 0 例，但它是这类解析器的典型爆点。
   → **替代**：真需要健壮性就上 `fast-xml-parser`/`htmlparser2`（新依赖，本仓库当前零运行时依赖，建议**先不装**，用上面的边界说明兜住）。

#### ② 实测（5 个真 feed）

```
=== hnrss-frontpage [direct]  status=200 bytes=15725  netMs=1431 parseMs=1.11 kind=rss  items=20 feedTitle="Hacker News: Front Page"
  - "The problem is not the AI code, but nobody knows anything anymore" | Mon, 28 Sep 2026 16:11:42 +0000 | https://www.ssp.sh/… | summary=190B
  - "13 Months Sober (2025)"                                            | Mon, 28 Sep 2026 16:11:40 +0000 | https://www.bobbytables.io/… | summary=142B
  - "Pirating the Pirates"                                              | Mon, 28 Sep 2026 15:54:15 +0000 | https://mubi.com/… | summary=154B
  items with no link or no title: 0 ; titles that still contain markup after strip: 0

=== github-blog [direct]      status=200 bytes=264254 netMs=143  parseMs=0.30 kind=rss items=10 feedTitle="The GitHub Blog"
  - "GitHub Copilot app for Beginners: How to build custom workflows with c…" | Fri, 25 Sep 2026 18:00:00 +0000 | … | summary=313B
  - "Improving site performance by shipping more CSS"                          | Fri, 25 Sep 2026 15:00:00 +0000 | … | summary=145B
  items with no link or no title: 0

=== v2ex-atom [tunnel]        status=200 bytes=89154  netMs=2496 parseMs=1.47 kind=atom items=50 feedTitle="V2EX"
  - "[程序员] ai 时代，怎么样快速建站？"        | 2026-09-28T12:30:17Z | https://www.v2ex.com/t/1245381#reply0 | summary=0B
  - "[iPhone] iPhone 18 Pro Max 到底要不要贴钢化膜？" | 2026-09-28T08:14:17Z | https://www.v2ex.com/t/1245380#reply0 | summary=0B
  items with no link or no title: 0

=== sspai [direct]            status=200 bytes=6662   netMs=110  parseMs=0.45 kind=rss  items=10 feedTitle="少数派"
  - "派评 | 近期值得关注的 App"                    | Mon, 28 Sep 2026 17:45:02 +0800 | https://sspai.com/post/115094 | summary=114B
  - "基于 Termux 的 Android 手机开发服务器实操"    | Mon, 28 Sep 2026 17:33:03 +0800 | https://sspai.com/prime/story/… | summary=240B
  items with no link or no title: 0

=== infoq-cn [direct]         status=200 bytes=13695  netMs=221  parseMs=0.41 kind=rss  items=20 feedTitle="InfoQ - 促进软件开发领域知识与创新的传播"
  - "Cloudflare 推出智能体开发栈生命周期，以取代传统 SDLC" | Mon, 28 Sep 2026 22:17:00 GMT | https://www.infoq.cn/article/… | summary=130B
  items with no link or no title: 0
```

要点：**解析成本可忽略（0.3–1.5 ms）**，成本全在网络；V2EX 只有走代理才通（直连 10.5 s 超时）；`github.blog` 一个 feed 就是 **264 KB**（10 条），是 4 个源里最"胖"的——**这决定了必须 host 侧缓存 + 只回 3 条**（回给浏览器的是几十字节，不是 264 KB）。

#### 卡面：一条资讯塞进 150px 的取舍

```
┌──────────────────────────────┐
│ Hacker News                  │  title = feed 标题（来自 <title>，不是 URL）
│ 更新于 12 分钟前 · 共 20 条     │  legend（相对时间 + 总条数）
│ ──────────────────────────── │
│ 1 The problem is not the AI… │  breakdown row 1（长标题右缘渐隐）
│ 2 13 Months Sober (2025)     │  breakdown row 2
│ 3 Pirating the Pirates       │  breakdown row 3
└──────────────────────────────┘
```

- **条数固定 3**（150px 扣掉标题两行，只剩 3 行可读；4 行会挤到 8px 以下）。
- **标题不截断成省略号，交给 breakdown 的右缘渐隐**——全角/半角混排下按字符数截断反而更难看；真要截就按 **~22 个半角当量**（≈11 个汉字）预留，并把「被截」当成正常状态。
- `value` 空着：这张卡的「大数字」如果放条数会和 legend 的「共 20 条」重复。**一个数据只出现在一个地方**。
- 2×4 变体可以把 3 行变 5 行、并加 `headAfter.big` = 最新一条的发布时间。

`configSchema`：

| key | type | default | 说明 |
|---|---|---|---|
| `url` | text | `''` | feed 地址（http/https）。空 → 卡不出现 |
| `count` | mode | `'3'` | `[['1','1 条'],['2','2 条'],['3','3 条']]` |
| `refresh` | mode | `'15'` | `[['10','10 分钟'],['15','15 分钟'],['30','30 分钟'],['60','1 小时']]` |
| `showFeedTitle` | toggle | `true` | title 用 feed 自带标题还是用户昵称 |

**降级**：`url` 空 → `null`；200 但 0 条 → `null` + `cardHint:'这个订阅没有条目'`；HTTP 失败 → 保留上一次好数据 + `cardHint`；**非 XML（HTML 错误页）要靠「找不到 `<item>`/`<entry>`」判定**，不要靠 content-type（很多 feed 是 `text/xml`、`application/rss+xml`，也有站点发 `text/plain`）。

**复用原语**：`breakdown` · `legend` · `cardHint` · `headAfter`(2×4 变体) · `figures`（若要做「N 条未读」多 feed 汇总）。

**代价**：`src/host/feeds.ts` ≈ **110–140 行**；cadence **15 min**、TTL **10 min**；单卡回包 ~400 B（3 行），上游 6.6–264 KB 全在 host 缓存后面。

---

### §1.4 GitHub 待我处理（`GET /notifications`）

#### ① 与现有三级凭据阶梯的兼容性：**匿名档直接不可用（实测 401）**

```
cred rung 2 (gh auth token): ok, 40 chars, 72ms
401  anonymous /notifications                   bytes=120  ms=426  remaining=59 message="Requires authentication"
200  token /notifications (default = unread)    bytes=2    ms=530  remaining=4998 array len=0 reasons={} unread=0
200  token /notifications?all=true              bytes=85034 ms=503 remaining=4997 array len=16 reasons={"ci_activity":9,"author":5,"comment":1,"mention":1} unread=0
200  token /notifications?participating=true    bytes=38057 ms=454 remaining=4996 array len=7  reasons={"author":5,"comment":1,"mention":1}
200  token /notifications?all=true&since=2020-01-01 bytes=85034 ms=478 remaining=4995 array len=16
200  token /rate_limit                          bytes=1232 ms=326 remaining=5000 core=5000/5000 search=30/30
200  anonymous /rate_limit                      bytes=424  ms=59  remaining=59   core=59/60 search=10/10
```

结论：
- **`auth === 'anonymous'` 时这张卡必须不出现**——不是「显示 0」，是 401。这与 `github-issues`（匿名还能看 issue 数）**不同**，所以不能照抄它的 `emptyHint`。
- 匿名 60/h 的问题在这张卡上不存在（根本用不了）；**token 档是 5000/h**，5 分钟一次 = 12 次/h，占 0.24%。
- `gh` CLI 档的 token **scope 里没有 `notifications`**（实测 scopes 只有 `gist, read:org, repo, workflow`），但 `/notifications` **实测 200**——因为该端点接受 **`notifications` 或 `repo`** 任一枚。所以 rung 2 在这台机器上直接可用，**不需要用户重新授权**。
- **`x-poll-interval: 60`**：GitHub 明确要求客户端**不快于 60 s** 轮询。5 min 完全合规。

#### ② 返回字段 → 卡片需要哪些

一次真实条目的完整形状（实测，`ci_activity` 那条）：

```json
{"id":"25673173338","unread":false,"reason":"ci_activity","updated_at":"2026-09-15T05:24:13Z",
 "last_read_at":"2026-09-16T11:37:26Z",
 "subject":{"title":"Publish Package workflow run, Attempt #2 failed for v1.5.0 branch",
            "url":null,"latest_comment_url":null,"type":"CheckSuite"},
 "repository":{"full_name":"Physicolor/dsh-widgets","html_url":"https://github.com/Physicolor/dsh-widgets","private":false, "owner":{…完整 user 对象…}},
 "url":"https://api.github.com/notifications/threads/25673173338",
 "subscription_url":"https://api.github.com/notifications/threads/25673173338/subscription"}
```

顶层键：`id, unread, reason, updated_at, last_read_at, subject, repository, url, subscription_url`；
`subject` 键：`title, url, latest_comment_url, type`；
`reason` 实测出现集：`ci_activity, author, comment, mention`（本账号 16 条里 `review_requested` / `assign` 各 0 条）。

「待我处理」过滤器 = `reason ∈ {review_requested, mention, team_mention, assign}`（实测 16 条里命中 **1** 条，`mention`）：

```
{"id":"25100687940","unread":false,"reason":"mention","updated_at":"2026-08-16T04:58:22Z",
 "title":"Add Physicolor/harness-ui-enhancer & Physicolor/harness-widgets (UI Enhancements)",
 "type":"PullRequest","url":"https://api.github.com/repos/awesome-dsh-plugin/awesome-dsh-plugin/pulls/535",
 "repo":"awesome-dsh-plugin/awesome-dsh-plugin","number":"535"}
```

**三个必须处理的形状坑**：
1. **`subject.url` 可以是 `null`**（`CheckSuite` 类型就是）。卡面不能让链接不可点却有链接样式——`url === null` 时整行不渲染跳转。
2. **`subject.url` 是 API URL，不是网页 URL**；payload 里**没有 `html_url`**。要跳浏览器得自己转：`https://api.github.com/repos/{o}/{r}/pulls/{n}` → `https://github.com/{o}/{r}/pull/{n}`（issues 同理），而 `CheckSuite` 的 URL（`/check-suites/{id}`）**没有对应的网页地址** → 只能跳到 `repository.html_url`。实测 `list[0].subject.url` 为 null 时推导结果就是 `undefined`。
3. **payload 很胖：16 条 = 85 KB**（`repository.owner` 整个 user 对象都内联了，且**没有 `fields` 裁剪参数**，GraphQL 也没有 notifications 字段）。ETag 是解药：

```
poll1 status=200 bytes=85034 ms=558
  x-poll-interval: 60
  etag: W/"a5acbc20358548a82c71a0a1b6e9b552a11a654e10982cd0300a5a8bcfd51d15"
  last-modified: Tue, 15 Sep 2026 05:24:13 GMT
  x-ratelimit-remaining: 4993
  cache-control: private, max-age=60, s-maxage=60
poll2 (If-None-Match) status=304 ms=460 remaining=4993   ← 304 不扣配额
poll3 (If-Modified-Since) status=304 ms=478 remaining=4993
```

`gh api notifications?all=true&per_page=100`（CLI 路径，host 侧 rung 2 的现实形态）：

```
gh api notifications: 1055ms bytes=85034 items=16 reasons=["ci_activity","author","comment","mention"]
```

（1 055 ms 里含 `gh` 进程启动 ~500 ms；host 侧应走 `ctx.credentials` / `gh auth token` + 自建 fetch，而不是每次 spawn `gh api`——现有 `resolveGitHubCred` 已经把「`gh auth token` 缓存 5 min」做掉了。）

#### 卡面

```
┌──────────────────────────────┐
│ 待我处理                     │  title
│ 1                            │  value（大数字 = 命中过滤器的条数）
│ mention · PR #535 · 6 周前    │  sub（最新一条：reason + 编号 + 相对时间）
│ ──────────────────────────── │
│ awesome-dsh-plugin/…  未读    │  breakdown row（仓库 · 未读标记）
│ dsh-widgets · ci 失败  已读    │  （仅当 all/unread 模式；await 模式通常只有 1 条）
└──────────────────────────────┘
```

- `await` 模式实测只有 1 条 → 卡面以**大数字 + 一行**为主，不要硬撑 3 行。
- `all` 模式下 16 条里有 9 条 `ci_activity`，**建议默认过滤掉 CI**（`-reason:ci_activity`），否则这张卡会变成「我的仓库今天又红了」——那是另一个卡（`github-push`）的事。
- 需要动作的卡可以带 `corner`（一键已读 = `PATCH /notifications/threads/{id}`）——**这属于「自带动作的卡」**，即使 0 条也可以留着角标；但默认先不做写操作。

`configSchema`（并入现有 `githubConfigSchema()`，或独立一份）：

| key | 类型 | default | 说明 |
|---|---|---|---|
| `filter` | mode | `'await'` | `[['await','待我处理'],['unread','未读'],['all','全部']]` |
| `repos` | text | `''` | 只看这些仓库（`owner/name,owner/name`，空 = 全部） |
| `includeCi` | toggle | `false` | 是否把 `ci_activity` 计入 |
| `participating` | toggle | `false` | 只看我参与过的 |

**降级**：`github.auth === 'anonymous'` → **卡不出现**（401 的语言解释比一张 0 的卡诚实）；token 有效但 0 条 → **出现**且 `value:'0'`、`legend:'没有待你处理的事'`（0 是**真实测量值**，不是缺失）；HTTP 403（配额）→ 保留上次好数据 + `cardHint`；`subject.url === null` → 该行不可点。

**复用原语**：`value`（大数字）· `sub` · `breakdown` · `legend` · `headAfter`(可选) · `corner`(仅做已读动作时) · `cycle`（多仓库过滤时）。

**代价**：在 `github.ts` 里加 **80–110 行**（`fetchNotifications(cred)` ~50 + 一个 memo ~5 + 路由参数解析 ~20），**复用** `resolveGitHubCred` / `githubFetch` / `githubHeaders` / `memoTtl`；客户端 **0 个新 effect**（并进现有 GitHub 家族循环，`?notifications=1` 挂在同一路由上，`ghRequest` 拼串里加一位）；cadence **5 min**（远高于 GitHub 要求的 60 s 地板）+ 回前台；TTL **5 min**，ETag 透传后稳态是 304/0 字节。

> 路由形状建议：**不新增路由**，在 `/api/github` 上加 `notif=await|unread|all` 参数（响应多一片 `notifications:{awaiting,unread,items[]}`）。理由是现有 `G7 snapshot-host-routes.mjs` 已断言「有路由无案例即红」，同路由加参数只需加 1 条 case；新路由要同步改注册表 + 案例 + 基线。

---

## §2 建议的 host 模块与路由形状

### §2.1 新的 host 模块

```
src/host/http.ts          （已有）memoTtl / readJsonBody —— 全部新路由复用
src/host/proxy.ts         新增 ~45 行   ProxyHttpsAgent + proxyFromEnv()（§1.0 B 方案）
src/host/calendar.ts      新增 ~230 行  ICS 解析 + RRULE 子集 + 今日窗口 + 路由
src/host/weather.ts       新增 ~105 行  WMO 表 + geocode 缓存 + forecast 路由
src/host/feeds.ts         新增 ~125 行  RSS/Atom 切片解析 + 路由
src/host/github.ts        +~95 行       resolveGitHubCred 导出 + notifications 片
src/host/routes.ts        +3 行         registerCalendar / registerWeather / registerFeeds
```

**统一形状**（照抄 `github.ts` 的既有约定）：

- 每个 module 一个 `memoTtl(ttl)` 的**模块级** memo（注释里 github.ts 已说明原因：插件重载不该重新花掉上游预算）；
- 每个 handler 先 `try { … } catch` → `res.writeHead(502, {'Content-Type':'application/json'})`；
- 每片**可独立为 null**，并带一个稳定的 error code（`'unloaded' | 'unavailable' | 'not-ics' | 'not-feed' | 'no-place' | 'bad-url' | 'rrule-unsupported'`），客户端据此说人话（`github.ts` 的 `errors` 字典就是这个模式）；
- 上游超时 **8–9 s**（沿用 `GITHUB_TIMEOUT_MS = 9000`）；响应体上限 **512 KB**（RSS 有 264 KB 的真实样本）。

### §2.2 路由形状

```
GET /api/calendar?url=<encodeURIComponent>&days=1|3|7&tz=<IANA>&allday=0|1
 -> { tz, from, to, events:[{uid,title,start,end,allDay}], unsupported, error }
    events ≤ 50（超出截断并把 unsupported/truncated 报出来）

GET /api/weather?place=<名称>            （或 ?lat=&lon=）
                &units=c|f
 -> { place:{name,admin,country,lat,lon,tz}, now:{temp,feels,code,text,humidity},
      today:{hi,lo,pop,code,text,sunrise,sunset}, units, error }

GET /api/feeds?url=<encodeURIComponent>&count=1|2|3
 -> { feed:{title,kind}, items:[{title,link,at}], total, error }

GET /api/github?...&notif=await|unread|all&notifRepos=…
 -> 既有 body + { notifications:{ awaiting, unread, items:[{reason,title,repo,number,unread,updatedAt,url}] } }
```

### §2.3 两条必须写进实现的硬约束

1. **SSRF**：`url` 来自用户逐卡配置的文本，host 去 fetch 它。必须
   - 只允许 `http:` / `https:`（挡 `file:`、`data:`）；
   - 解析后的 host 若是 `localhost` / `127.0.0.0/8` / `::1` / `169.254.0.0/16` / RFC1918 私网段 → 拒绝（`error:'bad-url'`）；
   - 限制重定向次数（≤3）**并重新校验每一跳的目标**；
   - 限制响应体大小（512 KB）与超时（9 s）。
2. **凭据不外泄**：只有 GitHub 那条路要 token，且**只在 host 侧**加 `Authorization`。ICS/RSS/天气是 public URL，**永远不要**把 `GITHUB_TOKEN` 或者 `ctx.credentials` 里任何东西附加到这些请求上——一个恶意 feed 地址就能把它钓走。

### §2.4 闸门成本（真实存在的，不是估计）

| 闸门 | 新增/改动 |
|---|---|
| **G1 `gen-registry --check`** | `SOURCES = ['usage','cc','sys','github']` 必须加新 source（calendar/weather/feeds 三个，或合并成 `feeds` 一个）；每个新 unit 一个 `manifest.json`（含 `locale.zh`/`locale.en` 与 `skeleton.shape`） |
| **G2 `validate-widget-unit`** | 新 unit 一律要过（当前 40 个） |
| **G4 `snapshot-render`** | 新 unit 的渲染快照进基线（当前 110） |
| **G7 `snapshot-host-routes`** | **「有路由无案例即红」**：3 个新路由各至少要 1 条 case（建议 4 条：calendar 正常 + 无参；weather 正常 + 无参；feeds 正常；github-notif）。这也是**把 notifications 并进 `/api/github`** 的理由 |
| G3 `verify-tsc-baseline` | 新增代码必须 0 新错（TS2307/2580/7016 的容忍规则见 ARCHITECTURE_REFACTOR_REPORT §16） |
| G5 `extract-css` | 不动 CSS 就无影响 |

### §2.5 客户端改动点

- `src/client/data/collector.tsx`：加 1–3 个 effect（**每个 family 一个**，把已安装实例的 config 合并成**一次**请求，抄 GitHub 那段 `ghKeys/ghRequest` 的写法），并在 state 上加 `calendar/weather/feeds` + 对应 error 字段；必须沿用 **stale-while-error**（失败不擦掉上一次好数据）。
- `src/client/lib/contract/types.ts`：4 个 payload 接口（沿用 `GitHubData` 的注释密度：字段逐个说明来源与 null 的含义）。
- `src/client/families/{calendar,weather,feeds}/`：`data.ts`（configSchema + 选择/降级 helper）+ `renders.ts`（卡面）。
- `src/widgets/<id>/{index.ts,manifest.json}`：每个 unit 两个小文件，`manifest.json` 的 `locale` 带 zh/en；`source` 填新值；`skeleton.shape` 用 `'text'`（日历/RSS/GitHub）与 `'figures'`（天气）。
- **不需要动**中心 i18n 文件——manifest 自带字典（`gen-registry.mjs` 的 `MANIFEST_KEYS` 含 `locale`）。

### §2.6 汇总代价与 cadence

| 卡片 | host 行数 | 客户端 | 轮询 | TTL | 冷启动实测 | 命中缓存 |
|---|---|---|---|---|---|---|
| 今日日程 | 230 + 45(proxy) | 1 effect + family + unit | 15 min | 15 min | 368 ms（iCloud CN） | 0 ms |
| 天气 · 北京 | 105 | 1 effect + family + unit | 10 min | 10 min / geo 24 h | 785 ms | 0 ms |
| 资讯（RSS） | 125 | 1 effect + family + unit | 15 min | 10 min | 2480 ms（hnrss） | 0 ms |
| 待我处理 | +95（github.ts） | 0 新 effect | 5 min + ETag | 5 min | 720 ms（含 `gh auth token` 72 ms 与一次冷 200；稳态 304 为 460–478 ms） | 0 ms |

四个一起、并行一趟 host 路由（`%TEMP%\dsx-audit\composite.mjs`，含真实上游）：

```
=== host route pass #1 (parallel) total=2496ms
  ics     cached=false computeMs=368   payload=40B   {"rawBytes":69134,"today":0,"sample":[]}
  meteo   cached=false computeMs=785   payload=56B   {"rawBytes":734,"now":18.7,"code":3,"hi":26.2,"lo":17.2}
  rss     cached=false computeMs=2480  payload=78B   {"rawBytes":15725,"items":20,"top":"The problem is not the AI code…"}
  notify  cached=false computeMs=720   payload=51B   {"rawBytes":85034,"ms":651,"awaiting":1,"unread":0}
=== host route pass #2 (parallel) total=0ms      ← 全部 memo 命中
```

**这一趟的上游总流量 ≈ 171 KB**（69 + 0.7 + 15.7 + 85），其中 **85 KB 是 notifications**——这就是为什么 ETag/304 值得写（稳态下它降到 0 字节）。

---

## §3 明确不做的项与理由

| 不做 | 理由（实测依据） |
|---|---|
| **SOCKS5（`socks5h://`）零依赖支持** | Node 标准库没有 SOCKS 客户端；undici 内建不可 import（`ERR_MODULE_NOT_FOUND`），`EnvHttpProxyAgent` 也不认 socks。要用只能装 `socks-proxy-agent`。本仓库零运行时依赖，建议**不破例**：文档写「HTTP 代理自动生效（`HTTP(S)_PROXY`），SOCKS 需自备 HTTP 端口」。 |
| **启动期 `--use-env-proxy` 作为实现手段** | 实测可用，但那是**用户**改 `dsh web` 启动参数，且是进程级全局 dispatcher（影响别的插件），还带 experimental 警告。只能作为 README 里的备选。 |
| **Google / Microsoft 日历 OAuth（"读我的私人日历"）** | 需要 OAuth 同意流 + 回调地址 + 刷新令牌存储，远超一个卡片插件的授权面；`ctx.credentials` 也放不下这套流程。ICS 订阅地址（用户自己从 Google/Outlook 复制「秘密地址」）**零代码**达到同样效果。 |
| **需要 key 的天气源（OpenWeatherMap / 和风 / WeatherAPI）** | 授权成本从「零」变成「去注册 → 存 key → key 失效（见本仓库 npm token 那次的教训）」。Open-Meteo 免 key 且已经给到当前温度 + 高低温 + 降水概率，卡面要的东西一个不缺。 |
| **`wttr.in` 作为天气主源** | 实测可用（39 416 B / 838 ms），但一个 `format=j1` 就是 39 KB 且字段是文本化的（"18" 带引号、日期是数组的数组），解析成本高于 Open-Meteo；留作降级备选即可。 |
| **全量 RRULE（`BYSETPOS`/`BYDAY=-1SU`/`BYMONTH`/`EXDATE`/`RECURRENCE-ID`）** | 真 feed 里确实存在（Fedora 52 条 RRULE 中含 `FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10`），但写全它 ≈ 重写半个 `rrule.js`。**策略**：支持子集，遇到不支持的键**显式报 `rrule-unsupported`**，绝不静默退化。真需要时再引 `rrule` 依赖。 |
| **依赖 XML 库解析 RSS（`fast-xml-parser` / `htmlparser2`）** | 5 个真 feed 实测正则路线 0 失败，且解析耗时 0.3–1.5 ms；引入依赖的收益 < 破坏「零运行时依赖」的代价。边界已在 §1.3 逐条写明。 |
| **客户端侧展开 RRULE** | host 展开实测 9–75 ms 且结果 ≤ 2.2 KB（今日）；放客户端等于把 300 个事件 + 一个 recur 引擎塞进已经 1 500 行的 `collector.tsx`，并把「今天」的时区判断交给浏览器。 |
| **RSS 全文抓取 / 阅读模式** | 264 KB 的 feed 已经在提醒：正文抓取会让一个 150px 卡片变成阅读器；且那是另一个产品的授权面（反爬、cookie、付费墙）。 |
| **在 host 里 spawn `gh api notifications`（每次轮询）** | 实测 1 055 ms（含进程启动 ~500 ms）vs 直接 HTTP 503 ms；现有 `resolveGitHubCred` 已把 `gh auth token` 缓存 5 min，**只该拿 token，不该拿 `gh` 当 HTTP 客户端**。 |
| **匿名档下的「待我处理」卡** | 实测 **401 Requires authentication**。匿名时卡不出现。（对比：`/user/repos`、`/repos/{o}/{r}` 匿名可用，所以现有 `github-*` 家族的做法不能照搬。） |

---

## 附：本次全部实测脚本

均位于 `%TEMP%\dsx-audit\`（未写入仓库）：

```
net-probe.mjs        直连/代理出口矩阵（§1.0）
proxy-agent.mjs      28 行 CONNECT 隧道 Agent + 3 目标验证（§1.0 B）
ics-test.mjs         ICS 解析 + RRULE 子集 + 今日窗口（§1.1）
ics-clamped.mjs      时长钳制 + 去重后的今日窗口（§1.1）
ics-payload.mjs      窗口 JSON 体积（§1.1）
ics-candidates.mjs   8 个公开 ICS 端点探测（§1.1）
meteo.mjs            forecast + geocoding 实测（§1.2）
wmo-docs.mjs / wmo-json.mjs  WMO 表抓取（§1.2）
rss-test.mjs         RSS/Atom 切片解析 + 5 feed 实测（§1.3）
gh-notifications.mjs 三级阶梯 × /notifications（§1.4）
gh-poll.mjs          X-Poll-Interval / ETag 304（§1.4）
degrade.mjs          各源的错误形状（§1.2 / §1.3）
composite.mjs        四源并行一趟 + memo 命中（§2.6）
```
