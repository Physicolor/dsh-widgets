/**
 * 会话成本 (session-cost) — what THIS session has cost, in the money of the rule
 * that priced it, with the rule's provenance printed beside it.
 *
 * WHY THE CARD EXISTS: official DeepSeek pricing pays 0.02 CNY/M for a cache HIT
 * and 1 CNY/M for a MISS — a 50× spread inside ONE session's input. Nothing on the
 * rail folds a session into money today (会话 Token prints counts only, and money
 * in this repo has so far belonged to the Command Code plan family, which prints
 * plan occupancy, not session spend). This card is that missing reading.
 *
 * THE FOUR ELEMENTS, AND WHY EACH SITS WHERE IT DOES:
 *   `会话成本`        the blue title (the card's name, not the widget's market name);
 *   `≈$0.131`         the FIGURE row — the session's amount, or the token total when
 *                     no rule would price it (`headAfter.big`, never `value`: a card
 *                     with a headAfter head owns exactly one figure, and `value`
 *                     would be pushed into the body and printed twice);
 *   `官方价 · …`      the grey caption — the amount's PROVENANCE first (`sourceType`
 *                     localized) and the model name after it. This is the card's
 *                     discipline made visible: money never appears alone;
 *   the three rows    the buckets the amount was folded from — 未缓存输入 / 缓存读取
 *                     输出 — with each bucket's own share of the money in the
 *                     renderer's reserved third column. They sit on the card's floor
 *                     (`bodyAnchor: 'bottom'`), the posture every detail-row card in
 *                     this repo uses.
 *
 * THE `≈`: as soon as a rule publishes a peak/off-peak split, folding a whole
 * session at one band is an ESTIMATE — the session record carries no per-request
 * timestamps, so "how much of this ran inside 01:00–04:00 UTC" is not knowable from
 * the data this card is given (see `pricing.ts`). The card marks the figure with `≈`
 * and puts the full reason on hover (`cardHint`) rather than splitting the session
 * by an hour it cannot see. WHEN NO RULE MATCHES, the amount column is EMPTY — not
 * `—`, not `$0.00` — because an empty cell says "there is no number here", while a
 * zero would claim the session was free.
 *
 * TONE DIRECTION — this card is a READING, and it sets NO tone at all: spending more
 * is not bad, and a free route is not better. Literally nothing here passes a `tone`,
 * which is the whole statement. (The only colour in the card is the renderer's own
 * grey for the money column, which is a hierarchy, not a verdict.)
 */

import { defineWidget } from '../../client/lib/contract/helpers'
import type { WidgetRenderMeta, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'
import { fmtTokens } from '../../client/lib/format'
import { fmtMoney, priceSession, selectPriceRule, shortModelName, sourceKindOf, splitUsage, totalTokens, type SourceKind } from './pricing'

/** `sourceType` → the legend's first word. A rule with no provenance is NOT
 *  promoted to "official": it prints 来源未标注, because that is what the table said. */
function sourceLabel(kind: SourceKind): string {
  switch (kind) {
    case 'official': return t('card.session-cost.src.official')
    case 'reseller': return t('card.session-cost.src.reseller')
    case 'local': return t('card.session-cost.src.local')
    case 'fallback': return t('card.session-cost.src.fallback')
    default: return t('card.session-cost.src.unknown')
  }
}

/** Significant digits for a ROW's share of the amount — the figure keeps the
 *  default 3. Measured on the real card: the three-column grid reserves a 30px
 *  floor for the money track, so a 3-digit share (`$0.0552`, 37.6px) leaves the
 *  widest zh label 0.6px of slack (it clipped before the first iteration), while a
 *  2-digit one (`$0.055`, 31.7px) leaves 6.5px. See `fmtMoney` for the numbers. */
const ROW_MONEY_DIGITS = 2

/** `Session Cost` — the card, as one pure function of the merged stats.
 *
 *  The clock is read here (`Date.now()` through `new Date()`), which the contract
 *  allows and the peak verdict needs: the rate band of "now" is part of the answer.
 *  A preview may pin it with `meta.sim.at` (an ISO instant) so a screenshot of a
 *  peak-band fold is reproducible instead of depending on when it was taken. */
function sessionCostRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const u = stats.usage
  // No usage at all, or a session that has spent nothing yet: there is no cost to
  // report and no token total worth a card. `null` hides it (the shipped gate).
  if (!u) return null
  const buckets = splitUsage(u)
  const total = totalTokens(buckets)
  if (total <= 0) return null

  const sim = meta?.sim
  // Pinned clock (preview only; the rail never passes `at`).
  const pinned = typeof sim?.at === 'string' ? Date.parse(sim.at) : Number.NaN
  const now = Number.isFinite(pinned) ? new Date(pinned) : new Date()
  // `noTable` simulates the "pricing not read / unavailable" case honestly — it
  // replaces the table with nothing rather than switching the render onto a
  // shortcut path, so the preview exercises the same code the rail does.
  const table = sim?.noTable === true ? null : (stats.pricing ?? null)
  // `next` first: the tokens on this card are the session's, and the route that
  // would price a request made right now is the one the owner is looking at.
  const route = stats.modelSelection?.next ?? stats.modelSelection?.lastUsed ?? null
  const rule = selectPriceRule(table, route, now)
  const price = rule === null ? null : priceSession(rule, u, now, table?.currency ?? null)

  // The token-only caption says WHICH kind of "no money" this is — a missing table,
  // a session with no route recorded yet, and a table that simply lists no rule for
  // this model are three different facts, and the card is not allowed to blur them.
  const noMoney = table === null || table.available !== true || table.rules.length === 0
    ? t('card.session-cost.noTable')
    : route === null
      ? t('card.session-cost.noRoute')
      : t('card.session-cost.noRule')

  const model = rule === null ? '' : shortModelName(route?.model)
  const legend = rule === null
    ? noMoney
    : `${sourceLabel(sourceKindOf(rule.sourceType))}${model === '' ? '' : ` · ${model}`}`

  // The figure: money when a rule priced the session (marked `≈` while the fold is
  // an estimate), the token total when none did. The `≈` is the ONLY estimate mark
  // the tile can afford — the legend's width is already spoken for by the
  // provenance — and the hover hint spells the reason out.
  const big = price === null
    ? fmtTokens(total)
    : `${price.estimated ? '≈' : ''}${fmtMoney(price.amount, price.currency)}`

  /** One row of the laid-out money column. `cost` is left UNDEFINED in the
   *  token-only form, which is what makes the renderer drop the column entirely:
   *  an empty reserved track would still imply "a number belongs here". */
  const row = (label: string, tokens: number, cost: number | undefined): { label: string; value: string; cost?: string } => ({
    label,
    value: fmtTokens(tokens),
    ...(cost === undefined ? {} : { cost: fmtMoney(cost, price?.currency ?? null, ROW_MONEY_DIGITS) }),
  })

  return {
    title: t('card.session-cost.title'),
    headAfter: { big },
    legend,
    bodyAnchor: 'bottom',
    cardHint: price?.estimated === true ? t('card.session-cost.estHint') : undefined,
    chart: {
      kind: 'breakdown',
      breakdown: [
        row(t('card.session-cost.uncached'), buckets.uncached, price?.rowCost.uncached),
        row(t('card.session-cost.read'), buckets.cacheRead, price?.rowCost.cacheRead),
        row(t('card.session-cost.output'), buckets.output, price?.rowCost.output),
      ],
    },
  }
}

export default defineWidget({
  id: 'session-cost',
  name: () => t('widget.session-cost.name'),
  desc: () => t('widget.session-cost.desc'),
  builtin: true,
  group: 'coding-plan',
  sizes: ['2x2'],
  simToggle: () => t('widget.session-cost.simToggle'),
  render: sessionCostRender,
  // Three preview states, and the FIRST is the `sim` the shell uses: a click walks
  // money(off-peak) → money(peak band) → tokens only, so all three forms of this
  // card can be looked at without editing the price table or waiting for the clock
  // to cross 01:00 UTC.
  example: {
    stats: previewStats,
    sim: { noTable: false, at: '2026-09-28T05:00:00Z' },
    simSteps: [
      // Monday 05:00 UTC — AFTER the 01:00–04:00 window and BEFORE 06:00: the
      // off-peak band, deliberately, so state 1 is the cheap fold.
      { noTable: false, at: '2026-09-28T05:00:00Z' },
      // Monday 02:00 UTC — INSIDE the rule's own 01:00–04:00 peak window, so the
      // same buckets fold at exactly 2× through the real `isPeakAt` path.
      { noTable: false, at: '2026-09-28T02:00:00Z' },
      // No table at all: the tokens stay, every money cell goes empty.
      { noTable: true },
    ],
  },
})

/**
 * The preview's stats — declared HERE, below the descriptor, on purpose.
 *
 * `gen-registry` derives a unit's id from the FIRST `id: '…'` literal in
 * `index.ts` (dir === manifest.id === that literal). The mock rules below need
 * `id` fields of their own, so this function must not appear above the descriptor's
 * `id: 'session-cost'` in file order. A function declaration is hoisted, so the
 * reference in `example` above works. Moving this block up breaks the build.
 *
 * The mock mirrors the REAL table's shape (v2 / USD / the shipped V4.1 Flash
 * official rule) plus three decoys that make the selection visible in a screenshot:
 *   - `example-retired-v4.1-flash-twin`: same provider AND model, retired
 *     `effectiveTo: 2026-09-10`, at DOUBLE rates. If the effective-window sieve ever
 *     stops working, the preview immediately doubles — a visible failure instead of
 *     a silent one;
 *   - `example-reseller-same-model`: the same model on provider `opencode-go`
 *     (a real route on this machine) — proves the provider must match too;
 *   - `example-local-wildcard`: provider `ollama`, model `*` — proves the wildcard
 *     matches only its own provider rather than everything.
 */
function previewStats(): Partial<WidgetStats> {
  const PEAK_WINDOWS = [
    { days: [1, 2, 3, 4, 5], start: '01:00', end: '04:00' },
    { days: [1, 2, 3, 4, 5], start: '06:00', end: '10:00' },
  ]
  return {
    usage: { inputTokens: 18_600_000, cacheReadTokens: 18_400_000, outputTokens: 75_600 },
    // The route as the controller reports it on this machine: the model id carries
    // its provider prefix, which is exactly why the matcher normalizes on the last
    // path segment instead of comparing raw strings.
    modelSelection: { next: { provider: 'deepseek', model: 'deepseek/deepseek-v4.1-flash' }, lastUsed: null },
    pricing: {
      available: true,
      version: 2,
      currency: 'USD',
      path: '(example table shipped with this widget preview)',
      modifiedAt: null,
      rules: [
        {
          id: 'example-retired-v4.1-flash-twin',
          provider: 'deepseek',
          model: 'deepseek-v4.1-flash',
          effectiveFrom: null,
          effectiveTo: '2026-09-10T00:00:00Z',
          timezone: 'UTC',
          peakWindows: PEAK_WINDOWS,
          rates: { inputCacheHit: 0.006, inputCacheMiss: 0.3, output: 1.2, cacheWrite: 0 },
          peakRates: { inputCacheHit: 0.012, inputCacheMiss: 0.6, output: 2.4, cacheWrite: 0 },
          currency: 'USD',
          sourceType: 'official',
          verifiedAt: '2026-09-11',
          source: 'example only — a deliberately retired twin of the rule below',
        },
        {
          id: 'example-official-v4.1-flash',
          provider: 'deepseek',
          model: 'deepseek-v4.1-flash',
          effectiveFrom: '2026-09-10T00:00:00Z',
          effectiveTo: null,
          timezone: 'UTC',
          peakWindows: PEAK_WINDOWS,
          rates: { inputCacheHit: 0.003, inputCacheMiss: 0.15, output: 0.6, cacheWrite: 0 },
          peakRates: { inputCacheHit: 0.006, inputCacheMiss: 0.3, output: 1.2, cacheWrite: 0 },
          currency: 'USD',
          sourceType: 'official',
          verifiedAt: '2026-09-11',
          source: 'example only — mirrors the shipped DeepSeek V4.1 Flash list',
        },
        {
          id: 'example-reseller-same-model',
          provider: 'opencode-go',
          model: 'deepseek-v4.1-flash',
          effectiveFrom: '2026-09-10T00:00:00Z',
          effectiveTo: null,
          timezone: 'UTC',
          peakWindows: [],
          rates: { inputCacheHit: 0.003, inputCacheMiss: 0.15, output: 0.6, cacheWrite: 0 },
          peakRates: null,
          currency: 'USD',
          sourceType: 'reseller',
          verifiedAt: '2026-09-11',
          source: 'example only — same model, another provider',
        },
        {
          id: 'example-local-wildcard',
          provider: 'ollama',
          model: '*',
          effectiveFrom: null,
          effectiveTo: null,
          timezone: 'UTC',
          peakWindows: [],
          rates: { inputCacheHit: 0, inputCacheMiss: 0, output: 0, cacheWrite: 0 },
          peakRates: null,
          currency: 'USD',
          sourceType: 'local',
          verifiedAt: '2026-09-11',
          source: 'example only — a local route with a real zero rate',
        },
      ],
    },
  }
}
