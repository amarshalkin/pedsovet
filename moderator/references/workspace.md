# Workspace layout and state

The moderator opens Claude Code in the event folder. Every command works on the
current working directory (`$PWD`); nothing is written outside it.

## Languages and folder names

The plugin is language-neutral. Two languages are stored in `state.language`:

- `dialogue` — the language the moderator writes in (ask once at init only if it
  is unclear). All messages, questions and options use it.
- `report` — the language of the report template. Drafts, finals and the docx are
  written in it, even when the dialogue language differs.

Folder and file names are chosen at init in the dialogue language (the moderator
browses them in Finder) and stored in `state.layout`. **Paths in all plugin
instructions use the default Russian names below — always substitute the real
names from `state.layout`.** Keep the numeric prefixes `00-`…`03-` in any language.

| Key | Default (ru) | Example (en) |
|---|---|---|
| `program` | `00-программа-и-материалы` | `00-program-and-materials` |
| `program_sub` | `программа` / `установки` / `документы` | `program` / `briefs` / `documents` |
| `artifacts` | `01-артефакты` | `01-artifacts` |
| `reflection` | `02-рефлексия` | `02-reflection` |
| `report` | `03-отчет` | `03-report` |
| `report_sub` | `шаблон` / `дни` / `оцифровка` / `сборка` | `template` / `days` / `digitization` / `assembly` |
| `common` | `общие` | `general` |
| `photos` / `files` | `фото` / `файлы` | `photos` / `files` |
| `day_slug` | `день-{n}_{DD}-{MM}` | `day-{n}_{DD}-{MM}` |
| `checklist` | `03-отчет/чек-лист.md` | `03-report/checklist.md` |
| `observations_file` | `наблюдения-модератора.md` | `moderator-observations.md` |
| `schedule_file` | `расписание-{slug}` | `schedule-{slug}` |
| `note_file` | `заметка-{HHMM}.md` | `note-{HHMM}.md` |

## Folder tree (default names)

```
<event folder>/
├── .moderator/
│   └── state.json                     # single source of truth (schema below)
├── 00-программа-и-материалы/
│   ├── программа/                     # original program files, программа.md (normalised),
│   │                                  # расписание-<slug>.* — actual day schedules
│   ├── установки/                     # установки на проход, briefs from the program director
│   └── документы/                     # everything else general: group lists, guides, partner docs
├── 01-артефакты/
│   ├── общие/                         # artifacts not tied to a day (team photo, final poster)
│   │   ├── фото/
│   │   └── файлы/
│   └── день-1_28-04/                  # one folder per program day: день-<n>_<DD-MM>
│       ├── фото/                      # photos: flipcharts, cards, the group at work
│       └── файлы/                     # other artifacts: presentations, docs, links (.url/.md)
├── 02-рефлексия/
│   ├── общие/                         # notes not tied to a day (moderators' own debrief)
│   └── день-1_28-04/                  # reflection notes of the day (any format)
└── 03-отчет/
    ├── шаблон/                        # the report template (original) + шаблон.md (text)
    ├── чек-лист.md                    # completeness checklist and navigation (see checklist.md)
    ├── дни/                           # день-1.черновик.md → день-1.md, итоги.черновик.md → итоги.md
    ├── оцифровка/                     # jpg/<slug>/ converted photos, <slug>/<photo>.md, оцифровка.md
    ├── сборка/                        # отчет.md + images/ — the exact pandoc input
    └── Отчет_модератора_<Фамилия>_<И>_стол_<N>.docx
```

Rules:

- Day slug: built from `layout.day_slug` (`n` is the 1-based program day). Keep the
  slug stable once created — `state.json` refers to it.
- Create only `фото/` and `файлы/` inside a day folder; do not invent sub-categories.
- Copy files that come from outside the event folder; never move or delete those
  originals. Files lying loose in the event folder root may be **moved** into place,
  but only after the moderator confirmed the list.
- Before copying, skip a file identical to one already at the destination
  (`cmp -s`) — re-filing the same file must not create duplicates.
- On a name collision of different files append ` (2)`, ` (3)` before the
  extension. Never overwrite.
- Text pasted into chat is saved as a file: reflection →
  `02-рефлексия/<slug>/заметка-<HHMM>.md`; moderator observation →
  `02-рефлексия/<slug>/наблюдения-модератора.md` (append, with a time stamp line).
- Links (Google Docs, p.knotta.ru pages, cloud folders) are stored as small `.md`
  files in the matching `файлы/` folder: title, URL, one-line description.

## state.json

```json
{
  "schema": 1,
  "created_at": "2026-04-27T18:00:00+03:00",
  "updated_at": "2026-04-28T22:10:00+03:00",
  "blocks_confirmed": true,
  "structure_ready": true,
  "setup_complete": true,
  "dismissed_reminders": [],
  "language": { "dialogue": "ru", "report": "ru" },
  "layout": {
    "program": "00-программа-и-материалы",
    "program_sub": { "program": "программа", "briefs": "установки", "documents": "документы" },
    "artifacts": "01-артефакты",
    "reflection": "02-рефлексия",
    "report": "03-отчет",
    "report_sub": { "template": "шаблон", "days": "дни", "digitization": "оцифровка", "assembly": "сборка" },
    "common": "общие",
    "photos": "фото",
    "files": "файлы",
    "day_slug": "день-{n}_{DD}-{MM}",
    "checklist": "03-отчет/чек-лист.md",
    "observations_file": "наблюдения-модератора.md",
    "schedule_file": "расписание-{slug}",
    "note_file": "заметка-{HHMM}.md"
  },
  "event": {
    "name": "Семинар-практикум «Весенний педсовет’26»",
    "location": "Ставропольский край, г. Пятигорск, ул. Пионерлагерная, 8В",
    "dates": "28.04.2026 — 01.05.2026",
    "program_file": "00-программа-и-материалы/программа/программа.md"
  },
  "moderator": {
    "name": null,
    "table": null,
    "group": []
  },
  "template": {
    "source": "03-отчет/шаблон/Шаблон отчета модератора.docx",
    "text": "03-отчет/шаблон/шаблон.md",
    "checklist": "03-отчет/чек-лист.md"
  },
  "days": [
    {
      "n": 1,
      "date": "2026-04-28",
      "title": "28 апреля, вторник",
      "slug": "день-1_28-04",
      "status": "pending",
      "schedule": {
        "status": "received",
        "files": ["00-программа-и-материалы/программа/расписание-день-1_28-04.webp"],
        "received_at": "2026-04-28T09:20:00+03:00",
        "changes": []
      },
      "blocks": [
        {
          "id": "d1b1",
          "time": "18:00–18:40",
          "title": "Открытие программы. Установка на программу",
          "kind": "opening",
          "in_report": true
        },
        {
          "id": "d1b2",
          "time": "19:00–20:20",
          "title": "Проектная работа",
          "kind": "group-work",
          "in_report": true,
          "parallel": ["Мастерская «Поддержка выпускников»"]
        },
        {
          "id": "d1b3",
          "time": "20:30–21:00",
          "title": "Рефлексия выступления",
          "kind": "reflection",
          "in_report": true,
          "uncertain": true
        }
      ]
    }
  ],
  "final_section": { "status": "pending" },
  "digitization": { "mode": null, "source": null, "status": "pending" },
  "report": { "markdown": null, "docx": null },
  "log": [
    {
      "at": "2026-04-28T22:05:00+03:00",
      "day": 1,
      "kind": "reflection",
      "files": ["02-рефлексия/день-1_28-04/Рефлексия-1-день.rtf"],
      "note": "вечернее осмысление дня"
    }
  ]
}
```

Field notes:

- `days[].schedule`: the actual schedule of the day — `pending` (requested, blocks
  from the program), `received` (blocks from the schedule), `program` (the
  moderator chose the program). Details: day-schedule.md.
- `blocks[].uncertain`: included by default but not yet confirmed by the moderator;
  settled in the build draft questions. `blocks[].parallel`: parallel tracks of the slot.

- `blocks_confirmed`: the moderator confirmed which blocks go into the report.
- `structure_ready`: folders and days exist — `capture` works from this point.
  `setup_complete`: the template and checklist exist too — init has finished.
- `dismissed_reminders`: keys of reminders the moderator declined for good.
- `report.markdown` / `report.docx`: written by `build` phase D.

- `days[].status`: `pending` → `collecting` (something captured) → `draft`
  (draft written) → `final` (moderator accepted). `build` resumes from the first
  day that is not `final`.
- `days[].blocks[].kind`: `opening`, `day-setup`, `group-work`, `discussion`,
  `reflection`, `presentation`, `masterclass`, `lecture`, `other`.
  `in_report: false` keeps the block in the program record but out of the report.
- `template.source` is `null` until the moderator sends the template.
- `final_section` covers the template's end-of-program sections (results of the
  group, expert comments, conclusions, active/inactive participants).
- `digitization.mode`: `agents` | `link` | `file` | `none`; `source` is the URL
  or path for `link`/`file`; `status`: `pending` → `done` | `skipped`.
- `log[]`: one entry per (day, kind) group of a capture batch.
  `kind`: `reflection`, `photo`, `artifact`, `document`, `observation`.
  `day` is `null` for general items.
- Write the whole file back after every change (read → modify → write) and
  update `updated_at`. Keep it valid JSON; never leave comments in it.

## Status script

`node ${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs [--json] [--today YYYY-MM-DD]`
(run from the event folder) prints per-day counts of reflection notes, photos and
files, checklist progress, context gaps (only for days that already started) and
loose files lying in the event folder root. It reads folder names from
`state.layout`. Output is language-neutral (gap codes `no-reflection`,
`no-group-work-photos`; English labels in the markdown view): use `--json` and
present the numbers to the moderator in the dialogue language.
