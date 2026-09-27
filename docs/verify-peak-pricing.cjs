/**
 * peak-pricing (峰谷定价) probe — no browser, no auth, live clock never trusted.
 *
 * The card's verdict is a PRICING verdict, so the probe pins it against the two
 * rules the official price page states (footnote 2,
 * https://api-docs.deepseek.com/quick_start/pricing):
 *
 *   "Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday,
 *    excluding Chinese public holidays. All other hours are off-peak, including
 *    weekends and Chinese public holidays in full."
 *
 *   1. clock — every case is fed a fixed UTC instant, and the Beijing (UTC+8)
 *      wall clock is asserted to be what the verdict reads. A child process with
 *      TZ=America/New_York proves the verdict does NOT follow the machine's own
 *      zone (the old `now.getHours()` reading did);
 *   2. holidays — a statutory holiday that lands on a weekday is off-peak for
 *      the WHOLE day (2026: 19 such days, 中秋 9/25 and 国庆 10/1–10/7 among
 *      them), while the weekends 调休 turns into working days stay off-peak;
 *   3. windows + config — the two windows and their boundaries, custom windows,
 *      the weekend/holiday switches, per-year extra days and the stale-table
 *      flag;
 *   4. render — the card's REAL render still says EXPENSIVE (red + pulse) inside
 *      a window and CHEAP otherwise, and the meter names the reason on a
 *      whole-day off-peak day instead of lighting a window that does not apply.
 *
 * Usage: node docs/verify-peak-pricing.cjs
 * Leaves: docs/verify-peak-pricing-result.json
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { createRequire } = require('node:module')

const REPO = path.join(__dirname, '..')
const OUT_FILE = path.join(__dirname, 'verify-peak-pricing-result.json')
const TMP = path.join(os.tmpdir(), 'dsh-widgets-peak-pricing')

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

/** Compile the unit (+ the i18n module it translates through) into a throwaway dir. */
function compile() {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  execFileSync('npx', [
    'tsc', 'src/widgets/peak-pricing/index.ts', 'src/client/i18n.ts',
    '--outDir', TMP, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop',
    '--rootDir', 'src',
  ], { cwd: REPO, stdio: 'inherit', shell: true })
}

/** Assemble the dictionary exactly like scripts/gen-registry.mjs does. */
function locales() {
  const out = { zh: {}, en: {} }
  const shared = JSON.parse(fs.readFileSync(path.join(REPO, 'src', 'widgets', '_shared', 'locales.json'), 'utf8'))
  for (const loc of ['zh', 'en']) Object.assign(out[loc], shared[loc] || {})
  for (const unit of fs.readdirSync(path.join(REPO, 'src', 'widgets'))) {
    if (unit.startsWith('_')) continue
    const file = path.join(REPO, 'src', 'widgets', unit, 'manifest.json')
    if (!fs.existsSync(file)) continue
    const m = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const loc of ['zh', 'en']) Object.assign(out[loc], (m.locale || {})[loc] || {})
  }
  return out
}

/** Beijing wall clock `Y-M-D H:MM` → the UTC instant it names. */
function bj(stamp) {
  return new Date(`${stamp.replace(' ', 'T')}:00+08:00`)
}

compile()
const requireTmp = createRequire(path.join(TMP, 'noop.cjs'))
const unit = requireTmp(path.join(TMP, 'widgets', 'peak-pricing', 'index.js'))
const holidays = requireTmp(path.join(TMP, 'widgets', 'peak-pricing', 'holidays.js'))
const i18n = requireTmp(path.join(TMP, 'client', 'i18n.js'))
const dict = locales()
i18n.setExtraLocales(dict)
const t = (key, params) => i18n.t(key, params)

const CFG = unit.peakConfigOf(null)          // a freshly added card = the defaults
const withCfg = (patch) => ({ ...CFG, ...patch })

// ── 1. the Beijing clock, from fixed UTC instants ────────────────────────────
{
  const c1 = unit.clockAt(new Date('2026-09-25T07:00:00Z'), 'Asia/Shanghai')
  check('UTC+8 clock: 07:00Z is 15:00 Beijing on 2026-09-25 (Friday)',
    c1.dateKey === '2026-09-25' && c1.mins === 15 * 60 && c1.dow === 5,
    `${c1.dateKey} ${Math.floor(c1.mins / 60)}:${String(c1.mins % 60).padStart(2, '0')} dow=${c1.dow}`)
  const c2 = unit.clockAt(new Date('2026-09-24T23:00:00Z'), 'Asia/Shanghai')
  check('UTC+8 clock rolls the DATE over: 23:00Z is already 9/25 in Beijing',
    c2.dateKey === '2026-09-25' && c2.mins === 7 * 60,
    `${c2.dateKey} ${Math.floor(c2.mins / 60)}:${String(c2.mins % 60).padStart(2, '0')}`)

  // A machine that is NOT in Beijing must still read Beijing: run fixed instants
  // in a child whose own zone is America/New_York. 14:00Z is 22:00 Beijing but
  // 10:00 New York (inside window 1), and 23:00Z is already 9/25 — a holiday — in
  // Beijing while New York is still on 9/24.
  const child = `
    const m = require(process.argv[1])
    const common = { windows: m.parsePeakWindows('09:00-12:00, 14:00-18:00'), weekendOff: true, holidayOff: true, extra: [] }
    const read = (iso) => ({
      bj: m.peakStatusNow(new Date(iso), { ...common, tz: 'Asia/Shanghai' }),
      local: m.peakStatusNow(new Date(iso), { ...common, tz: 'local' }),
    })
    console.log(JSON.stringify({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone, a: read('2026-09-24T14:00:00Z'), b: read('2026-09-24T23:00:00Z') }))`
  const seen = JSON.parse(execFileSync(process.execPath, ['-e', child, path.join(TMP, 'widgets', 'peak-pricing', 'index.js')], {
    env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8',
  }))
  check('the child really runs in America/New_York (so the local branch is not Beijing)',
    seen.zone === 'America/New_York', seen.zone)
  check('TZ=America/New_York host: Asia/Shanghai reads 22:00 Beijing (off-peak) where the host\'s own clock reads 10:00 New York (peak)',
    seen.a.bj.peak === false && seen.a.bj.reasonKey === undefined && seen.a.local.peak === true && seen.a.local.activeIndex === 0,
    JSON.stringify(seen.a))
  check('TZ=America/New_York host: the Beijing DATE drives the holiday (23:00Z → 9/25 中秋 off-peak), not the host date (NY still 9/24)',
    seen.b.bj.reasonKey === 'card.peak.holiday.midautumn' && seen.b.bj.dateKey === '2026-09-25'
      && seen.b.local.dateKey === '2026-09-24' && seen.b.local.reasonKey === undefined,
    JSON.stringify(seen.b))
}

// ── 2. statutory holidays are off-peak for the whole day ─────────────────────
{
  const days = [
    ['2026-01-02 09:30', 'card.peak.holiday.newyear', '元旦 Fri'],
    ['2026-02-16 10:00', 'card.peak.holiday.spring', '春节 Mon'],
    ['2026-02-20 15:00', 'card.peak.holiday.spring', '春节 Fri'],
    ['2026-04-06 10:00', 'card.peak.holiday.qingming', '清明 Mon'],
    ['2026-05-04 10:00', 'card.peak.holiday.labour', '劳动节 Mon'],
    ['2026-06-19 14:30', 'card.peak.holiday.dragon', '端午 Fri'],
    ['2026-09-25 15:00', 'card.peak.holiday.midautumn', '中秋 Fri — the live 2026-09-25 bug'],
    ['2026-10-01 10:00', 'card.peak.holiday.national', '国庆 Thu'],
    ['2026-10-07 09:00', 'card.peak.holiday.national', '国庆 Wed (last day)'],
  ]
  let allHoliday = true
  const seen = []
  for (const [stamp, key, label] of days) {
    const st = unit.peakStatusNow(bj(stamp), CFG)
    seen.push(`${label}:${st.peak ? 'PEAK' : st.reasonKey === key ? 'off' : `bad:${st.reasonKey}`}`)
    if (st.peak || st.reasonKey !== key) allHoliday = false
  }
  check('every 2026 holiday day that lands in a peak window reads WHOLE-DAY off-peak', allHoliday, seen.join(' '))
  const outside = unit.peakStatusNow(bj('2026-10-01 13:00'), CFG)
  check('a holiday is off-peak even between the windows (13:00 has no window anyway)',
    outside.peak === false && outside.reasonKey === 'card.peak.holiday.national', JSON.stringify(outside))

  // 调休 turns these weekends into working days; DeepSeek bills them off-peak.
  const tiaoxiu = ['2026-01-04 10:00', '2026-02-14 10:00', '2026-02-28 10:00', '2026-05-09 10:00', '2026-09-20 10:00', '2026-10-10 10:00']
  const weekendOff = tiaoxiu.every((s) => unit.peakStatusNow(bj(s), CFG).reasonKey === 'card.peak.weekend')
  check('the six 调休 workday weekends (e.g. 2026-02-14) stay off-peak', weekendOff, tiaoxiu.join(' '))
}

// ── 3. ordinary weekdays, boundaries and the config switches ─────────────────
{
  const inPeak1 = unit.peakStatusNow(bj('2026-09-24 09:00'), CFG)
  const inPeak2 = unit.peakStatusNow(bj('2026-09-24 15:00'), CFG)
  check('09:00 is inside window 1 (lower bound inclusive)', inPeak1.peak === true && inPeak1.activeIndex === 0, JSON.stringify(inPeak1))
  check('15:00 is inside window 2', inPeak2.peak === true && inPeak2.activeIndex === 1, JSON.stringify(inPeak2))
  const edges = [['2026-09-24 12:00', false], ['2026-09-24 14:00', true], ['2026-09-24 18:00', false], ['2026-09-24 08:59', false]]
  const edgeOk = edges.every(([s, want]) => unit.peakStatusNow(bj(s), CFG).peak === want)
  check('window boundaries: 12:00 / 18:00 exclusive, 14:00 inclusive, 08:59 outside',
    edgeOk, edges.map(([s]) => `${s}=${unit.peakStatusNow(bj(s), CFG).peak}`).join(' '))
  check('an off-peak weekday names NO reason (the meter keeps both windows)',
    unit.peakStatusNow(bj('2026-09-24 13:00'), CFG).reasonKey === undefined)

  // Custom windows + tolerance for a half-typed field.
  const custom = unit.peakStatusNow(bj('2026-09-24 08:30'), withCfg({ windows: unit.parsePeakWindows('08:00-09:00, 20:00-21:00') }))
  check('custom windows are honoured (08:30 → window 1)', custom.peak === true && custom.activeIndex === 0, JSON.stringify(custom))
  const junk = unit.parsePeakWindows('garbage, 10:00-09:00, 25:00-26:00')
  const junkPeak = unit.peakStatusNow(bj('2026-09-24 10:00'), withCfg({ windows: junk }))
  check('an unparseable/reversed/out-of-day window list falls back to the built-in pair',
    junkPeak.peak === true && junkPeak.activeIndex === 0 && JSON.stringify(junk) === JSON.stringify(CFG.windows), JSON.stringify(junk))
  const partial = unit.parsePeakWindows('07:00-08:00, 10:0')
  check('a half-typed trailing entry is skipped, the valid one survives',
    partial.length === 1 && partial[0].start === 7 * 60 && partial[0].end === 8 * 60, JSON.stringify(partial))
  check('parsePeakWindows caps at 2 rows (the meter\'s shape)',
    unit.parsePeakWindows('01:00-02:00, 03:00-04:00, 05:00-06:00').length === 2)

  // 2026-09-19 is a plain Saturday (中秋 only starts on the 25th).
  check('weekendOff=false turns a plain weekend window back into peak',
    unit.peakStatusNow(bj('2026-09-19 10:00'), withCfg({ weekendOff: false })).peak === true)
  check('holidayOff=false turns a holiday window back into peak',
    unit.peakStatusNow(bj('2026-10-01 10:00'), withCfg({ holidayOff: false })).peak === true)
  check('weekendOff=false leaves a plain weekend off-peak outside the windows',
    unit.peakStatusNow(bj('2026-09-19 13:00'), withCfg({ weekendOff: false })).peak === false)
  check('a plain Saturday is off-peak on the defaults', unit.peakStatusNow(bj('2026-09-19 10:00'), CFG).reasonKey === 'card.peak.weekend')

  // 2027 has no table entry yet — the card must SAY so rather than guess.
  const uncovered = unit.peakStatusNow(bj('2027-01-01 10:00'), CFG)
  check('an uncovered year (2027-01-01, a Friday) keeps weekday behaviour and flags the stale table',
    uncovered.peak === true && uncovered.holidayTableStale === true, JSON.stringify(uncovered))
  const extra = holidays.parseExtraHolidays('2027-01-01..2027-01-03, 2027-02-05')
  const covered = unit.peakStatusNow(bj('2027-01-01 10:00'), withCfg({ extra }))
  check('extraHolidays covers an unpublished year (2027-01-01 → off-peak, custom)',
    covered.peak === false && covered.reasonKey === 'card.peak.holiday.custom' && covered.holidayTableStale === false,
    JSON.stringify(covered))
  check('extraHolidays tolerates junk and spans',
    extra.length === 2 && extra[0].start === '2027-01-01' && extra[0].end === '2027-01-03' && extra[1].start === '2027-02-05' && extra[1].end === '2027-02-05',
    JSON.stringify(extra))
  check('an invalid extra list (feb 30, reversed span) is dropped',
    holidays.parseExtraHolidays('2027-02-30, 2027-03-05..2027-03-01, nope').length === 0)
}

// ── 4. the real render (labels through the real locale dictionary) ───────────
{
  const w = requireTmp(path.join(TMP, 'widgets', 'peak-pricing', 'index.js')).default
  const peak = w.render({}, { sim: { peak: true } })
  const cheap = w.render({}, { sim: { peak: false } })
  check('EXPENSIVE is still red + pulsing', peak.value === 'EXPENSIVE' && peak.valueTone === 'danger' && peak.valuePulse === true,
    `${peak.value} tone=${peak.valueTone} pulse=${peak.valuePulse}`)
  check('CHEAP stays plain', cheap.value === 'CHEAP' && !cheap.valuePulse && cheap.valueTone === undefined)

  const holiday = w.render({}, { sim: { peak: false, reasonKey: 'card.peak.holiday.midautumn' } })
  check('a whole-day off-peak day shows ONE meter row naming the reason, not two window rows',
    holiday.meter.length === 1 && holiday.meter[0].label === '中秋节 · 全天低谷' && holiday.value === 'CHEAP',
    JSON.stringify(holiday.meter))
  const weekend = w.render({}, { sim: { peak: false, reasonKey: 'card.peak.weekend' } })
  check('the weekend reason renders the same way', weekend.meter.length === 1 && weekend.meter[0].label === '周末 · 全天低谷', JSON.stringify(weekend.meter))
  check('the window rows keep the established 上午/下午 labels',
    cheap.meter.length === 2 && cheap.meter[0].label === '上午 09:00–12:00' && cheap.meter[1].label === '下午 14:00–18:00',
    JSON.stringify(cheap.meter))
  check('only the live window is lit (sim window 1 → row 2)',
    w.render({}, { sim: { peak: true, window: 1 } }).meter[1].active === true
      && w.render({}, { sim: { peak: true, window: 1 } }).meter[0].active === false)

  const custom = w.render({ peakWindows: '08:00-09:00, 20:30-21:00' }, { sim: { peak: true } })
  check('custom windows show up in the meter', custom.meter[0].label === '上午 08:00–09:00' && custom.meter[1].label === '下午 20:30–21:00',
    JSON.stringify(custom.meter.map((m) => m.label)))
  check('a card rendered with NO config at all behaves like a fresh card (probe / preview safe)',
    w.render({}, undefined).value === 'CHEAP' && w.render({}, undefined).meter.length >= 1)

  // Every user-facing string the card can print must exist in BOTH dictionaries.
  const src = fs.readFileSync(path.join(REPO, 'src', 'widgets', 'peak-pricing', 'index.ts'), 'utf8')
    + fs.readFileSync(path.join(REPO, 'src', 'widgets', 'peak-pricing', 'holidays.ts'), 'utf8')
  const keys = new Set()
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) keys.add(m[1])
  for (const m of src.matchAll(/key:\s*'(card\.[^']+)'/g)) keys.add(m[1])
  const missing = []
  for (const k of keys) {
    if (k.includes('${')) continue
    for (const loc of ['zh', 'en']) if (dict[loc][k] === undefined) missing.push(`${loc}:${k}`)
  }
  check(`every t() key the unit can resolve exists in zh + en (${keys.size} keys)`, missing.length === 0, missing.join(' '))
  check('the stale-table hint interpolates (year + source) instead of printing raw placeholders',
    t('card.peak.staleHint', { year: '2027', source: 'test-source' }).indexOf('{') === -1
      && t('card.peak.staleHint', { year: '2027', source: 'test-source' }).includes('2027'),
    t('card.peak.staleHint', { year: '2027', source: 'test-source' }))
}

fs.writeFileSync(OUT_FILE, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  holidayTable: { years: [2026], source: '国办发明电〔2025〕7号', ranges: 7 },
  results,
}, null, 2)}\n`, 'utf8')

const failed = results.filter((r) => !r.ok).length
console.log(`\n${failed === 0 ? `all checks passed (${results.length})` : `${failed} of ${results.length} check(s) failed`}`)
fs.rmSync(TMP, { recursive: true, force: true })
process.exitCode = failed === 0 ? 0 : 1
