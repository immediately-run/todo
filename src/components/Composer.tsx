import { useState } from 'react';
import Icon from './Icon';

interface Props {
  /** Where a new task will land, for the placeholder / hint. */
  targetName: string | null;
  hint?: string;
  disabled?: boolean;
  onAdd: (title: string) => void;
}

/** The add-task input. Enter adds, Escape clears. */
function Composer({ targetName, hint, disabled, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const submit = () => {
    if (!title.trim()) return;
    onAdd(title);
    setTitle('');
  };
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        value={title}
        disabled={disabled}
        placeholder={disabled ? 'Read-only' : targetName ? `Add a task to ${targetName}` : 'Create a list first'}
        aria-label="New task title"
        enterKeyHint="done"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setTitle('');
        }}
      />
      <button type="submit" className="btn btn-primary addbtn" disabled={disabled || !title.trim()} aria-label="Add task">
        <Icon name="plus" size={18} />
        <span className="addlabel">Add</span>
      </button>
      {hint && <span className="composer-hint">{hint}</span>}
    </form>
  );
}

export default Composer;
