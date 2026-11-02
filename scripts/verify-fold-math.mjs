#!/usr/bin/env node
/**
 * dsh-widgets — the fold's maths, offline (gate G13).
 *
 * The open/close fold is the one animation this plugin drives itself, and since
 * 2026-10-21 its motion is a set of Web Animations whose keyframes are SAMPLES of
 * this repo's own map (`src/client/rail/wave/deck-cascade.ts`). Two failure modes
 * are invisible on a fast machine and expensive in the field:
 *
 *   - the sampled keyframes drifting off the continuous map (a card would land a
 *     few pixels away from the route `dsh-pinned-summary` and the 'zoom' shape
 *     share), and
 *   - an interruption no longer continuing from the current progress (the fold
 *     jumping or freezing when the user closes it mid-open).
 *
 * Both are checked by two deterministic, browser-free scripts. This runner exists
 * so the gate roster has ONE entry for them and CI needs no extra step.
 *
 * Run: node scripts/verify-fold-math.mjs   (also `node scripts/gates.mjs --only G13`)
 */
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)))
const SUITES = [
  ['scripts/verify-deck-cascade-unit.mjs', 'the fold engine: timeline, rank table, band, interruption, end states, sampled map'],
  ['scripts/verify-anim-curve-unit.mjs', 'the easing: the spring settle folded into the position curve'],
]

let worst = 0
for (const [file, what] of SUITES) {
  console.log(`\n── ${file} — ${what}`)
  const run = spawnSync(process.execPath, ['--experimental-strip-types', join(ROOT, file)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  })
  if (run.status !== 0) worst = 1
}

console.log(`\n${worst === 0 ? 'PASSED' : 'FAILED'} fold maths — ${SUITES.length} suites`)
process.exit(worst)
