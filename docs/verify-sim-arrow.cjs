// Verify: (1) dsx-select arrow renders near-white pixels in dark theme (the
// currentColor background-image bug fixed); (2) peak-pricing market preview
// toggles EXPENSIVE/CHEAP + red alert class on card click. Read-only.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })

  // --- 1. arrow CSS rule (dark mode must resolve to the near-white chevron URI) ---
  const arrowCss = await page.evaluate(() => {
    const el = document.createElement('select')
    el.className = 'dsx-select'
    el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;'
    document.body.appendChild(el)
    const bi = getComputedStyle(el).backgroundImage
    el.remove()
    return {
      dark: document.body.hasAttribute('data-ds-dark-theme'),
      backgroundImage: bi,
      usesWhiteFill: /fill='%23ECECF1'/.test(bi),
      usesCurrentColor: /currentColor/.test(bi),
    }
  })
  console.log('ARROW_CSS(dark):', JSON.stringify(arrowCss))

  // --- 2. peak-pricing preview sim toggle ---
  // Activate a session first (the rail only mounts while a session is live).
  const tree = page.locator('[role=tree][aria-label="会话"]')
  console.log('STEP session tree:', await tree.count())
  const tryClick = async () => {
    const running = tree.locator('[role="treeitem"]', { hasText: '进行中' }).first()
    if (await running.count()) { await running.click(); return true }
    if (await tree.locator('[role="treeitem"]').first().count()) { await tree.locator('[role="treeitem"]').first().click(); return true }
    return false
  }
  if (!(await tryClick())) await page.locator('button[aria-label="新建会话"]').first().click().catch(() => {})
  await page.waitForFunction(() => document.querySelectorAll('button.dsx-stats-capsule').length > 0, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)
  console.log('STEP capsule:', await page.locator('button.dsx-stats-capsule').count())
  await page.locator('button.dsx-stats-capsule').first().click().catch(() => {})
  await page.waitForTimeout(1000)
  console.log('STEP addbtn:', await page.locator('.dsx-stats-add').count())
  await page.locator('.dsx-stats-add').first().click().catch(() => {})
  await page.waitForTimeout(1000)
  console.log('STEP market tab:', await page.locator('button.dsx-tab:has-text("组件市场")').count())
  await page.locator('button.dsx-tab:has-text("组件市场")').first().click()
  await page.waitForTimeout(500)
  const groups = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-mname')).map((n) => n.textContent))
  const gi = groups.indexOf('峰谷定价')
  console.log('PEAK_GROUP_INDEX:', gi)
  if (gi < 0) throw new Error('peak-pricing group not found')

  await page.locator('.dsx-mcard').nth(gi).click()
  await page.waitForTimeout(600)
  const readCard = () => page.evaluate(() => {
    const card = document.querySelector('.dsx-stats-addpanel .dsx-stats-card, .dsx-mcard + * .dsx-stats-card') || document.querySelector('.dsx-stats-card')
    if (!card) return null
    return { text: card.innerText, alert: card.className.includes('dsx-peak-alert'), cursor: card.closest('[style]')?.getAttribute('style') }
  })
  const before = await readCard()
  await page.locator('.dsx-stats-addpanel .dsx-stats-card').first().click({ force: true }).catch(async () => {
    // fallback: click via evaluate on the wrapper
    await page.evaluate(() => { const el = document.querySelector('.dsx-stats-addpanel .dsx-stats-card'); if (el) (el.closest('[onclick]') || el).dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  })
  await page.waitForTimeout(400)
  const after = await readCard()
  console.log('SIM_PREVIEW_BEFORE:', JSON.stringify(before && { text: before.text.split('\n').join(' | '), alert: before.alert }))
  console.log('SIM_PREVIEW_AFTER :', JSON.stringify(after && { text: after.text.split('\n').join(' | '), alert: after.alert }))
  const tip = await page.evaluate(() => Array.from(document.querySelectorAll('div')).some((d) => /点击卡片切换：高峰\/低峰/.test(d.textContent || '')))
  console.log('SIM_TIP_SHOWN:', tip)

  console.log('CONSOLE_ERRORS:', errs.length ? errs : 'none')
  await browser.close()
})().catch((e) => { console.error('ERR', e); process.exit(1) })