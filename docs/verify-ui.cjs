// Verify batch: quote market preview shows sample text; hide-statsline switch
// actually hides the official composer stats bar; rail sits 12px below the
// session header.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const originalState = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    return r.ok ? await r.json() : null
  })
  const restoreState = () => page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {})
  }, originalState)

  const sess = page.getByText('组件状态保存问题排查').first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4000) }

  // rail top gap = 12px below the conversation scroll area
  const gap = await page.evaluate(() => {
    const el = document.querySelector('[data-conversation-scroll]')
    if (!el) return null
    const top = el.getBoundingClientRect().top
    const varTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dsx-rail-top'))
    return { scrollTop: top, railTopVar: varTop, diff: varTop - top }
  })
  console.log('RAIL_TOP_GAP:', JSON.stringify(gap), '(12 expected)')

  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1000) }
  const addBtn = page.locator('.dsx-stats-add').first()
  if (await addBtn.count()) { await addBtn.click(); await page.waitForTimeout(800) }

  // quote preview in the 其它 market group
  await page.locator('button.dsx-tab:has-text("组件市场")').first().click()
  await page.waitForTimeout(500)
  const groupNames = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-mname')).map((n) => n.textContent))
  const qi = groupNames.indexOf('其它')
  console.log('OTHER_GROUP_INDEX:', qi)
  if (qi >= 0) {
    await page.locator('.dsx-mcard').nth(qi).click()
    await page.waitForTimeout(600)
    const previewText = await page.evaluate(() => document.querySelector('.dsx-stats-addpanel .dsx-stats-card') ? document.querySelector('.dsx-stats-addpanel .dsx-stats-card').innerText : '')
    console.log('QUOTE_PREVIEW_HAS_SAMPLE:', previewText.includes('预览寄语'), '|', JSON.stringify(previewText.slice(0, 40)))
  }

  // hide-statsline switch
  await page.locator('button:has-text("← 返回")').first().click().catch(() => {})
  await page.waitForTimeout(400)
  await page.locator('button.dsx-tab:has-text("组件设置")').first().click()
  await page.waitForTimeout(500)
  const switchExists = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.dsx-stats-addpanel [style*="display: flex"]'))
    return document.querySelector('.dsx-stats-addpanel').innerText.includes('隐藏输入框下方文字条')
  })
  console.log('HIDE_SWITCH_EXISTS:', switchExists)
  const before = await page.evaluate(() => {
    const d = document.querySelector('[data-slot="conversation.composer.dock"] > div')
    return d ? getComputedStyle(d).display : 'no-el'
  })
  console.log('STATSLINE_BEFORE:', before)
  const toggled = await page.evaluate(() => {
    const input = Array.from(document.querySelectorAll('.dsx-stats-addpanel input[type="checkbox"]')).find((i) => i.checked === false)
    if (!input) return false
    input.click()
    return true
  })
  await page.waitForTimeout(600)
  const afterToggle = await page.evaluate(() => {
    const d = document.querySelector('[data-slot="conversation.composer.dock"] > div')
    if (!d) return 'no-el'
    const cs = getComputedStyle(d)
    const firstSpan = d.querySelector('span')
    return { display: cs.display, color: cs.color, spanColor: firstSpan ? getComputedStyle(firstSpan).color : null }
  })
  console.log('STATSLINE_AFTER_ON:', JSON.stringify(afterToggle), '(display block + transparent text expected)')
  // restore switch off
  if (toggled) await page.evaluate(() => { const i = Array.from(document.querySelectorAll('.dsx-stats-addpanel input[type="checkbox"]')).find((x) => x.checked === true); if (i) i.click() })
  await page.waitForTimeout(600)

  console.log('CONSOLE_ERRORS:', JSON.stringify(errs))
  await restoreState()
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })