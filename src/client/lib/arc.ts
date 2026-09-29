/**
 * dsh-widgets — the round-capped arc's ink length (shared, pure).
 *
 * A progress donut is drawn as one dash: `strokeDasharray = ink, circumference`.
 * With `strokeLinecap: 'round'` the paint extends `stroke / 2` BEYOND each end, so a
 * value that is merely close to 100% has its two caps meet and swallow the gap — the
 * ring reads as a CLOSED circle at 99%, which is a lie the number beside it has to
 * correct (the owner's report, 2026-09-28: 「只有 100 才是彻底闭环的圆」).
 *
 * So the ink comes from the PAINTED extent, which is what a reader compares with the
 * number (the owner's second report, 2026-09-29: 「明明 99% 怎么看着圆环百分比不像
 * 99%」):
 *  - `ratio >= 1` → `ratio × circumference` (100% closes the ring; ABOVE 100% — only
 *    a dial that opts into overshoot uses that, see `Donut`'s `overshoot` — returns
 *    more than one lap so the caller can paint the over-budget lap);
 *  - otherwise    → `ratio × c − stroke`, because the two round caps already paint
 *    `stroke` px past the dash. The bare track left over is exactly `(1 − ratio) × c`:
 *    **99% shows 1% of gap**, the reading the figure beside it promises.
 *
 * Scaling `c − stroke − capGap` by the ratio (the first formula) put a fixed ~7px gap
 * on a 99% ring — ≈5% of the circle, i.e. it read as 95%. `capGap` is now only a
 * FLOOR for the last fraction of a percent, so 100% stays the only value that closes.
 *
 * The ring is still a QUALITATIVE dial (head and tail always visible); the exact
 * figure is the number the card prints at 20px, and the ring's hover text.
 */

/**
 * Ink length in px for a round-capped progress arc.
 *
 * @param ratio - filled fraction (0..; 1 closes the ring, > 1 asks for an overshoot lap).
 * @param circumference - the ring's circumference in px.
 * @param stroke - arc thickness in px (its round caps extend stroke/2 each side).
 * @param capGap - smallest gap the ring may show below 100% (px, scaled by caller).
 * @returns the dash length to paint.
 */
export function cappedArcInk(ratio: number, circumference: number, stroke: number, capGap = 2): number {
  if (!Number.isFinite(circumference) || circumference <= 0) return 0
  const r = Number.isFinite(ratio) ? Math.max(0, ratio) : 0
  if (r >= 1) return circumference * r
  // Painted extent = ink + stroke (the two caps), so `ratio · c` of the circle is an
  // ink of `ratio · c − stroke`.
  const want = r * circumference - stroke
  const maxInk = Math.max(0, circumference - stroke - Math.min(capGap, (1 - r) * circumference))
  if (want <= 0) {
    // A share thinner than one stroke cannot be drawn as an arc: show a cap-sized dot at
    // 12 o'clock rather than nothing at all (the figure beside it is exact).
    return r > 0 ? Math.min(maxInk, stroke * 0.5) : 0
  }
  return Math.min(want, maxInk)
}
