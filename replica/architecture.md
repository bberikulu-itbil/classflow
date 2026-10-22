# Architecture: ClassFlow homework layer (a rebuild of CodeHS's course, assignment and grading core)

Reads: `recon.md`, `features.csv`. SQL: `schema.sql` (10 tables, 11 RPC, not applied to the database).

Scope of this plan: the gaps `features.csv` marks `no` for must and should rows: sections as classes, course tree, assignments with due dates, homework submissions, gradebook, code history, review queue, integrity flags, messages. Live lessons (sessions, remote, board) stay as they are.

## Stack

Kept as it is. The user already runs it, and every part is managed.

| layer | choice | why |
| --- | --- | --- |
| web | React 19 + TypeScript + Vite, static build on GitHub Pages via Actions | already in the repo; no server to run. Hash routes (`#hw`, `#course/ID`) fit Pages |
| styling | Tailwind with the design palette | now loaded from the CDN script; move to a build step (Tailwind v4 plugin) before heavy school use, the CDN script is not meant for production |
| database | Postgres on Supabase (project `tsaqxuutacgbeaaqzivv`, shared with KeyToLife) | already holds profiles, classes, `cf_*`; one database, no new service |
| auth | Supabase Auth, KeyToLife logins (`name@users.lyceum-life.app`) | students already have accounts; a class is `profiles.class_id` |
| API | PostgREST for plain tables, SQL RPC for anything a student writes | access rules live next to the data; no backend to deploy |
| code runner | Pyodide in a Web Worker | free, runs on school PCs and phones; Python only |
| AI | existing edge function `cf-ai` (add modes `hint`, `feedback`) | key stays on the server, teacher-only already |
| payments, email | none | single school, free |
| jobs | `pg_cron` calling `cf_purge_snapshots()` nightly | the only recurring job |
| files | none | code is text in the database |
| hosting | GitHub Pages (front) + Supabase (back) | both free at this size |

Not chosen: Next.js, a separate Node API, Judge0 or Piston for Java/C++ (a server runner is a separate project, see Hard parts).

## Schema

Tables: 10 new (`cf_courses`, `cf_units`, `cf_activities`, `cf_activity_keys`, `cf_categories`, `cf_assignments`, `cf_work`, `cf_work_snapshots`, `cf_integrity_flags`, `cf_messages`), reusing 4 existing (`profiles`, `classes`, `schools`, plus `cf_lessons` as the source of slides). Access rules: Postgres row level security on every table, helper functions `cf_in_class`, `cf_owns_course`, `cf_owns_assignment`, `cf_owns_work` on top of the existing `my_school()`, `is_staff()`, `is_deputy()`.

Full SQL: `replica/schema.sql`. Decisions worth knowing:

- A **section is a class** (`classes`), not a new table. A student is in one class (`profiles.class_id`).
- A teacher who teaches informatics but is not the class teacher can still assign work: ownership is `cf_assignments.assigned_by`, not `classes.teacher_id`.
- **Answers never sit in rows students can read.** Tests, quiz answers and the reference solution live in `cf_activity_keys`, which only the course owner can select. Students get tests through `cf_activity`, as salted hashes; hidden tests carry no expected text.
- **Students never write tables.** Writes go through `cf_hw_save` and `cf_hw_submit`. The server decides lateness from its own clock.
- Student-owned rows (`cf_work`, snapshots, messages) cascade when a profile is deleted; teacher-owned rows `RESTRICT`, so reassign a teacher's courses before removing them.
- Duplicates are a database problem: `unique (class_id, activity_id)` on assignments, `unique (assignment_id, student_id)` on work, `unique (work_id, kind)` on flags.
- `require_pass` is a per-assignment switch for CodeHS's "Submit is blocked until tests pass".

Checked: the file was applied to a scratch Postgres 16 with stand-ins for the Supabase helpers and run through a scenario (teacher builds and assigns, two students save and submit, copy detected, teacher grades, other school denied, lock, deadline, `require_pass`, resubmit after grading). It found one real bug (helper functions lacked `execute` for `authenticated`), now fixed. Not tested against the live database and its real `cf_norm`, `my_school` and `pg_trgm` install.

## API

Calls are Supabase RPC from the browser (`sb.rpc(name, args)`) unless marked table.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| rpc `cf_save_activity` | create or edit an activity; splits tests and answers into the keys table | course owner | unit, kind, title, content, tests, answer, solution, points | activity id | F03, F04 |
| table `cf_courses` insert/update/delete | manage courses | staff, owner | title, subject, grade, archived | row | F03 |
| table `cf_units` insert/update/delete | manage units | course owner | course, title, position | row | F03 |
| table `cf_activities` select/delete | list and remove activities (content only) | staff | filters | rows | F03 |
| table `cf_categories` all | grading categories with weights per class | staff, owner | class, name, weight | rows | F06 |
| rpc `cf_assign` | give an activity to classes, set open/due/late/require_pass | staff | activity, classes[], opens, due, flags, category | count | F04 |
| table `cf_assignments` update/delete | change dates, lock, remove | assigner or deputy | fields | row | F04 |
| rpc `cf_my_assignments` | my homework list with status and grades | student | none | rows | F02 |
| rpc `cf_activity` | one activity for the IDE (tests as salted hashes) | student in class, owner | assignment | json | F02 |
| rpc `cf_hw_save` | autosave, snapshot when text changed | student in class | assignment, answer, pasted, typed, reason | void | F02 |
| rpc `cf_hw_submit` | submit; late flag, provisional points, paste flag | student in class | assignment, answer, passed, total | work row | F02 |
| rpc `cf_hw_review` | all students of the class for one assignment, including not started | assigner or deputy | assignment | rows | F06 |
| table `cf_work` select, `cf_work_snapshots` select | read a submission and its code history | owner; student reads own | work id | rows | F06, F07 |
| rpc `cf_hw_grade` | finalize or send back with feedback | assigner or deputy | work, points, status, feedback | void | F06 |
| rpc `cf_gradebook` | rows for the class gradebook | staff | class | rows | F06 |
| rpc `cf_similarity` | pairs of near-identical submissions | assigner or deputy | assignment, min score | rows | F07 |
| table `cf_integrity_flags` select/update(state, note) | review flags: needs review, concern, cleared | assigner or deputy | work id | rows | F07 |
| rpc `cf_send_message` | staff to student or class; student to the assigner about one assignment | any | body, to, class, assignment | id | F06 |
| table `cf_messages` select | inbox | sender, recipient, class | none | rows | F06 |
| edge `cf-ai` mode `hint` | hint for a stuck student, without giving the answer | student in class | assignment, code | text | F02 (could) |
| edge `cf-ai` mode `feedback` | draft feedback for a submission | staff | work | text | F06 (could) |

Webhooks in: none. Webhooks out: none. No third-party API is called except Anthropic through `cf-ai`.
Jobs: `cf_purge_snapshots`, daily at 02:30 Astana time (`30 21 * * *` UTC); keeps the 300 newest snapshots per work and nothing older than 180 days.

## The parts that bite

- **Client-trusted tests.** The browser runs the code and reports `passed/total`. A student can send any number. This plan keeps teacher confirmation (points are provisional until `finalized`) and salted hashes, which stops precomputed lookups but not a student who runs the hashing himself on a guessed output. For exams, run tests on a server runner, or grade by hand.
- **Time zones.** `due_at` is `timestamptz`. The school is `Asia/Qostanay` (UTC+5, no daylight saving). Show times with `schools.tz`, never the browser's zone. The server checks the deadline, not the client.
- **Idempotency and races.** `cf_hw_submit` locks the assignment row and upserts the work; pressing Submit twice or at the deadline second gives one row and one verdict. A grade lands between two submits: the finalized check refuses the second.
- **Autosave volume.** 30 students saving every 15 s is 2 writes per second per class; snapshots store the full text (up to 20 KB), so a single lesson makes about 1 MB. The client must save only on change and not more often than every 15 s; `cf_purge_snapshots` keeps the table bounded.
- **Paste detection is a hint.** Counts of typed and pasted characters come from the browser. A student can type into a second window and paste in chunks under the threshold. Flags are "needs review", never a verdict.
- **Similarity is naive.** Trigram similarity catches copies and light edits; renaming variables lowers the score. Good enough for a class of 30.
- **Realtime.** Homework needs none. Teacher screens poll every 20-30 s. Do not add homework tables to the realtime publication: the Supabase free plan allows 200 concurrent realtime connections, and live lessons already use them.
- **Row level security cost.** Policies call helper functions per row; indexes on `class_id`, `assignment_id`, `student_id` are in the schema. Watch the gradebook query when a teacher has 10 classes.
- **Multi-tenancy.** Everything is scoped by `my_school()`. The database is shared with KeyToLife, so a mistake here can show in the main app: apply the SQL in a transaction on a branch first (`create_branch`), or at least outside lesson hours.
- **Children's data.** Student code and messages are personal data. No export outside the project, no analytics scripts on the pages, deletion by profile cascades.
- **Languages.** Only Python runs in the browser. Java and C++ need a server runner (a separate service with sandboxing); keep them out of this plan.

## Build order

1. **Vertical slice: one homework end to end, ugly.**
   Screens S16 (assign), S04 (student homework list), S06 (IDE in homework mode), S19 (teacher sees the submission).
   Tables `cf_courses`, `cf_units`, `cf_activities`, `cf_activity_keys`, `cf_assignments`, `cf_work`.
   Routes `cf_save_activity` (from an existing code slide: "Save as homework"), `cf_assign`, `cf_my_assignments`, `cf_activity`, `cf_hw_save`, `cf_hw_submit`, `cf_hw_review`, `cf_hw_grade`.
   Done when: a teacher turns the sample code slide into homework for 7B, a student solves it on a phone, and the teacher sees 3/3 tests and grades it.
2. **Must-haves from `features.csv`** (no rows): course tree (S15, S04 modules), assignments with open and due dates (S17), section roster view from `classes` (S13), student sees grades and feedback (S04). Tables `cf_categories` stay unused until step 3.
3. **Should-haves:** code history pane (S06, `cf_work_snapshots`), Fast Grade queue with diff against the solution (S20), gradebook with categories (S21, `cf_gradebook`), progress view (S22), paste flag and similarity (S26, `cf_integrity_flags`, `cf_similarity`), `require_pass`, live view of student code (S23, table `cf_live_code` already exists), messages (S27), CSV export of the gradebook and attendance.
4. **Could-haves:** AI hint and AI feedback (`cf-ai`), badges, code replay, time tracking, quiz shuffle.
5. **Fixes from replica-entrepreneur**, once it has run.

Before step 1, in the existing app: Pages must deploy from Actions (done), and the audit items that affect the IDE (contrast of the primary buttons, the Focus badge on iPhone, warming up Pyodide on join) should be fixed, because homework mode reuses the same IDE.
