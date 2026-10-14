'use strict'
// final-report.cjs — 汇总 A/C 判据，输出交付表
const fs = require('fs'); const path = require('path')
const DIR = path.join(__dirname, '..', '.probe-panel-onset')
const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const r1 = v => (v === null || v === undefined) ? null : Math.round(v * 10) / 10

function load(f) { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }

function metrics(f) {
  const j = load(f), R = j.result || {}, fr = R.frames || []
  const base = fr.length ? fr[0].t : 0
  const rel = t => (t === null || t === undefined) ? null : r1(t - base)
  const pre = R.pre || {}, w = R.writes || [], ev = R.events || [], mt = R.mounts || [], an = R.anims || []
  // 轨道写入（非量化）
  const fw = w.find(x => x.host === 'frame' && x.attr === 'style' && x.gtc && /\d/.test(String(x.gtc)))
  const trackWrite = fw ? rel(fw.t) : null
  // 轨道 transitionrun（非量化）
  const grun = ev.find(e => e.type === 'transitionrun' && e.prop === 'grid-template-columns')
  const gridRun = grun ? rel(grun.t) : null
  const gend = ev.find(e => e.type === 'transitionend' && e.prop === 'grid-template-columns')
  // 右栏首个可见变化
  let panelOnset = null, panelKind = null
  const dadd = mt.find(m => m.kind === 'dock-add')
  const dattr = mt.find(m => m.kind === 'attr' && m.attr === 'data-sidebar-right-open')
  const tabRun = ev.find(e => e.type === 'transitionrun' && e.dock && e.prop === 'transform')
  if (j.direction === 'open') {
    if (dadd) { panelOnset = rel(dadd.t); panelKind = 'dock mount (visible, final pos)' }
    else if (dattr) { panelOnset = rel(dattr.t); panelKind = 'data-sidebar-right-open attr' }
  } else {
    if (tabRun) { panelOnset = rel(tabRun.t); panelKind = 'tabCell transform transitionrun' }
    else if (dattr) { panelOnset = rel(dattr.t); panelKind = 'attr' }
  }
  // 量化：中栏/正文首个可见位移
  function firstChange(key, eps) {
    const p0 = pre[key]
    for (let i = 0; i < fr.length; i++) {
      const v = fr[i][key]
      if (v === null || v === undefined) continue
      if (p0 === null || p0 === undefined) return fr[i].at
      if (Math.abs(v - p0) > (eps === undefined ? 0.5 : eps)) return fr[i].at
    }
    return null
  }
  return {
    file: f, label: j.label, dir: j.direction, on: !j.glideOff, session: (j.session || '').slice(0, 14),
    parkedOK: j.parkedOK,
    maxGap: R.maxGap, ivGap: (R.iv || {}).maxGap, n: fr.length,
    trackWrite, gridRun, gridEnd: gend ? rel(gend.t) : null, gridElapsed: gend ? gend.elapsed : null,
    panelOnset, panelKind,
    panelMinusWrite: (panelOnset !== null && trackWrite !== null) ? r1(panelOnset - trackWrite) : null,
    gridMinusWrite: (gridRun !== null && trackWrite !== null) ? r1(gridRun - trackWrite) : null,
    gridMinusPanel: (gridRun !== null && panelOnset !== null) ? r1(gridRun - panelOnset) : null,
    centerMove: firstChange('centerW'), proseMove: firstChange('proseL'),
    moveMinusGrid: (() => { const m = firstChange('proseL'); return (m !== null && gridRun !== null) ? r1(m - gridRun) : null })(),
    dockTransitions: ev.filter(e => e.type === 'transitionrun' && e.dock).map(e => e.prop),
    animDock: an.filter(a => a.target === 'tabCell').map(a => a.prop + '@' + a.duration + 'ms(delay' + a.delay + ')'),
    animGrid: an.filter(a => a.prop === 'grid-template-columns').map(a => 'dur' + a.duration)
  }
}

const rows = files.map(metrics)
console.log('| file | dir | ON/OFF | session | rAFn | maxGap | ivMaxGap | trackWrite | gridRun | panelOnset(kind) | panel-write | grid-write | grid-panel | proseMove | move-grid | gridEnd/elapsed |')
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const r of rows) {
  console.log('| ' + [r.file, r.dir, r.on ? 'ON' : 'OFF', r.session, r.n, r.maxGap, r.ivGap, r.trackWrite, r.gridRun,
    (r.panelOnset + ' (' + r.panelKind + ')'), r.panelMinusWrite, r.gridMinusWrite, r.gridMinusPanel, r.proseMove, r.moveMinusGrid,
    r.gridEnd + '/' + r.gridElapsed].join(' | ') + ' |')
}
console.log('\n--- 详情 ---')
for (const r of rows) {
  console.log(JSON.stringify({ file: r.file, parkedOK: r.parkedOK, dockTransitions: r.dockTransitions, animDock: r.animDock, animGrid: r.animGrid }))
}
