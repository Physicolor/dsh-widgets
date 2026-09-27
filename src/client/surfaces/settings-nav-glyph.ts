/**
 * dsh-widgets — the settings-nav glyph adapter for our section.
 *
 * Moved out of `client/index.ts` (Phase 2.3) unchanged, so `apply()` reads as
 * composition instead of implementation. It is a DOM-level workaround for an
 * upstream gap, not product logic: delete it the day the section contract grows
 * an icon field (see the rationale below).
 */

import { onLocaleChange, t } from '../i18n'

// ---- Official settings-nav glyph for our section. ----
// The shell's settings nav picks its glyph from the section ID and only knows
// its three built-in IDs ("models" / "agent-presets" / "plugins"); every other
// section —ours included —falls back to the generic settings gear. The section
// contract carries no icon field (only id / order / label), so the client half
// marks OUR row with `data-dsx-nav` and widgets.module.css swaps the gear for
// the app icon's four-tile glyph. The row is matched by our own registered
// label, and the mark is removed with the owning effect.
export function installSettingsNavGlyph(): () => void {
  const ATTR = 'data-dsx-nav'
  const mark = (): void => {
    const label = t('ui.section.label')
    for (const list of document.querySelectorAll('[class$="_navList"]')) {
      for (const row of list.querySelectorAll(':scope > button')) {
        if ((row.textContent ?? '').trim() === label) row.setAttribute(ATTR, 'widgets')
        else row.removeAttribute(ATTR)
      }
    }
  }
  // Only the settings panel ever inserts a `_navList`, and the row must be
  // marked the moment that panel opens (before the user could pick our cell),
  // so watch for that one node instead of re-scanning on every transcript
  // mutation.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches('[class$="_navList"]') || node.querySelector('[class$="_navList"]') !== null) {
          mark()
          return
        }
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  // The label is localized, so a language switch re-renders the row's text and
  // the match has to run again.
  const offLocale = onLocaleChange(mark)
  mark()
  return () => {
    observer.disconnect()
    offLocale()
    for (const row of document.querySelectorAll(`[${ATTR}]`)) row.removeAttribute(ATTR)
  }
}
