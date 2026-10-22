# Bugs found by replica-test (2026-10-22)

## B-001 · S2 · Checking an infinite loop freezes "Тексеру" for 2 minutes — FIXED
Steps: open a homework with 3 tests, type `while True: pass`, press Тексеру.
Expected: a stop message within a few seconds. Actual: spinner for 120 s (measured). Each test waited the 40 s "first load" limit because a killed Python worker restarted as cold.
Cause: `utils/pyodide.ts` used one timer for loading and running. Fix: Python loads once in the worker; the 6 s run limit starts after it is ready; a second test is skipped after the first timed out; Python is warmed when the code screen opens. Now 11 s. Test: `e2e/edge.py` E6. The live-lesson code widget uses the same runner and gets the faster stop too.

## B-002 · S3 · Teacher could save any number of points (99999) — FIXED
Steps: review a work, type 99999 in Ұпай, Бағалау. Expected: refused. Actual: saved; a gradebook would show 99999 of 5.
Cause: no upper bound in the UI or in `cf_hw_grade`. Fix: server refuses points outside 0..max (`supabase/005_grade_max_points.sql`, applied) and the demo layer does the same; the UI shows the server message. Checked live in a rolled-back transaction.

## To check (not reproduced)

- T-1 The weak N1 test only proves "failing code is not submitted"; the wording of the on-screen message was not asserted.
- T-2 If the Pyodide CDN is blocked (school filter), the student should see "Python жүктелмеді…" after at most 60 s. Written, not tried in a browser.
- T-3 Old components (BTN_P, BTN_G, toasts) still use `text-white`/low-contrast leftovers on the light theme (from the first audit). Not part of this layer.
