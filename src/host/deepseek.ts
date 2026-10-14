/**
 * dsh-widgets — the DeepSeek platform-balance channel.
 *
 * `/api/deepseek-balance`: ONE official read (`GET https://api.deepseek.com/user/balance`)
 * plus the day's spend, which the official API does NOT publish.
 *
 * WHY A HOST MODULE AT ALL. The browser never sees `DEEPSEEK_API_KEY`: the key is
 * resolved through the same credentials seam every other channel uses
 * (`ctx.credentials.resolve` -> process env -> `$DSH_HOME/.credentials.yaml` ->
 * `.env`), so the card works with nothing typed in this UI.
 *
 * WHY THE DAY'S SPEND IS DERIVED, NOT QUERIED. The official balance endpoint
 * answers `{ is_available, balance_infos: [{ currency, total_balance,
 * granted_balance, topped_up_balance }] }` — a BALANCE, with no usage, no spend
 * and no history. So "今日消耗" is measured the only way a balance can be
 * measured: by SAMPLING it. `'<profiles>/web/dsh-widgets-balance.json'` keeps the
 * last sample and the accumulated spend for the current local day; every sample
 * adds the DROP since the previous one. A sample that goes UP (a top-up, or a
 * granted credit) is not negative spend — it re-baselines and leaves the day's
 * figure alone, which is the whole reason a naive `first - last` cannot be used.
 *
 * WHAT THIS MEANS, HONESTLY (the card says it too): the figure covers the
 * intervals this host actually observed. A spend that happens while dsh is not
 * running is invisible to it, and the ledger is per machine — it is a measurement
 * of the balance, not a bill.
 *
 * A 401/403 from upstream is an ANSWER (`unauthorized`): a revoked key is a
 * statement about this install, so it must not be memoised as a payload the next
 * request would re-serve.
 */
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { memoTtl } from './http'
import { type CredentialsCtx, type HostContext } from './context'

/** The official balance endpoint (the only account read on this channel). */
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance'
/** The credential refs tried in order — the official env var name first. */
const DEEPSEEK_KEY_REFS = ['DEEPSEEK_API_KEY', 'DEEPSEEK_KEY']
/** Per-request upstream budget. The endpoint answered in ~0.3 s when measured;
 *  8 s only exists so a hung connection cannot hold the rail's poll open. */
const DEEPSEEK_TIMEOUT_MS = 8000
/** How long one sampled answer is re-served. The client polls every 5 minutes, so
 *  this is purely the burst collapser (several tabs / a reload). */
const DEEPSEEK_MEMO_MS = 60_000

/** A route answer that must NOT be cached and that carries its own status. */
class RouteError extends Error {
  constructor(readonly status: number, readonly body: string) {
    super(`route responded ${status}`)
  }
}

/** One day's sampling ledger (the file this channel keeps between runs). */
interface BalanceLedger {
  /** Local calendar day this ledger describes (`YYYY-MM-DD`). */
  day: string
  /** The last observed total balance, in `currency`. */
  last: number
  /** Σ of the observed DROPS today. Never negative. */
  spent: number
  /** The currency the two numbers above are in; a change resets the day (a
   *  DeepSeek account is single-currency in practice, and mixing two would make
   *  the subtraction meaningless). */
  currency: string | null
  /** Epoch millis of the last sample. */
  updatedAt: number
}

/** `YYYY-MM-DD` on the HOST's own clock — "today" is the machine the user is
 *  sitting at, which is also the machine whose balance is being spent. */
function dayKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Trim float noise out of an accumulated difference (0.1 + 0.2 territory):
 *  6 decimals is well below any currency's minor unit and keeps the JSON stable. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

/** The ledger file, beside the rail's own state file (same profile data dir). */
function ledgerPath(): string {
  const home = process.env.DSH_HOME
  const base = home !== undefined && home.length > 0 ? home : join(homedir(), '.dsh')
  return join(base, 'profiles', 'web', 'dsh-widgets-balance.json')
}

/** Read the ledger; a missing/corrupt file is simply "no previous sample". */
async function readLedger(): Promise<BalanceLedger | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(ledgerPath(), 'utf8')) as Partial<BalanceLedger>
    if (typeof parsed.day !== 'string' || typeof parsed.last !== 'number' || typeof parsed.spent !== 'number') return null
    return {
      day: parsed.day,
      last: parsed.last,
      spent: parsed.spent,
      currency: typeof parsed.currency === 'string' ? parsed.currency : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch { return null }
}

/** Write the ledger atomically (tmp + rename), like the rail state file. */
async function writeLedger(ledger: BalanceLedger): Promise<void> {
  try {
    const file = ledgerPath()
    await fs.mkdir(dirname(file), { recursive: true })
    await fs.writeFile(`${file}.tmp`, JSON.stringify(ledger), 'utf8')
    await fs.rename(`${file}.tmp`, file)
  } catch { /* an unwritable data dir costs the day's figure, never the balance */ }
}

/**
 * Fold one sample into the day's ledger.
 *
 * The three rules, and each one is a bug that was designed out:
 *  1. a DAY CHANGE (or a currency change) starts a fresh baseline — yesterday's
 *     spend is not today's;
 *  2. only a DROP is spend (`prev.last - total > 0`). An increase is a top-up or
 *     a granted credit; counting it as negative spend would let a ¥100 top-up
 *     erase a real ¥30 of usage;
 *  3. the baseline always moves to the new sample, so the next interval measures
 *     from here — an increase therefore also becomes the new floor.
 */
function foldSample(prev: BalanceLedger | null, total: number, currency: string | null, now: Date): BalanceLedger {
  const day = dayKeyLocal(now)
  if (prev === null || prev.day !== day || prev.currency !== currency) {
    return { day, last: total, spent: 0, currency, updatedAt: now.getTime() }
  }
  const drop = round6(prev.last - total)
  return {
    day,
    last: total,
    spent: drop > 0 ? round6(prev.spent + drop) : prev.spent,
    currency,
    updatedAt: now.getTime(),
  }
}

/** One `balance_infos` entry, as far as this module trusts it. */
interface BalanceInfo {
  currency: string | null
  total: number
  granted: number
  toppedUp: number
}

/** A finite number out of a string-or-number field, else `null`. */
function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : Number.NaN
  return Number.isFinite(n) ? n : null
}

/**
 * Pick the entry to report. The API answers an ARRAY (a multi-currency account
 * would carry several); the card has one big figure, so the first entry wins and
 * `currency` travels with the numbers so it is never printed as the wrong unit.
 */
function pickBalance(payload: unknown): { info: BalanceInfo; hasBalance: boolean } | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  const root = payload as Record<string, unknown>
  const list = Array.isArray(root.balance_infos) ? root.balance_infos : []
  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue
    const entry = raw as Record<string, unknown>
    const total = num(entry.total_balance)
    if (total === null) continue
    return {
      info: {
        currency: typeof entry.currency === 'string' && entry.currency !== '' ? entry.currency : null,
        total,
        granted: num(entry.granted_balance) ?? 0,
        toppedUp: num(entry.topped_up_balance) ?? 0,
      },
      // `is_available` is the vendor's own verdict ("this account can still call
      // the API"), which is NOT the same thing as `total > 0` and is reported as
      // it was said rather than recomputed here.
      hasBalance: root.is_available !== false,
    }
  }
  return null
}

/**
 * The `/api/deepseek-balance` body: the balance (verbatim from upstream) plus the
 * day's observed spend and the instant the sample was taken.
 *
 * `sampledAt` is the reason the card can say 刚刚更新: it is stamped INSIDE the
 * memoised computation, so it names the moment upstream answered, not the moment
 * this request was served.
 */
export async function buildDeepSeekBalanceBody(ctx: CredentialsCtx, now: Date): Promise<string> {
  let key: string | undefined
  for (const ref of DEEPSEEK_KEY_REFS) {
    const resolved = await ctx.credentials.resolve(ref).catch(() => undefined)
    const value = resolved?.value
    if (value !== undefined && value !== '') { key = value; break }
  }
  if (key === undefined) {
    // A statement about THIS install, not a payload: kept out of the memo so
    // configuring the key recovers on the very next request.
    throw new RouteError(503, JSON.stringify({ error: `${DEEPSEEK_KEY_REFS[0]} is not configured` }))
  }
  let upstream: Response
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), DEEPSEEK_TIMEOUT_MS)
    try {
      upstream = await fetch(DEEPSEEK_BALANCE_URL, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
        signal: ctrl.signal,
      })
    } finally { clearTimeout(timer) }
  } catch (error) {
    throw new RouteError(502, JSON.stringify({ error: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unavailable' }))
  }
  const text = await upstream.text().catch(() => '')
  if (upstream.status === 401 || upstream.status === 403) {
    throw new RouteError(401, JSON.stringify({ error: 'unauthorized' }))
  }
  if (!upstream.ok) {
    throw new RouteError(502, JSON.stringify({ error: `http:${upstream.status}` }))
  }
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new RouteError(502, JSON.stringify({ error: 'unparseable' })) }
  const picked = pickBalance(parsed)
  if (picked === null) {
    // A 200 with no usable `balance_infos` entry is not a balance; the card says
    // "unavailable" rather than printing a zero nobody measured.
    throw new RouteError(502, JSON.stringify({ error: 'no-balance' }))
  }
  const ledger = foldSample(await readLedger(), picked.info.total, picked.info.currency, now)
  await writeLedger(ledger)
  return JSON.stringify({
    available: true,
    currency: picked.info.currency,
    total: picked.info.total,
    granted: picked.info.granted,
    toppedUp: picked.info.toppedUp,
    hasBalance: picked.hasBalance,
    spentToday: ledger.spent,
    day: ledger.day,
    sampledAt: now.getTime(),
  })
}

/** Register the DeepSeek balance route; returns the disposer `ctx.effect` wants. */
export function registerDeepSeekBalance(ctx: HostContext): () => void {
  //   GET /api/deepseek-balance
  //
  // One upstream read per DEEPSEEK_MEMO_MS at most: the numbers move on a money
  // timescale, and the day's spend is measured by SAMPLING the balance, so the
  // cadence is part of the measurement rather than a freshness knob (see the
  // module header).
  const balanceBody = memoTtl<string>(DEEPSEEK_MEMO_MS)
  const off = ctx.webServer.register({
    kind: 'exact',
    path: '/api/deepseek-balance',
    handler: async (_req, res) => {
      try {
        const body = await balanceBody('balance', () => buildDeepSeekBalanceBody(ctx, new Date()))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
      } catch (error) {
        if (error instanceof RouteError) {
          res.writeHead(error.status, { 'Content-Type': 'application/json' })
          res.end(error.body)
          return
        }
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    },
  })
  return off
}
