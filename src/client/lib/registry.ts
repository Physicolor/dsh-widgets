/**
 * dsh-widgets — the LIVE widget registry.
 *
 * WHY THIS MODULE EXISTS
 *
 * `generated.registry.ts` is the BUILT-IN set: it is produced at build time and is
 * immutable by design. A third-party bundle cannot add to it (that is what the
 * roadmap item `widgets-market` is about), so the runtime reads its widgets,
 * instances, runtime metadata and locales from HERE instead — the same values the
 * generated module holds, plus whatever a reviewed third-party unit contributed at
 * runtime.
 *
 * The shapes are deliberately drop-in: `WIDGETS`, `ALL_INSTANCES`, `ALL_IDS`,
 * `WIDGET_RUNTIME` and `WIDGET_LOCALES` are LIVE arrays/objects that registration
 * mutates IN PLACE. A consumer that imports them keeps the exact code it had with
 * `generated.registry` — it simply sees the extra entries from then on, and any
 * surface that must re-render on a late registration subscribes with
 * `useWidgetRegistry()`.
 *
 * Review: `validateExternalUnit` (lib/contract/external.ts) runs on every
 * registration, so the browser applies the same rules as the offline submission
 * gate `scripts/validate-external-unit.mjs`. Registration is refused loudly (it
 * throws) — a bundle that fails review must not half-install a widget.
 */
import * as React from 'react'
import {
  ALL_IDS as BUILTIN_IDS,
  ALL_INSTANCES as BUILTIN_INSTANCES,
  DEFAULT_INSTALLED,
  STATS_WIDGET_IDS,
  WIDGET_LOCALES as BUILTIN_LOCALES,
  WIDGET_RUNTIME as BUILTIN_RUNTIME,
  WIDGETS as BUILTIN_WIDGETS,
} from '../generated.registry'
import { instanceKey, sizesOf } from './contract/helpers'
import type { Widget, WidgetRuntimeMeta, WidgetSize } from './contract/types'
import { validateExternalUnit, type ExternalWidgetUnit } from './contract/external'
import { hasSource, sourceIds, useRuntimeMeta } from '../data/sources'

/** Re-exported unchanged: these two never gain entries at runtime. */
export { DEFAULT_INSTALLED, STATS_WIDGET_IDS }

/** Every widget the runtime serves: built-ins first, then third-party units in
 *  registration order. MUTATED IN PLACE by {@link registerExternalUnit}. */
export const WIDGETS: Widget[] = BUILTIN_WIDGETS.slice()

/** Every valid instance key (`<id>@<size>`), in the same order. Live. */
export const ALL_INSTANCES: string[] = BUILTIN_INSTANCES.slice()

/** Every widget id, in registry order. Live. */
export const ALL_IDS: string[] = BUILTIN_IDS.slice()

/** Per-widget runtime metadata (which live source it waits on, its skeleton). Live. */
export const WIDGET_RUNTIME: Record<string, WidgetRuntimeMeta> = { ...BUILTIN_RUNTIME }

/** The merged dictionary the locale service is fed. Live: a registering unit's
 *  own strings are added before its widgets can be listed anywhere. */
export const WIDGET_LOCALES: { zh: Record<string, string>; en: Record<string, string> } = {
  zh: { ...BUILTIN_LOCALES.zh },
  en: { ...BUILTIN_LOCALES.en },
}

// The data-source consumer rules (`data/sources.ts`) read the runtime metadata
// through this live map, so a third-party unit that declares a `source` is polled
// exactly like a built-in one.
useRuntimeMeta(WIDGET_RUNTIME)

/** Third-party units currently registered, in order. */
const externals: ExternalWidgetUnit[] = []
const listeners = new Set<() => void>()
let version = 0

/** The registration-version counter (for `useSyncExternalStore`). */
export function registryVersion(): number {
  return version
}

/** Subscribe to registry changes. Returns the disposer. */
export function subscribeRegistry(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

function notify(): void {
  version += 1
  for (const fn of [...listeners]) fn()
}

/** Re-render the calling component when a unit registers (or unregisters). */
export function useWidgetRegistry(): number {
  return React.useSyncExternalStore(subscribeRegistry, registryVersion, registryVersion)
}

/** The widget for an id, built-in or third-party. */
export function widgetById(id: string): Widget | undefined {
  return WIDGETS.find((w) => w.id === id)
}

/** Every instance key of one widget id at its declared sizes. */
export function instancesOf(widget: Widget): string[] {
  return sizesOf(widget).map((size: WidgetSize) => instanceKey(widget.id, size))
}

/**
 * Register one REVIEWED third-party unit.
 *
 * @throws when the unit violates the contract (see lib/contract/external.ts) —
 *   with every violation listed, so the contributor has one message to act on.
 * @returns an unregister function (a bundle being unloaded must leave the registry
 *   exactly as it found it — the same discipline every `ctx.effect` follows).
 */
export function registerExternalUnit(unit: ExternalWidgetUnit): () => void {
  const errors = validateExternalUnit(unit, {
    isTaken: (id) => widgetById(id) !== undefined,
    hasSource,
  })
  if (errors.length > 0) {
    throw new Error(`[dsh-widgets] third-party unit rejected:\n  - ${errors.join('\n  - ')}`)
  }
  const { manifest, widget } = unit
  externals.push(unit)
  WIDGETS.push(widget)
  for (const key of instancesOf(widget)) {
    ALL_INSTANCES.push(key)
    if (!ALL_IDS.includes(widget.id)) ALL_IDS.push(widget.id)
  }
  WIDGET_RUNTIME[widget.id] = {
    source: manifest.source,
    skeleton: manifest.skeleton as WidgetRuntimeMeta['skeleton'],
  }
  for (const loc of ['zh', 'en'] as const) {
    for (const [k, v] of Object.entries(manifest.locale?.[loc] ?? {})) WIDGET_LOCALES[loc][k] = v
  }
  notify()
  let registered = true
  return () => {
    if (!registered) return
    registered = false
    const at = externals.indexOf(unit)
    if (at !== -1) externals.splice(at, 1)
    const wi = WIDGETS.indexOf(widget)
    if (wi !== -1) WIDGETS.splice(wi, 1)
    for (const key of instancesOf(widget)) {
      const ki = ALL_INSTANCES.indexOf(key)
      if (ki !== -1) ALL_INSTANCES.splice(ki, 1)
    }
    const ai = ALL_IDS.indexOf(widget.id)
    if (ai !== -1) ALL_IDS.splice(ai, 1)
    delete WIDGET_RUNTIME[widget.id]
    // Locale keys are left in place: another unit may legitimately share a family
    // key, and a stale string is harmless where a missing one renders a raw key.
    notify()
  }
}

/** The third-party units currently registered (read-only copy). */
export function externalUnits(): readonly ExternalWidgetUnit[] {
  return externals.slice()
}

/** The source ids a unit may declare — the discovered adapter set. */
export function knownSources(): string[] {
  return sourceIds()
}
