# dsh-widgets — Widget Production Workflow (ARCH-002, 校准至 ARCH-003)

> 正式、可重复、可审查的 Widget 生产流程。任何新 Widget —— 无论输入是自然语言、
> 截图、设计稿、GitHub 灵感还是外部代码 —— 都必须经过此流程进入项目。
>
> **ARCH-003 校准**：本 Workflow 的目标不是「一次生成完美 Widget」，而是保证
> **无论经历多少轮创建/修改/人工反馈，Widget 始终是一个合法、可发现、可注册、
> 可进入 Marketplace、不破坏其他组件、并可继续安全修改的组件**——
> 允许做得不完美，不允许做成「孤魂野鬼」。

```text
                 HUMAN
                   │
            提出产品需求
                   │
                   ▼
          Requirement Form
                   │
             Completeness
                   │
                   ▼
         Technical Analysis
                   │
                   ▼
        Architecture Decision
                   │
                   ▼
          Widget Specification
                   │
                   ▼
             Worker Agent
                   │
                   ▼
              Widget Unit
                   │
                   ▼
          System Integrity Check（MVW 硬门槛）
          ┌────────┼────────┐
          │        │        │
        BLOCKED   PASS    REWORK(产品质量未达标)
          │        │        │
          │        ▼        │
          │    Human Review │
          │        │        │
          └────────┼────────┘
                   ▼
             继续修改（可多轮）

最终：System Integrity ✅ + Product Quality 达标 → Marketplace Ready → Completed
```

## 核心概念（ARCH-003 引入）

### Minimum Viable Widget（MVW）
一个「**已经合法进入 Widget 生态、可以继续迭代**的最小完整 Widget」。MVW 不是最终优秀
Widget，它是迭代的**安全起点**。MVW 必满硬门槛（见下）；产品表现可以再改。

### System Integrity vs Product Quality（两层分离）
| 层 | 内容 | 结果 |
| --- | --- | --- |
| **Layer 1 System Integrity**（硬门槛） | Contract / Discovery / Registry / Build / Runtime / Marketplace 可归类可添加 / Isolation（不碰其他 Widget） | PASS 否则 **BLOCKED**（必须修复，不允许带病进入市场） |
| **Layer 2 Product Quality**（可迭代） | UI / 视觉 / 排版 / 信息层级 / 文案 / 数据语义 / 交互 / 参考图相似度 | PASS **或 REWORK**（允许推翻重做、多轮修改） |

### 三态结果（替代二元 PASS/FAIL）
- **PASS**：系统完整 + 产品质量达到当前要求。
- **REWORK**：系统完整（硬门槛全绿），但产品表现需要修改 —— **这是正常开发**，
  不是失败；进入 Human → Worker 修改 → 再校验循环，可重复任意轮。
- **BLOCKED**：系统层面真正阻塞（Contract 非法 / Registry 失败 / Build 失败 /
  Marketplace 无法识别 / 需修改其他 Widget / 造成回归）—— 这是唯一的 Workflow Failure，
  进入 STOP / Escalation（见 `07-stop-escalation.md`）。

### Human Review 是正常流程
```text
IMPLEMENTING → SELF_REVIEW → REVIEW → HUMAN_REVIEW → REWORK → ...（可循环任意轮）
```
REWORK 是常态；BLOCKED 才是异常。

## 原则（任何人不得违反）

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
| `03-specification.md` | Widget Specification schema（Worker 标准输入）+ MVW 目标 |
| `04-worker-instructions.md` | Worker Agent 职责、边界、禁止项、自检 |
| `05-review-checklist.md` | 双层 Review：Layer1 System Integrity（硬门槛）/ Layer2 Product Quality（可迭代） |
| `06-acceptance.md` | MVW 定义 + 验收标准 + 三态结果 + 验证命令 |
| `07-stop-escalation.md` | STOP / Escalation 机制（BLOCKED 触发） |
| `08-production-record.md` | Production Record 状态机（含 BLOCKED / HUMAN_REVIEW 循环）+ 记录格式 |
| `09-future-input-adapters.md` | 未来 Screenshot / GitHub / External Code 输入适配位置 |
| `record.schema.json` | Production Record 的机器可读 schema |
| `records/` | 每 Widget 的生产记录档案 |

## 状态机（可观察、可恢复、不向后传播）

```text
DRAFT → REQUIREMENT_READY → TECH_ANALYSIS → ARCHITECTURE_READY → IMPLEMENTING → SELF_REVIEW
   → REVIEW → VALIDATION → INTEGRATION → COMPLETED

FAILED / BLOCKED → HUMAN_REVIEW → REWORK →（回 REQUIRED_状态，不向后传播到 DRAFT）
REWORK（产品迭代）→ IMPLEMENTING（同一 Widget 修改，状态不倒退）
```

- 状态只允许向前或经 REWORK 回明确源状态，**never 回 DRAFT**。
- 每次修改（包括产品迭代 REWORK）追加 `history` 一条，可观察、可恢复。
- 完整流转规则见 `08-production-record.md`。

## 命令速查

```sh
pnpm gen:registry          # 发现并重写注册表（build 自动执行）
pnpm check:registry        # 注册表与单元目录一致守卫
node scripts/validate-widget-unit.mjs <dir>   # MVW 硬门槛校验（Contract + 市场必需字段 + locale 完整）
pnpm run build             # 产物构建
node docs/verify-discovery.cjs                # live bundle 发现探测
```