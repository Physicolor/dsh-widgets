# peak-pricing-board — 峰谷时段表 (2×4)

> 状态：已由船长 `gen-registry` 收入注册表。**本文件最后两次改动（词汇对齐 + 预览切换修复）会再次改动
> `manifest.json`，需重跑 `pnpm gen:registry` 使 `generated.registry.ts` 与本单元一致。**

## 一句话

既有 2×2「峰谷定价」只回答**现在**是峰还是谷；这张 2×4 回答**今天接下来怎么计费**：
今天的高峰时段表（高峰 09:00–12:00 / 14:00–18:00、其余低谷）、正在计费的那一行高亮、
以及距离下一段切换还有多久；周末 / 法定节假日写明「全天低谷」的原因。

## 词汇：与 2×2 卡一套语言、两个分工（2026-09-28 对齐）

| 概念 | 用词 | 出现在 |
| --- | --- | --- |
| **价格状态** | `CHEAP` / `EXPENSIVE`（英文，中英一致） | 两张卡各自的 20px 大数字 |
| **时段类别** | `高峰` / `低谷` | 本卡的明细行；2×2 卡自己的文案（`全天低谷` / `恢复高峰`） |
| 时段表达 | `上午 09:00–12:00`（2×2） / `09:00–12:00`（本卡明细行） | 各自的时段行 |

- 大数字以前写的是 `高峰`/`低谷`，已改为 **`EXPENSIVE` / `CHEAP`**，与 2×2 卡逐字符一致。
- 这两个词在 2×2 卡里是**硬编码字面量**（`value: peak ? 'EXPENSIVE' : 'CHEAP'`），本卡照抄字面量而非走
  i18n：对齐必须逐字符，只本地化其中一张卡正是这次对齐要消灭的漂移；若将来那张卡的大数字本地化，两张一起改。
- 明细行保持 `高峰`/`低谷`（时段名），这两个词也是 2×2 卡`全天低谷`文案里的同一套词。2×2 卡本来就是
  「英文 CHEAP 大数字 + 中文小字」，所以这种混用是既有观感，不是妥协。
- `simToggle`（预览切换提示）去掉多余的「预览：」前缀：外壳已把它包在 `点击卡片切换：{label}` 里，
  原文案会读成「点击卡片切换：预览：高峰 / 低谷」。

## 卡面

```
┌──────────────────────────────────────────────────────────┐
│ 峰谷时段表                                               │  title 13px 蓝
│ CHEAP  本段至 18:00                                      │  headAfter.big 20px（CHEAP/EXPENSIVE）+ small 10px 灰
│ 下一段 18:00 · 还有 42m                                  │  legend 10px 灰
│ ──────────────────────────────────────────────────────── │  breakdown 的 borderTop
│ 09:00–12:00                            高峰（红 danger）  │
│ 14:00–18:00                            高峰（红 danger）  │
│ 18:00–09:00                            低谷（蓝 primary） │  ← 只有它「正在计费」时才蓝
└──────────────────────────────────────────────────────────┘
```

- `title` / `headAfter.big` / `headAfter.small` / `legend` / `chart.breakdown`（`bodyAnchor: 'bottom'`）；
  高峰时另加 `valueTone: 'danger'` + `valuePulse: true`（见下）。
- 行数固定 **3**（窗口数 + 1 条「其余」），150px 高预算：head ≈ 66 + 明细 3 行 ≈ 48 + pad 24 ≈ **140/150**。
- 全天低谷日（周末 / 法定节假日）**卡片形状不变**：仍是同样 3 行，只是「其余」那一行改写为
  `低谷 · 周末` / `低谷 · 中秋节`（原因来自共享判定给出的 key）。

## 红色警示（2026-09-28 车主补充）

| 元素 | 效果 | 由什么字段实现 |
| --- | --- | --- |
| `EXPENSIVE` 大数字 | **错误红 + 呼吸**（1.6s，opacity 1→0.35） | `valueTone: 'danger'` + `valuePulse: true` |
| 明细行里的 `高峰` | **错误红（静态）** | 该行 `tone: 'danger'` |
| 明细行里的 `低谷` | 品牌蓝，**仅当它正在计费** | 该行 `tone: 'primary'` |
| 全天低谷日的 `高峰` 行 | **灰（muted）** | 窗口当天被停用，红色会谎报当天在按高峰计费 |

- 大数字的红 + 呼吸**没有新增任何机制**：`CardBody` 的 `figureEl` 本来就读 `valueTone` / `valuePulse`，
  给 `headAfter.big` 加上 `dsx-stats-card-value dsx-value-pulse` —— 与 2×2 卡 `EXPENSIVE` 完全同一套
  （`primitives.module.css` 的 `dsx-value-breathe`，`prefers-reduced-motion` 下自动停）。
- 卡片外框保持干净（无描边发光、无阴影），这是 2×2 卡的规矩。
- **明细行的 `高峰` 目前只能红、不能呼吸**：`breakdown` 渲染器给数值单元格写的是内联样式，没有 class 钩子，
  而呼吸动画挂在 `.dsx-stats-card-value.dsx-value-pulse` 上。要让它也呼吸，需要**共享层加一个可选字段**
  （见「已知耦合」第 3 条），本卡先交不依赖它的版本。
- 取舍：以前「正在计费的那一行」恒为蓝，结果高峰时那一行是蓝的——恰好在最该警示的状态下用了品牌色。
  现在高峰行恒红、其余行为蓝，**哪一段正在计费**由 `small`（`本段至 12:00`）与 `legend` 的倒计时读出，
  警戒指向大数字的红色呼吸。

## 数据与规则

- 只读**本机时钟**（`new Date()`），在配置的时区里取值（`Asia/Shanghai` 固定 +8 或本机时区）。
- 峰谷判定**不自己实现**：只读 import 既有 2×2 部件
  `../peak-pricing` 的 `parsePeakWindows` / `clockAt` / `peakConfigOf` / `peakStatusNow`
  与 `../peak-pricing/holidays` 的 `yearOf` / `holidayFor` / `holidayTableCovers`。
  两张卡对「什么是高峰」永远只有一个实现。
- 读 `WidgetStats` 的字段：`billingWindows`（本卡新增）、`peakWindows`、`weekendOff`、`holidayOff`、
  `timeZone`、`extraHolidays`（后五项与 2×2 卡同名同义）。
- 无 `source` / `skeleton`：没有异步数据源，永远不是「加载中」；也**没有 null 分支**（时间永远存在）。

## 配置项（全部）

| key | 类型 | 默认 | 可选值 / 上限 | 说明 |
| --- | --- | --- | --- | --- |
| `billingWindows` | text | `''`（空 = 跟随 `peakWindows`） | `HH:MM-HH:MM` 逗号/分号分隔，**最多 2 段** | 本卡自己的时段表；空值/无法解析时回落到 `peakWindows` |
| `peakWindows` | text | `09:00-12:00, 14:00-18:00` | 同上，最多 2 段 | 与 2×2 卡同一个 key，是「高峰时段」的唯一来源 |
| `weekendOff` | toggle | `true` | true / false | 周末全天低谷 |
| `holidayOff` | toggle | `true` | true / false | 中国法定节假日全天低谷 |
| `timeZone` | mode | `Asia/Shanghai` | `Asia/Shanghai` / `local` | 判定所用的钟 |
| `extraHolidays` | text | `''` | `2027-01-01` 或 `2027-02-05..2027-02-11`，最多 40 段 | 额外低谷日（手动补当年放假日期） |

## 预览（`example`）与「点击切换」

```ts
example: {
  stats: { billingWindows: '09:00-12:00, 14:00-18:00', extraHolidays: '2027-01-01' },
  sim: { when: '2026-09-24T10:30' },
  simSteps: [
    { when: '2026-09-24T10:30' }, // 高峰（EXPENSIVE）
    { when: '2026-09-24T13:00' }, // 12:00–14:00 空档（无高峰行生效，其余行高亮）
    { when: '2026-09-26T10:30' }, // 中秋（周六，全天低谷）
    { when: '2026-10-10T10:30' }, // 普通周六 —— 周末全天低谷
  ],
}
```

`sim.when` 是本卡自己的预览针：把**配置时区里的墙上时钟**钉在某一分钟，于是市场/组件配置
预览在任何机器、任何时区、任何真实日期下都渲染同一张卡。它按 `YYYY-MM-DDTHH:MM` 解析，
非法值回落到真实时钟。

**`simSteps` 是必需的，不是装饰**：`sim` 里只有一个字符串字段，外壳的「翻转单个布尔字段」逻辑
推不动它，预览点卡片会**毫无反应**（这就是 2026-09-28 车主报的「2×4 点击不切换」）。
`nextSim` 对声明了 `simSteps` 的部件改为**循环这些状态**，与 2×2 卡的四个预览状态同一机制。
两条硬约束：

1. `simSteps[0]` 必须与 `sim` **逐字节相同**（`nextSim` 用深比较找当前位置，不匹配会让第一次点击变成空操作）；
2. 每个 step 都要让**渲染结果可见地不同**（本例四步分别命中「高峰 / 空档 / 节假日 / 周末」四种形态）。

日期是故意写死的（与 2×2 卡的预览状态一样）：2026-09-26 落在已收录的**中秋**区间里，
2026-10-10 是**国庆**之后的第一个普通周六，所以每一步在任何机器上都可复现。

## 已知耦合（请船长裁决）

1. **代码依赖方向**：本卡 `import` 了 `src/widgets/peak-pricing/` 里的规则与节假日表。
   这是**只读**引用，没有改那个目录，也不复制规则（复制才是两张卡会分叉的写法）。
   若认为「部件之间不应互相 import」，建议把这六个 helper 提到
   `src/client/lib/peak-schedule.ts`（共享层），两张卡都从那里读；本卡届时只留渲染映射。
2. **一处常量镜像**：`schedule.ts` 里的 `BEIJING_OFFSET_MINS = 8 * 60` 与 2×2 卡 `clockAt`
   的 +8 **重复**了一次（`clockAt` 把偏移写在函数体内，没有导出）。它只在一处使用
   （`instantOf`：把墙上时钟还原成 `peakStatusNow` 会再读一遍的那个瞬间），
   有 DST 的时区会需要两处同时改。提取到共享层即可删除。
3. **i18n key 不共用**：本卡自带 `card.peak-pricing-board.*` 字典（含节假日名），
   共享判定返回的 `card.peak.*` key 通过 `REASON_LOCAL` 映射过来。
   注册表会把所有单元的字典合并成一张表，两家共用一个 key 就等于互相可改。
4. **需要共享层加一个字段（明细行呼吸）**：`高峰` 要和大数字一样呼吸，需要 breakdown 的行能带 class。
   最小改动二处，改完本卡一行接上：

   ```ts
   // src/client/lib/contract/types.ts —— 在 breakdown 的行类型上加一个可选标记
   breakdown?: Array<{ label: string; value: string; cost?: string; tone?: BarDatum['tone']; pulse?: boolean }>

   // src/client/render/charts/breakdown.tsx —— 数值单元格挂上同一套呼吸 class
   React.createElement('span', {
     key: `v${i}`,
     className: row.pulse ? 'dsx-stats-card-value dsx-value-pulse' : undefined,
     style: { /* …原样式，tone 仍决定颜色… */ },
   }, row.value)
   ```

   （`.dsx-value-pulse` 的 keyframes 已存在，`prefers-reduced-motion` 也已处理；不需要新增 CSS。）
   本卡在这两处落地后把 `tone` 旁的 `pulse: track.status.peak && !track.wholeDayOff` 加上即可。

## 自检

```sh
node scripts/validate-widget-unit.mjs src/widgets/peak-pricing-board
npx tsc --noEmit
```
