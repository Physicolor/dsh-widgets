/**
 * Loading-skeleton SHAPE probe (docs/verify-skeleton-shapes.cjs)
 *
 * Holds every live route the rail fetches (sysinfo / command-code usage / the
 * OpenCode usage pair) open forever, so the usage / Command Code / system card
 * families stay in their loading state, then measures the placeholder BLOCKS of
 * every skeleton card:
 *
 *   - count + geometry of the `.dsx-sk` blocks (rect, radius, row/column order);
 *   - that a ring card draws N SQUARE blocks, a bar / line / heatmap card ONE
 *     wide block, a figure row N short blocks in a row and a quota card N
 *     stacked bars — the silhouette the user asked for, instead of a stack of
 *     identical thin pills;
 *   - that the skeleton still fits its slot (no overflow) and keeps the real
 *     card's corner radius.
 *
 * It snapshots and restores `/api/widgets-state` (user data) around the run, and
 * injects only the 19 data-backed instances so the whole family is on screen.
 *
 * Run: node docs/verify-skeleton-shapes.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')
const hostState = require('./lib/widgets-state.cjs')

const ORIGIN = 'http://127.0.0.1:3080'
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const SHOT_DIR = path.join(__dirname, 'verify-skeleton-shapes')
const HELD = [
  '**/api/sysinfo*',
  '**/api/commandcode-usage*',
  '**/api/opencode-usage*',
  '**/api/opencode-usage-multi*',
]
/** The data-backed instances, in rail order (order === installed). */
const SK = [
  'usage-bars@2x2',
  'usage-rings@2x2',
  'usage-rolling@2x2',
  'usage-weekly@2x2',
  'usage-monthly@2x2',
  'quota-manage@2x2',
  'cc-whoami@2x2',
  'cc-usage@2x2',
  'cc-credits@2x2',
  'cc-subscription@2x2',
  'cc-windows@2x2',
  'cc-window-5h@2x2',
  'cc-window-weekly@2x2',
  'cc-window-monthly@2x2',
  'sys-cpu@2x2',
  'sys-gpu@2x2',
  'sys-gpu-line@2x2',
  'sys-rings@2x2',
  'sys-board@2x4',
]
/** Expected silhouette per widget id: shape + block count. */
const EXPECT = {
  'usage-bars': { shape: 'bars', n: 1 },
  'usage-rings': { shape: 'rings', n: 3 },
  'usage-rolling': { shape: 'text', n: 2 },
  'usage-weekly': { shape: 'text', n: 2 },
  'usage-monthly': { shape: 'text', n: 2 },
  'quota-manage': { shape: 'figures', n: 2 },
  'cc-whoami': { shape: 'text', n: 2 },
  'cc-usage': { shape: 'figures', n: 3 },
  'cc-credits': { shape: 'quotas', n: 3 },
  'cc-subscription': { shape: 'text', n: 2 },
  'cc-windows': { shape: 'rings', n: 3 },
  'cc-window-5h': { shape: 'text', n: 2 },
  'cc-window-weekly': { shape: 'text', n: 2 },
  'cc-window-monthly': { shape: 'text', n: 2 },
  'sys-cpu': { shape: 'text', n: 2 },
  'sys-gpu': { shape: 'text', n: 2 },
  'sys-gpu-line': { shape: 'line', n: 1 },
  'sys-rings': { shape: 'rings', n: 2 },
  'sys-board': { shape: 'rings', n: 4 },
}
const FONT_CSS = "* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }"

/** Judge one card's blocks against its expected silhouette. */
function judge(id, exp, card) {
  const b = card.blocks
  const fails = []
  if (!card.skeleton) fails.push('card is NOT a skeleton card')
  if (b.length !== exp.n) fails.push(`blocks ${b.length} != expected ${exp.n}`)
  if (card.overflow > 1) fails.push(`overflows its slot by ${card.overflow}px`)
  if (exp.shape === 'rings') {
    for (const [i, k] of b.entries()) {
      if (Math.abs(k.w - k.h) > 2) fails.push(`ring ${i} not square (${k.w}x${k.h})`)
      // A ring block must read as a rounded SQUARE, not a thin pill.
      if (k.h < 20) fails.push(`ring ${i} too short (${k.h})`)
    }
    const ys = new Set(b.map((k) => Math.round(k.y)))
    if (b.length > 1 && ys.size !== 1) fails.push(`ring blocks are not on one row (y=${[...ys].join('/')})`)
  }
  if (exp.shape === 'bars' || exp.shape === 'line' || exp.shape === 'heatmap') {
    // ONE big rounded block: it owns the card's content area (full width, and
    // most of the height left under the title) — the user's rule that a bar
    // chart's placeholder is a single large rounded rectangle.
    const k = b[0]
    if (k && k.w < card.cardW * 0.7) fails.push(`chart block not full width (${k.w} of ${card.cardW})`)
    if (k && k.h < card.cardH * 0.35) fails.push(`chart block too short (${k.h} of ${card.cardH})`)
    if (k && parseFloat(k.br) < 4) fails.push(`chart block not rounded (${k.br})`)
  }
  if (exp.shape === 'figures') {
    const ys = new Set(b.map((k) => Math.round(k.y)))
    if (b.length > 1 && ys.size !== 1) fails.push(`figures not on one row (y=${[...ys].join('/')})`)
  }
  if (exp.shape === 'quotas') {
    const xs = new Set(b.map((k) => Math.round(k.x)))
    const ys = b.map((k) => Math.round(k.y))
    if (xs.size !== 1) fails.push(`quota bars not in one column (x=${[...xs].join('/')})`)
    for (let i = 1; i < ys.length; i++) if (ys[i] <= ys[i - 1]) fails.push('quota bars not stacked top→bottom')
  }
  if (exp.shape === 'text') {
    // value pill (narrow) then body rows (wider), all in one column.
    const xs = new Set(b.map((k) => Math.round(k.x)))
    if (xs.size !== 1) fails.push(`text skeleton not in one column (x=${[...xs].join('/')})`)
  }
  return fails
}

;(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1200 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  const held = []
  for (const url of HELD) await ctx.route(url, (route) => { held.push(route.request().url()); /* never fulfill */ })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  const openSession = async () => {
    const row = page.locator('[class$="_sessionRow"]').first()
    await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(2500) }
  }
  await openSession()

  // Fidelity guard: the user's rail layout is snapshotted on disk, the probe
  // layout is injected with the OLDEST stamp (so a real page always wins), and
  // the snapshot is written back with the NEWEST stamp AFTER the browser closes
  // (see docs/lib/widgets-state.cjs — the probe of 2026-09-20 used to hand the
  // injected layout back to the user by restoring an older savedAt).
  const snap = hostState.snapshot('skeleton-shapes')
  const injected = hostState.inject({ installed: SK, order: SK, maxWidgets: 40, columns: 4, cardSide: 150, railOpen: true })
  await page.evaluate((s) => {
    localStorage.setItem('harness-widgets.state', JSON.stringify(s))
    localStorage.setItem('harness-widgets.state.savedAt', '1')
  }, injected)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await openSession()
  // The rail mounts asynchronously after the session opens (and after a reload
  // the session may need re-opening): retry until the rail OR its capsule is
  // on screen, so a slow first paint cannot masquerade as "no skeleton cards".
  for (let i = 0; i < 8; i++) {
    const ready = await page.evaluate(() => !!document.querySelector('.dsx-stats-rail') || !!document.querySelector('button.dsx-stats-capsule'))
    if (ready) break
    await openSession()
    await page.waitForTimeout(1200)
  }
  await page.waitForTimeout(1500)

  const report = await page.evaluate(() => {
    const out = []
    for (const slot of Array.from(document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot'))) {
      const card = slot.querySelector(':scope > .dsx-stats-card')
      if (!card) continue
      const title = card.querySelector('.dsx-stats-card-title')
      const cb = card.getBoundingClientRect()
      const blocks = Array.from(card.querySelectorAll('.dsx-sk')).map((el) => {
        const r = el.getBoundingClientRect()
        return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +(r.left - cb.left).toFixed(1), y: +(r.top - cb.top).toFixed(1), br: getComputedStyle(el).borderRadius }
      })
      out.push({
        title: title ? title.textContent : '',
        skeleton: card.classList.contains('dsx-sk-card'),
        cardW: +cb.width.toFixed(1),
        cardH: +cb.height.toFixed(1),
        overflow: card.scrollHeight - card.clientHeight,
        blocks,
      })
    }
    return out
  })

  await page.addStyleTag({ content: FONT_CSS })
  await page.waitForTimeout(300)
  const rail = page.locator('.dsx-stats-rail').first()
  await rail.screenshot({ path: path.join(SHOT_DIR, 'rail-skeleton.png') }).catch((e) => console.log('shot failed:', e.message))
  // A close-up of the first two rows, so the block silhouettes are legible.
  const first = page.locator('.dsx-stats-rail .dsx-stats-card-slot').first()
  await first.screenshot({ path: path.join(SHOT_DIR, 'card-usage-bars.png') }).catch(() => {})

  console.log('held routes:', JSON.stringify([...new Set(held)].map((u) => u.replace(ORIGIN, ''))))
  console.log('rail cards:', report.length, '(expected', SK.length, ')')
  let failed = 0
  report.forEach((c, i) => {
    const key = SK[i]
    const id = key ? key.split('@')[0] : '?'
    const exp = EXPECT[id]
    const fails = exp ? judge(id, exp, c) : ['no expectation']
    if (fails.length) failed++
    console.log(`${fails.length ? 'FAIL' : 'ok  '} ${String(id).padEnd(20)} title="${c.title}" sk=${c.skeleton} ${c.cardW}x${c.cardH} ovf=${c.overflow} blocks=${c.blocks.length} ${c.blocks.map((b) => `${b.w}x${b.h}@(${b.x},${b.y})r${b.br}`).join(' ')}`)
    for (const f of fails) console.log(`       ! ${f}`)
  })
  console.log('page errors:', JSON.stringify(errs))
  console.log(failed === 0 ? 'SKELETON SHAPES: PASS' : `SKELETON SHAPES: FAIL (${failed} cards)`)

  await browser.close()
  // Restore only after the browser is gone: a live page could otherwise flush
  // the injected layout (stamp 1) back over the restored state.
  const restored = hostState.restore(snap)
  console.log('state restored:', JSON.stringify(restored))
  if (!restored.ok) {
    console.error('STATE RESTORE FAILED — recover from', restored.backup)
    process.exit(3)
  }
  process.exit(failed === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(2) })
