/**
 * Settings-nav glyph check (docs/verify-nav-glyph.cjs)
 *
 * The settings shell picks each nav cell's glyph from the section ID and only
 * knows its three built-in IDs ("models" / "agent-presets" / "plugins"); every
 * other section —ours included —falls back to the generic settings gear. The
 * section contract carries no icon field (only id / order / label), so the
 * client half marks OUR row with `data-dsx-nav="widgets"` and
 * `src/client/widgets.module.css` paints the app icon's four-tile outline over
 * the hidden gear.
 *
 * This probe drives the real GUI and asserts the mark's whole contract:
 *   - exactly ONE nav row carries `data-dsx-nav="widgets"`, and it is the row
 *     whose label is our registered section label ("组件" / "Components");
 *   - the official gear svg on that row is `display: none`;
 *   - its `::before` is a 16x16 mask holding our inline SVG glyph;
 *   - every other nav row is untouched (no other plugin's cell is styled);
 *   - the attribute is REMOVED with the owning effect (closing the panel —or
 *     unloading the plugin— leaves no marked node behind).
 *
 * Run: node docs/verify-nav-glyph.cjs      (needs the local GUI on :3080)
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const ORIGIN = 'http://127.0.0.1:3080'
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const SHOT_DIR = path.join(__dirname, 'verify-nav-glyph')

/** The section label the registrant publishes, per locale. */
const LABELS = ['组件', 'Components']

;(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 } })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2500)

  const trigger = page.locator('[class$="_trigger"]').first()
  await trigger.waitFor({ state: 'visible', timeout: 20000 })
  await trigger.click()
  await page.waitForSelector('[class$="_navList"]', { timeout: 15000 })
  await page.waitForTimeout(400)

  const open = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('[class$="_navList"] > button')].map((b) => {
      const svg = b.querySelector(':scope > svg')
      const pseudo = getComputedStyle(b, '::before')
      return {
        label: (b.textContent || '').trim(),
        marked: b.getAttribute('data-dsx-nav'),
        svgDisplay: svg ? getComputedStyle(svg).display : null,
        beforeSize: [pseudo.width, pseudo.height],
        beforeMask: String(pseudo.maskImage || pseudo.webkitMaskImage || ''),
      }
    }),
  }))
  const shot = path.join(SHOT_DIR, 'nav-glyph.png')
  await page.screenshot({ path: shot })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)
  const marksAfterClose = await page.evaluate(() => document.querySelectorAll('[data-dsx-nav]').length)
  await browser.close()

  const ours = open.rows.filter((r) => r.marked === 'widgets')
  const others = open.rows.filter((r) => r.marked !== null && r.marked !== 'widgets')
  const one = ours.length === 1 ? ours[0] : null
  const fails = []
  if (open.rows.length === 0) fails.push('no settings nav rows found')
  if (ours.length !== 1) fails.push(`marked rows ${ours.length} != 1`)
  else {
    if (!LABELS.includes(one.label)) fails.push(`marked row label is "${one.label}", not our section label`)
    if (one.svgDisplay !== 'none') fails.push(`official gear svg is not hidden (display: ${one.svgDisplay})`)
    if (one.beforeSize[0] !== '16px' || one.beforeSize[1] !== '16px') fails.push(`::before is ${one.beforeSize.join('x')}, not 16x16`)
    if (!/^url\("data:image\/svg\+xml,/.test(one.beforeMask)) fails.push('::before carries no inline SVG mask')
  }
  if (others.length > 0) fails.push(`other nav rows were marked: ${others.map((r) => r.label).join(', ')}`)
  if (marksAfterClose !== 0) fails.push(`${marksAfterClose} marked node(s) survived the panel closing`)

  for (const r of open.rows) {
    console.log(`${r.marked === 'widgets' ? 'ok  ' : '--  '} ${r.label.padEnd(14)} marked=${String(r.marked).padEnd(8)} svg=${r.svgDisplay} before=${r.beforeSize.join('x')}`)
  }
  for (const f of fails) console.log('! ' + f)
  console.log('page errors:', JSON.stringify(errs))
  console.log('screenshot:', path.relative(process.cwd(), shot))
  console.log('NAV GLYPH: ' + (fails.length === 0 && errs.length === 0 ? 'PASS' : 'FAIL'))
  process.exit(fails.length === 0 && errs.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(2) })
