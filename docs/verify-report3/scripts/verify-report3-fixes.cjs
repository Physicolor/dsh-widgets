// Acceptance probe for the 2026-09-17 report (three fixes):
//   1. session hand-off: the rail leaves the screen at once and never lingers
//      over the fresh-conversation page (covered in depth by diag-repro.cjs);
//   2. the rail no longer abolishes DSH's turn navigator: the navigator stays
//      rendered, is not overlapped by the rail, and the column-width drag bands
//      do not overlap it either;
//   3. the official right sidebar still paints above every rail layer, and the
//      magnify wave still engages on hover (pointer wiring intact).
// Usage: node scripts/verify-report3-fixes.cjs
const fs = require('fs'); const path = require('path'); const crypto = require('crypto')
const PW = 'C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules'
const { chromium } = require(path.join(PW, 'playwright-core'))
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const OUT = 'docs/verify-report3'
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
const PROBE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) } }
  const ov = (a, b) => { if (!a || !b || a.w <= 0 || b.w <= 0) return null; const w = Math.min(a.right, b.right) - Math.max(a.x, b.x); const h = Math.min(a.bottom ?? 1e9, b.bottom ?? 1e9) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w + 'x' + h : null }
  const nav = document.querySelector('[class*="eGxaPq_frame"]')
  const navR = R(nav)
  const rail = document.querySelector('.dsx-stats-rail')
  const railR = R(rail)
  const handles = [...document.querySelectorAll('[class*="wSkVaW_widthHandle"]')].map((el) => ({ side: el.getAttribute('data-side'), r: R(el) }))
  const navVisible = !!(navR && navR.w > 0)
  const railCenter = railR && railR.w > 0 ? document.elementFromPoint(Math.round(railR.x + railR.w / 2), 400) : null
  return {
    navVisible, nav: navR, rail: railR,
    railOverlapsNav: navVisible ? ov(railR, navR) : null,
    handlesOverNav: navVisible ? handles.filter((h) => ov(h.r, navR)).map((h) => h.side) : [],
    gapNavToRail: navVisible && railR ? Math.round(railR.x - navR.right) : null,
    railClaim: document.documentElement.style.getPropertyValue('--dsx-rail-w'),
    railRight: document.documentElement.style.getPropertyValue('--dsx-rail-right'),
    scrollerPad: (() => { const s = document.querySelector('[data-conversation-scroll]'); return s ? getComputedStyle(s).paddingRight : null })(),
    navContainerContent: (() => { const c = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).containerType === 'inline-size'); if (!c) return null; const cs = getComputedStyle(c); return Math.round(c.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0')) })(),
    railCenterTop: railCenter ? { tag: railCenter.tagName, cls: String(railCenter.className).slice(0, 40) } : null,
    noSessionClass: document.body.classList.contains('dsx-stats-no-session'),
    activeClass: document.body.classList.contains('dsx-stats-active'),
  }
}
;(async () => {
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4500)
  const rows = page.locator('[class*="sessionRow"]')
  for (let i = 0; i < Math.min(await rows.count(), 10); i++) {
    const t = await rows.nth(i).innerText().catch(() => '')
    if (/新会话/.test(t)) continue
    await rows.nth(i).click({ timeout: 6000 }).catch(() => {})
    await page.waitForTimeout(2000)
    if (await page.locator('[class*="eGxaPq_markPosition"]').count()) break
  }
  const original = await page.evaluate(async () => { const r = await fetch('/api/widgets-state'); return r.ok ? await r.json() : null })
  const cap = page.locator('.dsx-stats-capsule').first()
  await cap.waitFor({ timeout: 8000 }).catch(() => {})
  const results = { states: {}, wave: null, panelAbove: null }
  for (const w of [1440, 1600, 1920]) {
    await page.setViewportSize({ width: w, height: 1080 })
    await page.waitForTimeout(1500)
    if ((await cap.getAttribute('aria-pressed').catch(() => null)) === 'true') { await cap.click(); await page.waitForTimeout(1400) }
    const closed = await page.evaluate(PROBE)
    if ((await cap.getAttribute('aria-pressed')) !== 'true') { await cap.click(); await page.waitForTimeout(1800) }
    const open = await page.evaluate(PROBE)
    results.states[w] = { closed, open }
    console.log(`### ${w}: closed nav=${closed.navVisible} | open nav=${open.navVisible} rail=${open.rail && open.rail.w} claim=${open.railClaim} gapNavToRail=${open.gapNavToRail} navOverlap=${open.railOverlapsNav || '-'} handleOverlap=${JSON.stringify(open.handlesOverNav)} navContainer=${open.navContainerContent}`)
    if (w === 1600) await page.screenshot({ path: path.join(OUT, 'rail-1600-nav-visible.png') })
  }
  // Wave still engages with the pointer (rail children must stay hit-testable).
  await page.mouse.move(200, 400)
  await page.waitForTimeout(600)
  const card = await page.evaluate(() => { const c2 = document.querySelector('.dsx-stats-card'); const r = c2.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
  await page.mouse.move(card.x, card.y)
  await page.waitForTimeout(700)
  results.wave = await page.evaluate(() => {
    const overlay = [...document.querySelectorAll('div')].find((d) => d.style && d.style.position === 'fixed' && d.style.zIndex === '25')
    const rail = document.querySelector('.dsx-stats-rail')
    return { overlayOpacity: overlay ? getComputedStyle(overlay).opacity : null, railPointerEvents: rail ? getComputedStyle(rail).pointerEvents : null, deckWaveOn: !!document.querySelector('.dsx-wave-deck.dsx-wave-on') }
  })
  console.log('wave on hover:', JSON.stringify(results.wave))
  // Right sidebar: the panel must still paint above every rail layer.
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /右侧边栏/.test(x.getAttribute('aria-label') || '')); if (b) b.click() })
  await page.waitForTimeout(3200)
  results.panelAbove = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const rr = rail.getBoundingClientRect()
    const hit = document.elementFromPoint(Math.round(rr.x + rr.width / 2), 400)
    return { hitTag: hit.tagName, hitCls: String(hit.className).slice(0, 40), hitIsRail: !!(hit.closest && hit.closest('.dsx-stats-rail')) }
  })
  console.log('panel above rail:', JSON.stringify(results.panelAbove))
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'fix-verification.json'), JSON.stringify(results, null, 1))
  await page.evaluate(async (orig) => { if (orig) await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {}) }, original)
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1) })
