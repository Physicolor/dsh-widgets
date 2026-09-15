/**
 * dsh-widgets showcase — widget gallery.
 *
 * The gallery markup is GENERATED into index.html by website/gen-site.mjs from
 * src/widgets/<id>/manifest.json (so search engines and no-JS readers get the
 * real widget list, names, categories, sizes and descriptions). This module
 * only:
 *   1. hydrates each card's preview slot with the REAL widget render
 *      (DASH_PREVIEWS.render — same DOM the plugin's own previews produce);
 *   2. filters by category;
 *   3. opens the component detail (anatomy + measured audit) for one widget.
 */
(function () {
  'use strict';

  function hydrate() {
    var slots = document.querySelectorAll('#gallery-grid .widget-stage-lg[data-preview]');
    Array.prototype.forEach.call(slots, function (slot) {
      if (slot.getAttribute('data-ready') === '1') return;
      var w = window.DASH_WIDGETS.byId[slot.getAttribute('data-preview')];
      if (!w) return;
      slot.innerHTML = window.DASH_PREVIEWS.render(w, {
        unit: 150,
        size: slot.getAttribute('data-size') === '2x4' ? '2x4' : '2x2'
      });
      slot.setAttribute('data-ready', '1');
    });
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

  function open(id) {
    if (window.DASH_DETAIL) window.DASH_DETAIL.open(id);
  }

  function bindDetail() {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.widget-open');
      if (btn) { open(btn.getAttribute('data-widget')); return; }
      var preview = e.target.closest('.widget-preview');
      if (preview) {
        var card = preview.closest('.widget-card');
        if (card) open(card.getAttribute('data-widget'));
      }
    });
  }

  function init() {
    hydrate();
    bindFilters();
    bindDetail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
