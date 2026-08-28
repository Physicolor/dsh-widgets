// Verify the sidebar-anim fix end to end against the LIVE GUI (http://127.0.0.1:3080):
//   1. functional: the rails glides via compositor transform (transitionProperty=transform),
//      and its right edge lands exactly at viewportWidth - --dsh-sidebar-width when the
//      right sidebar opens.
//   2. perf: frame-drop ratio and long-task time while toggling the better-sidebar right
//      panel, measured with the widget rail OPEN vs CLOSED. After the fix the rail-open
//      cost must be close to the rail-closed baseline (the rail no longer reflows per frame).
// Usage: npm i -D playwright-core && node scripts/verify-sidebar-anim.cjs
// (uses the system Edge at C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe)
const { chromium } = require('playwright-core')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://127.0.0.1:3080'
const SESSION_TEXT = '排查侧边栏动画掉帧'

const sampleFrames = (page, ms) => page.evaluate((dur) => new Promise((resolve) => {
  const frames = []
  let last = performance.now()
  let raf
  const start = performance.now()
  const tick = (t) => {
    frames.push(t - last)
    last = t
    if (performance.now() - start < dur) raf = requestAnimationFrame(tick)
    else resolve(frames)
  }
  raf = requestAnimationFrame(tick)
}), ms)

async function measureToggle(page) {
  // start rAF sampling, then open close the right sidebar panel
  const sampler = sampleFrames(page, 700)
  await page.evaluate(() => {
    window.__animProbe = { longTasks: [], obs: new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__animProbe.longTasks.push(e.duration)
    }) }
    window.__animProbe.obs.observe({ entryTypes: ['longtask'] })
  })
  // open
  const openBtn = page.locator('.nArs4W_toggleButton:not([aria-label*="收起"]):not([aria-label*="折叠"]), .nArs4W_toggleButton[aria-label="展开侧边栏"]').first()
  const oc = await openBtn.count()
  if (!oc) throw new Error('open panel button not found')
  await openBtn.click()
  await page.waitForTimeout(420)
  // close
  const closeBtn = page.locator('.nArs4W_toggleButton[aria-label*="收起"], .nArs4W_toggleButton[aria-label*="折叠"]').first()
  const cc = await closeBtn.count()
  if (cc) await closeBtn.click()
  await page.waitForTimeout(300)
  const frames = await sampler
  const probe = await page.evaluate(() => {
    const p = window.__animProbe
    p.obs.disconnect()
    return { longTasks: p.longTasks }
  })
  return { frames, longTasks: probe.longTasks }
}

function summarize(name, { frames, longTasks }) {
  const total = frames.reduce((a, b) => a + b, 0)
  const dropped = frames.filter((d) => d > 26).length
  const bad = frames.filter((d) => d > 50).length
  const avg = total / frames.length
  return {
    name,
    frames: frames.length,
    avgFrameMs: +avg.toFixed(2),
    droppedFramesGt26: dropped,
    droppedFramesGt50: bad,
    dropRatioPct: +((100 * dropped) / frames.length).toFixed(1),
    longTaskCount: longTasks.length,
    longTaskTotalMs: Math.round(longTasks.reduce((a, b) => a + b, 0)),
  }
}

;(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(5000)

  // enter the named session
  const row = page.locator('.YDXeBa_sessionRow', { hasText: SESSION_TEXT }).first()
  await row.click()
  await page.waitForSelector('.dsx-stats-capsule', { timeout: 20000 })
  await page.waitForTimeout(1800)

  // make sure the rail is CLOSED first (baseline)
  const pressed = await page.getAttribute('.dsx-stats-capsule', 'aria-pressed')
  if (pressed === 'true') {
    await page.locator('.dsx-stats-capsule').click()
    await page.waitForTimeout(500)
  }

  // ---- geometry + compositor functional check (rail OPEN) ----
  await page.locator('.dsx-stats-capsule').click()
  await page.waitForSelector('.dsx-stats-rail', { timeout: 10000 })
  await page.waitForTimeout(350)

  const openBtn = page.locator('.nArs4W_toggleButton[aria-label="展开侧边栏"]').first()
  await openBtn.click()
  await page.waitForTimeout(150)
  const geo = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const cs = getComputedStyle(rail)
    const sidebarW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dsh-sidebar-width')) || 0
    const rb = rail.getBoundingClientRect()
    return {
      transitionProperty: cs.transitionProperty,
      transitionDuration: cs.transitionDuration,
      transform: cs.transform,
      railRectRight: Math.round(rb.right),
      sidebarWidth: Math.round(sidebarW),
      viewportWidth: window.innerWidth,
      expectedRight: window.innerWidth - sidebarW,
    }
  })
  // close panel again for the perf measurements
  const closeBtn = page.locator('.nArs4W_toggleButton[aria-label*="收起"]').first()
  const cc = await closeBtn.count()
  if (cc) await closeBtn.click()
  await page.waitForTimeout(500)

  // ---- perf: rail OPEN ----
  const perfOpen = await measureToggle(page)
  // ---- perf: rail CLOSED (baseline) ----
  await page.locator('.dsx-stats-capsule').click()
  await page.waitForTimeout(600)
  const perfClosed = await measureToggle(page)

  console.log(JSON.stringify({ geo, perf: [summarize('rail OPEN (fixed bundle)', perfOpen), summarize('rail CLOSED (baseline)', perfClosed)] }, null, 2))
  await browser.close()
})().catch((e) => { console.error('VERIFY FAILED:', e.message); process.exit(1) })