# sys-services — 本地服务与代理出口

## 1. 这张卡回答什么问题

**本机那几个关键端口还在不在听，以及这台机器现在还能不能出网** —— 一句话把「本地服务慢/挂了」和「代理挂了」两类不可见的故障摊在一张卡上。

## 2. 卡面草图（2×2）

```
┌ 本地服务 ─────────────────────┐
│ 3 / 4                         │  headAfter.big：在听的服务数 / 总数
│ 出口 1.3s  ·  代理 0.3ms       │  legend：代理出口延迟（+ 检测中时的 TCP 握手）
│ ──────────────────────────────│  breakdown 自带的发丝分隔线
│ DSH web             通 · 1ms   │
│ Ollama              通 · 2ms   │
│ LM Studio              未运行  │  down 行染 danger
└───────────────────────────────┘
```

`services` 为空数组 / `stats.host` 缺失 → `render` 返回 `null`（整卡不出现）。

## 3. 数据来源

只读 `stats.host`（`/api/host/overview` 路由，本仓库 `src/host/overview.ts` 采集）：

| 字段 | 口径 |
| --- | --- |
| `host.services` = `HostServiceProbe[]` | `node:net` TCP 探活，**永远有值**（可能是空数组）。顺序固定：`DSH web`(3080) / `Ollama`(11434) / `LM Studio`(1234) / `Proxy`(10808)。`ms` = 握手毫秒，失败为 `null` |
| `host.proxy` = `HostProxyHealth \| null` | `tcpMs` = 到代理端口的握手；`egressMs` = **绝对 URI GET**（`GET http://host/path HTTP/1.1`）穿过代理的端到端耗时；`ok` = 该测量的结论；`error` = 失败码 |
| `host.ts` / `net` / `power` / `procs` | **不读**（本卡不展示网速/电源/进程） |

**`tcpMs` 单独不能当结论（本卡存在的理由）**：本机 xray 对**不存在的域名**也回 `200 Connection established`（2026-09-29 实测）。所以「端口在听」不等于「能出网」，真判据只有 `ok` —— 它由 host 侧那条绝对 URI GET 产生。`ok === null` = 探针还在飞（stale-while-revalidate），**不是故障**，印「检测中」。

`null` / `[]` / `—` 的分工：

| 情形 | 呈现 |
| --- | --- |
| `host` 缺失 或 `services === []` | `render` 返回 `null`（这张卡的全部内容就是这些端点，没有端点就没有主题） |
| `host.proxy === null` 或 `proxy.ok === null` | legend = `检测中`（`proxy === null` 时退回不带握手的形式） |
| `up === false` | 该行 value = `未运行` + `tone: 'danger'`，**不印 `—`**（"没在听"是确定的结论，`—` 表示"没测到"） |
| `up === true` 但 `ms === null` | value = `通`（只有状态，没有延迟）—— 这一情形实际不可达（探针只在连接成功时才给 ms），代码里仍然分支，避免以后改动悄悄印出 `通 · null` |

## 4. 元素为什么这么摆

- **大数字 = `up` 的数量 `/` 总数**（`3 / 4`）。这是这张卡唯一能"一眼看完"的量：分母是固定的四个端点，分子告诉你有几个在听。用 `headAfter.big`（不是 `value`）：`value` 是正文数字，在有 `headAfter` 的卡上会被推进正文重复渲染一次。
- **灰字 = 代理出口**（`legend`）。它必须单独占一行灰字而不能混进明细行，因为**代理已经被明细的前三行排除在外**：明细三行是 `services` 里 `key !== 'proxy'` 的前三个（DSH web / Ollama / LM Studio），第四个（Proxy）的存活与结论已经由这一行承载。一件事不说两遍。
- **`检测中` 时 legend 追加端口的 TCP 握手**（`检测中 · 10808 0.2ms`）。出口结论还没有的时候，唯一诚实的读数是那个已经回来的握手；结论一到就撤掉，因为 `egressMs` 本身就是穿过代理的端到端测量，再印握手等于用宝贵的一行复述一个被结论支配的数。
- **明细三行**：标签左、数值右，贴底（`bodyAnchor: 'bottom'`）。行数列固定为三行（`MAX_ROWS = 3`）：头部已是三级阶梯（标题 16 + 4 + 数字 25 + 2 + 灰字 12），第四行会越过 126px 内容盒。
- **`up` 的延迟统一带单位**（`通 · 1ms`），与"这一行是状态 + 读数"的读法一致；`未运行` 单独成词，因为它没有读数。
- **不加 `headRing`**：环是"占比"的语言，这里的分母（4）已经落在大数字里，环只会把 `3 / 4` 说第二遍。
- **`cardHint`（悬停）**：`TCP 在听不等于能出网` 这条纪律，加上失败时的**完整** error 串。

### 延迟的格式化（`fmtMs`）

两个量的量级差三个数量级：回环握手 0.2–2ms，穿代理的出口 GET ~1.3s（2026-09-29 实测）。

- `< 1ms` → 一位小数（`0.2ms`），**永不印成 `0ms`**（那是"没测到"的读法，而它恰恰是本机最常见的读数）；
- `≥ 1000ms` → 换秒（`1.3s`），与 `fmtDuration` 对工具耗时的处理同形。

### 失败码的长度预算（实测，不是猜的）

legend 是一行 `nowrap` + `ellipsis` 的灰字，150px 卡里它的内容盒**实测 124px**（浏览器里用卡片自己的 10px 字体量的）：

| 码 | 字数 | `出口不通（码）` 实测宽 | 结论 |
| --- | --- | --- | --- |
| `EAI_AGAIN` | 9 | 113.9px | 放得下 |
| `ETIMEDOUT` | 9 | 118.3px | 放得下 |
| `port-closed` | 11 | 105.0px | 放得下 |
| `ECONNRESET` | 10 | 125.0px | **已经切掉右括号** |
| `CONNECTION_RESET` | 16 | 160.6px | 严重溢出 |

所以预算是 **9 个字符**（`ERROR_CODE_CHARS`）。它是字符数而不是像素宽，因为 `render` 是纯数据函数，拿不到字体度量。超过预算时 legend 退回**光秃秃的结论** `出口不通`（它本身是完整的一句话），**完整 error 串始终在悬停里**。错误串还会先取「命名 token」：`connect ECONNREFUSED 127.0.0.1:10808` → `ECONNREFUSED`（`connect` 是噪声动词，目标地址那半截又长又与卡上已有的端口重复）。

## 5. 语气方向（tone 的语义由本部件决定）

**服务不可用是坏事**，这是本卡的唯一方向，与「缓存命中（越高越好）」正好相反：

- `up === false` 的行 → `tone: 'danger'`；
- 只要有**任何一个**端点掉线 → 大数字 `valueTone: 'danger'`（规则 = `down > 0`，写成常量 + 注释）。注意这不区分"掉一个"和"全掉"：规格要的是"有掉线就 danger"，而"掉一个"正是最需要被看见的时刻（少一个 MCP 端点和少四个是两种故障，但都值得红）；
- 全部在听 → 大数字**不染色**（本机实测是 3/4，所以默认形态就是红的）；
- `检测中` / `—` 一类的未知 → `muted`（"我还不知道"不是故障）。

规则与阈值全部在 `index.ts` 里，渲染器从不猜。

## 6. 配置项

**无。** 第一版不做实例配置（不引入 `configSchema`）。

## 7. 空态 / 降级行为

| 条件 | 行为 |
| --- | --- |
| `services === []` 或 `host` 缺失 | `render` → `null` |
| `services.length < 3` | 有几行画几行（不补 `—` 占位：端点是真枚举，不是可选项） |
| `host.proxy === null` | legend = `检测中` |
| `proxy.ok === null` | legend = `检测中`（+ 已知时的 TCP 握手） |
| `proxy.ok === false`，码 ≤9 字符 | legend = `出口不通（码）` |
| `proxy.ok === false`，码 >9 字符 / 无码 | legend = `出口不通`，完整码在悬停 |
| `up === true` 且 `ms === null` | value = `通` |

## 8. 与既有卡的差异

`grep` 过现有 44 个单元：**没有任何一张读 `stats.host`**（`sysinfo` 家族读的是 `stats.sysinfo` = CPU/内存/GPU 那条本地采样线；`sys-gpu-line`、`sys-board`、`sys-rings`、`sys-cpu`、`sys-gpu` 全是利用率/温度/显存）。所以这张卡与它们**零重叠**：

- `sysinfo` 家族 = **资源占用**（这台机器有多忙）；
- `sys-services` = **可达性**（这台机器还连不连得上东西）。

`sys-procs`（同批）读 `host.procs` = 内存大户，与端点存活是两回事。

## 9. 预览

```sh
node scripts/preview/gallery.mjs --only sys-services          # 浅色，3 态
node scripts/preview/gallery.mjs --only sys-services --dark   # 深色，3 态
```

产物（`docs/preview/cards/`）：

- `sys-services@2x2.png` / `-dark.png` — 代理出口正常（`出口 1.3s`）
- `sys-services@2x2-s1.png` / `-s1-dark.png` — 出口不通（长错误码 → 光秃秃的 `出口不通`）
- `sys-services@2x2-s2.png` / `-s2-dark.png` — 检测中（`检测中 · 10808 0.2ms`）

`--no-shot` 只建页不截图，`.tmp-gallery/index.html` 可以直接用浏览器打开点着看（点卡片切换三个代理态）。
