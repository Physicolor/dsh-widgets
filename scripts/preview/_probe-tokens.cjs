/** One-off: find which element carries the --dsw-alias-* tokens. */
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { chromePath } = require('../lib/chrome.cjs')
const { mintCookie } = require('../diag-auth-lib.cjs')

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addCookies([mintCookie('127.0.0.1:3080')])
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const info = await page.evaluate(() => {
    const hits = []
    for (const el of document.querySelectorAll('*')) {
      const v = getComputedStyle(el).getPropertyValue('--dsw-alias-bg-base').trim()
      if (v !== '') { hits.push({ tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 80), value: v }); if (hits.length > 6) break }
    }
    const styleTags = []
    for (const el of document.querySelectorAll('style')) {
      const t = el.textContent ?? ''
      if (t.includes('--dsw-alias-bg-base')) styleTags.push({ id: el.id, len: t.length, head: t.slice(0, 160) })
    }
    const inlineOnDoc = document.documentElement.getAttribute('style') ?? ''
    return { hits, styleTags: styleTags.slice(0, 5), styleTagCount: document.querySelectorAll('style').length, inlineOnDoc: inlineOnDoc.slice(0, 300), cssVarRule: [...document.styleSheets].length }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
