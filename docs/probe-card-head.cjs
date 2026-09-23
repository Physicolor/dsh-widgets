/**
 * Card HEAD layout probe — 额度管理 / GPU 利用率 (docs/probe-card-head.cjs)
 *
 * Drives the REAL GUI (Playwright + a minted browser-session cookie) and reads
 * the two cards the user cares about straight out of the RESTING deck
 * (`.dsx-wave-deck …` — the magnify overlay carries stale copies of the same
 * cards, so an unscoped query reads the wrong one):
 *
 *   - 额度管理 (quota-manage): the big figure must sit BELOW the blue title
 *     (headAfter row) with the grey 账期 line to its RIGHT, sitting on the row's
 *     FLOOR so its bottom edge lines up with the figure's (the pool view name used
 *     to ride above it as a stacked block — it is gone now, so the pool view is
 *     identified by WALK POSITION rather than by a label); the title must
 *     not be ellipsized, and an unknown projection must NOT print 数据不足: it
 *     prints `-%` beside the real 账期 line;
 *   - GPU 利用率 (sys-gpu-line): the big utilization sits below the title with
 *     the grey `°C · GB` facts to its right, and the elastic sparkline still
 *     fits the card box exactly.
 *
 * The three pool views are reached by TAPPING the card (its own cycle) and every
 * view is read and screenshotted; the room's original widget state is written
 * back at the end.
 *
 * Usage: node docs/probe-card-head.cjs
 * Leaves: docs/probe-card-head-result.json + docs/probe-card-head-*.png
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))
const { mintCookie } = require('../scripts/diag-auth-lib.cjs')

const OUT = path.join(__dirname, 'probe-card-head-result.json')
const ORIGIN = process.env.DSH_ORIGIN ?? 'http://127.0.0.1:3080'
const AUTHORITY = ORIGIN.replace(/^https?:\/\//, '')
const FONT_CSS = `* { font-family: 'HarmonyOS Sans SC', 'HarmonyOS Sans', var(--dsw-font-family, sans-serif) !important; }`
/** The standard title → big-figure gap the cards must use (px at scale 1). */
const HEAD_GAP = 4
const VIEW_RE = /(AllUser|Physicolor|Sparxie)/

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}

/** Read one card's head structure by title text, in the RESTING deck. */
const READ_CARD = (titlePrefix) => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, right: Math.round(r.right * 10) / 10, bottom: Math.round(r.bottom * 10) / 10 } }
  const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card-slot .dsx-stats-card'))
  const card = cards.find((c) => {
    const t = c.querySelector('.dsx-stats-card-title')
    return t !== null && t.textContent.trim().startsWith(titlePrefix)
  })
  if (card === undefined) return null
  const title = card.querySelector('.dsx-stats-card-title')
  const titleSpan = title !== null ? title.querySelector('span') : null
  const ha = card.querySelector('.dsx-stats-card-headafter')
  const haSpans = ha !== null ? Array.from(ha.children) : []
  const bigSpan = ha !== null ? ha.querySelector('span') : null
  const lineSpans = ha !== null ? Array.from(ha.querySelectorAll('.dsx-stats-card-headafter-lines > span')) : []
  const greySpan = ha !== null && lineSpans.length === 0 ? haSpans.filter((s) => s !== bigSpan && s.textContent.trim() !== '')[0] ?? null : null
  const titleText = title !== null ? title.textContent.trim() : ''
  const titleOnly = titleSpan !== null ? titleSpan.textContent.trim() : ''
  const titleRowExtra = titleText.startsWith(titleOnly) ? titleText.slice(titleOnly.length).trim() : ''
  const valueEl = card.querySelector('.dsx-stats-card-value')
  const text = card.textContent.replace(/\s+/g, ' ').trim()
  const figures = /今日用量(—|[\d.]+[BMK]?)今日推荐(—|[\d.]+[BMK]?)/.exec(text)
  // The figures row's own box: the deepest node holding the "今日用量" label,
  // then its column (label + value) — that column's bottom is the card's floor.
  const figLabel = Array.from(card.querySelectorAll('div')).find((d) => d.children.length === 0 && d.textContent.trim() === '今日用量')
  const figCol = figLabel !== undefined ? figLabel.parentElement : null
  return {
    cls: card.className,
    text,
    skeleton: card.className.includes('dsx-sk-card'),
    slot: rect(card.parentElement),
    card: rect(card),
    title: { text: titleOnly, box: title !== null ? rect(title) : null, ellipsized: titleSpan !== null ? titleSpan.scrollWidth > titleSpan.clientWidth + 1 : null },
    titleRowExtra: titleRowExtra === '' ? null : titleRowExtra,
    headAfter: ha === null ? null : {
      box: rect(ha),
      big: bigSpan !== null ? bigSpan.textContent.trim() : null,
      bigBox: bigSpan !== null ? rect(bigSpan) : null,
      bigCls: bigSpan !== null ? bigSpan.className : null,
      lines: lineSpans.map((l) => ({ text: l.textContent.trim(), box: rect(l) })),
      small: greySpan !== null ? greySpan.textContent.trim() : null,
      smallBox: greySpan !== null ? rect(greySpan) : null,
      gapFromTitle: title !== null ? Math.round((ha.getBoundingClientRect().top - title.getBoundingClientRect().bottom) * 10) / 10 : null,
    },
    legend: card.querySelector('.dsx-stats-card-legend') ? card.querySelector('.dsx-stats-card-legend').textContent.trim() : null,
    bodyValue: valueEl !== null && (ha === null || !ha.contains(valueEl)) && (title === null || !title.contains(valueEl)) ? valueEl.textContent.trim() : null,
    figures: figures === null ? [] : [figures[1], figures[2]],
    figuresBox: figCol !== null ? rect(figCol) : null,
    svg: card.querySelectorAll('svg').length,
    // Sparkline geometry (the elastic line chart): the plotted polyline's screen
    // bbox vs the box that clips it, and the time-label row's bottom.
    line: (() => {
      const svg = card.querySelector('svg')
      const poly = card.querySelector('polyline')
      if (svg === null) return null
      const sb = svg.getBoundingClientRect()
      const row = svg.parentElement !== null ? svg.parentElement.parentElement : null
      const label = row !== null ? row.lastElementChild : null
      const out = { svgTop: Math.round(sb.top * 10) / 10, svgBottom: Math.round(sb.bottom * 10) / 10, polyTop: null, polyBottom: null, labelBottom: null, stroke: null }
      if (poly !== null) {
        const bb = poly.getBBox()
        out.polyTop = Math.round((sb.top + (bb.y / 100) * sb.height) * 10) / 10
        out.polyBottom = Math.round((sb.top + ((bb.y + bb.height) / 100) * sb.height) * 10) / 10
        out.stroke = getComputedStyle(poly).strokeWidth
      }
      if (label !== null && label !== svg.parentElement) out.labelBottom = Math.round(label.getBoundingClientRect().bottom * 10) / 10
      return out
    })(),
  }
}

/** The grey text wherever the layout puts it (headAfter lines / small / legend). */
const greyTexts = (card) => {
  const ha = card.headAfter
  if (ha !== null) {
    if (ha.lines.length > 0) return ha.lines.map((l) => l.text)
    if (ha.small !== null) return [ha.small]
  }
  return card.legend !== null ? [card.legend] : []
}
/** The big figure wherever the layout puts it (headAfter row or title-row right slot). */
const bigOf = (card) => card.headAfter?.big ?? card.titleRowExtra ?? card.bodyValue
/** This card's pool view, read from whichever line carries it. The 额度管理 head no
 *  longer prints a view name at all (removed 2026-09-20: the stacked `AllUser` +
 *  账期 block was rejected), so this returns null for that card and its views are
 *  identified by WALK POSITION instead. It still resolves the `Key N` fallback the
 *  host uses when a member's whoami did not answer. Null when the card prints no
 *  view line at all. */
const viewOf = (card) => (VIEW_RE.exec(card.text) ?? [null, null])[1]
const labelOf = (card, pool) => {
  const first = greyTexts(card)[0] ?? null
  if (first === null) return null
  if (pool.includes(first)) return first
  const key = /^Key (\d+)$/.exec(first)
  return key !== null ? (pool[Number(key[1])] ?? null) : null
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/12404/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1578, height: 1000 }, deviceScaleFactor: 2 })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()

  const stateRes = await page.request.get(`${ORIGIN}/api/widgets-state`)
  const savedState = await stateRes.json()
  console.log(`saved state: savedAt=${savedState?.savedAt} quota ccView=${JSON.stringify(savedState?.state?.cardConfigs?.['quota-manage@2x2']?.ccView ?? null)}`)

  // Declared OUTSIDE the try: the report in `finally` still needs whatever views
  // the walk managed to read before any failure.
  const seen = new Map()
  let gpu = null

  try {
  await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 45000 })
  // The rail lives inside a live session's composer seat, so a session must be
  // open first: wait for the session list, open one, then wait for the composer.
  await page.waitForSelector('[class$="_sessionRow"]', { timeout: 45000 }).catch(() => {})
  const row = page.locator('[class$="_sessionRow"]').first()
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4500) }
  await page.waitForSelector('button.dsx-stats-capsule', { timeout: 30000 }).catch(() => {})
  const cap = page.locator('button.dsx-stats-capsule').first()
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    if (!(await cap.count())) { await page.waitForTimeout(1000); continue }
    await cap.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(900)
  }
  // Wait until the 额度管理 card has the ACCOUNT PAYLOAD (the 账期 line only
  // exists once a period is known — the card renders `-%` + the view name while
  // the eight-endpoint host route is still in flight). The route fans out to
  // eight upstream endpoints and the API is rate-limited (this probe shares it
  // with the agent's own traffic), so a reload is retried before giving up.
  const waitForPayload = async (label) => {
    for (let i = 0; i < 150; i++) {
      const ok = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card'))
        const q = cards.find((c) => { const t = c.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('额') })
        return q !== undefined && !q.className.includes('dsx-sk-card') && (q.textContent || '').includes('账期')
      })
      if (ok) return true
      await page.waitForTimeout(400)
    }
    console.log(`  (${label}: no 账期 line after 60s — an incomplete upstream payload)`)
    return false
  }
  let ready = await waitForPayload('attempt 1')
  for (let attempt = 2; !ready && attempt <= 3; attempt++) {
    await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {})
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4000) }
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
      if (!(await cap.count())) { await page.waitForTimeout(1000); continue }
      await cap.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(900)
    }
    ready = await waitForPayload(`attempt ${attempt}`)
  }
  check('the 额度管理 card loaded the account payload (账期 line present)', ready, ready ? 'loaded' : 'no 账期 line after 3 attempts')
  await page.waitForTimeout(800)
  await page.addStyleTag({ content: FONT_CSS })

  const shot = async (name) => { await page.screenshot({ path: path.join(__dirname, `probe-card-head-${name}.png`) }) }
  const readQuota = () => page.evaluate(READ_CARD, '额')
  const readGpu = () => page.evaluate(READ_CARD, 'GPU')

  // ---- walk the pool cycle with real taps ----
  // The view order is the host's own pool order: [AllUser, ...account labels].
  // A tap advances exactly one step, so each read is labelled by its position in
  // that cycle — which is also how a view whose text cannot name itself (the
  // 数据不足 state prints no view label at all) is still identified.
  const payload = await (await page.request.get(`${ORIGIN}/api/commandcode-usage`)).json()
  const pool = ['AllUser', ...(Array.isArray(payload?.keys) ? payload.keys.map((k) => k.label) : [])]
  // The starting view is read from the CARD, not from the state file: a person
  // (or another probe) may have tapped the instance since it was saved. `cursor`
  // is the index into `pool` of the view the card is SHOWING right now.
  const shownNow = viewOf(await readQuota())
  const savedView = savedState?.state?.cardConfigs?.['quota-manage@2x2']?.ccView ?? 'AllUser'
  const startView = shownNow !== null && pool.indexOf(shownNow) >= 0 ? shownNow : savedView
  let cursor = Math.max(0, pool.indexOf(startView))
  console.log(`host pool: ${pool.join(' → ')} (card is showing ${pool[cursor]})\n`)

  let quota = await readQuota()
  check('额度管理 card is in the rail (resting deck)', quota !== null, quota ? quota.text.slice(0, 70) : 'not found')
  const gpu0 = await readGpu()
  check('GPU 利用率 card is in the rail (resting deck)', gpu0 !== null, gpu0 ? gpu0.text.slice(0, 70) : 'not found')
  // Not `process.exit` here: that would skip the `finally` that restores the
  // room's state and writes the report.
  if (quota === null || gpu0 === null) throw new Error(`card not readable in the resting deck (quota=${quota !== null}, gpu=${gpu0 !== null})`)
  await shot('before-quota')
  await shot('before-gpu')

  /** Walk the pool cycle with real taps, one read per view.
   *
   *  A tap PERSISTS the instance's view, so a second walk (the retry below)
   *  starts where the first one left off — `cursor` tracks that, or every label
   *  would be off by the number of taps. */
  const walk = async () => {
    const out = new Map()
    for (let step = 0; step < pool.length; step++) {
      const snap = await readQuota()
      // Identify each read by the card's OWN view line, falling back to the
      // cycle position only when the card prints no view line (no payload yet).
      const named = labelOf(snap, pool)
      const byPosition = pool[(cursor + step) % pool.length]
      const label = named ?? byPosition
      out.set(label, snap)
      console.log(`view ${step + 1}=${label}${named === null ? ` (prints no view line; position says ${byPosition})` : named !== byPosition ? ` (drifted from the cycle position ${byPosition})` : ''}: big=${JSON.stringify(bigOf(snap))} grey=${JSON.stringify(greyTexts(snap))} figures=${JSON.stringify(snap.figures)}`)
      await shot(`quota-${label}`)
      if (step < pool.length - 1) {
        const box = snap.slot
        await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2)
        await page.waitForTimeout(1100)
      }
    }
    cursor = (cursor + pool.length - 1) % pool.length
    return out
  }
  let walked = await walk()
  // A view whose PERIOD is missing is usually an upstream miss at page-load time
  // (the host route fetches each endpoint independently and the API is
  // rate-limited). Reload once and re-walk before treating it as a defect — the
  // second walk is what the assertions judge.
  if ([...walked].some(([, card]) => !greyTexts(card).some((g) => /账期/.test(g)))) {
    console.log('\n(a view came back without a period — reloading once to rule out an upstream miss)\n')
    const back = await page.request.get(`${ORIGIN}/api/widgets-state`)
    if (back.ok()) await page.request.put(`${ORIGIN}/api/widgets-state`, { data: savedState }).catch(() => {})
    await page.goto(ORIGIN, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {})
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4000) }
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
      if (!(await cap.count())) { await page.waitForTimeout(1000); continue }
      await cap.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(900)
    }
    for (let i = 0; i < 100; i++) {
      const r2 = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card'))
        const q = cards.find((c) => { const t = c.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('额') })
        return q !== undefined && !q.className.includes('dsx-sk-card') && (q.textContent || '').includes('账期')
      })
      if (r2) break
      await page.waitForTimeout(400)
    }
    await page.addStyleTag({ content: FONT_CSS })
    walked = await walk()
  }
  for (const [k, v] of walked) seen.set(k, v)
  // A tap can land while the card is mid-render and be swallowed, which would
  // leave one view unread; one more walk fills the gap instead of crashing the
  // assertions below on an undefined entry.
  if (pool.some((l) => !seen.has(l))) {
    console.log(`  (missing reads for ${pool.filter((l) => !seen.has(l)).join(', ')} — walking once more)`)
    for (const [k, v] of await walk()) if (!seen.has(k)) seen.set(k, v)
  }
  check('all pool views were captured by the walk', pool.every((l) => seen.has(l)), [...seen.keys()].join(' / '))
  // The GPU card's own source (/api/sysinfo) is polled on its own interval AND
  // the payload retry above may have reloaded the page — so wait for its
  // sparkline before reading it, or a loading skeleton gets measured as "no line".
  for (let i = 0; i < 100; i++) {
    const ok = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.dsx-wave-deck .dsx-stats-card'))
      const c = cards.find((x) => { const t = x.querySelector('.dsx-stats-card-title'); return t !== null && t.textContent.trim().startsWith('GPU') })
      return c !== undefined && c.querySelector('svg') !== null
    })
    if (ok) break
    await page.waitForTimeout(400)
  }
  gpu = await readGpu()
  await shot('gpu')

  const allUser = seen.get('AllUser')
  const physicolor = seen.get('Physicolor')
  const sparxie = seen.get('Sparxie')
  check('all pool views are reachable by tapping', seen.size === pool.length, [...seen.keys()].join(' / '))
  check('tapping changes the rendered figures', allUser !== undefined && sparxie !== undefined && allUser.text !== sparxie.text,
    `${allUser?.text.slice(0, 40)} vs ${sparxie?.text.slice(0, 40)}`)
  check('every read names its view, or is the view that prints no name at all',
    pool.every((label) => viewOf(seen.get(label)) === null || viewOf(seen.get(label)) === label || /^Key \d$/.test(String(viewOf(seen.get(label))))),
    pool.map((l) => `${l}:${viewOf(seen.get(l))}`).join(' '))

  // ---- the head contract the user asked for ----
  const headContract = (card, label) => {
    if (card === undefined) { check(`${label}: the view was captured`, false, 'no read for this view'); return }
    const ha = card.headAfter
    check(`${label}: the big figure sits BELOW the title (headAfter row)`, ha !== null && ha.big !== null,
      ha === null ? `no headAfter row (big is at ${JSON.stringify(bigOf(card))})` : `big=${ha.big} gap=${ha.gapFromTitle}px`)
    if (ha === null) return
    check(`${label}: the big figure is NOT in the title row`, card.titleRowExtra === null, JSON.stringify(card.titleRowExtra))
    check(`${label}: the title is not ellipsized`, card.title.ellipsized === false, `title=${card.title.text} ellipsized=${card.title.ellipsized}`)
    check(`${label}: standard ${HEAD_GAP}px gap between the title and the big figure`, ha.gapFromTitle !== null && Math.abs(ha.gapFromTitle - HEAD_GAP) <= 1.5, `gap=${ha.gapFromTitle}px`)
    const grey = greyTexts(card)
    const first = ha.lines.length > 0 ? ha.lines[0].box : ha.smallBox
    check(`${label}: the grey subtitle sits to the RIGHT of the big figure`, grey.length > 0 && first !== null && ha.bigBox !== null && first.x >= ha.bigBox.right - 1,
      grey.length === 0 ? 'no grey text' : `big right=${ha.bigBox.right} grey x=${first.x}`)
    check(`${label}: the body does not repeat the big figure`, card.bodyValue === null, JSON.stringify(card.bodyValue))
  }
  headContract(allUser, 'quota-manage/AllUser')
  headContract(gpu, 'sys-gpu-line')

  // ---- quota-manage across the pool views ----
  // The head carries the 账期 line ALONE (the pool view name was removed at the
  // user's request — two stacked grey lines were "不好看"), so the view is
  // identified by WHERE THE WALK IS, and what the head must show is the period,
  // bottom-aligned on the figure's row.
  check('the pool view name is no longer printed on the card',
    pool.every((label) => viewOf(seen.get(label)) === null),
    pool.map((l) => `${l}:${viewOf(seen.get(l))}`).join(' '))
  for (const [view, card] of seen) {
    const grey = greyTexts(card)
    check(`ccView=${view}: the head prints exactly ONE grey line, the 账期 line`,
      grey.length === 1 && /^账期 \d{1,2}-\d{1,2}$/.test(grey[0]), JSON.stringify(grey))
    check(`ccView=${view}: no stacked grey block is rendered`,
      card.headAfter !== null && card.headAfter.lines.length === 0, JSON.stringify(card.headAfter?.lines?.map((l) => l.text) ?? null))
  }
  // The line's BOTTOM edge must line up with the figure's (align-items: flex-end):
  // both boxes ride the same flex row, so their bottoms differ by ~0 once the line
  // is dropped to the floor (a baseline-aligned line sat ~2px higher).
  for (const [view, card] of seen) {
    const ha = card.headAfter
    const delta = ha === null || ha.smallBox === null || ha.bigBox === null ? null : Math.round((ha.smallBox.bottom - ha.bigBox.bottom) * 10) / 10
    check(`ccView=${view}: the 账期 line's bottom edge lines up with the big figure's`,
      delta !== null && Math.abs(delta) <= 2.5,
      `Δ=${delta}px (figure bottom ${ha?.bigBox?.bottom}, 账期 bottom ${ha?.smallBox?.bottom})`)
  }
  // The token figures keep the card's floor, not the space right under the head.
  for (const [view, card] of seen) {
    const innerPad = Math.round(12 * (card.slot.w / 150))
    const floorGap = card.figuresBox === null ? null : Math.round(card.card.bottom - card.figuresBox.bottom)
    check(`ccView=${view}: the two token figures sit on the card's floor`,
      floorGap !== null && Math.abs(floorGap - innerPad) <= 3,
      `figures bottom → card bottom = ${floorGap}px (inner pad ${innerPad}px)`)
    check(`ccView=${view}: the head does not crowd the figures`, card.headAfter !== null && card.figuresBox !== null && card.headAfter.box.bottom <= card.figuresBox.y - 12,
      `head bottom ${card.headAfter?.box.bottom} vs figures top ${card.figuresBox?.y}`)
  }
  // The host route fetches each member's four endpoints independently, so ONE
  // member can come back with a slice missing (a transient upstream miss — the
  // API is rate-limited and this probe shares it with the agent's own traffic).
  // That is not a layout defect: the period assertion then records the upstream
  // state instead of blaming the card. The check re-reads the HOST payload and
  // looks at the member at the SAME POOL POSITION (its label can fall back to
  // `Key N`, so the text is not a reliable key), which keeps a genuine
  // regression — the host returning complete data while the card drops the
  // period — failing loudly.
  // Re-read the host payload for the upstream-miss test below. The host fans this
  // out to eight upstream endpoints, so one request can be RESET under load
  // (measured 2026-09-20: an ECONNRESET here crashed the probe after 40 passing
  // assertions and skipped the state restore). Retry it, and never let a probe
  // failure leave the room's own layout changed — the restore lives in `finally`.
  const fetchJson = async (route, tries = 3) => {
    for (let i = 0; i < tries; i++) {
      try {
        const r = await page.request.get(`${ORIGIN}${route}`)
        if (r.ok()) return await r.json()
      } catch (err) { console.log(`  (${route}: ${err.message} — retrying)`) }
      await page.waitForTimeout(1500)
    }
    return null
  }
  const fresh = await fetchJson('/api/commandcode-usage')
  const freshMembers = Array.isArray(fresh?.keys) ? fresh.keys : []
  const upstreamMiss = (view) => {
    if (view === 'AllUser') return false
    const entry = freshMembers[pool.indexOf(view)]
    if (entry === undefined) return false
    return entry.data === null || entry.data === undefined || entry.data.subscription === null || entry.data.credits === null
  }
  for (const [view, card] of seen) {
    check(`ccView=${view}: 数据不足 is NEVER printed`, !card.text.includes('数据不足'), card.text.slice(0, 70))
    const hasPeriod = greyTexts(card).some((g) => /账期 \d{1,2}-\d{1,2}/.test(g))
    const miss = !hasPeriod && upstreamMiss(view)
    check(`ccView=${view}: the 账期 line is present`, hasPeriod || miss,
      hasPeriod ? JSON.stringify(greyTexts(card)) : miss ? `upstream miss for ${view} in this fetch (${JSON.stringify(greyTexts(card))}) — not a layout defect` : JSON.stringify(greyTexts(card)))
    check(`ccView=${view}: the big figure is a percent or -%`, /^(\d+(\.\d+)?%|-%|—)$/.test(String(bigOf(card))), String(bigOf(card)))
    check(`ccView=${view}: both token figures are present (real number or —)`, card.figures.length === 2 && card.figures.every((f) => /^(—|[\d.]+[BMK]?)$/.test(f)), JSON.stringify(card.figures))
  }
  check('the second-key view (Sparxie) still shows a real period',
    sparxie !== undefined && !sparxie.text.includes('数据不足')
      && (greyTexts(sparxie).some((g) => /账期/.test(g)) || upstreamMiss('Sparxie')),
    `${bigOf(sparxie)} | ${JSON.stringify(greyTexts(sparxie))}`)

  // ---- sys-gpu-line keeps its elastic sparkline ----
  check('sys-gpu-line: the sparkline is still drawn', gpu.svg > 0, `svg=${gpu.svg}`)
  check('sys-gpu-line: the card does not burst its slot', Math.abs(gpu.card.h - gpu.slot.h) <= 1, `card ${gpu.card.h} vs slot ${gpu.slot.h}`)
  // A 0% sample (an idle GPU) must not ride the plot box's edge: measured
  // 2026-09-20 before the fix, the polyline's bottom EQUALLED the svg box's
  // bottom (754.0 = 754.0) and `overflow: hidden` cut its lower half-stroke.
  check('sys-gpu-line: the whole sparkline stroke stays inside the plot box',
    gpu.line !== null && gpu.line.polyTop !== null && gpu.line.polyBottom !== null
      && gpu.line.polyTop >= gpu.line.svgTop + 1 && gpu.line.polyBottom <= gpu.line.svgBottom - 1,
    gpu.line === null ? 'no line chart' : `polyline ${gpu.line.polyTop}…${gpu.line.polyBottom} inside svg ${gpu.line.svgTop}…${gpu.line.svgBottom} (stroke ${gpu.line.stroke})`)
  check('sys-gpu-line: the time labels stay inside the card padding',
    gpu.line !== null && gpu.line.labelBottom !== null && gpu.line.labelBottom <= gpu.card.bottom - Math.round(12 * (gpu.slot.w / 150)) + 1,
    `labels bottom ${gpu.line?.labelBottom} vs card floor ${gpu.card.bottom - Math.round(12 * (gpu.slot.w / 150))}`)

  } finally {
  // ---- leave the room's own state as it was ----
  // In `finally`: the walk PERSISTS each tap, so a crash mid-probe (a reset
  // upstream call, a closed browser) must still hand the room its own ccView back.
  // Retried, with the host's own error text logged — a silent 400 here would strand
  // the room on the probe's last tapped view.
  let restore = null
  for (let i = 0; i < 3 && (restore === null || !restore.ok()); i++) {
    restore = await page.request.put(`${ORIGIN}/api/widgets-state`, { data: savedState }).catch(() => null)
    if (restore === null || !restore.ok()) {
      const body = restore === null ? 'no response' : await restore.text().catch(() => '')
      console.log(`  (state restore attempt ${i + 1}: ${restore === null ? 'no response' : restore.status()} ${body.slice(0, 140)})`)
      await page.waitForTimeout(1200)
    }
  }
  check('the room\'s original widget state was written back', restore !== null && restore.ok(), restore === null ? 'PUT failed' : `PUT ${restore.status()}`)

  fs.writeFileSync(OUT, `${JSON.stringify({
    probedAt: new Date().toISOString(),
    origin: ORIGIN,
    views: [...seen].map(([view, c]) => ({
      view,
      big: bigOf(c),
      grey: greyTexts(c),
      lines: c.headAfter?.lines.map((l) => l.text) ?? null,
      figures: c.figures,
      title: c.title.text,
      titleRowExtra: c.titleRowExtra,
      text: c.text,
      gapFromTitle: c.headAfter?.gapFromTitle ?? null,
    })),
    gpu: gpu === null ? null : { big: bigOf(gpu), grey: greyTexts(gpu), svg: gpu.svg, cardH: gpu.card.h, slotH: gpu.slot.h },
    results,
    failed: results.filter((r) => !r.ok).length,
  }, null, 2)}\n`, 'utf8')
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions)  -> ${path.basename(OUT)}`)
  await browser.close()
  process.exit(failed === 0 ? 0 : 1)
  }
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })
