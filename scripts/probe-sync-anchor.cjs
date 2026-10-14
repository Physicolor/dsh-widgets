/**
 * probe-sync-anchor.cjs - WHY does the centre column start moving LATER than the
 * right panel's own slide, and what eases the transcript column's max-width?
 *
 * The owner's report: "after clicking expand, the right panel appears first and
 * only several ms later does the centre column start shrinking" -> the two
 * animations are not synchronised. This probe records, on the SAME run:
 *   - every transitionrun/transitionstart/transitionend with target+property+duration
 *   - the inline style writes the official shell makes on <html> (the
 *     `[data-animating]` gate) and on `_frame` (the column track), timestamped
 *     via MutationObserver with attributeOldValue
 *   - `getAnimations()` snapshots (property, duration, target class)
 *   - the computed transition-* of the transcript column and of `_frame`
 * so we can name the exact property whose onset we must align to.
 *
 * Usage: node scripts/probe-sync-anchor.cjs [open|close] [label]
 *   DSH_SESSION=<substring>   session row to click first
 *   DSH_PANEL_GLIDE=off       strip the enhc-panel-glide root class (OFF arm)
 */
const path = require('node:path')
const fs = require('node:fs')

let chromium = null
for (const c of ['playwright-core', path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core')]) {
  try { ({ chromium } = require(c)); break } catch { /* next */ }
}
if (chromium === null) { console.error('playwright-core not found'); process.exit(1) }
const { chromePath } = (() => { try { return require('./lib/chrome.cjs') } catch { return {} } })()
const resolveChrome = () => (typeof chromePath === 'function' ? chromePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
const { mintCookie } = require('./diag-auth-lib.cjs')

const URL_ = process.env.DSH_URL || 'http://127.0.0.1:19387'
const SESSION = process.env.DSH_SESSION || 'Laya与RRSI必要性1天'
const DIRECTION = (process.argv[2] || 'open').toLowerCase()
const LABEL = process.argv[3] || DIRECTION
const OUT = path.join(__dirname, '..', '.probe-sync-anchor', `${LABEL}.json`)

const IN_PAGE = (direction) => new Promise((resolve) => {
  const cls = (el) => (el === null ? null : (typeof el.className === 'string' ? el.className : ''))
  const tag = (el) => (el === null ? 'null' : `${el.tagName || '?'}${cls(el) ? '.' + cls(el).split(' ').join('.') : ''}`)
  const brief = (el) => {
    if (el === null || !el.nodeType || el.nodeType !== 1) return 'nonEl'
    const c = cls(el) || ''
    const id = el.getAttribute && el.getAttribute('data-slot') ? `[slot=${el.getAttribute('data-slot')}]` : ''
    return (el.tagName || '?').toLowerCase() + id + (c ? '.' + c.split(' ').slice(0, 2).join('.') : '')
  }
  const sel = (s) => { try { return document.querySelector(s) } catch { return null } }
  const root = document.documentElement
  const T0 = performance.now()
  const at = () => +((performance.now() - T0).toFixed(1))
  const events = []
  const styles = []
  const samples = []
  const anims = []
  const click = sel('[data-sidebar-right-toggle],[data-sidebar-right-expand]')
  if (click === null) { resolve({ error: 'no toggle' }); return }

  for (const type of ['transitionrun', 'transitionstart', 'transitionend']) {
    document.addEventListener(type, (e) => {
      const t = e.target
      events.push({
        type, at: at(), property: e.propertyName,
        elapsed: +(e.elapsedTime || 0).toFixed(4),
        target: brief(t),
      })
    }, true)
  }

  // The official gate: `<html data-animating>` and the `_frame` inline track.
  const watch = [root, sel('[class$="_frame"]'), sel('[class$="_scrollBody"]'), sel('[class$="_widthHandle"]')]
  const seen = new Set()
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      const key = brief(r.target) + '|' + r.attributeName
      const val = r.target.getAttribute(r.attributeName)
      if (r.attributeName !== 'class' || key.includes('frame') || key.includes('scrollBody') || key.includes('widthHandle') || r.target === root) {
        styles.push({ at: at(), target: brief(r.target), attr: r.attributeName, from: r.oldValue, to: val })
      }
      if (seen.size < 40) { seen.add(key) }
    }
  })
  for (const el of watch) if (el !== null) mo.observe(el, { attributes: true, attributeOldValue: true })

  const snap = () => {
    const out = []
    for (const a of document.getAnimations()) {
      const e = a.effect
      if (!e) continue
      const t = e.target
      const kf = (() => { try { return e.getKeyframes() } catch { return [] } })()
      out.push({
        prop: a.transitionProperty || (a.animationName) || 'anim',
        dur: (a.effect.getTiming().duration),
        target: brief(t),
        from: kf[0] ? JSON.stringify(kf[0]).slice(0, 90) : '',
        to: kf[kf.length - 1] ? JSON.stringify(kf[kf.length - 1]).slice(0, 90) : '',
      })
    }
    return out
  }

  const geom = () => {
    const g = (s) => { const el = sel(s); if (el === null) return null; const r = el.getBoundingClientRect(); return { l: +r.left.toFixed(1), w: +r.width.toFixed(1) } }
    return {
      frame: g('[class$="_frame"]'), prose: g('[class$="_column"]'),
      scrollBody: g('[class$="_scrollBody"]'), tab: g('[class$="_tabCell"]'),
      rail: g('[class*="dsx-stats-rail"]'), composer: g('[data-slot="conversation.composer.bar"] [class*="_card"]'),
    }
  }

  const i0 = setInterval(() => { samples.push({ at: at(), ...geom() }) }, 16)
  const i1 = setInterval(() => { const s = snap(); if (s.length) anims.push({ at: at(), list: s }) }, 40)

  setTimeout(() => {
    const prose = sel('[class$="_column"]')
    const frame = sel('[class$="_frame"]')
    const cs = (el) => { if (el === null) return null; const c = getComputedStyle(el); return { tp: c.transitionProperty, td: c.transitionDuration, tf: c.transitionTimingFunction, maxWidth: c.maxWidth } }
    click.click()
    setTimeout(() => {
      clearInterval(i0); clearInterval(i1); mo.disconnect()
      resolve({ direction, events, styles, samples, anims, proseStyle: cs(prose), frameStyle: cs(frame), clickAt: at() })
    }, 1200)
  }, 120)
})

;(async () => {
  const { chromium: pw } = { chromium }
  const browser = await pw.launch({ executablePath: resolveChrome(), headless: true, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1, locale: 'zh-CN' })
  const c = mintCookie('127.0.0.1:19387')
  await context.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/' }])
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e && e.message)))
  await page.goto(URL_, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  try {
    const row = page.locator('text=' + SESSION).first()
    await row.click({ timeout: 5000 }); await page.waitForTimeout(3000)
  } catch { console.error('session row not found: ' + SESSION) }
  const empty = await page.evaluate(() => document.body.classList.contains('dsx-stats-no-session'))
  const cur = await page.evaluate(() => {
    const f = document.querySelector('[class$="_frame"]')
    return f === null ? null : getComputedStyle(f).gridTemplateColumns
  })
  // Robust state read: the 3rd column of the frame's inline track is the right
  // panel. `0px` (or missing) means collapsed. Reading a button attribute is a
  // trap here: `[data-sidebar-right-expand]` is PRESENT while collapsed, which
  // silently inverted the first run's direction.
  const isOpen = await page.evaluate(() => {
    const b = document.querySelector('[data-sidebar-right-expand]')
    return b === null
  })
  if ((DIRECTION === 'open' && isOpen) || (DIRECTION === 'close' && !isOpen)) {
    await page.evaluate(() => { const t = document.querySelector('[data-sidebar-right-toggle],[data-sidebar-right-expand]'); if (t) t.click() })
    await page.waitForTimeout(2500)
  }
  // DSH_PANEL_GLIDE=off strips the option's root class, so the identical probe
  // measures the pre-implementation behaviour for a fair onset comparison.
  if (process.env.DSH_PANEL_GLIDE === 'off') {
    await page.evaluate(() => document.documentElement.classList.remove('enhc-panel-glide'))
    await page.waitForTimeout(600)
  }
  const glide = await page.evaluate(() => document.documentElement.className)
  const res = await page.evaluate(IN_PAGE, DIRECTION)
  res.empty = empty; res.trackBefore = cur; res.errors = errors
  res.glide = glide
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2))
  const fmt = (e) => `${e.at}ms ${e.type} ${e.property} [${e.elapsed}s] @${e.target}`
  console.log(`--- ${LABEL} (${DIRECTION}) empty=${empty} trackBefore=${cur}`)
  console.log('EVENTS:')
  for (const e of res.events.slice(0, 26)) console.log('  ' + fmt(e))
  console.log('STYLE WRITES (first 20):')
  for (const s of res.styles.slice(0, 20)) console.log(`  ${s.at}ms ${s.target} ${s.attr}: ${String(s.from).slice(0, 60)} -> ${String(s.to).slice(0, 70)}`)
  console.log('ANIMS (distinct targets/props):')
  const seenA = new Set()
  for (const a of res.anims) for (const x of a.list) { const k = `${x.prop}|${x.dur}|${x.target}`; if (!seenA.has(k)) { seenA.add(k); console.log(`  ${a.at}ms ${x.prop} dur=${x.dur} @${x.target}`) } }
  console.log('GEOM (change points):')
  let prev = null
  for (const s of res.samples) {
    const k = s.prose ? s.prose.l : null
    if (prev === null || k === null || Math.abs(k - prev) > 1) {
      console.log(`  ${s.at}ms frame=${s.frame ? s.frame.w : '-'} prose=${s.prose ? s.prose.l : '-'} tab=${s.tab ? s.tab.l : '-'} rail=${s.rail ? s.rail.l : '-'}`)
      prev = k
    }
  }
  console.log('prose computed:', JSON.stringify(res.proseStyle))
  console.log('frame computed:', JSON.stringify(res.frameStyle))
  console.log('errors:', errors)
  await browser.close()
})()
