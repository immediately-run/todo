import { dueState, formatDue } from '../lib/dates';
import { focusCount } from '../lib/focusNote';
import type { ScopedTask } from '../lib/types';
import Icon from './Icon';

interface Props {
  task: ScopedTask;
  listName?: string;
  showBy: boolean;
  today: string;
  focusing: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onFocus: () => void;
}

function TaskRow({ task, listName, showBy, today, focusing, onToggle, onOpen, onFocus }: Props) {
  const due = dueState(task.due, today);
  const sessions = focusCount(task.note);
  return (
    <li className={`task${task.done ? ' done' : ''}${focusing ? ' focusing' : ''}`}>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        onClick={onToggle}
      >
        <span className="box">{task.done && <Icon name="check" size={14} />}</span>
      </button>
      <button type="button" className="taskbody" onClick={onOpen}>
        <span className="title">
          {task.priority === 'high' && <Icon name="flag" size={13} className="prio prio-high" />}
          {task.title}
        </span>
        {(task.due || listName || showBy || sessions > 0 || task.priority === 'low' || task.note) && (
          <span className="meta">
            {task.due && (
              <span className={`due due-${due}`}>
                <Icon name="calendar" size={12} /> {formatDue(task.due, today)}
              </span>
            )}
            {task.priority === 'low' && <span className="tag">low</span>}
            {sessions > 0 && (
              <span className="tag">
                <Icon name="timer" size={12} /> {sessions}
              </span>
            )}
            {task.note && !task.note.startsWith('Focus sessions:') && <span className="tag">note</span>}
            {listName && <span className="tag">{listName}</span>}
            {showBy && <span className="by">by {task.by}</span>}
          </span>
        )}
      </button>
      {!task.done && (
        <button type="button" className="iconbtn focusbtn" aria-label={`Focus on "${task.title}"`} title="Start a 25-minute focus session" onClick={onFocus}>
          <Icon name={focusing ? 'timer' : 'play'} size={18} />
        </button>
      )}
    </li>
  );
}

export default TaskRow;
