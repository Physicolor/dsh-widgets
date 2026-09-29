# dsh-widgets — project website / widget showcase

A single-page, static showcase for **dsh-widgets**: what it is, the real
widgets, the spatial grammar behind them, an anatomy view of a real card, a
rule-based visual audit of all 40 widgets, how to make and contribute one, and a
requirement-form → specification generator.

- **Stack:** plain HTML + CSS + vanilla JS. No framework, no build step.
- **Live:** GitHub Pages Project Pages — <https://physicolor.github.io/dsh-widgets/>
- **Localization:** first visit defaults to **Chinese** (light theme); a nav `中/EN` toggle switches the entire site (nav, hero, sections, gallery, grammar, audit, form, spec output, footer) via `js/i18n.js` — persisted in localStorage.
- **Theme:** first visit defaults to **Light** (subtle blue-tinted, never plain white); dark stays opt-in and persisted.
- **Deployment:** `.github/workflows/pages.yml` uploads the `website/` directory. All asset URLs are relative, so the site works at the project base path.

## Layout

```text
website/
├── index.html            # one page, all sections (no routing, no SPA)
│                         #   home · design · grammar(+anatomy) · audit · widgets · create · contribute
│                         #   the gallery markup and the JSON-LD ItemList between gen: markers
│                         #   are GENERATED — edit gen-site.mjs, not those lines
├── gen-site.mjs          # generator: js/data.js + static gallery + JSON-LD ItemList
├── gen-og.mjs            # generator: assets/og.png (1200×630, Edge headless over CDP)
├── verify.mjs            # self-contained verification (static + SEO + Edge-headless browser)
├── robots.txt            # crawlable; points at the sitemap
├── sitemap.xml           # the single canonical URL
├── css/
│   ├── tokens.css        # SITE tokens (light default / dark opt-in) + REAL
│   │                     # DSH widget tokens (--dsw-*)
│   ├── base.css          # reset, typography, glass nav, buttons, toast
│   ├── widgets.css       # the REAL widget card language (port of
│   │                     # src/client/styles/{card,primitives}.module.css + render/CardBody.tsx)
│   ├── hero.css          # full-screen hero (left story / right REAL widget array)
│   ├── sections.css      # widgets gallery / design philosophy / create / contribute
│   └── lab.css           # design grammar · anatomy · visual audit · component detail
├── js/
│   ├── data.js           # GENERATED widget table (mirror of the manifests)
│   ├── i18n.js           # full zh/en dictionary + engine (default zh, persisted)
│   ├── previews.js       # the unified Preview Adapter: every widget preview —
│   │                     # hero, gallery, anatomy, audit, dialog — renders through
│   │                     # DASH_PREVIEWS.render() only
│   ├── grammar.js        # DSH Widget Design Grammar: the REAL constants,
│   │                     # stepScale(), layout(), the 13 audit rules + scoring,
│   │                     # and the DOM measurement layer (measure/zoomProbe)
│   ├── lab.js            # the grammar rail, the anatomy stage, the audit section
│   ├── detail.js         # the component detail dialog (variants/geometry/audit/source)
│   ├── theme.js          # theme toggle (FIRST VISIT = LIGHT by default, persisted)
│   ├── rails.js          # hero 3-row rails + right array + design GOOD card
│   ├── gallery.js        # hydrates the static gallery cards, filters, detail entry
│   ├── spec.js           # requirement form → widget-spec generator (bilingual)
│   └── main.js           # lang init, nav, reveal-on-scroll, copy, toast
└── assets/
    ├── favicon.svg
    └── og.png            # GENERATED social card
```

## Generated content (do not hand-edit)

`node website/gen-site.mjs` derives everything from the REAL source of truth and
writes it into the page, so the site is readable **without JavaScript**
(crawlers, no-JS readers, link previews):

| artifact | source of truth |
| --- | --- |
| `js/data.js` (widget table) | `src/widgets/<id>/manifest.json` (40 units) |
| the gallery markup in `index.html` (between `gen:gallery` markers) | the same manifests + `js/previews.js` for the primary pattern / interaction |
| the JSON-LD `ItemList` (between `gen:jsonld` markers) | the same manifests |

`node website/gen-site.mjs --check` fails when either artifact is stale;
`verify.mjs` runs that check first, so drift cannot ship. The package version is
**read** from `package.json` and only copied into the page — the generator never
writes a version.

One deliberate site-side copy correction lives in `gen-site.mjs` (`DESC_FIXES`):
the `cc-window-monthly` market description still states the superseded
`used / (used + remaining)` denominator, while `src/client/families/cc/data.ts`
computes `(allowance − remaining) / allowance`. The website shows the correct
formula and the audit reports the mismatch as a `copyTruth` WARN; the plugin's
manifest is owned by the plugin and is left untouched.

## Design Grammar / Anatomy / Visual Audit

`js/grammar.js` is a port, not a re-imagining:

- **constants** — `BASE_SIDE 150`, `cardSide 150`, `panelPadding 24`,
  `magnify 1.2`, `columns 2` (`src/client/rail/geometry.ts` · `src/client/runtime/prefs.ts`); `innerPad
  = round(12·scale)`, `radius = round(16·scale)`, title/value/caption `13/20/10`,
  foot gap `6`, corner inset `round(8·scale)` (`src/client/render/card-geometry.ts`).
- **magnification** — `stepScale(d)`: `d ≤ 0 → peak`, else `1 + (peak−1)·max(0, 1−d/3)^1.6`
  (`src/client/rail/wave/wave-geometry.ts`); the rail demo runs this curve plus the
  right-anchored reflow (`placeCards`, same file), and the
  sliders are the real `cardSide` / `panelPadding` / `magnify` settings.
- **audit** — 13 rules in two explicit layers. *Geometry* (`getBoundingClientRect`
  on the real rendered cards): padding, title inset, right-slot alignment, block
  alignment, content-block rhythm, fit, action inset. *Design heuristics*
  (declared rules evaluated on the render output): one dominant reading, type
  hierarchy, grouping, text-density budget, magnification stability, and
  copy-vs-implementation. Scores are only `round(100 · Σw / n)` with
  `pass 1.0 · warn 0.6 · fail 0`, `n/a` excluded — no claim that a number proves
  beauty, and the section states that plainly.

Each widget is measured **at the size it actually ships in**, and the audit
section prints its exception list (currently: three cards that grow past the
magnified unit — `context-water` +4px, `sys-gpu-line` +29px, `cc-credits` +33px —
plus the `copyTruth` mismatch and the `sys-board` 2×4-only size contract).

### Widget preview fidelity

`js/previews.js` is a static port of the plugin's own rendering path — no new
"looks-like-a-widget" design system was invented:

- **data** — `PREVIEW_STATS` / `PREVIEW_RAW` copied from `src/client/render/preview/preview-stats.ts`;
- **format** — `fmtDuration` / `fmtTokens` / `fmtTps` / `buildRollingGrid` / `lastNDays` from `src/client/lib/format.ts`;
- **render** — each widget's `render()` ported from its unit `src/widgets/<id>/index.ts` (+ `families/<family>/renders.ts`);
- **layout & type** — the real `CardBody` / `ChartBlock` scale formula (title 13 / value 20 / pad 12 / radius 16 at unit 150);
- **colors** — the real DSH tokens in both themes (`--dsw-*` in tokens.css).

## SEO / discoverability

- `<title>` / `meta description` name the project, DeepSeek Harness, the design-system and component-library framing.
- `canonical` + `og:*` + `twitter:card` point at the real Pages URL; `assets/og.png` is a real 1200×630 render of the site's own cards.
- JSON-LD: `WebSite` + `SoftwareApplication` (static) and a generated `ItemList` of all 40 widgets.
- `robots.txt` (allow all + sitemap) and `sitemap.xml`.
- The gallery is **in the HTML source**, so the widget names, ids, categories, sizes and descriptions are crawlable without JS — which is also why the static markup is generated rather than rendered at runtime.

## Local preview

```sh
npx serve website        # or: python -m http.server 8123 -d website
# open http://localhost:8123/
```

## Verify

```sh
node website/verify.mjs        # 88 checks: static + SEO + Edge-headless browser
node website/gen-site.mjs --check
node website/gen-og.mjs        # only when the social card must change
```

Self-contained (Node stdlib + local Edge headless over CDP): JS/CSS/HTML syntax,
asset references, `gen-site --check`, the SEO surface (title/description/canonical/robots/OG/Twitter/JSON-LD/robots.txt/sitemap/og.png),
static gallery crawlability, theme toggle + persistence, language toggle, i18n
completeness in both languages, gallery filters and equal columns, the grammar
rail (curve + reflow + slider formulas), anatomy annotations and measurement,
the audit (40 widgets scored, exceptions listed), the component detail dialog,
responsive checks at 390/1440/1920, console/network monitoring, and desktop +
mobile screenshots of every section.

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `website/` directory.

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`; the `pages` workflow uploads the artifact and deploys.

Because every path is relative (`css/…`, `js/…`, `assets/…`), the site renders
correctly at both `https://physicolor.github.io/dsh-widgets/` and any mirror or
a local `file://` open.
