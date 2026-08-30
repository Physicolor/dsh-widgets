import { defineWidget, type WidgetRenderMeta, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'
import { buildRollingGrid, dayKey, fmtTokens } from '../../client/lib/format'

/** Token usage heatmap card — a GitHub-style daily grid coloured by volume.
 *  The 2×2 size shows the rolling ~3-month calendar (window alignment
 *  user-configurable) with a legend under the title (two plain figures:
 *  today / window total). The 2×4 size shows a ~7-month (30-week) rolling grid
 *  — all recent usage points at a glance — with the two figures moved into the
 *  title row's right side (headRight) and the grid horizontally centred. */
function heatmapRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const rawLog = stats.heatmapRaw
  const wide = meta?.size === '2x4'
  // 2×4 always derives a fresh 30-week rolling grid from the raw log; the 2×2
  // keeps the pre-built (config-aligned) grid the collector already made.
  const grid = rawLog && wide ? buildRollingGrid(rawLog, 30) : (stats.heatmapGrid ?? (rawLog ? buildRollingGrid(rawLog, 13) : undefined))
  if (!grid || !grid.length) return null
  const now = new Date()
  const todayKey = dayKey(now)
  let todayVal = 0
  let total = 0
  for (const row of grid) { for (const c of row) { total += c.value; if (c.date === todayKey) todayVal = c.value } }
  // Two figures, no words: "今日用量 窗口总用量". Earliest/latest dates are
  // drawn on the chart's bottom-left/right corners by the renderer.
  const figures = todayVal > 0 || total > 0 ? `${fmtTokens(todayVal)}  ${fmtTokens(total)}` : undefined
  return {
    title: t('card.heatmap.title'),
    // 2×4: figures sit at the right end of the title row; the grid centres.
    ...(wide ? { headRight: figures } : { legend: figures }),
    chart: { kind: 'heatmap', heatmap: grid },
  }
}

/** Widget-owned preview builder: the shell asks for the EXAMPLE stats with the
 *  current per-instance config, so the 2×2 preview honors the window-alignment
 *  mode (rolling: today on the right / quarter: aligned to calendar quarter)
 *  exactly like the real collector — the config edit is visible in the preview.
 *  Mirrors the shell preview logic that used to live in components.tsx. */
function previewStats(config: Record<string, unknown>): Partial<WidgetStats> {
  const mode = (config.monthMode as string) === 'quarter' ? 'quarter' : 'rolling'
  const now = new Date()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const base = new Date(mode === 'quarter'
    ? (() => { const q = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); return new Date(q.getFullYear(), q.getMonth(), q.getDate() - q.getDay()) })()
    : (() => { const b = new Date(startOfWeek); b.setDate(b.getDate() - 12 * 7); return b })())
  const grid: Array<Array<{ value: number; date: string }>> = []
  const day = (r: number, c: number): Date => { const d = new Date(base); d.setDate(base.getDate() + c * 7 + r); return d }
  // Mirror the real seed so preview ≈ actual: the three used days carry their
  // known absolute values (total 3203M), the rest stay small markers.
  const realSeed: Record<string, number> = {
    '2026-08-14': 244_188_000,
    '2026-08-15': 1_639_548_000,
    '2026-08-16': 1_319_264_000,
  }
  for (let r = 0; r < 7; r++) {
    const row: Array<{ value: number; date: string }> = []
    for (let c = 0; c < 13; c++) {
      const d = day(r, c)
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const off = Math.round((d.getTime() - startOfWeek.getTime()) / 86400000)
      const v = (dk in realSeed) ? realSeed[dk] : ((off < 0) ? (Math.abs(off) % 5 === 0 ? 600 : 0) : (off % 4 === 0 ? 1400 : (off % 3 === 0 ? 700 : 0)))
      row.push({ value: v, date: dk })
    }
    grid.push(row)
  }
  return { heatmapGrid: grid }
}

export default defineWidget({
  id: 'heatmap',
  name: () => t('widget.heatmap.name'),
  desc: () => t('widget.heatmap.desc'),
  builtin: true,
  group: 'coding-plan',
  sizes: ['2x2', '2x4'],
  render: heatmapRender,
  configSchema: [
    { key: 'monthMode', label: () => t('config.monthMode'), type: 'mode', default: 'rolling', options: [['rolling', () => t('config.monthMode.rolling')], ['quarter', () => t('config.monthMode.quarter')]] },
    { key: 'timeZone', label: () => t('config.timeZone'), type: 'mode', default: 'Asia/Shanghai', options: [['Asia/Shanghai', () => t('config.timeZone.beijing')], ['local', () => t('config.timeZone.local')], ['UTC', 'UTC']] },
  ],
  example: { stats: previewStats },
})