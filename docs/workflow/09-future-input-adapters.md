# 09 — Future Input Adapters（未来输入接入位置）

**本次不实现 GitHub / PR 自动导入。** 本文件只固化转换位置与规则，为未来扩展保留接口。

## 统一转换目标

任何外部输入先转换为中间形态 **Widget Candidate**，然后进入标准 Workflow：

```text
GitHub Issue / PR / Repo / Screenshot / External HTML / External Code
        │
        ▼
   Widget Candidate（结构化摘要，见下）
        │
        ▼
   Human Requirement Review ──► Requirement Form ──► 标准 Workflow
```

## 规则（不可绕过）

1. 外部来源只是「灵感 / 候选输入」；**必须经 Human Requirement Confirmation 才能转正**。
2. 第三方代码进入前必须过三关，位置预留：
   - `License / Provenance Review`（能否复用、归属、再分发条件）
   - `Security Review`（凭据/脚本注入/网络行为/依赖）
   - `Architecture Review`（是否符合现有 Contract / 共享层边界）
3. 未来实现位置：本仓库 `scripts/adapt/`（`github-issue.mjs`、`screenshot.mjs`、`external-code.mjs` 等）——命名与接口在实现时按当时需求定，本文件只声明「此处是适配器归属」。

## Widget Candidate 中间形态（预留字段）

```jsonc
{
  "source": "github-issue | github-pr | github-repo | screenshot | external-html | external-code",
  "sourceRef": "https://github.com/…/issues/123",
  "extracted": {
    "suggestedName": "…",
    "suggestedPurpose": "…",
    "suggestedSize": null,        // 截图/描述可推断，但必须 Human 确认
    "suggestedContent": "…",
    "suggestedData": ["…"],
    "screenshots": ["…"],
    "codeSnippets": ["…"]
  },
  "provenance": { "license": "?", "author": "?", "verified": false },
  "securityReview": { "status": "pending", "notes": [] },
  "architectureFit": { "status": "pending", "notes": [] }
}
```

→ Candidate 经 `01-requirement-form.md` 的 Completeness Check 转正式 Requirement Form；缺失项照常向 Human 询问。