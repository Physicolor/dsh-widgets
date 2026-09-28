# AGENT-BRIEF — dsh-widgets 高并发部件施工规范

> 你是 dsh-widgets 的**部件工程师**，一次只做一个部件。船主（车主）会亲自在浏览器里验收你的产物，并在验收后单独找你继续改进。
> 本文件是硬约束。**先读完本文件，再读** `src/widgets-template/README.md`、`src/client/lib/contract/types.ts`、`src/client/render/CardBody.tsx`。

## 0. 你的资源边界（并发契约，违反即失败）

**只允许创建/修改：`src/widgets/<你的部件 id>/` 下的文件**（`manifest.json`、`index.ts`、可选 `index.module.css`、可选 `README.md`）。

**绝对禁止**（这些是多人共享的单写者资源，你改一次就会毁掉整批工作）：
- 改 `src/client/generated.registry.ts`、跑 `node scripts/gen-registry.mjs`；
- 跑 `pnpm run build` / `tsdown` / `node scripts/snapshot-render.mjs --write` / `node scripts/extract-css.mjs --write` / `node website/gen-site.mjs`；
- 改任何共享文件：`src/client/lib/**`、`src/client/render/**`、`src/client/data/**`、`src/client/runtime/**`、`src/client/surfaces/**`、`src/client/index.ts`、`src/host/**`、`types.ts`、`CardBody.tsx`、`collector.tsx`；
- 改 `README.md` / `CHANGELOG*.md` / `website/**` / `docs/**`（除你自己的部件 README）；
- `git commit` / `git push` / 装依赖 / 改 `package.json`。

**你可以运行**（只读，可并发）：
- `node scripts/validate-widget-unit.mjs src/widgets/<id>`（**必须跑，必须 0 failure**）；
- `npx tsc --noEmit`（只读；跑 1–2 次即可，别在循环里跑）；
- `ls` / `grep` / `read` 任意文件（读不冲突）。

**集成分工**：注册表重建、构建、门禁基线、官网数据由**船长**在一波结束时统一收口。所以你的部件在你交付时**还不会出现在组件市场里**——这是预期行为，不是你的 bug。车主验收时的查看路径由船长统一公布。

## 1. 交付格式（写给车主看，不是写给船长）

结案消息必须是一段中文说明，包含：
1. **这个部件是什么**：一句话 + 卡面草图（ASCII 即可，标出标题/大数字/灰字/图表/明细行的位置与数据来源）；
2. **复用了哪些既有原语**（必须逐条列出：`headAfter` / `legend` / `headRing` / `breakdown` / `segments` / `figures` / `rings` / `bars` / `line` / `heatmap` / `lanes` / `corner` / `cycle` …），并说明**为什么不需要新原语**；确有必要新增时，**不要新增**——改为在结案里说明"需要船长先在共享层加 X"，然后交一个不依赖它的版本；
3. **端口与数据**：读的是 `WidgetStats` 的哪些字段（写字段名）；
4. **自测结果**：`validate-widget-unit` 的结论 + tsc 是否有新增错误；
5. **设计决策与取舍**：为什么是这个版式、有没有和既有卡重复的风险。

不要给船长发消息，不要索要验收（车主会自己看）。

## 2. 卡片设计语言（必须遵守，否则车主要返工）

- **尺寸**：`sizes: ["2x2"]`（除非任务明确要求 2×4）。2×2 = 150–160px 正方形；**内容必须装进这个正方形**（高度预算是硬约束，见下）。
- **头部阶梯（唯一写法）**：蓝色标题 13px → 大数字 20px → 灰字 10px。用契约字段表达：
  - 大数字在标题正下方一行：`headAfter: { big: '…' }`（**不要**用 `value`，`value` 是"正文数字"，会被推进正文）；
  - 灰字在数字下面：`legend: '…'`；
  - 明细/图例区贴底：`bodyAnchor: 'bottom'`；
  - 需要右上角环形时用 `headRing`（此时大数字**仍然**来自 `headAfter.big`，`value` 留空）；
  - 需要右上角动作按钮时用 `corner`（`pos: 'top'`）。
- **明细行**：`chart: { kind: 'breakdown', breakdown: [{ label, value, tone? }] }` —— 标签左、数值右、行数 **≤3**（150px 下第 4 行会溢出）。数值缺失时**不要返回 null 行**：打印 `—` 且 `tone: 'muted'`（车主的硬规则：挑了几行就永远有几行）。
- **占比/构成**：`kind: 'segments'` + `segmentsPalette: 'tones'`（默认 `'official'` 是"上下文水位"专用的官方三色，别乱用）。**时间类数值不要用环形图**（环是"占比"的语言，用在时长上会挤掉数字，车主已明确否决过一次）。
- **语气方向**：`tone` 的语义由**部件自己**决定并在注释里写明。约定：占比类"越高越好 → `success`"（如命中率）；忙碌/占用类"越高越坏 → `danger`"。**不要**让渲染器替你猜。
- **没有数据就不出现**：整体无意义的卡 `render` 返回 `null`（例如"尚未发生过的会话事件"）；但**只要卡片自带动作（按钮），就必须永远渲染**，空态用 `—`。
- **重复度**：先 `grep` 现有 40 个部件，确认你要展示的信息**不是**既有卡已经展示的（尤其：缓存命中 / 工具调用 / 会话 Token / 上下文压缩 / 上下文水位 / 会话概览 / 任务 / 对话轨迹 / 用量热度图 / 用量柱状图 / 额度管理）。如果高度重叠，**在结案里说明重叠点**，并给出差异化理由。

### 150px 高预算（实测，按此设计）
`pad 15` + 头部（标题 16 + 数字 4+25 + 灰字 2+12 = 59）+ 明细 3 行 51 + `pad 15` = **140 / 150**，只剩 10px 余量。
→ 所以：头部阶梯 + **最多 3 行明细**；要放图表就**不能**再放 3 行明细（二选一）。

## 3. 技术规范

- **manifest.json**：`{ id, order, group, builtin, sizes, defaultInstalled: false, locale: { zh, en } }`。`id` 必须 === 目录名 === `index.ts` 里第一个 `id:` 字面量（校验器强制）。`order` 用 70 以上（新部件排后，避免与既有排序冲突）。`group` 用 `system`（除非任务另有说明）。
  - **不要写 `source` 字段**：那是"有异步数据源（host 路由）"的卡才声明的；你的卡如果读的是已有 stats 字段，属于同步投影。若你的卡依赖某个异步源（如 `sysinfo`），才写 `"source": "sys"` 并配 `"skeleton": { "shape": … }`。
- **i18n**：所有用户可见文案走 `t('widget.<id>.*')` / `t('card.<id>.*')`，并且**同时**给出 `locale.zh` 与 `locale.en`（校验器会检查覆盖率）。不要硬编码中文/英文。
- **纯数据 render**：`render(stats, meta)` 必须是纯函数（无副作用、不读 DOM、不发请求）。允许读时钟（`Date.now()`）但要在注释里说明。
- **实例配置**：需要用户选项时用 `configSchema`（类型见 `ConfigField`：`text` / `textarea` / `toggle` / `align` / `valign` / `mode` / `metrics`）。**一旦你加了配置项，结案说明里必须逐项列出**（车主会亲自测每一项）——包括 `default`、可选值、以及上限（`max`）。
- **示例数据**：为了让车主能在**组件市场预览**里验收（他不会把卡装到自己在用的轨道上），必须提供 `example: { stats: { … } }`，让卡片在没有实时会话时也能渲染出完整形态。实时数据存在时会自动覆盖示例（预览合并规则：假填充 → 部件示例 → 实时非空切片 → 实例配置）。
- **状态**（`stats` 里可读的字段，全部已存在，直接读即可）：`turns steps llmMs toolMs ttftMs ttftSteps decodeMs decodeTokens usage{inputTokens,cacheReadTokens,outputTokens} contextPercent contextWindow contextTokens contextBreakdown{systemTokens,toolsTokens,messageTokens} todos[] trajectory[] tools{calls,tools,failures,slowest,running} compactions{count,reclaimed,items,recent[]} heatmapRaw heatmapGrid usageData usageMulti commandCode commandCodeError commandCodeDaily sysinfo github githubError armedAction poolModes`。用例见 `src/widgets/tool`、`src/widgets/cache`、`src/widgets/tokens`、`src/widgets/context`（这四张是本轮刚定的新版式，**抄它们的写法**）。
- **纯函数放在你自己目录里**：派生的计算（fold、格式化）写在你自己的 `index.ts`（或同目录文件），不要加到共享 `lib/`。

## 4. 交付前的自检清单

1. `node scripts/validate-widget-unit.mjs src/widgets/<id>` → **0 failure**（warning 可以，但要在结案里说明为什么可接受）；
2. `npx tsc --noEmit` → **不新增错误**（当前基线 0 错）；
3. 高度预算心算过一遍（见上），确认 ≤150px；
4. `grep` 确认没有重复既有卡的信息，或已说明差异；
5. 结案消息按 §1 的五段写全（中文）。
