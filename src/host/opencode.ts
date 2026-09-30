/**
 * dsh-widgets — the OpenCode Go usage channel.
 *
 * Two same-origin routes: the single-key proxy the Models settings page's key
 * feeds, and the multi-key proxy that also computes the pooled 共同用量 total.
 * Split out of `src/index.ts` (Phase H2) with both handlers unchanged.
 */
import { type HostContext } from './context'

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const KEY_ENV = 'OPENCODE_GO_API_KEY'

/** Spare pool keys (dsh-multikey-pool convention) appended after the primary. */
const POOL_KEY_ENVS = ['OPENCODE_GO_API_KEY', 'OPENCODE_GO_POOL_2', 'OPENCODE_GO_POOL_3', 'OPENCODE_GO_POOL_4', 'OPENCODE_GO_POOL_5', 'OPENCODE_GO_POOL_6', 'OPENCODE_GO_POOL_7', 'OPENCODE_GO_POOL_8', 'OPENCODE_GO_POOL_9']

/** Register both OpenCode usage routes; returns the disposer `ctx.effect` wants. */
export function registerOpenCodeUsage(ctx: HostContext): () => void {
  // OpenCode usage proxy (unchanged).
  const offUsage = ctx.webServer.register({
    kind: 'exact',
    path: '/api/opencode-usage',
    handler: async (_req, res) => {
      const resolved = await ctx.credentials.resolve(KEY_ENV)
      const key = resolved?.value
      if (key === undefined || key === '') {
        // NOT a 5xx. An unconfigured OPTIONAL key is an expected state, and the
        // old 503 made every client print "Failed to load resource: the server
        // responded with a status of 503" on each refetch — a console full of red
        // for a feature the user never set up (reported 2026-09-30). 200 +
        // `configured: false` lets the client render its own "not set up" state
        // with no console line at all. Clients must treat the flag (and, for one
        // release, a 503 from an older host) as "absent", not as an error.
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ configured: false, error: `${KEY_ENV} is not configured` }))
        return
      }
      try {
        const upstream = await fetch(USAGE_URL, {
          headers: { Authorization: `Bearer ${key}` },
        })
        const text = await upstream.text()
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
        res.end(text)
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  })
  // Multi-key usage proxy: resolves every pooled OpenCode Go key (primary +
  // dsh-multikey-pool spares) and returns each key's usage plus a host-computed
  // 共同用量 total (per-window proportional mean of the available percents).
  const offMulti = ctx.webServer.register({
    kind: 'exact',
    path: '/api/opencode-usage-multi',
    handler: async (_req, res) => {
      const keys: Array<Record<string, unknown>> = []
      for (const ref of POOL_KEY_ENVS) {
        const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
        const key = resolved?.value
        if (key === undefined || key === '') continue
        const entry: Record<string, unknown> = { ref, label: `Key ${keys.length + 1}`, tail: key.slice(-4), data: null }
        try {
          const upstream = await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${key}` } })
          const data = await upstream.json().catch(() => null)
          entry.data = data
        } catch { /* keep data: null */ }
        keys.push(entry)
      }
      // Proportional total: mean percent per window among keys that reported;
      // status/reset follow the most-advanced (highest-percent) member.
      const read = (win: 'rolling' | 'weekly' | 'monthly'): Array<{ percent: number; status?: string; resetsAt?: string }> => {
        const out: Array<{ percent: number; status?: string; resetsAt?: string }> = []
        for (const k of keys) {
          const d = k.data as { usage?: Record<string, { percent?: number; status?: string; resetsAt?: string }> } | null
          const item = d?.usage?.[win]
          if (typeof item?.percent !== 'number') continue
          out.push({ percent: item.percent, status: item.status, resetsAt: item.resetsAt })
        }
        return out
      }
      const total = (() => {
        const build = (win: 'rolling' | 'weekly' | 'monthly'): { status: string; percent: number; resetsAt: string } | undefined => {
          const items = read(win)
          if (items.length === 0) return undefined
          const max = items.reduce((a, b) => (b.percent > a.percent ? b : a))
          return {
            percent: Math.round(items.reduce((a, b) => a + b.percent, 0) / items.length),
            status: max.status ?? 'ok',
            resetsAt: max.resetsAt ?? '',
          }
        }
        const rolling = build('rolling')
        const weekly = build('weekly')
        const monthly = build('monthly')
        if (rolling === undefined && weekly === undefined && monthly === undefined) return null
        return {
          usage: {
            rolling: rolling ?? { status: 'ok', percent: 0, resetsAt: '' },
            weekly: weekly ?? { status: 'ok', percent: 0, resetsAt: '' },
            monthly: monthly ?? { status: 'ok', percent: 0, resetsAt: '' },
          },
        }
      })()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ keys, total }))
    },
  })
  return () => { offUsage(); offMulti() }
}
