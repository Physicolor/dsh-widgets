/**
 * dsh-widgets — the one subprocess seam the host half uses.
 *
 * Two channels shell out (the NVIDIA query behind `/api/sysinfo`, and the local
 * `gh` CLI's credential rung behind `/api/github`), so the promisified
 * `execFile` lives here instead of being redeclared per module. Split out of
 * `src/index.ts` (Phase H1).
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const execFileP = promisify(execFile)
