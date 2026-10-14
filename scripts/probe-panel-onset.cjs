'use strict'
// probe-panel-onset.cjs — 实验 A/C：右栏「看起来开始动」的时刻 vs 轨道写入时刻
// 用法: node scripts/probe-panel-onset.cjs <open|close> <label>
//   DSH_SESSION=<会话名子串>   DSH_PANEL_GLIDE=off 剥掉 enhc-panel-glide 根类
// 产物: D:\dsh-home\plugins\dsh-widgets\.probe-panel-onset\<label>.json
const fs = require('fs')
const path = require('path')

let chromium = null
const CAND = [
  'playwright-core',
  './lib/playwright-core.cjs',
  'C:/Users/12404/AppData/Local/npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright-core'
]
for (const c of CAND) {
  try { chromium = require(c).chromium; break } catch (e) { /* next */ }
}
if (!chromium) { console.error('FATAL: playwright-core not resolvable'); process.exit(2) }
const { chromePath } = require('./lib/chrome.cjs')
const { mintCookie } = require('./diag-auth-lib.cjs')

const URL_ = process.env.DSH_URL || 'http://127.0.0.1:19387'
const SESSION = process.env.DSH_SESSION || 'Laya与RRSI必要性1天'
const DIRECTION = String(process.argv[2] || 'open').toLowerCase()
const LABEL = String(process.argv[3] || DIRECTION)
const GLIDE_OFF = process.env.DSH_PANEL_GLIDE === 'off'
const CLICK_DELAY = Number(process.env.DSH_CLICK_DELAY || 260)
const SAMPLE_MS = Number(process.env.DSH_SAMPLE_MS || 1700)
const OUT = path.join(__dirname, '..', '.probe-panel-onset', LABEL + '.json')

// ---------------- in-page instrumentation (no backticks anywhere) ----------------
function IN_PAGE(cfg) {
  var out = {
    direction: cfg.direction, glideOff: !!cfg.glideOff, label: cfg.label,
    events: [], writes: [], frames: [], anims: [], loaf: [], errors: [],
    clicked: null, pre: null, post: null, styles: {}, host: {}, url: location.href,
    startedAt: performance.now()
  }
  var S = {
    frame: '[class$="_frame"]',
    prose: '[class*="_column"]',
    center: '[class*="centerCol"]',
    scroll: '[class$="_scrollBody"]',
    tab: '[class*="_tabCell"]',
    rail: '[class*="dsx-stats-rail"]',
    composer: '[data-slot="conversation.composer.bar"] [class*="_card"]',
    panel: '[data-sidebar-right-panel]',
    dock: '[data-sidebar-right-panel] [data-dockkit-host="dock"]',
    toggle: '[data-sidebar-right-toggle],[data-sidebar-right-expand]'
  }
  out.selectors = S
  function q(s) { try { return document.querySelector(s) } catch (e) { return null } }
  function r2(v) { return Math.round(v * 10) / 10 }
  function rect(el) {
    if (!el) return null
    var r = el.getBoundingClientRect()
    return { l: r2(r.left), t: r2(r.top), w: r2(r.width), h: r2(r.height) }
  }
  function shortCls(el) {
    if (!el) return null
    var cn = String(el.className || '')
    var m = cn.match(/_([A-Za-z0-9]+)_[0-9a-zA-Z]+_[0-9]+/)
    if (m) return m[1]
    var m2 = cn.match(/([A-Za-z][A-Za-z0-9]*)$/)
    return m2 ? m2[1] : cn.slice(0, 30)
  }
  function desc(el) {
    if (!el) return null
    var o = { tag: el.tagName, cls: String(el.className || ''), short: shortCls(el), r: rect(el) }
    try {
      o.vis = getComputedStyle(el).visibility
      o.tr = getComputedStyle(el).transform
      o.op = getComputedStyle(el).opacity
    } catch (e) { }
    return o
  }
  function thirdPx() {
    var f = q(S.frame)
    if (!f) return null
    var raw = f.style.gridTemplateColumns || ''
    var parts = raw.match(/minmax\([^)]*\)|[^\s]+/g) || []
    if (parts.length < 3) return null
    var m = parts[2].match(/minmax\(\s*[^,]+,\s*([^)]+)\)/)
    var s = m ? m[1] : parts[2]
    var v = parseFloat(s)
    return isNaN(v) ? null : v
  }
  function geom() {
    var f = q(S.frame), p = q(S.prose), c = q(S.center), sb = q(S.scroll)
    var tb = q(S.tab), rl = q(S.rail), cp = q(S.composer), dk = q(S.dock)
    var pn = q(S.panel)
    var pr = rect(p), cr = rect(c), dr = rect(dk), trr = rect(tb), cpr = rect(cp)
    var pnr = rect(pn)
    var dc = null, tc2 = null, pc2 = null
    try { dc = dk ? getComputedStyle(dk) : null } catch (e) { }
    try { tc2 = tb ? getComputedStyle(tb) : null } catch (e) { }
    try { pc2 = pn ? getComputedStyle(pn) : null } catch (e) { }
    return {
      t: r2(performance.now()),
      timeline: (typeof document.timeline !== 'undefined' && document.timeline.currentTime) ? r2(document.timeline.currentTime) : null,
      frameW: f ? r2(f.getBoundingClientRect().width) : null,
      gtc: f ? f.style.gridTemplateColumns : null,
      third: thirdPx(),
      proseL: pr ? pr.l : null, proseW: pr ? pr.w : null, proseN: document.querySelectorAll(S.prose).length,
      centerL: cr ? cr.l : null, centerW: cr ? cr.w : null,
      scrollW: sb ? r2(sb.getBoundingClientRect().width) : null,
      tabL: trr ? trr.l : null, tabW: trr ? trr.w : null,
      tabVis: tc2 ? tc2.visibility : null, tabTr: tc2 ? tc2.transform : null,
      panelL: pnr ? pnr.l : null, panelW: pnr ? pnr.w : null,
      panelVis: pc2 ? pc2.visibility : null, panelAriaHidden: pn ? pn.getAttribute('aria-hidden') : null,
      panelOpenAttr: pn ? pn.hasAttribute('data-sidebar-right-open') : null,
      dockL: dr ? dr.l : null, dockW: dr ? dr.w : null,
      dockVis: dc ? dc.visibility : null,
      dockTr: dc ? dc.transform : null,
      composerL: cpr ? cpr.l : null, composerW: cpr ? cpr.w : null,
      railW: rl ? r2(rl.getBoundingClientRect().width) : null
    }
  }
  out.host = {
    panel: desc(q(S.panel)), dock: desc(q(S.dock)), tabCell: desc(q(S.tab)),
    frame: desc(q(S.frame)), prose: desc(q(S.prose)), center: desc(q(S.center))
  }
  try {
    var fr = q(S.frame)
    if (fr) {
      var fcs = getComputedStyle(fr)
      out.styles.frame = { tp: fcs.transitionProperty, td: fcs.transitionDuration, tf: fcs.transitionTimingFunction }
    }
    var pr = q(S.prose)
    if (pr) {
      var pcs = getComputedStyle(pr)
      out.styles.prose = { tp: pcs.transitionProperty, td: pcs.transitionDuration, tf: pcs.transitionTimingFunction }
    }
    var dk = q(S.dock)
    if (dk) {
      var dcs = getComputedStyle(dk)
      out.styles.dock = {
        tp: dcs.transitionProperty, td: dcs.transitionDuration, tf: dcs.transitionTimingFunction,
        vis: dcs.visibility, tr: dcs.transform
      }
      out.styles.dockVarW = getComputedStyle(document.documentElement).getPropertyValue('--dsh-sidebar-width')
      out.styles.dockVarSlow = getComputedStyle(document.documentElement).getPropertyValue('--ds-transition-duration-slow')
    }
    out.styles.htmlCls = String(document.documentElement.className)
    out.styles.bodyCls = String(document.body.className)
  } catch (e) { out.errors.push('styles: ' + e.message) }

  // ---- childList observer: exact (unquantized) mount/unmount of the right panel dock ----
  var mounts = []
  function isDockNode(n) {
    if (!n || n.nodeType !== 1) return null
    if (n.getAttribute && n.getAttribute('data-dockkit-host')) return n
    if (n.querySelector) return n.querySelector('[data-dockkit-host]')
    return null
  }
  var mo2 = new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]
      var added = r.addedNodes || [], removed = r.removedNodes || []
      for (var a = 0; a < added.length; a++) {
        var dn = isDockNode(added[a])
        if (dn) mounts.push({ t: r2(performance.now()), kind: 'dock-add', cls: String(dn.className || '').slice(0, 40), r: rect(dn), vis: (function () { try { return getComputedStyle(dn).visibility } catch (e) { return null } })() })
      }
      for (var rm = 0; rm < removed.length; rm++) {
        var dr = isDockNode(removed[rm])
        if (dr) mounts.push({ t: r2(performance.now()), kind: 'dock-remove', cls: String(dr.className || '').slice(0, 40) })
      }
      if (r.type === 'attributes' && String(r.attributeName).indexOf('sidebar-right') >= 0) {
        mounts.push({ t: r2(performance.now()), kind: 'attr', attr: r.attributeName, target: shortCls(r.target) })
      }
    }
  })
  try {
    var host2 = q('[class$="_rightbarCol"]') || document.body
    mo2.observe(host2, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sidebar-right-open', 'aria-hidden'] })
  } catch (e) { out.errors.push('mo2: ' + e.message) }

  // ---- transition events (capture); et = engine-assigned timeStamp (NOT delayed by dispatch) ----
  function onTrans(ev) {
    try {
      out.events.push({
        t: r2(performance.now()), et: r2(ev.timeStamp), type: ev.type, prop: ev.propertyName || ev.animationName,
        elapsed: r2(ev.elapsedTime || 0), target: shortCls(ev.target),
        targetCls: String((ev.target && ev.target.className) || '').slice(0, 60),
        dock: !!(ev.target && ev.target.getAttribute && ev.target.getAttribute('data-dockkit-host'))
      })
    } catch (e) { }
  }
  ;['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'animationstart', 'animationend', 'animationcancel'].forEach(function (k) {
    document.addEventListener(k, onTrans, true)
  })

  // ---- synchronous style-write hook: catches el.style.gridTemplateColumns = x with no MO delay ----
  var styleSets = []
  try {
    var proto = window.CSSStyleDeclaration.prototype
    var desc = Object.getOwnPropertyDescriptor(proto, 'gridTemplateColumns')
    if (desc && desc.set) {
      Object.defineProperty(proto, 'gridTemplateColumns', {
        configurable: true, enumerable: desc.enumerable,
        get: desc.get,
        set: function (v) {
          try {
            styleSets.push({ t: r2(performance.now()), cssText: String(v) })
          } catch (e) { }
          return desc.set.call(this, v)
        }
      })
    }
    var sp = proto.setProperty
    proto.setProperty = function (name, val, prio) {
      try { if (String(name).toLowerCase() === 'grid-template-columns') styleSets.push({ t: r2(performance.now()), via: 'setProperty', cssText: String(val) }) } catch (e) { }
      return sp.call(this, name, val, prio)
    }
  } catch (e) { out.errors.push('styleHook: ' + e.message) }

  // ---- attribute / inline-style writes ----
  var observed = []
  try {
    observed.push(document.documentElement)
    var fe = q(S.frame); if (fe) observed.push(fe)
    var se = q(S.scroll); if (se) observed.push(se)
    var te = q(S.tab); if (te) observed.push(te)
    var pe = q(S.panel); if (pe) observed.push(pe)
    var de = q(S.dock); if (de) observed.push(de)
  } catch (e) { }
  var mo = new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]
      out.writes.push({
        t: r2(performance.now()), host: shortCls(r.target), attr: r.attributeName,
        from: r.oldValue === null ? null : String(r.oldValue).slice(0, 120),
        to: r.target.getAttribute ? String(r.target.getAttribute(r.attributeName) || '').slice(0, 120) : null,
        gtc: (function () { var f = q(S.frame); return f ? f.style.gridTemplateColumns : null })(),
        htmlCls: String(document.documentElement.className),
        dockVis: (function () { var d = q(S.dock); return d ? getComputedStyle(d).visibility : null })(),
        dockTr: (function () { var d = q(S.dock); return d ? getComputedStyle(d).transform : null })()
      })
    }
  })
  for (var oi = 0; oi < observed.length; oi++) {
    try {
      mo.observe(observed[oi], { attributes: true, attributeOldValue: true })
    } catch (e) { out.errors.push('observe: ' + e.message) }
  }

  // ---- animations: startTime is starvation-immune (document timeline ms) ----
  var seen = {}
  function snapAnims(tag) {
    var list = []
    try { list = document.getAnimations() } catch (e) { return }
    for (var i = 0; i < list.length; i++) {
      var a = list[i]
      var st = a.startTime
      var eff = a.effect || null
      var tg = eff && eff.target ? shortCls(eff.target) : null
      var tgCls = eff && eff.target ? String(eff.target.className || '').slice(0, 60) : null
      var prop = 'n/a'
      try {
        if (a.transitionProperty) prop = a.transitionProperty
        else if (a.animationName) prop = 'anim:' + a.animationName
      } catch (e) { }
      if (prop === 'n/a') {
        try {
          var kf = eff.getKeyframes()
          for (var k = 0; k < kf.length; k++) { if (kf[k].property) { prop = kf[k].property; break } }
        } catch (e) { }
      }
      var key = tg + '|' + prop + '|' + String(st)
      if (seen[key]) continue
      seen[key] = 1
      var tim = {}
      try { tim = eff ? eff.getTiming() : {} } catch (e) { }
      out.anims.push({
        tag: tag, seenAt: r2(performance.now()),
        startTime: (typeof st === 'number') ? r2(st) : null,
        prop: prop, target: tg, targetCls: tgCls,
        duration: tim.duration === undefined ? null : tim.duration,
        delay: tim.delay === undefined ? null : tim.delay,
        currentTime: (a.currentTime === null || a.currentTime === undefined) ? null : r2(a.currentTime),
        playState: a.playState
      })
    }
  }

  // ---- long animation frames ----
  try {
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.indexOf('long-animation-frame') >= 0) {
      var po = new PerformanceObserver(function (l) {
        var es = l.getEntries()
        for (var i = 0; i < es.length; i++) {
          out.loaf.push({ start: r2(es[i].startTime), dur: r2(es[i].duration), blocking: r2(es[i].blockingDuration || 0) })
        }
      })
      po.observe({ type: 'long-animation-frame', buffered: true })
    }
  } catch (e) { out.errors.push('loaf: ' + e.message) }

  // ---- rAF frame sampler ----
  var frames = []
  var maxGap = 0
  var last = performance.now()
  out.pre = geom()
  var T0 = performance.now()
  var clickAt = null
  var TOTAL = cfg.clickDelay + cfg.sampleMs

  function tick() {
    var now = performance.now()
    var g = now - last
    if (g > maxGap) maxGap = g
    last = now
    snapAnims('raf')
    var s = geom()
    s.gap = r2(g)
    s.at = r2(now - T0)
    frames.push(s)
    if (now - T0 < TOTAL) requestAnimationFrame(tick)
    else finish()
  }

  // backup anim sampler independent of rAF
  var iv = setInterval(function () { snapAnims('iv') }, 30)

  // starvation channel: the setInterval(16) sampler that the OLD probe used.
  // If this yields very few samples while rAF yields hundreds, the old probe measured
  // timer clamping (headless page treated as hidden), NOT main-thread starvation.
  var ivFrames = []
  var ivMaxGap = 0
  var ivLast = performance.now()
  var ivT0 = ivLast
  var ivGaps = []
  out.visibilityChanges = []
  out.visibilityAtStart = document.visibilityState
  var iv16 = setInterval(function () {
    var now = performance.now()
    var g = now - ivLast
    ivLast = now
    if (g > ivMaxGap) ivMaxGap = g
    ivGaps.push(r2(g))
    // Geometry here, not just the timestamp: this sampler runs as a TASK, so it
    // observes what the previous frame PAINTED. The rAF sampler reads during the
    // frame's rAF phase, i.e. BEFORE a later rAF callback (the plugin's cover
    // driver) has written, so it reports the layout while this one reports the
    // paint — the only channel that can see a flash.
    var p = q(S.prose), f = q(S.frame), d = q(S.dock), cp = q(S.composer)
    var pr = p ? p.getBoundingClientRect() : null
    var cpr = cp ? cp.getBoundingClientRect() : null
    ivFrames.push({
      t: r2(now), at: r2(now - ivT0), g: r2(g),
      pL: pr ? r2(pr.left) : null, pW: pr ? r2(pr.width) : null,
      cL: cpr ? r2(cpr.left) : null, cW: cpr ? r2(cpr.width) : null,
      third: thirdPx(),
      dockTr: (function () { try { return d ? getComputedStyle(d).transform : null } catch (e) { return null } })(),
      dockVis: (function () { try { return d ? getComputedStyle(d).visibility : null } catch (e) { return null } })(),
      pTr: (function () { try { return p ? getComputedStyle(p).transform : null } catch (e) { return null } })()
    })
  }, 16)
  document.addEventListener('visibilitychange', function () {
    out.visibilityChanges.push({ t: r2(performance.now()), state: document.visibilityState })
  })

  function clickIt() {
    try {
      if (cfg.glideOff) document.documentElement.classList.remove('enhc-panel-glide')
      var btns = document.querySelectorAll(S.toggle)
      var target = null
      for (var i = 0; i < btns.length; i++) {
        var r = btns[i].getBoundingClientRect()
        if (r.width > 0 && r.left >= 0 && r.right <= window.innerWidth) { target = btns[i]; break }
      }
      if (!target && btns.length) target = btns[0]
      var fe = q(S.frame)
      out.clicked = {
        n: btns.length,
        cls: target ? String(target.className) : null,
        rt: target ? target.getAttribute('data-sidebar-right-toggle') : null,
        ex: target ? target.getAttribute('data-sidebar-right-expand') : null,
        aria: target ? target.getAttribute('aria-label') : null,
        r: rect(target),
        htmlCls: String(document.documentElement.className),
        thirdBefore: thirdPx(),
        frameInlineBefore: fe ? fe.style.gridTemplateColumns : null,
        preThird: out.pre ? out.pre.third : null
      }
      clickAt = performance.now()
      out.clickAt = r2(clickAt)
      if (target) target.click()
    } catch (e) { out.errors.push('click: ' + e.message) }
  }

  function finish() {
    clearInterval(iv)
    clearInterval(iv16)
    try { mo.disconnect() } catch (e) { }
    try { mo2.disconnect() } catch (e) { }
    out.mounts = mounts
    out.styleSets = styleSets
    out.frames = frames
    out.maxGap = r2(maxGap)
    out.frameCount = frames.length
    out.iv = { count: ivFrames.length, maxGap: r2(ivMaxGap), frames: ivFrames, gaps: ivGaps }
    out.post = geom()
    out.htmlClsAfter = String(document.documentElement.className)
    out.finishedAt = r2(performance.now())
    out.totalMs = r2(out.finishedAt - T0)
    resolve(out)
  }

  var resolve = null
  var p = new Promise(function (res) { resolve = res })
  requestAnimationFrame(tick)
  setTimeout(clickIt, cfg.clickDelay)
  return p
}
// ---------------- end in-page ----------------

async function readState(page) {
  return page.evaluate(function () {
    var f = document.querySelector('[class$="_frame"]')
    var raw = f ? (f.style.gridTemplateColumns || '') : ''
    var parts = raw.match(/minmax\([^)]*\)|[^\s]+/g) || []
    var px = null
    if (parts.length >= 3) {
      var m = parts[2].match(/minmax\(\s*[^,]+,\s*([^)]+)\)/)
      var v = parseFloat(m ? m[1] : parts[2])
      px = isNaN(v) ? null : v
    }
    var dk = document.querySelector('[data-sidebar-right-panel] [data-dockkit-host="dock"]')
    return {
      thirdPx: px,
      open: px !== null ? px > 1 : !f.hasAttribute('data-rightbar-collapsed'),
      rtCollapsed: f ? f.getAttribute('data-rightbar-collapsed') : null,
      htmlCls: String(document.documentElement.className),
      panelOpenAttr: !!document.querySelector('[data-sidebar-right-open]'),
      dockVis: dk ? getComputedStyle(dk).visibility : null,
      frameInline: raw
    }
  })
}

async function clickToggle(page) {
  return page.evaluate(function () {
    var btns = document.querySelectorAll('[data-sidebar-right-toggle],[data-sidebar-right-expand]')
    for (var i = 0; i < btns.length; i++) {
      var r = btns[i].getBoundingClientRect()
      if (r.width > 0 && r.left >= 0 && r.right <= window.innerWidth) { btns[i].click(); return 'clicked:' + (btns[i].getAttribute('aria-label') || '') }
    }
    if (btns.length) { btns[0].click(); return 'clicked-fallback' }
    return 'none'
  })
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  // DIRECTION names the ACTION the click performs:
  //   open  => park COLLAPSED, then click opens the panel
  //   close => park OPEN, then click collapses the panel
  const want = DIRECTION === 'close'
  const headless = process.env.DSH_HEADFUL !== '1'
  const browser = await chromium.launch({ executablePath: chromePath(), headless: headless, args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1, locale: 'zh-CN' })
  const c = mintCookie('127.0.0.1:19387')
  await ctx.addCookies([{ name: c.name, value: c.value, domain: '127.0.0.1', path: '/' }])
  const page = await ctx.newPage()
  const shell = { url: URL_, session: SESSION, direction: DIRECTION, label: LABEL, glideOff: GLIDE_OFF, errors: [] }
  try {
    await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1200)
    // 会话行是异步拉取的：必须等到列表真的出现，否则点击落空、body 仍是空态
    try {
      await page.waitForFunction(function () { return document.querySelectorAll('[class*="sessionRow"]').length > 1 }, { timeout: 20000 })
    } catch (e) { shell.rowWaitTimeout = true }
    await page.waitForTimeout(800)
    // 离开空态：点会话行
    const rows = page.locator('[class*="sessionRow"]')
    const n = await rows.count()
    const key = SESSION.replace(/\s+/g, '')
    let hit = -1
    for (let i = 0; i < n; i++) {
      let t = ''
      try { t = (await rows.nth(i).innerText()).replace(/\s+/g, '') } catch (e) { }
      if (t.indexOf(key) >= 0) { hit = i; break }
    }
    if (hit < 0) { for (let i = 0; i < n; i++) { let t = ''; try { t = await rows.nth(i).innerText() } catch (e) { } if (t.indexOf('Laya') >= 0 || t.indexOf('RRSI') >= 0) { hit = i; break } } }
    if (hit >= 0) { await rows.nth(hit).click(); shell.sessionRowIndex = hit } else { shell.sessionRowMiss = true }
    // 等到真正离开空态（prose 出现），不再是死等固定毫秒
    try {
      await page.waitForFunction(function () {
        return !document.body.classList.contains('dsx-stats-no-session') && document.querySelector('[class*="_column"]') !== null
      }, { timeout: 25000 })
    } catch (e) { shell.sessionLoadTimeout = true }
    await page.waitForTimeout(1500)
    shell.noSession = await page.evaluate(function () { return document.body.classList.contains('dsx-stats-no-session') })
    // 归位到目标起始态
    for (let i = 0; i < 6; i++) {
      const st = await readState(page)
      shell['park' + i] = st
      if (st.open === want) break
      await clickToggle(page)
      await page.waitForTimeout(1100)
    }
    shell.parked = await readState(page)
    shell.parkedOK = (shell.parked.open === want)
    if (GLIDE_OFF) {
      await page.evaluate(function () { document.documentElement.classList.remove('enhc-panel-glide') })
      await page.waitForTimeout(600)
      shell.afterGlideOff = await readState(page)
    }
    const res = await page.evaluate(IN_PAGE, { direction: DIRECTION, label: LABEL, glideOff: GLIDE_OFF, clickDelay: CLICK_DELAY, sampleMs: SAMPLE_MS })
    const dump = Object.assign({}, shell, { result: res })
    fs.writeFileSync(OUT, JSON.stringify(dump, null, 1), 'utf8')
    // ---- summary ----
    const fr = res.frames || []
    const pre = res.pre || {}
    const ev = res.events || []
    const an = res.anims || []
    const trun = ev.filter(function (e) { return e.type === 'transitionrun' && e.prop === 'grid-template-columns' })
    const dockRun = ev.filter(function (e) { return e.type === 'transitionrun' && e.dock })
    const gridAnim = an.filter(function (a) { return a.prop === 'grid-template-columns' })
    const dockAnim = an.filter(function (a) { return String(a.target) === 'tabCell' || a.prop === 'transform' || a.prop === 'visibility' })
    console.log('=== ' + LABEL + ' dir=' + DIRECTION + ' glideOff=' + GLIDE_OFF + ' session=' + SESSION)
    console.log('parked: ' + JSON.stringify(shell.parked))
    console.log('clicked: ' + JSON.stringify(res.clicked))
    console.log('frames=' + fr.length + ' maxGap=' + res.maxGap + ' totalMs=' + res.totalMs)
    console.log('parkedOK=' + shell.parkedOK + ' iv.count=' + ((res.iv || {}).count) + ' iv.maxGap=' + ((res.iv || {}).maxGap) + ' vis=' + res.visibilityAtStart + ' visChanges=' + JSON.stringify(res.visibilityChanges))
    console.log('pre: proseL=' + pre.proseL + ' centerW=' + pre.centerW + ' dockL=' + pre.dockL + ' dockVis=' + pre.dockVis + ' third=' + pre.third)
    console.log('post: proseL=' + (res.post || {}).proseL + ' centerW=' + (res.post || {}).centerW + ' dockL=' + (res.post || {}).dockL + ' dockVis=' + (res.post || {}).dockVis + ' third=' + (res.post || {}).third)
    console.log('styles: ' + JSON.stringify(res.styles))
    console.log('transitionrun grid: ' + JSON.stringify(trun))
    console.log('transitionrun on dock: ' + JSON.stringify(dockRun))
    console.log('anims grid: ' + JSON.stringify(gridAnim))
    console.log('anims dock/transform/visibility: ' + JSON.stringify(dockAnim))
    console.log('first frames: ' + JSON.stringify(fr.slice(0, 4)))
    const lastF = fr.slice(-3)
    console.log('last frames: ' + JSON.stringify(lastF))
    console.log('errors: ' + JSON.stringify(res.errors))
  } catch (e) {
    shell.fatal = String(e && e.stack || e)
    fs.writeFileSync(OUT, JSON.stringify(shell, null, 1), 'utf8')
    console.log('FATAL ' + shell.fatal)
  }
  await browser.close()
}

main()
