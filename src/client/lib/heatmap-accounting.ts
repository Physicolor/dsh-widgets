/**
 * dsh-widgets — token heatmap day data (shared data provider).
 *
 * TWO SOURCES, ONE DISPLAYED NUMBER:
 *  1. AUTHORITATIVE (preferred): the host route `/api/widgets-usage-daily`
 *     re-serves dsh-usage-center's per-day totals, which are folded from the
 *     session logs. The shell's collector stores that map in `state.usageDaily`
 *     and the cards render it as-is — this is why the heatmap total now equals
 *     the usage center's total instead of drifting from it.
 *  2. FALLBACK (standalone installs, usage-center absent): this module's own
 *     live per-step accounting, accumulated in localStorage while a page with an
 *     active session is open.
 *
 * This module owns the fallback's persistence primitives, the timezone-aware day
 * attribution, the grid builder, and the boot-time purge of days older builds
 * fabricated. Shared by the `heatmap` and `heatmap-bars` widget units (each
 * derives its own grid from the same raw log).
 */

// ── Daily token-usage heatmap (self-accounted to localStorage). ──
const HEATMAP_KEY = 'harness-widgets.heatmap'

function loadHeatmap(): Record<string, number> {
  try { const raw = localStorage.getItem(HEATMAP_KEY); return raw ? JSON.parse(raw) as Record<string, number> : {} } catch { return {} }
}
function saveHeatmap(m: Record<string, number>): void {
  try { localStorage.setItem(HEATMAP_KEY, JSON.stringify(m)) } catch { /* storage unavailable */ }
}
/** Default heatmap accounting timezone: Beijing (UTC+8). Configurable per
 *  heatmap card (cardConfigs.heatmap.timeZone); 'local' = browser clock. */
export const DEFAULT_TZ = 'Asia/Shanghai'
export function dateKey(d: Date, tz?: string): string {
  const tzName = tz || DEFAULT_TZ
  if (tzName !== 'local') {
    try {
      // en-CA formats as YYYY-MM-DD in the requested timezone — the calendar
      // day boundary follows the timezone, not the browser clock.
      return new Intl.DateTimeFormat('en-CA', { timeZone: tzName }).format(d)
    } catch { /* unknown tz → fall through to local calendar day */ }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Build a horizontal (GitHub-style) heatmap grid: 7 rows (Sun..Sat) × weeks
 *  as columns (~13 wide). Two window-alignment modes:
 *   - 'rolling' : classic rolling window — the last 13 weeks ending today,
 *     so today is always pinned to the right edge (future is unknowable).
 *   - 'quarter' : align to the current calendar quarter (1–3, 4–6, 7–9,
 *     10–12月) that contains today; today then lands wherever it naturally
 *     falls within the quarter (e.g. mid-quarter dates sit toward the middle).
 *  Future columns render empty (value 0), shown faint. */
export function buildHeatmapGrid(m: Record<string, number>, mode: 'rolling' | 'quarter' = 'rolling', tz?: string): Array<Array<{ value: number; date: string }>> {
  const weeks = 13
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()) // this week's Sunday
  let base: Date
  if (mode === 'quarter') {
    // Current calendar quarter start (month 0-based → floored to 0/3/6/9, day 1).
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    // Anchor on the Sunday on/before the quarter start, then span `weeks` columns.
    base = new Date(qStart.getFullYear(), qStart.getMonth(), qStart.getDate() - qStart.getDay())
  } else {
    // Rolling: today's week pinned to the last column.
    base = new Date(startOfWeek)
    base.setDate(base.getDate() - (weeks - 1) * 7)
  }
  const grid: Array<Array<{ value: number; date: string }>> = []
  for (let r = 0; r < 7; r++) {
    const row: Array<{ value: number; date: string }> = []
    for (let c = 0; c < weeks; c++) {
      const d = new Date(base)
      d.setDate(base.getDate() + c * 7 + r)
      const k = dateKey(d, tz)
      row.push({ value: m[k] ?? 0, date: k })
    }
    grid.push(row)
  }
  return grid
}

/**
 * Boot-time store preparation: load the log and drop the fabricated days older
 * builds wrote into it.
 *
 * WHY THE PURGE EXISTS. Earlier versions seeded "recovered history" as literal
 * constants (v1.1.x `seedHeatmapIfNeeded`, later `HEATMAP_RECOVERED`). Those
 * constants were never derived from the logs — measured 2026-09-12, the store
 * held 244.19M / 1639.55M / 1319.26M for 2026-08-14/15/16 while the real totals
 * were 75.24M / 373.37M / 1204.72M, i.e. the card reported 7.72G against a true
 * 6.28G (+23%).
 *
 * The live path is now the AUTHORITATIVE per-day table served by the host
 * (`/api/widgets-usage-daily`, read from dsh-usage-center when installed — see
 * src/index.ts); this browser-local log is only the standalone fallback. Since a
 * fallback may not carry fiction, the baked-in days are removed once so the
 * fallback shows nothing rather than something wrong. Live-accumulated days
 * (2026-08-22 onward) are untouched: only the baked date list is cleared.
 *
 * @returns the cleaned daily log.
 */
const BAKED_DAYS_PURGE_KEY = 'harness-widgets.heatmap.baked-purge-v1'
/** The exact days old builds fabricated values for (never measured). */
const BAKED_DAYS = [
  '2026-08-14',
  '2026-08-15',
  '2026-08-16',
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-20',
  '2026-08-21',
]
export function loadHeatmapStore(): Record<string, number> {
  const store = loadHeatmap()
  try {
    if (localStorage.getItem(BAKED_DAYS_PURGE_KEY) !== null) return store
    const next = { ...store }
    let dropped = false
    for (const day of BAKED_DAYS) {
      if ((next[day] ?? 0) > 0) {
        delete next[day]
        dropped = true
      }
    }
    localStorage.setItem(BAKED_DAYS_PURGE_KEY, '1')
    if (dropped) saveHeatmap(next)
    return next
  } catch {
    return store
  }
}

/** Add newly observed tokens to today; returns the running grid for the card. */
export function accumulateHeatmap(m: Record<string, number>, dayKey: string, delta: number): Record<string, number> {
  if (delta <= 0) return m
  const next = { ...m, [dayKey]: (m[dayKey] ?? 0) + delta }
  saveHeatmap(next)
  return next
}

/**
 * Merge the live local counter into the authoritative day map — TODAY ONLY.
 *
 * The authoritative map is folded from the session logs on usage-center's own
 * cadence (~30 s), so right after a turn it still carries the PREVIOUS figure
 * and the card looks frozen even though the finished step's usage is already
 * measurable locally. Today therefore keeps the LARGER of the two; every other
 * day stays purely authoritative, because this browser only ever sees the
 * sessions it had open and must never rewrite the account's history.
 *
 * @param authoritative - the host's day map, or null/undefined when absent.
 * @param local - the live local counter (this browser's per-step credits).
 * @param todayKey - today in the accounting timezone.
 * @returns the map the cards should render.
 */
export function mergeToday(authoritative: Record<string, number> | null | undefined, local: Record<string, number>, todayKey: string): Record<string, number> {
  if (authoritative === null || authoritative === undefined) return local
  const localToday = local[todayKey] ?? 0
  return localToday > (authoritative[todayKey] ?? 0) ? { ...authoritative, [todayKey]: localToday } : authoritative
}

// Heatmap self-accounting: primary = per-step crediting (v2) when settled
// nodes carry per-node `usage` (exact day attribution by step start time);
// fallback = cumulative-delta with a session anchor (v1) when nodes lack
// `usage` (host may not project it into the folded surface). v1's known
// cross-midnight over-credit is avoided by anchoring on observed total growth
// and RESET, never a bare "new day → 0" (the anchor is only rebuilt on a
// cumulative fallback, i.e. a genuinely new session/log).
const HEATMAP_SEEN = 'harness-widgets.heatmap.seen'
const HEATMAP_SEEN_STRONGEST = 'harness-widgets.heatmap.strongest'
const HEATMAP_ANCHOR = 'harness-widgets.heatmap.anchor'
export function loadSeen(): { keys: Set<string>; strongest: number } {
  try {
    const keys = new Set<string>()
    const raw = localStorage.getItem(HEATMAP_SEEN)
    if (raw) for (const k of JSON.parse(raw) as string[]) if (typeof k === 'string') keys.add(k)
    const sRaw = localStorage.getItem(HEATMAP_SEEN_STRONGEST)
    const strongest = Number.isFinite(+(sRaw ?? '')) ? +(sRaw ?? '') : 0
    return { keys, strongest }
  } catch { return { keys: new Set<string>(), strongest: 0 } }
}
export function saveSeen(keys: Set<string>, strongest: number): void {
  try {
    localStorage.setItem(HEATMAP_SEEN, JSON.stringify([...keys]))
    localStorage.setItem(HEATMAP_SEEN_STRONGEST, String(strongest))
  } catch { /* storage unavailable */ }
}
export function loadHeatmapAnchor(): number {
  try {
    const n = +(localStorage.getItem(HEATMAP_ANCHOR) ?? '')
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch { return 0 }
}
export function saveHeatmapAnchor(n: number): void {
  try { localStorage.setItem(HEATMAP_ANCHOR, String(n)) } catch { /* storage unavailable */ }
}
