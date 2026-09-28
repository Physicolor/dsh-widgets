/**
 * dsh-widgets — the machine operational overview (`/api/host/overview`).
 *
 * Answers "what is this machine doing, and can work still get in and out of it":
 * network throughput, power source, the memory hogs, local service liveness, and
 * whether the proxy egress actually works.
 *
 * WHY ONE ROUTE INSTEAD OF FOUR: measured on this machine (2026-09-29), a full
 * pass costs ~1.5 s cold, and the only cheap part is TCP (0.2–1.3 ms per port).
 * A `powershell.exe` spawn ALONE costs ~270 ms of floor, so battery + processes +
 * network counters + the power scheme are collected by ONE merged script instead
 * of four. Everything else is scheduled per section:
 *
 *   - `services` — plain `node:net` TCP probes, microseconds; answered every call.
 *   - `net`       — PowerShell counters are cumulative, so throughput needs TWO
 *                   samples: the reading is a delta and therefore has its own clock.
 *   - `power` /    — one merged PowerShell snapshot, held for its TTL.
 *     `procs`
 *   - `proxy`     — an absolute-URI GET has a ~1.3 s median here, so this section
 *                   is STALE-WHILE-REVALIDATE: an expired reading is returned as-is
 *                   and refreshed in the background. The handler never awaits it.
 *
 * The route therefore never blocks on the expensive sections after the first call.
 */
import { connect } from 'node:net'
import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { HostContext } from './context'
import type { HostNetAdapter, HostOverview, HostPower, HostProcess, HostProxyHealth, HostServiceProbe } from '../client/lib/contract/types'

/** How long each section's reading is reused (ms). */
const SNAPSHOT_TTL = 20_000
const PROXY_TTL = 60_000
/** TCP probe timeout — a listening port answers in ~1 ms on loopback. */
const PROBE_TIMEOUT = 400

/** The local endpoints worth watching, in display order.
 *  A port that is simply not installed reads `down`; that is the point. */
const SERVICE_TARGETS: Array<{ key: string; label: string; host: string; port: number }> = [
  { key: 'dsh', label: 'DSH web', host: '127.0.0.1', port: 3080 },
  { key: 'ollama', label: 'Ollama', host: '127.0.0.1', port: 11434 },
  { key: 'lmstudio', label: 'LM Studio', host: '127.0.0.1', port: 1234 },
  { key: 'proxy', label: 'Proxy', host: '127.0.0.1', port: 10808 },
]

/** The proxy this machine's git/gh/web fetches already depend on. */
const PROXY = { host: '127.0.0.1', port: 10808 }
/** A 204 endpoint: tiny, cacheless, and reachable through the proxy. */
const EGRESS_URL = 'http://www.gstatic.com/generate_204'

/** The Win32 `EstimatedRunTime` sentinel meaning "on AC / unknown". */
const WIN32_RUNTIME_UNKNOWN = 71582788

/** Probe one TCP endpoint; resolves the handshake time or null. */
function probeTcp(host: string, port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const socket = connect({ host, port })
    const done = (value: number | null): void => { socket.destroy(); resolve(value) }
    socket.setTimeout(PROBE_TIMEOUT)
    socket.once('connect', () => done(Date.now() - started))
    socket.once('timeout', () => done(null))
    socket.once('error', () => done(null))
  })
}

/**
 * One merged PowerShell snapshot: battery, top processes by working set, network
 * raw counters, the active power scheme.
 *
 * HOW IT IS INVOKED MATTERS (measured 2026-09-29 on this machine): the same script
 * costs ~5.9 s passed as a multi-line `-Command` argument and **~450 ms** written
 * to a `.ps1` and run with `-File`. So the script is written once to the OS temp
 * directory and executed from there. It is ASCII-ONLY on purpose: PowerShell 5.1
 * decodes a BOM-less script file with the ANSI code page, so a non-ASCII literal
 * would be mangled; output is forced to UTF-8 instead, because process names and
 * power-scheme names are not necessarily ASCII.
 */
const PS_SCRIPT = [
  '$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  '$o = [ordered]@{ battery = $null; procs = @(); net = @(); scheme = $null }',
  'try {',
  '  $b = Get-CimInstance -ClassName Win32_Battery -ErrorAction Stop | Select-Object -First 1',
  '  if ($b -ne $null) { $o.battery = [ordered]@{ status = [int]$b.BatteryStatus; percent = [int]$b.EstimatedChargeRemaining; runtime = [int]$b.EstimatedRunTime } }',
  '} catch { }',
  'try {',
  '  $o.procs = @(Get-Process -ErrorAction Stop | Sort-Object -Property WS -Descending | Select-Object -First 8 | ForEach-Object { [ordered]@{ pid = $_.Id; name = $_.ProcessName; ws = [long]$_.WorkingSet64 } })',
  '} catch { }',
  'try {',
  '  $o.net = @(Get-CimInstance -ClassName Win32_PerfRawData_Tcpip_NetworkInterface -ErrorAction Stop | ForEach-Object { [ordered]@{ name = $_.Name; rx = [double]$_.BytesReceivedPersec; tx = [double]$_.BytesSentPersec } })',
  '} catch { }',
  'try { $o.scheme = ((powercfg /getactivescheme) -join " ").Trim() } catch { }',
  '$o | ConvertTo-Json -Depth 6 -Compress',
].join('\n')

interface PsSnapshot {
  battery: { status: number; percent: number; runtime: number } | null
  procs: Array<{ pid: number; name: string; ws: number }>
  net: Array<{ name: string; rx: number; tx: number }>
  scheme: string | null
}

/** The script file, written once per process (see the cost note above). */
let scriptPath: string | null = null
function ensureScript(): string | null {
  if (scriptPath !== null) return scriptPath
  try {
    const file = join(tmpdir(), 'dsh-widgets-overview.ps1')
    writeFileSync(file, PS_SCRIPT, 'ascii')
    scriptPath = file
    return file
  } catch { return null }
}

/** Run the merged snapshot. Resolves null when PowerShell is absent or fails. */
function readSnapshot(): Promise<PsSnapshot | null> {
  const file = ensureScript()
  if (file === null) return Promise.resolve(null)
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', file], {
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    }, (error, stdout) => {
      if (error !== null && (stdout ?? '') === '') { resolve(null); return }
      try {
        const parsed = JSON.parse(String(stdout)) as Partial<PsSnapshot>
        resolve({
          battery: parsed.battery ?? null,
          procs: Array.isArray(parsed.procs) ? parsed.procs : [],
          net: Array.isArray(parsed.net) ? parsed.net : [],
          scheme: typeof parsed.scheme === 'string' && parsed.scheme !== '' ? parsed.scheme : null,
        })
      } catch { resolve(null) }
    })
  })
}

/** Windows battery status 2 = "AC power, charging or full". */
function toPower(raw: PsSnapshot): HostPower | null {
  const battery = raw.battery
  const scheme = schemeName(raw.scheme)
  if (battery === null) {
    // No battery at all is a real answer for a desktop: report mains + the scheme
    // rather than nothing, so the card can still say which power plan is active.
    return scheme === null ? null : { onAc: true, percent: null, minutesLeft: null, scheme }
  }
  const onAc = battery.status === 2
  const runtime = battery.runtime
  return {
    onAc,
    percent: Number.isFinite(battery.percent) ? battery.percent : null,
    // The sentinel is not a duration. Printing it would read as "71582788 minutes
    // left"; it means the value is unavailable (on AC, or the battery reports none).
    minutesLeft: onAc || runtime === WIN32_RUNTIME_UNKNOWN || runtime <= 0 ? null : runtime,
    scheme,
  }
}

/**
 * `powercfg /getactivescheme` prints a LOCALIZED prefix followed by the scheme in
 * parentheses — `电源方案 GUID: …  (平衡)` / `Power Scheme GUID: … (Balanced)`.
 * Only the parenthesised name is worth showing, and the prefix must not leak into
 * the UI in the wrong language.
 */
function schemeName(raw: string | null): string | null {
  if (raw === null) return null
  const match = /\(([^()]*)\)\s*$/.exec(raw)
  const name = (match?.[1] ?? raw).trim()
  return name === '' ? null : name
}

/**
 * Build the overview sampler.
 *
 * @returns an object whose `sample()` returns the current overview, refreshing
 *          each section on its own clock (see the module comment).
 */
export function createOverviewSampler(): { sample: () => Promise<HostOverview> } {
  let snapshot: { ts: number; value: PsSnapshot | null } | null = null
  let snapshotPending = false
  /** The previous counter sample, for the throughput delta. */
  let counters: { ts: number; byName: Map<string, { rx: number; tx: number }> } | null = null
  let net: HostOverview['net'] = null
  let proxy: { ts: number; value: HostProxyHealth } | null = null
  let proxyPending = false

  /**
   * Ask for a fresh merged snapshot when the held one is stale.
   *
   * NEVER awaited by `sample()`: the first reading of a cold PowerShell session
   * costs seconds (see createPsSession), and a card must show a skeleton rather
   * than hold the request. The value appears on a later poll; until then every
   * section it feeds is `null`, which is exactly "not measured yet".
   */
  const refreshSnapshot = (now: number): void => {
    if (snapshotPending) return
    if (snapshot !== null && now - snapshot.ts <= SNAPSHOT_TTL) return
    snapshotPending = true
    void readSnapshot().then((value) => {
      snapshot = { ts: Date.now(), value }
      snapshotPending = false
      if (value !== null) foldNet(snapshot.ts, value)
    })
  }

  /** Fold fresh counters into a throughput delta (cumulative → per second). */
  const foldNet = (now: number, raw: PsSnapshot): void => {
    const byName = new Map(raw.net.map((a) => [a.name, { rx: a.rx, tx: a.tx }]))
    if (counters !== null) {
      const seconds = (now - counters.ts) / 1000
      if (seconds > 0) {
        const adapters: HostNetAdapter[] = []
        for (const [name, current] of byName) {
          const previous = counters.byName.get(name)
          if (previous === undefined) continue
          // Counters can be reset (adapter re-enumerated) — a negative delta is
          // noise, not negative traffic.
          const rxBps = Math.max(0, (current.rx - previous.rx) / seconds)
          const txBps = Math.max(0, (current.tx - previous.tx) / seconds)
          adapters.push({ name, rxBps, txBps })
        }
        adapters.sort((a, b) => (b.rxBps + b.txBps) - (a.rxBps + a.txBps))
        net = {
          adapters: adapters.slice(0, 4),
          rxBps: adapters.reduce((sum, a) => sum + a.rxBps, 0),
          txBps: adapters.reduce((sum, a) => sum + a.txBps, 0),
        }
      }
    }
    counters = { ts: now, byName }
  }

  /**
   * Absolute-URI GET through the proxy — the ONLY honest egress verdict.
   *
   * Written as a raw socket request on purpose: Node's `fetch` has no proxy
   * option, and a CONNECT probe proves nothing here (the local proxy answers
   * `200 Connection established` even for a domain that does not exist — measured
   * 2026-09-29). Sending `GET http://host/path HTTP/1.1` to the proxy is what
   * makes the proxy resolve the target and carry the bytes, so a status line
   * coming back is proof the egress worked.
   */
  const readEgress = async (tcpMs: number): Promise<HostProxyHealth> => {
    const target = new URL(EGRESS_URL)
    const started = Date.now()
    const status = await new Promise<number | string>((resolve) => {
      const socket = connect({ host: PROXY.host, port: PROXY.port })
      let buffer = ''
      const fail = (code: string): void => { socket.destroy(); resolve(code) }
      socket.setTimeout(5000)
      socket.once('connect', () => {
        socket.write([
          `GET ${EGRESS_URL} HTTP/1.1`,
          `Host: ${target.host}`,
          // `close` on both hops: a kept-alive socket makes the NEXT probe fail
          // with an instant ECONNRESET (measured), so this header is load-bearing.
          'Proxy-Connection: close',
          'Connection: close',
          'User-Agent: dsh-widgets-health',
          '', '',
        ].join('\r\n'))
      })
      socket.on('data', (chunk) => {
        buffer += chunk.toString('latin1')
        const match = /^HTTP\/1\.[01] (\d{3})/.exec(buffer)
        if (match !== null) {
          socket.destroy()
          resolve(Number(match[1]))
        }
        // A proxy refusal answers with a status line too, so the first line is
        // always enough; guard against a proxy that streams a body first.
        if (buffer.length > 8192) fail('unreadable')
      })
      socket.once('timeout', () => fail('timeout'))
      socket.once('error', (error) => fail((error as NodeJS.ErrnoException).code === 'ECONNREFUSED' ? 'port-closed' : 'unreachable'))
    })
    if (typeof status === 'string') {
      return { host: PROXY.host, port: PROXY.port, tcpMs, egressMs: null, ok: false, error: status }
    }
    return {
      host: PROXY.host,
      port: PROXY.port,
      tcpMs,
      egressMs: Date.now() - started,
      // 204 is what generate_204 answers; a redirect chain still proves egress,
      // but reporting it as healthy would hide a captive portal, so only 204/200
      // count and anything else is surfaced with its code.
      ok: status === 204 || status === 200,
      error: status === 204 || status === 200 ? null : `http:${status}`,
    }
  }

  return {
    async sample(): Promise<HostOverview> {
      const now = Date.now()
      // Cheap + always fresh.
      const services: HostServiceProbe[] = await Promise.all(SERVICE_TARGETS.map(async (target): Promise<HostServiceProbe> => {
        const ms = await probeTcp(target.host, target.port)
        return { ...target, up: ms !== null, ms }
      }))

      const raw = snapshot !== null && now - snapshot.ts <= SNAPSHOT_TTL * 3 ? snapshot.value : null
      refreshSnapshot(now)

      // Stale-while-revalidate: serve the last verdict and refresh behind the
      // request. The first call has nothing to serve — the card stays a skeleton
      // (the route reports `null`, which is exactly "not measured yet").
      const proxyTcpMs = services.find((s) => s.key === 'proxy')?.ms ?? null
      if (proxy === null || now - proxy.ts > PROXY_TTL) {
        if (!proxyPending) {
          proxyPending = true
          if (proxyTcpMs === null) {
            proxy = { ts: now, value: { host: PROXY.host, port: PROXY.port, tcpMs: null, egressMs: null, ok: false, error: 'port-closed' } }
            proxyPending = false
          } else {
            void readEgress(proxyTcpMs).then((value) => {
              proxy = { ts: Date.now(), value }
              proxyPending = false
            })
          }
        }
      }

      return {
        ts: now,
        net,
        power: raw === null ? null : toPower(raw),
        procs: raw === null ? null : raw.procs.flatMap((p): HostProcess[] =>
          typeof p.pid === 'number' && typeof p.name === 'string' ? [{ pid: p.pid, name: p.name, rss: p.ws }] : []),
        services,
        proxy: proxy?.value ?? null,
      }
    },
  }
}

/**
 * Register `/api/host/overview`.
 *
 * @param ctx - the host context whose web server owns the route.
 * @returns the route disposer.
 */
export function registerHostOverview(ctx: HostContext): () => void {
  const sampler = createOverviewSampler()
  return ctx.webServer.register({
    kind: 'exact',
    path: '/api/host/overview',
    handler: async (_req, res) => {
      try {
        const payload = await sampler.sample()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'unavailable' }))
      }
    },
  })
}
