/**
 * dsh-widgets — the bridge snapshot contract.
 *
 * Every React entry in this plugin reads ONE immutable object per emit (see
 * `emit` in `client/index.ts`), because `useSyncExternalStore` compares
 * references: a rebuilt object is what tells every subscriber that something
 * moved.
 *
 * The type lives here rather than in `client/index.ts` so that modules the
 * composition root renders — starting with `data/collector.tsx` — can name it
 * without importing back into their own caller (which would be a cycle).
 */

import type { CommandCodeData, GitHubData, SysInfo, UsageData, UsageMulti } from '../lib/contract/types'
import type { Stats } from '../data/session-stats'
import type { Prefs } from './prefs'

/**
 * Everything a React entry reads from the plugin bridge. One immutable object
 * per emit (see `emit`), because `useSyncExternalStore` compares references.
 */
export interface BridgeSnapshot {
  open: boolean
  hasSession: boolean
  stats: Stats | null
  usageData: UsageData | null
  usageMulti: UsageMulti | null
  commandCode: CommandCodeData | null
  commandCodeError: string | null
  usageDaily: Record<string, number> | null
  /** The same daily log RESTRICTED to the `commandcode` route — 「额度管理」's
   *  token side. Separate from `usageDaily` because that one is machine-wide. */
  commandCodeDaily: Record<string, number> | null
  sysinfo: SysInfo | null
  /** GitHub family payload (contribution calendar + repo pulses) from the
   *  host `/api/github` route. */
  github: GitHubData | null
  /** `'unloaded'` when the host route is missing (dsh web not restarted),
   *  otherwise a transport code; `null` once a payload has arrived. */
  githubError: string | null
  prefs: Prefs
  railBudget: number
}

/** The mutable half of the bridge: everything in {@link BridgeSnapshot} that the
 *  collector WRITES through `setState`. Spelled as an Omit so the two can never
 *  drift apart. */
export type BridgeState = Omit<BridgeSnapshot, 'prefs' | 'railBudget'>
