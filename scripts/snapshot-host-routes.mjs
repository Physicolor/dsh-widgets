#!/usr/bin/env node
/**
 * G7 — the host-route contract gate.
 *
 * G4 covers the widget render outputs and G5 the stylesheet, but the HOST half had
 * no offline regression of its own: `docs/verify-sysinfo.mjs` asserts one route's
 * contract, and everything else was only ever exercised by a live service. This
 * script drives the REAL built host bundle (`lib/index.js`) with a mock webServer,
 * stubbed credentials/fetch and a throwaway `DSH_HOME`, hits every registered route
 * with fixed fixtures, and reduces each answer to a STRUCTURAL fingerprint (keys
 * kept, numbers -> 0, strings -> "s", status codes kept).
 *
 * Live values move; the shape must not. `sysinfo` is compared by its top-level keys
 * only — its deep contract (first-sample null util, the ~1 s cache, the history ring)
 * is asserted by `docs/verify-sysinfo.mjs`, and its numbers depend on the host machine.
 *
 * Usage:
 *   node scripts/snapshot-host-routes.mjs                 # compare vs the baseline
 *   node scripts/snapshot-host-routes.mjs --write         # record the baseline
 *   node scripts/snapshot-host-routes.mjs --print         # dump the fingerprint as JSON
 *   HOST_BUNDLE=.tmp-host-old.mjs node scripts/snapshot-host-routes.mjs --print
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
void require
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = join(ROOT, 'docs', 'architecture', 'baseline', 'host-routes.json')
const BUNDLE = resolve(ROOT, process.env.HOST_BUNDLE ?? 'lib/index.js')
const WRITE = process.argv.includes('--write')
const PRINT = process.argv.includes('--print')

if (!existsSync(BUNDLE)) { console.error(`[host-routes] no ${BUNDLE} — build first`); process.exit(1) }
// The state route resolves its file from DSH_HOME, so point it at a throwaway dir
// BEFORE the bundle is imported (the path is read per request, but never risk the real one).
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-widgets-host-'))

const json = (value) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(value),
  json: async () => value,
})

/** Fixed upstream answers, so the same fixture drives the same code path every run. */
function stubFetch(url) {
  const u = String(url)
  if (u === 'https://opencode.ai/zen/go/v1/usage') {
    return json({
      usage: {
        rolling: { percent: 41.5, status: 'ok', resetsAt: '2026-01-01T00:00:00.000Z' },
        weekly: { percent: 22, status: 'ok', resetsAt: '2026-01-02T00:00:00.000Z' },
        monthly: { percent: 9, status: 'ok', resetsAt: '2026-02-01T00:00:00.000Z' },
      },
    })
  }
  if (u.includes('api.commandcode.ai/alpha/whoami')) return json({ name: 'Test Account', email: 't@example.com' })
  if (u.includes('api.commandcode.ai/alpha/usage/summary')) return json({ usage: { percent: 20.2, periodStart: '2026-01-01', plan: 'pro' } })
  if (u.includes('api.commandcode.ai/alpha/billing/credits')) return json({ credits: 645, currency: 'usd' })
  if (u.includes('api.commandcode.ai/alpha/billing/subscriptions')) return json({ subscriptions: [{ id: 's1', status: 'active' }] })
  if (u === 'https://api.github.com/graphql') {
    return json({
      data: {
        user: {
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 3,
              weeks: [
                { contributionDays: [{ date: '2026-01-01', contributionCount: 1, contributionLevel: 'FIRST_QUARTILE' }] },
                { contributionDays: [{ date: '2026-01-02', contributionCount: 2, contributionLevel: 'THIRD_QUARTILE' }] },
              ],
            },
          },
        },
      },
    })
  }
  if (u === 'https://api.github.com/user') return json({ login: 'testuser' })
  if (u.startsWith('https://api.github.com/user/repos')) return json([{ full_name: 'acme/widgets' }, { full_name: 'acme/tools' }])
  if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/issues/.test(u)) {
    return json([{ number: 7, title: 'broken', comments: 0, updated_at: '2026-01-03T00:00:00Z' }, { number: 8, title: 'pull', comments: 1, pull_request: {}, updated_at: '2026-01-04T00:00:00Z' }])
  }
  if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/releases\/latest$/.test(u)) {
    return json({ tag_name: 'v1.0.0', name: 'First', published_at: '2026-01-05T00:00:00Z' })
  }
  if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+$/.test(u)) {
    return json({ full_name: 'acme/widgets', stargazers_count: 12, forks_count: 3, pushed_at: '2026-01-06T00:00:00Z' })
  }
  if (u.startsWith('https://api.github.com/search/issues')) return json({ total_count: 2 })
  return { ok: false, status: 404, text: async () => '{"error":"unmocked"}', json: async () => ({ error: 'unmocked' }) }
}

globalThis.fetch = async (url) => {
  const res = stubFetch(url)
  if (typeof url === 'object' && url !== null && 'signal' in url) { /* AbortSignal: the stub answers instantly */ }
  return res
}

// ---- Mock the host services the plugin injects ----
const routes = new Map()
const disposers = []
const ctx = {
  credentials: { resolve: async (ref) => ({ value: `test-key-${ref}`, source: 'fixture' }) },
  webServer: {
    register(route) {
      routes.set(route.path, route.handler)
      return () => { routes.delete(route.path) }
    },
  },
  get(name) {
    if (name !== 'usageCenter') return undefined
    return {
      getActivity(provider) {
        return { activity: provider === undefined
          ? [{ date: '2026-01-01', totalTokens: 1000 }, { date: '2026-01-02', totalTokens: 2000 }]
          : [{ date: '2026-01-02', totalTokens: 500 }] }
      },
      refresh: async () => ({ ok: true }),
    }
  },
  effect(fn) { disposers.push(fn()) },
}

const pkg = await import(pathToFileURL(BUNDLE).href)
try { pkg.apply(ctx) } catch (error) {
  console.error(`[host-routes] apply() threw: ${error.message}`)
  process.exit(1)
}

function invoke(handler, req) {
  const captured = { status: 0, body: '' }
  const res = { writeHead(s) { captured.status = s }, end(b) { captured.body = String(b ?? '') } }
  return Promise.resolve(handler(req, res)).then(() => captured)
}

const putBody = (value) => ({
  method: 'PUT',
  url: '/api/widgets-state',
  async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(value), 'utf8') },
})

const CASES = [
  ['/api/opencode-usage', { method: 'GET', url: '/api/opencode-usage' }],
  ['/api/opencode-usage-multi', { method: 'GET', url: '/api/opencode-usage-multi' }],
  ['/api/commandcode-usage', { method: 'GET', url: '/api/commandcode-usage' }],
  ['/api/widgets-usage-daily', { method: 'GET', url: '/api/widgets-usage-daily' }],
  ['/api/widgets-usage-daily?provider=commandcode', { method: 'GET', url: '/api/widgets-usage-daily?provider=commandcode' }],
  ['/api/widgets-usage-daily?refresh=1', { method: 'GET', url: '/api/widgets-usage-daily?provider=commandcode&refresh=1' }],
  ['/api/github (empty request)', { method: 'GET', url: '/api/github' }],
  ['/api/github?user=acme&repos=acme/widgets', { method: 'GET', url: '/api/github?user=acme&repos=acme/widgets' }],
  ['/api/widgets-state GET (fresh dir)', { method: 'GET', url: '/api/widgets-state' }],
  ['/api/widgets-state PUT', putBody({ savedAt: 1, state: { railOpen: true, order: ['sys-cpu@1x1'] } })],
  ['/api/widgets-state GET (after PUT)', { method: 'GET', url: '/api/widgets-state' }],
  ['/api/widgets-state DELETE (405)', { method: 'DELETE', url: '/api/widgets-state' }],
  ['/api/sysinfo (first sample)', { method: 'GET', url: '/api/sysinfo' }],
  ['/api/sysinfo (cache hit)', { method: 'GET', url: '/api/sysinfo' }],
]

/** Keys kept, numbers -> 0, strings -> "s". Arrays keep the shape of their first item. */
function fingerprint(value) {
  if (value === null) return null
  if (typeof value === 'number') return 0
  if (typeof value === 'string') return 's'
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.length === 0 ? [] : [fingerprint(value[0])]
  if (typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = fingerprint(value[key])
    return out
  }
  return typeof value
}

const snapshot = {}
// A new route must not be able to land without gate coverage.
const covered = new Set(CASES.map(([, req]) => String(req.url).split('?')[0]))
const uncovered = [...routes.keys()].filter((path) => !covered.has(path))
if (uncovered.length > 0) {
  console.error(`[host-routes] FAIL — registered route(s) with no case: ${uncovered.join(', ')}`)
  process.exit(1)
}
for (const [name, req] of CASES) {
  const path = String(req.url).split('?')[0]
  const handler = routes.get(path)
  if (typeof handler !== 'function') {
    snapshot[name] = { error: `no route registered for ${path}` }
    continue
  }
  const captured = await invoke(handler, req)
  let parsed
  try { parsed = JSON.parse(captured.body) } catch { parsed = captured.body.slice(0, 200) }
  // sysinfo is machine-dependent: compare its TOP-LEVEL keys only.
  const shape = path === '/api/sysinfo' ? { keys: Object.keys(parsed ?? {}).sort() } : fingerprint(parsed)
  snapshot[name] = { status: captured.status, shape }
}

const sorted = {}
for (const key of Object.keys(snapshot)) sorted[key] = snapshot[key]

if (PRINT) {
  console.log(JSON.stringify(sorted, null, 1))
  process.exit(0)
}

for (const [name, entry] of Object.entries(sorted)) console.log(`${String(entry.status ?? '-').padStart(3)}  ${name}`)

if (WRITE || !existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true })
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 1)}\n`, 'utf8')
  console.log(`[host-routes] wrote baseline -> ${BASELINE} (${Object.keys(sorted).length} case(s))`)
  process.exit(0)
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
let bad = 0
for (const [name, entry] of Object.entries(sorted)) {
  const a = JSON.stringify(base[name] ?? null)
  const b = JSON.stringify(entry)
  if (a !== b) {
    bad += 1
    console.log(`\nCHANGED ${name}\n  baseline ${a.slice(0, 500)}\n  current  ${b.slice(0, 500)}`)
  }
}
for (const name of Object.keys(base)) if (sorted[name] === undefined) { bad += 1; console.log(`REMOVED ${name}`) }
console.log(bad === 0
  ? `[host-routes] PASS — ${Object.keys(sorted).length} route case(s) keep their status and shape`
  : `[host-routes] FAIL — ${bad} case(s) differ`)
process.exit(bad === 0 ? 0 : 1)
