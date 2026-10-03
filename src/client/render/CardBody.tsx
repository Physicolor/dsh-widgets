/**
 * dsh-widgets — the card renderer.
 *
 * Moved verbatim out of components.tsx (Phase 3.5/3.6). `CardBody` is the one place
 * that turns a widget's `WidgetRenderOut` DATA into pixels: the head slots
 * (title / headRight / headAfter / legend / meter), the body (value / sub / chart /
 * rich), the corner button and the whole-card cycle. Charts are drawn by
 * `renderChart` (see render/charts/registry.ts); the loading skeleton and the action
 * buttons live here because they are part of the same layout contract.
 */

import * as React from 'react'
import { BASE_SIDE, HEAD_GAP_PX, cardInnerPad, cardRadius } from './card-geometry'
import { CHART_FILLS_BODY, renderChart } from './charts/registry'
import { Donut } from './charts/donut'
import { CHART_TONES } from './charts/theme'
import { databaseIcon, gaugeIcon, githubMarkIcon, hardDriveIcon, performanceIcon, permissionFullAccessIcon, permissionReadOnlyIcon, permissionWorkspaceWriteIcon, powerIcon } from './icons'
import { DEFAULT_CORNER_PERCENT } from '../runtime/prefs'
import { t } from '../i18n'
import type { WidgetAction, WidgetRenderOut, WidgetRich } from '../lib/contract/types'

/**
 * Chart kinds that STRETCH to fill the card's leftover height instead of asking for
 * their own. `CHART_FILLS_BODY` (charts/registry.ts) is the same set for the
 * wrapper's `flex: 1`, PLUS `quotas`: the quota rows size themselves from the box
 * they are given (charts/quota-fit.ts), so their wrapper must flex even though the
 * chart does not paint into every pixel like a sparkline does. Keep the two in step.
 */
const ELASTIC_CHARTS: ReadonlySet<NonNullable<WidgetRenderOut['chart']>['kind']> = new Set(['line', 'lanes', 'quotas'])

function ActionsBlock({ actions, onAction, scale }: { actions: WidgetAction[]; onAction?: (id: string) => void; scale: number }): React.ReactElement {
  const btnStyle: React.CSSProperties = {
    flex: 'none', height: Math.round(26 * scale), padding: `0 ${Math.round(10 * scale)}px`,
    borderRadius: Math.round(13 * scale), border: '1px solid var(--dsw-alias-border-l2)',
    background: 'transparent', color: 'var(--dsw-alias-state-business-primary)',
    fontSize: `${Math.round(11 * scale)}px`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  }
  const btnEls = actions.map((a) => {
    const kind = a.kind
    const st = { ...btnStyle }
    if (kind === 'primary') { st.background = 'var(--dsw-alias-state-business-primary)'; st.color = '#fff'; st.borderColor = 'transparent' }
    else if (kind === 'danger') { st.background = 'var(--dsw-alias-state-error-primary)'; st.color = '#fff'; st.borderColor = 'transparent' }
    return React.createElement('button', { key: a.id, type: 'button', title: a.confirmHint, onClick: (e) => { e.stopPropagation(); if (onAction) onAction(a.id) }, 'data-action': a.id, style: st }, a.label)
  })
  return React.createElement('div', { style: { display: 'flex', gap: Math.round(6 * scale), marginTop: Math.round(6 * scale), flexWrap: 'wrap' } }, btnEls)
}

/** The glyphs a head ring may hold (see `HeadRingIcon` in the contract), plus the
 *  bare head accessories (`HeadIconName`) — one table, because both are "the glyph
 *  this card's head shows on its right". */
const HEAD_RING_ICONS: Record<string, React.ReactElement | null> = {
  database: databaseIcon,
  'hard-drive': hardDriveIcon,
  gauge: gaugeIcon,
  performance: performanceIcon,
  'permission-read-only': permissionReadOnlyIcon,
  'permission-workspace-write': permissionWorkspaceWriteIcon,
  'permission-full-access': permissionFullAccessIcon,
  github: githubMarkIcon,
  power: powerIcon,
}

/**
 * The colour a `valueTone` figure wears.
 *
 * The rungs are the product's own semantic aliases, and the widget picks one — the
 * renderer never infers a colour from a number (see `valueTone` in the contract):
 * `danger` = already wrong, `warn` = heading there, `success` = good because SAFE,
 * `business` = an informational active state, `muted` = the big slot holds a lone
 * `—` and a bare dash in the primary colour reads as a redaction bar.
 */
function valueColor(out: WidgetRenderOut): string {
  switch (out.valueTone) {
    case 'warn': return 'var(--dsw-alias-state-warn-primary)'
    case 'success': return 'var(--dsw-alias-state-success-primary)'
    case 'business': return 'var(--dsw-alias-state-business-primary)'
    case 'muted': return 'var(--dsw-alias-label-tertiary)'
    default: return 'var(--dsw-alias-state-error-primary)'
  }
}

function RichBlock({ rich, scale }: { rich: WidgetRich; scale: number }): React.ReactElement {
  if (rich.type === 'quote' && rich.text) {
    const ta = rich.align ?? 'left'
    return React.createElement('div', { style: { fontSize: `${Math.round(12 * scale)}px`, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)', fontStyle: 'italic', marginTop: `${Math.round(6 * scale)}px`, textAlign: ta, whiteSpace: rich.wrap === false ? 'nowrap' : 'pre-wrap', overflow: rich.wrap === false ? 'hidden' : undefined, textOverflow: rich.wrap === false ? 'ellipsis' : undefined } }, rich.text)
  }
  if (rich.type === 'image' && rich.src) {
    return React.createElement('img', { src: rich.src, alt: '', style: { width: '100%', borderRadius: Math.round(6 * scale), marginTop: `${Math.round(6 * scale)}px`, objectFit: 'cover' } })
  }
  return React.createElement(React.Fragment)
}

/**
 * Loading skeleton: the card frame plus rounded placeholder blocks in the SAME
 * vertical rhythm — and the SAME SILHOUETTE — as the real body, so the card's
 * size, shape AND identity are already correct while the data source is still
 * in flight and nothing re-flows when the real content lands.
 *
 * The TITLE stays real text: it comes from the widget descriptor (its name),
 * not from the data source, so it is already known — and a rail of tiles that
 * still say which widget they are reads as loading, while a rail of nameless
 * grey pills reads as broken. Only the DATA is placeholder.
 *
 * The BODY follows `out.skeletonShape` (declared by the widget's own manifest and
 * surfaced as WIDGET_RUNTIME): a ring card draws N square rounded blocks, a bar chart ONE
 * wide rounded block, a heatmap ONE wide block, a figure row N short blocks and
 * a quota card N stacked bars. A generic stack of thin pills was wrong for all
 * of them — the placeholder has to be recognisable as the card it stands in
 * for, not merely as "some card".
 */
function SkeletonBody({ out, unit, width, squircle, cornerPercent = DEFAULT_CORNER_PERCENT }: { out: WidgetRenderOut; unit: number; width?: number; squircle?: boolean; cornerPercent?: number }): React.ReactElement {
  const scale = unit / BASE_SIDE
  const boxW = width ?? unit
  const rows = Math.max(1, Math.min(4, Math.round(out.skeletonRows ?? 2)))
  const count = Math.max(1, Math.min(6, Math.round(out.skeletonCount ?? 3)))
  // The placeholder card carries the SAME outline and inset as the real one it
  // stands in for: a radius/padding jump at the loading → loaded swap would
  // read as the card resizing itself.
  const radius = cardRadius(unit, cornerPercent)
  const pad = cardInnerPad(unit)
  /** One shimmering rounded block; every silhouette is built from these. */
  const block = (key: string, style: React.CSSProperties): React.ReactElement =>
    React.createElement('div', { key, className: 'dsx-sk', style })
  /** A block that spans the card's content width. */
  const fill = (key: string, h: number, r: number): React.ReactElement =>
    block(key, { width: '100%', flex: 1, minHeight: `${h}px`, borderRadius: `${r}px` })
  /** A row of `n` equal blocks (rings are square, figures are short bars). */
  const row = (key: string, n: number, square: boolean, hm: number, r: string, gap: number): React.ReactElement =>
    React.createElement('div', { key, style: { display: 'flex', alignItems: square ? 'center' : 'flex-end', justifyContent: 'space-between', gap, width: '100%' } },
      ...Array.from({ length: n }, (_, i) => block(`${key}${i}`, square
        ? { flex: 1, minWidth: 0, aspectRatio: '1 / 1', borderRadius: r }
        : { flex: 1, minWidth: 0, height: `${hm}px`, borderRadius: r })))
  const shape = out.skeletonShape ?? 'text'
  let body: React.ReactNode[]
  if (shape === 'rings') {
    // N donuts → N square rounded blocks. Square, because a ring is as tall as
    // it is wide; the row keeps the real chart's spacing so the block count is
    // readable at a glance.
    body = [row('rg', count, true, 0, '30%', Math.round(10 * scale))]
  } else if (shape === 'bars') {
    // A bar chart: ONE wide rounded block standing for the plot area (the user's
    // rule — 一个柱状图就是一个大圆角矩形).
    body = [fill('bar', Math.round(40 * scale), Math.max(6, Math.round(8 * scale)))]
  } else if (shape === 'line') {
    // A sparkline: one wide block, a little taller than the bar block (a line
    // card is elastic and owns the whole remaining height).
    body = [fill('ln', Math.round(48 * scale), Math.max(6, Math.round(8 * scale)))]
  } else if (shape === 'heatmap') {
    // The calendar grid: one wide, nearly square block.
    body = [fill('hm', Math.round(44 * scale), Math.max(6, Math.round(8 * scale)))]
  } else if (shape === 'figures') {
    body = [row('fg', count, false, Math.round(18 * scale), `${Math.max(4, Math.round(6 * scale))}px`, Math.round(8 * scale))]
  } else if (shape === 'quotas') {
    // The segmented quota rows: N stacked bars, same step as the real rows.
    body = [React.createElement('div', { key: 'qt', style: { display: 'flex', flexDirection: 'column', gap: Math.round(8 * scale), width: '100%' } },
      ...Array.from({ length: count }, (_, i) => block(`q${i}`, { width: '100%', height: `${Math.max(6, Math.round(9 * scale))}px`, borderRadius: `${Math.max(4, Math.round(5 * scale))}px` })))]
  } else {
    // Text-only card: the figure pill + its body rows, exactly as before.
    body = [
      block('v', { width: '44%', height: `${Math.round(20 * scale)}px`, borderRadius: `${Math.max(3, Math.round(10 * scale))}px` }),
      ...Array.from({ length: rows }, (_, i) => block(`r${i}`, { width: `${Math.round(92 - i * 26)}%`, height: `${Math.round(10 * scale)}px`, borderRadius: `${Math.max(3, Math.round(5 * scale))}px` })),
    ]
  }
  return React.createElement('div', {
    className: 'dsx-stats-card dsx-sk-card' + (squircle ? ' dsx-squircle' : ''),
    // The placeholder is EXACTLY the tile: a real card is pinned to `unit` × `unit`
    // (see `pinnedByChart`), so a skeleton that only set `minHeight` stood 13% taller
    // than the card it stands in for — measured 2026-09-29 on the rail: 160 × 181.
    // The owner read that as "the cards are not square", and it also made the deck
    // jump the moment the data landed. `border-box` so `unit` is the whole tile.
    style: { position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: `${boxW}px`, minHeight: `${unit}px`, height: `${unit}px`, borderRadius: `${radius}px`, padding: `${pad}px` },
  },
    React.createElement('div', { className: 'dsx-stats-card-title', style: { fontSize: `${Math.round(13 * scale)}px`, minWidth: 0 } }, out.title),
    // The body owns the card's remaining height (so a chart block reads as a
    // chart area), and its content sits on the card's floor: the same posture
    // the real cards use.
    React.createElement('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: Math.round(8 * scale), marginTop: Math.round(6 * scale) } }, ...body),
  )
}

export function CardBody({ out, unit, width, squircle, cornerPercent, pinBox, onAction, onCycle }: { out: WidgetRenderOut; unit: number; width?: number; squircle?: boolean; cornerPercent?: number; pinBox?: boolean; onAction?: (id: string) => void; onCycle?: (out: WidgetRenderOut) => void }): React.ReactElement {
  const scale = unit / BASE_SIDE
  const boxW = width ?? unit
  const titlePx = Math.round(13 * scale)
  const valuePx = Math.round(20 * scale)
  const radius = cardRadius(unit, cornerPercent)
  const innerPad = cardInnerPad(unit)
  // Body shape, decided once (both are read by the guard, the chart wrapper and the
  // foot, which are three different places in this file):
  //  - `pinnedByChart`: the card's height is pinned to the tile. Every chart card is
  //    (see the height note at the bottom of this file);
  //  - `elasticBody`: the chart CLAIMS the leftover height instead of asking for its
  //    own (see ELASTIC_CHARTS).
  const pinnedByChart = out.chart !== undefined
  const elasticBody = out.chart !== undefined && ELASTIC_CHARTS.has(out.chart.kind)
  // Whole-card cycle (pooled usage widgets): a press plays a short press-down
  // (scale dip) and, on click, cycles the view; the release springs back.
  const cyclable = out.cycle !== undefined
  const [pressed, setPressed] = React.useState(false)
  const pressTimer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => { if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current) }, [])
  const pressDown = (): void => {
    if (!cyclable) return
    setPressed(true)
    if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(() => setPressed(false), 190)
  }
  /**
   * Value-change transition (the owner's ask, 2026-09-28).
   *
   * When a card's BODY figure appears or leaves — 任务 switching between 「暂无任务」
   * and a live count is the case that asked for it — the figure slides down into its
   * new place instead of snapping. It is keyed on a CHANGE OF VALUE inside one mounted
   * card, never on mount: the magnify layer re-creates every card on hover, so a
   * mount-triggered animation would replay the whole rail on every pointer move.
   * `prefers-reduced-motion` is handled in the CSS.
   */
  const lastValue = React.useRef<string | null | undefined>(undefined)
  const [figureDrop, setFigureDrop] = React.useState(false)
  React.useEffect(() => {
    const next = out.value ?? null
    const prev = lastValue.current
    lastValue.current = next
    if (prev === undefined || prev === next) return
    setFigureDrop(true)
    const id = window.setTimeout(() => setFigureDrop(false), 220)
    return () => window.clearTimeout(id)
  }, [out.value])
  /**
   * Tile-fits guard (rendered level).
   *
   * The two surfaces express the SAME defect differently, and neither the data gate
   * (G4 snapshots `WidgetRenderOut`) nor a screenshot of one surface can see it: the
   * PREVIEW pins the tile to `height: unit` + `overflow: hidden`, so overlong content
   * is silently CLIPPED; the RAIL only sets `min-height`, so the very same content
   * GROWS the card and breaks the grid. A card that renders its figure twice (the
   * 2026-09-28 head-ring bug) therefore looked like "clipped" in review and like
   * "broken height" once installed.
   *
   * So measure the box in whichever mode it is in — clipped (`scrollHeight` past
   * `clientHeight`) or grown (`clientHeight` past the tile) — and say so: a console
   * warning for the log, and a red inset outline on the card so the defect is visible
   * in BOTH surfaces and can never ship silently again.
   */
  const cardRef = React.useRef<HTMLDivElement | null>(null)
  React.useLayoutEffect(() => {
    const el = cardRef.current
    if (el === null) return
    // A card whose HEIGHT is already pinned by its own style (every chart card, and
    // every preview tile) can only ever fail the guard by CLIPPING, so the check is
    // the scroll-vs-client one; a card that still lets its content size it is
    // measured against the tile it was asked for.
    const pinned = pinBox === true || pinnedByChart
    const overflow = pinned ? el.scrollHeight > el.clientHeight + 1 : el.clientHeight > unit + 1
    if (!overflow) {
      el.removeAttribute('data-dsx-overflow')
      return
    }
    if (el.getAttribute('data-dsx-overflow') !== '1') {
      console.warn(`[dsh-widgets] card content does not fit its tile (${pinned ? 'clipped' : 'grew'}): ${out.title}`)
    }
    el.setAttribute('data-dsx-overflow', '1')
  })
  // Loading skeleton (see SkeletonBody): declared AFTER the hooks so the hook
  // order stays unconditional across the loading → loaded transition.
  if (out.skeleton) return React.createElement(SkeletonBody, { out, unit, width: boxW, squircle, cornerPercent })
  // Head row = two INDEPENDENT slots: the title box (which ellipsizes rather
  // than pushing the figures out) and — when `headRight` is DEFINED, even as ''
  // — a right slot holding the optional big value plus the small caption, hard
  // against the RIGHT edge of the row.
  //
  // The slots are TOP-aligned and INDEPENDENT, never baseline-aligned: baseline
  // alignment puts the whole row on one shared baseline, so a 20px value
  // stretches the line box and PUSHES THE 13px TITLE DOWN by ~5px. Top-aligning
  // restores the title, but the line box would still grow to the value's 25px and
  // leave a gap under the title. The right slot therefore cancels its own extra
  // height with a negative bottom margin: the row stays as tall as the TITLE
  // alone, so a caption (e.g. the billing-period line) sits directly under it,
  // while the value still occupies its width and can never collide with it.
  const hasHeadRight = out.headRight !== undefined
  // `headValueTone` decides whether the figure wears the escalation CLASS (the
  // pulse rule keys off it); the VALUE colour is `valueColor` below, because a
  // warn figure is tinted without being an escalation.
  const headValueTone = out.valueTone !== undefined || out.valuePulse === true
  const titleLine = Math.round(titlePx * 1.2)
  const captionLine = Math.round(10 * scale * 1.2)
  const valueLine = Math.round(valuePx * 1.25)
  const rightLine = hasHeadRight ? Math.max(out.value != null ? valueLine : 0, out.headRight ? captionLine : 0) : 0
  const rightSpill = Math.max(0, rightLine - titleLine)
  // ---- THE HEAD'S TYPE LADDER, DECLARED ONCE ----
  // Every head is the same three rungs: the blue title, the 20px figure, the 10px
  // grey caption. They used to be written out at EVERY call site (the title row, the
  // headAfter row, the legend line, and — worst — a second copy inside the head-ring
  // column), which is exactly how two cards with the same look on paper ended up with
  // visibly different rhythm: the ring column stacked them with a uniform 1px gap
  // while a stacked head spaces them 4px + 2px. The builders below are the ONLY place
  // these three spans are defined. A head then either STACKS them (headAfter +
  // legend), keeps the figure INLINE in the title row (`headRight`), or stacks them
  // beside a head accessory (headRing) — the arrangement varies, the typography and
  // its rhythm do not.
  const FIGURE_GAP = Math.round(HEAD_GAP_PX * scale)
  const CAPTION_GAP = Math.round(2 * scale)
  const titleEl = React.createElement('span', {
    key: 'tt',
    className: 'dsx-stats-card-title',
    style: { fontSize: `${titlePx}px`, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  }, out.title)
  const figureEl = (text: string, key: string): React.ReactElement => React.createElement('span', {
    key,
    // The figure keeps the escalation's identity (`dsx-stats-card-value` + the pulse
    // class) wherever a card puts it: the red/breathe rules key off that class.
    className: headValueTone ? 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : '') : undefined,
    style: {
      fontSize: `${valuePx}px`,
      fontWeight: 600,
      color: headValueTone ? valueColor(out) : 'var(--dsw-alias-label-primary)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1.25,
      whiteSpace: 'nowrap',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  }, text)
  const captionEl = (text: string, key: string, style?: React.CSSProperties): React.ReactElement => React.createElement('span', {
    key,
    className: 'dsx-stats-card-legend',
    style: {
      fontSize: `${Math.round(10 * scale)}px`,
      color: 'var(--dsw-alias-label-tertiary)',
      fontWeight: 500,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      ...style,
    },
  }, text)

  const headRing = out.headRing
  // A BARE glyph in the same right-hand slot the ring owns, for a head whose
  // accessory is an IDENTITY rather than a dial (the permission shield, the GitHub
  // mark). It shares the ring's layout — the ladder stacks left, the accessory takes
  // the right — because a card may have exactly one of them, never both.
  const headIcon = out.headIcon

  // Head-with-donut: the ladder's three rungs stack in a LEFT column and the ring
  // owns the right, so the tile's empty middle goes to work instead of leaving a gap
  // between the head and the rows. The ring is a LAYOUT NEIGHBOUR of the ladder, not a
  // second typography for it: the rungs and their 4px/2px rhythm are the shared
  // builders above, identical to a stacked head without a ring.
  //
  // The ring itself carries NO figure: the number is already on the tile at 20px, and
  // a caption inside a 52px circle reads as cramped. It holds the widget's glyph and
  // the precise figure rides its hover text.
  //
  // A RING HEAD'S LADDER HAS A CONSTANT HEIGHT — all three rungs are always there,
  // and a rung the widget has no text for is reserved with a non-breaking space.
  //
  // The ring is CENTRED against the ladder (it is a dial beside the readings), so the
  // ladder's rendered height decides where the title, the figure and the ring sit. A
  // rung that comes and goes therefore moved the whole head: 套餐总览 drops its grey
  // caption whenever the tightest reset is more than a day out (and 额度预测 before its
  // period is known), and measured 2026-09-30 at side 150 the caption-less card drew
  // title 15.7 / figure 35.3 / ring 13 while the identical card WITH a caption drew
  // 13 / 32.6 / 17.3 — two neighbours in the same rail with visibly different heads
  // (the title and the figure fell 2.7px, the ring rose 4.3px). Reserving the rungs
  // makes every ring card's head identical whatever data it has, which is the rule
  // every non-ring card already obeys (its ladder is TOP-aligned, so its title never
  // moves; see the `headIcon` branch, which is top-aligned for the same reason).
  const accessoryHead = headRing !== undefined || headIcon !== undefined
  const ringFigure = out.headAfter?.big ?? null
  const ringHead = headRing !== undefined
  /** The figure rung. A RING head always draws it — reserving the line with a
   *  non-breaking space when the widget has no figure — while a bare-mark head keeps
   *  the old rule (its ladder is top-aligned, so an empty rung there is dead height
   *  above the body, not a fixed axis). */
  const figureRung = (reserve: boolean): React.ReactElement | null => {
    if (ringFigure === null && !reserve) return null
    return React.createElement('span', { key: 'ha', style: { display: 'flex', alignItems: 'baseline', gap: HEAD_GAP_PX, marginTop: `${FIGURE_GAP}px`, minWidth: 0, whiteSpace: 'nowrap' } },
      figureEl(ringFigure ?? '\u00a0', 'fg'),
      out.headAfter?.small != null ? captionEl(out.headAfter.small, 'sm', { lineHeight: 1.25 }) : null,
    )
  }
  /** The caption rung, reserved the same way (a nbsp keeps the identical line box). */
  const captionRung = (reserve: boolean): React.ReactElement | null => {
    const text = out.legend !== undefined && out.legend !== null && out.legend !== '' ? out.legend : null
    if (text === null && !reserve) return null
    return React.createElement('span', { key: 'lg', style: { display: 'flex', marginTop: `${CAPTION_GAP}px`, minWidth: 0 } }, captionEl(text ?? '\u00a0', 'cl'))
  }
  // Head-ring geometry, named once: the stroke, and the daylight its two round caps
  // need so a near-100% value still shows an opening (see `cappedArcInk`). ~1.2× the
  // stroke is what reads as a deliberate gap rather than an accident; the ring is a
  // qualitative dial and the exact figure is printed at 20px beside it.
  const RING_STROKE = Math.max(4, Math.round(5 * scale))
  const RING_CAP_GAP = Math.max(3, Math.round(RING_STROKE * 1.2))
  const headFlex = accessoryHead
    ? React.createElement('div', {
        key: 't',
        // A RING is centred against the ladder (it is a dial sitting beside the
        // readings); a bare ICON is a corner mark, so it aligns to the TOP and must
        // start where the title starts — centred, it floated ~17px down from the
        // corner and read as a gap above it (the owner's note, 2026-09-29).
        style: { display: 'flex', alignItems: headRing !== undefined ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 8, minWidth: 0 },
      },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
          titleEl,
          figureRung(ringHead),
          captionRung(ringHead),
        ),
        headRing !== undefined
          ? React.createElement(Donut, {
              // 52px at the 150px side (the body ring is 44px) — the owner asked for a
              // bigger circle, and the tile has the room once the figure sits left.
              // `inset` keeps the thicker stroke inside the box: r + stroke/2 ≤ radius.
              radius: 26 * scale,
              ratio: headRing.ratio,
              tone: headRing.tone ?? 'primary',
              stroke: RING_STROKE,
              inset: RING_STROKE / 2 + 0.5,
              // Daylight between the caps, scaled with the stroke: below 100% the ring
              // must show its head and tail as two capped ends (see cappedArcInk).
              capGap: RING_CAP_GAP,
              // A dial whose value can overrun (额度预测's month projection) draws the
              // overrun as a second lap that sweeps over the head (see Donut).
              overshoot: headRing.overshoot === true,
              title: headRing.label,
              center: headRing.icon === undefined
                ? null
                : React.createElement('span', {
                    // A fixed 16px glyph box, scaled visually: the ring's middle is
                    // painted in the ring's own tone, so "green = good" reads twice.
                    style: { display: 'flex', color: CHART_TONES[headRing.tone ?? 'primary'] ?? CHART_TONES.primary, transform: `scale(${((20 * scale) / 16).toFixed(3)})` },
                  }, HEAD_RING_ICONS[headRing.icon] ?? null),
            })
          // The bare accessory: one glyph, no arc — an identity, not a dial. 30px and
          // top-right aligned: it is a corner MARK, so it reads at the same visual
          // weight as the 20px figure it sits above, and it starts on the title's own
          // top line. (24px centred was the first attempt; the owner read it as small
          // and floating, 2026-09-29.) `primary` unless the widget asked for a tone,
          // because a mark that changes colour for no stated reason is exactly the
          // "why is this yellow?" defect this slot exists to avoid.
          : React.createElement('span', {
              key: 'hi',
              style: {
                display: 'flex',
                flex: 'none',
                color: headIcon === undefined ? undefined : (CHART_TONES[headIcon.tone ?? 'primary'] ?? CHART_TONES.primary),
                transform: `scale(${((30 * scale) / 16).toFixed(3)})`,
                transformOrigin: 'top right',
              },
            }, headIcon === undefined ? null : (HEAD_RING_ICONS[headIcon.name] ?? null)),
      )
    : React.createElement('div', { key: 't', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, minHeight: `${titleLine}px` } },
    titleEl,
    hasHeadRight ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6, flex: 'none', marginBottom: rightSpill > 0 ? `${-rightSpill}px` : undefined } },
      out.value != null ? figureEl(out.value, 'hv') : null,
      out.headRight ? captionEl(out.headRight, 'hr') : null,
    ) : null,
  )
  const headEls: Array<React.ReactElement> = [
    headFlex,
  ]
  if (out.headAfter && !accessoryHead) {
    // Prominent figure + the grey subtitle on their own row under the title.
    //
    // SKIPPED when a headRing is present: the ring head's LEFT COLUMN already renders
    // `headAfter.big` (that is the ladder's single source for the figure — see
    // headRing), so pushing this row too printed the figure TWICE. The defect showed
    // up differently on the two surfaces (the preview pins the tile height, so it
    // CLIPPED; the rail only sets min-height, so the card GREW and broke the grid),
    // which is why the tile-fits guard below now runs on both.
    // nowrap on the ROW (not just the small text): the big figure is a single
    // token ("64%", "12.2K") that must never break, and the whole row is
    // bottom-anchored on several cards, so a wrap would shift the chart up.
    //
    // The subtitle has THREE shapes, all riding the SAME row to the RIGHT of the
    // figure: one grey line on the figure's baseline (`small`, e.g. 上下文水位's
    // "~638K / 1M"), that same line dropped to the row's FLOOR
    // (`small`+`smallAlign: 'bottom'`, e.g. 额度管理's `账期 10-10`), or a stacked
    // grey block (`smallLines`) that is CENTRED on the figure's line box.
    const haLines = Array.isArray(out.headAfter.smallLines) && out.headAfter.smallLines.length > 0 ? out.headAfter.smallLines : []
    headEls.push(React.createElement('div', { key: 'ha', className: 'dsx-stats-card-headafter', style: {
      display: 'flex',
      // ONE grey line rides the figure's baseline by default, or sits on the row's
      // floor when it asks to (`smallAlign: 'bottom'` — the line's bottom edge
      // then lines up with the figure's). A STACKED block is CENTRED on the
      // figure's line box instead: baseline-aligning the block put its second
      // line below the figure's floor and left only ~12px to the figures row
      // underneath (measured 2026-09-20 on the live 额度管理 card).
      alignItems: haLines.length > 0 ? 'center' : out.headAfter.smallAlign === 'bottom' ? 'flex-end' : 'baseline',
      gap: HEAD_GAP_PX,
      marginTop: `${Math.round(HEAD_GAP_PX * scale)}px`,
      minWidth: 0,
      whiteSpace: 'nowrap',
    } },
      out.headAfter.big != null ? figureEl(out.headAfter.big, 'ha-big') : null,
      haLines.length > 0
        ? React.createElement('span', { className: 'dsx-stats-card-headafter-lines', style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
          haLines.map((line, i) => captionEl(line, `ha-l${i}`, { lineHeight: 1.25 })))
        : out.headAfter.small != null ? captionEl(out.headAfter.small, 'ha-sm', { lineHeight: 1.25 }) : null,
    ))
  }
  if (out.legend && !accessoryHead) {
    // Small caption right under the title; unlike headAfter it does not change the
    // vertical alignment, so a bottom-anchored card (e.g. heatmap) keeps it. One
    // line, ellipsized: a long localized caption must never wrap and push the card's
    // content down. When a headRing is present the caption belongs to that ring head's
    // LEFT column instead — rendered there, by the same builder.
    headEls.push(captionEl(out.legend, 'lg', { marginTop: `${CAPTION_GAP}px` }))
  }
  if (out.meter && out.meter.length) {
    // Two-line live meter under the title (e.g. peak-pricing windows): the
    // active row lights up brand-blue and scales up slightly, the idle row
    // keeps the faint legend look. Both use the same font as the token-bar
    // legend so the format stays consistent across cards.
    headEls.push(React.createElement('div', { key: 'mt', className: 'dsx-stats-card-meter', style: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: `${Math.round(4 * scale)}px`, minWidth: 0 } },
      out.meter.map((m, i) => React.createElement('div', { key: i, style: {
        fontSize: `${m.active ? Math.round(12 * scale) : Math.round(10 * scale)}px`,
        fontWeight: m.active ? 600 : 500,
        color: m.active ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-label-tertiary)',
        lineHeight: 1.2,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.25s ease, font-size 0.25s ease, font-weight 0.25s ease',
      } }, m.label)),
    ))
  }
  const head = headEls
  const body: React.ReactElement[] = []
  // The line sparkline (sys-gpu-line) is ELASTIC: the card body owns the full
  // remaining height and the chart flexes into it, so the card never bursts
  // its box at any side size or magnification. Other charts keep their fixed
  // footprint and bottom-anchored posture. Declared BEFORE the chart push
  // below (TDZ: the push evaluates it immediately).
  //
  // 对话轨迹 (lanes) is elastic too, by the user's request (2026-09-25): the
  // three lanes are stacked CONTIGUOUSLY (no gap between them) and the whole
  // block takes every pixel between the grey caption and the card's floor —
  // the official 8px/14px vertical strip left a two-thirds-empty card at this
  // tile size. Only the block's WIDTH geometry is the official one.
    const stretchChart = out.chart !== undefined && CHART_FILLS_BODY.has(out.chart.kind)
  // value is shown inline in the header when headRight is present (official meter
  // header: `上下文已用 64% ~638K / 1M`), and in the head's left column when a
  // headRing is (the figure rides the ring, never both). Otherwise it goes to the
  // body.
  // `value` is suppressed by `headRing` ONLY — the ring head carries its figure in
  // `headAfter.big`, so a `value` there would print the same reading twice. A
  // `headIcon` head has no such conflict: the accessory occupies the right slot and
  // renders no figure at all, so suppressing `value` for it made the field silently
  // unusable on any icon-bearing card (found by the guard card's builder,
  // 2026-09-29 — its name rendered nowhere until it moved to `sub`).
  if (out.value != null && out.headRight === undefined && out.headRing === undefined) body.push(React.createElement('div', { key: 'v', className: 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : '') + (figureDrop ? ' dsx-figure-drop' : ''), style: { fontSize: `${valuePx}px`, color: out.valueTone === undefined ? undefined : valueColor(out) } }, out.value))
  if (out.sub) body.push(React.createElement('div', { key: 's', className: 'dsx-stats-card-sub', style: { fontSize: `${Math.round(10 * scale)}px` } }, out.sub))
  if (out.chart) {
      const c = renderChart({ chart: out.chart, side: unit, width: boxW, pad: innerPad, scale: unit / BASE_SIDE })
    if (c) body.push(React.createElement('div', {
      key: 'c',
      // The stretch wrapper owns the card's remaining height so an elastic chart
      // (line sparkline, quotas) can fill it; fixed-footprint charts ignore it.
      // `minHeight: 0` matters: without it the flex item keeps its content's
      // automatic minimum size and the elastic chart could push the card taller.
      style: stretchChart || elasticBody ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined,
    }, c))
  }
  if (out.rich) body.push(React.createElement('div', { key: 'r' }, RichBlock({ rich: out.rich, scale })))
  // Bottom-left value sits in the normal foot; the corner button is absolutely
  // positioned top-right: a brand-blue filled round button with the official
  // refresh/rotate icon; when armed it widens into a「确认」capsule.
  const compressIcon = React.createElement('svg', { width: Math.round(18 * scale), height: Math.round(18 * scale), viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
    React.createElement('path', { d: 'M7.92136 0.349152C10.3744 0.349234 12.5564 1.5052 13.9557 3.29894L15.1281 2.12759C15.3303 1.92546 15.6767 2.06943 15.6767 2.35538V5.53923C15.6766 5.71626 15.5329 5.85976 15.3559 5.86002H12.171C11.8854 5.8597 11.7426 5.51465 11.9443 5.31249L12.9641 4.29056C11.8237 2.74305 9.98908 1.74106 7.92136 1.74097C4.46436 1.74097 1.66233 4.543 1.66233 8C1.66233 11.457 4.46436 14.259 7.92136 14.259C11.3782 14.2589 14.1804 11.4569 14.1804 8H15.5722C15.5722 12.2251 12.1465 15.6507 7.92136 15.6508C3.69614 15.6508 0.270508 12.2252 0.270508 8C0.270508 3.77478 3.69614 0.349152 7.92136 0.349152Z', fill: 'currentColor' }),
  )
  const cornerPos = out.corner?.pos === 'bottom'
    ? { bottom: `${innerPad}px`, right: `${innerPad}px` }
    : { top: `${innerPad}px`, right: `${innerPad}px` }
  // The corner action is a 42px DISC (the owner's call, 2026-09-28, after seeing it
  // at 52): the cache card's head ring is 52px but it is an OUTLINE — a filled disc
  // of the same diameter carries far more ink, so it reads oversized next to it.
  // The inset is the card's own inner padding, not a fixed 8px, so the disc's right
  // edge lines up with the head text column (and with the ring above it) instead of
  // hugging the corner. Set inline (the class keeps its own fallback), and the ARMED
  // state keeps the SAME disc: growing into a capsule would reach left under the
  // title, while 「确认」/“Confirm” fit inside this circle at the smaller type size.
  const cornerSize = Math.round(42 * scale)
  const corner = out.corner
    ? React.createElement('button', {
        key: 'corner', type: 'button', className: 'dsx-stats-card-corner' + (out.corner.armed ? ' armed' : ''),
        style: { ...cornerPos, width: `${cornerSize}px`, height: `${cornerSize}px`, borderRadius: `${Math.round(cornerSize / 2)}px`, fontSize: `${Math.round(10 * scale)}px` },
        title: out.corner.armed ? out.corner.armedLabel : out.corner.label,
        onClick: (e) => { e.stopPropagation(); if (onAction) onAction(out.corner!.id) },
      }, out.corner.armed ? out.corner.armedLabel : compressIcon)
    : null
  // When the card carries a rich block with a vertical placement (valign), the
  // body owns the full remaining height so the block can sit top/center/bottom;
  // otherwise default to pushing content to the bottom of the card.
  const vj = out.rich?.valign === 'bottom' ? 'flex-end' : out.rich?.valign === 'center' ? 'center' : undefined
  // (stretchChart is declared above with the body assembly — it is read here
  // AND by the chart push, which precedes this line.)
  //
  // A headAfter row normally means "the body starts right under the head"
  // (elastic charts and rich blocks need that). `bodyAnchor: 'bottom'` opts a
  // card back into the EVERY-OTHER-CARD posture: the short figure row stays on
  // the card's floor with the head above it (measured on the live 额度管理 card:
  // top-aligned, its two figures sat 12px under the 账期 line, leaving 55px of
  // empty tile below them).
  const headAnchorsTop = out.headAfter !== undefined && out.bodyAnchor !== 'bottom'
  // `topAligned` is about WHERE the body sits when the body is only as tall as its
  // content. An ELASTIC chart takes the card's whole leftover height instead, so the
  // body flexes in both cases and only `justifyContent` differs.
  const topAligned = vj || headAnchorsTop || stretchChart
  const footStyle: React.CSSProperties = topAligned || elasticBody
    ? {
        flex: '1 1 0',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        justifyContent: vj ?? (elasticBody && !topAligned ? 'flex-end' : 'flex-start'),
      }
    : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  return React.createElement('div', {
    ref: cardRef,
    className: 'dsx-stats-card' + (squircle ? ' dsx-squircle' : '') + (cyclable ? (pressed ? ' dsx-cyclable dsx-cycle-pressed' : ' dsx-cyclable') : ''),
    // minHeight is the resting contract for every card; the ELASTIC line card
    // (sys-gpu-line) additionally pins a FIXED height so its flex body (chart
    // eats the leftover space) compresses inside the box instead of letting
    // content drive the card taller than the slot (the old card swelled to
    // ≈178px and burst the 150px box on hover magnification).
    //
    // `pinBox` is what a PREVIEW passes: the card is pinned to the unit square
    // (and its own overflow:hidden clips the rest), so the market/组件配置 stage
    // shows the tile the rail actually seats instead of whatever height the
    // content asks for — measured 2026-09-20: the credits card rendered 200×250
    // in the market and read as a non-square rounded rectangle.
    //
    // A CHART card is pinned even in the RAIL (`pinnedByChart`): the slot the rail
    // seats it in is already exactly `unit` tall, so a card that let its content
    // size it grew OUT of that slot — measured 2026-09-29, the Command Code 额度
    // card boxed 172.8px in a 160px slot (and the tile-fits guard drew its red
    // outline). Pinned, the card is exactly the tile and its elastic body gets the
    // leftover height to draw in.
    //
    // `border-box` so `height: unit` means the TILE, padding included: with
    // `content-box` the box would be `unit + 2 * padding` and the pin would add
    // 26px instead of removing the overflow.
    style: { position: 'relative', boxSizing: 'border-box', width: `${boxW}px`, minHeight: `${unit}px`, height: pinBox || pinnedByChart || stretchChart ? `${unit}px` : undefined, borderRadius: `${radius}px`, padding: `${innerPad}px` },
    title: out.cardHint ?? out.cycle?.hint,
    onClick: cyclable ? () => { pressDown(); if (onCycle) onCycle(out) } : undefined,
    onPointerDown: cyclable ? pressDown : undefined,
  },
    corner,
    // The HEAD keeps its own height, always: the card is a fixed box, and without
    // this the flex algorithm solved an over-tall card by SHRINKING the head's tail
    // instead of the body — measured 2026-09-29 on the 额度 card, whose `AllUser`
    // caption was squeezed from 15px to 6.3px (clipped) while the chart below it
    // still overflowed by 10px and covered it. The body is the only part that
    // absorbs a shortfall (it measures itself for exactly that).
    React.createElement('div', { key: 'head', style: { flex: 'none', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0 } }, head),
    React.createElement('div', { key: 'foot', style: footStyle }, body),
    out.actions ? ActionsBlock({ actions: out.actions, onAction, scale }) : null,
  )
}
