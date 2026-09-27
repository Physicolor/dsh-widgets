/**
 * dsh-widgets — the mock stats every preview surface renders from.
 *
 * Moved verbatim out of components.tsx so both preview surfaces (component
 * config + market) share one source, and so the render gate
 * (scripts/snapshot-render.mjs) can exercise every widget offline: this module
 * is pure data, with no React and no DOM.
 */

import { buildRollingGrid } from '../../lib/format'
import type { WidgetStats } from '../../lib/contract'

/** Realistic non-zero preview stats so every card renders (none return null). */
/** Raw preview usage log: derived once so BOTH the 2×2 grid and the 2×4 / bar
 *  variants share exactly the same source the real collector uses. */
const PREVIEW_RAW: Record<string, number> = (() => {
  const now = new Date()
  const raw: Record<string, number> = {}
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12 * 7)
  for (let i = 0; i < 13 * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const off = i - 12 * 7
    raw[k] = off % 5 === 0 ? (Math.pow(Math.abs(off) % 13, 2) + 4000) : (off % 3 === 0 ? (off % 11) * 800 : 0)
  }
  return raw
})()
export const PREVIEW_STATS: WidgetStats = {
  turns: 11, steps: 137,
  llmMs: 1_150_000, toolMs: 247_000,
  ttftMs: 3800, ttftSteps: 1000,
  decodeMs: 5000, decodeTokens: 600,
  usage: { inputTokens: 18_600_000, cacheReadTokens: 18_400_000, outputTokens: 75_600 },
  usageData: { usage: { rolling: { status: 'ok', percent: 42, resetsAt: '2026-08-15T07:25:56Z' }, weekly: { status: 'ok', percent: 25, resetsAt: '2026-08-17T00:00:00Z' }, monthly: { status: 'ok', percent: 8, resetsAt: '2026-09-14T11:35:13Z' } } },
  // Command Code account snapshot mock (mirrors the host-aggregated
  // `/api/commandcode-usage` payload so the family previews render fully).
  commandCode: {
    whoami: { success: true, user: { id: 'usr_demo', name: 'Physicolor', email: 'demo@example.com', userName: 'Physicolor' }, org: null },
    usage: { totalCount: 4821, totalCost: 0.467622536, averageCost: 0.0079258, successRate: 100, completedCount: 4821, failedCount: 0, totalTokensIn: 4896670, totalTokensOut: 28435, totalTokens: 4925105, totalCredits: 0.467622536, totalMonthlyCredits: 0.467622536, periodBasis: 'billing-period' },
    credits: { credits: { belowThreshold: false, creditThreshold: 0, monthlyCredits: 69.163327664, purchasedCredits: 0, freeCredits: 0 }, windowLimits: { limited: true, exceeded: null, fiveHour: { used: 0.836672336, cap: 14, exceeded: false, resetAt: 1789039577701 }, weekly: { used: 0.836672336, cap: 35, exceeded: false, resetAt: 1789626377701 } } },
    subscription: { success: true, data: { id: 'sub_demo', status: 'active', planId: 'individual-goat', priceId: 'price_demo', quantity: 1, cancelAtPeriodEnd: false, currentPeriodStart: '2026-09-10T04:42:28.000Z', currentPeriodEnd: '2026-10-10T04:42:28.000Z', endedAt: null, canceledAt: null } },
  },
  contextPercent: 0.42,
  contextWindow: 1_000_000,
  contextTokens: 446_000,
  contextBreakdown: { systemTokens: 6000, toolsTokens: 11700, messageTokens: 428_300 },
  todos: [
    { content: 'Split plan tasks', status: 'in_progress' },
    { content: 'Feed context data', status: 'completed' },
    { content: 'Write config form', status: 'completed' },
    { content: 'Polish hover animation', status: 'pending' },
    { content: 'Publish npm', status: 'pending' },
  ],
  // Grid built by the SAME path as the real 2×2 calendar (7 week-rows × 13
  // day-columns) — the old preview built it transposed (13×7), which rendered
  // the heatmap with width and height swapped.
  heatmapGrid: buildRollingGrid(PREVIEW_RAW, 13),
  heatmapRaw: PREVIEW_RAW,
  armedAction: null,
  // 对话轨迹 preview: a plausible 30-beat rhythm (inputs are instantaneous,
  // model steps 0.6–4 s, tool calls 0.2–9 s) so the lanes render in the market
  // and config previews without a live session.
  trajectory: Array.from({ length: 30 }, (_, i) => {
    const kind = (['input', 'model', 'tool', 'model', 'tool', 'model', 'input', 'model', 'tool', 'tool'] as const)[(i * 7) % 10]!
    const ms = kind === 'input' ? 0 : Math.round(kind === 'model' ? 600 + ((i * 977) % 3400) : 200 + ((i * 613) % 8800))
    return { kind, ms }
  }),
  // Machine snapshot mock for the System widget previews (values mirror a real
  // mid-load laptop so the preview looks live, not synthetic).
  sysinfo: {
    ts: 0,
    cpu: { util: 43 },
    mem: { used: 17.4 * 1024 ** 3, total: 34.2 * 1024 ** 3, percent: 51 },
    gpu: { name: 'NVIDIA GeForce RTX 5070 Ti Laptop GPU', temp: 58, util: 8, memUsed: 4815 * 1024 ** 2, memTotal: 12227 * 1024 ** 2, memPercent: 39 },
    // 30 samples @10s (~5 min) of plausible utilization drift for the
    // sparkline preview: GPU idles low with a burst, CPU wanders mid-load.
    history: (() => {
      const now = Date.now()
      const ts: number[] = []
      const cpu: Array<number | null> = []
      const gpu: Array<number | null> = []
      for (let i = 0; i < 30; i++) {
        ts.push(now - (29 - i) * 10000)
        cpu.push(Math.max(5, Math.min(85, Math.round(43 + Math.sin(i / 3) * 18 + (i % 5) * 2))))
        gpu.push(Math.max(0, Math.min(70, Math.round(i >= 20 ? 38 + Math.cos(i) * 12 : 6 + Math.sin(i / 2) * 4))))
      }
      return { ts, cpu, gpu }
    })(),
  },
}
