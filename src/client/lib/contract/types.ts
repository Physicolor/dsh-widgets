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

/** The payload of the host `/api/github` route. Every slice is independently
 *  nullable: the contribution calendar and the repo list are fetched (and
 *  cached) separately, so a slow scrape never delays the repo numbers. */
export interface GitHubData {
  auth: GitHubAuth
  /** The login the calendar was actually built for — the configured `user`, or
   *  (when that is empty) whoever the resolved token belongs to. Empty when
   *  there was no token and no configured user. */
  login: string
  contributions: GitHubContributions | null
  repos: GitHubRepo[]
  /** Per-slice failure notes, e.g. `{ contributions: 'rate-limit' }`, or
   *  `no-user` / `no-repo` when an empty config could not be resolved. */
  errors: Record<string, string>
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
}

/** Session stats a widget render can read. */
export interface WidgetStats {
  turns: number
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
  /** Id of the currently armed (awaiting second tap) action, if any. */
  armedAction?: string | null
  /** Current task list (todos projection): status is pending | in_progress | completed. */
  todos?: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed' }> | null
  /** Rolling window of the live conversation trajectory (oldest first, newest
   *  last, at most `TRAJECTORY_WINDOW` beats). Re-derived on every node/timeline
   *  change, so in-flight model steps and tool calls appear as they run. */
  trajectory?: TrajectoryBeat[]
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

/** One bar for a mini bar chart. */
export interface BarDatum {
  label: string
  value: number
  /** 0..1 used for the fill ratio; falls back to value/max when absent. */
  ratio?: number
  tone?: 'primary' | 'success' | 'warn' | 'danger' | 'muted'
}

/** A chart block a card body can render (declarative, theme tokens only). */
export interface WidgetChart {
  kind: 'bars' | 'ring' | 'rings' | 'line' | 'segments' | 'heatmap' | 'barsV' | 'figures' | 'lanes' | 'quotas'
  bars?: BarDatum[]
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
  rings?: Array<{ label: string; value: number; ratio?: number; tone?: 'primary' | 'success' | 'warn' | 'danger' | 'muted'; decimals?: number; name?: string }>
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
  segments?: Array<{ label: string; tokens: number; tone: 'primary' | 'success' | 'muted' | 'warn' }>
  totalTokens?: number
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
}

/** An interactive action on a card (e.g. one-click Compact). */
export interface WidgetAction {
  id: string
  label: string
  kind?: 'primary' | 'danger' | 'ghost'
  /** Two-step confirm: first click arms, second click fires. */
  confirmHint?: string
}

/** A freeform rich block (photo / quote / inspiration). */
export interface WidgetRich {
  type: 'quote' | 'image'
  text?: string
  src?: string
  /** Quote text alignment (per-card config). */
  align?: 'left' | 'center' | 'right'
  /** Vertical placement of the quote block. */
  valign?: 'top' | 'center' | 'bottom'
  /** Allow line wrapping. */
  wrap?: boolean
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

/** The card shape a widget render produces. */
export interface WidgetRenderOut {
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
  value?: string
  /** Value color override (e.g. 'danger' renders the value in the error red,
   *  used by the peak-pricing EXPENSIVE state). It follows the figure into
   *  whichever slot that card renders it in — the title row, `headAfter.big`, or
   *  the body. */
  valueTone?: 'danger'
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
  /** Initial simulated state served to `render(meta.sim)`. */
  sim?: Record<string, unknown>
  /** Preview states a click ADVANCES through, in order and cyclically. Present
   *  for widgets whose preview has more than two states — the 套餐 card cycles
   *  the plan tiers (GOAT → Pro → Max → …) so every badge can be eyeballed
   *  without a subscription for it. When omitted, a click keeps the original
   *  behaviour: flip the single boolean field of `sim`. `simToggle` is the label
   *  the preview shows either way. */
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
  badgeLabel?: string | (() => string)
  /** Sizes this widget supports. Defaults to ['2x2'] when omitted. */
  sizes?: WidgetSize[]
  render: (stats: WidgetStats, meta?: WidgetRenderMeta) => WidgetRenderOut | null
  /** When set (label text), the preview surfaces let you click the card to flip
   *  the widget's simulated state (e.g. peak-pricing 高峰/低峰). */
  simToggle?: string | (() => string)
  /** Optional per-card customization fields (shown in 组件配置 when chosen). */
  configSchema?: ConfigField[]
  /** Widget-owned preview data (see WidgetExample). */
  example?: WidgetExample
  /** Reserved: template units are NEVER registered (kept out of the discovery
   *  root structurally; this flag is belt-and-braces for tooling). */
  template?: boolean
}
