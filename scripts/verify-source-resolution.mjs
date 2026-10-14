#!/usr/bin/env node
/**
 * G11 — the DATA SOURCE CONTRACT's decision rules, executed.
 *
 * `scripts/verify-source-contract.mjs` proves the contract is STRUCTURALLY sound
 * (adding a source touches one family dir). This gate proves it BEHAVES: which
 * sources get polled for a given installed set, which instances feed each source,
 * and at what cadence — all pure functions, compiled from the real modules into
 * `.tmp-contract` and run under plain `node`.
 *
 * Without it the scheduler's rules would only be witnessed by a live browser (and
 * this repo's live GUI is not always running), which is exactly the kind of gap a
 * "green CI" must not have.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
const OUT_DIR = join(ROOT, '.tmp-contract')
const ENTRY = join(OUT_DIR, 'scripts', 'contract', 'sources-harness.js')

// A stale output dir would let a deleted module satisfy an import (the same
// failure mode G4 documents), so clean before compiling.
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [TSC, '-p', join(ROOT, 'scripts', 'tsconfig.contract.json')], {
  cwd: ROOT,
  encoding: 'utf8',
})
if (!existsSync(ENTRY)) {
  console.error('[source-resolution] the harness did not compile:')
  console.error(`${compile.stdout ?? ''}${compile.stderr ?? ''}`.trim())
  process.exit(1)
}
// The repo is `type: module`; the emitted CJS needs its own scope.
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'package.json'), '{"type":"commonjs"}\n', 'utf8')

const run = spawnSync(process.execPath, [ENTRY], { cwd: ROOT, encoding: 'utf8' })
process.stdout.write(run.stdout ?? '')
process.stderr.write(run.stderr ?? '')
process.exit(run.status ?? 1)
