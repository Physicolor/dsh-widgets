/**
 * dsh-widgets — the `timer` rich block (秒表 / 倒计时's live reading and picker).
 *
 * THREE BODIES, ONE CONTRACT (`TimerRich.layout`).
 *
 *  - `plain` — the reading, an optional caption above it and an optional note below.
 *    74px at scale 1, sized for a card that KEEPS ITS TITLE **and** carries an
 *    `actions` row: `12(pad) + 16(title) + [74] + 6(gap) + 26(buttons) + 12(pad) = 146 ≤ 150`.
 *  - `dial` — the reference stopwatch: a TOP-ALIGNED `HH:MM:SS.cc` reading over two
 *    round controls sitting on the card's floor, filling a titleless tile:
 *    `12(pad) + [120] + 12(pad) = 144 ≤ 150`. This is the stopwatch, and the
 *    countdown's run view (same shape, `MM:SS`, under its own title row).
 *  - `picker` — a 2×2 grid of duration capsules, the countdown's entry view:
 *    `12(pad) + 16(title) + [106] + 12(pad) = 146 ≤ 150`.
 *
 * EVERY SIZE IS FITTED TO THE BOX IT IS HANDED, never assumed. The first cut of the
 * dial hard-coded the reference's disc width and the reading's size against a 126px
 * content column — exactly the column, zero slack — and the owner's screenshot at
 * the market's 1.9× preview scale showed the discs and the reading CLIPPED by the
 * card's padding (reported 2026-10-14). Every dimension below is therefore derived
 * from the real `width` the card hands over (`CardBody` → `RichBlock` → here):
 * the reading is capped by `width ÷ 0.55em per character` and the two discs by
 * `width ÷ 2.6` (two discs plus a 0.4-disc gap and ~15% slack), so no scale can
 * overflow. `scripts/probe-geometry.cjs` now also asserts it (RICH-OVERFLOW).
 *
 * WHY IT TICKS ITSELF. A widget render is a pure data description and the rail
 * re-renders a card only when its data changes (idle: once every 30s — measured,
 * see data/collector.tsx). A stopwatch wired to that tick would freeze for half a
 * minute at a time and a countdown would jump in 30-second steps. So the live
 * reading is owned HERE, exactly like the clock's second hand: a 1s interval while a
 * segment RUNS, a 100ms one when the card prints hundredths, and NO interval at all
 * when the card is paused or a countdown has run out.
 *
 * The interval belongs to THIS component, rendered by `CardBody` as a real element
 * (`createElement`) — never called as a plain function. Called inline its effect
 * would land on `CardBody`'s fibre, and the skeleton → loaded swap (which returns
 * before the rich block on the skeleton pass) would then render a different number
 * of hooks per pass, which React rejects with #310 (the same trap the chart
 * registry and `clock-face.tsx` document).
 */

import * as React from 'react'
import { fmtClock } from '../../lib/format'
import { timerElapsedMs } from '../../lib/timer-state'
import { refreshIcon } from '../icons'
import type { TimerControl, TimerRich } from '../../lib/contract/types'

const PLAIN_BOX = 74
const DIAL_BOX = 120
/** A body under a title row: `150 − 12(pad) − 16(title) − 12(pad) = 110`, minus 4px
 *  of slack. Used by the capsule picker AND by the countdown's dial run view (which
 *  keeps its title row because the row carries the back chevron). */
const HEAD_BOX = 106
/** The product's FIGURE rung: `CardBody` prints every card's big number at
 *  `20 · scale` px, weight 600 (`.dsx-stats-card-value` / `valuePx`). The dial obeys
 *  the same rung so one card's number cannot sit off the type ladder the rest of the
 *  rail is built on (owner, 2026-10-14: 「字体大小和粗细…与目前常见组件的格式是否
 *  一致」) — and it is also the reference tile's own proportion: its reading is ~10%
 *  of the tile's height, i.e. ~20px on a 150px card. */
const FIGURE_PX = 20
/** The main disc's diameter, as a fraction of the TILE (the reference's discs measure
 *  ~31% of the tile's width) — `0.31 × 150 ≈ 47px` at scale 1. The pair is laid out
 *  `space-between` across the card's content column, so the discs end up flush with
 *  the card's left and right edges (the owner's 「左右下角对齐」) and the leftover
 *  column becomes their gap. */
const DISC_RATIO = 0.31
/** Two discs plus a 0.2-disc gap must fit the column; this divisor shrinks both
 *  together on a body narrower than the reference's. */
const DISC_FIT_DIVISOR = 2.2
/** The main disc's diameter at scale 1, and the gap as a fraction of it. Both are
 *  UPPER bounds: the dial shrinks them until two discs plus the gap fit the column it
 *  was handed (see DISC_RATIO / DISC_FIT_DIVISOR). */
const DISC = Math.round(150 * DISC_RATIO)
const DISC_GAP_RATIO = 0.4
/** The reading's advance per character, in em, for the product's tabular numerals at
 *  weight 600 — CALIBRATED, not guessed: a digit measures ~0.65em and a colon/dot
 *  ~0.32em on the shipped card, and the first two cuts (0.55, then 0.62) each came
 *  out a few px too wide at every scale, which is exactly the clipped stopwatch the
 *  owner reported (2026-10-14). `FIT_SAFETY` keeps a few px of daylight. */
const EM_PER_DIGIT = 0.66
const EM_PER_PUNCT = 0.32
const FIT_SAFETY = 1.04
/** A reading's own width in em (exact per character, not an average). */
function readingEm(text: string): number {
  let em = 0
  for (const ch of text) em += ch === ':' || ch === '.' ? EM_PER_PUNCT : EM_PER_DIGIT
  return em * FIT_SAFETY
}
/** The reading's size for a `chars`-long string, before the width cap. */
function figurePx(chars: number): number {
  if (chars > 8) return 22
  if (chars > 6) return 27
  if (chars > 5) return 32
  return 40
}
/** Side inset the fitted content keeps inside the handed width (scale-aware). */
const FIT_INSET = 4
/** The hundredths' size, as a fraction of the main figure's. */
const HUNDREDTHS_SCALE = 0.62

/** The figure's colour, in the same semantic aliases the card body uses
 *  (`valueTone`): the widget picks a rung, the renderer never infers one. */
function toneColor(tone: TimerRich['tone']): string {
  switch (tone) {
    case 'warn': return 'var(--dsw-alias-state-warn-primary)'
    case 'success': return 'var(--dsw-alias-state-success-primary)'
    case 'business': return 'var(--dsw-alias-state-business-primary)'
    case 'muted': return 'var(--dsw-alias-label-tertiary)'
    case 'danger': return 'var(--dsw-alias-state-error-primary)'
    default: return 'var(--dsw-alias-label-primary)'
  }
}

/** The colour of one control's disc and glyph.
 *
 *  BOTH faces are SOLID fills with a white glyph — the reference's own structure (its
 *  two discs are solid too, one amber and one red) — and both are painted in the
 *  product's brand blue (the owner's call, 2026-10-14: 「改成蓝色（DeepSeek品牌色）」).
 *  Which action a disc fires is carried by its glyph (↺ 复位 / ▶‖ 开始暂停) and by its
 *  fixed position, not by a colour hierarchy. */
function controlPaint(tone: TimerControl['tone']): { background: string; border: string; color: string } {
  switch (tone) {
    case 'warn':
      return { background: 'var(--dsw-alias-state-warn-primary)', border: 'transparent', color: '#fff' }
    case 'plain':
      return { background: 'transparent', border: 'var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-secondary)' }
    default:
      return { background: 'var(--dsw-alias-state-business-primary)', border: 'transparent', color: '#fff' }
  }
}

/** One control's glyph, as an inline SVG (the payload carries a NAME, never a node). */
function glyph(control: TimerControl, disc: number): React.ReactElement {
  // The glyph fills about half the disc (the reference's do).
  const size = Math.round(disc * 0.5)
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  if (control.glyph === 'play') {
    return React.createElement('svg', common, React.createElement('path', { d: 'M7 4.8 L19.5 12 L7 19.2 Z', fill: 'currentColor' }))
  }
  if (control.glyph === 'pause') {
    return React.createElement('svg', common,
      React.createElement('rect', { x: 7.5, y: 5, width: 3.6, height: 14, rx: 1.6, fill: 'currentColor' }),
      React.createElement('rect', { x: 12.9, y: 5, width: 3.6, height: 14, rx: 1.6, fill: 'currentColor' }))
  }
  if (control.glyph === 'reset') {
    // The SHARED official refresh glyph (`render/icons.refreshIcon`) — the same arrow
    // the 上下文压缩 corner draws for one-click Compact. The owner rejected the first
    // cut's generic two-arrow loop (「看着好丑」) and asked for this one by name
    // (2026-10-14): one arrow shape across the product, not two.
    return React.createElement('span', {
      style: { display: 'flex', color: 'currentColor', transform: `scale(${(size / 16).toFixed(3)})` },
    }, refreshIcon)
  }
  return React.createElement('svg', common, React.createElement('circle', { cx: 12, cy: 12, r: 8.4, stroke: 'currentColor', strokeWidth: 3 }))
}

/**
 * The timer rich block.
 *
 * @param timer - the widget's payload (see `TimerRich`); `at` absent = live.
 * @param scale - `unit / BASE_SIDE`, the card's own scale factor.
 * @param width - the card's body width in px; every fitted size derives from it.
 * @param onAction - the rail's action dispatcher, for capsules and controls.
 */
export function TimerFace({ timer, scale, width, onAction }: { timer: TimerRich; scale: number; width: number; onAction?: (id: string) => void }): React.ReactElement {
  const live = timer.at === undefined
  const startedAt = timer.startedAt ?? null
  const running = startedAt !== null
  const duration = typeof timer.durationMs === 'number' && timer.durationMs > 0 ? timer.durationMs : null
  const [now, setNow] = React.useState<number>(() => timer.at ?? Date.now())
  const elapsedAt = timerElapsedMs({ baseMs: timer.baseMs, startedAt }, live ? now : (timer.at as number))
  // RUN OUT is a state of a countdown that has a length and was started: a degraded
  // card (no schedule to count to) ships `durationMs: 0` and must NOT read as
  // "finished" — it reads as `—`, which is what it knows.
  const done = timer.mode === 'countdown' && (timer.done === true || (duration !== null && running && duration - elapsedAt <= 0))
  React.useEffect(() => {
    // No interval while paused, and none once a countdown has run out: a stopped
    // timer has nothing to recompute, and re-rendering the figure 60 times a minute
    // would be pure battery.
    if (!live || !running || done) return
    const hundredths = timer.hundredths === true
    const commit = (): void => {
      if (document.hidden) return
      setNow(() => Date.now())
    }
    commit()
    const id = window.setInterval(commit, hundredths ? 100 : 1000)
    return () => window.clearInterval(id)
    // `startedAt` is in the list because a card can be started/paused by its own
    // controls: the new render hands a NEW `startedAt`, and the effect must restart
    // (or stop) its interval on that boundary.
  }, [live, running, done, timer.hundredths, startedAt])
  const at = live ? now : (timer.at as number)
  const elapsed = timerElapsedMs({ baseMs: timer.baseMs, startedAt }, at)
  const remaining = duration === null ? 0 : Math.max(0, duration - elapsed)
  const base = timer.mode === 'stopwatch' ? fmtClock(elapsed) : duration === null ? '—' : fmtClock(remaining)
  const noteLine = done && timer.doneLabel !== undefined ? timer.doneLabel : timer.note
  const color = done && timer.tone === undefined ? 'var(--dsw-alias-state-warn-primary)' : toneColor(timer.tone)
  const controls = timer.controls ?? []
  const inset = Math.round(FIT_INSET * scale)
  // THE CARD'S OWN PADDING IS NOT AVAILABLE WIDTH. `CardBody` hands the block its
  // OUTER box width (`boxW`: the tile, or `2·unit + gap` on a 2×4), and the padding
  // is drawn inside it — so the content column is `width − 2·cardInnerPad(unit)`.
  // Fitting against the outer width is the actual root cause of the owner's clipped
  // stopwatch (2026-10-14): the reading and the discs were sized for ~16px more room
  // than they had, at every scale, and the card's `overflow: hidden` cut them.
  const pad = Math.round(12 * scale)
  /** The card's real content column: what the reading may span edge to edge, and what
   *  the two discs are laid out across. */
  const content = Math.max(48, width - 2 * pad)
  /** A hair narrower than the column, for glyph side bearings on the very edge. */
  const available = Math.max(40, content - 2 * Math.round(FIT_INSET * scale))

  if (timer.layout === 'picker') {
    const box = Math.round(HEAD_BOX * scale)
    const capsules = timer.capsules ?? []
    return React.createElement('div', {
      style: { height: `${box}px`, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: `${Math.round(8 * scale)}px`, overflow: 'hidden' },
    }, capsules.slice(0, 4).map((capsule) => React.createElement('button', {
      key: capsule.id,
      type: 'button',
      'data-action': capsule.id,
      'aria-label': `${capsule.label} ${capsule.sub}`,
      title: `${capsule.label} ${capsule.sub}`,
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (onAction) onAction(capsule.id) },
      style: {
        minWidth: 0,
        padding: 0,
        border: 'none',
        borderRadius: `${Math.round(14 * scale)}px`,
        background: 'var(--dsw-alias-interactive-bg-hover)',
        color: 'var(--dsw-alias-label-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${Math.round(1 * scale)}px`,
        cursor: 'pointer',
        overflow: 'hidden',
      },
    },
      React.createElement('span', { style: { fontSize: `${Math.round(18 * scale)}px`, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, capsule.label),
      React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, lineHeight: 1, color: 'var(--dsw-alias-label-tertiary)' } }, capsule.sub),
    )))
  }

  if (timer.layout === 'dial' || timer.layout === 'dial-head') {
    const hundredths = timer.hundredths === true
    const box = Math.round((timer.layout === 'dial' ? DIAL_BOX : HEAD_BOX) * scale)
    // The reading: `HH:MM:SS.cc` when the card prints hundredths (a fixed 10-character
    // column — the digits never reflow as it runs), else the widget's own reading.
    const main = hundredths
      ? `${String(Math.floor(elapsed / 3_600_000)).padStart(2, '0')}:${String(Math.floor(elapsed / 60_000) % 60).padStart(2, '0')}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}`
      : base
    const centi = String(Math.floor(elapsed / 10) % 100).padStart(2, '0')
    // The width budget is the reading's OWN em width (see `readingEm`), so the cap is
    // exact per string instead of a per-character average that clipped.
    const em = readingEm(main) + (hundredths ? (EM_PER_PUNCT + 2 * EM_PER_DIGIT) * HUNDREDTHS_SCALE : 0)
    // THE PRODUCT'S FIGURE RUNG, not a size of my own: `CardBody` prints every card's
    // big figure at `20 · scale` px, weight 600 (`.dsx-stats-card-value`). The dial's
    // first cut used 24–40px tiers, which put one card's number off the type ladder the
    // rest of the rail is built on (the owner's 「字体大小和粗细…与目前常见组件的格式
    // 是否一致」, 2026-10-14). The width cap below can only shrink it further.
    const size = Math.max(12, Math.min(Math.round(FIGURE_PX * scale), Math.floor(available / em)))
    // The discs: two of them plus a proportional gap must fit the CONTENT COLUMN
    // (not the inset text budget — the reference's discs sit flush on the card's left
    // and right edges), sized as a fraction of the tile.
    const disc = Math.max(Math.round(24 * scale), Math.min(Math.round(DISC * scale), Math.floor(content / DISC_FIT_DIVISOR)))
    // THE READING IS TOP-LEFT (the owner's 「顶部的时间…贴左上角对齐」): the row spans
    // the content column and starts at its left edge, instead of being centred.
    const reading = React.createElement('div', {
      style: { display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', width: '100%', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', maxWidth: '100%' },
    },
      React.createElement('span', { style: { fontSize: `${size}px`, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em', color } }, main),
      hundredths ? React.createElement('span', {
        // The hundredths wear the product's ACCENT (brand blue): the reference prints
        // them in its own accent, and a dimmer second half is what makes
        // `00:00:56.29` read as one reading instead of two.
        style: { fontSize: `${Math.round(size * HUNDREDTHS_SCALE)}px`, fontWeight: 600, lineHeight: 1, color: 'var(--dsw-alias-state-business-primary)' },
      }, `.${centi}`) : null,
    )
    return React.createElement('div', {
      // The probe measures the dial against THIS box (`data-dial`): the reading's
      // top-left corner and the discs' outer/bottom edges, at every scale the fixture
      // renders (scripts/probe-geometry.cjs, TIMER LAYOUT).
      'data-dial': '1',
      style: {
        height: `${box}px`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        // The reading hugs the card's top-left; the discs row is a full-width
        // `space-between` band on the card's floor (see the reading/controls styles).
        alignItems: 'stretch',
        boxSizing: 'border-box',
        paddingTop: `${Math.round(3 * scale)}px`,
        paddingBottom: `${Math.round(3 * scale)}px`,
        overflow: 'hidden',
      },
      title: noteLine,
    },
      reading,
      // The note rides ABOVE the controls, so the controls keep the card's floor
      // (the countdown's 时间到 is the only dial note today).
      noteLine ? React.createElement('div', {
        style: { marginTop: `${Math.round(2 * scale)}px`, fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
      }, noteLine) : null,
      // The controls sit on the CARD'S FLOOR (the reference's layout): `marginTop:
      // auto` inside a full-height column is what pins them there instead of leaving
      // the whole group centred with dead space above and below. `space-between` puts
      // one disc on the left edge and one on the right (the owner's 「左右下角对齐」).
      controls.length === 0 ? null : React.createElement('div', {
        style: { marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
      }, controls.map((control) => {
        const paint = controlPaint(control.tone)
        return React.createElement('button', {
          key: control.id,
          type: 'button',
          // The same attribute `ActionsBlock` uses: a probe (and a future one) drives
          // the card by action id, wherever the button happens to be drawn.
          'data-action': control.id,
          // `corner-shape: round` (card.module.css): the 连续曲率 card turns every
          // border-radius into a superellipse, which made these discs read as rounded
          // squares (owner, 2026-10-14). The capsules keep the squircle on purpose.
          className: 'dsx-timer-disc',
          'aria-label': control.label,
          title: control.label,
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (onAction) onAction(control.id) },
          style: {
            width: `${disc}px`,
            height: `${disc}px`,
            flex: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            background: paint.background,
            border: `2px solid ${paint.border}`,
            color: paint.color,
          },
        }, glyph(control, disc))
      })),
    )
  }

  const box = Math.round(PLAIN_BOX * scale)
  // The size tier comes from the WIDEST reading this card will ever show (a
  // countdown's starting length), so the figure cannot resize mid-run.
  const stable = timer.mode === 'countdown' && duration !== null ? fmtClock(duration) : base
  const widest = base.length >= stable.length ? base : stable
  const em = Math.max(0.6, readingEm(widest))
  const size = Math.max(12, Math.min(Math.round(figurePx(widest.length) * scale), Math.floor(available / em)))
  return React.createElement('div', {
    style: {
      height: `${box}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: `${Math.round(2 * scale)}px`,
      width: '100%',
      overflow: 'hidden',
    },
    title: noteLine,
  },
    timer.caption ? React.createElement('div', {
      style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
    }, timer.caption) : null,
    React.createElement('span', {
      style: {
        fontSize: `${size}px`,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        color,
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      },
    }, base),
    noteLine ? React.createElement('div', {
      style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
    }, noteLine) : null,
  )
}
