// Regression + fidelity check for the wave rewrite:
//  - geometry: every overlay slot's right edge lands on the rail's right content
//    line for the rightmost card of its row, and the peak card reaches
//    baseW * prefs.magnify (transform scaling must match the old
//    width/height geometry exactly);
//  - screenshots: rest, wave engaged, wave engaged with the right sidebar open,
//    add panel open;
//  - console/page errors.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto')
const PW = 'C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules'
const { chromium } = require(path.join(PW, 'playwright-core'))
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const OUT = 'D:/dsh-home/plugins/dsh-widgets/docs/verify-wave'
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
  fs.mkdirSync(OUT, { recursive: true })
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)))
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
  if (await capsule.count()) { if ((await capsule.first().getAttribute('aria-pressed')) !== 'true') { await capsule.first().click(); await page.waitForTimeout(900) } }
  const geo = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const r = rail.getBoundingClientRect()
    const cs = getComputedStyle(rail)
    const pad = parseFloat(cs.paddingRight) || 0
    const cards = [...rail.querySelectorAll('.dsx-stats-wave, .dsx-stats-card-slot')]
    const slots = [...rail.querySelectorAll('.dsx-stats-card-slot')].map((s) => { const b = s.getBoundingClientRect(); return { cx: (b.x + b.right) / 2, cy: (b.y + b.bottom) / 2, w: s.style.width, h: s.style.height } })
    return { railRect: { left: r.left, right: r.right, top: r.top }, pad, rightLine: r.right - pad, slots }
  })
  console.log('RAIL:', JSON.stringify(geo.railRect), 'pad:', geo.pad, 'rightLine:', geo.rightLine, 'slots:', geo.slots.length)
  await page.screenshot({ path: path.join(OUT, '1-rest.png') })

  // engage the wave on the first card
  const s0 = geo.slots[0]
  await page.mouse.move(Math.round(s0.cx), Math.round(s0.cy))
  await page.waitForTimeout(700)
  const wave = await page.evaluate((rightLine) => {
    const overlay = [...document.querySelectorAll('div')].find((d) => d.style.position === 'fixed' && d.style.zIndex === '25' && d.style.pointerEvents === 'none')
    if (!overlay) return { error: 'no overlay' }
    const slots = [...overlay.querySelectorAll('.dsx-stats-card-slot')].map((s, i) => {
      const b = s.getBoundingClientRect()
      const transform = s.style.transform
      const m = /scale\(([\d.]+)\)/.exec(transform)
      const baseW = parseFloat(s.style.width)
      return { i, scale: m ? parseFloat(m[1]) : 1, baseW, visualW: +b.width.toFixed(1), visualH: +b.height.toFixed(1), right: +b.right.toFixed(1), rightLineDelta: +(b.right - rightLine).toFixed(1), expectedW: +(baseW * (m ? parseFloat(m[1]) : 1)).toFixed(1) }
    })
    return { opacity: getComputedStyle(overlay).opacity, slots }
  }, geo.rightLine)
  console.log('\nWAVE ENGAGED: opacity', wave.opacity)
  for (const s of wave.slots) console.log(`  slot${s.i} scale=${s.scale} baseW=${s.baseW} visual=${s.visualW}x${s.visualH} expectedW=${s.expectedW} rightEdgeDelta=${s.rightLineDelta}`)
  const peaks = wave.slots.filter((s) => s.scale > 1.001)
  console.log(`  magnified slots: ${peaks.length}, max scale: ${Math.max(...wave.slots.map((s) => s.scale))}`)
  await page.screenshot({ path: path.join(OUT, '2-wave-engaged.png') })

  // open the right sidebar with the wave still engaged
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /右侧边栏/.test(x.getAttribute('aria-label') || '')); b.click() })
  await page.waitForTimeout(1200)
  const aligned = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const overlay = [...document.querySelectorAll('div')].find((d) => d.style.position === 'fixed' && d.style.zIndex === '25' && d.style.pointerEvents === 'none')
    const r = rail.getBoundingClientRect(); const o = overlay.getBoundingClientRect()
    return { rail: { left: Math.round(r.left), right: Math.round(r.right) }, overlay: { left: Math.round(o.left), right: Math.round(o.right) }, rightbar: document.documentElement.style.getPropertyValue('--dsx-rightbar-w') }
  })
  console.log('\nWITH SIDEBAR OPEN:', JSON.stringify(aligned))
  await page.screenshot({ path: path.join(OUT, '3-wave-sidebar-open.png') })
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /右侧边栏/.test(x.getAttribute('aria-label') || '')); b.click() })
  await page.waitForTimeout(900)

  // add panel
  const addBtn = page.locator('.dsx-stats-add').first()
  if (await addBtn.count()) { await addBtn.click({ force: true }); await page.waitForTimeout(700) }
  await page.screenshot({ path: path.join(OUT, '4-addpanel.png') })
  console.log('\nERRORS:', errors.filter((e) => !/favicon|net::ERR/.test(e)).slice(0, 10))
  await page.evaluate(async (orig) => { if (orig) await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {}) }, originalState)
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1) })
