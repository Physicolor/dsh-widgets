/**
 * Independent arbitration: recompute total token usage straight from the raw
 * session logs, using NEITHER plugin's code.
 *
 * Why this exists: two surfaces disagree about "total tokens".
 *   A) dsh-widgets  「Token 用量」heatmap card  — self-accounted localStorage log
 *      (per-step crediting while the page is open + a frozen seed table).
 *   B) dsh-usage-center 「总 Token」              — per-request records folded from
 *      the session logs.
 * A third, independent fold of the SAME raw logs decides which one is right.
 *
 * Method (mirrors the harness's own accounting, nothing else):
 *   - decode every `sessions/<ws>/<sessionId>/session.jsonl.zstd` (multi-frame
 *     zstd, so it streams through zlib's Zstd decoder rather than the sync API,
 *     which only returns the first frame);
 *   - per (session, turn, step), the LAST usage sample wins — a step's later
 *     usage report replaces its earlier one;
 *   - tokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
 *   - the day comes from the usage event's own `time` (UTC ms) rendered in the
 *     machine's local timezone, which is what both plugins display in.
 *
 * Usage: node docs/verify-token-total-independent.mjs [sessionsRoot] [outJson]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zstdDecompressSync } from 'node:zlib'

const ROOT = process.argv[2] ?? 'D:/dsh-home/sessions'
/** Default output sits next to this script, so the repo can be moved/renamed freely. */
const OUT = process.argv[3] ?? fileURLToPath(new URL('./verify-token-total-independent.json', import.meta.url))

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/**
 * Decode a session log.
 *
 * The log is NOT one zstd stream: it is a concatenation of independently
 * compressed frames (one per append), and a plain streaming decoder trips over
 * the seam ("Unknown frame descriptor"). So scan for frame magics, decode each
 * span, and — when a magic inside compressed payload data is a false positive —
 * widen the span until it decodes. `zstdDecompressSync` returns only the first
 * frame, hence the per-frame loop.
 * @param path - the `.zstd` log path.
 * @returns the decoded JSONL text.
 */
function decodeLog(path) {
  const buf = readFileSync(path)
  const starts = []
  let at = buf.indexOf(ZSTD_MAGIC, 0)
  while (at >= 0) {
    starts.push(at)
    at = buf.indexOf(ZSTD_MAGIC, at + 4)
  }
  if (starts.length === 0) return ''
  const parts = []
  for (let k = 0; k < starts.length; k++) {
    let end = k + 1 < starts.length ? starts[k + 1] : buf.length
    for (;;) {
      try {
        parts.push(zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8'))
        break
      } catch {
        // False-positive magic (or a truncated tail): widen to the next magic.
        if (k + 1 < starts.length) {
          k += 1
          end = k + 1 < starts.length ? starts[k + 1] : buf.length
        } else {
          break
        }
      }
    }
  }
  return parts.join('')
}

/** Every `.zstd` session log under the sessions root. */
function findLogs(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findLogs(full))
    else if (entry.name.endsWith('.zstd')) found.push(full)
  }
  return found
}

const dayKey = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const asObj = (v) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v : null)
const num = (o, k) => (o !== null && typeof o[k] === 'number' && Number.isFinite(o[k]) ? o[k] : null)

/** Read the four disjoint buckets from a usage payload, or null when unusable. */
function readTokens(source) {
  const r = asObj(source)
  if (r === null) return null
  const input = num(r, 'inputTokens')
  const output = num(r, 'outputTokens')
  if (input === null || output === null) return null
  return {
    input,
    output,
    cacheRead: num(r, 'cacheReadTokens') ?? 0,
    cacheWrite: num(r, 'cacheWriteTokens') ?? 0,
  }
}

const perDay = new Map()
const perSession = new Map()
const perRoute = new Map()
let steps = 0
let grand = 0
let sessionHeaderSeen = 0

/** Fold one decoded log line by line. */
function foldLog(path, sessionId) {
  // Per (turn, step) the last usage sample wins, so the whole step table lives
  // here and is summed once at the end of the file.
  const samples = new Map()
  let sessionTotal = 0
  const text = decodeLog(path)
  let route = null
  for (const line of text.split('\n')) {
    if (line === '' || line.charCodeAt(0) !== 123 /* '{' */) continue
    let ev
    try {
      ev = JSON.parse(line)
    } catch {
      continue
    }
    const type = ev.type
    const data = asObj(ev.data)
    if (type === 'session') {
      sessionHeaderSeen += 1
      continue
    }
    if (data === null) continue
    if (type === 'request/header') {
      const header = asObj(data.header)
      const config = header === null ? null : asObj(header.config)
      if (config !== null) route = `${config.provider ?? '?'}/${config.model ?? '?'}`
      continue
    }
    if (type === 'request/context') {
      const provider = typeof data.provider === 'string' ? data.provider : null
      const model = typeof data.model === 'string' ? data.model : null
      if (provider !== null || model !== null) route = `${provider ?? route?.split('/')[0] ?? '?'}/${model ?? route?.split('/')[1] ?? '?'}`
      continue
    }
    if (type !== 'assistant/chunk' && type !== 'assistant/message') continue
    const turn = num(data, 'turn')
    const step = num(data, 'step')
    if (turn === null || step === null) continue
    let tokens = null
    let at = null
    if (type === 'assistant/chunk') {
      const chunk = asObj(data.chunk)
      if (chunk === null || chunk.type !== 'usage') continue
      tokens = readTokens(chunk.usage)
      at = typeof ev.time === 'number' ? ev.time : null
    } else {
      tokens = readTokens(data.usage)
      at = typeof ev.time === 'number' ? ev.time : null
    }
    if (tokens === null) continue
    const key = `${turn}\u0000${step}`
    const prev = samples.get(key)
    samples.set(key, { tokens, at: at ?? prev?.at ?? null, route: prev?.route ?? route })
  }
  for (const sample of samples.values()) {
    const t = sample.tokens.input + sample.tokens.output + sample.tokens.cacheRead + sample.tokens.cacheWrite
    if (t <= 0) continue
    steps += 1
    sessionTotal += t
    grand += t
    if (sample.at !== null) {
      const k = dayKey(sample.at)
      perDay.set(k, (perDay.get(k) ?? 0) + t)
    }
    const routeKey = sample.route ?? 'unknown'
    perRoute.set(routeKey, (perRoute.get(routeKey) ?? 0) + t)
  }
  perSession.set(sessionId, sessionTotal)
}

const logs = findLogs(ROOT)
process.stderr.write(`scanning ${logs.length} session logs under ${ROOT}\n`)
let done = 0
for (const log of logs) {
  const dir = log.slice(0, log.lastIndexOf(/[\\/]/.test(log) ? log.lastIndexOf(log.includes('\\') ? '\\' : '/') : log.length))
  const sessionId = dir.slice(dir.replace(/\\/g, '/').lastIndexOf('/') + 1)
  try {
    foldLog(log, sessionId)
  } catch (err) {
    process.stderr.write(`FAILED ${log}: ${err.message}\n`)
  }
  done += 1
  if (done % 25 === 0) process.stderr.write(`  ${done}/${logs.length}\n`)
}

const days = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
const report = {
  generatedAt: new Date().toISOString(),
  sessionsRoot: ROOT,
  logsScanned: logs.length,
  sessionHeaders: sessionHeaderSeen,
  steps: steps,
  totalTokens: grand,
  perDay: Object.fromEntries(days),
  perRoute: Object.fromEntries([...perRoute.entries()].sort((a, b) => b[1] - a[1])),
  topSessions: [...perSession.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
}
writeFileSync(OUT, JSON.stringify(report, null, 2))
process.stderr.write(`\nINDEPENDENT TOTAL: ${grand}  (steps=${steps}, sessions=${perSession.size})\n`)
process.stderr.write(`written: ${OUT}\n`)
