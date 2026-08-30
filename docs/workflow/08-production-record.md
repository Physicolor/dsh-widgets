# 08 — Production Record（状态机 + 记录格式）

每个 Widget 的生产全程留下一个机器可读 Record。**记录是 restart / 并行 / 审计的唯一事实源。**

## 状态机（ARCH-003 校准版）

```text
DRAFT
  → REQUIREMENT_READY      # Requirement Form + Human Confirmation
  → TECH_ANALYSIS          # Technical Analysis 完成
  → ARCHITECTURE_READY     # Architecture Decision 落定
  → IMPLEMENTING           # Worker 执行中（含每次 REWORK 后的修改）
  → SELF_REVIEW            # Worker 自检（validate 脚本）
  → REVIEW                 # 独立 Review Agent（PASS / REWORK / BLOCKED）
  → VALIDATION             # 构建 + 探测 + 验收清单
  → INTEGRATION            # 进 Registry / Marketplace 数据就绪
  → COMPLETED              # PASS 且 Human Final Confirmation 通过

迭代边（正常开发，可循环任意轮）：HUMAN_REVIEW ⇒ REWORK ⇒ IMPLEMENTING
  # 系统完整（MVW 达成）但产品表现需修改 → REWORK 是常态，不是异常

失败边（唯一 Workflow Failure）：
  BLOCKED / FAILED ⇒ HUMAN_REVIEW ⇒ REWORK ⇒ 显式源状态
  # 仅修系统问题后重跑校验；目标状态必须显式记录
```

- `REWORK` 目标状态必须显式记录（回到哪个源状态；产品迭代回 IMPLEMENTING，系统修复回对应阶段）。
- Review 判定 REWORK/BLOCKED 永不回 `DRAFT`。
- 状态推进/回溯逐条追加 history（append-only），不覆盖。

## 三种结果（写入 review.result 与 status）

| 值 | 含义 |
| --- | --- |
| `PASS` | 系统完整 + 产品质量达标 → VALIDATION → COMPLETED |
| `REWORK` | 系统完整（MVW 达成）但产品需修改 → IMPLEMENTING（正常迭代） |
| `BLOCKED` | 系统阻塞 → STOP/Escalation → 修复后重跑校验 |

## Record 文件

- 位置：`docs/workflow/records/<yyyy-mm-dd>-<widget-id>.json`
- 格式：`docs/workflow/record.schema.json`

```jsonc
{
  "schema": "dsh-widgets/widget-record/v1",
  "widgetId": "context-water",
  "source": "human | agent-proposal | github | screenshot | external-code",
  "status": "COMPLETED",
  "createdAt": "2026-08-30T00:00:00+08:00",
  "requirement": {
    "name": "上下文水位",
    "purpose": "…",
    "size": ["2x2", "2x4"],
    "title": "上下文已用",
    "coreContent": "…",
    "displayedData": "…",
    "visualReference": "…",
    "category": "system",
    "categoryDecision": "existing",
    "priority": "high",
    "confirmedByHuman": true
  },
  "technicalAnalysis": {
    "existingCapability": "…",
    "requiredData": "…",
    "dataSource": "…",
    "requiredProvider": null,
    "externalDependency": null,
    "complexity": "Medium",
    "risks": ["…"]
  },
  "architectureDecision": "Widget-only",
  "specification": { /* Widget Specification 全文，见 03 */ },
  "review": {
    "reviewer": "…",
    "result": "PASS",
    "notes": ["…"]
  },
  "validation": {
    "validateUnit": "PASS",
    "registrySync": "PASS",
    "build": "PASS",
    "discoveryProbe": "PASS",
    "regression": "19/19 ids"
  },
  "result": "COMPLETED",
  "history": [
    { "status": "REQUIREMENT_READY", "at": "…", "note": "…" },
    { "status": "TECH_ANALYSIS",     "at": "…", "note": "…" }
  ]
}
```

## 维护约定

- 主 Agent 拥有 Record；Worker/Review 只读。
- 一次生产一个 Record；同一 Widget 的后续修改 = 新 Record（source 记录修改来源）。
- Record 不追求面面俱到——缺省可省略，但 `requirement` / `architectureDecision` / `result` 必填。