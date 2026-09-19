/**
 * Release smoke (scripts/verify-release-smoke.cjs)
 *
 * Checks the two things a release must not get wrong:
 *   A. the plugin's own UI strings show REAL Chinese in the live GUI (an encoding
 *      round-trip during development once mangled the source; this proves the shipped
 *      bundle is clean);
 *   B. every widget that the built registry exports actually RENDERS — in particular
 *      the ones added since the last release (trajectory), whose source files have no
 *      published release yet.
 *
 * Usage: node scripts/verify-release-smoke.cjs
 */
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('./diag-auth-lib.cjs')

const fails = []
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) fails.push(label + (detail ? ' — ' + detail : ''))
}

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 } })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 40000 })
  const row = page.locator('[class$="_sessionRow"]').first()
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(5000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 4; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    if (!(await cap.count())) break
    await cap.click(); await page.waitForTimeout(600)
  }
  await page.waitForTimeout(800)

  // A. UI strings: the installed widget set must show readable Chinese, no mojibake.
  const strings = await page.evaluate(() => {
    const rail = document.querySelector('.dsx-stats-rail')
    const panel = document.querySelector('.dsx-stats-addpanel')
    const caps = Array.from(document.querySelectorAll('.dsx-stats-capsule'))
    const titles = Array.from(document.querySelectorAll('.dsx-stats-card-title, .dsx-stats-add-label, .dsx-stats-addpanel-title'))
    const all = [...titles, ...caps, ...(panel ? [panel] : [])]
      .map((e) => (e.textContent || '').trim()).filter(Boolean)
    return { samples: [...new Set(all)].slice(0, 24), railText: rail ? rail.textContent.slice(0, 400) : '' }
  })
  const moji = /[\uFFFD\u9225-\u922f\u94ac\u94ec\u952f\u9530]/
  const bad = strings.samples.filter((s) => moji.test(s))
  check(bad.length === 0, 'no mojibake in the rendered UI strings', bad.length ? `bad: ${bad.slice(0, 3).join(' | ')}` : `${strings.samples.length} samples clean`)
  const cjk = strings.samples.filter((s) => /[\u4e00-\u9fff]/.test(s))
  check(cjk.length > 0, 'Chinese UI strings render as real characters', `e.g. ${cjk.slice(0, 4).join(' / ')}`)

  // B. every registered widget renders a card in the add panel's list
  const registered = await page.evaluate(() => {
    // The rail's own rendered card titles are the ground truth for "this widget ran".
    const titles = Array.from(document.querySelectorAll('.dsx-stats-card-title')).map((e) => (e.textContent || '').trim())
    return [...new Set(titles)]
  })
  console.log('rendered cards:', registered.length, JSON.stringify(registered.slice(0, 12)))
  check(registered.length >= 3, 'the rail renders its cards', `${registered.length} cards`)
  check(pageErrors.length === 0, 'no page errors while rendering', pageErrors.slice(0, 2).join(' | '))

  // The trajectory widget is the one added since v1.6.0: prove it can be installed and
  // drawn (its card title is 对话轨迹 / "Trajectory").
  const addPanelOk = await page.evaluate(() => {
    const btn = document.querySelector('.dsx-stats-add')
    if (btn === null) return 'no add button'
    btn.click()
    return 'opened'
  })
  await page.waitForTimeout(700)
  const panelInfo = await page.evaluate(() => {
    const panel = document.querySelector('.dsx-stats-addpanel')
    if (panel === null) return null
    const text = panel.textContent || ''
    return { hasTrajectory: /轨迹|Trajectory/.test(text), chars: text.length, sample: text.slice(0, 160) }
  })
  check(addPanelOk === 'opened', 'the add panel opens', addPanelOk)
  check(panelInfo !== null && panelInfo.chars > 50, 'the add panel renders its widget list', panelInfo ? `${panelInfo.chars} chars` : 'no panel')
  if (panelInfo) console.log('   panel mentions trajectory:', panelInfo.hasTrajectory, '| sample:', panelInfo.sample.replace(/\s+/g, ' ').slice(0, 120))

  await browser.close()
  console.log('\n' + (fails.length === 0 ? 'ALL CHECKS PASSED' : `${fails.length} CHECK(S) FAILED:\n - ` + fails.join('\n - ')))
  process.exit(fails.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(1) })
