/**
 * dsh-widgets — the offline CARD GALLERY.
 *
 * Renders every registered widget, at every size it declares, through the REAL
 * `CardBody` — the same component the rail mounts — in a bare browser page with
 * the shell's real theme tokens. This is the review surface a builder agent uses
 * to LOOK at its card without touching a live rail, and the demo a human opens to
 * compare states side by side.
 *
 * It is NOT part of the plugin bundle: nothing under `src/client/index.ts`
 * imports it. `scripts/preview/gallery.mjs` builds it as a standalone page.
 *
 * Data policy is the preview's own (see `example-out.ts`): filler → the widget's
 * `example.stats` → simulate, so every card renders its full shape offline. A
 * widget whose `example` carries `simSteps` gets one cell per step — that is how
 * a stateful card's states are eyeballed without waiting for the real condition.
 */
import * as React from 'react'
import { WIDGETS, WIDGET_LOCALES } from '../../generated.registry'
import { setExtraLocales } from '../../i18n'
import { DEFAULT_CORNER_PERCENT } from '../../runtime/prefs'
import type { Prefs } from '../../runtime/prefs'
import type { WidgetSize } from '../../lib/contract/types'
import { CardBody } from '../CardBody'
import { exampleOut } from './example-out'

/**
 * `CardBody` is re-exported for the HEAD-LADDER FIXTURE page the gallery build
 * writes next to `index.html` (scripts/preview/gallery.mjs): that page mounts the
 * real renderer with hand-written `WidgetRenderOut`s, so the head contract can be
 * measured in the states no widget's preview data reaches (a ring head with no
 * caption). The gallery page itself never uses this export.
 */
export { CardBody }

/** The gap the rail puts between two card columns (2×4 spans two of them). */
const COLUMN_GAP = 12

/** The minimal prefs a preview needs; every other field is irrelevant here. */
const PREFS = {
  cardConfigs: {},
  installed: [],
  squircle: true,
  cornerPercent: DEFAULT_CORNER_PERCENT,
  cardSide: 150,
} as unknown as Prefs

interface Cell {
  widgetId: string
  name: string
  size: WidgetSize
  step: number
  steps: number
  sim: Record<string, unknown> | null
  out: ReturnType<typeof exampleOut>
}

/** The gallery's option bag, injected by the page as `window.__GALLERY__`. */
export interface GalleryOptions {
  /** Widget ids to draw; absent = every registered widget. */
  only?: string[]
  /** Sizes to draw; absent = every size each widget declares. */
  sizes?: WidgetSize[]
}

/** Build one cell per widget × size × simulated state. */
function buildCells(options: GalleryOptions): Cell[] {
  const cells: Cell[] = []
  for (const w of WIDGETS) {
    if (options.only !== undefined && !options.only.includes(w.id)) continue
    const sizes = (options.sizes ?? (w.sizes ?? ['2x2'])) as WidgetSize[]
    const steps: Array<Record<string, unknown> | null> = w.example?.simSteps?.length
      ? w.example.simSteps
      : [w.example?.sim ?? null]
    for (const size of sizes) {
      steps.forEach((sim, step) => {
        cells.push({
          widgetId: w.id,
          name: typeof w.name === 'function' ? w.name() : w.name,
          size,
          step,
          steps: steps.length,
          sim,
          out: exampleOut(w, size, PREFS, sim, null),
        })
      })
    }
  }
  return cells
}

/** The whole gallery: a scrollable stack of label rows, one per cell. */
export function CardGallery({ options }: { options: GalleryOptions }): React.ReactElement {
  React.useMemo(() => { setExtraLocales(WIDGET_LOCALES) }, [])
  const cells = React.useMemo(() => buildCells(options), [options])
  return React.createElement(
    'div',
    { className: 'g-wrap' },
    cells.map((c, index) => React.createElement(
      'section',
      {
        key: `${c.widgetId}-${c.size}-${c.step}-${index}`,
        className: 'g-cell',
        'data-widget': c.widgetId,
        'data-size': c.size,
        'data-step': c.step,
      },
      React.createElement('header', { className: 'g-head' },
        React.createElement('code', null, `${c.widgetId}@${c.size}`),
        React.createElement('span', null, c.name),
        c.steps > 1 ? React.createElement('em', null, `state ${c.step + 1}/${c.steps}`) : null,
      ),
      c.out === null
        ? React.createElement('div', { className: 'g-null' }, 'render() → null (card hidden)')
        : React.createElement('div', { className: 'g-card' },
            React.createElement(CardBody, {
              out: c.out,
              unit: 150,
              width: c.size === '2x4' ? 150 * 2 + COLUMN_GAP : 150,
              squircle: true,
              cornerPercent: DEFAULT_CORNER_PERCENT,
            })),
    )),
  )
}
