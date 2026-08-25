// Verify the add-panel height is immune to --dsh-sidebar-width (dsh-better-sidebar
// right-panel width). Regression: the panel's bottom used to track that variable,
// so opening the right sidebar lifted the bottom by the full panel width and
// halved the visible panel height. Read-only: creates a detached probe element,
// never touches widgets state.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })

  // Probe: same geometry the real panel gets (top 0, width 360) plus the .open
  // flag, so height = viewport - top - bottom per the CSS rule under test.
  await page.evaluate(() => {
    const p = document.createElement('div')
    p.id = '__probe'
    p.className = 'dsx-stats-addpanel open'
    p.style.cssText = 'top:0px;width:360px;visibility:visible;transform:none'
    document.body.appendChild(p)
  })
  const h0 = await page.evaluate(() => document.getElementById('__probe').getBoundingClientRect().height)

  // Simulate better-sidebar right panel open (it sets this exact variable).
  await page.evaluate(() => document.documentElement.style.setProperty('--dsh-sidebar-width', '320px'))
  await page.waitForTimeout(400)
  const h1 = await page.evaluate(() => document.getElementById('__probe').getBoundingClientRect().height)

  // And a wide sidebar (worst case).
  await page.evaluate(() => document.documentElement.style.setProperty('--dsh-sidebar-width', '480px'))
  await page.waitForTimeout(400)
  const h2 = await page.evaluate(() => document.getElementById('__probe').getBoundingClientRect().height)

  await page.evaluate(() => {
    document.documentElement.style.removeProperty('--dsh-sidebar-width')
    document.getElementById('__probe').remove()
  })
  await page.waitForTimeout(300)

  console.log(`ADD_PANEL_HEIGHT  sidebar=off: ${h0.toFixed(1)}px`)
  console.log(`ADD_PANEL_HEIGHT  sidebar=320px: ${h1.toFixed(1)}px`)
  console.log(`ADD_PANEL_HEIGHT  sidebar=480px: ${h2.toFixed(1)}px`)
  const ok = Math.abs(h1 - h0) < 2 && Math.abs(h2 - h0) < 2
  console.log(`RESULT: ${ok ? 'PASS - height immune to --dsh-sidebar-width' : 'FAIL - height changed with sidebar'}`)
  console.log(`CONSOLE_ERRORS: ${errs.length ? errs.join(' | ') : 'none'}`)
  await browser.close()
  process.exit(ok && errs.length === 0 ? 0 : 1)
})()