/**
 * dsh-widgets — the 对话轨迹 lanes chart.
 *
 * The three-lane strip keeps the OFFICIAL 轨迹 geometry (see each constant below)
 * but stacks the lanes contiguously so they fill the card's remaining height.
 * Moved verbatim out of components.tsx (Phase 3.4), constants included: `lanes` is
 * their only consumer.
 */

import * as React from 'react'
import { TRAJECTORY_WINDOW } from '../../lib/contract/types'
import type { ChartProps } from './types'

/** 对话轨迹 lane colors — EXACTLY the official 轨迹 timeline's three lanes
 *  (TrajectoryTimeline.module.css `[data-timeline-span=…]`): 输入 = business
 *  primary, 模型 = the assistant span's decoding color (brand blue 60% mixed
 *  with the error red), 工具 = the warn label. Keeping the expressions (not
 *  resolved hex) means the card follows light/dark and future token changes. */
const LANE_TONES: Record<string, string> = {
  input: 'var(--dsw-alias-state-business-primary)',
  model: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, var(--dsw-alias-state-error-secondary))',
  tool: 'var(--dsw-alias-state-warn-label)',
}

/** Lane draw order, top→bottom — the SAME order as the subtitle's counts
 *  (输入 / 模型 / 工具), which is also the official 轨迹 rail's order. */
const LANE_ORDER: Array<'input' | 'model' | 'tool'> = ['input', 'model', 'tool']

/** The trajectory window is a FIXED slot count, ONE SLOT PER BEAT: a bar keeps
 *  its column as the window rolls (newest entering at the right), instead of the
 *  whole row re-scaling every time a beat arrives. Until the window fills, the
 *  beats SHARE the lane instead (n beats → 100/n % each), so a lone segment owns
 *  its lane. */
const LANE_SLOTS = TRAJECTORY_WINDOW

/** Lane corner radius — the official span's `border-radius: 1px`. The official
 *  VERTICAL numbers (8px bars on a 14px pitch) are deliberately NOT used: the
 *  three lanes are stacked contiguously and stretch to the card's remaining
 *  height (user's call, 2026-09-25 — see the lanes branch). */
const LANE_RADIUS = 1

/** The official span gap: `--trajectory-span-gap: min(widthPercent * .08%, 1px)`,
 *  applied as `left: left% + gap` and `width: max(2px, width% - 2 * gap)` — so
 *  two neighbouring beats stand `2 * gap` apart, never less than the 2px floor
 *  the official span sets with `min-width: 2px`. */
const LANE_GAP_RATIO = 0.08
const LANE_GAP_MAX_PX = 1
const LANE_MIN_PX = 2

export function LanesChart({ chart, side, width, pad, scale }: ChartProps): React.ReactElement | null {
  if (chart.kind === 'lanes' && chart.lanes) {
    // 对话轨迹 — the official 轨迹 timeline (`@deepseek-ai/dsh-client-ui-trajectory`,
    // TrajectoryTimeline.module.css + deriveTrajectoryTimeline) rendered inside a
    // card. ONE ROW PER LANE, in the official order 输入 / 模型 / 工具, and all
    // THREE lanes are always drawn — an empty lane is an empty track, exactly as
    // in the official strip, where a lane with no record inside the domain still
    // occupies its own band. left→right = oldest→newest.
    //
    // HORIZONTAL geometry is the official's, value for value:
    //   .span { left:  calc(left%  + gap);
    //           width: max(2px, calc(width% - gap - gap));
    //           min-width: 2px; border-radius: 1px }
    //   --trajectory-span-gap: min(widthPercent * .08%, 1px)
    //   opacity: 1 for 模型/工具; the base span's .78 for 输入
    //   colours: see LANE_TONES (the official `[data-timeline-span=…]` rules).
    // Duration never changes a bar's height, only its WIDTH.
    //
    // VERTICAL geometry is the CARD's, by the user's request (2026-09-25): the
    // official 8px bars on a 14px pitch left two thirds of this 160px tile empty,
    // so the three lanes are stacked CONTIGUOUSLY (no gap between them) and the
    // block owns every pixel between the grey caption and the card's floor — the
    // card body is elastic for `lanes` (see `stretchChart` in CardBody).
    //
    // WIDTH is per-instance (`chart.laneSizing`), mirroring the official
    // toolbar's 时长 toggle:
    //  - 'time' (按时长): the recorded-duration projection — each beat's slice is
    //    its share of the window's total duration, idle compressed away, so a
    //    26.7s tool call is visibly longer than a 17ms one (the official
    //    "duration"/actual projection, `deriveTimedTimeline`);
    //  - 'equal' (等宽): the official DEFAULT projection — one equal slot per
    //    beat, back to back (the official "sequence" mode), the slot count
    //    frozen at TRAJECTORY_WINDOW so the row stops re-scaling as the window
    //    rolls (n beats share the lane while it fills).
    // In both modes a beat narrower than the 2px floor is drawn at 2px
    // (`min-width: 2px` in the official CSS), which is what keeps a quick tool
    // call visible instead of vanishing — and the official gap is subtracted
    // from the LEFT edge as well, so two neighbours can never touch.
    const lanes = chart.lanes
    if (lanes.length === 0) return null
    const timeMode = chart.laneSizing !== 'equal' && lanes.some((l) => (l.ms ?? 0) > 0)
    // Slice per beat on the shared axis: [left%, width%].
    const slices: Array<[number, number]> = []
    if (timeMode) {
      const total = lanes.reduce((sum, l) => sum + Math.max(0, l.ms ?? 0), 0) || 1
      let acc = 0
      for (const l of lanes) {
        const w = (Math.max(0, l.ms ?? 0) / total) * 100
        slices.push([acc, w])
        acc += w
      }
    } else {
      const slots = Math.max(1, Math.min(LANE_SLOTS, lanes.length))
      const slotPct = 100 / slots
      for (let i = 0; i < lanes.length; i++) slices.push([i * slotPct, slotPct])
    }
    // --trajectory-span-gap: min(widthPercent * .08%, 1px) — the 1px ceiling is
    // what the official strip always hits (its track is ~1300px wide); inside a
    // ~130px card the proportional branch wins, so the standoff scales with the
    // slot instead of eating a whole pixel of a 4px slot.
    const contentW = Math.max(48, (width ?? side) - 2 * (pad ?? Math.round(12 * scale)))
    const gapPct = (l: number): number => Math.min(l * LANE_GAP_RATIO, (LANE_GAP_MAX_PX / contentW) * 100)
    const rows = LANE_ORDER.map((kind, lane) => {
      const segs = lanes
        .map((l, i) => ({ l, i }))
        .filter((e) => e.l.kind === kind)
        .map((e) => {
          const [left, width] = slices[e.i]!
          const gap = gapPct(width)
          return React.createElement('div', {
            key: e.i,
            className: 'dsx-lane-seg',
            // The lane this bar belongs to — a probe asserts a row never carries
            // a foreign lane (scripts/diag-lanes-invariant.cjs).
            'data-lane': kind,
            title: e.l.label,
            style: {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `calc(${left.toFixed(4)}% + ${gap.toFixed(4)}%)`,
              width: `max(${LANE_MIN_PX}px, calc(${width.toFixed(4)}% - ${(2 * gap).toFixed(4)}%))`,
              minWidth: LANE_MIN_PX,
              borderRadius: LANE_RADIUS,
              background: LANE_TONES[kind] ?? LANE_TONES.input,
              // The official base span is .78; 模型 and 工具 override it to 1.
              opacity: kind === 'input' ? 0.78 : 1,
            },
          })
        })
      return React.createElement('div', {
        key: kind,
        className: 'dsx-lane-row',
        'data-lane': kind,
        'data-lane-index': lane,
        // Equal thirds of the elastic block, contiguous: `flex: 1` on every lane
        // (an empty lane keeps its third, like the official track).
        style: { position: 'relative', flex: 1, minWidth: 0, minHeight: 0 },
      }, ...segs)
    })
    return React.createElement('div', {
      className: 'dsx-lanes',
      // `flex: 1` = own every pixel the card body has left; the top margin is the
      // card's own spacing token (the same 6px the body gap uses), so the block
      // starts at a normal distance under the grey caption instead of butting
      // against it — and still reaches the card's padding floor.
      style: { width: '100%', flex: 1, minHeight: 0, marginTop: Math.round(6 * scale), display: 'flex', flexDirection: 'column' },
    }, ...rows)
  }
  return null
}