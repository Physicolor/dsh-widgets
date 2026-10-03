/**
 * Rail hover-glow / 设置 tile LEFT-CLIP verifier (scripts/verify-rail-glow-clip.cjs)
 *
 * THE REPORT (owner, 2026-10-02): "悬浮后左侧的截断效果仍然存在。虽然组件本身不会被截断，但
 * 设置项和组件悬浮时发出的光效会被截断" — hovering paints the brand-blue hover glow, and on
 * the left it is sliced off with a hard vertical edge; the 设置 tile is cut the same way. The
 * owner also asked whether the conversation area is the cause ("是否与对话区域有关").
 *
 * WHAT THIS PROVES, and with what instrument:
 *
 *   1. WHO clips it — `dump()` walks the target's ancestor chain and reports, per ancestor,
 *      its computed overflow plus its PADDING box (overflow clips at the padding box, not the
 *      content box: measuring against the content box over-reports the cut by the padding) and
 *      the clearance between the glow's painted extent and each of those edges.
 *   2. WHETHER THE CONVERSATION AREA is involved — `elementsFromPoint()` at points INSIDE the
 *      glow strip reports the stacking order there. If the magnify layer is the TOPMOST element
 *      in the strip and the transcript rows sit below it, then the conversation area is not
 *      clipping anything: it is simply painted UNDER the overhang, which is the only reason the
 *      glow can reach across the rail's left edge at all (the layer carries z-index 26, above
 *      the shell's overlay outlet at 20).
 *   3. THE INVARIANT, asserted — for EVERY painted participant (every overlay slot AND the
 *      设置 tile) `painted left ≥ the layer's own left clip edge`. One check per participant
 *      class, so a regression names the participant it broke.
 *   4. THE 设置 TILE in the case that motivated `reachAdd` — the tile only lands in the
 *      LEFTMOST column when the rows above it are completely full, i.e. when the deck seats a
 *      multiple of `columns` widgets; that is the rig `rigTile()` seeds (columns × 5 = 12
 *      widgets, so the tile opens its own row at column 0). The tile is a magnetised
 *      participant like a card, but it is NOT in `items`/`focusLayout`, so it is the one
 *      participant a card-only overhang budget silently drops.
 *      The tile's focus is detected by HIT-TESTING the pointer, not by the `.dsx-slot-focused`
 *      class: that class only ever marks CARD slots, so a card that happens to be the bell's
 *      peak keeps carrying it while the pointer stands on the tile — which is exactly how the
 *      previous version of this probe measured a card and reported "no cut" for a tile it had
 *      never actually aimed at.
 *
 * The glow strip is screenshotted under three variants (as-is, layer overflow visible, rail
 * overflow visible) so the leftmost painted pixel can be compared run to run
 * (scripts/lib/glow-scan.py: a hard cut moves with the box that causes it).
 *
 * Read-only apart from the prefs rig, which it restores field for field.
 * Usage: DSH_PORT=19387 node scripts/verify-rail-glow-clip.cjs [outDir]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const OUT = process.argv[2] || path.join(__dirname, '..', '.probe-glow-clip')
const STATE_KEY = 'harness-widgets.state'
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label)
}
const note = (label, detail) => console.log(`      · ${label}${detail === undefined ? '' : '  — ' + detail}`)
/** Clip tolerance (px): the overhang is quantised in 8px steps, so "flush" is a pass. */
const CUT_TOL = 0.5

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 1 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const crashes = []
  page.on('pageerror', (e) => crashes.push(String(e.message)))

  const readState = () => page.evaluate(async () => (await fetch('/api/widgets-state')).json())
  const writeState = (at, state) => page.evaluate(
    async ([at, s]) => { await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: at, state: s }) }) },
    [at, state],
  )
  const seedLocal = (at, state) => page.evaluate(
    ([k, a, v]) => { localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem(a, String(Date.now())) },
    [STATE_KEY, SAVED_AT_KEY, state],
  )
  // "Open" means VISIBLE: a closed rail now stays mounted (hidden) so opening it does not
  // rebuild 13 widget cards (keep-mount, 2026-10-03), so presence alone is not the signal.
  const railMounted = () => page.evaluate(() => document.querySelector('.dsx-stats-drawer:not([data-retired]) .dsx-stats-rail') !== null)
  const capsule = () => page.locator('button.dsx-stats-capsule').first()
  const ensureSession = async () => {
    for (let i = 0; i < 20; i++) {
      if ((await capsule().count()) > 0) return true
      const row = page.locator('[class$="_sessionRow"]').first()
      if ((await row.count()) > 0) await row.click().catch(() => {})
      await page.waitForTimeout(1500)
    }
    return (await capsule().count()) > 0
  }
  const waitRail = async (want, timeout = 5000) => {
    const t0 = Date.now()
    for (;;) {
      if ((await railMounted()) === want) return true
      if (Date.now() - t0 > timeout) return false
      await page.waitForTimeout(50)
    }
  }
  const setRail = async (want) => {
    if ((await railMounted()) === want) { await page.waitForTimeout(900); return true }
    await capsule().click({ timeout: 10000 })
    const ok = await waitRail(want)
    await page.waitForTimeout(900)
    return ok
  }
  const applyPrefs = async (patch, want) => {
    const current = await readState()
    const next = { ...current.state, ...patch, railOpen: false }
    const at = Date.now()
    await writeState(at, next)
    await seedLocal(at, next)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    await ensureSession()
    if (want !== false) await setRail(want)
  }

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(3500)
  await ensureSession()
  const original = await readState()
  console.log('original prefs', JSON.stringify({
    columns: original.state.columns, magnify: original.state.magnify, panelPadding: original.state.panelPadding,
    maxWidgets: original.state.maxWidgets, openShape: original.state.openShape, railOpen: original.state.railOpen,
  }))
  note('installed widgets in the owner state', String((original.state.installed || []).length))

  const geom = () => page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const layer = document.querySelector('.dsx-magnify-layer')
    const cs = getComputedStyle(rail)
    const r = rail.getBoundingClientRect()
    const l = layer ? layer.getBoundingClientRect() : null
    return {
      rail: { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height },
      layer: l === null ? null : { l: l.left, r: l.right, w: l.width, h: l.height, ovx: getComputedStyle(layer).overflowX, padLeft: getComputedStyle(layer).paddingLeft },
      railOverflow: { x: cs.overflowX, y: cs.overflowY, pad: cs.padding, padLeft: cs.paddingLeft },
      railScrollTop: rail.scrollTop,
      // The deck's participants, in DOM order: the cards and then the 设置 tile.
      participants: Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot, .dsx-wave-deck .dsx-stats-add')).length,
      tileCut: (() => {
        const t = document.querySelector('.dsx-wave-deck .dsx-stats-add')
        return t === null ? null : t.classList.contains('dsx-slot-cut')
      })(),
    }
  })

  /** Seats of the resting deck: the leftmost visible column and the tile's seat. */
  const seats = () => page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const rr = rail.getBoundingClientRect()
    const slots = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot'))
      .map((s, i) => {
        const b = s.getBoundingClientRect()
        return { i, l: +b.left.toFixed(1), t: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }
      })
      .filter((s) => s.l >= rr.left - 1 && s.t >= rr.top - 1 && s.t + s.h <= rr.bottom + 1)
    const tile = document.querySelector('.dsx-wave-deck .dsx-stats-add')
    const tb = tile.getBoundingClientRect()
    const cols = [...new Set(slots.map((s) => Math.round(s.l)))].sort((a, b) => a - b)
    return {
      railRect: { l: rr.left, t: rr.top, r: rr.right, b: rr.bottom },
      cols,
      minLeft: slots.reduce((m, s) => Math.min(m, s.l), Infinity),
      slots,
      tile: { l: +tb.left.toFixed(1), t: +tb.top.toFixed(1), w: +tb.width.toFixed(1), h: +tb.height.toFixed(1) },
    }
  })

  /**
   * The whole measurement for one pointer position, in the page.
   *
   * The TARGET is whatever the pointer is actually on inside the magnify layer
   * (`elementFromPoint`), never a class: `.dsx-slot-focused` marks card slots only, so it
   * still belongs to a card while the pointer stands on the 设置 tile.
   */
  const dump = (label, at) => page.evaluate(([label, at]) => {
    const round = (n) => +n.toFixed(1)
    const R = (el) => { const r = el.getBoundingClientRect(); return { l: round(r.left), t: round(r.top), r: round(r.right), b: round(r.bottom), w: round(r.width), h: round(r.height) } }
    /** Split a comma list at TOP-LEVEL commas only — `color(srgb … / .26)` has none, but be safe. */
    const splitTop = (s) => {
      const out = []
      let d = 0
      let cur = ''
      for (const ch of s) {
        if (ch === '(') d += 1
        else if (ch === ')') d -= 1
        if (ch === ',' && d === 0) { out.push(cur.trim()); cur = '' } else cur += ch
      }
      if (cur.trim() !== '') out.push(cur.trim())
      return out
    }
    /** Painted extent of every shadow layer, relative to the border box. */
    const SHADOWS = (el) => {
      const raw = getComputedStyle(el).boxShadow
      if (raw === 'none' || raw === '') return { raw, parts: [], extreme: { left: 0, top: 0, right: 0, bottom: 0 } }
      const parts = splitTop(raw).map((p) => {
        const nums = [...p.matchAll(/(-?[\d.]+)px/g)].map((m) => +m[1])
        return { text: p, x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0 }
      })
      let left = 0
      let top = 0
      let right = 0
      let bottom = 0
      for (const p of parts) {
        left = Math.min(left, p.x - p.spread - p.blur)
        right = Math.max(right, p.x + p.spread + p.blur)
        top = Math.min(top, p.y - p.spread - p.blur)
        bottom = Math.max(bottom, p.y + p.spread + p.blur)
      }
      return { raw, parts, extreme: { left, top, right, bottom } }
    }
    /** Clip rect of an element = its PADDING box (border box + border widths). */
    const clipBox = (el) => {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const bw = parseFloat(cs.borderLeftWidth) || 0
      const bt = parseFloat(cs.borderTopWidth) || 0
      const br = parseFloat(cs.borderRightWidth) || 0
      const bb = parseFloat(cs.borderBottomWidth) || 0
      return { l: r.left + bw, t: r.top + bt, r: r.right - br, b: r.bottom - bb }
    }
    const layer = document.querySelector('.dsx-magnify-layer')
    const morph = document.querySelector('.dsx-wave-on') !== null
    let target = null
    let kind = null
    if (at !== null) {
      const hit = document.elementFromPoint(at.x, at.y)
      const own = hit === null ? null : hit.closest('.dsx-magnify-layer .dsx-stats-add, .dsx-magnify-layer .dsx-stats-card')
      if (own !== null) { target = own; kind = own.classList.contains('dsx-stats-add') ? 'tile' : 'card-under-pointer' }
    }
    if (target === null && layer !== null) {
      const focused = layer.querySelector('.dsx-slot-focused .dsx-stats-card')
      const tile = layer.querySelector('.dsx-stats-add')
      if (focused !== null) { target = focused; kind = 'focused-card-fallback' }
      else if (tile !== null) { target = tile; kind = 'tile-fallback' }
    }
    const info = { label, at, morph, kind, target: target === null ? null : R(target), shadow: target === null ? null : SHADOWS(target), chain: [], participants: [], stack: [] }
    if (layer !== null) info.layerClip = clipBox(layer)
    if (target !== null) {
      const tr = target.getBoundingClientRect()
      const sh = info.shadow.extreme
      info.glow = {
        box: { l: round(tr.left), t: round(tr.top), r: round(tr.right), b: round(tr.bottom) },
        paint: { l: round(tr.left + sh.left), t: round(tr.top + sh.top), r: round(tr.right + sh.right), b: round(tr.bottom + sh.bottom) },
      }
      for (let el = target.parentElement, depth = 0; el !== null && depth < 14; el = el.parentElement, depth++) {
        const cs = getComputedStyle(el)
        const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible'
        const cb = clips ? clipBox(el) : null
        const cut = cb === null
          ? { left: 0, top: 0, right: 0, bottom: 0 }
          : {
              left: Math.max(0, round(cb.l - info.glow.paint.l)),
              top: Math.max(0, round(cb.t - info.glow.paint.t)),
              right: Math.max(0, round(info.glow.paint.r - cb.r)),
              bottom: Math.max(0, round(info.glow.paint.b - cb.b)),
            }
        info.chain.push({
          depth,
          tag: el.tagName,
          cls: String(el.className || '').slice(0, 46),
          rect: R(el),
          overflow: `${cs.overflowX}/${cs.overflowY}`,
          pad: cs.padding,
          z: cs.zIndex,
          pos: cs.position,
          clipBox: cb === null ? null : { l: round(cb.l), t: round(cb.t), r: round(cb.r), b: round(cb.b) },
          cut,
        })
      }
      const pts = [
        ['left-of-target', Math.max(2, info.glow.paint.l + 6), tr.top + tr.height / 2],
        ['left-of-target-y+10', Math.max(2, info.glow.paint.l + 6), tr.top + tr.height / 2 + 10],
        ['target-left-edge', tr.left - 4, tr.top + tr.height / 2],
      ]
      info.stack = pts.map(([name, x, y]) => ({
        name,
        at: [round(x), round(y)],
        els: document.elementsFromPoint(x, y).slice(0, 5).map((e) => `${e.tagName}.${String(e.className || '').split(' ').slice(0, 2).join('.')}`),
      }))
    }
    /**
     * EVERY painted participant (the overlay's slots + the tile), each against the layer's
     * left clip edge — the general form of the invariant, so a cut on a participant the
     * pointer is NOT on (the tile, typically) still shows up.
     */
    if (layer !== null) {
      const cb = clipBox(layer)
      const list = [
        ...Array.from(layer.querySelectorAll('.dsx-stats-card-slot')).map((s, i) => ({ name: `slot${i}`, el: s.querySelector('.dsx-stats-card') ?? s, kind: 'card' })),
        ...(layer.querySelector('.dsx-stats-add') === null ? [] : [{ name: 'tile', el: layer.querySelector('.dsx-stats-add'), kind: 'tile' }]),
      ]
      for (const p of list) {
        const r = p.el.getBoundingClientRect()
        const sh = SHADOWS(p.el)
        const paintLeft = r.left + sh.extreme.left
        info.participants.push({
          name: p.name,
          kind: p.kind,
          visible: getComputedStyle(p.el).visibility !== 'hidden' && Number(getComputedStyle(p.el).opacity) > 0.01,
          left: round(r.left),
          w: round(r.width),
          paintLeft: round(paintLeft),
          cutPx: round(cb.l - paintLeft),
          shadowLeft: sh.extreme.left,
        })
      }
      info.layerClipLeft = round(cb.l)
    }
    return info
  }, [label, at])

  const shot = async (name, box) => {
    const file = path.join(OUT, `${name}.png`)
    await page.screenshot({ path: file, clip: box })
    return file
  }

  const report = (d) => {
    console.log(`\n=== ${d.label} ===  morph=${d.morph} target=${d.kind}${d.at === null ? '' : ` @${d.at.x},${d.at.y}`}`)
    if (d.target === null) { console.log('  (no target under the pointer)'); return }
    console.log(`  target box  ${JSON.stringify(d.glow.box)}`)
    console.log(`  GLOW paint  ${JSON.stringify(d.glow.paint)}   (shadow layers: ${d.shadow.parts.map((p) => `${p.x},${p.y},${p.blur},${p.spread}`).join(' | ')})`)
    console.log(`  layer clip left = ${d.layerClipLeft}`)
    for (const c of d.chain) {
      const cut = c.cut.left + c.cut.top + c.cut.right + c.cut.bottom
      console.log(`  [${c.depth}] ${c.tag}.${c.cls}  rect=${JSON.stringify(c.rect)} ov=${c.overflow} clip=${c.clipBox === null ? '-' : JSON.stringify(c.clipBox)} z=${c.z}${cut > 0 ? `  CUTS l=${c.cut.left} t=${c.cut.top} r=${c.cut.right} b=${c.cut.bottom}` : ''}`)
    }
    for (const s of d.stack) console.log(`  stack @${s.name} ${JSON.stringify(s.at)} → ${s.els.join(' | ')}`)
    const worst = d.participants.slice().sort((a, b) => b.cutPx - a.cutPx)
    console.log(`  PARTICIPANTS vs layer clip (${d.participants.length}, worst first):`)
    for (const p of worst.slice(0, 6)) {
      console.log(`    ${p.cutPx > CUT_TOL ? 'CUT' : '   '} ${p.name.padEnd(7)} ${p.kind.padEnd(4)} left=${String(p.left).padStart(7)} w=${String(p.w).padStart(6)} shadowLeft=${p.shadowLeft} → cut=${p.cutPx}${p.visible ? '' : '  [hidden]'}`)
    }
  }

  /**
   * The invariant, once per scenario: no VISIBLE participant's painted extent may start
   * left of the layer's own left clip edge. Hidden participants are excluded because a
   * `dsx-slot-cut` card is deliberately not painted at all (prefs.wholeCards).
   */
  const assertNoLeftCut = (d, label) => {
    const live = d.participants.filter((p) => p.visible)
    const worst = live.slice().sort((a, b) => b.cutPx - a.cutPx)[0]
    check(live.length > 0 && worst !== undefined && worst.cutPx <= CUT_TOL,
      `${label}: no painted participant starts left of the layer's clip edge`,
      worst === undefined ? 'no visible participant' : `worst ${worst.name} (${worst.kind}) cut=${worst.cutPx}px ≤ ${CUT_TOL} · ${live.length} visible of ${d.participants.length}`)
  }

  const setStyle = (css) => page.evaluate((css) => {
    let el = document.getElementById('__glowdiag')
    if (el === null) { el = document.createElement('style'); el.id = '__glowdiag'; document.head.appendChild(el) }
    el.textContent = css
  }, css)

  /**
   * Land the pointer ON a magnetised target, and only accept a SETTLED landing.
   *
   * The 设置 tile is the wave's magnet, and its focused seat is BOTH scaled and pushed
   * left: measured at the rig-B deck, the resting box is [1158..1288]×[610..740] and the
   * focused one [1043..1209]×[645..811] — about 115px of travel. Aiming at centres
   * therefore never converges: the resting centre (1223,675) is 14px OUTSIDE the focused
   * box, so every landing there pushes the tile away, and aiming at the focused centre
   * returns the pointer outside the resting box, which releases the magnet again
   * (measured 2026-10-02: a clean period-2 oscillation — 1223,675 → 1126,728 → 1223,675 …,
   * reported as `card-under-pointer` for a tile the probe never touched).
   *
   * So the loop ENGAGES once at the resting centre, then walks toward the target by
   * clamping the pointer into whatever box the tile currently occupies (12px inset), and
   * accepts only when the pointer is inside that box AND the box has not moved between two
   * consecutive readings. The two boxes always overlap, so the walk has a fixed point —
   * and the confirmation is what makes the landing evidence rather than an assumption.
   *
   * Returns the settled pointer position, or null when the target is not there at all.
   */
  const hoverLive = async (selector, tries = 8) => {
    const read = () => page.evaluate((sel) => {
      const t = document.querySelector(sel)
      if (t === null) return null
      const b = t.getBoundingClientRect()
      const m = /scale\(([\d.]+)\)/.exec(t.style.transform || '')
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, scale: m === null ? 1 : Number(m[1]) }
    }, selector)
    const INSET = 12
    let at = null
    let prev = null
    for (let i = 0; i < tries; i++) {
      const r = await read()
      if (r === null) return null
      const next = at === null
        ? { x: Math.round((r.left + r.right) / 2), y: Math.round((r.top + r.bottom) / 2) }
        : {
            x: Math.round(Math.min(Math.max(at.x, r.left + INSET), r.right - INSET)),
            y: Math.round(Math.min(Math.max(at.y, r.top + INSET), r.bottom - INSET)),
          }
      await page.mouse.move(next.x, next.y, { steps: 2 })
      await page.waitForTimeout(320)
      at = next
      const now = await read()
      if (now === null) return null
      const inside = at.x >= now.left && at.x <= now.right && at.y >= now.top && at.y <= now.bottom
      const steady = prev !== null && Math.abs(now.left - prev.left) < 2 && Math.abs(now.top - prev.top) < 2
      note(`chase ${i}`, `pointer ${JSON.stringify(at)} → target l=${Math.round(now.left)} t=${Math.round(now.top)} scale=${now.scale.toFixed(3)} · inside ${inside} · steady ${steady}`)
      if (inside && steady) return at
      prev = now
    }
    return at
  }

  try {
    // ══ A. the hover glow of the card in the LEFTMOST column ═══════════════════
    //    Three columns so there IS a leftmost card column, max magnification so the
    //    leftward growth is as large as the product allows.
    await applyPrefs({ columns: 3, magnify: 1.4, maxWidgets: 20, openShape: 'stagger', railOpen: true }, true)
    let g = await geom()
    let seat = await seats()
    console.log('\n--- rail geometry (rig A: leftmost card column) ---')
    console.log(JSON.stringify(g, null, 1))
    console.log('column x =', JSON.stringify(seat.cols), ' tile =', JSON.stringify(seat.tile))
    check(seat.cols.length === 3, 'rig A really has a three-column deck with a leftmost column',
      `columns at x = ${JSON.stringify(seat.cols)}`)
    const leftCard = seat.slots.find((s) => Math.abs(s.l - seat.minLeft) < 1.5)
    const atA = { x: Math.round(leftCard.l + leftCard.w / 2), y: Math.round(leftCard.t + leftCard.h / 2) }
    await page.mouse.move(atA.x, atA.y, { steps: 4 })
    await page.waitForTimeout(700)
    const A = await dump('A: hover the leftmost-column card', atA)
    report(A)
    check(A.kind === 'card-under-pointer' && A.morph,
      'rig A: the pointer really is on a magnified card (the overlay is the painted surface)',
      `kind ${A.kind} · morph ${A.morph}`)
    assertNoLeftCut(A, 'A')
    // 2. The clipper is the LAYER, and only the layer: every other ancestor of the card
    //    reports `overflow: visible` (so nothing above it in the shell is cutting), and
    //    the layer's cut is the one the overhang budget has to cover.
    const clippers = A.chain.filter((c) => c.clipBox !== null)
    check(clippers.length > 0 && clippers.every((c) => /dsx-magnify-layer/.test(c.cls)),
      'A: the magnify layer is the ONLY ancestor clipping the glow (not the shell, not the conversation area)',
      clippers.length === 0 ? 'no clipping ancestor found' : clippers.map((c) => `[${c.depth}] ${c.tag}.${c.cls}`).join(' | '))
    // 3. …and it CLIPS AT ITS OWN BOX while painting OVER the transcript: at a point inside
    //    the glow strip the topmost element is the layer, with the conversation's own
    //    markdown rows below it. That is the direct answer to "是否与对话区域有关".
    const stripTop = A.stack.find((s) => s.name === 'left-of-target')
    const stripEls = stripTop === undefined ? [] : stripTop.els
    check(stripEls.length > 0 && /dsx-magnify-layer/.test(stripEls[0]),
      'A: the layer paints ABOVE the conversation area in the glow strip (the transcript is not covering it)',
      stripEls.join(' | '))
    check(stripEls.slice(1).some((e) => /markdown|_sessionRow|body/.test(e)),
      'A: the conversation area is UNDER the layer there (so it cannot be the clipper)',
      stripEls.slice(1).join(' | ') || 'nothing below the layer')
    const clipA = { x: Math.max(0, Math.round(A.glow.paint.l - 40)), y: Math.max(0, Math.round(A.glow.paint.t - 20)), width: 130, height: Math.round(A.glow.box.b - A.glow.paint.t + 30) }
    await shot('A0-as-is-card', clipA)
    await setStyle('.dsx-magnify-layer{overflow:visible !important}')
    await page.waitForTimeout(120)
    report(await dump('A/V1: layer overflow visible', atA))
    await shot('A1-layer-visible-card', clipA)
    await setStyle('')

    // ══ B. the 设置 TILE, in the one rig where it is the leftmost participant ══
    //    The deck seats EVERY installed widget (the `installed` list is the deck's
    //    source; `maxWidgets` is the market's placement cap, and the rail ignores it —
    //    measured: 13 installed with maxWidgets 12 still seats 14 participants), so the
    //    widget list is what this rig trims: a multiple of `columns` fills every row
    //    above the tile, which puts the tile on its OWN row at COLUMN 0 — the case
    //    `reachAdd` exists for, and the one a card-only overhang budget silently drops.
    const cols3 = 3
    const installedList = Array.isArray(original.state.installed) ? original.state.installed.slice() : []
    const keep = Math.max(cols3, installedList.length - (installedList.length % cols3))
    await applyPrefs({ columns: cols3, magnify: 1.4, installed: installedList.slice(0, keep), openShape: 'stagger', railOpen: true }, true)
    g = await geom()
    seat = await seats()
    console.log('\n--- rail geometry (rig B: 设置 tile on its own row, column 0) ---')
    console.log(JSON.stringify(g, null, 1))
    console.log('column x =', JSON.stringify(seat.cols), ' tile =', JSON.stringify(seat.tile))
    check(Math.abs(seat.tile.l - Math.min(...seat.cols)) < 1.5,
      'rig B really seats the 设置 tile in the LEFTMOST column (the case reachAdd exists for)',
      `tile left ${seat.tile.l} vs leftmost column ${Math.min(...seat.cols)} · ${keep} widgets + tile = ${g.participants} participants`)
    check(g.participants === keep + 1, 'rig B: the deck really seats the trimmed widget list plus the tile',
      `${g.participants} participants for ${keep} installed`)
    check(g.tileCut === false, 'rig B: the tile is not hidden as a half-seated card (prefs.wholeCards)',
      `dsx-slot-cut ${g.tileCut}`)
    // The tile is revealed by a surface hover and only exists as a pointer target once
    // the wave is live, so arm the wave on a card first, then chase the tile.
    const leftCardB = seat.slots.find((s) => Math.abs(s.l - seat.minLeft) < 1.5)
    await page.mouse.move(Math.round(leftCardB.l + leftCardB.w / 2), Math.round(leftCardB.t + leftCardB.h / 2), { steps: 4 })
    await page.waitForTimeout(500)
    const atB = await hoverLive('.dsx-magnify-layer .dsx-stats-add')
    await page.waitForTimeout(400)
    const B = await dump('B: hover the 设置 tile', atB)
    report(B)
    check(B.kind === 'tile' && B.morph,
      'rig B: the pointer really is on the 设置 tile (hit-tested, not inferred from a card class)',
      `kind ${B.kind} · morph ${B.morph}${atB === null ? '' : ` @${atB.x},${atB.y}`}`)
    if (B.kind === 'tile') {
      // The tile's own promise: its BORDER box (the dashed square) is fully inside the
      // layer, i.e. the tile the user sees is not sliced. It carries no shadow, so its
      // painted extent IS its border box.
      const tileCut = B.layerClipLeft - B.glow.box.l
      check(tileCut <= CUT_TOL,
        'B: the 设置 tile itself is not cut on the left (dashed border included)',
        `tile left ${B.glow.box.l} vs layer clip ${B.layerClipLeft} → cut ${tileCut.toFixed(1)}px`)
    }
    assertNoLeftCut(B, 'B')
    const clipB = { x: Math.max(0, Math.round(B.glow.paint.l - 40)), y: Math.max(0, Math.round(B.glow.paint.t - 20)), width: 130, height: Math.round(B.glow.box.b - B.glow.paint.t + 30) }
    await shot('B0-as-is-tile', clipB)
    await setStyle('.dsx-magnify-layer{overflow:visible !important}')
    await page.waitForTimeout(120)
    await shot('B1-layer-visible-tile', clipB)
    await setStyle('')
  } catch (e) {
    check(false, 'the probe ran to the end', String(e && e.message ? e.message : e))
    console.error(e)
  }

  console.log('\npage errors:', crashes.length === 0 ? 'none' : crashes.join(' | '))
  check(crashes.length === 0, 'no page errors', crashes.join(' | '))

  // ── restore ───────────────────────────────────────────────────────────────
  const at = Date.now()
  await writeState(at, original.state)
  await seedLocal(at, original.state)
  const back = await readState()
  const same = ['columns', 'magnify', 'panelPadding', 'maxWidgets', 'openShape', 'railOpen'].every((k) => back.state[k] === original.state[k])
  console.log('restored:', same, JSON.stringify({ columns: back.state.columns, magnify: back.state.magnify, maxWidgets: back.state.maxWidgets, openShape: back.state.openShape, railOpen: back.state.railOpen }))
  check(same, 'the owner’s persisted prefs were restored field for field')
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  await browser.close()

  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'} — shots in ${OUT}`)
  if (fails.length > 0) process.exitCode = 1
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
