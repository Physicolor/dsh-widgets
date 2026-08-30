# dsh-widgets — Widget Production Workflow (ARCH-002)

> 正式、可重复、可审查的 Widget 生产流程。任何新 Widget —— 无论输入是自然语言、
> 截图、设计稿、GitHub 灵感还是外部代码 —— 都必须经过此流程进入项目。

```text
              HUMAN
                │
       产品需求 / 灵感 / 视觉
                │
                ▼
       Requirement Form
                │
         Human Confirmation
                │
                ▼
        Completeness Check          ── 缺产品关键项 → STOP(问人)
                │
                ▼
       Technical Feasibility Analysis  ── Agent 自主（数据源/复杂度/风险）
                │
                ▼
       Architecture Decision       ── Widget-only / +Shared / +Provider / +Host / +External
                │
                ▼
      Widget Specification         ── Worker 标准输入（结构化 JSON）
                │
                ▼
          Worker Agent
                │
                ▼
          Widget Unit
                │
          Self Check                ── scripts/validate-widget-unit.mjs
                │
                ▼
         Independent Review Agent   ── PASS / FAIL
                │
                ▼
    Integration (Discovery / Registry / Build / Runtime Probe)
                │
                ▼
      Human Final Confirmation      ── 产品边界最终确认
                ▼
         Marketplace
```

**原则（任何人不得违反）**：

- 人决定「做什么」（产品需求），Agent 决定「怎么做」（技术实现），系统负责验证「做得对不对」。
- 未经 Human Requirement Confirmation 的产品需求，不得因 Agent 自动推理直接进入正式 Widget。
- 技术细节（API 怎么取、要不要 Provider、怎么缓存）不得阻塞流程，也不得强迫用户回答。
- 任何外部来源（截图/GitHub/网页/代码）只是「灵感与候选」，必须经 Human Requirement Review 转正。
- 每个 Widget 生产全程留下一个机器可读 **Production Record**（见 `08-production-record.md`）。

## 流程位置速查

| 文档 | 内容 |
| --- | --- |
| `01-requirement-form.md` | Widget Requirement Form + Completeness Check + Human Checkpoints |
| `02-technical-analysis.md` | Technical Feasibility Analysis + Architecture Decision |
| `03-specification.md` | Widget Specification schema（Worker 标准输入） |
| `04-worker-instructions.md` | Worker Agent 职责、边界、禁止项、自检 |
| `05-review-checklist.md` | 独立 Review Agent 审查清单（基于真实 Marketplace 实现） |
| `06-acceptance.md` | 验收标准与验证命令 |
| `07-stop-escalation.md` | STOP / Escalation 机制 |
| `08-production-record.md` | Production Record 状态机与记录格式 |
| `09-future-input-adapters.md` | 未来 Screenshot / GitHub / External Code 输入适配位置 |
| `record.schema.json` | Production Record 的机器可读 schema |
| `records/` | 每 Widget 的生产记录档案 |

## 状态机（可观察、可恢复、不向后传播）

```text
DRAFT ──► REQUIREMENT_READY ──► TECH_ANALYSIS ──► ARCHITECTURE_READY ──► IMPLEMENTING
   ▲              ▲                  │                  │                    │
   │              │                  ▼                  ▼                    ▼
   └──────────────┘            (STOP/HUMAN_REVIEW)  (STOP/HUMAN_REVIEW)  SELF_REVIEW
                                                                              │
                                                                              ▼
            FAILED ◄── REWORK ◄── HUMAN_REVIEW ◄── FAILED ◄── REVIEW(PASS/FAIL)
              │                                                          │ PASS
              ▼                                                          ▼
         (回到对应状态)                                           VALIDATION
                                                                      │
                                                                      ▼
                                                                  INTEGRATION
                                                                      │
                                                                      ▼
                                                                  COMPLETED
```

- 状态只允许向前或回到「明确源状态」的 REWORK 边，**never 向后传播**（Review 失败不会退回 DRAFT）。
- 每一步在 Production Record 的 `history` 追加 `{status, at, note}`，可观察、可恢复（任何状态都可从 Record 重启）。
- 完整流转规则见 `08-production-record.md`。

## 命令速查

```sh
pnpm gen:registry          # 发现并重写注册表（build 自动执行）
pnpm check:registry        # 注册表与单元目录一致守卫
node scripts/validate-widget-unit.mjs <dir>   # Worker 自检 / Review 校验（Contract+locale 完整）
pnpm run build             # 产物构建
node docs/verify-discovery.cjs                # live bundle 发现探测
```