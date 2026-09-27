/**
 * dsh-widgets — preview state stepping.
 *
 * Advance a preview's simulated state by ONE click.
 *
 * A widget with `example.simSteps` cycles through them (the 套餐 card walks the
 * plan tiers so every badge can be seen); everything else keeps the original
 * single-boolean flip (peak-pricing's peak/cheap, quota-manage's over-budget).
 * Shared by the config preview and the market preview so both surfaces step the
 * same way.
 */

import type { WidgetExample } from '../../lib/contract/types'

export function nextSim(w: { example?: WidgetExample } | undefined, current: Record<string, unknown> | null): Record<string, unknown> | null {
  if (w === undefined) return current
  const base = current ?? w.example?.sim ?? {}
  const steps = w.example?.simSteps
  if (Array.isArray(steps) && steps.length > 0) {
    const at = steps.findIndex((s) => JSON.stringify(s) === JSON.stringify(base))
    return steps[(at + 1) % steps.length]
  }
  const boolKey = Object.keys(base).find((k) => typeof base[k] === 'boolean')
  return boolKey !== undefined ? { ...base, [boolKey]: !base[boolKey] } : { ...base }
}
