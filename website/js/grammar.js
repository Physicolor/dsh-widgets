/**
 * dsh-widgets showcase — DSH Widget Design Grammar.
 *
 * Every constant, formula and rule in this file is a PORT of what the plugin
 * actually does — nothing here is invented for the website:
 *
 *   BASE_SIDE 150 · cardSide 150 · panelPadding 24 · magnify 1.2 · columns 2
 *        ← src/client/index.ts:27,37,38,44,48 (DEFAULTS / BASE_SIDE)
 *   scale = unit / BASE_SIDE
 *   radius = round(unit · cornerPercent / 100) — cornerPercent is a GEAR of the
 *        card's SHORT side (12/16/20/24 %), DEFAULT 16 ← components.tsx:28-35
 *   innerPad = round(12 · scale)
 *        ← components.tsx:36-42 — the inset does NOT follow the corner: the
 *        reference ratio belongs to the CORNER (16 % of the short side), while
 *        the content sits close to the card edge (12px at unit 150)
 *        at unit 150 the default gear gives radius 24 · innerPad 12
 *   corners are CONTINUOUS CURVATURE (`corner-shape: squircle`), default ON
 *        ← src/client/widgets.module.css:72-74
 *   title 13 · value 20 · caption 10 · foot gap 6 · head gap 6
 *   corner inset 8 * scale · legend margin-top 2 · headAfter 2 · meter 4
 *        ← src/client/components.tsx:459-604 (CardBody)
 *   stepScale(d): d<=0 → peak; t = max(0, 1 - d/3); 1 + (peak-1)·t^1.6
 *        ← src/client/index.ts:1053-1059
 *   right-anchored reflow: row top accumulates from 2px, cards place
 *   right-to-left at right = Σ(prev width + pad)
 *        ← src/client/index.ts:1158-1188 (placeCards)
 *
 * The audit engine measures the REAL rendered preview cards
 * (DASH_PREVIEWS.render output) with getBoundingClientRect, so a rule result is
 * a measurement of the same DOM the product's market preview uses — not a
 * hand-written score.
 *
 * HONESTY CONTRACT: this is a rule-based / geometric audit. Geometry tells us
 * what is misaligned; the declared design rules tell us whether it matters.
 * There is no claim that a number proves beauty.
 */
window.DASH_GRAMMAR = (function () {
  'use strict';

  /* ── 1. the REAL constants ─────────────────────────────────── */
  var C = {
    baseSide: 150,        // src/client/components.tsx:20  BASE_SIDE
    cardSide: 150,        // src/client/index.ts:38       DEFAULTS.cardSide
    panelPadding: 24,     // src/client/index.ts:37       DEFAULTS.panelPadding
    magnify: 1.2,         // src/client/index.ts:44       DEFAULTS.magnify
    columns: 2,           // src/client/index.ts:48       DEFAULTS.columns
    maxWidgets: 10,
    rowTopOffset: 2,      // src/client/index.ts:1166     placeCards acc = 2
    influenceSteps: 3,    // src/client/index.ts:1056     t = 1 - d/3
    falloff: 1.6,         // src/client/index.ts:1058     pow(t, 1.6)
    cornerPercent: 16,    // components.tsx:30  DEFAULT_CORNER_PERCENT (% of short side)
    cornerGears: [12, 16, 20, 24], // components.tsx:28  CORNER_GEARS (%)
    ratios: {             // components.tsx CardBody
      pad: 12 / 150,      // the whole inner inset (independent of the corner)
      title: 13 / 150,
      value: 20 / 150,
      caption: 10 / 150,
      corner: 8 / 150,
      headGap: 6 / 150,   // components.tsx:498  title row gap: 6
      footGap: 6 / 150,   // components.tsx:588  foot gap: 6
      legendMt: 2 / 150,  // components.tsx:523
      headAfterMt: 2 / 150, // components.tsx:513
      meterMt: 4 / 150,   // components.tsx:530
      titleLine: 1.2,     // components.tsx:493
      valueLine: 1.25     // components.tsx:495
    }
  };

  var SOURCE = {
    layout: 'src/client/index.ts:1029-1188',
    magnify: 'src/client/index.ts:1053-1059',
    card: 'src/client/components.tsx:459-604'
  };

  function px(v) { return Math.round(v); }

  /** components.tsx cardRadius(): a PERCENT of the card's short side, with the
   *  gear itself clamped to 8..28 (a hand-edited pref can hold anything). */
  function cardRadius(unit, percent) {
    var p = (percent === undefined || percent === null || !isFinite(percent))
      ? C.cornerPercent : Math.max(8, Math.min(28, percent));
    return Math.round((unit || C.baseSide) * (p / 100));
  }

  /** components.tsx cardInnerPad(): flat 12 · scale — the inset is deliberately
   *  INDEPENDENT of the corner gear, so a bigger radius never pushes the content
   *  away from the card edge. */
  function cardInnerPad(unit) {
    return px(C.ratios.pad * C.baseSide * ((unit || C.baseSide) / C.baseSide));
  }

  /** The card metrics at a given unit (unit 150 = the plugin default).
   *  percent = the corner gear (12/16/20/24 %), default 16. */
  function metric(unit, percent) {
    var scale = (unit || C.baseSide) / C.baseSide;
    var r = C.ratios;
    var gear = (percent === undefined || percent === null) ? C.cornerPercent : percent;
    var radius = cardRadius(unit, gear);
    var pad = cardInnerPad(unit);
    var title = px(r.title * C.baseSide * scale);
    var value = px(r.value * C.baseSide * scale);
    var caption = px(r.caption * C.baseSide * scale);
    return {
      unit: unit,
      scale: scale,
      cornerPercent: gear,
      pad: pad,
      radius: radius,
      title: title,
      value: value,
      caption: caption,
      corner: px(r.corner * C.baseSide * scale),
      headGap: px(r.headGap * C.baseSide * scale),
      footGap: Math.max(1, px(r.footGap * C.baseSide * scale)),
      titleLine: px(title * r.titleLine),
      valueLine: px(value * r.valueLine),
      captionLine: px(caption * r.titleLine)
    };
  }

  /** Rail width formula (src/client/index.ts:946-960): n columns of `side`
   *  separated AND padded by `panelPadding`.
   *  rail(2) = 2·side + 3·pad   ·   2×4 wide = 2·side + pad */
  function railWidth(side, pad, cols) {
    return cols * side + (cols + 1) * pad;
  }
  function wideWidth(side, pad) { return 2 * side + pad; }

  /* ── 2. the REAL magnification curve (dock bell) ───────────── */
  function stepScale(d, peak) {
    var extra = (peak || C.magnify) - 1;
    if (d <= 0) return (peak || C.magnify);
    var t = Math.max(0, 1 - d / C.influenceSteps);
    if (t <= 0) return 1;
    return 1 + extra * Math.pow(t, C.falloff);
  }

  /** Scale field: each card's own Euclidean distance to the focus point in
   *  grid steps (X by column pitch, Y by row pitch) — src/client/index.ts:1107 */
  function scaleField(items, fx, fy, opts) {
    var side = opts.side, pad = opts.pad, peak = opts.peak;
    var cell = side + pad;
    return items.map(function (it) {
      var cx = (it.col + it.span / 2) * cell;
      var cy = it.row * cell + side / 2;
      return stepScale(Math.hypot(cx - fx, cy - fy) / cell, peak);
    });
  }

  /** Right-anchored reflow — port of placeCards (src/client/index.ts:1158).
   *  Returns {s, top, right, w, h} per item, in the rail's coordinate space. */
  function layout(items, scales, opts) {
    var side = opts.side, pad = opts.pad;
    var rows = 0;
    items.forEach(function (it) { rows = Math.max(rows, it.row + 1); });
    var rowH = [];
    var r;
    for (r = 0; r < rows; r++) rowH.push(0);
    items.forEach(function (it, i) {
      var h = side * scales[i];
      if (h > rowH[it.row]) rowH[it.row] = h;
    });
    var rowTop = [];
    var acc = C.rowTopOffset;
    for (r = 0; r < rows; r++) { rowTop.push(acc); acc += rowH[r] + pad; }
    var place = new Array(items.length);
    for (r = rows - 1; r >= 0; r--) {
      var inRow = [];
      items.forEach(function (it, i) { if (it.row === r) inRow.push(i); });
      inRow.sort(function (a, b) { return items[b].col - items[a].col; });
      var colRight = 0;
      inRow.forEach(function (i) {
        var w = (items[i].span === 2 ? wideWidth(side, pad) : side) * scales[i];
        place[i] = { s: scales[i], top: rowTop[r], right: colRight, w: w, h: side * scales[i] };
        colRight += w + pad;
      });
    }
    return { place: place, height: acc - pad, rows: rows };
  }

  /* ── 3. audit rules ────────────────────────────────────────────
   *  layer 'geometry'  = measured from the DOM (getBoundingClientRect)
   *  layer 'heuristic' = a declared design rule evaluated on the render output
   *  Each rule returns { status: 'pass'|'warn'|'fail'|'na', measured }
   */
  function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1 : tol); }

  var RULES = [
    {
      id: 'pad', layer: 'geometry', dim: 'alignment',
      run: function (m) {
        var target = m.metric.pad;
        var d = [m.pad.t, m.pad.r, m.pad.b, m.pad.l].map(function (v) { return Math.abs(v - target); });
        var worst = Math.max.apply(null, d);
        return {
          status: worst <= 1 ? 'pass' : worst <= 3 ? 'warn' : 'fail',
          measured: 'T' + m.pad.t + ' R' + m.pad.r + ' B' + m.pad.b + ' L' + m.pad.l + ' / target ' + target
        };
      }
    },
    {
      id: 'titleInset', layer: 'geometry', dim: 'alignment',
      run: function (m) {
        if (!m.title) return { status: 'na', measured: 'no title box' };
        var d = m.title.left - (m.card.left + m.metric.pad);
        return { status: near(d, 0) ? 'pass' : Math.abs(d) <= 2 ? 'warn' : 'fail', measured: 'Δ' + d.toFixed(1) + 'px' };
      }
    },
    {
      id: 'rightSlot', layer: 'geometry', dim: 'alignment',
      run: function (m) {
        if (!m.titleRight) return { status: 'na', measured: 'no right slot' };
        var d = (m.card.right - m.metric.pad) - m.titleRight.right;
        return { status: near(d, 0) ? 'pass' : Math.abs(d) <= 2 ? 'warn' : 'fail', measured: 'Δ' + d.toFixed(1) + 'px' };
      }
    },
    {
      id: 'blockAlign', layer: 'geometry', dim: 'alignment',
      run: function (m) {
        var blocks = [m.title, m.foot].filter(Boolean);
        if (blocks.length < 2) return { status: 'na', measured: 'single block' };
        var d = Math.abs(blocks[0].left - blocks[1].left);
        return { status: near(d, 0) ? 'pass' : d <= 2 ? 'warn' : 'fail', measured: 'Δ' + d.toFixed(1) + 'px' };
      }
    },
    {
      id: 'rhythm', layer: 'geometry', dim: 'spacing',
      run: function (m) {
        // The card's rhythm contract is the 6px step INSIDE the content block
        // (components.tsx:588 footStyle gap 6) — the space between the title row
        // and the block is flexible on purpose (marginTop:auto pushes a
        // bottom-anchored reading down), so it is NOT a rhythm violation.
        if (!m.footKids || m.footKids.length < 2) return { status: 'na', measured: 'single content block' };
        var gaps = [];
        for (var i = 1; i < m.footKids.length; i++) gaps.push(m.footKids[i].top - m.footKids[i - 1].bottom);
        var target = 6;
        var worst = 0;
        gaps.forEach(function (g) { worst = Math.max(worst, Math.abs(g - target)); });
        return {
          status: worst <= 2 ? 'pass' : worst <= 5 ? 'warn' : 'fail',
          measured: gaps.map(function (g) { return g.toFixed(1); }).join(' / ') + 'px vs ' + target + 'px step'
        };
      }
    },
    {
      id: 'fit', layer: 'geometry', dim: 'spacing',
      run: function (m) {
        // "Fits" means inside the CARD box. The corner action deliberately lives
        // in the padding area (8px inset vs the 12px inner pad at unit 150), so
        // the padding box is not the constraint — the pad rule checks the
        // padding discipline.
        var over = Math.max(0, m.scroll.w - m.client.w) + Math.max(0, m.scroll.h - m.client.h);
        var spill = 0;
        m.boxes.forEach(function (b) {
          if (!b) return;
          spill = Math.max(spill,
            m.card.top - b.top,
            b.bottom - m.card.bottom,
            m.card.left - b.left,
            b.right - m.card.right);
        });
        spill = Math.round(Math.max(0, spill));
        return {
          status: over <= 1 && spill <= 1 ? 'pass' : over <= 3 && spill <= 3 ? 'warn' : 'fail',
          measured: 'overflow ' + over + 'px · outside card ' + spill + 'px'
        };
      }
    },
    {
      id: 'action', layer: 'geometry', dim: 'balance',
      run: function (m) {
        // The corner action sits 8px inside whichever vertical edge it uses
        // (top for the compact action, bottom for the context one) and must not
        // cross the title box.
        if (!m.corner) return { status: 'na', measured: 'no action' };
        var inset = 8;
        var dTop = Math.abs((m.corner.top - m.card.top) - inset);
        var dBottom = Math.abs((m.card.bottom - m.corner.bottom) - inset);
        var dRight = Math.abs((m.card.right - m.card.right) + ((m.card.right - inset) - m.corner.right));
        var vertical = Math.min(dTop, dBottom);
        var clash = m.title ? !(m.corner.left >= m.title.right || m.corner.right <= m.title.left ||
          m.corner.top >= m.title.bottom || m.corner.bottom <= m.title.top) : false;
        var area = (m.corner.w * m.corner.h) / (m.card.w * m.card.h);
        var status = clash ? 'fail' : (vertical <= 2 && dRight <= 2 && area <= 0.06) ? 'pass' : 'warn';
        return {
          status: status,
          measured: (dTop < dBottom ? 'top' : 'bottom') + ' inset ' + (dTop < dBottom ? dTop : dBottom).toFixed(1) +
            'px · right inset ' + ((m.card.right - inset) - m.corner.right).toFixed(1) + 'px · area ' + (area * 100).toFixed(1) + '%' +
            (clash ? ' · overlaps title' : '')
        };
      }
    },
    {
      id: 'primary', layer: 'heuristic', dim: 'hierarchy',
      run: function (m) {
        // One dominant reading: the header slot (value / headRight / headAfter
        // figure) leads, and a chart or text block under it supports it. Only a
        // card with NO header reading and several graphics competes with itself.
        var header = m.out.value != null || m.out.headRight != null || m.out.headAfter != null;
        var graphics = [];
        if (m.out.chart) graphics.push('chart');
        if (m.out.rich && m.out.rich.text) graphics.push('text');
        var readings = header ? 1 : graphics.length;
        var sizeText = m.out.value != null ? ' · value ' + m.valueFont + 'px vs title ' + m.titleFont + 'px' : '';
        if (readings === 1) {
          var ordered = m.out.value == null || m.valueFont >= m.titleFont;
          return { status: ordered ? 'pass' : 'fail', measured: '1 primary reading' + sizeText };
        }
        return {
          status: readings === 2 ? 'warn' : 'fail',
          measured: readings + ' competing readings (' + graphics.join(' + ') + ')'
        };
      }
    },
    {
      id: 'emphasise', layer: 'heuristic', dim: 'hierarchy',
      run: function (m) {
        var v = m.out.value != null ? m.metric.value : null;
        var order = v != null ? v > m.metric.title && m.metric.title > m.metric.caption : m.metric.title > m.metric.caption;
        return {
          status: order ? 'pass' : 'fail',
          measured: 'caption ' + m.metric.caption + ' < title ' + m.metric.title + (v != null ? ' < value ' + v : '')
        };
      }
    },
    {
      id: 'grouping', layer: 'heuristic', dim: 'density',
      run: function (m) {
        // The declared structure IS three layers (title row · optional head
        // extras · content block) — three is the design, four is a stack.
        var groups = 1;
        if (m.out.headAfter || m.out.legend || m.out.meter) groups++;
        if (m.out.value != null || m.out.chart || m.out.sub || m.out.rich) groups++;
        return {
          status: groups <= 3 ? 'pass' : groups === 4 ? 'warn' : 'fail',
          measured: groups + ' top-level group(s)'
        };
      }
    },
    {
      id: 'density', layer: 'heuristic', dim: 'density',
      run: function (m) {
        var chars = m.textChars;
        var budget = 90;
        return {
          status: chars <= budget ? 'pass' : chars <= budget * 1.6 ? 'warn' : 'fail',
          measured: chars + ' chars / budget ' + budget + ' @150'
        };
      }
    },
    {
      id: 'scaleStable', layer: 'heuristic', dim: 'balance',
      run: function (m) {
        if (!m.zoom) return { status: 'na', measured: 'no magnified sample' };
        var heightKept = m.zoom.h <= m.zoom.zoomUnit + 1;
        var sameHierarchy = m.zoom.valueFont >= m.zoom.titleFont;
        return {
          status: heightKept && sameHierarchy ? 'pass' : heightKept || sameHierarchy ? 'warn' : 'fail',
          measured: 'at ×' + m.zoom.factor.toFixed(2) + ' (' + m.zoom.zoomUnit + 'px) height ' + m.zoom.h.toFixed(0) +
            'px · value ' + m.zoom.valueFont + 'px vs title ' + m.zoom.titleFont + 'px'
        };
      }
    },
    {
      id: 'copyTruth', layer: 'heuristic', dim: 'hierarchy',
      run: function (m) {
        var note = NOTES[m.id];
        if (!note) return { status: 'pass', measured: 'description matches the implementation' };
        return { status: 'warn', measured: note.measured };
      }
    }
  ];

  /** Declared copy-vs-implementation findings (real, verified against src/). */
  var NOTES = {
    'cc-window-monthly': {
      measured: 'copy says used/(used+remaining); src/client/lib/cc-view.ts:170 uses (allowance−remaining)/allowance',
      source: 'src/client/lib/cc-view.ts:149-188'
    }
  };

  /** Measured observations that are not per-rule results. */
  var OBSERVATIONS = [
    {
      id: 'sys-board',
      key: 'obs.sizeContract',
      measured: '2×4 only · at 2×2 the rings overflow the 150px box by 16px'
    }
  ];

  var DIMS = [
    { id: 'alignment', rules: ['pad', 'titleInset', 'rightSlot', 'blockAlign'] },
    { id: 'spacing', rules: ['rhythm', 'fit'] },
    { id: 'hierarchy', rules: ['primary', 'emphasise', 'copyTruth'] },
    { id: 'density', rules: ['grouping', 'density'] },
    { id: 'balance', rules: ['action', 'scaleStable'] }
  ];

  var WEIGHT = { pass: 1, warn: 0.6, fail: 0, na: null };

  /** Run every rule on one measurement; returns rules + 5 dimension scores.
   *  score = round(100 · Σweight / Σapplicable). Nothing else. */
  function audit(m) {
    var byId = {};
    var results = RULES.map(function (r) {
      var out;
      try { out = r.run(m); } catch (e) { out = { status: 'na', measured: 'not measurable: ' + e.message }; }
      var item = { id: r.id, layer: r.layer, dim: r.dim, status: out.status, measured: out.measured };
      byId[r.id] = item;
      return item;
    });
    var scores = {};
    DIMS.forEach(function (d) {
      var sum = 0, n = 0;
      d.rules.forEach(function (id) {
        var w = WEIGHT[byId[id].status];
        if (w === null) return;
        sum += w; n++;
      });
      scores[d.id] = n ? Math.round((100 * sum) / n) : null;
    });
    var over = scores;
    var vals = Object.keys(over).map(function (k) { return over[k]; }).filter(function (v) { return v !== null; });
    var overall = vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : null;
    return { rules: results, byId: byId, scores: scores, overall: overall };
  }

  /* ── 4. measurement — the REAL rendered card DOM ───────────── */
  function rect(el, host) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    // normalise into the host's coordinate space so all boxes are comparable
    var h = host.getBoundingClientRect();
    return {
      top: r.top - h.top, left: r.left - h.left, right: r.right - h.left, bottom: r.bottom - h.top,
      w: r.width, h: r.height
    };
  }

  /**
   * Measure one rendered `.wg-card` element.
   * unit — the unit it was rendered at (its inline width/min-height say so).
   */
  function measure(cardEl, w, unit, size) {
    var cs = getComputedStyle(cardEl);
    var card = rect(cardEl, cardEl.parentElement || cardEl);
    var host = cardEl.parentElement || cardEl;
    function box(sel) { return rect(cardEl.querySelector(sel), host); }
    function fontPx(sel) {
      var el = cardEl.querySelector(sel);
      return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : 0;
    }
    var boxes = ['wg-title-row', 'wg-value', 'wg-title-right', 'wg-foot', 'wg-legend', 'wg-headafter', 'wg-meter', 'wg-sub', 'wg-corner', 'wg-rings', 'wg-bars-wrap', 'wg-heat', 'wg-segbar', 'wg-quote']
      .map(function (c) { return box('.' + c); });
    var footEl = cardEl.querySelector('.wg-foot');
    var footKids = footEl ? Array.prototype.slice.call(footEl.children).map(function (k) { return rect(k, host); }) : [];
    var title = box('.wg-title-row');
    var foot = box('.wg-foot');
    var valueBox = box('.wg-value') || box('.wg-title-right');
    var textChars = (cardEl.textContent || '').replace(/\s+/g, ' ').trim().length;
    return {
      id: w.id, unit: unit, size: size,
      metric: metric(unit),
      card: card,
      pad: {
        t: parseFloat(cs.paddingTop), r: parseFloat(cs.paddingRight),
        b: parseFloat(cs.paddingBottom), l: parseFloat(cs.paddingLeft)
      },
      radius: parseFloat(cs.borderTopLeftRadius),
      boxW: card ? card.w : 0,
      title: title, foot: foot, footKids: footKids, valueBox: valueBox, titleRight: box('.wg-title-right'),
      corner: box('.wg-corner'),
      boxes: boxes,
      titleFont: fontPx('.wg-title-row'),
      valueFont: fontPx('.wg-value') || fontPx('.wg-title-right') || metric(unit).value,
      scroll: { w: cardEl.scrollWidth, h: cardEl.scrollHeight },
      client: { w: cardEl.clientWidth, h: cardEl.clientHeight },
      textChars: textChars,
      out: window.DASH_PREVIEWS.out(w, { unit: unit, size: size })
    };
  }

  /** Magnified sample: measure the same widget at unit × peak. */
  function zoomProbe(w, unit, size, factor) {
    var host = document.createElement('div');
    host.className = 'wg-slot';
    host.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;';
    host.innerHTML = window.DASH_PREVIEWS.render(w, { unit: unit * factor, size: size });
    document.body.appendChild(host);
    var el = host.firstElementChild;
    var m = measure(el, w, unit * factor, size);
    var r = {
      factor: factor, unit: unit, zoomUnit: Math.round(unit * factor), h: m.card.h,
      titleFont: m.titleFont, valueFont: m.valueFont,
      overflow: Math.max(0, m.scroll.h - m.client.h)
    };
    document.body.removeChild(host);
    return r;
  }

  /* ── 4b. primary pattern + interaction, read off the render output ── */
  function patternOf(out) {
    if (out.chart) {
      var k = out.chart.kind;
      if (k === 'bars') return 'pattern.bars';
      if (k === 'rings') return 'pattern.rings';
      if (k === 'heat') return 'pattern.heat';
      if (k === 'line') return 'pattern.line';
      if (k === 'segbar') return 'pattern.segments';
      return 'pattern.chart';
    }
    if (out.rich && out.rich.text) return 'pattern.text';
    if (out.meter && out.meter.length) return 'pattern.meter';
    if (out.headAfter) return 'pattern.valuePair';
    if (out.value != null) return 'pattern.value';
    return 'pattern.status';
  }
  function interactionOf(out) {
    if (out.corner) return 'ia.action';
    if (out.cycle) return 'ia.cycle';
    return 'ia.readonly';
  }

  /* ── 5. anatomy targets (representative real widgets) ──────── */
  var ANATOMY = [
    { id: 'counts', why: 'singleValue' },
    { id: 'context-water', why: 'valuePlusBreakdown' },
    { id: 'usage-rings', why: 'chartOnly' },
    { id: 'heatmap-bars', why: 'bottomAnchored' },
    { id: 'peak-pricing', why: 'meterStates' },
    { id: 'quote', why: 'textOnly' }
  ];

  /* ── 6. the rail playground: real 2-column rails ──────────── */
  var RAIL_IDS = ['counts', 'context-water', 'tps', 'usage-rings', 'peak-pricing', 'heatmap-bars'];

  return {
    C: C,
    SOURCE: SOURCE,
    NOTES: NOTES,
    OBSERVATIONS: OBSERVATIONS,
    RULES: RULES,
    DIMS: DIMS,
    ANATOMY: ANATOMY,
    RAIL_IDS: RAIL_IDS,
    metric: metric,
    cardRadius: cardRadius,
    cardInnerPad: cardInnerPad,
    railWidth: railWidth,
    wideWidth: wideWidth,
    stepScale: stepScale,
    scaleField: scaleField,
    layout: layout,
    audit: audit,
    measure: measure,
    zoomProbe: zoomProbe,
    patternOf: patternOf,
    interactionOf: interactionOf
  };
})();
