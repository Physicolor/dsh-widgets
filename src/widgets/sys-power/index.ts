import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtDuration } from '../../client/lib/format'
import type { BarDatum, HostPower, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 供电 (Power) — the battery / mains card.
 *
 * WHY IT EXISTS: a long unattended run dies for boring reasons, and the most
 * common one is the mains cable. On battery Windows throttles the CPU and, at the
 * end, sleeps the machine — the session simply stops. Nothing on the rail said
 * which of the two states the machine is in before this card, so the failure
 * arrived unexplained.
 *
 * WHAT IT READS: `stats.host?.power` (`HostPower` from `/api/host/overview`) —
 * `{ onAc, percent, minutesLeft, scheme }`. The host has already done the two
 * hard parts, so this card does NEITHER:
 *   - Win32's `EstimatedRunTime = 71582788` (0x4444444) sentinel, which means
 *     "mains power / unknown" and used to read as 71582788 minutes left, is
 *     folded to `null` host-side. Here `minutesLeft === null` is just "no
 *     estimate" — there is deliberately no sentinel arithmetic in this file.
 *   - `powercfg` prints a LOCALIZED prefix (`电源方案 GUID: … (平衡)`); the host
 *     keeps only the parenthesised name. The scheme is therefore printed
 *     VERBATIM — never mapped to an English/Chinese table of our own, because
 *     mapping would silently disagree with the machine's own Settings page.
 *
 * WHY THE ELEMENTS SIT WHERE THEY DO (the house head ladder, AGENT-BRIEF §2):
 * the blue 13px title, then the charge as the 20px figure in `headAfter.big`
 * (`value` would be pushed into the body and printed twice), then one grey
 * `legend` line carrying the two facts that have no row budget — the source and
 * the power scheme. The three-row breakdown sits on the card's FLOOR
 * (`bodyAnchor: 'bottom'`): a `headAfter` head alone would leave the slack
 * underneath the rows instead of above them.
 *
 * NO HEAD RING on purpose. A ring is the design language for a SHARE of a whole
 * (the cache hit rate, the context water level). A battery percent is not a
 * share of anything the card can name, and the circle would eat the 20px figure's
 * width for nothing.
 *
 * TONE DIRECTION — this card is the INVERSE of every busy-machine card next to
 * it, and that is the widget's own call (see the thresholds below): a LOW charge
 * is what is wrong, so the figure goes amber under 20% and red under 10%. Nothing
 * is tinted while charging. A high number here is the good state, which is why
 * the rule lives in this file and not in the renderer.
 */

/** Below this charge, on battery only, the figure turns AMBER. 20% is the level
 *  at which Windows itself starts its own low-battery warning, so the card agrees
 *  with the OS instead of inventing a second opinion. */
const WARN_PERCENT = 20

/** Below this charge the figure turns RED — the point where the battery is about
 *  to become the reason a long run dies. */
const DANGER_PERCENT = 10

/** The em dash a reading with no value shows — the same placeholder 任务/工具调用
 *  use, never a fabricated 0. `—` and `0` are different statements: an unknown
 *  charge is not an empty battery. */
const DASH = '—'

/**
 * The readings the offline preview steps through (`example.simSteps`), keyed by
 * the name `meta.sim.power` carries.
 *
 * `scheme: '平衡'` is MOCK DATA, not a label: the card prints the machine's own
 * word, and this is the word the authoring machine's `powercfg` returns. It is
 * deliberately not put through `t()` — a translated scheme name would be a lie
 * about what the OS said.
 */
const SIM_POWER: Record<string, HostPower> = {
  // Mains, full, no runtime estimate (the machine this card was written on).
  ac: { onAc: true, percent: 100, minutesLeft: null, scheme: '平衡' },
  // The ordinary discharging state: a real charge AND a real runtime estimate.
  battery: { onAc: false, percent: 42, minutesLeft: 134, scheme: '平衡' },
  // Amber: under WARN_PERCENT.
  low: { onAc: false, percent: 14, minutesLeft: 41, scheme: '平衡' },
  // Red: under DANGER_PERCENT.
  critical: { onAc: false, percent: 6, minutesLeft: 17, scheme: '平衡' },
  // A desktop: mains + a scheme, but no battery reading at all (`percent` null).
  desktop: { onAc: true, percent: null, minutesLeft: null, scheme: '平衡' },
}

/**
 * The tone the figure wears, from the ONE rule this card owns.
 *
 * `onAc !== false` deliberately includes `onAc === null` ("the host could not
 * tell"): an unknown source is not evidence of discharging, and tinting it amber
 * would be a claim the reading does not support.
 */
function powerTone(onAc: boolean | null, percent: number | null): 'warn' | 'danger' | undefined {
  if (onAc !== false || percent === null) return undefined
  if (percent < DANGER_PERCENT) return 'danger'
  if (percent < WARN_PERCENT) return 'warn'
  return undefined
}

/** The simulated reading, when the preview asks for one (`meta.sim.power`). */
function simPower(meta?: WidgetRenderMeta): HostPower | null {
  const name = meta?.sim?.power
  return typeof name === 'string' ? SIM_POWER[name] ?? null : null
}

/** The word for where the power comes from (the legend and the 供电 row). */
function sourceWord(onAc: boolean | null, short: boolean): string {
  if (onAc === true) return short ? t('card.sys-power.source.ac') : t('card.sys-power.ac')
  if (onAc === false) return t('card.sys-power.source.battery')
  return t('card.sys-power.source.unknown')
}

function sysPowerRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  // No power section at all (no battery AND `powercfg` silent, or the route has
  // not answered) is "nothing to say", not "0%" — the card hides itself rather
  // than claiming a charge. `sim` wins over the live slice so the preview can
  // walk states a rail in use cannot be put into on demand (the same posture 任务
  // takes with `sim.empty`).
  const power = simPower(meta) ?? stats.host?.power ?? null
  if (power === null) return null
  const { onAc, percent, minutesLeft, scheme } = power
  // Mains power with no charge reading is exactly what the host reports for a
  // machine with no battery (its `toPower` fills `onAc: true, percent: null`).
  const noBattery = onAc === true && percent === null
  const tone = powerTone(onAc, percent)
  const legend = noBattery
    ? t('card.sys-power.desktop')
    : scheme === null ? sourceWord(onAc, true) : `${sourceWord(onAc, true)} · ${scheme}`
  // The empty 「剩余」 row explained one hover away. On mains power there IS no
  // runtime to print — a correct empty state, not a failure — and the tile has no
  // height left for a sentence, so it rides the card's tooltip (`cardHint`).
  //
  // The wording of the last two hints is deliberately about the SYSTEM, not the
  // battery: `onAc === null` means "the source cannot be told" (see HostPower), so
  // a sentence that blames the battery would assert a source this reading never
  // established. "No runtime estimate was reported" is true in both branches.
  const hint = minutesLeft !== null
    ? undefined
    : noBattery
      ? t('card.sys-power.hintDesktop')
      : onAc === true
        ? t('card.sys-power.hintAc')
        : t('card.sys-power.hintUnknown')
  const rows: Array<{ label: string; value: string; tone?: BarDatum['tone'] }> = [
    // A picked row ALWAYS renders: `—` + muted instead of vanishing, so the card
    // never changes its line count under the reader (the house rule).
    onAc === null
      ? { label: t('card.sys-power.row.source'), value: DASH, tone: 'muted' }
      : { label: t('card.sys-power.row.source'), value: sourceWord(onAc, false) },
    minutesLeft === null
      ? { label: t('card.sys-power.row.left'), value: DASH, tone: 'muted' }
      : { label: t('card.sys-power.row.left'), value: fmtDuration(minutesLeft * 60_000) },
    scheme === null
      ? { label: t('card.sys-power.row.scheme'), value: DASH, tone: 'muted' }
      : { label: t('card.sys-power.row.scheme'), value: scheme },
  ]
  return {
    title: t('card.sys-power.title'),
    headAfter: { big: percent === null ? DASH : `${percent}%` },
    legend,
    bodyAnchor: 'bottom',
    // A lone `—` at 20px in the primary label colour reads as a redaction bar, not
    // as "no reading" (measured on this card's desktop state). `muted` is the rung
    // the render contract gained for exactly this case (integration edit,
    // 2026-09-29) — a machine with no battery has nothing to escalate.
    ...(percent === null ? { valueTone: 'muted' as const } : tone === undefined ? {} : { valueTone: tone }),
    ...(hint === undefined ? {} : { cardHint: hint }),
    chart: { kind: 'breakdown', breakdown: rows },
  }
}

export default defineWidget({
  id: 'sys-power',
  name: () => t('widget.sys-power.name'),
  desc: () => t('widget.sys-power.desc'),
  builtin: true,
  group: 'device',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: sysPowerRender,
  // A click on either preview steps 插电 → 电池 → 低电量 → 危险 → 台式机, so the
  // amber/red figure and the desktop posture can be judged by eye with no live
  // battery condition to wait for. `sim` is the FIRST step — a `sim` absent from
  // `simSteps` makes the first click a silent no-op (see WidgetExample).
  simToggle: () => t('card.sys-power.simToggle'),
  example: {
    // Widget-owned preview data: outside a session the host overview is null, so
    // the market / 组件配置 previews fill it from here. The full `HostOverview`
    // shape is given (not a `HostPower` alone) because `stats.host` is the whole
    // payload the live fold carries.
    stats: {
      host: {
        ts: 0,
        net: null,
        power: SIM_POWER.ac,
        procs: null,
        services: [],
        proxy: null,
      },
    },
    sim: { power: 'ac' },
    simSteps: [
      { power: 'ac' },
      { power: 'battery' },
      { power: 'low' },
      { power: 'critical' },
      { power: 'desktop' },
    ],
  },
})
