# 06 — Acceptance Criteria + 验证命令

每个 Widget 在实现前就必须有验收标准（写入 Specification 的 `acceptanceCriteria`）。集成阶段由主 Agent 执行。

## 标准验收清单（默认所有 Widget 适用）

```text
Product
[ ] 尺寸正确（含多尺寸变体）
[ ] 卡片标题正确（= Human Title，独立 title 键，zh/en）
[ ] 内容正确
[ ] 展示信息正确
[ ] 主数字槽位/字号层级符合 spec.visualRequirements.numberHierarchy
[ ] 用户确认的视觉要求已实现

Technical
[ ] Contract 合法（defineWidget 契约）
[ ] manifest 合法（id/group/sizes/builtin/defaultInstalled/locale）
[ ] index.ts 合法
[ ] ID 三元一致
[ ] 数据来源正确（含主/备优先级 dataFieldPriority）
[ ] 可选数据缺失时字段用 undefined 省略（不渲染空串）
[ ] 不产生不必要的共享依赖

Integration
[ ] 被 Discovery 发现（gen-registry 扫描到）
[ ] 进入 Registry（generated.registry.ts 含该 id）
[ ] Build 通过
[ ] Runtime 正常（live bundle 含该 id；页面无控制台错误）

Marketplace
[ ] 具备真实 MarketTab 所需信息（见 05 基准表）
[ ] 分类正确
[ ] locale 完整（zh/en，引用键全覆盖）
[ ] preview/example 符合规范（需要时）
```

## 验证命令（按序执行）

```sh
node scripts/validate-widget-unit.mjs src/widgets/<id>   # Contract + locale 完整性
pnpm check:registry                                       # 注册表与单元同步守卫
pnpm run build                                            # 生成 + 构建
node docs/verify-discovery.cjs <id>                       # live bundle 发现探测（含既有全量）
```

## 运行时验证

- host 路由未变时，`lib/client.js` 静态服务，浏览器硬刷新即生效（无需重启 dsh web）。
- host 路由变化（新增 endpoint）时需要 `D:\dsh-home\restart-dsh.cmd`——由用户手动执行，Agent 只负责写自包含探测脚本留证。