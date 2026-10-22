# Components

Source: the component list in `../recon.md`, minus anything that is CodeHS's own look. Roles come from `tokens.json`; never raw hex. Icons: Lucide (MIT), already installed (`lucide-react`). Copy is Kazakh and written fresh. Tap targets are at least 44px on phones (`tap-min`); the teacher remote uses 56-64px for its main buttons.

Every interactive part: real HTML element, visible focus (`outline: 2px solid accent; outline-offset: 2px`), works with the keyboard alone, and never uses colour as the only signal.

---
Button
  variants  primary (accent), secondary (surface-2 + text), ghost (text only), danger (danger + on-danger), success (success + on-success)
  sizes     sm 32px, md 44px, lg 56px (remote nav: 64px)
  states    default, hover (accent-hover), active, focus-visible, disabled (50% opacity, `disabled` attribute, tooltip says why), loading (spinner, label kept for screen readers, `aria-busy`)
  tokens    radius md, font sm/600, motion fast
  a11y      `<button type="button">`; links styled as buttons are `<a>`; icon-only buttons get `aria-label`
  used on   all screens
  note      fixes the audit bug: the primary and success buttons set their own text colour (`on-accent`, `on-success`), they never inherit it

Input / Textarea / Select
  variants  text, password, number, textarea, select
  states    default (border-input), focus (accent ring), filled, error (danger border + message under it), disabled, read-only
  tokens    bg surface, text text, placeholder text-muted, radius md, height 44px
  a11y      a `<label>` for every field; error message linked with `aria-describedby`; `aria-invalid`
  used on   S01, S02, S12, S17, S19, S27, profile
  note      text is dark on a light field; never `text-white` inside an input

Card / Panel
  variants  flat (border), raised (shadow card), tinted (info-soft, for hints)
  tokens    bg surface, border, radius lg
  used on   S03, S09, S16, S22

Status chip
  variants  not_started, draft, submitted, late, needs_work, finalized (see `tokens.json` status)
  tokens    xs/500, radius pill, padding 4px 10px
  a11y      the label is text ("Тапсырылды", "Кешікті", "Қайта жасау керек", "Бағаланды"); colour is extra
  used on   S04, S16, S19, S20, S21, S22, S23

Progress bar
  variants  lesson progress, course progress, tests passed (3/5)
  states    empty, partial, full (success), overdue (warning)
  a11y      `role="progressbar"` with `aria-valuenow/min/max` and a text value next to it
  used on   S04, S14, S22

Course tree (unit > lesson > activity)
  variants  student (status chips, lock icon), teacher (adds assign, preview, grade, configure icon buttons)
  states    expanded, collapsed, locked (not open yet), done, overdue
  a11y      `role="tree"`/`treeitem` or nested disclosure buttons with `aria-expanded`; arrow keys move
  used on   S04, S15, S16
  note      the four teacher actions are text buttons with icons, not four unlabeled coloured icons

Code editor (IDE)
  layout    two columns on md and up (`2fr 3fr`: task on the left, editor on the right); one column on phones with tabs "Тапсырма / Код / Нәтиже"
  parts     toolbar (Іске қосу, Тексеру, Тапсыру, file name), gutter with line numbers, text area, stdin line, console, test panel
  states    clean, running (buttons disabled, "Орындалуда"), error (traceback in console), tests failed, all passed, submitted, locked/closed, read-only (teacher review)
  tokens    code-bg, code-text, code-gutter-*, console-*; font mono 14/24
  a11y      editor is a labelled `<textarea>`; Tab inserts spaces, with Esc then Tab to leave (document it in a hint); results announced in an `aria-live="polite"` region
  used on   S06, S08, S19
  note      today's editor is a plain textarea with a line gutter. CodeMirror comes later (not in this plan).

Test result row
  variants  visible test (shows input, expected, got), hidden test (label and pass/fail only)
  states    pass (success-soft + success), fail (danger-soft + danger), running, skipped
  a11y      the icon plus the words "өтті" / "өтпеді"
  used on   S06, S19

Hint box
  states    collapsed, one hint shown, all shown (button disabled)
  tokens    info-soft, accent text
  used on   S06

Code history pane
  variants  list of snapshots (time, reason, size), diff view, pasted text highlighted with a left bar plus the word "қойылған"
  states    empty, loading, long list (virtualised after 100)
  used on   S06, S19, S26

Side-by-side diff
  variants  student vs reference solution, student vs student
  tokens    mono 13/20, added = success-soft, removed = danger-soft, with +/- marks
  a11y      the marks are in the text, not colour alone; horizontal scroll with keyboard focus
  used on   S20, S26

Data table
  variants  roster, submissions, gradebook (sticky first column and header), similarity matrix
  states    loading (skeleton rows), empty ("Әзірге ешкім жоқ"), filled, sorted, filtered
  a11y      `<table>` with `<th scope>`; sort buttons carry `aria-sort`; on phones the gradebook scrolls sideways inside a labelled region
  tokens    surface, border, hover = surface-2
  used on   S13, S19, S20, S21, S26

Row menu ("...")
  states    closed, open, item disabled
  a11y      menu button `aria-haspopup="menu"`, Escape closes, focus returns to the button
  used on   S11, S13, S16

Dropdown (section / course / group)
  states    closed, open, selected, empty
  a11y      native `<select>` unless search is needed
  used on   S16, S13, S22, S23

Tabs
  variants  top tabs (teacher remote), segmented (IDE on phones)
  a11y      `role="tablist"`, arrow keys, `aria-selected`
  used on   S06 (phone), remote view

Date-time picker
  base      native `<input type="datetime-local">`, shown and entered in the school's time zone (Asia/Qostanay)
  states    empty, set, error (due before open), disabled
  used on   S17

Modal / dialog
  variants  confirm (danger), form, student picker (checkbox list)
  a11y      native `<dialog>` or Radix; focus trap; Escape closes; focus returns; background inert
  used on   S25, delete confirmations

Toast
  variants  success, error, info
  tokens    on-success / on-danger text on a solid fill, 4s, `role="status"` (error: `role="alert"`)
  note      fixes the audit bug: toast text is set explicitly, not inherited

Announcement banner
  variants  info, warning
  states    visible, dismissed (remembered per user)
  used on   S09

Flag chip
  variants  needs_review (warning), concern (danger), cleared (success)
  a11y      text label; tooltip explains in one line that a flag is not an accusation
  used on   S26, S19

Left navigation / top bar
  teacher   top bar with logo, section switch, profile button; app drawer grouped like the recon: Сынып, Тапсырмалар, Бағалау, Мазмұн
  student   top bar with logo and profile button
  states    active, hover, collapsed on phones (drawer)
  used on   all

Empty state
  parts     small Lucide icon, one sentence, one action
  note      each screen gets its own sentence ("Әзірге тапсырма жоқ. Мұғалім бергенде осында көрінеді.")
  used on   every list

Skeleton loader
  used on   tables, course tree, IDE while Pyodide loads ("Python жүктелуде, бірінші рет 10-20 секунд")

Board / projector mode
  tokens    type `board` (56/60), high-contrast only (text on surface), no hover-only information
  used on   board view

Teacher remote
  tokens    remote-max 576px, buttons 56-64px, one hand reach: navigation at the bottom of the screen
  used on   remote view

---
Not built from the original: CodeHS's icons, illustrations, wording, orange/purple icon colours, its exact IDE layout. Layout roles (tree, two-column IDE, table of submissions) are common patterns and are kept.
