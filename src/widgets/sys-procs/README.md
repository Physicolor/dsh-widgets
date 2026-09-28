# sys-procs — 内存大户（2×2）

> 沙箱：`D:\dsh-home\plugins\.wt-sys-procs\src\widgets\sys-procs`（第三批 Wave 2，`BATCH-3-SPECS-W2.md` §10）。

## 1. 这张卡回答什么问题

**多 agent / 多模型并行时，谁把内存吃满了**——按工作集内存排序的前几名进程，第一名是大数字 + 灰字，第 2/3/4 名是明细三行。

## 2. 卡面草图

```
┌──────────────────────────────────────┐  150×150，pad 12
│ 内存大户                             │  card.sys-procs.title，13px 蓝
│ 1.7 GB                               │  headAfter.big，20px（第 1 名的工作集）
│ Memory Compression                   │  legend，10px 灰（第 1 名的进程名）
│ ──────────────────────────────────── │  breakdown 的 borderTop（hairline）
│ node                          650 MB │  第 2 名
│ msedge                        489 MB │  第 3 名
│ SecurityHealthS…              452 MB │  第 4 名（长名在右端淡出，见 §4）
└──────────────────────────────────────┘
```

实测几何（`.tmp-probe-procs.mjs` 对真 `CardBody` 量的，与基准卡 `tool` 逐项相同）：
卡 150×150、`scrollHeight 148 = clientHeight 148`（不溢出）、标题 top 13 / 大数字 33 / 灰字 60 / 分隔线 86 / 首行 93（相对卡片上沿）、
三个数值右对齐在同一条 161px 的列上、右侧留白 13 vs pad 12、标签列 77px（见 §4）。

## 3. 数据来源

- 读 `WidgetStats.host.procs`（`HostProcess[] | null`）——host `/api/host/overview` 的 `procs` 切片：`{ pid, name, rss }`，
  `rss` = **字节**（`Get-Process | Sort WS -Descending | Select -First 8`，所以已经是前 8 名）。
- 口径就是**进程**：一行 = 一个进程 = 一个 pid，不是「一个程序」。数字是该进程的工作集，不是聚合值（为什么不做聚合见 §4）。
- 卡片自己只做三件事：排序（防御性，降序）、取前 4 名（1 个大数字 + 3 行）、把字节格式化成人读的形式。
- `host` 缺失 / `host.procs === null` / `host.procs === []` → `render` 返回 `null`（见 §7）。
- **没有 `stats.sysinfo.mem`**：那是「整机内存水位」，属于 sys-cpu / sys-rings / sys-board 的口径；本卡只谈进程。

### ⚠ 硬限制：每进程显存拿不到，卡面不出现「显存」

实测（WDDM，本机）：`nvidia-smi --query-compute-apps=pid,used_memory` 对每一行都回 `[N/A]`，
所以**没有任何可脚本化的途径拿到每进程显存**。因此：

- 本卡的**卡面文案、明细行、市场描述里都不出现「显存」二字**——它是内存卡。
- GPU 的总量在 sys-gpu / sys-rings / sys-board 上，不在这里重复。
- 一句话：宁可不显示，也不把整机显存摊派给某个进程。

### 字节格式化：`fmtBytes` 为什么不是 `fmtTokens`

`fmtTokens`（共享层）是 **token** 格式化器：K/M 台阶、**没有单位字母、没有空格**、而且按 **1000** 进制（`12.2K` / `1.2M`）。
把字节喂进去，1.69 GB 会印成 `1690M`——量级错（拿 M 说 GB）、没有单位、还差了 1000/1024 那 7%。
所以字节格式化写在本目录里（`fmtBytes`）：**1024 进制**、带单位、`<100` 保留一位小数、`≥100` 取整（`1.7 GB` / `650 MB` / `812 KB`）。
与 Windows 任务管理器「内存」列同一套单位。

## 4. 元素为什么这么摆

- **大数字 = 第 1 名的工作集**，放在标题正下方（`headAfter.big`）。**不用 `value`**：`value` 是正文数字，会被推进正文，
  而这张卡的头部已经有大数字了——两个字段都会渲染同一件事（`CardBody` 的注释里就是这么写的）。
- **灰字 = 第 1 名的进程名**（`legend`）。大数字单独存在时读者不知道是谁，名字必须紧贴数字；这也是 `BATCH-3 SPECS §10` 的卡面。
- **明细三行 = 第 2、3、4 名**，**绝不复述第 1 名**。第一名已经同时是大数字和灰字；再列一次就是本仓库的「一件事不说两遍」。
- **贴底（`bodyAnchor: 'bottom'`）**：head 用完 ~59px 后，三行落在卡片地面上，余量留成 head 与分隔线之间的 14px——
  与 `tool` / `cache` / `tokens` 完全同一姿态（实测 `tool` 的分隔线也在 86px，两卡逐项相同）。
- **没有 `headRing`**：环是「占比」的语言，占比需要分母，而这个切片**不带整机内存总量**，画一个圆就是拿装饰冒充比例。
  环上的数字还会挤掉 20px 大字（`tool` 卡里已经因为这个原因撤掉过环）。
- **没有 `headRight` / `meter` / `corner` / `cycle` / `actions`**：这张卡没有可点的动作，也没有第二个读数要与大数字并排。
- **标签列只有 77px**（= 124 内容宽 − 39「650 MB」− 8 列间距），所以长进程名会被**渲染层**处理：
  `breakdown` 的标签格是 `nowrap + overflow:hidden + mask`，右端**淡出**而不是打省略号（仓库统一处理，`任务` 卡的长条目标题同款）。
  部件**不预截断**：预截断会在 2×4 / 放大时浪费可用宽度，而且「…」会占掉一个字形。
  实测：`SecurityHealthService`（23 字符，需要 104px）在 77px 里被遮罩裁掉，且**不与数值列重叠**（label.right 114.4 < value.left 122.4）。
- **同名进程**：一行 = 一个进程，所以 Edge/Chrome 这类多进程程序可能占掉两行，出现两个一样的名字 + 两个不同的数字——
  实测（本卡自己的截图评审）这**读起来像渲染 bug**，所以当一个名字在**本卡画出的条目里重复**时，给它补上 pid（`msedge · 9016`）；
  名字都不重复时（常见情况）保持裸名，不引入噪音。
  **为什么不做「按名字求和」**（任务管理器进程页就是这么显示的）：host 只取前 **8** 名，某程序的第 9 个进程若被截在窗口外，
  求和值就是**下界**而不是总量，而契约里没有「≥」的写法（GitHub 仓库卡为此专门带了 `issueCountCapped`）。
  本卡每个数字都**恰好是一个进程**的工作集。

## 5. 语气方向

**不染色。** 谁是内存大户是事实，不是好坏——`node`（就是 `dsh web` 自己）上榜就该上榜，**不做特殊化、不隐藏**。
因此本卡：

- 明细行**没有 `tone`**（既不是 `danger` 也不是 `warn`）；
- 大数字**没有 `valueTone` / `valuePulse`**；
- 没有 `headRing`（见 §4）。

本条方向由**本部件**决定（`BRIEF §2`：绝不让渲染器猜），并在 `index.ts` 头部注释里写明。

## 6. 配置项

**无。**（第一版不提供任何 `configSchema`：进程数上限、排序口径都不是用户可调项——「前 8 名」是 host 的口径，
卡片只取前 4 名显示，多出来的选择会让「第一名」这个概念失去唯一性。）

## 7. 空态 / 降级行为

| 情况 | 行为 | 依据 |
| --- | --- | --- |
| `stats.host` 缺失 / `host.procs === null` | `render` → `null`（外壳按 `source: "sys"` + `skeleton: bars` 画骨架） | 快照还没答，≠ 空 |
| `host.procs === []` | `render` → `null` | 答了但没内容 = 没信息 |
| 只有 1 个进程 | **不渲染 `chart`**，只留头部（大数字 + 灰字） | `SPECS §10` 推荐项；`—` 是「这个读数缺失」的意思，而第 3、4 名是**不存在**，补两行空槽会把一张健康的卡变成坏卡 |
| 2–4 个进程 | 有几个画几行（不补 `—`） | 同上：行是数据驱动的名次，不是用户勾选的指标 |
| 进程名为空串 | 名字印 `—`，数字照印 | 名字缺失 ≠ 读数缺失 |
| `rss` 非有限数 / 负数 | 印 `—` | 不编造 |
| `rss === 0` | 印 `0 B`（合法读数，不是缺失） | 与 `sys-net` 的 `0 B/s` 同一条纪律 |

上面两处 `—` **不带 `tone: 'muted'`**：`breakdown` 的 `tone` 同时染**标签格和数值格**，而这两行里缺的只是一半
（名字或数字），另一半（数字或名字）是**真读数**——把一整行压成 muted 会让真实的那半看起来也缺了。
标签格本来就是 `label-secondary` 灰，所以视觉上「缺」已经表达出来了。

`example.sim` 是**预览专用**的降级开关（`meta.sim.procs` = 本卡最多画几个条目），让「只有 1 个进程」这个真机几乎遇不到的形态
在市场/组件配置预览里可点、可看。**运行时轨道不会传 `sim`**，所以生产路径一字不变。

## 8. 与既有卡的差异

- 全部 44 张既有卡**没有一张读 `stats.host`**（`grep -r "stats.host\|procs" src/widgets` 零命中），本卡是 `host` 切片的第一个消费者。
- 与 sys-cpu / sys-rings / sys-board / sys-gpu / sys-gpu-line 的差异：那些看**整机**（CPU 利用率、内存水位、VRAM、温度），
  本卡看**进程**——「机器还剩多少」和「谁在用」是两个问题，前者解释不了后者。
- 与 `sys-board`（2×4 多指标环）不重叠：那是整机看板，不是进程榜。
- 与 `tool` / `tokens` / `cache` 的版式相同（头部阶梯 + 三行明细），但它们是**会话**口径，本卡是**机器**口径。

## 9. 预览

```sh
node scripts/validate-widget-unit.mjs src/widgets/sys-procs   # 0 failure
npx tsc --noEmit                                             # 0 error
node scripts/preview/gallery.mjs --only sys-procs             # 浅色
node scripts/preview/gallery.mjs --only sys-procs --dark       # 深色
```

截图（2 个预览状态 × 2 主题）：

- `docs/preview/cards/sys-procs@2x2.png` / `sys-procs@2x2-dark.png` —— 多进程（完整形态）
- `docs/preview/cards/sys-procs@2x2-s1.png` / `sys-procs@2x2-s1-dark.png` —— 单进程（只留头部）
