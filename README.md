# ClassFlow (React SPA)

Interactive classroom teaching, live presentation slides, student interaction, Python coding IDE with Pyodide Web Worker execution, quizzes, and AI-powered lesson planning, built with React, Vite, TypeScript, and Tailwind CSS.

## Getting Started
- Run development server: `npm run dev`
- Build for production: `npm run build`

## Homework (үй тапсырмасы)

Screens: `#assign` (teacher gives a code slide to classes), `#hw` and `#hw/ID` (student list and IDE), `#review/ID` (teacher grades).
Try it without a login: open `/?demo=teacher` (the button in the corner switches role). Demo data lives in memory.
With real logins the screens call the RPC from `replica/schema.sql`, which must be applied to the database first.
