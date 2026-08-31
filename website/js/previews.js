/**
 * dsh-widgets showcase — widget previews built from the REAL widget logic.
 *
 * This module ports, statically and without touching the plugin, the exact
 * rendering path of the actual widgets:
 *   - PREVIEW_STATS / PREVIEW_RAW  ← src/client/components.tsx (the same mock
 *     the real market & config previews are fed);
 *   - fmt* / buildRollingGrid / lastNDays* ← src/client/lib/format.ts;
 *   - per-widget render() ← each src/widgets/<id>/index.ts + lib/usage-view.ts;
 *   - card layout & typography ← components.tsx CardBody/ChartBlock (title 13,
 *     value 20, pad 12, radius 16 at unit 150 — all scaled by unit/150);
 *   - colors ← the real DSH tokens (tokens.css --dsw-* group, both themes).
 * Result: the website shows what the product shows — same data, same format,
 * same structure, same visual language.
 */
window.DASH_PREVIEWS = (function () {
  'use strict';

  /* ── real format.ts ─────────────────────────────────────────── */
  function fmtDuration(ms) {
    var s = ms / 1000;
    if (s < 60) return String(Math.round(s * 10) / 10) + 's';
    var whole = Math.round(s);
    return Math.floor(whole / 60) + 'm' + (whole % 60) + 's';
  }
  function fmtTokens(n) {
    var scaled = function (v) { return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10); };
    if (n < 1000) return String(n);
    if (n < 1000000) return scaled(n / 1000) + 'K';
    return scaled(n / 1000000) + 'M';
  }
  function fmtTps(tps) {
    return tps >= 10 ? String(Math.round(tps)) : String(Math.round(tps * 10) / 10);
  }
  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function buildRollingGrid(raw, weeks) {
    var now = new Date();
    var startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    var base = new Date(startOfWeek);
    base.setDate(base.getDate() - (weeks - 1) * 7);
    var grid = [];
    for (var r = 0; r < 7; r++) {
      var row = [];
      for (var c = 0; c < weeks; c++) {
        var d = new Date(base);
        d.setDate(base.getDate() + c * 7 + r);
        var k = dayKey(d);
        row.push({ value: raw[k] || 0, date: k });
      }
      grid.push(row);
    }
    return grid;
  }
  function lastNDays(raw, n) {
    var byDate = {};
    Object.keys(raw).sort().forEach(function (k) { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k]; });
    var now = new Date();
    var days = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      var k = dayKey(d);
      var v = byDate[k] || 0;
      days.push({ label: (d.getMonth() + 1) + '.' + d.getDate(), value: v, tone: v > 0 ? 'primary' : 'muted' });
    }
    var max = Math.max.apply(null, [1].concat(days.map(function (x) { return x.value; })));
    days.forEach(function (x) { x.ratio = x.value > 0 ? x.value / max : 0; });
    return days;
  }
  function fmtShortDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return Number(m[2]) + '.' + Number(m[3]);
  }

  /* ── REAL preview mock (components.tsx PREVIEW_RAW + PREVIEW_STATS) ── */
  var PREVIEW_RAW = (function () {
    var raw = {};
    var now = new Date();
    var startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    var base = new Date(startOfWeek);
    base.setDate(base.getDate() - 12 * 7);
    for (var i = 0; i <= 12 * 7 + 6; i++) {
      var d = new Date(base);
      d.setDate(base.getDate() + i);
      var k = dayKey(d);
      var off = i - 12 * 7;
      raw[k] = off % 5 === 0 ? (Math.pow(Math.abs(off) % 13, 2) + 4000) : off % 3 === 0 ? (off % 11) * 800 : 0;
    }
    return raw;
  })();

  var STATS = {
    turns: 11, steps: 137,
    llmMs: 1150000, toolMs: 247000,
    ttftMs: 3800, ttftSteps: 1000,
    decodeMs: 5000, decodeTokens: 600,
    usage: { inputTokens: 18600000, cacheReadTokens: 18400000, outputTokens: 75600 },
    usageData: {
      usage: {
        rolling: { status: 'ok', percent: 42, resetsAt: '2026-08-15T07:25:56Z' },
        weekly: { status: 'ok', percent: 25, resetsAt: '2026-08-17T00:00:00Z' },
        monthly: { status: 'ok', percent: 8, resetsAt: '2026-09-14T11:35:13Z' }
      }
    },
    contextPercent: 0.42,
    contextWindow: 1000000,
    contextTokens: 446000,
    contextBreakdown: { systemTokens: 6000, toolsTokens: 11700, messageTokens: 428300 },
    todos: [
      { content: 'Split plan tasks', status: 'in_progress' },
      { content: 'Feed context data', status: 'completed' },
      { content: 'Write config form', status: 'completed' },
      { content: 'Polish hover animation', status: 'pending' },
      { content: 'Publish npm', status: 'pending' }
    ],
    heatmapGrid: buildRollingGrid(PREVIEW_RAW, 13),
    heatmapRaw: PREVIEW_RAW,
    armedAction: null
  };

  function t(key, vars) { return window.DASH_I18N.t(key, vars); }

  /* ── real per-widget render() — ported from the unit implementations ── */
  var SEG_TONES = {
    primary: 'var(--dsw-title)',
    success: 'var(--dsw-ok)',
    warn: 'var(--dsw-warn)',
    danger: 'var(--dsw-err)',
    muted: 'var(--dsw-label-ter)'
  };
  var SEG_COLORS = ['var(--dsw-seg-system)', 'rgb(167, 139, 250)', 'var(--dsw-seg-messages)'];

  function renderOut(w, opts) {
    var s = STATS;
    switch (w.id) {
      case 'counts':
        return { title: t('widget.counts.name'), value: t('card.counts.value', { turns: s.turns, steps: s.steps }) };
      case 'llm':
        return { title: t('widget.llm.name'), value: fmtDuration(s.llmMs) };
      case 'tool':
        return { title: t('widget.tool.name'), value: fmtDuration(s.toolMs) };
      case 'ttft':
        return { title: t('widget.ttft.name'), value: fmtDuration(s.ttftMs / s.ttftSteps) };
      case 'tps':
        return { title: t('widget.tps.name'), value: fmtTps(s.decodeTokens / (s.decodeMs / 1000)) + ' tok/s' };
      case 'cache':
        return s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0
          ? { title: t('widget.cache.name'), value: String(Math.round((s.usage.cacheReadTokens / s.usage.inputTokens) * 100)) + '%' }
          : null;
      case 'tokens':
        return s.usage && s.usage.inputTokens > 0
          ? { title: t('widget.tokens.name'), value: fmtTokens(s.usage.inputTokens) + ' ' + fmtTokens(s.usage.outputTokens || 0) }
          : null;
      case 'context': {
        var pct = s.contextPercent == null ? null : Math.round(s.contextPercent * 100);
        return {
          title: t('card.context.title'),
          value: pct == null ? undefined : pct + '%',
          sub: pct == null ? t('card.context.waiting') : undefined,
          corner: { id: 'contextCompact', label: t('card.context.compact'), armedLabel: t('card.context.confirm'), pos: 'bottom' }
        };
      }
      case 'context-water': {
        var p = s.contextPercent;
        var brk = s.contextBreakdown;
        if (p == null || !brk) return null;
        var sys = brk.systemTokens || 0, tools = brk.toolsTokens || 0, msg = brk.messageTokens || 0;
        var total = sys + tools + msg;
        var fmt = function (n) {
          if (n >= 1000000) return String(Math.round(n / 100000) / 10) + 'M';
          if (n >= 1000) return String(Math.round(n / 100) / 10) + 'K';
          return String(n);
        };
        var used = s.contextWindow ? fmt(total) : null;
        var cap = s.contextWindow ? fmt(s.contextWindow) : null;
        var segments = [
          { label: t('card.contextWater.system'), tokens: sys, tone: 'muted' },
          { label: t('card.contextWater.tools'), tokens: tools, tone: 'success' },
          { label: t('card.contextWater.messages'), tokens: msg, tone: 'primary' }
        ];
        if (opts.size === '2x4') {
          return {
            title: t('card.contextWater.title'),
            value: Math.round(p * 100) + '%',
            headRight: used && cap ? used + ' / ' + cap : undefined,
            chart: total > 0 ? { kind: 'segments', segments: segments, totalTokens: total } : undefined
          };
        }
        return {
          title: t('card.contextWater.title'),
          headAfter: { big: Math.round(p * 100) + '%', small: used && cap ? used + ' / ' + cap : undefined },
          chart: total > 0 ? { kind: 'segments', segments: segments, totalTokens: total } : undefined
        };
      }
      case 'task': {
        var todos = s.todos;
        var pending = todos ? todos.filter(function (x) { return x.status === 'pending'; }).length : 0;
        var doing = todos ? todos.filter(function (x) { return x.status === 'in_progress'; }).length : 0;
        var done = todos ? todos.filter(function (x) { return x.status === 'completed'; }).length : 0;
        var totalN = todos ? todos.length : 0;
        return {
          title: t('widget.task.name'),
          value: totalN > 0 ? t('card.task.done', { n: done }) : t('card.task.none'),
          sub: t('card.task.sub', { doing: doing, pending: pending })
        };
      }
      case 'quote':
        return {
          title: t('card.quote.title'),
          rich: { type: 'quote', text: t('quote.previewPlaceholder'), align: 'left', valign: 'top', wrap: true }
        };
      case 'heatmap': {
        var rawLog = s.heatmapRaw;
        var wide = opts.size === '2x4';
        var grid = rawLog && wide ? buildRollingGrid(rawLog, 30) : (s.heatmapGrid || (rawLog ? buildRollingGrid(rawLog, 13) : undefined));
        if (!grid || !grid.length) return null;
        var todayK = dayKey(new Date());
        var todayVal = 0, tt = 0;
        grid.forEach(function (row) { row.forEach(function (c) { tt += c.value; if (c.date === todayK) todayVal = c.value; }); });
        var figures = todayVal > 0 || tt > 0 ? fmtTokens(todayVal) + '  ' + fmtTokens(tt) : undefined;
        return {
          title: t('card.heatmap.title'),
          [wide ? 'headRight' : 'legend']: figures,
          chart: { kind: 'heatmap', heatmap: grid }
        };
      }
      case 'heatmap-bars': {
        var raw2 = s.heatmapRaw;
        if (!raw2) return null;
        var bars = lastNDays(raw2, 7);
        if (!bars.length) return null;
        var today2 = raw2[dayKey(new Date())] || 0;
        var weekTotal = bars.reduce(function (a, b) { return a + b.value; }, 0);
        var lg = today2 > 0 || weekTotal > 0 ? fmtTokens(today2) + '  ' + fmtTokens(weekTotal) : undefined;
        return { title: t('card.heatmap.title'), legend: lg, chart: { kind: 'barsV', bars: bars } };
      }
      case 'usage-bars': {
        var u = s.usageData.usage;
        var tone = function (p) { return p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success'; };
        return {
          title: t('usage.title'),
          legend: t('usage.totalKey'),
          chart: {
            kind: 'bars',
            bars: [
              { label: t('usage.rolling'), value: u.rolling.percent, ratio: u.rolling.percent / 100, tone: tone(u.rolling.percent) },
              { label: t('usage.week'), value: u.weekly.percent, ratio: u.weekly.percent / 100, tone: tone(u.weekly.percent) },
              { label: t('usage.month'), value: u.monthly.percent, ratio: u.monthly.percent / 100, tone: tone(u.monthly.percent) }
            ]
          }
        };
      }
      case 'usage-rings': {
        var ur = s.usageData.usage;
        var toneR = function (p) { return p >= 95 ? 'danger' : p >= 75 ? 'warn' : 'success'; };
        return {
          title: t('usage.title'),
          legend: t('usage.totalKey'),
          chart: {
            kind: 'rings',
            rings: [
              { label: t('usage.rolling'), value: ur.rolling.percent, ratio: ur.rolling.percent / 100, tone: toneR(ur.rolling.percent) },
              { label: t('usage.week'), value: ur.weekly.percent, ratio: ur.weekly.percent / 100, tone: toneR(ur.weekly.percent) },
              { label: t('usage.month'), value: ur.monthly.percent, ratio: ur.monthly.percent / 100, tone: toneR(ur.monthly.percent) }
            ]
          }
        };
      }
      case 'usage-rolling':
      case 'usage-weekly':
      case 'usage-monthly': {
        var u2 = s.usageData.usage[(w.id === 'usage-rolling' ? 'rolling' : w.id === 'usage-weekly' ? 'weekly' : 'monthly')];
        var nameKeys = { 'usage-rolling': 'widget.usage-rolling.name', 'usage-weekly': 'widget.usage-weekly.name', 'usage-monthly': 'widget.usage-monthly.name' };
        return {
          title: t(nameKeys[w.id]),
          value: u2.percent + '%',
          legend: t('usage.totalKey'),
          sub: t('usage.resets', { date: String(u2.resetsAt || '').slice(0, 10) })
        };
      }
      case 'peak-pricing': {
        var sim = opts.sim;
        var peak = sim && typeof sim.peak === 'boolean' ? sim.peak : true; /* preview default OFF in real; we default to CHEAP */
        return {
          title: t('card.peak.title'),
          meter: [
            { label: t('card.peak.window1'), active: peak && (!sim || sim.window !== 1) },
            { label: t('card.peak.window2'), active: peak && sim && sim.window === 1 }
          ],
          value: peak ? 'EXPENSIVE' : 'CHEAP',
          valueTone: peak ? 'danger' : undefined,
          alert: peak
        };
      }
      default:
        return { title: w.name, value: '—' };
    }
  }

  /* ── real CardBody (components.tsx) port ─────────────────────── */
  var COMPRESS_ICON =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path fill="currentColor" d="M7.92136 0.349152C10.3744 0.349234 12.5564 1.5052 13.9557 3.29894L15.1281 2.12759C15.3303 1.92546 15.6767 2.06943 15.6767 2.35538V5.53923C15.6766 5.71626 15.5329 5.85976 15.3559 5.86002H12.171C11.8854 5.8597 11.7426 5.51465 11.9443 5.31249L12.9641 4.29056C11.8237 2.74305 9.98908 1.74106 7.92136 1.74097C4.46436 1.74097 1.66233 4.543 1.66233 8C1.66233 11.457 4.46436 14.259 7.92136 14.259C11.3782 14.2589 14.1804 11.4569 14.1804 8H15.5722C15.5722 12.2251 12.1465 15.6507 7.92136 15.6508C3.69614 15.6508 0.270508 12.2252 0.270508 8C0.270508 3.77478 3.69614 0.349152 7.92136 0.349152Z"/>' +
    '</svg>';

  function segFmt(n) {
    var k = n / 1000;
    if (k >= 1000) return '~' + (Math.round((k / 1000) * 10) / 10) + 'M';
    if (k >= 100) return '~' + Math.round(k) + 'K';
    if (k >= 10) return '~' + (Math.round(k * 10) / 10) + 'K';
    if (k >= 1) return '~' + (Math.round(k * 10) / 10) + 'K';
    return '~' + n;
  }

  function chartHtml(chart, scale, width) {
    var num = function (v) { return Math.round(v * scale); };
    if (!chart) return '';
    if (chart.kind === 'bars' && chart.bars) {
      var h = Math.round(56 * scale);
      var gl = [0.25, 0.5, 0.75].map(function (p) {
        return '<div class="wg-bars-gridline" style="top:' + (h * (1 - p)) + 'px"></div>';
      }).join('');
      var cols = chart.bars.map(function (b) {
        var ratio = Math.max(0, Math.min(1, b.ratio != null ? b.ratio : b.value / 100));
        var pct = Math.round(b.value != null ? b.value : ratio * 100);
        return '<div class="wg-bars-col" title="' + (b.label + ' ' + pct + '%') + '">' +
          '<div class="wg-bars-track" style="height:' + h + 'px">' +
          '<div class="wg-bars-fill" style="height:' + Math.max(2, Math.round(h * ratio)) + 'px;background:' +
          (SEG_TONES[b.tone] || SEG_TONES.primary) + ';opacity:' + (ratio >= 0.95 ? 0.9 : 0.85) + '"></div></div>' +
          '<div class="wg-bars-label" style="font-size:' + num(9) + 'px">' + b.label + '</div></div>';
      }).join('');
      /* content-sized container (like the real ChartBlock): the 56px bar
         AREA is the track; the x labels live INSIDE the container, so they
         never overflow the chart box. Gridlines are relative to the top of
         the container = the top of the bar area. */
      return '<div class="wg-bars-wrap">' + gl + '<div class="wg-bars">' + cols + '</div></div>';
    }
    if (chart.kind === 'barsV' && chart.bars) {
      var cell = Math.round(8 * scale);
      var areaH = 7 * cell + 12;
      var labelH = Math.round(10 * scale);
      var max = Math.max.apply(null, [1].concat(chart.bars.map(function (b) { return b.value; })));
      var last = chart.bars.length - 1;
      var vs = chart.bars.map(function (b, i) {
        var ratio = Math.max(0, Math.min(1, b.ratio != null ? b.ratio : b.value / max));
        var active = (b.value || 0) > 0;
        var label = i === 0 || i === last ? b.label : '';
        return '<div class="wg-bars-col" style="height:' + areaH + 'px;justify-content:flex-end;gap:3px" title="' + b.label + ': ' + b.value + ' tok">' +
          '<div style="width:93%;max-width:' + Math.max(6, Math.round(21 * scale)) + 'px;height:' +
          (active ? Math.max(2, Math.round((areaH - labelH) * ratio)) : Math.max(2, Math.round(3 * scale))) +
          'px;border-radius:4px;background:' + (SEG_TONES[b.tone] || SEG_TONES.primary) + ';opacity:' + (active ? 0.85 : 0.18) + '"></div>' +
          '<div style="font-size:' + num(9) + 'px;color:var(--dsw-label-ter);line-height:1;min-height:' + labelH + 'px">' + label + '</div></div>';
      }).join('');
      return '<div style="display:flex;align-items:flex-end;gap:4px;height:' + areaH + 'px;margin-top:' + num(4) + 'px">' + vs + '</div>';
    }
    if (chart.kind === 'segments' && chart.segments && chart.totalTokens) {
      var totalT = chart.totalTokens;
      var bh = Math.max(4, Math.round(5 * scale));
      var bar = chart.segments.map(function (sg, i) {
        var w = totalT > 0 ? Math.max(2.2, (sg.tokens / totalT) * 100) : 0;
        return '<div class="wg-seg" style="width:' + w + '%;background:' + (SEG_COLORS[i % 3] || SEG_COLORS[0]) + '"></div>';
      }).join('');
      var rows = chart.segments.map(function (sg, i) {
        return '<div class="wg-segrow" style="font-size:' + num(12) + 'px;padding:2px 0">' +
          '<span class="wg-segrow-label"><span class="wg-segrow-swatch" style="background:' + (SEG_COLORS[i % 3] || SEG_COLORS[0]) + '"></span>' + sg.label + '</span>' +
          '<span class="wg-segrow-value">' + segFmt(sg.tokens) + '</span></div>';
      }).join('');
      return '<div><div class="wg-segbar" style="height:' + bh + 'px;margin:8px 0 10px">' + bar + '</div>' +
        '<div style="margin-top:2px">' + rows + '</div></div>';
    }
    if (chart.kind === 'rings' && chart.rings && chart.rings.length) {
      var pad = Math.round(8 * scale);
      var mg = Math.round(12 * scale);
      var avail = width - 2 * pad;
      var r = Math.max(10, Math.min(24 * scale, (avail - (chart.rings.length - 1) * mg) / (chart.rings.length * 2)));
      var sw = Math.max(3.5, Math.round(5 * scale));
      var rings = chart.rings.map(function (rg) {
        var p = Math.max(0, Math.min(1, rg.ratio != null ? rg.ratio : rg.value / 100));
        var c = 2 * Math.PI * (r - sw / 2);
        var tone = SEG_TONES[rg.tone] || SEG_TONES.primary;
        return '<div class="wg-ring" title="' + rg.label + ' ' + Math.round(rg.value) + '%">' +
          '<svg width="' + Math.round(r * 2) + '" height="' + Math.round(r * 2) + '" viewBox="0 0 ' + Math.round(r * 2) + ' ' + Math.round(r * 2) + '" aria-hidden="true">' +
          '<circle class="wg-ring-track" cx="' + r + '" cy="' + r + '" r="' + (r - sw / 2) + '" stroke-width="' + sw + '"></circle>' +
          '<circle cx="' + r + '" cy="' + r + '" r="' + (r - sw / 2) + '" fill="none" stroke="' + tone + '" stroke-width="' + sw +
          '" stroke-linecap="round" stroke-dasharray="' + (c * p).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + r + ' ' + r + ')"></circle></svg>' +
          '<div class="wg-ring-value" style="font-size:' + num(11) + 'px;margin-top:' + Math.round(4 * scale) + 'px">' + Math.round(rg.value) + '%</div></div>';
      }).join('');
      return '<div class="wg-rings" style="gap:' + mg + 'px">' + rings + '</div>';
    }
    if (chart.kind === 'heatmap' && chart.heatmap && chart.heatmap.length) {
      var weeks = chart.heatmap[0] ? chart.heatmap[0].length : 13;
      var isWide = weeks >= 20;
      var hpad = Math.round(12 * scale);
      var availW = width - 2 * hpad;
      var hcell = isWide ? Math.max(3, Math.floor((availW - (weeks - 1) * 2) / weeks)) : Math.round(8 * scale);
      var maxV = Math.max.apply(null, [1].concat(chart.heatmap.reduce(function (a, row) { return a.concat(row.map(function (c) { return c.value; })); }, [])));
      var rows7 = chart.heatmap.map(function (week) {
        var cells = week.map(function (c) {
          var tt = maxV > 0 ? c.value / maxV : 0;
          var alpha = tt > 0 ? 0.25 + 0.7 * tt : 0.12;
          return '<div class="wg-heat-cell' + (tt > 0 ? '' : ' off') + '" title="' + c.date + ': ' + c.value + ' tok" style="width:' + hcell + 'px;height:' + hcell + 'px;' +
            (tt > 0 ? 'background:color-mix(in srgb, var(--dsw-title) ' + (Math.round(alpha * 100)) + '%, transparent)' : '') + '"></div>';
        }).join('');
        return '<div class="wg-heat-row">' + cells + '</div>';
      }).join('');
      var todayIso = dayKey(new Date());
      var firstD = chart.heatmap[0] && chart.heatmap[0][0] ? chart.heatmap[0][0].date : undefined;
      return '<div class="wg-heat" style="margin-top:' + Math.round(4 * scale) + 'px">' + rows7 +
        '<div class="wg-heat-corners" style="font-size:' + (8.5 * scale).toFixed(1) + 'px;margin-top:' + Math.round(3 * scale) + 'px">' +
        '<span>' + (firstD ? fmtShortDate(firstD) : '') + '</span><span>' + fmtShortDate(todayIso) + '</span></div></div>';
    }
    return '';
  }

  function cornerHtml(corner, scale) {
    if (!corner) return '';
    var pos = corner.pos === 'bottom' ? 'bottom:8px;right:8px' : 'top:8px;right:8px';
    return '<button class="wg-corner" type="button" style="' + pos + '" title="' + (corner.armed ? corner.armedLabel : corner.label) + '">' +
      (corner.armed ? corner.armedLabel : COMPRESS_ICON) + '</button>';
  }

  function cardHtml(out, opts) {
    if (!out) return '';
    var unit = opts.unit || 150;
    var scale = unit / 150;
    var titlePx = Math.round(13 * scale);
    var valuePx = Math.round(20 * scale);
    var radius = Math.round(16 * scale);
    var pad = Math.round(12 * scale);
    var num = function (v) { return Math.round(v * scale); };
    var wide = opts.size === '2x4';
    /* real 2×4 width = two grid-units + the rail's inter-card gap (panelPadding=24) */
    var boxW = wide ? unit * 2 + 24 : unit;

    /* header */
    var titleRow =
      '<div class="wg-title-row" style="font-size:' + titlePx + 'px">' +
      '<span class="wg-title-group"><span class="wg-title-text">' + out.title + '</span>' +
      (out.headRight && out.value != null
        ? '<span style="font-size:' + valuePx + 'px;font-weight:600;color:var(--dsw-label-pri);font-variant-numeric:tabular-nums">' + out.value + '</span>'
        : '') +
      (out.headRight
        ? '<span style="font-size:' + num(10) + 'px;color:var(--dsw-label-ter);font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">' + out.headRight + '</span>'
        : '') +
      '</span></div>';
    var head = titleRow;
    if (out.headAfter) {
      head += '<div class="wg-headafter" style="margin-top:' + num(2) + 'px">' +
        '<span class="wg-value" style="font-size:' + valuePx + 'px">' + (out.headAfter.big != null ? out.headAfter.big : '') + '</span>' +
        (out.headAfter.small != null
          ? '<span style="font-size:' + num(10) + 'px;color:var(--dsw-label-ter);font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">' + out.headAfter.small + '</span>'
          : '') +
        '</div>';
    }
    if (out.legend) {
      head += '<div class="wg-legend" style="font-size:' + num(10) + 'px;margin-top:' + num(2) + 'px">' + out.legend + '</div>';
    }
    if (out.meter && out.meter.length) {
      head += '<div class="wg-meter" style="margin-top:' + num(4) + 'px">' +
        out.meter.map(function (m) {
          return '<div class="wg-meter-row' + (m.active ? ' on' : '') + '" style="font-size:' +
            (m.active ? num(12) : num(10)) + 'px">' + m.label + '</div>';
        }).join('') + '</div>';
    }

    /* body */
    var body = '';
    if (out.value != null && !out.headRight) {
      body += '<div class="wg-value' + (out.valueTone === 'danger' ? ' danger' : '') + '" style="font-size:' + valuePx + 'px">' + out.value + '</div>';
    }
    if (out.sub) {
      body += '<div class="wg-sub">' + out.sub + '</div>';
    }
    var chart = chartHtml(out.chart, scale, boxW);
    if (chart) body += '<div>' + chart + '</div>';
    if (out.rich && out.rich.text) {
      body += '<div class="wg-quote" style="font-size:' + num(12) + 'px;margin-top:' + num(6) + 'px;text-align:' + (out.rich.align || 'left') + ';white-space:pre-wrap">' + out.rich.text + '</div>';
    }

    var foot =
      '<div class="wg-foot">' + body + '</div>';

    return (
      '<div class="wg-card' + (out.alert ? ' wg-alert' : '') + '" style="width:' + boxW + 'px;min-height:' + unit + 'px;border-radius:' + radius + 'px;padding:' + pad + 'px"' +
      (out.cycle && out.cycle.hint ? ' title="' + out.cycle.hint + '"' : '') + '>' +
      cornerHtml(out.corner, scale) +
      '<div class="wg-card-inner">' + head + foot + '</div>' +
      '</div>'
    );
  }

  /**
   * Public: render one widget as REAL card HTML.
   * opts: { unit=150, size='2x2'|'2x4', sim } 
   */
  function render(w, opts) {
    opts = opts || {};
    var out = renderOut(w, opts);
    return cardHtml(out, opts);
  }

  return {
    render: render,
    out: renderOut,
    stats: STATS,
    formats: { fmtTokens: fmtTokens, fmtDuration: fmtDuration },
    /* real grid rules (mirrors src/client/index.ts DEFAULTS: cardSide 150,
       panelPadding 24 used for padding AND inter-card gap) */
    GRID: { unit: 150, gap: 24, pad: 24, wide: 150 * 2 + 24 }
  };
})();