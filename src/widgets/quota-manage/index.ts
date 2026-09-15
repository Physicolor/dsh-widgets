/**
 * 额度管理 (quota-manage) — Coding Plan card, laid out as:
 *
 *   「额度管理            115.5%」   title left, projected percent top-right
 *   「账期至 10月10日」             the billing-period line under the title
 *   「今日用量 / 今日推荐」          today's tokens beside the day's budget
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
 * The plan numbers come from the Command Code account payload through
 * `cc-view`'s monthly window (the same official-matching percent the
 * cc-window-monthly card prints) and the shared daily token log; the math lives
 * in `client/lib/quota-math` (pure, probe-able). Any missing input renders
 * 数据不足 instead of an invented quota.
 */

import { defineWidget, type WidgetRenderMeta, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { monthlyWindow } from '../../client/lib/cc-view'
import { fmtQuota, planQuota } from '../../client/lib/quota-math'

const DAY_MS = 86_400_000
/** The sim multiplier for the over-budget preview state (135% of the month). */
const SIM_OVER = 1.35

/** `MM-DD` split for the localized 账期 line. */
function periodParts(iso: string): { m: string; d: string } {
  return { m: String(Number(iso.slice(5, 7))), d: String(Number(iso.slice(8, 10))) }
}

/** The card's second line. Kept deliberately SHORT (`账期 10-10`, not
 *  `账期至 10月10日`): at 10px the card's content box holds ~12 full-width
 *  glyphs, and a verbose date line was the longest thing on the card. */
function periodLine(iso: string): string {
  const { m, d } = periodParts(iso)
  return t('widget.quota-manage.periodEnd', { m, d })
}

function quotaRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const title = t('widget.quota-manage.name')
  const missing = t('widget.quota-manage.insufficient')
  const cc = stats.commandCode
  const month = monthlyWindow(cc ?? null)
  const plan = planQuota({
    usedPct: month?.pct,
    allowanceCredits: month?.cap,
    periodStart: cc?.subscription?.data?.currentPeriodStart,
    periodEnd: cc?.subscription?.data?.currentPeriodEnd,
    remainingCredits: cc?.credits?.credits?.monthlyCredits,
    consumedCredits: cc?.usage?.totalCost,
    daily: stats.heatmapRaw,
  }, new Date())
  if (plan === null) {
    // `headRight: ''` keeps the big figure's top-right slot even when empty, so
    // the missing-data card is laid out exactly like the live one.
    return { title, headRight: '', value: missing }
  }
  // Preview-only simulated state (market / 组件配置): click the card to see the
  // over-budget escalation without waiting for a real overrun.
  const simOver = meta?.sim?.over === true
  const over = plan.projectedPct > 100 || simOver
  const projected = simOver ? Math.max(plan.projectedPct, SIM_OVER * 100) : plan.projectedPct
  return {
    title,
    // Head row: title left, projected percent hard right (no separate caption).
    // Whole percent: a projection has no meaningful tenth, and the shorter string
    // is what keeps the title from being squeezed on a 150px card.
    headRight: '',
    value: `${Math.round(projected)}%`,
    // Text-level escalation: red + blink on the figure, never a card-wide glow.
    valueTone: over ? 'danger' : undefined,
    valuePulse: over,
    legend: periodLine(plan.periodEndIso),
    chart: {
      kind: 'figures',
      figures: [
        { label: t('widget.quota-manage.used'), value: fmtQuota(plan.todayTokens) },
        { label: t('widget.quota-manage.recommend'), value: plan.todayRecommend === null ? '—' : fmtQuota(plan.todayRecommend) },
      ],
    },
  }
}

/** Widget-owned preview: a live-shaped account (period ending 26 days out) plus
 *  a deterministic 14-day log, so the preview shows plausible M figures instead
 *  of the shared mock's tiny token counts. The balance sits where the run-rate
 *  projects a calm ~59% month, so the card's over-budget state is the one the
 *  preview click adds. */
function previewStats(): Partial<WidgetStats> {
  const now = new Date()
  const daily: Record<string, number> = {}
  let periodTotal = 0
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i))
    const v = i === 13 ? 120_000_000 : 90_000_000 + ((i * 137) % 44) * 8_000_000
    daily[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = v
    if (i >= 9) periodTotal += v
  }
  // 89M local tokens per credit ≈ the account's realised 2026-09 rate.
  const consumed = periodTotal / 89_000_000
  return {
    heatmapRaw: daily,
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
