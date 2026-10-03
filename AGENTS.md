# AGENTS.md — dsh-widgets

DSH 右侧实时组件栏插件。本仓库的规则是**调查经济性**，完整流程见
`D:\Users\12404\Documents\DeepSeek-Harness\docs\agent-workflow.md`。

## 调查经济性

1. **先查既有工具再动手。** `pnpm check`（registry + tsc）、`pnpm build`、`scripts/snapshot/run.cjs`
   （行为保持网）、`scripts/probe-*.cjs`、`docs/verify-report3/scripts/` 下的 durable 断言。
   已有工具能回答的问题不要新写脚本。
2. **验收先行。** 写探针前先写下"要让什么可观察行为成立"。
3. **同源测量一次做完。** 用 `scripts/lib/probe-harness.cjs` 复用同一次 Chromium 启动与同一次
   gallery 构建；文本宽度/标题宽度/灰字宽度/卡片高度/溢出属于同一次页面加载，必须是**一个**探针里
   的一组断言。多个探针用 `runAll([...])` 一起跑。
4. **不要重复跑同一个验证。** 同一条命令改截断参数重跑不构成新证据；一次跑完、存下输出再判读。
   单次 agent→shell 往返实测 4–13 s，远贵于命令本身——相关命令合并进同一次 shell。
5. **止损。** 调查失败先问是否验收必需：不是就记 limitation 继续；是则最多 2 条有限替代路径；
   仍失败写 BLOCKED 上报。产品/架构/安全项走 `docs/workflow/07-stop-escalation.md`。

## 探针存放

- 一次性调查 → `.tmp-*`（已忽略），**用后删除**。
- 长期断言 → `scripts/probe-*.cjs` / `scripts/verify-*.cjs` / `scripts/lib/`。
- **不要放 `scripts/diag-*.cjs`**——`.gitignore:24` 忽略该前缀，等于永不提交。
  历史上有 110 个 `diag-*.cjs` 因此全部游离于版本控制之外。
- 长期探针不得硬编码 npx 缓存路径或 `chromium-<rev>`：浏览器 exe 用 `scripts/lib/chrome.cjs`，
  playwright-core 模块用 `scripts/lib/playwright-core.cjs`（`_npx` 目录名会变，实测已改两次）。
- 探针改过 `/api/widgets-state` 等状态后必须恢复（见 `docs/verify-report3/FIX-2026-09-17.md`）。

## 硬约束

- `src/client/index.ts` 有历史 mojibake 风险：**含非 ASCII 字面量的文件用 `edit`/`write` 改，
  不要用 PowerShell 文本往返**（`Get-Content -Raw` + `-replace` + `WriteAllText`）。
- 不改变现有 UI 行为；不删既有有效规则。
- 卡片必须能印出完整显示名（2026-09-29 车主规则）；数据驱动的长度例外只有
  `probe-geometry.cjs` 里 `DATA_TRUNCATION_OK` 列出的两条。
