// Discovery end-to-end probe (ARCH-001 parallel-creation verification).
//
// Fetch the LIVE plugin client bundle as the browser would
// (http://127.0.0.1:3080/plugins/dsh-widgets/client.js — served from disk by
// the plugin static server, so a rebuilt lib/client.js is picked up without a
// host restart) and assert which widget-unit ids the DISCOVERY produced.
//
// Usage:
//   node docs/verify-discovery.cjs                     # all 19 built-ins present
//   node docs/verify-discovery.cjs test-a test-b       # + test ids present
//   node docs/verify-discovery.cjs --absent test-a     # test ids absent (post-cleanup)
const http = require('http')

const BASE = process.env.DSH_URL || 'http://127.0.0.1:3080'
const BUILTINS = ['counts', 'llm', 'tool', 'ttft', 'tps', 'cache', 'tokens', 'context', 'context-water', 'task', 'quote', 'heatmap', 'heatmap-bars', 'usage-bars', 'usage-rings', 'usage-rolling', 'usage-weekly', 'usage-monthly', 'peak-pricing']

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(new Error('timeout')) })
  })
}

;(async () => {
  const argv = process.argv.slice(2)
  const absentIdx = argv.indexOf('--absent')
  const absent = absentIdx >= 0 ? argv.slice(absentIdx + 1) : []
  const extra = absentIdx >= 0 ? argv.slice(0, absentIdx) : argv
  const must = BUILTINS.concat(extra.filter((x) => !BUILTINS.includes(x)))

  let res
  try {
    res = await get(`${BASE}/plugins/dsh-widgets/client.js`)
  } catch (e) {
    console.error(`PROBE_FAIL ${BASE}: ${e.message}`)
    process.exit(1)
  }
  if (res.status !== 200) { console.error(`PROBE_FAIL status=${res.status}`); process.exit(1) }
  const body = res.body
  const missing = must.filter((id) => !body.includes(`'${id}'`) && !body.includes(`"${id}"`))
  const leaked = absent.filter((id) => body.includes(`'${id}'`) || body.includes(`"${id}"`))
  console.log(`bundle: ${body.length} bytes @ ${BASE}`)
  if (missing.length) console.error(`MISSING ids: ${missing.join(', ')}`)
  if (leaked.length) console.error(`SHOULD-BE-ABSENT ids: ${leaked.join(', ')}`)
  const ok = missing.length === 0 && leaked.length === 0
  console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('SCRIPT_FAIL', e); process.exit(1) })