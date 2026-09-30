/**
 * dsh-widgets — 0.2.0 rail stacking / composer-dock regression check.
 *
 * Asserts the three shell-rebuild regressions this script was born from, on the
 * LIVE app, and then re-applies the OLD rules through injected CSS to prove the
 * same assertions actually fail without the fix (a check that cannot fail is
 * not a check):
 *
 *   1. rail scroll + hover must NOT paint the magnified deck over the top menu
 *      bar / session header (the overlay is clipped to the rail's band);
 *   2. the magnified card must paint ABOVE the official turn navigator when it
 *      grows left into the navigator's gutter (the navigator keeps the product's
 *      own z-index 7, no 9-override);
 *   3. the composer dock's info bar must stay painted while the rail is open.
 *
 *   node scripts/verify-rail-stacking-20.cjs [--session <substring>]
 *
 * Screenshots land in docs/verify-report3/ (stacking-*.png). URL from DSH_URL,
 * default http://127.0.0.1:19387.
 */
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { chromePath } = require('./lib/chrome.cjs')

const PW = 'C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules'
const { chromium } = require(path.join(PW, 'playwright-core'))

const URL_ = process.env.DSH_URL || 'http://127.0.0.1:19387'
const SESSION = (() => { const i = process.argv.indexOf('--session'); return i === -1 ? 'dsh-widgets 组件生态调研' : process.argv[i + 1] })()
const OUT = 'docs/verify-report3'

function authCookie() {
  const yaml = fs.readFileSync('D:/dsh-home/.credentials.yaml', 'utf8')
  const secret = Buffer.from(yaml.match(/secret:\s*([A-Za-z0-9_-]+)/)[1].replaceAll('-', '+').replaceAll('_', '/'), 'base64')
  const authority = new global.URL(URL_).host
  const b64u = (b) => Buffer.from(b).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const name = 'dsh-auth-' + b64u(crypto.createHash('sha256').update(authority).digest())
  const now = Date.now()
  const body = b64u(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt: now, expiresAt: now + 86400000 }), 'utf8'))
  return { name, value: `v1.${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}` }
}

/** The legacy (v1.x / pre-0.2.0) rules, injected with !important so they beat React's inline styles. */
const LEGACY_CSS = `
.dsx-magnify-layer { overflow: visible !important; top: calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px)) !important; }
.dsx-magnify-layer > div:first-child { top: 0 !important; }
[data-conversation-scroll] :has(> nav[aria-label]) { z-index: 9 !important; }
body.dsx-stats-active [data-slot='conversation.composer.dock'] { visibility: hidden !important; }
`

const MEASURE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }
  const rail = document.querySelector('.dsx-stats-rail')
  const overlay = document.querySelector('.dsx-magnify-layer')
  const nav = [...document.querySelectorAll('nav[aria-label]')].find((n) => /导航/.test(n.getAttribute('aria-label')))
  const dock = document.querySelector('[data-slot="conversation.composer.dock"]')
  const railR = rail ? rail.getBoundingClientRect() : null
  const navR = nav ? nav.getBoundingClientRect() : null
  const ovR = overlay ? overlay.getBoundingClientRect() : null
  const owns = (el) => (el && overlay && overlay.contains(el) ? 'MAGNIFY' : 'other')
  // Top strip over the rail's own columns: who owns y < railTop?
  const topStrip = []
  if (railR) for (const y of [2, 12, 24, 40, 60]) for (const x of [Math.round(railR.right - 30), Math.round(railR.right - 200), Math.round(railR.left + 30)]) topStrip.push([x, y, owns(document.elementFromPoint(x, y))])
  const inter = navR && ovR ? { x: Math.max(navR.x, ovR.x), x2: Math.min(navR.right, ovR.right), y: Math.max(navR.y, ovR.y), y2: Math.min(navR.bottom, ovR.bottom) } : null
  // PAINTED overlap: which magnified CARD boxes (not the transparent layer) reach
  // into the navigator's strip, and by how many px. This is what the navigator
  // used to cut, so the visual proof needs a non-zero value here.
  const painted = navR === null ? [] : [...document.querySelectorAll('.dsx-magnify-layer .dsx-stats-card-slot')]
    .map((s) => s.getBoundingClientRect())
    .filter((r) => r.right > navR.left && r.left < navR.right && r.bottom > navR.top && r.top < navR.bottom)
    .map((r) => ({ left: Math.round(r.left), right: Math.round(r.right), y: [Math.round(r.top), Math.round(r.bottom)] }))
  const paintedOverlapPx = painted.length === 0 ? 0 : Math.round(Math.min(...painted.map((p) => navR.right - p.left)))
  const overlapHit = inter && inter.x2 > inter.x && inter.y2 > inter.y
    ? (() => { const el = document.elementFromPoint((inter.x + inter.x2) / 2, (inter.y + inter.y2) / 2); return { owner: owns(el), mag: !!(el && overlay && overlay.contains(el)), nav: !!(el && nav && (el === nav || nav.contains(el))) } })()
    : null
  const navOwnPoint = navR ? (() => { const el = document.elementFromPoint(Math.round(navR.x + navR.width / 2), Math.round(navR.y + navR.height / 2)); return { mag: !!(el && overlay && overlay.contains(el)), nav: !!(el && nav && (el === nav || nav.contains(el))) } })() : null
  return {
    railScroll: rail ? Math.round(rail.scrollTop) : null,
    railTop: railR ? Math.round(railR.top) : null,
    railRect: R(rail), overlayRect: R(overlay), overlayOverflow: overlay ? getComputedStyle(overlay).overflow : null,
    navRect: R(nav), navSlotZ: nav && nav.parentElement ? getComputedStyle(nav.parentElement).zIndex : null,
    navTopPointOwner: navOwnPoint,
    paintedOverlapPx, painted,
    topStrip, topStripMagnify: topStrip.filter(([, , o]) => o === 'MAGNIFY').length,
    overlap: inter, overlapHit,
    dockVis: dock ? getComputedStyle(dock).visibility : null,
    dockText: dock ? (dock.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) : null,
    dockRect: R(dock ? dock.parentElement : null),
  }
}

let failures = 0
const check = (name, ok, detail) => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${detail}`}`) }

;(async () => {
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  const page = await ctx.newPage()
  await page.goto(URL_, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  const welcome = page.getByRole('button', { name: '继续' }).first()
  if (await welcome.count()) { await welcome.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200) }

  const row = page.locator('div[class*="sessionRow"]', { hasText: SESSION }).first()
  if (!(await row.count())) { console.error(`FAIL  no session row matching "${SESSION}"`); await browser.close(); process.exit(1) }
  await row.click({ timeout: 8000 })
  await page.waitForTimeout(4000)

  const cap = page.locator('.dsx-stats-capsule').first()
  await cap.waitFor({ timeout: 8000 })
  if ((await cap.getAttribute('aria-pressed')) !== 'true') { await cap.click(); await page.waitForTimeout(1600) }

  // Scroll the rail (the reported trigger) and hover the LEFTMOST card whose row
  // sits on the navigator's band: that is the card that grows left into the
  // navigator's gutter, so its magnified body is what the navigator used to cut.
  const railR = await page.evaluate(() => { const r = document.querySelector('.dsx-stats-rail').getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] })
  await page.mouse.move(railR[0] + railR[2] / 2, 400)
  await page.mouse.wheel(0, 340)
  await page.waitForTimeout(900)
  const cardPt = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('nav[aria-label]')].find((n) => /导航/.test(n.getAttribute('aria-label')))
    const navR = nav ? nav.getBoundingClientRect() : null
    const cards = [...document.querySelectorAll('.dsx-stats-card')].map((c) => ({ r: c.getBoundingClientRect() }))
    const onBand = cards.filter(({ r }) => !navR || (r.bottom > navR.top && r.top < navR.bottom))
    const pool = onBand.length > 0 ? onBand : cards
    pool.sort((a, b) => a.r.x - b.r.x)
    return pool.length === 0 ? null : [Math.round(pool[0].r.x + pool[0].r.width / 2), Math.round(pool[0].r.y + pool[0].r.height / 2)]
  })
  if (cardPt === null) { console.error('FAIL  no card to hover'); await browser.close(); process.exit(1) }
  await page.mouse.move(cardPt[0], cardPt[1], { steps: 6 })
  await page.waitForTimeout(1300)

  fs.mkdirSync(OUT, { recursive: true })
  const navBand = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('nav[aria-label]')].find((n) => /导航/.test(n.getAttribute('aria-label')))
    if (!nav) return null
    const r = nav.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  })
  const headerClip = { x: Math.min(railR[0] + 20, 1400), y: 0, width: 380, height: 130 }
  const navClip = navBand === null
    ? { x: 1230, y: 380, width: 180, height: 260 }
    : { x: Math.max(0, navBand.x - 60), y: Math.max(0, navBand.y - 16), width: navBand.width + 160, height: navBand.height + 32 }

  const now = await page.evaluate(MEASURE)
  await page.screenshot({ path: `${OUT}/stacking-fixed-header.png`, clip: headerClip })
  await page.screenshot({ path: `${OUT}/stacking-fixed-nav.png`, clip: navClip })
  console.log('--- fixed build ---')
  console.log(JSON.stringify({ ...now, topStrip: now.topStrip.slice(0, 6) }, null, 1))

  check('overlay is clipped to the rail band (overflow: hidden)', now.overlayOverflow === 'hidden', now.overlayOverflow)
  check('overlay top tracks --dsx-rail-top after a rail scroll', now.overlayRect !== null && now.overlayRect[1] === now.railTop, `overlay.top=${now.overlayRect && now.overlayRect[1]} rail.top=${now.railTop} scroll=${now.railScroll}`)
  check('no magnified pixel above the rail top (top menu bar / header)', now.topStripMagnify === 0, `${now.topStripMagnify} of ${now.topStrip.length} samples owned by the overlay`)
  check('turn navigator keeps the product z-index (no 9 override)', String(now.navSlotZ) === '7', `slot z=${now.navSlotZ}`)
  if (now.navRect === null) {
    console.log('SKIP  navigator not mounted in this session (needs >=2 turns and an idle session)')
  } else {
    check('magnified card paints above the turn navigator where they overlap', now.overlapHit !== null && now.overlapHit.mag === true, JSON.stringify(now.overlapHit))
  }
  check('composer dock info bar stays visible while the rail is open', now.dockVis === 'visible' && (now.dockText || '').length > 0, `vis=${now.dockVis} text="${now.dockText}"`)

  // At rest the navigator must still own its own strip (the overlay is
  // pointer-events:none and has no left overhang then) — the wave must not steal
  // the product control's hover.
  await page.mouse.move(600, 500)
  await page.waitForTimeout(1000)
  const rest = await page.evaluate(MEASURE)
  check('turn navigator keeps its own hover strip with the rail at rest', rest.navTopPointOwner === null || rest.navTopPointOwner.mag === false, JSON.stringify(rest.navTopPointOwner))

  // ── Counter-proof: the same three rules from v1.x must fail these checks. ──
  await page.mouse.move(cardPt[0], cardPt[1], { steps: 6 })
  await page.waitForTimeout(1200)
  await page.addStyleTag({ content: LEGACY_CSS })
  await page.waitForTimeout(500)
  const legacy = await page.evaluate(MEASURE)
  await page.screenshot({ path: `${OUT}/stacking-legacy-header.png`, clip: headerClip })
  await page.screenshot({ path: `${OUT}/stacking-legacy-nav.png`, clip: navClip })
  console.log('--- legacy rules re-applied ---')
  console.log(JSON.stringify({ ...legacy, topStrip: legacy.topStrip.slice(0, 6) }, null, 1))
  check('[counter-proof] legacy overlay paints above the rail top', legacy.overlayRect !== null && legacy.overlayRect[1] < legacy.railTop, `overlay.top=${legacy.overlayRect && legacy.overlayRect[1]} rail.top=${legacy.railTop}`)
  check('[counter-proof] legacy overlay owns pixels over the top bar', legacy.topStripMagnify > 0, `${legacy.topStripMagnify} of ${legacy.topStrip.length}`)
  if (legacy.navRect !== null) check('[counter-proof] legacy navigator z=9 takes the overlap back from the card', String(legacy.navSlotZ) === '9' && legacy.overlapHit !== null && legacy.overlapHit.mag === false, `slot z=${legacy.navSlotZ} ${JSON.stringify(legacy.overlapHit)}`)
  check('[counter-proof] legacy rule hides the composer dock', legacy.dockVis === 'hidden', `vis=${legacy.dockVis}`)

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  await browser.close()
  process.exit(failures === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1) })
