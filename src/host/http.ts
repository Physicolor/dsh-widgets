/**
 * dsh-widgets — the shared host HTTP plumbing.
 *
 * `memoTtl` (the per-key TTL + single-flight cache the channels share),
 * `readJsonBody` (the size-capped request body reader) and the two policy
 * constants they are written against. Split out of `src/index.ts` (Phase H1).
 */

/** Max accepted PUT body (a prefs JSON is a few KB; this is a hard safety cap). */
const MAX_STATE_BYTES = 2 * 1024 * 1024
/** How long a JSON route body may be re-served without recomputing it.
 *
 *  The rail is allowed to poll (a Command Code window moves while the reader
 *  watches), and a reader may keep several tabs open, so without a cache every
 *  tab buys its own round of upstream calls and its own log fold. 20 s is short
 *  enough that no client sees a stale number it could have acted on, and long
 *  enough to collapse a burst — including the degraded-payload retry — into one
 *  upstream pass. Errors are never cached. */
export const ROUTE_CACHE_MS = 20_000

/**
 * Per-key TTL + single-flight memo for a route body.
 *
 * `force` (the `?refresh=1` path) skips the TTL but still JOINS an in-flight
 * computation, so two tabs asking at the same instant still produce one fold.
 * A rejected computation is never stored.
 *
 * @param ttlMs - how long a stored value stays fresh.
 * @returns a reader that computes on miss and shares one promise on a burst.
 */
export function memoTtl<T>(ttlMs: number): (key: string, compute: () => Promise<T> | T, force?: boolean) => Promise<T> {
  const values = new Map<string, { at: number; value: T }>()
  const inflight = new Map<string, Promise<T>>()
  return (key, compute, force = false) => {
    const hit = values.get(key)
    if (!force && hit !== undefined && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value)
    const pending = inflight.get(key)
    if (pending !== undefined) return pending
    const next = Promise.resolve().then(compute).then(
      (value) => { values.set(key, { at: Date.now(), value }); inflight.delete(key); return value },
      (error) => { inflight.delete(key); throw error },
    )
    inflight.set(key, next)
    return next
  }
}

/** Accumulate a Node IncomingMessage body into a JSON value (size-capped). */
export async function readJsonBody(req: unknown): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<unknown>) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buf.length
    if (size > MAX_STATE_BYTES) throw new Error('state payload too large')
    chunks.push(buf)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}
