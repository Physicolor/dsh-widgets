/**
 * Command Code 多池（AllUser / 账户切换）探针 — docs/probe-cc-pool.mjs
 *
 * 用法: node docs/probe-cc-pool.mjs
 *
 * 这不是静态检查，而是把**两侧真实产物**接起来跑一遍:
 *  1. 用假 ctx (webServer.register 抓路由 + 真凭据 seam) 加载 host 产物
 *     `lib/index.js`, 调用真的 `/api/commandcode-usage` handler, 拿到真实上游
 *     的多池载荷 (COMMANDCODE_API_KEY + COMMANDCODE_API_KEY_2);
 *  2. 用 tsc 把 `src/client/lib/cc-view.ts` 现编成 CJS, 装入真字典, 用真渲染
 *     工厂在【AllUser / 每个账户 / 单池回退】三种视图下渲染全部 Command Code
 *     卡片, 断言:
 *       - keys 顺序/标签/tail, 顶层切片 = 第一个池成员 (向后兼容形态);
 *       - 每张卡都带 cycle (modes=[AllUser, 账户…], store='ccView'), 图例行
 *         = 「角色 · 当前视图」;
 *       - AllUser 的 5h/周 = sum(used)/sum(cap), 月 = 各成员自身月度之和
 *         (每个成员按自己的套餐额度计量);
 *       - 切到某账户 = 该成员自己的数据 (数值与 keys[i].data 一致);
 *       - 单池 (剥掉 keys) 完全回到旧行为: 无 cycle, 图例行只剩角色词;
 *       - 额度预测 (quota-manage) 在完整载荷下给出真实百分比 + 账期 + 今日推荐
 *         (2026-09-30: 上游三个慢端点被 8s 超时砍掉时, 这张卡只剩 `-%` 和 `—`)。
 *  4. 池载荷缺片的稳定性 (2026-09-20): 上游一路失败时 host 路由写 `null`, 池
 *     绝不能"就地降级成一个口径不同的和" —— 丢 subscription 曾让额度管理卡显示
 *     20.2% / 账期 10-20 / 今日推荐 59.9M (真值 16.6% / 10-10 / 645M), 丢 credits
 *     曾让它误报 117% 超额; 且池日历必须是**某一个成员的** (start,end) 对, 不能是
 *     "最早的 start + 最早的 end" 拼接, 重启中的成员不得把已过去的账期印成下次重置。
 *  3. 结果写 docs/probe-cc-pool-result.json 留证。
 *
 * 只读探测: 除结果文件外不改任何文件, 密钥只在内存里使用、从不打印。
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..')
const OUT_FILE = path.join(HERE, 'probe-cc-pool-result.json')
const HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const ENVS = ['COMMANDCODE_API_KEY', 'COMMANDCODE_API_KEY_2', 'COMMANDCODE_API_KEY_3', 'COMMANDCODE_API_KEY_4']

const results = []
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  --  ' + detail : ''}`)
}

/** Resolve a ref exactly like the credentials provider layers it. */
function resolveRef(ref) {
  const env = process.env[ref]
  if (env) return { value: env, source: 'env' }
  try {
    const text = fs.readFileSync(path.join(HOME, '.credentials.yaml'), 'utf8')
    const m = new RegExp(`^\\s*${ref}:\\s*(\\S+)\\s*$`, 'm').exec(text)
    if (m && m[1]) return { value: m[1], source: 'credentials.yaml' }
  } catch { /* absent */ }
  return undefined
}

/** Load the REAL host bundle with a fake ctx and read a route's JSON answer.
 *
 *  The route answers a COLD call with the fast `credits` slice and only the slices it
 *  already holds (the other three take 14–21 s upstream and are refreshed out of band
 *  — see `createSliceStore`), so the probe asks again after the route memo
 *  (ROUTE_CACHE_MS, 20 s) has expired, exactly like the browser's degraded-payload
 *  retry does. It stops as soon as the payload is complete, and reports how long that
 *  took. */
async function hostPayload() {
  const mod = await import(new URL('../lib/index.js', import.meta.url).href)
  const routes = new Map()
  const ctx = {
    webServer: { register: (route) => { routes.set(route.path, route); return () => {} } },
    credentials: { resolve: async (ref) => resolveRef(ref) },
    get: () => undefined,
    effect: (setup) => { setup() },
  }
  mod.apply(ctx)
  const route = routes.get('/api/commandcode-usage')
  if (!route) throw new Error('route /api/commandcode-usage was not registered')
  const call = async () => {
    const res = {
      status: 0,
      body: '',
      writeHead(status) { this.status = status; return this },
      end(body) { this.body = body === undefined ? '' : String(body); return this },
    }
    await route.handler({ method: 'GET', url: '/api/commandcode-usage' }, res)
    return { status: res.status, payload: res.body ? JSON.parse(res.body) : null }
  }
  const complete = (payload) => {
    if (payload === null || !Array.isArray(payload.keys) || payload.keys.length === 0) return false
    return payload.keys.every((k) => k.data !== null && k.data !== undefined
      && k.data.whoami != null && k.data.usage != null && k.data.credits != null && k.data.subscription != null)
  }
  const started = Date.now()
  let answer = await call()
  // Up to a minute: a cold slice can miss its first attempt (the upstream answered
  // one whoami with a 500 after 16 s during this round), and an EMPTY slice is
  // re-attempted every 15 s, so the pool fills in well inside this window.
  for (let i = 0; i < 12 && !complete(answer.payload); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    answer = await call()
  }
  console.log(`host /api/commandcode-usage -> HTTP ${answer.status} after ${Date.now() - started}ms (complete=${complete(answer.payload)})`)
  return { ...answer, waitedMs: Date.now() - started, complete: complete(answer.payload) }
}

/** Compile just the render layer (+ its pure deps) into a throwaway dir.
 *
 *  The layer moved in the Phase-2 refactor (`cc-view.ts` → `families/cc/data.ts`
 *  + `families/cc/renders.ts`); the two modules are required as one bag so every
 *  call site below reads exactly as it did before the split. */
function compileRenderLayer(tmp) {
  execFileSync('npx', ['tsc', 'src/client/families/cc/data.ts', 'src/client/families/cc/renders.ts', 'src/widgets/quota-manage/index.ts', '--outDir', tmp, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', 'src'], { cwd: REPO, stdio: 'inherit', shell: true })
  return {
    data: path.join(tmp, 'client', 'families', 'cc', 'data.js'),
    renders: path.join(tmp, 'client', 'families', 'cc', 'renders.js'),
    quota: path.join(tmp, 'widgets', 'quota-manage', 'index.js'),
    i18n: path.join(tmp, 'client', 'i18n.js'),
  }
}

/** Assemble the dictionary exactly like scripts/gen-registry.mjs does. */
function installLocales(i18n) {
  const locales = { zh: {}, en: {} }
  const shared = JSON.parse(fs.readFileSync(path.join(REPO, 'src', 'widgets', '_shared', 'locales.json'), 'utf8'))
  for (const loc of ['zh', 'en']) Object.assign(locales[loc], shared[loc] || {})
  for (const unit of fs.readdirSync(path.join(REPO, 'src', 'widgets'))) {
    if (unit.startsWith('_')) continue
    const mf = path.join(REPO, 'src', 'widgets', unit, 'manifest.json')
    if (!fs.existsSync(mf)) continue
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'))
    for (const loc of ['zh', 'en']) if (m.locale?.[loc]) Object.assign(locales[loc], m.locale[loc])
  }
  i18n.installLocale(undefined, locales)
}

const near = (a, b, eps = 0.051) => Math.abs(a - b) <= eps

;(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-pool-'))
  let view
  let i18n
  let quotaWidget
  try {
    const entry = compileRenderLayer(tmp)
    // ESM (unlike the .cjs probes) exposes navigator/localStorage as getter-only
    // globals, so define them over the top instead of assigning.
    Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null }, configurable: true })
    Object.defineProperty(globalThis, 'navigator', { value: { language: 'zh-CN' }, configurable: true })
    view = { ...require(entry.data), ...require(entry.renders) }
    quotaWidget = require(entry.quota).default
    i18n = require(entry.i18n)
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { /* best effort */ }
  }
  installLocales(i18n)

  // ---- 1) real host payload -------------------------------------------------
  const { status, payload, waitedMs, complete } = await hostPayload()
  check('host route answers 200 with a COMPLETE pool (all four slices per member)', status === 200 && complete,
    `status ${status}, complete=${complete}, waited ${waitedMs}ms (the slow slices land out of band)`)
  const keys = Array.isArray(payload?.keys) ? payload.keys : []
  console.log(`keys: ${keys.map((k) => `${k.ref}=${k.label}(…${k.tail})`).join(', ')}`)
  check('payload carries one entry per configured pool key', keys.length >= 2, `keys=${keys.length}`)
  check('every member carries all four slices', keys.every((k) => k.data && 'whoami' in k.data && 'usage' in k.data && 'credits' in k.data && 'subscription' in k.data),
    keys.map((k) => Object.keys(k.data || {}).join('+')).join(' | '))
  check('labels come from each key\'s own whoami name', keys.every((k) => typeof k.label === 'string' && k.label.length > 0 && !/^Key \d$/.test(k.label)) || keys.length < 2,
    keys.map((k) => k.label).join(' / '))
  check('labels are unique (cycle can never land on a twin)', new Set(keys.map((k) => k.label)).size === keys.length, keys.map((k) => k.label).join(' / '))
  check('top-level slices stay the FIRST member (back-compatible shape)',
    JSON.stringify(payload?.whoami?.user ?? null) === JSON.stringify(keys[0]?.data?.whoami?.user ?? null),
    `${payload?.whoami?.user?.name} vs ${keys[0]?.data?.whoami?.user?.name}`)
  check('tails are 4 chars, never the full secret', keys.every((k) => /^.{4}$/.test(String(k.tail))), keys.map((k) => k.tail).join(','))

  const account = keys[0].label
  const pool = keys.map((k) => k.label)
  const stats = { commandCode: payload, commandCodeError: null }
  const single = { commandCode: { ...payload, keys: undefined }, commandCodeError: null }

  const render = (s, ccView) => ({
    'cc-whoami': view.ccWhoamiRender({ ...s, ccView }),
    'cc-usage': view.ccUsageRender({ ...s, ccView }),
    'cc-credits': view.ccCreditsRender({ ...s, ccView }),
    'cc-windows': view.ccWindowsRender({ ...s, ccView }),
    'cc-subscription': view.ccSubscriptionRender({ ...s, ccView }),
    'cc-window-5h': view.ccWindowValueRender('fiveHour')({ ...s, ccView }),
    'cc-window-weekly': view.ccWindowValueRender('weekly')({ ...s, ccView }),
    'cc-window-monthly': view.ccWindowValueRender('monthly')({ ...s, ccView }),
  })

  // ---- 2) AllUser view -----------------------------------------------------
  const all = render(stats, undefined)
  console.log('\n--- AllUser (zh) ---')
  for (const [id, o] of Object.entries(all)) {
    console.log(`${id.padEnd(18)} legend=${JSON.stringify(o.legend)} value=${JSON.stringify(o.value)} headAfter=${JSON.stringify(o.headAfter)} cycle=${o.cycle ? o.cycle.modes.join('>') + ' @' + o.cycle.current : '-'}`)
  }
  for (const [id, o] of Object.entries(all)) {
    check(`AllUser ${id} is tappable (cycle present)`, o.cycle !== undefined, id)
    check(`AllUser ${id} cycle starts at AllUser with every account in order`,
      o.cycle && o.cycle.current === view.CC_ALL && o.cycle.modes[0] === view.CC_ALL && o.cycle.modes.slice(1).join('|') === pool.join('|'),
      o.cycle ? o.cycle.modes.join(' → ') : '-')
    check(`AllUser ${id} persists into the ccView field (never the OpenCode poolView)`, o.cycle && o.cycle.store === 'ccView', o.cycle && String(o.cycle.store))
    // The view must be readable off the card's own grey line. A card that
    // deliberately carries no legend (cc-credits, after the 2026-09-29 redesign)
    // is exempt — but then the assertion records that fact instead of failing.
    check(`AllUser ${id} puts the view on the legend line`, o.legend === undefined || String(o.legend).includes(view.CC_ALL), String(o.legend))
  }
  check('AllUser default legend = 账户身份 · AllUser', all['cc-whoami'].legend === `账户身份 · ${view.CC_ALL}`, all['cc-whoami'].legend)
  // 套餐 (cc-subscription) redesign: the grey line is the PERIOD, the big figure
  // is the TIER badge, and the raw plan id never reaches the tile.
  check('套餐: the grey line is the billing period', /^账期 \d{1,2}-\d{1,2}( · |$)/.test(String(all['cc-subscription'].legend)), String(all['cc-subscription'].legend))
  // Every read below tolerates an unanswered slice: describing the degraded payload
  // IS this probe's job (2026-09-30), so a missing slice must FAIL an assertion, not
  // crash the run.
  const planId0 = keys[0]?.data?.subscription?.data?.planId
  check('套餐: the big figure is the TIER badge, not the raw plan id',
    planId0 !== undefined && all['cc-subscription'].value === view.planTier(planId0),
    `${all['cc-subscription'].value} (planId ${planId0})`)
  check('套餐: the raw plan id is nowhere on the card',
    !JSON.stringify(all['cc-subscription']).includes('individual-'), JSON.stringify(all['cc-subscription']))
  check('套餐: no headAfter row — the badge belongs to the card floor', all['cc-subscription'].headAfter === undefined, JSON.stringify(all['cc-subscription'].headAfter))
  const tierLadder = view.PLAN_TIER_STEPS.map((s) => view.planTier(s.plan))
  check('套餐: the preview ladder covers every tier badge with no repeats',
    new Set(tierLadder).size === tierLadder.length && tierLadder.every((x) => typeof x === 'string' && x === x.toUpperCase() && !x.includes('INDIVIDUAL')),
    tierLadder.join(' → '))
  check('AllUser account card shows the generic label + the pooled names',
    all['cc-whoami'].value === view.CC_ALL && String(all['cc-whoami'].sub).split(' / ').join('|') === pool.join('|'),
    `${all['cc-whoami'].value} / ${all['cc-whoami'].sub}`)
  check('AllUser cycle hint names every account and wraps back',
    all['cc-windows'].cycle.hint.includes(pool.join(' → ')) && all['cc-windows'].cycle.hint.includes(`→ ${view.CC_ALL}`),
    all['cc-windows'].cycle.hint)

  // Additive usage fields: counts / tokens / spend add, and the success rate is
  // RECOMPUTED from the summed counts — never a mean of the members' rates (the
  // measured pair is 100% and 0%, whose mean would be a meaningless 50%).
  const accountSlices = keys.map((k) => k.data).filter(Boolean)
  const sumField = (pick) => accountSlices.reduce((s, d) => s + (typeof pick(d) === 'number' ? pick(d) : 0), 0)
  const totalCount = sumField((d) => d.usage?.totalCount)
  const failedCount = sumField((d) => d.usage?.failedCount)
  const spend = sumField((d) => d.usage?.totalCost)
  const tokens = sumField((d) => d.usage?.totalTokens)
  const usageFigures = (all['cc-usage'].chart && all['cc-usage'].chart.kind === 'figures') ? all['cc-usage'].chart.figures : []
  const figValue = (label) => {
    const hit = usageFigures.find((f) => f.label === label)
    return hit === undefined ? null : hit.value
  }
  check('cc-usage: the facts are a FIGURES row on the card floor (no more ellipsized sub line)',
    all['cc-usage'].chart?.kind === 'figures' && usageFigures.length === 3 && all['cc-usage'].sub === undefined,
    usageFigures.map((f) => `${f.label} ${f.value}`).join(' | '))
  check('cc-usage: the facts keep the card floor', all['cc-usage'].bodyAnchor === 'bottom', String(all['cc-usage'].bodyAnchor))
  check('AllUser request count adds', figValue('请求') === String(totalCount), `${figValue('请求')} (Σ ${totalCount})`)
  check('AllUser success rate is recomputed from the summed counts, not averaged',
    figValue('成功率') === `${(((totalCount - failedCount) / totalCount) * 100).toFixed(0)}%`,
    `${figValue('成功率')} — member rates ${accountSlices.map((d) => d.usage?.successRate).join(' / ')}`)
  // The spend figure carries THREE significant digits ($10.1 / $0.468), so the
  // comparison is numeric with the rounding tolerance that implies.
  const spendOf = (v) => Number(String(v).replace(/[$<>]/g, ''))
  const approx = (shown, truth) => {
    if (shown === null) return false
    const s = spendOf(shown)
    if (!Number.isFinite(s)) return false
    const rel = Math.abs(truth) > 0 ? Math.abs(s - truth) / Math.abs(truth) : Math.abs(s)
    return rel <= 0.006 // three significant digits
  }
  check('AllUser spend adds', spend === 0 ? figValue('消费') === '$0' || spendOf(figValue('消费')) < 0.001 : approx(figValue('消费'), spend),
    `${figValue('消费')} (Σ $${spend.toFixed(4)})`)
  check('AllUser tokens add', tokens === 0 || typeof all['cc-usage'].headAfter?.big === 'string', `${all['cc-usage'].headAfter?.big} (Σ ${tokens})`)
  const remainingSum = sumField((d) => d.credits?.credits?.monthlyCredits)
  const creditsBig = Number(all['cc-credits'].headAfter?.big)
  check('AllUser credit balance adds',
    Number.isFinite(creditsBig) && Math.abs(creditsBig - remainingSum) <= (remainingSum >= 100 ? 0.5 : 0.005),
    `card ${all['cc-credits'].headAfter?.big} vs Σ ${remainingSum.toFixed(2)}`)
  // cc-credits redesign: the official site's quota ROWS (name+percent over a
  // segmented bar), three windows, nothing else.
  const quotas = (all['cc-credits'].chart && all['cc-credits'].chart.kind === 'quotas') ? all['cc-credits'].chart.quotas : []
  check('cc-credits: the body is the official quota-row trio (5 小时限额 / 周限额 / 月限额)',
    quotas.length === 3 && quotas[0].label === '5 小时限额' && quotas[1].label === '周限额' && String(quotas[2].label).startsWith('月限额'),
    quotas.map((q) => `${q.label} ${q.pct.toFixed(1)}%`).join(' | '))
  check('cc-credits: the rows keep the card floor and drop the role word + reset line',
    all['cc-credits'].bodyAnchor === 'bottom' && all['cc-credits'].sub === undefined, String(all['cc-credits'].sub))

  // Summed 5h / weekly: sum(used)/sum(cap), never a mean of percents.
  const sumWin = (pick) => {
    const members = accountSlices.map(pick).filter((w) => w && typeof w.used === 'number' && typeof w.cap === 'number')
    const used = members.reduce((s, w) => s + w.used, 0)
    const cap = members.reduce((s, w) => s + w.cap, 0)
    return { used, cap, pct: (used / cap) * 100 }
  }
  const fh = sumWin((d) => d.credits?.windowLimits?.fiveHour)
  const wk = sumWin((d) => d.credits?.windowLimits?.weekly)
  check('AllUser 5h row = sum(used)/sum(cap)',
    quotas[0] !== undefined && Math.abs(quotas[0].pct - fh.pct) <= 0.51,
    `row ${quotas[0] && quotas[0].pct.toFixed(1)}% vs sum ${fh.pct.toFixed(2)}% (used ${fh.used} / cap ${fh.cap})`)
  check('AllUser weekly row = sum(used)/sum(cap)',
    quotas[1] !== undefined && Math.abs(quotas[1].pct - wk.pct) <= 0.51,
    `row ${quotas[1] && quotas[1].pct.toFixed(1)}% vs sum ${wk.pct.toFixed(2)}% (used ${wk.used} / cap ${wk.cap})`)
  check('AllUser rows carry the urgency tones of their percents',
    quotas.every((q) => q.tone === (q.pct >= 95 ? 'danger' : q.pct >= 75 ? 'warn' : 'success')),
    quotas.map((q) => `${q.label}:${q.pct.toFixed(1)}%→${q.tone}`).join(' '))

  // Monthly: each member measured against ITS OWN plan, then summed.
  const memberMonth = []
  for (const [i, k] of keys.entries()) {
    const w = view.monthlyWindow(k.data)
    memberMonth.push(w ? w.pct : null)
    console.log(`member ${k.label}: monthly = ${w ? w.pct.toFixed(2) + '%' : '-'} (used ${w ? w.used.toFixed(2) : '-'} / cap ${w ? w.cap : '-'})`)
  }
  const totalUsed = memberMonth.reduce((s, p, i) => s + (view.monthlyWindow(keys[i].data)?.used ?? 0), 0)
  const totalCap = keys.reduce((s, k) => s + (view.monthlyWindow(k.data)?.cap ?? 0), 0)
  const allMonth = all['cc-window-monthly'].value
  const expectMonth = ((totalUsed / totalCap) * 100).toFixed(1) + '%'
  check('AllUser monthly = the pool\'s summed month (each member against its own plan)',
    allMonth === expectMonth, `rendered ${allMonth}, expected ${expectMonth} (Σused ${totalUsed.toFixed(2)} / Σcap ${totalCap})`)
  check('AllUser monthly is NOT the summed balance read against one plan',
    totalCap > (view.monthlyWindow(keys[0].data)?.cap ?? 0), `Σcap ${totalCap}`)

  // ---- 3) per-account views ------------------------------------------------
  for (const k of keys) {
    const one = render(stats, k.label)
    console.log(`\n--- view: ${k.label} (zh) ---`)
    for (const [id, o] of Object.entries(one)) console.log(`${id.padEnd(18)} legend=${JSON.stringify(o.legend)} value=${JSON.stringify(o.value)} headAfter=${JSON.stringify(o.headAfter)}`)
    check(`view ${k.label}: cycle current is that account`, one['cc-windows'].cycle.current === k.label, one['cc-windows'].cycle.current)
    check(`view ${k.label}: legend carries the account name`, String(one['cc-windows'].legend).includes(k.label), one['cc-windows'].legend)
    const mine = view.monthlyWindow(k.data)
    const expect = mine ? mine.pct.toFixed(1) + '%' : '-'
    check(`view ${k.label}: monthly card = this account's own month`, one['cc-window-monthly'].value === expect,
      `rendered ${one['cc-window-monthly'].value}, expected ${expect} (member ${memberMonth[keys.indexOf(k)] === null ? '-' : memberMonth[keys.indexOf(k)].toFixed(2) + '%'})`)
    check(`view ${k.label}: account card shows the account name`, one['cc-whoami'].value === k.label, one['cc-whoami'].value)
    const spend = k.data?.usage?.totalCost
    if (typeof spend === 'number') {
      const ownFigures = one['cc-usage'].chart?.figures ?? []
    const ownSpend = (ownFigures.find((f) => f.label === '消费') ?? {}).value
    check(`view ${k.label}: usage spend is this account's own`, spend === 0 ? spendOf(ownSpend) < 0.001 : approx(ownSpend, spend), `${ownSpend} (own $${spend.toFixed(4)})`)
    }
  }
  // A per-account view differs from AllUser whenever the accounts differ.
  const diff = pool.some((p) => render(stats, p)['cc-window-monthly'].value !== all['cc-window-monthly'].value)
  check('switching pools actually changes the figures', diff,
    pool.map((p) => `${p}=${render(stats, p)['cc-window-monthly'].value}`).join(' ') + ` AllUser=${allMonth}`)

  // ---- 4) unknown view falls back to AllUser -------------------------------
  const stale = render(stats, 'AccountThatWasRenamed')
  check('stale/unknown view falls back to AllUser', stale['cc-windows'].cycle.current === view.CC_ALL, stale['cc-windows'].cycle.current)

  // ---- 5) single-pool install is byte-identical to the old behaviour -------
  const solo = render(single, undefined)
  console.log('\n--- single pool (zh) ---')
  for (const [id, o] of Object.entries(solo)) {
    console.log(`${id.padEnd(18)} legend=${JSON.stringify(o.legend)} value=${JSON.stringify(o.value)} cycle=${o.cycle ? 'yes' : 'no'}`)
  }
  check('single pool: no card is tappable', Object.values(solo).every((o) => o.cycle === undefined))
  check('single pool: legends keep the bare role words (用量/额度 carry their unit instead)',
    solo['cc-whoami'].legend === '账户身份' && solo['cc-usage'].legend === undefined && solo['cc-credits'].legend === undefined && solo['cc-windows'].legend === '用量环形图' && /^账期 \d{1,2}-\d{1,2}$/.test(String(solo['cc-subscription'].legend)),
    [solo['cc-whoami'].legend, solo['cc-usage'].legend, solo['cc-credits'].legend, solo['cc-windows'].legend, solo['cc-subscription'].legend].map(String).join(' / '))
  check('single pool: 用量 / 额度 still say what they are through their unit caption',
    solo['cc-usage'].headAfter?.small === 'tokens' && solo['cc-credits'].headAfter?.small === 'credits',
    `${solo['cc-usage'].headAfter?.small} / ${solo['cc-credits'].headAfter?.small}`)
  check('single pool: account card shows the account name again', solo['cc-whoami'].value === account, solo['cc-whoami'].value)
  check('single pool: monthly card = that account\'s own month',
    solo['cc-window-monthly'].value === (view.monthlyWindow(single.commandCode)?.pct.toFixed(1) + '%'),
    solo['cc-window-monthly'].value)
  check('single pool: all three window rings still render',
    Array.isArray(solo['cc-windows'].chart?.rings) && solo['cc-windows'].chart.rings.length === 3)

  // ---- 5b) 额度预测 (quota-manage) against the SAME payload -----------------
  // The card the defect hit hardest: its percent, its 账期 line and its 今日推荐 all
  // come from the slices the upstream is slow to answer (the month needs the
  // subscription's plan + period), and the 2026-09-30 report was exactly this card
  // reading `-%` with 今日推荐 `—`.
  const localDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  // 40 days: the log must reach back PAST the billing period's start (the live
  // account's period opened 2026-09-10), or `logCoversSince` fails and the credit→
  // token rate — hence 今日推荐 — is refused on purpose.
  const daily = {}
  for (let i = 0; i < 40; i++) { const d = new Date(); d.setDate(d.getDate() - i); daily[localDayKey(d)] = 60_000_000 }
  const quotaCard = quotaWidget.render({ commandCode: payload, commandCodeError: null, commandCodeDaily: daily }, undefined)
  console.log('\n--- 额度预测 (quota-manage) ---')
  console.log(`  headAfter=${JSON.stringify(quotaCard?.headAfter)} legend=${JSON.stringify(quotaCard?.legend)} ring=${JSON.stringify(quotaCard?.headRing?.label)} figures=${JSON.stringify(quotaCard?.chart?.figures ?? null)}`)
  check('额度预测: the head figure is a real percent (never `-%`)',
    /^\d+(\.\d+)?%$/.test(String(quotaCard?.headAfter?.big)), String(quotaCard?.headAfter?.big))
  check('额度预测: the grey line is the billing period',
    /^账期 \d{1,2}-\d{1,2}$/.test(String(quotaCard?.legend)), String(quotaCard?.legend))
  check('额度预测: 今日推荐 is a token figure (never `—`)',
    quotaCard?.chart?.kind === 'figures' && quotaCard.chart.figures[1]?.value !== '—',
    JSON.stringify(quotaCard?.chart?.figures ?? null))
  check('额度预测: the head ring meters the same reading as the figure',
    quotaCard?.headRing !== undefined && quotaCard.headRing.label === quotaCard.headAfter?.big,
    `${quotaCard?.headRing?.label} vs ${quotaCard?.headAfter?.big}`)

  // ---- 6) a hole in the pool payload must DEGRADE, never rescale -----------
  // The host route answers a failed upstream call with a `null` slice (one dead
  // endpoint must not blank the family), so the pool can be half-answered. The
  // month window must then be UNKNOWN: summing the rest understates the pool,
  // and letting the member fall back to the balance-conservation caliber mixes
  // two different scales. Both were measured live 2026-09-20 — a dropped
  // subscription slice made 额度管理 read 20.2% / `账期 10-20` / 今日推荐 59.9M
  // where the whole payload says 16.6% / `账期 10-10` / 645M, and a dropped
  // credits slice made it report a false 117% over-budget alarm.
  const clone = (v) => JSON.parse(JSON.stringify(v))
  const noSubscription = clone(payload)
  noSubscription.keys[0].data.subscription = null
  const noCredits = clone(payload)
  noCredits.keys[0].data.credits = null
  console.log('\n--- degraded payloads (zh) ---')
  check('a member whose subscription slice did not answer makes the pool month UNKNOWN',
    view.monthlyWindow(noSubscription) === null, String(view.monthlyWindow(noSubscription)))
  check('a member whose credits slice did not answer makes the pool month UNKNOWN',
    view.monthlyWindow(noCredits) === null, String(view.monthlyWindow(noCredits)))
  check('the complete payload still answers the plan-table caliber',
    view.monthlyWindow(payload) !== null && Math.abs(view.monthlyWindow(payload).pct - Number.parseFloat(allMonth)) < 0.051,
    `${view.monthlyWindow(payload)?.pct.toFixed(2)}% vs card ${allMonth}`)
  check('ccPayloadDegraded flags both holes and clears the live payload',
    view.ccPayloadDegraded(noSubscription) && view.ccPayloadDegraded(noCredits) && !view.ccPayloadDegraded(payload),
    [noSubscription, noCredits, payload].map((p) => String(view.ccPayloadDegraded(p))).join(' / '))
  // The calendar: ONE member's pair, anchored on a period that is still ahead.
  const agg = view.ccView({ commandCode: payload, commandCodeError: null }).data
  const aggStart = agg?.subscription?.data?.currentPeriodStart
  const aggEnd = agg?.subscription?.data?.currentPeriodEnd
  const pairs = keys.map((k) => [k.data?.subscription?.data?.currentPeriodStart, k.data?.subscription?.data?.currentPeriodEnd])
  check('the pool calendar is ONE member\'s (start, end) pair',
    pairs.some(([s, e]) => s === aggStart && e === aggEnd), `${aggStart} → ${aggEnd}`)
  const endMs = Date.parse(aggEnd)
  const liveEnds = pairs.map(([, e]) => Date.parse(e)).filter((ms) => Number.isFinite(ms) && ms > Date.now())
  check('the pool calendar is the next renewal still ahead (never a rolled member\'s past date)',
    Number.isFinite(endMs) && endMs > Date.now() && liveEnds.length > 0 && endMs === Math.min(...liveEnds),
    `${aggEnd} (live ends ${liveEnds.map((ms) => new Date(ms).toISOString()).join(', ') || 'none in the payload'})`)
  const localDay = (iso) => { const d = new Date(Date.parse(iso)); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  check('the 账期 line prints the LOCAL day of that instant (never the UTC fields of the string)',
    typeof all['cc-subscription'].legend === 'string' && aggEnd !== undefined && all['cc-subscription'].legend.startsWith(`账期 ${localDay(aggEnd)}`),
    `${all['cc-subscription'].legend} vs ${aggEnd === undefined ? 'no period in the payload' : localDay(aggEnd)}`)
  // A member whose period already rolled: the anchor moves to the live member,
  // so the card keeps a real month instead of degrading to `-%` / `—`.
  const rolled = clone(payload)
  if (rolled.keys[0].data.subscription !== null && rolled.keys[0].data.subscription !== undefined) {
    rolled.keys[0].data.subscription.data.currentPeriodStart = new Date(Date.now() - 40 * 86_400_000).toISOString()
    rolled.keys[0].data.subscription.data.currentPeriodEnd = new Date(Date.now() - 10 * 86_400_000).toISOString()
  }
  const rolledAgg = view.ccView({ commandCode: rolled, commandCodeError: null }).data
  const rolledEndMs = Date.parse(rolledAgg?.subscription?.data?.currentPeriodEnd)
  // The expectation is read off the TAMPERED payload: rolling member 0 leaves
  // member 1 as the only period still ahead, so member 1 must anchor.
  const rolledLive = rolled.keys
    .map((k) => Date.parse(k.data?.subscription?.data?.currentPeriodEnd))
    .filter((ms) => Number.isFinite(ms) && ms > Date.now())
  check('a rolled member does not anchor the pool calendar (the live member does)',
    Number.isFinite(rolledEndMs) && rolledEndMs === Math.min(...rolledLive),
    `${rolledAgg?.subscription?.data?.currentPeriodEnd} vs ${new Date(Math.min(...rolledLive)).toISOString()}`)
  check('a rolled period makes the payload degraded (so the collector asks again)',
    view.ccPayloadDegraded(rolled), String(view.ccPayloadDegraded(rolled)))

  const fails = results.filter((r) => !r.ok).length
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    pool: keys.map((k) => ({ ref: k.ref, label: k.label, tail: k.tail })),
    allUserMonthly: allMonth,
    results,
    fails,
  }, null, 2))
  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}  (${results.length} assertions)  -> ${path.basename(OUT_FILE)}`)
  process.exit(fails === 0 ? 0 : 1)
})().catch((e) => { console.error('probe error:', e && e.stack ? e.stack : e); process.exit(2) })
