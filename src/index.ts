/**
 * Harness Widgets — host (node) half.
 *
 * Composes the same-origin routes the widget rail reads. The browser never talks
 * to an upstream provider directly: every key stays on this side of the wire.
 *
 *   /api/opencode-usage        OpenCode Go usage (single key)
 *   /api/opencode-usage-multi  every pooled key + the 共同用量 total
 *   /api/commandcode-usage     Command Code account slices, per pool key
 *   /api/widgets-usage-daily   authoritative per-day token totals (usage-center)
 *   /api/github                contribution calendar + repo pulse
 *   /api/widgets-state         GET/PUT the persisted rail configuration
 *   /api/sysinfo               CPU / memory / NVIDIA snapshot
 *
 * One module per channel lives in `host/`; this file only composes them (see
 * `host/routes.ts`). Split out of the single-file host in Phase H.
 */
import { HOST_ROUTES } from './host/routes'
import { type HostContext } from './host/context'

/** Required services: the web server (route registration) and the credentials seam (API key). */
export const inject = ['webServer', 'credentials']

/**
 * Host plugin body: register every route this fiber owns.
 * @param ctx - cordis context carrying the injected `webServer` and `credentials` services.
 */
export function apply(ctx: HostContext): void {
  for (const register of HOST_ROUTES) ctx.effect(() => register(ctx))
}
