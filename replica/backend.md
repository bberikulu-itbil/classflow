# ClassFlow homework layer: backend

Date: 2026-10-22. Project: Supabase `tsaqxuutacgbeaaqzivv` (shared with KeyToLife). Applied migrations: `cf_homework_layer`, `cf_hardening_search_path_anon`. Files are in `supabase/` (003, 004).

## What the skill asks for, and what applies here

| area | status | note |
| --- | --- | --- |
| Auth | reused | KeyToLife logins (Supabase Auth). Nothing new built. Profile page and sign out exist. |
| Database and migrations | done | 10 tables, 11 RPC, 4 access helpers. Files checked in as `supabase/003_homework_layer.sql`, `004_hardening.sql`. |
| Access rules | done and tested | RLS on all 10 tables. `supabase/rls_test.sql` runs against the live DB and rolls back. |
| Seed | done, not run | `supabase/seed.sql`: one demo course, no student data (students are real accounts; fake students exist only in `?demo=` mode). |
| Backups | **user must check** | Supabase Dashboard > Database > Backups. Free plan has no daily backups; Pro does. Snapshots also grow: `cf_purge_snapshots()` exists, see "Open". |
| Payments, email, SMS | n/a | Single school, free. No Stripe, no Resend. |
| Integrations | n/a | None in the feature matrix. AI uses edge function `cf-ai` (needs the user's `ANTHROPIC_API_KEY` secret). |
| Jobs | open | Snapshot purge is not scheduled (pg_cron is installed). One line below. |

## Access test result (live, real teachers and students, rolled back)

- Student of the class: sees only own assignments; `cf_activity` returns hidden tests with `out = null` and no reference solution; `cf_activity_keys`, `cf_courses`, `cf_activities` return 0 rows; cannot insert into `cf_work` directly; cannot grade or review.
- Student of another class: 0 rows in `cf_work`, `cf_assignments`, `cf_work_snapshots`; `cf_activity`, `cf_hw_save`, `cf_hw_submit`, `cf_send_message` all refused.
- Another teacher (not deputy): 0 rows in `cf_work` and `cf_activity_keys`; cannot review, grade, or edit someone else's activity.
- Owner teacher: sees the paste flag, snapshots, gradebook; grading a work works.
- After `finalized`: a student's later save keeps the graded answer; resubmit refused.
- `anon`: cannot read any new table or call `cf_activity`.
- Not tested: a second **school** (the project has one school; every policy goes through `my_school()`), and a deputy account.
- By design, not a bug: any teacher can **read** other teachers' courses and activity titles in the same school (`courses_read`). Answers and tests stay private (`keys_read`).

## Advisor findings (Supabase security lints)

- Fixed: `cf_touch` mutable search_path; `cf_norm` mutable search_path; `cf_push_code` was callable by `anon` (older live-lesson function; revoked, still granted to `authenticated`).
- Accepted: "authenticated can execute SECURITY DEFINER function" on all `cf_*` RPC. Intended: each function checks `auth.uid()`, school and ownership itself (tested above). The four helpers `cf_in_class`, `cf_owns_*` must stay executable for RLS to evaluate; they only answer about the caller.
- Not ours, left alone: `extension_in_public` x2, `rls_enabled_no_policy` x3 (other KeyToLife tables), `auth_leaked_password_protection` (Dashboard > Authentication > Passwords: turn on).

## Security checklist

- [x] secrets only in env vars, `.env*` in `.gitignore`, nothing in client bundles (only the public publishable key; `.env.example` lists `ANTHROPIC_API_KEY` as a name)
- [~] input validated on the server: column checks and length limits in SQL, RPC arguments checked (`Тест нәтижесі қате`, status whitelist, text capped at 20000). No zod, because there is no custom server.
- [x] authorisation checked on every read and write, tested with a second user (see above); second school not testable yet
- [ ] rate limits on auth, sign up, and anything that sends email or SMS: nothing sends email; Supabase Auth has its own limits. Autosave is one call per 15 s per student; no server-side throttle on `cf_hw_save` (shortcut: fine for 31 students, add a per-user minimum interval if the school grows).
- [x] webhooks verify signatures: n/a, no webhooks
- [x] uploads: n/a, no uploads
- [x] no user data in URLs or logs: hash routes carry only ids
- [~] dependencies audited: run `npm audit` before the next release (not run in this step)
- [ ] privacy policy lists every processor: **missing**. Processors: Supabase (database, auth, hosting of data), GitHub Pages (static site), Anthropic (only the teacher's lesson text sent to `cf-ai`), jsDelivr/Tailwind CDN and Pyodide CDN (IP address of the browser). Student work is children's data: the school should decide retention (snapshots 180 days is the default in `cf_purge_snapshots`).

## Known weak points (honest list)

1. **Test results are client-trusted.** The browser runs Python and reports `passed/total`; a student with dev tools can claim 10/10. Points are therefore provisional until the teacher finalizes; hidden-test outputs are never sent, only salted hashes.
2. **Paste detection is a hint, not proof.** It flags when over half of ≥80 characters came from paste; it never decides a grade.
3. **UI never clicked against the live DB.** The Supabase API layer (`supaApi.ts`) is checked against the real functions' signatures and by the SQL test, but a real teacher and student login has not run the flow in a browser.
4. **Snapshots grow without the purge job.** Run once in the SQL editor: `select cron.schedule('cf-purge-snapshots','30 21 * * *','select public.cf_purge_snapshots()');`

## What the user does

1. Set GitHub Pages Source to GitHub Actions (still open).
2. Add secret `ANTHROPIC_API_KEY` in Supabase (Edge Functions > Secrets) for `cf-ai`.
3. Check Backups in the Supabase dashboard; turn on leaked password protection.
4. Optional: run the cron line from weak point 4; run `supabase/seed.sql` with your e-mail for a demo course.

Next: `/replica-test` (flows in a real browser with a teacher and a student login).
