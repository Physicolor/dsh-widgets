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

/** sys-gpu-line: GPU utilization sparkline (Windows-task-manager style) with
 *  the current utilization as the big figure. History from the host ring
 *  buffer; earliest/latest sample times on the chart's bottom corners. */
export function sysGpuLineRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-gpu-line.name')
  if (s.gpu === null) return { title: t('widget.sys-gpu-line.name'), value: '—', legend: t('sysinfo.noGpu') }
  const hist = s.history
  const vals = hist && Array.isArray(hist.gpu) ? hist.gpu : []
  const ts = hist && Array.isArray(hist.ts) ? hist.ts : []
  if (vals.length < 2) {
    return { title: t('widget.sys-gpu-line.name'), value: `${Math.round(s.gpu.util)}%`, legend: t('sysinfo.waiting') }
  }
  const fmtT = (tms: number): string => {
    const d = new Date(tms)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return {
    title: t('widget.sys-gpu-line.name'),
    value: `${Math.round(s.gpu.util)}%`,
    sub: `${s.gpu.temp}°C · ${fmtGb(s.gpu.memUsed)}`,
    chart: { kind: 'line', line: { values: vals, max: 100, labels: [fmtT(ts[0]), fmtT(ts[ts.length - 1])] } },
  }
}