import { t } from '../../i18n'
import type { WidgetRenderOut, WidgetStats } from '../../lib/contract'
import { sysInfo, plotSamples, historyOf, resolveSparkPoints, GPU_METRIC_OPTS, CPU_METRIC_OPTS, bigHint, bigMetricOf } from './data'

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
