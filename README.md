<p align="right"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

<p align="center">
  <img src="docs/icon/icon.svg" alt="dsh-widgets" width="104" height="104">
</p>

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
| Max columns | 1 / 2 / 3 / 4 (dropdown in settings, 2 by default). An UPPER BOUND: the deck steps down automatically when space runs short and never exceeds it when space is plentiful |
| Base card size | The MINIMUM card side (150px by default). The rail is a fluid grid: within a column count the cards share the available width evenly, in 10px tiers, up to the size at which **five card rows still fit the rail with the last row's bottom gap equal to the right gap** (150 → 160 at a 1578×1000 window) — anything beyond that goes back to the transcript |
| 2×4 tiles | Twice the width of a 2×2 plus a gap, same height; the same widget can be installed in both sizes at once |
| Gap-free packing | Widgets pack by best-fit; gaps left by 2×4 tiles are backfilled by later 2×2s, so drag-reorder never leaves holes. In a 3-column deck a 2×4 that would strand itself moves one slot earlier and the 2×2 it displaces moves one slot later (rounding), so a wide tile is never left hanging |
| Live width response | While the conversation width is dragged the available width is recomputed every frame and the cards change TIER the moment a boundary is crossed (the transcript inset is untweened for the drag's duration, so it tracks the conversation exactly); the column count steps at its thresholds. An all-2×4 deck skips the 3-column DEGRADATION step (2 ⇄ 4); an explicit 3-column preference is always honoured |
| Transition feel | Both a size-tier change and a column change glide with a slight REBOUND (a ~4% overshoot spring) into their new size/cell, plus a small settle wave staggered in packing order (about 1.6% amplitude, 30ms per card) — never one whole-block pulse. The rail's own width and the transcript inset run on the SAME spring, so container, cards and conversation move together instead of the box jumping ahead of the cards |
| Magnification | Works in multi-column grids too; magnified rows/columns yield by planar distance with constant spacing |
| Wheel = row detents | The wheel steps whole ROWS (every offset is a multiple of the row pitch = card side + gap), so the top row is never cut in half and one notch pulls the next row up to where the first one was; overflow at the bottom is expected (the default viewport shows five whole rows plus a sliver of the sixth). Scrolling always uses the browser's own smooth scrolling and behaves identically whether the pointer is on a card, in a gap, or on empty rail — never a per-notch hard jump |

### Continuous Magnification

macOS-Dock-style hover magnification with two modes (toggle in **Settings → Components → Realtime follow**):

- **Stepless (continuous follow)**: truly stepless — every card's scale is driven by its own continuous Euclidean distance to the pointer, so the peak glides smoothly between cards on any pointer movement. It snaps to its steady right-anchored geometry every frame (`transition: none`), so a card's right edge stays flush with the rail even mid-motion — no width/right desync while the pointer moves.
- **Discrete (default)**: reuses the same continuous geometry but snaps the pointer onto a quantized grid (row/column centres + the midpoints between adjacent ones: 2·rows−1 Y points, 2·cols−1 X points), with the same spring gliding the peak between grid points.

The wave's progress is **one spring, written every animation frame**: `displayed = 1 + (target − 1) · p`, where `target` is the live pointer geometry and `p` springs between rest (`0`) and engaged (`1`) on an Apple-parameterised curve (`response 200ms`, `bounce 0.1` — ≈250ms to settle, ~0.15% overshoot ≈0.4px). Both factors are continuous, so enter, follow and leave are one uninterrupted motion in both directions; a pointer that keeps moving only moves `target`, which can never retarget the curve (two earlier shapes — a plain CSS transition and a frozen target — both failed on exactly that, and both are gone). Releasing runs the same formula backwards, and `prefers-reduced-motion` writes `p` in a single frame.

In both modes the magnified deck is painted by a fixed overlay **outside** the rail's scroll-clip box, so leftward growth escapes clipping while the resting rail width (and the conversation column distance) never changes. Scaling preserves the square card shape and constant spacing; magnification is adjustable in settings (`1.0–1.4`).

Entering and leaving a card is **one continuous move**, not two decks cross-fading: at rest the overlay is pixel-identical to the real cards, so the hand-over happens when both agree exactly (invisible), and the following ~250ms writes every card's top/right/width/height together with its scale into the wave on that one spring — and back out on leave, returning to the resting geometry before the real deck takes over. The hovered card keeps its brand-blue outline inside the magnified layer.

Entering is a **compositing** cost, not a repaint one, and the fix is a permanent hint: the overlay's 15 slots (and the add button) carry `will-change: transform` at all times, so their layers exist before the pointer arrives — measured with the hint gated on the hover: the natural enter opened with a 63ms layer-promotion + raster frame, and with it permanent the same enter ran 16ms with zero dropped frames. An earlier "raster prewarm" (flipping the overlay visible for 64ms while the rail was idle) has been REMOVED: it almost never coincided with a real hover, and the stall came back on every enter without the permanent hint.

The rail and the magnify overlay are driven by **ONE shared pointer surface** (they are siblings by necessity — the overlay must escape the rail's scroll-clip box), and that surface is **geometrically continuous**: while the wave is live the layer itself is hit-capable and its hit box is widened leftwards by the maximum amount the cards overhang the rail (with the left padding compensated so the cards do not move). Cards, the gaps between them, and the strip a magnified card opens past the rail's left edge therefore all stay on the surface — otherwise a gap resolves to the conversation behind, which showed up as "hovering exactly in the gap cancels the wave" and "at the edge it keeps zooming in and out". A genuine leave still ends the wave (with a 6px tolerance so a pixel of jitter cannot flip it), and **the wheel over a magnified card still scrolls the rail** (intercepted as row-detent scrolling and stopped from reaching the conversation behind).

### Loading skeletons

While an external source (OpenCode usage / Command Code / system monitor) has not answered, a card no longer shows an empty or zeroed body: it paints the **silhouette of the body it is waiting for** — the title stays the widget's real name, and the placeholder blocks are rounded fills with a 1.5s sweep (static under `prefers-reduced-motion`). The shape is per widget, so a loading rail is still readable as the cards it is about to show: three rings draw three rounded squares, a bar chart or sparkline draws one large rounded rectangle, a heatmap one wide block, a figure row its short columns and the quota card its three stacked bars; text-only cards keep the figure pill plus body rows. When the data lands it replaces the blocks in place, with no size or position jump.

### Continuous corner curvature

Card corners are **superellipses** (`corner-shape: squircle`), not circular arcs: the curvature ramps in from the straight edges, which is what makes an iOS/Figma-style rounded rectangle read as soft rather than cut. It is native CSS, so the card's border and `box-shadow` follow the same outline (a `clip-path` squircle would slice both off); an engine without `corner-shape` degrades to a plain round corner with nothing else changed.

Both controls live in **Settings → Components → 组件设置**: the switch (default **ON**, so the two shapes can be compared) and the **corner gear** — the radius as a share of the card's SHORT side (`12 / 16 / 20 / 24 %`, default 16%). Percent rather than px, because the reference keeps the corner-to-side ratio: a 150px card and its magnified 190px copy must not get the same corner (`12%` reproduces the old fixed 16px at side 150). The gear drives the rail's resting and magnified cards, the market / 组件配置 previews and the loading skeletons alike.

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
| Trajectory | the official 轨迹 rail as a card: one colored bar per input / model / tool beat, rolling right through the newest 30 beats as the model keeps calling tools. **Lane width** is a per-card switch in the component config: `By duration` (default — each beat's width is proportional to how long it took, and an instantaneous input degenerates to a minimum-width tick) or `Equal width` (the fixed-slot window, whose slot freezes at 30 beats and stops re-scaling as the window rolls) |
| Quote of the day | random motivational quote; text/alignment/wrapping customizable |

### Quota Manager (Coding Plan group, 2×2)

The blue title sits on top, the **big figure (the projected month-end percent) on the row under it**, and the grey `账期 10-10` line to the **right** of that figure, **bottom-aligned with it**; two figures stand at the bottom: **today's usage** (measured tokens) and **today's budget** (the remaining balance split evenly over the days left). That head shape is the same one 上下文已用 uses, with a standard 4 px gap between the title and the figure (at side 150). **The head no longer prints the pool view name**: tapping the card still cycles `AllUser → <account> …` (the figures move with it), there is just no label line for it any more.

- **Scope (this plan only)**: today's usage and today's budget are computed from the daily log folded to the Command Code provider route (`commandcode`) — the same route its credits and billing period come from (`/api/widgets-usage-daily?provider=commandcode`). Another provider running on the same machine that day (e.g. OpenCode Go) is **not** counted; charging them to this plan's allowance is what made the card read 758M for a day this route served 474M of (measured 2026-09-20). When that scoped map is unavailable the two figures print `—` rather than falling back to the mixed caliber.
- **Projection**: `used% + recent pace × days left`, where the recent pace is the last **3 day-equivalents** (the previous two whole days plus today prorated by how much of it has elapsed). The projection and the budget are therefore **mathematically consistent**: projected > 100% ⇔ recent pace > today's budget — the card can never claim "today is under budget" and "the month is over 100%" at once.
- **Past 100%**: the figure itself turns red and breathes (1.6 s), instead of a red glow around the card.
- **Credit → token conversion**: the balance (credits) is converted at the period's own realised "local tokens ÷ credits consumed" rate, so the figures share one caliber; the provider's own token counter is not mixed in (it measures the same period ~1.7× higher). A **pool member added today has no rate of its own** — its budget borrows the pool's realised rate (remaining credits ÷ days left still holds), while its pace stays its own zero: the daily log belongs to the machine, not to an account that has served nothing.
- **It never prints 数据不足 — whatever is missing is filled**: no payload yet → `-%` with the 账期 line when one is known, and `—` for the two figures; a period too young to project (a member added today) → its real consumed percent (`0.0%`), its real budget and 0 tokens; a member that has never been used → zeros everywhere except the budget. Only a stale payload (a period that already ended) shows nothing, because it no longer describes anything spendable.

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
| Usage | the token total as the big figure (`4.9M tokens`), with 请求 / 成功率 / 消费 as a figures row on the card floor |
| Credits | the balance as the big figure (`69.16 credits`) over the official site's three quota rows — 5 小时 / 周 / 月, each a window name with its percent hard right above a 24-cell segmented bar |
| Windows | 5h / weekly / monthly usage rings |
| Subscription | the plan **tier badge** (GOAT / PRO / MAX / ULTRA / PROVIDER / GO / TEAMS PRO) with the billing period line above it; a preview click walks the whole ladder |
| 5h window · Weekly window · Monthly window | single-window number cards (one decimal + the reset date) |

All four upstream endpoints are fetched independently with an 8 s timeout, so one failing slice renders `—` instead of taking the card down; missing values are never invented. The monthly window is measured against the plan's published allowance (`used = allowance − remaining`; GOAT = $70 per billing period) because the provider publishes no monthly window object at all.

**No redundant role words.** A card whose figure carries its own unit (`4.9M tokens`, `69.16 credits`) or its own name (the tier badge) drops the grey role word entirely — the line is reserved for the pool view once there is a pool to switch. The 套餐 card's grey line is the billing period instead.

The **Subscription** card prints the plan as the tier badge the official plan map uses (`individual-goat` → `GOAT`, `individual-pro-v1` → `PRO`, … resolved by longest prefix exactly like the provider does), never the raw id — the old `individual-goa…` overflowed the tile. Its grey line is the billing period, and the badge is the big figure on the card's floor. The component market's preview click walks the whole ladder, so every badge can be eyeballed without owning that plan.

**The preview stage is the tile.** Market and 组件配置 previews render the card inside a pinned unit square (`pinBox`), so what you see is what the rail seats: an over-tall card is clipped by the card's own `overflow: hidden` instead of stretching the stage into a non-square rounded rectangle (the credits card measured 200×250 before its redesign).

#### Pooled accounts — tap a card to switch

The Command Code provider's **Account rotation** card can put several subscriptions behind one install (`COMMANDCODE_API_KEY`, `COMMANDCODE_API_KEY_2` … `_4`). The host route reads **every** configured one, each with its own four endpoints, and returns them as `keys`, labelled with the account name read from that key's own `/alpha/whoami`:

- **Tap any Command Code card to cycle** `AllUser → Physicolor → Sparxie → AllUser`. The view is persisted per card instance (`cardConfigs.ccView`), so the choice survives a reload — and it is deliberately a different field from the OpenCode pool's `poolView`, so the two families never share a view;
- **`AllUser` is the pool's total**, summed field by field: a window's percent is `sum(used) / sum(cap)` (a mean of percents would call one exhausted pool beside an untouched pool "50% used"), the monthly window sums each member's own month — each measured against **its own** plan, so a two-GOAT pool is 2 × $70 — and the account card shows the generic `AllUser` label with the member names beneath it. `AllUser` is deliberately the same literal in both languages;
- **The legend line carries the current view** (`账户 · AllUser`, `窗口 · Physicolor`) beside the card's role word, and the hover tooltip spells out the whole chain;
- **One key configured → no switcher at all**: the cards render exactly as they did before, with the bare role word and the account name in the body. Two pools resolving to the same account name are disambiguated with the key's masked tail.

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
- **Space contract**: the rail never claims a fixed width. Its budget is `official conversation column width − official transcript measure − 74px box inset`, read from the product's own variables with a geometric fallback, and inside that budget it behaves as a fluid grid (the semantics of `repeat(auto-fill, minmax(base, 1fr))`: the column count auto-fills against the base size up to the user's cap, and the card side is that column count's even share, quantised onto 10px tiers and clamped between the automatic floor and the "five rows fit" ceiling), so the transcript always keeps the product's measure; only when even a single column no longer fits does the rail yield; see [CHANGELOG.md](CHANGELOG.md) for the measurements.

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

### Latest — v1.7.0

**Every Command Code account on one card, switched with a tap.** The provider's Account-rotation card can put several subscriptions behind one install (`COMMANDCODE_API_KEY`, `_2 … _4`); the host route now reads **every** configured one, each with its own four endpoints, and returns them as `keys` labelled with that key's own account name. Any Command Code card (plus 额度管理) cycles `AllUser → <account> …` on a tap — `AllUser` is the pool's total summed field by field (a window is `Σused / Σcap`; the month sums each member's own month against **its own** plan), and one configured key means no switcher at all. Verified against the live accounts by `docs/probe-cc-pool.mjs` (88 assertions).

**The magnification wave is a spring now.** Its enter/leave progress is an explicit factor written every frame (`displayed = 1 + (target − 1) · p`, Apple-parameterised: ≈250ms to settle, 0.15% overshoot), so a moving pointer can no longer retarget it — both structural failures that made the enter read as disconnected and the hand-over as a jump are gone, and the overlay's layers are promoted permanently instead of on the hover frame (`docs/verify-rail-morph.cjs`).

**Loading skeletons wear the card's own silhouette** — three rings, one plot block, a figure row, stacked quota bars, or a one-line text card (`docs/verify-skeleton-shapes.cjs`, 19/19 live) — the Settings 组件 cell carries the app's own glyph instead of the generic gear (`docs/verify-nav-glyph.cjs`), and card corners are **superellipses** (`corner-shape: squircle`, ON by default, radius as a share of the short side) all the way to the rail (`docs/verify-corner-shape.cjs`).

**Also in this release:** the 套餐 card's tier badge and plan-ladder preview, the 用量 / 额度 rebuild (figures row on the floor, the official segmented quota rows), 额度管理's scope fix (the Command Code route alone) and its per-plan monthly window, and the sparkline's null-run fix (a missed `nvidia-smi` sample no longer draws a break).

> Known cost, documented in the changelog: with the rail open at ≤1600px the transcript scroller drops below the product's `900px` container query, so DSH hides its own turn navigator.

## Roadmap

The widget system is now built for scale: each widget is an independent, contract-driven unit under `src/widgets/` with build-time discovery — a new widget is a new unit dir, no shared file edits (guide: `src/widgets-template/README.md`).

- **Heatmap token accounting follow-up**: the card's total already equals dsh-usage-center's (the host route reuses its `getActivity()`). Making it exact when usage-center is *not* installed would mean folding the same session logs inside this host — deliberately not duplicated today, to keep one caliber maintained in one place;
- **Command Code monthly window, pending an upstream field**: the month is derived locally as `used = plan allowance − remaining monthly credits` (allowance from the published plan table) because `billing/credits` returns no monthly window object. If upstream later adds `monthly` (with used / cap / resetAt) to `windowLimits`, `monthlyWindow()` should read it directly and keep the derivation only as a fallback;
- **Command Code pool discovery by naming convention**: the host reads `COMMANDCODE_API_KEY` plus the `_2 … _4` spares that the provider's Account-rotation card writes. A key stored under an unrelated ref name would need that ref added to `COMMANDCODE_POOL_ENVS` (the credentials service exposes `resolve(ref)` only — there is no "list the refs" seam to enumerate them);
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
