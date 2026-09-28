import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtTokens } from '../../client/lib/format'

/**
 * Cache hit — the「Token 用量」element the user specified (2026-09-28),第二版:
 * the hit rate as a HEAD DONUT (green when high, red when low) with the session's
 * token total stacked under the blue title, and the three input/output buckets as
 * a label/value breakdown under a hairline divider.
 *
 * TONE DIRECTION — the whole point of the ring: for a cache hit rate HIGH IS GOOD,
 * so 99% is GREEN. That is the OPPOSITE of the system-monitor rings (sys-cpu /
 * sys-gpu / sys-rings), where a high number means a busy machine and turns red.
 * The renderer never guesses this; the thresholds live here, in the widget that
 * knows what the number means.
 *
 * `uncached` is `inputTokens − cacheReadTokens`, deliberately: the collector folds
 * the cache-WRITE bucket into `inputTokens` (DeepSeek bills a write at the miss
 * rate — its pricing page has no separate write line), so the row is exactly
 * "input billed at the miss price".
 *
 * The MONEY column arrives in the next step (the host prices the buckets from the
 * table usage-center already owns); until then the card prints tokens only — an
 * estimate is never invented here.
 */

/** 命中率 → 语气：越高越好。≥80% 绿、≥50% 琥珀、其余红。 */
const TONE_STEPS: ReadonlyArray<readonly [number, 'success' | 'warn' | 'danger']> = [
  [80, 'success'],
  [50, 'warn'],
  [0, 'danger'],
]

/** The tone for a hit rate (0..1) under the 越高越好 rule above. */
function cacheTone(ratio: number): 'success' | 'warn' | 'danger' {
  const pct = ratio * 100
  for (const [min, tone] of TONE_STEPS) {
    if (pct >= min) return tone
  }
  return 'danger'
}

export default defineWidget({
  id: 'cache',
  name: () => t('widget.cache.name'),
  desc: () => t('widget.cache.desc'),
  builtin: true,
  group: 'system',
  render: (s) => {
    const u = s.usage
    // Hidden until an input AND a cache read have been observed (the shipped
    // card's own gate): a fresh session must not advertise a 0% hit rate.
    if (!u || u.inputTokens <= 0 || u.cacheReadTokens <= 0) return null
    const hit = u.cacheReadTokens
    const uncached = Math.max(0, u.inputTokens - hit)
    const output = u.outputTokens || 0
    const ratio = hit / u.inputTokens
    const pct = ratio * 100
    return {
      title: t('widget.cache.name'),
      // The head's ladder, one rung per field: the blue title above, the figure
      // (`headAfter.big` — the SAME field a head without a ring uses) and the grey
      // caption (`legend`) below. `value` is deliberately NOT set: with a headRing it
      // would have no owner, and without one it would be pushed into the body.
      headAfter: { big: `${Math.round(pct)}%` },
      legend: `${fmtTokens(u.inputTokens + output)} ${t('card.cache.unit')}`,
      // The three rows (and their hairline divider) sit on the card's floor, the same
      // posture as 会话 Token: a `headAfter` head alone would leave them right under
      // the caption with the slack BELOW them.
      bodyAnchor: 'bottom',
      headRing: {
        ratio,
        tone: cacheTone(ratio),
        icon: 'database',
        // Hover only: the tile rounds to whole percent, the tooltip does not.
        label: `${pct.toFixed(1)}%`,
      },
      chart: {
        kind: 'breakdown',
        breakdown: [
          { label: t('card.cache.uncached'), value: fmtTokens(uncached) },
          { label: t('card.cache.read'), value: fmtTokens(hit) },
          { label: t('card.cache.output'), value: fmtTokens(output) },
        ],
      },
    }
  },
})
