import { defineWidget, type LaneDatum, type WidgetRenderOut, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** «1.2s» / «840ms» — one short duration for a beat tooltip. */
function fmtMs(ms: number): string {
  if (ms <= 0) return '0ms'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

/** 对话轨迹 — the official 轨迹 (trajectory) rail compressed into one card.
 *
 *  One ROW per lane, exactly the lanes the official timeline draws — 输入 (a user
 *  or steering message), 模型 (an assistant step) and 工具 (a tool call) — in that
 *  order, and all three lanes are always drawn (an empty lane is an empty track,
 *  as in the official strip). Every beat is one bar in its own lane, oldest left,
 *  newest right. The card renders the official HORIZONTAL geometry (the official
 *  `min(width*.08%, 1px)` gap, the 2px floor, 1px corners) but its own VERTICAL
 *  layout: three flush bands filling the card's remaining height.
 *
 *  WIDTH is a per-card switch (`泳道宽度`), mirroring the official toolbar's 时长
 *  toggle:
 *   - 按时长 (default): the recorded-duration projection — a bar's width is its
 *     share of the window's total duration (idle compressed), so a 26.7s tool
 *     call is visibly longer than a 17ms one; anything under the official 2px
 *     floor is drawn at 2px;
 *   - 等宽: the official DEFAULT projection — one equal slot per beat, back to
 *     back, the slot frozen at TRAJECTORY_WINDOW beats so the row stops
 *     re-scaling as the window rolls (n beats share the lane while it fills).
 *
 *  The subtitle is the window's per-lane counts, so the numbers and the lanes
 *  always describe the same 30 beats. */
function trajectoryRender(stats: WidgetStats): WidgetRenderOut | null {
  const beats = stats.trajectory ?? []
  let input = 0
  let model = 0
  let tool = 0
  for (const b of beats) {
    if (b.kind === 'input') input += 1
    else if (b.kind === 'model') model += 1
    else tool += 1
  }
  const lanes: LaneDatum[] = beats.map((b) => ({
    kind: b.kind,
    ms: b.ms,
    label: b.kind === 'input' ? t('card.trajectory.input') : `${t(`card.trajectory.${b.kind}`)} ${fmtMs(b.ms)}`,
  }))
  return {
    title: t('widget.trajectory.name'),
    legend: t('card.trajectory.legend', { input, model, tool }),
    chart: {
      kind: 'lanes',
      lanes,
      // Default to the recorded-duration widths (the official 时长 projection);
      // the config switch turns them into the official default equal-width
      // sequence projection instead.
      laneSizing: stats.laneSizing === 'equal' ? 'equal' : 'time',
    },
  }
}

export default defineWidget({
  id: 'trajectory',
  name: () => t('widget.trajectory.name'),
  desc: () => t('widget.trajectory.desc'),
  builtin: true,
  group: 'system',
  render: trajectoryRender,
  configSchema: [
    {
      key: 'laneSizing',
      label: () => t('config.laneSizing'),
      type: 'mode',
      default: 'time',
      options: [
        ['time', () => t('config.laneSizing.time')],
        ['equal', () => t('config.laneSizing.equal')],
      ],
    },
  ],
})
