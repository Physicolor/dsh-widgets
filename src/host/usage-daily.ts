/**
 * dsh-widgets — the authoritative daily-token channel.
 *
 * `/api/widgets-usage-daily`: re-serves dsh-usage-center's own per-day fold (the
 * heatmap cards' one source of truth), optionally narrowed to one provider and
 * optionally forced to rescan now. Split out of `src/index.ts` (Phase H4).
 */
import { memoTtl, ROUTE_CACHE_MS } from './http'
import { type HostContext, type ReqLike } from './context'

/**
 * The slice of the `usageCenter` service (dsh-usage-center) this plugin reads.
 *
 * The heatmap cards need authoritative per-day token totals, and that plugin
 * already computes them by folding the session logs — so this plugin CONSUMES
 * its result instead of re-deriving it. The lookup is optional by design:
 * dsh-widgets is a standalone, published plugin, so `usageCenter` must never be
 * a hard dependency (see the client's fallback to its own live accounting).
 */
interface UsageCenterLike {
  getActivity?: (provider?: string, model?: string, mode?: string) => {
    activity?: ReadonlyArray<{ date?: unknown; totalTokens?: unknown }>
  } | null
  /** Present on the real service: forces an index rescan now instead of waiting
   *  for its periodic pass. Read through the OPTIONAL seam — dsh-widgets must
   *  keep working where dsh-usage-center is not installed. */
  refresh?: () => Promise<unknown>
}

/** Minimum gap between two on-demand rescans (ms). The card asks for a refresh
 *  when a turn settles; a handful of cards/browsers settling together must not
 *  queue a scan each. */
const REFRESH_THROTTLE_MS = 5000

/**
 * Daily token totals from the optional usage-center service.
 *
 * `provider` narrows the fold to ONE route. This is not cosmetic: the map feeds
 * 「额度管理」's credit→token rate and 今日用量, and the machine-wide map mixes every
 * provider the harness talked to that day into a plan that only bills one of them
 * (measured 2026-09-20: 758M for the day against 474M actually served by Command
 * Code). The mode must be `only` — usage-center's `all`/`merge` modes keep the
 * whole window on purpose and would hand a named route the machine-wide map back.
 *
 * @param ctx - host context.
 * @param provider - provider route to scope to, or undefined for every route.
 * @returns `{ available: false, reason }` when the service is absent, else the
 *   date → tokens map plus the day count the service reported.
 */
function readAuthoritativeDaily(ctx: { get?: (name: string) => unknown }, provider?: string): Record<string, unknown> {
  const service = ctx.get?.('usageCenter') as UsageCenterLike | undefined
  if (service === undefined || service === null || typeof service.getActivity !== 'function') {
    return { available: false, reason: 'usage-center-unavailable' }
  }
  const scoped = typeof provider === 'string' && provider.length > 0
  try {
    const payload = scoped ? service.getActivity(provider, undefined, 'only') : service.getActivity()
    const rows = Array.isArray(payload?.activity) ? payload.activity : []
    const daily: Record<string, number> = {}
    for (const row of rows) {
      const date = typeof row?.date === 'string' ? row.date : null
      const total = typeof row?.totalTokens === 'number' && Number.isFinite(row.totalTokens) ? row.totalTokens : null
      if (date !== null && total !== null) daily[date] = total
    }
    if (Object.keys(daily).length === 0) return { available: false, reason: 'usage-center-empty' }
    return { available: true, source: 'usage-center', ...(scoped ? { provider } : {}), days: rows.length, daily }
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/** Provider route whose traffic 「额度管理」measures: the Command Code pool. Its
 *  account payload (credits, billing period) describes exactly this route, so the
 *  token side must be folded from the same route or the two sides disagree. */
const COMMANDCODE_ROUTE = 'commandcode'

/** Register the daily-token route; returns the disposer `ctx.effect` wants. */
export function registerUsageDaily(ctx: HostContext): () => void {
  // Authoritative daily token totals for the heatmap cards.
  //
  // The heatmap used to be a browser-local accumulator: it credited steps only
  // while a page was open and carried a baked-in history table, so its "window
  // total" drifted far from the real usage (measured 2026-09-12: 7.72G shown vs
  // 6.28G real, +23%). dsh-usage-center already folds the session logs into
  // exact per-day totals, so this route re-serves THAT result — one number, one
  // source of truth. When usage-center is not installed the client falls back to
  // its own live accounting, so the widget still works standalone.
  //
  // `?refresh=1` additionally asks usage-center to fold the logs RIGHT NOW: its
  // periodic pass runs every ~30 s, so a turn that just settled would otherwise
  // keep showing the previous figure. Throttled, and optional throughout — the
  // route still answers the last known map when the service is absent or slow.
  // `?provider=<route>` narrows the map to ONE provider (the 额度管理 card asks for
  // `commandcode`, so its 今日用量 and credit→token rate describe its own plan
  // instead of every provider the machine used that day); absent = machine-wide,
  // which is what the heatmap cards want.
  let lastRefreshAt = 0
  // The day maps are computed from usage-center's index and the PROVIDER-SCOPED
  // variant is genuinely expensive: its filter is a memo key nothing else asks
  // for, so a cold call re-folds the session logs (measured 2026-09-23: 10.6 s
  // and 21.2 s against 34 ms warm). The memo means a burst — several tabs, the
  // retry after a degradation, the two scopes a settling turn asks for — folds
  // ONCE, and `refresh=1` still gets its fresh number.
  const dailyBody = memoTtl<string>(ROUTE_CACHE_MS)
  const off = ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-usage-daily',
    handler: async (req, res) => {
      const url = (req as ReqLike | undefined)?.url ?? ''
      let provider: string | undefined
      try {
        provider = new URL(url, 'http://localhost').searchParams.get('provider')?.trim() || undefined
      } catch { provider = undefined }
      const force = url.includes('refresh=1')
      if (force && Date.now() - lastRefreshAt >= REFRESH_THROTTLE_MS) {
        lastRefreshAt = Date.now()
        const service = ctx.get?.('usageCenter') as UsageCenterLike | undefined
        try {
          await service?.refresh?.()
        } catch { /* a stale number beats no number */ }
      }
      const body = await dailyBody(provider ?? '*', () => JSON.stringify(readAuthoritativeDaily(ctx, provider)), force)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(body)
    },
  })
  return off
}
