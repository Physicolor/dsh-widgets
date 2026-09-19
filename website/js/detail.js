/**
 * dsh-widgets showcase — component detail.
 *
 * One dialog for one widget unit: real previews at both supported sizes, the
 * design intent, the measured geometry (DOM-measured, not hand-written), the
 * rule-based audit for THIS component, and the source entry.
 */
(function () {
  'use strict';

  var G = window.DASH_GRAMMAR;
  var P = window.DASH_PREVIEWS;
  var D = window.DASH_WIDGETS;
  if (!G || !P || !D) return;

  function t(k) { return window.DASH_I18N ? window.DASH_I18N.t(k) : k; }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function scoreClass(v) { return v === null || v === undefined ? 'na' : v >= 95 ? 'good' : v >= 85 ? 'ok' : 'weak'; }

  var dialog, body, lastFocus;

  function variant(w, size, unit) {
    return '<figure class="dt-variant">' +
      '<div class="wg-slot">' + P.render(w, { unit: unit, size: size }) + '</div>' +
      '<figcaption>' + (size === '2x4' ? '2×4' : '2×2') + ' · ' + G.metric(unit).pad + 'px pad</figcaption>' +
      '</figure>';
  }

  function geometryRows(m) {
    return [
      ['geo.card', Math.round(m.card.w) + ' × ' + Math.round(m.card.h), 'unit ' + m.unit],
      ['geo.outer', [m.pad.t, m.pad.r, m.pad.b, m.pad.l].join(' / ') + 'px', 'T / R / B / L'],
      ['geo.radius', m.metric.radius + 'px', 'unit ' + m.unit + ' · 16%'],
      ['geo.rhythm', (m.title && m.foot ? (m.foot.top - m.title.bottom).toFixed(1) : '—') + 'px', 'title → content'],
      ['geo.type', m.metric.title + ' / ' + m.metric.value + ' / ' + m.metric.caption + 'px', 'title / value / caption'],
      ['geo.textLeft', m.title ? (m.title.left - m.card.left).toFixed(1) + 'px' : '—', 'title inset'],
      ['geo.rightSlot', m.titleRight ? ((m.card.right - m.metric.pad) - m.titleRight.right).toFixed(1) + 'px' : '—', 'Δ to padding edge'],
      ['geo.zoom', '×' + G.C.magnify, 'magnified height ' + (m.zoom ? m.zoom.h.toFixed(0) + 'px' : '—')]
    ];
  }

  function open(id) {
    var w = D.byId[id];
    if (!w) return;
    if (!dialog) {
      dialog = document.getElementById('wg-detail');
      body = document.getElementById('wg-detail-body');
      if (!dialog || !body) return;
      dialog.addEventListener('close', function () {
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      });
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
      var closeBtn = document.getElementById('wg-detail-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    }
    lastFocus = document.activeElement;

    var g = D.groups[w.group] || { en: w.group, zh: w.group };
    var size = w.sizes.indexOf('2x2') >= 0 ? '2x2' : w.sizes[0];
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;';
    probe.innerHTML = P.render(w, { unit: 150, size: size });
    document.body.appendChild(probe);
    var cardEl = probe.querySelector('.wg-card');
    var m = G.measure(cardEl, w, 150, size);
    m.zoom = G.zoomProbe(w, 150, size, G.C.magnify);
    var res = G.audit(m);
    document.body.removeChild(probe);

    var out = m.out;
    body.innerHTML =
      '<div class="dt-head">' +
        '<div class="dt-title"><h3>' + esc(w.nameZh) + '<span>' + esc(w.name) + '</span></h3>' +
        '<code>' + esc(w.id) + '</code></div>' +
        '<div class="dt-meta">' +
          '<span class="badge">' + esc(g.zh) + '</span>' +
          '<span class="badge badge-size">' + esc(w.sizes.map(function (s) { return s.replace('x', '×'); }).join(' ')) + '</span>' +
          '<span class="badge badge-blue">' + esc(t(w.builtin ? 'badgeBuiltin' : 'badgeMarket')) + '</span>' +
          (w.defaultInstalled ? '<span class="badge badge-ok">' + esc(t('badgePre')) + '</span>' : '') +
          '<span class="badge badge-pattern">' + esc(t(G.patternOf(out))) + '</span>' +
          '<span class="badge">' + esc(t(G.interactionOf(out))) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="dt-grid">' +
        '<section class="dt-block"><h4 data-i18n="dtVariants">Variants</h4>' +
          '<div class="dt-variants">' +
            w.sizes.map(function (s) { return variant(w, s, s === '2x4' ? 150 : 150); }).join('') +
          '</div></section>' +
        '<section class="dt-block"><h4 data-i18n="dtIntent">Design intent</h4>' +
          '<p class="dt-intent">' + esc(w.descZh) + '</p>' +
          '<p class="dt-intent dt-intent-en">' + esc(w.desc) + '</p>' +
        '</section>' +
        '<section class="dt-block"><h4 data-i18n="dtGeometry">Geometry</h4>' +
          '<dl class="dt-geo">' + geometryRows(m).map(function (r) {
            return '<div><dt data-i18n="' + r[0] + '"></dt><dd>' + esc(r[1]) + '<span>' + esc(r[2]) + '</span></dd></div>';
          }).join('') + '</dl></section>' +
        '<section class="dt-block"><h4><span data-i18n="dtAudit">Audit</span>' +
          '<span class="au-overall ' + scoreClass(res.overall) + '">' + (res.overall === null ? '—' : res.overall) + '</span></h4>' +
          '<div class="dt-scores">' + G.DIMS.map(function (d) {
            var v = res.scores[d.id];
            return '<span class="dt-score ' + scoreClass(v) + '"><b data-i18n="dim.' + d.id + '"></b>' + (v === null ? '—' : v) + '</span>';
          }).join('') + '</div>' +
          '<div class="dt-rules">' + res.rules.map(function (r) {
            return '<div class="au-rule is-' + r.status + '"><span class="au-rule-state">' + esc(t('state.' + r.status)) + '</span>' +
              '<span class="au-rule-name" data-i18n="rule.' + r.id + '"></span>' +
              '<span class="au-rule-num">' + esc(r.measured) + '</span></div>';
          }).join('') + '</div></section>' +
        '<section class="dt-block"><h4 data-i18n="dtSource">Source</h4>' +
          '<div class="dt-links">' +
            '<a href="' + esc(D.repo) + '/blob/main/src/widgets/' + esc(w.id) + '/index.ts" target="_blank" rel="noopener">index.ts</a>' +
            '<a href="' + esc(D.repo) + '/blob/main/src/widgets/' + esc(w.id) + '/manifest.json" target="_blank" rel="noopener">manifest.json</a>' +
            '<a href="' + esc(D.repo) + '/tree/main/src/widgets/' + esc(w.id) + '" target="_blank" rel="noopener">' + esc('src/widgets/' + w.id) + '</a>' +
          '</div>' +
          '<p class="dt-note"><code>' + esc(G.SOURCE.card) + '</code></p>' +
        '</section>' +
      '</div>';
    if (window.DASH_I18N) window.DASH_I18N.applyText();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  window.DASH_DETAIL = { open: open };
})();
