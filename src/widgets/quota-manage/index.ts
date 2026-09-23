/**
 * 额度管理 (quota-manage) — Coding Plan card, laid out as:
 *
 *   「额度管理」                    blue title
 *   「115%  账期 10-10」            big figure under the title, the grey 账期 line
 *                                  to its RIGHT, bottom-aligned with the figure
 *   「今日用量 24.7M  今日推荐 200M」  today's tokens beside the day's budget
 *
 * The pool view is NOT labelled on the head (the stacked `AllUser` + 账期 block was
 * rejected as ugly): tapping the card still cycles the pool, the figures just move
 * with it silently.
 *
 * The percent is a RUN-RATE projection of the month end: percent consumed so
 * far ÷ elapsed share of the period (one day at 3% ⇒ thirty days at 90%). The
 * budget is the remaining balance converted at the period's realised local
 * token-per-credit rate and split over the days left, so following it lands the
 * period at exactly 100%.
 *
 * Past 100% the number itself escalates: error red + a slow blink
 * (`valuePulse`) — deliberately NOT a card-wide red glow.
 *
 * The card never prints an error message — whatever is missing is FILLED. No
 * payload yet → `-%` beside the 账期 line it can still read; a period too young
 * to project (a pool member added today) → its real consumed percent, its real
 * budget, and 0 tokens; an unused member → zeros everywhere except the budget,
 * which is remaining credits ÷ days left at the POOL's realised rate (it has no
 * rate of its own yet).
 *
 * The plan numbers come from the Command Code account payload through
 * `cc-view`'s monthly window (the same official-matching percent the
 * cc-window-monthly card prints) and the shared daily token log SCOPE-LIMITED to
 * the Command Code route; the math lives in `client/lib/quota-math` (pure,
 * probe-able).
 *
 * Scope: every token figure here is the machine's log folded to the
 * `commandcode` route alone (`stats.commandCodeDaily`, served by
 * `/api/widgets-usage-daily?provider=commandcode`). The card's credits and
 * billing period describe that ONE plan, so reading the machine-wide log charged
 * it for every other provider the harness talked to that day (measured
 * 2026-09-20: 今日用量 758M where the plan itself served 474M — the rest was a
 * parallel OpenCode Go pool). When that scoped map is unavailable the token
 * figures print `—`, never a number measured on the wrong traffic.
 */

import { defineWidget, type WidgetRenderMeta, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { ccView, cycleFor, monthlyWindow } from '../../client/lib/cc-view'
import { fmtQuota, localDayKey, logCoversSince, loggedTokensIn, planQuota } from '../../client/lib/quota-math'

const DAY_MS = 86_400_000
/** The sim multiplier for the over-budget preview state (135% of the month). */
const SIM_OVER = 1.35

/** `MM-DD` split for the localized 账期 line — the LOCAL day of the instant. */
function periodParts(iso: string): { m: string; d: string } {
  const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (hit === null) return { m: '-', d: '-' }
  // A timestamp names an INSTANT and the reset it counts down to happens on the
  // local clock, so the line prints the local day (slicing the string printed
  // the UTC day — a day off for any reset landing in the local evening). A
  // date-only string already names a calendar day.
  if (iso.length > 10) {
    const ms = Date.parse(iso)
    if (Number.isFinite(ms)) {
      const d = new Date(ms)
      return { m: String(d.getMonth() + 1), d: String(d.getDate()) }
    }
  }
  return { m: String(Number(hit[2])), d: String(Number(hit[3])) }
}

/** The card's 账期 line. Kept deliberately SHORT (`账期 10-10`, not
 *  `账期至 10月10日`): at 10px the grey slot holds ~11 full-width glyphs, and a
 *  verbose date line was the longest thing on the card. */
function periodLine(iso: string): string {
  const { m, d } = periodParts(iso)
  return t('widget.quota-manage.periodEnd', { m, d })
}

/** The period end this payload describes, as an ISO string (or null). */
function periodEndOf(cc: { subscription?: { data?: { currentPeriodEnd?: string } | null } | null } | null | undefined): string | null {
  const iso = cc?.subscription?.data?.currentPeriodEnd
  return typeof iso === 'string' && iso.length >= 10 ? iso : null
}

/**
 * The rate an unused pool member may borrow for its BUDGET: the pool's realised
 * local-token-per-credit rate (Σ logged tokens ÷ Σ credits consumed over the
 * pool's own period). Null when no member has consumed anything. The PACE never
 * borrows it — projecting the machine's usage onto an account that has served
 * nothing would invent a number.
 *
 * Each member is measured over ITS OWN period, and the two sums are taken over
 * the same members: one window for the whole pool paired the machine's log from
 * the OLDEST member's start with every member's spend, so a key that reset this
 * morning inherited weeks of tokens it never served (and the pool's rate — hence
 * the borrowed budget — moved whenever any member rolled over). A member whose
 * period the log cannot price is skipped rather than counted with a numerator it
 * never saw (`logCoversSince`).
 *
 * `daily` is the Command Code-SCOPED log (see the card's scope note): a
 * machine-wide one makes the rate — and with it every budget on the card — wrong
 * by whatever another provider spent in the same window.
 */
function poolTokensPerCredit(stats: WidgetStats, daily: unknown, now: Date): number | null {
  const keys = stats.commandCode?.keys ?? []
  let tokens = 0
  let consumed = 0
  for (const k of keys) {
    const spent = k.data?.usage?.totalCost
    if (typeof spent !== 'number' || !Number.isFinite(spent) || !(spent > 0)) continue
    const start = k.data?.subscription?.data?.currentPeriodStart
    if (!logCoversSince(daily, start, now)) continue
    tokens += loggedTokensIn(daily, start, now)
    consumed += spent
  }
  return consumed > 0 && tokens > 0 ? tokens / consumed : null
}

function quotaRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const title = t('widget.quota-manage.name')
  // Same pool view as the Command Code family, so a tap switches both together
  // (and `AllUser` measures the month against the SUM of the pool's plans).
  const view = ccView(stats)
  const cycle = cycleFor(view)
  const cc = view.data
  const now = new Date()
  const month = monthlyWindow(cc ?? null)
  // The token side is measured on the Command Code route ALONE. An empty map is
  // treated as absent: it cannot price anything, and falling back to the
  // machine-wide log is exactly the bug this scoping fixes.
  const daily = stats.commandCodeDaily !== undefined && stats.commandCodeDaily !== null && Object.keys(stats.commandCodeDaily).length > 0
    ? stats.commandCodeDaily
    : undefined
  const plan = planQuota({
    usedPct: month?.pct,
    allowanceCredits: month?.cap,
    periodStart: cc?.subscription?.data?.currentPeriodStart,
    periodEnd: cc?.subscription?.data?.currentPeriodEnd,
    remainingCredits: cc?.credits?.credits?.monthlyCredits,
    consumedCredits: cc?.usage?.totalCost,
    daily,
    // Only a per-account view needs it: an unused member has no rate of its own,
    // while the AllUser aggregate's rate already pools every member.
    fallbackTokensPerCredit: view.multi && view.mode !== 'AllUser' ? poolTokensPerCredit(stats, daily, now) : undefined,
  }, now)

  // The figure the card leads with: the month-end projection when one is
  // derivable; otherwise the percent consumed so far — a young period (a pool
  // member added today) has no pace to extrapolate, but its 0.0% is real; and
  // `-%` when even that is unknown (no payload yet).
  const shownPct = plan === null ? month?.pct ?? null : plan.projectable ? plan.projectedPct : plan.usedPct
  // Preview-only simulated state (market / 组件配置): click the card to see the
  // over-budget escalation without waiting for a real overrun.
  const simOver = meta?.sim?.over === true
  const over = (shownPct !== null && shownPct > 100) || simOver
  const shown = simOver && shownPct !== null ? Math.max(shownPct, SIM_OVER * 100) : shownPct
  const big = shown === null ? '-%' : plan !== null && plan.projectable && !simOver ? `${Math.round(shown)}%` : `${shown.toFixed(1)}%`

  const period = periodEndOf(cc)
  // The grey slot carries the 账期 line ALONE, on the head row's FLOOR so its
  // bottom edge lines up with the big figure's (`smallAlign: 'bottom'`). The pool
  // view name used to ride above it as a stacked two-line block; that stack was
  // rejected as ugly, and the pool is still switched by tapping the card — it is
  // simply no longer labelled on the head.
  const grey = period !== null ? periodLine(period) : null

  // Today's tokens come from the log FOLDED TO THIS PLAN'S ROUTE, so they degrade
  // to the raw day row only when the payload itself is unreadable (and to `—`
  // when the scoped map is unavailable at all — the machine-wide figure would be
  // another plan's tokens as much as this one's).
  const todayFromLog = (() => {
    if (daily === undefined) return '—'
    if (plan !== null) return fmtQuota(plan.todayTokens)
    const v = daily[localDayKey(now)]
    return typeof v === 'number' ? fmtQuota(v) : '0'
  })()

  return {
    title,
    headAfter: { big, ...(grey !== null ? { small: grey, smallAlign: 'bottom' as const } : {}) },
    // The two token figures keep the card's FLOOR (the posture every other card
    // has): the head is the title + the figure row, nothing else.
    bodyAnchor: 'bottom',
    // Text-level escalation: red + blink on the figure, never a card-wide glow.
    valueTone: over ? 'danger' : undefined,
    valuePulse: over || undefined,
    chart: {
      kind: 'figures',
      figures: [
        { label: t('widget.quota-manage.used'), value: todayFromLog },
        { label: t('widget.quota-manage.recommend'), value: plan?.todayRecommend == null ? '—' : fmtQuota(plan.todayRecommend) },
      ],
    },
    cycle,
  }
}

/** Widget-owned preview: a live-shaped account (period ending 26 days out) plus
 *  a deterministic 14-day log, so the preview shows plausible M figures instead
 *  of the shared mock's tiny token counts. The pace is sized so the run-rate
 *  projects a CALM month (measured 2026-09-20: ≈70%, so the default preview is
 *  not already in the red) — the over-budget state is the one the preview click
 *  adds. */
function previewStats(): Partial<WidgetStats> {
  const now = new Date()
  const daily: Record<string, number> = {}
  let periodTotal = 0
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i))
    const v = i === 13 ? 90_000_000 : 60_000_000 + ((i * 137) % 44) * 4_000_000
    daily[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = v
    if (i >= 9) periodTotal += v
  }
  // 89M local tokens per credit ≈ the account's realised 2026-09 rate.
  const consumed = periodTotal / 89_000_000
  return {
    heatmapRaw: daily,
    // The card's own scope: the same preview log, standing in for the
    // `commandcode`-only map the host serves.
    commandCodeDaily: daily,
    commandCode: {
      whoami: null,
      usage: { totalCost: consumed, totalTokens: periodTotal, totalMonthlyCredits: consumed },
      credits: { credits: { monthlyCredits: 64.5 } },
      subscription: {
        success: true,
        data: {
          planId: 'individual-goat',
          status: 'active',
          currentPeriodStart: new Date(now.getTime() - 4 * DAY_MS).toISOString(),
          currentPeriodEnd: new Date(now.getTime() + 26 * DAY_MS).toISOString(),
        },
      },
    },
  }
}

export default defineWidget({
  id: 'quota-manage',
  name: () => t('widget.quota-manage.name'),
  desc: () => t('widget.quota-manage.desc'),
  builtin: true,
  group: 'coding-plan',
  render: quotaRender,
  simToggle: () => t('widget.quota-manage.simToggle'),
  example: { stats: previewStats, sim: { over: false } },
})
