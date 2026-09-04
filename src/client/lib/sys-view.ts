/**
 * dsh-widgets — Machine/system (SysInfo) shared render layer (widget-family
 * shared). The four system widgets (sys-cpu / sys-gpu / sys-rings / sys-board)
 * share the snapshot resolution, the refresh-interval config schema and the
 * formatting helpers. They live here — NOT copied into each unit — so the
 * family stays consistent and a new system widget imports the same machinery.
 *
 * All strings come from the per-widget dictionaries (merged by the registry
 * generator from each unit's manifest; family-shared keys live in
 * `src/widgets/_shared/locales.json`), so these factories never hard-code text.
 */

import { t } from '../i18n'
import type { ConfigField, SysInfo, WidgetRenderOut, WidgetStats } from './contract'

/** The four system (hardware) widget ids — the client collector uses this list
 *  to find which installed instances drive the `/api/sysinfo` polling cadence. */
export const SYS_WIDGET_IDS = ['sys-cpu', 'sys-gpu', 'sys-rings', 'sys-board']

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

/** Bytes → human GB ("17.4 GB"), one decimal below 10 GB, integer above. */
export function fmtGb(bytes: number): string {
  const gb = bytes / 1024 ** 3
  return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`
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

/** sys-cpu: big utilization number + memory line. */
export function sysCpuRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-cpu.name')
  return {
    title: t('widget.sys-cpu.name'),
    value: s.cpu.util === null ? '—' : `${s.cpu.util}%`,
    sub: t('sysinfo.memSub', { used: fmtGb(s.mem.used), total: fmtGb(s.mem.total) }),
  }
}

/** sys-gpu: big VRAM number + utilization/temperature line. */
export function sysGpuRender(stats: WidgetStats): WidgetRenderOut | null {
  const s = sysInfo(stats)
  if (s === null) return sysUnavailable('widget.sys-gpu.name')
  if (s.gpu === null) return { title: t('widget.sys-gpu.name'), value: '—', legend: t('sysinfo.noGpu') }
  return {
    title: t('widget.sys-gpu.name'),
    headRight: s.gpu.name,
    value: fmtGb(s.gpu.memUsed),
    sub: `${s.gpu.util}% · ${s.gpu.temp}°C · ${fmtGb(s.gpu.memTotal)}`,
  }
}

/** sys-rings: CPU utilization ring + GPU utilization ring (GPU ring absent
 *  while no NVIDIA GPU is detected). */
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
 *  utilization, memory, GPU utilization, VRAM) with the GPU temperature in the
 *  title row. */
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
    headRight: gpu !== null ? `${gpu.temp}°C` : undefined,
    legend: gpu === null ? t('sysinfo.noGpu') : undefined,
    sub: gpu !== null ? `${fmtGb(gpu.memUsed)} / ${fmtGb(gpu.memTotal)} · ${gpu.name}` : undefined,
    chart: { kind: 'rings', rings },
  }
}