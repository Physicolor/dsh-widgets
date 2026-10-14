/**
 * dsh-widgets — the DeepSeek balance card's drawing.
 *
 * THE CARD IN ONE SENTENCE: the platform balance as the headline figure, what the
 * day has burnt under it, and the three parts of the account those numbers come
 * from — 充值余额 / 今日消耗 / 对话消耗.
 *
 * WHAT IS OFFICIAL AND WHAT IS MEASURED. `total` / `toppedUp` / `granted` are the
 * vendor's own numbers, passed through. `spentToday` is NOT: the official balance
 * endpoint publishes no usage, so the host measures it by sampling the balance and
 * accumulating the drops (see `src/host/deepseek.ts`). That difference is stated on
 * hover rather than hidden, because a figure that looks like a bill and is really
 * an observation is the kind of number this repo refuses to print bare.
 *
 * WHY 对话消耗 REUSES `session-cost`'s MATH. It is the same question that card
 * answers (this session, folded to money through the price rule that matches its
 * route), so it imports the very same pure functions instead of copying 500 lines
 * of rule selection. The balance card is the only place where that reading sits
 * BESIDE the account it is spending from; `session-cost` remains the card that
 * also prints the per-bucket breakdown and the rule's provenance. If the two ever
 * disagree, the disagreement is the price table, not two implementations of it.
 *
 * TONE IS A LEVEL HERE, and this is the one card in the family allowed to use it:
 * a balance under the user's own threshold is a state that is already wrong
 * (danger), under twice it is heading there (warn). Nothing else on the card is
 * coloured — 充值 / 今日消耗 / 对话消耗 are readings, and spending more is not bad.
 */
import type { WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../lib/contract/types'
import { t } from '../../i18n'
import { fmtTokens } from '../../lib/format'
import { fmtMoney, priceSession, selectPriceRule, splitUsage, totalTokens } from '../../../widgets/session-cost/pricing'
import { deepseekHint, deepseekShort, fmtUpdated, lowThreshold } from './data'

/** A preview's numeric override, or null when it did not pin this field. */
function simNumber(sim: Record<string, unknown>, key: string): number | null {
  const v = sim[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** `DeepSeek 余额` — the card, as one pure function of the merged stats.
 *
 *  `meta.sim` is preview-only (the rail never passes it) and pins the three things
 *  a screenshot would otherwise depend on: the price clock (`at`, the same key
 *  `session-cost` uses, so the peak band is reproducible), the balance to show
 *  (`balance`) and the day's spend (`spentToday`) — which is how the market and
 *  组件配置 can walk the low-balance colouring without an empty account. */
export function deepseekBalanceRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const title = t('deepseek.title')
  const sim = (meta?.sim ?? {}) as Record<string, unknown>
  const pinned = typeof sim.at === 'string' ? Date.parse(sim.at) : Number.NaN
  // TWO clocks, on purpose. `priceNow` is the band the session is folded at and a
  // preview may pin it (`sim.at`, the key `session-cost` also uses) so a peak-band
  // screenshot is reproducible. The sample's AGE is always measured against the
  // real clock: pinning the price clock must not make a fresh balance look days old.
  const priceNow = new Date(Number.isFinite(pinned) ? pinned : Date.now())

  const balance = stats.deepseekBalance ?? null
  const simError = typeof sim.error === 'string' ? sim.error : null
  // NO BALANCE AT ALL — the route has not answered, or answered with a state the
  // user must act on. The card stays on the rail with its own sentence: a card
  // that vanishes and reappears would move every other card (see the unit README).
  //
  // The dash goes in the FIGURE slot (`headAfter.big`, not `value`): the number's
  // place is the balance's place, so a card that has no balance keeps the same
  // geometry it has when it does — and `valueTone: 'muted'` is the contract's own
  // name for exactly this state ("the big slot holds nothing but —"). The grey line
  // carries the SHORT label; the hover text carries the actionable sentence.
  if (simError !== null || balance === null || balance.available !== true) {
    return {
      title,
      headAfter: { big: '—' },
      valueTone: 'muted',
      legend: deepseekShort(stats, simError),
      cardHint: deepseekHint(stats, simError),
    }
  }

  const currency = balance.currency
  const total = simNumber(sim, 'balance') ?? balance.total
  const spentToday = simNumber(sim, 'spentToday') ?? balance.spentToday
  const low = lowThreshold(stats)
  // `hasBalance: false` is the vendor saying the account cannot call the API any
  // more — already wrong, so it outranks the user's own threshold.
  const tone: WidgetRenderOut['valueTone'] = balance.hasBalance === false || total < low
    ? 'danger'
    : total < low * 2 ? 'warn' : undefined

  // ---- 对话消耗: this session, priced through the rule that matches its route.
  // The clock is the pinned one so a peak-band fold is reproducible; a session
  // with no tokens yet has nothing to price and prints a quiet dash.
  const usage = stats.usage
  const buckets = splitUsage(usage)
  const sessionTokens = totalTokens(buckets)
  const table = stats.pricing ?? null
  const route = stats.modelSelection?.next ?? stats.modelSelection?.lastUsed ?? null
  const rule = sessionTokens > 0 ? selectPriceRule(table, route, priceNow) : null
  const price = rule === null ? null : priceSession(rule, usage, priceNow, table?.currency ?? null)
  const sessionSpend = sessionTokens === 0
    ? '—'
    // No rule ⇒ no money (this repo's rule): the token total is printed WITH its
    // unit instead, which is a different reading and says so.
    : price === null
      ? `${fmtTokens(sessionTokens)} ${t('deepseek.tokens')}`
      : `${price.estimated ? '≈' : ''}${fmtMoney(price.amount, price.currency)}`

  // ---- The grey line under the title: the sample's AGE first, then the granted
  // credit when there is one (a row for a permanent ¥0 would be noise). The age
  // leads because it is the fact that must survive an ellipsis: the balance is a
  // sampled number, and how old the sample is decides how much it means.
  const legendParts: string[] = []
  const updated = fmtUpdated(balance.sampledAt, Date.now())
  if (updated !== '') legendParts.push(updated)
  if (balance.granted > 0) legendParts.push(`${t('deepseek.granted')} ${fmtMoney(balance.granted, currency)}`)

  // ---- One hover sentence, in priority order: the most actionable thing first.
  const cardHint = balance.hasBalance === false
    ? t('deepseek.insufficientHint')
    : tone === 'danger' || tone === 'warn'
      ? t('deepseek.lowHint', { low: fmtMoney(low, currency) })
      : spentToday > 0
        ? t('deepseek.spentHint')
        : price?.estimated === true ? t('deepseek.estHint') : undefined

  return {
    title,
    headAfter: { big: fmtMoney(total, currency), small: balance.hasBalance === false ? t('deepseek.insufficient') : undefined },
    legend: legendParts.length > 0 ? legendParts.join(' · ') : undefined,
    valueTone: tone,
    // Head on top, the three account figures on the floor — the posture every
    // detail-row card in this repo uses.
    bodyAnchor: 'bottom',
    cardHint,
    chart: {
      kind: 'breakdown',
      breakdown: [
        { label: t('deepseek.toppedUp'), value: fmtMoney(balance.toppedUp, currency) },
        { label: t('deepseek.spentToday'), value: fmtMoney(spentToday, currency) },
        { label: t('deepseek.sessionSpend'), value: sessionSpend },
      ],
    },
  }
}
