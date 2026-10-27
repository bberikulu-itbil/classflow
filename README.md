# ClassFlow (React SPA)

Interactive classroom teaching, live presentation slides, student interaction, Python coding IDE with Pyodide Web Worker execution, quizzes, and AI-powered lesson planning, built with React, Vite, TypeScript, and Tailwind CSS.

## Getting Started
- Run development server: `npm run dev`
- Build for production: `npm run build`

## Homework (үй тапсырмасы)

Screens: `#assign` (teacher gives a code slide to classes), `#hw` and `#hw/ID` (student list and IDE), `#review/ID` (teacher grades).
Try it without a login: open `/?demo=teacher` (the button in the corner switches role). Demo data lives in memory.
With real logins the screens call the RPC from `replica/schema.sql`, which must be applied to the database first.

## Menu (left navigation)

The whole menu is data: `src/nav/config.ts` (`TEACHER`, `STUDENT`). Each section has sub-tabs; a sub-tab with `to` is a real screen, one without is shown as «Жақында» with the list in `items`.
- **v0.1.0 teacher menu** (7 links): Басты бет, Сабақтар (Менің сабақтарым, Курстар, Модульдер мен дәрістер, редактор, жоспарлар, ортақ галерея), Тапсырмалар (күнделікті, жобалар, Jeopardy, банк, конструктор, тексеру кезегі, бағалау жүйесі), Сынақтар мен сайыстар (БЖБ/ТЖБ, прокторинг, баптаулар, нұсқалар, хакатон/код дуэлі, турнирлер), Журнал (Сабақ журналы `#journal/lessons`, Сынып журналы planned, Сыныптар `#journal/classes`, Есептер және топтар planned), EduStudio (planned), Сөздігім. Settings and profile are one hidden section («Профиль және баптаулар», `#settings/profile`) opened from the profile block at the bottom of the menu (`hidden: true` in `config.ts`; students' block opens `#profile`). The old top-level Курстар, Сайыстар, Сыныптар and Баптаулар are gone from the list. The version comes from `package.json` (`__APP_VERSION__`, shown under the menu). Student menu is unchanged.
- Make a planned tab real: add `to: 'route'` in `config.ts`, then register its view under `role:section:sub` in `VIEWS` (`src/nav/SectionPage.tsx`).
- Desktop: the button at the top collapses the menu to icons (remembered in `localStorage.cf_nav_collapsed`); a hover or keyboard focus on an icon shows the section name. Phone: top bar + drawer (Esc closes, focus stays inside).
- Keyboard: the first Tab stop is «Негізгі мазмұнға өту» (skips the menu).
- The lesson and plan editors, the remote, the board and the student live-session view open full screen, without the menu.
- Tests: `python3 replica/e2e/nav.py` (needs a built `dist/`, see the header of each script), plus `happy.py` and `edge.py`.
- Tasks › Jeopardy (`src/views/Jeopardy.tsx`): build a board (up to 6 categories x 5 questions), play it in class with teams, «Сілтеме» gives two links to the same packed game: play (`#jeopardy/<packed>`, opens the board) and edit (`#jeopardy-edit/<packed>`, opens the editor on a copy: a teacher saves it to their own list, a student gets new links for the edited game to send back, nothing is stored), «Толық экран» uses the Fullscreen API. Games are rows of `cf_jeopardy`: run `supabase/006_jeopardy.sql` once in the Supabase SQL editor. Until then (and in `?demo`) they stay in this browser (`localStorage.cf_jeopardy_<user id>`), the page says so, and a button moves them to the account once the table exists. Tests: `replica/e2e/jeopardy.py`, `jeopardy_cloud.py`.
- Jeopardy side panel «Параметрлер» (`src/views/JeopardyPanel.tsx`, state in `jeopardyStore.ts`): **Көрініс** (theme + text size 87–130 %, `cf_font`), **Қатысушылар** (add names, add a whole class, remove one, random split into 2–8 teams, dealt round-robin from a crypto shuffle), **Ережелер** (wrong answer takes N % of the points, optional floor at 0, note shown on the board), **Тарих** (results of played games; saved automatically when the board is finished or with «Нәтижені сақтау»). The roster, teams and rules live in this browser per user (`cf_jeopardy_setup_<id>`); results go to `cf_jeopardy_runs` (see `supabase/006_jeopardy.sql`) and fall back to this browser while the table is missing, and always for students who open a shared link.
- Lessons › Менің сабақтарым (`src/lessons/`): top filters **Тоқсан** (default = the current quarter, or «Барлығы») and **Сынып**, below one gallery of cards per subject (`LessonsGallery.tsx`; lessons not taught yet always stay visible). A card opens `#lesson/<id>` (`LessonDetail.tsx`): one tab per class, each with its own start button, sessions, per-student table and points, so classes are never mixed. No new tables: a class's results are its `cf_sessions` + `cf_participants` + `cf_scores`. Sessions are tied to a lesson by `lesson_id` when that column exists, else by title (`model.ts`). Quarters are fixed month/day boundaries in `model.ts` (Q1 Sep 1, Q2 Nov 1, Q3 Jan 1, Q4 Mar 29) — swap for the school's calendar if the dates matter to the day.
- Themes: Жарық, Қараңғы, Теңіз, Құм (profile page). Tokens per theme live in `src/styles/tokens.css` (`[data-theme=...]`); the old slate/blue/... classes are mapped onto the same variables in `index.html`, so old screens follow. Saved in `localStorage.cf_theme`, applied before first paint. Test: `replica/e2e/theme.py` (axe colour contrast on key screens in every theme).

## Class gradebook (Журнал › Сынып журналы)
- `src/journal/grades.ts`: the Order No. 125 rules as pure functions (percent → 2–5 at 40/65/85 %, quarter = ҚБ 25 % + БЖБ 25 % + ТЖБ 50 %, БЖБ 7–20 points, ТЖБ 25 or 30). Checked against the printed table: `node replica/unit/grades.test.mjs`.
- Data: `supabase/007_gradebook.sql` (`cf_assessments` columns per class and quarter, `cf_marks` points). Grades are computed, never stored. RLS check: `replica/unit/gradebook_rls.mjs` (PGlite). Without the tables the screen keeps data in the browser and says so.
- An empty cell = not assessed; 0 = a real zero. A missing part (no ТЖБ yet) makes the quarter grade «уақытша».
- Held lessons (started, or dated today or earlier, with a lecture) are offered as ҚБ columns in one click, one column per lesson (`supabase/010_journal_slots.sql` links `cf_assessments.slot_id` to `cf_slots`; run after 007 and 009; check `replica/unit/journal_slots_rls.mjs`). The mark itself is still typed by the teacher: the live-lesson points of `cf_scores` are not converted (their scale is not 1–10).
- «Жылдық баға» table: the four quarter grades and the year (mean of the quarter grades, rounded half up); «уақытша» until four quarters are done or while a quarter is provisional.
- Not yet: students seeing their own marks, reports.

## Content library (Сабақтар › Курстар, Модульдер мен дәрістер)
- Course → Module → Lecture, independent of class, date and year (the ОМЖ part of the three-part model: content / schedule (КТП) / lesson instance).
- A lecture is an existing `cf_lessons` row; `cf_curr_lessons` only records which module it sits in (one module per lesson). Deleting a module or course never deletes lessons.
- Data: `supabase/008_curriculum.sql` (RLS check: `replica/unit/curriculum_rls.mjs`, PGlite). Without the tables the structure stays in the browser and the screen says so.
- Next: КТП (year schedule slots per class), then "start" on a slot creates the `cf_sessions` row and snapshots the lecture.

## Schedule (Сабақтар › КТП)
- Weekly timetable (class, weekday, lesson number) → dated slots of a class per quarter (`src/schedule/plan.ts`: `generate`) → a lecture from the content library is put into each slot. Existing slots are never overwritten; a holiday slot is deleted by hand.
- Data: `supabase/009_schedule.sql` (`cf_timetable`, `cf_slots`; RLS check `replica/unit/schedule_rls.mjs`). Date logic check: `node replica/unit/plan.test.mjs`. Without the tables the schedule stays in the browser and says so.
- Quarter date ranges in the form are approximate defaults (teacher edits); replace with the school calendar when it is stored.
- "Бастау" on a slot calls the existing `cf_start_session` rpc (lecture + the slot's class, 3 groups), stores the live lesson in `cf_slots.session_id` and opens the teacher remote. A started slot shows "Басталды" + a link, and its lecture is locked. Whether the session keeps its own copy of the lecture depends on that rpc (not in this repo).
- Test against a fake Supabase: `replica/e2e/schedule_cloud.py` (rows, start, old 009 without `session_id`, missing tables).
- Next: journal columns come from the started slots.

## Profile and settings (#settings/profile)
- Profile card (initial, name, role, login, school when readable, class for students), appearance, password, sign out.
- «Оқыту баптаулары» (staff only): the four quarter date ranges, the default group count when starting a lesson, the default ҚБ maximum. `src/prefs.ts` holds them (this device only, `cf_prefs`); `quarterOf` (Lessons/Journal filters), the КТП form range, «Бастау» and the journal read them. August cannot be part of a quarter. Check: `node replica/unit/prefs.test.mjs`.

## Vocabulary (Сөздігім)
Teacher: **Терминдер базасы** (kk / ru / en + definition, bulk paste `kk | ru | en | definition`), **Тақырыпқа байлау** (terms of a lesson; saving rewrites the base-made entries of `cf_lessons.terms`, entries typed by hand stay), **Сөздік тесті** (generated multiple choice, answer key, print), **Тарату** (a copy of the terms goes to each chosen class as a set).
Student: **Терминдерім** (sets of the own class, "add to my dictionary" into `cf_my_terms`), **Карточкалар**, **Өзін-өзі тексеру** (10 questions, score).
Needs `supabase/011_vocab.sql` (run after 006–010). Without it the base and sets stay in the browser and the screens say so. Tests: `replica/e2e/vocab.py`, `vocab_cloud.py`, `replica/unit/quiz.test.mjs`, `vocab_rls.mjs`.

## Teacher remote (#remote/<lesson id>)
Uses the theme colours (it was white-on-white in the light themes). Wide screens: slide, next-slide hint, notes and task on the left, class tabs (Сынып, Жауаптар, Ұпай, Қатысу, Слайдтар) on the right; phones: one column with Артқа/Келесі fixed at the bottom. ← and → change slides (not while typing). Every action goes through one `run()` that shows the server's refusal in a status line; ending the lesson asks inline. Test: `replica/e2e/remote.py` (fake Supabase; `SHOTS=dir` saves screenshots).

Modules screen: **Сабақтар** opens on «Модульдер мен дәрістер» (course → module → lecture). Choose a class there and every lecture gets «Бастау · <class>», which starts it as a live lesson at once (`cf_start_session`, groups from the saved default). Tests: `curriculum.py` (C14), `curriculum_cloud.py`.

Module type (needs `supabase/012_module_kind.sql`, after 008): a module is **Сабақ** (school-lesson module, may belong to one quarter; without a quarter it counts for every quarter) or **Курс** (no quarter), with a parallel (own grade, else its course's). The «Сабақтар» tab filters by Осы тоқсан (default) / Барлық сабақтар / Курстар, by parallel, and by course. «+ Жасау» offers «Модуль жасау» and «Дәріс жасау» (modules screen and the lectures list). Without 012 every module shows as a quarter-less lesson module and the type fields are locked with a note. Minimal layout: one compact filter row (chips + parallel/course/class selects), the explanation lives behind the (i) button, each module is a collapsed cover (one open at a time) that shows only its lectures with «Бастау»; the pencil outside the cover switches that module to editing (name, type, quarter, parallel, order, add/remove lectures) and «Дайын» closes it. Tests: `curriculum.py` (F0–F8), `curriculum_cloud.py` (M6–M9), `replica/unit/modfilter.test.mjs`, `module_kind_rls.mjs`.

Slide `code` (+ optional `lang`): `content`, `quiz` and `task` slides can carry a monospace code block that is shown, not run (C++ lectures; `code` slides still run Python only). Check: `replica/unit/slides_code.tsx`.

Lecture preview: `#preview/<lecture id>` (title link in a module, «Көру» on the lecture page) walks the slides read-only with arrows, a jump list and the teacher notes / right answers under the slide; no class or live session needed. Editing stays at `#edit/<id>` (pencil in module edit mode). Tests: `curriculum_cloud.py` (P1–P5).
