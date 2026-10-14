/**
 * 秒表 (stopwatch) — a counted-up timer the user drives from the card itself.
 *
 * WHAT IT IS FOR. The rail is the surface the user is already watching while
 * working, so the one measurement that has no other home is "how long has this
 * been going on": a run, a build, a focus stretch. The 时钟 card next door answers
 * "what time is it", which is a different question — an instant cannot tell you how
 * much time has PASSED since you started caring.
 *
 * THE BODY IS THE OWNER'S REFERENCE (2026-10-14): a large `00:00:56.29` reading —
 * hundredths in the product's accent — over two round controls, the secondary one
 * an outlined ring (复位) and the main press a filled disc that flips between ▶ and
 * ‖ (开始 / 继续 / 暂停). That is `TimerRich.layout: 'dial'`, and it is why this card
 * carries NO TITLE: per docs/design/CARD-TITLE-STANDARD.md a title may be dropped
 * only when the body names itself AND fills the tile, and this one does both — a
 * hundredths stopwatch over play/pause discs is not mistakable for a countdown, and
 * the 120px body owns the titleless tile (`12 + 120 + 12 = 144 ≤ 150`). The 倒计时
 * card, whose reading could be either thing, keeps its title and its pill buttons.
 *
 * WHY THE READING CANNOT LIVE ON THE WIDGET. A widget `render` is pure data and the
 * rail only calls it when the data CHANGES (idle: once every 30s — see
 * `data/collector.tsx`), so a stopwatch wired to widget renders would jump in
 * 30-second steps, and `render` cannot own an interval anyway. The figure is
 * therefore drawn and ticked by the renderer on its own clock — 100ms here, because
 * the card prints hundredths — exactly like the dial's second hand:
 * `render/rich/timer-face.tsx`. This widget ships the two NUMBERS the reading is
 * made of and nothing that could go stale — `at` is written only when a preview
 * PINNED an instant, which is what makes the offline render snapshot and the gallery
 * screenshots reproducible.
 *
 * WHERE THE STATE LIVES. Not in React state, and not in this module: in the card
 * instance's own config (`prefs.cardConfigs['stopwatch@2x2']`, persisted through
 * `/api/widgets-state` and merged into the widget's stats by `runtime/live-stats.ts`).
 * That is the one store a card already owns, and it is what makes a running
 * stopwatch the same reading after a page refresh and in a different browser pointed
 * at this host. The field names are the shared machine's (`tmBase` / `tmStart`), read
 * through `readTimerState` — never re-derived here, or the writer (the rail) and the
 * reader would drift apart.
 *
 * THE CONTROLS. `TimerControl` is pure data (a glyph NAME, never a node); the
 * renderer draws the discs and hands back only an action ID. The IDs are the closed
 * timer vocabulary (`timer:start` / `timer:pause` / `timer:reset`), which the rail
 * maps to a state write through `lib/timer-state.ts` — so the press samples
 * `Date.now()` at the moment of the press instead of the moment the card was drawn.
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { TimerControl, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { pinnedInstant } from '../../client/lib/clock-face'
import { readTimerState, timerElapsedMs } from '../../client/lib/timer-state'

function stopwatchRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut {
  // The instance's persisted half of the machine (missing/malformed = not started).
  const st = readTimerState(stats as Record<string, unknown>)
  // PREVIEW-ONLY overrides (see the module header): a sim step may force any of
  // the three states — not-started / running / paused — because a live rail
  // cannot be walked through them on demand, and a preview that pinned an instant
  // must read a FIXED figure rather than one that depends on when it was opened.
  const sim = meta?.sim
  const baseMs = typeof sim?.baseMs === 'number' ? sim.baseMs : st.baseMs
  const startedAt = typeof sim?.startedAt === 'number' ? sim.startedAt : st.startedAt
  // Pinned instant ⇒ preview (frozen reading); absent ⇒ live (renderer ticks).
  const pinned = pinnedInstant(sim?.at)
  const at = pinned ?? Date.now()
  const running = startedAt !== null
  const elapsed = timerElapsedMs({ baseMs, startedAt }, at)
  // TWO DISCS, always in the same places: the left one is the secondary action
  // (复位) and never moves, the right one is the main press and flips its glyph with
  // the state. Keeping the shapes fixed is what lets the user press by position.
  const controls: TimerControl[] = [
    { id: 'timer:reset', glyph: 'reset', tone: 'primary', big: true, label: t('card.stopwatch.reset') },
    running
      ? { id: 'timer:pause', glyph: 'pause', tone: 'primary', big: true, label: t('card.stopwatch.pause') }
      : { id: 'timer:start', glyph: 'play', tone: 'primary', big: true, label: elapsed > 0 ? t('card.stopwatch.resume') : t('card.stopwatch.start') },
  ]
  return {
    // NO TITLE: the reference layout IS the card — see the module header for the two
    // conditions (self-identifying body + a body that owns the tile) and why the
    // 倒计时 card next door still keeps its title.
    title: '',
    rich: {
      type: 'timer',
      timer: {
        mode: 'stopwatch',
        layout: 'dial',
        hundredths: true,
        // Absent = LIVE: timer-face.tsx then owns a 100ms tick and re-reads `Date.now()`.
        ...(pinned === null ? {} : { at: pinned }),
        baseMs,
        startedAt,
        controls,
      },
    },
  }
}

export default defineWidget({
  id: 'stopwatch',
  name: () => t('widget.stopwatch.name'),
  desc: () => t('widget.stopwatch.desc'),
  builtin: true,
  group: 'time',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: stopwatchRender,
  simToggle: () => t('widget.stopwatch.simToggle'),
  configSchema: [],
  // Widget-owned preview data (see WidgetExample). `step 1` is the reading a
  // paused instance shows (12:34.00), `step 2` a run that started 2:05 before the
  // pinned instant, `step 3` an instance that was never started. `sim` MUST be the
  // first step: the preview stepper locates the current state by deep equality, so a
  // sim absent from simSteps makes the FIRST click a no-op.
  // `stats` reuses the REAL persisted field names (tmBase / tmStart) — the very
  // fields readTimerState reads and the rail's own writes produce — so the preview
  // cannot drift from what a live card would see.
  example: {
    stats: { tmBase: 754000, tmStart: null },
    sim: { at: 1791943770000, baseMs: 754000, startedAt: null },
    simSteps: [
      { at: 1791943770000, baseMs: 754000, startedAt: null },
      { at: 1791943770000, baseMs: 0, startedAt: 1791943645000 },
      { at: 1791943770000, baseMs: 0, startedAt: null },
    ],
    note: '已暂停 12:34.00 / 计时中 2:05.00 / 未开始 00:00.00',
  },
})
