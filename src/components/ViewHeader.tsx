import { useState } from 'react';
import type { SharedInfo, ShareHow } from '../hooks/useTodo';
import type { DoneFilter, ScopedList, ViewId } from '../lib/types';
import Icon from './Icon';
import StoreBadge from './StoreBadge';

interface Props {
  view: ViewId;
  list: ScopedList | null;
  filter: DoneFilter;
  shared: SharedInfo | null;
  busy: boolean;
  canDelete: boolean;
  privateWritable: boolean;
  onFilter: (f: DoneFilter) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onShare: (how: ShareHow) => void;
  onUnshare: () => void;
}

const FILTERS: Array<[DoneFilter, string]> = [
  ['all', 'All'],
  ['open', 'Open'],
  ['done', 'Done'],
];

function ViewHeader({ view, list, filter, shared, busy, canDelete, privateWritable, onFilter, onRename, onDelete, onShare, onUnshare }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);

  const title = view === 'today' ? 'Today' : view === 'all' ? 'All tasks' : (list?.name ?? 'List');
  const subtitle = view === 'today' ? 'Due today and overdue, across every list.' : view === 'all' ? 'Everything, private and shared.' : null;
  const listWritable = list ? (list.scope === 'private' ? privateWritable : shared?.mode === 'rw') : false;

  const commitRename = () => {
    if (draft.trim() && draft.trim() !== list?.name) onRename(draft);
    setRenaming(false);
  };

  const share = (how: ShareHow) => {
    setShareMenu(false);
    onShare(how);
  };

  return (
    <div className="viewhead">
      <div className="viewtitle">
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitRename();
            }}
          >
            <input
              autoFocus
              className="rename"
              value={draft}
              aria-label="List name"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
            />
          </form>
        ) : (
          <h1>{title}</h1>
        )}
        {list && <StoreBadge scope={list.scope} name={shared?.name} mode={list.scope === 'shared' ? shared?.mode : undefined} />}
      </div>
      {subtitle && <p className="viewsub">{subtitle}</p>}

      <div className="viewbar">
        <div className="seg" role="tablist" aria-label="Filter by status">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? 'on' : ''} onClick={() => onFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        {list && listWritable && (
          <div className="listactions">
            {list.scope === 'private' ? (
              shared ? (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy || shared.mode === 'ro'} onClick={() => share('pick')}>
                  <Icon name="share" size={14} /> Share to {shared.name}
                </button>
              ) : (
                <div className="menuwrap">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setShareMenu((v) => !v)}>
                    <Icon name="share" size={14} /> Share this list
                  </button>
                  {shareMenu && (
                    <>
                      <div className="scrim scrim-light" onClick={() => setShareMenu(false)} />
                      <div className="popover popover-anchored" role="dialog" aria-label="Share this list">
                        <p>Moves this list and its tasks into a space. Your household sees it once you share the space with them on immediately.run.</p>
                        <div className="stack">
                          <button type="button" className="btn btn-primary" onClick={() => share('pick')}>
                            Pick a space…
                          </button>
                          <button type="button" className="btn btn-ghost" onClick={() => share('create')}>
                            Create a space named "Todo"
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !privateWritable} onClick={onUnshare}>
                <Icon name="lock" size={14} /> Make private
              </button>
            )}
            <button
              type="button"
              className="iconbtn"
              aria-label="Rename list"
              title="Rename"
              onClick={() => {
                setDraft(list.name);
                setRenaming(true);
              }}
            >
              <Icon name="pencil" size={16} />
            </button>
            {confirming ? (
              <span className="confirm">
                <span>Delete list and its tasks?</span>
                <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
                  Delete
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="iconbtn"
                aria-label="Delete list"
                title={canDelete ? 'Delete list' : 'Keep at least one list'}
                disabled={!canDelete}
                onClick={() => setConfirming(true)}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewHeader;
