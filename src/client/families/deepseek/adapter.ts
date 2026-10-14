/**
 * The DeepSeek balance family's data source (`manifest.source: 'deepseek'`).
 *
 * ONE request for the whole family, and the family is one card: the official
 * platform balance (`/api/deepseek-balance`, see `src/host/deepseek.ts`).
 *
 * CADENCE — 5 minutes, and NOT gated on the rail being open. The gate exists for
 * sources whose numbers only matter while somebody is looking at them (the
 * Command Code windows). This one is different in kind: `spentToday` is measured
 * by SAMPLING the balance, so a poll that does not happen is a spend nobody
 * counted. Five minutes costs 288 upstream reads a day and still resolves a
 * conversation's burn to within one interval.
 *
 * The card's skeleton is resolved by the FIRST answer including every error
 * answer: "no key" and "the key was rejected" are states the user can act on,
 * and an eternal placeholder would hide exactly the sentence that says what to do.
 *
 * Moved nowhere — this family is new, so this file is its first version (the
 * v1.11 adapter contract is what makes it a family directory plus one host
 * module, with no shared file edited).
 */
import { defineSource, type SourceEffect } from '../../data/source-contract'
import type { DeepSeekBalance } from '../../lib/contract/types'

export const deepseekSource = defineSource({
  id: 'deepseek',
  host: 'host/deepseek.ts',
  schedule: {
    mount: true,
    // No `settle`: a turn ending does not move an account balance. The timer is
    // the whole schedule, and it deliberately does NOT wait for the rail (see the
    // header): the day's spend is a measurement of this host's sampling.
    pollMs: () => 300_000,
  },
  pulls: () => [{
    url: '/api/deepseek-balance',
    apply(answer): SourceEffect | null {
      if (answer.status === 0) return { patch: { deepseekBalanceError: 'unavailable' }, resolved: true }
      if (!answer.ok) {
        // The host's own code is preferred when it named one ('unauthorized' /
        // 'timeout' / 'no-balance'), because it distinguishes "the key was
        // rejected" from "the network was down" — two sentences the card must
        // not collapse into one.
        const said = answer.payload !== null && typeof answer.payload === 'object'
          ? (answer.payload as { error?: unknown }).error
          : undefined
        const error = answer.status === 404
          // 404 = the HOST ROUTE is absent (`dsh web` was not restarted).
          ? 'unloaded'
          : answer.status === 503
            ? 'unconfigured'
            : typeof said === 'string' && said !== ''
              ? said
              : `http:${answer.status}`
        return { patch: { deepseekBalanceError: error }, resolved: true }
      }
      const next = answer.payload as DeepSeekBalance | null
      if (next === null || typeof next !== 'object' || next.available !== true) return null
      // STALE-WHILE-ERROR, the same rule every other channel keeps: a failed poll
      // records the code and KEEPS the last good balance. A blip must never blank
      // a number the user was reading.
      return { patch: { deepseekBalance: next, deepseekBalanceError: null }, resolved: true }
    },
  }],
})

export default deepseekSource
