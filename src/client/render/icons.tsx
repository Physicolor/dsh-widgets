/**
 * dsh-widgets —the surface icons (official ui-primitives paths).
 *
 * Plain `createElement` SVG, no icon dependency: the paths are the ones the official
 * settings/market chrome uses so the plugin reads as part of the same product.
 */

import * as React from 'react'

// ---- Icons (official ui-primitives paths) ----


const TRASH_PATH = 'M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z'

export const TrashIcon = (): React.ReactElement => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: TRASH_PATH, fill: 'currentColor' }))

const CHEV_LEFT = 'M8.5 2.15137L8.07617 2.57617L5.34863 5.30273C5.09294 5.55843 4.86618 5.78438 4.70215 5.98828C4.53117 6.20088 4.38244 6.44405 4.33398 6.75C4.30778 6.91565 4.30778 7.08435 4.33398 7.25C4.38244 7.55595 4.53117 7.79912 4.70215 8.01172C4.86618 8.21561 5.09294 8.44157 5.34863 8.69727L8.07617 11.4238L8.5 11.8486L9.34863 11L8.92383 10.5762L6.19727 7.84863C5.92268 7.57405 5.75151 7.40124 5.6377 7.25977C5.53096 7.12709 5.52187 7.07728 5.51953 7.0625C5.51297 7.02105 5.51297 6.97895 5.51953 6.9375C5.52187 6.92272 5.53096 6.87291 5.6377 6.74023C5.75152 6.59876 5.92268 6.42595 6.19727 6.15137L8.92383 3.42383L9.34863 3L8.5 2.15137Z'

const CHEV_RIGHT = 'M5.5 2.15137L5.92383 2.57617L8.65137 5.30273C8.90706 5.55843 9.13382 5.78438 9.29785 5.98828C9.46883 6.20088 9.61756 6.44405 9.66602 6.75C9.69222 6.91565 9.69222 7.08435 9.66602 7.25C9.61756 7.55595 9.46883 7.79912 9.29785 8.01172C9.13382 8.21561 8.90706 8.44157 8.65137 8.69727L5.92383 11.4238L5.5 11.8486L4.65137 11L5.07617 10.5762L7.80273 7.84863C8.07732 7.57405 8.24849 7.40124 8.3623 7.25977C8.46904 7.12709 8.47813 7.07728 8.48047 7.0625C8.48703 7.02105 8.48703 6.97895 8.48047 6.9375C8.47813 6.92272 8.46904 6.87291 8.3623 6.74023C8.24848 6.59876 8.07732 6.42595 7.80273 6.15137L5.07617 3.42383L4.65137 3L5.5 2.15137Z'

export const ChevronLeftIcon = (): React.ReactElement => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: CHEV_LEFT, fill: 'currentColor' }))
export const ChevronRightIcon = (): React.ReactElement => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: CHEV_RIGHT, fill: 'currentColor' }))
/** Close glyph for the 组件配置 preview drawer (same shape as the panel's own). */
export const closeIconSmall = React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z', fill: 'currentColor' }),
)
/** Market view toggle + the search field's leading magnifier (official shapes). */
export const listViewIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M2.5 4.25h11M2.5 8h11M2.5 11.75h11', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
)
export const gridViewIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('rect', { x: 2.5, y: 2.5, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
  React.createElement('rect', { x: 8.9, y: 2.5, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
  React.createElement('rect', { x: 2.5, y: 8.9, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
  React.createElement('rect', { x: 8.9, y: 8.9, width: 4.6, height: 4.6, rx: 1.4, fill: 'currentColor' }),
)
export const searchIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('circle', { cx: 7, cy: 7, r: 4.6, stroke: 'currentColor', strokeWidth: 1.5 }),
  React.createElement('path', { d: 'M10.6 10.6L14 14', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
)
/**
 * The database / token-store glyph: a stroked cylinder (top ellipse, two sides,
 * a middle band and the bottom's front arc).
 *
 * The shape follows Lucide's `database` glyph (ISC) — the owner pointed at exactly
 * this cylinder (2026-09-28); the coordinates are re-authored in this repo's own
 * 16×16 grid with the 1.6 stroke of the other stroked glyphs here
 * (listViewIcon/searchIcon use 1.5). `currentColor`, so a card can paint it in its
 * own tone — the cache card paints it the same green/red as its ring arc.
 */
export const databaseIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('ellipse', { cx: 8, cy: 3.4, rx: 6, ry: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
  React.createElement('path', { d: 'M2 3.4V12.6M14 3.4V12.6', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
  React.createElement('path', { d: 'M2 12.6a6 2.1 0 0 0 12 0', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
  React.createElement('path', { d: 'M2 8a6 2.1 0 0 0 12 0', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
)

/**
 * The disk glyph of the 缓存命中 card's head ring: a drive body (slanted shoulders,
 * rounded bottom corners) with the bay slot line across it. Lucide's `hard-drive`
 * (ISC), re-authored on this file's 16×16 grid (24-grid ÷1.5) — the same provenance
 * as `databaseIcon` above.
 *
 * HOW HEAVY IT IS, AND WHY IT IS NOT HEAVIER. The ring it sits in is stroked
 * `round(5 · scale)` at a 52 · scale box while the glyph is a 16 grid drawn at
 * 20 · scale, so the weights compare 1:1.25; every other glyph here (1.6, i.e.
 * 2px) reads as a thin detail floating in a fat circle, and the owner's rule is
 * that the ring's middle must not look weak. Three passes settled on **2.8**
 * (visual 3.5px, 70% of the ring): 4.0 (= the ring's own 5px) closed the body's
 * three horizontal bands into a slab, and 3.2 (4px) still read heavy on a live
 * card. Do not raise it back.
 *
 * THE INDICATOR DOTS ARE DELIBERATELY ABSENT. Lucide puts two under the slot; at
 * this stroke their diameter IS the stroke (4px at a 20px glyph) and the clear band
 * between the slot and the bottom edge is ~2.7px, so they land as two lumps glued
 * to the slot line. The body + slot pair is what still reads as a drive at 16px.
 *
 * `currentColor`, so the ring paints it in its own tone (the cache card paints it
 * the same green/red as its arc).
 */
export const hardDriveIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M3.63 3.41 1.33 8v4a1.33 1.33 0 0 0 1.33 1.33h10.67A1.33 1.33 0 0 0 14.67 12V8l-2.3-4.59A1.33 1.33 0 0 0 11.17 2.67H4.83a1.33 1.33 0 0 0-1.2.74z', stroke: 'currentColor', strokeWidth: 2.8, strokeLinejoin: 'round' }),
  React.createElement('path', { d: 'M1.33 8h13.34', stroke: 'currentColor', strokeWidth: 2.8, strokeLinecap: 'round' }),
)

// ---- Head-accessory glyphs (added 2026-09-29 for the permission / vendor / power cards) ----

/**
 * The three PERMISSION glyphs, copied path-for-path from the official permission
 * selector (`@deepseek-ai/dsh-client-ui-conversation/lib/client.js`, `permissionGlyphs`).
 *
 * They are reproduced rather than imported because DSH's icon paths are not a
 * published API — but they are the SAME drawings, so the rail reads as the product:
 * a shield with a check (read-only), a shield with a list and a pencil
 * (workspace-write), a shield with an exclamation (full access). 16px viewBoxes with
 * `currentColor`, exactly as the source.
 */
const SHIELD_OUTLINE = 'M8.20554 0.899994L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.899994Z'

export const permissionReadOnlyIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: SHIELD_OUTLINE, stroke: 'currentColor', strokeWidth: 1.31831, strokeLinejoin: 'round' }),
  React.createElement('path', { d: 'M12.1654 5.7552L8.9447 9.41475C8.73044 9.65816 8.53628 9.8804 8.35774 10.0423C8.1713 10.2114 7.94235 10.3717 7.64016 10.4254C7.48207 10.4535 7.32 10.4552 7.16151 10.4294C6.85843 10.3801 6.62728 10.2223 6.43836 10.0559C6.25752 9.89653 6.06037 9.67732 5.84264 9.43705L4.72925 8.20897L5.63557 7.38707L6.74897 8.61594C6.98603 8.87755 7.12974 9.03533 7.24673 9.13839C7.31033 9.19443 7.34485 9.21476 7.35823 9.22122C7.38068 9.22484 7.40352 9.22515 7.42593 9.22122C7.40522 9.22502 7.42893 9.23294 7.53583 9.136C7.65132 9.03126 7.79316 8.87139 8.02643 8.60638L11.2479 4.94763L12.1654 5.7552Z', fill: 'currentColor' }),
)

export const permissionWorkspaceWriteIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M8.08887 0.251709C8.20479 0.23085 8.32486 0.241168 8.43652 0.282959L15.0215 2.75171C15.2787 2.84819 15.4492 3.09414 15.4492 3.3689V7.0105C15.4492 7.10986 15.4441 7.2081 15.4414 7.30542C15.0285 7.07175 14.5905 6.87695 14.1309 6.73022V3.82495L8.20508 1.60327L2.2793 3.82495V7.0105C2.27936 9.7171 3.4745 11.5379 5.02734 12.7947C5.01025 12.9942 5 13.1962 5 13.4001C5.00001 13.7617 5.02722 14.1169 5.08008 14.4636C2.91555 13.0393 0.961014 10.752 0.960938 7.0105V3.3689C0.960938 3.09417 1.13146 2.84821 1.38867 2.75171L7.97461 0.282959L8.08887 0.251709Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M11.3525 5.64688V6.85688H5V5.64688H11.3525Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M9.5824 8.29376V9.50376H5V8.29376H9.5824Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M14.6647 15.6852H10.0338C10.3878 15.3751 10.7567 15.0517 11.0772 14.7706C11.2531 14.6164 11.4144 14.4746 11.5511 14.3547H14.6647V15.6852Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M8.14852 14.1308L7.33925 15.4976C7.22458 15.6912 7.42245 15.9194 7.63037 15.8333L9.09785 15.2254L15.0399 10.0719L14.0905 8.97733L8.14852 14.1308Z', fill: 'currentColor' }),
)

export const permissionFullAccessIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: SHIELD_OUTLINE, stroke: 'currentColor', strokeWidth: 1.31831, strokeLinejoin: 'round' }),
  React.createElement('path', { d: 'M9.10094 4.5V8.75939H7.59888V4.5H9.10094Z', fill: 'currentColor' }),
  React.createElement('path', { d: 'M9.10094 9.8114V11.5H7.59888V9.8114H9.10094Z', fill: 'currentColor' }),
)

/**
 * GitHub's own mark (Octicons `mark-github`, 16×16), so the 待我处理 card says which
 * account it is about. Reproduced for the same reason as the permission glyphs: it is
 * the drawing people already recognise, not a re-draw.
 */
export const githubMarkIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
  React.createElement('path', { d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z', fill: 'currentColor' }),
)

/**
 * A LIGHTNING BOLT — the 供电 head's ring glyph.
 *
 * The owner's call (2026-09-29): a bolt says "power source" at a glance, while a
 * battery shape duplicates what the ring's arc already IS (the charge level).
 *
 * The path is Lucide's CURRENT `zap` (`icons/zap.svg`, ISC), fetched rather than
 * remembered: its four corners are already `a1.5 1.5` ARCS, which is what makes the
 * silhouette soft — the previous version used the OLD straight-corner path and the
 * owner read it as angular/ugly. Lucide's own spec says sharp 90° corners of an
 * element this size should carry a ~2px radius; this path is that, authored upstream.
 * ([spec](https://lucide.dev/contribute/icons/specification), [zap](https://lucide.dev/icons/zap))
 *
 * Rendered STROKED with round caps and joins like every other glyph in this file,
 * but at 2.6 (not Lucide's 2.0): at the ring's 20px box a 2.0 stroke reads as a
 * hairline next to 缓存命中's stroked drive, and the heavier weight keeps the bolt
 * solid while the round joins keep it soft.
 *
 * KEEP IT IN THE SOURCE GRID: the box is declared 20px with the native 24-unit
 * viewBox, so the geometry stays bit-identical to upstream and the renderer's
 * `scale(20/16)` lands it at the same visual size as every 16-unit glyph.
 */
export const powerIcon = React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
  React.createElement('path', {
    // Lucide's `zap`, with the CORNER ARCS TIGHTENED (1.5 → 0.7, the neck's 0.5 →
    // 0.25) and the fill kept SOLID (no stroke at all). The owner's two calls,
    // 2026-09-29: 「实心，要实心的闪电」 and 「圆角不要这么大的，小一点圆角」 — the
    // upstream radius is designed for a STROKED 2px icon and reads bulbous once the
    // shape is filled at 20px. Only the arc radii change; every endpoint and line is
    // upstream's, so the silhouette cannot shear the way a hand-rescaled path did.
    d: 'M15.914 4a0.7 0.7 0 0 0-2.474-1.561l-9 9A0.7 0.7 0 0 0 5.5 14h4.002a0.25 0.25 0 0 1 .471.666L8.086 20a0.7 0.7 0 0 0 2.475 1.56l9-9A0.7 0.7 0 0 0 18.5 10h-3.997a0.25 0.25 0 0 1-.472-.667z',
    fill: 'currentColor',
    strokeLinejoin: 'round',
  }),
)
