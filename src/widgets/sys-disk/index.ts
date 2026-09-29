import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, MachineInfo, SysInfo, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 磁盘与自检 (sys-disk, 2×4) — REVISION 3 (the owner's second review,
 * 2026-09-29). Revision 2's history is kept in README §4 so the earlier rulings
 * stay checkable; what follows is only what is true of the CARD AS IT IS NOW.
 *
 * WHAT IT ANSWERS: "does this box still have somewhere to write, and how much of
 * the disk is the harness itself eating". Every 用量 card answers "what did it
 * cost"; this one answers "is the box still habitable".
 *
 * THE OWNER'S FOUR POINTS, and where each one landed:
 *   1. The 20px figure (`D: 剩余 62.9G`) is DELETED. It restated, in the biggest
 *      type on the tile, the very same reading the D: row two lines below
 *      carries (`D: 剩余 62.9G / 652G`) — one reading, one place. There is now
 *      no `headAfter` and no `value`, so nothing on this card prints a drive's
 *      remaining bytes twice.
 *   2. The session-log subject is ONE line (`legend`), immediately under the
 *      title: `DSH 会话日志 345M · 近 1 小时 +25 个文件`. It names the thing AND
 *      its unit AND what the growth counts, in that order, so it needs no
 *      decoder — the revision-2 `+13/h` did. It is the card's second subject
 *      (nothing else in the product shows the harness's own disk footprint) and
 *      `legend` is exactly the "one grey line under the title" slot, so it
 *      costs the head nothing beyond its own 12.5px line box.
 *   3. Everything else is the chart's, and the chart is HORIZONTAL —
 *      `kind: 'quotas'`, the official quota-row idiom (label left, percent hard
 *      right, a 24-cell bar under them). `bars` is the VERTICAL primitive: its
 *      only text channel is UNDER the column, which is the pile the owner
 *      rejected in revision 2. Read `render/charts/bars.tsx` and
 *      `render/charts/quotas.tsx` before changing this back — `bars` cannot be
 *      made horizontal by parameters.
 *   4. Kept: one row per drive, tightest first, >3 drives folded into the hover,
 *      the FILL isUSED and the printed text REMAINING, and red only in the
 *      danger band (which is now the BAR's colour alone — the deleted figure was
 *      the other carrier of that band, and the bar is the honest one: it is the
 *      shape of the thing itself).
 *
 * WHERE THE SPACE GOES (all MEASURED in the gallery, 2×4 at scale 1 — outer
 * 312×150, 12px inset → 286 content width; revision-2 numbers from the same
 * probe, kept here because they are the reason this revision exists):
 *   R2 head: title 16 + [4 + figure row 25] + [2 + grey line 12.5] = 59.5, and
 *   the 2↑3 drive rows (21.3 each, 5 apart) were pushed to the FLOOR: the card
 *   measured `scrollH = clientH = 148` with 1px between the last bar and the
 *   padding floor, i.e. ZERO slack, and 60.3px of dead air between the head and
 *   the chart. That is what "拥挤" was.
 *   R3 head: title 16 + [2 + legend 12.5] = 30.5. The chart still owns its fixed
 *   21.3px rows (`quotas` sizes them from the card SCALE, which is 1 at every
 *   2×4 — see SHARED LAYER below) and still hangs on the floor, so the 29px the
 *   deleted figure row freed show up as air ABOVE the chart. Three rows (74px)
 *   still fit; four (100px) still would not, so MAX_ROWS stays 3.
 *
 * SHARED LAYER — the one thing this revision could NOT do from the widget side.
 * `quotas` writes its row metrics as literals scaled by the card scale factor
 * (`9px` label, `9px` cell, `2px`/`5px` gaps in render/charts/quotas.tsx), and
 * that factor is `unit / BASE_SIDE` = 1 for every card the rail seats. A widget
 * therefore cannot ask for a denser quota row, and the freed 29px cannot become
 * a bigger chart. The precise ask is filed in README §8.3 / the handover: one
 * optional field on `WidgetChart`. Until it lands, this card takes the biggest
 * chart the shared renderer offers (all of it), which is the honest maximum.
 *
 * TONE DIRECTION — set HERE, never inferred by the renderer: the criterion is
 * FREE space, and less is worse. The band is therefore read off the free share
 * and then drawn on a bar filled by USED, which is the same sentence twice:
 * "free below 10%" IS "used above 90%", and the alarm bar is the FULL one. That
 * is the opposite pole of 利用率 (sys-cpu / sys-gpu / sys-rings), where a high
 * number means a busy machine.
 *
 * WIDTH BUDGET — the legend is the only string on the tile that can run long, and
 * CardBody ellipsizes it (`whiteSpace: nowrap` + `text-overflow: ellipsis` on the
 * caption builder), so it must fit by MEASUREMENT, not by hope. MEASURED in the
 * gallery (card type, 286px of row width): zh `DSH 会话日志 345M · 近 1 小时 +25
 * 个文件` 199.6, en `DSH session logs 345M · +25 files this hour` 207.3, degraded
 * zh `dsh web 进程内存 525M · CPU 2.1% · 已运行 3h54m` 242.3 — the worst case,
 * and still 43.7px inside the row. The file TOTAL stays on the hover
 * (`card.sys-disk.hintLog`): it is the one log reading that grows without bound
 * (five digits will happen) while `345M` and `+25` are bounded by the machine.
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
 * grid row. MEASURED (revision 3, gallery probe): a quota row is 21.3px and the
 * rows stand 5px apart, so three rows are 73.9px and four would be 100.2 — over
 * the 89.5px the card body has left once the title and the legend are paid for.
 * Four rows would not be clipped, they would GROW the card and burst the rail's
 * grid row (the rail only sets `min-height`; CardBody's tile-fits guard turns
 * that into a red outline rather than a silent defect).
 *
 * WHICH three: the ROWS ARE SORTED TIGHTEST-FIRST, and the cap only ever drops
 * the roomiest drives. That is the whole reason the sort is by urgency rather
 * than by drive letter — a letter-ordered cap would silently hide a full E:.
 * (`shown[0]` is therefore the tightest drive, which is also the one the reader
 * came for; the deleted figure used to make that pick explicit.)
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

  // Rows, tightest first (see MAX_ROWS: the cap must never drop the tightest
  // drive — it is the one the reader is here for). `sort` is stable, so equal
  // drives keep the host's drive-letter order instead of shuffling between two
  // 10s polls. There is no separate "which drive is the headline" pick any more:
  // the deleted figure was its only consumer, and `shown[0]` IS the tightest row.
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

  // THE ONE GREY LINE under the title (the owner's second point): the card's
  // second subject, compressed into the single `legend` slot.
  //
  // `home === null` means the session directory could not be read, which is NOT
  // "0 files": the line then describes the host process instead of printing a
  // fabricated count (the spec's rule, and the reason `home` is nullable at all).
  // The preview can force this branch with `meta.sim.noHome`.
  //
  // Both branches answer the same two questions in the same order — WHAT is being
  // measured, then WHAT CHANGED — because a reader who has learnt the line must
  // not have to re-learn it when the session directory is unreadable. The
  // degraded branch has no growth reading to offer, so it carries the process's
  // CPU and uptime instead of leaving a hole.
  const home = meta?.sim?.noHome === true ? null : machine.home
  const legend = home
    ? t('card.sys-disk.logLine', { size: fmtBytes(home.sessionsBytes), recent: home.recentFiles })
    : procFacts
      ? t('card.sys-disk.procLine', { rss: procFacts.rss, cpu: procFacts.cpu, uptime: procFacts.uptime })
      : '—'

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
  // that grows without bound (345M and +25 are bounded by the machine, a total
  // file count is not — five digits will happen, and the legend is a single
  // nowrap line; see WIDTH BUDGET in the header comment).
  const logNote = home ? t('card.sys-disk.hintLog', { files: home.sessionsFiles }) : ''
  const hint = [
    procFacts && proc ? t('card.sys-disk.hint', { pid: proc.pid, ...procFacts }) : '',
    logNote,
    hiddenNote,
  ].filter((s) => s !== '').join(' · ')

  return {
    title: t('card.sys-disk.title'),
    // The head is now TWO lines: the title and this caption. No `headAfter` (its
    // 25px figure row is what the owner deleted), no `value` (that would print the
    // same reading in the body instead — the field is not merely empty, it is
    // absent, so there is no figure slot left for a duplicate to reappear in).
    legend,
    // The body needs no `bodyAnchor`: with no `headAfter` the foot is already
    // `marginTop: auto` (CardBody's own rule), i.e. the chart hangs on the card's
    // FLOOR — the posture every neighbouring 2×4 uses (sys-board's rings,
    // 仓库脉搏's figures, 任务's breakdown rows all share that bottom edge).
    // `density` (integration edit, 2026-09-29): with the figure gone this card has
    // dead space between its one caption line and the chart, and the chart's row
    // metrics are a height BUDGET authored for a 150px card that still has a title
    // AND a 25px figure — `scale` cannot express "give this chart more room" (it is
    // `unit / BASE_SIDE`, and `unit` is 150 for 2×2 and 2×4 alike).
    //
    // It adapts to the ROW COUNT instead of being one constant: the budget is set by
    // the worst case (three disks ≈ 89.5px available), and spending it on a two-disk
    // machine would leave the owner's "大部分空间留给柱状图" only half honoured. So a
    // two-row card runs at 1.5 (rows ≈ 71.5px) and three rows at 1.25 (≈ 83.8px) —
    // both inside the budget, and each card fills its own room.
    chart: { kind: 'quotas', quotas, density: quotas.length >= 3 ? 1.25 : 1.5 },
    cardHint: hint === '' ? undefined : hint,
  }
}

/**
 * Preview machine — the OWNER'S OWN box, copied from the host sampler's real
 * output (`fs.statfs` byte counts, the DSH home's session walk, the web process's
 * own memory) so the market preview is the card the owner will actually see:
 *
 *   disks  C: 322.1e9 total / 72.0e9 free   — 22.35% free, 77.65% used → prints 78%
 *          D: 700.6e9 total / 67.5e9 free   — 9.635% free, 90.365% used → prints 91%
 *   home   346 session files, 361_736_551 bytes, 13 written in the last hour
 *   proc   pid 28536, 550 MB RSS, 2.1% CPU, 14059 s (3h54m) up
 *
 * The second drive is in the danger band on purpose: that band is the state this
 * card exists for, and a preview that only ever showed a healthy drive could not
 * demonstrate it. It is also the case that shows WHY the printed percent is
 * rounded UP: 90.365% is 0.365 of a point inside the red band, and `Math.ceil`
 * prints `91` — the band and the number can never disagree (see `usedPct`).
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
