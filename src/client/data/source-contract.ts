/**
 * dsh-widgets — the DATA SOURCE ADAPTER contract (v1.11).
 *
 * WHY THIS FILE EXISTS
 *
 * Before this contract, "which live source a widget waits on" was declared in the
 * unit's manifest, but *how that source is fetched* lived in five hand-written
 * effects inside `data/collector.tsx` plus three central lists
 * (`gen-registry.mjs`'s `SOURCES` whitelist, the `BridgeSnapshot` field table, and
 * a per-family effect). Adding a data source therefore meant editing three shared
 * files — the last place in this repo where "one widget = one directory" did not
 * hold.
 *
 * Now every source is ONE module next to the family that renders it:
 *
 *   src/client/families/<family>/adapter.ts   →  defineSource({ id, schedule, pulls })
 *
 * `scripts/gen-registry.mjs` discovers those files exactly like it discovers
 * widget units and emits `SOURCE_ADAPTERS` into the generated registry, so
 * `manifest.source` may name ANY discovered adapter id and the collector needs no
 * edit at all. The acceptance test is structural and enforced by
 * `scripts/verify-source-contract.mjs`: adding a source touches ONE family
 * directory plus ONE host module, and nothing else.
 *
 * WHAT AN ADAPTER OWNS vs WHAT THE SHELL OWNS
 *
 * The adapter owns the SEMANTICS of its source: the route, the request shape, the
 * schedule, the error handling, and whether a failed answer means "still loading"
 * or "answered — show the card's own empty state". The shell owns the MECHANICS:
 * one generic scheduler (`data/source-poller.tsx`) runs every adapter, and the
 * loading skeleton stays a shell decision driven by `manifest.source` +
 * `manifest.skeleton` (a widget cannot tell "my source is in flight" from "my
 * source answered with nothing").
 */

import type { Prefs } from '../runtime/prefs'
import type { BridgeState } from '../runtime/bridge'

/** Why a tick is running. `mount` = first pull / a dependency changed;
 *  `settle` = a turn just finished; `poll` = the adapter's own timer. */
export type TickReason = 'mount' | 'settle' | 'poll'

/** Everything an adapter may read while building its request or folding an answer. */
export interface SourceTick {
  /** Why this tick is happening — an adapter may pick a different URL per reason
   *  (e.g. the daily maps ask the host to re-fold only on a turn settle). */
  reason: TickReason
  /** The LIVE prefs, for per-instance configuration. */
  prefs: Prefs
  /** The bridge as of this tick — the PREVIOUS answer is readable here, which is
   *  what makes "stale while error/degraded" decidable without any closure state. */
  state: BridgeState
  /** Every INSTALLED instance key whose widget declares this adapter's id. */
  instances: readonly string[]
  /** One instance's card configuration (never undefined). */
  config(instanceKey: string): Record<string, unknown>
  /** Whether the rail is on screen (some sources only spend bandwidth then). */
  railOpen: boolean
  /** Epoch millis, injected so ticks stay testable. */
  now: number
}

/** What one HTTP answer means to the bridge. */
export interface SourceAnswer {
  ok: boolean
  /** HTTP status; 0 = the request never reached the host (network failure). */
  status: number
  /** Parsed JSON body, or null when parsing failed / the body was empty. */
  payload: unknown
}

/** An adapter's verdict on one answer. */
export interface SourceEffect {
  /** Bridge patch to merge (omit to leave the bridge untouched). */
  patch?: Partial<BridgeState>
  /** Ask the scheduler for ONE extra tick this many ms out — the degraded-payload
   *  retry. The scheduler keeps at most one pending retry per adapter. */
  retryInMs?: number
  /** Did this source produce something renderable? The FIRST `true` clears the
   *  card's loading skeleton. An adapter whose route answers with a real error
   *  state ("not configured", "host not restarted") returns `true` there too —
   *  an eternal placeholder would hide the card's own explanation. */
  resolved?: boolean
}

/** One request an adapter wants on this tick. */
export interface SourcePull {
  /** Same-origin host route, query string included. */
  url: string
  /** Fold the answer. Called for failures too — the error codes the cards render
   *  (`unconfigured` / `unloaded` / `http:503`) are produced here. */
  apply(answer: SourceAnswer, tick: SourceTick): SourceEffect | null
}

/** The scheduling policy — the ONLY part of an adapter the shell interprets. */
export interface SourceSchedule {
  /** Pull on mount and whenever a dependency changes. Default `true`. */
  mount?: boolean
  /** Pull again when a turn settles (running true → false). Default `false`. */
  settle?: boolean
  /** Timer cadence in ms; return null/0 for "no timer". Evaluated per tick, so it
   *  may follow the installed instances (the sys family polls at the SHORTEST
   *  interval its installed cards ask for). */
  pollMs?: (tick: SourceTick) => number | null
  /** Skip this source entirely (timer included) unless the rail is on screen.
   *  Also makes the rail's open/close re-evaluate the schedule at once. */
  railOpen?: boolean
}

/**
 * A discovered data source. Register it by creating
 * `src/client/families/<family>/adapter.ts` and exporting `defineSource({...})`;
 * the generator (and therefore `SOURCE_REGISTRY`) follows automatically.
 */
export interface SourceAdapter {
  /** The id `manifest.source` names. Kebab-case, unique across all families. */
  id: string
  /** Which host module answers it — documentation and the review checklist. */
  host: string
  schedule: SourceSchedule
  /**
   * Installed widgets that make this source worth polling, by their manifest's
   * `source`. Default `[id]` — the source owns the cards that declare it.
   *
   * Override it for a source that FEEDS another source's cards instead of owning
   * them: the machine-wide day map is read by the usage AND cc families and no
   * widget declares `usage-daily` directly, so it lists both.
   */
  consumerSources?: readonly string[]
  /**
   * Installed widget IDS that make this source worth polling, for a source whose
   * readers do not (or cannot) declare it — the price table is read by
   * `session-cost` alone and is not a `manifest.source` of its own.
   */
  consumerWidgets?: readonly string[]
  /** The requests to run on this tick. Empty array = nothing to do right now. */
  pulls(tick: SourceTick): SourcePull[]
  /**
   * Re-pull when this string changes — the adapter's own dependency signal
   * (config edits, the installed set, whether a specific card is present).
   * Without it the schedule is mount/settle/timer only.
   */
  deps?(tick: SourceTick): string
}

/** Identity helper with a doc anchor — every adapter file exports
 *  `defineSource({ ... })` so the contract stays self-describing. */
export function defineSource(a: SourceAdapter): SourceAdapter {
  return a
}

/**
 * Runtime guard used by the GENERATED registry to flatten each family module's
 * exports into `SOURCE_ADAPTERS`: an `import * as` namespace also carries helper
 * functions and re-exported types, and only real adapters may enter the registry.
 */
export function isSourceAdapter(v: unknown): v is SourceAdapter {
  if (v === null || typeof v !== 'object') return false
  const a = v as Partial<SourceAdapter>
  return typeof a.id === 'string' && typeof a.pulls === 'function' && a.schedule !== undefined && a.schedule !== null
}
