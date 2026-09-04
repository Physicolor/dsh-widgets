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

## Website / Showcase

A self-contained showcase site lives in [`website/`](website/) and is ready for GitHub Pages at **https://physicolor.github.io/dsh-widgets/** — what dsh-widgets is, why it exists, every real widget (galleries + a live playground), the widget-unit architecture, the production workflow, and a requirement-form → widget-spec generator. Plain HTML/CSS/JS, no build step, all paths relative for the project Pages base path. `node website/verify.mjs` self-verifies (static checks + Edge-headless browser checks). Deploy: see `website/README.md`.

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

macOS-Dock-style hover magnification with two modes (toggle in **Settings → Components → Realtime follow**):

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
| System monitor | local hardware family: CPU/GPU utilization numbers, memory, VRAM, GPU temperature — 2×2 cards + 2×4 rings dashboard |
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

Rolling / weekly / monthly usage windows + percentage + reset time. The host half registers a same-origin route proxying `opencode.ai`; the browser makes no cross-origin requests, and keys go through DSH credentials. Two presentations: **usage-bars** (three-window bars) and **usage-rings** (three-window donut rings — percent in each ring centre, exact value on hover, same urgency colouring).

### Peak Pricing (market widget)

A 2×2-only peak-pricing card showing whether the current moment is inside a DeepSeek peak-pricing window. Peak hours (Beijing time, UTC+8): Mon–Fri **09:00–12:00** and **14:00–18:00** — everything else, including weekends, is off-peak. Off-peak shows **CHEAP**; during a peak window the whole card glows with a breathing red inner glow (never a solid fill — the centre stays fully readable) and shows **EXPENSIVE**, while the corresponding window row under the title lights up brand-blue and scales up slightly. The schedule is hard-coded for now; a custom-schedule setting is on the roadmap.

---

## Architecture

- **Widget units + build-time discovery (ARCH-001)**: every widget is an independent unit under [`src/widgets/<id>/`](src/widgets/) — `manifest.json` (machine-readable contract: id / group / sizes / defaultInstalled / per-widget locale) + `index.ts` (the `defineWidget` descriptor: render + name/desc thunks + configSchema + example). The registry is **generated**, never hand-maintained: [`scripts/gen-registry.mjs`](scripts/gen-registry.mjs) scans the unit dirs and emits `src/client/generated.registry.ts` (`WIDGETS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / merged `WIDGET_LOCALES`). Adding a widget = adding one unit dir; `pnpm build` regenerates and `pnpm check:registry` fails loudly when the registry is stale. The widget template lives in [`src/widgets-template/`](src/widgets-template/) — outside the scan root, so it can never be discovered or registered;
- **Shared layer (stable core)**: [`src/client/lib/`](src/client/lib/) — `contract.ts` (the Widget contract + resolvers), `format.ts` (pure formatters / heatmap grid builders), `usage-view.ts` (OpenCode usage family renders), `heatmap-accounting.ts` (token heatmap self-accounting provider). Widget units import these; widget-specific logic stays in the unit;
- **Per-widget i18n**: widget strings live in each unit's `manifest.json` (family-shared strings once in `src/widgets/_shared/locales.json`); the shell dictionary (`src/client/i18n.ts`) owns only the shell UI. The generated registry merges everything and the shell registers it with the official locale service at apply() time;
- **Data collector**: mounted on the `conversation.composer.dock` slot, which renders only when an active session exists — a natural "session alive" signal;
- **Host half**: `webServer` + `credentials` services; registers the `/api/opencode-usage` / `/api/opencode-usage-multi` same-origin proxy routes and the `/api/widgets-state` store (widget-rail configuration persisted to `profiles/web/dsh-widgets-state.json` — the authoritative copy that survives browser origin switches, private mode and site-data clearing);
- **Reversible cleanup**: all registrations are managed by the fiber-effect lifecycle; uninstalling restores everything;
- **Slot integration**: `shell.overlay` (panel), `conversation.session.header.utilities` (capsule toggle), `settings.section` (settings page).

## Installation

```sh
# via npm (plugin market)
dsh plugin --profile web add dsh-widgets

# local development (link)
dsh plugin --profile web add link:D:/dsh-home/plugins/harness-widgets
```

After installing, **hard-refresh the browser** (Ctrl+Shift+R) and click the "Components" (widgets) capsule in the session header to expand the rail. The OpenCode Go widget needs `OPENCODE_GO_API_KEY` configured in the Models settings.

## Development

```sh
pnpm install
pnpm run build      # gen-registry (discovery) + tsdown builds lib/
pnpm run check      # registry up-to-date guard + tsc --noEmit
pnpm check:registry # discovery guard only
node scripts/validate-widget-unit.mjs [dir]   # widget-unit contract validator (Worker self-check / review)
```

> Note: `tsc --noEmit` still reports pre-existing strict-mode errors on UNTOUCHED code — the peer slot types (`@deepseek-ai/dsh-client-ui-slots`) only know the `root` slot name while the runtime accepts arbitrary slot ids (live plugin works; the v1.3.0 refactor went from 24 to 18 such errors, all outside the changed files), and the host half lacks `@types/node`. The project gate is `pnpm build` + `pnpm check:registry` (both green) plus the live-bundle discovery probe (`docs/verify-discovery.cjs`).

- `peerDependencies`: `@deepseek-ai/dsh-client-ui-slots`, `dsh-client-runtime` (provided by the DSH web profile);
- `cordis.patch.yml` inserts one `widgets` row; the host half and browser half are loaded by the loader and client-modules respectively.

## Compatibility

- DeepSeek Harness `0.1.0-rc.6` and compatible later `0.1.x`;
- Integrates via `shell.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section`;
- Coordinates explicitly with `dsh-better-sidebar`'s right rail (shares `--dsh-sidebar-width`); no residue after uninstall.

## Changelog

### v1.4.1

> This release ships the whole working tree: the **System monitor family** (below), the **rail drawer animation**, and the **usage decimal fix** — all previously unreleased work (logs under the old `v1.4.2` / `v1.5.0 working tree` headers).

**Fix — sparkline↔time-label spacing:**

- 📏 The GPU utilization sparkline now keeps a **3px** gap between the chart area and its bottom time labels — identical to the barsV bar→date-label spacing (outer 4px lead-in unchanged).

**Fix — sys-gpu-line stuck on 「等待设备数据」:**

- 🐛 The sparkline read the host's `history` ring buffer — a field only the NEWEST host build serves. A host that was restarted before that field landed (or not restarted since) never returns it, so the card waited forever.
- 🩹 The collector now ingests every successful poll into a **client-side fallback history** (module ring buffer, ≤120 samples): the sparkline works on ANY host from the moment the page loads — curve appears after the second poll. When the host is restarted, its (longer, reload-surviving) history takes precedence automatically.
- 📏 **Sparkline sample window** (组件配置): 10 / 15 / 20 / 25 / 30 points, default **20** — only the most recent N samples are drawn, so the line never compresses into a blob no matter how long the host has been sampling.
- ✅ `verify-sysinfo.mjs` (12/12) + `verify-usage-guard.mjs` (5/5) stay green.

**Polish — ring-to-caption spacing:**

- 📏 All ring charts (usage-rings 3-ring, CPU·GPU twin rings, the 2×4 board) now keep a **4px** gap between the ring and its caption row — the same rhythm as bar→label in the bars charts. The old 2px glued the percent to the ring; the breathing room matters most on the 2×4 board's small rings.

**Hotfix — one crashing widget took the WHOLE rail down (P1):**

- 🐛 A malformed OpenCode usage payload (one window missing/null, e.g. an upstream partial response) made `usage-rings`/`usage-bars` throw on `u.rolling.percent`; the uncaught render error killed the entire `shell.overlay` slot entry — every widget disappeared until the next hard refresh ("only visible briefly after refresh").
- 🛡️ **Defense 1 — data layer**: every usage window now reads through `winPct()` (missing / null / non-numeric → the card degrades to a `—` placeholder, never throws); `usageRender` got the same guard.
- 🛡️ **Defense 2 — render layer**: the rail wraps EVERY card render in try/catch — a crashing widget renders as a `渲染异常` placeholder card while the rest of the rail stays alive; the same isolation covers the config/market previews. A single bad widget can no longer hide the rail, ever.
- ✅ New regression probe `docs/verify-usage-guard.mjs` asserts both defenses exist in the built bundle (5/5); `verify-sysinfo.mjs` stays 12/12.

**Polish — system widgets round 3 (layouts, big-figure switch, sparkline):**

- 🧹 **sys-board**: the `0/0 GB` sub line is gone (ambiguous); the GPU model + temperature stay at the title row's right end. Ring labels now share ONE row with their percent (`43% CPU`) — the 2×4 board has room for names horizontally.
- 🚫 **usage-rings**: the rolling/week/month label line under the rings is removed (user preference) — rings show just the percent again, names surface on hover.
- 🔄 **sys-gpu / sys-cpu big-figure switch**: clicking the card cycles the big number (GPU: VRAM → temp → utilization; CPU: utilization → used memory) and the same selection is available as a config dropdown (「大数值显示」). The cycle persists per-instance via a new `cycle.store` field (`bigMetric`), so sys cycles never collide with the usage pool view nor fire multikey `prefer` calls.
- 📈 **New `sys-gpu-line` widget** (2×2): Windows-task-manager style GPU utilization sparkline — filled area + polyline, same 7-row footprint/paddings as the barsV chart, time labels on the bottom corners. The host `/api/sysinfo` now returns a rolling `history` ring buffer (≤120 samples of cpu/gpu utilization).
- ✅ Verification grew to 12 checks (history arrays parallel, first cpu sample null, gpu entries bounded); live probe unaffected.

**Fix — sys-board rendered as 2×2 (sizes double-source mismatch):**

- 🐛 `sys-board` declared `2×4` in its `manifest.json`, but the runtime reads the DESCRIPTOR's `sizes` — which was missing, so `sizesOf()` fell back to `['2x2']`; the market listed and the rail rendered a bogus 2×2 instance. Fixed by adding `sizes: ['2x4']` to the descriptor; persisted `sys-board@2x2` instances auto-migrate to `sys-board@2x4` on load.
- 🛡️ New build-time guard in `gen-registry.mjs`: the manifest sizes and the descriptor `sizes` literal must now agree (descriptor default = 2×2), so this class of drift fails the build instead of shipping.
- 🔌 Live probe `docs/probe-sysinfo-live.cjs` relaxed: on a live host the first request usually already has a delta baseline (the browser collector polls continuously), so it accepts either `null` (fresh host) or a numeric util; the pristine first-sample-null assertion stays in `docs/verify-sysinfo.mjs`.

**New — System monitor family (local hardware widgets):**

- 🖥️ **Four new widgets** reading the MACHINE's hardware through a new host route `/api/sysinfo` (CPU utilization = delta of `os.cpus()` totals across two polls, memory = `os.totalmem/freemem`, GPU = one `nvidia-smi` query): `sys-cpu` (CPU % big number + memory line), `sys-gpu` (VRAM big number + utilization/temperature — no model name, the value stays the bottom-left figure), `sys-rings` (CPU / GPU utilization twin donuts) and `sys-board` (2×4 dashboard: CPU / memory / GPU utilization / VRAM rings + the short GPU model in the title row's right end). All four sit in their own `device` marketplace group (「设备状态」— distinct from the harness-system group); shared family logic lives in `src/client/lib/sys-view.ts`.
- ⏱️ **Per-widget refresh interval** (组件配置): 5 / 10 / 30 / 60 s presets + a custom numeric field, default 10 s. The collector polls at the SHORTEST interval among installed sys-* instances (clamped 5–60); the host caches ~1 s so widgets sharing one tick still trigger a single `nvidia-smi` spawn.
- 🚫 **CPU temperature deliberately absent** — researched, then abandoned: Windows exposes no reliable, privilege-free CPU temperature source (WMI thermal zones are unavailable on most boards — verified on the dev machine; LibreHardwareMonitor would be an external runtime dependency). GPU temperature comes from `nvidia-smi` and works out of the box; widgets degrade gracefully (`未检测到 NVIDIA GPU`) without one.
- 🎨 Ring charts now render their label under the percent (9px tertiary, ellipsized) — the usage-rings cards gain their window names (滚动/周/月) in the same stroke.
- 🗂️ The system widgets form their own marketplace group `device` (「设备状态 / Device」) instead of riding the harness `system` group, which is about DeepSeek Harness internals, not the machine.
- ✅ Self-contained verification `docs/verify-sysinfo.mjs` drives the REAL host route with a mocked webServer (no running DSH needed): payload shape, first-sample `cpu.util: null`, ~1 s cache hit, delta utilization on the second window, disposer cleanliness — 9/9 green on the dev machine.
- 🔌 `docs/probe-sysinfo-live.cjs` checks the RUNNING DSH service instead (bundle coherence + live `/api/sysinfo` 200 + delta utilization). While the old host process is still up it fails with 404 — the expected "restart the web host" evidence when cards stay on 「等待设备数据」.

**Also in v1.4.1 — rail drawer open/close animation (matching dsh-better-sidebar's slide language):**

- 🎬 Opening glides the widget rail in from the **right** (`translateX(+railW)` → 0, moving leftwards into its resting slot); closing is the reverse (0 → `translateX(+railW)`, sliding out to the right), using the same `--ds-transition-duration-slow` + `--ds-ease-in-out` tokens as the sidebar panels. The rail, the magnify overlay, and the add panel move as **one surface** via a `position:fixed inset:0` wrapper (a transformed fixed ancestor becomes the children's containing block, but the wrapper spans the viewport so every child's coordinates stay identical).
- 🔁 CSS transitions interrupt natively: a rapid open→close→open re-toggle animates from the current intermediate geometry straight to the new target — no snap, no desync. The rail unmounts only after the closing slide finishes (`prefers-reduced-motion` closes instantly).
- 🎯 Travel distance is the rail's own pixel width (+24px margin), **not** a percentage — `translateX(%)` on a full-viewport wrapper resolves against the whole viewport width and would slide a screen-width over the same 0.3s (far too fast).
- 🖱️ The add panel (market / config / settings overlay) explicitly re-enables `pointer-events: auto`: the drawer wrapper is click-transparent, and without the opt-in the panel was unhit-testable — clicks fell through to the rail's cards.
- ✅ New self-contained verification `docs/verify-rail-drawer.cjs` (playwright-core + headless Chromium against the live host): open glides in from the right with 60+ intermediate frames, close slides past the viewport then unmounts, interrupt (rapid open→close→open) never unmounts and has zero hard step jumps, plus add-panel / card-render / hover smoke and a mid-slide screenshot; `docs/verify-ui2.cjs` and `docs/smoke-widgets.cjs` regressions stay green.

**Also in v1.4.1 — usage decimal fix:**

- **Fix** — 滚动用量 / 每周用量 / 每月用量卡片的百分比保留一位小数（如 42% → 42.5%），与 OpenCode 官网一致；用量柱状图、用量环图数字格式不变。

### v1.4.0 (project website — first public release)

- 🚀 **Published as v1.4.0** — `dsh-widgets@1.4.0` is live on GitHub and npm. The project website is now public at `https://physicolor.github.io/dsh-widgets/` via GitHub Pages. No plugin code changes; version bumped solely to ship the website.
- 🌐 **Project website / widget showcase** added in [`website/`](website/) — a single-page static site (HTML + CSS + vanilla JS, no framework): hero with a 3-row widget-rail animation, one-command install terminal with copy, gallery of **all 19 real widgets** (filter by 5 real categories), design-philosophy good-vs-bad comparison, five-step how-to-create section + requirement form to widget-spec generator, and a slim contribution section with docs/issues links.
- ✅ **Self-contained verification** [`website/verify.mjs`](website/verify.mjs): JS/CSS/HTML syntax checks + Edge-headless CDP render — 44/44 checks green across desktop (1440/1920), tablet, and mobile viewports, including default light theme, default Chinese language, full zh↔EN toggle, dark theme persistence, real-widget token checks, i18n key completeness, liquid-glass sheen, and console/network monitoring.
- 🎨 **Widget previews are the real widget rendering** — `previews.js` ports the plugin's own `PREVIEW_STATS`, `format.ts` helpers, per-unit `render()`, and the `CardBody` / `ChartBlock` scale formula 1:1; colors are the real DSH tokens extracted from the live UI (`deepseek-500` light / `deepseek-400` dark). No invented design system; no plugin code touched.
- 🖼️ **Hero = a ~1150px first screen**: left story column (title / bilingual description / CTA / stats), right = a real widget array (plugin grid rules: `cardSide 150`, `panelPadding 24`, 2-col rail width 372px, 2×4 wide = 324px); install terminal as the hero's footer.
- 🪷 **Liquid-glass navigation** — real refraction + sheen: `backdrop-filter` blur+saturate + diagonal highlight (`::before`) + slowly drifting light band (`::after`, `nav-sheen` 11s). Only decorative layers move; text and icons stay stable.
- 🧹 **Playground and Demo removed** — the website now has five sections (Hero, Widgets, Design, Create, Contribute). All widget display is unified through the single `DASH_PREVIEWS.render()` adapter; no "simulated" labels remain.
- 🌏 **Full Chinese / English bilingual** — first visit defaults to Chinese + Light; a nav toggle switches the entire site through one dictionary (`i18n.js`). Dark stays opt-in and persisted.
- 🧮 **Hero stat numbers** use HarmonyOS Sans (not monospace); `tabular-nums` kept for alignment.
- 🧾 **Footer simplified** to a single row (brand + links only).
- 🔧 **Bug fix**: usage-bars chart labels (x-axis) no longer overflow the chart container — chart wrapper now sizes to content, matching the real `ChartBlock`.
- 🔗 Zero plugin code touched — no build/registry impact.

### v1.3.0
**Architecture — widget units + build-time discovery (ARCH-001: widget unitization, contract, low-conflict registry, multi-agent isolation):**

- 🧱 **Every widget is now an independent unit** under `src/widgets/<id>/` (`manifest.json` + `index.ts`). The old monolith `src/client/widgets.ts` (all 19 widgets + all renders + the hand-maintained `WIDGETS` array) is gone; i18n strings for widgets moved out of the shared `i18n.ts` dictionary into each unit's manifest.
- 🔎 **The registry is generated, not edited**: `scripts/gen-registry.mjs` scans the unit dirs at build time and emits `src/client/generated.registry.ts` (`WIDGETS` / `ALL_IDS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / merged `WIDGET_LOCALES`) with a three-way id consistency check (dir name === manifest.id === index.ts id literal). `pnpm build` regenerates first; `pnpm check:registry` (and `pnpm check`) fails loudly when the registry is stale.
- 🤖 **Parallel-agent safe**: creating Widget A never requires editing Widget B's files or any central registry — a worker touches only its own unit dir; registration follows automatically at build. Verified end-to-end with two concurrent worker agents creating TEST-A/TEST-B units (parallel-creation test, units removed after the proof).
- 🧩 **Shared layer split** (`src/client/lib/`): `contract.ts` (Widget contract + resolvers), `format.ts` (pure formatters / grid builders), `usage-view.ts` (OpenCode usage family renders), `heatmap-accounting.ts` (heatmap self-accounting moved verbatim out of the shell entry).
- 🌐 **Per-widget i18n**: widget strings live in each unit's `manifest.json` (usage-family strings once in `src/widgets/_shared/locales.json`); the shell dictionary keeps only shell UI. Merge + registration happen at apply() time via `WIDGET_LOCALES`.
- 🖼️ **Preview mock (Example) is widget-owned**: the market/config preview quirks that used to be hard-coded in `components.tsx` (heatmap window-aligned grid, quote placeholder, peak-pricing sim base) now live in each unit's `example` field; the shell applies it generically. New widgets with custom preview data no longer touch shared code.
- 🗂️ **Template**: `src/widgets-template/` holds the skeleton + contract guide; physically outside the discovery root, so the template can never be registered.
- 🎨 Per-widget CSS is now safe: `tsdown` CSS-module tag ids use the src-relative path instead of the bare basename (two units shipping `index.module.css` no longer collide).
- 🏷️ Market group labels are dictionary-driven (`group.<group-id>`, fallback to the widget name) instead of a hard-coded map.

### v1.2.4
**Fix — rail open/close glide returns to main-thread `right` transition for perfect lockstep (with dsh-ui-harmonizer v0.8.3):**

- 🤝 v1.2.3 moved the rail glide to a compositor transform (zero dropped frames), but when the conversation column's per-frame margin reflow overran a frame the rail kept gliding while the column stalled — the two surfaces **visibly split** ("rail glides first, conversation lags"). This is not a performance issue but a fundamental difference in animation paths: compositor and main-thread animations will always diverge on busy frames.
- 🔁 The fix puts the rail back on the **same animation path** as the conversation column (`transition: right`, same variable / duration / easing): same-path animations cannot split by definition — both surfaces advance in the same style→layout pass every frame, so a busy frame slows **both** together and they never separate. v1.2.3's other two optimizations are preserved (overlay card lazy rendering, no persistent `will-change`); the rail subtree is already cheap enough that per-frame reflow cost is negligible.
- 📐 Measured (playwright + local Edge, heavy session, widget rail open + panel toggle): rail↔conversation right-edge per-frame offset **std = 0 (perfect lockstep)**; dropped frames 0%; left-edge drift 0; steps more uniform (largest single-frame step 220px→71px — that 220px jump in v1.2.3 was the telltale sign of the two paths splitting).
- ✔️ Verified via `../harness-ui-enhancer/scripts/verify-glide.cjs` (lockstep / drops / left-edge / scroll convergence).

### v1.2.3
**Perf — right-panel open/close animation jank fix (coordinated with dsh-better-sidebar / dsh-ui-harmonizer):**

- 🧊 rail and magnify-overlay shift changed from `right` property animation to **compositor transform glide** (`translateX(calc(var(--dsh-sidebar-width) * -1))`, `right:0`): when better-sidebar's panel opens/closes the entire rail subtree translates on the compositor — cards and heatmap incur zero per-frame reflow; the old `transition: right` reflowed the whole rail subtree every animation frame, stacking with the conversation column's margin animation to produce frame drops proportional to conversation DOM size, plus visual desync.
- 🗑️ Removed persistent `will-change: top,width,height` from card slots: previously two deck sets (static + magnify overlay) × N cards all held individual compositing layers, inflating GPU memory and per-frame compositing cost; short tweens are auto-promoted by the browser.
- ✂️ Magnify-overlay card body now renders **only while actually magnifying** (slot div stays mounted for seamless geometry tween): at rest the rail's resident DOM is halved (heavy widgets like heatmaps no longer rendered twice).
- 🔗 Shares the same variable / duration / easing as dsh-better-sidebar and dsh-ui-harmonizer (`--dsh-sidebar-width` + `--ds-transition-duration-slow` + `--ds-ease-in-out`); dragging (`body[data-dsh-sidebar-dragging]`) still tracks instantly; `prefers-reduced-motion` disables transitions.

**Dropped-frame comparison (playwright + local Edge, better-sidebar right-panel open/close window):**

| Scenario | Before | After |
| --- | --- | --- |
| Heavy-session animation dropped-frame rate (frame interval >26ms) | 20–31% | ≈ 0–1.4% (rail open / closed / animation disabled — no meaningful difference, i.e. noise) |
| Main-thread long tasks | up to several per animation, 60–210ms each | 0 |
| Widget rail open vs closed delta | noticeable (jank when open) | none (open = zero extra cost) |
| Glide path | `right` / `margin` per-frame layout (full-tree reflow) | transform compositor glide |
| Persistent compositing layers | every card × two deck sets permanently held | 0 (tween auto-promoted, released on completion) |

→ The widget rail added no more frames dropped: with the rail always open, toggling the right panel is just as smooth as with the rail closed (typical sessions 60 fps throughout). Heavy sessions (thousands of DOM nodes) still show ~10% frame drops from the conversation-column width transition — this is unrelated to the widgets (present even with the rail closed) and belongs to the UI coordination layer; listed on the Roadmap.

- ✔️ Self-contained verification: `scripts/verify-sidebar-anim.cjs` (playwright-core + local Edge, connected to 3080): rail `transition-property=transform`; after panel open, rail right edge = viewport width − panel width; ablation test — disabling rail / conversation-column animation drops 1.4% / 0.6%, confirming the rail contribution is zero.

**New — multi-key usage linkage (pairs with dsh-multikey-pool):**

- 🔑 New host endpoint `/api/opencode-usage-multi`: parses all pool keys (`OPENCODE_GO_API_KEY` primary + `OPENCODE_GO_POOL_2..9` backups), pulls per-key usage, and computes a "pooled total" (rolling / weekly / monthly windows averaged by available-key ratio; status and reset follow the most-used key).
- 🔄 Usage rings / usage bars / rolling usage / weekly usage / monthly usage widgets support **single-click card cycling**: total key → key 1 → key 2 → … → total key; the current view renders as a legend right under the heading ("All keys", "Key 1", "Key 2", …), and the selection is persisted to `cardConfigs.<instance>.poolView` — survives refresh and cross-browser.
- 🍩 Press spring animation: clicking a clickable widget gives a momentary `scale(0.93)` ease-in, then springs back on a bounce curve (`cubic-bezier(0.34,1.56,0.64,1)`), matching the native button feel; `prefers-reduced-motion` is respected.
- 🎯 Click syncs to real usage: switching to key N sends a prefer request to the multi-key pool to make that key primary (`/api/multikey`); switching back to "All keys" clears the preference — what you see is what you use.
- 🧩 Single-key environments degrade automatically: when the pool holds only the primary key the widgets display primary-key data normally with no switching UI.

**New — full Chinese / English locale adaptation (follows Settings → Language, instant, no reload):**

- 🌐 Hooks into the official `locale` service (`ctx.get('locale')`): all user-facing strings are now dictionary-driven — Settings pages (component settings / component market / component configuration), the right-hand widget rail (card titles / values / legends / corner buttons / add button / aria), market cards, configSchema forms, peak-pricing window, task / context / quote cards, OpenCode usage (all-keys / per-key / reset) and more; when the `locale` service is absent, a built-in zh/en dictionary is used automatically (detection matches the official pipeline: `localStorage('dsh-language')` → `<html lang>` → `navigator.language` fallback).
- 🔑 Fix: `installLocale` now **registers** the zh/en dictionaries with the official `locale` service (`register(ns, locale, dict)`) before `bind` — previously only `bind` was called, so the UI showed raw key strings (e.g. `ui.capsule`, `card.contextWater.system`); after registration the active locale selects the correct translation with no raw keys.
- ♻️ The persistent UI (widget rail, header capsule) subscribes to `locale/change` and re-renders immediately; the Settings page nav label "Components" becomes a **label thunk** (`SlotLabel` contract) that updates when the language changes, with no re-registration needed.
- 📖 Every widget's name / description / badge / preview-toggle labels support both Chinese and English; `WIDGETS` name/desc/badgeLabel/simToggle/configSchema are thunks resolved at render time.
- 🧩 Zero hard dependency: if the `locale` service is not installed the built-in dictionaries apply, matching prior behavior.
- ✔️ Self-contained verification `docs/verify-i18n.mjs` (runs under Node `--experimental-strip-types`): bilingual switching, no raw keys, unload fallback all green.

### v1.2.2
**New — peak-pricing (market widget):**

- ⏱️ New market widget peak-pricing (2×2 only): shows whether right now is inside a DeepSeek V4 peak-pricing window. Hard-coded to Beijing time (Mon–Fri **09:00–12:00** & **14:00–18:00**, the UTC 01:00–04:00 / 06:00–10:00 windows); a custom-schedule setting is on the roadmap.
- 💰 Bottom-left big label mirrors the cache/tokens card (same font, size, position): red **EXPENSIVE** inside a peak window, **CHEAP** otherwise.
- 🟥 During a peak window the whole card glows with a gentle breathing red inner glow (scheme B — bleeds in from the edges, centre stays readable, never a solid fill; 2.2s, modest swing, pure urgency, no click bait); `prefers-reduced-motion` users get the static steady glow.
- 🔵 The two window rows under the title reuse the token-bar legend font: the live row lights up brand-blue and scales up slightly (10px→12px, 500→600), the other stays faint.
- ⏲️ A 30s always-on tick rebuilds stats even with no turn running, so a peak/off-peak flip at a window boundary lands promptly (the previous 1s tick only existed while a turn was running).

**New — OpenCode usage rings widget:**

- 🍩 New market widget usage-rings (OpenCode Go group): one donut per window (rolling / weekly / monthly) side by side — the same data as the usage-bars bars chart, in circle form.
- ⭕ The ring centres stay clean (no in-ring text), so the rings can be drawn thick and full (5px stroke, maximised diameter); each percent sits directly under its ring in a larger weight, and the window name + exact value surface on hover via the title tooltip (same urgency colours as the bars chart: ≥95 red, ≥75 amber, else green). Ring-to-ring spacing equals the card inner padding (12px on a 2×2) — the rings tighten to keep the three-across footprint — and the number-to-ring gap is slightly wider than snug (4px) so the layout carries over cleanly to planned 2×1 wide cards.
- 🧭 The existing usage-bars bars widget is untouched — both presentations coexist and install independently.

**Changed — the OpenCode usage bars are now proportioned like a proper data-viz bar chart:**

- 📊 The usage-bars component's three bars no longer use a fixed ~12px width spread by `space-around`. Each bar's column now flexes to an equal share of the card width (the same elastic columns as the usage-bars daily token bars) with the same 4px gutter, and each bar fills ~60% of its column — ≈24px on a 2×2 card, proportionate to its 56px height (a full-width 100% version read as fat blocks).
- 🟣 Bars are fully rounded (5px corners) — without a baseline track underneath, square bottoms read as overly sharp.
- 📏 No value labels on the bars (small-chart convention — labels on a 3-bar mini chart read as chartjunk); the exact percent surfaces on hover via the native title tooltip, and faint dashed 25/50/75% reference lines behind the bars let each bar's height be eyeballed against a quarter scale at a glance.

**Improved — preview state toggling + dark-mode select arrow fix:**

- 🖱️ Stateful widgets (currently peak-pricing) now let you **click the preview card to flip its state** (peak/off-peak) in both the Component Settings and Component Market previews — no need to wait for the real window to review the EXPENSIVE red glow and the CHEAP look; a "Click to flip: Peak / Off-peak" hint shows under the card. Declared per-widget via the `simToggle` descriptor, so future stateful widgets just add one line.
- 🔽 Fixed `.dsx-select` chevron not rendering/not following the dark theme: `fill='currentColor'` in a background-image data-URI SVG draws nothing (SVG-as-background-image resolves in an isolated image context), so the arrow now uses explicit fills — mid-grey in light mode, near-white under `body[data-ds-dark-theme]`.

**Fixed — filled action buttons are readable in dark mode again:**

- 🌗 Filled primary buttons (`dsx-btn-primary` — Added / Add / View Details), the pressed state of the Components stats capsule, and widget-card action buttons (primary/danger kinds) painted `var(--dsw-alias-brand-primary)` behind hard-coded white text. In dark mode the brand token renders near-white, so the label merged into the fill and became invisible. Primary now fills with `var(--dsw-alias-state-business-primary)` and danger with `var(--dsw-alias-state-error-primary)` — the same token pair the official UI uses for filled action buttons — so the white label stays legible in both light and dark themes.

**Fixed — the add-panel height no longer collapses when dsh-better-sidebar's right panel is open:**

- 📐 The temporary add panel's `bottom` offset tracked `--dsh-sidebar-width` — the better-sidebar *width* variable that pushes `#root` aside when the right panel is open. With the right sidebar open (e.g. 320px) the bottom lifted by that whole width while `top` stayed fixed, halving the visible panel; it reproduced regardless of open order. It now anchors to the input-box breathing gap (`--dsx-input-bottom`), the intent the rail-measure comment always stated — the right offset still follows the sidebar, the vertical one never does. Headless-verified: panel height is identical with the sidebar off / 320px / 480px, vs the old rule dropping 886→566px at 320px.

**Fixed — 2×4 tiles are correctly masked in a 1-column layout:**

- 🧱 In 1-column mode a 2×4 tile (two cells wide) has nowhere to sit. The rail now hides installed 2×4 instances (temporarily — switching back to 2/4 columns restores them as-is), and the market says so: the 2×4 entry's title is struck through with a yellow "Unavailable" capsule beside it and its add button disabled. The `right` offset still follows the sidebar width; only height no longer does.
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
- 🌐 Heatmap day attribution now honors a configurable timezone (**accounting timezone** in the heatmap card config), defaulting to Beijing UTC+8 (the day rolls at 08:00 UTC). Options: Beijing (UTC+8) / System / UTC. Previously attribution followed the browser clock, so the day boundary shifted whenever the system timezone was not UTC+8.
- 🧹 One-shot cleanup drops an already-polluted today value so the live collector rebuilds it cleanly.
- 📊 Token-usage bar chart now normalizes bar heights to the **max within the shown 7-day window** (rolling and weekly) instead of the whole history: the tallest bar of the week always reaches full height and the rest scale proportionally, so the chart stays full even when an older day (e.g. the 1.2G outlier) would otherwise flatten the window.

### v1.1.6
**Fixed — card-anchored magnification, wave-following add button, smooth enter/exit:**

- **Card-anchored trigger (all modes).** The wave engages only when the pointer actually hits a card; crossing the gaps keeps it engaged AND the peak keeps gliding with the pointer (discrete mode: snapped to the quantized grid, so it still moves while you cross a gap; realtime: follows the pointer every frame). Only leaving the rail disarms it.
- **Add button rides the wave, position included.** Its placement is recomputed from the focused (scaled) rows, so when the cards above grow taller the button moves down with the magnified deck bottom / last-row gap, and its size follows the same bell curve at that position (previously only its size scaled, pinned to the resting grid).
- **Right edge stays aligned; gaps stay exact.** Overlay card positions (`top`/`right`) are INSTANT and, in the realtime FOLLOW phase, the size transition is disabled entirely — every frame lands directly on the steady-state right-anchored geometry, so fast pointer movement never lingers in a non-steady intermediate pose (the historic cause of a drifting right edge AND uneven inter-card gaps). The enter/exit phases (and the discrete style's grid gliding, which changes targets at grid frequency) keep a 0.15 s width/height tween for smooth grow/shrink.
- **Smooth enter/exit.** The overlay is always mounted (hidden by opacity), so entering/leaving magnifies via the CSS size tween instead of popping in at the target size — no flicker; exiting shrinks back to the resting size the same way.
- 🧪 Headless-verified (playwright, both modes): visibility flips only on card hit / gap-cross / rail-leave as specified; overlay rightmost == static rightmost (diff 0); gap movement keeps the wave changing; the add button sits below the resting position (702 → 753 px) and grows to 166 px under the wave; control console clean.
- 🧰 **Market/config rework — add-only, no install/uninstall zone.** Every widget ships bundled, so the market no longer has "download/uninstall": opening a group lets you pick the concrete widget, choose its size with left/right arrows (no dropdown — e.g. the Coding-Plan heatmap/bars flip 2×2 ↔ 2×4 that way), and hit **Add** to append `widget@size` straight into the rail (already-added instances show a disabled Added). The config tab lost the "Uninstalled (click to restore)" zone: removing a row deletes the instance entirely (installed + order + its config). Market groups are **Built-in** (all built-ins), OpenCode Go (rolling/weekly/monthly quota), Coding Plan usage (heatmap + bars) and **Misc** (quote of the day, to be re-classified later).
- 🧩 **Market cards** show the group name (bold) + widget count (capsule badge) on one line, a single description line, then actions — no id line.
- 🧮 **Every size is its own market instance.** Multi-size widgets (heatmap 2×2 / 2×4, context-waterline 2×2 / 2×4, …) appear as independent selectable entries — first the 2×2, then the 2×4 — instead of a size switcher; the count badge counts instances, not widgets.
- 🎨 **Preview now matches the real render.** The preview stats build the heatmap through the same `buildRollingGrid` path the live collector uses (7 week-rows × 13 day-columns — the old preview built it transposed, swapping width and height), so the 2×2 preview is a square card again, and the quote preview shows sample content (never persisted) so it isn't blank. All previews are fed concrete values (never blank).
- 📐 **2×4 previews scale to fit.** Wide cards preview at `scale(0.85)` centred in a fixed-width stage, so the right-edge buttons stay visible and the prev/next arrows never shift.
- 🗂️ **Config preview uses free space.** The selected widget's preview fills the remaining panel height below a top-LEFT title (extra room becomes vertical padding), and the preview size control is a dropdown beside the title — same `dsx-select` format as the Window alignment field.
- 🙈 **Stats-line switch hides text only.** Enabling it keeps the official bar's space and layout untouched and makes just its labels transparent — matching manual "hide the text" setups; off shows the bar normally.
- 📊 **Usage bars align per week.** The usage-bars window option is now Rolling (last 7 days) / **Weekly aligned** (Sunday-aligned current week), instead of the misplaced quarter mode.
- ✅ **Tasks never vanish.** Without a todos projection the task card shows **No tasks · 0 in progress · 0 pending** instead of disappearing.
- ✂️ Removed the divider line above the Custom section (per-card schema) block in the config preview.
- 🔧 **Capsule button styling restored.** The CSS file carried a UTF-8 BOM that leaked into the first rule's selector at build time (a junk prefix before `.dsx-stats-capsule{…}`), silently killing the Components capsule's base style (border-radius, padding, background, height). Rewrote the file as BOM-free UTF-8; verified the capsule computes `border-radius:14px / height:28px / background / padding / 1px border` again.
- 📐 **4-column add button no longer overlaps cards.** Row-band packing leaves the last row's gap at the LEFT edge (right-anchored), but the add button was anchored off the LAST item — on a left-packed 4-column row that dropped the button into the row's own cards. Placement now anchors the row's LEFTMOST card and falls back below the deck when the leftover gap is narrower than the button. The fit decision uses the STATIC widths, so hovering (which widens that row's cards) never flips the button to the deck bottom-right — it stays in its gap slot, gliding with the row.
- 🏠 **Fresh installs pre-load only the stats-line family** (turns · LLM/tool time · TTFT · rate · cache · tokens — mirroring the official composer stats bar); everything else is a market add. Existing users' arrangements are untouched by design.
- 🙈 **New personal-preference switch** in Component Settings: "Hide the stats line below input box" hides the official composer stats bar under the input box (the rail shows the same data). Default OFF so other users keep their bar.
- 💬 **Quote card renders nothing without a custom text** (no default filler that used to rotate on every render), and it lives in its own Misc group for now.
- ⚠️ The "limit reached" warning is now a floating centered pill that never consumes layout height.
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
- Bar chart axis labels are now short month.day dates (e.g. `8.28`) instead of weekday chars; bars are ~1.5× wider with a fuller corner radius; the legend is two plain figures (today / 7-day total, no "today / 7-day total" words); only the first and last date labels are drawn on the bottom corners (no x-axis baseline). The widget is now named **usage-bars** (was "7-day bars").
- Heatmap legend drops the "today" prefix (two figures: today / window total), and the chart's bottom-left/right corners show the window's earliest date and today's date.
- The 2×4 heatmap grid is wider (30 weeks) and horizontally centred; its figures move to the title row's right end.
- The 2×4 **token heatmap** and **context waterline** charts are now bottom-aligned (a title-row headRight figure no longer forces top alignment).
- The rail's top padding grows 2px → 4px so the first card keeps clear of the enhancer rounded-card's top shadow; the magnify overlay mirrors it. No header rules live here anymore — the header's opaque rectangle (masking the rail's top) is harness-ui-enhancer's job.

### v1.0.0
**New**
- Settings → Components: add a "Realtime follow (continuous)" switch exposing the real-time continuous magnification mode (peak follows the pointer every animation frame).
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

The widget system is now built for scale: each widget is an independent, contract-driven unit under `src/widgets/` with build-time discovery — a new widget is a new unit dir, no shared file edits (guide: `src/widgets-template/README.md`).

- **Agent-produced widgets**: the machine-readable contract (`manifest.json` + `defineWidget` descriptor + template + shared API) is exactly what a worker agent needs to create a widget end-to-end; the parallel-creation test in v1.3.0 demonstrated two agents adding widgets concurrently with zero file conflicts;
- **More hardware metrics**: CPU temperature via an optional LibreHardwareMonitor bridge (external dependency, opt-in — deliberately not bundled), AMD/Intel GPU support beyond NVIDIA, per-interface network traffic;
- **Heatmap range/period controls**: let the 2×4 heatmap and bars pick custom ranges (weekly/monthly/etc.) beyond the current half-year / 7-day defaults;
- **Multi-platform usage widgets**: Z.ai, DeepSeek balance, etc., reusing the host same-origin proxy + credentials pattern;
- **Custom peak-pricing schedules**: expose window customization for the peak-pricing widget (currently hard-coded Beijing weekdays 09:00–12:00 / 14:00–18:00) — custom start/end times, weekday sets, and timezone;
- **Utility widgets**: one-click compact (needs DSH official compaction) and more;
- **External integrations**: Feishu / WeChat push & interaction, keys strictly via DSH credentials;
- **Widget marketplace**: open a third-party widget registration mechanism so community widgets can join like plugins — the unit + discovery architecture (v1.3.0) is the carrier; a future `widgets-market` bundle can drop units into `src/widgets/` the same way;
- **More locales**: the dictionary layer now has zh/en for every key — adding `ja`/`ko` etc. is a pure dictionary extension;
- **Cross-device sync** (optional): today each DSH service keeps its own `dsh-widgets-state.json` — a cloud/account sync layer could share one configuration across machines, but local-first independence is the deliberate default.

## License

[MIT](LICENSE)
