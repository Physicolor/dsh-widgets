/**
 * DeepSeek 余额 (deepseek-balance) — the official platform balance, the day's
 * burn, and what the current conversation has spent from it.
 *
 * WHY THIS CARD EXISTS: the DeepSeek open platform exposes exactly one account
 * read (`GET /user/balance`), and nothing on this rail showed it. Every other
 * money card here answers a DIFFERENT question — `session-cost` prices this
 * session, `cc-*` reads a Command Code plan's allowance, `usage-*` counts tokens —
 * so "how much is left on my DeepSeek account" had no home.
 *
 * THE FOUR ELEMENTS, AND WHY EACH SITS WHERE IT DOES:
 *   `DeepSeek 余额`   the blue title (the account, not the widget's market name);
 *   `¥110`            the FIGURE row — `headAfter.big`, the official total balance;
 *   `12s 前更新 · …`  the grey caption — the sample's AGE first (the balance is a
 *                     sampled number and the age is part of reading it), then the
 *                     granted credit when the account has one. A permanent `¥0`
 *                     row for an account with no grant would be noise;
 *   the three rows    the account's own parts, on the card's floor
 *                     (`bodyAnchor: 'bottom'`, the posture every detail-row card
 *                     here uses): 充值余额 / 今日消耗 / 对话消耗.
 *
 * `今日消耗` IS A MEASUREMENT, NOT A BILL, and the README says so where the user
 * can find it: DeepSeek publishes no usage endpoint, so the HOST times the balance
 * (see `src/host/deepseek.ts`) and accumulates the drops it observed today. The
 * hover text says exactly that, because a figure that reads like a bill and is
 * really an observation must not be left to look like one.
 *
 * `对话消耗` reuses `session-cost`'s pure pricing functions rather than copying
 * them; if the two cards ever disagree, the disagreement is the price table.
 */
import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { deepseekConfigSchema, deepseekPreviewStats } from '../../client/families/deepseek/data'
import { deepseekBalanceRender } from '../../client/families/deepseek/renders'

export default defineWidget({
  id: 'deepseek-balance',
  name: () => t('widget.deepseek-balance.name'),
  desc: () => t('widget.deepseek-balance.desc'),
  builtin: false,
  group: 'deepseek',
  sizes: ['2x2'],
  configSchema: deepseekConfigSchema(),
  simToggle: () => t('widget.deepseek-balance.simToggle'),
  render: deepseekBalanceRender,
  // Four preview states, and the FIRST is the `sim` the shell uses: a click walks
  // healthy → below threshold (amber) → below half (red) → no key configured. The
  // clock is pinned to the off-peak band `session-cost`'s preview also uses, so
  // 对话消耗 is the same ≈$0.131 in both screenshots and a peak-band regression
  // would show up as a changed number rather than as flakiness.
  example: {
    stats: deepseekPreviewStats,
    sim: { at: '2026-09-28T05:00:00Z' },
    simSteps: [
      { at: '2026-09-28T05:00:00Z' },
      // Between the threshold (10) and twice it: the warning rung.
      { at: '2026-09-28T05:00:00Z', balance: 15, spentToday: 9.4 },
      // Under the threshold: the danger rung.
      { at: '2026-09-28T05:00:00Z', balance: 6.4, spentToday: 12.6 },
      // The empty state the card wears when there is no key on this machine.
      { error: 'unconfigured' },
    ],
  },
})
