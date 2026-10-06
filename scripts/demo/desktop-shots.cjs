/**
 * dsh-widgets — the README/poster stills, captured from the DESKTOP app.
 *
 * The owner's rule (2026-10-06): the published images are desktop-version screenshots,
 * and they speak in HarmonyOS Sans SC — never the machine's default UI font. Both are
 * capture-time decisions, exactly like scripts/demo/rail-demo.cjs: the plugin's own
 * stylesheet is untouched, the page just resolves its font for these frames.
 *
 *   node scripts/demo/desktop-shots.cjs [--authority 127.0.0.1:19387] [--needle "会话标题"]
 *
 * Writes:
 *   docs/poster/preview.png            full window (2560x1528 @1.5) — the cover's right half
 *   docs/screenshots/desktop-rail.png  the rail alone, at rest
 *   docs/screenshots/desktop-market.png the rail with the add/market panel open
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('../lib/chrome.cjs')
const { chromium } = require('../lib/playwright-core.cjs')
const { mintCookie } = require('../diag-auth-lib.cjs')

const argv = process.argv.slice(2)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }

const ROOT = path.join(__dirname, '..', '..')
const AUTHORITY = val('--authority', process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:19387')
const NEEDLE = val('--needle', process.env.DSH_SESSION_NEEDLE || '')
const FONT = val('--font', "'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif")
const W = 1707, H = 1019, DSF = 1.5   // → 2560x1528 physical, the poster's input size

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  await page.goto(`http://${AUTHORITY}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(5000)

  const row = NEEDLE ? page.getByText(NEEDLE, { exact: false }).first() : page.locator('[class$="_sessionRow"]').first()
  await row.click({ timeout: 8000 }).catch((e) => console.error('[shots] session click: ' + e.message))
  await page.waitForTimeout(8000)
  if (await page.evaluate(() => !!document.querySelector('.dsx-stats-drawer[data-retired]'))) {
    await page.locator('.dsx-stats-capsule').first().click({ timeout: 8000 }).catch((e) => console.error('[shots] capsule: ' + e.message))
    await page.waitForTimeout(4000)
  }
  // Capture-time type override (see the header).
  if (FONT) {
    await page.evaluate((stack) => {
      document.documentElement.style.setProperty('--dsw-font-family', stack)
      const style = document.createElement('style')
      style.id = 'dsx-demo-font'
      style.textContent = `.dsx-stats-rail, .dsx-stats-rail *, .dsx-stats-addpanel, .dsx-stats-addpanel * { font-family: ${stack}; } .dsx-tip::after { display: none !important; }`
      document.head.appendChild(style)
    }, FONT)
  }
  await page.mouse.move(10, H - 10).catch(() => {})
  // Wait for every card to leave its loading silhouette (`.dsx-sk-card`) — a still that
  // shows placeholder blocks is not a selling point. Bounded: 60 s.
  const deadline = Date.now() + 60000
  let skeletons = -1
  while (Date.now() < deadline) {
    skeletons = await page.evaluate(() => document.querySelectorAll('.dsx-sk-card').length)
    if (skeletons === 0) break
    await sleep(1500)
  }
  console.log(`[shots] skeletons left: ${skeletons}`)
  await page.waitForTimeout(2500)   // let the cards settle with the new metrics

  const geom = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const deck = box('.dsx-wave-deck')
    const cards = [...document.querySelectorAll('.dsx-stats-card')].map((c) => c.getBoundingClientRect())
    const bottom = cards.length ? Math.max(...cards.map((b) => b.bottom)) : null
    // The lowest row that is FULLY inside both the window and the deck's own clip edge:
    // a still must not end on a half card.
    const deckBottom0 = deck ? deck.y + deck.h : window.innerHeight
    const limit = Math.min(window.innerHeight, deckBottom0) - 6
    const visible = cards.filter((b) => b.bottom <= limit).map((b) => b.bottom)
    const lastFull = visible.length ? Math.max(...visible) : null
    const deckBottom = deck ? deck.y + deck.h : null
    return { rail: box('.dsx-stats-rail'), deck, cards: cards.length, bottom, lastFull, deckBottom, limit }
  })
  if (geom.rail === null) { console.error('[shots] no rail — is a session open?'); process.exit(2) }
  console.log(`[shots] rail ${geom.rail.w}x${geom.rail.h} @${geom.rail.x},${geom.rail.y} · ${geom.cards} cards · lastFull=${geom.lastFull} deckBottom=${geom.deckBottom} limit=${geom.limit}`)

  const out = (p) => path.join(ROOT, p)
  fs.mkdirSync(path.dirname(out('docs/poster/preview.png')), { recursive: true })

  // 1) The full window: the cover embeds this at 90% height on its right half. The
  //    conversation half is BLURRED in place — the cover is a public asset, and nobody's
  //    chat belongs in it. The poster's own left-to-right mask fade hides the hard edge.
  const preview = out('docs/poster/preview.png')
  await page.screenshot({ path: preview, clip: { x: 0, y: 0, width: W, height: H } })
  const blurred = preview.replace(/\.png$/, '.blur.png')
  const cut = Math.round(W * DSF * 0.6)
  try {
    require('node:child_process').execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', preview,
      '-filter_complex', `[0:v]crop=${cut}:ih:0:0,boxblur=16:2[b];[0:v][b]overlay=0:0`,
      '-frames:v', '1', blurred,
    ], { stdio: 'inherit' })
    fs.renameSync(blurred, preview)
    console.log(`[shots] preview.png written, left ${cut}px blurred (conversation)`)
  } catch (e) {
    console.error('[shots] blur step failed, keeping the sharp preview: ' + e.message)
  }

  // 2) The rail alone — WITH THE WAVE ENGAGED. The pointer is parked in the GAP between two
  // rows on purpose: the wave still magnifies the nearest cards by planar distance (so the
  // peak is visible) but nothing is hovered, so no tooltip is painted into the still. The
  // crop starts left of the rail's overhang and never includes conversation; it runs from
  // y=0 so the header's 组件 capsule is in the top-right corner.
  const pitch = (geom.deck?.h ?? geom.rail.h) / 5
  await page.mouse.move(geom.rail.x + geom.rail.w * 0.42, Math.round(geom.rail.y + pitch * 2 - 5), { steps: 8 }).catch(() => {})
  await page.waitForTimeout(900)
  const railBottom = Math.min(geom.lastFull ?? geom.deckBottom ?? geom.rail.y + geom.rail.h, geom.deckBottom ?? H)
  const waveClip = {
    x: Math.max(0, geom.rail.x - 78),
    y: 0,
    width: Math.min(W - Math.max(0, geom.rail.x - 78), geom.rail.w + 78 + 6),
    height: Math.min(H, railBottom + 12),
  }
  await page.screenshot({ path: out('docs/poster/rail-portrait.png'), clip: waveClip })
  await page.screenshot({ path: out('docs/screenshots/desktop-rail.png'), clip: waveClip })
  console.log(`[shots] desktop-rail.png ${waveClip.width}x${waveClip.height} @${DSF}x (wave engaged, no conversation)`)
  await page.mouse.move(10, H - 10).catch(() => {})
  await page.waitForTimeout(600)
  const pad = 16
  const railClip = {
    x: Math.max(0, geom.rail.x - pad),
    y: Math.max(0, geom.rail.y - pad),
    width: Math.min(W - Math.max(0, geom.rail.x - pad), geom.rail.w + pad * 2),
    height: Math.min(H - Math.max(0, geom.rail.y - pad), railBottom - (geom.rail.y - pad) + pad),
  }
  await page.screenshot({ path: out('docs/screenshots/desktop-rail-rest.png'), clip: railClip })
  console.log(`[shots] desktop-rail-rest.png ${railClip.width}x${railClip.height} @${DSF}x`)

  // 3) The add / market panel. The rail's own add tile is only HITTABLE while the wave is
  // engaged (its peer in the magnify layer carries `pointer-events: auto` only while
  // morphing), so move the pointer onto the rail first, then click that one.
  await page.mouse.move(geom.rail.x + geom.rail.w / 2, geom.rail.y + geom.rail.h / 2, { steps: 6 }).catch(() => {})
  await page.waitForTimeout(700)
  await page.locator('.dsx-magnify-layer .dsx-stats-add').first().click({ timeout: 8000 })
    .catch(async () => { await page.locator('.dsx-stats-rail .dsx-stats-add').first().click({ force: true, timeout: 4000 }).catch((e) => console.error('[shots] add tile: ' + e.message)) })
  await page.waitForTimeout(3000)
  // The library is the selling point, not the installed-list: switch to the market tab.
  await page.getByText('组件市场', { exact: true }).first().click({ timeout: 5000 })
    .catch((e) => console.error('[shots] market tab: ' + e.message))
  await page.waitForTimeout(2500)
  const panel = await page.evaluate(() => {
    const el = document.querySelector('.dsx-stats-addpanel')
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), open: el.classList.contains('open') }
  })
  if (panel !== null) {
    const x = Math.max(0, panel.x - 8)
    const y = Math.max(0, panel.y - 8)
    const right = panel.x + panel.w + 8
    const bottom = Math.min(H, Math.max(panel.y + panel.h, railBottom)) + 8
    await page.screenshot({ path: out('docs/screenshots/desktop-market.png'), clip: { x, y, width: Math.min(W - x, right - x), height: Math.min(H - y, bottom - y) } })
    console.log(`[shots] desktop-market.png ${Math.round(Math.min(W - x, right - x))}x${Math.round(Math.min(H - y, bottom - y))} @${DSF}x (panel open=${panel.open})`)
  } else {
    console.error('[shots] add panel not found — desktop-market.png skipped')
  }

  await browser.close()
})().catch((e) => { console.error('[shots] FAILED', e); process.exit(1) })
