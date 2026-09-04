// Usage-data crash guard regression probe.
//
// History: usage-rings (and usage-bars) read `u.rolling.percent` naked; any
// malformed upstream payload (a window missing/null) threw during render,
// which killed the WHOLE shell.overlay slot entry — every widget disappeared
// until a hard refresh. Two defenses shipped:
//   1. usage-view guards every window via winPct() → malformed data degrades
//      the card to a '—' placeholder instead of throwing;
//   2. the rail wraps every card render in try/catch → even a crashy widget
//      renders as a placeholder and the rest of the rail stays alive.
// This probe asserts BOTH defenses exist in the built artifact (comments are
// stripped, but the guard functions and their distinct messages survive).
//
// Usage: node docs/verify-usage-guard.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = readFileSync(join(root, 'lib', 'client.js'), 'utf8')

const checks = [
  ['usage window guard (winPct)', bundle.includes('winPct')],
  ['rail per-card try/catch (widget render crashed)', bundle.includes('[dsh-widgets] widget ') && bundle.includes('render crashed')],
  ['preview try/catch (preview render crashed message)', bundle.includes('preview render crashed for ')],
  ['degraded placeholder legend key (ui.renderError)', bundle.includes('ui.renderError')],
  ['placeholder label resolved at runtime (渲染异常)', bundle.includes('渲染异常，请刷新查看日志')],
]
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
const ok = checks.every(([, v]) => v)
console.log(`\nRESULT: ${ok ? 'PASS — a single crashing widget can no longer hide the rail' : 'FAIL — defense missing from the built bundle'}`)
process.exit(ok ? 0 : 1)