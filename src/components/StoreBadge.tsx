import Icon from './Icon';

interface Props {
  scope: 'private' | 'shared';
  name?: string;
  mode?: 'ro' | 'rw';
}

/** "Private" or "Shared · <space>" pill shown next to a list title. */
function StoreBadge({ scope, name, mode }: Props) {
  if (scope === 'private') {
    return (
      <span className="badge badge-private" title="Only you can see this list">
        <Icon name="lock" size={12} /> Private
      </span>
    );
  }
  return (
    <span className="badge badge-shared" title="Everyone the space is shared with can see this list">
      <Icon name="users" size={12} /> Shared · {name ?? 'space'}
      {mode === 'ro' ? ' · read-only' : ''}
    </span>
  );
}

export default StoreBadge;
