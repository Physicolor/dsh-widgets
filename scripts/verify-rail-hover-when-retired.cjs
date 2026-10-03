/**
 * Rail hover-while-RETIRED verifier (scripts/verify-rail-hover-when-retired.cjs)
 *
 * THE REPORT (owner, 2026-10-03): 「收起组件区域后，鼠标指针悬浮到右侧区域会异常激活组件区域悬浮
 * 状态」 — with the rail collapsed, moving the pointer over the right-hand band still engages the
 * rail's hover state (a card lights up / magnifies) even though nothing of the rail is on screen.
 *
 * WHY IT CAN HAPPEN AT ALL: keep-mount (2026-10-03) left the closed drawer IN the DOM — retired
 * (`visibility: hidden`, `pointer-events: none`) but still LAID OUT. The wave's hover detection is
 * not DOM hit-testing: a `mousemove` listener on the WINDOW (RailWave.tsx, so that a pointer over
 * the magnify overlay — portaled to <body> — is still seen) resolves the focused tile from the
 * computed tile boxes (`onCard(clientX, clientY)`). Those boxes do not disappear when the drawer is
 * hidden, so the geometric test still says "the pointer is on a tile" over the collapsed rail.
 * Before keep-mount the closed rail was UNMOUNTED and the question could not arise.
 *
 * WHAT THIS PROVES:
 *   1. the drawer really is retired before the hover is tested (otherwise the rest is vacuous),
 *   2. hit-testing: `elementFromPoint` anywhere in the rail's band does NOT return anything inside
 *      `.dsx-stats-drawer` — a descendant with `pointer-events: auto` (the rail carries it inline;
 *      the magnify layer re-enables it on its own slots) can out-rank the retired drawer's own
 *      `pointer-events: none`, which is a CSS fact, not a guess,
 *   3. HOVER: after a real `mouse.move` onto the band, nothing is focused — no `.dsx-slot-focused`,
 *      no `.dsx-wave-on`, no painted magnify overlay, no inline transform on any card,
 *   4. THE CONTROL: with the rail OPEN, the same pointer position DOES focus a card — so a pass on
 *      (3) means "the hover was suppressed", not "the probe cannot see a hover".
 *
 * Read-only apart from opening/closing the rail, whose persisted state it restores.
 * Usage: DSH_PORT=19387 node scripts/verify-rail-hover-when-retired.cjs [outDir]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const OUT = process.argv[2] || path.join(__dirname, '..', '.probe-hover-retired')
const STATE_KEY = 'harness-widgets.state'
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label)
}
const note = (label, detail) => console.log(`      · ${label}${detail === undefined ? '' : '  — ' + detail}`)

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1.5 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const crashes = []
  page.on('pageerror', (e) => crashes.push(String(e.message)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) crashes.push(m.text()) })

  const readState = () => page.evaluate(async () => (await fetch('/api/widgets-state')).json())
  const writeState = (at, state) => page.evaluate(
    async ([at, s]) => { await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: at, state: s }) }) },
    [at, state],
  )
  const capsule = () => page.locator('button.dsx-stats-capsule').first()
  const railOpen = () => page.evaluate(() => document.querySelector('.dsx-stats-drawer:not([data-retired]) .dsx-stats-rail') !== null)
  const retired = () => page.evaluate(() => {
    const d = document.querySelector('.dsx-stats-drawer')
    return d !== null && d.hasAttribute('data-retired')
  })
  const ensureSession = async () => {
    for (let i = 0; i < 20; i++) {
      if ((await capsule().count()) > 0) return true
      const row = page.locator('[class$="_sessionRow"]').first()
      if ((await row.count()) > 0) await row.click().catch(() => {})
      await page.waitForTimeout(1500)
    }
    return (await capsule().count()) > 0
  }
  const waitOpen = async (want, timeout = 6000) => {
    const t0 = Date.now()
    for (;;) {
      if ((await railOpen()) === want) return true
      if (Date.now() - t0 > timeout) return false
      await page.waitForTimeout(50)
    }
  }
  const setRail = async (want) => {
    if ((await railOpen()) === want) { await page.waitForTimeout(700); return true }
    await capsule().click({ timeout: 10000 })
    const ok = await waitOpen(want)
    // A close retires the drawer only when the fold has reported back (~380ms) — and the whole
    // point of this probe is the RETIRED state, not the closing one.
    if (!want) {
      for (let i = 0; i < 60 && !(await retired()); i++) await page.waitForTimeout(50)
    }
    await page.waitForTimeout(400)
    return ok
  }
  /** What the wave would be doing if it had focused a tile. */
  const hoverState = () => page.evaluate(() => {
    const overlay = document.querySelector('.dsx-magnify-layer')
    const cards = Array.from(document.querySelectorAll('.dsx-magnify-layer .dsx-stats-card, .dsx-stats-drawer .dsx-stats-card'))
    const moved = cards.filter((c) => /\bscale\(|translate/.test(c.style.transform || '')).length
    return {
      focused: document.querySelectorAll('.dsx-slot-focused').length,
      waveOn: document.querySelectorAll('.dsx-wave-deck.dsx-wave-on').length,
      overlayChildren: overlay === null ? -1 : overlay.childElementCount,
      overlayOpacity: overlay === null ? null : getComputedStyle(overlay).opacity,
      movedCards: moved,
    }
  })
  const hoverSummary = (s) => `focused ${s.focused} · wave-on ${s.waveOn} · overlay children ${s.overlayChildren} (opacity ${s.overlayOpacity}) · moved cards ${s.movedCards}`

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(3500)
  await ensureSession()
  const original = await readState()

  // ── the band: where the tiles WOULD be, read while the rail is open ────────
  await setRail(true)
  const band = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot, .dsx-wave-deck .dsx-stats-add'))
    const rects = slots.map((s) => { const r = s.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } })
    const rail = document.querySelector('.dsx-stats-rail')
    const rr = rail === null ? null : rail.getBoundingClientRect()
    return { rects, rail: rr === null ? null : { left: Math.round(rr.left), right: Math.round(rr.right), top: Math.round(rr.top), bottom: Math.round(rr.bottom) } }
  })
  note('tiles sampled while open', `${band.rects.length} · rail band ${JSON.stringify(band.rail)}`)

  // ── retire it, then hover the band with a REAL pointer ────────────────────
  await setRail(false)
  check(await retired(), 'the drawer is RETIRED (closed but still mounted)')
  const wasOpen = await railOpen()
  check(!wasOpen, 'the rail is not on screen any more')

  // Move to a neutral spot first so any leftover focus can settle.
  await page.mouse.move(600, 500)
  await page.waitForTimeout(500)
  const baseline = await hoverState()
  note('hover state before the pointer enters the band', hoverSummary(baseline))

  // The first four card slots PLUS the 设置 tile (last in the DOM): the tile is a magnetised
  // participant like a card but is not in `items`/`focusLayout`, so it is the one a card-only
  // probe would silently never aim at.
  const probePoints = band.rects.length === 0 ? [] : [...band.rects.slice(0, 4), band.rects[band.rects.length - 1]]
  for (const p of probePoints) {
    await page.mouse.move(p.x, p.y, { steps: 8 })
    await page.waitForTimeout(320)
  }
  const afterHover = await hoverState()
  check(afterHover.focused === 0, 'retired: hovering the rail band focuses NO card', hoverSummary(afterHover))
  check(afterHover.waveOn === 0, 'retired: the wave never engages', `wave-on ${afterHover.waveOn}`)
  check(afterHover.overlayOpacity === baseline.overlayOpacity, 'retired: the magnify overlay is no more painted than before the pointer entered', `opacity ${afterHover.overlayOpacity} vs ${baseline.overlayOpacity} at rest · children ${afterHover.overlayChildren}`)
  check(afterHover.movedCards === 0, 'retired: no card carries a magnify transform', `moved cards ${afterHover.movedCards}`)

  // ── hit-testing: nothing of the drawer is UNDER the pointer ────────────────
  const hits = await page.evaluate((pts) => pts.map((p) => {
    const els = document.elementsFromPoint(p.x, p.y)
    const drawerIdx = els.findIndex((e) => e.closest !== undefined && e.closest('.dsx-stats-drawer') !== null)
    return {
      at: `${p.x},${p.y}`,
      top: els[0] === undefined ? null : (els[0].className || els[0].tagName),
      inDrawer: drawerIdx !== -1,
      topDrawerDepth: drawerIdx,
      chain: els.slice(0, 3).map((e) => (typeof e.className === 'string' ? e.className : e.tagName)).join(' > '),
    }
  }), probePoints)
  const leaked = hits.filter((h) => h.inDrawer)
  check(leaked.length === 0, 'retired: the pointer band is NOT hit-tested by the drawer',
    leaked.length === 0 ? hits.map((h) => h.at + ' → ' + String(h.top).split(' ')[0]).join(' | ') : JSON.stringify(leaked))

  await page.screenshot({ path: path.join(OUT, 'retired-hover.png') })

  // ── CONTROL: the same pointer position with the rail OPEN must focus a card ──
  await setRail(true)
  const openPoint = probePoints[0]
  let control = null
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(openPoint.x - 40, openPoint.y - 40, { steps: 4 })
    await page.waitForTimeout(120)
    await page.mouse.move(openPoint.x, openPoint.y, { steps: 8 })
    await page.waitForTimeout(450)
    control = await hoverState()
    if (control.focused > 0) break
  }
  check(control !== null && control.focused > 0, 'CONTROL — with the rail open the same position DOES focus a card', control === null ? 'no reading' : hoverSummary(control))
  await page.screenshot({ path: path.join(OUT, 'open-hover.png') })

  check(crashes.length === 0, 'no page errors', crashes.slice(0, 2).join(' | '))

  // ── put the owner's rail state back ───────────────────────────────────────
  try {
    const now = await readState()
    const at = Date.now()
    const next = { ...now.state, railOpen: original.state.railOpen }
    await writeState(at, next)
    await page.evaluate(([k, a, v]) => { localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem(a, String(Date.now())) }, [STATE_KEY, SAVED_AT_KEY, next])
    note('restored railOpen', String(original.state.railOpen))
  } catch (error) {
    check(false, 'the owner’s rail state was restored', String(error))
  }

  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'} — shots in ${OUT}`)
  await browser.close()
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
