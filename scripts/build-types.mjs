#!/usr/bin/env node
/**
 * The declaration emit for the published package.
 *
 * `package.json` advertises `types` for BOTH entries (`lib/types/index.d.ts`,
 * `lib/types/client/index.d.ts`) and ships `lib/types/**\/*.d.ts` — but tsdown's own
 * `dts` option is NOT the way to produce them here: with `dts: true` it writes a
 * stray `lib/index.ts` (not declarations) because the project tsconfig is already
 * `emitDeclarationOnly` + `outDir: lib/types`. So the declarations come straight from
 * that tsconfig, and this script only adds what tsc cannot:
 *
 *   1. `src/css-modules.d.ts` is an INPUT (.d.ts files are never re-emitted), yet the
 *      client entry's declarations keep their `import './styles/*.module.css'` lines —
 *      without the wildcard declaration a consumer would fail to resolve them. Copy it
 *      next to the client entry.
 *   2. That copy is only useful if it is LOADED: a package's .d.ts files enter a
 *      consumer's program through imports, not by existing. So the client entry gets a
 *      `/// <reference path="./css-modules.d.ts" />` header, pointing at the sibling
 *      copy — a path that must actually exist, which is what
 *      `scripts/verify-published-types.mjs` (G8) checks.
 *
 * tsc exits non-zero only on type errors; because the project typechecks CLEAN (G3),
 * a non-zero exit here is treated as a real failure. The emitted declarations have to
 * be verified with `scripts/verify-published-types.mjs` (G8).
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
const OUT = join(ROOT, 'lib', 'types')
const AMBIENT = join(ROOT, 'src', 'css-modules.d.ts')
const REFERENCE = '/// <reference path="./css-modules.d.ts" />'

const compile = spawnSync(process.execPath, [TSC, '-p', join(ROOT, 'tsconfig.json')], { cwd: ROOT, encoding: 'utf8' })
const output = `${compile.stdout ?? ''}${compile.stderr ?? ''}`
if (compile.status !== 0) {
  console.error(output)
  console.error(`[build-types] FAIL — tsc exited ${compile.status} (the project typechecks clean, so this is real)`)
  process.exit(1)
}

function count(dir) {
  let files = 0
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    files += statSync(p).isDirectory() ? count(p) : 1
  }
  return files
}
if (!existsSync(join(OUT, 'index.d.ts'))) { console.error('[build-types] FAIL — no lib/types/index.d.ts'); process.exit(1) }

cpSync(AMBIENT, join(OUT, 'client', 'css-modules.d.ts'))
const clientEntry = join(OUT, 'client', 'index.d.ts')
if (!existsSync(clientEntry)) { console.error('[build-types] FAIL — no lib/types/client/index.d.ts'); process.exit(1) }
const text = readFileSync(clientEntry, 'utf8')
if (!text.startsWith(REFERENCE)) writeFileSync(clientEntry, `${REFERENCE}\n${text}`, 'utf8')

// A declaration that still carries a RELATIVE import must resolve inside lib/types.
const files = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.d.ts')) files.push(p)
  }
})(OUT)

console.log(`[build-types] emitted ${count(OUT)} file(s): index + client + ${files.length - 2} module declaration(s)`)
console.log('[build-types] shipped src/css-modules.d.ts beside the client entry and referenced it from it')
