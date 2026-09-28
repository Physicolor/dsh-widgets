/**
 * dsh-widgets — the price table channel (`/api/widgets-pricing`).
 *
 * `dsh-usage-center` owns the price table and its design rule is explicit: **no
 * rates ship in a package**. The table lives in storage
 * (`$DSH_HOME/storages/usage-center/pricing.json`) so that changing a price never
 * requires a release, and so that no plugin ever ships a number it has not been
 * told. This route is therefore a READER, not an authority: it serves the file's
 * own rules — provider scope, effective window, peak windows, provenance — and
 * lets the card decide what may be printed.
 *
 * Two consequences are deliberate:
 *   - a missing or unparseable file answers `available: false`. It never falls
 *     back to a built-in table, because that table would be a price this plugin
 *     invented;
 *   - the provenance fields (`sourceType` / `verifiedAt` / `source`) travel with
 *     every rule, so a card can say WHERE a number came from instead of printing
 *     a bare amount that looks like a bill.
 *
 * Cached by mtime: the file is ~10 KB and is rewritten whole, so a stat per
 * request is the cheapest correct invalidation.
 */
import { readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { HostContext } from './context'
import type { PriceRule, PriceTable } from '../client/lib/contract/types'

/** How long a parse is reused when the file's mtime has not moved (ms). */
const PRICING_TTL = 60_000

/** A finite non-negative number, else `fallback`. */
function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}
/** A non-empty string, else null. */
function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** One four-bucket rate set. Missing buckets read 0 (`cacheWrite` is genuinely 0
 *  on providers that do not bill it) — never `undefined`, so a card can multiply
 *  without a null check per bucket. */
function rates(value: unknown): PriceRule['rates'] {
  const r = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return {
    inputCacheHit: num(r.inputCacheHit),
    inputCacheMiss: num(r.inputCacheMiss),
    output: num(r.output),
    cacheWrite: num(r.cacheWrite),
  }
}

/** Normalize one rule. A rule without a rate set at all is dropped by the caller. */
function normalizeRule(value: unknown): PriceRule | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  const id = str(r.id)
  const source = r.rates
  if (id === null || typeof source !== 'object' || source === null) return null
  const windows = Array.isArray(r.peakWindows)
    ? r.peakWindows.flatMap((raw): PriceRule['peakWindows'] => {
        if (typeof raw !== 'object' || raw === null) return []
        const w = raw as Record<string, unknown>
        const start = str(w.start)
        const end = str(w.end)
        if (start === null || end === null) return []
        const days = Array.isArray(w.days) ? w.days.filter((d): d is number => typeof d === 'number') : []
        return [{ days, start, end }]
      })
    : []
  return {
    id,
    provider: str(r.provider),
    model: str(r.model),
    effectiveFrom: str(r.effectiveFrom),
    effectiveTo: str(r.effectiveTo),
    timezone: str(r.timezone),
    peakWindows: windows,
    rates: rates(source),
    peakRates: typeof r.peakRates === 'object' && r.peakRates !== null ? rates(r.peakRates) : null,
    currency: str(r.currency),
    sourceType: str(r.sourceType),
    verifiedAt: str(r.verifiedAt),
    source: str(r.source),
  }
}

/** Resolve the table path the same way usage-center does. */
function tablePath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'storages', 'usage-center', 'pricing.json')
}

/** Read + normalize the table, or an explicit "unavailable". */
function readTable(): PriceTable {
  const path = tablePath()
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    const rawRules = Array.isArray(parsed.rules) ? parsed.rules : []
    const rules = rawRules.flatMap((raw): PriceRule[] => {
      const rule = normalizeRule(raw)
      return rule === null ? [] : [rule]
    })
    return {
      available: rules.length > 0,
      version: typeof parsed.version === 'number' ? parsed.version : null,
      currency: str(parsed.currency),
      rules,
      path,
      modifiedAt: statSync(path).mtimeMs,
    }
  } catch {
    // Missing file, no permission, a half-written rewrite — all the same answer:
    // "no table", which the card renders as "tokens only, no money".
    return { available: false, version: null, currency: null, rules: [], path, modifiedAt: null }
  }
}

/** Register `/api/widgets-pricing`; returns the disposer `ctx.effect` wants. */
export function registerWidgetsPricing(ctx: HostContext): () => void {
  let cache: { at: number; mtime: number | null; value: PriceTable } | null = null
  return ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-pricing',
    handler: async (_req, res) => {
      const now = Date.now()
      let mtime: number | null = null
      try { mtime = statSync(tablePath()).mtimeMs } catch { /* absent: counted as a change */ }
      if (cache === null || now - cache.at > PRICING_TTL || cache.mtime !== mtime) {
        const value = readTable()
        cache = { at: now, mtime: value.modifiedAt, value }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(cache.value))
    },
  })
}
