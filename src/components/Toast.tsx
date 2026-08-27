import Icon from './Icon';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

function Toast({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="iconbtn" aria-label="Dismiss" onClick={onDismiss}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

export default Toast;
