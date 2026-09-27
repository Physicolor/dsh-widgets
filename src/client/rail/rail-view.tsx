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
import { parseInstanceKey, sizesOf, widgetName, type WidgetRenderOut, type WidgetSize } from '../lib/contract'
import { DEFAULT_TZ, buildHeatmapGrid, loadHeatmapStore } from '../lib/heatmap-accounting'
import { type BridgeSnapshot } from '../runtime/bridge'
import { type Prefs } from '../runtime/prefs'
import { CardBody } from '../render/CardBody'
import { cardRadius } from '../render/card-geometry'
import { WidgetsPage } from '../surfaces/Settings'
import { COL_GAP, DETAIL_W, LIST_W } from '../surfaces/layout'
import { t } from '../i18n'
import { BASE_SIDE, RAIL_ROW_SEAT, applyRailRight, resolveRailSpace } from './geometry'
import { RailWave } from './wave/RailWave'
import { createWaveGeometry } from './wave/wave-geometry'

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
      // Hooks MUST be declared unconditionally, before the early return, or the
      // hook count changes when `open`/`hasSession` flip (React error #310).
      const [addOpen, setAddOpen] = React.useState(false)
      // Action-cards: an armed action id waits for a second click before firing,
      // so destructive/expensive actions (e.g. Compact) need two taps to run.
      const [armedAction, setArmedAction] = React.useState<string | null>(null)
      const handleAction = (id: string): void => {
        const command = ACTION_COMMANDS[id]
        if (!command) return
        if (armedAction !== id) { setArmedAction(id); return }
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
        const entry = snap.usageMulti?.keys.find((k) => k.label === next)
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
      const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Boot restore must NOT play the enter glide. Prefs are read synchronously
      // while the session arrives asynchronously, so at mount the drawer is
      // `closed` even though the rail is already wanted: the restore that
      // follows then looks exactly like a user open and slides the drawer on
      // every refresh. `bootRestorePending` marks precisely that state (wanted,
      // session still unknown); a genuine later open never sets it.
      const bootRestorePending = React.useRef(snap.open && !snap.hasSession)
      // Leave timeout: the CSS slide is 0.3s (--ds-transition-duration-slow);
      // unmount 350ms later so the element is gone only after the slide ends.
      const DRAWER_LEAVE_MS = 350
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
      // Leave: unmount once the slide finishes (instant for reduced-motion).
      React.useEffect(() => {
        if (drawerPhase !== 'leave') return
        if (reduceMotion) { setDrawerPhase('closed'); return }
        const t = window.setTimeout(() => setDrawerPhase((p) => (p === 'leave' ? 'closed' : p)), DRAWER_LEAVE_MS)
        return () => window.clearTimeout(t)
      }, [drawerPhase, reduceMotion])
      if (drawerPhase === 'closed') return null
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
      // Heatmap day data is owned by the dock collector: the authoritative host
      // map when dsh-usage-center is installed, else its own persisted live log.
      // The rail consumes the collector's values and never overrides them; only
      // when stats lacks heatmap fields entirely (first paint before the
      // collector effect runs) does it fall back to the persisted table so the
      // cards are never blank.
      const statsHeat = (snap.stats as { heatmapRaw?: Record<string, number>; heatmapGrid?: unknown } | null) ?? null
      const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0
        ? statsHeat.heatmapRaw
        : (snap.usageDaily ?? loadHeatmapStore())
      const base = {
        ...(snap.stats ?? { turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0, usage: null }),
        // Only inject the fallback when live stats lacks heatmap fields.
        ...(statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } }),
        ...(statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, (prefs.cardConfigs?.heatmap?.monthMode as 'rolling' | 'quarter') || 'rolling', (prefs.cardConfigs?.heatmap?.timeZone as string) || DEFAULT_TZ) }),
      }
      interface RailItem { key: string; size: WidgetSize; w: (typeof WIDGETS)[number]; out: NonNullable<ReturnType<(typeof WIDGETS)[number]['render']>>; baseW: number }
      // Pooled usage views: ['total', 'Key 1', 'Key 2', 'Key N'] when the pool has
      // more than one key; otherwise usage cards fall back to single-key data.
      const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1
        ? ['total', ...snap.usageMulti!.keys.map((entry, i) => entry.label || `Key ${i + 1}`)]
        : undefined
      const items: RailItem[] = prefs.order
        .filter((id) => prefs.installed.indexOf(id) !== -1)
        .map((key) => {
          const { widgetId, size } = parseInstanceKey(key)
          const w = WIDGETS.find((x) => x.id === widgetId)
          if (!w || sizesOf(w).indexOf(size) === -1) return null
          // Per-card render isolation: ONE crashing widget (e.g. a malformed
          // usage payload) must never take down the whole rail —a render
          // exception used to kill the entire shell.overlay slot entry, hiding
          // every widget until the next hard refresh. The bad card degrades to
          // a placeholder instead; the error stays visible in the console.
          let out: ReturnType<typeof w.render>
          try {
            out = w.render({ ...base, usageData: snap.usageData, usageMulti: snap.usageMulti, commandCode: snap.commandCode, commandCodeError: snap.commandCodeError, commandCodeDaily: snap.commandCodeDaily, sysinfo: snap.sysinfo, github: snap.github, githubError: snap.githubError, poolModes, armedAction, ...(prefs.cardConfigs?.[key] ?? {}) } as Parameters<typeof w.render>[0], { size })
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
       * ── SCROLL GEOMETRY: how tall the SCROLL CONTENT must be ──
       *
       * Row `r` is seated at `RAIL_ROW_SEAT + r · pitch` (placeCards) and the rail's
       * range is `contentH − clientH`, so the LAST row can top out exactly when
       *
       *     contentH = max(rows · pitch, stackHeight) + paneH
       *
       * with `paneH` the rail's MEASURED clientHeight. The deck's own box stays its
       * natural height (`stackHeight`); the difference is reserved by the TAIL element
       * inside the rail (see RailWave), because the deck's box is ALSO the overlay's box
       * and the two decks must stay pixel-identical while the wave is live.
       *
       * Without the reservation the browser CLAMPS the last detents and the deck stops
       * moving (measured 1578×1000, 8 rows × pitch 184: range 750 < the 5th detent, so
       * rows 5–8 could never top out — the reported "a row stays half hidden and further
       * scrolling does nothing at all"). With MORE than one detent-range of extra content
       * the wheel keeps scrolling past the last row into empty space — the reported
       * "keep scrolling and it is just blank" — so the tail is exactly the difference
       * between the two, never a fixed guess.
       */
      const paneH = railPaneH
      const scrollPitch = Math.max(1, side + pad)
      const deckH = stackHeight
      /**
       * How far the deck may scroll: the last row whose cards still reach into the
       * viewport. Beyond that the wheel would only pull empty space up — the reported
       * "keep scrolling and it is just blank".
       *
       * `contentBottom` is the deepest CARD bottom (the add tile hangs below the grid
       * or fills its last-row cell, so it is not the thing the user is scrolling to
       * see). The range that just fits it is `contentBottom − clientH`; the last row
       * allowed is therefore `floor((range − RAIL_ROW_SEAT) / pitch)`, floored at row 0
       * so a deck shorter than the viewport still has one detent.
       */
      const contentBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2)
      /**
       * HIGHEST ROW THAT MAY TOP OUT — the scroll stop the user asked for.
       *
       * A row may top out only while its own cards still REACH INTO the viewport; past
       * that the wheel would pull up nothing but the empty tail. The last such row is
       * the one holding the deepest bottom that is still on screen:
       *
       *     cards' visible bottom at row r = r · pitch + clientH  (r · pitch = their top)
       *     last row                       = ceil((contentBottom + clientH − seat) / pitch) − 1
       *
       * Measured 1578×1000 with 8 rows × 184 (contentBottom 1450, clientH 936): the last
       * row is 7, so the deck stops with row 7 at the top and its cards showing — the
       * extra detents into blank space are gone. (A tighter `contentBottom − clientH`
       * cap is WRONG: it lands on row 2 here and would hide rows 3–7 entirely.)
       */
      const lastRow = Math.max(0, Math.min(
        rows - 1,
        Math.ceil((contentBottom + paneH - RAIL_ROW_SEAT) / scrollPitch) - 1,
      ))
      // ONE builder for a card's interactive body, shared by the resting deck and
      // the magnify overlay. While the wave is live the overlay is the surface the
      // user sees AND touches (see the magnify layer's note), so its copies carry
      // the real handlers —action, pooled-view cycle and the bottom-left resize
      // grip —instead of being a dead picture.
      const cardBodyFor = (it: RailItem, width: number): React.ReactNode[] => [
        React.createElement(CardBody, { key: 'b', out: it.out, unit: side, width, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, onAction: handleAction, onCycle: cyclePool(it.key) }),
        React.createElement('span', { key: 'r', className: 'dsx-stats-resize', 'aria-label': t('ui.rail.resizeAria'), onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); const sx = e.clientX; const s0 = getPrefs().cardSide; const move = (ev: PointerEvent) => { setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) }) }; const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up) } }),
      ]
      // The overlay's bodies are built ONCE per render of this (parent) component —
      // and this component does NOT re-render on pointer moves (the hover state
      // lives in RailWave), so a follow frame re-uses these element objects and
      // React bails out of every card subtree.
      const overlayCardBodies = items.map((it) => cardBodyFor(it, it.baseW))
      const toggleAdd = (): void => setAddOpen((v) => !v)
      // Static deck: resting grid + every interactive affordance. Built HERE so
      // its element identity stays stable while the pointer moves —RailWave
      // re-renders per hover frame, and React bails out of this whole subtree
      // because the element object it receives never changes. The engage fade is
      // the `.dsx-wave-deck` class the wave puts on its wrapper (no re-render).
      const deck = React.createElement('div', { key: '__deck', style: { position: 'relative', height: `${deckH}px` } },
        staticLayout.map((c, idx) => {
          const it = items[idx]
          const slotStyle = { position: 'absolute' as const, top: `${c.top.toFixed(2)}px`, right: `${c.right.toFixed(2)}px`, width: `${c.w.toFixed(2)}px`, height: `${c.h.toFixed(2)}px` }
          return React.createElement('div', { key: it.w.id, className: 'dsx-stats-card-slot', style: slotStyle },
            ...cardBodyFor(it, c.w),
          )
        }),
        // Bottom add button, parked inside the deck so it shares the grid layout:
        // it fills the empty last-row cell on odd counts, or sits right-aligned
        // below the rows on even counts / single column.
        React.createElement('button', { key: '__add', type: 'button', className: 'dsx-stats-add', 'aria-label': t('ui.rail.addAria'), onClick: toggleAdd, style: { position: 'absolute', top: `${addTop.toFixed(2)}px`, right: `${addRight.toFixed(2)}px`, width: `${side}px`, height: `${side}px`, borderRadius: `${addRadius}px` } },
          React.createElement('span', { className: 'dsx-stats-add-icon' },
            React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true }, React.createElement('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' })),
          ),
          React.createElement('span', { className: 'dsx-stats-add-label' }, t('ui.rail.addLabel')),
        ),
      )
      const rail = React.createElement(RailWave, {
        key: '__wave', deck, cardBodies: overlayCardBodies, railElRef, onAddClick: toggleAdd, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active,
        placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor,
        restLayout: staticLayout, restAdd: staticAdd,
        live: snap.open && snap.hasSession, shiftX: space.shiftX, columns,
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
      const drawerTravel = Math.round(railW + 24)
      const drawerTransform = drawerPhase === 'enter' || drawerPhase === 'leave' ? `translateX(${drawerTravel}px)` : 'none'
      const drawerTransition = reduceMotion ? 'none' : 'transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)'
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
      return React.createElement('div', { key: '__drawer', ref: (el: HTMLDivElement | null) => { setDrawerEl(el) }, className: 'dsx-stats-drawer', 'data-yielded': yielded ? '' : undefined, 'data-no-room': hidden ? '' : undefined, style: { position: 'fixed', inset: 0, pointerEvents: 'none', transform: drawerTransform, opacity: drawerOpacity, transition: `${drawerTransition}, opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out)` } },
        rail, addPanel,
      )
  }
}