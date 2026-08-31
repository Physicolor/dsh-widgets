/**
 * dsh-widgets showcase — hero widget rails.
 * Three horizontal tracks of REAL widget cards built from the real widget list:
 *   a ← session stat widgets   ·   b → usage + pricing widgets
 *   c ← context / coding-plan / quote widgets
 * Each track duplicates its content for a seamless translateX(-50%) loop.
 * Cards use the real card component at a scaled unit (real scale formula),
 * so they keep the real title/value/sub hierarchy and typography.
 */
(function () {
  'use strict';

  function init() {
    var D = window.DASH_WIDGETS;
    if (!D) return;
    var railA = document.getElementById('rail-a');
    var railB = document.getElementById('rail-b');
    var railC = document.getElementById('rail-c');

    var all = D.widgets;
    var aIds = all.filter(function (w) { return w.group === 'system' && w.order < 20; }).map(function (w) { return w.id; });
    var bIds = all.filter(function (w) { return w.group === 'opencode-go' || w.group === 'pricing'; })
      .sort(function (x, y) { return x.order - y.order; }).map(function (w) { return w.id; });
    var cIds = ['context', 'context-water', 'task']
      .concat(all.filter(function (w) { return w.group === 'coding-plan'; }).map(function (w) { return w.id; }))
      .concat(['quote']);

    var cardBuild = function (id) {
      var w = D.byId[id];
      if (!w) return '';
      return '<div class="wg-slot rail-card-slot">' + window.DASH_PREVIEWS.render(w, { unit: 96, size: '2x2' }) + '</div>';
    };
    var trackHtml = function (ids) {
      return ids.map(cardBuild).join('') + ids.map(cardBuild).join('');
    };
    if (railA) railA.innerHTML = trackHtml(aIds);
    if (railB) railB.innerHTML = trackHtml(bIds);
    if (railC) railC.innerHTML = trackHtml(cIds);

    /* right showcase: the REAL rail grid (150px cards, 24px gaps) — a compact
             component array, not floating cards */
    var hs = document.getElementById('hs-cards');
    var ids7 = ['counts', 'tps', 'context-water', 'usage-rings', 'peak-pricing', 'heatmap', 'llm'];
    var hsBuild = function () {
      if (!hs) return '';
      return ids7.map(function (id) {
        var w = D.byId[id];
        if (!w) return '';
        var wide = id === 'context-water';
        return '<div class="hs-slot' + (wide ? ' wide' : '') + ' wg-slot">' +
          window.DASH_PREVIEWS.render(w, { unit: 150, size: wide ? '2x4' : '2x2' }) + '</div>';
      }).join('');
    };
    if (hs) hs.innerHTML = hsBuild();

    /* design section: GOOD card is a REAL widget (Context Level) */
    var gbGood = document.getElementById('gb-good');
    if (gbGood) {
      var cw = D.byId['context-water'];
      if (cw) gbGood.innerHTML = window.DASH_PREVIEWS.render(cw, { unit: 150, size: '2x2' });
    }

    document.addEventListener('dsh:lang', function () {
      if (railA) railA.innerHTML = trackHtml(aIds);
      if (railB) railB.innerHTML = trackHtml(bIds);
      if (railC) railC.innerHTML = trackHtml(cIds);
      if (hs) hs.innerHTML = hsBuild();
      if (cw) gbGood.innerHTML = window.DASH_PREVIEWS.render(cw, { unit: 150, size: '2x2' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();