/**
 * dsh-widgets — the chart registry.
 *
 * ONE line per chart kind. This file is the only thing a new chart touches: add a
 * renderer module and register it here (the plan's "new chart = new renderer + a
 * registry entry", instead of growing a conditional chain).
 *
 * A renderer is rendered AS A COMPONENT (`createElement`), never called as a plain
 * function. That matters the moment a renderer needs its own state: called inline,
 * its hooks would land on `CardBody`'s fibre — and the skeleton → loaded swap (which
 * returns before the chart on the skeleton pass) then renders MORE hooks than the
 * previous pass, which React rejects with #310 and the whole rail slot disappears.
 * Measured 2026-09-29 with the `quotas` renderer's measuring hook.
 */

import * as React from 'react'
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

/** Draw a widget chart (null when the kind has no renderer). The renderer becomes a
 *  real element, so its hooks (e.g. `quotas`' height measurement) belong to it. */
export function renderChart(props: ChartProps): ReactElement | null {
  const render = RENDERERS[props.chart.kind]
  return render === undefined ? null : React.createElement(render, props)
}

/** Kinds whose chart stretches to fill the card body (the body gets `flex: 1`).
 *  Was an inline `kind === 'line' || kind === 'lanes'` test in CardBody. */
export const CHART_FILLS_BODY: ReadonlySet<WidgetChart['kind']> = new Set(['line', 'lanes'])
