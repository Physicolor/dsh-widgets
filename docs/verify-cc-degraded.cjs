/**
 * Command Code degraded-state probe (docs/verify-cc-degraded.cjs)
 *
 * Answers `/api/commandcode-usage` with 503 (the host's "not configured" state)
 * and checks what the eight Command Code cards print on the grey line under the
 * title:
 *
 *   - the long hint (`未配置 COMMANDCODE_API_KEY — host 自动读取环境变量 / …`)
 *     must NOT be the legend any more: on a 150px card it ellipsized to
 *     `未配置 COMMANDCODE…`, i.e. a truncated error rather than a label;
 *   - the legend is the SHORT honest label — the pool view (`AllUser`), or the
 *     window role word for the single-window cards;
 *   - the full sentence is still reachable: it rides the card's hover tooltip.
 *
 * Snapshots and restores `/api/widgets-state` around the run.
 *
 * Run: node docs/verify-cc-degraded.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')
const hostState = require('./lib/widgets-state.cjs')

const ORIGIN = 'http://127.0.0.1:3080'
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const SHOT_DIR = path.join(__dirname, 'verify-skeleton-shapes')
const SK = [
  'cc-whoami@2x2',
  'cc-usage@2x2',
  'cc-credits@2x2',
  'cc-subscription@2x2',
  'cc-windows@2x2',
  'cc-window-5h@2x2',
  'cc-window-weekly@2x2',
  'cc-window-monthly@2x2',
]
/** Cards whose legend must be the pool view; the rest keep their role word. */
const POOL_VIEW = new Set(['cc-whoami', 'cc-usage', 'cc-credits', 'cc-subscription', 'cc-windows'])

;(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1200 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  // 503 = the host route answered "COMMANDCODE_API_KEY not configured".
  await ctx.route('**/api/commandcode-usage*', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'not configured' }) }))
  const page = await ctx.newPage()
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  const openSession = async () => {
    const row = page.locator('[class$="_sessionRow"]').first()
    await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(2500) }
  }
  await openSession()
  // Fidelity guard (see docs/lib/widgets-state.cjs): snapshot the user's layout
  // on disk, inject the probe layout with the OLDEST stamp, and write the
  // snapshot back with the NEWEST stamp only after the browser has closed.
  const snap = hostState.snapshot('cc-degraded')
  const injected = hostState.inject({ installed: SK, order: SK, maxWidgets: 40, columns: 4, cardSide: 150, railOpen: true })
  await page.evaluate((s) => {
    localStorage.setItem('harness-widgets.state', JSON.stringify(s))
    localStorage.setItem('harness-widgets.state.savedAt', '1')
  }, injected)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await openSession()
  // The rail mounts asynchronously after the session opens: retry until it (or
  // its capsule) is up, then wait for every injected slot before measuring —
  // otherwise the probe reports a phantom "0 cards" failure.
  for (let i = 0; i < 8; i++) {
    const up = await page.evaluate(() => !!document.querySelector('.dsx-stats-rail') || !!document.querySelector('button.dsx-stats-capsule'))
    if (up) break
    await openSession()
    await page.waitForTimeout(1200)
  }
  for (let i = 0; i < 4; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    const cap = page.locator('button.dsx-stats-capsule').first()
    if (!(await cap.count())) break
    await cap.click(); await page.waitForTimeout(600)
  }
  await page.waitForTimeout(2500)
  await page.waitForFunction((n) => document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot').length >= n, SK.length, { timeout: 20000 }).catch(() => {})

  const diag = await page.evaluate(() => ({
    rail: !!document.querySelector('.dsx-stats-rail'),
    slots: document.querySelectorAll('.dsx-stats-card-slot').length,
    state: (() => { try { const s = JSON.parse(localStorage.getItem('harness-widgets.state') || '{}'); return { n: (s.installed || []).length, railOpen: s.railOpen, cols: s.columns } } catch { return null } })(),
    capsule: !!document.querySelector('button.dsx-stats-capsule'),
  }))
  console.log('diag:', JSON.stringify(diag))
  const report = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot'))
    .map((slot) => slot.querySelector(':scope > .dsx-stats-card'))
    .filter(Boolean)
    .map((c) => ({
      title: c.querySelector('.dsx-stats-card-title')?.textContent ?? '',
      legend: c.querySelector('.dsx-stats-card-legend')?.textContent ?? null,
      value: c.querySelector('.dsx-stats-card-value')?.textContent ?? null,
      tip: c.getAttribute('title'),
      skeleton: c.classList.contains('dsx-sk-card'),
    })))

  let failed = 0
  if (report.length !== SK.length) { failed++; console.log(`CARD COUNT MISMATCH: ${report.length} cards, expected ${SK.length}`) }
  report.forEach((c, i) => {
    const id = SK[i] ? SK[i].split('@')[0] : '?'
    const fails = []
    if (c.skeleton) fails.push('card still shows the loading skeleton (a degraded state must resolve)')
    if (c.legend === null || c.legend === '') fails.push('no legend label')
    if (c.legend && /未配置|COMMANDCODE/.test(c.legend)) fails.push(`legend still prints the long hint: ${c.legend}`)
    if (POOL_VIEW.has(id) && c.legend !== 'AllUser') fails.push(`legend "${c.legend}" != AllUser`)
    if (!POOL_VIEW.has(id) && !/窗口/.test(c.legend || '')) fails.push(`legend "${c.legend}" is not the window role word`)
    if (!c.tip || !/未配置/.test(c.tip)) fails.push(`card tooltip lost the hint: ${c.tip}`)
    if (fails.length) failed++
    console.log(`${fails.length ? 'FAIL' : 'ok  '} ${id.padEnd(20)} title="${c.title}" value=${JSON.stringify(c.value)} legend=${JSON.stringify(c.legend)} tip=${JSON.stringify((c.tip || '').slice(0, 42))}`)
    for (const f of fails) console.log(`       ! ${f}`)
  })
  await page.addStyleTag({ content: "* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }" })
  await page.waitForTimeout(300)
  await page.locator('.dsx-stats-rail').first().screenshot({ path: path.join(SHOT_DIR, 'rail-cc-degraded.png') }).catch((e) => console.log('shot failed:', e.message))
  console.log(failed === 0 ? 'CC DEGRADED CARDS: PASS' : `CC DEGRADED CARDS: FAIL (${failed} cards)`)
  await browser.close()
  const restored = hostState.restore(snap)
  console.log('state restored:', JSON.stringify(restored))
  if (!restored.ok) {
    console.error('STATE RESTORE FAILED — recover from', restored.backup)
    process.exit(3)
  }
  process.exit(failed === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(2) })
