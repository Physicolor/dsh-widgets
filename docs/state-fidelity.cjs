// Upgrade-fidelity test: a user's hand-arranged configuration from an older
// version must survive loading with the current bundle untouched — nothing
// reset to defaults, no widgets forcibly re-added, new defaults defaulted.
// Also verifies the quote widget renders NOTHING without a custom text.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  // Snapshot + restore the REAL host state so the test never mutates user data
  // (fetch must run on an http page, hence after goto).
  const originalState = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    return r.ok ? await r.json() : null
  })

  // A hand-arranged prefs object as an older version would have persisted it
  // (no hideStatsLine field, custom installed/order/cardConfigs).
  const legacy = {
    panelPadding: 24, cardSide: 168, installed: ['counts@2x2', 'llm@2x2', 'heatmap@2x4', 'quote@2x2'],
    order: ['counts@2x2', 'heatmap@2x4', 'llm@2x2', 'quote@2x2'],
    apiKey: '', railOpen: false, realTime: false, magnify: 1.2, panelWidth: 500,
    cardConfigs: { 'quote@2x2': { text: '我的箴言', align: 'center' }, 'heatmap@2x4': { monthMode: 'quarter' } },
    maxWidgets: 10, columns: 2,
  }
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page.evaluate((s) => {
    localStorage.setItem('harness-widgets.state', JSON.stringify(s))
    // Make local appear newer than the REAL host file, so boot sync adopts the
    // hand-arranged fixture instead of pulling the user's live config.
    localStorage.setItem('harness-widgets.state.savedAt', String(Date.now() + 60_000))
  }, legacy)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const sess = page.getByText('组件状态保存问题排查').first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1500) }

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('harness-widgets.state')))
  const rails = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
  const railText = await page.evaluate(() => document.querySelector('.dsx-stats-rail') ? document.querySelector('.dsx-stats-rail').innerText : '')
  console.log('FIDELITY_INSTALLED_KEPT:', JSON.stringify(stored.installed) === JSON.stringify(legacy.installed))
  console.log('FIDELITY_ORDER_KEPT:', JSON.stringify(stored.order.slice(0, legacy.order.length)) === JSON.stringify(legacy.order))
  console.log('FIDELITY_CARDSIDE_KEPT:', stored.cardSide === 168)
  console.log('FIDELITY_QUOTE_TEXT_KEPT:', stored.cardConfigs['quote@2x2'].text === '我的箴言')
  console.log('FIDELITY_HIDESTATS_DEFAULTED_FALSE:', stored.hideStatsLine === false)
  console.log('FIDELITY_RAIL_CARDS:', rails, 'expect', legacy.installed.length)
  console.log('FIDELITY_QUOTE_RENDERED:', railText.includes('我的箴言'), 'HEATMAP_2x4_RENDERED:', rails >= 2)

  // Quote with NO custom text must render nothing (no default filler).
  const empty = { ...legacy, installed: ['quote@2x2'], order: ['quote@2x2'], cardConfigs: {} }
  await page.evaluate((s) => {
    localStorage.setItem('harness-widgets.state', JSON.stringify(s))
    localStorage.setItem('harness-widgets.state.savedAt', String(Date.now() + 60_000))
  }, empty)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const sess2 = page.getByText('组件状态保存问题排查').first()
  if (await sess2.count()) { await sess2.click(); await page.waitForTimeout(4000) }
  const cap2 = page.locator('button.dsx-stats-capsule').first()
  if (await cap2.count()) { await cap2.click(); await page.waitForTimeout(1500) }
  const rails2 = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
  console.log('QUOTE_EMPTY_NO_RENDER (rail cards):', rails2, 'expect 0 (no default filler)')

  console.log('CONSOLE_ERRORS:', JSON.stringify(errs))
  await page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }),
    }).catch(() => {})
  }, originalState)
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })