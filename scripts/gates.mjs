#!/usr/bin/env node
/**
 * dsh-widgets — THE GATE RUNNER (`pnpm test`).
 *
 * Every quality gate this repo owns runs offline, on the built tree, with no
 * browser and no network — which is exactly why they belong in CI instead of
 * living only on the owner's machine. This script is the single entry point so
 * that "what CI checks" and "what I check before pushing" can never drift.
 *
 * Usage:
 *   node scripts/gates.mjs                 # run every gate, exit 1 on any failure
 *   node scripts/gates.mjs --list          # print the roster and exit
 *   node scripts/gates.mjs --only G1,G9    # run a subset
 *   node scripts/gates.mjs --skip G5       # skip a gate (say why in the PR)
 *
 * ONE PRECONDITION: G5 (`extract-css`) reads the COMPILED stylesheet out of
 * `lib/client.js`, so it needs a build first:
 *
 *     pnpm run build && pnpm test
 *
 * CI does exactly that (see .github/workflows/ci.yml). A CSS edit therefore turns
 * G5 red until the baseline is refreshed on purpose —
 * `node scripts/extract-css.mjs --write` — which is the point of the gate.
 */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))

/** The roster: id → { what it proves, command }. Order is cheapest-first. */
const GATES = [
  { id: 'G1', name: 'registry', what: 'every unit dir === manifest === descriptor, and the generated registry is up to date', args: ['scripts/gen-registry.mjs', '--check'] },
  { id: 'G9', name: 'source-contract', what: 'data sources resolve + no shared file hard-codes a source id + a new source needs one family dir (--prove)', args: ['scripts/verify-source-contract.mjs', '--prove'] },
  { id: 'G2', name: 'units', what: 'unit contract + locale completeness (the same review gate a submitted unit passes)', args: ['scripts/validate-widget-unit.mjs'] },
  { id: 'G10', name: 'external-review', what: 'the third-party submission gate rejects builtin claims, unknown sources and missing market strings', args: ['scripts/validate-external-unit.mjs', '--self-test'] },
  { id: 'G8', name: 'host-routes', what: 'every host route keeps its status and shape', args: ['scripts/snapshot-host-routes.mjs'] },
  { id: 'G12', name: 'balance-fold', what: 'the DeepSeek balance channel\'s derived day\'s spend (the ledger fold) and every one of its error codes, offline against the built bundle', args: ['scripts/verify-deepseek-balance.mjs'] },
  { id: 'G3', name: 'types', what: 'no NEW type error against the recorded baseline', args: ['scripts/verify-tsc-baseline.mjs'] },
  { id: 'G4', name: 'render', what: 'every widget renders byte-identically to the recorded snapshot (zh + en)', args: ['scripts/snapshot-render.mjs', '--check'] },
  { id: 'G11', name: 'source-resolution', what: 'which sources a given install polls, which instances feed them, and at what cadence (pure rules, executed)', args: ['scripts/verify-source-resolution.mjs'] },
  { id: 'G5', name: 'css', what: 'the compiled stylesheet is byte-identical to the baseline (needs a build first)', args: ['scripts/extract-css.mjs'] },
  { id: 'G7', name: 'published-types', what: 'both package entries resolve through package.json exports with 0 diagnostics', args: ['scripts/verify-published-types.mjs'] },
]

const argv = process.argv.slice(2)
const flag = (name) => {
  const at = argv.indexOf(`--${name}`)
  return at === -1 ? undefined : argv[at + 1]
}

if (argv.includes('--list')) {
  for (const g of GATES) console.log(`${g.id}  ${g.name.padEnd(16)} ${g.what}`)
  process.exit(0)
}

const only = flag('only')?.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
const skip = new Set((flag('skip') ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
const roster = GATES.filter((g) => (only === undefined || only.includes(g.id)) && !skip.has(g.id))
if (roster.length === 0) {
  console.error('[gates] nothing to run — check --only/--skip')
  process.exit(1)
}

const results = []
for (const gate of roster) {
  const started = Date.now()
  const run = spawnSync(process.execPath, gate.args, { cwd: ROOT, encoding: 'utf8' })
  const ms = Date.now() - started
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
  const ok = run.status === 0
  results.push({ gate, ok, ms, output })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${gate.id} ${gate.name}  (${ms} ms)`)
  // A passing gate prints its own one-line verdict; a failing one gets enough of
  // its output to be actionable without opening a log file.
  const lines = output.split(/\r?\n/).filter((l) => l.trim() !== '')
  for (const line of (ok ? lines.slice(-1) : lines.slice(-25))) console.log(`      ${line}`)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n[gates] ${results.length - failed.length}/${results.length} passed in ${results.reduce((a, r) => a + r.ms, 0)} ms`)
if (failed.length > 0) {
  console.error(`[gates] FAIL — ${failed.map((r) => r.gate.id).join(', ')}`)
  process.exit(1)
}
console.log('[gates] PASS — every gate is green')
