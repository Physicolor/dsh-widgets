/**
 * G4 harness — the offline render snapshot of every widget.
 *
 * Calls each registered widget's `render(PREVIEW_STATS, { size, sim })` for every
 * shipped size and every preview state, and returns the resulting
 * `WidgetRenderOut` as plain data. No React, no DOM: a widget render is a pure
 * data description (see `lib/contract/types.ts`), which is what makes this gate
 * possible.
 *
 * This is the behaviour-preservation net for the architecture refactor: moving
 * code between modules must not change one field of these outputs.
 */

import { WIDGETS, WIDGET_LOCALES } from '../../src/client/generated.registry'
import { sizesOf } from '../../src/client/lib/contract/helpers'
import { setExtraLocales } from '../../src/client/i18n'
import { PREVIEW_STATS } from '../../src/client/render/preview/preview-stats'

// Mirror what apply() does once at boot: merge the per-widget dictionaries over
// the shell dictionaries, so the snapshot also covers the manifest → registry →
// i18n chain (without it every widget string would degrade to its raw key).
setExtraLocales(WIDGET_LOCALES)

export interface SnapshotEntry {
  id: string
  size: string
  /** The simulated state handed to `render` (null = no sim). */
  sim: Record<string, unknown> | null
  out: unknown
}

/** The preview states a widget can be rendered in: the plain render first, then
 *  its declared sim / simSteps (mirrors what the two preview surfaces show). */
function simStates(w: (typeof WIDGETS)[number]): Array<Record<string, unknown> | null> {
  const steps = w.example?.simSteps
  const states: Array<Record<string, unknown> | null> = [null]
  if (Array.isArray(steps) && steps.length > 0) {
    for (const s of steps) states.push(s)
  } else if (w.example?.sim) {
    states.push(w.example.sim)
  }
  return states
}

/** Recursively sort object keys so the JSON is order-stable. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value !== null && typeof value === 'object') {
    const src = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(src).sort()) out[k] = stable(src[k])
    return out
  }
  return value
}

export function snapshot(): SnapshotEntry[] {
  const rows: SnapshotEntry[] = []
  for (const w of WIDGETS) {
    const ex = w.example?.stats
    const extra = typeof ex === 'function' ? ex({}) : (ex ?? {})
    const stats = { ...PREVIEW_STATS, ...extra }
    for (const size of sizesOf(w)) {
      for (const sim of simStates(w)) {
        let out: unknown = null
        try {
          out = stable(w.render(stats, { size, sim: sim ?? undefined }) ?? null)
        } catch (e) {
          out = { __renderError: String(e) }
        }
        rows.push({ id: w.id, size, sim: sim ?? null, out })
      }
    }
  }
  return rows
}
