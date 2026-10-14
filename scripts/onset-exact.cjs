'use strict'
// onset-exact.cjs — 用 Web Animations startTime（文档时间轴，免疫饥饿）给出精确 onset
const fs = require('fs'); const path = require('path')
const DIR = path.join(__dirname, '..', '.probe-panel-onset')
const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const r1 = v => (v === null || v === undefined) ? null : Math.round(v * 10) / 10

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  const R = j.result || {}, fr = R.frames || [], an = R.anims || [], mt = R.mounts || [], w = R.writes || []
  const base = fr.length ? fr[0].t : 0
  const rel = t => (t === null || t === undefined) ? null : r1(t - base)
  const fw = w.find(x => x.host === 'frame' && x.attr === 'style' && x.gtc && /\d/.test(String(x.gtc)))
  const trackWrite = fw ? rel(fw.t) : null
  const dadd = mt.find(m => m.kind === 'dock-add')
  const gridAnims = an.filter(a => a.prop === 'grid-template-columns' && a.startTime !== null)
  const dockAnims = an.filter(a => (a.prop === 'transform' || a.prop === 'visibility') && a.startTime !== null)
  const gridOnset = gridAnims.length ? rel(Math.min.apply(null, gridAnims.map(a => a.startTime))) : null
  const gridOnsetMax = gridAnims.length ? rel(Math.max.apply(null, gridAnims.map(a => a.startTime))) : null
  const dockOnset = dockAnims.length ? rel(Math.min.apply(null, dockAnims.map(a => a.startTime))) : null
  console.log(JSON.stringify({
    file: f, dir: j.direction, on: !j.glideOff, n: fr.length, maxGap: R.maxGap,
    offsetPerfVsTimeline: fr.length ? r1(fr[0].t - (fr[0].timeline === null ? fr[0].t : fr[0].timeline)) : null,
    click: rel(R.clickAt),
    trackWrite,
    dockMount: dadd ? rel(dadd.t) : null,
    gridAnimOnset: gridOnset, gridAnimOnsetLast: gridOnsetMax,
    dockAnimOnset: dockOnset,
    dockAnimProps: dockAnims.map(a => a.prop + '@' + a.duration + '+delay' + a.delay),
    gridMinusWrite: (gridOnset !== null && trackWrite !== null) ? r1(gridOnset - trackWrite) : null,
    panelMinusWrite: (() => { const p = j.direction === 'open' ? (dadd ? rel(dadd.t) : null) : dockOnset; return (p !== null && trackWrite !== null) ? r1(p - trackWrite) : null })(),
    gridMinusPanel: (() => { const p = j.direction === 'open' ? (dadd ? rel(dadd.t) : null) : dockOnset; return (gridOnset !== null && p !== null) ? r1(gridOnset - p) : null })()
  }))
}
