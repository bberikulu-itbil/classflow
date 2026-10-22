# Build log

Clean room: every line here was written from `recon.md`, `architecture.md` and `design/`; no CodeHS markup, code, images or copy was used. The data layer has two implementations behind one interface (`src/hw/types.ts`): Supabase (calls the RPC from `schema.sql`) and an in-memory demo with the same rules (`?demo=teacher|student`). `schema.sql` is **not applied** to the database yet, so with real logins the homework screens will show an error until it is.

| ID | screen | date | state | missing | harder than expected |
| --- | --- | --- | --- | --- | --- |
| S16 | Assign (teacher) | 2026-10-22 | partial | only code slides from existing lessons; no lock/unlock button; no category picker; no edit of an assignment after it is given | turning a lesson slide into an activity needed the activity/keys split (tests never reach students) |
| S04 | Homework list (student) | 2026-10-22 | partial | no course/module tree, only a flat list grouped by status; no overdue sorting beyond due date | none |
| S06 | Homework IDE | 2026-10-22 | partial | plain textarea, no syntax colours (CodeMirror is out of plan); no code history pane; Python only; blocks mode absent | counting typed vs pasted characters for the paste flag; autosave must send deltas, not totals |
| S19 | Review (teacher) | 2026-10-22 | partial | no diff against a solution, no similarity report, no Fast Grade queue, no code replay | none |

Checked in a browser (Chromium, demo data layer, Pyodide and Tailwind served from local copies because the sandbox blocks the CDNs): teacher assigns to 7B, student fails then passes 3/3 with a hidden test, paste is flagged, submit, teacher grades, student sees grade and read-only IDE, empty state, validation error, 390px and 1440px, axe WCAG A/AA clean on S04, S06, S16, S19, no console errors. 27 of 27 checks.

Not checked: the Supabase implementation against a live database (schema not applied); real phones; screen readers by ear; the 15-second autosave timing; many students at once.
