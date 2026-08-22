// Attempt a real interaction test: enter a session, open the widgets rail,
// hover a card and assert the magnification overlay appears / stays in gaps /
// stops after leaving the rail.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 500)
  console.log('PAGE_TEXT_HEAD:', JSON.stringify(bodyText))

  // Try to click into the most recent session item, if the home lists sessions.
  const sessionLink = page.getByText('组件状态保存问题排查').first()
  const count = await sessionLink.count()
  console.log('SESSION_LINK_COUNT:', count)
  if (count > 0) {
    await sessionLink.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(4000)
  }

  // Toggle the widgets capsule ("组件") in the session header.
  const capsule = page.locator('button.dsx-stats-capsule').first()
  const capCount = await capsule.count()
  console.log('CAPSULE_COUNT:', capCount)
  if (capCount > 0) {
    await capsule.click()
    await page.waitForTimeout(1500)
    const rails = await page.locator('.dsx-stats-rail').count()
    console.log('RAIL_COUNT:', rails)
    const cards = await page.locator('.dsx-stats-card-slot').count()
    console.log('CARD_SLOTS:', cards)
    if (rails > 0 && cards > 0) {
      const box = await page.locator('.dsx-stats-card-slot').first().boundingBox()
      console.log('FIRST_CARD_BOX:', JSON.stringify(box))
      // magnify overlay is the fixed div with z-index 25
      const hasOverlay = () => page.evaluate(() => {
        const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
        return layer ? parseFloat(getComputedStyle(layer).opacity) > 0.5 : false
      })
      console.log('OVERLAY_BEFORE:', await hasOverlay())
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(600)
      console.log('OVERLAY_ON_CARD:', await hasOverlay())
      // move into the gap right of the first card (still inside the rail)
      await page.mouse.move(box.x + box.width + 8, box.y + box.height / 2)
      await page.waitForTimeout(600)
      console.log('OVERLAY_IN_GAP:', await hasOverlay())
      // move far left, outside the rail
      await page.mouse.move(100, box.y + box.height / 2)
      await page.waitForTimeout(600)
      console.log('OVERLAY_LEFT_OUTSIDE:', await hasOverlay())
    }
  }
  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors))

  // --- v1.1.6 round: smooth tween / right-edge alignment / gap wave / add rides ---
  const cardCount = await page.locator('.dsx-stats-card-slot').count()
  console.log('V116_ROUND: discrete overlay diagnostics')
  const overlayTransition = await page.evaluate(() => {
    const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
    if (!layer) return null
    const slot = layer.querySelector('.dsx-stats-card-slot')
    if (!slot) return null
    const cs = getComputedStyle(slot)
    return { props: cs.transitionProperty, durations: cs.transitionDuration }
  })
  console.log('OVERLAY_TRANSITION:', JSON.stringify(overlayTransition))

  // right-edge alignment while a card row is magnified
  await page.evaluate(() => { const r = document.querySelector('.dsx-stats-rail'); if (r) r.scrollTop = 0 })
  await page.waitForTimeout(300)
  const firstCardBox = await page.locator('.dsx-stats-card-slot').first().boundingBox()
  if (firstCardBox) {
    await page.mouse.move(firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + firstCardBox.height / 2)
    await page.waitForTimeout(700)
    const align = await page.evaluate(() => {
      const rail = document.querySelector('.dsx-stats-rail')
      const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
      if (!rail || !layer) return null
      const rr = rail.getBoundingClientRect()
      const slots = (sel) => Array.from(document.querySelectorAll(sel)).map((s) => s.getBoundingClientRect().right)
      const staticRights = slots('.dsx-stats-rail .dsx-stats-card-slot')
      const overlayRights = slots('div[style*="z-index: 25"] .dsx-stats-card-slot')
      return { railRight: rr.right, staticRightmost: Math.max(...staticRights), overlayRightmost: Math.max(...overlayRights), diff: Math.max(...overlayRights) - Math.max(...staticRights) }
    })
    console.log('RIGHT_ALIGN:', JSON.stringify(align))

    // gap wave: hover card #1, sample widths; move into the gap + glide right,
    // sample again — the wave must keep changing (not frozen at card #1).
    const wA = await page.evaluate(() => Array.from(document.querySelectorAll('div[style*="z-index: 25"] .dsx-stats-card-slot')).map((s) => Math.round(parseFloat(s.style.width))) )
    await page.mouse.move(firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + firstCardBox.height / 2)
    await page.waitForTimeout(400)
    const gapX = firstCardBox.x + firstCardBox.width + 6
    await page.mouse.move(gapX, firstCardBox.y + firstCardBox.height / 2)
    await page.waitForTimeout(300)
    await page.mouse.move(gapX + 24, firstCardBox.y + firstCardBox.height / 2)
    await page.waitForTimeout(300)
    const wB = await page.evaluate(() => Array.from(document.querySelectorAll('div[style*="z-index: 25"] .dsx-stats-card-slot')).map((s) => Math.round(parseFloat(s.style.width))) )
    console.log('GAP_WAVE_A:', JSON.stringify(wA), 'B:', JSON.stringify(wB), 'CHANGED:', JSON.stringify(wA) !== JSON.stringify(wB))
  }

  // add button placement rides the wave: hover the last card while scrolled to
  // the bottom, the overlay add must sit BELOW the resting static add.
  await page.evaluate(() => { const r = document.querySelector('.dsx-stats-rail'); if (r) r.scrollTop = r.scrollHeight })
  await page.waitForTimeout(400)
  const lastCard2 = await page.locator('.dsx-stats-card-slot').nth(cardCount - 1).boundingBox()
  if (lastCard2) {
    await page.mouse.move(lastCard2.x + lastCard2.width / 2, lastCard2.y + lastCard2.height / 2)
    await page.waitForTimeout(700)
    const addTops = await page.evaluate(() => {
      const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
      const railAdd = document.querySelector('.dsx-stats-rail .dsx-stats-add')
      const ovAdd = layer ? layer.querySelector('.dsx-stats-add') : null
      return {
        railTop: railAdd ? Math.round(railAdd.getBoundingClientRect().top) : null,
        ovTop: ovAdd ? Math.round(ovAdd.getBoundingClientRect().top) : null,
        ovWidth: ovAdd ? Math.round(ovAdd.getBoundingClientRect().width) : null,
      }
    })
    console.log('ADD_RIDES_WAVE:', JSON.stringify(addTops))
  }

  // --- Realtime mode round: a SECOND page (fresh JS env, same origin) with
  // localStorage pre-seeded to realTime=true, then enter session + assert. ---
  const page2 = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs2 = []
  page2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()) })
  page2.on('pageerror', (e) => errs2.push(`PAGEERROR: ${e.message}`))
  await page2.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page2.evaluate(() => {
    const raw = localStorage.getItem('harness-widgets.state')
    const p = raw ? JSON.parse(raw) : {}
    p.realTime = true
    localStorage.setItem('harness-widgets.state', JSON.stringify(p))
  })
  // Reload so the plugin re-reads prefs from localStorage (evaluate alone does
  // not touch the in-memory prefs, which would silently stay in discrete mode).
  await page2.reload({ waitUntil: 'networkidle' })
  await page2.waitForTimeout(1500)
  const s2 = page2.getByText('组件状态保存问题排查').first()
  if ((await s2.count()) > 0) {
    await s2.click({ timeout: 5000 }).catch(() => {})
    await page2.waitForTimeout(5000)
  }
  const cap2 = await page2.locator('button.dsx-stats-capsule').count()
  console.log('RT_CAPSULE_COUNT:', cap2)
  if (cap2 > 0) {
    const cs = await page2.locator('button.dsx-stats-capsule').first().getAttribute('aria-pressed')
    if (cs !== 'true') await page2.locator('button.dsx-stats-capsule').first().click()
    await page2.waitForTimeout(1500)
  }
  const cards2 = await page2.locator('.dsx-stats-card-slot').count()
  console.log('RT_CARD_SLOTS:', cards2)
  const hasOverlay2 = () => page2.evaluate(() => {
    const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
    return layer ? parseFloat(getComputedStyle(layer).opacity) > 0.5 : false
  })
  if (cards2 > 0) {
    const box2 = await page2.locator('.dsx-stats-card-slot').first().boundingBox()
    console.log('RT_OVERLAY_BEFORE:', await hasOverlay2())
    if (box2) {
      // rail blank margin ABOVE the first card (inside rail, no card hit)
      await page2.mouse.move(box2.x + box2.width / 2, Math.max(10, box2.y - 30))
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_BLANK_TOP:', await hasOverlay2())
      await page2.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2)
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_ON_CARD:', await hasOverlay2())
      await page2.mouse.move(box2.x + box2.width + 8, box2.y + box2.height / 2)
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_IN_GAP:', await hasOverlay2())
      await page2.mouse.move(100, box2.y + box2.height / 2)
      await page2.waitForTimeout(600)
      console.log('RT_OVERLAY_LEFT_OUTSIDE:', await hasOverlay2())
    }
  }
  console.log('RT_CONSOLE_ERRORS:', JSON.stringify(errs2))

  // --- Follow-phase steadiness (realtime): after the entry tween settles, the
  // overlay must have NO transition (so fast movement lands on steady-state
  // geometry) and every sample must keep the right edge aligned and the
  // inter-card gaps exactly pad (24). ---
  const fb = await page2.locator('.dsx-stats-card-slot').first().boundingBox()
  if (fb) {
    await page2.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2)
    await page2.waitForTimeout(450) // entry tween (170ms) fully settled
    for (let i = 1; i <= 10; i++) {
      await page2.mouse.move(fb.x + fb.width / 2 + i * 14, fb.y + fb.height / 2)
      await page2.waitForTimeout(22)
    }
    const s = await page2.evaluate(() => {
      const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
      if (!layer) return null
      const first = layer.querySelector('.dsx-stats-card-slot')
      if (!first) return null
      const cs = getComputedStyle(first)
      const overlaySlots = Array.from(layer.querySelectorAll('.dsx-stats-card-slot')).map((el) => {
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, right: r.right, width: r.width }
      })
      const staticRights = Array.from(document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot')).map((el) => el.getBoundingClientRect().right)
      // group by row (top within 2px), sort by left, measure adjacent gaps
      const rows = new Map()
      for (const sl of overlaySlots) {
        let key = null
        for (const k of rows.keys()) if (Math.abs(k - sl.top) <= 2) { key = k; break }
        if (key === null) { key = sl.top; rows.set(key, []) }
        rows.get(key).push(sl)
      }
      const gaps = []
      for (const list of rows.values()) {
        list.sort((a, b) => a.left - b.left)
        for (let i = 1; i < list.length; i++) gaps.push(Math.round(list[i].left - list[i - 1].right))
      }
      return {
        transitionDuration: cs.transitionDuration,
        transitionProperty: cs.transitionProperty,
        overlayRightmost: Math.round(Math.max(...overlaySlots.map((s2) => s2.right))),
        staticRightmost: Math.round(Math.max(...staticRights)),
        diff: Math.round(Math.max(...overlaySlots.map((s2) => s2.right)) - Math.max(...staticRights)),
        gaps,
      }
    })
    console.log('RT_FOLLOW_STEADY:', JSON.stringify(s))
  }
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })