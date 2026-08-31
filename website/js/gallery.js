/**
 * dsh-widgets showcase — widget gallery (all 19 real widgets).
 * Each card embeds the REAL widget render (same data, format and card
 * language as the product) inside a light frame that carries name / id /
 * category / size / builtin-vs-market / short description.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function badgeFor(w, label) {
    return '<span class="badge badge-size">' + esc(label) + '</span>';
  }

  function cardHtml(w, D) {
    var t = window.DASH_I18N.t;
    var g = D.groups[w.group] || { en: w.group, zh: w.group };
    var multi = w.sizes.length > 1;
    return (
      '<article class="widget-card' + (multi ? ' is-2x4' : '') + '" data-group="' + esc(w.group) +
      '" role="listitem" data-widget="' + esc(w.id) + '">' +
      '<div class="widget-preview">' +
      '<div class="wg-slot widget-stage-lg">' + window.DASH_PREVIEWS.render(w, { unit: 150, size: '2x2' }) + '</div>' +
      '</div>' +
      '<div class="widget-body">' +
      '<div class="widget-name-row">' +
      '<span class="widget-name">' + esc(w.nameZh) + '<span class="widget-name-en">' + esc(w.name) + '</span></span>' +
      '<span class="widget-id">' + esc(w.id) + '</span>' +
      '</div>' +
      '<p class="widget-desc">' + esc(w.descZh) + '<span class="widget-desc-en"> ' + esc(w.desc) + '</span></p>' +
      '<div class="widget-meta">' +
      '<span class="badge">' + esc(g.zh) + '</span>' +
      badgeFor(w, w.sizes.map(function (s) { return s.replace('x', '×'); }).join(' ')) +
      (w.builtin
        ? '<span class="badge badge-blue">' + esc(t('badgeBuiltin')) + '</span>'
        : '<span class="badge badge-warn">' + esc(t('badgeMarket')) + '</span>') +
      (w.defaultInstalled ? '<span class="badge badge-ok">' + esc(t('badgePre')) + '</span>' : '') +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function render() {
    var D = window.DASH_WIDGETS;
    var grid = document.getElementById('gallery-grid');
    if (!D || !grid) return;
    grid.innerHTML = D.widgets.map(function (w) { return cardHtml(w, D); }).join('');
  }

  function bindFilters() {
    var grid = document.getElementById('gallery-grid');
    var empty = document.getElementById('gallery-empty');
    if (!grid) return;
    var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filters.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var f = btn.getAttribute('data-filter');
        var shown = 0;
        Array.prototype.forEach.call(grid.children, function (card) {
          var show = f === 'all' || card.getAttribute('data-group') === f;
          card.classList.toggle('is-hidden', !show);
          if (show) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  }

  function init() {
    render();
    bindFilters();
    document.addEventListener('dsh:lang', render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();