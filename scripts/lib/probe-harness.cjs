/**
 * One Chromium, many probes.
 *
 * Measured on this machine (2026-10-03, node v22.22.2): requiring
 * `playwright-core` costs ~319ms, `chromium.launch()` ~470-590ms, `newPage()`
 * ~195ms, and `browser.close()` ~350-640ms. That is ~1.5s of pure overhead per
 * process, and 111 of the probes in this repo call `chromium.launch` exactly
 * once — so probing three related questions used to cost three cold browsers.
 *
 * This module makes the browser (and the offline gallery build) per-PROCESS
 * singletons, so a batch of related checks pays for one launch:
 *
 *   const { browser, livePage, galleryPage, report, close } = require('./lib/probe-harness.cjs')
 *
 *   const r = report('geometry batch')
 *   const page = await galleryPage()
 *   r.check(await page.locator('.g-cell').count() > 50, 'gallery rendered')
 *   await close()
 *   process.exit(r.exitCode())
 *
 * Two rules the audit asked for are enforced in code rather than in prose:
 *
 *   STOP-LOSS   `liveAvailable()` answers "is the live GUI reachable?" without
 *               throwing. A probe that only needs the gallery must ask first and
 *               keep going when the answer is no, instead of failing the run.
 *   BATCHING    `runAll()` isolates each probe: one probe throwing is recorded
 *               and the rest still run, so a batch is never lost to one bad
 *               measurement.
 */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const { chromePath } = require('./chrome.cjs')
const { chromium } = require('./playwright-core.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const GALLERY_DIR = path.join(ROOT, '.tmp-gallery')
const GALLERY_PAGE = path.join(GALLERY_DIR, 'index.html')

/** The local GUI authority every live probe talks to. */
const LIVE_AUTHORITY = process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:3080'

let browserPromise = null
let galleryPromise = null

/** The one browser this process launches, or null when nothing asked for it yet. */
function launchedBrowser() {
  return browserPromise
}

/** Launch (once) and return the shared browser. */
function browser() {
  if (browserPromise === null) {
    browserPromise = chromium.launch({ executablePath: chromePath(), headless: true })
  }
  return browserPromise
}

/** Close the shared browser if one was launched. Safe to call twice. */
async function close() {
  if (browserPromise === null) return
  const pending = browserPromise
  browserPromise = null
  try {
    const b = await pending
    await b.close()
  } catch { /* already gone */ }
}

/** True when something accepts TCP connections on `authority`. Never throws. */
function reachable(authority, timeoutMs = 400) {
  const [host, port] = String(authority).split(':')
  return new Promise((resolve) => {
    const sock = net.connect({ host, port: Number(port) })
    const done = (value) => { sock.destroy(); resolve(value) }
    sock.setTimeout(timeoutMs)
    sock.once('connect', () => done(true))
    sock.once('timeout', () => done(false))
    sock.once('error', () => done(false))
  })
}

/**
 * Whether the live GUI is up. Probes whose question is answerable offline must
 * treat `false` as "skip that half", NOT as a failure.
 */
function liveAvailable(authority = LIVE_AUTHORITY) {
  return reachable(authority)
}

/**
 * A context on the live GUI with a self-minted auth cookie. Requires
 * `diag-auth-lib.cjs`, which is local-only (gitignored) — so a clean checkout
 * gets a clear error instead of a 401 page.
 */
async function liveContext(options = {}) {
  const { mintCookie } = require('../diag-auth-lib.cjs')
  const authority = options.authority || LIVE_AUTHORITY
  const b = await browser()
  const ctx = await b.newContext({ viewport: options.viewport || { width: 1600, height: 1000 } })
  await ctx.addCookies([mintCookie(authority)])
  return ctx
}

/**
 * Build the offline gallery once per process, then hand back a page onto it.
 * Callers must NOT close the page's browser.
 */
async function galleryPage(options = {}) {
  if (galleryPromise === null) {
    galleryPromise = (async () => {
      if (options.rebuild || !fs.existsSync(GALLERY_PAGE)) {
        const run = spawnSync(
          process.execPath,
          [path.join(ROOT, 'scripts', 'preview', 'gallery.mjs'), '--no-shot'],
          { cwd: ROOT, encoding: 'utf8' },
        )
        if (!fs.existsSync(GALLERY_PAGE)) {
          throw new Error(`gallery build produced no page (exit ${run.status})\n${(run.stderr || '').slice(-2000)}`)
        }
      }
    })()
  }
  await galleryPromise
  const b = await browser()
  const page = await b.newPage({ viewport: options.viewport || { width: 900, height: 2000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('file:///' + GALLERY_PAGE.split('\\').join('/'), { waitUntil: 'load' })
  await page.waitForSelector('.g-cell', { timeout: 20000 })
  await page.waitForTimeout(options.settleMs ?? 600)
  return { page, consoleErrors: errors }
}

/** A named probe that reports checks and never loses its verdict. */
function report(name) {
  const checks = []
  return {
    name,
    check(condition, label, detail) {
      checks.push({ ok: !!condition, label, detail })
      const mark = condition ? '  ok  ' : '  FAIL'
      console.log(`${mark} ${label}${detail === undefined ? '' : ` — ${detail}`}`)
      return !!condition
    },
    /** Acceptable-by-design deviations, printed so the reason stays on the record. */
    allowed(label, why) {
      console.log(`  ~    ${label} — ${why}`)
    },
    note(message) {
      console.log(`  ..   ${message}`)
    },
    failures() {
      return checks.filter((c) => !c.ok)
    },
    exitCode() {
      const failed = checks.filter((c) => !c.ok).length
      console.log(`\n${failed === 0 ? 'PASSED' : 'FAILED'} ${checks.length - failed}/${checks.length} checks — ${name}`)
      return failed === 0 ? 0 : 1
    },
  }
}

/**
 * Run probes sequentially, isolating failures. Each entry is `{ name, run }`
 * where `run(report)` may be async. Returns the worst exit code.
 */
async function runAll(entries) {
  let worst = 0
  for (const entry of entries) {
    const r = report(entry.name)
    try {
      await entry.run(r)
    } catch (error) {
      r.check(false, `${entry.name} threw`, error?.message || String(error))
    }
    worst = Math.max(worst, r.exitCode())
  }
  return worst
}

module.exports = {
  AUTHORITY: LIVE_AUTHORITY,
  GALLERY_PAGE,
  ROOT,
  browser,
  close,
  galleryPage,
  launchedBrowser,
  liveAvailable,
  liveContext,
  reachable,
  report,
  runAll,
}
