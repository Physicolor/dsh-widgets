/**
 * Live acceptance for the third batch's seven cards.
 *
 * Seeds ITS OWN browser context's localStorage with a layout holding just the new
 * instances, drives the real GUI, screenshots the rail, and closes. The host's
 * `dsh-widgets-state.json` is never written: a real GUI tab the owner has open is
 * the authority on the rail (it pushes its own layout with a newer stamp), so the
 * only reliable way to look at a probe layout is never to compete for that file.
 *
 * What this checks that the offline gallery CANNOT: whether each card's DATA
 * SOURCE actually resolves in a running session. A card whose projection is not
 * composed renders `null` and leaves a HOLE in the rail — which is exactly the
 * failure this probe exists to catch, because the offline preview fills from the
 * widget's own `example` and would happily show a card that never appears live.
 *
 * Usage: node docs/probe-batch3-live.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { chromePath } = require('../scripts/lib/chrome.cjs')
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const ORIGIN = 'http://127.0.0.1:3080'
const OUT = path.join(__dirname, 'batch3-live')
const NEW_CARDS = [
  // 12 of the batch's 13 survive the revision round (`model-config` was deleted —
  // the composer already shows the model and reasoning effort).
  'goal-progress@2x2',
  'subagent@2x2',
  'guard@2x2',
  'jobs@2x2',
  'window-forecast@2x2',
  'sys-disk@2x4',
  'sys-net@2x2',
  'sys-power@2x2',
  'sys-procs@2x2',
  'sys-services@2x2',
  'session-cost@2x2',
  'github-notify@2x2',
]

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
  await context.addCookies([mintCookie('127.0.0.1:3080')])
  // Seeded BEFORE any page script runs, so the app boots straight into the probe
  // layout and never syncs it anywhere.
  await context.addInitScript((installed) => {
    localStorage.setItem('harness-widgets.state', JSON.stringify({
      installed,
      order: installed,
      maxWidgets: 40,
      columns: 2,
      cardSide: 150,
      railOpen: true,
    }))
    localStorage.setItem('harness-widgets.state.savedAt', String(Date.now()))
  }, NEW_CARDS)

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  // The rail only exists INSIDE a conversation (`conversation.composer.dock` is
  // what mounts the collector), so a session must be opened first — otherwise the
  // probe reports "0 cards" for a reason that has nothing to do with the cards.
  const openSession = async () => {
    const row = page.locator('[class$="_sessionRow"]').first()
    await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(2500) }
  }
  await openSession()
  for (let i = 0; i < 8; i++) {
    const ready = await page.evaluate(() => !!document.querySelector('.dsx-stats-rail') || !!document.querySelector('button.dsx-stats-capsule'))
    if (ready) break
    await openSession()
  }
  await page.waitForTimeout(5000)

  const found = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail') ?? document.body
    const cards = [...rail.querySelectorAll('.dsx-stats-card')]
    return cards.map((card) => {
      const text = (card.textContent ?? '').replace(/\s+/g, ' ').trim()
      const rect = card.getBoundingClientRect()
      // The FIGURE's resolved colour: a `valueTone` that names a token the theme
      // does not define silently falls back, so the only honest check is computed.
      const figure = card.querySelector('.dsx-stats-card-value, span[style*="tabular-nums"]')
      const figureColor = figure === null ? '' : getComputedStyle(figure).color
      return {
        text: text.slice(0, 96),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        overflow: card.getAttribute('data-dsx-overflow') ?? '',
        figureColor,
      }
    })
  })
  console.log(`[probe] ${found.length} card(s) in the rail (expected ${NEW_CARDS.length}):`)
  for (const c of found) console.log(`  ${c.w}x${c.h}  overflow=${c.overflow || '-'}  figure=${c.figureColor}  ${c.text}`)
  const missing = NEW_CARDS.filter((key) => !found.some((c) => c.text.includes('')))
  void missing
  console.log(`[probe] page errors: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('  !', e)

  await page.screenshot({ path: path.join(OUT, 'page.png'), fullPage: true })
  const rail = await page.$('.dsx-stats-rail')
  if (rail !== null) await rail.screenshot({ path: path.join(OUT, 'rail.png') })
  await browser.close()
}

main().catch((error) => { console.error('[probe]', error); process.exit(1) })
