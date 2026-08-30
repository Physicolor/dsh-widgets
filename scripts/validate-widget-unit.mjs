#!/usr/bin/env node
/**
 * dsh-widgets — widget unit validator (ARCH-002 Workflow self-check / review).
 *
 * Verifies a widget unit CONTRACT + locale completeness WITHOUT running the
 * registry generator or the build. Used by:
 *   - Worker Agent self-check (after implementing a unit, before delivery);
 *   - Independent Review Agent (REVIEW step);
 *   - CI/main-agent pre-integration gate.
 *
 * Checks per unit dir:
 *   1. manifest.json exists / parses / schema-valid
 *   2. index.ts exists
 *   3. id three-way consistency (dir name === manifest.id === index.ts id literal)
 *   4. locale completeness: every `t('widget.<id>.*')` / `t('card.<id>.*')`
 *      key referenced by index.ts must exist in BOTH manifest.locale.zh and .en
 *   5. `template: true` in a discovered unit is rejected
 *   6. warn-only: non-local keys referenced via t() (shell/family keys)
 *
 * Usage:
 *   node scripts/validate-widget-unit.mjs [dir...]
 *     - zero args  : scan all discovered units under src/widgets/
 *     - with args  : validate exactly the given unit dirs
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))
const WIDGETS_DIR = join(ROOT, 'src', 'widgets')
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SIZES = ['2x2', '2x4']

function readJson(file) {
  try {
    const raw = readFileSync(file, 'utf8')
    if (raw.charCodeAt(0) === 0xfeff) throw new Error('UTF-8 BOM present (JSON parsers reject it)')
    return JSON.parse(raw)
  } catch (e) {
    return { __error: `invalid JSON: ${e.message}` }
  }
}

/** Extract every string literal passed to t(...) in the unit source. */
function tKeys(src) {
  const keys = new Set()
  const re = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g
  let m
  while ((m = re.exec(src)) !== null) keys.add(m[2])
  return [...keys]
}

const results = []
let failures = 0
let warnings = 0

function validateDir(name, dir) {
  const rel = relative(ROOT, dir)
  const checks = []
  const ok = (c) => checks.push(`  ✅ ${c}`)
  const bad = (c) => { checks.push(`  ❌ ${c}`); failures++ }
  const warn = (c) => { checks.push(`  ⚠  ${c}`); warnings++ }

  const manifestFile = join(dir, 'manifest.json')
  const indexFile = join(dir, 'index.ts')

  if (!existsSync(manifestFile)) bad(`${rel}/manifest.json missing`)
  if (!existsSync(indexFile)) bad(`${rel}/index.ts missing`)

  if (existsSync(manifestFile) && existsSync(indexFile)) {
    if (!ID_RE.test(name)) bad(`${rel}: dir name is not kebab-case`)
    const m = readJson(manifestFile)
    if (m.__error) { bad(`${rel}/manifest.json ${m.__error}`) }
    else {
      if (m.id !== name) bad(`manifest.id "${m.id}" !== dir name "${name}"`)
      else ok('manifest.id === dir name')
      for (const f of ['group', 'badgeLabel']) {
        if (m[f] !== undefined && typeof m[f] !== 'string') bad(`manifest.${f} must be a string`)
      }
      if (m.order !== undefined && !Number.isInteger(m.order)) bad('manifest.order must be an integer')
      if (m.builtin !== undefined && typeof m.builtin !== 'boolean') bad('manifest.builtin must be a boolean')
      if (m.defaultInstalled !== undefined && typeof m.defaultInstalled !== 'boolean') bad('manifest.defaultInstalled must be a boolean')
      if (m.sizes !== undefined) {
        if (!Array.isArray(m.sizes) || !m.sizes.every((s) => SIZES.includes(s))) bad(`manifest.sizes invalid (allowed: ${SIZES.join('/')})`)
        else ok('manifest.sizes valid')
      }
      if (m.template === true) bad("manifest.template:true not allowed in the discovery root (templates live under src/widgets-template/)")
      for (const loc of ['zh', 'en']) {
        const dict = m.locale?.[loc]
        if (dict !== undefined && (typeof dict !== 'object' || Array.isArray(dict))) bad(`manifest.locale.${loc} must be an object`)
      }
    }
    const src = readFileSync(indexFile, 'utf8')
    const idM = /(?:^|[^-\w])id\s*:\s*['"]([a-z0-9-]+)['"]/.exec(src)
    if (!idM) bad(`${rel}/index.ts: no \`id: '...'\` literal found`)
    else if (idM[1] !== name) bad(`index.ts id "${idM[1]}" !== dir name`)
    else ok('index.ts id literal === dir name')

    // Locale completeness for widget-local keys.
    const m2 = readJson(manifestFile)
    const keys = tKeys(src)
    const localKeys = keys.filter((k) => k.startsWith(`widget.${name}.`) || k.startsWith(`card.${name}.`))
    if (localKeys.length > 0) {
      const missingZh = localKeys.filter((k) => !m2.__error && !(m2.locale?.zh?.[k] !== undefined))
      const missingEn = localKeys.filter((k) => !m2.__error && !(m2.locale?.en?.[k] !== undefined))
      if (missingZh.length) bad(`locale.zh missing keys: ${missingZh.join(', ')}`)
      else ok(`locale.zh covers ${localKeys.length} local t() key(s)`)
      if (missingEn.length) bad(`locale.en missing keys: ${missingEn.join(', ')}`)
      else ok(`locale.en covers ${localKeys.length} local t() key(s)`)
    } else {
      warn('no widget-local t() keys found (ok for pure-stats widgets with no strings)')
      if (!m2.__error && !m2.locale?.zh?.[`widget.${name}.name`]) warn('no widget.<id>.name in locale.zh (market will show the raw key)')
      if (!m2.__error && !m2.locale?.en?.[`widget.${name}.name`]) warn('no widget.<id>.name in locale.en')
    }
    const external = keys.filter((k) => !k.startsWith(`widget.${name}.`) && !k.startsWith(`card.${name}.`))
    if (external.length) warn(`references non-local t() keys (shell/family — resolved at runtime): ${[...new Set(external)].join(', ')}`)
  }
  results.push({ name, checks })
}

const args = process.argv.slice(2)
let targets = []
if (args.length === 0) {
  targets = readdirSync(WIDGETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()
} else {
  targets = args.map((a) => a.replace(/[\\/]+$/, '').split(/[\\/]/).pop())
}

for (const name of targets) validateDir(name, join(WIDGETS_DIR, name))

for (const r of results) {
  console.log(`\n${r.name}:`)
  console.log(r.checks.join('\n'))
}
console.log(`\n[validate] ${results.length} unit(s), ${failures} failure(s), ${warnings} warning(s)`)
process.exit(failures === 0 ? 0 : 1)