/**
 * Hover path — who forces synchronous layout (scripts/probe-hover-layout-reads.cjs)
 *
 * Wraps `Element.prototype.getBoundingClientRect` and `window.getComputedStyle`
 * and records the CALL SITE of every read, so a hover's layout-thrash source is
 * named instead of guessed. Reads are split into "all" and "during the wave"
 * (`.dsx-wave-deck.dsx-wave-on` present), because only the second bucket is on
 * the rail's animation path.
 *
 * Why it exists (2026-10-18): the reported 「鼠标指针悬浮过程和动画效果均卡顿」 was
 * attributed here. Before the fix one pointer move ran `moveRailFocus` THREE
 * times — the once-mounted window `mousemove` listener plus BOTH React
 * `onMouseMove` handlers (the rail's and the surface wrapper's) — and each pass
 * measured the rail twice (`getBoundingClientRect` + `getComputedStyle().paddingTop`
 * in `moveRailFocus`, then both again inside `onCard`), i.e. ~24 forced reads per
 * move, every one of them synchronous because the same frame had already written
 * the slot transforms. After it: ONE measurement per move (`measureRail`), shared
 * by the peak and the hit oracle — measured 2734 -> 890 rail-owned reads over an
 * equal scrub (the rest of the window's reads belong to co-tenants).
 *
 * A regression guard, not a benchmark: assert the per-site rail counts stay in
 * the single digits per pointer move. Frame *timing* is NOT measured here —
 * headless/SwiftShader exaggerates it, so the Long Animation Frame attribution is
 * the honest companion reading (see scripts/diag-hover-loaf.cjs).
 *
 * Usage: node scripts/probe-hover-layout-reads.cjs [authority]
 *   authority defaults to 127.0.0.1:3080; DSH_LIVE_AUTHORITY is honoured too.
 *   Needs DSH_HOME (the auth cookie is minted from $DSH_HOME/.credentials.yaml).
 *   DSH_PORT/<argv> must match the GUI you are probing: the desktop app serves on
 *   a random port, `dsh web` on 3080.
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { chromium } = require('./lib/playwright-core.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const AUTHORITY = process.argv[2] || process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:3080'
const OUT = path.join(__dirname, '..', '.probe-hover-layout-reads')

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 } })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  // The rail's prefs persist on every patch: never let a probe write them back.
  await ctx.route('**/api/widgets-state', async (route) => {
    const m = route.request().method()
    if (m === 'PUT' || m === 'POST') { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); return }
    await route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`http://${AUTHORITY}`, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(4500)
  await page.locator('[class$="_sessionRow"]').first().click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(6500)
  const isOpen = () => page.evaluate(() => { const d = document.querySelector('.dsx-stats-drawer'); return !!d && !d.hasAttribute('data-retired') })
  if (!(await isOpen())) {
    const cap = page.locator('button.dsx-stats-capsule').first()
    if (await cap.count()) { await cap.click(); await page.waitForTimeout(900) }
  }
  await page.waitForTimeout(1200)

  await page.evaluate(() => {
    window.__calls = []
    const clean = (stack) => String(stack || '').split('\n').slice(2, 7)
      .map((l) => l.trim().replace(/^at\s+/, '').replace(/\(.*?\)$/, '').replace(/^(https?:\/\/[^/]+\/)?/, ''))
      .filter((l) => !/__calls|wrap/.test(l))
    const wrap = (obj, name, tag) => {
      const orig = obj[name]
      if (typeof orig !== 'function') return
      obj[name] = function (...args) {
        if (window.__calls.length < 9000) {
          window.__calls.push({ tag, site: clean(new Error().stack).slice(0, 3).join(' | '), wave: !!document.querySelector('.dsx-wave-deck.dsx-wave-on') })
        }
        return orig.apply(this, args)
      }
    }
    wrap(Element.prototype, 'getBoundingClientRect', 'gBCR')
    wrap(window, 'getComputedStyle', 'gCS')
  })

  const centres = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.dsx-stats-drawer .dsx-stats-card-slot')]
    return [0, 3, 7, 11, 14].filter((i) => slots[i]).map((i) => { const r = slots[i].getBoundingClientRect(); return { i, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
  })
  const t0 = Date.now()
  for (let rep = 0; rep < 8; rep += 1) {
    for (const c of centres) { await page.mouse.move(c.x, c.y, { steps: 8 }); await page.waitForTimeout(45) }
    await page.mouse.move(700, 500, { steps: 8 })
    await page.waitForTimeout(120)
  }
  const window_ms = Date.now() - t0
  const res = await page.evaluate(() => {
    const bySite = new Map()
    const bySiteWave = new Map()
    let wave = 0
    for (const c of window.__calls) {
      const k = `${c.tag} :: ${c.site}`
      bySite.set(k, (bySite.get(k) || 0) + 1)
      if (c.wave) { wave += 1; bySiteWave.set(k, (bySiteWave.get(k) || 0) + 1) }
    }
    return {
      total: window.__calls.length,
      wave,
      bySite: [...bySite].sort((a, b) => b[1] - a[1]).slice(0, 18),
      bySiteWave: [...bySiteWave].sort((a, b) => b[1] - a[1]).slice(0, 18),
    }
  })
  console.log(`window ${window_ms}ms · layout reads ${res.total} (${res.wave} during the wave)`)
  console.log('\n=== reads DURING the wave, by call site ===')
  for (const [k, n] of res.bySiteWave) console.log(`  ${String(n).padStart(6)}  ${k}`)
  fs.writeFileSync(path.join(OUT, 'reads.json'), JSON.stringify({ window_ms, ...res }, null, 2))
  console.log(`\nreceipt: ${path.relative(process.cwd(), path.join(OUT, 'reads.json'))}`)
  await browser.close()
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
