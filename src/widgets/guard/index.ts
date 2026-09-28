import { defineWidget } from '../../client/lib/contract/helpers'
import type { BarDatum, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 权限档位 (guard) — what this session is ALLOWED to do, as one folded value.
 *
 * WHY IT EXISTS: a long-running autonomous agent's most important safety fact is
 * invisible in the rail. The 44 shipped cards all answer "how much was spent";
 * none answers "may it write outside the workspace, and will it ask first". The
 * official shell folds THREE knobs (preset + sandbox mode + approval policy) into
 * the one `permissions` projection, and this card prints that fold verbatim —
 * it deliberately does NOT re-derive a sandbox mode or an approval policy from
 * the preset key, because the fold IS the authority and a second derivation is a
 * second answer that can disagree with the one the runtime enforces.
 *
 * HEAD LADDER (WORKER-BRIEF §2): the blue 13px title, the 20px figure = the
 * current preset's DISPLAY NAME (`headAfter.big` — never `value`, which the
 * renderer pushes into the body a second time), the grey caption = how many
 * switchable options exist (`legend`), and the three detail rows on the card's
 * floor (`bodyAnchor: 'bottom'`). No `headRing`: a ring is the design language
 * for a SHARE, and this head's figure is a NAME, not a fraction of anything.
 *
 * `name` vs `value`: the projection carries both a machine key (`danger-full-access`)
 * and a display name. The card prints the NAME because that is what the user saw
 * in the permission selector; the key would read as a config file. When the key is
 * NOT in the option table (the projection derived `custom`, or the deployment's
 * table changed under a running session) the card prints the raw key: it is still
 * a true statement about the session, and a `—` there would hide a real value.
 *
 * TONE DIRECTION — the widget's own call, and the only card in this batch that
 * colours by danger. The rule is 「权限越大越需要被看见」: a preset whose machine
 * value names a whole-machine / no-questions family paints the figure red. The
 * vocabulary is deliberately NOT green-for-safe: the render contract's
 * `valueTone` is a single-member union ('danger' = the escalation red), so a
 * "safe" preset has no colour to take — it keeps the default label colour, which
 * is exactly what "nothing to escalate" should look like (see DANGER_MARKERS).
 * `valuePulse` is NOT used: a card that blinks forever stops being read.
 */

/** The em dash a row shows while it has no reading — the same placeholder
 *  工具调用 / 任务 use, never a fabricated value. */
const DASH = '—'

/**
 * HEURISTIC, NOT AUTHORITY. Substrings of the machine preset key that mark a
 * family able to act on the whole machine without asking first:
 *   - `danger`/`full` — the shipped `danger-full-access` preset (sandbox: full
 *     access, approval: never);
 *   - `yolo`/`bypass` — the customary names other harnesses use for the same
 *     bundle, and the names a custom deployment is most likely to compose.
 * Case-insensitive, matched against `currentValue` ONLY (never the display
 * name: names are localized and a translated word must not decide a colour).
 *
 * The counterpart families — `read-only`, `plan`, `safe` — deliberately have NO
 * constant here: they take no colour, and the default IS "no colour", so a table
 * of safe markers would be a list no branch reads. Two blind spots are accepted
 * and documented in README §5: the derived `custom` fold hides which knobs it
 * holds, and a deployment may rename a dangerous preset to anything it likes.
 */
const DANGER_MARKERS: readonly string[] = ['danger', 'full', 'yolo', 'bypass']

/** True when a preset's machine value names a whole-machine / no-questions
 *  family (see DANGER_MARKERS). Pure string work, no table lookup. */
function isDangerPreset(value: string): boolean {
  const v = value.toLowerCase()
  return DANGER_MARKERS.some((marker) => v.includes(marker))
}

/**
 * The product's own labels for the presets it SHIPS, mirrored from the official
 * permission row's `PRESET_LABEL_KEYS` (`@deepseek-ai/dsh-client-ui-permission-presets`).
 *
 * This exists because of something the live rail showed (2026-09-29): the
 * projection's `options[].name` is the preset KEY on this deployment, so the card
 * printed `danger-full-access` in 20px where the product's own settings row says
 * 「完全权限」/ "Full access". Re-drawing the product's words is not inventing a
 * display name — it is matching the one the user sees two clicks away.
 */
const PRESET_LABEL_KEYS: Record<string, string> = {
  'read-only': 'card.guard.preset.readOnly',
  'workspace-write': 'card.guard.preset.workspaceWrite',
  'danger-full-access': 'card.guard.preset.fullAccess',
}
/** The English defaults those labels replace — the official row treats a name
 *  equal to them as "still the raw key" (see `presetLabel`). */
const PRESET_DEFAULT_LABELS: Record<string, string> = {
  'card.guard.preset.readOnly': 'Read Only',
  'card.guard.preset.workspaceWrite': 'Workspace Write',
  'card.guard.preset.fullAccess': 'Full access',
}

/** Kebab → Title Case, the same fallback the official row uses for a preset the
 *  product does not ship (`my-custom-preset` → `My Custom Preset`). A name that is
 *  not a kebab key is returned untouched, so a human-typed label survives. */
function titleCasePreset(name: string): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return name
  return name.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/** The label to print for a preset: the product's word when the key is one of
 *  its own, else the table's name (or its title-cased key). */
function presetLabel(value: string, name: string): string {
  const key = PRESET_LABEL_KEYS[value]
  if (key !== undefined && (name === value || name === PRESET_DEFAULT_LABELS[key])) return t(key)
  return titleCasePreset(name)
}

/** The 2×2 card's inner content width at the base side: 150 − 2 × 12px pad
 *  (`cardInnerPad`). This unit declares `['2x2']` only, and a magnified card
 *  scales its font and its width together, so one base-side number is enough. */
const CONTENT_WIDTH_PX = 126

/** The breakdown grid's own `columnGap` (`render/charts/breakdown.tsx`). */
const BREAKDOWN_GAP_PX = 8

/** The breakdown row font size at the base side (10px, scaled by the renderer). */
const BREAKDOWN_FONT_PX = 10

/** Slack kept so a slightly wider fallback face still leaves the label whole. */
const CLIP_SLACK_PX = 6

/** Rough advance width of one glyph, in px at `fontPx`.
 *
 *  The card stores TEXT, not pixels, and the offline renderer has no font
 *  metrics, so the clip has to estimate. A CJK / fullwidth glyph takes one full
 *  em; Latin, digits and punctuation about 0.55. Deliberately generous: cutting a
 *  glyph early is invisible, cutting late makes the breakdown's shared value
 *  column steal the label's width (the label is the cell that fades). */
function textWidthPx(text: string, fontPx: number): number {
  let em = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    em += isWideGlyph(cp) ? 1 : 0.55
  }
  return em * fontPx
}

/** CJK, Hangul, kana and the fullwidth forms — the ranges that occupy a full em
 *  (the same ranges a terminal calls "wide"). */
function isWideGlyph(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x115f)
    || (cp >= 0x2e80 && cp <= 0xa4cf)
    || (cp >= 0xac00 && cp <= 0xd7a3)
    || (cp >= 0xf900 && cp <= 0xfaff)
    || (cp >= 0xfe30 && cp <= 0xfe6f)
    || (cp >= 0xff00 && cp <= 0xff60)
    || (cp >= 0xffe0 && cp <= 0xffe6)
}

/** Punctuation a truncated sentence may end on: the ellipsis replaces what
 *  follows, and stopping at a clause boundary keeps the visible half a sentence
 *  instead of a severed word. */
const CLAUSE_ENDS = '。！？；，、,.!?;: '

/** Where the value column may end, given the row labels of ONE breakdown block.
 *
 *  `breakdown` is a single grid (`1fr auto`), so the value column is shared by
 *  every row and sized by the WIDEST value — here always the clipped sentence on
 *  the 说明 row. The label column gets whatever is left, and it is the label that
 *  fades when the value asks for too much (the breakdown gives the label cell
 *  `overflow: hidden` + a right-edge mask). So the budget is measured against the
 *  widest label, not against the label of the row being clipped. */
function clipBudgetPx(labels: readonly string[]): number {
  let widest = 0
  for (const label of labels) widest = Math.max(widest, textWidthPx(label, BREAKDOWN_FONT_PX))
  return CONTENT_WIDTH_PX - widest - BREAKDOWN_GAP_PX - CLIP_SLACK_PX
}

/**
 * Clip the current preset's one-sentence description to the 说明 row.
 *
 * The sentence is the LONGEST text on the card and the row has one line, so it is
 * cut here rather than left to the renderer: the value cell is `nowrap` with no
 * overflow handling, so an unclipped sentence does not ellipsize — it pushes the
 * grid and clips the LABEL instead (see clipBudgetPx).
 *
 * Policy (README §4): keep the FIRST clause, then `…`. A clause boundary inside
 * the budget is used only when it preserves at least half of it (otherwise the
 * row would show a two-word stub); the ellipsis itself is charged to the budget.
 */
function clipSentence(text: string, maxPx: number): string {
  const s = text.trim().replace(/\s+/g, ' ')
  if (s === '') return ''
  if (textWidthPx(s, BREAKDOWN_FONT_PX) <= maxPx) return s
  // One em is reserved for the ellipsis, and a hard cut needs at least one glyph.
  const budget = Math.max(BREAKDOWN_FONT_PX, maxPx - BREAKDOWN_FONT_PX)
  let cut = 0
  let width = 0
  for (const ch of s) {
    const w = textWidthPx(ch, BREAKDOWN_FONT_PX)
    if (width + w > budget) break
    width += w
    cut += ch.length
  }
  const head = s.slice(0, cut)
  const boundary = lastClauseEnd(head)
  const kept = boundary >= Math.floor(head.length / 2)
    ? head.slice(0, boundary + 1).replace(/[，,、;；:：\s]+$/, '')
    : head.trimEnd()
  return `${kept}…`
}

/** Index of the last clause boundary in `head`, or -1 when it has none. */
function lastClauseEnd(head: string): number {
  for (let i = head.length - 1; i >= 0; i -= 1) {
    if (CLAUSE_ENDS.includes(head[i])) return i
  }
  return -1
}

/** One detail row of the breakdown block. */
interface Row {
  label: string
  value: string
  tone?: BarDatum['tone']
}

function guardRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const p = stats.permissions
  // No permission service composed → the projection key is absent and there is no
  // session fact to print. An EMPTY `currentValue` is the same statement (a preset
  // table that produced a keyless fold): returning null beats an empty figure.
  if (p === null || p === undefined || p.currentValue === '') return null
  const options = Array.isArray(p.options) ? p.options : []
  // PREVIEW-ONLY OVERRIDE: `example.simSteps` walks the states a live session
  // cannot be switched through on demand (dangerous preset → read-only → a key the
  // option table no longer holds), so every branch of this render is reviewable by
  // eye. The rail never passes `sim`.
  const simValue = typeof meta?.sim?.currentValue === 'string' ? meta.sim.currentValue : null
  const currentValue = simValue ?? p.currentValue
  const current = options.find((o) => o.value === currentValue) ?? null
  // The display name when the key is in the table, else the raw key (see the
  // header comment): both are true, `—` is not. `presetLabel` upgrades a raw kebab
  // key to the product's own word (measured need, see PRESET_LABEL_KEYS).
  const name = current !== null ? presetLabel(currentValue, current.name) : presetLabel(currentValue, currentValue)
  const dangerous = isDangerPreset(currentValue)
  const count = options.length
  const labelNow = t('card.guard.current')
  const labelAllows = t('card.guard.allows')
  const description = current?.description
  const rows: Row[] = [
    // The 当前 row repeats the figure's NAME as a row, and it is the second place
    // the danger is painted: the card's grey caption has no tone channel in the
    // render contract (the `legend` is always `label-tertiary`), so the escalation
    // has to ride the only other cell this card owns — see README §5. Same value as
    // the figure, painted the same red: a deliberate echo, not a second reading.
    { label: labelNow, value: name, ...(dangerous ? { tone: 'danger' as const } : {}) },
    // The spec's middle row (可选 → `N 个`) was removed at integration (2026-09-29):
    // it printed the same count as the caption above it. One reading, one place.
    description !== undefined && description.trim() !== ''
      ? { label: labelAllows, value: clipSentence(description, clipBudgetPx([labelNow, labelAllows])) }
      // A preset the deployment never described prints the dash rather than a
      // blank cell, so a described preset and an undescribed one are told apart.
      : { label: labelAllows, value: DASH, tone: 'muted' as const },
  ]
  return {
    title: t('card.guard.title'),
    headAfter: { big: name },
    legend: t('card.guard.legend', { n: count }),
    bodyAnchor: 'bottom',
    ...(dangerous ? { valueTone: 'danger' as const } : {}),
    chart: { kind: 'breakdown' as const, breakdown: rows },
  }
}

export default defineWidget({
  id: 'guard',
  name: () => t('widget.guard.name'),
  desc: () => t('widget.guard.desc'),
  builtin: true,
  group: 'system',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  render: guardRender,
  simToggle: () => t('widget.guard.simToggle'),
  // Widget-owned preview data. The projection is a synchronous read, so a live
  // session overrides this the moment it exists — the market / 组件配置 previews
  // are what this is for. The three steps cover: a dangerous preset (red figure +
  // red 当前 row), a read-only one (no colour), and a key the table does not hold
  // (the raw-value fallback + the muted 说明 dash). `sim` MUST be the first step —
  // the stepper finds the current one by deep equality.
  //
  // The derived `custom` fold cannot be stepped here: it is truthful only when the
  // option table also carries the appended `custom` entry, and `sim` overrides the
  // CURRENT VALUE only. It takes the same fallback path the third step shows (the
  // `custom` name is resolved from the table when the table has it, which is the
  // single line this card would need — see README §7).
  //
  // The option table is MOCK data: the real one is composed by the deployment (the
  // shipped core table has two entries). The four keys here come from the domain's
  // own vocabulary — the three sandbox modes plus `plan` — so the preview exercises
  // the marker families (danger / safe / unknown) rather than one happy path.
  example: {
    stats: {
      permissions: {
        currentValue: 'danger-full-access',
        options: [
          {
            value: 'read-only',
            name: '仅可查看',
            description: '只能读取文件，任何写入或命令执行都要先批准。',
          },
          {
            value: 'plan',
            name: '计划模式',
            description: '只出方案不落地：写入与命令一律先问过你再执行。',
          },
          {
            value: 'workspace-write',
            name: '工作区内修改',
            description: '可以在工作区内写入与执行命令，越出工作区的重试需要批准。',
          },
          {
            value: 'danger-full-access',
            name: '完全权限',
            description: '文件与命令均不询问，可直接写入工作区之外并执行任意命令。',
          },
        ],
      },
    },
    sim: { currentValue: 'danger-full-access' },
    simSteps: [
      { currentValue: 'danger-full-access' },
      { currentValue: 'read-only' },
      { currentValue: 'sandbox-off' },
    ],
  },
})
