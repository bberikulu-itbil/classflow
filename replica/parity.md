## Parity: 63.0 / 100

features 63.0  (48 counted, must-haves 10 of 14 done)

Not shippable yet: 4 must-have features are not done.

## By area, weakest first
- analytics                      0.0  (1 features)
- communication                  0.0  (2 features)
- integrity                     40.0  (4 features)
- pacing                        50.0  (2 features)
- ai                            50.0  (3 features)
- monitoring                    55.6  (4 features)
- classroom                     57.1  (3 features)
- grading                       60.7  (7 features)
- motivation                    66.7  (2 features)
- curriculum                    70.0  (4 features)
- assessment                    75.0  (2 features)
- IDE                           76.2  (11 features)
- onboarding                   100.0  (2 features)
- navigation                   100.0  (1 features)

## Missing, in build order
- [must] classroom: Section (class) with roster, no  (ClassFlow takes the roster from KeyToLife classes; no section management screen)
- [must] curriculum: Course tree: units lessons activities, no  (ClassFlow has single lessons of slides)
- [must] pacing: Assignment of work to a section, partial  (S16 assigns a code slide to chosen classes; DB and RPC live and access-tested 2026-10-22; UI not yet clicked through against the live DB)
- [must] pacing: Due dates and open/lock schedule, partial  (open and due times and late policy in S16; no lock button yet)
- [should] analytics: Progress by activity lesson module, no
- [should] communication: Announcements and direct messages, no  (partial: popup to all or one student; no inbox)
- [should] grading: Fast Grade queue with diff against solution, no
- [should] grading: Gradebook with categories and weights, no
- [should] monitoring: Live feed of opened and submitted, no  (partial: submitted count and warnings; no event feed)
- [should] monitoring: Live view of student code, no  (table cf_live_code exists; UI not built)
- [should] IDE: Code history of snapshots per student, partial  (snapshots are saved and counted in S19; no history pane or diff yet)
- [could] IDE: Block-based coding for beginners, no
- [could] IDE: Docs/reference tab in the IDE, no
- [could] IDE: Multiple languages (Java JavaScript C++ SQL HTML), no  (only Python; others need a server runner)
- [could] IDE: Sandbox for free coding, no
- [could] ai: AI grading with feedback, no
- [could] ai: AI hints for students, no
- [could] assessment: Shuffled quiz questions, no
- [could] communication: Private question on an assignment, no  (partial: raise hand only)
- [could] grading: Export grades (CSV), no
- [could] integrity: Code replay / timeline, no
- [could] integrity: Similarity report between students, no
- [could] integrity: Time spent tracking, no
- [could] motivation: Custom badges, no  (ClassFlow has points and leaderboard instead)
- [could] grading: Finalized / Needs Work status, partial  (S19 grade and send-back buttons; DB live and UI untested against it)

## Left out on purpose (not scored)
- Google Classroom / Clever sync: not needed for one lyceum
- LTI Canvas Moodle Schoology: district contracts
- Courses catalogue (100+ courses): licensed content owned by CodeHS
- Certification exams: industry credentials
- Cyber Range sandbox: separate product
- PD catalogue and events: services not software
- District admin dashboards: single school

## Yours, not in the original (not scored)
- Quarter plan

## Layout diff

Not done. `replica/screens/` is empty: recon used public pages only, no CodeHS account, so there is nothing to compare against. By design the clone's look is its own (tokens in `replica/design/`); contrast check 33 pairs, 0 failures; axe clean on S04, S06, S16, S19.

## Behaviour diff (clicks on the happy path)

| flow | original | clone | decision |
| --- | --- | --- | --- |
| F02 solve | open, Run, Check, Submit (3 after opening) | open, "Тексеру және тапсыру" runs the check then submits (2 after opening; Тексеру alone for a dry run) | keep, fewer clicks |
| F04 assign | 3 clicks per assignment | pick slide, tick classes, set date, Assign (3 clicks + date); one slide can go to many classes at once | keep |
| F06 grade | 3 per student | open student, points prefilled from tests, Бағалау (2 + optional feedback) | keep |
| F02 infinite loop | not checked | stops in about 11 s with a message (was 120 s, fixed) | keep |
| F07 honesty | flags, similarity, replay | paste share flag only, worded as "not an accusation"; similarity SQL exists, no screen | build similarity screen |
| Test results | server-run autograder | run in the student's browser, so points are provisional until the teacher finalizes | known gap, written in `backend.md` |

## Verdict: not shippable (as a CodeHS replica)

4 of 14 must-haves are not done: Section with roster (no), Course tree (no), Assignment of work to a section (partial), Due dates and open/lock (partial). No open S1 or S2 bug (`bugs.md`). Feature score 63. For the lyceum's actual use (one teacher assigns a task to a class) the core loop works; the gaps are screens around it.

## Top five to build next

1. **Lock button** on an assignment (column `locked` and the checks already exist; one toggle in S16) – closes Due dates/lock, a must-have.
2. **Click through assign → solve → grade on the live database** with a real teacher and student login, then mark "Assignment of work to a section" as yes (code and SQL are tested; the glue is not).
3. **Gradebook screen** (`cf_gradebook` already returns the rows; needs a table per class, categories and weights, CSV export): three should/could rows at once.
4. **Roster screen** for a class (read-only list from KeyToLife `profiles`): turns a must-have from no to yes cheaply.
5. **Course tree** decision for you: either a simple unit list over the "Үй тапсырмалары" course, or mark it `skip` because one teacher with single tasks does not need it. Re-scope honestly rather than chase the CodeHS score.
