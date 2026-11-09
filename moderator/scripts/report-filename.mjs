#!/usr/bin/env node
// File name of the moderator report .docx, built from .moderator/state.json:
//
//   Отчет_модератора_<Фамилия>_<И.О.>_<стол_N | столы_N_M>_<программа>_<даты>.docx
//   Отчет_модератора_Маршалкин_А.С._стол_9_директор_на_высоте_02.11-05.11.2026.docx
//
// - name: state.moderator.name_short («Маршалкин А.С.») if set, else parsed from
//   state.moderator.name («Маршалкин Артём Сергеевич», «А. С. Маршалкин»);
// - tables: state.moderator.tables (array) or state.moderator.table («9», «9, 10»);
// - program: state.event.short_name if set, else derived from state.event.name —
//   the quoted proper name if there is one («Директор на высоте»), lowercased,
//   words joined by «_», at most PROGRAM_MAX characters (whole words);
// - dates: earliest and latest of state.days[].date and state.event.dates → 02.11-05.11.2026
//   (28.12.2026-03.01.2027 across years, 02.11.2026 for one day).
// A segment with no data is left out and listed in `missing`.
//
// Usage: report-filename.mjs [--state .moderator/state.json] [--labels "Prefix,table,tables"] [--json]

import { readFileSync } from 'node:fs';

export const PROGRAM_MAX = 30;

const LABELS = {
  ru: ['Отчет_модератора', 'стол', 'столы'],
  en: ['Moderator_report', 'table', 'tables'],
};

const FORBIDDEN = /[\/\\:*?"<>|\u0000-\u001f]/g;
// Function words not worth ending a shortened name with.
const WEAK_TAIL = new Set(['и', 'в', 'во', 'на', 'по', 'с', 'со', 'к', 'о', 'об', 'от', 'для', 'из', 'за', 'the', 'of', 'and', 'for', 'in', 'on', 'a', 'an', 'to']);
const PATRONYMIC = /(вич|вна|ична|инична|оглы|кызы)$/i;
const INITIALS = /^(\p{Lu}\.?)+$/u;

const clean = (s) => String(s ?? '').replace(FORBIDDEN, '').trim();

function initialsOf(words) {
  return words.map((w) => `${w[0].toUpperCase()}.`).join('');
}

// «Маршалкин Артём Сергеевич» | «Маршалкин А. С.» | «А.С. Маршалкин» → «Маршалкин_А.С.»
export function moderatorName(moderator = {}) {
  const warnings = [];
  const raw = clean(moderator.name_short || moderator.name);
  if (!raw) return { value: null, warnings };
  const tokens = raw.split(/\s+/).filter(Boolean);
  const isInit = (t) => INITIALS.test(t) && t.replace(/\./g, '').length <= 3;
  const inits = tokens.filter(isInit);
  const words = tokens.filter((t) => !isInit(t));
  if (inits.length && words.length) {
    const letters = inits.join('').replace(/\./g, '').split('');
    return { value: `${words[0]}_${letters.map((l) => `${l}.`).join('')}`, warnings };
  }
  if (words.length === 1) return { value: words[0], warnings };
  if (words.length >= 3) {
    // «Имя Отчество Фамилия» when the second word is the patronymic.
    if (PATRONYMIC.test(words[1]) && !PATRONYMIC.test(words[2])) {
      return { value: `${words[2]}_${initialsOf(words.slice(0, 2))}`, warnings };
    }
    return { value: `${words[0]}_${initialsOf(words.slice(1, 3))}`, warnings };
  }
  // Two full words: order is ambiguous («Ирина Соколова» vs «Соколова Ирина»).
  warnings.push('name-order');
  return { value: `${words[0]}_${initialsOf(words.slice(1))}`, warnings };
}

// «9» | «9, 10» | [9, 10] | «столы 9 и 10» → «стол_9» | «столы_9_10»
export function tablesPart(moderator = {}, [, one, many] = LABELS.ru) {
  const src = moderator.tables ?? moderator.table;
  if (src === null || src === undefined || src === '') return null;
  const text = Array.isArray(src) ? src.join(' ') : String(src);
  let items = [...new Set(text.match(/\d+/g) ?? [])].sort((a, b) => Number(a) - Number(b));
  if (!items.length) items = [clean(text).replace(/\s+/g, '_')].filter(Boolean);
  if (!items.length) return null;
  return `${items.length > 1 ? many : one}_${items.join('_')}`;
}

function words(s) {
  return (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

// state.event → «директор_на_высоте»
export function programPart(event = {}, max = PROGRAM_MAX) {
  let source = clean(event.short_name);
  const fromShort = Boolean(source);
  if (!fromShort) {
    const name = String(event.name ?? '').trim();
    if (!name) return { value: null, shortened: false };
    const quoted = [...name.matchAll(/[«“„"]([^»”“"]+)[»”“"]/g)].map((m) => m[1]);
    source = quoted.length
      ? quoted[quoted.length - 1]
      : name
          .replace(/\([^)]*\)/g, ' ')
          .split(/\s[—–-]\s|:/)[0]
          .replace(/\b(19|20)\d{2}\b/g, ' ');
  }
  const all = words(source);
  if (!all.length) return { value: null, shortened: false };
  let value = all.join('_');
  if (value.length <= max) return { value, shortened: false };
  const kept = [];
  for (const w of all) {
    const next = [...kept, w].join('_');
    if (next.length > max) break;
    kept.push(w);
  }
  while (kept.length > 1 && WEAK_TAIL.has(kept[kept.length - 1])) kept.pop();
  value = kept.length ? kept.join('_') : all[0].slice(0, max);
  return { value, shortened: true };
}

const dmy = (iso) => {
  const [y, m, d] = iso.split('-');
  return { d, m, y };
};

// days[].date (or event.dates) → «02.11-05.11.2026»
export function datesPart(state = {}) {
  // Both sources: days[] may hold only the days captured so far.
  const isoDates = [
    ...(state.days ?? []).map((d) => d.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '')),
    ...(String(state.event?.dates ?? '').match(/\d{2}\.\d{2}\.\d{4}/g) ?? []).map((s) => s.split('.').reverse().join('-')),
  ];
  if (!isoDates.length) return null;
  isoDates.sort();
  const a = dmy(isoDates[0]);
  const b = dmy(isoDates[isoDates.length - 1]);
  if (isoDates[0] === isoDates[isoDates.length - 1]) return `${a.d}.${a.m}.${a.y}`;
  if (a.y === b.y) return `${a.d}.${a.m}-${b.d}.${b.m}.${b.y}`;
  return `${a.d}.${a.m}.${a.y}-${b.d}.${b.m}.${b.y}`;
}

export function reportFileName(state = {}, { labels } = {}) {
  const lang = String(state.language?.report ?? 'ru').slice(0, 2).toLowerCase();
  const lab = labels ?? LABELS[lang] ?? LABELS.en;
  const name = moderatorName(state.moderator);
  const tables = tablesPart(state.moderator, lab);
  const program = programPart(state.event);
  const dates = datesPart(state);
  const missing = [];
  if (!name.value) missing.push('moderator.name');
  if (!tables) missing.push('moderator.table');
  if (!program.value) missing.push('event.name');
  if (!dates) missing.push('days.date');
  const stem = [lab[0], name.value, tables, program.value, dates]
    .filter(Boolean)
    .join('_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  return {
    file: `${stem}.docx`,
    parts: { prefix: lab[0], name: name.value, tables, program: program.value, dates },
    shortened: program.shortened,
    missing,
    warnings: name.warnings,
  };
}

function main(argv) {
  const opt = (k) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const statePath = opt('--state') ?? '.moderator/state.json';
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch (e) {
    console.error(`cannot read ${statePath}: ${e.message}`);
    process.exit(2);
  }
  const labelsArg = opt('--labels');
  const labels = labelsArg ? labelsArg.split(',').map((s) => s.trim()) : undefined;
  const res = reportFileName(state, { labels });
  if (argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(res.file);
    for (const m of res.missing) console.error(`missing: ${m}`);
    for (const w of res.warnings) console.error(`warning: ${w}`);
    if (res.shortened) console.error(`note: program name shortened to ${PROGRAM_MAX} characters`);
  }
}

const isMain = process.argv[1]?.endsWith('report-filename.mjs');
if (isMain) main(process.argv.slice(2));
