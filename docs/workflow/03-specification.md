# 03 — Widget Specification（Worker 标准输入）

主 Agent 生成、传给 Worker Agent 的唯一输入。**Worker 只按 Specification 实现，不得自行扩大范围。**

```jsonc
{
  "schema": "dsh-widgets/widget-spec/v1",

  // ── 产品（Human-owned，实现时必须逐项满足）──
  "widgetId": "context-water",          // kebab-case；目录名 === manifest.id === index.ts id
  "name": "上下文水位",                   // 显示名（zh；en 另给）
  "purpose": "展示上下文占用与系统/工具/消息构成",
  "size": ["2x2", "2x4"],               // Human 确认的尺寸
  "title": "上下文已用",                  // 卡片标题
  "coreContent": "占用百分比 + 窗口容量 + 构成分段",
  "displayedData": "contextPercent / contextWindow / 分段 token 数",
  "category": "system",                 // 现有或新建分类（Human 已确认）
  "titleZh": "上下文已用", "titleEn": "Context Used",
  "titleKeys": {                        // ★ 回归测试(A). 强制：卡片标题必须用独立键
    "key": "card.<id>.title",           //   （禁止用 widget.<id>.name 当标题)
    "note": "Worker 必须新增 card.<id>.title 键并用于 render 的 title；widget.<id>.name 仅市场卡片名"
  },
  "visualRequirements": {               // Human 提供或标注待确认
    "reference": "官方 ContextMeter JObwrW 模板",
    "layout": "标题行下大百分比，右端 ~X / 窗口；下方横条分段 + 逐段说明行。2x4 变体：百分比移到标题行右端",
    "focus": "百分比为主数字优先",
    "numberHierarchy": {                // ★ 回归测试(C). 主数字槽位：大字独立/标题行内联/右端小字
      "2x2": "percent=大字独立行(headAfter.big)，容量=同旁小字",
      "2x4": "percent=标题行内联大号(value 槽)，容量=右端小字(headRight)"
    },
    "styleTokens": "system=中性蓝灰 / tools=紫 / messages=品牌蓝（与官方一致）"
  },

  // ── 技术（Agent-owned，已分析并落定）──
  "technicalStrategy": {
    "architecture": "Widget-only",
    "dataSource": "现有 stats 投影 contextPressure(contextPercent/contextWindow) + contextBreakdown",
    "dataFieldPriority": [              // ★ 回归测试(B). 主/备数据源显式排序（参考 segments 段和 vs contextTokens）
      "used = contextTokens(投影) 缺失时 = 段和(system+tools+messages)",
      "capacity = contextWindow；缺失时省略该展示（undefined），不得渲染空串"
    ],
    "requiredProvider": null,
    "sharedUtility": null,
    "complexity": "Medium",
    "risks": "投影缺失时 render 返回 null（卡片隐藏）",
    "contractHints": {
      "chartKinds": ["segments"],        // 允许使用的共享 Chart 原语
      "widthForSize": "2x4 = 2*unit+gap"
    }
  },

  // ── 验收 ──
  "acceptanceCriteria": [
    "2x2 与 2x4 都可渲染",
    "卡片标题 === Human Title（用 titleKeys.key，不得用 name 键）",
    "主数字槽位符合 numberHierarchy（2x2 大字独立行 / 2x4 标题行内联大号）",
    "可选数据缺失时对应字段用 undefined 省略（不渲染空串）",
    "百分比特大显示，右端显示 used/capacity",
    "分段条三色与官方一致，底部三行 label+数值",
    "数据缺失时返回 null",
    "market 分类 system，文案 zh/en 齐全",
    "scripts/validate-widget-unit.mjs 通过"
  ],

  // ── 边界 ──
  "forbiddenChanges": [
    "不得创建/修改 src/widgets/<其他目录>/、src/client/、scripts/、package.json、generated.registry.ts",
    "不得运行 pnpm build / gen-registry / tsc",
    "不得读取既有同类 Widget 单元的实现文件（只读共享层与模板）"
  ]
}
```

## 规范约束

- `visualRequirements` 必须有：Human 给了参考 → 原样引用；Human 未给 → 明确写 `"待用户确认"` 并将该字段标为 spec 缺口。**Review 发现 spec 缺口被 Worker 编造补齐 → 按 REWORK 处理（缺口应回到 Human 确认）。**
- `forbiddenChanges` 必须逐条列出 Worker 的禁止项（引用 `04-worker-instructions.md` 的默认边界 + 本任务特有项）。