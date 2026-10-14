/**
 * 时钟 (clock) — the wall clock of a zone the user picks, drawn as a dial.
 *
 * WHAT IT IS FOR, next to the operating system's own clock: this one is a CARD in
 * the rail, so it answers "what time is it in the zone I am actually working
 * against" while the rest of the rail is being watched — the same reason 峰谷定价
 * exists beside the pricing page. The zone list is deliberate and short: the
 * machine's own clock (`local`, the default — never a hard-coded Beijing, which
 * would be wrong on every machine outside China), Beijing (the zone this product's
 * own pricing/session cards reason in), and the four zones a cross-border working
 * day actually spans.
 *
 * WHAT THE WIDGET DECIDES, AND WHAT THE RENDERER DOES. This render is a PURE DATA
 * description: it picks the zone, the face, whether a second hand is drawn, and —
 * for the digital face — the date line's own words (the renderer holds no
 * dictionary). The DIAL ITSELF is the renderer's, including the live ticking: a
 * widget render cannot own an interval, and the rail only re-renders a card when
 * its data changes (30s at idle), so a clock wired to widget renders would stand
 * still. See `render/rich/clock-face.tsx` for the tick and the geometry.
 *
 * THE PINNED INSTANT (`sim.at`, preview only). The rail never passes `sim`, so a
 * live card always reads the real clock; every preview surface pins the instant,
 * which is what makes the offline render snapshot and the gallery screenshots
 * reproducible instead of "whatever time it was when the reviewer looked".
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { clockZoneLabel, clockZoneOptions, pinnedInstant, readClock } from '../../client/lib/clock-face'

/** The weekday names, indexed the way `Date#getDay` is (0 = Sunday).
 *
 *  Seven LITERAL `t()` calls on purpose: the unit validator extracts the keys a
 *  unit asks for by scanning for literal calls, so a computed key
 *  (`t('card.clock.weekday.' + dow)`) would ship unverified — and a missing key
 *  renders as its raw id on the card.
 *
 *  Called PER RENDER, never hoisted into a module-level constant: `t()` resolves
 *  through the dictionary the shell installs at boot, and a module-level table is
 *  evaluated while the modules are still being imported — before that install. The
 *  gallery page installs its widget dictionaries on first render, so a hoisted
 *  table printed raw keys there (the calendar unit hit exactly that, measured
 *  2026-10-14); every other unit in this repo calls `t()` inside `render`. */
function weekdayNames(): string[] {
  return [
    t('card.clock.weekday.0'),
    t('card.clock.weekday.1'),
    t('card.clock.weekday.2'),
    t('card.clock.weekday.3'),
    t('card.clock.weekday.4'),
    t('card.clock.weekday.5'),
    t('card.clock.weekday.6'),
  ]
}

/** What one clock instance is configured to be (all fields optional on the wire). */
interface ClockConfig {
  face: 'analog' | 'digital'
  tz: string
  showLabel: boolean
  seconds: boolean
  h24: boolean
}

/** Read the instance config off the merged stats record. A missing field means the
 *  default, so a card with no saved config behaves exactly like a fresh one (and
 *  like the previews, which pass `{}`). */
function clockConfigOf(stats: WidgetStats): ClockConfig {
  const s = stats as Record<string, unknown>
  return {
    face: s.face === 'digital' ? 'digital' : 'analog',
    tz: typeof s.tz === 'string' && s.tz.trim() !== '' ? s.tz : 'local',
    showLabel: s.showLabel !== false,
    seconds: s.seconds !== false,
    h24: s.h24 !== false,
  }
}

function clockRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  const cfg = clockConfigOf(stats)
  // PREVIEW-ONLY overrides (see the module header): each sim step may pin the
  // instant AND switch a knob the config would otherwise decide, so both faces and
  // a foreign zone are reviewable without editing the instance's own settings.
  const sim = meta?.sim
  const face: 'analog' | 'digital' = sim?.face === 'digital' ? 'digital' : sim?.face === 'analog' ? 'analog' : cfg.face
  const tz = typeof sim?.tz === 'string' && sim.tz !== '' ? sim.tz : cfg.tz
  const showSeconds = typeof sim?.seconds === 'boolean' ? sim.seconds : cfg.seconds
  const h24 = typeof sim?.h24 === 'boolean' ? sim.h24 : cfg.h24
  const showLabel = typeof sim?.showLabel === 'boolean' ? sim.showLabel : cfg.showLabel
  // The ONE clock read: the pinned preview instant, or the real one. It is what
  // the digital face's date line is composed from; the dial reads its own instant
  // in the renderer (and ticks), so nothing here is time-critical.
  const pinned = pinnedInstant(sim?.at)
  const r = readClock(pinned ?? Date.now(), tz)
  const zone = clockZoneLabel(tz)
  // The digital face's second line, composed HERE (the renderer has no dictionary):
  // the 12-hour day period when that mode is on, then the zone, then the date. The
  // am/pm word rides this line rather than standing beside the figure — beside it,
  // a `09:36:42` at figure size left it no room and it wrapped to one character per
  // line (measured 2026-10-14 on the gallery page).
  const period = h24 ? '' : `${r.hour < 12 ? t('card.clock.am') : t('card.clock.pm')} · `
  const dateLine = face === 'digital'
    ? `${period}${zone} · ${weekdayNames()[r.dow] ?? ''} ${t('card.clock.md', { m: r.month, d: r.day })}`
    : undefined
  return {
    // NO TITLE (see docs/design/CARD-TITLE-STANDARD.md, T1): the dial IS the content
    // and it names itself — a "时钟" strip above it only stole height from the face.
    // An empty title is what tells `CardBody` to drop the head row entirely.
    title: '',
    rich: {
      type: 'clock',
      clock: {
        // Absent = LIVE: the renderer then owns a 1s tick. Present = the preview's
        // frozen instant.
        ...(pinned === null ? {} : { at: pinned }),
        tz,
        ...(showLabel ? { label: zone } : {}),
        face,
        seconds: showSeconds,
        h24,
        ...(dateLine === undefined ? {} : { dateLine }),
      },
    },
  }
}

export default defineWidget({
  id: 'clock',
  name: () => t('widget.clock.name'),
  desc: () => t('widget.clock.desc'),
  builtin: true,
  group: 'clock',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: clockRender,
  configSchema: [
    { key: 'face', label: () => t('card.clock.face'), type: 'mode', default: 'analog', options: [['analog', () => t('card.clock.faceAnalog')], ['digital', () => t('card.clock.faceDigital')]] },
    { key: 'tz', label: () => t('card.clock.timeZone'), type: 'mode', default: 'local', options: clockZoneOptions() },
    { key: 'showLabel', label: () => t('card.clock.showLabel'), type: 'toggle', default: true },
    { key: 'seconds', label: () => t('card.clock.seconds'), type: 'toggle', default: true },
    { key: 'h24', label: () => t('card.clock.h24'), type: 'toggle', default: true },
  ],
  // Widget-owned preview data (see WidgetExample): the three steps walk the faces
  // and the zones a live rail cannot be switched through on demand —
  //  1. the dial at the classic watch pose (10:09:30), captioned 北京;
  //  2. both hands on 12, which is where an off-by-one hand angle shows up;
  //  3. the DIGITAL face in 12-hour mode on a zone BEHIND UTC, i.e. the one
  //     combination whose date differs from Beijing's (a card that formatted the
  //     instant itself would print the wrong day here).
  // `sim` MUST be the first step: the preview stepper locates the current state by
  // deep equality, so a sim absent from simSteps makes the first click a no-op.
  example: {
    sim: { at: 1791943770000, tz: 'Asia/Shanghai' },
    simSteps: [
      { at: 1791943770000, tz: 'Asia/Shanghai' },
      { at: 1791907205000, tz: 'Asia/Shanghai' },
      { at: 1791985002000, tz: 'America/New_York', face: 'digital', h24: false },
    ],
  },
})
