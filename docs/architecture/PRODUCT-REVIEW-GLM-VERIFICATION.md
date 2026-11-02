# PRODUCT-REVIEW-GLM 核查报告

> 对象：[`PRODUCT-REVIEW-GLM.md`](PRODUCT-REVIEW-GLM.md)（GLM 5.3 撰写，2026-10-22，只读调研）。
> 核查：2026-10-22，基于仓库 `1384b3e` + 当时未提交的 v1.8.6 / FOLD 改动；外部数据经 GitHub / npm API 实时复核。
> 方法：逐条读源码（设置三页、市场、配置、prefs、i18n、CSS、workflow、README、截图、探针）+ 读取两张实机截图 + 外部 API 取数。
> 结论标记：**属实** / **部分属实** / **不属实** / **待验证**。「修法」不等于「本次已修」——落地范围见文末。

---

## 1. 逐条结论

### 1.1 设置面板

| ID | 结论 | 依据与修正 |
|---|---|---|
| PR-01 模态窗遮住 rail | **待验证（证据不足）** | 设置页确实是官方 settings.section（`Settings.tsx` 的 `WidgetsPage`；`index.ts` 的 `settings.section` 注册），rail 的设置齿轮只做两次点击导航（`rail-view.tsx` 的 `openSettingsSection`）。但报告称「视觉模型确认模态」，其列出的两张截图（`desktop-market.png` / `desktop-rail.png`）都不含设置窗，仓库里也没有设置页截图。**在实机量测前不应按 P0 排期**。此外当前拼版（2026-10-20 起）设置页与 rail 同时存在，遮挡结论需重新拍图 |
| PR-02 每行 desc 复读 | **部分属实** | 17 行确实全部强制带 desc（`Row` 组件），是页面灰字噪声的主体。但「约 8 行在复读」偏多：真正近重复的是 `magnify`、`maxWidgets`、`panelWidth` 以及 `columns`/`maxRows` 互指，约 5 行；`cardSide` / `wholeCards` / `padding` 的说明含真实信息 |
| PR-03 tab 名近义 | **属实，建议名需修正** | `tab.config`「组件配置」/ `tab.settings`「组件设置」只差两个字。报告建议的「外观与动画」覆盖不了该 tab 的网格尺寸与宿主界面项；本项目采用「外观与布局」 |
| PR-04 动画组过重 | **属实** | 5 行 + 2 个 `CurveRow`；`openShape.desc` 139 字、`animShiftCurve.desc` 149 字（按中文字符计） |
| PR-05 最多组件数难懂 | **属实，但「移除」非零影响** | 上限确由列×行钳制（`effectiveMaxWidgets`）。但该值**只用于「能否添加」**（市场/配置读 `maxPlacement`），rail 渲染 `prefs.order × installed` 全量、不按它裁剪。直接删行会让已存的小上限变成无 UI 可改的隐藏状态；必须先决定「固定为列×行并迁移」还是「移入高级折叠」 |
| PR-06 面板宽度死设置 + 单行组 | **属实** | `panelWidth` 唯一消费者是 `surfaces/add-panel.tsx`，而该文件**没有任何 import**，`lib/client.js` 里 `AddPanel` 出现 0 次。README 旧文声称可用 `localStorage['dsx-addpanel-local']='1'` 重新启用，实测源码与构建产物都无此键——该说明是错的（已修） |
| PR-07 行距与层级 | **属实（数值准确）** | 行 `padding: 14px 0` + 每行底线；组间 22px；组头 14px/600 与行标题 14px/400 同色 |
| PR-08 标题句式/术语 | **属实** | 「可显示的最多行数」vs「最多列数」；「无极变化（连续跟随）」 |
| PR-09 无恢复默认 | **属实** | 客户端全仓无恢复入口；`DEFAULTS` 未导出 |
| PR-10 基准边长 desc 过密 | **属实** | 48 字讲三层机制（最小边 / 10px 档 / 5 行上限） |

### 1.2 组件市场

| ID | 结论 | 依据与修正 |
|---|---|---|
| PR-11 搜索只匹配代表组件 | **属实（P0 功能缺陷）** | 先按组去重，再只对代表组件的 name/desc/id 过滤；组标签与组内其它成员完全不参与。搜索「时钟 / GPU / 系统」会得到「无结果」，但市场里明明有该组 |
| PR-12 首屏无预览 | **属实** | grid 视图画真卡；list 视图只有色环 + 名称 + 徽章 + 代表组件 desc，无缩略图、无 chevron |
| PR-13 裸数字徽章 | **属实** | 值是「组件 × 尺寸」的实例数，裸数字确实像通知 |
| PR-14 组序=注册表序 | **属实** | 顺序即 `WIDGETS` 注册序，新用户最可能先装的会话/时间组不在最前 |
| PR-15 组卡无已装标记 | **属实且为有意决定** | 代码注释写明「一个实例已装还是全部已装」有歧义，故不加；可在预览页补「该组已装 2/5」 |
| — 组描述错配（报告未提） | **属实** | list 卡的 desc 取组**代表组件**的 desc，于是「系统」组的说明是「本轮会话的轮次与步骤计数」（截图中可见）。与 PR-11 同源，需组级文案才能修 |

### 1.3 组件配置与首跑

| ID | 结论 | 依据与修正 |
|---|---|---|
| PR-16 无空态/无跳转 | **属实** | 无 `installed.length === 0` 分支；顶部计数行是静态文本 |
| PR-17 拖拽无手柄 | **属实，但为有意决定** | 整行可拖；注释明确「官方会话行也无手柄」，且与指标选择器的手柄位置有过统一考虑。加手柄是推翻既有决策，不是修 bug |
| PR-18 首跑弱 | **部分属实** | rail 默认收起属实；默认 7 张卡属实。但「全是小文本卡」不成立：`tokens` 是分段比例条、`cache` 是环 + 三行明细；且 `llm`/`ttft`/`tps`/`tool`/`tokens`/`cache` 在无数据时 `return null`，**首跑实际可能只剩 2–3 张卡**——这比「文本卡」更值得先修 |
| PR-19 凭据卡无指引 | **属实** | 卡面只写「未登录 GitHub — 配置用户名或 token 后可用」/「回复（配置 token 后可测）」，不告诉用户去哪配。实际凭据阶梯：环境变量 / `$DSH_HOME/.credentials.yaml` / `.env`，或 `gh auth login` |
| PR-20 卡片一致性 | **部分属实** | 「Token 用量」重名属实（`heatmap` 与 `heatmap-bars` 的卡标题同名）；环/分段/柱三种占比画法属实；对齐混用可见。「GPU 0% 像坏数据」主观。注：`desktop-market.png` 仍带 2026-10-20 之前的自造面板外壳，基于它的外壳结论已过期；`desktop-rail.png` 是 4 列 + 悬停抓拍，个别项可能是伪影 |

### 1.4 社区与分发

| ID | 结论 | 依据与修正 |
|---|---|---|
| G-01 应用内零回流链接 | **属实** | `src/client` 内 `github.com` 命中 0 次 |
| G-02 无 GitHub Release | **属实** | `publish.yml` 只有 `npm publish`，权限 `contents: read` |
| G-03 缺两段动画资产 | **属实** | `docs/screenshots/` 只有 `rail-demo.gif/mp4`，无级联折叠、无市场安装流 |
| G-04 无社区脚手架 | **属实** | `.github/` 只有 3 个 workflow，无 CONTRIBUTING / issue 模板 / PR 模板 |
| G-05 市场截图 PR 未提 | **属实（本地证据）** | 本地市场仓（`dsh-market-fork`，upstream `awesome-dsh-plugin`）工作区干净、`data/screenshots.json` 无 dsh-widgets 条目。报告称其为 dsh-market，实际仓名不同 |
| G-06 分发执行缺位 | **策略建议** | 运营动作，不是代码缺陷，无法用仓库验证 |
| G-07 视频入手路径 | **策略建议** | 可执行，但不是缺陷 |
| G-08 README 首屏勿大改 | **属实** | 首屏已有 npm/star/license/兼容性徽章；缺 Release badge |
| G-09 topics 16→20 | **属实** | GitHub API 实测 16 个 topics |

### 1.5 外部数据复核

| 数据 | 报告值 | 实测 | 结论 |
|---|---|---|---|
| stars / forks / open issues | 5 / 0 / 0 | 5 / 0 / 0 | 属实 |
| watchers | 0 | `watchers_count` 5（`subscribers_count` 0） | **报告有误** |
| npm 周下载 | 375 | 375（2026-10-12～18） | 属实 |
| 最后 push | 2026-10-14 | `pushed_at` 2026-10-14 | 属实 |
| 版本 | v1.8.6 | npm 最新 **1.8.5**；1.8.6 是本地未发布版本 | **报告口径需注明** |

---

## 2. 报告未提、核查额外发现

1. **README 的「本机备用」说明已失真**（en 两处 / zh 两处）：声称自造面板可由 `localStorage['dsx-addpanel-local']='1'` 重新启用；源码与 `lib/client.js` 均无该键，`AddPanel` 无 import。已按「无挂载路径」改写。
2. **CODE_MAP 按钮表漂移**：仍写「+ 打开加号面板」「拖宽写 `prefs.panelWidth`」，实际齿轮打开官方设置页。已更新。
3. **失效探针**：`scripts/verify-whole-cards-co-tenant.cjs` 的 D2 段断言「自造面板仍可达」，测的是已删功能。已删除该段并更新文件头。
4. **搜索框与视图切换高度**：两者外层都是 30px（`market.module.css` 的 `.dsx-searchwrap` / `.dsx-viewtoggle`），报告标【待验证】的「高度不一致」不成立（26px 是内层 input）。
5. **`maxWidgets` 语义**：只控制添加，不裁剪 rail 渲染；报告「上限=座位数」只在添加侧成立。

---

## 3. 本次已落地（批次 A：零 CSS、零 rail/动画改动、零 schema 删除）

| 项 | 改动 | 对应发现 |
|---|---|---|
| 市场搜索 | 新增 `src/client/surfaces/market/search.ts`（组标签 + 全组成员谓词）；`MarketTab.tsx` 先建组→再过滤；新增离线门 `scripts/verify-market-search.mjs` + G14 | PR-11 |
| 设置信息架构 | tab 改名（已装组件 / 组件市场 / 外观与布局）；删除「组件设置面板」组及其唯一死行；「对话区」→「与宿主界面」；`Row.desc` 改为可选 | PR-02/03/06/08 |
| 文案降噪 | 删除 `magnify.desc`；压缩 `columns`/`cardSide`/`squircle`；大幅压缩三条动画长说明；与标题句式统一（最多行数 / 连续跟随放大） | PR-02/08/10 |
| 恢复默认 | `prefs.ts` 新增 `settingsResetPatch()`（仅本页 16 个外观/布局字段）；设置页页脚两击确认按钮 | PR-09 |
| 配置空态 | `ConfigTab` 新增可选 `onGoMarket`；0 张卡时显示说明 + 「去组件市场逛逛」 | PR-16（部分） |
| GitHub 指引 | 卡面空态改为「配 GITHUB_TOKEN 或 `gh auth login`」；配置表单提示补 `$DSH_HOME/.credentials.yaml` | PR-19 |
| 回流入口 | **评估后不做**（作者决定）：应用内不加 Star / Issues 链接，避免在设置页分散注意力；G-01 的事实成立，但结论按产品判断否决 | G-01 |
| 发布事件 | `publish.yml` 加 `contents: write` + 幂等 `gh release create`（附预览图）；README 双语加 Release badge | G-02 / G-08 |
| 社区脚手架 | `CONTRIBUTING.md` + `CONTRIBUTING.zh-CN.md`；bug / widget-idea issue 表单；PR 模板 | G-04 |
| 文档纠偏 | README 双语删除失效的 localStorage 说明；CODE_MAP 按钮表 / tab 数 / 闸门表更新；失效探针收缩 | 额外发现 1–3 |

**明确未改动**：`Prefs` 字段（`panelWidth` / `maxWidgets` 保留）、任何 `.css`、rail/动画代码、`lib/` 的构建方式、默认安装卡、版本号。

---

## 4. 延后项与原因

| 项 | 原因 |
|---|---|
| PR-01 迷你 rail 预览条 | 前提未证实；需实机量测设置窗与 rail 的几何关系后再设计 |
| PR-04 动画预设 + 折叠 | 动画组正被 FOLD（v1.8.6）改动，必须等其落定，避免同一区域两次改 |
| PR-05 移除「最多组件数」 | 涉及已存上限语义与迁移，需产品决策 |
| PR-07 行距 / 去末行底线 / 组头层级 | 纯 CSS，触发 G5 基线重生；需等 FOLD 的 `rail.module.css` 与 `css.json` 提交后单独做 |
| PR-12/13/14/15 市场转化 | 缩略图渲染成本、徽章文案、组序、已装计数属视觉/产品决策，需截图验收 |
| PR-17 拖拽手柄 | 与成文决策冲突，建议维持 |
| PR-18 默认视觉卡 | 产品决策；且应先修「无数据即 return null」造成的首屏空栏 |
| PR-20 一致性收口 | 先跑官网 Visual Audit 出违规清单，再逐条改 |
| G-03 演示资产 | 需实机 CDP 帧步进采集，单独排期 |
| G-05/G-06/G-07/G-09 | 外部仓库 PR、渠道投放、GitHub topics 设置，需仓库所有者操作 |

---

## 5. 验证

```sh
node scripts/gen-registry.mjs --check
pnpm check
node scripts/verify-market-search.mjs     # 或 node scripts/gates.mjs --only G14
pnpm run build && pnpm test               # G1–G14
```

- 搜索：`时钟 / clock / 系统 / GPU / GitHub` 均命中；乱码为空；清空恢复全部组卡。
- 设置页：5 组 16 行；无「组件设置面板」组；tab 名互不混淆；页脚两击恢复默认只回滚外观/布局。
- 空态：移除全部卡后出现 CTA 并能切到市场；有卡时 DOM 不变。
- 文档：README / CODE_MAP 与代码一致；本文件覆盖全部 30 条 ID。

> 本核查不改写 GLM 报告正文，只标注结论与偏差；产品决策类条目保留原报告的建议供对照。
