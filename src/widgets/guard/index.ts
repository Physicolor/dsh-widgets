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
 * preset is no longer in the table.
 *
 * LAYOUT (owner's revision #2, 2026-09-29) — one word plus an identity mark:
 *   - top-left   : the blue 13px title (the only text left besides the value);
 *   - top-right  : the OFFICIAL permission shield (`headIcon`), the same glyph the
 *                  composer's selector draws beside each preset, so the rail tile
 *                  and the product's own control say the same thing in the same
 *                  drawing (paths copied into the renderer, never re-drawn);
 *   - bottom-left: the preset's display name, ON THE CARD'S FLOOR, at the figure
 *                  rung — 20px / weight 600, the same rung as every other card's
 *                  big number (`bodyAnchor: 'bottom'` + `value`).
 * The legend (「N 个可选档位」) and the 3-row breakdown are GONE, as are `headAfter`
 * and `sub` in the ordinary case: they were text the owner had to read.
 *
 * WHY THE NAME NOW RIDES `value` (revision #1 could not): `CardBody` used to drop
 * `value` for ANY head accessory, so with the shield present the 20px figure was
 * silently not drawn and the name had to fall back to `sub` (10px grey) — the
 * owner read that as "too small and too thin". The shared layer now suppresses
 * `value` for `headRing` ONLY (the ring head already prints its figure as
 * `headAfter.big`), so an icon-bearing head keeps the field. See §4 of README for
 * the before/after DOM measurements.
 *
 * WHY SOME LABELS STILL FALL BACK TO `sub` (and why that is not the defect above):
 * the figure rung is 20px and the card's text column is 124px wide, so a label
 * that does not fit would be cut to `…` (`.dsx-stats-card-value` is nowrap +
 * ellipsis). `render` is a pure function and cannot measure a string, so the
 * decision rides a table of widths MEASURED in the real card (LABEL_PX_AT_FIGURE):
 * a label we have measured to fit takes the 20px rung, everything else — the
 * English `Workspace Write` (149.8px, the one shipped label that does NOT fit) and
 * every host-supplied name we have never seen — takes the 10px `sub` rung. The
 * requirement is 「绝不允许出现 `…` 截断」; a smaller true label beats a truncated
 * big one, and an unmeasured name can never be *proved* to fit.
 *
 * `name` vs `value`: the projection carries both a machine key
 * (`danger-full-access`) and a display name. The card prints the NAME because
 * that is the word the user saw in the permission selector; a raw key reads as a
 * config file. When the key is NOT in the option table the card prints the key
 * through the same display transform the official row uses (`my-custom-preset` →
 * `My Custom Preset`) — it is still a true statement about the session, and a `—`
 * there would hide a real value.
 *
 * TONE DIRECTION — the widget's own call, assigned by the owner (2026-09-29):
 * 「完全权限是红色呼吸警示效果，工作区修改蓝色，仅查看绿色」. The three shipped
 * presets therefore wear the product's own semantic rungs — `danger` (全体机器权限,
 * 且不询问), `business` (工作区内的日常档), `success` (只读 = 安全) — on BOTH the
 * name and its shield, so the colour survives the English `sub` fallback and the
 * mark and the word never disagree. Full access additionally breathes
 * (`valuePulse`), which is the one state the owner asked to be impossible to miss.
 * Anything else — a key the table does not hold, the derived `custom`, `plan`, a
 * host-renamed preset — takes NO colour at all: an unknown family has no level to
 * state, and inventing one is how a card starts lying (see README §5).
 */

/**
 * MEASURED (2026-09-29, `.tmp-gallery/index.html`, Chromium 153, deviceScaleFactor
 * 2): the width of the card's text column at the default 150px side. It is what
 * every body text node of a 2×2 tile gets — the card is 150px wide with a 13px
 * inset per side (measured: the name's box starts at x=37 in a card at x=24 and is
 * 124px wide). It is NOT 126: the card's own 0.5px hairline frame is inside that
 * box. The value is the BUDGET the label table is checked against.
 */
const LABEL_COLUMN_PX = 124

/**
 * MEASURED label widths (px) at the figure rung — 20px, weight 600, the real card
 * font stack (`--dsw-font-family`), measured with the same `nowrap`/`inline-block`
 * box `.dsx-stats-card-value` uses (Chromium 153, deviceScaleFactor 2, the offline
 * gallery, 2026-09-29).
 *
 * Both locales are listed because the label is localized and the rung is chosen on
 * the LOCALIZED string. `Workspace Write` is kept in the table on purpose: it is
 * the one shipped label that does NOT fit (149.8 > 124), and it documents why the
 * fallback branch exists at all — dropping the entry would hide the reason.
 *
 * A label missing from this table can never be printed at 20px (see `fitsAsFigure`):
 * a host may compose a preset named anything, and a name we have never measured is
 * not a name we may risk ellipsizing.
 */
const LABEL_PX_AT_FIGURE: Record<string, number> = {
  '完全权限': 80,
  '工作区内修改': 120,
  '仅可查看': 80,
  'Full access': 91.7,
  'Read Only': 91.7,
  'Workspace Write': 149.8,
}

/** True when `label` has been MEASURED to fit the column at the 20px figure rung.
 *  Unknown labels are never eligible — see the header comment. */
function fitsAsFigure(label: string): boolean {
  const measured = LABEL_PX_AT_FIGURE[label]
  return measured !== undefined && measured <= LABEL_COLUMN_PX
}

/**
 * The two vocabularies this card has to speak, because the contract exposes two:
 * the FIGURE's `valueTone` (`danger`/`warn`/`success`/`business`/`muted` — the
 * product's state aliases) and the head MARK's tone (`BarDatum['tone']`, the CHART
 * palette: `primary`/`success`/`warn`/`danger`/`muted`/`accent`). They name the
 * same tokens under different words — `business` and `primary` are BOTH
 * `--dsw-alias-state-business-primary`, the brand blue — which is exactly why the
 * two are spelled out separately instead of one being cast into the other.
 */
type ValueTone = NonNullable<WidgetRenderOut['valueTone']>
type HeadTone = NonNullable<NonNullable<WidgetRenderOut['headIcon']>['tone']>

/**
 * The colour and the breathing flag of each preset the PRODUCT ships, keyed by the
 * machine value (`PermissionInfo.currentValue`), assigned by the owner
 * (2026-09-29, quoted in the header). EXACT match, no substring heuristics:
 * revision #1 painted anything containing `danger`/`full`/`yolo`/`bypass` red,
 * which this round's rule 「表里没有的键不染色」 retires — the price is the blind
 * spot in README §5 (a deployment that renames a dangerous preset gets no colour),
 * and the gain is that a key like `full-auto-review` can no longer claim a level
 * nobody assigned it.
 *
 * `pulse` is set for full access ONLY: the owner asked for a breathing warning
 * there, and a card that breathes in every state stops being read.
 */
const PRESET_TONES: Record<string, { figure: ValueTone; mark: HeadTone; pulse?: boolean }> = {
  'read-only': { figure: 'success', mark: 'success' },
  'workspace-write': { figure: 'business', mark: 'primary' },
  'danger-full-access': { figure: 'danger', mark: 'danger', pulse: true },
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
 * permission row's `PRESET_LABEL_KEYS` (`@deepseek-ai/dsh-client-ui-permission-presets`
 * — the exact strings are `仅可查看` / `工作区内修改` / `完全权限` and `Read Only` /
 * `Workspace Write` / `Full access`, read out of that package's `lib/client.js`).
 *
 * This exists because of something the live rail showed (2026-09-29): the
 * projection's `options[].name` is the preset KEY on this deployment, so the card
 * printed `danger-full-access` where the product's own settings row says
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
  // cannot be switched through on demand (dangerous preset → read-only → the
  // middle rung → a key the option table no longer holds), so every branch of this
  // render is reviewable by eye. The rail never passes `sim`.
  const simValue = typeof meta?.sim?.currentValue === 'string' ? meta.sim.currentValue : null
  const currentValue = simValue ?? p.currentValue
  const current = options.find((o) => o.value === currentValue) ?? null
  // The display name when the key is in the table, else the raw key (see the
  // header comment): both are true, `—` is not. `presetLabel` upgrades a raw kebab
  // key to the product's own word (measured need, see PRESET_LABEL_KEYS).
  const name = current !== null ? presetLabel(currentValue, current.name) : presetLabel(currentValue, currentValue)
  const mark = PRESET_TONES[currentValue]
  const icon = PRESET_ICONS[currentValue]
  // The rung is decided by the MEASURED width of the label that will actually be
  // printed (LABEL_PX_AT_FIGURE): the 20px figure when it fits, else the 10px
  // `sub`. Both sit in the same body slot, so the layout does not move — only the
  // type size does, which is the honest way to keep an overlong localized label
  // off the ellipsis.
  const figureRung = fitsAsFigure(name)
  return {
    title: t('card.guard.title'),
    // The name sits on the card's FLOOR (measured: 13px from the left edge, 13px
    // from the bottom). With no `headAfter` the renderer bottoms the body anyway;
    // the field is kept because it is the declared posture, and it keeps the name
    // on the floor if a future edit ever puts a row back in the head.
    bodyAnchor: 'bottom',
    ...(figureRung
      ? {
          // The 20px figure rung: same size and weight as every other card's big
          // number (`.dsx-stats-card-value` is the class that carries both).
          value: name,
          ...(mark === undefined
            ? {}
            : {
                valueTone: mark.figure,
                // Full access breathes (owner's ask). The colour stays the widget's
                // `valueTone`: the shared rule no longer hard-codes red, so the
                // animation is only the breathing.
                ...(mark.pulse === true ? { valuePulse: true } : {}),
              }),
        }
      : { sub: name }),
    // The shield is the SAME statement as the name, in the same colour: it is the
    // family's identity mark, and colouring both means the escalation still reads
    // when the label had to drop to the small rung (English `Workspace Write`).
    // The two tables happen to hold the same three keys (no shield ⇔ no tone), so
    // a shield that does carry a colour always agrees with the word beside it.
    ...(icon === undefined ? {} : { headIcon: { name: icon, ...(mark === undefined ? {} : { tone: mark.mark }) } }),
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
  // the two edges: full access (red, breathing, red shield) → read-only (green) →
  // workspace-write (blue, and the widest label in both locales: the English one
  // exercises the small-rung fallback) → a key the table does not hold (no shield,
  // no colour, raw-key fallback). `sim` MUST be the first step — the stepper finds
  // the current one by deep equality.
  //
  // The option table is MOCK data: the real one is composed by the deployment (the
  // shipped core table is `workspace-write` + `danger-full-access`). The four keys
  // here are the design set plus `plan`, so the preview exercises the three
  // shields and the no-glyph path rather than one happy path.
  //
  // The mock `name`s are the KEYS, not words — that is the shape this deployment's
  // projection actually hands over (measured 2026-09-29: `options[].name` is the
  // preset key), and it is what makes the card locale-correct: `presetLabel` sees
  // name === value, calls `t()`, and the preview therefore shows 完全权限 in zh and
  // "Full access" in en. A mock that hard-coded the Chinese words would pin the
  // preview to one locale and hide the English fallback branch entirely (it did,
  // until this was measured).
  example: {
    stats: {
      permissions: {
        currentValue: 'danger-full-access',
        options: [
          {
            value: 'read-only',
            name: 'read-only',
            description: '只能读取文件，任何写入或命令执行都要先批准。',
          },
          {
            value: 'plan',
            name: 'plan',
            description: '只出方案不落地：写入与命令一律先问过你再执行。',
          },
          {
            value: 'workspace-write',
            name: 'workspace-write',
            description: '可以在工作区内写入与执行命令，越出工作区的重试需要批准。',
          },
          {
            value: 'danger-full-access',
            name: 'danger-full-access',
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
