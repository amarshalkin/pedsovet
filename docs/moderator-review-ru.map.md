# Служебная карта пакета moderator-review-ru

Не входит в пакет для проверяющего. Нужна, чтобы вернуть его правки в рабочие
(английские) файлы плагина.

| Раздел пакета | Рабочий файл |
|---|---|
| М-1 Отбор блоков | `moderator/references/program-parsing.md` — «Selecting the moderator's blocks», «Confirming with the moderator» |
| М-2 Расписание дня | `moderator/references/day-schedule.md` |
| М-3 Как пишется отчёт | `moderator/references/report-writing.md`; `moderator/references/report-profile.md` («How build uses the profile») |
| М-3.4 Что модель не выдумывает | `moderator/references/interaction.md` — «Never invent» |
| М-4 Тезисы: оформление | профиль (поле «Тезисы участников»); `interaction.md` — «Never invent» |
| М-5 Фиксация и напоминания | `moderator/skills/capture/SKILL.md` — шаги 2–5; `interaction.md` — «Reminders» |
| М-6 Оцифровка | `moderator/references/digitization.md`; `moderator/agents/artifact-digitizer.md` |
| М-7 Диалог | `interaction.md` — «Language», «Choosing the right channel», «AskUserQuestion discipline», «Signal words» |
| М-7.4 Инструкция для модератора | `moderator/references/user-guide.md` |
| `02-профиль-отчёта.md` | `moderator/assets/templates/default/профиль.md` без раздела «Проверки» и с другим вводным абзацем |
| `03-видео-обзор.mp4` | `moderator/example/moderator-promo-compact.mp4` (исходник — `moderator/example/promo/moderator-promo.html`) |

Пересборка docx: склеить 00 + 01 + 02 и собрать
`bash moderator/scripts/build-docx.sh <склейка.md> docs/moderator-review-ru/moderator-методология-на-согласование.docx --lang ru-RU`.
