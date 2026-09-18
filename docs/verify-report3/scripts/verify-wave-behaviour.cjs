// Behaviour regression sweep for the RailWave rewrite:
//  1. engage -> leave: the deck comes back (class removed), the overlay hides;
//  2. rail close/open via the header capsule still mounts/unmounts cleanly;
//  3. the resize handle still writes cardSide through to --dsx-rail-w;
//  4. no console errors along the way; the host state is restored afterwards.
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
const probe = (page) => page.evaluate(() => {
  const deck = document.querySelector('.dsx-wave-deck')
  const overlay = [...document.querySelectorAll('div')].find((d) => d.style.position === 'fixed' && d.style.zIndex === '25' && d.style.pointerEvents === 'none')
  const firstSlot = deck ? deck.querySelector('.dsx-stats-card-slot') : null
  return {
    rail: document.querySelectorAll('.dsx-stats-rail').length,
    deckClass: deck ? deck.className : null,
    deckOpacity: firstSlot ? getComputedStyle(firstSlot).opacity : null,
    overlayOpacity: overlay ? getComputedStyle(overlay).opacity : null,
    railW: document.documentElement.style.getPropertyValue('--dsx-rail-w'),
    cardSide: (() => { try { return JSON.parse(localStorage.getItem('harness-widgets.state') || '{}').cardSide } catch { return null } })(),
  }
})
;(async () => {
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const capsule = page.locator('.dsx-stats-capsule')
  await capsule.first().waitFor({ timeout: 8000 }).catch(() => {})
  if (!(await capsule.count())) {
    const rows = page.locator('[class*="sessionRow"]')
    for (let i = 0; i < 4; i++) {
      const t = await rows.nth(i).innerText().catch(() => '')
      if (!/新会话/.test(t)) { await rows.nth(i).click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(1200); if (await capsule.count()) break }
    }
  }
  await page.waitForTimeout(2500)
  const originalState = await page.evaluate(async () => { const r = await fetch('/api/widgets-state'); return r.ok ? await r.json() : null })
  const startSide = (originalState && originalState.state && originalState.state.cardSide) || 150
  if (await capsule.count()) { if ((await capsule.first().getAttribute('aria-pressed')) !== 'true') { await capsule.first().click(); await page.waitForTimeout(900) } }
  console.log('1. rail open at rest :', JSON.stringify(await probe(page)))

  const slot = await page.evaluate(() => { const s = document.querySelector('.dsx-wave-deck .dsx-stats-card-slot'); const b = s.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } })
  await page.mouse.move(slot.x, slot.y)
  await page.waitForTimeout(600)
  console.log('2. wave engaged      :', JSON.stringify(await probe(page)))
  await page.mouse.move(slot.x - 900, slot.y + 40)
  await page.waitForTimeout(700)
  console.log('3. wave released     :', JSON.stringify(await probe(page)))

  // resize handle drag
  const handle = await page.evaluate(() => { const h = document.querySelector('.dsx-stats-deck0, .dsx-wave-deck .dsx-stats-resize') || document.querySelector('.dsx-stats-resize'); const b = h.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } })
  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x - 30, handle.y, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const afterResize = await probe(page)
  console.log('4. after resize drag :', JSON.stringify(afterResize))

  // close / reopen the rail through the header capsule
  await capsule.first().click()
  await page.waitForTimeout(900)
  console.log('5. rail closed       :', JSON.stringify(await probe(page)))
  await capsule.first().click()
  await page.waitForTimeout(900)
  console.log('6. rail reopened     :', JSON.stringify(await probe(page)))

  console.log('\nERRORS:', errors.filter((e) => !/favicon|net::ERR|ResizeObserver loop/.test(e)).slice(0, 8))
  // Restore VERBATIM, savedAt included. Writing savedAt: 0 makes the host store
  // look older than every browser origin, so the next fresh-profile page boots on
  // defaults and overwrites the user's real configuration on its first setPrefs
  // (that is exactly how this probe clobbered the owner's rail setup on
  // 2026-09-13). Playwright needs the extra args wrapped in one object.
  await page.evaluate(async ({ orig, side }) => {
    if (!orig) return
    const state = { ...(orig.state || {}) }
    state.cardSide = side
    await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state }) }).catch(() => {})
  }, { orig: originalState, side: startSide })
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1) })
