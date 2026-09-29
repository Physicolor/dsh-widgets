import { defineWidget } from '../../client/lib/contract/helpers'
import type { HeadIconName, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'
import { t } from '../../client/i18n'

/**
 * 权限档位 (guard) — what this session is ALLOWED to do, as one folded value.
 *
 * WHY IT STILL EXISTS although the composer already has a permission selector:
 * the selector is only on screen while the user is looking at the composer of
 * THIS session, and it disappears the moment the rail is what they are watching —
 * which is exactly the situation this card is for (a long autonomous run, several
 * sessions, the rail as the dashboard). The selector is an INPUT (it changes the
 * value and needs a click); this card is the READ-OUT (what is in force right
 * now, in the rail, next to the cost of the run it authorises). It also survives
 * the one case the selector cannot show at all: an old session whose recorded
 * preset is no longer in the table (the derived `custom` fold).
 *
 * LAYOUT (WORKER-BRIEF-V3 §1.2, the owner's revision 2026-09-29): the card was
 * three lines of text and is now ONE word plus an identity mark —
 *   - top-left  : the blue 13px title (the only word left besides the value);
 *   - top-right : the OFFICIAL permission shield (`headIcon`), the same glyph the
 *                 composer's selector draws beside each preset, so the rail tile
 *                 and the product's own control say the same thing in the same
 *                 drawing (16px paths copied into the renderer, never re-drawn);
 *   - bottom-left: the preset's display name, on the card's floor.
 * The legend (「N 个可选档位」) and the whole 3-row breakdown are GONE: they were
 * text the owner had to read, and the count is not a session fact anyone acts on.
 *
 * WHY THE NAME RIDES `sub` AND NOT `value` (measured, see README §4): `CardBody`
 * draws `value` only when the head has NO accessory (`!accessoryHead`), so the
 * 20px figure the brief nominates is silently dropped the moment the shield is
 * present — the first shot of this revision showed a title and a shield and no
 * name at all. `sub` is the one body text that renders in BOTH states, and at
 * 10px it is also the only size that holds every official label: "Workspace
 * Write" measures 163px and "My Custom Preset" 175px against the tile's 124px
 * content width, while everything fits under 87px at 10px.
 *
 * `name` vs `value`: the projection carries both a machine key
 * (`danger-full-access`) and a display name. The card prints the NAME because
 * that is the word the user saw in the permission selector; a raw key reads as a
 * config file. When the key is NOT in the option table (the projection derived
 * `custom`, or the deployment's table changed under a running session) the card
 * prints the key through the same display transform the official row uses
 * (`my-custom-preset` → `My Custom Preset`) — it is still a true statement about
 * the session, and a `—` there would hide a real value.
 *
 * TONE DIRECTION — the widget's own call, and the only card in this batch that
 * colours by danger. The rule is 「权限越大越需要被看见」: a preset whose machine
 * value names a whole-machine / no-questions family paints ITS OWN SHIELD red.
 * The vocabulary is deliberately NOT green-for-safe: the render contract has no
 * "safe" colour, so a safe preset keeps the neutral label colour, which is
 * exactly what "nothing to escalate" should look like (see DANGER_MARKERS).
 * `valuePulse` is NOT used: a card that blinks forever stops being read.
 */

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
 * of safe markers would be a list no branch reads. Three blind spots are accepted
 * and documented in README §5: the derived `custom` fold hides which knobs it
 * holds, a deployment may rename a dangerous preset to anything it likes, and a
 * renamed preset loses its official glyph (the product's own rule).
 */
const DANGER_MARKERS: readonly string[] = ['danger', 'full', 'yolo', 'bypass']

/** True when a preset's machine value names a whole-machine / no-questions
 *  family (see DANGER_MARKERS). Pure string work, no table lookup. */
function isDangerPreset(value: string): boolean {
  const v = value.toLowerCase()
  return DANGER_MARKERS.some((marker) => v.includes(marker))
}

/**
 * The OFFICIAL glyph table, mirrored key for key from the composer's permission
 * selector (`permissionGlyphs` in `@deepseek-ai/dsh-client-ui-conversation`).
 *
 * Three entries and no fallback, because that is literally what the product
 * does: its own comment reads "Glyph for a permission option value;
 * host-configured names outside the design set get none". The shipped table is
 * `workspace-write`, `danger-full-access` (+ the derived, unselectable `custom`),
 * and `read-only` is the third design-set shield. A deployment that renames a
 * preset therefore gets a card with NO shield rather than a shield that claims
 * the wrong family — the glyph is an identity, and the wrong identity is worse
 * than none (README §3).
 */
const PRESET_ICONS: Record<string, HeadIconName> = {
  'read-only': 'permission-read-only',
  'workspace-write': 'permission-workspace-write',
  'danger-full-access': 'permission-full-access',
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

function guardRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const p = stats.permissions
  // No permission service composed → the projection key is absent and there is no
  // session fact to print. An EMPTY `currentValue` is the same statement (a preset
  // table that produced a keyless fold): returning null beats an empty figure.
  // The card is a new, optional unit, so "hide when the deployment has no
  // permission service" is the posture the owner asked for (BRIEF-V3 §1.2).
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
  const icon = PRESET_ICONS[currentValue]
  return {
    title: t('card.guard.title'),
    // The name rides `sub`, NOT `value` — measured, 2026-09-29 (see README §4):
    // `CardBody` drops `value` for ANY head accessory (`!accessoryHead`), so with
    // the shield present the 20px body figure is not drawn at all (the first shot
    // of this revision was a title and a shield with no name). `sub` is the one
    // body text that renders in BOTH states, so the icon-less state (a
    // host-renamed preset) keeps the same layout as the icon states instead of
    // jumping to a 20px figure. It is also the only shape that holds every label:
    // the DOM measures 124px of content width, while "Workspace Write" needs 163px
    // and "My Custom Preset" 175px at 20px; at 10px the widest is 87px.
    sub: name,
    // The name sits on the card's FLOOR (measured: 13px from the left edge, 13px
    // from the bottom). With no `headAfter` the renderer bottoms the body anyway;
    // the field is kept because it is the declared posture, and it keeps the name
    // on the floor if a future edit ever puts a row back in the head.
    bodyAnchor: 'bottom',
    // The DANGER escalation rides the SHIELD, because it is the only colourable
    // element this layout keeps: the renderer has no tone channel for `sub`, and
    // `valueTone` on an undrawn `value` is dead. Full access turning its own
    // shield red is a statement about the level, not a decoration.
    ...(icon === undefined ? {} : { headIcon: { name: icon, ...(dangerous ? { tone: 'danger' as const } : {}) } }),
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
  // are what this is for. The four steps walk the ladder the product ships plus
  // the two edges: full access (red shield) → read-only (check shield) →
  // workspace-write (the middle rung AND the widest label in both locales) → a key
  // the table does not hold (no shield, raw-key fallback). `sim` MUST be the first
  // step — the stepper finds the current one by deep equality.
  //
  // The option table is MOCK data: the real one is composed by the deployment (the
  // shipped core table is `workspace-write` + `danger-full-access`). The four keys
  // here are the design set plus `plan`, so the preview exercises the three
  // shields and the no-glyph path rather than one happy path.
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
      { currentValue: 'workspace-write' },
      { currentValue: 'sandbox-off' },
    ],
  },
})
