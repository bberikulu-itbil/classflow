# Test plan: homework layer (flows F02, F04, F06, F07)

Run 2026-10-22. Demo data layer = browser, in-memory, no network (`?demo=teacher|student`). SQL = live Supabase, rolled back (`supabase/rls_test.sql`). F01, F03, F05 belong to the older live-lesson part and were not re-tested here.

| id | flow | case | how | result |
| --- | --- | --- | --- | --- |
| F02-H1 | solve | open, write, Check, Submit, sees 3/3 | e2e/happy.py | pass |
| F02-H2 | solve | hidden test shows no expected text | happy.py | pass |
| F02-E1 | solve | wrong then right code; pasted block counted | happy.py | pass |
| F02-E2 | solve | 400-char line at 390 px, no sideways scroll | edge.py E10 | pass |
| F02-E3 | solve | double click Submit | edge.py E3 | pass |
| F02-E4 | solve | HTML/script in code, emoji, Kazakh letters | edge.py E4 | pass (shown as text, not run) |
| F02-E5 | solve | infinite loop, then fix and rerun | edge.py E6 | **failed first (120 s hang), fixed, now 11 s** |
| F02-E6 | solve | empty code | edge.py E7 | pass |
| F02-E7 | solve | keyboard only: Tab to Check, Enter | edge.py E9 | pass |
| F02-N1 | solve | require_pass: failing code cannot be submitted | edge.py N1 | pass |
| F02-N2 | solve | due date passed, late not allowed | edge.py N2 | pass |
| F02-N3 | solve | read-only after grading | happy.py | pass |
| F02-N4 | solve | unknown assignment id | edge.py E8 | pass (message, not blank) |
| F02-N5 | solve | second user's data invisible; other class refused | SQL | pass |
| F04-H1 | assign | pick slide, class, due date, assign | happy.py | pass |
| F04-N1 | assign | no class selected | happy.py | pass |
| F04-N2 | assign | student opens `#assign` / `#review` | edge.py E8 | pass (no teacher screen) |
| F04-N3 | assign | other teacher cannot edit or assign my activity | SQL | pass |
| F06-H1 | grade | open work, points prefilled, feedback, finalize | happy.py | pass |
| F06-N1 | grade | points -5, "abc", 99999 | edge.py N5, SQL | **99999 failed first (UI and server), fixed** |
| F06-N2 | grade | student or other teacher grades | SQL | pass |
| F06-E1 | grade | answer kept after grading; resubmit refused | SQL | pass |
| F06-E2 | grade | feedback with HTML | edge.py E4 | pass |
| F07-H1 | honesty | paste >50% of ≥80 chars raises a flag | happy.py, SQL | pass |
| F07-N1 | honesty | student cannot see flags | SQL | pass |
| X-1 | all | no console errors, no 5xx, axe on S04/S06/S16/S19 | both | pass |
| X-2 | all | anon cannot read tables or call RPC | SQL | pass |

## Not done (needs a real login or a second device)

- Live UI against the real database with a teacher and a student account (the layer between React and Supabase, `supaApi.ts`, has not run in a browser).
- Two tabs open at once, offline, expired session, slow network, a real phone, screen reader, daylight saving (Kazakhstan has none; fixed UTC+5 is a known shortcut).
- Second school, deputy account.
- Refresh in the middle of a task on the live DB: autosave is built to survive it (15 s debounce, flush on submit/leave) but was not exercised.
