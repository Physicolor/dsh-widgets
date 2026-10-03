/**
 * `CurveEditor` — the open/close easing, drawn instead of picked from a list.
 *
 * WHY A DRAWING AND NOT A SELECT: the rail's enter animation is a
 * `cubic-bezier()` transition, i.e. exactly the two control points this control
 * edits, so "adjust the curve" and "drag these two dots" are the same act. A
 * named-easing dropdown would have offered five of them and no way to reach the
 * curve the user actually has in mind.
 *
 * The drawn curve is the WHOLE state (`AnimCurve` is four numbers, endpoints
 * fixed at (0,0)→(1,1)); a preset is just a named value of that state, so
 * "custom" is derived (no preset matches) rather than stored — there is no second
 * representation that could drift from the drawing.
 *
 * The dot underneath the field replays the curve in real time: it travels
 * horizontally at a constant speed (time) while its vertical motion follows the
 * easing (progress). Two nested `<g>`s and two keyframe animations do that with
 * no per-frame script — the outer one is `linear` along X, the inner one carries
 * the user's curve along Y.
 */

import * as React from 'react'
import { curveToEasing, type AnimCurve } from '../runtime/prefs'
import { t } from '../i18n'

/** One named curve in the preset row. */
export interface CurvePreset {
  id: string
  /** i18n key of the label. */
  key: string
  curve: AnimCurve
}

/**
 * The presets. `sqrt` is the default (see DEFAULT_ANIM_CURVE) — it is the
 * "grows into place" shape the owner asked for; `easeOut` is its milder cousin,
 * `smooth` is the shell's own ease-in-out (the curve a user who wants the rail to
 * move with the rest of the shell should pick), and `standard`/`linear` bracket
 * the range for comparison.
 */
export const CURVE_PRESETS: readonly CurvePreset[] = [
  { id: 'linear', key: 'settings.animCurve.linear', curve: { x1: 0, y1: 0, x2: 1, y2: 1 } },
  { id: 'standard', key: 'settings.animCurve.standard', curve: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 } },
  { id: 'easeOut', key: 'settings.animCurve.easeOut', curve: { x1: 0, y1: 0, x2: 0.58, y2: 1 } },
  { id: 'sqrt', key: 'settings.animCurve.sqrt', curve: { x1: 0.31, y1: 0.66, x2: 0.51, y2: 1 } },
  { id: 'smooth', key: 'settings.animCurve.smooth', curve: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 } },
]

/** Is `a` the same curve as `b`? (Value equality — the state IS the value.) */
export function sameCurve(a: AnimCurve, b: AnimCurve): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
}

/** Which preset (label key) the value currently equals, or null for a custom one. */
export function presetOf(c: AnimCurve): CurvePreset | null {
  for (const p of CURVE_PRESETS) if (sameCurve(p.curve, c)) return p
  return null
}

/** The field's side (px). `CURVE_SPAN` is mirrored in the keyframes — see below. */
const CURVE_SIZE = 168
const CURVE_PAD = 20
const CURVE_SPAN = CURVE_SIZE - CURVE_PAD * 2

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** The editor's field: a 1×1 plot with a draggable control point per corner. */
export interface CurveEditorProps {
  value: AnimCurve
  onChange: (next: AnimCurve) => void
}

/**
 * Draw + edit + replay one easing.
 * @param props - see {@link CurveEditorProps}.
 * @returns the field (SVG) with both handles.
 */
export function CurveEditor({ value, onChange }: CurveEditorProps): React.ReactElement {
  const svgRef = React.useRef<SVGSVGElement | null>(null)
  /** Which handle the pointer currently owns (null = not dragging). */
  const dragRef = React.useRef<0 | 1 | null>(null)
  // Field → screen. Y is flipped so the plot reads like every easing editor.
  const px = (x: number): number => CURVE_PAD + x * CURVE_SPAN
  const py = (y: number): number => CURVE_SIZE - CURVE_PAD - y * CURVE_SPAN
  /**
   * Pointer position in curve space.
   *
   * Measured against the SVG's own rect rather than assumed 1:1: the control is
   * reused inside the settings page AND the (resizable, hence narrower) 组件设置
   * panel, and a CSS-driven shrink would otherwise put the handle somewhere other
   * than under the pointer.
   */
  const read = (e: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const el = svgRef.current
    if (el === null) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    const k = CURVE_SIZE / r.width
    const sx = (e.clientX - r.left) * k
    const sy = (e.clientY - r.top) * k
    return { x: clamp01((sx - CURVE_PAD) / CURVE_SPAN), y: clamp01(1 - (sy - CURVE_PAD) / CURVE_SPAN) }
  }
  const drag = (e: React.PointerEvent): void => {
    const which = dragRef.current
    if (which === null) return
    const p = read(e)
    if (p === null) return
    onChange(which === 0 ? { ...value, x1: p.x, y1: p.y } : { ...value, x2: p.x, y2: p.y })
  }
  const release = (e: React.PointerEvent): void => {
    if (dragRef.current === null) return
    dragRef.current = null
    const el = svgRef.current
    if (el !== null && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  }
  const grab = (which: 0 | 1) => (e: React.PointerEvent<SVGCircleElement>): void => {
    dragRef.current = which
    // Capture on the SVG, not the circle: the handle is 9px across, and a drag
    // that outruns it would otherwise stop updating the moment the pointer left
    // the dot (which is what a "the curve sticks while I drag fast" report is).
    svgRef.current?.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  /** Arrow keys move the focused handle: ←/→ along time, ↑/↓ along progress. */
  const nudge = (which: 0 | 1) => (e: React.KeyboardEvent): void => {
    const step = e.shiftKey ? 0.1 : 0.02
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
    const dy = e.key === 'ArrowDown' ? -step : e.key === 'ArrowUp' ? step : 0
    if (dx === 0 && dy === 0) return
    e.preventDefault()
    const next = which === 0
      ? { ...value, x1: clamp01(value.x1 + dx), y1: clamp01(value.y1 + dy) }
      : { ...value, x2: clamp01(value.x2 + dx), y2: clamp01(value.y2 + dy) }
    onChange(next)
  }
  const handle = (which: 0 | 1, hx: number, hy: number): React.ReactElement =>
    React.createElement('circle', {
      key: `h${which}`,
      className: 'dsx-curve-handle',
      cx: px(hx), cy: py(hy), r: 5,
      tabIndex: 0,
      role: 'button',
      'aria-label': `${t('settings.animCurve.title')} ${which + 1} (${hx.toFixed(2)}, ${hy.toFixed(2)})`,
      onPointerDown: grab(which),
      onKeyDown: nudge(which),
    })
  const path = `M${px(0)},${py(0)} C${px(value.x1)},${py(value.y1)} ${px(value.x2)},${py(value.y2)} ${px(1)},${py(1)}`
  return React.createElement('svg', {
    ref: svgRef,
    className: 'dsx-curve-svg',
    width: CURVE_SIZE, height: CURVE_SIZE, viewBox: `0 0 ${CURVE_SIZE} ${CURVE_SIZE}`,
    'aria-label': t('settings.animCurve.title'),
    onPointerMove: drag,
    onPointerUp: release,
    onPointerCancel: release,
  },
    React.createElement('rect', { key: 'field', className: 'dsx-curve-field', x: CURVE_PAD, y: CURVE_PAD, width: CURVE_SPAN, height: CURVE_SPAN, rx: 8 }),
    React.createElement('path', { key: 'diag', className: 'dsx-curve-diag', d: `M${px(0)},${py(0)} L${px(1)},${py(1)}` }),
    React.createElement('path', { key: 'arm1', className: 'dsx-curve-arm', d: `M${px(0)},${py(0)} L${px(value.x1)},${py(value.y1)}` }),
    React.createElement('path', { key: 'arm2', className: 'dsx-curve-arm', d: `M${px(1)},${py(1)} L${px(value.x2)},${py(value.y2)}` }),
    React.createElement('path', { key: 'line', className: 'dsx-curve-line', d: path }),
    // The replay dot: outer g = time (linear), inner g = progress (the curve).
    React.createElement('g', { key: 'dot', className: 'dsx-curve-dot-x' },
      React.createElement('g', { className: 'dsx-curve-dot-y', style: { animationTimingFunction: curveToEasing(value) } },
        React.createElement('circle', { className: 'dsx-curve-dot', cx: px(0), cy: py(0), r: 4 }))),
    handle(0, value.x1, value.y1),
    handle(1, value.x2, value.y2),
  )
}
