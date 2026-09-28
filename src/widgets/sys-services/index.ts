import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import type { BarDatum, HostProxyHealth, HostServiceProbe, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 本地服务 (sys-services) — the machine's local endpoints AND its way out, 2×2.
 *
 *   ┌ 本地服务 ────────────────────┐
 *   │ 3 / 4                        │   ← headAfter.big：在听的服务数 / 总数
 *   │ 出口 1.3s · 代理 0.3ms        │   ← legend：代理出口延迟 + TCP 握手
 *   │ ─────────────────────────────│   发丝分隔线（breakdown 自带）
 *   │ DSH web           通 · 1ms    │
 *   │ Ollama            通 · 2ms    │
 *   │ LM Studio            未运行   │   ← down 行染 danger
 *   └──────────────────────────────┘
 *
 * WHY THIS CARD EXISTS: a slow or dead Ollama / LM Studio makes every request
 * slower, and a dead proxy presents as "everything is slow" — two failures that
 * are completely invisible today. Both live in `stats.host` (the
 * `/api/host/overview` route's sections), and both are cheap: the TCP probes are
 * 0.2–1.3 ms on loopback, so `services` is the ONE section that always answers.
 *
 * ── TONE DIRECTION (this widget owns it; the renderer never guesses) ─────────
 * An endpoint that is NOT listening is a bad state, so its row is `danger`, and
 * the headline turns `danger` as soon as ANY probed endpoint is down. That is the
 * OPPOSITE of 缓存命中 (high is good). The `—`/pending paths are `muted`: "I do
 * not know yet" is not a fault.
 *
 * ── WHY `tcpMs` IS NEVER THE PROXY VERDICT ──────────────────────────────────
 * Measured 2026-09-29 on this machine's xray: a CONNECT to the proxy returns
 * `200 Connection established` even for a domain that does NOT exist. So a fast
 * `tcpMs` proves only that the port is listening — exactly the confusion this
 * card was built to end. The honest verdict is `ok`, produced host-side by an
 * ABSOLUTE-URI GET (`GET http://host/path HTTP/1.1` — what actually makes the
 * proxy resolve a target and carry bytes), and `ok === null` means that probe is
 * still in flight (stale-while-revalidate). `null` renders 检测中, NEVER a fault:
 * printing 故障 for "still measuring" would be a lie the owner would act on.
 *
 * ── WHY THE FOURTH ENDPOINT IS NOT A ROW ────────────────────────────────────
 * The probe list is fixed: DSH web / Ollama / LM Studio / Proxy. The proxy's port
 * AND its egress verdict are already the legend, so it must not appear a second
 * time as a body row — one fact, one place (the same discipline that keeps
 * sys-procs from repeating its #1 process in the detail rows).
 *
 * The render is pure and reads no clock; every string is produced here.
 */

/** Body rows the tile carries. The head is three rungs + a caption; a fourth row
 *  pushes past the 126px content box (see WORKER-BRIEF §2 height budget). */
const MAX_ROWS = 3

/** Sub-millisecond handshakes must not round to a flat `0ms` (they are the normal
 *  case on loopback, and `0ms` reads as "no measurement"). */
const MS_FLOOR_DECIMALS = 10

/**
 * A millisecond reading as a SHORT label — and this is why the unit is decided
 * here rather than by the caller: the two quantities this card prints live on
 * opposite ends of the scale. A loopback handshake is 0.2–2 ms, while the egress
 * GET through the proxy is ~1.3 s (measured 2026-09-29), and `1311ms` in a
 * grey caption is four glyphs of noise.
 *
 *  - `0.2ms` / `2ms` — sub-millisecond keeps one decimal (never a flat `0ms`,
 *    which reads as "no measurement" for the most common reading on this machine);
 *  - `1.3s`          — a second or more switches unit, the same shape
 *    `fmtDuration` uses for tool calls;
 *  - `null`          — no reading at all (the probe failed, or the field has not
 *    answered yet); the CALLER picks the word, because an unknown DURATION is not
 *    an unknown STATE.
 */
function fmtMs(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null
  if (ms >= 1000) return `${Math.round(ms / 100) / 10}s`
  if (ms < 1) return `${Math.max(1, Math.round(ms * MS_FLOOR_DECIMALS)) / MS_FLOOR_DECIMALS}ms`
  return `${Math.round(ms)}ms`
}

/** The three things the proxy can be telling us — `ok` alone is not enough,
 *  because `null` is a THIRD state (probe in flight), not a failure. */
type ProxyState = 'ok' | 'fail' | 'pending'

/**
 * How much of the host's failure code may ride the caption.
 *
 * MEASURED ON THE BUILT CARD, not guessed. The caption is one nowrap ellipsized
 * line (`.dsx-stats-card-legend`) whose content box is 124px wide in a 150px tile
 * at the 10px caption size; rendered with that card's own font, the caption costs
 * 40px plus the code:
 *
 *   EAI_AGAIN   (9) 113.9px  fits        ECONNRESET (10) 125.0px  CLIPS
 *   ETIMEDOUT   (9) 118.3px  fits        CONNECTION_RESET (16) 160.6px  clips
 *   port-closed (11) 105.0px fits
 *
 * So the budget is NINE characters, and it is a character count rather than a
 * pixel width because a widget render is pure data — it has no font metrics. The
 * consequence is deliberate and documented: a code at or under 9 chars rides the
 * caption; a longer one (`ECONNRESET`) prints the bare verdict, which is a
 * complete sentence, and its FULL code stays one hover away (`cardHint`). A wider
 * tile (2×4) or a different caption size moves this number.
 */
const ERROR_CODE_CHARS = 9

/** Leading words that are noise when the failure is named: `connect ECONNREFUSED
 *  …` names its error in the SECOND token, and keeping the verb would print the
 *  least informative half of the diagnosis. */
const ERROR_NOISE = new Set(['connect', 'connect:', 'get', 'request', 'socket', 'error:'])

/**
 * A failure code as a SHORT caption token.
 *
 * Probe errors arrive in whatever shape the underlying error carries:
 * `ECONNRESET`, `timeout`, `port-closed`, or `connect ECONNREFUSED
 * 127.0.0.1:10808`. The target address half is long, redundant with the port
 * already on the tile, and the part that pushes the caption past its budget — so
 * the code is reduced to its NAMING token: the first token that is not a leading
 * verb (see ERROR_NOISE). A code with no separator is left whole, and the length
 * cap then decides whether it fits.
 */
function shortErrorCode(raw: string): string {
  const tokens = raw.trim().split(/[\s,;]+/).filter((tok) => tok !== '')
  for (const tok of tokens) {
    if (!ERROR_NOISE.has(tok.toLowerCase())) return tok
  }
  return tokens[0] ?? ''
}

/** A code short enough to ride the caption, or null to show the bare verdict. */
function captionCode(raw: string): string | null {
  if (raw === '') return null
  const code = shortErrorCode(raw)
  return code.length <= ERROR_CODE_CHARS ? code : null
}

/** The proxy caption + hover pair, normalised once so the render reads no
 *  conditionals. */
interface ProxyOut {
  state: ProxyState
  /** The grey caption under the headline. */
  legend: string
  /** Hover text: the rule, and the specific failure when there is one. */
  hint: string
}

/**
 * Turn the host's proxy section into the caption + hover pair.
 *
 * Order matters: `ok === true` wins even when a later field is missing, because
 * a completed egress measurement IS the verdict; `null` is checked BEFORE any
 * falsy test so an in-flight probe can never be rendered as a fault.
 *
 * Both failure branches are real. A `null` code means the host published no code
 * (or an empty one) — the bare 出口不通 still says exactly what happened, so no
 * placeholder is invented for it.
 */
function proxyOut(proxy: HostProxyHealth | null): ProxyOut {
  if (proxy === null || proxy.ok === null) {
    return { state: 'pending', legend: t('card.sys-services.egressPending'), hint: t('card.sys-services.noRule') }
  }
  if (proxy.ok) {
    const ms = fmtMs(proxy.egressMs)
    return {
      state: 'ok',
      legend: ms === null ? t('card.sys-services.egressPending') : t('card.sys-services.egressOk', { ms }),
      hint: t('card.sys-services.noRule'),
    }
  }
  const raw = typeof proxy.error === 'string' ? proxy.error.trim() : ''
  const code = captionCode(raw)
  const rule = t('card.sys-services.noRule')
  return {
    state: 'fail',
    legend: code === null ? t('card.sys-services.egressFail') : t('card.sys-services.egressFailWhy', { error: code }),
    hint: raw === '' ? rule : `${t('card.sys-services.egressDetail', { error: raw })} · ${rule}`,
  }
}

/** One body row: the endpoint's label plus its state (and latency when it is up). */
function serviceRow(svc: HostServiceProbe): { label: string; value: string; tone?: BarDatum['tone'] } {
  if (!svc.up) return { label: svc.label, value: t('card.sys-services.down'), tone: 'danger' as const }
  const ms = fmtMs(svc.ms)
  return {
    label: svc.label,
    value: ms === null ? t('card.sys-services.up') : `${t('card.sys-services.up')} · ${ms}`,
  }
}

/**
 * The grey caption: the egress verdict first (it is the one reading a fast TCP
 * handshake cannot give you), then the port's own handshake — but ONLY when the
 * probe is still in flight. Once the verdict exists, `egressMs` IS the end-to-end
 * measurement THROUGH the proxy, so printing the handshake beside it would spend
 * tile width restating a number the verdict already dominates.
 *
 * Two branches, and the second is a real shape: `proxy` itself is `null` until
 * the host route has answered once, and `tcpMs` can be `null` on its own (the
 * port is closed), so each half degrades independently.
 */
function legendFor(proxy: HostProxyHealth | null, p: ProxyOut): string {
  if (p.state !== 'pending' || proxy === null) return p.legend
  const tcp = fmtMs(proxy.tcpMs)
  return tcp === null ? p.legend : `${p.legend} · ${proxy.port} ${tcp}`
}

function sysServicesRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const services = stats.host?.services
  // No probe at all = no subject. An EMPTY array is also nothing to report (this
  // card's whole content is the endpoints), and a null `host` means the route has
  // not answered — the shell owns the loading skeleton, not this render.
  if (!Array.isArray(services) || services.length === 0) return null

  // The preview override: `meta.sim` is an UNTYPED bag, so it is trusted only
  // when it really is an object (or an explicit null) and only for THIS one
  // section — it lets the offline gallery / market preview walk
  // ok → fail → pending without waiting for a real egress failure or a 1.3s
  // in-flight window (see `example.simSteps`). The endpoint list is never
  // overridden: the sim steps carry no `services`, and the live/exampled record
  // stays the single source for it.
  const simProxy = meta?.sim?.proxy
  const proxy = typeof simProxy === 'object'
    ? (simProxy as HostProxyHealth | null) ?? stats.host?.proxy ?? null
    : stats.host?.proxy ?? null
  const p = proxyOut(proxy)

  const up = services.reduce((n, svc) => n + (svc.up ? 1 : 0), 0)
  const down = services.length - up

  // The proxy is one of the four FIXED probes and its state is already the
  // caption, so the body drops it (the discipline sys-procs applies to its #1
  // process); what remains is the first MAX_ROWS endpoints in probe order.
  const rows = services.filter((svc) => svc.key !== 'proxy').slice(0, MAX_ROWS).map(serviceRow)

  return {
    title: t('card.sys-services.title'),
    // The head's ladder, one rung per field: the figure here and the caption
    // under it. `value` is deliberately NOT set — with a `headAfter` head it
    // would print the count a second time in the body.
    headAfter: { big: `${up} / ${services.length}` },
    legend: legendFor(proxy, p),
    // Red the MOMENT an endpoint is down (see the tone note in the header). The
    // rule lives in this widget because only it knows what the number means.
    ...(down > 0 ? { valueTone: 'danger' as const } : {}),
    cardHint: p.hint,
    // The rows keep the tile's floor, the same posture as 缓存命中 / 工具调用: a
    // `headAfter` head alone would leave the slack UNDER the rows.
    bodyAnchor: 'bottom',
    ...(rows.length > 0 ? { chart: { kind: 'breakdown' as const, breakdown: rows } } : {}),
  }
}

/** The proxy section mirroring this machine (2026-09-29): the xray port answers
 *  a TCP handshake in ~0.2 ms and one absolute-URI GET takes ~1.3 s. */
const SIM_OK: HostProxyHealth = { host: '127.0.0.1', port: 10808, tcpMs: 0.2, egressMs: 1311, ok: true, error: null }
/** A dead egress: the port is listening (tcpMs is real) but no traffic leaves.
 *  The error is the FULL shape a probe error really carries (a name plus its
 *  target address) — the caption keeps only the leading token and the whole
 *  string rides the hover, which is exactly the path this preview must exercise.
 */
const SIM_FAIL: HostProxyHealth = { host: '127.0.0.1', port: 10808, tcpMs: 0.3, egressMs: null, ok: false, error: 'ECONNREFUSED 127.0.0.1:10808' }
/** In flight (stale-while-revalidate): `ok` is null, i.e. NOT a verdict. */
const SIM_PENDING: HostProxyHealth = { host: '127.0.0.1', port: 10808, tcpMs: 0.2, egressMs: null, ok: null, error: null }

/** The three proxy states the preview walks with a click (`example.simSteps`).
 *  `simSteps[0].proxy` MUST be byte-identical to the example's own proxy: the
 *  shell locates the CURRENT step by deep comparison, so a mismatch makes the
 *  first click a silent no-op. */
const PROXY_STEPS: HostProxyHealth[] = [SIM_OK, SIM_FAIL, SIM_PENDING]

/**
 * Preview data — THIS machine's real readings (measured 2026-09-29): DSH web up
 * at 1 ms, Ollama up at 2 ms, LM Studio NOT running, the proxy port up at 0.2 ms
 * with a 1311 ms egress. `ok: true` here is what makes the first gallery cell the
 * ordinary state instead of an artificial failure.
 */
const EXAMPLE_STATS: Partial<WidgetStats> = {
  host: {
    ts: 0,
    net: null,
    power: null,
    procs: null,
    services: [
      { key: 'dsh', label: 'DSH web', host: '127.0.0.1', port: 3080, up: true, ms: 1 },
      { key: 'ollama', label: 'Ollama', host: '127.0.0.1', port: 11434, up: true, ms: 2 },
      { key: 'lmstudio', label: 'LM Studio', host: '127.0.0.1', port: 1234, up: false, ms: null },
      { key: 'proxy', label: 'Proxy', host: '127.0.0.1', port: 10808, up: true, ms: 0.2 },
    ],
    proxy: SIM_OK,
  },
}

export default defineWidget({
  id: 'sys-services',
  name: () => t('widget.sys-services.name'),
  desc: () => t('widget.sys-services.desc'),
  builtin: true,
  group: 'device',
  // MUST mirror the manifest: the runtime's sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: sysServicesRender,
  simToggle: () => t('card.sys-services.simToggle'),
  example: {
    stats: EXAMPLE_STATS,
    sim: { proxy: PROXY_STEPS[0] },
    simSteps: PROXY_STEPS.map((proxy) => ({ proxy })),
  },
})
