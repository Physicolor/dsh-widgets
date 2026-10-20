/**
 * Emit cost — what one bridge update costs the rail (scripts/probe-emit-cost.cjs)
 *
 * The rail re-renders on EVERY bridge emit (the collector emits ~13×/s while a
 * turn streams, see lib/heatmap-accounting.ts), and each card's `CardBody` runs a
 * `useLayoutEffect` that reads `scrollHeight`/`clientHeight` once per commit — so
 * "one emit" used to mean "every card body re-renders and every card box is
 * measured again". This probe puts NUMBERS on that:
 *
 *   cardLayoutReads   `scrollHeight`/`clientHeight` reads on a `.dsx-stats-card`
 *                     element. That effect is gated on the card's OUTPUT identity,
 *                     so this counter is exactly "how many card bodies rebuilt".
 *   railReads         `getBoundingClientRect`/`getComputedStyle` calls whose stack
 *                     names `measureRail`/`readTopInset`/`onCard` — the pointer
 *                     oracle's forced layout. Split by pointer phase.
 *   longTasks         long-task entries + their summed duration in the emit burst.
 *
 * EMIT TRIGGER: a synthetic `storage` event carrying the plugin's own key. The
 * plugin's cross-tab handler re-reads prefs, normalizes them and emits — the SAME
 * path a real preference change takes, with no write and no visual change (the
 * stored value is unchanged, so the rendered prefs are identical).
 *
 * Usage:
 *   node scripts/probe-emit-cost.cjs [authority]
 *   authority defaults to 127.0.0.1:3080; DSH_LIVE_AUTHORITY is honoured too.
 *   Needs DSH_HOME (the auth cookie is minted from $DSH_HOME/.credentials.yaml).
 *
 * It is a MEASUREMENT, not a gate: it prints the numbers and writes a receipt.
 * Compare two runs (before/after a change) — the budgets live in
 * docs/architecture/perf-baseline.json.
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { chromium } = require('./lib/playwright-core.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const AUTHORITY = process.argv[2] || process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:3080'
const OUT = path.join(__dirname, '..', '.probe-emit-cost')
const STORAGE_KEY = 'harness-widgets.state'

const EMITS = 20
const EMIT_GAP_MS = 90
const TRANSCRIPT_STEPS = 60
const RAIL_STEPS = 40

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 } })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  // Never let a probe write the persisted rail configuration back.
  await ctx.route('**/api/widgets-state', async (route) => {
    const method = route.request().method()
    if (method === 'PUT' || method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
      return
    }
    await route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`http://${AUTHORITY}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(4500)
  await page.locator('[class$="_sessionRow"]').first().click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(6000)
  const isOpen = () => page.evaluate(() => {
    const drawer = document.querySelector('.dsx-stats-drawer')
    return !!drawer && !drawer.hasAttribute('data-retired')
  })
  if (!(await isOpen())) {
    const cap = page.locator('button.dsx-stats-capsule').first()
    for (let i = 0; i < 4 && !(await isOpen()); i++) {
      if (!(await cap.count())) break
      await cap.click().catch(() => {})
      await page.waitForTimeout(900)
    }
  }
  if (!(await isOpen())) {
    console.error('FAIL  the rail is not open — nothing to measure')
    await browser.close()
    process.exit(1)
  }
  await page.waitForTimeout(1200)

  const cards = await page.evaluate(() => document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot').length)
  if (cards === 0) {
    console.error('FAIL  no card slots in the deck')
    await browser.close()
    process.exit(1)
  }

  // ── Instrumentation (installed once, toggled by phase) ──
  await page.evaluate(() => {
    const state = { phase: 'idle', cardLayoutReads: 0, railGbcr: 0, railGcs: 0, otherGbcr: 0, storageReads: 0 }
    window.__ec = state
    const isCard = (el) => el instanceof Element && el.classList.contains('dsx-stats-card')
    for (const prop of ['scrollHeight', 'clientHeight']) {
      const desc = Object.getOwnPropertyDescriptor(Element.prototype, prop)
      if (!desc || typeof desc.get !== 'function') continue
      Object.defineProperty(Element.prototype, prop, {
        configurable: true,
        get() {
          if (isCard(this)) state.cardLayoutReads += 1
          return desc.get.call(this)
        },
      })
    }
    // `localStorage` reads of THIS plugin's heatmap ledger on the emit path: it used to
    // be re-read (and JSON-parsed) once per collector pass. Filtered by key so other
    // plugins' reads in the same window cannot pollute the number.
    const getItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (...args) {
      if (String(args[0] ?? '').startsWith('harness-widgets.heatmap')) state.storageReads += 1
      return getItem.apply(this, args)
    }
    const railFrame = () => {
      const stack = new Error().stack || ''
      return stack.includes('measureRail') || stack.includes('readTopInset') || stack.includes('onCard')
    }
    const gbcr = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      if (railFrame()) state.railGbcr += 1
      else state.otherGbcr += 1
      return gbcr.call(this)
    }
    const gcs = window.getComputedStyle
    window.getComputedStyle = function (...args) {
      if (railFrame()) state.railGcs += 1
      return gcs.apply(this, args)
    }
    // Long tasks in the emit burst.
    state.longTasks = 0
    state.longTaskMs = 0
    try {
      state.observer = new PerformanceObserver((list) => {
        if (state.phase !== 'emit') return
        for (const entry of list.getEntries()) {
          state.longTasks += 1
          state.longTaskMs += entry.duration
        }
      })
      state.observer.observe({ entryTypes: ['longtask'] })
    } catch { /* older engine: the counters still work */ }
  })

  // ── Phase A: emit burst ──
  const emit = await page.evaluate(async ({ key, count, gap }) => {
    const s = window.__ec
    s.phase = 'emit'
    s.cardLayoutReads = 0
    s.railGbcr = 0
    s.railGcs = 0
    s.storageReads = 0
    const t0 = performance.now()
    for (let i = 0; i < count; i++) {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: null, storageArea: window.localStorage }))
      await new Promise((r) => setTimeout(r, gap))
    }
    const ms = performance.now() - t0
    s.phase = 'idle'
    return { ms, cardLayoutReads: s.cardLayoutReads, railGbcr: s.railGbcr, railGcs: s.railGcs, storageReads: s.storageReads, longTasks: s.longTasks, longTaskMs: s.longTaskMs }
  }, { key: STORAGE_KEY, count: EMITS, gap: EMIT_GAP_MS })
  await page.waitForTimeout(400)

  // ── Phase B: the pointer over the TRANSCRIPT (no tile anywhere near) ──
  const reset = () => page.evaluate(() => { const s = window.__ec; s.railGbcr = 0; s.railGcs = 0; s.cardLayoutReads = 0 })
  await page.mouse.move(420, 430)
  await page.waitForTimeout(400)
  await reset()
  const box = page.viewportSize() ?? { width: 1578, height: 1000 }
  for (let i = 0; i < TRANSCRIPT_STEPS; i++) {
    const x = 320 + (i % 10) * 24
    const y = 380 + (i % 7) * 30
    await page.mouse.move(x, y)
  }
  await page.waitForTimeout(200)
  const transcript = await page.evaluate(() => ({ gbcr: window.__ec.railGbcr, gcs: window.__ec.railGcs }))

  // ── Phase C: the pointer over the RAIL (the wave is live) ──
  await page.mouse.move(box.width - 120, 300)
  await page.waitForTimeout(300)
  await reset()
  for (let i = 0; i < RAIL_STEPS; i++) {
    const x = box.width - 160 + (i % 6) * 14
    const y = 200 + (i % 9) * 30
    await page.mouse.move(x, y)
  }
  await page.waitForTimeout(200)
  const rail = await page.evaluate(() => ({ gbcr: window.__ec.railGbcr, gcs: window.__ec.railGcs }))

  const report = {
    authority: AUTHORITY,
    at: new Date().toISOString(),
    cards,
    emit: {
      count: EMITS,
      windowMs: Math.round(emit.ms),
      cardLayoutReads: emit.cardLayoutReads,
      cardLayoutReadsPerEmit: +((emit.cardLayoutReads / EMITS).toFixed(2)),
      railReads: emit.railGbcr + emit.railGcs,
      storageReads: emit.storageReads,
      storageReadsPerEmit: +((emit.storageReads / EMITS).toFixed(2)),
      longTasks: emit.longTasks,
      longTaskMs: Math.round(emit.longTaskMs),
      longTaskMsPerEmit: +((emit.longTaskMs / EMITS).toFixed(2)),
    },
    pointer: {
      transcriptMoves: TRANSCRIPT_STEPS,
      transcriptRailReads: transcript.gbcr + transcript.gcs,
      transcriptGbcr: transcript.gbcr,
      transcriptGcs: transcript.gcs,
      railMoves: RAIL_STEPS,
      railRailReads: rail.gbcr + rail.gcs,
      railGbcr: rail.gbcr,
      railGcs: rail.gcs,
    },
  }

  const file = path.join(OUT, 'report.json')
  fs.writeFileSync(file, JSON.stringify(report, null, 2))
  console.log(`cards ${cards} · ${EMITS} emits over ${report.emit.windowMs}ms`)
  console.log(`  card bodies rebuilt   ${report.emit.cardLayoutReads} total (${report.emit.cardLayoutReadsPerEmit}/emit)`)
  console.log(`  long tasks            ${report.emit.longTasks} · ${report.emit.longTaskMs}ms (${report.emit.longTaskMsPerEmit}ms/emit)`)
  console.log(`  localStorage reads    ${report.emit.storageReads} total (${report.emit.storageReadsPerEmit}/emit)`)
  console.log(`  pointer over transcript: ${report.pointer.transcriptRailReads} rail-owned layout reads (${TRANSCRIPT_STEPS} moves)`)
  console.log(`  pointer over rail:       ${report.pointer.railRailReads} rail-owned layout reads (${RAIL_STEPS} moves)`)
  console.log(`receipt: ${path.relative(process.cwd(), file)}`)
  await browser.close()
})().catch(async (error) => {
  console.error('FAIL  probe crashed:', error)
  process.exit(1)
})
