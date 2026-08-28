// verify-i18n.mjs — dsh-widgets i18n self-check (self-contained, no browser).
// Simulates the official LocaleRuntime (register/bind/subscribe) and asserts:
//   1. installLocale registers both zh and en dictionaries (no naked keys);
//   2. t() follows the ACTIVE locale switch (zh -> en -> zh);
//   3. the en copy reads naturally (Widgets, System prompt, etc.);
//   4. uninstalling falls back to the built-in dictionaries.
// Run: node --experimental-strip-types docs/verify-i18n.mjs
// (needs a Node build with type stripping — Node 22.6+)

import { installLocale, t, onLocaleChange } from '../src/client/i18n.ts'

const state = { active: 'zh', dicts: {} }
const listeners = new Set()
const fake = {
  register(ns, locale, dict) {
    state.dicts[locale] = dict
    return () => { if (state.dicts[locale] === dict) delete state.dicts[locale] }
  },
  bind(ns) {
    return (key, params) => {
      const s = state.dicts[state.active]?.[key] ?? state.dicts.en?.[key] ?? ('MISSING:' + key)
      return params ? s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m)) : s
    }
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
}

let localeChanged = 0
const disposeLocaleListener = onLocaleChange(() => { localeChanged += 1 })
const dispose = installLocale(fake)
// Re-broadcast a simulated locale switch through the service's subscribe seat.
const reload = () => { for (const fn of [...listeners]) fn() }

let fail = 0
const eq = (label, got, want) => {
  if (got !== want) { fail += 1; console.log(`FAIL ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
  else console.log(`ok   ${label}: ${JSON.stringify(got)}`)
}

state.active = 'zh'
eq('capsule (zh)', t('ui.capsule'), '组件')
eq('section label (zh)', t('ui.section.label'), '组件')
eq('context water segment (zh)', t('card.contextWater.system'), '系统提示词')
eq('peak window (zh)', t('card.peak.window1'), '上午 09:00–12:00')
eq('counts value (zh)', t('card.counts.value', { turns: 7, steps: 42 }), '7轮 42步')
eq('counts name (zh)', t('widget.counts.name'), '轮次·步数')

state.active = 'en'
reload()
eq('capsule (en) — must be Widgets, not ui.capsule', t('ui.capsule'), 'Widgets')
eq('section label (en)', t('ui.section.label'), 'Widgets')
eq('market back (en)', t('market.back'), '← Back')
eq('context water system (en)', t('card.contextWater.system'), 'System prompt')
eq('context water tools (en)', t('card.contextWater.tools'), 'Tools')
eq('context water messages (en)', t('card.contextWater.messages'), 'Messages')
eq('peak window1 (en)', t('card.peak.window1'), 'Morning 09:00–12:00')
eq('peak window2 (en)', t('card.peak.window2'), 'Afternoon 14:00–18:00')
eq('counts value (en)', t('card.counts.value', { turns: 7, steps: 42 }), '7 turns · 42 steps')
eq('counts name (en)', t('widget.counts.name'), 'Turns · Steps')
eq('context water title (en)', t('card.contextWater.title'), 'Context Used')
eq('peak title (en)', t('card.peak.title'), 'Peak Pricing')
eq('total key (en)', t('usage.totalKey'), 'All Keys')
eq('task sub (en)', t('card.task.sub', { doing: 1, pending: 2 }), '1 in progress · 2 pending')
eq('settings columns option (en)', t('settings.columns.option', { n: 4 }), '4 cols')
eq('disabled 2x4 note (en)', t('market.sizeBlockedTitle'), '2×4 is not shown in a 1-column layout')

state.active = 'zh'
reload()
eq('back to zh (capsule)', t('ui.capsule'), '组件')
eq('locale-change notifications fired', localeChanged > 0, true)

dispose()
// After uninstall the built-in dictionary + the environment's own language
// decide (this box is a zh system, so fallback resolves zh). Assert the
// fallback NEVER leaks a naked key and always returns a real dictionary text.
eq('fallback: no MISSING:/naked key', t('ui.capsule').startsWith('MISSING:'), false)
eq('fallback: built-in zh or en text', ['Widgets', '组件'].includes(t('ui.capsule')), true)

disposeLocaleListener()
console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`)
process.exit(fail === 0 ? 0 : 1)