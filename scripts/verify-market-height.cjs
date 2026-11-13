/**
 * 组件市场 must stay readable in a host that MEASURES the section, not stretches it.
 *
 * Both market layers are `position: absolute; inset: 0` (the shared-axis push needs
 * them stacked), so `.dsx-mkt` has no content height of its own — it only ever gets
 * one from a flex parent. The official settings dialog stretches the section and was
 * the only host tested, until DS Bot 0.3.5 showed `.bt-dsh-section` (auto height)
 * above our `height: 100%` root: measured 2026-11-13 at 1600x1000, `.dsx-mkt` was
 * **0px** — tab bar visible, search field and every card clipped by `overflow:hidden`
 * (the owner's "组件市场不显示内容"). The CSS floor is the fix; this script is the
 * check that both host shapes keep rendering it.
 *
 *   node scripts/verify-market-height.cjs            # live GUI on DSH_LIVE_AUTHORITY
 *   DSH_LIVE_AUTHORITY=127.0.0.1:3080 node scripts/verify-market-height.cjs
 *
 * The live half is skipped (not failed) when no GUI answers — see STOP-LOSS in
 * lib/probe-harness.cjs.
 */
const { close, liveAvailable, liveContext, report } = require('./lib/probe-harness.cjs')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Open 设置 → 组件 → 组件市场 and hand back whether the market mounted. */
async function openMarket(page, authority) {
  await page.goto(`http://${authority}/`, { waitUntil: 'load' })
  await wait(2400)
  const menu = page.locator('[aria-label="账号菜单"]').first()
  if ((await menu.count()) === 0) return false
  await menu.click()
  await wait(700)
  await page.getByText('设置', { exact: false }).first().click({ timeout: 5000 }).catch(() => {})
  await wait(1600)
  await page.getByText('组件', { exact: true }).first().click({ timeout: 5000 }).catch(() => {})
  await wait(1200)
  await page.getByText('组件市场', { exact: true }).first().click({ timeout: 5000 }).catch(() => {})
  await wait(1400)
  return (await page.locator('.dsx-mkt').count()) > 0
}

/** Box of the market, plus where the search field sits inside it. */
const measure = (page) =>
  page.evaluate(() => {
    const box = document.querySelector('.dsx-mkt')
    const search = document.querySelector('.dsx-search')
    const rect = box.getBoundingClientRect()
    return {
      h: Math.round(rect.height),
      searchTop: search === null ? null : Math.round(search.getBoundingClientRect().top - rect.top),
      rows: document.querySelectorAll('.dsx-mcard, .dsx-gcard').length,
    }
  })

;(async () => {
  const r = report('market height')
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
    r.check(await openMarket(page, authority), '设置 → 组件 → 组件市场 opened')

    // 1) The official dialog stretches the section: the box is the flex remainder.
    const stretched = await measure(page)
    r.check(stretched.h > 300, 'a stretched host gives the market a real box', `h=${stretched.h}`)
    r.check(stretched.searchTop !== null && stretched.searchTop >= 0, 'the search field sits in that box', `top=${stretched.searchTop}`)
    r.check(stretched.rows > 3, 'the market rows are mounted', `rows=${stretched.rows}`)

    // 2) DS Bot's shell measures the section instead: drop the definite height the
    // dialog handed our page root and the whole chain becomes content-sized.
    await page.evaluate(() => {
      const title = document.querySelector('.dsx-page-title')
      const root = title === null ? null : title.parentElement
      if (root !== null) root.style.height = 'auto'
    })
    await wait(500)
    const measured = await measure(page)
    r.check(measured.h >= 300, 'a content-height host keeps the market box (was 0px)', `h=${measured.h}`)
    r.check(
      measured.searchTop !== null && measured.searchTop >= 0 && measured.searchTop < measured.h,
      'the search field stays inside the visible box',
      `top=${measured.searchTop}/${measured.h}`,
    )
    r.check(measured.rows > 3, 'the rows stay mounted in that host', `rows=${measured.rows}`)
    r.check(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | ') || 'none')
  } finally {
    await close()
  }
  process.exit(r.exitCode())
})()
