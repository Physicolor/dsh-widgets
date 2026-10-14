/**
 * Rail-drift reproduction counter — attributes the swallowed-rail race.
 *
 * The question this answers: `dsh-ui-harmonizer`'s `verify-rapid-toggle.cjs`
 * occasionally fails with "9 clicks @130ms: the rail did not move — 768px",
 * i.e. `--dsx-rail-right` stayed at the anchor expression while the panel was
 * open, so the rail popped out from under the panel (left 1247 → 479). Is that
 * the harmonizer's instant gate, or dsh-widgets' own swallowed-decision race?
 *
 * This harness runs the SAME storm sequence on both arms and only counts:
 *   - ON  : plugin live, the instant gate does its job
 *   - OFF : `enhc-panel-glide` removed ⇒ the plugin's capture handler
 *           early-returns, so no `data-enhc-instant`, no `data-enhc-opening`,
 *           no covers; the frame keeps the product's own 300ms transition
 *
 * It deliberately installs NO `setProperty` hook and NO per-frame sampler during
 * the storm: both force layout / capture stacks inside the deciding frame and
 * paper over exactly the race under test (a hooked variant reproduced 0/8). The
 * rail state is read once, AFTER the storm settles.
 *
 * Result (2026-10-05, see dsh-ui-harmonizer/docs/handoff/RIGHT-PANEL-SYNC.md):
 * ON 0/30, OFF 2/30, ON 1/60 — i.e. easier to reproduce with this plugin inert,
 * so the drift is an upstream race and not the plugin's residue. The signature
 * is that the rail MOVED while its claim is still the anchor expression; a drift
 * with the claim already `0px` would be the plugin's own.
 *
 *   node scripts/probe-rail-drift.cjs <on|off|both> [storms] [gap] [clicks] [settle]
 *
 * Env: DSH_URL (default the live GUI), DSH_SESSION.
 */
const fs = require('node:fs')
const crypto = require('node:crypto')
const { chromium } = require('./lib/playwright-core.cjs')
const { chromePath } = require('./lib/chrome.cjs')

const URL_ = process.env.DSH_URL || 'http://127.0.0.1:19387'
const SESSION = process.env.DSH_SESSION || 'Laya与RRSI必要性1天'
const WHICH = process.argv[2] || 'both'
const STORMS = Number(process.argv[3] || 25)
const GAP = Number(process.argv[4] || 130)
const CLICKS = Number(process.argv[5] || 9)
const SETTLE = Number(process.argv[6] || 3200)

function authCookie() {
  const yaml = fs.readFileSync('D:/dsh-home/.credentials.yaml', 'utf8')
  const secret = Buffer.from(yaml.match(/secret:\s*([A-Za-z0-9_-]+)/)[1].replaceAll('-', '+').replaceAll('_', '/'), 'base64')
  const authority = new global.URL(URL_).host
  const b64u = (b) => Buffer.from(b).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  const name = 'dsh-auth-' + b64u(crypto.createHash('sha256').update(authority).digest())
  const now = Date.now()
  const body = b64u(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt: now, expiresAt: now + 86400000 }), 'utf8'))
  return { name, value: `v1.${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
}

// No side effects beyond `window.__rr`: no prototype patches, no timers.
const INSTALL = () => {
  const q = (s) => document.querySelector(s)
  const railL = () => { const r = q('.dsx-stats-rail'); return r === null ? null : Math.round(r.getBoundingClientRect().left) }
  const inlineTrack = () => { const f = q('[class$="_frame"]'); return f === null ? null : f.style.gridTemplateColumns }
  const rv = () => document.documentElement.style.getPropertyValue('--dsx-rail-right') || '(none)'
  window.__rr = {
    toggle: () => { const b = q('[data-sidebar-right-toggle]') || q('[data-sidebar-right-expand]'); if (b === null) return false; b.click(); return true },
    storm: async (n, gap) => { for (let i = 0; i < n; i += 1) { window.__rr.toggle(); await new Promise((r) => setTimeout(r, gap)) } },
    state: () => {
      const s = inlineTrack()
      const open = s !== null && /minmax\(0px,\s*768px\)/.test(s)
      return { railL: railL(), rv: rv(), open, track: s, g: (document.documentElement.hasAttribute('data-enhc-instant') ? 'I' : '-') + (document.documentElement.hasAttribute('data-enhc-opening') ? 'O' : '-') }
    },
    reset: async () => {
      // settle to the closed state and give React/RO a full beat to catch up
      const t = inlineTrack()
      if (t !== null && /minmax\(0px,\s*768px\)/.test(t)) { window.__rr.toggle(); await new Promise((r) => setTimeout(r, 2400)) }
      await new Promise((r) => setTimeout(r, 600))
      return window.__rr.state()
    },
  }
}

async function openSession(page, arm) {
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(6000)
  const welcome = page.getByRole('button', { name: '继续' }).first()
  if (await welcome.count()) { await welcome.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1500) }
  const row = page.locator('div[class*="sessionRow"]', { hasText: SESSION }).first()
  if (!(await row.count())) throw new Error(`no session row matching "${SESSION}"`)
  await row.click({ timeout: 8000 })
  await page.waitForTimeout(4500)
  const cap = page.locator('button.dsx-stats-capsule').first()
  if (await cap.count()) {
    const vis = await page.evaluate(() => { const r = document.querySelector('.dsx-stats-rail'); return r === null ? null : getComputedStyle(r).visibility })
    if (vis !== 'visible') { await cap.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200) }
  }
  if (arm === 'off') { await page.evaluate(() => { document.documentElement.classList.remove('enhc-panel-glide') }); await page.waitForTimeout(400) }
  await page.evaluate(INSTALL)
}

;(async () => {
  const arms = WHICH === 'both' ? ['on', 'off'] : [WHICH]
  const c = authCookie()
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const errors = []
  const summary = {}
  // The rail's parked (un-yielded) left, measured on the first arm's first frame
  // rather than hardcoded: it follows the viewport and the panel width.
  let parkedL = null
  for (const arm of arms) {
    const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 } })
    await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push(`${arm}: ${e.message}`))
    try {
      await openSession(page, arm)
      let drift = 0
      let wrongSide = 0
      for (let s = 0; s < STORMS; s += 1) {
        const pre = await page.evaluate(async () => await window.__rr.reset())
        if (parkedL === null && pre.railL !== null) parkedL = pre.railL
        await page.evaluate(async (a) => await window.__rr.storm(a.n, a.gap), { n: CLICKS, gap: GAP })
        const post = await page.evaluate(async (a) => { await new Promise((r) => setTimeout(r, a.settle)); return window.__rr.state() }, { settle: SETTLE })
        const bad = post.open && post.railL !== null && parkedL !== null && Math.abs(post.railL - parkedL) > 2
        if (bad) drift += 1
        if (post.open !== (CLICKS % 2 === 1)) wrongSide += 1
        if (bad || s % 5 === 0) console.log(`[${arm} s${String(s).padStart(2)}] pre railL=${pre.railL} open=${pre.open} → post railL=${post.railL} rv=${post.rv.slice(0, 20)} open=${post.open} g=${post.g} ${bad ? 'DRIFT' : 'ok'}`)
      }
      summary[arm] = `drift ${drift}/${STORMS} (wrongFinalSide ${wrongSide})`
    } catch (e) {
      console.log(`FATAL ${arm}: ${e && e.stack || e}`)
      summary[arm] = 'fatal'
    }
    await ctx.close()
  }
  console.log(`\nparked rail left: ${parkedL}`)
  console.log('SUMMARY ' + JSON.stringify(summary))
  console.log('errors: ' + JSON.stringify(errors.slice(0, 5)))
  await browser.close()
})()
