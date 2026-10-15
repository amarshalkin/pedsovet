# Day schedule

The program from init is the **plan**: it gives the days, the folders and a first
list of blocks. The schedule of a day is the **fact**: organisers often move,
rename, add or drop blocks, and the moderator sees the actual schedule at the
morning briefing («установка на день»). The report is built on the slots of the
actual day schedule.

Rules that follow from this:

- Ask for the day schedule itself — never ask «изменилось ли расписание?». For the
  moderator the schedule they saw is simply the schedule; there is nothing to
  compare it with.
- A received schedule is accepted **as is**: no comparison with the program, no
  confirmation questions. It is a fact the moderator does not change.
- If something changes during the day, the moderator just says so in
  `/moderator:capture` («проектную работу продлили до 19:00»); apply it.
- Without a received schedule the day is built from the program.

## State

`days[].schedule` in `state.json`:

```json
"schedule": {
  "status": "pending",
  "files": [],
  "received_at": null,
  "changes": []
}
```

- `pending` — not received yet (default for every day at init). Reminders run.
- `received` — the moderator sent the schedule; `blocks` come from it.
- `program` — the moderator chose to build this day from the program (said so in
  capture or answered so in build). Reminders stop.

## Recognising a day schedule

Treat an item as a day schedule when it is an image, PDF or text with **one date**
in the header and a column of time slots («09:00 — 09:15 Установка на день»), like
the per-day schedule cards organisers publish. Take the day from the date in the
header (match `days[].date`); do not ask for the day. A document covering several
days is the whole program (category `document`), not a day schedule.

A date that matches no program day: ask once with a self-contained
`AskUserQuestion` («В расписании дата 12.10 — такого дня в программе нет:
добавить день / это ошибка»).

## Applying a received schedule

1. Copy the file to `00-программа-и-материалы/программа/` named after
   `layout.schedule_file` (default `расписание-<slug>.<ext>`). A later schedule
   for the same day gets ` (2)`, ` (3)`; the newest one wins.
2. Read it (`convert-images.sh` + `Read` for images, `extract-text.sh` for
   documents) and take **every row as written**: time range, title, place,
   speaker.
   - Parallel tracks in one slot (two columns, e.g. «Проектная работа» and
     «Мастерская «Поддержка выпускников»») → one block titled after the first
     track, with the parallel one in `parallel` (e.g.
     `"parallel": ["Мастерская «Поддержка выпускников»"]`).
   - Open-ended slots («22:15 —», «До 09:00») keep the time as written.
3. Replace the day's `blocks` completely with the new rows (ids `d<n>b<k>` in
   time order). Set `in_report` without asking:
   - a block with the same title (ignoring case, quotes, punctuation) as a block
     of this day that the moderator already decided on → carry the decision over;
   - otherwise classify with program-parsing.md «Selecting the moderator's
     blocks»: `✓` → `in_report: true`, `—` → `false`, `?` → `in_report: true`
     with `"uncertain": true`. Uncertain blocks are settled later in the build
     draft questions, not now.
4. Set `schedule.status: received`, append the file to `schedule.files`, set
   `received_at`.
5. In `программа.md` replace the day's table with the actual one and mark the
   heading «— фактическое расписание (получено ДД.ММ ЧЧ:ММ)». The original
   program files stay untouched.
6. Rebuild this day's section of the checklist from the new blocks, carrying
   over every `[x]` whose item text still matches; re-tick «Материал: …» items
   from the files already in the day's folders.
7. Photos need no moving: they live in day folders, and `build` maps them to
   blocks by capture time against the current blocks.

Tell the moderator in one line: «Расписание 9.10 принято: 19 слотов, в отчёт —
11.» No list, no questions.

## Changes during the day

Text like «мастер-классы отменили», «проектную работу продлили до 19:00»,
«добавили встречу с экспертом в 17:00» is category `schedule-change` for the day
it mentions (today by default). Apply it to `blocks` the same way (new blocks →
in_report rule above), append `{at, text}` to `schedule.changes`, add a line under
the day's table in `программа.md`. Ask only if it is unclear which block is meant
(self-contained `AskUserQuestion` naming the candidate blocks).

A change does not count as a received schedule: if the status was `pending`, it
stays `pending`.

## Reminding

- After **every** capture run, for each day that has started and still has
  `schedule.status: pending`, add one line — always the first reminder:
  «Пришлите, пожалуйста, расписание дня 9.10 (фото или файл) — отчёт строится по
  его слотам.» Several days → one line listing the dates.
- It is not limited to one reminder per day and is not silenced by «позже».
- «Расписания не будет», «строй по программе» → `schedule.status: program` for
  the days meant; the reminder stops for them.

## In build

Before the draft of a day whose schedule is `pending`, ask with a self-contained
`AskUserQuestion`: «Расписание дня 9.10 так и не пришло. Как строить черновик?»
— «Пришлю расписание (рекомендую)» / «Строить по программе». On the first, end the
turn and wait for the file (apply it as above, then draft). On the second, set
`schedule.status: program` and draft from the program blocks.
