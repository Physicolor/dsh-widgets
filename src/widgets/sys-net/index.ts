import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import type { HostOverview, WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'

/**
 * 网络吞吐 — the machine's live receive / transmit rate (2026-09-29, first card of
 * the host `/api/host/overview` family).
 *
 * WHAT IT ANSWERS: 「装依赖、拉模型、传大文件的时候为什么这么慢」. The sys family
 * already shows CPU, memory, GPU and disk; the network was the one resource with
 * no gauge at all, and it is precisely the one that explains a download crawling
 * while every other reading looks idle.
 *
 * WHY THE FIGURE IS THE DOWNLINK: almost every wait a coding agent has is a
 * DOWNLOAD (packages, weights, pages, docs). The uplink is usually an order of
 * magnitude smaller, so it rides the grey caption and the second detail row
 * instead of spending the 20px rung of the head's ladder.
 *
 * WHY THERE IS NO TONE AND NO RING: throughput is a READING, not a verdict — 2 MB/s
 * is not "good" and 0 B/s is not "bad" (an idle machine is a healthy machine). A
 * ring would additionally need a denominator, and a rate has none: a share of
 * what? This is the same call 内存大户 makes, and it is why the thresholds this
 * widget owns are DISPLAY budgets (see the label-budget note on `shortAdapter`)
 * rather than colour steps.
 *
 * THE ONE HONEST AMBIGUITY: `net` is derived from CUMULATIVE adapter counters
 * (`Win32_PerfRawData_Tcpip_NetworkInterface`), so the very first call can only
 * store a baseline and must answer null — that is "not measured YET", which the
 * shell paints as a skeleton (this unit declares `source: 'sys'`), never as
 * `0 B/s`. A real zero (two samples, no traffic) is a legal READING and renders
 * normally, which is why the null branch below is the ONLY path that returns null.
 *
 * TONE DIRECTION — the widget's own: none. Every rate, row and name prints in the
 * default ink; the only tone used is `muted` on the 最忙 row when the host
 * reported a throughput with no per-adapter entry to name (an adapter that was
 * re-enumerated between the two samples), where `—` is the truth.
 */

/** The em dash a row with nothing to report shows — the same placeholder 任务 /
 *  工具调用 use, never a fabricated 0. */
const DASH = '—'

/** Steps between rate units. BINARY, matching the repo's own byte arithmetic
 *  (`fmtGb` in the sys family divides by 1024**3 and still calls the result GB):
 *  one card must not print 1000-based KB/s beside a 1024-based GB. */
const RATE_STEP = 1024
const RATE_UNITS = ['B/s', 'KB/s', 'MB/s', 'GB/s'] as const

/**
 * Bytes/second → `0 B/s` / `850 B/s` / `84 KB/s` / `1.2 MB/s`.
 *
 * WHY NOT `fmtTokens`: that helper formats a TOKEN MAGNITUDE — its steps are
 * 1000/1e6 and it prints a bare `12.2K` with no unit, because a token count needs
 * none. A rate is meaningless without its unit (12.2K of what per second?), and
 * its steps are binary. The two formatters are not interchangeable even though
 * both take "a number".
 *
 * One decimal below 10, whole numbers above: at the 10px body font a rate column
 * showing `1.24 MB/s` is noise, and the row is shared with a label.
 */
function fmtRate(bps: number): string {
  // A counter reset is clamped host-side; this is belt-and-braces so a NaN or a
  // negative delta can never print `NaN MB/s` on the tile. 0 is the only honest
  // floor for "we measured nothing moving".
  let value = Number.isFinite(bps) && bps > 0 ? bps : 0
  let unit = 0
  while (value >= RATE_STEP && unit < RATE_UNITS.length - 1) {
    value /= RATE_STEP
    unit += 1
  }
  const oneDecimal = Math.round(value * 10) / 10
  // The B/s rung is whole bytes (`0.4 B/s` is a rounding artefact, not a reading),
  // and a value that rounds up to 10 leaves the decimal behind (`10 KB/s`).
  const text = unit === 0 || oneDecimal >= 10 ? String(Math.round(oneDecimal)) : oneDecimal.toFixed(1)
  return `${text} ${RATE_UNITS[unit]}`
}

/**
 * The technology token inside a Windows adapter name, and the two ways this card
 * shortens that name.
 *
 * A Windows adapter name is `<vendor> <technology> <model> <rate> …`
 * (`MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card`), and all of it is far too
 * long for a 150px tile. The VENDOR is the one token that does not help tell two
 * adapters apart — this machine's Wi-Fi, Hyper-V and Loopback entries have three
 * different vendors, and nobody refers to an adapter by its vendor. The
 * technology token is how they are actually named, so both shortened forms are
 * built from it:
 *
 *   - the LEGEND prints the token alone (`Wi-Fi 6E`): it shares its single line
 *     with the uplink rate;
 *   - the 最忙 row starts AT the token and then takes as many characters as the
 *     value column can hold (`Wi-Fi 6E MT7922…`), so the technology AND the chip
 *     model survive where `MediaTek Wi-Fi 6…` would have spent the budget on the
 *     vendor.
 *
 * An OEM-only name with no token (`Realtek PCIe GbE Family Controller`) is left
 * alone: there is nothing to drop, and its head is then the best there is.
 */
const ADAPTER_TECH_RE = /(Wi-?Fi\s?[0-9][A-Za-z]?|Wi-?Fi|Ethernet|Bluetooth|WLAN|Hyper-V|Loopback|TAP|VPN|Thunderbolt)/i

/** The token alone — the ROW LABEL's form (`MediaTek Wi-Fi 6E MT7922 …` → `Wi-Fi 6E`). */
function shortAdapter(name: string): string {
  const hit = ADAPTER_TECH_RE.exec(name)
  if (hit !== null) return hit[1].replace(/\s+/g, ' ').trim()
  return name.trim().split(/\s+/)[0] ?? name
}

/**
 * NOTE ON THE LABEL BUDGET (integration edit, 2026-09-29).
 *
 * The first version of this card printed `下沉 / 上行 / 最忙` and the full adapter
 * name in a row, which cost it a 13-character budget measured against the
 * breakdown's SHARED `1fr auto` grid: the longest VALUE sets the value track and
 * the label column takes what is left, including a 14px right-edge fade mask. On
 * this machine's real names (`MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card`,
 * `Hyper-V Virtual Ethernet Adapter`, `Loopback Pseudo-Interface 1`, `Realtek PCIe
 * GbE Family Controller`) 13 characters was the largest uniform count that fit.
 *
 * The card no longer needs that budget: the rows are now the adapters themselves
 * and their label is the short token (≤ ~9 characters), while the value is a rate
 * (~55px). The measurement is kept here because the NEXT change to these rows has
 * the same constraint, and re-deriving it costs a browser session.
 */

/** The adapter name this machine really reports — used by the preview sample so
 *  the truncation is exercised on the string it has to survive in production. */
const SAMPLE_ADAPTER = 'MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card'

/**
 * The all-zero reading the preview pins (`sim.mode === 'idle'`).
 *
 * Zero traffic is a LEGAL reading, not a missing one, and the acceptance for this
 * card names it explicitly — so it gets its own preview cell instead of waiting
 * for the machine to go quiet at screenshot time.
 */
const IDLE_NET: NonNullable<HostOverview['net']> = {
  adapters: [{ name: SAMPLE_ADAPTER, rxBps: 0, txBps: 0 }],
  rxBps: 0,
  txBps: 0,
}

/** The live sample the offline previews render (bytes/second, from the host). */
const SAMPLE_NET: NonNullable<HostOverview['net']> = {
  adapters: [
    { name: SAMPLE_ADAPTER, rxBps: 1_258_291, txBps: 90_112 },
    { name: 'Hyper-V Virtual Ethernet Adapter', rxBps: 12_288, txBps: 4_096 },
    { name: 'Loopback Pseudo-Interface 1', rxBps: 0, txBps: 0 },
  ],
  rxBps: 1_270_579,
  txBps: 94_208,
}

/** The preview's host slice: only `net` is meaningful here, but HostOverview is
 *  one object, so the sibling sections are declared empty rather than omitted. */
const SAMPLE_HOST: HostOverview = { ts: 0, net: SAMPLE_NET, power: null, procs: null, services: [], proxy: null }

/**
 * The net slice this render reads: the live one, or the state the offline preview
 * pinned (`meta.sim.mode`, see `example.simSteps`). `sim` is only ever set by the
 * preview surfaces (market / 组件配置) — the rail passes just the size — so this
 * cannot pin a state on a live card.
 */
function netSlice(stats: WidgetStats, meta?: WidgetRenderMeta): HostOverview['net'] | null {
  const mode = meta?.sim?.mode
  if (mode === 'cold') return null
  if (mode === 'idle') return IDLE_NET
  return stats.host?.net ?? null
}

export default defineWidget({
  id: 'sys-net',
  name: () => t('widget.sys-net.name'),
  desc: () => t('widget.sys-net.desc'),
  builtin: false,
  group: 'device',
  // MUST mirror the manifest: the runtime's sizesOf() reads THIS descriptor, not
  // the manifest — gen-registry fails the build when the two disagree.
  sizes: ['2x2'],
  render: (stats, meta) => {
    const net = netSlice(stats, meta)
    // No counter pair yet: the first sample can only store a baseline, so the host
    // answers null. The shell paints this card's skeleton while the sys source is
    // in flight, so returning null is the whole degradation path — a measured zero
    // is a reading and falls through to the card below.
    if (net === null) return null
    // `adapters` is sorted by (rx + tx) descending host-side and may still be
    // EMPTY when no adapter name survived across the two samples (an adapter that
    // was re-enumerated in between). The row then prints `—` rather than vanishing:
    // a picked row count that changes with the data makes the card jump.
    return {
      title: t('card.sys-net.title'),
      // The head's ladder: blue title, the downlink as the 20px figure, the grey
      // caption under it. `value` is deliberately NOT set — with a `headAfter` head
      // it would be pushed into the body and print the same rate twice.
      headAfter: { big: fmtRate(net.rxBps) },
      // Uplink total + how many adapters are reporting. The arrow is the
      // language-neutral half of the pair; the COUNT is here rather than the
      // busiest adapter's name because the rows below already name every adapter,
      // and a reading printed twice is the thing this repo does not do (integration
      // edit, 2026-09-29 — the first version put the name here AND in a row).
      legend: net.adapters.length === 0
        ? `↑ ${fmtRate(net.txBps)}`
        : `↑ ${fmtRate(net.txBps)} · ${t('card.sys-net.adapters', { n: net.adapters.length })}`,
      // Bottom-anchored like every other detail card: the rows sit on the tile's
      // floor instead of marooning the leftover height underneath them.
      bodyAnchor: 'bottom',
      chart: {
        kind: 'breakdown',
        // ONE ROW PER ADAPTER (up to three), sorted by traffic host-side. This is
        // the card's only non-duplicated reading: which interface is carrying the
        // traffic, and how much of the total each one accounts for. A single active
        // adapter therefore repeats the figure — that is what a BREAKDOWN of a total
        // looks like, and it also says "all of this is that one link".
        breakdown: net.adapters.length === 0
          ? [{ label: t('card.sys-net.busiest'), value: DASH, tone: 'muted' as const }]
          : net.adapters.slice(0, 3).map((adapter) => ({
              label: shortAdapter(adapter.name),
              value: fmtRate(adapter.rxBps),
            })),
      },
    }
  },
  // A click on either preview walks the three shapes this card can take (see
  // `example.simSteps`), so the null/empty states are eyeballable without waiting
  // for a cold host or a quiet network.
  simToggle: () => t('card.sys-net.simToggle'),
  // Widget-owned preview data: with no live sample the card still renders its full
  // shape in the market / 组件配置 previews (a live record wins over this the moment
  // the host answers — see buildPreviewStats).
  example: {
    stats: { host: SAMPLE_HOST },
    // `sim` MUST be `simSteps[0]` (the stepper locates the current state by deep
    // equality, so a `sim` absent from the list makes the first click a no-op).
    sim: { mode: 'live' },
    simSteps: [{ mode: 'live' }, { mode: 'idle' }, { mode: 'cold' }],
  },
})
