import type { SharedInfo } from '../hooks/useTodo';
import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

interface Props {
  shared: SharedInfo | null;
  onOpenSharing: () => void;
}

function TopBar({ shared, onOpenSharing }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" />
        <span className="brand-name">Todo.</span>
      </div>
      <button
        type="button"
        className={shared ? 'chip chip-shared' : 'chip'}
        onClick={onOpenSharing}
        aria-label="Sharing settings"
        title="Sharing"
      >
        <Icon name={shared ? 'users' : 'lock'} size={14} />
        <span className="chip-label">{shared ? `Shared · ${shared.name}` : 'Private'}</span>
      </button>
      <ThemeSwitch />
    </header>
  );
}

export default TopBar;
