#!/usr/bin/env node
/**
 * G8 — the published-TYPES gate.
 *
 * `package.json` promises `types` for both entries and ships `lib/types/**\/*.d.ts`.
 * A promise like that is only worth making if a CONSUMER can actually resolve it, so
 * this gate builds a throwaway consumer package next to the real one:
 *
 *   .tmp-types-consumer/
 *     node_modules/dsh-widgets -> the repository root (a junction)
 *     consumer.ts             imports both entries
 *     tsconfig.json           skipLibCheck: FALSE, types: []
 *
 * Resolving through the junction means the REAL `exports` map is exercised (a wrong
 * `types` path fails here), and `skipLibCheck: false` means unresolved imports INSIDE
 * our own .d.ts files are errors rather than being skipped. The gate fails only on
 * diagnostics whose file lives under our `lib/types/` (dependency .d.ts noise is
 * reported, not fatal).
 *
 * Usage:
 *   node scripts/verify-published-types.mjs          # requires lib/types (build first)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
const SCRATCH = join(ROOT, '.tmp-types-consumer')

function die(msg) { console.error(`[published-types] ${msg}`); process.exit(1) }

if (!existsSync(join(ROOT, 'lib', 'types', 'index.d.ts'))) die('no lib/types/index.d.ts — run the build first')
if (!existsSync(join(ROOT, 'lib', 'types', 'client', 'index.d.ts'))) die('no lib/types/client/index.d.ts')

rmSync(SCRATCH, { recursive: true, force: true })
mkdirSync(join(SCRATCH, 'node_modules'), { recursive: true })
symlinkSync(ROOT, join(SCRATCH, 'node_modules', 'dsh-widgets'), 'junction')

writeFileSync(join(SCRATCH, 'consumer.ts'), [
  '/** A consumer importing BOTH advertised entry points, purely at the type level. */',
  "import { inject } from 'dsh-widgets'",
  "import { apply as clientApply } from 'dsh-widgets/client'",
  '',
  'export const services: readonly string[] = inject',
  'export const clientEntry: typeof clientApply = clientApply',
  '',
].join('\n'), 'utf8')

writeFileSync(join(SCRATCH, 'tsconfig.json'), `${JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    jsx: 'react-jsx',
    types: [],
  },
  include: ['consumer.ts'],
}, null, 2)}\n`, 'utf8')

const run = spawnSync(process.execPath, [TSC, '-p', join(SCRATCH, 'tsconfig.json')], { cwd: SCRATCH, encoding: 'utf8' })
const text = `${run.stdout ?? ''}${run.stderr ?? ''}`
const diagnostics = text.split('\n').filter((l) => /error TS\d+/.test(l))
const ours = diagnostics.filter((l) => /dsh-widgets[\\/]lib[\\/]types/.test(l))
const foreign = diagnostics.filter((l) => !ours.includes(l))

console.log(`[published-types] consumer compiled ${diagnostics.length} diagnostic(s): ${ours.length} in our declarations, ${foreign.length} elsewhere`)
for (const line of ours.slice(0, 10)) console.error(`  OUR  ${line.trim()}`)
for (const line of foreign.slice(0, 5)) console.log(`  dep  ${line.trim()}`)

rmSync(SCRATCH, { recursive: true, force: true })
if (ours.length > 0) {
  console.error('[published-types] FAIL — a consumer cannot use the published declarations')
  process.exit(1)
}
console.log('[published-types] PASS — both entries resolve through package.json `exports` with zero diagnostics in our .d.ts')
