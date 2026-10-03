/**
 * Live verification for the per-card open/close fold (scripts/verify-deck-cascade-live.cjs)
 *
 * Drives the REAL GUI through the whole animation matrix the rework has to
 * satisfy, and asserts each on the live DOM:
 *
 *   A. 'zoom' is NOT regressed: the wrapper still slides (translateX travel → 0)
 *      and the inner box still scales (animScale → 1), and no card ever carries a
 *      fold transform.
 *   B. 'stagger' open: the rail's own box NEVER moves, the cards do — the fold is
 *      visible, legible (a real travel, not the old 6×18px drift), strictly
 *      ordered bottom-left → top-right, one delay per rank (nothing capped), and
 *      every start offset stays inside the deck (the rail clips its subtree).
 *   C. 'stagger' close: the SAME fold backwards, the drawer unmounting on the
 *      fold's real end rather than on a fixed timeout.
 *   D. a rapid reversal (close during open, then open again) stays continuous and
 *      still settles.
 *   E. a mode switch leaves no residue — driven through the 设置 panel itself.
 *   F. prefers-reduced-motion: no fold at all, nothing written.
 *   G. the fold holds up across card counts (and the delay ladder never repeats).
 *   H. scrolling / a LIVE column change during the fold do not fight it — and the
 *      deck's own reflow wave still runs afterwards.
 *
 * The probe rewrites the rail's persisted prefs through the plugin's OWN
 * /api/widgets-state route and puts the original state back at the end, then
 * reloads so the running GUI converges. It leaves the rail open, the state it
 * found.
 *
 * Usage: DSH_PORT=19387 node scripts/verify-deck-cascade-live.cjs [outDir]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const OUT = process.argv[2] || path.join(__dirname, '..', '.probe-deck-cascade')
const STATE_KEY = 'harness-widgets.state'
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label + (detail === undefined ? '' : ' — ' + detail))
}
const note = (label, detail) => console.log(`      · ${label}${detail === undefined ? '' : '  — ' + detail}`)

/** A computed `transform` is always a matrix — parse that, not the written form. */
const MAT = (t) => {
  const m = /matrix\(([-\d.e+]+), ([-\d.e+]+), ([-\d.e+]+), ([-\d.e+]+), ([-\d.e+]+), ([-\d.e+]+)\)/.exec(String(t || ''))
  return m === null ? null : { a: +m[1], b: +m[2], c: +m[3], d: +m[4], e: +m[5], f: +m[6] }
}
/** Inline transforms ARE written as `translate(...) scale(...)`. */
const MAG = (t) => {
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(t || '')
  return m === null ? 0 : Math.hypot(Number(m[1]), Number(m[2]))
}
const SCALE = (t) => {
  const m = /scale\(([\d.]+)\)/.exec(t || '')
  if (m !== null) return Number(m[1])
  const mat = MAT(t)
  return mat === null ? null : mat.a
}
/** `cubic-bezier(a, b, c, d)` from a computed transition, sampled as y(x). */
function bezierOf(transition) {
  const m = /cubic-bezier\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+)\)/.exec(String(transition))
  if (m === null) return null
  const [x1, y1, x2, y2] = m.slice(1).map(Number)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 26; i++) {
      const e = sx(t) - x
      if (Math.abs(e) < 1e-6) break
      if (e > 0) hi = t
      else lo = t
      t = (lo + hi) / 2
    }
    return sy(t)
  }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 1 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const crashes = []
  const warns = []
  page.on('pageerror', (e) => crashes.push(String(e.message)))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const where = (m.location() && m.location().url) || ''
    if (/Failed to load resource/.test(m.text()) && !/widgets/.test(where)) return
    // ── A 400 ON THE STATE ROUTE IS A TEARDOWN ARTIFACT, NOT A PAGE ERROR ──
    // The probe changes prefs (open shape, bounce, columns), each change arms the client's
    // 400ms debounced PUT, and the probe's own navigation/teardown can abort one in flight —
    // the host's handler then answers 400 (it wraps `readJsonBody` + the tmp-file write in one
    // try). Measured 2026-10-03: it happens in roughly one run in three, and NOT from write
    // concurrency — `scripts/diag-state-put-race.cjs` fires six simultaneous PUTs of the same
    // payload and gets 200 six times. The state it failed to write is already in localStorage
    // and the next save converges, so this is reported and does not fail the run.
    if (/Failed to load resource/.test(m.text()) && /widgets-state/.test(where) && /\b400\b/.test(m.text())) {
      warns.push(`${m.text()} @ ${where}`)
      return
    }
    crashes.push(`${m.text()} @ ${where}`)
  })

  // ── the persisted state, captured verbatim so it can be put back ───────────
  const readState = () => page.evaluate(async () => (await fetch('/api/widgets-state')).json())
  const writeState = (at, state) => page.evaluate(
    async ([at, s]) => { await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: at, state: s }) }) },
    [at, state],
  )
  const seedLocal = (at, state) => page.evaluate(
    ([k, a, v]) => { localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem(a, String(Date.now())) },
    [STATE_KEY, SAVED_AT_KEY, state],
  )
  /**
   * One numeric pref, off the very state the app reads.
   *
   * Read from localStorage rather than from `readState()`'s HTTP body on purpose:
   * every fold below is played after an `applyPrefs` round trip has already written
   * both channels, and the assertions that use this (the spring settle, one per
   * shape) must be checking the number the RENDER actually resolved — not a copy
   * the probe kept in its own variable.
   */
  const readPrefNumber = (key) => page.evaluate((k) => {
    try {
      const v = Number(JSON.parse(localStorage.getItem('harness-widgets.state') || '{}')[k])
      return Number.isFinite(v) ? v : 0
    } catch { return 0 }
  }, key)
  // "The rail is open" = the drawer exists AND is not retired: since 2026-10-03 a closed
  // rail stays MOUNTED (hidden) so that opening it does not rebuild 13 widget cards.
  const railMounted = () => page.evaluate(() => document.querySelector('.dsx-stats-drawer:not([data-retired]) .dsx-stats-rail') !== null)
  const capsule = () => page.locator('button.dsx-stats-capsule').first()
  /**
   * A fresh context has no active session of its own, and the composer capsule only
   * exists once one is open. The first load after a cold start can take a while to
   * offer the session list, so this retries instead of racing it (measured: a boot
   * that was still empty after 4s left every later click waiting for a capsule that
   * never came).
   */
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
  /** Leave the rail in a known state (and let whatever fold it played finish). */
  const setRail = async (want) => {
    if ((await railMounted()) === want) { await page.waitForTimeout(1200); return true }
    await capsule().click({ timeout: 10000 })
    const ok = await waitRail(want)
    await page.waitForTimeout(1200)
    return ok
  }
  /** Reboot on a prefs patch, then park the rail at `want`. */
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
  /** Arm the sampler, toggle the rail, and hand back the frames it saw. */
  const playFold = async (end, ms) => {
    await setRail(end !== 'open')
    await armSampler(ms)
    await capsule().click({ timeout: 10000 })
    await page.waitForTimeout(ms + 150)
    return readSamples()
  }
  const armSampler = (ms) => page.evaluate((ms) => {
    window.__fold = []
    window.__deckSeq = window.__deckSeq || 0
    window.__cardSeq = window.__cardSeq || 0
    // Timestamps come from the rAF clock itself — the SAME time base the fold's
    // own clock advances on. A `performance.now()` read inside the callback is a
    // different instant (the callback's position in the frame, and which of the
    // two callbacks runs first), which is enough to make a perfectly smooth fold
    // read as a 2× speed blip.
    let t0 = null
    // How many style writes the fold actually performs per frame: 14 cards × one
    // write is the healthy case, and anything else is what a bogus clock step
    // would have to be explained by.
    let observer = null
    let observed = null
    let writes = 0
    const ensureObserver = () => {
      const wrap = document.querySelector('.dsx-wave-deck')
      if (wrap === observed) return
      if (observer !== null) observer.disconnect()
      observed = wrap
      if (wrap !== null) {
        observer = new MutationObserver((records) => { writes += records.length })
        observer.observe(wrap, { attributes: true, attributeFilter: ['style'], subtree: true })
      }
    }
    const read = (now) => {
      if (t0 === null) t0 = now
      ensureObserver()
      const wrap = document.querySelector('.dsx-wave-deck')
      const deck = wrap === null ? null : wrap.firstElementChild
      if (deck !== null && deck.__foldId === undefined) deck.__foldId = ++window.__deckSeq
      const nodes = deck === null ? [] : Array.from(deck.querySelectorAll('.dsx-stats-card-slot, .dsx-stats-add'))
      for (const el of nodes) if (el.__foldId === undefined) el.__foldId = ++window.__cardSeq
      const drawer = document.querySelector('.dsx-stats-drawer')
      const zoom = document.querySelector('.dsx-stats-drawer-zoom')
      window.__fold.push({
        t: Math.round(now - t0),
        w: writes,
        mounted: drawer !== null,
        // Since 2026-10-03 the drawer is RETIRED rather than unmounted on close (keep-mount,
        // see rail-view): the deck stays resident so the next open is not a 285ms rebuild.
        // `retired` is therefore the signal the close timeline is measured on.
        retired: drawer !== null && drawer.getAttribute('data-retired') !== null,
        drawer: drawer === null ? null : getComputedStyle(drawer).transform,
        zoom: zoom === null ? null : getComputedStyle(zoom).transform,
        anim: deck === null ? null : deck.getAttribute('data-deck-anim'),
        phase: wrap === null ? null : wrap.className,
        // The DOM NODE is a card's real identity: a remount renumbers everything,
        // and comparing two different elements' offsets is meaningless.
        deckId: deck === null ? null : deck.__foldId,
        cardIds: nodes.map((el) => el.__foldId),
        // The delay is the card's identity within one deck (the fold's own key).
        delays: nodes.map((el) => Number.parseFloat(el.style.getPropertyValue('--dsx-slot-delay')) || 0),
        cards: nodes.map((el) => el.style.transform || ''),
      })
      if (now - t0 < ms) requestAnimationFrame(read)
      writes = 0
    }
    requestAnimationFrame(read)
  }, ms)
  const readSamples = () => page.evaluate(() => window.__fold)
  const participants = () => page.evaluate(() => {
    const wrap = document.querySelector('.dsx-wave-deck')
    const deck = wrap === null ? null : wrap.firstElementChild
    if (deck === null) return []
    return Array.from(deck.querySelectorAll('.dsx-stats-card-slot, .dsx-stats-add')).map((el) => {
      const r = el.getBoundingClientRect()
      return {
        tile: el.classList.contains('dsx-stats-add'),
        delay: Number.parseFloat(el.style.getPropertyValue('--dsx-slot-delay')) || 0,
        delayOut: Number.parseFloat(el.style.getPropertyValue('--dsx-slot-delay-out')) || 0,
        top: Math.round(r.top), right: Math.round(r.right), left: Math.round(r.left), bottom: Math.round(r.bottom),
      }
    })
  })
  /** Frames of one fold that still carry the deck. */
  /**
   * Everything the fold reproduces from the group's own transform: the corner the
   * wrapper scales about (read off the live element, `1578px 0px` at a 1578px
   * window), the travel it starts from, the scale it starts from, and the two
   * curves it rides.
   */
  const readAnchor = () => page.evaluate(() => {
    const drawer = document.querySelector('.dsx-stats-drawer')
    const zoom = document.querySelector('.dsx-stats-drawer-zoom')
    const rail = document.querySelector('.dsx-stats-rail')
    if (drawer === null || zoom === null || rail === null) return null
    let animScale = 0.88
    try { animScale = JSON.parse(localStorage.getItem('harness-widgets.state') || '{}').animScale ?? 0.88 } catch { /* ignore */ }
    const origin = getComputedStyle(drawer).transformOrigin.split(' ')
    const readVar = (name) => {
      for (const host of [document.documentElement, document.body]) {
        const raw = getComputedStyle(host).getPropertyValue(name).trim()
        if (raw !== '') return raw
      }
      return ''
    }
    const rawMs = readVar('--ds-transition-duration-slow')
    const groupMs = rawMs.endsWith('ms') ? Number.parseFloat(rawMs)
      : rawMs.endsWith('s') ? Number.parseFloat(rawMs) * 1000 : 300
    return {
      travel: Math.round(rail.getBoundingClientRect().width) + 24,
      scale: Math.min(1, Math.max(0.5, Number(animScale))),
      originX: Number.parseFloat(origin[0]) || 0,
      originY: Number.parseFloat(origin[1]) || 0,
      groupMs: Number.isFinite(groupMs) && groupMs > 0 ? groupMs : 300,
      shiftCurve: getComputedStyle(drawer).transition,
      zoomCurve: getComputedStyle(zoom).transition,
      railRight: Math.round(rail.getBoundingClientRect().right),
    }
  })
  /** The participants' resting boxes, keyed by node identity. */
  const restingRects = () => page.evaluate(() => {
    const wrap = document.querySelector('.dsx-wave-deck')
    const deck = wrap === null ? null : wrap.firstElementChild
    if (deck === null) return null
    const nodes = Array.from(deck.querySelectorAll('.dsx-stats-card-slot, .dsx-stats-add'))
    window.__ridSeq = window.__ridSeq || 0
    return {
      ids: nodes.map((el) => { if (el.__rid === undefined) el.__rid = ++window.__ridSeq; return el.__rid }),
      rects: nodes.map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height] }),
    }
  })
  /** Per-frame boxes of every participant, for the pixel-level path check. */
  const armRectSampler = (ms) => page.evaluate((ms) => {
    window.__rects = []
    window.__ridSeq = window.__ridSeq || 0
    let t0 = null
    const read = (now) => {
      if (t0 === null) t0 = now
      const wrap = document.querySelector('.dsx-wave-deck')
      const deck = wrap === null ? null : wrap.firstElementChild
      if (deck !== null) {
        const nodes = Array.from(deck.querySelectorAll('.dsx-stats-card-slot, .dsx-stats-add'))
        for (const el of nodes) if (el.__rid === undefined) el.__rid = ++window.__ridSeq
        const drawer = document.querySelector('.dsx-stats-drawer')
        const zoom = document.querySelector('.dsx-stats-drawer-zoom')
        const at = (el) => (el === null ? null : getComputedStyle(el).transform)
        window.__rects.push({
          t: Math.round(now - t0),
          anim: deck.getAttribute('data-deck-anim'),
          drawer: at(drawer),
          zoom: at(zoom),
          // The rail's own border-box left edge: the fold's settle can push a card PAST it,
          // and the rail — being a scroll container — clips right there (see the excursion
          // measurement in the stagger block).
          railLeft: (() => {
            const rail = document.querySelector('.dsx-stats-rail')
            return rail === null ? 0 : rail.getBoundingClientRect().left
          })(),
          ids: nodes.map((el) => el.__rid),
          rects: nodes.map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height] }),
          scale: nodes.map((el) => { const m = /scale\(([\d.]+)\)/.exec(el.style.transform || ''); return m === null ? 1 : Number(m[1]) }),
        })
      }
      if (now - t0 < ms) requestAnimationFrame(read)
    }
    requestAnimationFrame(read)
  }, ms)
  /** Invert a monotone easing by bisection — the probe's own, not the app's. */
  const invEase = (fn) => (y) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (fn(mid) < y) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }

  /** Wait until the deck reports a given fold direction (no guessed timing). */
  const waitFoldPhase = async (want, timeout = 900) => {
    const t0 = Date.now()
    for (;;) {
      const phase = await page.evaluate(() => {
        const wrap = document.querySelector('.dsx-wave-deck')
        const deck = wrap === null ? null : wrap.firstElementChild
        return deck === null ? null : deck.getAttribute('data-deck-anim')
      })
      if (phase === want) return true
      if (Date.now() - t0 > timeout) return false
      await page.waitForTimeout(6)
    }
  }

  const deckFrames = (s) => s.filter((f) => f.cards.length > 0)
  const transitions = (frames, key) => frames
    .map((f) => f[key])
    .filter((v, i, a) => i === 0 || v !== a[i - 1])

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(4000)
  await ensureSession()
  const original = await readState()
  note('the owner’s persisted prefs were captured',
    `savedAt ${original.savedAt}, openShape ${original.state && original.state.openShape}, railOpen ${original.state && original.state.railOpen}`)

  let failure = null
  try {
    // ══ A. 'zoom' is not regressed ══════════════════════════════════════════
    await applyPrefs({ openShape: 'zoom' }, false)
    let s = await (async () => {
      // One fold's worth of samples is needed to read the travel; the rail must be
      // open first, so open it, close it, then sample the real open.
      await setRail(true)
      return playFold('open', 1400)
    })()
    {
      const travel = await page.evaluate(() => Math.round(document.querySelector('.dsx-stats-rail').getBoundingClientRect().width + 24))
      const frames = s.filter((f) => f.mounted)
      const txs = frames.map((f) => (MAT(f.drawer) === null ? null : MAT(f.drawer).e)).filter((v) => v !== null && Math.abs(v) > 1)
      check(txs.length > 3, 'zoom: the wrapper really does slide in (a translateX is painted)', `${txs.length} frames with tx`)
      check(txs.length > 0 && txs[0] > 0 && txs[0] <= travel + 2,
        'zoom: it starts offset to the right by at most the rail width + 24', `${txs[0]}px ≤ ${travel}px`)
      check(txs.length > 2 && txs[txs.length - 1] < txs[0], 'zoom: the offset falls toward 0',
        `${txs[txs.length - 1]}px → ${txs[0]}px`)
      // ── The spring settle, MEASURED against the pref that asks for it ────────
      // `prefs.animBounce` is folded into the position curve (see prefs.ts's
      // `overshootCurve`: `y1` is raised until the curve's peak clears 1 by the
      // requested fraction), so the group must travel PAST its seat by
      // `animBounce × travel` and come back. The deepest sample is that peak —
      // the transition is 300ms and this sampler runs for 1400ms, so no part of
      // the settle is outside the window. Asserting the band rather than "some
      // overshoot happened" is what ties the motion to the number the user set:
      // a curve solved to the wrong peak (or an easing that never got the raised
      // `y1`) fails here.
      const bounce = await readPrefNumber('animBounce')
      const deepest = txs.length === 0 ? 0 : Math.min(...txs)
      const asked = travel * (Number.isFinite(bounce) ? Math.max(0, bounce) : 0)
      check(asked > 0 && deepest <= -asked * 0.6 && deepest >= -asked * 1.4,
        'zoom: the group overshoots its seat by prefs.animBounce and springs back',
        `deepest tx ${deepest.toFixed(2)}px vs the requested ${(-asked).toFixed(2)}px (animBounce ${bounce})`)
      const scales = frames.map((f) => SCALE(f.zoom)).filter((v) => v !== null && v < 0.999)
      check(scales.length > 0 && Math.min(...scales) < 0.999,
        'zoom: the inner box still scales up out of the top-right corner',
        `min ${scales.length === 0 ? 'n/a' : Math.min(...scales).toFixed(3)}`)
      check(frames.every((f) => f.cards.every((c) => c === '')), 'zoom: no card carries a fold transform',
        frames.filter((f) => f.cards.some((c) => c !== '')).length + ' frame(s) with a card transform')
      const settled = frames[frames.length - 1]
      check(settled.anim === null && (settled.drawer === 'none' || MAT(settled.drawer) === null || MAT(settled.drawer).e === 0),
        'zoom: it settles with the wrapper untransformed', `${settled.drawer} · anim ${settled.anim}`)
      note('zoom frames', `${frames.length}, tx ${txs[0]} → ${txs[txs.length - 1]}, scales ${scales.slice(0, 4).map((v) => v.toFixed(3)).join(' ')}`)
    }
    await page.screenshot({ path: path.join(OUT, 'zoom-settled.png') })
    await setRail(true)
    const anchorCfg = await readAnchor()
    check(anchorCfg !== null && anchorCfg.travel > 0 && anchorCfg.scale < 1,
      'the group’s anchor was read off the live wrapper',
      anchorCfg === null ? 'unreadable' : JSON.stringify({ travel: anchorCfg.travel, scale: anchorCfg.scale, originX: anchorCfg.originX }))

    // ── A2. the SAME measurement on the group, so the fold has a reference ────
    // The claim is "each card travels where the group would have taken it", so the
    // group's own first frame is measured with the same instrument: its cards must
    // sit on `O + s·(p − O) + (tx, 0)` for the (s, tx) the wrapper really carries,
    // and those two numbers must be exactly the ones the fold reproduces.
    {
      await setRail(false)
      await armRectSampler(1400)
      await capsule().click({ timeout: 10000 })
      await page.waitForTimeout(1600)
      const sampled = await page.evaluate(() => window.__rects)
      const rest = await restingRects()
      const frames = sampled.filter((f) => (f.drawer !== null && f.drawer !== 'none') || (f.zoom !== null && f.zoom !== 'none'))
      const first = frames[0]
      let worst = 0
      let n = 0
      let s0 = null
      let tx0 = null
      if (first !== undefined && rest !== null) {
        const byId = new Map(rest.ids.map((id, k) => [id, rest.rects[k]]))
        const mz = MAT(first.zoom)
        const ms = MAT(first.drawer)
        s0 = mz === null ? 1 : mz.a
        tx0 = ms === null ? 0 : ms.e
        for (let k = 0; k < first.ids.length; k++) {
          const fin = byId.get(first.ids[k])
          if (fin === undefined) continue
          const ex = anchorCfg.originX + s0 * (fin[0] - anchorCfg.originX) + tx0
          const ey = anchorCfg.originY + s0 * (fin[1] - anchorCfg.originY)
          worst = Math.max(worst, Math.abs(first.rects[k][0] - ex), Math.abs(first.rects[k][1] - ey))
          n++
        }
      }
      check(n > 0 && worst <= 1.5, 'zoom’s own first frame sits on that map too (the reference)',
        `${n} cards · worst ${worst.toFixed(2)}px · scale ${s0} · tx ${tx0}`)
      check(s0 !== null && near(s0, anchorCfg.scale, 0.002) && tx0 !== null && Math.abs(tx0 - anchorCfg.travel) <= 2,
        'and the numbers the fold copies really are the group’s',
        `scale ${s0} vs animScale ${anchorCfg.scale} · tx ${tx0} vs travel ${anchorCfg.travel}`)
    }
    await setRail(true)

    // ══ B. 'stagger' open ═══════════════════════════════════════════════════
    // `BOUNCE=0.2` runs this whole section at another spring settle than the owner's, so the
    // excursion numbers above can be read at the ceiling of the settings row as well as at
    // the value the profile happens to hold (the probe restores what it found either way).
    await applyPrefs({ openShape: 'stagger', ...(process.env.BOUNCE === undefined ? {} : { animBounce: Number(process.env.BOUNCE) }) }, true)
    const people = await participants()
    check(people.length > 0, 'the deck has participants to fold', String(people.length))
    const delays = people.map((p) => p.delay)
    check(new Set(delays).size === delays.length, 'every participant has its own delay (the rank cap is gone)',
      `${new Set(delays).size} distinct of ${delays.length}, max ${Math.max(...delays)}ms`)
    {
      // The ladder is split out of the group's own transition, so its step is
      // whatever that duration leaves after one card's travel — a clean arithmetic
      // progression, just not a round number.
      const sorted = delays.slice().sort((a, b) => a - b)
      const step = sorted[1] - sorted[0]
      check(step > 0 && sorted.every((v, i) => Math.abs(v - i * step) < 0.03),
        'the delays are a clean constant-step ladder', `step ${step.toFixed(2)}ms · ${sorted.join(',')}`)
      const travelMs = anchorCfg.groupMs - sorted[sorted.length - 1]
      check(travelMs > anchorCfg.groupMs * 0.4 && travelMs < anchorCfg.groupMs * 0.8,
        'and what the ladder leaves of the group’s transition is one card’s own travel',
        `last ${sorted[sorted.length - 1]}ms + travel ${travelMs.toFixed(2)}ms = ${anchorCfg.groupMs}ms`)
    }
    const tileIdx = people.findIndex((p) => p.tile)
    check(tileIdx !== -1 && people[tileIdx].delay === 0,
      'the 设置 tile participates in the fold, and it is the first beat (it is the deepest cell)',
      `tile delay ${tileIdx === -1 ? 'n/a' : people[tileIdx].delay}ms`)
    const cardsOnly = people.filter((p) => !p.tile)
    const bl = cardsOnly.reduce((a, b) => (b.top > a.top || (b.top === a.top && b.left < a.left) ? b : a))
    const tr = cardsOnly.reduce((a, b) => (b.top < a.top || (b.top === a.top && b.right > a.right) ? b : a))
    check(bl.delay < tr.delay, 'the cascade still runs bottom-left → top-right', `bl ${bl.delay}ms · tr ${tr.delay}ms`)
    check(people.every((p) => p.delay + p.delayOut === Math.max(...delays)),
      'the collapse delay is the mirror of the fold delay',
      `0+${Math.max(...delays)} … ${Math.max(...delays)}+0`)

    s = await playFold('open', 1500)
    {
      const frames = deckFrames(s)
      check(frames.length > 20, 'the open fold was sampled', `${frames.length} frames`)
      check(frames.every((f) => f.drawer === 'none'),
        'stagger: the rail’s OWN box never moves (the outer translate is off in this shape)',
        transitions(frames, 'drawer').join(' | '))
      check(frames.every((f) => f.zoom === 'none'), 'stagger: the group never scales as a block')
      check(frames.some((f) => f.anim === 'in'), 'stagger: the deck reports itself mid-fold',
        transitions(frames, 'anim').join(' → '))
      const moving = frames.map((f) => f.cards.filter((c) => c !== '').length)
      const peak = Math.max(...moving)
      check(peak >= 3, 'stagger: several cards are genuinely in motion at once', `peak ${peak} of ${frames[0].cards.length}`)
      const worst = Math.max(...frames.flatMap((f) => f.cards.map(MAG)))
      check(worst >= 200, 'stagger: the cards really travel the group’s distance, not a corner drift',
        `max ${worst.toFixed(0)}px (the zoom travel is ${anchorCfg.travel}px)`)
      // Order is measured as PROGRESS through the group's own map — read off the
      // SCALE, which is the same monotone proxy for every card (a raw magnitude is
      // not: each card sits at a different distance from the shared anchor).
      const progressAt = (f, k) => {
        const t = f.cards[k]
        if (t === '') return 1
        const sc = SCALE(t)
        return sc === null ? null : (sc - anchorCfg.scale) / (1 - anchorCfg.scale)
      }
      const byDelay = delays.map((d, i) => ({ d, i })).sort((a, b) => a.d - b.d)
      const third = Math.max(1, Math.floor(delays.length / 3))
      const lowIdx = byDelay.slice(0, third).map((x) => x.i)
      const highIdx = byDelay.slice(-third).map((x) => x.i)
      const meanOf = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length)
      const groupsAt = (f) => {
        const prog = f.cards.map((_, k) => progressAt(f, k))
        return { lo: meanOf(lowIdx.map((i) => prog[i]).filter((v) => v !== null)), hi: meanOf(highIdx.map((i) => prog[i]).filter((v) => v !== null)) }
      }
      const midFold = frames.find((f) => f.t >= frames[0].t + anchorCfg.groupMs * 0.4) ?? frames[frames.length - 1]
      const order = groupsAt(midFold)
      check(order.lo !== null && order.hi !== null && order.lo > order.hi + 0.15,
        'stagger: the first ranks are ahead of the last ones mid-fold',
        `first third ${order.lo === null ? 'n/a' : order.lo.toFixed(2)} vs last third ${order.hi === null ? 'n/a' : order.hi.toFixed(2)} at ${midFold.t}ms`)
      const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t)
      const worstGap = Math.max(...gaps)
      // The fold's own span: the deck STAYS mounted after an open, so the last
      // sampled frame is not the end of the motion — the fold marker is.
      const folding = frames.filter((f) => f.anim !== null)
      const span = folding.length === 0 ? 0 : folding[folding.length - 1].t - frames[0].t
      // ── THE TOLERANCE IS A FIXED COMMIT TAIL, NOT A MULTIPLE OF THE FRAME GAP ──
      // The marker's lifetime is not exactly the fold's: `data-deck-anim` is set in the layout
      // effect and cleared in the cascade's settle handler, which lands in a React commit — one
      // to several frames AFTER the fold's own clock ends. The old tolerance was
      // `max(45, worstGap · 2.5)`, which made the check pass on a JITTERY run and fail on a
      // smooth one: measured 2026-10-03, 353ms passed with a worst gap of 36ms while 358ms
      // FAILED with a worst gap of 19ms. Every run recorded on this stage (before and after the
      // compositing hint) measured 353–371ms against the 300ms group, so the span itself is
      // stable — only the criterion was noise-driven. A real regression (a fold that outlasts
      // the gesture by a third) still fails.
      const tailAllowance = 90
      check(span <= anchorCfg.groupMs + tailAllowance && span >= anchorCfg.groupMs - Math.max(45, worstGap * 2.5),
        'stagger: the fold lasts the GROUP’s own transition (not longer)',
        `${span}ms vs ${anchorCfg.groupMs}ms (--ds-transition-duration-slow) + ≤${tailAllowance}ms settle commit · ${frames.length} frames · worst gap ${worstGap}ms`)
      const settled = frames[frames.length - 1]
      check(settled.anim === null && settled.cards.every((c) => c === ''),
        'stagger: the fold ends with no marker and no leftover transform',
        `anim ${settled.anim} · ${settled.cards.filter((c) => c !== '').length} transforms left`)
    }
    await page.screenshot({ path: path.join(OUT, 'stagger-open.png') })

    // ══ B2. the path IS the group's path — checked per card, per frame ══════
    {
      // A fresh open, sampled frame by frame for the participants' boxes. The
      // resting boxes are taken AFTERWARDS, on the SAME deck instance: closing the
      // rail destroys it, and a re-opened deck is a different set of DOM nodes (so
      // the identity-keyed comparison below would have nothing to match).
      await setRail(false)
      // Slow the shell's own variable for THIS measurement pass only: the fold reads
      // it, so a 4× timeline both makes the still readable (a screenshot costs more
      // than the whole 300ms gesture) and quadruples the per-frame samples of the
      // map. The map is duration-independent, so nothing below changes meaning.
      await page.evaluate(() => document.documentElement.style.setProperty('--ds-transition-duration-slow', '1.2s'))
      // ── THE SAMPLER HAS TO CATCH THE FOLD'S FIRST FRAMES ──
      // `frames[0]` is what "the fold STARTS on the group's map" is checked against, and a
      // machine under load drops the first frames of a click-driven fold: measured
      // 2026-10-03, the same build passes with `worst 0.00px` on a quiet run and fails with
      // `worst 201.47px` when the sampler's first mid-fold frame lands ~200ms in — the check
      // was reading a mid-fold frame and calling it the start. So the fold is DRIVEN UP TO
      // THREE TIMES and the attempt whose first mid-fold frame is earliest wins. The
      // assertion itself is unchanged; if no attempt catches the start, its detail line says
      // which frame it had to judge.
      let sampled = null
      let firstT = Infinity
      let attempts = 0
      for (let attempt = 0; attempt < 3; attempt++) {
        attempts = attempt + 1
        await setRail(false)
        await armRectSampler(4600)
        await capsule().click({ timeout: 10000 })
        await page.waitForTimeout(700)
        if (attempt === 0) await page.screenshot({ path: path.join(OUT, 'stagger-mid.png') })
        await page.waitForTimeout(3600)
        const pass = await page.evaluate(() => window.__rects)
        const f = pass.filter((x) => x.anim !== null)
        const t = f.length === 0 ? Infinity : f[0].t
        if (sampled === null || t < firstT) { sampled = pass; firstT = t }
        if (t <= 200 && f.length > 8) break
      }
      await page.evaluate(() => document.documentElement.style.removeProperty('--ds-transition-duration-slow'))
      const rest = await restingRects()
      const frames = sampled.filter((f) => f.anim !== null)
      check(rest !== null && rest.rects.length > 1 && frames.length > 5,
        'the fold was sampled with the resting boxes it must land on',
        `${sampled.length} sampled frame(s), ${frames.length} mid-fold, ${rest === null ? 0 : rest.rects.length} participants`)
      const byId = new Map(rest === null ? [] : rest.ids.map((id, k) => [id, rest.rects[k]]))

      // 1. The START state must BE the group's affine map of the resting box:
      //    p' = O + s0·(p − O) + (travel, 0), with O the wrapper's own corner.
      const first = frames[0]
      let worstStart = 0
      let startChecked = 0
      let startOutside = 0
      if (first !== undefined) {
        for (let k = 0; k < first.ids.length; k++) {
          const fin = byId.get(first.ids[k])
          if (fin === undefined) continue
          const ex = anchorCfg.originX + anchorCfg.scale * (fin[0] - anchorCfg.originX) + anchorCfg.travel
          const ey = anchorCfg.originY + anchorCfg.scale * (fin[1] - anchorCfg.originY)
          worstStart = Math.max(worstStart, Math.abs(first.rects[k][0] - ex), Math.abs(first.rects[k][1] - ey))
          startChecked++
          if (first.rects[k][0] > anchorCfg.railRight) startOutside++
        }
      }
      check(startChecked > 0 && worstStart <= 1.5,
        'the fold STARTS on the group’s map, edge for edge (≤1.5px)',
        `${startChecked} cards · worst ${worstStart.toFixed(2)}px · first frame at ${firstT}ms · ${attempts} fold attempt(s)${attempts > 1 ? ' — an earlier sample landed too late to be the start' : ''}`)
      check(startChecked > 0 && startOutside === startChecked,
        'the anchor really is OFF the screen: every card starts beyond the rail’s right edge',
        `${startOutside}/${startChecked} start with left > ${anchorCfg.railRight}`)

      // 2. Every intermediate frame must satisfy the same map for the (s, travel)
      //    that frame's progress implies — s rides the ZOOM curve, travel the
      //    POSITION curve, exactly as they do for the whole group.
      const ez = bezierOf(anchorCfg.zoomCurve)
      const es = bezierOf(anchorCfg.shiftCurve)
      let worstMid = 0
      let midSamples = 0
      let worstAt = ''
      // The POSITION term of that map, `travel·(1 − es(p))`, is the whole spring
      // settle: it is 0 at the seat and NEGATIVE after the curve's peak clears 1, so
      // the deepest value here is how far past its own seat a card travelled — the
      // per-card copy of the group's overshoot, on the card's OWN path (the term is
      // the same for every card because they share one travel, exactly as
      // deck-cascade.ts writes it).
      let deepestShift = 0
      if (ez !== null && es !== null) {
        const invEz = invEase(ez)
        for (const f of frames) {
          for (let k = 0; k < f.ids.length; k++) {
            const fin = byId.get(f.ids[k])
            if (fin === undefined || fin[2] <= 0) continue
            const sc = f.rects[k][2] / fin[2]
            if (!(sc > anchorCfg.scale + 0.02 && sc < 0.985)) continue
            const p = invEz((sc - anchorCfg.scale) / (1 - anchorCfg.scale))
            const shift = anchorCfg.travel * (1 - es(p))
            if (shift < deepestShift) deepestShift = shift
            const ex = anchorCfg.originX + sc * (fin[0] - anchorCfg.originX) + anchorCfg.travel * (1 - es(p))
            const ey = anchorCfg.originY + sc * (fin[1] - anchorCfg.originY)
            const err = Math.max(Math.abs(f.rects[k][0] - ex), Math.abs(f.rects[k][1] - ey))
            if (err > worstMid) {
              worstMid = err
              worstAt = `t ${f.t}ms · scale ${sc.toFixed(3)} · p ${p.toFixed(3)}`
            }
            midSamples++
          }
        }
      }
      check(midSamples >= 20 && worstMid <= 1.5,
        'every intermediate frame rides the same map (scale on the zoom curve, travel on the position curve)',
        `${midSamples} card-frames · worst ${worstMid.toFixed(2)}px (${worstAt})`)
      // 2b. …and that map really OVERSHOOTS the seat by the requested amount: the
      //     same assertion the group gets in the 'zoom' shape, made through the
      //     card's own position term. This is what tells "the settle is live in the
      //     default shape" from "the fold is a plain eased slide".
      const foldBounce = await readPrefNumber('animBounce')
      const foldAsked = anchorCfg.travel * foldBounce
      check(foldAsked > 0 && deepestShift <= -foldAsked * 0.6 && deepestShift >= -foldAsked * 1.4,
        'stagger: each card travels past its own seat by prefs.animBounce and springs back (the settle)',
        `deepest position term ${deepestShift.toFixed(2)}px vs the requested ${(-foldAsked).toFixed(2)}px (animBounce ${foldBounce})`)
      // ── …and how far that takes a card past the RAIL's own left edge ──
      // The position term goes NEGATIVE past the curve's peak, so every card travels a little
      // past its seat toward the rail's left edge while the SCALE term is still pulling it
      // right by `(1 − s)·vx`. The rail is a scroll container (`overflow-y: auto` forces
      // `overflow-x: auto` on the same box), so a card that wins that tug-of-war by more than
      // the rail's own padding is sliced with a hard vertical edge for the frames it is out
      // there. Whether that is acceptable is a product decision that depends on the pref —
      // the excursion is `bounce × travel − pad − (1 − s)·vx`, so it grows with the bounce and
      // is fully absorbed by the leftmost column's own `(1 − s)·vx` term at the default — so
      // it is REPORTED rather than asserted. What IS asserted is the bound it can never pass:
      // no card can cross the rail by more than the overshoot budget the pref asks for.
      let worstLeft = 0
      let worstLeftAt = 'nothing crossed'
      for (const f of frames) {
        for (let k = 0; k < f.ids.length; k++) {
          const ex = f.railLeft - f.rects[k][0]
          if (ex > worstLeft) {
            worstLeft = ex
            worstLeftAt = `t ${f.t}ms · card ${k} left ${f.rects[k][0].toFixed(1)} vs rail ${f.railLeft.toFixed(1)}`
          }
        }
      }
      note('the settle’s left excursion past the rail’s border box',
        `${worstLeft.toFixed(1)}px (budget ${foldAsked.toFixed(1)}px = ${(foldBounce * 100).toFixed(0)}% × ${anchorCfg.travel}px travel) · ${worstLeftAt}`)
      check(worstLeft <= foldAsked + 1, 'the leftward excursion can never exceed the overshoot budget (bounce × travel)',
        `${worstLeft.toFixed(1)}px ≤ ${foldAsked.toFixed(1)}px`)

      // 3. …and the fold ENDS on the resting boxes exactly, with nothing written.
      const settled = await page.evaluate(() => {
        const wrap = document.querySelector('.dsx-wave-deck')
        const deck = wrap === null ? null : wrap.firstElementChild
        if (deck === null) return null
        const nodes = Array.from(deck.querySelectorAll('.dsx-stats-card-slot, .dsx-stats-add'))
        return { ids: nodes.map((el) => el.__rid), written: nodes.filter((el) => el.style.transform !== '').length }
      })
      let worstEnd = 0
      // The LAST sampled frame — i.e. after the marker cleared, so this proves the
      // deck really came to rest where it should rather than merely stopping.
      const endFrame = sampled[sampled.length - 1]
      for (let k = 0; k < endFrame.ids.length; k++) {
        const fin = byId.get(endFrame.ids[k])
        if (fin === undefined) continue
        worstEnd = Math.max(worstEnd, Math.abs(endFrame.rects[k][0] - fin[0]), Math.abs(endFrame.rects[k][1] - fin[1]))
      }
      check(settled !== null && settled.written === 0 && worstEnd <= 1,
        'and it lands on the resting boxes with nothing left written',
        `worst ${worstEnd.toFixed(2)}px · ${settled === null ? '?' : settled.written} transform(s) left`)
      await page.screenshot({ path: path.join(OUT, 'stagger-settled.png') })
    }

    // ══ C. 'stagger' close: the mirror, and the RETIREMENT rides the fold ══════
    {
      s = await playFold('close', 1800)
      const frames = deckFrames(s)
      const retiredFrame = s.find((f) => f.retired)
      const unmounted = s.find((f) => !f.mounted)
      // The same timeline as the open, and the same as the group's transition.
      const total = anchorCfg.groupMs
      const lastFrame = frames[frames.length - 1]
      const tail = frames.slice(-2)
      check(frames.some((f) => f.anim === 'out'), 'close: the deck reports the retracting fold',
        transitions(frames, 'anim').join(' → '))
      check(frames.every((f) => f.drawer === 'none'), 'close: the rail’s own box still never moves')
      check(retiredFrame !== undefined, 'close: the drawer is retired (hidden)',
        retiredFrame === undefined ? 'never retired' : `at ${retiredFrame.t}ms`)
      // THE POINT OF THE KEEP-MOUNT: the deck stays in the DOM. Unmounting it is what made
      // every open rebuild 13 chart cards (~285ms, measured on the owner's stage).
      check(unmounted === undefined, 'close: the drawer is NOT unmounted (the deck stays resident for the next open)',
        unmounted === undefined ? 'mounted for the whole window' : `unmounted at ${unmounted.t}ms`)
      const started = frames.findIndex((f) => f.anim === 'out')
      const folded = started >= 0 ? frames[frames.length - 1].t - frames[started].t : -1
      check(retiredFrame !== undefined && retiredFrame.t >= total - 40,
        'close: the drawer is not retired before the fold has finished',
        `${retiredFrame === undefined ? '?' : retiredFrame.t}ms ≥ ${total}ms`)
      check(retiredFrame !== undefined && retiredFrame.t <= total + 400, 'close: and it does not linger after it',
        `${retiredFrame === undefined ? '?' : retiredFrame.t}ms ≤ ${total + 400}ms`)
      check(lastFrame.anim === 'out' || tail.every((f) => f.cards.some((c) => c !== '')),
        'close: the deck is retired while still holding the retracted fold (no reset frame)',
        `transforms on the last two deck frames: ${tail.map((f) => f.cards.filter((c) => c !== '').length).join(', ')} · anim ${tail.map((f) => f.anim).join(',')}`)
      const firstMove = frames.findIndex((f) => f.cards.some((c) => c !== ''))
      if (firstMove >= 0) {
        // Same PROGRESS measure as the open, on the retract this time.
        const travelC = frames[0].cards.map((_, k) => Math.max(...frames.map((f) => MAG(f.cards[k]))))
        const byDelayC = delays.map((d, i) => ({ d, i })).sort((a, b) => a.d - b.d)
        const thirdC = Math.max(1, Math.floor(delays.length / 3))
        const lowC = byDelayC.slice(0, thirdC).map((x) => x.i)
        const highC = byDelayC.slice(-thirdC).map((x) => x.i)
        const meanC = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length)
        // The snapshot to compare at is the fold's OWN midpoint, not a fixed number of
        // milliseconds into it: the close's first frames are scheduling-dependent (a busy
        // machine can deliver the first transformed frame 60ms late), and a time-anchored
        // snapshot then lands almost before anything has moved — measured 2026-10-02 on an
        // otherwise green run: at a fixed +40% of the group's transition the two thirds
        // read 0.13 vs 0.01, i.e. the SAME order, just 120ms too early to show it. Anchoring
        // on the progress milestone makes the check independent of when the sampler caught
        // the fold, while still failing outright if the mirror order is gone.
        const bar = frames.slice(firstMove)
        const meanAt = (f) => {
          const vals = f.cards.map((c, k) => (travelC[k] < 12 ? null : MAG(c) / travelC[k])).filter((v) => v !== null)
          return meanC(vals)
        }
        let early = bar[bar.length - 1]
        let bestGap = Infinity
        for (const f of bar) {
          const m = meanAt(f)
          if (m === null) continue
          const gap = Math.abs(m - 0.5)
          if (gap < bestGap) { bestGap = gap; early = f }
        }
        const retract = early.cards.map((c, k) => (travelC[k] < 12 ? null : MAG(c) / travelC[k]))
        const hi = meanC(highC.map((i) => retract[i]).filter((v) => v !== null))
        const lo = meanC(lowC.map((i) => retract[i]).filter((v) => v !== null))
        check(hi !== null && lo !== null && hi > lo + 0.2,
          'close: the collapse retracts in the MIRROR order (the last ranks leave first)',
          `last third ${hi === null ? 'n/a' : hi.toFixed(2)} vs first third ${lo === null ? 'n/a' : lo.toFixed(2)} at ${early.t}ms`)
      } else {
        check(false, 'close: the retracting fold was visible', 'no frame carried a transform')
      }
      note('close timeline', `${frames.length} deck frames, fold ran ~${folded}ms, retired at ${retiredFrame === undefined ? '?' : retiredFrame.t}ms (total ${total}ms) · still mounted`)
    }

    // ══ D. a rapid reversal stays continuous ════════════════════════════════
    // Run TWICE: the race this exercises (the close bottoming out in the very
    // frame the re-open is issued) is timing-dependent, and one pass is not a
    // sample of it.
    for (const round of [1, 2]) {
      await setRail(false)
      await armSampler(2600)
      // `page.mouse.click` rather than the locator's: a locator click spends 40–150ms
      // on actionability checks, which is most of a 300ms fold — the close could
      // BOTTOM OUT before the re-open was ever dispatched, and the round then tested
      // a finished close plus a fresh open instead of a reversal. The capsule's box
      // is stable (it is the toggle's home), so a raw pointer click is exact.
      // Re-read the capsule's box for every tap: the composer can shift under it
      // (a busy line, another writer driving this GUI), and a stale box sends the
      // click into empty space — which looked exactly like "the close never ran".
      const tap = async () => {
        const box = await capsule().boundingBox()
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      }
      await tap()                                // open
      const opened = await waitFoldPhase('in', 600)
      // Let the open get WELL UNDER WAY before interrupting it: a tap at the very
      // first frame leaves the clock so close to 0 that the close bottoms out
      // before the next tap can even be dispatched — measured as the deck being
      // retired and rebuilt, i.e. a finished close plus a fresh open, which is not
      // the case this round exists to test.
      await page.waitForTimeout(Math.round(anchorCfg.groupMs * 0.35))
      await tap()                                // …interrupted by a close
      const closing = await waitFoldPhase('out', 600)
      await tap()                                // …and back again
      const reopened = await waitFoldPhase('in', 600)
      check(opened && closing && reopened, 'all three taps landed while a fold was live',
        `open ${opened} · close ${closing} · re-open ${reopened}`)
      await page.waitForTimeout(2800)
      s = await readSamples()
      const frames = deckFrames(s)
      // Continuity is only meaningful WITHIN one deck NODE: a frame pair that
      // straddles a remount is two different decks and says nothing about either.
      let deckSwaps = 0
      let worst = 0
      let worstDt = 0
      let worstAt = ''
      let worstIndex = -1
      let worstCard = -1
      for (let i = 1; i < s.length; i++) {
        const prev = s[i - 1]
        const cur = s[i]
        // Only the SAME deck node is the same fold: a close that completes and a
        // later re-open are two gestures, and the gap between them is not a
        // discontinuity of either. Count those, do not hide them.
        if (prev.deckId !== cur.deckId && !(prev.deckId === null && cur.deckId === null)) deckSwaps++
        if (prev.deckId === null || cur.deckId === null || prev.deckId !== cur.deckId) continue
        const before = new Map(prev.cardIds.map((id, k) => [id, MAG(prev.cards[k])]))
        // How long the fold was given to make this move. The fold writes its
        // transforms inside its own rAF callback and this sampler reads the DOM in
        // ITS callback, in the same frame — which of the two runs first depends on
        // registration order, so an observed pair of states may have been produced
        // by the current frame's step or by the previous one. The honest bound is
        // therefore the LARGER of the two adjacent frame gaps.
        const gapBefore = i >= 2 ? prev.t - s[i - 2].t : 0
        const dt = Math.max(cur.t - prev.t, gapBefore)
        for (let k = 0; k < cur.cards.length; k++) {
          const was = before.get(cur.cardIds[k])
          if (was === undefined) continue
          const step = Math.abs(MAG(cur.cards[k]) - was)
          if (step > worst) {
            worst = step
            worstDt = dt
            worstCard = k
            worstIndex = i
            worstAt = `delay ${cur.delays[k]}ms at ${cur.t}ms: ${was.toFixed(0)}px → ${MAG(cur.cards[k]).toFixed(0)}px`
          }
        }
      }
      // The bound has to be the cards' OWN travel (the group's, ~600px here), not a
      // constant: this shape deliberately moves each card as far as the whole group
      // moves.
      const gestureTravel = Math.max(0, ...frames.flatMap((f) => f.cards.map(MAG)))
      // ── SELF-CALIBRATED, not a fixed multiplier ──
      // The invariant is "a reversal CONTINUES from where the card is", so the
      // reversal can never move a card faster than the forward fold does: it is the
      // same timeline on the same two curves, read the other way. The former
      // analytic bound (`travel × dt/220 × 3`) was tuned to the pre-bounce shift
      // curve, whose steepest point is at the START; folding the spring settle into
      // that curve (`prefs.animBounce` — `y1` raised until the peak clears 1, see
      // prefs.ts's `overshootCurve`) moves the steepest point to the middle, and a
      // fixed multiplier then reads a legitimate fast middle frame as a jump
      // (measured 2026-10-02: 319.9px over 34ms against a 302.3px bound, while
      // every single frame of that same fold sat on the group's map to 0.09px — see
      // the pixel-conformance check below). Taking the forward fold's own peak speed
      // as the reference is what makes the bound independent of the curve: a forward
      // fold that jumped would already fail the map check, and a reversal that
      // teleports is orders of magnitude above anything the curve can produce.
      const speeds = []
      for (let i = 1; i < s.length; i++) {
        const prev = s[i - 1]
        const cur = s[i]
        if (prev.deckId === null || cur.deckId === null || prev.deckId !== cur.deckId) continue
        if (cur.anim === null) continue
        const dt = Math.max(cur.t - prev.t, i >= 2 ? prev.t - s[i - 2].t : 0, 1)
        const before = new Map(prev.cardIds.map((id, k) => [id, MAG(prev.cards[k])]))
        for (let k = 0; k < cur.cards.length; k++) {
          const was = before.get(cur.cardIds[k])
          if (was === undefined) continue
          speeds.push({ dir: cur.anim, v: Math.abs(MAG(cur.cards[k]) - was) / dt })
        }
      }
      const firstOut = speeds.findIndex((p) => p.dir === 'out')
      const peakOf = (list) => list.reduce((m, p) => Math.max(m, p.v), 0)
      const forwardPeak = peakOf(firstOut < 0 ? speeds : speeds.slice(0, firstOut))
      const reversePeak = firstOut < 0 ? 0 : peakOf(speeds.slice(firstOut))
      const allowed = Math.max(forwardPeak * 1.35, 2) + 0.5
      check(reversePeak <= allowed, `round ${round}: a reversal never moves a card faster than the forward fold does (it resumes from its current position)`,
        `reversal peak ${reversePeak.toFixed(2)}px/ms ≤ ${allowed.toFixed(2)}px/ms (forward ${forwardPeak.toFixed(2)}px/ms · travel ${gestureTravel.toFixed(0)}px · worst step ${worst.toFixed(1)}px over ${worstDt}ms: ${worstAt})`)
      check(deckSwaps <= 1, `round ${round}: the deck was NEVER unmounted — the reversal happened with the fold still in flight`,
        `${deckSwaps} deck node change(s)`)
      if (worstIndex >= 1) {
        note(`round ${round} · worst step context (t · style writes · anim · the card)`,
          JSON.stringify(s.slice(Math.max(0, worstIndex - 3), worstIndex + 2).map((f) => ({
            t: f.t, w: f.w, anim: f.anim, card: f.cards[worstCard], delay: f.delays[worstCard],
          }))))
      }
      check(frames.some((f) => f.anim === 'in') && frames.some((f) => f.anim === 'out'),
        `round ${round}: both directions were really commanded`, transitions(frames, 'anim').join(' → '))
      const last = frames[frames.length - 1]
      check(last.anim === null && last.cards.every((c) => c === ''),
        `round ${round}: the interrupted fold still settles and leaves nothing behind`,
        `anim ${last.anim} · ${last.cards.filter((c) => c !== '').length} transforms`)
      check(await railMounted(), `round ${round}: the rail is left OPEN after the interruption, as the last click asked`)
    }

    // ══ E. a mode switch (through the real 设置 panel) leaves no residue ════
    {
      const panelOpen = () => page.evaluate(() => document.querySelector('.dsx-stats-addpanel.open') !== null)
      const openPanel = async () => {
        if (await panelOpen()) return true
        const box = await page.locator('.dsx-wave-deck .dsx-stats-add').first().boundingBox().catch(() => null)
        if (box === null) return false
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(320)
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(600)
        if (await panelOpen()) {
          await page.locator('.dsx-stats-addpanel .dsx-tab', { hasText: '组件设置' }).first().click().catch(() => {})
          await page.waitForTimeout(400)
        }
        return panelOpen()
      }
      await setRail(true)
      check(await openPanel(), 'the settings panel opens')
      // ── The spring settle's only UI ──
      // `回弹幅度` is a Stepper (like every other numeric row), so what the user sees is
      // `.dsx-stepper-value`. Asserting the RENDERED number against the stored pref is
      // what catches a row that is wired to the wrong field — a "0%" pill next to a fold
      // that still overshoots by 4% is exactly the failure that reads as "the setting
      // does nothing".
      const bounceRow = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-set-group > div'))
        // Match the row's TITLE, not its whole text: the 位移曲线 row's description now
        // names 回弹幅度 (it has to — that row explains which ordinate the bounce owns), so
        // a `textContent.includes` match finds the WRONG row. The title is the row's first
        // text div, the same one `verify-rail-rework.cjs` audits controls by.
        const row = rows.find((r) => ((r.querySelector(':scope > div > div') || {}).textContent || '').trim() === '回弹幅度')
        if (row === undefined) return null
        const pill = row.querySelector('.dsx-stepper-value')
        return { shown: pill === null ? null : (pill.textContent || '').trim(), unit: (row.textContent || '').includes('%') }
      })
      const bounceStored = await readPrefNumber('animBounce')
      check(bounceRow !== null && bounceRow.shown === String(Math.round(bounceStored * 100)) && bounceRow.unit,
        'the 回弹幅度 row is rendered and its pill shows the stored prefs.animBounce',
        `${JSON.stringify(bounceRow)} vs animBounce ${bounceStored} (${Math.round(bounceStored * 100)}%)`)
      // ── …and the RANGE it offers is real, walked from the UI ──
      // The row's max is the ceiling the curve solver is validated against
      // (`MAX_ANIM_BOUNCE`), so it is worth proving end to end instead of reading it off the
      // source: click the pill's arrow up past the ceiling and the value must STOP there
      // (a row wired to a different max would keep climbing, and the solver would then be
      // running outside the band `verify-anim-curve-unit.mjs` checks). Down to the floor
      // afterwards, and back to the owner's own value, so the probe leaves nothing behind.
      const arrowWalk = (up, times) => page.evaluate(async ([up, times]) => {
        const row = () => Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-set-group > div'))
          .find((r) => ((r.querySelector(':scope > div > div') || {}).textContent || '').trim() === '回弹幅度')
        const pill = () => {
          const r = row()
          const p = r === null ? null : r.querySelector('.dsx-stepper-value')
          return p === null ? null : (p.textContent || '').trim()
        }
        const arrow = () => {
          const r = row()
          if (r === null) return null
          const btns = Array.from(r.querySelectorAll('.dsx-stepper-arrows button'))
          return up ? (btns[0] ?? null) : (btns[1] ?? null)
        }
        const seen = []
        for (let i = 0; i < times; i++) {
          const a = arrow()
          if (a === null || a.disabled) break
          a.click()
          await new Promise((res) => setTimeout(res, 60))
          seen.push(pill())
        }
        return { end: pill(), steps: seen.length, tail: seen.slice(-3) }
      }, [up, times])
      const top = await arrowWalk(true, 40)
      check(top.end === '20', 'the 回弹幅度 row can be walked up to its 20% ceiling and stops there',
        `${top.steps} step(s) → ${JSON.stringify(top.tail)}`)
      const floor = await arrowWalk(false, 40)
      check(floor.end === '0', 'and down to 0%, where it stops', `${floor.steps} step(s) → ${floor.end}`)
      // Back to the owner's own value: the floor is 0 and the step is 1%, so N clicks up.
      // A controlled stepper can swallow a click while a prefs write is in flight, so the
      // restore corrects itself against the pill rather than trusting the count.
      const target = Math.round(bounceStored * 100)
      let restoredPill = await arrowWalk(true, target)
      for (let i = 0; i < 6 && restoredPill.end !== String(target); i++) {
        const diff = target - Number(restoredPill.end)
        restoredPill = await arrowWalk(diff > 0, Math.abs(diff))
      }
      check(restoredPill.end === String(target), 'the owner’s own 回弹幅度 is put back',
        `pill ${restoredPill.end} vs ${target}%`)
      const inspect = () => page.evaluate(() => {
        const wrap = document.querySelector('.dsx-wave-deck')
        const deck = wrap === null ? null : wrap.firstElementChild
        const drawer = document.querySelector('.dsx-stats-drawer')
        const nodes = deck === null ? [] : Array.from(deck.querySelectorAll('.dsx-stats-card-slot, .dsx-stats-add'))
        let stored = null
        try { stored = JSON.parse(localStorage.getItem('harness-widgets.state') || '{}').openShape } catch { /* ignore */ }
        return {
          stored,
          anim: deck === null ? null : deck.getAttribute('data-deck-anim'),
          transforms: nodes.filter((el) => el.style.transform !== '').length,
          overridden: nodes.filter((el) => el.style.transition !== '').length,
          drawer: drawer === null ? null : getComputedStyle(drawer).transform,
          rail: document.querySelector('.dsx-stats-drawer:not([data-retired]) .dsx-stats-rail') !== null,
          panel: document.querySelector('.dsx-stats-addpanel.open') !== null,
        }
      })
      const flip = async (label, expect) => {
        await openPanel()
        const select = page.locator('.dsx-stats-addpanel .dsx-set-group > div').filter({ hasText: '展开方式' }).first().locator('.dsx-select')
        await select.click({ timeout: 10000 })
        await page.waitForTimeout(350)
        await page.getByRole('menuitem', { name: label }).click({ timeout: 10000 })
        await page.waitForTimeout(650)
        const after = await inspect()
        check(after.stored === expect, `the 展开方式 picker really switched to “${label}”`, String(after.stored))
        return after
      }
      const zoomed = await flip('整体缩放', 'zoom')
      check(zoomed.anim === null && zoomed.transforms === 0 && zoomed.overridden === 0,
        'switching stagger → zoom leaves no marker, no transform and no stale style', JSON.stringify(zoomed))
      check(zoomed.rail, 'the drawer survives the switch (it is a shape change, not a close)')
      const back = await flip('逐个落入（手风琴）', 'stagger')
      check(back.anim === null && back.transforms === 0 && back.overridden === 0,
        'switching zoom → stagger does NOT replay the fold and leaves nothing behind', JSON.stringify(back))
      await page.locator('.dsx-stats-addpanel-close').first().click().catch(() => {})
      await page.waitForTimeout(400)
    }

    // ══ F. prefers-reduced-motion ═══════════════════════════════════════════
    {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await applyPrefs({ openShape: 'stagger' }, false)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      s = await playFold('open', 900)
      const frames = s.filter((f) => f.mounted)
      check(frames.length > 2, 'reduced motion: the drawer still opens', `${frames.length} frames`)
      check(frames.every((f) => f.anim === null), 'reduced motion: the fold never runs',
        transitions(frames, 'anim').filter((a) => a !== null).join(','))
      check(frames.every((f) => f.cards.every((c) => c === '')), 'reduced motion: no card is ever offset')
      check(frames.every((f) => f.drawer === 'none'), 'reduced motion: no group transform either')
      await armSampler(600)
      await capsule().click({ timeout: 10000 })
      await page.waitForTimeout(700)
      const close = await readSamples()
      const retiredAt = close.find((f) => f.retired)
      check(retiredAt !== undefined && retiredAt.t < 250, 'reduced motion: closing does not wait for an animation',
        retiredAt === undefined ? 'never retired' : `${retiredAt.t}ms`)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    }

    // ══ G. card counts ══════════════════════════════════════════════════════
    {
      // The deck's size is capped by `columns × maxRows`, and a 1-column deck
      // cannot seat the 2×4 tiles at all — so the column preference is what
      // changes how many cards the fold actually has to order.
      const counts = []
      for (const cols of [1, 2, 4]) {
        await page.setViewportSize({ width: cols === 4 ? 1920 : 1578, height: 1000 })
        await page.waitForTimeout(500)
        await applyPrefs({ openShape: 'stagger', columns: cols }, true)
        const group = await participants()
        const ds = group.map((p) => p.delay)
        const sortedG = ds.slice().sort((a, b) => a - b)
        const stepG = sortedG[1] - sortedG[0]
        const ladder = stepG > 0 && sortedG.every((v, i) => Math.abs(v - i * stepG) < 0.03)
        counts.push(group.length)
        check(group.length > 1 && new Set(ds).size === ds.length && ladder,
          `with 最多列数 ${cols} the fold has ${group.length} beats, every one its own delay`,
          `${new Set(ds).size} distinct of ${group.length}, step ${stepG.toFixed(2)}ms, max ${Math.max(...ds)}ms`)
        const frames = deckFrames(await playFold('open', 1500))
        const peak = Math.max(0, ...frames.map((f) => f.cards.filter((c) => c !== '').length))
        check(peak >= Math.min(3, group.length), `with 最多列数 ${cols} the fold is visible`, `peak ${peak} cards in motion`)
      }
      check(new Set(counts).size > 1, 'the three runs really exercised different card counts',
        counts.join(', '))
      await page.setViewportSize({ width: 1578, height: 1000 })
      await page.waitForTimeout(500)
    }

    // ══ H. a live column change during the fold ═════════════════════════════
    {
      // The reflow bob only exists for a COLUMN-COUNT change. With 最多列数 = 4 the
      // auto-fill resolves 3 columns at 1578px and 4 at 1920px, which is the one
      // resize that really re-seats the deck — shown, not assumed, below.
      const gridAt = async (w) => {
        await page.setViewportSize({ width: w, height: 1000 })
        await page.waitForTimeout(800)
        return page.evaluate(() => {
          const wrap = document.querySelector('.dsx-wave-deck')
          const deck = wrap === null ? null : wrap.firstElementChild
          if (deck === null) return null
          const cards = Array.from(deck.querySelectorAll('.dsx-stats-card-slot')).map((el) => {
            const r = el.getBoundingClientRect()
            return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width) }
          })
          if (cards.length === 0) return { cols: 0, rows: 0, side: 0 }
          const top0 = Math.min(...cards.map((c) => c.top))
          const cols = new Set(cards.filter((c) => c.top === top0).map((c) => c.left)).size
          return { cols, rows: new Set(cards.map((c) => c.top)).size, side: Math.max(...cards.map((c) => c.w)) }
        })
      }
      const armWaveWatch = (ms) => page.evaluate((ms) => {
        window.__wave = false
        const wrap = document.querySelector('.dsx-wave-deck')
        const t0 = performance.now()
        const step = () => {
          if (wrap !== null && wrap.classList.contains('dsx-wave-run')) window.__wave = true
          if (performance.now() - t0 < ms) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }, ms)

      await page.setViewportSize({ width: 1920, height: 1000 })
      await page.waitForTimeout(500)
      await applyPrefs({ openShape: 'stagger', columns: 4 }, true)
      const wide = await gridAt(1920)
      const narrow = await gridAt(1578)
      check(wide !== null && narrow !== null && wide.cols !== narrow.cols,
        '1920px and 1578px really resolve a DIFFERENT column count (else the gate below proves nothing)',
        `1920px ${JSON.stringify(wide)} · 1578px ${JSON.stringify(narrow)}`)

      // (1) a column change DURING the fold must not arm the bob
      await gridAt(1920)
      await setRail(false)
      await armSampler(2600)
      await capsule().click({ timeout: 10000 })
      await page.waitForTimeout(120)
      await page.setViewportSize({ width: 1578, height: 1000 })
      await page.waitForTimeout(1700)
      s = await readSamples()
      const folding = s.filter((f) => f.anim !== null)
      check(folding.length > 0, 'the fold was live across the column change', `${folding.length} frames`)
      check(folding.every((f) => !/dsx-wave-run/.test(f.phase || '')),
        'a column change during the fold does NOT arm the reflow bob (they share `transform`)',
        folding.map((f) => f.phase).filter((p, i, a) => p !== a[0]).slice(0, 2).join(' | '))

      // (2) with no fold running the bob still fires (nothing was disabled)
      await armWaveWatch(1800)
      await page.setViewportSize({ width: 1920, height: 1000 })
      await page.waitForTimeout(1900)
      const wave = await page.evaluate(() => window.__wave)
      check(wave === true, 'the deck’s reflow wave still runs when no fold is in flight', String(wave))
    }
  } catch (error) {
    failure = error
  } finally {
    try {
      // Two attempts: this profile can be driven by its owner at the same time, and
      // a write that lands between ours wins the boot arbitration.
      let restored = false
      for (let attempt = 0; attempt < 2 && !restored; attempt++) {
        await writeState(original.savedAt || Date.now(), original.state || {})
        await seedLocal(original.savedAt || Date.now(), original.state || {})
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3000)
        if ((await page.locator('.dsx-stats-rail').count()) === 0) {
          const cap = capsule()
          if (await cap.count()) { await cap.click().catch(() => {}); await page.waitForTimeout(1200) }
        }
        const state = await readState()
        restored = JSON.stringify(state.state) === JSON.stringify(original.state)
        if (!restored) {
          // A live profile can be driven by its OWNER while the probe runs; their
          // window writes its in-memory prefs back and wins. What this probe must
          // guarantee is that ITS test state is gone — the three fields it writes.
          const mine = ['openShape', 'columns', 'railOpen']
          restored = mine.every((k) => JSON.stringify(state.state[k]) === JSON.stringify(original.state[k]))
          if (restored) note('the profile changed under the probe (its owner is using it)', `full state differs; ${mine.join('/')} restored`)
        }
      }
      check(restored, 'the owner’s persisted prefs were restored (the fields this probe writes)',
        `openShape ${(await readState()).state.openShape}`)
    } catch (error) {
      check(false, 'the owner’s prefs were restored', String(error))
    }
    if (failure !== null) check(false, 'the probe ran to the end', String(failure))
    if (warns.length > 0) console.log(`WARN  the state route answered 400 ${warns.length}× during teardown (benign — see the note at the collector): ${warns[0]}`)
    check(crashes.length === 0, 'no page errors', crashes.slice(0, 2).join(' | '))
    console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'} — shots in ${OUT}`)
    await browser.close()
    process.exit(fails.length === 0 ? 0 : 1)
  }
})().catch((e) => { console.error(e); process.exit(1) })
