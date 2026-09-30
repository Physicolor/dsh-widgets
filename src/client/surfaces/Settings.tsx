/**
 * dsh-widgets —the settings section: 组件页 + the general rows.
 *
 * `WidgetsPage` is the three-tab section the shell mounts (组件配置 / 组件市场 / 通用设置);
 * `SettingsPanel` is the general tab. Moved verbatim out of components.tsx (Phase 3.9).
 */

import * as React from 'react'
import { CORNER_GEARS } from '../render/card-geometry'
import { DEFAULT_CORNER_PERCENT } from '../runtime/prefs'
import type { WidgetsController } from '../runtime/controller'
import { ConfigTab } from './config/ConfigTab'
import { MarketTab } from './market/MarketTab'
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

// ---- General settings rows (padding + card side) ----

function Slider({ value, onChange, unit, min, max, step }: { value: number; onChange: (v: number) => void; unit: string; min: number; max: number; step?: number }): React.ReactElement {
  // Native range + accent-color, matching the official uitw-slider pattern so we
  // reuse the product's slider look instead of inventing a custom one.
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 'none' } },
    React.createElement('input', { type: 'range', min, max, step: step ?? 1, value, style: { width: 160, accentColor: 'var(--dsw-alias-state-business-primary)' }, onChange: (e) => onChange(Number(e.target.value)) }),
    React.createElement('span', { style: { width: 48, fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, `${value}${unit}`),
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

export function SettingsPanel({ controller }: { controller: WidgetsController }): React.ReactElement {
  const { prefs, setPrefs } = controller
  const colValue = [1, 2, 3, 4].indexOf(prefs.columns) !== -1 ? prefs.columns : 2
  // A stored value outside the gear table (hand-edited prefs) must still show a
  // selected option, so fall back to the default gear.
  const gearValue = CORNER_GEARS.indexOf(prefs.cornerPercent) !== -1 ? prefs.cornerPercent : DEFAULT_CORNER_PERCENT
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', flex: '1 1 auto' } },
    React.createElement(Row, {
      title: t('settings.columns.title'), desc: t('settings.columns.desc'),
      children: React.createElement('select', {
        className: 'dsx-select', value: colValue,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPrefs({ columns: Number(e.target.value) }),
      },
        [1, 2, 3, 4].map((c) => React.createElement('option', { key: c, value: c }, t('settings.columns.option', { n: c }))),
      ),
    }),
    React.createElement(Row, {
      title: t('settings.realtime.title'), desc: t('settings.realtime.desc'),
      children: React.createElement('label', { className: 'dsx-switch-row' },
        React.createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': t('settings.realtime.title'), className: 'dsx-switch-input', checked: prefs.realTime, onChange: (e) => setPrefs({ realTime: e.target.checked }) }),
        React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
      ),
    }),
    React.createElement(Row, { title: t('settings.magnify.title'), desc: t('settings.magnify.desc'), children: React.createElement(Slider, { min: 1, max: 1.4, step: 0.05, value: prefs.magnify, unit: 'x', onChange: (v) => setPrefs({ magnify: v }) }) }),
    React.createElement(Row, { title: t('settings.padding.title'), desc: t('settings.padding.desc'), children: React.createElement(Slider, { min: 4, max: 40, value: prefs.panelPadding, unit: 'px', onChange: (v) => setPrefs({ panelPadding: v }) }) }),
    React.createElement(Row, { title: t('settings.cardSide.title'), desc: t('settings.cardSide.desc'), children: React.createElement(Slider, { min: 100, max: 220, value: prefs.cardSide, unit: 'px', onChange: (v) => setPrefs({ cardSide: v }) }) }),
    React.createElement(Row, {
      title: t('settings.squircle.title'), desc: t('settings.squircle.desc'),
      children: React.createElement('label', { className: 'dsx-switch-row' },
        React.createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': t('settings.squircle.title'), className: 'dsx-switch-input', checked: prefs.squircle, onChange: (e) => setPrefs({ squircle: e.target.checked }) }),
        React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
      ),
    }),
    React.createElement(Row, {
      title: t('settings.corner.title'), desc: t('settings.corner.desc'),
      children: React.createElement('select', {
        className: 'dsx-select', value: gearValue,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPrefs({ cornerPercent: Number(e.target.value) }),
      },
        CORNER_GEARS.map((g) => React.createElement('option', { key: g, value: g }, t('settings.corner.option', { p: g }))),
      ),
    }),
    React.createElement(Row, { title: t('settings.panelWidth.title'), desc: t('settings.panelWidth.desc'), children: React.createElement(Slider, { min: 260, max: 760, value: prefs.panelWidth, unit: 'px', onChange: (v) => setPrefs({ panelWidth: v }) }) }),
    React.createElement(Row, { title: t('settings.maxWidgets.title'), desc: t('settings.maxWidgets.desc'), children: React.createElement(Slider, { min: 1, max: 20, value: prefs.maxWidgets, unit: t('settings.maxWidgets.unit'), onChange: (v) => setPrefs({ maxWidgets: v }) }) }),
    React.createElement(Row, {
      title: t('settings.hideStatsLine.title'), desc: t('settings.hideStatsLine.desc'),
      children: React.createElement('label', { className: 'dsx-switch-row' },
        React.createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': t('settings.hideStatsLine.title'), className: 'dsx-switch-input', checked: prefs.hideStatsLine, onChange: (e) => setPrefs({ hideStatsLine: e.target.checked }) }),
        React.createElement('span', { className: 'dsx-switch-track' }, React.createElement('span', { className: 'dsx-switch-thumb' })),
      ),
    }),
  )
}

