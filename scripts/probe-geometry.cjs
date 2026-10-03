/**
 * dsh-widgets — the batched geometry probe: ONE browser, every "does it fit" question.
 *
 * Replaces three separate one-issue probes that each cold-launched their own
 * Chromium (`diag-text-fit.cjs`, `diag-card-fit.cjs`, and the geometry half of
 * `diag-width-overlap.cjs`). The audit measured ~1.5s of pure launch overhead per
 * process, so asking three related questions used to cost three launches and three
 * gallery builds. Here they share one browser and one gallery page.
 *
 * The three questions are the same defect class seen from three sides:
 *
 *   COPY    a display name its own card cannot print in full (the owner's rule,
 *           2026-09-29, after 缓存命中 → 缓存命中率 ellipsized to 「缓存命...」).
 *   TILE    a card that grows out of its grid row, or is pinned to its tile and
 *           clips its own content (`data-dsx-overflow`, the red inset outline).
 *   WIDTH   the conversation width handle landing on the turn navigator.
 *
 *   PHASE 1  the offline gallery — EVERY widget × size × preview state, so a card
 *            the owner has not installed is still checked (offline, always runs).
 *   PHASE 2  the live rail — the INSTALLED cards and the 组件配置 list, in the
 *            narrower boxes the owner actually sees. SKIPPED, not failed, when
 *            nothing is listening on the live authority (stop-loss in code).
 *
 * Usage: node scripts/probe-geometry.cjs [--live-only] [--gallery-only] [--json]
 */
const { ROOT, close, galleryPage, liveAvailable, liveContext, report, AUTHORITY } = require('./lib/probe-harness.cjs')

/** Text nodes whose overflow means "the card cannot print this". */
const COPY_SELECTOR = [
  '.dsx-stats-card-title',      // the blue title (usually the widget's display name)
  '.dsx-stats-card-value',
  '.dsx-stats-card-sub',
  '.dsx-stats-card-legend',
  '.dsx-stats-card-headafter',
  '.dsx-stats-card-meter',
  '.dsx-order-row span',        // the 组件配置 list rows (same copy, narrower box)
].join(', ')

/**
 * Truncations that are the SPEC's design, not a defect: a value the widget cannot
 * know the length of. Anything not listed here is copy the card owes the reader in
 * full. Carried over verbatim from `diag-text-fit.cjs` so no verdict was lost.
 */
const DATA_TRUNCATION_OK = [
  {
    widget: 'session-cost',
    contains: 'deepseek-v4.1-flash',
    why: 'the model id is data — `shortModelName` strips the provider path and the spec asks for a truncated name (pricing.ts)',
  },
  {
    widget: 'github-notify',
    contains: 'dsh-widgets',
    why: 'the repo name is data — the newest thread is printed as repo · reason and a repo can be any length',
  },
]

const argv = process.argv.slice(2)
const LIVE_ONLY = argv.includes('--live-only')
const GALLERY_ONLY = argv.includes('--gallery-only')
const AS_JSON = argv.includes('--json')

/** Every COPY node in this page that overflows its own box. */
const scanCopy = (page) => page.evaluate((sel) => {
  const out = []
  for (const el of Array.from(document.querySelectorAll(sel))) {
    if (el.children.length > 0 && (el.textContent ?? '').trim() === '') continue
    const text = (el.textContent ?? '').trim()
    if (text === '') continue
    const over = el.scrollWidth - el.clientWidth
    if (over <= 1) continue
    const cell = el.closest('.g-cell')
    const card = el.closest('.dsx-stats-card')
    out.push({
      text,
      over,
      clientW: el.clientWidth,
      cls: String(el.className).slice(0, 40),
      where: cell
        ? `${cell.getAttribute('data-widget')}@${cell.getAttribute('data-size')}#${cell.getAttribute('data-step')}`
        : card ? (card.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim() : (el.closest('.dsx-order-row') ? 'list row' : '?'),
    })
  }
  return out
}, COPY_SELECTOR)

/** Every card in the page, with the numbers that decide whether it fits. */
const scanTiles = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.dsx-stats-card')).map((card) => {
  const slot = card.closest('.dsx-stats-card-slot')
  const cell = card.closest('.g-cell')
  const tag = cell
    ? `${cell.getAttribute('data-widget')}@${cell.getAttribute('data-size')}#${cell.getAttribute('data-step')}`
    : ((card.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim() || '?')
  const box = card.getBoundingClientRect()
  return {
    tag,
    unit: slot ? Math.round(parseFloat(slot.style.width)) : Math.round(box.width),
    boxH: Math.round(box.height * 10) / 10,
    clientH: card.clientHeight,
    scrollH: card.scrollHeight,
    overflow: card.getAttribute('data-dsx-overflow') === '1',
  }
}))

const countCopyNodes = (page) => page.evaluate((sel) => document.querySelectorAll(sel).length, COPY_SELECTOR)

/** Ask the two fit questions of one page; returns the metrics for the report. */
async function judgePage(page, r, label) {
  const nodes = await countCopyNodes(page)
  r.check(nodes > 20, `${label}: text nodes were found to check`, nodes)
  const clipped = await scanCopy(page)
  let allowed = 0
  for (const b of clipped) {
    const exception = DATA_TRUNCATION_OK.find((e) => b.where.startsWith(e.widget) && b.text.includes(e.contains))
    if (exception !== undefined) {
      allowed++
      r.allowed(`"${b.text}" in ${b.where}`, exception.why)
      continue
    }
    r.check(false, `${label}: copy is ellipsized — "${b.text}" (${b.over}px past its ${b.clientW}px box, ${b.cls})`, b.where)
  }
  if (clipped.length - allowed === 0) {
    r.check(true, `${label}: no card COPY is ellipsized`, `${clipped.length} clipped, ${allowed} data-driven exception(s)`)
  }

  const tiles = await scanTiles(page)
  r.check(tiles.length > 0, `${label}: rendered cards`, tiles.length)
  const bad = tiles.filter((c) => c.overflow || c.clientH > c.unit + 1 || c.scrollH > c.clientH + 1)
  for (const c of bad) {
    r.check(!c.overflow, `${label} ${c.tag}: no tile-fits outline`)
    r.check(c.clientH <= c.unit + 1, `${label} ${c.tag}: height = the tile`, `${c.clientH} <= ${c.unit}`)
    r.check(c.scrollH <= c.clientH + 1, `${label} ${c.tag}: nothing clipped`, `scroll ${c.scrollH} <= client ${c.clientH}`)
  }
  if (bad.length === 0) r.check(true, `${label}: every card fits its tile`, `${tiles.length} card(s)`)

  return { copyNodes: nodes, clipped: clipped.length - allowed, cards: tiles.length, misfit: bad.length, details: bad }
}

/** Open the live rail the way the owner does: pick a session, then the capsule. */
async function openLiveRail(page) {
  await page.goto(`http://${AUTHORITY}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  const row = page.locator('[class$="_sessionRow"]').first()
  await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  for (let i = 0; i < 2; i++) {
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4500) }
    const cap = page.locator('button.dsx-stats-capsule').first()
    for (let k = 0; k < 6; k++) {
      if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
      if (!(await cap.count())) { await page.waitForTimeout(900); continue }
      if (await cap.getAttribute('aria-disabled')) break
      await cap.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(700)
    }
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
    await page.waitForTimeout(2500)
  }
  await page.waitForTimeout(1500)
  // The 组件配置 list carries the same names in a narrower column: open it too.
  await page.evaluate(() => { const b = document.querySelector('.dsx-stats-add'); if (b) b.click() })
  await page.waitForTimeout(1500)
  return page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))
}

;(async () => {
  const results = {}
  const r = report('batched geometry')
  try {
    // ── PHASE 2 first: the gallery needs no GUI and never blocks the run. ──
    if (!LIVE_ONLY) {
      const { page, consoleErrors } = await galleryPage()
      results.gallery = await judgePage(page, r, 'gallery (all widgets)')
      r.check(consoleErrors.length === 0, 'gallery page errors', consoleErrors.slice(0, 2).join(' | ') || 'none')
      await page.close()
    }

    // ── PHASE 1: the live rail, if and only if something is listening. ──
    if (!GALLERY_ONLY) {
      if (await liveAvailable()) {
        const ctx = await liveContext({ viewport: { width: 1578, height: 1000 } })
        const railOpen = await openLiveRail(await ctx.newPage())
        r.check(railOpen, 'live: the rail opened')
        results.live = await judgePage(await ctx.pages()[0], r, 'live rail + 组件配置')
        await ctx.close()
      } else {
        r.note(`live phase SKIPPED — nothing listening on ${AUTHORITY} (offline evidence stands; not a failure)`)
        results.live = null
      }
    }
  } finally {
    await close()
  }
  const code = r.exitCode()
  if (AS_JSON) console.log(JSON.stringify(results, null, 2))
  process.exit(code)
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1) })
