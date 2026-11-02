#!/usr/bin/env node
/**
 * dsh-widgets — the open/close FOLD under load (`scripts/probe-fold-stress.cjs`).
 *
 * WHY THIS EXISTS: the fold is the one animation this plugin drives per card. Its
 * ordinary-stage numbers were measured in 2026-10 (p50 16.7ms, p95 16.8ms on the owner's
 * stage), so "is it smooth?" was answered on an idle machine. The question this probe asks
 * is the one a user actually hits: what happens when the MAIN THREAD is busy (a long
 * transcript, a data emit, a slow CPU) or when the GPU is weak — and where is the fold's
 * cost on those runs?
 *
 * WHAT IT MEASURES, per cycle:
 *   - rAF intervals around the toggle: p50/p95/p99/max, frames over 26ms / 50ms;
 *   - the FOLD WINDOW itself (`data-deck-anim` in → out, a MutationObserver, no per-frame
 *     style reads): onset (click → marker), wall (marker → settle), dropped frames inside;
 *   - CDP Performance counters (task / script / style / layout) as deltas;
 *   - Long Animation Frame entries over 50ms with their script attribution;
 *   - the number of running WAAPI animations when the fold starts (a compositor-driven fold
 *     is `N` animations; a main-thread JS clock is 0).
 *
 * HOW THE TOGGLE IS DRIVEN: a PAGE-SIDE `element.click()`, never `locator.click()`. The
 * driving harness's own hit-testing would otherwise land inside the measurement (the
 * post-mortem in `diag-fold-gbcr.cjs`).
 *
 * USAGE
 *   DSH_HOME=D:\dsh-home DSH_PORT=49326 node scripts/probe-fold-stress.cjs \
 *     --label baseline --scenario all --cycles 4 --throttle 1 --gpu real --headful 1
 *
 *   --scenario  all | open | close | rapid            (default all)
 *   --cycles N  toggles per scenario                  (default 4)
 *   --gap MS    quiet time between toggles             (default 900)
 *   --throttle N  CDP CPU slowdown (1 = none)
 *   --gpu       real | software                        (software forces SwiftShader)
 *   --headful   1 | 0                                  (real GPU needs 1)
 *   --stage     WxH@DSF                                (default 1707x1067@1.5)
 *   --session   a session-row substring (default: the LONGEST transcript)
 *   --cards     N | all                                (default: leave the installed set)
 *   --css       extra CSS injected before the cycles (A/B without a rebuild)
 *   --out       receipt dir (default .probe-fold-stress/<label>)
 *
 * The app is left the way it was found: the session is switched back to the first row,
 * a changed card set is PUT back, and the rail is left open (the state the probe found it
 * in is recorded in the receipt).
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  if (i !== -1 && process.argv[i + 1] !== undefined && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]
  const h = process.argv.find((a) => a.startsWith(`--${n}=`))
  return h === undefined ? d : h.slice(n.length + 3)
}
const flag = (n) => process.argv.includes(`--${n}`)

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const STAGE = arg('stage', '1707x1067@1.5')
const [W, H, DSF] = (() => {
  const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(STAGE)
  if (m === null) throw new Error(`bad --stage ${STAGE}`)
  return [Number(m[1]), Number(m[2]), Number(m[3] || 1)]
})()
const LABEL = arg('label', 'run')
const SCENARIO = arg('scenario', 'all')
const CYCLES = Number(arg('cycles', 4))
const GAP = Number(arg('gap', 900))
const THROTTLE = Number(arg('throttle', 1))
const GPU = arg('gpu', 'real')
const HEADFUL = arg('headful', '1') === '1'
const SESSION = arg('session', null)
const CARDS = arg('cards', null)
const CSS = arg('css', '')
const OUT = arg('out', path.join(__dirname, '..', '.probe-fold-stress', LABEL))

const pct = (arr, p) => {
  if (arr.length === 0) return 0
  const s = arr.slice().sort((a, b) => a - b)
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(1)
}
const mean = (arr) => (arr.length === 0 ? 0 : +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))

/** Page-side sampler: rAF intervals + the fold's own marker window. Installed before the clicks. */
const ARM = (ms) => {
  window.__fold = { frames: [], loaf: [], marks: [], clickAt: null, animsAtStart: null, start: performance.now() }
  const f = window.__fold
  let last = f.start
  const tick = (t) => {
    f.frames.push(t - last)
    last = t
    if (performance.now() - f.start < ms) f.raf = requestAnimationFrame(tick)
    else f.raf = 0
  }
  f.raf = requestAnimationFrame(tick)
  try {
    f.obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        f.loaf.push({
          at: Math.round(e.startTime - f.start),
          dur: Math.round(e.duration),
          block: Math.round(e.blockingDuration),
          style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
          render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
          scripts: e.scripts.filter((s) => s.duration > 1).map((s) => `${s.invoker || s.name}:${Math.round(s.duration)}ms`).slice(0, 6),
        })
      }
    })
    f.obs.observe({ type: 'long-animation-frame', buffered: false })
  } catch { /* Chrome <123: the frame intervals still answer the question */ }
  // `data-deck-anim` lives on the deck, i.e. the wave wrapper's first child (the wrapper
  // itself carries `.dsx-wave-deck` and never changes).
  const deck = document.querySelector('.dsx-wave-deck > div')
  f.deck = deck
  if (deck !== null) {
    const note = () => {
      const now = performance.now() - f.start
      const anim = deck.getAttribute('data-deck-anim')
      if (anim === 'in' || anim === 'out') {
        if (f.animsAtStart === null) f.animsAtStart = document.getAnimations().length
        f.marks.push({ kind: 'start', at: now, dir: anim })
      } else {
        f.marks.push({ kind: 'end', at: now })
      }
    }
    f.mo = new MutationObserver(note)
    f.mo.observe(deck, { attributes: true, attributeFilter: ['data-deck-anim'] })
  }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const args = ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion']
  if (GPU === 'software') args.push('--use-angle=swiftshader', '--disable-gpu-compositing')
  const browser = await chromium.launch({ executablePath: chromePath(), headless: !HEADFUL, args })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Performance.enable')
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))

  const railOpen = () => page.evaluate(() => {
    const d = document.querySelector('.dsx-stats-drawer')
    return d !== null && !d.hasAttribute('data-retired')
  })
  const capsule = () => page.evaluate(() => {
    const b = document.querySelector('.dsx-stats-capsule')
    if (b === null) return false
    b.click()
    return true
  })
  const waitRail = async (want, timeout = 8000) => {
    const t0 = Date.now()
    for (;;) {
      if ((await railOpen()) === want) return true
      if (Date.now() - t0 > timeout) return false
      await page.waitForTimeout(40)
    }
  }
  const rows = () => page.locator('[class$="_sessionRow"]')

  /** Pick the session: an explicit substring, else the LONGEST transcript in the list. */
  const pickSession = async () => {
    const list = rows()
    const n = await list.count()
    if (SESSION !== null) {
      for (let i = 0; i < n; i++) {
        const text = (await list.nth(i).innerText().catch(() => '')) || ''
        if (text.includes(SESSION)) {
          await list.nth(i).click().catch(() => {})
          await page.waitForTimeout(1400)
          return { picked: SESSION, rows: n }
        }
      }
      console.log(`[fold] no session row matched "${SESSION}" — falling back to the longest`)
    }
    let best = { i: 0, nodes: -1, h: 0 }
    for (let i = 0; i < n; i++) {
      await list.nth(i).click().catch(() => {})
      await page.waitForTimeout(1100)
      const m = await page.evaluate(() => {
        const s = document.querySelector('[data-conversation-scroll]')
        return { nodes: s === null ? 0 : s.querySelectorAll('*').length, h: s === null ? 0 : s.scrollHeight }
      })
      if (m.nodes > best.nodes) best = { i, ...m }
    }
    await list.nth(best.i).click().catch(() => {})
    await page.waitForTimeout(1400)
    console.log(`[fold] session picked: row ${best.i} · ${best.nodes} nodes · scrollHeight ${best.h}`)
    return { picked: `row ${best.i}`, nodes: best.nodes, scrollHeight: best.h, rows: n }
  }

  const readState = async () => page.evaluate(async () => {
    const r = await fetch('/api/widgets-state', { cache: 'no-store' })
    return r.ok ? await r.json() : null
  })
  /** Install `N` cards (or every instance) through the plugin's own state route. */
  const setCards = async (mode) => {
    const saved = await readState()
    if (saved === null) return { saved: null, changed: false }
    const all = Array.isArray(saved.state?.order) ? saved.state.order : []
    const want = mode === 'all' ? all : all.slice(0, Number(mode))
    if (want.length === 0) return { saved, changed: false }
    await page.evaluate(async (state) => {
      await fetch('/api/widgets-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedAt: Date.now(), state }),
      })
    }, { ...saved.state, installed: want })
    return { saved, changed: true, count: want.length }
  }

  let sessionInfo = null
  let cardInfo = null

  const measureCycle = async (dir) => {
    await page.bringToFront()
    await page.evaluate(ARM, 1500)
    if (CSS !== '') {
      await page.evaluate((css) => {
        const el = document.createElement('style')
        el.id = '__fold-ab-css'
        el.textContent = css
        document.head.appendChild(el)
      }, CSS)
    }
    const before = await cdp.send('Performance.getMetrics')
    const clickAt = await page.evaluate(() => {
      const b = document.querySelector('.dsx-stats-capsule')
      window.__fold.clickAt = performance.now() - window.__fold.start
      b.click()
      return window.__fold.clickAt
    })
    await page.waitForTimeout(1500)
    const raw = await page.evaluate(() => {
      const f = window.__fold
      if (f.obs) f.obs.disconnect()
      if (f.raf) cancelAnimationFrame(f.raf)
      if (f.mo) f.mo.disconnect()
      const css = document.getElementById('__fold-ab-css')
      if (css) css.remove()
      return { frames: f.frames.slice(1), loaf: f.loaf, marks: f.marks, clickAt: f.clickAt, anims: f.animsAtStart }
    })
    const after = await cdp.send('Performance.getMetrics')
    const metric = (m, list) => {
      const a = list.metrics.find((x) => x.name === m)
      return a === undefined ? 0 : a.value
    }
    const delta = {}
    for (const m of ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount']) {
      delta[m] = +(metric(m, after) - metric(m, before)).toFixed(4)
    }
    void clickAt
    const start = raw.marks.find((m) => m.kind === 'start')
    const end = [...raw.marks].reverse().find((m) => m.kind === 'end')
    const onset = start === undefined ? null : +(start.at - raw.clickAt).toFixed(1)
    const wall = start === undefined || end === undefined ? null : +(end.at - start.at).toFixed(1)
    const windowFrames = start === undefined
      ? raw.frames
      : raw.frames.filter((d, i) => {
        // Interval i ends at the frame boundary: approximate its position by cumulative sum.
        let at = 0
        for (let k = 0; k <= i; k++) at += raw.frames[k]
        return at >= start.at - 20 && at <= (end === undefined ? start.at + 400 : end.at + 60)
      })
    return { dir, frames: raw.frames, windowFrames, marks: raw.marks, clickAt: raw.clickAt, onset, wall, anims: raw.anims, loaf: raw.loaf, delta }
  }

  const summarize = (r) => {
    const f = r.windowFrames
    const n = Math.max(1, f.length)
    // The display's period as this page sees it: the 10th percentile of every interval
    // in the run (a minimum is one lucky frame and on this stage it read 4.0ms on a
    // 240Hz panel while occasional double-fires read lower still).
    const sortedAll = r.frames.slice().sort((a, b) => a - b)
    const vsync = r.frames.length === 0 ? 16.7 : +sortedAll[Math.max(0, Math.floor(sortedAll.length * 0.1))].toFixed(2)
    const startMark = r.marks.find((m) => m.kind === 'start')
    const endMark = [...r.marks].reverse().find((m) => m.kind === 'end')
    const windowMs = startMark === undefined ? null : +(((endMark === undefined ? startMark.at + 320 : endMark.at) - startMark.at)).toFixed(1)
    const expected = windowMs === null ? null : Math.round(windowMs / vsync)
    const over26 = f.filter((d) => d > 26).length
    const over50 = f.filter((d) => d > 50).length
    return {
      dir: r.dir,
      onsetMs: r.onset,
      wallMs: r.wall,
      vsync,
      windowMs,
      windowFrames: f.length,
      expectedFrames: expected,
      droppedVsync: expected === null ? null : Math.max(0, expected - f.length),
      p50: pct(f, 50), p95: pct(f, 95), p99: pct(f, 99), max: +Math.max(...f).toFixed(1),
      over26, over50,
      over2x: f.filter((d) => d > vsync * 2).length,
      over4x: f.filter((d) => d > vsync * 4).length,
      over26Pct: +((100 * over26) / n).toFixed(0),
      fps: +(1000 / mean(f)).toFixed(1),
      animationsAtStart: r.anims,
      cpuPerFrame: {
        task: +((1000 * r.delta.TaskDuration) / n).toFixed(2),
        script: +((1000 * r.delta.ScriptDuration) / n).toFixed(2),
        style: +((1000 * r.delta.RecalcStyleDuration) / n).toFixed(2),
        layout: +((1000 * r.delta.LayoutDuration) / n).toFixed(2),
      },
      loaf: r.loaf.filter((l) => l.dur >= 50).sort((a, b) => b.dur - a.dur).slice(0, 5),
    }
  }

  const run = async () => {
    await page.goto(`http://${AUTHORITY}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(4500)
    sessionInfo = await pickSession()
    if (CARDS !== null) {
      cardInfo = await setCards(CARDS)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(4500)
      await pickSession()
      console.log(`[fold] cards installed: ${cardInfo.count ?? 'unchanged'} (restored at the end)`)
    }
    const resume = await railOpen()
    if (!resume) {
      await capsule()
      await waitRail(true)
      await page.waitForTimeout(700)
    }
    const cards = await page.evaluate(() => ({
      slots: document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot').length,
      columns: getComputedStyle(document.querySelector('.dsx-wave-deck')).gridTemplateColumns.split(' ').length,
      drawer: document.querySelector('.dsx-stats-drawer') !== null,
    }))
    const meta = { label: LABEL, scenario: SCENARIO, stage: STAGE, throttle: THROTTLE, gpu: GPU, headful: HEADFUL, cards, sessionInfo, cardInfo: cardInfo === null ? null : { count: cardInfo.count ?? null, changed: cardInfo.changed } }
    console.log(`[fold] ${JSON.stringify(meta)}`)

    const results = []
    const drop = async () => {
      if (await railOpen()) {
        await page.evaluate(() => document.querySelector('.dsx-stats-capsule').click())
        await waitRail(false)
        await page.waitForTimeout(GAP)
      }
    }

    if (SCENARIO === 'idle') {
      // The environment's own ceiling: the same 1.5s sampler with NO toggle at all. Every
      // fold number is read against this, never against the display's nominal rate.
      await page.bringToFront()
      await page.evaluate(ARM, 1500)
      await page.waitForTimeout(1600)
      const raw = await page.evaluate(() => {
        const f = window.__fold
        if (f.obs) f.obs.disconnect()
        if (f.raf) cancelAnimationFrame(f.raf)
        if (f.mo) f.mo.disconnect()
        return { frames: f.frames.slice(1), loaf: f.loaf, marks: [], clickAt: null, anims: null }
      })
      const f = raw.frames
      results.push({
        dir: 'idle',
        onsetMs: null, wallMs: null,
        vsync: +f.slice().sort((a, b) => a - b)[Math.max(0, Math.floor(f.length * 0.1))].toFixed(2),
        windowMs: 1500, windowFrames: f.length,
        expectedFrames: null, droppedVsync: null,
        p50: pct(f, 50), p95: pct(f, 95), p99: pct(f, 99), max: +Math.max(...f).toFixed(1),
        over26: f.filter((d) => d > 26).length, over50: f.filter((d) => d > 50).length,
        over2x: 0, over4x: 0, over26Pct: 0,
        fps: +(1000 / mean(f)).toFixed(1),
        animationsAtStart: null,
        cpuPerFrame: { task: 0, script: 0, style: 0, layout: 0 },
        loaf: raw.loaf.filter((l) => l.dur >= 50).slice(0, 5),
      })
      const x = results.at(-1)
      console.log(`[idle] fps ${x.fps} · vsync ${x.vsync}ms · p50 ${x.p50} · p95 ${x.p95} · max ${x.max} · >26ms ${x.over26}/${x.windowFrames}`)
    }
    if (SCENARIO === 'all' || SCENARIO === 'open') {
      for (let i = 0; i < CYCLES; i++) {
        if (await railOpen()) await drop()
        const r = await measureCycle('open')
        results.push(summarize(r))
        const x = results.at(-1)
        console.log(`[open ${i + 1}] fps ${x.fps} · vsync ${x.vsync}ms · p95 ${x.p95} · max ${x.max} · over2x ${x.over2x}/${x.windowFrames} · dropped ${x.droppedVsync}/${x.expectedFrames} · onset ${x.onsetMs}ms · wall ${x.wallMs}ms · anims ${x.animationsAtStart}`)
        await page.waitForTimeout(GAP)
      }
    }
    if (SCENARIO === 'all' || SCENARIO === 'close') {
      for (let i = 0; i < CYCLES; i++) {
        if (!(await railOpen())) {
          await capsule()
          await waitRail(true)
          await page.waitForTimeout(700)
        }
        const r = await measureCycle('close')
        results.push(summarize(r))
        const x = results.at(-1)
        console.log(`[close ${i + 1}] fps ${x.fps} · vsync ${x.vsync}ms · p95 ${x.p95} · max ${x.max} · over2x ${x.over2x}/${x.windowFrames} · dropped ${x.droppedVsync}/${x.expectedFrames} · onset ${x.onsetMs}ms · wall ${x.wallMs}ms · anims ${x.animationsAtStart}`)
        await waitRail(false)
        await page.waitForTimeout(GAP)
      }
    }
    if (SCENARIO === 'all' || SCENARIO === 'rapid') {
      // Three toggles 120ms apart: an interrupted fold re-targets from wherever it is.
      await drop()
      const r = await (async () => {
        await page.bringToFront()
      await page.evaluate(ARM, 2200)
        const before = await cdp.send('Performance.getMetrics')
        await page.evaluate(() => {
          const b = document.querySelector('.dsx-stats-capsule')
          window.__fold.clickAt = performance.now() - window.__fold.start
        })
        for (let k = 0; k < 3; k++) {
          await page.evaluate(() => document.querySelector('.dsx-stats-capsule').click())
          await page.waitForTimeout(120)
        }
        await page.waitForTimeout(1600)
        const raw = await page.evaluate(() => {
          const f = window.__fold
          if (f.obs) f.obs.disconnect()
          if (f.raf) cancelAnimationFrame(f.raf)
          if (f.mo) f.mo.disconnect()
          return { frames: f.frames.slice(1), loaf: f.loaf, marks: f.marks, clickAt: f.clickAt, anims: f.animsAtStart }
        })
        const after = await cdp.send('Performance.getMetrics')
        const metric = (m, list) => {
          const a = list.metrics.find((x) => x.name === m)
          return a === undefined ? 0 : a.value
        }
        const delta = {}
        for (const m of ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount']) {
          delta[m] = +(metric(m, after) - metric(m, before)).toFixed(4)
        }
        return { dir: 'rapid', frames: raw.frames, windowFrames: raw.frames, marks: raw.marks, clickAt: raw.clickAt, onset: null, wall: null, anims: raw.anims, loaf: raw.loaf, delta }
      })()
      results.push(summarize(r))
      const x = results.at(-1)
      console.log(`[rapid] fps ${x.fps} · p95 ${x.p95} · max ${x.max} · over2x ${x.over2x}/${x.windowFrames} · anims ${x.animationsAtStart}`)
      await waitRail(true)
    }

    const receipt = { ...meta, results, errors: errors.slice(0, 5), when: new Date().toISOString() }
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(receipt, null, 2))
    console.log(`\n[fold] receipt → ${path.join(OUT, 'report.json')}`)
    const o = results.filter((r) => r.dir === 'open')
    if (o.length > 0) {
      const bad = o.reduce((a, r) => a + r.over26, 0)
      const tot = o.reduce((a, r) => a + r.windowFrames, 0)
      console.log(`[fold] OPEN total: ${bad}/${tot} frames over 26ms · p95 ${pct(o.map((r) => r.p95), 50)}ms (median of cycles) · wall ${mean(o.map((r) => r.wallMs).filter((v) => v !== null))}ms`)
    }
    return { results, receipt }
  }

  try {
    const out = await run()
    // Restore what we changed: the card set (and reload so the client adopts it) and the
    // session row the app was on (row 0 — the one the probe started from).
    if (cardInfo !== null && cardInfo.saved !== null && cardInfo.changed) {
      await page.evaluate(async (saved) => {
        await fetch('/api/widgets-state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savedAt: Date.now(), state: saved.state }),
        })
      }, cardInfo.saved)
      console.log('[fold] card set restored')
    }
    const list = rows()
    if (await list.count() > 0) {
      await list.nth(0).click().catch(() => {})
      await page.waitForTimeout(800)
    }
    if (!(await railOpen())) { await capsule(); await waitRail(true) }
    console.log(`[fold] done · ${out.results.length} cycles recorded`)
  } catch (e) {
    console.error('[fold] FAILED', e)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()

void flag
