#!/usr/bin/env node
/**
 * dsh-widgets — the THIRD-PARTY UNIT review gate (ARCH-004 / `widgets-market`).
 *
 * A contributed unit is a directory with the same two files a built-in unit has
 * (`manifest.json` + `index.ts`), submitted as a pull request against this repo or
 * bundled into a plugin that calls `registerExternalUnit` at runtime. This script
 * is the OFFLINE half of the review: it applies the same rule list the runtime
 * validator applies (src/client/lib/contract/external.ts — keep the R-numbers in
 * step), plus the two checks only a repository can make: the id must not collide
 * with a built-in unit, and the declared `source` must exist.
 *
 * Usage:
 *   node scripts/validate-external-unit.mjs <unit-dir> [<unit-dir> ...]
 *   node scripts/validate-external-unit.mjs --json <unit-dir>
 *   node scripts/validate-external-unit.mjs --self-test   # proves the gate itself
 *
 * Exit code 0 = acceptable; 1 = at least one violation (or a failed self-test).
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { discoverAdapters } from './lib/sources.mjs'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))
const SELF = fileURLToPath(import.meta.url)
const BUILTIN_DIR = join(ROOT, 'src', 'widgets')
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SIZES = ['2x2', '2x4']
const SKELETON_SHAPES = ['text', 'rings', 'bars', 'line', 'heatmap', 'figures', 'quotas']
const MANIFEST_KEYS = new Set(['id', 'order', 'group', 'builtin', 'defaultInstalled', 'sizes', 'locale', 'source', 'skeleton'])

const builtinIds = new Set(readdirSync(BUILTIN_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name))
const { sources, failures: sourceFailures } = discoverAdapters(ROOT)
const sourceIds = new Set(sources.map((s) => s.id))

/** Descriptor literals read straight out of the TS, the way the generator does. */
function readDescriptor(src) {
  const id = /(?:^|[^-\w])id\s*:\s*['"]([a-z0-9-]+)['"]/.exec(src)
  const sizes = /(?:^|[^-\w])sizes\s*:\s*\[([^\]]*)\]/.exec(src)
  const list = sizes
    ? sizes[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter((x) => x !== '')
    : ['2x2']
  return { id: id ? id[1] : null, sizes: list, hasRender: /(?:^|[^-\w])render\s*:/.test(src) }
}

/** Apply the R-list to one submitted unit directory. */
function reviewDir(dirArg) {
  const dir = resolve(dirArg)
  const name = basename(dir)
  const errors = []
  const warnings = []
  const manifestFile = join(dir, 'manifest.json')
  const indexFile = join(dir, 'index.ts')
  if (!existsSync(manifestFile)) errors.push('R1 manifest.json is missing')
  if (!existsSync(indexFile)) errors.push('R2 index.ts is missing')
  if (errors.length > 0) return { name, errors, warnings }

  let manifest
  try {
    const raw = readFileSync(manifestFile, 'utf8')
    if (raw.charCodeAt(0) === 0xfeff) throw new Error('UTF-8 BOM present (JSON parsers reject it)')
    manifest = JSON.parse(raw)
  } catch (e) {
    return { name, errors: [`R1 manifest.json is not valid JSON: ${e.message}`], warnings }
  }
  const src = readFileSync(indexFile, 'utf8')
  const desc = readDescriptor(src)

  const id = typeof manifest.id === 'string' ? manifest.id : ''
  if (!ID_RE.test(id)) errors.push(`R1 manifest.id "${String(manifest.id)}" is not kebab-case`)
  if (id !== name && desc.id === name) warnings.push(`directory "${name}" differs from manifest.id "${id}" (fine for a bundle; keep them equal when vendoring into src/widgets/)`)
  if (desc.id !== id) errors.push(`R2 index.ts id "${String(desc.id)}" !== manifest.id "${id}"`)
  if (builtinIds.has(id)) errors.push(`R3 id "${id}" collides with a built-in unit`)
  if (manifest.builtin === true) errors.push('R4 a third-party unit must not declare builtin: true')

  for (const k of Object.keys(manifest)) if (!MANIFEST_KEYS.has(k)) errors.push(`R4+ unknown manifest key "${k}" (known: ${[...MANIFEST_KEYS].join(', ')})`)
  const manifestSizes = Array.isArray(manifest.sizes) && manifest.sizes.length > 0 ? manifest.sizes : ['2x2']
  for (const s of manifestSizes) if (!SIZES.includes(s)) errors.push(`R5 unsupported size "${s}"`)
  for (const s of desc.sizes) if (!SIZES.includes(s)) errors.push(`R5 descriptor size "${s}" unsupported`)
  const norm = (a) => a.slice().sort().join(',')
  if (norm(manifestSizes) !== norm(desc.sizes)) errors.push(`R5 manifest sizes [${manifestSizes.join(', ')}] !== descriptor sizes [${desc.sizes.join(', ')}]`)
  if (manifest.source !== undefined && !sourceIds.has(manifest.source)) {
    errors.push(`R6 source "${manifest.source}" names no data-source adapter (known: ${[...sourceIds].join(', ')})`)
  }
  if (manifest.skeleton !== undefined) {
    const sk = manifest.skeleton
    if (sk === null || typeof sk !== 'object' || Array.isArray(sk)) errors.push('R7 skeleton must be an object')
    else {
      if (!SKELETON_SHAPES.includes(sk.shape)) errors.push(`R7 skeleton.shape "${String(sk.shape)}" is not one of ${SKELETON_SHAPES.join(' | ')}`)
      for (const k of Object.keys(sk)) if (!['shape', 'count', 'rows'].includes(k)) errors.push(`R7 unknown skeleton key "${k}"`)
      for (const k of ['count', 'rows']) {
        if (sk[k] !== undefined && (!Number.isInteger(sk[k]) || sk[k] < 1)) errors.push(`R7 skeleton.${k} must be a positive integer`)
      }
    }
  }
  for (const loc of ['zh', 'en']) {
    const dict = manifest.locale?.[loc]
    for (const key of [`widget.${id}.name`, `widget.${id}.desc`]) {
      if (dict === undefined || typeof dict[key] !== 'string' || dict[key] === '') errors.push(`R8 locale.${loc} is missing "${key}" (the market reads it)`)
    }
  }
  if (!desc.hasRender) errors.push('R9 index.ts declares no `render:` — the descriptor must render something (or return null)')
  if (manifest.order !== undefined && !Number.isInteger(manifest.order)) errors.push('R10 order must be an integer')
  warnings.push('runtime-only rules (defineWidget identity, render purity) are enforced at registration by src/client/lib/contract/external.ts')
  return { name, errors, warnings }
}

/** Write one fixture unit into `dir` (no BOM — the gate rejects one on purpose). */
function writeFixture(dir, manifest, descriptor) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  writeFileSync(join(dir, 'index.ts'), `${descriptor}\n`, 'utf8')
}

/** A valid submission, as the docs describe it. */
function validFixture(id) {
  return {
    manifest: {
      id,
      order: 900,
      group: 'other',
      builtin: false,
      sizes: ['2x2'],
      source: 'pricing',
      skeleton: { shape: 'text' },
      locale: {
        zh: { [`widget.${id}.name`]: '示例卡', [`widget.${id}.desc`]: '第三方单元示例' },
        en: { [`widget.${id}.name`]: 'Sample Card', [`widget.${id}.desc`]: 'Third-party unit example' },
      },
    },
    descriptor: `import { defineWidget } from 'dsh-widgets/client'\n\nexport default defineWidget({\n  id: '${id}',\n  name: () => 'Sample Card',\n  desc: () => 'Third-party unit example',\n  builtin: false,\n  sizes: ['2x2'],\n  render: () => null,\n})`,
  }
}

/**
 * `--self-test`: the gate checks itself.
 *
 * A review gate that accepts everything is worse than no gate, so CI runs this:
 * one valid submission must pass, and each of the three ways a submission
 * typically goes wrong (claiming `builtin`, waiting on a source that does not
 * exist, forgetting a market string) must be REJECTED.
 */
function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'dsh-external-unit-'))
  const run = (dir) => spawnSync(process.execPath, [SELF, dir], { encoding: 'utf8' }).status
  let failures = 0
  const expect = (label, actual, wanted) => {
    if (actual === wanted) console.log(`  ok   ${label}`)
    else { console.error(`  FAIL ${label} (exit ${actual}, wanted ${wanted})`); failures++ }
  }
  try {
    const good = validFixture('zz-self-good')
    writeFixture(join(tmp, 'zz-self-good'), good.manifest, good.descriptor)
    expect('a valid submission passes', run(join(tmp, 'zz-self-good')), 0)

    const builtin = validFixture('zz-self-builtin')
    builtin.manifest.builtin = true
    writeFixture(join(tmp, 'zz-self-builtin'), builtin.manifest, builtin.descriptor)
    expect('a unit claiming builtin:true is rejected', run(join(tmp, 'zz-self-builtin')), 1)

    const noSource = validFixture('zz-self-source')
    noSource.manifest.source = 'not-a-source'
    writeFixture(join(tmp, 'zz-self-source'), noSource.manifest, noSource.descriptor)
    expect('an unknown manifest.source is rejected', run(join(tmp, 'zz-self-source')), 1)

    const noLocale = validFixture('zz-self-locale')
    delete noLocale.manifest.locale.en['widget.zz-self-locale.desc']
    writeFixture(join(tmp, 'zz-self-locale'), noLocale.manifest, noLocale.descriptor)
    expect('a missing market string is rejected', run(join(tmp, 'zz-self-locale')), 1)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  console.log(`\n[external-unit] self-test ${failures === 0 ? 'PASS' : `FAIL — ${failures}`}`)
  return failures === 0 ? 0 : 1
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) process.exit(selfTest())

const asJson = args.includes('--json')
const dirs = args.filter((a) => !a.startsWith('--'))
if (dirs.length === 0) {
  console.error('[external-unit] usage: node scripts/validate-external-unit.mjs <unit-dir> [...] | --self-test')
  process.exit(1)
}

const results = dirs.map(reviewDir)
for (const f of sourceFailures) console.error(`[external-unit] adapter discovery: ${f}`)
if (asJson) console.log(JSON.stringify(results, null, 2))
else {
  for (const r of results) {
    console.log(`\n${r.name}:`)
    for (const e of r.errors) console.log(`  FAIL ${e}`)
    for (const w of r.warnings) console.log(`  note ${w}`)
    if (r.errors.length === 0) console.log('  ok   submission checklist passed')
  }
}
const failed = results.filter((r) => r.errors.length > 0)
console.log(`\n[external-unit] ${results.length} unit(s), ${failed.length} rejected`)
process.exit(failed.length === 0 && sourceFailures.length === 0 ? 0 : 1)
