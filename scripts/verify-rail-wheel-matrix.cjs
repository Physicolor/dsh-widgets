/**
 * Wheel INPUT-STREAM matrix (scripts/verify-rail-wheel-matrix.cjs)
 *
 * Dispatches synthetic wheel events inside the page (exact deltaY, cancelable,
 * bubbles, real coordinates) so the detent rule can be characterised against
 * every input style a user can produce:
 *
 *   1. one physical notch, ONE event (deltaY 100)
 *   2. a driver that splits a notch into TWO events (60 + 60)  [Playwright/CDP]
 *   3. a small trackpad tick (deltaY 4) repeated
 *   4. a trackpad flick: a burst of 12 events (deltaY 30, 16ms apart)
 *   5. a line-mode wheel (deltaMode 1, deltaY 3)
 *   6. a page-mode wheel (deltaMode 2, deltaY 1)
 *
 * Expected: every style lands on a whole multiple of the pitch, one notch steps
 * exactly one row, and a flick steps several rows without overshooting the end.
 *
 * Usage: node scripts/verify-rail-wheel-matrix.cjs
 */
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('./diag-auth-lib.cjs')

const fails = []
const check = (ok, label, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) fails.push(label + (detail ? ' — ' + detail : ''))
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 } })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 40000 })
  const row = page.locator('[class$="_sessionRow"]').first()
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(5000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 4; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    if (!(await cap.count())) break
    await cap.click(); await page.waitForTimeout(600)
  }
  await page.waitForTimeout(900)

  const railLeft = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').getBoundingClientRect().left))
  await page.mouse.move(railLeft + 6, 200)
  await page.waitForTimeout(300)

  const pitch = await page.evaluate(() => {
    const s = document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot')
    const t0 = Number(s[0].style.top.replace('px', ''))
    const r0 = s[0].style.right
    for (const el of s) if (el.style.right === r0 && Number(el.style.top.replace('px', '')) !== t0) return Number(el.style.top.replace('px', '')) - t0
    return 0
  })
  const max = await page.evaluate(() => { const r = document.querySelector('.dsx-stats-rail'); return Math.round(r.scrollHeight - r.clientHeight) })
  // The last detent the deck may REST on is the last row whose cards still reach into
  // the viewport (the plugin's scroll stop), not merely what the scroll box could reach
  // — the box is deliberately longer than the content.
  const { deepestCardBottom, clientH } = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot'))
    const rail = document.querySelector('.dsx-stats-rail')
    const contentTop = rail.getBoundingClientRect().top - rail.scrollTop
    return {
      deepestCardBottom: Math.max(...slots.map((s) => Math.round(s.getBoundingClientRect().bottom - contentTop))),
      clientH: rail.clientHeight,
    }
  })
  // Detents are 2 + row·pitch, so the deepest CARD bottom sits in row
  // `round((contentBottom − 2) / pitch)` — that row is the last one that may top out.
  const contentRows = Math.max(1, Math.round((deepestCardBottom - 2) / pitch))
  const lastDetent = 2 + (contentRows - 1) * pitch
  console.log(`pitch=${pitch} max=${max} contentBottom=${deepestCardBottom} clientH=${clientH} rows=${contentRows} lastDetent=${lastDetent}`)

  const reset = async () => { await page.evaluate(() => { document.querySelector('.dsx-stats-rail').scrollTop = 0 }); await page.waitForTimeout(500) }
  const settle = async (maxMs = 2500) => {
    const t0 = Date.now()
    let prev = NaN, stable = 0
    while (Date.now() - t0 < maxMs) {
      const top = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
      if (top === prev) { stable++; if (stable >= 3) break } else stable = 0
      prev = top
      await page.waitForTimeout(50)
    }
    return page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
  }
  /** Fire a stream of wheel events on the rail with exact deltas. */
  const fire = (events) => page.evaluate((evs) => new Promise((res) => {
    const rail = document.querySelector('.dsx-stats-rail')
    const r = rail.getBoundingClientRect()
    let i = 0
    const next = () => {
      if (i >= evs.length) { res(true); return }
      const e = evs[i++]
      rail.dispatchEvent(new WheelEvent('wheel', {
        deltaY: e.d, deltaMode: e.m || 0, deltaX: 0,
        clientX: r.left + 6, clientY: r.top + 120,
        bubbles: true, cancelable: true, composed: true,
      }))
      window.setTimeout(next, e.gap || 0)
    }
    next()
  }), events)

  const scenario = async (label, events, expectedSteps) => {
    await reset()
    await fire(events)
    const top = await settle()
    const rows = (top - 2) / pitch
    const whole = Math.abs(((top - 2) % pitch + pitch) % pitch) < 1 || Math.abs(top - 2) < 1
    console.log(`\n${label}: settled ${top} = ${rows.toFixed(3)} rows`)
    check(whole, 'lands on a whole row multiple', `top=${top}, pitch=${pitch}`)
    if (expectedSteps !== undefined) check(Math.abs(rows - expectedSteps) < 0.02, `steps exactly ${expectedSteps} row(s)`, `got ${rows}`)
    return top
  }

  await scenario('1. one notch, ONE event (d100)', [{ d: 100 }], 1)
  await scenario('2. one notch split in two (60+60)', [{ d: 60, gap: 8 }, { d: 60, gap: 8 }], 1)
  await scenario('3. small trackpad ticks (4px x 8)', Array.from({ length: 8 }, () => ({ d: 4, gap: 20 })), 0)
  // A "flick" delivered with a realistic inter-notch gap (the row tween is 240ms, so
  // one notch per row is the intended pace; faster input is deliberately coalesced).
  await scenario('4. trackpad flick (30px x 12, 16ms)', Array.from({ length: 12 }, () => ({ d: 30, gap: 16 })), undefined)
  await scenario('5. line mode (mode1 d3 x 1)', [{ d: 3, m: 1 }], 1)
  await scenario('6. page mode (mode2 d1)', [{ d: 1, m: 2 }], 1)
  await scenario('7. flick UP from the bottom', [{ d: -100 }, { d: -100, gap: 300 }], undefined)
  const up = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
  console.log(`   (after the up-flick: ${up})`)

  // Down-flick that must stop at the LAST detent, never mid-row. One notch per row
  // tween (240ms), so the stream is paced like a real wheel.
  await reset()
  await fire(Array.from({ length: 20 }, () => ({ d: 100, gap: 300 })))
  const bottom = await settle()
  console.log(`\n8. long down-flick to the end: ${bottom} (max ${max}, lastDetent ${lastDetent})`)
  check(Math.abs(bottom - lastDetent) < 1, 'a long flick rests on the last detent, not mid-row', `bottom=${bottom}, lastDetent=${lastDetent}`)

  await browser.close()
  console.log('\n' + (fails.length === 0 ? 'ALL CHECKS PASSED' : `${fails.length} CHECK(S) FAILED:\n - ` + fails.join('\n - ')))
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
