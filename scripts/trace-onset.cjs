'use strict'
// trace-onset.cjs — 逐帧打印关键字段变化，定位「右栏首次可见变化」与「中栏首次位移」
const fs = require('fs'); const path = require('path')
const DIR = path.join(__dirname, '..', '.probe-panel-onset')
const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const r1 = v => (v === null || v === undefined) ? null : Math.round(v * 10) / 10

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
  const R = j.result || {}
  const fr = R.frames || []
  console.log('\n##### ' + f + '  dir=' + j.direction + ' off=' + j.glideOff + ' rAFn=' + fr.length + ' maxGap=' + R.maxGap + ' ivGap=' + ((R.iv || {}).maxGap))
  const keys = ['proseL', 'centerW', 'tabL', 'dockL', 'dockVis', 'dockTr', 'panelVis', 'panelAriaHidden', 'panelOpenAttr', 'third', 'railW', 'composerL', 'scrollW']
  let prev = null
  const rows = []
  for (let i = 0; i < fr.length; i++) {
    const s = fr[i]
    const cur = {}
    for (const k of keys) cur[k] = (k === 'dockTr') ? (s[k] === null ? null : String(s[k]).slice(0, 12)) : s[k]
    const changed = !prev ? keys : keys.filter(k => cur[k] !== prev[k])
    if (!prev || changed.length) {
      rows.push({ at: s.at, gap: s.gap, changed: prev ? changed.join(',') : 'INIT', ...cur })
      prev = cur
    }
  }
  for (const r of rows) console.log(JSON.stringify(r))
  // 事件时序
  const base = fr.length ? fr[0].t : 0
  const ev = (R.events || []).filter(e => e.type === 'transitionrun').map(e => ({ at: r1(e.t - base), type: e.type, prop: e.prop, target: e.target, dock: e.dock }))
  console.log('-- transitionrun: ' + JSON.stringify(ev))
  const tw = (R.writes || []).filter(x => x.host === 'frame' && x.attr === 'style').map(x => ({ at: r1(x.t - base), gtc: x.gtc }))
  console.log('-- frame style writes: ' + JSON.stringify(tw))
  const hw = (R.writes || []).filter(x => x.attr === 'class' || x.attr === 'aria-hidden' || String(x.attr || '').indexOf('sidebar') >= 0).map(x => ({ at: r1(x.t - base), host: x.host, attr: x.attr, from: String(x.from || '').slice(0, 26), to: String(x.to || '').slice(0, 40) }))
  console.log('-- class/aria/sidebar writes: ' + JSON.stringify(hw))
  const mt = (R.mounts || []).map(m => ({ at: r1(m.t - base), kind: m.kind, attr: m.attr, cls: m.cls, r: m.r, vis: m.vis }))
  console.log('-- mounts: ' + JSON.stringify(mt))
  const ss = (R.styleSets || []).map(x => ({ at: r1(x.t - base), css: String(x.cssText).slice(0, 50), via: x.via }))
  console.log('-- styleSets: ' + JSON.stringify(ss))
  const evAll = (R.events || []).map(e => ({ t: r1(e.t - base), et: e.et === undefined ? null : r1(e.et - base), type: e.type, prop: e.prop, target: e.target }))
  console.log('-- all events: ' + JSON.stringify(evAll))
}
