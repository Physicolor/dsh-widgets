/**
 * Rail rework VERIFICATION (scripts/verify-rail-rework.cjs)
 *
 * The 2026-10-01 rework had three parts; this probe asserts each against the LIVE
 * GUI at 1578×1000, the same stage the other rail probes use:
 *
 *  A. the bottom tile is a SETTINGS entry point — the product's gear glyph, the
 *     label 设置 and the aria 打开组件设置 — and the panel it opens is titled
 *     组件设置;
 *  B. WHOLE CARDS ONLY: at every rest position, each drawn card is entirely
 *     inside the rail's box, the next card is hidden, and the hidden ones are not
 *     hit-testable either (the magnify overlay never draws one);
 *  C. the drawer grows out of its TOP-RIGHT corner: `transform-origin` is the
 *     wrapper's top-right, the transition carries the configured cubic-bezier,
 *     and a real enter walks `scale(animScale → 1)` together with
 *     `translateX(travel → 0)`.
 *
 * Side effect (unavoidable — the animation only plays on a real toggle): it opens
 * and closes the rail through the Components capsule and leaves it OPEN, which is
 * the state it found. Point it at a server whose prefs you can live with.
 *
 * Usage: node scripts/verify-rail-rework.cjs [outDir]
 *        DSH_PORT=19387 node scripts/verify-rail-rework.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const OUT = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : path.join(__dirname, '..', '.probe-rail-rework')
// `--session <name>`: see verify-rail-interaction.cjs — the first sidebar row is
// the empty 新会话 scratch pad, so the deck mounts no widget cards and the card /
// cascade geometry below measures nothing. Passing the flag used to be swallowed
// as the OUT directory, which made every run silently probe an empty session.
const SESSION = (() => {
  const i = process.argv.indexOf('--session')
  return i === -1 ? null : process.argv[i + 1]
})()
const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label + (detail === undefined ? '' : ' — ' + detail))
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  // 1578×640 rather than 1578×950: the owner's deck now fits a tall pane whole
  // (the corrected budget seats it in 3 columns), and a pane that cuts NOTHING
  // cannot prove the whole-card rule. The short pane still resolves 3 columns
  // (the count is width-driven), so every other invariant is unchanged.
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 640 }, deviceScaleFactor: 1 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const crashes = []
  page.on('pageerror', (e) => crashes.push(String(e.message)))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const where = (m.location() && m.location().url) || ''
    // A 404 for something the SHELL asks for is not this plugin's failure; a
    // plugin bundle that fails to load, or any JS exception, is.
    if (/Failed to load resource/.test(m.text()) && !/widgets/.test(where)) return
    crashes.push(`${m.text()} @ ${where}`)
  })
  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(4000)

  // A fresh context has no active session of its own; open the one the caller named,
  // or the first one offered.
  if (!(await page.locator('.dsx-stats-rail').count())) {
    const row = SESSION === null
      ? page.locator('[class$="_sessionRow"]').first()
      : page.locator('[class*="sessionRow"]', { hasText: SESSION }).first()
    if (SESSION !== null && !(await row.count())) { check(false, 'the named session exists', `no row matching "${SESSION}"`); await browser.close(); process.exit(1) }
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(6000) }
  }
  const capsule = page.locator('button.dsx-stats-capsule').first()
  // "Open" means VISIBLE, not present: a closed rail stays mounted but retired (hidden)
  // since 2026-10-03 (keep-mount — see rail-view.tsx), so presence alone would leave the
  // probe measuring a closed drawer.
  const openRailSel = '.dsx-stats-drawer:not([data-retired]) .dsx-stats-rail'
  if (!(await page.locator(openRailSel).count()) && (await capsule.count())) {
    await capsule.click().catch(() => {})
    await page.waitForTimeout(1500)
  }
  const railLoc = page.locator(openRailSel).first()
  if (!(await railLoc.count())) {
    check(false, 'the rail is on screen', 'no capsules/session to open it with')
    await browser.close()
    process.exit(1)
  }
  // The rail mounts inside the enhancer's wrapped center card, which is itself
  // mounted a beat after the session resolves — until then every rect in the
  // subtree is 0×0. Wait for a real box instead of racing it (a 0-box run made
  // every geometric check below meaningless).
  for (let i = 0; i < 40; i++) {
    const w = await page.evaluate((sel) => Math.round((document.querySelector(sel) ?? { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width), openRailSel)
    if (w > 0) break
    await page.waitForTimeout(250)
  }

  /** One reading of the rail, both decks. */
  const snap = () => page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const rb = rail.getBoundingClientRect()
    const vis = (s) => getComputedStyle(s).visibility === 'visible'
    const rest = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot'))
    const over = Array.from(document.querySelectorAll('.dsx-magnify-layer .dsx-stats-card-slot'))
    const shown = rest.filter(vis)
    const cut = rest.filter((s) => s.classList.contains('dsx-slot-cut'))
    return {
      scrollTop: rail.scrollTop,
      railTop: Math.round(rb.top), railBottom: Math.round(rb.bottom),
      restShown: shown.length, restCut: cut.length, restTotal: rest.length,
      // Every DRAWN card must sit entirely inside the rail's box.
      allDrawnInside: shown.every((s) => { const r = s.getBoundingClientRect(); return r.top >= rb.top - 0.5 && r.bottom <= rb.bottom + 0.5 }),
      // …and every hidden one must be one the viewport would really cut.
      everyCutIsReal: cut.every((s) => { const r = s.getBoundingClientRect(); return r.top < rb.top - 0.5 || r.bottom > rb.bottom + 0.5 }),
      overlayVisibleCut: over.filter((s) => s.classList.contains('dsx-slot-cut') && vis(s)).length,
      overlayShown: over.filter(vis).length,
      // The settings tile: cut? painted? and does the pane still hold it?
      tileCut: (() => { const t = document.querySelector('.dsx-wave-deck .dsx-stats-add'); return t ? t.classList.contains('dsx-slot-cut') : null })(),
      tileVis: (() => { const t = document.querySelector('.dsx-wave-deck .dsx-stats-add'); return t ? getComputedStyle(t).visibility : null })(),
      tileOpacity: (() => { const t = document.querySelector('.dsx-wave-deck .dsx-stats-add'); return t ? getComputedStyle(t).opacity : null })(),
      tileInside: (() => {
        const t = document.querySelector('.dsx-wave-deck .dsx-stats-add')
        if (t === null) return null
        const r = t.getBoundingClientRect()
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), inside: r.top >= rb.top - 0.5 && r.bottom <= rb.bottom + 0.5 }
      })(),
      // How much further the browser would let this rail scroll right now.
      overScroll: Math.round(rail.scrollHeight - rail.clientHeight - rail.scrollTop),
    }
  })

  // ── A. the settings tile ────────────────────────────────────────────────────
  const chrome = await page.evaluate(() => {
    const add = document.querySelector('.dsx-stats-add')
    return {
      label: add ? (add.querySelector('.dsx-stats-add-label') || {}).textContent : null,
      aria: add ? add.getAttribute('aria-label') : null,
      // The official `ic_ds_settings_outline_16` outer tooth path.
      gear: add && add.querySelector('path') ? add.querySelector('path').getAttribute('d').slice(0, 9) : null,
      panelTitle: (document.querySelector('.dsx-stats-addpanel-title') || {}).textContent ?? null,
      // No bare plus glyph may survive anywhere in the tile.
      plus: add ? /M8 3\.2v9\.6/.test(add.innerHTML) : false,
    }
  })
  check(chrome.label === '设置', 'the bottom tile is labelled 设置', String(chrome.label))
  check(chrome.aria === '打开组件设置', 'the tile announces the panel', String(chrome.aria))
  check(chrome.gear === 'M14.0861 ', 'the tile draws the official settings gear', String(chrome.gear))
  check(chrome.plus === false, 'the old plus glyph is gone')
  check(chrome.panelTitle === '组件设置', 'the panel is titled 组件设置', String(chrome.panelTitle))

  // ── B. whole cards, at rest and after a detent ──────────────────────────────
  const atTop = await snap()
  check(atTop.allDrawnInside, 'at rest: every drawn card is whole', JSON.stringify(atTop))
  check(atTop.everyCutIsReal, 'at rest: every hidden card is one the viewport cuts')
  check(atTop.restCut + (atTop.tileCut ? 1 : 0) > 0, 'at rest: the pane really does cut something (else this proves nothing)', JSON.stringify({ cards: atTop.restCut, tile: atTop.tileCut }))
  await railLoc.screenshot({ path: path.join(OUT, 'rail-rest.png') }).catch(() => {})
  // Full-page shot: the rail's TOP alignment can only be judged against the
  // window chrome around it (it is anchored to the session header's bottom edge).
  await page.screenshot({ path: path.join(OUT, 'window.png') })

  const box = await railLoc.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + 40)
  await page.mouse.wheel(0, 220)
  await page.waitForTimeout(800)
  const hovering = await snap()
  check(hovering.overlayVisibleCut === 0, 'while magnifying: no cut card is drawn by the overlay', JSON.stringify(hovering))
  check(hovering.overlayShown > 0, 'while magnifying: the overlay still paints cards', String(hovering.overlayShown))
  await page.screenshot({ path: path.join(OUT, 'magnify.png') })
  await page.mouse.move(700, 500)
  await page.waitForTimeout(800)                       // let the spring settle, deck swaps back
  const atDetent = await snap()
  check(atDetent.scrollTop !== atTop.scrollTop, 'the wheel moved the rail a detent', `${atTop.scrollTop} → ${atDetent.scrollTop}`)
  check(atDetent.allDrawnInside, 'after a detent: every drawn card is whole', JSON.stringify(atDetent))
  check(atDetent.everyCutIsReal, 'after a detent: every hidden card is one the viewport cuts')
  await railLoc.screenshot({ path: path.join(OUT, 'rail-detent.png') }).catch(() => {})

  // ── B2. the tile obeys the same rule, and the scroll STOPS at the bottom card ─
  // One-directional on purpose: at rest the tile is ALSO hidden by the hover
  // reveal, so `cut` can only ever prove "not painted", never the converse.
  check(atDetent.tileCut === false || atDetent.tileVis === 'hidden',
    'a cut tile is never painted', JSON.stringify({ tile: atDetent.tileInside, cut: atDetent.tileCut, vis: atDetent.tileVis }))

  // Wheel to the very end: the deck must stop with its deepest component shown,
  // and the browser must have (almost) no range left beyond that stop.
  for (let i = 0; i < 12; i++) { await page.mouse.move(box.x + box.width / 2, box.y + 40); await page.mouse.wheel(0, 220); await page.waitForTimeout(120) }
  await page.waitForTimeout(700)
  await page.mouse.move(700, 500)
  await page.waitForTimeout(900)                       // let the wave spring fully settle
  const atEnd = await snap()
  check(atEnd.tileCut === false, 'at the end of the scroll the tile is whole', JSON.stringify(atEnd.tileInside))
  check(atEnd.tileInside !== null && atEnd.tileInside.inside, 'at the end, the deepest component is inside the pane', JSON.stringify(atEnd.tileInside))
  // Blank band under the content must be under one card pitch (it used to be a
  // whole viewport when the last row could still top out).
  check(atEnd.railBottom - atEnd.tileInside.bottom < 200, 'at the end, the pane holds no empty viewport', `${atEnd.railBottom - atEnd.tileInside.bottom}px`)
  check(atEnd.overScroll <= 40, 'the browser has no scroll range left past the cap', `${atEnd.overScroll}px`)
  await railLoc.screenshot({ path: path.join(OUT, 'rail-end.png') }).catch(() => {})

  // ── B3. the settings tile is a HOVER affordance, not a resident cell ─────────
  const tileState = () => page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('.dsx-stats-add'))
    const vis = tiles.filter((t) => getComputedStyle(t).visibility === 'visible')
    return {
      painted: vis.length,
      opacity: vis.length === 0 ? '0' : getComputedStyle(vis[0]).opacity,
      hasSurfaceClass: !!document.querySelector('.dsx-surface-hover'),
      // The deck's own copy, for the "hidden at rest" direction.
      deckVis: getComputedStyle(document.querySelector('.dsx-wave-deck .dsx-stats-add')).visibility,
    }
  })
  const tileRest = await tileState()
  check(tileRest.painted === 0 && Number(tileRest.opacity) === 0, 'at rest no tile is painted', JSON.stringify(tileRest))
  check(tileRest.hasSurfaceClass === false, 'no surface-hover class while the pointer is away')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(500)
  const tileHover = await tileState()
  check(tileHover.hasSurfaceClass === true && tileHover.painted >= 1 && Number(tileHover.opacity) === 1,
    'hovering the rail reveals the tile', JSON.stringify(tileHover))
  await page.screenshot({ path: path.join(OUT, 'tile-hover.png') })
  await page.mouse.move(700, 500)
  await page.waitForTimeout(700)

  // ── B4. the fade, and no LEFT truncation while the highlight goes away ───────
  const fade = await page.evaluate(() => {
    const cut = document.querySelector('.dsx-slot-cut')
    const plain = Array.from(document.querySelectorAll('.dsx-stats-card-slot')).find((s) => !s.classList.contains('dsx-slot-cut'))
    const cs = cut ? getComputedStyle(cut) : null
    return {
      cutOpacity: cs ? cs.opacity : null,
      cutDelay: cs ? cs.transitionDelay : null,
      cutProps: cs ? cs.transitionProperty : null,
      plainProps: plain ? getComputedStyle(plain).transitionProperty : null,
      plainDelay: plain ? getComputedStyle(plain).transitionDelay : null,
    }
  })
  check(fade.cutOpacity === '0' && /opacity/.test(String(fade.cutProps)) && /visibility/.test(String(fade.cutProps)),
    'a cut slot fades rather than pops', JSON.stringify(fade))
  check(/0\.18s$/.test(String(fade.cutDelay)), 'the discrete flip waits for the fade', String(fade.cutDelay))
  check(/0\.18s, 0s$|0\.18s$/.test(String(fade.plainDelay)) === false && /0s/.test(String(fade.plainDelay)),
    'un-cutting flips at once (base rule carries no delay)', String(fade.plainDelay))

  const leftMost = await page.evaluate(() => {
    const drawn = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot')).filter((s) => getComputedStyle(s).visibility === 'visible')
    let best = null
    for (const s of drawn) {
      const r = s.getBoundingClientRect()
      if (best === null || r.left < best.left) best = { left: r.left, top: r.top, w: r.width, h: r.height }
    }
    return best === null ? null : { x: Math.round(best.left + best.w / 2), y: Math.round(best.top + best.h / 2) }
  })
  const clip = () => page.evaluate(() => {
    const layer = document.querySelector('.dsx-magnify-layer')
    if (layer === null) return null
    const cs = getComputedStyle(layer)
    const lr = layer.getBoundingClientRect()
    // Clipping happens at the PADDING box, not the content box.
    const clipLeft = lr.left + (parseFloat(cs.borderLeftWidth) || 0)
    /** Split a comma list at TOP-LEVEL commas (`color(srgb …)` may contain none). */
    const splitTop = (s) => {
      const out = []
      let d = 0
      let cur = ''
      for (const ch of s) {
        if (ch === '(') d += 1
        else if (ch === ')') d -= 1
        if (ch === ',' && d === 0) { out.push(cur); cur = '' } else cur += ch
      }
      if (cur.trim() !== '') out.push(cur)
      return out
    }
    /** How far a painted box-shadow reaches LEFT of its element's border box. */
    const shadowLeft = (el) => {
      const raw = getComputedStyle(el).boxShadow
      if (raw === 'none' || raw === '') return 0
      let left = 0
      for (const p of splitTop(raw)) {
        const n = [...p.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]))
        if (n.length >= 3) left = Math.min(left, n[0] - (n[3] ?? 0) - n[2])
      }
      return left
    }
    let worstCard = 0
    let worstGlow = 0
    let worstTile = 0
    let focusedEl = null
    for (const slot of layer.querySelectorAll('.dsx-stats-card-slot')) {
      const m = /scale\(([\d.]+)\)/.exec(slot.style.transform || '')
      const magnified = m !== null && Number(m[1]) >= 1.005
      const isFocus = slot.classList.contains('dsx-slot-focused')
      if (!magnified && !isFocus) continue
      const card = slot.querySelector('.dsx-stats-card') || slot
      const cut = card.getBoundingClientRect().left - clipLeft
      worstCard = Math.min(worstCard, cut)
      if (isFocus) {
        focusedEl = card
        worstGlow = Math.min(worstGlow, card.getBoundingClientRect().left + shadowLeft(card) - clipLeft)
      }
    }
    // The 设置 tile is NOT a slot and NOT in `items`: `addSlotFor` seats it one
    // pitch left of the last row's leftmost card, so while it is magnified it can
    // be the furthest thing left on screen — and the overhang used to ignore it.
    for (const tile of layer.querySelectorAll('.dsx-stats-add')) {
      if (getComputedStyle(tile).visibility === 'hidden') continue
      worstTile = Math.min(worstTile, tile.getBoundingClientRect().left - clipLeft)
    }
    return { worstCard: Math.round(worstCard), worstGlow: Math.round(worstGlow), worstTile: Math.round(worstTile), layerW: Math.round(lr.width), layerLeft: Math.round(lr.left), clipLeft: Math.round(clipLeft), overhang: Math.round(lr.width - (parseFloat(cs.paddingLeft) || 0) * 2) }
  })
  if (leftMost !== null) {
    await page.mouse.move(leftMost.x, leftMost.y)
    await page.waitForTimeout(450)
    const whileHover = await clip()
    await page.mouse.move(700, 500)
    const trail = []
    for (let i = 0; i < 12; i++) { trail.push(await clip()); await page.waitForTimeout(28) }
    const frames = [whileHover, ...trail].filter(Boolean)
    const worst = Math.min(...frames.map((s) => s.worstCard))
    const worstGlow = Math.min(...frames.map((s) => s.worstGlow))
    const worstTile = Math.min(...frames.map((s) => s.worstTile))
    check(worst >= -1, 'the magnified card is never clipped on the left while it springs back',
      `hover ${JSON.stringify(whileHover)} · worst ${worst} over ${trail.length} frames`)
    // Both of these were the user's 2026-10-02 report: the CARD was fine, the glow
    // and the tile were not (the overhang counted neither the shadow's blur nor the
    // tile, which is not in `items`).
    check(worstGlow >= -1, 'the hover GLOW is never clipped on the left (blur counted in the overhang)',
      `worst ${worstGlow}px · ${JSON.stringify(whileHover)}`)
    check(worstTile >= -1, 'the 设置 tile is never clipped on the left (it is a participant too)',
      `worst ${worstTile}px · ${JSON.stringify(whileHover)}`)
  } else {
    check(false, 'a left-column card was available to hover')
  }
  await page.waitForTimeout(400)

  // ── B5b. the overlay out-stacks the conversation ────────────────────────────
  // The enhancer's wrapped center card is drawn from `shell.overlay`
  // (z-index 20) while the rail's own seat is 7, so a magnified card growing left
  // of the rail was covered by that chrome — the reported "left truncation".
  // Portaled to <body>, the layer competes at the ROOT context instead.
  const stack = await page.evaluate(() => {
    const layer = document.querySelector('.dsx-magnify-layer')
    if (layer === null) return null
    const cs = getComputedStyle(layer)
    return { parent: layer.parentElement.tagName, z: Number(cs.zIndex), pos: cs.position }
  })
  check(stack !== null && stack.parent === 'BODY', 'the magnify overlay is portaled out of the seat', JSON.stringify(stack))
  check(stack !== null && stack.z > 20, 'it out-stacks the shell overlay outlet (z-index 20)', String(stack && stack.z))

  // ── B5. the budget comes from the shell's REAL measure ──────────────────────
  // DSH 0.2 renamed the variable (`--dsh-chat-content-width` →
  // `--dsh-chat-user-width`); reading only the old name silently fell back to an
  // estimate and left the rail one column narrow (`--dsx-rail-w` 350 instead of
  // 430 at a 1578px window, measured 2026-10-01).
  const budget = await page.evaluate(() => {
    const host = document.querySelector('[data-phase]') ?? document.querySelector('[class$="_centerCol"]')
    const cs = host ? getComputedStyle(host) : null
    const readVar = (n) => (cs ? cs.getPropertyValue(n).trim() : '')
    const cards = Array.from(document.querySelectorAll('[class*="_card"]'))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 300 && r.width < 1200 && r.height > 200)
    const column = document.querySelector('[class$="_centerCol"]')
    return {
      userWidth: readVar('--dsh-chat-user-width'),
      contentWidth: readVar('--dsh-chat-content-width'),
      cardW: cards.length ? Math.round(cards[0].width) : null,
      columnW: column ? Math.round(column.getBoundingClientRect().width) : null,
      claim: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dsx-rail-w')) || 0,
    }
  })
  const measure = Number.parseFloat(budget.userWidth) || Number.parseFloat(budget.contentWidth) || 0
  check(measure > 0, 'the shell publishes a chat measure the rail can read', JSON.stringify(budget))
  check(budget.claim > 0 && budget.columnW - budget.claim >= measure,
    'the claim leaves the transcript its whole measure', `claim ${budget.claim}, column ${budget.columnW}, measure ${measure}`)
  if (budget.cardW !== null) {
    check(budget.cardW >= measure - 1, 'the conversation card is not squeezed', `card ${budget.cardW} vs measure ${measure}`)
  }


  const anim = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.dsx-stats-drawer'))
    const rail = document.querySelector('.dsx-stats-rail')
    return { origin: cs.transformOrigin, transition: cs.transition, railW: Math.round(rail.getBoundingClientRect().width) }
  })
  // `transform-origin` on the inset:0 wrapper: the RIGHT edge of the viewport, at
  // its top — i.e. the rail's own top-right corner while no right panel is open.
  check(/^\d+(\.\d+)?px 0px$/.test(anim.origin), 'the drawer is anchored at the top-right corner', anim.origin)
  check(/cubic-bezier\(/.test(anim.transition), 'the drawer transition carries a cubic-bezier', anim.transition)

  // Toggle it: close, then reopen while sampling. Ends OPEN, the state we found.
  const samples = []
  if (await capsule.count()) {
    await capsule.click().catch(() => {})
    await page.waitForTimeout(800)
    await capsule.click().catch(() => {})
    const t0 = Date.now()
    for (let i = 0; i < 24; i++) {
      const s = await page.evaluate(() => {
        // TWO elements, TWO transforms: the wrapper slides, the inner box scales
        // (a single `transform` cannot carry two timing functions).
        const mat = (el) => {
          const t = el ? getComputedStyle(el).transform : null
          if (t === null || t === 'none') return null
          return t.match(/matrix\(([-\d.]+), [-\d.]+, [-\d.]+, ([-\d.]+), ([-\d.]+), ([-\d.]+)\)/)
        }
        const ms = mat(document.querySelector('.dsx-stats-drawer'))
        const mz = mat(document.querySelector('.dsx-stats-drawer-zoom'))
        const deck = document.querySelector('.dsx-wave-deck')
        // Two oracles for the cascade:
        //  - VISIBLE: how many cards are still mid-motion (scaled down) right now;
        //  - NO SQUASH: every card's matrix must stay UNIFORM (a == d), because the
        //    group scale and a per-card scale must never multiply into a
        //    distorted card (measured 53px cards at animScale 0.5 × 0.82).
        const mats = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot')).map((el) => {
          const t = getComputedStyle(el).transform
          if (t === 'none') return null
          const m = /matrix\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+),/.exec(t)
          return m === null ? null : { a: Number(m[1]), d: Number(m[4]) }
        })
        const folded = mats.filter((m) => m !== null && m.a < 0.99).length
        const uneven = mats.filter((m) => m !== null && Math.abs(m.a - m.d) > 0.005).length
        // The fold is driven per frame from rail-view (inline `transform` on its
        // own clock — see rail/wave/deck-cascade.ts), so the deck's own element
        // carries the state as `data-deck-anim`, not as a class.
        const deckEl = deck === null ? null : deck.firstElementChild
        // TWO shapes, TWO live oracles: the group transform in 'zoom', the cards'
        // own inline transforms in 'stagger' (where the group deliberately does not
        // move at all). Sampling on the group alone collected nothing in 'stagger'.
        const cardLive = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot, .dsx-wave-deck .dsx-stats-add'))
          .some((el) => el.style.transform !== '')
        return {
          live: ms !== null || mz !== null || cardLive,
          tx: ms === null ? 0 : Math.round(Number(ms[3])),
          scale: mz === null ? 1 : +Number(mz[1]).toFixed(4),
          cascade: deckEl !== null && deckEl.hasAttribute('data-deck-anim'),
          folded,
          uneven,
        }
      })
      if (s.live) samples.push({ ms: Date.now() - t0, tx: s.tx, scale: s.scale, cascade: s.cascade, folded: s.folded, uneven: s.uneven })
      if (i === 4) await page.screenshot({ path: path.join(OUT, 'enter-mid.png') })
      await page.waitForTimeout(16)
    }
    await page.waitForTimeout(600)
    const settled = await page.evaluate(() => getComputedStyle(document.querySelector('.dsx-stats-drawer')).transform)
    if (samples.length >= 3) {
      const first = samples[0]
      const last = samples[samples.length - 1]
      const cascading = samples.some((s) => s.cascade)
      // The top-right-anchored motion belongs to whichever half carries it: the
      // GROUP in the 'zoom' shape, each CARD in the 'stagger' shape — where the
      // group deliberately does not move at all.
      const groupScales = samples.map((s) => s.scale)
      if (!cascading) {
        check(first.tx > 0, 'on enter the drawer starts OFFSET to the right', `translateX ${first.tx}px`)
        check(last.tx < first.tx, 'the offset falls toward 0', `${first.tx}px → ${last.tx}px`)
        const travel = Math.round(anim.railW + 24)
        check(first.tx <= travel + 2, 'the start offset is the rail width + 24 at most', `${first.tx}px ≤ ${travel}px`)
        const txs = samples.map((s) => s.tx)
        check(txs.every((v, i) => i === 0 || v <= txs[i - 1] + 1), 'the offset never moves backwards', txs.slice(0, 8).join(' → '))
        check(first.scale < 0.999, 'on enter the group starts SCALED about its top-right corner', `scale ${first.scale}`)
        check(last.scale > first.scale, 'the scale grows toward 1', `${first.scale} → ${last.scale}`)
        check(groupScales.every((v, i) => i === 0 || v >= groupScales[i - 1] - 0.002), 'the scale never shrinks mid-enter', groupScales.slice(0, 8).join(' → '))
      } else {
        // stagger: the rail's own box must NOT move and the group must NOT scale —
        // that is what drowned the per-card motion; the cards carry everything.
        check(samples.every((s) => s.tx === 0), 'the stagger shape never translates the rail’s own box',
          samples.map((s) => s.tx).slice(0, 6).join(' → '))
        check(samples.every((s) => s.scale === 1), 'the stagger shape never scales the group as a block',
          groupScales.slice(0, 6).join(' → '))
        check(samples.some((s) => s.folded > 0), 'the card cascade is VISIBLE mid-enter',
          samples.map((s) => s.folded).slice(0, 10).join(' → '))
        check(samples.every((s) => s.uneven === 0), 'the cascade never distorts a card (every matrix stays uniform)',
          samples.map((s) => s.uneven).slice(0, 8).join(' → '))
        const order = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot, .dsx-wave-deck .dsx-stats-add')).map((s) => {
          const r = s.getBoundingClientRect()
          return {
            top: Math.round(r.top), left: Math.round(r.left),
            tile: s.classList.contains('dsx-stats-add'),
            delay: Number.parseFloat(s.style.getPropertyValue('--dsx-slot-delay')) || 0,
          }
        }))
        // The 设置 tile shares the deck's grid and folds with it, so the two
        // anchors are compared among the CARDS: the tile is the deck's deepest
        // element and is normally rank 0 itself.
        const cardsOnly = order.filter((o) => !o.tile)
        const bottomLeft = cardsOnly.reduce((a, b) => (b.top > a.top || (b.top === a.top && b.left < a.left) ? b : a), cardsOnly[0])
        const topRight = cardsOnly.reduce((a, b) => (b.top < a.top || (b.top === a.top && b.left > a.left) ? b : a), cardsOnly[0])
        check(bottomLeft.delay < topRight.delay && topRight.delay === Math.max(...order.map((o) => o.delay)),
          'the cascade runs bottom-left → top-right', `bl ${bottomLeft.delay}ms · tr ${topRight.delay}ms · ${order.length} cells`)
        check(new Set(order.map((o) => o.delay)).size === order.length,
          'every cell of the deck has its own delay (no rank cap)',
          order.map((o) => o.delay).join(','))
      }
    } else {
      check(false, 'the enter animation was sampled', `${samples.length} sample(s)`)
    }
    check(settled === 'none', 'the drawer settles with no transform', String(settled))
  }

  // ── D. the advanced section: amplitude, presets, and a draggable curve ──────
  // The tile lives at the END of the deck and only paints while the surface is
  // hovered (prefs.wholeCards + the hover reveal), so bring that end into view
  // and click its coordinates directly — a synthetic click never checks
  // visibility, which is exactly the state a real pointer puts it in.
  for (let i = 0; i < 12; i++) { await page.mouse.move(box.x + box.width / 2, box.y + 40); await page.mouse.wheel(0, 220); await page.waitForTimeout(90) }
  await page.waitForTimeout(600)
  await page.mouse.move(700, 500)
  await page.waitForTimeout(400)
  const tileBox = await page.locator('.dsx-wave-deck .dsx-stats-add').first().boundingBox().catch(() => null)
  if (tileBox !== null) {
    await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2)
    await page.waitForTimeout(350)
    await page.mouse.down()
    await page.mouse.up()
  }
  await page.waitForTimeout(500)
  check((await page.locator('.dsx-stats-addpanel.open').count()) === 1, 'the settings tile opens the panel')
  await page.locator('.dsx-stats-addpanel .dsx-tab', { hasText: '组件设置' }).first().click().catch(() => {})
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, 'settings-page.png') })
  const drawerTransition = () => page.evaluate(() => getComputedStyle(document.querySelector('.dsx-stats-drawer')).transition)
  /** The ZOOM half of the open/close: its own element, hence its own curve. */
  const zoomTransition = () => page.evaluate(() => {
    const el = document.querySelector('.dsx-stats-drawer-zoom')
    return el === null ? '' : getComputedStyle(el).transition
  })
  const adv = await page.evaluate(() => {
    const panel = document.querySelector('.dsx-stats-addpanel')
    const line = panel.querySelector('.dsx-curve-line')
    // Per-row CONTROL AUDIT: the page must ask for the same KIND of value with the
    // same widget (numeric → stepper, curated set → select, boolean → switch).
    const audit = []
    for (const group of panel.querySelectorAll('.dsx-set-group')) {
      const g = group.querySelector('.dsx-set-group-head > .dsx-set-head-title')
      for (const row of group.querySelectorAll(':scope > div')) {
        const control = row.querySelector('.dsx-stepper, .dsx-select, .dsx-switch-input, .dsx-curve-svg')
        if (control === null) continue
        const title = row.querySelector(':scope > div > div')
        const kind = control.classList.contains('dsx-stepper') ? 'stepper'
          : control.classList.contains('dsx-select') ? 'select'
            : control.classList.contains('dsx-switch-input') ? 'switch' : 'curve'
        audit.push(`${g === null ? '?' : g.textContent}|${title === null ? '?' : title.textContent}|${kind}`)
      }
    }
    return {
      groups: Array.from(panel.querySelectorAll('.dsx-set-group-head > .dsx-set-head-title')).map((el) => el.textContent),
      curves: Array.from(panel.querySelectorAll('.dsx-set-curve .dsx-set-head-title')).map((el) => el.textContent),
      audit,
      pills: Array.from(panel.querySelectorAll('.dsx-pill')).map((p) => p.textContent),
      active: (panel.querySelector('.dsx-pill[data-active="true"]') || {}).textContent ?? null,
      svg: !!panel.querySelector('.dsx-curve-svg'),
      handles: panel.querySelectorAll('.dsx-curve-handle').length,
      dotCurve: panel.querySelector('.dsx-curve-dot-y') ? getComputedStyle(panel.querySelector('.dsx-curve-dot-y')).animationTimingFunction : null,
      line: line ? line.getAttribute('d') : null,
    }
  })
  check(adv.groups.join('/') === '网格与尺寸/卡片外观/悬浮放大/打开与收起动画/组件设置面板/对话区',
    'the general tab is grouped by surface', adv.groups.join('/'))
  const findRow = (t) => adv.audit.find((r) => r.split('|')[1] === t)
  check((findRow('最多列数') || '').endsWith('|stepper'), '最多列数 is a numeric stepper', String(findRow('最多列数')))
  check((findRow('可显示的最多行数') || '').endsWith('|stepper'), '可显示的最多行数 is a numeric stepper', String(findRow('可显示的最多行数')))
  const selects = adv.audit.filter((r) => r.endsWith('|select')).map((r) => r.split('|')[1])
  check(selects.length === 2 && selects.join('/') === '圆角档位/展开方式',
    'only the two curated sets use a Select', selects.join('/'))
  check(/网格与尺寸\|最多列数\|stepper[\s\S]*网格与尺寸\|可显示的最多行数\|stepper/.test(adv.audit.join('\n')), 'the two are adjacent in the same group', adv.audit.slice(0, 3).join(' · '))
  check(adv.curves.join('/') === '位移曲线/缩放曲线', 'the open/close has BOTH a position and a size curve', adv.curves.join('/'))
  check(adv.svg && adv.handles === 4, 'each curve editor draws a field and two handles', JSON.stringify({ svg: adv.svg, handles: adv.handles }))
  check(adv.pills.slice(0, 5).join('/') === '线性/标准/缓出/根号/平滑', 'the five presets are offered', adv.pills.join('/'))
  check(typeof adv.active === 'string' && adv.active !== '', 'exactly one preset is active', String(adv.active))
  check(/cubic-bezier/.test(String(adv.dotCurve)), 'the replay dot runs on the same curve', String(adv.dotCurve))
  check(String(adv.line).startsWith('M20,148 C'), 'the drawn curve spans the field', String(adv.line))

  // The DRAWN curve IS the drawer's easing, whatever the active value is (the
  // owner leaves this profile on a hand-drawn curve, so the probe reads the
  // handles' own coordinates instead of assuming a preset). render/curve.tsx
  // plots a 1×1 field with a 20px pad inside a 168px SVG.
  const CURVE_PAD = 20
  const CURVE_SPAN = 128
  const nums = (t) => {
    const m = /cubic-bezier\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+)\)/.exec(String(t))
    return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  }
  const near = (a, b) => a !== null && b !== null && a.every((v, i) => Math.abs(v - b[i]) < 0.02)
  /**
   * `max_t y(t)` of a cubic-bezier with these ordinates — the curve's own peak.
   *
   * `x1`/`x2` are a monotone reparameterisation, so the largest `y` the curve ever shows
   * is the largest `y(t)` over `t`, which is what this scans.
   */
  const bezierPeak = (c) => {
    const y1 = c[1]
    const y2 = c[3]
    let best = 1
    for (let i = 1; i < 4096; i++) {
      const t = i / 4096
      const u = 1 - t
      const v = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
      if (v > best) best = v
    }
    return best
  }
  /** The stored spring settle (fraction of the travel) — see prefs.animBounce. */
  const animBounce = await page.evaluate(() => {
    try { return Math.max(0, Number(JSON.parse(localStorage.getItem('harness-widgets.state') || '{}').animBounce) || 0) } catch { return 0 }
  })
  /**
   * Is the drawn curve the one the SLIDE half really runs on?
   *
   * NOT a plain four-number compare any more: the position curve carries the spring
   * settle, which prefs.ts's `overshootCurve` folds in by raising the curve's ORDINATE
   * `y1` until its peak clears 1 by exactly the stored bounce. `x1`/`x2`/`y2` — the whole
   * timing character — are left untouched, so what the drawer must carry is "the drawn
   * curve, with the settle on top of it". Comparing the raw numbers would read the settle
   * as a wrong curve (measured: the drawn `cubic-bezier(0.31, 0.66, 0.51, 1)` comes out
   * as `(0.31, 1.3465, 0.51, 1)` at animBounce 0.04, peak 1.0400).
   */
  const sameSlide = (applied, drawn) => applied !== null && drawn !== null
    && Math.abs(applied[0] - drawn[0]) < 0.02
    && Math.abs(applied[2] - drawn[2]) < 0.02
    && Math.abs(applied[3] - drawn[3]) < 0.02
    && Math.abs(bezierPeak(applied) - (1 + animBounce)) < 0.01
  const CURVES = { 线性: [0, 0, 1, 1], 标准: [0.25, 0.1, 0.25, 1], 缓出: [0, 0, 0.58, 1], 根号: [0.31, 0.66, 0.51, 1], 平滑: [0.42, 0, 0.58, 1] }
  const readDraw = (editor = 0) => page.evaluate(([pad, span, idx]) => {
    const blocks = Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-set-curve'))
    const block = blocks[idx] ?? blocks[0]
    const svg = block.querySelector('.dsx-curve-svg')
    const hs = Array.from(block.querySelectorAll('.dsx-curve-handle'))
    const r = svg.getBoundingClientRect()
    const at = (c) => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]
    const [p1, p2] = hs.map(at)
    return {
      scale: r.width / 168,
      topLeft: [r.left, r.top],
      handles: [p1, p2],
      curve: [
        (p1[0] - pad) / span, 1 - (p1[1] - pad) / span,
        (p2[0] - pad) / span, 1 - (p2[1] - pad) / span,
      ].map((v) => Math.round(v * 10000) / 10000),
    }
  }, [CURVE_PAD, CURVE_SPAN, editor])
  /** Press handle `i` at `from`, drag `away` px, then release back at `from`. */
  const dragAndReturn = async (i, dx, dy, sample) => {
    const g = await readDraw()
    const pt = (cx, cy) => [g.topLeft[0] + cx * g.scale, g.topLeft[1] + cy * g.scale]
    const [hx, hy] = g.handles[i]
    await page.mouse.move(...pt(hx, hy))
    await page.mouse.down()
    await page.mouse.move(...pt(hx + dx, hy + dy), { steps: 6 })
    await page.waitForTimeout(220)
    const mid = await sample()
    await page.mouse.move(...pt(hx, hy), { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    return mid
  }

  const draw0 = await readDraw()
  const draw1 = await readDraw(1)
  const original = adv.active
  check(sameSlide(nums(await drawerTransition()), draw0.curve),
    'the SLIDE half animates on the position curve that is DRAWN, with the spring settle folded in',
    `${JSON.stringify(draw0.curve)} + peak ${(1 + animBounce).toFixed(4)} vs ${JSON.stringify(nums(await drawerTransition()))}`)
  check(near(nums(await zoomTransition()), draw1.curve),
    'the ZOOM half animates on the size curve that is DRAWN', `${JSON.stringify(draw1.curve)} vs ${nums(await zoomTransition())}`)
  const state = () => page.evaluate(() => {
    const panel = document.querySelector('.dsx-stats-addpanel')
    return {
      active: (panel.querySelector('.dsx-pill[data-active="true"]') || {}).textContent ?? null,
      custom: Array.from(panel.querySelectorAll('.dsx-pill')).some((p) => p.textContent === '自定义'),
      transition: getComputedStyle(document.querySelector('.dsx-stats-drawer')).transition,
    }
  })
  // DRAG TEST — deliberately non-destructive: the gesture ends exactly where it
  // started, so the final value written is the one that was already there. (The
  // owner leaves this profile on a HAND-DRAWN curve; a probe that drags a handle
  // away and restores it by clicking a preset would silently ship its own.)
  await page.locator('.dsx-stats-addpanel .dsx-curve-svg').first().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(200)
  const mid = await dragAndReturn(0, 30, -26, state)
  check(mid.custom && mid.active === '自定义' && !sameSlide(nums(mid.transition), draw0.curve),
    'dragging a handle makes the curve custom while the gesture is live', JSON.stringify({ active: mid.active, custom: mid.custom }))
  const after = await state()
  // Numeric only: a pointer round trip through a 128px field lands ~1e-7 off the
  // original numbers, so the pill legitimately reads 自定义 for a preset owner.
  // The preset branch below puts the value back exactly.
  check(sameSlide(nums(after.transition), draw0.curve),
    'releasing back home puts the curve back', `${after.active} · ${JSON.stringify(nums(after.transition))}`)
  // A preset writes the transition the drawer actually uses — only touched when
  // the owner's own value IS a preset, so the round trip is exact.
  if (original !== '自定义' && CURVES[original] !== undefined) {
    const other = Object.keys(CURVES).find((k) => k !== original) ?? '平滑'
    await page.locator('.dsx-stats-addpanel .dsx-pill', { hasText: other }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    check(sameSlide(nums(await drawerTransition()), CURVES[other]), `picking ${other} retargets the drawer easing`, String(nums(await drawerTransition())))
    await page.locator('.dsx-stats-addpanel .dsx-pill', { hasText: original }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    check(sameSlide(nums(await drawerTransition()), CURVES[original]), 'the owner’s preset is restored', String(nums(await drawerTransition())))
  } else {
    check(true, 'the owner’s hand-drawn curve is left untouched by this probe', String(original))
  }
  await page.screenshot({ path: path.join(OUT, 'advanced.png') })
  await page.locator('.dsx-stats-addpanel-close').first().click().catch(() => {})

  check(crashes.length === 0, 'no page errors', crashes.slice(0, 2).join(' | '))
  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'} — shots in ${OUT}`)
  await browser.close()
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
