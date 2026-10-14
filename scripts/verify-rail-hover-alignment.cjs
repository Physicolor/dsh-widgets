/**
 * Rail hover ALIGNMENT + HOLD (scripts/verify-rail-hover-alignment.cjs)
 *
 * The wave's hit oracle is arithmetic: it maps the pointer into DECK space and asks
 * which tile's box covers it. That mapping subtracts the rail's own top content inset,
 * which RailWave authors as 4px inline — but does NOT own: a co-tenant may push the
 * widgets down inside the rail (dsh-pinned-summary seats its pinned band with
 * `padding-top: calc(--dps-rail-pad + --dsh-pinned-summary-push) !important`, measured
 * 135px on the owner's GUI). Before the fix every geometric test was off by that push,
 * so hovering a card resolved the tile one row BELOW it — magnifying the wrong card and,
 * where the shifted point fell in a gap, releasing a hover that had just engaged
 * (owner report 2026-10-08 「组件区域偶发：鼠标悬浮后进入悬浮态又立刻停止悬浮」).
 *
 * A. ALIGNMENT — with the pointer parked on a card, the slot the wave marks
 *    `.dsx-slot-focused` must be THAT card (same index in the deck's row-major order),
 *    for every card of every row, including the last one.
 * B. HOLD — with the pointer stationary, the wave must stay engaged for the whole
 *    sample window (no release without a mouse event).
 * C. PUSH — the measured content inset must equal the rail's computed `padding-top`,
 *    i.e. the oracle must not assume 4px. Reported so a future override is visible.
 *
 * Usage:
 *   node scripts/verify-rail-hover-alignment.cjs [outDir] [--authority 127.0.0.1:19387] [--hold 1200]
 */
const { chromePath } = require('./lib/chrome.cjs')
const path = require('node:path')
const { chromium } = require('./lib/playwright-core.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const { mkdirSync } = require('node:fs')

const argv = process.argv.slice(2)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const AUTHORITY = val('--authority', process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:19387')
const URL_ = `http://${AUTHORITY}`
const HOLD = Number(val('--hold', '1200'))
const OUT = (argv[0] && !argv[0].startsWith('--')) ? argv[0] : path.join(__dirname, '..', '.probe-hover-align')

const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) fails.push(label + (detail ? ' — ' + detail : ''))
}

;(async () => {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 } })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(4000)

  const row = page.locator('[class$="_sessionRow"]').first()
  await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(6000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 10; i++) {
    const ok = await page.evaluate(() => {
      const d = document.querySelector('.dsx-stats-drawer')
      return d !== null && !d.hasAttribute('data-retired') && !!document.querySelector('.dsx-wave-deck .dsx-stats-card-slot')
    })
    if (ok) break
    if (!(await cap.count())) { await page.waitForTimeout(600); continue }
    await cap.click().catch(() => {}); await page.waitForTimeout(800)
  }
  await page.waitForTimeout(1200)

  // ── C: the inset the rail actually has, and what the plugin could read from it ──
  const geo = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const deck = document.querySelector('.dsx-wave-deck')
    if (rail === null || deck === null) return null
    const cs = getComputedStyle(rail)
    const rb = rail.getBoundingClientRect()
    const db = deck.getBoundingClientRect()
    return {
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      push: getComputedStyle(document.documentElement).getPropertyValue('--dsh-pinned-summary-push').trim(),
      railTop: rb.top,
      deckTop: db.top,
      contentInset: db.top - rb.top + rail.scrollTop,
      clientH: rail.clientHeight,
      scrollTop: rail.scrollTop,
    }
  })
  if (geo === null) { console.log('FAIL  no rail mounted'); await browser.close(); process.exit(1) }
  console.log(`rail padding-top=${geo.paddingTop} push=${geo.push || '(none)'} deck content inset=${geo.contentInset}px`)
  check(
    Math.abs(geo.contentInset - Number.parseFloat(geo.paddingTop)) < 1,
    'content inset is the rail\'s real padding-top (not the assumed 4px)',
    `measured ${geo.contentInset}px vs padding-top ${geo.paddingTop}`,
  )

  // ── the cards, in the deck's row-major order ──
  const cards = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot')]
    return slots.map((s, i) => {
      const b = s.getBoundingClientRect()
      return { i, left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height, seatTop: s.style.top, seatRight: s.style.right }
    })
  })
  const visible = cards.filter((c) => c.top >= geo.railTop + 2 && c.bottom <= geo.railTop + geo.clientH)
  console.log(`cards=${cards.length} fully visible=${visible.length}`)
  check(visible.length > 0, 'the deck seats at least one whole card', `visible=${visible.length}`)

  // ── the fold's ANCHOR: the component area's own top-right corner ────────────
  // The drawer wrapper is `inset: 0`, so the anchor has to name the rail's own corner
  // (`right var(--dsx-rail-top, 0px)`); a bare `top right` grows the group out of the
  // VIEWPORT's corner, `--dsx-rail-top` ABOVE the rail's top edge — and the deck cascade
  // reproduces that map per card, so the cards fly in from a point the component area
  // does not own (owner report 2026-10-08: 「以整个右侧区域的右上角为锚点而不是组件区域
  // 范围内的右上角」).
  const anchor = await page.evaluate(() => {
    const drawer = document.querySelector('.dsx-stats-drawer')
    const rail = document.querySelector('.dsx-stats-rail')
    if (drawer === null || rail === null) return null
    const o = getComputedStyle(drawer).transformOrigin.split(' ')
    const rb = rail.getBoundingClientRect()
    return { x: Math.round(Number.parseFloat(o[0])), y: Math.round(Number.parseFloat(o[1])), railRight: Math.round(rb.right), railTop: Math.round(rb.top) }
  })
  check(anchor !== null && Math.abs(anchor.y - anchor.railTop) <= 1,
    'the fold anchors on the component area\'s own top edge, not the viewport\'s',
    anchor === null ? 'no drawer' : `origin y=${anchor.y} vs rail top=${anchor.railTop}`)
  check(anchor !== null && Math.abs(anchor.x - anchor.railRight) <= 1,
    'the fold anchors on the component area\'s own right edge',
    anchor === null ? 'no drawer' : `origin x=${anchor.x} vs rail right=${anchor.railRight}`)

  /**
   * Park the pointer on a card, hold it, and report which slot the wave focused
   * (index in the SAME row-major order) plus whether it stayed engaged.
   */
  const sample = async (card) => {
    const x = (card.left + card.right) / 2
    const y = (card.top + card.bottom) / 2
    await page.mouse.move(700, 560)
    await page.waitForTimeout(320)
    await page.mouse.move(x, y, { steps: 5 })
    const frames = []
    const t0 = Date.now()
    while (Date.now() - t0 < HOLD) {
      frames.push(await page.evaluate(() => {
        const layer = document.querySelector('.dsx-magnify-layer')
        const focused = [...document.querySelectorAll('.dsx-magnify-layer .dsx-stats-card-slot')]
          .findIndex((s) => s.className.includes('dsx-slot-focused'))
        let peak = 1
        for (const s of document.querySelectorAll('.dsx-magnify-layer .dsx-stats-card-slot')) {
          const m = /scale\(([\d.]+)\)/.exec(s.style.transform || '')
          if (m) peak = Math.max(peak, Number(m[1]))
        }
        return { op: layer === null ? -1 : Number(getComputedStyle(layer).opacity), focused, peak }
      }))
      await page.waitForTimeout(60)
    }
    const engaged = frames.filter((f) => f.op === 1 && f.peak > 1.005)
    const dropped = engaged.length > 0 && frames.slice(frames.indexOf(engaged[engaged.length - 1]) + 1).some((f) => f.op < 0.5)
    const focusIdx = frames.length ? frames[frames.length - 1].focused : -1
    return { x, y, engaged: engaged.length > 0, dropped, focusIdx, peak: Math.max(1, ...frames.map((f) => f.peak)) }
  }

  for (const card of visible) {
    const r = await sample(card)
    check(r.engaged, `card #${card.i} engages`, `peak=${r.peak.toFixed(3)} (the peak factor is a user pref)`)
    check(r.focusIdx === card.i, `card #${card.i} is the one the wave focuses`, `focused=#${r.focusIdx}`)
    check(!r.dropped, `card #${card.i} stays engaged while the pointer is still`, r.dropped ? 'released mid-hold' : '')
  }

  // ── D: a traversal across a row keeps ONE continuous wave ──────────────────
  // Walk the pointer from one card's centre to the next one's in small steps: the
  // wave must never turn off on the way (a release + re-engage reads as the flicker
  // the owner reported) and it must land on the card the pointer is on.
  if (visible.length >= 2) {
    const a = visible[0]
    const b = visible.find((c) => Math.abs(c.top - a.top) < 4 && c.i !== a.i)
    if (b !== undefined) {
      const steps = 24
      const frames = []
      await page.mouse.move((a.left + a.right) / 2, (a.top + a.bottom) / 2)
      await page.waitForTimeout(400)
      for (let s = 0; s <= steps; s++) {
        const x = (a.left + a.right) / 2 + ((b.left + b.right) / 2 - (a.left + a.right) / 2) * (s / steps)
        const y = (a.top + a.bottom) / 2
        await page.mouse.move(x, y)
        await page.waitForTimeout(45)
        frames.push(await page.evaluate(() => {
          const layer = document.querySelector('.dsx-magnify-layer')
          const focused = [...document.querySelectorAll('.dsx-magnify-layer .dsx-stats-card-slot')]
            .findIndex((s) => s.className.includes('dsx-slot-focused'))
          return { op: layer === null ? -1 : Number(getComputedStyle(layer).opacity), focused }
        }))
      }
      const off = frames.filter((f) => f.op < 0.5).length
      const outsides = [...new Set(frames.map((f) => f.focused))].filter((i) => i !== a.i && i !== b.i)
      check(off === 0, 'a row traversal never lets the wave off', `${off}/${frames.length} frames at opacity<0.5`)
      check(outsides.length === 0, 'a row traversal focuses only the two cards it crosses', `stray=${JSON.stringify(outsides)}`)
      check(frames[frames.length - 1].focused === b.i, 'the traversal lands on the card it ends on', `focused=#${frames[frames.length - 1].focused} expected #${b.i}`)
    }
  }

  console.log(fails.length === 0 ? '\nHOVER-ALIGNMENT: ALL PASS' : `\nHOVER-ALIGNMENT: ${fails.length} FAILED`)
  await browser.close()
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
