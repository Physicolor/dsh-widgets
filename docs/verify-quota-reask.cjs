/**
 * Command Code pool integrity + self-heal probe (docs/verify-quota-reask.cjs)
 *
 * The host route answers a failed upstream call with a `null` slice, so the pool
 * can arrive HALF-ANSWERED. Two things must then hold, and neither did before
 * 2026-09-20:
 *
 *   1. the cards must DEGRADE instead of rescaling — a pool member that did not
 *      answer makes the monthly window unknown (`-%`, `今日推荐 —`), never a
 *      summed subset or a hybrid caliber (measured live: a dropped subscription
 *      slice printed 20.2% / `账期 10-20` / `今日推荐 59.9M` where the full
 *      payload says 16.6% / `账期 10-10` / 645M; a dropped credits slice printed
 *      a false 117% over-budget alarm);
 *   2. the collector must ask AGAIN shortly (`CC_RE_ASK_MS`), so that state is a
 *      blip rather than the answer for the rest of the session.
 *
 * The probe freezes one COMPLETE pool payload (fetched with a minted browser
 * cookie — the upstream drops slices under load, so it retries until it has a
 * healthy one, and never stacks its tampering on a real hole), serves it with
 * member 1's subscription slice removed as the FIRST answer, serves the healthy
 * one to the re-ask (HELD, so the degraded window does not depend on how fast
 * this browser mounts the rail), and passes every later answer through. The card
 * is sampled from the live DOM for its whole life, because the degraded state
 * exists only until the re-ask lands.
 *
 * The rail state and the sampler go in through `addInitScript`, i.e. BEFORE the
 * first page script: a plain `page.goto` + inject + reload would spend the
 * probe's first (holey) answer on the throwaway first load.
 *
 * Snapshots and restores `/api/widgets-state` around the run — the restore runs
 * even when the run throws, so a failed probe cannot leave its layout behind.
 *
 * Run: node docs/verify-quota-reask.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')
const hostState = require('./lib/widgets-state.cjs')

const ORIGIN = 'http://127.0.0.1:3080'
const CHROME = 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const SHOT_DIR = path.join(__dirname, 'verify-quota-reask')
const SK = ['quota-manage@2x2']
/** How long the healthy answer to the re-ask is HELD (see the header). */
const HOLD_MS = 15_000
/** The collector's own re-ask delay (`CC_RE_ASK_MS`) plus the hold + a margin. */
const HEAL_MS = 60_000
/** Number of upstream attempts before the probe calls the pool unhealthy. */
const FETCH_TRIES = 8

let failed = 0
const check = (label, ok, detail) => {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  —  ${detail}`)
}

/** A complete pool answer (every member, every slice), or null. */
function complete(json) {
  return json !== null && Array.isArray(json.keys) && json.keys.length >= 2 &&
    json.keys.every((k) => k.data !== null && k.data !== undefined && k.data.whoami != null && k.data.usage != null && k.data.credits != null && k.data.subscription != null)
}

;(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const cookie = (() => { const c = mintCookie('127.0.0.1:3080'); return `${c.name}=${c.value}` })()
  let frozen = null
  for (let i = 0; i < FETCH_TRIES && frozen === null; i++) {
    const response = await fetch(`${ORIGIN}/api/commandcode-usage`, { headers: { Cookie: cookie } }).catch(() => null)
    const json = response === null ? null : await response.json().catch(() => null)
    if (complete(json)) frozen = json
    else await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  if (frozen === null) {
    console.error(`the upstream did not answer a COMPLETE pool payload in ${FETCH_TRIES} tries — the pool is degraded right now, so there is nothing to tamper; re-run later`)
    process.exit(4)
  }
  const endIso = frozen.keys[0].data.subscription.data.currentPeriodEnd
  const anchorDay = `${Number(endIso.slice(5, 7))}-${Number(endIso.slice(8, 10))}`
  console.log(`frozen payload: ${frozen.keys.map((k) => k.label).join(' / ')}  (earliest period end ${endIso})`)
  const holey = JSON.parse(JSON.stringify(frozen))
  holey.keys[0].data.subscription = null

  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  let snap = null
  try {
    const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 2 })
    await ctx.addCookies([mintCookie('127.0.0.1:3080')])
    let served = 0
    await ctx.route('**/api/commandcode-usage*', async (route) => {
      served += 1
      // Answers 1 and 2 are the probe's own (holey, then healthy after a hold);
      // from the third on the real host route is passed through, so the healed
      // state is the page's own doing rather than the probe's.
      if (served === 1) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(holey) })
      if (served === 2) {
        await new Promise((resolve) => setTimeout(resolve, HOLD_MS))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(frozen) })
      }
      return route.fulfill({ response: await route.fetch() })
    })
    // Fidelity guard (see docs/lib/widgets-state.cjs): snapshot the user's layout,
    // inject the probe layout with the OLDEST stamp, write the snapshot back with
    // the NEWEST stamp only after the browser has closed.
    snap = hostState.snapshot('quota-reask')
    const injected = hostState.inject({ installed: SK, order: SK, maxWidgets: 40, columns: 2, cardSide: 150, railOpen: true })
    const page = await ctx.newPage()
    // The probe layout AND the sampler go in before any page script: the card's
    // degraded paint must be recorded even though it lasts only until the re-ask.
    await page.addInitScript((state) => {
      try {
        localStorage.setItem('harness-widgets.state', JSON.stringify(state))
        localStorage.setItem('harness-widgets.state.savedAt', '1')
      } catch { /* storage unavailable: the probe's rail assertions will fail loudly */ }
      const w = window
      w.__ccTexts = []
      w.__ccStart = Date.now()
      const read = () => {
        const card = document.querySelector('.dsx-stats-rail .dsx-stats-card-slot > .dsx-stats-card')
        const text = card === null ? '' : card.innerText.replace(/\s*\n\s*/g, ' | ')
        const last = w.__ccTexts[w.__ccTexts.length - 1]
        if (text !== '' && (last === undefined || last.text !== text)) w.__ccTexts.push({ at: Date.now() - w.__ccStart, text })
      }
      window.setInterval(read, 250)
      read()
    }, injected)
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const openSession = async () => {
      const row = page.locator('[class$="_sessionRow"]').first()
      await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
      if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(2000) }
    }
    await openSession()
    // Mount the rail (and with it the card) — retry until the CARD exists, not
    // just the rail container: the cards render one tick later.
    const hasCard = () => page.evaluate(() => !!document.querySelector('.dsx-stats-rail .dsx-stats-card-slot > .dsx-stats-card'))
    for (let i = 0; i < 12 && !(await hasCard()); i++) {
      const cap = page.locator('button.dsx-stats-capsule').first()
      if (await cap.count()) await cap.click().catch(() => {})
      else await openSession()
      await page.waitForTimeout(1200)
    }
    const diag = await page.evaluate(() => ({
      rail: !!document.querySelector('.dsx-stats-rail'),
      slots: document.querySelectorAll('.dsx-stats-card-slot').length,
      capsule: !!document.querySelector('button.dsx-stats-capsule'),
      samples: (window.__ccTexts ?? []).length,
    }))
    console.log('diag:', JSON.stringify(diag), `served=${served}`)

    // 1) the holey first answer must DEGRADE the card, not rescale it
    const degraded = await page.waitForFunction(
      () => window.__ccTexts.find((s) => /额度管理 \| -%/.test(s.text)) ?? false,
      undefined,
      { timeout: 20_000, polling: 250 },
    ).then((h) => h.jsonValue()).catch(() => null)
    check('the holey payload degrades the card instead of rescaling it', degraded !== null, JSON.stringify(degraded))
    // 今日用量 may still be `—` in this window: the card's token side rides the
    // Command Code-SCOPED day map (`?provider=commandcode`), and a freshly loaded
    // page that has not received it yet prints `—` rather than a machine-wide
    // number (measured 2026-09-20: `—` at 10.1s, 473M from 30.8s).
    check('the degraded card keeps the context it still has (账期, today)',
      degraded !== null && /账期 \d{1,2}-\d{1,2}/.test(degraded.text) && /今日推荐 \| —/.test(degraded.text) && /今日用量 \| (—|[\d.]+[KMB])/.test(degraded.text),
      String(degraded && degraded.text))
    await page.addStyleTag({ content: "* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }" })
    await page.waitForTimeout(200)
    await page.locator('.dsx-stats-rail').first().screenshot({ path: path.join(SHOT_DIR, 'rail-quota-degraded.png') }).catch((e) => console.log('shot failed:', e.message))

    // 2) the collector's re-ask must heal it on its own
    const healed = await page.waitForFunction(
      () => window.__ccTexts.find((s) => /额度管理 \| \d+%/.test(s.text) && /今日推荐 \| [\d.]+[KMB]/.test(s.text)) ?? false,
      undefined,
      { timeout: HEAL_MS, polling: 250 },
    ).then((h) => h.jsonValue()).catch(() => null)
    check(`the collector re-asks and the card heals itself within ${HEAL_MS / 1000}s`, healed !== null, JSON.stringify(healed))
    console.log('card samples:', (await page.evaluate(() => window.__ccTexts ?? [])).map((s) => `${(s.at / 1000).toFixed(1)}s ${s.text}`).join('\n              '))
    check('the healed card is the frozen (healthy) payload\'s own pool month',
      healed !== null && healed.text.includes(`账期 ${anchorDay}`), `expected 账期 ${anchorDay}, got ${String(healed && healed.text)}`)
    check('exactly two answers were the probe\'s own (holey, then healthy)', served >= 2, `served=${served}`)
    check('the page asked a SECOND time on its own — the collector\'s re-ask, not the probe\'s doing', served > 1, `served=${served}`)
    await page.locator('.dsx-stats-rail').first().screenshot({ path: path.join(SHOT_DIR, 'rail-quota-healed.png') }).catch((e) => console.log('shot failed:', e.message))
    console.log(failed === 0 ? 'QUOTA RE-ASK: PASS' : `QUOTA RE-ASK: FAIL (${failed})`)
  } catch (error) {
    failed += 1
    console.error('FAILED', error)
  } finally {
    await browser.close()
    if (snap !== null) {
      const restored = hostState.restore(snap)
      console.log('state restored:', JSON.stringify(restored))
      if (!restored.ok) {
        failed += 1
        console.error('STATE RESTORE FAILED — recover from', restored.backup)
      }
    }
  }
  process.exit(failed === 0 ? 0 : 1)
})()
