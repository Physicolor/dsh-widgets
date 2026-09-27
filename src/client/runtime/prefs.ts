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
import { instanceKey, parseInstanceKey, sizesOf } from '../lib/contract'

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
  return s
}

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
