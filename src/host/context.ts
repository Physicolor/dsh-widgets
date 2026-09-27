/**
 * dsh-widgets — the host half's context contract.
 *
 * The shape the host routes are written against: the web server's route registry,
 * the credentials seam, and the optional Cordis service lookup (`usageCenter`).
 * Extracted from the inline type in `src/index.ts` (Phase H1) so every `host/**`
 * module shares one definition.
 */

/** The response surface the handlers write to (a slice of node's ServerResponse). */
export interface ServerResponseLike {
  writeHead(status: number, headers?: Record<string, string>): unknown
  end(body?: string): unknown
}

/** The request surface the handlers read (only the two fields they use). */
export interface ReqLike {
  method?: string
  url?: string
}

/** The credentials seam this route needs (a slice of the injected context). */
export interface CredentialsCtx {
  credentials: { resolve(ref: string): Promise<{ value: string; source: string } | undefined> }
}

/** The host context `apply` receives. */
export interface HostContext extends CredentialsCtx {
  webServer: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: unknown, res: ServerResponseLike) => void | Promise<void>
    }): () => void
  }
  /** Optional Cordis service lookup — `usageCenter` is read when present. */
  get?: (name: string) => unknown
  effect: (setup: () => () => void) => void
}
