/**
 * Continuous-corner-curvature check (docs/verify-corner-shape.cjs)
 *
 * The component settings page exposes two controls that must reach the ACTUAL
 * rail cards (not just the previews):
 *
 *   - 连续曲率圆角 (default ON) → every card carries `dsx-squircle`, i.e.
 *     `corner-shape: squircle` on engines that know it;
 *   - 圆角大小 → the corner radius is `shortSide x gear%` (12 / 16 / 20 / 24),
 *     NOT a fixed px value, so a magnified card keeps the reference ratio.
 *
 * This probe drives the real GUI, flips both controls and reads the rail cards
 * back, then restores the values it found.
 *
 * Run: node docs/verify-corner-shape.cjs      (needs the local GUI on :3080)
 */
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const ORIGIN = 'http://127.0.0.1:3080'
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const SQUIRCLE_ROW = ['连续曲率圆角', 'Continuous corner curvature']
const CORNER_ROW = ['圆角档位', 'Corner radius']

/** Rail cards: their squircle class, radius and short side. */
const readCards = () => [...document.querySelectorAll('.dsx-wave-deck .dsx-stats-card')].map((c) => {
  const r = c.getBoundingClientRect()
  return {
    squircle: c.classList.contains('dsx-squircle'),
    radius: Math.round(parseFloat(getComputedStyle(c).borderTopLeftRadius || '0')),
    side: Math.round(Math.min(r.width, r.height)),
  }
})

;(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 } })
  await ctx.addCookies([mintCookie('127.0.0.1:3080')])
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  const row = page.locator('[class$="_sessionRow"]').first()
  await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4000) }
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 4; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-wave-deck .dsx-stats-card'))) break
    if (!(await cap.count())) break
    await cap.click().catch(() => {}); await page.waitForTimeout(500)
  }
  if (!(await page.evaluate(() => !!document.querySelector('.dsx-wave-deck .dsx-stats-card')))) throw new Error('no rail card on screen')

  // The settings page hosting both controls.
  await page.locator('[class$="_trigger"]').first().click()
  await page.waitForSelector('[class$="_navList"]', { timeout: 15000 })
  await page.locator('[class$="_navList"] > button', { hasText: '组件' }).first().click()
  await page.waitForTimeout(500)
  // The section opens on its 组件配置 tab; both corner controls live on 组件设置
  // (the third tab, in that order).
  await page.locator('.dsx-tab').nth(2).click()
  await page.waitForSelector('input.dsx-switch-input', { timeout: 10000 })
  await page.waitForTimeout(500)

  // Find the control by its row TITLE: take the SMALLEST element that contains
  // the title and the control, so a broad tab container cannot capture the index
  // of an unrelated select.
  const control = async (titles, tag) => page.evaluate(([list, sel]) => {
    const hosts = [...document.querySelectorAll('div, section, li')]
      .filter((el) => {
        const text = el.textContent || ''
        return list.some((t) => text.includes(t)) && el.querySelector(sel) !== null
      })
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    if (hosts.length === 0) return -1
    const node = hosts[0].querySelector(sel)
    return [...document.querySelectorAll(sel)].indexOf(node)
  }, [titles, tag])

  const switchIdx = await control(SQUIRCLE_ROW, 'input.dsx-switch-input')
  const selectIdx = await control(CORNER_ROW, 'select.dsx-select')
  if (switchIdx < 0) throw new Error('the 连续曲率圆角 switch was not found on the settings page')
  if (selectIdx < 0) throw new Error('the 圆角档位 select was not found on the settings page')
  // The switch's own track/thumb covers the input, so the LABEL is the click
  // target (the same one a user hits); the input still carries the state.
  const sw = page.locator('label.dsx-switch-row').nth(switchIdx)
  const swInput = page.locator('input.dsx-switch-input').nth(switchIdx)
  const sel = page.locator('select.dsx-select').nth(selectIdx)
  const initialOn = await swInput.isChecked()
  const initialGear = await sel.inputValue()

  const before = await page.evaluate(readCards)
  const gearPct = Number(initialGear) || 16
  const radiusOf = (cards, pct) => cards.every((c) => c.radius === Math.round(c.side * pct / 100))

  // 1) default ON: every card carries the squircle class at the current gear.
  await sw.click()
  await page.waitForTimeout(400)
  const toggled = await page.evaluate(readCards)
  await sw.click()
  await page.waitForTimeout(400)
  const back = await page.evaluate(readCards)

  // 2) the gear reaches the rail too: 24% must widen every radius.
  await sel.selectOption('24')
  await page.waitForTimeout(400)
  const gear24 = await page.evaluate(readCards)
  await sel.selectOption(initialGear)
  await page.waitForTimeout(400)

  await browser.close()

  const fails = []
  const withClass = (cards) => cards.filter((c) => c.squircle).length
  if (before.length === 0) fails.push('no rail cards measured')
  if (initialOn && withClass(before) !== before.length) fails.push(`${before.length - withClass(before)} card(s) without dsx-squircle while the switch is ON`)
  if (!radiusOf(before, gearPct)) fails.push(`default radius is not ${gearPct}% of the short side: ${JSON.stringify(before.slice(0, 3))}`)
  const expectToggled = initialOn ? 0 : toggled.length
  if (withClass(toggled) !== expectToggled) fails.push(`after flipping the switch: ${withClass(toggled)} of ${toggled.length} cards carry dsx-squircle, expected ${expectToggled}`)
  if (initialOn && withClass(back) !== back.length) fails.push(`${back.length - withClass(back)} card(s) did not return to dsx-squircle after flipping the switch back`)
  if (!gear24.every((c) => c.radius === Math.round(c.side * 24 / 100))) fails.push(`24% gear did not reach the rail: ${JSON.stringify(gear24.slice(0, 3))}`)

  console.log(`cards=${before.length} side=${before[0] ? before[0].side : '-'} radius=${before[0] ? before[0].radius : '-'} (${gearPct}% gear, switch ${initialOn ? 'ON' : 'OFF'})`)
  console.log(`flipped: squircle=${withClass(toggled)}/${toggled.length}  flipped back: squircle=${withClass(back)}/${back.length}`)
  console.log(`24% gear: radius=${gear24[0] ? gear24[0].radius : '-'} (expected ${gear24[0] ? Math.round(gear24[0].side * 24 / 100) : '-'})`)
  for (const f of fails) console.log('! ' + f)
  console.log('page errors:', JSON.stringify(errs))
  console.log('CORNER SHAPE: ' + (fails.length === 0 && errs.length === 0 ? 'PASS' : 'FAIL'))
  process.exit(fails.length === 0 && errs.length === 0 ? 0 : 1)
})().catch((e) => { console.error('FAILED', e); process.exit(2) })
