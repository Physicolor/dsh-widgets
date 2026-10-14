/**
 * dsh-widgets — the GENERIC source scheduler.
 *
 * One `SourcePoller` per active adapter. It is a component (not a loop inside the
 * collector) because React hooks cannot be counted at runtime: every source keeps
 * its OWN effect, its own dependency signature and its own timer, and its body is
 * the one place the shell interprets an adapter's `schedule`.
 *
 * What the shell does NOT decide: the route, the request shape, the error codes,
 * whether a failed answer means "still loading" or "answered". Those are the
 * adapter's (`data/source-contract.ts`), which is what makes a new data source a
 * single family directory plus a single host module.
 *
 * Two shell-wide rules apply to every source (they were per-source hand-written
 * effects before v1.11):
 *  - a timer never fires on a HIDDEN tab (a background tab has no reader), and
 *    returning to the tab refreshes at once instead of waiting out the interval;
 *  - a tick sets `sources[id]` to `ready` the first time its adapter reports
 *    something renderable, which is what resolves the loading skeleton
 *    (`isSourcePending` in rail/rail-view.tsx).
 */
import * as React from 'react'
import type { BridgeState } from '../runtime/bridge'
import type { Prefs } from '../runtime/prefs'
import type { SourceAdapter, SourceAnswer, SourceEffect, TickReason } from './source-contract'
import { makeTick } from './sources'

/** What the poller needs from the composition root that owns the bridge. */
export interface SourcePollerDeps {
  setState: (patch: Partial<BridgeState>) => void
  getState: () => BridgeState
  getPrefs: () => Prefs
}

/** Props one source's scheduler receives from the collector. */
export interface SourcePollerProps {
  adapter: SourceAdapter
  /** Is a turn running? A true → false edge is the `settle` trigger. */
  running: boolean
  /** Is the rail on screen? Read by `schedule.railOpen`. */
  railOpen: boolean
}

/** Per-source status patch, immutable so the bridge snapshot reference moves. */
function statusPatch(state: BridgeState, id: string): Partial<BridgeState> {
  if (state.sources[id]?.status === 'ready') return {}
  return { sources: { ...state.sources, [id]: { status: 'ready' } } }
}

/** Build the scheduler component bound to one bridge. */
export function createSourcePoller(deps: SourcePollerDeps): (props: SourcePollerProps) => null {
  const { setState, getState, getPrefs } = deps
  return function SourcePoller({ adapter, running, railOpen }: SourcePollerProps): null {
    // The retry timer (one pending per source) and the previous turn state, both
    // refs because they must survive re-renders without re-triggering the effect.
    const retryRef = React.useRef<number | null>(null)
    const prevRunning = React.useRef(running)
    // The live props for callbacks that outlive this render (timers, retries).
    const live = React.useRef({ running, railOpen })
    live.current = { running, railOpen }
    // Read the configuration ONCE per render: an adapter's `deps` and its timer
    // cadence are both functions of the installed set, so both must be able to
    // re-run the effect (a new refresh interval must take effect at once, and a
    // GitHub repo edit must trigger a pull — both did before v1.11).
    const prefs = getPrefs()
    const state = getState()
    const renderTick = makeTick(adapter, 'mount', prefs, state, railOpen, Date.now())
    const depsSig = adapter.deps ? adapter.deps(renderTick) : ''
    const pollSig = String(adapter.schedule.pollMs ? adapter.schedule.pollMs(renderTick) ?? '' : '')
    // Only a source that gates on the rail re-runs when the rail opens/closes;
    // the deps array length must not change between renders, hence the stable
    // `null` for everyone else.
    const railDep = adapter.schedule.railOpen === true ? railOpen : null

    React.useEffect(() => {
      const currentTick = (reason: TickReason) => makeTick(
        adapter,
        reason,
        getPrefs(),
        getState(),
        live.current.railOpen,
        Date.now(),
      )
      /** Fire every pull of this adapter for one tick, in parallel. */
      const tick = (reason: TickReason): void => {
        const pulls = adapter.pulls(currentTick(reason))
        if (pulls.length === 0) return
        let resolved = false
        const applyEffect = (effect: SourceEffect | null): void => {
          if (effect === null) return
          if (effect.patch !== undefined) setState(effect.patch)
          if (effect.resolved === true) resolved = true
          // STALE-WHILE-DEGRADED: one extra look, one pending retry per source
          // (the adapter asks; the shell owns the bookkeeping).
          if (effect.retryInMs !== undefined && retryRef.current === null) {
            retryRef.current = window.setTimeout(() => {
              retryRef.current = null
              tick('poll')
            }, effect.retryInMs)
          }
        }
        for (const pull of pulls) {
          void fetch(pull.url)
            .then(async (res) => {
              const payload: unknown = await res.json().catch(() => null)
              applyEffect(pull.apply({ ok: res.ok, status: res.status, payload }, currentTick(reason)))
            })
            .catch(() => {
              // A transport failure is an ANSWER too (status 0): the adapters that
              // surface it set their own error code, the others keep their last
              // good payload.
              const answer: SourceAnswer = { ok: false, status: 0, payload: null }
              applyEffect(pull.apply(answer, currentTick(reason)))
            })
            .then(() => {
              // Every pull of this tick has settled by now: mark the skeleton
              // resolved if ANY of them produced something renderable (and only
              // once — a `ready` source is not re-emitted on every poll).
              if (!resolved) return
              const patch = statusPatch(getState(), adapter.id)
              if (Object.keys(patch).length > 0) setState(patch)
            })
        }
      }

      // A true → false edge is a settled turn; anything else (mount, a config
      // edit, the rail opening) is a `mount`-style pull.
      const settled = prevRunning.current && !running
      prevRunning.current = running
      const schedule = adapter.schedule
      const allowed = schedule.railOpen !== true || live.current.railOpen
      if (allowed && (settled ? schedule.settle === true : schedule.mount !== false)) {
        tick(settled ? 'settle' : 'mount')
      }

      let timer: number | null = null
      const ms = allowed && schedule.pollMs ? schedule.pollMs(currentTick('poll')) : null
      if (ms !== null && ms !== undefined && ms > 0) {
        timer = window.setInterval(() => {
          if (!document.hidden) tick('poll')
        }, ms)
      }
      // Coming back to the tab refreshes at once instead of waiting out the
      // interval — the reason a hidden tab may safely stop polling.
      const onVisible = (): void => {
        if (!document.hidden && allowed) tick('poll')
      }
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        if (timer !== null) window.clearInterval(timer)
        if (retryRef.current !== null) { window.clearTimeout(retryRef.current); retryRef.current = null }
        document.removeEventListener('visibilitychange', onVisible)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- the signatures ARE
      // the dependency list: prefs/state are read live inside the effect.
    }, [adapter, depsSig, pollSig, running, railDep])
    return null
  }
}
