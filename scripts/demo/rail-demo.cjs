/**
 * dsh-widgets — the README's motion asset, without a screen recorder.
 *
 * The rail's signature is motion (the magnification wave, the drawer's slide, the
 * column reflow), so a still cannot show it. Recording the window with a video
 * recorder is the obvious answer and the wrong one: a screencast is pushed at wall
 * clock speed, drops frames whenever capture stalls, and produces a different clip
 * every run — none of which survives a review.
 *
 * This script steps the page on CDP VIRTUAL TIME instead: the clock only advances by
 * the exact per-frame budget, so every frame is a settled state of the animation and
 * the same input yields the same video. Frames are screenshotted off the rail's clip
 * box (never the conversation — a demo asset must not carry the owner's chat), encoded
 * with ffmpeg, and published twice:
 *
 *   docs/screenshots/rail-demo.mp4   H.264, full resolution (README <video>/link)
 *   docs/screenshots/rail-demo.gif   palette GIF (places that only render images)
 *
 * Usage (needs a live GUI with a session open — the rail lives inside one):
 *
 *   node scripts/demo/rail-demo.cjs                        # 200 frames, 25fps, 8s
 *   node scripts/demo/rail-demo.cjs --needle "会话标题" --authority 127.0.0.1:19387
 *   node scripts/demo/rail-demo.cjs --frames 120 --fps 30 --keep-frames
 *   node scripts/demo/rail-demo.cjs --no-virtual           # fall back to wall clock
 *
 * The GUI is behind the signed browser-session cookie `dsh web` mints; `diag-auth-lib`
 * reads the persisted secret so a headless browser can drive it (local-only helper,
 * see .gitignore — the same one every live verify-* script uses).
 *
 * TYPE: the owner's rule is that a published asset speaks in **HarmonyOS Sans SC**, not
 * in whatever the machine's default UI font happens to be. The font is a local
 * capture-time override (`--font`), injected into the page before the first frame and
 * never written to the plugin's own styles — the product keeps the host's font, the
 * asset gets the intended one. Override `--font ""` to capture the untouched product.
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { chromePath } = require('../lib/chrome.cjs')
const { chromium } = require('../lib/playwright-core.cjs')
const { mintCookie } = require('../diag-auth-lib.cjs')

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }

const ROOT = path.join(__dirname, '..', '..')
const AUTHORITY = val('--authority', process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:19387')
const BASE = `http://${AUTHORITY}`
const NEEDLE = val('--needle', process.env.DSH_SESSION_NEEDLE || '')
const W = Number(val('--w', '1707'))
const H = Number(val('--h', '1067'))
const FPS = Number(val('--fps', '25'))
const FRAME_MS = Number(val('--frame-ms', String(Math.round(1000 / FPS))))
const FRAMES = Number(val('--frames', '200'))
const DSF = Number(val('--dsf', '2'))
const VIRTUAL = !has('--no-virtual')
const FONT = val('--font', "'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif")
const OUT = path.join(ROOT, '.tmp-demo')
const FRAME_DIR = path.join(OUT, 'frames')

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(FRAME_DIR, { recursive: true })

  const browser = await chromium.launch({ executablePath: chromePath(), headless: !has('--headful') })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF })
  await ctx.addCookies([mintCookie(AUTHORITY)])
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await page.waitForTimeout(5000)

  // Get into a session: the rail only mounts where a conversation exists. With no
  // --needle, take the most recent session row (the first one in the list).
  const row = NEEDLE
    ? page.getByText(NEEDLE, { exact: false }).first()
    : page.locator('[class$="_sessionRow"]').first()
  await row.click({ timeout: 8000 }).catch((e) => console.error('[demo] session click: ' + e.message))
  await page.waitForTimeout(8000)

  // A closed drawer keeps its geometry but paints nothing (`data-retired`), so the
  // screenshot would be an empty box: open it through the header capsule.
  if (await page.evaluate(() => !!document.querySelector('.dsx-stats-drawer[data-retired]'))) {
    await page.locator('.dsx-stats-capsule').first().click({ timeout: 8000 }).catch((e) => console.error('[demo] capsule: ' + e.message))
    await page.waitForTimeout(4000)
  }
  await page.mouse.move(10, H - 10).catch(() => {})   // park the pointer: the wave starts at rest
  await page.waitForTimeout(1500)

  // Capture-time type override (see the header): the product's own stylesheet is left
  // exactly as shipped, the page just resolves its font to `--font` for these frames.
  if (FONT) {
    await page.evaluate((stack) => {
      document.documentElement.style.setProperty('--dsw-font-family', stack)
      const style = document.createElement('style')
      style.id = 'dsx-demo-font'
      style.textContent = `.dsx-stats-rail, .dsx-stats-rail * { font-family: ${stack}; }`
      document.head.appendChild(style)
    }, FONT)
    await page.waitForTimeout(1200)
  }
  // Prove which font actually rendered (computed style can lie; the platform-font
  // report cannot): one throwaway CDP session over the first card title.
  let platformFonts = []
  try {
    const probe = await page.context().newCDPSession(page)
    await probe.send('DOM.enable')
    await probe.send('CSS.enable')
    const { root } = await probe.send('DOM.getDocument', { depth: -1 })
    const { nodeId } = await probe.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.dsx-stats-card-title' })
    if (nodeId) {
      const report = await probe.send('CSS.getPlatformFontsForNode', { nodeId })
      platformFonts = report.fonts.map((f) => `${f.familyName} x${f.glyphCount}`)
    }
    await probe.detach()
  } catch (e) { console.error('[demo] platform-font probe: ' + e.message) }
  console.log(`[demo] font ${FONT || '(product default)'} → rendered: ${platformFonts.join(', ') || 'unknown'}`)

  const rail = await page.evaluate(() => {
    const el = document.querySelector('.dsx-stats-rail')
    if (el === null) return null
    const r = el.getBoundingClientRect()
    const cards = [...document.querySelectorAll('.dsx-stats-card')].map((c) => {
      const b = c.getBoundingClientRect()
      return { y: Math.round(b.y), h: Math.round(b.height) }
    })
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cards: cards.length, last: cards[cards.length - 1] ?? null }
  })
  if (rail === null) { console.error('[demo] no rail — is a session open on ' + AUTHORITY + '?'); process.exit(2) }

  // Crop to the CARDS, not to the rail box: the rail box runs to the window bottom
  // while the last card ends higher up, and the dead band below it is not worth the
  // bytes (nor the GIF's palette).
  const pad = 14
  const cardsBottom = rail.last ? rail.last.y + rail.last.h : rail.y + rail.h
  const clip = {
    x: Math.max(0, rail.x - pad),
    y: Math.max(0, rail.y - pad),
    width: Math.min(W - Math.max(0, rail.x - pad), rail.w + pad * 2),
    height: Math.min(H - Math.max(0, rail.y - pad), cardsBottom - (rail.y - pad) + pad),
  }
  console.log(`[demo] rail ${rail.w}x${rail.h} @${rail.x},${rail.y} with ${rail.cards} cards → clip ${clip.width}x${clip.height}`)

  // The motion: rest → glide down the rail's centre column → hold → leave left → rest.
  const cx = clip.x + clip.width / 2
  const topY = clip.y + 30
  const bottomY = clip.y + clip.height - 40
  const pointerAt = (i) => {
    const t = i / FRAMES
    if (t < 0.10) return { x: cx, y: topY, move: false }
    if (t < 0.55) return { x: cx, y: topY + (bottomY - topY) * ((t - 0.10) / 0.45), move: true }
    if (t < 0.72) return { x: cx, y: bottomY, move: false }
    if (t < 0.86) return { x: cx - 260, y: bottomY, move: true }
    return { x: 12, y: H - 12, move: false }
  }

  let cdp = null
  if (VIRTUAL) {
    cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
  }

  const t0 = Date.now()
  for (let i = 0; i < FRAMES; i += 1) {
    const p = pointerAt(i)
    if (p.move) await page.mouse.move(p.x, p.y).catch(() => {})
    if (cdp !== null) {
      const expired = new Promise((resolve) => {
        cdp.once('Emulation.virtualTimeBudgetExpired', resolve)
        setTimeout(resolve, 2000)
      })
      await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: FRAME_MS })
      await expired
    } else {
      await page.waitForTimeout(FRAME_MS)
    }
    await page.screenshot({ path: path.join(FRAME_DIR, `f${String(i).padStart(4, '0')}.png`), clip })
  }
  if (cdp !== null) await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' }).catch(() => {})
  await browser.close()
  console.log(`[demo] ${FRAMES} frames in ${Date.now() - t0} ms (${VIRTUAL ? 'virtual time' : 'wall clock'}, ${FRAME_MS} ms/frame)`)

  const pubDir = path.join(ROOT, 'docs', 'screenshots')
  const pubMp4 = path.join(pubDir, 'rail-demo.mp4')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(FRAME_DIR, 'f%04d.png'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', pubMp4], { stdio: 'inherit' })

  const gif = path.join(pubDir, 'rail-demo.gif')
  const gifFilter = `fps=${val('--gif-fps', '13')},scale=${val('--gif-w', '480')}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=88[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', pubMp4, '-vf', gifFilter, '-loop', '0', gif], { stdio: 'inherit' })

  const size = (p) => `${(fs.statSync(p).size / 1024 / 1024).toFixed(2)} MB`
  if (!has('--keep-frames')) fs.rmSync(FRAME_DIR, { recursive: true, force: true })
  console.log(`[demo] mp4 ${size(pubMp4)} · gif ${size(gif)}`)
})().catch((e) => { console.error('[demo] FAILED', e); process.exit(1) })
