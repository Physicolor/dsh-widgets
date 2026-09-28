import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import type { ModelRoute, ModelSelectionInfo } from '../../client/lib/contract/types'

/**
 * 会话配置 — which model route this agent runs, what it costs to run it
 * (reasoning effort), and whether a route change is queued for the next request.
 *
 * WHY THE CARD EXISTS: the model and the effort are the first two variables that
 * explain a session's cost, latency and quality, and neither is visible on the
 * rail. With several agent presets and several providers composed, "which route am
 * I on right now" is otherwise only answerable by reading the composer.
 *
 * WHICH ROUTE THE HEAD DESCRIBES: `next` — the route the next request will run.
 * That is the projection's authoritative field (「下一个请求真的会用它」) and it is
 * what the composer's own model selector shows, so it is the session's
 * CONFIGURATION; `lastUsed` is history. `next ?? lastUsed` covers a session that has
 * not recorded a request yet.
 *
 * WHY THE FIGURE IS THE EFFORT, NOT THE MODEL: a model id is a long string that
 * turns into `deepseek-v4.1-fla…` the moment it becomes the 20px figure, and the
 * head's caption is the one slot that prints it in full (`legend`: 10px, the whole
 * 126px content width of a 2×2). The effort is a short word (`off`/`low`/`medium`/
 * `high`/`xhigh`/`max`) and it is the knob that moves cost and speed, so it takes the
 * 20px slot.
 *
 * THE CHANGE ROW CARRIES A FLAG, NOT THE MODEL ID — a MEASURED deviation from the
 * spec's card face (README §3 and the delivery report explain it): `breakdown` lays
 * its rows out as ONE grid (`1fr auto`), so the value column is as wide as the
 * WIDEST value in the block and every label gets what is left. Measured on the real
 * tile (content 126px, values at weight 600): `commandcode` is 74.5px and
 * `deepseek-v4-flash` is 91.8px, which leaves the label column 41.5px / 24.2px — and
 * the renderer fades each label's last 14px, so a 40px label in a 24.2px cell renders
 * as two dark glyphs and a ghost. Shipping the spec's third row verbatim printed
 * 「提供」 for 提供方 and cut English labels mid-word (`Provi`, `Prese`, `Next r`).
 * The model id therefore moves up into the legend (full length, legible) and the row
 * carries the CHANGE, which is why the row is the `primary` one: the highlighted cell
 * is the fact the user must notice. The shared-layer fix that would restore the
 * literal layout is in the report (a value that may ellipsize is enough).
 *
 * `reasoningEffort` ABSENT is not the same statement as "the effort is the default":
 * the contract says a route publishing no efforts omits the field, and nobody here
 * knows what the provider's default is. So an absent effort prints `—`, never a
 * guessed `default`. For the same reason the card reads no clock, no DOM and no
 * network: `render` is a pure fold of the two projections.
 *
 * TONE DIRECTION: a high effort is NOT bad — it buys quality with money and time —
 * so the figure is never painted danger. The only colour on the card is the
 * informational `primary` on the change row. `null` (no session controller composed)
 * hides the card entirely; that is a fact about the deployment, not a state of the
 * route.
 */

/** The em dash a missing reading prints — the same placeholder 工具调用 uses, never
 *  a fabricated `default`. */
const DASH = '—'

/**
 * Preview states, in click order. The card's SHAPE depends on the projection
 * (`next` vs `lastUsed` and whether the route publishes an effort), and no live
 * session exists in the market previews — so the preview walks the three shapes
 * instead of only ever showing the one its `example.stats` happens to hold.
 *
 * `sim` MUST be the first entry (the shell locates the current step by deep
 * comparison, so a `sim` absent from this list makes the first click a silent
 * no-op).
 */
const SIM_STEPS: ReadonlyArray<Record<string, unknown>> = [
  // A queued route change: three rows.
  { state: 'switched' },
  // The steady state: `next` IS `lastUsed` — two rows.
  { state: 'steady' },
  // A route that publishes no efforts at all: the figure falls back to `—`.
  { state: 'noEffort' },
]

/** A non-empty string, or null — the projection may hand over `''` for a field it
 *  could not fill, and printing an empty cell reads as a rendering bug. */
function orNull(value: string | undefined | null): string | null {
  return value !== undefined && value !== null && value !== '' ? value : null
}

/** The route's effort, or `—` when the route publishes none (see the header). */
function effortOf(route: ModelRoute): string {
  const effort = route.reasoningEffort
  return effort === undefined || effort === '' ? DASH : effort
}

/** The projection the render folds, after the preview's own state switch. The real
 *  collector already answers `null` when BOTH routes are missing, so this only ever
 *  narrows a projection that has something to say. */
function projected(sel: ModelSelectionInfo, state: string | null): ModelSelectionInfo {
  if (state === 'steady' && sel.lastUsed) return { next: sel.lastUsed, lastUsed: sel.lastUsed }
  if (state === 'noEffort' && sel.next) {
    // A route that publishes no effort: the FIELD IS ABSENT, not "the default".
    return { next: { provider: sel.next.provider, model: sel.next.model }, lastUsed: sel.lastUsed }
  }
  return sel
}

export default defineWidget({
  id: 'model-config',
  name: () => t('widget.model-config.name'),
  desc: () => t('widget.model-config.desc'),
  builtin: true,
  group: 'system',
  sizes: ['2x2'],
  simToggle: () => t('card.model-config.simToggle'),
  render: (s, meta) => {
    const sel = s.modelSelection
    // No session controller composed → nothing to report (not an empty state).
    if (!sel) return null
    const state = typeof meta?.sim?.state === 'string' ? meta.sim.state : null
    const eff = projected(sel, state)
    // The route the head describes: the configuration the next request will use,
    // falling back to the last one that actually ran.
    const route = eff.next ?? eff.lastUsed
    if (!route) return null
    // The third row is a CHANGE notice: only a queued route whose model actually
    // differs is worth a line. Comparing the model only is deliberate — a provider
    // swap that lands on the same model is the same route to the user.
    const switched = eff.next !== null && eff.lastUsed !== null && eff.next !== undefined && eff.lastUsed !== undefined && eff.next.model !== eff.lastUsed.model
    const provider = orNull(route.provider)
    const preset = orNull(s.agentPreset)
    return {
      title: t('card.model-config.title'),
      // The ladder: blue title, the effort as the figure, the model id as the grey
      // caption under it. `value` is deliberately NOT set — with a `headAfter` head it
      // has no owner and would be pushed into the body a second time.
      headAfter: { big: effortOf(route) },
      legend: route.model,
      // Bottom anchor: the rows sit on the tile's floor instead of marooning the
      // leftover height beneath them (every other system card's posture).
      bodyAnchor: 'bottom',
      chart: {
        kind: 'breakdown',
        // Two rows normally, three while a change is queued — never padded to three.
        // A row whose reading is missing prints `—` + muted instead of disappearing;
        // the third row is the one case where a row MAY be absent, because its subject
        // (a change) is absent (BRIEF: 行数不必凑满).
        breakdown: [
          provider === null
            ? { label: t('card.model-config.provider'), value: DASH, tone: 'muted' as const }
            : { label: t('card.model-config.provider'), value: provider },
          preset === null
            ? { label: t('card.model-config.preset'), value: DASH, tone: 'muted' as const }
            : { label: t('card.model-config.preset'), value: preset },
          ...(switched ? [{ label: t('card.model-config.next'), value: t('card.model-config.switched'), tone: 'primary' as const }] : []),
        ],
      },
    }
  },
  // Preview data: without a live session the projection is absent and the card would
  // not render at all, while the market / 组件配置 previews must be able to review its
  // FULL shape. The mock is a real transition — a session switched to v4-flash while
  // the last request still ran v4.1-flash at `high` — so the change row and its
  // `primary` tone are visible on the tile; the other two shapes are one click away
  // (see SIM_STEPS).
  example: {
    sim: SIM_STEPS[0],
    simSteps: [...SIM_STEPS],
    stats: {
      modelSelection: {
        next: { provider: 'commandcode', model: 'deepseek-v4-flash', reasoningEffort: 'medium' },
        lastUsed: { provider: 'commandcode', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' },
      },
      agentPreset: 'standard',
    },
  },
})
