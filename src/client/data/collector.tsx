/**
 * dsh-widgets — the data collector.
 *
 * Renders in the `conversation.composer.dock` slot (so the shell mounts it while a
 * session exists) and folds three kinds of input into the bridge:
 *   1. the live conversation projection (session stats + the 轨迹 beats);
 *   2. the LIVE DATA SOURCES — one `<SourcePoller>` per discovered adapter
 *      (`data/sources.ts`), which owns every host route's cadence. Before v1.11
 *      those five routes were five hand-written effects in this file; adding a
 *      data source meant editing it. It does not any more;
 *   3. the installs WITHOUT dsh-usage-center, whose heatmap is self-accounted here
 *      and persisted across mounts.
 *
 * Moved out of `client/index.ts` (Phase 2.5) with its body unchanged. It receives
 * the bridge handles instead of closing over them: `useBridge` / `setState` are
 * stable, while `state` and `prefs` are LIVE bindings, so those two arrive as
 * getters and are read at the point of use.
 */

import * as React from 'react'
import { DEFAULT_TZ, accumulateHeatmap, buildHeatmapGrid, dateKey, loadHeatmapAnchor, loadHeatmapStore, loadSeen, mergeToday, saveHeatmapAnchor, saveSeen } from '../lib/heatmap-accounting'
import { type Stats, deriveCompaction, deriveStats, deriveTools, deriveTrajectory, normalizeGoal, normalizeJobs, normalizeModelSelection, normalizePermissions, normalizeSubagents } from './session-stats'
import { type BridgeSnapshot, type BridgeState } from '../runtime/bridge'
import { type Prefs } from '../runtime/prefs'
import { activeAdapters, readsSchedule } from './sources'
import { createSourcePoller } from './source-poller'
import { readScheduleCatalog, subscribeScheduleChanged, type RemoteServiceLike, type ScheduleRemoteFace } from './schedule'

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
  /** The client Remote service, resolved per call (see the schedule effect). */
  getRemote: () => RemoteServiceLike | undefined
}

/** Build the collector component bound to one bridge. */
export function createCollector(deps: CollectorDeps): (props: any) => React.ReactElement | null {
  const { useBridge, setState } = deps
  // One scheduler component per source, built ONCE per registration: a factory
  // re-created on every render would remount every poller (restarting its timers)
  // on every bridge emit.
  const SourcePoller = createSourcePoller({ setState, getState: deps.getState, getPrefs: deps.getPrefs })
  return ({ useSession, useProjection, useChat, useSessions }: any): React.ReactElement | null => {
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
      // ---- Live data sources (the v1.11 adapter contract). ----
      // One scheduler per discovered adapter that has a consumer, mounted here
      // so it lives exactly as long as an active session does. Each poller owns
      // its own cadence, dependencies and error rules — see source-poller.tsx.
      // Adding a source means adding families/<id>/adapter.ts: this file does
      // not name a single source id.
      const pollers = activeAdapters(deps.getPrefs()).map((adapter) => React.createElement(SourcePoller, {
        key: adapter.id,
        adapter,
        running,
        railOpen: snap.open,
      }))
      // ---- The DSH scheduled tasks (日历 / 倒计时's second source). ----
      // Deliberately NOT a `manifest.source` adapter: those poll a same-origin host
      // route, while this subsystem is a client Remote FACE with its own change
      // event (`schedule/changed`). The gate is the adapters' own rule anyway —
      // nothing is asked for unless an installed card declares that it reads this
      // (`manifest.reads: ['schedule']`), so a rail without a schedule-aware card
      // never touches the subsystem and never holds a subscription.
      const wantsSchedule = readsSchedule(deps.getPrefs())
      React.useEffect(() => {
        if (!wantsSchedule) return
        // A NAMESPACE read can THROW on a shell that did not declare the dependency
        // (`cannot get property "remote.schedule" without inject`) — and an effect
        // that throws takes this whole dock slot, i.e. every card's data, with it.
        // The child fiber in client/index.ts is what makes the read legal; this
        // catch is the second line of defence, so the worst case is a card that
        // says 定时任务不可用 rather than a rail with no cards at all.
        // The warning is deliberate: this read is only illegal when the shell and the
        // plugin disagree about the Remote faces (see client/index.ts), and a silent
        // catch there once cost the whole dock slot.
        let face: ScheduleRemoteFace | undefined
        try {
          face = deps.getRemote()?.schedule
        } catch (error) {
          console.warn('[dsh-widgets] remote.schedule is not readable in this shell:', error)
          face = undefined
        }
        let alive = true
        const load = (): void => {
          // Never rejects (see data/schedule.ts): a failed read is `unavailable`,
          // which the cards degrade on rather than a rejection that would take this
          // effect — and every card's data with it — down.
          void readScheduleCatalog(face).then((next) => { if (alive) setState({ schedule: next }) })
        }
        load()
        const off = subscribeScheduleChanged(face, load)
        return () => { alive = false; off() }
      }, [wantsSchedule])
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
        // The OPEN TURN's own elapsed, and the open MODEL step's.
        //
        // `sessionStats.llmMs`/`toolMs` above are whole-session cumulative, so a card
        // labelled "this turn" would report the entire conversation. The live
        // timeline is the only place the turn's own start exists: an open turn's
        // steps each carry `start.time`, and the EARLIEST of them is the turn's
        // start (a turn already on step 4 still measures from step 1). Nothing is
        // derived when no turn is open — `null` is the honest answer, and a card
        // prints 空闲 rather than a frozen number from the last turn.
        let liveTurnMs: number | null = null
        let liveStepMs: number | null = null
        if (timeline && typeof timeline.turns?.values === 'function') {
          for (const turn of timeline.turns.values()) {
            if (turn?.status !== 'open') continue
            let earliest: number | null = null
            for (const step of turn.steps ?? []) {
              const start = step?.start?.time
              if (typeof start !== 'number' || !Number.isFinite(start)) continue
              if (earliest === null || start < earliest) earliest = start
              if (step?.status !== 'open') continue
              const ms = Math.max(0, now - start)
              if (liveStepMs === null || ms > liveStepMs) liveStepMs = ms
            }
            if (earliest !== null) liveTurnMs = Math.max(0, now - earliest)
          }
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
          jobs: normalizeJobs(            typeof jobsBySession === 'object' && jobsBySession !== null && typeof sessionId === 'string'
              // The mirror omits a session that has no jobs, so an ABSENT key under a
              // live mirror means "no jobs" (`[]`, which the 后台作业 card renders as
              // 0 — the useful confirmation that the machine is idle), while a missing
              // MIRROR means "cannot tell" (`null`, which hides the card). Collapsing
              // the two would make the card vanish exactly when it is most reassuring.
              ? ((jobsBySession as Record<string, unknown>)[sessionId] ?? [])
              : undefined,
          ),
          // The two live-timing readings (see the fold above): `null` when nothing
          // is in flight, so a card can tell "not running" from "0 ms so far".
          liveTurnMs,
          liveStepMs,
        }
        setState({ stats })
      }, [settled, projected, usage, contextPres, contextBrk, todosProj, modelSelProj, agentPresetProj, goalProj, permsProj, subagentProj, jobsBySession, sessionsById, sessionId, timeline, runningCalls, now, snap.usageDaily, deps.getPrefs().cardConfigs?.heatmap?.monthMode, deps.getPrefs().cardConfigs?.heatmap?.timeZone])
      return React.createElement(React.Fragment, null, pollers)
  }
}