// Reproduce 4-column overlap: load the user's real arrangement with columns=4,
// open the rail and detect any two cards whose bounding boxes intersect.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const rectsOverlap = (a, b, tol = 1) =>
  a.left < b.right - tol && b.left < a.right - tol && a.top < b.bottom - tol && b.top < a.bottom - tol

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const originalState = await page.evaluate(async () => { const r = await fetch('/api/widgets-state'); return r.ok ? await r.json() : null })
  const restoreState = () => page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {})
  }, originalState)

  await page.evaluate(() => {
    const raw = localStorage.getItem('harness-widgets.state')
    const p = raw ? JSON.parse(raw) : {}
    p.columns = 4
    localStorage.setItem('harness-widgets.state', JSON.stringify(p))
    localStorage.setItem('harness-widgets.state.savedAt', String(Date.now() + 120000))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const sess = page.getByText('组件状态保存问题排查').first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) { await cap.click(); await page.waitForTimeout(1500) }

  const diag = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot'))
    const cards = slots.map((s, i) => { const r = s.getBoundingClientRect(); return { i, w: Math.round(s.style.width), h: Math.round(s.style.height), left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), text: (s.innerText || '').slice(0, 12) } })
    const overlap = []
    for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
      const A = cards[a], B = cards[b]
      if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) {
        overlap.push({ a: A.i, b: B.i, ta: A.text, tb: B.text })
      }
    }
    const rail = document.querySelector('.dsx-stats-rail')
    const rw = rail ? Math.round(rail.getBoundingClientRect().width) : 0
    // full-height place of each card within the content box (right padding = 24)
    return { count: cards.length, cards, overlap, railW: rw }
  })
  console.log('4COL_DIAG:', JSON.stringify(diag, null, 1))
  await restoreState()
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })