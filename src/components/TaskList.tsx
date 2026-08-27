import type { DoneFilter, ScopedList, ScopedTask, ViewId } from '../lib/types';
import EmptyState from './EmptyState';
import TaskRow from './TaskRow';

interface Props {
  tasks: ScopedTask[];
  lists: ScopedList[];
  view: ViewId;
  filter: DoneFilter;
  today: string;
  focusingId: string | null;
  hasAnyTask: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
}

function TaskList({ tasks, lists, view, filter, today, focusingId, hasAnyTask, onToggle, onOpen, onFocus }: Props) {
  if (tasks.length === 0) return <EmptyState view={view} filter={filter} hasAnyTask={hasAnyTask} />;
  const listName = (id: string) => lists.find((l) => l.id === id)?.name;
  const crossList = view === 'today' || view === 'all';
  return (
    <ul className="tasks">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          listName={crossList ? listName(t.listId) : undefined}
          showBy={t.scope === 'shared'}
          today={today}
          focusing={focusingId === t.id}
          onToggle={() => onToggle(t.id)}
          onOpen={() => onOpen(t.id)}
          onFocus={() => onFocus(t.id)}
        />
      ))}
    </ul>
  );
}

export default TaskList;
