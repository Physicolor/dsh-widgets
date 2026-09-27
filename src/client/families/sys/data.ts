import { t } from '../../i18n'
import type { ConfigField, SysInfo, WidgetStats } from '../../lib/contract'

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
export function historyOf(s: SysInfo): { ts: number[]; gpu: Array<number | null> } | null {
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
export const GPU_METRIC_OPTS: Array<[string, string | (() => string)]> = [
  ['vram', () => t('sysinfo.bigVram')],
  ['temp', () => t('sysinfo.bigTemp')],
  ['util', () => t('sysinfo.bigUtil')],
]
export const CPU_METRIC_OPTS: Array<[string, string | (() => string)]> = [
  ['util', () => t('sysinfo.bigUtil')],
  ['mem', () => t('sysinfo.bigMem')],
]

/** Config dropdown for the big-figure mode (per-widget option lists). */
export function bigMetricSchema(opts: Array<[string, string | (() => string)]>): ConfigField {
  return { key: 'bigMetric', label: () => t('sysinfo.bigMetric'), type: 'mode', options: opts, default: opts[0][0] }
}

/** Cycle hint: "VRAM (GB) → Temp (°C) → Utilization (%) → …" closing the loop. */
export function bigHint(opts: Array<[string, string | (() => string)]>): string {
  const labels = opts.map(([_v, l]) => (typeof l === 'function' ? l() : l))
  return t('sysinfo.bigHint', { chain: labels.concat(labels[0]).join(' → ') })
}

/** GPU big-figure options for the widget descriptors. */
export function gpuMetricOptions(): Array<[string, string | (() => string)]> { return GPU_METRIC_OPTS }
/** CPU big-figure options for the widget descriptors. */
export function cpuMetricOptions(): Array<[string, string | (() => string)]> { return CPU_METRIC_OPTS }

/** Read an instance's bigMetric mode, falling back to the option-list default. */
export function bigMetricOf(stats: WidgetStats, opts: Array<[string, string | (() => string)]>): string {
  const m = stats.bigMetric
  return typeof m === 'string' && opts.some(([v]) => v === m) ? m : opts[0][0]
}

