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
import { WIDGETS, WIDGET_RUNTIME } from '../generated.registry'
import { parseInstanceKey, sizesOf, widgetName } from '../lib/contract/helpers'
import type { WidgetRenderOut, WidgetSize } from '../lib/contract/types'
import { buildLiveStats } from '../runtime/live-stats'
import { type BridgeSnapshot } from '../runtime/bridge'
import { curveToEasing, curveToProgress, overshootCurve, type Prefs } from '../runtime/prefs'
import { CardBody } from '../render/CardBody'
import { settingsGearIcon } from '../render/icons'
import { cardRadius } from '../render/card-geometry'
import { WidgetsPage } from '../surfaces/Settings'
import { COL_GAP, DETAIL_W, LIST_W } from '../surfaces/layout'
import { t } from '../i18n'
import { BASE_SIDE, RAIL_ROW_SEAT, applyRailRight, resolveRailSpace } from './geometry'
import { RailWave } from './wave/RailWave'
import { createWaveGeometry } from './wave/wave-geometry'
import {
  type CascadeAnchor, type CascadeBox, type CascadeEnd, type DeckCascade,
  cascadeDelay, cascadeRanks, cascadeTiming, createDeckCascade, groupDurationMs, planCascade,
} from './wave/deck-cascade'

/** Map from interactive action id to the slash command it triggers. */
const ACTION_COMMANDS: Record<string, string> = {
  contextCompact: '/compact',
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
 * `commandCodeError` is deliberately part of the test: once the host route has
 * ANSWERED with an error the card must show its real "not configured" state,
 * not a skeleton that never resolves.
 */
function isSourcePending(source: 'usage' | 'cc' | 'sys' | 'github', snap: BridgeSnapshot): boolean {
  if (source === 'usage') return snap.usageData === null && (snap.usageMulti === null || snap.usageMulti.keys.length === 0)
  if (source === 'cc') return snap.commandCode === null && snap.commandCodeError === null
  // GitHub: the route answers `errors` for the slices it could not fill, so a
  // 200 with an empty calendar is an ANSWER (the card prints why) — only a
  // request that has never returned anything is "loading".
  if (source === 'github') return snap.github === null && snap.githubError === null
  return snap.sysinfo === null
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
      const [addOpen, setAddOpen] = React.useState(false)
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
      const handleAction = (id: string): void => {
        const command = ACTION_COMMANDS[id]
        if (!command) return
        // Read the armed flag through a REF, not the render's state: the card element that
        // carries this handler may be RECYCLED from an older render (see the card-element
        // cache by `cardBodyFor`), so a closure over `armedAction` would answer with the
        // state as of that render and the two-tap confirm would either fire early or never.
        if (armedRef.current !== id) { setArmedAction(id); return }
        setArmedAction(null)
        runCommand(command)
      }
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
      // The add panel belongs to a live session: drop it when the session does.
      // (The wave's own focus state is dropped by RailWave on the same signal.)
      React.useEffect(() => {
        if (!snap.open || !snap.hasSession) setAddOpen(false)
      }, [snap.open, snap.hasSession])
      // 组件配置's detail drawer adds width to the panel — but only up to a
      // MINIMUM, never blindly `pw + 440`: a panel the user has already dragged
      // wide has room for the drawer, and inflating it anyway left a dead band on
      // the right (measured 2026-09-25: a 914px row = 190 list + 440 drawer + 284
      // empty). The drawer is flexible, so any extra width goes to the preview and
      // to the metric columns instead of to nothing. NOT reset when the panel
      // closes: closing and reopening the card must come back the way it was.
      const [detailOpen, setDetailOpen] = React.useState(false)
      // Click anywhere OUTSIDE the panel and it closes — the gesture every
      // popover in this product answers to. The rail's own surfaces are excluded
      // (its cards, the magnify layer, the 组件 capsule and the 添加 button
      // itself, which toggles the panel on its own click), because those are not
      // "empty space": clicking a card is a deliberate act on the rail.
      React.useEffect(() => {
        if (!addOpen) return
        const onDown = (e: PointerEvent): void => {
          const target = e.target instanceof Element ? e.target : null
          if (target === null) return
          if (target.closest('.dsx-stats-addpanel') !== null) return
          if (target.closest('.dsx-stats-rail') !== null) return
          if (target.closest('.dsx-magnify-layer') !== null) return
          if (target.closest('.dsx-stats-add') !== null) return
          if (target.closest('.dsx-stats-capsule') !== null) return
          setAddOpen(false)
        }
        // Capture phase: a click on a shell control that stops propagation still
        // closes the panel, and the panel's own descendants are filtered above.
        document.addEventListener('pointerdown', onDown, true)
        return () => document.removeEventListener('pointerdown', onDown, true)
      }, [addOpen])
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
        const measure = (): void => {
          const rail = railElRef.current
          if (rail === null) return
          setRailPaneH((prev) => (prev === rail.clientHeight ? prev : rail.clientHeight))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(measure)
        // Window resize changes the rail's height even when nothing else does.
        window.addEventListener('resize', measure)
        const retry = window.setTimeout(() => {
          const rail = railElRef.current
          if (rail !== null) ro.observe(rail)
          measure()
        }, 0)
        return () => { window.clearTimeout(retry); window.removeEventListener('resize', measure); ro.disconnect() }
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
       * ── ONE WIDGET RENDER PER (DATA, CHROME), NOT ONE PER RENDER ──
       *
       * Building `items` below CALLS every installed widget's `render()` — 13 chart builders per
       * call — and this component renders several times per open/close (drawer phase, emits,
       * prefs). Nothing about that output depends on the phase, so re-running it per render was
       * pure waste, and the FRESH object it returned also defeated `cardElCache` (nothing could
       * compare equal). Keyed on the exact inputs an output depends on, an unchanged widget is
       * free and hands back the SAME object, which is what lets `cardElCache` hit and React
       * bail out of that card's subtree.
       *
       * Deliberately NOT paired with a "hold the snapshot while a fold is in flight" freeze: that
       * was measured too (with the compositing hint already in place) and the 300ms data-adoption
       * delay it costs did not buy a frame rate. This cache changes NO behaviour — data still
       * lands in the commit it arrives in; it only stops redundant recomputation.
       */
      const widgetOutCache = React.useRef(new Map<string, { snap: unknown; prefs: unknown; armed: string | null; side: number; out: RailItem['out'] | null }>())
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
       * IS in the tree (`widgetOutCache` above) because it changes no behaviour and the deck's card
       * rebuilds drop from ~121 to ~13 per toggle; the SNAPSHOT FREEZE is what stayed out.
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
      const staggerShape = prefs.openShape === 'stagger'
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
      const deckRef = React.useRef<HTMLDivElement | null>(null)
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
       * The group's own timeline, split into one card's travel and the per-rank
       * step. `(n − 1) · step + duration` IS that timeline, so the fold can never
       * outlast the 'zoom' gesture it is a version of. Ref-held like the boxes: the
       * effect runs before the layout that computes them is re-entered.
       */
      const cascadeTimingRef = React.useRef<{ duration: number; step: number }>({ duration: 180, step: 9 })
      const drawerPhaseRef = React.useRef(drawerPhase)
      drawerPhaseRef.current = drawerPhase
      /** What the user last asked for, read by the fold's own settle handler. */
      const openWantedRef = React.useRef(shouldOpen)
      openWantedRef.current = shouldOpen
      /** The fold's own state, for the marker and the reflow-wave gate. */
      const [deckAnim, setDeckAnim] = React.useState<'in' | 'out' | null>(null)
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
          setDeckAnim(null)
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
        if (!staggerShape || deck === null) {
          cascade.release()
          setDeckAnim(null)
          return
        }
        // The corner both shapes start from, and the group's two start values.
        // `transform-origin` is READ off the live wrapper (it resolves to the
        // viewport's top-right, `1578px 0px` at a 1578px window) rather than
        // assumed, so a shell that re-anchors the drawer moves both shapes together.
        const drawer = document.querySelector('.dsx-stats-drawer')
        const origin = drawer === null ? [] : getComputedStyle(drawer).transformOrigin.split(' ')
        const anchor: CascadeAnchor = {
          travel: cascadeAnchorRef.current.travel,
          scale: cascadeAnchorRef.current.scale,
          originX: Number.parseFloat(origin[0] ?? '') || 0,
          originY: Number.parseFloat(origin[1] ?? '') || 0,
        }
        cascade.sync(planCascade(deck, cascadeBoxesRef.current, anchor, {
          duration: cascadeTimingRef.current.duration,
          // The fold rides BOTH of the zoom shape's curves, one per channel: the
          // translation on the position curve, the scale on the zoom curve — which
          // is what makes each card's path the group's path rather than a lookalike.
          easeShift: curveToProgress(shiftCurve),
          easeZoom: curveToProgress(prefs.animCurve),
        }))
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
            setDeckAnim(null)
            return
          }
        } else if (reduceMotion) {
          cascade.jump(want)
          setDeckAnim(null)
          return
        }
        setDeckAnim(want === 'open' ? 'in' : 'out')
        cascade.play(want)
      }, [staggerShape, shouldOpen, drawerPhase, reduceMotion])
      // Leave: unmount once the thing that carries the leave is done.
      React.useEffect(() => {
        if (drawerPhase !== 'leave') return
        if (reduceMotion) { setDrawerPhase('closed'); return }
        if (staggerShape) {
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
      }, [drawerPhase, reduceMotion, staggerShape])
      /** Retired right now (closed, but kept mounted — see the note at the top). */
      const retired = drawerPhase === 'closed'
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
      document.documentElement.style.setProperty('--dsx-rail-w', `${space.claimW}px`)
      document.documentElement.style.setProperty('--dsx-rail-pad', `${pad}px`)
      document.documentElement.style.setProperty('--dsx-rail-overshoot', `0px`)
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
          let out: ReturnType<typeof w.render>
          const outKey = `${key}|${size}`
          const cachedOut = widgetOutCache.current.get(outKey)
          if (cachedOut !== undefined && cachedOut.snap === snap && cachedOut.prefs === prefs
            && cachedOut.armed === armedAction && cachedOut.side === side) {
            out = cachedOut.out
          } else {
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
            widgetOutCache.current.set(outKey, { snap, prefs, armed: armedAction, side, out })
            if (widgetOutCache.current.size > 64) widgetOutCache.current.clear()
          }
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
      const closeIcon = React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true },
        React.createElement('path', { d: 'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z', fill: 'currentColor' }),
        React.createElement('path', { d: 'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z', fill: 'currentColor' }),
      )
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
       * detent the pane's floor sits at `lo + clientH` with `lo = scrollTop − 4`.
       * The deepest component is whole as soon as
       *
       *     contentBottom ≤ (RAIL_ROW_SEAT + r · pitch − 4) + paneH
       *     r            ≥ (contentBottom + 2 − paneH) / pitch
       *
       * and the SMALLEST such row is where the wheel stops: from there on the deck
       * has shown everything it owns, so another notch would only pull the last row
       * up and leave blank band under it — the reported "keep scrolling and it is
       * just blank". (The old rule let the last row TOP OUT, which left up to
       * `paneH − rows·pitch` of nothing below the content; with whole-cards on it
       * also let the bottom row walk out of the pane and vanish mid-scroll.)
       *
       * `paneH` is 0 only before the ResizeObserver's first (same-tick, pre-paint)
       * callback; the guard keeps that one frame from computing a runaway cap.
       */
      const lastRow = paneH > 0
        ? Math.max(0, Math.ceil((contentBottom + RAIL_ROW_SEAT - paneH) / scrollPitch))
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
          React.createElement(CardBody, { key: 'b', out, unit: side, width, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, onAction: handleAction, onCycle: cyclePool(it.key) }),
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
      const toggleAdd = (): void => setAddOpen((v) => !v)
      /**
       * ── STAGGER ORDER for the open/close cascade (prefs.openShape) ──
       *
       * Each participant's position in the fold: the deck's BOTTOM-LEFT cell is
       * rank 0 (it moves first) and its TOP-RIGHT one is last — the two corners
       * act as the anchors of the motion, which is what makes the deck read as an
       * accordion opening rather than a block that scales. The rule itself lives
       * in rail/wave/deck-cascade.ts (one place, so the order the CSS custom
       * properties expose and the order the fold actually plays cannot drift).
       *
       * The 设置 TILE participates: it is a cell of the same grid, and leaving it
       * out would paint a static square in the middle of a folding deck every
       * time the surface is hovered (the tile is revealed by hover). It is ranked
       * by the same key, and since it is parked BELOW the last row (or in that
       * row's free left cell) it is normally the first beat.
       *
       * The delays are stamped per slot as custom properties rather than kept in
       * JS: `--dsx-slot-delay` is what the fold reads back off the elements (so
       * the rank table has one home), and `--dsx-slot-delay-out` publishes the
       * mirror an interruption falls into — the collapse is the same timeline
       * played backwards, so that number is what a probe can audit the reverse
       * order against without having to catch a fold in the act.
       *
       * ── AND THE WHOLE FOLD LASTS AS LONG AS THE GROUP'S OWN TRANSITION ──
       * One card's travel and the per-rank step are SPLIT out of that duration
       * rather than chosen independently (`cascadeTiming`): a cascade added on top
       * of a full per-card travel is exactly what made the fold run twice as long
       * as the 'zoom' shape it is a version of (measured 610ms against 300ms).
       */
      const cascadeBoxes: readonly CascadeBox[] = [
        ...staticLayout.map((c) => ({ top: c.top, right: c.right })),
        { top: addTop, right: addRight },
      ]
      cascadeBoxesRef.current = cascadeBoxes
      const { order: staggerIn, reverse: staggerOut } = cascadeRanks(cascadeBoxes)
      const cascadeClock = cascadeTiming(groupDurationMs(), cascadeBoxes.length)
      cascadeTimingRef.current = cascadeClock
      /** The tile's own rank — it is the last entry of the box list above. */
      const tileRank = staggerIn.length - 1
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
      const deck = React.createElement('div', { key: '__deck', ref: deckRef, 'data-deck-anim': deckAnim ?? undefined, style: { position: 'relative', height: `${deckH}px` } as React.CSSProperties },
        staticLayout.map((c, idx) => {
          const it = items[idx]
          const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px`, '--dsx-slot-delay': cascadeDelay(staggerIn[idx], cascadeClock.step), '--dsx-slot-delay-out': cascadeDelay(staggerOut[idx], cascadeClock.step) } as React.CSSProperties
          return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle },
            ...cardBodyFor(it, c.w),
          )
        }),
        // Bottom add button, parked inside the deck so it shares the grid layout:
        // it fills the empty last-row cell on odd counts, or sits right-aligned
        // below the rows on even counts / single column.
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: toggleAdd, style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px`, '--dsx-slot-delay': cascadeDelay(staggerIn[tileRank], cascadeClock.step), '--dsx-slot-delay-out': cascadeDelay(staggerOut[tileRank], cascadeClock.step) } as React.CSSProperties },
          React.createElement('span', { className: 'dsx-stats-add-icon' }, settingsGearIcon(20)),
          React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
        ),
      )
      const rail = React.createElement(RailWave, {
        key: '__wave', deck, cardBodies: overlayCardBodies, railElRef, onAddClick: toggleAdd, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active,
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
        // The fold only exists in the 'stagger' shape; 'zoom' passes null, and a
        // non-null value also tells the wave to stand its own reflow animation
        // down for as long as the cards' `transform` belongs to the fold.
        deckPhase: staggerShape ? deckAnim : null,
      })
      // Temporary right-side add panel: reuses the component-config + component-market settings pages
      // (WidgetsPage) wholesale, floats over content, never affects layout.
      // Width is configurable (prefs.panelWidth) and draggable via the left edge.
      const pw = prefs.panelWidth
      const startResize = (e: React.PointerEvent): void => {
        e.preventDefault(); e.stopPropagation()
        const x0 = e.clientX, w0 = pw
        const move = (ev: PointerEvent) => setPrefs({ panelWidth: Math.max(260, Math.min(760, Math.round(w0 + (x0 - ev.clientX)))) })
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
      }
      // The add panel is PORTALED to <body> —deliberately OUT of the drawer.
      //
      // Why (measured 2026-09-18, 1578×1022 and 1280×760): the drawer lives in
      // `conversation.input.overlay`, whose stacking ancestor chain is the
      // composer seat (z-index 7). Within that context the panel's own z-index 30
      // is meaningless: the official composer's input row / send button and the
      // right sidebar's `wSkVaW_widthHandle` (full-height, z-index 8) painted
      // ABOVE the popup card —a 16px hit-test grid over the panel box reported
      // only 92.7% / 89% coverage, with the panel's bottom-left corner and a
      // full-height vertical strip belonging to other layers. Portaled to body
      // the panel competes at the root stacking context (z-index 30 > composer 7,
      // width handle 8, right sidebar 10, shell overlay 20), so it is once again
      // the top surface. It also stops fading when the rail yields.
      //
      // The panel keeps every anchor it needs: --dsx-rail-top / --dsx-input-bottom
      // / --dsx-rightbar-w / --dsx-rail-pad are written on documentElement, so a
      // body-level child still resolves them.
      const addPanel = createPortal(React.createElement('div', {
        className: 'dsx-stats-addpanel' + (addOpen ? ' open' : '') + (prefs.squircle ? ' dsx-squircle' : ''),
        style: {
          top: 'var(--dsx-rail-top,0px)',
          // Enough for list + drawer, and never more than that on the drawer's
          // behalf: an already-wide panel keeps its width (the drawer grows into
          // it) instead of sprouting a dead band on the right. 26 = the panel's own
          // 2px of borders + the body's 24px of padding, so DETAIL_W is the
          // drawer's REAL width (the inner then keeps its 2px mask slack).
          width: `${detailOpen ? Math.max(pw, LIST_W + COL_GAP + DETAIL_W + 26) : pw}px`,
          // Continuous curvature, bound to the 设置 gear: same `corner-shape`
          // switch the cards use, and the same corner percentage, measured
          // against a 100px reference so a panel-sized surface gets a
          // panel-sized radius instead of 16% of its own 700px side.
          borderRadius: `${cardRadius(100, prefs.cornerPercent)}px`,
        },
      },
        React.createElement('span', { className: 'dsx-stats-addpanel-resize', 'aria-label': t('ui.addPanel.resizeAria'), onPointerDown: startResize }),
        React.createElement('div', { className: 'dsx-stats-addpanel-header' },
          React.createElement('div', { className: 'dsx-stats-addpanel-title' }, t('ui.addPanel.title')),
          React.createElement('button', { type: 'button', className: 'dsx-stats-addpanel-close', 'aria-label': t('ui.addPanel.closeAria'), onClick: () => setAddOpen(false) }, closeIcon),
        ),
        React.createElement('div', { className: 'dsx-stats-addpanel-body' },
          // The drawer's FINAL width: with it the preview is laid out at its final
          // size from the first frame, and the drawer reveals it by widening — no
          // small-to-large zoom while the panel animates.
          React.createElement(WidgetsPage, { controller: {
            prefs,
            setPrefs,
            onDetailToggle: setDetailOpen,
            // 26 = the body's 12+12 padding PLUS the panel's own 1px border on each
            // side (box-sizing: border-box). Deriving it from the width alone left
            // the inner 2px wider than the mask, and that is exactly where a row's
            // 1px edge line got cut (reported 2026-09-26).
            detailWidth: Math.max(DETAIL_W, pw - 26 - LIST_W - COL_GAP),
            railSide: side,
            // The previews inside this panel render from the same fold the cards
            // above do, instance config included — so the stage is the real card
            // (with real data where a session provides it), not a mock layout.
            liveStats: (key: string) => buildLiveStats(snap, prefs, key, armedAction),
          }, hideHeader: true }),
        ),
      ), document.body)
      // Always render the panel too so closing slides it out (`.open` toggles
      // visibility/transform); when closed it is hidden (visibility + opacity)
      // and never intercepts pointer events over the rail.
      //
      // Drawer wrapper: the ONE surface that slides. position:fixed inset:0
      // keeps every fixed child (rail / magnify overlay / add panel) positioned
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
      //    (`translateX(travel) scale(s0)` → `none`), anchored by
      //    `transform-origin: top right`: the group now appears to grow out of
      //    the corner it hangs from while it glides into place, and the wrapper's
      //    top-right corner IS the rail's own whenever no right panel is present
      //    (the case the animation is seen in).
      //    Both numbers are USER PREFS (设置 → 高级设置): `animScale` is the
      //    starting scale, `animCurve` the easing. `animScale = 1` degenerates to
      //    exactly the old pure slide, so the previous behaviour is still
      //    reachable without a second code path.
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
      const drawerEl = React.createElement('div', { key: '__drawer', ref: (el: HTMLDivElement | null) => { setDrawerEl(el) }, className: 'dsx-stats-drawer', 'data-yielded': yielded ? '' : undefined, 'data-no-room': hidden ? '' : undefined, 'data-retired': retired ? '' : undefined, style: { position: 'fixed', inset: 0, pointerEvents: 'none', transformOrigin: 'top right', transform: drawerShift, opacity: drawerOpacity, transition: `${shiftEasing}, opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out)` } },
        // The zoom half: same inset:0 box, so the rail's fixed coordinates are
        // unchanged under either transform (the layer is the containing block).
        React.createElement('div', { key: '__zoom', className: 'dsx-stats-drawer-zoom', style: { position: 'fixed', inset: 0, pointerEvents: 'none', transformOrigin: 'top right', transform: drawerZoom, transition: zoomEasing } },
          rail,
        ),
        addPanel,
      )
      if (!retired) return drawerEl
      // RETIRED: build once, then hand back the SAME element object on every later render.
      // React compares element identity and bails out of this entire subtree — no card body,
      // no chart and no layout effect runs while the rail is closed, and the deck's DOM (and
      // the folded-out transforms it is holding) simply stays where it is, hidden.
      if (retiredElRef.current === null) retiredElRef.current = drawerEl
      return retiredElRef.current
  }
}
