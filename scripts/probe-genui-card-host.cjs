/**
 * Host-drift guard: does the SERVED genui bundle still take over a ```dsh-ui
 * fence on the host's CURRENT code surface?
 *
 * Why this exists (2026-10-11): DSH moved assistant code fences onto the
 * card surface (`CodeToolbar`), which renders
 * `supportsHighlighting(lang) ? lang : labels.codeLabel`. `dsh-ui` has no
 * grammar, so the header shows the LOCALIZED generic title (「代码块」) and
 * the info string stops existing in the DOM entirely. genui's DOM channel
 * identified fences by that label, so every fence mounted while streaming
 * and was reverted to a code block at settle (and a reloaded session never
 * mounted at all). Nothing in the repo could see it: jsdom fixtures were
 * hand-written to the OLD banner shape.
 *
 * This probe drives the RUNNING host with the surface shape the host really
 * ships (card header + `data-code-wrap` + localized label) and pins:
 *   1. a card-surface dsh-ui fence IS taken over and renders,
 *   2. a `json`-labelled card fence is NOT taken over (negative control),
 *   3. a real multi-tab fence body renders (the regression body).
 *
 * Run: node scripts/probe-genui-card-host.cjs [--authority host:port]
 * Needs nothing but the live GUI (mints its own auth cookie).
 */
const { browser, close, liveAvailable, report } = require('./lib/probe-harness.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const argv = process.argv.slice(2)
const AUTHORITY = (() => {
  const i = argv.indexOf('--authority')
  return i >= 0 ? argv[i + 1] : (process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:19387')
})()

/** The body that regressed: 5 tabs, table/chart/plot/callout leaves. */
const REAL_SPEC = JSON.stringify({
  title: '五种图型实测对比（真实数据）',
  gap: 14,
  items: [{
    type: 'tabs',
    tabs: [
      { label: '① 热力矩阵+RAG', items: [
        { type: 'callout', tone: 'info', title: '主推', content: '绿=正增益、红=负增益。' },
        { type: 'table', columns: ['链路', 'DIOR (3341图)', 'UCAS (8337图)'], rows: [['不做适应（基线）', '48.33 基准', '77.74 基准'], ['投票流水线', '68.51 +20.18', '— 未做']] },
      ] },
      { label: '② 分组条形图', items: [
        { type: 'chart', kind: 'bars', title: 'VEDAI 上五条链路的增益', data: [{ label: 'R3 亮度对齐', value: 0.69 }, { label: '零样本基线', value: 0 }] },
      ] },
      { label: '③ 散点+拟合', items: [
        { type: 'plot', title: '域差距 vs 实测增益', xMin: 1.3, xMax: 1.9, yMin: -25, yMax: 25, points: [{ x: 1.575, y: 20.18, label: 'DIOR' }, { x: 1.47, y: -0.75, label: 'VEDAI/R3' }] },
      ] },
      { label: '④ 域画像', items: [
        { type: 'table', columns: ['特征', 'DOTA(源)', 'VEDAI'], rows: [['亮度均值', '96.2', '135.2']] },
      ] },
      { label: '⑤ 干预边界曲线', items: [
        { type: 'chart', kind: 'line', title: '亮度干预：ΔL 越大增益越差', data: [{ label: 'ΔL=0', value: 20.18 }, { label: 'ΔL=58', value: -1.91 }] },
        { type: 'callout', tone: 'warning', title: '边界怎么定才合法', content: '固定域、只改一个条件时穿过 0 的点才算边界。' },
      ] },
    ],
  }],
})

const SIMPLE_SPEC = '{"title":"卡片","items":[{"type":"text","content":"探针端到端"}]}'

/** The host's card surface as it really renders: `data-code-wrap` (set only
 * when the host supplies toolbar labels) + a localized generic language
 * label + `<pre><code>`. */
const INJECT = ({ simple, real }) => {
  function cardBlock(raw, label) {
    const block = document.createElement('div')
    block.className = 'md-code-block'
    block.setAttribute('data-code-wrap', '')
    const banner = document.createElement('div')
    const heading = document.createElement('div')
    const language = document.createElement('span')
    language.textContent = label
    heading.appendChild(language)
    banner.appendChild(heading)
    const actions = document.createElement('div')
    const copy = document.createElement('button')
    copy.innerHTML = '<svg></svg>'
    actions.appendChild(copy)
    banner.appendChild(actions)
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    code.textContent = raw
    pre.appendChild(code)
    block.appendChild(banner)
    block.appendChild(pre)
    return block
  }
  const row = document.createElement('div')
  row.setAttribute('data-chat-anchor-key', 'genui-card-probe')
  row.setAttribute('data-chat-flow-kind', 'assistant-step')
  row.appendChild(cardBlock(simple, '代码块'))
  row.appendChild(cardBlock(simple, 'json'))
  row.appendChild(cardBlock(real, '代码块'))
  document.body.appendChild(row)
  window.__genuiProbeRow = row
  return true
}

;(async () => {
  const r = report('genui card-host fence takeover (live)')
  if (!(await liveAvailable(AUTHORITY))) {
    r.check(false, `live GUI reachable at ${AUTHORITY}`, 'start the GUI or pass --authority host:port')
    process.exit(r.exitCode())
  }
  const b = await browser()
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`))
  try {
    await page.goto(`http://${AUTHORITY}/`, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(7000)
    r.check(logs.some((l) => l.includes('[genui]')), 'genui client bundle loaded')
    await page.evaluate(INJECT, { simple: SIMPLE_SPEC, real: REAL_SPEC })
    await page.waitForTimeout(2500)
    const v = await page.evaluate(() => {
      const row = window.__genuiProbeRow
      const blocks = [...row.querySelectorAll('.md-code-block')]
      return {
        processed: blocks.map((x) => x.hasAttribute('data-genui-rendered')),
        containers: row.querySelectorAll('.genui-dom-fence').length,
        texts: [...row.querySelectorAll('.genui-dom-fence')].map((c) => c.textContent),
      }
    })
    r.check(v.processed[0] === true, 'card-surface dsh-ui fence (localized label) taken over')
    r.check(v.processed[1] === false, 'json-labelled card fence left alone (negative control)')
    r.check(v.processed[2] === true, 'real 5-tab fence body taken over')
    r.check(v.texts.some((t) => t.includes('探针端到端')), 'simple spec rendered')
    r.check(v.texts.some((t) => t.includes('热力矩阵') && t.includes('干预边界曲线')), 'all five tabs rendered')
  } catch (error) {
    r.check(false, 'probe threw', error.message)
  } finally {
    await page.close()
    await ctx.close()
    await close()
  }
  process.exit(r.exitCode())
})()
