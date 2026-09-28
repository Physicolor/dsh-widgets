/**
 * dsh-widgets —组件市场: the browse list, the gallery, and the preview stage.
 *
 * Moved verbatim out of components.tsx (Phase 3.8). Holds the market hero (FLIP) switch
 * and its ZoomGhost, the shared-axis gallery push, search + view toggle, and the stage
 * that renders a real card for the selected group.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { WIDGETS } from '../../generated.registry'
import { groupOf, instanceKey, sizesOf, widgetDesc, widgetName, widgetSimToggle } from '../../lib/contract/helpers'
import type { UsageData, WidgetRenderOut, WidgetSize, WidgetStats } from '../../lib/contract/types'
import { nextSim } from '../../render/preview/sim'
import { CardBody } from '../../render/CardBody'
import { buildPreviewStats, exampleOut } from '../../render/preview/example-out'
import { ChevronLeftIcon, ChevronRightIcon, gridViewIcon, listViewIcon, searchIcon } from '../../render/icons'
import type { WidgetsController } from '../../runtime/controller'
import { t } from '../../i18n'

/** 组件市场's hero (FLIP) transition toggle.
 *
 *  OFF by design: the market ⇄ preview move is a SHARED-AXIS push (the gallery
 *  slides left, the preview slides in from the right). A card that additionally
 *  flies on its own reads as a second, conflicting motion — the user's call
 *  (2026-09-27): 「其他都是右边弹出、瀑布流向左平移，却有一个组件在做 FLIP，
 *  视觉上非常割裂」. The implementation is kept intact (ZoomGhost + `.dsx-zoomghost`
 *  + `openGroup`'s seed) so it can be switched back on here, or reused elsewhere,
 *  the day a surface wants a card-expand instead of a push. */
const MARKET_HERO = false

/** iOS-style zoom: the clicked tile grows and travels into the preview's slot.
 *  A FLIP over a fixed-position ghost that renders the SAME card; the stage's
 *  card is the authority for the final box, so the ghost lands exactly on it and
 *  then unmounts. */
function ZoomGhost({ zoom, target, onDone }: {
  zoom: { x: number; y: number; w: number; h: number; out: WidgetRenderOut; unit: number; cardW: number; size: WidgetSize; squircle?: boolean; cornerPercent?: number; phase: 'in' | 'out' }
  target: React.RefObject<HTMLDivElement | null>
  onDone: () => void
}): React.ReactElement | null {
  const [box, setBox] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const done = React.useRef(onDone)
  done.current = onDone
  const reverse = zoom.phase === 'out'
  React.useLayoutEffect(() => {
    const el = target.current
    if (el === null) { done.current(); return }
    // The stage layer SLIDES in (shared axis), so a raw rect is mid-flight:
    // subtract the layer's own translation to get the SETTLED box the ghost must
    // land on. The card's own size is re-read until it stops moving (its slot
    // width is measured) — otherwise the ghost lands short and the card pops.
    const settled = (r: DOMRect): { x: number; y: number; w: number; h: number } => {
      let layer: HTMLElement | null = el
      while (layer !== null && !(layer.className || '').toString().includes('dsx-mkt-layer')) layer = layer.parentElement
      let dx = 0
      let dy = 0
      if (layer !== null) {
        const t = getComputedStyle(layer).transform
        if (t !== '' && t !== 'none' && typeof DOMMatrixReadOnly !== 'undefined') {
          const m = new DOMMatrixReadOnly(t)
          dx = m.m41
          dy = m.m42
        }
      }
      return { x: r.left - dx, y: r.top - dy, w: r.width, h: r.height }
    }
    let box = settled(el.getBoundingClientRect())
    setBox(box)
    let tries = 0
    let raf = 0
    const tick = (): void => {
      const cur = target.current ? settled(target.current.getBoundingClientRect()) : box
      if (Math.abs(cur.w - box.w) > 1 && tries++ < 4) {
        box = cur
        setBox(cur)
        raf = requestAnimationFrame(tick)
        return
      }
      setPlaying(true)
    }
    raf = requestAnimationFrame(tick)
    const timer = setTimeout(() => done.current(), 560)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [])
  if (box === null) return null
  const sFrom = reverse ? Math.min(box.w / zoom.cardW, box.h / zoom.unit) : Math.min(zoom.w / zoom.cardW, zoom.h / zoom.unit)
  const sTo = reverse ? Math.min(zoom.w / zoom.cardW, zoom.h / zoom.unit) : Math.min(box.w / zoom.cardW, box.h / zoom.unit)
  // The ghost is positioned at the TARGET box and transformed back onto the
  // source, so the FLIP reads as one continuous move in either direction.
  const at = (rect: { x: number; y: number; w: number; h: number }, s: number): string =>
    `translate(${rect.x + rect.w / 2 - box.x - zoom.cardW / 2}px, ${rect.y + rect.h / 2 - box.y - zoom.unit / 2}px) scale(${s.toFixed(4)})`
  const from = at(reverse ? { x: box.x, y: box.y, w: box.w, h: box.h } : zoom, sFrom)
  const to = at(reverse ? zoom : { x: box.x, y: box.y, w: box.w, h: box.h }, sTo)
  return createPortal(React.createElement('div', {
    className: 'dsx-zoomghost',
    // PORTALED to <body> on purpose: the panel lives inside the rail's drawer
    // wrapper, which carries a transform — a `position: fixed` ghost inside it is
    // positioned against THAT wrapper, so it flew ~1000px off-screen and the user
    // saw an empty tile then a sudden preview (reported 2026-09-27).
    style: { left: box.x, top: box.y, width: zoom.cardW, height: zoom.unit, transform: playing ? to : from },
  }, React.createElement(CardBody, { out: zoom.out, unit: zoom.unit, width: zoom.size === '2x4' ? zoom.cardW : undefined, squircle: zoom.squircle, cornerPercent: zoom.cornerPercent, pinBox: true })), document.body)
}

// ---- Market tab ----

export function MarketTab({ controller, usageData }: { controller: WidgetsController; usageData: UsageData | null }): React.ReactElement {
  const { prefs, setPrefs } = controller
  // NOTE: every `useState` this component's effects depend on must be declared
  // BEFORE those effects — a dependency array is read at hook-call time, so
  // naming a later `useState` throws "Cannot access X before initialization"
  // (which is exactly how the market tab blanked itself once).
  const [q, setQ] = React.useState('')
  // The view is a PERSISTED pref (not component state): switching must survive a
  // reload, a session change — and ship as a user preference to plugin users.
  const view = prefs.marketView === 'grid' ? 'grid' : 'list'
  const setView = (v: 'list' | 'grid'): void => setPrefs({ marketView: v })
  const [previewGroup, setPreviewGroup] = React.useState<string | null>(null)
  const [previewIdx, setPreviewIdx] = React.useState(0)
  const galleryRef = React.useRef<HTMLDivElement | null>(null)
  const [colW, setColW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = galleryRef.current
    if (el === null) return
    const measure = (): void => {
      const w = el.clientWidth
      setColW((prev) => (Math.abs(prev - w) < 2 ? prev : w))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])
  // iOS-style zoom: the clicked card grows and travels into the preview slot
  // instead of the stage simply appearing. `zoom` carries the source rect; the
  // target is measured from the stage's card once it has rendered.
  const [zoom, setZoom] = React.useState<{ x: number; y: number; w: number; h: number; out: WidgetRenderOut; unit: number; cardW: number; size: WidgetSize; squircle?: boolean; cornerPercent?: number; phase: 'in' | 'out' } | null>(null)
  // The tile/card the preview was opened from, kept PAST the IN animation so the
  // back gesture can fly home (the IN ghost clears `zoom` when it lands).
  const [lastSource, setLastSource] = React.useState<{ x: number; y: number; w: number; h: number; out: WidgetRenderOut; unit: number; cardW: number; size: WidgetSize; squircle?: boolean; cornerPercent?: number } | null>(null)
  // Which way the shared-axis push is going while it runs (null = settled).
  const [anim, setAnim] = React.useState<'in' | 'out' | null>(null)
  const railSide = controller.railSide ?? 0
  // Live stats for one instance, when a session is running: the previews merge
  // the real record over the filler (see buildPreviewStats).
  const liveFor = (id: string, s: WidgetSize): WidgetStats | null => controller.liveStats?.(instanceKey(id, s)) ?? null
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const stageCardRef = React.useRef<HTMLDivElement | null>(null)
  // Measured in a LAYOUT effect so the stage's card is already at its final size
  // on the first painted frame (the zoom ghost flies into that box).
  const [stageW, setStageW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = stageRef.current
    if (el === null) return
    const measure = (): void => setStageW((prev) => (Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [previewGroup])
  // Simulated state for widgets with states (e.g. peak-pricing): clicking the
  // preview card flips it, so both states can be reviewed live.
  const [previewSim, setPreviewSim] = React.useState<Record<string, unknown> | null>(null)
  React.useEffect(() => { setPreviewSim(null) }, [previewGroup, previewIdx])
  // The market lists EVERY widget (system + external), deduped by group so a
  // group card (e.g. "context" → 一键压缩 + 上下文水位) is one entry in the rail.
  const seen = new Set<string>()
  const marketCards = WIDGETS.filter((w) => { const g = groupOf(w); if (seen.has(g)) return false; seen.add(g); return true })
  const list = marketCards.filter((w) => `${widgetName(w)} ${widgetDesc(w)} ${w.id}`.toLowerCase().indexOf(q.toLowerCase()) !== -1)
  // Group labels come from the dictionaries (`group.<group-id>`); a group
  // without a label falls back to the first widget's name. Widget units can
  // ship their own group label lazily via their manifest locale.
  const groupLabel = (w: (typeof WIDGETS)[number]): string => {
    const key = `group.${groupOf(w)}`
    const label = t(key)
    return label === key ? widgetName(w) : label
  }
  /** Open a group's preview, seeding the zoom from the clicked card/tile. */
  const openGroup = (w: (typeof WIDGETS)[number], from: 'list' | 'grid'): void => {
    const sizes = sizesOf(w)
    const size: WidgetSize = sizes.includes('2x2') ? '2x2' : sizes[0]
    const unit = railSide > 0 ? railSide : prefs.cardSide
    const cardW = size === '2x4' ? 2 * unit + 12 : unit
    // The source rect: the tile's preview for the gallery, the card itself for
    // the list (there is no preview there).
    const el = from === 'grid'
      ? (document.querySelector(`.dsx-gcard[data-gid="${w.id}"] .dsx-gshot`) as HTMLElement | null)
      : (document.querySelector(`.dsx-mcard[data-gid="${w.id}"]`) as HTMLElement | null)
    const out = exampleOut(w, size, prefs, undefined, liveFor(w.id, size))
    const r = el ? el.getBoundingClientRect() : null
    const src = r && out ? { x: r.left, y: r.top, w: r.width, h: r.height, out, unit, cardW, size, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent } : null
    setLastSource(src)
    if (MARKET_HERO) setZoom(src ? { ...src, phase: 'in' } : null)
    setAnim('in')
    // Without the hero nothing else clears the push: do it when the 380ms
    // keyframes are done, which also unmounts the (now hidden) market layer.
    if (!MARKET_HERO) window.setTimeout(() => setAnim(null), 400)
    setPreviewGroup(groupOf(w))
    setPreviewIdx(0)
  }
  /** Leave the preview. With the hero OFF this is a pure shared-axis pop: the
   *  preview slides out, the market slides back in, and the stage is dropped when
   *  that motion ends (400ms ≈ the 380ms keyframes + a frame of slack). With the
   *  hero ON the card flies home first (see MARKET_HERO). */
  const closeGroup = (): void => {
    if (!MARKET_HERO) {
      setAnim('out')
      window.setTimeout(() => { setPreviewGroup(null); setAnim(null) }, 400)
      return
    }
    if (lastSource !== null) { setAnim('out'); setZoom({ ...lastSource, phase: 'out' }) }
    else setPreviewGroup(null)
  }
  const zoomDone = (): void => {
    if (zoom !== null && zoom.phase === 'out') setPreviewGroup(null)
    setZoom(null)
    setAnim(null)
  }
  /** 组件市场 uses Material's SHARED AXIS (X) between the list/gallery and the
   *  preview: outgoing and incoming ride the same horizontal motion — the outgoing
   *  slides out of the panel's clip while the incoming slides in from the right —
   *  and BOTH directions play the SAME keyframes (closing = `animation-direction:
   *  reverse`), so open and close are identical by construction. Both layers stay
   *  MOUNTED for the whole transition; the previous code swapped them instantly,
   *  which is why the surrounding tiles vanished (and popped back) while only the
   *  shared card animated. Reference: MaterialSharedAxis / the Material motion
   *  system's shared-axis pattern + the container-transform (FLIP) ghost below. */
  const renderLayers = (stageBody: React.ReactNode | null, dir: 'in' | 'out' | null): React.ReactElement => {
    // The grid is mounted whenever there is no stage (settled market) OR a
    // transition is in flight — in BOTH directions: during the push it is the
    // outgoing layer, during the pop the incoming one.
    const gridMounted = stageBody === null || dir !== null
    return React.createElement('div', { className: 'dsx-mkt' },
      gridMounted
        ? React.createElement('div', { className: 'dsx-mkt-layer' + (dir === 'in' ? ' dsx-mkt-push-out' : dir === 'out' ? ' dsx-mkt-push-out is-rev' : '') }, marketBody)
        : null,
      stageBody !== null
        ? React.createElement('div', { className: 'dsx-mkt-layer is-front' + (dir === 'in' ? ' dsx-mkt-push-in' : dir === 'out' ? ' dsx-mkt-push-in is-rev' : '') }, stageBody)
        : null,
      zoom ? React.createElement(ZoomGhost, { key: zoom.phase, zoom, target: stageCardRef, onDone: zoomDone }) : null,
    )
  }

  const marketBody = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' } },
    // The search field + the view toggle. The field copies the official sidebar
    // search box (measured 2026-09-27: height 30, radius 10, 1px border, a
    // leading magnifier, 13px input, transparent fill) — the user's pick.
    React.createElement('div', { className: 'dsx-marketbar' },
      React.createElement('div', { className: 'dsx-searchwrap' },
        React.createElement('span', { className: 'dsx-searchicon' }, searchIcon),
        React.createElement('input', { type: 'search', placeholder: t('market.search'), className: 'dsx-search', value: q, onChange: (e) => setQ(e.target.value) }),
      ),
      React.createElement('div', { className: 'dsx-viewtoggle' },
        React.createElement('button', {
          type: 'button', className: 'dsx-viewbtn', 'data-active': view === 'list',
          'aria-label': t('market.viewList'), title: t('market.viewList'),
          onClick: () => setView('list'),
        }, listViewIcon),
        React.createElement('button', {
          type: 'button', className: 'dsx-viewbtn', 'data-active': view === 'grid',
          'aria-label': t('market.viewGrid'), title: t('market.viewGrid'),
          onClick: () => setView('grid'),
        }, gridViewIcon),
      ),
    ),
    // The market list owns its own scroll now that the panel body does not
    // (`overflow: hidden` on `.dsx-stats-addpanel-body`).
    view === 'grid'
      ? React.createElement('div', { className: 'dsx-gallery', tabIndex: -1, ref: galleryRef },
        list.map((w) => {
          const sizes = sizesOf(w)
          // One representative preview per group: the first supported size (2×2
          // preferred), the same simulated output the stage renders.
          const size: WidgetSize = sizes.includes('2x2') ? '2x2' : sizes[0]
          const out = exampleOut(w, size, prefs, undefined, liveFor(w.id, size))
          // Drawn at the RAIL's own unit and scaled to sit COMFORTABLY in the
          // column: the cap is ~1.15× so the widget keeps its natural proportions
          // and typography (the reference gallery shows widgets at their real size
          // with breathing room, not zoomed to fill the cell).
          const gUnit = railSide > 0 ? railSide : prefs.cardSide
          const gW = size === '2x4' ? 2 * gUnit + 12 : gUnit
          const col = colW > 0 ? (colW - 16 - 10) / 2 : gW
          const fit = Math.max(0.5, Math.min(1.15, (col - 12) / gW))
          // The gallery tile is ONLY the live preview + its caption: no outer
          // rounded rectangle and no 「已添加」 badge (the user's rule — the
          // reference widget gallery shows nothing but the widget and its name).
          return React.createElement('div', {
            key: w.id, role: 'button', tabIndex: 0, className: 'dsx-gcard', 'data-gid': w.id,
            title: widgetDesc(w),
            onClick: () => openGroup(w, 'grid'),
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGroup(w, 'grid') } },
          },
            React.createElement('span', {
              className: 'dsx-gshot',
              // The box RESERVES the scaled size (a transform does not change
              // layout size — reserving the unscaled box is what clipped the card
              // before).
              style: { width: Math.round(gW * fit), height: Math.round(gUnit * fit) },
            },
              React.createElement('span', {
                style: { position: 'absolute', top: 0, left: 0, width: gW, transform: `scale(${fit.toFixed(4)})`, transformOrigin: 'top left', display: 'block' },
              }, out ? React.createElement(CardBody, { out, unit: gUnit, width: size === '2x4' ? gW : undefined, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, pinBox: true }) : null),
            ),
            React.createElement('span', { className: 'dsx-gcap' }, groupLabel(w)),
          )
        }),
      )
      : React.createElement('div', { className: 'dsx-mlist', style: { overflowY: 'auto', minHeight: 0 } },
        list.map((w) => {
          const gw = WIDGETS.filter((x) => groupOf(x) === groupOf(w))
          // Instance count = every widget at every supported size (a 2×2 and a
          // 2×4 of the same widget are two independent market entries).
          const instanceCount = gw.reduce((a, x) => a + sizesOf(x).length, 0)
          // NO trailing control and NO installed marker: a market card is a
          // GROUP, and "已添加" on a group is ambiguous — one instance added or
          // all of them? (the user's argument). The card's own click opens the
          // group's preview, where each instance is added individually, so there
          // is nothing to put here. The ring is neutral for the same reason.
          const ring = React.createElement('span', { className: 'dsx-ring' })
          return React.createElement('div', {
            key: w.id, role: 'button', tabIndex: 0, className: 'dsx-mcard', 'data-gid': w.id,
            onClick: () => openGroup(w, 'list'),
            onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGroup(w, 'list') } },
          },
            ring,
            React.createElement('span', { className: 'dsx-mbody' },
              React.createElement('span', { className: 'dsx-mhead' },
                React.createElement('span', { className: 'dsx-mname' }, groupLabel(w)),
                React.createElement('span', { className: 'dsx-badge' }, String(instanceCount)),
              ),
              React.createElement('span', { className: 'dsx-mdesc' }, widgetDesc(w)),
            ),
          )
        }),
      ),
  )
  if (previewGroup !== null) {
    // Every supported size is its own selectable instance (2×2 first, then
    // 2×4), so multi-size widgets like the heatmap appear as independent
    // components instead of a size switcher.
    const gw = WIDGETS.filter((w) => groupOf(w) === previewGroup)
    const instances = gw.flatMap((w) => sizesOf(w).map((s) => ({ w, s })))
    const cur = instances[previewIdx] ?? instances[0]
    const w = cur?.w
    const curSize = cur?.s ?? '2x2'
    const curKey = w ? instanceKey(w.id, curSize) : ''
    const installed = w ? prefs.installed.indexOf(curKey) !== -1 : false
    // The instance's own config rides along exactly like the rail's render does,
    // so a config-driven card (peak-pricing's windows / holiday switches)
    // previews what it will actually show instead of the defaults. Live data wins
    // over the mock where it exists (the user's rule — see buildPreviewStats).
    const previewStats = w ? buildPreviewStats(w, prefs, curKey, liveFor(w.id, curSize)) : ({} as WidgetStats)
    const effSim = previewSim ?? w?.example?.sim ?? null
    // Market-preview isolation: a crashing render shows an empty stage rather
    // than taking the market panel down (mirrors rail + config preview guards).
    let out: ReturnType<NonNullable<typeof w>['render']> | null = null
    if (w) {
      try {
        out = w.render(previewStats, { size: curSize, ...(effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}) })
      } catch (error) {
        console.error(`[dsh-widgets] market preview render crashed for ${w.id}:`, error)
        out = null
      }
    }
    const toggleSim = (): void => {
      if (!widgetSimToggle(w)) return
      setPreviewSim(nextSim(w, previewSim))
    }
    // Everything ships bundled: the market only ADDS the selected instance
    // (widget@size) to the rail. Already-added instances show as disabled.
    const add = (): void => {
      if (!w || installed || prefs.installed.length >= prefs.maxWidgets) return
      setPrefs({
        installed: prefs.installed.concat(curKey),
        order: prefs.order.indexOf(curKey) === -1 ? prefs.order.concat(curKey) : prefs.order,
      })
    }
    const prev = () => setPreviewIdx((previewIdx - 1 + instances.length) % instances.length)
    const next = () => setPreviewIdx((previewIdx + 1) % instances.length)
    // In a 1-column layout a 2×4 tile has nowhere to sit: the rail hides those
    // instances, and the market must say so — title struck through, a yellow
    // capsule next to it, and the add button disabled.
    const oneCol = prefs.columns === 1
    const sizeBlocked = oneCol && curSize === '2x4'
    const stageBody = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, position: 'relative' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('button', { type: 'button', className: 'dsx-btn', onClick: closeGroup }, t('market.back')),
        React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: sizeBlocked ? 'line-through' : undefined, opacity: sizeBlocked ? 0.75 : undefined } }, w ? `${widgetName(w)}${curSize === '2x4' ? ' 2×4' : ' 2×2'}` : ''),
          sizeBlocked ? React.createElement('span', { className: 'dsx-size-warn' }, t('market.sizeBlocked')) : null,
        ),
        React.createElement('button', { type: 'button', disabled: installed || sizeBlocked || prefs.installed.length >= prefs.maxWidgets, className: installed || sizeBlocked ? 'dsx-btn' : 'dsx-btn dsx-btn-primary', onClick: add, title: sizeBlocked ? t('market.sizeBlockedTitle') : undefined }, installed ? t('market.added') : t('market.add')),
      ),
      !installed && prefs.installed.length >= prefs.maxWidgets
        ? React.createElement('div', { className: 'dsx-limit-tip' }, t('market.limit', { max: prefs.maxWidgets }))
        : null,
      React.createElement('div', { ref: stageRef, style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 4px' } },
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': t('market.prevAria'), onClick: prev }, React.createElement(ChevronLeftIcon)),
        React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' } },
          out
            ? (() => {
                // Same geometry the drawer preview uses: drawn at the rail's unit,
                // then scaled to fill the slot. The zoom ghost animates INTO this
                // box, so both must agree on the layout size.
                const u = railSide > 0 ? railSide : prefs.cardSide
                const cw = curSize === '2x4' ? 2 * u + 12 : u
                const slotW = stageW > 0 ? stageW - 80 : cw
                const fit = Math.max(0.4, Math.min(1.6, (slotW - 8) / cw))
                return React.createElement('div', { ref: stageCardRef, style: { position: 'relative', width: Math.round(cw * fit), height: Math.round(u * fit), opacity: zoom === null ? 1 : 0, cursor: widgetSimToggle(w) ? 'pointer' : undefined, userSelect: 'none' }, title: widgetSimToggle(w) ? t('config.simTitle') : undefined, onClick: widgetSimToggle(w) ? toggleSim : undefined },
                  React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: cw, transform: `scale(${fit.toFixed(4)})`, transformOrigin: 'top left' } },
                    React.createElement(CardBody, { out, unit: u, width: curSize === '2x4' ? cw : undefined, squircle: prefs.squircle, cornerPercent: prefs.cornerPercent, pinBox: true }),
                  ),
                  w && widgetSimToggle(w) ? React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, bottom: -18, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', textAlign: 'center' } }, t('config.simTip', { label: widgetSimToggle(w) })) : null,
                )
              })()
            : null,
        ),
        React.createElement('button', { type: 'button', className: 'dsx-navbtn', 'aria-label': t('market.nextAria'), onClick: next }, React.createElement(ChevronRightIcon)),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } },
        instances.map((inst, i) => React.createElement('button', { key: inst.w.id + '@' + inst.s, type: 'button', className: i === previewIdx ? 'dsx-dot dsx-dot-active' : 'dsx-dot', 'aria-label': `${widgetName(inst.w)} ${inst.s === '2x4' ? '2×4' : '2×2'}`, onClick: () => setPreviewIdx(i) })),
      ),
    )
    return renderLayers(stageBody, anim)
  }
  // Settled market: one layer, no transition running.
  return renderLayers(null, null)
}
