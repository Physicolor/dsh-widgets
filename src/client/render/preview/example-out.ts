/**
 * dsh-widgets —the preview render builder.
 *
 * Builds the `WidgetRenderOut` a widget WOULD produce for a given instance: the shared
 * preview stats, the widget's own `example` extras, and the instance's own config, so a
 * market tile shows exactly what the rail card shows.
 */

import { WIDGETS } from '../../generated.registry'
import { instanceKey, type WidgetRenderOut, type WidgetSize } from '../../lib/contract'
import { PREVIEW_STATS } from './preview-stats'
import type { Prefs } from '../../runtime/prefs'

/** The simulated render output for a widget instance — shared by the market's
 *  stage and its gallery tiles, so a tile shows exactly what the stage shows.
 *  Widget-owned example stats ride over the shared preview stats, and the
 *  instance's own config rides along like the rail's render does. */
export function exampleOut(w: (typeof WIDGETS)[number], size: WidgetSize, prefs: Prefs, sim?: Record<string, unknown> | null): WidgetRenderOut | null {
  const key = instanceKey(w.id, size)
  const ex = w.example
  const exStats = ex?.stats ? (typeof ex.stats === 'function' ? ex.stats(prefs.cardConfigs?.[key] ?? {}) : ex.stats) : {}
  const stats = { ...PREVIEW_STATS, ...exStats, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0]
  const effSim = sim ?? ex?.sim ?? null
  // Preview isolation: a crashing widget render must not take the surface down.
  try {
    return w.render(stats, { size, ...(effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}) })
  } catch (error) {
    console.error(`[dsh-widgets] preview render crashed for ${w.id}:`, error)
    return null
  }
}
