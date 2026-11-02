/**
 * The per-turn cache source: the host's `/api/widgets-cache-turns?session=<id>`
 * route (see `host/session-cache.ts`).
 *
 * WHY THE HOST AND NOT THE NODES (owner report, 2026-10-26): the client transcript
 * is paginated, so a fold over `useChat().legacy.nodes` only covers the pages the
 * reader has loaded — the 缓存趋势 card then showed a partial line until 加载更多.
 * The host holds the session's full event log, so this source is complete from the
 * first answer.
 *
 * `deps` keys on the session id: switching conversations must re-pull at once
 * instead of leaving the previous session's line on screen until the next tick.
 *
 * `available: false` is a legitimate answer (old host without the route, or a
 * session this process does not hold) and is stored as-is — the card then falls
 * back to its own loaded-window fold rather than blanking.
 */
import { defineSource, type SourceEffect } from '../../data/source-contract'
import type { CacheTurns } from '../../lib/contract/types'

export const cacheTurnsSource = defineSource({
  id: 'cache-turns',
  host: 'host/session-cache.ts',
  // The line only changes when the session appends a request: a settle pull is
  // the real trigger, the timer is the backstop for a turn still running.
  schedule: {
    mount: true,
    settle: true,
    pollMs: () => 15_000,
  },
  deps: (tick) => String(tick.state.sessionId ?? ''),
  pulls: (tick) => {
    const sessionId = tick.state.sessionId
    if (typeof sessionId !== 'string' || sessionId.length === 0) return []
    return [{
      url: `/api/widgets-cache-turns?session=${encodeURIComponent(sessionId)}`,
      apply(answer): SourceEffect | null {
        if (!answer.ok || answer.payload === null || typeof answer.payload !== 'object') {
          // A MISSING route (old host / no restart yet) is a real answer, not a
          // transient miss: the card must leave the skeleton and fall back to its
          // own loaded-window fold. Other failures keep the last good line.
          if (answer.status === 404 || answer.status === 0) {
            return { patch: { cacheTurns: { available: false, reason: 'unloaded' } }, resolved: true }
          }
          return null
        }
        return { patch: { cacheTurns: answer.payload as CacheTurns }, resolved: true }
      },
    }]
  },
})

export default cacheTurnsSource
