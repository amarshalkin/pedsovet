# Writing the report

The structure always follows `03-отчет/шаблон/шаблон.md` (section «Структура
(для плагина)»). The rules below describe how to fill it; when the template
disagrees with them, the template wins. Write in `state.language.report`; the
headings and examples below are Russian because the reference template is.

## Sources for a day, in priority order

1. Moderator's answers and comments in this build session.
2. `02-рефлексия/<slug>/` — reflection notes, observations (`наблюдения-модератора.md`).
3. `00-программа-и-материалы/установки/` — the brief for the day: the main source
   for «Задача блока».
4. `программа.md` — block titles exactly as in the program, times, speakers.
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

- Use the program's exact block title as `###`, the template's field names as `####`.
- «Задача блока.» — 1–3 sentences. Derive from установки and the program; if
  neither says anything, write a cautious version and mark it `[[проверить]]`.
- «Комментарий модератора» — follow the template sub-points (emotional state and
  dynamics; content: theses discussed and conclusions; participants' positions).
  4–7 sentences per point when material allows; never pad. Plain observational
  prose in the third person about the group («Группа…», «Участники…»).
- «Тезисы участников» — verbatim from notes (see interaction.md «Never invent»).
  Each thesis is a list item ending with a period. Keep the moderator's markers
  like «(мастер-класс)», «(лекция)» if they are in the notes; expand «мк» → «мастер-класс».
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

Fill the template's end-of-program fields. Typical sources: the last day's
presentation materials, expert comments (ask — they are rarely in notes), the
final reflection, the moderator's own debrief, the whole-program picture from
all final day files. «Комментарий модератора по программе» is the most
analytical part: shift in the group from the first to the last day, what the
moderator did for it, what worked in the program, what to consider next time,
insights about the target audience. Lists of active/inactive participants use
names from `moderator.group`; ask before writing anything negative about a person.

## Assembly (`03-отчет/сборка/отчет.md`)

Order: header → days 1..N → final section → links → appendices. Skip days that
have no `in_report` blocks (arrival/departure days). Links come from the `.md`
link stubs in every `файлы/` folder plus `state.digitization.source` when the
digitization came from a link.

Take the title and the header fields from `шаблон.md` «Структура (для плагина)»;
the block below shows the reference template.

```markdown
# Отчёт модератора Образовательного мероприятия

<event.name>

<event.location>

ФИО модератора: <name>

Номер стола: <table>

Список группы:

- <Фамилия И. О.>;
- <Фамилия И. О.>.

<day finals, each starting with "## DD.MM.YYYY">

<итоги.md>

## Ссылки

- <title>: <url>

## Приложение. Артефакты работы группы
```

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

Formatting rules from the template (applied by markdown + `reference.docx`):

- Bold only for headings — never use `**bold**` in body text.
- Italic `*…*` only for moderator remarks that must stand apart from the text.
- Moderator's own lists: lowercase items ending with `;`, the last with `.`.
  Participant theses keep their own capitalisation and end with `.`.
- No underline, no colours, no HTML.

Build: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/build-docx.sh 03-отчет/сборка/отчет.md "03-отчет/Отчет_модератора_<Фамилия>_<И>_стол_<N>.docx" --lang ru-RU`
(`--lang` = the report language as a BCP 47 tag; it sets spell-check language in Word).
If the docx is larger than ~25 MB, re-compress and rebuild:
`bash ${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh --force --max 1280 --quality 70 --out 03-отчет/сборка/images/<slug> 01-артефакты/<slug>/фото`
for every day (and `общие`), then run the build command again.

File name: follow the template's naming if it gives one; otherwise
`Отчет_модератора_<Фамилия>_<И>_стол_<N>.docx`, without `_стол_<N>` when there is
no table number. Write both paths into `state.report`.
