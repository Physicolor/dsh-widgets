/**
 * Command Code card redesign probe — docs/probe-cc-cards-preview.cjs
 *
 * Drives the REAL GUI (Playwright + a minted browser-session cookie) into the
 * component market's preview stage and asserts the two cards the user redesigned
 * (2026-09-20) as the stage renders them:
 *
 *   用量 (cc-usage):   the token total is the big figure under the title with its
 *                      unit to the right; the three facts (请求 / 成功率 / 消费)
 *                      are a FIGURES row on the card's floor — the old single
 *                      grey line ellipsized the spend away;
 *   额度 (cc-credits): `69.16 credits` on top and the official site's THREE quota
 *                      rows (5 小时 / 周 / 月: name + percent over a segmented
 *                      bar) — no role word, no reset line;
 *   and BOTH must render as a strict square tile (the preview used to stretch the
 *   credits card to 200×250, which read as a non-square rounded rectangle).
 *
 * Usage: node docs/probe-cc-cards-preview.cjs
 * Leaves: docs/probe-cc-cards-preview-result.json + docs/probe-cc-cards-*.png
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const OUT = path.join(__dirname, 'probe-cc-cards-preview-result.json')
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const AUTHORITY = ORIGIN.replace(/^https?:\/\//, '')
const FONT_CSS = `* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }`
const UNIT = 200
/** The preview mock's own numbers (components.tsx PREVIEW_STATS). */
const MOCK = { tokens: '4.9M', requests: '4821', success: '100%', credits: '69.16', spend: '$0.468' }

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

const READ_CARD = () => {
  const panel = document.querySelector('.dsx-stats-addpanel')
  if (panel === null) return null
  const card = panel.querySelector('.dsx-stats-card')
  if (card === null) return null
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) } }
  const title = card.querySelector('.dsx-stats-card-title')
  const ha = card.querySelector('.dsx-stats-card-headafter')
  const haBig = ha !== null ? ha.querySelector('span') : null
  const haSpans = ha !== null ? Array.from(ha.children) : []
  const grey = haSpans.filter((s) => s !== haBig && s.textContent.trim() !== '')[0] ?? null
  // Figure columns (label over value) and quota rows (label + percent over 24
  // segment cells — React serializes `flex: 1` as `1 1 0%`, so the cells are
  // found through their bar container instead of by style).
  const figLabels = Array.from(card.querySelectorAll('div')).filter((d) => d.children.length === 0 && ['今日用量', '请求', '成功率', '消费'].includes(d.textContent.trim()))
  const barEls = Array.from(card.querySelectorAll('div')).filter((d) => d.children.length === 24)
  const quotaCells = barEls.flatMap((b) => Array.from(b.children))
  const pctSpans = Array.from(card.querySelectorAll('span')).filter((s) => /^\d+(\.\d+)?%$/.test(s.textContent.trim()))
  const lastRow = barEls.length > 0 ? barEls[barEls.length - 1].parentElement : null
  return {
    text: card.textContent.replace(/\s+/g, ' ').trim(),
    card: rect(card),
    title: title !== null ? title.textContent.replace(/\s+/g, ' ').trim() : null,
    legend: card.querySelector('.dsx-stats-card-legend') ? card.querySelector('.dsx-stats-card-legend').textContent.trim() : null,
    headAfterBig: haBig !== null ? haBig.textContent.trim() : null,
    headAfterGrey: grey !== null ? grey.textContent.trim() : null,
    figures: figLabels.map((l) => `${l.textContent.trim()}=${l.nextElementSibling !== null ? l.nextElementSibling.textContent.trim() : ''}`),
    quotaRows: pctSpans.map((s) => s.textContent.trim()),
    quotaCells: quotaCells.length,
    quotaBars: barEls.length,
    filledCells: quotaCells.filter((d) => Number(d.style.opacity) > 0.5).length,
    sub: card.querySelector('.dsx-stats-card-sub') ? card.querySelector('.dsx-stats-card-sub').textContent.trim() : null,
    figuresBox: figLabels.length > 0 ? rect(figLabels[0].parentElement) : null,
    rowsBox: lastRow !== null ? rect(lastRow) : null,
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

  await page.locator('.dsx-stats-add').first().click({ timeout: 8000 })
  await page.waitForTimeout(900)
  await page.locator('.dsx-stats-addpanel .dsx-tab').nth(1).click({ timeout: 8000 })
  await page.waitForTimeout(600)
  await page.locator('.dsx-stats-addpanel .dsx-mcard', { hasText: 'Command Code' }).first().click({ timeout: 8000 })
  await page.waitForTimeout(800)
  await page.addStyleTag({ content: FONT_CSS })
  const shot = async (name) => { await page.screenshot({ path: path.join(__dirname, `probe-cc-cards-${name}.png`) }) }
  const pick = async (label) => {
    const dot = page.locator(`.dsx-stats-addpanel .dsx-dot[aria-label^="${label}"]`).first()
    if (!(await dot.count())) return false
    await dot.click({ timeout: 8000 })
    await page.waitForTimeout(900)
    return true
  }

  // ---- 用量 (cc-usage) ----
  check('the 用量 instance has a preview dot', await pick('用量'))
  const usage = await page.evaluate(READ_CARD)
  check('用量: the preview renders', usage !== null, usage === null ? 'no card' : usage.text)
  if (usage !== null) {
    console.log(`\n用量 : ${usage.text}`)
    await shot('usage')
    check('用量: the tile is a strict square', usage.card.w === UNIT && usage.card.h === UNIT, `${usage.card.w}×${usage.card.h}`)
    check('用量: title is the product name', usage.title === 'Command Code', String(usage.title))
    check('用量: the token total is the big figure under the title', usage.headAfterBig === MOCK.tokens, `${usage.headAfterBig} (mock ${MOCK.tokens})`)
    check('用量: its unit sits to the right', usage.headAfterGrey === 'tokens', String(usage.headAfterGrey))
    check('用量: no role word and no sub line', usage.legend === null && usage.sub === null, `legend=${usage.legend} sub=${usage.sub}`)
    check('用量: the three facts render as a figures row', usage.figures.length === 3, JSON.stringify(usage.figures))
    check('用量: the facts are 请求 / 成功率 / 消费 with the mock values',
      usage.figures.join(' ') === `请求=${MOCK.requests} 成功率=${MOCK.success} 消费=${MOCK.spend}`, JSON.stringify(usage.figures))
    check('用量: the spend carries three significant digits, not four decimals',
      /^\$\d+(\.\d+)?$/.test(MOCK.spend) && !/\.\d{4}/.test(usage.figures.join(' ')), JSON.stringify(usage.figures))
    const innerPad = Math.round(12 * (UNIT / 150))
    check('用量: the figures row sits on the card floor',
      usage.figuresBox !== null && Math.abs(usage.card.bottom - usage.figuresBox.bottom - innerPad) <= 3,
      `figures bottom → card bottom = ${usage.card.bottom - usage.figuresBox.bottom}px (inner pad ${innerPad}px)`)
  }

  // ---- 额度 (cc-credits) ----
  check('the 额度 instance has a preview dot', await pick('额度'))
  const credits = await page.evaluate(READ_CARD)
  check('额度: the preview renders', credits !== null, credits === null ? 'no card' : credits.text)
  if (credits !== null) {
    console.log(`额度 : ${credits.text}`)
    await shot('credits')
    check('额度: the tile is a strict square (was 200×250 before the redesign)', credits.card.w === UNIT && credits.card.h === UNIT, `${credits.card.w}×${credits.card.h}`)
    check('额度: title is the product name', credits.title === 'Command Code', String(credits.title))
    check('额度: the balance is the big figure under the title', credits.headAfterBig === MOCK.credits, `${credits.headAfterBig} (mock ${MOCK.credits})`)
    check('额度: `credits` sits to its right', credits.headAfterGrey === 'credits', String(credits.headAfterGrey))
    check('额度: the 额度 role word and the reset line are gone', credits.legend === null && credits.sub === null, `legend=${credits.legend} sub=${credits.sub}`)
    check('额度: three quota rows with their percents', credits.quotaRows.length === 3, JSON.stringify(credits.quotaRows))
    check('额度: the rows are the segmented bars (24 cells each)', credits.quotaBars === 3 && credits.quotaCells === 72, `bars=${credits.quotaBars} cells=${credits.quotaCells}`)
    // 5h: 0.8367/14 = 6% → 1.4 cells → 1 filled; week: 0.8367/35 = 2% → 0.6 → 1;
    // month: (70 − 69.16)/70 = 1% → 0.3 → 0 filled.
    check('额度: the filled cells follow the percents (6% / 2% / 1% of 24)',
      credits.filledCells === 1 + 1 + 0, `filled=${credits.filledCells} for ${credits.quotaRows.join(' / ')}`)
    check('额度: the rows sit on the card floor',
      credits.rowsBox !== null && Math.abs(credits.card.bottom - credits.rowsBox.bottom - Math.round(12 * (UNIT / 150))) <= 4,
      `rows bottom → card bottom = ${credits.card.bottom - (credits.rowsBox?.bottom ?? 0)}px (inner pad ${Math.round(12 * (UNIT / 150))}px)`)
    check('额度: the card does not clip its own content (rows fit the square)',
      credits.rowsBox !== null && credits.rowsBox.bottom <= credits.card.bottom + 1,
      `rows bottom ${credits.rowsBox?.bottom} vs card bottom ${credits.card.bottom}`)
    check('额度: the rows do not collide with the head',
      credits.rowsBox !== null && credits.headAfterBig !== null && credits.rowsBox.y > credits.card.y + 60,
      `first row y=${credits.rowsBox?.y} vs card top ${credits.card.y}`)
  }

  fs.writeFileSync(OUT, `${JSON.stringify({
    probedAt: new Date().toISOString(),
    origin: ORIGIN,
    usage: usage === null ? null : { box: usage.card, figures: usage.figures, headAfter: [usage.headAfterBig, usage.headAfterGrey] },
    credits: credits === null ? null : { box: credits.card, rows: credits.quotaRows, cells: credits.quotaCells, filled: credits.filledCells, headAfter: [credits.headAfterBig, credits.headAfterGrey] },
    results,
    failed: results.filter((r) => !r.ok).length,
  }, null, 2)}\n`, 'utf8')
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions)  -> ${path.basename(OUT)}`)
  await browser.close()
  process.exit(failed === 0 ? 0 : 1)
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })
