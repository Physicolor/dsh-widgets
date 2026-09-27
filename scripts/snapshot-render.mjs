#!/usr/bin/env node
/**
 * G4 — the offline render snapshot gate.
 *
 * Compiles the React-free render closure (see scripts/tsconfig.snapshot.json),
 * runs every widget's render for every size × preview state × dictionary, and
 * compares the resulting `WidgetRenderOut` data against
 * `docs/architecture/baseline/render-snapshot.json`.
 *
 * This is the behaviour-preservation net for the architecture refactor: moving
 * code between modules must not change one field of these outputs.
 *
 * Usage:
 *   node scripts/snapshot-render.mjs --write    # (re)write the baseline
 *   node scripts/snapshot-render.mjs --check    # default: fail on any difference
 *   node scripts/snapshot-render.mjs            # same as --check
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
const BASELINE = join(ROOT, 'docs', 'architecture', 'baseline', 'render-snapshot.json')
const WRITE = process.argv.includes('--write')

function die(msg) { console.error(`[snapshot-render] ${msg}`); process.exit(1) }

// 1) Compile the render closure to CommonJS. Type errors inside the closure are
//    reported but do not block emission (the repo has pre-existing tsc errors).
const compile = spawnSync(process.execPath, [TSC, '-p', join(ROOT, 'scripts', 'tsconfig.snapshot.json')], {
  cwd: ROOT, encoding: 'utf8',
})
const compileOut = `${compile.stdout ?? ''}${compile.stderr ?? ''}`
const emitted = join(ROOT, '.tmp-snapshot', 'scripts', 'snapshot', 'render-harness.js')
if (!existsSync(emitted)) {
  console.error(compileOut)
  die(`the render closure did not compile (no ${emitted})`)
}
const typeErrors = (compileOut.match(/error TS\d+/g) ?? []).length
if (typeErrors > 0) console.log(`[snapshot-render] note: ${typeErrors} type error(s) inside the render closure (emitted anyway)`)

// 2) The repo is `"type": "module"`, so the emitted CommonJS has to be marked as
//    such for the directory it lives in.
writeFileSync(join(ROOT, '.tmp-snapshot', 'package.json'), '{"type":"commonjs"}\n', 'utf8')

// 3) Run the harness under a frozen clock / pinned TZ.
const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'snapshot', 'run.cjs')], {
  cwd: ROOT,
  env: { ...process.env, TZ: 'Asia/Shanghai' },
  encoding: 'utf8',
  maxBuffer: 128 * 1024 * 1024,
})
if (run.status !== 0) {
  console.error(run.stdout ?? '')
  console.error(run.stderr ?? '')
  die(`the render harness failed (exit ${run.status})`)
}
let next
try { next = JSON.parse(run.stdout) } catch (e) { die(`the harness did not emit JSON: ${e.message}`) }

const flat = (o) => [...o.zh.map((r) => ['zh', r]), ...o.en.map((r) => ['en', r])]
const rows = flat(next)
console.log(`[snapshot-render] ${rows.length} render outputs (${next.zh.length} zh + ${next.en.length} en)`)

if (WRITE) {
  mkdirSync(dirname(BASELINE), { recursive: true })
  writeFileSync(BASELINE, `${JSON.stringify(next, null, 1)}\n`, 'utf8')
  console.log(`[snapshot-render] wrote baseline -> ${BASELINE}`)
  process.exit(0)
}

if (!existsSync(BASELINE)) die(`no baseline at ${BASELINE} — run with --write first`)
const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
const baseRows = flat(base)
const baseByKey = new Map(baseRows.map(([loc, r]) => [`${loc}|${r.id}|${r.size}|${JSON.stringify(r.sim)}`, r.out]))
const nextByKey = new Map(rows.map(([loc, r]) => [`${loc}|${r.id}|${r.size}|${JSON.stringify(r.sim)}`, r.out]))

const problems = []
for (const [key, out] of nextByKey) {
  if (!baseByKey.has(key)) { problems.push(`NEW   ${key}`); continue }
  const a = JSON.stringify(baseByKey.get(key))
  const b = JSON.stringify(out)
  if (a !== b) problems.push(`DIFF  ${key}\n        baseline: ${a.slice(0, 400)}\n        current : ${b.slice(0, 400)}`)
}
for (const key of baseByKey.keys()) if (!nextByKey.has(key)) problems.push(`GONE  ${key}`)

if (problems.length > 0) {
  console.error(`[snapshot-render] FAIL — ${problems.length} difference(s) vs the baseline:`)
  for (const p of problems.slice(0, 12)) console.error(`  ${p}`)
  if (problems.length > 12) console.error(`  … and ${problems.length - 12} more`)
  process.exit(1)
}
console.log('[snapshot-render] PASS — every widget renders exactly as the baseline')
