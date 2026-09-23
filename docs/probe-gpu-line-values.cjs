/**
 * GPU 利用率 card value sweep — docs/probe-gpu-line-values.cjs
 *
 * The live card sits at 0% on an idle machine, so the stability probe cannot
 * exercise the OTHER values. This probe intercepts the rail's own sysinfo route
 * (Playwright `page.route` on the sysinfo endpoint) and serves a synthetic
 * 20-sample RAMP (0 → 100 → 0), so one render contains every y the sparkline can
 * take — the exact question "can any value put the stroke on (or past) the plot
 * box's edge".
 *
 * Usage: node docs/probe-gpu-line-values.cjs
 * Leaves: docs/probe-gpu-line-values-result.json + docs/probe-gpu-line-ramp.png
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const OUT = path.join(__dirname, 'probe-gpu-line-values-result.json')
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const FONT_CSS = `* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }`
/** 20 samples covering 0, 25, 50, 75, 100 and back — every y the line can take.
 *  Two short runs are NULLS (the host stamps a null when its nvidia-smi query
 *  times out): those must be CARRIED FORWARD, not drawn as breaks — measured on
 *  the live card, the nulls turned the sparkline into dashes (2 polylines). */
const RAMP = [0, 25, 50, 75, 100, null, null, 50, 25, 0, 0, 25, 50, 75, null, null, null, 25, 12, 88]
/** How many of the ramp's samples are real readings (the rest are misses). */
const REAL_SAMPLES = RAMP.filter((v) => v !== null).length
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie(ORIGIN.replace(/^https?:\/\//, ''))])
  const page = await ctx.newPage()

  // The rail's own route, answered with a synthetic snapshot: the card renders
  // exactly as it does live, but the sparkline carries the ramp.
  const ts = Date.now()
  const ticks = RAMP.map((_, i) => ts + i * 1000)
  await page.route('**/api/sysinfo', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ts,
      cpu: { util: 7.5 },
      mem: { used: 20 * 1024 ** 3, total: 32 * 1024 ** 3, percent: 62.5 },
      gpu: { name: 'NVIDIA GeForce RTX 5070 Ti Laptop GPU', temp: 53, util: 88, memUsed: 3.2 * 1024 ** 3, memTotal: 12 * 1024 ** 3, memPercent: 26.7 },
      history: { ts: ticks, cpu: ticks.map(() => 7.5), gpu: RAMP },
    }),
  }))

  await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForSelector('[class$="_sessionRow"]', { timeout: 45000 }).catch(() => {})
  const row = page.locator('[class$="_sessionRow"]').first()
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4500) }
  await page.waitForSelector('button.dsx-stats-capsule', { timeout: 30000 }).catch(() => {})
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    if (!(await cap.count())) { await page.waitForTimeout(1000); continue }
    await cap.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(900)
  }
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card'))
      const c = cards.find((x) => { const t = x.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('GPU') })
      return c !== undefined && c.querySelector('polyline') !== null
    })
    if (ready) break
    await page.waitForTimeout(400)
  }
  await page.addStyleTag({ content: FONT_CSS })
  await page.waitForTimeout(500)

  const m = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot .dsx-stats-card'))
    const card = cards.find((c) => { const t = c.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('GPU') })
    if (card === undefined) return { error: 'no GPU card' }
    const svg = card.querySelector('svg')
    const poly = card.querySelector('polyline')
    if (svg === null || poly === null) return { error: 'no sparkline' }
    const sb = svg.getBoundingClientRect()
    const pts = poly.getAttribute('points').split(' ').map((p) => p.split(',').map(Number))
    const ys = pts.map(([, y]) => y)
    const bb = poly.getBBox()
    const pad = Number.parseFloat(getComputedStyle(card).paddingTop)
    const cb = card.getBoundingClientRect()
    const label = svg.parentElement.parentElement.lastElementChild.getBoundingClientRect()
    return {
      viewBoxMinY: Math.min(...ys),
      viewBoxMaxY: Math.max(...ys),
      viewBoxH: sb.height,
      stroke: getComputedStyle(poly).strokeWidth,
      screenTop: sb.top + (bb.y / 100) * sb.height,
      screenBottom: sb.top + ((bb.y + bb.height) / 100) * sb.height,
      svgTop: sb.top,
      svgBottom: sb.bottom,
      labelBottom: label.bottom,
      floor: cb.bottom - pad,
      points: pts.length,
      segments: card.querySelectorAll('polyline').length,
      segmentSizes: Array.from(card.querySelectorAll('polyline')).map((p) => p.getAttribute('points').split(' ').length).join(','),
      headText: card.querySelector('.dsx-stats-card-headafter') !== null ? card.querySelector('.dsx-stats-card-headafter').textContent.trim() : null,
    }
  })
  console.log(`\n${JSON.stringify(m, null, 2)}`)
  check('the synthetic ramp reached the card', m !== undefined && m.error === undefined && m.points === RAMP.length, m === undefined ? 'no data' : `${m.points} plotted points for ${RAMP.length} samples (${REAL_SAMPLES} real + ${RAMP.length - REAL_SAMPLES} misses)`)
  if (m !== undefined && m.error === undefined) {
    check('the ramp spans the full value range (0% and 100% both plotted)',
      m.viewBoxMinY <= 5 && m.viewBoxMaxY >= 95, `viewBox y ${m.viewBoxMinY}…${m.viewBoxMaxY}`)
    // Every sample gets a point (the misses carry the previous value forward), so
    // the line is ONE segment as long as the whole window — not dashes.
    check('the NULL samples are carried forward as ONE continuous line, not dashes',
      m.segments === 1 && m.segmentSizes === String(RAMP.length),
      `${m.segments} segment(s) of ${m.segmentSizes} points (expected 1 × ${RAMP.length})`)
    check('the highest sample (100%) keeps its whole stroke below the box top',
      m.screenTop >= m.svgTop + 1, `top ${Math.round(m.screenTop * 10) / 10} vs svg top ${Math.round(m.svgTop * 10) / 10} (stroke ${m.stroke})`)
    check('the lowest sample (0%) keeps its whole stroke above the box bottom',
      m.screenBottom <= m.svgBottom - 1, `bottom ${Math.round(m.screenBottom * 10) / 10} vs svg bottom ${Math.round(m.svgBottom * 10) / 10} (stroke ${m.stroke})`)
    check('the time labels stay inside the card padding', m.labelBottom <= m.floor + 1, `${Math.round(m.labelBottom * 10) / 10} ≤ ${Math.round(m.floor * 10) / 10}`)
    await page.screenshot({ path: path.join(__dirname, 'probe-gpu-line-ramp.png') })
  }

  fs.writeFileSync(OUT, `${JSON.stringify({
    probedAt: new Date().toISOString(),
    ramp: RAMP,
    measured: m,
    results,
    failed: results.filter((r) => !r.ok).length,
  }, null, 2)}\n`, 'utf8')
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions)  -> ${path.basename(OUT)}`)
  await browser.close()
  process.exit(failed === 0 ? 0 : 1)
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })
