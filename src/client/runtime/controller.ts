/**
 * dsh-widgets —the surface controller contract.
 *
 * Every settings/market surface receives one: the persisted prefs plus the couple of
 * callbacks that write them. It lived in components.tsx until the surfaces were split
 * out (Phase 3.7-3.9); it is a runtime contract, not a rendering detail.
 */

import type { Prefs } from './prefs'
import type { WidgetStats } from '../lib/contract/types'

/** The controller handed to every component. */
export interface WidgetsController {
  prefs: Prefs
  setPrefs: (patch: Partial<Prefs>) => void
  /** The LIVE stats record for one instance, assembled by `buildLiveStats` — the
   *  exact record the rail renders that instance from. The preview surfaces call
   *  it so "有真数据喂真数据，缺的用假数据填" is a real merge rather than a mock
   *  stage: absent (outside a session) the previews stay on the filler data. */
  liveStats?: (key: string) => WidgetStats
  /** 组件配置 tells the PANEL when its detail drawer opens/closes, so the panel
   *  can widen by the drawer's own width instead of splitting the existing one
   *  (the user's rule: opening the preview adds width). */
  onDetailToggle?: (open: boolean) => void
  /** The drawer's final width, when the host knows it (the add panel computes it
   *  from its own target width). With it the preview is laid out at its FINAL
   *  size from the first frame and the drawer's growing box reveals it — no
   *  small-to-large zoom while the panel animates. The settings page does not
   *  know it and falls back to the measured width. */
  detailWidth?: number
  /** The rail's CURRENT tile side. The rail auto-sizes its columns, so this is
   *  not always `prefs.cardSide` — and the preview must be laid out at exactly
   *  this unit for its padding/gaps to be byte-identical to the real card (only
   *  scaled). */
  railSide?: number
}
