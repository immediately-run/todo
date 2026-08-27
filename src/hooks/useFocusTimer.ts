// A Pomodoro timer (25 min focus / 5 min break) attachable to one task. When a
// focus phase completes, `onWorkComplete(taskId)` fires once so the caller can
// log the session on the task. Break phases start automatically; the next focus
// phase waits for the user.
import { useCallback, useEffect, useRef, useState } from 'react';

export const WORK_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;

export type Phase = 'work' | 'break';

export interface FocusState {
  taskId: string | null;
  phase: Phase;
  /** Seconds left in the current phase. */
  remaining: number;
  running: boolean;
  /** Focus phases completed since this task was attached. */
  sessions: number;
}

const IDLE: FocusState = { taskId: null, phase: 'work', remaining: WORK_SECONDS, running: false, sessions: 0 };

export function useFocusTimer(onWorkComplete: (taskId: string) => void) {
  const [state, setState] = useState<FocusState>(IDLE);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const endsAt = useRef<number | null>(null);
  const callback = useRef(onWorkComplete);
  useEffect(() => {
    callback.current = onWorkComplete;
  }, [onWorkComplete]);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      if (endsAt.current === null) return;
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      if (left > 0) {
        setState((s) => (s.remaining === left ? s : { ...s, remaining: left }));
        return;
      }
      const s = stateRef.current;
      if (s.phase === 'work') {
        endsAt.current = Date.now() + BREAK_SECONDS * 1000;
        if (s.taskId) callback.current(s.taskId);
        setState({ ...s, phase: 'break', remaining: BREAK_SECONDS, running: true, sessions: s.sessions + 1 });
      } else {
        endsAt.current = null;
        setState({ ...s, phase: 'work', remaining: WORK_SECONDS, running: false });
      }
    }, 250);
    return () => clearInterval(id);
  }, [state.running, state.phase]);

  const start = useCallback((taskId: string) => {
    endsAt.current = Date.now() + WORK_SECONDS * 1000;
    setState((s) => ({ taskId, phase: 'work', remaining: WORK_SECONDS, running: true, sessions: s.taskId === taskId ? s.sessions : 0 }));
  }, []);

  const pause = useCallback(() => {
    endsAt.current = null;
    setState((s) => ({ ...s, running: false }));
  }, []);

  const resume = useCallback(() => {
    endsAt.current = Date.now() + stateRef.current.remaining * 1000;
    setState((s) => ({ ...s, running: true }));
  }, []);

  /** Skip the current phase without logging it. */
  const skip = useCallback(() => {
    endsAt.current = null;
    setState((s) =>
      s.phase === 'work'
        ? { ...s, phase: 'break', remaining: BREAK_SECONDS, running: false }
        : { ...s, phase: 'work', remaining: WORK_SECONDS, running: false },
    );
  }, []);

  const stop = useCallback(() => {
    endsAt.current = null;
    setState(IDLE);
  }, []);

  return { ...state, start, pause, resume, skip, stop };
}

export type FocusTimer = ReturnType<typeof useFocusTimer>;
