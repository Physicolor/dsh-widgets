#!/usr/bin/env node
/**
 * dsh-widgets — verify the DATA MOTION contract (2026-11-12).
 *
 * What this proves, and why it is a probe rather than a gate: `gates.mjs` runs
 * offline with no browser, and every claim here is about TIME — a number that
 * travelled instead of jumping, a chart that rose into place, a lane bar that
 * grew out of its edge. So one Chromium is launched (probe-harness), the gallery
 * bundle is built once, and all four checks share it.
 *
 *  1. 缓存趋势's SINGLE-TURN state is the new one: the render docks the figure to
 *     the card's floor (`headAfter.dock`), keeps 整体 in its slot but uninked, and
 *     says nothing about waiting for turns. Checked on the REAL widget render (the
 *     compiled render closure the G4 snapshot uses), not on a hand-written out.
 *  2. The docked figure TRAVELS UP when the chart arrives — sampled per frame from
 *     the DOM, so an instant jump cannot pass as an animation.
 *  3. The donut's arc INTERPOLATES its `stroke-dasharray` (the CSS layer).
 *  4. A lane bar GROWS IN when the beat window gains a beat, and the bars already
 *     drawn RESHAPE rather than teleporting (the transition + enter class).
 *  5. `prefers-reduced-motion` turns every one of these transitions OFF.
 *
 * Usage: node scripts/probe-motion.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { ROOT, browser, report, close } = require('./lib/probe-harness.cjs')

const GALLERY = path.join(ROOT, '.tmp-gallery')
const PAGE = path.join(GALLERY, 'motion-fixture.html')

/** Rebuild the gallery bundle (CSS + CardBody) so the probe never measures a stale build. */
function buildGallery() {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'preview', 'gallery.mjs'), '--no-shot'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (run.status !== 0) throw new Error(`gallery build failed\n${(run.stdout ?? '') + (run.stderr ?? '')}`)
}

/** The three stylesheets the rail loads, inlined exactly as the gallery does. */
function cardCss() {
  return ['card.module.css', 'tokens.module.css', 'primitives.module.css']
    .map((name) => fs.readFileSync(path.join(ROOT, 'src', 'client', 'styles', name), 'utf8'))
    .join('\n')
}

/** The fixture page: one root per check, so each CardBody keeps its own state. */
function writeFixture() {
  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<title>dsh-widgets motion fixture</title>
<link rel="stylesheet" href="theme-tokens.css" />
<style>
  html, body { margin: 0; }
  body { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: var(--dsw-font-base-16, 16px/24px) var(--dsw-font-family); padding: 24px; }
${cardCss()}
  .m-cell { display: inline-block; margin: 12px; }
</style>
</head>
<body>
<div id="app"></div>
<script src="react.js"></script>
<script src="react-dom.js"></script>
<script src="gallery.js"></script>
<script>
  var roots = {}
  window.__mount = function (cell, out) {
    if (roots[cell] === undefined) {
      var host = document.createElement('div')
      host.className = 'm-cell'
      host.setAttribute('data-cell', cell)
      document.getElementById('app').appendChild(host)
      roots[cell] = { host: host, root: ReactDOM.createRoot(host) }
    }
    roots[cell].root.render(React.createElement(DSHGallery.CardBody, {
      out: out, unit: 150, squircle: true, cornerPercent: 16, pinBox: true,
    }))
  }
  window.__read = function (cell, selector) {
    var host = document.querySelector('[data-cell="' + cell + '"]')
    if (host === null) return null
    var el = selector === undefined ? host.firstElementChild : host.querySelector(selector)
    if (el === null) return null
    var r = el.getBoundingClientRect()
    var cs = getComputedStyle(el)
    return { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height, opacity: Number(cs.opacity), transition: cs.transitionDuration, dash: cs.strokeDasharray, cls: el.className, flag: el.getAttribute('data-dsx-overflow') }
  }
</script>
</body>
</html>
`
  fs.writeFileSync(PAGE, html, 'utf8')
  return 'file:///' + PAGE.split('\\').join('/')
}

/** Rebuild the React-free render closure (the same compile G4 does) so the widget
 *  half is measured from the SOURCE TREE, never from a stale `.tmp-snapshot`. */
function buildRenderClosure() {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'snapshot-render.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return { ok: run.status === 0, output: `${run.stdout ?? ''}${run.stderr ?? ''}` }
}

/** The 缓存趋势 render outs under test: the widget's OWN strings. */
function cacheTrendOuts() {
  const snapshotDir = path.join(ROOT, '.tmp-snapshot')
  const registry = path.join(snapshotDir, 'src', 'client', 'generated.registry.js')
  const harness = path.join(snapshotDir, 'scripts', 'snapshot', 'render-harness.js')
  if (!fs.existsSync(registry) || !fs.existsSync(harness)) return null
  // Importing the harness applies the widget dictionaries (setExtraLocales) — the
  // same boot step the app runs, so the strings are the shipped ones.
  require(harness)
  const { WIDGETS } = require(registry)
  const widget = WIDGETS.find((w) => w.id === 'cache-trend')
  if (widget === undefined) return null
  const stats = (turns) => ({
    usage: { inputTokens: 118000, cacheReadTokens: 112900, outputTokens: 940 },
    cacheTurns: { available: true, source: 'session-store', turns },
  })
  const one = { turn: 1, rate: 0.84, cacheRead: 84000, prompt: 100000, steps: 3 }
  const two = [
    one,
    { turn: 2, rate: 0.97, cacheRead: 97000, prompt: 100000, steps: 4 },
  ]
  return {
    single: widget.render(stats([one]), { size: '2x2' }),
    pair: widget.render(stats(two), { size: '2x2' }),
  }
}

async function main() {
  const r = report('data motion')
  const closure = buildRenderClosure()
  r.check(closure.ok, 'the offline render closure is current (G4 stays green)', closure.ok ? 'snapshot matches' : closure.output.trim().split('\n').slice(-3).join(' | '))
  const outs = closure.ok ? cacheTrendOuts() : null
  // 1) The widget half — the real render, offline.
  if (outs === null) {
    r.allowed('cache-trend render is unavailable — the browser half uses a hand-written out', 'offline render closure missing or stale')
  } else {
    const single = outs.single
    const fig = single?.headAfter ?? {}
    r.check(single?.chart === undefined, 'single turn draws no chart', JSON.stringify(single?.chart))
    r.check(fig.dock === 'bottom', 'single turn DOCKs the figure to the floor', JSON.stringify(fig))
    r.check(single?.legend === undefined, 'single turn drops the waiting caption', JSON.stringify(single?.legend))
    r.check(typeof fig.big === 'string' && fig.big.endsWith('%'), 'single turn still prints the rate', String(fig.big))
    const pair = outs.pair
    r.check(pair?.headAfter?.dock === 'bottom', 'the dock stays DECLARED once the line exists (the FLIP needs it)', JSON.stringify(pair?.headAfter))
    r.check(pair?.chart?.kind === 'line', 'second turn draws the line', JSON.stringify(pair?.chart?.kind))
  }

  buildGallery()
  const url = writeFixture()
  const b = await browser()
  const page = await b.newPage({ viewport: { width: 900, height: 700 } })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  const consoleErrors = []
  const fitWarnings = []
  page.on('console', (m) => {
    const text = m.text()
    if (m.type() === 'error') consoleErrors.push(text)
    if (/does not fit its tile/.test(text)) fitWarnings.push(text)
  })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(250)

  // 2) The docked card: geometry now, then the travel up to the ladder.
  const dock = outs === null
    ? { single: { title: '缓存趋势', headAfter: { big: '84%', small: '整体 84%', dock: 'bottom' } }, pair: { title: '缓存趋势', headAfter: { big: '97%', small: '整体 95%', dock: 'bottom' }, chart: { kind: 'line', line: { values: [84, 97], max: 100, labels: ['1', '2'] } } } }
    : outs
  const travel = await page.evaluate(async ({ single, pair }) => {
    const read = window.__read
    window.__mount('dock', single)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const before = { row: read('dock', '.dsx-stats-card-headafter'), card: read('dock') }
    const note = read('dock', '.dsx-stats-card-headafter .dsx-stats-card-legend')
    window.__mount('dock', pair)
    const frames = []
    const t0 = performance.now()
    while (performance.now() - t0 < 1000) {
      frames.push({ t: Math.round(performance.now() - t0), row: read('dock', '.dsx-stats-card-headafter'), note: read('dock', '.dsx-stats-card-headafter .dsx-stats-card-legend'), chart: read('dock', '.dsx-chart-enter'), card: read('dock') })
      await new Promise((res) => requestAnimationFrame(res))
    }
    return { before, beforeNote: note, frames }
  }, dock)

  const cardRect = travel.before.card
  const dockedRow = travel.before.row
  if (cardRect === null || dockedRow === null) {
    r.check(false, 'the docked card rendered', 'no card/row element')
  } else {
    const pad = 12
    const marginLeft = Math.abs(dockedRow.left - (cardRect.left + 1 + pad))
    const marginBottom = Math.abs(cardRect.bottom - dockedRow.bottom - (1 + pad))
    r.check(marginLeft <= 3, 'the docked figure sits on the card\'s LEFT content edge', `off by ${marginLeft.toFixed(1)}px`)
    r.check(marginBottom <= 3, 'the docked figure sits on the card\'s FLOOR', `off by ${marginBottom.toFixed(1)}px`)
  }
  r.check(travel.beforeNote !== null && travel.beforeNote.opacity === 0, 'the 整体 caption is reserved but uninked while docked', String(travel.beforeNote?.opacity))

  const rows = travel.frames.map((f) => f.row).filter((row) => row !== null)
  const start = travel.before.row.bottom
  const end = rows[rows.length - 1]?.bottom ?? start
  const moved = start - end
  r.check(moved > 40, 'the figure ENDS well above where it waited', `${moved.toFixed(1)}px travelled`)
  const between = rows.filter((row) => row.bottom < start - 2 && row.bottom > end + 2)
  r.check(between.length >= 3, 'the figure is SEEN between the two places (not a jump)', `${between.length} intermediate frame(s)`)
  r.check(travel.frames.some((f) => String(f.row?.cls ?? '').includes('dsx-figure-move')), 'the figure is FLIPped from its old place', 'dsx-figure-move seen')
  const monotonic = rows.every((row, i) => i === 0 || row.bottom <= rows[i - 1].bottom + 1)
  r.check(monotonic, 'the travel is one smooth move (no bounce back)')
  const noteFrames = travel.frames.map((f) => f.note).filter((n) => n !== null)
  r.check(noteFrames.some((n) => n.opacity > 0 && n.opacity < 0.95), 'the caption FADES in rather than popping', `${noteFrames.map((n) => n.opacity.toFixed(2)).join(' ')}`)
  r.check(travel.frames.some((f) => f.chart !== null), 'the chart is marked as entering', 'dsx-chart-enter seen')
  r.check(travel.frames[travel.frames.length - 1]?.chart === null, 'the chart\'s entrance class is cleared afterwards')
  // The owner's red frame (2026-11-12): a transform used to inflate the card's
  // scrollable overflow and the tile-fits guard painted its error outline. Neither
  // the entrance nor the travel may ever trip it.
  r.check(!travel.frames.some((f) => f.card?.flag === '1'), 'the entrance never trips the tile-fits guard (no red frame)', `${travel.frames.filter((f) => f.card?.flag === '1').length} flagged frame(s)`)
  r.check(!fitWarnings.length, 'the guard logged no "does not fit" warning', fitWarnings.join(' | ') || 'none')

  // 3) The donut arc interpolates its dash pattern.
  const donut = await page.evaluate(async () => {
    const read = window.__read
    const out = (ratio) => ({ title: '缓存命中', headAfter: { big: `${Math.round(ratio * 100)}%` }, headRing: { ratio, tone: 'success' } })
    window.__mount('donut', out(0.2))
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const before = read('donut', '.dsx-arc')
    window.__mount('donut', out(0.86))
    const frames = []
    const t0 = performance.now()
    while (performance.now() - t0 < 900) {
      frames.push({ t: Math.round(performance.now() - t0), arc: read('donut', '.dsx-arc') })
      await new Promise((res) => requestAnimationFrame(res))
    }
    return { before, frames }
  })
  // Chrome reports the computed dash pattern in px, e.g. "23.9027px, 144.513px".
  const ink = (dash) => Number.parseFloat(String(dash ?? '').trim().split(/[\s,]+/)[0])
  const inkStart = ink(donut.before?.dash)
  const inkEnd = ink(donut.frames[donut.frames.length - 1]?.arc?.dash)
  const inkMid = donut.frames.map((f) => ink(f.arc?.dash)).filter((v) => v > inkStart + 0.5 && v < inkEnd - 0.5)
  r.check(inkEnd > inkStart + 4, 'the donut arc ends at its new ratio', `${inkStart.toFixed(1)} -> ${inkEnd.toFixed(1)}`)
  r.check(inkMid.length >= 3, 'the arc INK is interpolated per frame', `${inkMid.length} intermediate dash value(s)`)

  // 3b) The sparkline has no CSS property to transition: its POINTS are eased
  //     (`useTweenNumbers`), so the polyline must be seen between the two shapes.
  const line = await page.evaluate(async () => {
    const card = (values) => ({ title: '缓存趋势', headAfter: { big: `${values[values.length - 1]}%` }, chart: { kind: 'line', line: { values, max: 100, labels: ['1', '2'] } } })
    const points = () => {
      const el = document.querySelector('[data-cell="line"] polyline')
      return el === null ? null : el.getAttribute('points')
    }
    const yOf = (pts) => (pts === null ? null : Number.parseFloat(pts.split(' ')[0].split(',')[1]))
    window.__mount('line', card([20, 30]))
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const before = yOf(points())
    window.__mount('line', card([80, 90]))
    const frames = []
    const t0 = performance.now()
    while (performance.now() - t0 < 900) {
      frames.push({ t: Math.round(performance.now() - t0), y: yOf(points()) })
      await new Promise((res) => requestAnimationFrame(res))
    }
    return { before, frames }
  })
  const yStart = line.before
  const yEnd = line.frames[line.frames.length - 1]?.y
  const yMid = line.frames.map((f) => f.y).filter((y) => y !== null && y < yStart - 0.5 && y > yEnd + 0.5)
  r.check(yEnd < yStart - 5, 'the sparkline ends at its new shape (a higher sample draws higher)', `${yStart?.toFixed(1)} -> ${yEnd?.toFixed(1)}`)
  r.check(yMid.length >= 3, 'the sparkline MORPHS instead of swapping', `${yMid.length} intermediate point frame(s)`)

  // 4) A lane bar enters from its own edge; the drawn bars reshape.
  const lanes = await page.evaluate(async () => {
    const read = window.__read
    const beat = (kind) => ({ kind, label: kind, ms: 1000 })
    const out = (n) => ({ title: '对话轨迹', chart: { kind: 'lanes', lanes: Array.from({ length: n }, (_, i) => beat(['input', 'model', 'tool'][i % 3])) } })
    window.__mount('lanes', out(3))
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const before = document.querySelectorAll('[data-cell="lanes"] .dsx-lane-seg').length
    const widthBefore = read('lanes', '.dsx-lane-seg')?.width
    window.__mount('lanes', out(5))
    const frames = []
    const t0 = performance.now()
    while (performance.now() - t0 < 900) {
      const host = document.querySelector('[data-cell="lanes"]')
      frames.push({
        t: Math.round(performance.now() - t0),
        segs: host.querySelectorAll('.dsx-lane-seg').length,
        entering: host.querySelectorAll('.dsx-lane-seg-enter').length,
        width: read('lanes', '.dsx-lane-seg')?.width,
      })
      await new Promise((res) => requestAnimationFrame(res))
    }
    return { before, widthBefore, frames }
  })
  const laneEnds = lanes.frames[lanes.frames.length - 1] ?? { segs: 0, width: 0, entering: 0 }
  r.check(lanes.before === 3 && laneEnds.segs === 5, 'the strip redraws with the new beat', `${lanes.before} -> ${laneEnds.segs} segment(s)`)
  r.check(lanes.frames.some((f) => f.entering >= 2), 'the ARRIVING beat grows in', `max ${Math.max(...lanes.frames.map((f) => f.entering))} marked`)
  r.check(laneEnds.entering === 0, 'the entrance marker is cleared afterwards')
  const widths = lanes.frames.map((f) => f.width).filter((w) => typeof w === 'number')
  const wStart = lanes.widthBefore
  const wEnd = laneEnds.width
  const wMid = widths.filter((w) => Math.abs(w - wStart) > 0.5 && Math.abs(w - wEnd) > 0.5)
  r.check(Math.abs(wEnd - wStart) > 2, 'the drawn bar reshapes to its new share', `${wStart?.toFixed(1)} -> ${wEnd?.toFixed(1)}px`)
  r.check(wMid.length >= 3, 'the reshape is interpolated per frame', `${wMid.length} intermediate width(s)`)

  // 5) Reduced motion: every transition off, and the move happens at once.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(async () => {
    const read = window.__read
    const card = (ratio) => ({ title: '缓存命中', headAfter: { big: `${Math.round(ratio * 100)}%` }, headRing: { ratio, tone: 'success' } })
    window.__mount('reduced', { title: '缓存趋势', headAfter: { big: '84%', small: '整体 84%', dock: 'bottom' } })
    window.__mount('reduced-donut', card(0.2))
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    window.__mount('reduced', { title: '缓存趋势', headAfter: { big: '97%', small: '整体 95%', dock: 'bottom' }, chart: { kind: 'line', line: { values: [84, 97], max: 100, labels: ['1', '2'] } } })
    window.__mount('reduced-donut', card(0.86))
    const frames = []
    const t0 = performance.now()
    while (performance.now() - t0 < 400) {
      frames.push({ t: Math.round(performance.now() - t0), row: read('reduced', '.dsx-stats-card-headafter'), arc: read('reduced-donut', '.dsx-arc') })
      await new Promise((res) => requestAnimationFrame(res))
    }
    return { frames }
  })
  const arcDuration = String(reduced.frames[0]?.arc?.transition ?? '')
  r.check(/^0s/.test(arcDuration), 'reduced motion turns the data transitions OFF', `arc transition ${arcDuration}`)
  const reducedRows = reduced.frames.map((f) => f.row?.bottom).filter((b) => typeof b === 'number')
  const reducedStart = reducedRows[0]
  const reducedEnd = reducedRows[reducedRows.length - 1]
  const reducedBetween = reducedRows.filter((b) => b < reducedStart - 1 && b > reducedEnd + 1)
  r.check(reducedEnd < reducedStart - 40, 'reduced motion still puts the figure in its final place', `${reducedStart?.toFixed(1)} -> ${reducedEnd?.toFixed(1)}`)
  r.check(reducedBetween.length === 0, 'reduced motion makes the move INSTANT (no intermediate frames)', `${reducedBetween.length} intermediate frame(s)`)
  const reducedDashes = reduced.frames.map((f) => ink(f.arc?.dash)).filter((v) => Number.isFinite(v))
  const reducedDashStart = reducedDashes[0]
  const reducedDashEnd = reducedDashes[reducedDashes.length - 1]
  const reducedDashBetween = reducedDashes.filter((v) => v > reducedDashStart + 0.5 && v < reducedDashEnd - 0.5)
  r.check(reducedDashEnd > reducedDashStart + 4, 'reduced motion still paints the new ratio', `${reducedDashStart?.toFixed(1)} -> ${reducedDashEnd?.toFixed(1)}`)
  r.check(reducedDashBetween.length === 0, 'reduced motion paints the arc in ONE step', `${reducedDashBetween.length} intermediate dash value(s)`)

  // 6) The whole gallery still renders every widget × size with the animated charts
  //    (a smoke net: a chart renderer that throws on its new class name would show
  //    up here as a page error or a missing cell).
  await page.goto('file:///' + path.join(GALLERY, 'index.html').split('\\').join('/'), { waitUntil: 'load' })
  await page.waitForSelector('.g-cell', { timeout: 20000 })
  await page.waitForTimeout(300)
  const cells = await page.locator('.g-cell').count()
  r.check(cells > 50, 'the whole gallery renders every cell', `${cells} cell(s)`)

  r.check(pageErrors.length === 0, 'the page raised no error', pageErrors.join(' | ') || 'none')
  r.check(consoleErrors.length === 0, 'the console stayed clean', consoleErrors.join(' | ') || 'none')

  await page.close()
  await close()
  process.exit(r.exitCode())
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
