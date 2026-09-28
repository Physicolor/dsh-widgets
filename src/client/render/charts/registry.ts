/**
 * dsh-widgets — the chart registry.
 *
 * ONE line per chart kind. This file is the only thing a new chart touches: add a
 * renderer module and register it here (the plan's "new chart = new renderer + a
 * registry entry", instead of growing a conditional chain).
 */

import type { ReactElement } from 'react'
import type { WidgetChart } from '../../lib/contract/types'
import type { ChartProps } from './types'
import { BarsChart } from './bars'
import { BarsVChart } from './barsV'
import { BreakdownChart } from './breakdown'
import { LanesChart } from './lanes'
import { QuotasChart } from './quotas'
import { SegmentsChart } from './segments'
import { RingsChart } from './rings'
import { LineChart } from './line'
import { FiguresChart } from './figures'
import { RingChart } from './ring'
import { HeatmapChart } from './heatmap'

/** kind -> renderer. The kinds are mutually exclusive, so dispatching on `kind`
 *  returns exactly the branch the old if-chain would have reached. */
const RENDERERS: Partial<Record<WidgetChart['kind'], (p: ChartProps) => ReactElement | null>> = {
  bars: BarsChart,
  barsV: BarsVChart,
  breakdown: BreakdownChart,
  lanes: LanesChart,
  quotas: QuotasChart,
  segments: SegmentsChart,
  rings: RingsChart,
  line: LineChart,
  figures: FiguresChart,
  ring: RingChart,
  heatmap: HeatmapChart,
}

/** Draw a widget chart (null when the kind has no renderer). */
export function renderChart(props: ChartProps): ReactElement | null {
  const render = RENDERERS[props.chart.kind]
  return render === undefined ? null : render(props)
}

/** Kinds whose chart stretches to fill the card body (the body gets `flex: 1`).
 *  Was an inline `kind === 'line' || kind === 'lanes'` test in CardBody. */
export const CHART_FILLS_BODY: ReadonlySet<WidgetChart['kind']> = new Set(['line', 'lanes'])
