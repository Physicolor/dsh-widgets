/**
 * dsh-widgets — the machine hardware snapshot channel.
 *
 * `/api/sysinfo`: CPU utilization (delta against the previous request — the poll
 * window IS the averaging window), memory totals, and the NVIDIA GPU via
 * `nvidia-smi`, with a ~1 s cache and a ring buffer for the sparklines. Split out
 * of `src/index.ts` (Phase H5) unchanged.
 */
import { cpus, freemem, totalmem } from 'node:os'
import { execFileP } from './exec'
import { createMachineSampler } from './machine'
import { type HostContext } from './context'

  // Machine-local hardware snapshot (System widgets): CPU utilization (delta
  // against the PREVIOUS request — the poll window is the averaging window),
  // memory totals, and the NVIDIA GPU via `nvidia-smi` (temp / util / VRAM).
  // The host caches ~1s so several widgets polling at the same instant share
  // one `nvidia-smi` spawn instead of fanning out. CPU temperature stays
  // deliberately ABSENT: Windows exposes no reliable, privilege-free CPU
  // temperature source (see dsh-widgets changelog — researched, abandoned).
export function registerSysinfo(ctx: HostContext): () => void {
    let lastCpu: { idle: number; total: number } | null = null
    let cache: { ts: number; payload: unknown } | null = null
    /** Utilization sample history for the sparklines (newest last). */
    const history: Array<{ t: number; cpu: number | null; gpu: number | null }> = []
    const HISTORY_CAP = 120
    // Disk / session-log / own-process readings: their own TTLs live in the
    // sampler, so this route can be hit every 5 s without re-walking the session
    // directory (see host/machine.ts).
    const machine = createMachineSampler()
    return ctx.webServer.register({
      kind: 'exact',
      path: '/api/sysinfo',
      handler: async (_req, res) => {
        const now = Date.now()
        if (cache !== null && now - cache.ts < 1000) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(cache.payload))
          return
        }
        // CPU utilization: accumulate idle/user/sys over ALL logical cores and
        // diff against the previous request's totals (the poll cadence IS the
        // averaging window). First sample has no baseline → null.
        let idle = 0
        let total = 0
        for (const c of cpus()) {
          idle += c.times.idle
          total += c.times.idle + c.times.user + c.times.nice + c.times.sys + c.times.irq
        }
        let util: number | null = null
        if (lastCpu !== null) {
          const dTotal = total - lastCpu.total
          const dIdle = idle - lastCpu.idle
          if (dTotal > 0) util = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 1000) / 10))
        }
        lastCpu = { idle, total }
        const totalBytes = totalmem()
        const freeBytes = freemem()
        // NVIDIA GPU: single query call; absent/failing driver → gpu: null (the
        // browser cards then degrade to CPU/memory only, never crash).
        let gpu: { name: string; temp: number; util: number; memUsed: number; memTotal: number; memPercent: number } | null = null
        try {
          const out = (await execFileP('nvidia-smi', [
            '--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total',
            '--format=csv,noheader,nounits',
          ], { timeout: 3000, windowsHide: true })) as { stdout: string }
          const stdout = out.stdout
          const line = String(stdout).split(/\r?\n/).map((l: string) => l.trim()).find((l: string) => l.length > 0)
          if (line !== undefined) {
            const parts = line.split(',').map((s: string) => s.trim())
            const memUsed = Number(parts[3])
            const memTotal = Number(parts[4])
            gpu = {
              name: parts[0] ?? '',
              temp: Number(parts[1]),
              util: Number(parts[2]),
              memUsed,
              memTotal,
              memPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0,
            }
          }
        } catch { gpu = null }
        const memUsed = totalBytes - freeBytes
        history.push({ t: now, cpu: util, gpu: gpu?.util ?? null })
        if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP)
        const payload = {
          ts: now,
          cpu: { util },
          mem: {
            used: memUsed,
            total: totalBytes,
            percent: totalBytes > 0 ? Math.round((memUsed / totalBytes) * 1000) / 10 : 0,
          },
          gpu,
          history: {
            ts: history.map((h) => h.t),
            cpu: history.map((h) => h.cpu),
            gpu: history.map((h) => h.gpu),
          },
          // Disk / session-log / own-process. Cheap on a cache hit (see
          // host/machine.ts): the drive probe is ~2 ms and the directory walk is
          // held for a minute, so riding the hardware poll costs nothing.
          machine: await machine.sample(),
        }
        cache = { ts: now, payload }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(payload))
      },
    })
}
