/**
 * Harness Widgets — host (node) half.
 *
 * Registers two same-origin HTTP routes:
 *  - `/api/opencode-usage`: proxies the OpenCode Go usage endpoint (the browser
 *    never issues a cross-origin request — the OpenCode API requires a Bearer
 *    header and does not allow browser CORS; the key resolves through the
 *    credentials seam, the same key the Models settings page configures).
 *  - `/api/widgets-state`: GET/PUT the persisted widget-rail state. The state
 *    lives in a JSON file under the profile data dir, so it survives browser
 *    local-storage quirks (private mode, site-data clearing, and the *origin
 *    gap*: `localhost:3080` vs `127.0.0.1:3080` are different browser origins
 *    with separate localStorage — the shared host file is what makes the
 *    configuration follow any browser/address that hits the same DSH service).
 */

import { join, dirname } from 'node:path'
import { homedir, cpus, totalmem, freemem } from 'node:os'
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const KEY_ENV = 'OPENCODE_GO_API_KEY'
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
/** Spare pool keys (dsh-multikey-pool convention) appended after the primary. */
const POOL_KEY_ENVS = ['OPENCODE_GO_API_KEY', 'OPENCODE_GO_POOL_2', 'OPENCODE_GO_POOL_3', 'OPENCODE_GO_POOL_4', 'OPENCODE_GO_POOL_5', 'OPENCODE_GO_POOL_6', 'OPENCODE_GO_POOL_7', 'OPENCODE_GO_POOL_8', 'OPENCODE_GO_POOL_9']
/** Max accepted PUT body (a prefs JSON is a few KB; this is a hard safety cap). */
const MAX_STATE_BYTES = 2 * 1024 * 1024

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

/** Required services: the web server (route registration) and the credentials seam (API key). */
export const inject = ['webServer', 'credentials']

/** Widget-rail state file under the profile data dir (same dir as the patch file). */
function stateFilePath(): string {
  const home = process.env.DSH_HOME
  const base = home !== undefined && home.length > 0 ? home : join(homedir(), '.dsh')
  return join(base, 'profiles', 'web', 'dsh-widgets-state.json')
}

/** Accumulate a Node IncomingMessage body into a JSON value (size-capped). */
async function readJsonBody(req: unknown): Promise<unknown> {
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

/**
 * Host plugin body: register the usage proxy route and the widget-state store,
 * both owned by this fiber.
 * @param ctx - cordis context carrying the injected `webServer` and `credentials` services.
 */
interface ServerResponseLike {
  writeHead(status: number, headers?: Record<string, string>): unknown
  end(body?: string): unknown
}

interface ReqLike {
  method?: string
  url?: string
}

export function apply(ctx: {
  webServer: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: unknown, res: ServerResponseLike) => void | Promise<void>
    }): () => void
  }
  credentials: {
    resolve(ref: string): Promise<{ value: string; source: string } | undefined>
  }
  /** Optional Cordis service lookup — `usageCenter` is read when present. */
  get?: (name: string) => unknown
  effect: (setup: () => () => void) => void
}): void {
  // OpenCode usage proxy (unchanged).
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/opencode-usage',
    handler: async (_req, res) => {
      const resolved = await ctx.credentials.resolve(KEY_ENV)
      const key = resolved?.value
      if (key === undefined || key === '') {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `${KEY_ENV} is not configured` }))
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
  }))

  // Multi-key usage proxy: resolves every pooled OpenCode Go key (primary +
  // dsh-multikey-pool spares) and returns each key's usage plus a host-computed
  // 共同用量 total (per-window proportional mean of the available percents).
  ctx.effect(() => ctx.webServer.register({
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
  }))

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
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/commandcode-usage',
    handler: async (_req, res) => {
      // Resolve every configured pool key, in order. A missing spare is normal.
      const pool: Array<{ ref: string; key: string }> = []
      for (const ref of COMMANDCODE_POOL_ENVS) {
        const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
        const key = resolved?.value
        if (key !== undefined && key !== '') pool.push({ ref, key })
      }
      if (pool.length === 0) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `${COMMANDCODE_KEY_ENV} is not configured` }))
        return
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
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ...primary, keys }))
    },
  }))

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
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-usage-daily',
    handler: async (req, res) => {
      const url = (req as ReqLike | undefined)?.url ?? ''
      let provider: string | undefined
      try {
        provider = new URL(url, 'http://localhost').searchParams.get('provider')?.trim() || undefined
      } catch { provider = undefined }
      if (url.includes('refresh=1') && Date.now() - lastRefreshAt >= REFRESH_THROTTLE_MS) {
        lastRefreshAt = Date.now()
        const service = ctx.get?.('usageCenter') as UsageCenterLike | undefined
        try {
          await service?.refresh?.()
        } catch { /* a stale number beats no number */ }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(readAuthoritativeDaily(ctx, provider)))
    },
  }))

  // Widget-rail state persistence. GET returns `{ savedAt, state }` (no file →
  // `{ savedAt: 0, state: {} }`); PUT stores it atomically (tmp + rename) so a
  // crash mid-write never leaves a truncated JSON the next boot would reject.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-state',
    handler: async (req, res) => {
      const method = (req as ReqLike | undefined)?.method ?? 'GET'
      const file = stateFilePath()
      if (method === 'GET') {
        let body = JSON.stringify({ savedAt: 0, state: {} })
        try {
          const info = await fs.stat(file)
          if (info !== undefined) body = await fs.readFile(file, 'utf8')
        } catch { /* absent or unreadable → default payload above */ }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const data = await readJsonBody(req)
          const text = JSON.stringify(data)
          await fs.mkdir(dirname(file), { recursive: true })
          const tmp = `${file}.tmp`
          await fs.writeFile(tmp, text, 'utf8')
          await fs.rename(tmp, file)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
        return
      }
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'method not allowed' }))
    },
  }))

  // Machine-local hardware snapshot (System widgets): CPU utilization (delta
  // against the PREVIOUS request — the poll window is the averaging window),
  // memory totals, and the NVIDIA GPU via `nvidia-smi` (temp / util / VRAM).
  // The host caches ~1s so several widgets polling at the same instant share
  // one `nvidia-smi` spawn instead of fanning out. CPU temperature stays
  // deliberately ABSENT: Windows exposes no reliable, privilege-free CPU
  // temperature source (see dsh-widgets changelog — researched, abandoned).
  ctx.effect(() => {
    let lastCpu: { idle: number; total: number } | null = null
    let cache: { ts: number; payload: unknown } | null = null
    /** Utilization sample history for the sparklines (newest last). */
    const history: Array<{ t: number; cpu: number | null; gpu: number | null }> = []
    const HISTORY_CAP = 120
    return ctx.webServer.register({
      kind: 'exact',
      path: '/api/sysinfo',
      handler: async (_req, res) => {
        const now = Date.now()
        if (cache !== null && now - cache.ts < 1000) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(cache.payload))
          return
        }
        // CPU utilization: accumulate idle/user/sys over ALL logical cores and
        // diff against the previous request's totals (the poll cadence IS the
        // averaging window). First sample has no baseline → null.
        let idle = 0
        let total = 0
        for (const c of cpus()) {
          idle += c.times.idle
          total += c.times.idle + c.times.user + c.times.nice + c.times.sys + c.times.irq
        }
        let util: number | null = null
        if (lastCpu !== null) {
          const dTotal = total - lastCpu.total
          const dIdle = idle - lastCpu.idle
          if (dTotal > 0) util = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 1000) / 10))
        }
        lastCpu = { idle, total }
        const totalBytes = totalmem()
        const freeBytes = freemem()
        // NVIDIA GPU: single query call; absent/failing driver → gpu: null (the
        // browser cards then degrade to CPU/memory only, never crash).
        let gpu: { name: string; temp: number; util: number; memUsed: number; memTotal: number; memPercent: number } | null = null
        try {
          const out = (await execFileP('nvidia-smi', [
            '--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total',
            '--format=csv,noheader,nounits',
          ], { timeout: 3000, windowsHide: true })) as { stdout: string }
          const stdout = out.stdout
          const line = String(stdout).split(/\r?\n/).map((l: string) => l.trim()).find((l: string) => l.length > 0)
          if (line !== undefined) {
            const parts = line.split(',').map((s: string) => s.trim())
            const memUsed = Number(parts[3])
            const memTotal = Number(parts[4])
            gpu = {
              name: parts[0] ?? '',
              temp: Number(parts[1]),
              util: Number(parts[2]),
              memUsed,
              memTotal,
              memPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0,
            }
          }
        } catch { gpu = null }
        const memUsed = totalBytes - freeBytes
        history.push({ t: now, cpu: util, gpu: gpu?.util ?? null })
        if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP)
        const payload = {
          ts: now,
          cpu: { util },
          mem: {
            used: memUsed,
            total: totalBytes,
            percent: totalBytes > 0 ? Math.round((memUsed / totalBytes) * 1000) / 10 : 0,
          },
          gpu,
          history: {
            ts: history.map((h) => h.t),
            cpu: history.map((h) => h.cpu),
            gpu: history.map((h) => h.gpu),
          },
        }
        cache = { ts: now, payload }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      },
    })
  })
}