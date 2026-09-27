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
import { DEFAULT_CORNER_PERCENT } from '../runtime/prefs'
import { t } from '../i18n'
import type { WidgetAction, WidgetRenderOut, WidgetRich } from '../lib/contract'

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
    style: { position: 'relative', display: 'flex', flexDirection: 'column', width: `${boxW}px`, minHeight: `${unit}px`, borderRadius: `${radius}px`, padding: `${pad}px` },
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
  const headValueTone = out.valueTone === 'danger' || out.valuePulse === true
  const titleLine = Math.round(titlePx * 1.2)
  const captionLine = Math.round(10 * scale * 1.2)
  const valueLine = Math.round(valuePx * 1.25)
  const rightLine = hasHeadRight ? Math.max(out.value != null ? valueLine : 0, out.headRight ? captionLine : 0) : 0
  const rightSpill = Math.max(0, rightLine - titleLine)
  const headFlex = React.createElement('div', { key: 't', className: 'dsx-stats-card-title', style: { fontSize: `${titlePx}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, minHeight: `${titleLine}px` } },
    React.createElement('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, out.title),
    hasHeadRight ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6, flex: 'none', marginBottom: rightSpill > 0 ? `${-rightSpill}px` : undefined } },
      out.value != null ? React.createElement('span', {
        className: headValueTone ? 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : '') : undefined,
        style: { fontSize: `${valuePx}px`, fontWeight: 600, color: headValueTone ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
      }, out.value) : null,
      out.headRight ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, out.headRight) : null,
    ) : null,
  )
  const headEls: Array<React.ReactElement> = [
    headFlex,
  ]
  if (out.headAfter) {
    // Prominent figure + the grey subtitle on their own row under the title.
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
      out.headAfter.big != null ? React.createElement('span', {
        // The figure keeps the escalation's identity (`dsx-stats-card-value` +
        // the pulse class) wherever a card puts it: the red/breathe rules key off
        // that class, and valueTone's red is applied inline exactly as the title
        // row's copy does.
        className: headValueTone ? 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : '') : undefined,
        style: { fontSize: `${valuePx}px`, fontWeight: 600, color: headValueTone ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.25, whiteSpace: 'nowrap' },
      }, out.headAfter.big) : null,
      haLines.length > 0
        ? React.createElement('span', { className: 'dsx-stats-card-headafter-lines', style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
          haLines.map((line, i) => React.createElement('span', { key: i, style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, line)))
        : out.headAfter.small != null ? React.createElement('span', { style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, out.headAfter.small) : null,
    ))
  }
  if (out.legend) {
    // Small caption right under the title; unlike headAfter it does not change
    // the vertical alignment, so a bottom-anchored card (e.g. heatmap) keeps it.
    // One line, ellipsized: a long localized caption must never wrap and push
    // the card's content down.
    headEls.push(React.createElement('div', { key: 'lg', className: 'dsx-stats-card-legend', style: { fontSize: `${Math.round(10 * scale)}px`, color: 'var(--dsw-alias-label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', marginTop: `${Math.round(2 * scale)}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, out.legend))
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
  // header: `上下文已用 64% ~638K / 1M`); otherwise it goes to the body.
  if (out.value != null && out.headRight === undefined) body.push(React.createElement('div', { key: 'v', className: 'dsx-stats-card-value' + (out.valuePulse ? ' dsx-value-pulse' : ''), style: { fontSize: `${valuePx}px`, color: out.valueTone === 'danger' ? 'var(--dsw-alias-state-error-primary)' : undefined } }, out.value))
  if (out.sub) body.push(React.createElement('div', { key: 's', className: 'dsx-stats-card-sub', style: { fontSize: `${Math.round(10 * scale)}px` } }, out.sub))
  if (out.chart) {
      const c = renderChart({ chart: out.chart, side: unit, width: boxW, pad: innerPad, scale: unit / BASE_SIDE })
    if (c) body.push(React.createElement('div', {
      key: 'c',
      // The stretch wrapper owns the card's remaining height so an elastic
      // chart (line sparkline) can fill it; fixed-footprint charts ignore it.
      style: stretchChart ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined,
    }, c))
  }
  if (out.rich) body.push(React.createElement('div', { key: 'r' }, RichBlock({ rich: out.rich, scale })))
  // Bottom-left value sits in the normal foot; the corner button is absolutely
  // positioned top-right: a brand-blue filled round button with the official
  // refresh/rotate icon; when armed it widens into a「确认」capsule.
  const compressIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
    React.createElement('path', { d: 'M7.92136 0.349152C10.3744 0.349234 12.5564 1.5052 13.9557 3.29894L15.1281 2.12759C15.3303 1.92546 15.6767 2.06943 15.6767 2.35538V5.53923C15.6766 5.71626 15.5329 5.85976 15.3559 5.86002H12.171C11.8854 5.8597 11.7426 5.51465 11.9443 5.31249L12.9641 4.29056C11.8237 2.74305 9.98908 1.74106 7.92136 1.74097C4.46436 1.74097 1.66233 4.543 1.66233 8C1.66233 11.457 4.46436 14.259 7.92136 14.259C11.3782 14.2589 14.1804 11.4569 14.1804 8H15.5722C15.5722 12.2251 12.1465 15.6507 7.92136 15.6508C3.69614 15.6508 0.270508 12.2252 0.270508 8C0.270508 3.77478 3.69614 0.349152 7.92136 0.349152Z', fill: 'currentColor' }),
  )
  const cornerPos = out.corner?.pos === 'bottom'
    ? { bottom: `${Math.round(8 * scale)}px`, right: `${Math.round(8 * scale)}px` }
    : { top: `${Math.round(8 * scale)}px`, right: `${Math.round(8 * scale)}px` }
  const corner = out.corner
    ? React.createElement('button', {
        key: 'corner', type: 'button', className: 'dsx-stats-card-corner' + (out.corner.armed ? ' armed' : ''),
        style: cornerPos,
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
  const topAligned = vj || headAnchorsTop || stretchChart
  const footStyle: React.CSSProperties = topAligned
    ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: vj ?? 'flex-start' }
    : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }
  return React.createElement('div', {
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
    style: { position: 'relative', width: `${boxW}px`, minHeight: `${unit}px`, height: pinBox || stretchChart ? `${unit}px` : undefined, borderRadius: `${radius}px`, padding: `${innerPad}px` },
    title: out.cardHint ?? out.cycle?.hint,
    onClick: cyclable ? () => { pressDown(); if (onCycle) onCycle(out) } : undefined,
    onPointerDown: cyclable ? pressDown : undefined,
  },
    corner,
    head,
    React.createElement('div', { key: 'foot', style: footStyle }, body),
    out.actions ? ActionsBlock({ actions: out.actions, onAction, scale }) : null,
  )
}
