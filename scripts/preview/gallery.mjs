/**
 * dsh-widgets — build and shoot the offline CARD GALLERY.
 *
 * One command turns the current source tree into a page a browser can open and a
 * set of PNGs a human (or an agent with image input) can LOOK at:
 *
 *   node scripts/preview/gallery.mjs                 # every widget → screenshots
 *   node scripts/preview/gallery.mjs --only cache,tool
 *   node scripts/preview/gallery.mjs --sizes 2x4
 *   node scripts/preview/gallery.mjs --no-shot       # build the page only
 *   node scripts/preview/gallery.mjs --dark          # dark theme
 *
 * Steps: regenerate the registry (so a NEW widget directory is discovered) →
 * bundle the render closure with tsdown → write `.tmp-gallery/index.html` with
 * the real theme tokens → screenshot every card cell with the repo's own
 * chromium resolution (`scripts/lib/chrome.cjs`).
 *
 * The page stays on disk afterwards: `file://…/.tmp-gallery/index.html` is the
 * interactive demo, and `docs/preview/cards/` holds the PNGs.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright-core')
const { chromePath } = require(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'chrome.cjs'))

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, '.tmp-gallery')
const SHOT_DIR = join(ROOT, 'docs', 'preview', 'cards')
const TOKENS = join(ROOT, 'docs', 'preview', 'theme-tokens.css')

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const value = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const ONLY = value('--only')?.split(',').map((s) => s.trim()).filter(Boolean)
const SIZES = value('--sizes')?.split(',').map((s) => s.trim()).filter(Boolean)
const DARK = flag('--dark')
const NO_SHOT = flag('--no-shot')

function run(cmd, args, label) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    console.error(`[gallery] ${label} failed\n${r.stdout ?? ''}${r.stderr ?? ''}`)
    process.exit(1)
  }
  return `${r.stdout ?? ''}${r.stderr ?? ''}`
}

function die(msg) { console.error(`[gallery] ${msg}`); process.exit(1) }

// 1) The registry is a build product: a widget directory that is not in it does
//    not exist as far as the gallery is concerned.
run(process.execPath, ['scripts/gen-registry.mjs'], 'gen-registry')

// 2) Bundle the render closure.
rmSync(join(OUT_DIR, 'gallery.js'), { force: true })
run('npx', ['tsdown', '--config', 'tsdown.gallery.config.ts'], 'tsdown (gallery)')
if (!existsSync(join(OUT_DIR, 'gallery.js'))) die('no .tmp-gallery/gallery.js emitted')

// 3) Vendor the React UMD builds the bundle expects as globals. React lives in
//    this repo's own node_modules; react-dom is resolved from the npx cache the
//    harness itself uses (it is a peer the plugin never bundles).
const REACT = join(ROOT, 'node_modules', 'react', 'umd', 'react.development.js')
const REACT_DOM = 'C:/Users/12404/AppData/Local/npm-cache/_npx/6c7f445d1bf61956/node_modules/react-dom/umd/react-dom.development.js'
for (const [src, name] of [[REACT, 'react.js'], [REACT_DOM, 'react-dom.js']]) {
  if (!existsSync(src)) die(`missing ${src}`)
  copyFileSync(src, join(OUT_DIR, name))
}
if (!existsSync(TOKENS)) die(`missing ${TOKENS} — run scripts/preview/dump-theme-tokens.cjs first`)
copyFileSync(TOKENS, join(OUT_DIR, 'theme-tokens.css'))

// 4) The page. The card SURFACE (background, hairline border, lv2 shadow,
//    squircle corner) lives in the plugin's own stylesheet, not in `CardBody` —
//    without it the gallery shows bare text on the page background. Class names
//    are compiled with the `[local]` pattern (never hashed), so the source files
//    can be inlined verbatim.
const CARD_CSS = ['card.module.css', 'tokens.module.css']
  .map((name) => readFileSync(join(ROOT, 'src', 'client', 'styles', name), 'utf8'))
  .join('\n')
const options = { ...(ONLY ? { only: ONLY } : {}), ...(SIZES ? { sizes: SIZES } : {}) }
const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<title>dsh-widgets card gallery</title>
<link rel="stylesheet" href="theme-tokens.css" />
<style>
  html, body { margin: 0; }
  body {
    background: var(--dsw-alias-bg-base);
    color: var(--dsw-alias-label-primary);
    font: var(--dsw-font-base-16, 16px/24px) var(--dsw-font-family);
    padding: 24px;
  }
${CARD_CSS}
  .g-wrap { display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }
  .g-cell { display: flex; flex-direction: column; gap: 6px; }
  .g-head { display: flex; gap: 10px; align-items: baseline; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
  .g-head code { color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code); }
  .g-head em { font-style: normal; color: var(--dsw-alias-state-business-primary); }
  .g-card { display: inline-flex; }
  .g-null { color: var(--dsw-alias-label-tertiary); font-size: 12px; padding: 8px 10px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; }
</style>
</head>
<body${DARK ? ' data-ds-dark-theme' : ''}>
<div id="app"></div>
<script src="react.js"></script>
<script src="react-dom.js"></script>
<script>window.__GALLERY__ = ${JSON.stringify(options)};</script>
<script src="gallery.js"></script>
<script>
  ReactDOM.createRoot(document.getElementById('app')).render(
    React.createElement(DSHGallery.CardGallery, { options: window.__GALLERY__ }),
  );
</script>
</body>
</html>
`
writeFileSync(join(OUT_DIR, 'index.html'), html, 'utf8')
console.log(`[gallery] page → ${join(OUT_DIR, 'index.html')}`)
if (NO_SHOT) process.exit(0)

// 5) Shoot every cell.
mkdirSync(SHOT_DIR, { recursive: true })
const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 2000 }, deviceScaleFactor: 2 })
page.on('console', (m) => { if (m.type() === 'error') console.error('[gallery:page]', m.text()) })
page.on('pageerror', (e) => console.error('[gallery:pageerror]', e.message))
await page.goto('file:///' + join(OUT_DIR, 'index.html').split('\\').join('/'), { waitUntil: 'load' })
await page.waitForSelector('.g-cell', { timeout: 15000 })
await page.waitForTimeout(400)

const cells = await page.$$('.g-cell')
console.log(`[gallery] ${cells.length} cell(s)`)
let shot = 0
for (const cell of cells) {
  const id = await cell.getAttribute('data-widget')
  const size = await cell.getAttribute('data-size')
  const step = await cell.getAttribute('data-step')
  const name = `${id}@${size}${step === '0' ? '' : `-s${step}`}${DARK ? '-dark' : ''}`
  await cell.screenshot({ path: join(SHOT_DIR, `${name}.png`) })
  shot += 1
}
await page.screenshot({ path: join(SHOT_DIR, `_sheet${DARK ? '-dark' : ''}.png`), fullPage: true })
await browser.close()
console.log(`[gallery] ${shot} PNG(s) → ${SHOT_DIR}`)
