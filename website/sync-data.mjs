/**
 * TEMP — regenerate website/js/data.js from the REAL widget manifests.
 * The showcase table had drifted (24 units, no Command Code family); this makes
 * it match src/widgets/* /manifest.json exactly. Deleted after use.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'D:/dsh-home/plugins/dsh-widgets'
const DIR = join(ROOT, 'src', 'widgets')
const OUT = join(ROOT, 'website', 'js', 'data.js')
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version

const GROUPS = {
  system: { en: 'System', zh: '系统' },
  commandcode: { en: 'Command Code', zh: 'Command Code' },
  'coding-plan': { en: 'Coding Plan Usage', zh: 'Coding Plan 用量' },
  'opencode-go': { en: 'OpenCode Go', zh: 'OpenCode Go' },
  pricing: { en: 'Peak Pricing', zh: '峰谷定价' },
  device: { en: 'Device', zh: '设备状态' },
  other: { en: 'Others', zh: '其它' },
}

const widgets = []
for (const id of readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name)) {
  const mf = join(DIR, id, 'manifest.json')
  if (!existsSync(mf)) continue
  const m = JSON.parse(readFileSync(mf, 'utf8'))
  const loc = (l, k) => (m.locale?.[l]?.[`widget.${id}.${k}`] ?? '')
  widgets.push({
    id,
    name: loc('en', 'name') || id,
    nameZh: loc('zh', 'name') || id,
    desc: loc('en', 'desc') || '',
    descZh: loc('zh', 'desc') || '',
    group: m.group ?? 'other',
    builtin: m.builtin !== false,
    defaultInstalled: m.defaultInstalled === true,
    sizes: Array.isArray(m.sizes) && m.sizes.length ? m.sizes : ['2x2'],
    order: typeof m.order === 'number' ? m.order : 1000,
  })
}
widgets.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1))

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const body = widgets.map((w) => `    {
      id: ${q(w.id)}, name: ${q(w.name)}, nameZh: ${q(w.nameZh)},
      desc: ${q(w.desc)},
      descZh: ${q(w.descZh)},
      group: ${q(w.group)}, builtin: ${w.builtin}, defaultInstalled: ${w.defaultInstalled}, sizes: [${w.sizes.map(q).join(', ')}], order: ${w.order}
    }`).join(',\n')

const text = `/**
 * dsh-widgets showcase — widget data.
 *
 * SOURCE OF TRUTH: this file mirrors the real project unit directories
 * \`src/widgets/<id>/manifest.json\` (${widgets.length} units, v${VERSION}). Every field
 * below comes from those manifests — nothing is invented. If the registry
 * changes, regenerate this table from the \`manifest.json\` files.
 */
window.DASH_WIDGETS = {
  version: ${q(VERSION)},
  npm: 'dsh-widgets',
  repo: 'https://github.com/Physicolor/dsh-widgets',
  issues: 'https://github.com/Physicolor/dsh-widgets/issues',
  releases: 'https://github.com/Physicolor/dsh-widgets/releases',
  installCmd: 'dsh plugin --profile web add dsh-widgets',
  compat: 'DeepSeek Harness 0.1.0-rc.6+',
  groups: {
${Object.entries(GROUPS).map(([k, v]) => `    ${q(k)}: { en: ${q(v.en)}, zh: ${q(v.zh)} }`).join(',\n')}
  },
  widgets: [
${body}
  ].sort((a, b) => a.order - b.order)
};

window.DASH_WIDGETS.byId = Object.fromEntries(
  window.DASH_WIDGETS.widgets.map((w) => [w.id, w])
);
`
writeFileSync(OUT, text, 'utf8')
console.log(`wrote ${OUT}: ${widgets.length} widgets, version ${VERSION}`)
console.log(widgets.map((w) => `${w.order} ${w.id} [${w.group}]`).join('\n'))
