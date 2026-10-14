/**
 * dsh-widgets — the SOURCE REGISTRY: the one place that answers "which live
 * sources exist, and is anyone looking at them?".
 *
 * The adapter list itself is GENERATED (`SOURCE_ADAPTERS` in
 * `client/generated.registry.ts`, one import per `families/<id>/adapter.ts`), so
 * this module holds only the resolution rules — no source id is written down
 * here, and adding one never touches this file. That property is asserted by
 * `scripts/verify-source-contract.mjs`.
 */
import { SOURCE_ADAPTERS, WIDGET_RUNTIME as BUILTIN_RUNTIME } from '../generated.registry'
import { parseInstanceKey } from '../lib/contract/helpers'
import type { WidgetRuntimeMeta } from '../lib/contract/types'
import type { Prefs } from '../runtime/prefs'
import type { BridgeState } from '../runtime/bridge'
import type { SourceAdapter, SourceTick, TickReason } from './source-contract'

/**
 * The runtime metadata the consumer rules read: which widget waits on which
 * source, and what its skeleton looks like.
 *
 * It starts as the BUILT-IN map and `lib/registry.ts` swaps in the LIVE one at
 * boot, so a third-party unit's `source` participates in consumer resolution
 * exactly like a built-in's. Injected rather than imported on purpose: the live
 * registry imports THIS module, and a direct import back would be a cycle whose
 * only symptom is a silently empty registry.
 */
let runtimeMeta: Record<string, WidgetRuntimeMeta> = BUILTIN_RUNTIME

/** Point the consumer rules at the live registry (called once by lib/registry). */
export function useRuntimeMeta(next: Record<string, WidgetRuntimeMeta>): void {
  runtimeMeta = next
}

/** Every discovered adapter, in generator order (families sorted by path).
 *  De-duplicated by ID: the registry is the authority on identity, so a family
 *  module re-exporting the same adapter twice still yields one poller. */
const BY_ID: ReadonlyMap<string, SourceAdapter> = new Map(SOURCE_ADAPTERS.map((a) => [a.id, a]))

export const SOURCE_REGISTRY: readonly SourceAdapter[] = [...BY_ID.values()]

/** The adapter for a `manifest.source` value, or undefined when none exists
 *  (a widget whose source was removed, or a manifest written before its
 *  adapter landed — `pnpm check:registry` fails the build for the latter). */
export function adapterFor(id: string): SourceAdapter | undefined {
  return BY_ID.get(id)
}

/** Does any adapter answer this source? The skeleton decision needs this: a
 *  source nobody serves can never be "still loading". */
export function hasSource(id: string): boolean {
  return BY_ID.has(id)
}

/** Every source id a manifest may declare. */
export function sourceIds(): string[] {
  return SOURCE_ADAPTERS.map((a) => a.id)
}

/** The installed instance keys a source should serve: the widgets whose manifest
 *  declares `source === id`. The DEFAULT rule — see `consumerSources` for the
 *  sources that feed another family's cards, and `consumerWidgets` for the ones
 *  read by a card that has no `source` of its own. */
function instancesForSource(source: string, prefs: Prefs): string[] {
  return prefs.installed.filter((key) => runtimeMeta[parseInstanceKey(key).widgetId]?.source === source)
}

/**
 * Does any INSTALLED unit declare that it reads a non-route source?
 *
 * `source` covers host ROUTES (the adapter contract polls a URL). Some data has no
 * route at all: the DSH scheduled-task subsystem is a client Remote FACE with a
 * change event (see data/schedule.ts). A unit that reads one of those declares it
 * in its manifest (`reads: ['schedule']`, surfaced through WIDGET_RUNTIME), and
 * this is the same gate the adapters get — nothing is subscribed, and no call is
 * made, unless a card that renders it is on the rail.
 */
export function readsSchedule(prefs: Prefs): boolean {
  return prefs.installed.some((key) => (runtimeMeta[parseInstanceKey(key).widgetId]?.reads ?? []).includes('schedule'))
}

/** The installed instances this adapter serves (what the tick sees). */
export function instancesFor(adapter: SourceAdapter, prefs: Prefs): string[] {
  if (adapter.consumerSources !== undefined) {
    const wanted = new Set(adapter.consumerSources)
    return prefs.installed.filter((key) => {
      const source = runtimeMeta[parseInstanceKey(key).widgetId]?.source
      return source !== undefined && wanted.has(source)
    })
  }
  if (adapter.consumerWidgets !== undefined) {
    const wanted = new Set(adapter.consumerWidgets)
    return prefs.installed.filter((key) => wanted.has(parseInstanceKey(key).widgetId))
  }
  return instancesForSource(adapter.id, prefs)
}

/**
 * The adapters that have at least one consumer right now.
 *
 * Nothing is requested unless some installed unit can render it: the OpenCode
 * route answers 503 while its key is unconfigured, so asking anyway printed
 * "Failed to load resource: 503" on every turn for a feature the user had never
 * placed on the rail (reported 2026-09-30), and a route nobody renders is pure
 * waste. Installing a widget starts its feed on the next render, because prefs
 * are read live at the point of use.
 */
export function activeAdapters(prefs: Prefs): SourceAdapter[] {
  return SOURCE_ADAPTERS.filter((a) => instancesFor(a, prefs).length > 0)
}

/** Build the per-tick context an adapter reads. Pure: everything comes from the
 *  arguments, so two ticks with the same inputs behave identically. */
export function makeTick(
  adapter: SourceAdapter,
  reason: TickReason,
  prefs: Prefs,
  state: BridgeState,
  railOpen: boolean,
  now: number,
): SourceTick {
  return {
    reason,
    prefs,
    state,
    instances: instancesFor(adapter, prefs),
    config: (instanceKey) => prefs.cardConfigs?.[instanceKey] ?? {},
    railOpen,
    now,
  }
}
