/**
 * Command Code render-layer probe (docs/probe-cc-render.cjs)
 *
 * Runs the REAL render factories (compiled on the fly from
 * `src/client/lib/cc-view.ts`) over the REAL account payload fetched from the
 * four official Command Code endpoints, and asserts the card contract:
 *
 *   - every card title is exactly "Command Code" (the long product name is the
 *     title; the role word rides the grey legend line under it)
 *   - cc-windows renders THREE rings (5h / weekly / monthly)
 *   - the three single-window cards each report a percent + a reset line
 *   - the monthly window derives used / (used + remaining) by conservation,
 *     because `billing/credits` serves no monthly window object
 *
 * The API key is resolved exactly like the host route does (env ->
 * $DSH_HOME/.credentials.yaml -> $DSH_HOME/.env); it is never printed.
 *
 * Usage:  node docs/probe-cc-render.cjs
 * Leaves: docs/probe-cc-render-result.json (runtime receipt, gitignored)
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const REPO = path.join(__dirname, '..')
const OUT_FILE = path.join(__dirname, 'probe-cc-render-result.json')
const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

const results = []
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  --  ' + detail : ''}`)
}

/** Resolve COMMANDCODE_API_KEY the same way the credentials provider layers it. */
function resolveKey() {
  const env = process.env.COMMANDCODE_API_KEY
  if (env) return { value: env, source: 'env' }
  try {
    const text = fs.readFileSync(path.join(HOME, '.credentials.yaml'), 'utf8')
    const m = /^\s*COMMANDCODE_API_KEY:\s*(.+?)\s*$/m.exec(text)
    if (m && m[1]) return { value: m[1], source: 'credentials.yaml' }
  } catch { /* absent */ }
  try {
    const text = fs.readFileSync(path.join(HOME, '.env'), 'utf8')
    const m = /^\s*(?:export\s+)?COMMANDCODE_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/m.exec(text)
    if (m && m[1]) return { value: m[1], source: '.env' }
  } catch { /* absent */ }
  return null
}

/** Compile just the render layer (+ its two pure deps) into a throwaway dir. */
function compileRenderLayer(tmp) {
  execFileSync('npx', ['tsc', 'src/client/lib/cc-view.ts', '--outDir', tmp, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', 'src'], { cwd: REPO, stdio: 'inherit', shell: true })
  return path.join(tmp, 'client', 'lib', 'cc-view.js')
}

/** Assemble the dictionary exactly like scripts/gen-registry.mjs does. */
function installLocales(i18n) {
  const locales = { zh: {}, en: {} }
  const sharedFile = path.join(REPO, 'src', 'widgets', '_shared', 'locales.json')
  const shared = JSON.parse(fs.readFileSync(sharedFile, 'utf8'))
  for (const loc of ['zh', 'en']) Object.assign(locales[loc], shared[loc] || {})
  const units = fs.readdirSync(path.join(REPO, 'src', 'widgets'))
  for (const unit of units) {
    if (unit.startsWith('_')) continue
    const mf = path.join(REPO, 'src', 'widgets', unit, 'manifest.json')
    if (!fs.existsSync(mf)) continue
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'))
    for (const loc of ['zh', 'en']) if (m.locale?.[loc]) Object.assign(locales[loc], m.locale[loc])
  }
  i18n.installLocale(undefined, locales)
}

async function loadReal(key) {
  const base = 'https://api.commandcode.ai/alpha'
  const get = async (p) => {
    const r = await fetch(`${base}/${p}`, { headers: { Authorization: `Bearer ${key}` } })
    return r.ok ? r.json() : null
  }
  const [whoami, usage, credits, subscription] = await Promise.all([
    get('whoami'), get('usage/summary'), get('billing/credits'), get('billing/subscriptions'),
  ])
  return { whoami, usage, credits, subscription }
}

;(async () => {
  const resolved = resolveKey()
  if (!resolved) {
    console.error('COMMANDCODE_API_KEY not found in env / .credentials.yaml / .env')
    process.exit(2)
  }
  console.log(`key source: ${resolved.source} (tail ${resolved.value.slice(-4)})\n`)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-probe-'))
  let view
  let i18n
  try {
    const entry = compileRenderLayer(tmp)
    globalThis.localStorage = { getItem: () => null }
    globalThis.navigator = { language: 'zh-CN' }
    view = require(entry)
    i18n = require(path.join(tmp, 'client', 'i18n.js'))
  } finally {
    // the compiled tree stays until the process ends; remove it now that the
    // modules are loaded (require caches them in memory).
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { /* best effort */ }
  }
  installLocales(i18n)

  const data = await loadReal(resolved.value)
  const stats = { commandCode: data, commandCodeError: null }

  const cards = {
    'cc-whoami': view.ccWhoamiRender(stats),
    'cc-usage': view.ccUsageRender(stats),
    'cc-credits': view.ccCreditsRender(stats),
    'cc-windows': view.ccWindowsRender(stats),
    'cc-subscription': view.ccSubscriptionRender(stats),
    'cc-window-5h': view.ccWindowValueRender('fiveHour')(stats),
    'cc-window-weekly': view.ccWindowValueRender('weekly')(stats),
    'cc-window-monthly': view.ccWindowValueRender('monthly')(stats),
  }

  console.log('--- rendered cards (zh) ---')
  for (const [id, o] of Object.entries(cards)) {
    console.log(`${id.padEnd(18)} title=${JSON.stringify(o.title)} legend=${JSON.stringify(o.legend)} value=${JSON.stringify(o.value)} headAfter=${JSON.stringify(o.headAfter)} sub=${JSON.stringify(o.sub)} chart=${o.chart ? o.chart.kind : '-'}`)
  }
  console.log('\n--- assertions ---')

  for (const [id, o] of Object.entries(cards)) {
    check(`title is exactly "Command Code" (${id})`, o.title === 'Command Code', JSON.stringify(o.title))
  }
  check('role words on the grey legend line (用量/额度 carry their unit, 套餐 its period)',
    cards['cc-whoami'].legend === '账户' && cards['cc-usage'].legend === undefined && cards['cc-credits'].legend === undefined && cards['cc-windows'].legend === '窗口' && /^账期 \d{1,2}-\d{1,2}$/.test(cards['cc-subscription'].legend),
    [cards['cc-whoami'].legend, cards['cc-usage'].legend, cards['cc-credits'].legend, cards['cc-windows'].legend, cards['cc-subscription'].legend].map(String).join(' / '))
  check('用量 shows its three facts as a figures row, 额度 as three quota rows',
    cards['cc-usage'].chart?.kind === 'figures' && cards['cc-usage'].chart.figures.length === 3 && cards['cc-credits'].chart?.kind === 'quotas' && cards['cc-credits'].chart.quotas.length === 3,
    `${cards['cc-usage'].chart?.kind}(${cards['cc-usage'].chart?.figures?.length}) / ${cards['cc-credits'].chart?.kind}(${cards['cc-credits'].chart?.quotas?.length})`)
  check('套餐 shows a tier badge, never the raw plan id',
    cards['cc-subscription'].value === 'GOAT' && !JSON.stringify(cards['cc-subscription']).includes('individual-'),
    `${cards['cc-subscription'].value} | ${cards['cc-subscription'].legend}`)
  check('cc-windows renders THREE rings', Array.isArray(cards['cc-windows'].chart?.rings) && cards['cc-windows'].chart.rings.length === 3,
    (cards['cc-windows'].chart?.rings || []).map((r) => `${r.name}:${r.value}%`).join(' '))
  const rings = cards['cc-windows'].chart?.rings || []
  check('cc-windows rings carry NO grey caption beside the figure', rings.every((r) => r.label === ''), rings.map((r) => JSON.stringify(r.label)).join(' '))
  check('cc-windows rings keep the window name for the hover tooltip', rings.every((r) => typeof r.name === 'string' && r.name.length > 0), rings.map((r) => r.name).join(' / '))
  check('cc-windows rings ask for one decimal', rings.every((r) => r.decimals === 1), rings.map((r) => String(r.decimals)).join(','))
  check('cc-windows ring values carry at most one decimal', rings.every((r) => Math.abs(r.value * 10 - Math.round(r.value * 10)) < 1e-9), rings.map((r) => String(r.value)).join(' '))
  for (const id of ['cc-window-5h', 'cc-window-weekly', 'cc-window-monthly']) {
    check(`${id} shows a percent to ONE decimal`, /^\d+\.\d%$/.test(String(cards[id].value)), cards[id].value)
    check(`${id} shows a reset/period line`, typeof cards[id].sub === 'string' && cards[id].sub.length > 0, cards[id].sub)
  }
  // The monthly figure is the plan's published allowance minus the remaining
  // balance — NOT used/(used+remaining). The probe asserted the old formula and
  // had been failing since the fix: that denominator is the sum of two unrelated
  // snapshots (measured 17.26 + 59.01 = 76.27 against a $70 plan), so it read
  // 34.8% where the account page read ~28.9%.
  const remaining = data.credits?.credits?.monthlyCredits
  if (typeof remaining === 'number') {
    const expected = (((70 - remaining) / 70) * 100).toFixed(1) + '%'
    check('monthly percent = plan allowance - remaining (GOAT $70)', cards['cc-window-monthly'].value === expected, `rendered ${cards['cc-window-monthly'].value}, expected ${expected}`)
  }
  check('single-key payload carries NO pool switcher (keys absent)', cards['cc-windows'].cycle === undefined, String(cards['cc-windows'].cycle))

  const fails = results.filter((r) => !r.ok).length
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), keySource: resolved.source, results, fails }, null, 2))
  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}  (${results.length} assertions)  -> ${path.basename(OUT_FILE)}`)
  process.exit(fails === 0 ? 0 : 1)
})().catch((e) => { console.error('probe error:', e && e.stack ? e.stack : e); process.exit(2) })