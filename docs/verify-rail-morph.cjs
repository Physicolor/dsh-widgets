/**
 * Per-frame morph velocity probe (docs/verify-rail-morph.cjs)
 *
 * The user reports the GROW reading as disconnected while the SHRINK looks
 * right. This samples every animation frame of one hover-in and one hover-out
 * and reports, per frame:
 *
 *   t    ms since the gesture started
 *   s    the largest overlay slot scale (getComputedStyle -> matrix a)
 *   v    d(scale)/dt in scale-units per second (the "speed" of the grow)
 *   td   the slot's transition-duration ("0.2s" = the settle tween is live,
 *        "0s" = follow/return, i.e. geometry written per frame)
 *   op   the overlay layer's opacity
 *
 * Three gestures, because the difference matters:
 *   A  ENTER-stepped  鈥?the pointer walks onto the card over ~10 frames (what a
 *                       human actually does)
 *   B  ENTER-direct   鈥?a single jump onto the card (one pointer event)
 *   C  LEAVE-stepped  鈥?the pointer walks off the card over ~10 frames
 *
 * Usage: node docs/verify-rail-morph.cjs   (HEADFUL=1 for the real GPU)
 */
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: process.env.HEADFUL !== '1',
  })
  const ctx = await browser.newContext({
    viewport: { width: 1578, height: 1000 },
    // REDUCED=1 checks the prefers-reduced-motion path: the wave must arrive in
    // ONE frame (no spring, no rAF loop).
    reducedMotion: process.env.REDUCED === '1' ? 'reduce' : 'no-preference',
  })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  const row = page.locator('[class$="_sessionRow"]').first()
  await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4500) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail + div .dsx-stats-card-slot'))) break
    if (!(await cap.count())) { await page.waitForTimeout(500); continue }
    await cap.click().catch(() => {}); await page.waitForTimeout(600)
  }
  await page.locator('.dsx-stats-rail + div .dsx-stats-card-slot').first().waitFor({ state: 'attached', timeout: 20000 })
  await page.waitForTimeout(900)

  await page.evaluate(() => {
    window.__mf = { frames: [], raf: 0, t0: 0, idx: 0 }
    const tick = () => {
      const t = performance.now() - window.__mf.t0
      const slots = document.querySelectorAll('.dsx-stats-rail + div .dsx-stats-card-slot')
      // Follow the card the pointer is actually entering, not "the largest
      // scale": when two neighbours are close, the max jumps between them and
      // fakes a velocity spike.
      const s = slots[Math.min(window.__mf.idx, slots.length - 1)]
      let scale = 1
      let td = ''
      if (s) {
        const cs = getComputedStyle(s)
        const m = /matrix\(([^,]+)/.exec(cs.transform)
        scale = m ? Number(m[1]) : 1
        td = cs.transitionDuration
      }
      const layer = document.querySelector('.dsx-stats-rail + div')
      const lop = layer ? Number(getComputedStyle(layer).opacity) : -1
      window.__mf.frames.push({ t, s: scale, td, op: lop })
      window.__mf.raf = requestAnimationFrame(tick)
    }
    window.__mf.start = () => { window.__mf.frames.length = 0; window.__mf.t0 = performance.now(); if (!window.__mf.raf) window.__mf.raf = requestAnimationFrame(tick) }
    window.__mf.stop = () => { cancelAnimationFrame(window.__mf.raf); window.__mf.raf = 0; return window.__mf.frames.slice() }
  })

  const target = await page.evaluate(() => {
    const s = document.querySelector('.dsx-wave-deck .dsx-stats-card-slot')
    const b = s.getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
  })
  const PARK = { x: 900, y: 620 }

  // Warm up first: the very first hover of a fresh rail pays a one-off raster
  // (~65-90ms) that would otherwise be mistaken for a curve defect.
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(450)
  await page.mouse.move(PARK.x, PARK.y)
  await page.waitForTimeout(700)

  /** Index of the overlay slot under the target point, sampled by the page. */
  await page.evaluate((pt) => {
    const slots = [...document.querySelectorAll('.dsx-stats-rail + div .dsx-stats-card-slot')]
    const i = slots.findIndex((el) => { const b = el.getBoundingClientRect(); return pt.x >= b.left && pt.x <= b.right && pt.y >= b.top && pt.y <= b.bottom })
    window.__mf.idx = i < 0 ? 0 : i
  }, target)

  const walk = async (from, to, frames, gap) => {
    for (let i = 1; i <= frames; i++) {
      const k = i / frames
      await page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k)
      await page.waitForTimeout(gap)
    }
  }

  const show = (label, frames) => {
    console.log(`\n=== ${label} ===`)
    console.log('   t(ms)    scale     v(sc/s)   transition-duration   layerOp')
    let prev = null
    const speeds = []
    for (const f of frames) {
      const v = prev === null ? NaN : (f.s - prev.s) / ((f.t - prev.t) / 1000)
      if (Number.isFinite(v)) speeds.push({ t: f.t, v })
      console.log(`  ${f.t.toFixed(1).padStart(6)}  ${f.s.toFixed(4)}  ${(Number.isFinite(v) ? v.toFixed(3) : '   -').padStart(8)}   ${f.td.padEnd(20)} ${f.op}`)
      prev = f
    }
    // sign changes in speed = the curve restarted / reversed; a jump = a cut
    const reversals = speeds.filter((p, i) => i > 0 && Math.sign(p.v) !== Math.sign(speeds[i - 1].v) && Math.abs(p.v) > 0.05)
    const maxJump = frames.slice(1).reduce((m, f, i) => Math.max(m, Math.abs(f.s - frames[i].s)), 0)
    const settleFrames = frames.filter((f) => f.td.includes('0.2')).length
    console.log(`  summary: frames=${frames.length} settleFrames(td=0.2s)=${settleFrames} speedReversals=${reversals.length} maxFrameStep=${maxJump.toFixed(4)}`)
    return { reversals, maxJump, settleFrames }
  }

  // A 鈥?enter, pointer walks on
  await page.mouse.move(PARK.x, PARK.y)
  await page.waitForTimeout(900)
  await page.evaluate(() => window.__mf.start())
  await walk(PARK, target, 10, 18)
  await page.waitForTimeout(500)
  const A = await page.evaluate(() => window.__mf.stop())
  show('A ENTER-stepped (pointer walks on over ~10 frames)', A)
  await page.mouse.move(PARK.x, PARK.y)
  await page.waitForTimeout(900)

  // B 鈥?enter, single jump
  await page.evaluate(() => window.__mf.start())
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(700)
  const B = await page.evaluate(() => window.__mf.stop())
  show('B ENTER-direct (one pointer event)', B)
  await page.mouse.move(PARK.x, PARK.y)
  await page.waitForTimeout(900)

  // C 鈥?leave, pointer walks off
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(700)
  await page.evaluate(() => window.__mf.start())
  await walk(target, PARK, 10, 18)
  await page.waitForTimeout(500)
  const C = await page.evaluate(() => window.__mf.stop())
  show('C LEAVE-stepped (pointer walks off over ~10 frames)', C)

  // D 鈥?enter, then KEEP MOVING inside the card: the reported "as soon as I move
  // over the widgets the position is wrong". With a frozen target the geometry
  // stays stale here and then snaps; with the spring it must track the pointer
  // continuously while the progress is still rising.
  await page.mouse.move(PARK.x, PARK.y)
  await page.waitForTimeout(900)
  await page.evaluate(() => window.__mf.start())
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(90)
  await walk({ x: target.x - 26, y: target.y }, { x: target.x + 26, y: target.y }, 12, 20)
  await page.waitForTimeout(450)
  const D = await page.evaluate(() => window.__mf.stop())
  show('D ENTER-then-move (pointer keeps moving inside the card)', D)

  await browser.close()
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
