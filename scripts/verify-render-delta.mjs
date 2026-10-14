#!/usr/bin/env node
/**
 * dsh-widgets — RENDER-BASELINE DELTA against a git revision.
 *
 * WHY THIS EXISTS. The offline render snapshot (`docs/architecture/baseline/
 * render-snapshot.json`, G4) is a single committed file, so "did this change touch
 * anything besides my cards?" has to be answered against a REVISION, not against a
 * hand-kept copy of yesterday's file: the first attempt at this evidence used a
 * `.tmp-` copy that the next cleanup deleted, which left the claim unreproducible
 * (independent review, 2026-10-14). Reading the baseline out of git solves it —
 * `git show <rev>:docs/architecture/baseline/render-snapshot.json` is always there.
 *
 * IT REPORTS A MULTISET DIFF, which is the only honest shape for this file: the
 * snapshot is a list of `(locale, widget, size, sim) -> render output` rows, and a
 * row counts as
 *   - ADDED    when the key is new (a new unit, a new size, a new preview step);
 *   - CHANGED  when the key exists in both and the output differs;
 *   - REMOVED  when the key disappeared.
 * "Changed" is the number that matters: an addition is a new card, a CHANGE is a
 * regression in a shipped one.
 *
 * Usage:
 *   node scripts/verify-render-delta.mjs                 # vs HEAD
 *   node scripts/verify-render-delta.mjs v1.8.1          # vs a tag
 *   node scripts/verify-render-delta.mjs --expect calendar,clock,countdown,stopwatch,task-timer
 *        # fail (exit 1) unless the touched ids are exactly this set
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REL = 'docs/architecture/baseline/render-snapshot.json'
const argv = process.argv.slice(2)
const expectIdx = argv.indexOf('--expect')
const expected = expectIdx >= 0 ? (argv[expectIdx + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean) : null
const rev = argv.find((a, _i) => !a.startsWith('--') && a !== argv[expectIdx + 1]) ?? 'HEAD'

/** `(locale, widget, size, sim) -> output` for one snapshot object. */
const flatten = (snap) => {
  const rows = new Map()
  for (const [locale, list] of Object.entries(snap)) {
    for (const r of list) rows.set(`${locale}|${r.id}|${r.size}|${JSON.stringify(r.sim)}`, JSON.stringify(r.out))
  }
  return rows
}

let before
try {
  before = JSON.parse(execFileSync('git', ['show', `${rev}:${REL}`], { cwd: ROOT, maxBuffer: 2e8 }).toString('utf8'))
} catch (error) {
  console.error(`[render-delta] cannot read ${REL} at ${rev}: ${error.message.split('\n')[0]}`)
  process.exit(2)
}
const after = JSON.parse(readFileSync(join(ROOT, REL), 'utf8'))
const A = flatten(before)
const B = flatten(after)

const added = new Map()
const changed = new Set()
for (const [key, out] of B) {
  const id = key.split('|')[1]
  if (!A.has(key)) added.set(id, (added.get(id) ?? 0) + 1)
  else if (A.get(key) !== out) changed.add(id)
}
const removed = [...A.keys()].filter((k) => !B.has(k))

const touched = [...new Set([...added.keys(), ...changed, ...removed.map((k) => k.split('|')[1])])].sort()
console.log(`[render-delta] ${rev} → working tree: ${A.size} → ${B.size} rows`)
console.log(`[render-delta] added ${[...added.values()].reduce((a, b) => a + b, 0)} row(s) in ${added.size} id(s): ${[...added.keys()].sort().join(', ') || '(none)'}`)
console.log(`[render-delta] CHANGED existing rows: ${changed.size === 0 ? 'none' : [...changed].sort().join(', ')}`)
console.log(`[render-delta] removed rows: ${removed.length}${removed.length > 0 ? ` (${removed.slice(0, 5).join(' ; ')})` : ''}`)
for (const [id, n] of [...added.entries()].sort()) console.log(`[render-delta]   +${n}  ${id}`)

if (expected !== null) {
  const same = touched.length === expected.length && touched.every((id, i) => id === [...expected].sort()[i])
  if (!same) {
    console.error(`[render-delta] FAIL — touched ids ${touched.join(', ') || '(none)'} ≠ expected ${[...expected].sort().join(', ')}`)
    process.exit(1)
  }
  console.log('[render-delta] PASS — the touched id set is exactly the expected one')
}
