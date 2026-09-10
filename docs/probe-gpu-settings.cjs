// 探针：设置页 → 组件 → 配置预览（CardBody unit=150），验证 sys-gpu-line 卡片高度
const path = require('path')
const fs = require('fs')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const OUT = path.join(__dirname, 'gpu-height-evidence.txt')
const log = (line) => { console.log(line); fs.appendFileSync(OUT, line + '\n') }

;(async () => {
  fs.writeFileSync(OUT, `=== probe-gpu-height(settings preview) ${new Date().toISOString()} ===\n`)
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2500)

  // 打开设置：先找"设置"入口按钮
  const setBtn = page.getByText('设置', { exact: true }).first()
  const sb = await setBtn.count()
  log('SETTINGS_ENTRY_COUNT: ' + sb)
  if (sb > 0) {
    await setBtn.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(2500)
  }
  // 设置面板现在是某个 overlay；dump 可见文本找「组件」
  const bodyText = await page.evaluate(() => document.body.innerText)
  log('BODY_HAS_组件: ' + bodyText.includes('组件'))
  log('BODY_HEAD: ' + JSON.stringify(bodyText.slice(0, 400)))

  // 尝试点设置导航里的「组件」
  const widgetNav = page.getByText('组件', { exact: true }).first()
  const wn = await widgetNav.count()
  log('WIDGET_NAV_COUNT: ' + wn)
  if (wn > 0) { await widgetNav.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2500) }

  // 组件配置页：找「GPU 利用率」行并点击（ConfigTab 的 OrderList items）
  const gpuRow = page.getByText('GPU 利用率').first()
  const gr = await gpuRow.count()
  log('GPU_ROW_COUNT: ' + gr)
  if (gr > 0) { await gpuRow.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2500) }

  // 量预览卡片高度
  const preview = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.dsx-stats-card')).map((c) => {
      const r = c.getBoundingClientRect()
      const title = (c.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim()
      return { title, h: Math.round(r.height), w: Math.round(r.width) }
    })
    if (cards.length === 0) return cards
    // 预览卡片在设置面板内（最后一个卡片一般是预览；此处直接列全部）
    return cards
  })
  log('PREVIEW_CARDS: ' + JSON.stringify(preview))
  log('CONSOLE_ERRORS: ' + JSON.stringify(errors))
  await browser.close()
})().catch((e) => { console.error('SCRIPT_FAIL', e); fs.appendFileSync(OUT, 'SCRIPT_FAIL: ' + (e && e.stack || e) + '\n'); process.exit(1) })