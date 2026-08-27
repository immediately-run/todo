// File layout inside any Store (private or shared):
//   <root>/lists/<listId>.json   — list metadata
//   <root>/tasks/<taskId>.json   — one task per file
// One record = one file, so concurrent writers in a shared space never rewrite
// each other's records (a single big JSON would be last-write-wins).
import type { Store } from './store';
import { listFiles, newId, readJson, removeFile, writeJson } from './store';
import type { Priority, Task, TodoList } from './types';

export interface Snapshot {
  lists: TodoList[];
  tasks: Task[];
}

export const listsDir = (s: Store) => `${s.root}/lists`;
export const tasksDir = (s: Store) => `${s.root}/tasks`;
const listPath = (s: Store, id: string) => `${listsDir(s)}/${id}.json`;
const taskPath = (s: Store, id: string) => `${tasksDir(s)}/${id}.json`;

const PRIORITIES: Priority[] = ['none', 'low', 'high'];
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Tolerant parse: a hand-edited or partially-written file never takes the app down. */
function toList(v: unknown): TodoList | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  const now = Date.now();
  return {
    id: v.id,
    name: v.name,
    createdAt: num(v.createdAt, now),
    updatedAt: num(v.updatedAt, now),
    by: str(v.by, 'someone'),
  };
}

function toTask(v: unknown): Task | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.listId !== 'string' || typeof v.title !== 'string') return null;
  const now = Date.now();
  const priority = PRIORITIES.includes(v.priority as Priority) ? (v.priority as Priority) : 'none';
  const task: Task = {
    id: v.id,
    listId: v.listId,
    title: v.title,
    done: v.done === true,
    priority,
    createdAt: num(v.createdAt, now),
    updatedAt: num(v.updatedAt, now),
    by: str(v.by, 'someone'),
  };
  if (typeof v.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.due)) task.due = v.due;
  if (typeof v.note === 'string' && v.note) task.note = v.note;
  return task;
}

async function readAll<T>(dir: string, parse: (v: unknown) => T | null): Promise<T[]> {
  const names = await listFiles(dir, '.json');
  const parsed: Array<T | null> = await Promise.all(names.map((n) => readJson<unknown>(`${dir}/${n}`, null).then(parse)));
  return parsed.filter((x): x is T => x !== null);
}

export async function loadSnapshot(store: Store): Promise<Snapshot> {
  const [lists, tasks] = await Promise.all([readAll(listsDir(store), toList), readAll(tasksDir(store), toTask)]);
  return { lists, tasks };
}

export const writeList = (store: Store, list: TodoList) => writeJson(listPath(store, list.id), list);
export const writeTask = (store: Store, task: Task) => writeJson(taskPath(store, task.id), task);
export const deleteListFile = (store: Store, id: string) => removeFile(listPath(store, id));
export const deleteTaskFile = (store: Store, id: string) => removeFile(taskPath(store, id));

/** Copy a list and its tasks into `to`, then remove them from `from`. Writes land
 *  first so a failure mid-way leaves duplicates, never data loss. */
export async function moveList(from: Store, to: Store, list: TodoList, tasks: Task[]): Promise<void> {
  await writeList(to, list);
  await Promise.all(tasks.map((t) => writeTask(to, t)));
  await Promise.all(tasks.map((t) => deleteTaskFile(from, t.id)));
  await deleteListFile(from, list.id);
}

export async function moveTask(from: Store, to: Store, task: Task): Promise<void> {
  await writeTask(to, task);
  await deleteTaskFile(from, task.id);
}

/** First-run sample data: one Inbox list and three tasks that teach the app. */
export async function seedSample(store: Store, by: string, today: string): Promise<Snapshot> {
  const now = Date.now();
  const inbox: TodoList = { id: newId(), name: 'Inbox', createdAt: now, updatedAt: now, by };
  const mk = (title: string, extra: Partial<Task>, offset: number): Task => ({
    id: newId(),
    listId: inbox.id,
    title,
    done: false,
    priority: 'none',
    createdAt: now + offset,
    updatedAt: now + offset,
    by,
    ...extra,
  });
  const tasks = [
    mk('Check this off to see how it feels', { due: today, priority: 'high' }, 0),
    mk(
      'Open a task to give it a due date, a note or a priority',
      { note: 'Tap a task title to open its details. Notes are plain text and live inside the task file.' },
      1,
    ),
    mk(
      'Share a list with your household',
      {
        priority: 'low',
        note: 'Use "Share this list" in a list header. The list and its tasks move into a shared space; you invite people to that space from immediately.run itself.',
      },
      2,
    ),
  ];
  await writeList(store, inbox);
  await Promise.all(tasks.map((t) => writeTask(store, t)));
  return { lists: [inbox], tasks };
}
