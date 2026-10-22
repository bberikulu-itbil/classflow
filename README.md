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
- Not yet: the year schedule (КТП slots), lesson columns from sessions, annual grade (`annual()` is ready), students seeing their own marks.
