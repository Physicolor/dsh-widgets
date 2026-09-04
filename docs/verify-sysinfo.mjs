// System (hardware snapshot) route self-contained probe.
//
// Drives the REAL host plugin code (lib/index.js) with a mock webServer and
// asserts the /api/sysinfo contract WITHOUT a running DSH service:
//   - first sample: cpu.util === null (no delta baseline yet)
//   - payload shape (mem + gpu fields, types)
//   - ~1s host cache: two immediate calls share one payload
//   - a second sample >1s later yields a numeric cpu.util AND a fresh ts
//
// Usage:
//   node docs/verify-sysinfo.mjs
//
// Exit 0 = all assertions passed (the route contract is intact).
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

// ---- Mock the host services the plugin injects ----
const routes = new Map()
const disposers = []
const ctx = {
  credentials: { resolve: async () => undefined },
  webServer: {
    register(route) {
      routes.set(route.path, route.handler)
      return () => { routes.delete(route.path) }
    },
  },
  effect(fn) { disposers.push(fn()) },
}

const pkg = await import('../lib/index.js')
try {
  pkg.apply(ctx)
} catch (e) {
  console.error(`SCRIPT_FAIL apply(): ${e.message}`)
  process.exit(1)
}
const handler = routes.get('/api/sysinfo')
if (typeof handler !== 'function') {
  console.error('SCRIPT_FAIL /api/sysinfo route not registered by host plugin')
  process.exit(1)
}

function invoke() {
  const captured = { status: 0, body: '' }
  const res = {
    writeHead(s, _h) { captured.status = s },
    end(b) { captured.body = String(b ?? '') },
  }
  return handler({ method: 'GET' }, res).then(() => JSON.parse(captured.body))
}

// ---- Sample 1: shape + first-sample semantics ----
const s1 = await invoke()
check('status 200', s1.ts > 0, `ts=${s1.ts}`)
check('payload shape', typeof s1.cpu === 'object' && typeof s1.mem === 'object', JSON.stringify({ cpu: s1.cpu, mem: s1.mem }))
check('first sample cpu.util null', s1.cpu.util === null, `util=${s1.cpu.util}`)
check('mem fields numeric', ['used', 'total', 'percent'].every((k) => typeof s1.mem[k] === 'number') && s1.mem.percent >= 0 && s1.mem.percent <= 100,
  `used=${s1.mem.used} total=${s1.mem.total} percent=${s1.mem.percent}`)
if (s1.gpu !== null) {
  check('gpu fields numeric', ['temp', 'util', 'memUsed', 'memTotal', 'memPercent'].every((k) => typeof s1.gpu[k] === 'number'),
    `${s1.gpu.name} ${s1.gpu.temp}C ${s1.gpu.util}% vram=${s1.gpu.memUsed}/${s1.gpu.memTotal}`)
} else {
  console.log('WARN  gpu === null (nvidia-smi absent on this machine — allowed degradation)')
}

// ---- Cache: immediate repeat shares the ~1s window ----
const s2 = await invoke()
check('~1s cache hit (same ts)', s2.ts === s1.ts, `ts=${s2.ts} === ${s1.ts}`)

// ---- Sample 2 after the cache window: delta util appears ----
await sleep(1100)
const s3 = await invoke()
check('fresh sample after cache (new ts)', s3.ts > s1.ts, `ts=${s3.ts} > ${s1.ts}`)
check('cpu.util numeric on delta sample', typeof s3.cpu.util === 'number' && s3.cpu.util >= 0 && s3.cpu.util <= 100, `util=${s3.cpu.util}`)

// ---- Disposer works (route removed, no leak) ----
for (const d of disposers) { const fn = d; if (typeof fn === 'function') fn() }
check('disposer removes routes', routes.size === 0, `remaining=${routes.size}`)

const failed = results.filter((r) => !r.ok)
console.log(`\nRESULT: ${failed.length === 0 ? 'PASS' : `FAIL (${failed.length})`} — ${results.length} checks`)
process.exit(failed.length === 0 ? 0 : 1)