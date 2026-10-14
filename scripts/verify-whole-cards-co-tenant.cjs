/**
 * verify-whole-cards-co-tenant.cjs — the two owner asks of 2026-10-14, on the live GUI.
 *
 *   A. THE WHOLE-CARD RULE USES THE CO-TENANT'S PUSH. The band must BE the rail's real
 *      scrollport: a card is hidden exactly while it sticks out of it. While the band was
 *      built on the authored 4px, a rail pushed down by dsh-pinned-summary painted the
 *      bottom row half off screen (the owner's screenshot).
 *   B. THAT ROW MUST STILL BE REACHABLE. The wheel's cap (`lastRow`) reads the same measured
 *      inset, so the deepest component ends up fully inside the pane at the stop.
 *   C. THE 设置 TILE OPENS THE PRODUCT'S SETTINGS WINDOW on our 组件 section — not the
 *      self-made panel (which stays as a local spare behind `dsx-addpanel-local`).
 *
 * Live-only: without an answering authority the run reports SKIPPED and exits 0.
 *
 *   $env:DSH_LIVE_AUTHORITY='127.0.0.1:19387'; node scripts/verify-whole-cards-co-tenant.cjs
 */
const { AUTHORITY, browser, close, liveAvailable, liveContext, report } = require('./lib/probe-harness.cjs')

const AUTH = process.env.DSH_LIVE_AUTHORITY || AUTHORITY

/** Snapshot of the rail's geometry + every card's verdict, in the rail's own frame. */
const SNAPSHOT = () => {
  const rail = document.querySelector('.dsx-stats-rail')
  if (rail === null) return { error: 'no rail' }
  const rr = rail.getBoundingClientRect()
  const inset = Number.parseFloat(getComputedStyle(rail).paddingTop) || 0
  const s = rail.scrollTop
  const paneH = rail.clientHeight
  const push = inset - 4
  const rows = []
  const slots = Array.from(rail.querySelectorAll('.dsx-stats-card-slot'))
  for (let i = 0; i < slots.length; i++) {
    const b = slots[i].getBoundingClientRect()
    const top = b.top - rr.top
    const bottom = b.bottom - rr.top
    rows.push({
      i,
      top: Math.round(top),
      bottom: Math.round(bottom),
      cut: slots[i].classList.contains('dsx-slot-cut'),
      // The rail's real scrollport (no border): anything past either edge is not whole.
      outside: top < -0.5 || bottom > rr.height + 0.5,
      // What the AUTHORED-4 band would have called visible — its floor sat `push` lower.
      oldVisible: top >= inset - 4 - 0.5 && bottom <= rr.height + push + 0.5,
    })
  }
  const tileEl = rail.querySelector('.dsx-stats-add')
  let tile = null
  if (tileEl !== null) {
    const b = tileEl.getBoundingClientRect()
    tile = {
      top: Math.round(b.top - rr.top), bottom: Math.round(b.bottom - rr.top),
      cut: tileEl.classList.contains('dsx-slot-cut'),
    }
  }
  return {
    inset, push, scrollTop: Math.round(s), paneH, railH: Math.round(rr.height),
    maxScroll: Math.round(rail.scrollHeight - rail.clientHeight),
    summary: (() => {
      const c = document.querySelector('[data-dsh-pinned-summary]')
      return document.documentElement.getAttribute('data-dsh-pinned-summary') || (c === null ? null : 'card')
    })(),
    rows, tile,
  }
}

/** Dispatch `n` wheel notches on the rail and report the offsets. */
const NOTCHES = async (n) => {
  const rail = document.querySelector('.dsx-stats-rail')
  const seen = [rail.scrollTop]
  for (let i = 0; i < n; i++) {
    rail.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, deltaMode: 0, bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 300))
    seen.push(rail.scrollTop)
  }
  return seen.map((v) => Math.round(v))
}

;(async () => {
  const r = report('whole cards + co-tenant + 设置 destination')
  if (!(await liveAvailable(AUTH))) {
    console.log(`  ~    live GUI not reachable on ${AUTH} — SKIPPED`)
    await close()
    process.exit(0)
  }
  const ctx = await liveContext({ authority: AUTH, viewport: { width: 1600, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto('http://' + AUTH, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2500)
  const row = page.locator('[class$="_sessionRow"]').first()
  await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4000) }
  /**
   * The drawer must be OPEN, not merely mounted: a retired drawer hands React back the same
   * element object (see `retiredElRef`), so its whole subtree — RailWave's props included —
   * is frozen by design, and measuring it would answer "the band never changes" for the
   * wrong reason. `aria-pressed` on the header capsule is the rail's own open state.
   */
  const railOpen = () => page.evaluate(() =>
    document.querySelector('.dsx-stats-drawer') !== null
    && document.querySelector('.dsx-stats-drawer[data-retired]') === null
    && document.querySelector('.dsx-stats-rail') !== null)
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 4; i++) {
    if (await railOpen()) break
    if (!(await cap.count())) break
    await cap.click().catch(() => {})
    await page.waitForTimeout(700)
  }
  if (!(await railOpen())) {
    r.check(false, 'rail mounted AND open on a live session', 'no .dsx-stats-rail inside an un-retired drawer')
    await close()
    process.exit(r.exitCode())
  }
  await page.waitForTimeout(900)

  // ── A. the band IS the scrollport ────────────────────────────────────────────
  const rest = await page.evaluate(SNAPSHOT)
  if (rest.error) { r.check(false, 'rail measurable', rest.error); await close(); process.exit(r.exitCode()) }
  r.note(`inset=${rest.inset}px (push ${rest.push}px) · summary=${rest.summary} · scrollTop=${rest.scrollTop} · paneH=${rest.paneH} · maxScroll=${rest.maxScroll}`)
  const wrongA = rest.rows.filter((x) => x.cut !== x.outside)
  r.check(wrongA.length === 0, 'every card is hidden exactly while it sticks out of the scrollport',
    wrongA.length === 0 ? `${rest.rows.length} cards` : JSON.stringify(wrongA.slice(0, 6)))
  const stillPainted = rest.rows.filter((x) => x.cut && x.oldVisible)
  r.note(`cards the authored-4 band would have painted half off: ${stillPainted.length}` + (stillPainted.length ? ` (${JSON.stringify(stillPainted.slice(0, 4))})` : ''))
  if (rest.push > 0.5) {
    r.check(stillPainted.length > 0 || rest.rows.every((x) => !x.outside), 'the push is what the old band mis-painted (or nothing was cut)',
      `push=${rest.push}px, mis-painted=${stillPainted.length}`)
  } else {
    r.allowed('no co-tenant push at rest', 'dsh-pinned-summary is not docked in this context; C exercises the same code path synthetically')
  }

  // ── B. the deepest component is still reachable ──────────────────────────────
  const path = await page.evaluate(NOTCHES, 14)
  await page.waitForTimeout(400)
  const bottom = await page.evaluate(SNAPSHOT)
  const last = bottom.rows[bottom.rows.length - 1]
  const deepest = bottom.tile !== null && (last === undefined || bottom.tile.bottom > last.bottom) ? bottom.tile : last
  r.check(!!deepest && !deepest.cut && deepest.bottom <= bottom.railH + 0.5, 'after wheeling to the stop the deepest component is whole',
    `scrollTop ${bottom.scrollTop} (maxScroll ${bottom.maxScroll}) deepest bottom=${deepest ? deepest.bottom : 'n/a'} railH=${bottom.railH} cut=${deepest ? deepest.cut : 'n/a'}`)
  const again = await page.evaluate(NOTCHES, 3)
  r.check(Math.abs(again[again.length - 1] - bottom.scrollTop) <= 1, 'the wheel stops there (no further reveal)',
    `notches: ${path.join(' → ')} then ${again.join(' → ')}`)

  // ── C. the same rule under a push, synthetically (the co-tenant's own write) ──
  let pushed = bottom
  if (rest.push <= 0.5) {
    await page.evaluate(() => document.querySelector('.dsx-stats-rail').style.setProperty('padding-top', '135px', 'important'))
    await page.waitForTimeout(500)
    pushed = await page.evaluate(SNAPSHOT)
    r.check(Math.abs(pushed.inset - 135) < 0.6, 'a push written on the rail is adopted as the band inset',
      `inset ${pushed.inset}px (push ${pushed.push}px)`)
    const wrongC = pushed.rows.filter((x) => x.cut !== x.outside)
    r.check(wrongC.length === 0, 'with a 131px push every card is still hidden exactly while it sticks out',
      wrongC.length === 0 ? `${pushed.rows.length} cards` : JSON.stringify(wrongC.slice(0, 6)))
    const underPush = pushed.rows.filter((x) => x.cut && x.oldVisible).length
    r.check(underPush > 0, 'the push is a case the authored-4 band got wrong (the owner screenshot)',
      `${underPush} card(s) would have been painted past the rail's floor`)
    await page.evaluate(NOTCHES, 14)
    await page.waitForTimeout(400)
    const pushedBottom = await page.evaluate(SNAPSHOT)
    const pLast = pushedBottom.rows[pushedBottom.rows.length - 1]
    const pDeep = pushedBottom.tile !== null && (pLast === undefined || pushedBottom.tile.bottom > pLast.bottom) ? pushedBottom.tile : pLast
    r.check(!!pDeep && !pDeep.cut && pDeep.bottom <= pushedBottom.railH + 0.5, 'a pushed rail can still reach its deepest component',
      `scrollTop ${pushedBottom.scrollTop} / maxScroll ${pushedBottom.maxScroll}, deepest bottom=${pDeep ? pDeep.bottom : 'n/a'}`)
    await page.evaluate(() => document.querySelector('.dsx-stats-rail').style.removeProperty('padding-top'))
    await page.waitForTimeout(400)
  } else {
    r.note('a real push was present at rest — section C is the same measurement, taken live')
  }

  // ── D. 设置 → the official settings window, on OUR section ───────────────────
  const railBox = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const t = rail.querySelector('.dsx-stats-add')
    const b = t.getBoundingClientRect()
    return { cut: t.classList.contains('dsx-slot-cut'), h: Math.round(b.height) }
  })
  r.check(!railBox.cut && railBox.h > 0, 'the 设置 tile is paintable at the stop', JSON.stringify(railBox))
  /**
   * The click is dispatched IN PAGE. A real pointer move would arm the magnify wave first,
   * which moves the tile under the cursor and makes the landing a coin flip — the question
   * here is where the tile LEADS, not how the wave feels (scripts/verify-rail-interaction.cjs
   * owns that). Hit-testability is asserted separately above via the cut class.
   */
  const clickTile = () => page.evaluate(() => {
    const t = document.querySelector('.dsx-stats-rail .dsx-stats-add')
    if (t === null) return { error: 'no tile' }
    t.click()
  })
  const readSettingsState = () => page.evaluate(() => {
    const panel = document.querySelector('.dsx-stats-addpanel')
    const navRow = document.querySelector('[data-dsx-nav="widgets"]')
    const list = document.querySelector('[class$="_navList"]')
    return {
      addPanelOpen: panel !== null && panel.classList.contains('open'),
      navList: list !== null,
      ourRow: navRow !== null,
      ourRowActive: navRow !== null && /_active\b/.test(navRow.className),
      // The 组件 page's own tabs — proof the section body is what rendered.
      ourPage: document.querySelector('.dsx-tabbar') !== null,
    }
  })
  await clickTile()
  await page.waitForTimeout(1400)
  let after = await readSettingsState()
  if (!after.navList || !after.ourRowActive) {
    // One retry: the window's own open transition can swallow the first nav click.
    await clickTile()
    await page.waitForTimeout(1200)
    after = await readSettingsState()
  }
  r.check(!after.addPanelOpen, 'the click does NOT open the self-made panel', JSON.stringify(after))
  r.check(after.navList && after.ourRow, 'the official settings window opens', JSON.stringify(after))
  r.check(after.ourRowActive && after.ourPage, 'the 组件 section is the one selected', JSON.stringify(after))

  // ── D2. the local spare still works when armed by hand ──────────────────────
  const ctx2 = await browser().then((b) => b.newContext({ viewport: { width: 1600, height: 1000 } }))
  await ctx2.addCookies([require('./diag-auth-lib.cjs').mintCookie(AUTH)])
  const page2 = await ctx2.newPage()
  await page2.addInitScript(() => { try { window.localStorage.setItem('dsx-addpanel-local', '1') } catch { /* ignore */ } })
  await page2.goto('http://' + AUTH, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page2.waitForTimeout(2500)
  const row2 = page2.locator('[class$="_sessionRow"]').first()
  await row2.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  if (await row2.count()) { await row2.click().catch(() => {}); await page2.waitForTimeout(4000) }
  const cap2 = page2.locator('button.dsx-stats-capsule').first()
  const railOpen2 = () => page2.evaluate(() =>
    document.querySelector('.dsx-stats-rail') !== null && document.querySelector('.dsx-stats-drawer[data-retired]') === null)
  for (let i = 0; i < 4; i++) {
    if (await railOpen2()) break
    if (!(await cap2.count())) break
    await cap2.click().catch(() => {})
    await page2.waitForTimeout(700)
  }
  await page2.waitForTimeout(600)
  const spare = await page2.evaluate(async () => {
    const rail = document.querySelector('.dsx-stats-rail')
    if (rail === null) return { error: 'no rail' }
    for (let i = 0; i < 20; i++) {
      rail.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, deltaMode: 0, bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r, 120))
    }
    const t = rail.querySelector('.dsx-stats-add')
    const b = t.getBoundingClientRect()
    t.click()
    await new Promise((r) => setTimeout(r, 700))
    const panel = document.querySelector('.dsx-stats-addpanel')
    return { x: Math.round(b.left), y: Math.round(b.top), cut: t.classList.contains('dsx-slot-cut'), open: panel !== null && panel.classList.contains('open') }
  })
  r.check(spare.open === true, 'with dsx-addpanel-local=1 the self-made panel is still reachable (local spare)', JSON.stringify(spare))
  await ctx2.close()

  await close()
  process.exit(r.exitCode())
})().catch(async (e) => { console.error('FAILED', e); await close(); process.exit(1) })
