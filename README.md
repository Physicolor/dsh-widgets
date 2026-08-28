<p align="right"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

<h1 align="center">DeepSeek-Harness Widgets</h1>

<p align="center">
  <strong>A beautiful, extensible right-side widget system for DeepSeek Harness.</strong><br>
  Multi-column grids · 2×4 tiles · continuous magnification · built-in component marketplace
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/dsh-widgets?style=flat&label=latest%20release&color=4D6BFE" alt="Latest release">
  <img src="https://img.shields.io/npm/dt/dsh-widgets?style=flat&label=total%20downloads&color=4D6BFE" alt="Total downloads">
  <a href="https://github.com/Physicolor/dsh-widgets/stargazers"><img src="https://img.shields.io/github/stars/Physicolor/dsh-widgets?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License">
  <img src="https://img.shields.io/badge/DSH%200.1.x-4493F8?style=flat-square" alt="Supported: DeepSeek Harness 0.1.x">
</p>

<p align="center">
  <img src="docs/screenshots/cover.png" alt="DeepSeek-Harness Widgets preview" width="100%">
</p>

DeepSeek-Harness Widgets is a **persistent DSH bundle plugin** built on the Cordis composition model. It provides a customizable multi-column widget rail on the right side of the conversation page — real-time session insights, usage monitoring, and quick actions — with an extensible declarative registry.

---

## Features

### Multi-Column Grid

| Item | Detail |
| --- | --- |
| Columns | 1 / 2 / 4 (dropdown in settings, 2 by default) |
| 2×4 tiles | Twice the width of a 2×2 plus a gap, same height; the same widget can be installed in both sizes at once |
| Gap-free packing | Widgets pack by best-fit; gaps left by 2×4 tiles are backfilled by later 2×2s, so drag-reorder never leaves holes |
| Magnification | Works in multi-column grids too; magnified rows/columns yield by planar distance with constant spacing |

### Continuous Magnification

macOS-Dock-style hover magnification with two modes (toggle in **Settings → 组件 → 无极变化**):

- **Stepless (continuous follow)**: truly stepless — every card's scale is driven by its own continuous Euclidean distance to the pointer, so the peak glides smoothly between cards on any pointer movement. It snaps to its steady right-anchored geometry every frame (`transition: none`), so a card's right edge stays flush with the rail even mid-motion — no width/right desync while the pointer moves.
- **Discrete (default)**: reuses the same continuous geometry but snaps the pointer onto a quantized grid (row/column centres + the midpoints between adjacent ones: 2·rows−1 Y points, 2·cols−1 X points), with a 0.2s tween gliding the peak between grid points.

In both modes the magnified deck is painted by a fixed overlay **outside** the rail's scroll-clip box, so leftward growth escapes clipping while the resting rail width (and the conversation column distance) never changes. Scaling preserves the square card shape and constant spacing; magnification is adjustable in settings (`1.0–1.4`).

### Built-in Widgets

| Widget | Detail |
| --- | --- |
| Turns · Steps | session turn & step counts |
| LLM / Tool time | cumulative reasoning & call time |
| First-token latency | average TTFT |
| Rate | decode throughput (tok/s) |
| Cache hits | input cache-hit ratio |
| Tokens | input / output token counts |
| Context waterline | system/tool/message segment bars + breakdown; 2×2 and 2×4 supported |
| One-click compact | context usage % + round corner button (double-click to compact) |
| Tasks | in-progress / done / todo counts |
| Usage heatmap | GitHub-style calendar heatmap, self-tracked daily usage; 2×2 = ~3-month calendar, 2×4 = half-year all-points view |
| Last-7-days bars | vertical bars for the last 7 days; bar area height matches the calendar grid |
| Quote of the day | random motivational quote; text/alignment/wrapping customizable |

### Component Marketplace

- Browse all widgets (system + external), search, size-switch preview, install per `widget@size`;
- The installed list supports drag-reorder, config editing, and one-click `2×2 ↔ 2×4` (auto-dedup — one instance per widget/size);
- The widget-config tab supports per-card customization (quote of the day, heatmap window alignment, etc.).

### OpenCode Go Usage

Rolling / weekly / monthly usage windows + percentage + reset time. The host half registers a same-origin route proxying `opencode.ai`; the browser makes no cross-origin requests, and keys go through DSH credentials. Two presentations: **用量对比** (three-window bars) and **用量环图** (three-window donut rings — percent in each ring centre, exact value on hover, same urgency colouring).

### Peak Pricing (market widget)

A 2×2-only 峰谷定价 card showing whether the current moment is inside a DeepSeek peak-pricing window. Peak hours (Beijing time, UTC+8): Mon–Fri **09:00–12:00** and **14:00–18:00** — everything else, including weekends, is off-peak. Off-peak shows **CHEAP**; during a peak window the whole card glows with a breathing red inner glow (never a solid fill — the centre stays fully readable) and shows **EXPENSIVE**, while the corresponding window row under the title lights up brand-blue and scales up slightly. The schedule is hard-coded for now; a custom-schedule setting is on the roadmap.

---

## Architecture

- **Widget registry**: `WIDGETS` declarative descriptors (id / name / size / group / render); the rail and the settings page share one registry — adding a widget is just one descriptor;
- **Data collector**: mounted on the `conversation.composer.dock` slot, which renders only when an active session exists — a natural "session alive" signal;
- **Host half**: `webServer` + `credentials` services; registers the `/api/opencode-usage` same-origin proxy route and the `/api/widgets-state` store (widget-rail configuration persisted to `profiles/web/dsh-widgets-state.json` — the authoritative copy that survives browser origin switches, private mode and site-data clearing);
- **Reversible cleanup**: all registrations are managed by the fiber-effect lifecycle; uninstalling restores everything;
- **Slot integration**: `shell.overlay` (panel), `conversation.session.header.utilities` (capsule toggle), `settings.section` (settings page).

## Installation

```sh
# via npm (plugin market)
dsh plugin --profile web add dsh-widgets

# local development (link)
dsh plugin --profile web add link:D:/dsh-home/plugins/harness-widgets
```

After installing, **hard-refresh the browser** (Ctrl+Shift+R) and click the "组件" (widgets) capsule in the session header to expand the rail. The OpenCode Go widget needs `OPENCODE_GO_API_KEY` configured in the Models settings.

## Development

```sh
pnpm install
pnpm run build      # tsdown builds lib/
pnpm run check      # typecheck + tests + build
```

- `peerDependencies`: `@deepseek-ai/dsh-client-ui-slots`, `dsh-client-runtime` (provided by the DSH web profile);
- `cordis.patch.yml` inserts one `widgets` row; the host half and browser half are loaded by the loader and client-modules respectively.

## Compatibility

- DeepSeek Harness `0.1.0-rc.6` and compatible later `0.1.x`;
- Integrates via `shell.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section`;
- Coordinates explicitly with `dsh-better-sidebar`'s right rail (shares `--dsh-sidebar-width`); no residue after uninstall.

## Changelog

### v1.2.3
**Perf — 右面板开合动画掉帧修复（与 dsh-better-sidebar / dsh-ui-harmonizer 协同）：**

- 🧊 rail 与放大 overlay 的侧移从 `right` 属性动画改为**合成器 transform 平移**（`translateX(calc(var(--dsh-sidebar-width) * -1))`，`right:0`）：better-sidebar 面板开合时 rail 整树在合成层平移，卡片/热力图零逐帧 reflow；之前 `transition: right` 每帧重排整个 rail 子树，与对话列的 margin 动画叠加后随对话 DOM 规模掉帧，且两过渡相互不同步。
- 🗑️ 移除卡片 slot 常驻 `will-change: top,width,height`：此前两套 deck（静态+放大层）× N 张卡片全部常驻独立合成层，膨胀 GPU 内存与每帧合成成本；短 tween 由浏览器自动提升层，无需常驻。
- ✂️ 放大 overlay 卡片体改为**仅在真正放大时渲染**（slot div 常驻保持几何 tween 无缝）：静息时 rail 常驻 DOM 减半（热力图等重组件不再双份渲染）。
- 🔗 与 dsh-better-sidebar / dsh-ui-harmonizer 保持同变量同 duration/easing（`--dsh-sidebar-width` + `--ds-transition-duration-slow` + `--ds-ease-in-out`）；拖动（`body[data-dsh-sidebar-dragging]`）仍即时跟随；`prefers-reduced-motion` 关闭过渡。

**掉帧数值对比（playwright + 本机 Edge 实测，better-sidebar 右面板开合动画窗口）：**

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 重会话动画掉帧率（帧间隔 >26ms 占比） | 20–31% | ≈ 0–1.4%（rail 开/关/禁用动画三者无差异，即噪声） |
| 主线程长任务 | 每动画多达数个、单次 60–210ms | 0 |
| 组件栏开启 vs 关闭之差 | 明显（打开即卡） | 无差异（开启 = 零额外成本） |
| 滑动路径 | `right`/`margin` 逐帧 layout（全树 reflow） | transform 合成平移（合成器） |
| 常驻合成层 | 每卡片 × 双层 deck 全部常驻 | 0（tween 自动提升、结束即释放） |

→ 组件栏开启引入的掉帧从「每动画丢约 1/3 帧 + 数百 ms 长任务」**降到 0**：组件常开下开关右面板与关闭组件时同样丝滑（典型会话全程 60fps）。重会话（数千 DOM 节点）下对话列宽度过渡仍约 ~10% 掉帧——与组件无关（关闭组件同样存在、属 UI 协调层），已列入 Roadmap。

- ✔️ 自包含验证 `scripts/verify-sidebar-anim.cjs`（playwright-core + 本机 Edge，连 3080）：rail `transition-property=transform`；面板开合后 rail 右缘 = 视口宽 − 面板宽；消融测试——禁用 rail / 对话列动画后掉帧 1.4% / 0.6%，证明 rail 侧贡献已归零。

**New — 多 Key 用量联动（配合 dsh-multikey-pool）：**

- 🔑 新 host 端点 `/api/opencode-usage-multi`：解析全部池内 Key（`OPENCODE_GO_API_KEY` 主 + `OPENCODE_GO_POOL_2..9` 备用）逐把拉取用量，并计算「共同用量」total（滚动/周/月各窗口按可用 Key 数量比例取平均，状态与重置跟随用量最高的一把）。
- 🔄 用量环图 / 用量对比 / 滚动用量 / 每周用量 / 每月用量组件支持**单击整卡循环切换视图**：总 Key → Key 1 → Key 2 → … → 总 Key；当前视图以 legend 形式写在大标题正下方（「总 Key」「Key 1」「Key 2」……），切换选择经 `cardConfigs.<实例>.poolView` 持久化，跨刷新与跨浏览器保留。
- 🍩 按压弹性动画：可点击组件按下瞬间 scale(0.93) 快进慢出，松开以弹簧曲线回弹（`cubic-bezier(0.34,1.56,0.64,1)`），符合官方按钮手感；`prefers-reduced-motion` 不受影响。
- 🎯 点击与真实使用联动：切到 Key N 时同步通知多 Key 池把该 Key 设为主力（`/api/multikey` prefer），切回总 Key 自动解除手动优先——「看到的」就是「正在用的」。
- 🧩 单 Key 环境自动退化为原行为：池内只有主 Key 时组件照常显示主 Key 数据，不出现切换交互。

**New — 全面中英文适配（跟随 设置 → Language 即时切换，无需刷新）：**

- 🌐 接入官方 `locale` 服务（`ctx.get('locale')`）：全部 UI 文案改为字典驱动——设置页（组件配置/组件市场/组件设置）、右侧组件栏（卡片标题/数值/legend/角落按钮/添加钮/aria）、组件市场卡片、configSchema 表单、峰谷定价窗口、任务/上下文/寄语卡片、OpenCode 用量（总 Key/循环/重置）等均有英文译文；`locale` 服务缺席时自动回退内置 zh/en 字典（探测口径与官方一致：localStorage `dsh-language` → `<html lang>` → `navigator.language`）。
- 🔑 修复：`installLocale` 现在把 zh/en 字典**注册**进官方 `locale` 服务（`register(ns, locale, dict)`）再 `bind`——此前只 bind 未注册，界面会把字典 key 原文（如 `ui.capsule`、`card.contextWater.system`）直接显示出来；注册后按 active locale 正确取词，不再出现裸 key。
- ♻️ 常驻 UI（右侧栏、页头胶囊）订阅 `locale/change` 立即重渲染；设置页导航名「组件」改为 **label thunk**（`SlotLabel` 契约），语言切换后导航自动更新，无需重新注册。
- 📖 每个组件的名称/描述/徽标/预览切换标签支持中英双语；`WIDGETS` 的 name/desc/badgeLabel/simToggle/configSchema 改为 thunk，渲染时按当前语言取值。
- 🧩 零硬依赖：未装载 `locale` 服务的组合自动走内置字典，行为与之前一致。
- ✔️ 自包含验证 `docs/verify-i18n.mjs`（Node `--experimental-strip-types` 直接跑）：双语切换、无裸 key、卸载回退全绿。

### v1.2.2
**New — 峰谷定价 (peak-pricing) widget:**

- ⏱️ New market widget 峰谷定价 (2×2 only): shows whether right now is inside a DeepSeek V4 peak-pricing window. Hard-coded to Beijing time (Mon–Fri **09:00–12:00** & **14:00–18:00**, the UTC 01:00–04:00 / 06:00–10:00 windows); a custom-schedule setting is on the roadmap.
- 💰 Bottom-left big label mirrors the cache/tokens card (same font, size, position): red **EXPENSIVE** inside a peak window, **CHEAP** otherwise.
- 🟥 During a peak window the whole card glows with a gentle breathing red inner glow (scheme B — bleeds in from the edges, centre stays readable, never a solid fill; 2.2s, modest swing, pure urgency, no click bait); `prefers-reduced-motion` users get the static steady glow.
- 🔵 The two window rows under the title reuse the token-bar legend font: the live row lights up brand-blue and scales up slightly (10px→12px, 500→600), the other stays faint.
- ⏲️ A 30s always-on tick rebuilds stats even with no turn running, so a peak/off-peak flip at a window boundary lands promptly (the previous 1s tick only existed while a turn was running).

**New — OpenCode usage rings widget:**

- 🍩 New market widget 用量环图 (usage-rings, OpenCode Go group): one donut per window (rolling / weekly / monthly) side by side — the same data as the 用量对比 bars chart, in circle form.
- ⭕ The ring centres stay clean (no in-ring text), so the rings can be drawn thick and full (5px stroke, maximised diameter); each percent sits directly under its ring in a larger weight, and the window name + exact value surface on hover via the title tooltip (same urgency colours as the bars chart: ≥95 red, ≥75 amber, else green). Ring-to-ring spacing equals the card inner padding (12px on a 2×2) — the rings tighten to keep the three-across footprint — and the number-to-ring gap is slightly wider than snug (4px) so the layout carries over cleanly to planned 2×1 wide cards.
- 🧭 The existing 用量对比 bars widget is untouched — both presentations coexist and install independently.

**Changed — the OpenCode usage bars are now proportioned like a proper data-viz bar chart:**

- 📊 The 用量对比 (usage-bars) component's three bars no longer use a fixed ~12px width spread by `space-around`. Each bar's column now flexes to an equal share of the card width (the same elastic columns as the 用量柱状图 daily token bars) with the same 4px gutter, and each bar fills ~60% of its column — ≈24px on a 2×2 card, proportionate to its 56px height (a full-width 100% version read as fat blocks).
- 🟣 Bars are fully rounded (5px corners) — without a baseline track underneath, square bottoms read as overly sharp.
- 📏 No value labels on the bars (small-chart convention — labels on a 3-bar mini chart read as chartjunk); the exact percent surfaces on hover via the native title tooltip, and faint dashed 25/50/75% reference lines behind the bars let each bar's height be eyeballed against a quarter scale at a glance.

**Improved — preview state toggling + dark-mode select arrow fix:**

- 🖱️ Stateful widgets (currently 峰谷定价) now let you **click the preview card to flip its state** (peak/off-peak) in both the 组件配置 and 组件市场 previews — no need to wait for the real window to review the EXPENSIVE red glow and the CHEAP look; a "点击卡片切换：高峰/低峰" hint shows under the card. Declared per-widget via the `simToggle` descriptor, so future stateful widgets just add one line.
- 🔽 Fixed `.dsx-select` chevron not rendering/not following the dark theme: `fill='currentColor'` in a background-image data-URI SVG draws nothing (SVG-as-background-image resolves in an isolated image context), so the arrow now uses explicit fills — mid-grey in light mode, near-white under `body[data-ds-dark-theme]`.

**Fixed — filled action buttons are readable in dark mode again:**

- 🌗 Filled primary buttons (`dsx-btn-primary` — 已添加 / 添加 / 查看详情), the pressed state of the 组件 stats capsule, and widget-card action buttons (primary/danger kinds) painted `var(--dsw-alias-brand-primary)` behind hard-coded white text. In dark mode the brand token renders near-white, so the label merged into the fill and became invisible. Primary now fills with `var(--dsw-alias-state-business-primary)` and danger with `var(--dsw-alias-state-error-primary)` — the same token pair the official UI uses for filled action buttons — so the white label stays legible in both light and dark themes.

**Fixed — the add-panel height no longer collapses when dsh-better-sidebar's right panel is open:**

- 📐 The temporary add panel's `bottom` offset tracked `--dsh-sidebar-width` — the better-sidebar *width* variable that pushes `#root` aside when the right panel is open. With the right sidebar open (e.g. 320px) the bottom lifted by that whole width while `top` stayed fixed, halving the visible panel; it reproduced regardless of open order. It now anchors to the input-box breathing gap (`--dsx-input-bottom`), the intent the rail-measure comment always stated — the right offset still follows the sidebar, the vertical one never does. Headless-verified: panel height is identical with the sidebar off / 320px / 480px, vs the old rule dropping 886→566px at 320px.

**Fixed — 2×4 tiles are correctly masked in a 1-column layout:**

- 🧱 In 1-column mode a 2×4 tile (two cells wide) has nowhere to sit. The rail now hides installed 2×4 instances (temporarily — switching back to 2/4 columns restores them as-is), and the market says so: the 2×4 entry's title is struck through with a yellow "1列不可用" capsule beside it and its add button disabled. The `right` offset still follows the sidebar width; only height no longer does.
- 🧪 Headless end-to-end: added heatmap@2×4 on a 2-column rail (324px slot), switched to 1 column → title struck through + capsule shown + add disabled + wide slot gone (150px only); user state restored afterwards.

### v1.2.1
**Fixed — the last edit is now flushed to the host store when the page closes, so widget state survives ANY desktop shell and every browser/device:**

- **Root cause.** Widget config is written to two channels: `localStorage` (fast path) and the host file via a **400 ms debounced** PUT to `/api/widgets-state` (authoritative, origin-independent). The debounced write had **no unload flush**: if the window/tab closed within that 400 ms window (or while the PUT was still in flight), the request died with the page. On shells that spawn a fresh random loopback origin per launch (e.g. DSH Desktop builds), `localStorage` is a brand-new realm on every boot, so that single missed PUT meant the edit was lost for good — "changes don't save" on desktop while the fixed-port local web (stable origin) masked the same defect invisibly.
- 💾 **Unload flush.** A `pagehide` listener now calls `flushPendingState()` the moment the page starts tearing down. It sends any state that has not yet reached the host store via `navigator.sendBeacon` (delivered by the browser even as the page is destroyed) with a keepalive-fetch fallback; the host route already accepted POST as well as PUT, so the same endpoint copes with it. A quick close after an edit can no longer lose the change, on any desktop shell, browser origin, private mode, or cleared-site-data session.
- 🛡️ The debounced PUT also gained `keepalive: true`, so a write already in flight survives page teardown as well.
- 🧪 Headless-verified end-to-end against the real host store: capsule-click (a real `setPrefs` → `saveState`) followed by an **immediate** `pagehide` (≈80 ms, well inside the 400 ms debounce) produced a real beacon; the host file's `savedAt` advanced to match `localStorage`, the debounce fetch did not re-fire, and the test restored the user's true state afterwards.

### v1.2.0
**Fixed**
- 🗓️ Heatmap no longer over-credits today with a previous session's whole history. The fallback anchor now tracks the per-step-credited cumulative, and the fallback only diffs growth when the active session actually has a step that began today. Reopening yesterday's session (or the projection lag right after a new-session switch) used to diff the entire prior total — e.g. 106M — into today's cell.
- 🌐 Heatmap day attribution now honors a configurable timezone (**记账时区** in the heatmap card config), defaulting to Beijing UTC+8 (the day rolls at 08:00 UTC). Options: 北京 (UTC+8) / 跟随系统 / UTC. Previously attribution followed the browser clock, so the day boundary shifted whenever the system timezone was not UTC+8.
- 🧹 One-shot cleanup drops an already-polluted today value so the live collector rebuilds it cleanly.
- 📊 Token-usage bar chart now normalizes bar heights to the **max within the shown 7-day window** (rolling and weekly) instead of the whole history: the tallest bar of the week always reaches full height and the rest scale proportionally, so the chart stays full even when an older day (e.g. the 1.2G outlier) would otherwise flatten the window.

### v1.1.6
**Fixed — card-anchored magnification, wave-following add button, smooth enter/exit:**

- **Card-anchored trigger (all modes).** The wave engages only when the pointer actually hits a card; crossing the gaps keeps it engaged AND the peak keeps gliding with the pointer (discrete mode: snapped to the quantized grid, so it still moves while you cross a gap; realtime: follows the pointer every frame). Only leaving the rail disarms it.
- **Add button rides the wave, position included.** Its placement is recomputed from the focused (scaled) rows, so when the cards above grow taller the button moves down with the magnified deck bottom / last-row gap, and its size follows the same bell curve at that position (previously only its size scaled, pinned to the resting grid).
- **Right edge stays aligned; gaps stay exact.** Overlay card positions (`top`/`right`) are INSTANT and, in the realtime FOLLOW phase, the size transition is disabled entirely — every frame lands directly on the steady-state right-anchored geometry, so fast pointer movement never lingers in a non-steady intermediate pose (the historic cause of a drifting right edge AND uneven inter-card gaps). The enter/exit phases (and the discrete style's grid gliding, which changes targets at grid frequency) keep a 0.15 s width/height tween for smooth grow/shrink.
- **Smooth enter/exit.** The overlay is always mounted (hidden by opacity), so entering/leaving magnifies via the CSS size tween instead of popping in at the target size — no flicker; exiting shrinks back to the resting size the same way.
- 🧪 Headless-verified (playwright, both modes): visibility flips only on card hit / gap-cross / rail-leave as specified; overlay rightmost == static rightmost (diff 0); gap movement keeps the wave changing; the add button sits below the resting position (702 → 753 px) and grows to 166 px under the wave; control console clean.
- 🧰 **Market/config rework — add-only, no install/uninstall zone.** Every widget ships bundled, so the market no longer has "download/uninstall": opening a group lets you pick the concrete widget, choose its size with left/right arrows (no dropdown — e.g. the Coding-Plan heatmap/bars flip 2×2 ↔ 2×4 that way), and hit **添加** to append `widget@size` straight into the rail (already-added instances show a disabled 已添加). The config tab lost the "已卸载（点击恢复）" zone: removing a row deletes the instance entirely (installed + order + its config). Market groups are **系统** (all built-ins), **OpenCode Go** (rolling/weekly/monthly quota), **Coding Plan 用量** (heatmap + bars) and **其它** (quote of the day, to be re-classified later).
- 🧩 **Market cards** show the group name (bold) + widget count (capsule badge) on one line, a single description line, then actions — no id line.
- 🧮 **Every size is its own market instance.** Multi-size widgets (heatmap 2×2 / 2×4, context-waterline 2×2 / 2×4, …) appear as independent selectable entries — first the 2×2, then the 2×4 — instead of a size switcher; the count badge counts instances, not widgets.
- 🎨 **Preview now matches the real render.** The preview stats build the heatmap through the same `buildRollingGrid` path the live collector uses (7 week-rows × 13 day-columns — the old preview built it transposed, swapping width and height), so the 2×2 preview is a square card again, and the quote preview shows sample content (never persisted) so it isn't blank. All previews are fed concrete values (never blank).
- 📐 **2×4 previews scale to fit.** Wide cards preview at `scale(0.85)` centred in a fixed-width stage, so the right-edge buttons stay visible and the prev/next arrows never shift.
- 🗂️ **Config preview uses free space.** The selected widget's preview fills the remaining panel height below a top-LEFT title (extra room becomes vertical padding), and the preview size control is a dropdown beside the title — same `dsx-select` format as the 窗口对齐方式 field.
- 🙈 **Stats-line switch hides text only.** Enabling it keeps the official bar's space and layout untouched and makes just its labels transparent — matching manual "hide the text" setups; off shows the bar normally.
- 📊 **Usage bars align per week.** The 用量柱状图 window option is now 滚动(最近7天) / **每周对齐** (Sunday-aligned current week), instead of the misplaced quarter mode.
- ✅ **Tasks never vanish.** Without a todos projection the task card shows **暂无任务 · 0 进行中 · 0 待办** instead of disappearing.
- ✂️ Removed the divider line above the 自定义 (per-card schema) block in the config preview.
- 🔧 **Capsule button styling restored.** The CSS file carried a UTF-8 BOM that leaked into the first rule's selector at build time (a junk prefix before `.dsx-stats-capsule{…}`), silently killing the 组件 capsule's base style (border-radius, padding, background, height). Rewrote the file as BOM-free UTF-8; verified the capsule computes `border-radius:14px / height:28px / background / padding / 1px border` again.
- 📐 **4-column add button no longer overlaps cards.** Row-band packing leaves the last row's gap at the LEFT edge (right-anchored), but the add button was anchored off the LAST item — on a left-packed 4-column row that dropped the button into the row's own cards. Placement now anchors the row's LEFTMOST card and falls back below the deck when the leftover gap is narrower than the button. The fit decision uses the STATIC widths, so hovering (which widens that row's cards) never flips the button to the deck bottom-right — it stays in its gap slot, gliding with the row.
- 🏠 **Fresh installs pre-load only the stats-line family** (turns · LLM/tool time · TTFT · rate · cache · tokens — mirroring the official composer stats bar); everything else is a market add. Existing users' arrangements are untouched by design.
- 🙈 **New personal-preference switch** in 组件设置: "隐藏输入框下方文字条" hides the official composer stats bar under the input box (the rail shows the same data). Default OFF so other users keep their bar.
- 💬 **Quote card renders nothing without a custom text** (no default filler that used to rotate on every render), and it lives in its own 其它 group for now.
- ⚠️ The "已达上限" warning is now a floating centered pill that never consumes layout height.
- 🧪 Upgrade-fidelity regression (`docs/state-fidelity.cjs`): a hand-arranged legacy config (custom installed/order/cardSide/quote text, no new fields) loads with everything preserved — nothing reset, nothing re-added, `hideStatsLine` defaulted off; quote with no text renders zero cards. Tests snapshot the real host state and restore it, so they never touch a user's saved arrangement.

### v1.1.5
**Fixed — widget state now survives restarts (root cause: browser `localStorage` only):**

- Widget configuration (`installed` / `order` / per-card configs / sizes / panel and magnification settings) was kept **only** in each browser's `localStorage` — a per-origin, per-browser cache. It silently reset to defaults whenever the browser origin changed (`localhost:3080` vs `127.0.0.1:3080` are different localStorage realms), on private-mode or cleared-site-data sessions, or after a write silently failed (the old `saveState` swallowed errors) — and it **never followed to another device**, where the state is simply absent.
- ⚙️ The host half now registers `/api/widgets-state`: the rail state is persisted **atomically** (tmp + rename) to `profiles/web/dsh-widgets-state.json` under the profile data dir — one authoritative copy per DSH service, shared by every browser/address that reaches it.
- 🔄 On boot the client syncs with the host store: whichever side (localStorage vs host file) holds the newer `savedAt` wins, so any origin/browser converges to the last saved configuration instead of resetting; every change is written to both channels (localStorage immediately, host via a 400 ms debounced PUT).
- 🖥️ Cross-tab + visibility re-sync: a `storage` event re-reads the configuration in sibling tabs of the same origin, and switching back to a tab re-pulls the host store — multi-window/multi-origin sessions converge live, not only on the next boot.
- 💾 Existing `harness-widgets.*` localStorage keys are untouched; the token-usage heatmap ledger stays per-browser (it is high-frequency bookkeeping), while the UI configuration is now device-stable. Devices stay independent by design: each machine running its own DSH service keeps its own state file (no cloud sync).
- 🧪 No host dependency on bygone contract details — route/body handling matches the verified pattern already used for the OpenCode proxy.

### v1.1.4
**Meta — renamed package to `dsh-widgets`:**
- 📦 npm package renamed `harness-widgets` → `dsh-widgets` (dsh- prefix matches the ecosystem norm and npm search; `dsh-ui-enhancer`-style queries now hit this package). Old package is deprecated and redirects here.
- 🔀 GitHub repo renamed `Physicolor/harness-widgets` → `Physicolor/dsh-widgets` (old URL auto-redirects; stars/forks/issues preserved).
- ♻️ Install command is now `dsh plugin --profile web add dsh-widgets`.
- 💾 No data impact: localStorage keys (`harness-widgets.*`) stay unchanged, so heatmap and widget state are carried over.

### v1.1.3
**Meta:**
- 🏷️ Added npm `keywords` (deepseek-harness / dsh / cordis / plugin / web-ui / widgets / dashboard / heatmap) so the package shows up in npm search; no code change.
- 🪧 GitHub repo topics expanded (deepseek-harness, cordis, cordis-plugin, browser-extension, web-ui, widgets, dashboard, heatmap).

### v1.1.2
**Fixed**
- 🔢 Token-usage heatmap now accounts **per assistant step by its own start time** (v2), with a cumulative-anchor fallback when a host omits per-node `usage`. A day's cell = exactly the tokens of steps that began that day (LOCAL time), so sessions spanning midnight split correctly across both days; element dedup by `turn:step:start` keeps remounts / session switches / compaction idempotent.
- 🧹 **Boot-time repair**: a one-shot fix clears polluted live-day values (8/22 had shown 145M–181M from a fixed seed double-counting with live accumulation) and resets the dedup set, so the live path rebuilds the day exactly; a marker keeps it one-shot so later live values are never wiped.
- 📚 Non-live past days (8/14–8/21: 74.32M / 367.79M / 1195.70M / 161.49M / 292.34M / 352.36M / 214.85M / 44.55M) are backfilled from the authoritative per-event session logs (official delta algorithm, LOCAL-time attribution), whose sessions have ended — never double-counted. 8/22 is live-accumulated (≈114.87M and growing). Manual one-shot recovery: `docs/heatmap-recovery.js`.

### v1.1.1
**Fixed**
- 🔢 Token-usage heatmap accounting reworked to **per-conversation-step crediting**: every assistant step is credited exactly once, by its OWN start time (`timing.stepStartTime`), so a day's cell holds exactly the tokens of steps that *began* that day — the old daily-reset-baseline diffing credited yesterday's whole total (e.g. 47M→117M) to today whenever a session continued across midnight. Steps are deduped by `turn:step:start` (remounts, session switches, compaction, cross-midnight sessions all behave). A cumulative-anchor fallback covers hosts where the folded surface omits per-node `usage`, re-anchoring only on a genuine cumulative reset (new session), never on a bare day change.
- ⚠️ Migration previously rebuilt the table keeping only the demo seed (8/14–16), discarding real history on other days. The migration is now **preservation-only + backfill**: existing day values are kept untouched; non-live past days (8/14–8/21, whose sessions have ended) are backfilled from the authoritative per-event session logs (official delta algorithm, attributed by each usage event's LOCAL time). The live day (8/22) is NOT seeded — the real-time per-step accounting accumulates it, so no double count (a prior version seeded 8/22 and produced 145M–181M). A one-shot repair clears polluted 8/21/8/22 values, resets the dedup set, then re-backfills 8/21 so live accumulation rebuilds 8/22 exactly. Manual one-shot recovery: `docs/heatmap-recovery.js`.

### v1.1.0
**New**
- Usage-heatmap widget now supports **2×4**: a ~7-month (30-week) rolling grid showing every recent token-usage point, derived fresh from the raw daily log, horizontally centred with the today/window figures on the title row's right.
- New **last-7-days bar chart** widget (`heatmap-bars`, 2×2): vertical bars for the past 7 days, whose bar area height exactly matches the 2×2 calendar grid's content height (so the bars occupy the same vertical footprint as the day-rows they replace).

**Changed**
- Bar chart axis labels are now short month.day dates (e.g. `8.28`) instead of weekday chars; bars are ~1.5× wider with a fuller corner radius; the legend is two plain figures (today / 7-day total, no "今日/近7天" words); only the first and last date labels are drawn on the bottom corners (no x-axis baseline). The widget is now named **用量柱状图** (was 近7日柱状).
- Heatmap legend drops the "今日" prefix (two figures: today / window total), and the chart's bottom-left/right corners show the window's earliest date and today's date.
- The 2×4 heatmap grid is wider (30 weeks) and horizontally centred; its figures move to the title row's right end.
- The 2×4 **token heatmap** and **context waterline** charts are now bottom-aligned (a title-row headRight figure no longer forces top alignment).
- The rail's top padding grows 2px → 4px so the first card keeps clear of the enhancer rounded-card's top shadow; the magnify overlay mirrors it. No header rules live here anymore — the header's opaque rectangle (masking the rail's top) is harness-ui-enhancer's job.

### v1.0.0
**New**
- Settings → 组件: add a "无极变化（连续跟随）" switch exposing the real-time continuous magnification mode (peak follows the pointer every animation frame).
- Truly stepless magnification: every card's scale is driven by its own continuous Euclidean distance to the pointer (rail-content coords) instead of a discrete nearest-card anchor, so the peak glides smoothly between cards on any pointer movement.
- Discrete mode now REUSES the same stepless geometry: the live pointer coordinates are snapped onto a discrete grid of row/column centres plus the midpoints between adjacent ones (rows → 2·rows−1 Y points, cols → 2·cols−1 X points), and the 0.2s tween glides the peak between those grid points. Both modes therefore share one right-edge-anchored posture.

**Fixed**
- Hover magnification no longer widens the rail or pushes the conversation column right (bell-curve overshoot removed from `--dsx-rail-w`); a magnified card's leftward growth is painted by a fixed overlay OUTSIDE the rail's scroll-clip box, so it escapes clipping while the resting rail width and conversation distance stay unchanged.
- The magnify overlay mirrors the rail's exact box model (same padding/box-sizing + inner deck), so magnified cards stay flush with the resting rail's right edge with no extra hit-test cost.
- The rail's add button fades with the static cards while magnifying; the overlay mirrors it at its resting position so it stays visible and right-aligned.
- Stepless mode snaps to its steady right-anchored geometry every frame (`transition: none`) — a tween left cards in a non-steady intermediate pose while the pointer moved, letting the right edge stray past the rail until the pointer stopped. Discrete mode keeps its 0.2s settle tween.

### v0.3.0
**New**
- Multi-column grid: 1 / 2 / 4 columns (2 by default), magnification supported.
- 2×4 tiles: context-waterline 2×4 version (top-right % + extended segment bar); the same widget can be installed as both 2×2 and 2×4.
- Component marketplace with system widgets + per-instance (`widget@size`) install; installed and preview both support 2×2 ↔ 2×4 (auto-dedup).
- Continuous wave animation: hover magnification changed from discrete steps to continuous exponential decay, responding smoothly as the pointer moves in X/Y.
- Gap-free packing (best-fit) — no holes at any drag order.

**Fixes**
- 2×4 card height wrongly filled by width, causing abnormal occupancy.
- Switching sizes no longer duplicates; deleting no longer removes same-name/same-size instances.
- Magnification didn't respond vertically at horizontal peak transitions.

### v0.2.2
- Fix daily usage not resetting across days (token cumulative baseline bound to the date; auto-clears across days).

### v0.2.1
- Fix heatmap count spikes (ledger baseline persisted; re-mount only counts genuine new increments).
- Fix seed update not applying (forced overwrite; version raised to .3).

### v0.2.0
- macOS-Dock-style hover magnification (discrete steps + layout swap).
- Per-card config: quote text/alignment/wrapping, heatmap window alignment.
- New widgets: tasks, one-click compact, context waterline, usage heatmap (self-tracked), quote of the day.
- Brand-blue title; one-click compact button moved to the bottom-right.

### v0.1.1
- Widget rail transparent background, hidden scrollbar (cross-browser), removed top padding.

### v0.1.0
- Right widget rail + 7 built-in stat widgets + 3 OpenCode Go usage widgets;
- Settings → widgets page (preview / install / reorder);
- In-progress turn LLM/tool time refreshed every second.

## Roadmap

The widget registry (`WIDGETS` descriptors) already lays the foundation for more — adding a widget is just one descriptor.

- **Heatmap range/period controls**: let the 2×4 heatmap and bars pick custom ranges (weekly/monthly/etc.) beyond the current half-year / 7-day defaults;
- **Multi-platform usage widgets**: Z.ai, DeepSeek balance, etc., reusing the host same-origin proxy + credentials pattern;
- **Custom peak-pricing schedules**: expose window customization for the 峰谷定价 widget (currently hard-coded Beijing weekdays 09:00–12:00 / 14:00–18:00) — custom start/end times, weekday sets, and timezone;
- **Utility widgets**: one-click compact (needs DSH official compaction) and more;
- **External integrations**: Feishu / WeChat push & interaction, keys strictly via DSH credentials;
- **Widget marketplace**: open a third-party widget registration mechanism so community widgets can join like plugins;
- **More locales**: the dictionary layer now has zh/en for every key — adding `ja`/`ko` etc. is a pure dictionary extension;
- **Cross-device sync** (optional): today each DSH service keeps its own `dsh-widgets-state.json` — a cloud/account sync layer could share one configuration across machines, but local-first independence is the deliberate default.

## License

[MIT](LICENSE)
