---
name: capture
description: This skill should be used when a moderator runs "/moderator:capture" or, during an educational program, sends material to file — "capture today's results", "here are today's notes", "add reflection", "зафиксировать результаты", "добавить рефлексию", "вот заметки за сегодня", "вот фото с проектной работы", "сохранить фото флипчартов", "загрузить артефакты дня", "положить документ в материалы", "записать наблюдения по группе" (in any language). Files reflection notes, photos, artifacts and general documents by day, asking about the day only when unclear and never for general documents, and gently reminds about gaps.
argument-hint: "[день] [файлы или текст заметки]"
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TodoWrite, WebFetch, CronCreate, Bash(mkdir:*), Bash(cp:*), Bash(mv:*), Bash(cmp:*), Bash(ls:*), Bash(bash:*), Bash(node:*), Bash(sips:*), Bash(mdls:*)
---

# Moderator companion: capture

Put what the moderator brings into the right place of the event folder, keep the
checklist current and point out what is still missing — without making anything
mandatory.

Talk in the moderator's language and follow the dialogue shapes from
interaction.md. Read first: `${CLAUDE_PLUGIN_ROOT}/references/interaction.md` and
`${CLAUDE_PLUGIN_ROOT}/references/workspace.md`. Paths below use the default
names; substitute `state.layout`.

If `.moderator/state.json` is missing or `structure_ready` is false, say that the
folder is not set up yet and suggest `/moderator:init`; stop. A missing template
does not block capture — it is one more gentle reminder.

## Step 1 — gather the input

Sources, all optional and combinable:

- `$ARGUMENTS`: paths, a day hint («день 2», «29.04», «вчера», «сегодня»), pasted text;
- files the moderator attached or dragged into the chat; a folder path — every file inside;
- loose files in the event folder root (`loose` in
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs --json`) — **only** when nothing
  else was given, and only after the moderator confirmed the list (shape 2:
  a self-contained `AskUserQuestion` naming the files).

Images pasted without a file path: interaction.md «Files without a path».

If nothing was given and the root is clean, show the latest started day from
`status.mjs --json` (counts and at most 3 gaps) and end the turn with: «Перетащите
файлы в чат или вставьте текст заметки — я разложу их по дням.»

With more than 3 items, create tasks (one per group: «Разложить фото дня 2»,
«Сохранить заметку рефлексии» …) and update them as you go.

## Step 2 — classify every item

For each item determine **category** and **day**.

| Category | Signals | Destination |
|---|---|---|
| reflection | participants' theses or quotes, «рефлексия», «осмысление», «обратная связь», «главное вчерашнее» | `02-рефлексия/<slug>/` |
| observation | the moderator's own remarks about the group | append to `02-рефлексия/<slug>/наблюдения-модератора.md`; program-wide remarks → `02-рефлексия/общие/наблюдения-модератора.md` |
| photo | image files | `01-артефакты/<slug>/фото/` |
| artifact | presentations, docs, tables, links produced by or for the group | `01-артефакты/<slug>/файлы/` |
| document | program, установки на проход, group lists, guides, partner materials | `00-программа-и-материалы/{программа,установки,документы}/` — no day |
| header data | ФИО модератора, номер стола, список группы | `state.moderator` + checklist |

A group list is both: copy it to `документы/` **and** parse the names into
`state.moderator.group`. A report template sent now → copy it to `документы/`
and suggest re-running `/moderator:init` to build the checklist.

Read text files with `bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh <file>`
(a short look is enough; on exit code 5 file the item without reading it). For
photos run `node ${CLAUDE_PLUGIN_ROOT}/scripts/photo-dates.mjs <files>` on the
originals — it matches the capture time to the day and program block.

Day, strongest signal first:

1. the moderator's explicit hint for this batch (applies only to day-bound
   categories, never to `document`);
2. an explicit date in the file name or text («29.04», «29 апреля»);
3. photo capture time from `photo-dates.mjs`;
4. content: block titles, lecture/speaker names from `программа.md`; relative
   words («вчера», «сегодня», «главное вчерашнее») resolved against the note's own
   date (`mdls -raw -name kMDItemContentCreationDate <file>` on macOS, otherwise the
   file's modification time) or, for pasted text, against today;
5. a «день N» label in a file name — weaker than content: «обратная-1-день» may
   describe the second day's discussion.

General items (documents, a photo or note about the whole program) need no day:
put them into the `общие` / `00-…` folders and never ask for a day.

## Step 3 — clarify only what is unclear

Collect the items whose day or category stays ambiguous and ask in one
self-contained `AskUserQuestion` call — up to 4 questions. Each question names
its item (file name + a few words of content, or «12 фото без даты съёмки»).
Options: for the day — the 2–3 most likely days with dates plus «Общее, без
дня»; for the category — the 2–3 plausible categories. Most likely first, marked
«(рекомендую)». More than 4 unclear groups → a second call after the first.

Do not ask about items classified with confidence.

## Step 4 — place the files

- Files from outside `$PWD` are copied; confirmed loose files from the root are
  moved. Keep original names; skip a file identical to one already at the
  destination (`cmp -s`); for different files with the same name add ` (2)`.
- Pasted text → new `.md` files (workspace.md); links → `.md` stubs; a public
  document link may be `WebFetch`ed once for a short summary in the stub.
- Header data → `state.moderator`.
- `state.json`: one `log` entry per (day, category) group; day `status`
  `pending` → `collecting`.
- Checklist: tick the matching «Материал: …» items (checklist.md «Who ticks
  what»); never untick.

## Step 5 — report and remind

Reply briefly, then end the turn:

1. what went where, grouped by day («День 2 (29.04): 3 фото → проектная работа,
   блок 1; 1 заметка рефлексии»), general items separately;
2. at most 3 reminders, following interaction.md «Reminders»: gap codes from
   `status.mjs --json` (skip keys in `dismissedReminders`), plus what is visible
   from the material — e.g. a presentation day without the group's final
   materials, the template still missing, header fields still empty;
3. if the day is over (its date is before today, or the current time is after the
   end of its last in-report block) and it has no moderator observations, one
   optional line: «Если хотите — напишите пару своих наблюдений о группе за этот
   день, это очень поможет при сборке отчёта.»;
4. during the program, once per session, an optional line: «Могу напомнить
   вечером зафиксировать рефлексию — напишите время.» If the moderator answers
   with a time, create a session-scoped reminder with `CronCreate`; skip silently
   if the tool is unavailable.

A free-text reply to 3 is saved as an `observation`. «Не будет» about a reminder
→ `state.dismissed_reminders`.

Never demand missing items; never block the capture because something is absent.

## Additional resources

- `${CLAUDE_PLUGIN_ROOT}/scripts/photo-dates.mjs` — photo → day/block by capture time.
- `${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh` — read docx/doc/rtf/pdf/pptx/pages.
- `${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs` — per-day counts, gaps, loose files.
- `${CLAUDE_PLUGIN_ROOT}/references/checklist.md` — how checklist items are ticked.
