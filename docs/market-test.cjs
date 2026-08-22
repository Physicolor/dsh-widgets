// Market/Config rework test: 3 market groups, size via left/right arrows,
// add-by-size semantics, config tab has no uninstalled zone / no size dropdown.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  // Fidelity guard: snapshot the REAL host state (user data) and restore it
  // before closing, so this test never mutates a user's saved configuration.
  const originalState = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    return r.ok ? await r.json() : null
  })
  const restoreState = () => page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }),
    }).catch(() => {})
  }, originalState)
  const sess = page.getByText('组件状态保存问题排查').first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1200) }
  // open the add panel
  const addBtn = page.locator('.dsx-stats-add').first()
  if (await addBtn.count()) { await addBtn.click(); await page.waitForTimeout(900) }

  const beforeCards = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
  console.log('RAIL_CARDS_BEFORE:', beforeCards)

  // Default state ships 13 built-in instances but maxWidgets defaults to 10, so
  // the add limit is already hit; free two slots in the config tab first.
  await page.locator('button.dsx-tab:has-text("组件配置")').first().click()
  await page.waitForTimeout(500)
  for (let i = 0; i < 4; i++) {
    const ok = await page.evaluate(() => {
      const trash = document.querySelector('.dsx-stats-addpanel .dsx-order-row .dsx-trash')
      if (!trash) return false
      trash.click()
      return true
    })
    if (!ok) break
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(600)
  const afterFree = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
  console.log('RAIL_CARDS_AFTER_FREEING:', afterFree)

  // switch to the market tab inside the add panel
  const marketTab = page.locator('button.dsx-tab:has-text("组件市场")').first()
  await marketTab.click()
  await page.waitForTimeout(600)

  const groupNames = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-mname')).map((n) => n.textContent))
  console.log('MARKET_GROUPS:', JSON.stringify(groupNames))
  const badges = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-badge')).map((n) => n.textContent))
  console.log('GROUP_COUNTS:', JSON.stringify(badges))

  // open the coding-plan group by its NAME (badges now show widget counts)
  const cpIndex = groupNames.indexOf('Coding Plan 用量')
  console.log('CODING_PLAN_INDEX:', cpIndex)
  if (cpIndex >= 0) {
    await page.locator('.dsx-mcard').nth(cpIndex).click()
    await page.waitForTimeout(700)
    const hasSelect = await page.locator('.dsx-select').count()
    const navBtns = await page.locator('.dsx-navbtn').count()
    const dots = await page.locator('.dsx-dot').count()
    console.log('DETAIL_NO_DROPDOWN (select count):', hasSelect, 'nav buttons (prev/next only):', navBtns, 'instances (dots):', dots)

    // instance order: heatmap 2x2 first, heatmap 2x4 second
    const dotLabels = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-dot')).map((d) => d.getAttribute('aria-label')))
    console.log('INSTANCE_ORDER:', JSON.stringify(dotLabels))

    // preview width 2x2 (first instance, default) — a SQUARE heatmap card
    const previewW = await page.evaluate(() => {
      const card = document.querySelector('.dsx-stats-addpanel .dsx-stats-card')
      return card ? Math.round(card.getBoundingClientRect().width) : null
    })
    const previewH = await page.evaluate(() => {
      const card = document.querySelector('.dsx-stats-addpanel .dsx-stats-card')
      return card ? Math.round(card.getBoundingClientRect().height) : null
    })
    console.log('PREVIEW_2x2_WxH:', previewW, 'x', previewH, '(square expected)')

    // heatmap orientation: the 2x2 grid must be 7 week-rows x 13 day-columns
    const heatShape = await page.evaluate(() => {
      let rows = 0, transposed = 0
      document.querySelectorAll('.dsx-stats-addpanel div').forEach((el) => {
        const kids = Array.from(el.children)
        const allCells = kids.length && kids.every((k) => k.title && /tok/.test(k.title))
        if (allCells && kids.length === 13) rows++
        if (allCells && kids.length === 7) transposed++
      })
      return { weekRows: rows, transposedRowsOf7: transposed }
    })
    console.log('HEATMAP_ORIENTATION:', JSON.stringify(heatShape))

    // next instance = heatmap 2x4 (wider preview 412)
    await page.locator('.dsx-dot').nth(1).click()
    await page.waitForTimeout(600)
    const previewW2 = await page.evaluate(() => {
      const card = document.querySelector('.dsx-stats-addpanel .dsx-stats-card')
      return card ? Math.round(card.getBoundingClientRect().width) : null
    })
    console.log('PREVIEW_2x4_W:', previewW2, '(wider expected)')

    // add
    const addBtn2 = page.locator('.dsx-stats-addpanel button.dsx-btn-primary:has-text("添加")').first()
    if (await addBtn2.count()) { await addBtn2.click(); await page.waitForTimeout(800) }
    const afterCards = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
    console.log('RAIL_CARDS_AFTER_ADD:', afterCards, 'expect', afterFree + 1)
    const addedBtnState = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-stats-addpanel button')).map((b) => b.textContent).join('|'))
    console.log('DETAIL_BUTTONS_AFTER_ADD:', JSON.stringify(addedBtnState))

    // back to market list, then config tab: assert no uninstalled zone / size dropdown
    await page.locator('button:has-text("← 返回")').first().click()
    await page.waitForTimeout(500)
    await page.locator('button.dsx-tab:has-text("组件配置")').first().click()
    await page.waitForTimeout(600)
    const cfgText = await page.evaluate(() => document.querySelector('.dsx-stats-addpanel').innerText)
    console.log('CONFIG_HAS_UNINSTALLED:', cfgText.includes('已卸载'), 'CONFIG_HAS_SIZE_SELECT:', await page.locator('.dsx-stats-addpanel .dsx-select').count())

    // remove the added heatmap 2x4 row (first row with trash that is heatmap@2x4)
    const removed = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-order-row'))
      const target = rows.find((r) => r.textContent.includes('用量热度图') && r.textContent.includes('2×4'))
      if (!target) return false
      const trash = target.querySelector('.dsx-trash')
      if (!trash) return false
      trash.click()
      return true
    })
    console.log('REMOVE_HEATMAP_2x4_CLICKED:', removed)
    await page.waitForTimeout(800)
    const finalCards = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
    console.log('RAIL_CARDS_AFTER_REMOVE:', finalCards, 'expect', beforeCards)
    const cfgText2 = await page.evaluate(() => document.querySelector('.dsx-stats-addpanel').innerText)
    console.log('CONFIG_HAS_UNINSTALLED_AFTER:', cfgText2.includes('已卸载'))
  }
  console.log('CONSOLE_ERRORS:', JSON.stringify(errs))
  await restoreState()
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })