/**
 * dsh-widgets — chart colour tones.
 *
 * Semantic aliases, not hex: the cards follow light/dark and every future token
 * change. Moved verbatim out of components.tsx (Phase 3.4).
 *
 * `accent` is the palette's SIXTH step and exists for one reason: the official
 * timeline strip paints its 模型 lane with a MIX (brand blue 60% with the error red)
 * rather than a single token, and a card that shows the same three lanes' shares must
 * be able to name that colour. Widgets never pass raw colours — the palette stays
 * semantic so light/dark and future token changes keep working — so the mix lives
 * here, ONCE, and `lanes.tsx` reads it from here too (it used to repeat the
 * expression, which is how the two could drift).
 */
export const CHART_TONES: Record<string, string> = {
  primary: 'var(--dsw-alias-state-business-primary)',
  success: 'var(--dsw-alias-state-success-primary)',
  warn: 'var(--dsw-alias-state-warn-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
  muted: 'var(--dsw-alias-label-tertiary)',
  /** The official 模型 lane: brand blue mixed 60/40 with the error red. */
  accent: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, var(--dsw-alias-state-error-secondary))',
}
