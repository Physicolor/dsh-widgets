/**
 * The Command Code family's data sources: the account payload
 * (`manifest.source: 'cc'`) and the `commandcode`-SCOPED daily token map that
 * 「额度管理」 reads.
 *
 * Moved out of `data/collector.tsx` (v1.11 adapter contract) with the fetch,
 * error-code and degraded-retry bodies unchanged — including the two rules the
 * pre-contract comments spell out at length:
 *
 *  - STALE-WHILE-ERROR: a failed poll records the error code and KEEPS the last
 *    good payload. A blip must not blank a card that was already showing a
 *    number; `-` means "this account has no such figure", and a blip is not that.
 *  - STALE-WHILE-DEGRADED: a 200 with a `null` slice (one upstream call dropped)
 *    is not a complete answer. `monthlyWindow` returns null on purpose when a
 *    member's slices are missing — a partial sum would read LOW — so a degraded
 *    reply never REPLACES a complete one, and schedules one extra look 5 s out
 *    (measured 2026-09-23: one poll in three answered exactly that way).
 */
import { defineSource, type SourceEffect, type SourceTick } from '../../data/source-contract'
import { ccPayloadDegraded } from './data'
import type { CommandCodeData } from '../../lib/contract/types'

/** The scoped daily map's payload shape (host/usage-daily.ts). */
interface DailyPayload { available?: boolean; daily?: Record<string, number> }

/** Account payload (`whoami` / summary / credits / plan). */
export const ccSource = defineSource({
  id: 'cc',
  host: 'host/commandcode.ts',
  schedule: {
    mount: true,
    settle: true,
    /**
     * Command Code windows DRIFT while this page sits idle: the 5h / weekly /
     * monthly windows are ACCOUNT-wide, so another client spending against the
     * same pool moves them with no turn HERE to hang a refetch on (reported
     * 2026-09-23 as 今日用量 / 今日推荐 stuck on `-`).
     *
     * Cost control (measured 2026-09-23): ONE tick is four upstream reads per
     * pooled key — 8 reads, 1.6 s, 4.7 KB on this two-key pool — and it is the
     * only upstream traffic this rail generates at all. So: only while the rail
     * is ON SCREEN and a Command Code card is installed; never while the tab is
     * HIDDEN (a background tab has no reader); and 60 s, not 30 s — these are
     * $14–$70 subscription windows, and nobody can act on a 30 s difference.
     */
    railOpen: true,
    pollMs: (tick: SourceTick) => tick.railOpen ? 60_000 : null,
  },
  pulls: () => [{
    url: '/api/commandcode-usage',
    apply(answer, tick): SourceEffect | null {
      // The key itself is auto-read host-side (env → .credentials.yaml → .env),
      // never user-entered in this UI. A 404 means the HOST ROUTE is absent (dsh
      // web not restarted) and a 503 means no key was found: each produces a
      // stable code the cards render as an accurate hint.
      if (answer.status === 0) return { patch: { commandCodeError: 'unavailable' }, resolved: true }
      if (!answer.ok) {
        const apiError = answer.payload !== null && typeof answer.payload === 'object'
          ? (answer.payload as { error?: string }).error
          : undefined
        const error = answer.status === 404
          ? 'unloaded'
          : answer.status === 503
            ? 'unconfigured'
            : (apiError !== undefined ? `http:${answer.status}:${apiError}` : `http:${answer.status}`)
        return { patch: { commandCodeError: error }, resolved: true }
      }
      const next = answer.payload as CommandCodeData | null
      if (next === null || typeof next !== 'object') return null
      if (ccPayloadDegraded(next)) {
        const effect: SourceEffect = { retryInMs: 5_000, resolved: true }
        // A degraded reply never replaces a COMPLETE one; the retry above still
        // fires (one pending look at a time — the scheduler owns that bookkeeping).
        const current = tick.state.commandCode
        if (current !== null && !ccPayloadDegraded(current)) return effect
        effect.patch = { commandCode: next, commandCodeError: null }
        return effect
      }
      return { patch: { commandCode: next, commandCodeError: null }, resolved: true }
    },
  }],
})

/**
 * The `commandcode`-SCOPED day map — 「额度管理」's token side. Its credits and
 * billing period describe that ONE plan, so a machine-wide figure would charge it
 * for every other provider the harness used that day (see the usage family's
 * machine-wide map).
 *
 * Deliberately NOT on a timer: the scoped filter is a memo key nothing else asks
 * for, so a cold call re-folds the session logs — 10.6 s and 21.2 s observed
 * against 34 ms warm — and a 60 s poll of it would burn seconds of CPU every
 * minute. It runs on the turn-settle path and on mount, never in a poll loop.
 */
export const ccDailySource = defineSource({
  id: 'cc-daily',
  host: 'host/usage-daily.ts',
  // No widget declares this source; it is read by the cc family's 额度管理.
  consumerSources: ['cc'],
  schedule: {
    mount: true,
    settle: true,
  },
  pulls: (tick: SourceTick) => [{
    url: `/api/widgets-usage-daily?provider=commandcode${tick.reason === 'poll' ? '' : '&refresh=1'}`,
    apply(answer): SourceEffect | null {
      const payload = answer.ok && answer.payload !== null && typeof answer.payload === 'object'
        ? answer.payload as DailyPayload
        : null
      const daily = payload?.available === true && payload.daily !== null && payload.daily !== undefined ? payload.daily : null
      // Stale-while-error, the same rule as the account payload: `available: false`
      // (usage-center mid-rescan, host just restarted, service absent) leaves the
      // last good map in place. Blanking it would print `-` for the 今日用量 of a
      // plan that plainly HAS a figure — the exact symptom (reported 2026-09-23)
      // this scoped map was wired up to fix.
      if (daily === null) return { resolved: true }
      return { patch: { commandCodeDaily: daily }, resolved: true }
    },
  }],
})

export default ccSource
