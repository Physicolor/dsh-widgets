/**
 * dsh-widgets — the host route registry.
 *
 * Registration order is the order below. Adding a channel means adding its module
 * and one line here; `src/index.ts` stays a compose-only entry.
 */
import { registerOpenCodeUsage } from './opencode'
import { registerCommandCodeUsage } from './commandcode'
import { registerUsageDaily } from './usage-daily'
import { registerGitHub } from './github'
import { registerWidgetsState } from './state-file'
import { registerSysinfo } from './sysinfo'
import { registerHostOverview } from './overview'
import { type HostContext } from './context'

/** Every host route this plugin owns, in registration order. */
export const HOST_ROUTES: ReadonlyArray<(ctx: HostContext) => () => void> = [
  registerOpenCodeUsage,
  registerCommandCodeUsage,
  registerUsageDaily,
  registerGitHub,
  registerWidgetsState,
  registerSysinfo,
  registerHostOverview,
]
