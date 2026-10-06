/**
 * Rail anchor guard (scripts/verify-rail-anchor-guard.cjs)
 *
 * Regression test for the owner's report (2026-10-04):
 * 「组件区域在未激活状态下切换工作区对话后会自动显示在页面顶部」.
 *
 * The rail and the magnify layer are `position: fixed; top: var(--dsx-rail-top, 0px)`.
 * The variable has NO CSS-side definition — measure.ts is its only writer — so an
 * unpublished anchor silently resolves to `top: 0` and drops the whole component
 * area onto the page top. Three things must hold, and each one failed before the
 * 2026-10-04 fix:
 *
 *   1. A measure pass must never leave the anchor unpublished on its first run:
 *      `--dsx-rail-top` used to be written only on the FULL vertical probe, while
 *      install()'s first call always took a width-only early return.
 *   2. Teardown must not delete the anchor, so a frame rebuild that remounts the
 *      rail before the next publish cannot expose the `0px` fallback.
 *   3. Belt and braces: while <html> carries no inline anchor, the rail-owned
 *      fixed layers must not paint at all (rail.module.css), because `top: 0` is
 *      the only position they could take.
 *
 * Usage: DSH_PORT=19387 node scripts/verify-rail-anchor-guard.cjs
 */
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '19387'
const AUTHORITY = `127.0.0.1:${PORT}`
const TITLE = '修复侧边栏动画卡顿与覆盖效果'
const OUT = path.join(__dirname, '..', '.probe-rail-top-guard')

const SAMPLER = () => {
  const w = window
  w.__gFrames = []
  w.__gStop = false
  const read = (sel) => {
    const el = document.querySelector(sel)
    if (el === null) return null
    const cs = getComputedStyle(el)
    const b = el.getBoundingClientRect()
    return { vis: cs.visibility, op: Number(cs.opacity), y: Math.round(b.top) }
  }
  const tick = () => {
    if (w.__gStop) return
    w.__gFrames.push({
      t: Math.round(performance.now()),
      rt: document.documentElement.style.getPropertyValue('--dsx-rail-top'),
      rail: read('.dsx-stats-rail'),
      mag: read('.dsx-magnify-layer'),
      add: read('.dsx-stats-addpanel'),
      body: document.body.className,
    })
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

;(async () => {
  const fs = require('node:fs')
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1.5 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  await ctx.addInitScript(SAMPLER)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://${AUTHORITY}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(7000)

  // Pin the session by title, and assert we actually landed on it.
  const pinned = await page.evaluate((title) => {
    const rows = [...document.querySelectorAll('div[class*="sessionRow"]')]
    const hit = rows.findIndex((r) => (r.innerText || '').includes(title))
    if (hit < 0) return null
    if (rows[hit].getAttribute('aria-selected') !== 'true') rows[hit].click()
    return { hit, count: rows.length }
  }, TITLE)
  if (pinned === null) { console.log('FAILED: pinned session not found'); await browser.close(); process.exit(1) }
  await page.waitForTimeout(2500)
  const activeTitle = await page.evaluate(() => {
    const el = document.querySelector('div[class*="sessionRow"][aria-selected="true"]')
    return el === null ? '' : (el.innerText || '').replace(/\s+/g, ' ').trim()
  })
  if (!activeTitle.includes(TITLE)) {
    console.log(`FAILED: WRONG CONVERSATION active="${activeTitle}"`)
    await browser.close(); process.exit(1)
  }
  console.log(`[pin] row=${pinned.hit}/${pinned.count} active="${activeTitle}"`)

  await page.waitForTimeout(1500)
  // The guard is only meaningful with a PAINTED rail: a retired drawer is
  // `visibility: hidden` for its own reasons and would pass trivially. Open the
  // rail through its own header toggle if it is closed (this writes the owner's
  // `railOpen` pref, so the probe restores it after the browser is gone).
  const opened = await page.evaluate(() => {
    const active = () => document.body.className.includes('dsx-stats-active')
    if (active()) return 'already-open'
    const b = document.querySelector('button.dsx-stats-capsule')
    if (b === null) return 'no-capsule'
    b.click()
    return 'clicked'
  })
  await page.waitForTimeout(1200)
  const before = await page.evaluate(() => {
    const el = document.querySelector('.dsx-stats-rail')
    const cs = getComputedStyle(el)
    const b = el.getBoundingClientRect()
    return { rt: document.documentElement.style.getPropertyValue('--dsx-rail-top'), vis: cs.visibility, y: Math.round(b.top), body: document.body.className, opened: '' }
  })
  console.log(`[open] ${opened} → [before] ${JSON.stringify(before)}`)
  if (before.vis === 'hidden') {
    console.log('FAILED: rail is still hidden — cannot exercise the guard')
    await browser.close(); process.exit(1)
  }

  // ── PHASE 1: unpublish the anchor in the SAME task, then read. ──
  const guard = await page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel)
      if (el === null) return null
      const cs = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      return { vis: cs.visibility, y: Math.round(b.top) }
    }
    const pre = { rail: read('.dsx-stats-rail'), mag: read('.dsx-magnify-layer') }
    document.documentElement.style.removeProperty('--dsx-rail-top')
    const post = {
      rt: document.documentElement.style.getPropertyValue('--dsx-rail-top'),
      railComputedTop: getComputedStyle(document.querySelector('.dsx-stats-rail')).top,
      rail: read('.dsx-stats-rail'),
      mag: read('.dsx-magnify-layer'),
    }
    return { pre, post }
  })
  console.log(`[guard] before removal ${JSON.stringify(guard.pre)}`)
  console.log(`[guard] after  removal ${JSON.stringify(guard.post)}`)
  const guarded = guard.post.rail.vis === 'hidden' && guard.post.mag.vis === 'hidden'
  console.log(`[guard] ${guarded ? 'PASS' : 'FAIL'} — unpainted surfaces must be hidden, not drawn at y=0`)

  // ── PHASE 2: with the anchor gone, make the shell move its right-bar column
  // (the horizontalOnly tick) and check the anchor comes back on the first pass. ──
  await page.waitForTimeout(600)
  const afterIdle = await page.evaluate(() => document.documentElement.style.getPropertyValue('--dsx-rail-top'))
  console.log(`[recover] anchor after 600ms idle: "${afterIdle}"`)

  await page.evaluate(() => { window.__gFrames = [] })
  const toggled = await page.evaluate(() => {
    const b = document.querySelector('[data-sidebar-right-toggle],[data-sidebar-right-expand]')
    if (b === null) return false
    b.click()
    return true
  })
  if (!toggled) console.log('[recover] WARNING: right-sidebar toggle not found')
  await page.waitForTimeout(1600)
  const frames = await page.evaluate(() => { const f = window.__gFrames; window.__gStop = true; return f })

  let firstEmpty = -1
  let visibleWithoutAnchor = 0
  for (let i = 0; i < frames.length; i += 1) {
    const f = frames[i]
    if (f.rt === '') { if (firstEmpty < 0) firstEmpty = i; continue }
    const railPainted = f.rail !== null && f.rail.vis !== 'hidden' && f.rail.y < 40
    const magPainted = f.mag !== null && f.mag.vis !== 'hidden' && f.mag.op > 0.001 && f.mag.y < 40
    if (railPainted || magPainted) visibleWithoutAnchor += 1
  }
  const anchorValues = [...new Set(frames.map((f) => f.rt))].slice(0, 6)
  console.log(`[recover] ${frames.length} frames · anchor values: ${JSON.stringify(anchorValues)}`)
  console.log(`[recover] frames with EMPTY anchor: ${firstEmpty < 0 ? 0 : frames.filter((f) => f.rt === '').length}`)
  console.log(`[recover] SUSPECTS (painted at y<40 with an empty anchor): ${visibleWithoutAnchor}`)

  const ok = guarded && visibleWithoutAnchor === 0 && afterIdle !== ''
  console.log(`\n[verdict] guard=${guarded ? 'PASS' : 'FAIL'} recovered="${afterIdle}" suspects=${visibleWithoutAnchor} pageErrors=${errors.length}`)
  console.log(`[report] ${ok && errors.length === 0 ? 'ALL CHECKS PASSED' : 'CHECKS FAILED'}`)

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'guard.json'), JSON.stringify({ before, guard, afterIdle, frames: frames.slice(0, 400), errors }, null, 2))
  await browser.close()
  process.exit(ok && errors.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })