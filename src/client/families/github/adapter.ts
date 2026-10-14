/**
 * The GitHub family's data source (`manifest.source: 'github'`).
 *
 * ONE request for every installed github-* card. The cards' own config fields
 * decide the request — `user` (whose calendar) and `repos` (which pulses). Both
 * empty means "whoever this machine is signed in as": the HOST resolves the login
 * from the credential / `gh` CLI, which is what makes the family work on a fresh
 * install with nothing typed. Several installed cards are ONE upstream pass: the
 * logins and repo lists are merged in `deps`/`pulls` below, so two cards never buy
 * two rounds.
 *
 * Cadence: on mount, whenever the merged request changes (a config edit re-runs
 * the tick), every 10 minutes, and on return to the tab. Nothing here hangs off a
 * turn — GitHub does not move when this conversation does.
 *
 * Moved out of `data/collector.tsx` (v1.11 adapter contract) with the request
 * builder and the error mapping unchanged.
 */
import { defineSource, type SourceEffect, type SourceTick } from '../../data/source-contract'
import type { GitHubData } from '../../lib/contract/types'

/** One config value as a trimmed string. */
function cfg(tick: SourceTick, key: string, field: string): string {
  const v = tick.config(key)[field]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * The merged request: whose calendar, which repo pulses, and whether the review
 * queue is wanted.
 *
 * The review queue is only fetched when a card that shows it is installed: it is
 * an authenticated-only call, and asking for it costs an upstream round trip
 * (cheap on a 304, but still a round trip).
 */
function buildRequest(tick: SourceTick): { query: string; deps: string } {
  const user = tick.instances.map((key) => cfg(tick, key, 'user')).find((s) => s !== '') ?? ''
  const repos = Array.from(new Set(tick.instances.flatMap((key) => cfg(tick, key, 'repos')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s)))))
    .slice(0, 4)
  const notify = tick.instances.some((key) => key === 'github-notify' || key.startsWith('github-notify@'))
  const params = new URLSearchParams()
  if (user !== '') params.set('user', user)
  if (repos.length > 0) params.set('repos', repos.join(','))
  if (notify) params.set('notif', '1')
  const query = params.toString()
  // Whether any card shows the review queue is part of the effect's identity:
  // installing 待我处理 must make the NEXT pull ask for `notif=1`, not wait for
  // some other config edit.
  return { query, deps: `${user}|${repos.join(',')}|${tick.instances.length}|${notify}` }
}

export const githubSource = defineSource({
  id: 'github',
  host: 'host/github.ts',
  schedule: {
    mount: true,
    pollMs: () => 600_000,
  },
  deps: (tick) => buildRequest(tick).deps,
  pulls: (tick) => {
    const { query } = buildRequest(tick)
    return [{
      url: `/api/github${query === '' ? '' : `?${query}`}`,
      apply(answer): SourceEffect | null {
        if (answer.status === 0) return { patch: { githubError: 'unavailable' }, resolved: true }
        if (!answer.ok) {
          // 404 means the HOST ROUTE is absent — `dsh web` was not restarted —
          // which the cards say in words instead of pretending to load.
          return { patch: { githubError: answer.status === 404 ? 'unloaded' : `http:${answer.status}` }, resolved: true }
        }
        // GitHub answers `errors` for the slices it could not fill, so a 200 with
        // an empty calendar is an ANSWER (the card prints why). Only the bits it
        // did fill are rendered; the payload is passed through as-is.
        return { patch: { github: answer.payload as GitHubData, githubError: null }, resolved: true }
      },
    }]
  },
})

export default githubSource
