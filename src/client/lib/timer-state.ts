/**
 * dsh-widgets — the TIMER STATE: one pure state machine shared by the two halves
 * of an interactive timer card.
 *
 * WHERE THE STATE LIVES, AND WHY. A card's `render` is pure DATA and runs on the
 * rail's own schedule (idle: once every 30s — see data/collector.tsx), so a
 * stopwatch cannot keep its own time in a widget: nothing would re-render it, and
 * nothing would survive a reload. `render` also cannot WRITE. The one durable,
 * cross-browser store a card already owns is its instance config
 * (`prefs.cardConfigs['<widget>@<size>']`, persisted through `/api/widgets-state`
 * and merged into the widget's stats by runtime/live-stats.ts). That is the store
 * this module reads and writes, so a running stopwatch survives a refresh AND is
 * the same reading in another browser pointing at this host.
 *
 * The fields are the whole machine:
 *   - `tmBase`   — milliseconds accumulated before the CURRENT segment;
 *   - `tmStart`  — epoch ms the current segment began, or `null` while paused;
 *   - `cdMin`    — the countdown's chosen length in MINUTES (written by `pick`).
 * Elapsed = `tmBase + (now - tmStart)`. The live TICK is the renderer's
 * (render/rich/timer-face.tsx) — exactly like the clock's second hand — because a
 * widget render cannot own an interval. The widget only ships the numbers.
 *
 * WHY OPS AND NOT TIMESTAMPS. The buttons are rendered by the rail from pure-data
 * `actions` / `controls`, so the only thing a card may hand back is an action ID.
 * The rail maps that ID to `applyTimerOp`, which samples `Date.now()` HERE — a
 * widget that passed a timestamp in its render output would write the instant the
 * card was drawn, not the instant the user pressed. Keeping on the closed
 * vocabulary (`timerOpOf` rejects anything else) also means a widget can never
 * write an arbitrary key into its own config through an action ID.
 *
 * THE VOCABULARY. `timer:start` / `timer:pause` / `timer:reset` act on the current
 * segment; `timer:pick:<minutes>` is the 倒计时 picker's press — it sets the length
 * AND starts, in one write, so a capsule cannot leave a half-configured card behind
 * (a card that set the minutes but failed to start would read as "paused at 00:00").
 */

/** The three segment operations, plus the countdown picker's "set length and go". */
export type TimerOpKind = 'start' | 'pause' | 'reset' | 'pick'

/** Action-ID prefix that routes a card action here instead of to a command. */
export const TIMER_OP_PREFIX = 'timer:'

/** One parsed operation. `pick` carries the chosen length in whole minutes. */
export interface TimerOp {
  kind: TimerOpKind
  minutes?: number
}

/** The shortest and longest countdown a capsule may start (1 minute … 24 hours). */
export const MIN_PICK_MINUTES = 1
export const MAX_PICK_MINUTES = 1440

/**
 * The operation an action ID names, or null when it is not a timer action.
 *
 * `timer:pick:5` → `{ kind: 'pick', minutes: 5 }`; a pick outside the accepted
 * range is REJECTED here (null) rather than clamped — a card that asks for a
 * 0-minute or 100-day countdown has a bug, and silently starting something else
 * would hide it.
 */
export function timerOpOf(actionId: string): TimerOp | null {
  if (typeof actionId !== 'string' || !actionId.startsWith(TIMER_OP_PREFIX)) return null
  const rest = actionId.slice(TIMER_OP_PREFIX.length)
  if (rest === 'start' || rest === 'pause' || rest === 'reset') return { kind: rest }
  if (rest.startsWith('pick:')) {
    const minutes = Number(rest.slice('pick:'.length))
    if (!Number.isInteger(minutes) || minutes < MIN_PICK_MINUTES || minutes > MAX_PICK_MINUTES) return null
    return { kind: 'pick', minutes }
  }
  return null
}

/** The persisted half of the machine (what one card instance stores). */
export interface TimerState {
  /** Milliseconds accumulated before the current segment. */
  baseMs: number
  /** Epoch ms the current segment started; null = paused. */
  startedAt: number | null
}

/** A finite number, or null — the config record is untrusted (JSON from disk). */
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Read the persisted state off one instance's config record.
 *
 * A missing or malformed field means "not started" (0 / paused) rather than a
 * throw: the store is a JSON file a user may edit, and a card that crashed on a
 * hand-typed `tmStart: "yesterday"` would take the whole rail entry with it.
 */
export function readTimerState(config: Record<string, unknown> | null | undefined): TimerState {
  if (config === null || config === undefined) return { baseMs: 0, startedAt: null }
  return { baseMs: num(config.tmBase) ?? 0, startedAt: num(config.tmStart) }
}

/** Elapsed milliseconds for a reading: the accumulated total plus the live segment. */
export function timerElapsedMs(state: TimerState, now: number): number {
  const live = state.startedAt === null ? 0 : Math.max(0, now - state.startedAt)
  return Math.max(0, state.baseMs + live)
}

/**
 * Apply one operation and return the config PATCH to merge.
 *
 * A patch, never the whole record: the widget's own settings (`cdCustom`, …) live in
 * the same map, and a timer action must not be able to drop them. An operation that
 * no-ops (starting an already running timer, pausing a paused one) returns an empty
 * patch, so the rail can skip the persist + emit round trip entirely.
 */
export function applyTimerOp(config: Record<string, unknown> | null | undefined, op: TimerOp, now: number): Record<string, unknown> {
  const state = readTimerState(config)
  switch (op.kind) {
    case 'start':
      return state.startedAt === null ? { tmStart: now } : {}
    case 'pause':
      return state.startedAt === null
        ? {}
        : { tmBase: state.baseMs + Math.max(0, now - state.startedAt), tmStart: null }
    case 'reset':
      return state.baseMs === 0 && state.startedAt === null && config?.cdMin === undefined
        ? {}
        : { tmBase: 0, tmStart: null }
    case 'pick': {
      const minutes = op.minutes ?? 0
      // The length is stored as the STRING the settings field holds (`mode`/`text`
      // fields in this plugin persist strings), and the run starts from zero.
      return { cdMin: String(minutes), tmBase: 0, tmStart: now }
    }
  }
}
