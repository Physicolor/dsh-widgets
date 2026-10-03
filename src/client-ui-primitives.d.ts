/**
 * Types for the product's own UI kit, `@deepseek-ai/dsh-client-ui-primitives`.
 *
 * WHY THIS FILE EXISTS: plugins may — and per this repository's control rules,
 * MUST — import the shipped primitives at runtime. The loader's frozen platform
 * table already resolves the package (`@omdsh-dev/dsh-genui` has required it from
 * its bundle since v0.1), but it ships no `.d.ts`, so TypeScript needs this shim.
 * Only what this plugin uses is declared; the real signatures live in the shipped
 * `lib/index.js`, where `Menu` destructures `{ open, anchor, items, children,
 * selectedId, selectedIds, onSelect, onClose, align, side, portal,
 * closeOnPointerLeave, dense, compact, autoFocus, selection, getAnchorRect,
 * footer, className, listClassName }`.
 *
 * A hand-styled control is NOT a substitute: a native `<select>` opens the
 * browser's own popup no matter how the closed pill looks. Render these.
 */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type * as React from 'react'

  /** One row of `Menu`. */
  export interface MenuItem {
    id: string
    label?: React.ReactNode
    icon?: React.ReactNode
    disabled?: boolean
    danger?: boolean
    shortcut?: { aria?: string; keys: readonly string[] }
    submenu?: readonly MenuItem[]
  }

  /** The product's dropdown: trigger (`anchor`) + the portalled, translucent surface. */
  export function Menu(props: {
    /** Whether the surface is showing. */
    open: boolean
    /** The trigger element the surface is anchored to. */
    anchor: React.ReactNode
    items?: readonly MenuItem[]
    /** Id of the selected row; with the default `selection="check"` it draws the product's check. */
    selectedId?: string
    onSelect?: (id: string) => void
    onClose?: () => void
    /** `"end"` flushes the surface's right edge with the anchor's, as the settings rows do. */
    align?: 'start' | 'end'
    side?: 'top' | 'bottom'
    /** Render the surface into `document.body` (the settings rows use this). */
    portal?: boolean
    dense?: boolean
    /** The product's small menu variant (24px rows, 11px text). */
    compact?: boolean
    autoFocus?: boolean
    selection?: 'check' | 'fill'
    className?: string
    listClassName?: string
    footer?: readonly MenuItem[]
  }): React.ReactElement

  /** The product's chevron, as the settings Select's trigger draws it. */
  export function IconChevronDownOutlineRegular(props: { className?: string }): React.ReactElement
}
