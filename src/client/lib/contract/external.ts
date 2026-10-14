/**
 * dsh-widgets — the THIRD-PARTY UNIT contract (ARCH-004 / roadmap `widgets-market`).
 *
 * A widget unit that does not ship inside this repo may be contributed at runtime
 * by another client bundle. It must pass the SAME rules the build pipeline applies
 * to a built-in unit, because "reviewed" has to mean something: a bundle that
 * skips review must not be able to (a) impersonate a built-in, (b) wait for a data
 * source that does not exist, or (c) list itself in the market in a language the
 * user never sees.
 *
 * The rule list is deliberately shared with `scripts/validate-external-unit.mjs`
 * (the offline review gate a submission runs through) — the browser copy validates
 * at REGISTRATION time, the script validates BEFORE review. Keep the numbers in
 * step when a rule changes.
 *
 *  R1  id is kebab-case, non-empty
 *  R2  `widget.id === manifest.id`
 *  R3  the id is not already registered (built-in or an earlier third-party unit)
 *  R4  `builtin` is NOT true — a third party cannot claim a built-in
 *  R5  sizes ⊆ {2x2, 2x4}, and manifest sizes === descriptor sizes (the same
 *      double-source rule the generator enforces: `sizesOf()` reads the descriptor
 *      while the market/all-instances list reads the manifest)
 *  R6  `source`, when declared, names a DISCOVERED data-source adapter
 *  R7  `skeleton.shape` is a known silhouette; `count`/`rows` are positive integers
 *  R8  BOTH `zh` and `en` carry `widget.<id>.name` and `widget.<id>.desc`
 *      (the market reads those two keys — without them the unit is unlistable)
 *  R9  `render` is a function
 *  R10 `order`, when declared, is an integer
 */
import type { Widget, WidgetSize } from './types'

/** The sizes the rail can seat (see gen-registry.mjs — one list, two readers). */
export const UNIT_SIZES: readonly WidgetSize[] = ['2x2', '2x4']

/** The loading silhouettes a unit may declare (see SkeletonShape). */
export const SKELETON_SHAPES: readonly string[] = ['text', 'rings', 'bars', 'line', 'heatmap', 'figures', 'quotas']

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** The machine-readable half of a unit (what `manifest.json` holds for a built-in). */
export interface ExternalManifest {
  id: string
  order?: number
  group?: string
  builtin?: boolean
  sizes?: WidgetSize[]
  source?: string
  skeleton?: { shape: string; count?: number; rows?: number }
  locale?: { zh?: Record<string, string>; en?: Record<string, string> }
}

/** One third-party widget unit: the manifest + the descriptor it describes. */
export interface ExternalWidgetUnit {
  manifest: ExternalManifest
  widget: Widget
}

/** What the validator needs from the host registry (injected, so it stays pure). */
export interface UnitValidationContext {
  /** Is this id already taken (built-in or an earlier third-party unit)? */
  isTaken(id: string): boolean
  /** Is this `manifest.source` backed by a discovered adapter? */
  hasSource(id: string): boolean
}

/** The sizes a descriptor declares, defaulting to 2×2 (see `sizesOf`). */
function descriptorSizes(widget: Widget): WidgetSize[] {
  return Array.isArray(widget.sizes) && widget.sizes.length > 0 ? widget.sizes.slice() : ['2x2']
}

/** Validate one third-party unit. Returns the list of violations ([] = acceptable). */
export function validateExternalUnit(unit: ExternalWidgetUnit, ctx: UnitValidationContext): string[] {
  const errors: string[] = []
  const { manifest, widget } = unit ?? ({} as ExternalWidgetUnit)
  if (manifest === undefined || widget === undefined || manifest === null || widget === null) {
    return ['R1 unit must be { manifest, widget }']
  }
  const id = typeof manifest.id === 'string' ? manifest.id : ''
  if (!ID_RE.test(id)) errors.push(`R1 manifest.id "${String(manifest.id)}" is not kebab-case`)
  if (widget.id !== id) errors.push(`R2 widget.id "${String(widget.id)}" !== manifest.id "${id}"`)
  if (id !== '' && ctx.isTaken(id)) errors.push(`R3 id "${id}" is already registered`)
  if (manifest.builtin === true) errors.push('R4 a third-party unit must not declare builtin: true')

  // Typed as the contract's own union, but the values are UNTRUSTED at runtime —
  // every one of them is range-checked by the loop below.
  const manifestSizes: WidgetSize[] = Array.isArray(manifest.sizes) && manifest.sizes.length > 0
    ? manifest.sizes.slice()
    : ['2x2']
  for (const s of manifestSizes) if (!UNIT_SIZES.includes(s)) errors.push(`R5 unsupported size "${String(s)}"`)
  const sizes = descriptorSizes(widget)
  for (const s of sizes) if (!UNIT_SIZES.includes(s)) errors.push(`R5 descriptor size "${String(s)}" unsupported`)
  const norm = (a: WidgetSize[]) => a.slice().sort().join(',')
  if (norm(manifestSizes) !== norm(sizes)) {
    errors.push(`R5 manifest sizes [${manifestSizes.join(', ')}] !== descriptor sizes [${sizes.join(', ')}] (sizesOf() reads the descriptor)`)
  }

  if (manifest.source !== undefined) {
    if (typeof manifest.source !== 'string' || !ctx.hasSource(manifest.source)) {
      errors.push(`R6 source "${String(manifest.source)}" names no data-source adapter`)
    }
  }

  if (manifest.skeleton !== undefined) {
    const sk = manifest.skeleton
    if (sk === null || typeof sk !== 'object' || Array.isArray(sk)) {
      errors.push('R7 skeleton must be an object like { "shape": "figures", "count": 3 }')
    } else {
      if (!SKELETON_SHAPES.includes(String(sk.shape))) errors.push(`R7 skeleton.shape "${String(sk.shape)}" is not one of ${SKELETON_SHAPES.join(' | ')}`)
      for (const k of Object.keys(sk)) if (!['shape', 'count', 'rows'].includes(k)) errors.push(`R7 unknown skeleton key "${k}"`)
      for (const k of ['count', 'rows'] as const) {
        const v = sk[k]
        if (v !== undefined && (!Number.isInteger(v) || (v as number) < 1)) errors.push(`R7 skeleton.${k} must be a positive integer`)
      }
    }
  }

  for (const loc of ['zh', 'en'] as const) {
    const dict = manifest.locale?.[loc]
    for (const key of [`widget.${id}.name`, `widget.${id}.desc`]) {
      if (dict === undefined || typeof dict[key] !== 'string' || dict[key] === '') {
        errors.push(`R8 locale.${loc} is missing "${key}" (the market reads it)`)
      }
    }
  }

  if (typeof widget.render !== 'function') errors.push('R9 widget.render must be a function')
  if (manifest.order !== undefined && !Number.isInteger(manifest.order)) errors.push('R10 order must be an integer')
  return errors
}
