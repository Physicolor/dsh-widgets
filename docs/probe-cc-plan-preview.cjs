/**
 * 套餐 (cc-subscription) preview probe — docs/probe-cc-plan-preview.cjs
 *
 * Drives the REAL GUI (Playwright + a minted browser-session cookie) into the
 * component market's preview stage and asserts the design the user asked for
 * (2026-09-20):
 *
 *   - the blue title is `Command Code`, the grey line under it is the PERIOD
 *     (`账期 10-10`) — the raw `individual-goat` id is gone from the tile;
 *   - the big figure is the TIER BADGE (GOAT / PRO / MAX …) on the card's floor;
 *   - clicking the PREVIEW card walks the plan ladder, so every badge can be
 *     eyeballed without owning that plan: GOAT → PRO → MAX → ULTRA → PROVIDER →
 *     GO → TEAMS PRO → GOAT.
 *
 * Usage: node docs/probe-cc-plan-preview.cjs
 * Leaves: docs/probe-cc-plan-preview-result.json + docs/probe-cc-plan-*.png
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const OUT = path.join(__dirname, 'probe-cc-plan-preview-result.json')
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const AUTHORITY = ORIGIN.replace(/^https?:\/\//, '')
const FONT_CSS = `* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }`
/** The ladder the preview must walk, in order (see PLAN_TIER_STEPS). */
const LADDER = ['GOAT', 'PRO', 'MAX', 'ULTRA', 'PROVIDER', 'GO', 'TEAMS PRO']

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

/** Read the preview card inside the add panel (the panel is portaled to body). */
const READ_PREVIEW = () => {
  const panel = document.querySelector('.dsx-stats-addpanel')
  if (panel === null) return null
  const card = panel.querySelector('.dsx-stats-card')
  if (card === null) return null
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) } }
  const title = card.querySelector('.dsx-stats-card-title')
  const titleSpan = title !== null ? title.querySelector('span') : null
  const legend = card.querySelector('.dsx-stats-card-legend')
  const value = card.querySelector('.dsx-stats-card-value')
  const headAfter = card.querySelector('.dsx-stats-card-headafter')
  const text = card.textContent.replace(/\s+/g, ' ').trim()
  return {
    text,
    title: titleSpan !== null ? titleSpan.textContent.trim() : null,
    titleEllipsized: titleSpan !== null ? titleSpan.scrollWidth > titleSpan.clientWidth + 1 : null,
    legend: legend !== null ? legend.textContent.trim() : null,
    value: value !== null ? value.textContent.trim() : null,
    valueBox: value !== null ? rect(value) : null,
    legendBox: legend !== null ? rect(legend) : null,
    headAfter: headAfter !== null ? headAfter.textContent.replace(/\s+/g, ' ').trim() : null,
    card: rect(card),
    slot: rect(card.parentElement),
  }
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
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
  await page.waitForTimeout(800)

  // ---- open the add panel and walk to the 套餐 preview ----
  await page.locator('.dsx-stats-add').first().click({ timeout: 8000 })
  await page.waitForTimeout(900)
  const marketTab = page.locator('.dsx-stats-addpanel .dsx-tab').nth(1)
  await marketTab.click({ timeout: 8000 })
  await page.waitForTimeout(600)
  const ccCard = page.locator('.dsx-stats-addpanel .dsx-mcard', { hasText: 'Command Code' }).first()
  check('the market lists the Command Code group', await ccCard.count() > 0, `cards=${await ccCard.count()}`)
  await ccCard.click({ timeout: 8000 })
  await page.waitForTimeout(800)
  const dot = page.locator('.dsx-stats-addpanel .dsx-dot[aria-label^="套餐"]').first()
  const dotCount = await page.locator('.dsx-stats-addpanel .dsx-dot').count()
  check('the 套餐 instance has its own preview dot', await dot.count() > 0, `dots=${dotCount}`)
  if (await dot.count()) { await dot.click({ timeout: 8000 }); await page.waitForTimeout(800) }
  await page.addStyleTag({ content: FONT_CSS })

  const first = await page.evaluate(READ_PREVIEW)
  check('the preview stage renders the 套餐 card', first !== null, first === null ? 'no card' : first.text)
  if (first === null) {
    fs.writeFileSync(OUT, `${JSON.stringify({ probedAt: new Date().toISOString(), results }, null, 2)}\n`)
    await browser.close()
    process.exit(1)
  }
  console.log(`\npreview card: title=${JSON.stringify(first.title)} legend=${JSON.stringify(first.legend)} value=${JSON.stringify(first.value)} headAfter=${JSON.stringify(first.headAfter)}`)
  const shot = async (name) => { await page.screenshot({ path: path.join(__dirname, `probe-cc-plan-${name}.png`) }) }
  await shot('1-goat')

  // ---- the design the user asked for ----
  check('the title is the product name', first.title === 'Command Code', String(first.title))
  check('the title is not ellipsized', first.titleEllipsized === false, String(first.titleEllipsized))
  check('the grey line under the title is the PERIOD (not 套餐, not the raw plan id)',
    /^(账期|Ends) \d{1,2}-\d{1,2}/.test(first.legend ?? ''), JSON.stringify(first.legend))
  check('the raw plan id is nowhere on the tile', !first.text.includes('individual-'), first.text)
  check('the big figure is the tier badge', first.value === 'GOAT', String(first.value))
  check('the badge is NOT in a headAfter row (it belongs to the card floor)', first.headAfter === null, JSON.stringify(first.headAfter))
  check('the badge sits below the grey line (bottom-left posture)',
    first.valueBox !== null && first.legendBox !== null && first.valueBox.y > first.legendBox.y,
    `badge y=${first.valueBox?.y} legend y=${first.legendBox?.y}`)
  check('the badge is the largest text on the card',
    first.valueBox !== null && first.legendBox !== null && first.valueBox.h > first.legendBox.h,
    `badge ${first.valueBox?.h}px vs legend ${first.legendBox?.h}px`)

  // ---- a preview click walks the plan ladder ----
  const seen = [first.value]
  for (let i = 1; i < LADDER.length + 1; i++) {
    const box = first.slot
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2)
    await page.waitForTimeout(500)
    const snap = await page.evaluate(READ_PREVIEW)
    const badge = snap === null ? null : snap.value
    seen.push(badge)
    console.log(`click ${i}: badge=${JSON.stringify(badge)} legend=${JSON.stringify(snap?.legend)}`)
    if (i <= LADDER.length) await shot(`${i + 1}-${String(badge).toLowerCase().replace(/\s+/g, '-')}`)
    if (snap !== null) {
      check(`click ${i}: the period line is unchanged`, snap.legend === first.legend, `${snap.legend}`)
      check(`click ${i}: the raw plan id stays off the tile`, !snap.text.includes('individual-'), snap.text)
    }
  }
  check('a preview click walks the whole plan ladder, then wraps',
    JSON.stringify(seen) === JSON.stringify([...LADDER, LADDER[0]]),
    seen.join(' → '))

  fs.writeFileSync(OUT, `${JSON.stringify({
    probedAt: new Date().toISOString(),
    origin: ORIGIN,
    first,
    ladder: seen,
    results,
    failed: results.filter((r) => !r.ok).length,
  }, null, 2)}\n`, 'utf8')
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions)  -> ${path.basename(OUT)}`)
  await browser.close()
  process.exit(failed === 0 ? 0 : 1)
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })
