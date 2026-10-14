#!/usr/bin/env node
// Workspace status for the moderator plugin: what has been captured per day,
// what is still open in the checklist, and which gaps are worth a reminder.
//
// Usage: node status.mjs [workspace-dir] [--json] [--today YYYY-MM-DD]
//
// Reads .moderator/state.json and the folder layout from state.layout
// (references/workspace.md). Never writes anything. Output is language-neutral:
// gap codes in JSON, English labels in markdown — the skill presents them to the
// moderator in the moderator's language.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

// Default folder names (Russian). The real names live in state.layout and are
// chosen at init in the moderator's language — always prefer them.
export const DEFAULT_LAYOUT = {
  program: '00-программа-и-материалы',
  artifacts: '01-артефакты',
  reflection: '02-рефлексия',
  report: '03-отчет',
  common: 'общие',
  photos: 'фото',
  files: 'файлы',
  checklist: '03-отчет/чек-лист.md',
  observations_file: 'наблюдения-модератора.md',
};

export function layoutOf(state) {
  return { ...DEFAULT_LAYOUT, ...(state.layout ?? {}) };
}

const IMAGE_EXT = new Set(['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);
const GROUP_KINDS = new Set(['group-work', 'presentation']);
const REFLECTION_KINDS = new Set(['reflection']);

// Local calendar date: toISOString() is UTC and would shift "today" after midnight.
export function localDate(d) {
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listFiles(p).map((f) => join(name, f)));
    else out.push(name);
  }
  return out.sort();
}

// Parse the checklist: "## ..." sections, "- [ ]" / "- [x]" items.
// A section belongs to day N when its heading carries the marker <!-- day:N -->
// (language-independent); legacy headings "День N …" / "Day N …" also work.
export function parseChecklist(text) {
  const sections = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      const marker = h[1].match(/<!--\s*day:(\d+)\s*-->/i);
      const legacy = h[1].match(/^(?:День|Day)\s+(\d+)/i);
      const day = marker ?? legacy;
      const title = h[1].replace(/<!--.*?-->/g, '').trim();
      current = { title, day: day ? Number(day[1]) : null, open: [], done: 0 };
      sections.push(current);
      continue;
    }
    const item = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+?)\s*$/);
    if (item && current) {
      if (item[1] === ' ') current.open.push(item[2]);
      else current.done += 1;
    }
  }
  return sections;
}

export function collectStatus(root, { today } = {}) {
  const statePath = join(root, '.moderator', 'state.json');
  if (!existsSync(statePath)) {
    return { initialized: false, root, hint: 'Run /moderator:init in this folder first.' };
  }
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const L = layoutOf(state);
  const todayIso = today ?? localDate(new Date());

  const checklistPath = join(root, state.template?.checklist ?? L.checklist);
  const checklist = existsSync(checklistPath) ? parseChecklist(readFileSync(checklistPath, 'utf8')) : [];

  const days = (state.days ?? []).map((d) => {
    const notes = listFiles(join(root, L.reflection, d.slug));
    // The moderator's own observations are not participants' reflection.
    const observations = notes.filter((f) => f.endsWith(L.observations_file));
    const reflection = notes.filter((f) => !f.endsWith(L.observations_file));
    const photos = listFiles(join(root, L.artifacts, d.slug, L.photos)).filter((f) =>
      IMAGE_EXT.has(extname(f).toLowerCase()),
    );
    const files = listFiles(join(root, L.artifacts, d.slug, L.files));
    const sections = checklist.filter((s) => s.day === d.n);
    const open = sections.flatMap((s) => s.open);
    const done = sections.reduce((a, s) => a + s.done, 0);
    const blocks = (d.blocks ?? []).filter((b) => b.in_report !== false);
    const started = d.date ? d.date <= todayIso : false;

    const gaps = [];
    if (started && reflection.length === 0 && blocks.some((b) => REFLECTION_KINDS.has(b.kind))) {
      gaps.push('no-reflection');
    }
    if (started && photos.length === 0 && blocks.some((b) => GROUP_KINDS.has(b.kind))) {
      gaps.push('no-group-work-photos');
    }
    return {
      n: d.n,
      date: d.date,
      title: d.title,
      slug: d.slug,
      status: d.status ?? 'pending',
      started,
      blocks: blocks.length,
      reflection,
      observations,
      photos,
      files,
      checklist: { done, open: open.length, openItems: open },
      gaps,
    };
  });

  const common = {
    program: listFiles(join(root, L.program)),
    artifacts: listFiles(join(root, L.artifacts, L.common)),
    reflection: listFiles(join(root, L.reflection, L.common)),
  };
  const finalSections = checklist.filter((s) => s.day === null);
  const known = new Set([L.program, L.artifacts, L.reflection, L.report]);
  const loose = existsSync(root) ? readdirSync(root).filter((n) => !n.startsWith('.') && !known.has(n)) : [];

  return {
    initialized: true,
    root,
    today: todayIso,
    language: state.language ?? {},
    layout: L,
    event: state.event ?? {},
    moderator: state.moderator ?? {},
    structureReady: Boolean(state.structure_ready ?? state.setup_complete),
    setupComplete: Boolean(state.setup_complete),
    templateLoaded: Boolean(state.template?.source),
    dismissedReminders: state.dismissed_reminders ?? [],
    days,
    common,
    general: finalSections.map((s) => ({ title: s.title, done: s.done, open: s.open })),
    digitization: state.digitization ?? { status: 'pending' },
    loose,
  };
}

function toMarkdown(s) {
  if (!s.initialized) return s.hint;
  const lines = [];
  lines.push(`# Status: ${s.event.name ?? 'event'}  (today ${s.today})`);
  lines.push('');
  lines.push('| Day | Date | Status | Blocks | Reflection | Photos | Files | Checklist | Gaps |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const d of s.days) {
    lines.push(
      `| ${d.n} | ${d.date ?? '—'} | ${d.status} | ${d.blocks} | ${d.reflection.length} | ${d.photos.length} | ${d.files.length} | ${d.checklist.done}/${d.checklist.done + d.checklist.open} | ${d.gaps.join('; ') || '—'} |`,
    );
  }
  lines.push('');
  lines.push(
    `General: program & materials — ${s.common.program.length}, artifacts — ${s.common.artifacts.length}, reflection — ${s.common.reflection.length}.`,
  );
  for (const g of s.general) {
    if (g.open.length) lines.push(`Open in "${g.title}": ${g.open.length}`);
  }
  if (s.loose.length) lines.push(`Loose files in the folder root: ${s.loose.join(', ')}`);
  return lines.join('\n');
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('status.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const ti = args.indexOf('--today');
  const today = ti >= 0 ? args[ti + 1] : undefined;
  const root = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--today') ?? process.cwd();
  const status = collectStatus(root, { today });
  process.stdout.write((json ? JSON.stringify(status, null, 2) : toMarkdown(status)) + '\n');
}
