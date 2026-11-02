# Contributing to dsh-widgets

Thanks for wanting to make the rail better. This repository is built around one idea:
**a widget is an independent unit** — one directory, one manifest, one render function —
so most contributions never touch a shared file.

## Five-minute card

A new card is a directory under `src/widgets/`:

```sh
mkdir src/widgets/my-widget
cp src/widgets-template/template/manifest.json src/widgets/my-widget/
cp src/widgets-template/template/index.ts   src/widgets/my-widget/
# edit both: directory name === manifest.id === index.ts `id: 'my-widget'`
pnpm gen:registry
pnpm run build
pnpm test
```

The full contract (manifest fields, `source` / `skeleton`, title rules, sizing formula) is
[`src/widgets-template/README.md`](src/widgets-template/README.md); the production workflow
is [`docs/workflow/README.md`](docs/workflow/README.md).

**Do not** edit `src/client/index.ts`, `lib/registry.ts`, `src/client/data/collector.tsx`
or `generated.registry.ts` to add a card — the generator owns the registry, and touching a
shared file is how two contributions start colliding.

## A card that lives in its own plugin

If your widget should not be merged here at all, ship it as a runtime unit instead:
`registerExternalUnit()` applies the same rule list, and the offline review gate is

```sh
node scripts/validate-external-unit.mjs <unit-dir>
```

See [`docs/workflow/10-third-party-units.md`](docs/workflow/10-third-party-units.md).

## Before opening a PR

```sh
pnpm check          # registry check + tsc, zero errors
pnpm run build      # lib/ must exist before the CSS gate runs
pnpm test           # all offline gates (G1–G14); every one must pass
```

- **Behaviour changes need a gate.** If you fix a rule the product depends on, add a small
  offline check (`scripts/verify-*.mjs`) and register it in `scripts/gates.mjs`; browser
  probes stay out of CI.
- **CSS changes refresh the baseline on purpose**: `node scripts/extract-css.mjs --write`,
  then include the regenerated `docs/architecture/baseline/css.json` in the PR.
- **Theme tokens only** — no hard-coded colours, radii or shadows; use the `--dsw-alias-*`
  / `--ds-*` variables so the card follows the app's theme.
- **Copy ships in both languages** (`zh` + `en`) and names the thing the way the UI does.
  Per-widget strings belong in that unit's `manifest.locale`, not in `src/client/i18n.ts`.
- **One concern per PR.** A rendering change and a settings-page redesign in the same diff
  make the measurement behind each one impossible to read.

## Reporting

- A wrong number, a frozen card, a console error → **Bug report** (include DSH version,
  plugin version, OS, and what the card showed).
- An idea for a card → **Widget idea** (say which data it reads and why it earns a place
  beside the conversation).
- Security issues: please do not open a public issue; use the repository's private
  vulnerability reporting.

## Code of conduct

Be specific and kind. Critique the measurement, not the person. English and Chinese are
both welcome; the README ships in both.
