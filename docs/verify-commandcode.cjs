/**
 * Command Code 组件批次 — 重启后自证脚本 (docs/verify-commandcode.cjs)
 *
 * 用法（dsh web 重启后）: node docs/verify-commandcode.cjs
 *
 * 检查项:
 *  1. host 产物 lib/index.js 包含 /api/commandcode-usage 聚合路由与四个
 *     official Command Code account endpoints 常量;
 *  2. client 产物 lib/client.js 包含命令码组件家族 (cc-whoami / cc-usage /
 *     cc-credits / cc-windows / cc-subscription) 与 commandCode 数据键;
 *  3. 通过本机 DSH web (默认 3080) 实测 /api/commandcode-usage —— 真实账户
 *     四个 endpoint 的聚合载荷, 校验关键字段完整性;
 *  4. 输出 JSON 结果文件 `docs/verify-commandcode-result.json` 供留证。
 *
 * 约定: 本脚本只读/探测, 不修改任何文件 (结果文件除外)。
 */

const { readFileSync, writeFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

const ROOT = join(__dirname, '..')
const BASE = process.env.DSH_WEB_URL || 'http://127.0.0.1:3080'
const OUT = join(__dirname, 'verify-commandcode-result.json')

const RESULTS = []
function check(name, ok, detail) {
  RESULTS.push({ name, ok: !!ok, detail: detail ?? '' })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  —  ' + detail : ''}`)
}

function main() {
  // 1) host bundle 静态检查
  const host = readFileSync(join(ROOT, 'lib', 'index.js'), 'utf8')
  check(
    'host: /api/commandcode-usage route registered',
    host.includes('/api/commandcode-usage'),
    host.includes('/api/commandcode-usage') ? 'route present in lib/index.js' : 'route missing',
  )
  const eps = ['whoami', 'usage/summary', 'billing/credits', 'billing/subscriptions']
  check('host: COMMANDCODE_BASE constant', host.includes('api.commandcode.ai/alpha'))
  for (const ep of eps) {
    const ok = host.includes(ep)
    check(`host: endpoint ${ep}`, ok, ok ? 'present' : 'missing')
  }
  check('host: COMMANDCODE_API_KEY credential ref', host.includes('COMMANDCODE_API_KEY'))

  // 2) client bundle 静态检查
  const client = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
  const ccWidgets = ['cc-whoami', 'cc-usage', 'cc-credits', 'cc-windows', 'cc-subscription']
  for (const id of ccWidgets) {
    const ok = client.includes(id)
    check(`client: widget unit ${id}`, ok, ok ? 'bundled' : 'missing')
  }
  check('client: commandCode stats key', client.includes('commandCode'))

  // 3) 本机 DSH web 实测聚合路由（失败仅提示，不 fail 静态检查）
  const https = BASE.startsWith('https')
  const lib = https ? require('node:https') : require('node:http')
  const req = lib.get(BASE + '/api/commandcode-usage', { timeout: 10000 }, (res) => {
    let body = ''
    res.on('data', (c) => (body += c))
    res.on('end', () => {
      if (res.statusCode === 404) {
        check('live: /api/commandcode-usage', false, '404 — dsh web 未重启，新 host 路由尚未加载（重启后重跑本脚本即可通过 live 项）')
        writeOut()
        return
      }
      if (res.statusCode === 503) {
        check('live: /api/commandcode-usage', false, '503 — COMMANDCODE_API_KEY 未配置（host 未重启或凭据缺失）')
        writeOut()
        return
      }
      let payload = null
      try { payload = JSON.parse(body) } catch { /* keep null */ }
      const ok = payload !== null && typeof payload === 'object'
      check('live: /api/commandcode-usage HTTP', res.statusCode === 200, `status ${res.statusCode}`)
      if (ok) {
        check('live: whoami slice', payload.whoami && payload.whoami.user, JSON.stringify(payload.whoami?.user ?? null).slice(0, 120))
        check('live: usage slice', payload.usage && typeof payload.usage.totalCount === 'number', `totalCount=${payload.usage?.totalCount}`)
        check('live: credits slice', payload.credits && payload.credits.credits, `monthlyCredits=${payload.credits?.credits?.monthlyCredits}`)
        check('live: subscription slice', payload.subscription && payload.subscription.data, `planId=${payload.subscription?.data?.planId}`)
      } else {
        check('live: payload JSON', false, body.slice(0, 200))
      }
      writeOut()
    })
  })
  req.on('error', (e) => {
    check('live: /api/commandcode-usage', false, `请求失败: ${e.message}（请确认 dsh web 已重启并运行于 ${BASE}）`)
    writeOut()
  })
  req.on('timeout', () => { req.destroy(new Error('timeout')) })
}

function writeOut() {
  const result = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    results: RESULTS,
    allPass: RESULTS.every((r) => r.ok),
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2))
  console.log(`\n写留证: ${OUT}  —  allPass=${result.allPass}`)
  if (existsSync(join(ROOT, 'docs', 'verify-commandcode-result.json'))) {
    // 已通过 — 退出码 0；存在失败则 1
  }
  process.exit(result.allPass ? 0 : 1)
}

main()