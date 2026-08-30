#!/usr/bin/env node
/**
 * dsh-widgets — build-time widget discovery generator (ARCH-001).
 *
 * Scans `src/widgets/<id>/` units (one dir per widget), reads each unit's
 * `manifest.json` (machine-readable contract) plus its `index.ts` (descriptor),
 * validates the three-way id identity (dir name === manifest.id === ts id
 * literal), and emits `src/client/generated.registry.ts`.
 *
 * Why a generated registry instead of a hand-maintained central file:
 *  - a worker agent creating a widget touches ONLY its own unit dir; the
 *    registry is produced by this script, so no two workers ever compete for
 *    the same file;
 *  - `--check` mode diffs the current output (the `pnpm check` / CI guard):
 *    forgetting to regenerate after adding a widget fails the build loudly.
 *
 * Discovery rules:
 *  - every direct child dir of `src/widgets/` is a widget unit, EXCEPT dirs
 *    starting with `_` (family-shared assets, e.g. `_shared/locales.json`);
 *  - `src/widgets-template/` is OUTSIDE the scan root, so the template can
 *    never be discovered or registered accidentally;
 *  - widget units MUST contain `manifest.json` + `index.ts`.
 *
 * No runtime dependencies — plain Node.
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))
const WIDGETS_DIR = join(ROOT, 'src', 'widgets')
const OUT_FILE = join(ROOT, 'src', 'client', 'generated.registry.ts')
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SIZES = ['2x2', '2x4']

/** Load + parse JSON, dying with a readable path-tagged error. */
function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`[gen-registry] invalid JSON in ${relative(ROOT, file)}: ${e.message}`)
    process.exit(1)
  }
}

/** kebab-case id → safe TS identifier (context-water → w_context_water). */
function identFor(id) {
  return 'w_' + id.replace(/-/g, '_')
}

function main() {
  const checkMode = process.argv.includes('--check')

  // 1) Family-shared locale layers (`src/widgets/_shared/*.json`), applied
  //    BEFORE widget manifests so units can override family defaults.
  const sharedLocales = { zh: {}, en: {} }
  const sharedDir = join(WIDGETS_DIR, '_shared')
  if (existsSync(sharedDir)) {
    for (const f of readdirSync(sharedDir).filter((n) => n.endsWith('.json')).sort()) {
      const data = readJson(join(sharedDir, f))
      for (const loc of ['zh', 'en']) {
        const dict = data[loc]
        if (dict && typeof dict === 'object' && !Array.isArray(dict)) {
          for (const [k, v] of Object.entries(dict)) {
            if (typeof v !== 'string') continue
            if (sharedLocales[loc][k] !== undefined && sharedLocales[loc][k] !== v) {
              console.warn(`[gen-registry] warn: key ${k} redefined in _shared/${f} (kept first)`)
              continue
            }
            sharedLocales[loc][k] = v
          }
        }
      }
    }
  }

  // 2) Scan widget unit dirs (exclude `_`-prefixed family dirs).
  const dirs = readdirSync(WIDGETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()

  // 3) Load + validate every unit.
  const widgets = []
  const failures = []
  for (const id of dirs) {
    const dir = join(WIDGETS_DIR, id)
    const manifestFile = join(dir, 'manifest.json')
    const indexFile = join(dir, 'index.ts')
    if (!existsSync(manifestFile)) { failures.push(`${id}/manifest.json missing`); continue }
    if (!existsSync(indexFile)) { failures.push(`${id}/index.ts missing`); continue }
    if (!ID_RE.test(id)) { failures.push(`${id}: dir name is not kebab-case`); continue }

    const m = readJson(manifestFile)
    if (m.id !== id) { failures.push(`${id}: manifest.id "${m.id}" !== dir name`); continue }

    // three-way identity: dir === manifest.id === first `id: '...'` literal in index.ts
    const src = readFileSync(indexFile, 'utf8')
    const mId = /(?:^|[^-\w])id\s*:\s*['"]([a-z0-9-]+)['"]/.exec(src)
    if (!mId) { failures.push(`${id}: no \`id: '...'\` literal found in index.ts`); continue }
    if (mId[1] !== id) { failures.push(`${id}: index.ts id "${mId[1]}" !== manifest.id`); continue }

    if (m.template === true) { failures.push(`${id}: 'template: true' in a discovered unit — templates live under src/widgets-template/`); continue }
    const sizes = Array.isArray(m.sizes) && m.sizes.length > 0 ? m.sizes : ['2x2']
    for (const s of sizes) if (!SIZES.includes(s)) { failures.push(`${id}: unsupported size "${s}"`); continue }
    for (const loc of ['zh', 'en']) {
      const dict = m.locale?.[loc]
      if (dict !== undefined && (typeof dict !== 'object' || Array.isArray(dict))) {
        failures.push(`${id}: locale.${loc} must be an object (or absent)`); continue
      }
    }
    const order = m.order !== undefined ? m.order : 1000
    if (!Number.isInteger(order)) { failures.push(`${id}: order must be an integer`); continue }

    widgets.push({ id, manifest: m, sizes, order, defaultInstalled: m.defaultInstalled === true, builtin: m.builtin !== false })
  }
  if (failures.length > 0) {
    console.error('[gen-registry] discovery failed:')
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }

  // 4) Deterministic order: display `order` (stats family first), ties by id.
  widgets.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  // 5) Merge per-widget locales over the shared layers.
  const locales = { zh: { ...sharedLocales.zh }, en: { ...sharedLocales.en } }
  for (const w of widgets) {
    for (const loc of ['zh', 'en']) {
      const dict = w.manifest.locale?.[loc]
      if (!dict) continue
      for (const [k, v] of Object.entries(dict)) {
        if (typeof v !== 'string') continue
        if (locales[loc][k] !== undefined && locales[loc][k] !== v) {
          console.warn(`[gen-registry] warn: locale ${loc} key "${k}" differs between widgets (last wins: ${w.id})`)
        }
        locales[loc][k] = v
      }
    }
  }

  // 6) Build the generated module.
  // NOTE: this file lives at src/client/, so the unit import root is '../widgets'
  // (not '../../widgets', which would reach the repo root).
  const imports = widgets.map((w) => `import ${identFor(w.id)} from '../widgets/${w.id}'`).join('\n')
  const instances = widgets
    .flatMap((w) => w.sizes.map((s) => (s === '2x4' ? `\`${w.id}@2x4\`` : `\`${w.id}@2x2\``)))
  const statsIds = widgets.filter((w) => w.defaultInstalled).map((w) => `'${w.id}'`)
  const defaultInstalled = widgets.filter((w) => w.defaultInstalled).map((w) => `\`${w.id}@2x2\``)

  const out = `/**
 * dsh-widgets — GENERATED widget registry. DO NOT EDIT BY HAND.
 *
 * Produced by scripts/gen-registry.mjs from the unit dirs under src/widgets/
 * (the machine-readable part comes from each unit's manifest.json; the
 * descriptors come from each unit's index.ts). Regenerate with:
 *   pnpm gen:registry        (write)
 *   pnpm check:registry      (verify up-to-date — the build/CI guard)
 *
 * Adding a widget = creating one unit dir; the registry follows automatically.
 */

${imports}

/** Every discovered widget, in manifest display order (then by id). */
export const WIDGETS: import('./lib/contract').Widget[] = [
${widgets.map((w) => `  ${identFor(w.id)},`).join('\n')}
]

/** All widget ids, in registry order. */
export const ALL_IDS: string[] = [
${widgets.map((w) => `  '${w.id}',`).join('\n')}
]

/** Every valid instance key (each widget at each of its supported sizes). */
export const ALL_INSTANCES: string[] = [
${instances.map((x) => `  ${x},`).join('\n')}
]

/** The stats-line family (fresh installs pre-load ONLY these). */
export const STATS_WIDGET_IDS: string[] = [
${statsIds.map((x) => `  ${x},`).join('\n')}
]

/** The default installed set: the stats-line family at 2×2. */
export const DEFAULT_INSTALLED: string[] = [
${defaultInstalled.map((x) => `  ${x},`).join('\n')}
]

/** Merged per-widget dictionaries (family-shared + every unit's locale).
 *  Registered with the locale service at apply() time. */
export const WIDGET_LOCALES: { zh: Record<string, string>; en: Record<string, string> } = {
  zh: {
${Object.entries(locales.zh).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
  },
  en: {
${Object.entries(locales.en).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
  },
}
`

  if (checkMode) {
    const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : null
    if (current === out) {
      console.log(`[gen-registry] OK — ${widgets.length} widget unit(s) up to date (${relative(ROOT, OUT_FILE)})`)
      return
    }
    console.error(`[gen-registry] STALE — ${widgets.length} widget(s) discovered but ${relative(ROOT, OUT_FILE)} differs.`)
    console.error('  Run `pnpm gen:registry` (or `pnpm build`) and commit the regeneration.')
    process.exit(1)
  }

  writeFileSync(OUT_FILE, out, 'utf8')
  console.log(`[gen-registry] wrote ${relative(ROOT, OUT_FILE)} — ${widgets.length} widget unit(s), ${Object.keys(locales.zh).length} zh / ${Object.keys(locales.en).length} en keys`)
}

main()