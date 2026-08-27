// Data model. Every list and every task is ONE JSON file on disk (see repo.ts),
// so several household members can write without clobbering each other.

export type Priority = 'none' | 'low' | 'high';

/** Which store a record was loaded from. */
export type Scope = 'private' | 'shared';

export interface TodoList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** GitHub login of whoever created the list ("someone" when unknown). */
  by: string;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  /** Local calendar day, `YYYY-MM-DD`. */
  due?: string;
  note?: string;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
  /** GitHub login of whoever created the task ("someone" when unknown). */
  by: string;
}

export type ScopedList = TodoList & { scope: Scope };
export type ScopedTask = Task & { scope: Scope };

/** `<private store>/config.json` */
export interface Config {
  /** Sample data has been written once; never seed again even if lists are empty. */
  seeded?: boolean;
  /** The shared space to re-open at boot (granted via the host powerbox). */
  shared?: { spaceId: string; name?: string };
  /** Name to sign new records with when the host reports no user (stage apps
   *  get `user: null` from `useAuth`, so this is what other members see). */
  displayName?: string;
}

export type ViewId = 'today' | 'all' | `list:${string}`;
export type DoneFilter = 'all' | 'open' | 'done';
