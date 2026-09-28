# sys-power — 供电

## 1. 这张卡回答什么问题

**「这台机器现在是插电还是用电池？还有多少电、还能撑多久？跑的是哪个电源方案？」** —— 一句话：长任务被中断的最常见原因之一（拔电降频 / 电量耗尽休眠），在卡面上提前看见。

## 2. 卡面草图（2×2，150×150 内容区）

```
┌──────────────────────────────────┐
│ 供电                        ← card.sys-power.title（蓝色 13px）
│ 100%                        ← headAfter.big（20px）：电量百分比
│ 插电 · 平衡                  ← legend（灰 10px）：供电来源 · 电源方案
│ ────────────────────────────────  ← breakdown 自带上边线
│ 供电                    交流电      ← 行 1
│ 剩余                       —       ← 行 2（插电时无剩余时间 → — 灰色）
│ 电源方案                 平衡      ← 行 3（scheme 原样印，不翻译）
└──────────────────────────────────┘
```

状态阶梯（`example.simSteps`，点击预览卡循环）：

| 步 | 状态 | 大数字 | legend | 剩余 |
| --- | --- | --- | --- | --- |
| 1 | 插电 100% | `100%` | 插电 · 平衡 | `—`（muted） |
| 2 | 用电池 42% | `42%` | 电池 · 平衡 | `134m0s` |
| 3 | 低电量 14% | `14%`（**warn 琥珀**） | 电池 · 平衡 | `41m0s` |
| 4 | 危险 6% | `6%`（**danger 红**） | 电池 · 平衡 | `17m0s` |
| 5 | 台式机（无电池） | `—` | 台式机（无电池） | `—`（muted） |

## 3. 数据来源

只读 `stats.host?.power`（契约 `HostPower`，来自 host 路由 `/api/host/overview`）：

```
HostPower = { onAc: boolean | null, percent: number | null,
              minutesLeft: number | null, scheme: string | null }
```

口径与**明确不属于本卡的两件事**：

- **Win32 哨兵不由本卡处理。** `EstimatedRunTime = 71582788`（0x4444444）表示「交流电 / 未知」，host 的 `toPower()` 已经把它折成 `null`。本卡只判断 `null`，文件里没有任何哨兵常量——两处都判断会让「到底谁负责」变成猜谜。
- **电源方案不映射。** `powercfg` 打印的是本地化字符串（`电源方案 GUID: … (平衡)`），host 已剥掉前缀只留括号里的名字。本卡**原样印**（`平衡` / `Balanced`），不做中英对照表：自己映射就会和机器「设置 → 电源」页上写的字不一致。
- `percent` 来自 `[int]$b.EstimatedChargeRemaining`；`minutesLeft` 只在**放电且 runtime > 0** 时非空。
- `onAc` 的语义是 host 折出来的 `BatteryStatus === 2`，即「**交流电（充电中或已满）**」——所以插电充电中的笔记本（如 63%）也印「插电」，且不染色。契约里没有「充电中」这一位，本卡不假装有。

`null` / `[]` / `—` 三种「空」在本卡各有所指：

| 情况 | 结果 |
| --- | --- |
| `stats.host` 为 `null` / `power` 为 `null`（没有电池**且** `powercfg` 没答） | `render` 返回 `null`，整卡不出现 |
| `percent === null`（`onAc === true`：台式机 / 无电池读数） | 大数字 `—`，legend 「台式机（无电池）」 |
| `minutesLeft === null`（插电，或电池没给估算） | 该行印 `—` + `tone: 'muted'` |
| `scheme === null`（`powercfg` 没答） | 该行印 `—` + `tone: 'muted'` |
| `onAc === null`（来源不可知） | 该行印 `—` + `tone: 'muted'`，legend「供电未知」 |
| `0%` | 正常渲染 `0%`（**不是**空态；`0` 与 `—` 是两句不同的话） |

## 4. 元素为什么这么摆

- **大数字在标题正下方（`headAfter.big`，不是 `value`）**：这是本仓库唯一写法的头部阶梯（蓝 13px 标题 → 20px 数字 → 灰 10px caption）。用 `value` 会被推进正文、在有 `headAfter` 的卡上重复渲染同一个数。
- **legend = 来源 · 方案**：头部阶梯必须有一条灰 caption；把「插电 / 电池」和「平衡」放在这里，是让 150px 的高度预算里"一眼看到全部三个事实"的最短路径（三者都不是可省略的量）。
- **三行明细贴底（`bodyAnchor: 'bottom'`）**：`headAfter` 一行会让头变高，默认（`'top'`）会把 3 行明细顶到 caption 下面、把空白留在卡底。贴底后空白落在头与明细之间，明细在卡的地板上——与「会话 Token / 缓存命中 / 工具调用」完全同一姿态。
- **不重复第一名之类的去重规则不适用**：这里三行各自是三个不同的事实（哪一路供电 / 还剩多久 / 哪个方案），没有哪一行是另一行的重述**之外**的装饰——见 §6 的取舍说明。
- **没有 `headRing`**（刻意）：环是「占比」的语言（缓存命中率、上下文水位）。电量百分比不是一个卡面能说出分母的占比，画成环只会挤掉 20px 数字的宽度。
- **高度预算实测**（与 `card-geometry.ts` / `CardBody.tsx` 对账）：`pad 15 × 2` → 头（标题 16 + 4 + 数字 25 + 2 + 灰字 12 = 59）+ 明细（1px 上边线 + 6 上间距 + 3×12 + 2×4 = 51）= 24 + 59 + 51 = **134 / 150**，余 16px。第 4 行需要 12 + 4 = 16px 而只剩 16px，正好卡在边界上——所以本卡固定 3 行，不提供"加一行"的配置。

## 5. 语气方向（本卡自己定，写死在 `index.ts`）

| 阈值常量 | 值 | 语气 | 依据 |
| --- | --- | --- | --- |
| `WARN_PERCENT` | 20 | `valueTone: 'warn'`（琥珀） | Windows 自己就是在这个电量开始弹低电量提示，卡与系统同一口径，不另立标准 |
| `DANGER_PERCENT` | 10 | `valueTone: 'danger'`（红） | 电量即将成为长跑被中断的原因 |

**方向与「越高越坏」的邻居卡相反**：本卡是「低才坏」（越低越危险），且**只在放电时染色**：
`onAc !== false`（含 `onAc === null`）一律不染色——「来源不可知」不是「正在放电」的证据，染琥珀就是无根据地报警。
`percent === null` 也不染色（没有读数就没有判断）。

不染色的地方：吞吐/时长类的明细行不染色；某一行的 `—` 用 `muted`（灰），这是"缺读数"的语言，不是"危险"的语言。

## 6. 配置项

**无。** 本卡不提供 `configSchema`（规格书 §9 未要求）。刷新节奏因此走 sys 家族的统一默认：任何 `source: 'sys'` 的实例被装上后，采集器按该实例的 `interval` 配置取**最短**值轮询，缺省 **10s**（`resolveInterval(undefined) → 10`，`/api/sysinfo` 与 `/api/host/overview` 同一次 tick）。若车主希望像 sys-cpu / sys-rings 那样选 5/10/30/60s，加一行 `configSchema: intervalSchema()` 即可（共享层已有，无需新增原语），但那多一个配置项，本卡按规格书没加。

## 7. 空态 / 降级行为

- `stats.host === null` 或 `stats.host.power === null` → **`render` 返回 `null`**（整卡隐藏）。理由：`power` 为 null 只有在"没有电池**且** `powercfg` 也没答"时才会发生，此时这张卡没有任何一句话是真的。
- 插电时 `剩余 —` 是**正确的空态**，不是错误：插电时系统本来就不报剩余续航。原因写在 `cardHint`（卡面 hover 提示）里，而不是塞进 150px 的卡面——契约里 `cardHint` 的用途正是"太长不能上卡面的说明"（「未配置 COMMANDCODE…」被省略号截断后搬去 hover 就是先例）。
- 三行**永远三行**：拿不到读数的那一行印 `—` + `muted`，不会消失（行消失会让卡的高度和行数在读者眼皮底下变）。
- `sim` 优先于实时数据：预览要能走遍 5 个状态，而实时数据无法按需制造"低电量"。

## 8. 与既有卡的差异

全仓 44 个部件里**没有任何一个**读过 `stats.host`（`grep host?.` 只命中 host 侧代码）——`/api/host/overview` 的 `power` 切片在此之前没有任何消费者。最接近的邻居是 sys 家族：

| 卡 | 读什么 | 与本卡的关系 |
| --- | --- | --- |
| `sys-cpu` / `sys-rings` / `sys-gpu` / `sys-gpu-line` | `/api/sysinfo` 的 CPU / 内存 / GPU | 都是**性能**读数；本卡是**供电**读数，两者是"机器累不累"与"机器还能不能跑"的区别 |
| `sys-board` | sysinfo 的汇总面板 | 不含供电（`SysInfo` 里没有 power 字段） |
| `quota-manage` 等 | 套餐额度 | 与硬件无关 |

## 9. 预览

```sh
node scripts/validate-widget-unit.mjs src/widgets/sys-power   # 0 failure
node scripts/preview/gallery.mjs --only sys-power             # 亮色 5 张
node scripts/preview/gallery.mjs --only sys-power --dark      # 暗色 5 张
```

产物（`docs/preview/cards/`）：

```
sys-power@2x2.png        sys-power@2x2-dark.png        插电 100%
sys-power@2x2-s1.png     sys-power@2x2-s1-dark.png     用电池 42%
sys-power@2x2-s2.png     sys-power@2x2-s2-dark.png     低电量 14%（warn）
sys-power@2x2-s3.png     sys-power@2x2-s3-dark.png     危险 6%（danger）
sys-power@2x2-s4.png     sys-power@2x2-s4-dark.png     台式机（无电池）
_sheet.png / _sheet-dark.png                           整页
```

交互页：`.tmp-gallery/index.html`（真 `CardBody` + 真主题 token）。
