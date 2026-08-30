import { defineWidget, type WidgetRenderMeta, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** Peak-pricing windows, Beijing time (UTC+8). DeepSeek V4 Flash / V4 Flash
 *  Vision Exp / V4 Pro price peaks: Mon–Fri 01:00–04:00 and 06:00–10:00 UTC,
 *  which is 09:00–12:00 and 14:00–18:00 Beijing. Every other time — including
 *  weekends — is off-peak. Hard-coded for now; a custom-schedule setting is
 *  planned (README Roadmap). */
const PEAK_WINDOWS_BJ: Array<{ key: string; start: number; end: number }> = [
  { key: 'card.peak.window1', start: 9 * 60, end: 12 * 60 },
  { key: 'card.peak.window2', start: 14 * 60, end: 18 * 60 },
]

/** Is right now inside a peak window (Beijing local clock)? Returns the active
 *  window key too, so the meter can light the matching row. Exported so the
 *  preview surfaces can flip the simulated state relative to the real one. */
export function peakStatusNow(now = new Date()): { peak: boolean; activeKey?: string } {
  const dow = now.getDay() // 0 = Sunday
  if (dow === 0 || dow === 6) return { peak: false }
  const mins = now.getHours() * 60 + now.getMinutes()
  for (const w of PEAK_WINDOWS_BJ) {
    if (mins >= w.start && mins < w.end) return { peak: true, activeKey: w.key }
  }
  return { peak: false }
}

/** Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
 *  Value mirrors the cache/tokens card (big bottom-left label): EXPENSIVE while
 *  a peak window is active (whole card glows red), CHEAP otherwise. The two
 *  windows live under the title; the active one lights up brand-blue. A preview
 *  can pass meta.sim = { peak: boolean, window?: 0|1 } to force either state. */
function peakPricingRender(_stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const sim = meta?.sim
  const simPeak = sim && typeof sim.peak === 'boolean' ? sim.peak : null
  const live = peakStatusNow()
  const peak = simPeak !== null ? simPeak : live.peak
  const activeKey = simPeak !== null
    ? PEAK_WINDOWS_BJ[(sim && typeof sim.window === 'number' ? sim.window : 0)]?.key
    : live.activeKey
  return {
    title: t('card.peak.title'),
    meter: PEAK_WINDOWS_BJ.map((w) => ({ label: t(w.key), active: w.key === activeKey })),
    value: peak ? 'EXPENSIVE' : 'CHEAP',
    valueTone: peak ? 'danger' : undefined,
    alert: peak,
  }
}

export default defineWidget({
  id: 'peak-pricing',
  name: () => t('widget.peak-pricing.name'),
  desc: () => t('widget.peak-pricing.desc'),
  builtin: false,
  group: 'pricing',
  badgeLabel: () => t('widget.peak-pricing.name'),
  simToggle: () => t('sim.peak'),
  render: peakPricingRender,
  // Preview mock: start off-peak (deterministic) — clicking the preview card
  // toggles the single boolean (`peak`) to review the EXPENSIVE red glow too.
  example: {
    sim: { peak: false },
  },
})