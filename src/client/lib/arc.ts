/**
 * dsh-widgets — the round-capped arc's ink length (shared, pure).
 *
 * A progress donut is drawn as one dash: `strokeDasharray = ink, circumference`.
 * With `strokeLinecap: 'round'` the paint extends `stroke / 2` BEYOND each end, so a
 * value that is merely close to 100% has its two caps meet and swallow the gap — the
 * ring reads as a CLOSED circle at 99%, which is a lie the number beside it has to
 * correct (the owner's report, 2026-09-28: 「只有 100 才是彻底闭环的圆」).
 *
 * So the usable arc is the circumference MINUS the two cap allowances and a minimum
 * daylight, and 100% is the only value that closes:
 *  - `ratio >= 1` → the full circumference (a closed ring, caps irrelevant);
 *  - otherwise    → `ratio × usable`, where `usable = c − stroke − capGap`, which
 *    guarantees `c − ink − stroke >= capGap` of empty track between the caps.
 *
 * The ring is therefore a QUALITATIVE dial (head and tail always visible); the exact
 * figure is the number the card prints at 20px, and the ring's hover text.
 */

/**
 * Ink length in px for a round-capped progress arc.
 *
 * @param ratio - filled fraction (0..1; values ≥ 1 close the ring).
 * @param circumference - the ring's circumference in px.
 * @param stroke - arc thickness in px (its round caps extend stroke/2 each side).
 * @param capGap - minimum daylight between the caps below 100% (px, scaled by caller).
 * @returns the dash length to paint.
 */
export function cappedArcInk(ratio: number, circumference: number, stroke: number, capGap = 2): number {
  if (!Number.isFinite(circumference) || circumference <= 0) return 0
  const r = Number.isFinite(ratio) ? Math.max(0, ratio) : 0
  if (r >= 1) return circumference
  const usable = Math.max(0, circumference - stroke - Math.max(0, capGap))
  return Math.min(circumference, r * usable)
}
