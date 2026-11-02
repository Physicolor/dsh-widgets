## What changed

<!-- One paragraph: the behaviour before and after. Link the issue if there is one. -->

## How it was verified

- [ ] `pnpm check` (registry + tsc) is green
- [ ] `pnpm run build` then `pnpm test` (G1–G14) is green
- [ ] If a product rule changed: a new offline `scripts/verify-*.mjs` exists and is registered in `scripts/gates.mjs`
- [ ] If CSS changed: `node scripts/extract-css.mjs --write` ran and the baseline is included
- [ ] If a widget unit was added/changed: `manifest.id` === directory === `index.ts` id, and both `zh` + `en` copy is present

## Notes for the reviewer

<!-- Measurements, screenshots, or the reason a check is deliberately skipped. -->
