// All app state lives here: a private bucket (always) plus an optional shared
// bucket (a space the user granted). Every mutation updates memory first, then
// writes exactly one file through a serial queue, so reads that follow (the
// shared-dir poll) never observe a half-applied change.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import type { Store } from '../lib/store';
import {
  createSharedStore,
  newId,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  pollDir,
  readJson,
  writeJson,
} from '../lib/store';
import {
  deleteListFile,
  deleteTaskFile,
  listsDir,
  loadSnapshot,
  moveList,
  moveTask as moveTaskFiles,
  seedSample,
  tasksDir,
  writeList,
  writeTask,
} from '../lib/repo';
import { withFocusSession } from '../lib/focusNote';
import { todayIso } from '../lib/dates';
import type { Config, Scope, ScopedList, ScopedTask, Task, TodoList } from '../lib/types';

interface Bucket {
  store: Store;
  lists: TodoList[];
  tasks: Task[];
}

export type ShareHow = 'pick' | 'create';

export interface SharedInfo {
  name: string;
  mode: 'ro' | 'rw';
}

const SHARED_SUB = 'todo';
const POLL_MS = 3000;
const CONFIG = 'config.json';

const describe = (e: unknown): string => {
  if (e && typeof e === 'object' && 'code' in e) {
    const { code, message } = e as { code: string; message?: string };
    return message ? `${message} (${code})` : code;
  }
  return e instanceof Error ? e.message : String(e);
};
const isCancelled = (e: unknown) => !!e && typeof e === 'object' && (e as { code?: string }).code === 'cancelled';

export function useTodo() {
  const auth = useAuth();
  const me = auth.user?.login || 'someone';
  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const [status, setStatus] = useState<'booting' | 'ready' | 'error'>('booting');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [priv, setPriv] = useState<Bucket | null>(null);
  const [shared, setShared] = useState<Bucket | null>(null);
  const [config, setConfig] = useState<Config>({});

  // Mirrors for use inside async callbacks without re-creating them on every render.
  const privRef = useRef<Bucket | null>(null);
  const sharedRef = useRef<Bucket | null>(null);
  const configRef = useRef<Config>({});
  useEffect(() => {
    privRef.current = priv;
  }, [priv]);
  useEffect(() => {
    sharedRef.current = shared;
  }, [shared]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Serial write queue. Never rejects: failures surface as a notice.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((job: () => Promise<void>): Promise<void> => {
    const next = queue.current.then(job).catch((e) => setNotice(`Couldn't save: ${describe(e)}`));
    queue.current = next;
    return next;
  }, []);

  const saveConfig = useCallback(
    (next: Config) => {
      const store = privRef.current?.store;
      setConfig(next);
      configRef.current = next;
      if (store) enqueue(() => writeJson(`${store.root}/${CONFIG}`, next));
    },
    [enqueue],
  );

  // ── boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = await openPrivateStore('data');
      const cfg = await readJson<Config>(`${store.root}/${CONFIG}`, {});
      let snap = await loadSnapshot(store);
      if (snap.lists.length === 0 && !cfg.seeded && store.mode === 'rw') {
        snap = await seedSample(store, meRef.current, todayIso());
        cfg.seeded = true;
        await writeJson(`${store.root}/${CONFIG}`, cfg);
      }
      let sharedBucket: Bucket | null = null;
      let sharedNotice: string | null = null;
      if (cfg.shared) {
        const s = await openRememberedSpace(cfg.shared.spaceId, SHARED_SUB);
        if (s) sharedBucket = { store: s, ...(await loadSnapshot(s)) };
        else sharedNotice = `Couldn't reopen the shared space "${cfg.shared.name ?? cfg.shared.spaceId}". Open it again from Sharing.`;
      }
      if (cancelled) return;
      privRef.current = { store, ...snap };
      sharedRef.current = sharedBucket;
      configRef.current = cfg;
      setPriv(privRef.current);
      setShared(sharedBucket);
      setConfig(cfg);
      if (sharedNotice) setNotice(sharedNotice);
      setStatus('ready');
    })().catch((e) => {
      if (cancelled) return;
      setError(describe(e));
      setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── shared-space polling (other members' writes never raise watch events) ──
  const sharedStore = shared?.store ?? null;
  useEffect(() => {
    if (!sharedStore) return;
    let alive = true;
    const reload = () =>
      enqueue(async () => {
        const snap = await loadSnapshot(sharedStore);
        if (alive) setShared((b) => (b && b.store === sharedStore ? { ...b, ...snap } : b));
      });
    const stops = [pollDir(tasksDir(sharedStore), reload, POLL_MS), pollDir(listsDir(sharedStore), reload, POLL_MS)];
    return () => {
      alive = false;
      stops.forEach((stop) => stop());
    };
  }, [sharedStore, enqueue]);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const bucketOf = (scope: Scope) => (scope === 'private' ? privRef.current : sharedRef.current);
  const setBucket = (scope: Scope, fn: (b: Bucket) => Bucket) => {
    const setter = scope === 'private' ? setPriv : setShared;
    setter((b) => (b ? fn(b) : b));
    const ref = scope === 'private' ? privRef : sharedRef;
    if (ref.current) ref.current = fn(ref.current);
  };
  const scopeOfList = (listId: string): Scope | null => {
    if (privRef.current?.lists.some((l) => l.id === listId)) return 'private';
    if (sharedRef.current?.lists.some((l) => l.id === listId)) return 'shared';
    return null;
  };
  const findTask = (id: string): { task: Task; scope: Scope; bucket: Bucket } | null => {
    for (const scope of ['private', 'shared'] as const) {
      const bucket = bucketOf(scope);
      const task = bucket?.tasks.find((t) => t.id === id);
      if (bucket && task) return { task, scope, bucket };
    }
    return null;
  };
  const writable = (bucket: Bucket): boolean => {
    if (bucket.store.mode === 'rw') return true;
    setNotice('This space is read-only for you.');
    return false;
  };

  // ── tasks ───────────────────────────────────────────────────────────────────
  const addTask = useCallback(
    (listId: string, title: string, extra: Partial<Pick<Task, 'due' | 'priority' | 'note'>> = {}) => {
      const t = title.trim();
      const scope = scopeOfList(listId);
      const bucket = scope && bucketOf(scope);
      if (!t || !scope || !bucket || !writable(bucket)) return;
      const now = Date.now();
      const task: Task = { id: newId(), listId, title: t, done: false, priority: 'none', createdAt: now, updatedAt: now, by: meRef.current, ...extra };
      setBucket(scope, (b) => ({ ...b, tasks: [...b.tasks, task] }));
      enqueue(() => writeTask(bucket.store, task));
    },
     
    [enqueue],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt' | 'by'>>) => {
      const found = findTask(id);
      if (!found || !writable(found.bucket)) return;
      const next: Task = { ...found.task, ...patch, updatedAt: Date.now() };
      if (!next.due) delete next.due;
      if (!next.note) delete next.note;
      setBucket(found.scope, (b) => ({ ...b, tasks: b.tasks.map((t) => (t.id === id ? next : t)) }));
      enqueue(() => writeTask(found.bucket.store, next));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueue],
  );

  const toggleTask = useCallback(
    (id: string) => {
      const found = findTask(id);
      if (found) updateTask(id, { done: !found.task.done });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateTask],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const found = findTask(id);
      if (!found || !writable(found.bucket)) return;
      setBucket(found.scope, (b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== id) }));
      enqueue(() => deleteTaskFile(found.bucket.store, id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueue],
  );

  const moveTask = useCallback(
    (id: string, listId: string) => {
      const found = findTask(id);
      const toScope = scopeOfList(listId);
      const toBucket = toScope && bucketOf(toScope);
      if (!found || !toScope || !toBucket || !writable(found.bucket) || !writable(toBucket)) return;
      if (toScope === found.scope) {
        updateTask(id, { listId });
        return;
      }
      const next: Task = { ...found.task, listId, updatedAt: Date.now() };
      setBucket(found.scope, (b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== id) }));
      setBucket(toScope, (b) => ({ ...b, tasks: [...b.tasks, next] }));
      enqueue(() => moveTaskFiles(found.bucket.store, toBucket.store, next));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueue, updateTask],
  );

  const recordFocusSession = useCallback(
    (id: string) => {
      const found = findTask(id);
      if (found) updateTask(id, { note: withFocusSession(found.task.note) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateTask],
  );

  // ── lists ───────────────────────────────────────────────────────────────────
  const addList = useCallback(
    (name: string, scope: Scope = 'private'): string | null => {
      const n = name.trim();
      const bucket = bucketOf(scope);
      if (!n || !bucket || !writable(bucket)) return null;
      const now = Date.now();
      const list: TodoList = { id: newId(), name: n, createdAt: now, updatedAt: now, by: meRef.current };
      setBucket(scope, (b) => ({ ...b, lists: [...b.lists, list] }));
      enqueue(() => writeList(bucket.store, list));
      return list.id;
    },
     
    [enqueue],
  );

  const renameList = useCallback(
    (id: string, name: string) => {
      const n = name.trim();
      const scope = scopeOfList(id);
      const bucket = scope && bucketOf(scope);
      const list = bucket?.lists.find((l) => l.id === id);
      if (!n || !scope || !bucket || !list || !writable(bucket)) return;
      const next = { ...list, name: n, updatedAt: Date.now() };
      setBucket(scope, (b) => ({ ...b, lists: b.lists.map((l) => (l.id === id ? next : l)) }));
      enqueue(() => writeList(bucket.store, next));
    },
     
    [enqueue],
  );

  const deleteList = useCallback(
    (id: string) => {
      const scope = scopeOfList(id);
      const bucket = scope && bucketOf(scope);
      if (!scope || !bucket || !writable(bucket)) return;
      const doomed = bucket.tasks.filter((t) => t.listId === id).map((t) => t.id);
      setBucket(scope, (b) => ({ ...b, lists: b.lists.filter((l) => l.id !== id), tasks: b.tasks.filter((t) => t.listId !== id) }));
      enqueue(async () => {
        await Promise.all(doomed.map((tid) => deleteTaskFile(bucket.store, tid)));
        await deleteListFile(bucket.store, id);
      });
    },
     
    [enqueue],
  );

  // ── sharing ─────────────────────────────────────────────────────────────────
  /** Connect a shared space (host powerbox or create). Resolves null when the
   *  user cancels or the host refuses; never throws. */
  const connectShared = useCallback(
    async (how: ShareHow): Promise<Bucket | null> => {
      if (sharedRef.current) return sharedRef.current;
      setBusy(true);
      try {
        const store = how === 'pick' ? await pickSharedStore(SHARED_SUB) : await createSharedStore('Todo', SHARED_SUB);
        if (!store.spaceId) {
          setNotice('The host did not tell us which space that was, so it cannot be remembered.');
          return null;
        }
        const bucket: Bucket = { store, ...(await loadSnapshot(store)) };
        sharedRef.current = bucket;
        setShared(bucket);
        saveConfig({ ...configRef.current, shared: { spaceId: store.spaceId, name: store.name } });
        return bucket;
      } catch (e) {
        if (!isCancelled(e)) setNotice(`Couldn't open a shared space: ${describe(e)}`);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [saveConfig],
  );

  /** Forget the shared space. Nothing is deleted; the files stay in the space. */
  const disconnectShared = useCallback(() => {
    sharedRef.current = null;
    setShared(null);
    const { shared: _drop, ...rest } = configRef.current;
    void _drop;
    saveConfig(rest);
  }, [saveConfig]);

  const moveListBetween = useCallback(
    async (listId: string, from: Scope, to: Scope) => {
      const fromB = bucketOf(from);
      const toB = bucketOf(to);
      const list = fromB?.lists.find((l) => l.id === listId);
      if (!fromB || !toB || !list || !writable(fromB) || !writable(toB)) return;
      const tasks = fromB.tasks.filter((t) => t.listId === listId);
      setBucket(from, (b) => ({ ...b, lists: b.lists.filter((l) => l.id !== listId), tasks: b.tasks.filter((t) => t.listId !== listId) }));
      setBucket(to, (b) => ({ ...b, lists: [...b.lists, list], tasks: [...b.tasks, ...tasks] }));
      await enqueue(() => moveList(fromB.store, toB.store, list, tasks));
    },
     
    [enqueue],
  );

  /** Move a private list (and its tasks) into the shared space, connecting one first if needed. */
  const shareList = useCallback(
    async (listId: string, how: ShareHow) => {
      const bucket = await connectShared(how);
      if (!bucket) return;
      await moveListBetween(listId, 'private', 'shared');
    },
    [connectShared, moveListBetween],
  );

  const unshareList = useCallback((listId: string) => moveListBetween(listId, 'shared', 'private'), [moveListBetween]);

  // ── derived ─────────────────────────────────────────────────────────────────
  const lists = useMemo<ScopedList[]>(
    () => [
      ...(priv?.lists ?? []).map((l) => ({ ...l, scope: 'private' as const })),
      ...(shared?.lists ?? []).map((l) => ({ ...l, scope: 'shared' as const })),
    ],
    [priv, shared],
  );
  const tasks = useMemo<ScopedTask[]>(
    () => [
      ...(priv?.tasks ?? []).map((t) => ({ ...t, scope: 'private' as const })),
      ...(shared?.tasks ?? []).map((t) => ({ ...t, scope: 'shared' as const })),
    ],
    [priv, shared],
  );
  const sharedInfo = useMemo<SharedInfo | null>(
    () => (shared ? { name: shared.store.name || config.shared?.name || 'Shared space', mode: shared.store.mode } : null),
    [shared, config.shared?.name],
  );

  return {
    status,
    error,
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),
    busy,
    me,
    lists,
    tasks,
    sharedInfo,
    privateWritable: priv?.store.mode === 'rw',
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    moveTask,
    recordFocusSession,
    addList,
    renameList,
    deleteList,
    connectShared,
    disconnectShared,
    shareList,
    unshareList,
  };
}

export type TodoApi = ReturnType<typeof useTodo>;
