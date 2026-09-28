# window-forecast — 窗口预测

## 1. 这张卡回答什么问题

**按现在的消耗速度，Command Code 的 5 小时 / 周额度窗口会不会在重置之前打满？**

限流是长任务最硬的中断源。既有的 coding-plan 卡答的都是「用了多少」：`quota-manage` 只预测**月**窗口，`cc-windows` / `cc-window-5h` / `cc-window-weekly` 只印**已经用掉的百分比**。「还有 40 分钟就重置了，可按现在的速度 20 分钟后就打满」这句话，四十四张卡里没有一张说得出来——这就是它存在的理由。

## 2. 卡面草图（2×2，150px）

```
┌─ 150 × 150 ─────────────────────────────┐
│ 窗口预测                     ← card.window-forecast.title（蓝 13px）
│ 118%                         ← headAfter.big（20px；ratio > 1 时染 danger 红）
│ 5h · 预计 1h14m 后打满         ← legend（灰 10px：哪个窗口 + 判定）
│ ───────────────────────────              ← breakdown 的 hairline
│ 5h                     118% 预计         ← 危险窗口（红字）
│ 周                      63% 预计
│ 剩余重置                  2h0m            ← 两个窗口里更近的那个 resetAt
└─────────────────────────────────────────┘
```

明细块贴底（`bodyAnchor: 'bottom'`）。实测：卡高恰好 150px（`CardBody` 的 tile-fits 守卫没有报 `data-dsx-overflow`），灰字与三行明细都没有 `…` 截断。

## 3. 数据来源与口径

只读 `stats.commandCode.credits.windowLimits`：

| 字段 | 含义 |
| --- | --- |
| `fiveHour.used` / `.cap` | 5 小时窗口的已用 / 上限，单位是 **Command Code credits**，不是 token |
| `weekly.used` / `.cap` | 周窗口的同上 |
| `fiveHour.resetAt` / `weekly.resetAt` | **epoch ms**，该窗口的重置时刻 |
| `fiveHour.exceeded` / `weekly.exceeded` | 未使用：`used >= cap` 已经能表达「已满」，两套判据会给出不一致的结论 |

**算法（`index.ts` 的 `projectWindow`，纯函数、已导出）**

```
窗口自然起点 = resetAt − 窗口长度          （5h = 5×3600e3；周 = 7×24×3600e3）
elapsed      = now − (resetAt − 窗口长度)
rate         = used / max(1, elapsed)      // 每 ms 消耗
projected    = used + rate × (resetAt − now)
ratio        = projected / cap             // 卡上的百分比 = round(ratio × 100)
距打满时间    = (cap − used) / rate         // ratio > 1 时才印
```

起点取 **`resetAt − 窗口长度`**，即 provider 自己的窗口定义，不是「本次会话开始」之类的替代口径——后者是另一个时钟，会印出一个没人能核对的速度。

**手算例子（代码注释里同一份，可用 §9 的探针复现）**

| 窗口 | 读数 | 推算 |
| --- | --- | --- |
| 5h | used 6 / cap 10，1 小时后重置 | 起点 4 小时前，rate 1.5/h；projected = 6 + 1.5×1 = **7.5 → 75%**；距打满 (10−6)/1.5 = 2h40m > 剩 1h ⇒ 重置前不会打满 |
| 周 | used 30 / cap 40，2 天后重置 | 起点 5 天前，rate 6/day；projected = 30 + 6×2 = **42 → 105%**；距打满 (40−30)/6 = 1d16h < 剩 2d ⇒ 会打满 |

⇒ 大数字取更危险的周窗口 **105%**（红），灰字「周 · 预计 1d16h 后打满」，明细 75% / 105%。探针 A 案例逐字复现了这张表。

**不混口径**：`usageData`（OpenCode 的 rolling / weekly / monthly 百分比）一个字段都不读。它是**另一个账户、另一套单位**的读数，混进来会在最需要这张卡的时刻印出一个看着精确、其实错的数。同样地，卡上不出现任何 token 数字。

**范围**：`commandCode.credits` 是该 payload **第一个 pool 成员**的切片（多 key 池时 `ccView` 的 `AllUser` 会求和，本卡不参与）。第一版故意不加入 `cycle`（整卡点击切换池视图），因为那需要接上 cc 家族的 pool/multikey 机制，而规格书给的数据路径就是这一条。

## 4. 元素为什么这么摆

- **大数字在标题正下方**：仓库统一的头部阶梯（`headAfter.big`），而且它本身是结论——「最危险的那个窗口重置时会占到多少」。`value` 留空：它在有 `headAfter` 的卡上会被推进正文，同一张卡印两遍。
- **灰字紧贴大数字**：它是大数字的定语（哪个窗口 + 会不会打满），必须在数字旁边读，所以用 `legend`（`headAfter.small` 会挤在同一行、更窄）。
- **三行明细贴底**：`5h` / `周` 是**两个窗口各一行**（规格要求，不可少），第三行 `剩余重置` 是唯一一个"两个窗口合成一行"的信息——取两者更近的 `resetAt`，也就是「下一次恢复额度的时刻」。贴底（`bodyAnchor: 'bottom'`）与 cache / tool / quota-manage 同一姿态：头部两行，底部三行，中间留白。
- **行的顺序就是危险的顺序**：5h 在前（更紧的预算），周在后。
- **百分比后缀「预计」**：这个数是外推，不是读数。没有后缀的话 118% 会被当成"已经用了 118%"。`used` 侧的读数在这张卡上无处可放（`cc-usage` / `cc-windows` 已经在印），所以不印。
- **没有环**：环是"占比"的语言，而这张卡的主语是**时间**（什么时候打满），车主此前已否决过把时长塞进环里。也没有 `valuePulse`：预计超额不是正在发生的超额，红字已经足够，呼吸动画要在真越界时才用。
- **每个窗口永远占一行**：缺读数印 `—` + `tone: 'muted'`，绝不让行消失（行数一变形，用户会以为窗口不存在）。

## 5. 语气方向（`tone` 由本部件自己定）

这是**占用**类指标：**越高越坏**，与缓存命中率（越高越好）**方向相反**。渲染器从不根据 ratio 猜语气，阈值全在本文件：

| 条件 | 语气 | 依据 |
| --- | --- | --- |
| `ratio > 1.0` | `danger`（大数字 `valueTone:'danger'` + 该行红字） | 重置之前**真的**会打满 |
| `ratio > 0.9` | `warn`（只染**该行的值**） | 外推是直线：一串长回合就能吃掉 10% 的窗口。91% 这种"理论上安全"值得先变琥珀 |
| 其余 | 不染 | |
| 无读数 | `muted` | 没有读数 ≠ 读数是 0 |

**契约限制（不是本卡的取舍）**：`WidgetRenderOut.valueTone` 只接受 `'danger'` 一个值，所以 0.9–1.0 的窗口**大数字仍是中性色**，琥珀只出现在它自己的明细行上；大数字只在真的会打满时变红。若要大数字也变琥珀，需要共享层把 `valueTone` 扩成 `'warn' | 'danger'`。

**`ratio` 恰好等于 1.0**（正好在重置那一刻到达上限）按"不会打满"处理：卡回答的是"会不会在重置**之前**用光"，恰好卡在重置点上不算。

## 6. 配置项

**无**（第一版）。

`example` 里有一个 **preview-only** 的 `simSteps`（不是配置项、不进设置页、实时 rail 永不触发）：同一个 payload 分别在「现在 / 45 分钟后 / 1 小时后」被读一次，于是三个语气档都能在组件市场里点到——

| 步 | 状态 | 大数字 | 明细 5h |
| --- | --- | --- | --- |
| 0（默认） | 会打满 | 118% 红 | 118%（danger） |
| 1 | 贴着实测上限 | 94% 中性 | 94%（warn） |
| 2 | 平静 | 89% 中性 | 89%（无语气） |

`sim` 必须是 `simSteps` 的第一项（否则第一次点击是静默空操作）。

## 7. 空态 / 降级行为

「宁可 — 不猜」。**单个窗口**在下列任一情况**不预测**，该行印 `—` muted，**不影响另一个窗口**（另一个照常预测，大数字用它）：

1. `used` / `cap` / `resetAt` 缺失或不是有限数，或 `cap <= 0`；
2. `resetAt` 已经过去（**陈旧 payload**：窗口其实已经滚动，往一个过去时刻外推是反的）；
3. `elapsed <= 0`（重置时刻比窗口长度还远：时钟 / 时区给出的负值）——规格书规则；
4. `elapsed < 60s`：第 3 条的近退化情形。窗口刚开时 rate 是一次的成本 ×60（5 秒里花掉 1 credit ⇒ 1 400%），这不是预测。本卡把"窗口刚开始"的界线从 0 提到 1 分钟，行为与第 3 条一致（印 `—`）。

**整卡返回 `null`** 的情况：

- 两个窗口都不可预测（含完全没有 payload）——没话可说，空卡比编一个数诚实；
- `commandCode === null` **且** `commandCodeError !== null`：这时「未配置 Command Code」是 `cc-whoami` 与 `额度管理` 的句子，本卡再印一遍只是同一句话的第四份拷贝，没有增量（规格书 §7 的去重规则）。`commandCodeError` 因此只用于这条判断，**不印任何文案**。

第三行 `剩余重置` 不需要预测能力：它取两个窗口里**更近的、且尚未过去**的 `resetAt`；一个都没有就印 `—` muted。

## 8. 与既有卡的差异

| 既有卡 | 它印什么 | 本卡的差异 |
| --- | --- | --- |
| `quota-manage`（额度管理） | 月窗口的**月末外推**百分比 + 今日 token | 本卡是 5h / 周两个**短窗口**，且答案是**时间**（多久打满 / 多久重置），不是用量 |
| `cc-windows` | 5h / 周 / 月三个**已用**环 | 本卡印**重置时**会到多少（外推），并给出"会不会在重置前打满"的判定 |
| `cc-window-5h` / `cc-window-weekly` | 单窗口**已用**百分比 + 重置日期 | 同上：已用 ≠ 预计会用完；本卡把两个窗口的**危险度**排序后只把最危险的抬到头部 |
| `cc-usage` / `cc-credits` | 账期用量 / 余额 | 数据同源（`credits.windowLimits`）但问题不同，且本卡不印 credits 数字 |

数据源与 `cc-*` 家族同源（同一个 `commandCode` payload），所以并排摆放时不会互相矛盾；差异在**问题**：家族答"用了多少"，本卡答"会不会用完"。

## 9. 预览

```sh
# 真浏览器页面 + 每个尺寸/状态一张 PNG（浅色）
node scripts/preview/gallery.mjs --only window-forecast
node scripts/preview/gallery.mjs --only window-forecast --dark

# 离线验收探针（.tmp-*，不参与构建）：逐条复现第 3/5/7 节的判定
npx tsdown --config .tmp-probe/tsdown.config.ts && node .tmp-probe/run.cjs
```

截图（`docs/preview/cards/`）：

| 文件 | 状态 |
| --- | --- |
| `window-forecast@2x2.png` | 118% · danger（默认状态，会打满） |
| `window-forecast@2x2-s1.png` | 94% · 5h 行 warn |
| `window-forecast@2x2-s2.png` | 89% · 平静 |
| `…@2x2-dark.png` / `-s1-dark.png` / `-s2-dark.png` | 同上，深色主题 |
