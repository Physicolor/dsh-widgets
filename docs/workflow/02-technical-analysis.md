# 02 — Technical Feasibility Analysis + Architecture Decision

Human Requirement **确认后**才允许进入技术分析。全部由 Agent 自主完成，但必须落进 Production Record。

## Technical Analysis 模板

```text
1. Existing Capability       # 现有能力是否直接支持？
                             #   读共享层 src/client/lib/contract.ts、format.ts、usage-view.ts、
                             #   heatmap-accounting.ts 与 components.tsx 的 ChartBlock 原语清单
2. Required Data             # 需要什么数据（字段/投影/事件）
                             #   ★ 每个数据项标注 主(source of truth) / 派生(derived) / 备(fallback)
                             #   例：used = contextTokens(主, 投影) ?? 段和(备)；capacity = contextWindow(主, 缺失则省略)
3. Data Source               # 数据从哪来：
                             #   现有 stats 投影 / Host API / 本地 API / WebServer endpoint /
                             #   外部服务 / 第三方 API / 未来 Bridge
4. Required API / Provider   # 是否需要新增 Provider / Host capability / endpoint / Shared utility
5. External Dependency       # 是否需要外部系统能力
6. Multikey / Usage / Credential  # 是否涉及 OpenCode Usage / Multi-Key / Credentials 类能力
7. Complexity                # Low / Medium / High / Experimental + 原因
8. Risks                     # API 不稳定 / 权限 / 平台差异 / 数据不可得 / 性能 / 隐私 / 运行时限制
```

## Architecture Decision（最小必要架构修改原则）

> 不要为了一个 Widget 把能力塞进 Shared/Core。按能力缺口逐级升级，选**最小**一级。

| 决策 | 适用条件 | 例子 |
| --- | --- | --- |
| `Widget-only` | 现有 stats 字段 + 现有 Chart 原语足够 | 上下文水位（context-water） |
| `Widget + Shared Utility` | 多个同类 Widget 需共享纯函数/文案 | usage 家族共享 usage-view.ts、_shared/locales.json |
| `Widget + Data Provider` | 需要新数据采集/持久化，与 Widget 家族复用 | heatmap-accounting.ts（heatmap + heatmap-bars 共用） |
| `Widget + Host Capability` | 需要 host 路由 / Credential / 外部代理 | usage 路由（/api/opencode-usage） |
| `Widget + External Service` | 需要新外部系统 | 未来心率 Bridge（新 Host 路由 + Credential） |

**判定流程**：先确认现有共享 API 足够 → Widget-only；不够 → 逐级评估，并回答「Shared/Core 修改是否可被多个 Widget 复用」「是否影响并行开发」「能否改为接口」。

## 禁止

- 因一个 Widget 而大规模修改 Core / Runtime → **STOP**（见 07）。
- 把 Widget-specific 逻辑复制 N 份 → 应入 Shared Utility；把通用逻辑塞进单 Widget 单元 → 应入 Shared Core。
- 为一个 Widget 引入新依赖/新构建步骤（需先走 Human 确认）。