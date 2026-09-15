/**
 * dsh-widgets showcase — the Design Grammar / Anatomy / Visual Audit lab.
 *
 * Three experiences, all driven by DASH_GRAMMAR (the real plugin geometry):
 *   #grammar  — the constant table + an interactive rail that runs the REAL
 *               dock magnification curve and right-anchored reflow;
 *   #anatomy  — a real widget at ×2 with measured padding / gap annotations;
 *   #audit    — a rule-based geometric audit of all 33 widgets, measured from
 *               the real rendered cards (DASH_PREVIEWS.render).
 */
(function () {
  'use strict';

  var G = window.DASH_GRAMMAR;
  var P = window.DASH_PREVIEWS;
  if (!G || !P) return;

  function t(k) { return window.DASH_I18N ? window.DASH_I18N.t(k) : k; }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function byId(id) { return window.DASH_WIDGETS.byId[id]; }

  /* ══════════════════════════════════════════════════════════════
   * 1. constant table
   * ══════════════════════════════════════════════════════════════ */
  function renderConsts() {
    var host = document.getElementById('gr-consts');
    if (!host) return;
    var rows = [
      ['cardSide', G.C.cardSide + 'px', 'gr.cCardSide'],
      ['panelPadding', G.C.panelPadding + 'px', 'gr.cPad'],
      ['magnify', '×' + G.C.magnify, 'gr.cMagnify'],
      ['columns', String(G.C.columns), 'gr.cColumns'],
      ['scale', 'unit / 150', 'gr.cScale'],
      ['innerPad', 'round(12 · scale)', 'gr.cInner'],
      ['radius', 'round(16 · scale)', 'gr.cRadius'],
      ['title · value · caption', '13 · 20 · 10', 'gr.cType'],
      ['foot gap', '6', 'gr.cFoot'],
      ['corner inset', 'round(8 · scale)', 'gr.cCorner'],
      ['influence', '3 grid steps', 'gr.cInfluence'],
      ['falloff', 't^1.6', 'gr.cFalloff']
    ];
    host.innerHTML = rows.map(function (r) {
      return '<div class="gr-const"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) +
        '<span class="gr-const-note" data-i18n="' + r[2] + '"></span></div>';
    }).join('');
    if (window.DASH_I18N) window.DASH_I18N.applyText();
  }

  /* ══════════════════════════════════════════════════════════════
   * 2. interactive rail (REAL magnification curve + reflow)
   * ══════════════════════════════════════════════════════════════ */
  var rail = {
    side: G.C.cardSide, pad: G.C.panelPadding, peak: G.C.magnify,
    items: [], scales: [], built: false, raf: 0, pending: null
  };

  /** Greedy best-fit row packing — src/client/index.ts:1078-1089 */
  function pack(ids, columns) {
    var items = [];
    var rowUsed = [0];
    ids.forEach(function (id) {
      var w = byId(id);
      if (!w) return;
      var span = w.sizes.indexOf('2x4') >= 0 && w.sizes.length === 1 ? 2 : 1;
      var placed = -1;
      for (var r = 0; r < rowUsed.length; r++) {
        if (rowUsed[r] + span <= columns) { placed = r; break; }
      }
      if (placed === -1) { placed = rowUsed.length; rowUsed.push(0); }
      items.push({ id: id, w: w, span: span, row: placed, col: rowUsed[placed], size: span === 2 ? '2x4' : '2x2' });
      rowUsed[placed] += span;
    });
    return items;
  }

  function railContentW() { return G.railWidth(rail.side, rail.pad, G.C.columns) - 2 * rail.pad; }

  function buildRail() {
    var stage = document.getElementById('gr-stage');
    var host = document.getElementById('gr-rail');
    if (!stage || !host) return;
    rail.items = pack(G.RAIL_IDS.concat(['llm']), G.C.columns);
    stage.style.padding = rail.pad + 'px';
    stage.style.width = G.railWidth(rail.side, rail.pad, G.C.columns) + 'px';
    host.style.width = railContentW() + 'px';
    host.innerHTML = rail.items.map(function (it, i) {
      return '<div class="gr-card" data-i="' + i + '" style="width:' + rail.side + 'px;height:' + rail.side + 'px">' +
        P.render(it.w, { unit: rail.side, size: it.size }) + '</div>';
    }).join('');
    rail.scales = new Array(rail.items.length).fill(1);
    rail.built = true;
    restRail();
    updateFormula();
  }

  function restRail() {
    var layout = G.layout(rail.items, new Array(rail.items.length).fill(1), { side: rail.side, pad: rail.pad });
    applyLayout(layout, new Array(rail.items.length).fill(1));
    var focus = document.getElementById('gr-focus');
    if (focus) focus.hidden = true;
    setReadout(1, 0);
  }

  function applyLayout(layout, scales) {
    var host = document.getElementById('gr-rail');
    if (!host) return;
    var cards = host.children;
    for (var i = 0; i < cards.length; i++) {
      var p = layout.place[i];
      if (!p) continue;
      var c = cards[i];
      c.style.top = p.top.toFixed(2) + 'px';
      c.style.right = p.right.toFixed(2) + 'px';
      c.style.width = p.w.toFixed(2) + 'px';
      c.style.height = p.h.toFixed(2) + 'px';
      c.style.zIndex = String(10 + Math.round(p.s * 10));
      var inner = c.firstElementChild;
      var target = Math.round(rail.side * p.s);
      if (inner && Math.abs(target - (+inner.getAttribute('data-unit') || 0)) > 1) {
        // re-render at the magnified unit — the plugin's lazy magnified body
        c.innerHTML = P.render(rail.items[i].w, { unit: target, size: rail.items[i].size });
        inner = c.firstElementChild;
        if (inner) {
          inner.setAttribute('data-unit', String(target));
          inner.style.width = '100%';
          inner.style.minHeight = '100%';
        }
      }
    }
    host.style.height = Math.max(layout.height, rail.side) + 'px';
  }

  function setReadout(peakNow, touched) {
    var out = document.getElementById('gr-readout');
    if (!out) return;
    out.textContent = t('grPeak') + ' ×' + peakNow.toFixed(2) + ' · ' + t('grTouched') + ' ' + touched + '/' + rail.items.length;
  }

  function onRailMove(e) {
    var host = document.getElementById('gr-rail');
    if (!host || !rail.built) return;
    var r = host.getBoundingClientRect();
    var fx = e.clientX - r.left;
    var fy = e.clientY - r.top;
    rail.pending = { fx: fx, fy: fy };
    if (rail.raf) return;
    rail.raf = requestAnimationFrame(function () {
      rail.raf = 0;
      var p = rail.pending;
      if (!p) return;
      var scales = G.scaleField(rail.items, p.fx, p.fy, { side: rail.side, pad: rail.pad, peak: rail.peak });
      var maxS = scales.reduce(function (a, b) { return Math.max(a, b); }, 1);
      var touched = scales.filter(function (s) { return s > 1.001; }).length;
      var layout = G.layout(rail.items, scales, { side: rail.side, pad: rail.pad });
      applyLayout(layout, scales);
      setReadout(maxS, touched);
      var focus = document.getElementById('gr-focus');
      if (focus) {
        focus.hidden = false;
        focus.style.left = p.fx.toFixed(1) + 'px';
        focus.style.top = p.fy.toFixed(1) + 'px';
      }
    });
  }

  function updateFormula() {
    var f = document.getElementById('gr-formula');
    if (!f) return;
    var side = rail.side, pad = rail.pad;
    var railW = G.railWidth(side, pad, G.C.columns);
    var wideW = G.wideWidth(side, pad);
    var cells = G.layout(rail.items.length ? rail.items : [], new Array(rail.items.length).fill(1), { side: side, pad: pad });
    f.textContent =
      'rail(2)  = 2 × side + 3 × pad = 2 × ' + side + ' + 3 × ' + pad + ' = ' + railW + 'px\n' +
      'wide(2×4) = 2 × side + pad     = 2 × ' + side + ' + ' + pad + ' = ' + wideW + 'px\n' +
      'scale(d) = d ≤ 0 ? ' + rail.peak.toFixed(2) + ' : 1 + (' + rail.peak.toFixed(2) + ' − 1) · max(0, 1 − d/3)^1.6\n' +
      'deck     = ' + cells.rows + ' rows · height ' + (rail.items.length ? cells.height.toFixed(0) : 0) + 'px · gutter ' + pad + 'px';
  }

  function initRail() {
    var stage = document.getElementById('gr-stage');
    if (!stage) return;
    buildRail();
    stage.addEventListener('pointermove', onRailMove);
    stage.addEventListener('pointerleave', restRail);

    function bindRange(id, outId, key, fmt) {
      var input = document.getElementById(id);
      var out = document.getElementById(outId);
      if (!input || !out) return;
      input.value = String(rail[key]);
      out.textContent = fmt(rail[key]);
      input.addEventListener('input', function () {
        rail[key] = Number(input.value);
        out.textContent = fmt(rail[key]);
        buildRail();
      });
    }
    bindRange('gr-side', 'gr-side-out', 'side', function (v) { return v + 'px'; });
    bindRange('gr-pad', 'gr-pad-out', 'pad', function (v) { return v + 'px'; });
    bindRange('gr-peak', 'gr-peak-out', 'peak', function (v) { return '×' + Number(v).toFixed(2); });
  }

  /* ══════════════════════════════════════════════════════════════
   * 3. anatomy — a real widget at ×2 with measured annotations
   * ══════════════════════════════════════════════════════════════ */
  var anatomy = { id: 'context-water', annotations: true };

  /** The anatomy renders the REAL card, but at a unit that fits the stage — so
   *  on a phone it scales the sample down instead of clipping the annotations. */
  function anatomyUnit(size, stage) {
    var cs = getComputedStyle(stage);
    var avail = Math.max(120, stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    var unit = size === '2x4' ? Math.min(240, Math.floor((avail - 24) / 2)) : Math.min(300, avail);
    return Math.max(90, Math.round(unit));
  }

  function renderAnatomyPick() {
    var host = document.getElementById('an-pick');
    if (!host) return;
    host.innerHTML = G.ANATOMY.map(function (a) {
      var w = byId(a.id);
      if (!w) return '';
      return '<button type="button" class="an-chip' + (a.id === anatomy.id ? ' is-active' : '') +
        '" data-an="' + esc(a.id) + '">' + esc(w.nameZh) + '<b>' + esc(w.name) + '</b></button>';
    }).join('');
  }

  function drawAnatomy() {
    var host = document.getElementById('an-host');
    var svg = document.getElementById('an-overlay');
    var table = document.getElementById('an-table');
    if (!host || !svg || !table) return;
    var w = byId(anatomy.id);
    if (!w) return;
    var size = w.sizes.indexOf('2x4') >= 0 && w.sizes.length === 1 ? '2x4' : '2x2';
    var stage = document.getElementById('an-stage');
    var unit = anatomyUnit(size, stage);
    host.innerHTML = '<div class="wg-slot">' + P.render(w, { unit: unit, size: size }) + '</div>';
    var cardEl = host.querySelector('.wg-card');
    if (!cardEl) return;
    var hostRect = stage.getBoundingClientRect();
    var m = G.measure(cardEl, w, unit, size);
    // lift the measurement into stage coordinates
    var cardRect = cardEl.getBoundingClientRect();
    var ox = cardRect.left - hostRect.left;
    var oy = cardRect.top - hostRect.top;
    var mtr = m.metric;

    var marks = [];
    function push(key, value, extra) { marks.push({ key: key, value: value, extra: extra || '' }); }

    push('an.outer', mtr.pad + 'px', 'round(12 · ' + mtr.scale.toFixed(2) + ')');
    push('an.radius', mtr.radius + 'px', 'round(16 · ' + mtr.scale.toFixed(2) + ')');
    push('an.title', mtr.title + 'px', '13 · ' + mtr.scale.toFixed(2));
    push('an.value', (m.out.value != null || m.out.headAfter) ? mtr.value + 'px' : '—', '20 · ' + mtr.scale.toFixed(2));
    push('an.caption', mtr.caption + 'px', '10 · ' + mtr.scale.toFixed(2));
    var gap = m.title && m.foot ? (m.foot.top - m.title.bottom) : null;
    push('an.gapTitleFoot', gap === null ? '—' : gap.toFixed(1) + 'px', 'measured');
    push('an.corner', m.corner ? (m.corner.top - (m.card.top + mtr.pad)).toFixed(1) + 'px' : '—', 'round(8 · ' + mtr.scale.toFixed(2) + ')');
    push('an.box', Math.round(m.card.w) + ' × ' + Math.round(m.card.h), size.replace('x', '×'));

    table.innerHTML = marks.map(function (mk) {
      return '<div class="an-row" data-key="' + esc(mk.key) + '"><dt data-i18n="' + esc(mk.key) + '"></dt>' +
        '<dd>' + esc(mk.value) + '<span>' + esc(mk.extra) + '</span></dd></div>';
    }).join('');
    if (window.DASH_I18N) window.DASH_I18N.applyText();

    // SVG annotation layer, in stage coordinates
    var sw = stage.clientWidth, sh = stage.clientHeight;
    svg.setAttribute('viewBox', '0 0 ' + sw + ' ' + sh);
    svg.setAttribute('width', sw);
    svg.setAttribute('height', sh);
    if (!anatomy.annotations) { svg.innerHTML = ''; return; }
    var pad = mtr.pad;
    var L = [];
    function line(x1, y1, x2, y2, cls, dash) {
      L.push('<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
        (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' />');
    }
    function label(x, y, text, cls, anchor) {
      L.push('<text class="' + (cls || 'an-t') + '" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '">' + esc(text) + '</text>');
    }
    function tick(x, y, cls, size) {
      var s = size || 5;
      L.push('<circle class="' + (cls || 'an-dot') + '" cx="' + x + '" cy="' + y + '" r="2.5" />');
      void s;
    }
    var right = ox + m.card.w, bottom = oy + m.card.h, left = ox, top = oy;
    // On a narrow stage the label set is reduced on purpose: padding measures
    // stay (they are the point), the gap/corner callouts move to the table.
    var narrow = stage.clientWidth < 460;
    var sideX = narrow ? 9 : 14;
    var sideLabelX = narrow ? 13 : 19;
    // padding-box guide
    L.push('<rect class="an-padbox" x="' + (left + pad) + '" y="' + (top + pad) + '" width="' + (m.card.w - 2 * pad) +
      '" height="' + (m.card.h - 2 * pad) + '" rx="' + Math.max(0, mtr.radius - 4) + '" />');
    // four padding measures
    line(left, top - 14, left, top, 'an-guide');
    line(left + pad, top - 14, left + pad, bottom, 'an-guide an-strong', '4 4');
    line(left, top - 14, left + pad, top - 14, 'an-measure');
    label((left + left + pad) / 2, top - 19, pad + 'px', 'an-t an-t-strong');
    line(right - pad, top - 14, right - pad, bottom, 'an-guide an-strong', '4 4');
    line(right - pad, top - 14, right, top - 14, 'an-measure');
    label((right - pad + right) / 2, top - 19, pad + 'px', 'an-t an-t-strong');
    line(right + sideX, top, right + sideX, top + pad, 'an-measure');
    line(right + sideX, bottom - pad, right + sideX, bottom, 'an-measure');
    label(right + sideLabelX, top + pad / 2 + 3, pad + 'px', 'an-t', 'start');
    label(right + sideLabelX, bottom - pad / 2 + 3, pad + 'px', 'an-t', 'start');
    // title → foot rhythm (desktop only: it needs room outside the card)
    if (!narrow && gap !== null && gap > -2) {
      var gx = right + (size === '2x4' ? 40 : 30);
      line(gx, oy + m.title.bottom, gx, oy + m.foot.top, 'an-measure an-strong');
      tick(gx, oy + m.title.bottom, 'an-dot');
      tick(gx, oy + m.foot.top, 'an-dot');
      label(gx + 6, oy + (m.title.bottom + m.foot.top) / 2 + 3, gap.toFixed(1) + 'px', 'an-t an-t-strong', 'start');
    }
    // corner inset
    if (!narrow && m.corner) {
      line(right - pad - mtr.corner, top + pad, ox + m.corner.left, oy + m.corner.top, 'an-guide an-dash', '3 3');
      label(ox + m.corner.left + mtr.corner / 2 + 6, oy + m.corner.top - 2, '8·s', 'an-t an-t-dim', 'start');
    }
    svg.innerHTML = L.join('');
  }

  function initAnatomy() {
    renderAnatomyPick();
    var pick = document.getElementById('an-pick');
    if (pick) {
      pick.addEventListener('click', function (e) {
        var btn = e.target.closest('.an-chip');
        if (!btn) return;
        anatomy.id = btn.getAttribute('data-an');
        Array.prototype.forEach.call(pick.children, function (c) { c.classList.toggle('is-active', c === btn); });
        drawAnatomy();
      });
    }
    var toggle = document.getElementById('an-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', 'true');
      toggle.addEventListener('click', function () {
        anatomy.annotations = !anatomy.annotations;
        toggle.setAttribute('aria-pressed', String(anatomy.annotations));
        toggle.textContent = t(anatomy.annotations ? 'anHide' : 'anShow');
        drawAnatomy();
      });
    }
    drawAnatomy();
  }

  /* ══════════════════════════════════════════════════════════════
   * 4. visual audit — measure all 33 real cards, run every rule
   * ══════════════════════════════════════════════════════════════ */
  var auditState = { rows: [], selected: null };

  /** A unit is measured at the size it actually ships in. */
  function defaultSize(w) { return w.sizes[0] === '2x4' ? '2x4' : '2x2'; }

  function buildAuditStage() {
    var stage = document.getElementById('au-stage');
    if (!stage) return;
    var list = window.DASH_WIDGETS.widgets;
    stage.innerHTML = list.map(function (w) {
      return '<div class="au-slot" data-w="' + esc(w.id) + '">' + P.render(w, { unit: 150, size: defaultSize(w) }) + '</div>';
    }).join('');
  }

  function runAudit() {
    var stage = document.getElementById('au-stage');
    if (!stage) return;
    var rows = [];
    Array.prototype.forEach.call(stage.children, function (slot) {
      var id = slot.getAttribute('data-w');
      var w = byId(id);
      var cardEl = slot.querySelector('.wg-card');
      if (!w || !cardEl) return;
      var size = defaultSize(w);
      var m = G.measure(cardEl, w, 150, size);
      m.zoom = G.zoomProbe(w, 150, size, G.C.magnify);
      var res = G.audit(m);
      rows.push({ id: id, w: w, m: m, res: res, size: size });
    });
    auditState.rows = rows;
    renderAuditList();
    renderAuditCases(rows);
    var firstWarn = rows.filter(function (r) { return r.res.rules.some(function (x) { return x.status === 'warn' || x.status === 'fail'; }); });
    selectAudit((firstWarn[0] || rows[0] || {}).id);
  }

  /** The exceptions, spelled out: which component, which rule, what was measured. */
  function renderAuditCases(rows) {
    var host = document.getElementById('au-cases');
    if (!host) return;
    var cases = [];
    rows.forEach(function (r) {
      r.res.rules.forEach(function (rule) {
        if (rule.status === 'warn' || rule.status === 'fail') {
          cases.push({ id: r.id, name: r.w.nameZh, key: 'rule.' + rule.id, status: rule.status, measured: rule.measured });
        }
      });
    });
    G.OBSERVATIONS.forEach(function (o) {
      var w = byId(o.id);
      cases.push({ id: o.id, name: w ? w.nameZh : o.id, key: o.key, status: 'warn', measured: o.measured });
    });
    host.innerHTML =
      '<h3 data-i18n="auCasesTitle">例外清单</h3>' +
      (cases.length
        ? '<ul>' + cases.map(function (c) {
            return '<li class="is-' + c.status + '"><b>' + esc(c.name) + '</b><code>' + esc(c.id) + '</code>' +
              '<span data-i18n="' + esc(c.key) + '"></span>' +
              '<em>' + esc(c.measured) + '</em></li>';
          }).join('') + '</ul>'
        : '<p data-i18n="auCasesNone">全部规则通过。</p>');
    if (window.DASH_I18N) window.DASH_I18N.applyText();
  }

  function scoreClass(v) {
    if (v === null || v === undefined) return 'na';
    return v >= 95 ? 'good' : v >= 85 ? 'ok' : 'weak';
  }

  function renderAuditList() {
    var host = document.getElementById('au-list');
    if (!host) return;
    function flagsOf(r) {
      return r.res.rules.filter(function (x) { return x.status === 'warn' || x.status === 'fail'; }).length;
    }
    // exceptions first (a wall of 100s hides the point), then by score
    var rows = auditState.rows.slice().sort(function (a, b) {
      return flagsOf(b) - flagsOf(a) || (a.res.overall || 0) - (b.res.overall || 0);
    });
    host.innerHTML =
      '<div class="au-head"><span>' + esc(t('auColWidget')) + '</span><span>' + esc(t('auColScore')) + '</span>' +
      G.DIMS.map(function (d) { return '<span data-i18n="dim.' + d.id + '"></span>'; }).join('') + '</div>' +
      rows.map(function (r) {
        var flags = r.res.rules.filter(function (x) { return x.status === 'warn' || x.status === 'fail'; }).length;
        return '<button type="button" class="au-row' + (r.id === auditState.selected ? ' is-active' : '') + '" data-w="' + esc(r.id) + '">' +
          '<span class="au-name">' + esc(r.w.nameZh) + '<b>' + esc(r.id) + '</b>' +
          (flags ? '<i class="au-flag" title="' + flags + '">' + flags + '</i>' : '') + '</span>' +
          '<span class="au-overall ' + scoreClass(r.res.overall) + '">' + (r.res.overall === null ? '—' : r.res.overall) + '</span>' +
          G.DIMS.map(function (d) {
            var v = r.res.scores[d.id];
            return '<span class="au-dim ' + scoreClass(v) + '">' + (v === null ? '—' : v) + '</span>';
          }).join('') +
          '</button>';
      }).join('');
    if (window.DASH_I18N) window.DASH_I18N.applyText();
  }

  function selectAudit(id) {
    auditState.selected = id;
    var row = null;
    auditState.rows.forEach(function (r) { if (r.id === id) row = r; });
    if (!row) return;
    Array.prototype.forEach.call(document.querySelectorAll('#au-list .au-row'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-w') === id);
    });
    var host = document.getElementById('au-detail');
    if (!host) return;
    var m = row.m;
    var geo = [
      ['geo.outer', [m.pad.t, m.pad.r, m.pad.b, m.pad.l].map(function (v) { return v + 'px'; }).join(' / '), 'T / R / B / L'],
      ['geo.card', Math.round(m.card.w) + ' × ' + Math.round(m.card.h), 'unit ' + m.unit + ' · ' + row.size.replace('x', '×')],
      ['geo.padBox', Math.round(m.card.w - 2 * m.metric.pad) + ' × ' + Math.round(m.card.h - 2 * m.metric.pad), 'content box'],
      ['geo.radius', m.metric.radius + 'px', 'round(16 · ' + m.metric.scale.toFixed(2) + ')'],
      ['geo.rhythm', m.footKids.length > 1 ? '6px × ' + m.footKids.length : '—', 'content block step'],
      ['geo.type', m.metric.title + ' / ' + m.metric.value + ' / ' + m.metric.caption, 'title / value / caption'],
      ['geo.zoom', '×' + G.C.magnify + ' → ' + m.zoom.h.toFixed(0) + 'px', 'height @ magnified unit']
    ];
    host.innerHTML =
      '<div class="au-detail-head">' +
      '<div><b>' + esc(row.w.nameZh) + '</b><span>' + esc(row.w.name) + '</span></div>' +
      '<code>' + esc(row.id) + '</code>' +
      '<span class="au-overall ' + scoreClass(row.res.overall) + '">' + (row.res.overall === null ? '—' : row.res.overall) + '</span>' +
      '</div>' +
      '<div class="au-preview"><div class="wg-slot">' + P.render(row.w, { unit: row.size === '2x4' ? 170 : 220, size: row.size }) + '</div></div>' +
      '<div class="au-rules">' +
      row.res.rules.map(function (r) {
        return '<div class="au-rule is-' + r.status + '">' +
          '<span class="au-rule-state">' + esc(t('state.' + r.status)) + '</span>' +
          '<span class="au-rule-name"><i class="au-layer">' + esc(t('layer.' + r.layer)) + '</i>' +
          '<span data-i18n="rule.' + r.id + '"></span></span>' +
          '<span class="au-rule-num">' + esc(r.measured) + '</span>' +
          '</div>';
      }).join('') +
      '</div>' +
      '<dl class="au-geo">' + geo.map(function (g) {
        return '<div><dt data-i18n="' + g[0] + '"></dt><dd>' + esc(g[1]) + '<span>' + esc(g[2]) + '</span></dd></div>';
      }).join('') + '</dl>' +
      '<div class="au-links">' +
      '<a href="' + esc(D.repo) + '/blob/main/src/widgets/' + esc(row.id) + '/index.ts" target="_blank" rel="noopener" data-i18n="auSource">source</a>' +
      '<a href="' + esc(D.repo) + '/blob/main/src/widgets/' + esc(row.id) + '/manifest.json" target="_blank" rel="noopener">manifest.json</a>' +
      '<button type="button" class="au-open" data-w="' + esc(row.id) + '" data-i18n="auOpenDetail">open component detail</button>' +
      '</div>';
    if (window.DASH_I18N) window.DASH_I18N.applyText();
    var btn = host.querySelector('.au-open');
    if (btn) btn.addEventListener('click', function () { window.DASH_DETAIL.open(row.id); });
  }

  function initAudit() {
    buildAuditStage();
    runAudit();
    var list = document.getElementById('au-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var b = e.target.closest('.au-row');
        if (b) selectAudit(b.getAttribute('data-w'));
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
   * boot
   * ══════════════════════════════════════════════════════════════ */
  var D = window.DASH_WIDGETS;

  function boot() {
    renderConsts();
    initRail();
    initAnatomy();
    initAudit();
  }

  window.DASH_LAB = { refresh: function () { renderConsts(); rail.built = false; buildRail(); renderAnatomyPick(); drawAnatomy(); runAudit(); } };

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { drawAnatomy(); }, 160);
  });

  document.addEventListener('dsh:lang', function () {
    if (window.DASH_I18N) window.DASH_I18N.applyText();
    updateFormula();
    renderAuditList();
    if (auditState.selected) {
      var keep = auditState.selected;
      selectAudit(keep);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
