/**
 * dsh-widgets —the preview render builder.
 *
 * Builds the `WidgetRenderOut` a widget WOULD produce for a given instance, so a
 * market tile / stage / 组件配置 preview shows exactly what the rail card shows.
 *
 * DATA POLICY (the user's rule, 2026-09-28): **feed real data when there is any,
 * and fill the rest with the example data** — the preview is how a card is
 * reviewed without installing it on a rail in use, so it must be able to show
 * BOTH the live session and states that do not exist live right now.
 *
 * The merge order implements that, key by key:
 *   1. `PREVIEW_STATS`     — the shared filler, so no card is ever blank;
 *   2. the widget's `example.stats` — its OWN filler/state mock (a GitHub payload
 *      when no token is configured, the quote's sample text, …);
 *   3. `live`               — the real record, but ONLY its non-null slices: a
 *      payload that has not answered yet must not erase the filler above;
 *   4. the instance's saved config — last, exactly like the rail's fold, so a
 *      config-driven card previews the instance's real settings.
 */

import { WIDGETS } from '../../generated.registry'
import { instanceKey } from '../../lib/contract/helpers'
import type { WidgetRenderOut, WidgetSize, WidgetStats } from '../../lib/contract/types'
import { PREVIEW_STATS } from './preview-stats'
import type { Prefs } from '../../runtime/prefs'

/** The live values that may override the mock: present AND non-null. */
function liveOverlay(live: WidgetStats): Partial<WidgetStats> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(live)) {
    if (value !== null && value !== undefined) out[key] = value
  }
  return out as Partial<WidgetStats>
}

/**
 * The stats record a preview renders from: mock filler, the widget's own example,
 * the live record's non-null slices, then the instance config.
 *
 * @param w - the widget descriptor.
 * @param prefs - live prefs (for `cardConfigs`).
 * @param key - the instance key (`widget@size`).
 * @param live - the live stats record (`buildLiveStats`), or null outside a session.
 * @returns the merged, ready-to-render stats.
 */
export function buildPreviewStats(
  w: (typeof WIDGETS)[number],
  prefs: Prefs,
  key: string,
  live?: WidgetStats | null,
): WidgetStats {
  const ex = w.example
  const exStats = ex?.stats ? (typeof ex.stats === 'function' ? ex.stats(prefs.cardConfigs?.[key] ?? {}) : ex.stats) : {}
  return {
    ...PREVIEW_STATS,
    ...exStats,
    ...(live ? liveOverlay(live) : {}),
    ...(prefs.cardConfigs?.[key] ?? {}),
  } as WidgetStats
}

/**
 * The simulated render output for a widget instance — shared by the market's
 * stage and its gallery tiles, so a tile shows exactly what the stage shows.
 *
 * @param w - the widget descriptor.
 * @param size - the instance size the preview is laid out at.
 * @param prefs - live prefs.
 * @param sim - an explicit simulated state, else the widget's own `example.sim`.
 * @param live - the live stats record, when a session is running.
 * @returns the render output, or null (crash-isolated, like the rail's card).
 */
export function exampleOut(
  w: (typeof WIDGETS)[number],
  size: WidgetSize,
  prefs: Prefs,
  sim?: Record<string, unknown> | null,
  live?: WidgetStats | null,
): WidgetRenderOut | null {
  const key = instanceKey(w.id, size)
  const stats = buildPreviewStats(w, prefs, key, live)
  const effSim = sim ?? w.example?.sim ?? null
  // Preview isolation: a crashing widget render must not take the surface down.
  try {
    return w.render(stats, { size, ...(effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}) })
  } catch (error) {
    console.error(`[dsh-widgets] preview render crashed for ${w.id}:`, error)
    return null
  }
}
