'use strict'
// analyze-onset.cjs — 从 .probe-panel-onset/*.json 提取 实验A/C 判据
const fs = require('fs'); const path = require('path')
const DIR = path.join(__dirname, '..', '.probe-panel-onset')
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'))

const r1 = v => (v === null || v === undefined) ? null : Math.round(v * 10) / 10
const rel = (t, base) => (t === null || t === undefined || base === null) ? null : Math.round((t - base) * 10) / 10

function analyze(file) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'))
  const R = j.result || {}
  const fr = R.frames || []
  const base = fr.length ? fr[0].t : null
  const out = { file, label: j.label, dir: j.direction, glideOff: j.glideOff, session: j.session, parkedOK: j.parkedOK }
  out.rAF = { n: fr.length, maxGap: R.maxGap }
  out.iv = { n: (R.iv || {}).count, maxGap: (R.iv || {}).maxGap }
  out.vis = R.visibilityAtStart
  out.clickAtRel = rel(R.clickAt, base)

  // ---- track write: frame attribute/style mutations ----
  const w = R.writes || []
  const fw = w.filter(x => x.host === 'frame' && (x.attr === 'style' || x.attr === 'data-rightbar-collapsed' || x.attr === 'data-animating'))
  out.trackWrites = fw.map(x => ({ at: rel(x.t, base), attr: x.attr, from: x.from, to: x.to, gtc: x.gtc }))
  const gtcChange = fw.find(x => x.attr === 'style' && x.gtc && /\d/.test(String(x.gtc)))
  out.trackWrite = gtcChange ? rel(gtcChange.t, base) : null
  // html class writes (enhc-instant)
  out.htmlClassWrites = w.filter(x => x.host === 'html' || (x.attr === 'class' && String(x.to || '').indexOf('enhc') >= 0))
    .map(x => ({ at: rel(x.t, base), host: x.host, attr: x.attr, from: x.from, to: x.to }))
  out.railWrites = w.filter(x => x.attr === 'style' && String(x.to || '').indexOf('--dsx-rail-w') >= 0)
    .map(x => ({ at: rel(x.t, base), from: x.from, to: x.to }))
  out.panelAttrWrites = w.filter(x => String(x.attr || '').indexOf('sidebar-right') >= 0 || x.attr === 'aria-hidden')
    .map(x => ({ at: rel(x.t, base), host: x.host, attr: x.attr, from: x.from, to: x.to }))

  // ---- transition events ----
  const ev = R.events || []
  out.gridTransitionRun = ev.filter(e => e.type === 'transitionrun' && e.prop === 'grid-template-columns').map(e => rel(e.t, base))
  out.gridTransitionStart = ev.filter(e => e.type === 'transitionstart' && e.prop === 'grid-template-columns').map(e => rel(e.t, base))
  out.gridTransitionEnd = ev.filter(e => e.type === 'transitionend' && e.prop === 'grid-template-columns').map(e => ({ at: rel(e.t, base), elapsed: e.elapsed }))
  out.dockTransitionRun = ev.filter(e => e.type === 'transitionrun' && e.dock).map(e => ({ at: rel(e.t, base), prop: e.prop, target: e.target }))
  out.scrollTransitionRun = ev.filter(e => e.type === 'transitionrun' && e.target === 'scrollBody').map(e => ({ at: rel(e.t, base), prop: e.prop }))
  out.allTransitionRun = ev.filter(e => e.type === 'transitionrun').map(e => ({ at: rel(e.t, base), prop: e.prop, target: e.target, dock: e.dock }))
  out.dockTransitionEnd = ev.filter(e => e.type === 'transitionend' && e.dock).map(e => ({ at: rel(e.t, base), prop: e.prop, elapsed: e.elapsed }))

  // ---- first visible changes from rAF frames ----
  const pre = R.pre || {}
  function firstChange(key, eps) {
    const p0 = pre[key]
    for (let i = 0; i < fr.length; i++) {
      const v = fr[i][key]
      if (v === null || v === undefined) continue
      if (p0 === null || p0 === undefined) return { at: fr[i].at, from: p0, to: v, i }
      if (Math.abs(v - p0) > (eps === undefined ? 0.5 : eps)) return { at: fr[i].at, from: p0, to: v, i }
    }
    return null
  }
  out.firstMove = {
    proseL: firstChange('proseL', 0.5),
    centerW: firstChange('centerW', 0.5),
    tabL: firstChange('tabL', 0.5),
    dockL: firstChange('dockL', 0.5),
    composerL: firstChange('composerL', 0.5),
    railW: firstChange('railW', 0.5)
  }
  // first non-null appearance of dock (open mounts it)
  out.dockAppear = null
  for (let i = 0; i < fr.length; i++) { if (fr[i].dockL !== null && fr[i].dockL !== undefined) { out.dockAppear = { at: fr[i].at, dockL: fr[i].dockL, dockVis: fr[i].dockVis, i }; break } }
  out.panelAppear = null
  for (let i = 0; i < fr.length; i++) { if (fr[i].panelL !== null && fr[i].panelL !== undefined) { out.panelAppear = { at: fr[i].at, panelL: fr[i].panelL, panelVis: fr[i].panelVis, openAttr: fr[i].panelOpenAttr, i }; break } }
  // first frame where dock visibility or transform changes
  out.dockVisChange = null; out.tabVisChange = null; out.dockTrChange = null
  for (let i = 1; i < fr.length; i++) {
    if (!out.dockVisChange && fr[i].dockVis && fr[i - 1].dockVis && fr[i].dockVis !== fr[i - 1].dockVis) out.dockVisChange = { at: fr[i].at, from: fr[i - 1].dockVis, to: fr[i].dockVis }
    if (!out.tabVisChange && fr[i].tabVis && fr[i - 1].tabVis && fr[i].tabVis !== fr[i - 1].tabVis) out.tabVisChange = { at: fr[i].at, from: fr[i - 1].tabVis, to: fr[i].tabVis }
    if (!out.dockTrChange && fr[i].dockTr && fr[i - 1].dockTr && fr[i].dockTr !== fr[i - 1].dockTr) out.dockTrChange = { at: fr[i].at, from: String(fr[i - 1].dockTr).slice(0, 30), to: String(fr[i].dockTr).slice(0, 30) }
  }

  // ---- animations onset (startTime = document timeline, starvation-immune) ----
  const an = R.anims || []
  out.anims = an.map(a => ({ prop: a.prop, target: a.target, startTime: a.startTime, duration: a.duration, delay: a.delay, seenAt: rel(a.seenAt, base), currentTime: a.currentTime }))
  const withST = an.filter(a => a.startTime !== null)
  out.gridAnimStart = withST.filter(a => a.prop === 'grid-template-columns').map(a => a.startTime)
  out.dockAnimStart = withST.filter(a => a.prop === 'transform' || a.prop === 'visibility' || a.prop === 'opacity').map(a => ({ prop: a.prop, target: a.target, startTime: a.startTime, duration: a.duration, delay: a.delay }))
  out.loaf = R.loaf || []
  out.loafMax = out.loaf.length ? Math.max.apply(null, out.loaf.map(l => l.blocking)) : 0
  out.loafSum = out.loaf.reduce((s, l) => s + l.blocking, 0)
  out.errors = R.errors || []
  return out
}

const rows = files.map(analyze)
const summary = rows.map(r => ({
  file: r.file, dir: r.dir, off: r.glideOff,
  rAFn: r.rAF.n, rAFgap: r.rAF.maxGap, ivn: r.iv.n, ivgap: r.iv.maxGap,
  clickRel: r.clickAtRel, trackWrite: r.trackWrite,
  gridRun: r.gridTransitionRun[0], dockRun: r.dockTransitionRun[0] ? r.dockTransitionRun[0].at : null,
  dockRunProp: r.dockTransitionRun.map(d => d.prop).join('+'),
  dockMinusGrid: (r.dockTransitionRun[0] && r.gridTransitionRun[0] !== undefined) ? r1(r.gridTransitionRun[0] - r.dockTransitionRun[0].at) : null,
  gridMinusWrite: (r.gridTransitionRun[0] !== undefined && r.trackWrite !== null) ? r1(r.gridTransitionRun[0] - r.trackWrite) : null,
  proseMove: r.firstMove.proseL ? r.firstMove.proseL.at : null,
  centerWMove: r.firstMove.centerW ? r.firstMove.centerW.at : null,
  tabLMove: r.firstMove.tabL ? r.firstMove.tabL.at : null,
  dockAppear: r.dockAppear ? r.dockAppear.at : null,
  gridEnd: r.gridTransitionEnd[0] ? r.gridTransitionEnd[0].at : null,
  gridEndElapsed: r.gridTransitionEnd[0] ? r.gridTransitionEnd[0].elapsed : null,
  loafSum: r1(r.loafSum), loafMax: r1(r.loafMax)
}))
console.log(JSON.stringify(summary, null, 1))
const long = process.argv.includes('--full')
if (long) console.log(JSON.stringify(rows, null, 1))
