---
name: init
description: This skill should be used when a moderator starts accompanying an educational program and runs "/moderator:init", or asks to "set up the event folder", "start the moderator report", "load the event program", "настроить папку мероприятия", "начать отчёт модератора", "загрузить программу мероприятия", "создать чек-лист отчёта модератора" (in any language). It requests the event program (text or document), creates the event folder structure (program and materials, artifacts by day with photos and files, reflection notes by day, report), offers the default report template or the moderator's own (compiled into a report profile), and builds a completeness checklist from it.
argument-hint: "[путь к программе или текст программы]"
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TodoWrite, WebFetch, Bash(mkdir:*), Bash(cp:*), Bash(mv:*), Bash(ls:*), Bash(bash:*), Bash(node:*), Bash(python3:*)
---

# Moderator companion: setup

Set up the current folder (`$PWD`) as the working folder of one educational
program for one moderator. The run ends with the moderator told that setup is
complete and what to do next.

Talk in the moderator's language and follow the dialogue shapes from
interaction.md. Read before starting:

- `${CLAUDE_PLUGIN_ROOT}/references/interaction.md` — dialogue rules (mandatory).
- `${CLAUDE_PLUGIN_ROOT}/references/workspace.md` — folder tree, `state.layout`,
  `state.json`. Paths below use the default names; substitute `state.layout`.

Load when needed: `${CLAUDE_PLUGIN_ROOT}/references/program-parsing.md`
(steps 2–3) and `${CLAUDE_PLUGIN_ROOT}/references/checklist.md` (step 5).

Create tasks for steps 1–6 with the task tools at the start and update them.

## Step 0 — existing setup

Read `.moderator/state.json`.

- **Absent** → step 1.
- **`setup_complete: false`** → resume silently from the first unfinished step:
  no `программа.md` → 2; `blocks_confirmed` false → 3; `structure_ready` false → 4;
  no template / checklist → 5.
- **`setup_complete: true`** → show the status (`node ${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs --json`,
  presented as a short table) and end the turn with: «Папка уже настроена. Что
  сделать: дополнить недостающее, заменить программу или пересоздать чек-лист по
  новому шаблону?». On the reply:
  - *Дополнить* — create missing folders for existing days, re-check template and
    checklist, nothing else.
  - *Заменить программу* — re-parse (steps 2–3); keep slugs of days whose dates
    did not change, create folders for new dates, never delete or rename existing
    folders; list folders of days that disappeared and ask what to do with them.
  - *Пересоздать чек-лист* — take the new template (step 5), regenerate the
    checklist carrying over ticks (checklist.md «Who ticks what»).

Re-running init never deletes captured files.

## Step 1 — request the program

If `$ARGUMENTS` contains a path, a link or the program text, use it. Otherwise
look for likely program files in `$PWD` (names containing «программ», «расписан»,
«program», «schedule», day-named images like «28 апреля.webp»). Found → ask with
a self-contained `AskUserQuestion` that names the files («Использовать как
программу: 28 апреля.WEBP, 29 апреля.WEBP …?»). Nothing found → end the turn with
(in the moderator's language):

> Чтобы подготовить папку, пришлите программу мероприятия: перетащите файлы в
> чат (pdf, docx, картинки по дням — подойдёт всё), дайте ссылку или вставьте её
> текстом. Если есть установки на проход или другие документы организаторов —
> их тоже можно приложить сразу.

Links: `WebFetch` (Google Docs: `/export?format=txt`). Images pasted without a
path: see interaction.md «Files without a path».

## Step 1a — languages and folder names

Set `state.language.dialogue` from the moderator's messages and
`state.language.report` from the program language (update it at step 5 if the
template is in another language). Build `state.layout` (workspace.md «Languages
and folder names»): Russian defaults for Russian, the same structure translated
for any other dialogue language. Then create the first folders and the state:
`mkdir -p .moderator "<program>/<программа>" "<program>/<установки>" "<program>/<документы>"`
and write `state.json` with `structure_ready: false`, `setup_complete: false`.

## Step 2 — parse the program

Follow program-parsing.md:

1. Copy originals into `<program>/программа/`; установки and other documents, if
   attached, into `установки/` and `документы/`. Loose files from `$PWD` root are
   moved there after the confirmation in step 1.
2. Read every source, write `программа.md`, extract event name, location, dates.
3. Fill `days[]` with all rows and the proposed `kind` / `in_report`; every day
   gets `schedule: {status: "pending", files: [], received_at: null, changes: []}`
   — even if the program came as per-day cards: these are the plan, the actual
   schedule of each day is requested during the program
   (`${CLAUDE_PLUGIN_ROOT}/references/day-schedule.md`).

Missing essentials (year, event name): one self-contained `AskUserQuestion` or
one chat line, then wait.

## Step 3 — confirm the moderator's blocks

Show the per-day table of proposed blocks and end the turn (program-parsing.md
«Confirming with the moderator»). On the next turn apply the edits; ask about
remaining `?` rows with a self-contained `AskUserQuestion` (`multiSelect`, the
block names and times inside the options). Set `blocks_confirmed: true` and save
`state.json`.

## Step 4 — create the structure

With the names from `state.layout`, create in one `mkdir -p`:
`<artifacts>/<common>/{<photos>,<files>}`, `<reflection>/<common>`, for every day
`<artifacts>/<slug>/{<photos>,<files>}` and `<reflection>/<slug>`, and the four
report subfolders. Set `structure_ready: true` — from now on
`/moderator:capture` works, even before the template arrives.

If other loose files lie in the folder root (photos, notes), only list them in
the final message and suggest `/moderator:capture` — do not sort them here.

## Step 5 — template, profile and checklist

Read `${CLAUDE_PLUGIN_ROOT}/references/report-profile.md` first.

1. Look for a template-like file: files in `$PWD` and `<program>/документы/`
   whose name contains «шаблон» / «template» (`.docx`, `.doc`, `.pdf`, `.md`,
   `.pages`), excluding the report folder.
2. Ask which template to use — one self-contained `AskUserQuestion`, exactly as
   report-profile.md «Choosing the template» describes: «Шаблон по умолчанию
   (рекомендую)» / «Загружу свой шаблон» (a found file comes first as «Использовать
   найденный: <имя>»).
3. Then:
   - **default** → copy `${CLAUDE_PLUGIN_ROOT}/assets/templates/default/профиль.md` and `шаблон.md`
     into `03-отчет/шаблон/` (report-profile.md «Default profile»);
   - **own / found** → wait for the file if needed (end the turn with «Пришлите
     шаблон отчёта (docx, pdf, ссылку или текст)»), then compile the profile
     (report-profile.md «Compiling a profile…»): reuse the default profile when it is
     the same template, otherwise write `профиль.md`, show the summary and end the
     turn for «ок» or corrections.
   - The moderator wants to decide later → keep `template.source: null`, skip to
     step 6 and say the checklist will be built once the template is chosen
     (re-run `/moderator:init`).
4. Write the checklist from the profile (`${CLAUDE_PLUGIN_ROOT}/references/checklist.md`), update
   `state.template` and `state.language.report`.
5. Header fields (ФИО, номер стола, список группы): mention in the final message
   that they can be sent any time via `/moderator:capture`. If the moderator has
   already given them, store in `state.moderator` and tick the checklist items.

## Step 6 — finish

Set `setup_complete: true` only if the checklist exists. Save `state.json`, run
`node ${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs --json`, then tell the moderator
(short, in the dialogue language):

1. **Summary:** setup is complete (or: complete except the template — what that
   means); the folder structure as a compact tree with days and dates; how many
   blocks per day go into the report.
2. **Quick guide:** the text from `${CLAUDE_PLUGIN_ROOT}/references/user-guide.md`,
   in the dialogue language, with the real folder names. Always show it in full —
   it is the only place where the moderator learns the signal words («готово»,
   «дальше») and the `/moderator:build` variants.

End the turn there — no dialog after the summary.

## Additional resources

- `${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh` — text from docx/doc/rtf/pdf/pages.
- `${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh` — HEIC/WEBP → jpg for reading.
- `${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs` — workspace status (`--json`).
