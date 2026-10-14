# deepseek-balance — DeepSeek 余额

> 新增部件（2026-10-13），`order: 68`，`group: deepseek`（新分组），尺寸仅 `2x2`，`source: deepseek`，骨架 `text × 3 行`。
> 数据面：DeepSeek 官方开放平台 `GET https://api.deepseek.com/user/balance` + host 侧采样台账。
> 与 `session-cost` 共用同一套纯函数定价模块（见 §9）。

## §0 审计（动手前逐条回答，WORKER-BRIEF-V3 §0）

**1. 这个信息是不是已经在别处更方便地展示了？**
没有。产品自身的 UI（输入框的模型 / 推理档、权限选择器、页头、设置页）里**不存在任何账户余额**；本仓库里 `DeepSeek 官方余额` 也是零覆盖——`dsh-widgets-roadmap-2026-10-13.md` 的 P1-1 记录：生态里有 **155** 个含"余额"的同类插件，而 55 张卡里一张都没读官方余额接口。既有的钱相关卡片全部回答别的问题：`session-cost` 是"本会话值多少钱"、`cc-*` 是"Command Code 套餐额度被占了多少"、`usage-*` 是 OpenCode 池的窗口。**结论：做。**

**2. 有没有功能高度重合的既有组件？**
逐项对照（窗口 / 范围 / 单位 / 时态）：

| 既有卡 | 窗口 | 范围 | 单位 | 时态 |
| --- | --- | --- | --- | --- |
| **`deepseek-balance`（本卡）** | **DeepSeek 平台账户**（一个账户一行） | 官方余额 + 本机观测到的当日消耗 | **钱**（账户币种，`¥` / `$`） | 此刻的余额 + 今天累计的下降 |
| `session-cost` | 本会话 | 本会话三桶 token 按价格表折算 | 钱（价格表币种，`$`） | 会话累计（`≈` 为整段估算） |
| `cc-credits` / `cc-usage` | Command Code 账户 | 套餐额度占用（credits / 窗口百分比） | credits / % | 账期 |
| `usage-rings` / `usage-bars` | OpenCode 池 | 滚动 / 周 / 月窗口占用 | % | 窗口 |
| `tokens` / `cache` | 本会话 | token 计数与命中率 | token | 会话累计 |

**一处真实重合，如实记录**：本卡的 `对话消耗` 行与 `session-cost` 的**大数字**是同一个量（本会话按价格表折算的金额），差别只在落点——`session-cost` 独占一卡并附三桶明细与出处，本卡把它和账户余额并排放。保留它的理由是车主 2026-10-13 的明确要求（"展示充值 / 已使用量 / 今日消耗 / 对话消耗"），而"还够不够花"这个问题只有把两者放在一起才回答得了。**如果车主认为这会稀释 `session-cost` 的存在感，删掉这一行是一处改动**（`renders.ts` 的 `breakdown` 第三项），本卡其余部分（余额 / 充值 / 今日消耗）不受影响。

**3. 用户不读文档，怎么分清这两张？**
- **名字**：市场名 `DeepSeek 余额`（英文 `DeepSeek Balance`），卡面标题同字——主语是**平台账户**，不是会话；
- **大数字的单位**：本卡是**货币**（`¥110`，符号自带币种），而 `session-cost` 是 `≈$0.131`（估算标记 + 价格表币种）、`cc-*` 是 credits / %、`usage-*` 是 %；
- **灰字第一句是采样年龄**（`刚刚更新` / `5m 前更新`）——全仓没有第二张卡以"数据有多新"开头，因为只有这张卡读的是**被采样的余额**；`session-cost` 的灰字第一句是**金额出处**（`官方价 · deepseek-v4.1-flash`）。

**4. 这个大数字是什么单位、什么范围、什么时间点？**
单位 = 账户币种的钱（本机账户为 `¥`）；范围 = **该账户的当前总余额**（`total_balance`，= 充值余额 + 赠送余额）；时间点 = **上一次采样**——所以灰字必须写年龄（`刚刚更新` / `12m 前更新`），悬停再写清它是怎么来的。`¥110` 不需要解释就能读懂："这个 DeepSeek 账户还剩 110 元"。

**5. 它应该一直在，还是可以消失？**
**一直在**：用户能装的卡（`builtin: false`，market 里手动安装）。`render` **永不返回 `null`**，也没有返回 null 的路径：没配密钥、密钥被拒、host 没重启、超时——每一种都是**安静空态**（灰字短标签 + 悬停整句），卡占着格子。理由：这些状态全都是**用户能处理的事**，一张突然消失的卡既丢了这条提示，又打乱 deck 布局（WORKER-BRIEF-V3 §0.5 的规则 (a) 不适用——"没有 DeepSeek 账户"不是本卡的前提，每个用户都有账户）。

**6. 颜色有没有被赋予一个用户能说出的含义？**
有，且只有一处等级含义：**余额低于用户自己设的阈值**（每卡配置 `low`，默认 10）→ `warn`（琥珀）；**低于阈值一半，或官方 `is_available === false`**（DeepSeek 已停止为该账户提供 API）→ `danger`（红）。用户能说出的含义是"这个账户快没钱了 / 已经不能用了"。`is_available === false` 会额外在 `headAfter.small` 印 `余额不足`，并把原因放进悬停。
**其余一律不染色**：`充值` / `今日消耗` / `对话消耗` 三行、灰字、分隔线都是默认层级色——花得多不等于坏，这是读数不是判决（与 `session-cost` 同一条纪律）。

## §1 卡面（2×2，150×150 内容区）

```
┌──────────────────────────────┐
│ DeepSeek 余额                 │  ← 蓝色标题 13px（deepseek.title）
│ ¥110                         │  ← 大数字 20px（headAfter.big，货币符号自带币种）
│ 刚刚更新 · 赠送 ¥10           │  ← 灰字 10px：采样年龄（首位，抗省略）+ 赠送余额（>0 才印）
│ ──────────────────────────── │  ← breakdown 自带发丝分隔线
│ 充值              ¥100        │  ← 官方 topped_up_balance
│ 今日消耗           ¥3.2       │  ← host 采样得到的当日下降量（§3）
│ 对话消耗          ≈$0.131     │  ← 本会话按价格表折算（与 session-cost 同一套函数）
└──────────────────────────────┘
```

四个预览状态（`example.simSteps`，市场 / 组件配置里点卡片循环）：

| 状态 | 卡面 | 说明 |
| --- | --- | --- |
| 1 余额充足 | `¥110`，无 tone | 默认态 |
| 2 低于阈值 | `¥15` 琥珀 + 悬停「余额低于你设的预警阈值 ¥10」 | `sim.balance` 覆盖大数字（预览专用，rail 从不传） |
| 3 低于一半 | `¥6.4` 红色 + 同上 | 危险档 |
| 4 未配置密钥 | 大数字位印 `—`（`valueTone: 'muted'`）+ 灰字 `未配置密钥` + 悬停整句 | `sim.error` 覆盖错误码 |

## §2 数据来源（口径）

| 字段 | 来源 | 口径 |
| --- | --- | --- |
| `total` / `toppedUp` / `granted` / `currency` / `hasBalance` | `GET https://api.deepseek.com/user/balance`（host `src/host/deepseek.ts`） | **官方原值直通**：`balance_infos[0]` 的 `total_balance` / `topped_up_balance` / `granted_balance` / `currency`；`hasBalance` = 官方 `is_available`，**不**用 `total > 0` 重算（官方才是判定方） |
| `spentToday` / `day` | host 侧采样台账 `$DSH_HOME/profiles/web/dsh-widgets-balance.json` | **量出来的**：官方没有用量接口，host 每次采样把余额的**下降**累加到当日（§3） |
| `sampledAt` | host 采样时刻 | 在 memo 内部打的时间戳 ⇒ 它写的是**上游回答的那一刻**，不是这次响应的那一刻（`scripts/verify-deepseek-balance.mjs` 断言） |
| `stats.pricing` / `modelSelection` / `usage` | 既有桥接字段 | 只用于 `对话消耗` 一行；`pricing` 由 `families/pricing/adapter.ts` 的 `consumerWidgets` 驱动（已加入本卡） |

**密钥从不进浏览器**：`credentials.resolve('DEEPSEEK_API_KEY')`（→ env → `$DSH_HOME/.credentials.yaml` → `.env`），与 `cc` / `github` 同一条缝，界面上没有任何输入框。

**明确不读**：`stats.commandCode.credits`（那是 Command Code 套餐额度，混进来就是混合口径）、`stats.usageData`（OpenCode 池口径）。

## §3 「今日消耗」是怎么量出来的（本卡唯一的推导量）

官方接口只给**余额**，没有用量也没有历史，所以唯一诚实的做法是**采样余额、累加下降**。`foldSample()` 三条规则，每条都是设计掉的 bug：

1. **跨天（或换币种）重新起算**——昨天的消耗不是今天的；两个币种相减没有意义，所以 `currency` 一变就重置基线；
2. **只有下降算消耗**——`prev.last − total > 0` 才计入。充值 / 赠送会让余额**上升**，那不是负消耗：naive 的"首次 − 当前"会让一次 ¥100 充值抹掉真实的 ¥30 用量；
3. **基线永远跟进到本次采样**——上升也把基线抬到新值，所以下一个区间从那里开始量。

台账原子写入（tmp + rename），坏文件 / 缺文件当作"没有上一次采样"（当天从 0 起算），写不进去也只是丢掉当日数字、绝不影响余额本身。

**它覆盖的是 dsh 真正运行的那些时段**——采样靠 `source: 'deepseek'` 的轮询（5 分钟一次，**不**要求组件栏打开，因为没采到的那段就是没人量的消耗），dsh 没运行期间的消耗不计入。这句话写在卡片的悬停提示里（`deepseek.spentHint`），而不是让数字假装成一张账单。

以上 17 条断言（含跨天重置、充值不为负、重复采样不重复计、memo 只折叠一次、四种错误码）由 **gate G12** 离线复核：`node scripts/verify-deepseek-balance.mjs`（用真实构建产物 + 打桩上游 + 一次性 DSH_HOME，无网络）。

## §4 元素为什么这么摆

- **大数字走 `headAfter.big` 而不是 `value`**：这张卡的头部是"标题 + 一个数字"，正文留给了三行账户明细；有 `headAfter` 的卡再给 `value` 会把同一个数字推进正文重复印（`session-cost` README 里同一条理由）；
- **灰字以"采样年龄"开头**：余额是**被采样**的数，年龄决定它有多可信；`fmtAgo` 复用 GitHub 家族的相对时间（`12s` / `5m` / `3h`），**一分钟以内不印秒数**而是 `刚刚更新`——`0s 前更新` 读起来像故障而不是新鲜；赠送余额排在年龄之后，因为它可以被省略掉而不丢关键信息，年龄不行；
- **赠送余额只在 > 0 时印**：本机账户常年没有赠送，一个恒为 `¥0` 的占位行是噪音（与 `cc-credits` 对 `freeCredits` 的处理一致）；
- **三行明细贴底（`bodyAnchor: 'bottom'`）**：仓库里所有"头部阶梯 + 明细行"的卡都是这个姿态（`session-cost` / `cache` / `quota-manage`），明细在卡片地板上、头在上，中间空隙才不会散；
- **空态把 `—` 放在大数字位**（`headAfter.big: '—'` + `valueTone: 'muted'`）：这是契约里 `muted` 的原话（"大数字槽里只有 `—`"），也让"没有余额"和"有余额"两种状态共用同一套几何——数字的位置不跳；
- **`对话消耗` 复用一个「纯函数定价模块」而不是抄一份**：见 §9。

## §5 配置项

| 字段 | 类型 | 默认 | 作用 |
| --- | --- | --- | --- |
| `low`（余额预警阈值） | text | `10` | 余额低于它 → 大数字琥珀；低于一半 → 红。非法值（空 / 非数 / ≤0）**回落到默认**而不是静默关掉染色——"没有颜色"和"阈值是 0"不是同一句话。单位与账户币种一致 |

价格表**不提供卡级覆盖**（唯一真相是 usage-center 的 `pricing.json`，与 `session-cost` 同一条纪律）。

## §6 空态 / 降级行为

| 情况 | 行为 |
| --- | --- |
| 首次采样未回（`deepseekBalance === null` 且无错误码） | 大数字 `—`，灰字 `等待余额数据…`，悬停同句（骨架由 `manifest.skeleton` 负责，`render` 不返回 null） |
| `503` 未配置密钥 | 灰字 `未配置密钥`，悬停「未配置 DEEPSEEK_API_KEY — host 自动读取环境变量 / `$DSH_HOME/.credentials.yaml` / `.env`，重启后自动生效」 |
| `401` 密钥被拒 | 灰字 `密钥被拒绝` + 悬停「检查密钥是否仍然有效」 |
| `404` host 未加载（dsh web 没重启） | 灰字 `host 未加载` + 悬停「重启 dsh web 后自动生效」 |
| 超时 / 5xx / 传输失败 | 灰字 `读取超时` / `暂不可用` / `读取失败`，悬停给出对应整句 |
| 失败发生在**已经拿到数据之后** | **保留上一份好数据**（stale-while-error），只记错误码——一次抖动不许清空用户正在读的数字 |
| `hasBalance === false`（官方 `is_available: false`） | 照常印数字，但 `valueTone: 'danger'` + `headAfter.small = 余额不足` + 悬停说明"DeepSeek 已停止为该账户提供 API 调用，充值后自动恢复" |
| 本会话 `usage` 为空（还没跑过） | `对话消耗` 行印 `—`（不是 `$0`：没有会话记录 ≠ 免费） |
| 有 token 但无价格表 / 无匹配规则 | `对话消耗` 行印 `1.2M tok`（带单位的另一种读数），不编费率 |
| 规则带峰谷且会话无逐请求时间戳 | 金额前加 `≈`，悬停说明原因 |

## §7 与既有卡的差异

见 §0 第 2 问的对照表。一句话：**窗口是账户、单位是账户币种的钱、时态是"此刻还剩多少 + 今天少了多少"**；全仓唯一读 DeepSeek 官方余额接口的卡。

## §8 预览 / 截图

```sh
node scripts/preview/gallery.mjs --only deepseek-balance          # 浅色，4 个状态各 1 张
node scripts/preview/gallery.mjs --only deepseek-balance --dark   # 深色
```

`docs/preview/cards/`：`deepseek-balance@2x2.png`（充足）、`@2x2-s1.png`（琥珀）、`@2x2-s2.png`（红）、`@2x2-s3.png`（未配置密钥），深色同名 `-dark`。
预览的价格表是 `families/deepseek/data.ts` 里自带的一张**示例表**（`path` 写明 "(example table shipped with this widget preview)"），费率用真实公布的 V4.1 Flash 官方价（USD/M），因此 `对话消耗` 印的是 `≈$0.131`——**余额是 CNY、价格表是 USD 不是 bug**：DeepSeek 的余额存在账户币种里，而用量按价格表的币种计价，两个符号各自带着自己的币种。

## §9 依赖：为什么 `对话消耗` 复用 `session-cost/pricing.ts`

本卡的 `对话消耗` 与 `session-cost` 回答的是**同一个问题**（本会话按命中其路由的价格规则折算成钱），所以直接 import `src/widgets/session-cost/pricing.ts` 的纯函数（`selectPriceRule` / `priceSession` / `splitUsage` / `totalTokens` / `fmtMoney`），而不是把 500 行规则选择与峰谷判定抄一份：**一份实现，两处显示**；两张卡若给出不同的数，那说明价格表变了，而不是说明有两份实现。代价是部件之间的一个依赖（本仓库目前唯一的跨部件 import），已在 §0 第 2 问里作为"重合"如实记录。

## §10 验收记录（2026-10-13）

| 项 | 结果 |
| --- | --- |
| 离线闸门 | `pnpm test` **11/11 全绿**（新增 G12 = 本卡的台账折叠与错误码矩阵，17 条断言） |
| 类型 / 注册表 | `npx tsc --noEmit` 无输出；`gen-registry --check` 56 个单元、496 zh / 496 en 键 |
| 渲染基线 | G4 收录 5 个新状态 × 2 语言（`docs/architecture/baseline/render-snapshot.json`） |
| 路由基线 | G8 收录 `/api/deepseek-balance`（200 + 结构指纹） |
| 源码契约 | G9（`--prove`）绿：新数据源只增加 `families/deepseek/` 一个目录 + `host/deepseek.ts` 一个模块，共享文件里没有出现源 id 字面量 |
| 实机数据面 | 本机 `$DSH_HOME/.credentials.yaml` 里的 `DEEPSEEK_API_KEY` 被上游**判定为无效**（官方 401：`Authentication Fails, Your api key: ****4f5a is invalid`，`/user/balance` 与 `/models` 一致）——所以**这张卡的 401 分支是实机验证过的，成功分支只在打桩上游下验证过**（G8 的 200 指纹 + G12 的折叠矩阵）。换一枚有效密钥后无需改代码即可走通成功分支 |
| 未验证项（诚实记录） | ① 有效密钥下的真实余额数字（密钥无效）；② 长时间跨度的当日消耗（需要 dsh 持续运行数小时，样本序列已由 G12 用 4 步序列覆盖）；③ 官方 `is_available: false` 的真实报文（用契约字段构造，未遇到真实账户） |
