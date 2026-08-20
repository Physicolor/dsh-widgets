<p align="right"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

<h1 align="center">Harness Widgets</h1>

<p align="center">
  <strong>A beautiful, extensible right-side widget system for DeepSeek Harness.</strong><br>
  Multi-column grids · 2×4 tiles · continuous magnification · built-in component marketplace
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/harness-widgets?style=flat&label=latest%20release&color=4D6BFE" alt="Latest release">
  <img src="https://img.shields.io/npm/dt/harness-widgets?style=flat&label=total%20downloads&color=4D6BFE" alt="Total downloads">
  <a href="https://github.com/Physicolor/harness-widgets/stargazers"><img src="https://img.shields.io/github/stars/Physicolor/harness-widgets?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License">
  <img src="https://img.shields.io/badge/DSH%200.1.x-4493F8?style=flat-square" alt="Supported: DeepSeek Harness 0.1.x">
</p>

<p align="center">
  <img src="docs/screenshots/cover.jpeg" alt="Harness Widgets preview" width="100%">
</p>

Harness Widgets is a **persistent DSH bundle plugin** built on the Cordis composition model. It provides a customizable multi-column widget rail on the right side of the conversation page — real-time session insights, usage monitoring, and quick actions — with an extensible declarative registry.

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

macOS-Dock-style hover magnification, upgraded from discrete steps to **continuous exponential decay**: as the pointer moves in the X/Y plane the wave peak follows smoothly, all surrounding widgets (above and below) participate, spacing stays constant, and nothing overflows the right edge. Magnification is adjustable in settings (`1.0–1.4`).

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
| Usage heatmap | GitHub-style calendar heatmap, self-tracked daily usage |
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
- **Host half**: `webServer` + `credentials` services; registers the `/api/opencode-usage` same-origin proxy route;
- **Reversible cleanup**: all registrations are managed by the fiber-effect lifecycle; uninstalling restores everything;
- **Slot integration**: `shell.overlay` (panel), `conversation.session.header.utilities` (capsule toggle), `settings.section` (settings page).

## Installation

```sh
# via npm (plugin market)
dsh plugin --profile web add harness-widgets

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

- **Multi-platform usage widgets**: Z.ai, DeepSeek balance, etc., reusing the host same-origin proxy + credentials pattern;
- **Utility widgets**: one-click compact (needs DSH official compaction) and more;
- **External integrations**: Feishu / WeChat push & interaction, keys strictly via DSH credentials;
- **Widget marketplace**: open a third-party widget registration mechanism so community widgets can join like plugins.

## License

[MIT](LICENSE)
