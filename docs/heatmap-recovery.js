/**
 * harness-widgets heatmap 数据恢复脚本（一次性，清除双计 + 回填历史）
 * ------------------------------------------------------------------
 * 背景：v1.1.1 早期迁移曾清空历史表；后续 V2.0 曾把 8/22 播种固定值，
 * 与实时逐步骤记账叠加导致 8/22 显示 145M–181M（真实仅 ~114M）；8/21
 * 曾缺 44.55M。
 *
 * 本脚本做两件事：
 *  1) 清除 8/21、8/22 的残留污染值（8/21 随后回填权威值，8/22 留给
 *     实时记账从权威会话事件重建）；
 *  2) 回填 8/14–8/21 的权威每日总量（按 usage 事件本地时间归属，守恒）。
 * 绝不覆盖用户已存在的非零历史值（除 8/21/8/22 污染清除）。
 *
 * 使用方法：浏览器打开 DSH Web（http://127.0.0.1:3080）→ DevTools →
 * Console → 粘贴执行 → 刷新。（localStorage 仅 3080 源上下文可写。）
 */
(() => {
  const KEY = 'harness-widgets.heatmap'
  const SEEN = 'harness-widgets.heatmap.seen'
  // 权威历史（过去日含 8/21；8/22 由实时记账重建，不在此播种）
  const RECOVERED = {
    '2026-08-14': 74_315_859,
    '2026-08-15': 367_790_777,
    '2026-08-16': 1_195_700_475,
    '2026-08-17': 161_488_382,
    '2026-08-18': 292_337_504,
    '2026-08-19': 352_355_694,
    '2026-08-20': 214_853_935,
    '2026-08-21': 44_552_871,
  }
  let m = {}
  try { m = JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { /* ignore */ }
  // 1) 清除被污染/重复计数的近期日（8/21、8/22），并重置去重集
  const liveDays = ['2026-08-21', '2026-08-22']
  let dropped = false
  for (const k of liveDays) {
    if ((m[k] ?? 0) > 0) { delete m[k]; dropped = true }
  }
  if (dropped) try { localStorage.setItem(SEEN, '[]') } catch { /* ignore */ }
  // 2) 回填仍缺失的过去日（8/14–8/21；用户已有值不动）
  for (const [k, v] of Object.entries(RECOVERED)) {
    if ((m[k] ?? 0) === 0) m[k] = v
  }
  localStorage.setItem(KEY, JSON.stringify(m))
  console.log('[heatmap-recovery] 完成。清除近期日双计:', dropped,
    '| 现有: ', Object.keys(m).sort().map((k) => `${k}:${(m[k] / 1e6).toFixed(1)}M`).join(' '))
  console.log('[heatmap-recovery] 请刷新页面；8/22 由实时记账按会话事件精确重建。')
})()