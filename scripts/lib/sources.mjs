/**
 * dsh-widgets — data-source adapter DISCOVERY (shared by the build pipeline).
 *
 * One adapter file per family: `src/client/families/<family>/adapter.ts`, holding
 * one or more `defineSource({ id: '...' })` declarations. This module is the
 * single source of truth for "which data sources exist", used by:
 *
 *   - `scripts/gen-registry.mjs`   → validates every `manifest.source` and emits
 *                                    `SOURCE_ADAPTERS` into the generated registry;
 *   - `scripts/validate-widget-unit.mjs` → the review gate for a submitted unit
 *                                    (built-in or third-party);
 *   - `scripts/verify-source-contract.mjs` → the structural guard that a new
 *                                    source touches one family dir and nothing else.
 *
 * Plain Node, no TypeScript: the ids are read out of the source text, exactly the
 * way the generator already reads a unit's `id`/`sizes` literals.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** The directory adapters live in, relative to the repo root. */
export const FAMILIES_DIR = ['src', 'client', 'families']

/** The one filename an adapter must use — the generator greps it by name. */
export const ADAPTER_FILE = 'adapter.ts'

/** `defineSource({ id: 'x' … })` — the declaration every adapter starts with. */
const DEFINE_RE = /defineSource\(\s*\{[\s\S]{0,600}?\bid\s*:\s*['"]([a-z0-9-]+)['"]/g

/** Every `defineSource` id declared in one adapter source text. */
export function adapterIdsIn(source) {
  const ids = []
  DEFINE_RE.lastIndex = 0
  let m
  while ((m = DEFINE_RE.exec(source)) !== null) ids.push(m[1])
  return ids
}

/**
 * Discover every adapter in the repo.
 * @param {string} root repo root
 * @returns {{ sources: Array<{ id: string, family: string, file: string }>, failures: string[] }}
 */
export function discoverAdapters(root) {
  const dir = join(root, ...FAMILIES_DIR)
  const failures = []
  const sources = []
  const seen = new Map()
  if (!existsSync(dir)) return { sources, failures: [`${FAMILIES_DIR.join('/')} does not exist`] }
  for (const family of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    if (family.startsWith('.')) continue
    const file = join(dir, family, ADAPTER_FILE)
    if (!existsSync(file)) {
      // A family without an adapter is normal (cc/github/sys/usage all have one,
      // but a family that renders only session projections needs none).
      continue
    }
    const rel = [...FAMILIES_DIR, family, ADAPTER_FILE].join('/')
    const ids = adapterIdsIn(readFileSync(file, 'utf8'))
    if (ids.length === 0) {
      failures.push(`${rel}: no \`defineSource({ id: '...' })\` found — a data source must declare its id`)
      continue
    }
    for (const id of ids) {
      if (seen.has(id)) {
        failures.push(`${rel}: adapter id "${id}" is already declared by ${seen.get(id)}`)
        continue
      }
      seen.set(id, rel)
      sources.push({ id, family, file: rel })
    }
  }
  if (sources.length === 0) failures.push(`${FAMILIES_DIR.join('/')}/*/${ADAPTER_FILE}: no data source adapter discovered`)
  return { sources, failures }
}
