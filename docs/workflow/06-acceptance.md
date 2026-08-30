# 06 — Acceptance Criteria + MVW 定义 + 验证命令

每个 Widget 在实现前就必须有验收标准（写入 Specification 的 `acceptanceCriteria`）。集成阶段由主 Agent 执行。

## Minimum Viable Widget（MVW）定义（ARCH-003）

**MVW = 已合法进入 Widget 生态、可以继续迭代的最小完整 Widget。** 它不是最终优秀
Widget，它是迭代的安全起点。MVW 判定的唯一依据是下列硬门槛全部达成：

```text
Structural    Widget Unit 合法 / manifest 合法 / index.ts 合法 / ID 一致 / Contract 合法
Discovery     可被发现（gen-registry 扫描到）
Registry      自动进入 Registry（无需人工编辑中心文件）
Runtime       可正常加载/渲染；不破坏已有 Widget
Marketplace   可进入正确分类 / 有基础信息（name+desc zh+en）/ 可被正常添加
Iteration     人可继续提修改；Worker 可安全修改并重新 Review / Validation
```

Product Quality 任何不达标 → **REWORK**（允许；见 05 Layer2），**不影响** MVW 判定。

## 标准验收清单

```text
Layer 1 — System Integrity（硬门槛；FAIL ⇒ BLOCKED）
[ ] Contract 合法；manifest / index.ts 合法；ID 三元一致
[ ] 数据来源与 spec.dataFieldPriority 一致；可选缺失用 undefined 省略
[ ] 不产生不必要共享依赖
[ ] Discovery / Registry / Build / Runtime 全通
[ ] Marketplace 可归类、可识别（name/desc zh+en）、可添加
[ ] Isolation：未触碰其他 Widget；无回归

Layer 2 — Product Quality（PASS 或 REWORK）
[ ] 尺寸正确；卡片标题 === Human Title（独立 title 键）
[ ] 内容与展示信息正确；主数字槽位符合 numberHierarchy
[ ] 视觉/文案/数据语义符合预期；参考图相似度（如提供）
```

## 三种结果

| 结果 | 含义 | 动作 |
| --- | --- | --- |
| **PASS** | 系统完整 + 产品质量达标 | 进入 Completed（最终 Human 边界确认） |
| **REWORK** | 系统完整，产品需修改 | 正常迭代：Human 意见 → Worker 修改 → 再校验 |
| **BLOCKED** | 系统阻塞（Registry/Build/Marketplace/Contract 等） | STOP / Escalation（07），修系统问题 |

## 验证命令（按序执行）

```sh
node scripts/validate-widget-unit.mjs src/widgets/<id>   # MVW 硬门槛（Contract + 市场必需字段 + locale）
pnpm check:registry                                       # 注册表与单元同步守卫
pnpm run build                                            # 生成 + 构建
node docs/verify-discovery.cjs <id>                       # live bundle 发现探测（含既有全量）
```

## 运行时验证

- host 路由未变时，`lib/client.js` 静态服务，浏览器硬刷新即生效（无需重启 dsh web）。
- host 路由变化（新增 endpoint）时需要 `D:\dsh-home\restart-dsh.cmd`——由用户手动执行，Agent 只负责写自包含探测脚本留证。