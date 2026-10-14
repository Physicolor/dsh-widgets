/**
 * The hardware family's data sources: the machine snapshot
 * (`manifest.source: 'sys'`, `/api/sysinfo`) and the operational overview the
 * device cards read (`/api/host/overview` — throughput, power, processes, local
 * services, proxy egress).
 *
 * Moved out of `data/collector.tsx` (v1.11 adapter contract). Both routes ride
 * ONE cadence because they describe the same subject: the machine. The overview
 * answers from per-section caches after its first pass, so the second request is
 * a few milliseconds once warm.
 */
import { defineSource, type SourceEffect, type SourceTick } from '../../data/source-contract'
import { ingestSysInfo, resolveInterval } from './data'
import type { HostOverview, SysInfo } from '../../lib/contract/types'

/** The overview route's answer, or null when its body could not be parsed. */
function asOverview(payload: unknown): HostOverview | null {
  return payload !== null && typeof payload === 'object' ? payload as HostOverview : null
}

export const sysSource = defineSource({
  id: 'sys',
  host: 'host/sysinfo.ts + host/overview.ts',
  schedule: {
    mount: true,
    /**
     * The INSTALLED sys-* instances drive one shared poll: the effective cadence
     * is the SHORTEST refresh interval among them (5/10/30/60 s presets plus a
     * custom number, clamped 5..60, default 10). The host route caches ~1 s, so
     * every card sharing a tick still triggers a single `nvidia-smi` spawn.
     */
    pollMs: (tick: SourceTick) => {
      if (tick.instances.length === 0) return null
      const secs = Math.min(...tick.instances.map((key) => resolveInterval(tick.config(key))))
      return secs > 0 ? secs * 1000 : null
    },
  },
  pulls: () => [
    {
      url: '/api/sysinfo',
      apply(answer): SourceEffect | null {
        // Pre-contract behaviour: an unreadable answer keeps the last snapshot
        // (and, on a first load, the skeleton).
        if (!answer.ok || answer.payload === null || typeof answer.payload !== 'object') return null
        const data = answer.payload as SysInfo
        // The client-side history ring (see families/sys/data.ts) folds every
        // sample it sees, so the line card keeps its own ~20 min trace even when
        // the poll cadence changes.
        ingestSysInfo(data)
        return { patch: { sysinfo: data }, resolved: true }
      },
    },
    {
      url: '/api/host/overview',
      apply(answer): SourceEffect | null {
        // A transport failure (status 0) keeps the last overview: a blip must not
        // blank a card that was already showing a figure.
        if (answer.status === 0) return null
        if (!answer.ok) {
          return { patch: { hostError: answer.status === 404 ? 'unloaded' : `http:${answer.status}` }, resolved: true }
        }
        const data = asOverview(answer.payload)
        if (data === null) return { patch: { hostError: 'unavailable' }, resolved: true }
        return { patch: { host: data, hostError: null }, resolved: true }
      },
    },
  ],
})

export default sysSource
