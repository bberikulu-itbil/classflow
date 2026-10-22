# Recon map: CodeHS (web)

Scope: the teaching loop of CodeHS on the web: sections and rosters, courses with assignments, the browser IDE with autograder, grading, and live class monitoring. Not in scope: PD, certifications, Cyber Range, Tynker, district admin, LMS/LTI.
For: ClassFlow, the user's own classroom platform for his lyceum (grades 7-11). Not a product to sell.
Date: 2026-10-22

Method: public pages and the public help center only. No CodeHS account was used, no source code or network calls were read, no screenshots taken. Screens below come from help-center descriptions, so states marked (?) are inferred and need the user to confirm in his own teacher account.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | pricing page | https://codehs.com/pricing | tiers Free / Starter / School / District; shows which features are gated |
| 2 | marketing home | https://codehs.com/ | positioning, courses, tool list |
| 3 | platform page | https://codehs.com/platform | IDE, course components, QuizBuzz, badges |
| 4 | grading page | https://codehs.com/grading | auto submission, Fast Grade, gradebook, Conversations |
| 5 | help: teacher quick start | https://help.codehs.com/en/articles/6931010-quick-start-navigation-guide-for-teachers | Sections, Roster, Assignments apps, IDE Grade tab |
| 6 | help: apps list | https://help.codehs.com/en/articles/11826317-codehs-apps | full app launcher, by category |
| 7 | help: teacher homepage | https://help.codehs.com/en/articles/11852857-teacher-homepage | announcements, quick links, my sections, quick actions |
| 8 | help: autograders | https://help.codehs.com/en/articles/3335521-autograders | types, Check/Submit behaviour |
| 9 | help: student sign-up and join | https://help.codehs.com/en/articles/4385906-for-students-creating-an-account-and-joining-a-class-section | class code, Join Section |
| 10 | help: Realtime app | https://help.codehs.com/en/articles/9424786-using-the-realtime-app | presence, live feed, Focus Mode |
| 11 | help: Academic Integrity app | https://help.codehs.com/en/articles/9440521-using-the-academic-integrity-app | paste flag, similarity, replay |
| 12 | changelog | https://codehs.com/changelog/bts/2026 | recent AI features (Ask AI) |

## Core loop

A teacher assigns a lesson's coding exercises from a course; students write and run code in a browser IDE, press Check, and the autograder gives instant pass/fail; the teacher then sees progress live and reviews or grades the submissions in one place.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Sign up / log in | codehs.com, Sign Up > Create Student Account | create account or sign in (email, Google, Clever, Canvas SSO) | name, email, password, SSO buttons | empty, error (?) |
| S02 | Join section | codehs.com/join_class or left nav "Join Section" | enter class code or follow invite URL | code field, auto-redirect from invite | empty, invalid code (?) |
| S03 | Student home | after login | list of my sections, Resume | section cards, Resume button | one section, many, none |
| S04 | Course / module view (student) | click a section | modules > lessons > activities with progress | tree, badges, due dates | locked by access control, done, overdue (?) |
| S05 | Lesson page | click an activity | video, slides, example, quiz | video player, slide deck | unwatched, done |
| S06 | Exercise IDE | exercise link | write code; Run; Check; Submit; Docs tab; Test Cases tab; code history pane | editor, console, instructions pane, Run/Check/Submit, Docs, Test Cases | clean, running, tests failed (submit blocked), all passed, submitted, locked |
| S07 | Quiz | quiz activity | multiple choice or short answer, shuffled (paid) | question list, submit | in progress, submitted, score shown (?) |
| S08 | Sandbox | Sandbox app | free coding, share link | editor, language picker, share | new, saved |
| S09 | Teacher homepage | Home in left nav | announcements, quick links, my sections, quick actions | cards, shortcuts | with announcement, none |
| S10 | App launcher / left nav | left nav | open any app by category | grouped app list | Free vs Pro badge |
| S11 | Sections app | /app/sections | list, create sections; class code; teacher/student view toggle | section rows, "..." menu | empty, many |
| S12 | Section settings | Sections > "..." | rename, school year, block vs text coding, copy/paste setting | form | saved |
| S13 | Roster | /apps/roster | students in a section; add, move, remove; per-student settings | table, "..." menu, section dropdown | empty, filled |
| S14 | Student course progress | Roster > student name | one student's progress through the course | progress rows | none started, partial |
| S15 | Courses / Course catalog | Courses, Course Catalog | add a course to a section; archive | catalog cards, preview | active, archived |
| S16 | Assignments app | /apps/assignments | course tree for a section; open lesson plan, problem guide, preview, grade, configure | unit > lesson > assignment rows with 4 icons | expanded, collapsed |
| S17 | Configure assignment | Assignments > gears icon | due dates, open/lock schedule (Pro), points | date pickers, toggles | default, scheduled |
| S18 | Lesson plan / problem guide | violet icon, lightbulb | printable plan, solution notes (verified teachers only) | document view | permission denied for unverified (?) |
| S19 | Code review / Grade tab | clipboard icon, IDE Grade tab | open a student's latest submission, comment, mark Finalized / Needs Work | code viewer, feedback box, status buttons | ungraded, graded |
| S20 | Fast Grade | Fast Grade app | filter and sort submissions, diff against solution, feedback and grade on one screen | list + code + solution pane, grade field | queue empty, queue filled |
| S21 | Gradebook | Gradebook app | grades by section, student or assignment; weights, point values, export | grid, categories | basic (free), custom (paid) |
| S22 | Progress | Progress app | progress by activity, lesson, module, quiz; side-by-side students | heatmap/table | live |
| S23 | Realtime dashboard | Realtime app (Pro) | who is present (active in last 6 min), current assignment, last active | student rows, group dropdown | present, absent |
| S24 | Live feed | Realtime app | opened / submitted events with time | event list | empty, streaming |
| S25 | Focus Mode setup | Realtime > Start Focus Mode; Assignments "..." | lock chosen students to one activity, up to 90 min | target picker, student checkbox modal | off, on, conflict with shared groups |
| S26 | Academic Integrity hub | Academic Integrity app | flags inbox, plagiarism report, similarity matrix, code history/replay, time tracking | flag list (Needs review / Concern / Cleared), side-by-side diff, matrix | none, flagged |
| S27 | Messages / Conversations | Messages app | announcements, direct messages, private questions on an assignment | thread list | empty, unread |
| S28 | Attendance | Attendance app | record daily/weekly attendance, CSV export | roster with status | empty, filled |
| S29 | Badges | Badges app | create custom badges and award | badge editor | none, some |
| S30 | Create (custom assignment) | Create app | build exercises with own autograder, playlists | editor, test-case builder | draft, published |
| S31 | AI tools | AI Creator, AI Grading, Smart Hints, Ask AI | generate activities, grade with feedback, manage hints | prompt box, review list | paid tiers only |

## Flows

```
F01 Student joins a class
    S01 sign up -> S02 join section (code) -> S03 home -> S04 course
    happy path clicks: 4 plus typing (name, email, password, code)
    edge: Google/Clever/Canvas sections have no code; wrong code; already joined

F02 Student solves an exercise
    S04 -> S06 write -> Run -> Check (tests) -> fix -> Submit
    happy path clicks: 3 (Run, Check, Submit) after opening the exercise
    edge: tests fail so Submit is blocked; assignment locked or past due; infinite loop; paste flagged

F03 Teacher sets up a class
    S09 home -> S15 add course -> S11 create section (gets class code) -> S13 roster
    happy path clicks: about 6
    edge: sync from Google Classroom or Clever instead of a code; move or remove student

F04 Teacher assigns work
    S16 assignments -> S17 configure (due date, lock) -> students see it in S04
    happy path clicks: 3 per assignment
    edge: Free tier has no pacing or due dates (gated)

F05 Teacher watches class live
    S23 dashboard + S24 feed -> (optionally) S25 Focus Mode
    happy path clicks: 2 to open, 4 to start Focus Mode
    edge: groups sharing students cannot both be in Focus Mode

F06 Teacher grades
    S16 clipboard icon -> S19 or S20 Fast Grade -> feedback -> S21 gradebook
    happy path clicks: 3 per student
    edge: autograder passed but teacher adjusts; exercise has no autograder (manual only)

F07 Teacher checks honesty
    S26 flags -> plagiarism report or code replay -> mark Cleared / Concern
    edge: false positives, flags are not accusations
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Left navigation with app launcher | grouped by category, Free/Pro badge | collapsed, active | all teacher screens |
| Section/course dropdown | section, course, group | open, selected | S16, S13, S22, S23 |
| Course tree (unit > lesson > activity) | student, teacher (with 4 icons) | expanded, collapsed, locked, done | S04, S16 |
| Code editor | text, blocks | clean, dirty, read-only, locked | S06, S08, S19 |
| Run / Check / Submit bar | - | default, running, disabled (submit until tests pass) | S06 |
| Console / output panel | stdout, error | empty, running, error | S06 |
| Test-case panel | visible, hidden (?) | pass, fail | S06 |
| Docs tab | per language | - | S06 |
| Code history pane | snapshots, diff view | pasted highlight | S06, S26 |
| Progress bar / status chip | not started, in progress, done, overdue | - | S04, S22 |
| Data table with row menu ("...") | roster, gradebook, submissions | sortable, filtered | S13, S20, S21 |
| Side-by-side code diff | student vs solution, student vs student | - | S20, S26 |
| Status buttons | Finalized, Needs Work | selected | S19 |
| Date/time picker | due date, open date | - | S17 |
| Modal with checklist | choose students | - | S25 |
| Announcement banner | info | dismissed | S09 |
| Flag chip | Needs review, Concern, Cleared | - | S26 |
| Toast / inbox notification | - | unread, read | all |

## Inferred data model

```
User         id, name, email, role (student | teacher), auth_provider (password | google | clever | canvas)
             evidence: S01, help "creating an account"; confidence: high
School       id, name; Teacher n-1 School
             evidence: pricing tiers by school; confidence: medium
Course       id, title, language, grade_band, is_template (catalog), owner_id
             evidence: S15 catalog, Courses app; confidence: high
Unit/Lesson/Activity   id, course_id, parent_id, order, kind (video | slides | example | exercise | quiz | project | assessment), points, lesson_plan_ref
             evidence: S16 tree, platform page; confidence: high
Section      id, teacher_id, course_id, name, school_year, class_code, source (code | google | clever), block_or_text, focus_mode_state
             evidence: S11, S12, S09; confidence: high
Enrollment   section_id, student_id, group_id?, joined_at
             evidence: S13; confidence: high
Group        id, section_id, name
             evidence: S23 group dropdown; confidence: medium
Assignment   id, section_id, activity_id, due_at, opens_at, locked, points_override
             evidence: S17; confidence: medium (name is a guess; the data is per section and activity)
Autograder   id, activity_id, kind (output | function | input | html), cases [{input, expected, args, hidden?}]
             evidence: help "autograders"; confidence: medium on field names
Submission   id, student_id, activity_id, code, status (not started | submitted | Finalized | Needs Work), autograder_passed, score, feedback, submitted_at
             evidence: S19, S20; confidence: high
CodeSnapshot id, student_id, activity_id, code, saved_at, reason, pasted_fraction
             evidence: S26 code history; confidence: medium
GradebookEntry  section_id, student_id, assignment_id, points, category_id; Category(weight)
             evidence: S21; confidence: medium
Presence     student_id, last_active_at, current_activity_id  (active = within 6 min)
             evidence: S23; confidence: high
IntegrityFlag   id, submission_id, kind (paste | low_history | similarity | too_fast | tool), score, state (needs_review | concern | cleared)
             evidence: S26; confidence: high
Message / Conversation   id, section_id, from, to?, assignment_id?, body, read
             evidence: S27; confidence: medium
Badge, Attendance(date, student, status)   evidence: S28, S29; confidence: medium
```

Relationships: Course 1-n Unit 1-n Lesson 1-n Activity; Teacher 1-n Section; Section n-1 Course; Section 1-n Enrollment n-1 Student; Activity 1-1 Autograder; Student 1-n Submission 1-n CodeSnapshot; Submission 1-n IntegrityFlag; Section 1-n Assignment (due dates).

## Feature matrix

See `features.csv`. Must: 14, should: 20, could: 15, skip: 7. The `clone` column here reflects what ClassFlow already has today, not a blank start.

## Out of scope (cannot or should not be cloned)

- The 100+ courses, videos, lesson plans, problem guides and solutions: CodeHS owns them. ClassFlow uses the teacher's own content.
- District/LTI/Clever/ClassLink integrations: partner agreements, and not needed for one lyceum.
- Certifications and proctored industry exams, Cyber Range, PD catalogue: licensed content and services.
- Tynker, Karel/Tracy worlds, p5.js and other branded environments.
- Paid AI products with CodeHS credits (AI Creator, AI Grading): can be rebuilt with the existing `cf-ai` function, but without their prompts or content.
- Student-created websites moderation, typing course, career center: low value for this goal.

## Size

Screens 31, flows 7, entities about 14. Whole CodeHS: XL, rescope. The slice that fits a lyceum (S04 to S06, S13, S16, S19-S21, S23-S26, S28): L as a quarter, M for what remains after what ClassFlow already has.
Hard parts: (1) browser IDE with a sandboxed language runtime and a safe autograder (Python is done via Pyodide; Java/C++ would need a server runner); (2) grading that cannot be cheated, because tests run in the student's browser and the result is client-trusted; (3) live presence and progress for a whole school without hitting realtime limits.
Size: L.

## Notes for the next step

- ClassFlow already has: join by code and QR, live lesson with slides, Python IDE with Check, hidden tests and hint, paste report, away tracking, remote lock, groups, scoring, attendance, AI slide/plan generation.
- The real gaps against CodeHS are the course tree with persistent homework (ClassFlow is lesson-session-centred), due dates, gradebook, code history and replay, similarity check, and Fast Grade.
- To go deeper (exact IDE layout, gradebook screens), the user should walk through his own CodeHS teacher account with screenshots; this recon did not touch an account.
