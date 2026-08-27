// Completed focus (Pomodoro) sessions are logged into the task's note as a
// single counter line, so the count travels with the task file and is visible
// to anyone reading the JSON — no extra field, no extra file.

const LINE = /^Focus sessions: (\d+)\s*$/m;

export function focusCount(note: string | undefined): number {
  const m = note?.match(LINE);
  return m ? Number(m[1]) : 0;
}

/** Returns the note with the counter line incremented (or appended). */
export function withFocusSession(note: string | undefined): string {
  const next = focusCount(note) + 1;
  const line = `Focus sessions: ${next}`;
  if (note && LINE.test(note)) return note.replace(LINE, line);
  const base = (note ?? '').replace(/\s+$/, '');
  return base ? `${base}\n\n${line}` : line;
}
