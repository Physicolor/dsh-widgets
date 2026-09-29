/**
 * Head-ladder contract probe (docs/probe-head-ladder.cjs)
 *
 * EVERY card head is the same three rungs — the blue 13px title, the 20px figure,
 * the 10px grey caption — and the TITLE'S LINE BOX TOP is the same pixel on every
 * card, whatever data that card has. The rule is easy to state and easy to break:
 * the ring head centres its dial against the ladder's rendered height, so a rung
 * that comes and goes (套餐总览's caption exists only when its tightest reset is
 * inside a day; 额度预测's only once its period is known) moved the whole head —
 * measured 2026-09-30, the caption-less card drew title 15.7 / figure 35.3 /
 * ring 13 where the same card with a caption drew 13 / 32.6 / 17.3.
 *
 * This probe mounts the REAL `CardBody` with hand-written `WidgetRenderOut`s (the
 * head-ladder fixture page the gallery build writes) — the only way to reach a
 * caption-less ring head deterministically, since no widget's preview data has
 * one — and asserts the contract across every variant and two card sizes:
 *
 *   1. the title's line box starts at the card's content top on every variant;
 *   2. the figure sits `HEAD_GAP` (4px at side 150) under the title's line box;
 *   3. the ring is at ONE y and ONE diameter across the ring variants, and its
 *      centre is concentric with the figure's (a dial for that number);
 *   4. a ring head's ladder always has its three rungs — a missing caption is
 *      RESERVED, not dropped;
 *   5. nothing overflows its tile (`data-dsx-overflow`, the renderer's own guard).
 *
 * Usage:
 *   node docs/probe-head-ladder.cjs              # rebuild the fixture page, then check
 *   node docs/probe-head-ladder.cjs --no-build   # check the page already on disk
 * Leaves: docs/probe-head-ladder.png (the whole fixture sheet)
 */
const { chromePath } = require('../scripts/lib/chrome.cjs')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.join('C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules', 'playwright-core'))

const ROOT = path.join(__dirname, '..')
const PAGE = path.join(ROOT, '.tmp-gallery', 'head-fixture.html')
const SHOT = path.join(__dirname, 'probe-head-ladder.png')
/** The head anchor every shipped card uses at the plugin's 150px side (pad 12 +
 *  the card's 1px hairline) — the value all 40 gallery cells measure. */
const TITLE_Y_150 = 13
const FIGURE_Y_150 = 32.6
const RING_Y_150 = 17.3
const RING_D_150 = 52
/** The shared title→figure step (card-geometry.ts, HEAD_GAP_PX). */
const HEAD_GAP = 4

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  --  ${detail}`}`)
}
const near = (a, b, tol) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol

const READ = () => {
  const round = (n) => Math.round(n * 10) / 10
  return Array.from(document.querySelectorAll('.h-cell')).map((cell) => {
    const card = cell.querySelector('.dsx-stats-card')
    const box = card.getBoundingClientRect()
    const rel = (el) => { const b = el.getBoundingClientRect(); return { y: round(b.top - box.top), h: round(b.height), w: round(b.width), bottom: round(b.bottom - box.top) } }
    const titleEl = card.querySelector('.dsx-stats-card-title')
    const title = titleEl.querySelector('span') ?? titleEl
    const col = title.parentElement
    const ring = Array.from(card.querySelectorAll('div')).find((d) => d.firstElementChild !== null && d.firstElementChild.tagName === 'svg' && d.firstElementChild.querySelector('circle') !== null && d.children.length === 2) ?? null
    const legend = card.querySelector('.dsx-stats-card-legend')
    const figRung = card.querySelector('.dsx-stats-card-headafter') ?? col.children[1] ?? null
    const figure = figRung !== null ? figRung.querySelector('span') : null
    return {
      variant: cell.getAttribute('data-variant'),
      unit: Number(cell.getAttribute('data-unit')),
      cardH: round(box.height),
      overflow: card.getAttribute('data-dsx-overflow') === '1',
      rungs: col.children.length,
      title: rel(title),
      figure: figure !== null ? rel(figure) : null,
      figureText: figure !== null ? figure.textContent.replace(/\u00a0/g, '').trim() : null,
      legend: legend !== null ? rel(legend) : null,
      hasCaption: legend !== null && legend.textContent.replace(/\u00a0/g, '').trim() !== '',
      ring: ring !== null ? rel(ring) : null,
    }
  })
}

;(async () => {
  if (!process.argv.includes('--no-build')) {
    console.log('[head-ladder] building the fixture page (scripts/preview/gallery.mjs --no-shot)…')
    const build = spawnSync(process.execPath, ['scripts/preview/gallery.mjs', '--no-shot'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' })
    if (build.status !== 0) { console.error(build.stdout ?? '', build.stderr ?? ''); process.exit(2) }
  }
  if (!fs.existsSync(PAGE)) { console.error(`[head-ladder] no fixture page at ${PAGE} — run the build (drop --no-build)`); process.exit(2) }

  const browser = await chromium.launch({ executablePath: chromePath(), headless: true })
  const page = await browser.newPage({ viewport: { width: 820, height: 1400 }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => console.error('[pageerror]', e.message))
  await page.goto('file:///' + PAGE.split('\\').join('/'), { waitUntil: 'load' })
  await page.waitForSelector('.h-cell .dsx-stats-card', { timeout: 20000 })
  const rows = await page.evaluate(READ)
  await page.screenshot({ path: SHOT, fullPage: true })
  await browser.close()

  const byKey = new Map(rows.map((r) => [`${r.variant}@${r.unit}`, r]))
  const units = [...new Set(rows.map((r) => r.unit))].sort((a, b) => a - b)
  console.log(`\n${rows.length} fixture cards (${units.join('/')} px sides)\n`)
  for (const r of rows) {
    console.log(`${`${r.variant}@${r.unit}`.padEnd(26)} title y=${String(r.title.y).padStart(5)}  figure y=${String(r.figure?.y ?? '-').padStart(5)} ${JSON.stringify(r.figureText)}  caption=${r.hasCaption ? 'yes' : 'NO '} (rung ${r.legend?.y ?? '-'})  ring y=${r.ring?.y ?? '-'} d=${r.ring?.w ?? '-'}  cardH=${r.cardH}${r.overflow ? ' OVERFLOW' : ''}`)
  }
  console.log('')

  for (const unit of units) {
    const s = Math.round((unit / 150) * 1000) / 1000
    const at = (v) => byKey.get(`${v}@${unit}`)
    const reference = at('plain-ladder')
    check(`${unit}px: the plain ladder exists in the fixture`, reference !== undefined, reference === undefined ? 'variant missing' : `title y=${reference.title.y}`)

    // 1 + absolute anchor: every variant's title starts on the card's content top.
    for (const r of rows.filter((x) => x.unit === unit)) {
      const expected = TITLE_Y_150 * s
      check(`${unit}px/${r.variant}: the title starts on the card's content top`, near(r.title.y, expected, 0.6),
        `title y=${r.title.y} (content top ${Math.round(expected * 10) / 10}, anchor ${TITLE_Y_150} at 150)`)
    }
    // 2: the figure keeps the shared 4px step under the title's line box, whatever
    //    the card's caption/figure data is.
    for (const r of rows.filter((x) => x.unit === unit)) {
      const gap = r.figure === null ? null : Math.round((r.figure.y - (r.title.y + r.title.h)) * 10) / 10
      check(`${unit}px/${r.variant}: the figure sits ${HEAD_GAP}px under the title`, near(gap, HEAD_GAP * s, 1),
        `gap=${gap}px (figure y=${r.figure?.y}, title bottom ${Math.round((r.title.y + r.title.h) * 10) / 10})`)
    }
    // 3: one ring geometry across every ring variant — caption or not, figure or not.
    const rings = rows.filter((x) => x.unit === unit && x.ring !== null)
    const ringYs = rings.map((x) => x.ring.y)
    const spread = Math.round((Math.max(...ringYs) - Math.min(...ringYs)) * 10) / 10
    check(`${unit}px: every ring sits at the same y (caption-independent)`, rings.length >= 3 && spread <= 0.3,
      `${rings.length} rings, y=${ringYs.join(' / ')} (spread ${spread}px)`)
    check(`${unit}px: every ring is the same diameter`, rings.length >= 3 && Math.max(...rings.map((x) => x.ring.w)) - Math.min(...rings.map((x) => x.ring.w)) <= 0.6,
      rings.map((x) => `${x.variant} ${x.ring.w}`).join(' / '))
    check(`${unit}px: the ring diameter is the fixed share of the side (${RING_D_150}px at 150)`, rings.every((x) => near(x.ring.w, RING_D_150 * s, 0.8)),
      rings.map((x) => `${x.variant} ${x.ring.w} (expected ${Math.round(RING_D_150 * s * 10) / 10})`).join(' / '))
    // 0.6px: a plain head's `headAfter` row is a flex row (baseline-aligned), the ring
    // head's figure row is a flex span — the two land 0.4px apart at side 150 from
    // line-box rounding (33 vs 32.6, the value every shipped plain card shows). Below
    // the visible threshold, and identical on every card of each kind.
    check(`${unit}px: the figure's rung sits at the same y with and without a ring`,
      near(at('plain-ladder').figure.y, at('ring-caption').figure.y, 0.6),
      `plain ${at('plain-ladder').figure.y} vs ring ${at('ring-caption').figure.y}`)
    if (unit === 150) {
      check(`150px: the shipped anchors hold (title ${TITLE_Y_150} / figure ${FIGURE_Y_150} / ring ${RING_Y_150})`,
        near(at('plain-ladder').title.y, TITLE_Y_150, 0.4) && near(at('ring-caption').figure.y, FIGURE_Y_150, 0.4) && near(at('ring-caption').ring.y, RING_Y_150, 0.4),
        `title ${at('plain-ladder').title.y}, figure ${at('ring-caption').figure.y}, ring ${at('ring-caption').ring.y}`)
    }
    // 4: a ring's centre stays concentric with the figure (1.8px apart by design —
    //    the dial reads as belonging to that number).
    for (const r of rings.filter((x) => x.figure !== null)) {
      const ringCy = r.ring.y + r.ring.h / 2
      const figCy = r.figure.y + r.figure.h / 2
      check(`${unit}px/${r.variant}: the ring is concentric with the figure`, Math.abs(ringCy - figCy) <= 3,
        `ring cy=${Math.round(ringCy * 10) / 10} figure cy=${Math.round(figCy * 10) / 10} (Δ=${Math.round((ringCy - figCy) * 10) / 10})`)
    }
    // 5: a missing caption is RESERVED, not dropped.
    const noCap = at('ring-nocaption')
    check(`${unit}px: a caption-less ring head still draws its three rungs`, noCap.rungs === 3 && noCap.hasCaption === false && noCap.legend !== null,
      `rungs=${noCap.rungs} caption=${noCap.hasCaption ? 'present' : 'reserved'} rung y=${noCap.legend?.y}`)
    check(`${unit}px: a caption-less ring head's caption rung matches the real one's box`,
      noCap.legend !== null && at('ring-caption').legend !== null
        && near(noCap.legend.h, at('ring-caption').legend.h, 0.3) && near(noCap.legend.y, at('ring-caption').legend.y, 0.3),
      `reserved ${noCap.legend === null ? 'MISSING' : `h=${noCap.legend.h}@${noCap.legend.y}`} vs real ${at('ring-caption').legend === null ? 'MISSING' : `h=${at('ring-caption').legend.h}@${at('ring-caption').legend.y}`}`)
    // 6: the tile guard is quiet on every variant.
    const bad = rows.filter((x) => x.unit === unit && x.overflow)
    check(`${unit}px: no fixture card overflows its tile`, bad.length === 0, bad.length === 0 ? 'clean' : bad.map((x) => x.variant).join(', '))
    check(`${unit}px: the fixture cards are the tile's own size`, rows.filter((x) => x.unit === unit).every((x) => near(x.cardH, unit, 1)),
      rows.filter((x) => x.unit === unit).map((x) => `${x.variant} ${x.cardH}`).join(' / '))
  }

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}  (${results.length} assertions)  -> ${path.basename(SHOT)}`)
  process.exit(failed === 0 ? 0 : 1)
})().catch((err) => { console.error('probe crashed:', err); process.exit(2) })
