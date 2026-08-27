import { useState } from 'react';
import type { SharedInfo, ShareHow } from '../hooks/useTodo';
import Icon from './Icon';

interface Props {
  shared: SharedInfo | null;
  busy: boolean;
  /** Name new tasks are signed with (see Config.displayName); '' when unset. */
  name: string;
  onName: (name: string) => void;
  onConnect: (how: ShareHow) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

/** Popover behind the "Sharing" chip in the top bar: connect / forget a space,
 *  and the name other members see on your tasks. */
function SharingMenu({ shared, busy, name, onName, onConnect, onDisconnect, onClose }: Props) {
  const [draft, setDraft] = useState(name);
  const commitName = () => {
    if (draft.trim() !== name) onName(draft);
  };
  return (
    <>
      <div className="scrim scrim-light" onClick={onClose} />
      <div className="popover" role="dialog" aria-label="Sharing">
        <label className="field">
          <span className="fieldlabel">Your name</span>
          <input
            type="text"
            className="nameinput"
            value={draft}
            placeholder="Shown next to tasks you add"
            maxLength={40}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </label>
        {shared ? (
          <>
            <h3>
              <Icon name="users" size={16} /> {shared.name}
            </h3>
            <p>
              Lists you share go into this space{shared.mode === 'ro' ? ', which is read-only for you' : ''}. Everyone the space is
              shared with sees them within a few seconds.
            </p>
            <p className="muted">Invite people to the space from immediately.run's Spaces page — this app can't invite anyone.</p>
            <button type="button" className="btn btn-ghost" onClick={onDisconnect}>
              Forget this space
            </button>
            <p className="muted small">Forgetting keeps the files in the space; you can open it again later.</p>
          </>
        ) : (
          <>
            <h3>
              <Icon name="lock" size={16} /> Private only
            </h3>
            <p>Your lists live in a folder only you can read. To share one, connect a space first.</p>
            <div className="stack">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onConnect('pick')}>
                Open a shared space…
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onConnect('create')}>
                Create a space named "Todo"
              </button>
            </div>
            <p className="muted small">
              Then use "Share this list" on any list. You invite your household to the space from immediately.run itself.
            </p>
          </>
        )}
      </div>
    </>
  );
}

export default SharingMenu;
