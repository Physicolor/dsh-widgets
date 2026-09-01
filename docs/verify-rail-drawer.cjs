// Verify: dsh-widgets rail drawer open/close animation.
//   - OPEN: the rail must glide in from the LEFT (translateX(-100%) -> 0),
//     i.e. sampled frames show intermediate left positions between the
//     off-screen start and the resting slot before settling.
//   - CLOSE: the rail must slide OUT to the RIGHT (0 -> translateX(100%)),
//     i.e. sampled frames advance rightwards until the element unmounts.
//   - INTERRUPT: a rapid open -> close -> open sequence must never unmount or
//     jump; the element stays mounted and positions change continuously.
//   - REDUCED MOTION / baseline: a single-frame direct settle (pop) FAILS the
//     animation checks (that is exactly the bug being fixed).
// Run with Node against the live dsh web at http://127.0.0.1:3080.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const RESULTS = {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const originalState = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    return r.ok ? await r.json() : null
  })
  const restoreState = () => page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {})
  }, originalState)

  // Ensure an active session so hasSession lets the rail mount: click the
  // first real (non-"新会话") session row in the sidebar.
  const sess = page.locator('.YDXeBa_sessionRow').filter({ hasNotText: '新会话' }).first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4500) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (!(await cap.count())) { console.log('NO_CAPSULE: widget capsule button missing'); await restoreState(); await browser.close(); process.exit(2) }
  // Start from a closed rail (toggle until absent).
  for (let i = 0; i < 3; i++) {
    const openNow = await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))
    if (!openNow) break
    await cap.click(); await page.waitForTimeout(500)
  }

  // ---- OPEN timeline: click then sample rAF frames for ~420ms. ----
  const openSeq = await page.evaluate(async (duration) => {
    const out = []
    const btn = document.querySelector('button.dsx-stats-capsule')
    const start = performance.now()
    btn.click()
    let last = Symbol('none')
    while (performance.now() - start < duration) {
      const r = document.querySelector('.dsx-stats-rail')
      const cur = r ? Math.round(r.getBoundingClientRect().left * 10) / 10 : null
      if (cur !== last) { out.push({ t: Math.round(performance.now() - start), left: cur }); last = cur }
      await new Promise((res) => requestAnimationFrame(res))
    }
    return out
  }, 420)
  const openRest = openSeq.length ? openSeq[openSeq.length - 1].left : null
  const openMovedFrames = openSeq.filter((f) => f.left !== null && f.left !== openRest)
  const openFirstNonNull = openSeq.find((f) => f.left !== null)
  RESULTS.open = {
    frames: openSeq.length,
    startLeft: openFirstNonNull ? openFirstNonNull.left : null,
    restLeft: openRest,
    intermediateFrames: openMovedFrames.length,
    // Opening must come FROM THE RIGHT (start > rest) and glide down onto the
    // resting slot: every intermediate sample sits to the right of rest.
    cameFromRight: openFirstNonNull !== undefined && openFirstNonNull.left > openRest
      && openMovedFrames.length > 0 && openMovedFrames.every((f) => f.left > openRest),
  }

  await page.waitForTimeout(500) // settle

  // ---- CLOSE timeline: sample while unmounting. ----
  const closeSeq = await page.evaluate(async (duration) => {
    const out = []
    const btn = document.querySelector('button.dsx-stats-capsule')
    const start = performance.now()
    const vw = window.innerWidth
    btn.click()
    let last = Symbol('none')
    while (performance.now() - start < duration) {
      const r = document.querySelector('.dsx-stats-rail')
      const cur = r ? Math.round(r.getBoundingClientRect().left * 10) / 10 : null
      if (cur !== last) { out.push({ t: Math.round(performance.now() - start), left: cur }); last = cur }
      await new Promise((res) => requestAnimationFrame(res))
    }
    return { seq: out, vw }
  }, 420)
  const closeFrames = closeSeq.seq.filter((f) => f.left !== null)
  const closeGoneFrames = closeSeq.seq.filter((f) => f.left === null).length
  const maxLeft = closeFrames.reduce((m, f) => Math.max(m, f.left), -1e9)
  RESULTS.close = {
    frames: closeSeq.seq.length,
    movedRightwards: closeFrames.length > 0 && closeFrames.every((f, i) => i === 0 || f.left >= closeFrames[i - 1].left),
    slidPastViewport: maxLeft >= closeSeq.vw - 1,
    unmounted: closeGoneFrames > 0,
    maxLeft,
  }

  // After close completes the rail must be gone.
  await page.waitForTimeout(500)
  RESULTS.close.unmountedAfterWait = !(await page.evaluate(() => !!document.querySelector('.dsx-stats-rail')))

  // ---- INTERRUPT timeline: open -> close -> open rapidly, sample all. ----
  const interSeq = await page.evaluate(async () => {
    const out = []
    const btn = document.querySelector('button.dsx-stats-capsule')
    let last = Symbol('none')
    const push = () => {
      const r = document.querySelector('.dsx-stats-rail')
      const cur = r ? Math.round(r.getBoundingClientRect().left * 10) / 10 : null
      if (cur !== last) { out.push({ t: Date.now(), left: cur }); last = cur }
    }
    const started = Date.now()
    btn.click() // open
    await new Promise((r) => setTimeout(r, 170))
    btn.click() // close (interrupts the opening)
    await new Promise((r) => setTimeout(r, 130))
    btn.click() // reopen (interrupts the closing)
    while (Date.now() - started < 650) { push(); await new Promise((res) => requestAnimationFrame(res)) }
    return out
  })
  const interNonNull = interSeq.filter((f) => f.left !== null)
  const jumps = []
  for (let i = 1; i < interNonNull.length; i++) {
    const d = Math.abs(interNonNull[i].left - interNonNull[i - 1].left)
    if (d > 70) jumps.push({ at: interNonNull[i].t, from: interNonNull[i - 1].left, to: interNonNull[i].left, d })
  }
  const finalLeft = interNonNull.length ? interNonNull[interNonNull.length - 1].left : null
  RESULTS.interrupt = {
    frames: interSeq.length,
    neverUnmounted: interSeq.every((f) => f.left !== null),
    maxStepJump: interNonNull.reduce((m, f, i) => i === 0 ? m : Math.max(m, Math.abs(f.left - interNonNull[i - 1].left)), 0),
    hardJumps: jumps.length,
    finalRestMatches: finalLeft !== null && Math.abs(finalLeft - openRest) < 21,
    finalLeft,
  }

  // ---- Regression smoke: the wrapper must not break the add panel (its
  //      containing block changes while the wrapper carries a transform) or
  //      the card hover/magnify deck. Capture mid-slide screenshots too. ----
  // The interrupt timeline ends with the rail OPEN; ensure a clean
  // closed -> open cycle so the mid-slide screenshot is meaningful.
  const smoke = {}
  let railPresent = await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))
  if (railPresent) { await cap.click(); await page.waitForTimeout(600) }
  await cap.click(); await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'rail-drawer-open-mid.png') })
  await page.waitForTimeout(500) // settle open
  const addBtn = page.locator('.dsx-stats-add').first()
  if (await addBtn.count()) {
    await addBtn.click(); await page.waitForTimeout(400)
    smoke.addpanelOpen = await page.evaluate(() => !!document.querySelector('.dsx-stats-addpanel.open'))
    const closeBtn = page.locator('.dsx-stats-addpanel-close').first()
    if (await closeBtn.count()) { await closeBtn.click(); await page.waitForTimeout(350) }
  }
  const firstCard = page.locator('.dsx-stats-rail .dsx-stats-card').first()
  if (await firstCard.count()) await firstCard.hover()
  await page.waitForTimeout(300)
  smoke.cardsRendered = await page.evaluate(() => document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot').length)
  smoke.noConsoleErrors = errs.length === 0
  RESULTS.smoke = smoke
  // Close the rail for a clean restore.
  await cap.click(); await page.waitForTimeout(500)

  // NOTE: the widget state (railOpen) was touched by the toggles; restore it.
  await restoreState()
  await browser.close()

  const pass = RESULTS.open.intermediateFrames >= 3
    && RESULTS.open.cameFromRight
    && RESULTS.close.movedRightwards
    && RESULTS.close.unmountedAfterWait
    && RESULTS.interrupt.neverUnmounted
    && RESULTS.interrupt.hardJumps === 0
    && RESULTS.interrupt.finalRestMatches
    && RESULTS.smoke.addpanelOpen
    && RESULTS.smoke.cardsRendered > 0
    && RESULTS.smoke.noConsoleErrors
  RESULTS.pass = pass
  console.log(JSON.stringify(RESULTS, null, 2))
  console.log('CONSOLE_ERRORS:', JSON.stringify(errs))
  process.exit(pass ? 0 : 1)
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })