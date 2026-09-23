/**
 * 对话轨迹 verification probe — attaches to the ALREADY-RUNNING headless
 * Chrome (CDP 9333, authenticated profile) instead of launching a fresh one
 * (a fresh browser has no signed cookie and gets the 401 auth page).
 *
 * Two measurements, both taken ENTIRELY inside the page (handle passing proved
 * flaky for the market pane):
 *   1. Market preview — the widget rendered from PREVIEW_STATS (no mutation).
 *   2. Live rail card — added, measured, then removed, with the host state
 *      (/api/widgets-state) snapshotted and restored around it (the same
 *      fidelity guard docs/market-test.cjs uses).
 */
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

/** In-page measurement of a `.dsx-lanes` element held in `root`. */
const LANE_BODY = `
  const lanes = root
  const rows = Array.from(lanes.querySelectorAll('.dsx-lane-row'))
  const segs = Array.from(lanes.querySelectorAll('.dsx-lane-seg'))
  const box = lanes.getBoundingClientRect()
  const card = lanes.closest('.dsx-stats-card')
  const cardBox = card ? card.getBoundingClientRect() : null
  const slot = lanes.closest('.dsx-stats-card-slot')
  const round = (n) => Math.round(n * 10) / 10
  const byRow = rows.map((r) => {
    const cs = Array.from(r.querySelectorAll('.dsx-lane-seg'))
    const rb = r.getBoundingClientRect()
    return {
      color: cs.length ? getComputedStyle(cs[0]).backgroundColor : null,
      n: cs.length,
      widths: cs.slice(0, 4).map((s) => round(s.getBoundingClientRect().width)),
      lefts: cs.slice(0, 4).map((s) => round(s.getBoundingClientRect().left)),
      rowW: round(rb.width),
      rowH: round(rb.height),
    }
  })
  return {
    found: true,
    rows: rows.length,
    segments: segs.length,
    laneBox: { w: round(box.width), h: round(box.height) },
    byRow,
    fillsLane: byRow.map((r) => (r.n === 0 ? null : r.widths[0] + (r.n - 1) * (r.widths[1] ?? r.widths[0]))),
    cardH: cardBox ? round(cardBox.height) : null,
    slotH: slot ? round(slot.getBoundingClientRect().height) : null,
    laneTopPctOfCard: cardBox ? Math.round(((box.top - cardBox.top) / cardBox.height) * 1000) / 10 : null,
    laneHeightPctOfCard: cardBox ? Math.round((box.height / cardBox.height) * 1000) / 10 : null,
    cardOverflow: card ? card.scrollHeight - card.clientHeight : null,
    title: card ? (card.querySelector('.dsx-stats-card-title')?.textContent ?? null) : null,
    legend: card ? (card.querySelector('.dsx-stats-card-legend')?.textContent ?? null) : null,
    tooltips: segs.slice(0, 4).map((s) => s.getAttribute('title')),
  }
`

// Scoped to the ADD PANEL: once the widget is in the rail, a bare
// `document.querySelector('.dsx-lanes')` matches the rail card first.
const PREVIEW_EXPR = `(() => {
  const root = document.querySelector('.dsx-stats-addpanel .dsx-lanes')
  if (!root) return { found: false, laneCount: document.querySelectorAll('.dsx-stats-addpanel .dsx-lanes').length }
  ${LANE_BODY}
})()`

const LIVE_EXPR = `(() => {
  const slotEls = Array.from(document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot'))
  const holder = slotEls.find((s) => (s.querySelector('.dsx-stats-card-title')?.textContent ?? '').includes('对话轨迹'))
  if (!holder) return { found: false, titles: slotEls.map((s) => s.querySelector('.dsx-stats-card-title')?.textContent ?? null) }
  const root = holder.querySelector('.dsx-lanes')
  if (!root) return { found: false, inSlot: true }
  ${LANE_BODY}
})()`

;(async () => {
  const PREVIEW_ONLY = process.argv.includes('--preview-only')
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
  const ctx = browser.contexts()[0]
  const page = ctx.pages()[0] ?? await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 200)))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  const original = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    return r.ok ? await r.json() : null
  })
  // savedAt MUST be >= now: the plugin's boot sync pushes the NEWER of
  // host/local, so restoring with the snapshot's OLD stamp lets a page whose
  // local prefs still list the probe instance push it back.
  const restore = () => page.evaluate(async (orig) => {
    if (!orig) return 'no-snapshot'
    const r = await fetch('/api/widgets-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: Math.max(Date.now(), Number(orig.savedAt) || 0), state: orig.state || {} }),
    }).catch(() => null)
    return r ? r.status : 'failed'
  }, original)
  console.log('STATE_SNAPSHOT:', original ? 'ok' : 'null',
    '| trajectory already installed:', JSON.stringify((original?.state?.installed ?? []).filter((x) => x.startsWith('trajectory'))))

  // NOTE: dispatch SYNTHETIC clicks inside the add panel — the OFFICIAL right
  // sidebar's width handle overlaps it, so real mouse events land on the handle.
  const dclick = (loc) => loc.first().dispatchEvent('click')

  if (await page.locator('.dsx-stats-add').count() === 0) {
    const cap = page.locator('button.dsx-stats-capsule').first()
    if (await cap.count()) { await cap.click(); await page.waitForTimeout(1200) }
  }
  const addBtn = page.locator('.dsx-stats-add').first()
  console.log('ADD_BTN:', await addBtn.count())
  if (await addBtn.count()) { await addBtn.dispatchEvent('click'); await page.waitForTimeout(900) }

  // ---- 1. Market preview (no mutation) ----
  await dclick(page.locator('button.dsx-tab:has-text("组件市场")'))
  await page.waitForTimeout(700)
  const groups = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-mname')).map((n) => n.textContent))
  const sysIdx = groups.findIndex((g) => g === '系统' || g === 'System')
  console.log('MCARDS:', await page.locator('.dsx-mcard').count(), JSON.stringify(groups), 'sysIdx=' + sysIdx)
  if (sysIdx < 0) { console.log('ABORT: no system group'); await restore(); process.exit(0) }
  await page.locator('.dsx-mcard').nth(sysIdx).dispatchEvent('click')
  await page.waitForTimeout(700)
  const dots = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-dot')).map((d) => d.getAttribute('aria-label')))
  const dotIdx = dots.findIndex((l) => (l || '').startsWith('对话轨迹'))
  console.log('TRAJ_DOT_INDEX:', dotIdx, 'of', dots.length)
  if (dotIdx >= 0) {
    await page.locator('.dsx-dot').nth(dotIdx).dispatchEvent('click')
    await page.waitForTimeout(1000)
    console.log('PREVIEW:', JSON.stringify(await page.evaluate(PREVIEW_EXPR)))
    await page.screenshot({ path: path.join(__dirname, 'probe-trajectory-preview.png') })
  }

  // ---- 2. Live rail card (added then removed) ----
  const addAction = PREVIEW_ONLY ? page.locator('.__skip') : page.locator('.dsx-btn-primary:has-text("添加")').first()
  console.log('ADD_ACTION:', await addAction.count())
  if (await addAction.count()) {
    await addAction.dispatchEvent('click')
    await page.waitForTimeout(1000)
    const back = page.locator('button.dsx-btn:has-text("← 返回")').first()
    if (await back.count()) { await back.dispatchEvent('click'); await page.waitForTimeout(400) }
    const close = page.locator('.dsx-stats-addpanel button[aria-label="关闭"]').first()
    if (await close.count()) { await close.dispatchEvent('click'); await page.waitForTimeout(1500) }
    await page.waitForTimeout(1200)
    console.log('LIVE:', JSON.stringify(await page.evaluate(LIVE_EXPR)))
    await page.screenshot({ path: path.join(__dirname, 'probe-trajectory-live.png') })

    // Remove it again (config tab → that row's trash).
    if (await page.locator('.dsx-stats-add').count() === 0) {
      const cap2 = page.locator('button.dsx-stats-capsule').first()
      if (await cap2.count()) { await cap2.click(); await page.waitForTimeout(900) }
    }
    const add2 = page.locator('.dsx-stats-add').first()
    if (await add2.count()) { await add2.dispatchEvent('click'); await page.waitForTimeout(700) }
    await dclick(page.locator('button.dsx-tab:has-text("组件配置")'))
    await page.waitForTimeout(500)
    const removed = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.dsx-stats-addpanel .dsx-order-row'))
      const row = rows.find((r) => (r.textContent || '').includes('对话轨迹'))
      const trash = row ? row.querySelector('.dsx-trash') : null
      if (!trash) return false
      trash.click()
      return true
    })
    console.log('REMOVED:', removed)
    await page.waitForTimeout(900)
  }

  console.log('RESTORE_STATUS:', await restore())
  await page.goto('about:blank', { waitUntil: 'load' }).catch(() => {})
  console.log('ERRORS:', JSON.stringify(errs))
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })
