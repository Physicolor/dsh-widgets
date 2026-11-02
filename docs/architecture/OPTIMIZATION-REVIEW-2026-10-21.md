# OPTIMIZATION REVIEW 2026-10-21 — dsh-widgets 全方位代码调研与优化建议

> **本报告由 GLM 5.3 撰写**（BigModel；调研经 ZCode 会话以三路并行静态审计执行，全程只读，**未改动任何代码**）。
> 日期：2026-10-21 · 对象：`dsh-widgets` v1.8.6 @ `1384b3e`（工作区另含未提交的 FOLD/WAAPI 改造，见 §0.3）
> 标注约定：【实测】= 引自仓库探针文档（`FOLD-2026-10-21.md`、`AUDIT-2026-10-20.md`）；【推断】= 静态代码分析结论，落地前建议用 `scripts/lib/probe-harness.cjs` 框架复测。
> 前序报告：`AUDIT-2026-10-20.md`（性能轮，F1–F4 已修复入库）、`FOLD-2026-10-21.md`（动画轮，未提交）。本报告不重复已修复项，只在其基础上向前看。

---

## 0. 结论先说

### 0.1 总评

这个代码库的工程纪律**明显高于平均水平**：热路径决策几乎都有实测数字与探针留存，G1–G13 离线闸门 + 渲染字节基线让重构有安全网，注释记录的是"某日实测多少毫秒、哪个方案被否"。2026-10-20 那轮审计的四处浪费（F1–F4）已全部修复。**架构本身没有问题，不需要推倒任何东西**——纯数据渲染契约、双层注册表、族渲染器共享，这些都应原样保留。

本轮排查发现的问题集中在四类：

1. **流程风险**：实测收益最大的 WAAPI 折叠改造（【实测】点击→首动帧 62–85ms → 23–26ms）目前只存在于未提交的工作区——丢了就白做。
2. **两条误导性/死设置**：`panelWidth`（设置行可调、但唯一消费者已封存）与 `apiKey`（schema 定义、全仓零读取方）。
3. **几笔持续的性能税**：卡片拖拽逐事件全量写、空闲期每 30s 全栏重渲染、sys 数据源过度拉取、multi 路由无缓存且串行、启动无条件预热。
4. **结构与卫生债**：1.06MB 单文件 bundle、死代码集合、工具函数重复、98 个探针目录 + 356 个临时文件残留、CODE_MAP 计数漂移、键盘可达性缺口。

没有一条是"设计错了"；全部是可以在既有闸门保护下小步修掉的债。修复顺序建议见 §0.2，长期维护与拓展战略见 §10、§11。

### 0.2 发现总表（28 条，按优先级）

| ID | 优先级 | 问题 | 位置 | 一句话修法 |
|---|---|---|---|---|
| A-1 | **P0** | WAAPI 折叠改造未提交 | 工作区 20 项改动 | 跑闸门后整体落库，G13 进 CI |
| S-2 | **P0** | `panelWidth` 活 UI 死设置 | `Settings.tsx:260` | 删设置行 + 字段（add-panel 已封存） |
| S-1 | P1 | `apiKey` 死字段 | `prefs.ts:36/167/221` | 删字段与归一化分支 |
| PF-1 | P1 | resize 拖拽逐事件 `setPrefs` | `rail-view.tsx:1100` | 量化 + rAF 合帧，pointerup 提交 |
| PF-2 | P1 | `now` 依赖 → 空闲全栏重渲染 | `collector.tsx:402` | 变化门控 / 时间字段自持 tick |
| PF-3 | P1 | sys 源无条件拉 overview | `sys/adapter.ts:54` | 按 manifest `reads` 按需拉取 |
| PF-4 | P1 | multi 路由无 memo 且串行 | `opencode.ts:58-74` | `memoTtl` + `Promise.all` |
| A-2 | P1 | meter 过渡 `font-size/weight` | `CardBody.tsx:663` | 只过渡 color，或改 transform |
| PF-5 | P2 | 启动预热无条件发上游读 | `commandcode.ts:306` | 读 state 文件判断装卡再预热 |
| PF-6 | P2 | 两个 body 全子树 MO | `rail-view.tsx:429` 等 | 先测成本，再收窄观察目标 |
| PF-7 | P2 | 1.06MB 单文件 bundle | `lib/client.js` | terser `keep_fnames`；评估二工厂 |
| PF-8 | P2 | 溢出守卫在提交路径读布局 | `CardBody.tsx:315-342` | 读挪 rAF / ResizeObserver |
| ST-2 | P2 | 死代码集合 | `opencode.ts:21` 等 | 删死路由/封存面板/死 CSS |
| ST-3 | P2 | 工具函数重复 | `fmtBytes`×2 等 | 合并进 `lib/format.ts` |
| ST-4 | P2 | 热点文件过大 | `RailWave.tsx` 1848 行 | 回归网先行，按序拆分 |
| ST-5 | P2 | 探针/临时残留堆积 | 仓库根 98+356 项 | 一次性清扫 + 固定约定 |
| U-3 | P2 | 预览宽度双来源 | `client/index.ts:370` | controller 传实时 railSide |
| S-3 | P2 | 设置导航四级 DOM 回退硬编码 | `rail-view.tsx:92-148` | 标签表进 i18n；争取宿主 API |
| U-1 | P2 | rail 卡组无键盘导航 | `rail-view.tsx` | roving tabindex + 方向键 |
| A-3 | P2 | slot 布局属性过渡 | `rail.module.css:304` | 仅"纯列变"场景 FLIP 化（后备） |
| T-1 | P2 | CODE_MAP 计数漂移（写 40 实为 61） | `CODE_MAP.md:15/1036` | 改正 + 闸门防再漂 |
| A-4 | P3 | 隐藏态 infinite 动画未暂停 | `card.module.css` 等 | `[data-retired]` 下 `paused` |
| C-1 | P3 | `EXPENSIVE/CHEAP` 硬编码 | `peak-pricing*:56/165` | 走 manifest locale 字典 |
| PF-9 | P3 | 缓存 64 条全清策略 | `rail-view.tsx:957` | 卡数上限变化时再换 LRU |
| PF-10 | P3 | storage 监听器永不卸载 | `heatmap-accounting.ts:246` | 记录为已知良性项 |
| U-2 | P3 | 内联样式为主（有意设计） | `CardBody.tsx` 等 | 维持现状，勿 mass-migrate |
| U-4 | P3 | 设置面板圆角未 token 化 | `panel.module.css` | 下次触碰时变量化 |
| T-2 | P3 | `locale/zh.json` 空壳易误解 | `locale/*.json` | 加一行注释或并入生成 |

### 0.3 基线说明

- HEAD `1384b3e`（docs(audit): the 2026-10-20 performance / complexity audit…）。
- 工作区有 **20 项未提交改动**：`src` 侧 5 个文件（`rail-view.tsx`、`RailWave.tsx`、`deck-cascade.ts`、`rail.module.css`、`gates.mjs`）+ 重建的 `lib/client.js(.map)` + 双语 README/CHANGELOG + 基线 JSON + 3 个未跟踪文件（`FOLD-2026-10-21.md`、`scripts/probe-fold-stress.cjs`、`scripts/verify-fold-math.mjs`）。这是 A-1 的实体。
- 实测口径：`src` 下 ts/tsx 共 167 个文件、33,296 行（上轮审计记 166/33,029，吻合）；组件单元 **61 个**（`src/widgets/*/manifest.json` 实数，README 口径一致）；`lib/client.js` 1,113,304 字节。

### 0.4 怎么用这份报告

每条发现自带**修复方向**（多数含代码级改法）与**验收方式**。修任何一条前：`pnpm test`（G1–G13）必须绿；涉及渲染输出/CSS 的改动按既有流程重生 G4/G5 基线；涉及性能的改动用探针给出前后数字——这是仓库既有文化，本报告只是延续它。

---

## 1. 范围与方法

- **三路并行静态审计**：① 架构与结构（目录、入口、注册体系、构建、文档脚本）；② 组件内容 / UI 设计 / 动画 / 设置面板（逐单元）；③ 性能与代码质量（数据层、渲染、定时器、bundle、宿主侧、git 历史）。
- **主线交叉核验**：对每条 P0/P1 主张用 grep / git / 精读复核到 `file:line`（如 `apiKey` 全仓引用面、`panelWidth` 消费者、multi 路由的 memoTtl 缺失、resize 的逐事件 `setPrefs`、meter 的 font-size 过渡原文）。
- **不依赖实时 GUI**：全部结论来自源码与仓库内探针文档；GUI 相关的验证留给修复阶段的验收步骤。
- 全程零代码改动；本文件是唯一产出。

---

## 2. 组件类型与注册体系

### 现状（值得保持）

- **契约**：`Widget` 接口（`src/client/lib/contract/types.ts:1499`）要求 `render()` 返回**纯数据树** `WidgetRenderOut`（约 30 个数据字段，非 JSX、无生命周期），像素统一由 `CardBody.tsx` + `render/charts/` 绘制。这条不变量让 G4 渲染字节比对成为可能，是整个质量体系的基石。
- **双层注册表**：构建期 `gen-registry.mjs` 扫描 `src/widgets/*` 三向校验后生成 `generated.registry.ts`（G1 `--check` 防漂移）；运行期 `lib/registry.ts` 包装成 LIVE 结构，第三方经 `registerExternalUnit()`（`client/index.ts:58` 导出）注入。61 个内置单元 + 外部扩展通道，设计健康。
- **族渲染器共享**：薄单元（12 行的 `cc-window-5h` 等）是刻意设计——实现共享在 `families/cc/renders.ts`，不是复制粘贴。cc 族 9 个窗口变体共用一套渲染逻辑。
- `widgets-template/` 是活模板（扫描根之外，永不被注册），保留。

### 发现

#### 【T-1 · P2】CODE_MAP 单元计数漂移：文档写 40，实际 61

- **现象**：`docs/architecture/CODE_MAP.md:15`「40 个组件单元在这里折叠成一行」、`:1036`「目前 40 个单元」；实际 manifest 实数 **61**，README（:15/:50/:68）与 G4 闸门口径都是 61。同一文档体系内数字不一致，会误导下一个改代码的人。
- **证据**：`CODE_MAP.md:15,1036` vs `ls src/widgets/*/manifest.json | wc -l` = 61。
- **修复方向**：改两处数字为 61；更根本的修法是让数字来自单一来源——在 `scripts/gen-registry.mjs` 的 `--check` 流程里加一步：grep CODE_MAP 中 `(\d+) 个组件单元` 模式，与实数不符即 fail（约 5 行代码，沿用 gates 模式）。以后每加一个单元，闸门自动逼着文档跟上。
- **验收**：`node scripts/gen-registry.mjs --check` 通过；故意把文档改回 40 应当 fail。

#### 【T-2 · P3】`locale/zh.json` / `en.json` 是空壳，初看像 i18n 缺失

- **现象**：根目录两个 locale 文件各只有 6 行 meta（插件市场列表用），真词典在 `src/client/i18n.ts` + 各 manifest 的 `locale` 块 + `src/widgets/_shared/locales.json` 三层。新人初看会误判"国际化没做"。
- **修复方向**：在两个文件顶部加一行注释指路（"UI 词典见 src/client/i18n.ts 与各 manifest.locale，本文件仅市场 meta"），或干脆由 `gen-registry.mjs` 生成并加 generated 头。
- **验收**：纯文档改动，无需闸门。

---

## 3. 组件内容

### 现状（值得保持）

- **空/加载/错误三态体系统一**：骨架由 manifest 的 `skeleton` 声明（形状与真实卡同剪影、标题保留真文本），单卡 render 崩溃被 try/catch 隔离成占位卡（`rail-view.tsx:929-937`），市场与配置预览同样隔离（`MarketTab.tsx:367-375`、`ConfigTab.tsx:470-477`）。这套三态是很多组件库都没做到位的部分。
- **降级诚实**：sys 无 GPU 时显示 `sysinfo.noGpu` 而非假数据；deepseek 无余额时保持几何不变（`headAfter.big:'—'` + muted tone）；sys-gpu-line 历史不足 2 点退化为纯文本卡。
- **tone 阈值统一**：窗口类 ≥95/exceeded=danger、≥75=warn（`families/cc/renders.ts:53-58`）；低余额分级（danger < 阈值，warn < 2×）。
- `cc-daily` 从不轮询是**有意的**（冷调用要重折叠会话日志，实测 10.6s/21.2s 对 34s 热——`cc/adapter.ts:84-94` 注释），不是缺陷，不要"修"它。

### 发现

#### 【C-1 · P3】`'EXPENSIVE' / 'CHEAP'` 字面量绕过 i18n

- **现象**：peak-pricing 与 peak-pricing-board 的大字状态词硬编码英文（board 注释 `:157` 说明"英文 CHEAP + 中文说明"是有意的双语设计，但决定写死在代码里，换语言时无法调整）。
- **证据**：`src/widgets/peak-pricing/index.ts:56`、`src/widgets/peak-pricing-board/index.ts:165`。
- **修复方向**：在各 manifest 的 `locale.zh/en` 块加 `card.peak.state.expensive / card.peak.state.cheap` 键，render 改用 `t()`。zh 值可以仍然是 `EXPENSIVE/CHEAP`（保持现有观感），但把决定权交回字典。输出不变则 G4 字节比对直接通过。
- **验收**：G4 通过；临时改 zh 值能生效（证明真的走了字典）。

---

## 4. UI 设计

### 现状（值得保持）

- **全面宿主 token 化**：颜色全走 `--dsw-alias-*`，暗/亮主题随宿主切换，插件自有 CSS 变量仅 2 个。卡片三级字阶（13px 标题 / 20px 数值 / 10px 说明）由 CardBody 构建器统一产出（注释明确"唯一出处"）。`tabular-nums` 广泛使用。
- **截断纪律**：所有单行文本 nowrap + ellipsis，且有红色内嵌 outline 溢出守卫（`CardBody.tsx:266-342`）把卡溢出变成可见的开发期缺陷——这是很罕见的防御。
- **窄宽度响应**：rail 列数由实测空间决定；1 列下 2×4 卡隐藏并在市场页标注"1列不可用"；metrics 选择器 340px 断点双列。

### 发现

#### 【U-1 · P2】rail 卡组无键盘导航（可达性缺口）

- **现象**：卡片只能 Tab 线性进入；没有 roving tabindex / 方向键在卡间移动焦点；整卡循环（`cycle`，如 sys-cpu 点卡换大数值）没有键盘等价物。键盘用户无法有效使用这条 rail。
- **证据**：`rail-view.tsx`（deck 渲染处无 tabindex 管理）；对照：市场页卡已有 `role="button" tabIndex={0}` + Enter/Space（`MarketTab.tsx:299-334`），说明作者知道正确做法，rail 侧是遗漏。
- **修复方向**：deck 容器加 roving tabindex——同一时刻只有一张卡 `tabIndex=0`，其余 `-1`；容器级 `onKeyDown` 处理 ArrowUp/Down/Left/Right，按 geometry 顺序移动焦点（复用 `.dsx-slot-focused` 视觉）；Enter/Space 触发当前卡的 `onCycle`（若该卡声明了 `cycle`，rail-view 已有完整的事件分发 `:256-283`，只差键盘入口）。注意放大覆盖层的镜像卡要 `aria-hidden` 或同步焦点，避免双读。
- **验收**：纯键盘走查：开 rail → 方向键遍历卡 → Enter 循环某卡数值 → Tab 到设置瓦片并打开设置页。

#### 【U-2 · P3】内联样式为主——维持现状（防误优化）

- **现象**：CardBody / 图表 / 设置行大量内联 style，6 个 CSS Modules 只承载类规则。
- **判断**：这是**有意的**——尺寸随 `scale` 运行期计算必须内联；G5 字节基线保护类规则。**不建议**大规模 inline→CSS 迁移（基线 churn 巨大、收益为零）。只在顺手时把与 scale 无关的纯静态样式下沉。
- **验收**：无动作项，记录在此防止未来"好心重构"。

#### 【U-3 · P2】配置页预览宽度与真实 rail 双来源

- **现象**：官方设置节注入的 controller 不带 `railSide/detailWidth`（`client/index.ts:370`），ConfigTab 预览回退到 `prefs.cardSide`（`ConfigTab.tsx:630`）；而真实 rail 的边长经过档位放大——预览比例可能与实机不一致。
- **修复方向**：controller 组装处（`client/index.ts`）本就能拿到 `getRailBudget`，把实时 `railSide` 传进 controller props；ConfigTab 有值用值、无值再回退。一处传参，消除双源。
- **验收**：同 `cardSide` 下，预览卡与 rail 实卡同宽（并排截图探针）。

#### 【U-4 · P3】设置面板圆角混用 10/12/14/15/16/999px

- **现象**：各控件圆角来自对官方控件的逐一实测复刻，数值各自为政。
- **修复方向**：下次触碰设置样式时，把这些值收进 `panel.module.css` 顶部的变量区（`--dsx-panel-r-*, ...`），注释保留"复刻自官方 X 控件"的出处。纯维护性改进，无行为变化。
- **验收**：G5 基线重生后字节等价（或仅变量替换差异）。

---

## 5. 动画效果

### 现状（值得保持）

- **动画体系在 FOLD 改造后已属第一梯队**：折叠用 WAAPI（每卡一个合成器驱动动画，关键帧按卡片自身进度采样，`deck-cascade.ts:506-601, 585-587`），主线程忙时仍按刷新率运动；中途反向从当前进度续播（`:49-88`）。【实测】点击→首动帧 62–85ms → 23–26ms；4× CPU 降速下折叠 711–985ms → 293–347ms（设计值 300ms）。
- **`prefers-reduced-motion` 覆盖完整**：CSS 12 处 + JS 5 处（`rail-view.tsx:576,813-822,851`、`RailWave.tsx:276-277,934-939,1512`），未发现遗漏的动画。
- **曲线统一**：回弹通过反解曲线 y1 折进位移 cubic-bezier（`lib/anim-curve.ts:201-264`），CSS 与 JS 级联共用同一条曲线；设置页提供可拖拽曲线编辑器 + 5 预设。
- 级联步长按参与卡数动态推导，保证总时长恒定；列变重排波 12 格封顶。

### 发现

#### 【A-1 · P0】WAAPI 折叠改造未提交——实测最大收益悬在工作区

- **现象**：整个 FOLD 改造（5 个 src 文件 + CSS + 闸门 + 探针 + 文档 + 重建产物，共 20 项）未提交。任何一次误操作（stash 丢失、checkout 覆盖）都会丢掉目前插件里**用户可感收益最大**的一项改动。
- **证据**：`git status`（§0.3 列表）；`FOLD-2026-10-21.md`（未跟踪）。
- **修复方向**：
  1. 工作区跑 `pnpm test`（含新 G13 `verify-fold-math`）+ `pnpm check`，全绿；
  2. 一个逻辑提交整体落库（src + gates + scripts + FOLD 文档 + 基线 JSON + 重建的 `lib/`），commit message 引用 FOLD 文档的前后数字——这是仓库既有惯例；
  3. 确认 `.github/workflows/ci.yml` 的 gates 调用会带到 G13。
- **验收**：`git status` 干净；CI 绿；`scripts/probe-fold-stress.cjs` 复测 onset ≈ 23–26ms。

#### 【A-2 · P1】meter 激活行过渡 `font-size` / `font-weight`——逐帧触发排版

- **现象**：peak-pricing 系的 meter 行（两行窗口标签，激活行品牌蓝且字号加大）内联过渡三元属性：
  ```ts
  // src/client/render/CardBody.tsx:663
  transition: 'color 0.25s ease, font-size 0.25s ease, font-weight 0.25s ease',
  ```
  `font-size` 动画每帧触发 reflow（meter 列及其后续内容全部重排）；`font-weight` 在字重间不可平滑插值（实际上是阶梯跳变），过渡它没有意义。
- **修复方向**（二选一）：
  ```ts
  // 方案 A（最小改，推荐）：只过渡颜色，字号/字重瞬时切换——强调感由颜色承担
  transition: 'color 0.25s ease',
  // 方案 B（保留"变大"的动效感）：行高固定，用合成器属性表达
  //   激活态 transform: scale(1.2), transform-origin: left center
  //   transition: 'transform 0.25s ease, color 0.25s ease'
  ```
- **验收**：G4 基线重生后通过；探针在峰谷窗口切换瞬间计数布局读，应降为 0（方案 A）或不变但无 reflow（方案 B）。

#### 【A-3 · P2】静止 deck slot 过渡 `top/right/width/height` 四个布局属性

- **现象**：`rail.module.css:304-310` 对 slot 的四个布局属性做 0.26s 弹簧过渡。这是**有意的取舍**（注释说明 Dock 式邻位推开必须布局参与；放大覆盖层已全部改 transform，`RailWave.tsx:1735-1755` 记录了 1700 次/秒布局写的教训）。但在低配机器上，列数/尺寸变化时每卡 reflow 仍是可感知成本。
- **修复方向**：**后备项，不建议现在动**。若未来低配机投诉：只对"纯列数变化"（无 2×4 重排、无需真实推挤）的场景预计算 delta 后走 FLIP（transform 从 -delta 到 0），布局过渡保留给真实推挤路径；两档按卡数阈值切换。动手前必须先有逐帧回归网（见 §10.2）。
- **验收**：改动时用 4× CPU 降速探针对比列变场景的帧时长分布。

#### 【A-4 · P3】隐藏态 infinite 动画不暂停

- **现象**：骨架扫光 `dsx-sk-sweep`（1.5s infinite）、峰值脉冲 `dsx-value-breathe`（1.6s alternate infinite）、曲线回放点 `dsx-curve-run-*`（1.8s infinite）在不可见时（retired 抽屉里的 pending 骨架卡、离屏卡、未打开的设置页区域）仍挂动画表。`visibility:hidden` 不绘制，成本极低但非零。
- **修复方向**：一行 CSS 级联：
  ```css
  [data-retired] .dsx-sk-sweep,
  [data-retired] .dsx-value-breathe { animation-play-state: paused; }
  ```
  曲线回放点只在设置页存在，可忽略。G5 基线重生。
- **验收**：retired 状态下 DevTools Animation 面板 0 个运行中动画。

#### 【A-5 · P3】死 keyframes `dsx-drawer-in`

- 见 ST-2（与封存浮层残留一并清理）。

---

## 6. 设置面板

### 现状（值得保持）

- **持久化双通道稳健**：localStorage 立即写 + 宿主文件 `/api/widgets-state` 400ms 防抖 PUT + `sendBeacon` 兜底（`runtime/host-sync.ts:25-83`）；启动按 `savedAt` 新者胜收敛；跨 tab `storage` 事件 + `visibilitychange` 重同步。每卡配置"等于默认即删除键"。
- **归一化严格**：`normalizePrefs` 全字段校验回退（`prefs.ts:197-242`），含 `sys-board@2x2→2x4` 迁移。
- 控件规则统一（数值=Stepper、离散=Select、布尔=Switch），行拖拽排序、metrics 多选拖序 + FLIP 换组动画都做得细。

### 发现

#### 【S-1 · P1】死字段 `apiKey`：schema 定义、全仓零读取方

- **现象**：`apiKey` 只在三处出现——类型声明、默认值、归一化分支——没有任何代码读它，也没有设置行 UI。彻底的死字段，且暗示某次"预留"从未兑现。
- **证据**：`src/client/runtime/prefs.ts:36`（类型）、`:167`（默认 `''`）、`:221`（归一化）；全仓 grep 无其他引用。
- **修复方向**：三处全删。存量用户 state 文件里若存有该键，归一化时本就只拷贝已知字段，删除无兼容风险。
- **验收**：`pnpm check`（tsc 0 错）+ `pnpm test`。

#### 【S-2 · P0】`panelWidth`：设置行活着、效果死了——误导用户

- **现象**：通用设置 tab 有一行"组件设置面板宽度"（Stepper 260–760px，`Settings.tsx:260`；i18n 键 `i18n.ts:120-121/242-243`），但它的**唯一消费者是已封存不挂载的 `add-panel.tsx`**（`:57,61`，树摇掉，不进产物）。用户调它，什么都不发生。
- **证据**：grep `panelWidth` 全部引用面：i18n 文案 ×2、add-panel（封存）、prefs 三处、Settings.tsx 设置行。无其他读取方。
- **修复方向**（按推荐排序）：
  1. **删除**：设置行 + `prefs.ts:43/171/225` 字段 + i18n 四键 + `add-panel.tsx` 文件本身一并清理（git 历史保留设计，封存注释已说明其退役原因）；
  2. 若坚持保留"未来可能复活"：把设置行的渲染也挂到与 add-panel 同一个封存开关后面，默认不可见。
- **验收**：G3/G4 通过；设置页不再出现该行；grep `panelWidth` 仅剩（若选方案 2）封存区引用。

#### 【S-3 · P2】设置瓦片导航：四级 DOM 点击回退 + 硬编码宿主标签

- **现象**：设置瓦片点击后按 `[data-dsx-nav="widgets"]` → 导航列表文本匹配 → 账号菜单项 → `Ctrl+Alt+,` 四级回退打开官方设置（`rail-view.tsx:92-148`），其中文本匹配串硬编码 `'设置'/'Settings'/'账号菜单'/'Account menu'`（`:110`）与 `/退出|sign out|log out/i`（`:132`），rAF 轮询 42/90 帧。宿主改版或出新语言时这里静默失效。
- **修复方向**（递进三层）：
  1. **低成本**：把两份标签表搬进 `i18n.ts` 词典（zh/en 各自的匹配串集），加语言时加一组即可；同时给四级回退加"全部失败"的 console.warn，失效可被发现；
  2. **收敛层级**：验证 `data-dsx-nav` 属性匹配是否已覆盖现版本宿主——是则把文本匹配降为最后兜底甚至删除；
  3. **根治**：向 DSH 上游申请语义 API（`settings.open(section)` 之类）。插件已依赖 3 个 `@deepseek-ai/*` peer 包，这是正门。
- **验收**：切宿主语言后瓦片仍能打开正确设置节（探针：mintCookie 场景或手动）。

---

## 7. 代码结构与仓库卫生

### 现状（值得保持）

- **闸门体系是护城河**：G1–G13（注册表一致性、单元契约、tsc 基线、渲染字节比对 344 份、CSS 字节、宿主路由快照、发布类型、外部单元校验、折叠数学）。死代码基本无法存活正是它的功劳——本轮发现的死项都是闸门覆盖不到的类别（设置字段存活性、CSS 引用存活性、HTTP 路由存活性），见 §10.3 的闸门演进建议。
- **刻意的循环依赖规避**：`lib/registry.ts` → `data/sources.ts` 单向，反向经 `useRuntimeMeta()` 注入（`sources.ts:18-33` 注释记录了"症状是静默空注册表"的教训）。
- **零 TODO/FIXME**、注释密度高且多为决策记录；`any` 仅 19 处且集中在跨包边界的防御性选择器。

### 发现

#### 【ST-1 · P0】未提交改动悬置

见 A-1，同一条。列为 P0 是因为它是其他一切的结构性前提。

#### 【ST-2 · P2】死代码集合（四件，一次清完）

| 项 | 位置 | 说明 |
|---|---|---|
| 死路由 `/api/opencode-usage` | `host/opencode.ts:19-49`（注册 `:21`） | 客户端只打 `-multi` 路由；全仓仅剩两条注释提到它（`client/index.ts:7`、`src/index.ts:7`）。若无意作为外部单元的公开 API，删除注册与实现分支，并同步注释 |
| 封存的 `surfaces/add-panel.tsx` | 整文件 | 无 import、树摇掉。随 S-2 一并删除（历史在 git） |
| 死 keyframes `dsx-drawer-in` | `panel.module.css:193-200` | 全仓零引用，随封存浮层遗留 |
| 死 CSS `.dsx-stats-addpanel*` | `panel.module.css:9-150` | 同上，约 140 行规则块 |

- **修复方向**：一次提交清完。删路由前先确认 `registerExternalUnit` 生态没有依赖它（当前无外部单元分发渠道，风险为零）；CSS 删除后重生 G5 基线。
- **验收**：G1–G13 绿；`grep -rn "dsx-drawer-in\|addpanel\|api/opencode-usage'"` 干净。

#### 【ST-3 · P2】工具函数重复

- **现象**：`fmtBytes` ×2（`sys-disk/index.ts:132`、`sys-procs/index.ts:88`）；`fmtMs` ≥2（`sys-services:111`、`trajectory:6`，上轮审计另记 `lib/format.ts` 一处）；`dayKey` ×3（`lib/format.ts:72`、`host/deepseek.ts:73`、`heatmap-accounting.ts:45`——时区规则不同，前两者真重复，第三个是 UTC 桶化，**不可合并**）。
- **修复方向**：合并前先逐字 diff 实现与舍入行为——G4 是字节比对，格式化输出差一个字符都会炸。确认全同后：client 侧统一进 `lib/format.ts`（单元允许 import 公共层，CODE_MAP §4）；`dayKey` 合并 `format.ts` 与 `host/deepseek.ts` 两处，`heatmap-accounting.ts` 保留并加注释声明时区规则差异。
- **验收**：G4 字节一致（不重生基线直接通过才算真合并成功）。

#### 【ST-4 · P2】热点文件过大——认可仓库既定策略，给出拆分顺序

- **现象**：`RailWave.tsx` 1,848 行（68% 是注释）、`rail-view.tsx` 1,354、`CardBody.tsx` 818、`ConfigTab.tsx` 694（三职责同文件：排序/字段/预览）。仓库自己在 AUDIT §7 记录"拆分是纯移动工作，在逐帧回归网建好前不做"——这个排序是对的。
- **修复方向**（顺序即风险从低到高）：
  1. **先建回归网**：把 `probe-fold-stress.cjs` 包成 `pnpm probe:fold` 一键命令，产出固定格式的帧时长报告，作为后续每次拆分的 before/after 证据；
  2. **ConfigTab 先拆**（不在热路径，三职责天然三文件 + 容器）；
  3. **CardBody 其次**（head/meter/chart/rich/corner 各 section builder 已是离散函数，提取即可）；
  4. **rail-view 与 RailWave 最后**（rail-view 当前有未提交改动，等 FOLD 落库稳定一轮；RailWave 建议先把大段决策记录注释迁到 docs，代码本体变小后再按交互簇拆：悬浮放大 / 滚轮吸附 / 测量缓存）。
- **验收**：每次拆分独立提交，G1–G13 + fold 探针数字附在 commit message。

#### 【ST-5 · P2】仓库卫生：探针残留与脚本散布

- **现象**：仓库根 **98 个 `.probe-*` 目录 + 356 个根级 `.tmp-*` 文件**（gitignore 覆盖，纯本地残留）；探针脚本三处散布（`scripts/` 约 150 个、`docs/` 根约 56 个、`docs/verify-report3/scripts/`）；`docs/` 根混入一次性可执行脚本（`_state-cleanup.cjs`、`heatmap-recovery.js` 等）与正式文档同层。
- **修复方向**：
  1. 一次性清扫（都是可再生/一次性产物）：核对 FOLD/AUDIT 文档引用的目录名后 `rm -rf .probe-* .tmp-*`；
  2. `docs/` 根的脚本迁入 `scripts/diag-*.cjs`（已 gitignore 的本地专用区）或 `docs/research/archive/`，`docs/` 恢复纯文档；
  3. 在 `docs/workflow/` 加一页"探针生命周期"：一次性 → `.tmp-*`（随手删）、要复跑 → `scripts/diag-*`（本地）、要进 CI → `scripts/verify-*`（提交）。CODE_MAP 已解释三者差别，缺的是执行。
- **验收**：`ls docs/*.cjs *.mjs *.js` 为空；根目录 `.probe-*/.tmp-*` 清零。

---

## 8. 性能与资源占用

### 现状（值得保持——这张清单是插件的资产）

1. **三层渲染缓存**：`sameOut` 按输出内容深比较复用对象身份（`rail-view.tsx:56-72,952-957`）→ `cardElCache` 卡片元素缓存（`:1078-1104`）→ 退役抽屉返回冻结元素让 React bail out 整棵子树（`:1346-1352`）。【实测】每次 emit 的卡体重建 62.4 → 6.0（剩 6 是时钟/计时器类本该变的文本卡）。
2. **隐藏页签零轮询**：所有定时器回调 `if (!document.hidden) tick('poll')`（`source-poller.tsx:139-141`），回 tab 立即补拉（`:145-148`）。
3. **cc 源 rail 门控**：栏不可见不轮询（`cc/adapter.ts:46-47`）；deepseek 源**刻意不**门控（采样账本漏采=漏记，注释在 `deepseek/adapter.ts:6-13`——正确取舍）。
4. **定时器/监听器卫生**：逐一核对全部有清理（`measure.ts:691-729` 是最完整的 teardown 范本）。
5. **零运行时依赖**、平台模块 external、宿主侧 `memoTtl` 单飞 + TTL 缓存（commandcode/usage-daily/github/deepseek）、github ETag/304。
6. **retired 抽屉 + 2.5s 预热**：首开成本搬到空闲期（【实测】每次开关挂载 13 张图表卡 ≈285ms React 工作量的问题被这套组合消化）。

### 发现

#### 【PF-1 · P1】卡片 resize 拖拽：每个 pointermove 一次 `setPrefs`——当前最重的未节流写路径

- **现象**：拖右下角手柄调卡尺寸时，`move` 回调逐事件调 `setPrefs({ cardSide })`：
  ```ts
  // src/client/rail/rail-view.tsx:1100（现状）
  const move = (ev: PointerEvent) => {
    setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) })
  }
  ```
  `setPrefs` 的代价 = `JSON.stringify(prefs)` + **两次同步** `localStorage.setItem` + 整桥 emit（rail/collector/头部开关全量重渲染）+ 防抖 host PUT。高刷鼠标 125–250 事件/秒全部照单全收。讽刺的是同仓库 `measure.ts:296-338` 对会话宽度拖拽做过逐帧优化（p99 62ms→30ms，注释在案）——这条等价路径没享受到。
- **修复方向**（两档，可叠加）：
  ```ts
  // 档 1：量化 + 变化门（几行改动）
  let last = s0
  const move = (ev: PointerEvent) => {
    const q = Math.round(Math.max(100, Math.min(220, s0 - (ev.clientX - sx))) / 4) * 4  // 4px 档
    if (q !== last) { last = q; setPrefs({ cardSide: q }) }
  }
  // 档 2：拖拽中只走视觉（本地 ref → 直接写 CSS 变量/几何），
  //        pointerup 才 setPrefs 一次落盘——照抄 measure.ts 的"拖拽中不持久化"模式
  ```
- **验收**：探针模拟 3 秒拖拽，计数 `setPrefs` 调用与 localStorage 写次数：档 1 应 ≤ 30 次（8px 移动一次），档 2 应 = 1 次；拖拽期间无长任务（>50ms）。

#### 【PF-2 · P1】`now` 依赖：会话存在即每 30s 全栏重渲染——一笔永久空闲税

- **现象**：collector 主 effect 的依赖数组末尾是 `now`（`collector.tsx:402`），`now` 由 1s（运行中）/30s（常驻）tick 推进（`:177-180`）。只要开着会话页，**即使什么都没变**，每 30s 也要：全量 `deriveStats` + 热力图网格重建 + `setState({stats})` 新对象 → 整桥 emit → 全部已装卡 `render()` + `sameOut` 比较 + CardBody 守卫。动机只是峰谷窗口卡需要感知时间（`:174-176` 注释）。
- **修复方向**（分两步走，先低风险）：
  1. **变化门**：`setState` 前对派生结果做摘要比较——把 stats 中确实依赖 `now` 的字段（峰谷窗口序号、相对时间桶）单独量化成粗粒度桶（分钟级），其余字段内容未变且无运行中调用时跳过 `setState`。空闲期 30s tick 变成纯比较、零 emit；
  2. **终态**：时间敏感卡自持慢速 tick（clock-face 已示范：自持 1s interval + 分钟桶去抖，`clock-face.tsx:227-240`），collector 彻底不再依赖 `now`。运行中的 `liveTurnMs/liveStepMs`（`:398`）保留 1s 更新——那是真数据变化。
- **验收**：探针挂 5 分钟空闲会话，计数 rail 重渲染次数：现状 ≈10 次，改后 0 次（无窗口边界跨越时）；G4 通过（sim 状态静态，字节比对不受影响）。

#### 【PF-3 · P1】sys 源过度拉取：只装 sys-cpu 也要跑 5 次 TCP 探测 + PowerShell 快照

- **现象**：sys adapter 每个滴答**无条件**同时拉 `/api/sysinfo` 和 `/api/host/overview`（`sys/adapter.ts:40,54`）。overview 那一侧是电源/进程/本地服务/代理四类**主机级**探测——`overview.ts:324-337` 的 5 次 TCP 探测、`:209-231` 的 PowerShell 合并快照（~450ms/spawn，20s TTL）。只装 sys-cpu/gpu/rings 的用户每 5–10s 白付一轮。
- **修复方向**：复用现成的 `reads` 机制——schedule 源已经按"装了声明 `reads:['schedule']` 的卡才订阅"过滤（`data/sources.ts:78-80`）。把同一模式扩到 sys：`sys-power/procs/services/net/board` 五个读主机数据的单元在 manifest 声明 `reads:['host']`（sys-cpu/gpu/rings 不声明），adapter 的 tick 按当前活跃 reads 集决定第二个 fetch 是否发出。宿主路由不动。
- **验收**：只装 sys-cpu 时探针断言 `/api/host/overview` 零请求；装 sys-power 后恢复轮询；G4 不受影响（渲染输入不变）。

#### 【PF-4 · P1】`/api/opencode-usage-multi`：唯一没挂 memo 的贵路由，且逐 key 串行

- **现象**：宿主侧四个贵路由里 commandcode/usage-daily/github/deepseek 都有 `memoTtl`（grep 证实），唯独 multi 没有（`opencode.ts:53-108`），且 `for (const k of keys)` 逐 key 串行 await（`:58-74`，最多 9 把 key）。多 tab / 多 origin 突发时各付一轮最多 9 次串行上游读。
- **修复方向**：
  ```ts
  // 1) 与 usage-daily 对齐挂 20s 单飞缓存
  const usageMultiMemo = memoTtl<...>(20_000)
  // 2) 各 key 是不同账号，跨 key 并行安全：
  const results = await Promise.allSettled(keys.map((k) => fetchUsage(k)))
  //    若上游对单账号有限流再回退串行——但即便串行，memo 也已把并发折叠为单飞
  ```
- **验收**：双 tab 同时触发，探针断言上游只见 1 轮/20s；路由时延从 sum(keys) 降为 max(keys)。

#### 【PF-5 · P2】commandcode 启动预热无条件：没装 cc 卡也要打上游

- **现象**：宿主每次启动都 fire-and-forget 对每个池 key 发 4 个上游读（`commandcode.ts:306-315`），哪怕用户从未装过任何 cc 卡。预热的目的（注释在案）是把 10.6s 冷调用藏到启动期——对 cc 用户是对的，对其他用户是纯浪费。
- **修复方向**：宿主已拥有 `/api/widgets-state` 的持久化文件（`host/state-file.ts`）——启动时读一次 state 文件，`prefs.installed` 里含任何 `cc-*` / 读 cc 数据的单元才预热；否则等首个路由命中再预热（路由已有 20s memo 兜底，首击成本只付一次）。
- **验收**：无 cc 卡的全新启动，探针断言上游 0 调用；装 cc 卡的启动预热照常。

#### 【PF-6 · P2】两个 body 全子树 MutationObserver 挂在流式热路径

- **现象**：`rail-view.tsx:429-430` 与 `measure.ts:662` 各挂一个 `document.body` childList+subtree MO。流式转录期间每批 DOM 插入/删除都进回调（回调本身便宜，但是常量税；rail-view 的那个随 drawer 生命周期摘挂，measure 的 shellMo 常驻 install 期）。
- **修复方向**：**先测再动**（止损原则）：探针计数流式期间两回调的每批耗时，若 <0.1ms/批记 limitation 离场；若值得动，收窄 `observe()` 目标到实际关心的容器（rail 顶部的 co-tenant 判定真正需要的是"宿主哪些节点会出现在 rail 上方"，大概率可限定到会话容器），或在无会话/rail 关闭时 disconnect。
- **验收**：以探针数字决定做或不做；做了则流式期间每批 MO 回调耗时下降且 rail 几何无回归。

#### 【PF-7 · P2】1.06MB 单文件 bundle：不 minify 是刻意取舍，但可以两全

- **现象**：`lib/client.js` 1,113,304 字节，单工厂零分割；市场页/配置页/预览模拟器（`preview/sim`、`example-out`）全部打进首屏包。AUDIT F11 记录不 minify 是为了探针按函数名归因。
- **修复方向**（三选一，推荐先做 b）：
  - a) 维持现状（当前立场，已文档化）；
  - b) **terser `keep_fnames: true`**：保留函数名给探针归因，体积预计砍 40–50%【推断】；`client.js.map` 本来就在，真正的逐行调试走 sourcemap。先确认探针脚本不依赖列号/行号再上；
  - c) 二工厂分割：closure-factory 格式下一个 entry 一个工厂，若 `window.__ModuleLoader__` 支持注册第二个模块 id 并从主工厂惰性 `require`，市场/配置/预览可整体挪出首屏。需要 30 分钟 spike 验证 loader 能力，可行再排期。
- **验收**：b 的验收 = 探针脚本全数可跑 + 解析耗时探针前后对比；c 的验收 = 首屏工厂体积与市场页首开的解析耗时。

#### 【PF-8 · P2】溢出守卫的布局读在提交路径——WAAPI 之后的下一个解锁点

- **现象**：`CardBody` 的溢出守卫 `useLayoutEffect` 每次提交读 `scrollHeight/clientHeight`（`CardBody.tsx:315-342`，按 `overflowKey` 元组短路），注释自认"这是侧栏手势中插件最大剩余自有成本（41.2ms 采样 CPU）"。折叠已改合成器驱动后，它升格为热路径上最大的自有成本。
- **修复方向**：把守卫读挪出提交路径——rAF 批量调度（一帧内所有卡的检查合并成一次读批次，红框晚一帧出现完全可接受，它是开发守卫不是用户 UI）；或按卡挂 ResizeObserver 只在尺寸真变时读。`CardBody` 本体**不必**加 `React.memo`（元素缓存已保证稳定期不重渲染，memo 是重复保险）。
- **验收**：手势期间长任务计数下降；播种一个溢出卡，守卫仍能在下一帧报红 + console.warn。

#### 【PF-9 · P3】`outCache`/`cardElCache` 超限全清

- `rail-view.tsx:957/1078` 的缓存放满 64 条即整表 `clear()`。rail 上限约 13 张卡时无感；若未来放宽 `maxWidgets` 或宽度键增多，会周期性全量重渲染。届时换简单 LRU（Map 淘汰最旧键）即可，现在不必动。

#### 【PF-10 · P3】`storage` 监听器模块级永不卸载

- `lib/heatmap-accounting.ts:246-255` 由 `seenWatchInstalled` 保证只装一次，但插件热重载时旧闭包残留 window。无用户可见后果，记录为已知良性项；若未来做 HMR 通道，记得补 teardown。

---

## 9. 亮点与不应动的部分（防止误优化）

修上面任何一条时，**不要顺手"优化"这些**——它们是有实测依据的设计：

| 亮点 | 位置 | 为什么不能动 |
|---|---|---|
| 三层渲染缓存（sameOut / cardElCache / retired 冻结） | `rail-view.tsx:56-72,1078-1104,1346-1352` | 每次 emit 卡体重建 62.4→6.0【实测】的来源 |
| WAAPI 折叠 + 反向续播 | `deck-cascade.ts:49-88,506-601` | onset -60%、4× 降速时长 -60%【实测】 |
| `prefers-reduced-motion` 全覆盖 | CSS 12 处 + JS 5 处 | 审计未发现遗漏，别在新动画上破例 |
| G1–G13 闸门 + G4/G5 字节基线 | `scripts/gates.mjs` | 一切重构的安全网 |
| 隐藏页签零轮询 + visibilitychange 补拉 | `source-poller.tsx:139-148` | 别为了"实时性"加隐藏轮询 |
| cc-daily 不轮询 | `cc/adapter.ts:84-94` | 冷调用 10.6s/21.2s【实测】，轮询=每分钟烧 CPU |
| deepseek 源不 rail 门控 | `deepseek/adapter.ts:6-13` | 采样账本漏采=漏记，刻意全天候 |
| quota 像素级测量 | `render/charts/quotas.tsx:43-123` | 修过 hover 缩放改变格子数的缺陷 |
| 溢出红框守卫 | `CardBody.tsx:266-342` | 只许挪走读的时机（PF-8），不许删 |
| 刻意规避的 registry↔sources 循环 | `sources.ts:18-33` | 症状是静默空注册表 |
| 零运行时依赖 + 平台模块 external | `package.json` / `tsdown.config.ts` | 别引 dayjs/lodash |
| `lib/` 入库（桌面端 `link:` 直读） | AUDIT §7.4 | 构建产物入库是刻意的 |

---

## 10. 长期维护策略

### 10.1 落库纪律（当下最重要的一条）

FOLD 改造先落库（A-1）。此后维持既有惯例：功能、探针脚本、前后数字文档、基线 JSON **同一个 commit**——FOLD 这次已经做对了范式（`probe-fold-stress.cjs` + `FOLD-2026-10-21.md` + 基线更新一起出现在工作区），把它变成制度。

### 10.2 回归网先行，再拆大文件

拆分顺序固定为：**回归网（`pnpm probe:fold` 一键化）→ ConfigTab → CardBody → rail-view → RailWave**（理由见 ST-4）。每次拆分独立提交，commit message 附探针数字。RailWave 拆前先把 68% 的决策记录注释迁到 docs——文件先"物理变小"，再按交互簇（悬浮放大/滚轮吸附/测量缓存）拆。

### 10.3 闸门演进：补上本轮死代码钻进来的三个盲区

本轮所有死项都属于闸门没覆盖的类别，各加一个静态检查即可封死（都按 gates.mjs 既有模式实现，各约 20–50 行）：

- **G14 设置存活性**：`Prefs` 每个 schema 字段必须 grep 到 ≥1 个读取方（本轮 `apiKey`/`panelWidth` 就死在这）；
- **G15 CSS 存活性**：`@keyframes` 名与 `.dsx-*` 类必须有引用（本轮 `dsx-drawer-in`）；
- **G16 路由存活性**：宿主注册的每条路由必须被 client 侧引用或在 README 声明为公开 API（本轮 `/api/opencode-usage`）。

### 10.4 仓库卫生节奏

`.probe-*`/`.tmp-*` 一次性清扫（ST-5）之后，把"探针生命周期"写进 workflow 文档并执行：一次性 `.tmp-*`、复跑 `scripts/diag-*`（gitignore）、进 CI `scripts/verify-*`。每轮大改动收尾时顺手清一次。

### 10.5 文档同步

CODE_MAP 计数漂移（T-1）修掉后，靠 G1 `--check` 的扩展（或 T-1 里的 5 行检查）保持数字不漂。审计报告延续 `AUDIT-`/`FOLD-`/`REVIEW-` 编号惯例——本文档即按此命名。

### 10.6 性能基线管理

`perf-baseline.json` + `docs/architecture/baseline/` 已成体系。建议把"触碰热路径的改动必须附探针前后数字"写成 workflow 硬规则（文化上已在执行，缺一页纸确认）。

### 10.7 宿主耦合监控

插件与宿主 DOM 的耦合点只有两处：设置瓦片的四级导航回退（S-3）与设置导航 glyph 的 MutationObserver 重标（`surfaces/settings-nav-glyph.ts`）。每次 DSH 升级跑一遍覆盖这两处的 verify 脚本（沿用 `verify-deck-cascade-live.cjs` 的模式），同时持续向上游推语义 API。宿主 peer 包大版本升级时，先跑 G7（发布类型校验）。

### 10.8 契约稳定

`contract/types.ts` 零 import 的纪律维持住；`registerExternalUnit` 一旦有外部消费者，`types.ts` 的破坏性变更就要走版本号（见 §11 长期项）。

---

## 11. 未来拓展方向（战略建议）

针对"新增更多组件类型 / 完善动画效果 / UI 更贴合 DeepSeek Harness"三个方向的评估与排序：

### 11.1 三方向评估

| 方向 | 现状 | 判断 |
|---|---|---|
| 新增组件类型 | 61 单元 / 6 数据源族；cc 族已有 9 个窗口变体 | **同族变体已饱和**——第 10 张 cc 窗口卡没有增量价值。组件数量的高价值轴是**新数据源族**（一个新族解锁一批卡），而这取决于宿主能暴露什么新数据，不取决于本仓库 |
| 完善动画 | FOLD 落库后：合成器驱动、reduced-motion 全覆盖、曲线可编辑 | **已到第一梯队，边际收益递减**。剩余只有 A-2/A-4 两个小修。再加码动画会推高 RailWave（已是最大文件）的维护成本 |
| UI 更贴合 DSH | 颜色全走 `--dsw-alias-*`、官方控件配方逐一复刻、设置页用官方骨架 | **视觉贴合已经做到 token 级**。剩下的"贴合"是**机械面**的：键盘可达性与宿主一致（U-1）、设置导航不再靠 DOM 文本匹配（S-3）、预览与实机同源（U-3）——行为一致比像素一致更值钱 |

### 11.2 推荐路线（一句话：先修税，再补机械一致性，动画只小修，新组件等新数据源）

- **短期（1–2 周）**：P0 + P1 清零——落库 FOLD、删两条死设置、resize 节流、`now` 门控、sys 按需拉取、multi 路由 memo+并行、meter 过渡修正。全部是小步改动，闸门全程护航。
- **中期（1–2 月）**：P2 结构轮——死代码清扫、helper 合一、ConfigTab 拆分、键盘导航、设置导航 i18n 化、bundle minify、G14–G16 三个新闸门。这一轮做完，代码库进入"债清零"状态。
- **长期（季度级）**，按杠杆排序：
  1. **外部单元生态**（最高杠杆）：`registerExternalUnit` 运行时已就绪，缺的是三件事——外部单元的发现/安装渠道（把 MarketTab 扩展成可列已安装的外部包）、`widgets-template/` 升级为可发布脚手架（一条命令生成可 `npm publish` 的外部单元包）、`contract/types.ts` 版本化承诺。这把"61 张内置卡"变成生态起点，替代无止境的数量竞赛；
  2. **数据源族跟宿主走**：宿主每暴露一个新数据面（新 API、新事件源），就是一个新族 + 一批新卡的窗口期；schedule 事件源这类已就绪但消费卡少的能力可以优先挖；
  3. **窄布局/移动场景**：1 列布局下 2×4 卡目前是"拉黑 + 市场标注不可用"，若窄场景使用变多，值得做降级重排（同一数据换 2×2 姿态）而不是隐藏。

### 11.3 不建议做的

- 不要为"更炫"加新的大动画系统（理由见 11.1）；
- 不要 mass-migrate 内联样式到 CSS Modules（U-2）；
- 不要给 cc-daily 加轮询、给 deepseek 源加 rail 门控（§9 表）；
- 在逐帧回归网就位前不要拆 rail-view / RailWave（ST-4）。

---

## 附：本报告的产出声明

- 由 **GLM 5.3**（BigModel）撰写，ZCode 会话执行；调研方法与核验范围见 §1。
- 全程**未改动 dsh-widgets 任何代码**；本文件是唯一写入物。
- 所有【实测】数字转引自仓库内探针文档（`FOLD-2026-10-21.md`、`AUDIT-2026-10-20.md`），本轮未重跑 GUI 探针；标【推断】的项落地前请先复测。
