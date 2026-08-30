# 05 — Review Checklist（独立 Review Agent 审查清单）

Review 与 Implementation 分离：Worker → Self Check → **Independent Review Agent** → PASS / FAIL。
Reviewer 只读共享层与模板 + 目标单元 + spec，不修改任何文件。

## 基准：Marketplace 真实必需字段（ARCH-002 从 `components.tsx` MarketTab 源码核实）

| 市场行为（源码事实） | 必需字段 |
| --- | --- |
| 市场列表按 group 去重，卡片显示 group 名 + 实例数 + desc | `manifest.group`（缺省=id）、`manifest.sizes`（实例数=Σ sizes）、`t('widget.<id>.desc')` |
| 搜索匹配 `name + desc + id` | `id`、name/desc 键存在 |
| group 标题 = `t('group.<group-id>')` 回退 widgetName | 可选：manifest.locale 提供 `group.<id>` 键 |
| 预览 = group 内每 widget × 每 size，渲染 render + example | `render`、`example.stats / example.sim`（可选） |
| simToggle 存在时预览可点击翻状态 | `simToggle`（可选） |
| 配置页 = configSchema 逐字段表单 | `configSchema`（可选） |
| badge = `badgeLabel ?? (builtin ? 系统 : 外部)` | `badgeLabel`（可选）、`builtin` |
| 添加 = 实例 `widget@size` 进 installed；1 列布局 2x4 标记不可用 | sizes 派生（无需额外字段） |

→ 「具备 Marketplace 所需信息」= 上表必填列全部满足。凭空多余字段不构成加分也不构成通过条件。

## Review 项目

```text
Product（对照 spec 的 Human-owned 字段，禁止以“我觉得更好”改动）
[ ] 尺寸与 spec 一致（含 2x4 变体行为）
[ ] 卡片标题 === Human Title，且使用 spec.titleKeys.key（独立键），未用 name 键充当标题
[ ] 名称/描述与 spec 一致（zh/en）
[ ] 核心内容与展示信息完整且正确
[ ] 主数字槽位符合 spec.visualRequirements.numberHierarchy（大字独立行 / 标题行内联 / 右端小字）
[ ] 视觉要求落实（布局/重点/风格 token）
[ ] 交互需求落实（如有）

Technical
[ ] manifest.json 合法、schema 正确
[ ] index.ts 合法、defineWidget 契约正确
[ ] id 三元一致（目录名 = manifest.id = index.ts id 字面量）
[ ] 数据来源与 spec.dataFieldPriority 一致；可选数据缺失时用 undefined 省略（无空串渲染）
[ ] 不要假设 chart 原语的行为——segments 渲染色由 ChartBlock 按 index 决定，验证视觉以实际渲染为准
[ ] 未产生不必要的共享依赖（符合 Architecture Decision）
[ ] 未修改任何禁止文件（git status 应只有目标单元目录新增）
[ ] 未引入新依赖/新构建步骤

Integration
[ ] scripts/validate-widget-unit.mjs PASS
[ ] pnpm check:registry PASS（注册表同步）
[ ] pnpm run build PASS
[ ] docs/verify-discovery.cjs：新 id 出现在 live bundle

Marketplace
[ ] group 正确（现有或经 Human 确认的新分类）
[ ] locale zh/en 完整（引用键全覆盖）
[ ] example/preview 符合规范（需要时）
[ ] 市场卡片可正常展示（name/desc/实例数/可添加）

Regression
[ ] 旧 Widget 的发现/注册/构建无回归（build + probe 全量 19 id 或 +现总数）
```

## 判定

- 任一 ❌ → FAIL → REWORK（回 Worker，附清单）；回到 REWORK 状态物化于 Production Record。
- 全 ✅ → PASS → VALIDATION（主 Agent 执行构建 + 探测 + 最终 Human 边界确认）。