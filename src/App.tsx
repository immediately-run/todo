// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormFactor } from '@immediately-run/sdk/formFactor';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useTodo } from './hooks/useTodo';
import { todayIso } from './lib/dates';
import type { DoneFilter, ViewId } from './lib/types';
import { listIdOf, selectTasks } from './lib/views';
import Composer from './components/Composer';
import FocusBar from './components/FocusBar';
import SharingMenu from './components/SharingMenu';
import Sidebar from './components/Sidebar';
import TaskDetail from './components/TaskDetail';
import TaskList from './components/TaskList';
import Toast from './components/Toast';
import TopBar from './components/TopBar';
import ViewHeader from './components/ViewHeader';

function App() {
  const todo = useTodo();
  const ff = useFormFactor();
  const timer = useFocusTimer(todo.recordFocusSession);
  const [view, setView] = useState<ViewId | null>(null);
  const [filter, setFilter] = useState<DoneFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [today, setToday] = useState(todayIso);

  // Roll "today" over at midnight without a reload.
  useEffect(() => {
    const id = setInterval(() => setToday((t) => (t === todayIso() ? t : todayIso())), 60_000);
    return () => clearInterval(id);
  }, []);

  const { lists, tasks } = todo;
  const firstPrivate = lists.find((l) => l.scope === 'private') ?? lists[0] ?? null;

  // Default view = the first (Inbox) list; fall back when the current list disappears.
  const currentView = useMemo<ViewId>(() => {
    if (view && (!listIdOf(view) || lists.some((l) => l.id === listIdOf(view)))) return view;
    return firstPrivate ? `list:${firstPrivate.id}` : 'all';
  }, [view, lists, firstPrivate]);

  const currentListId = listIdOf(currentView);
  const currentList = lists.find((l) => l.id === currentListId) ?? null;
  const visible = useMemo(() => selectTasks(tasks, currentView, filter, today), [tasks, currentView, filter, today]);
  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const focusTask = timer.taskId ? (tasks.find((t) => t.id === timer.taskId) ?? null) : null;

  // New tasks go to the current list, or the first private list on Today / All.
  const target = currentList ?? firstPrivate;
  const targetWritable = target ? (target.scope === 'private' ? todo.privateWritable : todo.sharedInfo?.mode === 'rw') : false;
  const addTask = useCallback(
    (title: string) => {
      if (!target) return;
      todo.addTask(target.id, title, currentView === 'today' ? { due: today } : {});
    },
    [todo, target, currentView, today],
  );

  const writableFor = (scope: 'private' | 'shared') => (scope === 'private' ? !!todo.privateWritable : todo.sharedInfo?.mode === 'rw');

  if (todo.status === 'booting') {
    return (
      <div className="app boot">
        <span className="mark" />
        <p className="muted">Opening your lists…</p>
      </div>
    );
  }
  if (todo.status === 'error') {
    return (
      <div className="app boot">
        <h1>Couldn't open storage.</h1>
        <p className="muted">{todo.error}</p>
      </div>
    );
  }

  return (
    <div className="app" data-form-factor={ff.class}>
      <TopBar shared={todo.sharedInfo} onOpenSharing={() => setSharingOpen(true)} />
      <div className="body">
        <Sidebar
          view={currentView}
          lists={lists}
          tasks={tasks}
          today={today}
          canAdd={!!todo.privateWritable}
          onSelect={(v) => {
            setView(v);
            setSelectedId(null);
          }}
          onAddList={(name) => {
            const id = todo.addList(name);
            if (id) setView(`list:${id}`);
          }}
        />
        <main className="main">
          <ViewHeader
            view={currentView}
            list={currentList}
            filter={filter}
            shared={todo.sharedInfo}
            busy={todo.busy}
            canDelete={lists.length > 1}
            privateWritable={!!todo.privateWritable}
            onFilter={setFilter}
            onRename={(name) => currentListId && todo.renameList(currentListId, name)}
            onDelete={() => {
              if (currentListId) todo.deleteList(currentListId);
              setView(null);
            }}
            onShare={(how) => currentListId && void todo.shareList(currentListId, how)}
            onUnshare={() => currentListId && void todo.unshareList(currentListId)}
          />
          <Composer
            targetName={target?.name ?? null}
            hint={target && currentView !== `list:${target.id}` ? `→ ${target.name}${currentView === 'today' ? ' · due today' : ''}` : undefined}
            disabled={!target || !targetWritable}
            onAdd={addTask}
          />
          <TaskList
            tasks={visible}
            lists={lists}
            view={currentView}
            filter={filter}
            today={today}
            focusingId={timer.taskId}
            hasAnyTask={tasks.length > 0}
            onToggle={todo.toggleTask}
            onOpen={setSelectedId}
            onFocus={timer.start}
          />
        </main>
      </div>

      {selected && (
        <TaskDetail
          key={selected.id}
          task={selected}
          lists={lists}
          today={today}
          writable={writableFor(selected.scope)}
          focusing={timer.taskId === selected.id}
          running={timer.running}
          onUpdate={(patch) => todo.updateTask(selected.id, patch)}
          onMove={(listId) => todo.moveTask(selected.id, listId)}
          onDelete={() => {
            todo.deleteTask(selected.id);
            setSelectedId(null);
          }}
          onFocus={() => timer.start(selected.id)}
          onPause={timer.pause}
          onResume={timer.resume}
          onClose={() => setSelectedId(null)}
        />
      )}

      {sharingOpen && (
        <SharingMenu
          shared={todo.sharedInfo}
          busy={todo.busy}
          name={todo.displayName}
          onName={todo.setDisplayName}
          onConnect={(how) => {
            setSharingOpen(false);
            void todo.connectShared(how);
          }}
          onDisconnect={() => {
            setSharingOpen(false);
            todo.disconnectShared();
          }}
          onClose={() => setSharingOpen(false)}
        />
      )}

      <FocusBar timer={timer} taskTitle={focusTask?.title ?? null} />
      <Toast message={todo.notice} onDismiss={todo.dismissNotice} />
    </div>
  );
}

export default App;
