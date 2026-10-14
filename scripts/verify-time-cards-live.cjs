/**
 * dsh-widgets — LIVE acceptance for the four TIME cards (任务计时 / 秒表 / 倒计时 / 日历 2×4).
 *
 * WHY A LIVE PROBE, when the offline gallery already renders `CardBody` with the
 * real theme tokens: the gallery bundles the render closure from SOURCE, while the
 * running GUI loads `lib/client.js` from this checkout through the profile's link.
 * Only a live page proves the SHIPPED bundle — discovery, dictionary, registry and
 * renderer together — actually mounts these cards on a real rail, with a real
 * session behind it.
 *
 * WHAT IT ADDS OVER THE OFFLINE SHOTS. Three things the gallery cannot reach:
 *  1. the 1-SECOND TICK of `render/rich/timer-face.tsx` on a real card (the gallery
 *     only ever renders the pinned preview instants);
 *  2. the ACTION LOOP: a click on 开始 → the rail's `timer:*` dispatch → this
 *     instance's `cardConfigs` → `buildLiveStats` → the card re-rendering with a
 *     running reading. Nothing offline exercises that path;
 *  3. the 2×4 CALENDAR's width-driven split against the rail's real cell width
 *     (the agenda column only exists when `CardBody` hands the block a >1.6× box).
 *
 * TWO PASSES. Pass A reviews the three 2×2 time cards. Pass B reviews the wide
 * calendar beside one small card — NOT alone: a rail whose only instance is a 2×4
 * tile seats nothing at all (the deck held just the 添加 button, measured
 * 2026-10-14), which is the rail's own seating rule rather than the unit's.
 *
 * A WIDE WINDOW AND A NARROW TRANSCRIPT are part of the setup, not decoration: the
 * rail's usable width is what is left beside the conversation column, and a 2×4 tile
 * needs TWO card columns of it. In a 1-column rail the product HIDES every 2×4
 * instance by design (`rail-view.tsx`: "a 2×4 tile cannot fit the single rail
 * column") — exactly what a 1440px viewport with the default 748px transcript
 * produced.
 *
 * Every read and every click is scoped to `.dsx-stats-rail`: pointing at a card
 * opens the magnify wave, which mounts a SECOND copy of the same card inside
 * `.dsx-magnify-layer`, and a locator that does not say which deck it means can
 * click the animating copy (measured: the 复位 click timed out on an invisible
 * overlay copy, leaving the stopwatch running).
 *
 * It does not touch the owner's own rail. The layout is seeded into THIS browser
 * context's localStorage (`harness-widgets.state`, the plugin's own fast cache)
 * before the page loads, every write to `/api/widgets-state` is INTERCEPTED and
 * answered locally, and the script snapshots that state file before the run and
 * restores it byte-for-byte afterwards if anything did reach it. (The first draft of
 * this probe lacked the interceptor and overwrote the owner's rail layout — the
 * incident is why both guards exist.)
 *
 * Usage:
 *   node scripts/verify-time-cards-live.cjs
 *   node scripts/verify-time-cards-live.cjs --authority 127.0.0.1:3080
 *
 * Exit codes: 0 = all four cards mount and behave; 1 = a card is missing/wrong;
 * 2 = no rail (no GUI on that authority, or no session to enter — not a defect).
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { chromePath } = require('./lib/chrome.cjs')
const { chromium } = require('./lib/playwright-core.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const argv = process.argv.slice(2)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const AUTHORITY = val('--authority', process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:19387')
const BASE = `http://${AUTHORITY}`
const OUT = path.join(__dirname, '..', '.tmp-live-time-cards')
/** The rail state the plugin persists (state-file.ts hard-codes the `web` profile). */
const STATE_FILE = path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'profiles', 'web', 'dsh-widgets-state.json')

/** A rail layout. `railOpen` is NOT optional: its default is `false` (prefs.ts) and
 *  the rail renders nothing at all while it is closed. A fresh throwaway context has
 *  no history, so the "the drawer is retired → click the capsule" path the older
 *  probe relies on never triggers — measured 2026-10-14, that probe reported "no
 *  rail" on a GUI where everything was in fact running. */
const layout = (installed, cardConfigs) => ({
  installed,
  order: installed,
  columns: 2,
  maxRows: 5,
  maxWidgets: installed.length,
  cardSide: 150,
  railOpen: true,
  squircle: true,
  cornerPercent: 16,
  ...(cardConfigs === undefined ? {} : { cardConfigs }),
})

/**
 * Every instance key this probe SEEDS. The state-file guard uses them as the
 * signature of "this run's own layout escaped to the host" — as opposed to the
 * owner's client re-syncing its own (correct, restored) rail while the probe runs.
 */
const SEED_KEYS = new Set(['task-timer@2x2', 'stopwatch@2x2', 'countdown@2x2', 'calendar@2x4', 'clock@2x2'])

/** The `installed` array a state file records, or null when it is unreadable. */
const installedOf = (raw) => {
  try { const j = JSON.parse(raw ?? '{}'); return Array.isArray(j?.state?.installed) ? j.state.installed : null } catch { return null }
}

/** Does this state file hold THIS RUN's seeded layout (rather than the owner's)? */
const looksLikeOurSeed = (raw) => {
  const installed = installedOf(raw)
  return installed !== null && installed.length <= SEED_KEYS.size && installed.every((k) => SEED_KEYS.has(k))
}

/**
 * The owner's persisted rail, as it was before this run, and the one function that
 * puts it back.
 *
 * Registered on `process.on('exit')` as well as called at the end of the happy path:
 * an early `process.exit(2)` (no GUI, no session row) or a thrown script would
 * otherwise skip the restore, which is exactly the guarantee the guard's comment
 * claims (independent review, 2026-10-14, D9). Restores only when the file holds
 * OUR seeded layout — the owner's own client re-syncing during the run must not be
 * overwritten with a stale snapshot.
 */
const STATE_BEFORE = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf8') : null
let guardArmed = true
function guardOwnerRail() {
  if (!guardArmed) return 'disarmed'
  guardArmed = false
  try {
    const after = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf8') : null
    if (after === STATE_BEFORE) return 'same'
    if (STATE_BEFORE === null) {
      fs.rmSync(STATE_FILE, { force: true })
      return 'removed'
    }
    if (looksLikeOurSeed(after)) {
      fs.writeFileSync(STATE_FILE, STATE_BEFORE, 'utf8')
      return 'restored'
    }
    return 'foreign'
  } catch {
    return 'error'
  }
}
process.on('exit', () => {
  const verdict = guardOwnerRail()
  if (verdict === 'restored' || verdict === 'removed') {
    console.error(`[live] the state file held THIS RUN's seeded layout on exit — ${verdict}`)
  }
})

/** `M:SS` / `H:MM:SS` → seconds, or null when the card prints no reading. */
const seconds = (text) => {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text ?? '')
  if (m === null) return null
  return m[3] === undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/**
 * Open one throwaway context with `seed` installed and return the page plus readers.
 *
 * The session is opened by clicking the newest session row; the rail only mounts
 * inside a conversation.
 */
async function openRail(browser, seed, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  // The owner's rail layout must survive this run: the plugin persists on every
  // prefs patch (a debounced PUT, plus a flush on pagehide), and this probe CLICKS a
  // card — so the write is answered here and never reaches the host.
  await ctx.route('**/api/widgets-state', async (route) => {
    const method = route.request().method()
    if (method === 'PUT' || method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
      return
    }
    await route.continue()
  })
  // Seeded BEFORE the app boots (addInitScript runs on every navigation, ahead of
  // the page's own scripts) and stamped NOW, so this context's cache wins over the
  // host store for this run only.
  //
  // ONLY WHEN ABSENT: this script runs on EVERY navigation, and a later pass reloads
  // the page on purpose (the persistence check) — re-seeding there would erase the
  // very state under test.
  await ctx.addInitScript((s) => {
    try {
      if (localStorage.getItem('harness-widgets.state') !== null) return
      localStorage.setItem('harness-widgets.state', JSON.stringify(s))
      localStorage.setItem('harness-widgets.state.savedAt', String(Date.now()))
      // The shell's own transcript measure: shrinking it is what gives the rail the
      // width two card columns need (see the header).
      localStorage.setItem('dsh.conversation.contentWidth', '420')
    } catch { /* private mode */ }
  }, seed)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error(`[live:${tag}] pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') console.error(`[live:${tag}] console.error: ${m.text().slice(0, 300)}`)
    else if (m.text().startsWith('[dsh-widgets]')) console.log(`[live:${tag}] ${m.text().slice(0, 300)}`)
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => {
    console.error(`[live] cannot reach ${BASE}: ${e.message}`)
    process.exit(2)
  })
  await page.waitForTimeout(4000)
  await page.locator('[class$="_sessionRow"]').first().click({ timeout: 8000 })
    .catch((e) => { console.error(`[live] no session row: ${e.message}`); process.exit(2) })
  await page.waitForTimeout(6000)
  // NOTE: no toast is dismissed here. The earlier draft clicked the 「不再提醒」
  // control of ANOTHER plugin (dsh-notification) to clear a banner out of a
  // screenshot — but that control writes that plugin's own state, which this probe
  // has no business touching (independent review, 2026-10-14, D9). A banner that
  // lands over a card is a screenshot nuisance, not an assertion problem: every
  // check below reads the DOM.
  // Park the pointer away from the cards: a pointer resting on a card opens the
  // magnify wave, which mounts a second copy of it (see the header).
  await page.mouse.move(5, 5)
  await page.waitForTimeout(700)
  if (await page.$('.dsx-stats-rail') === null) {
    console.error(`[live:${tag}] no rail on ${BASE} — is a session open?`)
    process.exit(2)
  }
  /** Every card of the RESTING deck (never the magnify overlay's copy). */
  const read = () => page.evaluate(() => {
    const out = []
    const cards = [...document.querySelectorAll('.dsx-stats-rail .dsx-stats-card')]
    for (const [i, card] of cards.entries()) {
      const text = (card.textContent ?? '').replace(/\s+/g, ' ').trim()
      const box = card.getBoundingClientRect()
      // The 2×4 body is split into a square grid + an agenda column; the agenda's
      // own left edge is what proves the split actually happened.
      const agenda = [...card.querySelectorAll('div')].find((d) => (d.textContent ?? '').trim().startsWith('临近日程'))
      out.push({
        i,
        text,
        actions: [...card.querySelectorAll('[data-action]')].map((b) => ({ id: b.getAttribute('data-action'), label: (b.textContent ?? '').trim() })),
        // The title-row back affordance (`headAction`): a role=button span inside the
        // head. It is NOT a `data-action` element, so it needs its own reader.
        headAction: card.querySelector('[role="button"]') !== null,
        titleEl: card.querySelector('.dsx-stats-card-title') !== null,
        overflow: card.hasAttribute('data-dsx-overflow'),
        vis: getComputedStyle(card).visibility,
        box: { w: Math.round(box.width), h: Math.round(box.height), x: Math.round(box.left), y: Math.round(box.top) },
        agendaX: agenda === undefined ? null : Math.round(agenda.getBoundingClientRect().left - box.left),
      })
    }
    return out
  })
  const cardOf = (cards, needle) => cards.find((c) => c.text.indexOf(needle) !== -1)
  /**
   * The stopwatch, found by its READING rather than by its name.
   *
   * Since the reference redesign it is a T1 card: no title element, and its body —
   * `00:00:56.29` over two discs — carries no words at all, so neither `秒表` nor any
   * other string is in its text. The `HH:MM:SS.cc` column is the one thing on the
   * rail that identifies it (the 倒计时 card prints `M:SS`).
   */
  const stopwatchOf = (cards) => cards.find((c) => /\d{2}:\d{2}:\d{2}\.\d{2}/.test(c.text))
  /** Find one card by a needle OR by a finder (see `stopwatchOf`). */
  const findCard = (cards, matcher) => (typeof matcher === 'function' ? matcher(cards) : cardOf(cards, matcher))
  const clickAction = async (cards, matcher, action) => {
    const card = findCard(cards, matcher)
    if (card === undefined) return false
    await page.locator('.dsx-stats-rail .dsx-stats-card').nth(card.i).locator(`[data-action="${action}"]`).click({ timeout: 5000 })
    await page.mouse.move(5, 5)
    return true
  }
  /** Press a card's title-row back affordance (`headAction`). */
  const clickHead = async (cards, matcher) => {
    const card = findCard(cards, matcher)
    if (card === undefined) return false
    await page.locator('.dsx-stats-rail .dsx-stats-card').nth(card.i).locator('[role="button"]').first().click({ timeout: 5000 })
    await page.mouse.move(5, 5)
    return true
  }
  /** Cut a card's pixels straight from the page by its bounding box: the rail's
   *  cards animate, and Playwright's own visibility gate refuses a legitimate card
   *  mid-cascade. */
  const shot = async (cards, matcher, file, pad = 4) => {
    const card = findCard(cards, matcher)
    if (card === undefined || card.box.w === 0) return false
    await page.screenshot({
      path: path.join(OUT, file),
      clip: { x: Math.max(0, card.box.x - pad), y: Math.max(0, card.box.y - pad), width: card.box.w + pad * 2, height: card.box.h + pad * 2 },
    })
    return true
  }
  return { ctx, page, read, cardOf, stopwatchOf, clickAction, clickHead, shot }
}

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  // (The owner's rail snapshot is taken once, at module load: see STATE_BEFORE.)
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const problems = []
  const shots = {}

  /** The rail's own card side: a 2×2 tile is square by contract, and the side
   *  follows the rail's width (the owner's rail runs 120px, a fresh wide window
   *  170px), so a hard-coded 150 would be wrong. */
  const sideOf = (cards) => {
    const two = cards.find((c) => c.box.w === c.box.h)
    return two === undefined ? undefined : two.box.w
  }
  const checkCard = (card, label, expectTitle, side) => {
    if (card === undefined) { problems.push(`${label} is not on the rail`); return }
    if (expectTitle && !card.titleEl) problems.push(`${label} lost its title row (a T2 card must keep it)`)
    if (!expectTitle && card.titleEl) problems.push(`${label} still draws a title element (the head row should be gone)`)
    if (card.overflow) problems.push(`${label} does not fit its tile (data-dsx-overflow)`)
    if (side !== undefined && card.box.h !== side) problems.push(`${label} is ${card.box.h}px tall, expected the rail's ${side}px side`)
  }

  // ── PASS A: the three 2×2 time cards ─────────────────────────────────────────
  const A = await openRail(browser, layout(['task-timer@2x2', 'stopwatch@2x2', 'countdown@2x2']), 'A')
  const before = await A.read()
  console.log('[live] pass A cards:', JSON.stringify(before, null, 1))
  const sideA = sideOf(before)

  const taskTimer = A.cardOf(before, '任务计时')
  checkCard(taskTimer, '任务计时', true, sideA)
  if (taskTimer !== undefined && !/\d{1,2}:\d{2}|—/.test(taskTimer.text)) problems.push(`任务计时 printed no turn reading: ${taskTimer.text}`)
  if (taskTimer !== undefined && !/本回合|当前工具|模型|空闲/.test(taskTimer.text)) problems.push(`任务计时 printed no labelled reading: ${taskTimer.text}`)

  const countdown = A.cardOf(before, '倒计时')
  checkCard(countdown, '倒计时', true, sideA)
  if (countdown !== undefined) {
    // The PICKER view: four duration capsules, no pill actions (`timer:pick:<min>`).
    const capsuleIds = countdown.actions.map((a) => a.id)
    if (!capsuleIds.some((id) => id.startsWith('timer:pick:'))) {
      problems.push(`倒计时 picker drew no duration capsules (actions: ${capsuleIds.join(',') || 'none'})`)
    }
    // Press one: the card must switch to the RUN view — a reading, the two discs and
    // the title-row back chevron (the owner's reference flow, 2026-10-14).
    if (capsuleIds.some((id) => id === 'timer:pick:1')) {
      await A.clickAction(before, '倒计时', 'timer:pick:1')
      await A.page.waitForTimeout(1400)
      const running = A.cardOf(await A.read(), '倒计时')
      if (running === undefined) problems.push('倒计时 disappeared after a capsule press')
      else {
        if (!/\d{1,2}:\d{2}/.test(running.text)) problems.push(`倒计时 run view printed no reading: ${running.text}`)
        if (!running.actions.some((a) => a.id === 'timer:pause')) problems.push(`倒计时 run view has no 暂停 disc (actions: ${running.actions.map((a) => a.id).join(',')})`)
        if (!running.actions.some((a) => a.id === 'timer:reset')) problems.push('倒计时 run view has no 复位 disc')
        if (!running.headAction) problems.push('倒计时 run view has no back chevron in the title row')
        // Back: the picker must return (the chevron fires `timer:reset`).
        await A.clickHead(await A.read(), '倒计时')
        await A.page.waitForTimeout(1000)
        const back = A.cardOf(await A.read(), '倒计时')
        if (back === undefined) problems.push('倒计时 disappeared after the back chevron')
        else if (!back.actions.some((a) => a.id.startsWith('timer:pick:'))) {
          problems.push(`倒计时 did not return to the capsule picker after the back chevron: ${back.text}`)
        }
      }
    }
  }

  const stopwatch = A.stopwatchOf(before)
  // TITLeless since the reference redesign (2026-10-14): the dial body owns the
  // tile and names itself — see docs/design/CARD-BODY-POSTURE.md / CARD-TITLE-STANDARD T1.
  checkCard(stopwatch, '秒表', false, sideA)
  let tick = null
  if (stopwatch !== undefined) {
    if (seconds(stopwatch.text) === null) problems.push(`秒表 printed no reading: ${stopwatch.text}`)
    if (!stopwatch.actions.some((a) => a.id === 'timer:start')) problems.push('秒表 has no 开始 button')
    if (!stopwatch.actions.some((a) => a.id === 'timer:reset')) problems.push('秒表 has no 复位 button')

    // The action loop + the tick, in one measurement: press 开始, then read the
    // SAME card twice ~2.5s apart. A card that ignores the press stays at 0:00; a
    // card whose renderer does not tick prints the same reading twice.
    await A.clickAction(before, A.stopwatchOf, 'timer:start')
    await A.page.waitForTimeout(1300)
    const s1 = seconds(A.stopwatchOf(await A.read())?.text)
    await A.page.waitForTimeout(2500)
    const after = await A.read()
    const s2 = seconds(A.stopwatchOf(after)?.text)
    const running = A.stopwatchOf(after)
    tick = { s1, s2 }
    if (s1 === null || s2 === null) problems.push('秒表 printed no reading after 开始')
    else if (s2 <= s1) problems.push(`秒表 did not advance after 开始 (${s1}s → ${s2}s): the tick or the action loop is broken`)
    if (running !== undefined && !running.actions.some((a) => a.id === 'timer:pause')) {
      problems.push('秒表 still offers 开始 while running (the action did not reach the card config)')
    }
    // Reset, so the run leaves nothing running behind it.
    await A.clickAction(after, A.stopwatchOf, 'timer:reset')
    await A.page.waitForTimeout(900)
    const stopped = A.stopwatchOf(await A.read())
    if (seconds(stopped?.text) !== 0) problems.push(`秒表 did not return to 0:00 after 复位: ${stopped?.text}`)
    if (stopped !== undefined && !stopped.actions.some((a) => a.id === 'timer:start')) problems.push('秒表 does not offer 开始 after 复位')

    // PERSISTENCE, the one acceptance claim a live click can still falsify: the state
    // lives in the instance's cardConfigs (persisted through the same channel the
    // 组件配置 panel writes), so a RELOAD must resume a running stopwatch rather than
    // show 0:00. Started again first, because a reset stopwatch is 0:00 either way.
    await A.clickAction(await A.read(), A.stopwatchOf, 'timer:start')
    await A.page.waitForTimeout(1300)
    await A.page.reload({ waitUntil: 'domcontentloaded' })
    await A.page.waitForTimeout(7000)
    const reloaded = A.stopwatchOf(await A.read())
    const reloadedSeconds = seconds(reloaded?.text)
    if (reloaded === undefined) problems.push('秒表 is not on the rail after a reload')
    else if (reloadedSeconds === null || reloadedSeconds <= 0) problems.push(`秒表 lost its state across a reload: ${reloaded.text}`)
    await A.clickAction(await A.read(), '秒表', 'timer:reset')
    await A.page.waitForTimeout(600)
  }
  shots.taskTimer = await A.shot(await A.read(), '任务计时', 'task-timer.png')
  shots.stopwatch = await A.shot(await A.read(), A.stopwatchOf, 'stopwatch.png')
  shots.countdown = await A.shot(await A.read(), '倒计时', 'countdown.png')
  const railA = await A.page.$('.dsx-stats-rail')
  if (railA !== null) { await railA.screenshot({ path: path.join(OUT, 'rail-time-cards.png') }).catch(() => {}) }
  await A.ctx.close()

  // ── PASS B: the 2×4 calendar beside one small card ────────────────────────────
  const B = await openRail(browser, layout(['calendar@2x4', 'clock@2x2']), 'B')
  const cal = await B.read()
  console.log('[live] pass B cards:', JSON.stringify(cal, null, 1))
  const sideB = sideOf(cal)
  const calendar = B.cardOf(cal, '临近日程') ?? cal.find((c) => /\d{4}年\d{1,2}月/.test(c.text))
  checkCard(calendar, '日历@2x4', false, sideB)
  if (calendar === undefined) {
    problems.push('日历@2x4 is not on the rail')
  } else {
    if (!/\d{4}年\d{1,2}月/.test(calendar.text)) problems.push(`日历 printed no month caption: ${calendar.text}`)
    if (sideB !== undefined && calendar.box.w < sideB * 1.8) problems.push(`日历@2x4 is ${calendar.box.w}px wide, expected two ${sideB}px cells`)
    if (calendar.agendaX === null) problems.push('日历@2x4 drew no agenda column (the width-driven split did not happen)')
    else if (sideB !== undefined && calendar.agendaX < sideB * 0.9) problems.push(`日历@2x4's agenda column starts at ${calendar.agendaX}px — it is not beside the grid`)
    if (!/临近日程|暂无日程/.test(calendar.text)) problems.push(`日历@2x4 drew no agenda label: ${calendar.text}`)
  }
  shots.calendar = await B.shot(await B.read(), '临近日程', 'calendar@2x4.png')
  const railB = await B.page.$('.dsx-stats-rail')
  if (railB !== null) { await railB.screenshot({ path: path.join(OUT, 'rail-calendar-2x4.png') }).catch(() => {}) }
  await B.ctx.close()

  // ── PASS C: 倒计时 alone in `next` mode (the schedule GATE, not the calendar) ──
  // The gate is a STATIC manifest declaration (`reads: ['schedule']`), so a rail that
  // installs 倒计时 but NOT 日历 must still subscribe — otherwise the card's whole
  // second mode reads `snap.schedule === null` and prints 定时任务不可用 for ever.
  // Found by the independent review, 2026-10-14: `countdown` was missing the
  // declaration while its card advertised the mode.
  const C = await openRail(browser, layout(['countdown@2x2', 'stopwatch@2x2'], { 'countdown@2x2': { cdMode: 'next' } }), 'C')
  const nextCards = await C.read()
  console.log('[live] pass C cards:', JSON.stringify(nextCards, null, 1))
  const nextCountdown = C.cardOf(nextCards, '倒计时')
  if (nextCountdown === undefined) {
    problems.push('倒计时 (next 模式) is not on the rail')
  } else if (nextCountdown.text.indexOf('定时任务不可用') !== -1) {
    problems.push('倒计时 in next mode says 定时任务不可用 although the deployment HAS the schedule face: the reads gate is not subscribing')
  } else if (!/暂无日程|\d{1,2}:\d{2}/.test(nextCountdown.text)) {
    problems.push(`倒计时 in next mode printed neither a countdown nor the empty state: ${nextCountdown.text}`)
  }
  shots.countdownNext = await C.shot(await C.read(), '倒计时', 'countdown-next.png')
  await C.ctx.close()
  await browser.close()

  // The guard (see `guardOwnerRail`): the owner's persisted rail must survive. Two
  // writes are possible — OURS (the probe's seeded layout escaping to the host, the
  // incident this guard exists for) and the OWNER'S OWN client re-syncing while the
  // probe runs (its `savedAt` moves even when the layout is identical). Only the
  // first is a failure and a restore; the second is a note.
  const verdict = guardOwnerRail()
  if (verdict === 'removed') problems.push(`${STATE_FILE} was written by this run (the owner had none)`)
  else if (verdict === 'restored') problems.push(`${STATE_FILE} held THIS RUN's seeded layout and has been RESTORED from the snapshot`)
  else if (verdict === 'foreign') console.log('[live] note: the state file changed during the run, but it is not the probe\'s seeded layout — left untouched (the owner\'s own client re-syncing)')

  console.log(`[live] stopwatch tick: ${tick === null ? 'not exercised' : `${tick.s1}s → ${tick.s2}s`}`)
  console.log(`[live] shots: ${JSON.stringify(shots)} → ${OUT}`)
  if (problems.length > 0) {
    for (const p of problems) console.error(`[live] FAIL ${p}`)
    process.exit(1)
  }
  console.log('[live] PASS — 任务计时 / 秒表 / 倒计时 / 日历@2x4 all mount, fit, tick and answer their buttons')
})().catch((e) => { console.error('[live] SCRIPT_FAIL', e); process.exit(1) })
