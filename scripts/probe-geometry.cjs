/**
 * dsh-widgets — the batched geometry probe: ONE browser, every "does it fit" question.
 *
 * Replaces three separate one-issue probes that each cold-launched their own
 * Chromium (`diag-text-fit.cjs`, `diag-card-fit.cjs`, and the geometry half of
 * `diag-width-overlap.cjs`). The audit measured ~1.5s of pure launch overhead per
 * process, so asking three related questions used to cost three launches and three
 * gallery builds. Here they share one browser and one gallery page.
 *
 * The three questions are the same defect class seen from three sides:
 *
 *   COPY    a display name its own card cannot print in full (the owner's rule,
 *           2026-09-29, after 缓存命中 → 缓存命中率 ellipsized to 「缓存命...」).
 *   TILE    a card that grows out of its grid row, or is pinned to its tile and
 *           clips its own content (`data-dsx-overflow`, the red inset outline).
 *   WIDTH   the conversation width handle landing on the turn navigator.
 *
 *   PHASE 1  the offline gallery — EVERY widget × size × preview state, so a card
 *            the owner has not installed is still checked (offline, always runs).
 *   PHASE 2  the live rail — the INSTALLED cards and the 组件配置 list, in the
 *            narrower boxes the owner actually sees. SKIPPED, not failed, when
 *            nothing is listening on the live authority (stop-loss in code).
 *
 * Usage: node scripts/probe-geometry.cjs [--live-only] [--gallery-only] [--json]
 */
const { ROOT, close, galleryPage, liveAvailable, liveContext, report, AUTHORITY, GALLERY_PAGE, browser } = require('./lib/probe-harness.cjs')
const { existsSync } = require('node:fs')
const { dirname, join } = require('node:path')

/** Text nodes whose overflow means "the card cannot print this". */
const COPY_SELECTOR = [
  '.dsx-stats-card-title',      // the blue title (usually the widget's display name)
  '.dsx-stats-card-value',
  '.dsx-stats-card-sub',
  '.dsx-stats-card-legend',
  '.dsx-stats-card-headafter',
  '.dsx-stats-card-meter',
  '.dsx-order-row span',        // the 组件配置 list rows (same copy, narrower box)
].join(', ')

/**
 * Truncations that are the SPEC's design, not a defect: a value the widget cannot
 * know the length of. Anything not listed here is copy the card owes the reader in
 * full. Carried over verbatim from `diag-text-fit.cjs` so no verdict was lost.
 */
const DATA_TRUNCATION_OK = [
  {
    widget: 'session-cost',
    contains: 'deepseek-v4.1-flash',
    why: 'the model id is data — `shortModelName` strips the provider path and the spec asks for a truncated name (pricing.ts)',
  },
  {
    widget: 'github-notify',
    contains: 'dsh-widgets',
    why: 'the repo name is data — the newest thread is printed as repo · reason and a repo can be any length',
  },
]

const argv = process.argv.slice(2)
const LIVE_ONLY = argv.includes('--live-only')
const GALLERY_ONLY = argv.includes('--gallery-only')
const AS_JSON = argv.includes('--json')

/** Every COPY node in this page that overflows its own box. */
const scanCopy = (page) => page.evaluate((sel) => {
  const out = []
  for (const el of Array.from(document.querySelectorAll(sel))) {
    if (el.children.length > 0 && (el.textContent ?? '').trim() === '') continue
    const text = (el.textContent ?? '').trim()
    if (text === '') continue
    const over = el.scrollWidth - el.clientWidth
    if (over <= 1) continue
    const cell = el.closest('.g-cell')
    const card = el.closest('.dsx-stats-card')
    out.push({
      text,
      over,
      clientW: el.clientWidth,
      cls: String(el.className).slice(0, 40),
      where: cell
        ? `${cell.getAttribute('data-widget')}@${cell.getAttribute('data-size')}#${cell.getAttribute('data-step')}`
        : card ? (card.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim() : (el.closest('.dsx-order-row') ? 'list row' : '?'),
    })
  }
  return out
}, COPY_SELECTOR)

/** Every card in the page, with the numbers that decide whether it fits. */
const scanTiles = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.dsx-stats-card')).map((card) => {
  const slot = card.closest('.dsx-stats-card-slot')
  const cell = card.closest('.g-cell')
  const tag = cell
    ? `${cell.getAttribute('data-widget')}@${cell.getAttribute('data-size')}#${cell.getAttribute('data-step')}`
    : ((card.querySelector('.dsx-stats-card-title')?.textContent ?? '').trim() || '?')
  const box = card.getBoundingClientRect()
  return {
    tag,
    unit: slot ? Math.round(parseFloat(slot.style.width)) : Math.round(box.width),
    boxH: Math.round(box.height * 10) / 10,
    clientH: card.clientHeight,
    scrollH: card.scrollHeight,
    overflow: card.getAttribute('data-dsx-overflow') === '1',
  }
}))

const countCopyNodes = (page) => page.evaluate((sel) => document.querySelectorAll(sel).length, COPY_SELECTOR)

/**
 * BODY POSTURE — how much empty tile a 2×4 card leaves UNDER its content.
 *
 * WHY THIS EXISTS (2026-10-14, owner report): the 任务计时 2×4 shipped with its four
 * figures hugging the head and ~80px of dead tile below them, and every gate in the
 * repo passed it — G4 compares the render's DATA (which was exactly what the spec
 * asked for), this probe only asked "does it overflow / is the copy clipped", and
 * the independent review read the spec's own "same family as harness-board" claim
 * as licence for the top-aligned posture. Nothing anywhere measured the shape.
 *
 * THE RULE (docs/design/CARD-BODY-POSTURE.md): a 2×4 whose body is ONE row of
 * content must sit on the card's floor (`bodyAnchor: 'bottom'` — the 会话概览
 * posture). A multi-row body may start under the head; its rows then fill the tile.
 * The measurement is the deepest CONTENT-BEARING LEAF's bottom against the card's
 * content floor, which is exactly the empty band the eye sees.
 */
const POSTURE_LIMIT = 36
/** 2×4 cards whose empty band is the design, with the reason. Anything not listed
 *  must sit within POSTURE_LIMIT·scale of the floor. */
const POSTURE_OK = [
  // (none yet — every shipped 2×4 is bottom-anchored or fills its tile)
]

/**
 * Inner clipping that is the SOURCE's doing, not the card's (see `scanInnerFit`).
 *
 * Registered per widget id with a reason, like `DATA_TRUNCATION_OK`. The first entry
 * is a FINDING, not a design: the `figures` chart lays its row out with a fixed
 * gap and lets a two-label row exceed a narrow card, so 额度预测's synthetic twin in
 * the head-ladder fixture clips 11–15px at 150/190. It predates this task (the
 * fixture card is hand-written in `scripts/preview/gallery.mjs`) and no shipped
 * widget was caught by the same walk — reported to the owner rather than fixed here.
 */
const INNER_FIT_OK = [
  // The token BARS card's axis labels sit 3.5–8.4px into the card's bottom padding on
  // two of its preview states. Pre-existing (found 2026-10-14 by this walk), visible
  // in the gallery as labels closer to the card's edge than the rest of the rail —
  // reported to the owner rather than fixed inside the timer task.
  { variant: 'heatmap-bars', why: 'pre-existing: the bars chart\'s axis labels bleed 3.5–8.4px into the card\'s bottom padding (found 2026-10-14 by this walk; reported, not this task\'s scope)' },
  { variant: 'clock', why: 'pre-existing: the digital clock\'s `09:36:42` reading is 4.1px wider than the card\'s content column at the 150px side (found 2026-10-14 by this walk; the fix is a 2px smaller figure — reported, not this task\'s scope)' },
]

/** The registered exception for one inner-fit finding, if any. */
const innerFitException = (b) => INNER_FIT_OK.find((e) => (e.variant === undefined || b.tag.startsWith(e.variant)) && (e.textIncludes === undefined || b.text.includes(e.textIncludes)))

/** The empty band under each 2×4 card's content, in px at the card's own scale. */
const scanPosture = (page, limitPx) => page.evaluate((limit) => {
  const out = []
  for (const card of document.querySelectorAll('.dsx-stats-card')) {
    const cell = card.closest('.g-cell')
    const size = cell ? cell.getAttribute('data-size') : null
    if (size !== '2x4') continue
    const slot = card.closest('.dsx-stats-card-slot')
    // The TILE side, not the cell width: a 2×4 cell is `2·unit + gap` wide, so
    // reading `style.width` here would double the scale and (with it) the limit.
    // The card's own height IS the tile side at every size.
    const unit = Math.round(card.getBoundingClientRect().height) || (slot ? Math.round(parseFloat(slot.style.width)) : 150)
    const scale = unit / 150
    const pad = Math.round(12 * scale)
    const cardBox = card.getBoundingClientRect()
    let deepest = -Infinity
    for (const el of card.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase()
      const graphic = tag === 'svg' || tag === 'img' || tag === 'canvas'
      // CONTENT leaves only: a stretched flex container's own box ends at the card's
      // floor by construction, so measuring one would always report an empty band.
      if (!graphic && el.children.length > 0) continue
      const cs = getComputedStyle(el)
      if (cs.position === 'absolute' || cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue
      if (!graphic && (el.textContent ?? '').trim() === '') continue
      const bottom = el.getBoundingClientRect().bottom
      if (bottom > deepest) deepest = bottom
    }
    out.push({
      tag: cell ? `${cell.getAttribute('data-widget')}@${size}#${cell.getAttribute('data-step')}` : 'live-2x4',
      unit,
      gap: deepest === -Infinity ? null : Math.round((cardBox.bottom - pad - deepest) * 10) / 10,
      limit: Math.round(limit * scale),
    })
  }
  return out
}, limitPx)

/** Ask the two fit questions of one page; returns the metrics for the report. */
async function judgePage(page, r, label) {
  const nodes = await countCopyNodes(page)
  r.check(nodes > 20, `${label}: text nodes were found to check`, nodes)
  const clipped = await scanCopy(page)
  let allowed = 0
  for (const b of clipped) {
    const exception = DATA_TRUNCATION_OK.find((e) => b.where.startsWith(e.widget) && b.text.includes(e.contains))
    if (exception !== undefined) {
      allowed++
      r.allowed(`"${b.text}" in ${b.where}`, exception.why)
      continue
    }
    r.check(false, `${label}: copy is ellipsized — "${b.text}" (${b.over}px past its ${b.clientW}px box, ${b.cls})`, b.where)
  }
  if (clipped.length - allowed === 0) {
    r.check(true, `${label}: no card COPY is ellipsized`, `${clipped.length} clipped, ${allowed} data-driven exception(s)`)
  }

  const tiles = await scanTiles(page)
  r.check(tiles.length > 0, `${label}: rendered cards`, tiles.length)
  const bad = tiles.filter((c) => c.overflow || c.clientH > c.unit + 1 || c.scrollH > c.clientH + 1)
  for (const c of bad) {
    r.check(!c.overflow, `${label} ${c.tag}: no tile-fits outline`)
    r.check(c.clientH <= c.unit + 1, `${label} ${c.tag}: height = the tile`, `${c.clientH} <= ${c.unit}`)
    r.check(c.scrollH <= c.clientH + 1, `${label} ${c.tag}: nothing clipped`, `scroll ${c.scrollH} <= client ${c.clientH}`)
  }
  if (bad.length === 0) r.check(true, `${label}: every card fits its tile`, `${tiles.length} card(s)`)

  // POSTURE — see scanPosture: a 2×4 must not park its content at the top and leave
  // an empty band under it (the 任务计时 defect the other checks could not see).
  const posture = await scanPosture(page, POSTURE_LIMIT)
  const sloppy = posture.filter((p) => p.gap !== null && p.gap > p.limit && !POSTURE_OK.some((e) => p.tag.startsWith(e.widget)))
  for (const p of sloppy) {
    r.check(false, `${label} ${p.tag}: 2×4 content floats — ${p.gap}px of empty tile under it (limit ${p.limit}px; use bodyAnchor:'bottom', see docs/design/CARD-BODY-POSTURE.md)`, p.tag)
  }
  if (posture.length === 0) r.allowed(`${label}: no 2×4 card on this page to posture-check`, 'nothing to measure')
  else if (sloppy.length === 0) {
    const worst = posture.reduce((a, b) => ((b.gap ?? 0) > (a.gap ?? 0) ? b : a))
    r.check(true, `${label}: every 2×4 body sits on the floor`, `${posture.length} card(s), worst ${worst.gap}px ≤ ${worst.limit}px (${worst.tag})`)
  }

      // INNER FIT — nothing inside a card may poke out of it (see `scanInnerFit`).
      const fit = await judgeInnerFit(page, r, label)
      // TIMER LAYOUT — the dial's reference geometry, measured (see `scanTimerLayout`).
      await judgeTimerLayout(page, r, label)

  return { copyNodes: nodes, clipped: clipped.length - allowed, cards: tiles.length, misfit: bad.length, posture: posture.length, sloppy: sloppy.length, innerFit: fit.bad.length, details: bad }
}

/** Open the live rail the way the owner does: pick a session, then the capsule. */
async function openLiveRail(page) {
  await page.goto(`http://${AUTHORITY}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  const row = page.locator('[class$="_sessionRow"]').first()
  await row.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  for (let i = 0; i < 2; i++) {
    if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(4500) }
    const cap = page.locator('button.dsx-stats-capsule').first()
    for (let k = 0; k < 6; k++) {
      if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
      if (!(await cap.count())) { await page.waitForTimeout(900); continue }
      if (await cap.getAttribute('aria-disabled')) break
      await cap.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(700)
    }
    if (await page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))) break
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
    await page.waitForTimeout(2500)
  }
  await page.waitForTimeout(1500)
  // The 组件配置 list carries the same names in a narrower column: open it too.
  await page.evaluate(() => { const b = document.querySelector('.dsx-stats-add'); if (b) b.click() })
  await page.waitForTimeout(1500)
  return page.evaluate(() => !!document.querySelector('.dsx-stats-rail'))
}

/**
 * INNER FIT — content that pokes out of the card that holds it.
 *
 * WHY THIS EXISTS (2026-10-14, owner report): the 秒表's dial hard-coded its two
 * discs and its reading against the 150px card's content column — exactly that
 * column, zero slack — so at the market preview's 285px stage the rounding went the
 * other way and BOTH were clipped by the card's padding. Every existing check missed
 * it: the COPY scan only looks at the named text nodes (`.dsx-stats-card-title`,
 * `-value`, `-sub`, …), the tile check only asks whether the CARD overflows the grid
 * row, and the gallery only ever rendered 150px cards. This walk is per-element, on
 * every card of whatever page it is given — the fixture page renders at 150/190/285
 * for exactly this reason.
 */
const scanInnerFit = (page) => page.evaluate(() => {
  const out = []
  const cards = document.querySelectorAll('.dsx-stats-card')
  for (const card of cards) {
    const cell = card.closest('.g-cell')
    const hcell = card.closest('.h-cell')
    const tag = cell
      ? `${cell.getAttribute('data-widget')}@${cell.getAttribute('data-size')}#${cell.getAttribute('data-step')}`
      : hcell ? `${hcell.getAttribute('data-variant')}@${hcell.getAttribute('data-unit')}` : 'live'
    const box = card.getBoundingClientRect()
    const cs = getComputedStyle(card)
    const inner = {
      left: box.left + parseFloat(cs.paddingLeft),
      right: box.right - parseFloat(cs.paddingRight),
      top: box.top + parseFloat(cs.paddingTop),
      bottom: box.bottom - parseFloat(cs.paddingBottom),
    }
    for (const el of card.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      // Absolutely-positioned decorations (the corner button, the resize handle) are
      // placed ON PURPOSE outside the flow; they are not clipped content.
      if (s.position === 'absolute' || s.position === 'fixed' || s.display === 'none' || s.visibility === 'hidden') continue
      // CONTENT only: a layout container may carry padding/line-height past its
      // children without a single pixel of ink out there (the figures row's box
      // overhangs by 11px on cards that look perfectly framed — 会话概览, 仓库脉搏),
      // and flagging those buried the real finding (a clipped READING) in noise.
      const elTag = el.tagName.toLowerCase()
      const graphic = elTag === 'svg' || elTag === 'img' || elTag === 'canvas'
      if (!graphic && el.children.length > 0) continue
      if (!graphic && (el.textContent ?? '').trim() === '') continue
      const b = el.getBoundingClientRect()
      if (b.width === 0 && b.height === 0) continue
      const over = Math.max(inner.left - b.left, b.right - inner.right, inner.top - b.top, b.bottom - inner.bottom)
      // BOX overflow only, past a 3px noise floor: line-box rounding (a glyph's
      // descender box, an integer-rounded line height) reports 1–2px on healthy
      // cards, while a clipped reading or disc is 4px and up.
      if (over > 3) {
        out.push({
          tag,
          what: String(el.className || elTag).slice(0, 40),
          text: (el.textContent ?? '').trim().slice(0, 24),
          over: Math.round(over * 10) / 10,
          clipped: el.scrollWidth - el.clientWidth,
          // The raw numbers, so a report can be diagnosed without a second probe run.
          rect: `${Math.round(b.top)},${Math.round(b.bottom)},${Math.round(b.left)},${Math.round(b.right)}`,
          inner: `${Math.round(inner.top)},${Math.round(inner.bottom)},${Math.round(inner.left)},${Math.round(inner.right)}`,
        })
      }
    }
  }
  return { count: cards.length, bad: out }
})

/**
 * Judge one page's inner fit: every box that pokes out of its card is a defect
 * unless it is registered in `INNER_FIT_OK`. Shared by the gallery, the live rail
 * and the fixture sweep, so the three phases cannot drift apart.
 */
async function judgeInnerFit(page, r, label, cap = 6) {
  const fit = await scanInnerFit(page)
  let reported = 0
  for (const b of fit.bad) {
    const exception = innerFitException(b)
    if (exception !== undefined) {
      r.allowed(`${label} ${b.tag}: ${b.what} pokes out by ${b.over}px`, exception.why)
      continue
    }
    if (reported < cap) {
      r.check(false, `${label} ${b.tag}: content pokes out of the card — ${b.what} "${b.text}" over by ${b.over}px (rect ${b.rect} vs inner ${b.inner})`, b.tag)
      reported += 1
    }
  }
  if (fit.bad.length === 0) r.check(true, `${label}: no content pokes out of its card`, `${fit.count} card(s)`)
  else if (reported === 0) r.check(true, `${label}: no content pokes out of its card`, `${fit.count} card(s), ${fit.bad.length} registered exception(s)`)
  return fit
}

/**
 * TIMER LAYOUT — the stopwatch/countdown dial measured against the owner's reference,
 * PIXEL BY PIXEL rather than by eye.
 *
 * The reference (2026-10-14) is a tile whose reading hugs the TOP-LEFT, whose two round
 * controls sit on the CARD'S FLOOR at its LEFT and RIGHT edges, and whose discs are
 * ~31% of the tile's width. Every one of those is a number, so every one is asserted:
 * the reading's left/top against the content box, each disc's outer edge against that
 * same box, the discs' bottom, the disc's aspect ratio, its computed `corner-shape` (a
 * squircle card used to turn the circles into rounded squares) and the reading's font
 * size/weight against the product's own figure rung (20·scale / 600).
 */
const scanTimerLayout = (page) => page.evaluate(() => {
  const out = []
  for (const card of document.querySelectorAll('.dsx-stats-card')) {
    const discs = [...card.querySelectorAll('.dsx-timer-disc')]
    if (discs.length === 0) continue
    const cell = card.closest('.g-cell')
    const hcell = card.closest('.h-cell')
    const tag = cell
      ? `${cell.getAttribute('data-widget')}@${cell.getAttribute('data-size')}#${cell.getAttribute('data-step')}`
      : hcell ? `${hcell.getAttribute('data-variant')}@${hcell.getAttribute('data-unit')}` : 'live'
    const box = card.getBoundingClientRect()
    // The dial body measures against ITSELF (`data-dial`), not the card: a titled dial
    // (the countdown's run view) starts under the title row, so the card's content top
    // is 16px above the reading on purpose.
    const dial = card.querySelector('[data-dial]')
    const frame = dial === null ? box : dial.getBoundingClientRect()
    const cs = getComputedStyle(card)
    const inner = {
      left: frame.left,
      right: frame.right,
      top: frame.top,
      bottom: frame.bottom,
    }
    const main = [...card.querySelectorAll('span')].find((s) => /^\d{1,3}:\d{2}(:\d{2})?$/.test((s.textContent ?? '').trim()))
    const mainRect = main === undefined ? null : main.getBoundingClientRect()
    const mainStyle = main === undefined ? null : getComputedStyle(main)
    const first = discs[0].getBoundingClientRect()
    const last = discs[discs.length - 1].getBoundingClientRect()
    out.push({
      tag,
      scale: Math.round((box.height / 150) * 1000) / 1000,
      readingLeft: mainRect === null ? null : Math.round(mainRect.left - inner.left),
      readingTop: mainRect === null ? null : Math.round(mainRect.top - inner.top),
      discLeft: Math.round(first.left - inner.left),
      discRight: Math.round(inner.right - last.right),
      discBottom: Math.round(inner.bottom - Math.max(...discs.map((d) => d.getBoundingClientRect().bottom))),
      discW: Math.round(first.width),
      discH: Math.round(first.height),
      cornerShape: getComputedStyle(discs[0]).cornerShape,
      fontSize: mainStyle === null ? null : Math.round(parseFloat(mainStyle.fontSize)),
      fontWeight: mainStyle === null ? null : mainStyle.fontWeight,
      discs: discs.length,
    })
  }
  return out
})

/** Judge one page's dial geometry (see `scanTimerLayout`). */
async function judgeTimerLayout(page, r, label) {
  const rows = await scanTimerLayout(page)
  if (rows.length === 0) return rows
  const near = (v, lo, hi) => v !== null && v >= lo && v <= hi
  for (const t of rows) {
    const expectFont = Math.round(20 * t.scale)
    const bad = []
    if (!near(t.readingLeft, -1, 3)) bad.push(`reading left ${t.readingLeft}px from the content's left (want 0±3)`)
    if (!near(t.readingTop, 0, 10)) bad.push(`reading top ${t.readingTop}px from the content's top (want 0..10)`)
    if (!near(t.discLeft, -1, 2)) bad.push(`left disc ${t.discLeft}px from the content's left (want 0±2)`)
    // A single disc (the countdown's run-out state offers only 复位, which is always the
    // LEFT one) has no right-edge counterpart to check.
    if (t.discs > 1 && !near(t.discRight, -1, 2)) bad.push(`right disc ${t.discRight}px from the content's right (want 0±2)`)
    if (!near(t.discBottom, -1, 10)) bad.push(`discs ${t.discBottom}px above the content's floor (want 0..10)`)
    if (Math.abs(t.discW - t.discH) > 1) bad.push(`disc is ${t.discW}×${t.discH} — not round`)
    // Chrome normalises `corner-shape: round` to `superellipse(1)`; the squircle a
    // 连续曲率 card inherits is `superellipse(2)`. Accept the spelling, reject the shape.
    const round = t.cornerShape === 'round' || t.cornerShape === 'superellipse(1)'
    if (!round) bad.push(`disc corner-shape "${t.cornerShape}" — a squircle card turns circles into rounded squares`)
    if (t.fontSize !== expectFont) bad.push(`reading ${t.fontSize}px, the product's figure rung is ${expectFont}px (20 · scale)`)
    if (t.fontWeight !== '600') bad.push(`reading weight ${t.fontWeight}, the product's figure rung is 600`)
    r.check(bad.length === 0, `${label} ${t.tag}: dial follows the reference`, bad.length === 0 ? `${t.discW}px discs, reading ${t.fontSize}px/${t.fontWeight}` : bad.join('; '))
  }
  return rows
}

/** The HEAD-LADDER FIXTURE page (synthetic render outputs at several card sides). */async function fixturePage() {
  const fixture = join(dirname(GALLERY_PAGE), 'head-fixture.html')
  if (!existsSync(fixture)) return null
  const b = await browser()
  const page = await b.newPage({ viewport: { width: 1200, height: 2400 } })
  await page.goto('file:///' + fixture.split('\\').join('/'), { waitUntil: 'load' })
  await page.waitForSelector('.h-cell', { timeout: 20000 })
  await page.waitForTimeout(400)
  return page
}

;(async () => {
  const results = {}
  const r = report('batched geometry')
  try {
    // ── PHASE 2 first: the gallery needs no GUI and never blocks the run. ──
    if (!LIVE_ONLY) {
      const { page, consoleErrors } = await galleryPage()
      results.gallery = await judgePage(page, r, 'gallery (all widgets)')
      r.check(consoleErrors.length === 0, 'gallery page errors', consoleErrors.slice(0, 2).join(' | ') || 'none')
      await page.close()

      // ── PHASE 3: the fixture page — every body shape at 150 / 190 / 285. ──
      const fixture = await fixturePage()
      if (fixture === null) {
        r.allowed('fixture: scale sweep skipped', 'no .tmp-gallery/head-fixture.html yet — run scripts/preview/gallery.mjs once')
      } else {
        // The same walk, on the page that renders every body shape at 150/190/285 —
        // the scale sweep a 150px-only gallery could never do.
        await judgeInnerFit(fixture, r, 'fixture (150/190/285)')
        await fixture.close()
      }
    }

    // ── PHASE 1: the live rail, if and only if something is listening. ──
    if (!GALLERY_ONLY) {
      if (await liveAvailable()) {
        const ctx = await liveContext({ viewport: { width: 1578, height: 1000 } })
        const railOpen = await openLiveRail(await ctx.newPage())
        r.check(railOpen, 'live: the rail opened')
        results.live = await judgePage(await ctx.pages()[0], r, 'live rail + 组件配置')
        await ctx.close()
      } else {
        r.note(`live phase SKIPPED — nothing listening on ${AUTHORITY} (offline evidence stands; not a failure)`)
        results.live = null
      }
    }
  } finally {
    await close()
  }
  const code = r.exitCode()
  if (AS_JSON) console.log(JSON.stringify(results, null, 2))
  process.exit(code)
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1) })
