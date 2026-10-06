/**
 * Rail hover while COVERED / while the geometry moves under the pointer
 * (scripts/verify-rail-covered-hover.cjs)
 *
 * THE REPORT (owner, 2026-10-03): 「右侧打开右侧边栏时也会激活悬浮显示」 — with the official
 * right sidebar open, the widget rail still activates its hover/magnify state, and because the
 * magnify overlay is PORTALED to <body> at z-index 26 it paints its magnified cards straight OVER
 * the panel. The owner asked for the whole family to be swept at once: same defect, every way the
 * rail can stop being the surface under the pointer.
 *
 * WHY IT CAN HAPPEN AT ALL (the three channels, all verified before this probe existed):
 *   1. The hover oracle is ARITHMETIC (`onCard` in RailWave.tsx): it maps the pointer into the
 *      rail's content box and tests the tile boxes. It answers "would a tile be here", never "is a
 *      tile what I am pointing at". A swallowed rail is still open and still laid out — geometry.ts
 *      pins it at `right: 0px` and shifts it by `shiftX` so the panel covers it COMPLETELY — so
 *      every tile box resolves while the panel is what the user is actually pointing at.
 *   2. The pointer watcher is a `mousemove` listener on the WINDOW, and `pointer-events: none`
 *      (which the drawer gets via `[data-yielded]`) does not stop window-level events. It only
 *      stops hit-testing — which is exactly why the retired drawer needed `visibility: hidden`.
 *   3. The overlay is NOT a descendant of the drawer (portal to <body>), so every CSS guard written
 *      as `.dsx-stats-drawer[...] .dsx-*` — the yielded pointer-events rule, the retired rule —
 *      cannot reach it, and at z-index 26 it out-stacks the panel's un-z-indexed column.
 *
 * And the same family once more, with no covering panel at all: a pointer that does not move while
 * the TILES do (window resize, column/card-size switch, the swallow slide itself) leaves the armed
 * state lit over band that is now empty, because the oracle only ever runs on events.
 *
 * WHAT THIS PROVES (S1–S10 below):
 *   S1  CONTROL — rail open, sidebar closed, pointer on a card: the wave DOES engage (so every
 *       "nothing is focused" result below means "suppressed", not "the probe is blind").
 *   S2  THE REPORT — sidebar open, pointer moved onto the band where tiles geometrically are: no
 *       focus, no wave, no painted overlay, and the band hit-tests to the PANEL, not to us.
 *   S3  Stationary pointer — the wave engaged, then the sidebar opened PROGRAMMATICALLY (no pointer
 *       move at all): it must stand down by itself.
 *   S4  Leaving the band with the sidebar still open: still nothing.
 *   S5  RECOVERY — sidebar closed again: the wave works again at the same position.
 *   S6  Tiles moved away under a stationary pointer (window resize): the state must stay CONSISTENT
 *       with the new geometry (focused > 0 only where our paint really is).
 *   S7  Layout switch under a stationary pointer (columns/card size): same consistency rule.
 *   S8  A FOREIGN overlay painted over the rail (the general case, not just the sidebar): the wave
 *       must release, and must recover when the overlay goes away.
 *   S9  CONTROL — blank band (below the last row / the gaps): never engages.
 *   S10 Retired drawer over the band: never engages (the previously fixed sibling of this bug).
 *
 * Read-only apart from opening/closing the rail and the sidebar, both of which it restores.
 * Usage: DSH_PORT=19387 node scripts/verify-rail-covered-hover.cjs [outDir]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const OUT = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : path.join(__dirname, '..', '.probe-covered-hover')
const STATE_KEY = 'harness-widgets.state'
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
/** Our paint, in the DOM's own terms — the same list RailWave's oracle uses. */
const OWN = '.dsx-stats-rail, .dsx-magnify-layer'
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
  const foreign = []
  /**
   * Attribution has to use the FAULT LINE, not the URL: all ~25 client bundles are served from
   * ONE concatenated `/plugins/??a/client.js,b/client.js,…` URL, so every stack trace mentions
   * dsh-widgets whether the fault is ours or not. Test the first line only.
   */
  const faultLine = (text) => String(text).split('\n')[0]
  const ours = (text) => /dsh-widgets|RailWave|dsx-stats|dsx-magnify|dsx-surface/.test(faultLine(text))
  page.on('pageerror', (e) => {
    const t = String(e.message)
    if (ours(t)) crashes.push(t); else foreign.push(faultLine(t))
  })
  page.on('console', (m) => {
    const t = m.text()
    if (m.type() !== 'error' || /Failed to load resource/.test(t)) return
    if (ours(t)) crashes.push(t); else foreign.push(faultLine(t))
  })

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
    if (!want) {
      for (let i = 0; i < 60 && !(await retired()); i++) await page.waitForTimeout(50)
    }
    await page.waitForTimeout(400)
    return ok
  }

  // ── the official right sidebar ─────────────────────────────────────────────
  const sidebarOpen = () => page.evaluate(() => {
    const el = document.querySelector('[class$="_rightbarCol"]')
    return el !== null && el.getBoundingClientRect().width > 4
  })
  /**
   * Click the shell's own right-sidebar toggle WITHOUT moving the pointer (the stationary case).
   *
   * The label must name the RIGHT sidebar: the shell ships two toggles and the left one matches a
   * bare /侧边栏/ first (aria 「收起侧边栏」, at x 240) — clicking that collapses the conversation
   * list and leaves the right panel shut, which made an earlier version of this probe "prove" the
   * bug was unfixed.
   */
  const clickSidebarToggle = () => page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /右侧边栏/.test(b.getAttribute('aria-label') || ''))
    if (btn === undefined) return false
    btn.click()
    return true
  })
  const setSidebar = async (want) => {
    if ((await sidebarOpen()) === want) { await page.waitForTimeout(900); return true }
    const found = await clickSidebarToggle()
    if (!found) return false
    for (let i = 0; i < 60; i++) {
      if ((await sidebarOpen()) === want) { await page.waitForTimeout(900); return true }
      await page.waitForTimeout(100)
    }
    return false
  }

  /** Everything a lit wave would change, plus the drawer's own state. */
  const hoverState = () => page.evaluate((own) => {
    const overlay = document.querySelector('.dsx-magnify-layer')
    const drawer = document.querySelector('.dsx-stats-drawer')
    const layerPE = overlay === null ? null : getComputedStyle(overlay).pointerEvents
    const layerVis = overlay === null ? null : getComputedStyle(overlay).visibility
    // Sample the top layer's own hit test in the rail band (the middle of the first card).
    const slot = document.querySelector('.dsx-stats-drawer .dsx-stats-card-slot')
    let topIsOurs = null
    let top = null
    if (slot !== null) {
      const r = slot.getBoundingClientRect()
      const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2))
      top = hit === null ? null : String(hit.className || hit.tagName).split(' ')[0]
      topIsOurs = hit !== null && hit.closest(own) !== null
    }
    return {
      focused: document.querySelectorAll('.dsx-slot-focused').length,
      waveOn: document.querySelectorAll('.dsx-wave-deck.dsx-wave-on').length,
      overlayOpacity: overlay === null ? null : getComputedStyle(overlay).opacity,
      overlayPE: layerPE,
      overlayVis: layerVis,
      layerYielded: overlay !== null && overlay.hasAttribute('data-yielded'),
      surfaceHover: document.querySelectorAll('.dsx-surface-hover').length,
      drawerYielded: drawer !== null && drawer.hasAttribute('data-yielded'),
      railPE: (() => { const r = document.querySelector('.dsx-stats-rail'); return r === null ? null : getComputedStyle(r).pointerEvents })(),
      topOverTile: top,
      topIsOurs,
    }
  }, OWN)
  const summary = (s) => `focused ${s.focused} · wave-on ${s.waveOn} · overlay op ${s.overlayOpacity}/pe ${s.overlayPE}/vis ${s.overlayVis} · surface-hover ${s.surfaceHover}`
  const quiet = (s) => s.focused === 0 && s.waveOn === 0
  /** The hit test of the DOM itself at a point. */
  const hitAt = (x, y) => page.evaluate(([x, y, own]) => {
    const hit = document.elementFromPoint(x, y)
    return hit === null ? null : { cls: String(hit.className || hit.tagName), ours: hit.closest(own) !== null }
  }, [x, y, OWN])
  /** Tile centres read from the LAYOUT (works even while the drawer is hidden). */
  const tilePoints = (limit) => page.evaluate((limit) => {
    const slots = Array.from(document.querySelectorAll('.dsx-stats-drawer .dsx-stats-card-slot'))
    return slots.slice(0, limit).map((s) => {
      const r = s.getBoundingClientRect()
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
    })
  }, limit)
  const railBox = () => page.evaluate(() => {
    const r = document.querySelector('.dsx-stats-rail')
    const p = document.querySelector('[class$="_rightbarCol"]')
    const rr = r === null ? null : r.getBoundingClientRect()
    const pr = p === null ? null : p.getBoundingClientRect()
    return {
      rail: rr === null ? null : { l: Math.round(rr.left), t: Math.round(rr.top), r: Math.round(rr.right), w: Math.round(rr.width) },
      panel: pr === null ? null : { l: Math.round(pr.left), w: Math.round(pr.width) },
    }
  })
  /** Pointer parked, then the geometry changed: is the state consistent with the NEW tiles? */
  const consistent = async (x, y) => {
    const s = await hoverState()
    if (s.focused === 0 && s.waveOn === 0) return { ok: true, s, why: 'stood down' }
    const hit = await hitAt(x, y)
    const ok = hit !== null && hit.ours
    return { ok, s, why: `kept focused at ${x},${y} — top there is ${hit === null ? 'nothing' : hit.cls.split(' ')[0]}` }
  }

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(3500)
  await ensureSession()
  const original = await readState()
  const sidebarWasOpen = await sidebarOpen()

  // ══ S1 — CONTROL: rail open, sidebar closed, pointer on a card ═════════════
  await setSidebar(false)
  await setRail(true)
  await page.mouse.move(600, 500)
  await page.waitForTimeout(400)
  const rest = await hoverState()
  check(quiet(rest), 'S1 baseline at rest: nothing engages with the pointer off the rail', summary(rest))
  const points = await tilePoints(4)
  note('tile points sampled', points.map((p) => `${p.x},${p.y}`).join(' | '))
  let s1 = null
  for (const p of points.length === 0 ? [{ x: 1400, y: 150 }] : points) {
    await page.mouse.move(p.x - 30, p.y - 30, { steps: 4 })
    await page.waitForTimeout(120)
    await page.mouse.move(p.x, p.y, { steps: 8 })
    await page.waitForTimeout(420)
    s1 = await hoverState()
    if (s1.focused > 0) break
  }
  check(s1 !== null && s1.focused > 0, 'S1 CONTROL — with the rail open and the sidebar closed the pointer DOES focus a card', s1 === null ? 'no reading' : summary(s1))
  await page.screenshot({ path: path.join(OUT, 's1-hover-open.png') })

  // ══ S3 — the wave engaged, then the sidebar opens with NO pointer move ══════
  // (done before S2 so the "stationary pointer" case is genuinely stationary)
  const parked = await page.evaluate(() => {
    const f = document.querySelector('.dsx-slot-focused')
    if (f === null) return null
    const s = document.querySelector('.dsx-stats-drawer .dsx-stats-card-slot')
    const r = (s ?? f).getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })
  const opened = await setSidebar(true)
  check(opened, 'S3 the official right sidebar opened')
  const s3 = await hoverState()
  check(quiet(s3), 'S3 STATIONARY POINTER — opening the sidebar stands the wave down by itself', summary(s3))
  check(s3.overlayOpacity === '0' || s3.overlayVis === 'hidden', 'S3 the magnify overlay is not painted over the panel', `opacity ${s3.overlayOpacity} · visibility ${s3.overlayVis}`)
  check(s3.overlayPE === 'none', 'S3 the overlay is not hit-capable while covered', `pointer-events ${s3.overlayPE}`)
  check(s3.layerYielded, 'S3 the overlay carries data-yielded while covered')
  check(s3.surfaceHover === 0, 'S3 no surface-hover reveal survives the cover', `count ${s3.surfaceHover}`)
  const box3 = await railBox()
  note('geometry while covered', `rail ${JSON.stringify(box3.rail)} · panel ${JSON.stringify(box3.panel)}`)
  if (box3.rail !== null && box3.panel !== null && box3.panel.w > 0) {
    check(box3.rail.l >= box3.panel.l - 1, 'S3 the rail is inside the panel band (so "covered" is the right verdict)', `rail.l ${box3.rail.l} vs panel.l ${box3.panel.l}`)
  }
  await page.screenshot({ path: path.join(OUT, 's3-stationary-sidebar-open.png') })

  // ══ S2 — THE REPORT: move onto the band where tiles geometrically are ═══════
  let s2 = null
  let leaked = []
  for (const p of points) {
    await page.mouse.move(p.x, p.y, { steps: 8 })
    await page.waitForTimeout(360)
    const s = await hoverState()
    s2 = s
    const hit = await hitAt(p.x, p.y)
    if (hit !== null && hit.ours) leaked.push(`${p.x},${p.y} → ${hit.cls.split(' ')[0]}`)
    if (s.focused > 0) break
  }
  check(s2 !== null && quiet(s2), 'S2 THE REPORT — hovering the sidebar band focuses nothing and never engages the wave', s2 === null ? 'no reading' : summary(s2))
  check(leaked.length === 0, 'S2 the band hit-tests to the PANEL, never to our rail or overlay', leaked.length === 0 ? 'no leak at any sampled tile centre' : leaked.join(' | '))
  await page.screenshot({ path: path.join(OUT, 's2-pointer-in-sidebar.png') })

  // ══ S4 — leave the band, sidebar still open ═══════════════════════════════
  await page.mouse.move(600, 500, { steps: 10 })
  await page.waitForTimeout(500)
  const s4 = await hoverState()
  check(quiet(s4), 'S4 pointer back in the conversation: still nothing engaged', summary(s4))

  // ══ S5 — RECOVERY: close the sidebar again ═════════════════════════════════
  const closed = await setSidebar(false)
  check(closed, 'S5 the sidebar closed again')
  let s5 = null
  for (const p of points.length === 0 ? [{ x: 1400, y: 150 }] : points) {
    await page.mouse.move(p.x - 30, p.y - 30, { steps: 4 })
    await page.waitForTimeout(120)
    await page.mouse.move(p.x, p.y, { steps: 8 })
    await page.waitForTimeout(420)
    s5 = await hoverState()
    if (s5.focused > 0) break
  }
  check(s5 !== null && s5.focused > 0, 'S5 RECOVERY — with the sidebar closed the same band focuses a card again', s5 === null ? 'no reading' : summary(s5))
  await page.screenshot({ path: path.join(OUT, 's5-recovered.png') })

  // ══ S6 — the tiles move away under a stationary pointer (window resize) ═════
  const s6before = await hoverState()
  check(s6before.focused > 0, 'S6 precondition — the wave is engaged before the resize', summary(s6before))
  await page.setViewportSize({ width: 1420, height: 980 })
  await page.waitForTimeout(900)
  const s6 = await consistent(parked === null ? points[0].x : parked.x, parked === null ? points[0].y : parked.y)
  check(s6.ok, 'S6 RESIZE under a stationary pointer — the state stays consistent with the new geometry', `${s6.why} · focused ${s6.s.focused} · wave-on ${s6.s.waveOn}`)
  await page.setViewportSize({ width: 1707, height: 1067 })
  await page.waitForTimeout(900)

  // ══ S7 — a layout switch under a stationary pointer (columns) ══════════════
  await page.mouse.move(points.length === 0 ? 1400 : points[0].x, points.length === 0 ? 150 : points[0].y, { steps: 8 })
  await page.waitForTimeout(420)
  const s7before = await hoverState()
  const flipped = await page.evaluate(() => {
    const key = 'harness-widgets.state'
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const st = JSON.parse(raw)
    const next = { ...st, columns: st.columns === 3 ? 2 : 3 }
    window.localStorage.setItem(key, JSON.stringify(next))
    window.localStorage.setItem('harness-widgets.state.savedAt', String(Date.now()))
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(next) }))
    return { from: st.columns, to: next.columns }
  })
  if (flipped === null) {
    note('S7 skipped', 'the persisted state has no `columns` to flip')
  } else {
    note('S7 flipped columns', `${flipped.from} → ${flipped.to} (pointer parked at ${points.length === 0 ? '1400,150' : points[0].x + ',' + points[0].y})`)
    await page.waitForTimeout(900)
    const s7 = await consistent(points.length === 0 ? 1400 : points[0].x, points.length === 0 ? 150 : points[0].y)
    check(s7.ok, 'S7 COLUMN SWITCH under a stationary pointer — the state stays consistent with the new geometry', `${s7.why} · focused ${s7.s.focused} · before ${s7before.focused}`)
    // Put the columns back through the same channel.
    await page.evaluate((from) => {
      const key = 'harness-widgets.state'
      const st = JSON.parse(window.localStorage.getItem(key))
      const next = { ...st, columns: from }
      window.localStorage.setItem(key, JSON.stringify(next))
      window.localStorage.setItem('harness-widgets.state.savedAt', String(Date.now()))
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(next) }))
    }, flipped.from)
    await page.waitForTimeout(900)
  }

  // ══ S8 — a FOREIGN overlay painted over the rail (the general case) ════════
  await page.mouse.move(600, 500, { steps: 6 })
  await page.waitForTimeout(300)
  const target = points.length === 0 ? { x: 1400, y: 150 } : points[0]
  // Precondition: the position DOES engage when nothing covers it.
  await page.mouse.move(target.x - 30, target.y - 30, { steps: 4 })
  await page.waitForTimeout(120)
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.waitForTimeout(420)
  const s8pre = await hoverState()
  check(s8pre.focused > 0, 'S8 precondition — the position engages the wave before the foreign overlay', summary(s8pre))
  await page.evaluate(() => {
    const el = document.createElement('div')
    el.id = '__probe_foreign_overlay'
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:transparent'
    document.body.appendChild(el)
  })
  // Re-enter the position: the geometric oracle says "tile", the paint oracle must say "no".
  await page.mouse.move(target.x - 30, target.y - 30, { steps: 6 })
  await page.waitForTimeout(200)
  await page.mouse.move(target.x, target.y, { steps: 6 })
  await page.waitForTimeout(420)
  const s8 = await hoverState()
  check(quiet(s8), 'S8 FOREIGN OVERLAY — a foreign full-viewport layer over the rail releases the wave', summary(s8))
  await page.screenshot({ path: path.join(OUT, 's8-foreign-overlay.png') })
  await page.evaluate(() => { const el = document.getElementById('__probe_foreign_overlay'); if (el !== null) el.remove() })
  await page.mouse.move(target.x - 30, target.y - 30, { steps: 6 })
  await page.waitForTimeout(200)
  await page.mouse.move(target.x, target.y, { steps: 6 })
  await page.waitForTimeout(420)
  const s8rec = await hoverState()
  check(s8rec.focused > 0, 'S8 RECOVERY — with the overlay gone the wave engages again', summary(s8rec))

  // ══ S9 — CONTROL: the blank band never engages ═════════════════════════════
  const blank = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const slots = Array.from(document.querySelectorAll('.dsx-stats-drawer .dsx-stats-card-slot, .dsx-stats-drawer .dsx-stats-add'))
    const rr = rail.getBoundingClientRect()
    const bottom = slots.reduce((m, s) => Math.max(m, s.getBoundingClientRect().bottom), 0)
    const y = Math.round((bottom + rr.bottom) / 2)
    return { x: Math.round(rr.left + rr.width / 2), y, gap: Math.round(rr.bottom - bottom) }
  })
  await page.mouse.move(600, 500, { steps: 6 })
  await page.waitForTimeout(250)
  await page.mouse.move(blank.x, blank.y, { steps: 8 })
  await page.waitForTimeout(460)
  const s9 = await hoverState()
  check(quiet(s9), 'S9 CONTROL — the empty band below the last row never engages the wave', `${summary(s9)} · sampled ${blank.x},${blank.y} (${blank.gap}px of blank band)`)

  // ══ S10 — the retired sibling (previously fixed; must stay fixed) ══════════
  await setRail(false)
  check(await retired(), 'S10 the drawer is retired (closed but still mounted)')
  await page.mouse.move(600, 500)
  await page.waitForTimeout(400)
  for (const p of points) {
    await page.mouse.move(p.x, p.y, { steps: 8 })
    await page.waitForTimeout(300)
  }
  const s10 = await hoverState()
  check(quiet(s10), 'S10 RETIRED — the band still focuses nothing', summary(s10))

  check(crashes.length === 0, 'no page errors from this plugin', crashes.slice(0, 2).join(' | '))
  if (foreign.length > 0) note('unrelated foreign page errors (not this plugin, not a pass condition)', `${foreign.length} · e.g. ${foreign[0].slice(0, 90)}`)

  // ── put the owner's state back ─────────────────────────────────────────────
  try {
    await setSidebar(sidebarWasOpen)
    const now = await readState()
    const at = Date.now()
    const next = { ...now.state, railOpen: original.state.railOpen }
    await writeState(at, next)
    await page.evaluate(([k, a, v]) => { localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem(a, String(Date.now())) }, [STATE_KEY, SAVED_AT_KEY, next])
    note('restored', `railOpen ${original.state.railOpen} · sidebar ${sidebarWasOpen}`)
  } catch (error) {
    check(false, 'the owner’s state was restored', String(error))
  }

  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'} — shots in ${OUT}`)
  await browser.close()
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
