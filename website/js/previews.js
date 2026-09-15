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
  function fmtGb(bytes) {
    var gb = bytes / (1024 * 1024 * 1024);
    return (gb >= 10 ? String(Math.round(gb)) : String(Math.round(gb * 10) / 10)) + ' GB';
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
    // Command Code account mock — mirrors components.tsx PREVIEW_STATS so the
    // eight cc-* cards preview exactly as the product's market does.
    commandCode: {
      whoami: { success: true, user: { id: 'usr_demo', name: 'Physicolor', email: 'demo@example.com', userName: 'Physicolor' }, org: null },
      usage: { totalCount: 4821, totalCost: 0.467622536, averageCost: 0.0079258, successRate: 100, completedCount: 4821, failedCount: 0, totalTokensIn: 4896670, totalTokensOut: 28435, totalTokens: 4925105, totalCredits: 0.467622536, totalMonthlyCredits: 0.467622536, periodBasis: 'billing-period' },
      credits: { credits: { belowThreshold: false, creditThreshold: 0, monthlyCredits: 69.163327664, purchasedCredits: 0, freeCredits: 0 }, windowLimits: { limited: true, exceeded: null, fiveHour: { used: 0.836672336, cap: 14, exceeded: false, resetAt: 1789039577701 }, weekly: { used: 0.836672336, cap: 35, exceeded: false, resetAt: 1789626377701 } } },
      subscription: { success: true, data: { id: 'sub_demo', status: 'active', planId: 'individual-goat', priceId: 'price_demo', quantity: 1, cancelAtPeriodEnd: false, currentPeriodStart: '2026-09-10T04:42:28.000Z', currentPeriodEnd: '2026-10-10T04:42:28.000Z', endedAt: null, canceledAt: null } }
    },
    todos: [
      { content: 'Split plan tasks', status: 'in_progress' },
      { content: 'Feed context data', status: 'completed' },
      { content: 'Write config form', status: 'completed' },
      { content: 'Polish hover animation', status: 'pending' },
      { content: 'Publish npm', status: 'pending' }
    ],
    heatmapGrid: buildRollingGrid(PREVIEW_RAW, 13),
    heatmapRaw: PREVIEW_RAW,
    armedAction: null,
    sysinfo: {
      ts: 0,
      cpu: { util: 43 },
      mem: { used: 17.4 * 1024 * 1024 * 1024, total: 34.2 * 1024 * 1024 * 1024, percent: 51 },
      gpu: { name: 'NVIDIA GeForce RTX 5070 Ti Laptop GPU', temp: 58, util: 8, memUsed: 4815 * 1024 * 1024, memTotal: 12227 * 1024 * 1024, memPercent: 39 },
      // 30 samples @10s (~5 min) of plausible utilization drift for the
      // sparkline preview: GPU idles low with a burst, CPU wanders mid-load.
      history: (function () {
        var now = Date.now(), ts = [], cpu = [], gpu = [], i;
        for (i = 0; i < 30; i++) {
          ts.push(now - (29 - i) * 10000);
          cpu.push(Math.max(5, Math.min(85, Math.round(43 + Math.sin(i / 3) * 18 + (i % 5) * 2))));
          gpu.push(Math.max(0, Math.min(70, Math.round(i >= 20 ? 38 + Math.cos(i) * 12 : 6 + Math.sin(i / 2) * 4))));
        }
        return { ts: ts, cpu: cpu, gpu: gpu };
      })()
    }
  };

  function t(key, vars) { return window.DASH_I18N.t(key, vars); }

  /* ── Command Code account helpers (ported from src/client/lib/cc-view.ts) ── */
  function fmtCredit(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '-';
    var abs = Math.abs(n);
    if (abs >= 100) return n.toFixed(0);
    if (abs >= 1) return n.toFixed(2);
    if (abs >= 0.01) return n.toFixed(4);
    return String(n);
  }
  function fmtCost(n) { return '$' + fmtCredit(n); }
  function winPct(w2) {
    var used = w2 && w2.used, cap = w2 && w2.cap;
    if (typeof used !== 'number' || typeof cap !== 'number' || !isFinite(used) || !isFinite(cap) || cap <= 0) return null;
    return Math.min(100, Math.max(0, (used / cap) * 100));
  }
  function winTone(p, exceeded) {
    if (p === null) return 'muted';
    if (exceeded === true || p >= 95) return 'danger';
    if (p >= 75) return 'warn';
    return 'success';
  }
  function fmtReset(ms) {
    if (typeof ms !== 'number' || !isFinite(ms)) return '';
    var d = new Date(ms);
    return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtIsoDay(iso) {
    if (typeof iso !== 'string' || iso.length < 10) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? m[2] + '-' + m[3] : '';
  }
  function ccFiveHour(c) {
    var w2 = c.credits.windowLimits.fiveHour;
    var p = winPct(w2);
    if (p === null) return null;
    return { key: 'fiveHour', label: t('cc.win5h'), used: w2.used, cap: w2.cap, pct: p, resetAt: w2.resetAt, exceeded: w2.exceeded };
  }
  function ccWeekly(c) {
    var w2 = c.credits.windowLimits.weekly;
    var p = winPct(w2);
    if (p === null) return null;
    return { key: 'weekly', label: t('cc.winWeekly'), used: w2.used, cap: w2.cap, pct: p, resetAt: w2.resetAt, exceeded: w2.exceeded };
  }
  /* Monthly allowance (USD credits) per plan — the published plan table. */
  var CC_ALLOWANCE = { 'individual-goat': 70 };
  function ccMonthly(c) {
    var remaining = c.credits.credits.monthlyCredits;
    var resetIso = c.subscription.data.currentPeriodEnd;
    var plan = c.subscription.data.planId;
    var allowance = CC_ALLOWANCE[plan];
    if (allowance !== undefined && allowance > 0) {
      var used = Math.min(allowance, Math.max(0, allowance - remaining));
      return { key: 'monthly', label: t('cc.winMonthly'), used: used, cap: allowance, pct: (used / allowance) * 100, resetIso: resetIso };
    }
    var used2 = c.usage.totalMonthlyCredits;
    var cap2 = used2 + remaining;
    if (!(cap2 > 0)) return null;
    return { key: 'monthly', label: t('cc.winMonthly'), used: used2, cap: cap2, pct: Math.min(100, Math.max(0, (used2 / cap2) * 100)), resetIso: resetIso };
  }

  /* ── 额度管理 (quota-manage) — ported from src/client/lib/quota-math.ts ── */
  function fmtQuota(n) {
    if (!isFinite(n) || n <= 0) return '0';
    if (n >= 1e9) return (Math.floor(n / 1e8) / 10).toFixed(1) + 'B';
    if (n >= 1e8) return Math.floor(n / 1e6) + 'M';
    if (n >= 1e6) return (Math.floor(n / 1e5) / 10) + 'M';
    if (n >= 1e3) return Math.floor(n / 1e3) + 'K';
    return String(Math.floor(n));
  }
  /** The widget's own example.stats() mock: a live-shaped account + 14-day log. */
  function quotaMock() {
    var now = new Date(), DAY = 86400000, daily = {}, periodTotal = 0, i, d, v;
    for (i = 0; i < 14; i++) {
      d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
      v = i === 13 ? 120000000 : 90000000 + ((i * 137) % 44) * 8000000;
      daily[dayKey(d)] = v;
      if (i >= 9) periodTotal += v;
    }
    var consumed = periodTotal / 89000000;
    return {
      daily: daily,
      remainingCredits: 64.5,
      consumedCredits: consumed,
      periodStart: new Date(now.getTime() - 4 * DAY).toISOString(),
      periodEnd: new Date(now.getTime() + 26 * DAY).toISOString()
    };
  }
  /** planQuota(): recent-pace projection + today's budget (quota-math.ts). */
  function quotaPlan(mock) {
    var now = new Date(), DAY = 86400000, RECENT = 3;
    var start = new Date(mock.periodStart), end = new Date(mock.periodEnd);
    var elapsed = (now.getTime() - start.getTime()) / DAY;
    var total = (end.getTime() - start.getTime()) / DAY;
    var allowance = CC_ALLOWANCE['individual-goat'];
    var usedPct = ((allowance - mock.remainingCredits) / allowance) * 100;
    var daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY));
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dayFraction = Math.max(0.25, Math.min(1, (now.getTime() - midnight.getTime()) / DAY));
    var todayTokens = mock.daily[dayKey(now)] || 0;
    var periodTokens = 0, k;
    for (k in mock.daily) if (new Date(k + 'T12:00:00').getTime() >= start.getTime()) periodTokens += mock.daily[k];
    var rate = periodTokens / mock.consumedCredits;
    var windowStart = new Date(midnight);
    windowStart.setDate(windowStart.getDate() - (RECENT - 1));
    var paceFrom = windowStart.getTime() < start.getTime() ? start : windowStart;
    var paces = Math.max(1, Math.round((midnight.getTime() - new Date(paceFrom.getFullYear(), paceFrom.getMonth(), paceFrom.getDate()).getTime()) / DAY) + 1);
    var whole = 0, i;
    for (i = 1; i < paces; i++) whole += mock.daily[dayKey(new Date(midnight.getTime() - i * DAY))] || 0;
    var pace = (whole + todayTokens / dayFraction) / paces;
    return {
      usedPct: usedPct,
      projectedPct: usedPct + ((pace / rate) * (total - elapsed) / allowance) * 100,
      periodEndIso: end.toISOString(),
      todayTokens: todayTokens,
      todayRecommend: (mock.remainingCredits * rate) / daysLeft
    };
  }

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
              { label: '', value: ur.rolling.percent, ratio: ur.rolling.percent / 100, tone: toneR(ur.rolling.percent) },
              { label: '', value: ur.weekly.percent, ratio: ur.weekly.percent / 100, tone: toneR(ur.weekly.percent) },
              { label: '', value: ur.monthly.percent, ratio: ur.monthly.percent / 100, tone: toneR(ur.monthly.percent) }
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
          /* Text-level escalation (red + blink), never a card-wide glow. */
          valuePulse: peak
        };
      }
      case 'quota-manage': {
        var mock = quotaMock();
        var plan = quotaPlan(mock);
        var over = plan.projectedPct > 100;
        var m2 = Number(plan.periodEndIso.slice(5, 7)), d2 = Number(plan.periodEndIso.slice(8, 10));
        return {
          title: t('widget.quota-manage.name'),
          /* '' puts the big figure in the top-right slot with no extra caption */
          headRight: '',
          value: Math.round(plan.projectedPct) + '%',
          valueTone: over ? 'danger' : undefined,
          valuePulse: over,
          legend: t('card.quota.periodEnd', { m: m2, d: d2 }),
          chart: {
            kind: 'figures',
            figures: [
              { label: t('card.quota.used'), value: fmtQuota(plan.todayTokens) },
              { label: t('card.quota.recommend'), value: fmtQuota(plan.todayRecommend) }
            ]
          }
        };
      }
      case 'cc-whoami': {
        var cu = s.commandCode.whoami.user;
        return {
          title: t('cc.title'),
          value: cu.name || cu.userName || '-',
          legend: t('cc.account'),
          sub: [cu.email, s.commandCode.whoami.org ? '' : ''].filter(Boolean).join(' / ') || undefined
        };
      }
      case 'cc-usage': {
        var u3 = s.commandCode.usage;
        return {
          title: t('cc.title'),
          legend: t('cc.roleUsage'),
          headAfter: { big: fmtTokens(u3.totalTokens), small: t('cc.tokens') },
          sub: [
            u3.totalCount + ' ' + t('cc.requests'),
            u3.successRate.toFixed(0) + '% ' + t('cc.successRate'),
            t('cc.spend') + ' ' + fmtCost(u3.totalCost)
          ].join(' / ')
        };
      }
      case 'cc-credits': {
        var cr = s.commandCode.credits.credits;
        var fh = ccFiveHour(s.commandCode), wk = ccWeekly(s.commandCode);
        var bars = [];
        if (fh) bars.push({ label: t('cc.win5h'), value: Math.round(fh.pct), ratio: fh.pct / 100, tone: winTone(fh.pct, fh.exceeded) });
        if (wk) bars.push({ label: t('cc.winWeekly'), value: Math.round(wk.pct), ratio: wk.pct / 100, tone: winTone(wk.pct, wk.exceeded) });
        return {
          title: t('cc.title'),
          legend: t('cc.roleCredits'),
          headAfter: { big: fmtCredit(cr.monthlyCredits), small: t('cc.credits') },
          chart: bars.length ? { kind: 'bars', bars: bars } : undefined,
          sub: [fh ? t('cc.win5h') + ' ' + fmtReset(fh.resetAt) : '', wk ? t('cc.winWeekly') + ' ' + fmtReset(wk.resetAt) : ''].filter(Boolean).join(' / ') || undefined
        };
      }
      case 'cc-windows': {
        var wins = [ccFiveHour(s.commandCode), ccWeekly(s.commandCode), ccMonthly(s.commandCode)].filter(Boolean);
        return {
          title: t('cc.title'),
          legend: t('cc.roleWindow'),
          chart: {
            kind: 'rings',
            rings: wins.map(function (x) {
              return { label: '', name: x.label, value: Number(x.pct.toFixed(1)), decimals: 1, ratio: x.pct / 100, tone: x.exceeded === true || x.pct >= 95 ? 'danger' : x.pct >= 75 ? 'warn' : 'success' };
            })
          }
        };
      }
      case 'cc-subscription': {
        var sub = s.commandCode.subscription.data;
        return {
          title: t('cc.title'),
          legend: t('cc.rolePlan'),
          headAfter: { big: String(sub.planId), small: sub.status },
          sub: t('cc.periodEnd') + ' ' + fmtIsoDay(sub.currentPeriodEnd)
        };
      }
      case 'cc-window-5h':
      case 'cc-window-weekly':
      case 'cc-window-monthly': {
        var key = w.id === 'cc-window-5h' ? 'fiveHour' : w.id === 'cc-window-weekly' ? 'weekly' : 'monthly';
        var info = key === 'fiveHour' ? ccFiveHour(s.commandCode) : key === 'weekly' ? ccWeekly(s.commandCode) : ccMonthly(s.commandCode);
        var roleKey = key === 'fiveHour' ? 'cc.win5h' : key === 'weekly' ? 'cc.winWeekly' : 'cc.winMonthly';
        if (!info) return { title: t('cc.title'), value: '-', legend: t(roleKey) };
        return {
          title: t('cc.title'),
          legend: t(roleKey),
          value: info.pct.toFixed(1) + '%',
          sub: info.resetIso ? t('cc.periodEnd') + ' ' + fmtIsoDay(info.resetIso) : (fmtReset(info.resetAt) ? t('cc.resets') + ' ' + fmtReset(info.resetAt) : undefined)
        };
      }
      case 'sys-cpu': {
        var cpuU = s.sysinfo.cpu.util;
        return {
          title: t('widget.sys-cpu.name'),
          value: cpuU == null ? '—' : cpuU + '%',
          sub: t('sysinfo.memSub', { used: fmtGb(s.sysinfo.mem.used), total: fmtGb(s.sysinfo.mem.total) })
        };
      }
      case 'sys-gpu': {
        var g = s.sysinfo.gpu;
        return {
          title: t('widget.sys-gpu.name'),
          value: fmtGb(g.memUsed),
          sub: g.util + '% · ' + g.temp + '°C · ' + fmtGb(g.memTotal)
        };
      }
      case 'sys-rings': {
        var toneS = function (p) { return p >= 90 ? 'danger' : p >= 75 ? 'warn' : 'success'; };
        var rings = [{ label: t('sysinfo.cpu'), value: s.sysinfo.cpu.util, ratio: s.sysinfo.cpu.util / 100, tone: toneS(s.sysinfo.cpu.util) }];
        if (s.sysinfo.gpu) rings.push({ label: t('sysinfo.gpu'), value: s.sysinfo.gpu.util, ratio: s.sysinfo.gpu.util / 100, tone: toneS(s.sysinfo.gpu.util) });
        return { title: t('widget.sys-rings.name'), chart: { kind: 'rings', rings: rings } };
      }
      case 'sys-board': {
        var bg = s.sysinfo.gpu;
        var toneB = function (p) { return p >= 90 ? 'danger' : p >= 75 ? 'warn' : 'success'; };
        var boardRings = [
          { label: t('sysinfo.cpu'), value: s.sysinfo.cpu.util, ratio: s.sysinfo.cpu.util / 100, tone: toneB(s.sysinfo.cpu.util) },
          { label: t('sysinfo.mem'), value: s.sysinfo.mem.percent, ratio: s.sysinfo.mem.percent / 100, tone: toneB(s.sysinfo.mem.percent) }
        ];
        if (bg) {
          boardRings.push({ label: t('sysinfo.gpu'), value: bg.util, ratio: bg.util / 100, tone: toneB(bg.util) });
          boardRings.push({ label: t('sysinfo.vram'), value: bg.memPercent, ratio: bg.memPercent / 100, tone: toneB(bg.memPercent) });
        }
        return {
          title: t('widget.sys-board.name'),
          headRight: bg ? bg.temp + '°C · RTX 5070 Ti Laptop GPU' : undefined,
          chart: { kind: 'rings', rings: boardRings }
        };
      }
      case 'sys-gpu-line': {
        var h = s.sysinfo.history || { ts: [], gpu: [] };
        // Sample window default 20 (10..30 dropdown in the real widget) — draw
        // only the most recent points so the line never compresses to a blob.
        var N = 20;
        var lv = h.gpu.slice(-N);
        var lt = h.ts.slice(-N);
        var fmtT = function (ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
        return {
          title: t('widget.sys-gpu-line.name'),
          value: Math.round(s.sysinfo.gpu.util) + '%',
          sub: s.sysinfo.gpu.temp + '°C · ' + fmtGb(s.sysinfo.gpu.memUsed),
          chart: { kind: 'line', line: { values: lv, max: 100, labels: [fmtT(lt[0]), fmtT(lt[lt.length - 1])] } }
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
    if (chart.kind === 'figures' && chart.figures && chart.figures.length) {
      /* A row of label-over-value figure pairs: the FIRST is flush with the
         card's left padding, the LAST with its right padding (space-between),
         so the row shares the head row's gutters. */
      var lastFig = chart.figures.length - 1;
      return '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:' + num(8) + 'px;width:100%">' +
        chart.figures.map(function (f, i) {
          var align = i === 0 ? 'flex-start' : i === lastFig ? 'flex-end' : 'center';
          return '<div style="min-width:0;display:flex;flex-direction:column;align-items:' + align + ';gap:' + num(2) + 'px">' +
            '<div style="font-size:' + num(9) + 'px;color:var(--dsw-label-ter);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">' + f.label + '</div>' +
            '<div style="font-size:' + num(13) + 'px;font-weight:600;color:var(--dsw-label-pri);font-variant-numeric:tabular-nums;line-height:1.2;white-space:nowrap">' + f.value + '</div>' +
            '</div>';
        }).join('') + '</div>';
    }
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
        // Ring → caption: 4px, matching the real cards; value + name share one
        // row when a label exists ("43% CPU"), label-less rings show just %.
        var hasLabel = typeof rg.label === 'string' && rg.label.length > 0;
        var cap = hasLabel
          ? '<div style="display:flex;align-items:baseline;gap:3px;white-space:nowrap;margin-top:' + Math.round(4 * scale) + 'px">' +
            '<span style="font-size:' + num(11) + 'px;font-weight:600;color:var(--dsw-title);font-variant-numeric:tabular-nums;line-height:1">' + Math.round(rg.value) + '%</span>' +
            '<span style="font-size:' + num(9) + 'px;color:var(--dsw-label-ter);line-height:1">' + rg.label + '</span></div>'
          : '<div style="font-size:' + num(11) + 'px;font-weight:600;color:var(--dsw-title);font-variant-numeric:tabular-nums;line-height:1;margin-top:' + Math.round(4 * scale) + 'px">' + Math.round(rg.value) + '%</div>';
        return '<div class="wg-ring" title="' + rg.label + ' ' + Math.round(rg.value) + '%">' +
          '<svg width="' + Math.round(r * 2) + '" height="' + Math.round(r * 2) + '" viewBox="0 0 ' + Math.round(r * 2) + ' ' + Math.round(r * 2) + '" aria-hidden="true">' +
          '<circle class="wg-ring-track" cx="' + r + '" cy="' + r + '" r="' + (r - sw / 2) + '" stroke-width="' + sw + '"></circle>' +
          '<circle cx="' + r + '" cy="' + r + '" r="' + (r - sw / 2) + '" fill="none" stroke="' + tone + '" stroke-width="' + sw +
          '" stroke-linecap="round" stroke-dasharray="' + (c * p).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + r + ' ' + r + ')"></circle></svg>' +
          cap + '</div>';
      }).join('');
      return '<div class="wg-rings" style="gap:' + mg + 'px">' + rings + '</div>';
    }
    if (chart.kind === 'line' && chart.line) {
      // Windows-task-manager style utilization sparkline — port of the real
      // ChartBlock line branch: filled area + polyline, barsV footprint,
      // 3px chart↔time-label gap.
      var cellL = Math.round((6 + 2) * scale);
      var barAreaH = 7 * cellL + 6 * 2;
      var labelH = Math.round(10 * scale);
      var lmax = Math.max(1, chart.line.max || 100);
      var lvals = chart.line.values || [];
      var LW = Math.max(1, lvals.length - 1);
      var Xl = function (i) { return LW === 0 ? 0 : (i / LW) * 100; };
      var Yl = function (v) { return 100 - (Math.max(0, Math.min(lmax, v)) / lmax) * 100; };
      var segs = [], cur = [];
      lvals.forEach(function (v, i) {
        if (v === null || v === undefined || !isFinite(v)) { if (cur.length > 1) { segs.push(cur); cur = []; } return; }
        cur.push([Xl(i), Yl(v)]);
      });
      if (cur.length > 1) segs.push(cur);
      var lineTone = 'var(--dsw-title)';
      var lineFill = 'color-mix(in srgb, var(--dsw-title) 18%, transparent)';
      var parts = segs.map(function (seg) {
        var d = seg.map(function (xy, pi) { return (pi === 0 ? 'M' : 'L') + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2); }).join('');
        var pts = seg.map(function (xy) { return xy[0].toFixed(2) + ',' + xy[1].toFixed(2); }).join(' ');
        return '<path d="' + d + ' L' + seg[seg.length - 1][0].toFixed(2) + ' 100 L' + seg[0][0].toFixed(2) + ' 100 Z" fill="' + lineFill + '" stroke="none"></path>' +
          '<polyline points="' + pts + '" fill="none" stroke="' + lineTone + '" stroke-width="' + Math.max(1, Math.round(1.6 * scale)) + '" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline>';
      }).join('');
      var lineLabels = chart.line.labels || ['', ''];
      return '<div style="display:flex;flex-direction:column;gap:3px;margin-top:' + Math.round(4 * scale) + 'px">' +
        '<div style="height:' + barAreaH + 'px;overflow:hidden"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + parts + '</svg></div>' +
        '<div style="display:flex;justify-content:space-between;min-height:' + labelH + 'px;font-size:' + num(9) + 'px;color:var(--dsw-label-ter);line-height:1">' +
        '<span>' + lineLabels[0] + '</span><span>' + lineLabels[1] + '</span></div></div>';
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

    /* header — two INDEPENDENT top-aligned slots (mirrors components.tsx): the
       title box on the left, and when headRight is DEFINED (even as '') the
       value + caption hard against the right edge. The right slot cancels its
       own extra line height with a negative bottom margin so the row stays as
       tall as the title and the legend hugs the title. */
    var hasHeadRight = out.headRight !== undefined;
    var titleLine = Math.round(titlePx * 1.2);
    var captionLine = Math.round(10 * scale * 1.2);
    var valueLine = Math.round(valuePx * 1.25);
    var rightLine = hasHeadRight ? Math.max(out.value != null ? valueLine : 0, out.headRight ? captionLine : 0) : 0;
    var spill = Math.max(0, rightLine - titleLine);
    var titleRow =
      '<div class="wg-title-row" style="font-size:' + titlePx + 'px;align-items:flex-start;min-height:' + titleLine + 'px">' +
      '<span class="wg-title-text" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + out.title + '</span>' +
      (hasHeadRight
        ? '<span class="wg-title-right" style="display:inline-flex;align-items:baseline;gap:6px;flex:none' + (spill > 0 ? ';margin-bottom:-' + spill + 'px' : '') + '">' +
          (out.value != null
            ? '<span class="wg-value' + (out.valueTone === 'danger' ? ' danger' : '') + (out.valuePulse ? ' pulse' : '') + '" style="font-size:' + valuePx + 'px">' + out.value + '</span>'
            : '') +
          (out.headRight
            ? '<span style="font-size:' + num(10) + 'px;color:var(--dsw-label-ter);font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">' + out.headRight + '</span>'
            : '') +
          '</span>'
        : '') +
      '</div>';
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
    if (out.value != null && out.headRight === undefined) {
      body += '<div class="wg-value' + (out.valueTone === 'danger' ? ' danger' : '') + (out.valuePulse ? ' pulse' : '') + '" style="font-size:' + valuePx + 'px">' + out.value + '</div>';
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
      '<div class="wg-card" style="width:' + boxW + 'px;min-height:' + unit + 'px;border-radius:' + radius + 'px;padding:' + pad + 'px"' +
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