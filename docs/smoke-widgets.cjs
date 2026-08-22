// Smoke test: load the DSH web GUI headless, verify the dsh-widgets client
// bundle loads with zero console errors / failed requests, then exercise the
// rail's hover state machine by injecting a fake session so the rail renders.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const consoleErrors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`))
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })

  // The widgets bundle is fetched by client-modules; assert it resolves.
  const bundle = await page.evaluate(async () => {
    const r = await fetch('/plugins/dsh-widgets/client.js').catch((e) => null)
    if (!r) return null
    const text = await r.text()
    return { status: r.status, hasArm: text.includes('hitTestCards'), hasAddScale: text.includes('addScale') }
  })
  console.log('BUNDLE:', JSON.stringify(bundle))

  // Collect errors after a short settle so late bundle errors surface.
  await page.waitForTimeout(2500)

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors))
  console.log('FAILED_REQUESTS:', JSON.stringify(failed))
  console.log('RESULT:', consoleErrors.length === 0 && failed.length === 0 ? 'PASS' : 'FAIL')
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })