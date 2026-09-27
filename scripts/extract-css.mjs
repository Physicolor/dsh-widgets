#!/usr/bin/env node
/**
 * G5 — the compiled-CSS invariant.
 *
 * Every `.module.css` is compiled by lightningcss (pattern `[local]`, so class
 * names are NOT hashed) and inlined into `lib/client.js` as
 * `<style data-plugin-css="<src-relative path>">`. The compiled text depends only
 * on the declarations — not on which file they live in — so the CSS-layering
 * phase can be proven visually inert by requiring this text to stay
 * byte-identical.
 *
 * Usage:
 *   node scripts/extract-css.mjs --write   # record the baseline hashes
 *   node scripts/extract-css.mjs           # default: fail on any change
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = join(ROOT, 'lib', 'client.js')
const BASELINE = join(ROOT, 'docs', 'architecture', 'baseline', 'css.json')
const WRITE = process.argv.includes('--write')

function die(msg) { console.error(`[extract-css] ${msg}`); process.exit(1) }
if (!existsSync(BUNDLE)) die(`no ${BUNDLE} — run "pnpm build" first`)

const js = readFileSync(BUNDLE, 'utf8')

/** Walk the JSON string literal that starts at `pos` (which must be a quote). */
function readJsonString(src, pos) {
  if (src[pos] !== '"') return null
  let i = pos + 1
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') { i += 2; continue }
    if (ch === '"') return { raw: src.slice(pos, i + 1), end: i + 1 }
    i += 1
  }
  return null
}

const found = {}
let at = 0
for (;;) {
  const cssAt = js.indexOf('const css = ', at)
  if (cssAt < 0) break
  const lit = readJsonString(js, cssAt + 'const css = '.length)
  if (lit === null) { at = cssAt + 12; continue }
  at = lit.end
  let css
  try { css = JSON.parse(lit.raw) } catch { continue }
  // The generated block emits `const tagId = "..."` right AFTER `const css`.
  const tagAt = js.indexOf('const tagId = ', lit.end)
  if (tagAt < 0) die('found a CSS block with no tagId — the bundler plugin changed shape')
  const tagLit = readJsonString(js, tagAt + 'const tagId = '.length)
  if (tagLit === null) die('could not read the tagId literal')
  const tag = JSON.parse(tagLit.raw)
  found[tag] = { sha256: createHash('sha256').update(css).digest('hex'), bytes: Buffer.byteLength(css) }
}

const tags = Object.keys(found)
if (tags.length === 0) die('no compiled CSS found in the bundle')
console.log(`[extract-css] ${tags.length} compiled stylesheet(s):`)
for (const t of tags) console.log(`  ${t}  ${found[t].bytes} B  ${found[t].sha256.slice(0, 16)}`)

if (WRITE || !existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true })
  writeFileSync(BASELINE, `${JSON.stringify(found, null, 1)}\n`, 'utf8')
  console.log(`[extract-css] wrote baseline -> ${BASELINE}`)
  process.exit(0)
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
const problems = []
for (const t of tags) {
  if (!(t in base)) { problems.push(`NEW STYLESHEET ${t}`); continue }
  if (base[t].sha256 !== found[t].sha256) problems.push(`CHANGED ${t}  (${base[t].bytes} B -> ${found[t].bytes} B)`)
}
for (const t of Object.keys(base)) if (!tags.includes(t)) problems.push(`REMOVED STYLESHEET ${t}`)

if (problems.length > 0) {
  console.error(`[extract-css] FAIL — ${problems.length} change(s):`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log('[extract-css] PASS — the compiled CSS is byte-identical')
