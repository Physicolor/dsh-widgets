import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { HOLIDAY_TABLE_SOURCE } from '../../client/lib/peak-holidays'
import { DEFAULT_PEAK_WINDOWS, fmtMins, peakConfigOf, peakStatusNow, type PeakWindow } from '../../client/lib/peak-schedule'

/**
 * Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
 *
 * THE RULE IS SHARED (2026-09-28): the windows parser, the zone clock, the config
 * reader and the verdict all live in `src/client/lib/peak-schedule.ts`, and the
 * holiday table in `src/client/lib/peak-holidays.ts`, because the 峰谷时段表 card
 * needs exactly the same answers — and two cards must never disagree about what
 * counts as peak. This file keeps only what is ITS own: the row labels and the
 * 2×2 posture.
 */

/** One meter row's label: 上午/下午 + the range, so a customised window still
 *  reads like the built-in pair. */
function windowLabel(w: PeakWindow): string {
  const range = `${fmtMins(w.start)}–${fmtMins(w.end)}`
  return t(w.start < 12 * 60 ? 'card.peak.am' : 'card.peak.pm', { range })
}

/** Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
 *  Value mirrors the cache/tokens card (big bottom-left label): EXPENSIVE while
 *  a peak window is active, CHEAP otherwise. The two windows live under the
 *  title; the active one lights up brand-blue. On a day that is off-peak in full
 *  (weekend / Chinese public holiday — see holidays.ts) the meter shows that
 *  reason instead: no window applies to such a day. The EXPENSIVE escalation is
 *  on the TEXT itself — the value turns red and blinks (valuePulse); the card
 *  frame stays clean (the old red inner glow was removed on request). A preview
 *  can pass meta.sim = { peak, reasonKey?, window? } to force any state. */
function peakPricingRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const cfg = peakConfigOf(stats)
  const sim = meta?.sim
  const simPeak = sim && typeof sim.peak === 'boolean' ? sim.peak : null
  const live = peakStatusNow(new Date(), cfg)
  const peak = simPeak !== null ? simPeak : live.peak
  // Simulating? The reason comes from the sim record, never from today's clock,
  // so a preview is deterministic (see the unit's `example`).
  const reasonKey = simPeak === null
    ? (live.peak ? undefined : live.reasonKey)
    : (simPeak ? undefined : (typeof sim?.reasonKey === 'string' ? sim.reasonKey : undefined))
  const activeIndex = simPeak === null
    ? live.activeIndex
    : (simPeak
        ? (typeof sim?.window === 'number' && sim.window >= 0 && sim.window < cfg.windows.length ? sim.window : 0)
        : undefined)
  const meter = reasonKey
    ? [{ label: t('card.peak.offDay', { reason: t(reasonKey) }), active: false }]
    : cfg.windows.map((w, i) => ({ label: windowLabel(w), active: i === activeIndex }))
  return {
    title: t('card.peak.title'),
    meter,
    value: peak ? 'EXPENSIVE' : 'CHEAP',
    valueTone: peak ? 'danger' : undefined,
    valuePulse: peak,
    cardHint: live.holidayTableStale
      ? t('card.peak.staleHint', { year: live.dateKey.slice(0, 4), source: HOLIDAY_TABLE_SOURCE })
      : undefined,
  }
}

export default defineWidget({
  id: 'peak-pricing',
  name: () => t('widget.peak-pricing.name'),
  desc: () => t('widget.peak-pricing.desc'),
  builtin: false,
  group: 'pricing',
  simToggle: () => t('sim.peak'),
  render: peakPricingRender,
  configSchema: [
    { key: 'peakWindows', label: () => t('config.peak.windows'), type: 'text', default: DEFAULT_PEAK_WINDOWS },
    { key: 'weekendOff', label: () => t('config.peak.weekend'), type: 'toggle', default: true },
    { key: 'holidayOff', label: () => t('config.peak.holiday'), type: 'toggle', default: true },
    { key: 'timeZone', label: () => t('config.peak.timeZone'), type: 'mode', default: 'Asia/Shanghai', options: [['Asia/Shanghai', () => t('config.peak.tz.beijing')], ['local', () => t('config.peak.tz.local')]] },
    { key: 'extraHolidays', label: () => t('config.peak.extra'), type: 'text', default: '' },
  ],
  // Preview mock: a click walks the four states — off-peak → peak → a Chinese
  // public holiday (whole day cheap) → a weekend — so every look can be reviewed
  // without waiting for the calendar (or the clock) to get there.
  example: {
    sim: { peak: false },
    simSteps: [
      { peak: false },
      { peak: true },
      { peak: false, reasonKey: 'card.peak.holiday.midautumn' },
      { peak: false, reasonKey: 'card.peak.weekend' },
    ],
  },
})
