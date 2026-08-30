# Production Records

每个 Widget 一次生产的机器可读记录（格式见 `../record.schema.json`，字段说明见 `../08-production-record.md`）。

命名：`<yyyy-mm-dd>-<widget-id>.json`。

| 文件 | Widget | 说明 |
| --- | --- | --- |
| `2026-08-30-context-water-wf-validation.json` | context-water | ARCH-002 回归测试的 Workflow Validation 记录（对照正式 Widget） |

记录由主 Agent 维护；Worker / Review Agent 只读。