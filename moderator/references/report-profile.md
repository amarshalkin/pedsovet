# Report profile

A report template is written for people: instructions to delete after filling,
sample blocks, formatting advice and the real structure are mixed together. The
plugin never writes from the template directly. It writes from a **profile** —
one markdown file in the event folder, `03-отчет/шаблон/профиль.md`, that splits
the template into what the model needs:

| Part | Purpose | Strictness |
|---|---|---|
| `## Скелет` | the document structure with `{slots}`: headings, order, field names | strict — copied as is |
| `## Правила полей` | per field: purpose, sources, length, tone, what is not allowed | flexible — content follows the rules |
| `## Оформление` | formatting rules the text must follow | strict |
| `## Примеры` | 2–3 short anonymised fragments per key field | style reference, never copied |
| `## Проверки` | a ```json block of machine rules for `lint-report.mjs` | strict |

The template file stays in `03-отчет/шаблон/` as the human source; the profile is
the working copy for `init` (checklist) and `build` (drafts, assembly, checks).

## Contents
- Default profile
- Choosing the template (init)
- Compiling a profile from the moderator's template
- The checks block
- How build uses the profile

## Default profile

The plugin ships one: `${CLAUDE_PLUGIN_ROOT}/assets/templates/default/` with
`профиль.md` (the profile) and `шаблон.md` (the same template for people to read).
It is the moderator report template of an educational program: days → the
moderator's blocks → «Задача блока.» and «Комментарий модератора»; «Рефлексия
дня» with verbatim theses; the end of the program (group result, expert comments,
program reflection, conclusions, most and least active participants).

Using it: copy both files into `03-отчет/шаблон/`, set
`state.template = {kind: "default", source: "шаблон.md", text: "шаблон.md", profile: "профиль.md", …}`
(paths relative to the event folder). The default profile is in Russian; for another
report language, translate the profile's headings, field names and rules (keep the
structure and the checks block in sync with the translated names).

## Choosing the template (init)

Asked once, in init step 5, after the folders exist — the checklist depends on the
answer, and capture already works without it. One self-contained `AskUserQuestion`
(header «Шаблон»):

- «Шаблон по умолчанию (рекомендую)» — description: «Отчёт модератора: дни → блоки
  (задача, комментарий), рефлексия дня с тезисами, итоги программы. Можно открыть и
  посмотреть: шаблон.md в папке отчёта.»
- «Загружу свой шаблон» — the moderator sends a file next turn;
- when a template-like file is already in the folder: «Использовать найденный: <имя>»
  as the first option instead of the default (then the default is second).

The choice can be changed later by re-running `/moderator:init` («Пересоздать
чек-лист по новому шаблону»).

## Compiling a profile from the moderator's template

1. Copy the file to `03-отчет/шаблон/`, extract its text
   (`bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh <file>`) into `шаблон.md`.
2. **Same as the default?** If the text contains the default template's title and
   at least these field names — «Задача блока», «Комментарий модератора», «Тезисы
   участников», «Рефлексия», «Комментарий модератора по программе», «Список наиболее
   активных участников» — and its instructions match, use the default profile
   (`kind: "default"`, `source` = the moderator's file). Say so in one line.
3. Otherwise write `профиль.md` with the five parts, using the default profile as the
   model of the format:
   - **Скелет:** keep the template's heading texts and order exactly; replace sample
     content with `{slots}`; mark repeating units (day, block) once with a note that
     they repeat. Template instructions («удалить после заполнения», hints in colour)
     never go into the skeleton.
   - **Правила полей:** move every instruction, hint and recommendation of the
     template here, per field, in the template's own words where possible.
   - **Оформление:** formatting requirements of the template.
   - **Примеры:** only when the template contains examples; otherwise leave the
     section with one line «Примеров в шаблоне нет».
   - **Проверки:** fill the json block (below) from the skeleton's real field names.
4. Show the moderator a compact summary — the skeleton's headings and the list of
   fields with one line of rules each — and end the turn: «Так я понял ваш шаблон.
   Напишите правки или «ок».» Apply corrections, then build the checklist.
5. Set `state.template.kind: "custom"`.

## The checks block

Keys used by `lint-report.mjs` (all field names are matched by prefix):

| Key | Meaning |
|---|---|
| `day_heading` | regex for a day heading line (level 2) |
| `block_level`, `field_level` | heading levels of blocks and fields |
| `reflection_match` | regex on a block title that makes it a reflection block |
| `block_required` | list of any-of groups: a non-reflection block must have one field of each group (ERROR) |
| `block_expected` | same, but only a WARN |
| `reflection_required` | any-of groups for reflection blocks (ERROR) |
| `thesis_fields` | fields whose list items are participants' theses |
| `comment_fields`, `comment_min_sentences` | comment fields and the minimum sentences (WARN) |
| `header_required` | strings that must be in the header (report mode, ERROR) |
| `final_required` | headings that must exist in the full report (report mode, ERROR) |
| `list_item_end`, `list_last_end`, `thesis_end` | list punctuation (WARN) |
| `no_bold_in_body` | `**bold**` outside headings is an ERROR |
| `placeholder` | regex for unresolved placeholders (ERROR) |

Omit a key when the template has no such rule.

## How build uses the profile

- Drafts follow `## Скелет` exactly and fill each field by `## Правила полей`, in the
  tone of `## Примеры`.
- Before presenting a day final, run
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint-report.mjs 03-отчет/дни/день-<n>.md --profile 03-отчет/шаблон/профиль.md`
  and fix every ERROR (WARNs: fix if the material allows, else leave). Placeholders the
  moderator left unanswered are the only accepted ERROR at this stage — name them.
- Before building the docx, run it on `03-отчет/сборка/отчет.md` with `--mode report`;
  ERRORs other than placeholders the moderator agreed to keep must be fixed first.
