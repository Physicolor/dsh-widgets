/**
 * dsh-widgets — the data collector.
 *
 * Renders in the `conversation.composer.dock` slot (so the shell mounts it while a
 * session exists) and folds three kinds of input into the bridge:
 *   1. the live conversation projection (session stats + the 轨迹 beats);
 *   2. five host routes — OpenCode usage, Command Code usage, the two daily token
 *      maps, GitHub, and the hardware snapshot;
 *   3. the installs WITHOUT dsh-usage-center, whose heatmap is self-accounted here
 *      and persisted across mounts.
 *
 * Moved out of `client/index.ts` (Phase 2.5) with its body unchanged. It receives
 * the bridge handles instead of closing over them: `useBridge` / `setState` are
 * stable, while `state` and `prefs` are LIVE bindings, so those two arrive as
 * getters and are read at the point of use.
 */

import * as React from 'react'
import { WIDGET_RUNTIME } from '../generated.registry'
import { parseInstanceKey } from '../lib/contract/helpers'
import type { CommandCodeData, GitHubData, HostOverview, PriceTable, SysInfo, UsageData, UsageMulti } from '../lib/contract/types'
import { DEFAULT_TZ, accumulateHeatmap, buildHeatmapGrid, dateKey, loadHeatmapAnchor, loadHeatmapStore, loadSeen, mergeToday, saveHeatmapAnchor, saveSeen } from '../lib/heatmap-accounting'
import { ccPayloadDegraded } from '../families/cc/data'
import { ingestSysInfo, resolveInterval } from '../families/sys/data'
import { type Stats, deriveCompaction, deriveStats, deriveTools, deriveTrajectory, normalizeGoal, normalizeJobs, normalizeModelSelection, normalizePermissions, normalizeSubagents } from './session-stats'
import { type BridgeSnapshot, type BridgeState } from '../runtime/bridge'
import { type Prefs } from '../runtime/prefs'

/** What the collector needs from the composition root that owns the bridge. */
export interface CollectorDeps {
  /** Subscribe to the bridge (re-renders this collector on every emit). */
  useBridge: () => BridgeSnapshot
  /** Merge a patch into the live state, then emit. */
  setState: (patch: Partial<BridgeState>) => void
  /** The LIVE state binding — call it at the point of use, never capture it. */
  getState: () => BridgeState
  /** The LIVE prefs binding, for the same reason. */
  getPrefs: () => Prefs
}

/** Build the collector component bound to one bridge. */
export function createCollector(deps: CollectorDeps): (props: any) => null {
  const { useBridge, setState } = deps
  return ({ useSession, useProjection, useChat, useSessions }: any): null => {
      // DSH 0.1.5 split the session snapshot: chat data (nodes, timeline and
      // running tool calls) moved to the new `useChat` hook while `useSession`
      // now carries lifecycle state only. Read whichever half the running build
      // provides —the selectors are optional-chained so a slice that no longer
      // exists resolves to undefined instead of throwing inside the selector,
      // which the slot renderer would answer by abdicating this entry (taking
      // the whole collector, and therefore every card's data, with it).
      const settled = (useChat
        ? useChat((c: any) => c.legacy?.nodes)
        : useSession((s: any) => s.chat?.legacy?.nodes)) ?? []
      const timeline = (useChat
        ? useChat((c: any) => c.timeline)
        : useSession((s: any) => s.chat?.timeline)) ?? undefined
      const runningCalls = (useChat
        ? useChat((c: any) => c.legacy?.runningCalls)
        : useSession((s: any) => s.runningCalls)) ?? []
      const running = useSession ? useSession((s: any) => s.running) : false
      const projected = useProjection ? useProjection('sessionStats') : undefined
      const usage = useProjection ? useProjection('tokenUsage') : undefined
      const contextPres = useProjection ? useProjection('contextPressure') : undefined
      const contextBrk = useProjection ? useProjection('contextBreakdown') : undefined
      const todosProj = useProjection ? useProjection('todos') : undefined
      // Session-shape projections: WHICH model/preset this session runs, whether
      // a goal is driving it, what it is allowed to do, and what children it has
      // spawned. Each is read defensively — a deployment that composes none of
      // them hands back undefined, and the cards built on them then render
      // nothing instead of a fabricated value (see the normalizers in
      // session-stats.ts: unknown members are dropped, never passed through).
      const modelSelProj = useProjection ? useProjection('modelSelection') : undefined
      const agentPresetProj = useProjection ? useProjection('agentPreset') : undefined
      const goalProj = useProjection ? useProjection('goal') : undefined
      const permsProj = useProjection ? useProjection('permissions') : undefined
      const subagentProj = useProjection ? useProjection('subagentCatalog') : undefined
      // The session LIST mirror: background jobs and the per-child timing the
      // parent cannot see through its own projections (see normalizeSubagents).
      // `useSessions` is provided at the slot ROOT by dsh-client-ui-session, so
      // every slot component receives it. Both selectors return store-held
      // references — never a freshly built object, which would re-render for ever.
      const jobsBySession = useSessions ? useSessions((s: any) => s?.jobsBySession) : undefined
      const sessionsById = useSessions ? useSessions((s: any) => s?.byId) : undefined
      // The session's own id: the client snapshot names it `sessionId` (verified
      // against a live GUI, 2026-09-29 — reading `id` silently yielded undefined
      // and the 后台作业 card never appeared). `id` stays as the fallback for a
      // snapshot shape that carries it instead.
      const sessionId = useSession ? useSession((s: any) => s?.sessionId ?? s?.id) : undefined
      // Bridge subscription: the sysinfo poll cadence depends on per-instance
      // refresh-interval config, so this collector re-renders on prefs changes
      // (emit) exactly like the capsule/rail bridges do.
      const snap = useBridge()
      // Heatmap FALLBACK accounting: kept for installs without dsh-usage-center.
      // Per-step crediting (v2) credits each assistant step once by its own start
      // time, with a cumulative-anchor fallback (v1) when nodes lack `usage`.
      // Persisted across mounts; skipped entirely whenever the authoritative
      // host map (`snap.usageDaily`) is present.
      const heatmapRef = React.useRef<Record<string, number>>(loadHeatmapStore())
      const anchorRef = React.useRef<number>(loadHeatmapAnchor())
      const [heatmap, setHeatmap] = React.useState<Record<string, number>>(heatmapRef.current)
      // Presence signal: this dock slot renders only while an active session is
      // mounted (the shell drops it on the Hero/no-session state), so mount/
      // unmount is exactly "an active session exists". The rail and the body
      // padding shift key off this so they never linger on a fresh-session page.
      React.useEffect(() => {
        setState({ hasSession: true })
        return () => { setState({ hasSession: false }) }
      }, [])
      // OpenCode usage is account-wide but changes with every finished turn
      // (each conversation draws from the same pool), so the collector pulls it
      // on mount AND whenever a turn settles (`running` flips true −false).
      // The `conversation.composer.dock` component is reused across sessions, so
      // a mount-only fetch leaves the quota stale until a reload/new session.
      // ---- Live pulls, shared by the turn-settle refresh and the slow polls ----
      // Command Code account usage (whoami / summary / credits / plan).
      // Error-aware: a 404 host route (dsh web not restarted) vs a 503 missing-key
      // vs a network failure each produce a stable code the widgets render as
      // an accurate hint - the key itself is auto-read host-side (env -
      // .credentials.yaml -.env), never user-entered in this UI.
      // Self-reference for the degraded-payload retry below: a useCallback body
      // may not name its own const in the initializer, so the timer calls through
      // this ref (reassigned on every render, so it is never stale).
      const ccPullRef = React.useRef<() => void>(() => {})
      const ccRetryPending = React.useRef(false)
      const pullCommandCode = React.useCallback((): void => {
        fetch('/api/commandcode-usage')
          .then(async (r) => {
            const data = (await r.json().catch(() => null)) as CommandCodeData | { error?: string } | null
            if (!r.ok) {
              // STALE-WHILE-ERROR: the error code is recorded, the last good
              // payload is KEPT. A poll that fails must not blank a card that was
              // already showing a number — `-` means "this account has no such
              // figure", and a blip is not that. The skeleton still resolves on a
              // first-load failure (commandCode is still null there).
              const error = (data as { error?: string } | null)?.error
              if (r.status === 404) setState({ commandCodeError: 'unloaded' })
              else if (r.status === 503) setState({ commandCodeError: 'unconfigured' })
              else setState({ commandCodeError: error ? `http:${r.status}:${error}` : `http:${r.status}` })
              return
            }
            const next = data as CommandCodeData
            // STALE-WHILE-DEGRADED. A 200 with a `null` slice (one upstream call
            // dropped) is NOT a complete answer, and it is not harmless either:
            // `monthlyWindow` returns null on purpose when a member's slices are
            // missing — a partial sum would read LOW — so the monthly ring vanished
            // and 「额度管理」 fell to `-%` until the next settle. Measured
            // 2026-09-23: one poll in three answered exactly that way, and because
            // the old collector only re-asked on mount/turn-settle, the degraded
            // payload stayed on screen for the rest of the session. So: a degraded
            // reply never REPLACES a complete one, it schedules one extra look 5 s
            // out, and the 30 s poll covers a provider that stays down.
            //
            // The retry also fires when there is NO complete payload yet (2026-09-30):
            // the host answers a cold call with the fast `credits` slice while the
            // three slow ones are still in flight (they take 14–21 s upstream), so a
            // fresh page load's FIRST answer is partial by design and the month would
            // otherwise wait for the 30 s poll. One pending timer at a time, and each
            // look is a cache read host-side while the slices are in flight — not an
            // upstream call.
            if (ccPayloadDegraded(next)) {
              if (!ccRetryPending.current) {
                ccRetryPending.current = true
                window.setTimeout(() => { ccRetryPending.current = false; ccPullRef.current() }, 5000)
              }
              if (deps.getState().commandCode !== null && !ccPayloadDegraded(deps.getState().commandCode)) return
            }
            setState({ commandCode: next, commandCodeError: null })
          })
          .catch(() => setState({ commandCodeError: 'unavailable' }))
      }, [])
      ccPullRef.current = pullCommandCode
      // Authoritative per-day token totals, in TWO scopes: the heatmap cards read
      // the machine-wide map, 「额度管理」 reads the `commandcode`-scoped one (its
      // credits and billing period describe that ONE plan, so a machine-wide
      // figure charges it for every other provider the harness used that day).
      // Both are dsh-usage-center's log fold re-served by the host route;
      // `available: false` (missing service, empty index, dsh web not restarted)
      // leaves the cards on their own live accounting. `refreshNow` (the
      // turn-settle path) asks the host to fold the logs immediately instead of
      // waiting for usage-center's next ~30 s pass, so the day's figure moves
      // with the turn that just finished.
      // The MACHINE-WIDE day map only. Cheap: it is the same map dsh-usage-center
      // folds for its own heatmap, so it is normally warm (~30 ms measured). It
      // feeds the heatmap cards; `refreshNow` is the turn-settle path, which asks
      // the host to fold the logs now instead of waiting for its next ~30 s pass.
      const pullUsageDaily = React.useCallback((refreshNow: boolean): void => {
        fetch(`/api/widgets-usage-daily${refreshNow ? '?refresh=1' : ''}`)
          .then(async (r) => (r.ok ? await r.json().catch(() => null) : null))
          .then((data: { available?: boolean; daily?: Record<string, number> } | null) => {
            setState({ usageDaily: data?.available === true && data.daily !== null && data.daily !== undefined ? data.daily : null })
          })
          .catch(() => { /* keep the last authoritative map (or the fallback) */ })
      }, [])
      // The `commandcode`-SCOPED day map — 「额度管理」's token side (its credits and
      // billing period describe that ONE plan, so a machine-wide figure would
      // charge it for every other provider the harness used that day).
      //
      // Deliberately NOT on a timer. Measured 2026-09-23 on this machine: the
      // scoped filter is a memo key nothing else asks for, so a cold call re-folds
      // the session logs — 10.6 s and 21.2 s observed against 34 ms warm — and a
      // 60 s poll of it would burn seconds of CPU every minute for a figure that
      // can only move when THIS machine finishes a turn. So it runs on the
      // turn-settle path and on mount, never in a poll loop.
      const pullCommandCodeDaily = React.useCallback((refreshNow: boolean): void => {
        fetch(`/api/widgets-usage-daily?provider=commandcode${refreshNow ? '&refresh=1' : ''}`)
          .then(async (r) => (r.ok ? await r.json().catch(() => null) : null))
          .then((data: { available?: boolean; daily?: Record<string, number> } | null) => {
            const daily = data?.available === true && data.daily !== null && data.daily !== undefined ? data.daily : null
            // Stale-while-error, same rule as the account payload: `available: false`
            // (usage-center mid-rescan, host just restarted, service absent) leaves
            // the last good map in place. Blanking it would print `-` for the 今日用量
            // of a plan that plainly HAS a figure — the exact symptom (reported
            // 2026-09-23) this scoped map was wired up to fix.
            if (daily !== null) setState({ commandCodeDaily: daily })
          })
          .catch(() => { /* keep the last scoped map */ })
      }, [])
      const prevRunningRef = React.useRef(running)
      React.useEffect(() => {
        const refresh = (): void => {
          fetch('/api/opencode-usage')
          .then((r) => r.json())
          .then((data: UsageData) => setState({ usageData: data }))
          .catch(() => { /* keep last known usage */ })
        // Multi-key pool usage (primary key + pooled backup keys).
        fetch('/api/opencode-usage-multi')
          .then((r) => r.json())
          .then((data: UsageMulti) => setState({ usageMulti: data }))
          .catch(() => { /* pool endpoint optional: cards fall back to single-key */ })
        // Command Code account usage + both authoritative day maps.
        pullCommandCode()
        pullUsageDaily(true)
        pullCommandCodeDaily(true)
        }
        // Pull on mount (both false −first render); afterwards only a
        // completed turn (true −false) refetches, an in-flight turn does not.
        if (running === prevRunningRef.current) refresh()
        else if (!running) refresh()
        prevRunningRef.current = running
      }, [running])
      // The authoritative day map needs a slow poll of its own: usage-center
      // rescans every ~30 s, so a long idle page would otherwise show a frozen
      // "today" cell. One tiny same-origin JSON per minute; a missing service or
      // an unrestarted host simply keeps answering `available: false`.
      React.useEffect(() => {
        // Immediate pull too: the mount-time fetch above can land before
        // usage-center has finished its first scan, and this converges the card
        // within seconds instead of waiting for the next turn.
        pullUsageDaily(false)
        const id = window.setInterval(() => { if (!document.hidden) pullUsageDaily(false) }, 60_000)
        return () => window.clearInterval(id)
      }, [pullUsageDaily])
      // Command Code account usage DRIFTS while this page sits idle: the 5h /
      // weekly / monthly windows are ACCOUNT-wide, so another client spending
      // against the same pool moves them with no turn HERE to hang a refetch on.
      // A turn-settle-only fetch therefore left every cc-* card and 「额度管理」
      // frozen on its mount-time numbers — reported 2026-09-23 as 今日用量 /
      // 今日推荐 stuck on `-` and the monthly ring missing entirely.
      const ccOnRail = snap.open && (snap.prefs.installed ?? []).some((key) => WIDGET_RUNTIME[parseInstanceKey(key).widgetId]?.source === 'cc')
      React.useEffect(() => {
        if (!ccOnRail) return
        // Cost control (measured 2026-09-23): ONE tick is four upstream reads per
        // pooled key — 8 reads, 1.6 s, 4.7 KB on this two-key pool — and it is the
        // only upstream traffic this rail generates at all. Three rules keep it
        // honest:
        //   * only while the rail is ON SCREEN and a Command Code card is installed;
        //   * never while the tab is HIDDEN — a background tab has no reader, and
        //     Chrome throttles its timers anyway;
        //   * 60 s, not 30 s: these are $14–$70 subscription windows, and nobody
        //     can act on a 30 s difference. A turn settling here still refreshes
        //     on its own path, and returning to the tab refreshes at once.
        const tick = (): void => { if (!document.hidden) pullCommandCode() }
        const onVisible = (): void => { if (!document.hidden) pullCommandCode() }
        pullCommandCode()
        const id = window.setInterval(tick, 60_000)
        document.addEventListener('visibilitychange', onVisible)
        return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
      }, [ccOnRail, pullCommandCode])
      // GitHub family: ONE request for every installed github-* card.
      //
      // The cards' own config fields decide the request — `user` (whose
      // calendar) and `repos` (which pulses). Both empty means "whoever this
      // machine is signed in as": the HOST resolves the login from the
      // credential / `gh` CLI, which is what makes the family work on a fresh
      // install with nothing typed. Several installed cards are ONE upstream
      // pass: the logins and repo lists are merged here, so two cards never
      // buy two rounds.
      //
      // Cadence: on mount, whenever the merged request changes (a config edit
      // re-runs the effect), every 10 minutes while the tab is visible, and on
      // return to the tab. Nothing here hangs off a turn — GitHub does not
      // move when this conversation does.
      const ghKeys = (snap.prefs.installed ?? []).filter((key) => WIDGET_RUNTIME[parseInstanceKey(key).widgetId]?.source === 'github')
      const ghUser = ghKeys
        .map((key) => (snap.prefs.cardConfigs?.[key]?.user as string | undefined) ?? '')
        .map((s) => s.trim())
        .find((s) => s !== '') ?? ''
      const ghRepos = Array.from(new Set(ghKeys.flatMap((key) => String(snap.prefs.cardConfigs?.[key]?.repos ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s)))))
        .slice(0, 4)
      const ghRequest = `${ghUser}|${ghRepos.join(',')}`
      // Whether any installed card shows the review queue. Part of the effect's
      // identity: installing 待我处理 must make the NEXT pull ask for `notif=1`,
      // not wait for some other config edit.
      const ghNotif = (snap.prefs.installed ?? []).some((key) => key === 'github-notify' || key.startsWith('github-notify@'))
      React.useEffect(() => {
        if (ghKeys.length === 0) return
        const pull = (): void => {
          const params = new URLSearchParams()
          if (ghUser !== '') params.set('user', ghUser)
          if (ghRepos.length > 0) params.set('repos', ghRepos.join(','))
          // The review queue is only fetched when a card that shows it is
          // installed: it is an authenticated-only call, and asking for it costs
          // an upstream round trip (cheap on a 304, but still a round trip).
          if (ghNotif) params.set('notif', '1')
          const query = params.toString()
          fetch(`/api/github${query === '' ? '' : `?${query}`}`)
            .then(async (r) => {
              const data = (await r.json().catch(() => null)) as GitHubData | { error?: string } | null
              if (!r.ok) {
                // STALE-WHILE-ERROR, exactly like the Command Code family: the
                // last good payload stays on screen (a transport blip must not
                // blank a card that was showing a number), and 404 means the
                // HOST ROUTE is absent — `dsh web` was not restarted — which
                // the cards say in words instead of pretending to load.
                setState({ githubError: r.status === 404 ? 'unloaded' : `http:${r.status}` })
                return
              }
              setState({ github: data as GitHubData, githubError: null })
            })
            .catch(() => setState({ githubError: 'unavailable' }))
        }
        pull()
        const onVisible = (): void => { if (!document.hidden) pull() }
        const id = window.setInterval(() => { if (!document.hidden) pull() }, 600_000)
        document.addEventListener('visibilitychange', onVisible)
        return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
      }, [ghRequest, ghKeys.length, ghNotif])
      // Hardware snapshot (System widgets): the installed sys-* instances drive
      // ONE shared poll loop —the effective cadence is the SHORTEST refresh
      // interval among them (5/10/30/60 s presets + custom numeric, clamped
      // 5..60, default 10). The host route caches ~1s, so every widget sharing
      // the same tick still triggers a single nvidia-smi spawn.
      React.useEffect(() => {
        const sysIds = Object.keys(WIDGET_RUNTIME).filter((id) => WIDGET_RUNTIME[id]?.source === 'sys')
        const sysKeys = (snap.prefs.installed ?? []).filter((key) => sysIds.some((id) => key === id || key.startsWith(id + '@')))
        const secs = sysKeys.length === 0 ? 0 : Math.min(...sysKeys.map((key) => resolveInterval(snap.prefs.cardConfigs?.[key])))
        if (!(secs > 0)) return
        const refresh = (): void => {
          fetch('/api/sysinfo')
          .then((r) => r.json())
          .then((data: SysInfo) => { setState({ sysinfo: data }); ingestSysInfo(data) })
          .catch(() => { /* keep last known snapshot */ })
          // The machine overview rides the same cadence: same subject (this
          // machine), and the route answers from per-section caches after its
          // first pass, so the extra request is a few milliseconds.
          fetch('/api/host/overview')
          .then(async (r) => {
            if (!r.ok) { setState({ hostError: r.status === 404 ? 'unloaded' : `http:${r.status}` }); return }
            const data = (await r.json().catch(() => null)) as HostOverview | null
            if (data === null) { setState({ hostError: 'unavailable' }); return }
            setState({ host: data, hostError: null })
          })
          .catch(() => { /* stale-while-error: keep the last overview */ })
        }
        refresh()
        const id = window.setInterval(refresh, secs * 1000)
        return () => window.clearInterval(id)
      }, [snap.prefs.installed, snap.prefs.cardConfigs])
      // Price table: only fetched while a card that prices this session is on the
      // rail, and on a slow clock — the file changes when a human edits it, not
      // when a turn finishes.
      const wantsPricing = (snap.prefs.installed ?? []).some((key) => key === 'session-cost' || key.startsWith('session-cost@'))
      React.useEffect(() => {
        if (!wantsPricing) return
        let alive = true
        const pull = (): void => {
          fetch('/api/widgets-pricing')
            .then(async (r) => (r.ok ? await r.json().catch(() => null) : null))
            .then((data: PriceTable | null) => { if (alive && data !== null) setState({ pricing: data }) })
            .catch(() => { /* keep the last table: a blip must not unpriced a card */ })
        }
        pull()
        const id = window.setInterval(pull, 600_000)
        return () => { alive = false; window.clearInterval(id) }
      }, [wantsPricing])
      // One-second tick while a turn is running, so the in-flight LLM and tool
      // durations advance between settle boundaries instead of freezing.
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        if (!running) return
        setNow(Date.now())
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
      }, [running])
      // Time-sensitive cards (e.g. peak-pricing windows) must re-read
      // the clock even with no turn running: a 30s tick rebuilds stats so the
      // window check stays fresh across a peak/off-peak boundary.
      React.useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 30000)
        return () => window.clearInterval(id)
      }, [])
      React.useEffect(() => {
        const p = projected
        const folded = p && p.steps !== undefined ? p : deriveStats(settled)
        let inputTokens = 0
        let cacheRead = 0
        let outputTokens = 0
        if (usage) {
          inputTokens = (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0)
          cacheRead = usage.cacheReadTokens || 0
          outputTokens = usage.outputTokens || 0
        }
        // Heatmap day data. AUTHORITATIVE first: when the host route served
        // dsh-usage-center's log-folded per-day totals, the cards render exactly
        // those numbers and this browser's own accounting is skipped entirely
        // (it can only ever agree by accident —it credits steps only while a
        // page is open, and older builds seeded fabricated days into it).
        // The two-layer local accounting below is the STANDALONE fallback:
        //  (a) per-step (v2): if settled assistant nodes carry `usage`, credit
        //      each step ONCE to the day its `stepStartTime` began —exact
        //      per-conversation attribution, immune to cross-midnight sessions,
        //      session switches, remounts, compaction.
        //  (b) anchor fallback (v1): if nodes lack `usage` (host did not
        //      project it into the folded surface), fall back to diffing the
        //      cumulative `tokenUsage` projection against an anchor that is
        //      rebuilt ONLY on a cumulative RESET (new session) —never on a
        //      bare "new day" —so continuing a session across midnight still
        //      credits only the newly observed growth to today.
        const authoritative = snap.usageDaily
        const heatTz = (deps.getPrefs().cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ
        // Heatmap timezone: per-card config (default Beijing UTC+8), 'local' =
        // browser clock. Every day attribution below uses it.
        //
        // The per-step accounting runs in BOTH modes. Without usage-center it IS
        // the day map; WITH it, it keeps TODAY live: the indexer folds the session
        // logs on a ~30 s cadence, so between two scans the authoritative map
        // still shows the PREVIOUS turn and the card would look frozen while
        // every settled step is already measurable right here.
        {
          const seenState = loadSeen()
          let dirty = false
          let nodeUsageOk = false
          const isStartF = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
          for (const node of settled ?? []) {
            if (node?.kind !== 'assistant') continue
            if (node?.usage == null) continue
            nodeUsageOk = true
            const start = node.timing?.stepStartTime
            const nodeUsage = node.usage
            if (start == null) continue
            const total = (isStartF(nodeUsage.uncachedInputTokens) ? nodeUsage.uncachedInputTokens : 0)
              + (isStartF(nodeUsage.cacheReadTokens) ? nodeUsage.cacheReadTokens : 0)
              + (isStartF(nodeUsage.cacheWriteTokens) ? nodeUsage.cacheWriteTokens : 0)
              + (isStartF(nodeUsage.outputTokens) ? nodeUsage.outputTokens : 0)
            if (total <= 0) continue
            const key = `${node.turn ?? '?'}:${node.step ?? '?'}:${start}`
            if (seenState.keys.has(key)) continue
            seenState.keys.add(key)
            if (start > seenState.strongest) seenState.strongest = start
            const day = dateKey(new Date(start), heatTz)
            heatmapRef.current = accumulateHeatmap(heatmapRef.current, day, total)
            dirty = true
          }
          if (dirty) {
            saveSeen(seenState.keys, seenState.strongest)
            // The React state copy exists for the STANDALONE path only; with
            // usage-center the merge below reads the ref directly.
            if (authoritative === null || authoritative === undefined) setHeatmap(heatmapRef.current)
          }
          // (b) anchor fallback —only when per-step nodes carried no usage AND
          // no authoritative map exists to supersede it.
          // Anchor discipline (the cross-day over-credit fix):
          //   * while per-step crediting is active, keep the anchor parked at the
          //     observed cumulative —a later fallback takeover then diffs only
          //     what per-step did NOT already credit (never the whole history);
          //   * the fallback credits growth ONLY when the active session shows a
          //     step that actually began today (todayActivity). Without it, an
          //     anchor that lags the cumulative (page reopened on yesterday's
          //     session, projection lag right after a new-session switch) would
          //     diff the entire prior-day total into today's cell.
          const current = usage ? inputTokens + outputTokens : 0
          if (nodeUsageOk && usage && current > anchorRef.current) {
            anchorRef.current = current
            saveHeatmapAnchor(current)
          }
          if ((authoritative === null || authoritative === undefined) && !nodeUsageOk && usage) {
            const todayKey = dateKey(new Date(), heatTz)
            const todayActivity = (settled ?? []).some((n: any) =>
              n?.kind === 'assistant' && n?.timing?.stepStartTime != null && dateKey(new Date(n.timing.stepStartTime), heatTz) === todayKey)
            if (current < anchorRef.current) {
              // cumulative reset (new session / log rebuild): re-anchor, no credit
              anchorRef.current = current
              saveHeatmapAnchor(current)
            } else if (todayActivity) {
              const delta = current - anchorRef.current
              anchorRef.current = current
              saveHeatmapAnchor(current)
              heatmapRef.current = accumulateHeatmap(heatmapRef.current, todayKey, delta)
              setHeatmap(heatmapRef.current)
            } else if (current > anchorRef.current) {
              // history only (no step began today yet): park the anchor at the
              // cumulative without crediting, so it can never be diffed later.
              anchorRef.current = current
              saveHeatmapAnchor(current)
            }
          }
        }
        /** The day map the cards render: authoritative, with TODAY topped up by
         *  the live per-step counter (see `mergeToday`) so a finished turn shows
         *  up at once instead of waiting for usage-center's next scan. */
        const heatmapDays = mergeToday(authoritative, heatmapRef.current, dateKey(new Date(), heatTz))
        // Live in-flight elapsed, added to the settled whole-log figures.
        let llmMs = folded.llmMs
        let toolMs = folded.toolMs
        if (timeline) {
          for (const turn of timeline.turns.values()) {
            if (turn.status !== 'open') continue
            for (const step of turn.steps) {
              if (step.status !== 'open' || step.start === undefined) continue
              const assembled = settled.some((n: any) => n.kind === 'assistant' && n.turn === step.turn && n.step === step.step && n.timing !== undefined)
              if (!assembled) llmMs += Math.max(0, now - step.start.time)
            }
          }
        }
        for (const call of runningCalls) {
          toolMs += Math.max(0, now - call.time)
        }
        // contextPressure projection is { contextWindow?, pressureTokens?, projectedTokens? }.
        // Ratio = projectedTokens / contextWindow.
        let contextPercent: number | null = null
        let contextWindow: number | null = null
        let contextTokens: number | null = null
        if (contextPres && typeof contextPres === 'object') {
          if (typeof contextPres.contextWindow === 'number' && contextPres.contextWindow > 0) contextWindow = contextPres.contextWindow
          if (typeof contextPres.projectedTokens === 'number') {
            contextTokens = contextPres.projectedTokens
            if (contextWindow) contextPercent = Math.min(1, Math.max(0, contextPres.projectedTokens / contextWindow))
          }
        }
        let contextBreakdown: Stats['contextBreakdown'] = null
        if (contextBrk && typeof contextBrk === 'object') {
          contextBreakdown = {
            systemTokens: (contextBrk as unknown as Record<string, unknown>).systemTokens as number | undefined ?? 0,
            toolsTokens: (contextBrk as unknown as Record<string, unknown>).toolsTokens as number | undefined ?? 0,
            messageTokens: (contextBrk as unknown as Record<string, unknown>).messageTokens as number | undefined ?? 0,
          }
        }
        const compaction = deriveCompaction(settled)
        const stats: Stats = {
          turns: folded.turns, steps: folded.steps,
          llmMs, toolMs,
          ttftMs: folded.ttftMs, ttftSteps: folded.ttftSteps,
          decodeMs: folded.decodeMs, decodeTokens: folded.decodeTokens,
          usage: { inputTokens, cacheReadTokens: cacheRead, outputTokens },
          contextPercent, contextWindow, contextTokens, contextBreakdown,
          todos: Array.isArray(todosProj) && todosProj.length >= 0 ? todosProj as Stats['todos'] : null,
          heatmapGrid: buildHeatmapGrid(heatmapDays, (deps.getPrefs().cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', heatTz),
          heatmapRaw: { ...heatmapDays },
          trajectory: deriveTrajectory(settled, runningCalls, timeline, now),
          // The 工具调用 card's fold: names, failures, the slowest call and what is
          // running right now — all off the nodes this pass already walks.
          tools: deriveTools(settled, runningCalls, now),
          // The 上下文压缩 card's fold: how much history was folded away, when, and
          // how many surface items went with it — same node array, one filter more.
          // NULL when this session has folded nothing: "no reading yet" must not
          // masquerade as a zero, or the record would override the preview's own
          // example and leave a reviewable card showing nothing.
          compactions: compaction.count > 0 ? compaction : null,
          // Session shape (see the projection reads above): normalized here so
          // every card downstream can trust the shape it is handed.
          modelSelection: normalizeModelSelection(modelSelProj),
          agentPreset: typeof agentPresetProj === 'string' && agentPresetProj !== '' ? agentPresetProj : null,
          goal: normalizeGoal(goalProj),
          permissions: normalizePermissions(permsProj),
          subagents: normalizeSubagents(
            subagentProj,
            typeof sessionsById === 'object' && sessionsById !== null
              ? (id: string) => (sessionsById as Record<string, unknown>)[id]
              : null,
            now,
          ),
          jobs: normalizeJobs(
            typeof jobsBySession === 'object' && jobsBySession !== null && typeof sessionId === 'string'
              // The mirror omits a session that has no jobs, so an ABSENT key under a
              // live mirror means "no jobs" (`[]`, which the 后台作业 card renders as
              // 0 — the useful confirmation that the machine is idle), while a missing
              // MIRROR means "cannot tell" (`null`, which hides the card). Collapsing
              // the two would make the card vanish exactly when it is most reassuring.
              ? ((jobsBySession as Record<string, unknown>)[sessionId] ?? [])
              : undefined,
          ),
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, modelSelProj, agentPresetProj, goalProj, permsProj, subagentProj, jobsBySession, sessionsById, sessionId, timeline, runningCalls, now, snap.usageDaily, deps.getPrefs().cardConfigs?.heatmap?.monthMode, deps.getPrefs().cardConfigs?.heatmap?.timeZone])
      return null
  }
}