---
name: build
description: This skill should be used when a moderator runs "/moderator:build" or asks to "build the moderator report", "draft the report day by day", "собрать отчёт модератора", "сделать черновик отчёта за день", "подготовить отчёт по программе", "собрать docx отчёта" (in any language). Walks the report day by day (draft → moderator's comments and observations → final), then the end-of-program section, optional digitization of flipchart/card photos (or a link to a ready digitization), and assembles the .docx with photos and their digitized versions.
argument-hint: "[день N | итоги | оцифровка | сборка]"
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TodoWrite, Agent, WebFetch, Bash(mkdir:*), Bash(cp:*), Bash(ls:*), Bash(du:*), Bash(unzip:*), Bash(head:*), Bash(bash:*), Bash(node:*), Bash(python3:*), Bash(textutil:*), Bash(pandoc:*)
---

# Moderator companion: build the report

Turn everything captured during the program into the moderator report, together
with the moderator, one day at a time.

Talk in the moderator's language; write the report in the template's language
(interaction.md «Language»); follow the dialogue shapes from interaction.md;
substitute folder names from `state.layout`. Read first:
`${CLAUDE_PLUGIN_ROOT}/references/interaction.md`,
`${CLAUDE_PLUGIN_ROOT}/references/workspace.md`,
`${CLAUDE_PLUGIN_ROOT}/references/report-writing.md`,
`${CLAUDE_PLUGIN_ROOT}/references/day-schedule.md`. Load
`${CLAUDE_PLUGIN_ROOT}/references/digitization.md` at phase C.

## Phase 0 — orient

1. No `.moderator/state.json` or `structure_ready: false` → suggest
   `/moderator:init` and stop. No profile yet (`template.profile` missing)
   → ask the template question of init step 5 (default or own), set up the
   profile and checklist, then continue.
   Read `03-отчет/шаблон/профиль.md` — it is the structure, field rules, style and
   examples every draft follows — and `${CLAUDE_PLUGIN_ROOT}/references/report-profile.md` «How
   build uses the profile».
2. Read `node ${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs --json`.
3. Pick the starting point:
   - `$ARGUMENTS` = «день N» → redo that day (even if final); «итоги» → phase B;
     «оцифровка» → phase C; «сборка» → phase D;
   - otherwise the first day with `in_report` blocks whose status is not `final`
     (days without such blocks are skipped); if all are final, the first
     unfinished phase.
   - Jumping to C or D while some days are not final: say which, and build from
     finals plus drafts only with the moderator's consent.
4. Create tasks: one per remaining day («День 2 — 29.04»), «Итоги программы»,
   «Оцифровка артефактов», «Сборка docx». Keep them updated.
5. If some remaining days have no material at all, ask before drafting with a
   self-contained `AskUserQuestion`: «Нет материалов за: 30.04, 01.05. Начинаем?»
   — «Начать черновики (рекомендую)» / «Сначала добавлю материалы». On the second,
   suggest `/moderator:capture` and stop.

## Phase A — day by day

For each day in order, run the cycle below. Never start the next day before the
current one is final. Each step ends the turn — no dialog after a draft or final.

**A0. Day schedule** — only if the day's `schedule.status` is `pending`: ask the
self-contained question from day-schedule.md «In build» («Пришлю расписание
(рекомендую)» / «Строить по программе»). On «пришлю» end the turn; when the file
arrives, apply it (day-schedule.md «Applying a received schedule») and continue
with A1. On «по программе» set `schedule.status: program` and continue.

**A1. Draft**

1. Read the day's sources (report-writing.md «Sources for a day»). The blocks
   of the day are `days[].blocks` — from the received schedule, or from the
   program when `schedule.status` is `program`.
2. Photos: `node ${CLAUDE_PLUGIN_ROOT}/scripts/photo-dates.mjs 01-артефакты/<slug>/фото`
   (originals keep the capture time) to map them to blocks; convert for viewing
   with `bash ${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh --out 03-отчет/оцифровка/jpg/<slug> 01-артефакты/<slug>/фото`;
   look at a few with `Read` to know what the group produced. Put `{{фото: …}}`
   markers into the blocks.
3. Write `03-отчет/дни/день-<n>.черновик.md`; set the day `status: draft`.
4. Present the full draft, then the «Вопросы к модератору» (max 5; blocks marked
   `uncertain` go first: «Вели ли вы блок «Рефлексия выступления» со своей
   группой? Если нет — уберу его из отчёта»), and end the
   turn with: «Это черновик дня <n> (<дата>). Напишите комментарии к тексту и свои
   наблюдения по этому дню — можно несколькими сообщениями. Когда закончите,
   напишите «готово» — соберу чистовик дня.»

**A1a. Comments** — the moderator may answer in several messages. For each
message that is not the signal: apply it to the draft file, answer in one line
what was taken («Учёл: динамика на проектной работе, 2 тезиса в рефлексию») and
end the turn. Do not show the whole draft again and do not build the final.
If a message both comments and ends with the signal, apply the comments and go
to A2.

**A2. Final** — on the explicit signal: «готово», «чистовик», «собирай», «ок»,
«всё верно» (or the same meaning in the dialogue language). When unsure whether a
short reply is the signal or a comment, treat it as a comment and remind once:
«Когда закончите с комментариями — напишите «готово».»

1. Merge comments and observations (report-writing.md «Day final»); unanswered
   placeholders stay.
2. Write `03-отчет/дни/день-<n>.md`.
3. Check it: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-report.mjs 03-отчет/дни/день-<n>.md --profile 03-отчет/шаблон/профиль.md`.
   Fix every ERROR except placeholders the moderator left unanswered; fix WARNs when
   the material allows. Run the check again after fixing (at most twice).
4. Set `status: final`; tick the day's writing items in the checklist; save
   program-wide remarks to `02-рефлексия/общие/наблюдения-модератора.md`.
5. Present the final version in full, name any placeholders left, and end the
   turn with: «Финальная версия дня <n>. Если нужно что-то поправить — напишите;
   если всё хорошо — «дальше», и я перейду к дню <n+1>.»

**A3. Next** — on «дальше» (or equivalent) complete the task and go to A0/A1 of
the next day. On corrections, update the final and present it again (A2.3).

If the moderator wants to stop, stop: the state is saved, and the next
`/moderator:build` resumes from the first non-final day.

## Phase B — end of program

The same cycle for the template's end-of-program sections (report-writing.md
«Final section»): `итоги.черновик.md` → comments (any number of messages) →
«готово» → `итоги.md`. In the draft's
questions ask explicitly for what notes rarely contain: expert/partner comments
on the group's presentation, the most and least active participants. After the
final: set `final_section.status: final`, tick the «Итоги программы» items,
present it and end the turn with «…если всё хорошо — «дальше», и перейдём к
фото и оцифровке.»

## Phase C — digitization

Next turn, follow digitization.md: ask the mode with a self-contained
`AskUserQuestion`, then dispatch `moderator:artifact-digitizer` agents in parallel
(one message, up to ~10 agents), or read the moderator's link/file, or skip.
Show uncertain fragments and end the turn for corrections; apply them. Save
`оцифровка.md`, update `state.digitization`, tick «Фото и оцифровка».

## Phase D — assembly

1. Header: `state.moderator` and `state.event`. Header fields of the profile's
   skeleton that are missing (ФИО, номер стола, список группы) → ask in one chat
   message and end the turn.
2. Compose `03-отчет/сборка/отчет.md` following the profile's `## Скелет` and
   report-writing.md «Assembly» (photos, markers, links, appendix).
3. Check: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-report.mjs 03-отчет/сборка/отчет.md --profile 03-отчет/шаблон/профиль.md --mode report`.
   Fix ERRORs. Remaining placeholders → list them with day and block and end the
   turn: «Собрать с пометками или сначала допишете?».
4. Build with the command from report-writing.md (`build-docx.sh … --lang <report
   language>`). «missing image» → fix the path, rebuild. Over ~25 MB → the
   re-compress command from report-writing.md, rebuild.
5. Verify: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh <docx> | head -60`
   shows the header and the first day; `unzip -l <docx>` lists images under
   `word/media/` (identical images are stored once, so fewer than the links is fine).
6. Save `state.report`, run `status.mjs --json`, and finish with a short summary:
   path and size of the docx, days included, number of photos and digitized
   artifacts, open checklist items, and a reminder that the final check of the
   wording is the moderator's.

## Additional resources

- `${CLAUDE_PLUGIN_ROOT}/scripts/` — `convert-images.sh`, `photo-dates.mjs`,
  `extract-text.sh`, `status.mjs`, `lint-report.mjs`, `build-docx.sh` (+ `postprocess-docx.py`).
- `03-отчет/шаблон/профиль.md` — the report profile (structure, field rules, style, examples, checks).
- `${CLAUDE_PLUGIN_ROOT}/assets/reference.docx` — styles of the output document.
- `${CLAUDE_PLUGIN_ROOT}/agents/artifact-digitizer.md` — digitization agent.
