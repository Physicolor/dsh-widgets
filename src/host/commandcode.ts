/**
 * dsh-widgets — the Command Code account channel.
 *
 * `/api/commandcode-usage`: the four official account endpoints, fetched and
 * timed out independently for EVERY configured pool key, folded into one payload.
 * Split out of `src/index.ts` (Phase H2) with the body builder unchanged.
 */
import { memoTtl, ROUTE_CACHE_MS } from './http'
import { type CredentialsCtx, type HostContext } from './context'

/** Official Command Code account endpoints (recorded in the market entry as
 *  the verified live-account set; all four are account-scope reads). */
const COMMANDCODE_BASE = 'https://api.commandcode.ai/alpha'
const COMMANDCODE_ENDPOINTS = {
  whoami: `${COMMANDCODE_BASE}/whoami`,
  usage: `${COMMANDCODE_BASE}/usage/summary`,
  credits: `${COMMANDCODE_BASE}/billing/credits`,
  subscription: `${COMMANDCODE_BASE}/billing/subscriptions`,
} as const
const COMMANDCODE_KEY_ENV = 'COMMANDCODE_API_KEY'
/** Every Command Code pool key the host aggregates, in display order: the primary
 *  key above, then spares following the credentials-provider naming convention
 *  (…_API_KEY_2 … _4). A ref that resolves to nothing is simply not in the pool. */
const COMMANDCODE_POOL_ENVS = [
  COMMANDCODE_KEY_ENV,
  `${COMMANDCODE_KEY_ENV}_2`,
  `${COMMANDCODE_KEY_ENV}_3`,
  `${COMMANDCODE_KEY_ENV}_4`,
]
/** Per-endpoint fetch timeout (ms) so one slow upstream never stalls the rail. */
const COMMANDCODE_TIMEOUT_MS = 8000
/** One retry for a slice that failed fast (see `fetchSlice`): the pause before
 *  it, and the shorter budget it gets so the worst case stays near the single
 *  timeout above. */
const COMMANDCODE_RETRY_DELAY_MS = 250
const COMMANDCODE_RETRY_TIMEOUT_MS = 4000

/** A route answer that must NOT be cached and that carries its own status. */
class RouteError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`route responded ${status}`)
  }
}

/**
 * Build the `/api/commandcode-usage` body: the four official account endpoints
 * for EVERY configured pool key, aggregated into one same-origin payload.
 *
 *   { ...fourSlices,                        // = the first pool member
 *     keys: [{ ref, label, tail, data }] }  // every member, in pool order
 *
 * The browser never talks to api.commandcode.ai directly. The top-level slices
 * keep their pre-pool shape (the first member), so a single-pool install — and
 * any consumer written before pools existed — reads exactly what it read
 * before. `keys` is what makes the card family switchable; each member's label
 * is the account name from ITS OWN `/alpha/whoami`, so the card subtitle reads
 * the real account (`Physicolor` / `Sparxie`) rather than `Key 2`. The AllUser
 * total is deliberately NOT computed here: the plan -> monthly-allowance table
 * lives in the client (`cc-view`), which is the only side that can size a
 * two-plan allowance correctly.
 *
 * Each endpoint is fetched and timed out independently: one failing endpoint
 * yields null for that slice, one failing KEY yields `data: null` for that
 * member, and the rest still render. A missing pool is a `RouteError` (503) so
 * the memo above never caches it as an answer.
 *
 * @param ctx - host context carrying the credentials seam.
 * @returns the JSON body.
 */
async function buildCommandCodeBody(ctx: CredentialsCtx): Promise<string> {
  // Resolve every configured pool key, in order. A missing spare is normal.
  const pool: Array<{ ref: string; key: string }> = []
  for (const ref of COMMANDCODE_POOL_ENVS) {
    const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
    const key = resolved?.value
    if (key !== undefined && key !== '') pool.push({ ref, key })
  }
  if (pool.length === 0) {
    throw new RouteError(503, JSON.stringify({ error: `${COMMANDCODE_KEY_ENV} is not configured` }))
  }
  // One upstream call, tagged so the caller knows whether a failure is worth
  // another round trip. A 4xx (a revoked key, a plan-less account) is an
  // ANSWER and retrying it only burns the shared rate limit; a timeout, a
  // connection reset, a 5xx or a truncated body is the transient kind.
  const fetchSliceOnce = async (key: string, name: keyof typeof COMMANDCODE_ENDPOINTS, timeoutMs: number): Promise<{ value: unknown; retryable: boolean }> => {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const upstream = await fetch(COMMANDCODE_ENDPOINTS[name], { headers: { Authorization: `Bearer ${key}` }, signal: ctrl.signal })
        const text = await upstream.text()
        if (!upstream.ok) return { value: null, retryable: upstream.status >= 500 || upstream.status === 429 }
        try { return { value: JSON.parse(text), retryable: false } } catch { return { value: null, retryable: true } }
      } finally { clearTimeout(timer) }
    } catch { return { value: null, retryable: true } }
  }
  // A dropped slice used to be final for the whole poll: the browser only
  // re-asks on mount and when a turn settles, so a transient failure left the
  // card family reading a partial pool for the rest of the session (measured
  // 2026-09-20: the 额度管理 card answered 20.2% / `账期 10-20` / `今日推荐
  // 59.9M` where the full payload says 16.6% / `账期 10-10` / 645M). One
  // retry turns that into a blip — but only when the first attempt failed
  // FAST, because a retry after a full timeout would push the whole payload
  // past the rail's patience.
  const fetchSlice = async (key: string, name: keyof typeof COMMANDCODE_ENDPOINTS): Promise<unknown> => {
    const started = Date.now()
    const first = await fetchSliceOnce(key, name, COMMANDCODE_TIMEOUT_MS)
    if (first.value !== null || !first.retryable) return first.value
    if (Date.now() - started > COMMANDCODE_TIMEOUT_MS / 2) return null
    await new Promise((resolve) => setTimeout(resolve, COMMANDCODE_RETRY_DELAY_MS))
    return (await fetchSliceOnce(key, name, COMMANDCODE_RETRY_TIMEOUT_MS)).value
  }
  const readAccount = async (key: string): Promise<Record<string, unknown>> => {
    const [whoami, usage, credits, subscription] = await Promise.all([
      fetchSlice(key, 'whoami'),
      fetchSlice(key, 'usage'),
      fetchSlice(key, 'credits'),
      fetchSlice(key, 'subscription'),
    ])
    return { whoami, usage, credits, subscription }
  }
  const members = await Promise.all(pool.map(async ({ ref, key }) => ({
    ref,
    tail: key.slice(-4),
    data: await readAccount(key),
  })))
  // Switcher labels: the account's own name, else `Key N` when that member's
  // whoami did not answer. A name that repeats (two pools on one account)
  // gets its masked tail appended, so the cycle can never show two
  // indistinguishable entries.
  const used = new Set<string>()
  const keys = members.map(({ ref, tail, data }, i) => {
    const user = (data.whoami as { user?: { name?: unknown; userName?: unknown } } | null)?.user
    const name = typeof user?.name === 'string' && user.name !== '' ? user.name
      : typeof user?.userName === 'string' && user.userName !== '' ? user.userName : ''
    const base = name !== '' ? name : `Key ${i + 1}`
    const label = used.has(base) ? `${base} (${tail})` : base
    used.add(base)
    return { ref, label, tail, data }
  })
  const primary = keys[0]?.data ?? { whoami: null, usage: null, credits: null, subscription: null }
  return JSON.stringify({ ...primary, keys })
}

/** Register the Command Code usage route; returns the disposer `ctx.effect` wants. */
export function registerCommandCodeUsage(ctx: HostContext): () => void {
  // Command Code account usage proxy: aggregates the four official endpoints
  // (whoami / usage summary / billing credits / billing subscriptions) for EVERY
  // configured pool key (COMMANDCODE_API_KEY, …_2 … _4) into ONE same-origin
  // payload:
  //
  //   { ...fourSlices,                        // = the first pool member
  //     keys: [{ ref, label, tail, data }] }  // every member, in pool order
  //
  // The browser never talks to api.commandcode.ai directly. The top-level slices
  // keep their pre-pool shape (the first member), so a single-pool install — and
  // any consumer written before pools existed — reads exactly what it read
  // before. `keys` is what makes the card family switchable; each member's label
  // is the account name from ITS OWN `/alpha/whoami`, so the card subtitle reads
  // the real account (`Physicolor` / `Sparxie`) rather than `Key 2`. The AllUser
  // total is deliberately NOT computed here: the plan -> monthly-allowance table
  // lives in the client (`cc-view`), which is the only side that can size a
  // two-plan allowance correctly.
  //
  // Each endpoint is fetched and timed out independently: one failing endpoint
  // yields null for that slice, one failing KEY yields `data: null` for that
  // member, and the rest still render.
  // The pool payload is the only route here that costs real upstream traffic
  // (four reads per pooled key) and the rail polls it while it is open, so it
  // gets the memo: N tabs — and the client's degraded-payload retry — collapse
  // into one upstream pass per ROUTE_CACHE_MS.
  const commandCodeBody = memoTtl<string>(ROUTE_CACHE_MS)
  const off = ctx.webServer.register({
    kind: 'exact',
    path: '/api/commandcode-usage',
    handler: async (_req, res) => {
      try {
        const body = await commandCodeBody('pool', () => buildCommandCodeBody(ctx))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
      } catch (error) {
        // A missing key is a statement about THIS install, not a payload: the
        // `RouteError` stays out of the memo, so configuring the key recovers on
        // the very next request instead of after a TTL.
        if (error instanceof RouteError) {
          res.writeHead(error.status, { 'Content-Type': 'application/json' })
          res.end(error.body)
          return
        }
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  })
  return off
}
