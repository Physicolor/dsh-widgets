// Probe the official composer-dock stats line (below the input box) DOM so we
// can target it with the hide switch, and capture current prefs snapshot.
const path = require('path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } })
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'networkidle', timeout: 30000 })
  const sess = page.getByText('组件状态保存问题排查').first()
  if (await sess.count()) { await sess.click(); await page.waitForTimeout(4000) }

  const dock = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="conversation.composer.dock"]')
    if (!el) return null
    // list direct children shape
    const kids = Array.from(el.children).map((k) => ({ tag: k.tagName, cls: k.className, text: (k.textContent || '').slice(0, 60) }))
    // find any element whose text looks like a stats line (turns / steps / ms)
    const candidates = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const t = (walker.currentNode.textContent || '').trim()
      if (t && t.length < 80 && /轮|\bsteps?\b|步|LLM|工具|\d+(\.\d+)?\s*(轮|步|s|m|ms)/.test(t)) {
        const p = walker.currentNode.parentElement
        if (p && (p.className || p.tagName)) candidates.push({ tag: p.tagName, cls: String(p.className).slice(0, 120), text: t.slice(0, 50) })
        if (candidates.length > 8) break
      }
    }
    return { children: kids, candidates }
  })
  console.log('DOCK:', JSON.stringify(dock, null, 1))
  await browser.close()
})().catch((e) => { console.error('FAIL', e); process.exit(1) })