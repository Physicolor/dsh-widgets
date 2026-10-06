/**
 * Closed-rail workspace-switch leak verifier (scripts/verify-closed-switch-leak.cjs)
 *
 * THE REPORT (owner, 2026-10-04, verbatim): 「组件区域在未激活状态下切换工作区对话后会自动显示在
 * 页面顶部」 — with the component area NOT active, switching to another workspace's conversation
 * makes the whole component area appear at the top of the page.
 *
 * WHAT ACTUALLY HAPPENS (measured 2026-10-04): switching conversations unmounts the composer
 * collector for one or more frames, so `snap.hasSession` briefly goes false. In rail-view.tsx
 * `keepMounted = retired && snap.hasSession && (everOpenRef.current || prewarm)` therefore goes
 * false and the whole retired drawer subtree is returned as `null` — React UNMOUNTS it. When
 * hasSession comes back, the new instance's `everOpenRef` starts false and its 2.5s prewarm timer
 * remounts a deck that was NEVER collapsed: the slots sit in the resting grid (x1257..1557,
 * y50..650) with inline `transform: none`.
 *
 * Those fresh slots are painted because `rail.module.css` needs an explicit
 *   `.dsx-wave-deck .dsx-stats-card-slot { visibility: visible }`
 * (the morph overlay swaps cards silently, and `opacity: 0` there cost a measured 50–68ms of pure
 * paint per entry). An explicit `visibility: visible` beats an inherited `hidden` — `!important` is
 * not even involved — so the slot painted straight through the hidden deck → rail → surface →
 * drawer-zoom → drawer chain and landed on the conversation.
 *
 * THE FIX (2026-10-04): a late rule in rail.module.css keeps that explicit `visible` from winning
 * while the drawer is parked or the session is gone:
 *   `.dsx-stats-drawer[data-retired] …-card-slot, …-add, body.dsx-stats-no-session … { visibility: hidden !important }`
 *
 * WHAT THIS PROVES:
 *   1. the rail really is closed (drawer retired, rail not painted) before the switch — otherwise
 *      the test would measure the wrong state, which is what all earlier probes did,
 *   2. after a real workspace-conversation switch, ZERO component-area surfaces are painted while
 *      the rail is closed, using an ANCESTOR-AWARE predicate (`checkVisibility({checkOpacity:true,
 *      checkVisibilityCSS:true})`) — an own-style `visibility: visible` / `opacity: 1` does NOT mean
 *      painted, because opacity does not inherit and the magnify layer blanks its subtree at the
 *      layer level,
 *   3. nothing component-shaped is painted in the top band (y < 40),
 *   4. no page errors.
 *
 * Writes the owner's `railOpen` pref to close the rail, and restores it field for field afterwards.
 * Usage: DSH_PORT=19387 node scripts/verify-closed-switch-leak.cjs [wsName]
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')
const { chromium } = require('./lib/playwright-core.cjs')

const PORT = process.env.DSH_PORT || '3080'
const AUTHORITY = `127.0.0.1:${PORT}`
const TITLE = '修复侧边栏动画卡顿与覆盖效果'
const WS = process.argv[2] || 'Thesis'
const OUT = path.join(__dirname, '..', '.probe-closed-switch-leak')
const STATE_KEY = 'harness-widgets.state'
const SAVED_AT_KEY = 'harness-widgets.state.savedAt'
const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '  — ' + detail}`)
  if (!ok) fails.push(label)
}
const note = (label, detail) => console.log(`      · ${label}${detail === undefined ? '' : '  — ' + detail}`)

const SAMPLER = () => {
  const w = window
  w.__clFrames = []
  w.__clStop = false
  const painted = (el) => {
    // ancestor-aware: an explicit own `visibility: visible` (the wave deck) or an own
    // `opacity: 1` (magnify slots under a layer-level opacity: 0) does NOT mean painted.
    if (typeof el.checkVisibility === 'function') {
      return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    }
    const cs = getComputedStyle(el)
    return cs.visibility !== 'hidden' && Number(cs.opacity) >= 0.02
  }
  const surfaces = () => {
    const out = []
    const all = document.querySelectorAll('[class*="dsx-"]')
    for (let i = 0; i < all.length; i += 1) {
      const el = all[i]
      if (!painted(el)) continue
      const b = el.getBoundingClientRect()
      if (b.width < 20 || b.height < 10) continue
      const cls = typeof el.className === 'string' ? el.className.trim() : el.tagName
      out.push({ cls, t: Math.round(b.top), l: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height) })
    }
    return out
  }
  let n = 0
  const tick = () => {
    if (w.__clStop) return
    n += 1
    if (n % 2 === 0) {
      const sel = document.querySelector('div[class*="sessionRow"][aria-selected="true"]')
      w.__clFrames.push({
        t: Math.round(performance.now()),
        rt: document.documentElement.style.getPropertyValue('--dsx-rail-top'),
        body: (document.body && document.body.className) || '',
        active: sel === null ? '' : (sel.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 24),
        surfaces: surfaces(),
      })
    }
    requestAnimationFrame(tick)
  }
  const go = () => requestAnimationFrame(tick)
  if (document.body === null) document.addEventListener('DOMContentLoaded', go, { once: true })
  else go()
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1.5 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  await ctx.addInitScript(SAMPLER)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))

  const readState = () => page.evaluate(async () => (await fetch('/api/widgets-state')).json())
  const writeState = (at, state) => page.evaluate(
    async ([at, s]) => { await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: at, state: s }) }) },
    [at, state],
  )
  const activeTitle = () => page.evaluate(() => {
    const el = document.querySelector('div[class*="sessionRow"][aria-selected="true"]')
    return el === null ? '' : (el.innerText || '').replace(/\s+/g, ' ').trim()
  })

  let original = null
  await page.goto(`http://${AUTHORITY}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  try { original = await readState() } catch (error) { note('could not read the owner state', String(error)) }

  const pinned = await page.evaluate((title) => {
    const rows = [...document.querySelectorAll('div[class*="sessionRow"]')]
    const hit = rows.findIndex((r) => (r.innerText || '').includes(title))
    if (hit < 0) return null
    if (rows[hit].getAttribute('aria-selected') !== 'true') rows[hit].click()
    return { hit, count: rows.length }
  }, TITLE)
  if (pinned === null) { console.log('FAILED: pinned session not found'); await browser.close(); process.exit(1) }
  await page.waitForTimeout(3000)
  const before = await activeTitle()
  if (!before.includes(TITLE)) {
    console.log(`FAILED: WRONG CONVERSATION active="${before}"`); await browser.close(); process.exit(1)
  }
  note('pinned', `row=${pinned.hit}/${pinned.count} active="${before}"`)

  // ── 1. Close the rail: the owner's 「未激活」 state. ──
  if (await page.evaluate(() => document.body.className.includes('dsx-stats-active'))) {
    await page.evaluate(() => { const b = document.querySelector('button.dsx-stats-capsule'); if (b !== null) b.click() })
    await page.waitForTimeout(1500)
  }
  const closed = await page.evaluate(() => {
    const r = document.querySelector('.dsx-stats-rail')
    const d = document.querySelector('.dsx-stats-drawer')
    return {
      body: document.body.className,
      retired: d !== null && d.hasAttribute('data-retired'),
      rail: r === null ? null : { vis: getComputedStyle(r).visibility, y: Math.round(r.getBoundingClientRect().top) },
    }
  })
  check(closed.body.includes('dsx-stats-active') === false, 'the rail really is closed before the switch', `body="${closed.body}"`)
  check(closed.retired === true, 'the drawer is retired (closed but kept mounted)', String(closed.retired))
  check(closed.rail !== null && closed.rail.vis === 'hidden', 'the rail element is hidden while closed', JSON.stringify(closed.rail))

  // ── 2. Switch to another workspace's conversation. ──
  await page.evaluate(() => { const s = window.__clFrames; s.length = 0 })
  const expanded = await page.evaluate((name) => {
    const row = [...document.querySelectorAll('.hIlkoa_projectRow')].find((r) => (r.innerText || '').includes(name))
    if (row === undefined) return false
    if (row.getAttribute('aria-expanded') !== 'true') {
      const btn = row.querySelector('[class*="chevron"],[class*="disclosure"],[class*="expand"]')
      if (btn !== null) btn.click(); else row.click()
    }
    return true
  }, WS)
  note('workspace expanded', `${WS} → ${expanded}`)
  await page.waitForTimeout(2200)

  const target = await page.evaluate((pin) => {
    const rows = [...document.querySelectorAll('div[class*="sessionRow"]')]
    for (let i = 0; i < rows.length; i += 1) {
      if (i === pin) continue
      const txt = (rows[i].innerText || '').replace(/\s+/g, ' ').trim()
      if (txt === '' || txt === '新会话') continue
      return { idx: i, label: txt.slice(0, 34) }
    }
    return null
  }, pinned.hit)
  if (target === null) { console.log('FAILED: no other conversation to switch to'); await browser.close(); process.exit(1) }
  note('target', `row=${target.idx} label="${target.label}"`)
  await page.evaluate((idx) => { [...document.querySelectorAll('div[class*="sessionRow"]')][idx].click() }, target.idx)
  await page.waitForTimeout(7000)

  const after = await activeTitle()
  const switched = after !== '' && !after.includes(TITLE)
  check(switched, 'the switch actually landed on a different conversation', `before="${before.slice(0, 22)}" after="${after.slice(0, 26)}"`)

  const frames = await page.evaluate(() => { window.__clStop = true; return window.__clFrames })

  // ── 3. No component-area surface may be painted while the rail is closed. ──
  const comp = (cls) => /dsx-stats-(rail|drawer|magnify|card|wave|addpanel)|dsx-wave-deck/.test(cls)
  const capsule = (cls) => /dsx-stats-capsule/.test(cls)
  // The leak filter below skips frames where the rail is legitimately active, so a silent
  // reopen after the switch would hide exactly the frames we are looking for. Assert first
  // that the rail stayed closed for the WHOLE window.
  const reopened = frames.filter((f) => f.body.includes('dsx-stats-active'))
  check(reopened.length === 0, 'the rail stayed closed for every sampled frame after the switch',
    reopened.length === 0 ? `${frames.length} frames, body classes ${JSON.stringify([...new Set(frames.map((f) => f.body))].slice(0, 6))}` : `${reopened.length} frames reopened at t=${reopened[0].t}`)
  const bad = frames.filter((f) => !f.body.includes('dsx-stats-active') && f.surfaces.some((s) => comp(s.cls) && !capsule(s.cls)))
  const byClass = new Map()
  for (const f of frames) {
    for (const s of f.surfaces) {
      if (!byClass.has(s.cls)) byClass.set(s.cls, { ys: new Set(), n: 0 })
      const rec = byClass.get(s.cls); rec.ys.add(s.t); rec.n += 1
    }
  }
  note('frames sampled', String(frames.length))
  note('painted dsx surfaces while closed', byClass.size === 0 ? '(none)' : [...byClass].map(([c, v]) => `${c} n=${v.n} y=${JSON.stringify([...v.ys])}`).join(' | '))
  check(bad.length === 0, 'ZERO frames paint a component-area surface while the rail is closed',
    bad.length === 0 ? `${frames.length} frames clean` : `${bad.length} frames, e.g. ${JSON.stringify(bad[0].surfaces.filter((s) => comp(s.cls)).slice(0, 4))}`)

  const badTop = frames.filter((f) => f.surfaces.some((s) => comp(s.cls) && s.t < 40))
  check(badTop.length === 0, 'nothing component-shaped is painted in the top band (y < 40)', `${badTop.length} frames`)

  check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '))

  await page.screenshot({ path: path.join(OUT, 'after-switch.png') })

  // ── put the owner's rail state back ───────────────────────────────────────
  try {
    const now = await readState()
    const at = Date.now()
    const next = { ...now.state, railOpen: original === null ? true : original.state.railOpen }
    await writeState(at, next)
    await page.evaluate(([k, a, v]) => {
      localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem(a, String(Date.now()))
    }, [STATE_KEY, SAVED_AT_KEY, next])
    note('restored railOpen', String(next.railOpen))
  } catch (error) {
    check(false, 'the owner’s rail state was restored', String(error))
  }

  fs.writeFileSync(path.join(OUT, 'closed-switch-leak.json'), JSON.stringify({ before, after, closed, target, frames, errors }, null, 2))
  console.log(`\n${fails.length === 0 ? 'ALL CHECKS PASSED' : fails.length + ' FAILURE(S)'} — shots in ${OUT}`)
  await browser.close()
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
