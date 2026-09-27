#!/usr/bin/env node
/**
 * G6 — the change-set audit for MOVE-ONLY commits.
 *
 * A pure move (code leaves one module and lands in another) removes and adds the
 * same code. After normalizing away the things a move legitimately touches —
 * blank lines, comments, and import/export plumbing — the multiset of added code
 * lines must equal the multiset of removed ones. Anything left over is a line
 * that was REWRITTEN, which is exactly what this refactor must not do silently.
 *
 * It is a review aid, not a lint: interface parameterisation (Phase 2.4/2.5/2.6)
 * legitimately rewrites lines, so those commits are expected to report leftovers
 * and must be reviewed by hand.
 *
 * Usage:
 *   node scripts/audit-move-only.mjs                 # vs the working tree (HEAD)
 *   node scripts/audit-move-only.mjs <base-ref>      # vs a commit
 *   node scripts/audit-move-only.mjs <base-ref> --strict   # exit 1 on leftovers
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const STRICT = args.includes('--strict')
const base = args.find((a) => !a.startsWith('--')) ?? 'HEAD'

const diff = spawnSync('git', ['diff', '--unified=0', base, '--', 'src/'], { cwd: ROOT, encoding: 'utf8' })
if (diff.error) { console.error(`[audit-move] git failed: ${diff.error.message}`); process.exit(1) }

/** Drop the parts a move legitimately changes; keep everything else verbatim. */
function normalize(line) {
  let s = line.trim()
  if (s === '') return null
  if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('*/')) return null
  if (s.startsWith('import ') || s.startsWith('} from') || s.startsWith('from ')) return null
  // A newly exported symbol is plumbing, not a rewrite.
  s = s.replace(/^export\s+/, '').replace(/^default\s+/, '')
  if (s === '') return null
  return s
}

const added = []
const removed = []
for (const raw of diff.stdout.split('\n')) {
  if (raw.startsWith('+++') || raw.startsWith('---') || raw.startsWith('@@') || raw.startsWith('diff ') || raw.startsWith('index ')) continue
  if (raw.startsWith('+')) { const n = normalize(raw.slice(1)); if (n !== null) added.push(n) }
  else if (raw.startsWith('-')) { const n = normalize(raw.slice(1)); if (n !== null) removed.push(n) }
}

// `git diff` does not show untracked files, but a move into a NEW module is the
// most common shape here — count those files as fully added (read from disk, so
// the index is never touched).
const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'src/'], { cwd: ROOT, encoding: 'utf8' })
for (const rel of untracked.stdout.split('\n').filter((l) => l.trim() !== '')) {
  const text = readFileSync(join(ROOT, rel), 'utf8')
  for (const line of text.split('\n')) { const n = normalize(line); if (n !== null) added.push(n) }
}

const count = (arr) => arr.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map())
const a = count(added)
const r = count(removed)
const leftAdded = []
const leftRemoved = []
for (const [line, n] of a) { const was = r.get(line) ?? 0; if (n > was) leftAdded.push([line, n - was]) }
for (const [line, n] of r) { const was = a.get(line) ?? 0; if (n > was) leftRemoved.push([line, n - was]) }
const totalLeft = leftAdded.reduce((s, [, n]) => s + n, 0) + leftRemoved.reduce((s, [, n]) => s + n, 0)

console.log(`[audit-move] base ${base}: ${removed.length} removed / ${added.length} added code lines (comments + import plumbing ignored)`)
if (totalLeft === 0) {
  console.log('[audit-move] PASS — every added line matches a removed one: this is a pure move')
  process.exit(0)
}
console.log(`[audit-move] ${totalLeft} line(s) do NOT cancel out — these were REWRITTEN, review each:`)
for (const [line, n] of leftAdded.slice(0, 20)) console.log(`  +${n > 1 ? ` (x${n})` : ''} ${line.slice(0, 150)}`)
for (const [line, n] of leftRemoved.slice(0, 20)) console.log(`  -${n > 1 ? ` (x${n})` : ''} ${line.slice(0, 150)}`)
if (totalLeft > 40) console.log(`  … and more`)
process.exit(STRICT ? 1 : 0)
