/**
 * dsh-widgets — LIVE acceptance for the two time cards (时钟 / 日历).
 *
 * WHY A LIVE PROBE, when the offline gallery already renders `CardBody` with the
 * real theme tokens: the gallery bundles the render closure from SOURCE, while the
 * running GUI loads `lib/client.js` from this checkout through the profile's
 * junction. Only a live page proves the SHIPPED bundle — discovery, dictionary,
 * registry and renderer together — actually mounts the two cards on a real rail,
 * with a real session behind it.
 *
 * It does not touch the user's own rail: the layout is seeded into THIS browser
 * context's localStorage (`harness-widgets.state`, the plugin's own fast cache)
 * before the page loads, and the context is thrown away at the end — nothing is
 * written to the host state file, so the owner's cards are exactly as they were.
 *
 * Usage:
 *   node scripts/verify-clock-calendar-live.cjs
 *   node scripts/verify-clock-calendar-live.cjs --authority 127.0.0.1:3080
 *
 * Exit codes: 0 = both cards rendered; 1 = a card is missing/wrong; 2 = no rail
 * (no GUI on that authority, or no session to enter — not a widget defect).
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { chromium } = require('./lib/playwright-core.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const argv = process.argv.slice(2)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const AUTHORITY = val('--authority', process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:19387')
const BASE = `http://${AUTHORITY}`
const OUT = path.join(__dirname, '..', '.tmp-live-clock-calendar')

/** The rail layout this run seeds: the two new cards and nothing else. */
const SEED = {
  installed: ['clock@2x2', 'calendar@2x2'],
  order: ['clock@2x2', 'calendar@2x2'],
  columns: 2,
  maxRows: 1,
  maxWidgets: 2,
  cardSide: 150,
  squircle: true,
  cornerPercent: 16,
}

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  // Seeded BEFORE the app boots (addInitScript runs on every navigation, ahead of
  // the page's own scripts) and stamped NOW, so this context's cache wins over the
  // host store for this run only.
  await ctx.addInitScript((seed) => {
    try {
      localStorage.setItem('harness-widgets.state', JSON.stringify(seed))
      localStorage.setItem('harness-widgets.state.savedAt', String(Date.now()))
    } catch { /* private mode */ }
  }, SEED)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('[live] pageerror: ' + e.message))
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => {
    console.error(`[live] cannot reach ${BASE}: ${e.message}`)
    process.exit(2)
  })
  await page.waitForTimeout(4000)
  // The rail only mounts inside a conversation: open the newest session.
  await page.locator('[class$="_sessionRow"]').first().click({ timeout: 8000 })
    .catch((e) => { console.error('[live] no session row: ' + e.message); process.exit(2) })
  await page.waitForTimeout(6000)
  if (await page.evaluate(() => !!document.querySelector('.dsx-stats-drawer[data-retired]'))) {
    await page.locator('.dsx-stats-capsule').first().click({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(3000)
  }
  if (await page.$('.dsx-stats-rail') === null) {
    console.error(`[live] no rail on ${BASE} — is a session open?`)
    process.exit(2)
  }
  // A product toast can land over a card exactly when the shot is taken (measured
  // 2026-10-14: a 「不再提醒」 banner covered the calendar). Dismiss it — this
  // context is thrown away at the end, so the click cannot affect the owner's page.
  const toast = page.getByText('不再提醒', { exact: true }).first()
  if (await toast.count() > 0) {
    await toast.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(600)
  }

  const report = await page.evaluate(() => {
    const out = []
    for (const card of document.querySelectorAll('.dsx-stats-card')) {
      const svg = card.querySelector('svg')
      // The dial's <text> nodes: the twelve numerals plus the zone pill's caption.
      // The NUMERALS are identified by value, not by count — the pill comes and goes
      // with the card's config, so counting text nodes alone would be a flaky check.
      const texts = svg === null ? [] : [...svg.querySelectorAll('text')].map((t) => t.textContent ?? '')
      const text = (card.textContent ?? '').replace(/\s+/g, ' ').trim()
      out.push({
        // These two cards carry NO TITLE (docs/design/CARD-TITLE-STANDARD.md, T1):
        // `CardBody` drops the whole head row, so the title element must be ABSENT —
        // not merely empty — and the kind is read off the BODY instead.
        titleEl: card.querySelector('.dsx-stats-card-title') !== null,
        kind: texts.filter((t) => /^(1[0-2]|[1-9])$/.test(t)).length >= 12
          ? 'dial'
          : (/\d{2}:\d{2}/.test(text) ? 'digital' : (/\d{4}年\d{1,2}月/.test(text) ? 'month' : 'other')),
        svg: svg !== null,
        numeralsMissing: Array.from({ length: 12 }, (_, i) => String(i + 1)).filter((n) => texts.indexOf(n) === -1),
        text,
        // The card's own overflow guard writes this attribute; a card that does not
        // fit its tile is a defect, not a style difference.
        overflow: card.hasAttribute('data-dsx-overflow'),
        box: { w: Math.round(card.getBoundingClientRect().width), h: Math.round(card.getBoundingClientRect().height) },
      })
    }
    return out
  })
  console.log('[live] cards on the rail:', JSON.stringify(report, null, 1))

  /** Screenshot the first card of a kind (read from the body, never the title). */
  const grab = async (kind, file) => {
    const el = await page.evaluateHandle((want) => {
      for (const card of document.querySelectorAll('.dsx-stats-card')) {
        const texts = [...card.querySelectorAll('svg text')].map((t) => t.textContent ?? '')
        const text = (card.textContent ?? '').replace(/\s+/g, ' ').trim()
        const k = texts.filter((t) => /^(1[0-2]|[1-9])$/.test(t)).length >= 12
          ? 'dial'
          : (/\d{2}:\d{2}/.test(text) ? 'digital' : (/\d{4}年\d{1,2}月/.test(text) ? 'month' : 'other'))
        if (k === want) return card
      }
      return null
    }, kind)
    const node = el.asElement()
    if (node === null) return false
    await node.screenshot({ path: path.join(OUT, file) })
    return true
  }
  const shotClock = await grab('dial', 'clock.png')
  const shotCal = await grab('month', 'calendar.png')
  await browser.close()

  const clock = report.find((c) => c.kind === 'dial')
  const calendar = report.find((c) => c.kind === 'month')
  const problems = []
  if (clock === undefined) problems.push('the 时钟 card (a dial) is not on the rail')
  else {
    if (clock.titleEl) problems.push('the clock still draws a title element (the head row should be gone)')
    if (!clock.svg) problems.push('the clock drew no dial (no <svg>)')
    if (clock.numeralsMissing.length > 0) problems.push(`the dial is missing the numerals ${clock.numeralsMissing.join(', ')}`)
    if (clock.overflow) problems.push('the clock card does not fit its tile (data-dsx-overflow)')
    if (clock.box.h !== 150) problems.push(`the clock card is ${clock.box.h}px tall, expected 150`)
  }
  if (calendar === undefined) problems.push('the 日历 card (a month grid) is not on the rail')
  else {
    if (calendar.titleEl) problems.push('the calendar still draws a title element (the head row should be gone)')
    if (!/(一|二|三|四|五|六|日)/.test(calendar.text)) problems.push('the calendar printed no weekday header')
    if (!/\d{4}年\d{1,2}月/.test(calendar.text)) problems.push(`the calendar printed no month caption: ${calendar.text}`)
    if (calendar.overflow) problems.push('the calendar card does not fit its tile (data-dsx-overflow)')
    if (calendar.box.h !== 150) problems.push(`the calendar card is ${calendar.box.h}px tall, expected 150`)
  }
  console.log(`[live] shots: ${shotClock ? 'clock.png' : 'MISSING'} ${shotCal ? 'calendar.png' : 'MISSING'} → ${OUT}`)
  if (problems.length > 0) {
    for (const p of problems) console.error(`[live] FAIL ${p}`)
    process.exit(1)
  }
  console.log('[live] PASS — both title-less cards mount, lay out and draw on the live rail')
})().catch((e) => { console.error('[live] SCRIPT_FAIL', e); process.exit(1) })
