# Parsing the event program

Programs arrive in any shape: one image per day (schedule screenshots), a PDF,
a .docx, a pasted list. The goal is a normalised `программа.md` and the
`days[]` array of `state.json`.

## Reading the source

| Source | How to read |
|---|---|
| .docx .odt .rtf .txt .md | `bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh <file>` |
| .pdf with text | same script; exit code 4 means no text layer → read pages with `Read` |
| .webp .heic .png .jpg | `bash ${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh --out .moderator/tmp <files>` then `Read` each jpg |
| pasted text | parse directly |
| several files (one per day) | read all, order by the date printed inside, not by file name |

Copy every original into `00-программа-и-материалы/программа/` before parsing.

## Normalised program (`программа.md`, in the report language)

```markdown
# <Название мероприятия>
Место: <адрес>
Даты: 28.04.2026 — 01.05.2026

## День 1 — 28.04.2026, вторник
| Время | Блок | Место / ведущий | В отчёт |
|---|---|---|---|
| 07:30–08:00 | Зарядка | Спортивный зал | — |
| 09:00–09:10 | Установка на день | Корпус А, конференц-зал | ✓ |
| 09:10–10:30 | Лекция «…» | Басюк В. С. | ? |
```

Keep every row of the schedule (it is the record of the program); the last column
mirrors `in_report` (✓ yes, — no, ? to confirm).

The event year is often missing on day images: take it from another source in the
program, the folder name, or ask once.

## Selecting the moderator's blocks

The report covers only blocks where the moderator worked with the group or
observed it directly. Classify each row by meaning; the keywords below are
Russian examples — apply the same categories to programs in any language:

| kind | Typical titles | Default |
|---|---|---|
| `opening` | открытие, установка на программу, знакомство, командообразование | ✓ |
| `day-setup` | установка на день, главное вчерашнее | ✓ |
| `group-work` | проектная работа, групповая работа, работа в группах, практикум, мастерская, сессия, кейс | ✓ |
| `discussion` | обсуждение (лекции, мастер-классов, практик), разбор | ✓ |
| `reflection` | осмысление дня, рефлексия, подведение итогов дня/программы | ✓ |
| `presentation` | защита, презентация результатов, представление, питч, мИИтинг | ✓ |
| `masterclass` | мастер-класс(ы), практика практик | ? |
| `lecture` | лекция, пленарная, выступление спикера | ? |
| `other` | завтрак, обед, ужин, перерыв, зарядка, заезд, выезд, трансфер, свободное время, клубы, вечерняя программа, экскурсия | — |

Rules of thumb:

- Parallel tracks in one slot (two columns) → one block named after the first
  track, the others in `parallel`.
- These rules are also used for actual day schedules (day-schedule.md), where `?`
  becomes `in_report: true` + `uncertain: true` instead of a question.

- "Презентация мастер-классов" / "Презентация пособия" is a plenary item → `lecture`, default `?`.
- A lecture is `?` by default. When a group discussion block of the lecture
  follows it, the discussion is `✓` and the lecture becomes `—` (the discussion
  block carries the group's reaction).
- Unknown titles → `?`.

## Confirming with the moderator

1. Print the per-day table (only ✓ and ? rows; mention the count of hidden — rows)
   and end the turn with: «Это блоки, которые попадут в отчёт. Напишите правки
   (например: "день 2: убрать 3, добавить Лекция Серегина") или ответьте «ок».»
2. If there are `?` rows, ask about them next turn with `AskUserQuestion`
   (`multiSelect: true`, up to 4 rows per question, up to 4 questions per call):
   «Какие из этих блоков вы вели со своей группой?».
3. Apply the edits, set `in_report`, and assign block ids `d<n>b<k>` in time order.
