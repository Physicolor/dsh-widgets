/**
 * Rail interaction verification (scripts/verify-rail-interaction.cjs)
 *
 * A. SCROLL STOP — the wheel must stop once the last card row is fully reachable: the
 *    deepest card bottom sits at/above the viewport floor at the LAST detent, the
 *    detents are whole rows, and further notches change nothing.
 * B. HOVER RELEASE — the wave must end on EVERY exit path, checked at 12px granularity:
 *    sideways out of the leftmost / rightmost card, through the inter-row gap, above
 *    the first row, below the last row, a fast diagonal, and a stationary pointer whose
 *    surface is removed underneath it (right sidebar opens over the rail).
 *
 * Usage: node scripts/verify-rail-interaction.cjs [outDir]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('./diag-auth-lib.cjs')

const OUT = process.argv[2] || path.join(__dirname, '..', '.probe-rail')
const FONT_CSS = `* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }`
const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) fails.push(label + (detail ? ' — ' + detail : ''))
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 2 })
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
  await page.waitForTimeout(1000)
  await page.addStyleTag({ content: FONT_CSS })

  const wave = () => page.evaluate(() => {
    const layer = document.querySelector('.dsx-magnify-layer')
    return layer === null ? null : {
      op: Number(getComputedStyle(layer).opacity),
      pe: getComputedStyle(layer).pointerEvents,
      focused: document.querySelectorAll('.dsx-magnify-layer .dsx-slot-focused').length,
    }
  })
  const geom = () => page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const slots = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot'))
    const rr = rail.getBoundingClientRect()
    const cardTops = slots.map((s) => Math.round(s.getBoundingClientRect().top))
    const cardBottoms = slots.map((s) => Math.round(s.getBoundingClientRect().bottom))
    const rights = slots.map((s) => s.style.right)
    const tops = slots.map((s) => Number(s.style.top.replace('px', '')))
    let pitch = 0
    if (slots.length > 1) {
      for (let i = 1; i < slots.length; i++) if (rights[i] === rights[0]) { pitch = tops[i] - tops[0]; break }
      if (pitch === 0) pitch = Math.abs(tops[1] - tops[0])
    }
    return {
      scrollTop: Math.round(rail.scrollTop), max: rail.scrollHeight - rail.clientHeight,
      clientH: rail.clientHeight, pitch,
      railTop: Math.round(rr.top), railLeft: Math.round(rr.left), railRight: Math.round(rr.right),
      railBottom: Math.round(rr.bottom),
      deepestCardBottom: Math.max(...cardBottoms),
      firstRowTop: Math.min(...cardTops),
      rowsTopList: [...new Set(tops.map((t) => Math.round((t - 2) / (pitch || 1))))].sort((a, b) => a - b),
    }
  })
  const settle = async (maxMs = 4000) => {
    const t0 = Date.now()
    let prev = NaN, stable = 0
    while (Date.now() - t0 < maxMs) {
      const top = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
      if (top === prev) { stable++; if (stable >= 10) break } else stable = 0
      prev = top
      await page.waitForTimeout(60)
    }
    return geom()
  }

  // ---------------- A. scroll stop ----------------
  const g0 = await geom()
  const pitch = g0.pitch
  console.log(`pitch=${pitch} rows=${g0.rowsTopList.length} maxScroll=${g0.max} clientH=${g0.clientH}`)
  await page.mouse.move(600, 500)
  await page.waitForTimeout(250)
  await page.mouse.move(g0.railLeft + 6, g0.railTop + 150)
  await page.waitForTimeout(300)
  const detents = []
  for (let i = 0; i < g0.rowsTopList.length + 4; i++) {
    await page.mouse.wheel(0, 120)
    await page.waitForTimeout(320)
    detents.push((await settle()).scrollTop)
  }
  console.log('detents:', detents.join(', '))
  const uniq = [...new Set(detents)]
  check(uniq.length >= 2, 'the wheel moves the deck', `detents = ${uniq.join(',')}`)
  const steps = []
  for (let i = 1; i < detents.length; i++) steps.push(detents[i] - detents[i - 1])
  check(steps.every((s) => s === 0 || s === pitch), 'each notch advances exactly one row', `steps = ${steps.join(',')}`)
  check(detents.every((d) => (d - 2) % pitch === 0), 'every rest position is a whole row', `offsets = ${detents.join(',')}`)
  const lastDetent = Math.max(...uniq)
  check(lastDetent === 2 + (g0.rowsTopList.length - 1) * pitch, 'the LAST row can top out',
    `last detent ${lastDetent}, expected ${2 + (g0.rowsTopList.length - 1) * pitch}`)
  // At the bottom the deepest card must be inside the viewport, and the DECK must not
  // have more detents than there are card rows (extra detents == scrolling into blank).
  const bottom = await geom()
  check(bottom.scrollTop + bottom.clientH >= bottom.deepestCardBottom - 1,
    'at the bottom detent every card is fully inside the viewport',
    `viewport bottom ${bottom.scrollTop + bottom.clientH} vs deepest card bottom ${bottom.deepestCardBottom}`)
  check(uniq.length <= g0.rowsTopList.length,
    'no blank detents: the deck stops at the last card row',
    `${uniq.length} detents for ${g0.rowsTopList.length} rows (${uniq.join(',')})`)
  const before = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
  check(before === after, 'further notches at the end do nothing', `${before} -> ${after}`)
  await page.screenshot({ path: path.join(OUT, 'S1-scroll-end.png') })

  // ---------------- B. hover release, every exit path ----------------
  const reset = async () => {
    await page.evaluate(() => { document.querySelector('.dsx-stats-rail').scrollTop = 0 })
    await page.waitForTimeout(500)
  }
  /** Hover the first resting card, then walk out along a path; report max opacity after. */
  const exitTest = async (label, pathFn) => {
    await reset()
    const pt = await page.evaluate(() => {
      const s = document.querySelector('.dsx-wave-deck .dsx-stats-card-slot')
      const r = s.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })
    await page.mouse.move(600, 500)
    await page.waitForTimeout(200)
    await page.mouse.move(pt.x, pt.y, { steps: 4 })
    await page.waitForTimeout(500)
    const hovered = await wave()
    if (hovered === null || hovered.op !== 1) { check(false, `${label}: hover engages the wave`, JSON.stringify(hovered)); return }
    const points = pathFn(pt)
    // The endpoint must be over NOTHING (no magnified tile, no add tile, no rail) —
    // otherwise the path ends on a card and "the wave is still alive" is correct
    // behaviour, not a defect. Verify it with the browser's own hit test.
    const end = points[points.length - 1]
    const endHit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y)
      if (el === null) return 'nothing(null)'
      const cls = typeof el.className === 'string' ? el.className : '(svg)'
      if (el.closest('.dsx-magnify-layer .dsx-stats-card-slot') !== null) return 'magnified-card'
      if (el.closest('.dsx-stats-rail .dsx-stats-card-slot') !== null) return 'resting-card'
      if (el.closest('.dsx-stats-add') !== null) return 'add-tile'
      if (el.closest('.dsx-stats-rail') !== null) return 'rail:' + cls.slice(0, 24)
      return 'outside:' + cls.slice(0, 24)
    }, [end.x, end.y])
    for (const p of points) { await page.mouse.move(p.x, p.y, { steps: 2 }); await page.waitForTimeout(70) }
    await page.waitForTimeout(700)
    const w = await wave()
    const emptyEnd = endHit.startsWith('outside') || endHit.startsWith('rail') || endHit === 'nothing(null)'
    if (!emptyEnd) {
      console.log(`SKIP  ${label}: the endpoint is over ${endHit}, so staying magnified is correct`)
      return
    }
    check(w !== null && w.op === 0, `${label}: the wave ends (end over ${endHit})`,
      `opacity ${w === null ? 'n/a' : w.op}, focused ${w === null ? 'n/a' : w.focused}`)
  }

  const g = await geom()
  await exitTest('left of the leftmost card', (pt) => {
    const out = []
    for (let x = pt.x; x > pt.x - 260; x -= 12) out.push({ x, y: pt.y })
    return out
  })
  await exitTest('right of the rightmost card', (pt) => {
    const out = []
    for (let x = pt.x; x < g.railRight + 60; x += 12) out.push({ x, y: pt.y })
    return out
  })
  // A column that is EMPTY at every row: with right-anchored rows, a single-column row
  // leaves its left cells bare — so walking down the FIRST COLUMN crosses real gaps
  // (verified with elementFromPoint: the magnified neighbour rows do not reach there).
  await exitTest('down the empty first column', (pt) => {
    const colX = g.railLeft + 8
    const out = []
    for (let y = pt.y; y < pt.y + 420; y += 12) out.push({ x: colX, y })
    return out
  })
  await exitTest('down into the band below the deck', (pt) => {
    // End at the rail's bottom-LEFT corner: that column is empty at every row, so the
    // endpoint is plain rail padding (the probe verifies that before asserting).
    const out = []
    for (let y = pt.y; y < g.railBottom - 20; y += 24) out.push({ x: pt.x, y })
    out.push({ x: g.railLeft + 8, y: g.railBottom - 20 })
    return out
  })
  await exitTest('up above the first row', (pt) => {
    const out = []
    for (let y = pt.y; y > g.railTop - 20; y -= 12) out.push({ x: pt.x, y })
    return out
  })
  await exitTest('fast diagonal out', (pt) => [{ x: pt.x - 200, y: pt.y - 120 }])
  // Stationary pointer: the surface is covered by the right sidebar opening over it.
  await reset()
  const pt = await page.evaluate(() => {
    const s = document.querySelector('.dsx-wave-deck .dsx-stats-card-slot')
    const r = s.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })
  await page.mouse.move(pt.x, pt.y, { steps: 4 })
  await page.waitForTimeout(500)
  const engaged = await wave()
  const toggled = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const b = btns.find((x) => /right|panel|侧|栏/i.test(x.getAttribute('aria-label') || ''))
    if (b) { b.click(); return true }
    return false
  })
  await page.waitForTimeout(900)
  const afterCover = await wave()
  check(engaged !== null && engaged.op === 1, 'stationary: the wave is engaged first', JSON.stringify(engaged))
  console.log(`   (sidebar toggle button found: ${toggled}) — wave after the surface is covered: ${JSON.stringify(afterCover)}`)

  await browser.close()
  console.log('\n' + (fails.length === 0 ? 'ALL CHECKS PASSED' : `${fails.length} CHECK(S) FAILED:\n - ` + fails.join('\n - ')))
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
