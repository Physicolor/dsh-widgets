// End-to-end: where the transcript's drag band overlaps the turn navigator, a real
// mouse click on a navigator mark must hover/click the navigator (not the band).
// Setup: a wide transcript preference so the two overlap at 1600.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto')
const PW = 'C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules'
const { chromium } = require(path.join(PW, 'playwright-core'))
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
function authCookie() {
  const yaml = fs.readFileSync('D:/dsh-home/.credentials.yaml', 'utf8')
  const secret = Buffer.from(yaml.match(/secret:\s*([A-Za-z0-9_-]+)/)[1].replaceAll('-', '+').replaceAll('_', '/'), 'base64')
  const authority = '127.0.0.1:3080'
  const b64u = (b) => Buffer.from(b).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const name = 'dsh-auth-' + b64u(crypto.createHash('sha256').update(authority).digest())
  const now = Date.now()
  const body = b64u(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt: now, expiresAt: now + 86400000 }), 'utf8'))
  return { name, value: `v1.${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}` }
}
;(async () => {
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { try { localStorage.setItem('dsh.conversation.contentWidth', '1200') } catch { /* ignore */ } })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4500)
  const rows = page.locator('[class*="sessionRow"]')
  const count = await rows.count()
  for (let i = 1; i < Math.min(count, 12); i++) {
    await rows.nth(i).click({ timeout: 6000 }).catch(() => {})
    await page.waitForTimeout(2000)
    if (await page.locator('[class*="eGxaPq_markPosition"]').count() > 2) break
  }
  const original = await page.evaluate(async () => { const r = await fetch('/api/widgets-state'); return r.ok ? await r.json() : null })
  const cap = page.locator('.dsx-stats-capsule').first()
  await cap.waitFor({ timeout: 8000 }).catch(() => {})
  if ((await cap.getAttribute('aria-pressed').catch(() => null)) !== 'true') { await cap.click(); await page.waitForTimeout(1700) }
  const geo = await page.evaluate(() => {
    const R = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), right: Math.round(r.right), y: Math.round(r.y + r.height / 2) } }
    const nav = document.querySelector('[class*="eGxaPq_frame"]')
    const handle = document.querySelector('[data-width-handle="right"]')
    const marks = [...document.querySelectorAll('[class*="eGxaPq_markPosition"]')].map(R)
    return { nav: nav ? R(nav) : null, handle: handle ? R(handle) : null, markCount: marks.length, marks }
  })
  const overlaps = !!(geo.nav && geo.handle && geo.handle.x < geo.nav.right && geo.handle.right > geo.nav.x)
  console.log('navigator', JSON.stringify(geo.nav), '| drag band', JSON.stringify(geo.handle), '| marks', geo.markCount)
  console.log('band overlaps navigator:', overlaps)
  const target = geo.marks[geo.marks.length - 1]
  const readView = () => page.evaluate(() => {
    const s = document.querySelector('[data-conversation-scroll]')
    return { scrollTop: s ? Math.round(s.scrollTop) : null, dragging: document.querySelector('[data-width-handle][data-dragging]') !== null }
  })
  const before = await readView()
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(250)
  const hovered = await page.evaluate((pt) => { const el = document.elementFromPoint(pt.x, pt.y); return { tag: el.tagName, cls: String(el.className).slice(0, 40), isNav: !!(el.closest && el.closest('[class*="eGxaPq"]')) } }, { x: target.x, y: target.y })
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(1200)
  const after = await readView()
  console.log('hovered element over the band:', JSON.stringify(hovered))
  console.log(`click result: scrollTop ${before.scrollTop} -> ${after.scrollTop} (jump=${before.scrollTop !== after.scrollTop}) | width-drag started=${after.dragging}`)
  await page.evaluate(async (orig) => { if (orig) await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {}) }, original)
  await page.evaluate(() => { try { localStorage.removeItem('dsh.conversation.contentWidth') } catch { /* ignore */ } })
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1) })
