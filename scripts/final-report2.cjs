'use strict'
// final-report2.cjs — 用引擎时间戳(event.timeStamp)给出免疫饥饿的 onset 判据
const fs = require('fs'); const path = require('path')
const DIR = path.join(__dirname, '..', '.probe-panel-onset')
const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const r1 = v => (v === null || v === undefined) ? null : Math.round(v * 10) / 10

const rows = []
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  const R = j.result || {}, fr = R.frames || [], ev = R.events || [], mt = R.mounts || [], w = R.writes || [], an = R.anims || []
  const base = fr.length ? fr[0].t : 0
  const rel = t => (t === null || t === undefined) ? null : r1(t - base)
  const fw = w.find(x => x.host === 'frame' && x.attr === 'style' && x.gtc && /\d/.test(String(x.gtc)))
  const trackWrite = fw ? rel(fw.t) : null
  const gridRun = ev.find(e => e.type === 'transitionrun' && e.prop === 'grid-template-columns')
  const gridRunEt = gridRun ? rel(gridRun.et) : null
  const gridRunT = gridRun ? rel(gridRun.t) : null
  const tabRun = ev.find(e => e.type === 'transitionrun' && e.dock && e.prop === 'transform')
  const tabRunEt = tabRun ? rel(tabRun.et) : null
  const visRun = ev.find(e => e.type === 'transitionrun' && e.dock && e.prop === 'visibility')
  const gend = ev.find(e => e.type === 'transitionend' && e.prop === 'grid-template-columns')
  const dadd = mt.find(m => m.kind === 'dock-add')
  // 中栏/正文首个可见位移（rAF 量化）
  const pre = R.pre || {}
  function firstChange(key) {
    const p0 = pre[key]
    for (let i = 0; i < fr.length; i++) {
      const v = fr[i][key]
      if (v === null || v === undefined) continue
      if (p0 === null || p0 === undefined) return fr[i].at
      if (Math.abs(v - p0) > 0.5) return fr[i].at
    }
    return null
  }
  const proseMove = firstChange('proseL')
  const panelOnset = j.direction === 'open' ? (dadd ? rel(dadd.t) : null) : tabRunEt
  const panelKind = j.direction === 'open' ? 'dock mount(MO，同提交内插入终位)' : 'tabCell transform transitionrun(引擎et)'
  const panelOnsetImmune = j.direction === 'open' ? dadd ? rel(dadd.t) : null : tabRunEt
  rows.push({
    file: f, dir: j.direction, on: !j.glideOff, session: (j.session || '').slice(0, 12),
    n: fr.length, maxGap: R.maxGap, ivGap: (R.iv || {}).maxGap,
    trackWrite, gridRunEt, gridRunT, dispatchDelayGrid: (gridRunEt !== null && gridRunT !== null) ? r1(gridRunT - gridRunEt) : null,
    panelOnset, panelKind, tabVisEt: visRun ? rel(visRun.et) : null,
    panelMinusTrackWrite: (panelOnsetImmune !== null && trackWrite !== null) ? r1(panelOnsetImmune - trackWrite) : null,
    gridEtMinusWrite: (gridRunEt !== null && trackWrite !== null) ? r1(gridRunEt - trackWrite) : null,
    gridEtMinusPanel: (gridRunEt !== null && panelOnsetImmune !== null) ? r1(gridRunEt - panelOnsetImmune) : null,
    proseMove, moveMinusGridEt: (proseMove !== null && gridRunEt !== null) ? r1(proseMove - gridRunEt) : null,
    gridEnd: gend ? rel(gend.t) : null, gridElapsed: gend ? gend.elapsed : null,
    tabTransform: ev.filter(e => e.type === 'transitionrun' && e.dock).map(e => e.prop),
    coverAnims: an.filter(a => a.target === 'column' || a.target === 'card').map(a => a.target + ':' + (a.startTime === null ? 'null' : r1(a.startTime - base)) + '+dur' + a.duration)
  })
}

const H = ['file', 'dir', 'ON/OFF', 'session', 'rAFn', 'maxGap', 'ivGap', 'trackWrite', 'gridRun(et)', 'gridRun(handler)', 'dispatchDelay', 'panelOnset[' + 'kind' + ']', 'panel-write', 'grid(et)-write', 'grid(et)-panel', 'proseMove', 'move-grid(et)', 'gridEnd/elapsed']
console.log('| ' + H.join(' | ') + ' |')
console.log('|' + H.map(() => '---').join('|') + '|')
for (const r of rows) {
  console.log('| ' + [r.file, r.dir, r.on ? 'ON' : 'OFF', r.session, r.n, r.maxGap, r.ivGap, r.trackWrite, r.gridRunEt, r.gridRunT, r.dispatchDelayGrid,
    r.panelOnset + ' (' + r.panelKind + ')', r.panelMinusTrackWrite, r.gridEtMinusWrite, r.gridEtMinusPanel, r.proseMove, r.moveMinusGridEt,
  r.gridEnd + '/' + r.gridElapsed].join(' | ') + ' |')
}
console.log('\n--- 详情 ---')
for (const r of rows) console.log(JSON.stringify({ file: r.file, tabTransform: r.tabTransform, tabVisEt: r.tabVisEt, coverAnims: r.coverAnims }))
