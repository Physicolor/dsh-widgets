#!/usr/bin/env node
/**
 * dsh-widgets — the DATA SOURCE CONTRACT gate (v1.11).
 *
 * The contract's promise is structural: **adding a data source changes ONE family
 * directory (its `adapter.ts`) plus ONE host module, and nothing else.** Text
 * alone cannot hold that promise, so this gate checks it three ways.
 *
 *   1. RESOLUTION — every `manifest.source` in every unit names a DISCOVERED
 *      adapter id. (The generator fails the build on this too; the gate makes the
 *      rule visible on its own, without a regeneration.)
 *   2. ISOLATION — the shared runtime files (the collector, the scheduler, the
 *      rail, the registry resolver, the generator) must not contain a source id
 *      as a string literal. The moment one does, "adding a source" is back to
 *      editing a central list.
 *   3. PROOF (`--prove`) — the acceptance criterion itself, executed: a temp
 *      family adapter + a temp widget unit declaring its source are created, the
 *      generator is run, and the new id must appear in the generated registry;
 *      removing the adapter must then make the generator FAIL for that manifest;
 *      everything is cleaned up and the registry restored byte-for-byte.
 *
 * Usage:
 *   node scripts/verify-source-contract.mjs           # gates 1 + 2 (fast, CI-safe)
 *   node scripts/verify-source-contract.mjs --prove   # adds the end-to-end proof
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { discoverAdapters } from './lib/sources.mjs'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))
const WIDGETS_DIR = join(ROOT, 'src', 'widgets')
const GENERATED = join(ROOT, 'src', 'client', 'generated.registry.ts')

/** Files that must stay source-id-free: the shared half of the runtime. */
const SHARED_FILES = [
  'src/client/data/collector.tsx',
  'src/client/data/source-poller.tsx',
  'src/client/data/sources.ts',
  'src/client/lib/registry.ts',
  'src/client/lib/contract/external.ts',
  'src/client/rail/rail-view.tsx',
  'src/client/index.ts',
  'scripts/gen-registry.mjs',
]

let failures = 0
const fail = (msg) => { console.error(`  FAIL ${msg}`); failures++ }
const pass = (msg) => console.log(`  ok   ${msg}`)

// ── 1. every manifest.source resolves to a discovered adapter ────────────────
const discovered = discoverAdapters(ROOT)
if (discovered.failures.length > 0) for (const f of discovered.failures) fail(f)
const ids = new Set(discovered.sources.map((s) => s.id))
console.log(`[source-contract] ${discovered.sources.length} adapter(s): ${[...ids].join(', ')}`)

/** Every discovered unit dir, with its parsed manifest. */
function unitManifests() {
  return readdirSync(WIDGETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()
    .flatMap((id) => {
      const file = join(WIDGETS_DIR, id, 'manifest.json')
      if (!existsSync(file)) return []
      try {
        return [{ id, manifest: JSON.parse(readFileSync(file, 'utf8')) }]
      } catch (e) {
        fail(`${id}/manifest.json is not JSON: ${e.message}`)
        return []
      }
    })
}

let declared = 0
for (const { id, manifest } of unitManifests()) {
  if (manifest.source === undefined) continue
  declared++
  if (!ids.has(manifest.source)) {
    fail(`${id}: manifest.source "${manifest.source}" matches no adapter (known: ${[...ids].join(', ')})`)
  }
}
if (declared > 0 && failures === 0) pass(`${declared} unit(s) declare a source, all resolved`)

// ── 2. the shared runtime names no source id ─────────────────────────────────
/**
 * Blank out comments (and keep newlines) before looking for a source id: prose is
 * allowed to say `usage` or `cc`, CODE is not. A tiny state machine beats a regex
 * here because the false positive that motivated it sits in a `/** … *\/` block
 * that mentions two ids in one sentence.
 */
function codeOnly(src) {
  let out = ''
  let state = 'code'
  let quote = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    const n = src[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i++; continue }
      if (c === '/' && n === '*') { state = 'block'; i++; continue }
      if (c === "'" || c === '"' || c === '`') { state = 'str'; quote = c }
      out += c
      continue
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += c } continue }
    if (state === 'block') { if (c === '*' && n === '/') { state = 'code'; i++ } else if (c === '\n') out += c; continue }
    // inside a string literal: copy verbatim (the ids we hunt for ARE literals)
    out += c
    if (c === '\\') { out += src[i + 1] ?? ''; i++; continue }
    if (c === quote) state = 'code'
  }
  return out
}

const literal = new RegExp(`['"\`](${[...ids].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})['"\`]`)
for (const rel of SHARED_FILES) {
  const file = join(ROOT, rel)
  if (!existsSync(file)) { fail(`${rel} is missing (the isolation list is stale)`); continue }
  const lines = codeOnly(readFileSync(file, 'utf8')).split('\n')
  const hit = lines.findIndex((line) => literal.test(line))
  if (hit !== -1) fail(`${rel}:${hit + 1} hard-codes a source id in code — adding a source must not touch this file (line: ${lines[hit].trim()})`)
}
if (failures === 0) pass(`${SHARED_FILES.length} shared file(s) carry no source id literal in code`)

// ── 3. --prove: the acceptance criterion, executed ───────────────────────────
if (process.argv.includes('--prove')) {
  const PROBE_WIDGET = 'zz-source-probe'
  const PROBE_FAMILY = 'zz-probe'
  const PROBE_SOURCE = 'probe-src'
  const widgetDir = join(WIDGETS_DIR, PROBE_WIDGET)
  const familyDir = join(ROOT, 'src', 'client', 'families', PROBE_FAMILY)
  const before = readFileSync(GENERATED, 'utf8')
  const runGenerator = () => {
    try {
      const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'gen-registry.mjs')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      return { code: 0, out }
    } catch (e) {
      return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
    }
  }
  try {
    mkdirSync(widgetDir, { recursive: true })
    mkdirSync(familyDir, { recursive: true })
    writeFileSync(join(familyDir, 'adapter.ts'), `import { defineSource } from '../../data/source-contract'\n\nexport const probeSource = defineSource({\n  id: '${PROBE_SOURCE}',\n  host: 'probe (contract gate)',\n  schedule: { mount: false },\n  pulls: () => [],\n})\n\nexport default probeSource\n`, 'utf8')
    writeFileSync(join(widgetDir, 'manifest.json'), `${JSON.stringify({
      id: PROBE_WIDGET,
      order: 9999,
      group: 'system',
      builtin: false,
      sizes: ['2x2'],
      source: PROBE_SOURCE,
      skeleton: { shape: 'text' },
      locale: {
        zh: { [`widget.${PROBE_WIDGET}.name`]: '契约探针', [`widget.${PROBE_WIDGET}.desc`]: '数据源契约验收用的临时单元' },
        en: { [`widget.${PROBE_WIDGET}.name`]: 'Contract probe', [`widget.${PROBE_WIDGET}.desc`]: 'Temporary unit for the source-contract gate' },
      },
    }, null, 2)}\n`, 'utf8')
    writeFileSync(join(widgetDir, 'index.ts'), `import { defineWidget } from '../../client/lib/contract/helpers'\n\nexport default defineWidget({\n  id: '${PROBE_WIDGET}',\n  name: () => 'probing',\n  desc: () => 'probing',\n  render: () => null,\n})\n`, 'utf8')

    const added = runGenerator()
    const generated = readFileSync(GENERATED, 'utf8')
    if (added.code !== 0) fail(`--prove: the generator rejected a unit whose source comes from a NEW family adapter:\n${added.out}`)
    else if (!generated.includes(PROBE_SOURCE) || !generated.includes(`src_${PROBE_FAMILY.replace(/-/g, '_')}`)) {
      fail('--prove: the generated registry did not pick up the new family adapter')
    } else pass('--prove: one family adapter + one unit was enough — the registry discovered the new source')

    // Negative half: the unit still declares the source, but no adapter provides
    // it. The build must fail loudly instead of shipping a card that waits for ever.
    rmSync(familyDir, { recursive: true, force: true })
    const orphaned = runGenerator()
    if (orphaned.code === 0) fail(`--prove: a manifest naming the unknown source "${PROBE_SOURCE}" was accepted`)
    else if (!orphaned.out.includes(PROBE_SOURCE)) fail(`--prove: the rejection does not name the unknown source:\n${orphaned.out}`)
    else pass('--prove: an unknown manifest.source is rejected by name')
  } finally {
    rmSync(widgetDir, { recursive: true, force: true })
    rmSync(familyDir, { recursive: true, force: true })
    const now = runGenerator()
    if (now.code !== 0) fail(`--prove: cleanup regeneration failed:\n${now.out}`)
    if (readFileSync(GENERATED, 'utf8') !== before) fail('--prove: the generated registry was not restored byte-for-byte')
    else pass('--prove: the tree and the generated registry are back to their pre-probe state')
  }
}

console.log(`\n[source-contract] ${failures === 0 ? 'PASS' : `FAIL — ${failures} problem(s)`}${process.argv.includes('--prove') ? ' (with --prove)' : ''}`)
process.exit(failures === 0 ? 0 : 1)
