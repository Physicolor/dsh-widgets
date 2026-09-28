import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'

/**
 * 后台作业 — this session's background jobs: how many are still running, how long
 * the longest one has been running, and which job is the newest.
 *
 * WHY IT EXISTS: a long-running job is the number-one cause of a session that
 * LOOKS stuck. The official header popover knows about it (`dsh-client-ui-jobs`
 * reads the `jobsBySession` list mirror), but the popover has to be opened and
 * only exists while a job does; on a rail of cards nothing says "a Bash job has
 * been holding a slot for 12 minutes". This card is that sentence.
 *
 * THE DATA IS NOT A PROJECTION. `jobsBySession` is a field of the client sessions
 * service's list mirror (the same one the official popover reads) — no RPC, no
 * skeleton, no `source` in the manifest, and no "loading" state to draw: either
 * the mirror is there (an array, possibly empty) or this card has nothing to say.
 * The shared `WidgetStats.jobs` field arrives through the collector
 * (`useSessions((s) => s.jobsBySession[sessionId])`) and is declared locally as
 * `JobEntry` because this worktree's snapshot predates it — see the note on that
 * interface.
 *
 * HEAD LADDER (see AGENT-BRIEF §2): the blue 13px title, then the 20px figure =
 * the number of jobs that still occupy the machine (`headAfter.big` — never
 * `value`, which the renderer would push into the body a second time), then the
 * grey caption under it (`legend`): the longest elapsed run plus the total job
 * count. The body is the three detail rows, on the card's floor
 * (`bodyAnchor: 'bottom'`). Every element is a DIFFERENT question — how many are
 * live (figure), how long the worst one has run and how big the list is
 * (caption), and who/which/what broke (rows) — so no rung repeats another.
 *
 * `stopping` COUNTS AS RUNNING. A job that has been asked to stop still holds its
 * slot, its process and its files until it actually settles, which is exactly the
 * state that makes a session look stuck; excluding it would understate the load
 * at the worst moment. The count is therefore running + stopping.
 *
 * `null` vs `[]` (the contract's distinction, and it is REAL here):
 *   - `null` (not an array / this deployment composes no sessions service) —
 *     nothing to report, `render` returns null. Claiming "0 jobs" would be a
 *     fabricated reading.
 *   - `[]` (the mirror exists and is empty) — the card STILL RENDERS: 0 with the
 *     grey 「已结束 0 个」 caption and three dash rows. 「后台作业全清了」 is itself
 *     useful confirmation, and it is the answer to the question the card was
 *     installed to ask. This is deliberately the OPPOSITE call from the 子代理
 *     card (which hides on an empty catalog): a subagent catalog is normally
 *     empty in a session that never spawns children, while an empty job list is
 *     the RESOLUTION of a state the user was watching — hiding the card the
 *     moment the last job finishes removes the confirmation and the card's whole
 *     reason to be on the rail. See README §7.
 *
 * 「已结束」, NOT 「已完成」. The idle caption counts every job that is no longer
 * running — completed + killed + failed alike. 已完成 would claim success for a
 * list that the very next row reports failures in (「已完成 4 个」 above 「失败 1」),
 * and a cancelled job did not "complete" either; 已结束 is the umbrella word that
 * is true of all three. The failed subset is reported by its own row, so the two
 * numbers answer different questions and are allowed to overlap.
 *
 * TONE DIRECTION (the widget's own call, never the renderer's): the running count
 * is NOT coloured by size — three parallel jobs are not "worse" than one, they
 * are busy. The only escalation is the 失败 row, which turns `danger` above zero
 * (a job that already failed is a fact to act on) and stays `muted` at zero (a
 * real reading — "nothing broke" — not a missing one).
 *
 * THE CLOCK IS READ ON PURPOSE. A running job's elapsed time is a function of the
 * clock, not of the record, so this render is the one place in the widget that is
 * not a pure function of `stats`: `Date.now()` is explicitly allowed (BRIEF §3).
 * The previews pin it (`meta.sim.now`, the shared mechanism's documented use) so
 * the gallery and the G4 snapshot print the same seconds on every run.
 *
 * PREVIEW STATES: the two states that only ever exist live are click-stepped in
 * the market / 组件配置 previews (`example.simSteps`) so they can be eyeballed:
 * 运行中 → 已跑完 (nothing live, history kept) → 空列表. `sim.state` only ever
 * FORCES a degradation — an absent/`live` state still derives everything from the
 * data, so a real session always renders its own truth.
 *
 * HEIGHT BUDGET (against the shipped geometry): pad 15 × 2 (30,
 * `cardInnerPad(150)` = 15 at the default 16% radius) + head (title 16 + 4 +
 * figure 25 + 2 + caption 14 = 61) + rows (divider 1 + paddingTop 6 + 3 × 12 +
 * 2 × 4 = 51) = 142 of the 150px tile, and the browser measures the card at
 * exactly 150×150 with 112 of its 120px content box used (8px slack, absorbed
 * above the bottom-anchored rows). A FOURTH row needs 16px more and would burst
 * the tile, which is why the card owns exactly three rows and has no config
 * schema to grow them.
 *
 * THE CARD IS NOT CLICKABLE. `cycle` belongs to the usage family's pool view;
 * there is nothing here a tap could usefully change (a job list is read-only from
 * this surface), so no `cycle` is declared and no press animation plays.
 */

/** Statuses the mirror may carry (`SessionJob.status`). */
type JobStatus = 'running' | 'stopping' | 'completed' | 'killed' | 'failed'

/** Which statuses still occupy the machine (see "stopping COUNTS AS RUNNING"). */
const IS_LIVE: Record<JobStatus, boolean> = {
  running: true,
  stopping: true,
  completed: false,
  killed: false,
  failed: false,
}

/** The wire statuses this build understands; anything else is KEPT as a row but
 *  counted as settled (an unrecognised status must never make a job invisible,
 *  and it is certainly not evidence of failure). */
const STATUSES: readonly string[] = ['running', 'stopping', 'completed', 'killed', 'failed']

/** The em dash a row with no reading shows — the same placeholder 任务/工具调用
 *  use, never a fabricated 0. */
const DASH = '—'

/** Longest job name this card keeps in the DOM. The label cell FADES its right
 *  edge (see breakdown.tsx) instead of ending in "…": that track measures 83px
 *  at 2×2, i.e. the 最久/最近 prefix plus ~13 latin characters — so this cap is
 *  DOM hygiene for a pathological label (a 4KB command), not a layout rule, and
 *  it deliberately adds NO ellipsis glyph. */
const NAME_MAX = 64

/** Row cap: three fit, four do not (see HEIGHT BUDGET). */
const ROWS = 3

/** The subset of a mirrored job row this card reads. `id` / `finishedAt` /
 *  `detail` are deliberately NOT read: no element of the card prints them. */
interface JobRow {
  /** One-line name: `label`, else `kind`, else '' (the row then prints `—`). */
  name: string
  status: JobStatus | null
  startedAt: number
}

/** One detail row of the breakdown block. */
interface Row {
  label: string
  value: string
  tone?: BarDatum['tone']
}

/** Collapse a possibly multi-line command into one line and bound its length
 *  (see NAME_MAX). */
function oneLine(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

/** The wire status, or null when this build does not recognise it. */
function statusOf(raw: unknown): JobStatus | null {
  return typeof raw === 'string' && STATUSES.includes(raw) ? (raw as JobStatus) : null
}

/**
 * Read the mirrored `jobs` list defensively.
 *
 * The mirror's wire value is read as `unknown` on purpose: this deployment may
 * carry an older/newer sessions service, or no sessions service at all, and a
 * card must never be the thing that throws inside a selector (the slot renderer
 * answers a throwing selector by abdicating the whole entry, taking every other
 * card's data with it). A row with no usable start time is DROPPED — it can be
 * neither dated nor ranked, and `—` would be a row of pure noise.
 *
 * @returns the rows, or null when the mirror is not an array (see null vs []).
 */
function jobsOf(value: unknown): JobRow[] | null {
  if (!Array.isArray(value)) return null
  const rows: JobRow[] = []
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    if (typeof r.startedAt !== 'number' || !Number.isFinite(r.startedAt)) continue
    const label = typeof r.label === 'string' ? oneLine(r.label) : ''
    const kind = typeof r.kind === 'string' ? oneLine(r.kind) : ''
    rows.push({ name: label !== '' ? label : kind, status: statusOf(r.status), startedAt: r.startedAt })
  }
  return rows
}

/** A row's name, or the dash when it carries neither a label nor a kind. */
function nameOf(row: JobRow): string {
  return row.name !== '' ? row.name : DASH
}

/** Is this row still occupying the machine? */
function isLive(row: JobRow): boolean {
  return row.status !== null && IS_LIVE[row.status]
}

function jobsRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const mirrored = jobsOf(stats.jobs)
  // Not an array: there is no job mirror to report on (see null vs [] in the
  // header). Render nothing rather than claiming an empty machine.
  if (mirrored === null) return null
  // Preview-only forced states (see PREVIEW STATES): `empty` stands in for `[]`,
  // and neither can change what live data would say.
  const sim = meta?.sim
  const rows = sim?.state === 'empty' ? [] : mirrored
  // The clock (see THE CLOCK IS READ ON PURPOSE): pinned by the previews, live on
  // the rail. A start time in the future (clock skew between producer and
  // renderer) clamps to 0 rather than printing a negative duration.
  const now = typeof sim?.now === 'number' && Number.isFinite(sim.now) ? sim.now : Date.now()
  let live = 0
  let failed = 0
  let longest: JobRow | null = null
  let longestMs = 0
  let newest: JobRow | null = null
  // A job that is asked to stop is not yet settled (see the header), so `sim.state
  // === 'idle'` genuinely has to re-derive rather than flip a counter.
  const ignoringLive = sim?.state === 'idle'
  for (const row of rows) {
    const rowLive = isLive(row) && !ignoringLive
    if (rowLive) {
      live += 1
      const ms = Math.max(0, now - row.startedAt)
      // First-wins on a tie, so the ORDER of the mirror (not the iteration) cannot
      // change which job is named.
      if (longest === null || ms > longestMs) {
        longest = row
        longestMs = ms
      }
    }
    if (row.status === 'failed') failed += 1
    if (newest === null || row.startedAt > newest.startedAt) newest = row
  }
  const dash: Row = { label: '', value: DASH, tone: 'muted' }
  // 失败's own tone, named: `muted` is a READING here (a real zero, see TONE
  // DIRECTION), not the missing-value dash above it.
  const failedTone: BarDatum['tone'] = failed > 0 ? 'danger' : 'muted'
  const breakdown: Row[] = [
    // 最久 names the running job that has been holding its slot longest and prints
    // its live elapsed; with nothing running there is no such reading (a settled
    // job's total runtime is a DIFFERENT fact), so the row prints `—` rather than
    // borrowing a number from another question.
    longest === null
      ? { ...dash, label: t('card.jobs.longest') }
      : { label: `${t('card.jobs.longest')} ${nameOf(longest)}`, value: fmtDuration(longestMs) },
    // 最近 is the newest START in the whole mirror, settled or not — "what did I
    // just kick off". It has no figure of its own (its elapsed time would be the
    // 最久 question asked twice), so the value cell stays empty.
    newest === null
      ? { ...dash, label: t('card.jobs.newest') }
      : { label: `${t('card.jobs.newest')} ${nameOf(newest)}`, value: '' },
    // 失败 is a count with a real zero: `muted` at zero (a reading, not a gap),
    // `danger` above it (something to act on). `killed` is NOT a failure — a job
    // the user cancelled did what it was told.
    { label: t('card.jobs.failed'), value: String(failed), tone: failedTone },
  ].slice(0, ROWS)
  return {
    title: t('card.jobs.title'),
    // The figure: how many jobs still occupy the machine. Deliberately not
    // coloured — a parallel job count is not a severity (see TONE DIRECTION).
    headAfter: { big: String(live) },
    // The caption answers the two questions the figure cannot: how long the worst
    // one has run, and how big the list is. Once nothing is live the caption
    // changes subject (how many jobs are over) because "最久 —" as a caption would
    // be a rung that says nothing. `rows.length` IS the settled count there: the
    // branch is only reached when nothing in the list is live.
    legend: live > 0
      ? t('card.jobs.legend', { longest: fmtDuration(longestMs), total: rows.length })
      : t('card.jobs.idle', { n: rows.length }),
    // The three rows sit on the tile's floor instead of marooning the leftover
    // height underneath them (every breakdown card in this repo does).
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown },
  }
}

/** The instant the example's jobs are dated from: this module's own clock, read
 *  once, so the preview's elapsed times are the fabricated ones this file chose
 *  and are identical in the gallery and in the G4 snapshot. */
const EXAMPLE_NOW = Date.now()

/**
 * One background job as the mirror hands it over — the WIRE shape, declared here
 * because this worktree's snapshot predates the shared `WidgetStats.jobs` field
 * (it lands from the main repo at integration, commit 184b2d1; the collector
 * fills it from `useSessions((s) => s.jobsBySession[sessionId])`). It is the same
 * declaration the sibling units carry, so the two never drift: a field the
 * contract adds later only has to be added in one place per unit.
 *
 * `render` does NOT read through this interface — it narrows the incoming value
 * field by field (`jobsOf`), because at RUN time the value may come from an older
 * or newer sessions service. This type documents the shape (and, via `satisfies`
 * on the example below, checks it) rather than promising it.
 */
interface JobEntry {
  id: string
  kind: string
  label: string
  status: 'running' | 'stopping' | 'completed' | 'killed' | 'failed'
  startedAt: number
  finishedAt?: number
  detail?: string
}

export default defineWidget({
  id: 'jobs',
  name: () => t('widget.jobs.name'),
  desc: () => t('widget.jobs.desc'),
  builtin: true,
  group: 'system',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: jobsRender,
  // A click on either preview steps 运行中 → 已跑完 → 空列表 (the shared
  // `simSteps` mechanism, exactly as 任务 walks 有任务/无任务), so the two states
  // that only exist live — nothing running with history behind it, and a cleared
  // list — are reviewable without waiting for a job to finish.
  simToggle: () => t('widget.jobs.simToggle'),
  // Widget-owned preview data: with no live session there is no job mirror, so
  // the market / 组件配置 previews render from here (live data wins the moment a
  // session has jobs, and `sim.state` can only force a degradation — see the
  // header). The list deliberately covers every row: two live jobs (one long Bash
  // and one short stopping job, so the count is 2 and not "the number of things
  // that look alike"), a completed subagent job, and a FAILED one so the danger
  // row is on screen in the preview. `satisfies JobEntry[]` is what keeps this
  // list honest against the shared `jobs` field at integration — and the list must
  // stay INSIDE the descriptor: the registry generator reads the FIRST id literal
  // in this file as the widget id, so a module-level example list shadows the
  // descriptor's own (it did, and gen-registry rejected the unit).
  example: {
    stats: {
      jobs: [
        { id: 'bash-1', kind: 'bash', label: 'npm run build --filter dsh-widgets', status: 'running', startedAt: EXAMPLE_NOW - 724_000 },
        { id: 'bash-2', kind: 'bash', label: 'tail -f logs/dev.log', status: 'stopping', startedAt: EXAMPLE_NOW - 95_000 },
        { id: 'subagent-1', kind: 'subagent', label: 'Review the jobs widget contract', status: 'completed', startedAt: EXAMPLE_NOW - 900_000, finishedAt: EXAMPLE_NOW - 880_000 },
        { id: 'bash-3', kind: 'bash', label: 'npm test -- --run', status: 'failed', startedAt: EXAMPLE_NOW - 1_500_000, finishedAt: EXAMPLE_NOW - 1_440_000, detail: 'exit code: 1' },
      ] satisfies JobEntry[],
    },
    // 运行中 first (`sim` MUST be one of `simSteps`, else the first click is a
    // silent no-op), then the same list with nothing live, then the cleared list.
    // `now` is pinned so every rendered duration is exactly the fabricated one.
    sim: { state: 'live', now: EXAMPLE_NOW },
    simSteps: [
      { state: 'live', now: EXAMPLE_NOW },
      { state: 'idle', now: EXAMPLE_NOW },
      { state: 'empty', now: EXAMPLE_NOW },
    ],
  },
})
