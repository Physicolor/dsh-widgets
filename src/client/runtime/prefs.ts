/**
 * dsh-widgets — the persisted preference schema.
 *
 * WHAT lives here: the `Prefs` shape, its defaults, the localStorage keys, and the
 * read path (load + normalize). WHAT deliberately does not: the write path, which
 * needs the host file and a debounce (see `runtime/host-sync.ts`).
 *
 * Persistence is two-channel: localStorage is the FAST per-origin cache, the host
 * file (`/api/widgets-state`, under the profile data dir) is the AUTHORITATIVE
 * copy that survives origin switches, private mode and desktop shells that mint a
 * fresh loopback origin per launch.
 */

import { ALL_INSTANCES, DEFAULT_INSTALLED, WIDGETS } from '../generated.registry'
import { instanceKey, parseInstanceKey, sizesOf } from '../lib/contract/helpers'
import type { AnimCurve } from '../lib/anim-curve'
import { DEFAULT_ANIM_BOUNCE, DEFAULT_ANIM_CURVE, MAX_ANIM_BOUNCE, normalizeCurve } from '../lib/anim-curve'

/**
 * The curve math lives next door (`../lib/anim-curve.ts`, moved out 2026-10-02) and is
 * RE-EXPORTED here so every surface keeps the import path it already had. It cannot stay
 * in this file: the schema below needs the widget registry, and that registry is imported
 * extensionless (bundler-style), which plain Node cannot resolve — so the unit test that
 * pins the curve solver could never load this module. The schema and the easing are
 * separate concerns anyway.
 */
export type { AnimCurve } from '../lib/anim-curve'
export { DEFAULT_ANIM_BOUNCE, DEFAULT_ANIM_CURVE, MAX_ANIM_BOUNCE, curveToEasing, curveToProgress, normalizeCurve, overshootCurve } from '../lib/anim-curve'

/** Persisted preferences shared by every surface. */
export interface Prefs {
  panelPadding: number
  cardSide: number
  installed: string[]
  order: string[]
  apiKey: string
  railOpen: boolean
  /** Real-time (mouse-Y continuous) magnification; off = discrete focus + CSS transition. */
  realTime: boolean
  /** Peak magnification factor of the hovered card (e.g. 1.2 = 120%). */
  magnify: number
  /** Width of the right-side add panel (px). */
  panelWidth: number
  /** Per-widget card configuration (widgetId -> config map). */
  cardConfigs: Record<string, Record<string, unknown>>
  /** Maximum number of installed widgets shown in the rail. */
  maxWidgets: number
  /** Number of card columns in the rail (1 / 2 / 3 / 4). Default 2. */
  columns: number
  /** Hide the official composer stats line under the input box (personal
   *  preference — the rail widgets can show the same data). Default OFF so
   *  other users keep their stats bar. */
  hideStatsLine: boolean
  /** 连续曲率圆角: draw the card corners as superellipses (`corner-shape:
   *  squircle`) instead of circular arcs. Default ON — the squircle reads as
   *  softer at the same radius, and the setting lets a user compare. */
  squircle: boolean
  /** Corner-radius gear in PERCENT of the card's short side (see CORNER_GEARS). */
  cornerPercent: number
  /** 组件市场's view: 'list' (rows) or 'grid' (the widget gallery). PERSISTED with
   *  the rest of the prefs — switching views must survive a reload and ship as a
   *  user preference to everyone who installs the plugin from npm. */
  marketView: 'list' | 'grid'
  /** Open animation: the scale the rail group STARTS from while it grows out of
   *  the top-right corner (1 = slide only, no zoom). The 'stagger' shape starts
   *  EVERY CARD from this same scale, about the same corner — see
   *  rail/wave/deck-cascade.ts. */
  animScale: number
  /** Open animation: the easing of that slide+zoom (see {@link AnimCurve}). */
  animCurve: AnimCurve
  /**
   * Open animation: the easing of the SLIDE half alone.
   *
   * The slide and the zoom are two elements with one easing each (a single
   * `transform` cannot carry two timing functions), so the owner can tune them
   * apart: the position curve moves the whole rail in from the right, or — in the
   * default 'stagger' shape — carries each CARD's own copy of that same move (see
   * rail/wave/deck-cascade.ts, which evaluates this same curve in JS), while the
   * zoom curve grows the group out of its top-right corner. Default √x, like
   * `animCurve`.
   */
  animShiftCurve: AnimCurve
  /**
   * Open/close SPRING settle: how far the POSITION overshoots its target, as a
   * fraction of the travel (0 = a plain eased move, 0.04 = the cards slide 4% of
   * the travel PAST their seat and spring back).
   *
   * Why the position and not the scale: `normalizeCurve` clamps every curve's `y`
   * to [0,1] precisely so the SCALE never overshoots past its resting size (the
   * rail would visibly grow past its column). The position has room — the travel
   * is ~`railW + 24`, and the last `pad` of it is the rail's own padding — so the
   * overshoot lives here instead, and the overshoot amount is therefore exact in
   * PIXELS: `animBounce × travel`, the same for every card (they share one travel)
   * and for the whole group in the 'zoom' shape.
   *
   * It is folded into {@link animShiftCurve} — see {@link overshootCurve} — not
   * into a second animation, so the two shapes stay ONE map: the CSS transition
   * the group rides and the per-card curves the cascade evaluates are the same
   * cubic-bezier, bit for bit.
   */
  animBounce: number
  /**
   * How the rail EXPANDS and COLLAPSES (owner request 2026-10-02).
   *
   *  - `'stagger'` (default): the rail itself does NOT move or scale — it is
   *    already in its final place, and its CARDS travel along the zoom shape's OWN
   *    path, each on its own beat. Same anchor (the wrapper's top-right corner,
   *    which is off the right edge of the screen), same `animScale`, same travel,
   *    same two curves as 'zoom'; only the per-card progress differs, offset by
   *    rank. The cascade starts at the deck's BOTTOM-LEFT cell and ends at the
   *    top-right one — the two corners act as the anchors of the fold, like an
   *    accordion opening — and collapsing plays the same fold backwards, so the
   *    top-right card leaves first. The 设置 tile is part of the deck's grid and
   *    folds with it.
   *  - `'zoom'`: the whole group slides in from the right and scales out of its
   *    top-right corner (`animScale`) on the zoom curve, as it shipped before this
   *    option existed.
   */
  openShape: 'zoom' | 'stagger'
  /** Hide cards the rail's viewport would cut in half (the rail shows WHOLE
   *  cards only). Default ON: the deck's own row-snap scrolling guarantees the
   *  TOP row is never cut, so the bottom cut is the only one left to remove. */
  wholeCards: boolean
  /** 可显示的最多行数 — the deck's row budget. Together with `columns` it defines
   *  how many widgets can be PLACED (see {@link effectiveMaxWidgets}), which is
   *  why `maxWidgets` can no longer exceed `columns × maxRows`. */
  maxRows: number
}

/** Rows the deck may budget for: the setting's own range. */
export const MAX_ROWS_RANGE: readonly [number, number] = [1, 12]

/**
 * How many widgets may be PLACED right now — the ONE cap every surface reads.
 *
 * The rail can only ever show `columns × maxRows` tiles at once, so a larger
 * "最多组件数" is a promise the layout cannot keep: the market would keep adding
 * widgets the deck never seats. The stored preference is therefore read through
 * this clamp rather than rewritten (a render must not write prefs, and lowering
 * the row budget must not destroy the number the user typed — raising it again
 * brings the old value straight back). Surfaces that display it say that it was
 * clamped; see the settings row.
 */
export function effectiveMaxWidgets(p: Pick<Prefs, 'maxWidgets' | 'columns' | 'maxRows'>): number {
  const rows = Number.isFinite(p.maxRows) ? p.maxRows : 5
  const cols = [1, 2, 3, 4].indexOf(p.columns) !== -1 ? p.columns : 2
  return Math.max(1, Math.min(p.maxWidgets, cols * rows))
}

/** Default corner gear (%). The card renderer uses the same number as its own
 *  fallback (`cardRadius(unit)`), so a card drawn before any preference exists
 *  gets exactly the corner the default preference would give it. */
export const DEFAULT_CORNER_PERCENT = 16

/** localStorage key holding the whole prefs object. */
export const STORAGE_KEY = 'harness-widgets.state'
/** Local mirror of the last saved-at timestamp, compared against the host file
 *  on boot so the same DSH service converges from any browser origin
 *  (localhost vs 127.0.0.1 are different localStorage realms). */
export const SAVED_AT_KEY = 'harness-widgets.state.savedAt'

const DEFAULTS: Prefs = {
  panelPadding: 24,
  cardSide: 150,
  installed: DEFAULT_INSTALLED.slice(),
  order: ALL_INSTANCES.slice(),
  apiKey: '',
  railOpen: false,
  realTime: false,
  magnify: 1.2,
  panelWidth: 500,
  cardConfigs: {},
  maxWidgets: 10,
  columns: 2,
  hideStatsLine: false,
  // 连续曲率圆角 is ON by default (see the Prefs doc): the rail cards and the
  // previews share the same corner gear, so the setting is read from one place.
  squircle: true,
  cornerPercent: DEFAULT_CORNER_PERCENT,
  // 组件市场 opens as a list; the choice is persisted from then on.
  marketView: 'list',
  // The rail grows out of its top-right corner (see the drawer in rail-view.tsx).
  animScale: 0.88,
  animCurve: { ...DEFAULT_ANIM_CURVE },
  animShiftCurve: { ...DEFAULT_ANIM_CURVE },
  animBounce: DEFAULT_ANIM_BOUNCE,
  openShape: 'stagger',
  wholeCards: true,
  // 2 columns × 5 rows = the default 10 widgets, so the shipped defaults agree
  // with each other instead of clamping on first run.
  maxRows: 5,
}

/** Normalize an arbitrary persisted/remote prefs object into a valid Prefs.
 *  Shared by localStorage loads and the authoritative host-store sync, so both
 *  channels survive schema drift identically. */
export function normalizePrefs(p: Partial<Prefs>): Prefs {
  const s = { ...DEFAULTS, ...p }
  if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding
  if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide
  // Normalize one persisted entry to a valid instance key. Legacy bare widget
  // ids (pre-2×2) migrate to their 2×4 instance; unknown entries are dropped.
  const normalizeInstance = (key: string): string => {
    // v1.5.0 leak migration: sys-board shipped with its descriptor missing the
    // sizes list, so the runtime defaulted it to 2×2 while the manifest said
    // 2×4 —users installed a bogus sys-board@2x2. Remap it to the real size.
    if (key === 'sys-board@2x2') key = 'sys-board@2x4'
    const { widgetId, size } = parseInstanceKey(key)
    const w = WIDGETS.find((x) => x.id === widgetId)
    if (!w) return ''
    return sizesOf(w).includes(size) ? instanceKey(widgetId, size) : ''
  }
  // Respect the user's installed set exactly —do NOT force-append built-ins
  // back on every load (that kept overflowing the max-widgets cap after the
  // user uninstalled system widgets). Only the first-run path seeds defaults.
  if (!Array.isArray(s.installed)) s.installed = []
  s.installed = s.installed.map(normalizeInstance).filter((id): id is string => id !== '')
  if (!Array.isArray(s.order)) s.order = []
  s.order = s.order.map(normalizeInstance).filter((id): id is string => id !== '')
  for (const key of ALL_INSTANCES) if (s.order.indexOf(key) === -1) s.order.push(key)
  if (typeof s.apiKey !== 'string') s.apiKey = ''
  if (typeof s.railOpen !== 'boolean') s.railOpen = DEFAULTS.railOpen
  if (typeof s.realTime !== 'boolean') s.realTime = DEFAULTS.realTime
  if (!Number.isFinite(s.magnify) || s.magnify < 1 || s.magnify > 2) s.magnify = DEFAULTS.magnify
  if (!Number.isFinite(s.panelWidth) || s.panelWidth < 260 || s.panelWidth > 760) s.panelWidth = DEFAULTS.panelWidth
  if (typeof s.cardConfigs !== 'object' || s.cardConfigs === null || Array.isArray(s.cardConfigs)) s.cardConfigs = {}
  if (!Number.isFinite(s.maxWidgets) || s.maxWidgets < 1 || s.maxWidgets > 20) s.maxWidgets = DEFAULTS.maxWidgets
  if ([1, 2, 3, 4].indexOf(s.columns as number) === -1) s.columns = DEFAULTS.columns
  if (typeof s.hideStatsLine !== 'boolean') s.hideStatsLine = DEFAULTS.hideStatsLine
  // The market's view mode is a USER PREFERENCE, not panel state: it rides the
  // same persisted prefs as everything else, so a reload — or the plugin being
  // installed from npm into someone else's profile — keeps it.
  if (s.marketView !== 'grid' && s.marketView !== 'list') s.marketView = DEFAULTS.marketView
  if (!Number.isFinite(s.animScale) || s.animScale < 0.5 || s.animScale > 1) s.animScale = DEFAULTS.animScale
  s.animCurve = normalizeCurve(s.animCurve)
  s.animShiftCurve = normalizeCurve(s.animShiftCurve)
  s.animBounce = Number.isFinite(s.animBounce) ? Math.min(MAX_ANIM_BOUNCE, Math.max(0, s.animBounce)) : DEFAULTS.animBounce
  if (s.openShape !== 'zoom' && s.openShape !== 'stagger') s.openShape = DEFAULTS.openShape
  if (typeof s.wholeCards !== 'boolean') s.wholeCards = DEFAULTS.wholeCards
  if (!Number.isFinite(s.maxRows) || s.maxRows < MAX_ROWS_RANGE[0] || s.maxRows > MAX_ROWS_RANGE[1]) s.maxRows = DEFAULTS.maxRows
  return s
}

/**
 * `loadState` / `loadSavedAt` — the READ path (see the module note). The curve
 * helpers themselves live in `../lib/anim-curve.ts`.
 */

export function loadState(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
    return normalizePrefs(JSON.parse(raw) as Partial<Prefs>)
  } catch {
    return { ...DEFAULTS, installed: DEFAULT_INSTALLED.slice(), order: ALL_INSTANCES.slice() }
  }
}

export function loadSavedAt(): number {
  try {
    const n = +(localStorage.getItem(SAVED_AT_KEY) ?? '')
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}
