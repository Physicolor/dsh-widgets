import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtAgo } from '../../client/lib/format'
import { repoShort } from '../../client/families/github/data'
import type { GitHubNotifications, WidgetRenderMeta, WidgetRenderOut, WidgetStats } from '../../client/lib/contract/types'

/**
 * 待我处理 / To Review — the GitHub family's only TO-DO reading: the unread
 * threads addressed to me (review request / @mention / assignment), plus the
 * newest one.
 *
 * WHY IT EXISTS: all five shipped GitHub cards describe REPOSITORY state
 * (contributions, stars, open issues, last push, repo pulse). None of them says
 * 「有人在等你」, which is the one GitHub fact that implies an ACTION rather than a
 * reading.
 *
 * THE HONESTY RULE THIS CARD IS BUILT AROUND: GitHub's `/notifications` answers
 * **401 when anonymous** (measured 2026-09-29 UTC) — it does NOT answer with an
 * empty list. So the host reports the slice as ABSENT (`notifications: null`)
 * whenever no credential (token / `gh` login) was available, and this render
 * returns `null` for it: the card does not exist rather than printing 「0 条待办」,
 * which would turn "I cannot see" into "nobody is waiting for you". A MEASURED
 * zero — a 200 with an empty queue — is a DIFFERENT fact and DOES render: `0` with
 * the 「暂无待处理」 caption. README §7 lists every branch.
 *
 * THE LADDER (the family's, unchanged): `headAfter.big` is the unread total (the
 * tile's one dominant figure), `legend` is the newest thread as `repo · reason`
 * — the total alone does not say where to start — and three detail rows sit on
 * the card's floor under the shared hairline divider.
 *
 * WHY THE ROWS ARE FIXED: review / mention / assign always render, zero
 * included. A row that vanishes at zero changes the card's height for no reason,
 * and the 150px tile fits the head plus exactly three rows. `ci_activity` and
 * `other` are deliberately NOT rows (a failing CI run is not something waiting on
 * a person); when they are the only unread items the total still prints and the
 * hover says how many sit outside the three rows.
 *
 * TONE DIRECTION — THE WIDGET'S CALL: nothing here is tinted. A queue is a fact,
 * not a failure, so neither the figure (`valueTone`) nor a row gets a colour. A
 * row prints `—` in the muted tone only when the payload did not report that
 * bucket AT ALL (not measured) — a different statement from a measured 0, and the
 * only case in which a row is not a number.
 *
 * PLATFORM IDENTITY (revision, owner's report 2026-09-30): read alone, 「待我处理」
 * said WHAT is waiting but not WHERE. That is a real ambiguity the moment a second
 * platform grows its own queue card (a GitLab / Gitea / Jira 「待我处理」 would be
 * indistinguishable in the rail), and the family's other five cards do not carry
 * the ambiguity because their titles name a repository fact («问题», «提交») while
 * this one names an inbox. So the card marks its source TWICE, deliberately:
 *   1. `headIcon: { name: 'github' }` — Octicons' `mark-github`, the same drawing
 *      the user sees on github.com, occupying the head's right slot. It is an
 *      IDENTITY, not a reading, which is exactly what `headIcon` is for (a ring
 *      there would claim a fraction nobody measured). No `tone`: the mark is not
 *      good or bad news, and a coloured brand mark is the "why is this yellow?"
 *      defect `headIcon` documents.
 *   2. the title / market name carry the platform as text, because an icon alone
 *      is unreadable to a screen reader and invisible in a text-only surface.
 * `HeadIconName` is a CLOSED shared vocabulary — a second platform's mark is added
 * by the main Agent to `render/icons.tsx` + the union, never drawn here. README §0
 * (audit question 3) and §10 (extension) hold that contract.
 *
 * HOVER: `cardHint` carries what must never be printed on a 150px tile — the
 * newest thread's full title, its full `owner/name`, how long ago it moved, and
 * `newest.url`. The card itself stays un-clickable (no `cycle`, no `corner`), so a
 * link is only ever shown, never followed from the rail.
 */

/** The em dash a bucket shows when the payload did not report it — the same
 *  placeholder 工具调用 / 额度管理 use, never a fabricated 0. */
const DASH = '—'

/**
 * The head's right-slot mark: GitHub's own Octicons glyph from the SHARED layer
 * (`src/client/render/icons.tsx` maps this name to the drawing). Declared as a
 * named constant, and passed on EVERY render including the preview's synthetic
 * states, so the card cannot forget it in one branch — an identity that shows up
 * only sometimes is worse than none.
 *
 * Typed by inference from the literal name: the union lives in the shared
 * contract and a name it does not hold is a type error here, not a silently
 * blank slot (`HEAD_RING_ICONS[name] ?? null` would render nothing).
 */
const HEAD_ICON = { name: 'github' } as const

/**
 * The three buckets that get a row, in card order, with their label thunks.
 *
 * FIXED by design (see the header): the thunks are resolved per render so the
 * card re-localizes on a language switch, but the LIST never changes — that is
 * what keeps the card's line count independent of the data.
 */
const ROWS: ReadonlyArray<{ bucket: string; label: () => string }> = [
  { bucket: 'review_requested', label: () => t('card.github-notify.review') },
  { bucket: 'mention', label: () => t('card.github-notify.mention') },
  { bucket: 'assign', label: () => t('card.github-notify.assign') },
]

/**
 * GitHub's notification reasons → the card's words.
 *
 * The WHOLE documented vocabulary is mapped, not just the three row buckets,
 * because `newest.reason` is one thread's RAW reason: a card that only knew the
 * three bucket names would print 「其它」 for a comment on your own PR, throwing
 * away a fact it holds. A reason GitHub adds later falls through to the raw
 * token, which is still the truth (see `reasonLabel`).
 */
const REASON_LABELS: Record<string, () => string> = {
  review_requested: () => t('card.github-notify.reason.review_requested'),
  mention: () => t('card.github-notify.reason.mention'),
  assign: () => t('card.github-notify.reason.assign'),
  ci_activity: () => t('card.github-notify.reason.ci_activity'),
  other: () => t('card.github-notify.reason.other'),
  comment: () => t('card.github-notify.reason.comment'),
  author: () => t('card.github-notify.reason.author'),
  state_change: () => t('card.github-notify.reason.state_change'),
  subscribed: () => t('card.github-notify.reason.subscribed'),
  team_mention: () => t('card.github-notify.reason.team_mention'),
  invitation: () => t('card.github-notify.reason.invitation'),
  security_alert: () => t('card.github-notify.reason.security_alert'),
  manual: () => t('card.github-notify.reason.manual'),
}

/** A bucket's count as a non-negative integer, or `null` when the payload did
 *  not report that bucket (a thin/legacy `byReason`) — which is NOT the same
 *  statement as a measured 0, and is the only reason a row prints `—`. */
function bucketCount(byReason: Record<string, number>, bucket: string): number | null {
  const raw = byReason[bucket]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return Math.max(0, Math.trunc(raw))
}

/** The locale word for a raw GitHub reason. An unknown reason prints as GitHub
 *  spelled it rather than being folded into a bucket it is not; an empty one
 *  falls back to 「其它」, which is exactly the bucket the host folds it into. */
function reasonLabel(reason: string): string {
  const known = REASON_LABELS[reason]
  if (known !== undefined) return known()
  return reason === '' ? t('card.github-notify.reason.other') : reason
}

/**
 * The hover text: what the tile cannot hold. It is a native `title` attribute, so
 * it costs zero pixels and can never disturb the 150px budget. A line is dropped
 * when the payload does not carry it — a thread with no HTML url stays link-less
 * instead of showing a link to nowhere (the host already refuses to build one).
 *
 * `fmtAgo` reads the clock (`Date.now()`); that is allowed for a render and is
 * the same call the 提交 card makes for `pushed_at`.
 */
function hoverHint(notif: GitHubNotifications, outside: number): string | undefined {
  const lines: string[] = []
  const newest = notif.newest
  if (newest !== null) {
    if (newest.title !== '') lines.push(newest.title)
    const where = [newest.repo, fmtAgo(newest.updatedAt)].filter((part) => part !== '' && part !== DASH).join(' · ')
    if (where !== '') lines.push(where)
    if (newest.url !== null && newest.url !== '') lines.push(newest.url)
  }
  if (outside > 0) lines.push(t('card.github-notify.outside', { n: outside }))
  return lines.length > 0 ? lines.join('\n') : undefined
}

/**
 * The preview's own states (`example.simSteps`) — the shapes a live rail cannot
 * be asked for on demand: 3 waiting / a MEASURED empty queue / only CI-other
 * unread / a THIN `byReason` (defensive: the shipped host always reports all five
 * buckets) / nobody signed in (the card does not exist).
 *
 * Only a PREVIEW passes `meta.sim` (the rail never does), so a payload built here
 * can never reach an installed tile. The return is deliberately TRI-STATE:
 *   `undefined` = not simulating — the render reads the real slice;
 *   `null`      = simulating ABSENT (no credential / failed call) — render → null;
 *   object      = the synthetic queue itself.
 * Collapsing `null` into `undefined` would make the card's most important branch
 * (never print 0 for "cannot see") unreviewable in a preview.
 *
 * The mock ages are relative to the clock at import time, never a pinned ISO
 * date: a pinned date silently becomes a FUTURE timestamp on a machine whose
 * clock is behind it and the hover then reads `0s` (measured).
 */
function simNotifications(state: string | null): GitHubNotifications | null | undefined {
  if (state === 'clear') {
    return { count: 0, capped: false, byReason: { review_requested: 0, mention: 0, assign: 0, ci_activity: 0, other: 0 }, newest: null }
  }
  if (state === 'capped') {
    // A FULL page: the figure must read `30+`, never a bare 30 (see the head).
    return {
      count: 30,
      capped: true,
      byReason: { review_requested: 21, mention: 6, assign: 3, ci_activity: 0, other: 0 },
      newest: {
        title: 'Review: the third batch',
        repo: 'Physicolor/dsh-widgets',
        reason: 'review_requested',
        updatedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
        url: 'https://github.com/Physicolor/dsh-widgets/pull/117',
      },
    }
  }
  if (state === 'ciOnly') {
    return {
      count: 2,
      capped: false,
      byReason: { review_requested: 0, mention: 0, assign: 0, ci_activity: 2, other: 0 },
      newest: {
        title: 'CI failed on main',
        repo: 'Physicolor/dsh-widgets',
        reason: 'ci_activity',
        updatedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
        url: 'https://github.com/Physicolor/dsh-widgets/actions',
      },
    }
  }
  if (state === 'thin') {
    return {
      count: 1,
      capped: false,
      // Only ONE bucket reported: the other two rows must print `—` in the muted
      // tone instead of a 0 nobody measured (and the row COUNT must not change).
      byReason: { mention: 1 },
      newest: {
        title: 'third-batch specs: @you',
        repo: 'Physicolor/dsh-widgets',
        reason: 'mention',
        updatedAt: new Date(Date.now() - 6 * 60_000).toISOString(),
        url: 'https://github.com/Physicolor/dsh-widgets/pull/42#discussion_r1',
      },
    }
  }
  if (state === 'absent') return null
  return undefined
}

/** 待我处理 — the unread review queue (see the header for every decision). */
function githubNotifyRender(stats: WidgetStats, meta?: WidgetRenderMeta): WidgetRenderOut | null {
  const sim = meta?.sim
  const state = sim !== undefined && typeof sim.state === 'string' ? sim.state : null
  const simulated = simNotifications(state)
  const notif = simulated !== undefined ? simulated : (stats.github?.notifications ?? null)
  // ABSENT — never requested, nobody signed in (401), or the call failed. All
  // three mean "this machine cannot see the queue", so the card does not exist.
  // This is the branch that must never become a `0`.
  if (notif === null) return null

  const byReason = notif.byReason ?? {}
  // `count` is GitHub's own total; the rows are `byReason`'s own values. They are
  // never made to agree by arithmetic here (no scaling, no "remainder" row): if a
  // payload ever disagreed, printing both truths beats inventing a third number.
  const total = typeof notif.count === 'number' && Number.isFinite(notif.count) ? Math.max(0, Math.trunc(notif.count)) : null
  const rows: Array<{ label: string; value: string; tone?: 'muted' }> = ROWS.map((row) => {
    const n = bucketCount(byReason, row.bucket)
    return n === null ? { label: row.label(), value: DASH, tone: 'muted' } : { label: row.label(), value: String(n) }
  })
  // Unread threads the three rows do NOT account for (CI + everything the host
  // folds into `other`). Reported on hover only, and only when the payload
  // carries both buckets — otherwise it would be an assumption, not a count.
  const ci = bucketCount(byReason, 'ci_activity')
  const other = bucketCount(byReason, 'other')
  const outside = ci === null || other === null ? 0 : ci + other

  // The legend is the ladder's third rung and must always exist, or the head's
  // height would change with the payload: with a newest thread it is
  // `repo · reason`; without one it says which of the two situations this is.
  const newest = notif.newest
  const newestLine = newest === null
    ? ''
    : [newest.repo === '' ? '' : repoShort(newest.repo), reasonLabel(newest.reason)].filter((part) => part !== '').join(' · ')
  const legend = newestLine !== '' ? newestLine : t(total === 0 ? 'card.github-notify.quiet' : 'card.github-notify.noNewest')

  const hint = hoverHint(notif, outside)
  return {
    // `GitHub待我处理` — NO space between the platform and the Chinese, and it is
    // not a typo. The head row gives the title column ~92px at side 150 once the
    // 34px mark owns its slot; measured at 2x in the real renderer, the spaced
    // form (94.25px) and the `GitHub · …` form (107px) both ellipsize, and a
    // platform name that is itself cut off («GitHub 待我处…») is worse than no
    // platform at all. The unspaced form (91px) fits whole: the Latin/CJK script
    // change is the visual break a space would have provided. The MARKET name
    // (`widget.github-notify.name`) is not width-bound and keeps the readable
    // spacing / `·` form — see manifest.json and README §0 q3.
    title: t('card.github-notify.title'),
    // The source mark rides the head's right slot (see the header). It shares that
    // slot with `headRing`, which this card never sets: the unread total has no
    // denominator, so a ring would be a fraction nobody measured.
    headIcon: HEAD_ICON,
    // The one dominant figure, on the head's own ladder: `headAfter.big`, never
    // `value` (with a second head row `value` would be pushed into the body and
    // print the total twice). A CAPPED page prints `30+`: the host asked for one
    // page, so a full one means "at least this many" and an exact number would be a
    // claim it cannot back (integration edit — `GitHubNotifications.capped`).
    headAfter: { big: total === null ? DASH : notif.capped ? `${total}+` : String(total) },
    legend,
    // The rows sit on the tile's floor — the shipped posture of every
    // head + breakdown card (缓存命中 / 工具调用), so the leftover height stays
    // between the caption and the divider instead of under the last row.
    bodyAnchor: 'bottom',
    chart: { kind: 'breakdown', breakdown: rows },
    ...(hint === undefined ? {} : { cardHint: hint }),
  }
}

export default defineWidget({
  id: 'github-notify',
  name: () => t('widget.github-notify.name'),
  desc: () => t('widget.github-notify.desc'),
  // A marketplace widget like the rest of the family: nothing here is on a fresh
  // install's stats line, and installing it is what makes the collector add
  // `notif=1` to the GitHub request in the first place.
  builtin: false,
  group: 'github',
  // MUST mirror the manifest: the runtime sizesOf() reads THIS descriptor.
  sizes: ['2x2'],
  simToggle: () => t('sim.notify'),
  render: githubNotifyRender,
  // No `configSchema`: the endpoint is ACCOUNT-scoped (`GET /notifications` =
  // whoever the credential belongs to), so the family's user/repos fields would
  // be fields that change nothing. Deliberate, and the only family card without
  // them — see README §6/§8.
  example: {
    stats: {
      github: {
        auth: 'gh',
        login: 'Physicolor',
        contributions: null,
        repos: [],
        notifications: {
          count: 3,
          capped: false,
          byReason: { review_requested: 2, mention: 1, assign: 0, ci_activity: 0, other: 0 },
          newest: {
            title: 'feat(widgets): the third-batch card specs',
            repo: 'Physicolor/dsh-widgets',
            reason: 'review_requested',
            updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
            url: 'https://github.com/Physicolor/dsh-widgets/pull/42',
          },
        },
        errors: {},
      },
      githubError: null,
    },
    // `sim` MUST be `simSteps[0]` (deep-equal): the preview locates the current
    // step by comparison, so a `sim` that is not in the list makes the first
    // click a silent no-op. A click then walks: 3 waiting → a measured empty
    // queue → a FULL page (`30+`) → only CI/other unread (the shape the three rows
    // cannot show) → a thin `byReason` (the `—` rows) → not signed in (the card
    // hides itself, which is the whole point).
    sim: { state: 'waiting' },
    simSteps: [{ state: 'waiting' }, { state: 'clear' }, { state: 'capped' }, { state: 'ciOnly' }, { state: 'thin' }, { state: 'absent' }],
  },
})
