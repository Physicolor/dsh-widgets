/**
 * dsh-widgets — chart colour tones.
 *
 * Semantic aliases, not hex: the cards follow light/dark and every future token
 * change. Moved verbatim out of components.tsx (Phase 3.4).
 */

export const CHART_TONES: Record<string, string> = {
  primary: 'var(--dsw-alias-state-business-primary)',
  success: 'var(--dsw-alias-state-success-primary)',
  warn: 'var(--dsw-alias-state-warn-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
  muted: 'var(--dsw-alias-label-tertiary)',
}
