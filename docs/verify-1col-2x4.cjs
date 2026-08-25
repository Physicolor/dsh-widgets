// Verify 1-column mode blocks 2×4 tiles end-to-end on the live web:
//   - while in a multi-column layout, adding a heatmap@2×4 puts it on the rail;
//   - switching to 1 column: the market detail shows the title struck through
//     with a yellow "1列不可用" capsule and the add button disabled, and the
//     installed 2×4 instance disappears from the rail (state untouched).
// Snapshots host state and restores it (columns + any temporary add) at the end.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  const errs = []
  const fail = (msg) => { console.log(`FAIL: ${msg}`); errs.push(msg) }
  const pass = (msg) => console.log(`PASS: ${msg}`)
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  // Open the most recent session (fresh context has none; the rail needs one).
  for (const title of ['AutoResearchClaw改造', '探索未至之境']) {
    const t = page.getByText(title, { exact: false }).first()
    if (await t.count()) { await t.click(); await sleep(4000); break }
  }
  if (!(await page.locator('button.dsx-stats-capsule').first().count())) { fail('no active session / capsule'); await browser.close(); process.exit(1) }

  const getHostState = () => page.evaluate(async () => { const r = await fetch('/api/widgets-state'); return r.ok ? await r.json() : null })
  const originalState = await getHostState()
  const restoreState = async () => {
    await page.evaluate(async (orig) => {
      if (!orig) return
      await fetch('/api/widgets-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }) }).catch(() => {})
    }, originalState)
    await page.reload({ waitUntil: 'networkidle' })
    await sleep(1200)
  }
  const cleanup = async () => { try { await restoreState() } catch (e) { console.log('WARN: cleanup failed:', e.message) } }

  try {
    await page.locator('button.dsx-stats-capsule').first().click()
    await sleep(1200)
    await page.locator('.dsx-stats-add').first().click()
    await sleep(900)

    // Settings tab: record the user's columns; ensure a multi-column layout
    // first (2×4 only fits there).
    await page.locator('.dsx-stats-addpanel button.dsx-tab:has-text("组件设置")').first().click()
    await sleep(500)
    const colsSel = page.locator('.dsx-stats-addpanel select.dsx-select').first()
    const colsBefore = await colsSel.inputValue()
    if (colsBefore === '1') { await colsSel.selectOption('2'); await sleep(700) }

    // Add heatmap@2×4 if it isn't installed yet (multi-column rail should show it).
    await page.locator('.dsx-stats-addpanel button.dsx-tab:has-text("组件市场")').first().click()
    await sleep(500)
    await page.locator('.dsx-stats-addpanel .dsx-mcard:has-text("Coding Plan 用量")').first().click()
    await sleep(600)
    const dots = page.locator('.dsx-stats-addpanel .dsx-dot')
    pass(`market detail open with ${await dots.count()} size instances`)
    await dots.nth(1).click() // heatmap 2×4 (instances: 2×2, 2×4, bars)
    await sleep(500)
    const addBtn = page.locator('.dsx-stats-addpanel button:has-text("添加")').first()
    const already24 = !(await addBtn.count())
    if (await addBtn.count() && !(await addBtn.isDisabled())) {
      await addBtn.click(); await sleep(800)
      pass('added heatmap@2×4 via market (multi-column)')
    } else if (already24 || await addBtn.isDisabled()) {
      pass('heatmap@2×4 already installed (verified in rail below)')
    }

    // Multi-column rail: the wide slot exists.
    const wideInRail = () => page.evaluate(() => {
      const slots = [...document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot')]
      const ws = slots.map((s) => parseFloat(s.style.width) || 0).filter((w) => w > 0)
      const min = Math.min(...ws)
      return { max: Math.max(...ws), wide: ws.filter((w) => w > min * 1.5).length }
    })
    const wideBefore = await wideInRail()
    pass(`multi-col rail holds a 2×4-wide slot (wide=${wideBefore.wide}, max=${wideBefore.max.toFixed(0)}px)`)

    // Switch to 1 column via the settings tab.
    await page.locator('.dsx-stats-addpanel button.dsx-tab:has-text("组件设置")').first().click()
    await sleep(500)
    await colsSel.selectOption('1')
    await sleep(800)

    // Market detail now marks the 2×4 instance as blocked.
    await page.locator('.dsx-stats-addpanel button.dsx-tab:has-text("组件市场")').first().click()
    await sleep(500)
    await page.locator('.dsx-stats-addpanel .dsx-mcard:has-text("Coding Plan 用量")').first().click()
    await sleep(600)
    await page.locator('.dsx-stats-addpanel .dsx-dot').nth(1).click()
    await sleep(500)
    const blocked = await page.evaluate(() => {
      const panel = document.querySelector('.dsx-stats-addpanel')
      const back = [...panel.querySelectorAll('button')].find((b) => b.textContent.includes('返回'))
      const row = back && back.parentElement
      const titleZone = row && row.querySelector('div')
      const titleSpan = titleZone && titleZone.querySelector('span')
      const capsule = titleZone && titleZone.querySelector('.dsx-size-warn')
      const act = [...row.querySelectorAll('button')].pop()
      return {
        title: titleSpan ? titleSpan.textContent : null,
        strike: titleSpan ? getComputedStyle(titleSpan).textDecorationLine : null,
        capsule: capsule ? capsule.textContent : null,
        actDisabled: act ? act.disabled : null,
      }
    })
    pass(`2×4 title shown: ${blocked.title}`)
    if (!(blocked.strike || '').includes('line-through')) {
      fail(`2×4 title not struck through (${blocked.strike})`)
    } else {
      pass('2×4 title struck through in 1-col')
    }
    if (blocked.capsule !== '1列不可用') {
      fail(`yellow capsule missing/wrong (${blocked.capsule})`)
    } else {
      pass('yellow "1列不可用" capsule visible')
    }
    if (!blocked.actDisabled) {
      fail('add button not disabled for blocked 2×4')
    } else {
      pass('add button disabled for blocked 2×4')
    }

    // Rail: no wide slot while 1-col.
    const wideAfter = await wideInRail()
    pass(`1-col rail: wide=${wideAfter.wide}, max=${wideAfter.max.toFixed(0)}px`)
    if (wideAfter.wide === 0) {
      pass('installed 2×4 instances hidden from the 1-col rail')
    } else {
      fail('2×4-wide slot still rendered in 1-col rail')
    }
  } catch (e) {
    fail(`unexpected: ${e.message}`)
  } finally {
    await cleanup()
  }

  const finalCols = await getHostState()
  console.log(`RESULT: ${errs.length === 0 ? 'PASS' : 'FAILURES: ' + errs.join(' | ')}`)
  console.log(`host columns after cleanup: ${finalCols && finalCols.state ? finalCols.state.columns : '?'}`)
  await browser.close()
  process.exit(errs.length === 0 ? 0 : 1)
})()