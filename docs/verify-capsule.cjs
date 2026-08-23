const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
;(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const s = p.getByText('组件状态保存问题排查').first()
  if (await s.count()) { await s.click(); await p.waitForTimeout(4000) }
  const cap = p.locator('button.dsx-stats-capsule')
  const n = await cap.count()
  if (n > 0) {
    const cs = await cap.first().evaluate((el) => {
      const c = getComputedStyle(el)
      return { radius: c.borderRadius, height: c.height, background: c.backgroundColor, padding: c.padding, border: c.borderTopWidth, display: c.display }
    })
    console.log('CAPSULE_STYLE:', JSON.stringify(cs), '(radius 14px / height 28px / styled bg expected)')
  } else {
    console.log('CAPSULE_NOT_FOUND')
  }
  console.log('ERRORS:', JSON.stringify(errs))
  await b.close()
})().catch((e) => { console.error('FAIL', e); process.exit(1) })
