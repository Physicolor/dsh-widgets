/**
 * dsh-widgets — rail grid geometry shared by the deck and the magnification wave.
 *
 * Only values BOTH halves need live here; anything the wave alone uses stays in
 * `rail/wave/RailWave.tsx`, and the layout maths join this module in Phase 2.6.
 */

/**
 * Whether the rail can follow the shell's column track NATIVELY through CSS
 * anchor positioning (`right: anchor(--dsx-center right)`) instead of being
 * repositioned from JS every frame. Both the rail and its magnify overlay are
 * `position: fixed` and the anchor is the AppFrame's center column
 * (`[class$='_centerCol']`, declared in widgets.module.css), so the browser
 * resolves the rail's right edge inside the very layout pass that animates
 * `grid-template-columns`: the rail and the conversation column move as ONE
 * surface —no tween, no frame lag, and none of the per-frame
 * `--dsx-rightbar-w` writes (a :root style invalidation, i.e. a full-document
 * style recalc every animation frame) the fallback path needs.
 */
export const ANCHOR_FOLLOW = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
  && CSS.supports('right: anchor(--dsx-center right)')

export interface WavePlace { s: number; top: number; right: number; w: number; h: number }

/**
 * Where row 0's cards sit inside the rail's scroll content (`placeCards` seats the
 * first row at 2px). Detents are therefore `RAIL_ROW_SEAT + row · pitch`: this is the
 * ONE formula the wheel, the row guard and the verification probes share, so a row can
 * never rest 2px away from where another code path expects it.
 */
export const RAIL_ROW_SEAT = 2
