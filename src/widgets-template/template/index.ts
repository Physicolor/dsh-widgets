/**
 * Template widget — the skeleton every new widget unit starts from.
 *
 * Copy this directory (or these two files) into src/widgets/<your-id>/ and
 * fill it in. This copy itself lives under src/widgets-template/ so the
 * discovery generator never sees it (scan root is src/widgets/ only).
 *
 * The full contract guide is src/widgets-template/README.md.
 */

import { defineWidget, type WidgetRenderMeta, type WidgetStats } from '../../client/lib/contract'
import { t } from '../../client/i18n'

function templateRender(stats: WidgetStats, meta?: WidgetRenderMeta): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  // meta.size is '2x2' | '2x4'; render may branch on it (see context-water).
  return {
    title: t('widget.template-widget.name'),
    value: meta?.size === '2x4' ? '2×4' : '2×2',
    sub: t('widget.template-widget.desc'),
  }
}

export default defineWidget({
  id: 'template-widget',
  name: () => t('widget.template-widget.name'),
  desc: () => t('widget.template-widget.desc'),
  builtin: true,
  group: 'system',
  render: templateRender,
  // Optional per-card configuration fields (shown in 组件配置 when chosen).
  configSchema: [],
  // Optional widget-owned preview mock (see examples in quote/heatmap/peak-pricing).
  example: {},
})