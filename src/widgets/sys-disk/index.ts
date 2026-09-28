import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, MachineInfo, SysInfo, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 磁盘与自检 (sys-disk, 2×4) — the two operational failures a long-running
 * harness actually dies of, neither of which is visible anywhere else in the
 * product: a drive filling up, and the harness's own session log growing without
 * bound. Every 用量 card answers "how much did it cost"; this one answers "is the
 * box still habitable".
 *
 * WHAT THE BIG FIGURE IS: the TIGHTEST drive's free space (`headAfter.big`).
 * Chosen over "the fullest drive's used %" deliberately — free space is the
 * resource that actually runs out, and it is the number you compare against the
 * size of your next download; the % is printed per drive one line below anyway,
 * so choosing the % here would print the same fact twice and waste the 20px rung.
 *
 * WHY EACH ELEMENT IS WHERE IT IS (2×4 = 312×150 outer, 310×148 client box, 12px
 * inset → 286×124 of content. The numbers below are MEASURED in the gallery, not
 * estimated):
 *   - title       the card's name, 13px.
 *   - big         the tightest drive's free space, 20px.
 *   - line 1      grey, riding the big figure's own row (`headAfter.smallLines`):
 *                 each drive's free SHARE (the first three, then `+N` — see the
 *                 render). A bar shows shape; a share has to be a numeral, and this
 *                 is the spec's `legend` content in the only slot that can still
 *                 afford it.
 *   - line 2      the second line of that same block — the session-log footprint,
 *                 which is the `sub` content of the spec's sketch. It cannot be a
 *                 real `sub` row: see the HEIGHT note below.
 *   - chart.bars  one bar per drive, fill = FREE/total, tone = the free band.
 *   - bar labels  `C: 67.1G / 300G`. The `bars` primitive draws no value column
 *                 (its only per-datum text channel is the column label and the
 *                 hover title), so the bytes ride the label and the share rides
 *                 the hover title (`value`, which that renderer prints as a
 *                 percent — passing bytes there would print `67%` for 67 GB).
 *   - cardHint    the web process's own usage, hover-only. It is the third
 *                 section of the sketch and there is no pixel for it on the tile;
 *                 the contract's `cardHint` exists for exactly this ("a
 *                 diagnostic that must NOT be printed on the tile").
 *
 * HEIGHT — why this is NOT the sketch's four-row layout: the `bars` block is a
 * FIXED 72px (56px of bar + a 4px gap + a 9px label) and the head's ladder is
 * title 16 + a 4px gap + figure 25 = 45px, so title + ladder + bars = 117 of the
 * 124 content pixels, and the card measures exactly 148 client px — no overflow.
 * A `legend` row (a further 16px) or a `sub` row (18px) would overflow the tile,
 * and an overflowing card does not clip in the rail — it GROWS past its grid row
 * (measured: `usage-bars`, a 2×2 whose legend + bars already spend 104 of the same
 * 124). `smallLines` is the one slot that carries a second fact for FREE: the block
 * is centred on the figure's line box, so two 12.5px caption lines sit inside the
 * figure's own 25px row and the head stays 25px tall.
 *
 * TONE DIRECTION — set HERE, never inferred by the renderer (a share means nothing
 * without knowing which way is good): this is FREE space, so LESS IS WORSE. That is
 * the opposite pole of 利用率 (sys-cpu / sys-gpu / sys-rings), where a high number
 * means a busy machine and the same 90% is the alarming end.
 *
 * PREVIEW-ONLY STATE: `meta.sim.noHome` forces the `home` slice to null so the
 * degraded card can be eyeballed (and screenshotted) without breaking the session
 * directory. The rail passes `{ size }` only — `sim` is the preview channel, the
 * same mechanism 任务 uses for its empty state.
 */

/** Binary units, spelled out: `fs.statfs` reports raw byte counts and the whole
 *  sys family divides by 1024³ (see `fmtGb` in families/sys), so the two cards
 *  beside each other must not disagree about what a "G" is. */
const KIB = 1024
const MIB = 1024 ** 2
const GIB = 1024 ** 3
const TIB = 1024 ** 4

/**
 * Free-share bands, red under 10%.
 *
 * The red line is Windows' own behaviour, not a taste knob: below ~10% free a
 * system drive visibly slows down, and Windows starts refusing updates, service
 * packs and shadow copies — a card that stayed calm at 9% would be hiding the one
 * number this tile exists for. 20% is the amber band: the level at which "plan to
 * clean up" is still a plan rather than a rescue.
 */
const FREE_DANGER = 0.1
const FREE_WARN = 0.2

/** Columns still hold a byte label (`C: 67.1G / 300G`) above this count — see the
 *  render: the label measures 67–68px in the browser, so it only has room while a
 *  column is wider than that (2 columns: 141px, 3: 93px; 4: 68.5px is a coin flip). */
const MAX_BYTE_LABELS = 3

/** Drives whose free share the caption lists before it falls back to `+N` — see
 *  the render: an uncapped list would squeeze the 20px figure itself. */
const CAPTION_DRIVES = 3

/**
 * Bytes → the compact drive figure this card prints (`341M`, `63.0G`, `652G`).
 *
 * DELIBERATELY not `fmtTokens`: that is the token vocabulary, and it stops at M —
 * a 652 GB drive would print as `667648M`. Its "3 significant digits" rule is also
 * the wrong shape for a capacity (it would print 652 GB as `652M`-style noise,
 * never touching a G). The rule here is one decimal below 100 and a whole number
 * above, which is how drives are quoted (`63.0G`, `300G`).
 */
function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const steps: Array<[number, string]> = [[TIB, 'T'], [GIB, 'G'], [MIB, 'M'], [KIB, 'K']]
  for (const [step, suffix] of steps) {
    if (bytes >= step) {
      const v = bytes / step
      return `${v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1)}${suffix}`
    }
  }
  return `${Math.round(bytes)}B`
}

/**
 * Process uptime → `3h54m`.
 *
 * Not `fmtDuration`: that formatter is the session vocabulary (`45.2s` / `2m42s`)
 * and would print a 3h54m uptime as `234m0s` — the unit a host process is read in
 * is hours and days.
 */
function fmtUptime(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
  return `${Math.floor(s / 86400)}d${Math.floor((s % 86400) / 3600)}h`
}

/** The band a drive's free share falls in (see FREE_DANGER / FREE_WARN). */
function freeTone(ratio: number): BarDatum['tone'] {
  if (ratio < FREE_DANGER) return 'danger'
  if (ratio < FREE_WARN) return 'warn'
  return 'primary'
}

/**
 * The machine slice, guarded.
 *
 * `stats.sysinfo` is the collector's own projection (untyped on `WidgetStats`), and
 * an older host answers the route WITHOUT `machine` — a card that assumed either
 * shape would throw inside the rail's render. Missing here means "this deployment
 * has no machine half", which is what the null contract is for.
 */
function machineOf(stats: WidgetStats): MachineInfo | null {
  const sys = stats.sysinfo as SysInfo | null | undefined
  if (!sys || typeof sys !== 'object') return null
  const m = sys.machine
  return m && typeof m === 'object' && Array.isArray(m.disks) ? m : null
}

/** One disk reading, already reduced to what the tile prints. */
interface Drive {
  mount: string
  total: number
  free: number
  /** free / total, 0..1. */
  ratio: number
}

/**
 * The share the tile PRINTS — floored, never rounded.
 *
 * The tone bands are strict (`< 10%` is red), so a drive at 9.6% free is in the
 * danger band; `Math.round` would print it as `10%`, i.e. a red numeral sitting
 * exactly on the line it is supposed to be under. That is not hypothetical: the
 * owner's own D: drive measured 9.6% free (2026-09-28). Flooring also errs toward
 * "less free than there is", which is the safe direction for a warning — the exact
 * `ratio` still drives the bar's height and the tone, so nothing is lost.
 */
function shownPct(ratio: number): number {
  return Math.floor(ratio * 100)
}

/** Render the card, or null when there is nothing honest to draw. */
function sysDiskRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const machine = machineOf(stats)
  if (machine === null) return null
  // A drive whose total is unknown cannot be given a share, and a zero total would
  // divide by zero — such an entry is dropped rather than drawn as a 0% bar.
  const disks: Drive[] = machine.disks
    .filter((d) => Number.isFinite(d.total) && d.total > 0 && Number.isFinite(d.free))
    .map((d) => ({ mount: d.mount, total: d.total, free: Math.max(0, d.free), ratio: Math.min(1, Math.max(0, d.free / d.total)) }))
  // No readable drive at all: the card's whole subject is missing. This is NOT a
  // loading skeleton — the SHELL owns that (a widget cannot tell "still in flight"
  // from "answered with nothing"; see the contract's `skeleton` note).
  if (disks.length === 0) return null

  // The tightest drive drives the big figure and the value tone. Ties keep the
  // first (the host reports drives in drive-letter order).
  let tight = disks[0]!
  for (const d of disks) if (d.ratio < tight.ratio) tight = d

  const pctOf = (d: Drive): number => shownPct(d.ratio)
  // Line 1 — the drives' own captions: the unit word for the figure above, then one
  // share per drive. Read as a sentence about the big number, which is why it comes
  // first, and kept in the HOST's order so a numeral maps to the column under it.
  //
  // Capped at 3 drives on purpose. The caption is a nowrap flex item beside the 20px
  // figure, and a flex row shrinks its items proportionally when it runs out of room —
  // so a machine with six drives would not just truncate the caption, it would start
  // ellipsizing the FIGURE (`D: 62.9G` → `D: 62.9…`), which is the one string on this
  // tile that must never lose a glyph. Measured: the caption budget is 196px, a share
  // is ~32–38px, and `+N` tells the reader the list is shorter than the chart (which
  // always draws EVERY drive).
  const shownDisks = disks.slice(0, CAPTION_DRIVES)
  const hidden = disks.length - shownDisks.length
  const shares = shownDisks.map((d) => t('card.sys-disk.left', { mount: d.mount, pct: pctOf(d) })).join(' · ')
    + (hidden > 0 ? ` ${t('card.sys-disk.more', { n: hidden })}` : '')
  // Line 2 — the harness's own footprint. `home === null` means the session
  // directory could not be read, which is NOT "0 files": the line is replaced by the
  // host process's facts rather than printing a fabricated count (the spec's rule,
  // and the reason `home` is nullable in the contract at all). The preview can force
  // this branch with `meta.sim.noHome` so the degraded card is reviewable.
  const home = meta?.sim?.noHome === true ? null : machine.home

  // Column label: bytes while the columns are wide enough for them. The label
  // measures 67–68px in the browser, so it needs a column wider than that (2 drives:
  // 141px, 3: 93px, 4: 68.5px — a coin flip, hence the cutoff at 3). With more drives
  // than that the long form is dropped for the share instead of letting two labels
  // overrun each other: the renderer writes no value column and does not clip the
  // label, so an over-wide row would collide with its neighbour. The bars themselves
  // never change — only how much of the reading the label can carry.
  const byteLabels = disks.length <= MAX_BYTE_LABELS
  const bars: BarDatum[] = disks.map((d) => ({
    label: byteLabels ? `${d.mount} ${fmtBytes(d.free)} / ${fmtBytes(d.total)}` : `${d.mount} ${pctOf(d)}%`,
    // `value` is what the bars renderer prints next to the label in the hover title
    // AS A PERCENT (`${value}%`) — so it is the free share, never the byte count.
    value: pctOf(d),
    // `ratio` is the FREE share (not the used one): the bar's height and the label
    // read the same direction, and the tone band is stated in the same currency.
    ratio: d.ratio,
    tone: freeTone(d.ratio),
  }))

  const proc = machine.proc
  // A null `cpuPercent` is the host's FIRST sample (no delta yet), so it prints `—`
  // rather than 0.0%.
  const cpu = proc && proc.cpuPercent !== null && Number.isFinite(proc.cpuPercent) ? `${proc.cpuPercent}%` : '—'
  const procFacts = proc ? { rss: fmtBytes(proc.rss), cpu, uptime: fmtUptime(proc.uptimeSec) } : null

  return {
    title: t('card.sys-disk.title'),
    headAfter: {
      // The MOUNT rides the figure: "62.9G" alone would leave the reader to work out
      // which of the drives the red number belongs to (the caption says so, but only
      // after a second look). "D: 62.9G" is the whole headline in one glyph run.
      big: `${tight.mount} ${fmtBytes(tight.free)}`,
      smallLines: [
        `${t('card.sys-disk.freeWord')} · ${shares}`,
        home
          ? t('card.sys-disk.home', { files: home.sessionsFiles, size: fmtBytes(home.sessionsBytes), recent: home.recentFiles })
          : procFacts
            ? t('card.sys-disk.proc', procFacts)
            : '—',
      ],
    },
    // The figure turns red only in the danger band, the same band that paints the
    // bar: one threshold, two places, so the tile cannot contradict itself.
    valueTone: tight.ratio < FREE_DANGER ? 'danger' : undefined,
    chart: { kind: 'bars', bars },
    // The host process's own cost, one hover away — it is the card's third section
    // and the tile has no row left for it (see HEIGHT in the header comment).
    cardHint: procFacts && proc ? t('card.sys-disk.hint', { pid: proc.pid, ...procFacts }) : undefined,
  }
}

/**
 * Preview machine — the OWNER'S OWN box, copied from the host sampler's real
 * output (`fs.statfs` byte counts, the DSH home's session walk, the web process's
 * own memory) so the market preview is the card the owner will actually see:
 *
 *   disks  C: 322.1e9 total / 72.0e9 free (22% free)   — healthy, primary
 *          D: 700.6e9 total / 67.5e9 free (9.6% free)  — ON the red line
 *   home   346 session files, 361_736_551 bytes, 13 written in the last hour
 *   proc   pid 28536, 550 MB RSS, 2.1% CPU, 14059 s (3h54m) up
 *
 * The second drive is in the danger band on purpose: that band is the state this
 * card exists for, and a preview that only ever showed a healthy drive could not
 * demonstrate it. The whole point of copying real magnitudes is that the preview
 * exercises the SAME edge the live card does — D: at 9.6% is why the printed share
 * is floored rather than rounded (see `shownPct`).
 *
 * Byte counts are kept as the raw numbers the host reports (not pre-divided): the
 * display units are `fmtBytes`' business, and a rounded literal here would hide
 * which side of a band a drive sits on.
 */
const PREVIEW_STATS: Partial<WidgetStats> = {
  // Only `machine` is read by this card; the hardware half is filled in so the
  // example is a COMPLETE SysInfo that the next reader (and the next card) can copy.
  sysinfo: {
    ts: 0,
    cpu: { util: 43 },
    mem: { used: 17.4 * GIB, total: 34.2 * GIB, percent: 51 },
    gpu: null,
    machine: {
      ts: 0,
      disks: [
        { mount: 'C:', total: 322.1e9, free: 72e9 },
        { mount: 'D:', total: 700.6e9, free: 67.5e9 },
      ],
      home: { sessionsFiles: 346, sessionsBytes: 361736551, recentFiles: 13 },
      proc: { pid: 28536, rss: 5.5e8, cpuPercent: 2.1, uptimeSec: 14059 },
    },
  },
}

export default defineWidget({
  id: 'sys-disk',
  name: () => t('widget.sys-disk.name'),
  desc: () => t('widget.sys-disk.desc'),
  builtin: false,
  group: 'device',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor, not the
  // manifest — gen-registry fails the build when the two disagree.
  sizes: ['2x4'],
  render: sysDiskRender,
  example: {
    stats: PREVIEW_STATS,
    // `sim` MUST be the first entry of `simSteps` (the contract's own rule):
    // `nextSim` locates the current step by deep comparison, so a missing first
    // entry makes the very first click a silent no-op.
    sim: { noHome: false },
    simSteps: [{ noHome: false }, { noHome: true }],
  },
  simToggle: () => t('widget.sys-disk.simToggle'),
})
