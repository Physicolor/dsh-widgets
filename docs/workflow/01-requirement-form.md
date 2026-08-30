# 01 — Widget Requirement Form（需求表）

每次 Widget 创建的入口。**Human-owned 字段必须由人提供或确认；缺失即 STOP 并向人询问，不得猜测。**

## Requirement Form

```text
A. Human Input（原则上由人填写/确认）
   Widget Name:            # 用户想叫什么（≠ 技术 id）
   Widget Purpose:         # 这个 Widget 是干什么的
   Desired Size:           # 2x2 / 2x4 / 两者（未来可扩展尺寸）
   Title:                  # 卡片标题，用户希望看到什么
   Core Content:           # 核心信息内容
   Displayed Information:  # 要展示的数据/信息（如 今日步数 / Token/s / CPU%）
   Visual Reference:       # 截图/布局/信息层级/重点元素/风格/视觉优先级（如有）
   Interaction:            # 交互需求（如 点击切换 / 双按确认），无则留空
   Marketplace Category:   # 现有分类意图（system/opencode-go/coding-plan/pricing/other/新建？）
   Existing / New:         # 属于现有分类 还是 需要新建分类
   Priority:               # 高/中/低（影响排期，不影响流程）

B. Agent Notes（Agent 可填，但不得覆盖 A）
   Suggested Category:     # Agent 的分类建议（决定权在人）
   Suggested Data Source:  # Agent 初步数据源建议（技术侧，见 02）
```

**必填确认字段**（缺失任一 → STOP 询问）：`Purpose`、`Size`、`Title`、`Core Content`、`Displayed Information`、`Marketplace Category`。

**不必让用户回答的字段**（Agent 自行分析）：API 获取方式、Provider / Credential / Multikey 需求、缓存策略、数据转换、文件命名、测试策略。

## Completeness Check

```text
[ ] Widget 做什么（Purpose）明确？
[ ] 基本尺寸（Size）明确？
[ ] 核心展示内容（Core Content）明确？
[ ] 标题/名称（Title）明确？
[ ] 分类意图（Category）明确？
[ ] 有视觉参考时，信息层级/重点是否记录？
→ 全部 ✅ 进入 Technical Analysis；任一 ❌ → STOP，把缺失项列成问题清单问用户
```

## Human Checkpoints（人类确认点）

| 检查点 | 时机 | 内容 |
| --- | --- | --- |
| Human Requirement Confirmation | Completeness Check 之后 | 用户确认 Requirement Form 的 Human-owned 字段（尤其 Purpose/Size/Title/Content/Category） |
| Technical Decision Confirmation | 仅当技术方案涉及重大影响 | 新增 Host API / Credential / 外部服务 / Core 修改时，把方案与影响告知用户请求确认；纯实现细节不打扰用户 |
| Final Product Boundary | Integration 完成后 | 产物与需求一致性最终确认，之后才进入 Marketplace |

理想分工：产品问题 → Human；技术问题 → Agent；最终产品边界 → Human；实现细节 → Agent。