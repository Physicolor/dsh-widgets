/**
 * dsh-widgets — the machine / self-check sampler.
 *
 * `/api/sysinfo`'s hardware half answers "how busy is this box". This module
 * answers the OTHER operational question a long-running harness actually fails
 * on: **is the disk filling up, and is the harness itself the reason**. It folds
 * three cheap local readings:
 *
 *   - every mounted FIXED drive's total/free space (`fs.statfs`, probed by drive
 *     letter — no `Get-PSDrive` spawn, ~1 ms for all 26);
 *   - the DSH home's session-log footprint (file count, bytes, and how many were
 *     written in the last hour — the growth signal);
 *   - the `dsh web` host process's own RSS / CPU / uptime.
 *
 * CADENCE: the hardware half changes every poll (5–60 s) while these move on the
 * scale of minutes, so each reading is cached with its own TTL — a card polling
 * at 5 s does not walk the session directory 12 times a minute. That is why this
 * is a sampler object with internal clocks rather than a stateless function.
 */
import { readdir, stat, statfs } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { MachineInfo } from '../client/lib/contract/types'

/** How long each reading is reused before it is measured again (ms). */
const DISK_TTL = 30_000
const HOME_TTL = 60_000

/** A drive letter that exists, with its capacity. */
async function probeDrives(): Promise<MachineInfo['disks']> {
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const found: MachineInfo['disks'] = []
  for (const letter of letters) {
    const mount = `${letter}:\\`
    try {
      const s = await statfs(mount)
      const total = Number(s.blocks) * Number(s.bsize)
      const free = Number(s.bavail) * Number(s.bsize)
      if (total > 0) found.push({ mount: `${letter}:`, total, free })
    } catch { /* no such drive, or not mounted: skip silently */ }
  }
  if (found.length > 0) return found
  // Non-Windows fallback: the single root filesystem.
  try {
    const s = await statfs('/')
    return [{ mount: '/', total: Number(s.blocks) * Number(s.bsize), free: Number(s.bavail) * Number(s.bsize) }]
  } catch { return [] }
}

/** The DSH home's session-log footprint, walked once per HOME_TTL. */
async function probeHome(home: string): Promise<MachineInfo['home']> {
  const sessions = join(home, 'sessions')
  const cutoff = Date.now() - 3600_000
  try {
    const entries = await readdir(sessions, { recursive: true, withFileTypes: true })
    let files = 0
    let bytes = 0
    let recent = 0
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const full = join(entry.parentPath ?? sessions, entry.name)
      try {
        const s = await stat(full)
        files += 1
        bytes += s.size
        if (s.mtimeMs >= cutoff) recent += 1
      } catch { /* raced with a rotation: the file simply does not count */ }
    }
    return { sessionsFiles: files, sessionsBytes: bytes, recentFiles: recent }
  } catch { return null }
}

/**
 * Build the sampler.
 *
 * @returns an object whose `sample()` returns the current machine reading,
 *          reusing each cached half until its TTL expires.
 */
export function createMachineSampler(): { sample: () => Promise<MachineInfo> } {
  // The launcher exports DSH_HOME before starting `dsh web`; the `~/.dsh`
  // fallback keeps a differently-launched host from silently measuring nothing.
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  let diskCache: { ts: number; value: MachineInfo['disks'] } | null = null
  let homeCache: { ts: number; value: MachineInfo['home'] } | null = null
  let cpuBase: { at: number; cpu: NodeJS.CpuUsage } | null = null
  let lastCpuPercent: number | null = null

  return {
    async sample(): Promise<MachineInfo> {
      const now = Date.now()
      if (diskCache === null || now - diskCache.ts > DISK_TTL) {
        diskCache = { ts: now, value: await probeDrives() }
      }
      if (homeCache === null || now - homeCache.ts > HOME_TTL) {
        homeCache = { ts: now, value: await probeHome(home) }
      }
      // CPU percent of THIS process, averaged over the window between samples —
      // the same delta discipline the hardware half uses for CPU utilization.
      const cpu = process.cpuUsage()
      if (cpuBase !== null) {
        const elapsedUs = (now - cpuBase.at) * 1000
        const usedUs = (cpu.user - cpuBase.cpu.user) + (cpu.system - cpuBase.cpu.system)
        if (elapsedUs > 0) lastCpuPercent = Math.max(0, Math.round((usedUs / elapsedUs) * 1000) / 10)
      }
      cpuBase = { at: now, cpu }
      const mem = process.memoryUsage()
      return {
        ts: now,
        disks: diskCache.value,
        home: homeCache.value,
        proc: {
          pid: process.pid,
          rss: mem.rss,
          cpuPercent: lastCpuPercent,
          uptimeSec: Math.round(process.uptime()),
        },
      }
    },
  }
}
