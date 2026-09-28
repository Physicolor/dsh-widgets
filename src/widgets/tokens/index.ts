import { defineWidget } from '../../client/lib/contract/helpers'
import { t } from '../../client/i18n'
import { fmtTokens } from '../../client/lib/format'

/**
 * Token 用量 — what the session spent, and how it splits between input and output
 * (2026-09-28, third card of the system-family density pass).
 *
 * It used to print two bare numbers side by side (`18.6M 75.6K`), which says
 * neither the total nor the SHAPE. Now: the total as the figure, and a two-segment
 * proportion bar whose rows carry each side's exact count — the reading order a
 * composition wants (whole, then parts).
 *
 * `segmentsPalette: 'tones'` is required here: the default segment palette is the
 * product's ContextMeter trio (bluish-neutral / violet / blue) that 上下文水位
 * mirrors, and painting 输入/输出 with it would both mean nothing and make this card
 * look like the context card. The segment `tone` the contract always asked for is
 * finally honoured when a card opts in.
 *
 * Out of scope on purpose: money. Pricing a bucket needs the rate table (and the
 * subscription-vs-metered split), which is the next step; a number invented here
 * would be exactly the fabricated `$0.00` the repo's rules forbid.
 */
export default defineWidget({
  id: 'tokens',
  name: () => t('widget.tokens.name'),
  desc: () => t('widget.tokens.desc'),
  builtin: true,
  group: 'system',
  render: (s) => {
    const u = s.usage
    // Hidden until an input has been seen (the shipped card's own gate).
    if (!u || u.inputTokens <= 0) return null
    const input = u.inputTokens
    const output = u.outputTokens || 0
    const total = input + output
    return {
      title: t('widget.tokens.name'),
      headAfter: { big: fmtTokens(total) },
      // The composition block (bar + its two rows) sits on the card's floor, like
      // the detail rows of every other card: a `headAfter` head alone would leave
      // the block right under the figure with the slack BELOW it.
      bodyAnchor: 'bottom',
      chart: {
        kind: 'segments',
        segmentsPalette: 'tones',
        totalTokens: total,
        segments: [
          // 输入 is the bulk (mostly cache reads) and reads as the quiet part;
          // 输出 is the expensive, produced part and takes the brand colour.
          { label: t('card.tokens.input'), tokens: input, tone: 'muted' as const },
          { label: t('card.tokens.output'), tokens: output, tone: 'primary' as const },
        ],
      },
    }
  },
})
