/**
 * dsh-widgets — the "the right sidebar swallows the 组件 area" regression check.
 *
 * DSH 0.2.0 rewrote the AppFrame's inline tracks from plain pixels
 * (`280px minmax(0px, 1fr) 720px`) to minmax() pairs
 * (`280px minmax(0px, 1fr) minmax(0px, 864px)`). The rail's target-width reads
 * matched the last whitespace token against `/^([\d.]+)px$/`, which now ends in
 * `864px)` — so BOTH target reads returned null and the v1.6.0 swallow went
 * quiet: the rail could not predict the column the track was heading for, waited
 * out the 240ms + 520ms settle debounce, hopped into the freed conversation
 * column and snapped back under the panel ~500ms later. The settings drawer
 * (the 组件 area opened from the + button) was hit twice: its `right` rule lost
 * the cascade to panel.module.css's raw `--dsx-rightbar-w` read, and once it did
 * ride the rail's inset it floated ON TOP of the official 0.2 right column
 * (`z-index: 30`, which has no z-index to fight) instead of being swallowed.
 *
 * This drives the live app and asserts the motion frame by frame:
 *
 *   1. with the drawer open, opening the right sidebar keeps the rail pinned to
 *      the viewport's right edge — it never hops into the conversation column;
 *   2. the drawer leaves the stage by MOTION (a real translateX sweep out to the
 *      right), ending fully off-screen;
 *   3. the rail still follows the drawer out (both are swallowed);
 *   4. closing the sidebar returns both, and the rail stays pinned throughout.
 *
 *   node scripts/verify-swallow-20.cjs [--session <substring>] [--raw]
 *
 * URL from DSH_URL, default http://127.0.0.1:19387. Screenshots land in
 * docs/verify-report3/swallow-*.png.
 */
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { chromePath } = require('./lib/chrome.cjs')

const { chromium } = require('./lib/playwright-core.cjs')

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i === -1 ? dflt : process.argv[i + 1] }
const URL_ = arg('--url', process.env.DSH_URL || 'http://127.0.0.1:19387')
const SESSION = arg('--session', 'dsh-widgets')
const OUT = 'docs/verify-report3'
const RAW = process.argv.indexOf('--raw') !== -1

function authCookie() {
  const yaml = fs.readFileSync('D:/dsh-home/.credentials.yaml', 'utf8')
  const secret = Buffer.from(yaml.match(/secret:\s*([A-Za-z0-9_-]+)/)[1].replaceAll('-', '+').replaceAll('_', '/'), 'base64')
  const authority = new global.URL(URL_).host
  const b64u = (b) => Buffer.from(b).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const name = 'dsh-auth-' + b64u(crypto.createHash('sha256').update(authority).digest())
  const now = Date.now()
  const body = b64u(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt: now, expiresAt: now + 86400000 }), 'utf8'))
  return { name, value: `v1.${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}` }
}

/**
 * Sample every rAF for `ms`, clicking the sidebar toggle ONCE inside the page on
 * frame 3. `el.click()` and not Playwright's click: a real pointerdown is what
 * the drawer's "click outside closes me" guard listens for, and that would slide
 * the drawer out on the way in — the very motion under test.
 */
const IN_PAGE_TRACE = (ms) => new Promise((resolve) => {
  const q = (sel) => document.querySelector(sel)
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.right), Math.round(r.width)] }
  const cs = (el, p) => (el === null ? null : getComputedStyle(el).getPropertyValue(p).trim())
  const tfX = (v) => { const m = /matrix\(([^)]+)\)/.exec(v ?? ''); return m === null ? null : Math.round(Number(m[1].split(',')[4]) || 0) }
  const out = []
  const start = performance.now()
  let clicked = false
  let frames = 0
  const tick = () => {
    const now = performance.now()
    if (!clicked && frames >= 3) {
      // One control owns both directions: the title-row toggle. (The corner
      // `[data-sidebar-right-expand]` button only exists while collapsed.)
      const b = q('[data-sidebar-right-toggle]') ?? q('[data-sidebar-right-expand]') ?? q('[data-sidebar-right-collapse]')
      if (b) b.click()
      clicked = true
    }
    const rail = q('.dsx-stats-rail'); const drawer = q('.dsx-stats-addpanel'); const rb = q('[class$="_rightbarCol"]'); const frame = q('[class$="_frame"]')
    out.push({
      t: Math.round(now - start),
      clicked,
      rb: box(rb),
      rail: box(rail),
      railRight: cs(rail, 'right'),
      drawer: box(drawer),
      drawerTfX: tfX(cs(drawer, 'transform')),
      drawerOpen: drawer === null ? null : drawer.classList.contains('open'),
      yielded: q('.dsx-stats-drawer')?.getAttribute('data-yielded') ?? null,
      anim: frame === null ? null : frame.getAttribute('data-animating'),
    })
    frames += 1
    if (now - start > ms) resolve(out)
    else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

let failures = 0
const check = (name, ok, detail) => { if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${detail}`}`) }

const print = (label, trace) => {
  console.log(`--- ${label} (${trace.length} frames) ---`)
  const key = (r) => JSON.stringify([r.rb, r.rail, r.railRight, r.drawer, r.drawerTfX, r.drawerOpen, r.anim, r.yielded])
  let prev = null
  for (const r of trace) {
    const k = key(r)
    if (!RAW && k === prev) continue
    prev = k
    console.log(
      `${String(r.t).padStart(5)}ms${r.clicked ? ' *' : '  '} rb=${JSON.stringify(r.rb)} ` +
      `rail=${JSON.stringify(r.rail)} right=${r.railRight} | drawer=${JSON.stringify(r.drawer)} tfX=${r.drawerTfX} open=${r.drawerOpen} | anim=${r.anim} yielded=${JSON.stringify(r.yielded)}`,
    )
  }
}

;(async () => {
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  const page = await ctx.newPage()
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(6000)
  const welcome = page.getByRole('button', { name: '继续' }).first()
  if (await welcome.count()) { await welcome.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1500) }

  const row = page.locator('div[class*="sessionRow"]', { hasText: SESSION }).first()
  if (!(await row.count())) { console.error(`FAIL  no session row matching "${SESSION}"`); await browser.close(); process.exit(1) }
  await row.click({ timeout: 8000 })
  await page.waitForTimeout(4500)

  const cap = page.locator('.dsx-stats-capsule').first()
  await cap.waitFor({ timeout: 8000 })
  if ((await cap.getAttribute('aria-pressed')) !== 'true') { await cap.click(); await page.waitForTimeout(1500) }
  // The gear tile is revealed only while the surface is hovered
  // (rail.module.css: `.dsx-surface-hover .dsx-stats-add { opacity:1; visibility:visible }`),
  // and the deck keeps a hidden twin inside the drawer, so Playwright's
  // actionability check times out on `.first()`. Dispatch the click straight at
  // the revealed tile — the same convention IN_PAGE_TRACE uses for the sidebar
  // toggle, and it also keeps the drawer's pointerdown "click outside" guard quiet.
  await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.dsx-stats-add')]
    const shown = tiles.find((el) => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && Number(s.opacity) > 0 })
    ;(shown ?? tiles[0]).click()
  })
  await page.waitForTimeout(900)
  if (!(await page.locator('.dsx-stats-addpanel.open').count())) { console.error('FAIL  the 组件 drawer did not open'); await browser.close(); process.exit(1) }

  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: `${OUT}/swallow-open-before.png` })

  // ── Round 1: opening the right sidebar must swallow the 组件 area. ──
  const opened = await page.evaluate(IN_PAGE_TRACE, 2200)
  await page.screenshot({ path: `${OUT}/swallow-open-after.png` })
  print('open the right sidebar', opened)

  const viewport = 1920
  const rbLeft = Math.min(...opened.map((f) => (f.rb === null || f.rb[2] === 0 ? Infinity : f.rb[0])))
  const railFrames = opened.filter((f) => f.rail !== null)
  const pinnedEverywhere = railFrames.every((f) => Math.abs(f.rail[1] - viewport) <= 1)
  check('the rail never leaves the viewport right edge while the sidebar opens', pinnedEverywhere,
    `rail right edges: ${[...new Set(railFrames.map((f) => f.rail[1]))].join(',')}`)
  check('the rail never hops into the conversation column', railFrames.every((f) => f.rail[0] >= rbLeft - 1),
    `min rail.x=${Math.min(...railFrames.map((f) => f.rail[0]))} sidebar left=${rbLeft}`)
  check('the rail ends swallowed (under the sidebar, still pinned)',
    railFrames.length > 0 && Math.abs(railFrames[railFrames.length - 1].rail[1] - viewport) <= 1,
    `last rail frame=${JSON.stringify(railFrames[railFrames.length - 1]?.rail)}`)
  const drawerFrames = opened.filter((f) => f.drawer !== null)
  const drawerEnd = drawerFrames[drawerFrames.length - 1]
  check('the 组件 drawer ends fully off-screen', drawerEnd !== undefined && drawerEnd.drawer[0] >= viewport, `drawer.x=${drawerEnd && drawerEnd.drawer[0]}`)
  const sweep = drawerFrames.map((f) => f.drawerTfX).filter((v) => v !== null)
  // Any step that covers less than the full 540px sweep proves the drawer rode a
  // transition instead of snapping. Counting intermediate SAMPLES is flaky (a busy
  // main thread thins the rAF stream while the 0.28s slide runs), so assert on the
  // step sizes instead: 0 -> 540 in one step would be a jump.
  const gradual = sweep.some((v, i) => i > 0 && v - sweep[i - 1] > 0 && v - sweep[i - 1] < 500)
  check('the drawer leaves by motion, not by a jump', gradual, `translateX samples: ${JSON.stringify(sweep)}`)
  check('the swallow is live (yielded) once the panel is in', opened.some((f) => f.yielded === ''))

  // ── Round 2: closing the sidebar returns both, still pinned. ──
  const closed = await page.evaluate(IN_PAGE_TRACE, 2200)
  await page.screenshot({ path: `${OUT}/swallow-close-after.png` })
  print('close the right sidebar', closed)
  const closedRail = closed.filter((f) => f.rail !== null)
  check('the rail stays pinned while the sidebar closes', closedRail.every((f) => Math.abs(f.rail[1] - viewport) <= 1),
    `rail right edges: ${[...new Set(closedRail.map((f) => f.rail[1]))].join(',')}`)
  const closedDrawer = closed.filter((f) => f.drawer !== null).at(-1)
  check('the 组件 drawer comes back on screen', closedDrawer !== undefined && closedDrawer.drawer[1] <= viewport && closedDrawer.drawerOpen === true,
    `drawer=${JSON.stringify(closedDrawer && closedDrawer.drawer)} open=${closedDrawer && closedDrawer.drawerOpen}`)
  check('the rail is no longer yielded after the sidebar closes', closed.at(-1).yielded === null)

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  await browser.close()
  process.exit(failures === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1) })
