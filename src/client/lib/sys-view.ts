/**
 * dsh-widgets — Machine/system (SysInfo) shared render layer (widget-family
 * shared). The five system widgets (sys-cpu / sys-gpu / sys-rings / sys-board
 * / sys-gpu-line) share the snapshot resolution, the refresh-interval config
 * schema, the big-figure cycle and the formatting helpers. They live here —
 * NOT copied into each unit — so the family stays consistent and a new system
 * widget imports the same machinery.
 *
 * All strings come from the per-widget dictionaries (merged by the registry
 * generator from each unit's manifest; family-shared keys live in
 * `src/widgets/_shared/locales.json`), so these factories never hard-code text.
 */

import { t } from '../i18n'
import type { ConfigField, SysInfo, WidgetRenderOut, WidgetStats } from './contract'

/** The five system (hardware) widget ids — the client collector uses this list
 *  to find which installed instances drive the `/api/sysinfo` polling cadence. */
export const SYS_WIDGET_IDS = ['sys-cpu', 'sys-gpu', 'sys-rings', 'sys-board', 'sys-gpu-line']

/** Read the machine snapshot from the stats passed to a widget render. */
export function sysInfo(stats: WidgetStats): SysInfo | null {
  const s = stats.sysinfo
  return s !== null && typeof s === 'object' && typeof (s as { cpu?: unknown }).cpu === 'object' ? (s as SysInfo) : null
}

/** Client-side sampling history fallback. The host streams a `history` ring
 *  buffer since v1.5.0 round 3 — but a host that predates that field (not yet
 *  restarted) never provides it, and sys-gpu-line would wait forever. The
 *  collector ingests every successful poll here (capped, newest last), so the
 *  sparkline works on ANY host; once the host restarts its (longer) history
 *  takes precedence and the client buffer is ignored. */
const CLIENT_HIST_CAP = 120
let clientHist: { ts: number[]; gpu: Array<number | null> } = { ts: [], gpu: [] }

/** Max null run the sparkline carries ACROSS instead of breaking at (see below). */
const CHART_GAP_MAX = 4

/**
 * Utilization samples ready to plot.
 *
 * A `null` in the host history means "the driver did not answer this poll" (the
 * host's nvidia-smi query has a 3s timeout), NOT "0 %". The chart's x axis is
 * sample ORDER, so a hole used to be drawn as a break: measured on the live
 * 利用率 card 2026-09-20 — `history.gpu` held 26 nulls against 0 in
 * `history.cpu`, and the card rendered TWO polylines (15 + 3 points), which is
 * exactly the dashed, "cut off" sparkline the user reported while their GPU sat
 * completely idle at 0 %.
 *
 * So a short miss carries the last known value forward (the poll window IS the
 * averaging window, and the previous reading is the best estimate for a
 * utilization graph — Windows' own graph does the same). A LONG run (more than
 * CHART_GAP_MAX samples, i.e. a device that really went away) still breaks the
 * line, and the card's own no-GPU state reports that case in words. Leading
 * nulls (before the first reading) are dropped rather than fabricated.
 */
export function plotSamples(vals: Array<number | null | undefined>): Array<number | null> {
  const out: Array<number | null> = []
  let last: number | null = null
  let gap = 0
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out.push(v)
      last = v
      gap = 0
      continue
    }
    if (last === null) continue // nothing to carry yet
    gap += 1
    out.push(gap <= CHART_GAP_MAX ? last : null)
  }
  return out
}

/** Feed one successful snapshot into the client-side fallback history. */
export function ingestSysInfo(s: SysInfo): void {
  if (s === null || typeof s !== 'object') return
  clientHist.ts.push(s.ts)
  clientHist.gpu.push(s.gpu !== null && s.gpu !== undefined ? s.gpu.util : null)
  if (clientHist.ts.length > CLIENT_HIST_CAP) {
    const drop = clientHist.ts.length - CLIENT_HIST_CAP
    clientHist.ts.splice(0, drop)
    clientHist.gpu.splice(0, drop)
  }
}

/** Resolve the sparkline history: host history when present (longer, survives
 *  reloads), else the client-side accumulated fallback (works pre-restart). */
function historyOf(s: SysInfo): { ts: number[]; gpu: Array<number | null> } | null {
  const h = s.history
  if (h && Array.isArray(h.ts) && Array.isArray(h.gpu) && h.ts.length > 0 && h.ts.length === h.gpu.length) {
    return { ts: h.ts, gpu: h.gpu }
  }
  return clientHist.ts.length > 0 ? { ts: clientHist.ts.slice(), gpu: clientHist.gpu.slice() } : null
}

/** Per-widget refresh-interval schema: 5/10/30/60 s presets + a custom numeric
 *  field (used when the preset is `custom`). The collector applies the SHORTEST
 *  effective interval among installed sys-* instances (clamped 5..60 s). */
export function intervalSchema(): ConfigField[] {
  return [
    {
      key: 'interval',
      label: () => t('sysinfo.interval'),
      type: 'mode',
      default: '10',
      options: [
        ['5', '5s'],
        ['10', '10s'],
        ['30', '30s'],
        ['60', '60s'],
        ['custom', () => t('sysinfo.intervalCustom')],
      ],
    },
    { key: 'intervalCustom', label: () => t('sysinfo.intervalCustomValue'), type: 'text', default: '10' },
  ]
}

/** Max samples shown by the sparkline (10–30, default 20): the host buffer can
 *  hold 120 points — drawing all of them into a 2×2 card would squash the line
 *  into an unreadable blob. The dropdown keeps the window explicit. */
export const SPARK_POINTS_OPTS: Array<[string, string]> = ['10', '15', '20', '25', '30'].map((n) => [n, `${n}`])

/** Effective sparkline sample window from a per-instance config (10..30). */
export function resolveSparkPoints(config: Record<string, unknown> | undefined): number {
  const n = Number(config?.points)
  if (!Number.isFinite(n) || !(n > 0)) return 20
  return Math.max(10, Math.min(30, Math.round(n)))
}

/** Effective refresh seconds from a per-instance config: preset value or the
 *  custom numeric; clamped to 5..60, falling back to 10 on anything invalid. */
export function resolveInterval(config: Record<string, unknown> | undefined): number {
  const mode = typeof config?.interval === 'string' ? config.interval : '10'
  let secs = mode === 'custom' ? Number(config?.intervalCustom) : Number(mode)
  if (!Number.isFinite(secs) || !(secs > 0)) return 10
  return Math.max(5, Math.min(60, Math.round(secs)))
}

/** Big-figure selectors. GPU: VRAM / temperature / utilization; CPU: the
 *  utilization / used memory. The selection drives BOTH the whole-card click
 *  cycle (store: 'bigMetric') and the config dropdown (same key). */
const GPU_METRIC_OPTS: Array<[string, string | (() => string)]> = [
  ['vram', () => t('sysinfo.bigVram')],
  ['temp', () => t('sysinfo.bigTemp')],
  ['util', () => t('sysinfo.bigUtil')],
]
const CPU_METRIC_OPTS: Array<[string, string | (() => string)]> = [
  ['util', () => t('sysinfo.bigUtil')],
  ['mem', () => t('sysinfo.bigMem')],
]

/** Config dropdown for the big-figure mode (per-widget option lists). */
export function bigMetricSchema(opts: Array<[string, string | (() => string)]>): ConfigField {
  return { key: 'bigMetric', label: () => t('sysinfo.bigMetric'), type: 'mode', options: opts, default: opts[0][0] }
}

/** Cycle hint: "VRAM (GB) → Temp (°C) → Utilization (%) → …" closing the loop. */
function bigHint(opts: Array<[string, string | (() => string)]>): string {
  const labels = opts.map(([_v, l]) => (typeof l === 'function' ? l() : l))
  return t('sysinfo.bigHint', { chain: labels.concat(labels[0]).join(' → ') })
}

/** GPU big-figure options for the widget descriptors. */
export function gpuMetricOptions(): Array<[string, string | (() => string)]> { return GPU_METRIC_OPTS }
/** CPU big-figure options for the widget descriptors. */
export function cpuMetricOptions(): Array<[string, string | (() => string)]> { return CPU_METRIC_OPTS }

/** Read an instance's bigMetric mode, falling back to the option-list default. */
function bigMetricOf(stats: WidgetStats, opts: Array<[string, string | (() => string)]>): string {
  const m = stats.bigMetric
  return typeof m === 'string' && opts.some(([v]) => v === m) ? m : opts[0][0]
}

/** Bytes → human GB ("17.4 GB"), one decimal below 10 GB, integer above. */
export function fmtGb(bytes: number): string {
  const gb = bytes / 1024 ** 3
  return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`
}

/** Trim the verbose vendor prefix so the model name fits the 2×4 title row
 *  ("NVIDIA GeForce RTX 5070 Ti Laptop GPU" → "RTX 5070 Ti Laptop GPU"). */
export function shortGpuName(name: string): string {
  return name.replace(/^NVIDIA GeForce /, '').replace(/^NVIDIA /, '')
}

/** Utilization tone: success under 75, warn 75–89, danger ≥90 (usage-rings
 *  convention, reused for load rings). */
function loadTone(p: number): 'success' | 'warn' | 'danger' {
  return p >= 90 ? 'danger' : p >= 75 ? 'warn' : 'success'
}

/** Shared "no snapshot yet" shape (collector idle / host down / first paint). */
export function sysUnavailable(titleKey: string): WidgetRenderOut {
  return { title: t(titleKey), value: '—', legend: t('sysinfo.waiting') }
}

/** sys-cpu: big utilization (or used memory, clickable/dropdown) + mem line. */
export function sysCpuRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-cpu.name')
  const metric = bigMetricOf(stats, CPU_METRIC_OPTS)
  const value = metric === 'mem' ? fmtGb(s.mem.used) : s.cpu.util === null ? '—' : `${s.cpu.util}%`
  return {
    title: t('widget.sys-cpu.name'),
    value,
    sub: t('sysinfo.memSub', { used: fmtGb(s.mem.used), total: fmtGb(s.mem.total) }),
    cycle: { modes: CPU_METRIC_OPTS.map(([v]) => v), current: metric, hint: bigHint(CPU_METRIC_OPTS), store: 'bigMetric' },
  }
}

/** sys-gpu: big VRAM (or temp / utilization, clickable/dropdown) + util/temp
 *  line. No GPU model name on the card — the value must sit bottom-left as the
 *  large figure (a headRight would pull it into the title row). */
export function sysGpuRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-gpu.name')
  if (s.gpu === null) return { title: t('widget.sys-gpu.name'), value: '—', legend: t('sysinfo.noGpu') }
  const metric = bigMetricOf(stats, GPU_METRIC_OPTS)
  const g = s.gpu
  const value = metric === 'temp' ? `${Math.round(g.temp)}°C` : metric === 'util' ? `${Math.round(g.util)}%` : fmtGb(g.memUsed)
  return {
    title: t('widget.sys-gpu.name'),
    value,
    sub: `${g.util}% · ${g.temp}°C · ${fmtGb(g.memTotal)}`,
    cycle: { modes: GPU_METRIC_OPTS.map(([v]) => v), current: metric, hint: bigHint(GPU_METRIC_OPTS), store: 'bigMetric' },
  }
}

/** sys-rings: CPU utilization ring + GPU utilization ring (GPU ring absent
 *  while no NVIDIA GPU is detected). Values and names share one row per ring. */
export function sysRingsRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-rings.name')
  const mk = (label: string, p: number) => ({ label, value: p, ratio: p / 100, tone: loadTone(p) })
  const rings = [{ label: t('sysinfo.cpu'), value: s.cpu.util ?? 0, ratio: (s.cpu.util ?? 0) / 100, tone: loadTone(s.cpu.util ?? 0) }]
  if (s.gpu !== null) rings.push(mk(t('sysinfo.gpu'), s.gpu.util))
  return {
    title: t('widget.sys-rings.name'),
    legend: s.gpu === null ? t('sysinfo.noGpu') : undefined,
    chart: { kind: 'rings', rings },
  }
}

/** sys-board: the 2×4 monitoring dashboard — every metric as a ring (CPU
 *  utilization, memory, GPU utilization, VRAM). The GPU model (short form)
 *  and temperature sit at the RIGHT END of the title row; no extra volume row
 *  (the 0/0 GB line was removed — the rings + names carry the information). */
export function sysBoardRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-board.name')
  const mk = (label: string, p: number) => ({ label, value: p, ratio: p / 100, tone: loadTone(p) })
  const rings = [
    mk(t('sysinfo.cpu'), s.cpu.util ?? 0),
    mk(t('sysinfo.mem'), s.mem.percent),
  ]
  const gpu = s.gpu
  if (gpu !== null) {
    rings.push(mk(t('sysinfo.gpu'), gpu.util))
    rings.push(mk(t('sysinfo.vram'), gpu.memPercent))
  }
  return {
    title: t('widget.sys-board.name'),
    headRight: gpu !== null ? `${gpu.temp}°C · ${shortGpuName(gpu.name)}` : undefined,
    legend: gpu === null ? t('sysinfo.noGpu') : undefined,
    chart: { kind: 'rings', rings },
  }
}

/** sys-gpu-line: GPU utilization sparkline (Windows-task-manager style) with the
 *  current utilization as the big figure. The head follows the 上下文水位 shape the
 *  user asked for: the blue title on top, the big percent on the NEXT row, and
 *  the grey `°C · GB` facts to its RIGHT on that same row. The card body carries
 *  the sparkline, which is ELASTIC (CardBody gives the line chart the remaining
 *  vertical space, ChartBlock renders it at flex:1/100%) — so the card's
 *  intrinsic height stays inside the 2×2 box at ANY side size or magnification
 *  factor (the old fixed 68px sparkline totalled ≈178px and burst the 150px box
 *  on hover). */
export function sysGpuLineRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-gpu-line.name')
  if (s.gpu === null) return { title: t('widget.sys-gpu-line.name'), value: '—', legend: t('sysinfo.noGpu') }
  const g = s.gpu
  // The facts line is the same on every branch, so it is built once.
  const facts = `${Math.round(g.temp)}°C · ${fmtGb(g.memUsed)}`
  const hist = historyOf(s)
  // Misses are carried forward instead of breaking the line (see plotSamples).
  const allVals = hist ? plotSamples(hist.gpu) : []
  const allTs = hist ? hist.ts : []
  if (allVals.length < 2) {
    // Not enough history to DRAW a line yet: the current utilization and the
    // card's facts are both known, so the card shows them (text fill) instead of
    // a waiting notice — the sparkline appears in place on the next samples.
    return { title: t('widget.sys-gpu-line.name'), headAfter: { big: `${Math.round(g.util)}%`, small: facts } }
  }
  // Sample window (10..30, default 20): draw only the most recent N points so
  // the line keeps its shape no matter how long the host has been sampling.
  const N = resolveSparkPoints(stats)
  const vals = allVals.slice(-N)
  const ts = allTs.slice(-N)
  const fmtT = (tms: number): string => {
    const d = new Date(tms)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return {
    title: t('widget.sys-gpu-line.name'),
    headAfter: { big: `${Math.round(g.util)}%`, small: facts },
    chart: { kind: 'line', line: { values: vals, max: 100, labels: [fmtT(ts[0]), fmtT(ts[ts.length - 1])] } },
  }
}