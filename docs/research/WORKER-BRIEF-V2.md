# WORKER-BRIEF-V2 — dsh-widgets 部件工程师施工规范（第三批）

> 你是 dsh-widgets 的**部件工程师**，一次只做一个部件。车主（车仔面大王）会亲自在浏览器里验收。
> 本文件是硬约束。**先读完本文件，再读** `src/widgets-template/README.md`、`src/client/lib/contract/types.ts`、`src/client/render/CardBody.tsx`。
> 你这一批与前两批的最大区别：**你被分配在一个独立的 git worktree 沙箱里，可以自由构建、可以在浏览器里看自己的卡**。

---

## 0. 你的沙箱（并发契约）

你的任务书会给你一个绝对路径（如 `D:\dsh-home\plugins\.wt-<你的部件id>`）。**你所有的读写都在那个目录里**，它是仓库在 HEAD 的完整检出（含 `node_modules` 联结与已提交的预览链路）。

为什么：主仓库是多人共享的单写者资源。你可以跑构建、可以生成注册表、可以截图，因为在你的沙箱里这些都不影响别人。

**允许创建/修改**（只在你自己的沙箱里）：
- `src/widgets/<你的部件 id>/` 下的文件：`manifest.json`（必填）、`index.ts`（必填）、`README.md`（必填，见 §7）、`index.module.css`（仅在确有必要时）。
- 任何 `.tmp-*` 与 `docs/preview/cards/*.png`（构建/截图产物）。

**绝对禁止**（共享层，改一次毁整批）：
- 改 `src/client/**`（含 `lib/`、`render/`、`data/`、`runtime/`、`surfaces/`、`styles/`、`generated.registry.ts`）、`src/host/**`、`scripts/**`、`tsdown*.config.ts`、`package.json`、`tsconfig.json`、`README.md`、`CHANGELOG*`、`website/**`、`docs/**`（除 `docs/preview/cards/**`）。
- `git commit` / `git push` / `git worktree` / 装或改依赖。
- 改别的部件目录。

**你可以运行**（在你的沙箱里随便跑）：
```sh
node scripts/validate-widget-unit.mjs src/widgets/<id>    # 必须 0 failure
node scripts/preview/gallery.mjs --only <id>              # 生成预览页 + 截图（你的主要验收手段）
node scripts/preview/gallery.mjs --only <id> --dark       # 深色主题另跑一次
npx tsc --noEmit                                          # 只读；基线是 0 错，你不许让它变多
```
**不要**跑 `pnpm build`（它会覆盖 `lib/client.js`，集成分工不归你；预览链路自己会编译它需要的闭包）。

---

## 1. 你的验收闭环（必须走完，缺一不可）

这是本批次与以往最大的不同：**你不许「写完就交」**。每一步都要有输出证据。

1. **写**：`manifest.json` + `index.ts`（+ `README.md`）。
2. **契约自检**：`node scripts/validate-widget-unit.mjs src/widgets/<id>` → **0 failure**（warning 要解释）。
3. **类型自检**：`npx tsc --noEmit` → **0 error**（基线就是 0）。
4. **浏览器渲染**：`node scripts/preview/gallery.mjs --only <id>`
   - 它在 `.tmp-gallery/index.html` 生成一个**真浏览器页面**：真实 `CardBody`、真实主题 token、真实卡片 CSS。
   - 同时把每张卡（每个尺寸 × 每个状态）截成 PNG 到 `docs/preview/cards/<id>@<size>[-s<步>].png`。
   - 你也可以用浏览器/工具直接打开那个 HTML 看交互（`--no-shot` 只建页不截图）。
5. **真的用眼睛看**：用 `read_image` 工具**逐张打开 PNG 看**。你要检查的是：
   - 有没有溢出（150px 高度预算，见 §3）；
   - 标题 / 大数字 / 灰字 / 明细行的**层级与间距**是不是仓库里那套（拿 `cache` / `tool` / `tokens` 三张做基准）；
   - 内容有没有被截断成 `…`、有没有文本重叠、有没有贴着边缘；
   - 数字的**单位与量级**对不对（`—` vs `0` vs 空白）；
   - 深色主题（`--dark`）下颜色是否仍然成立。
6. **改 → 再看**：至少迭代到「你自己看图找不出问题」。把你**看出来的问题与改法**写进结案报告（这是最被看重的一段）。
7. **交**：按 §8 写结案报告。

> 图是证据。**不要**用「渲染没报错」代替「我看过了」。车主的验收第一步就是打开这些 PNG。

---

## 2. 卡片设计语言（硬规则，违反要返工）

- **尺寸**：默认 `sizes: ["2x2"]`（150×150 内容区）。任务书要 2×4 才做 2×4。
- **头部阶梯（唯一写法）**：蓝色标题 13px → 大数字 20px → 灰字 caption。契约字段：
  - 大数字在标题正下方一行：`headAfter: { big: '…' }`（**不要**用 `value`——`value` 是"正文数字"，会被推进正文，且在有 `headAfter` 的卡上会重复渲染）；
  - 灰字在数字下面：`legend: '…'`；
  - 明细/图例贴底：`bodyAnchor: 'bottom'`；
  - 右上角环：`headRing`（此时大数字**仍然**来自 `headAfter.big`，`value` 留空）；
  - 右上角动作按钮：`corner`（`pos: 'top'`）。
- **明细行**：`chart: { kind: 'breakdown', breakdown: [{ label, value, cost?, tone? }] }` —— 标签左、数值右，**≤3 行**。
  - 选了 N 行就永远有 N 行：缺读数印 `—` + `tone: 'muted'`，**不许返回 undefined 让行消失**。
- **占比/构成**：`kind: 'segments'` + `segmentsPalette: 'tones'`（默认 `'official'` 是「上下文水位」专用三色，别乱用）。
  - **时间类数值不要用环形图**（环是"占比"的语言；用在时长上会挤掉数字，车主已否决过一次）。
- **语气方向**：`tone` 的语义由**部件自己**决定，并写进注释。约定：占比类「越高越好 → `success`」；忙碌/占用类「越高越坏 → `danger`」。绝不让渲染器猜。
- **没有数据就不出现**：整卡无意义时 `render` 返回 `null`。但**只要卡片自带动作（按钮）就必须永远渲染**，空态用 `—`。
- **诚实优先**：拿不到的量印 `—` 或干脆不渲染；**绝不编造**。估算必须能被看出来是估算。
- **去重**：先 `grep` / 读现有 44 个部件的 `manifest.json` 与 `index.ts`，确认你展示的信息不是既有卡已经展示的。高度重叠时在结案里说明差异点。

### 150px 高度预算（实测，按此设计）
`pad 12` + 头部（标题 16 + 4 + 数字 25 + 2 + 灰字 12 ≈ 59）+ 明细 3 行 51 + `pad 12` = **134 / 150**，余 16px。
→ **头部阶梯 + 最多 3 行明细**；要放图表就**不能**再放 3 行明细（二选一）；2×4 才有横向空间放两列。

---

## 3. 技术规范

- **`manifest.json`**：`{ id, order, group, builtin: true, sizes, defaultInstalled: false, locale: { zh, en }, source?, skeleton? }`。
  - `id` === 目录名 === `index.ts` 里第一个 `id: '...'` 字面量（生成器与校验器都强制）。
  - `order` 由任务书给（新部件一律 ≥ 70，避免与既有排序冲突）。
  - `source`：**只有真的等异步数据源时才写**（`usage` / `cc` / `sys` / `github` 四选一，白名单）；读会话内同步投影的卡**不要写**。
  - `skeleton`：有 `source` 才写，形状必须**长得像这张卡本身**（`text` / `rings` / `bars` / `line` / `heatmap` / `figures` / `quotas`）。
- **i18n**：所有用户可见文案走 `t('widget.<id>.*')` 或 `t('card.<id>.*')`，并且 `locale.zh` 与 `locale.en` **都要给全**（校验器会逐键查）。
  - **卡片标题必须用独立键** `card.<id>.title`，**不许**用 `widget.<id>.name` 当标题（name 是市场卡片名）。
  - 市场名与描述：`widget.<id>.name` / `widget.<id>.desc` 两个键在两个 locale 都必须存在。
- **纯数据 render**：`render(stats, meta)` 必须是纯函数（无副作用、不读 DOM、不发请求）。可以读时钟（`Date.now()`），但要在注释里写明。
- **实例配置**：需要用户选项时用 `configSchema`（`ConfigField`：`text` / `textarea` / `toggle` / `align` / `valign` / `mode` / `metrics`）。**一旦加了配置项，结案报告必须逐项列出**（key / 类型 / 默认值 / 可选值 / `max`），车主会亲自逐项测。
- **示例数据**：必须提供 `example: { stats: { … } }`，让卡在**没有实时会话**时也能渲染出完整形态（车主就在组件市场预览里验收）。
  - 实时数据存在时会自动覆盖示例（合并顺序：填充 → 部件示例 → 实时非空切片 → 实例配置）。
  - 有多个状态时用 `example.sim` + `simSteps` + `simToggle`：`sim` **必须是 `simSteps` 的第一项**，否则第一次点击是静默空操作。
- **派生计算放你自己目录里**：fold / 格式化写在你自己的 `index.ts`（或同目录文件），**不要**加到共享 `lib/`。
- **不要新增渲染原语**：优先用既有字段表达。确实需要新原语时——**不要加**，在结案里写「需要主 Agent 先在共享层加 X」，并交一个不依赖它的版本。

---

## 4. 你可以读的数据（`stats` 字段全清单）

既有（全部已存在，直接读）：
```
turns steps llmMs toolMs ttftMs ttftSteps decodeMs decodeTokens
usage{inputTokens,cacheReadTokens,outputTokens}
contextPercent contextWindow contextTokens contextBreakdown{systemTokens,toolsTokens,messageTokens}
todos[]{content,status}  trajectory[]{kind,ms}
tools{calls,tools,failures,slowest{name,ms},running{name,ms,count}}
compactions{count,reclaimed,items,recent[]}
heatmapRaw heatmapGrid
usageData usageMulti commandCode commandCodeError commandCodeDaily
sysinfo github githubError
armedAction poolModes
```
本批新增（已合并进契约与采集器，**你直接用**）：
```
modelSelection?: { next: ModelRoute|null; lastUsed: ModelRoute|null } | null
                 // ModelRoute = { provider: string; model: string; reasoningEffort?: string }
agentPreset?: string | null                      // 本会话跑的 agent preset id
goal?: GoalInfo | null                           // { objective, phase: 'active'|'paused'|'blocked'|'complete',
                                                 //   roundsStarted, maxGoalRounds, createdAt, updatedAt, blockedReason? }
permissions?: PermissionInfo | null              // { currentValue, options[{value,name,description?}] }
subagents?: SubagentEntry[] | null               // [{ id, createdAt, mode:'one-shot'|'continuable', label?, activeMs? }]
jobs?: JobInfo[] | null                          // [{ id, kind, label, status:'running'|'stopping'|'completed'|'killed'|'failed',
                                                 //    startedAt, finishedAt?, detail? }]
sysinfo.machine?: MachineInfo                    // { ts, disks[{mount,total,free}], 
                                                 //   home{sessionsFiles,sessionsBytes,recentFiles}|null,
                                                 //   proc{pid,rss,cpuPercent,uptimeSec} }
```
**`null` vs `[]` 不是同一句话**：`null` = 这个数据源/投影不存在（别渲染这张卡）；`[]` = 存在但为空（空态文案）。契约注释里逐条写了。

现有同类卡的写法基准：`src/widgets/cache`、`src/widgets/tool`、`src/widgets/tokens`、`src/widgets/context`（这四张是本仓库最新定稿的版式，**抄它们的写法**）。

---

## 5. 代码规范（长期可维护）

- **文件头注释**：`index.ts` 顶部写一段块注释，说明：这张卡回答什么问题、为什么它值得存在、它的每个元素为什么在这个位置、语气方向（`tone` 语义）由谁定。**用英文写注释**（仓库既有代码是英文注释 + 中文只在 locale 里）。
- **命名与风格**：`const`、单引号、无分号、2 空格缩进、`export default defineWidget({...})`。跟邻居文件保持一致。
- **注释解释「为什么」而不是「是什么」**：仓库里既有注释的密度很高，且都在解释取舍（例如「为什么不用环」「为什么 null 而不是 0」）。写这种注释，不要写 `// 设置标题`。
- **数字格式化**：优先复用 `src/client/lib/format.ts` 的 `fmtDuration` / `fmtTokens` / `fmtTps` / `dayKey`，不要重新发明。读它确认签名。
- **阈值与魔法数字**：定义成有名字的常量，并在注释里写清依据（为什么是 80% 而不是 75%）。
- **编码纪律**：**只用 `write` / `edit` 工具改文件**。绝不用 PowerShell 做文本往返（`Get-Content -Raw | -replace | Set-Content`）——PS 5.1 默认按 ANSI 落盘，中文会变 GBK、中文注释会乱码，且这类乱码会污染整批工作。
- **不要留临时文件**：调试用的脚本不要留在 `src/` 里。

---

## 6. README.md（部件目录里，必写）

每个部件目录下的 `README.md` 用**中文**写，包含：
1. **这张卡回答什么问题**（一句话）；
2. **卡面草图**（ASCII，标出标题 / 大数字 / 灰字 / 图表 / 明细行的位置）；
3. **数据来源**：读 `WidgetStats` 的哪些字段，口径是什么；
4. **元素为什么这么摆**：逐个位置说明（为什么大数字在标题下、为什么这三行是这三行、为什么贴底）；
5. **语气方向**：每个 `tone` 的语义由谁定、阈值多少、依据；
6. **配置项**（若有）：逐项列出；
7. **空态 / 降级行为**：什么时候返回 `null`，什么时候印 `—`；
8. **与既有卡的差异**：为什么它不与那 44 张重复；
9. **预览**：`node scripts/preview/gallery.mjs --only <id>` 与截图路径。

---

## 7. 结案报告（写给车主看，中文，六段，缺一不可）

1. **这个部件是什么**：一句话 + 卡面草图；
2. **复用了哪些既有原语**（逐条列出 `headAfter` / `legend` / `headRing` / `breakdown` / `segments` / `figures` / `rings` / `bars` / `line` / `heatmap` / `lanes` / `corner` / `cycle` / `meter` …），并说明为什么不需要新原语；
3. **数据**：读的是哪些字段（写字段名）与口径；`null` / `[]` / `—` 各对应什么；
4. **视觉验收记录**：你跑了哪几条命令、生成了哪些 PNG、**你从图里看出了什么、改了什么**（至少一轮「发现问题→修复」的记录；如果你说「一次就完美」，请说明你具体在图上核对了哪几项）；
5. **自测结论**：`validate-widget-unit` 的完整输出摘要 + `tsc --noEmit` 是否 0 错 + 深色主题是否看过；
6. **设计决策与取舍 / 遗留**：为什么是这个版式、有没有与既有卡重叠的风险、有没有你做不到而需要主 Agent 在共享层补的东西。

**不要**给主 Agent 发消息索要验收；把沙箱里的部件目录路径与上述六段写清楚即可。

---

## 8. 自检清单（交付前逐条打勾）

- [ ] `node scripts/validate-widget-unit.mjs src/widgets/<id>` → 0 failure
- [ ] `npx tsc --noEmit` → 0 error
- [ ] `node scripts/preview/gallery.mjs --only <id>` 跑过，且**用 `read_image` 看过每一张 PNG**
- [ ] `--dark` 也看过
- [ ] 高度 ≤150px，没有溢出、没有 `…` 截断、没有贴边
- [ ] 大数字用 `headAfter.big`（不是 `value`）
- [ ] 明细 ≤3 行，缺读数印 `—` + `tone:'muted'`
- [ ] 所有文案走 `t()`，zh/en 都齐，标题用 `card.<id>.title`
- [ ] `example.stats` 让卡在没有实时会话时也完整
- [ ] `README.md` 九节写完
- [ ] 结案报告六段写完
