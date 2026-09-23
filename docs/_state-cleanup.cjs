// Cleanup: drop the probe-installed `trajectory@2x2` from the persisted widget
// state (installed + order) and verify. Written as an explicit repair because a
// crashed probe run can leave the instance installed.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
  const ctx = browser.contexts()[0]
  const page = ctx.pages()[0] ?? await ctx.newPage()
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2500)
  const out = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    const j = r.ok ? await r.json() : null
    if (!j || !j.state) return { error: 'no state' }
    const before = (j.state.installed ?? []).filter((x) => x.startsWith('trajectory'))
    const state = {
      ...j.state,
      installed: (j.state.installed ?? []).filter((x) => x !== 'trajectory@2x2' && x !== 'trajectory@2x4'),
      order: (j.state.order ?? []).filter((x) => x !== 'trajectory@2x2' && x !== 'trajectory@2x4'),
    }
    const put = await fetch('/api/widgets-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: Date.now(), state }),
    })
    const after = await (await fetch('/api/widgets-state')).json()
    return {
      removedFrom: before,
      putStatus: put.status,
      stillInstalled: (after.state?.installed ?? []).filter((x) => x.startsWith('trajectory')),
      stillInOrder: (after.state?.order ?? []).filter((x) => x.startsWith('trajectory')),
      installedCount: (after.state?.installed ?? []).length,
    }
  })
  console.log('CLEANUP:', JSON.stringify(out))
  await page.goto('about:blank', { waitUntil: 'load' }).catch(() => {})
  await browser.close()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
