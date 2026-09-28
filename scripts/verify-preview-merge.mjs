#!/usr/bin/env node
/**
 * Preview data policy check — 有真数据喂真数据，缺的用假数据填.
 *
 * The preview surfaces are how a card is reviewed WITHOUT installing it on a rail
 * in use (the owner's rule, 2026-09-28), so the merge that feeds them is
 * load-bearing and cannot be eyeballed:
 *
 *   1. `PREVIEW_STATS`      — filler, so no card is ever blank;
 *   2. the widget's own `example.stats` — its own filler / state mock;
 *   3. LIVE, but only its non-null slices — a payload that has not answered must
 *      not erase the filler above;
 *   4. the instance's saved config — last, exactly like the rail's fold.
 *
 * Asserts all four, plus that the live fold carries the payload slices, the pooled
 * view modes, and the instance config the way the rail's render expects. Offline:
 * compiles the preview closure (see tsconfig.preview.json) and runs with node.
 *
 * Usage: node scripts/verify-preview-merge.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The compiled closure is CommonJS while this file is ESM. */
const require = createRequire(import.meta.url)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
const OUT = join(ROOT, '.tmp-preview')

function die(msg) { console.error(`[verify-preview-merge] ${msg}`); process.exit(1) }

// 0) Clean first: `tsc` leaves stale files, and a deleted module's ghost output
//    would let a broken import resolve (the same trap G4 documents).
rmSync(OUT, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [TSC, '-p', join(ROOT, 'scripts', 'tsconfig.preview.json')], { cwd: ROOT, encoding: 'utf8' })
const emitted = join(OUT, 'src', 'client', 'render', 'preview', 'example-out.js')
if (!existsSync(emitted)) {
  console.error(`${compile.stdout ?? ''}${compile.stderr ?? ''}`)
  die('the preview closure did not compile')
}
writeFileSync(join(OUT, 'package.json'), '{"type":"commonjs"}\n', 'utf8')

// Deterministic locale: `t()` reads localStorage when the official service is
// absent (see i18n.ts detectLocale).
globalThis.localStorage = {
  getItem: (k) => (k === 'dsh-language' ? 'zh' : null),
  setItem: () => {},
  removeItem: () => {},
}

const { WIDGETS, WIDGET_LOCALES } = require(join(OUT, 'src', 'client', 'generated.registry.js'))
const { setExtraLocales } = require(join(OUT, 'src', 'client', 'i18n.js'))
const { PREVIEW_STATS } = require(join(OUT, 'src', 'client', 'render', 'preview', 'preview-stats.js'))
const { buildPreviewStats, exampleOut } = require(join(OUT, 'src', 'client', 'render', 'preview', 'example-out.js'))
const { buildLiveStats } = require(join(OUT, 'src', 'client', 'runtime', 'live-stats.js'))
setExtraLocales(WIDGET_LOCALES)

const checks = []
function check(name, fn) {
  try {
    const detail = fn()
    checks.push({ ok: true, name, detail: detail ?? '' })
  } catch (error) {
    checks.push({ ok: false, name, detail: error instanceof Error ? error.message : String(error) })
  }
}
function eq(actual, expected, what) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`)
}
const widget = (id) => {
  const w = WIDGETS.find((x) => x.id === id)
  if (!w) throw new Error(`no widget ${id}`)
  return w
}
const cacheW = widget('cache')
const boardW = widget('harness-board')
const PREFS = { cardConfigs: {} }

/** A minimal bridge snapshot: the live fold reads exactly these fields. */
function snapshot(over) {
  return {
    open: true,
    hasSession: true,
    stats: {
      turns: 3, steps: 5, llmMs: 1, toolMs: 2, ttftMs: 3, ttftSteps: 1, decodeMs: 4, decodeTokens: 5,
      usage: { inputTokens: 1_000_000, cacheReadTokens: 900_000, outputTokens: 10_000 },
      heatmapRaw: { '2026-09-28': 1234 },
      heatmapGrid: [[{ value: 1234, date: '2026-09-28' }]],
      ...(over.stats ?? {}),
    },
    usageData: null,
    usageMulti: null,
    commandCode: null,
    commandCodeError: null,
    usageDaily: null,
    commandCodeDaily: null,
    sysinfo: null,
    github: null,
    githubError: null,
    prefs: PREFS,
    railBudget: -1,
    ...over,
  }
}

// 1) No live record: the preview is exactly the filler + the widget's example.
check('没有实时数据时，预览 = 假数据填充', () => {
  const a = buildPreviewStats(cacheW, PREFS, 'cache@2x2', null)
  eq(a.usage, PREVIEW_STATS.usage, 'usage')
  eq(a.commandCode, PREVIEW_STATS.commandCode, 'commandCode')
  const out = exampleOut(cacheW, '2x2', PREFS, undefined, null)
  eq(out.chart.kind, 'breakdown', 'chart kind')
  return `${out.chart.breakdown.length} 行，figure=${out.value}`
})

// 2) A live session: the real numbers win, for the card the user reviews.
check('有实时数据时，真数据覆盖假数据（命中率大字 + 灰字总量 + 环 + 三行）', () => {
  const live = buildLiveStats(snapshot({}), PREFS, 'cache@2x2')
  const out = cacheW.render(buildPreviewStats(cacheW, PREFS, 'cache@2x2', live), { size: '2x2' })
  const rows = out.chart.breakdown
  eq(rows.map((r) => r.value), ['100K', '900K', '10K'], 'rows')
  // The head's ladder has ONE source per rung: the figure is `headAfter.big` (the
  // same field a head without a ring uses) and `value` stays unset, so the number
  // can never be rendered twice.
  eq(out.headAfter.big, '90%', 'the figure on the tile is the hit rate')
  eq(out.value, undefined, 'value must stay unset on a ring head')
  eq(out.legend, '1M tok', 'legend')
  eq(out.headRight, undefined, 'headRight must be gone (the ring owns the right slot)')
  eq(out.headRing.icon, 'database', 'ring glyph')
  eq(out.headRing.label, '90.0%', 'ring hover text (precise)')
  eq(out.headRing.ratio, 0.9, 'ring ratio')
  eq(out.bodyAnchor, 'bottom', 'the rows and their divider sit on the card floor')
  return rows.map((r) => `${r.label} ${r.value}`).join(' · ') + ` | ${out.headAfter.big} / ${out.legend} / ${out.headRing.icon}`
})

// 2b) The ring's direction: for a cache hit rate HIGH is good (green) and low is
//     bad (red) — the OPPOSITE of the system rings, where high means a busy
//     machine. The tone is the widget's call, so it must be asserted here.
check('环形语气方向：越高越绿、越低越红（与系统监控环相反）', () => {
  const at = (cacheRead) => {
    const live = buildLiveStats(snapshot({ stats: { usage: { inputTokens: 1_000_000, cacheReadTokens: cacheRead, outputTokens: 0 } } }), PREFS, 'cache@2x2')
    return cacheW.render(buildPreviewStats(cacheW, PREFS, 'cache@2x2', live), { size: '2x2' })
  }
  const hi = at(990_000)
  const mid = at(600_000)
  const low = at(200_000)
  eq([hi.headRing.tone, mid.headRing.tone, low.headRing.tone], ['success', 'warn', 'danger'], 'tones')
  eq([hi.headAfter.big, mid.headAfter.big, low.headAfter.big], ['99%', '60%', '20%'], 'tile figures')
  return `99%→${hi.headRing.tone} · 60%→${mid.headRing.tone} · 20%→${low.headRing.tone}`
})

// 3) A LIVE key that is null must NOT erase the filler (a payload that has not
//    answered yet is not the same thing as "this card has no data").
check('实时切片为 null 时不擦除假数据', () => {
  const live = buildLiveStats(snapshot({ stats: { usage: null } }), PREFS, 'cache@2x2')
  eq(live.usage, null, 'live usage is null')
  const merged = buildPreviewStats(cacheW, PREFS, 'cache@2x2', live)
  eq(merged.usage, PREVIEW_STATS.usage, 'merged usage stays the filler')
  return 'usage 回退到填充数据'
})

// 4) A live payload that DID answer must override the widget's own mock (this is
//    the GitHub / Command Code / hardware case: mock until the source answers).
check('实时载荷到位时覆盖该 widget 自己的示例数据', () => {
  const realCC = { whoami: { success: true, user: { name: 'LIVE' } }, usage: null, credits: null, subscription: null }
  const live = buildLiveStats(snapshot({ commandCode: realCC }), PREFS, 'cache@2x2')
  const merged = buildPreviewStats(cacheW, PREFS, 'cache@2x2', live)
  eq(merged.commandCode, realCC, 'commandCode')
  if (merged.commandCode === PREVIEW_STATS.commandCode) throw new Error('mock still won over live')
  return 'commandCode 用实时载荷'
})

// 5) The instance's own config is applied LAST — asserted through a real
//    config-driven card (会话概览's metric picker) rather than a synthetic key.
check('实例配置最后生效（会话概览的指标选择）', () => {
  const prefs = { cardConfigs: { 'harness-board@2x4': { metrics: ['turns', 'steps'] } } }
  const merged = buildPreviewStats(boardW, prefs, 'harness-board@2x4', null)
  eq(merged.metrics, ['turns', 'steps'], 'metrics from config')
  // One row renders as `figures`, two rows as `figureRows` — count both.
  const pairsOf = (out) => (out.chart.figureRows ?? []).reduce((n, row) => n + row.length, 0) + (out.chart.figures ?? []).length
  const out = boardW.render(merged, { size: '2x4' })
  const pairs = pairsOf(out)
  const dflt = boardW.render(buildPreviewStats(boardW, PREFS, 'harness-board@2x4', null), { size: '2x4' })
  const dfltPairs = pairsOf(dflt)
  eq(pairs, 2, 'chosen metrics rendered')
  if (!(dfltPairs > pairs)) throw new Error(`default metrics (${dfltPairs}) should be more than the chosen 2`)
  return `选中 2 项渲染 2 个，默认渲染 ${dfltPairs} 个`
})

// 6) The live fold carries the payload slices, the pooled view modes and the
//    instance config the way the rail's render expects (the rail calls this same
//    function, so the preview and the card cannot drift).
check('实时 fold 与轨道同源（载荷 + 池视图 + 实例配置）', () => {
  const prefs = { cardConfigs: { 'cache@2x2': { marker: 7 } } }
  const live = buildLiveStats(snapshot({
    usageMulti: { total: null, keys: [{ ref: 'a', label: 'A', data: null }, { ref: 'b', label: '', data: null }] },
  }), prefs, 'cache@2x2', 'contextCompact')
  eq(live.poolModes, ['total', 'A', 'Key 2'], 'poolModes')
  eq(live.armedAction, 'contextCompact', 'armedAction')
  eq(live.marker, 7, 'instance config')
  eq(live.heatmapRaw, { '2026-09-28': 1234 }, 'live heatmap kept (no fallback override)')
  return 'poolModes / armedAction / 实例配置 / heatmap 全部就位'
})

// 7) The tool-call fold: names come from `tool-result.call.name`, failures from
//    `isError`, duration from `time − callTime`, and the in-flight call from
//    `runningCalls`. The tool CARD is only as good as this parse.
check('工具 fold：名称 / 失败 / 时长 / 正在跑 / 窗口截断', () => {
  const { deriveTools } = require(join(OUT, 'src', 'client', 'data', 'session-stats.js'))
  const settled = [
    // Two settled calls: Bash 4.2s ok, edit 1.0s FAILED.
    { kind: 'tool-result', time: 10_000, callTime: 5_800, isError: false, call: { name: 'Bash', argsRaw: '{}' } },
    { kind: 'tool-result', time: 12_000, callTime: 11_000, isError: true, call: { name: 'edit', argsRaw: '{}' } },
    // A truncated head: counted as a call, neither named nor timed.
    { kind: 'tool-result', time: 13_000, callTime: null, isError: false, call: null },
    { kind: 'assistant', turn: 1, step: 1, time: 1, timing: { stepStartTime: 1, completedTime: 2 } },
  ]
  const running = [
    { name: 'grep', time: 19_000, callId: 'a' },
    { name: 'read', time: 19_900, callId: 'b' },
  ]
  const sum = deriveTools(settled, running, 20_000)
  eq(sum.calls, 3, 'calls')
  eq(sum.tools, 2, 'distinct names (the truncated head adds none)')
  eq(sum.failures, 1, 'failures')
  eq(sum.slowest, { name: 'Bash', ms: 4200 }, 'slowest')
  eq(sum.running, { name: 'grep', ms: 1000, count: 2 }, 'longest running call')
  const idle = deriveTools(settled, [], 20_000)
  eq(idle.running, null, 'no running calls')
  return `3 次（2 个已知名）· 1 失败 · 最慢 Bash 4.2s · 正在跑 grep 1.0s（2 个在跑）`
})

// 6b) The tool card must NOT wear a ring: a ring is the language for a SHARE (the
//     cache card's job), while this card's headline is a DURATION — and the ring
//     ate the width the figure needed. It also must not set `value`, which would
//     be rendered a second time in the body (see CardBody).
check('工具卡：时长不用环形图，走 headAfter 堆叠 + 默认三行（短→长）', () => {
  const toolW = widget('tool')
  const out = toolW.render(buildPreviewStats(toolW, PREFS, 'tool@2x2', null), { size: '2x2' })
  eq(out.headRing, undefined, 'no ring')
  eq(out.headAfter.big, '1m15s', 'the duration is the headline')
  eq(out.value, undefined, 'value must stay unset (it would duplicate into the body)')
  eq(out.legend, '23 次 · 5 个工具', 'legend')
  eq(out.chart.breakdown.map((r) => r.label), ['失败', '平均每次', '工具耗时占比'], 'default rows')
  eq(out.chart.breakdown.map((r) => r.value), ['1', '3.2s', '26%'], 'row values')
  eq(out.chart.breakdown[0].tone, 'danger', 'a non-zero failure count is red')
  return `${out.headAfter.big} / ${out.legend} / ${out.chart.breakdown.map((r) => r.label).join(' · ')}`
})

// 6c) The rows are PICKED: the field's stored order IS the card's top-to-bottom
//     order, unknown keys are dropped, and an empty pick falls back to the default
//     three (the picker's own rule, mirrored by the render).
check('工具卡：明细行可在配置里更换（顺序 = 卡片顺序，空选回默认）', () => {
  const toolW = widget('tool')
  const withMetrics = (metrics) => {
    const prefs = { cardConfigs: { 'tool@2x2': { metrics } } }
    return toolW.render(buildPreviewStats(toolW, prefs, 'tool@2x2', null), { size: '2x2' }).chart.breakdown
  }
  eq(withMetrics(['running', 'slowest']).map((r) => r.label), ['正在执行 grep ×2', '最慢 Bash'], 'reordered + running count')
  eq(withMetrics(['slowest', 'running']).map((r) => r.label), ['最慢 Bash', '正在执行 grep ×2'], 'the pick order rules')
  eq(withMetrics(['nope', 'share']).map((r) => r.label), ['工具耗时占比'], 'unknown key dropped')
  eq(withMetrics([]).map((r) => r.label), ['失败', '平均每次', '工具耗时占比'], 'empty pick falls back')
  return '顺序 / 丢未知键 / 空选回默认 都对'
})

// 6d) A picked metric NEVER disappears: with nothing to report it prints `—` in
//     the muted tone (the owner's rule — 没有正在执行的工具就显示 -). A vanishing row
//     silently changed the card's line count.
check('空态显示 — ：挑了几行就永远有几行', () => {
  const toolW = widget('tool')
  const prefs = { cardConfigs: { 'tool@2x2': { metrics: ['running', 'mean', 'slowest'] } } }
  // An idle fold: a call was never in flight and every call head was truncated.
  const liveIdle = buildLiveStats(snapshot({
    stats: { toolMs: 5_000, llmMs: 5_000, tools: { calls: 4, tools: 2, failures: 0, slowest: null, running: null } },
  }), prefs, 'tool@2x2')
  const out = toolW.render(buildPreviewStats(toolW, prefs, 'tool@2x2', liveIdle), { size: '2x2' })
  eq(out.chart.breakdown.map((r) => r.label), ['正在执行', '平均每次', '最慢'], 'the picked rows all stay')
  eq(out.chart.breakdown.map((r) => r.value), ['—', '1.3s', '—'], 'missing readings show an em dash')
  eq(out.chart.breakdown.map((r) => r.tone), ['muted', undefined, 'muted'], 'placeholders are muted, not red')
  eq(out.headAfter.big, '5s', 'live figures still win')
  return '3 行全在：— / 1.3s / —'
})

// 6e) 会话 Token: the total is the figure and the input/output SPLIT is the bar,
//     which sits on the card floor. The tone palette must be the semantic one —
//     the default segment palette is the context card's ContextMeter trio, which
//     would mean nothing here.
check('会话 Token：总量为大字，输入/输出构成条用语义色并贴底', () => {
  const tokensW = widget('tokens')
  const live = buildLiveStats(snapshot({ stats: { usage: { inputTokens: 1_000_000, cacheReadTokens: 900_000, outputTokens: 10_000 } } }), PREFS, 'tokens@2x2')
  const out = tokensW.render(buildPreviewStats(tokensW, PREFS, 'tokens@2x2', live), { size: '2x2' })
  eq(out.headAfter.big, '1M', 'total as the figure')
  eq(out.chart.kind, 'segments', 'composition bar')
  eq(out.chart.segmentsPalette, 'tones', 'semantic palette')
  eq(out.chart.totalTokens, 1_010_000, 'bar total includes output')
  eq(out.chart.segments.map((s) => [s.label, s.tokens, s.tone]), [['输入', 1_000_000, 'muted'], ['输出', 10_000, 'primary']], 'segments')
  eq(out.bodyAnchor, 'bottom', 'the composition block sits on the card floor')
  return `${out.headAfter.big} · ${out.chart.segments.map((s) => `${s.label} ${s.tokens}`).join(' / ')}`
})

// 7) The compaction fold: markers carry how many surface items they replaced and
//    what that history was worth. A null figure means the summary event fell
//    outside the loaded window — the event is still COUNTED, its reading is `—`.
check('压缩 fold：计数 / 回收量 / 折叠项数 / 窗口外标记', () => {
  const { deriveCompaction } = require(join(OUT, 'src', 'client', 'data', 'session-stats.js'))
  const settled = [
    { kind: 'compaction', time: 1_000, shadowedItemCount: 24, shadowedTokenCount: 180_000 },
    { kind: 'assistant', turn: 1, step: 1, time: 500 },
    { kind: 'compaction', time: 2_000, shadowedItemCount: 23, shadowedTokenCount: 160_000 },
    // Summary event outside the window: counted, nothing measurable.
    { kind: 'compaction', time: 3_000, shadowedItemCount: null, shadowedTokenCount: null },
  ]
  const sum = deriveCompaction(settled)
  eq(sum.count, 3, 'count')
  eq(sum.reclaimed, 340_000, 'reclaimed tokens')
  eq(sum.items, 47, 'folded items')
  eq(sum.recent.map((e) => e.at), [3_000, 2_000, 1_000], 'newest first')
  eq(sum.recent[0].reclaimed, null, 'the unmeasurable event stays null')
  eq(deriveCompaction([]).count, 0, 'no markers')
  return `3 次（其中 1 次窗口外）· 回收 340K · 折叠 47 项`
})

// 7b) 上下文压缩 is the MERGED card (meter + button + fold info): it must always
//     render — it owns an action — with the fold rows reading `—` until this
//     session has actually folded something, and the button in the TOP-RIGHT.
check('上下文压缩卡：右上角按钮 + 三行信息（未压缩时显示 —，卡不消失）', () => {
  const w = widget('context')
  // Live fold present: real numbers win over the widget's example.
  const live = buildLiveStats(snapshot({
    stats: { contextPercent: 0.64, compactions: { count: 2, reclaimed: 340_000, items: 47, recent: [{ at: Date.now() - 240_000, reclaimed: 180_000, items: 24 }] } },
  }), PREFS, 'context@2x2')
  const out = w.render(buildPreviewStats(w, PREFS, 'context@2x2', live), { size: '2x2' })
  eq(out.headAfter.big, '64%', 'the meter sits under the title')
  eq(out.value, undefined, 'value stays unset (it would duplicate into the body)')
  eq(out.bodyAnchor, 'bottom', 'the fold rows stay on the card floor')
  eq(out.corner.pos, 'top', 'the compact button lives top-right')
  eq(out.corner.id, 'contextCompact', 'same action id the rail arms')
  eq(out.legend, '最近 4m 前', 'recency in the grey caption')
  eq(out.chart.breakdown.map((r) => [r.label, r.value]), [['压缩次数', '2'], ['累计回收', '340K'], ['折叠项数', '47']], 'fold rows')
  // Nothing folded yet. The previews FILL the widget's own example (so the layout
  // is reviewable), while the rail renders the raw record: 0 folds and muted
  // dashes for the two figures that have no reading — and the button stays.
  const liveEmpty = buildLiveStats(snapshot({ stats: { contextPercent: 0.12, compactions: null } }), PREFS, 'context@2x2')
  eq(w.render(buildPreviewStats(w, PREFS, 'context@2x2', liveEmpty), { size: '2x2' }).chart.breakdown.map((r) => r.value), ['2', '340K', '47'], 'preview fills from the example')
  const rail = w.render(liveEmpty, { size: '2x2' })
  eq(rail.chart.breakdown.map((r) => [r.value, r.tone]), [['0', undefined], ['—', 'muted'], ['—', 'muted']], 'rail shows the dashes')
  eq(rail.legend, undefined, 'no recency line without a fold')
  eq(rail.corner.pos, 'top', 'the button never disappears')
  return `${out.headAfter.big} · ${out.chart.breakdown.map((r) => `${r.label} ${r.value}`).join(' / ')}`
})

// 2c) The ring's round caps: below 100% the arc must leave DAYLIGHT between its two
//     caps — a 99% ring whose caps meet reads as a closed circle, which is a lie the
//     number beside it has to correct — and only 100% closes the ring.
check('环形圆头：<100% 保留可见缺口，100% 才闭环', () => {
  const { cappedArcInk } = require(join(OUT, 'src', 'client', 'lib', 'arc.js'))
  const c = 145 // ≈ the head ring's circumference at the 150px side
  const stroke = 5
  const gap = 2
  eq(cappedArcInk(1, c, stroke, gap), c, '100% closes the ring')
  eq(cappedArcInk(1.2, c, stroke, gap), c, 'above 100% stays closed')
  eq(cappedArcInk(0, c, stroke, gap), 0, '0% paints nothing')
  const ink = cappedArcInk(0.99, c, stroke, gap)
  const daylight = c - ink - stroke
  if (!(daylight >= gap - 0.001)) throw new Error(`daylight ${daylight.toFixed(2)}px < ${gap}px`)
  const half = cappedArcInk(0.5, c, stroke, gap)
  if (!(half < ink && ink < c)) throw new Error('the arc must grow with the ratio')
  return `99% → 缺口 ${daylight.toFixed(1)}px（环周长 ${c}px）`
})

let failed = 0
for (const c of checks) {
  if (!c.ok) failed += 1
  console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
}
if (failed > 0) die(`${failed} check(s) failed`)
console.log(`[verify-preview-merge] PASS — ${checks.length} checks`)
