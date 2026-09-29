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
/**
 * Slices whose upstream answer is SLOW and whose content barely moves.
 *
 * Measured 2026-09-30 against the live account: `/alpha/billing/credits` answers in
 * ~1 s, while `/alpha/whoami`, `/alpha/usage/summary` and
 * `/alpha/billing/subscriptions` took **14–21 s on six consecutive calls** (a
 * browser-like header set made no difference) — and 3.6–4.2 s twenty minutes later,
 * i.e. that upstream's latency for these three is VARIABLE, which is exactly why one
 * hard 8 s budget could never be right. During the slow window those three were
 * dropped on EVERY poll, and the family degraded exactly as the cards showed it: no
 * monthly window (the month is `allowance − remaining` and the allowance comes from
 * the subscription's plan), `Key N` labels instead of the account names, and 额度预测
 * down to `-%` with 今日推荐 `—`.
 *
 * So the budget is per slice: the SLOW three get a generous one, and they are
 * refreshed OUT OF BAND (see `createSliceStore`) — a card never waits 20 s for them.
 */
const COMMANDCODE_SLOW_TIMEOUT_MS = 30_000
/** How long a route answer may wait for a slice it has NEVER seen. The three slow
 *  slices are only *left behind* after this; their fetch keeps running and lands in
 *  the store, so the next poll carries them. Also what keeps a cold route call
 *  inside the rail's patience (measured: 1 s of credits + this). */
const COMMANDCODE_COLD_WAIT_MS = 1500
/** The pause before the fast slice's one retry, and the shorter budget it gets so
 *  the worst case stays near the single timeout above. */
const COMMANDCODE_RETRY_DELAY_MS = 250
const COMMANDCODE_RETRY_TIMEOUT_MS = 4000
/** Floor between two refresh ATTEMPTS of the same slice after a failure, so a
 *  provider that stays down is retried once a minute rather than once a poll. */
const COMMANDCODE_RETRY_FLOOR_MS = 60_000
/** The floor for a slice we have NEVER answered: the cards are MISSING a number
 *  while it is empty (not showing an old one), and the upstream's answer for these
 *  three is slow but reliable — measured 2026-09-30, 14–21 s and 200 on five of six
 *  runs, one 500 — so an empty slice is re-attempted on this cadence instead of
 *  waiting out the stale-value floor above. */
const COMMANDCODE_EMPTY_RETRY_FLOOR_MS = 15_000

/**
 * One slice's cache policy. `ttlMs` is how long an answer is reused before a
 * background refresh; `timeoutMs` is its own fetch budget; `awaitMs` is how long a
 * ROUTE CALL may wait for a slice that is not in the store yet (0 = never).
 *
 * `credits` is the only slice every card needs and the only fast one, so it is
 * awaited for its whole budget; the slow three are awaited only for the cold wait.
 */
const SLICE_PLAN = {
  credits: { ttlMs: ROUTE_CACHE_MS, timeoutMs: COMMANDCODE_TIMEOUT_MS, awaitMs: COMMANDCODE_TIMEOUT_MS },
  usage: { ttlMs: 5 * 60_000, timeoutMs: COMMANDCODE_SLOW_TIMEOUT_MS, awaitMs: COMMANDCODE_COLD_WAIT_MS },
  subscription: { ttlMs: 10 * 60_000, timeoutMs: COMMANDCODE_SLOW_TIMEOUT_MS, awaitMs: COMMANDCODE_COLD_WAIT_MS },
  whoami: { ttlMs: 60 * 60_000, timeoutMs: COMMANDCODE_SLOW_TIMEOUT_MS, awaitMs: COMMANDCODE_COLD_WAIT_MS },
} as const
type SliceName = keyof typeof SLICE_PLAN
/** The payload's field order, kept as the four-slice object always had it. */
const SLICE_ORDER: SliceName[] = ['whoami', 'usage', 'credits', 'subscription']

/** A route answer that must NOT be cached and that carries its own status. */
class RouteError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`route responded ${status}`)
  }
}

/**
 * One upstream call, tagged so the caller knows whether a failure is worth another
 * round trip. A 4xx (a revoked key, a plan-less account) is an ANSWER and retrying
 * it only burns the shared rate limit; a timeout, a connection reset, a 5xx or a
 * truncated body is the transient kind.
 */
async function fetchSliceOnce(key: string, name: SliceName, timeoutMs: number): Promise<{ value: unknown; retryable: boolean }> {
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

/**
 * One slice, fetched with one retry when the first attempt failed FAST.
 *
 * A dropped slice used to be final for the whole poll: the browser only re-asks on
 * mount and when a turn settles, so a transient failure left the card family reading
 * a partial pool for the rest of the session (measured 2026-09-20: the 额度管理 card
 * answered 20.2% / `账期 10-20` / `今日推荐 59.9M` where the full payload says 16.6%
 * / `账期 10-10` / 645M). One retry turns that into a blip — but only when the first
 * attempt failed FAST, because a retry after a full timeout would double the wait.
 */
async function fetchSlice(key: string, name: SliceName, timeoutMs: number): Promise<unknown> {
  const started = Date.now()
  const first = await fetchSliceOnce(key, name, timeoutMs)
  if (first.value !== null || !first.retryable) return first.value
  if (Date.now() - started > timeoutMs / 2) return null
  await new Promise((resolve) => setTimeout(resolve, COMMANDCODE_RETRY_DELAY_MS))
  return (await fetchSliceOnce(key, name, Math.min(timeoutMs, COMMANDCODE_RETRY_TIMEOUT_MS))).value
}

/** What a slice store hands back to a request: the value we hold RIGHT NOW (which
 *  may be the last good one from an hour ago) and, when its TTL had expired, the
 *  refresh that is now running in the background. */
interface SliceRead {
  value: unknown
  flight: Promise<void> | null
}

/**
 * The per-(member, endpoint) slice store: last good answer + the refresh in flight.
 *
 * This is what makes a slow upstream survivable. Before it, every route call fetched
 * all four endpoints and a slice that missed its budget became `null` for that whole
 * poll — with the live 14–21 s answers (see `COMMANDCODE_SLOW_TIMEOUT_MS`) three of
 * four slices were null on EVERY poll, so the monthly window could never be drawn.
 * Now:
 *   - a fresh slice (younger than its TTL) is handed out untouched — the identity and
 *     the billing period are re-read once an hour / ten minutes, not every 20 s;
 *   - an expired one starts a background refresh and the caller still gets the last
 *     good value immediately;
 *   - a failed refresh KEEPS the last good value (never blanks a slice we know), and
 *     the next attempt waits out `COMMANDCODE_RETRY_FLOOR_MS`.
 */
function createSliceStore(): { read: (key: string, member: string, name: SliceName) => SliceRead; latest: (member: string, name: SliceName) => unknown } {
  const values = new Map<string, { at: number; value: unknown }>()
  const attempts = new Map<string, number>()
  const flights = new Map<string, Promise<void>>()
  const id = (member: string, name: SliceName): string => `${member}|${name}`
  const read = (key: string, member: string, name: SliceName): SliceRead => {
    const plan = SLICE_PLAN[name]
    const idKey = id(member, name)
    const hit = values.get(idKey)
    const fresh = hit !== undefined && Date.now() - hit.at < plan.ttlMs
    let flight: Promise<void> | null = flights.get(idKey) ?? null
    const sinceAttempt = Date.now() - (attempts.get(idKey) ?? 0)
    // An EMPTY slice is a visible hole on the cards, so it is retried on the short
    // floor; a stale-but-present one is only refreshed on the long one.
    const floor = hit === undefined ? COMMANDCODE_EMPTY_RETRY_FLOOR_MS : Math.min(plan.ttlMs, COMMANDCODE_RETRY_FLOOR_MS)
    if (!fresh && flight === null && sinceAttempt >= floor) {
      attempts.set(idKey, Date.now())
      flight = fetchSlice(key, name, plan.timeoutMs).then(
        (value) => { if (value !== null && value !== undefined) values.set(idKey, { at: Date.now(), value }) },
        () => { /* keep the last good answer */ },
      ).finally(() => { flights.delete(idKey) })
      flights.set(idKey, flight)
    }
    return { value: hit?.value ?? null, flight }
  }
  return { read, latest: (member, name) => values.get(id(member, name))?.value ?? null }
}

/** Read one pool member's four slices: the slow ones out of band, credits awaited. */
async function readAccount(key: string, member: string, slices: ReturnType<typeof createSliceStore>): Promise<Record<string, unknown>> {
  const pending = SLICE_ORDER.map((name) => ({ name, ...slices.read(key, member, name) }))
  await Promise.all(pending.map(({ name, flight }) => {
    if (flight === null) return Promise.resolve()
    const budget = SLICE_PLAN[name].awaitMs
    // Wait at most this slice's budget, and stop waiting the moment it answers: a
    // 20 s upstream must never delay a payload that already has everything else.
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, budget)
      void flight.then(() => { clearTimeout(timer); resolve() })
    })
  }))
  const out: Record<string, unknown> = {}
  for (const { name, value } of pending) out[name] = slices.latest(member, name) ?? value
  return out
}

/**
 * Resolve every configured pool key, in order. A missing spare is normal, and a
 * credentials ref that resolves to nothing is simply not a member.
 */
async function resolvePool(ctx: CredentialsCtx): Promise<Array<{ ref: string; key: string }>> {
  const pool: Array<{ ref: string; key: string }> = []
  for (const ref of COMMANDCODE_POOL_ENVS) {
    const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
    const key = resolved?.value
    if (key !== undefined && key !== '') pool.push({ ref, key })
  }
  return pool
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
 * @param slices - the per-member slice store (see `createSliceStore`).
 * @returns the JSON body.
 */
async function buildCommandCodeBody(ctx: CredentialsCtx, slices: ReturnType<typeof createSliceStore>): Promise<string> {
  // Resolve every configured pool key, in order. A missing spare is normal.
  const pool = await resolvePool(ctx)
  if (pool.length === 0) {
    throw new RouteError(503, JSON.stringify({ error: `${COMMANDCODE_KEY_ENV} is not configured` }))
  }
  // The store is keyed by ref AND the key's masked tail, so rotating a key never
  // serves the previous account's slices for the rest of a TTL.
  const members = await Promise.all(pool.map(async ({ ref, key }) => ({
    ref,
    tail: key.slice(-4),
    data: await readAccount(key, `${ref}:${key.slice(-4)}`, slices),
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
  // into one upstream pass per ROUTE_CACHE_MS. The upstream half of that cost is
  // cut further by the slice store, which re-reads the three slow slices on their
  // own TTLs (whoami hourly, the billing period every ten minutes) instead of on
  // every pass.
  const slices = createSliceStore()
  // Warm the slices as soon as the host is up. They take 14–21 s upstream, so a page
  // opened right after a restart used to draw its first payload without them (the
  // month appears on the client's 5 s retry ~25 s later); fetched here, the store is
  // already warm by the time the rail asks. Fire and forget — a failure (or an
  // unready credentials service) just leaves the store empty, which is exactly the
  // pre-warm behaviour.
  void (async () => {
    const pool = await resolvePool(ctx).catch(() => [])
    for (const { ref, key } of pool) {
      const member = `${ref}:${key.slice(-4)}`
      for (const name of SLICE_ORDER) slices.read(key, member, name)
    }
  })()
  const commandCodeBody = memoTtl<string>(ROUTE_CACHE_MS)
  const off = ctx.webServer.register({
    kind: 'exact',
    path: '/api/commandcode-usage',
    handler: async (_req, res) => {
      try {
        const body = await commandCodeBody('pool', () => buildCommandCodeBody(ctx, slices))
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
