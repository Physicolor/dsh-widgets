/**
 * Desktop-shell probe (docs/probe-desktop.cjs)
 *
 * The Web GUI and the DESKTOP app are the same client, but not the same shell: the
 * Electron window adds its own title bar, window controls and chrome, and the shell's
 * stacking inside that window is NOT reproducible in a browser tab. Anything about
 * paint order, the window chrome, or a control the desktop renders differently has to
 * be measured in the app itself.
 *
 * This probe attaches to the running app over the Chrome DevTools Protocol, so the
 * desktop becomes as testable as the Web UI: screenshots, geometry, computed styles,
 * paint-order hit tests and console errors, all against the real window.
 *
 * One-time setup (the app ignores the flag on a second launch because it holds a
 * single-instance lock, so it must be fully quit first):
 *
 *   quit DeepSeek Harness
 *   & "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe" --remote-debugging-port=9222
 *
 * Usage:
 *   node docs/probe-desktop.cjs --status                 # list the app's pages/targets
 *   node docs/probe-desktop.cjs --chrome                 # dump the window chrome boxes
 *   node docs/probe-desktop.cjs --stacking               # rail vs navigator vs top bar
 *   node docs/probe-desktop.cjs --shot out.png           # screenshot the real window
 *   node docs/probe-desktop.cjs --errors                 # console errors seen from now on
 *   PORT=9223 node docs/probe-desktop.cjs --status        # another debug port
 */
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const PORT = process.env.PORT ?? '9222'
const ENDPOINT = `http://127.0.0.1:${PORT}`
const argv = process.argv.slice(2)
const has = (flag) => argv.includes(flag)
const value = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }

/** The desktop window as a Playwright page, or a clear explanation of what is missing. */
async function attach() {
  let browser
  try {
    browser = await chromium.connectOverCDP(ENDPOINT)
  } catch (error) {
    console.error(`[desktop] cannot attach to ${ENDPOINT}: ${error.message}`)
    console.error('')
    console.error('The app is either not running, or was started without the debug port.')
    console.error('Quit DeepSeek Harness completely, then start it again with:')
    console.error('')
    console.error(`  & "$env:LOCALAPPDATA\\Programs\\DeepSeek Harness\\DeepSeek Harness.exe" --remote-debugging-port=${PORT}`)
    console.error('')
    console.error('(A second launch without quitting first is ignored: the app holds a single-instance lock.)')
    process.exit(2)
  }
  const contexts = browser.contexts()
  const pages = contexts.flatMap((c) => c.pages())
  if (pages.length === 0) {
    console.error('[desktop] attached, but the app exposes no page yet')
    process.exit(2)
  }
  // The DSH UI page; the app may also hold a hidden updater/devtools page.
  const page = pages.find((p) => /127\.0\.0\.1|localhost|index\.html|file:/.test(p.url())) ?? pages[0]
  return { browser, page, pages }
}

const round = (n) => Math.round(n * 10) / 10
const box = (b) => b === null ? null : { x: round(b.x), y: round(b.y), w: round(b.width), h: round(b.height) }

;(async () => {
  const { browser, page, pages } = await attach()
  console.log(`[desktop] attached to ${ENDPOINT} — ${pages.length} page(s)`)

  if (has('--status') || argv.length === 0) {
    for (const p of pages) console.log(`   ${p.url().slice(0, 110)}  |  ${(await p.title()).slice(0, 40)}`)
    console.log(`viewport: ${JSON.stringify(await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio })))}`)
  }

  if (has('--errors')) {
    const seen = []
    page.on('console', (m) => { if (m.type() === 'error') seen.push(m.text().slice(0, 200)) })
    page.on('pageerror', (e) => seen.push(`pageerror: ${e.message.slice(0, 200)}`))
    await page.waitForTimeout(Number(value('--errors') ?? 5000))
    console.log(`console errors in the window (${seen.length}):`)
    for (const l of seen.slice(0, 20)) console.log('   ', l)
  }

  if (has('--chrome')) {
    const chrome = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('*')) {
        const s = getComputedStyle(el)
        const z = Number.parseInt(s.zIndex, 10)
        if (!Number.isFinite(z) || z < 1 || z > 200) continue
        const b = el.getBoundingClientRect()
        if (b.width < 60 || b.height < 10) continue
        out.push({ cls: String(el.className).slice(0, 40), pos: s.position, z, box: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] })
      }
      return out.sort((a, b) => a.z - b.z).slice(0, 24)
    })
    console.log('window layers with a z-index (1..200):')
    for (const c of chrome) console.log(`   z ${String(c.z).padStart(4)}  ${c.pos.padEnd(8)}  ${JSON.stringify(c.box).padEnd(28)} ${c.cls}`)
  }

  if (has('--stacking')) {
    // Make sure the rail is open, then hover a card so the magnified overlay paints.
    for (let i = 0; i < 3; i++) {
      if (await page.evaluate(() => document.querySelector('.dsx-wave-deck') !== null)) break
      const cap = page.locator('button.dsx-stats-capsule').first()
      if (!(await cap.count())) break
      await cap.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(1200)
    }
    const deck = await page.evaluate(() => {
      const el = document.querySelector('.dsx-wave-deck')
      if (el === null) return null
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }
    })
    if (deck === null) { console.log('no rail deck in this window (open a session and the Widgets capsule first)') } else {
      await page.mouse.move(deck.x + deck.w / 2, deck.y + 80, { steps: 3 })
      await page.waitForTimeout(700)
      const report = await page.evaluate(({ d }) => {
        const chain = (el) => {
          const out = []
          let n = el
          while (n !== null && out.length < 9) {
            const s = getComputedStyle(n)
            out.push(`${n.tagName}.${String(n.className).slice(0, 30)}[${s.position}/${s.zIndex}]`)
            n = n.parentElement
          }
          return out
        }
        const hit = (x, y) => {
          const el = document.elementFromPoint(x, y)
          if (el === null) return 'none'
          const dsx = el.closest('[class*="dsx-"]')
          return dsx !== null ? `WIDGETS:${String(dsx.className).slice(0, 30)}` : `${el.tagName}.${String(el.className).slice(0, 34)}`
        }
        const overlay = document.querySelector('.dsx-magnify-layer')
        const nav = document.querySelector('[class*="avigator"]')
        const topbar = document.querySelector('header, [class*="topBar"], [class*="TopBar"]')
        const card = document.querySelector('.dsx-stats-card')
        const samples = []
        for (const fy of [0.05, 0.3, 0.6, 0.9]) samples.push([Math.round(d.x + d.w / 2), Math.round(d.y + d.h * fy)])
        return {
          railOverlayBox: overlay === null ? null : [Math.round(overlay.getBoundingClientRect().x), Math.round(overlay.getBoundingClientRect().y), Math.round(overlay.getBoundingClientRect().width), Math.round(overlay.getBoundingClientRect().height)],
          railOverlayChain: overlay === null ? null : chain(overlay),
          navBox: nav === null ? null : [Math.round(nav.getBoundingClientRect().x), Math.round(nav.getBoundingClientRect().y), Math.round(nav.getBoundingClientRect().width), Math.round(nav.getBoundingClientRect().height)],
          navChain: nav === null ? null : chain(nav),
          topbarBox: topbar === null ? null : [Math.round(topbar.getBoundingClientRect().x), Math.round(topbar.getBoundingClientRect().y), Math.round(topbar.getBoundingClientRect().width), Math.round(topbar.getBoundingClientRect().height)],
          topbarChain: topbar === null ? null : chain(topbar),
          cardFont: card === null ? null : getComputedStyle(card.querySelector('.dsx-stats-card-title') ?? card).fontFamily.slice(0, 70),
          hits: samples.map(([x, y]) => `${x},${y} -> ${hit(x, y)}`),
        }
      }, { d: deck })
      for (const [k, v] of Object.entries(report)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') { console.log(`${k}:`); for (const line of v) console.log('   ', line) } else console.log(`${k}: ${JSON.stringify(v)}`)
      }
    }
  }

  if (has('--shot')) {
    const file = value('--shot') ?? 'desktop.png'
    await page.screenshot({ path: file })
    console.log(`screenshot -> ${file}`)
  }

  await browser.close()
})().catch((e) => { console.error('probe failed:', e.message); process.exit(2) })
