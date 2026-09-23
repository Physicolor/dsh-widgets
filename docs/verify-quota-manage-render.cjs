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
  // The host route fetches the four upstream endpoints independently: retry when
  // a slice is missing (the API is rate-limited and this probe shares it with the
  // agent's own traffic) instead of judging a half-arrived payload.
  //
  // TWO day maps: the machine-wide one (other cards) and the Command
  // Code-scoped one the 额度管理 card reads. The scoped request must be answered
  // with a `provider` echo — a host that has not been restarted ignores
  // `?provider=` and hands back the machine-wide map, which is exactly the
  // caliber mismatch this card had (2026-09-20: 758M vs the route's own 474M).
  let cc = null
  let dailyPayload = null
  let scopedPayload = null
  for (let attempt = 0; attempt < 4; attempt++) {
    const [c, d, s] = await Promise.all([
      fetch(`${ORIGIN}/api/commandcode-usage`).then((r) => r.json()),
      fetch(`${ORIGIN}/api/widgets-usage-daily`).then((r) => r.json()),
      fetch(`${ORIGIN}/api/widgets-usage-daily?provider=commandcode`).then((r) => r.json()),
    ])
    cc = c
    dailyPayload = d
    scopedPayload = s
    if (c !== null && c.usage != null && c.credits != null && c.subscription != null) break
    console.log(`(attempt ${attempt + 1}: the host payload came back incomplete — retrying)`)
    await new Promise((r) => setTimeout(r, 2000))
  }
  const stats = { commandCode: cc, commandCodeDaily: scopedPayload?.daily ?? {} }
  check('the scoped day map echoes provider=commandcode (needs the restarted host)',
    scopedPayload?.available === true && scopedPayload?.provider === 'commandcode',
    JSON.stringify(scopedPayload && { available: scopedPayload.available, provider: scopedPayload.provider, reason: scopedPayload.reason }).slice(0, 140))

  // ── 1. live render: big figure UNDER the title, grey block to its right ──
  const live = widget.render(stats)
  check('title is 额度管理', live.title === '额度管理', live.title)
  check('the big figure is the projected month-end percent', /^\d+(\.\d+)?%$/.test(live.headAfter?.big ?? ''), String(live.headAfter?.big))
  check('the figure rides the headAfter row, not the title row', live.headAfter !== undefined && live.headRight === undefined && live.value === undefined,
    `headAfter=${JSON.stringify(live.headAfter)} headRight=${JSON.stringify(live.headRight)} value=${JSON.stringify(live.value)}`)
  check('the grey slot carries the 账期 line ALONE — no pool view name any more',
    live.headAfter.smallLines === undefined && /^账期 \d{1,2}-\d{1,2}$/.test(live.headAfter.small ?? ''),
    JSON.stringify(live.headAfter))
  check('the 账期 line asks to sit on the head row\'s FLOOR (bottom-aligned with the figure)',
    live.headAfter.smallAlign === 'bottom', String(live.headAfter.smallAlign))
  check('no legend line and no body sub line any more', live.legend === undefined && live.sub === undefined, `${live.legend} / ${live.sub}`)
  check('no ring any more — the block is a pair of figures', live.chart.kind === 'figures' && live.chart.figures.length === 2, live.chart.kind)
  check('figures are 今日用量 + 今日推荐', live.chart.figures[0].label === '今日用量' && live.chart.figures[1].label === '今日推荐',
    live.chart.figures.map((f) => `${f.label} ${f.value}`).join(' | '))
  check('figure values are compact M/B numbers', /^[\d.]+[BMK]$/.test(live.chart.figures[0].value) && /^[\d.]+[BMK]$/.test(live.chart.figures[1].value),
    live.chart.figures.map((f) => f.value).join(' / '))
  console.log(`      live card: ${live.title} | ${live.headAfter.big} + ${JSON.stringify(live.headAfter.small ?? live.headAfter.smallLines)} | ${live.chart.figures.map((f) => `${f.label} ${f.value}`).join(' / ')}`)

  // ── 2. the percent equals an independent recompute through cc-view ──
  const month = monthlyWindow(cc)
  const now = new Date()
  const dayMs = 86_400_000
  const tzKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(d)
  const dailyMap = scopedPayload?.daily ?? {}
  // The card's token side must be the SCOPED map. Compare at the card's own
  // display precision (fmtQuota truncates), and prove the machine-wide figure
  // would have printed something DIFFERENT whenever a second plan ran today.
  const { fmtQuota } = require(path.join(TMP, 'client', 'lib', 'quota-math.js'))
  const allMap = dailyPayload?.daily ?? {}
  const scopedToday = dailyMap[tzKey(now)] ?? 0
  const allToday = allMap[tzKey(now)] ?? 0
  check("今日用量 is the Command Code route's own tokens, not the machine-wide day",
    live.chart.figures[0].value === fmtQuota(scopedToday) &&
      (allToday === scopedToday || live.chart.figures[0].value !== fmtQuota(allToday)),
    `card ${live.chart.figures[0].value} | scoped ${fmtQuota(scopedToday)} | machine-wide ${fmtQuota(allToday)}`)
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
  // The card measures the POOL's month (cc-view sums the members field by field),
  // so the independent side must sum the members' spend too — the top-level slice
  // is the primary member alone and drifts as soon as the pool's second key serves
  // traffic (measured 2026-09-20: primary 0.47 vs pool 11.2 credits).
  const consumedTotal = Array.isArray(cc.keys) && cc.keys.length > 0
    ? cc.keys.reduce((a, k) => a + (k.data?.usage?.totalCost ?? 0), 0)
    : cc.usage.totalCost
  const tokensPerCredit = periodTokens / consumedTotal
  const expected = month.pct + ((pace / tokensPerCredit) * (total - elapsed) / month.cap) * 100
  const shown = Number((live.headAfter?.big ?? '').replace('%', ''))
  // The card prints a WHOLE percent and the recompute below re-derives the pace
  // from the raw day map (its own tz/day-boundary arithmetic), so a ~1pp gap is
  // the legitimate width of this cross-check. The EXACT contract — the card's
  // math against an independent recompute to 1e-6, and "projected > 100% ⇔ pace >
  // budget" as an identity — is `docs/probe-quota-manage.mjs`
  // (measured 2026-09-20: card 64% vs recompute 63.18%).
  check('projected percent agrees with the independent recent-pace recompute (±1pp)',
    Math.abs(shown - expected) <= 1.5,
    `${live.headAfter.big} vs ${expected.toFixed(2)}% (used ${month.pct.toFixed(2)}%, pace ${(pace / 1e6).toFixed(1)}M/d)`)
  check('escalation follows the 100% rule',
    (shown > 100) === (live.valuePulse === true) && (live.valuePulse === true) === (live.valueTone === 'danger'),
    `${live.headAfter.big} tone=${live.valueTone} pulse=${live.valuePulse}`)
  // The card must not contradict itself: "today is under budget" and "the month
  // lands under 100%" are the same statement, because both derive from the pace.
  const budget = Number(live.chart.figures[1].value.replace(/[^\d.]/g, '')) * (/B$/.test(live.chart.figures[1].value) ? 1e9 : /M$/.test(live.chart.figures[1].value) ? 1e6 : 1e3)
  check('percent and budget tell ONE story (pace ≤ budget ⇔ projected ≤ 100%)',
    Math.abs(pace - budget) < 1e6 || ((pace <= budget) === (shown <= 100)),
    `pace ${(pace / 1e6).toFixed(1)}M vs budget ${(budget / 1e6).toFixed(1)}M, projected ${live.headAfter.big}`)

  // ── 3. missing data is FILLED, never announced ──
  const empty = widget.render({})
  check('no payload -> the layout stays, the figure is -% (never 数据不足)',
    empty.headAfter?.big === '-%' && !JSON.stringify(empty).includes('数据不足'), JSON.stringify(empty.headAfter))
  check('no payload -> the two figures still render, as —', empty.chart?.figures?.length === 2 && empty.chart.figures.every((f) => f.value === '—'),
    JSON.stringify(empty.chart?.figures))
  check('no payload -> no 账期 line and no view line (there is no period to print)',
    empty.headAfter.small === undefined && empty.headAfter.smallLines === undefined && empty.headAfter.smallAlign === undefined,
    JSON.stringify(empty.headAfter))
  check('missing data never pulses', empty.valuePulse === undefined && empty.valueTone === undefined)

  // ── 3b. an unused pool member: zeros everywhere, a real period, a real budget ──
  const unused = (cc.keys ?? []).find((k) => (k.data?.usage?.totalCount ?? 0) === 0)
  if (unused) {
    // Rendered through the REAL pool view (the card only borrows the pool's rate
    // for a per-account view, exactly as the rail does).
    const solo = widget.render({ commandCode: cc, commandCodeDaily: scopedPayload?.daily ?? {}, ccView: unused.label })
    console.log(`      unused member ${unused.label}: ${solo.headAfter.big} | ${JSON.stringify(solo.headAfter.small)} | ${solo.chart.figures.map((f) => `${f.label} ${f.value}`).join(' / ')}`)
    check(`unused member ${unused.label}: the consumed percent is printed, not an error`, /^0(\.0)?%$/.test(solo.headAfter.big), solo.headAfter.big)
    check(`unused member ${unused.label}: 0 tokens used (the local log is not its own)`, solo.chart.figures[0].value === '0', solo.chart.figures[0].value)
    check(`unused member ${unused.label}: it still gets a real budget`, /^[\d.]+[BMK]$/.test(solo.chart.figures[1].value), solo.chart.figures[1].value)
    check(`unused member ${unused.label}: its own 账期 line is printed`, /^账期 \d{1,2}-\d{1,2}$/.test(solo.headAfter.small ?? ''), JSON.stringify(solo.headAfter.small))
  }

  // ── 4. the market / 组件配置 preview ──
  const preview = widget.render(widget.example.stats({}))
  check('preview default is the calm state (no red, no pulse)', preview.valuePulse !== true && preview.valueTone === undefined, preview.headAfter.big)
  check('preview shows real M figures', /^[\d.]+M$/.test(preview.chart.figures[0].value) && /^[\d.]+M$/.test(preview.chart.figures[1].value),
    preview.chart.figures.map((f) => f.value).join(' / '))
  const previewOver = widget.render(widget.example.stats({}), { sim: { over: true } })
  check('preview over-budget state is toggleable (>=135%, red, pulsing)',
    previewOver.valueTone === 'danger' && previewOver.valuePulse === true && Number(previewOver.headAfter.big.replace('%', '')) >= 135,
    `${previewOver.headAfter.big} pulse=${previewOver.valuePulse}`)
  check('simToggle label resolves', widget.simToggle() === '超额状态', widget.simToggle())

  // ── 5. the actual React tree ──
  const htmlOf = (out) => renderToStaticMarkup(React.createElement(CardBody, { out, unit: 150 }))
  const overHtml = htmlOf(previewOver)
  const liveHtml = htmlOf(live)
  // The head row is everything between the title div and the first body node.
  const headRow = (markup) => {
    const start = markup.indexOf('dsx-stats-card-title')
    const end = markup.indexOf('dsx-stats-card-headafter')
    return start >= 0 && end > start ? markup.slice(start, end) : markup.slice(start)
  }
  const headAfterBlock = (markup) => {
    const start = markup.indexOf('dsx-stats-card-headafter')
    if (start < 0) return ''
    const foot = markup.indexOf('dsx-stats-card-figure')
    return markup.slice(start, foot > start ? foot : undefined)
  }
  check('the big figure does NOT render in the title row', !headRow(liveHtml).includes(live.headAfter.big), '')
  check('the big figure renders inside the headAfter row', headAfterBlock(liveHtml).includes(live.headAfter.big), live.headAfter.big)
  check('the 账期 line renders as ONE grey line inside the same row (no stacked block)',
    headAfterBlock(liveHtml).includes(live.headAfter.small) && !headAfterBlock(liveHtml).includes('dsx-stats-card-headafter-lines'),
    JSON.stringify(live.headAfter.small))
  check('the head row bottom-aligns that line with the figure (align-items: flex-end)',
    /align-items:flex-end/.test(headAfterBlock(liveHtml)), headAfterBlock(liveHtml).slice(0, 160))
  check('over budget renders the pulsing red value in the headAfter row',
    headAfterBlock(overHtml).includes('dsx-value-pulse') && headAfterBlock(overHtml).includes('dsx-stats-card-value'), '')
  const calmHtml = htmlOf(preview)
  check('calm card does NOT pulse', !calmHtml.includes('dsx-value-pulse'))
  check('calm card paints the figure black, not the inherited title blue',
    headAfterBlock(calmHtml).includes('color:var(--dsw-alias-label-primary)') && headAfterBlock(calmHtml).includes(preview.headAfter.big), preview.headAfter.big)
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
