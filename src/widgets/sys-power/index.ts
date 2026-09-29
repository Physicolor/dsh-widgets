import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
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
 * WHY THE ELEMENTS SIT WHERE THEY DO (the house head ladder, WORKER-BRIEF §2):
 * the blue 13px title, then the charge — as the 20px figure in `headAfter.big`
 * AND as the arc of the head ring the owner asked for (the ring's middle is the
 * battery glyph; its hover text carries the same percent). `value` is
 * deliberately not set: with a ring the head's figure comes from `headAfter.big`
 * only, and `value` would have no owner (or, headless, would push the number
 * into the body to be printed twice). One grey `legend` line under the figure
 * names the SOURCE, and the card's floor (`bodyAnchor: 'bottom'`) carries the
 * breakdown rows.
 *
 * ONE READING, ONE PLACE (owner's dedupe rule): the source used to be printed
 * twice — as `插电` in the legend and as `供电 交流电` in a row — and the scheme
 * twice as well (`插电 · 平衡` in the legend and `电源方案 平衡` in a row). The
 * legend now carries ONLY the source; the scheme lives ONLY in its row; the
 * source row is gone.
 *
 * THE 「剩余」 ROW IS NOT A PLACEHOLDER (owner's call): on mains power Windows
 * reports no runtime at all, and a `—` sitting where a duration belongs reads as
 * "this reading failed" rather than "this reading does not exist here". So the
 * row is OMITTED when `minutesLeft === null` — the same posture the owner asked
 * for, and the only row in this card allowed to change the row count. The
 * scheme row still prints `—` + `muted` when `powercfg` was silent, because
 * there a real reading is missing (a failure worth showing, not a non-existent
 * reading worth hiding).
 *
 * THE RING APPEARS ONLY WHEN THERE IS A CHARGE TO DRAW: `percent === null` means
 * no battery reading at all (a desktop), so the card draws no ring, no figure
 * and no tone — it keeps the title, the quiet 「台式机（无电池）」 legend and the
 * scheme row. A lone `—` at 20px in the primary colour reads as a redaction bar
 * (the defect `valueTone: 'muted'` was added for), and tinting a reading that
 * does not exist would be a claim the payload does not support, so the honest
 * quiet form is simply NO figure.
 *
 * TONE DIRECTION — this card is the INVERSE of every busy-machine card next to
 * it, and that is the widget's own call (see the thresholds below): a LOW charge
 * is what is wrong, so the figure AND the ring go amber under 20% and red under
 * 10%. Nothing is tinted while charging or when the charge is unknown. A high
 * number here is the good state, which is why the rule lives in this file and
 * not in the renderer.
 */

/** Below this charge, on battery only, the figure and the ring turn AMBER. 20% is
 *  the level at which Windows itself starts its own low-battery warning, so the
 *  card agrees with the OS instead of inventing a second opinion. */
const WARN_PERCENT = 20

/** Below this charge the figure and the ring turn RED — the point where the
 *  battery is about to become the reason a long run dies. */
const DANGER_PERCENT = 10

/** The em dash a reading with no value shows — the same placeholder 任务/工具调用
 *  use, never a fabricated 0. `—` and `0` are different statements: an unknown
 *  charge is not an empty battery. */
const DASH = '—'

/**
 * Battery runtime → `2h14m` (or `41m` under the hour).
 *
 * NOT `fmtDuration`: that formatter is the session STOPWATCH vocabulary
 * (`45.2s` / `2m42s`), and it prints the host's 134 minutes as `134m0s` — the
 * reader would have to do the division the OS already did. A runtime estimate is
 * read in hours, exactly like the process uptime next door (`sys-disk`'s
 * `fmtUptime`, whose comment makes the same call), so this card carries the same
 * two-rung shape for the same reason.
 */
function fmtRuntime(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

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
 * The tone the charge wears — on the figure AND on the ring, so the colour is
 * said once per head accessory rather than once per field.
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

/** The word for where the power comes from — the legend, and the ONLY place the
 *  source is printed (the 供电 row that repeated it is gone). */
function sourceWord(onAc: boolean | null): string {
  if (onAc === true) return t('card.sys-power.source.ac')
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
  // The legend is the SOURCE rung and nothing else (see the dedupe note above).
  // A charge-less machine says so here instead of on the row it does not have:
  // `onAc === null` already says "unknown", so it must not also say 电量未知.
  const legend = noBattery
    ? t('card.sys-power.desktop')
    : onAc === null
      ? t('card.sys-power.source.unknown')
      : percent === null
        ? `${sourceWord(onAc)} · ${t('card.sys-power.chargeUnknown')}`
        : sourceWord(onAc)
  // The empty 「剩余」 row explained one hover away. On mains power there IS no
  // runtime to print — a correct absence, not a failure — and the row is not
  // drawn at all (the owner's call), so only the ambiguous case keeps a hint: a
  // DISCHARGING battery whose charge is known but whose runtime estimate never
  // arrived. Blaming the battery in the other branches would assert a source the
  // reading never established.
  const hint = minutesLeft === null && onAc !== true && percent !== null
    ? t('card.sys-power.hintUnknown')
    : undefined
  const rows: Array<{ label: string; value: string; tone?: BarDatum['tone'] }> = []
  // Printed ONLY when a runtime estimate exists: `minutesLeft === null` on mains
  // power is "this reading does not exist here", and a placeholder would report
  // it as a failure. This is the one row allowed to come and go.
  if (minutesLeft !== null) {
    rows.push({ label: t('card.sys-power.row.left'), value: fmtRuntime(minutesLeft) })
  }
  // A picked row ALWAYS renders, even when it is the card's only row: a silent
  // `powercfg` is a FAILED reading (worth a `—`), unlike the runtime above.
  rows.push(scheme === null
    ? { label: t('card.sys-power.row.scheme'), value: DASH, tone: 'muted' }
    : { label: t('card.sys-power.row.scheme'), value: scheme })
  return {
    title: t('card.sys-power.title'),
    // No charge reading → no figure at all (see the header note): the quiet
    // desktop posture, not a `—` that reads as a redaction.
    ...(percent === null ? {} : { headAfter: { big: `${percent}%` } }),
    legend,
    bodyAnchor: 'bottom',
    // The ring is the charge as an arc, the figure beside it is the charge as a
    // number — the same reading in the two languages the design system has for
    // it. `icon: 'battery'` names WHAT is being measured, and `label` carries
    // the exact percent on hover (the ring draws no figure of its own).
    ...(percent === null
      ? {}
      : {
          // Only an ESCALATION is ever stated: a healthy charge leaves the figure
          // in the default label colour (no `valueTone` key at all).
          ...(tone === undefined ? {} : { valueTone: tone }),
          headRing: { ratio: percent / 100, tone, icon: 'battery' as const, label: `${percent}%` },
        }),
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
  // amber/red ring and the desktop posture can be judged by eye with no live
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
