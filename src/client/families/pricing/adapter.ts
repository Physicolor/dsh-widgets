/**
 * The price-table source: `dsh-usage-center`'s `pricing.json`, re-served by the
 * host's `/api/widgets-pricing` route.
 *
 * This source has NO `manifest.source` of its own — it is read by cards that
 * price the session (today `session-cost` and DeepSeek 余额's 对话消耗 row), which
 * is exactly what `consumerWidgets` is for. It is still an adapter like every
 * other source, so it keeps its own cadence and its own error rule instead of a
 * hand-written effect in the collector.
 *
 * Slow clock on purpose: the file changes when a human edits it, not when a turn
 * finishes. A failed read keeps the last table — a blip must not un-price a card
 * that was showing money.
 *
 * Moved out of `data/collector.tsx` (v1.11 adapter contract).
 */
import { defineSource, type SourceEffect } from '../../data/source-contract'
import type { PriceTable } from '../../lib/contract/types'

export const pricingSource = defineSource({
  id: 'pricing',
  host: 'host/pricing.ts',
  consumerWidgets: ['session-cost', 'deepseek-balance'],
  schedule: {
    mount: true,
    pollMs: () => 600_000,
  },
  pulls: () => [{
    url: '/api/widgets-pricing',
    apply(answer): SourceEffect | null {
      // `available: false` (no table at all) is a legitimate answer the cards
      // render as "tokens only, no money" — it is not a transport failure, so the
      // payload is stored as-is and only a null body is dropped.
      if (!answer.ok || answer.payload === null || typeof answer.payload !== 'object') return null
      return { patch: { pricing: answer.payload as PriceTable }, resolved: true }
    },
  }],
})

export default pricingSource
