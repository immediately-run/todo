import type { DoneFilter, ViewId } from '../lib/types';

interface Props {
  view: ViewId;
  filter: DoneFilter;
  hasAnyTask: boolean;
}

function EmptyState({ view, filter, hasAnyTask }: Props) {
  let text: string;
  if (!hasAnyTask) {
    text = 'Every list and task here is a small file in your private folder on immediately.run — share a list to move its files into a space your household can see.';
  } else if (filter === 'done') text = 'Nothing finished here yet.';
  else if (view === 'today') text = 'Nothing due today. Tasks with a due date of today or earlier show up here.';
  else if (filter === 'open') text = 'All clear. Everything in this view is done.';
  else text = 'Nothing here yet. Add a task above.';
  return (
    <div className="empty">
      <p>{text}</p>
    </div>
  );
}

export default EmptyState;
