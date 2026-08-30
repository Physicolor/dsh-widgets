# dsh-widgets Widget Template

> 位置说明：`src/widgets-template/` 位于发现根 `src/widgets/` **之外**，生成器只会扫描
> `src/widgets/*/`，因此本模板不会被注册、不会被市场列出、不会进入任何构建产物。
> 它唯一的作用是：**Agent 或开发者创建新 Widget 时的标准起点与契约参照。**

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
| `manifest.json` | 必须 | 机器可读契约：id / order / group / builtin / sizes / defaultInstalled / locale |
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
  "locale": { "zh": {}, "en": {} } // 该 Widget 专属文案；家族共享文案放 src/widgets/_shared/locales.json
}
```

**`index.ts` 描述符要点**：

```ts
import { defineWidget } from '../../client/lib/contract'
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
| `src/client/lib/contract.ts` | 契约类型（Widget/WidgetStats/WidgetRenderOut/Chart/…）+ defineWidget + 解析器 |
| `src/client/lib/format.ts` | 纯格式化：fmtDuration/fmtTokens/fmtTps/dayKey/滚动网格/柱状数据 |
| `src/client/lib/usage-view.ts` | OpenCode 用量家族共享 render 工厂（usageRender/usageBarsRender/usageRingsRender） |
| `src/client/lib/heatmap-accounting.ts` | token 热度图自记账（持久化 + 时区归日 + 迁移修复） |
| `src/client/i18n.ts` | `t()` 与 locale 服务接线（shell 字典） |

**新增 Widget 时不要触碰**：`src/client/index.ts`、`components.tsx`、`i18n.ts`（除非改动共享 shell 本身）、`generated.registry.ts`（由生成器产出）。

## 验证

```sh
pnpm gen:registry      # 重新生成 src/client/generated.registry.ts
pnpm check:registry    # 校验注册表与单元目录一致（stale 时失败）
pnpm run build         # 构建 lib/
```