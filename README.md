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
  <img src="docs/screenshots/cover.jpeg" alt="DeepSeek-Harness Widgets preview" width="100%">
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

Rolling / weekly / monthly usage windows + percentage + reset time. The host half registers a same-origin route proxying `opencode.ai`; the browser makes no cross-origin requests, and keys go through DSH credentials.

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

### v1.1.5
**Fixed — widget state now survives restarts (root cause: browser `localStorage` only):**

- Widget configuration (`installed` / `order` / per-card configs / sizes / panel and magnification settings) was kept **only** in each browser's `localStorage` — a per-origin, per-browser cache. It silently reset to defaults whenever the browser origin changed (`localhost:3080` vs `127.0.0.1:3080` are different localStorage realms), on private-mode or cleared-site-data sessions, or after a write silently failed (the old `saveState` swallowed errors) — and it **never followed to another device**, where the state is simply absent.
- ⚙️ The host half now registers `/api/widgets-state`: the rail state is persisted **atomically** (tmp + rename) to `profiles/web/dsh-widgets-state.json` under the profile data dir — one authoritative copy per DSH service, shared by every browser/address that reaches it.
- 🔄 On boot the client syncs with the host store: whichever side (localStorage vs host file) holds the newer `savedAt` wins, so any origin/browser converges to the last saved configuration instead of resetting; every change is written to both channels (localStorage immediately, host via a 400 ms debounced PUT).
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
- **Utility widgets**: one-click compact (needs DSH official compaction) and more;
- **External integrations**: Feishu / WeChat push & interaction, keys strictly via DSH credentials;
- **Widget marketplace**: open a third-party widget registration mechanism so community widgets can join like plugins;
- **Cross-device sync** (optional): today each DSH service keeps its own `dsh-widgets-state.json` — a cloud/account sync layer could share one configuration across machines, but local-first independence is the deliberate default.

## License

[MIT](LICENSE)
