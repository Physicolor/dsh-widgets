/**
 * dsh-widgets — the preference WRITE path.
 *
 * Every write is one transaction with two sinks:
 *   1. localStorage, the fast per-origin cache, written immediately; and
 *   2. the host file (`/api/widgets-state`), written through a 400 ms debounce
 *      and flushed with `sendBeacon` when the page is being torn down.
 *
 * The localStorage mirror lives in this module (rather than in
 * `runtime/prefs.ts`) because it shares the SAME timestamp as the host write:
 * whichever sink is newer decides the winner at boot, so the two writes cannot be
 * separated without splitting that decision.
 */

import { SAVED_AT_KEY, STORAGE_KEY, type Prefs } from './prefs'

/** Same-origin host route holding the authoritative state file. */
export const STORE_API = '/api/widgets-state'

/** Debounced PUT to the host store; localStorage is always the fast path, the
 *  host file the authoritative one (survives origin switches and clearing). */
let hostSyncTimer: number | undefined
let pendingState: Prefs | null = null
let pendingAt = 0
export async function putState(s: Prefs, at: number): Promise<void> {
  try {
    await fetch(STORE_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt: at, state: s }),
      // A keepalive request is allowed to outlive the page, so a state write
      // that is still in flight when the window/tab closes is not dropped.
      keepalive: true,
    })
  } catch { /* host unreachable: localStorage still holds the state; a later boot sync re-pushes */ }
}
export function saveState(s: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    pendingAt = Date.now()
    localStorage.setItem(SAVED_AT_KEY, String(pendingAt))
  } catch { /* storage unavailable */ }
  pendingState = s
  if (hostSyncTimer !== undefined) window.clearTimeout(hostSyncTimer)
  hostSyncTimer = window.setTimeout(() => {
    hostSyncTimer = undefined
    const toSend = pendingState
    const at = pendingAt
    pendingState = null
    if (toSend !== null) void putState(toSend, at)
  }, 400)
}
/**
 * Flush any state that has not yet reached the host store when the page is
 * being torn down (window/tab close, navigation, desktop-app quit). The
 * 400 ms debounce means the last edit before a quick close is usually still
 * pending here; a normal fetch would be cancelled with the page, but
 * `sendBeacon` is delivered by the browser even as the page is destroyed —
 * which is what keeps the write inside desktop shells that spawn a fresh
 * random loopback origin on every launch (their localStorage is a new realm
 * each boot, so the host file is the only channel that survives).
 */
export function flushPendingState(): void {
  const toSend = pendingState
  if (toSend === null) return
  const at = pendingAt
  pendingState = null
  try {
    const body = JSON.stringify({ savedAt: at, state: toSend })
    // sendBeacon is a POST; the host handler accepts PUT or POST, so the
    // same route copes with it. A Blob pins the JSON content type.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(STORE_API, new Blob([body], { type: 'application/json' }))
    } else {
      void fetch(STORE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  } catch { /* page is going away; nothing more can be done —the boot sync on the next launch converges */ }
}
