// Quick diagnostic: print the overlay slot's INLINE transition and computed
// transition-property on the DISCRETE page (should be a size tween, not none).
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const s = page.getByText('组件状态保存问题排查').first()
  if (await s.count()) { await s.click(); await page.waitForTimeout(4000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1500) }
  const box = await page.locator('.dsx-stats-card-slot').first().boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(400)
  }
  const diag = await page.evaluate(() => {
    const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
    if (!layer) return null
    const slot = layer.querySelector('.dsx-stats-card-slot')
    if (!slot) return null
    const cs = getComputedStyle(slot)
    return { inlineTransition: slot.style.transition, computedProperty: cs.transitionProperty, computedDuration: cs.transitionDuration }
  })
  console.log('DIAG:', JSON.stringify(diag))
  await browser.close()
})().catch((e) => { console.error('FAIL', e); process.exit(1) })