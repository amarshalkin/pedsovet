# Building the checklist from the profile

`03-отчет/чек-лист.md` serves two purposes: a completeness check for the report
and a navigation aid for the moderator during the program ("что ещё нужно
зафиксировать сегодня"). It is derived from **the report profile**
(`03-отчет/шаблон/профиль.md`, see report-profile.md) plus the program blocks —
never from a hard-coded list.

## Step 1 — read the profile

From `## Скелет` take:

1. **Header fields** — e.g. «ФИО модератора», «Номер стола», «Список группы».
2. **Per-block fields** — the `####` fields of a regular block (e.g. «Задача блока.»,
   «Комментарий модератора») and whether artifacts belong in the block.
3. **Per-day fields** — the fields of the reflection block that closes a day.
4. **End-of-program fields** — the result/expert/reflection blocks and the level-2
   sections after the days (conclusions, active/inactive participants).

From `## Правила полей` take one short hint per field for the checklist line
(«Комментарий модератора: эмоции и динамика, содержание, позиция участников»).

## Step 2 — write the checklist

Format rules (parsed by `status.mjs`):

- One `## ` section per unit. Every day section heading ends with the marker
  `<!-- day:<n> -->` (invisible in rendered markdown, language-independent); the
  visible part is in the report language.
- Written in the report language; the example below is Russian.
- Items are `- [ ] …`; done items are `- [x] …`.
- Material items end with the source folder in parentheses so the moderator knows
  where to drop files.
- `### ` sub-headings group items by block inside a day.

## Example (for the default profile)

```markdown
# Чек-лист отчёта модератора
Как пользоваться: `/moderator:capture` отмечает материалы автоматически,
`/moderator:build` — написанные разделы. Можно отмечать и вручную.

## Шапка отчёта
- [ ] ФИО модератора
- [ ] Номер стола
- [ ] Список группы (если группа постоянная)

## День 1 — 28.04, вторник <!-- day:1 -->
### Открытие программы. Установка на программу
- [ ] Материал: заметки о запросах участников (02-рефлексия/день-1_28-04/)
- [ ] Задача блока
- [ ] Комментарий модератора: эмоции и динамика, содержание, позиция участников
### Командообразование
- [ ] Материал: фото работы группы (01-артефакты/день-1_28-04/фото/)
- [ ] Задача блока
- [ ] Комментарий модератора
### Рефлексия дня (Осмысление дня)
- [ ] Материал: заметки рефлексии с тезисами участников (02-рефлексия/день-1_28-04/)
- [ ] Тезисы участников — дословно
- [ ] Комментарий модератора: состояние группы в конце дня, наблюдения, выводы участников

## День 2 — 29.04, среда <!-- day:2 -->
### Проектная работа. Блок 1
- [ ] Материал: фото флипчартов / карточек (01-артефакты/день-2_29-04/фото/)
- [ ] Задача блока
- [ ] Оцифрованное содержание флипчартов
- [ ] Комментарий модератора
…

## Итоги программы
- [ ] Материал: фото итогового выступления / презентация (01-артефакты/день-4_01-05/)
- [ ] Результат работы группы (текст докладчика / ключевые выводы)
- [ ] Комментарий партнёра / экспертов
- [ ] Комментарий модератора к результату работы группы
- [ ] Рефлексия программы: тезисы участников
- [ ] Комментарий модератора по программе: сдвижка группы, выводы по программе, про целевую аудиторию
- [ ] Список наиболее активных участников
- [ ] Список наименее активных участников

## Приложения
- [ ] Ссылки на материалы
- [ ] Фото и оцифровка артефактов
```

## Who ticks what

- `init` creates the file with everything unchecked (header fields already known
  from the program can be ticked).
- `capture` ticks a **Материал:** item when a file of the matching kind (photo,
  reflection note, artifact) landed in the item's folder **and** the item's wording
  fits it (e.g. a photo matched to «Проектная работа. Блок 1» ticks that block's
  photo item, not the day's reflection item).
- `build` ticks writing items when a day / the final section becomes `final`,
  and «Фото и оцифровка» after digitization.
- When the checklist is regenerated (new template or profile), carry over `[x]` for every
  item whose text matches an old ticked item.
- When a day schedule arrives or changes, only that day's section is rebuilt from
  the new blocks, with the same carry-over (day-schedule.md).
- Respect manual edits by the moderator: never untick an item the moderator ticked.
