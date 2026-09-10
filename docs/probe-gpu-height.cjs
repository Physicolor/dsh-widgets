// dsh-widgets GPU 卡片悬浮高度异常探测（自包含，连真实 3080）
// 现象：鼠标悬浮 sys-gpu 2×2 卡片后高度≈176（正常应为 cardSide=150 或
// magnify 放大的预期值）。本脚本实测：静态层 / magnify overlay 层各自的
// slot 与卡片高度，悬浮前后对比，并打印逐卡 rect，定位高度变化来源。
const path = require('path')
const fs = require('fs')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const OUT = path.join(__dirname, 'gpu-height-evidence.txt')
const log = (line) => { console.log(line); fs.appendFileSync(OUT, line + '\n') }

;(async () => {
  fs.writeFileSync(OUT, `=== probe-gpu-height ${new Date().toISOString()} ===\n`)
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2500)

  // 保真护栏：快照宿主状态，结束时恢复（本脚本不写任何用户数据）
  const originalState = await page.evaluate(async () => {
    const r = await fetch('/api/widgets-state')
    return r.ok ? await r.json() : null
  })
  const restoreState = () => page.evaluate(async (orig) => {
    if (!orig) return
    await fetch('/api/widgets-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: typeof orig.savedAt === 'number' ? orig.savedAt : 0, state: orig.state || {} }),
    }).catch(() => {})
  }, originalState)

  const prefs = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('harness-widgets.state')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  log('PREFS: ' + JSON.stringify(prefs && {
    cardSide: prefs.cardSide, magnify: prefs.magnify, realTime: prefs.realTime,
    columns: prefs.columns, panelPadding: prefs.panelPadding, installed: prefs.installed,
  }))

  // 进入会话：优先点用户的会话「dsh-widgets的GPU利用率卡片出现」，然后「新会话」
// 文本（主页可见），最后随便点一个列表会话（TURN_* 交接会话）
  let inSession = await page.locator('[data-slot="conversation.session.header.utilities"]').count()
  if (inSession === 0) {
    const targets = [
      'dsh-widgets的GPU利用率卡片出现',
      '新会话',
      /TURN_\d+·科研对话交接/,
      /GPU利用率/,
    ]
    for (const sel of targets) {
      if (inSession > 0) break
      const t = page.getByText(sel).first()
      const n = await t.count()
      log('NAV_TRY ' + String(sel) + ' -> ' + n)
      if (n > 0) {
        await t.click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(6000)
        inSession = await page.locator('[data-slot="conversation.session.header.utilities"]').count()
      }
    }
    log('IN_SESSION_AFTER_NAV: ' + inSession)
  } else {
    log('ALREADY_IN_SESSION: 1')
  }

  // 打开组件 rail（轮询等待挂载；必要时刷新重试）
  let railN = 0
  let slotN = 0
  for (let attempt = 0; attempt < 4 && (railN === 0 || slotN === 0); attempt++) {
    const capsule = page.locator('button.dsx-stats-capsule').first()
    const capN = await capsule.count()
    log('CAPSULE_COUNT(attempt ' + attempt + '): ' + capN)
    if (capN === 0) {
      await page.waitForTimeout(1500)
      if (attempt < 3) { await page.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}); await page.waitForTimeout(4500) }
      continue
    }
    const pressed = await capsule.getAttribute('aria-pressed')
    if (pressed !== 'true') await capsule.click()
    // 轮询等待静态卡片挂载（最长 10s）
    for (let w = 0; w < 20 && slotN === 0; w++) {
      await page.waitForTimeout(500)
      slotN = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').count()
    }
    railN = slotN > 0 ? 1 : 0
    if ((railN === 0 || slotN === 0) && attempt < 3) { await page.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}); await page.waitForTimeout(4500) }
  }
  log('RAIL_COUNT: ' + railN + ' SLOT_COUNT: ' + slotN)
  if (railN === 0 || slotN === 0) {
    const diag = await page.evaluate(() => ({
      bodyClass: document.body.className,
      capsPressed: document.querySelector('button.dsx-stats-capsule')?.getAttribute('aria-pressed') ?? null,
      dock: document.querySelectorAll('[data-slot="conversation.composer.dock"]').length,
      rail: document.querySelectorAll('.dsx-stats-rail').length,
      slotCount: document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot').length,
    }))
    log('ABORT_DIAG: ' + JSON.stringify(diag) + ' CONSOLE_ERRORS: ' + JSON.stringify(errors))
    await restoreState()
    await browser.close()
    return
  }

  const snap = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot'))
    return slots.map((s, i) => {
      const r = s.getBoundingClientRect()
      const card = s.querySelector('.dsx-stats-card')
      const cr = card ? card.getBoundingClientRect() : null
      const title = card ? (card.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim() : ''
      return { i, title, slotH: Math.round(r.height), cardH: cr ? Math.round(cr.height) : null, w: Math.round(r.width), top: Math.round(r.top) }
    })
  })
  log('REST_SLOTS: ' + JSON.stringify(snap))

  // 找「GPU 利用率」卡片（sys-gpu-line；优先精确标题，其次任意含 GPU 的标题）
  let gpuIdx = snap.findIndex((s) => s.title.indexOf('GPU 利用率') !== -1)
  if (gpuIdx === -1) gpuIdx = snap.findIndex((s) => s.title.indexOf('GPU') !== -1)
  if (gpuIdx === -1) { log('ABORT: no GPU card found'); await restoreState(); await browser.close(); return }
  log('GPU_CARD_INDEX: ' + gpuIdx + ' (title=' + snap[gpuIdx].title + ')')

  const overlayInfo = () => page.evaluate(() => {
    const layer = Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '25')
    if (!layer) return null
    const cs = getComputedStyle(layer)
    const slots = Array.from(layer.querySelectorAll('.dsx-stats-card-slot')).map((s) => {
      const r = s.getBoundingClientRect()
      const card = s.querySelector('.dsx-stats-card')
      const cr = card ? card.getBoundingClientRect() : null
      const title = card ? (card.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim() : ''
      return { title, slotH: Math.round(r.height), cardH: cr ? Math.round(cr.height) : null, w: Math.round(r.width), top: Math.round(r.top) }
    })
    return { opacity: cs.opacity, pts: slots }
  })

  log('OVERLAY_REST: ' + JSON.stringify(await overlayInfo()))

  const gpuSlot = page.locator('.dsx-stats-rail .dsx-stats-card-slot').nth(gpuIdx)
  const box = await gpuSlot.boundingBox()
  log('GPU_SLOT_BOX: ' + JSON.stringify(box && { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) }))

  // 悬浮 GPU 卡片中心
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(900)
    log('OVERLAY_ON_GPU: ' + JSON.stringify(await overlayInfo()))
    log('STATIC_ON_GPU: ' + JSON.stringify(await page.evaluate((idx) => {
      const s = document.querySelectorAll('.dsx-stats-rail .dsx-stats-card-slot')[idx]
      if (!s) return null
      const r = s.getBoundingClientRect()
      const card = s.querySelector('.dsx-stats-card')
      const cr = card ? card.getBoundingClientRect() : null
      return { slotH: Math.round(r.height), cardH: cr ? Math.round(cr.height) : null, w: Math.round(r.width), top: Math.round(r.top) }
    }, gpuIdx)))

    // 沿 GPU 卡片向下扫：每 12px 采一次 overlay 高度，看波峰与回落
    const sweep = []
    for (let k = 1; k <= 8; k++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + k * 12)
      await page.waitForTimeout(80)
      const o = await overlayInfo()
      const g = o && o.pts[gpuIdx] ? o.pts[gpuIdx] : null
      sweep.push(g ? g.cardH : null)
    }
    log('SWEEP_BELOW (overlay cardH @ +12px steps): ' + JSON.stringify(sweep))

    // 移到 rail 外，确认回落
    await page.mouse.move(100, box.y + box.height / 2)
    await page.waitForTimeout(700)
    log('OVERLAY_AFTER_LEAVE: ' + JSON.stringify(await overlayInfo()))
  }

  // 悬浮其它卡片（非 GPU）对比，确认是否全卡片放大
  const otherIdx = gpuIdx === 0 ? 1 : 0
  const otherBox = await page.locator('.dsx-stats-rail .dsx-stats-card-slot').nth(otherIdx).boundingBox()
  if (otherBox) {
    await page.mouse.move(otherBox.x + otherBox.width / 2, otherBox.y + otherBox.height / 2)
    await page.waitForTimeout(900)
    const o = await overlayInfo()
    log('OVERLAY_ON_OTHER(idx=' + otherIdx + '): ' + JSON.stringify(o && o.pts[otherIdx]))
  }

  log('CONSOLE_ERRORS: ' + JSON.stringify(errors))
  await restoreState()
  await browser.close()
  log('=== done ===')
})().catch((e) => { console.error('SCRIPT_FAIL', e); fs.appendFileSync(OUT, 'SCRIPT_FAIL: ' + (e && e.stack || e) + '\n'); process.exit(1) })