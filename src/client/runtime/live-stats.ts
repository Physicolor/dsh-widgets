/**
 * dsh-widgets — the ONE live-stats assembly.
 *
 * Both the rail and the preview surfaces must render a widget from the SAME
 * record, because "the preview shows what the card will show" is a promise the
 * market and 组件配置 make to the user: the cards are reviewed there INSTEAD of
 * being installed on a rail in use. So the bridge snapshot → `WidgetStats` fold
 * lives here once, and the rail no longer assembles it inline (it did, at
 * rail-view.tsx:319-330, before the preview surfaces could read it).
 *
 * The fold is exactly what the rail used to do:
 *   1. the collector's session stats, with the heatmap day map FALLING BACK to the
 *      persisted log only when live stats carry no heatmap fields (first paint
 *      before the collector's effect runs) — never overriding live values;
 *   2. the payload slices the collector keeps in the bridge (usage / pool /
 *      Command Code / hardware / GitHub) plus their error codes;
 *   3. the pooled views the usage cards cycle through (`total` first);
 *   4. the instance's own saved config LAST, so a config-driven card
 *      (peak-pricing's windows, the heatmap's timezone, 会话概览's metrics) renders
 *      the instance's real settings rather than the defaults.
 */

import { DEFAULT_TZ, buildHeatmapGrid, loadHeatmapStore } from '../lib/heatmap-accounting'
import type { WidgetStats } from '../lib/contract/types'
import type { BridgeSnapshot } from './bridge'
import type { Prefs } from './prefs'

/** Zeroed session stats for the first paint, before the collector's first pass. */
const ZERO_STATS = {
  turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null,
} as const

/**
 * Fold one bridge snapshot into the stats record a widget instance renders from.
 *
 * @param snap - the live bridge snapshot.
 * @param prefs - the live prefs (heatmap fallback config + this instance's config).
 * @param key - the instance key (`widget@size`), for `cardConfigs` lookup.
 * @param armedAction - the rail's armed-action id (transient UI state; previews pass null).
 * @returns the exact record the rail passes to `Widget.render`.
 */
export function buildLiveStats(snap: BridgeSnapshot, prefs: Prefs, key: string, armedAction: string | null = null): WidgetStats {
  const statsHeat = snap.stats as (WidgetStats & { heatmapRaw?: Record<string, number>; heatmapGrid?: unknown }) | null
  const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0
    ? statsHeat.heatmapRaw
    : (snap.usageDaily ?? loadHeatmapStore())
  const base = {
    ...(snap.stats ?? ZERO_STATS),
    // Only inject the fallback when live stats lacks heatmap fields.
    ...(statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } }),
    ...(statsHeat?.heatmapGrid ? {} : {
      heatmapGrid: buildHeatmapGrid(
        fallbackRaw,
        (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling',
        (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ,
      ),
    }),
  }
  // Pooled usage views: ['total', 'Key 1', …] when the pool has more than one key;
  // otherwise the usage cards fall back to single-key data.
  const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1
    ? ['total', ...snap.usageMulti!.keys.map((entry, i) => entry.label || `Key ${i + 1}`)]
    : undefined
  return {
    ...base,
    usageData: snap.usageData,
    usageMulti: snap.usageMulti,
    commandCode: snap.commandCode,
    commandCodeError: snap.commandCodeError,
    commandCodeDaily: snap.commandCodeDaily,
    sysinfo: snap.sysinfo,
    host: snap.host,
    hostError: snap.hostError,
    pricing: snap.pricing,
    github: snap.github,
    githubError: snap.githubError,
    poolModes,
    armedAction,
    ...(prefs.cardConfigs?.[key] ?? {}),
  } as WidgetStats
}
