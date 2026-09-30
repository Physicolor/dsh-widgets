/**
 * dsh-widgets — render the plugin-list icon next to the official ones.
 *
 * The Settings → plugin list draws a 36x36 svg inside a rounded tile, and the
 * four official experimental bundles ship `icon.svg` with a blue→indigo linear
 * gradient and flat filled geometry. This renders our candidate beside those
 * originals, on the product's light and dark surfaces, so the icon can be judged
 * in the same visual language instead of in isolation.
 *
 *   node scripts/icon-preview.mjs [--out docs/icon/preview-plugin-list.png]
 */
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(HERE, 'noop.js'))
const { chromium } = require(join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { chromePath } = require(join(HERE, 'lib/chrome.cjs'))

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i === -1 ? dflt : process.argv[i + 1] }
const OUT = arg('--out', 'docs/icon/preview-plugin-list.png')

const ours = readFileSync(join(HERE, '..', 'icon.svg'), 'utf8')
const appLight = readFileSync(join(HERE, '..', 'docs', 'icon', 'app-icon-light.svg'), 'utf8')
const appDark = readFileSync(join(HERE, '..', 'docs', 'icon', 'app-icon-dark.svg'), 'utf8')
/** The official originals, extracted from app.asar (see harmonizer probes). */
const official = {
  '智能体团队': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.3027 17.1077H9.03125V12.8372H13.3027V17.1077ZM17.5742 12.8372C17.574 15.1958 15.6623 17.1075 13.3037 17.1077V8.56567H17.5742V12.8372Z" fill="url(#a)"/><path d="M18.5229 12.8372V8.56567H22.7944V12.8372H27.0659V17.1077H22.7944C20.4357 17.1077 18.5232 15.1959 18.5229 12.8372Z" fill="#F2AF63"/><path d="M17.5742 26.6072H13.3037V18.0642C15.6625 18.0644 17.5742 19.9769 17.5742 22.3357V26.6072ZM13.3027 22.3357H9.03125V18.0642H13.3027V22.3357Z" fill="#7CB7FF"/><path d="M22.7944 26.6072H18.5229V22.3357C18.5229 19.9768 20.4355 18.0642 22.7944 18.0642H27.0659V22.3357H22.7944V26.6072Z" fill="#45D9E7"/><defs><linearGradient id="a" x1="16.1247" y1="6.6613" x2="9.03125" y2="19.2206" gradientUnits="userSpaceOnUse"><stop stop-color="#7CB7FF"/><stop offset="1" stop-color="#145AF3"/></linearGradient></defs></svg>',
  '自动授权审查': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(1.5 1.5) scale(0.9166666667)"><path d="M18 6L28.5 9.5V17.2C28.5 23.1 24.08 28.4 18 30C11.92 28.4 7.5 23.1 7.5 17.2V9.5L18 6Z" fill="url(#b)" fill-opacity="0.8"/><path d="M14.2 18L16.84 20.63L22.2 15.27" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g><defs><linearGradient id="b" x1="18" y1="6" x2="18" y2="30" gradientUnits="userSpaceOnUse"><stop stop-color="#7AC2FF"/><stop offset="1" stop-color="#4A65E8"/></linearGradient></defs></svg>',
  '语音输入': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.7324 8.77148V27.2295L21.2324 27.2285V8.77051L23.7324 8.77148ZM14.6797 10.7715L14.6787 25.2295L12.1787 25.2285L12.1797 10.7705L14.6797 10.7715ZM19.3926 22.4131H16.8926V13.5859H19.3926V22.4131ZM10.0625 20.708H7.5625V15.291H10.0625V20.708ZM28.4375 20.708H25.9375V15.291H28.4375V20.708Z" fill="url(#c)"/><defs><linearGradient id="c" x1="8.24602" y1="16.4083" x2="32.5611" y2="22.9699" gradientUnits="userSpaceOnUse"><stop stop-color="#67C7FE"/><stop offset="1" stop-color="#3F77D8"/></linearGradient></defs></svg>',
}

const tile = (svg, label, bg, fg) => `
  <div class="cell">
    <div class="tile" style="background:${bg}">${svg}</div>
    <div class="label" style="color:${fg}">${label}</div>
  </div>`

const lightTile = '#ffffff', lightText = '#1f2329', darkTile = '#2a2d33', darkText = '#e8eaed'
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; font:13px/1.4 "Segoe UI", system-ui, sans-serif; }
  .row { display:flex; gap:26px; padding:22px 26px; align-items:flex-start; }
  .light { background:#f5f6f8; } .dark { background:#1b1d21; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:8px; }
  .tile { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(16,24,40,.06); }
  .tile svg { width:26px; height:26px; }
  .app { width:120px; height:120px; } .app svg { width:100%; height:100%; }
  .app.small { width:64px; height:64px; }
  .label { font-size:12px; }
  .h { font-weight:600; padding:14px 26px 0; }
</style></head><body>
  <div class="h" style="color:${lightText};background:#f5f6f8">官方（左三） vs 我们（右一）— 浅色</div>
  <div class="row light">
    ${Object.entries(official).map(([k, v]) => tile(v, k, lightTile, lightText)).join('')}
    ${tile(ours, 'dsh-widgets（候选）', lightTile, lightText)}
  </div>
  <div class="h" style="color:${darkText};background:#1b1d21">同上 — 深色</div>
  <div class="row dark">
    ${Object.entries(official).map(([k, v]) => tile(v, k, darkTile, darkText)).join('')}
    ${tile(ours, 'dsh-widgets（候选）', darkTile, darkText)}
  </div>
  <div class="h" style="color:${lightText};background:#f5f6f8">放大 2×（看几何）</div>
  <div class="row light">
    ${tile(ours.replace('width="36" height="36"', 'width="72" height="72"'), '候选 @2x', lightTile, lightText)}
  </div>
  <div class="h" style="color:${lightText};background:#f5f6f8">App Icon — 浅色版 / 深色版</div>
  <div class="row light">
    <div class="cell"><div class="app">${appLight}</div><div class="label" style="color:${lightText}">app-icon-light</div></div>
    <div class="cell"><div class="app">${appDark}</div><div class="label" style="color:${lightText}">app-icon-dark</div></div>
    <div class="cell"><div class="app small">${appLight}</div><div class="label" style="color:${lightText}">浅 @64</div></div>
    <div class="cell"><div class="app small">${appDark}</div><div class="label" style="color:${lightText}">深 @64</div></div>
  </div>
</body></html>`

const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
const page = await browser.newPage({ viewport: { width: 760, height: 420 }, deviceScaleFactor: 2 })
await page.setContent(html)
await page.waitForTimeout(300)
mkdirSync(dirname(OUT), { recursive: true })
await page.screenshot({ path: OUT, fullPage: true })
console.log('wrote', OUT)
await browser.close()
