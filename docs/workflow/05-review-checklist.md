# 05 — Review Checklist（双层 Review：System Integrity + Product Quality）

Review 与 Implementation 分离：Worker → Self Check → **Independent Review Agent** → **PASS / REWORK / BLOCKED**。
Reviewer 只读共享层与模板 + 目标单元 + spec，不修改任何文件。

## Layer 1 — System Integrity（硬门槛；任一 FAIL ⇒ **BLOCKED**）

> BLOCKED 是唯一的 Workflow Failure，必须修复并重新过校验；不允许带病进入市场。

```text
[ ] scripts/validate-widget-unit.mjs PASS（含 MVW 市场硬门槛：name/desc ∈ locale zh+en）
[ ] id 三元一致（目录名 = manifest.id = index.ts id 字面量）
[ ] Contract 合法（defineWidget 契约）
[ ] manifest.json 合法、schema 正确；index.ts 合法
[ ] 数据来源与 spec.dataFieldPriority 一致；可选数据缺失时用 undefined 省略（无空串渲染）
[ ] 未产生不必要的共享依赖（符合 Architecture Decision）
[ ] 未修改任何禁止文件（git status 应只有目标单元目录新增）；未引入新依赖/新构建步骤
[ ] pnpm check:registry PASS（注册表同步）
[ ] pnpm run build PASS
[ ] docs/verify-discovery.cjs：新 id 出现在 live bundle
[ ] Marketplace 可识别/可添加（见下表）
[ ] 既有 Widget 无回归（build + probe 全量 id）
```

**Marketplace 真实必需字段（从 `components.tsx` MarketTab 源码核实）**

| 市场行为（源码事实） | 必需字段 |
| --- | --- |
| 市场列表按 group 去重，卡片显示 group 名 + 实例数 + desc | `manifest.group`（缺省=id）、`manifest.sizes`、`t('widget.<id>.desc')` |
| 搜索匹配 `name + desc + id` | `id`、name/desc   键存在（zh+en） |
| group 标题 = `t('group.<group-id>')` 回退 widgetName | 可选：manifest.locale 提供 `group.<id>` 键（新分类建议提供） |
| 预览 = 每 widget × 每 size，渲染 render + example | `render`、`example.stats/sim`（可选） |
| simToggle 存在时预览可点击翻状态 | `simToggle`（可选） |
| 添加 = 实例 `widget@size` 进 installed | sizes 派生（无需额外字段） |

## Layer 2 — Product Quality（PASS 或 REWORK；REWORK 是正常迭代）

> 以下任何一项不达标 → **REWORK（不是失败）**，进入 Human → Worker 修改 → 再校验循环。

```text
[ ] 尺寸与 spec 一致（含 2x4 变体行为）
[ ] 卡片标题 === Human Title，且使用 spec.titleKeys.key（独立键），未用 name 键充当标题
[ ] 名称/描述与 spec 一致（zh/en）
[ ] 核心内容与展示信息完整且正确
[ ] 主数字槽位符合 spec.visualRequirements.numberHierarchy（大字独立行 / 标题行内联 / 右端小字）
[ ] 视觉要求落实（布局/重点/风格 token）
[ ] 信息层级 / 排版 / 间距符合项目视觉规范
[ ] 文案润色到位（无 raw key、无错译）
[ ] 数据语义正确（数值单位/格式符合预期）
[ ] 交互需求落实（如有）
[ ] 参考图相似度（如提供）
```

## 判定

- Layer 1 任一 ❌ → **BLOCKED** → STOP / Escalation（07），修系统问题后重跑校验。
- Layer 1 全 ✅ + Layer 2 全 ✅ → **PASS** → VALIDATION → Completed。
- Layer 1 全 ✅ + Layer 2 有 ❌ → **REWORK**（记录具体修改意见）→ IMPLEMENTING 再循环。