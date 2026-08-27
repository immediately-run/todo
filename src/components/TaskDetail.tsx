import { useEffect, useState } from 'react';
import { addDays, formatStamp } from '../lib/dates';
import { focusCount } from '../lib/focusNote';
import type { Priority, ScopedList, ScopedTask, Task } from '../lib/types';
import Icon from './Icon';

interface Props {
  task: ScopedTask;
  lists: ScopedList[];
  today: string;
  writable: boolean;
  focusing: boolean;
  /** Timer state while `focusing`; the Focus button then pauses/resumes instead of restarting. */
  running: boolean;
  onUpdate: (patch: Partial<Omit<Task, 'id' | 'createdAt' | 'by'>>) => void;
  onMove: (listId: string) => void;
  onDelete: () => void;
  onFocus: () => void;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
}

const PRIORITIES: Array<[Priority, string]> = [
  ['none', 'None'],
  ['low', 'Low'],
  ['high', 'High'],
];

/** Side panel (desktop) / bottom sheet (mobile) editing one task. Mount with
 *  `key={task.id}` so drafts reset when the selection changes. */
function TaskDetail({ task, lists, today, writable, focusing, running, onUpdate, onMove, onDelete, onFocus, onPause, onResume, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note ?? '');
  const [confirming, setConfirming] = useState(false);
  const sessions = focusCount(task.note);

  // Escape closes; a scrim click closes too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Another member (or a logged focus session) may change the note underneath
  // us: follow the file unless the draft has diverged from what was on disk.
  const [noteBase, setNoteBase] = useState(task.note ?? '');
  const diskNote = task.note ?? '';
  if (noteBase !== diskNote) {
    setNoteBase(diskNote);
    if (note === noteBase) setNote(diskNote);
  }

  const commitTitle = () => {
    const t = title.trim();
    if (!t) setTitle(task.title);
    else if (t !== task.title) onUpdate({ title: t });
  };
  const commitNote = () => {
    if (note !== (task.note ?? '')) onUpdate({ note: note.trim() || undefined });
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="detail" role="dialog" aria-label="Task details">
        <div className="detail-top">
          <button type="button" className="check" role="checkbox" aria-checked={task.done} aria-label="Done" disabled={!writable} onClick={() => onUpdate({ done: !task.done })}>
            <span className="box">{task.done && <Icon name="check" size={14} />}</span>
          </button>
          <input
            className="detail-title"
            value={title}
            readOnly={!writable}
            aria-label="Title"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
          <button type="button" className="iconbtn" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <fieldset disabled={!writable}>
          <label className="field">
            <span className="fieldlabel">List</span>
            <select value={task.listId} onChange={(e) => onMove(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.scope === 'shared' ? ' (shared)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span className="fieldlabel">Due</span>
            <div className="row">
              <input type="date" value={task.due ?? ''} aria-label="Due date" onChange={(e) => onUpdate({ due: e.target.value || undefined })} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUpdate({ due: today })}>
                Today
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUpdate({ due: addDays(today, 1) })}>
                Tomorrow
              </button>
              {task.due && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUpdate({ due: undefined })}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <span className="fieldlabel">Priority</span>
            <div className="seg" role="radiogroup" aria-label="Priority">
              {PRIORITIES.map(([p, label]) => (
                <button key={p} type="button" role="radio" aria-checked={task.priority === p} className={task.priority === p ? 'on' : ''} onClick={() => onUpdate({ priority: p })}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="fieldlabel">Note</span>
            <textarea rows={4} value={note} placeholder="Anything else. Plain text." onChange={(e) => setNote(e.target.value)} onBlur={commitNote} />
          </label>
        </fieldset>

        <div className="field">
          <span className="fieldlabel">Focus</span>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={task.done && !focusing}
              onClick={focusing ? (running ? onPause : onResume) : onFocus}
            >
              <Icon name={focusing ? (running ? 'pause' : 'play') : 'play'} size={14} />{' '}
              {focusing ? (running ? 'Pause' : 'Resume') : 'Start 25 min'}
            </button>
            <span className="muted small">
              {sessions === 0 ? 'No sessions yet' : `${sessions} session${sessions === 1 ? '' : 's'} logged in the note`}
            </span>
          </div>
        </div>

        <p className="muted small stamp">
          Added by {task.by} · {formatStamp(task.createdAt)}
          {task.scope === 'shared' ? ' · shared' : ' · private'}
        </p>

        {writable &&
          (confirming ? (
            <div className="row">
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
                Delete task
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
              <Icon name="trash" size={14} /> Delete
            </button>
          ))}
      </aside>
    </>
  );
}

export default TaskDetail;
