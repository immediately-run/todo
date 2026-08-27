// Due dates are local calendar days stored as `YYYY-MM-DD` strings, which sort
// lexically and never suffer timezone drift when a household spans zones.

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayIso = (): string => toIso(new Date());

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + days));
}

export type DueState = 'none' | 'overdue' | 'today' | 'upcoming';

export function dueState(due: string | undefined, today = todayIso()): DueState {
  if (!due) return 'none';
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'upcoming';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Short human label: "Today", "Tomorrow", "Yesterday", "Thu 3 Sep", "3 Sep 2027". */
export function formatDue(due: string, today = todayIso()): string {
  if (due === today) return 'Today';
  if (due === addDays(today, 1)) return 'Tomorrow';
  if (due === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = due.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = String(y) === today.slice(0, 4);
  const diff = Math.round((date.getTime() - new Date(today).getTime()) / 86400000);
  if (diff > 1 && diff < 7) return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
  return sameYear ? `${d} ${MONTHS[m - 1]}` : `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const formatClock = (seconds: number): string =>
  `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
