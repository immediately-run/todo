import type { FocusTimer } from '../hooks/useFocusTimer';
import { formatClock } from '../lib/dates';
import Icon from './Icon';

interface Props {
  timer: FocusTimer;
  taskTitle: string | null;
}

/** Sticky Pomodoro control, shown while a task has the timer attached. */
function FocusBar({ timer, taskTitle }: Props) {
  if (!timer.taskId) return null;
  const label = timer.phase === 'work' ? 'Focus' : 'Break';
  return (
    <div className={`focusbar phase-${timer.phase}`} role="timer" aria-live="off">
      <div className="focusinfo">
        <span className="phase">
          {label}
          {timer.sessions > 0 ? ` · ${timer.sessions} done` : ''}
        </span>
        <span className="focustask">{taskTitle ?? 'Task removed'}</span>
      </div>
      <span className="clock">{formatClock(timer.remaining)}</span>
      <div className="focusctrls">
        {timer.running ? (
          <button type="button" className="iconbtn" aria-label="Pause" onClick={timer.pause}>
            <Icon name="pause" />
          </button>
        ) : (
          <button type="button" className="iconbtn" aria-label="Resume" onClick={timer.resume}>
            <Icon name="play" />
          </button>
        )}
        <button type="button" className="iconbtn" aria-label="Skip phase" title="Skip (not logged)" onClick={timer.skip}>
          <Icon name="skip" />
        </button>
        <button type="button" className="iconbtn" aria-label="Stop timer" onClick={timer.stop}>
          <Icon name="stop" />
        </button>
      </div>
    </div>
  );
}

export default FocusBar;
