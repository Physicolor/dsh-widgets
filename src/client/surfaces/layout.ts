/**
 * dsh-widgets —the settings/market window metrics.
 *
 * Shared by the config tab (its list + drawer) and the market (its list/gallery), so the
 * two surfaces open with the same proportions and the panel can size itself once.
 */

/** 组件配置's two column widths + the gutter between them. LIST_W is the
 *  installed list's fixed column; DETAIL_W is the drawer's MINIMUM width — the
 *  panel is sized to fit both, and any extra width goes to the drawer (preview +
 *  metric columns), so a wide panel never leaves a dead band on the right.
 *  COL_GAP is copied from the OFFICIAL settings window (measured 2026-09-26: nav
 *  164px, content 612px, a 12px gutter between them, rows padded 12/16) — the
 *  same relative language, our own absolute sizes. */
export const LIST_W = 190
export const DETAIL_W = 440
export const COL_GAP = 12
