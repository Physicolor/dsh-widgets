// Attempt a real interaction test: enter a session, open the widgets rail,
// hover a card and assert the magnification overlay appears / stays in gaps /
// stops after leaving the rail.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 500)
  console.log('PAGE_TEXT_HEAD:', JSON.stringify(bodyText))

  // Try to click into the most recent session item, if the home lists sessions.
  const sessionLink = page.getByText('组件状态保存问题排查').first()
  const count = await sessionLink.count()
  console.log('SESSION_LINK_COUNT:', count)
  if (count > 0) {
    await sessionLink.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(4000)
  }

  // Toggle the widgets capsule ("组件") in the session header.
  const capsule = page.locator('button.dsx-stats-capsule').first()
  const capCount = await capsule.count()
  console.log('CAPSULE_COUNT:', capCount)
  if (capCount > 0) {
    await capsule.click()
    await page.waitForTimeout(1500)
    const rails = await page.locator('.dsx-stats-rail').count()
    console.log('RAIL_COUNT:', rails)
    const cards = await page.locator('.dsx-stats-card-slot').count()
    console.log('CARD_SLOTS:', cards)
    if (rails > 0 && cards > 0) {
      const box = await page.locator('.dsx-stats-card-slot').first().boundingBox()
      console.log('FIRST_CARD_BOX:', JSON.stringify(box))
      // magnify overlay is the fixed div with z-index 25
      const hasOverlay = () => page.evaluate(() => {
        for (const el of document.querySelectorAll('div')) {
          if (el.style.zIndex === '25' && getComputedStyle(el).position === 'fixed') return true
        }
        return false
      })
      console.log('OVERLAY_BEFORE:', await hasOverlay())
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(600)
      console.log('OVERLAY_ON_CARD:', await hasOverlay())
      // move into the gap right of the first card (still inside the rail)
      await page.mouse.move(box.x + box.width + 8, box.y + box.height / 2)
      await page.waitForTimeout(600)
      console.log('OVERLAY_IN_GAP:', await hasOverlay())
      // move far left, outside the rail
      await page.mouse.move(100, box.y + box.height / 2)
      await page.waitForTimeout(600)
      console.log('OVERLAY_LEFT_OUTSIDE:', await hasOverlay())
    }
  }
  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors))

  // --- Add-button magnification: hover the LAST card (nearest to the bottom
  // add button) so the wave peak propagates to the add button, then assert
  // the overlay's mirrored add button grows wider than the resting side.
  const cardCount = await page.locator('.dsx-stats-card-slot').count()
  await page.evaluate(() => { const r = document.querySelector('.dsx-stats-rail'); if (r) r.scrollTop = r.scrollHeight })
  await page.waitForTimeout(500)
  const lastCard = await page.locator('.dsx-stats-card-slot').nth(cardCount - 1).boundingBox()
  if (lastCard) {
    await page.mouse.move(lastCard.x + lastCard.width / 2, lastCard.y + lastCard.height / 2)
    await page.waitForTimeout(900)
    const widths = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-stats-add')).map((b) => b.offsetWidth))
    console.log('ADD_BUTTON_WIDTHS(over last card):', JSON.stringify(widths), 'restSide=150')
    console.log('ADD_SCALES_UP:', Math.max(...widths) > 150)
  }

  // --- Realtime mode round: a SECOND page (fresh JS env, same origin) with
  // localStorage pre-seeded to realTime=true, then enter session + assert. ---
  const page2 = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs2 = []
  page2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()) })
  page2.on('pageerror', (e) => errs2.push(`PAGEERROR: ${e.message}`))
  await page2.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page2.evaluate(() => {
    const raw = localStorage.getItem('harness-widgets.state')
    const p = raw ? JSON.parse(raw) : {}
    p.realTime = true
    localStorage.setItem('harness-widgets.state', JSON.stringify(p))
  })
  const s2 = page2.getByText('组件状态保存问题排查').first()
  if ((await s2.count()) > 0) {
    await s2.click({ timeout: 5000 }).catch(() => {})
    await page2.waitForTimeout(5000)
  }
  const cap2 = await page2.locator('button.dsx-stats-capsule').count()
  console.log('RT_CAPSULE_COUNT:', cap2)
  if (cap2 > 0) {
    const cs = await page2.locator('button.dsx-stats-capsule').first().getAttribute('aria-pressed')
    if (cs !== 'true') await page2.locator('button.dsx-stats-capsule').first().click()
    await page2.waitForTimeout(1500)
  }
  const cards2 = await page2.locator('.dsx-stats-card-slot').count()
  console.log('RT_CARD_SLOTS:', cards2)
  const hasOverlay2 = () => page2.evaluate(() => {
    for (const el of document.querySelectorAll('div')) {
      if (el.style.zIndex === '25' && getComputedStyle(el).position === 'fixed') return true
    }
    return false
  })
  if (cards2 > 0) {
    const box2 = await page2.locator('.dsx-stats-card-slot').first().boundingBox()
    console.log('RT_OVERLAY_BEFORE:', await hasOverlay2())
    if (box2) {
      // rail blank margin ABOVE the first card (inside rail, no card hit)
      await page2.mouse.move(box2.x + box2.width / 2, Math.max(10, box2.y - 30))
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_BLANK_TOP:', await hasOverlay2())
      await page2.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2)
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_ON_CARD:', await hasOverlay2())
      await page2.mouse.move(box2.x + box2.width + 8, box2.y + box2.height / 2)
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_IN_GAP:', await hasOverlay2())
      await page2.mouse.move(100, box2.y + box2.height / 2)
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_LEFT_OUTSIDE:', await hasOverlay2())
    }
  }
  console.log('RT_CONSOLE_ERRORS:', JSON.stringify(errs2))
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })