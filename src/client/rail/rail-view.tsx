/**
 * dsh-widgets — the right-rail slot body.
 *
 * Hosted in `conversation.input.overlay`; the registration in `client/index.ts`
 * records why that seat and not `shell.overlay`. One component draws the whole
 * right-rail group as ONE sliding surface:
 *
 *   drawer wrapper ── RailWave ── resting deck (grid of cards + the add tile)
 *                  ├─ the magnify overlay (inside RailWave)
 *                  └─ the add panel (settings pages, portaled to <body>)
 *
 * Moved out of `client/index.ts` (Phase 2.9) with its body unchanged; the
 * indentation is kept on purpose so the move stays byte-auditable. It receives the
 * bridge handles instead of closing over them: `useBridge` / `setPrefs` /
 * `runCommand` are stable, while `prefs` and `railBudget` are LIVE bindings, so
 * those arrive as getters and every EVENT-HANDLER read goes through them (a
 * captured value would go stale between the emit and the re-render).
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { WIDGETS, WIDGET_RUNTIME } from '../lib/registry'
import { hasSource } from '../data/sources'
import { parseInstanceKey, sizesOf, widgetName } from '../lib/contract/helpers'
import type { WidgetRenderOut, WidgetSize } from '../lib/contract/types'
import { buildLiveStats } from '../runtime/live-stats'
import { type BridgeSnapshot } from '../runtime/bridge'
import { curveToEasing, curveToProgress, overshootCurve, type Prefs } from '../runtime/prefs'
import { CardBody } from '../render/CardBody'
import { settingsGearIcon } from '../render/icons'
import { applyTimerOp, timerOpOf } from '../lib/timer-state'
import { t } from '../i18n'
import { BASE_SIDE, RAIL_ROW_SEAT, applyRailRight, getNotedRailTop, resolveRailSpace, setRailVar } from './geometry'
import { RAIL_TOP_INSET, RailWave, SLOT_CUT_CLASS } from './wave/RailWave'
import { createWaveGeometry } from './wave/wave-geometry'
import { settleFoldInset } from './fold-inset'
import {
  type CascadeAnchor, type CascadeBand, type CascadeBox, type CascadeEnd, type CascadePath,
  type DeckCascade, createDeckCascade, groupDurationMs, planCascade,
} from './wave/deck-cascade'

/** Map from interactive action id to the slash command it triggers. */
const ACTION_COMMANDS: Record<string, string> = {
  contextCompact: '/compact',
}

/**
 * Do two widget outputs describe the SAME card?
 *
 * `Widget.render()` returns a plain-data tree (see the contract's rule 2: no JSX,
 * no DOM), so a structural walk is an exact description of what the card would
 * paint. The rail uses this to keep the PREVIOUS object identity when nothing
 * changed — which is what lets `cardElCache` hit and React bail out of the card's
 * subtree (see `outCache` below). Identity, not truthiness: `null` (a hidden card)
 * equals `null`, and functions/React elements are compared by identity and never
 * walked (a widget that returns either would be a contract violation).
 */
function sameOut(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  // A React element (or any exotic object) is never "equal by structure": bail out
  // so a contract violation can never be silently hidden by this cache.
  if (depth > 8 || '$typeof' in (a as Record<string, unknown>) || '$typeof' in (b as Record<string, unknown>)) return false
  const aArr = Array.isArray(a)
  if (aArr !== Array.isArray(b)) return false
  const aKeys = Object.keys(a as object)
  const bKeys = Object.keys(b as object)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!sameOut((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], depth + 1)) return false
  }
  return true
}

/**
 * ── THE 设置 TILE OPENS THE OFFICIAL SETTINGS WINDOW (owner, 2026-10-20) ──
 *
 * BOTH tiles do: the resting deck's and the magnify overlay's (the overlay carries
 * the real click handler while the wave is live, so it used to open the self-made
 * panel instead — a single tile that opened two different surfaces depending on
 * whether it was hovered). There is no longer a second door: the self-made panel is
 * sealed in `surfaces/add-panel.tsx` (not imported, not shipped in behaviour).
 *
 * There is no service for this: the settings window is the sidebar-foot seat
 * (`sidebar.settings` → `settings.section`), and the shell exposes no “open settings on
 * section X”. So this drives the two clicks a user would perform itself — the foot
 * trigger, then our own nav row — through the same DOM conventions the section’s glyph
 * adapter already relies on (`[class$="_settingsArea"]` / `[class$="_navList"]`; see
 * surfaces/settings-nav-glyph.ts). Our row is found by `data-dsx-nav="widgets"` when the
 * adapter has already marked it, and by the registered label otherwise (the window may be
 * on screen before that mark lands).
 */
const findSettingsSectionRow = (): HTMLElement | null => {
  const marked = document.querySelector<HTMLElement>('[data-dsx-nav="widgets"]')
  if (marked !== null) return marked
  const label = t('ui.section.label')
  for (const list of document.querySelectorAll<HTMLElement>('[class$="_navList"]')) {
    for (const row of list.querySelectorAll<HTMLElement>(':scope > button')) {
      if ((row.textContent ?? '').trim() === label) return row
    }
  }
  return null
}

const findSettingsTrigger = (): HTMLElement | null => {
  const area = document.querySelector<HTMLElement>('[class$="_settingsArea"]')
  const scoped = area === null ? null : area.querySelector<HTMLElement>('button')
  if (scoped !== null) return scoped
  // Fallback for a shell whose foot row is not wrapped in a `_settingsArea`: the trigger IS
  // the product's own settings button (or its account menu — DSH 0.2.x moved 设置 inside it).
  for (const label of ['设置', 'Settings', '账号菜单', 'Account menu']) {
    const hit = document.querySelector<HTMLElement>(`button[aria-label="${label}"]`)
    if (hit !== null) return hit
  }
  return null
}

/**
 * 设置 inside the ACCOUNT MENU (DSH 0.2.x desktop).
 *
 * The shell no longer has a bare settings button in the sidebar foot: `_settingsArea`
 * holds the account trigger, and 设置 (shortcut Ctrl+Alt+,) is a MENU ITEM inside it.
 * Measured on the 0.2.1-rc.2 desktop build 2026-10-20: clicking `_settingsArea button`
 * opens that menu; the item's text is "设置Ctrl+Alt+,". The previous code clicked the
 * trigger and then polled for OUR nav row, which never appears without the menu item —
 * so the tile was a silent no-op there.
 */
const findSettingsMenuItem = (): HTMLElement | null => {
  const items = document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menu"] button, [role="menu"] a')
  for (const item of items) {
    const text = (item.textContent ?? '').trim()
    if (text === '') continue
    if (/退出|sign\s*out|log\s*out/i.test(text)) continue
    if (text.startsWith('设置') || /^settings/i.test(text)) return item
  }
  return null
}

/** Click the first element a finder produces, polling a bounded number of frames. */
const clickWhenFound = (find: () => HTMLElement | null, frames = 42): void => {
  let n = 0
  const step = (): void => {
    const el = find()
    if (el !== null) { el.click(); return }
    if (++n > frames) return
    window.requestAnimationFrame(step)
  }
  window.requestAnimationFrame(step)
}

/** What the rail view needs from the composition root that owns the bridge. */
export interface RailViewDeps {
  /** Subscribe to the bridge (re-renders the rail on every emit). */
  useBridge: () => BridgeSnapshot
  /** The LIVE prefs binding — read it once per render, never capture it. */
  getPrefs: () => Prefs
  /** Merge a patch into the live prefs, persist, then emit. */
  setPrefs: (patch: Partial<Prefs>) => void
  /**
   * The LIVE rail budget (px): the space the product’s transcript measure leaves
   * for the rail. It must NOT come from the bridge snapshot — a yield can be
   * written straight to the DOM and outrun the snapshot, and the stale value would
   * write the pre-yield geometry back.
   */
  getRailBudget: () => number
  /** Run a slash command (armed action cards). */
  runCommand: (line: string) => void
  /** Hand the drawer wrapper element back to the measurement layer. */
  setDrawerEl: (el: HTMLDivElement | null) => void
}

/**
 * Which live source each data-backed widget family reads, and what its loading
 * skeleton looks like, are declared by the UNIT’s own manifest.json and reach
 * the shell as `WIDGET_RUNTIME` (see the generated registry).
 *
 * The SHELL still owns the loading DECISION — a widget cannot distinguish "my
 * source is still in flight" from "my source answered with nothing", and those
 * two states deserve different cards (placeholder pills vs an honest empty
 * state) — but it no longer owns the DATA: adding a widget with a live source
 * means declaring `source` + `skeleton` in that unit’s manifest, and
 * `pnpm check:registry` fails the build if the declaration drifts.
 */

/**
 * Is this family's live source still in flight? (see WIDGET_RUNTIME)
 *
 * The DECISION is the shell's (a widget cannot distinguish "my source is in
 * flight" from "my source answered with nothing"), but the SEMANTICS belong to the
 * source's adapter: `sources[id]` turns `ready` the first time that adapter
 * reports something renderable — including, for the routes whose error IS the
 * card's real state (`cc`, `github`), an error answer. Before the v1.11 adapter
 * contract this function tested each payload field by hand, with a different rule
 * per source and no way to add one without editing here.
 */
function isSourcePending(source: string, snap: BridgeSnapshot): boolean {
  // A source no adapter serves can never be loading — and a manifest that names
  // one fails the build (scripts/gen-registry.mjs), so this is the null case only.
  if (!hasSource(source)) return false
  return snap.sources[source]?.status !== 'ready'
}

/**
 * The drawer's own seat, OUTSIDE the conversation subtree.
 *
 * `position: fixed` means "the viewport" only while no ancestor is a containing
 * block for fixed descendants — `transform`, `filter`, `backdrop-filter`,
 * `contain: paint/layout`, or `will-change` naming any of them. The rail is
 * registered in `conversation.input.overlay`, i.e. inside the composer card, and
 * DSH 0.2.2 puts `will-change: transform` on the conversation's composer seat
 * (`.…_composerSeat`, measured 2026-11-12 at 1600x1000: the rail's box collapsed
 * from the right band into the composer strip — `[673,912,460,93]` where the
 * viewport-relative answer is `[1140,44,460,956]`, and the 置顶摘要 card, which
 * derives `right` from the rail's rect, moved 477px off the corner with it).
 *
 * A portal is the only move that both restores the viewport containing block and
 * keeps React working: React 18 delegates events at the root container, so a
 * React-owned node re-parented with `appendChild` loses every handler on it.
 *
 * The host is `display: contents` — no box, so nothing joins the shell's grid —
 * and is created once per document: re-registering the slot (every session
 * switch) must not stack hosts. Nothing removes it while the plugin lives: a
 * cleanup that ran after the next instance's first render would detach the live
 * drawer with it.
 */
const DRAWER_LAYER_CLASS = 'dsx-stats-drawer-layer'

function drawerLayerHost(): HTMLElement {
  const found = document.querySelector<HTMLElement>(`.${DRAWER_LAYER_CLASS}`)
  if (found !== null) return found
  const host = document.createElement('div')
  host.className = DRAWER_LAYER_CLASS
  host.style.display = 'contents'
  document.body.appendChild(host)
  return host
}

/** Build the right-rail slot component bound to one composition root. */
export function createRailView(deps: RailViewDeps): () => React.ReactElement | null {
  const { useBridge, getPrefs, setPrefs, getRailBudget, runCommand, setDrawerEl } = deps
  return (): React.ReactElement | null => {
    const snap = useBridge()
    // Read the live bindings once per render. `snap` carries the same prefs and the
    // same budget as of the emit that scheduled this render; these read the bindings
    // themselves, which is what the geometry below was written against.
    const prefs = getPrefs()
    const railBudget = getRailBudget()
    /**
     * The POSITION curve BOTH shapes ride, with the spring settle folded in
     * (`prefs.animBounce`, see {@link overshootCurve}).
     *
     * One curve object feeds the group's CSS transition AND the per-card cascade,
     * which is the only reason the two shapes can stay one map once the position
     * overshoots its target: the cards do not merely look like the group, they
     * evaluate the same cubic. The SCALE is untouched — `normalizeCurve` keeps
     * every curve inside [0,1] so the group never grows past its column, and the
     * bounce is the position's job.
     */
    const shiftCurve = overshootCurve(prefs.animShiftCurve, prefs.animBounce)
      // Hooks MUST be declared unconditionally, before the early return, or the
      // hook count changes when `open`/`hasSession` flip (React error #310).
      // Action-cards: an armed action id waits for a second click before firing,
      // so destructive/expensive actions (e.g. Compact) need two taps to run.
      const [armedAction, setArmedAction] = React.useState<string | null>(null)
      /** Live mirror of `armedAction`, for handlers that may be recycled (see `handleAction`). */
      const armedRef = React.useRef<string | null>(null)
      armedRef.current = armedAction
      /**
       * The live bridge snapshot, read by handlers that may outlive their render.
       *
       * The card-element cache below hands back element objects built renders ago whenever a
       * widget's data has not changed, so their closures are not re-created on every render.
       * Anything such a closure needs must therefore be read through a ref — `snap` itself
       * would freeze at the render that built the element.
       */
      const snapRef = React.useRef(snap)
      snapRef.current = snap
      /**
       * One card action, dispatched by ID.
       *
       * Two kinds exist, and they are tried in this order:
       *  1. a SLASH COMMAND from the fixed table above (`contextCompact`), which is
       *     the only kind that needs the two-tap confirm;
       *  2. a TIMER operation (`timer:start|pause|reset`), which the interactive
       *     timer cards emit and which writes this INSTANCE's config record.
       *
       * The instance key is a parameter rather than a closure field because the id
       * alone is not unique on a rail that can seat two timer cards: `timer:pause`
       * names a verb, and WHICH card was pressed is only known here. This is also
       * why the timer branch is not routed through `armedAction` — one card arming
       * would arm every timer card on the rail.
       */
      const handleAction = (id: string, key: string): void => {
        const command = ACTION_COMMANDS[id]
        if (command !== undefined) {
          // Read the armed flag through a REF, not the render's state: the card element that
          // carries this handler may be RECYCLED from an older render (see the card-element
          // cache by `cardBodyFor`), so a closure over `armedAction` would answer with the
          // state as of that render and the two-tap confirm would either fire early or never.
          if (armedRef.current !== id) { setArmedAction(id); return }
          setArmedAction(null)
          runCommand(command)
          return
        }
        const op = timerOpOf(id)
        if (op === null) return
        // Read prefs LIVE, for the same recycling reason: this closure may be one a
        // previous render built, so a captured `prefs` would resume from an old state
        // (and drop whatever the other card wrote meanwhile).
        const cardConfigs = getPrefs().cardConfigs
        const config = cardConfigs?.[key] ?? {}
        const patch = applyTimerOp(config, op, Date.now())
        // An op that changes nothing (start while running) does not spend a persist
        // + emit round trip.
        if (Object.keys(patch).length === 0) return
        setPrefs({ cardConfigs: { ...cardConfigs, [key]: { ...config, ...patch } } })
      }
      /** The action handler bound to ONE card instance (see `handleAction`). */
      const actionsFor = (key: string) => (id: string): void => handleAction(id, key)
      // Whole-card cycle (pooled usage widgets + sys big-figure cards): advance the
      // instance's selection along its cycle and persist it via cardConfigs so
      // the choice survives reloads and other browser origins. The persisted
      // field defaults to 'poolView' (usage pool); sys cards pass `store:
      // 'bigMetric'` so their cycle never collides with the pool view. The
      // multikey `prefer` call only fires for usage cycles (storeless).
      const cyclePool = (key: string) => (out: WidgetRenderOut): void => {
        const modes = out.cycle?.modes ?? []
        if (modes.length === 0) return
        const current = out.cycle?.current ?? modes[0]
        const idx = modes.indexOf(current)
        const next = modes[(idx < 0 ? -1 : idx) + 1] ?? modes[0]
        const store = out.cycle?.store ?? 'poolView'
        setPrefs({ cardConfigs: { ...getPrefs().cardConfigs, [key]: { ...(getPrefs().cardConfigs[key] ?? {}), [store]: next } } })
        if (out.cycle?.store) return
        const entry = snapRef.current.usageMulti?.keys.find((k) => k.label === next)
        void fetch('/api/multikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'prefer', ref: next === 'total' ? '' : (entry?.ref ?? '') }),
        }).catch(() => { /* pool endpoint optional: display only */ })
      }
      /**
       * The rail's measured viewport height (clientHeight), tracked with a
       * ResizeObserver. It is the one input the scroll geometry cannot derive: the
       * rail is `position: fixed; top: var(--dsx-rail-top); bottom: 0`, so its
       * height follows the window, the session header and the composer, and the
       * scroll tail that makes the LAST row reachable must reserve exactly one of
       * these. Declared above the drawer's early return so the hook order never
       * changes, and initialised to 0: the first painted frame then simply shows a
       * shorter (still correct-looking) scroll range, and the observer's first
       * callback —same tick as the layout —replaces it before the user can
       * scroll.
       */
      const [railPaneH, setRailPaneH] = React.useState(0)
      /**
       * ── THE RAIL'S TOP CONTENT INSET (measured, not assumed) ──
       *
       * The deck does not start 4px below the rail's box when a co-tenant seats its own band
       * above it: dsh-pinned-summary pushes us down with an `!important` inline `padding-top`
       * (the same number the wave's oracle reads — see `readTopInset` in RailWave). The
       * whole-card band and the scroll cap are BOTH built on it, so it has to be a render
       * input, and it has to stay fresh while the push is TWEENED: the tween writes the
       * inline style every frame, and the rail's `clientHeight` never changes, so neither the
       * pane observer nor a window resize would notice. Hence the style-attribute
       * MutationObserver below — the generic hook for "someone moved our content", instead of
       * depending on one co-tenant's private variable name.
       *
       * Default = the authored 4px, which is also the value with no co-tenant at all, so the
       * unpushed geometry is bit-identical to before (owner request, 2026-10-14).
       */
      const [railTopInset, setRailTopInset] = React.useState(RAIL_TOP_INSET)
      // The rail element itself, shared by the wave (hit tests, scroll geometry)
      // and the pane-height observer below. A REAL ref, not a plain `{ current }`
      // object: a plain object is re-created on every render of this component, so
      // the element's ref callback (attached under an earlier render) writes into a
      // DIFFERENT object than the one the effects close over —leaving the effects
      // reading `null` forever (measured: `railElRef.current === null` at wheel
      // time while the rail was plainly in the DOM, `paneH` stuck at 0, and the
      // scroll range back to 750px).
      const railElRef = React.useRef<HTMLDivElement | null>(null)
      React.useLayoutEffect(() => {
        // Read `.current` INSIDE the callbacks, never capture the element: the
        // layout effect below the early return can run before the rail is
        // rendered, and a captured `null` (or a previous element) would then be
        // observed forever. Measured: capturing it left `railPaneH` at 0, the
        // scroll range shrank back to 750 and the last rows became unreachable
        // again —the exact bug this observer exists to prevent.
        /**
         * The rail, SELF-HEALED.
         *
         * This effect can run a commit BEFORE the drawer renders its rail (the session
         * arrives, the deck follows a beat later), and the retry that used to attach the
         * observers was a one-shot `setTimeout(…, 0)`: it read a null ref, returned, and gave
         * up FOR GOOD. The ResizeObserver was then never attached and `railPaneH` stayed 0 for
         * the life of the session — measured on the owner's GUI 2026-10-14 off the fiber tree,
         * with a 956px-tall rail on screen: `RailWave props { paneH: 0, topInset: 4 }`, i.e.
         * the whole-card band was skipped (`paneH <= 0`), the scroll cap was 0 and the wheel
         * could not move the deck at all. Query the DOM and write the element back into the
         * shared ref, exactly like RailWave's own `railElement()`.
         */
        const railElement = (): HTMLDivElement | null => {
          const held = railElRef.current
          if (held !== null && held.isConnected) return held
          const found = document.querySelector<HTMLDivElement>('.dsx-stats-rail')
          if (found !== null) railElRef.current = found
          return found
        }
        const measure = (): void => {
          const rail = railElement()
          if (rail === null) return
          // Hand React a VALUE, never an updater: an updater runs in the RENDER
          // phase, where the DOM is already dirty from the commit, so the read
          // forced a whole-document layout and its cost landed on the sidebar
          // animation. Measured 2026-10-03 (E2 profile): that updater's self-time
          // was 130.9ms — the single largest own-plugin item of the frame. A plain
          // value keeps the same Object.is bail-out, so an unchanged height still
          // skips the re-render.
          //
          // And do not read `rail.clientHeight` at all while the published rail
          // `top` is known: the element is `top: var(--dsx-rail-top); bottom: 0`
          // with a border-box and no border, so its padding-box height IS
          // `window.innerHeight − railTop` — an arithmetic identity, no layout.
          // Verified against the live stage (1707×1067): closed `top=44, h=1023`
          // and open `top=72, h=995`, both exactly `innerHeight − top`. The DOM
          // read still exists as the fallback for the window before the first
          // publish (and after teardown), where the identity has no `top` to use.
          const top = getNotedRailTop()
          setRailPaneH(top >= 0 ? Math.max(0, window.innerHeight - top) : rail.clientHeight)
          // The deck's real origin inside the rail (see `railTopInset`). A parse failure
          // (a detached rail, an exotic theme) falls back to the authored inset.
          const inset = Number.parseFloat(getComputedStyle(rail).paddingTop)
          setRailTopInset(Number.isFinite(inset) ? inset : RAIL_TOP_INSET)
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(() => measure())
        // Window resize changes the rail's height even when nothing else does.
        window.addEventListener('resize', measure)
        /** The element the two observers are attached to, so re-attaching is idempotent. */
        let observed: HTMLDivElement | null = null
        // A co-tenant's push arrives as an inline `padding-top` write (tweened, so many
        // writes over ~260ms) and moves the deck WITHOUT changing any size the observers
        // above can see. rAF-coalesced: one measure per frame of the tween at most, and
        // `setRailTopInset` bails out on an unchanged value.
        let insetFrame = 0
        const mo = new MutationObserver(() => {
          if (insetFrame !== 0) return
          insetFrame = window.requestAnimationFrame(() => { insetFrame = 0; measure() })
        })
        const attach = (): void => {
          const rail = railElement()
          if (rail === null || rail === observed) return
          observed = rail
          ro.observe(rail)
          mo.observe(rail, { attributes: true, attributeFilter: ['style'] })
          measure()
        }
        attach()
        // The drawer can arrive AFTER this effect (see `railElement`) and it is re-created
        // when the slot re-registers, so the attachment is driven by the one signal that
        // covers both: a body-level childList observer. `attach()` is a no-op — two property
        // reads on the held ref — unless the rail actually changed, so the transcript's own
        // streaming mutations cost nothing here. (settings-nav-glyph keeps a body-level
        // observer for the same class of "the shell mounts our surface later" reasons.)
        const bodyMo = new MutationObserver(() => attach())
        bodyMo.observe(document.body, { childList: true, subtree: true })
        return () => {
          if (insetFrame !== 0) window.cancelAnimationFrame(insetFrame)
          bodyMo.disconnect()
          mo.disconnect()
          window.removeEventListener('resize', measure)
          ro.disconnect()
        }
      }, [snap.open, snap.hasSession])
      // 鈹€鈹€ Drawer open/close animation, matching dsh-better-sidebar's right
      //    panel: a translateX slide with --ds-transition-duration-slow +
      //    --ds-ease-in-out, applied to a position:fixed inset:0 wrapper so the
      //    rail + magnify overlay + add panel move as ONE surface. Opening
      //    glides in from the RIGHT (translateX(+travel) −0, moving leftwards
      //    into the resting slot), closing is the reverse (0 −
      //    translateX(+travel), sliding out to the right). CSS transitions
      //    interrupt natively: a rapid re-toggle animates from the current
      //    intermediate geometry straight to the new target —no snap, no
      //    desync. The wrapper is pointer-events:none so it never blocks the
      //    page.
      const shouldOpen = snap.open && snap.hasSession
      const [drawerPhase, setDrawerPhase] = React.useState<'closed' | 'enter' | 'open' | 'leave'>(shouldOpen ? 'open' : 'closed')
      /**
       * ── THE DRAWER IS RETIRED, NOT UNMOUNTED (owner decision 2026-10-03) ──
       *
       * Opening used to MOUNT the whole rail: 13 widget cards, each a chart subtree, built
       * from scratch. Measured on the owner's stage (1707×1067 @ DSF 1.5, 60Hz, the desktop
       * window's own geometry): ~285ms of main-thread React work PER TOGGLE — the fold's own
       * 18 frames were then starved and the animation ran at 32–46fps. Two control runs
       * pinned it on the toggle and not the animation: a shim that writes the same 14
       * `transform`s per frame from a plain rAF ran at 60.2fps, and the same toggles with
       * `prefers-reduced-motion` (drawer jumps, no fold at all) cost exactly as much.
       *
       * So once a session has shown the rail, the drawer stays MOUNTED and merely goes
       * hidden: `data-retired` (see rail.module.css) takes it out of paint and hit testing,
       * and the element handed to React is THE SAME OBJECT every render (see the cache at
       * the end of this function) so React bails out of the entire subtree — a closed rail
       * then costs nothing per data emit, and an open costs two rAFs and a transition.
       *
       * The trade this accepts: while closed, the deck's DOM and React state stay resident
       * (that is the memory the previous "unmount on close" design was buying back).
       */
      const everOpenRef = React.useRef(drawerPhase !== 'closed')
      if (drawerPhase !== 'closed') everOpenRef.current = true
      /**
       * Prewarm: a session that has never shown the rail still pays the build on its first
       * open. Mounting the retired drawer a couple of seconds after load moves that cost off
       * the gesture — idle time instead of the user's first click. `snap.hasSession` gates it
       * so a profile with no session never mounts a deck it cannot use.
       */
      const [prewarm, setPrewarm] = React.useState(false)
      React.useEffect(() => {
        if (prewarm || !snap.hasSession || everOpenRef.current) return
        const timer = window.setTimeout(() => setPrewarm(true), 2500)
        return () => window.clearTimeout(timer)
      }, [prewarm, snap.hasSession])
      /** The retired drawer element, reused verbatim so React skips the whole subtree. */
      const retiredElRef = React.useRef<React.ReactElement | null>(null)
      /**
       * Card-element cache (see `cardBodyFor`, which is declared far below the early return
       * this component takes while the drawer is not mounted). It has to be declared HERE,
       * with the other hooks: a `useRef` below a conditional `return null` changes the hook
       * count between renders, which is React error #310.
       */
      const cardElCache = React.useRef(new Map<string, { out: unknown; unit: number; width: number; squircle: boolean; corner: number; aria: string; nodes: React.ReactNode[] }>())
      /**
       * ── ONE CARD ELEMENT PER (CONTENT, CHROME), NOT ONE PER RENDER ──
       *
       * Building `items` below CALLS every installed widget's `render()`, and this
       * component re-renders on EVERY bridge emit (≈13/s while a turn streams), on
       * open/close phases and on prefs. Keying the result on the snapshot's OBJECT
       * identity (what this used to do) never hit after an emit, so every card body —
       * and the magnify overlay's second copy of it — re-rendered, and `CardBody`'s
       * overflow guard then forced a layout read per card per copy. Measured
       * 2026-10-20 (`scripts/probe-emit-cost.cjs`): 62.4 card-box reads per emit for
       * 14 installed cards.
       *
       * So the cache compares the OUTPUT instead: when the newly built tree is
       * structurally equal to the last one, the OLD object is handed back. `cardElCache`
       * then hits and React bails out of both copies. This changes NO behaviour — the
       * widget still renders on every emit, and data still lands in the commit it
       * arrives in; only output that would paint the same is shared.
       *
       * Deliberately NOT paired with a "hold the snapshot while a fold is in flight"
       * freeze: that was measured too and the 300ms data-adoption delay it costs did
       * not buy a frame rate (see the note above `reduceMotion`).
       */
      const outCache = React.useRef(new Map<string, WidgetRenderOut | null>())
      /**
       * ── WHERE THIS STANDS (2026-10-03, end of the perf pass) ──
       *
       * The owner's stage is DISPLAY1: 2560×1600 @150% → 1707×1067 CSS at 60Hz. Every number
       * below was taken there, headful, on the desktop app's own port (see `scripts/diag-*`).
       *
       * WHAT IS FIXED: opening used to MOUNT the whole rail (13 chart cards built from
       * scratch, ~285ms of React work per toggle) and the fold was starved to 32–46fps. The
       * drawer is now kept mounted and merely retired (`data-retired`, nothing painted or hit
       * testable) — `verify-deck-cascade-live.cjs` proves it is never unmounted (0 deck node
       * changes across a reversal). On its own that took a single user-paced open/close/re-open to
       * p50 17.7–17.9ms with p95 ~36ms — the second pass below is what removed the remaining tail.
       *
       * FIXED ON 2026-10-03 (second pass): the deck's cards now hold a compositing layer while
       * the drawer is on screen — `will-change: transform` scoped by `:not([data-retired])`, see
       * the measurement in `styles/rail.module.css`. That was the missing half: the fold writes a
       * `transform` on every card each frame, and Chromium was promoting and releasing a layer per
       * card on the way in and again on the way out. The same harness that ran at 23.9–31.3fps now
       * runs at 48.5–55.9fps (p95 18.1–35ms, and the best cycles drop ZERO frames over 26ms), and
       * a single user-paced open/close/re-open is pinned at p50 17.6–17.7ms with p95 18.1ms and a
       * 18.3ms worst frame — the display rate, where it used to be p95 ~35ms / max 53–133ms.
       *
       * CARD COUNT STILL MATTERS, and the earlier "three cards → 55–60fps" note was WRONG: that
       * A/B trimmed `installed` through `/api/widgets-state`, and the PUT was silently ignored —
       * the client only adopts a host state whose `savedAt` beats its own (`syncWithHost` in
       * src/client/index.ts), and only at boot. `scripts/diag-installed-live.cjs` now proves the
       * trim lands (13 → 3 slots after a reload), and the corrected A/B on the same harness is
       * (measured BEFORE the layer hint, so both numbers are lower than they are today):
       *   · 13 cards: 29.3fps · React's work loop (`ae @ index-*.js`) 1796ms over 12 toggles
       *   · 3 cards:  48.0fps · the same loop 957ms
       *   · rail OPEN and idle, no clicks (control, `--what=open-idle`): 51.3fps · the loop
       *     240ms over 4.2s — so the cost is the TOGGLE, not the data streaming into an open deck
       *   · visibility-only toggling with no React at all (`--what=vis`): 52.5fps
       * Fitting those: ~71ms of React work per toggle is fixed (the shell's own reaction plus our
       * drawer bookkeeping) and ~6ms more per card.
       *
       * WHAT IS LEFT IS NOT OURS, per the forced-read stacks and the devtools timeline
       * (`scripts/diag-fold-trace.cjs --what=fold --reps=6 --gap=320`, after the fix): React's work
       * loop `ae` 1475ms per 12 toggles; `dsh-ui-harmonizer` (a DIFFERENT plugin,
       * D:\dsh-home\plugins\dsh-ui-harmonizer) 272ms in `refreshMaterial`/`detectGlass` at ~18ms a
       * call plus 12 forced style reads; the shell forcing layout 57 times per 12 toggles
       * (`?@index-*.js:56 ← gi ← Lu`, ~5 full-page reflows per toggle); and Playwright's own
       * actionability polling (22 forced layouts) inside the harness itself. Our side of that trace
       * is the fold clock `step` at 0.54ms per frame, `measureRailTop` 5 forced reads and
       * `groupDurationMs` 1 — about 12ms of the ~120ms a toggle costs.
       *
       * THE ONE EXPERIMENT THAT STAYED OUT (`do not redo it blind`): freezing the whole deck on one
       * snapshot while a fold is in flight. Group-path conformance was perfect (worst 0.00px), but
       * it buys no frame rate and costs a 300ms data-adoption delay: measured with the layer hint
       * already in place, 27.5–30.4fps / 2.25–2.59s task per cycle WITHOUT it and 28–32.1fps /
       * 2.19–2.32s with it. Its per-card predecessor (`paintedOut`, one card released per idle
       * callback) was worse than useless: the deck rendered a MIXED generation mid-fold and the
       * fold's first frame landed 203px off the group's shared path — a real defect, caught by
       * `verify-deck-cascade-live.cjs`. The per-widget output cache that came with that experiment
       * IS in the tree (`outCache` above, content-compared since 2026-10-20) because it changes no
       * behaviour and the deck's card rebuilds drop to zero when the data did not move; the
       * SNAPSHOT FREEZE is what stayed out.
       */
      const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Boot restore must NOT play the enter glide. Prefs are read synchronously
      // while the session arrives asynchronously, so at mount the drawer is
      // `closed` even though the rail is already wanted: the restore that
      // follows then looks exactly like a user open and slides the drawer on
      // every refresh. `bootRestorePending` marks precisely that state (wanted,
      // session still unknown); a genuine later open never sets it.
      const bootRestorePending = React.useRef(snap.open && !snap.hasSession)
      // Leave timeout, 'zoom' shape only: its CSS slide is 0.3s
      // (--ds-transition-duration-slow) and carries the whole group, so the drawer
      // unmounts a beat later. The 'stagger' shape has no slide to wait for — its
      // leave IS the deck's own cascade, which reports when it has really finished
      // (see the cascade effect below).
      const DRAWER_LEAVE_MS = 480
      React.useEffect(() => {
        setDrawerPhase((p) => {
          if (shouldOpen) {
            if (p === 'closed') {
              // Restored (prefs + session resolved in the same commit) —appear
              // in place; user open —glide in from the right.
              if (bootRestorePending.current) {
                bootRestorePending.current = false
                return 'open'
              }
              return 'enter'
            }
            return p === 'leave' ? 'open' : p
          }
          return p === 'closed' ? 'closed' : 'leave'
        })
      }, [shouldOpen])
      // Enter: the first painted frame MUST sit at translateX(-100%) before the
      // transition target flips to 0, or the browser has no start value to
      // animate from (the rail would just pop in). Two rAFs guarantee that
      // -100% frame has been laid out and painted before raising to 0.
      React.useEffect(() => {
        if (drawerPhase !== 'enter') return
        let raf2 = 0
        const raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setDrawerPhase((p) => (p === 'enter' ? 'open' : p)))
        })
        return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2) }
      }, [drawerPhase])
      /**
       * Does this shape fold the CARDS (one beat each) rather than the whole group?
       * 'stagger' and 'slide' both do — they differ only in the path each card takes
       * (`deck-cascade.ts`'s `path`) — while 'zoom' moves the rail's box instead.
       */
      const cardShape = prefs.openShape !== 'zoom'
      /**
       * ── OPEN/CLOSE CASCADE (prefs.openShape === 'stagger') ──
       *
       * The rail's own box is ALREADY in its final place in this shape (no group
       * translate, no group scale — see `drawerShift` below), and every card
       * travels along the VERY SAME PATH the group would have travelled, each on
       * its own beat: same anchor (the wrapper's top-right corner, i.e. off the
       * right edge of the screen), same `drawerTravel`, same `drawerScale`, same
       * two curves — only the per-card progress differs, offset by rank.
       * rail/wave/deck-cascade.ts owns that motion; this file owns WHEN it runs.
       *
       * The state machine is deliberately not keyed on `drawerPhase`:
       *
       *   - 'enter' lasts two frames, so a cascade hung off the phase would be
       *     stopped (or restarted) by a change that says nothing about the fold —
       *     the exact bug this replaces, where the 'enter' effect's cleanup killed
       *     the scheduled class-removal timer and `cascade` stayed 'in' forever;
       *   - the drawer must unmount on the REAL end of the leave, so the fold
       *     reports its own completion instead of a timeout being guessed.
       *
       * `state()` is the whole trigger: a command is only issued when the clock is
       * neither already at the wanted end nor already travelling toward it, so the
       * 'enter' → 'open' flip, a re-render from new live data and a mode switch
       * are all no-ops, while an interrupted fold (close during open) is just the
       * other command — the shared clock reverses from where it stands.
       */
      /**
       * The deck's participant boxes (cards, then the 设置 tile), resolved further
       * down by the layout. Held in a ref so the effect above can read the CURRENT
       * geometry without depending on a value declared after its own early return.
       */
      const cascadeBoxesRef = React.useRef<readonly CascadeBox[]>([])
      /**
       * The two numbers the 'zoom' shape feeds its group transform (`drawerTravel`,
       * `drawerScale`). The fold reproduces the group's map PER CARD, so it must
       * ride the very same values — held in a ref for the same reason as the boxes.
       */
      const cascadeAnchorRef = React.useRef<{ travel: number; scale: number }>({ travel: 0, scale: 1 })
      /**
       * The group's own timeline, in ms — the fold's whole length. The per-rank step
       * and one card's travel are split out of it INSIDE the planner, from the count
       * of cards that are actually in the fold (see the visible-band filter): the
       * band's cut happens at fold-plan time, where the rail's scroll offset is
       * readable, and never at render time, where it is not. Ref-held like the boxes:
       * the effect runs before the layout that computes them is re-entered.
       */
      const cascadeTotalMsRef = React.useRef(groupDurationMs())
      /**
       * The rail's MEASURED inset the LAST time the drawer was on screen.
       *
       * The fold's band has to anticipate the co-tenant's push: `dsh-pinned-summary`
       * applies its tweened `padding-top` one beat AFTER the fold starts (measured
       * 2026-10-18: the rail's inset is the authored 4px on the fold's first frame and
       * 196px by the second), so the band built from the CURRENT inset is ~192px too
       * tall and animates rows that are cut — and hidden — microseconds later (the
       * reported flash). The previous open's inset is the only reading that exists
       * before the tween, and it is the right one whenever the co-tenant docks the same
       * way twice; erring HIGH costs those rows their fold, never a card that then
       * vanishes. Overwritten on every open-state render, so a panel that stops
       * pushing self-corrects on the next open.
       */
      const cascadeOpenInsetRef = React.useRef(RAIL_TOP_INSET)
      const drawerPhaseRef = React.useRef(drawerPhase)
      drawerPhaseRef.current = drawerPhase
      /** What the user last asked for, read by the fold's own settle handler. */
      const openWantedRef = React.useRef(shouldOpen)
      openWantedRef.current = shouldOpen
      /**
       * The fold's own state, for the marker and the reflow-wave gate.
       *
       * A REF, not React state, and the attribute is written straight onto the deck.
       * It used to be `useState`: every fold then cost TWO extra renders of this
       * whole component — one to publish `data-deck-anim`, one to clear it — and a
       * render here calls every installed widget's `render()` and reconciles the
       * deck. Measured on the owner's stage (2026-10-21, 1707×1067 @DSF1.5): the
       * click → first moving frame latency was 50–85ms, and that extra render was
       * most of it. The marker is now visible in the same commit the fold starts,
       * and the wave below reads it off the DOM (`RailWave`'s observer), which is
       * the one consumer that needed a re-render to notice.
       */
      const deckFoldRef = React.useRef<'in' | 'out' | null>(null)
      const markDeck = React.useCallback((next: 'in' | 'out' | null): void => {
        deckFoldRef.current = next
        // The fold's only LAYOUT property is the transcript's inset (see
        // rail/fold-inset.ts): it was armed at the state flip in index.ts, lands in
        // one step there, and the visible move rides a compositor pan. The
        // suppressor is released HERE, on the fold's own report, so a right-panel
        // open/close and a width drag get the shell's curve back exactly when the
        // cards stop moving instead of on a guessed timer.
        if (next === null) settleFoldInset()
        const el = deckRef.current
        if (el === null) return
        if (next === null) el.removeAttribute('data-deck-anim')
        else el.setAttribute('data-deck-anim', next)
      }, [])
      const deckRef = React.useRef<HTMLDivElement | null>(null)
      /**
       * Boot restore must not play the fold (see `bootRestorePending`): if the
       * rail was already WANTED at the first render, the first time the deck
       * appears is a restore, never a click — whether the prefs and the session
       * resolved together or the session arrived later. Consumed once, by the
       * first fold command; a genuine open afterwards always plays.
       */
      const cascadeRestore = React.useRef(snap.open)
      const cascadeRef = React.useRef<DeckCascade | null>(null)
      if (cascadeRef.current === null) {
        cascadeRef.current = createDeckCascade((end: CascadeEnd) => {
          markDeck(null)
          const phase = drawerPhaseRef.current
          if (end === 'closed') {
            // A re-open can land in the very frame the fold bottoms out (open →
            // close → open inside one gesture). The user has already asked for the
            // open again, so the fold must TURN AROUND rather than be retired:
            // retiring the deck here (or clearing its transforms) snaps every card
            // from its retracted offset back to its cell — measured as a single
            // 168px jump, the one visible seam of a fast reversal.
            if (openWantedRef.current) (cascadeRef.current as DeckCascade).play('open')
            // Otherwise the leave is over exactly when the fold has finished
            // retracting, and the drawer is retired on that report. One frame is
            // allowed to pass first: a re-open issued in THIS frame may not have
            // reached React yet (the click commits in its own task), and retiring
            // now would unmount the deck under a user who just asked for it — the
            // fold would then restart from a remount instead of turning around.
            // One frame of the retracted fold is invisible; a remount is not.
            else if (phase === 'leave') {
              window.requestAnimationFrame(() => {
                if (openWantedRef.current || drawerPhaseRef.current !== 'leave') return
                setDrawerPhase('closed')
              })
            }
            // Anything else means the deck STAYS on screen (a close that was
            // already cancelled), so the retracted offsets are residue: hand the
            // cards back instead.
            else (cascadeRef.current as DeckCascade).release()
          }
        })
      }
      React.useLayoutEffect(() => {
        const cascade = cascadeRef.current as DeckCascade
        const deck = deckRef.current
        // 'zoom' owns a whole-group transform and an unmounted deck has nothing to
        // fold: either way the cards go back to their final layout position with
        // nothing left written on them.
        if (!cardShape || deck === null) {
          cascade.release()
          markDeck(null)
          return
        }
        // The corner both shapes start from, and the group's two start values.
        // `transform-origin` is READ off the live wrapper — it resolves to the RAIL's
        // own top-right corner (`right var(--dsx-rail-top, 0px)`), not the viewport's
        // — rather than assumed, so a shell that re-anchors the drawer moves both
        // shapes together. Only the 'drop' path is anchored: 'slide' has no origin.
        const path: CascadePath = prefs.openShape === 'stagger' ? 'drop' : 'slide'
        const drawer = path === 'drop' ? document.querySelector('.dsx-stats-drawer') : null
        const origin = drawer === null ? [] : getComputedStyle(drawer).transformOrigin.split(' ')
        const anchor: CascadeAnchor = {
          travel: cascadeAnchorRef.current.travel,
          scale: cascadeAnchorRef.current.scale,
          originX: Number.parseFloat(origin[0] ?? '') || 0,
          originY: Number.parseFloat(origin[1] ?? '') || 0,
        }
        // ── THE FOLD ONLY ANIMATES THE ROWS THE RAIL SHOWS (owner, 2026-10-18) ──
        // The band is `RailWave`'s own whole-card band in deck coordinates
        // (`scrollTop − inset` … `+ clientHeight`, the same numbers its `cutBy` tests
        // resting boxes against), read ONCE here — at fold-plan time, with the deck at
        // rest by construction (see `cascade.sync`). Both the scroll offset and the
        // usable pane are read, never state that arrives a frame late: `paneH` is the
        // parent's own measure of that clientHeight and the element read is only its
        // fallback for the one frame before the pane observer's first callback.
        //
        // The INSET is deliberately the PUSHED one (`cascadeOpenInsetRef`): the
        // co-tenant's push lands one beat after the fold starts, so the un-pushed
        // reading would put ~192px of rows in the fold that the push cuts — and hides
        // — moments later.
        const rail = railElRef.current
        const pane = paneH > 0 ? paneH : (rail === null ? 0 : rail.clientHeight)
        const bandInset = Math.max(railTopInset, cascadeOpenInsetRef.current)
        const band: CascadeBand | undefined = rail !== null && pane > 0
          ? { lo: rail.scrollTop - bandInset, hi: rail.scrollTop - bandInset + pane }
          : undefined
        cascade.sync(planCascade(deck, cascadeBoxesRef.current, anchor, {
          totalMs: cascadeTotalMsRef.current,
          // 'drop' rides BOTH of the zoom shape's curves, one per channel: the
          // translation on the position curve, the scale on the zoom curve — which
          // is what makes each card's path the group's path rather than a lookalike.
          // 'slide' has one channel and reads only the first.
          easeShift: curveToProgress(shiftCurve),
          easeZoom: curveToProgress(prefs.animCurve),
          path,
        }, band))
        const at = cascade.state()
        const want: CascadeEnd = shouldOpen ? 'open' : 'closed'
        if (at === (want === 'open' ? 'to-open' : 'to-closed')) return
        if (at === want) {
          // Nothing to play. On the close side that means the leave is already
          // over — the deck never folded anything in this shape — so retire the
          // drawer now instead of leaving it to the safety-net timeout.
          if (want === 'closed' && drawerPhase === 'leave') setDrawerPhase('closed')
          return
        }
        if (want === 'open') {
          const restore = cascadeRestore.current
          cascadeRestore.current = false
          if (restore || reduceMotion) {
            cascade.jump(want)
            markDeck(null)
            return
          }
        } else if (reduceMotion) {
          cascade.jump(want)
          markDeck(null)
          return
        }
        markDeck(want === 'open' ? 'in' : 'out')
        cascade.play(want)
      }, [cardShape, shouldOpen, drawerPhase, reduceMotion])
      /**
       * ── A CARD THE WHOLE-CARD RULE HIDES MID-FOLD LEAVES THE FOLD ──
       *
       * The band is planned at the fold's start; the rail's band can still shrink
       * WHILE the fold runs (the co-tenant's push landing, a window resize, a widget
       * count reflow). `RailWave` re-cuts the deck on every such change — this passes
       * the fresh verdicts to the running clock so the cards it just hid stop being
       * written to (7 of 16 writes per frame in the measured case, and a transform
       * left on a hidden node). Removing a card cannot move another one: the plan's
       * geometry, order and delays are untouched (`DeckCascade.prune`).
       *
       * Runs on every render, but does nothing unless a fold is in flight: two
       * `classList` reads per card on the hover path are free, a `cancelAnimationFrame`
       * that never happened is not.
       */
      React.useLayoutEffect(() => {
        const cascade = cascadeRef.current
        if (cascade === null) return
        const at = cascade.state()
        if (at !== 'to-open' && at !== 'to-closed') return
        cascade.prune((el) => el.classList.contains(SLOT_CUT_CLASS))
      })
      // Leave: unmount once the thing that carries the leave is done.
      React.useEffect(() => {
        if (drawerPhase !== 'leave') return
        if (reduceMotion) { setDrawerPhase('closed'); return }
        if (cardShape) {
          // Safety net only, for a fold that can never report back (a deck that
          // could not be measured). The real close is the cascade's own callback.
          const cap = window.setTimeout(
            () => setDrawerPhase((p) => (p === 'leave' ? 'closed' : p)),
            (cascadeRef.current as DeckCascade).total + 250,
          )
          return () => window.clearTimeout(cap)
        }
        const slide = window.setTimeout(() => setDrawerPhase((p) => (p === 'leave' ? 'closed' : p)), DRAWER_LEAVE_MS)
        return () => window.clearTimeout(slide)
      }, [drawerPhase, reduceMotion, cardShape])
      /** Retired right now (closed, but kept mounted — see the note at the top). */
      const retired = drawerPhase === 'closed'
      // The converged OPEN inset, recorded for the NEXT fold's band (see
      // `cascadeOpenInsetRef`): only while the drawer is on screen and the deck has
      // stopped folding, i.e. once the co-tenant's push has actually landed. A
      // ref-write during render, exactly like `drawerPhaseRef` above.
      if (!retired && deckFoldRef.current === null) cascadeOpenInsetRef.current = railTopInset
      const keepMounted = retired && snap.hasSession && (everOpenRef.current || prewarm)
      if (!keepMounted) retiredElRef.current = null
      if (retired && !keepMounted) return null
      // Geometry resolves against the space the product's transcript measure
      // leaves over (see readRailBudget): the rail may shrink (a narrower card
      // inside the SAME column count, then fewer columns) and finally collapse,
      // but it never pushes the reading measure below what the user chose.
      // Read the LIVE budget, not the React snapshot: a render can be committed
      // after the yield was applied directly to the DOM, and a stale snapshot
      // would then write the pre-yield geometry back (measured: a yielded drawer
      // re-claiming 372px, insetting a transcript whose rail was invisible).
      // One decision function, shared with the direct-DOM beat write, so React
      // and the animation path can never disagree about the geometry.
      const space = resolveRailSpace(prefs, railBudget)
      const yielded = space.yielded
      const side = space.side
      const pad = space.pad
      const columns = space.columns
      const multi = columns > 1
      // Rail width is the STATIC grid width —NO magnification overshoot. The
      // rail no longer reserves left room for the bell-curve overshoot (which
      // used to widen both the rail and --dsx-rail-w, pushing the conversation
      // column right). A magnified card's left growth is instead painted by a
      // fixed overlay layer OUTSIDE the rail's scroll-clip box (see magnifyLayer)
      // so the conversation column keeps the resting rail's width at all times.
      const railW = space.drawW
      const hidden = space.hidden
      // Guarded root writes: this runs in the render body, i.e. on EVERY render
      // of the rail — and the rail re-renders on each wave follow frame. An
      // unguarded `setProperty` on :root invalidates every declaration that
      // reads the custom property, so identical values would buy a whole-document
      // style recalc per frame. Measured 2026-10-03 (owner's stage, two
      // open/close cycles, `.tmp-fold-filmstrip.cjs`): the rail's own writes
      // landed 20×, 18 of them carrying the value already in the declaration
      // (`--dsx-rail-pad` 6/6 identical, `--dsx-rail-w` 6 of 8; `--dsx-rail-overshoot`
      // 6/6 — that one is a dead variable, no rule reads it, so it is gone).
      setRailVar('--dsx-rail-w', `${space.claimW}px`)
      setRailVar('--dsx-rail-pad', `${pad}px`)
      applyRailRight(space.swallowed)
      // --dsx-rail-scroll is owned by RailWave (it tracks the rail's scrollTop).
      // Live stats (session figures + the bridge's payload slices + this
      // instance's own config) are assembled by ONE shared fold, `buildLiveStats`
      // — the same record the preview surfaces render from, so "the preview shows
      // what the rail card shows" is structural instead of a second
      // implementation kept in sync by hand. The fold's rules (heatmap fallback,
      // pooled view modes, config-last) live in runtime/live-stats.ts.
      interface RailItem { key: string; size: WidgetSize; w: (typeof WIDGETS)[number]; out: NonNullable<ReturnType<(typeof WIDGETS)[number]['render']>>; baseW: number }
      // Pooled usage views live in `buildLiveStats` (it owns the fold), so the
      // rail no longer derives them here.
      const items: RailItem[] = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
        .map((key) => {          const { widgetId, size } = parseInstanceKey(key)
          const w = WIDGETS.find((x) => x.id === widgetId)
          if (!w || sizesOf(w).indexOf(size) === -1) return null
          // Per-card render isolation: ONE crashing widget (e.g. a malformed
          // usage payload) must never take down the whole rail —a render
          // exception used to kill the entire shell.overlay slot entry, hiding
          // every widget until the next hard refresh. The bad card degrades to
          // a placeholder instead; the error stays visible in the console.
          let out: WidgetRenderOut | null
          const outKey = `${key}|${size}`
          try {
            out = w.render(buildLiveStats(snap, prefs, key, armedAction), { size })
          } catch (error) {
            console.error(`[dsh-widgets] widget ${widgetId}@${size} render crashed:`, error)
            out = { title: widgetName(w), value: '—', legend: t('ui.renderError') }
          }
          // Loading skeleton: the widget's live source has not answered yet, so
          // the card keeps its slot (and therefore the deck's shape) with
          // placeholder pills instead of flashing an empty/0-valued body. The
          // skeleton is a SHELL decision —see WIDGET_RUNTIME.
          const source = WIDGET_RUNTIME[widgetId]?.source
          if (source !== undefined && isSourcePending(source, snap)) {
            const silhouette = WIDGET_RUNTIME[widgetId]?.skeleton
            out = {
              title: out?.title ?? widgetName(w),
              skeleton: true,
              skeletonRows: silhouette?.rows ?? 1,
              ...(silhouette === undefined ? {} : { skeletonShape: silhouette.shape, skeletonCount: silhouette.count }),
            }
          }
          // Same painting ⇒ same object (see `outCache`): this is what lets the
          // element cache below AND React itself skip the card's whole subtree.
          const prevOut = outCache.current.get(outKey)
          if (prevOut !== undefined && sameOut(prevOut, out)) out = prevOut
          outCache.current.set(outKey, out)
          if (outCache.current.size > 64) outCache.current.clear()
          if (!out) return null
          // 2×4 is exactly two 2×2 widths plus one inter-card gap.
          const baseW = size === '2x4' ? 2 * side + pad : side
          return { key, size, w, out, baseW }
        })
        .filter((it): it is RailItem => it !== null)
        // In a 1-column layout a 2×4 tile (two cells wide) cannot fit the single
        // rail column, so its instances are hidden —TEMPORARILY blocklisted,
        // not removed: switching back to 2/4 columns restores them from
        // installed/order as-is. The market marks those entries in the same state
        // (struck-through title + yellow capsule + disabled add).
        .filter((it) => !(columns === 1 && it.size === '2x4'))
      // The rail is a fixed viewport panel anchored to the right edge. The
      // dsh-better-sidebar bundle occupies the same edge with its own
      // fixed right panel (z-index 40) and pushes the app shell via
      // `#root { margin-right: var(--dsh-sidebar-width) }` (neutralized by
      // dsh-ui-harmonizer to the conversation column's margin-right). The rail
      // anchors its right edge to that SAME variable inline (0 while absent)
      // and its CSS carries `transition: right` —deliberately on the MAIN
      // THREAD, the same animation path as the conversation column's
      // margin-right. A compositor transform (v1.2.3) never dropped frames,
      // but when the column's per-frame reflow overran a frame the rail kept
      // gliding while the column stalled —the two visibly split. Same-path
      // animation cannot split: both surfaces advance in the same style−抣ayout
      // pass every frame. The rail subtree is cheap (lazy overlay deck, no
      // persistent will-change), so the per-frame cost is negligible.
      // Padding is `0 pad pad pad`: no top inset so the first card aligns with
      // the session header's bottom edge; right/left keep the resize handle
      // room, bottom keeps the last card off the viewport floor.
      const scale = side / BASE_SIDE
      const addRadius = Math.round(16 * scale)
      // Wave placement geometry (scale field / reflow / add-button slot) lives in its
      // own module: see rail/wave/wave-geometry.ts.
      const {
        rows, active, deckBottom, staticLayout, stepScale, scaleFor, placeCards, nearest, xPts, yPts, addSlotFor,
      } = createWaveGeometry({ items, side, pad, columns, railW, multi, magnify: prefs.magnify, realTime: prefs.realTime })
// Deck height covers the live reflow bottom AND the add button (when it
      // hangs below the deck), so neither ever clips or pushes unexpectedly.
      const nItems = items.length
      const staticAdd = addSlotFor(staticLayout)
      const addTop = staticAdd.top
      const addRight = staticAdd.right
      const addBottom = addTop + side
      const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad
      /**
       * ── SCROLL GEOMETRY ──
       *
       * Row `r` is seated at `RAIL_ROW_SEAT + r · pitch` (placeCards) and the rail's
       * range is `scrollH − clientH`. The deck's own box stays its natural height
       * (`stackHeight`); the room a detent needs beyond it is reserved by the TAIL
       * element inside the rail (see RailWave), because the deck's box is ALSO the
       * overlay's box and the two decks must stay pixel-identical while the wave is
       * live.
       *
       * Without that reservation the browser CLAMPS the last detents and the deck
       * stops moving (measured 1578×1000, 8 rows × pitch 184: range 750 < the 5th
       * detent, so rows 5–8 could never top out — the reported "a row stays half
       * hidden and further scrolling does nothing at all").
       */
      const paneH = railPaneH
      const scrollPitch = Math.max(1, side + pad)
      const deckH = stackHeight      /**
       * The DEEPEST component the deck draws: the last row's cards AND the 设置
       * tile (which hangs below the grid whenever the last row has no free cell).
       */
      const contentBottom = Math.max(deckBottom, addBottom)
      /**
       * LAST DETENT — the SMALLEST row that puts that bottom edge fully inside the
       * pane (2026-10-01, replacing "the last row whose cards still reach into the
       * viewport").
       *
       * Row `r` is seated at `RAIL_ROW_SEAT + r · pitch` (placeCards), and at that
       * detent the pane's floor sits at `lo + clientH`, where `lo = scrollTop − inset`
       * and `inset` is the rail's MEASURED top padding (`railTopInset`). The deepest
       * component is whole as soon as
       *
       *     contentBottom ≤ (RAIL_ROW_SEAT + r · pitch − inset) + paneH
       *     r            ≥ (contentBottom + inset − RAIL_ROW_SEAT − paneH) / pitch
       *
       * and the SMALLEST such row is where the wheel stops: from there on the deck
       * has shown everything it owns, so another notch would only pull the last row
       * up and leave blank band under it — the reported "keep scrolling and it is
       * just blank". (The old rule let the last row TOP OUT, which left up to
       * `paneH − rows·pitch` of nothing below the content; with whole-cards on it
       * also let the bottom row walk out of the pane and vanish mid-scroll.)
       *
       * ── THE INSET IS THE CO-TENANT'S PUSH (owner, 2026-10-14) ──
       * With `inset` pinned to the authored 4px, a pushed rail (dsh-pinned-summary docking
       * above the deck) computed a cap that needed LESS scroll than the deck really did, and
       * the last rows could not be reached: measured 2026-10-08 on the owner's GUI,
       * `padding-top: 135px`, `maxScroll: 147`, wheel 0 → 0. The band in RailWave reads this
       * same number, so the card it hides is a card this cap can still scroll to.
       *
       * `paneH` is 0 only before the ResizeObserver's first (same-tick, pre-paint)
       * callback; the guard keeps that one frame from computing a runaway cap.
       */
      const lastRow = paneH > 0
        ? Math.max(0, Math.ceil((contentBottom + railTopInset - RAIL_ROW_SEAT - paneH) / scrollPitch))
        : 0
      // ONE builder for a card's interactive body, shared by the resting deck and
      // the magnify overlay. While the wave is live the overlay is the surface the
      // user sees AND touches (see the magnify layer's note), so its copies carry
      // the real handlers —action, pooled-view cycle and the bottom-left resize
      // grip —instead of being a dead picture.
      /**
       * ── CARD-ELEMENT CACHE: re-opening a retired drawer must not re-render the deck ──
       *
       * The drawer is kept mounted while closed (see the note at the top of this function),
       * but a re-open still rebuilds its ELEMENT tree, and React reconciles by element
       * identity: 13 fresh `CardBody` elements would re-render 13 chart subtrees — the very
       * ~285ms the retired drawer was meant to avoid. So the elements themselves are cached
       * per widget and handed back whenever the widget's own inputs are unchanged, which
       * makes re-opening cost a class flip plus the fold.
       *
       * The comparison is deliberately about DATA, not about closures: the handlers are
       * written to be version-independent (see `snapRef` and `armedRef`), so a recycled
       * element behaves exactly like a fresh one. When a widget's `out` changes — a data
       * update, a locale change, a new cycle mode — the cache misses and that card only
       * re-renders then.
       */
      if (cardElCache.current.size > 64) cardElCache.current.clear()
      const cardBodyFor = (it: RailItem, width: number): React.ReactNode[] => {
        const aria = t('ui.rail.resizeAria')
        // The live output. A stale-while-animating freeze (render the output the card was
        // last PAINTED with, so the fold never waits on a widget render) was tried here on
        // 2026-10-03 and REVERTED: it removed the card rebuilds from the fold — 13 instead of
        // 121 per toggle — but the fold's first frame stopped landing on the group's map
        // (203px off, scripts/verify-deck-cascade-live.cjs). See the "WHERE THIS STANDS" note
        // in the hooks block for the full measurement.
        const out = it.out
        // The key carries the WIDTH because the two callers ask for two different ones: the
        // resting deck renders a body at its resting cell width (`c.w`) and the magnify
        // overlay at the base unit (`it.baseW`). Keyed by widget alone they would evict each
        // other on every render and the cache would never hit.
        const cacheKey = `${it.key}|${width}`
        const hit = cardElCache.current.get(cacheKey)
        if (hit !== undefined && hit.out === out && hit.unit === side && hit.width === width
          && hit.squircle === prefs.squircle && hit.corner === prefs.cornerPercent && hit.aria === aria) {
          return hit.nodes
        }
        const nodes: React.ReactNode[] = [
          React.createElement(CardBody, { key: 'b', out, unit: side, width, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, onAction: actionsFor(it.key), onCycle: cyclePool(it.key) }),
          React.createElement('span', { key: 'r', className: 'dsx-stats-resize', 'aria-label': aria, onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = getPrefs().cardSide; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
        ]
        cardElCache.current.set(cacheKey, { out, unit: side, width, squircle: prefs.squircle, corner: prefs.cornerPercent, aria, nodes })
        return nodes
      }
      // The overlay's bodies are built ONCE per render of this (parent) component —
      // and this component does NOT re-render on pointer moves (the hover state
      // lives in RailWave), so a follow frame re-uses these element objects and
      // React bails out of every card subtree.
      const overlayCardBodies = items.map((it) => cardBodyFor(it, it.baseW))
      /**
       * The 设置 tile's action: bring up the official settings window on OUR section.
       *
       * The window is a resident panel (it is not unmounted when it closes), so the common
       * case is one click on the nav row. When it is not on screen yet the foot trigger opens
       * it, and the row is picked up on a later frame: the panel's nav is committed by React
       * after the click and, when the window animates in, the row may not exist for a handful
       * of frames — so poll instead of guessing a delay. The poll gives up quietly (the
       * window is opened either way; the user is left on whatever section was active) rather
       * than throwing inside a pointer handler.
       */
      const openSettingsSection = (): void => {
        // 1. The window is already on screen on ANY section: the row is one click away.
        const row = findSettingsSectionRow()
        if (row !== null) { row.click(); return }
        // 2. Open the product's settings window, then navigate to our section.
        //    DSH 0.2.x nests 设置 in the account menu, so there are two beats to poll
        //    for: the menu item, then our nav row (see `findSettingsMenuItem`).
        const trigger = findSettingsTrigger()
        if (trigger !== null) {
          trigger.click()
          clickWhenFound(findSettingsMenuItem)
          clickWhenFound(findSettingsSectionRow, 90)
          return
        }
        // 3. Last resort: the product's own shortcut (the item advertises Ctrl+Alt+,).
        //    Only a shell that has neither the foot trigger nor the menu item gets here.
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: ',', code: 'Comma', ctrlKey: true, altKey: true, bubbles: true, cancelable: true,
        }))
        clickWhenFound(findSettingsSectionRow, 90)
      }
      /**
       * The 设置 tile's click — ONE action for BOTH copies of the tile (the resting
       * deck's button and the magnify overlay's, which is the one the pointer reaches
       * while the wave is live). See the note on `openSettingsSection`.
       */
      const onTileClick = openSettingsSection
      /**
       * ── THE FOLD'S PARTICIPANTS AND THEIR TIMING ──
       *
       * The boxes (cards, then the 设置 tile) in DOM order, with each one's height so
       * the planner can apply the visible-band filter against the rail's own band. The
       * RANK TABLE and the delays are NOT built here any more: only the planner knows
       * how many cards the band leaves in the fold, and the ladder's step is split out
       * of the group's duration by that count (`cascadeTiming`) — it stamps
       * `--dsx-slot-delay` / `--dsx-slot-delay-out` on exactly the cards it plans, and
       * removes both from the cards the band cuts (see `planCascade`). A probe reading
       * those stamps is therefore reading the fold, and the stamp's PRESENCE is
       * participation.
       *
       * The order itself is unchanged: the deck's BOTTOM-LEFT cell is rank 0 (it moves
       * first) and its TOP-RIGHT one is last, so the deck reads as an accordion rather
       * than a block that scales (`cascadeRanks`). The 设置 TILE is a cell of the same
       * grid and is ranked by the same key — it is normally the first beat, being
       * parked below the last row (or in that row's free left cell), and it drops out
       * of the fold exactly when the band cuts it.
       *
       * ── AND THE WHOLE FOLD LASTS AS LONG AS THE GROUP'S OWN TRANSITION ──
       * One card's travel and the per-rank step are SPLIT out of that duration rather
       * than chosen independently (`cascadeTiming`): a cascade added on top of a full
       * per-card travel is exactly what made the fold run twice as long as the 'zoom'
       * shape it is a version of (measured 610ms against 300ms).
       */
      const cascadeBoxes: readonly CascadeBox[] = [
        ...staticLayout.map((c) => ({ top: c.top, right: c.right, h: c.h })),
        { top: addTop, right: addRight, h: side },
      ]
      cascadeBoxesRef.current = cascadeBoxes
      cascadeTotalMsRef.current = groupDurationMs()
      /**
       * Draw-in depth: the 'zoom' shape starts the WHOLE GROUP here, the 'stagger'
       * shape starts EVERY CARD here about the same corner (`prefs.animScale`, the
       * single value both shapes read).
       */
      const cardFrom = Math.min(1, Math.max(0.5, prefs.animScale))
      // Static deck: resting grid + every interactive affordance. Built HERE so
      // its element identity stays stable while the pointer moves —RailWave
      // re-renders per hover frame, and React bails out of this whole subtree
      // because the element object it receives never changes. The engage fade is
      // the `.dsx-wave-deck` class the wave puts on its wrapper (no re-render).
      const deck = React.createElement('div', { key: '__deck', ref: deckRef, style: { position: 'relative', height: `${deckH}px` } as React.CSSProperties },
        staticLayout.map((c, idx) => {
          const it = items[idx]
          // No cascade delay here (see the note above `cascadeBoxes`): the fold stamps
          // `--dsx-slot-delay` / `--dsx-slot-delay-out` on the cards it plans, at plan
          // time, so the ladder and the participant set have one home.
          const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px` } as React.CSSProperties
          // `it.key` (the INSTANCE key, `widget@size`), never `it.w.id`: the rail may
          // hold the same widget twice (2x2 and 2x4 — e.g. `heatmap-bars@2x2` and
          // `heatmap-bars@2x4` are both installed), and two siblings sharing a React
          // key make reconciliation drop one of the two old fibers: the dropped
          // node is never deleted, so it stays in the deck at its stale seat — an
          // extra card painted on its own, above the others, that disappears only
          // while the wave hides the whole resting deck. See the same note in
          // RailWave's overlay.
          return React.createElement('div', { key: it.key, className: 'dsx-stats-card-slot', style: slotStyle },
            ...cardBodyFor(it, c.w),
          )
        }),
        // Bottom add button, parked inside the deck so it shares the grid layout:
        // it fills the empty last-row cell on odd counts, or sits right-aligned
        // below the rows on even counts / single column.
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: onTileClick, style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } as React.CSSProperties },
          React.createElement('span', { className: 'dsx-stats-add-icon' }, settingsGearIcon(20)),
          React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
        ),
      )
      const rail = React.createElement(RailWave, {
        key: '__wave', deck, cardBodies: overlayCardBodies, railElRef, onAddClick: openSettingsSection, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active,
        // Nothing of the rail is visible while it is retired or has no room, and the wave's hover
        // oracle is geometric (it reads the tile boxes, which a retired drawer still has) — so the
        // rail must be told, or hovering the collapsed rail's band lights it up over the
        // conversation (owner's report, 2026-10-03). See `onScreen` in RailWave.
        onScreen: !retired && !hidden,
        // ...and the official right panel is a different coverer again: geometry.ts resolves
        // `swallowed` when a panel takes the rail's space and pins the rail inside the panel's
        // band, where it is COVERED. The rail is open and on screen, yet it is not the surface
        // under the pointer anywhere — so the wave must not arm, and (because the magnify layer
        // is portaled to <body> at z-index 26, above the panel's un-z-indexed column) must not
        // paint over it either. Owner's report, 2026-10-03: 「右侧打开右侧边栏时也会激活悬浮显示」.
        covered: space.swallowed,
        placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor,
        restLayout: staticLayout, restAdd: staticAdd,
        live: snap.open && snap.hasSession, shiftX: space.shiftX, columns, wholeCards: prefs.wholeCards,
        topInset: railTopInset,
        // The fold only exists in the 'stagger' shape; 'zoom' passes null, and a
        // non-null value also tells the wave to stand its own reflow animation
        // down for as long as the cards' `transform` belongs to the fold.
      })
      // The self-made add panel that used to live HERE (portal + drag-width + close
      // head, wrapping `WidgetsPage`) is sealed in `surfaces/add-panel.tsx`: from
      // 2026-10-20 the tile opens the official settings window on our section, and
      // the spare is not mounted (so it costs nothing per render and cannot reappear
      // by accident). The drawer below no longer carries a panel child.
      //
      // Drawer wrapper: the ONE surface that slides. position:fixed inset:0
      // keeps every fixed child (rail / magnify overlay) positioned
      // exactly as before —a transformed fixed ancestor becomes their
      // containing block, but this wrapper spans the viewport so the
      // coordinates are identical —while the wrapper's own translateX carries
      // the whole group. Opening glides in from the RIGHT (translateX(+travel)
      // −0, leftwards into its resting slot); closing is the reverse (0 −
      // translateX(+travel), sliding out to the right). pointer-events:none:
      // interaction stays on the children that opt in.
      // Travel distance is the rail's own width (+24px margin), NOT a
      // percentage: translateX(%) on this wrapper would resolve against the
      // VIEWPORT width (inset:0), sliding a whole screen-width instead of one
      // rail width (far too fast over the same 0.3s).
      // 2026-10-01 — the slide above gains a ZOOM out of the TOP-RIGHT corner.
      //    Both halves ride ONE `transform` on the same wrapper
      //    (`translateX(travel) scale(s0)` → `none`), anchored by a `transform-origin`
      //    at that corner: the group appears to grow out of the corner it hangs from
      //    while it glides into place.
      //    WHICH corner is the question the owner asked on 2026-10-08 (「为什么…以整个
      //    右侧区域的右上角为锚点而不是组件区域范围内的右上角」): the wrapper is
      //    `inset: 0`, so a bare `top right` anchors on the VIEWPORT's top-right — a
      //    point `--dsx-rail-top` (44px live) ABOVE the rail's own top edge, and the
      //    point the cards visibly fly in from. The anchor is therefore the rail's own
      //    top-right corner: `right var(--dsx-rail-top, 0px)`. The cascade reproduces
      //    this map per card and READS the computed origin off this very element
      //    (`deck-cascade.ts`, via `getComputedStyle(drawer).transformOrigin`), so the
      //    two can never disagree.
      //    Both numbers are USER PREFS (设置 → 高级设置): `animScale` is the
      //    starting scale, `animCurve` the easing. `animScale = 1` degenerates to
      //    exactly the old pure slide, so the previous behaviour is still
      //    reachable without a second code path.
      const foldOrigin = 'right var(--dsx-rail-top, 0px)'
      const drawerTravel = Math.round(railW + 24)
      const drawerAnimating = drawerPhase === 'enter' || drawerPhase === 'leave'
      // Clamped again here (not just in normalizePrefs): this runs on the
      // prefs the CONTROLLER holds, which a caller could have patched directly.
      const drawerScale = cardFrom
      // The 'stagger' fold REPRODUCES this pair per card (see deck-cascade.ts), so
      // the two shapes must never read them from different places.
      cascadeAnchorRef.current = { travel: drawerTravel, scale: drawerScale }
      // TWO curves, TWO elements: a single `transform` cannot carry two timing
      // functions, so the wrapper slides (`translateX`) on the POSITION curve
      // while an inner box scales on the ZOOM curve. Both are the shell's 0.3s
      // so the pair still reads as one motion.
      //
      // ── THE OUTER MOTION IS PER SHAPE (owner request 2026-10-02) ──
      //
      // 'zoom' keeps the group transform it shipped with: the wrapper carries
      // `translateX(travel)` and the inner box `scale(animScale)`, both about the
      // top-right corner, so the rail arrives as one block.
      //
      // 'stagger' does NOT transform the group at all — that is the whole point of
      // the shape. The rail's own box is already at its final place and only the
      // CARDS move, each along the path this transform would have taken the whole
      // group along (deck-cascade.ts reads `drawerTravel`/`drawerScale` and the
      // wrapper's own `transform-origin` for exactly that reason). The group
      // transform used to run in BOTH shapes, and since it moved the entire drawer
      // by the rail's full width it drowned the per-card offsets completely: the
      // cards' small drift was invisible next to a ~450px column slide (the
      // reported "identical to a plain slide"). Nothing else needed to change — the
      // 设置 panel is PORTALED to <body> (measured: `.dsx-stats-addpanel`'s parent is
      // BODY, not the drawer), so it never rode this transform, and the magnify
      // overlay is opacity-0 at rest. The panel keeps its own `.open` transition on
      // its own layer, which is why standing the group transform down cannot make
      // it pop.
      const groupMoves = drawerAnimating && prefs.openShape === 'zoom'
      /**
       * The FIRST painted frame of an open must carry NO transition.
       *
       * It used to get that for free: the drawer was MOUNTED by that render, so the start
       * `translateX(travel)` was simply its first style. Since the drawer is now kept mounted
       * while closed (see the note at the top), that same write would instead START a
       * transition from the resting 0 — the group would creep toward `travel` and then be
       * sent back two frames later, and the zoom shape's slide would never appear at all
       * (measured by scripts/verify-deck-cascade-live.cjs: "0 frames with tx"). So the enter
       * frame is explicitly transition-free, exactly like a fresh mount was.
       */
      const enterStart = drawerPhase === 'enter'
      const shiftEasing = reduceMotion || enterStart ? 'none' : `transform var(--ds-transition-duration-slow) ${curveToEasing(shiftCurve)}`
      const zoomEasing = reduceMotion || enterStart ? 'none' : `transform var(--ds-transition-duration-slow) ${curveToEasing(prefs.animCurve)}`
      const drawerShift = groupMoves ? `translateX(${drawerTravel}px)` : 'none'
      const drawerZoom = groupMoves ? `scale(${Math.round(drawerScale * 1000) / 1000})` : 'none'
      // The whole drawer (rail + magnify + add panel) fades as ONE surface when
      // the rail yields, on the same duration/easing as the panel's push, so the
      // two motions cannot split (the official layout README requires co-motion
      // with the track transition).
      // Opacity is used ONLY for the no-space-to-hide case (a narrow window with
      // no panel to cover the rail). When a panel is present the rail stays fully
      // opaque and simply sits under it —that is the swallow.
      const drawerOpacity = hidden ? 0 : 1
      // The class is also the instant, emit-proof kill switch for the whole
      // group: `body.dsx-stats-no-session` (see the rail-width effect below)
      // hides it in the same style pass the transcript's yield is released.
      const drawerEl = React.createElement('div', { key: '__drawer', ref: (el: HTMLDivElement | null) => { setDrawerEl(el) }, className: 'dsx-stats-drawer', 'data-yielded': yielded ? '' : undefined, 'data-no-room': hidden ? '' : undefined, 'data-retired': retired ? '' : undefined, style: { position: 'fixed', inset: 0, pointerEvents: 'none', transformOrigin: foldOrigin, transform: drawerShift, opacity: drawerOpacity, transition: `${shiftEasing}, opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out)` } },
        // The zoom half: same inset:0 box, so the rail's fixed coordinates are
        // unchanged under either transform (the layer is the containing block).
        React.createElement('div', { key: '__zoom', className: 'dsx-stats-drawer-zoom', style: { position: 'fixed', inset: 0, pointerEvents: 'none', transformOrigin: foldOrigin, transform: drawerZoom, transition: zoomEasing } },
          rail,
        ),
      )
      // PORTALED to the drawer layer on <body> (see `drawerLayerHost`): the slot
      // this component is registered in lives inside the composer card, and a
      // containing block anywhere above a `position: fixed` layer squeezes the
      // whole rail into that card's strip. The wrapper still spans the viewport, so
      // every fixed child (rail, deck, magnify) keeps the coordinates it had, and
      // the group's translateX travels the same rail width.
      const drawerLayer = createPortal(drawerEl, drawerLayerHost())
      if (!retired) return drawerLayer
      // RETIRED: build once, then hand back the SAME element object on every later render.
      // React compares element identity and bails out of this entire subtree — no card body,
      // no chart and no layout effect runs while the rail is closed, and the deck's DOM (and
      // the folded-out transforms it is holding) simply stays where it is, hidden.
      if (retiredElRef.current === null) retiredElRef.current = drawerLayer
      return retiredElRef.current
  }
}
