// Verify batch 2: 2x4 preview scale, config card-size controls, weekly bars
// option text, task card never vanishes, settings wording.
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
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1200) }

  // task card visible on the home rail and shows 暂无任务 / counts (never vanished)
  const railText = await page.evaluate(() => document.querySelector('.dsx-stats-rail') ? document.querySelector('.dsx-stats-rail').innerText : '')
  const taskLines = railText.split('\n').filter((l) => l.includes('任务') || l.includes('暂无') || l.includes('进行中'))
  console.log('TASK_CARD:', JSON.stringify(taskLines))

  const addBtn = page.locator('.dsx-stats-add').first()
  if (await addBtn.count()) { await addBtn.click(); await page.waitForTimeout(800) }

  // market: coding-plan 2x4 instance preview carries a scale transform
  await page.locator('button.dsx-tab:has-text("组件市场")').first().click()
  await page.waitForTimeout(500)
  const names = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-mname')).map((n) => n.textContent))
  const cp = names.indexOf('Coding Plan 用量')
  if (cp >= 0) {
    await page.locator('.dsx-mcard').nth(cp).click()
    await page.waitForTimeout(600)
    await page.locator('.dsx-dot').nth(1).click() // heatmap 2x4
    await page.waitForTimeout(600)
    const transforms = await page.evaluate(() => {
      const cards = document.querySelectorAll('.dsx-stats-addpanel .dsx-stats-card')
      let applied = null
      cards.forEach((c) => { const p = c.parentElement; if (p && p.style.transform && p.style.transform.includes('scale')) applied = p.style.transform })
      return applied
    })
    console.log('MARKET_2x4_SCALE:', transforms)
    await page.locator('button:has-text("← 返回")').first().click()
    await page.waitForTimeout(400)
  }

  // config: select context-water@2x2 row -> 卡片大小 heading + segmented buttons (no select)
  await page.locator('button.dsx-tab:has-text("组件配置")').first().click()
  await page.waitForTimeout(500)
  const clicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-order-row'))
    const target = rows.find((r) => r.textContent.includes('上下文水位'))
    if (!target) return false
    target.click()
    return true
  })
  await page.waitForTimeout(600)
  console.log('CONFIG_SELECTED_CONTEXTWATER:', clicked)
  const cfgDiagnostics = await page.evaluate(() => {
    const panel = document.querySelector('.dsx-stats-addpanel')
    if (!panel) return null
    const text = panel.innerText
    const selects = panel.querySelectorAll('select').length
    const segmented = panel.querySelectorAll('.dsx-stats-addpanel button.dsx-btn').length
    return { hasCardSizeHeading: text.includes('卡片大小'), hasCustomHeading: text.includes('自定义'), selectCount: selects, has2x4Button: text.includes('2×4') }
  })
  console.log('CONFIG_CARD_SIZE:', JSON.stringify(cfgDiagnostics))

  // settings description wording
  await page.locator('button.dsx-tab:has-text("组件设置")').first().click()
  await page.waitForTimeout(500)
  const settingsText = await page.evaluate(() => document.querySelector('.dsx-stats-addpanel').innerText)
  console.log('SETTINGS_WORDING:', { hasPersonal: settingsText.includes('纯属个人偏好'), hasOfficial: settingsText.includes('状态统计条') })

  console.log('CONSOLE_ERRORS:', JSON.stringify(errs))
  await restoreState()
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })