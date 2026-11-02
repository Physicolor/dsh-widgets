/**
 * dsh-widgets — the per-TURN cache channel.
 *
 * `/api/widgets-cache-turns?session=<id>`: the WHOLE session's cache hit rate per
 * conversation turn, folded on the host from the live session store.
 *
 * WHY THIS ROUTE EXISTS (owner report, 2026-10-26): the client's transcript is
 * PAGINATED — a session's earlier turns only exist in `useChat().legacy.nodes`
 * after the reader presses 加载更多. A fold over those nodes therefore answers
 * "the cache history of what I scrolled to", and the card silently dropped every
 * turn before the first loaded page (「第 6 轮要点击加载更多他才显示完整折线…应该一开始就
 * 能获取」). The host's `sessions` service holds the session's FULL event log, so one
 * fold here is complete no matter what the client has loaded.
 *
 * The answer is a legitimate `available: false` when the deployment has no
 * `sessions` service or this process does not hold the session (a forked/replayed
 * conversation served by another process) — never a fabricated empty list, so the
 * card can fall back to its own loaded-window fold instead of blanking.
 *
 * Cost: one pass over the session's events, memoized by the log length, so a
 * poll during a long turn re-folds only when that turn appended something.
 */
import { type HostContext, type ReqLike } from './context'

/** The slice of a session event this route reads. */
interface SessionEventLike {
  type?: string
  data?: {
    turn?: unknown
    usage?: Record<string, unknown> | null
  }
}

/** The slice of the `sessions` store this route reads. */
interface SessionStoreLike {
  get?: (id: string) => { events?: ReadonlyArray<SessionEventLike> } | undefined
}

/** One turn's folded reading (the payload's row). */
interface CacheTurnRow {
  turn: number
  rate: number
  cacheRead: number
  prompt: number
  steps: number
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/**
 * Fold a session's `assistant/message` usages into one row per TURN.
 *
 * Bucket semantics match the client's own fold: an event's `usage.inputTokens` is
 * the UNCACHED part (the harness's buckets are disjoint), so the prompt is
 * uncached + cacheRead + cacheWrite and the rate is cacheRead over that sum.
 *
 * @param events - the session's full event log, in seq order.
 * @returns one row per turn, oldest first.
 */
function foldTurns(events: ReadonlyArray<SessionEventLike>): CacheTurnRow[] {
  const order: number[] = []
  const rows = new Map<number, CacheTurnRow>()
  for (const event of events) {
    if (event?.type !== 'assistant/message') continue
    const usage = event.data?.usage
    if (usage === null || usage === undefined) continue
    const prompt = num(usage.inputTokens) + num(usage.cacheReadTokens) + num(usage.cacheWriteTokens)
    if (prompt <= 0) continue
    const turnRaw = event.data?.turn
    const turn = typeof turnRaw === 'number' && Number.isFinite(turnRaw) ? turnRaw : -1
    let row = rows.get(turn)
    if (row === undefined) {
      row = { turn, rate: 0, cacheRead: 0, prompt: 0, steps: 0 }
      rows.set(turn, row)
      order.push(turn)
    }
    row.cacheRead += num(usage.cacheReadTokens)
    row.prompt += prompt
    row.steps += 1
  }
  return order.map((turn) => {
    const row = rows.get(turn)!
    return { ...row, rate: row.prompt > 0 ? Math.min(1, Math.max(0, row.cacheRead / row.prompt)) : 0 }
  })
}

/** Register the per-turn cache route; returns the disposer `ctx.effect` wants. */
export function registerSessionCache(ctx: HostContext): () => void {
  // Memo by session AND log length: the fold is pure, so a re-fold is only needed
  // when the session appended something (a live turn) or the id changed.
  const cache = new Map<string, { size: number; body: string }>()
  return ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-cache-turns',
    handler: (req, res) => {
      let sessionId = ''
      try {
        sessionId = new URL((req as ReqLike | undefined)?.url ?? '', 'http://localhost').searchParams.get('session')?.trim() ?? ''
      } catch {
        sessionId = ''
      }
      const send = (payload: unknown): void => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      }
      if (sessionId.length === 0) {
        send({ available: false, reason: 'session-missing' })
        return
      }
      const store = ctx.get?.('sessions') as SessionStoreLike | undefined
      if (store === undefined || store === null || typeof store.get !== 'function') {
        send({ available: false, reason: 'sessions-unavailable' })
        return
      }
      let events: ReadonlyArray<SessionEventLike>
      try {
        const session = store.get(sessionId)
        events = Array.isArray(session?.events) ? session.events : []
      } catch {
        events = []
      }
      if (events.length === 0) {
        // Not held by this process: an honest miss, not "a session with no usage".
        send({ available: false, reason: 'session-not-loaded' })
        return
      }
      const hit = cache.get(sessionId)
      if (hit !== undefined && hit.size === events.length) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(hit.body)
        return
      }
      const turns = foldTurns(events)
      const body = JSON.stringify({ available: true, source: 'session-store', turns })
      cache.set(sessionId, { size: events.length, body })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(body)
    },
  })
}
