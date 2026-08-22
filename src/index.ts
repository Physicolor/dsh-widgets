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
import { homedir } from 'node:os'
import { promises as fs } from 'node:fs'

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const KEY_ENV = 'OPENCODE_GO_API_KEY'
/** Max accepted PUT body (a prefs JSON is a few KB; this is a hard safety cap). */
const MAX_STATE_BYTES = 2 * 1024 * 1024

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
}