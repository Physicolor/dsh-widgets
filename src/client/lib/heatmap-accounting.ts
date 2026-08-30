/**
 * dsh-widgets — token heatmap self-accounting (shared data provider).
 *
 * The shell's dock collector owns the LIVE accounting loop; this module owns
 * the persistence primitives, the timezone-aware day attribution, the grid
 * builder and the boot-time repair/migration. Shared by the `heatmap` and
 * `heatmap-bars` widget units (each derives its own grid from the same raw log
 * the collector accumulates into localStorage under `harness-widgets.heatmap`).
 *
 * Moved verbatim out of the shell entry so the widget family owns its data
 * provider without the shell carrying 250 lines of heatmap history.
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

/** Add newly observed tokens to today; returns the running grid for the card. */
export function accumulateHeatmap(m: Record<string, number>, dayKey: string, delta: number): Record<string, number> {
  if (delta <= 0) return m
  const next = { ...m, [dayKey]: (m[dayKey] ?? 0) + delta }
  saveHeatmap(next)
  return next
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
const HEATMAP_LOG_KEY = 'harness-widgets.heatmap.log-v2'
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
/**
 * V2 migration: NEVER drop existing heatmap history. Preservation-only +
 * backfill of the authoritative recovered history. See the full story in the
 * original shell file comment; semantics are unchanged (moved verbatim).
 */
/** Daily totals rebuilt from the authoritative per-event session logs
 *  (D:/dsh-home/sessions/.../session.jsonl.zstd, decoded via ZSTD frame scan +
 *  the official tokenUsageOf delta algorithm, attributed by each usage
 *  EVENT's `time` in LOCAL time — not by session createdAt, because a session
 *  can span midnight. Sum is conserved: equals the all-session official total.
 *  IMPORTANT: non-live past days (8/14–8/21) are backfilled here — their
 *  sessions have ended, so the live collector will never re-credit them.
 *  8/22 must NOT be seeded: the live per-step accounting accumulates it in
 *  real time, and a fixed seed on top double-counts (8/22 was once 145M–181M). */
const HEATMAP_RECOVERED: Record<string, number> = {
  '2026-08-14': 74_315_859,
  '2026-08-15': 367_790_777,
  '2026-08-16': 1_195_700_475,
  '2026-08-17': 161_488_382,
  '2026-08-18': 292_337_504,
  '2026-08-19': 352_355_694,
  '2026-08-20': 214_853_935,
  '2026-08-21': 44_552_871,
  /* 8/22 intentionally absent — live-accumulated */
}
export function migrateHeatmapV2(): Record<string, number> {
  const m = loadHeatmap()
  try {
    // Ensure the recovered history is present REGARDLESS of the v2-log flag:
    // earlier builds may have run the buggy migration (flag set) but been left
    // with an empty/incomplete table, so the flag alone must not block the
    // backfill. Preserve any user value; only fill zeros.
    const next = { ...m }
    let patched = false
    for (const [k, v] of Object.entries(HEATMAP_RECOVERED)) {
      if ((next[k] ?? 0) === 0) { next[k] = v; patched = true }
    }
    // Repair double-counted live days: 8/21 & 8/22 are accumulated by the
    // real-time per-step accounting; a leftover fixed seed or an inflated
    // value (e.g. 145M/181M from the V2.0 double-write) must be removed so the
    // live path rebuilds them from the authoritative session events. Clear the
    // seen-set too, so those steps get re-credited once. Runs ONCE (guarded by
    // a marker) so it never wipes the live values on subsequent renders.
    const repairedKey = 'harness-widgets.heatmap.live-fixed'
    let repaired = false
    if (!localStorage.getItem(repairedKey)) {
      // Only the CURRENT live day may be cleared for re-accumulation — past
      // days are closed history and must never be wiped (the old hard-coded
      // 8/21+8/22 list would delete a finished day's value on a fresh browser).
      const liveDays = [dateKey(new Date())]
      for (const k of liveDays) {
        if ((next[k] ?? 0) > 0) { delete next[k]; repaired = true }
      }
      if (repaired) {
        saveHeatmap(next)
        saveSeen(new Set<string>(), 0)
      }
      localStorage.setItem(repairedKey, '1')
    }
    // One-shot: clear TODAY's cell so any polluted value from the pre-fix
    // accounting (cross-day over-credit that diffed a whole session history
    // into today) is dropped; the live collector rebuilds it from here on.
    const tzResetKey = 'harness-widgets.heatmap.today-reset-v1'
    if (!localStorage.getItem(tzResetKey)) {
      const tk = dateKey(new Date())
      if ((next[tk] ?? 0) > 0) { delete next[tk]; patched = true }
      localStorage.setItem(tzResetKey, '1')
    }
    // Re-backfill after the one-shot repair: clearing 8/21 dropped its value,
    // so restore the authoritative history for non-live days again.
    let refill = false
    for (const [k, v] of Object.entries(HEATMAP_RECOVERED)) {
      if ((next[k] ?? 0) === 0) { next[k] = v; refill = true }
    }
    if (refill) saveHeatmap(next)
    if (patched) saveHeatmap(next)
    if (!localStorage.getItem(HEATMAP_LOG_KEY)) {
      localStorage.setItem(HEATMAP_LOG_KEY, '1')
      saveSeen(new Set<string>(), 0)
    }
    return next
  } catch { return m }
}