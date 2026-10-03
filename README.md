---
description: "A live widget rail on the right: session, machine, quota and cost at a glance."
---

<p align="right"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

<p align="center">
  <img src="docs/icon/icon.svg" alt="dsh-widgets" width="104" height="104">
</p>

<h1 align="center">DeepSeek-Harness Widgets</h1>

<p align="center">
  <strong>55 live cards on the right side of your DeepSeek Harness — session, machine, quota and cost at a glance.</strong><br>
  Multi-column grids · 2×4 tiles · a continuous magnification wave · per-instance configuration
</p>

## Install in one command

```sh
dsh plugin --profile <your-profile> add dsh-widgets
# then restart dsh web and hard-refresh the browser (Ctrl+Shift+R)
```

Works on DeepSeek Harness `0.1.0-rc.6+` (0.1.x) and `0.2.0-rc.1+` (0.2.x). The rail lives
behind the **Widgets** icon in the session header; Settings → **Widgets** installs,
reorders and resizes the cards.

## What you get

- **The session, live** — turns · steps, context level and compaction, tokens and cache hit rate, LLM time, first-token latency, tool calls, background jobs and subagents;
- **Money and quota** — OpenCode Go's rolling / weekly / monthly windows; Command Code's 5-hour / weekly / monthly limits with one tap to cycle the whole key pool, its credit balances, a month-end projection and today's budget;
- **The machine** — CPU / GPU / memory / disk / network / power, with sparklines, rings and a local-service plus proxy-egress board;
- **Your own view** — every card is an independent unit: install it, size it 2×2 or 2×4, tune its thresholds, or switch it off. The rail packs the rest.

<p align="center">
  <img src="https://img.shields.io/npm/v/dsh-widgets?style=flat&label=latest%20release&color=4D6BFE" alt="Latest release">
  <img src="https://img.shields.io/npm/dt/dsh-widgets?style=flat&label=total%20downloads&color=4D6BFE" alt="Total downloads">
  <a href="https://github.com/Physicolor/dsh-widgets/stargazers"><img src="https://img.shields.io/github/stars/Physicolor/dsh-widgets?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License">
  <img src="https://img.shields.io/badge/DSH%200.1.x%20%2F%200.2.x-4493F8?style=flat-square" alt="Supported: DeepSeek Harness 0.1.x and 0.2.x">
</p>

<p align="center">
  <img src="docs/screenshots/cover.png" alt="DeepSeek-Harness Widgets preview" width="100%">
</p>

<p align="center">
  <img src="docs/screenshots/dock-magnify.png" alt="the magnification wave following the pointer" width="49%">
  <img src="docs/screenshots/rail-drawer-open-mid.png" alt="the sliding drawer" width="49%">
</p>

DeepSeek-Harness Widgets is a **persistent DSH bundle plugin** built on the Cordis composition model. It provides a customizable multi-column widget rail on the right side of the conversation page — real-time session insights, usage monitoring, and quick actions — with an extensible declarative registry.

## Website / Showcase

A self-contained showcase site lives in [`website/`](website/) and is live at **https://physicolor.github.io/dsh-widgets/** — what dsh-widgets is, why it exists, all 55 real widgets, the **DSH Widget Design Grammar** (the real unit/spacing/magnification formulas from `src/client/index.ts`, with an interactive rail running the actual magnification + right-anchored reflow), **Widget Anatomy** (a real card at ×2 with every padding, gap and inset measured from the DOM), the **DSH Visual Audit** (13 declared rules scored over all 55 widgets from live `getBoundingClientRect` measurements — rule-based, not a model), the widget-unit architecture, the production workflow, and a requirement-form → widget-spec generator. Plain HTML/CSS/JS, no build step, all paths relative for the project Pages base path. `node website/verify.mjs` self-verifies (static + SEO + Edge-headless browser checks, 88 checks); the widget table, the static gallery markup and the JSON-LD `ItemList` are generated from the manifests by `node website/gen-site.mjs` (`--check` fails on drift); `node website/gen-og.mjs` regenerates the social card. Deploy: see `website/README.md`.

---

## Features

### Multi-Column Grid

| Item | Detail |
| --- | --- |
| Max columns | 1 / 2 / 3 / 4 (dropdown in settings, 2 by default). An UPPER BOUND: the deck steps down automatically when space runs short and never exceeds it when space is plentiful |
| Max rows | 1–12 (5 by default). Multiplied by “max columns” it IS how many tiles the deck can seat, i.e. the cap on how many widgets may be PLACED: “max widgets” is read through `columns × rows` (the stored number is kept, so raising either brings it straight back), and the row shows a warning mark whose hover note says what clamped it |
| Where the width comes from (why spare space does not always add a column) | The rail may only claim what the transcript's **reading measure** leaves: `column − measure − 74px − 24px` (74 = the shell scroller's own side padding plus the column-resize band, 24 = a safety margin). Of the two blank bands beside the conversation only the RIGHT one is claimable — the rail is right-anchored and claims by adding `padding-right` to the scroll body, which re-centres the prose; claiming more than `column − measure` would shrink the reading measure itself, and that line is not crossed. The left band is the prose's own centring margin. Measured at a 1578px window: column 1298, measure 748 → ~476px available, so 2 columns (372px) fit and 3 (546px) do not; drop “base card side” to 120px (or use a wider window) and the third column appears |
| Base card size | The MINIMUM card side (150px by default). The rail is a fluid grid: within a column count the cards share the available width evenly, in 10px tiers, up to the size at which **five card rows still fit the rail with the last row's bottom gap equal to the right gap** (150 → 160 at a 1578×1000 window) — anything beyond that goes back to the transcript |
| 2×4 tiles | Twice the width of a 2×2 plus a gap, same height; the same widget can be installed in both sizes at once |
| Gap-free packing | Widgets pack by best-fit; gaps left by 2×4 tiles are backfilled by later 2×2s, so drag-reorder never leaves holes. In a 3-column deck a 2×4 that would strand itself moves one slot earlier and the 2×2 it displaces moves one slot later (rounding), so a wide tile is never left hanging |
| Live width response | While the conversation width is dragged the available width is recomputed every frame and the cards change TIER the moment a boundary is crossed (the transcript inset is untweened for the drag's duration, so it tracks the conversation exactly); the column count steps at its thresholds. An all-2×4 deck skips the 3-column DEGRADATION step (2 ⇄ 4); an explicit 3-column preference is always honoured |
| Transition feel | Both a size-tier change and a column change glide with a slight REBOUND (a ~4% overshoot spring) into their new size/cell, plus a small settle wave staggered in packing order (about 1.6% amplitude, 30ms per card) — never one whole-block pulse. The rail's own width and the transcript inset run on the SAME spring, so container, cards and conversation move together instead of the box jumping ahead of the cards |
| Magnification | Works in multi-column grids too; magnified rows/columns yield by planar distance with constant spacing |
| Wheel = row detents | The wheel steps whole ROWS (every offset is a multiple of the row pitch = card side + gap), so the top row is never cut in half and one notch pulls the next row up to where the first one was. The card the viewport would cut at the bottom is **not drawn at all** (see "Whole cards only" below), so the rail only ever shows whole cards. Scrolling always uses the browser's own smooth scrolling and behaves identically whether the pointer is on a card, in a gap, or on empty rail — never a per-notch hard jump |

The rail's **top edge** sits on the session header's bottom edge (`--dsx-rail-top`; the first card lands exactly on that line — 44px at 1578×950, first card 50px). The anchor is the LOWER of "the 组件 capsule's own line" and "the header's bottom edge": the capsule is what the user reads the rail's position against (measured at 11px from the window top), but the header itself is **opaque white at `z-index: 21`** while the rail's composer seat is only 7 — so a card drawn above the header's bottom edge is PAINTED OVER, not clipped (measured: parking the rail at the capsule's 11px hid the first 33px of the first row). The default is therefore "as high as the capsule's line allows".

### Continuous Magnification

macOS-Dock-style hover magnification with two follow modes (toggle in **Settings → Widgets → Settings → Hover Magnify → Realtime follow**):

- **Stepless (continuous follow)**: truly stepless — every card's scale is driven by its own continuous Euclidean distance to the pointer, so the peak glides smoothly between cards on any pointer movement. It snaps to its steady right-anchored geometry every frame (`transition: none`), so a card's right edge stays flush with the rail even mid-motion — no width/right desync while the pointer moves.
- **Discrete (default)**: reuses the same continuous geometry but snaps the pointer onto a quantized grid (row/column centres + the midpoints between adjacent ones: 2·rows−1 Y points, 2·cols−1 X points), with the same spring gliding the peak between grid points.

The wave's progress is **one spring, written every animation frame**: `displayed = 1 + (target − 1) · p`, where `target` is the live pointer geometry and `p` springs between rest (`0`) and engaged (`1`) on an Apple-parameterised curve (`response 200ms`, `bounce 0.1` — ≈250ms to settle, ~0.15% overshoot ≈0.4px). Both factors are continuous, so enter, follow and leave are one uninterrupted motion in both directions; a pointer that keeps moving only moves `target`, which can never retarget the curve (two earlier shapes — a plain CSS transition and a frozen target — both failed on exactly that, and both are gone). Releasing runs the same formula backwards, and `prefers-reduced-motion` writes `p` in a single frame.

In both modes the magnified deck is painted by a fixed overlay **outside** the rail's scroll-clip box, so leftward growth escapes clipping while the resting rail width (and the conversation column distance) never changes. Scaling preserves the square card shape and constant spacing; magnification is adjustable in settings (`1.0–1.4`).

Entering and leaving a card is **one continuous move**, not two decks cross-fading: at rest the overlay is pixel-identical to the real cards, so the hand-over happens when both agree exactly (invisible), and the following ~250ms writes every card's top/right/width/height together with its scale into the wave on that one spring — and back out on leave, returning to the resting geometry before the real deck takes over. The hovered card keeps its brand-blue outline inside the magnified layer.

Entering is a **compositing** cost, not a repaint one, and the fix is a permanent hint: the overlay's 15 slots (and the bottom **Settings** gear) carry `will-change: transform` at all times, so their layers exist before the pointer arrives — measured with the hint gated on the hover: the natural enter opened with a 63ms layer-promotion + raster frame, and with it permanent the same enter ran 16ms with zero dropped frames. An earlier "raster prewarm" (flipping the overlay visible for 64ms while the rail was idle) has been REMOVED: it almost never coincided with a real hover, and the stall came back on every enter without the permanent hint.

The rail and the magnify overlay are driven by **ONE shared pointer surface** (they are siblings by necessity — the overlay must escape the rail's scroll-clip box), and that surface is **geometrically continuous**: while the wave is live the layer itself is hit-capable and its hit box is widened leftwards by the maximum amount the cards overhang the rail (with the left padding compensated so the cards do not move). Cards, the gaps between them, and the strip a magnified card opens past the rail's left edge therefore all stay on the surface — otherwise a gap resolves to the conversation behind, which showed up as "hovering exactly in the gap cancels the wave" and "at the edge it keeps zooming in and out". A genuine leave still ends the wave (with a 6px tolerance so a pixel of jitter cannot flip it), and **the wheel over a magnified card still scrolls the rail** (intercepted as row-detent scrolling and stopped from reaching the conversation behind).

The overlay is **portaled to `<body>`** (2026-10-01): it has to out-stack `shell.overlay` (z-index 20 — that is where harness-ui-harmonizer draws the wrapped center card's chrome), while the rail's own seat is only 7, and no z-index applied inside a stacking context can climb out of it. Portaled, the layer competes at the root context with `z-index: 26`: above the official right panel (10) and the shell overlay (20), below the settings panel (30). Three consequences, all handled: the pointer focus is driven by a window-level `mousemove` (the layer is no longer inside that wrapper subtree, so a pointer resting on a magnified card would otherwise freeze the wave), the wheel listener is attached to the layer as well (while it is live its own box covers the whole rail, so the wheel would land on it instead of the rail), and the reveal class for the 设置 tile rides the layer too (its mirrored button lives under `<body>` now).

### Loading skeletons

While an external source (OpenCode usage / Command Code / system monitor) has not answered, a card no longer shows an empty or zeroed body: it paints the **silhouette of the body it is waiting for** — the title stays the widget's real name, and the placeholder blocks are rounded fills with a 1.5s sweep (static under `prefers-reduced-motion`). The shape is per widget, so a loading rail is still readable as the cards it is about to show: three rings draw three rounded squares, a bar chart or sparkline draws one large rounded rectangle, a heatmap one wide block, a figure row its short columns and the quota card its three stacked bars; text-only cards keep the figure pill plus body rows. When the data lands it replaces the blocks in place, with no size or position jump.

### Continuous corner curvature

Card corners are **superellipses** (`corner-shape: squircle`), not circular arcs: the curvature ramps in from the straight edges, which is what makes an iOS/Figma-style rounded rectangle read as soft rather than cut. It is native CSS, so the card's border and `box-shadow` follow the same outline (a `clip-path` squircle would slice both off); an engine without `corner-shape` degrades to a plain round corner with nothing else changed.

Both controls live in **Settings → Widgets → Config**: the switch (default **ON**, so the two shapes can be compared) and the **corner gear** — the radius as a share of the card's SHORT side (`12 / 16 / 20 / 24 %`, default 16%). Percent rather than px, because the reference keeps the corner-to-side ratio: a 150px card and its magnified 190px copy must not get the same corner (`12%` reproduces the old fixed 16px at side 150). The gear drives the rail's resting and magnified cards, the market / Config previews and the loading skeletons alike.

### How the settings page is organised

The general tab groups its rows by the **surface each one configures** instead of
listing them in the order they were added:

| Group | Contents |
| --- | --- |
| Grid & Size | Max columns / Max rows / Max widgets / Base card size / Card gap / Whole cards only |
| Card Look | Continuous corner curvature / Corner gear |
| Hover Magnify | Continuous magnify / Hover magnify |
| Open / Close Animation | Open shape / Open start scale / Position curve / Zoom curve |
| Settings Panel | Panel width |
| Conversation | Hide the stats line under the input box |

Max columns, Max rows and Max widgets sit next to each other and are all numeric,
because the third is literally the product of the first two (when it is clamped,
the row grows a warning mark whose hover note names the number that clamped it).
There is exactly one control-choice rule:

| Value | Control |
| --- | --- |
| numeric range | `Stepper` (the product's own numeric recipe) |
| curated discrete set | `Select` (the Menu pattern — only the corner gear here) |
| boolean | `Switch` |

That rule had been broken: Max columns was a `Select` while Max rows, added later,
was a `Stepper` — two widgets for the same kind of value. `node scripts/verify-rail-rework.cjs`
audits it row by row now (both counts must be steppers, the page may hold only one
Select, and the group order is asserted), so a new row has to pick its group first —
there is no "append at the end".

### Open/close animation, and whole cards only

The **Whole-group zoom** shape grows the rail out of a **top-right anchor**: it slides in (the shell's own 0.3s transition, same as the official right panel) *and* scales up from a start value. Those two halves are **two elements on two curves**: an outer `translateX(travel)` driven by the **position curve**, an inner `scale(s0)` driven by the **zoom curve** (one `transform` cannot carry two timing functions; both boxes are `inset: 0` fixed, so the rail's coordinates are unchanged under either), each with `transform-origin: top right` — the viewport's own top-right corner, off the right edge of the screen. The parameters live in **Settings → Widgets → Settings** (the page's third tab) under **Open / Close Animation**:

- **Open shape** (default “Stagger (accordion)”): the rail's own box **neither moves nor scales** — and every card travels along **exactly the path the whole group takes in Whole-group zoom**: same off-screen anchor, same start scale, same travel, same two curves. Only the per-card **timing** differs, and the fold's **whole timeline is that same duration** — one card's travel and the per-rank step are split OUT of it (`60% / 40%`), so a 14-cell deck lands on 9.23ms beats and the last card arrives exactly when the group would have: the cascade starts at the deck's **bottom-left** cell and hands over to the **top-right** one, and the collapse retracts in the mirror order — the same timeline played backwards, which is what lets a fast reversal (a close interrupting an open) resume from wherever the fold stands instead of restarting or freezing. Every cell gets its own delay (no cap). So the cards fly in from beyond the rail's right edge (the rail clips its own subtree, so a card is hidden until its turn brings it across), one beat after another, instead of the block arriving in one piece. Pure `transform` throughout, with **no opacity change at all**, and the bottom **Settings** tile is a cell of that same grid, so it folds with the rest. “Whole-group zoom” is the opposite trade: one group-wide slide + scale, everything together.
- **Open start scale** (50–100%, default 88%): the scale the open starts from — the whole group in “Whole-group zoom”, **each card** in “Stagger”. 100% = pure slide.
- **Position curve** (default Square root): how POSITION advances — the rail's horizontal slide (“Whole-group zoom”), or each card's copy of that same slide (“Stagger”).
- **Spring settle** (0–20%, default **4%**): how far that POSITION **overshoots its target** before settling — the cards (the whole rail in “Whole-group zoom”) slide `settle × travel` (≈ **18px at the default**, 91px at 20%) past their seat and spring back. The number is the overshoot itself, not a control point: the position curve's ordinate is solved so the curve's peak clears 1 by exactly that fraction, which is what keeps the two shapes one map — the group's CSS transition and the per-card cascade evaluate the **same cubic-bezier**. It stays on POSITION on purpose: every curve's ordinate is clamped to `[0, 1]`, because a SCALE past 100% would grow the rail past the column it lives in. The scale is therefore monotone and the settle is the position's. Real springs of this family (Android's `DAMPING_RATIO_LOW_BOUNCY` = 0.75, motion.dev's default `bounce` = 0.25 ≈ ζ 0.75) overshoot by 3–5% of their travel with no visible second bounce, which is where the default comes from; the peak lands at ~57% of the curve, where a ζ = 0.70 spring puts its own. Closing plays the same timeline backwards, so the settle leads the leave as a short **wind-up** instead of trailing it.
- **Zoom curve** (default Square root): how the scale advances (“Stagger” too, where the cascade delays stagger it card by card).

Each curve *is* its `cubic-bezier()`: one line, two draggable control points (arrow keys nudge them) plus five presets (Linear / Standard / Ease out / **Square root** / Smooth). A preset is just a named value of those four numbers, so "Custom" is **derived** (shown when no preset matches) — there is no second state that could drift from the drawing. The dot under each field replays that curve live: constant speed horizontally (time), the curve vertically (progress).

**Whole cards only** (default on) fixes a different thing: row-detent scrolling guarantees the top is never cut, but the pane is not a whole number of rows tall, so the bottom card used to be sliced in half. With this on that card is **not drawn and not hit-testable** (its area is empty band — hovering it must not arm the wave). It is hidden per card slot rather than by clipping the pane: the pane's bottom edge sits only `gap` (24px by default) below the last whole card, while a card's drop shadow reaches ~28px past its own box — a clip there would shave the shadow of the card you can see. Hiding the card leaves the band intact but unpainted, so every visible card keeps its whole shadow. Crossing the edge is a **fade** (`opacity` 0.18s, with the `visibility` flip delayed until it finishes) and coming back reveals at once and fades in: `visibility` cannot be interpolated, so the discrete half rides `transition-delay`, and the delay lives only on the cut rule (a transition reads the after-change style) — cut means fade out, restored means appear-then-fade-in.

The bottom **Settings** gear obeys the same rule (a half tile is not drawn), and it is additionally a **hover-only** affordance: never painted at rest, fading in when the pointer enters the rail (or the magnify overlay). Its cell stays in the layout — otherwise every hover would change the rail's height and its scroll end, shifting the deck — only the paint is gated.

**Where the scroll ends** (2026-10-01): the wheel stops at the smallest detent that shows the deepest component whole, instead of pulling the last row up to the top. With the row detents keeping the top whole and this rule keeping the bottom whole, scrolling further would only lift the last row and leave a viewport of blank band under it; the pane now ends within one card gap of the last component, and the browser's own scroll range is trimmed to the same stop so trackpad inertia cannot overshoot it.

The magnify wave is continuous: hovering pushes the rows below it down, and the card pushed past the viewport edge is still clipped — following that would pop cards in and out mid-animation, so the whole-card test is deliberately static (the resting seat) and the wave itself is untouched. The overlay's **left overhang is kept for the whole morph**, not just while the wave is engaged: on the frame the pointer leaves, the overhang used to collapse to 0 while the cards were still ~25% enlarged, and `overflow: hidden` sliced a strip off the leftmost one — the reported "left-edge truncation when the highlight goes away".

### Built-in Widgets

| Widget | Detail |
| --- | --- |
| Turns · Steps | session turn & step counts |
| LLM / Tool time | cumulative reasoning & call time |
| First-token latency | average TTFT |
| Rate | decode throughput (tok/s) |
| Cache hits | input cache-hit ratio |
| Tokens | input / output token counts |
| Session Overview (2×4) | the session numbers the stats line above was split into, on ONE 2×4: **turns / LLM / tools / rate** by default, **up to ten**, picked and ordered in the component config (the `metrics` field: name left · switch right · **drag the row itself** to reorder — no grip; the insertion indicator is the product's own blue arrow-line). Five figures per row, then two balanced rows (6→3+3, 8→4+4, 10→5+5). All twelve selectable numbers (turns, steps, LLM, tools, TTFT, rate, cache, in, out, context, active, todo) go through the SAME formatters the single cards use, so a number never means two things, and a unit that no longer fits (five per row) falls back to the bare figure. The gap between two figures is the card's own inner padding, exactly like the System Monitor rings. A 2×2 card prints its figure at 20px where a board figure is 13px — the board scans a row, the card shows one number, and both ship |
| Context waterline | system/tool/message segment bars + breakdown; 2×2 and 2×4 supported |
| System monitor | local hardware family: CPU/GPU utilization numbers, memory, VRAM, GPU temperature — 2×2 cards + 2×4 rings dashboard |
| One-click compact | context usage % + round corner button (double-click to compact) |
| Tasks | in-progress / done / todo counts |
| Usage heatmap | GitHub-style calendar heatmap, self-tracked daily usage; 2×2 = ~3-month calendar, 2×4 = half-year all-points view |
| Last-7-days bars | vertical bars for the last 7 days; bar area height matches the calendar grid |
| Trajectory | the official Trajectory rail as a card: one colored bar per input / model / tool beat, rolling right through the newest 30 beats as the model keeps calling tools. **Horizontal geometry matches the built-in timeline**: 1px corners, a `min(width * 8%, 1px)` gap and the 2px floor, with all three lanes always drawn (a lane with no beat is an empty track). **Vertical geometry is the card's own**: the three lanes sit flush against each other and fill every pixel between the grey caption and the card's padding floor (the official 8px bars on a 14px pitch are a 1300px-wide strip — copied into a 160px tile they left two thirds of the card empty). **Lane width** is a per-card switch in the component config, mirroring the official toolbar's Duration toggle: `By duration` (default — a bar's width is its share of the window's total duration, idle compressed away) or `Equal width` (the official default projection: one equal slot per beat, the slot freezing at 30 beats) |
| Quote of the day | random motivational quote; text/alignment/wrapping customizable |

### Quota Manager (Coding Plan group, 2×2)

The blue title sits on top, the **big figure (the projected month-end percent) on the row under it**, and the grey `Ends 10-10` line to the **right** of that figure, **bottom-aligned with it**; two figures stand at the bottom: **today's usage** (measured tokens) and **today's budget** (the remaining balance split evenly over the days left). That head shape is the same one Context Used uses, with a standard 4 px gap between the title and the figure (at side 150). **The head no longer prints the pool view name**: tapping the card still cycles `AllUser → <account> …` (the figures move with it), there is just no label line for it any more.

- **Scope (this plan only)**: today's usage and today's budget are computed from the daily log folded to the Command Code provider route (`commandcode`) — the same route its credits and billing period come from (`/api/widgets-usage-daily?provider=commandcode`). Another provider running on the same machine that day (e.g. OpenCode Go) is **not** counted; charging them to this plan's allowance is what made the card read 758M for a day this route served 474M of (measured 2026-09-20). When that scoped map is unavailable the two figures print `—` rather than falling back to the mixed caliber.
- **Projection**: `used% + recent pace × days left`, where the recent pace is the last **3 day-equivalents** (the previous two whole days plus today prorated by how much of it has elapsed). The projection and the budget are therefore **mathematically consistent**: projected > 100% ⇔ recent pace > today's budget — the card can never claim "today is under budget" and "the month is over 100%" at once.
- **Past 100%**: the figure itself turns red and breathes (1.6 s), instead of a red glow around the card.
- **Credit → token conversion**: the balance (credits) is converted at the period's own realised "local tokens ÷ credits consumed" rate, so the figures share one caliber; the provider's own token counter is not mixed in (it measures the same period ~1.7× higher). A **pool member added today has no rate of its own** — its budget borrows the pool's realised rate (remaining credits ÷ days left still holds), while its pace stays its own zero: the daily log belongs to the machine, not to an account that has served nothing.
- **It never prints "insufficient data" — whatever is missing is filled**: no payload yet → `-%` with the period line when one is known, and `—` for the two figures; a period too young to project (a member added today) → its real consumed percent (`0.0%`), its real budget and 0 tokens; a member that has never been used → zeros everywhere except the budget. Only a stale payload (a period that already ended) shows nothing, because it no longer describes anything spendable.

### GitHub

Five cards in their own market group (`GitHub`), backed by ONE same-origin host route — `GET /api/github?user=<login>&repos=<owner/name,…>` — so the browser never talks to `api.github.com`. The credential ladder is what makes the family work on **anybody's** machine with nothing typed: `credentials.resolve('GITHUB_TOKEN' | 'GH_TOKEN')` → the local `gh auth token` (whoever ran `gh auth login` once) → anonymous. Both slices are cached host-side (calendar 30 min, repo pulse 15 min) because anonymous GitHub is **60 requests/hour per egress IP**, shared with every other tool on the machine.

Both config fields are optional: an empty `user` means "whoever this machine is signed in as" (resolved from the token's own `GET /user`), and an empty `repos` means the four most recently pushed repos the token can see.

| Widget | Detail |
| --- | --- |
| Contribution heatmap (2×2 / 2×4) | GitHub's own five-step green ramp — derived from `--dsw-alias-state-success-primary` (not a literal hex), so it follows the light/dark theme. Drawn by the same renderer as the token calendar (new `heatmapPalette: 'github'`); **2×2 = ~3 months (13 week-columns), 2×4 = the last year (53)**, the window GitHub's profile header reports. Counts come from the official GraphQL `contributionsCollection` when a token exists (exact per-day counts in one call), else from the public contributions page, parsed — verified to agree day-for-day with the API (`docs/probe-github.mjs`, both ladders). |
| Stars (2×2) | stars as the figure, repo name above, forks below |
| Issues (2×2) | open issues with **PRs excluded** (the repo payload's `open_issues_count` counts both) + how many nobody has answered — that one needs a token; without one the line says so instead of printing a zero nobody measured |
| Pushes (2×2) | distance since the last push (`12s / 5m / 3h / 6d`) + the newest release tag |
| Repo pulse (2×4) | stars / open issues / unanswered / last push side by side, with the repo full name and newest release on the title row |

Watching more than one repo? Every repo card carries the same tap-to-cycle (`ghRepo`), so tapping any of them moves the whole family — the usage/cc pool behaviour.

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
| Usage | the token total as the big figure (`4.9M tokens`), with requests / success / spend as a figures row on the card floor |
| Credits | the balance as the big figure (`69.16 credits`) over the official site's three quota rows — 5-hour / Week / Month, each a window name with its percent hard right above a 24-cell segmented bar |
| Windows | 5h / weekly / monthly usage rings |
| Subscription | the plan **tier badge** (GOAT / PRO / MAX / ULTRA / PROVIDER / GO / TEAMS PRO) with the billing period line above it; a preview click walks the whole ladder |
| 5h window · Weekly window · Monthly window | single-window number cards (one decimal + the reset date) |

All four upstream endpoints are fetched independently with an 8 s timeout, so one failing slice renders `—` instead of taking the card down; missing values are never invented. The monthly window is measured against the plan's published allowance (`used = allowance − remaining`; GOAT = $70 per billing period) because the provider publishes no monthly window object at all.

**No redundant role words.** A card whose figure carries its own unit (`4.9M tokens`, `69.16 credits`) or its own name (the tier badge) drops the grey role word entirely — the line is reserved for the pool view once there is a pool to switch. The Plan card's grey line is the billing period instead.

The **Subscription** card prints the plan as the tier badge the official plan map uses (`individual-goat` → `GOAT`, `individual-pro-v1` → `PRO`, … resolved by longest prefix exactly like the provider does), never the raw id — the old `individual-goa…` overflowed the tile. Its grey line is the billing period, and the badge is the big figure on the card's floor. The component market's preview click walks the whole ladder, so every badge can be eyeballed without owning that plan.

**The preview stage is the tile.** Market and Config previews render the card inside a pinned unit square (`pinBox`), so what you see is what the rail seats: an over-tall card is clipped by the card's own `overflow: hidden` instead of stretching the stage into a non-square rounded rectangle (the credits card measured 200×250 before its redesign).

#### Pooled accounts — tap a card to switch

The Command Code provider's **Account rotation** card can put several subscriptions behind one install (`COMMANDCODE_API_KEY`, `COMMANDCODE_API_KEY_2` … `_4`). The host route reads **every** configured one, each with its own four endpoints, and returns them as `keys`, labelled with the account name read from that key's own `/alpha/whoami`:

- **Tap any Command Code card to cycle** `AllUser → Physicolor → Sparxie → AllUser`. The view is persisted per card instance (`cardConfigs.ccView`), so the choice survives a reload — and it is deliberately a different field from the OpenCode pool's `poolView`, so the two families never share a view;
- **`AllUser` is the pool's total**, summed field by field: a window's percent is `sum(used) / sum(cap)` (a mean of percents would call one exhausted pool beside an untouched pool "50% used"), the monthly window sums each member's own month — each measured against **its own** plan, so a two-GOAT pool is 2 × $70 — and the account card shows the generic `AllUser` label with the member names beneath it. `AllUser` is deliberately the same literal in both languages;
- **The legend line carries the current view** (`Account · AllUser`, `Windows · Physicolor`) beside the card's role word, and the hover tooltip spells out the whole chain;
- **One key configured → no switcher at all**: the cards render exactly as they did before, with the bare role word and the account name in the body. Two pools resolving to the same account name are disambiguated with the key's masked tail.

### Peak Pricing (market widget)

A 2×2-only peak-pricing card showing whether the current moment is inside a DeepSeek peak-pricing window. Peak hours (Beijing time, UTC+8): Mon–Fri **09:00–12:00** and **14:00–18:00** — and, per the [official price page](https://api-docs.deepseek.com/quick_start/pricing), everything else is off-peak **including every Chinese public holiday in full** and the weekends the annual notice turns into working days. That second half is not decoration: a weekday clock alone prices **19 days of 2026** as peak when DeepSeek bills them off-peak (New Year's Day 1/1–1/2, Spring Festival 2/16–2/20 & 2/23, Qingming 4/6, Labour Day 5/1 & 5/4–5/5, Dragon Boat Festival 6/19, Mid-Autumn Festival 9/25, National Day 10/1–10/2 & 10/5–10/7). Off-peak shows **CHEAP**; during a peak window it shows **EXPENSIVE**, with the figure itself turning red and breathing (1.6 s) — a text-level escalation, the card frame stays clean — while the corresponding window row under the title lights up brand-blue and scales up slightly. On a day that is off-peak in full, the meter names the reason (`Mid-Autumn Festival · off-peak all day` / `Weekend · off-peak all day`) instead of lighting a window that does not apply. The schedule is per card: peak windows, weekend/holiday switches, time zone (`Beijing UTC+8` or the machine's own) and an **extra off-peak days** list for a year whose State Council notice is not out yet — the card then keeps weekday behaviour and says so in its hover hint rather than guessing. The statutory ranges live in [`src/widgets/peak-pricing/holidays.ts`](src/widgets/peak-pricing/holidays.ts) (`docs/verify-peak-pricing.cjs` re-checks the whole rule, 34 assertions).

---

## Architecture

- **Widget units + build-time discovery (ARCH-001)**: every widget is an independent unit under [`src/widgets/<id>/`](src/widgets/) — `manifest.json` (the machine-readable half: id / order / group / builtin / defaultInstalled / sizes / per-widget locale, plus an optional `source` + `skeleton`) + `index.ts` (the `defineWidget` descriptor: a **pure-data** `render()`, name/desc thunks, configSchema and example). The registry is **generated**, never hand-maintained: [`scripts/gen-registry.mjs`](scripts/gen-registry.mjs) scans the unit dirs, rejects an unknown manifest key or a three-way id mismatch, and emits `src/client/generated.registry.ts` (`WIDGETS` / `WIDGET_RUNTIME` / `ALL_IDS` / `ALL_INSTANCES` / `STATS_WIDGET_IDS` / `DEFAULT_INSTALLED` / merged `WIDGET_LOCALES`). Adding a widget = adding one unit dir; `pnpm build` regenerates and `pnpm check:registry` fails loudly when the registry is stale. The template lives in [`src/widgets-template/`](src/widgets-template/) — outside the scan root, so it can never be discovered or registered;
- **Contract**: [`src/client/lib/contract/`](src/client/lib/contract/) — `types.ts` (every shape a unit, a renderer or the shell exchanges; **zero imports**, so a type-only consumer never pulls i18n or React into its graph) + `helpers.ts` (`defineWidget`, the label resolvers, the instance-key pair, `sizesOf`). The other framework-free helpers sit beside it (`format.ts`, `heatmap-accounting.ts`, `quota-math.ts`, `morph-spring.ts`); per-source payload parsing and that source's card renderers live in `src/client/families/<family>/{data,renders}.ts`, and no family imports another;
- **Per-widget i18n**: widget strings live in each unit's `manifest.json` (family-shared strings once in `src/widgets/_shared/locales.json`); the shell dictionary (`src/client/i18n.ts`) owns only the shell UI. The generated registry merges everything and the shell registers it with the official locale service at apply() time;
- **The rail is three modules**: `rail/geometry.ts` (space and budget maths — pure reads and solving), `rail/measure.ts` (anchor probes, width tracking, the ResizeObserver fan-out and the yield beat, applied straight to the DOM so it cannot land a frame late behind React's commit), `rail/rail-view.tsx` (`createRailView(deps)`: the deck grid, the wave, the add panel and the sliding drawer). `client/index.ts` only composes — the bridge, four slot registrations, the header capsule and the settings surfaces (308 lines);
- **The magnification wave**: the spring curve in `lib/morph-spring.ts` (`WAVE_SPRING`), the layout and scale field in `rail/wave/wave-geometry.ts`, the interaction and the per-frame style writes in `rail/wave/RailWave.tsx`;
- **Data collector**: mounted on the `conversation.composer.dock` slot, which renders only when an active session exists — a natural "session alive" signal;
- **Host half**: [`src/host/`](src/host/) — one module per upstream channel (`opencode` / `commandcode` / `usage-daily` / `github` / `sysinfo`) plus the state file, sharing `host/http.ts` (the memo + body reader), `host/exec.ts` (the subprocess seam) and `host/context.ts` (the ctx contract). [`src/index.ts`](src/index.ts) is 31 lines that compose `HOST_ROUTES`. The routes: `/api/opencode-usage`, `/api/opencode-usage-multi`, `/api/commandcode-usage`, `/api/widgets-usage-daily`, `/api/github`, `/api/widgets-state` (the authoritative copy of the rail configuration, persisted to `profiles/web/dsh-widgets-state.json` — it survives browser origin switches, private mode and site-data clearing) and `/api/sysinfo`;
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

After installing, **hard-refresh the browser** (Ctrl+Shift+R) and click the "Components" (widgets) icon in the session header to expand the rail. The OpenCode Go widget needs `OPENCODE_GO_API_KEY` configured in the Models settings.

## Development

```sh
pnpm install
pnpm run build       # gen-registry + tsdown bundles + the published .d.ts
pnpm run check       # registry up-to-date guard + tsc --noEmit (zero errors)
pnpm run check:types # a throwaway consumer resolves both entry points' types
pnpm check:registry  # discovery guard only
node scripts/validate-widget-unit.mjs [dir]   # widget-unit contract validator (Worker self-check / review)
```

> **The project typechecks clean**, so `pnpm check` is a hard gate, and eight offline gates guard a change: G1 registry staleness, G2 per-unit contract + locale completeness, G3 typecheck, G4 the **110 render outputs** of every widget × size × preview state (pure data — no browser, no React), G5 the compiled-CSS concatenation, G6 the move-only line audit, G7 **14 host-route cases** driven against the built bundle with stubbed credentials and no running service, G8 the published declarations resolved by a real consumer. [`docs/architecture/CODE_MAP.md`](docs/architecture/CODE_MAP.md) is the map of where everything lives, and [`docs/architecture/ARCHITECTURE_REFACTOR_REPORT.md`](docs/architecture/ARCHITECTURE_REFACTOR_REPORT.md) records what each restructure step was verified against.

- `peerDependencies`: `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-ui-slots` (both provided by the DSH web profile; `@deepseek-ai/dsh-client-runtime` was retired in DSH 0.1.5);
- `cordis.patch.yml` inserts one `widgets` row; the host half and browser half are loaded by the loader and client-modules respectively.

## Compatibility

- DeepSeek Harness `0.1.0-rc.6` and later `0.1.x`, plus `0.2.0-rc.1` and later `0.2.x` — verified by installing and booting the plugin on **0.1.7-rc.2** and **0.2.0-rc.2** (host routes answering, the client bundle loaded, all four slot registrations firing, `settings.section` rendering); the pre-0.2 peer declaration was refused outright by that runtime's compatibility check;
- Integrates via `conversation.input.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section`;
- Coordinates explicitly with `dsh-better-sidebar`'s right rail: the rail reads the official right-bar column (keeping `--dsh-sidebar-width` as a fallback for older better-sidebar builds) and its header capsule registers at `order: 5` so the two toggles cannot swap places on a bundle reload; no residue after uninstall.

## Releases

Every release, entry by entry — including the measurement behind each change — lives in **[`CHANGELOG.md`](CHANGELOG.md)** ([中文](CHANGELOG.zh-CN.md)); each version is also published as a [GitHub Release](https://github.com/Physicolor/dsh-widgets/releases) anchored to the commit that shipped it. Raw evidence (CDP probes, screenshots, JSON receipts, per-incident fix records) lives under [`docs/`](docs/). This README keeps only the current release at a glance.

### Latest — v1.8.1

**Two card waves, one head ladder for every card, and the defects a live rail found.** v1.8.0 was an engineering release; this is the content it was clearing the way for — the registry grew from **40 widget units to 55** (17 added, 2 retired) across three batches — plus the layout work and the two reports that only showed up once all of it was on screen.

- **Seventeen new units, 55 in total.** The session-and-machine wave: **Goal Progress**, **Permissions** (the preset in force), **Background Jobs**, **Subagents**, **Disk & Self-check** (free space plus the DSH session log's size and hourly growth) and **Throttle Forecast** (will the 5h / weekly window hit its cap before it resets). The device wave: **Network Throughput**, **Power** and **Process Memory**, plus **Session Cost** (this session's tokens priced through the price table, provenance printed beside it) and **To Review** (the GitHub review queue, ETag-aware, authenticated only). Then **Local Dependencies** (the port and egress board — a listening port is not an egress verdict) and the third batch's four: **Plan Overview**, **Trajectory Share**, **Token Bars** and **Peak Hours Board**. Behind them: `/api/host/overview` (one merged PowerShell pass for throughput, power, processes, service and proxy health), the review-queue slice (`notif=1`) and the usage-center price-table reader. Two units were retired — the wide bars card merged into **Token Bars**, and Model Config was dropped;
- **Every card head is one ladder.** A ring head now always draws all three rungs — a figure or caption the widget does not have is *reserved*, not dropped — because the dial is centred against the ladder's own height: measured at side 150, the caption-less **Plan Overview** drew title / figure / ring at **15.7 / 35.3 / 13** where the identical card **with** a caption drew **13 / 32.6 / 17.3**. `docs/probe-head-ladder.cjs` mounts the real `CardBody` with hand-written render outputs (a state no widget's preview data reaches) and pins the contract at two card sizes; the same round gave the head a bare `headIcon` mark, five value tones and the 20px figure rung;
- **Command Code's monthly limit is back** — the defect that made **Usage Rings** lose its third ring, **Usage Bars** lose its Monthly limit row, and **Quota Forecast** read `-%` with the Budget row at `—`. `/alpha/whoami`, `/alpha/usage/summary` and `/alpha/billing/subscriptions` were measured at **14–21 s** against one shared 8 s per-slice budget, so all three were dropped on every poll. The route now plans per slice (the fast `credits` awaited, the slow three refreshed out of band on their own TTLs), keeps the last good answer when a refresh fails, warms itself at host boot, and the collector re-asks 5 s after any degraded reply — including the first, partial one. `docs/probe-cc-pool.mjs` re-checks the whole family against the real upstream (92 assertions: pooled month 40.5%, per-account 78.7% / 2.1%, real account labels);
- **Chart cards stay inside their tile, and the instruments tell the truth.** Chart cards are pinned to the tile with an elastic body (measured before: the Command Code Credits card boxed 172.8px in a 160px slot), the loading skeleton is the tile's exact size instead of 13% taller, a 99% ring no longer reads as 95% (ink now comes from the painted extent), the quota row derives its cell count from the width instead of squeezing 24 slivers into one bar, and a chart renderer is created as a real element — calling it inline put its hooks on `CardBody`'s fibre, where an ordinary "no chart, then a chart" swap could empty the whole rail slot (React #310);
- **Sixteen units were retitled to say what they answer** — Usage → **Billing Usage**, Account → **Account Identity**, Windows → **Usage Rings**, Credits → **Usage Bars**, 5h window → **5h Window**, Quota Manager → **Quota Forecast**, System Monitor → **System Board**, Rate → **Decode Rate**, Avg TTFT → **First-token Latency**, Issues → **Open Issues**, Pushes → **Latest Push**, GitHub · To Review → **To Review** — and the credits card's rows now read **5-hour limit / Weekly limit / Monthly limit**. The shared dictionary, the generated registry and the showcase site were regenerated in the same pass;
- **The showcase site ships with it.** All 55 cards, the new names, and `v1.8.1` in the hero kicker, the terminal title, the footer and the JSON-LD — `node website/verify.mjs` (88 checks) now asserts every hand-written version string against `package.json` and every count in the prose against the manifest list, because the pre-release audit found the structured data still advertising 1.6.0 and the copy still claiming 40 widgets;
- **Evidence, not eyeballing.** The offline card gallery (`node scripts/preview/gallery.mjs`) renders every widget through the real `CardBody` with the real theme tokens and photographs it; G7 drives every host route offline (17 cases, stubs only); `docs/probe-cc-slices.mjs` proves the slice pipeline against a latency-controlled fetch stub (13 assertions, `--live` prints the real upstream's per-endpoint latency).


## Roadmap

The widget system is now built for scale: each widget is an independent, contract-driven unit under `src/widgets/` with build-time discovery — a new widget is a new unit dir, no shared file edits (guide: `src/widgets-template/README.md`).

- **Heatmap token accounting follow-up**: the card's total already equals dsh-usage-center's (the host route reuses its `getActivity()`). Making it exact when usage-center is *not* installed would mean folding the same session logs inside this host — deliberately not duplicated today, to keep one caliber maintained in one place;
- **Command Code monthly window, pending an upstream field**: the month is derived locally as `used = plan allowance − remaining monthly credits` (allowance from the published plan table) because `billing/credits` returns no monthly window object. If upstream later adds `monthly` (with used / cap / resetAt) to `windowLimits`, `monthlyWindow()` should read it directly and keep the derivation only as a fallback;
- **Command Code pool discovery by naming convention**: the host reads `COMMANDCODE_API_KEY` plus the `_2 … _4` spares that the provider's Account-rotation card writes. A key stored under an unrelated ref name would need that ref added to `COMMANDCODE_POOL_ENVS` (the credentials service exposes `resolve(ref)` only — there is no "list the refs" seam to enumerate them);
- **Agent-produced widgets**: the machine-readable contract (`manifest.json` + `defineWidget` descriptor + template + shared API) is exactly what a worker agent needs to create a widget end-to-end; the parallel-creation test in v1.3.0 demonstrated two agents adding widgets concurrently with zero file conflicts;
- **More hardware metrics**: CPU temperature via an optional LibreHardwareMonitor bridge (external dependency, opt-in — deliberately not bundled), AMD/Intel GPU support beyond NVIDIA, per-interface network traffic;
- **Heatmap range/period controls**: let the 2×4 heatmap and bars pick custom ranges (weekly/monthly/etc.) beyond the current half-year / 7-day defaults;
- **Multi-platform usage widgets**: Z.ai, DeepSeek balance, etc., reusing the host same-origin proxy + credentials pattern;
- **Peak-pricing holiday table, once a year**: the statutory ranges live in `src/widgets/peak-pricing/holidays.ts`, transcribed from the State Council General Office's annual notice (2026 = Guoban Famingdian [2025] No. 7). The next year's dates are published around November of the year before — add the ranges and extend `HOLIDAY_YEARS`; until then the card keeps weekday behaviour, flags the gap in its hover hint, and the per-card **extra off-peak days** field covers it. Still open on the same card: a weekday-set customization (the windows and the time zone are already editable);
- **Utility widgets**: one-click compact (needs DSH official compaction) and more;
- **External integrations**: Feishu / WeChat push & interaction, keys strictly via DSH credentials;
- **Widget marketplace**: open a third-party widget registration mechanism so community widgets can join like plugins — the unit + discovery architecture (v1.3.0) is the carrier; a future `widgets-market` bundle can drop units into `src/widgets/` the same way;
- **More locales**: the dictionary layer now has zh/en for every key — adding `ja`/`ko` etc. is a pure dictionary extension;
- **Cross-device sync** (optional): today each DSH service keeps its own `dsh-widgets-state.json` — a cloud/account sync layer could share one configuration across machines, but local-first independence is the deliberate default.

## If this is useful

The plugin has no distribution channel beyond being found: if it saves you a glance or two,
a star on [Physicolor/dsh-widgets](https://github.com/Physicolor/dsh-widgets) is what moves
it up the DSH plugin directories where other people are looking. Bug reports and card ideas
are just as welcome — [`issues`](https://github.com/Physicolor/dsh-widgets/issues) is open.

## License

[MIT](LICENSE)
