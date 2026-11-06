#!/usr/bin/env node
// Check a day final or the assembled report against the machine rules of the
// report profile (the ```json block under "## Проверки" / "## Checks").
//
// Usage: node lint-report.mjs <file.md> --profile <профиль.md> [--mode day|report] [--json]
//
// ERROR = must be fixed before building the docx; WARN = worth a look.
// Exit code: 1 if there are errors, 0 otherwise, 2 on bad usage.

import { readFileSync } from 'node:fs';

export function loadRules(profileText) {
  const lines = profileText.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+(Проверки|Checks)\s*$/i.test(l));
  if (start < 0) throw new Error('profile has no "## Проверки" section');
  const rest = lines.slice(start + 1).join('\n');
  const m = rest.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) throw new Error('profile "## Проверки" section has no ```json block');
  return JSON.parse(m[1]);
}

const startsWithAny = (s, names) => names.some((n) => s.startsWith(n));

// Parse markdown into headings with their line numbers and the body lines under each.
function parse(text) {
  const lines = text.split(/\r?\n/);
  const heads = [];
  let inFence = false;
  lines.forEach((l, i) => {
    if (/^```/.test(l)) inFence = !inFence;
    if (inFence) return;
    const h = l.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (h) heads.push({ level: h[1].length, text: h[2].replace(/\*\*/g, '').trim(), line: i + 1, raw: l });
  });
  return { lines, heads };
}

export function lint(text, rules, mode = 'day') {
  const out = [];
  const err = (line, msg) => out.push({ level: 'ERROR', line, msg });
  const warn = (line, msg) => out.push({ level: 'WARN', line, msg });
  const { lines, heads } = parse(text);
  const dayRe = new RegExp(rules.day_heading);
  const reflRe = new RegExp(rules.reflection_match || '(?!)', 'i');
  const phRe = new RegExp(rules.placeholder || '(?!)', 'g');

  // --- days, blocks, fields ---
  const days = heads.filter((h) => h.level === 2 && dayRe.test(h.raw));
  if (days.length === 0) err(1, 'нет ни одного заголовка дня (## ДД.ММ.ГГГГ)');
  days.forEach((day) => {
    const dayEnd = (heads.find((h) => h.line > day.line && h.level <= 2) || { line: lines.length + 1 }).line;
    const blocks = heads.filter((h) => h.level === rules.block_level && h.line > day.line && h.line < dayEnd);
    if (blocks.length === 0) warn(day.line, `в дне «${day.text}» нет блоков`);
    blocks.forEach((b) => {
      const bEnd = (heads.find((h) => h.line > b.line && h.level <= rules.block_level) || { line: lines.length + 1 }).line;
      const fields = heads.filter((h) => h.level === rules.field_level && h.line > b.line && h.line < Math.min(bEnd, dayEnd)).map((h) => h.text);
      const has = (group) => fields.some((f) => startsWithAny(f, group));
      if (reflRe.test(b.text)) {
        (rules.reflection_required || []).forEach((g) => { if (!has(g)) err(b.line, `рефлексия «${b.text}»: нет поля «${g[0]}»`); });
      } else {
        (rules.block_required || []).forEach((g) => { if (!has(g)) err(b.line, `блок «${b.text}»: нет ни одного из полей ${g.map((x) => `«${x}»`).join(', ')}`); });
        (rules.block_expected || []).forEach((g) => { if (!has(g)) warn(b.line, `блок «${b.text}»: нет поля «${g[0]}»`); });
      }
    });
  });

  // --- whole report: header and final sections ---
  if (mode === 'report') {
    const firstDay = days.length ? days[0].line : lines.length;
    const head = lines.slice(0, firstDay - 1).join('\n');
    (rules.header_required || []).forEach((s) => { if (!head.includes(s)) err(1, `в шапке нет «${s}»`); });
    (rules.final_required || []).forEach((s) => { if (!heads.some((h) => h.text.startsWith(s))) err(lines.length, `нет раздела «${s}»`); });
  }

  // --- line rules: placeholders, bold, lists ---
  let inFence = false, field = null, list = [];
  const flushList = () => {
    if (list.length === 0) return;
    const thesis = field && startsWithAny(field, rules.thesis_fields || []);
    list.forEach(({ text: s, line }, k) => {
      const t = s.replace(/\s+$/, '');
      if (thesis) { if (rules.thesis_end && !t.endsWith(rules.thesis_end)) warn(line, `тезис должен кончаться «${rules.thesis_end}»`); }
      else if (k < list.length - 1) { if (rules.list_item_end && !t.endsWith(rules.list_item_end)) warn(line, `пункт списка должен кончаться «${rules.list_item_end}»`); }
      else if (rules.list_last_end && !t.endsWith(rules.list_last_end)) warn(line, `последний пункт списка должен кончаться «${rules.list_last_end}»`);
    });
    list = [];
  };
  lines.forEach((l, i) => {
    const n = i + 1;
    if (/^```/.test(l)) { inFence = !inFence; flushList(); return; }
    if (inFence) return;
    for (const m of l.matchAll(phRe)) err(n, `незаполненное место: ${m[0]}`);
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushList(); field = h[1].length === rules.field_level ? h[2].trim() : h[1].length < rules.field_level ? null : field; return; }
    if (rules.no_bold_in_body && /\*\*[^*\n]+\*\*|__[^_\n]+__/.test(l)) err(n, 'жирный в основном тексте (разрешён только в заголовках)');
    const li = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
    if (li && !/^!\[/.test(li[1])) list.push({ text: li[1], line: n });
    else if (l.trim() !== '' || list.length) flushList();
  });
  flushList();

  // --- comment length (sentences per comment field) ---
  if (rules.comment_min_sentences) {
    heads.forEach((h, k) => {
      if (h.level !== rules.field_level || !startsWithAny(h.text, rules.comment_fields || [])) return;
      const end = (heads[k + 1] || { line: lines.length + 1 }).line;
      const body = lines.slice(h.line, end - 1).filter((l) => !/^\s*(!\[|\{\{)/.test(l)).join(' ');
      if (phRe.test(body)) { phRe.lastIndex = 0; return; }
      phRe.lastIndex = 0;
      const sentences = (body.match(/[^.!?…]+[.!?…]+/g) || []).filter((s) => s.trim().length > 2).length;
      if (sentences > 0 && sentences < rules.comment_min_sentences) warn(h.line, `«${h.text}»: ${sentences} предл. — по профилю от ${rules.comment_min_sentences}`);
      if (sentences === 0) warn(h.line, `«${h.text}»: пусто`);
    });
  }
  return out.sort((a, b) => a.line - b.line);
}

const isMain = process.argv[1]?.endsWith('lint-report.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith('--') && !['--profile', '--mode'].includes(args[i - 1]));
  const profile = opt('--profile');
  if (!file || !profile) { console.error('usage: lint-report.mjs <file.md> --profile <профиль.md> [--mode day|report] [--json]'); process.exit(2); }
  const rules = loadRules(readFileSync(profile, 'utf8'));
  const res = lint(readFileSync(file, 'utf8'), rules, opt('--mode') || 'day');
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    res.forEach((r) => console.log(`${r.level} ${r.line}: ${r.msg}`));
    const e = res.filter((r) => r.level === 'ERROR').length, w = res.length - e;
    console.log(e || w ? `итого: ${e} ошибок, ${w} предупреждений` : 'OK: замечаний нет');
  }
  process.exit(res.some((r) => r.level === 'ERROR') ? 1 : 0);
}
