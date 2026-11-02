/**
 * 组件市场 — the search predicate, as data in / boolean out.
 *
 * WHY THIS IS ITS OWN MODULE. The market lists GROUPS (a group card folds every
 * widget that shares a group id into one row), and the first implementation
 * filtered the GROUP LIST by the REPRESENTATIVE widget only — so a query that
 * named any other member of the group (「GPU」 when the first member is 轮次·步数)
 * or the group label itself (「系统」) matched nothing, even though the market was
 * showing that very group. The predicate is pure and React-free so the offline
 * gate (`scripts/verify-market-search.mjs`, G14) can pin the three things that
 * were broken: label matching, ANY-member matching, and the empty query.
 *
 * The caller passes the LOCALIZED strings (name/desc/label) because those come
 * from the widget registry, not from this module; keeping them as plain data is
 * what lets the gate run with no registry, no i18n and no DOM.
 */

/** One widget inside a group card. */
export interface MarketSearchMember {
  id: string
  /** Localized widget name. */
  name: string
  /** Localized one-line description. */
  desc: string
}

/** One market row: the group's representative + every widget it folds in. */
export interface MarketSearchGroup {
  /** The group id (e.g. `system`). */
  id: string
  /** Localized group label; the registry falls back to the first member's name. */
  label: string
  members: MarketSearchMember[]
}

/**
 * Does this group match `query`?
 *
 * - empty / whitespace-only query → true (the unfiltered list);
 * - the group LABEL matches;
 * - or ANY member's id, name or description matches.
 *
 * Matching is case-insensitive and substring-based, exactly as it was — the fix
 * is the SET of strings it looks at, not the comparison.
 */
export function marketGroupMatches(group: MarketSearchGroup, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  if (group.label.toLowerCase().indexOf(q) !== -1) return true
  return group.members.some((m) =>
    m.id.toLowerCase().indexOf(q) !== -1
    || m.name.toLowerCase().indexOf(q) !== -1
    || m.desc.toLowerCase().indexOf(q) !== -1,
  )
}
