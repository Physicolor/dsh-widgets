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

A self-contained showcase site lives in [`website/`](website/) and is live at **https://physicolor.github.io/dsh-widgets/** — what dsh-widgets is, why it exists, all 33 real widgets, the **DSH Widget Design Grammar** (the real unit/spacing/magnification formulas from `src/client/index.ts`, with an interactive rail running the actual magnification + right-anchored reflow), **Widget Anatomy** (a real card at ×2 with every padding, gap and inset measured from the DOM), the **DSH Visual Audit** (13 declared rules scored over all 33 widgets from live `getBoundingClientRect` measurements — rule-based, not a model), the widget-unit architecture, the production workflow, and a requirement-form → widget-spec generator. Plain HTML/CSS/JS, no build step, all paths relative for the project Pages base path. `node website/verify.mjs` self-verifies (static + SEO + Edge-headless browser checks, 80 checks); the widget table, the static gallery markup and the JSON-LD `ItemList` are generated from the manifests by `node website/gen-site.mjs` (`--check` fails on drift); `node website/gen-og.mjs` regenerates the social card. Deploy: see `website/README.md`.

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

### Quota Manager (Coding Plan group, 2×2)

Title on the left with the **projected month-end usage percent in the top-right corner**, the billing period on the next line (`账期 10-10`), and two figures at the bottom: **today's usage** (measured tokens) and **today's budget** (the remaining balance split evenly over the days left).

- **Projection**: `used% + recent pace × days left`, where the recent pace is the last **3 day-equivalents** (the previous two whole days plus today prorated by how much of it has elapsed; today only counts after 6 h). The projection and the budget are therefore **mathematically consistent**: projected > 100% ⇔ recent pace > today's budget — the card can never claim "today is under budget" and "the month is over 100%" at once.
- **Past 100%**: the figure itself turns red and breathes (1.6 s), instead of a red glow around the card.
- **Credit → token conversion**: the balance (credits) is converted at the period's own realised "local tokens ÷ credits consumed" rate, so the figures share one caliber; the provider's own token counter is not mixed in (it measures the same period ~1.7× higher).
- **Never invented**: a missing percentage/allowance, a finished period or less than 6 h elapsed renders 「数据不足」; only when the rate side is unavailable does today's budget degrade to `—`.

### Component Marketplace

- Browse all widgets (system + external), search, size-switch preview, install per `widget@size`;
- The installed list supports drag-reorder, config editing, and one-click `2×2 ↔ 2×4` (auto-dedup — one instance per widget/size);
- The widget-config tab supports per-card customization (quote of the day, heatmap window alignment, etc.).

### OpenCode Go Usage

Rolling / weekly / monthly usage windows + percentage + reset time. The host half registers a same-origin route proxying `opencode.ai`; the browser makes no cross-origin requests, and keys go through DSH credentials. Two presentations: **usage-bars** (three-window bars) and **usage-rings** (three-window donut rings — percent in each ring centre, exact value on hover, same urgency colouring).

### Command Code Account Widgets

Eight 2×2 widgets reading the Command Code account through the host route `/api/commandcode-usage` — credentials come from `credentials.resolve('COMMANDCODE_API_KEY')` (process env → `$DSH_HOME/.credentials.yaml` → `.env`), so the key never reaches the browser and nothing is typed into a widget or a settings field:

| Widget | Detail |
| --- | --- |
| Account | username / e-mail / organization |
| Usage | request count, success rate, tokens, spend |
| Credits | credit balance (monthly / free / purchased) + the 5h and weekly usage bars |
| Windows | 5h / weekly / monthly usage rings |
| Subscription | plan id, status, period end, cancel-at-end |
| 5h window · Weekly window · Monthly window | single-window number cards (one decimal + the reset date) |

All four upstream endpoints are fetched independently with an 8 s timeout, so one failing slice renders `—` instead of taking the card down; missing values are never invented. The monthly window is derived by conservation (`used = monthly credits consumed`, `total = used + remaining`) because the provider publishes no monthly window object — the derivation is documented in the roadmap as an upstream dependency.

### Peak Pricing (market widget)

A 2×2-only peak-pricing card showing whether the current moment is inside a DeepSeek peak-pricing window. Peak hours (Beijing time, UTC+8): Mon–Fri **09:00–12:00** and **14:00–18:00** — everything else, including weekends, is off-peak. Off-peak shows **CHEAP**; during a peak window it shows **EXPENSIVE**, with the figure itself turning red and breathing (1.6 s) — a text-level escalation, the card frame stays clean — while the corresponding window row under the title lights up brand-blue and scales up slightly. The schedule is hard-coded for now; a custom-schedule setting is on the roadmap.

---

## Architecture

- **Widget units + build-time discovery (ARCH-001)**: every widget is an independent unit under [`src/widgets/<id>/`](src/widgets/) — `manifest.json` (machine-readable contract: id / group / sizes / defaultInstalled / per-widget locale) + `index.ts` (the `defineWidget` descriptor: render + name/desc thunks + configSchema + example). The registry is **generated**, never hand-maintained: [`scripts/gen-registry.mjs`](scripts/gen-registry.mjs) scans the unit dirs and emits `src/client/generated.registry.ts` (`WIDGETS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / merged `WIDGET_LOCALES`). Adding a widget = adding one unit dir; `pnpm build` regenerates and `pnpm check:registry` fails loudly when the registry is stale. The widget template lives in [`src/widgets-template/`](src/widgets-template/) — outside the scan root, so it can never be discovered or registered;
- **Shared layer (stable core)**: [`src/client/lib/`](src/client/lib/) — `contract.ts` (the Widget contract + resolvers), `format.ts` (pure formatters / heatmap grid builders), `usage-view.ts` (OpenCode usage family renders), `heatmap-accounting.ts` (token heatmap self-accounting provider). Widget units import these; widget-specific logic stays in the unit;
- **Per-widget i18n**: widget strings live in each unit's `manifest.json` (family-shared strings once in `src/widgets/_shared/locales.json`); the shell dictionary (`src/client/i18n.ts`) owns only the shell UI. The generated registry merges everything and the shell registers it with the official locale service at apply() time;
- **Data collector**: mounted on the `conversation.composer.dock` slot, which renders only when an active session exists — a natural "session alive" signal;
- **Host half**: `webServer` + `credentials` services; registers the `/api/opencode-usage` / `/api/opencode-usage-multi` same-origin proxy routes and the `/api/widgets-state` store (widget-rail configuration persisted to `profiles/web/dsh-widgets-state.json` — the authoritative copy that survives browser origin switches, private mode and site-data clearing);
- **Reversible cleanup**: all registrations are managed by the fiber-effect lifecycle; uninstalling restores everything;
- **Slot integration**: `conversation.input.overlay` (the rail drawer, the magnify overlay and the settings drawer — deliberately inside the conversation subtree, which paints *below* the official right panel so the panel can swallow the rail), `conversation.session.header.utilities` (the Components capsule, registered at `order: 5` so its place cannot tie with `dsh-better-sidebar`'s bottom-panel toggle), `conversation.composer.dock` (the collector), `settings.section` (the settings page);
- **Space contract**: the rail never claims a fixed width. Its budget is `official conversation column width − official transcript measure − 74px box inset`, read from the product's own variables with a geometric fallback, and it degrades (fewer columns → narrower column → yield) so the transcript always keeps the product's measure; see [CHANGELOG.md](CHANGELOG.md) for the measurements.

## Installation

```sh
# via npm (plugin market)
dsh plugin --profile web add dsh-widgets

# local development (link)
dsh plugin --profile web add link:D:/dsh-home/plugins/dsh-widgets
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

- `peerDependencies`: `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-ui-slots` (both provided by the DSH web profile; `@deepseek-ai/dsh-client-runtime` was retired in DSH 0.1.5);
- `cordis.patch.yml` inserts one `widgets` row; the host half and browser half are loaded by the loader and client-modules respectively.

## Compatibility

- DeepSeek Harness `0.1.0-rc.6` and compatible later `0.1.x`;
- Integrates via `conversation.input.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section`;
- Coordinates explicitly with `dsh-better-sidebar`'s right rail: the rail reads the official right-bar column (keeping `--dsh-sidebar-width` as a fallback for older better-sidebar builds) and its header capsule registers at `order: 5` so the two toggles cannot swap places on a bundle reload; no residue after uninstall.

## Releases

Every release, entry by entry — including the measurement behind each change — lives in **[`CHANGELOG.md`](CHANGELOG.md)** ([中文](CHANGELOG.zh-CN.md)); each version is also published as a [GitHub Release](https://github.com/Physicolor/dsh-widgets/releases) anchored to the commit that shipped it. Raw evidence (CDP probes, screenshots, JSON receipts, per-incident fix records) lives under [`docs/`](docs/). This README keeps only the current release at a glance.

### Latest — v1.6.0

**The rail derives its width from the product's own transcript measure.** Budget = conversation column width − transcript measure − 74px box inset, with a ladder (preferred layout → fewer columns → narrower single column → yield) instead of a fixed 372px claim. The transcript keeps the product's own measure at every viewport — 748px at 1578/1400/1280 and 664px at 1120, where the rail takes 372/198/154/0 — and the header capsule reads "no room" rather than opening empty.

**The right panel now swallows the rail.** The rail's host moved into the conversation subtree, i.e. below the panel's layer (verified with `elementFromPoint`), and pins to the viewport's right edge while a panel exists, so the panel's edge sweeps across the rail and uncovers it on the way back. The official layout package's "track and occupant share one curve" invariant is honored — the transcript inset uses the official 0.3s duration/easing tokens instead of `0.2s ease`.

**Native follow.** CSS anchor positioning (`anchor-name` on the conversation host) makes the rail ride the shell's own style→layout pass: measured per-frame `|column right − rail right| = 0.00px`. The `ResizeObserver` that had been observing **zero** elements (it was constructed before the shell mounted its frame) is now re-bound lazily and self-heals, and the rail predicts the track's final width from the AppFrame's `transitionrun`, so it no longer trails the panel by ~100ms.

**Hovering the rail costs nothing.** The magnification wave became its own component and scales through `transform` instead of width/height: p50 frame 12.5ms → 4.2ms, p95 41.8ms → 8.3ms, frames > 26ms 15 → 1, JS during 2.6s of hovering 598ms → 193ms.

**Fixed.** A new conversation could leave the rail painted over the hero (the bridge now runs on `useSyncExternalStore` plus an instant-hide class); the turn navigator lost its hover and click to the product's invisible 40px column-width drag band (the hit-test order is fixed, not the geometry); `heatmap-bars` first/last date labels wrapped in their ~14px column and pushed the bars out of the 150px card (`white-space: nowrap`); `context-water` 2×2 burst its 150px slot by 6px; the Components capsule changed place after a bundle reload (`order: 10` collided with `dsh-better-sidebar`).

**Website.** The showcase is now a design-system site — design principles bound to real widgets, the DSH Widget Design Grammar with an interactive rail running the plugin's own magnification curve, Widget Anatomy annotated from measured DOM rectangles, and a 13-rule visual audit scored over all 33 widgets — with real SEO (canonical, Open Graph, JSON-LD `ItemList`, sitemap) generated from the manifests by `website/gen-site.mjs`.

> Known cost, documented in the changelog: with the rail open at ≤1600px the transcript scroller drops below the product's `900px` container query, so DSH hides its own turn navigator.

## Roadmap

The widget system is now built for scale: each widget is an independent, contract-driven unit under `src/widgets/` with build-time discovery — a new widget is a new unit dir, no shared file edits (guide: `src/widgets-template/README.md`).

- **Heatmap token accounting follow-up**: the card's total already equals dsh-usage-center's (the host route reuses its `getActivity()`). Making it exact when usage-center is *not* installed would mean folding the same session logs inside this host — deliberately not duplicated today, to keep one caliber maintained in one place;
- **Command Code monthly window, pending an upstream field**: the month is currently derived by conservation (`used = monthly credits consumed`, `total = used + remaining`) because `billing/credits` returns no monthly window object. If upstream later adds `monthly` (with used / cap / resetAt) to `windowLimits`, `monthlyWindow()` should read it directly and keep the derivation only as a fallback;
- **Command Code multi-key / organization support**: only the primary `COMMANDCODE_API_KEY` credential is read today; an org dimension or multiple accounts could reuse the opencode-usage-multi pool pattern in the host (`COMMANDCODE_POOL_2..N`);
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
