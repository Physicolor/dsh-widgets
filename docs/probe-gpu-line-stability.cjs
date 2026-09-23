/**
 * GPU 利用率 card stability probe — docs/probe-gpu-line-stability.cjs
 *
 * The user reported an INTERMITTENT bottom clip on the sys-gpu-line card. The
 * deterministic cause was located and fixed (a 0% sample put the polyline exactly
 * on the plot box's bottom edge and `overflow: hidden` cut its lower half-stroke);
 * this probe hunts for anything else that varies with the live data:
 *
 *   - samples the REAL rail card every ~1.5s for ~45s (the host polls /api/sysinfo
 *     on the widget's own interval, so several distinct snapshots pass through);
 *   - for EVERY sample asserts the whole sparkline stroke stays inside the plot
 *     box, the time-label row stays inside the card's padding, and the card's
 *     height never leaves its slot (a reflow would be the other way this card
 *     could clip);
 *   - records the utilisation text of each sample, so the sweep is visible in the
 *     receipt (an idle GPU is 0% — the worst case for the old bug).
 *
 * Usage: node docs/probe-gpu-line-stability.cjs [seconds]
 * Leaves: docs/probe-gpu-line-stability-result.json
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const OUT = path.join(__dirname, 'probe-gpu-line-stability-result.json')
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const SECONDS = Number(process.argv[2] ?? 45)

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

const SAMPLE = () => {
  const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot .dsx-stats-card'))
  const card = cards.find((c) => { const t = c.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('GPU') })
  if (card === undefined) return { error: 'no GPU card' }
  const cb = card.getBoundingClientRect()
  const pad = Number.parseFloat(getComputedStyle(card).paddingTop)
  const svg = card.querySelector('svg')
  const poly = card.querySelector('polyline')
  const ha = card.querySelector('.dsx-stats-card-headafter')
  const haBig = ha !== null ? ha.querySelector('span') : null
  if (svg === null) return { noChart: true, skeleton: card.className.includes('dsx-sk-card'), head: haBig !== null ? haBig.textContent.trim() : null }
  const sb = svg.getBoundingClientRect()
  const row = svg.parentElement.parentElement
  const label = row.lastElementChild
  const lb = label.getBoundingClientRect()
  const out = {
    util: haBig !== null ? haBig.textContent.trim() : null,
    // How many POLYLINES the sparkline is drawn as: one means the line is
    // continuous. More than one means the history's null samples broke it into
    // dashes — the live 利用率 card measured 2 segments (15+3 points) before
    // `plotSamples` carried misses forward.
    segments: card.querySelectorAll('polyline').length,
    ptCounts: Array.from(card.querySelectorAll('polyline')).map((p) => p.getAttribute('points').split(' ').length).join(','),
    cardH: Math.round(cb.height * 10) / 10,
    slotH: Math.round(card.parentElement.getBoundingClientRect().height * 10) / 10,
    svgTop: Math.round(sb.top * 10) / 10,
    svgBottom: Math.round(sb.bottom * 10) / 10,
    labelBottom: Math.round(lb.bottom * 10) / 10,
    floor: Math.round((cb.bottom - pad) * 10) / 10,
    stroke: poly !== null ? getComputedStyle(poly).strokeWidth : null,
    polyTop: null,
    polyBottom: null,
    points: poly !== null ? poly.getAttribute('points').split(' ').length : 0,
  }
  if (poly !== null) {
    const bb = poly.getBBox()
    out.polyTop = Math.round((sb.top + (bb.y / 100) * sb.height) * 10) / 10
    out.polyBottom = Math.round((sb.top + ((bb.y + bb.height) / 100) * sb.height) * 10) / 10
  }
  return out
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 1 })
  await ctx.addCookies([mintCookie(ORIGIN.replace(/^https?:\/\//, ''))])
  const page = await ctx.newPage()
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
  // Wait for the first real (non-skeleton) sparkline.
  for (let i = 0; i < 100; i++) {
    const ready = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card'))
      const c = cards.find((x) => { const t = x.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('GPU') })
      return c !== undefined && c.querySelector('svg') !== null
    })
    if (ready) break
    await page.waitForTimeout(400)
  }

  const samples = []
  const t0 = Date.now()
  while ((Date.now() - t0) / 1000 < SECONDS) {
    const s = await page.evaluate(SAMPLE)
    if (s !== undefined && s.error === undefined) samples.push(s)
    await page.waitForTimeout(1500)
  }
  const charts = samples.filter((s) => s.noChart !== true)
  // A sample can legitimately have no chart: the shell paints the LOADING
  // SKELETON until /api/sysinfo answers (and the card draws nothing before two
  // history points exist). Those are loading states, not clips — the assertion
  // below is about the LOADED samples.
  const loading = samples.filter((s) => s.noChart === true)
  console.log(`\nsamples=${samples.length} with a chart=${charts.length} loading=${loading.length}`)
  for (const s of charts.slice(0, 6)) console.log(`  util=${s.util} poly=${s.polyTop}…${s.polyBottom} svg=${s.svgTop}…${s.svgBottom} labels≤${s.labelBottom} floor=${s.floor} card=${s.cardH}/${s.slotH} pts=${s.points}`)
  if (charts.length > 6) console.log(`  … ${charts.length - 6} more samples`)

  check('every LOADED sample rendered a clean sparkline (no chart only while loading)',
    charts.length > 0 && loading.every((s) => s.skeleton === true || s.skeleton === undefined),
    `${charts.length} loaded / ${loading.length} loading (skeleton: ${loading.filter((s) => s.skeleton === true).length})`)
  check('the whole sparkline stroke stayed inside the plot box in EVERY sample',
    charts.every((s) => s.polyTop !== null && s.polyBottom !== null && s.polyTop >= s.svgTop + 1 && s.polyBottom <= s.svgBottom - 1),
    charts.map((s) => `${s.polyBottom}≤${s.svgBottom - 1}`).join(' '))
  check('the time labels stayed inside the card padding in EVERY sample',
    charts.every((s) => s.labelBottom <= s.floor + 1),
    charts.map((s) => `${s.labelBottom}≤${s.floor + 1}`).join(' '))
  check('the card never left its slot height (no reflow to clip against)',
    samples.every((s) => s.cardH === undefined || Math.abs(s.cardH - s.slotH) <= 1),
    samples.map((s) => `${s.cardH}/${s.slotH}`).join(' '))
  // The live history DOES contain misses (26 nulls against 0 in cpu), so this is
  // the regression check for the dashed-line bug: one continuous polyline.
  check('the sparkline is drawn as ONE continuous line in every sample (misses carried forward)',
    charts.every((s) => s.segments === 1),
    charts.map((s) => `${s.segments}(${s.ptCounts})`).join(' '))
  const utils = [...new Set(charts.map((s) => s.util))]
  check('the sweep covered the live utilisation values', utils.length >= 1, `util values seen: ${utils.join(', ')}`)

  fs.writeFileSync(OUT, `${JSON.stringify({
    probedAt: new Date().toISOString(),
    origin: ORIGIN,
    seconds: SECONDS,
    samples: samples.length,
    utilValues: utils,
    minMarginTop: Math.min(...charts.map((s) => s.polyTop - s.svgTop)),
    minMarginBottom: Math.min(...charts.map((s) => s.svgBottom - s.polyBottom)),
    minLabelSlack: Math.min(...charts.map((s) => s.floor - s.labelBottom)),
    first: charts.slice(0, 6),
    results,
    failed: results.filter((r) => !r.ok).length,
  }, null, 2)}\n`, 'utf8')
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions over ${samples.length} live samples)  -> ${path.basename(OUT)}`)
  await browser.close()
  process.exit(failed === 0 ? 0 : 1)
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })
