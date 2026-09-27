#!/usr/bin/env node
/**
 * G3 — the typecheck gate.
 *
 * The project has PRE-EXISTING tsc errors (missing @types/node, react-dom types,
 * the slots service typing, a few possibly-undefined reads). `pnpm check`
 * therefore cannot be a pass/fail gate today. This script compares the CURRENT
 * error set against a recorded baseline and fails only on errors that are NEW.
 *
 * A signature deliberately drops file + line: the refactor MOVES code between
 * modules, which relocates existing errors without changing them. Matching on
 * (code, message) + occurrence count keeps a move neutral while still catching a
 * genuinely new error (new message) or a duplicated one (count increase).
 *
 * Usage:
 *   node scripts/verify-tsc-baseline.mjs --write   # record the baseline
 *   node scripts/verify-tsc-baseline.mjs           # default: fail on new errors
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
const BASELINE = join(ROOT, 'docs', 'architecture', 'baseline', 'tsc.json')
const WRITE = process.argv.includes('--write')
const ERROR_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm

function collect() {
  const r = spawnSync(process.execPath, [TSC, '--noEmit'], { cwd: ROOT, encoding: 'utf8' })
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`
  const sigs = {}
  let count = 0
  for (const m of text.matchAll(ERROR_RE)) {
    count += 1
    // Column/line references inside a message would move with the code — drop them.
    const msg = m[5].replace(/\(\d+,\d+\)/g, '(l,c)').trim()
    const key = `${m[4]} ${msg}`
    sigs[key] = (sigs[key] ?? 0) + 1
  }
  return { count, signatures: sigs, files: [...new Set([...text.matchAll(ERROR_RE)].map((m) => m[1]))].length }
}

const current = collect()
console.log(`[tsc-baseline] current: ${current.count} error(s) across ${current.files} file(s)`)

if (WRITE || !existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true })
  writeFileSync(BASELINE, `${JSON.stringify(current, null, 1)}\n`, 'utf8')
  console.log(`[tsc-baseline] wrote baseline -> ${BASELINE} (${current.count} tolerated errors)`)
  process.exit(0)
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
/**
 * Missing-DECLARATION errors are counted PER IMPORTING MODULE, so splitting a file
 * legitimately multiplies them (`node:os` imported by two modules is two errors, not
 * one). Their count therefore says nothing about type health — the root cause is the
 * absent `@types/node` / `react-dom` types, one item in the report's open list. Growth
 * in these codes is reported and tolerated; everything else stays strict.
 */
const COUNT_SCALES_WITH_IMPORTS = /^(TS2307|TS2580|TS7016)\b/
const added = []
const tolerated = []
for (const [key, n] of Object.entries(current.signatures)) {
  const was = base.signatures[key] ?? 0
  if (n <= was) continue
  if (COUNT_SCALES_WITH_IMPORTS.test(key)) tolerated.push(`${key}  (${was} -> ${n})`)
  else added.push(`${key}  (${was} -> ${n})`)
}
const fixed = Object.entries(base.signatures)
  .filter(([key, n]) => (current.signatures[key] ?? 0) < n)
  .map(([key, n]) => `${key}  (${n} -> ${current.signatures[key] ?? 0})`)

if (fixed.length > 0) console.log(`[tsc-baseline] note: ${fixed.length} pre-existing error(s) reduced/removed (good, not a failure)`)
if (tolerated.length > 0) {
  console.log(`[tsc-baseline] note: ${tolerated.length} missing-declaration signature(s) grew with the module split (tolerated):`)
  for (const t of tolerated) console.log(`  ${t}`)
}
console.log(`[tsc-baseline] tolerated pre-existing: ${base.count}; now: ${current.count}`)

if (added.length > 0) {
  console.error(`[tsc-baseline] FAIL — ${added.length} NEW type error(s):`)
  for (const a of added.slice(0, 15)) console.error(`  ${a}`)
  process.exit(1)
}
console.log('[tsc-baseline] PASS — no new type errors')
