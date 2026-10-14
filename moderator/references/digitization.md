# Digitizing hand-made artifacts

Digitization turns photos of flipcharts, cards, stickers, filled handouts and
other hand-made materials of the group into text that goes into the report next
to the photo. Group photos (people at work) are not digitized.

## Choosing the mode (asked once, after all days are final)

`AskUserQuestion`, header «Оцифровка»:

1. «Оцифровать сейчас (рекомендую)» — `agents` mode below.
2. «Есть документ с оцифровкой» — the moderator sends a link or a file next turn.
3. «Без оцифровки» — photos go into the report with captions only.

Store the choice in `state.digitization`.

## Mode `agents`

1. Collect candidates: every image in `01-артефакты/*/фото/` and
   `01-артефакты/общие/фото/`.
2. Convert per day (photo names repeat across days, so keep one folder per slug):
   `bash ${CLAUDE_PLUGIN_ROOT}/scripts/convert-images.sh --out 03-отчет/оцифровка/jpg/<slug> 01-артефакты/<slug>/фото`
   (and `общие` the same way). The converted names are what agents and the report use.
3. Create one task per batch with the task tools, then dispatch
   `moderator:artifact-digitizer` agents **in parallel in a single message** —
   one agent per photo (or per 2–3 photos of the same flipchart taken from
   different angles). Give each agent **absolute** paths (the agent does not
   share the event folder as its working directory):
   - the jpg path(s) and the original path,
   - day, block title and what the group was doing in that block (1–2 sentences
     from the day final),
   - known card categories if the day text mentions them (e.g. «боль», «кластер»),
   - the report language (`state.language.report`),
   - output path `03-отчет/оцифровка/<slug>/<jpg-stem>.md`.
   Up to ~10 agents per message; send the next batch after the first finishes.
4. Read every result. Each starts with a frontmatter `kind:`
   (`flipchart` | `cards` | `stickers` | `handout` | `group-photo` | `other`) and
   `confidence:` (`high` | `medium` | `low`).
5. Merge into `03-отчет/оцифровка/оцифровка.md`: one `##` section per photo in
   day/block order, with the source path and the content. Duplicates (the same
   card on two photos) are kept once and noted «(дубль, фото 5)».
6. Review with the moderator: show a compact table (photo → kind → confidence →
   number of `[?]` marks) and list only the uncertain fragments. End the turn and
   let the moderator correct in free text. Apply corrections.

## Mode `link` / `file`

- Google Docs link: `WebFetch` the `…/export?format=txt` variant; if access is
  denied, ask the moderator to open access by link or export to .docx.
- p.knotta.ru or another web page: `WebFetch` the URL.
- File: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/extract-text.sh <file>`.
- Map the document's sections to photos by number/caption; ask (via
  `AskUserQuestion`, up to 4 at a time) only for sections that cannot be matched.
- Save the normalised result as `03-отчет/оцифровка/оцифровка.md` in the same format
  as the agents mode, and keep the link in the report's «Ссылки».

## Output conventions (shared with the agent)

- Flipchart: keep its visual structure — title as `###`, columns/zones as `####`,
  bullet hierarchy as nested lists, arrows as «→», circled/highlighted items marked
  «(выделено)».
- Cards and stickers: table `| № | Тип | Распознанный текст |`, numbered in reading
  order (left-to-right, top-to-bottom) or by the number written on the card.
  `Тип` is the colour or category if visible. Voting marks (dots, ticks) are
  counted into an extra column `Голоса` — they show the group's priorities.
- Uncertain word: `[?слово]`; illegible fragment: `[неразборчиво]`; crossed-out
  text: `~~текст~~`.
- Never correct the participants' wording beyond obvious OCR noise.
