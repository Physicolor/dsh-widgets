/**
 * dsh-widgets — card geometry.
 *
 * One base side (150px) drives every scale in the plugin; the corner is a SHARE of
 * the card's short side, not a fixed radius, so a magnified card keeps the same
 * corner-to-side relation. Shared by the card renderer and the settings/market
 * surfaces that preview cards.
 */

import { DEFAULT_CORNER_PERCENT } from '../runtime/prefs'

/** The base card side all scales derive from. */
export const BASE_SIDE = 150

/** The standard gap between a card's title row and the row under it (the
 *  `headAfter` figure row), in px at side 150 — the 4px step of the app's
 *  4/8/12/16 spacing rhythm. It is DELIBERATELY bigger than the 2px a grey
 *  caption needs: a 20px figure directly under the title reads as cramped, and
 *  the user asked for the same "standard spacing" the 上下文水位 card uses. */
export const HEAD_GAP_PX = 4

/** Corner-radius gears, as a PERCENT of the card's short side (Settings →
 *  圆角档位). Percent, not px: the reference (an iOS-style widget) keeps the
 *  corner-to-side RELATION fixed, so a 150px card and a magnified 190px card
 *  must not get the same corner. 12% ≈ the old fixed 16px at side 150 and the
 *  reference card's own ratio; 16% is the default because the same ratio reads
 *  sharper on a small card than on the ~480px card the reference is drawn at. */
export const CORNER_GEARS: number[] = [12, 16, 20, 24]
/** Corner radius in px for a card of short side `unit`. */
export function cardRadius(unit: number, percent: number = DEFAULT_CORNER_PERCENT): number {
  const p = Number.isFinite(percent) ? Math.max(8, Math.min(28, percent)) : DEFAULT_CORNER_PERCENT
  return Math.round(unit * (p / 100))
}
/** Content inset. It does NOT follow the corner: the card's reference ratio is
 *  the CORNER's (16% of the short side), while the content sits close to the
 *  edge — a padded-out inset pushed the title visibly away from the card's left
 *  and top edges, which is the relationship the reference card does not have.
 *  Flat 12 · scale, i.e. 12px at the plugin's 150px default, as it always was. */
export function cardInnerPad(unit: number): number {
  return Math.round(12 * (unit / BASE_SIDE))
}
