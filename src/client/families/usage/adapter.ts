/**
 * The OpenCode-Go usage family's data source (`manifest.source: 'usage'`) plus the
 * MACHINE-WIDE per-day token map that the heatmap cards read.
 *
 * Both live here because they are the same account's data read at two
 * granularities, and because the day map has no widget of its own: it is read by
 * every card of the usage AND cc families, which is what `consumerSources` says.
 *
 * Moved out of `data/collector.tsx` (v1.11 adapter contract) with the fetch and
 * fold bodies unchanged.
 */
import { defineSource, type SourceEffect, type SourceTick } from '../../data/source-contract'
import type { UsageData, UsageMulti } from '../../lib/contract/types'

/**
 * OpenCode usage is OPTIONAL, and its single-key route answers 503 while
 * `OPENCODE_GO_API_KEY` is unconfigured — which makes the browser print
 * "Failed to load resource: 503 (Service Unavailable)" on every refetch, a
 * console full of red for a feature the user never set up (reported 2026-09-30).
 *
 * The single-key route is therefore NOT called any more. The pool route is always
 * 200 and already carries every key it resolved, each with its upstream payload
 * under `data` — byte-identical to what the single-key route proxies. So the
 * shared single-key figures are derived from the pool answer, keyed by
 * `ref === 'OPENCODE_GO_API_KEY'`.
 *
 * Note the trap that made a "does any key exist?" check wrong: the pool can hold
 * ONLY spare keys (`OPENCODE_GO_POOL_2`…), in which case the pool answer is
 * non-empty while the primary the other route reads is still absent — and the 503
 * came right back. Match on the ref, not on length.
 */
export const usageSource = defineSource({
  id: 'usage',
  host: 'host/opencode.ts',
  schedule: {
    // Account-wide, but it moves with every finished turn (each conversation
    // draws from the same pool), so: on mount AND whenever a turn settles.
    mount: true,
    settle: true,
  },
  pulls: () => [{
    url: '/api/opencode-usage-multi',
    apply(answer): SourceEffect | null {
      // A non-ok answer or an unparseable body leaves every card on its own "—"
      // (the pre-contract behaviour): no patch, and the skeleton stays up because
      // nothing renderable has arrived yet.
      if (!answer.ok || answer.payload === null || typeof answer.payload !== 'object') return null
      const data = answer.payload as UsageMulti & { keys?: Array<{ ref?: string; data?: UsageData | null }> }
      const keys = Array.isArray(data.keys) ? data.keys : []
      const primary = keys.find((k) => k?.ref === 'OPENCODE_GO_API_KEY')
      const patch: NonNullable<SourceEffect['patch']> = { usageMulti: data }
      if (primary?.data !== undefined && primary.data !== null) patch.usageData = primary.data
      return {
        patch,
        // "Loading" ends when there is something to render — a pool that answered
        // with zero keys is not an answer the cards can draw.
        resolved: primary?.data != null || keys.length > 0,
      }
    },
  }],
})

/**
 * The AUTHORITATIVE machine-wide per-day token totals, served from
 * dsh-usage-center's log fold by the host route. Two scopes exist (`usageDaily`
 * machine-wide here, `commandCodeDaily` in the cc family); this one feeds the
 * heatmap cards and 「额度管理」's token side.
 *
 * `refresh=1` asks the host to fold the logs NOW instead of waiting for
 * usage-center's next ~30 s pass, so the day's figure moves with the turn that
 * just finished. Mount and settle ask for it; the 60 s poll does not (re-folding
 * on a timer would burn seconds of CPU every minute for a figure that can only
 * move when a turn finishes here).
 */
export const usageDailySource = defineSource({
  id: 'usage-daily',
  host: 'host/usage-daily.ts',
  // No widget declares this source: it feeds the usage-* and cc-* cards.
  consumerSources: ['usage', 'cc'],
  schedule: {
    mount: true,
    settle: true,
    pollMs: () => 60_000,
  },
  pulls: (tick: SourceTick) => [{
    url: `/api/widgets-usage-daily${tick.reason === 'poll' ? '' : '?refresh=1'}`,
    apply(answer): SourceEffect | null {
      const payload = answer.ok && answer.payload !== null && typeof answer.payload === 'object'
        ? answer.payload as { available?: boolean; daily?: Record<string, number> }
        : null
      const daily = payload?.available === true && payload.daily !== null && payload.daily !== undefined ? payload.daily : null
      // The machine-wide map is BLANKED on a failed/degraded read (unlike the
      // scoped one in the cc family, which keeps the last good map): a stale
      // machine total would silently disagree with the scoped figure beside it.
      return { patch: { usageDaily: daily }, resolved: daily !== null }
    },
  }],
})

export default usageSource
