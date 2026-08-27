# Todo

Tasks and lists that live in your files — private by default, or shared with
your household through an immediately.run space.

**Try it:** <https://immediately.run/present/github/immediately-run/todo/main/files/src/App.tsx>

## What it does

- **Lists.** Start with an Inbox; add as many lists as you like.
- **Tasks** have a title, done state, an optional due date and note, a priority
  (none / low / high), created and updated timestamps, and `by` — the login of
  whoever added them.
- **Views:** any single list, **Today** (due today or overdue, across every
  list) and **All**. Filter each view by Open / Done / All.
- **Keyboard:** Enter adds a task, Escape clears the input or closes the task
  panel. On a phone the layout is a single column with big tap targets and no
  swipe gestures to discover.
- **Focus timer.** Press the play button on any task to start a 25-minute
  Pomodoro; a 5-minute break follows automatically. Each finished focus
  session is logged in the task's note as a counter line
  (`Focus sessions: 3`).
- **Sharing.** "Share this list" moves a list and its tasks into a space. Every
  member of that space sees the list within a few seconds, and each task shows
  who added it.

## How data is stored

Everything is a small JSON file on the immediately.run filesystem — nothing is
kept in the browser, and there is no server of ours.

```
<store>/lists/<listId>.json     one file per list  { id, name, createdAt, updatedAt, by }
<store>/tasks/<taskId>.json     one file per task  { id, listId, title, done, due?, note?, priority, createdAt, updatedAt, by }
```

There are two stores:

| Store   | Where                                                     | Who can see it              |
| ------- | --------------------------------------------------------- | --------------------------- |
| Private | your per-app settings folder (`<settings>/data/…`)        | only you                    |
| Shared  | a space you granted the app (`<space>/todo/…`)            | everyone the space is shared with |

The private store also holds `config.json`, which remembers the id of the
shared space so it is re-opened silently on the next launch, and a `seeded`
flag so the three sample tasks are only written once.

One record per file is deliberate: several household members can add, edit and
check off tasks at the same time without overwriting each other's work. Other
members' changes appear through polling (every 3 s while a shared space is
open) — the sandbox gets no file-watch events for writes made by other people.

## Multi-user notes

- The app can **not** invite anyone. You share the space itself from
  immediately.run's Spaces UI; the app only moves files into it.
- If your grant on a space is read-only, shared lists show a `read-only` badge
  and every write affordance is hidden.
- "Make private" moves a list back into your private store. "Forget this space"
  (in the Sharing popover) only forgets the space id — the files stay put.
- `by` is the GitHub login reported by the host; it falls back to `someone`
  when the host reports no user.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173 — writes go to ./devfs-playground (git-ignored)
npm run build    # type-check + production build
npm run lint     # includes the React Fast Refresh rule immediately.run relies on
```

Under `vite dev` there is no host, so the private store is
`devfs-playground/settings/data`, and both "pick a space" and "create a space"
resolve to `devfs-playground/shared/todo` without a prompt. To exercise the real
consent flow, run it on the host from your working tree:

```bash
npx @immediately-run/cli dev . --origin https://local.immediately.run
```

Built with [`@immediately-run/sdk`](https://immediately-run.github.io/immediately-run-sdk/llms.txt):
`mounts` (`openSettings`, `requestMount`, `createSpace`, `mount`), `auth`
(`useAuth`) and `formFactor` (`useFormFactor`), plus the async `fs` module.
