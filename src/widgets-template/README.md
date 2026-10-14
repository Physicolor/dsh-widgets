# dsh-widgets Widget Template

> 位置说明：`src/widgets-template/` 位于发现根 `src/widgets/` **之外**，生成器只会扫描
> `src/widgets/*/`，因此本模板不会被注册、不会被市场列出、不会进入任何构建产物。
> 它唯一的作用是：**Agent 或开发者创建新 Widget 时的标准起点与契约参照。**

> **正式生产流程请先读 `docs/workflow/README.md`（ARCH-002 Widget Production Workflow）**：
> 需求表 → Completeness Check → 技术分析 → Architecture Decision → Specification →
> Worker → Review → Validation → Registry。本目录只承载 Contract / Template 本身。

## 新建一个 Widget 的标准流程

1. `mkdir src/widgets/<your-widget-id>`（kebab-case，例如 `my-widget`）
2. 复制 `src/widgets-template/template/` 下两个文件到该目录；
3. 按下方契约填 `manifest.json`（机器可读元数据）与 `index.ts`（实现）；
4. （可选）该 Widget 专属文案写进 `manifest.json` 的 `locale.zh` / `locale.en`；
   （可选）Widget 专属 CSS 用 `index.module.css`；专属示例注入 `example`；
5. 运行 `pnpm gen:registry` 重新生成注册表，然后 `pnpm run build`；
6. 完成——不修改任何共享文件。

## 契约（Contract）

| 文件 | 必填 | 作用 |
| --- | --- | --- |
| `manifest.json` | 必须 | 机器可读契约：id / order / group / builtin / sizes / defaultInstalled / locale / source / skeleton |
| `index.ts` | 必须 | `defineWidget({...})` 默认导出描述符：render + name/desc thunk + configSchema + example |
| `README.md` | 可选 | 该 Widget 的说明文档 |
| `index.module.css` | 可选 | 该 Widget 专属样式（tag 按 src 相对路径隔离，不会与其他 Widget 冲突） |

**三处一致性（生成器强制校验）**：目录名 === `manifest.id` === `index.ts` 中第一个 `id: '...'` 字面量。

**`manifest.json` 字段**：

```jsonc
{
  "id": "my-widget",            // 必须等于目录名（kebab-case）
  "order": 70,                  // 市场/注册表显示顺序（stats 家族 10-16，其他按 20+ 排）
  "group": "system",            // 市场分组；缺省为该 widget 自身 id
  "builtin": true,              // 缺省 true；市场组件（如 usage/peak）为 false
  "sizes": ["2x2"],             // 可选 ["2x2", "2x4"]
  "defaultInstalled": false,    // 仅 stats 家族为 true（首次安装预载）
  "source": "cc",               // 可选：该卡等待的实时数据源 = 某个 families/<id>/adapter.ts 声明的 id（无源=同步投影）
  "skeleton": { "shape": "figures", "count": 3 },  // 可选：有 source 时声明加载骨架轮廓
  "locale": { "zh": {}, "en": {} } // 该 Widget 专属文案；家族共享文案放 src/widgets/_shared/locales.json
}
```

**`source` / `skeleton`（运行时元数据，Phase 1 起由 manifest 声明）**

`source` 说明这张卡等待哪个实时数据源；`skeleton` 说明「源还在飞」时占位骨架长什么样。
骨架必须长得像这张卡本身（`shape`: `text` | `rings` | `bars` | `line` | `heatmap` | `figures` |
`quotas`；`count` = 重复单元数，缺省 3；`rows` = `text` 卡正文行数，缺省 1），否则加载完成的
瞬间卡片会突然变形。

**为什么写进 manifest**：shell 曾经手工维护 `id → 数据源 / 骨架` 两张中央映射表，新增一个有
异步源的 Widget 必须回头改 `src/client/index.ts`——这正是「伪模块化」。现在这两项由生成器
汇总成 `WIDGET_RUNTIME`，`pnpm check:registry` 在 manifest 与生成物不一致时直接让构建失败。
**只有真的存在异步数据源时才声明**：只读会话内同步投影的卡（counts / tokens / task /
trajectory / peak-pricing / heatmap 等）不要写 `source`，它们的 render 永远不是「加载中」。

**`source` 是自由字符串，但必须命中已发现的数据源适配器**（v1.11 适配器契约）：
合法的 id 来自 `src/client/families/<family>/adapter.ts` 里的 `defineSource({ id })`，
生成器像发现组件单元一样发现它们。写错一个 id 会让 `pnpm check:registry` 直接失败——
不会出现「卡片永远停在骨架」的运行时事故。

**标题（`WidgetRenderOut.title`）：默认要写，`''` 是一个有严格条件的特例。**

新卡默认**带标题**——标题是这张卡唯一的口径声明（"首 token 延迟" → `0s` 才有意义）。
只有**同时**满足两条才允许 `title: ''`（左上角那行会整行消失，腾出的高度归主体）：

1. **主体自述**：主体的结构已经说明它是什么（表盘、月历格、图片、figures 的逐项标签）；
2. **主体满卡**：主体能吃掉腾出来的高度（自绘块、弹性折线）——只占一行数字/一排 figure 的卡
   **不能**去标题，去掉后顶部会空出一条，卡片显得没做完。

尺寸按 `2 × cardInnerPad(unit) + box ≤ unit` 选（150 侧：`12 + 120 + 12 = 144 ≤ 150`），
并把这条式子写进模块注释。完整标准、类型学（T1–T6）与全部 58 个已实装单元的审计见
[docs/design/CARD-TITLE-STANDARD.md](../../docs/design/CARD-TITLE-STANDARD.md)。

## 新增一个数据源（不是新增一个组件）

一个数据源 = **一个 family 目录 + 一个 host 模块**，不需要改任何共享文件：

1. 在 `src/client/families/<family>/adapter.ts` 里 `defineSource({ id, host, schedule, pulls })`
   （一个文件可以声明多个源，例如 usage family 同时拥有账户池与机器级日图）；
2. 在 `src/host/` 加路由模块，并在 `src/host/routes.ts` 注册一行；
3. 需要它的组件在 `manifest.json` 写 `"source": "<id>"` + `"skeleton"`；
4. `pnpm gen:registry`（或 `pnpm run build`）。

调度、错误语义、骨架判定都由契约自己承担：`schedule`（mount/settle/poll/railOpen）、
`apply()` 返回的 `resolved`（源自己决定「这条错误回答算不算答案」）。
`node scripts/verify-source-contract.mjs --prove` 会在 CI 里真的造一个新源来证明上面这句话。

## 第三方单元（社区部件）

不在本仓库里的单元可以通过 `registerExternalUnit()` 在运行时注册，规则与上面的契约清单
同一份：见 `docs/workflow/10-third-party-units.md`；离线审核门是
`node scripts/validate-external-unit.mjs <unit-dir>`。

**`index.ts` 描述符要点**：

```ts
import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

export default defineWidget({
  id: 'my-widget',                       // 必须与 manifest.id 一致
  name: () => t('widget.my-widget.name'),// 文案必须 thunk（跟随 Settings → Language）
  desc: () => t('widget.my-widget.desc'),
  builtin: true,
  group: 'system',
  sizes: ['2x2'],
  render: (stats, meta) => ({ title: t('widget.my-widget.name'), value: '…' }),
  configSchema: [ /* 可选：组件配置页表单 */ ],
  example: { /* 可选：市场/配置预览的 Mock 数据（widget 自持） */ },
})
```

**共享层（稳定 Core，可自由 import，禁止复制到单元内）**：

| 模块 | 内容 |
| --- | --- |
| `src/client/lib/contract/types.ts` | 契约类型（Widget/WidgetStats/WidgetRenderOut/Chart/WidgetRuntimeMeta/…） |
| `src/client/lib/contract/helpers.ts` | `defineWidget` + 标签解析 + 实例键 + `sizesOf` |
| `src/client/lib/contract/external.ts` | 第三方单元规则（R1–R10）与校验器 |
| `src/client/lib/registry.ts` | 运行时注册表（内置 + 第三方），组件/实例/运行时元数据/文案的唯一读取口 |
| `src/client/lib/format.ts` | 纯格式化：fmtDuration/fmtTokens/fmtTps/dayKey/滚动网格/柱状数据 |
| `src/client/families/<family>/data.ts` | 家族视图与共享 render 工厂 |
| `src/client/data/sources.ts` | 数据源注册表解析（谁在等哪个源、谁该被轮询） |
| `src/client/i18n.ts` | `t()` 与 locale 服务接线（shell 字典） |

**新增 Widget 时不要触碰**：`src/client/index.ts`、`components.tsx`（已拆分为 `render/` 与
`surfaces/`）、`i18n.ts`（除非改动共享 shell 本身）、`lib/registry.ts`、
`data/collector.tsx`、`data/sources.ts`、`generated.registry.ts`（由生成器产出）。

## 验证

```sh
pnpm gen:registry      # 重新生成 src/client/generated.registry.ts
pnpm check:registry    # 校验注册表与单元目录一致（stale 时失败）
pnpm test              # 全部闸门（见 node scripts/gates.mjs --list）
pnpm run build         # 构建 lib/（G5 的 CSS 闸门需要先构建）
```