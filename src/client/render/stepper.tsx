/**
 * `Stepper` — the product's numeric control (the pill + hover arrows that the
 * settings page draws for 字号大小), transcribed from the live control because
 * the product's UI kit exports NO numeric component.
 *
 * WHAT WAS MEASURED (2026-10-01, live DOM, Settings → General → 字号大小):
 *   control   inline-flex, gap 8
 *   pill      72x36, radius var(--dsw-radius-md) 12, fill
 *             --dsw-alias-bg-module-platform, value span 18x22 at 14px/22px
 *             (tabular figures)
 *   arrows    absolute, right 8, column, gap 2, opacity 0 — revealed on
 *             hover/focus-within; each button 17x12, radius 4, fill
 *             color-mix(in srgb, var(--dsw-alias-bg-layer-1) 75%, transparent)
 *   unit      separate label after the pill at 14px/22px,
 *             --dsw-alias-label-secondary
 *
 * WHY A SLIDER IS NOT USED (see the plugin dev guide §2.5 for the rule):
 * a slider communicates "explore the range", not "set this value": it cannot
 * show a precise number, and the product ships no slider style at all — it uses
 * this stepper for every numeric setting, a `Menu` for every discrete choice and
 * a `Switch` for every boolean.
 */

import * as React from 'react'

/** Props of {@link Stepper}. */
export interface StepperProps {
  /** The persisted value. */
  value: number
  /** Called with the clamped next value. */
  onChange: (value: number) => void
  /** Smallest allowed value (also disables the down arrow). */
  min: number
  /** Largest allowed value (also disables the up arrow). */
  max: number
  /** Increment per arrow press. */
  step?: number
  /** Unit printed after the pill ('' hides it). */
  unit?: string
  /** Value renderer; defaults to the plain number (use it for fractions). */
  format?: (value: number) => string
}

/**
 * Numeric stepper. Controlled: this panel re-renders from the bridge snapshot on
 * every prefs write, so the pill always shows the persisted value.
 * @param props - see {@link StepperProps}.
 * @returns the control (pill + arrows + unit).
 */
export function Stepper({ value, onChange, min, max, step = 1, unit = '', format }: StepperProps): React.ReactElement {
  const show = format ?? ((next: number) => String(next))
  const bump = (delta: number): void => {
    /* Steps keep three decimals, so a 0.05 step never accumulates binary dust
     * (1.1 + 0.05 would otherwise print as 1.1500000000000001). */
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 1000) / 1000))
    if (next === value) return
    onChange(next)
  }
  const arrow = (key: 'up' | 'down', delta: number, disabled: boolean): React.ReactElement =>
    React.createElement('button', {
      key,
      type: 'button',
      className: 'dsx-stepper-arrow',
      disabled,
      'aria-label': `${delta > 0 ? '+' : ''}${delta}${unit}`,
      onClick: () => { bump(delta) },
    }, React.createElement('svg', { width: 9, height: 9, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
      React.createElement('path', {
        d: key === 'up' ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
      })))

  return React.createElement('div', { className: 'dsx-stepper-control' }, [
    React.createElement('div', { key: 'pill', className: 'dsx-stepper' }, [
      React.createElement('span', { key: 'value', className: 'dsx-stepper-value' }, show(value)),
      React.createElement('span', { key: 'arrows', className: 'dsx-stepper-arrows' }, [
        arrow('up', step, value >= max),
        arrow('down', -step, value <= min),
      ]),
    ]),
    unit === '' ? null : React.createElement('span', { key: 'unit', className: 'dsx-stepper-unit' }, unit),
  ])
}
