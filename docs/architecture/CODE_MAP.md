# CODE_MAP — dsh-widgets：每个东西在哪里实现

这份文件回答一个问题：**我要改 X，去哪个文件？**
它不是审计（那是 `CURRENT_ARCHITECTURE.md`），也不是计划（`REFACTOR_PLAN.md`）或报告
（`ARCHITECTURE_REFACTOR_REPORT.md`）—— 它是一张地图。

行号一律不写：文件改了行号就失效，而**目录名/文件名就是稳定地址**。仓库里的树由
`node scripts/print-tree.mjs --inject docs/architecture/CODE_MAP.md` 从 `git ls-files` 重新生成，
所以下面的结构永远等于仓库真实内容。

---

## 1. 目录全貌

`git ls-files` 共 345 个文件。40 个组件单元在这里折叠成一行（每个单元的固定形状见 §3）。

<!-- TREE_START -->
```text
.
|-- .github/
|   `-- workflows/
|       |-- pages.yml    # deploys website/ to GitHub Pages
|       `-- publish.yml    # npm Trusted Publishing (OIDC) on a v* tag
|-- docs/
|   |-- architecture/    # the audit, the plan, the report, and the recorded baselines
|   |   |-- baseline/    # the recorded gate baselines
|   |   |   |-- css.json
|   |   |   |-- host-routes.json
|   |   |   |-- render-snapshot.json
|   |   |   `-- tsc.json
|   |   |-- ARCHITECTURE_REFACTOR_REPORT.md    # the report (round 1 = s1-15, round 2 = s16)
|   |   |-- CURRENT_ARCHITECTURE.md    # Phase 0 audit (pre-refactor snapshot)
|   |   `-- REFACTOR_PLAN.md    # the plan, with execution status inline
|   |-- icon/
|   |   |-- avatar-512.png
|   |   |-- avatar.svg
|   |   |-- icon-512.png
|   |   |-- icon.svg
|   |   `-- social-preview.png
|   |-- lib/
|   |   `-- widgets-state.cjs
|   |-- screenshots/
|   |   |-- add-panel.png
|   |   |-- cover.png
|   |   |-- dock-magnify.png
|   |   |-- grid-hover-2col.png
|   |   |-- grid-rest-2col.png
|   |   |-- rail-drawer-open-mid.png
|   |   |-- rail-widgets.png
|   |   |-- README.md
|   |   |-- widget-cards-preview.html
|   |   `-- widget-cards.png
|   |-- verify-nav-glyph/
|   |   `-- nav-glyph.png
|   |-- verify-quota-reask/
|   |   |-- rail-quota-degraded.png
|   |   `-- rail-quota-healed.png
|   |-- verify-report3/    # the 2026-09-17 rail/nav incident record + its probes
|   |   |-- scripts/
|   |   |   |-- verify-nav-click.cjs
|   |   |   |-- verify-report3-fixes.cjs
|   |   |   |-- verify-wave-behaviour.cjs
|   |   |   `-- verify-wave.cjs
|   |   |-- after-newconv.json
|   |   |-- FIX-2026-09-17.md
|   |   |-- fix-verification.json
|   |   |-- geometry-1920x1080.json
|   |   |-- layer-addpanel.png
|   |   |-- layer-base.png
|   |   |-- layer-overlay.png
|   |   |-- nav-geometry.json
|   |   |-- nav-matrix.json
|   |   |-- newconv-flake.json
|   |   |-- panel-hover.png
|   |   |-- panel-parked.png
|   |   |-- rail-1600-nav-visible.png
|   |   |-- stacking.txt
|   |   `-- stuck-chain.json
|   |-- verify-skeleton-shapes/
|   |   |-- card-usage-bars.png
|   |   |-- rail-cc-degraded.png
|   |   |-- rail-skeleton.png
|   |   `-- user-state-snapshot.json
|   |-- verify-wave/
|   |   |-- 1-rest.png
|   |   |-- 2-wave-engaged.png
|   |   |-- 3-wave-sidebar-open.png
|   |   `-- 4-addpanel.png
|   |-- workflow/
|   |   |-- records/
|   |   |   |-- 2026-08-30-context-water-wf-validation.json
|   |   |   |-- 2026-08-30-heart-rate-iteration-test.json
|   |   |   `-- README.md
|   |   |-- 01-requirement-form.md
|   |   |-- 02-technical-analysis.md
|   |   |-- 03-specification.md
|   |   |-- 04-worker-instructions.md
|   |   |-- 05-review-checklist.md
|   |   |-- 06-acceptance.md
|   |   |-- 07-stop-escalation.md
|   |   |-- 08-production-record.md
|   |   |-- 09-future-input-adapters.md
|   |   |-- README.md
|   |   `-- record.schema.json
|   |-- _state-cleanup.cjs
|   |-- compare-token-accounts.mjs
|   |-- diag-gpu-clip-market.png
|   |-- diag-gpu-clip-rail.png
|   |-- diag-transition.cjs
|   |-- gpu-height-evidence.txt
|   |-- heatmap-recovery.js
|   |-- interact-widgets.cjs
|   |-- market-test.cjs
|   |-- preview.png
|   |-- probe-addpanel-occlusion.cjs
|   |-- probe-card-head.cjs
|   |-- probe-cc-cards-preview.cjs
|   |-- probe-cc-plan-preview.cjs
|   |-- probe-cc-pool.mjs
|   |-- probe-cc-render.cjs
|   |-- probe-github.mjs
|   |-- probe-gpu-height.cjs
|   |-- probe-gpu-line-stability.cjs
|   |-- probe-gpu-line-values.cjs
|   |-- probe-gpu-settings.cjs
|   |-- probe-localstorage.mjs
|   |-- probe-quota-manage.mjs
|   |-- probe-statsline.cjs
|   |-- probe-sysinfo-live.cjs
|   |-- probe-token-total.mjs
|   |-- probe-trajectory.cjs
|   |-- probe-usage-daily-live.mjs
|   |-- probe-widget-heatmap-daily.json
|   |-- smoke-widgets.cjs
|   |-- state-fidelity.cjs
|   |-- verify-1col-2x4.cjs
|   |-- verify-addpanel-height.cjs
|   |-- verify-capsule.cjs
|   |-- verify-cc-degraded.cjs
|   |-- verify-cc-scope.mjs
|   |-- verify-commandcode.cjs
|   |-- verify-corner-shape.cjs
|   |-- verify-discovery.cjs
|   |-- verify-i18n.mjs
|   |-- verify-nav-glyph.cjs    # live: the settings nav icon shim
|   |-- verify-peak-pricing.cjs
|   |-- verify-quota-manage-layout.cjs
|   |-- verify-quota-manage-render.cjs
|   |-- verify-quota-reask.cjs
|   |-- verify-rail-drawer.cjs
|   |-- verify-rail-morph.cjs
|   |-- verify-sim-arrow.cjs
|   |-- verify-skeleton-shapes.cjs    # live: skeleton silhouettes, 19 cards
|   |-- verify-switch.cjs
|   |-- verify-sysinfo.mjs    # offline host sysinfo contract (also runs in CI)
|   |-- verify-token-total-independent.json
|   |-- verify-token-total-independent.mjs
|   |-- verify-ui.cjs
|   |-- verify-ui2.cjs
|   |-- verify-usage-daily-route.mjs
|   |-- verify-usage-freshness.mjs
|   `-- verify-usage-guard.mjs
|-- lib/    # BUILT artifacts (the plugin loader reads these straight from this checkout)
|   |-- client.js
|   |-- client.js.map
|   `-- index.js
|-- scripts/    # offline gates, build helpers, local probes
|   |-- lib/
|   |   `-- chrome.cjs    # resolves the newest installed playwright chromium
|   |-- snapshot/
|   |   |-- render-harness.ts    # G4 harness: calls every render offline
|   |   `-- run.cjs
|   |-- audit-move-only.mjs    # G6: added vs removed lines for a pure-move commit
|   |-- build-types.mjs    # emits lib/types + the css-modules shim the entries reference
|   |-- crop-lanes-shot.cjs
|   |-- extract-css.mjs    # G5: compiled-CSS concatenation vs the baseline
|   |-- gen-registry.mjs    # G1: scans src/widgets/ and emits generated.registry.ts
|   |-- snapshot-host-routes.mjs    # G7: 14 host route cases with stubs, no live server
|   |-- snapshot-render.mjs    # G4: 110 render outputs vs the recorded baseline
|   |-- tsconfig.snapshot.json
|   |-- validate-widget-unit.mjs    # G2: per-unit contract + locale completeness
|   |-- verify-published-types.mjs    # G8: a throwaway consumer resolves both entry types
|   |-- verify-rail-interaction.cjs
|   |-- verify-rail-scroll.cjs
|   |-- verify-rail-wheel-matrix.cjs
|   |-- verify-release-smoke.cjs
|   |-- verify-sidebar-anim.cjs
|   `-- verify-tsc-baseline.mjs    # G3: typecheck (baseline is empty = zero errors required)
|-- src/
|   |-- client/    # browser half
|   |   |-- data/    # turning external input into the bridge
|   |   |   |-- collector.tsx    # the dock component that polls/routes every source
|   |   |   `-- session-stats.ts    # the live conversation projection -> Stats
|   |   |-- families/    # per-source payload parsing + card renderers
|   |   |   |-- cc/
|   |   |   |   |-- data.ts
|   |   |   |   `-- renders.ts
|   |   |   |-- github/
|   |   |   |   |-- data.ts
|   |   |   |   `-- renders.ts
|   |   |   |-- sys/
|   |   |   |   |-- data.ts
|   |   |   |   `-- renders.ts
|   |   |   `-- usage/
|   |   |       |-- data.ts
|   |   |       `-- renders.ts
|   |   |-- lib/    # framework-agnostic helpers
|   |   |   |-- contract/    # the widget contract
|   |   |   |   |-- helpers.ts    # defineWidget, label resolvers, instance keys, sizesOf
|   |   |   |   `-- types.ts    # every shape a unit/renderer/shell exchanges (zero imports)
|   |   |   |-- format.ts    # number / duration / percent formatting
|   |   |   |-- heatmap-accounting.ts    # the fallback daily-token log (no usage-center)
|   |   |   |-- morph-spring.ts    # the spring curve the wave animates with
|   |   |   `-- quota-math.ts    # credit -> token-rate maths
|   |   |-- rail/    # the right-hand rail
|   |   |   |-- wave/
|   |   |   |   |-- RailWave.tsx    # the magnification wave component (rAF loops, hit tests)
|   |   |   |   `-- wave-geometry.ts    # wave layout: rows, scales, nearest slot, reflow
|   |   |   |-- geometry.ts    # rail space/budget maths (pure reads + solving)
|   |   |   |-- measure.ts    # observers, anchor probes, width tracking, yield beat
|   |   |   `-- rail-view.tsx    # the rail slot body: deck grid, wave, add panel, drawer
|   |   |-- render/    # how a card becomes pixels
|   |   |   |-- charts/    # one file per chart kind + the registry
|   |   |   |   |-- bars.tsx
|   |   |   |   |-- barsV.tsx
|   |   |   |   |-- figures.tsx
|   |   |   |   |-- heatmap.tsx
|   |   |   |   |-- lanes.tsx
|   |   |   |   |-- line.tsx
|   |   |   |   |-- quotas.tsx
|   |   |   |   |-- registry.ts    # kind -> renderer: add a chart = add a file + one line
|   |   |   |   |-- ring.tsx
|   |   |   |   |-- rings.tsx
|   |   |   |   |-- segments.tsx
|   |   |   |   |-- theme.ts
|   |   |   |   `-- types.ts
|   |   |   |-- preview/    # the settings previews reuse these (no live data)
|   |   |   |   |-- example-out.ts
|   |   |   |   |-- preview-stats.ts
|   |   |   |   `-- sim.ts
|   |   |   |-- card-geometry.ts    # corner radius / inner padding maths
|   |   |   |-- CardBody.tsx    # the card shell: title, body, chart dispatch, skeleton
|   |   |   `-- icons.tsx    # the svg glyphs the surfaces use
|   |   |-- runtime/    # framework plumbing that is not React
|   |   |   |-- bridge.ts    # the snapshot type every surface reads
|   |   |   |-- controller.ts    # the controller interface the settings pages take
|   |   |   |-- host-sync.ts    # the /api/widgets-state client (debounced PUT)
|   |   |   `-- prefs.ts    # prefs shape + normalize + localStorage load/save
|   |   |-- styles/    # tokens + five layers; the import order in client/index.ts is the cascade
|   |   |   |-- card.module.css
|   |   |   |-- market.module.css
|   |   |   |-- panel.module.css
|   |   |   |-- primitives.module.css
|   |   |   |-- rail.module.css
|   |   |   `-- tokens.module.css    # the :root vocabulary the other sheets read
|   |   |-- surfaces/    # settings + market pages
|   |   |   |-- config/
|   |   |   |   `-- ConfigTab.tsx    # component config: order list + fields + preview
|   |   |   |-- market/
|   |   |   |   `-- MarketTab.tsx    # component market: gallery, stage, ghost, install
|   |   |   |-- layout.ts    # the three layout constants the pages share
|   |   |   |-- settings-nav-glyph.ts    # the settings nav icon shim (official hardcodes)
|   |   |   `-- Settings.tsx    # the tabbed components page (list + detail)
|   |   |-- generated.registry.ts    # GENERATED by scripts/gen-registry.mjs — never hand-edit
|   |   |-- i18n.ts    # shell dictionary + locale-service adapter
|   |   |-- index.ts    # client entry: bridge + slot wiring + header/settings surfaces
|   |   `-- slots-service.d.ts    # types the runtime `slots` service (upstream does not)
|   |-- host/    # host half: one module per upstream channel
|   |   |-- commandcode.ts    # /api/commandcode-usage: 4 endpoints x pool keys + memo
|   |   |-- context.ts    # the ctx contract (webServer / credentials / get / effect)
|   |   |-- exec.ts    # the one promisified execFile two channels share
|   |   |-- github.ts    # /api/github: credential ladder + five slice caches
|   |   |-- http.ts    # memoTtl, readJsonBody, route-cache policy
|   |   |-- opencode.ts    # /api/opencode-usage + /api/opencode-usage-multi
|   |   |-- routes.ts    # the route registry: add a channel = add a module + one line
|   |   |-- state-file.ts    # /api/widgets-state: atomic tmp+rename write
|   |   |-- sysinfo.ts    # /api/sysinfo: CPU delta / memory / nvidia-smi + ring buffer
|   |   `-- usage-daily.ts    # /api/widgets-usage-daily: the usage-center adapter
|   |-- widgets/    # the 40 widget UNITS — one folder per widget
|   |   |-- _shared/    # dictionary keys several units share
|   |   |   `-- locales.json
|   |   |-- cache/    # index.ts + manifest.json
|   |   |-- cc-credits/    # index.ts + manifest.json
|   |   |-- cc-subscription/    # index.ts + manifest.json
|   |   |-- cc-usage/    # index.ts + manifest.json
|   |   |-- cc-whoami/    # index.ts + manifest.json
|   |   |-- cc-window-5h/    # index.ts + manifest.json
|   |   |-- cc-window-monthly/    # index.ts + manifest.json
|   |   |-- cc-window-weekly/    # index.ts + manifest.json
|   |   |-- cc-windows/    # index.ts + manifest.json
|   |   |-- context/    # index.ts + manifest.json
|   |   |-- context-water/    # index.ts + manifest.json
|   |   |-- counts/    # index.ts + manifest.json
|   |   |-- github-board/    # index.ts + manifest.json
|   |   |-- github-contrib/    # index.ts + manifest.json
|   |   |-- github-issues/    # index.ts + manifest.json
|   |   |-- github-push/    # index.ts + manifest.json
|   |   |-- github-stars/    # index.ts + manifest.json
|   |   |-- harness-board/    # index.ts + manifest.json
|   |   |-- heatmap/    # index.ts + manifest.json
|   |   |-- heatmap-bars/    # index.ts + manifest.json
|   |   |-- llm/    # index.ts + manifest.json
|   |   |-- peak-pricing/    # holidays.ts + index.ts + manifest.json
|   |   |-- quota-manage/    # index.ts + manifest.json
|   |   |-- quote/    # index.ts + manifest.json
|   |   |-- sys-board/    # index.ts + manifest.json
|   |   |-- sys-cpu/    # index.ts + manifest.json
|   |   |-- sys-gpu/    # index.ts + manifest.json
|   |   |-- sys-gpu-line/    # index.ts + manifest.json
|   |   |-- sys-rings/    # index.ts + manifest.json
|   |   |-- task/    # index.ts + manifest.json
|   |   |-- tokens/    # index.ts + manifest.json
|   |   |-- tool/    # index.ts + manifest.json
|   |   |-- tps/    # index.ts + manifest.json
|   |   |-- trajectory/    # index.ts + manifest.json
|   |   |-- ttft/    # index.ts + manifest.json
|   |   |-- usage-bars/    # index.ts + manifest.json
|   |   |-- usage-monthly/    # index.ts + manifest.json
|   |   |-- usage-rings/    # index.ts + manifest.json
|   |   |-- usage-rolling/    # index.ts + manifest.json
|   |   `-- usage-weekly/    # index.ts + manifest.json
|   |-- widgets-template/    # copy-me unit + the authoring README
|   |   |-- template/
|   |   |   |-- index.ts
|   |   |   `-- manifest.json
|   |   `-- README.md
|   |-- css-modules.d.ts
|   `-- index.ts    # host entry: compose only (inject + loop over HOST_ROUTES)
|-- website/    # the plugin site (generated pages + verify.mjs)
|   |-- assets/
|   |   |-- favicon.svg
|   |   |-- icon-180.png
|   |   |-- icon.svg
|   |   `-- og.png
|   |-- css/
|   |   |-- base.css
|   |   |-- hero.css
|   |   |-- lab.css
|   |   |-- sections.css
|   |   |-- tokens.css
|   |   `-- widgets.css
|   |-- js/
|   |   |-- data.js
|   |   |-- detail.js
|   |   |-- gallery.js
|   |   |-- grammar.js
|   |   |-- i18n.js
|   |   |-- lab.js
|   |   |-- main.js
|   |   |-- previews.js
|   |   |-- rails.js
|   |   |-- spec.js
|   |   `-- theme.js
|   |-- gen-og.mjs
|   |-- gen-site.mjs
|   |-- index.html
|   |-- README.md
|   |-- robots.txt
|   |-- sitemap.xml
|   `-- verify.mjs
|-- .gitignore
|-- CHANGELOG.md
|-- CHANGELOG.zh-CN.md
|-- cordis.patch.yml
|-- LICENSE
|-- package.json
|-- pnpm-lock.yaml
|-- README.md
|-- README.zh-CN.md
|-- screenshots.json
|-- tsconfig.json
`-- tsdown.config.ts
```
<!-- TREE_END -->

---

## 2. 速查表：我要改 X，去哪儿

| 我想…… | 改这里 | 备注 |
|---|---|---|
| 加一个新组件卡片 | 复制 `src/widgets-template/template/` → `src/widgets/<新id>/` | 改 `manifest.json` + `index.ts`，再跑 `pnpm gen:registry`；**不需要改任何中央文件** |
| 改某个卡片里画的内容 | `src/widgets/<id>/index.ts` 的 `render()` | 这是该卡片唯一的实现处 |
| 改卡片外壳（标题/数值/图例的排版） | `src/client/render/CardBody.tsx` | 所有卡片共用 |
| 加一种图表类型 | `src/client/render/charts/<kind>.tsx` + `registry.ts` 一行 | 新图表 = 新文件 + 注册一行 |
| 改圆角百分比 / 内边距算法 | `src/client/render/card-geometry.ts`（`cardRadius` / `cardInnerPad`） | 设置页的「圆角档位」写进 `prefs.cornerPercent` |
| 改右栏整体布局（几列、多宽、让不让位） | `src/client/rail/geometry.ts` | 纯计算：读官方布局 → 解出列数/宽度/是否 yield |
| 改右栏什么时候测量、让位时机 | `src/client/rail/measure.ts` | ResizeObserver / 每帧宽度跟踪 / yield beat 都在这里 |
| 改右栏画什么（网格、加号、抽屉） | `src/client/rail/rail-view.tsx` | `createRailView(deps)` 工厂 |
| **改悬浮放大的动画手感** | `src/client/lib/morph-spring.ts`（曲线参数 `WAVE_SPRING`） | 见 §6 |
| 改放大波的几何（哪个卡片被放大、放大到多少、谁和谁换位） | `src/client/rail/wave/wave-geometry.ts` | |
| 改放大波的交互（命中测试、指针跟随、两层 deck 切换） | `src/client/rail/wave/RailWave.tsx` | |
| 改波/放大层的样式 | `src/client/styles/rail.module.css`（`.dsx-magnify-layer` 等） | |
| 改组件配置页（排序、字段控件、预览） | `src/client/surfaces/config/ConfigTab.tsx` | |
| 改组件市场（画廊、安装、卸载） | `src/client/surfaces/market/MarketTab.tsx` | |
| 改设置页的外壳（两个 tab） | `src/client/surfaces/Settings.tsx`（`WidgetsPage`） | |
| 改设置页在左侧导航的图标 | `src/client/surfaces/settings-nav-glyph.ts` + `styles/tokens.module.css` 的 `--dsx-nav-glyph` | 官方把图标按 section id 硬编码，第三方只能打 shim |
| 改某个数据源的抓取/解析 | host 侧 `src/host/<channel>.ts`；前端解析在 `src/client/families/<family>/data.ts` | |
| 加一条 host 路由 | `src/host/<name>.ts` + `src/host/routes.ts` 一行 | 记得在 `scripts/snapshot-host-routes.mjs` 加案例，否则 G7 直接红 |
| 改轮询/合并进 bridge 的逻辑 | `src/client/data/collector.tsx` | 唯一把外部输入折成快照的地方 |
| 改会话统计（轮次/步数/耗时/上下文） | `src/client/data/session-stats.ts` | |
| 改偏好项（存什么、默认值、迁移） | `src/client/runtime/prefs.ts` | |
| 改跨浏览器/跨地址的状态同步 | `src/client/runtime/host-sync.ts` + `src/host/state-file.ts` | |
| 改界面文案 | 单元自己的 `manifest.json` 的 `locale`；多处共用 → `src/widgets/_shared/locales.json`；插件外壳 → `src/client/i18n.ts` | |
| 改颜色/间距/按钮等基础样式 | `src/client/styles/primitives.module.css` | |
| 改设计 token（CSS 变量） | `src/client/styles/tokens.module.css` | 只有这一个地方定义 `:root` |
| 改卡片/面板/市场的专属样式 | `styles/{card,panel,market}.module.css` | |
| 改某个按钮的行为 | §5.4 的按钮归属表 | |
| 改构建/发布产物 | `tsdown.config.ts` + `scripts/build-types.mjs` + `package.json` 的 scripts | |
| 改闸门本身 | `scripts/` 下同名脚本 | 见 §11 |
| 查历史决策与证据 | `docs/architecture/ARCHITECTURE_REFACTOR_REPORT.md`（第二轮 = §16） | |

---

## 3. 一个组件单元（widget unit）的解剖

一个单元 = `src/widgets/<id>/` 一个目录，目录名就是组件 id（kebab-case）。它只有两件**必需**的东西：

```text
src/widgets/quota-manage/
├── manifest.json     # 机器可读的那一半：身份、尺寸、文案、数据源、骨架形状
└── index.ts          # 人写的那一半：定义 + render()
```

### 3.1 `manifest.json` 写什么

生成器认识的键**只有这九个**（`scripts/gen-registry.mjs` 的 `MANIFEST_KEYS`；多一个键直接报错，
因为它多半是拼写错误）：

| 字段 | 作用 |
|---|---|
| `id` | 身份。**必须与目录名一致** —— 生成器做三向校验（目录名 / manifest.id / `index.ts` 里的 id） |
| `order` | 发现顺序（生成器排序用） |
| `group` | 归入哪个分组（同组卡片共用分组显示名） |
| `builtin` | 是否内置 |
| `defaultInstalled` | 全新安装时是否默认进右栏 |
| `sizes` | 支持的尺寸：`2x2` / `2x4` |
| `locale.{zh,en}` | 该单元自己的文案字典（含 `widget.<id>.name` / `widget.<id>.desc`） |
| `source` | 数据来自哪一族：`usage` / `cc` / `sys` / `github`（可选）—— 决定「源还没答」时要不要画骨架 |
| `skeleton` | 骨架形状 `{shape, count?, rows?}`（可选，只认这三个子键） |

显示名与描述**不在 manifest 顶层字段里**，而是 `locale` 里的 `widget.<id>.name` / `.desc`。
图标也不在 manifest 里：卡片的图形由 `index.ts` 的 `render()` 画（或复用 `render/icons.tsx` 的字形）。

值域同样会被校验，所以 manifest 写错会在 `pnpm check:registry` 阶段就红，而不是运行时才怪。

### 3.2 `index.ts` 写什么

```ts
import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

export default defineWidget({
  id: 'quota-manage',
  name: () => t('widget.quota-manage.name'),
  desc: () => t('widget.quota-manage.desc'),
  builtin: true,
  sizes: ['2x2', '2x4'],
  configSchema: [ /* 设置页里这一张卡片自己的字段 */ ],
  example: { /* 设置页预览用的假数据 + sim 状态 */ },
  render: (stats, meta) => ({ /* WidgetRenderOut：纯数据，不是 JSX */ }),
})
```

三条硬规则：

1. **默认导出 `defineWidget({...})`** —— 生成器按这个形状发现并注册单元。
2. **`render()` 返回纯数据**（`WidgetRenderOut`），不是 JSX。外壳 `CardBody` 负责把它变成像素。
   这条规则是整个重构的安全网：G4 能在没有浏览器的情况下比对 110 份渲染输出。
3. **单元之间零互相 import**，渲染层也零 `widget-id` 特判。

### 3.3 什么时候可以多文件

单元目录里可以有别的文件，只要它是这个卡片私有的实现细节：

- `src/widgets/peak-pricing/holidays.ts` —— 节假日表与区间判断，只被这个单元用。
- 单元自己的样式：放 `src/widgets/<id>/index.module.css`（构建已支持，tagId 按**源码路径**隔离，
  所以两个单元各自的同名文件不会撞车）。目前 40 个单元都没用到 —— 因为卡片样式是统一的。

**不要把公共代码放进单元目录。** 判断标准：第二个单元想用它吗？想 → 去 §4 的公共层。

### 3.4 新增一个组件的完整步骤

```text
1. 复制 src/widgets-template/template/ → src/widgets/<新id>/（README 里写着每一步）
2. 改 manifest.json：id 必须等于目录名；补 locale.zh / locale.en
3. 改 index.ts：name/desc/render；需要字段就写 configSchema，需要预览就写 example
4. pnpm gen:registry        # 重新生成注册表（G1）
5. pnpm check               # G1 + 类型检查（0 错）
6. node scripts/validate-widget-unit.mjs src/widgets/<新id>   # G2
7. pnpm build && node scripts/snapshot-render.mjs --write      # 只在确实要更新渲染基线时（会新增行）
8. 刷新 GUI：设置 → 组件 → 市场 → 安装
```

---

## 4. 公共代码分成几层，谁能 import 谁

依赖方向是单向的，箭头指向「被依赖」：

```text
widgets/<id> ──► families/<f>/renders ──► render/CardBody ──► render/charts/registry
     │                  │                        │
     │                  └──► families/<f>/data ───┘
     └──► lib/contract · lib/format · i18n

client/index.ts ──► runtime/* · data/collector · rail/* · surfaces/* · styles/*
host/* ──► host/context · host/http · host/exec
```

| 层 | 放什么 | 硬规则 |
|---|---|---|
| `lib/contract/types.ts` | 所有共享形状 + 一个数据常量 | **零 import**（只想要类型的消费方不会拖进 i18n 或 React） |
| `lib/contract/helpers.ts` | `defineWidget`、标签解析、实例键、`sizesOf` | 也只依赖 types |
| `lib/{format,quota-math,heatmap-accounting,morph-spring}` | 与框架无关的纯函数 | 不 import React / 不改全局 |
| `runtime/*` | 框架管道：快照类型、偏好读写、host 同步、controller 接口 | 不知道任何具体卡片 |
| `data/*` | 把外部输入折成快照 | 只有 `collector.tsx` 碰 React（它是个组件） |
| `families/<f>/{data,renders}` | 某一族的载荷解析 + 该族的卡片渲染 | 族之间不互相 import |
| `render/*` | 卡片外壳、图表、图标、预览、几何 | 不认识任何 widget id |
| `rail/*` | 右栏几何 / 测量 / 视图 / 放大波 | 视图层接收注入，不直接读组合根的闭包 |
| `surfaces/*` | 设置页与市场页 | 只通过 `controller` 接口拿数据 |
| `styles/*` | 见 §9 | import 顺序 = 层叠顺序 |
| `host/*` | 后端路由，一渠道一模块 | 每个模块导出 `registerX(ctx): () => void`，`ctx.effect` 由入口调用 |

「共享 vs 私有」的判据只有一条：**第二个消费方存在吗**。只有一个消费方的东西就放在消费方旁边
（例：`rail/wave/wave-geometry.ts` 只服务 RailWave）。

---

## 5. 右栏是怎么显示出来的

### 5.1 四个注册点（唯一的「插进官方界面」的地方）

都在 `src/client/index.ts` 的 `apply()` 里，顺序即注册顺序：

| 槽位 | 注册的 id | 挂的是什么 | 什么时候存在 |
|---|---|---|---|
| `conversation.session.header.utilities` | `widgets-panel-toggle` | 顶部那个「组件」胶囊按钮 | 有会话时 |
| `conversation.composer.dock` | `widgets-panel-collector` | `data/collector.tsx` 的采集组件（**不画东西**） | 有会话时 |
| `conversation.input.overlay` | `widgets-panel` | `rail/rail-view.tsx` 的整个右栏 | 有会话时 |
| `settings.section` | `widgets` | `surfaces/Settings.tsx` 的设置页 | 打开设置时 |

采集器故意做成一个「什么都不画」的组件：它的 mount/unmount 就是「现在有会话」这个信号，
所以卡片的数据只会在真正有会话时被抓取。

### 5.2 从数据到像素

```text
host 路由 ──► data/collector.tsx ──► bridge 快照（runtime/bridge.ts 的形状）
                                          │
                        rail/rail-view.tsx │ 订阅快照，算出这一帧要画什么
                                          ├─ 逐实例调用 widget.render()  ← 唯一产生卡片数据的地方
                                          ├─ createWaveGeometry()        → 网格位置 / 放大比例 / 最近槽位
                                          ├─ CardBody（+ renderChart）   → 卡片长什么样
                                          └─ RailWave                    → 最后一层：放大、跟随、点得动
```

`client/index.ts` 只做装配：它给 `createRailView` 注入「怎么读偏好、怎么读让位预算、怎么执行命令」，
自己不画右栏。

### 5.3 右栏里有哪几层盒子

```text
.dsx-stats-drawer            整个右栏组（固定定位、整体滑动进来/出去、被挤没时淡出）
└── .dsx-stats-rail          滚动容器（只负责滚动与裁剪）
    ├── 静止 deck            卡片网格（.dsx-stats-card-slot 一格一张）
    ├── .dsx-magnify-layer   放大层（波生效时它才是用户看到并点到的那一层）
    └── .dsx-stats-add       「+」按钮
.dsx-stats-addpanel          加号打开的右侧面板（**portal 到 body**，否则会被官方层级压住）
```

### 5.4 按钮归属表（每个按钮在哪实现）

| 按钮 / 可点区域 | 实现位置 | 行为 |
|---|---|---|
| 顶部「组件」胶囊 | `client/index.ts` 的 header 槽位 | 开/关右栏（`prefs.railOpen`）；窄到放不下时置灰 |
| 卡片下方的「+」 | `rail/rail-view.tsx`（`.dsx-stats-add`） | 打开加号面板 |
| 加号面板的关闭 / 左边缘拖宽 | `rail/rail-view.tsx`（`.dsx-stats-addpanel-close` / `-resize`） | 宽度写 `prefs.panelWidth` |
| 整个卡片（可循环的卡片） | `CardBody` 的 `onCycle` ← `rail-view.tsx` 的 `cyclePool` | 点击在多个视图/多个池 key 之间循环，并持久化 |
| 卡片左下角的缩放把手 | `rail/rail-view.tsx`（`.dsx-stats-resize`，CSS 定在 `left/bottom: 0`） | 拖拽改 `prefs.cardSide`（卡片尺寸） |
| 卡片上的动作按钮（如「压缩上下文」） | `CardBody` 的 `ActionsBlock`，回调 = `rail-view.tsx` 的 `handleAction` | **两下确认**：第一下变成待确认胶囊，第二下才真的执行命令 |
| 卡片角上的动作按钮 | `CardBody`（读 `out.corner`，类名 `.dsx-stats-card-corner`） | 同样走 `onAction`，所以也是两下确认 |
| 设置页列表行（拖动排序 / 删除） | `surfaces/config/ConfigTab.tsx` 的 `OrderList` | 拖动改 `prefs.order`；删除改 `prefs.installed` |
| 设置页预览抽屉的关闭 | `surfaces/config/ConfigTab.tsx` | 收起预览（抽屉靠盒子变宽揭示，不是位移） |
| 市场里的安装/卸载/预览 | `surfaces/market/MarketTab.tsx` | 改 `prefs.installed` / 舞台预览 |

---

## 6. 「连续波峰」（放大波）算法拆解

它由四个文件组成，职责按「数学 / 布局 / 交互 / 样式」分开：

| 文件 | 负责 | 关键导出 |
|---|---|---|
| `lib/morph-spring.ts` | **曲线本身**：Apple 那套参数化弹簧（`responseMs` + `bounce`），给出「进度 p」 | `WAVE_SPRING`（当前 200ms / 0.1）、`springValue()`、`springSettleMs()` |
| `rail/wave/wave-geometry.ts` | **静态几何**：给一行行卡片算出每个槽位的 top/right/宽高、每个槽位离指针多近、指针应该把谁放大多少、以及重排（reflow）后的位置 | `createWaveGeometry()` 返回 `placeCards / scaleFor / nearest / rows / active / addSlotFor …` |
| `rail/wave/RailWave.tsx` | **交互与逐帧写样式**：命中测试、指针跟随、两层 deck（静止层/放大层）切换、抽屉相位、滚动联动 | 组件本身 + 若干 rAF 循环 |
| `styles/rail.module.css` | 放大层的定位/裁剪/过渡的**关闭**（过渡由 rAF 逐帧写，不用 CSS transition） | `.dsx-magnify-layer`、`.dsx-stats-card-slot` |

核心公式（这一版是定稿，改之前先读 `morph-spring.ts` 的注释）：

```text
displayed[i] = 1 + (target[i] − 1) · p
  target[i] = 指针实时算出的放大比例（离开后冻结在最后一帧的值）
  p         = 弹簧进度（0 = 静止，1 = 完全生效），由 rAF 每帧写
```

为什么不用 CSS transition：目标在 settle 期间每帧都在变，transition 会不停重启、永远停在缓入段；
而冻结目标又会在冻结结束时「跳过去」。把「目标」和「进度」都做成连续的，乘积就连续，
进入 / 跟随 / 离开是**同一条不中断的曲线**。

想改什么去哪里：

| 想改 | 改 |
|---|---|
| 放大的力度 / 时长 / 回弹 | `morph-spring.ts` 的 `WAVE_SPRING` |
| 放大多少倍、几个邻居受影响 | `wave-geometry.ts` 的比例场 |
| 命中的判定框、指针离开的时机 | `RailWave.tsx` |
| 放大层的视觉（阴影、圆角、裁剪） | `styles/rail.module.css` |

逐帧证据（这两条是「手感」唯一的客观证据，改完必须跑）：

```text
HEADFUL=1 node scripts/diag-morph-frames.cjs     # 逐帧表格：maxFrameStep / 速度包络
node scripts/diag-rail-hover-release.cjs          # 状态机 11 项断言
node scripts/diag-rail-scroll-perf.cjs            # 常驻合成层对滚动无回归
```

---

## 7. 设置面：两个入口，一个页面

| 入口 | 注册处 | 打开的组件 |
|---|---|---|
| 设置 → 「组件」section | `client/index.ts` 的 `settings.section` 槽位 | `surfaces/Settings.tsx` 的 `WidgetsPage` |
| 右栏「+」按钮 | `rail/rail-view.tsx` portal 出来的面板 | **同一个 `WidgetsPage`**（带 `hideHeader`），所以配置页只有一份实现 |

`WidgetsPage` 是外壳（两个 tab：组件配置 / 组件市场），具体内容在：

- `surfaces/config/ConfigTab.tsx` —— 已安装列表（拖动排序、删除、点开预览）+ 该卡片的
  `configSchema` 字段控件 + 预览抽屉。
- `surfaces/market/MarketTab.tsx` —— 可安装列表、画廊/列表切换、舞台预览、安装/卸载。
- `surfaces/layout.ts` —— 两个页面共用的三个宽度常量。
- 数据通过 `WidgetsController`（`runtime/controller.ts`）传入，页面不认识 bridge。

预览为什么必须复用真实卡片：预览走 `CardBody` + 该卡片的 `render()`，只是换成
`render/preview/preview-stats.ts` 里的假数据。这样预览和真卡片永远长一样（用户规则：
「预览组件与实际组件必须完全复用，唯一区别只是预览大小与预览效果」）。

---

## 8. 数据流：host 路由 ↔ 前端

| host 路由（`src/host/`） | 前端解析（`src/client/families/`） | 落到快照的字段 |
|---|---|---|
| `opencode.ts`：`/api/opencode-usage`、`-multi` | `families/usage/data.ts` | `usageData` / `usageMulti` |
| `commandcode.ts`：`/api/commandcode-usage` | `families/cc/data.ts` | `commandCode` / `commandCodeError` |
| `usage-daily.ts`：`/api/widgets-usage-daily` | `data/collector.tsx` 直接消费（热力图） | `usageDaily` / `commandCodeDaily` |
| `github.ts`：`/api/github` | `families/github/data.ts` | `github` / `githubError` |
| `sysinfo.ts`：`/api/sysinfo` | `families/sys/data.ts` | `sysinfo` |
| `state-file.ts`：`/api/widgets-state` | `runtime/host-sync.ts`（不走快照） | 偏好本身 |

会话侧的数据不来自网络：`data/session-stats.ts` 把官方 `useSession`/`useChat`/`useProjection`
折成 `Stats`，和上面几张表一起进快照。

骨架显示规则：单元的 `manifest.json` 声明了 `source`，外壳判断「这个源还没答」时把卡片画成骨架
（形状由 `skeleton` 声明）。**加载决策归外壳，数据归单元。**

---

## 9. 样式与主题

```text
styles/tokens.module.css       :root 变量（唯一的 token 定义处；第一个 import）
styles/card.module.css         卡片外壳 / 骨架
styles/rail.module.css         右栏盒子 / 锚定 / 加号面板 / 放大层
styles/panel.module.css        配置面板
styles/market.module.css       市场
styles/primitives.module.css   按钮 / 开关 / 下拉 / 分隔线等基础件
```

两条必须记住的规则：

1. **import 顺序就是层叠顺序**。每个 `.module.css` 在模块加载时各自注入一个
   `<style data-plugin-css="...">`，所以 `client/index.ts` 里的 import 顺序决定了覆盖关系。
   顺序：tokens → card → rail → panel → market → primitives。
2. **类名不哈希**（lightningcss `pattern: '[local]'`），所以 `.dsx-stats-card` 就是 DOM 里的类名，
   探针直接按它定位。
3. token 是自定义属性，按名字解析、不参与选择器竞争；把两块 token 提到一个文件是
   **唯一一次**打破「拼接字节全等」的改动，验证方式是逐 sheet 比对（见提交 `a8e3094`）。

连续曲率圆角：`corner-shape: squircle`（Chromium 139+）+ `cardRadius(unit, percent)`，
百分比档位来自设置页的「圆角档位」。**不要用 `clip-path: path()`**——它会把卡片的
`box-shadow` 和 1px 边框一起裁掉。

---

## 10. 国际化

| 文案属于谁 | 写在哪 | 怎么被读到 |
|---|---|---|
| 某个卡片的标题/图例/字段名 | 该单元 `manifest.json` 的 `locale.{zh,en}` | 生成器合并成 `WIDGET_LOCALES`，`apply()` 时灌进 i18n |
| 多个卡片共用（如用量类的通用词） | `src/widgets/_shared/locales.json` | 同上（`_shared` 不是单元，只是字典） |
| 插件外壳（设置页、面板、提醒） | `src/client/i18n.ts` | shell 词典 |
| 官方 locale 服务存在时 | `i18n.ts` 的 `installLocale()` 适配它 | 官方切语言 → 所有常驻界面重渲染 |

`t()` 的键在两种地方被检查：G2 校验「单元引用到的本地键在它自己的字典里存在」，
`docs/verify-i18n.mjs` 校验整本字典的完整性。

---

## 11. 闸门与验证：8 个离线 + 一组 live

| 闸门 | 命令 | 覆盖什么 | 故意破坏验证 |
|---|---|---|---|
| G1 | `node scripts/gen-registry.mjs --check` | 注册表与 40 个 manifest 不漂移 | ✅（改一个 widget 值即红） |
| G2 | `node scripts/validate-widget-unit.mjs` | 每个单元的契约 + 文案完整 | ✅ |
| G3 | `node scripts/verify-tsc-baseline.mjs` | 类型检查（基线已空 = **必须 0 错**） | —（0 错即硬门） |
| G4 | `node scripts/snapshot-render.mjs` | **110 份渲染输出**逐字段比对 | ✅ |
| G5 | `node scripts/extract-css.mjs` | 编译后 CSS 的拼接 | ✅ |
| G6 | `node scripts/audit-move-only.mjs` | 纯搬移提交的增删行抵消 | 人工复核辅助 |
| G7 | `node scripts/snapshot-host-routes.mjs` | **14 个 host 路由案例**的结构指纹 | ✅（405→404 被逐条指出） |
| G8 | `node scripts/verify-published-types.mjs` | 一个真实消费方能解析两个入口的 `.d.ts` | ✅（第一次跑就抓到 reference 路径错） |
| — | `node docs/verify-sysinfo.mjs` | sysinfo 深度契约（也在 CI 里跑） | — |
| — | `node --experimental-strip-types docs/verify-i18n.mjs` | 字典完整性 | — |

一条命令跑完常用的：`pnpm check`（G1 + G3）；发布前 `pnpm run build`（含 G8 需要用的类型产物）。

live 探针（需要 `dsh web` 在 3080 上跑着；重建后**等几秒**再跑，否则会撞上客户端 HMR 重打包）：

```text
node scripts/diag-rail-hover-release.cjs        右栏状态机 11 项
HEADFUL=1 node scripts/diag-morph-frames.cjs    逐帧弹簧证据
node scripts/diag-rail-scroll-perf.cjs          滚动性能
node docs/verify-skeleton-shapes.cjs            19 张骨架卡片
node docs/verify-nav-glyph.cjs                  设置导航图标 shim
node scripts/diag-config-tab-crash.cjs          设置页/预览不崩
headful 用 scripts/lib/chrome.cjs 解析浏览器（不再硬编码修订号）
```

---

## 12. 不变量（改东西时别破坏）

1. **`generated.registry.ts` 是生成物**，永远不要手改；改了 manifest 就跑 `pnpm gen:registry`。
2. **`render()` 返回纯数据**，不要在里面画 JSX 或读 DOM —— 那会毁掉 G4 这张唯一的离线安全网。
3. **单元之间不互相 import**；渲染层不出现 `widget-id` 特判。
4. **`lib/contract/types.ts` 保持零 import**；想要类型的模块不该被拖进 i18n 或 React。
5. **样式 import 顺序 = 层叠顺序**，插新样式表要放在正确的层里。
6. **host 侧每条路由都要在 G7 里有案例**，否则 `snapshot-host-routes` 会直接红。
7. **`ctx.effect` 只由入口调用**：渠道模块导出 `registerX(ctx): () => void`，不自己管生命周期。
8. **`client/index.ts` 只做装配**（308 行）：新的右栏行为放 `rail/`，新的页面放 `surfaces/`。
9. **包在变、地址不变**：改文件位置时同时更新本文（`scripts/print-tree.mjs --inject` 会重生成树）。

---

## 13. 仍然可选的拆分（都不是缺陷）

| 文件 | 行数 | 现状与建议 |
|---|---|---|
| `rail/wave/RailWave.tsx` | ~1,045 | 单一交互组件：6 个内部几何函数 + 25 个 props + 4 个 rAF 循环。可再拆出「放大层」子组件，收益中等 |
| `surfaces/config/ConfigTab.tsx` | ~686 | 三个子职责同文件（排序列表 / 字段控件 / 预览抽屉），可拆 3 个文件 |
| `data/collector.tsx` | ~502 | 可按数据源拆成 5 个 `pull()`；需要先定显式接口 |
| `lib/contract/types.ts` | ~665 | 纯类型，尺寸本来就该大；不建议再拆 |
| `host/github.ts` | ~449 | 凭据阶梯 / GraphQL / HTML 抓取 / 仓库脉冲四段，可选 |
