# session-cost — 会话成本

## 1. 这张卡回答什么问题

**本会话烧掉了多少钱，这个金额是从哪张价目表来的。**

一句话：把 `stats.usage` 的三桶 token 按价格表折成钱，并把**金额的出处**（官方价 / 中转价 / 免费路由 / 估算价）印在金额旁边；拿不到规则就只印 token，金额列留空。

## 2. 卡面草图（2×2，150×150 内容区）

```
┌──────────────────────────────┐
│ 会话成本                      │  ← 蓝色标题 13px（card.session-cost.title）
│ ≈$0.131                      │  ← 大数字 20px（headAfter.big）
│ 官方价 · deepseek-v4.1-f…     │  ← 灰字 caption 10px（legend：出处 · 模型名，超宽按设计省略）
│ ──────────────────────────── │  ← breakdown 自带发丝分隔线
│ 未命中        200K    $0.03   │  ← 明细三行：标签左 / token 右 / 金额最右
│ 缓存命中     18.4M    $0.055  │
│ 输出         75.6K    $0.045  │
└──────────────────────────────┘
```

token-only 形态（价格表缺失 / `available:false` / 无规则命中 / 无模型路由）：

```
│ 会话成本                      │
│ 18.7M                        │  ← 大数字改成 token 总量
│ 无价格表 · 仅 token            │  ← 灰字说明「为什么没有钱」
│ ──────────────────────────── │
│ 未命中        200K            │  ← 金额列整列消失（不是 `—`，不是 `$0.00`）
│ 缓存命中     18.4M            │
│ 输出         75.6K            │
```

## 3. 数据来源（口径）

| 字段 | 用法 | 口径 |
| --- | --- | --- |
| `stats.usage.{inputTokens,cacheReadTokens,outputTokens}` | 三桶 token | **本会话**；`inputTokens` 已含 cacheRead |
| `stats.modelSelection.next ?? lastUsed` | `{provider, model, reasoningEffort?}`，用来选规则 | 下一次请求实际会走的路由（没有下一次则用最后用的） |
| `stats.pricing` | `PriceTable`（`/api/widgets-pricing` → usage-center 的 `storages/usage-center/pricing.json`） | 只有装了本卡时采集器才请求（`collector.tsx` 的 `wantsPricing`），10 分钟一次 + mtime 缓存 |

**明确不读**：`stats.commandCode.credits`（那是套餐额度占用）、`stats.usageData`（OpenCode 池的口径）。本卡只回答「本会话花了多少钱」，混进额度或别的池子就是混合口径。

**已知缺口（不编数）**：规则里有第四个桶 `cacheWrite`，但 `usage` 契约只有三桶 → **本卡不含 cacheWrite 费用**，也没有把它当 0 计进去（当 0 会系统性低估缓存写入的支出）。契约补上 `cacheWriteTokens` 的那天，`priceSession` 加一行即可。

## 4. 元素为什么这么摆

- **大数字在标题下（`headAfter.big`，不是 `value`）**：这是仓库里唯一的「头部阶梯」写法。`value` 是"正文数字"，在有 `headAfter` 的卡上会被推进正文重复渲染；本卡的正文位置留给了明细行。
- **大数字是金额，不是 token**：卡叫「会话成本」，金额就是答案；所以金额占头部，token 总量只在拿不到规则时顶上来（那时它才是唯一有意义的信息）。
- **灰字 = 出处 · 模型名**：仓库存的纪律是「金额永远带着它的出处」——一个孤零零的 `$0.131` 会被读成账单，而它是按某张价目表算出来的估算。出处放最前（首词），模型名在后并**允许省略**（规格要求「模型名（截断）」）：150px 卡片上 `官方价 · deepseek-v4.1-flash` 放不下，被切掉的是模型名的尾部而不是出处。
- **明细三行贴底（`bodyAnchor:'bottom'`）**：仓库里所有「头部阶梯 + 明细行」的卡都是这个姿态（cache / tokens / quota-manage），明细贴底、头部在上，中间的空隙才不会散。
- **三行是这三个桶**：它们是这张卡**唯一**能各自定价的东西（未命中输入 / 缓存命中输入 / 输出）。标签选了 ≤4 字的短词「未命中 / 缓存命中 / 输出」——三列同排时网格只给标签留 44.6px（实测），5 字的「未缓存输入」(50px) 与英文的 "Uncached input"(75px) / "Cache read"(53px) 都会被淡出裁掉（第一版就是这样）。
- **金额在最右一列（`breakdown.cost`）**：渲染器为它保留了 `minWidth: 30px` 的独立列轨，所以有金额时三行的数字列严格对齐；没有金额时**整列消失**（`cost` 不给），标签拿回整行宽度。
- **金额不染色**：本卡是一个读数，不设任何 `tone`。花得多不等于坏，免费路由也不等于好——把语义留给读者，这是这张卡唯一正确的语气。

### 语气方向（tone）

**没有 tone。** 卡上唯一的颜色是渲染器自己的层级灰（灰字 caption、金额列 tertiary）。大数字走默认的 `label-primary`，明细值也是。这不是漏写，是设计：金额不构成好坏判断。

## 5. 选规则 / 高峰判定 / 金额公式（纯函数，全部导出）

实现全在 `pricing.ts`，全部是纯函数（无 React / DOM / i18n），可被探针直接调用：

| 函数 | 作用 |
| --- | --- |
| `splitUsage(usage)` | 三桶拆分；`uncached = max(0, inputTokens − cacheReadTokens)` |
| `normalizeModelName` / `nameMatches` / `providerMatches` / `modelMatches` | 名字匹配 |
| `ruleIsInForce(rule, now)` | `[effectiveFrom, effectiveTo)` 生效窗口 |
| `selectPriceRule(table, route, now)` | 选规则：provider+model 都命中 → 生效窗口内 → 取 `effectiveFrom` 最新的一条 |
| `clockIn(timezone, now)` | 规则自己的时区墙钟（`{dow, mins}`） |
| `isPeakAt(rule, now)` | 当前是否落在规则自己的 `peakWindows` 内 |
| `ratesFor(rule, now)` | 命中高峰 → `peakRates`，否则 `rates` |
| `priceSession(rule, usage, now, currency)` | 金额 + 每桶金额 + `estimated` |
| `fmtMoney(amount, currency, significant)` | 金额格式化（0 → `$0`；<0.001 → `<$0.001`） |
| `shortModelName` / `sourceKindOf` | 展示用 |

### 名字匹配（实测本机表后决定的语法）

支持且**只**支持：

1. 精确相等（不区分大小写），比较前取**最后一个 `/` 之后的部分**；
2. `*` → 任意；
3. **结尾** `*` → 前缀匹配（`deepseek-*`）。

不支持：中缀/后缀通配（`*-flash`、`deepseek-*-pro`）——这种规则无法一眼验证，匹配器不认识就不匹配，规则被跳过（宁可没有钱，也不猜）。

**为什么必须做前缀归一**：本机真实表里同一个模型有两种写法——DeepSeek 规则写 `deepseek-v4.1-flash`，Command Code 的 fallback 规则写 `deepseek/deepseek-v4.1-flash`，而本会话的 `modelSelection` 报的是 `deepseek/deepseek-v4.1-flash`。按原串比较就会**静默地一条都不命中**（症状看起来像"表里没这个模型"）。归一后 `deepseek/deepseek-v4.1-flash` 与 `deepseek-v4.1-flash` 都能被官方规则选中。

### 高峰判定与**允许的降级**（重要，已标成估算）

`isPeakAt` 用规则自己的 `timezone`（缺省 UTC）与 `peakWindows`（`days` 空 = 每天；`start > end` = 跨午夜；时钟串解析不了就跳过该窗口，绝不当成"全天高峰"）判定当前时刻。表里 12 条规则的 `timezone` 实测都是 `UTC`，所以 `01:00–04:00` 这类窗口是按 UTC 判的。

**降级**：本卡的金额是**按当前时刻的费率算整段会话**，不是逐小时切分。原因是数据结构而不是偷懒——`stats.usage` 只有总量，**没有逐请求时间戳**，"18.4M 缓存读取里有多少发生在高峰时段"在数据里根本不存在。因此：

- 规则有 `peakRates` 且 `peakWindows` 非空时，`priceSession` 返回 `estimated: true`；
- 卡片把这个事实**说出来**：大数字前加 `≈`，鼠标悬停给出完整理由（`cardHint`：「按当前费率估算整段：会话记录里没有逐请求时间戳，无法把高峰 / 低谷时段分开计价，所以金额是估算值（≈）」）；
- 规则没有高峰/低谷之分（`peakRates: null`，例如 ollama 本地与 OpenCode 免费档）时是**精确值**，不加 `≈`。

### 金额公式（每 M token 单价 × 桶大小 / 1e6）

```
cost = inputCacheMiss × uncached     / 1e6      // uncached = max(0, inputTokens − cacheReadTokens)
     + inputCacheHit  × cacheRead    / 1e6
     + output         × outputTokens / 1e6
```

**手算例子**（就是本卡 preview 的数据，也是截图上的数字）：
`usage = { 18_600_000 input, 18_400_000 cacheRead, 75_600 output }` → `未命中 200_000 / 缓存命中 18_400_000 / 输出 75_600`。

低谷（官方 V4.1 Flash `rates` = 0.003 / 0.15 / 0.60 USD per M）：

```
200_000     × 0.15  / 1e6 = 0.0300
18_400_000  × 0.003 / 1e6 = 0.0552
75_600      × 0.60  / 1e6 = 0.04536
                   amount = 0.13056   →  卡面 ≈$0.131，三行 $0.03 / $0.055 / $0.045
```

高峰（同一规则的 `peakRates` = 0.006 / 0.30 / 1.20，恰为低谷的 2 倍）：

```
200_000     × 0.30  / 1e6 = 0.0600
18_400_000  × 0.006 / 1e6 = 0.1104
75_600      × 1.20  / 1e6 = 0.09072
                   amount = 0.26112   →  卡面 ≈$0.261，三行 $0.06 / $0.11 / $0.091
```

（用错时段是**翻倍**而不是差几分钱，所以这张卡宁可印 `≈` 也不假装知道逐小时分布。）

**行金额用 2 位有效数字、总额用 3 位**：这是排版权衡而不是精度取舍。实测网格宽 124px、两个 gap 各 8px、最宽的数字列 31.6px，金额列有 30px 保底 → 标签只有 44.6px。3 位有效数字的行金额（`$0.0552`，37.6px）把标签挤掉，2 位（`$0.055`，31.7px）留出 6.5px。所以「≈$0.131」是精的，行的份额是缩写的——**三行相加可能与总额差最后一位**，这是展示精度，不是计算误差。

## 6. 配置项

**无**（第一版，规格如此）。没有 `configSchema`，也没有实例级设置：价格表本身由 usage-center 维护，卡片不提供覆盖入口（避免出现"界面上的价格"与"表里的价格"两个真相）。

## 7. 空态 / 降级行为

| 情况 | 行为 |
| --- | --- |
| `usage` 为 `null` | `render` 返回 `null`（整卡不出现） |
| `usage` 三桶相加为 0 | `render` 返回 `null` |
| `pricing` 为 `null`（未读取 / 尚未返回） | **卡仍然渲染**：大数字 = token 总量，灰字「无价格表 · 仅 token」，明细金额列整列消失 |
| `pricing.available === false` | 同上（host 明确说"没有表"，且**没有**内置回退价） |
| 表存在但一条规则都没命中（模型不在表里） | 同上，灰字「无匹配价 · 仅 token」 |
| `modelSelection` 为 `null` | 同上，灰字「无模型路由 · 仅 token」 |
| 规则命中但费率为 0（本地 / 免费路由） | 正常印金额：`$0`，出处写「免费路由」——**真实的 0 不是未知** |
| `uncachedInput` 为负（脏数据） | 钳成 0 |

三种"没有钱"的原因印不同的灰字（无价格表 / 无匹配价 / 无模型路由），因为它们是三个不同的事实，把它们混成一句是这张卡最不该犯的错。缺读数一律**不印** `—`：这张卡没有"读数缺失"的行，只有"整卡没有金额"的形态。

## 8. 与既有卡的差异

| 既有卡 | 它回答什么 | 本卡的区别 |
| --- | --- | --- |
| `tokens` 会话 Token | 输入 / 输出的**占比** | 不折钱、不分桶定价 |
| `cache` 缓存命中 | 命中率环 + 三桶 token | 不涉及金额与费率 |
| `usage-mix` / `quota-manage` / `cc-*` | **套餐额度**占用（credits、窗口百分比） | 那是"额度被用了多少"，本卡是"这段会话值多少钱"；两者口径不同，本卡不读 `commandCode.credits` |
| `peak-pricing` / `peak-pricing-board` | DeepSeek 现在是不是高峰（**自己的**固定时段 + 节假日） | 那是"时段的规则"，本卡是"会话的金额"；本卡的高峰判定读**价格规则自己**的 `peakWindows/timezone`，与那两张卡的配置无关 |
| `cc-usage` 用量 | 账期内的 `totalCost`（Command Code 账户口径） | 那是账户账期口径（含套餐），本卡是会话口径 |

去重结论：44 张既有卡里没有第二张把"会话 token"折成钱、也没有第二张印 `sourceType` 出处的。

## 9. 预览

```sh
node scripts/preview/gallery.mjs --only session-cost          # 浅色，3 个状态各 1 张
node scripts/preview/gallery.mjs --only session-cost --dark   # 深色
```

截图（`docs/preview/cards/`）：

| 文件 | 状态 |
| --- | --- |
| `session-cost@2x2.png` | 命中规则、低谷费率（`≈$0.131`） |
| `session-cost@2x2-s1.png` | 命中规则、高峰费率（`≈$0.261`，时钟钉在 2026-09-28T02:00Z 周一 02:00 UTC，真走 `isPeakAt`） |
| `session-cost@2x2-s2.png` | 无价格表 → token-only，**金额列留空那一态** |
| `session-cost@2x2-dark.png` 等 `-dark` | 深色主题同上三态 |

`example` 自带一张**假的**价目表（`path` 写明 "(example table shipped with this widget preview)"），里面故意放了三块"诱饵"，让选规则在截图里可见：一条**同名同 provider 但已失效**的规则（费率是 2 倍，生效窗口若失效，金额立刻翻倍）、一条**同模型不同 provider**（opencode-go）的规则、一条 ollama 的 `*` 通配规则。
