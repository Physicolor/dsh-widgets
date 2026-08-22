// Verify the hide-statsline switch round-trips: on = text transparent (space
// kept), off = text visible again. Also dump the current prefs.hideStatsLine
// read by the page, to explain a stale hidden state.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const originalState = await page.evaluate(async () => { const r = await fetch('/api/widgets-state'); return r.ok ? await r.json() : null })
  const restoreState = () => page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {})
  }, originalState)

  const sess = page.getByText('组件状态保存问题排查').first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1000) }
  const addBtn = page.locator('.dsx-stats-add').first()
  if (await addBtn.count()) { await addBtn.click(); await page.waitForTimeout(800) }
  await page.locator('button.dsx-tab:has-text("组件设置")').first().click()
  await page.waitForTimeout(500)

  const dump = () => page.evaluate(() => {
    const d = document.querySelector('[data-slot="conversation.composer.dock"] > div')
    const span = d ? d.querySelector('span') : null
    const stored = JSON.parse(localStorage.getItem('harness-widgets.state') || '{}')
    return {
      display: d ? getComputedStyle(d).display : 'no-el',
      color: d ? getComputedStyle(d).color : null,
      spanColor: span ? getComputedStyle(span).color : null,
      prefHide: stored.hideStatsLine,
      bodyClass: document.body.classList.contains('dsx-hide-statsline'),
    }
  })

  // find the switch labelled 隐藏输入框下方文字条
  const clickSwitch = async (wantOn) => {
    const done = await page.evaluate((on) => {
      const rows = Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-switch-row'))
      const row = rows.find((r) => r.parentElement && r.parentElement.parentElement && r.parentElement.parentElement.innerText.includes('隐藏输入框下方文字条'))
      const input = row ? row.querySelector('input') : null
      if (input && input.checked !== on) { input.click(); return true }
      return false
    }, wantOn)
    await page.waitForTimeout(600)
    return done
  }

  console.log('INITIAL:', JSON.stringify(await dump()))
  await clickSwitch(true)
  console.log('AFTER_ON:', JSON.stringify(await dump()))
  await clickSwitch(false)
  console.log('AFTER_OFF:', JSON.stringify(await dump()))

  await restoreState()
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })