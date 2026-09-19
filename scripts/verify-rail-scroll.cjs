/**
 * Rail scroll VERIFICATION (scripts/verify-rail-scroll.cjs)
 *
 * Asserts the properties the row-detent behaviour must have (1578×1000 live GUI,
 * 15 widgets, 2 columns, pitch 184):
 *  A. every notch advances exactly ONE pitch, and every rest position is a whole
 *     multiple of the pitch — no half-row, ever;
 *  B. at every rest position SOME row tops out the viewport, and the LAST data row
 *     is among them (before the fix the range was 750px and only 5 of 8 rows could
 *     top out, so the last rows were permanently half hidden);
 *  C. while a card is magnified, the magnified card's viewport box is
 *     scroll-invariant: the wave is a fixed anchor and the deck slides under it;
 *  D. leaving the surface sideways ends the wave (the leftmost-card regression).
 *
 * Usage: node scripts/verify-rail-scroll.cjs [outDir]
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
  await page.waitForTimeout(900)
  await page.addStyleTag({ content: FONT_CSS })

  const geo = () => page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const slots = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot'))
    const tops = slots.map((s) => Number(s.style.top.replace('px', '')))
    const rects = slots.map((s) => s.getBoundingClientRect())
    const rr = rail.getBoundingClientRect()
    const rights = slots.map((s) => s.style.right)
    // pitch = vertical distance between two rows of the SAME column
    let pitch = 0
    if (slots.length > 1) {
      const firstRight = rights[0]
      for (let i = 1; i < slots.length; i++) {
        if (rights[i] === firstRight) { pitch = tops[i] - tops[0]; break }
      }
      if (pitch === 0) pitch = Math.abs(tops[1] - tops[0])
    } else pitch = Number(slots[0].style.height.replace('px', '')) + 24
    const rowCount = new Set(tops.map((t) => Math.round((t - 2) / pitch))).size
    return {
      scrollTop: Math.round(rail.scrollTop), max: rail.scrollHeight - rail.clientHeight,
      clientH: rail.clientHeight, pitch, rowCount, railTop: Math.round(rr.top), railLeft: Math.round(rr.left),
      // viewport tops of the card(s) that sit in each row
      // viewport tops of EVERY card (the row at the top of the viewport is a middle
      // row once the deck has scrolled, so the first three cards are not enough).
      viewportTops: [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b),
    }
  })

  const settle = async (maxMs = 3000) => {
    const t0 = Date.now()
    let prev = NaN, stable = 0
    while (Date.now() - t0 < maxMs) {
      const top = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').scrollTop))
      // Ten consecutive identical readings: Chromium applies the wheel's own native
      // scroll (120px for a 120px notch) BEFORE the handler's detent takes over, and a
      // short stability window samples that transient as a fractional row.
      if (top === prev) { stable++; if (stable >= 10) break } else stable = 0
      prev = top
      await page.waitForTimeout(60)
    }
    return geo()
  }

  const g0 = await geo()
  const pitch = g0.pitch
  console.log(`pitch=${pitch} cardRows=${g0.rowCount} maxScroll=${g0.max} clientH=${g0.clientH} railTop=${g0.railTop}`)

  // ---- A/B: walk down with real wheel notches until the deck stops moving ----
  await page.mouse.move(600, 500)
  await page.waitForTimeout(250)
  await page.mouse.move(g0.railLeft + 6, 200)
  await page.waitForTimeout(400)
  const seen = []
  for (let i = 0; i < g0.rowCount + 4; i++) {
    await page.mouse.wheel(0, 120)
    // One notch per ROW transition (RAIL_SCROLL_MS = 240ms): pace the input like a
    // real wheel, then wait for rest. A faster stream is deliberately coalesced
    // (see the step lock in the wheel handler).
    await page.waitForTimeout(1400)
    seen.push(await settle())
  }
  const detents = seen.map((s) => s.scrollTop)
  // A detent is `row · pitch`; the deck's first row is seated at 2px, so the equivalent
  // rail offset is `2 + row · pitch`. Grid-alignment is tested on that shifted value.
  const gridOffset = (v) => (v - 2) % pitch
  console.log('detents:', detents.join(', '))
  check(new Set(detents).size >= 3, 'the wheel moves the deck', `distinct offsets = ${new Set(detents).size}`)
  const steps = []
  for (let i = 1; i < detents.length; i++) steps.push(detents[i] - detents[i - 1])
  check(steps.every((s) => s === 0 || s === pitch), 'every notch advances exactly one pitch', `steps = ${steps.join(',')}`)
  check(detents.every((d) => gridOffset(d) === 0), 'every rest position is a whole number of rows', `offsets = ${detents.join(',')}`)
  // B1: at every rest position the row at the top of the viewport is WHOLE — its top
  // edge starts at (or just above) the rail's content top, never in the middle of the
  // rail. Measured offsets: the deck seats its first row 2px down and a card sits 2px
  // below its slot, so an aligned row's card top is `railTop + 4` (tolerance 3px). A
  // card is 160px tall, so being a third of a row out would read as a cut row.
  const alignedRows = seen.map((s) => {
    const want = s.railTop + 4
    return s.viewportTops.filter((tv) => tv <= want + 3 && tv >= want - 3).length
  })
  // Every detent that still has a card row below the top must show a WHOLE row. Once
  // the deck has scrolled past its last card row it is showing the reserved tail (by
  // design), where "no row at the top" is the correct picture — that is the run of
  // detents after the last one that had content.
  const lastWithRow = alignedRows.lastIndexOf(1)
  const rowMissingBeforeEnd = alignedRows.some((n, i) => n === 0 && i < lastWithRow)
  check(!rowMissingBeforeEnd, 'a whole row tops out at EVERY rest position',
    `rows aligned with the rail content top: ${alignedRows.join(',')} (1 = whole row at top, 0 = past the last row)`)
  // B2: the last data row can reach the top (its detent offset is `2 + (rows-1)·pitch`)
  const lastDataRow = 2 + (g0.rowCount - 1) * pitch
  check(detents.includes(lastDataRow), 'the LAST data row can top out', `row ${g0.rowCount - 1} needs offset ${lastDataRow}, reached ${Math.max(...detents)}`)
  check(Math.max(...detents) >= lastDataRow, 'the scroll range reaches past the last data row', `max detent = ${Math.max(...detents)}`)
  await page.screenshot({ path: path.join(OUT, 'V1-bottom-detent.png') })

  // ---- C: the magnified card is a fixed anchor while the deck scrolls ----
  await page.evaluate(() => { document.querySelector('.dsx-stats-rail').scrollTop = 0 })
  await page.waitForTimeout(500)
  const hoverPt = await page.evaluate(() => {
    const s = document.querySelector('.dsx-wave-deck .dsx-stats-card-slot')
    const r = s.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })
  await page.mouse.move(hoverPt.x, hoverPt.y, { steps: 4 })
  await page.waitForTimeout(700)
  const overlayBox = () => page.evaluate(() => {
    const s = document.querySelector('.dsx-magnify-layer .dsx-slot-focused')
    const l = document.querySelector('.dsx-magnify-layer')
    if (!s) return null
    const r = s.getBoundingClientRect()
    return { rect: [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v)), op: Number(getComputedStyle(l).opacity) }
  })
  const before = await overlayBox()
  await page.screenshot({ path: path.join(OUT, 'V2-hover-anchor-before.png') })
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(900)
  const after = await overlayBox()
  await page.screenshot({ path: path.join(OUT, 'V3-hover-anchor-after.png') })
  console.log('overlay before:', JSON.stringify(before))
  console.log('overlay after :', JSON.stringify(after))
  check(before !== null && after !== null && after.op === 1, 'the wave stays engaged across a wheel scroll')
  if (before && after) {
    const d = Math.max(...before.rect.map((v, i) => Math.abs(v - after.rect[i])))
    check(d <= 2, 'the magnified card is scroll-invariant (a fixed anchor)', `max box delta = ${d}px`)
  }

  // ---- D: leaving the surface sideways must end the wave ----
  const leftEdge = before ? before.rect[0] : hoverPt.x
  await page.mouse.move(leftEdge - 60, hoverPt.y, { steps: 6 })
  await page.waitForTimeout(800)
  const op = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.dsx-magnify-layer')).opacity))
  check(op === 0, 'leaving the surface sideways ends the wave', `layer opacity = ${op}`)

  await browser.close()
  console.log('\n' + (fails.length === 0 ? 'ALL CHECKS PASSED' : `${fails.length} CHECK(S) FAILED:\n - ` + fails.join('\n - ')))
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
