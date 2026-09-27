/**
 * Resolve the Chromium build the probes should launch.
 *
 * Playwright installs each browser into a REVISION directory
 * (`ms-playwright/chromium-<rev>/`), and a machine that ran `npx playwright
 * install` after an upgrade keeps several of them side by side. Every probe used
 * to hardcode one revision, so they all broke at once the moment playwright moved
 * on — and the path is machine-specific anyway. Resolve the newest installed
 * build instead; `CHROME_PATH` overrides it (and is the escape hatch for a
 * different browser entirely).
 *
 *   const { chromePath } = require('./lib/chrome.cjs')
 *   chromium.launch({ executablePath: chromePath(), headless: true })
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const ROOTS = [
  process.env.PLAYWRIGHT_BROWSERS_PATH,
  path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright'),
  path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  path.join(os.homedir(), '.cache', 'ms-playwright'),
  '/root/.cache/ms-playwright',
].filter(Boolean)

/** Executable candidates inside one revision directory, newest layout first. */
const LAYOUTS = {
  win32: ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe'],
  darwin: ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium'],
}
LAYOUTS.linux = ['chrome-linux64/chrome', 'chrome-linux/chrome']

/** The newest `chromium-<rev>` (NOT `chromium_headless_shell-<rev>`) that has an exe. */
function newestChromium(root) {
  let entries
  try { entries = fs.readdirSync(root) } catch { return null }
  const revisions = entries
    .filter((name) => /^chromium(-\d+)?$/.test(name))
    .map((name) => ({ name, rev: Number((/-(\d+)$/.exec(name) ?? [])[1] ?? 0) }))
    .sort((a, b) => b.rev - a.rev)
  const layouts = LAYOUTS[process.platform] ?? LAYOUTS.linux
  for (const { name } of revisions) {
    for (const layout of layouts) {
      const exe = path.join(root, name, layout)
      if (fs.existsSync(exe)) return exe
    }
  }
  return null
}

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const root of ROOTS) {
    const hit = newestChromium(root)
    if (hit !== null) return hit
  }
  throw new Error(`no chromium build found; set CHROME_PATH (looked in: ${ROOTS.join(', ')})`)
}

module.exports = { chromePath, newestChromium, ROOTS }
