# 10 — Third-party widget units（第三方单元：提交、审核、注册）

> 状态：**已实现**（v1.11，ARCH-004 / 路线图 `widgets-market`）。
> 相关代码：`src/client/lib/contract/external.ts`（规则）、`src/client/lib/registry.ts`（注册）、
> `scripts/validate-external-unit.mjs`（离线审核门）、`scripts/validate-widget-unit.mjs`（内置单元门）。

## 1. 为什么需要它

本仓库此前的扩展模型是「新增一个组件 = 新增一个目录」，但**只有在本仓库内**成立：
`src/client/generated.registry.ts` 是构建期产物，第三方 bundle 无法往里加东西。社区部件
因此只能靠 PR 合进本仓库——生态上限就是仓库的合并速度。

现在多了一条运行时通道：**已审核的第三方单元可以在运行时注册**，而注册规则与构建流水线
对内置单元的门禁**同一条清单**。审核不是形式主义：一个没审核过的 bundle 不能冒充内置组件、
不能等一个不存在的数据源、也不能用用户看不懂的语言把自己列进市场。

## 2. 三方分别做什么

| 角色 | 职责 | 位置 |
| --- | --- | --- |
| 贡献者 | 提交一个单元目录：`manifest.json` + `index.ts`（与内置单元**同构**） | PR 或自己的插件包 |
| 审核（离线门） | 跑 R1–R10 清单 + 两项只有仓库能做的检查（id 是否撞内置、`source` 是否存在） | `node scripts/validate-external-unit.mjs <dir>` |
| 运行时（浏览器门） | 同一份清单再跑一遍；不通过就 `throw`，只列出全部违规项 | `registerExternalUnit()`（`src/client/lib/registry.ts`） |
| 市场 | 注册表就是市场的数据源，注册后立刻出现在组件市场与组件配置里 | `lib/registry.ts` 的 `WIDGETS` / `WIDGET_RUNTIME` / `WIDGET_LOCALES` |

## 3. 单元长什么样

```text
my-widget/
├── manifest.json   # 机器可读契约（id / order / group / builtin:false / sizes / source / skeleton / locale）
└── index.ts        # defineWidget({...}) 默认导出：render + name/desc thunk（+ 可选 configSchema / example）
```

最小可行例子（`--self-test` 用的就是它）：

```ts
// index.ts
import { defineWidget } from 'dsh-widgets/client'

export default defineWidget({
  id: 'hello-card',
  name: () => 'Hello Card',
  desc: () => 'Third-party example',
  builtin: false,          // 第三方不得声明内置
  sizes: ['2x2'],
  render: () => null,      // 无数据时返回 null 即不显示
})
```

```jsonc
// manifest.json
{
  "id": "hello-card",
  "order": 900,
  "group": "other",
  "builtin": false,
  "sizes": ["2x2"],
  "source": "pricing",          // 可选：必须命中已发现的数据源适配器
  "skeleton": { "shape": "text" },
  "locale": {
    "zh": { "widget.hello-card.name": "问候卡", "widget.hello-card.desc": "第三方示例" },
    "en": { "widget.hello-card.name": "Hello Card", "widget.hello-card.desc": "Third-party example" }
  }
}
```

## 4. 审核清单（R1–R10）

| # | 规则 | 为什么 |
| --- | --- | --- |
| R1 | id 是 kebab-case、非空 | 实例键是 `<id>@<size>`，非法 id 会污染持久化的 installed/order |
| R2 | `index.ts` 的 `id` 字面量 === `manifest.id` | 与内置单元同一套三向一致性 |
| R3 | id 不与已注册者冲突 | 两个单元共用一个 id 会让实例键无法区分 |
| R4 | 不得 `builtin: true`，且不得出现未知 manifest 键 | 第三方不能冒充内置；未知键是拼写错误而不是特性 |
| R5 | sizes ∈ `2x2 \| 2x4`，且 manifest 与 descriptor 的 sizes 相等 | `sizesOf()` 读 descriptor，市场/实例表读 manifest（历史事故：sys-board@2x2 假实例） |
| R6 | `source` 命中已发现的数据源适配器 | 否则卡片永远停在骨架 |
| R7 | `skeleton.shape` 是已知轮廓，`count`/`rows` 是正整数 | 骨架必须长得像内容，否则加载完会突然变形 |
| R8 | `zh` 与 `en` 都带 `widget.<id>.name` / `.desc` | 市场读这两个键；缺了就是列不出来的组件 |
| R9 | 声明了 `render` | 描述符必须能渲染（或明确返回 null） |
| R10 | `order` 是整数 | 市场排序 |

离线门比运行时门多两条：**R3' id 不与内置单元目录冲突**、**R6' `source` 必须存在**（浏览器端用
`hasSource()` 判同一件事）。

## 5. 注册（运行时）

```ts
import { registerExternalUnit } from 'dsh-widgets/client'

// 在插件 apply 里注册；返回的 disposer 把注册表还原（与 ctx.effect 的纪律一致）
ctx.effect(() => registerExternalUnit({ manifest, widget }))
```

注册成功后会：把组件加进 `WIDGETS`、把它的每个尺寸加进 `ALL_INSTANCES`、把
`source`/`skeleton` 写进 `WIDGET_RUNTIME`、把双语字符串并进 `WIDGET_LOCALES`，
然后通知订阅者——组件市场/组件配置（`useWidgetRegistry()`）会立刻重渲染，
rail 在下一次 bridge emit 时拿到新组件。

失败时 `registerExternalUnit` **抛错并列出全部违规项**：不做半安装。

## 6. 验收与门禁

```sh
node scripts/validate-external-unit.mjs <unit-dir>   # 审核一个提交
node scripts/validate-external-unit.mjs --self-test  # 证明这个门自己有效（CI 的 G10）
node scripts/gates.mjs --list                        # 全部闸门
```

`--self-test` 会造四个临时单元并断言：合法的过、冒充内置的被拒、未知 source 被拒、
缺市场文案的被拒——一个「什么都放行」的审核门比没有门更糟。

## 7. 明确不做的事

- **不加载远端代码**：注册的是**已加载 bundle 提供的描述符**，不是从 URL 拉进来的脚本。
  远程代码执行不在本期范围（那是安全评审的另一条线，见 `09-future-input-adapters.md`）。
- **不做运行时 `skeleton` 之外的样式注入**：第三方单元用共享样式层，不引入自己的全局 CSS。
- **不自动信任**：没有 `--self-test` 通过 + 人工审核的单元不要合进市场的推荐列表。
