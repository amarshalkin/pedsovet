# Writing the report

The structure, the field rules, the formatting and the tone come from the report
profile `03-отчет/шаблон/профиль.md` (report-profile.md): `## Скелет` is followed
exactly, every field is written by `## Правила полей` in the manner of
`## Примеры`. This file covers what does not depend on the template: sources,
drafts and finals, placeholders, assembly mechanics. When the profile disagrees
with it, the profile wins. Write in `state.language.report`; the examples below are
Russian because the default profile is.

## Sources for a day, in priority order

1. Moderator's answers and comments in this build session.
2. `02-рефлексия/<slug>/` — reflection notes, observations (`наблюдения-модератора.md`).
3. `00-программа-и-материалы/установки/` — the brief for the day: the main source
   for «Задача блока».
4. `days[].blocks` — the day's slots: from the received day schedule, or from
   the program when there is none (`schedule.status`). Block titles exactly as
   written there; `программа.md` for places and speakers.
5. `01-артефакты/<slug>/` — look at the photos (via converted jpg) to know what the
   group produced; files (presentations, docs) for content.
6. `02-рефлексия/общие/`, `00-программа-и-материалы/документы/` — only when relevant.

Notes often mix days (an evening reflection of day 2 can be written on day 3,
«главное вчерашнее» of day 3 talks about day 2). Attribute theses to the block
where they were said, and say so in the draft if uncertain.

## Day draft (`03-отчет/дни/день-<n>.черновик.md`)

```markdown
## 29.04.2026

### Установка на день. Главное вчерашнее
#### Задача блока.
<1–2 sentences: what should have happened and why, in the logic of the program>
#### Тезисы участников (ключевые тезисы)
- <verbatim thesis>.
#### Комментарий модератора
<paragraph(s)>

### Проектная работа. Блок 1
…

### Осмысление дня
#### Тезисы участников (ключевые тезисы)
- …
#### Комментарий модератора
…

> **Вопросы к модератору по дню 2**
> 1. Как менялась динамика группы на проектной работе (блок 2)?
> 2. …
```

- The block title as `###` exactly as in the day's blocks; the field names as the
  profile's skeleton gives them.
- Fill each field by its rule in `## Правила полей` (purpose, sources, length,
  tone); match the level of detail of `## Примеры`, never copy them.
- A field whose source is thin: write only what the material supports; a field
  that should be derived (e.g. a block's task from установки) but has no source:
  a cautious version marked `[[проверить]]`.
- Participants' quotes are verbatim (interaction.md «Never invent»); keep the
  moderator's markers like «(мастер-класс)», expand «мк» → «мастер-класс».
- Placeholders `[[нужно: …]]` for every missing piece; collect them into the
  «Вопросы к модератору» quote block at the end of the draft (max 5 questions,
  most important first).
- Blocks with no material at all: keep the heading and the «Задача блока», put
  one placeholder in the comment.
- Mention artifacts inline where they belong: `{{фото: 01-артефакты/день-2_29-04/фото/3.HEIC}}`.
  These markers are resolved at assembly; do not embed images in drafts.

## Day final (`03-отчет/дни/день-<n>.md`)

Same structure, with the moderator's comments and observations merged in:

- Integrate observations into the relevant «Комментарий модератора», keeping the
  moderator's wording where possible (light editing for grammar only).
- Remove every resolved placeholder and the questions block. A placeholder the
  moderator did not answer (including a plain «ок») stays in the final as it is —
  never fill it in yourself; mention the remaining ones once when presenting the
  final. Phase D lists them again before building.
- Comments the moderator gave about the program in general (not this day) go to
  `02-рефлексия/общие/наблюдения-модератора.md` for the final section.

## Final section (`03-отчет/дни/итоги.черновик.md` → `итоги.md`)

Fill the profile's end-of-program part of the skeleton by its field rules. Typical
sources: the last day's presentation materials, expert comments (ask — they are
rarely in notes), the final reflection, the moderator's own debrief, the
whole-program picture from all final day files. Names come from
`moderator.group`; ask before writing anything negative about a person.

## Assembly (`03-отчет/сборка/отчет.md`)

Order: header → days 1..N → final section → links → appendices. Skip days that
have no `in_report` blocks (arrival/departure days). Links come from the `.md`
link stubs in every `файлы/` folder plus `state.digitization.source` when the
digitization came from a link.

The title, the header fields and the order of the closing sections come from the
profile's `## Скелет`: header (slots filled from `state.event` and
`state.moderator`) → the day finals → `итоги.md` → links → appendix.

Artifacts:

- Resolve every `{{фото: …}}` marker into an image plus its digitization, right
  where the marker stands (the template places flipcharts inside the block).
- Photos of a day that no marker references go to the end of that day under
  `### Фиксация работы группы`.
- General photos and anything left go to the appendix.
- Image syntax: `![<caption>](images/<slug>/<name>.jpg){width=15cm}`; images are
  the converted jpg copies under `03-отчет/сборка/images/<slug>/` (copy from
  `03-отчет/оцифровка/jpg/<slug>/`, or convert with
  `bash ${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh --out 03-отчет/сборка/images/<slug> 01-артефакты/<slug>/фото`).
  Converted names never contain spaces or brackets, so plain `(…)` links are safe;
  for any other path with spaces use `![…](<path with spaces.jpg>)`.
- Digitization goes right under the image: flipchart content as headings/lists,
  cards as a pipe table `| № | Тип | Распознанный текст |`.
- Group photos (people at work) get a caption only, no digitization.

Formatting follows the profile's `## Оформление`; fonts and spacing come from
`reference.docx` at build time, so the markdown never sets them. Check the
assembled file with `lint-report.mjs --mode report` (report-profile.md «How build
uses the profile») before building.

Build: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/build-docx.sh 03-отчет/сборка/отчет.md "03-отчет/<file name>" --lang ru-RU`
(`--lang` = the report language as a BCP 47 tag; it sets spell-check language in Word).
If the docx is larger than ~25 MB, re-compress and rebuild:
`bash ${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh --force --max 1280 --quality 70 --out 03-отчет/сборка/images/<slug> 01-артефакты/<slug>/фото`
for every day (and `общие`), then run the build command again.

File name: `node ${CLAUDE_PLUGIN_ROOT}/scripts/report-filename.mjs --json` (reads
`.moderator/state.json`) → `file`. The formula:

`Отчет_модератора_<Фамилия>_<И.О.>_<стол_N | столы_N_M>_<программа>_<даты>.docx`,
e.g. `Отчет_модератора_Маршалкин_А.С._стол_9_директор_на_высоте_02.11-05.11.2026.docx`.

- Name — `state.moderator.name_short` («Маршалкин А.С.»), else parsed from
  `state.moderator.name`. Warning `name-order` (two full words, order unclear) →
  set `name_short` yourself when the order is obvious, otherwise ask with the
  header question.
- Tables — `state.moderator.tables` or `table`: one → `стол_9`, several →
  `столы_9_10`.
- Program — `state.event.short_name` if set; otherwise the quoted proper name
  from `state.event.name` («Директор на высоте»), or the name without subtitle and
  year; lowercase, words joined by `_`, at most 30 characters, cut by whole words
  (`shortened: true`). A cut that loses the sense → write a better
  `state.event.short_name` (up to 30 characters, recognisable to the program
  team) and run the script again.
- Dates — the first and last day of the program: `02.11-05.11.2026`,
  `30.12.2026-02.01.2027` across years, `02.11.2026` for one day.
- A part with no data is left out and listed in `missing`.
- Report not in Russian: the labels follow `state.language.report` (`en`:
  `Moderator_report`, `table`, `tables`); for another language pass
  `--labels "<prefix>,<table>,<tables>"` translated.

The moderator's own template prescribes another naming → follow the template.
Write both paths into `state.report`.
