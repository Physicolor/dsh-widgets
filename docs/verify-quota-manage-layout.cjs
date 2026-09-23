/**
 * 额度管理 2×2 layout probe — does the redesigned card FIT the 150px square?
 *
 * The render probes assert the card's CONTENT; this one asserts its GEOMETRY.
 * It renders the real card twice (calm + over-budget) into a standalone page
 * that carries the plugin CSS and a light-theme token block (no DSH server, no
 * auth needed), then measures the card boxes in headless Chromium and
 * screenshots them for a human look.
 *
 * Usage: node docs/verify-quota-manage-layout.cjs [outPng]
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { createRequire } = require('node:module')

const REPO = path.join(__dirname, '..')
const PROFILE_MODULES = 'D:/dsh-home/profiles/web/node_modules'
const TMP = path.join(os.tmpdir(), 'dsh-widgets-quota-layout')
const OUT_PNG = process.argv[2] ?? path.join(os.tmpdir(), 'quota-manage-2x2.png')

/** Light-theme token values, lifted from dsh-client-ui-theme (design-platform). */
const TOKENS = `
  --dsw-alias-label-primary: #0f1115;
  --dsw-alias-label-secondary: #61666b;
  --dsw-alias-label-tertiary: #81858c;
  --dsw-alias-label-caption: #adb2b8;
  --dsw-alias-state-business-primary: #4176e6;
  --dsw-alias-state-success-primary: #12a15a;
  --dsw-alias-state-warn-primary: #e08a00;
  --dsw-alias-state-error-primary: #ec1313;
  --dsw-specific-input-major: #ffffff;
  --dsw-alias-interactive-bg-hover: #2631480f;
  --dsw-alias-border-l2-darkmode-thin: #0000001a;
  --dsw-alias-border-l2: #00000014;
  --dsw-shadow-lv2: 0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a;
  --ds-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
`

function compile() {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  execFileSync('npx', [
    'tsc', 'src/client/components.tsx', 'src/widgets/quota-manage/index.ts',
    '--outDir', TMP, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--jsx', 'react-jsx', '--skipLibCheck',
    '--esModuleInterop', '--rootDir', 'src',
  ], { cwd: REPO, stdio: 'inherit', shell: true })
  const nm = path.join(TMP, 'node_modules')
  fs.mkdirSync(nm, { recursive: true })
  for (const pkg of ['react', 'react-dom', 'scheduler']) {
    fs.cpSync(path.join(PROFILE_MODULES, pkg), path.join(nm, pkg), { recursive: true, dereference: true })
  }
}

function locales() {
  const out = { zh: {}, en: {} }
  const shared = JSON.parse(fs.readFileSync(path.join(REPO, 'src', 'widgets', '_shared', 'locales.json'), 'utf8'))
  for (const loc of ['zh', 'en']) Object.assign(out[loc], shared[loc] || {})
  for (const unit of fs.readdirSync(path.join(REPO, 'src', 'widgets'))) {
    if (unit.startsWith('_')) continue
    const mf = path.join(REPO, 'src', 'widgets', unit, 'manifest.json')
    if (!fs.existsSync(mf)) continue
    for (const loc of ['zh', 'en']) Object.assign(out[loc], (JSON.parse(fs.readFileSync(mf, 'utf8')).locale || {})[loc] || {})
  }
  return out
}

;(async () => {
  compile()
  const i18n = require(path.join(TMP, 'client', 'i18n.js'))
  i18n.setExtraLocales(locales())
  const widget = require(path.join(TMP, 'widgets', 'quota-manage', 'index.js')).default
  const { CardBody } = require(path.join(TMP, 'client', 'components.js'))
  const tmpRequire = createRequire(path.join(TMP, 'probe.cjs'))
  const React = tmpRequire('react')
  const { renderToStaticMarkup } = tmpRequire('react-dom/server')

  const [cc, daily, scoped] = await Promise.all([
    fetch('http://127.0.0.1:3080/api/commandcode-usage').then((r) => r.json()),
    fetch('http://127.0.0.1:3080/api/widgets-usage-daily').then((r) => r.json()),
    // The 额度管理 card's own caliber: the log folded to the Command Code route.
    fetch('http://127.0.0.1:3080/api/widgets-usage-daily?provider=commandcode').then((r) => r.json()),
  ])
  const stats = { commandCode: cc, heatmapRaw: daily.daily ?? {}, commandCodeDaily: scoped.daily ?? {} }
  const calm = renderToStaticMarkup(React.createElement(CardBody, { out: widget.render(widget.example.stats({})), unit: 150 }))
  const over = renderToStaticMarkup(React.createElement(CardBody, { out: widget.render(widget.example.stats({}), { sim: { over: true } }), unit: 150 }))
  const live = renderToStaticMarkup(React.createElement(CardBody, { out: widget.render(stats), unit: 150 }))
  // Neighbours that share the head row (value + headRight): they must keep
  // rendering sanely now that the row right-aligns the figures.
  const { WIDGETS } = require(path.join(TMP, 'client', 'generated.registry.js'))
  const water = WIDGETS.find((w) => w.id === 'context-water')
  const heatmap = WIDGETS.find((w) => w.id === 'heatmap')
  // Reference card for the HEAD ROW convention: a plain card WITHOUT a head
  // value, i.e. the layout every other widget already had. The quota card's
  // title must sit at exactly the same distance from the card's top edge.
  const monthly = WIDGETS.find((w) => w.id === 'usage-monthly')
  const usageStats = {
    usageData: {
      usage: {
        rolling: { status: 'ok', percent: 12, resetsAt: '2026-09-14T12:00:00Z' },
        weekly: { status: 'ok', percent: 34, resetsAt: '2026-09-20T00:00:00Z' },
        monthly: { status: 'ok', percent: 79, resetsAt: '2026-10-10T04:42:28.000Z' },
      },
    },
  }
  const monthlyHtml = renderToStaticMarkup(React.createElement(CardBody, { out: monthly.render(usageStats), unit: 150 }))
  const waterHtml = renderToStaticMarkup(React.createElement(CardBody, {
    out: water.render({ contextPercent: 0.42, contextWindow: 1_000_000, contextBreakdown: { systemTokens: 6000, toolsTokens: 11700, messageTokens: 428_300 } }, { size: '2x4' }),
    unit: 150, width: 312,
  }))
  const heatmapHtml = renderToStaticMarkup(React.createElement(CardBody, {
    out: heatmap.render({ heatmapRaw: stats.heatmapRaw }, { size: '2x4' }),
    unit: 150, width: 312,
  }))
  const cssHref = new URL(`file:///${path.join(REPO, 'src', 'client', 'widgets.module.css').replace(/\\/g, '/')}`).href

  const page = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<link rel="stylesheet" href="${cssHref}">
<style>
  body { margin: 0; padding: 20px; background: #eef0f3; font-family: 'HarmonyOS Sans SC','PingFang SC','Microsoft YaHei',sans-serif; ${TOKENS} }
  .row { display: flex; gap: 28px; align-items: flex-start; }
  .row + .row { margin-top: 22px; }
  .box { width: 150px; height: 150px; position: relative; }
  .box.wide { width: 312px; }
  .cap { font-size: 11px; color: #61666b; margin: 4px 0 0; }
</style></head><body>
<div class="row">
  <div><div class="box dsx-stats-card-slot">${calm}</div><p class="cap">预览默认（未超额）</p></div>
  <div><div class="box dsx-stats-card-slot">${live}</div><p class="cap">实盘（当前真实数据）</p></div>
  <div><div class="box dsx-stats-card-slot">${over}</div><p class="cap">预览超额（135%）</p></div>
</div>
<div class="row">
  <div><div class="box wide dsx-stats-card-slot">${waterHtml}</div><p class="cap">回归：上下文水位 2×4（value+headRight）</p></div>
  <div><div class="box wide dsx-stats-card-slot">${heatmapHtml}</div><p class="cap">回归：热度图 2×4（headRight）</p></div>
  <div><div class="box dsx-stats-card-slot">${monthlyHtml}</div><p class="cap">参照：普通卡片（无右上角数字）</p></div>
</div>
</body></html>`

  const htmlPath = path.join(os.tmpdir(), 'quota-manage-layout.html')
  fs.writeFileSync(htmlPath, page, 'utf8')

  const { chromium } = require('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright-core')
  const browser = await chromium.launch({ executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true })
  const pw = await browser.newPage({ viewport: { width: 640, height: 320 }, deviceScaleFactor: 2 })
  await pw.goto(`file:///${htmlPath.replace(/\\/g, '/')}`)
  await pw.waitForTimeout(300)
  const measured = await pw.evaluate(() => {
    /** Ink bounds of one character of an element's text (Range rect). */
    const ink = (el, which) => {
      if (!el) return null
      const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim())
      if (!node) return null
      const t = node.textContent
      const i = which === 'first' ? 0 : t.length - 1
      const r = document.createRange()
      r.setStart(node, i)
      r.setEnd(node, i + 1)
      return r.getBoundingClientRect()
    }
    return [...document.querySelectorAll('.box')].map((box) => {
      const card = box.querySelector('.dsx-stats-card')
      const rows = [...card.children].map((c) => ({ cls: c.className.slice(0, 30), h: Math.round(c.getBoundingClientRect().height) }))
      const r = card.getBoundingClientRect()
      // Head row: title ink left inset vs big-value ink right inset + baseline delta.
      const head = card.querySelector('.dsx-stats-card-title')
      const titleInk = ink(head?.children[0], 'first')
      const valueInk = ink(head?.children[1]?.firstElementChild, 'last')
      // Figures row: first pair's box left inset vs last pair's box right inset.
      const labels = [...card.querySelectorAll('div')].filter((d) => d.textContent === '今日用量' || d.textContent === '今日推荐')
      const figItems = labels.map((l) => l.parentElement)
      return {
        cardW: Math.round(r.width), cardH: Math.round(r.height),
        overflows: card.scrollHeight > card.clientHeight + 1,
        slotOverflow: r.height > 150.5,
        rows,
        pulse: !!card.querySelector('.dsx-value-pulse'),
        figureLabels: labels.map((l) => l.textContent),
        figureValues: [...card.querySelectorAll('div')].map((d) => d.textContent).filter((x) => /^[\d.]+[BMK]$/.test(x)),
        headLeft: titleInk ? +(titleInk.left - r.left).toFixed(1) : null,
        headRight: valueInk ? +(r.right - valueInk.right).toFixed(1) : null,
        titleTop: titleInk ? +(titleInk.top - r.top).toFixed(1) : null,
        valueTop: valueInk ? +(valueInk.top - r.top).toFixed(1) : null,
        // The caption (账期 line) must sit directly under the TITLE, i.e. the
        // head row must be exactly as tall as the title's own line box — the
        // 20px value lives on its own layer and must not add any height.
        legendTop: (() => {
          const lg = card.querySelector('.dsx-stats-card-legend')
          return lg ? +(lg.getBoundingClientRect().top - r.top).toFixed(1) : null
        })(),
        baselineDelta: titleInk && valueInk ? +(valueInk.bottom - titleInk.bottom).toFixed(1) : null,
        figLeft: figItems[0] ? +(figItems[0].getBoundingClientRect().left - r.left).toFixed(1) : null,
        figRight: figItems[1] ? +(r.right - figItems[1].getBoundingClientRect().right).toFixed(1) : null,
      }
    })
  })
  await pw.screenshot({ path: OUT_PNG, fullPage: true })
  await browser.close()
  fs.rmSync(TMP, { recursive: true, force: true })

  let failures = 0
  const check = (label, ok, detail = '') => {
    if (!ok) failures += 1
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === '' ? '' : `  --  ${detail}`}`)
  }
  const NAMES = ['preview-calm', 'live', 'preview-over', 'context-water@2x4', 'heatmap@2x4', 'usage-monthly (reference)']
  const REF = NAMES.length - 1
  const refTitleTop = measured[REF].titleTop
  console.log(`\nreference (plain card, no head value): title top = ${refTitleTop}px`)
  measured.forEach((m, i) => {
    const name = NAMES[i] ?? `box${i}`
    console.log(`\n${name}: ${m.cardW}x${m.cardH}  rows=${m.rows.map((r) => `${r.cls}:${r.h}`).join(' ')}`)
    check(`${name}: card stays inside the square`, !m.slotOverflow && m.cardH <= 150, `${m.cardH}px`)
    check(`${name}: nothing clipped inside the card`, !m.overflows)
    // Only the quota card carries the two M figures; the 2×4 neighbours are
    // rendered here purely as head-row regression subjects.
    if (i < 3) {
      check(`${name}: both labelled figures render with a compact value`,
        m.figureLabels.length === 2 && m.figureValues.length === 2,
        `${m.figureLabels.join('+')} = ${m.figureValues.join(' / ')}`)
      // "元素摆放位置和其他组件一致": the card's two rows must share ONE gutter —
      // the padding — so the head and the figures read as one grid, not two
      // unrelated insets (the bug the owner reported).
      check(`${name}: head row insets are symmetric`,
        Math.abs(m.headLeft - m.headRight) <= 1, `${m.headLeft} / ${m.headRight}`)
      check(`${name}: figures row insets match the head row`,
        Math.abs(m.figLeft - m.headLeft) <= 1 && Math.abs(m.figRight - m.headRight) <= 1,
        `head ${m.headLeft}/${m.headRight} vs figures ${m.figLeft}/${m.figRight}`)
      // Top-aligned by design (a shared baseline is exactly what pushed the
      // title down): the two slots must START on the same line, so their ink tops
      // agree. The ink BOTTOMS differ with the font size — that is not an offset.
      check(`${name}: title and percent start on the same line`,
        m.valueTop !== null && Math.abs(m.titleTop - m.valueTop) <= 2,
        `title ${m.titleTop}px vs percent ${m.valueTop}px`)
      // The owner's report: the title must sit exactly as high as on a card with
      // NO head value — a 20px value must never push the 13px title down.
      check(`${name}: title top matches a plain card`,
        Math.abs(m.titleTop - refTitleTop) <= 1,
        `${m.titleTop}px vs reference ${refTitleTop}px`)
      // The owner's report: the billing line must hug the title, not float below
      // a row that the 20px value stretched.
      check(`${name}: the period line hugs the title`,
        m.legendTop !== null && m.legendTop - m.titleTop <= 22,
        `legend ${m.legendTop}px vs title ${m.titleTop}px (gap ${(m.legendTop - m.titleTop).toFixed(1)}px)`)
    }
  })
  // The simulated over-budget card must pulse; the calm preview must not. The
  // LIVE card's state is data-driven (it pulses only while the projection is
  // past 100%), so it is reported rather than asserted.
  check('over-budget card carries the pulsing value', measured[2].pulse === true, JSON.stringify(measured.map((m) => m.pulse)))
  check('calm card does not pulse', measured[0].pulse === false)
  console.log(`  (live card pulses: ${measured[1].pulse} — follows today's projection)`)
  check('the 2×4 neighbours keep their head row (no regression)',
    measured[3].rows[0].h <= 26 && measured[4].rows[0].h <= 17,
    `water title row ${measured[3].rows[0].h}px / heatmap title row ${measured[4].rows[0].h}px`)

  console.log(`\nscreenshot: ${OUT_PNG}`)
  console.log(`${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`)
  process.exitCode = failures === 0 ? 0 : 1
})().catch((err) => {
  console.error('probe crashed:', err)
  process.exitCode = 1
})
