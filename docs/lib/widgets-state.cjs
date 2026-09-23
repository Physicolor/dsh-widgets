/**
 * Host widget-rail state helpers for the Playwright probes (docs/lib).
 *
 * WHY THIS EXISTS — the lesson from 2026-09-20: the probes used to inject their
 * test layout by PUTting `/api/widgets-state` with `savedAt: Date.now()`, then
 * "restored" the snapshot with the ORIGINAL (older) savedAt. The widget plugin
 * resolves conflicts by savedAt ("whichever side is newer wins"), so the probe's
 * timestamp stayed newer than the restore and any open GUI page — whose
 * localStorage still held the injected layout — pushed it straight back onto the
 * host. The user's own rail came back showing the probe's cards.
 *
 * The rules encoded here:
 *  1. INJECT with `savedAt: 1` (older than anything real). A page that syncs
 *     during the run therefore prefers its own localStorage — a real user's
 *     layout always wins over a running probe, never the other way round.
 *  2. RESTORE with `savedAt = max(original, Date.now())`, written AFTER the
 *     browser is closed, so no page can flush the injected layout back on top.
 *  3. Keep both the pre-injection file and the overwritten file on disk, so a
 *     bad run is always recoverable by hand.
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

/** `$DSH_HOME/profiles/web/dsh-widgets-state.json` (same path the host uses). */
function stateFilePath() {
  const home = process.env.DSH_HOME && process.env.DSH_HOME.length > 0 ? process.env.DSH_HOME : path.join(os.homedir(), '.dsh')
  return path.join(home, 'profiles', 'web', 'dsh-widgets-state.json')
}

/** Read `{ savedAt, state }`; a missing/corrupt file reads as an empty payload. */
function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFilePath(), 'utf8'))
    return { savedAt: Number(parsed.savedAt) || 0, state: parsed.state && typeof parsed.state === 'object' ? parsed.state : {} }
  } catch {
    return { savedAt: 0, state: {} }
  }
}

/** Atomic write (tmp + rename), exactly like the host route. */
function write(payload) {
  const file = stateFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(`${file}.tmp`, JSON.stringify({ savedAt: payload.savedAt, state: payload.state }), 'utf8')
  fs.renameSync(`${file}.tmp`, file)
}

/** Snapshot the host state and label it on disk before a probe touches it. */
function snapshot(label = 'probe') {
  const payload = read()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${stateFilePath()}.${label}-${stamp}.json`
  try { fs.writeFileSync(backup, JSON.stringify(payload), 'utf8') } catch { /* best effort */ }
  return { payload, backup }
}

/**
 * Inject a probe layout with the OLDEST possible stamp (rule 1) and verify the
 * write landed, so a failed injection is a loud failure instead of a silent
 * "no skeleton cards" mystery.
 */
function inject(overrides) {
  const cur = read()
  const state = { ...cur.state, ...overrides }
  write({ savedAt: 1, state })
  const back = read()
  if (back.savedAt !== 1 || back.state.installed?.length !== overrides.installed?.length) {
    throw new Error(`state injection did not land (savedAt=${back.savedAt}, installed=${back.state.installed?.length})`)
  }
  return state
}

/**
 * Put the snapshot back with the NEWEST stamp (rule 2) and verify the placed
 * instances match; returns the verification result rather than trusting itself.
 */
function restore(snap) {
  const wanted = snap.payload.state?.installed ?? []
  write({ savedAt: Math.max(snap.payload.savedAt, Date.now()), state: snap.payload.state ?? {} })
  const back = read()
  const got = back.state.installed ?? []
  return {
    ok: got.length === wanted.length && got.every((id, i) => id === wanted[i]),
    savedAt: back.savedAt,
    installed: got.length,
    backup: snap.backup,
  }
}

module.exports = { stateFilePath, read, write, snapshot, inject, restore }
