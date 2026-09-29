import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import type { HostProcess, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * PROCESS MEMORY (进程内存占用) — the working-set leaderboard card (BATCH-3 Wave 2,
 * unit `sys-procs`). Renamed from the colloquial 内存大户 in the revision round: the
 * card title, the market name and this comment all carry the technical term now. The
 * metric is the Windows WORKING SET (Task Manager's 「内存」 column, RSS on other
 * systems) — see README §0 for why the professional name is 进程内存占用 and not
 * 工作集 (which is the METRIC's name, not a readable card title).
 *
 * THE QUESTION: with several agents, models and browsers alive at once, "why is
 * this machine crawling" is a MEMORY question long before it is a CPU one — and
 * nothing on the rail could answer it. The device family watches the machine's own
 * totals (CPU / RAM / VRAM); none of those cards ever says WHICH program owns them.
 * This one names the winners.
 *
 * WHERE THE NUMBERS COME FROM: `stats.host.procs`, the `procs` slice of the host's
 * `/api/host/overview` route — per process `{ pid, name, rss }` with `rss` in
 * BYTES, already cut to the top eight by working set on the host side. `null` means
 * the PowerShell snapshot has not answered yet (the shell paints the `bars`
 * skeleton over it); `[]` means it answered with nothing. Both are "no
 * information", so both render nothing.
 *
 * ⚠ THERE IS NO PER-PROCESS VRAM, AND THIS CARD MUST NEVER PRETEND THERE IS.
 * Measured on this machine (WDDM): `nvidia-smi --query-compute-apps` answers
 * `[N/A]` for every row, so per-process GPU memory does not exist to be shown. The
 * word 显存 therefore appears NOWHERE on this card — it is a memory card, and the
 * GPU's own totals live on the sys-gpu / sys-rings / sys-board cards. The number
 * Task Manager prints in its 「专用 GPU 内存」 column is not reachable through any
 * scriptable interface here.
 *
 * THE LADDER (BRIEF §2 — the one head posture this repo uses): the blue 13px
 * title, the winner's working set at 20px directly underneath it (`headAfter.big`,
 * NEVER `value`: `value` is the BODY figure and would print the same number a
 * second time), and the winner's NAME as the 10px grey caption (`legend`). The
 * three detail rows are RANKS 2..4 and rest on the tile's floor
 * (`bodyAnchor: 'bottom'`): rank 1 is already the figure PLUS the caption, so
 * repeating it in the list would be this repo's cardinal sin (一件事不说两遍).
 *
 * TONE: NOTHING IS COLOURED, deliberately. Being the biggest memory user is a
 * FACT, not a fault — `node` (this very `dsh web` process) belongs on the list as
 * much as anything else and is not special-cased. `headRing` is absent for the
 * same kind of reason plus a structural one: a ring is the design language of a
 * SHARE, and a share needs a denominator; this slice carries no total RAM, so a
 * circle here would be decoration pretending to be a ratio (BATCH-3 SPECS §10).
 *
 * ONE PROCESS: the `chart` is OMITTED rather than padded with `—` rows. A `—`
 * means "this READING is missing"; ranks 3 and 4 do not EXIST on a one-process
 * machine, and two empty slots would make a healthy card look broken. `meta.sim`
 * steps the preview into that state so it is reviewable without such a machine —
 * see `example`.
 *
 * ONE PROGRAM, SEVERAL RANKS: the list is per PROCESS, so a multi-process program
 * (Edge / Chrome / anything Electron) can own two of the drawn rows. Two identical
 * labels over two different figures read as a bug — the pid is appended when, and
 * only when, a name repeats among the drawn entries; see `labelsFor` for why the
 * names are NOT summed into a program total instead.
 */

/** How many detail rows the card draws: ranks 2, 3 and 4 (rank 1 is the head).
 *  Three is the tile's limit — a fourth row needs 16px the 150px box does not have
 *  (BRIEF §2's height budget: head 59 + rows 51 + pad 24 = 134 / 150). */
const DETAIL_RANKS = 3

/** The em dash printed when a reading is genuinely absent — the same placeholder
 *  工具调用 / 任务 use. Never a fabricated 0. */
const DASH = '—'

/** Byte units, 1024-based — the ladder Windows' own task manager reports memory
 *  in (KB / MB / GB on binary steps). */
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/**
 * Format a byte count the way the machine's own task manager does: `1.7 GB`,
 * `650 MB`, `812 KB`.
 *
 * WHY NOT `fmtTokens` (the shared formatter every other card uses): it is a TOKEN
 * formatter, and its ladder is K/M with no unit letter, no space and a DECIMAL
 * step — because a token count has no physical unit. Fed bytes it would print the
 * 1.69 GB winner as `1690M` (wrong scale, no unit, off by the 1000-vs-1024 factor
 * that matters on a memory reading), and every row on this card would become a
 * token-shaped string on a card that has nothing to do with tokens. A byte count
 * carries its unit and its binary step; that belongs in this unit's own directory,
 * not in the shared formatter (BRIEF §3/§5).
 */
function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return DASH
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  // One decimal below 100 (`1.7 GB`, `650 MB`); from 100 up a decimal is noise at
  // this type size (`812 KB`, never `812.3 KB`).
  const rounded = unit === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${BYTE_UNITS[unit]}`
}

/** The process's own image name, trimmed; `—` when the host gave none — an absent
 *  NAME is not an absent reading, so the row still prints its figure. */
function baseName(proc: HostProcess): string {
  const name = typeof proc.name === 'string' ? proc.name.trim() : ''
  return name === '' ? DASH : name
}

/**
 * The label for each entry this card actually draws, in draw order.
 *
 * The list is PER PROCESS, so a multi-process program (Edge / Chrome / anything
 * Electron) legitimately owns several of the top ranks — and measured against a
 * mock with two `msedge` entries (2026-09-29, this unit's own screenshot review),
 * two identical labels over two different figures reads as a RENDERING BUG rather
 * than as "two browser processes". The pid is therefore appended to a name ONLY
 * when that name occurs more than once among the entries being drawn (the head's
 * caption included, so the caption and its rows stay consistent) — the ordinary
 * all-distinct case keeps the bare name, so this costs the card nothing when there
 * is nothing to disambiguate.
 *
 * WHY THE NAMES ARE NOT SUMMED instead (which is what Task Manager's Processes
 * tab shows): this list is the host's TOP EIGHT by working set, so a program whose
 * ninth process fell outside that cut would be printed as a total that is really a
 * FLOOR — and this contract has no way to write `≥ 1.2 GB` (the GitHub repo card
 * carries a separate `issueCountCapped` flag for exactly that reason). Every
 * figure on this card stays exactly ONE process's working set.
 */
function labelsFor(entries: HostProcess[]): string[] {
  const count = new Map<string, number>()
  for (const proc of entries) {
    const name = baseName(proc)
    count.set(name, (count.get(name) ?? 0) + 1)
  }
  return entries.map((proc) => {
    const name = baseName(proc)
    // A duplicate with no usable pid falls back to the bare name: an
    // `undefined`-looking label would be worse than the repetition.
    return (count.get(name) ?? 0) > 1 && Number.isFinite(proc.pid) ? `${name} · ${proc.pid}` : name
  })
}

/** One detail row of the breakdown block (label left, figure hard right). */
interface Row {
  label: string
  value: string
}

function sysProcsRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const procs = stats.host?.procs
  // `null` (snapshot not answered yet) and `[]` (answered, nothing in it) are both
  // "no information here" → no card. The shell shows the skeleton for the first.
  if (!Array.isArray(procs) || procs.length === 0) return null
  // Rank 1 must be the biggest one even if a host half ever forgot to sort: the
  // figure and the caption ARE the card's claim. A COPY — render is a pure
  // function and must never mutate `stats`.
  const ranked = procs.slice().sort((a, b) => b.rss - a.rss)
  // PREVIEW ONLY (`meta.sim`, the contract's own preview channel — the rail never
  // passes it): truncate the list so the ONE-process downgrade (head only, no
  // detail rows) can be eyeballed offline without owning such a machine.
  const cap = typeof meta?.sim?.procs === 'number' ? meta.sim.procs : null
  const list = cap === null ? ranked : ranked.slice(0, Math.max(0, cap))
  // Everything this card will DRAW (rank 1 + the detail rows): the labels are
  // decided over exactly this slice, so a name repeated between the head and a row
  // is disambiguated in both places (see labelsFor).
  const visible = list.slice(0, 1 + DETAIL_RANKS)
  const labels = labelsFor(visible)
  const top = visible[0]
  if (top === undefined) return null
  const rows: Row[] = visible.slice(1).map((proc, index): Row => ({
    label: labels[index + 1] ?? baseName(proc),
    value: fmtBytes(proc.rss),
  }))
  return {
    title: t('card.sys-procs.title'),
    headAfter: { big: fmtBytes(top.rss) },
    legend: labels[0] ?? baseName(top),
    bodyAnchor: 'bottom',
    // Ranks 2..4, and the `chart` key is OMITTED when there are none (see the
    // ONE PROCESS note above). No `tone` on any row: see TONE.
    ...(rows.length > 0 ? { chart: { kind: 'breakdown' as const, breakdown: rows } } : {}),
  }
}

export default defineWidget({
  id: 'sys-procs',
  name: () => t('widget.sys-procs.name'),
  desc: () => t('widget.sys-procs.desc'),
  builtin: false,
  group: 'device',
  // MUST mirror the manifest: the runtime sizesOf() and the discovery generator
  // both read THIS descriptor (a mismatch fails `gen-registry` loudly).
  sizes: ['2x2'],
  render: sysProcsRender,
  // A click on either preview steps 多进程 → 单进程 (the shared `simSteps`
  // mechanism 任务 uses for its empty state), so the head-only downgrade can be
  // judged by eye.
  simToggle: () => t('widget.sys-procs.simToggle'),
  // Widget-owned preview data: with no live session there is no `/api/host/overview`
  // answer, and the card must still be reviewable in the market / 组件配置 (the live
  // record wins the moment the host answers). The numbers mirror this machine's
  // real top list — `Memory Compression` first (that is what a Windows box with
  // compression on actually reports), `node` SECOND because that is `dsh web`
  // itself and this card does not hide the harness's own footprint, then `msedge`.
  // Rank 4 is deliberately a 24-glyph real image name (`SecurityHealthService`) —
  // it is the row the label treatment is judged on — and rank 5 exists only to be
  // CUT, proving the three-row cap.
  example: {
    stats: {
      host: {
        ts: 0,
        net: null,
        power: null,
        services: [],
        proxy: null,
        procs: [
          { pid: 412, name: 'Memory Compression', rss: 1_815_000_000 },
          { pid: 11224, name: 'node', rss: 681_574_400 },
          { pid: 9016, name: 'msedge', rss: 512_753_664 },
          { pid: 2244, name: 'SecurityHealthService', rss: 473_956_352 },
          { pid: 3808, name: 'MsMpEng', rss: 134_217_728 },
          { pid: 5120, name: 'explorer', rss: 100_663_296 },
        ],
      },
    },
    // 多进程 first, then 单进程: `sim` must be one of the steps (the stepper finds
    // the current one by deep equality) and it is what the preview opens on.
    sim: { procs: 8 },
    simSteps: [{ procs: 8 }, { procs: 1 }],
  },
})
