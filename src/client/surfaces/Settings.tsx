/**
 * dsh-widgets —the settings section: 组件页 + the general rows.
 *
 * `WidgetsPage` is the three-tab section the shell mounts (组件配置 / 组件市场 / 通用设置);
 * `SettingsPanel` is the general tab. Moved verbatim out of components.tsx (Phase 3.9).
 */

import * as React from 'react'
import { CORNER_GEARS } from '../render/card-geometry'
import { DEFAULT_CORNER_PERCENT, MAX_ROWS_RANGE, effectiveMaxWidgets } from '../runtime/prefs'
import type { WidgetsController } from '../runtime/controller'
import { ConfigTab } from './config/ConfigTab'
import { MarketTab } from './market/MarketTab'
import { Select } from '../render/select'
import { Stepper } from '../render/stepper'
import { CURVE_PRESETS, CurveEditor, presetOf } from '../render/curve'
import type { AnimCurve } from '../runtime/prefs'
import { MAX_ANIM_BOUNCE } from '../runtime/prefs'
import { t } from '../i18n'

// ---- Widgets page (settings section) ----

export function WidgetsPage({ controller, hideHeader }: { controller: WidgetsController; hideHeader?: boolean }): React.ReactElement {
  const [tab, setTab] = React.useState('config')
  // The page header is the OFFICIAL skeleton — a bare `h2` + `p` with `_title` /
  // `_intro`-suffixed classes — not a hand-styled div pair. Two reasons: the
  // semantics are the product's (a page title is a heading), and the suffix
  // convention is what the settings-header normalizer keys on, so this page takes
  // part in the same header geometry as 通用设置 / 模型 / Agent 预设 instead of
  // drifting (its own inline 18/600 + 13/20 block could never be matched by a
  // stylesheet rule or a normalizer). The distance to the description is left to
  // the container / normalizer; see .dsx-page-title in styles/panel.module.css.
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 } },
    hideHeader ? null : React.createElement('h2', { className: 'dsx-page-title' }, t('page.title')),
    hideHeader ? null : React.createElement('p', { className: 'dsx-page-intro' }, t('page.desc')),
    React.createElement('div', { className: 'dsx-tabbar', style: { flex: 'none' } },
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'config', onClick: () => setTab('config') }, t('tab.config')),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'market', onClick: () => setTab('market') }, t('tab.market')),
      React.createElement('button', { type: 'button', className: 'dsx-tab', 'data-active': tab === 'settings', onClick: () => setTab('settings') }, t('tab.settings')),
    ),
    // The active tab owns the remaining height and its own scroll (`minHeight: 0`
    // is what lets it shrink below its content instead of growing the panel).
    React.createElement('div', { style: { flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' } },
      tab === 'config' ? React.createElement(ConfigTab, { controller })
        : tab === 'market' ? React.createElement(MarketTab, { controller, usageData: null })
        : React.createElement(SettingsPanel, { controller }),
    ),
  )
}

// ---- General settings rows ----

/* CONTROL CHOICE — one rule, applied to every row on this page:
 *
 *   numeric range         → `Stepper` (the product's own numeric recipe; see
 *                           render/stepper.tsx)
 *   curated discrete set  → `Select`  (the product's Menu pattern — the corner
 *                           gear table is the only one here)
 *   boolean               → `Switch`
 *
 * AUDIT 2026-10-01 (owner report): the page had drifted into one flat list
 * ordered by when each row was ADDED, and two rows that belong together asked
 * for the same KIND of value with two different widgets — 最多列数 was a Select
 * while 可显示的最多行数 (added a day later, after `Stepper` existed) was a
 * Stepper. Both are fixed: every count/size on this page is a Stepper, and the
 * rows are grouped by the SURFACE they configure, with 列/行/组件数 adjacent
 * because the third is literally the product of the first two.
 *
 * Adding a row therefore means picking its group — there is no "append at the
 * end" any more, which is what made the old order unreadable. */

/**
 * A titled group of rows.
 *
 * The heading is deliberately NOT an `h2`: the settings section already has one
 * page title (see WidgetsPage), and a second heading level would fight the
 * official header contract that page participates in. It is a plain title +
 * one-line description, the same shape the rows themselves use.
 */
function Group({ title, desc, children }: { title: string; desc: string; children?: React.ReactNode }): React.ReactElement {
  return React.createElement('section', { className: 'dsx-set-group' },
    React.createElement('div', { className: 'dsx-set-group-head' },
      React.createElement('div', { className: 'dsx-set-head-title' }, title),
      React.createElement('div', { className: 'dsx-set-head-desc' }, desc),
    ),
    children,
  )
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }): React.ReactElement {
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)' } },
    React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 32 } },
      React.createElement('div', { style: { fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-primary)' } }, title),
      React.createElement('div', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' } }, desc),
    ),
    React.createElement('div', { style: { flex: 'none', minWidth: 0 } }, children),
  )
}

/** A boolean row — `Switch` is the only control a boolean gets. */
function Toggle({ title, checked, onChange }: { title: string; checked: boolean; onChange: (next: boolean) => void }): React.ReactElement {
  return React.createElement('label', { className: 'dsx-switch-row' },
    React.createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': title, className: 'dsx-switch-input', checked, onChange: (e) => onChange(e.target.checked) }),
    React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
  )
}

/**
 * A control plus an optional HOVER NOTE, worn by a small warning mark.
 *
 * The product ships no tooltip primitive this plugin may reuse (the ones in
 * ui-primitives are tied to their own components), so the note is one CSS
 * pseudo-element reading `data-tip` — see `.dsx-tip` in primitives.module.css.
 * The mark is rendered only when there is something to warn about, so a normal
 * row stays exactly as it was.
 */
function Tip({ note, children }: { note: string | null; children?: React.ReactNode }): React.ReactElement {
  if (note === null) return React.createElement(React.Fragment, null, children)
  return React.createElement('span', { className: 'dsx-tip', 'data-tip': note },
    React.createElement('span', { className: 'dsx-tip-mark', 'aria-hidden': true }, '!'),
    children,
  )
}

/**
 * ONE easing, drawn: heading + description + presets on the left, the field on
 * the right. Used twice in the animation group (position curve / zoom curve) —
 * they are two independent settings, so each gets its own editor rather than a
 * selector that would hide half the page's state behind a click.
 */
function CurveRow({ titleKey, descKey, value, onChange }: { titleKey: string; descKey: string; value: AnimCurve; onChange: (next: AnimCurve) => void }): React.ReactElement {
  const active = presetOf(value)?.id ?? null
  return React.createElement('div', { className: 'dsx-set-curve' },
    React.createElement('div', { className: 'dsx-set-curve-info' },
      React.createElement('div', { className: 'dsx-set-head-title' }, t(titleKey)),
      React.createElement('div', { className: 'dsx-set-head-desc' }, t(descKey)),
      React.createElement('div', { className: 'dsx-set-pills' },
        CURVE_PRESETS.map((p) => React.createElement('button', {
          key: p.id, type: 'button', className: 'dsx-pill',
          'data-active': active === p.id,
          onClick: () => onChange({ ...p.curve }),
        }, t(p.key))),
        // "Custom" is DERIVED (no preset matches the four numbers) instead of a
        // stored flag, so it can never disagree with the drawing.
        active === null ? React.createElement('button', { key: 'custom', type: 'button', className: 'dsx-pill', 'data-active': true, disabled: true }, t('settings.animCurve.custom')) : null,
      ),
    ),
    React.createElement(CurveEditor, { value, onChange }),
  )
}

export function SettingsPanel({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const colValue = [1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  // A stored value outside the gear table (hand-edited prefs) must still show a
  // selected option, so fall back to the default gear.
  const gearValue = CORNER_GEARS.indexOf(prefs.cornerPercent) !== -1 ? prefs.cornerPercent : DEFAULT_CORNER_PERCENT
  // columns × rows = how many tiles the deck can seat at once (see
  // effectiveMaxWidgets): the widget cap is read THROUGH it, and this row shows
  // the clamped value with a note when the stored one is bigger.
  const seatCount = colValue * prefs.maxRows
  const widgetMax = effectiveMaxWidgets(prefs)
  const widgetCapped = prefs.maxWidgets > widgetMax
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', flex: '1 1 auto' } },
    // ── 网格与尺寸 ────────────────────────────────────────────────────────────
    // 列 / 行 / 组件数 are adjacent on purpose: the third IS the product of the
    // first two (see effectiveMaxWidgets), and its hover note says so.
    React.createElement(Group, { title: t('settings.group.grid.title'), desc: t('settings.group.grid.desc') },
      React.createElement(Row, {
        title: t('settings.columns.title'), desc: t('settings.columns.desc'),
        children: React.createElement(Stepper, { min: 1, max: 4, step: 1, value: colValue, unit: t('settings.columns.unit'), onChange: (v) => setPrefs({ columns: v }) }),
      }),
      React.createElement(Row, {
        title: t('settings.maxRows.title'), desc: t('settings.maxRows.desc'),
        children: React.createElement(Stepper, { min: MAX_ROWS_RANGE[0], max: MAX_ROWS_RANGE[1], step: 1, value: prefs.maxRows, unit: t('settings.maxRows.unit'), onChange: (v) => setPrefs({ maxRows: v }) }),
      }),
      React.createElement(Row, {
        title: t('settings.maxWidgets.title'), desc: t('settings.maxWidgets.desc'),
        // columns × rows is the deck's real seat count, so this control's ceiling IS
        // that product: the stepper cannot be pushed past what the rail can lay out.
        // When the STORED value is larger it is shown as the clamped one plus a
        // hover note — the stored number is left alone, so raising the columns or
        // rows brings it straight back.
        children: React.createElement(Tip, {
          note: widgetCapped ? t('settings.maxWidgets.capped', { cols: colValue, rows: prefs.maxRows, max: seatCount }) : null,
        }, React.createElement(Stepper, { min: 1, max: seatCount, step: 1, value: widgetMax, unit: t('settings.maxWidgets.unit'), onChange: (v) => setPrefs({ maxWidgets: v }) })),
      }),
      React.createElement(Row, { title: t('settings.cardSide.title'), desc: t('settings.cardSide.desc'), children: React.createElement(Stepper, { min: 100, max: 220, step: 1, value: prefs.cardSide, unit: 'px', onChange: (v) => setPrefs({ cardSide: v }) }) }),
      React.createElement(Row, { title: t('settings.padding.title'), desc: t('settings.padding.desc'), children: React.createElement(Stepper, { min: 4, max: 40, step: 1, value: prefs.panelPadding, unit: 'px', onChange: (v) => setPrefs({ panelPadding: v }) }) }),
      React.createElement(Row, {
        title: t('settings.wholeCards.title'), desc: t('settings.wholeCards.desc'),
        children: React.createElement(Toggle, { title: t('settings.wholeCards.title'), checked: prefs.wholeCards, onChange: (next) => setPrefs({ wholeCards: next }) }),
      }),
    ),
    // ── 卡片外观 ──────────────────────────────────────────────────────────────
    React.createElement(Group, { title: t('settings.group.card.title'), desc: t('settings.group.card.desc') },
      React.createElement(Row, {
        title: t('settings.squircle.title'), desc: t('settings.squircle.desc'),
        children: React.createElement(Toggle, { title: t('settings.squircle.title'), checked: prefs.squircle, onChange: (next) => setPrefs({ squircle: next }) }),
      }),
      React.createElement(Row, {
        title: t('settings.corner.title'), desc: t('settings.corner.desc'),
        // The ONE Select left on this page: a curated gear table (12/16/20/24%)
        // is a discrete choice, which is what the Menu pattern is for. Every
        // other numeric value here is a Stepper.
        children: React.createElement(Select, {
          value: String(gearValue),
          options: CORNER_GEARS.map((g) => ({ value: String(g), label: t('settings.corner.option', { p: g }) })),
          onChange: (next) => setPrefs({ cornerPercent: Number(next) }),
          title: t('settings.corner.title'),
        }),
      }),
    ),
    // ── 悬浮放大 ──────────────────────────────────────────────────────────────
    React.createElement(Group, { title: t('settings.group.hover.title'), desc: t('settings.group.hover.desc') },
      React.createElement(Row, {
        title: t('settings.realtime.title'), desc: t('settings.realtime.desc'),
        children: React.createElement(Toggle, { title: t('settings.realtime.title'), checked: prefs.realTime, onChange: (next) => setPrefs({ realTime: next }) }),
      }),
      React.createElement(Row, { title: t('settings.magnify.title'), desc: t('settings.magnify.desc'), children: React.createElement(Stepper, { min: 1, max: 1.4, step: 0.05, value: prefs.magnify, unit: 'x', format: (v) => String(Math.round(v * 100) / 100), onChange: (v) => setPrefs({ magnify: v }) }) }),
    ),
    // ── 打开与收起动画 ────────────────────────────────────────────────────────
    // The rail's open/close used to be a plain slide; it now grows out of its
    // top-right corner, and these two rows are that motion's two free parameters.
    // Scale 100% is the documented way back to the pure slide (scale(1) IS a
    // no-op), so the old behaviour needs no separate switch.
    //
    // TWO curves because there are two motions: the wrapper slides, an inner box
    // scales (one `transform` cannot carry two timing functions). Position first —
    // it is the outer half of the gesture.
    React.createElement(Group, { title: t('settings.group.anim.title'), desc: t('settings.group.anim.desc') },
      React.createElement(Row, {
        title: t('settings.openShape.title'), desc: t('settings.openShape.desc'),
        children: React.createElement(Select, {
          value: prefs.openShape,
          options: [
            { value: 'stagger', label: t('settings.openShape.stagger') },
            { value: 'zoom', label: t('settings.openShape.zoom') },
          ],
          onChange: (next) => setPrefs({ openShape: next === 'zoom' ? 'zoom' : 'stagger' }),
          title: t('settings.openShape.title'),
        }),
      }),
      React.createElement(Row, {
        title: t('settings.animScale.title'), desc: t('settings.animScale.desc'),
        children: React.createElement(Stepper, { min: 50, max: 100, step: 1, value: Math.round(prefs.animScale * 100), unit: '%', onChange: (v) => setPrefs({ animScale: v / 100 }) }),
      }),
      React.createElement(CurveRow, { titleKey: 'settings.animShiftCurve.title', descKey: 'settings.animShiftCurve.desc', value: prefs.animShiftCurve, onChange: (next) => setPrefs({ animShiftCurve: next }) }),
      // The spring settle rides the position curve above, so it is listed with it:
      // it is the fraction of the travel the cards (and, in the whole-group shape,
      // the rail) slide PAST their seat before settling — see prefs.animBounce.
      React.createElement(Row, {
        title: t('settings.animBounce.title'), desc: t('settings.animBounce.desc'),
        children: React.createElement(Stepper, { min: 0, max: Math.round(MAX_ANIM_BOUNCE * 100), step: 1, value: Math.round(prefs.animBounce * 100), unit: '%', onChange: (v) => setPrefs({ animBounce: v / 100 }) }),
      }),
      React.createElement(CurveRow, { titleKey: 'settings.animCurve.title', descKey: 'settings.animCurve.desc', value: prefs.animCurve, onChange: (next) => setPrefs({ animCurve: next }) }),
    ),
    // ── 组件设置面板 ──────────────────────────────────────────────────────────
    React.createElement(Group, { title: t('settings.group.panel.title'), desc: t('settings.group.panel.desc') },
      React.createElement(Row, { title: t('settings.panelWidth.title'), desc: t('settings.panelWidth.desc'), children: React.createElement(Stepper, { min: 260, max: 760, step: 10, value: prefs.panelWidth, unit: 'px', onChange: (v) => setPrefs({ panelWidth: v }) }) }),
    ),
    // ── 对话区 ────────────────────────────────────────────────────────────────
    React.createElement(Group, { title: t('settings.group.chat.title'), desc: t('settings.group.chat.desc') },
      React.createElement(Row, {
        title: t('settings.hideStatsLine.title'), desc: t('settings.hideStatsLine.desc'),
        children: React.createElement(Toggle, { title: t('settings.hideStatsLine.title'), checked: prefs.hideStatsLine, onChange: (next) => setPrefs({ hideStatsLine: next }) }),
      }),
    ),
  )
}

