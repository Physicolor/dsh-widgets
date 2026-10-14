/**
 * dsh-widgets — the DeepSeek balance family's shared view helpers.
 *
 * One card reads ONE host payload (`/api/deepseek-balance`), so this module holds
 * everything about how that payload becomes a card EXCEPT the drawing: the
 * per-instance alert threshold, the freshness line, the sentence a card shows
 * when there is no balance to show, and the mock a preview renders from.
 *
 * The dictionary keys live in the unit's own `manifest.json`
 * (`src/widgets/deepseek-balance`), which is where this repo keeps every string a
 * widget can print.
 */
import type { ConfigField, WidgetStats } from '../../lib/contract/types'
import { t } from '../../i18n'
import { fmtAgo, dayKey } from '../../lib/format'

/** Default alert threshold, in the payload's own currency: below it the figure
 *  turns red, below twice it amber. ¥10 / $10 is "one more conversation" for both
 *  of the currencies this account can be denominated in, which is the only
 *  meaning a threshold has — a LEVEL, not a measurement. */
export const DEFAULT_LOW = 10

/** The card's one setting: where "low balance" starts. */
export function deepseekConfigSchema(): ConfigField[] {
  return [{
    key: 'low',
    label: () => t('card.deepseek-balance.low'),
    type: 'text',
    default: String(DEFAULT_LOW),
    hint: () => t('card.deepseek-balance.lowHint'),
  }]
}

/**
 * The alert threshold for THIS instance.
 *
 * A threshold is a number the user typed, so it can be anything: the value is
 * read as a finite positive number, and anything else (empty, `abc`, `-5`, `0`)
 * falls back to the default rather than switching the colouring off silently —
 * "no colour" and "a threshold of zero" are not the same statement.
 */
export function lowThreshold(stats: WidgetStats): number {
  const raw = stats.low
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseFloat(raw) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LOW
}

/** `刚刚更新` / `5m 前更新` — the age of the upstream sample, in the card's own
 *  words. The distance itself comes from `fmtAgo` (the GitHub cards' formatter) so
 *  the two families cannot drift into two spellings of the same age; under a
 *  minute it is NOT printed, because `0s 前更新` reads like a fault rather than
 *  like freshness and says nothing a reader can act on. */
export function fmtUpdated(sampledAt: number, now: number): string {
  if (!Number.isFinite(sampledAt) || sampledAt <= 0) return ''
  if (now - sampledAt < 60_000) return t('deepseek.justNow')
  return t('deepseek.updated', { ago: fmtAgo(new Date(sampledAt).toISOString(), now) })
}

/**
 * The SHORT label a state prints on the card's grey line.
 *
 * One word, because that line shares 150px with the granted credit and is the
 * first thing an ellipsis eats. The SENTENCE that says what to do about the state
 * rides the hover text (`deepseekHint`) — the same split the Command Code cards
 * made when a 90-character hint ellipsized to `未配置 COMMANDCODE…` on every tile.
 */
export function deepseekShort(stats: WidgetStats, override?: string | null): string {
  const code = override ?? stats.deepseekBalanceError
  switch (code) {
    case 'unconfigured': return t('deepseek.short.unconfigured')
    case 'unauthorized': return t('deepseek.short.unauthorized')
    case 'unloaded': return t('deepseek.short.unloaded')
    case 'timeout': return t('deepseek.short.timeout')
    case 'unavailable': return t('deepseek.short.unavailable')
    default: return code === null || code === undefined ? t('deepseek.waiting') : t('deepseek.short.failed')
  }
}

/**
 * Why this card has no balance to print.
 *
 * The codes are the host route's and the adapter's own, and each one names a
 * DIFFERENT thing to do — which is the whole reason they are not collapsed into
 * one "unavailable": a rejected key, a key that is not configured, a host that
 * was not restarted and a network blip are four situations, and the card is the
 * only place the user can read that distinction.
 *
 * `override` exists for the preview, which walks the empty states through
 * `meta.sim.error` (the rail never passes it): a state the user can only reach
 * with a missing or revoked key would otherwise never be reviewable.
 */
export function deepseekHint(stats: WidgetStats, override?: string | null): string {
  const code = override ?? stats.deepseekBalanceError
  switch (code) {
    case 'unconfigured': return t('deepseek.unconfigured')
    case 'unauthorized': return t('deepseek.unauthorized')
    case 'unloaded': return t('deepseek.unloaded')
    case 'timeout': return t('deepseek.timeout')
    case 'unavailable': return t('deepseek.unavailable')
    default: return code === null || code === undefined
      ? t('deepseek.waiting')
      : t('deepseek.failed', { code: String(code) })
  }
}

/**
 * The preview payload: a plausible platform account (¥110 total, ¥10 of it
 * granted, ¥3.20 burnt today) plus everything the 对话消耗 row needs — a session
 * that has actually run, the DeepSeek route it ran on, and the official V4.1
 * Flash rule in the shape usage-center publishes.
 *
 * The price table is declared HERE rather than borrowed from the shared preview
 * stats (which carry none) for the same reason `session-cost` ships its own: a
 * preview that shows money must show where the money came from, and the rule's
 * peak/off-peak split is what makes the card's `≈` mark visible in a screenshot.
 * Its rates are the real published ones (USD per M) — the balance beside them is
 * CNY, and that is not a bug: DeepSeek bills the platform in the table's currency
 * while the account balance is held in the account's own.
 */
export function deepseekPreviewStats(): Partial<WidgetStats> {
  return {
    deepseekBalance: {
      available: true,
      currency: 'CNY',
      total: 110,
      granted: 10,
      toppedUp: 100,
      hasBalance: true,
      spentToday: 3.2,
      day: dayKey(new Date()),
      sampledAt: Date.now(),
    },
    deepseekBalanceError: null,
    usage: { inputTokens: 18_600_000, cacheReadTokens: 18_400_000, outputTokens: 75_600 },
    modelSelection: { next: { provider: 'deepseek', model: 'deepseek/deepseek-v4.1-flash' }, lastUsed: null },
    pricing: {
      available: true,
      version: 2,
      currency: 'USD',
      path: '(example table shipped with this widget preview)',
      modifiedAt: null,
      rules: [{
        id: 'example-official-v4.1-flash',
        provider: 'deepseek',
        model: 'deepseek-v4.1-flash',
        effectiveFrom: '2026-09-10T00:00:00Z',
        effectiveTo: null,
        timezone: 'UTC',
        peakWindows: [
          { days: [1, 2, 3, 4, 5], start: '01:00', end: '04:00' },
          { days: [1, 2, 3, 4, 5], start: '06:00', end: '10:00' },
        ],
        rates: { inputCacheHit: 0.003, inputCacheMiss: 0.15, output: 0.6, cacheWrite: 0 },
        peakRates: { inputCacheHit: 0.006, inputCacheMiss: 0.3, output: 1.2, cacheWrite: 0 },
        currency: 'USD',
        sourceType: 'official',
        verifiedAt: '2026-09-11',
        source: 'example only — mirrors the shipped DeepSeek V4.1 Flash list',
      }],
    },
  }
}
