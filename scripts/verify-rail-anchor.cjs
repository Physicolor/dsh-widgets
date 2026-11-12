/**
 * The rail must be anchored to the VIEWPORT, not to whatever the composer card is.
 *
 * `position: fixed` means "the viewport" only while no ancestor is a containing
 * block for fixed descendants (transform / filter / backdrop-filter / contain /
 * will-change). The rail is registered in `conversation.input.overlay`, i.e. inside
 * the conversation's composer card, and DSH 0.2.2 made that card's seat one
 * (`will-change: transform` on `.…_composerSeat`) — which folded the whole rail
 * into the composer strip: measured 2026-11-12 at 1600x1000, rail box
 * [673,912,460,93] where the viewport-relative answer is [1140,44,460,956], and
 * the 置顶摘要 card (its `right` is derived from the rail's rect) 477px off the
 * corner with it. `rail-view.tsx` portals the drawer to a body-level host; this
 * script is the check that the portal still does its job after a DSH upgrade.
 *
 *   node scripts/verify-rail-anchor.cjs            # live GUI on DSH_LIVE_AUTHORITY
 *   DSH_LIVE_AUTHORITY=127.0.0.1:3080 node scripts/verify-rail-anchor.cjs
 *
 * The live half is skipped (not failed) when no GUI answers — see STOP-LOSS in
 * lib/probe-harness.cjs.
 */
const { close, liveAvailable, liveContext, report } = require('./lib/probe-harness.cjs')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Open any conversation whose header carries our capsule (the rail mounts only there). */
async function openConversation(page) {
  await page.goto(`http://${process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:3080'}/`, { waitUntil: 'load' })
  await wait(2200)
  const rows = ['dsh-widgets', '检查 GPU', '调研 DS-Bot', 'DeepSeek-Harness']
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await page.locator('.dsx-stats-capsule').count()) > 0) return true
    const row = page.getByText(rows[attempt % rows.length], { exact: false }).first()
    if (await row.count() > 0) await row.click({ timeout: 5000 }).catch(() => {})
    await wait(1600)
  }
  return (await page.locator('.dsx-stats-capsule').count()) > 0
}

;(async () => {
  const r = report('rail anchor')
  const authority = process.env.DSH_LIVE_AUTHORITY || '127.0.0.1:3080'
  if (!(await liveAvailable(authority))) {
    r.allowed('live GUI unreachable', `nothing on ${authority} — start dsh web to run this check`)
    await close()
    process.exit(r.exitCode())
  }

  const ctx = await liveContext({ authority })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    r.check(await openConversation(page), 'a conversation with the widget capsule opened')

    await page.click('.dsx-stats-capsule')
    await page.waitForSelector('.dsx-stats-card', { timeout: 8000 }).catch(() => {})
    await wait(1600)

    const open = await page.evaluate(() => {
      const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom } }
      const rail = document.querySelector('.dsx-stats-rail')
      const drawer = document.querySelector('.dsx-stats-drawer')
      return {
        vw: innerWidth,
        vh: innerHeight,
        hosts: document.querySelectorAll('.dsx-stats-drawer-layer').length,
        drawerParent: drawer?.parentElement?.className ?? null,
        rail: rail ? box(rail) : null,
      }
    })

    r.check(open.hosts === 1, 'exactly one drawer host on <body>', `hosts=${open.hosts}`)
    r.check(open.drawerParent === 'dsx-stats-drawer-layer', 'the drawer is mounted in that host, not in the composer card', `parent=${open.drawerParent}`)
    if (!r.check(open.rail !== null, 'the rail is mounted')) {
      // nothing else can be measured
    } else {
      const rail = open.rail
      r.check(Math.abs(rail.right - open.vw) <= 1, 'rail right edge sits on the viewport edge', `right=${Math.round(rail.right)} vw=${open.vw}`)
      r.check(Math.abs(rail.bottom - open.vh) <= 1, 'rail bottom edge sits on the viewport floor', `bottom=${Math.round(rail.bottom)} vh=${open.vh}`)
      r.check(rail.w > open.vw * 0.15, 'rail keeps its column width (not squeezed into the composer strip)', `w=${Math.round(rail.w)}`)
      r.check(rail.x > open.vw * 0.5, 'rail is in the right half of the window', `x=${Math.round(rail.x)}`)

      // React's handlers must survive the portal: the same toggle closes the rail.
      await page.click('.dsx-stats-capsule')
      await wait(1200)
      const pressed = await page.evaluate(() => document.querySelector('.dsx-stats-capsule')?.getAttribute('aria-pressed'))
      r.check(pressed === 'false', 'the toggle still reaches React through the portal (closes)', `aria-pressed=${pressed}`)
    }
    r.check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | ') || undefined)
  } finally {
    await ctx.close()
    await close()
  }
  process.exit(r.exitCode())
})()
