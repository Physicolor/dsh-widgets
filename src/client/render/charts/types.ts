/**
 * dsh-widgets — the chart renderer contract.
 *
 * Charts are a closed, framework-owned vocabulary: a widget describes its body as
 * `WidgetChart` data and the framework draws it. Adding a chart means adding one
 * renderer file and registering it in `registry.ts` — never editing a 500-line
 * conditional chain.
 *
 * `scale` is `side / BASE_SIDE` (the deck's one card scale factor), computed once by
 * the dispatcher so every renderer shares it instead of re-deriving it.
 */

import type { WidgetChart } from '../../lib/contract/types'

/** What every chart renderer receives. */
export interface ChartProps {
  chart: WidgetChart
  side: number
  width?: number
  pad?: number
  /** The card scale factor (`side / BASE_SIDE`). */
  scale: number
}
