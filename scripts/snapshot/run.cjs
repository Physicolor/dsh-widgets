/**
 * G4 runner — executes the compiled render harness under a FROZEN clock.
 *
 * Determinism matters: several widget renders read the current time (peak
 * pricing windows, the heatmap calendar, the preview sparkline), so the clock is
 * pinned to one instant and the time zone to Asia/Shanghai. Without this the
 * snapshot would differ between runs for reasons unrelated to the refactor.
 *
 * Emits `{ zh: [...], en: [...] }` on stdout: each entry is the render output in
 * that dictionary, so an i18n-related move is caught too.
 */
'use strict'

process.env.TZ = process.env.TZ || 'Asia/Shanghai'

const RealDate = Date
const FIXED = RealDate.UTC(2026, 8, 24, 12, 0, 0) // 2026-09-24T12:00:00Z
class FrozenDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(FIXED)
    else super(...args)
  }
  static now() { return FIXED }
}
FrozenDate.UTC = RealDate.UTC
FrozenDate.parse = RealDate.parse
globalThis.Date = FrozenDate

/** Deterministic locale: `t()` falls back to reading localStorage when the
 *  official locale service is absent (see i18n.ts detectLocale). */
let locale = 'zh'
globalThis.localStorage = {
  getItem: (k) => (k === 'dsh-language' ? locale : null),
  setItem: () => {},
  removeItem: () => {},
}

const { snapshot } = require('../../.tmp-snapshot/scripts/snapshot/render-harness.js')

locale = 'zh'
const zh = snapshot()
const zhAgain = snapshot()
if (JSON.stringify(zh) !== JSON.stringify(zhAgain)) {
  console.error('[snapshot-run] FATAL: the snapshot is not deterministic across two in-process runs')
  for (let i = 0; i < Math.max(zh.length, zhAgain.length); i++) {
    const a = JSON.stringify(zh[i])
    const b = JSON.stringify(zhAgain[i])
    if (a !== b) { console.error(`  first difference at index ${i}:\n    ${a}\n    ${b}`); break }
  }
  process.exit(2)
}

locale = 'en'
const en = snapshot()

process.stdout.write(JSON.stringify({ zh, en }))
