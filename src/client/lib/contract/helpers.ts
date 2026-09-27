/**
 * dsh-widgets — Widget contract: the resolver helpers.
 *
 * `defineWidget` (the identity helper every unit default-exports), the label
 * resolvers the shell and the settings pages call, the instance-key pair, and
 * `sizesOf`. These are the only part of the contract that needed i18n — which is
 * exactly why they are in their own module: a consumer that only needs a TYPE
 * imports `./types` and never loads the dictionary.
 *
 * The shapes themselves are in `./types` (see the contract doc there).
 */
import { t } from '../../i18n'
import type { ConfigField, Widget, WidgetSize } from './types'

/** Instance key = `${widgetId}@${size}` (e.g. `context-water@2x4`). Even the same
 *  widget at two sizes is two independent, co-installable instances. */
export function instanceKey(widgetId: string, size: WidgetSize): string {
  return `${widgetId}@${size}`
}

/** Parse an instance key back into its widget id and size. Unknown sizes fall
 *  back to '2x2' so legacy persisted ids (which are bare widget ids) still work. */
export function parseInstanceKey(key: string): { widgetId: string; size: WidgetSize } {
  const at = key.lastIndexOf('@')
  if (at <= 0) return { widgetId: key, size: '2x2' }
  const size = key.slice(at + 1)
  return size === '2x4' ? { widgetId: key.slice(0, at), size: '2x4' } : { widgetId: key.slice(0, at), size: '2x2' }
}

/** Identity helper with a doc anchor: every widget unit default-exports
 *  `defineWidget({ ... })` so the contract stays self-describing. */
export function defineWidget<W extends Widget>(w: W): W {
  return w
}

/** Resolve a possibly-thunked display label at read time. */
export function resolveLabel(s: string | (() => string) | undefined): string {
  return typeof s === 'function' ? s() : s ?? ''
}

export function widgetName(w: Widget): string {
  return resolveLabel(w.name)
}

export function widgetDesc(w: Widget): string {
  return resolveLabel(w.desc)
}

export function widgetBadgeLabel(w: Widget): string | undefined {
  return typeof w.badgeLabel === 'function' ? w.badgeLabel() : w.badgeLabel
}

export function widgetSimToggle(w: Widget): string | undefined {
  return typeof w.simToggle === 'function' ? w.simToggle() : w.simToggle
}

/** Resolve a config field's label (thunk-aware). */
export function fieldLabel(f: ConfigField): string {
  return resolveLabel(f.label)
}

/** Resolve a mode option's [value, label] pair label. */
export function optionLabel(o: [string, string | (() => string)]): string {
  return resolveLabel(o[1])
}

/** Badge text for a widget. */
export function badgeOf(w: Widget): string {
  return widgetBadgeLabel(w) ?? (w.builtin ? t('badge.system') : t('badge.external'))
}

/** The group key for a widget (its own id when it is not grouped). */
export function groupOf(w: Widget): string {
  return w.group ?? w.id
}

/** The sizes a widget supports, defaulting to 2×2 only. */
export function sizesOf(w: Widget): WidgetSize[] {
  return Array.isArray(w.sizes) && w.sizes.length > 0 ? w.sizes.slice() : ['2x2']
}
