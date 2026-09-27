/**
 * dsh-widgets — the widget-rail state file.
 *
 * `/api/widgets-state`: GET/PUT the persisted rail configuration under the profile
 * data dir, written atomically (tmp + rename) so a crash mid-write never leaves a
 * truncated JSON the next boot would reject. Split out of `src/index.ts` (Phase H6).
 */
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { readJsonBody } from './http'
import { type HostContext, type ReqLike } from './context'

/** Widget-rail state file under the profile data dir (same dir as the patch file). */
function stateFilePath(): string {
  const home = process.env.DSH_HOME
  const base = home !== undefined && home.length > 0 ? home : join(homedir(), '.dsh')
  return join(base, 'profiles', 'web', 'dsh-widgets-state.json')
}

/** Register the state route; returns the disposer `ctx.effect` wants. */
export function registerWidgetsState(ctx: HostContext): () => void {
  // Widget-rail state persistence. GET returns `{ savedAt, state }` (no file →
  // `{ savedAt: 0, state: {} }`); PUT stores it atomically (tmp + rename) so a
  // crash mid-write never leaves a truncated JSON the next boot would reject.
  const off = ctx.webServer.register({
    kind: 'exact',
    path: '/api/widgets-state',
    handler: async (req, res) => {
      const method = (req as ReqLike | undefined)?.method ?? 'GET'
      const file = stateFilePath()
      if (method === 'GET') {
        let body = JSON.stringify({ savedAt: 0, state: {} })
        try {
          const info = await fs.stat(file)
          if (info !== undefined) body = await fs.readFile(file, 'utf8')
        } catch { /* absent or unreadable → default payload above */ }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
        return
      }
      if (method === 'PUT' || method === 'POST') {
        try {
          const data = await readJsonBody(req)
          const text = JSON.stringify(data)
          await fs.mkdir(dirname(file), { recursive: true })
          const tmp = `${file}.tmp`
          await fs.writeFile(tmp, text, 'utf8')
          await fs.rename(tmp, file)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
        return
      }
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'method not allowed' }))
    },
  })
  return off
}
