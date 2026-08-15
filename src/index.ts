/**
 * Harness Widgets — host (node) half.
 *
 * Registers one same-origin HTTP route, `/api/opencode-usage`, that proxies
 * the OpenCode Go usage endpoint. The route runs on the Host so the browser
 * never issues a cross-origin request (the OpenCode API requires a Bearer
 * header and does not allow browser CORS). The API key resolves through the
 * credentials seam (`OPENCODE_GO_API_KEY`, the same key the Models settings
 * page configures for the opencode-go provider) and is read per request.
 */

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const KEY_ENV = 'OPENCODE_GO_API_KEY'

/** Required services: the web server (route registration) and the credentials seam (API key). */
export const inject = ['webServer', 'credentials']

/**
 * Host plugin body: register the usage proxy route, owned by this fiber.
 * @param ctx - cordis context carrying the injected `webServer` and `credentials` services.
 */
interface ServerResponseLike {
  writeHead(status: number, headers?: Record<string, string>): unknown
  end(body?: string): unknown
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
}
