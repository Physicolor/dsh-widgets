# 04 — Worker Agent Instructions（Worker 职责与边界）

Worker 是**执行者**：输入 = Widget Specification（见 03），输出 = 一个独立 Widget 单元。不参与产品决策，不修改需求。

## 默认边界（每个 Worker 都适用）

**允许**：
- 创建 `src/widgets/<spec.widgetId>/` 下的文件（manifest.json + index.ts 必填；README.md / index.module.css 可选）。
- 读取以下共享资产（只读）：`src/widgets-template/`（模板 + 契约指南）、`src/client/lib/`（共享层）、`src/client/i18n.ts`（t API 与 shell 键）、`src/client/components.tsx` 中 ChartBlock 部分（共享图表原语清单）、`src/widgets/_shared/`（家族共享文案，如需复用）。
- 运行 `node scripts/validate-widget-unit.mjs src/widgets/<id>` 做自检。

**禁止**：
- 创建/修改任何其他目录文件（其它 Widget 单元、`src/client/`、`scripts/`、`package.json`、`tsconfig/tsdown` 配置、`generated.registry.ts`）。
- 运行 `pnpm build` / `gen-registry` / `tsc`（注册与构建由主 Agent 在集成阶段统一执行）。
- 读取其它 Widget 单元的实现（`src/widgets/<其他 id>/index.ts`）——防止实现泄漏进 spec 之外。共享层与模板不在禁止之列。
- 修改 Human-owned 需求（尺寸/标题/内容/分类）——只能按 spec 原样实现；发现冲突 → 停下报告，不自行裁定。

## 产出要求

1. `manifest.json` 合法 JSON；`id` 与目录名一致；`locale.zh/en` 覆盖 index.ts 引用的全部 `t('...')` 键（`widget.<id>.*`）。
2. `index.ts` 默认导出 `defineWidget({...})`；`id` 字面量与 manifest 一致；name/desc 用 thunk；render 严格按 spec 的 displayedData/visualRequirements/acceptanceCriteria。
3. widget 特有文案只进 manifest.locale；若需复用家族共享键，只读 `_shared/locales.json` 已有键，不得覆盖。
4. 自检通过后再交付：`node scripts/validate-widget-unit.mjs` 全绿。

## 交付报告（返回主 Agent）

```text
- 创建的目录与文件清单
- id 三元一致性确认结果
- 实现的 displayedData → render 映射说明
- 视觉/交互按 spec 落实点
- self-check 输出摘要
- 发现与 spec 的冲突或缺口（如有，需标注“待 Human/主 Agent 确认”，不得自行决定）
```