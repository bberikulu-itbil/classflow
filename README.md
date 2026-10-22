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
- Make a planned tab real: add `to: 'route'` in `config.ts`, then register its view under `role:section:sub` in `VIEWS` (`src/nav/SectionPage.tsx`).
- Desktop: the button at the top collapses the menu to icons (remembered in `localStorage.cf_nav_collapsed`); a hover or keyboard focus on an icon shows the section name. Phone: top bar + drawer (Esc closes, focus stays inside).
- Keyboard: the first Tab stop is «Негізгі мазмұнға өту» (skips the menu).
- The lesson and plan editors, the remote, the board and the student live-session view open full screen, without the menu.
- Tests: `python3 replica/e2e/nav.py` (needs a built `dist/`, see the header of each script), plus `happy.py` and `edge.py`.
- Tasks › Jeopardy (`src/views/Jeopardy.tsx`): build a board (up to 6 categories x 5 questions), play it in class with teams, «🔗 Сілтеме» packs a game into a link (`#jeopardy/<packed game>`), «Толық экран» uses the Fullscreen API. Games are rows of `cf_jeopardy`: run `supabase/006_jeopardy.sql` once in the Supabase SQL editor. Until then (and in `?demo`) they stay in this browser (`localStorage.cf_jeopardy_<user id>`), the page says so, and a button moves them to the account once the table exists. Tests: `replica/e2e/jeopardy.py`, `jeopardy_cloud.py`.
- Themes: Жарық, Қараңғы, Теңіз, Құм (profile page). Tokens per theme live in `src/styles/tokens.css` (`[data-theme=...]`); the old slate/blue/... classes are mapped onto the same variables in `index.html`, so old screens follow. Saved in `localStorage.cf_theme`, applied before first paint. Test: `replica/e2e/theme.py` (axe colour contrast on key screens in every theme).
