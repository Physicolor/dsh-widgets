import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, MachineInfo, SysInfo, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 磁盘与自检 (sys-disk, 2×4) — REVISION 2 (the owner's review, 2026-09-29).
 *
 * WHAT IT ANSWERS: "does this box still have somewhere to write, and how much of
 * the disk is the harness itself eating". Every 用量 card answers "what did it
 * cost"; this one answers "is the box still habitable".
 *
 * WHAT THE OWNER CHANGED (each line below is one of his points, and the reason
 * the code looks the way it does):
 *   1. The first grey line (`剩余 · C: 22% · D: 9%`) is GONE. It restated the
 *      chart in words; the rows underneath already carry every drive's
 *      remaining. One reading, one place.
 *   2. The second grey line is now TWO self-explaining lines: what the thing is
 *      (`DSH 会话日志 345M`) and what the growth number means
 *      (`近 1 小时新增 13 个文件`). The old `会话日志 346 文件 · 345M · +13/h`
 *      needed the host source to decode — `+13/h` could be files, bytes or
 *      sessions. (Kept rather than deleted: see README §4.4 — this is the
 *      card's second subject and it costs ZERO extra height, because a stacked
 *      `smallLines` block rides the 20px figure's own 25px row.)
 *   3. The chart is HORIZONTAL — `kind: 'quotas'`, the official quota-row idiom
 *      (label left, percent hard right, a 24-cell bar underneath it on the next
 *      line). `bars` is the VERTICAL primitive: it draws columns up from a
 *      baseline and its only text channel is UNDER the column, which is exactly
 *      the "grey text plus chart" pile the owner rejected. Read the two
 *      renderers (`render/charts/bars.tsx`, `render/charts/quotas.tsx`) before
 *      changing this back — `bars` cannot be made horizontal by parameters.
 *   4. The FILL is the USED share and the printed text is the REMAINING one.
 *      `quotas.pct` is the FILL share, so the percent hard right is the used one
 *      and it agrees with the bar next to it; the label carries the remaining
 *      bytes. The previous version filled by FREE, which meant the alarming
 *      drive drew the SHORTEST bar — backwards on both counts.
 *   5. The big figure is unchanged: the TIGHTEST drive's free space WITH its
 *      mount (`D: 剩余 62.9G`). Free space is the resource that actually runs
 *      out, and the mount is what tells the reader which drive the red number
 *      belongs to.
 *
 * WHERE THE SPACE GOES (all MEASURED in the gallery, 2×4 at scale 1 — outer
 * 312×150, client 310×148, 12px inset → 286×124 of content):
 *   title 16 + [4 + figure row 25] = 45, then the `quotas` rows: each row is a
 *   9px label line (line-height 1.15 ≈ 10.4) + a 2px gap + a 9px segmented bar
 *   ≈ 21.4, with 5px between rows. Three rows = 74 ≤ the 79px left; four rows =
 *   100 > 79 and the card would GROW past its grid row (the rail only sets
 *   `min-height`, so an over-tall card bursts the layout instead of clipping —
 *   CardBody's tile-fits guard paints it red). Hence MAX_ROWS = 3.
 *
 * TONE DIRECTION — set HERE, never inferred by the renderer: the criterion is
 * FREE space, and less is worse. The band is therefore read off the free share
 * and then drawn on a bar filled by USED, which is the same sentence twice:
 * "free below 10%" IS "used above 90%", and the alarm bar is the FULL one. That
 * is the opposite pole of 利用率 (sys-cpu / sys-gpu / sys-rings), where a high
 * number means a busy machine.
 *
 * HEAD WIDTH — the 20px figure and the grey block share ONE nowrap flex row, and
 * a flex row shrinks BOTH when it runs out of room, so a longer grey line does
 * not truncate itself: it starts ellipsizing the FIGURE, which is the one string
 * on this tile that must never lose a glyph (CardBody's `figureEl` carries
 * `text-overflow: ellipsis`). MEASURED in the gallery, 286px of row width:
 * `D: 剩余 62.9G` 131 + 4px gap + the grey block. The first draft put the file
 * count on the tile (`DSH session logs 345M · 346 files`), which measured 160px
 * in English — 295 needed against 286 available — and pushed BOTH the figure
 * (127 of 131) and that line (155 of 160) into an ellipsis. The count is
 * therefore on the hover (`card.sys-disk.hintLog`) and the tile keeps only the
 * two facts that are bounded by the machine: the size and the hourly growth.
 * Budget after the split: English worst line 133px (the degraded CPU line), i.e.
 * 18px of daylight — re-measure before adding a token to either grey line.
 *
 * PREVIEW-ONLY STATE: `meta.sim.noHome` forces the `home` slice to null so the
 * degraded card can be eyeballed (and screenshotted) without breaking the
 * session directory. The rail passes `{ size }` only — `sim` is the preview
 * channel, the same mechanism 任务 uses for its empty state.
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

/**
 * How many drive rows the tile holds — the cap that keeps the card inside its
 * grid row (the measurement is in the header comment: three rows 74px, four
 * 100px, 79px available).
 *
 * WHICH three: the ROWS ARE SORTED TIGHTEST-FIRST, and the cap only ever drops
 * the roomiest drives, so the drive the big figure names can never be the one
 * that is missing. That is the whole reason the sort is by urgency rather than
 * by drive letter: a letter-ordered cap would silently hide a full E:.
 */
const MAX_ROWS = 3

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

/** The band a drive's FREE share falls in (see FREE_DANGER / FREE_WARN). The
 *  bar it colours is filled by USED, which is the same statement — see the tone
 *  note in the header. */
function freeBandTone(freeShare: number): BarDatum['tone'] {
  if (freeShare < FREE_DANGER) return 'danger'
  if (freeShare < FREE_WARN) return 'warn'
  return 'primary'
}

/**
 * The percent this card PRINTS on a row = the USED share, ROUNDED UP.
 *
 * Up, not down and not to-nearest, because the printed number is now the
 * COUNTERPART of the remaining bytes beside it: rounding the used share up can
 * only ever understate the free space, which is the safe direction for a warning
 * (the old card floored the FREE share for the same reason — never claim more
 * room than there is). It also keeps the number on the same side of the 90% line
 * as the colour: the red band is `free < 10%` ⇔ `used > 90%`, so a red row can
 * never print `90%` and an amber row can never print `91%`.
 *
 * The `1e-6` guard is not cosmetic: `(1 - free/total) * 100` for a drive sitting
 * exactly on 90% comes back as 90.00000000000001 in binary floating point, and a
 * bare `Math.ceil` would print `91%` for a drive that is exactly on the line.
 */
function usedPct(freeShare: number): number {
  const raw = (1 - Math.min(1, Math.max(0, freeShare))) * 100
  const near = Math.round(raw)
  return Math.abs(raw - near) < 1e-6 ? near : Math.ceil(raw)
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
  /** free / total, 0..1 — the share this card WATCHES (the bar is filled by its
   *  complement, see `usedPct`). */
  freeShare: number
}

/** Render the card, or null when there is nothing honest to draw. */
function sysDiskRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const machine = machineOf(stats)
  if (machine === null) return null
  // A drive whose total is unknown cannot be given a share, and a zero total would
  // divide by zero — such an entry is dropped rather than drawn as a 0% bar.
  const disks: Drive[] = machine.disks
    .filter((d) => Number.isFinite(d.total) && d.total > 0 && Number.isFinite(d.free))
    .map((d) => ({ mount: d.mount, total: d.total, free: Math.max(0, d.free), freeShare: Math.min(1, Math.max(0, d.free / d.total)) }))
  // No readable drive at all: the card's whole subject is missing. This is NOT a
  // loading skeleton — the SHELL owns that (a widget cannot tell "still in flight"
  // from "answered with nothing"; see the contract's `skeleton` note).
  if (disks.length === 0) return null

  // The tightest drive drives the big figure and the value tone. Ties keep the
  // first (the host reports drives in drive-letter order).
  let tight = disks[0]!
  for (const d of disks) if (d.freeShare < tight.freeShare) tight = d

  // Rows, tightest first (see MAX_ROWS: the cap must never drop the headline's
  // drive). `sort` is stable, so equal drives keep the host's drive-letter order
  // instead of shuffling between two 10s polls.
  const ordered = [...disks].sort((a, b) => a.freeShare - b.freeShare)
  const shown = ordered.slice(0, MAX_ROWS)
  const hidden = ordered.slice(MAX_ROWS)

  // One row per drive: remaining bytes on the left as TEXT, used share hard right
  // as the bar's own readout. The bar (the fill) is the USED part — the owner's
  // rule — and `quotas.pct` is the FILL share, so its percent agrees with it.
  const quotas = shown.map((d) => ({
    label: t('card.sys-disk.row', { mount: d.mount, free: fmtBytes(d.free), total: fmtBytes(d.total) }),
    pct: usedPct(d.freeShare),
    tone: freeBandTone(d.freeShare),
  }))

  const proc = machine.proc
  // A null `cpuPercent` is the host's FIRST sample (no delta yet), so it prints `—`
  // rather than 0.0%.
  const cpu = proc && proc.cpuPercent !== null && Number.isFinite(proc.cpuPercent) ? `${proc.cpuPercent}%` : '—'
  const procFacts = proc ? { rss: fmtBytes(proc.rss), cpu, uptime: fmtUptime(proc.uptimeSec) } : null

  // The grey block, two lines, both SELF-EXPLAINING (the owner could not decode
  // the old `+13/h`): what the directory is, then what the growth number counts.
  // `home === null` means the session directory could not be read, which is NOT
  // "0 files": the block then describes the host process instead of printing a
  // fabricated count (the spec's rule, and the reason `home` is nullable at all).
  // The preview can force this branch with `meta.sim.noHome`.
  const home = meta?.sim?.noHome === true ? null : machine.home
  const smallLines = home
    ? [
        t('card.sys-disk.homeLog', { size: fmtBytes(home.sessionsBytes) }),
        t('card.sys-disk.homeGrowth', { recent: home.recentFiles }),
      ]
    : procFacts
      ? [
          t('card.sys-disk.procMem', { rss: procFacts.rss }),
          t('card.sys-disk.procUp', { cpu: procFacts.cpu, uptime: procFacts.uptime }),
        ]
      : ['—']

  // Drives the row cap left out are named on the HOVER, not dropped in silence:
  // there is no pixel for a fourth row (see MAX_ROWS) and inventing a `+2` row
  // would spend one of the three on a non-drive. They are by construction the
  // ROOMIEST drives, which is what makes the cap safe.
  const hiddenNote = hidden.length > 0
    ? t('card.sys-disk.hidden', {
        n: hidden.length,
        list: hidden.map((d) => t('card.sys-disk.rowShort', { mount: d.mount, free: fmtBytes(d.free) })).join(' · '),
      })
    : ''
  // The session-log FILE COUNT also lives on the hover: it is the one log fact
  // that grows without bound (345M and +13/h are bounded by the machine, "346
  // files" is not — a five-digit count in the grey block would start squeezing
  // the 20px figure; see HEAD WIDTH in the header comment).
  const logNote = home ? t('card.sys-disk.hintLog', { files: home.sessionsFiles }) : ''
  const hint = [
    procFacts && proc ? t('card.sys-disk.hint', { pid: proc.pid, ...procFacts }) : '',
    logNote,
    hiddenNote,
  ].filter((s) => s !== '').join(' · ')

  return {
    title: t('card.sys-disk.title'),
    headAfter: {
      // The MOUNT rides the figure: "62.9G" alone would leave the reader to work
      // out which drive the red number belongs to, and "剩余" is the unit word —
      // without it a bare `D: 62.9G` is a number that needs an explanation, which
      // is exactly what the owner rejected.
      big: t('card.sys-disk.big', { mount: tight.mount, size: fmtBytes(tight.free) }),
      smallLines,
    },
    // The figure turns red only in the danger band, the same band that paints the
    // bar: one threshold, two places, so the tile cannot contradict itself.
    valueTone: tight.freeShare < FREE_DANGER ? 'danger' : undefined,
    // The body sits on the card's FLOOR — the posture every neighbouring 2×4
    // already uses (sys-board's rings, 仓库脉搏's figures, 任务's breakdown rows
    // all hang on the floor line), so the rail's cards share one bottom edge. A
    // 2-drive machine leaves the slack between the head and the rows; the
    // alternative (`bodyAnchor: 'top'`, measured at 32px of slack) put the rows
    // straight under the head but broke that shared baseline, and with 3 drives
    // it makes no visible difference at all (6px of slack either way).
    bodyAnchor: 'bottom',
    chart: { kind: 'quotas', quotas },
    cardHint: hint === '' ? undefined : hint,
  }
}

/**
 * Preview machine — the OWNER'S OWN box, copied from the host sampler's real
 * output (`fs.statfs` byte counts, the DSH home's session walk, the web process's
 * own memory) so the market preview is the card the owner will actually see:
 *
 *   disks  C: 322.1e9 total / 72.0e9 free   — 22.4% free, 78% used, primary
 *          D: 700.6e9 total / 67.5e9 free   — 9.6% free, 90% used, ON the red line
 *   home   346 session files, 361_736_551 bytes, 13 written in the last hour
 *   proc   pid 28536, 550 MB RSS, 2.1% CPU, 14059 s (3h54m) up
 *
 * The second drive is in the danger band on purpose: that band is the state this
 * card exists for, and a preview that only ever showed a healthy drive could not
 * demonstrate it. It is also the boundary case the printed percent is rounded up
 * for (90% used, not 89% or 91% — see `usedPct`).
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
