import { defineWidget } from '../../client/lib/contract'
import { t } from '../../client/i18n'

/** Task card: counts of pending / in_progress / completed. Stays visible even
 *  without a todos projection — shows 暂无任务 so the card never vanishes. */
function taskRender(stats: Parameters<ReturnType<typeof defineWidget>['render']>[0]): ReturnType<NonNullable<ReturnType<typeof defineWidget>['render']>> {
  const todos = stats.todos
  const pending = todos ? todos.filter((t) => t.status === 'pending').length : 0
  const doing = todos ? todos.filter((t) => t.status === 'in_progress').length : 0
  const done = todos ? todos.filter((t) => t.status === 'completed').length : 0
  const total = todos ? todos.length : 0
  return {
    title: t('widget.task.name'),
    value: total > 0 ? t('card.task.done', { n: done }) : t('card.task.none'),
    sub: t('card.task.sub', { doing, pending }),
  }
}

export default defineWidget({
  id: 'task',
  name: () => t('widget.task.name'),
  desc: () => t('widget.task.desc'),
  builtin: true,
  group: 'system',
  render: taskRender,
})