/**
 * 套餐总览 (usage-mix) — the cross-platform quota board, 2×2.
 *
 *   ┌ 套餐总览 ──────────────╭───╮┐
 *   │ 92M                    │86%││   标题 → 今日用量 20px → 右上角占用环形
 *   │ 重置 2h13m             ╰───╯│   灰字 = 最紧窗口的回血倒计时
 *   │ ─────────────────────────────│   发丝分隔线
 *   │ 今日                   92M   │   今日永远第一行（灰）
 *   │ Command Code          86.0%  │   每个平台取自己最紧的窗口
 *   │ OpenCode Go           42.0%  │
 *   └──────────────────────────────┘
 *
 * TODAY FIRST (the owner's convention): the card leads with what the machine
 * actually SPENT, and `today` is the FIRST body row and never moves. The head
 * carries a DIFFERENT reading rather than repeating it — the headline figure is
 * today's tokens, the grey caption under it is when the tightest plan refills,
 * and the RING in the top-right corner is that plan's occupancy (the「缓存命中」
 * head-donut shape the owner pointed at, with the urgency ramp INVERTED: there a
 * high number is good (green), here a high number means a plan about to block).
 *
 * WHY ONE WINDOW PER ROW: OpenCode Go carries three windows and Command Code two
 * to three; a seven-column chart on a 150px tile is not a glance. Each ROW is a
 * POOL (the platform name, or `Command Code Ⅱ` for its second key pool),
 * reduced to the window closest to its cap — the binding one, which is what
 * "would I be blocked" asks. The per-window cards (usage-rolling/weekly/monthly,
 * cc-window-*) keep the full window-by-window breakdown.
 *
 * ── SIZE: 2×2 ONLY (owner's call, 2026-09-28) ─────────────────────────────────
 * The 2×4 was dropped. On the shared geometry (card-geometry.ts — pad 12, so a
 * 150px card's content box is 126px tall) its extra WIDTH could only buy a longer
 * reset line and one more pool row, never a chart: the available `bars` chart is
 * a FIXED 69px block (charts/bars.tsx: 56 + 4 + 9) and `barsV` is 77px, so
 * neither shares a 126px box with a head and three rows of data. A wide variant
 * would have been the same card with more chrome — so there is one size, one
 * shape, and the vertical rhythm below is tuned to it.
 *
 * HEIGHT AUDIT (why the rows stop at three): title 16 + headAfter 4+25 + caption
 * 2+12 + 3 rows (3·16 − 4 = 44) + the breakdown's 6px padding-top and 1px
 * hairline = 120 of the 126px content box. The head's RING (a 52px donut) raises
 * the head BLOCK to ~80px, so a fourth row would sit past the floor; MAX_ROWS = 3
 * (今日 + two pools) and the ranking below decides WHICH pools get those rows.
 *
 * NOTHING IS FABRICATED: a platform that is not configured at all is not drawn
 * (its row would be a permanent `—`), while a pool payload that answered with a
 * key whose slice did not keeps that key's row and prints `—` muted. Only when
 * nothing at all is configured does the card return null. Each row group can be
 * switched off in the component config — the explicit way to retire a plan (e.g.
 * an OpenCode subscription no longer renewed) without losing the card.
 *
 * ── TONE ─────────────────────────────────────────────────────────────────────
 * The widget owns the direction (the renderer never guesses): quota occupancy —
 * HIGH IS BAD. <75% success, ≥75% warn, ≥95% danger, no reading muted, for both
 * the rows and the ring. The 今日 row is deliberately `muted` always: tokens
 * spent are information, not danger.
 *
 * All reads are the sync projections the collector already folds; the math
 * (normalisation, the per-pool reduction, the countdown) lives here, pure.
 * `Date.now()` is read for the countdown and the local day key (display only).
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, ConfigField, UsageData, WidgetChart, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { dayKey, fmtTokens } from '../../client/lib/format'

/** 70% of a Command Code plan's monthly allowance in USD credits. The API
 *  publishes no monthly window and no allowance field, so the month figure is
 *  derived from the remaining balance against the one plan whose figures are
 *  published (GOAT: $10 buys $70 of credits) — the same rule the cc family's own
 *  monthly window uses, restated here rather than reached for through that
 *  family's view helper (which carries the pool switcher, the plan table and its
 *  own dictionary keys — none of which this board's reduction needs). */
const PLAN_MONTHLY_ALLOWANCE: Record<string, number> = { 'individual-goat': 70 }

/** Body ROWS the board carries, 今日 included (see the height audit above). */
const MAX_ROWS = 3

/** Pool ordinal suffix: 1 → ' Ⅰ', 2 → ' Ⅱ', 3 → ' Ⅲ', … Roman numerals, because
 *  they read like part of an English name and cost one glyph of width (the
 *  owner's call — `第 2 号` was rejected as ugly). The leading space is part of
 *  the suffix so the label reads `Command Code Ⅱ` and never `Command CodeⅡ`.
 *  Only the symbols a real pool count can reach are listed; a surprise count past
 *  Ⅻ falls back to the ASCII numeral rather than rendering a wrong glyph.
 *
 *  INDEX 1 IS 'Ⅰ', not 'Ⅱ': the call sites are `poolSuffix(i + 1)` over a 0-based
 *  key list, so the FIRST pool asks for index 1 — and a platform only reaches here
 *  when it has several pools (`multi`), where every pool needs a mark to be
 *  distinguishable. (The table shipped one symbol high for a few hours because this
 *  comment claimed `1 → ''` while the array said `1 → 'Ⅱ'`: a mutation test proved
 *  the array was READ, which is not the same as proving it was ALIGNED.) */
const ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ']
function poolSuffix(n: number): string {
  return n >= 1 && n < ROMAN.length ? ` ${ROMAN[n]!}` : ` ${n}`
}

/** One window a pool reports: what it occupies, when it refills, and which
 *  cadence it is (the mark the caption names). */
interface Win {
  pct: number
  resetMs: number | null
  /** Short window mark: Δ rolling / W weekly / M monthly / 5h five-hour. */
  mark: string
}

/** One ROW of the board: a platform, or one member of a platform's key pool. */
interface PoolRow {
  label: string
  wins: Win[]
  /** The platform this row belongs to — the round-robin grouping key. */
  group: string
  /** This row's position in its platform's own payload (1-based): the stable
   *  tie-break when two pools sit at the same occupancy. */
  ordinal: number
}

/** Occupancy tone: the higher the percentage the worse the state. */
function toneOf(pct: number): BarDatum['tone'] {
  return pct >= 95 ? 'danger' : pct >= 75 ? 'warn' : 'success'
}

/** One used/cap window's occupied percent, clamped, or null when unusable. */
function pctOf(used: unknown, cap: unknown): number | null {
  if (typeof used !== 'number' || typeof cap !== 'number') return null
  if (!Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return null
  return Math.min(100, Math.max(0, (used / cap) * 100))
}

/** A percent already expressed 0..100, clamped, or null when unusable. */
function pct100(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null
}

/** A reset stamp as epoch ms (OpenCode answers ISO, Command Code epoch ms). */
function resetMsOf(at: unknown): number | null {
  if (typeof at === 'number') return Number.isFinite(at) && at > 0 ? at : null
  if (typeof at !== 'string' || at === '') return null
  const ms = Date.parse(at)
  return Number.isFinite(ms) ? ms : null
}

/** The tightest window of a row — the one that would block it first. Ties keep
 *  the FIRST candidate, so each builder's order below is the tie-break. */
function tightest(wins: Win[]): Win | null {
  let best: Win | null = null
  for (const w of wins) if (best === null || w.pct > best.pct) best = w
  return best
}

/** OpenCode Go's three windows, in tie-break order (rolling → weekly → monthly). */
function openCodeWins(u: { rolling?: unknown; weekly?: unknown; monthly?: unknown } | null | undefined): Win[] {
  if (u === null || u === undefined || typeof u !== 'object') return []
  const at = (k: 'rolling' | 'weekly' | 'monthly'): { percent?: unknown; resetsAt?: unknown } | undefined =>
    (u as Record<string, { percent?: unknown; resetsAt?: unknown } | undefined>)[k]
  const wins: Win[] = []
  for (const [k, mark] of [['rolling', 'Δ'], ['weekly', 'W'], ['monthly', 'M']] as const) {
    const item = at(k)
    const p = pct100(item?.percent)
    if (p !== null) wins.push({ pct: p, resetMs: resetMsOf(item?.resetsAt), mark })
  }
  return wins
}

/**
 * Command Code's windows for ONE account, in tie-break order: 5h, weekly, then
 * the derived month.
 *
 * The month needs BOTH a remaining balance AND a subscription slice (a missing
 * `/billing/subscriptions` answer is a failed fetch, not an exotic plan — the
 * two are different calibers), then reads `allowance − remaining` against the
 * published allowance; only a plan the table does not carry falls back to the
 * balance-conservation form. Returns [] for an account the host never filled.
 */
function commandCodeWins(a: {
  usage?: { totalMonthlyCredits?: number } | null
  credits?: { credits?: { monthlyCredits?: number } | null; windowLimits?: { fiveHour?: unknown; weekly?: unknown } | null } | null
  subscription?: { data?: { planId?: string; currentPeriodEnd?: string } | null } | null
} | null | undefined): Win[] {
  if (a === null || a === undefined) return []
  const wins: Win[] = []
  const five = a.credits?.windowLimits?.fiveHour as { used?: unknown; cap?: unknown; resetAt?: unknown } | undefined
  const pct5 = pctOf(five?.used, five?.cap)
  if (pct5 !== null) wins.push({ pct: pct5, resetMs: resetMsOf(five?.resetAt), mark: '5h' })
  const week = a.credits?.windowLimits?.weekly as { used?: unknown; cap?: unknown; resetAt?: unknown } | undefined
  const pctW = pctOf(week?.used, week?.cap)
  if (pctW !== null) wins.push({ pct: pctW, resetMs: resetMsOf(week?.resetAt), mark: 'W' })

  const remaining = a.credits?.credits?.monthlyCredits
  const sub = a.subscription
  if (typeof remaining === 'number' && Number.isFinite(remaining) && sub !== null && sub !== undefined && sub.data !== null && sub.data !== undefined) {
    const resetMs = resetMsOf(sub.data.currentPeriodEnd)
    const allowance = typeof sub.data.planId === 'string' ? PLAN_MONTHLY_ALLOWANCE[sub.data.planId] : undefined
    if (typeof allowance === 'number' && allowance > 0) {
      const used = Math.min(allowance, Math.max(0, allowance - remaining))
      wins.push({ pct: (used / allowance) * 100, resetMs, mark: 'M' })
    } else {
      const used = a.usage?.totalMonthlyCredits
      if (typeof used === 'number' && Number.isFinite(used)) {
        const cap = used + remaining
        if (cap > 0) wins.push({ pct: Math.min(100, Math.max(0, (used / cap) * 100)), resetMs, mark: 'M' })
      }
    }
  }
  return wins
}

/** Today's tokens. The Command Code-SCOPED log is preferred and the machine-wide
 *  one is only the fallback: the scoped map is what the plan itself served,
 *  while `heatmapRaw` also counts every other provider the harness used. */
function todayTokens(stats: WidgetStats, todayKey: string): number | null {
  const day = (log: Record<string, number> | undefined): number | null => {
    if (log === null || log === undefined) return null
    const v = log[todayKey]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  return day(stats.commandCodeDaily) ?? day(stats.heatmapRaw)
}

/** A per-instance toggle, defaulting ON: the config record rides on `stats`
 *  (the shell merges `cardConfigs[instance]` last), so a card that has never been
 *  configured and a card whose switch is on are the same read. */
function on(stats: WidgetStats, key: string): boolean {
  return stats[key] !== false
}

/**
 * How long until a reset: `2h14m` / `45m` / `3d` / `now`.
 *
 * Deliberately NOT the shared `fmtAgo` (which answers "how long AGO"): a
 * countdown read through it says the opposite. A reset already in the past prints
 * `now` — the provider simply has not republished the rolled window yet.
 */
function untilText(ms: number, now: number): string {
  const left = ms - now
  if (left <= 0) return 'now'
  const mins = Math.floor(left / 60_000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h${mins % 60}m`
  return `${Math.floor(hours / 24)}d`
}

/**
 * The board's rows: one per plan — a platform with a key pool contributes its
 * MEMBERS individually (two keys = two rows), which is the "即便同一个套餐也可能
 * 有多个号池" reading, and also what keeps the card honest when one pool is
 * exhausted and its sibling is fresh. The second pool of a platform is named with
 * a Roman numeral (`Command Code Ⅱ`).
 *
 * A platform appears only when it is CONFIGURED (config switch on AND a payload
 * slice exists); a pool that answered with a key whose slice did not keeps that
 * key's row as a dash.
 */
function buildPoolRows(stats: WidgetStats): PoolRow[] {
  const rows: PoolRow[] = []
  if (on(stats, 'showOpenCode')) {
    const data = stats.usageData
    const keys = stats.usageMulti?.keys
    const group = t('card.usage-mix.opencode')
    // A pool payload that answered with any member at all means this platform IS
    // configured — every key gets a row, by its own ordinal, including one whose
    // slice has not answered (that row prints `—`). A pool that did not answer
    // (absent `keys`) and no single-key payload means nothing was configured, so
    // the platform draws no row at all.
    if (Array.isArray(keys) && keys.length > 0) {
      // An ordinal ONLY when the platform really has several pools: a lone key
      // wearing `Ⅰ` would read as if a second one were expected.
      const multi = keys.length > 1
      keys.forEach((k, i) => rows.push({ label: multi ? `${group}${poolSuffix(i + 1)}` : group, wins: openCodeWins(k.data?.usage), group, ordinal: i + 1 }))
    } else if (data !== null && data !== undefined) {
      rows.push({ label: group, wins: openCodeWins(data.usage), group, ordinal: 1 })
    }
  }
  if (on(stats, 'showCommandCode')) {
    const cc = stats.commandCode
    if (cc !== null && cc !== undefined) {
      const group = t('card.usage-mix.commandcode')
      const keys = cc.keys
      if (Array.isArray(keys) && keys.length > 0) {
        const multi = keys.length > 1
        keys.forEach((k, i) => rows.push({ label: multi ? `${group}${poolSuffix(i + 1)}` : group, wins: commandCodeWins(k.data), group, ordinal: i + 1 }))
      } else {
        rows.push({ label: group, wins: commandCodeWins(cc), group, ordinal: 1 })
      }
    }
  }
  return rows
}

/**
 * The rows in BOARD order: the platform with the tightest plan leads, its pools
 * ranked inside it, then the platforms are dealt round-robin.
 *
 * Three rules, each earning its place on a 126px tile:
 *   1. tightest first — a fresh plan must never push an exhausted one off the
 *      tile, which is the one failure this card exists to prevent;
 *   2. ranked INSIDE a platform — a platform's most-loaded key represents it;
 *   3. one row per platform per round — a platform with five key pools would
 *      otherwise fill every slot and the OTHER platform would vanish, which is
 *      exactly the cross-platform reading the card is for. The cap then trims
 *      from the tail, so a platform that never answered (its rows rank last,
 *      `peak` -1) is dropped before any number is.
 *
 * Ties keep their ordinal (rule 2's sort is by peak, then by pool ordinal), so a
 * platform whose pools sit at the same occupancy still names its FIRST one with
 * the plain platform name and only the later ones with Ⅱ/Ⅲ — the numbering never
 * depends on which pool happens to be loaded more.
 */
function byPeak(rows: PoolRow[]): PoolRow[] {
  const groups = new Map<string, PoolRow[]>()
  for (const r of rows) {
    const g = groups.get(r.group)
    if (g === undefined) groups.set(r.group, [r])
    else g.push(r)
  }
  const peakOf = (r: PoolRow): number => tightest(r.wins)?.pct ?? -1
  const queues = [...groups.values()]
    .map((g) => [...g].sort((a, b) => peakOf(b) - peakOf(a) || a.ordinal - b.ordinal))
    .sort((a, b) => peakOf(b[0]) - peakOf(a[0]))
  const out: PoolRow[] = []
  for (let round = 0; out.length < rows.length; round++) {
    for (const q of queues) if (round < q.length) out.push(q[round])
  }
  return out
}

function usageMixRender(stats: WidgetStats): WidgetRenderOut | null {
  const now = Date.now()
  // Tightest first: the row cap must never hide the plan that is about to block.
  const rows = byPeak(buildPoolRows(stats))
  const today = todayTokens(stats, dayKey(new Date(now)))
  const showToday = on(stats, 'showDaily')
  // Nothing configured, nothing spent: the card has no subject at all.
  if (rows.length === 0 && (!showToday || today === null)) return null

  // The tightest window on the board drives the ring (its occupancy). The grey
  // caption names WHICH window that is and when it refills — but only when the
  // answer is actionable: a rolling window that returns in two hours is worth a
  // line on the tile, a month that returns in three weeks is not (it is a fact
  // about the plan, not a "wait this out" instruction). So the caption is drawn
  // only for a reset inside a day, which in practice means the rolling / 5h
  // window — the two cadences the owner asked to see.
  const peak = rows
    .map((r) => tightest(r.wins))
    .filter((w): w is Win => w !== null)
    .reduce<Win | null>((best, w) => (best === null || w.pct > best.pct ? w : best), null)
  const caption = resetCaption(peak, now)

  const breakdown: NonNullable<WidgetChart['breakdown']> = []
  if (showToday) breakdown.push({ label: t('card.usage-mix.today'), value: today === null ? '—' : fmtTokens(today), tone: 'muted' })
  const rowCap = Math.max(0, MAX_ROWS - breakdown.length)
  for (const r of rows.slice(0, rowCap)) {
    const w = tightest(r.wins)
    breakdown.push(w === null
      ? { label: r.label, value: '—', tone: 'muted' }
      : { label: r.label, value: `${w.pct.toFixed(1)}%`, tone: toneOf(w.pct) })
  }

  // The ladder, one rung per field: blue title above, the figure in
  // `headAfter.big`, the grey caption as the `legend` line UNDER it. `value` stays
  // empty — with a headRing it would have no owner and print the figure twice.
  //
  // The caption is the LEGEND (its own line), not `headAfter.small` (the figure's own
  // row): the ring leaves the head's left column ~64px, and figure + caption side by
  // side needed 45 + 65 of them — measured 2026-09-29, both clipped to 「9...」 /
  // 「5h 重...」 on the preview. The card's own height audit (see the header) already
  // budgets the caption as its own 2+12px line, so this is the shape it was costed for.
  const headAfter: NonNullable<WidgetRenderOut['headAfter']> = {
    big: showToday && today !== null ? fmtTokens(today) : peak === null ? '—' : `${peak.pct.toFixed(1)}%`,
  }

  return {
    title: t('widget.usage-mix.name'),
    headAfter,
    ...(caption === null ? {} : { legend: caption }),
    // The head's right slot: the board's tightest quota as a donut, with the
    // 缓存命中 head-ring geometry but the INVERTED urgency ramp — there high is
    // good (green), here high means a plan about to block (red). `icon` is the
    // ring's only glyph (a stroked cylinder, the quota/store metaphor); the exact
    // figure rides the hover text because the tile rounds to one decimal.
    ...(peak === null
      ? {}
      : {
          headRing: {
            ratio: peak.pct / 100,
            tone: toneOf(peak.pct),
            icon: 'database' as const,
            label: `${peak.pct.toFixed(1)}%`,
          },
        }),
    // The rows keep the card's floor: the head is the title + the figure, and the
    // slack lands between the figure and the rows.
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown },
  }
}

/**
 * The grey caption under the headline: WHICH window is the board's tightest one
 * and when it refills — drawn only when the answer is actionable (a reset inside
 * a day, which in practice means the rolling / 5h cadence). A monthly window that
 * returns in three weeks is a fact about the plan, not a "wait this out"
 * instruction, and it would spend the tile's one grey line saying nothing.
 *
 * The window it names is the PEAK window (the one the ring draws), so the ring
 * and the caption always describe the same reading. The row's own other windows
 * keep their dedicated cards (usage-rolling/weekly/monthly, cc-window-*).
 *
 * Two guards, and the second is the subtle one: a DERIVED month (Command Code
 * publishes no monthly window — the figure comes from the remaining balance)
 * carries no reset stamp at all, i.e. `undefined` rather than `null`, and the
 * truthiness test is what keeps a countdown from being formatted out of nothing.
 */
function resetCaption(peak: Win | null, now: number): string | null {
  const ms = peak?.resetMs
  if (typeof ms !== 'number') return null
  if (ms - now > 24 * 3_600_000) return null
  return t('card.usage-mix.legend', { win: t(`card.usage-mix.mark.${peak!.mark}`), at: untilText(ms, now) })
}

/**
 * Preview: a live-shaped pair of plans, BOTH with key pools, so the market
 * preview shows the whole board — two OpenCode pools, two Command Code pools
 * (`Command Code` and `Command Code Ⅱ`), the muted 今日 row, the ring and the
 * countdown. The ranking is exercised by the example itself: the row cap hides
 * the least loaded pool, and the round-robin keeps both platforms on the tile.
 * Every value is deterministic; only the countdown moves with the clock.
 */
function previewStats(): Partial<WidgetStats> {
  const now = new Date()
  const day = (offset: number): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  const iso = (offsetMs: number): string => new Date(now.getTime() + offsetMs).toISOString()
  const DAY = 86_400_000
  const daily: Record<string, number> = {}
  let today = 0
  for (let i = 0; i < 14; i++) {
    const v = i === 13 ? 92_000_000 : 40_000_000 + ((i * 173) % 37) * 1_500_000
    daily[dayKey(day(i - 13))] = v
    if (i === 13) today = v
  }
  /** One OpenCode Go key's three windows (typed with the contract's own shape). */
  const ocData = (rolling: number, weekly: number, monthly: number, rollMs: number): UsageData => ({
    usage: {
      rolling: { status: 'ok', percent: rolling, resetsAt: iso(rollMs) },
      weekly: { status: 'ok', percent: weekly, resetsAt: iso(4 * DAY) },
      monthly: { status: 'ok', percent: monthly, resetsAt: iso(21 * DAY) },
    },
  })
  /** One Command Code pool member: 5h / weekly used plus its own remaining
   *  balance (so its own month ~43%), with a label/tail pair like the host's. */
  const ccKey = (used5: number, usedWeek: number, remaining: number, label: string) => ({
    ref: `preview-${label}`,
    label,
    tail: label.slice(-4),
    data: {
      whoami: null,
      usage: { totalCost: 70 - remaining, totalTokens: today, totalMonthlyCredits: 70 - remaining },
      credits: {
        credits: { monthlyCredits: remaining, creditThreshold: 0, freeCredits: 0, purchasedCredits: 0, belowThreshold: false },
        windowLimits: {
          limited: true,
          exceeded: null,
          fiveHour: { used: used5, cap: 14, exceeded: false, resetAt: now.getTime() + 3 * 3_600_000 },
          weekly: { used: usedWeek, cap: 35, exceeded: false, resetAt: now.getTime() + 2 * DAY },
        },
      },
      subscription: {
        success: true,
        data: { id: `sub-${label}`, status: 'active', planId: 'individual-goat', currentPeriodStart: iso(-9 * DAY), currentPeriodEnd: iso(21 * DAY) },
      },
    },
  })
  const first = ocData(38.0, 20.0, 8.0, 2 * 3_600_000 + 14 * 60_000)
  return {
    // OpenCode Go: key 1 is tightest on its ROLLING window (38%), key 2 on its
    // WEEKLY one (35%) — the pools differ visibly and both cadences exist.
    usageMulti: {
      total: null,
      keys: [
        { ref: 'preview-oc-1', label: 'Physicolor', data: first },
        { ref: 'preview-oc-2', label: 'Sparxie', data: ocData(12.0, 35.0, 6.1, 4 * 3_600_000) },
      ],
    },
    usageData: first,
    // Command Code's two keys carry the higher readings, so the ring, the caption
    // and the Roman-numeral ordinal are all exercised by the preview itself. The
    // lead key sits on its 5h window (12.8/14 = 91.4%, three hours to refill), so
    // the demo shows the ACTIONABLE countdown cadence rather than a 21-day month.
    commandCode: {
      whoami: null,
      usage: null,
      credits: null,
      subscription: null,
      keys: [ccKey(12.8, 8.4, 40, 'Physicolor'), ccKey(3.4, 18.2, 30.4, 'Sparxie')],
    },
    commandCodeDaily: daily,
  }
}

export default defineWidget({
  id: 'usage-mix',
  name: () => t('widget.usage-mix.name'),
  desc: () => t('widget.usage-mix.desc'),
  builtin: true,
  group: 'coding-plan',
  // MUST mirror the manifest: the runtime's sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: usageMixRender,
  configSchema: [
    { key: 'showDaily', label: () => t('card.usage-mix.cfg.daily'), type: 'toggle', default: true },
    { key: 'showOpenCode', label: () => t('card.usage-mix.cfg.opencode'), type: 'toggle', default: true },
    { key: 'showCommandCode', label: () => t('card.usage-mix.cfg.commandcode'), type: 'toggle', default: true },
  ] satisfies ConfigField[],
  example: { stats: previewStats },
})
