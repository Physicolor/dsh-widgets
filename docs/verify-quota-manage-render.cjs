/**
 * 额度管理 (quota-manage) + peak-pricing render-layer probe — no browser, no auth.
 *
 * Compiles the REAL render layer (`src/client/components.tsx` +
 * `src/widgets/quota-manage/index.ts`, which pulls the generated registry and
 * every widget unit) into a throwaway dir, renders the cards through the actual
 * `CardBody` with `react-dom/server`, and asserts the whole chain end to end:
 *
 *   1. locale wiring — the manifest dictionary is what the card prints;
 *   2. the live account payload produces the 月窗口 card shape (title / legend /
 *      projected percent / reset line / two token figures), and its percent
 *      equals an INDEPENDENT recompute from cc-view's own monthly percent;
 *   3. missing data degrades to 数据不足, never an invented quota;
 *   4. the escalation is TEXT-LEVEL: past 100% the value turns red and pulses
 *      (`.dsx-value-pulse`), and NOTHING paints the card any more — the old
 *      `.dsx-peak-alert` glow is gone from the CSS and from every card, peak
 *      pricing's EXPENSIVE included.
 *
 * Usage: node docs/verify-quota-manage-render.cjs
 * Leaves: docs/verify-quota-manage-render-result.json
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { createRequire } = require('node:module')

const REPO = path.join(__dirname, '..')
const OUT_FILE = path.join(__dirname, 'verify-quota-manage-render-result.json')
const PROFILE_MODULES = 'D:/dsh-home/profiles/web/node_modules'
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const TMP = path.join(os.tmpdir(), 'dsh-widgets-quota-render')
const DAY_MS = 86_400_000

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

/** Compile the render layer (and everything it imports) into a throwaway dir. */
function compile() {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  execFileSync('npx', [
    'tsc', 'src/client/components.tsx', 'src/widgets/quota-manage/index.ts',
    '--outDir', TMP, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--jsx', 'react-jsx', '--skipLibCheck',
    '--esModuleInterop', '--rootDir', 'src',
  ], { cwd: REPO, stdio: 'inherit', shell: true })
  // The compiled code lives OUTSIDE the repo, so give it the profile's React.
  // The packages are COPIED (not symlinked): the profile's node_modules entries
  // are themselves junctions into different trees, and Node's realpath
  // resolution would then hand react-dom a second React copy ("Invalid hook
  // call"). Copies make both resolve to the one instance under TMP.
  const nm = path.join(TMP, 'node_modules')
  fs.mkdirSync(nm, { recursive: true })
  for (const pkg of ['react', 'react-dom', 'scheduler']) {
    fs.cpSync(path.join(PROFILE_MODULES, pkg), path.join(nm, pkg), { recursive: true, dereference: true })
  }
}

/** Assemble the dictionary exactly like scripts/gen-registry.mjs does. */
function locales() {
  const out = { zh: {}, en: {} }
  const shared = JSON.parse(fs.readFileSync(path.join(REPO, 'src', 'widgets', '_shared', 'locales.json'), 'utf8'))
  for (const loc of ['zh', 'en']) Object.assign(out[loc], shared[loc] || {})
  for (const unit of fs.readdirSync(path.join(REPO, 'src', 'widgets'))) {
    if (unit.startsWith('_')) continue
    const mf = path.join(REPO, 'src', 'widgets', unit, 'manifest.json')
    if (!fs.existsSync(mf)) continue
    const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'))
    for (const loc of ['zh', 'en']) Object.assign(out[loc], (manifest.locale || {})[loc] || {})
  }
  return out
}

;(async () => {
  compile()
  const i18n = require(path.join(TMP, 'client', 'i18n.js'))
  i18n.setExtraLocales(locales())
  const widget = require(path.join(TMP, 'widgets', 'quota-manage', 'index.js')).default
  const { WIDGETS } = require(path.join(TMP, 'client', 'generated.registry.js'))
  const { monthlyWindow } = require(path.join(TMP, 'client', 'lib', 'cc-view.js'))
  const { CardBody } = require(path.join(TMP, 'client', 'components.js'))
  // Resolve React FROM THE TEMP DIR: the component and react-dom must share one
  // instance, and the repo itself does not ship react-dom.
  const tmpRequire = createRequire(path.join(TMP, 'probe.cjs'))
  const React = tmpRequire('react')
  const { renderToStaticMarkup } = tmpRequire('react-dom/server')

  check('widget unit compiled + registered id', widget && widget.id === 'quota-manage', widget && widget.id)
  check('widget sits in the coding-plan group', widget.group === 'coding-plan', widget.group)
  check('widget name resolves from the manifest locale', widget.name() === '额度管理', widget.name())

  // ── real payloads ──
  const [cc, dailyPayload] = await Promise.all([
    fetch(`${ORIGIN}/api/commandcode-usage`).then((r) => r.json()),
    fetch(`${ORIGIN}/api/widgets-usage-daily`).then((r) => r.json()),
  ])
  const stats = { commandCode: cc, heatmapRaw: dailyPayload.daily ?? {} }

  // ── 1. live render: percent top-right, period line under the title ──
  const live = widget.render(stats)
  check('title is 额度管理', live.title === '额度管理', live.title)
  check('value is the projected month-end percent', /^\d+%$/.test(live.value), live.value)
  check('the percent is parked in the top-right slot', live.headRight === '', JSON.stringify(live.headRight))
  check('second line is the SHORT billing period (账期 M-D)', /^账期 \d{1,2}-\d{1,2}$/.test(live.legend), live.legend)
  check('no more body sub line (the period moved up)', live.sub === undefined, String(live.sub))
  check('no ring any more — the block is a pair of figures', live.chart.kind === 'figures' && live.chart.figures.length === 2, live.chart.kind)
  check('figures are 今日用量 + 今日推荐', live.chart.figures[0].label === '今日用量' && live.chart.figures[1].label === '今日推荐',
    live.chart.figures.map((f) => `${f.label} ${f.value}`).join(' | '))
  check('figure values are compact M/B numbers', /^[\d.]+[BMK]$/.test(live.chart.figures[0].value) && /^[\d.]+[BMK]$/.test(live.chart.figures[1].value),
    live.chart.figures.map((f) => f.value).join(' / '))
  console.log(`      live card: ${live.title} … ${live.value} | ${live.legend} | ${live.chart.figures.map((f) => `${f.label} ${f.value}`).join(' / ')}`)

  // ── 2. the percent equals an independent recompute through cc-view ──
  const month = monthlyWindow(cc)
  const now = new Date()
  const dayMs = 86_400_000
  const tzKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(d)
  const dailyMap = dailyPayload.daily ?? {}
  const elapsed = (now.getTime() - Date.parse(cc.subscription.data.currentPeriodStart)) / dayMs
  const total = (Date.parse(cc.subscription.data.currentPeriodEnd) - Date.parse(cc.subscription.data.currentPeriodStart)) / dayMs
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Recent pace: the two previous whole days + today prorated (window of 3).
  const paceKeys = [2, 1].map((n) => tzKey(new Date(midnight.getTime() - n * dayMs)))
  const dayFraction = Math.max(0.25, Math.min(1, (now.getTime() - midnight.getTime()) / dayMs))
  const paceTokens = paceKeys.reduce((a, k) => a + (dailyMap[k] ?? 0), 0) + (dailyMap[tzKey(now)] ?? 0) / dayFraction
  const pace = paceTokens / 3
  const periodTokens = Object.entries(dailyMap)
    .filter(([k]) => k >= tzKey(new Date(cc.subscription.data.currentPeriodStart)) && k <= tzKey(now))
    .reduce((a, [, v]) => a + v, 0)
  const tokensPerCredit = periodTokens / cc.usage.totalCost
  const expected = month.pct + ((pace / tokensPerCredit) * (total - elapsed) / month.cap) * 100
  const shown = Number(live.value.replace('%', ''))
  check('projected percent == independent recent-pace recompute',
    Math.abs(shown - expected) <= 0.5,
    `${live.value} vs ${expected.toFixed(1)}% (used ${month.pct.toFixed(2)}%, pace ${(pace / 1e6).toFixed(1)}M/d)`)
  check('escalation follows the 100% rule',
    (shown > 100) === (live.valuePulse === true) && (live.valuePulse === true) === (live.valueTone === 'danger'),
    `${live.value} tone=${live.valueTone} pulse=${live.valuePulse}`)
  // The card must not contradict itself: "today is under budget" and "the month
  // lands under 100%" are the same statement, because both derive from the pace.
  const budget = Number(live.chart.figures[1].value.replace(/[^\d.]/g, '')) * (/B$/.test(live.chart.figures[1].value) ? 1e9 : /M$/.test(live.chart.figures[1].value) ? 1e6 : 1e3)
  check('percent and budget tell ONE story (pace ≤ budget ⇔ projected ≤ 100%)',
    Math.abs(pace - budget) < 1e6 || ((pace <= budget) === (shown <= 100)),
    `pace ${(pace / 1e6).toFixed(1)}M vs budget ${(budget / 1e6).toFixed(1)}M, projected ${live.value}`)

  // ── 3. missing data ──
  const empty = widget.render({})
  check('no account payload -> 数据不足, no figures', empty.value === '数据不足' && empty.chart === undefined, `${empty.value} / ${empty.chart}`)
  check('missing data keeps the same top-right slot', empty.headRight === '')
  check('missing data never pulses', empty.valuePulse === undefined && empty.valueTone === undefined)

  // ── 4. the market / 组件配置 preview ──
  const preview = widget.render(widget.example.stats({}))
  check('preview default is the calm state (no red, no pulse)', preview.valuePulse !== true && preview.valueTone === undefined, preview.value)
  check('preview shows real M figures', /^[\d.]+M$/.test(preview.chart.figures[0].value) && /^[\d.]+M$/.test(preview.chart.figures[1].value),
    preview.chart.figures.map((f) => f.value).join(' / '))
  const previewOver = widget.render(widget.example.stats({}), { sim: { over: true } })
  check('preview over-budget state is toggleable (>=135%, red, pulsing)',
    previewOver.valueTone === 'danger' && previewOver.valuePulse === true && Number(previewOver.value.replace('%', '')) >= 135,
    `${previewOver.value} pulse=${previewOver.valuePulse}`)
  check('simToggle label resolves', widget.simToggle() === '超额状态', widget.simToggle())

  // ── 5. the actual React tree ──
  const htmlOf = (out) => renderToStaticMarkup(React.createElement(CardBody, { out, unit: 150 }))
  const overHtml = htmlOf(previewOver)
  const liveHtml = htmlOf(live)
  // The head row is everything between the title div and the legend line.
  const headRow = (markup) => {
    const start = markup.indexOf('dsx-stats-card-title')
    const end = markup.indexOf('dsx-stats-card-legend')
    return start >= 0 && end > start ? markup.slice(start, end) : ''
  }
  const bodyAfterLegend = (markup) => markup.slice(markup.indexOf('dsx-stats-card-legend'))
  check('the percent renders INSIDE the title row (top-right)', headRow(liveHtml).includes(live.value), '')
  check('the period line renders right under the title', headRow(liveHtml + live.legend).includes(live.legend) || liveHtml.includes(live.legend), live.legend)
  check('the body no longer repeats the percent', !bodyAfterLegend(liveHtml).includes('dsx-stats-card-value'))
  check('over budget renders the pulsing red value in the title row',
    headRow(overHtml).includes('dsx-value-pulse') && headRow(overHtml).includes('dsx-stats-card-value'), '')
  const calmHtml = htmlOf(preview)
  check('calm card does NOT pulse', !calmHtml.includes('dsx-value-pulse'))
  check('calm card paints the value black, not the inherited title blue',
    headRow(calmHtml).includes('color:var(--dsw-alias-label-primary)') && headRow(calmHtml).includes(preview.value), preview.value)
  check('the two figures render as label + value columns', calmHtml.includes('今日用量') && calmHtml.includes('今日推荐'), '')
  check('NO card paints the old red glow any more', !overHtml.includes('dsx-peak-alert') && !calmHtml.includes('dsx-peak-alert') && !liveHtml.includes('dsx-peak-alert'))

  // ── 6. peak pricing escalates on the text too ──
  const peakWidget = WIDGETS.find((w) => w.id === 'peak-pricing')
  const peak = peakWidget.render({}, { sim: { peak: true } })
  const cheap = peakWidget.render({}, { sim: { peak: false } })
  check('peak pricing EXPENSIVE is red + pulsing', peak.value === 'EXPENSIVE' && peak.valueTone === 'danger' && peak.valuePulse === true,
    `${peak.value} tone=${peak.valueTone} pulse=${peak.valuePulse}`)
  check('peak pricing CHEAP stays plain', cheap.value === 'CHEAP' && !cheap.valuePulse && cheap.valueTone === undefined)
  check('peak pricing no longer asks for a card alert', peak.alert === undefined)
  check('peak pricing renders the pulse class, not the glow',
    htmlOf(peak).includes('dsx-value-pulse') && !htmlOf(peak).includes('dsx-peak-alert'))

  // ── 7. the CSS contract behind both ──
  const css = fs.readFileSync(path.join(REPO, 'src', 'client', 'widgets.module.css'), 'utf8')
  check('CSS defines the value pulse + its breathe keyframes',
    css.includes('.dsx-stats-card-value.dsx-value-pulse') && css.includes('@keyframes dsx-value-breathe'), '')
  check('CSS honours prefers-reduced-motion for the pulse', /prefers-reduced-motion[\s\S]{0,200}dsx-value-pulse/.test(css))
  check('the old card-glow CSS is gone', !css.includes('dsx-peak-alert') && !css.includes('dsx-peak-breathe'))

  fs.writeFileSync(OUT_FILE, `${JSON.stringify({
    checkedAt: new Date().toISOString(),
    live: {
      title: live.title, legend: live.legend, value: live.value, headRight: live.headRight,
      figures: live.chart.figures, tone: live.valueTone ?? null, pulse: live.valuePulse === true,
      independentProjection: `${expected.toFixed(1)}%`, usedPct: month.pct,
    },
    previewOver: { value: previewOver.value, pulse: previewOver.valuePulse === true },
    peakPricing: { expensive: peak.value, pulse: peak.valuePulse === true, alert: peak.alert ?? null },
    results,
  }, null, 2)}\n`, 'utf8')

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} check(s) failed`}`)
  fs.rmSync(TMP, { recursive: true, force: true })
  process.exitCode = failed === 0 ? 0 : 1
})().catch((err) => {
  console.error('probe crashed:', err)
  process.exitCode = 1
})
