/**
 * Resolve the `playwright-core` MODULE the probes require.
 *
 * `lib/chrome.cjs` fixed this class of bug for the BROWSER executable: every
 * probe used to hardcode one `chromium-<rev>` path, so they all broke at once
 * the moment playwright moved on. The module side never got the same
 * treatment. 112 probes still hardcode
 * `.../npm-cache/_npx/86170c4cd1c5da32/node_modules/playwright-core` — an npx
 * cache directory name that npx is free to change, and that has already
 * changed twice on this machine (`6c7f445d1bf61956` and `c40503fdf38a82ea` are
 * gone; the first still breaks `preview/gallery.mjs`'s react-dom pin, the
 * second used to break `_scan-turnnav-attrs.cjs`).
 *
 * Resolution order — first hit wins:
 *   1. `DSH_PLAYWRIGHT_CORE` — explicit override (CI pin, second install).
 *   2. this repo's own `node_modules` — the durable answer; works as soon as
 *      `playwright-core` is a devDependency here, which is the real fix.
 *   3. every `_npx/<hash>/node_modules/playwright-core` in the npm cache.
 *   4. the pnpm store of sibling plugins under `$DSH_HOME/plugins`.
 *
 *   const { chromium } = require('./lib/playwright-core.cjs')
 *   chromium.launch({ executablePath: chromePath(), headless: true })
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')

/** Absolute paths that may hold a `playwright-core`, in preference order. */
function roots() {
  const out = []
  if (process.env.DSH_PLAYWRIGHT_CORE) out.push(path.resolve(process.env.DSH_PLAYWRIGHT_CORE))
  out.push(path.join(REPO_ROOT, 'node_modules', 'playwright-core'))
  const npmCache = process.env.npm_config_cache
    || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'npm-cache')
  const npxCache = path.join(npmCache, '_npx')
  let hashes = []
  try { hashes = fs.readdirSync(npxCache) } catch { hashes = [] }
  // Newest cache entry first: a `npx playwright@latest` run adds the newest hash.
  hashes
    .map((name) => ({ name, at: mtime(path.join(npxCache, name)) }))
    .sort((a, b) => b.at - a.at)
    .forEach(({ name }) => out.push(path.join(npxCache, name, 'node_modules', 'playwright-core')))
  const dshHome = process.env.DSH_HOME || path.join(D_HOME_FALLBACK(), '')
  const plugins = path.join(dshHome, 'plugins')
  let dirs = []
  try { dirs = fs.readdirSync(plugins, { withFileTypes: true }) } catch { dirs = [] }
  for (const dir of dirs) {
    if (!dir.isDirectory() || dir.name.startsWith('.')) continue
    out.push(path.join(plugins, dir.name, 'node_modules', 'playwright-core'))
    let pnpm = []
    try { pnpm = fs.readdirSync(path.join(plugins, dir.name, 'node_modules', '.pnpm')) } catch { continue }
    for (const entry of pnpm) {
      if (entry.startsWith('playwright-core@') || entry.startsWith('playwright@')) {
        out.push(path.join(plugins, dir.name, 'node_modules', '.pnpm', entry, 'node_modules', 'playwright-core'))
      }
    }
  }
  return out
}

/** The harness home, honouring $DSH_HOME. Falls back to the conventional `D:\dsh-home`. */
function D_HOME_FALLBACK() {
  return 'D:\\dsh-home'
}

function mtime(p) {
  try { return fs.statSync(p).mtimeMs } catch { return 0 }
}

/** True when `p` is a loadable playwright-core (has a package.json entry point). */
function usable(p) {
  try { return fs.statSync(path.join(p, 'package.json')).isFile() } catch { return false }
}

/** Absolute path of the playwright-core module directory. Throws when absent. */
function playwrightCorePath() {
  const searched = roots()
  const hit = searched.find(usable)
  if (!hit) {
    throw new Error(
      `playwright-core not found; set DSH_PLAYWRIGHT_CORE or add it to node_modules `
      + `(looked in ${searched.length} places, first: ${searched.slice(0, 3).join(', ') || 'none'})`,
    )
  }
  return hit
}

module.exports = { chromium: require(playwrightCorePath()).chromium, playwrightCorePath, roots }
