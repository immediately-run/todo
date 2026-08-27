import type { DoneFilter, ScopedTask, Task, ViewId } from './types';

const PRIORITY_RANK = { high: 0, none: 1, low: 2 } as const;

/** Open tasks first; among them due-or-overdue, then priority, then soonest due,
 *  then oldest. Done tasks sink to the bottom, most recently finished first. */
export function sortTasks<T extends Task>(tasks: T[], today: string): T[] {
  const urgency = (t: Task) => (t.due && t.due <= today ? 0 : 1);
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return b.updatedAt - a.updatedAt;
    if (urgency(a) !== urgency(b)) return urgency(a) - urgency(b);
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (a.due !== b.due) {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due < b.due ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });
}

export const listIdOf = (view: ViewId): string | null => (view.startsWith('list:') ? view.slice(5) : null);

export function selectTasks(tasks: ScopedTask[], view: ViewId, filter: DoneFilter, today: string): ScopedTask[] {
  let out = tasks;
  if (view === 'today') out = out.filter((t) => !!t.due && t.due <= today);
  const listId = listIdOf(view);
  if (listId) out = out.filter((t) => t.listId === listId);
  if (filter === 'open') out = out.filter((t) => !t.done);
  if (filter === 'done') out = out.filter((t) => t.done);
  return sortTasks(out, today);
}

export const openCount = (tasks: Task[]) => tasks.filter((t) => !t.done).length;
