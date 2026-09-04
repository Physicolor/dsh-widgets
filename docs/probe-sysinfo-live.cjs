// System widgets — LIVE host route probe (run AFTER a dsh web restart).
//
// Unlike docs/verify-sysinfo.mjs (which drives the route logic through a mock
// webServer without a running service), this probe checks the RUNNING host:
//   - GET /api/sysinfo must return 200 with the SysInfo payload shape;
//   - a second sample >1s later must carry a numeric cpu.util (delta window);
//   - the served client bundle must contain the new route reference (so the
//     browser half and the host half are the same build).
//
// While the old host process is still running this FAILS with 404 — that is
// the expected "host not restarted yet" evidence. Run it whenever the system
// widgets show 「等待设备数据」 forever.
//
// Usage:
//   node docs/probe-sysinfo-live.cjs [DSH_URL]
const http = require('http')

const BASE = process.argv[2] || process.env.DSH_URL || 'http://127.0.0.1:3080'

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(BASE + path, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(new Error('timeout')) })
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const results = []
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`) }

  // 1) Bundle consistency: the browser half must reference the new route.
  try {
    const bundle = await get('/plugins/dsh-widgets/client.js')
    check('client bundle served', bundle.status === 200 && bundle.body.includes('/api/sysinfo'), `status=${bundle.status} len=${bundle.body.length}`)
  } catch (e) { check('client bundle served', false, e.message) }

  // 2) Host route: sample 1. NOTE: "first sample util is null" holds only for
  // a FRESH host (no prior request). On a live service the browser collector
  // polls every N seconds, so this probe's first request usually already has a
  // delta baseline — accept null (fresh) or numeric (busy host); the pristine
  // first-sample-null assertion lives in docs/verify-sysinfo.mjs instead.
  let s1
  try {
    const r1 = await get('/api/sysinfo')
    if (r1.status !== 200) { check('host /api/sysinfo 200', false, `status=${r1.status} (host not restarted?) body=${r1.body.slice(0, 80)}`); return finish() }
    s1 = JSON.parse(r1.body)
    check('payload shape', typeof s1.cpu === 'object' && typeof s1.mem === 'object' && 'gpu' in s1, JSON.stringify({ cpu: s1.cpu, mem: s1.mem, gpu: s1.gpu ? 'present' : null }))
    check('cpu.util sane', s1.cpu.util === null || (typeof s1.cpu.util === 'number' && s1.cpu.util >= 0 && s1.cpu.util <= 100), `util=${s1.cpu.util}`)
    if (s1.gpu) check('gpu present', typeof s1.gpu.temp === 'number' && typeof s1.gpu.memUsed === 'number', `${s1.gpu.name} ${s1.gpu.temp}C ${s1.gpu.util}% vram=${s1.gpu.memUsed}/${s1.gpu.memTotal}`)
    else check('gpu absent', true, 'no NVIDIA GPU / nvidia-smi unavailable')
  } catch (e) { check('host /api/sysinfo 200', false, e.message); return finish() }

  // 3) Second sample after the cache window: numeric utilization.
  await sleep(1100)
  try {
    const r2 = await get('/api/sysinfo')
    const s2 = r2.status === 200 ? JSON.parse(r2.body) : null
    check('delta sample numeric cpu.util', s2 !== null && typeof s2.cpu.util === 'number' && s2.cpu.util >= 0 && s2.cpu.util <= 100, s2 ? `util=${s2.cpu.util}` : `status=${r2.status}`)
  } catch (e) { check('delta sample numeric cpu.util', false, e.message) }

  finish()

  function finish() {
    const ok = results.every(Boolean)
    console.log(`\nRESULT: ${ok ? 'PASS — live host serves the system widgets' : 'FAIL — see above'}`)
    process.exit(ok ? 0 : 1)
  }
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })