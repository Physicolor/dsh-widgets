#!/usr/bin/env node
/**
 * dsh-widgets — the market search predicate, offline (gate G14).
 *
 * WHY THIS EXISTS. The market lists GROUPS, and the first implementation
 * filtered that list by each group's REPRESENTATIVE widget only. A query that
 * named any other member of the group, or the group label itself, returned
 * nothing while the group card was on screen — a silent "no results" for a
 * widget the market clearly had. This gate pins the three behaviours that were
 * missing, on plain data (no registry, no i18n, no DOM):
 *
 *   - the GROUP LABEL matches;
 *   - ANY member's name / description / id matches (the actual bug);
 *   - the empty query (including whitespace only) returns everything.
 *
 * Run: node --experimental-strip-types scripts/verify-market-search.mjs
 *      (also `node scripts/gates.mjs --only G14`)
 */
import { marketGroupMatches } from '../src/client/surfaces/market/search.ts'

let failures = 0
const check = (ok, name, detail = '') => {
  if (ok) {
    console.log(`PASS  ${name}`)
    return
  }
  failures++
  console.error(`FAIL  ${name}${detail === '' ? '' : ` — ${detail}`}`)
}

/** The shape the market actually builds: a group with several members. */
const system = {
  id: 'system',
  label: '系统',
  members: [
    { id: 'counts', name: '轮次·步数', desc: '本轮会话的轮次与步骤计数' },
    { id: 'sys-gpu', name: 'GPU 性能', desc: '本机 GPU 利用率与显存' },
    { id: 'tokens', name: 'Token 用量', desc: '本会话消耗的 Token 分量' },
  ],
}
const clock = {
  id: 'clock',
  label: '时钟',
  members: [{ id: 'clock', name: '时钟', desc: '指针或数字时钟' }],
}
const blank = { id: 'empty-group', label: '', members: [] }

check(marketGroupMatches(system, '系统') === true, 'matches the group label')
check(marketGroupMatches(system, 'GPU') === true, 'matches a NON-representative member name (the reported bug)')
check(marketGroupMatches(system, '显存') === true, 'matches a non-representative member description')
check(marketGroupMatches(system, 'counts') === true, 'matches a member id')
check(marketGroupMatches(system, '轮次') === true, 'matches the representative member')
check(marketGroupMatches(clock, '时钟') === true, 'matches a single-member group by label and name')
check(marketGroupMatches(system, 'gpu') === true, 'is case-insensitive')
check(marketGroupMatches(system, '   ') === true, 'whitespace-only query returns the unfiltered list')
check(marketGroupMatches(system, '') === true, 'empty query returns the unfiltered list')
check(marketGroupMatches(system, '  GPU  ') === true, 'trims the query')
check(marketGroupMatches(system, '不存在的组件') === false, 'no match returns false')
check(marketGroupMatches(clock, 'GPU') === false, 'a match in another group does not leak across groups')
check(marketGroupMatches(blank, 'anything') === false, 'an empty group matches only on its label')
check(marketGroupMatches(blank, '') === true, 'an empty group still shows under an empty query')

if (failures > 0) {
  console.error(`\n[market-search] FAIL — ${failures} assertion(s)`)
  process.exit(1)
}
console.log('\n[market-search] PASS — 14 assertion(s)')
