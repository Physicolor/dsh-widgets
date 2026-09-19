import { defineWidget, type LaneDatum, type WidgetRenderOut, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** «1.2s» / «840ms» — one short duration for a beat tooltip. */
function fmtMs(ms: number): string {
  if (ms <= 0) return '0ms'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

/** 对话轨迹 — the official 轨迹 (trajectory) rail compressed into one card.
 *
 *  Three lanes, exactly the ones the official timeline draws: 输入 (a user or
 *  steering message), 模型 (an assistant step) and 工具 (a tool call). Each beat
 *  is one segment in its own lane, placed by window position (oldest left,
 *  newest right).
 *
 *  WIDTH is a per-card switch (`泳道宽度`):
 *   - 按时长 (default): every beat's width is proportional to its duration, so
 *     the strip shows the session's actual rhythm — a long tool call owns more
 *     of the lane than a quick model step;
 *   - 等宽: the fixed-slot window, where the slot freezes at TRAJECTORY_WINDOW
 *     beats and the row stops re-scaling as the window rolls (n beats share the
 *     lane while it fills, so a single beat owns its whole lane).
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
      // Default to the duration-proportional lanes; the config switch turns it
      // back into the fixed-slot window.
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
