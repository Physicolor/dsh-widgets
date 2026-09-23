/**
 * Add-panel occlusion audit: while the "添加组件" popup is open on the market
 * detail, grid hit-test its whole box with elementFromPoint and report every
 * point whose topmost element is NOT inside the panel — i.e. anything painting
 * ABOVE the popup card (official composer buttons, the rail's magnify wave, the
 * right sidebar, …). Also lists the highest z-index layers around the panel.
 *
 * Attaches to the already-authenticated headless Chrome on CDP 9333.
 */
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const HIT_EXPR = `(() => {
  const panel = document.querySelector('.dsx-stats-addpanel.open')
  if (!panel) return { found: false, hasPanel: !!document.querySelector('.dsx-stats-addpanel') }
  const box = panel.getBoundingClientRect()
  const offenders = new Map()
  let total = 0
  let covered = 0
  for (let y = Math.round(box.top) + 4; y < box.bottom - 4; y += 16) {
    for (let x = Math.round(box.left) + 4; x < box.right - 4; x += 16) {
      total++
      const el = document.elementFromPoint(x, y)
      if (el && panel.contains(el)) { covered++; continue }
      if (!el) continue
      const b = el.getBoundingClientRect()
      const key = String(el.className || el.tagName).slice(0, 70)
      const rec = offenders.get(key) ?? { cls: key, tag: el.tagName, count: 0, sample: { x, y }, rect: { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }, z: getComputedStyle(el).zIndex, pos: getComputedStyle(el).position }
      rec.count++
      offenders.set(key, rec)
    }
  }
  // Who owns the highest stacking layers on the page?
  const layers = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    const z = Number(cs.zIndex)
    if (!Number.isFinite(z) || z < 5) continue
    if (cs.position === 'static') continue
    const b = el.getBoundingClientRect()
    if (b.width === 0 || b.height === 0) continue
    layers.push({ cls: String(el.className || el.tagName).slice(0, 60), z, pos: cs.position, rect: { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) } })
  }
  layers.sort((a, b) => b.z - a.z)
  return {
    found: true,
    panel: { t: Math.round(box.top), b: Math.round(box.bottom), l: Math.round(box.left), r: Math.round(box.right) },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    total, covered,
    coveragePct: Math.round((covered / total) * 1000) / 10,
    offenders: [...offenders.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    topLayers: layers.slice(0, 12),
  }
})()`

;(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
  const ctx = browser.contexts()[0]
  const page = ctx.pages()[0] ?? await ctx.newPage()
  const dclick = (loc) => loc.first().dispatchEvent('click')

  for (const [w, h] of [[1578, 1022], [1280, 760]]) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    if (await page.locator('.dsx-stats-add').count() === 0) {
      const cap = page.locator('button.dsx-stats-capsule').first()
      if (await cap.count()) { await cap.click(); await page.waitForTimeout(1200) }
    }
    const addBtn = page.locator('.dsx-stats-add').first()
    if (await addBtn.count()) { await addBtn.dispatchEvent('click'); await page.waitForTimeout(900) }
    await dclick(page.locator('button.dsx-tab:has-text("组件市场")'))
    await page.waitForTimeout(600)
    const groups = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-mcard .dsx-mname')).map((n) => n.textContent))
    const sysIdx = groups.findIndex((g) => g === '系统' || g === 'System')
    if (sysIdx >= 0) {
      await page.locator('.dsx-mcard').nth(sysIdx).dispatchEvent('click')
      await page.waitForTimeout(600)
      const dots = await page.evaluate(() => Array.from(document.querySelectorAll('.dsx-dot')).map((d) => d.getAttribute('aria-label')))
      const dotIdx = dots.findIndex((l) => (l || '').startsWith('对话轨迹'))
      if (dotIdx >= 0) { await page.locator('.dsx-dot').nth(dotIdx).dispatchEvent('click'); await page.waitForTimeout(900) }
    }
    console.log(`--- ${w}x${h} ---`)
    console.log(JSON.stringify(await page.evaluate(HIT_EXPR), null, 2))
    await page.screenshot({ path: path.join(__dirname, `probe-addpanel-occlusion-${w}x${h}.png`) })
  }
  await page.setViewportSize({ width: 1578, height: 846 })
  await page.goto('about:blank', { waitUntil: 'load' }).catch(() => {})
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e.message); process.exit(1) })
