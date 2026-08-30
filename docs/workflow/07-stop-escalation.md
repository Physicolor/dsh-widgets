# 07 — STOP / Escalation 机制

任何 Agent（主/Worker/Review）在以下情况**立即暂停**，不允许用 workaround 掩盖、不允许擅自裁定。

## BLOCKED = 唯一 Workflow Failure（ARCH-003）

三态结果中，只有 **BLOCKED**（System Integrity 硬门槛未过）是真正的失败：

```text
Layer1 任一 ❌（见 05/06）：
Contract 非法 / Registry 生成失败 / Build 失败 / Marketplace 无法识别或添加 /
需修改其他 Widget 才能创建 / 造成旧 Widget 回归 / Isolation 被打破
→ BLOCKED → 本文件处理
```

**BLOCKED 不是产品问题。** 产品表现不理想 → REWORK（正常迭代，不触发本文件）。

## 必须 STOP 的情形

| 场景 | 动作 |
| --- | --- |
| Human-owned 需求不明确（如：到底是 2x2 还是 2x4） | STOP → 列问题清单问 Human/主 Agent |
| 需求相互冲突（如：要求展示 8 项核心信息但指定 2x2 极简布局） | STOP → 请求人裁决取舍 |
| 技术方案重大架构影响（如：为一个 Widget 改 Runtime / 改构建体系） | STOP → 方案 + 影响面呈报，Human 确认后才继续 |
| 数据源不可确认（API 是否存在完全不确定） | STOP → Technical Research；无法落地 → 标记 Experimental/搁置 |
| 安全风险（要求暴露凭据 / 密钥进前端） | STOP → 拒绝并解释（凭据只能走 host Credentials） |
| 需要新外部依赖/新构建工具 | STOP → 呈报，不擅自引入 |
| 系统规范不确定（如「这个字段是否 Marketplace 必需」） | 先自查：真实 MarketTab 实现 → Contract → Validator → 仍不定才升级 |
| Review 发现 Worker 擅自改了 Human-owned 需求 | STOP → REWORK，通知主 Agent |

## Escalation 路径

```text
Worker ──STOP──► 主 Agent ──►（可自行判定的技术项）自行裁决
                         └──►（产品项 / 重大架构项 / 安全项 / BLOCKED 系统问题）Human 确认
```

## 恢复

- STOP 不是丢弃：问题解决后从 Production Record 记录的当前状态继续（不倒退到 DRAFT）。
- 每次 STOP 必在 Record 的 `history` 追加 `{status: 'HUMAN_REVIEW'|'BLOCKED'|'FAILED', note: 原因}`。