# dsh-widgets — project website / widget showcase

A single-page, static showcase for **dsh-widgets**: what it is, the real
widgets, why the design works, how to make and contribute one, and a
requirement-form → specification generator.

- **Stack:** plain HTML + CSS + vanilla JS. No framework, no build step.
- **Localization:** first visit defaults to **Chinese** (light theme); a nav `中/EN` toggle switches the entire site (nav, hero, sections, gallery, form, spec output, footer) via `js/i18n.js` — persisted in localStorage.
- **Theme:** first visit defaults to **Light** (subtle blue-tinted, never plain white); dark stays opt-in and persisted.
- **Deployment:** GitHub Pages Project Pages (`https://physicolor.github.io/dsh-widgets/`).
  All asset URLs are relative, so the site works at the project base path.
- **Data source:** every widget shown comes from the real unit manifests
  `src/widgets/<id>/manifest.json` (see `js/data.js`, v1.4.0, 19 widgets) and
  the previews reuse the real widget render path (see "Widget preview fidelity").
  Test units (`test-a`, `test-b`, `wf-*`) are not shown anywhere.

## Layout

```text
website/
├── index.html            # one page, all sections (no routing, no SPA)
├── css/
│   ├── tokens.css        # SITE tokens (light default / dark opt-in) + REAL
│   │                     # DSH widget tokens (--dsw-*, extracted from the
│   │                     # live UI: deepseek-500 light / deepseek-400 dark)
│   ├── base.css          # reset, typography, glass nav, buttons, modal, toast
│   ├── widgets.css       # the REAL widget card language (port of
│   │                     # src/client/widgets.module.css + CardBody/ChartBlock)
│   ├── hero.css          # ~1150px FULL-SCREEN hero (left story / right REAL
│   │                     # widget array at the plugin's own rules 150px·24px /
│   │                     # dimmed 3-row rails / install = the hero's footer)
│   └── sections.css      # widgets / design (slim) / create (how-to + form) /
│                         # contribute (slim)
├── js/
│   ├── data.js           # real widget data (mirror of the manifests; 19 units)
│   ├── i18n.js           # full zh/en dictionary + engine (default zh, persisted)
│   ├── previews.js       # the UNIFIED Preview Adapter: every widget preview —
│   │                     # hero showcase and gallery — goes through
│   │                     # DASH_PREVIEWS.render() only. Real stats + real
│   │                     # format helpers + per-unit render() + real CardBody;
│   │                     # also exports GRID = the real grid rules (150/24).
│   ├── theme.js          # theme toggle (FIRST VISIT = LIGHT by default, persisted)
│   ├── rails.js          # hero 3-row rails + right array + design GOOD card
│   ├── gallery.js        # filter + 19 real-widget cards
│   ├── spec.js           # requirement form → widget-spec generator (bilingual)
│   └── main.js           # lang init, nav, reveal-on-scroll, copy, toast
└── assets/
    └── favicon.svg
```

### Widget preview fidelity

`js/previews.js` is a static port of the plugin's own rendering path — no new
"looks-like-a-widget" design system was invented:

- **data** — `PREVIEW_STATS` / `PREVIEW_RAW` copied from `src/client/components.tsx` (the mock the real market/config previews use);
- **format** — `fmtDuration` / `fmtTokens` / `fmtTps` / `buildRollingGrid` / `lastNDays` from `src/client/lib/format.ts`;
- **render** — each widget's `render()` ported from its unit `src/widgets/<id>/index.ts` (+ `lib/usage-view.ts`);
- **layout & type** — the real `CardBody` / `ChartBlock` scale formula (title 13 / value 20 / pad 12 / radius 16 at unit 150);
- **colors** — the real DSH tokens in both themes (`--dsw-*` in tokens.css).

So the same stats produce the same cards, at the real sizes and proportions,
on GitHub Pages with zero plugin code involved.

### Information architecture (WEBSITE-002 → final slim)

One page, five sections, no documentation-shelf feel:

1. **Hero** — a ~1150px desktop first screen: left story (title / two-line
   description / CTA / stats), right = a REAL widget array (rules from
   `src/client/index.ts` DEFAULTS: `cardSide 150` · `panelPadding 24` used as
   padding AND inter-card gap → 2-col rail width 372, 2×4 wide = 324),
   install terminal as the hero's footer.
2. **Widgets** — all 19 real widgets, one real card each + one line of info.
3. **Design** — one sentence + 3 chips (有用 / 紧凑 / 清晰) + real GOOD widget
   vs overloaded BAD widget.
4. **Create** — five-step how-to + one line (Human/Agent/system) + requirement
   form + spec generator.
5. **Contribute** — six hard gates + five-step strip + docs/issues links +
   short roadmap.

No Playground / Demo / Simulation sections, no “simulated preview” labelling —
the real widget array in the hero and the gallery *are* the showcase.

Nav: 首页 / 组件 / 设计 / 创建 / 贡献 — every item name is plain; the old
"为什么" / "流程" / "演示" wording is gone.

### Liquid-glass navigation

The nav is real liquid glass, not just blur: `backdrop-filter` blur+saturate
+ inner highlight + depth shadows + two decorative layers — a diagonal
refraction highlight (`::before`) and a slowly drifting, blurred light band
inside the glass (`::after`, `nav-sheen` 11s). Only those decorative layers
move; the nav text, icons and buttons never transform. Both themes are
covered and `prefers-reduced-motion` freezes it.

## Local preview

```sh
npx serve website        # or: python -m http.server 8123 -d website
# open http://localhost:8123/
```

## Verify

```sh
node website/verify.mjs
```

Self-contained (Node stdlib + local Edge headless over CDP): static JS/CSS/HTML
checks, serves the site locally, renders it in Edge, asserts theme toggle / nav
anchors / copy / gallery filter / spec generator / i18n completeness /
residue-free (no playground/demo DOM), checks for console errors and failed
requests, and saves desktop + mobile screenshots.

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `website/` directory.
Enable once in the repo:

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push; the `pages` workflow builds artifacts and deploys.

Because every path is relative (`css/…`, `js/…`, `assets/…`), the site renders
correctly at both `https://physicolor.github.io/dsh-widgets/` and any mirror or
a local `file://` open.
<!-- deploy trigger -->
