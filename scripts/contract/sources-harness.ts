/**
 * dsh-widgets — the DATA SOURCE RESOLUTION harness (offline, React-free).
 *
 * P0-1's contract decides three things before a single byte is fetched, and all
 * three are pure functions:
 *
 *   1. WHICH sources are polled at all (`activeAdapters`) — nothing may be
 *      requested for a widget nobody installed;
 *   2. WHICH installed instances feed a source (`instancesFor`) — the default is
 *      "the widgets whose manifest declares this source", but two families read
 *      the daily maps without declaring them, and the price table belongs to one
 *      card by ID;
 *   3. HOW OFTEN (`schedule.pollMs`) — the sys family polls at the SHORTEST
 *      interval its installed cards ask for, the cc family only while the rail is
 *      on screen.
 *
 * Compiling and running this is the only offline way to prove those rules: the
 * render snapshot covers widgets, not the scheduler. It is deliberately free of
 * React/DOM so plain `node` can run it (see scripts/tsconfig.contract.json).
 */
import { activeAdapters, adapterFor, instancesFor, makeTick, sourceIds } from '../../src/client/data/sources'
import type { Prefs } from '../../src/client/runtime/prefs'

/** A minimal Prefs-shaped object; only the fields the rules read are meaningful. */
function prefs(installed: string[], cardConfigs: Record<string, Record<string, unknown>> = {}): Prefs {
  return { installed, cardConfigs } as unknown as Prefs
}

const failures: string[] = []
function expect(label: string, actual: unknown, wanted: unknown): void {
  const a = JSON.stringify(actual)
  const w = JSON.stringify(wanted)
  if (a === w) console.log(`  ok   ${label}`)
  else { console.error(`  FAIL ${label}\n         got    ${a}\n         wanted ${w}`); failures.push(label) }
}

const ids = (installed: string[]): string[] => activeAdapters(prefs(installed)).map((a) => a.id)

// ── 1. only installed consumers start a feed ─────────────────────────────────
expect('a widget with no source polls nothing', ids(['cache@2x2', 'tokens@2x2']), [])
expect('an installed usage card polls usage + the machine day map', ids(['usage-rings@2x2']), ['usage', 'usage-daily'])
expect('an installed github card polls only github', ids(['github-board@2x2']), ['github'])
expect('an installed sys card polls the sys family', ids(['sys-cpu@2x2']), ['sys'])
expect('an installed cc card polls cc + the scoped day map', ids(['cc-windows@2x2']), ['cc', 'cc-daily', 'usage-daily'])
expect('session-cost declares source cc AND reads the price table', ids(['session-cost@2x2']), ['cc', 'cc-daily', 'pricing', 'usage-daily'])
expect('two families on the rail share one poller each', ids(['usage-rings@2x2', 'cc-windows@2x2', 'cache@2x2']), ['cc', 'cc-daily', 'usage', 'usage-daily'])

// ── 2. instance resolution ───────────────────────────────────────────────────
const sysPrefs = prefs(['sys-cpu@2x2', 'sys-gpu@2x2', 'cache@2x2'])
const sys = adapterFor('sys')!
expect('sys instances are its own cards only', instancesFor(sys, sysPrefs), ['sys-cpu@2x2', 'sys-gpu@2x2'])
const daily = adapterFor('usage-daily')!
expect('the machine day map is fed by the usage AND cc families', instancesFor(daily, prefs(['usage-rings@2x2', 'cc-windows@2x2'])), ['usage-rings@2x2', 'cc-windows@2x2'])
const ccDaily = adapterFor('cc-daily')!
expect('the scoped day map is fed by the cc family only', instancesFor(ccDaily, prefs(['usage-rings@2x2', 'cc-windows@2x2'])), ['cc-windows@2x2'])

// ── 3. tick context ──────────────────────────────────────────────────────────
const tick = makeTick(sys, 'poll', prefs(['sys-cpu@2x2'], { 'sys-cpu@2x2': { interval: 'custom', intervalCustom: 30 } }), {} as never, false, 1234)
expect('the tick carries the reason', tick.reason, 'poll')
expect('the tick carries the clock it was built with', tick.now, 1234)
expect('config() reads the instance config', tick.config('sys-cpu@2x2'), { interval: 'custom', intervalCustom: 30 })
expect('config() is an empty object when a card has no config', tick.config('nothing@2x2'), {})

// ── 4. cadence ───────────────────────────────────────────────────────────────
const pollMs = (id: string, installed: string[], configs: Record<string, Record<string, unknown>> = {}, railOpen = false): unknown =>
  adapterFor(id)!.schedule.pollMs!(makeTick(adapterFor(id)!, 'poll', prefs(installed, configs), {} as never, railOpen, 0))
expect('sys polls at the SHORTEST interval its installed cards ask for', pollMs('sys', ['sys-cpu@2x2', 'sys-gpu@2x2'], { 'sys-cpu@2x2': { interval: '30' }, 'sys-gpu@2x2': { interval: '5' } }), 5000)
expect('sys falls back to the family default (10 s)', pollMs('sys', ['sys-cpu@2x2']), 10000)
expect('cc polls only while the rail is on screen', pollMs('cc', ['cc-windows@2x2'], {}, false), null)
expect('cc polls every 60 s while the rail is open', pollMs('cc', ['cc-windows@2x2'], {}, true), 60000)
expect('github polls every 10 minutes', pollMs('github', ['github-board@2x2']), 600000)

// ── 5. the registry itself ───────────────────────────────────────────────────
expect('every source id is unique and non-empty', sourceIds().filter((id, i, all) => all.indexOf(id) !== i || id === ''), [])
expect('every adapter declares a host module', activeAdapters(prefs(['sys-cpu@2x2', 'usage-rings@2x2', 'cc-windows@2x2', 'github-board@2x2', 'session-cost@2x2'])).every((a) => typeof a.host === 'string' && a.host !== ''), true)

console.log(`\n[source-resolution] ${failures.length === 0 ? 'PASS' : `FAIL — ${failures.length} check(s)`}`)
process.exit(failures.length === 0 ? 0 : 1)
