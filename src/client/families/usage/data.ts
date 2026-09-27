import { t } from '../../i18n'
import type { UsageData, WidgetRenderOut, WidgetStats } from '../../lib/contract'

/**
 * dsh-widgets — OpenCode Go usage shared render layer (widget-family shared).
 *
 * The five usage widgets (usage-bars / usage-rings / usage-rolling / usage-
 * weekly / usage-monthly) share the pool-view resolution and the card shapes.
 * They live here — NOT copied into each unit — so the family stays consistent
 * and a new usage-style widget imports the same machinery.
 *
 * All strings come from the per-widget dictionaries (merged by the registry
 * generator from each unit's manifest; family-shared keys live in
 * `src/widgets/_shared/locales.json`), so these factories never hard-code text.
 */


/** Which key's usage a usage widget should currently show. */
export function usageView(stats: WidgetStats): { data: UsageData | null; mode: string } {
  const multi = stats.usageMulti
  const modes = stats.poolModes !== undefined && stats.poolModes.length > 0 ? stats.poolModes : ['total']
  const view = stats.poolView
  if (view === undefined || !modes.includes(view) || view === 'total') {
    return { data: multi?.total ?? stats.usageData ?? null, mode: 'total' }
  }
  // modes[0] is always 'total'; index 1..N map 1:1 to pooled keys.
  const idx = modes.indexOf(view) - 1
  const entry = multi?.keys[idx]
  return { data: entry?.data ?? null, mode: view }
}

/** Cycle descriptor for a pooled usage widget, when more than one view exists. */
export function cycleFor(stats: WidgetStats): WidgetRenderOut['cycle'] {
  const modes = stats.poolModes
  if (modes === undefined || modes.length < 2) return undefined
  const current = stats.poolView !== undefined && modes.includes(stats.poolView) ? stats.poolView : 'total'
  const hint = t('usage.cycleHint', { chain: modes.map((m) => (m === 'total' ? t('usage.totalKey') : m)).join(' → ') + ' → ' + t('usage.totalKey') })
  return { modes, current, hint }
}

/** 「总 Key」/「Key N」label for the current view. */
export function modeLabel(mode: string): string {
  return mode === 'total' ? t('usage.totalKey') : mode
}

/** Read one usage window's percent DEFENSIVELY: any malformed window (missing,
 *  null, non-object, non-numeric percent — e.g. an upstream partial/error
 *  response) yields null, so the multi-window charts degrade to a placeholder
 *  instead of throwing and taking the whole rail down with them. */
export function winPct(u: UsageData['usage'] | undefined, key: 'rolling' | 'weekly' | 'monthly'): number | null {
  const it = u?.[key]
  return it !== null && typeof it === 'object' && typeof (it as { percent?: unknown }).percent === 'number'
    ? (it as { percent: number }).percent
    : null
}

/** Single-window percent card (usage-rolling / usage-weekly / usage-monthly). */
