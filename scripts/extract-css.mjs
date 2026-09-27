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
/** Concatenated in BUNDLE order = the order the <style> tags are created at runtime =
 *  the cascade order. This is the invariant the CSS layering phase must preserve: the
 *  stylesheet may be split into many files, but the concatenation stays byte-identical. */
let combined = ''
let at = 0
for (;;) {
  // rolldown renames the per-module locals when several CSS modules coexist (`css$5`,
  // `tagId$5`), so the search has to accept both the plain and the suffixed form.
  const cssAt = js.indexOf('const css', at)
  if (cssAt < 0) break
  const eq = js.indexOf(' = ', cssAt)
  if (eq < 0) break
  const lit = readJsonString(js, eq + 3)
  if (lit === null) { at = cssAt + 10; continue }
  at = lit.end
  let css
  try { css = JSON.parse(lit.raw) } catch { continue }
  // The generated block emits `const tagId = "..."` right AFTER `const css`.
  const tagAt = js.indexOf('const tagId', lit.end)
  if (tagAt < 0) die('found a CSS block with no tagId — the bundler plugin changed shape')
  const tagLit = readJsonString(js, js.indexOf(' = ', tagAt) + 3)
  if (tagLit === null) die('could not read the tagId literal')
  const tag = JSON.parse(tagLit.raw)
  found[tag] = { sha256: createHash('sha256').update(css).digest('hex'), bytes: Buffer.byteLength(css) }
  combined += css
}

const tags = Object.keys(found)
if (tags.length === 0) die('no compiled CSS found in the bundle')
const combinedHash = createHash('sha256').update(combined).digest('hex')
console.log(`[extract-css] ${tags.length} compiled stylesheet(s), combined ${Buffer.byteLength(combined)} B  ${combinedHash.slice(0, 16)}`)
for (const t of tags) console.log(`  ${t}  ${found[t].bytes} B  ${found[t].sha256.slice(0, 16)}`)

if (WRITE || !existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true })
  writeFileSync(BASELINE, `${JSON.stringify({ __combined: combinedHash, sheets: found }, null, 1)}\n`, 'utf8')
  console.log(`[extract-css] wrote baseline -> ${BASELINE}`)
  process.exit(0)
}

const raw = JSON.parse(readFileSync(BASELINE, 'utf8'))
// Backwards compatible with the pre-layering baseline (a flat tag -> hash map).
const baseCombined = raw.__combined ?? createHash('sha256').update(Object.values(raw).map((v) => v.sha256).join('')).digest('hex')
const baseSheets = raw.sheets ?? raw

if (baseCombined === combinedHash) {
  const moved = tags.filter((t) => !(t in baseSheets))
  console.log(`[extract-css] PASS — the concatenated stylesheet is byte-identical (${tags.length} tag(s)${moved.length > 0 ? `, ${moved.length} new file boundary/ies` : ''})`)
  process.exit(0)
}
console.error('[extract-css] FAIL — the concatenated CSS differs from the baseline:')
console.error(`  baseline ${baseCombined}`)
console.error(`  current  ${combinedHash}`)
for (const t of tags) {
  const b = baseSheets[t]
  if (b === undefined) console.error(`  NEW     ${t}  ${found[t].bytes} B`)
  else if (b.sha256 !== found[t].sha256) console.error(`  CHANGED ${t}  (${b.bytes} B -> ${found[t].bytes} B)`)
}
for (const t of Object.keys(baseSheets)) if (!tags.includes(t)) console.error(`  REMOVED ${t}`)
process.exit(1)

