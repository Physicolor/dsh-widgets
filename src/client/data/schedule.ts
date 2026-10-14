/**
 * dsh-widgets — the DSH SCHEDULED-TASK fold (the 日历 / 倒计时 cards' second source).
 *
 * WHERE THIS DATA COMES FROM. DSH ships a durable reminder subsystem
 * (`@deepseek-ai/dsh-schedule`): the agent's `schedule_create/list/delete/update`
 * tools write it, and the official client reads it through the Remote face —
 * `ctx.remote.schedule.catalog()` plus the `schedule/changed` event. That face is
 * what this module talks to. There is no host ROUTE for it (which is why it is not
 * one of the `manifest.source` adapters: those poll a URL), and no projection
 * either (26 keys, none of them schedule) — the Remote face is the only door, and
 * it is already open to a third-party plugin because `ctx.get('remote')` resolves
 * to the same service instance the official packages use.
 *
 * WHY THE FOLD LIVES HERE. The wire type is a union of six rule shapes with their
 * own field names (`after_seconds`, `scheduledAt` as an RFC 3339 UTC STRING, …).
 * A card must not import the upstream package and must not re-derive any of it, so
 * the union is flattened ONCE, here, into `ScheduleEntryInfo` — the same discipline
 * as the model-selection / permission folds in `data/session-stats.ts`.
 *
 * THE DEGRADATION SWITCH. The schedule bundle is OPTIONAL in a DSH install (the
 * official release Web composition does not include it), so `remote.schedule` can
 * simply be absent. That is not an error and not an empty agenda: it is
 * `status: 'unavailable'`, and every card that reads this must then DEGRADE — the
 * calendar falls back to a plain month grid, the countdown prints `—` — instead of
 * claiming the user has no reminders.
 */

import type { ScheduleEntryInfo, ScheduleSnapshot } from '../lib/contract/types'

/** The two members of the client Remote face this plugin uses. */
export interface ScheduleRemoteFace {
  /** `@Remote('catalog')`: every retained task, across all sessions. */
  catalog?: () => Promise<unknown>
  /** The Remote event subscription (`remote.$on`), not the cordis one. */
  $on?: (eventName: string, listener: () => void) => (() => void) | void
}

/** The `remote` service, as much of it as this plugin looks at.
 *
 *  `schedule` is the scheduled-task face; `commands` is the slash-command seam a
 *  one-click action card fires (`contextCompact` → `/compact`). Both are NAMESPACE
 *  reads, which is the whole reason they need a context that declared the
 *  dependency — see the resolution note in `client/index.ts`. */
export interface RemoteServiceLike {
  schedule?: ScheduleRemoteFace
  commands?: { execute?: (agent: unknown, line: string) => Promise<unknown> }
}

/** A missing or failed face. One shared frozen value: a card can compare by identity. */
export const SCHEDULE_UNAVAILABLE: ScheduleSnapshot = { status: 'unavailable', entries: [] }

const KINDS: ReadonlySet<string> = new Set(['at', 'after', 'every', 'daily', 'weekly', 'cron'])

/** A finite number, or undefined — every field here arrives as untrusted JSON. */
function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Flatten the catalog payload into the cards' shape.
 *
 * Entries without a decodable `scheduledAt` are DROPPED rather than dated to `0`:
 * a task the cards cannot place in time would otherwise pin the calendar's "next"
 * at 1970, which is worse than not showing it. An unreadable payload folds to an
 * empty list (the face answered, it just had nothing usable), never to
 * `unavailable` — those two states mean different things to a card.
 */
export function normalizeScheduleCatalog(value: unknown): ScheduleEntryInfo[] {
  if (!Array.isArray(value)) return []
  const out: ScheduleEntryInfo[] = []
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const id = str(r.id)
    const at = typeof r.scheduledAt === 'string' ? Date.parse(r.scheduledAt) : NaN
    if (id === undefined || !Number.isFinite(at)) continue
    const kind = str(r.kind)
    out.push({
      id,
      // The Host store requires a title; `prompt` is the stored fallback for a
      // record written before titles existed.
      title: str(r.title) ?? str(r.prompt) ?? id,
      at,
      status: r.status === 'inactive' ? 'inactive' : 'active',
      kind: kind !== undefined && KINDS.has(kind) ? (kind as ScheduleEntryInfo['kind']) : 'at',
      ...(num(r.everySeconds) === undefined ? {} : { everySeconds: num(r.everySeconds) }),
      ...(str(r.time) === undefined ? {} : { time: str(r.time) }),
      ...(Array.isArray(r.weekdays) ? { weekdays: r.weekdays.filter((d): d is number => typeof d === 'number') } : {}),
      ...(str(r.expression) === undefined ? {} : { expression: str(r.expression) }),
      ...(str(r.timeZone) === undefined ? {} : { timeZone: str(r.timeZone) }),
    })
  }
  return out
}

/** One Remote answer (`{ ok, value }`) or a bare payload, folded. */
function foldAnswer(answer: unknown): ScheduleSnapshot {
  if (answer !== null && typeof answer === 'object' && 'ok' in (answer as Record<string, unknown>)) {
    const a = answer as { ok: boolean; value?: unknown }
    // A FAILED call is "cannot tell", not "no tasks": the card must degrade.
    return a.ok ? { status: 'ready', entries: normalizeScheduleCatalog(a.value) } : SCHEDULE_UNAVAILABLE
  }
  return { status: 'ready', entries: normalizeScheduleCatalog(answer) }
}

/**
 * Read the whole catalog once.
 *
 * Never throws and never rejects: the collector folds the answer straight into the
 * bridge, and a rejection there would take the collector's effect (and with it
 * every card's data) down. A missing face, a transport failure and a host error
 * branch all answer `unavailable`.
 */
export async function readScheduleCatalog(face: ScheduleRemoteFace | undefined): Promise<ScheduleSnapshot> {
  const catalog = face?.catalog
  if (typeof catalog !== 'function') return SCHEDULE_UNAVAILABLE
  try {
    return foldAnswer(await catalog.call(face))
  } catch {
    return SCHEDULE_UNAVAILABLE
  }
}

/** Subscribe to `schedule/changed`; returns a disposer that is always callable. */
export function subscribeScheduleChanged(face: ScheduleRemoteFace | undefined, listener: () => void): () => void {
  const on = face?.$on
  if (typeof on !== 'function') return () => { /* nothing to undo */ }
  try {
    const off = on.call(face, 'schedule/changed', listener)
    return typeof off === 'function' ? off : () => { /* the face owns teardown */ }
  } catch {
    return () => { /* a face that cannot subscribe is a face that cannot change */ }
  }
}

/**
 * The next task that will actually fire: active, strictly in the future, soonest
 * first. `null` when there is none — which is a real answer ("no upcoming task"),
 * distinct from the unavailable face (see the module docs).
 */
export function nextActiveEntry(entries: readonly ScheduleEntryInfo[], now: number): ScheduleEntryInfo | null {
  let best: ScheduleEntryInfo | null = null
  for (const entry of entries) {
    if (entry.status !== 'active' || entry.at <= now) continue
    if (best === null || entry.at < best.at) best = entry
  }
  return best
}
