#!/usr/bin/env node
/**
 * dsh-widgets — the transcript's inset during a fold (`scripts/probe-fold-inset.cjs`).
 *
 * WHY THIS EXISTS: the reading column's `padding-right` is the fold's only LAYOUT
 * property. On the shell's shared curve it re-wraps the whole conversation once per
 * frame, and every co-tenant that measures the page reads that layout again inside
 * its own callback — the measured cause of "expanding/collapsing the component area
 * is janky, and so is the conversation's own move" (2026-10-27). Landing it in one
 * step fixed the cost but deleted the move (2026-10-28), so `rail/fold-inset.ts`
 * now lands it once AND pans the transcript pane on the compositor by half the
 * delta. This probe asserts that mechanism, live.
 *
 * WHAT IT ASSERTS, per direction:
 *   - the inset takes at most TWO values across the fold window (start, end) — i.e.
 *     no per-frame tween;
 *   - no `paddingRight` CSS transition is ever RUNNING on the scroll body during the
 *     fold (`getAnimations()`, sampled every frame);
 *   - the transcript pane really moves: its `translateX` starts at ~half the inset
 *     delta (the old position) and comes back to 0 (the new layout) — the motion the
 *     one-step landing would otherwise delete;
 *   - the rail's own box does NOT move: the pan targets the pane, never an ancestor
 *     of the rail's `position: fixed` portal;
 *   - after the fold: `html.dsx-fold-inset` and the pane's transform are gone, so a
 *     right-panel open/close and a width drag keep the shell's curve;
 *   - the frame budget of the window is reported (p50/p95/over-50ms), not asserted.
 *
 * The rail is left OPEN, the state the probe found it in.
 *
 *   DSH_HOME=D:\dsh-home DSH_PORT=49327 node scripts/probe-fold-inset.cjs [--session <name>]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d
}
const SESSION = arg('session', null)
const OUT = path.join(__dirname, '..', '.probe-fold-inset')
const PANE = '[data-slot="conversation.session"] [class$="_viewArea"]'

const pct = (arr, p) => {
  if (arr.length === 0) return 0
  const s = arr.slice().sort((a, b) => a - b)
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(1)
}

/** The x of a `matrix(...)` / `matrix3d(...)` transform, 0 for `none`. */
const translateX = (raw) => {
  if (raw === null || raw === undefined || raw === 'none') return 0
  const m = /matrix(?:3d)?\(([^)]+)\)/.exec(raw)
  if (m === null) return 0
  const parts = m[1].split(',').map((x) => parseFloat(x))
  return parts.length >= 13 ? parts[12] : parts[4]
}

let failures = 0
const check = (ok, name, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${detail}`}`)
  if (!ok) failures += 1
}

/** Per-frame sampler: the inset, the transition's state, the pane's pan, the rail. */
const installSample = () => {
  window.__s = []
  window.__calls = []
  const pane = document.querySelector('[data-slot="conversation.session"] [class$="_viewArea"]')
  const composer = document.querySelector('[data-composer-seat] [data-composer-card]')
  // Record the pan calls themselves: the keyframe shape is deterministic, while a
  // frame-rate sample of a 300ms animation on a loaded stage is not.
  const orig = Element.prototype.animate
  Element.prototype.animate = function (frames, options) {
    try {
      if (this.matches && this.matches('[data-slot="conversation.session"] [class$="_viewArea"]')) {
        window.__calls.push({ who: 'pane', frames, options })
      } else if (this.matches && this.matches('[data-composer-seat] [data-composer-card]')) {
        window.__calls.push({ who: 'composer', frames, options })
      }
    } catch { /* a detached node is not our business */ }
    return orig.call(this, frames, options)
  }
  const t0 = performance.now()
  const tick = () => {
    const s = document.querySelector('[data-conversation-scroll]')
    const cs = s === null ? null : getComputedStyle(s)
    const rail = document.querySelector('.dsx-stats-rail')
    const railRect = rail === null ? null : rail.getBoundingClientRect()
    window.__s.push({
      t: Math.round(performance.now() - t0),
      pad: cs === null ? null : cs.paddingRight,
      transitions: s === null ? 0 : s.getAnimations().filter((a) => a.effect?.getKeyframes?.().some((k) => 'paddingRight' in k)).length,
      instant: document.documentElement.classList.contains('dsx-fold-inset'),
      tx: pane === null ? null : getComputedStyle(pane).transform,
      composerX: composer === null ? null : Math.round(composer.getBoundingClientRect().x),
      railX: railRect === null || railRect.width <= 1 ? null : Math.round(railRect.x),
      deck: document.querySelector('.dsx-wave-deck > div')?.getAttribute('data-deck-anim') ?? null,
    })
    if (performance.now() - t0 < 1200) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** Frame cadence over the fold window (reported, never asserted — host load decides). */
const installFrames = () => {
  const m = { frames: [], t0: performance.now(), last: performance.now() }
  window.__m = m
  const tick = (t) => {
    m.frames.push(t - m.last)
    m.last = t
    if (performance.now() - m.t0 < 1400) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    executablePath: chromePath(),
    headless: false,
    args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
  })
  const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1.5 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))
  await page.goto(`http://${AUTHORITY}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)

  // A conversation with a real transcript is what the inset cost scales with.
  const rows = page.locator('[class*="sessionRow"]')
  let picked = null
  const deadline = Date.now() + 25000
  while (picked === null && Date.now() < deadline) {
    const n = await rows.count()
    for (let i = n - 1; i >= 0 && picked === null; i--) {
      const text = (await rows.nth(i).innerText().catch(() => '')) || ''
      if (SESSION !== null && !text.includes(SESSION)) continue
      if (text.startsWith('新会话')) continue
      await rows.nth(i).click().catch(() => {})
      await page.waitForTimeout(1800)
      const ok = await page.evaluate(() => !!document.querySelector('.dsx-stats-capsule') && (document.querySelector('[data-conversation-scroll]')?.querySelectorAll('*').length ?? 0) > 400)
      if (ok) picked = `row ${i}`
    }
    if (picked === null) await page.waitForTimeout(800)
  }
  if (picked === null) {
    console.log('FAIL  a session with a transcript could not be opened')
    await browser.close()
    process.exit(1)
  }

  const isOpen = () => page.evaluate(() => document.body.classList.contains('dsx-stats-active'))
  const toggle = () => page.evaluate(() => document.querySelector('.dsx-stats-capsule').click())
  const ensure = async (want) => { if ((await isOpen()) !== want) { await toggle(); await page.waitForTimeout(1400) } }
  const info = await page.evaluate(() => {
    const s = document.querySelector('[data-conversation-scroll]')
    return { nodes: s?.querySelectorAll('*').length ?? -1, cards: document.querySelectorAll('.dsx-stats-card').length }
  })
  console.log(`[fold-inset] session ${picked} · ${info.nodes} transcript nodes · ${info.cards} cards`)

  const report = { at: new Date().toISOString(), authority: AUTHORITY, session: picked, ...info, dirs: {}, errors }
  for (const dir of ['close', 'open']) {
    await ensure(dir === 'close')
    await page.waitForTimeout(500)
    const before = await page.evaluate(() => getComputedStyle(document.querySelector('[data-conversation-scroll]')).paddingRight)
    await page.evaluate(installSample)
    await page.evaluate(installFrames)
    await toggle()
    await page.waitForTimeout(1250)
    const samples = await page.evaluate(() => window.__s)
    const frames = await page.evaluate(() => window.__m.frames)
    const calls = await page.evaluate(() => window.__calls)
    const pads = [...new Set(samples.map((r) => r.pad))]
    const panned = samples.filter((r) => r.tx !== null && Math.abs(translateX(r.tx)) > 1)
    const panStart = panned.length === 0 ? 0 : translateX(panned[0].tx)
    const panEnd = samples.length === 0 ? 0 : translateX(samples[samples.length - 1].tx)
    const railXs = [...new Set(samples.map((r) => r.railX).filter((x) => x !== null))]
    const after = await page.evaluate(() => ({
      pad: getComputedStyle(document.querySelector('[data-conversation-scroll]')).paddingRight,
      instant: document.documentElement.classList.contains('dsx-fold-inset'),
      pancls: document.documentElement.classList.contains('dps-inset-pan'),
      tx: getComputedStyle(document.querySelector('[data-slot="conversation.session"] [class$="_viewArea"]')).transform,
      deck: document.querySelector('.dsx-wave-deck > div')?.getAttribute('data-deck-anim') ?? null,
      open: document.body.classList.contains('dsx-stats-active'),
    }))
    const delta = parseFloat(after.pad) - parseFloat(before)
    const half = delta / 2
    // The pan CALLS are the deterministic receipt: keyframes, composite and fill.
    const paneCall = calls.find((c) => c.who === 'pane')
    const cardCall = calls.find((c) => c.who === 'composer')
    const firstValue = (call, prop) => {
      if (call === undefined) return Number.NaN
      const k = call.frames[0]
      const raw = k?.[prop] ?? ''
      return parseFloat(String(raw).replace(/^translateX\(|\)$/g, ''))
    }
    // The composer rides the same half-delta as a relative `left`; its box is what
    // the eye sees move at the bottom of the reading column.
    const composerXs = samples.map((r) => r.composerX).filter((x) => x !== null)
    const composerTravel = composerXs.length < 2 ? 0 : composerXs[composerXs.length - 1] - composerXs[0]
    const result = {
      before,
      after: after.pad,
      distinctPads: pads,
      delta,
      pan: {
        frames: panned.length,
        start: panStart,
        end: panEnd,
        half,
        calls: calls.map((c) => `${c.who}:${JSON.stringify(c.frames)}${JSON.stringify(c.options)}`),
        pane: paneCall === undefined ? null : { from: firstValue(paneCall, 'transform'), composite: paneCall.options?.composite, fill: paneCall.options?.fill, duration: paneCall.options?.duration, easing: paneCall.options?.easing },
        composer: cardCall === undefined ? null : { from: firstValue(cardCall, 'left'), composite: cardCall.options?.composite, fill: cardCall.options?.fill },
      },
      composer: { travel: composerTravel, start: composerXs[0] ?? null, end: composerXs[composerXs.length - 1] ?? null },
      railX: railXs,
      transitionsRunning: samples.reduce((n, r) => n + (r.transitions > 0 ? 1 : 0), 0),
      frames: { n: frames.length, p50: pct(frames, 50), p95: pct(frames, 95), over50: frames.filter((x) => x > 50).length },
      residue: { instant: after.instant, pancls: after.pancls, tx: after.tx, deck: after.deck },
    }
    report.dirs[dir] = result

    console.log(`\n== ${dir} ==`)
    check(result.transitionsRunning === 0, 'no padding transition ever runs during the fold', `${samples.length} frame(s) sampled`)
    check(pads.length <= 2, 'the inset lands in one step (at most two values all window)', `values: ${pads.join(' → ')}`)
    // Deterministic half: the ANIMATION CALL, not a frame sample (a 300ms animation
    // on a loaded stage can only be sampled a handful of times).
    check(
      result.pan.pane !== null &&
        Math.abs(result.pan.pane.from) >= Math.abs(result.pan.half) * 0.9 &&
        result.pan.pane.composite === 'add' &&
        result.pan.pane.fill === 'none',
      'the pan is one additive, self-releasing animation of half the inset delta',
      result.pan.pane === null ? 'no pane animation was created' : JSON.stringify(result.pan.pane),
    )
    // Frame-level half: whatever the cadence, the sampled motion must not go the
    // wrong way or overshoot the delta.
    check(
      result.pan.frames >= 1 &&
        Math.abs(result.pan.start) <= Math.abs(result.pan.half) + 4 &&
        result.pan.start * result.pan.half >= 0,
      'the sampled motion starts on the OLD side (never past the delta)',
      `frames ${result.pan.frames} · start ${result.pan.start.toFixed(1)} vs half ${result.pan.half.toFixed(1)}`,
    )
    check(Math.abs(result.pan.end) < 2, 'the pan lands back on the new layout', `${result.pan.end.toFixed(1)}px`)
    // NO FLASH FRAME: the first frame that shows the new inset must already carry the
    // pan. The regression this locks (2026-10-28): the pan used to be started one rAF
    // after the write, so a frame was painted at the new position with no offset and
    // the next one snapped back — a visible flicker at the start of every fold.
    const firstNew = samples.find((r) => r.pad !== before)
    check(
      firstNew !== undefined && firstNew.tx !== null && Math.abs(translateX(firstNew.tx)) > 1,
      'the pan starts in the SAME frame the inset lands (no flash frame)',
      firstNew === undefined ? 'the inset never changed' : `pad ${firstNew.pad} with tx ${firstNew.tx}`,
    )
    // The composer is the same content box's other occupant: same half-delta, as a
    // relative `left` (deterministic receipt), plus the sampled travel below.
    check(
      result.pan.composer !== null &&
        Math.abs(result.pan.composer.from) >= Math.abs(result.pan.half) * 0.9 &&
        result.pan.composer.composite === 'add' &&
        result.pan.composer.fill === 'none',
      'the composer (input box) gets the same additive half-delta pan',
      result.pan.composer === null ? 'no composer animation was created' : JSON.stringify(result.pan.composer),
    )
    check(
      result.composer.travel * result.pan.half <= 0 && Math.abs(result.composer.travel) <= Math.abs(result.pan.half) + 4,
      'the composer really moves, and never past the delta',
      `travel ${result.composer.travel.toFixed(1)} vs half ${result.pan.half.toFixed(1)} (x ${result.composer.start} → ${result.composer.end})`,
    )
    check(railXs.length <= 1, 'the rail is not displaced by the pan', `x ${railXs.join(' / ') || 'off screen'}`)
    check(!result.residue.instant && !result.residue.pancls && (result.residue.tx === 'none' || Math.abs(translateX(result.residue.tx)) < 0.5), 'nothing of the fold treatment is left after it', JSON.stringify(result.residue))
    console.log(`   frame window: p50 ${result.frames.p50}ms · p95 ${result.frames.p95}ms · ${result.frames.over50} over 50ms (${result.frames.n} frames)`)
    await page.waitForTimeout(400)
  }
  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '))

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1))
  console.log(`\n[fold-inset] receipt → ${path.join(OUT, 'report.json')}`)
  console.log(failures === 0 ? 'ALL PASS' : `FAIL — ${failures} assertion(s)`)
  await browser.close()
  process.exit(failures === 0 ? 0 : 1)
})()
