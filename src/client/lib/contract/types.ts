/**
 * dsh-widgets — Widget contract (shared, stable core).
 *
 * This module defines the ONE contract every widget unit must satisfy:
 * a `Widget` descriptor (default-exported by `src/widgets/<id>/index.ts`)
 * plus the pure resolver helpers the shell and the registry consumers use.
 *
 * The descriptor is deliberately TYPE-ONLY for everything a widget renders;
 * the machine-readable part (id / group / builtin / sizes / defaultInstalled
 * / per-widget locale) lives in each unit's `manifest.json`, which the
 * build-time discovery generator (`scripts/gen-registry.mjs`) reads to emit
 * `src/client/generated.registry.ts`. Neither side is a widget's full
 * definition alone — together they are the unit's contract.
 *
 * Everything in this file is part of the STABLE shared layer:
 *   - Core / Runtime (contract, resolvers)
 *   - Shared Types   (WidgetStats, WidgetRenderOut, WidgetChart, …)
 * It must not import widgets (units import it, never the other way).
 *
 * This module carries the TYPES (and the one shared data constant); the resolver
 * helpers live in `./helpers`, so a consumer that only needs a type never pulls
 * the i18n dictionary into its module graph. Split out of `lib/contract.ts`.
 */

/** One usage item from the OpenCode Go usage endpoint. */
export interface UsageItem {
  status: string
  percent: number
  resetsAt: string
}

/** The OpenCode Go usage payload (subset the widget reads). */
export interface UsageData {
  usage: {
    rolling: UsageItem
    weekly: UsageItem
    monthly: UsageItem
  }
}

/** One pooled key's usage snapshot (tail masked, never the full secret). */
export interface UsageKeyEntry {
  ref: string
  label: string
  tail?: string
  data: UsageData | null
}

/** All pooled keys' usage plus a host-computed 共同用量 (proportional mean). */
export interface UsageMulti {
  total: UsageData | null
  keys: UsageKeyEntry[]
}

/** `GET /alpha/whoami` — current Command Code account / org identity. */
export interface CommandCodeWhoami {
  success?: boolean
  user?: { id?: string; name?: string; email?: string; userName?: string } | null
  org?: {
    id?: string
    name?: string
    [k: string]: unknown
  } | null
}

/** `GET /alpha/usage/summary` — request counts, success rate, tokens, spend. */
export interface CommandCodeUsageSummary {
  totalCount?: number
  totalCost?: number
  averageCost?: number
  successRate?: number
  completedCount?: number
  failedCount?: number
  totalTokensIn?: number
  totalTokensOut?: number
  totalTokens?: number
  totalCredits?: number
  totalFreeCredits?: number
  totalMonthlyCredits?: number
  totalPurchasedCredits?: number
  periodBasis?: string
}

/** One Command Code window limit (5h / weekly): used vs cap + reset time. */
export interface CommandCodeWindow {
  used?: number
  cap?: number
  exceeded?: boolean
  /** Epoch ms; the wall-clock time the window resets. */
  resetAt?: number
}

/** `GET /alpha/billing/credits` — credit balance + 5h / weekly quota windows. */
export interface CommandCodeCredits {
  credits?: {
    belowThreshold?: boolean
    creditThreshold?: number
    monthlyCredits?: number
    purchasedCredits?: number
    freeCredits?: number
  } | null
  windowLimits?: {
    limited?: boolean
    exceeded?: unknown
    fiveHour?: CommandCodeWindow | null
    weekly?: CommandCodeWindow | null
  } | null
}

/** `GET /alpha/billing/subscriptions` — plan + billing-period end. */
export interface CommandCodeSubscription {
  success?: boolean
  data?: {
    id?: string
    status?: string
    planId?: string
    priceId?: string
    quantity?: number
    cancelAtPeriodEnd?: boolean
    currentPeriodStart?: string
    currentPeriodEnd?: string
    endedAt?: string | null
    canceledAt?: string | null
  } | null
}

/** The four official endpoint slices of ONE Command Code account. Every slice
 *  is nullable: the host fetches them independently, so one failing endpoint
 *  never blanks the others. */
export interface CommandCodeAccount {
  whoami: CommandCodeWhoami | null
  usage: CommandCodeUsageSummary | null
  credits: CommandCodeCredits | null
  subscription: CommandCodeSubscription | null
}

/** One Command Code pool member: the credential ref it came from, the account
 *  label the card's pool switcher shows, and its own four slices. */
export interface CommandCodeKeyEntry {
  ref: string
  /** The account's own name, read from THIS key's `/alpha/whoami`
   *  (`name` -> `userName`), or `Key N` when that call did not answer. The card
   *  family shows it as the pool view (`Command Code` / legend `账户 · Physicolor`). */
  label: string
  /** Last 4 characters of the key, used to disambiguate two pools that resolve
   *  to the same account name. Never the full secret. */
  tail?: string
  /** This member's own four slices; null when every endpoint failed for it. */
  data: CommandCodeAccount | null
}

/** The Command Code payload from the host `/api/commandcode-usage` route: the
 *  FIRST pool member's own slices (the back-compatible shape every card read
 *  before pools existed) PLUS every configured pool member, in order.
 *
 *  `keys` is what makes the family switchable: one entry -> nothing to switch to
 *  and the top-level slices are the whole answer; two or more -> the cards cycle
 *  `AllUser` -> each account, and `AllUser` is summed client-side (the plan ->
 *  monthly-allowance table lives in `cc-view`). */
export interface CommandCodeData extends CommandCodeAccount {
  keys?: CommandCodeKeyEntry[]
}

/** How the host authenticated to GitHub for one payload: a credential from the
 *  `GITHUB_TOKEN` ref, the local `gh` CLI's own login, or nobody (anonymous —
 *  60 requests/hour, shared per egress IP). */
export type GitHubAuth = 'credentials' | 'gh' | 'anonymous'

/** One day of a contribution calendar. `level` is GitHub's own 0..4 bucket
 *  (the green step), `count` the exact number of contributions that day. */
export interface GitHubContribDay {
  date: string
  count: number
  level: number
}

/** The contribution calendar for ONE login (the card behind the green grid).
 *
 *  `source` names how the host got it, because the two paths are not the same
 *  thing and the card must be able to say which one it is reading:
 *   - `graphql` — the official API (needs a token; exact counts, ~1 request);
 *   - `html`    — the public contributions page, parsed (no token at all, but
 *                225 KB and 1–9 s, and it is a scrape: GitHub may change it). */
export interface GitHubContributions {
  login: string
  /** Σ over `days` (the calendar's own total, e.g. 212). */
  total: number
  source: 'graphql' | 'html'
  days: GitHubContribDay[]
  /** Consecutive days with ≥1 contribution ending today (0 when today is
   *  empty — GitHub's own "current streak" also breaks until you commit). */
  streak: number
  /** The longest run of consecutive contributing days inside the window. */
  longest: number
}

/** One repository's pulse — what the four 2×2 cards and the 2×4 board read. */
export interface GitHubRepo {
  fullName: string
  stars: number
  forks: number
  /** Open issues, PRs EXCLUDED (the repo payload's `open_issues_count` counts
   *  both, so it is never used for this field). */
  openIssues: number
  /** True when the listing filled a whole page, i.e. `openIssues` is a floor. */
  issueCountCapped: boolean
  /** Open issues nobody has commented on. `null` = not measured (anonymous
   *  requests skip the extra search call), never 0-by-assumption. */
  unanswered: number | null
  /** ISO instant of the last push (any branch). */
  pushedAt: string | null
  release: { tag: string; name: string; publishedAt: string | null } | null
  /** Newest open issue (PRs excluded). */
  newestIssue: { number: number; title: string; comments: number; updatedAt: string } | null
}

/**
 * One price rule from the usage-center table (see `host/pricing.ts`).
 *
 * `rates` and `peakRates` are four disjoint buckets per MILLION tokens in
 * `currency`. `peakRates` is null when the provider publishes no peak/off-peak
 * split; the card must then use `rates` for every hour rather than guessing a
 * multiplier.
 *
 * `sourceType` is the provenance and is NOT cosmetic: `official` is the vendor's
 * own list, `reseller` is a middleman's, `local` means the route is free, and
 * `fallback` means the number is a stand-in. A card that prints money without
 * saying which of those it used is claiming more than it knows.
 */
export interface PriceRule {
  id: string
  provider: string | null
  model: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  timezone: string | null
  peakWindows: Array<{ days: number[]; start: string; end: string }>
  rates: { inputCacheHit: number; inputCacheMiss: number; output: number; cacheWrite: number }
  peakRates: { inputCacheHit: number; inputCacheMiss: number; output: number; cacheWrite: number } | null
  currency: string | null
  sourceType: string | null
  verifiedAt: string | null
  source: string | null
}

/** The `/api/widgets-pricing` payload. `available: false` means the storage file
 *  is missing or unreadable — there is deliberately NO built-in fallback table. */
export interface PriceTable {
  available: boolean
  version: number | null
  currency: string | null
  rules: PriceRule[]
  /** Where the table was read from (diagnostics; not for display). */
  path: string
  modifiedAt: number | null
}

/**
 * The review queue behind 「待我处理」 (`GET /notifications`).
 *
 * AUTHENTICATED ONLY: anonymous answers 401 (measured), so this slice is null on
 * a machine with neither a token nor a `gh` login — and the card that reads it
 * renders nothing, rather than claiming "0 to review".
 *
 * `byReason` always carries the same key set (`review_requested` / `mention` /
 * `assign` / `ci_activity` / `other`), because a row that vanishes when its count
 * is zero makes the card change height for no reason. `other` folds every reason
 * the card has no row for, so the rows add up to `count`.
 */
export interface GitHubNotifications {
  count: number
  /** True when the upstream page was FULL, i.e. `count` is a floor ("30+"), not an
   *  exact number. The same idea as `GitHubRepo.issueCountCapped`, and it exists
   *  for the same reason: a card that prints a truncated page as an exact count is
   *  lying by rounding. */
  capped: boolean
  byReason: Record<string, number>
  newest: { title: string; repo: string; reason: string; updatedAt: string; url: string | null } | null
}

/** The payload of the host `/api/github` route. Every slice is independently
 *  nullable: the contribution calendar and the repo list are fetched (and
 *  cached) separately, so a slow scrape never delays the repo numbers.
 *  `notifications` is only present when the request asked for it (`notif=1`). */
export interface GitHubData {
  auth: GitHubAuth
  /** The login the calendar was actually built for — the configured `user`, or
   *  (when that is empty) whoever the resolved token belongs to. Empty when
   *  there was no token and no configured user. */
  login: string
  contributions: GitHubContributions | null
  repos: GitHubRepo[]
  /** The review queue; null unless the request asked for it AND a credential was
   *  available (see GitHubNotifications). */
  notifications?: GitHubNotifications | null
  /** Per-slice failure notes, e.g. `{ contributions: 'rate-limit' }`, or
   *  `no-user` / `no-repo` when an empty config could not be resolved. */
  errors: Record<string, string>
}

/**
 * The DeepSeek platform balance behind `/api/deepseek-balance`, from the official
 * `GET https://api.deepseek.com/user/balance`.
 *
 * The four official numbers are passed through as the vendor stated them:
 * `total` is the whole balance, `toppedUp` what was paid in and `granted` the
 * credit DeepSeek itself granted (`total = toppedUp + granted` upstream), in
 * `currency` (CNY on this machine's account).
 *
 * `spentToday` is the ONE derived figure here, and it is derived because the
 * official endpoint publishes no usage at all: the host SAMPLES the balance and
 * accumulates the drops it observed during `day` (local calendar day). It is
 * therefore a measurement of what this host watched, not a bill — a spend that
 * happened while dsh was not running is invisible to it. The card says so on
 * hover; see `src/host/deepseek.ts` for the fold.
 *
 * `hasBalance` is the vendor's own `is_available` ("this account can still call
 * the API") and is deliberately NOT recomputed from `total > 0`: a grant-only
 * account with a positive balance can still be flagged, and that verdict is
 * upstream's to make.
 */
export interface DeepSeekBalance {
  available: true
  currency: string | null
  total: number
  granted: number
  toppedUp: number
  hasBalance: boolean
  /** Σ of the balance drops observed during `day`; 0 when none was seen yet. */
  spentToday: number
  /** The local calendar day `spentToday` describes (`YYYY-MM-DD`). */
  day: string
  /** Epoch millis of the upstream sample (not of the response). */
  sampledAt: number
}

/** One hardware snapshot from the Host `/api/sysinfo` route (machine-local
 *  values only — never session data). `cpu.util` is the utilization averaged
 *  over the window between two host samples (null on the very first sample,
 *  before a delta exists). */
export interface SysInfo {
  ts: number
  cpu: { util: number | null }
  mem: { used: number; total: number; percent: number }
  gpu: {
    name: string
    temp: number
    util: number
    /** VRAM in BYTES (the host converts nvidia-smi's MiB — see host/sysinfo.ts);
     *  `fmtGb` divides by 1024³ and every consumer assumes this unit. */
    memUsed: number
    memTotal: number
    memPercent: number
  } | null
  /** Rolling sample history (host ring buffer, newest last, ≤120 samples) for
   *  the utilization sparklines. `null` = no baseline yet at that sample. */
  history?: {
    ts: number[]
    cpu: Array<number | null>
    gpu: Array<number | null>
  }
  /** Disk space, the session-log footprint and the host process — the
   *  device/self-check half (see MachineInfo). Absent on an older host half. */
  machine?: MachineInfo
}

/**
 * The machine / self-check half of `/api/sysinfo` (see `host/machine.ts`).
 *
 * Distinct from the hardware half next to it because its cadence is: CPU/GPU move
 * every poll, while drive space, the session-log footprint and the host process's
 * own memory move on the scale of minutes — the host caches each reading with its
 * own TTL so a 5 s card poll does not walk the session directory twelve times a
 * minute.
 *
 * `home` is `null` when the session directory cannot be read at all, which is a
 * different statement from a directory that is genuinely empty (`files: 0`).
 */
export interface MachineInfo {
  ts: number
  /** Every mounted fixed drive, in drive-letter order. */
  disks: Array<{ mount: string; total: number; free: number }>
  /** The DSH home's session-log footprint; null when unreadable. */
  home: { sessionsFiles: number; sessionsBytes: number; recentFiles: number } | null
  /** The `dsh web` host process itself. */
  proc: { pid: number; rss: number; cpuPercent: number | null; uptimeSec: number }
}

/** One probed local service (see `HostOverview.services`). */
export interface HostServiceProbe {
  key: string
  label: string
  host: string
  port: number
  up: boolean
  /** TCP handshake time in ms, or null when the probe failed. */
  ms: number | null
}

/**
 * Proxy egress health.
 *
 * `tcpMs` alone is NOT a verdict: the local proxy answers `200 Connection
 * established` even for a domain that does not exist (measured 2026-09-29 on
 * xray), so a CONNECT probe proves only that the port is listening. The real
 * question — "can traffic leave this machine" — is answered by `egressMs`, an
 * absolute-URI GET through the proxy; `ok` is null while that measurement is
 * still in flight (stale-while-revalidate, see host/overview.ts).
 */
export interface HostProxyHealth {
  host: string
  port: number
  tcpMs: number | null
  egressMs: number | null
  ok: boolean | null
  /** Stable failure code when the egress probe failed, else null. */
  error: string | null
}

/** Power supply / battery state (null on a machine with no battery). */
export interface HostPower {
  /** True when running on mains power; null when the source cannot be told. */
  onAc: boolean | null
  percent: number | null
  /** Minutes of runtime left; null when on AC or unknown — the Win32 sentinel
   *  `71582788` (0x4444444) means "AC / unknown" and must never be printed. */
  minutesLeft: number | null
  /** The active Windows power scheme's name, when `powercfg` answered. */
  scheme: string | null
}

/** One process by working set (the machine's memory hogs). */
export interface HostProcess {
  pid: number
  name: string
  rss: number
}

/** Per-adapter throughput, derived from two counter samples. */
export interface HostNetAdapter {
  name: string
  rxBps: number
  txBps: number
}

/**
 * The `/api/host/overview` payload: the machine's operational picture.
 *
 * Every section is independently nullable, and for a reason: the sections have
 * different costs (a TCP probe is ~1 ms, a PowerShell snapshot ~350 ms, the proxy
 * egress probe ~1.3 s), so each is sampled on its own clock and a section that
 * has not answered YET is `null` rather than a zero. `services` is the one
 * exception — a TCP probe is cheap enough to always answer, so it is an array
 * (possibly empty) rather than nullable.
 */
export interface HostOverview {
  ts: number
  net: { adapters: HostNetAdapter[]; rxBps: number; txBps: number } | null
  power: HostPower | null
  procs: HostProcess[] | null
  services: HostServiceProbe[]
  proxy: HostProxyHealth | null
}

/** Session stats a widget render can read. */
export interface WidgetStats {  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  usage: { inputTokens: number; cacheReadTokens: number; outputTokens: number } | null
  usageData: UsageData | null
  /** Multi-key pool usage (OpenCode Go): every key + host-computed total. */
  usageMulti?: UsageMulti | null
  /** Command Code account usage (whoami / summary / credits / subscription),
   *  aggregated by the host `/api/commandcode-usage` route. */
  commandCode?: CommandCodeData | null
  /** Command Code host-route error surfaced to the widgets: `null` when the
   *  last fetch succeeded, or a stable code ('unconfigured' | 'unloaded' |
   *  'unavailable') when it did not, so cards can say WHY instead of a bare
   *  「未配置」 (the key is auto-read host-side, never user-entered). */
  commandCodeError?: string | null
  /** Current Command Code pool view: 'AllUser' or a pooled account's label.
   *  Written per instance by the card's own tap-to-cycle (the `ccView` field of
   *  that instance's cardConfigs — deliberately NOT the OpenCode pool's
   *  `poolView`, so the two families never share a view). */
  ccView?: string
  /** Current pooled view selection: 'total' or a `poolModes` entry ('Key 1'…). */
  poolView?: string
  /** Selectable pooled views in cycle order; first entry must be 'total'. */
  poolModes?: string[]
  /** Optional live context pressure 0..1 (from useProjection('contextPressure')). */
  contextPercent?: number | null
  contextWindow?: number | null
  contextTokens?: number | null
  /** Optional composition of the next request (system/tools/messages), from useProjection('contextBreakdown'). */
  contextBreakdown?: { systemTokens: number; toolsTokens: number; messageTokens: number } | null
  /** Last ~13 weeks of daily token usage (self-accounted). */
  heatmapGrid?: Array<Array<{ value: number; date: string }>>
  /** Raw self-accounted daily token log (dateKey -> value), so wide (2×4
   *  half-year) and bar (last-7-day) variants can derive their own grids from
   *  the same source the 2×2 calendar uses. */
  heatmapRaw?: Record<string, number>
  /** The same daily log RESTRICTED to the Command Code route (`commandcode`),
   *  served by `/api/widgets-usage-daily?provider=commandcode`. 「额度管理」reads
   *  only this map: its credits and billing period describe that one plan, so
   *  folding the machine-wide `heatmapRaw` in charged the plan for every other
   *  provider's tokens too (measured 2026-09-20: 758M vs the plan's own 474M). */
  commandCodeDaily?: Record<string, number>
  /** GitHub payload from the host `/api/github` route (contribution calendar +
   *  per-repo pulse). `null` while the first pass is in flight; the widgets'
   *  own `user` / `repos` config fields decide WHAT the host was asked for. */
  github?: GitHubData | null
  /** Stable code when the GitHub route could not answer at all: `'unloaded'`
   *  (host route missing → dsh web not restarted), `'unavailable'`, or
   *  `http:<status>`. Per-slice notes live in `github.errors` instead. */
  githubError?: string | null
  /** DeepSeek platform balance (official `/user/balance`) + the day's observed
   *  spend, from the host `/api/deepseek-balance` route. `null` while the first
   *  pass is in flight. */
  deepseekBalance?: DeepSeekBalance | null
  /** Stable code when that route could not answer: `'unconfigured'` (no
   *  DEEPSEEK_API_KEY), `'unauthorized'` (the key was rejected), `'unloaded'`
   *  (host route missing → dsh web not restarted), `'unavailable'`/`'timeout'`,
   *  or `http:<status>`. */
  deepseekBalanceError?: string | null
  /** Id of the currently armed (awaiting second tap) action, if any. */
  armedAction?: string | null
  /** Current task list (todos projection): status is pending | in_progress | completed. */
  todos?: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed' }> | null
  /** Rolling window of the live conversation trajectory (oldest first, newest
   *  last, at most `TRAJECTORY_WINDOW` beats). Re-derived on every node/timeline
   *  change, so in-flight model steps and tool calls appear as they run. */
  trajectory?: TrajectoryBeat[]
  /** The tool-call fold of this session window (see ToolCallSummary): how many
   *  calls, how many failed, which is slowest, and what is running right now —
   *  the 工具调用 card's whole input. */
  tools?: ToolCallSummary | null
  /** The compaction fold (see CompactionSummary): how much history was folded
   *  away and when — the 上下文压缩 card's whole input. */
  compactions?: CompactionSummary | null
  /** The model route of the last request and of the next one (projection
   *  `modelSelection`). `null` when this deployment composes no session
   *  controller — a card whose whole subject is the route then renders nothing. */
  modelSelection?: ModelSelectionInfo | null
  /** The agent preset this session runs (projection `agentPreset`); `null` when
   *  the deployment composes none. */
  agentPreset?: string | null
  /** The durable goal (projection `goal`); `null` when this session has none. */
  goal?: GoalInfo | null
  /** The effective permission select (projection `permissions`); `null` when no
   *  permission service is composed (clients then hide the control). */
  permissions?: PermissionInfo | null
  /** Direct children of this session (projection `subagentCatalog`), in catalog
   *  order (oldest first). `null` = projection absent; `[]` = no children. */
  subagents?: SubagentEntry[] | null
  /** This session's background jobs (the `jobsBySession` list mirror); `null`
   *  when the list is unavailable, `[]` when the session has none. */
  jobs?: JobInfo[] | null
  /**
   * How long the OPEN turn has been running (ms), or `null` when no turn is open.
   *
   * Derived by the collector from the live timeline (`useChat().timeline`), whose
   * open turn carries its steps' `start.time`: the turn's own start is the EARLIEST
   * of them, so a turn that is already on step 4 still measures from step 1. The
   * projection's `sessionStats.llmMs`/`toolMs` cannot answer this — they are
   * whole-session cumulative, so a card built on them would report "this turn" as
   * the entire conversation.
   */
  liveTurnMs?: number | null
  /** How long the open MODEL step has been running (ms), or `null` when the turn is
   *  between steps (the model has answered and no step is in flight). */
  liveStepMs?: number | null
  /**
   * The DSH scheduled-task subsystem, as the rail can see it (`ctx.remote.schedule`,
   * see data/schedule.ts). `null`/absent = never read (no card on the rail reads it
   * — the collector only subscribes while one does), `status: 'unavailable'` = this
   * deployment has no schedule face, and cards must then DEGRADE (a plain month
   * grid, a `—` countdown) rather than invent an empty agenda.
   */
  schedule?: ScheduleSnapshot | null
  /** Machine operational picture from the host `/api/host/overview` route
   *  (throughput / power / top processes / local services / proxy egress). */
  host?: HostOverview | null
  /** Stable code when the host route could not answer at all: `'unloaded'`
   *  (route missing → dsh web not restarted) or `'unavailable'`. */
  hostError?: string | null
  /** The usage-center price table (see PriceTable). `null` = not read (no card
   *  on the rail prices anything) — which is NOT the same as `available: false`
   *  ("there is no table, so print tokens and no money"). */
  pricing?: PriceTable | null
  /** Per-instance config merged by the shell (typed any: widgets with a
   *  configSchema read their keys from the same record the collector feeds). */
  [key: string]: unknown
}

/** One beat of the conversation trajectory: which lane fired, and how long it
 *  took. Mirrors the official 轨迹 timeline's three lanes (输入 / 模型 / 工具):
 *  an input message has no duration of its own (0), a model step spans its
 *  stepStartTime → completedTime, a tool call spans callTime → result. */
export interface TrajectoryBeat {
  kind: 'input' | 'model' | 'tool'
  /** Duration in ms; 0 for a user/steering message (the input lane is instant). */
  ms: number
}

/** Size of the rolling trajectory window: how many beats a 对话轨迹 card shows
 *  and therefore how many fixed slots the lanes chart draws. The collector
 *  trims to it and the renderer keeps the slot width stable at it. */
export const TRAJECTORY_WINDOW = 30

/** One traced segment of a `lanes` chart: a beat plus its identity in the
 *  rolling window (the widget passes beats oldest→newest; the renderer derives
 *  the slot from the ARRAY INDEX, so index 0 is the oldest beat shown). */
export interface LaneDatum {
  kind: TrajectoryBeat['kind']
  /** Hover tooltip text (e.g. `模型 3.2s`); the widget owns its wording. */
  label?: string
  /** Beat duration in ms. Read only when the chart asks for `laneSizing: 'time'`
   *  (0 for an input, which then collapses to a minimum-width tick). */
  ms?: number
}

/**
 * The tool-call fold of one session window (the 工具调用 card's source).
 *
 * Read off the conversation nodes the client already loads — no host round trip:
 *  - a settled call is a `tool-result` node, whose `call.name` is the tool id
 *    (null when window truncation left the call head outside) and whose
 *    `isError` is the failure flag; its duration is `time − callTime`;
 *  - a running call is a `RunningToolCall` with `name` and `time`.
 *
 * `tools` counts DISTINCT names among the calls that still carry one, so a
 * truncated head neither invents a name nor hides the call from `calls`.
 */
export interface ToolCallSummary {
  /** Settled calls in the loaded window. */
  calls: number
  /** Distinct tool names among those that still carry a name. */
  tools: number
  /** Settled calls the tool itself reported as errors. */
  failures: number
  /** Slowest settled call (name + duration), or null when none is measurable. */
  slowest: { name: string; ms: number } | null
  /** The longest-running in-flight call, or null when nothing is running. */
  running: { name: string; ms: number; count: number } | null
}

/**
 * The compaction fold of one session window (the 上下文压缩 card's source).
 *
 * A landed compaction is a `compaction` node: it names how many surface items it
 * replaced and what that history was worth in tokens. Both can be null when the
 * summary event fell outside the loaded window — the compaction still HAPPENED, so
 * it is counted, while its figures stay null and are printed as `—` rather than 0.
 */
export interface CompactionSummary {
  /** Compactions landed in the loaded window. */
  count: number
  /** Σ tokens the replaced history was worth (unknown entries contribute 0). */
  reclaimed: number
  /** Σ surface items replaced (unknown entries contribute 0). */
  items: number
  /** Newest first, capped by the fold (`COMPACTION_HISTORY`). */
  recent: Array<{ at: number; reclaimed: number | null; items: number | null }>
}

/** How many compaction events the fold keeps for the card's history rows. */
export const COMPACTION_HISTORY = 5

/**
 * The model route a session is using — the `modelSelection` projection's own
 * shape, re-stated here so a widget never imports the session controller.
 *
 * `reasoningEffort` is ABSENT when the route publishes no efforts at all, which
 * is a different statement from "effort = the default" — cards print `—` for the
 * first and the effort id for the second, never a guess.
 */
export interface ModelRoute {
  provider: string
  model: string
  reasoningEffort?: string
}

/** The model route the last request used, and the one the NEXT request will use.
 *  Both are null when the session has not recorded a model request yet. */
export interface ModelSelectionInfo {
  next: ModelRoute | null
  lastUsed: ModelRoute | null
}

/**
 * The durable goal of one session (the `goal` projection), flattened.
 *
 * `roundsStarted` counts ADMITTED user turns against `maxGoalRounds` — the only
 * progress truth an autonomous run has. `phase` is the durable lifecycle
 * (`active` | `paused` | `blocked` | `complete`); `blockedReason` is present
 * exactly while it is `blocked`.
 */
export interface GoalInfo {
  objective: string
  phase: 'active' | 'paused' | 'blocked' | 'complete'
  roundsStarted: number
  maxGoalRounds: number
  createdAt: number
  updatedAt: number
  blockedReason?: { code: string; message: string }
}

/**
 * The effective permission select (the `permissions` projection): the preset the
 * session currently runs (`currentValue`, a table key or `custom`) plus every
 * switchable option with its human label.
 *
 * The projection folds the THREE knobs (preset + sandbox mode + approval policy)
 * into this one value, which is why a card shows the preset's label rather than
 * re-deriving sandbox/approval itself: the fold is the authority.
 */
export interface PermissionInfo {
  currentValue: string
  options: Array<{ value: string; name: string; description?: string }>
}

/**
 * One direct child of this session (the `subagentCatalog` projection).
 *
 * Deliberately NARROW: the catalog carries identity and creation time, not spend.
 * A card must therefore say how many children exist and how long each has been
 * ACTIVE — it must NOT claim one is "running", which this projection cannot
 * answer.
 *
 * `activeMs` is the child's own durable active-turn duration, read from the
 * client session list (`byId[child].projectionValues.subagentTiming`) because the
 * parent cannot see it any other way: `useProjection('subagentTiming')` in this
 * scope folds the PARENT's own log as if it were a child. `undefined` = not
 * measurable yet (no descriptor, or the child's log has not settled).
 */
export interface SubagentEntry {
  id: string
  createdAt: number
  mode: 'one-shot' | 'continuable'
  label?: string
  activeMs?: number
}

/**
 * One background job of this session (the client session list's `jobsBySession`
 * mirror — a slot hook, `useSessions`, not a projection).
 *
 * Unlike the subagent catalog this DOES carry liveness: `status` is the job
 * runtime's own state, which is what makes 「N 个运行中 · 最久 12m」 answerable.
 */
export interface JobInfo {
  id: string
  kind: string
  label: string
  status: 'running' | 'stopping' | 'completed' | 'killed' | 'failed'
  startedAt: number
  finishedAt?: number
  detail?: string
}

/** One bar for a mini bar chart. */
export interface BarDatum {
  label: string
  value: number
  /** 0..1 used for the fill ratio; falls back to value/max when absent. */
  ratio?: number
  tone?: 'primary' | 'success' | 'warn' | 'danger' | 'muted' | 'accent'
}

/** A chart block a card body can render (declarative, theme tokens only). */
export interface WidgetChart {
  kind: 'bars' | 'ring' | 'rings' | 'line' | 'segments' | 'heatmap' | 'barsV' | 'figures' | 'lanes' | 'quotas' | 'breakdown'
  bars?: BarDatum[]
  /** Label / value / optional COST rows, one row per bucket — the 「Token 用量」
   *  breakdown (缓存命中率 + 未缓存输入 + 缓存读取 + 输出). Two right-aligned
   *  columns: the value (always) and the money (only when a price rule matched, so
   *  a route with no published rate leaves the cell EMPTY rather than printing a
   *  fabricated `$0.00`). A hairline divider sits above the rows. The widget owns
   *  every string, including which unit each value carries. */
  breakdown?: Array<{ label: string; value: string; cost?: string; tone?: BarDatum['tone'] }>
  /** Quota ROWS in the official site's shape: the window name on the left, its
   *  percent hard right, and a SEGMENTED bar under them (filled cells = used) —
   *  the 套餐/额度 card family's window trio. */
  quotas?: Array<{ label: string; pct: number; tone?: BarDatum['tone'] }>
  /** Trajectory lanes (对话轨迹): one bar per beat, newest at the RIGHT, drawn
   *  with the official 轨迹 timeline's HORIZONTAL geometry (the official
   *  `min(width * .08%, 1px)` gap, the 2px floor, 1px corners) and its lane colors
   *  (输入 / 模型 / 工具). One ROW per lane, all three lanes always drawn — an
   *  empty lane is an empty track, exactly as in the official strip. The VERTICAL
   *  layout is the card's own: three equal bands, flush against each other,
   *  filling the card's remaining height (the official 8px/14px strip belongs to a
   *  1300px-wide rail). No axes, no corner labels. */
  lanes?: LaneDatum[]
  /** How a `lanes` bar is sized along the shared axis — the card's equivalent of
   *  the official toolbar's 时长 toggle (per-instance choice in the widget's own
   *  config). A bar always fills its lane's full height:
   *   - 'time'  (default) — the recorded-duration projection: a bar's width is
   *     its share of the window's total duration, idle compressed away, so a
   *     26.7s tool call is visibly longer than a 17ms one;
   *   - 'equal' — the official DEFAULT sequence projection: one equal slot per
   *     beat, back to back, the slot frozen at TRAJECTORY_WINDOW beats. */
  laneSizing?: 'equal' | 'time'
  /** Donut row (e.g. OpenCode rolling/weekly/monthly, Command Code 5h/weekly/
   *  monthly). `label` renders as a SMALL GREY caption beside the percent —
   *  leave it empty when the figure should stand alone; `name` then carries the
   *  datum's identity into the hover tooltip only. `decimals` overrides the
   *  percent precision (default 0 = whole numbers). */
  rings?: Array<{ label: string; value: number; ratio?: number; tone?: BarDatum['tone']; decimals?: number; name?: string }>
  /** For ring: one datum + its centered label. */
  value?: number
  valueLabel?: string
  max?: number
  /** For figures: a row of label-over-value figure pairs (e.g. 今日用量 24.7M /
   *  今日推荐 200M) — plain numbers, no axis, spread across the card width. */
  figures?: Array<{ label: string; value: string; tone?: BarDatum['tone'] }>
  /** For figures: SEVERAL such rows, stacked (each row keeps the single row's
   *  geometry: first pair flush left, last flush right). A 2×4 is twice as wide
   *  as it is tall in content, so a wide card can carry two rows where a single
   *  row of eight figures would squeeze every label to nothing — the widget
   *  decides the split, the renderer just stacks what it is handed. */
  figureRows?: Array<Array<{ label: string; value: string; tone?: BarDatum['tone'] }>>
  /** Utilization sparkline (Windows-task-manager style): a filled area under
   *  a polyline. `null` entries break the line (no baseline at that sample). */
  line?: {
    values: Array<number | null>
    /** Y-scale maximum (default 100: percentages). */
    max?: number
    /** Endpoint labels: [earliest, latest] short times ("14:02" / "14:22"). */
    labels?: [string, string]
  }
  /** Segmented bar (system/tools/messages). Each segment has a token share. */
  segments?: Array<{ label: string; tokens: number; tone?: BarDatum['tone'] }>
  totalTokens?: number
  /**
   * Colour ramp for a `segments` bar.
   *
   * `'official'` (default) keeps the product's own ContextMeter palette
   * (bluish-neutral / violet / blue) — that is what 上下文水位 mirrors, and it must
   * not move. `'tones'` instead paints each segment with its declared `tone`, which
   * is what a bar built from SEMANTIC parts (输入 / 输出) needs: until this option
   * existed, a segment's `tone` was required by the contract but silently ignored,
   * so a card could ask for grey/blue and get the context palette.
   */
  segmentsPalette?: 'official' | 'tones'
  /**
   * What a `segments` row prints in its right-hand column.
   *
   * `'tokens'` (default) keeps the shipped behaviour: the segment's absolute token
   * count in the `~12.2K` form the context meter uses. `'percent'` prints its share of
   * `totalTokens` instead.
   *
   * The mode exists because the renderer must never format a NON-token quantity with
   * the token formatter: a chart whose segments are a share of TIME (轨迹占比) would
   * otherwise print 24.2 seconds as `~24.2K`, which reads as a token count. The
   * contract says what the column MEANS; the widget picks the reading that is true.
   */
  segmentsValue?: 'tokens' | 'percent'
  /** Heatmap grid rows (per day amounts). */
  heatmap?: Array<Array<{ value: number; date: string; level?: number }>>
  /** Colour ramp for a `heatmap`. `'brand'` (default) is the business-blue
   *  alpha ramp derived from `--dsw-alias-state-business-primary`, which is
   *  what a token/value calendar wants. `'github'` is GitHub's own five-step
   *  contribution ramp — derived from `--dsw-alias-state-success-primary`
   *  instead of a literal green, so it still follows the theme (a hard-coded
   *  palette would break dark mode; see the plugin design guide §2.1). It
   *  reads each cell's `level` (0..4) rather than placing it on a continuous
   *  scale, because that is what the source reports. */
  heatmapPalette?: 'brand' | 'github'
  /** Unit the heatmap's hover tooltip prints after the number (`'tok'` when
   *  absent). Kept on the chart so a unit-localized word stays in the widget's
   *  dictionary instead of leaking into the renderer. */
  heatmapUnit?: string
  /**
   * Relative size of a chart's ROWS — label line, bar and the gap between rows —
   * default 1 (the shipped geometry). Clamped to 0.8–1.6.
   *
   * It exists because a chart's row metrics are a HEIGHT BUDGET authored for the
   * tightest card (`quotas` was tuned for 150px minus a title and a 25px figure),
   * and `scale` cannot express "give this chart more room": `scale` is
   * `unit / BASE_SIDE`, and `unit` is the same 150 for 2×2 and 2×4 — so a 2×4 card
   * that drops its figure has ~44px of dead space and no way to spend it on the
   * rows. 磁盘与自检 hit exactly that (2026-09-29) and asked for this field rather
   * than faking it with a transform, which would have scaled the title and the
   * card's padding too.
   */
  density?: number
}

/** An interactive action on a card (e.g. one-click Compact). */
export interface WidgetAction {
  id: string
  label: string
  kind?: 'primary' | 'danger' | 'ghost'
  /** Two-step confirm: first click arms, second click fires. */
  confirmHint?: string
}

/**
 * The payload of a `clock` rich block: WHICH zone the card reads and HOW it draws
 * it. Every string in it (the zone caption, the day-period marks, the date line)
 * is composed by the WIDGET — the renderer holds no dictionary
 * (see render/rich/clock-face.tsx).
 *
 * No instant is carried on the live path on purpose: the renderer re-reads
 * `Date.now()` on its own 1s tick, so the second hand moves without the rail
 * having to re-render the card (the collector's own tick is 30s when idle, which
 * would freeze a dial). `at` exists for the DETERMINISTIC surfaces — a preview
 * pins the instant, so the face under review is always the same drawing.
 */
export interface ClockRich {
  /** Pinned epoch-ms instant (previews / snapshot only); absent = live clock. */
  at?: number
  /** IANA zone (`Asia/Shanghai`) or `local`. Default `local`. */
  tz?: string
  /** Caption printed under the dial's centre (e.g. 北京). Absent = no caption. */
  label?: string
  /** 'analog' (default) draws the dial; 'digital' prints the reading. */
  face?: 'analog' | 'digital'
  /** Draw (and tick) the second hand / seconds field. Default true. */
  seconds?: boolean
  /** 24-hour digital reading. Default true (false = 12-hour, with the am/pm mark
   *  carried by `dateLine` — the widget owns that word, the renderer has no
   *  dictionary). */
  h24?: boolean
  /** The small line under a digital reading (e.g. `上午 · 北京 · 周三 10月14日`);
   *  the widget composes it, so the renderer never formats a date or a day period
   *  itself. */
  dateLine?: string
}

/**
 * The payload of a `calendar` rich block: the month's own GRID, already resolved.
 *
 * The widget derives the weeks (lib/clock-face.buildMonthWeeks) and the renderer
 * only lays them out, which is what keeps "which day is it" in one place — and
 * what lets the offline render snapshot (G4) verify the grid itself rather than a
 * drawing of it. `weekdays` is in the GRID's column order (a Monday-first card
 * ships 一…日, a Sunday-first one 日…六) and every label is already localized.
 */
export interface CalendarRich {
  /** The month caption (e.g. `2026年10月`). */
  label: string
  /** The seven column headers, in display order. */
  weekdays: string[]
  /** The weeks top to bottom; `null` = a blank cell. */
  weeks: Array<Array<CalendarCell | null>>
  /** Hover text for the whole grid (provenance the tile has no room for, e.g.
   *  「法定节假日表未覆盖 2027 年」). */
  hint?: string
  /**
   * Day numbers of the SHOWN month that carry at least one active scheduled task.
   *
   * Day numbers, not cells, and only the marks — the widget decides WHICH days a
   * scheduled task lands on (in the card's own configured zone, the same clock the
   * today badge is read from), and the renderer only draws a corner dot on those
   * cells. A day that is already the today badge keeps its badge and gets the dot
   * in the badge's ink, which is the one combination a filled cell would otherwise
   * swallow.
   */
  marks?: number[]
  /** Caption above the 2×4 agenda column (e.g. 临近日程). */
  agendaLabel?: string
  /** The 2×4 agenda rows, SOONEST first, already localized by the widget. Empty
   *  (or absent) draws `agendaEmpty` instead. */
  agenda?: Array<{ when: string; title: string }>
  /** The line the agenda column prints when nothing is upcoming. */
  agendaEmpty?: string
}

/** One day cell of a `calendar` rich block (see lib/clock-face.CalendarCell). */
export interface CalendarCell {
  day: number
  kind: 'normal' | 'accent' | 'today' | 'other'
}

/**
 * One DSH scheduled task, normalized for the cards (see data/schedule.ts).
 *
 * The wire type is `ScheduleCatalogEntry` from the official package: a
 * `ScheduleRecord` variant plus its session binding and an `active`/`inactive`
 * flag. What the cards need is much smaller — when it next fires, what it is
 * called, and how it repeats — so the fold happens ONCE, in `data/schedule.ts`,
 * and every card reads these plain fields (a widget never imports the upstream
 * package, exactly like the model/permission folds).
 */
export interface ScheduleEntryInfo {
  id: string
  /** The task's required stored name (upstream guarantees non-empty, ≤120 chars). */
  title: string
  /** Epoch ms of the next (or final) occurrence; the wire value is an RFC 3339
   *  UTC string, so a card can compare it with `Date.now()` directly. */
  at: number
  /** Inactive tasks stay visible in the catalog but never fire again. */
  status: 'active' | 'inactive'
  /** `at`/`after` are one-shot; the rest repeat. */
  kind: 'at' | 'after' | 'every' | 'daily' | 'weekly' | 'cron'
  /** Fixed-rate interval in seconds (`every`). */
  everySeconds?: number
  /** Local `HH:mm:ss.SSS` (`daily` / `weekly`). */
  time?: string
  /** ISO weekdays, Monday 1 … Sunday 7 (`weekly`). */
  weekdays?: number[]
  /** Five-field Vixie expression (`cron`). */
  expression?: string
  /** The rule's own IANA zone, when it has one. */
  timeZone?: string
}

/**
 * The rail's view of the DSH scheduled-task subsystem.
 *
 * `status` is the DEGRADATION switch, and it is deliberately not derivable from
 * `entries`: the schedule bundle is OPTIONAL in a DSH install (the official
 * release Web composition does not include it), so "no upcoming tasks" and "this
 * deployment cannot tell me about tasks at all" must not look the same on a card.
 */
export interface ScheduleSnapshot {
  status: 'ready' | 'unavailable'
  entries: ScheduleEntryInfo[]
}

/**
 * One round control a `timer` block draws INSIDE its own body.
 *
 * The stopwatch's reference layout is a big reading over two discs (a secondary
 * ring on the left, the main press on the right), which is not the card's
 * `actions` row — that row is a pill strip on the card's floor and drawing it in
 * the body would be a second, differently-behaving button set. The control is
 * DATA like everything else in a render output (a glyph NAME, never a node), and
 * its `id` is dispatched through the very same rail path `WidgetAction.id` uses —
 * the closed `timer:*` vocabulary — so a widget still cannot write arbitrary keys.
 */
export interface TimerControl {
  /** Action ID the rail dispatches (`timer:start` / `timer:pause` / `timer:reset`). */
  id: string
  /** The glyph the renderer draws (see the block's own SVG table). */
  glyph: 'play' | 'pause' | 'ring' | 'reset'
  /** Hover text, localized by the widget (the renderer holds no dictionary). */
  label: string
  /** `primary` = the filled disc; `warn`/`plain` = the outlined secondary one. */
  tone?: 'primary' | 'warn' | 'plain'
  /** Draw the glyph LARGER (the reference's main press holds a 20px triangle in a
   *  52px disc). Default: the secondary size. */
  big?: boolean
}

/**
 * The payload of a `timer` rich block: a reading the RENDERER keeps in time.
 *
 * Both timer cards are one shape. A stopwatch counts up from `baseMs` (+ the live
 * segment); a countdown counts down from `durationMs` over the same elapsed. A
 * countdown to an ABSOLUTE instant (倒计时's 「最近的定时任务」 mode) is expressed by
 * anchoring at the render instant: `startedAt = now`, `durationMs = target − now`,
 * which is self-consistent however stale the render output is — the renderer
 * recomputes `durationMs − (now − startedAt)` and lands on the target either way.
 *
 * No instant is carried on the live path on purpose (the clock's rule): the
 * renderer re-reads `Date.now()` on its own tick, so the figure moves without the
 * rail re-rendering the card (its idle tick is 30s). `at` pins the instant for the
 * deterministic surfaces, so a screenshot under review is always one drawing.
 */
export interface TimerRich {
  mode: 'stopwatch' | 'countdown'
  /** Pinned epoch-ms instant (previews / snapshot only); absent = live tick. */
  at?: number
  /** Milliseconds accumulated before the current segment. */
  baseMs: number
  /** Epoch ms the current segment started; `null`/absent = paused (no tick). */
  startedAt?: number | null
  /** The countdown's total length in ms (`mode: 'countdown'`). */
  durationMs?: number
  /** Small grey line ABOVE the figure (the widget composes the words). */
  caption?: string
  /** Small grey line BELOW the figure. */
  note?: string
  /** Replaces `note` once a countdown has run out (e.g. 时间到). */
  doneLabel?: string
  /** Force the finished state (previews: the run-out layout without waiting). */
  done?: boolean
  /** Colour of the figure, in the product's own semantic vocabulary. */
  tone?: 'business' | 'warn' | 'success' | 'danger' | 'muted'
  /**
   * Print hundredths (`00:00:56.29`) and tick at 100ms while running — the
   * stopwatch's own reading (its reference layout). Absent = whole seconds
   * (`M:SS` / `H:MM:SS`), which is what a countdown wants.
   */
  hundredths?: boolean
  /** Round controls drawn under the figure (the reference stopwatch's two discs). */
  controls?: TimerControl[]
  /**
   * Which body shape to draw — the RENDERER needs the height, and only the widget
   * knows whether its card keeps a title:
   *  - `plain` (default): 74px, the figure + note only. Sized for a T2 card that
   *    keeps its title AND carries an `actions` row (12+16+74+6+26+12 = 146 ≤ 150);
   *  - `dial`: 120px, the whole titleless tile (12+120+12 = 144 ≤ 150) — the
   *    reference stopwatch's layout: a top-aligned reading over two round controls
   *    sitting on the card's floor;
   *  - `picker`: 106px under a title (12+16+106+12 = 146 ≤ 150) — a 2×2 grid of
   *    duration capsules (the 倒计时 card's entry view);
   *  - `dial-head`: the same 106px budget with the DIAL body under a title row, for a
   *    card that runs a countdown and needs its back affordance (`headAction`).
   */
  layout?: 'plain' | 'dial' | 'dial-head' | 'picker'
  /**
   * Duration capsules for `layout: 'picker'`, in display order (2×2, four of them).
   *
   * Each press dispatches `timer:pick:<minutes>`, which sets the length and starts
   * in ONE write (see lib/timer-state.ts) — the label is the big figure the capsule
   * prints (e.g. `5`) and `sub` its small unit line (e.g. `分钟`), so the renderer
   * never formats a duration itself.
   */
  capsules?: Array<{ id: string; minutes: number; label: string; sub: string }>
}

/** A freeform rich block (photo / quote / clock / month calendar / timer). */
export interface WidgetRich {
  type: 'quote' | 'image' | 'clock' | 'calendar' | 'timer'
  text?: string
  src?: string
  /** Quote text alignment (per-card config). */
  align?: 'left' | 'center' | 'right'
  /** Vertical placement of the quote block. */
  valign?: 'top' | 'center' | 'bottom'
  /** Allow line wrapping. */
  wrap?: boolean
  /** type 'clock' — the dial / digital reading (see ClockRich). */
  clock?: ClockRich
  /** type 'calendar' — the month grid (see CalendarRich). */
  calendar?: CalendarRich
  /** type 'timer' — the live countdown / stopwatch reading (see TimerRich). */
  timer?: TimerRich
}

/** A corner action button (two-tap confirm: circle → armed capsule). */
export interface WidgetCorner {
  id: string
  label: string
  armedLabel: string
  armed: boolean
  /** Which corner: top-right (default) or bottom-right. */
  pos?: 'top' | 'bottom'
}

/** Supported card sizes. All cards share one grid-unit height; 2×4 is twice as
 *  wide as 2×2 (2 grid-unit rows tall, 1 wide → the render only differs in
 *  placement/length, never in height). */
export type WidgetSize = '2x2' | '2x4'

/**
 * The glyph a head ring may draw in its middle (see `WidgetRenderOut.headRing`).
 *
 * A closed vocabulary, not a React node: the render output is pure DATA — the
 * offline render gate (G4) snapshots every widget's output as JSON, and the
 * renderer maps each name to one inline SVG from `render/icons.tsx`.
 *  - `database` — a stroked cylinder: the usage / token-store glyph (会话用量's
 *    plan quota; a store of tokens);
 *  - `hard-drive` — a drive body with its bay slot: the 缓存命中 glyph. The
 *    official term for the mechanism is 上下文硬盘缓存 (Context Caching on Disk),
 *    and it is the one shape that cannot be read as "usage" beside `database`.
 *  - `power` — a lightning bolt: a power source. (The owner rejected the battery
 *    shape, 2026-09-29 — the ring's arc already IS the charge level, so a battery
 *    glyph said the same thing twice.)
 *  - `performance` — a heartbeat line: the OS's own 性能 glyph (owner's
 *    reference, 2026-10-03) for the GPU 性能 card, drawn WITHOUT its frame (the
 *    square read as a second circle inside the ring). It names the READING the
 *    arc shows rather than the hardware, which the figure already implies.
 */
export type HeadRingIcon = 'database' | 'hard-drive' | 'power' | 'gauge' | 'performance'

/**
 * A bare glyph in the head's right-hand slot — the same LAYOUT neighbourhood
 * `headRing` owns, for a head whose accessory is an IDENTITY rather than a dial.
 *
 * The distinction matters: a ring is a READING (an arc that means "this much of
 * that"), while these say WHAT the card is about — the permission shield the user
 * already sees in the composer, the vendor mark of the account the card belongs to.
 * Drawing a shield inside a ring would invent a fraction nobody measured, which is
 * why this is a separate field and not `headRing` with the arc switched off.
 *
 * A closed vocabulary for the same reason `HeadRingIcon` is one: the render output
 * is pure DATA (the offline gate snapshots it as JSON), so the renderer maps each
 * name to one inline SVG.
 */
export type HeadIconName =
  | 'permission-read-only'
  | 'permission-workspace-write'
  | 'permission-full-access'
  | 'github'

/** Extra render context. `sim` lets a preview force a widget into a specific
 *  state (e.g. peak-pricing preview toggling EXPENSIVE/CHEAP) so its states can
 *  be reviewed without waiting for the real condition. */
export interface WidgetRenderMeta {
  size?: WidgetSize
  sim?: Record<string, unknown>
}

/**
 * The silhouette a loading skeleton draws (see `WidgetRenderOut.skeletonShape`).
 *
 * One case per card BODY the rail actually seats, so the placeholder wears the
 * shape of the content it stands in for — never a generic stack of grey lines:
 *  - `text`     title + figure pill + body rows (a text-only card);
 *  - `rings`    N square rounded blocks in a row (N donuts / rings);
 *  - `bars`     ONE wide rounded block (a bar chart's plot area);
 *  - `line`     ONE wide rounded block (a sparkline's plot area);
 *  - `heatmap`  ONE wide rounded block (the calendar grid);
 *  - `figures`  N short rounded blocks in a row (a label-over-figure row);
 *  - `quotas`   N wide rounded bars stacked (the segmented quota rows).
 */
export type SkeletonShape = 'text' | 'rings' | 'bars' | 'line' | 'heatmap' | 'figures' | 'quotas'

/**
 * The RUNTIME metadata a unit declares in its `manifest.json` and the shell reads
 * from `WIDGET_RUNTIME` (generated) — see `docs/workflow/03-specification.md`.
 *
 * `source` is the id of a discovered data-source adapter
 * (`src/client/families/<id>/adapter.ts`); the build fails when a manifest names
 * one that does not exist (`scripts/gen-registry.mjs`), so a typo cannot ship a
 * card that waits for ever. The adapter set is discovered, not hard-coded — that
 * is what lets a new source be one family directory.
 */
export interface WidgetRuntimeMeta {
  source?: string
  skeleton?: { shape: SkeletonShape; count?: number; rows?: number }
  /**
   * Non-route data a unit reads, declared so the SHELL can spend it only when some
   * installed card actually renders it.
   *
   * `source` covers host ROUTES (the adapter contract polls a URL). Some data has
   * no route at all — the DSH scheduled-task subsystem is reached through the
   * client Remote face (`ctx.remote.schedule`), which is a live subscription and
   * not a fetchable endpoint. `reads: ['schedule']` is how such a unit says "I read
   * this", so the collector subscribes while one is installed and stays silent
   * otherwise (the same rule `activeAdapters` applies to routes). Unknown names are
   * simply never asked for — a unit cannot make the shell do work by inventing one.
   */
  reads?: string[]
}

/** The card shape a widget render produces. */
export interface WidgetRenderOut {
  /**
   * The card's title — the blue line at the tile's top-left.
   *
   * `''` means **NO TITLE ROW**: `CardBody` then drops the head row entirely (rather
   * than printing a blank 16px strip) and hands the freed height to the body, which
   * is why a title-less card must size its own content to the whole tile. The rule,
   * the two conditions a card must meet (the body names itself AND fills the tile) and
   * the audit of every shipped unit live in `docs/design/CARD-TITLE-STANDARD.md`:
   *  - a DIAL or a MONTH GRID may drop it (they are the content and they fill the box);
   *  - a one-figure / one-row card must keep it — the title row is that tile's top
   *    weight, and removing it leaves a visibly empty card.
   * A card with a `legend` / `headAfter` / `meter` / `headRight` / head accessory keeps
   * THOSE rows; only the empty title line goes.
   */
  title: string
  title2?: string
  /** Optional text shown at the right end of the title row (e.g. ~613K / 1M).
   *  Whenever it is DEFINED the card's `value` moves up into that same row
   *  (instead of sitting in the body) — pass `''` to place the big figure at the
   *  top-right corner with no extra caption of its own. */
  headRight?: string
  /** Optional prominent figure rendered on its own row UNDER the title (e.g. the
   *  context percent, with small figures beside it).
   *
   *  `small` is ONE grey line to the RIGHT of the figure, sharing its baseline
   *  (`smallAlign: 'bottom'` drops it to the row's floor instead, so the line's
   *  bottom edge lines up with the figure's — the 额度管理 card's `账期 10-10`
   *  reads that way); `smallLines` is a STACKED grey block in that same slot, for
   *  a subtitle that is too long to sit beside the figure — the block is CENTRED
   *  on the figure's line box, so its last line never dangles below the figure and
   *  crowds the row underneath. When both are given, `smallLines` wins. */
  headAfter?: { big?: string; small?: string; smallLines?: string[]; smallAlign?: 'baseline' | 'bottom' }
  /** Where the card BODY (the foot: figures, charts, sub) sits once a `headAfter`
   *  row has made the head taller than one line. Default `'top'`: the body starts
   *  right under the head — what an elastic chart (sys-gpu-line) and a rich block
   *  need. `'bottom'` keeps the pre-headAfter posture: the body stays on the
   *  card's floor (`marginTop: auto`) with the head above it, which is what a
   *  short figure row (额度管理) wants. */
  bodyAnchor?: 'top' | 'bottom'
  /** Optional small caption directly under the title that does NOT affect the
   *  vertical alignment (unlike headAfter) — for subtitles like "今日 12.2K". */
  legend?: string
  /**
   * Optional DONUT in the head's right slot (e.g. the cache hit rate), with the
   * head's ladder — title, `headAfter.big`, `legend` — stacked in the LEFT column
   * beside it.
   *
   * The ladder is the SAME three rungs, in the same order, with the same 4px/2px
   * rhythm a head without a ring uses (CardBody defines them once); the ring is a
   * LAYOUT NEIGHBOUR of that ladder, never a second typography for it. The figure
   * therefore comes from `headAfter.big`, NOT from `value`: one field per concept,
   * so `value` keeps its single meaning (the body figure) and a ring head cannot
   * render the same number twice.
   *
   * The ring carries NO figure: a caption inside a 52px circle reads as cramped, and
   * the number is already on the tile at 20px. Its middle holds `icon` and the exact
   * figure rides its hover text (`label`).
   *
   * `tone` is the WIDGET's call, deliberately: for a cache hit rate HIGH is good
   * (green), which is the OPPOSITE of the system rings, where a high number means
   * a busy machine. The renderer therefore never infers a tone from `ratio`.
   */
  headRing?: {
    ratio: number
    /** Arc + icon colour; the widget decides what "good" means. */
    tone?: BarDatum['tone']
    /** Glyph in the middle (see HeadRingIcon); unknown/absent draws a bare ring. */
    icon?: HeadRingIcon
    /** Hover text only — never drawn in the ring (see above). */
    label?: string
    /**
     * Let `ratio` exceed 1 (a quota that can OVERRUN). The first lap closes the ring
     * and the overrun is painted as a second pass from the same origin, so its round
     * tail cap sweeps over the head — the owner's ask for 额度预测 (2026-09-29):
     * 「大于 100 则环形图尾部圆角盖过头部套圈」. Absent = clamped, which is what
     * every other dial wants (a 130% cache-hit rate is not a thing).
     */
    overshoot?: boolean
  }
  /**
   * Optional BARE glyph in the head's right slot (see `HeadIconName`): the card's
   * identity mark, with no arc around it.
   *
   * Mutually exclusive with `headRing` AND with `corner` in practice: the ring shares
   * this slot, and `corner` (the two-tap action capsule) also lives top-right — a
   * card that sets both paints the glyph under the button (seen on a real card during
   * the 2026-09-29 smoke test). The renderer draws whichever is present; picking a
   * combination is the widget's job.
   */
  headIcon?: {
    name: HeadIconName
    /** Mark colour; omit for the neutral label colour. */
    tone?: BarDatum['tone']
  }
  /**
   * Card-level hover tooltip: a diagnostic that must NOT be printed on the tile.
   *
   * The Command Code "not configured" hint is a full sentence (~90 chars); as a
   * `legend` it ellipsized to `未配置 COMMANDCODE…` on every 150px card, which
   * reads as a truncated error rather than a label. The card now keeps a short,
   * honest label (the pool view, e.g. `AllUser`) and the sentence rides here,
   * one hover away. Falls back to `cycle.hint` when both exist.
   */
  cardHint?: string
  /** Optional two-line meter under the title (e.g. peak-pricing windows). The
   *  active line lights up (brand blue, slightly enlarged); idle lines keep the
   *  faint legend look. */
  meter?: Array<{ label: string; active?: boolean }>
  /** The card's figure. It renders in the title row when `headRight` is present
   *  (the official meter header), otherwise in the BODY — and never in a head that
   *  carries a `headRing`, whose figure is `headAfter.big` (see headRing). */
  value?: string
  /** Value color override, in the product's own semantic vocabulary.
   *
   *  The rungs mean what they say and the widget picks one — the renderer never
   *  infers a colour from a number:
   *   - `danger`  — the error red: a state that is already wrong (full access, a
   *                 window over its cap);
   *   - `warn`    — the warning amber: heading somewhere bad but not there yet;
   *   - `success` — the success green: a state that is good because it is SAFE
   *                 (read-only permission);
   *   - `business`— the brand blue: an informational active state that is neither
   *                 good nor bad (workspace-write);
   *   - `muted`   — de-emphasised: the big slot holds nothing but `—`.
   *
   *  It follows the figure into whichever slot that card renders it in — the title
   *  row, `headAfter.big`, or the body. */
  valueTone?: 'danger' | 'warn' | 'success' | 'business' | 'muted'
  /** Slow red blink on the VALUE itself (e.g. peak pricing is live, or a plan
   *  projected past 100%): the text pulses between full and ~35% opacity in the
   *  error red. Text-level escalation — it deliberately does NOT paint the card. */
  valuePulse?: boolean
  sub?: string
  chart?: WidgetChart
  actions?: WidgetAction[]
  rich?: WidgetRich
  /** Top-right corner capsule/round button (e.g. one-click Compact). */
  corner?: WidgetCorner
  /**
   * A LEADING chevron in the title row, with the whole row as its hit area.
   *
   * The 倒计时 card's run view needs a "back to the picker" affordance in the
   * top-left, and `corner`/`actions` are both the wrong slot: the corner is
   * top-RIGHT and an action is a pill on the card's floor. When this is present
   * `CardBody` draws a small chevron before the title and dispatches `id` when the
   * row is clicked (the row keeps its normal look otherwise — the title is still the
   * title). `label` is the hover/aria text, localized by the widget.
   */
  headAction?: { id: string; label: string }
  /** Whole-card tap cycles this card through its pooled key views (usage widgets):
   *  total → Key 1 → Key 2 → … → total. Pressing plays a springy press-down.
   *  `store` names the cardConfigs field the selection persists to (default
   *  'poolView'); sys widgets use their own field (e.g. 'bigMetric') so their
   *  cycle never collides with the usage pool view nor fires multikey calls. */
  cycle?: { modes: string[]; current: string; hint: string; store?: string }
  /**
   * The card's data source has not answered yet: paint the LOADING SKELETON
   * (rounded placeholder pills in the card's own layout rhythm) instead of the
   * body. Only `title` is read from the render in that state.
   *
   * The SHELL decides this, not the widget: a widget cannot tell "my data
   * source is still in flight" from "my data source answered with nothing", and
   * those two deserve different cards (placeholder vs 数据不足).
   */
  skeleton?: boolean
  /**
   * The SILHOUETTE the loading skeleton draws (see SkeletonBody).
   *
   * The placeholder must stand in for the CONTENT, not just the card: a rail of
   * identical grey pills says "something is loading here" but not WHICH card,
   * and the loading → loaded swap then re-shapes the tile. So every family with
   * a live source declares the shape its real body has — three rings, one bar
   * block, one sparkline, a heatmap block, a row of figures, three quota bars —
   * and the skeleton draws that silhouette as rounded blocks.
   *
   * Default `'text'` (title + figure pill + body rows), which is what a
   * text-only card actually looks like.
   */
  skeletonShape?: SkeletonShape
  /** How many repeated units the silhouette has (rings / figures / quota rows).
   *  Default 3. */
  skeletonCount?: number
  /** Placeholder body rows a `'text'` skeleton draws under the value pill.
   *  Default 2. */
  skeletonRows?: number
}

/** A per-card configuration field rendered in the 组件配置 tab. Text fields
 *  are thunks so 组件配置 re-localizes on language switches. */
export interface ConfigField {
  key: string
  label: string | (() => string)
  type: 'text' | 'textarea' | 'toggle' | 'align' | 'valign' | 'mode' | 'metrics'
  default?: string | boolean | string[] | 'left' | 'center' | 'right'
  /** For type 'mode': the selectable options as [value, label] pairs.
   *  For type 'metrics': the SELECTABLE metrics in offer order (the stored
   *  value is an ordered subset of these keys). */
  options?: Array<[string, string | (() => string)]>
  /** For type 'metrics': how many may be selected at once (default 6 — the
   *  density limit a 2×4 figures row can still render legibly). */
  max?: number
  /** Optional helper line under the control, overriding the generic one. A
   *  'metrics' field's stock hint talks about figures folding into two rows of
   *  five, which is wrong for a card whose picks become stacked ROWS (工具调用's
   *  three detail lines) — a widget whose geometry differs says so here instead
   *  of shipping a caption that describes another card. */
  hint?: string | (() => string)
}

/**
 * Widget-owned preview data (「Example」) — what the market / config preview
 * surfaces feed this widget so every state renders without the real condition.
 *
 * Roles (deliberate, see ARCH-001 §14):
 *  - dev reference: a future agent reads `example` to understand the widget's
 *    input shape without running the app;
 *  - preview mock: the shell merges `stats` over the shared preview stats and
 *    seeds `sim` as the initial simulated state.
 *
 * Convention: if `sim` holds exactly ONE boolean value, clicking the preview
 * toggles it (used by stateful widgets like peak-pricing).
 */
export interface WidgetExample {
  /** Extra stats merged over the shared preview stats. `Partial<WidgetStats>`
   *  is not enough for widgets whose preview depends on config (heatmap window
   *  alignment): a function receives the current per-instance config at preview
   *  time and returns the extra stats. */
  stats?: Partial<WidgetStats> | ((config: Record<string, unknown>) => Partial<WidgetStats>)
  /** Initial simulated state served to `render(meta.sim)`.
   *
   *  MUST be the first entry of `simSteps` when `simToggle` is declared and the
   *  state is not a single boolean: `nextSim` locates the CURRENT step by deep
   *  comparison, so a `sim` that is absent from `simSteps` makes the FIRST click a
   *  silent no-op, and with no `simSteps` at all a non-boolean `sim` (a pinned clock,
   *  say) is a no-op on EVERY click — the card advertises 「点击卡片切换」 and nothing
   *  happens. That was a real defect on 峰谷时段表 (2026-09-28, fixed by declaring its
   *  four clock steps). */
  sim?: Record<string, unknown>
  /** Preview states a click ADVANCES through, in order and cyclically. Present
   *  for widgets whose preview has more than two states — the 套餐 card cycles
   *  the plan tiers (GOAT → Pro → Max → …) so every badge can be eyeballed
   *  without a subscription for it. When omitted, a click keeps the original
   *  behaviour: flip the single boolean field of `sim`. `simToggle` is the label
   *  the preview shows either way — so a widget whose `sim` holds no boolean MUST
   *  declare `simSteps` (see `sim` above). */
  simSteps?: Array<Record<string, unknown>>
  /** Optional hint shown under the preview card. */
  note?: string
}

/** The card shape a widget render produces. */
export interface Widget {
  id: string
  name: string | (() => string)
  desc: string | (() => string)
  builtin: boolean
  group?: string
  /** Sizes this widget supports. Defaults to ['2x2'] when omitted. */
  sizes?: WidgetSize[]
  render: (stats: WidgetStats, meta?: WidgetRenderMeta) => WidgetRenderOut | null
  /** When set (label text), the preview surfaces let you click the card to flip
   *  the widget's simulated state (e.g. peak-pricing 高峰/低峰). Only declare it when
   *  a click can actually change something: either `sim` carries a boolean field, or
   *  `simSteps` is declared (see them above — otherwise the affordance is a lie). */
  simToggle?: string | (() => string)
  /** Optional per-card customization fields (shown in 组件配置 when chosen). */
  configSchema?: ConfigField[]
  /** Widget-owned preview data (see WidgetExample). */
  example?: WidgetExample
  /** Reserved: template units are NEVER registered (kept out of the discovery
   *  root structurally; this flag is belt-and-braces for tooling). */
  template?: boolean
}
