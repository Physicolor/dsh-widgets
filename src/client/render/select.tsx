/**
 * `Select` — the product's dropdown, drawn by the PRODUCT'S OWN component.
 *
 * This replaces the native `<select class="dsx-select">` the settings rows used to
 * render. Styling the closed pill to look like the product's trigger was never
 * enough: a native control opens the BROWSER's popup (white list, blue highlight,
 * OS metrics) while the product opens its own portalled, translucent surface with
 * the check on the chosen row. The only fix is to render the product's component,
 * which is what this file does.
 *
 * The call mirrors the product's own settings row —
 * `@deepseek-ai/dsh-client-ui-permission-presets`' `PermissionRow`:
 *
 *   Menu({ open, onClose, items: options.map(o => ({ id, label })),
 *          selectedId, onSelect, align: 'end', portal: true,
 *          anchor: <button className={styles.selector} aria-haspopup="menu"
 *                          aria-expanded={open} onClick={toggle}>
 *                    {label}<IconChevronDownOutlineRegular className={styles.chevron}/>
 *                  </button> })
 *
 * `.dsx-select` carries the product's trigger recipe (see
 * `styles/market.module.css`; measured against the live settings page on
 * 2026-09-30), and `.dsx-select--compact` is the small chrome variant for the
 * config drawer's card-size picker, which passes `compact` to the menu too.
 */

import * as React from 'react'
import { IconChevronDownOutlineRegular, Menu, type MenuItem } from '@deepseek-ai/dsh-client-ui-primitives'

/** One choice of a {@link Select}. */
export interface SelectOption {
  /** Value handed back by `onChange`. */
  value: string
  /** Row text, also the trigger's text while this choice is current. */
  label: string
}

/** Props of {@link Select}. */
export interface SelectProps {
  /** The current value. */
  value: string
  /** The choices, in display order. */
  options: readonly SelectOption[]
  /** Called with the picked value (never with the current one). */
  onChange: (value: string) => void
  /** Tooltip / accessible name of the trigger. */
  title?: string
  /** The product's small menu variant, for chrome-sized pickers. */
  compact?: boolean
}

/**
 * A controlled single-choice dropdown in the product's own Select language.
 * @param props - see {@link SelectProps}.
 * @returns the trigger button and, while open, the product's menu surface.
 */
export function Select({ value, options, onChange, title, compact = false }: SelectProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const current = options.find((option) => option.value === value) ?? options[0]
  const items: MenuItem[] = options.map((option) => ({ id: option.value, label: option.label }))

  return Menu({
    open,
    items,
    selectedId: value,
    align: 'end',
    portal: true,
    compact,
    onSelect: (id) => {
      setOpen(false)
      if (id !== value) onChange(id)
    },
    onClose: () => { setOpen(false) },
    anchor: React.createElement('button', {
      type: 'button',
      className: compact ? 'dsx-select dsx-select--compact' : 'dsx-select',
      title,
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      onClick: () => { setOpen((previous) => !previous) },
    }, [
      React.createElement('span', { key: 'label', className: 'dsx-select-label' }, current?.label ?? ''),
      React.createElement(IconChevronDownOutlineRegular, { key: 'chevron', className: 'dsx-select-chevron' }),
    ]),
  })
}
