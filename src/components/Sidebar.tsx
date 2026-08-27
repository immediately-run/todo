import { useState } from 'react';
import type { ScopedList, ScopedTask, ViewId } from '../lib/types';
import { openCount } from '../lib/views';
import Icon from './Icon';

interface Props {
  view: ViewId;
  lists: ScopedList[];
  tasks: ScopedTask[];
  today: string;
  canAdd: boolean;
  onSelect: (view: ViewId) => void;
  onAddList: (name: string) => void;
}

function Sidebar({ view, lists, tasks, today, canAdd, onSelect, onAddList }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const todayCount = tasks.filter((t) => !t.done && !!t.due && t.due <= today).length;
  const allCount = openCount(tasks);

  const submit = () => {
    if (name.trim()) onAddList(name);
    setName('');
    setAdding(false);
  };

  const item = (id: ViewId, label: string, icon: 'sun' | 'layers' | 'list' | 'users', count: number) => (
    <button
      type="button"
      key={id}
      className={view === id ? 'navitem active' : 'navitem'}
      onClick={() => onSelect(id)}
      aria-current={view === id ? 'page' : undefined}
    >
      <Icon name={icon} size={16} />
      <span className="navlabel">{label}</span>
      {count > 0 && <span className="count">{count}</span>}
    </button>
  );

  return (
    <nav className="sidebar" aria-label="Views and lists">
      {item('today', 'Today', 'sun', todayCount)}
      {item('all', 'All', 'layers', allCount)}
      <div className="navsec">Lists</div>
      {lists.map((l) =>
        item(
          `list:${l.id}`,
          l.name,
          l.scope === 'shared' ? 'users' : 'list',
          openCount(tasks.filter((t) => t.listId === l.id)),
        ),
      )}
      {adding ? (
        <form
          className="newlist"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            autoFocus
            value={name}
            placeholder="List name"
            aria-label="New list name"
            onChange={(e) => setName(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setName('');
                setAdding(false);
              }
            }}
          />
        </form>
      ) : (
        canAdd && (
          <button type="button" className="navitem navadd" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} />
            <span className="navlabel">New list</span>
          </button>
        )
      )}
    </nav>
  );
}

export default Sidebar;
